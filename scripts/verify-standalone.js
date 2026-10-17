'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),vm=require('vm');
const {DatabaseSync}=require('node:sqlite');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const fail=m=>{throw new Error(m)};
const required=[
  'app/index.html','app/styles.css','app/favicon.ico','app/favicon.png',
  'app/shared/budget-bridge.js','app/shared/budget-dropdown.js','app/shared/budget-dropdown.css',
  'app/shared/modal-system.js','app/shared/modal-system.css','app/shared/browser-guard.js','app/shared/tauri-titlebar.css',
  'app/shared/budget-startup-preview.css','app/shared/budget-startup-preview.js',
  'src-tauri/src/budget.rs','src-tauri/src/storage.rs','src-tauri/src/lib.rs','src-tauri/src/main.rs',
  'src-tauri/tauri.conf.json','src-tauri/tauri.release.conf.json','data/budget.sqlite3','seed-data/budget.sqlite3'
];
for(const f of required)if(!fs.existsSync(path.join(root,f)))fail(`Missing ${f}`);

const html=read('app/index.html');
const styles=read('app/styles.css');
const bridge=read('app/shared/budget-bridge.js');
const dropdownJs=read('app/shared/budget-dropdown.js');
const dropdownCss=read('app/shared/budget-dropdown.css');
const lib=read('src-tauri/src/lib.rs');
const main=read('src-tauri/src/main.rs');
const storage=read('src-tauri/src/storage.rs');
const budget=read('src-tauri/src/budget.rs');
const migration=read('MIGRATE-FROM-LOST-HEAVEN.ps1');
const titlebar=read('app/shared/tauri-titlebar.css');
const splashCss=read('app/shared/budget-startup-preview.css');
const splashJs=read('app/shared/budget-startup-preview.js');
const modalJs=read('app/shared/modal-system.js');
const modalCss=read('app/shared/modal-system.css');
const cargoToml=read('src-tauri/Cargo.toml');
const packageLock=read('package-lock.json');
const buildReleasePs1=read('BUILD-RELEASE.ps1');
const makeFinalPs1=read('MAKE-FINAL-RELEASE.ps1');
const releaseArtifactVerifier=read('scripts/verify-release-artifact.js');
const runtimeCorpus=[html,styles,bridge,dropdownJs,dropdownCss,lib,main,storage,budget,modalJs,modalCss,read('app/shared/browser-guard.js'),titlebar,splashJs,splashCss].join('\n');

for(const bad of ['projects/igroteka','projects/kinoteka','home_summary','library_state','persist_games_state','persist_movies_state','igroteka-select','kinoteka','Igroteka','Kinoteka']) {
  if(runtimeCorpus.includes(bad)) fail(`Foreign runtime residue remains: ${bad}`);
}

