const {uid,deepClone,safeUrl} = __require("src/core/utils.js");
const triggers=[
 ['click','عند الضغط'],['dblclick','نقرتان'],['hover','عند المرور'],['hoverleave','عند مغادرة العنصر'],
 ['focus','عند التركيز'],['blur','عند فقدان التركيز'],['input','أثناء الكتابة'],['change','عند التغيير'],
 ['submit','عند إرسال النموذج'],['keydown','عند ضغط مفتاح'],['contextmenu','عند زر الفأرة الأيمن'],
 ['mousedown','عند الضغط بالماوس'],['mouseup','عند رفع الماوس'],['load','عند الظهور'],['enterViewport','عند دخول الشاشة'],
 ['scroll','أثناء التمرير'],['play','عند تشغيل الوسائط'],['pause','عند إيقاف الوسائط'],['ended','عند انتهاء الوسائط']
];
const actions=[
 ['motion','حركة'],['show','إظهار'],['hide','إخفاء'],['toggle','تبديل الظهور'],['scroll','تمرير'],
 ['page','انتقال لصفحة'],['url','فتح رابط'],['addClass','إضافة Class'],['removeClass','حذف Class'],['toggleClass','تبديل Class'],
 ['style','تغيير مظهر'],['setText','تغيير النص'],['setAttribute','تغيير خاصية'],['removeAttribute','حذف خاصية'],
 ['focus','تركيز عنصر'],['blur','إلغاء التركيز'],['submit','إرسال نموذج'],['toast','رسالة صغيرة'],['copy','نسخ للنظام'],
 ['mediaPlay','تشغيل صوت'],['mediaPause','إيقاف صوت'],['toggleAttribute','تبديل خاصية'],['openAsset','فتح وسيط محمّل'],['downloadAsset','تحميل وسيط'],['setMedia','تبديل وسيط العنصر']
];
const motions=[
 ['fade','ظهور'],['slide','انزلاق'],['zoom','تكبير'],['pulse','نبض'],['glow','وهج'],['lift','ارتفاع'],['shake','اهتزاز'],['bounce','ارتداد'],['spin','دوران']
];

const capabilityMap={
 button:{triggers:['click','dblclick','hover','hoverleave','focus'],actions:['motion','page','url','scroll','toast','copy','toggle','addClass','toggleClass','openAsset','downloadAsset','setMedia']},
 link:{triggers:['click','dblclick','hover','hoverleave'],actions:['page','url','motion','scroll','toast']},
 card:{triggers:['click','hover','hoverleave'],actions:['page','url','motion','toggle','show','hide','toast']},
 product:{triggers:['click','hover','hoverleave'],actions:['url','page','motion','toast','toggle']},
 image:{triggers:['click','dblclick','hover','hoverleave','load'],actions:['motion','url','show','hide','toggle','toast','openAsset','downloadAsset','setMedia']},
 gallery:{triggers:['click','hover','load'],actions:['motion','toggle','show','hide']},
 video:{triggers:['click','dblclick','hover','hoverleave','play','pause','ended'],actions:['motion','url','page','scroll','show','hide','toast','openAsset','downloadAsset','setMedia','mediaPlay','mediaPause']},
 audio:{triggers:['click','play','pause','ended'],actions:['mediaPlay','mediaPause','motion','show','hide','toast','openAsset','downloadAsset','setMedia']},
 input:{triggers:['focus','blur','input','change','keydown'],actions:['motion','show','hide','toggle','setText','setAttribute','focus','copy','toast']},
 search:{triggers:['focus','input','keydown','change'],actions:['motion','show','hide','toggle','setText','focus','copy','toast']},
 textarea:{triggers:['focus','blur','input','change','keydown'],actions:['motion','show','hide','toggle','setText','copy','toast']},
 select:{triggers:['focus','change'],actions:['motion','show','hide','toggle','setText','toast']},
 checkbox:{triggers:['change','click','focus'],actions:['toggle','show','hide','motion','setText','toast']},
 radio:{triggers:['change','click','focus'],actions:['toggle','show','hide','motion','setText','toast']},
 form:{triggers:['submit','focus','input','change'],actions:['show','hide','toggle','motion','setText','toast']},
 faq:{triggers:['click','hover'],actions:['motion','toggle','show','hide','scroll']},
 tabs:{triggers:['click','hover'],actions:['motion','show','hide','toggle']},
 accordion:{triggers:['click','hover'],actions:['motion','show','hide','toggle']},
 dropdown:{triggers:['change','focus'],actions:['motion','show','hide','toggle','setText']},
 navbar:{triggers:['click','hover'],actions:['page','url','motion','scroll']},
 social:{triggers:['click','hover'],actions:['url','motion','toast']},
 socialLinks:{triggers:['click','hover'],actions:['url','motion','toast']},
 default:{triggers:['click','dblclick','hover','hoverleave','focus','blur','load','enterViewport','scroll'],actions:['motion','show','hide','toggle','scroll','page','url','addClass','removeClass','toggleClass','style','toast','openAsset','downloadAsset','setMedia']}
};
const interactionCapabilities=type=>capabilityMap[type]||capabilityMap.default;
function makeStep(action='motion',options={}){
  return {id:uid('step'),action,delay:0,options:{targetId:null,motion:'fade',duration:420,pageId:null,anchor:'',url:'#',newTab:false,className:'',property:'color',value:'',text:'',attribute:'',attributeValue:'',message:'تم تنفيذ التفاعل',toastDuration:2200,key:'',...options}};
}
function makeInteraction(sourceId,trigger='click',action='motion',options={}){
  const first=makeStep(action,{targetId:sourceId,...options});
  return {id:uid('int'),sourceId,trigger,enabled:true,once:false,preventDefault:false,stopPropagation:false,cooldown:0,condition:{type:'always',value:'',operator:'contains'},steps:[first],action,options:first.options};
}

