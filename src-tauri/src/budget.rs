use crate::storage::{create_backup, discard_backup, finalize_backup, now_iso, open_readonly, open_rw};
use chrono::{Datelike, Duration, Local, NaiveDate};
use rusqlite::{params, params_from_iter, types::Value as SqlValue, Connection, OptionalExtension, TransactionBehavior};
use serde_json::{json, Value};
use std::sync::Mutex;

// budget-cleanup-pass4-mutation-race-hardening
static MUTATION_LOCK: Mutex<()> = Mutex::new(());

#[derive(Clone)]
struct PeriodBounds { key: String, mode: String, start: String, end: String }

fn valid_date(raw: &str) -> bool { NaiveDate::parse_from_str(raw, "%Y-%m-%d").is_ok() }
fn valid_month(raw: &str) -> bool {
    if raw.len()!=7 { return false; }
    let test = format!("{}-01", raw);
    NaiveDate::parse_from_str(&test, "%Y-%m-%d").is_ok()
}
fn month_bounds(month: &str) -> Result<(String,String),String> {
    if !valid_month(month) { return Err("Некорректный месяц.".into()); }
    let first = NaiveDate::parse_from_str(&format!("{}-01",month), "%Y-%m-%d").map_err(|e|e.to_string())?;
    let (y,m) = if first.month()==12 {(first.year()+1,1)} else {(first.year(),first.month()+1)};
    let next = NaiveDate::from_ymd_opt(y,m,1).ok_or("Некорректный месяц")?;
    Ok((first.format("%Y-%m-%d").to_string(), next.format("%Y-%m-%d").to_string()))
}
fn period_bounds(raw: &str) -> Result<PeriodBounds,String> {
    let s=raw.trim();
    if let Some(month)=s.strip_prefix("m:") {
        if valid_month(month) { let (start,end)=month_bounds(month)?; return Ok(PeriodBounds{key:format!("m:{month}"),mode:"month".into(),start,end}); }
    }
    if valid_month(s) { let (start,end)=month_bounds(s)?; return Ok(PeriodBounds{key:format!("m:{s}"),mode:"month".into(),start,end}); }
    if let Some(day)=s.strip_prefix("d:") {
        if valid_date(day) { let d=NaiveDate::parse_from_str(day,"%Y-%m-%d").unwrap(); return Ok(PeriodBounds{key:format!("d:{day}"),mode:"day".into(),start:day.into(),end:(d+Duration::days(1)).format("%Y-%m-%d").to_string()}); }
    }
    if valid_date(s) { let d=NaiveDate::parse_from_str(s,"%Y-%m-%d").unwrap(); return Ok(PeriodBounds{key:format!("d:{s}"),mode:"day".into(),start:s.into(),end:(d+Duration::days(1)).format("%Y-%m-%d").to_string()}); }
    if let Some(range)=s.strip_prefix("r:") {
        let p:Vec<&str>=range.split('/').collect();
        if p.len()==2 && valid_date(p[0]) && valid_date(p[1]) && p[0]<=p[1] { let d=NaiveDate::parse_from_str(p[1],"%Y-%m-%d").unwrap(); return Ok(PeriodBounds{key:format!("r:{}/{}",p[0],p[1]),mode:"range".into(),start:p[0].into(),end:(d+Duration::days(1)).format("%Y-%m-%d").to_string()}); }
    }
    let now=Local::now(); let month=format!("{:04}-{:02}",now.year(),now.month()); let (start,end)=month_bounds(&month)?;
    Ok(PeriodBounds{key:format!("m:{month}"),mode:"month".into(),start,end})
}
fn category_ids(v: &[i64]) -> Vec<i64> { let mut a:Vec<i64>=v.iter().copied().filter(|x|*x>0).collect();a.sort_unstable();a.dedup();a }
fn require_user(db:&Connection,user_id:i64)->Result<(i64,String),String>{
    if user_id<=0{return Err("Некорректный пользователь.".into());}
    db.query_row("SELECT id,name FROM users WHERE id=?1 AND archived=0",params![user_id],|r|Ok((r.get(0)?,r.get(1)?))).optional().map_err(|e|e.to_string())?.ok_or_else(|| "Пользователь не найден.".to_string())
}
fn map_rows(db:&Connection,sql:&str,args:Vec<SqlValue>,mapper:impl Fn(&rusqlite::Row<'_>)->rusqlite::Result<Value>)->Result<Vec<Value>,String>{
    let mut stmt=db.prepare(sql).map_err(|e|e.to_string())?;
    let rows=stmt.query_map(params_from_iter(args.iter()),mapper).map_err(|e|e.to_string())?;
    let mut out=Vec::new();for x in rows{out.push(x.map_err(|e|e.to_string())?);}Ok(out)
}
fn args_with_categories(prefix: Vec<SqlValue>, ids:&[i64])->Vec<SqlValue>{let mut a=prefix;for id in ids{a.push(SqlValue::Integer(*id));}a}

pub fn bootstrap()->Result<String,String>{
    let db=open_readonly()?;
    let users=map_rows(&db,"SELECT id,name,archived FROM users ORDER BY archived,id",vec![],|r|Ok(json!({"id":r.get::<_,i64>(0)?,"name":r.get::<_,String>(1)?,"archived":r.get::<_,i64>(2)?})))?;
    let accounts=map_rows(&db,"SELECT id,name,opening_balance_cents,archived,user_id FROM accounts ORDER BY archived,id",vec![],|r|Ok(json!({"id":r.get::<_,i64>(0)?,"name":r.get::<_,String>(1)?,"opening_balance_cents":r.get::<_,i64>(2)?,"archived":r.get::<_,i64>(3)?,"user_id":r.get::<_,i64>(4)?})))?;
    let categories=map_rows(&db,"SELECT id,name,kind,archived FROM categories ORDER BY archived,id",vec![],|r|Ok(json!({"id":r.get::<_,i64>(0)?,"name":r.get::<_,String>(1)?,"kind":r.get::<_,String>(2)?,"archived":r.get::<_,i64>(3)?})))?;
    let mut settings=serde_json::Map::new();{let mut stmt=db.prepare("SELECT key,value FROM settings").map_err(|e|e.to_string())?;let rows=stmt.query_map([],|r|Ok((r.get::<_,String>(0)?,r.get::<_,String>(1)?))).map_err(|e|e.to_string())?;for x in rows{let(k,v)=x.map_err(|e|e.to_string())?;settings.insert(k,Value::String(v));}}
    serde_json::to_string(&json!({"users":users,"accounts":accounts,"categories":categories,"settings":settings})).map_err(|e|e.to_string())
}

pub fn summary(period:&str,user_id:i64,category_ids_raw:&[i64])->Result<String,String>{
    let db=open_readonly()?;let (uid,_)=require_user(&db,user_id)?;let b=period_bounds(period)?;let ids=category_ids(category_ids_raw);
    let cat=if ids.is_empty(){String::new()}else{format!(" AND t.category_id IN ({})",vec!["?";ids.len()].join(","))};
    let sql=format!("SELECT COALESCE(SUM(CASE WHEN t.kind='income' AND t.occurred_on>=? AND t.occurred_on<? AND a.user_id=?{cat} THEN t.amount_cents ELSE 0 END),0), COALESCE(SUM(CASE WHEN t.kind='expense' AND t.occurred_on>=? AND t.occurred_on<? AND a.user_id=?{cat} THEN t.amount_cents ELSE 0 END),0) FROM transactions t JOIN accounts a ON a.id=t.account_id");
    let mut args=vec![SqlValue::Text(b.start.clone()),SqlValue::Text(b.end.clone()),SqlValue::Integer(uid)];for id in &ids{args.push(SqlValue::Integer(*id));}args.push(SqlValue::Text(b.start.clone()));args.push(SqlValue::Text(b.end.clone()));args.push(SqlValue::Integer(uid));for id in &ids{args.push(SqlValue::Integer(*id));}
    let (income,expense):(i64,i64)=db.query_row(&sql,params_from_iter(args.iter()),|r|Ok((r.get(0)?,r.get(1)?))).map_err(|e|e.to_string())?;
    let balance:i64=db.query_row("SELECT COALESCE((SELECT SUM(opening_balance_cents) FROM accounts WHERE user_id=?1),0)+COALESCE((SELECT SUM(CASE WHEN t.kind='income' THEN t.amount_cents ELSE -t.amount_cents END) FROM transactions t JOIN accounts a ON a.id=t.account_id WHERE a.user_id=?1),0)+COALESCE((SELECT SUM(tr.amount_cents) FROM transfers tr JOIN accounts a ON a.id=tr.to_account_id WHERE a.user_id=?1),0)-COALESCE((SELECT SUM(tr.amount_cents) FROM transfers tr JOIN accounts a ON a.id=tr.from_account_id WHERE a.user_id=?1),0)",params![uid],|r|r.get(0)).map_err(|e|e.to_string())?;
    serde_json::to_string(&json!({"period":b.key,"mode":b.mode,"start":b.start,"end":b.end,"income":income,"expense":expense,"balance":balance,"userId":uid})).map_err(|e|e.to_string())
}

pub fn transactions(limit:i64,user_id:i64,period:&str,category_ids_raw:&[i64])->Result<String,String>{
    let db=open_readonly()?;let(uid,_)=require_user(&db,user_id)?;let b=period_bounds(period)?;let ids=category_ids(category_ids_raw);let cat=if ids.is_empty(){String::new()}else{format!(" AND t.category_id IN ({})",vec!["?";ids.len()].join(","))};
    let mut sql=format!("SELECT * FROM (SELECT t.id,t.occurred_on,t.kind,t.amount_cents,t.note,a.name account,c.name category,NULL transfer_to,NULL transfer_from FROM transactions t JOIN accounts a ON a.id=t.account_id JOIN categories c ON c.id=t.category_id WHERE a.user_id=? AND t.occurred_on>=? AND t.occurred_on<?{cat} UNION ALL SELECT -tr.id AS id,tr.occurred_on,'transfer' AS kind,tr.amount_cents,tr.note,fa.name account,'Перевод' category,ta.name transfer_to,fa.name transfer_from FROM transfers tr JOIN accounts fa ON fa.id=tr.from_account_id JOIN accounts ta ON ta.id=tr.to_account_id WHERE (fa.user_id=? OR ta.user_id=?) AND tr.occurred_on>=? AND tr.occurred_on<?) ORDER BY occurred_on DESC,ABS(id) DESC");
    let mut args=vec![SqlValue::Integer(uid),SqlValue::Text(b.start.clone()),SqlValue::Text(b.end.clone())];for id in &ids{args.push(SqlValue::Integer(*id));}args.extend([SqlValue::Integer(uid),SqlValue::Integer(uid),SqlValue::Text(b.start),SqlValue::Text(b.end)]);
    if limit>0{sql.push_str(" LIMIT ?");args.push(SqlValue::Integer(limit.clamp(1,500)));}
    let rows=map_rows(&db,&sql,args,|r|Ok(json!({"id":r.get::<_,i64>(0)?,"occurred_on":r.get::<_,String>(1)?,"kind":r.get::<_,String>(2)?,"amount_cents":r.get::<_,i64>(3)?,"note":r.get::<_,String>(4)?,"account":r.get::<_,String>(5)?,"category":r.get::<_,String>(6)?,"transfer_to":r.get::<_,Option<String>>(7)?,"transfer_from":r.get::<_,Option<String>>(8)?})))?;
    serde_json::to_string(&rows).map_err(|e|e.to_string())
}

pub fn account_stats(user_id:i64)->Result<String,String>{let db=open_readonly()?;let(uid,_)=require_user(&db,user_id)?;let rows=map_rows(&db,"SELECT a.id,a.name,a.opening_balance_cents,a.archived,a.user_id,a.opening_balance_cents+COALESCE((SELECT SUM(CASE WHEN t.kind='income' THEN t.amount_cents ELSE -t.amount_cents END) FROM transactions t WHERE t.account_id=a.id),0)+COALESCE((SELECT SUM(tr.amount_cents) FROM transfers tr WHERE tr.to_account_id=a.id),0)-COALESCE((SELECT SUM(tr.amount_cents) FROM transfers tr WHERE tr.from_account_id=a.id),0) balance_cents FROM accounts a WHERE a.user_id=? ORDER BY a.archived,a.id",vec![SqlValue::Integer(uid)],|r|Ok(json!({"id":r.get::<_,i64>(0)?,"name":r.get::<_,String>(1)?,"opening_balance_cents":r.get::<_,i64>(2)?,"archived":r.get::<_,i64>(3)?,"user_id":r.get::<_,i64>(4)?,"balance_cents":r.get::<_,i64>(5)?})))?;serde_json::to_string(&rows).map_err(|e|e.to_string())}
pub fn category_stats(user_id:i64)->Result<String,String>{let db=open_readonly()?;let(uid,_)=require_user(&db,user_id)?;let rows=map_rows(&db,"SELECT c.id,c.name,c.kind,c.archived,COALESCE(SUM(CASE WHEN a.user_id=? THEN t.amount_cents ELSE 0 END),0) total_cents FROM categories c LEFT JOIN transactions t ON t.category_id=c.id LEFT JOIN accounts a ON a.id=t.account_id GROUP BY c.id ORDER BY c.archived,c.kind,c.name",vec![SqlValue::Integer(uid)],|r|Ok(json!({"id":r.get::<_,i64>(0)?,"name":r.get::<_,String>(1)?,"kind":r.get::<_,String>(2)?,"archived":r.get::<_,i64>(3)?,"total_cents":r.get::<_,i64>(4)?})))?;serde_json::to_string(&rows).map_err(|e|e.to_string())}

pub fn monthly_category_stats(period:&str,user_id:i64,category_ids_raw:&[i64])->Result<String,String>{
    let db=open_readonly()?;let(uid,_)=require_user(&db,user_id)?;let b=period_bounds(period)?;let ids=category_ids(category_ids_raw);let scope=if ids.is_empty(){String::new()}else{format!(" WHERE c.id IN ({})",vec!["?";ids.len()].join(","))};
    let sql=format!("SELECT c.id,c.name,c.kind,COALESCE(SUM(CASE WHEN t.kind=c.kind AND t.occurred_on>=? AND t.occurred_on<? AND a.user_id=? THEN t.amount_cents ELSE 0 END),0) total_cents FROM categories c LEFT JOIN transactions t ON t.category_id=c.id LEFT JOIN accounts a ON a.id=t.account_id{scope} GROUP BY c.id ORDER BY c.kind,c.name");
    let args=args_with_categories(vec![SqlValue::Text(b.start.clone()),SqlValue::Text(b.end.clone()),SqlValue::Integer(uid)],&ids);let rows=map_rows(&db,&sql,args,|r|Ok(json!({"id":r.get::<_,i64>(0)?,"name":r.get::<_,String>(1)?,"kind":r.get::<_,String>(2)?,"total_cents":r.get::<_,i64>(3)?})))?;serde_json::to_string(&json!({"period":b.key,"mode":b.mode,"start":b.start,"end":b.end,"rows":rows})).map_err(|e|e.to_string())
}

pub fn monthly_account_stats(period:&str,user_id:i64,category_ids_raw:&[i64])->Result<String,String>{
    let db=open_readonly()?;let(uid,_)=require_user(&db,user_id)?;let b=period_bounds(period)?;let ids=category_ids(category_ids_raw);let cat=if ids.is_empty(){String::new()}else{format!(" AND t.category_id IN ({})",vec!["?";ids.len()].join(","))};
    let transfer_in=if ids.is_empty(){"COALESCE((SELECT SUM(tr.amount_cents) FROM transfers tr WHERE tr.to_account_id=a.id AND tr.occurred_on>=? AND tr.occurred_on<?),0)"}else{"0"};let transfer_out=if ids.is_empty(){"COALESCE((SELECT SUM(tr.amount_cents) FROM transfers tr WHERE tr.from_account_id=a.id AND tr.occurred_on>=? AND tr.occurred_on<?),0)"}else{"0"};
    let sql=format!("SELECT a.id,a.name,a.archived,COALESCE((SELECT SUM(t.amount_cents) FROM transactions t WHERE t.account_id=a.id AND t.kind='income' AND t.occurred_on>=? AND t.occurred_on<?{cat}),0) income_cents,COALESCE((SELECT SUM(t.amount_cents) FROM transactions t WHERE t.account_id=a.id AND t.kind='expense' AND t.occurred_on>=? AND t.occurred_on<?{cat}),0) expense_cents,{transfer_in} transfer_in_cents,{transfer_out} transfer_out_cents FROM accounts a WHERE a.user_id=? ORDER BY a.archived,a.name");
    let mut args=vec![SqlValue::Text(b.start.clone()),SqlValue::Text(b.end.clone())];for id in &ids{args.push(SqlValue::Integer(*id));}args.push(SqlValue::Text(b.start.clone()));args.push(SqlValue::Text(b.end.clone()));for id in &ids{args.push(SqlValue::Integer(*id));}if ids.is_empty(){args.push(SqlValue::Text(b.start.clone()));args.push(SqlValue::Text(b.end.clone()));args.push(SqlValue::Text(b.start.clone()));args.push(SqlValue::Text(b.end.clone()));}args.push(SqlValue::Integer(uid));
    let rows=map_rows(&db,&sql,args,|r|Ok(json!({"id":r.get::<_,i64>(0)?,"name":r.get::<_,String>(1)?,"archived":r.get::<_,i64>(2)?,"income_cents":r.get::<_,i64>(3)?,"expense_cents":r.get::<_,i64>(4)?,"transfer_in_cents":r.get::<_,i64>(5)?,"transfer_out_cents":r.get::<_,i64>(6)?})))?;serde_json::to_string(&json!({"period":b.key,"mode":b.mode,"start":b.start,"end":b.end,"rows":rows})).map_err(|e|e.to_string())
}

fn mutation<T>(reason:&str,f:impl FnOnce(&rusqlite::Transaction<'_>)->Result<T,String>)->Result<T,String>{let _write_guard=MUTATION_LOCK.lock().map_err(|_|"Не удалось получить блокировку записи Бюджета.".to_string())?;let pending=create_backup(reason)?;let mut db=match open_rw(){Ok(db)=>db,Err(error)=>{discard_backup(pending);return Err(error);}};let tx=match db.transaction_with_behavior(TransactionBehavior::Immediate){Ok(tx)=>tx,Err(error)=>{discard_backup(pending);return Err(error.to_string());}};let value=match f(&tx){Ok(value)=>value,Err(error)=>{drop(tx);discard_backup(pending);return Err(error);}};if let Err(error)=tx.commit(){eprintln!("[Budget] commit failed; provisional backup preserved for recovery: {error}");return Err(error.to_string());}if let Err(error)=finalize_backup(pending){eprintln!("[Budget] backup finalization warning after committed mutation: {error}");}Ok(value)}
pub fn add_transaction(input:&Value)->Result<Value,String>{mutation("Добавлена операция",|db|{let uid=input.get("userId").and_then(Value::as_i64).ok_or("Некорректный пользователь.")?;require_user(db,uid)?;let date=input.get("occurredOn").and_then(Value::as_str).unwrap_or("");if !valid_date(date){return Err("Некорректная дата.".into());}let kind=input.get("kind").and_then(Value::as_str).unwrap_or("");if kind!="income"&&kind!="expense"{return Err("Некорректный тип операции.".into());}let amount=input.get("amountCents").and_then(Value::as_i64).unwrap_or(0);let account=input.get("accountId").and_then(Value::as_i64).unwrap_or(0);let category=input.get("categoryId").and_then(Value::as_i64).unwrap_or(0);if amount<=0||account<=0||category<=0{return Err("Некорректная сумма, счёт или категория.".into());}let cat_kind:Option<String>=db.query_row("SELECT kind FROM categories WHERE id=?1 AND archived=0",params![category],|r|r.get(0)).optional().map_err(|e|e.to_string())?;if cat_kind.as_deref()!=Some(kind){return Err("Категория не соответствует типу операции.".into());}let acc:Option<i64>=db.query_row("SELECT id FROM accounts WHERE id=?1 AND archived=0 AND user_id=?2",params![account,uid],|r|r.get(0)).optional().map_err(|e|e.to_string())?;if acc.is_none(){return Err("Счёт не найден у текущего пользователя.".into());}db.execute("INSERT INTO transactions(occurred_on,kind,amount_cents,account_id,category_id,note,created_at) VALUES(?1,?2,?3,?4,?5,?6,?7)",params![date,kind,amount,account,category,input.get("note").and_then(Value::as_str).unwrap_or("").trim(),now_iso()]).map_err(|e|e.to_string())?;Ok(json!({"ok":true,"value":true}))})}
pub fn delete_transaction(id:i64,user_id:i64)->Result<Value,String>{mutation("Удалена операция",|db|{require_user(db,user_id)?;let n=db.execute("DELETE FROM transactions WHERE id=?1 AND account_id IN (SELECT id FROM accounts WHERE user_id=?2)",params![id,user_id]).map_err(|e|e.to_string())?;if n!=1{return Err("Операция не найдена у текущего пользователя.".into());}Ok(json!({"ok":true,"value":true}))})}
pub fn add_account(name:&str,opening:i64,user_id:i64)->Result<Value,String>{mutation("Добавлен счёт",|db|{require_user(db,user_id)?;let n=name.trim();if n.is_empty()||n.chars().count()>80{return Err("Некорректное название счёта.".into());}db.execute("INSERT INTO accounts(name,opening_balance_cents,user_id) VALUES(?1,?2,?3)",params![n,opening,user_id]).map_err(|e|e.to_string())?;Ok(json!({"ok":true,"value":true}))})}
pub fn archive_account(id:i64,user_id:i64)->Result<Value,String>{if id<=0||user_id<=0{return Err("Некорректный счёт или пользователь.".into());}mutation("Счёт отправлен в архив",|db|{require_user(db,user_id)?;let target:Option<i64>=db.query_row("SELECT id FROM accounts WHERE id=?1 AND user_id=?2 AND archived=0",params![id,user_id],|r|r.get(0)).optional().map_err(|e|e.to_string())?;if target.is_none(){return Err("Активный счёт не найден у текущего пользователя.".into());}let count:i64=db.query_row("SELECT COUNT(*) FROM accounts WHERE archived=0 AND user_id=?1",params![user_id],|r|r.get(0)).map_err(|e|e.to_string())?;if count<=1{return Err("Нельзя архивировать последний активный счёт пользователя.".into());}let changed=db.execute("UPDATE accounts SET archived=1 WHERE id=?1 AND user_id=?2 AND archived=0",params![id,user_id]).map_err(|e|e.to_string())?;if changed!=1{return Err("Не удалось архивировать счёт.".into());}Ok(json!({"ok":true,"value":true}))})}
pub fn rename_account(id:i64,name:&str,user_id:i64)->Result<Value,String>{mutation("Переименован счёт",|db|{require_user(db,user_id)?;let n=name.trim();if n.is_empty()||n.chars().count()>80{return Err("Некорректное название счёта.".into());}let found:Option<i64>=db.query_row("SELECT id FROM accounts WHERE id=?1 AND user_id=?2",params![id,user_id],|r|r.get(0)).optional().map_err(|e|e.to_string())?;if found.is_none(){return Err("Счёт не найден у текущего пользователя.".into());}db.execute("UPDATE accounts SET name=?1 WHERE id=?2",params![n,id]).map_err(|e|e.to_string())?;Ok(json!({"ok":true,"value":true}))})}
pub fn add_category(name:&str,kind:&str)->Result<Value,String>{mutation("Добавлена категория",|db|{let n=name.trim();if n.is_empty()||n.chars().count()>80{return Err("Некорректное название категории.".into());}if kind!="income"&&kind!="expense"{return Err("Некорректный тип категории.".into());}let existing:Option<i64>=db.query_row("SELECT id FROM categories WHERE lower(name)=lower(?1)",params![n],|r|r.get(0)).optional().map_err(|e|e.to_string())?;if existing.is_some(){return Err("Категория с таким названием уже существует.".into());}db.execute("INSERT INTO categories(name,kind,archived) VALUES(?1,?2,0)",params![n,kind]).map_err(|e|e.to_string())?;Ok(json!({"ok":true,"value":true}))})}
pub fn delete_category(id:i64)->Result<Value,String>{mutation("Удалена категория",|db|{let found:Option<String>=db.query_row("SELECT name FROM categories WHERE id=?1",params![id],|r|r.get(0)).optional().map_err(|e|e.to_string())?;if found.is_none(){return Err("Категория не найдена.".into());}let tx:i64=db.query_row("SELECT COUNT(*) FROM transactions WHERE category_id=?1",params![id],|r|r.get(0)).map_err(|e|e.to_string())?;let budgets:i64=db.query_row("SELECT COUNT(*) FROM monthly_budgets WHERE category_id=?1",params![id],|r|r.get(0)).map_err(|e|e.to_string())?;if tx>0||budgets>0{return Err("Нельзя удалить категорию, которая используется в операциях или лимитах.".into());}db.execute("DELETE FROM categories WHERE id=?1",params![id]).map_err(|e|e.to_string())?;Ok(json!({"ok":true,"value":true}))})}
