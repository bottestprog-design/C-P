const {getClientRuntime} = __require("src/core/runtime.js");
const {App} = __require("src/app/app.js");
const app=new App();
if(typeof window!=='undefined')window.__BUNAA_APP=app;

const showBootError=(error)=>{
  try{
    console.error('Bunaa boot failed',error);
    const existing=document.getElementById('bunaaBootError');
    const box=existing||document.createElement('section');
    if(!existing){box.id='bunaaBootError';document.body?.appendChild(box)}
    box.innerHTML='<div style="max-width:720px;margin:8vh auto;padding:28px;border:1px solid #ddd;border-radius:18px;background:#fff;font-family:system-ui;direction:rtl"><h1 style="margin-top:0">تعذر تشغيل بَنّاء</h1><p>حدث خطأ أثناء تشغيل الاستوديو. أعد تحميل الصفحة. تفاصيل الخطأ تظهر في Console للمراجعة التقنية.</p><button onclick="location.reload()" style="padding:10px 16px;border:0;border-radius:10px;cursor:pointer">إعادة تحميل</button></div>';
    Object.assign(box.style,{position:'fixed',inset:'0',zIndex:'999999',background:'#f5f6fa',padding:'20px'});
  }catch{}
};

if(typeof window!=='undefined'){
  window.addEventListener('error',event=>{if(!app.booted)showBootError(event.error||event.message)});
  window.addEventListener('unhandledrejection',event=>{if(!app.booted)showBootError(event.reason)});
}
const openWorkspace=mode=>app.showWorkspace(mode||'normal');
const bootstrap=()=>app.start();
if(typeof window!=='undefined'){window.__BUNAA_LAYOUT_DIAGNOSTICS__=()=>{const root=document.querySelector('.workspace-main'),canvas=document.querySelector('.canvas-area'),viewport=document.querySelector('#canvasViewport');return {rootWidth:root?.getBoundingClientRect().width||0,canvasWidth:canvas?.getBoundingClientRect().width||0,viewportWidth:viewport?.getBoundingClientRect().width||0,display:getComputedStyle(root||document.body).display,leftCollapsed:root?.classList.contains('left-collapsed')||false,rightCollapsed:root?.classList.contains('right-collapsed')||false,scrollWidth:viewport?.scrollWidth||0,scrollHeight:viewport?.scrollHeight||0,clientWidth:viewport?.clientWidth||0,clientHeight:viewport?.clientHeight||0};};}

try{if(typeof window!=='undefined')window.__BUNAA_RUNTIME__=getClientRuntime();bootstrap()}catch(error){showBootError(error)}
exports.app = app;
exports.openWorkspace = openWorkspace;
exports.bootstrap = bootstrap;
