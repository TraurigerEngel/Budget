# Budget Standalone v0.2 Stable

## v0.2 Stable — Startup & Titlebar

Promoted the user-approved GUI/Titlebar Parity preview. The centered golden **БЮДЖЕТ** splash remains visible an additional **600 ms** after initial data readiness (980 ms hold instead of 380 ms), with the same 580 ms fade. The accepted visible/maximized Tauri geometry, no deferred `show()`/`set_focus()`, centered 42px titlebar, hover-only vector controls, particles, and SQLite/storage behavior are unchanged. Release-mode Windows GUI executable has an explicit PE subsystem check. This is a separate release; v0.1 artifacts are not overwritten.

To build release: `npm ci`, `npm run verify`, `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\MAKE-FINAL-RELEASE.ps1`. Requires `cargo-audit` installed; output: `Artifacts/Budget_Standalone_v0.2_Stable_*.zip`.


## Final RC Hotfix 2 — Operations Amount Header Alignment

This UI-only follow-up fixes the last visible polish issue in the Operations table header. The `Сумма` heading is now explicitly aligned with the right-aligned money values below it, so the caption no longer looks like it drifted away from its own column. The empty actions header cell is also tightened slightly to preserve a crisp separation between `Сумма` and the delete-action column. No Budget logic, storage/recovery flow, release scripts or SQLite data changed.

## Final RC Hotfix 1 — Header & Summary Tone Polish

This UI-only follow-up lightly polishes the top-of-screen presentation before Stable. The `Операции` heading row now reads more like a compact toolbar: the count becomes a refined gold pill and the `Выбранный период` caption becomes a soft graphite capsule, which better matches the rest of the Cinema Mono hierarchy. The three large summary cards at the top also keep their accepted static behavior, but their white frame/glint is intentionally less bright so they sit more quietly against the black background. No Budget logic, storage/recovery flow, release scripts or SQLite data changed.

## Final RC Hardening

The original v0.1 Stable release introduced the final `0.1.0` identity and its Windows runtime/release validation safeguards. Failed mutations now discard their provisional safety backup before retention pruning, startup checks writable `data`, `backups` and the live SQLite file, release builds require `cargo-audit`, release security settings are verifier-guarded, and verified portable/artifact directories are published from staging instead of deleting the previous good release first. `Budget.exe` receives its own SHA-256 entry. Frontend modal listeners are cleaned up immediately and Reports/Management ignore stale async render completions. The particle system is intentionally unchanged.

## Cleanup Pass 4 Hotfix 1 — Report Natural Height

On desktop, the Reports view no longer gives each report list its own legacy bounded scroll area. `Категории` and `Счета` grow to their actual content height, so a six-row report that already fits on screen cannot acquire a tiny hidden scroll range from the old 500px cap. If a genuinely long report exceeds the viewport, the Reports view itself remains the fallback scroll container. The separately accepted scrollbar in Management → `Категории` is unchanged.

## Cleanup Pass 4 — Mutation Race Hardening

Budget writes now use two matching safety layers. The frontend allows only one mutation at a time and temporarily disables the currently rendered write controls, preventing duplicate add/delete/archive/rename commands from rapid clicks or Enter presses. The Rust backend independently serializes the complete backup-and-write sequence with a process-wide mutex before creating the safety backup and opening the `IMMEDIATE` SQLite transaction. This changes no UI geometry, dropdown styling, category scrollbar, data model or canonical SQLite content.

## Cleanup Pass 3 Hotfix 5 — RC Interaction Polish

Picker/filter footers now use compact actions rather than large full-width confirmation blocks: secondary actions remain graphite and the primary confirmation is restrained gold. Shared confirmation dialogs follow the same compact right-aligned action pattern. A targeted legacy-theme audit retires non-semantic first-version green from generic keyboard focus, period range fill and category-checkbox selection; semantic income/positive values and income report meters intentionally stay green. Canonical SQLite is unchanged.

## Cleanup Pass 3 Hotfix 4 — Input Field Consistency

