use chrono::{SecondsFormat, Utc};
use rusqlite::{Connection, OpenFlags};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};

const DB_FILENAME: &str = "budget.sqlite3";
const BACKUP_KEEP: usize = 20;
const REQUIRED_USER_VERSION: i64 = 7;
// budget-cleanup-pass3-storage-recovery

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct BackupMeta {
    reason: String,
    created_at: String,
}

#[derive(Debug)]
pub struct PendingBackup {
    path: PathBuf,
    name: String,
    meta: BackupMeta,
}

pub fn now_iso() -> String {
    Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true)
}

fn file_stamp() -> String {
    Utc::now().format("%Y-%m-%dT%H-%M-%S-%3fZ").to_string()
}

fn source_root() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .unwrap_or(Path::new(env!("CARGO_MANIFEST_DIR")))
        .to_path_buf()
}

fn portable_root() -> Option<PathBuf> {
    std::env::current_exe().ok()?.parent().map(Path::to_path_buf)
}

fn is_cargo_build_output(root: &Path) -> bool {
    let Some(profile) = root.file_name().and_then(|x| x.to_str()) else { return false; };
    if profile != "release" && profile != "debug" { return false; }
    let Some(target) = root.parent() else { return false; };
    if target.file_name().and_then(|x| x.to_str()) != Some("target") { return false; }
    let Some(src_tauri) = target.parent() else { return false; };
    src_tauri.file_name().and_then(|x| x.to_str()) == Some("src-tauri")
}

fn root_for_data() -> PathBuf {
    if let Some(root) = portable_root() {
        if root.join("data").is_dir() || root.join("seed-data").is_dir() {
            return root;
        }
        if is_cargo_build_output(&root) {
            return source_root();
        }
        return root;
    }
    source_root()
}

fn database_path() -> Result<PathBuf, String> {
    let path = root_for_data().join("data").join(DB_FILENAME);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    Ok(path)
}

fn seed_database_path() -> Option<PathBuf> {
    let root = root_for_data();
    let seed = root.join("seed-data").join(DB_FILENAME);
    seed.is_file().then_some(seed)
}

fn backup_root() -> Result<PathBuf, String> {
    let root = root_for_data().join("data").join("backups");
    fs::create_dir_all(&root).map_err(|e| e.to_string())?;
    Ok(root)
}

fn meta_path() -> Result<PathBuf, String> {
    Ok(backup_root()?.join("backup-meta.json"))
}

fn probe_directory_writable(dir: &Path, label: &str) -> Result<(), String> {
    fs::create_dir_all(dir).map_err(|e| format!("Не удалось подготовить {label}: {e}"))?;
    let probe = dir.join(format!(".budget-write-probe-{}-{}.tmp", std::process::id(), Utc::now().timestamp_millis()));
    let result = (|| -> Result<(), String> {
        let mut file = OpenOptions::new().create_new(true).write(true).open(&probe)
            .map_err(|e| format!("Нет прав записи в {label} ({}): {e}", dir.display()))?;
        file.write_all(b"budget-write-probe").map_err(|e| format!("Не удалось записать проверочный файл в {label}: {e}"))?;
        file.sync_all().map_err(|e| format!("Не удалось синхронизировать проверочный файл в {label}: {e}"))?;
        Ok(())
    })();
    let _ = fs::remove_file(&probe);
    result
}

fn preflight_storage_writable() -> Result<(), String> {
    let data = root_for_data().join("data");
    probe_directory_writable(&data, "каталог данных Бюджета")?;
    probe_directory_writable(&data.join("backups"), "каталог резервных копий Бюджета")?;
    let live = data.join(DB_FILENAME);
    if live.is_file() {
        OpenOptions::new().read(true).write(true).open(&live)
            .map_err(|e| format!("База Бюджета недоступна для записи ({}): {e}", live.display()))?;
    }
    Ok(())
}