function normalizeStep(step,sourceId){
  const s=makeStep(step?.action||'motion',{targetId:sourceId,...(step?.options||{})});
  return {...s,id:typeof step?.id==='string'&&step.id?step.id:s.id,delay:Math.max(0,Number(step?.delay)||0)};
}
function normalizeInteraction(item){
  if(!item||typeof item!=='object'||typeof item.sourceId!=='string')return null;
  const legacyOptions=item.options||{};
  const rawSteps=Array.isArray(item.steps)&&item.steps.length?item.steps:[{action:item.action||'motion',options:legacyOptions}];
  const steps=rawSteps.map(step=>normalizeStep(step,item.sourceId));
  return {
    id:typeof item.id==='string'&&item.id?item.id:uid('int'),
    sourceId:item.sourceId,
    trigger:item.trigger||'click',enabled:item.enabled!==false,
    once:Boolean(item.once),preventDefault:Boolean(item.preventDefault),stopPropagation:Boolean(item.stopPropagation),
    cooldown:Math.max(0,Number(item.cooldown)||0),
    condition:{type:item.condition?.type||'always',value:String(item.condition?.value??''),operator:item.condition?.operator||'contains'},
    steps,action:steps[0]?.action||item.action||'motion',options:deepClone(steps[0]?.options||legacyOptions)
  };
}
function upsertInteraction(project,item){const x=normalizeInteraction(item);if(!x)return null;project.interactions=Array.isArray(project.interactions)?project.interactions:[];const i=project.interactions.findIndex(v=>v.id===x.id);if(i<0)project.interactions.push(deepClone(x));else project.interactions[i]=deepClone(x);return x}
const removeInteraction=(project,id)=>{project.interactions=(project.interactions||[]).filter(x=>x.id!==id)};
const interactionsFor=(project,id)=>(project.interactions||[]).filter(x=>x.sourceId===id&&x.enabled!==false).map(normalizeInteraction).filter(Boolean);
const labels=a=>Object.fromEntries(a);
const triggerLabel=x=>labels(triggers)[x]||x;
const actionLabel=x=>labels(actions)[x]||x;

function assetById(project,id){return (project?.assets||[]).find(asset=>asset.id===id)||null}
function select(doc,id){if(!id)return null;const nodes=doc.querySelectorAll('[data-node-id],[data-runtime-id]');for(const node of nodes)if(node.dataset.nodeId===id||node.dataset.runtimeId===id)return node;return null}
function mediaTarget(source){return source?.matches?.('audio,video')?source:(source?.querySelector?.('audio,video')||source)}
function eventTargetFor(source,type){if(['play','pause','ended'].includes(type))return mediaTarget(source);if(['input','change','focus','blur','keydown','submit'].includes(type))return source?.querySelector?.('input,textarea,select,button,form')||source;return source}

function animate(element,name='fade',duration=420){
  if(!element)return;
  const map={fade:'fade',slide:'slide',zoom:'zoom',pulse:'pulse',glow:'glow',lift:'lift',shake:'shake',bounce:'bounce',spin:'spin'};
  const safe=map[name]||'fade';
  element.classList.remove(...[...element.classList].filter(x=>x.startsWith('motion-')));
  void element.offsetWidth;
  element.style.animationDuration=`${Math.max(0,Math.min(10000,Number(duration)||420))}ms`;
  element.classList.add(`motion-${safe}`);
  element.addEventListener('animationend',()=>{element.classList.remove(`motion-${safe}`);element.style.animationDuration=''}, {once:true});
}

