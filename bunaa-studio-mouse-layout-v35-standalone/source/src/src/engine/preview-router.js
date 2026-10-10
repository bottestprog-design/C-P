function buildPreviewRuntimeScript(pageIds,interactions,assets,device){
  const safeJson=value=>JSON.stringify(value??[]).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
  const pagesJson=safeJson(Array.isArray(pageIds)?pageIds:[]);
  const interactionsJson=safeJson(Array.isArray(interactions)?interactions:[]);
  const assetsJson=safeJson(Array.isArray(assets)?assets:[]);
  const deviceJson=safeJson(device||'desktop');
  const script=`
(function(){
'use strict';
var PAGE_IDS=${pagesJson},INTERACTIONS=${interactionsJson},ASSETS=${assetsJson},DEVICE=${deviceJson};
var sections=Array.prototype.slice.call(document.querySelectorAll('[data-preview-section]'));
var interactionState=new Map();
function safeUrl(value){var s=String(value==null?'':value).trim();if(!s||s==='#')return '#';if(/^(javascript|vbscript|file|data):/i.test(s))return '#';if(/^(https?:|mailto:|tel:)/i.test(s))return s;if(/^[/#.][^\\s]*$/.test(s)||/^[^:\\s]+(?:[/#][^\\s]*)?$/.test(s))return s;return '#';}
function findSection(id){return sections.find(function(section){return section.dataset.previewSection===String(id);});}
function getHashId(){var hash=location.hash||'';return hash.indexOf('#page-')===0?decodeURIComponent(hash.slice(6)):null;}
function getCurrentId(){return getHashId()||PAGE_IDS[0]||null;}
function setActive(id,updateHash){var target=findSection(id)||sections[0];if(!target)return false;var targetId=target.dataset.previewSection;sections.forEach(function(section){section.hidden=section!==target;});var wanted='#page-'+encodeURIComponent(targetId);if(updateHash&&location.hash!==wanted){try{history.replaceState(null,'',wanted);}catch(error){location.hash=wanted.slice(1);}}if(updateHash&&target.scrollIntoView)target.scrollIntoView({behavior:'smooth',block:'start'});return true;}
function goToPage(id){return setActive(String(id||''),true);}
function getPageTarget(link){var explicit=link.dataset.pageTarget||link.dataset.previewPage||'';if(explicit&&PAGE_IDS.indexOf(explicit)!==-1)return explicit;var href=link.getAttribute('href')||'';return href.indexOf('#page-')===0?decodeURIComponent(href.slice(6)):null;}
function findNode(id){return id?Array.prototype.find.call(document.querySelectorAll('[data-runtime-id]'),function(node){return node.dataset.runtimeId===String(id);}):null;}
function nodeForEvent(event){var target=event&&event.target;return target&&target.closest?target.closest('[data-runtime-id]'):null;}
function stepsFor(item){return Array.isArray(item.steps)&&item.steps.length?item.steps:[{action:item.action||'motion',options:item.options||{},delay:0}];}
function sourceValue(source,event){var eventTarget=event&&event.target;var field=eventTarget&&eventTarget.matches&&eventTarget.matches('input,textarea,select')?eventTarget:(source&&source.querySelector?source.querySelector('input,textarea,select'):null);if(field){if(field.type==='checkbox'||field.type==='radio')return field.checked?'true':'false';return String(field.value==null?'':field.value);}return String(source&&source.textContent||'').trim();}
function isVisible(target){if(!target||target.hidden)return false;var style=getComputedStyle(target),rect=target.getBoundingClientRect();return style.display!=='none'&&style.visibility!=='hidden'&&(rect.width>0||rect.height>0);}
function conditionPasses(item,source,event){var c=item.condition||{type:'always'};if(!c.type||c.type==='always')return true;if(c.type==='device')return String(c.value||'desktop')===String(DEVICE);if(c.type==='visible'){var o=stepsFor(item)[0].options||{};return isVisible(findNode(o.targetId)||source);}var actual=sourceValue(source,event);if(c.type==='not-empty')return actual.trim()!=='';if(c.type==='key')return String(event&&event.key||'')===String(c.value||'');if(c.type==='value'){var wanted=String(c.value==null?'':c.value);if(c.operator==='equals')return actual===wanted;if(c.operator==='not-equals')return actual!==wanted;if(c.operator==='starts')return actual.startsWith(wanted);if(c.operator==='ends')return actual.endsWith(wanted);return actual.includes(wanted);}return true;}
function playMotion(target,name,duration){if(!target)return;Array.prototype.slice.call(target.classList).filter(function(c){return c.indexOf('motion-')===0;}).forEach(function(c){target.classList.remove(c);});void target.offsetWidth;var safe=['fade','slide','zoom','pulse','glow','lift','shake','bounce','spin'].indexOf(name)>=0?name:'fade';target.style.animationDuration=Math.max(0,Math.min(10000,Number(duration)||420))+'ms';target.classList.add('motion-'+safe);target.addEventListener('animationend',function(){target.classList.remove('motion-'+safe);target.style.animationDuration='';},{once:true});}
function showToast(message,duration){var old=document.querySelector('[data-bunaa-toast]');if(old)old.remove();var toast=document.createElement('div');toast.dataset.bunaaToast='1';toast.textContent=String(message||'تم تنفيذ التفاعل');toast.style.cssText='position:fixed;inset-inline-start:50%;bottom:24px;transform:translateX(-50%);z-index:2147483000;padding:11px 16px;border-radius:12px;background:#171b2a;color:#fff;font:700 13px system-ui;box-shadow:0 16px 40px rgba(0,0,0,.2);pointer-events:none;max-width:min(90vw,520px);text-align:center';document.body.appendChild(toast);setTimeout(function(){toast.remove();},Math.max(400,Number(duration)||2200));}
function copyText(text){var value=String(text==null?'':text);if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(value).then(function(){showToast('تم النسخ');}).catch(function(){copyFallback(value);});}else copyFallback(value);}
function copyFallback(value){var area=document.createElement('textarea');area.value=value;area.style.position='fixed';area.style.opacity='0';document.body.appendChild(area);area.select();try{document.execCommand('copy');showToast('تم النسخ');}catch(error){showToast('تعذر النسخ في هذا المتصفح');}area.remove();}
function targetFor(step,source){var options=step.options||{};return findNode(options.targetId)||source;}
function assetFor(id){return ASSETS.find(function(asset){return asset&&asset.id===id;})||null;}
function assetUrl(asset){return asset&&(asset.data||asset.url)||'';}
function mediaFor(target){return target&&(target.matches&&target.matches('audio,video')?target:(target.querySelector&&target.querySelector('audio,video')))||null;}
function classNames(value){return String(value||'').split(/\\s+/).filter(function(name){return /^[A-Za-z_][\\w-]*$/.test(name);});}
async function runStep(step,source,event){var options=step.options||{},target=targetFor(step,source),value;switch(step.action){
case'motion':playMotion(target,options.motion,options.duration);break;
case'show':if(target)target.hidden=false;break;
case'hide':if(target)target.hidden=true;break;
case'toggle':if(target)target.hidden=!target.hidden;break;
case'scroll':if(target&&target.scrollIntoView)target.scrollIntoView({behavior:'smooth',block:options.anchor==='start'?'start':options.anchor==='end'?'end':'center'});break;
case'page':if(options.pageId)goToPage(options.pageId);break;
case'url':value=safeUrl(options.url||'#');if(value!=='#'){if(options.newTab)window.open(value,'_blank','noopener,noreferrer');else if(value.indexOf('#page-')===0)goToPage(decodeURIComponent(value.slice(6)));else location.href=value;}break;
case'addClass':if(target)classNames(options.className).forEach(function(name){target.classList.add(name);});break;
case'removeClass':if(target)classNames(options.className).forEach(function(name){target.classList.remove(name);});break;
case'toggleClass':if(target)classNames(options.className).forEach(function(name){target.classList.toggle(name);});break;
case'style':if(target&&/^[a-zA-Z-]+$/.test(options.property||'')&&!/javascript:/i.test(String(options.value||'')))target.style.setProperty(options.property,String(options.value==null?'':options.value));break;
case'setText':if(target)target.textContent=String(options.text==null?'':options.text);break;
case'setAttribute':if(target&&/^[A-Za-z_:][A-Za-z0-9_.:-]*$/.test(options.attribute||'')&&!/^on/i.test(options.attribute))target.setAttribute(String(options.attribute),String(options.attributeValue==null?'':options.attributeValue));break;
case'removeAttribute':if(target&&/^[A-Za-z_:][A-Za-z0-9_.:-]*$/.test(options.attribute||'')&&!/^on/i.test(options.attribute))target.removeAttribute(String(options.attribute));break;
case'toggleAttribute':if(target&&/^[A-Za-z_:][A-Za-z0-9_.:-]*$/.test(options.attribute||'')&&!/^on/i.test(options.attribute))target.toggleAttribute(String(options.attribute));break;
case'focus':if(target&&target.focus)target.focus();break;
case'blur':if(target&&target.blur)target.blur();break;
case'submit':{var form=target&&(target.tagName==='FORM'?target:(target.closest&&target.closest('form'))||(target.querySelector&&target.querySelector('form')));if(form&&form.requestSubmit)form.requestSubmit();else if(form&&form.submit)form.submit();break;}
case'toast':showToast(options.message,options.toastDuration);break;
case'copy':copyText(options.text||sourceValue(target,event));break;
case'mediaPlay':{var media=mediaFor(target);if(media&&media.play){var playResult=media.play();if(playResult&&playResult.catch)playResult.catch(function(){});}break;}
case'mediaPause':{var paused=mediaFor(target);if(paused&&paused.pause)paused.pause();break;}
case'openAsset':{var openedAsset=assetFor(options.assetId),openedUrl=assetUrl(openedAsset);if(openedUrl){if(options.newTab!==false)window.open(openedUrl,'_blank','noopener,noreferrer');else location.href=safeUrl(openedUrl);}break;}
case'downloadAsset':{var downloaded=assetFor(options.assetId),downloadUrl=assetUrl(downloaded);if(downloadUrl){var anchor=document.createElement('a');anchor.href=downloadUrl;anchor.download=downloaded.filename||downloaded.name||'download';anchor.rel='noopener';document.body.appendChild(anchor);anchor.click();anchor.remove();}break;}
case'setMedia':{var mediaAsset=assetFor(options.assetId),mediaUrl=assetUrl(mediaAsset);if(mediaUrl&&target){var mediaTarget=target.matches&&target.matches('img,video,audio')?target:(target.querySelector&&target.querySelector('img,video,audio'));if(mediaTarget){mediaTarget.setAttribute('src',mediaUrl);if(mediaTarget.load)mediaTarget.load();if(mediaAsset.alt&&mediaTarget.tagName==='IMG')mediaTarget.alt=mediaAsset.alt;}}break;}
}}
async function runOne(item,source,event){if(!source||item.enabled===false||!conditionPasses(item,source,event))return;var id=String(item.id||item.sourceId+':'+item.trigger),prior=interactionState.get(id)||{fired:false,last:0},now=Date.now();if(item.once&&prior.fired)return;if(item.cooldown&&now-prior.last<Number(item.cooldown))return;interactionState.set(id,{fired:true,last:now});if(item.preventDefault&&event&&event.preventDefault)event.preventDefault();if(item.stopPropagation&&event&&event.stopPropagation)event.stopPropagation();var steps=stepsFor(item);for(var i=0;i<steps.length;i++){var step=steps[i]||{};var delay=Math.max(0,Math.min(10000,Number(step.delay)||0));if(delay)await new Promise(function(resolve){setTimeout(resolve,delay);});await runStep(step,source,event);}}
function itemsFor(sourceId,trigger){return INTERACTIONS.filter(function(item){return item&&item.enabled!==false&&item.sourceId===sourceId&&item.trigger===trigger;});}
function runTrigger(sourceId,trigger,event){itemsFor(sourceId,trigger).forEach(function(item){runOne(item,findNode(sourceId),event).catch(function(error){console.warn('Bunaa preview interaction failed',error);});});}
function hasClickBehavior(sourceId){return INTERACTIONS.some(function(item){return item&&item.enabled!==false&&item.sourceId===sourceId&&(item.trigger==='click'||item.trigger==='dblclick');});}
function handleEvent(trigger,event){var source=nodeForEvent(event);if(!source)return;var id=source.dataset.runtimeId;
if(trigger==='hover'||trigger==='hoverleave'){var related=event.relatedTarget;if(related&&(related===source||source.contains(related)))return;}
if(trigger==='blur'&&source.contains(document.activeElement))return;
if(trigger==='click'&&hasClickBehavior(id)){event.preventDefault();runTrigger(id,'click',event);return;}
runTrigger(id,trigger,event);
if(trigger==='dblclick'||trigger==='contextmenu'){if(hasClickBehavior(id))event.preventDefault();}
}
var delegated={click:'click',dblclick:'dblclick',pointerover:'hover',pointerout:'hoverleave',focusin:'focus',focusout:'blur',input:'input',change:'change',submit:'submit',keydown:'keydown',contextmenu:'contextmenu',mousedown:'mousedown',mouseup:'mouseup',play:'play',pause:'pause',ended:'ended'};
Object.keys(delegated).forEach(function(type){document.addEventListener(type,function(event){handleEvent(delegated[type],event);},type==='play'||type==='pause'||type==='ended');});
function getPageTargetForEvent(event){var link=event.target&&event.target.closest?event.target.closest('a'):null;if(!link)return null;var id=getPageTarget(link);return id&&PAGE_IDS.indexOf(id)!==-1?id:null;}
document.addEventListener('click',function(event){var source=nodeForEvent(event);if(source&&hasClickBehavior(source.dataset.runtimeId))return;var pageId=getPageTargetForEvent(event);if(pageId){event.preventDefault();goToPage(pageId);}});
window.addEventListener('hashchange',function(){setActive(getCurrentId(),false);});
setActive(getCurrentId(),false);
INTERACTIONS.filter(function(item){return item&&item.enabled!==false&&item.trigger==='load';}).forEach(function(item){setTimeout(function(){runOne(item,findNode(item.sourceId),{currentTarget:findNode(item.sourceId)}).catch(function(error){console.warn(error);});},60);});
if('IntersectionObserver' in window){var observed=new Map();INTERACTIONS.filter(function(item){return item&&item.enabled!==false&&item.trigger==='enterViewport';}).forEach(function(item){var source=findNode(item.sourceId);if(!source)return;var observer=observed.get(source);if(!observer){observer=new IntersectionObserver(function(entries){entries.forEach(function(entry){if(entry.isIntersecting)runTrigger(entry.target.dataset.runtimeId,'enterViewport',{currentTarget:entry.target});});},{threshold:.15});observer.observe(source);observed.set(source,observer);}});}
var scrollBusy=false;window.addEventListener('scroll',function(){if(scrollBusy)return;scrollBusy=true;requestAnimationFrame(function(){scrollBusy=false;INTERACTIONS.filter(function(item){return item&&item.enabled!==false&&item.trigger==='scroll';}).forEach(function(item){var source=findNode(item.sourceId);if(isVisible(source))runTrigger(item.sourceId,'scroll',{currentTarget:source});});});},{passive:true});
// Built-in component behavior is part of preview as well as exported runtime.
// These are local demo interactions; external checkout/form submission requires a service.
var previewCartCount=0;
function componentFeedback(message){var status=document.querySelector('[data-bunaa-component-status]');if(!status){status=document.createElement('div');status.dataset.bunaaComponentStatus='1';status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.style.cssText='position:fixed;bottom:16px;inset-inline-end:16px;z-index:2147483000;padding:10px 14px;border-radius:10px;background:#171b2a;color:#fff;font:600 13px system-ui;box-shadow:0 12px 28px rgba(0,0,0,.2);max-width:90vw';document.body.appendChild(status);}status.textContent=message;}
document.addEventListener('click',function(event){
 var filter=event.target&&event.target.closest?event.target.closest('[data-portfolio-filter]'):null;
 if(filter){event.preventDefault();var portfolio=filter.closest('.built-portfolio');if(!portfolio)return;var wanted=filter.dataset.portfolioFilter||'الكل';portfolio.querySelectorAll('[data-portfolio-filter]').forEach(function(button){button.setAttribute('aria-pressed',String(button===filter));});portfolio.querySelectorAll('[data-portfolio-category]').forEach(function(card){card.hidden=wanted!=='الكل'&&card.dataset.portfolioCategory!==wanted;});return;}
 var move=event.target&&event.target.closest?event.target.closest('[data-carousel-move]'):null;
 if(move){event.preventDefault();var carousel=move.closest('.built-testimonial-carousel');if(!carousel)return;var slides=Array.prototype.slice.call(carousel.querySelectorAll('[data-carousel-slide]'));if(!slides.length)return;var index=slides.findIndex(function(slide){return !slide.hidden;});index=(index+Number(move.dataset.carouselMove||0)+slides.length)%slides.length;slides.forEach(function(slide,i){slide.hidden=i!==index;});var label=carousel.querySelector('[data-carousel-status]');if(label)label.textContent=String(index+1)+' / '+String(slides.length);return;}
 var tab=event.target&&event.target.closest?event.target.closest('[data-tab-index]'):null;
 if(tab){event.preventDefault();var tabHost=tab.closest('.built-tabs');if(!tabHost)return;tabHost.querySelectorAll('[data-tab-index]').forEach(function(button){button.classList.toggle('active',button===tab);});tabHost.querySelectorAll('[data-tab-panel]').forEach(function(panel){panel.hidden=panel.dataset.tabPanel!==tab.dataset.tabIndex;});return;}
 var add=event.target&&event.target.closest?event.target.closest('[data-cart-add]'):null;
 if(add){event.preventDefault();previewCartCount+=1;window.__BUNAA_CART={count:previewCartCount,items:(window.__BUNAA_CART&&window.__BUNAA_CART.items||[]).concat([{id:add.dataset.cartAdd,name:add.dataset.cartName}])};add.textContent='أضيفت ✓';add.setAttribute('aria-pressed','true');componentFeedback('أضيف إلى السلة: '+(add.dataset.cartName||'منتج')+' — العدد '+previewCartCount);return;}
 var back=event.target&&event.target.closest?event.target.closest('[data-back-to-top]'):null;if(back){event.preventDefault();window.scrollTo({top:0,behavior:'smooth'});return;}
 var cookie=event.target&&event.target.closest?event.target.closest('[data-cookie-dismiss]'):null;if(cookie){event.preventDefault();cookie.closest('.built-cookie')&&cookie.closest('.built-cookie').remove();componentFeedback('تم إخفاء رسالة ملفات الارتباط');}
});
document.addEventListener('submit',function(event){var form=event.target&&event.target.closest?event.target.closest('form[data-local-contact-form]'):null;if(!form)return;event.preventDefault();var status=form.querySelector('[data-form-status]');if(!form.checkValidity()){form.reportValidity&&form.reportValidity();if(status)status.textContent='راجع الحقول المطلوبة والبريد الإلكتروني.';return;}if(status)status.textContent='تم التحقق من الحقول محليًا. لإرسال البيانات فعليًا إلى بريد أو CRM، اربط النموذج بخدمة إرسال أو بخادم.';form.dataset.validated='true';componentFeedback('تم التحقق من النموذج. لم يتم إرسال بيانات إلى خادم.');});
})();`;
  return `<script>${script}<\/script>`;
}
exports.buildPreviewRuntimeScript = buildPreviewRuntimeScript;
});