fn validate_database_path(path: &Path) -> Result<(), String> {
    let db = Connection::open_with_flags(path, OpenFlags::SQLITE_OPEN_READ_ONLY).map_err(|e| e.to_string())?;
    let integrity: String = db.query_row("PRAGMA integrity_check", [], |r| r.get(0)).map_err(|e| e.to_string())?;
    if !integrity.eq_ignore_ascii_case("ok") {
        return Err(format!("SQLite integrity_check failed: {}", path.display()));
    }

    let user_version: i64 = db.query_row("PRAGMA user_version", [], |r| r.get(0)).map_err(|e| e.to_string())?;
    if user_version != REQUIRED_USER_VERSION {
        return Err(format!(
            "Неподдерживаемая версия схемы SQLite {} (ожидалась {}).",
            user_version, REQUIRED_USER_VERSION
        ));
    }

    for sql in [
        "SELECT id,name,archived FROM users LIMIT 0",
        "SELECT id,name,opening_balance_cents,archived,user_id FROM accounts LIMIT 0",
        "SELECT id,name,kind,archived FROM categories LIMIT 0",
        "SELECT id,occurred_on,kind,amount_cents,account_id,category_id,note,created_at FROM transactions LIMIT 0",
        "SELECT id,occurred_on,amount_cents,from_account_id,to_account_id,note,created_at FROM transfers LIMIT 0",
        "SELECT month,user_id,category_id,amount_cents FROM monthly_budgets LIMIT 0",
        "SELECT key,value FROM settings LIMIT 0",
    ] {
        db.prepare(sql).map_err(|e| format!("Некорректная схема SQLite: {e}"))?;
    }

    let mut stmt = db.prepare("PRAGMA foreign_key_check").map_err(|e| e.to_string())?;
    let mut rows = stmt.query([]).map_err(|e| e.to_string())?;
    if rows.next().map_err(|e| e.to_string())?.is_some() {
        return Err(format!("SQLite foreign_key_check failed: {}", path.display()));
    }
    Ok(())
}

fn has_active_wal(path: &Path) -> bool {
    fs::metadata(PathBuf::from(format!("{}-wal", path.display())))
        .map(|m| m.len() > 0)
        .unwrap_or(false)
}

fn checkpoint(path: &Path) -> Result<(), String> {
    let db = Connection::open(path).map_err(|e| e.to_string())?;
    db.execute_batch("PRAGMA busy_timeout=5000; PRAGMA wal_checkpoint(TRUNCATE);")
        .map_err(|e| e.to_string())?;
    drop(db);
    if has_active_wal(path) {
        return Err(format!("SQLite WAL всё ещё активен: {}", path.display()));
    }
    Ok(())
}

fn enforce_delete_journal_mode(path: &Path) -> Result<(), String> {
    let db = Connection::open(path).map_err(|e| e.to_string())?;
    db.execute_batch("PRAGMA busy_timeout=5000;").map_err(|e| e.to_string())?;
    let mode: String = db.query_row("PRAGMA journal_mode=DELETE", [], |r| r.get(0)).map_err(|e| e.to_string())?;
    if !mode.eq_ignore_ascii_case("delete") {
        return Err(format!("Не удалось включить SQLite journal_mode=DELETE: {mode}"));
    }
    Ok(())
}

fn read_catalog() -> BTreeMap<String, BackupMeta> {
    let Ok(path) = meta_path() else { return BTreeMap::new(); };
    let Ok(text) = fs::read_to_string(path) else { return BTreeMap::new(); };
    serde_json::from_str(&text).unwrap_or_default()
}

fn backup_files(root: &Path) -> Result<Vec<PathBuf>, String> {
    let mut files: Vec<PathBuf> = fs::read_dir(root).map_err(|e| e.to_string())?
        .filter_map(Result::ok)
        .map(|entry| entry.path())
        .filter(|path| {
            path.is_file()
                && path.extension().and_then(|x| x.to_str()).map(|x| x.eq_ignore_ascii_case("sqlite3")).unwrap_or(false)
                && path.file_name().and_then(|x| x.to_str()).map(|x| x.starts_with("budget_")).unwrap_or(false)
        })
        .collect();
    files.sort_by(|a, b| b.file_name().cmp(&a.file_name()));
    Ok(files)
}