All editable fields now use one interaction contract. Money inputs reject non-money characters instead of silently coercing them, `Сумма` stays positive-only, `Начальный баланс` may be negative, both support `,` or `.` and two decimals, and cent values must remain inside JavaScript's safe integer range. Account/category names are trimmed on blur. The inline account-rename editor uses the same styling as the rest of Budget and supports Enter/Escape. Browser autocomplete/spellcheck are disabled for these application-owned inputs.

## Cleanup Pass 3 Hotfix 3 — Reports Visual Polish

The Reports view keeps its existing two-column layout, semantic green/red values and progress meters. Decorative gold heading dots are removed, and only the inner report-row frames are softened so they sit behind the outer report panels instead of competing with them. Report geometry, period/category filters, scrollbars, SQLite and recovery behavior are unchanged.

## Cleanup Pass 3 Hotfix 2 — Modal Button Alignment

Modal action buttons now use explicit flex centering (`display:inline-flex; align-items:center; justify-content:center`) so `OK`, confirm, cancel and destructive labels sit exactly in the visual center of the 36px button surface instead of relying on the browser's native button baseline. Button size, colors, modal geometry, management layout, scrollbar and canonical SQLite are unchanged.

## Cleanup Pass 3 Hotfix 1 — Management & Modal Polish

The management screen now uses a 42/58 Accounts/Categories split, removes decorative heading dots, improves quiet action-button legibility, and exposes a thin graphite scrollbar only for the long category list. The shared confirm/alert modal is rebuilt as a compact 430px Cinema Mono surface with balanced spacing and equal confirmation actions; warning confirmations use the restrained Budget gold accent and destructive actions remain red. Canonical SQLite is unchanged.

## Cleanup Pass 3 — Storage & Recovery Hardening

Backend storage now validates more than `PRAGMA integrity_check`: live, backup and seed databases must have the expected Budget schema (`user_version=7`, required columns and clean foreign keys). Startup checkpoints any WAL state and normalizes the live DB back to `journal_mode=DELETE` before normal operation. Backup pruning uses the actual backup files, so retention stays bounded even if `backup-meta.json` is missing or damaged. Write commands execute inside immediate SQLite transactions, and account archiving now verifies the target/affected row. The compatibility migration tool points to the current Preview 11 DEV directory. Canonical `data` and `seed-data` are unchanged.

## Cleanup Pass 2 — Frontend Runtime Consolidation

Cleanup Pass 2 removes frontend compatibility residue without changing the confirmed Preview 11 visual baseline. The current `operation-fields-v2` form is now the only operation-form geometry; retired Preview 8/9 `.form-grid/.field` operation overrides are gone. Two overlapping pointer/focus recovery scripts were merged into one canonical listener, and unused standalone selectors from older layouts were removed. Dropdown styling, transparent navigation, static summary cards and canonical Budget SQLite remain unchanged.

## Cleanup Pass 1 Hotfix 2 — Transparent Navigation Strip

- Убрана полупрозрачная подложка всей навигационной полосы между контролами.
- Оболочка группы вкладок теперь прозрачная; фон остаётся только у самих интерактивных кнопок.
- Активная золотая вкладка, фильтр категорий и выбор периода визуально не изменены.
- Добавлен verifier-guard, запрещающий возврат фоновой «пелены» у `.tabs` и `.tab-group`.

# Historical Preview 11 baseline

## Cleanup Pass 1 Hotfix 1 — Static Summary Cards

Верхние карточки `Доходы / Расходы / Текущий баланс` теперь информационные и полностью статичные: hover не меняет фон, рамку, тень или положение. Все три карточки используют одинаковую нейтральную белую рамку; зелёный/красный/белый цвет самих финансовых значений сохранён.

Standalone-ветка проекта «Бюджет», отделённая от Lost Heaven Desktop v3.00.

## Cleanup Pass 1 — Dropdown Retirement & Static Runtime

