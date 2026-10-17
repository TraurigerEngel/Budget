## v0.2 Stable — Startup & Titlebar (GUI Parity)

- Promoted the accepted Budget Startup & Titlebar Preview 1 GUI Parity without altering the Windows window geometry, native show/focus logic, or SQLite.
- Held the centered golden title/logo an extra 600 ms after initial data readiness (380 -> 980 ms); original fade and initial motion stay intact.
- Kept centered 42px native-like titlebar and hover-only minimize/close icons.
- Kept console-free Windows Release profile; added an explicit PE subsystem check during release.
- Unique v0.2.0 Stable identity/artifacts, without overwriting the original v0.1 release.

## v0.1 Stable — Final RC Hotfix 2: Operations Amount Header Alignment

- Aligned the `Сумма` table header in Operations with the actual right-aligned monetary values so the column heading no longer appears visually shifted.
- Tightened the empty action-header cell padding so the amount/action split remains crisp at 1080p.
- UI-only change: no Rust/backend/storage/release logic or SQLite data changed.

## v0.1 Stable — Final RC Hotfix 1: Header & Summary Tone Polish

- Refined the Operations history heading row so the `Операции`, count badge and `Выбранный период` caption read as one balanced toolbar instead of a plain text strip.
- Restyled the count badge into a softer gold micro-pill and moved the period caption into a subtle graphite capsule for cleaner hierarchy.
- Softened the white frame treatment of the three top summary cards (`Доходы / Расходы / Текущий баланс`) by reducing border/glint intensity while keeping the cards fully static.
- No Rust/backend/storage/release logic or SQLite data changed.

## v0.1 Stable — Final RC Hardening

- Promoted runtime/build identity to `0.1.0` / Stable and unified active asset cache keys as `?v=0.1.0`.
- Failed mutations now discard their provisional backup without pruning older recovery points; retention is finalized only after a successful SQLite commit.
- Added startup writable-storage preflight for `data`, `data/backups` and the live SQLite file, surfaced through the normal bootstrap error screen.
- Added Rust dependency auditing to release builds (`cargo-audit`), verifier guards for release CSP/devtools/freezePrototype/navigation restrictions, and standalone EXE SHA-256 output.
- Release portable and final Artifacts now publish from verified staging directories so a failed build cannot erase the previous known-good output.
- Fixed shared modal key-handler cleanup and added generation guards for Reports/Management async rendering.
- Particle rendering/settings are intentionally unchanged.

## v0.1 Preview 11 — Cleanup Pass 4 Hotfix 2: Build Command Clarity

- `npm run build:dev` now uses Tauri `--debug`, so the command name matches reality and the resulting executable is in `src-tauri\target\debug\budget.exe`.
- Added `npm run dev` for the normal interactive Tauri development run.
- `BUILD-DEV.ps1` now consumes the debug executable instead of silently copying an optimized release-profile binary.
- Production/release flow is unchanged: `npm run build:release` and `MAKE-FINAL-RELEASE.cmd` still use `src-tauri\target\release`.
- Updated DEV instructions and fixed the stale `PREVIEW 10` heading in `START-HERE.txt`.
- No frontend UI, Rust application logic or SQLite data changed.

## v0.1 Preview 11 — Cleanup Pass 4 Hotfix 1: Report Natural Height

- Removed the desktop report list's legacy 500px/viewport max-height cap that could create a tiny hidden inner scroll range even when all report rows visually fit.
- Desktop `Категории` / `Счета` report lists now grow to their natural content height; the Reports view remains the single fallback scroll owner only when the complete report truly exceeds the available viewport.
- The Management `Категории` scrollbar is intentionally untouched.
- No data, backend, report calculations, colors, meters or responsive single-column behavior changed.

## v0.1 Preview 11 — Cleanup Pass 4: Mutation Race Hardening

- Added a frontend single-flight guard for every Budget write action, preventing rapid double-click/Enter from dispatching duplicate mutations while the first command is still in progress.
- Mutation controls are temporarily disabled during the active write and restored to their prior state afterward; the main Budget surface exposes `aria-busy` for the same interval.
- Added a Rust process-wide mutation mutex so the full `backup → IMMEDIATE transaction → commit` sequence is serialized, not only the SQLite write transaction.
- Existing backup/recovery rules, interaction styling, dropdowns, category scrollbar and canonical Budget SQLite remain unchanged.

