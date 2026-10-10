function buildPreviewRuntimeScript(pageIds,interactions){
  const pagesJson=JSON.stringify(Array.isArray(pageIds)?pageIds:[]);
  const interactionsJson=JSON.stringify(Array.isArray(interactions)?interactions:[]);
  const script=`
(function(){
'use strict';
var PAGE_IDS=${pagesJson};
var INTERACTIONS=${interactionsJson};
var sections=Array.prototype.slice.call(document.querySelectorAll('[data-preview-section]'));
function findSection(id){return sections.find(function(section){return section.dataset.previewSection===String(id);});}
function getHashId(){var hash=location.hash||'';return hash.indexOf('#page-')===0?decodeURIComponent(hash.slice(6)):null;}
function getCurrentId(){return getHashId()||PAGE_IDS[0]||null;}
function setActive(id,updateHash){
  var target=findSection(id)||sections[0];
  if(!target)return false;
  var targetId=target.dataset.previewSection;
  sections.forEach(function(section){section.hidden=section!==target;});
  var wanted='#page-'+encodeURIComponent(targetId);
  if(updateHash&&location.hash!==wanted){try{location.hash=wanted.slice(1);}catch(error){}}
  if(updateHash&&target.scrollIntoView)target.scrollIntoView({behavior:'smooth',block:'start'});
  return true;
}
function goToPage(id){return setActive(String(id||''),true);}
function getPageTarget(link){
  var explicit=link.dataset.pageTarget||link.dataset.previewPage||'';
  if(explicit&&PAGE_IDS.indexOf(explicit)!==-1)return explicit;
  var href=link.getAttribute('href')||'';
  return href.indexOf('#page-')===0?decodeURIComponent(href.slice(6)):null;
}
function selector(id){return '[data-runtime-id="'+String(id||'').replace(/(["\\\\])/g,'\\\\$1')+'"]';}
function findNode(id){return id?document.querySelector(selector(id)):null;}
function playMotion(node,name,duration){
  if(!node)return;
  Array.prototype.slice.call(node.classList).filter(function(c){return c.indexOf('motion-')===0;}).forEach(function(c){node.classList.remove(c);});
  void node.offsetWidth;
  var ms=Math.max(0,Math.min(10000,Number(duration)||420));
  var cls='motion-'+(name||'fade');
  node.style.animationDuration=ms+'ms';
  node.classList.add(cls);
  node.addEventListener('animationend',function(){node.classList.remove(cls);node.style.animationDuration='';},{once:true});
}
function runInteraction(item){
  var options=item.options||{};
  var target=findNode(options.targetId||item.sourceId);
  switch(item.action){
    case 'motion':playMotion(target,options.motion,options.duration);break;
    case 'show':if(target)target.hidden=false;break;
    case 'hide':if(target)target.hidden=true;break;
    case 'toggle':if(target)target.hidden=!target.hidden;break;
    case 'scroll':if(target&&target.scrollIntoView)target.scrollIntoView({behavior:'smooth',block:'center'});break;
    case 'page':goToPage(options.pageId);break;
    case 'url':if(options.url&&options.url!=='#')location.href=options.url;break;
  }
}
function runTrigger(sourceId,trigger){
  INTERACTIONS.filter(function(item){return item&&item.enabled!==false&&item.sourceId===sourceId&&item.trigger===trigger;}).forEach(runInteraction);
}
document.addEventListener('click',function(event){
  var link=event.target.closest&&event.target.closest('a');
  if(link){var pageId=getPageTarget(link);if(pageId&&PAGE_IDS.indexOf(pageId)!==-1){event.preventDefault();goToPage(pageId);return;}}
  var source=event.target.closest&&event.target.closest('[data-runtime-id]');
  if(source)runTrigger(source.dataset.runtimeId,'click');
});
document.addEventListener('pointerover',function(event){
  var source=event.target.closest&&event.target.closest('[data-runtime-id]');
  if(source&&source!==event.relatedTarget&&!source.contains(event.relatedTarget))runTrigger(source.dataset.runtimeId,'hover');
});
document.addEventListener('focusin',function(event){
  var source=event.target.closest&&event.target.closest('[data-runtime-id]');
  if(source)runTrigger(source.dataset.runtimeId,'focus');
});
document.addEventListener('input',function(event){
  var source=event.target.closest&&event.target.closest('[data-runtime-id]');
  if(source)runTrigger(source.dataset.runtimeId,'input');
});
if('IntersectionObserver' in window){
  var observer=new IntersectionObserver(function(entries){entries.forEach(function(entry){if(entry.isIntersecting)runTrigger(entry.target.dataset.runtimeId,'scroll');});},{threshold:.15});
  document.querySelectorAll('[data-runtime-id]').forEach(function(node){observer.observe(node);});
}
window.addEventListener('hashchange',function(){setActive(getCurrentId(),false);});
setActive(getCurrentId(),false);
INTERACTIONS.filter(function(item){return item&&item.enabled!==false&&item.trigger==='load';}).forEach(function(item){setTimeout(function(){runInteraction(item);},60);});
})();`;
  return `<script>${script}<\/script>`;
}
exports.buildPreviewRuntimeScript = buildPreviewRuntimeScript;
});