// Startup Preview 1 guards: first-paint DOM, no late native geometry/focus race.
for (const file of ['src-tauri/tauri.conf.json','src-tauri/tauri.release.conf.json']) {
  const config=JSON.parse(read(file));
  const w=config.app.windows.find(w=>w.label==='main');
  if (!w || w.visible!==true || w.maximized!==true || w.center!==true || w.resizable!==false || w.decorations!==false) fail(`Startup Preview 1 window config mismatch: ${file}`);
}
if(/window\.(?:show|maximize|set_focus)\s*\(/.test(lib))fail('Premature Rust window geometry/show/focus call returned.');
if(!html.includes('data-budget-startup="loading"')||!html.includes('shared/budget-startup-preview.js?v=0.2.0')||!html.includes('shared/budget-startup-preview.css?v=0.2.0'))fail('Startup first-paint assets missing.');
if(html.indexOf('id="budgetCustomTitlebar"')>html.indexOf('id="budgetParticleFlow"')||html.indexOf('id="budgetStartupSplash"')>html.indexOf('id="budgetParticleFlow"'))fail('First-paint titlebar or splash must precede dashboard.');
if((html.match(/id="budgetCustomTitlebar"/g)||[]).length!==1||bridge.includes('attachShadow('))fail('Titlebar must be a single static DOM host, never recreated.');
if(!html.includes('refreshOperations().then(()=>window.__budgetStartup?.ready())')||!html.includes('window.__budgetStartup?.fail(error)'))fail('Startup data-ready/error barriers missing.');
if(!splashJs.includes('requestAnimationFrame(() => window.requestAnimationFrame(')||!splashCss.includes("html[data-budget-startup='loading'] .wrap"))fail('Startup paint/reveal synchronization missing.');
if(!splashCss.includes('opacity:1!important')||!splashCss.includes('.budget-chrome-close:hover'))fail('Visible titlebar controls/hover state missing.');
// v0.2 Stable contract: keep the ACCEPTED native-visible window geometry and GUI-titlebar parity.
// The only startup timing change is the centered splash label hold: 380ms -> 980ms.
if (!splashJs.includes('      }, 980);') || splashJs.includes('      }, 380);')) fail('Stable splash hold must be 980ms; no other animation timing change.');
const guiPeGuard=read('scripts/verify-windows-gui-exe.ps1');
if (!buildReleasePs1.includes('npm run build:release') ||
    !buildReleasePs1.includes('scripts\\verify-windows-gui-exe.ps1')) fail('Stable release must verify GUI-only compiled EXE');
if(!guiPeGuard.includes('ReadUInt32() -ne 0x00004550')||
   !guiPeGuard.includes('subsystem -ne 2')||
   !guiPeGuard.includes('optionalHeader + 68')) fail('Windows GUI subsystem PE verifier missing');
if(!main.includes('cfg_attr(not(debug_assertions), windows_subsystem = "windows")')) fail('Windows GUI release subsystem policy changed');
if(!/#budgetCustomTitlebar \.budget-chrome-button\s*\{[^}]*opacity:0!important;[^}]*transition:opacity \.16s ease/s.test(splashCss))fail('Accepted controls must be hidden until hover/focus');
if(!/#budgetCustomTitlebar \.budget-chrome-button:hover,[\s\S]*?\.budget-chrome-button:focus-visible\s*\{[^}]*opacity:1!important;/.test(splashCss))fail('Accepted controls must appear on hover/focus');
if(!splashCss.includes('grid-template-columns:1fr auto 1fr!important')||!splashCss.includes('46px!important'))fail('Accepted static titlebar geometry changed');
for(const file of ['src-tauri/tauri.conf.json','src-tauri/tauri.release.conf.json']){
  const win=JSON.parse(read(file)).app.windows[0];
  if(win.width!==1180||win.height!==820||win.minWidth!==900||win.minHeight!==650||
     win.maximized!==true||win.center!==true||win.visible!==true||win.resizable!==false||
     win.decorations!==false||win.backgroundColor!=='#020203') fail('Accepted Budget window geometry changed: '+file);
}
if(fs.existsSync(path.join(root,'PREVIEW-ONLY.txt')))fail('Preview-only marker must not enter Stable release');
console.log('- v0.2 Stable startup: +600ms centered splash hold; native window/titlebar unchanged');
console.log('- Windows GUI release guard + hover-only controls OK');
require('./test-startup-sequence.js');
if(!/href="styles\.css(?:\?[^"]*)?"/.test(html)||/<style\b/i.test(html))fail('External CSS consolidation is incomplete.');
if(!html.includes('window.__budgetReady')||!html.includes('id="operationCount"')||!html.includes('class="panel history-panel"'))fail('Budget application/layout contract missing.');
if(!bridge.includes("window.__budgetReady = setupDatabase()"))fail('Budget bootstrap promise missing.');
if(!bridge.includes("document.addEventListener('DOMContentLoaded', startChrome")||!bridge.includes('const startChrome = () => installTitlebar()'))fail('DOM-safe titlebar bootstrap guard missing.');
if(!bridge.includes("getElementById('budgetCustomTitlebar')")||!html.includes('id="budgetCustomTitlebar"'))fail('Static first-paint titlebar implementation missing.');
if(!bridge.includes('budget_get_bootstrap')||!bridge.includes("style.setProperty('background', '#020203', 'important')"))fail('Budget bridge/bootstrap true-black chain missing.');
if(!lib.includes('budget_get_transactions')||!lib.includes('budget_add_transaction')||!lib.includes('window_minimize')||!lib.includes('window_close')||/movies|games|home_/i.test(lib))fail('Budget command surface is not isolated or titlebar commands are missing.');
if(/use\s+serde_json::\{\s*json\s*,/.test(lib))fail('Retired unused serde_json::json import returned.');
if(!main.includes('Local\\BudgetStandalone')||!main.includes('FindWindowW')||!main.includes('Бюджет'))fail('Budget single-instance guard missing.');
if(!storage.includes('budget.sqlite3')||!storage.includes('idx_transactions_category_date')||!storage.includes('PRAGMA optimize'))fail('Budget storage/index maintenance missing.');
if(!storage.includes('budget-cleanup-pass3-storage-recovery')||!storage.includes('REQUIRED_USER_VERSION: i64 = 7')||!storage.includes('PRAGMA foreign_key_check')||!storage.includes('PRAGMA journal_mode=DELETE')||!storage.includes('prune_backups(&root, &mut catalog)'))fail('Cleanup Pass 3 storage/schema/recovery hardening missing.');
if(!budget.includes('TransactionBehavior::Immediate')||!budget.includes('transaction_with_behavior(TransactionBehavior::Immediate)'))fail('Cleanup Pass 3 immediate SQLite mutation transaction missing.');
if(!budget.includes('budget-cleanup-pass4-mutation-race-hardening')||!budget.includes('static MUTATION_LOCK: Mutex<()> = Mutex::new(())')||!budget.includes('MUTATION_LOCK.lock()'))fail('Cleanup Pass 4 backend mutation serialization missing.');
if(!html.includes('let mutationInFlight=false')||!html.includes('mutationControlSelector=')||!html.includes("setAttribute('aria-busy','true')")||!html.includes('lockedControls.forEach')||!html.includes('mutationInFlight=false'))fail('Cleanup Pass 4 frontend single-flight mutation guard missing.');
if(!storage.includes('pub struct PendingBackup')||!storage.includes('pub fn finalize_backup')||!storage.includes('pub fn discard_backup')||!budget.includes('discard_backup(pending)')||!budget.includes('finalize_backup(pending)')||budget.indexOf('finalize_backup(pending)')<budget.indexOf('tx.commit()'))fail('Final RC successful-mutation-only backup retention contract missing.');
if(!storage.includes('fn preflight_storage_writable()')||!storage.includes('probe_directory_writable(&data')||!storage.includes('data.join("backups")')||!storage.includes('OpenOptions::new().read(true).write(true).open(&live)')||!storage.includes('preflight_storage_writable()?'))fail('Final RC writable-storage startup preflight missing.');
if(!bridge.includes("await invoke('budget_storage_preflight')")||!lib.includes('budget_storage_preflight()->Result<(),String>{storage::ensure_database()}')||!lib.includes('budget_storage_preflight,window_minimize,window_close'))fail('Final RC storage-preflight bootstrap surface missing.');
if(!modalJs.includes("if(keyHandler)document.removeEventListener('keydown',keyHandler,true)")||!modalJs.includes('keyHandler=e=>'))fail('Final RC modal key-listener cleanup missing.');
if(!html.includes('let reportsRenderGeneration=0,managementRenderGeneration=0')||(html.match(/generation!==reportsRenderGeneration/g)||[]).length<2||(html.match(/generation!==managementRenderGeneration/g)||[]).length<2)fail('Final RC async render generation guards missing.');
if(!budget.includes('AND archived=0')||!budget.includes('Активный счёт не найден у текущего пользователя.'))fail('Cleanup Pass 3 archive-account validation missing.');
if(!migration.includes('Budget_Standalone_v0.2_Stable_DEV')||migration.includes('Budget_Standalone_v0.1_Preview11_DEV'))fail('Stable migration target is stale.');
if(!dropdownJs.includes('const centeredLeft = rect.left + (rect.width - measuredWidth) / 2')||!dropdownJs.includes("document.documentElement.dataset.budgetDropdownReady = '1'"))fail('Preview 11 Hotfix 1 dropdown runtime/centering implementation missing.');
if(!dropdownCss.includes('.budget-dd-shell')||dropdownCss.includes('.lh-select-')||dropdownCss.includes('.igroteka-select-'))fail('Preview 11 Hotfix 1 dropdown namespace is not canonical.');
if(!styles.includes('budget-preview2-layout-redesign'))fail('Preview 2 foundation layout guard missing.');
if(!styles.includes('budget-preview3-ui-density-redesign')||!styles.includes('grid-template-columns:minmax(400px,420px) minmax(0,1fr)'))fail('Preview 3 UI density redesign missing.');
if(!styles.includes('budget-preview4-adaptive-layout-visual-polish')||!styles.includes('report-meter-fill')||!styles.includes('height:max-content!important'))fail('Preview 4 adaptive layout/visual polish missing.');
if(!styles.includes('budget-preview5-layout-enforcement-control-polish')||!styles.includes('#operations .layout>.panel.history-panel'))fail('Preview 5 layout-enforcement/control-polish guard missing.');
if(!styles.includes('budget-preview7-css-cleanup-real-gold')||!styles.includes('--budget-gold:#e0b85e')||!styles.includes('.budget-primary-action')||!styles.includes('rgba(224,184,94,.58)')||!styles.includes('#reports .report-meter'))fail('Preview 7 CSS-cleanup/real-gold guard missing.');
if(!html.includes('let wrapped=false')||!html.includes('if(p.fast&&r>1.05&&!wrapped)')||!styles.includes('min-width:220px!important'))fail('Preview 8 particle-seam/action polish guard missing.');
if(!styles.includes('#dateDisplay')||!html.includes('const setOperationDate=iso=>')||!html.includes("datePickerTrigger').dataset.dateLabel"))fail('Preview 9 visible date-control/final interaction guard missing.');
if(!styles.includes('budget-preview10-hotfix5-form-rewrite-cache-bust')||!html.includes('class="operation-fields-v2"')||(html.match(/class="operation-field-v2/g)||[]).length<6)fail('Preview 10 stable operation-form rewrite guard missing.');
if(!styles.includes('budget-cleanup-pass1-dropdown-retirement'))fail('Cleanup Pass 1 dropdown-retirement marker missing.');
if(!styles.includes('budget-final-rc-hotfix1-history-summary-polish')||!styles.includes('#operations .history-heading')||!styles.includes('rgba(255,255,255,.18)!important')||!styles.includes('rgba(224,184,94,.09)!important'))fail('Final RC Hotfix 1 Operations-header/summary-frame polish missing.');
if(!styles.includes('budget-final-rc-hotfix2-operations-amount-header-alignment')||!styles.includes('#operations .tx-head th:nth-child(4)')||!styles.includes('padding-right:14px!important'))fail('Final RC Hotfix 2 amount-header alignment polish missing.');
if(!styles.includes('budget-static-summary-cards'))fail('Cleanup Pass 1 Hotfix 1 static-summary marker missing.');
if(!styles.includes('budget-transparent-navigation-strip'))fail('Cleanup Pass 1 Hotfix 2 transparent-navigation marker missing.');
if(!styles.includes('budget-cleanup-pass2-frontend-runtime'))fail('Cleanup Pass 2 frontend/runtime marker missing.');
if(!styles.includes('budget-cleanup-pass3-hotfix1-manage-modal-polish'))fail('Cleanup Pass 3 Hotfix 1 management/modal polish marker missing.');
if(!/grid-template-columns:minmax\(0,42fr\) minmax\(0,58fr\)!important/.test(styles))fail('Cleanup Pass 3 Hotfix 1 42/58 management grid missing.');
if(!/#manage \.manage-heading h2::after\{[\s\S]*?content:none!important/.test(styles))fail('Cleanup Pass 3 Hotfix 1 management heading-dot retirement missing.');
if(!styles.includes('scrollbar-color:rgba(255,255,255,.20) transparent!important'))fail('Cleanup Pass 3 Hotfix 1 category-list scrollbar missing.');
if(!html.includes('shared/modal-system.js?v=0.2.0')||!html.includes('shared/modal-system.css?v=0.2.0'))fail('Stable modal cache key missing.');
if(!modalCss.includes('width:min(430px,calc(100vw - 48px))')||!modalCss.includes('.budget-dialog-actions.confirm')||!modalCss.includes('.budget-dialog-btn.warning'))fail('Cleanup Pass 3 Hotfix 1 balanced modal geometry/style missing.');
if(!modalCss.includes('budget-cleanup-pass3-hotfix2-modal-button-centering')||!modalCss.includes('display:inline-flex')||!modalCss.includes('align-items:center')||!modalCss.includes('justify-content:center'))fail('Cleanup Pass 3 Hotfix 2 modal button centering missing.');
if(!styles.includes('budget-cleanup-pass3-hotfix3-reports-visual-polish'))fail('Cleanup Pass 3 Hotfix 3 reports polish marker missing.');
if(/#reports\s+\.report-heading h2::after/.test(styles))fail('Cleanup Pass 3 Hotfix 3 decorative report heading dot returned.');
if(!/#reports \.report-row\{[\s\S]*?border-color:rgba\(255,255,255,\.055\)!important/.test(styles))fail('Cleanup Pass 3 Hotfix 3 quiet report-row border missing.');
if(!/#reports \.report-row:hover\{[\s\S]*?border-color:rgba\(255,255,255,\.09\)!important/.test(styles))fail('Cleanup Pass 3 Hotfix 3 quiet report-row hover border missing.');
if(!styles.includes('budget-cleanup-pass3-hotfix4-input-consistency'))fail('Cleanup Pass 3 Hotfix 4 input consistency marker missing.');
for(const fieldId of ['note','accountName','openingBalance','categoryName']){if(!new RegExp(`<input id=\"${fieldId}\"[^>]*autocomplete=\"off\"[^>]*spellcheck=\"false\"`).test(html))fail(`Cleanup Pass 3 Hotfix 4 input browser-behavior contract missing: ${fieldId}`);}
if(!html.includes('const isSignedMoneyDraft=')||!html.includes('Number.isSafeInteger(cents)')||!html.includes("bindMoneyInput(el('openingBalance'),{allowNegative:true})"))fail('Cleanup Pass 3 Hotfix 4 strict signed money-input contract missing.');
if(html.includes('bindSmartDateInput')||html.includes('parseDisplayDate')||html.includes('formatMoneyInputValue'))fail('Cleanup Pass 3 Hotfix 4 retired typed-input helper returned.');
if(html.includes('input.style.cssText=')||html.includes('background:#0b110e;color:var(--text)'))fail('Cleanup Pass 3 Hotfix 4 legacy inline rename-input styling returned.');
if(!html.includes("event.key==='Enter'")||!html.includes("event.key==='Escape'")||!html.includes('saveButton.click()')||!html.includes('cancel.click()'))fail('Cleanup Pass 3 Hotfix 4 account-rename keyboard contract missing.');
if(!styles.includes('caret-color:#e0b85e!important')||!styles.includes('#amount,#openingBalance{font-variant-numeric:tabular-nums!important;}'))fail('Cleanup Pass 3 Hotfix 4 typed-field visual contract missing.');
if(!styles.includes('budget-cleanup-pass4-hotfix1-report-natural-height'))fail('Cleanup Pass 4 Hotfix 1 report natural-height marker missing.');
if(!html.includes('styles.css?v=0.2.0'))fail('Stable stylesheet cache key missing.');
if(!/@media\(min-width:981px\)\{[\s\S]*?#reports \.report-list\{[\s\S]*?max-height:none!important;[\s\S]*?overflow:visible!important;[\s\S]*?padding-right:0!important;/.test(styles))fail('Cleanup Pass 4 Hotfix 1 desktop report natural-height contract missing.');
if(!styles.includes('budget-cleanup-pass3-hotfix5-rc-interaction-polish'))fail('Cleanup Pass 3 Hotfix 5 RC interaction polish marker missing.');
if(!modalCss.includes('budget-cleanup-pass3-hotfix5-compact-dialog-actions')||!/\.budget-dialog-actions\.confirm\{[\s\S]*?display:flex;[\s\S]*?justify-content:flex-end;/.test(modalCss))fail('Cleanup Pass 3 Hotfix 5 compact shared-dialog actions missing.');
if(!/\.month-picker-footer,[\s\S]*?\.date-picker-footer\{[\s\S]*?display:flex!important;[\s\S]*?justify-content:space-between!important;/.test(styles)||!/\.category-filter-footer\{[\s\S]*?justify-content:flex-end!important;/.test(styles))fail('Cleanup Pass 3 Hotfix 5 compact picker/filter footer layout missing.');
if(!/\.month-confirm,[\s\S]*?\.date-confirm\{[\s\S]*?rgba\(224,184,94,\.48\)!important/.test(styles))fail('Cleanup Pass 3 Hotfix 5 gold picker confirmation action missing.');
if(!/\.period-date-grid \.date-day\.range-in\{[\s\S]*?rgba\(224,184,94,\.075\)!important/.test(styles)||!styles.includes('accent-color:var(--budget-gold)!important'))fail('Cleanup Pass 3 Hotfix 5 non-semantic green retirement missing.');
const pickerStart=styles.indexOf('/* ===== budget-month-picker ===== */'),pickerEnd=styles.indexOf('/* ===== budget-cinema-mono-theme ===== */');
if(pickerStart<0||pickerEnd<=pickerStart)fail('Picker foundation section missing.');
const pickerFoundation=styles.slice(pickerStart,pickerEnd);
for(const legacyGreen of ['rgba(126,191,153,.72)','#153024','rgba(110,162,135,.35)','accent-color:#6ea287','#355442','#142019','#0e1511','#547864','#1b3a2b','#456652','#101a14'])if(pickerFoundation.includes(legacyGreen))fail(`Cleanup Pass 3 Hotfix 5 legacy picker green remains: ${legacyGreen}`);
if(!modalJs.includes("actions.className=`budget-dialog-actions ${options.confirm?'confirm':'alert'}`")||!modalJs.includes("options.type==='warning'?'warning':'primary'"))fail('Cleanup Pass 3 Hotfix 1 modal runtime classes missing.');
if(html.includes('budget-pointer-recovery')||html.includes('Расход или доход'))fail('Cleanup Pass 2 retired operation caption/pointer-recovery residue remains.');
if(!html.includes('id="budget-input-focus-recovery"'))fail('Cleanup Pass 2 canonical input-focus recovery script missing.');
if((html.match(/pointerdown',event=>focusEditable/g)||[]).length!==1)fail('Cleanup Pass 2 duplicate pointer-focus recovery listeners remain.');
for(const dead of ['panel-kicker','panel-count','balance-user','budget-row','budget-top','budget-meta','danger-text','tx-col-date','controls-row','filter-trigger-icon','date-picker-kicker']){
  if(new RegExp('\\.'+dead.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?:[^A-Za-z0-9_-]|$)').test(styles))fail(`Cleanup Pass 2 dead CSS selector returned: ${dead}`);
}
if(/#operations\s+\.operation-panel\s+\.(?:form-grid|field)(?:\b|\.)/.test(styles))fail('Cleanup Pass 2 retired operation-form compatibility CSS returned.');
if(!styles.includes('background:transparent!important;'))fail('Cleanup Pass 1 Hotfix 2 transparent navigation background missing.');
if(!/\.tab-group\s*\{[^}]*background:transparent!important;[^}]*\}/s.test(styles))fail('Cleanup Pass 1 Hotfix 2 transparent tab-group background missing.');

if(!styles.includes('border-color:rgba(255,255,255,.34)!important'))fail('Cleanup Pass 1 Hotfix 1 neutral white summary frame missing.');
if(/\.card:hover|balance-card[^,{]*:hover/.test(styles))fail('Summary-card hover styling returned.');
if(/#balanceCard\s*\{[^}]*rgba\(224,184,94/.test(styles))fail('Retired gold balance-card border returned.');
for(const id of ['kind','account','category','categoryKind']){
  if(!new RegExp(`<select id="${id}"`).test(html))fail(`Preview 11 select source missing: ${id}`);
}
if((html.match(/<select\b/g)||[]).length!==4)fail('Unexpected Budget select source count; unified dropdown coverage is no longer exhaustive.');
for(const retired of ['app/shared/themed-select.js','app/shared/themed-select.css']){
  if(fs.existsSync(path.join(root,retired)))fail(`Retired dropdown asset returned: ${retired}`);
}
if(styles.includes('budget-select-'))fail('Retired budget-select CSS namespace remains in active styles.');
if(html.includes('shared/themed-select.js')||html.includes('shared/themed-select.css'))fail('Retired themed-select asset references remain active.');
for(const asset of ['shared/modal-system.js','shared/browser-guard.js','shared/budget-dropdown.js','shared/budget-bridge.js','shared/fonts.css','shared/modal-system.css','styles.css','shared/budget-dropdown.css']){
  if(!html.includes(`${asset}?v=0.2.0`))fail(`Stable cache key missing: ${asset}`);
}
if(/\?v=p(?:10|11)/.test(html))fail('Preview cache-bust keys remain active in Stable HTML.');
if(!dropdownJs.includes("select.insertAdjacentElement('afterend', shell)")||!dropdownJs.includes("select.classList.add('budget-dd-source')")||!dropdownJs.includes("trigger.setAttribute('aria-haspopup', 'listbox')"))fail('Preview 11 Hotfix 1 sibling-shell dropdown architecture missing.');
if(!dropdownCss.includes('isolated, cache-safe custom dropdown runtime')||!dropdownCss.includes('.budget-dd-option-check')||!dropdownCss.includes('--budget-dd-gold:#e0b85e')||!dropdownCss.includes('rgba(224,184,94,.36)'))fail('Preview 11 Hotfix 1 black/gold dropdown styling missing.');
if(!dropdownJs.includes("event.key === 'Home' || event.key === 'End'")||!dropdownJs.includes("event.key === 'Escape'")||!dropdownJs.includes('const centeredLeft = rect.left + (rect.width - measuredWidth) / 2'))fail('Preview 11 Hotfix 1 dropdown keyboard/positioning contract missing.');
if(!dropdownCss.includes('select.budget-dd-source')||!dropdownCss.includes('width:100%!important')||!dropdownCss.includes('z-index:50000!important'))fail('Preview 11 Hotfix 1 dropdown source hiding/full-width/portal geometry missing.');
if(dropdownJs.includes('shell.append(select, trigger)')||dropdownJs.includes('budget-native-select-source'))fail('Retired Preview 11 wrapped-select runtime returned.');
if(dropdownJs.includes('.observe(document.documentElement'))fail('Retired full-document dropdown MutationObserver returned.');
if(!dropdownJs.includes("root.querySelectorAll?.('select').forEach(enhance)")||!dropdownJs.includes("observer.observe(select, { childList:true, subtree:true, attributes:true"))fail('Cleanup Pass 1 static dropdown scan/per-select observer contract missing.');
if(styles.includes('budget-preview10-hotfix4-stable-select-face')||styles.includes('budget-preview10-hotfix3-native-form-select-stabilization'))fail('Retired Preview 10 select workaround CSS returned.');
if(dropdownCss.includes('Preview 10 Hotfix 1: operation-form themed selects must fill their control cells.')||dropdownCss.includes('Preview 10 Hotfix 2: geometry-anchored operation selects.')||dropdownJs.includes('budget-select-host')||dropdownJs.includes('budget-select-field-fill')||dropdownJs.includes('budget-select-field-trigger'))fail('Retired operation-form dropdown workaround returned.');
if(styles.includes('grid-template-columns:minmax(0,1fr) 220px minmax(0,1fr)')||styles.includes('budget-preview6-actions-reports-gold-accents'))fail('Retired Preview 6 action-track override returned.');
if((html.match(/budget-primary-action/g)||[]).length!==3)fail('Preview 7 canonical main action classes missing.');
if(!titlebar.includes('Preview 7: visible warm-gold Budget brand accent')||!titlebar.includes('#f0d99d'))fail('Preview 7 titlebar gold accent guard missing.');
if(!html.includes('class="tab-group"')||!html.includes('class="tx-head"')||!html.includes('class="heading-count"'))fail('Preview 3 semantic layout markers missing.');
if(!html.includes('class="grid2 report-grid"')||!html.includes('class="panel manage-panel"')||!html.includes('id="accountReportPeriodTitle"'))fail('Preview 4 report/manage semantic markers missing.');
if(html.includes('panel-kicker'))fail('Retired service-like panel kicker returned.');
if(!html.includes('document.createDocumentFragment()')||html.includes('refreshAll()'))fail('Preview 3 render/lazy-refresh optimization missing.');
if(!styles.includes('#020203')||!html.includes('id="budgetParticleFlow"'))fail('Cinema Mono Budget theme/background missing.');
if(/new MutationObserver\(markUndraggable\)/.test(html))fail('Retired full-DOM drag MutationObserver returned.');

function assertNoExactDuplicateTopLevelCss(css){
  const seen=new Set();
  let depth=0,start=0,inComment=false,quote='';
  for(let i=0;i<css.length;i++){
    const ch=css[i],next=css[i+1];
    if(inComment){ if(ch==='*'&&next==='/'){inComment=false;i++;} continue; }
    if(quote){ if(ch==='\\'){i++;continue;} if(ch===quote)quote=''; continue; }
    if(ch==='/'&&next==='*'){inComment=true;i++;continue;}
    if(ch==='"'||ch==="'"){quote=ch;continue;}
    if(ch==='{'){
      if(depth===0){
        let selector=css.slice(start,i).replace(/\/\*[\s\S]*?\*\//g,'').trim().replace(/\s+/g,' ');
        let j=i+1,d=1,c=false,q='';
        for(;j<css.length;j++){
          const a=css[j],b=css[j+1];
          if(c){if(a==='*'&&b==='/'){c=false;j++;}continue;}
          if(q){if(a==='\\'){j++;continue;}if(a===q)q='';continue;}
          if(a==='/'&&b==='*'){c=true;j++;continue;}
          if(a==='"'||a==="'"){q=a;continue;}
          if(a==='{')d++; else if(a==='}'&&--d===0)break;
        }
        if(selector&&!selector.startsWith('@')){
          const body=css.slice(i+1,j).trim().replace(/\s+/g,' ');
          const key=selector+'{'+body+'}';
          if(seen.has(key))fail(`Exact duplicate top-level CSS rule remains: ${selector}`);
          seen.add(key);
        }
      }
      depth++;
    } else if(ch==='}'){
      depth=Math.max(0,depth-1);
      if(depth===0)start=i+1;
    }
  }
}
assertNoExactDuplicateTopLevelCss(styles);

for(const oldBg of ['#08070d','#08090a']){
  if((html+'\n'+styles+'\n'+bridge+'\n'+titlebar).toLowerCase().includes(oldBg))fail(`Legacy tinted root background remains: ${oldBg}`);
}
const devCfg=JSON.parse(read('src-tauri/tauri.conf.json'));
const releaseCfg=JSON.parse(read('src-tauri/tauri.release.conf.json'));
if(devCfg.productName!=='Бюджет'||devCfg.version!=='0.2.0'||devCfg.app?.windows?.[0]?.backgroundColor!=='#020203')fail('Stable Budget DEV identity/config missing.');
if(releaseCfg.version!=='0.2.0')fail('Stable release version missing.');
const releaseWindow=releaseCfg.app?.windows?.[0],releaseSecurity=releaseCfg.app?.security;
if(releaseWindow?.devtools!==false)fail('Release devtools must stay disabled.');
if(releaseWindow?.limitNavigationsToAppBoundDomains!==true)fail('Release navigation restriction missing.');
if(releaseSecurity?.freezePrototype!==true)fail('Release freezePrototype hardening missing.');
if(!releaseSecurity?.csp||releaseSecurity.csp['object-src']!=="'none'"||releaseSecurity.csp['frame-src']!=="'none'")fail('Release CSP hardening missing.');
if(/Lost Heaven|Игротека|Кинотека/.test(JSON.stringify({devCfg,releaseCfg})))fail('Foreign identity leaked into Tauri config.');
for(const cmd of ['BUILD-DEV.cmd','BUILD-RELEASE.cmd','MAKE-FINAL-RELEASE.cmd','MIGRATE-FROM-LOST-HEAVEN.cmd']){
  const t=read(cmd);
  if(/\bpause\b|Read-Host|set\s+\/p/i.test(t))fail(`Interactive pause remains: ${cmd}`);
}
const pkg=JSON.parse(read('package.json'));
if(pkg.version!=='0.2.0'||pkg.description!=='Budget Standalone v0.2 Stable')fail('Stable package identity missing.');
if(!/^version = "0\.2\.0"$/m.test(cargoToml)||!cargoToml.includes('description = "Budget Standalone v0.2 Stable"'))fail('Stable Cargo identity missing.');
if(!packageLock.includes('"version": "0.2.0"')||packageLock.includes('0.1.0-preview.11'))fail('Stable package-lock identity missing.');
if(pkg.scripts?.dev!=='tauri dev')fail('Canonical npm dev runner missing.');
if(pkg.scripts?.['build:dev']!=='tauri build --debug --no-bundle')fail('build:dev must produce a real Tauri debug profile.');
if(pkg.scripts?.['build:release']!=='tauri build --no-bundle --config src-tauri/tauri.release.conf.json')fail('Canonical release build command changed unexpectedly.');
const devBuildPs1=read('BUILD-DEV.ps1');
if(!devBuildPs1.includes('npm run build:dev')||!devBuildPs1.includes(String.raw`src-tauri\target\debug\budget.exe`)||devBuildPs1.includes(String.raw`src-tauri\target\release\budget.exe`)||!devBuildPs1.includes('Budget_Standalone_v0.2_Stable_DEV'))fail('Stable BUILD-DEV debug target contract missing.');
if(!buildReleasePs1.includes('cargo audit --file $lockPath')||!buildReleasePs1.includes('Get-Command cargo-audit')||!buildReleasePs1.includes("'.' + $releaseName + '.stage'")||!buildReleasePs1.includes('Replace-DirectorySafely -Stage $stage -Target $out')||!buildReleasePs1.includes('EXE SHA-256'))fail('Final RC release dependency-audit/staged portable contract missing.');
if(!makeFinalPs1.includes('.artifacts-stage')||!makeFinalPs1.includes('Replace-DirectorySafely -Stage $artifactsStage -Target $artifacts')||!makeFinalPs1.includes("channel = 'Stable'")||!makeFinalPs1.includes("version = '0.2.0'")||!makeFinalPs1.includes('exe_sha256 = $exeHash')||!makeFinalPs1.includes('Budget.exe'))fail('Final RC staged artifact publishing/hash metadata contract missing.');
if(!releaseArtifactVerifier.includes('Budget v0.2 Stable release artifact verification OK'))fail('Stable release artifact verifier identity missing.');
const startHere=read('START-HERE.txt');
if(!startHere.includes('BUDGET STANDALONE v0.2 STABLE')||!startHere.includes(String.raw`DEV = target\debug. RELEASE = target\release.`)||!startHere.includes('cargo install cargo-audit --locked'))fail('Stable START-HERE build/release guidance missing.');

// Every id referenced through el('...') must exist in the document.
const ids=new Set([...html.matchAll(/\bid=["']([^"']+)["']/g)].map(m=>m[1]));
for(const m of html.matchAll(/\bel\(['"]([^'"]+)['"]\)/g))if(!ids.has(m[1]))fail(`JS references missing DOM id: ${m[1]}`);

function dbInfo(rel){
  const p=path.join(root,rel),db=new DatabaseSync(p,{readOnly:true});
  try{
    const integ=db.prepare('PRAGMA integrity_check').get();
    if(Object.values(integ)[0]!=='ok')fail(`Integrity failed ${rel}`);
    const userVersion=Number(Object.values(db.prepare('PRAGMA user_version').get())[0]);
    if(userVersion!==7)fail(`Unexpected SQLite user_version ${userVersion}: ${rel}`);
    const journalMode=String(Object.values(db.prepare('PRAGMA journal_mode').get())[0]).toLowerCase();
    if(journalMode!=='delete')fail(`Unexpected SQLite journal_mode ${journalMode}: ${rel}`);
    const requiredColumns={users:['id','name','archived'],accounts:['id','name','opening_balance_cents','archived','user_id'],categories:['id','name','kind','archived'],transactions:['id','occurred_on','kind','amount_cents','account_id','category_id','note','created_at'],transfers:['id','occurred_on','amount_cents','from_account_id','to_account_id','note','created_at'],monthly_budgets:['month','user_id','category_id','amount_cents'],settings:['key','value']};
    for(const [table,columns] of Object.entries(requiredColumns)){
      if(!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table))fail(`Missing table ${table}`);
      const actual=new Set(db.prepare(`PRAGMA table_info(${table})`).all().map(row=>row.name));
      for(const column of columns)if(!actual.has(column))fail(`Missing required column ${table}.${column}: ${rel}`);
    }
    if(db.prepare('PRAGMA foreign_key_check').all().length)fail(`Foreign-key violations: ${rel}`);
    if(!db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_transactions_category_date'").get())fail(`Missing optimized category/date index: ${rel}`);
    return {
      transactions:db.prepare('SELECT COUNT(*) n FROM transactions').get().n,
      accounts:db.prepare('SELECT COUNT(*) n FROM accounts').get().n,
      categories:db.prepare('SELECT COUNT(*) n FROM categories').get().n,
      users:db.prepare('SELECT COUNT(*) n FROM users').get().n,
      transfers:db.prepare('SELECT COUNT(*) n FROM transfers').get().n
    };
  } finally { db.close(); }
}
const live=dbInfo('data/budget.sqlite3');
const seed=dbInfo('seed-data/budget.sqlite3');
const a=fs.readFileSync(path.join(root,'data/budget.sqlite3'));
const b=fs.readFileSync(path.join(root,'seed-data/budget.sqlite3'));
if(!a.equals(b))fail('Live/seed database mismatch.');
if(JSON.stringify(live)!==JSON.stringify(seed))fail('Live/seed logical summary mismatch.');

for(const js of ['app/shared/budget-bridge.js','app/shared/budget-dropdown.js','app/shared/modal-system.js','app/shared/browser-guard.js','app/shared/budget-startup-preview.js']){
  new vm.Script(read(js),{filename:js});
}
const inline=[...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(x=>x[1]);
inline.forEach((code,i)=>new vm.Script(code,{filename:`app/index.html:inline-${i+1}`}));

const hash=crypto.createHash('sha256').update(a).digest('hex');
console.log('Budget Standalone v0.2 Stable verification OK');
console.log('- Standalone Budget-only frontend/backend command surface');
console.log('- DOM-safe titlebar/bootstrap wiring (fixes missing chrome + dead controls)');
console.log('- Preview 3 compact 1080p UI redesign + adaptive history density');
console.log('- Preview 4 content-driven heights + report meters + lighter actions');
console.log('- Preview 5 enforced content-height history + compact desktop action widths');
console.log('- Preview 7 CSS cleanup + canonical compact actions + visible restrained gold accents');
console.log('- Preview 8 compact operation form + table polish + particle wrap-streak seam fix');
console.log('- Preview 9 robust visible date control + canonical compact field geometry + final interaction polish');
console.log('- Preview 10 stable form grid retained');
console.log('- Preview 11 unified black/gold custom dropdowns for every select');
console.log('- Preview 11 Hotfix 1 isolated sibling-shell dropdown runtime + body portal menu');
console.log('- Cleanup Pass 1 retired legacy dropdown assets + duplicate CSS + global dropdown observer');
console.log('- Cleanup Pass 1 Hotfix 1 static summary cards + neutral white frames');
console.log('- Cleanup Pass 1 Hotfix 2 transparent navigation strip outside controls');
console.log('- Cleanup Pass 2 retired frontend compatibility CSS + consolidated focus recovery');
console.log('- Cleanup Pass 3 schema-aware recovery + bounded backup pruning + immediate write transactions');
console.log('- Cleanup Pass 3 Hotfix 1 42/58 management polish + balanced modal system');
console.log('- Cleanup Pass 3 Hotfix 2 exact modal button text centering');
console.log('- Cleanup Pass 3 Hotfix 3 report heading-dot retirement + quieter inner frames');
console.log('- Cleanup Pass 3 Hotfix 4 audited typed fields + strict money entry + unified input interaction');
console.log('- Cleanup Pass 3 Hotfix 5 compact picker/dialog actions + non-semantic legacy-green retirement');
console.log('- Cleanup Pass 4 serialized backup/write mutations + frontend duplicate-submit guard');
console.log('- Cleanup Pass 4 Hotfix 1 desktop reports use natural-height lists without hidden inner scroll');
console.log('- Cleanup Pass 4 Hotfix 2 true debug/release command split + explicit target paths');
console.log('- Final RC successful-mutation-only backup retention + writable-storage startup preflight');
console.log('- Stable 0.2.0 identity + unified frontend cache keys + release security guards');
console.log('- cargo-audit gated staged release publishing + standalone EXE SHA-256 metadata');
console.log('- Modal listener cleanup + stale async Reports/Management repaint guards');
console.log('- Final RC Hotfix 1 refined Operations heading row + softer static summary-card frames');
console.log('- Final RC Hotfix 2 aligned Operations amount header with monetary values');
console.log('- Lazy hidden-view loading + single-commit transaction DOM rendering');
console.log('- Clean Rust import surface (no retired serde_json::json warning)');
console.log('- No active Igroteka/Kinoteka/Home runtime wiring or foreign dropdown namespaces');
console.log('- Dedicated Windows single-instance guard');
console.log('- True-black Cinema Mono shell + full-spectrum living particles');
console.log('- Centered WebView2-safe Budget themed dropdowns');
console.log('- Automatic SQLite backups/recovery + Budget query index maintenance');
console.log('- Retired full-DOM drag MutationObserver stays removed');
console.log(`- JavaScript syntax OK (${5+inline.length} files/scripts)`);
console.log('- No interactive pauses in CMD wrappers');
console.log(`- Canonical SQLite OK (${live.transactions} transactions, ${live.accounts} accounts, ${live.categories} categories, ${live.users} user)`);
console.log(`- Canonical live/seed byte identity OK (${hash.slice(0,12)}...)`);