## v0.1 Preview 11 — Cleanup Pass 3 Hotfix 5: RC Interaction Polish

- Compact picker/filter footer actions: secondary controls stay graphite, confirmation actions are compact Budget-gold buttons instead of full-width white blocks.
- Shared confirmation dialogs now use compact right-aligned actions instead of two equal-width columns.
- Audited first-version green interaction residue. Non-semantic button focus, range-selection fill and category-checkbox accent are retired in favor of restrained Budget gold.
- Semantic financial green remains intentionally limited to income/positive values and income report meters.
- Cache-busted frontend/modal styles; canonical Budget SQLite is unchanged.

## v0.1 Preview 11 — Cleanup Pass 3 Hotfix 4: Input Field Consistency

- Audited every editable text/money field in Operations and Management.
- Unified typed-field hover/focus/placeholder/caret/selection styling with the current restrained gold Cinema Mono interaction language.
- Replaced the account-rename field's legacy inline green styling with the canonical input contract.
- Account rename now supports Enter to save and Escape to cancel.
- Hardened money input: amount remains positive-only, opening balance supports a leading minus, both accept comma/dot with at most two decimals, invalid pasted/typed characters are rejected, and unsafe integer-cent values are refused.
- Name fields trim leading/trailing whitespace on blur; browser autocomplete/spellcheck are disabled for application-owned fields.
- Removed retired typed-date helpers and an unused money formatter.
- Canonical Budget SQLite remains byte-identical and unchanged.

## v0.1 Preview 11 Cleanup Pass 3 Hotfix 3 — Reports Visual Polish

- Removed the decorative gold dots from `Категории · <период>` and `Счета · <период>` report headings.
- Softened only the internal report-row borders at rest and hover so the outer report panels keep the stronger visual hierarchy.
- Kept the 50/50 report columns, semantic income/expense colors, progress meters, filters and all scrollbars unchanged.
- Cache-busted `styles.css`; canonical Budget SQLite and recovery/storage logic remain unchanged.

## v0.1 Preview 11 Cleanup Pass 3 Hotfix 2 — Modal Button Alignment

- Replaced native button-baseline positioning in the shared modal with explicit flex centering.
- `OK`, confirm, cancel, warning and destructive action labels now share the same exact horizontal/vertical alignment.
- Kept the existing 36px button height, modal size, colors and management-screen scrollbar unchanged.
- Cache-busted only the shared modal assets; canonical Budget SQLite remains unchanged.

## v0.1 Preview 11 Cleanup Pass 3 Hotfix 1 — Management & Modal Polish

- Rebalanced `Счета / Категории` to a 42/58 desktop grid so the longer category list gets more room without artificially stretching the account panel.
- Removed the decorative gold dots from management headings.
- Improved the subdued management action buttons for clearer 1080p readability.
- Added a thin graphite scrollbar only to the long category list while keeping the rest of the Cinema Mono UI scrollbar-free.
- Rebuilt the generic confirm/alert modal geometry around a compact 430px surface with balanced spacing and equal confirm actions.
- Added a restrained gold warning action for account archiving while preserving red destructive confirmations.
- Cache-busted the changed style/modal assets. Canonical Budget SQLite remains unchanged.

## v0.1 Preview 11 Cleanup Pass 3 — Storage & Recovery Hardening

- Added runtime SQLite schema validation (required columns), `user_version=7` enforcement and `PRAGMA foreign_key_check` before accepting live/backup/seed databases.
- Recovery now rejects structurally incompatible but otherwise integrity-clean SQLite files instead of letting the UI fail later.
- Startup checkpoints WAL, restores `journal_mode=DELETE`, verifies the final live DB and keeps the existing optimized index maintenance.
- Backup retention is now bounded from the actual backup files, not only `backup-meta.json`, so a missing/corrupt metadata catalog cannot cause unbounded backup growth.
- SQLite mutations now run inside `TransactionBehavior::Immediate` transactions; failed mutations roll back atomically.
- Archiving an account now verifies that the requested active account exists and confirms exactly one affected row.
- Updated the Lost Heaven compatibility migration target from retired Preview 8 to current Preview 11.
- Strengthened source/release SQLite verifiers with schema, user-version, foreign-key and release journal-mode checks.
- Canonical live/seed SQLite contents remain byte-identical and unchanged.

