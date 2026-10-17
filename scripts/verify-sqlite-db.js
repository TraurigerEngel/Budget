'use strict';
const fs=require('fs');
const {DatabaseSync}=require('node:sqlite');
const file=process.argv[2];
if(!file||!fs.existsSync(file)){console.error('SQLite file not found.');process.exit(2)}
const requiredColumns={
  users:['id','name','archived'],
  accounts:['id','name','opening_balance_cents','archived','user_id'],
  categories:['id','name','kind','archived'],
  transactions:['id','occurred_on','kind','amount_cents','account_id','category_id','note','created_at'],
  transfers:['id','occurred_on','amount_cents','from_account_id','to_account_id','note','created_at'],
  monthly_budgets:['month','user_id','category_id','amount_cents'],
  settings:['key','value']
};
let db;
try{
  db=new DatabaseSync(file,{readOnly:true});
  const x=db.prepare('PRAGMA integrity_check').get();
  if(!x||Object.values(x)[0]!=='ok')throw new Error('PRAGMA integrity_check failed.');
  const userVersion=Number(Object.values(db.prepare('PRAGMA user_version').get())[0]);
  if(userVersion!==7)throw new Error(`Unsupported SQLite user_version: ${userVersion} (expected 7).`);
  for(const [table,columns] of Object.entries(requiredColumns)){
    if(!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table))throw new Error(`Missing required table: ${table}`);
    const actual=new Set(db.prepare(`PRAGMA table_info(${table})`).all().map(row=>row.name));
    for(const column of columns)if(!actual.has(column))throw new Error(`Missing required column: ${table}.${column}`);
  }
  const fk=db.prepare('PRAGMA foreign_key_check').all();
  if(fk.length)throw new Error(`PRAGMA foreign_key_check failed (${fk.length} row(s)).`);
  console.log('Budget SQLite verification OK');
  console.log('- integrity/schema/user_version/foreign keys OK');
}catch(e){console.error(e.message||String(e));process.exitCode=1}finally{try{db?.close()}catch{}}
