let app=null;
let bootPromise=null;

const byId=id=>document.getElementById(id);

function showWorkspaceShell(){
  byId('onboarding')?.classList.add('hidden');
  byId('workspace')?.classList.remove('hidden');
}

function showBootError(error){
  console.error('Bunaa boot failed',error);
  const old=document.getElementById('bunaaBootError');
  old?.remove();
  const box=document.createElement('div');
  box.id='bunaaBootError';
  box.dir='rtl';
  box.style.cssText='position:fixed;inset:0;z-index:99999;background:#10131c;color:#fff;padding:28px;display:grid;place-content:center;font:15px/1.7 system-ui';
  const title=document.createElement('h2');
  title.textContent='تعذر تشغيل محرر بَنّاء';
  const message=document.createElement('p');
  message.textContent='تم فتح الواجهة، لكن إحدى وحدات المحرر فشلت في التحميل. شغّل المشروع بواسطة start-local.bat ثم أعد المحاولة.';
  const pre=document.createElement('pre');
  pre.style.cssText='max-width:min(900px,92vw);max-height:45vh;overflow:auto;background:#191d29;border:1px solid #34394a;border-radius:10px;padding:12px;color:#ffb8b8;white-space:pre-wrap';
  pre.textContent=error?.stack||String(error);
  const close=document.createElement('button');
  close.textContent='إغلاق';
  close.style.cssText='margin-top:14px;width:max-content;padding:9px 16px;border:0;border-radius:9px;background:#5b5ce2;color:#fff;cursor:pointer';
  close.onclick=()=>box.remove();
  box.append(title,message,pre,close);
  document.body.appendChild(box);
}

async function loadApp(){
  if(app)return app;
  if(!bootPromise){
    bootPromise=import('./app/app.js').then(({App})=>{
      app=new App();
      app.start();
      return app;
    }).catch(error=>{
      bootPromise=null;
      throw error;
    });
  }
  return bootPromise;
}

async function openWorkspace(mode='normal'){
  showWorkspaceShell();
  try{
    const instance=await loadApp();
    instance.showWorkspace(mode);
  }catch(error){
    showBootError(error);
  }
}

document.addEventListener('click',event=>{
  const modeButton=event.target.closest?.('.mode-card');
  if(modeButton){
    event.preventDefault();
    openWorkspace(modeButton.dataset.mode||'normal');
    return;
  }
  if(event.target.closest?.('#resumeBtn')){
    event.preventDefault();
    openWorkspace('normal');
  }
});

window.addEventListener('error',event=>{
  if(!event.defaultPrevented)console.error('Bunaa runtime error',event.error||event.message);
});

window.addEventListener('unhandledrejection',event=>{
  console.error('Bunaa unhandled rejection',event.reason);
});

export {openWorkspace,loadApp};