## v0.1 Preview 11 Cleanup Pass 2 — Frontend Runtime Consolidation

- Removed retired operation-form compatibility CSS from Preview 8/9 that no longer targets the canonical `operation-fields-v2` form.
- Removed dead standalone selectors left from pre-standalone/older Budget layouts (`panel-kicker`, `panel-count`, old budget/progress rows, retired header/filter helpers, and hidden date column styling).
- Removed the permanently hidden `Расход или доход` operation caption from DOM.
- Consolidated two overlapping pointer/focus recovery scripts into one canonical `budget-input-focus-recovery` listener.
- Added verifier guards against the retired selectors, duplicate pointer recovery, and old operation-form compatibility CSS.
- Visual layout, dropdown runtime, financial behavior and canonical SQLite are unchanged.

## v0.1 Preview 11 Cleanup Pass 1 Hotfix 2 — Transparent Navigation Strip

- Удалён полупрозрачный surface у общей `.tabs`-полосы.
- `.tab-group` больше не рисует фоновую пелену между кнопками.
- Сохранены индивидуальные surfaces/hover/active-state всех кнопок и фильтров.
- Добавлены verifier-guards для прозрачной навигационной оболочки.

## v0.1 Preview 11 Cleanup Pass 1 Hotfix 1 — Static Summary Cards

- Removed all hover-specific styling from the three top summary cards.
- Income, expense and current-balance cards now share one neutral white frame.
- Removed the retired gold balance-card border/underline override; financial value colors remain semantic.
- Canonical Budget SQLite remains unchanged.

## v0.1 Preview 11 Cleanup Pass 1 — Dropdown Retirement & Static Runtime

- Removed retired `themed-select.js/.css`; `budget-dd-*` is now the only active select/dropdown runtime.
- Removed retired `budget-select-*` CSS residue and exact duplicate top-level CSS rules.
- Removed the global document-wide dropdown `MutationObserver`; static selects are scanned once and each source keeps only its local option/disabled observer.
- Added verifier guards against legacy dropdown assets/namespaces, global dropdown rescans and exact duplicate top-level CSS.
- Pruned stale Preview 10 dropdown-workaround documentation from README.
- Canonical Budget SQLite remains byte-identical.

## v0.1 Preview 11 Hotfix 1 — Dropdown Runtime Repair


- Replaced the Preview 11 wrapped-select enhancer with a fresh isolated `budget-dd-*` runtime based on the proven sibling-shell/body-portal pattern.
- Native `<select>` elements remain canonical data/event sources but are now removed from layout as hidden sources; visible triggers occupy the original form cell as siblings.
- Added a new cache-safe asset pair (`budget-dropdown.js/css?v=p11hf1`) so stale Preview 11 themed-select resources cannot mix with the fixed runtime.
- Restored visible gold chevrons, full-width triggers, body-level popup menus, selected checkmarks, click-outside/Escape close and Arrow/Home/End keyboard navigation.
- Preserved Preview 10 form geometry and the canonical Budget SQLite pair unchanged.

## v0.1 Preview 11 — Unified Styled Dropdowns

- Replaced every native Budget `<select>` popup with one shared WebView2-safe custom dropdown surface.
- Operation-form `Тип`, `Счёт`, `Категория` and Management `Тип` now share the same black/gold popup, hover, selected state and keyboard behavior.
- The enhancer now wraps each native source inside its generated shell, so the shell occupies the exact original grid/flex slot and cannot create an extra layout row.
- Added gold chevrons, selected checkmarks, viewport edge clamping, click-outside/Escape close and Arrow/Home/End keyboard navigation.
- Removed the Preview 10 `data-budget-native-select` escape hatch; no system white select popup remains.
- Added `?v=p11` cache-busting for critical frontend assets.
- Canonical Budget SQLite remains unchanged.

## v0.1 Preview 10 Hotfix 5 — Form Rewrite & Cache Bust

