(() => {
  'use strict';
  function createDialog(options={}) {
    const layer=document.createElement('div');
    layer.className='budget-dialog-layer';

    const dialog=document.createElement('section');
    dialog.className='budget-dialog';
    dialog.setAttribute('role','dialog');
    dialog.setAttribute('aria-modal','true');

    const head=document.createElement('div');
    head.className='budget-dialog-head';
    const title=document.createElement('div');
    title.className='budget-dialog-title';
    title.textContent=options.title||'Бюджет';
    head.append(title);

    const body=document.createElement('div');
    body.className='budget-dialog-body';
    body.textContent=String(options.message??'');

    const actions=document.createElement('div');
    actions.className=`budget-dialog-actions ${options.confirm?'confirm':'alert'}`;

    const cancel=options.confirm?document.createElement('button'):null;
    if(cancel){
      cancel.type='button';
      cancel.className='budget-dialog-btn';
      cancel.textContent=options.cancelText||'Отмена';
      actions.append(cancel);
    }

    const ok=document.createElement('button');
    ok.type='button';
    const actionType=options.type==='danger'?'danger':options.type==='warning'?'warning':'primary';
    ok.className=`budget-dialog-btn ${actionType}`;
    ok.textContent=options.confirm?(options.okText||'Подтвердить'):(options.okText||'OK');
    actions.append(ok);

    dialog.append(head,body,actions);
    layer.append(dialog);
    document.body.append(layer);

    let done=false,resolvePromise,keyHandler=null;
    const promise=new Promise(r=>resolvePromise=r);
    const finish=value=>{
      if(done)return;
      done=true;
      if(keyHandler)document.removeEventListener('keydown',keyHandler,true);
      layer.classList.remove('open');
      setTimeout(()=>layer.remove(),170);
      resolvePromise(value);
    };

    layer.addEventListener('click',e=>{if(e.target===layer)finish(options.confirm?false:undefined)});
    keyHandler=e=>{if(e.key==='Escape'){e.preventDefault();finish(options.confirm?false:undefined);}};
    document.addEventListener('keydown',keyHandler,true);
    ok.addEventListener('click',()=>finish(true));
    cancel?.addEventListener('click',()=>finish(false));

    requestAnimationFrame(()=>{
      layer.classList.add('open');
      ok.focus({preventScroll:true});
    });
    return promise;
  }
  window.BudgetDialog={
    alert:(message,options={})=>createDialog({...options,confirm:false,message}),
    confirm:(message,options={})=>createDialog({...options,confirm:true,message})
  };
})();
