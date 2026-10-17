'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync(path.join(__dirname,'../app/shared/budget-startup-preview.js'),'utf8');
function harness(){
  const root={dataset:{budgetStartup:'loading'}};
  const calls=[];let nextId=1;
  const timers=new Map();
  const ctx={document:{documentElement:root, getElementById:()=>({textContent:''}),dispatchEvent:()=>{}},
    console:{error:()=>{}},
    CustomEvent:class CustomEvent {constructor(type){this.type=type;}},
    window:{
      setTimeout:(fn,ms)=>{const id=nextId++;timers.set(id,{fn,ms});calls.push({id,ms});return id;},
      clearTimeout:id=>timers.delete(id),
      requestAnimationFrame:fn=>fn()
    }};
  vm.runInNewContext(source,ctx,{filename:'budget-startup-preview.js'});
  const fire=ms=>{const entry=[...timers].find(([,t])=>t.ms===ms);assert(entry,`Expected scheduled delay ${ms}`);timers.delete(entry[0]);entry[1].fn();};
  return {root,ctx,calls,fire,timers};
}
const ok=harness();
assert.strictEqual(ok.root.dataset.budgetStartup,'loading');
ok.ctx.window.__budgetStartup.ready();
assert.strictEqual(ok.root.dataset.budgetStartup,'loading');
ok.fire(980);
assert.strictEqual(ok.root.dataset.budgetStartup,'revealing');
ok.fire(630);
assert.strictEqual(ok.root.dataset.budgetStartup,'complete');
assert.deepStrictEqual(ok.calls.map(x=>x.ms),[8000,980,630]);
const failure=harness();
failure.ctx.window.__budgetStartup.fail(new Error('test'));
assert.strictEqual(failure.root.dataset.budgetStartup,'failed');
assert.strictEqual(failure.timers.size,0);
console.log('BUDGET v0.2 STARTUP TIMING: PASS (980ms hold + 630ms reveal completion; failure recovery)');