- Полностью переписана форма «Новая операция» на изолированную сетку `operation-fields-v2`, без legacy `.field/.field-control` и без themed-select wrappers.
- `Тип`, `Счёт`, `Категория` теперь обычные native `<select>` с детерминированной полноширинной геометрией и золотой стрелкой.
- Удалены retired stable-select face/showPicker workaround из operation form.
- Добавлен cache-busting `?v=p10hf5` для критичных frontend CSS/JS, чтобы WebView2 не смешивал новую разметку со старым кэшированным CSS.
- Эталонная Budget SQLite не изменена.

## v0.1 Preview 10 Hotfix 3 — Stable Native Operation Selects

- Removed the unreliable operation-form themed-select wrapper workaround that kept shrink-wrapping in WebView2.
- `Тип`, `Счёт`, and `Категория` now use styled native selects that fill the canonical form-grid cells directly.
- Retained the generic themed-select component for other supported controls.
- Added verifier guards preventing the retired Hotfix 1/2 operation select geometry from returning.
- Canonical Budget SQLite remains unchanged.

## v0.1 Preview 10 Hotfix 2 — Host-Anchored Select Geometry

- Fixed remaining WebView2 shrink-to-content behavior for `Тип`, `Счёт`, and `Категория`.
- Operation themed-select shells are now absolutely pinned to the canonical `.field-control` bounds with `inset: 0`; percentage-width sizing is no longer relied on.
- Preserved Preview 10 canonical form grid, visible date control, gold accents, particle seam fix, and all Budget behavior.
- Canonical Budget SQLite data is unchanged.

# Changelog

## v0.1 Preview 10 — Canonical Form Grid Fix

- Rebuilt the New Operation form with explicit label/control wrappers instead of mixed label text + native/custom controls.
- Canonically aligns `Тип / Дата` and `Сумма / Счёт` in two equal rows.
- `Категория` and `Комментарий` remain full-width without vertical drift.
- Added explicit aria labels for themed selects.
- Preserved Preview 9 date rendering, Preview 8 particle seam fix, and all canonical Budget data.

## v0.1 Preview 9 — Date Control & Final Interaction Polish

- Restored a robust visible operation-date label with synchronized accessible state.
- Replaced residual field-grid stretching with one canonical compact flex geometry inside the operation form.
- Tightened category/comment spacing without changing form behavior.
- Improved delete hover/focus affordance and table vertical alignment.
- Retained Preview 8 particle wrap-streak seam protection and canonical Budget data unchanged.


## v0.1 Preview 8 — Final UI Polish & Particle Seam Fix

- Compacted the New Operation form with canonical fixed-height rows and reduced vertical gaps.
- Removed the redundant operation-form caption and slightly widened the compact Add Operation action.
- Increased transaction table-header contrast and strengthened destructive hover/focus feedback.
- Softened the current-balance gold so selected navigation remains the primary interactive accent.
- Fixed the intermittent full-window horizontal/vertical particle seam: fast-particle streaks are no longer drawn on wrap-around frames.
- Canonical Budget SQLite data remains unchanged.

## v0.1 Preview 7 — CSS Cleanup & Real Gold Accent

- Removed obsolete overlapping desktop action-width rules from earlier preview layers.
- Added one canonical compact action class for Add operation/account/category.
- Strengthened but restrained gold selected/focus accents and Budget titlebar brand color.
- Kept income green, expense red, and destructive actions semantic.
- Kept report meters semantic and made them more legible at 1080p.
- Canonical live/seed Budget SQLite data remains unchanged.

## v0.1 Preview 6 — Action Controls, Reports & Gold Accents

- Reworked desktop action wrappers into centered fixed-width grid tracks so add buttons stay compact despite legacy width rules.
- Strengthened report meters for real 1080p visibility while retaining green/red financial semantics.
- Added restrained gold accents to active/selected neutral UI states, current balance framing, counters and titlebar branding.
- Added gold focus/selected treatment to the standalone Budget themed-select component.
- Kept the canonical Budget SQLite pair byte-identical and unchanged.

