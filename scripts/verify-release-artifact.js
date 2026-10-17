'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const {DatabaseSync}=require('node:sqlite');
const target=process.argv[2]?path.resolve(process.argv[2]):null;
if(!target||!fs.existsSync(target))throw new Error('Usage: node scripts/verify-release-artifact.js <portable-directory>');
const allowedFiles=new Set(['Budget.exe','data/budget.sqlite3','seed-data/budget.sqlite3']),allowedDirs=new Set(['data','seed-data']),seen=new Set();
function slash(x){return x.split(path.sep).join('/')}
function walk(d,r=''){for(const e of fs.readdirSync(d,{withFileTypes:true})){const a=path.join(d,e.name),rel=slash(path.join(r,e.name));if(e.isDirectory()){if(!allowedDirs.has(rel))throw new Error(`Unexpected directory: ${rel}`);walk(a,rel)}else if(e.isFile()){if(!allowedFiles.has(rel))throw new Error(`Unexpected file: ${rel}`);seen.add(rel)}else throw new Error(`Unexpected entry: ${rel}`)}}
walk(target);for(const x of allowedFiles)if(!seen.has(x))throw new Error(`Missing: ${x}`);
const requiredColumns={
  users:['id','name','archived'],accounts:['id','name','opening_balance_cents','archived','user_id'],categories:['id','name','kind','archived'],transactions:['id','occurred_on','kind','amount_cents','account_id','category_id','note','created_at'],transfers:['id','occurred_on','amount_cents','from_account_id','to_account_id','note','created_at'],monthly_budgets:['month','user_id','category_id','amount_cents'],settings:['key','value']
};
function verifyDb(rel){
  const db=new DatabaseSync(path.join(target,rel),{readOnly:true});
  try{
    if(Object.values(db.prepare('PRAGMA integrity_check').get())[0]!=='ok')throw new Error(`Integrity failed: ${rel}`);
    const userVersion=Number(Object.values(db.prepare('PRAGMA user_version').get())[0]);
    if(userVersion!==7)throw new Error(`Unexpected user_version ${userVersion}: ${rel}`);
    const journalMode=String(Object.values(db.prepare('PRAGMA journal_mode').get())[0]).toLowerCase();
    if(journalMode!=='delete')throw new Error(`Unexpected journal_mode ${journalMode}: ${rel}`);
    for(const [table,columns] of Object.entries(requiredColumns)){
      if(!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table))throw new Error(`Missing ${table}: ${rel}`);
      const actual=new Set(db.prepare(`PRAGMA table_info(${table})`).all().map(row=>row.name));
      for(const column of columns)if(!actual.has(column))throw new Error(`Missing ${table}.${column}: ${rel}`);
    }
    if(db.prepare('PRAGMA foreign_key_check').all().length)throw new Error(`Foreign-key violations: ${rel}`);
    if(!db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_transactions_category_date'").get())throw new Error(`Missing optimized Budget index: ${rel}`);
  }finally{db.close()}
}
verifyDb('data/budget.sqlite3');verifyDb('seed-data/budget.sqlite3');
const live=fs.readFileSync(path.join(target,'data/budget.sqlite3')),seed=fs.readFileSync(path.join(target,'seed-data/budget.sqlite3'));
if(!live.equals(seed))throw new Error('Release live/seed SQLite mismatch.');
const exe=fs.statSync(path.join(target,'Budget.exe')).size;if(exe<1024*1024)throw new Error('Budget.exe is unexpectedly small.');
console.log('Budget v0.2 Stable release artifact verification OK');
console.log(`- EXE: ${(exe/1024/1024).toFixed(2)} MB`);
console.log('- Exact portable allowlist OK (3 runtime files)');
console.log('- SQLite integrity/schema/user_version/foreign keys/journal_mode OK');
console.log(`- Canonical DB SHA-256: ${crypto.createHash('sha256').update(live).digest('hex').slice(0,12)}...`);