fn prune_backups(root: &Path, catalog: &mut BTreeMap<String, BackupMeta>) -> Result<(), String> {
    let files = backup_files(root)?;
    for path in files.iter().skip(BACKUP_KEEP) {
        fs::remove_file(path).map_err(|e| e.to_string())?;
        if let Some(name) = path.file_name().and_then(|x| x.to_str()) {
            catalog.remove(name);
        }
    }
    catalog.retain(|name, _| root.join(name).is_file());
    Ok(())
}

fn replace_file_cross_platform(tmp: &Path, target: &Path) -> Result<(), String> {
    if !target.exists() {
        return fs::rename(tmp, target).map_err(|e| e.to_string());
    }
    let old = target.with_file_name(format!(
        ".{}.old-{}-{}",
        target.file_name().and_then(|x| x.to_str()).unwrap_or("budget"),
        std::process::id(),
        Utc::now().timestamp_millis()
    ));
    fs::rename(target, &old).map_err(|e| e.to_string())?;
    match fs::rename(tmp, target) {
        Ok(()) => {
            let _ = fs::remove_file(&old);
            Ok(())
        }
        Err(error) => {
            let _ = fs::rename(&old, target);
            Err(error.to_string())
        }
    }
}

fn write_bytes_atomic(path: &Path, bytes: &[u8]) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let tmp = path.with_file_name(format!(
        ".{}.tmp-{}-{}",
        path.file_name().and_then(|x| x.to_str()).unwrap_or("budget"),
        std::process::id(),
        Utc::now().timestamp_millis()
    ));
    let mut file = OpenOptions::new().create_new(true).write(true).open(&tmp).map_err(|e| e.to_string())?;
    let result = (|| -> Result<(), String> {
        file.write_all(bytes).map_err(|e| e.to_string())?;
        file.sync_all().map_err(|e| e.to_string())?;
        drop(file);
        replace_file_cross_platform(&tmp, path)
    })();
    if result.is_err() { let _ = fs::remove_file(&tmp); }
    result
}

fn write_catalog(catalog: &BTreeMap<String, BackupMeta>) -> Result<(), String> {
    let data = serde_json::to_vec_pretty(catalog).map_err(|e| e.to_string())?;
    write_bytes_atomic(&meta_path()?, &data)
}

fn copy_verified(source: &Path, target: &Path) -> Result<(), String> {
    if has_active_wal(source) {
        return Err(format!("Нельзя копировать SQLite с активным WAL: {}", source.display()));
    }
    validate_database_path(source)?;
    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::copy(source, target).map_err(|e| e.to_string())?;
    if let Err(error) = validate_database_path(target) {
        let _ = fs::remove_file(target);
        return Err(format!("Созданная копия SQLite не прошла повторную проверку: {error}"));
    }
    Ok(())
}

pub fn create_backup(reason: &str) -> Result<Option<PendingBackup>, String> {
    let source = database_path()?;
    if !source.is_file() { return Ok(None); }
    checkpoint(&source)?;
    validate_database_path(&source)?;

    let root = backup_root()?;
    let stamp = file_stamp();
    let mut name = format!("budget_{stamp}.sqlite3");
    let mut index = 1usize;
    while root.join(&name).exists() {
        name = format!("budget_{stamp}_{index}.sqlite3");
        index += 1;
    }
    let path = root.join(&name);
    copy_verified(&source, &path)?;
    Ok(Some(PendingBackup {
        path,
        name,
        meta: BackupMeta { reason: reason.to_string(), created_at: now_iso() },
    }))
}

pub fn finalize_backup(pending: Option<PendingBackup>) -> Result<(), String> {
    let Some(pending) = pending else { return Ok(()); };
    let root = backup_root()?;
    let mut catalog = read_catalog();
    catalog.insert(pending.name, pending.meta);
    prune_backups(&root, &mut catalog)?;
    write_catalog(&catalog)
}