## v0.1 Preview 5 — Layout Enforcement & Control Polish
- Fixed the Preview 4 CSS-specificity regression that kept the Operations history stretched to the viewport.
- History/table height is now genuinely content-driven with bounded scrolling for long periods.
- Add-operation/account/category buttons are hard-capped to compact desktop widths and cannot stretch full-width.
- Report meters and transaction header contrast were strengthened slightly.
- All main view grids explicitly align content to the top.
- Canonical Budget SQLite data is unchanged.

## v0.1 Preview 4 — Adaptive Layout & Visual Polish
- History panel height now follows real content; scrolling only appears for longer periods.
- Reports use compact proportional meters and period-correct headings.
- Accounts/categories panels are content-sized with bounded scrolling only for long lists.
- Primary actions changed from large white slabs to lighter semantic-white controls.
- Secondary labels/meta text increased slightly for 1920×1080 readability.
- Removed unused `serde_json::json` Rust import so DEV/release builds stay warning-free.
- Canonical Budget SQLite data is unchanged.

## v0.1 Preview 3 — UI Redesign & Density Pass

- Reworked the Operations view into a denser 1080p-first dashboard while preserving all Budget behavior.
- Added segmented section navigation and a clearer filters cluster.
- Removed service-like `Запись` / `История` kickers; operation count now lives in the history title.
- Added a compact sticky transaction table header.
- History panel now has adaptive bounded height instead of filling all remaining viewport space when only a few operations are visible.
- Reduced visual weight of the primary add action and tightened report/manage surfaces.
- Initial startup now renders only the visible Operations data; Reports and Management are loaded lazily when opened.
- Transaction rows are assembled with `DocumentFragment` and committed to the table in one DOM update.
- Canonical Budget live/seed SQLite remains byte-identical and user data is unchanged.


## v0.1 Preview 2 — Foundation Fix + Layout Redesign

- Fixed critical standalone bootstrap ordering: custom titlebar no longer touches `document.body` from `<head>` before the body exists.
- Restored functional Budget titlebar and UI event wiring.
- Added verifier guard for DOM-safe titlebar/bootstrap sequencing.
- Reworked the 1920×1080 layout: wider 1500 px workspace, 400–430 px operation form, larger history panel and improved scale.
- Added operation-history heading and live operation counter.
- Polished summary cards, navigation, forms, tables, reports, management panels and modal pickers into neutral Cinema Mono soft-glass styling.
- Consolidated 28 inline CSS blocks into `app/styles.css`.
- Removed the retired full-DOM drag `MutationObserver`; delegated drag prevention remains.
- Embedded the user-provided canonical Budget data: 15 transactions, 1 account, 9 categories; live and seed remain byte-identical after adding the query index.
- Preserved true-black background chain, living particles, centered dropdowns, single-instance guard, backup/recovery and no-pause CMD policy.

## v0.1 Preview — Standalone Split + Cinema Mono

- Budget extracted from Lost Heaven Desktop v3.00 into its own Tauri app.
- Removed active Games, Movies and Home runtime wiring.
- Preserved the Budget SQLite schema and canonical personal data in live + seed databases.
- Added standalone backup/recovery and bounded backup retention.
- Preserved/maintained the Budget transaction query index and `PRAGMA optimize`.
- Added Windows single-instance guard.
- Added DEV, Release and Final Release pipelines with strict 3-file portable verification.
- Removed interactive pauses from CMD wrappers.
- Added Cinema Mono true-black visual base, full-spectrum living particles and soft graphite glass surfaces.
- Added Budget-only themed-select namespace with centered dropdown positioning.
- Added a Budget icon in the purple/pink/gold sibling-app visual family.

## v0.1 Preview 10 Hotfix 1 — Full-Width Select Controls

- Fixed collapsed themed selects in the New Operation form.
- `Тип`, `Счёт`, and `Категория` now fill their canonical form-control cells.
- Added verifier guards for CSS/runtime width enforcement.
- No database or functional Budget logic changes.



## Preview 10 Hotfix 4 — Stable Select Face
- Replaced visible native-select geometry in the operation form with deterministic full-cell face buttons.
- Native select elements remain the canonical data source and picker; face labels mirror the selected option.
- Uses `showPicker()` from the user gesture with a click fallback, avoiding WebView2 shrink-to-fit rendering entirely.
- No database changes.