function valueOf(target,event){
  const field=event?.target?.matches?.('input,textarea,select')?event.target:target?.querySelector?.('input,textarea,select');
  if(field){if(field.type==='checkbox'||field.type==='radio')return field.checked?'true':'false';return String(field.value??'')}
  return String(target?.textContent||'').trim();
}
function visible(target){if(!target)return false;const r=target.getBoundingClientRect?.();const cs=globalThis.getComputedStyle?.(target);return target.hidden!==true&&cs?.display!=='none'&&cs?.visibility!=='hidden'&&(!r||r.width>0||r.height>0)}
function conditionPasses(i,event,source,device){
  const c=i.condition||{type:'always'};if(c.type==='always')return true;
  if(c.type==='device')return String(device||'desktop')===String(c.value||'desktop');
  const actual=valueOf(event?.currentTarget||source,event);
  if(c.type==='not-empty')return actual.trim()!=='';
  if(c.type==='visible')return visible(select(source?.ownerDocument,i.steps?.[0]?.options?.targetId)||source);
  if(c.type==='value'){const wanted=String(c.value??'');if(c.operator==='equals')return actual===wanted;if(c.operator==='not-equals')return actual!==wanted;if(c.operator==='starts')return actual.startsWith(wanted);if(c.operator==='ends')return actual.endsWith(wanted);return actual.includes(wanted)}
  if(c.type==='key')return String(event?.key||'')===String(c.value||'');
  return true;
}

function toast(document,message,duration=2200){
  const old=document.querySelector('[data-bunaa-toast]');old?.remove();
  const el=document.createElement('div');el.dataset.bunaaToast='1';el.textContent=String(message||'تم التنفيذ');el.style.cssText='position:fixed;inset-inline-start:50%;bottom:24px;transform:translateX(-50%);z-index:2147483000;padding:11px 16px;border-radius:12px;background:#171b2a;color:#fff;font:700 13px system-ui;box-shadow:0 16px 40px rgba(0,0,0,.2);pointer-events:none;max-width:min(90vw,520px);text-align:center';document.body.appendChild(el);setTimeout(()=>el.remove(),Math.max(400,Number(duration)||2200))
}
async function copyText(text,document){try{if(globalThis.navigator?.clipboard?.writeText){await globalThis.navigator.clipboard.writeText(String(text));toast(document,'تم النسخ');return true}}catch{}const area=document.createElement('textarea');area.value=String(text);area.style.position='fixed';area.style.opacity='0';document.body.appendChild(area);area.select();try{document.execCommand('copy');toast(document,'تم النسخ');return true}finally{area.remove()}}
function targetForStep(document,step,source){return select(document,step.options?.targetId)||source}