- Удалены больше не используемые `app/shared/themed-select.js` и `app/shared/themed-select.css`.
- Из `styles.css` удалён retired `budget-select-*` namespace и точные дубли top-level CSS-правил.
- Unified `budget-dd-*` остаётся единственным dropdown-runtime для всех четырёх реальных `<select>` (`Тип`, `Счёт`, `Категория`, `Тип категории`).
- Удалён глобальный full-document `MutationObserver` dropdown-компонента: все select-источники статичны, а изменения option/disabled отслеживаются лёгкими observer-ами самих select.
- Фильтр категорий и выбор периода не являются `<select>`: это отдельные уже стилизованные dialog/picker controls.
- Verifier запрещает возврат legacy dropdown assets/namespaces, глобального dropdown observer и точных дублей top-level CSS.
- Каноническая SQLite не изменяется.

## Preview 11 Hotfix 1 — Dropdown Runtime Repair

Hotfix 1 replaces the first Preview 11 enhancer with an isolated `budget-dd-*` component. The native select remains the canonical value/event source, but it is removed from layout and a full-width sibling trigger occupies the original field slot. Menus render in `document.body`, so they are not clipped by panels. New `budget-dropdown.js/css?v=p11hf1` asset names also prevent stale WebView2 dropdown resources from mixing with the fixed runtime. Gold chevrons, black/gold popup surfaces, selected checkmarks, Escape/click-outside close and keyboard navigation are preserved. Canonical Budget data is unchanged.

## Preview 11 — Unified Styled Dropdowns

All actual Budget `<select>` controls use the same custom WebView2-safe dropdown component. The operation form and category management therefore share one black/gold popup style instead of the Windows/WebView2 native white popup. Native `<select>` elements remain the canonical value/event source but are hidden from layout; a full-width sibling trigger occupies the field slot and the popup is rendered in `document.body`. Keyboard navigation, Escape, click-outside close, selected checkmarks and viewport clamping are preserved.


## Что уже отделено

- отдельный Tauri EXE и идентификатор `com.lostheaven.budget`;
- отдельные `data\budget.sqlite3` и `seed-data\budget.sqlite3`;
- Budget-only Rust command surface — без Games, Movies и Home;
- автоматические backup/recovery перед изменениями;
- отдельный Windows single-instance guard;
- отдельные DEV/Release/Final Release сценарии;
- строгий portable allowlist: `Budget.exe`, live DB, seed DB;
- миграция из старой базы Lost Heaven оставлена только как compatibility tool.




## Preview 10 — Canonical Form Grid Fix

Preview 10 replaces the fragile operation-form label/control flow with explicit `.field-label` and `.field-control` wrappers. The first two rows are now a canonical two-column grid (`Тип / Дата`, `Сумма / Счёт`), while `Категория` and `Комментарий` span both columns. This prevents themed-select controls from dropping below their peer fields and removes the staircase layout seen in Preview 9. No Budget data or transaction logic was changed.

## Preview 9 — Date Control & Final Interaction Polish

Preview 9 makes the operation date label explicitly visible and synchronized with the custom calendar, removes residual vertical stretching inside the New Operation form, and finishes destructive-button/table interaction polish. Preview 8 particle seam protection remains intact. Canonical Budget data is unchanged.


## Preview 7 — CSS Cleanup & Real Gold Accent

Preview 7 removes the conflicting legacy action-button width overrides instead of stacking another workaround. The three primary creation actions now share one canonical compact rule set, while mobile keeps full-width actions. Gold is intentionally more visible on active/selected/focus states, the current-balance card and the titlebar, without replacing green income or red expense semantics. Report meters remain semantic and are slightly more legible. The canonical Budget database is unchanged.

## Preview 6 — Action Controls, Reports & Gold Accents

Preview 6 is a focused visual-polish pass on top of the confirmed Preview 5 layout:

- desktop action areas use fixed center tracks, so legacy `width:100% !important` rules can no longer stretch the add buttons;
- report meters are thicker and more legible while keeping income green and expense red;
- gold is used only as a restrained neutral/selection accent: active tabs, balance highlight, counters, focus/selected states and the titlebar brand;
- Budget themed selects receive the same subtle gold selected/focus treatment;
- financial semantics are unchanged: income remains green, expense remains red, destructive actions remain red;
- canonical live/seed SQLite is unchanged.