pub fn discard_backup(pending: Option<PendingBackup>) {
    if let Some(pending) = pending {
        if let Err(error) = fs::remove_file(&pending.path) {
            if error.kind() != std::io::ErrorKind::NotFound {
                eprintln!("[Budget] failed to discard unused backup {}: {error}", pending.path.display());
            }
        }
    }
}

fn latest_valid_backup() -> Result<Option<PathBuf>, String> {
    let root = backup_root()?;
    for path in backup_files(&root)? {
        if !has_active_wal(&path) && validate_database_path(&path).is_ok() {
            return Ok(Some(path));
        }
    }
    Ok(None)
}

fn replace_live_from(source: &Path) -> Result<(), String> {
    let target = database_path()?;
    let tmp = target.with_file_name(format!("{}.restore-{}.tmp", DB_FILENAME, Utc::now().timestamp_millis()));
    copy_verified(source, &tmp)?;
    let old = target.with_file_name(format!("{}.rollback-{}", DB_FILENAME, Utc::now().timestamp_millis()));
    if target.exists() { fs::rename(&target, &old).map_err(|e| e.to_string())?; }
    match fs::rename(&tmp, &target) {
        Ok(()) => {
            if let Err(error) = validate_database_path(&target) {
                let _ = fs::remove_file(&target);
                if old.exists() { let _ = fs::rename(&old, &target); }
                return Err(format!("Восстановленная база не прошла проверку: {error}"));
            }
            let _ = fs::remove_file(&old);
            Ok(())
        }
        Err(error) => {
            if old.exists() { let _ = fs::rename(&old, &target); }
            let _ = fs::remove_file(&tmp);
            Err(error.to_string())
        }
    }
}

fn ensure_indexes() -> Result<(), String> {
    let db = open_rw()?;
    db.execute_batch("CREATE INDEX IF NOT EXISTS idx_transactions_category_date ON transactions(category_id, occurred_on DESC, id DESC); PRAGMA optimize;").map_err(|e| e.to_string())?;
    Ok(())
}

pub fn ensure_database() -> Result<(), String> {
    preflight_storage_writable()?;
    let live = database_path()?;
    if live.is_file() && validate_database_path(&live).is_ok() {
        checkpoint(&live)?;
        enforce_delete_journal_mode(&live)?;
        ensure_indexes()?;
        validate_database_path(&live)?;
        return Ok(());
    }

    if live.is_file() {
        let recovery = backup_root()?.join("recovery");
        fs::create_dir_all(&recovery).map_err(|e| e.to_string())?;
        let _ = fs::copy(&live, recovery.join(format!("budget_corrupt_{}.sqlite3", file_stamp())));
    }

    if let Some(backup) = latest_valid_backup()? {
        replace_live_from(&backup)?;
        checkpoint(&live)?;
        enforce_delete_journal_mode(&live)?;
        ensure_indexes()?;
        validate_database_path(&live)?;
        return Ok(());
    }
    if let Some(seed) = seed_database_path() {
        replace_live_from(&seed)?;
        checkpoint(&live)?;
        enforce_delete_journal_mode(&live)?;
        ensure_indexes()?;
        validate_database_path(&live)?;
        return Ok(());
    }
    Err("Не найдена рабочая, резервная или seed-база Бюджета.".into())
}

pub fn open_readonly() -> Result<Connection, String> {
    let db = Connection::open_with_flags(database_path()?, OpenFlags::SQLITE_OPEN_READ_ONLY).map_err(|e| e.to_string())?;
    db.execute_batch("PRAGMA busy_timeout=5000;").map_err(|e| e.to_string())?;
    Ok(db)
}

pub fn open_rw() -> Result<Connection, String> {
    let db = Connection::open(database_path()?).map_err(|e| e.to_string())?;
    db.execute_batch("PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;").map_err(|e| e.to_string())?;
    Ok(db)
}