function assetUrl(asset){return asset?.data||asset?.url||''}
function triggerAssetDownload(url,filename){if(!url)return false;const link=document.createElement('a');link.href=url;link.download=filename||'download';link.target='_blank';link.rel='noopener';document.body.appendChild(link);link.click();link.remove();return true}
async function runInteraction(interaction,event,{document,source,navigate,device='desktop',project}={}){
  const i=normalizeInteraction(interaction);if(!i||!source||!conditionPasses(i,event,source,device))return false;
  const state=runInteraction._state||(runInteraction._state=new WeakMap());
  let bucket=state.get(source);if(!bucket){bucket=new Map();state.set(source,bucket)}
  const runtimeKey=i.id;const now=Date.now();const previous=bucket.get(runtimeKey)||{last:0,fired:false};
  if(i.once&&previous.fired)return false;if(i.cooldown&&now-previous.last<i.cooldown)return false;
  bucket.set(runtimeKey,{last:now,fired:true});
  if(i.preventDefault)event?.preventDefault?.();if(i.stopPropagation)event?.stopPropagation?.();
  for(const step of i.steps){if(step.delay)await new Promise(resolve=>setTimeout(resolve,Math.min(10000,Number(step.delay)||0)));const o=step.options||{},target=targetForStep(document,step,source);switch(step.action){
    case'motion':animate(target,o.motion,o.duration);break;
    case'show':if(target)target.hidden=false;break;
    case'hide':if(target)target.hidden=true;break;
    case'toggle':if(target)target.hidden=!target.hidden;break;
    case'scroll':target?.scrollIntoView?.({behavior:'smooth',block:o.anchor==='start'?'start':o.anchor==='end'?'end':'center'});break;
    case'page':if(o.pageId)navigate?.(o.pageId);break;
    case'url':{const u=safeUrl(o.url||'#');if(u!=='#'){if(o.newTab)window.open(u,'_blank','noopener');else location.href=u}break}
    case'addClass':if(target&&o.className)target.classList.add(o.className);break;
    case'removeClass':if(target&&o.className)target.classList.remove(o.className);break;
    case'toggleClass':if(target&&o.className)target.classList.toggle(o.className);break;
    case'style':if(target&&o.property&&/^[a-zA-Z-]+$/.test(o.property))target.style.setProperty(o.property,String(o.value??''));break;
    case'setText':if(target)target.textContent=String(o.text??'');break;
    case'setAttribute':if(target&&o.attribute)target.setAttribute(String(o.attribute),String(o.attributeValue??''));break;
    case'removeAttribute':if(target&&o.attribute)target.removeAttribute(String(o.attribute));break;
    case'toggleAttribute':if(target&&o.attribute){target.toggleAttribute(String(o.attribute))}break;
    case'focus':target?.focus?.();break;
    case'blur':target?.blur?.();break;
    case'submit':{const form=target?.tagName==='FORM'?target:target?.closest?.('form')||target?.querySelector?.('form');if(form?.requestSubmit)form.requestSubmit();else form?.submit?.();break}
    case'toast':toast(document,o.message,o.toastDuration);break;
    case'copy':await copyText(o.text||valueOf(target,event),document);break;
    case'mediaPlay':{const m=mediaTarget(target);m?.play?.().catch?.(()=>{});break}
    case'mediaPause':{const m=mediaTarget(target);m?.pause?.();break}
    case'openAsset':{const asset=assetById(project,o.assetId),url=assetUrl(asset);if(url){if(o.newTab!==false)globalThis.open?.(url,'_blank','noopener');else globalThis.location&&(globalThis.location.href=url)}break}
    case'downloadAsset':{const asset=assetById(project,o.assetId);triggerAssetDownload(assetUrl(asset),asset?.filename||asset?.name||'download');break}
    case'setMedia':{const asset=assetById(project,o.assetId),url=assetUrl(asset);if(!url||!target)break;const media=mediaTarget(target);if(media?.setAttribute)media.setAttribute('src',url);if(media?.load)media.load();if(asset?.alt&&media?.tagName==='IMG')media.setAttribute('alt',asset.alt);break}
  }}
  return true;
}
function createRuntime({document,project,navigate,device='desktop'}){
  const clean=[];const on=(target,type,fn,opts)=>{target.addEventListener(type,fn,opts);clean.push(()=>target.removeEventListener(type,fn,opts))};
  const nodeMap=new Map((project.pages||[]).flatMap(page=>{const out=[];const walk=(nodes)=>{for(const node of nodes||[]){out.push(node);walk(node.children)}};walk(page.nodes);return out}).map(node=>[node.id,node]));
  for(const raw of project.interactions||[]){const i=normalizeInteraction(raw);if(!i?.enabled||!nodeMap.has(i.sourceId))continue;const source=select(document,i.sourceId);if(!source)continue;
    const target=eventTargetFor(source,i.trigger);const fire=event=>{const current=event?.currentTarget||source;const isAnchor=current?.tagName==='A'||current?.closest?.('a');const takesNavigation=i.steps?.some(step=>['page','url'].includes(step.action));if(['click','dblclick','contextmenu'].includes(i.trigger)&&isAnchor&&(takesNavigation||i.trigger==='click'))event?.preventDefault?.();const p=runInteraction(i,event,{document,source,navigate,device,project});if(p?.catch)p.catch(error=>console.warn('Bunaa interaction failed',error))};
    if(i.trigger==='load'){const t=setTimeout(()=>fire({currentTarget:source,preventDefault(){},stopPropagation(){}}),60);clean.push(()=>clearTimeout(t));continue}
    if(i.trigger==='enterViewport'&&'IntersectionObserver' in globalThis){const ob=new IntersectionObserver(es=>{if(es.some(e=>e.isIntersecting))fire({currentTarget:source})},{threshold:.15});ob.observe(source);clean.push(()=>ob.disconnect());continue}
    if(i.trigger==='scroll'){const handler=()=>{if(visible(source))fire({currentTarget:source})};on(window,'scroll',handler,{passive:true});continue}
    if(i.trigger==='hover')on(target,'pointerenter',fire);else if(i.trigger==='hoverleave')on(target,'pointerleave',fire);else on(target,i.trigger,fire);
  }
  return()=>clean.splice(0).forEach(fn=>fn());
}
exports.triggers = triggers;
exports.actions = actions;
exports.motions = motions;
exports.interactionCapabilities = interactionCapabilities;
exports.makeStep = makeStep;
exports.makeInteraction = makeInteraction;
exports.normalizeInteraction = normalizeInteraction;
exports.upsertInteraction = upsertInteraction;
exports.removeInteraction = removeInteraction;
exports.interactionsFor = interactionsFor;
exports.triggerLabel = triggerLabel;
exports.actionLabel = actionLabel;
exports.runInteraction = runInteraction;
exports.createRuntime = createRuntime;