## Preview 5 — Layout Enforcement & Control Polish

Preview 5 fixes the CSS-precedence problems visible in the Windows screenshots of Preview 4:

- the Operations history now truly follows its table content instead of inheriting an older `height:100% !important`;
- the transaction table wrapper is auto-height with bounded scrolling only when the list grows;
- add-operation/account/category actions are explicitly capped to compact desktop widths, so they cannot stretch into full-width white slabs;
- report meters are more visible and the transaction header has stronger hierarchy;
- Operations, Reports and Management all use start-aligned content-driven grids;
- canonical Budget SQLite data and runtime behavior are unchanged.

## Preview 4 — Adaptive Layout & Visual Polish

Preview 5 keeps the verified Preview 3 logic and canonical database, while making all three views content-driven:

- short transaction histories no longer reserve a large empty panel;
- long histories scroll inside a bounded table;
- reports show proportional category/account meters and period-correct headings;
- account/category management panels follow content height and scroll only when lists become long;
- primary actions are lighter and less visually dominant;
- secondary text is slightly larger for 1920×1080;
- the retired `serde_json::json` import is removed so Rust builds are clean.

## Preview 3 — UI Redesign & Density Pass

Preview 3 развивает рабочую Preview 2 без изменения канонических данных:

- переработана композиция главного экрана под 1920×1080;
- вкладки собраны в компактный segmented control, фильтры остаются справа;
- убраны служебные подписи «Запись/История»;
- счётчик операций встроен в заголовок истории;
- добавлена компактная строка заголовков таблицы;
- история больше не растягивается на всю высоту экрана при малом числе операций;
- основная кнопка добавления стала компактнее;
- отчёты и управление получили более плотные карточки;
- первичная загрузка больше не строит скрытые Отчёты и Управление — они загружаются по требованию;
- список операций собирается через `DocumentFragment` и вставляется в DOM одной операцией.

Каноническая `budget.sqlite3` пользователя сохранена без изменения пользовательских строк.

## Preview 2 — Foundation Fix + Layout Redesign

Preview 2 исправляет критическую ошибку первого standalone Preview: `budget-bridge.js` пытался создать custom titlebar до появления `document.body`. Из-за этого bootstrap падал в `<head>`, titlebar не создавался и основной UI не получал обработчики. Теперь titlebar ставится только после DOM readiness, а база может безопасно bootstrap-иться через ранний Promise.

Также:

- custom titlebar «Бюджет» возвращён и использует те же скрываемые до hover кнопки свернуть/закрыть, что sibling-приложения;
- интерфейс переработан под 1920×1080: рабочая область расширена до 1500 px, форма и история операций получили более правильные пропорции;
- история операций получила отдельный заголовок и счётчик записей;
- карточки, вкладки, поля, кнопки, календарь и period/category dialogs приведены к Cinema Mono / soft glass;
- финансовая семантика сохранена: доход зелёный, расход красный, нейтральные действия бело-графитовые;
- все inline CSS-блоки консолидированы в `app\styles.css`;
- удалён постоянный full-DOM `MutationObserver`, который раньше пересканировал DOM ради `draggable=false`;
- CMD-обёртки не содержат `pause`, `Read-Host` или `set /p`;
- canonical live + seed DB собраны из предоставленной эталонной `budget.sqlite3`; текущая база содержит 15 операций, 1 счёт и 9 категорий. Добавлен только служебный индекс `idx_transactions_category_date` для запросов — сами пользовательские записи не изменялись.

## Визуальная база

True-black `#020203`, мягкие прозрачные mono-поверхности без `backdrop-filter`, полноцветные Living Particles, нейтральные бело-графитовые utility controls. Dropdown-меню используют standalone Budget namespace и центрируются относительно триггера.

## DEV / проверочная сборка

`build:dev` теперь действительно собирает **debug profile** Tauri и кладёт EXE в `src-tauri\target\debug`. Для быстрой интерактивной разработки можно использовать `npm run dev`, который сам собирает и запускает debug-приложение.

Прямая проверка из PowerShell:

```powershell
npm ci
npm run verify
npm run build:dev
.\src-tauri\target\debug\budget.exe
```

Либо собрать обновляемую portable DEV-копию:

```powershell
.\BUILD-DEV.cmd
```

После `=== DEV BUILD READY ===`:

```powershell
.\Portable\Budget_Standalone_v0.2_Stable_DEV\Budget.exe
```

Release остаётся отдельным production-путём: `npm run build:release` / `.\MAKE-FINAL-RELEASE.cmd`, результат Tauri лежит в `src-tauri\target\release`.

## Проверка

```powershell
npm run verify
```

## Миграция из Lost Heaven

Текущая Preview уже содержит предоставленную эталонную БД, поэтому миграция сейчас не нужна. Compatibility tool оставлен на случай, если в старом Lost Heaven позже появятся более свежие данные:

```powershell
.\MIGRATE-FROM-LOST-HEAVEN.cmd
```

Перед миграцией закрыть оба приложения.

## Preview 10 Hotfix 5 — canonical operation form

Форма «Новая операция» использует отдельную `operation-fields-v2` сетку. Поля Тип/Счёт/Категория — нативные select, исключённые из общего themed-select enhancer через `data-budget-native-select="1"`. Критичные frontend assets имеют cache-busting query `?v=p10hf5`.

## GitHub вЂ” Р±РµР·РѕРїР°СЃРЅР°СЏ РєРѕРїРёСЏ (Р±РµР· РїРµСЂСЃРѕРЅР°Р»СЊРЅС‹С… С„РёРЅР°РЅСЃРѕРІС‹С… РґР°РЅРЅС‹С…)

Р­С‚РѕС‚ СЂРµРїРѕР·РёС‚РѕСЂРёР№ РЅРµ СЃРѕРґРµСЂР¶РёС‚ СЂР°Р±РѕС‡СѓСЋ Р±Р°Р·Сѓ `data/budget.sqlite3`: РµС‘ РёСЃРєР»СЋС‡РёР»Рё РґР»СЏ Р·Р°С‰РёС‚С‹ Р»РёС‡РЅС‹С… РґР°РЅРЅС‹С….
Р’ `seed-data/budget.sqlite3` РЅР°С…РѕРґРёС‚СЃСЏ РїСЂРѕРІРµСЂРµРЅРЅР°СЏ РѕР±РµР·Р»РёС‡РµРЅРЅР°СЏ РґРµРјРѕР±Р°Р·Р° (0 РѕРїРµСЂР°С†РёР№).
РџРѕСЃР»Рµ РєР»РѕРЅРёСЂРѕРІР°РЅРёСЏ **РґРѕ `npm run verify`** Р·Р°РїСѓСЃС‚РёС‚Рµ `INIT-DEMO-DATA.cmd`. РћРЅ СЃРєРѕРїРёСЂСѓРµС‚
РґРµРјРѕР±Р°Р·Сѓ РІ `data/budget.sqlite3`, РµСЃР»Рё СЂР°Р±РѕС‡РµР№ Р±Р°Р·С‹ РµС‰С‘ РЅРµС‚, Рё РЅРёРєРѕРіРґР° РЅРµ РїРµСЂРµР·Р°РїРёС€РµС‚ РµС‘.
РџРµСЂРµРґ РїСѓР±Р»РёРєР°С†РёРµР№ РЅРѕРІС‹С… РєРѕРјРјРёС‚РѕРІ РЅРµ РґРѕР±Р°РІР»СЏР№С‚Рµ РІ Git РїРѕР»СЊР·РѕРІР°С‚РµР»СЊСЃРєРёРµ Р±Р°Р·С‹ Рё СЂРµР·РµСЂРІРЅС‹Рµ РєРѕРїРёРё.
РџРѕРґСЂРѕР±РЅРµРµ: [GITHUB_PRIVACY_RU.md](GITHUB_PRIVACY_RU.md).