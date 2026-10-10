const {nodeHtml} = __require("src/engine/renderer.js");
const {escapeHtml,downloadText,downloadBlob,deepClone,safeUrl} = __require("src/core/utils.js");
const {resolveStyle,styleObjectToCss} = __require("src/engine/layout.js");
const {themeCss} = __require("src/core/design-system.js");
const {normalizeAssets} = __require("src/core/assets.js");

function safeName(value){return String(value||'project').normalize('NFKC').replace(/[^\p{L}\p{N}_-]+/gu,'-').replace(/-+/g,'-').slice(0,60)||'project'}
function assetBytes(data){
  const text=String(data||'');const match=text.match(/^data:([^;,]+)?(;base64)?,(.*)$/s);if(!match)return null;
  try{if(match[2]){const bin=atob(match[3]);const bytes=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);return bytes}return new TextEncoder().encode(decodeURIComponent(match[3]))}catch{return null}
}
function safeAssetFilename(value,fallback='asset.bin'){
  const raw=String(value||fallback).replace(/\\/g,'/').split('/').pop()||fallback;
  return raw.normalize('NFKC').replace(/[^\p{L}\p{N}._-]+/gu,'-').replace(/^\.+/,'').slice(0,120)||fallback;
}

function assetPathMap(assets){
  const out=new Map(),used=new Set();
  for(const asset of normalizeAssets(assets||[])){
    let filename=String(asset.filename||asset.name||'asset').replace(/\\/g,'/').split('/').pop()||'asset';
    if(!/\.[a-z0-9]{1,8}$/i.test(filename)){
      const dataMime=String(asset.type||asset.data?.match?.(/^data:([^;,]+)/i)?.[1]||'').toLowerCase();
      const ext=extensionFromMime(dataMime)!=='bin'?extensionFromMime(dataMime):({image:'png',video:'mp4',audio:'mp3',font:'woff2',document:'pdf'}[String(asset.kind||'').toLowerCase()]||'bin');
      filename+='.'+ext;
    }
    filename=safeAssetFilename(filename,'asset.bin');
    let path=`assets/${filename}`;const dot=filename.lastIndexOf('.'),stem=dot>0?filename.slice(0,dot):filename,ext=dot>0?filename.slice(dot):'';let n=2;
    while(used.has(path.toLowerCase())){path=`assets/${stem}-${n++}${ext}`}
    used.add(path.toLowerCase());out.set(asset.id,path);
  }
  return out;
}

function assetFileMap(project,resources={}){
  const map=new Map();const byAssetId=resources.byAssetId instanceof Map?resources.byAssetId:new Map();const desired=assetPathMap(project.assets);
  for(const asset of normalizeAssets(project.assets)){const fetched=byAssetId.get(asset.id);if(assetBytes(asset.data)||fetched?.bytes)map.set(asset.id,fetched?.path||desired.get(asset.id));}
  return map;
}
function pageFileMap(project){const used=new Set(['index.html','styles.css','script.js','project.json','README.md','site.json','manifest.webmanifest','robots.txt','sitemap.xml','404.html']);const map=new Map();for(const [index,page] of project.pages.entries()){if(index===0){map.set(page.id,'index.html');continue}const base=safeName(page.slug||page.name)||`page-${index+1}`;let file=`${base}.html`,n=2;while(used.has(file))file=`${base}-${n++}.html`;used.add(file);map.set(page.id,file)}return map}
function hashText(value){let h=2166136261;for(const c of String(value))h=Math.imul(h^c.charCodeAt(0),16777619);return (h>>>0).toString(16).padStart(8,'0')}
function extensionFromMime(mime=''){const type=String(mime).toLowerCase().split(';')[0];const map={'image/jpeg':'jpg','image/png':'png','image/gif':'gif','image/webp':'webp','image/avif':'avif','image/svg+xml':'svg','video/mp4':'mp4','video/webm':'webm','audio/mpeg':'mp3','audio/wav':'wav','audio/ogg':'ogg','font/woff':'woff','font/woff2':'woff2','application/pdf':'pdf'};return map[type]||'bin'}
function extensionFromUrl(url=''){try{const name=decodeURIComponent(new URL(url,globalThis.location?.href||'https://example.invalid/').pathname.split('/').pop()||'');const match=name.match(/\.([a-z0-9]{1,8})$/i);return match?match[1].toLowerCase():''}catch{return ''}}
function guessKindFromUrl(url='',fallback='image'){const ext=extensionFromUrl(url);if(['mp4','webm','ogv','mov','m4v'].includes(ext))return 'video';if(['mp3','wav','ogg','weba','m4a','aac'].includes(ext))return 'audio';if(['woff','woff2','ttf','otf'].includes(ext))return 'font';if(['pdf','txt','zip','doc','docx'].includes(ext))return 'document';return fallback}
function mediaPath(url,mime='',fallback='image'){const ext=extensionFromMime(mime)==='bin'?(extensionFromUrl(url)||'bin'):extensionFromMime(mime);return `assets/external-${hashText(url)}.${ext}`}
function addCandidate(candidates,url,kind='image',preferredPath='',assetId=''){
  const raw=String(url||'').trim();if(!/^(?:https?:|blob:)/i.test(raw))return;
  let entry=candidates.get(raw);if(!entry){entry={url:raw,kinds:new Set(),preferredPath:'',assetIds:[]};candidates.set(raw,entry)}
  entry.kinds.add(kind||'image');if(preferredPath&&!entry.preferredPath)entry.preferredPath=preferredPath;if(assetId&&!entry.assetIds.includes(assetId))entry.assetIds.push(assetId);
}
function extractCssUrls(value){const out=[];const text=String(value||'');const re=/url\(\s*(['"]?)(https?:\/\/[^)'"\s]+|blob:[^)'"\s]+)\1\s*\)/gi;let match;while((match=re.exec(text)))out.push(match[2]);return out}
function walkNodes(nodes,fn){for(const node of nodes||[]){fn(node);walkNodes(node.children,fn)}}
function collectMediaCandidates(project){
  const candidates=new Map();const localPaths=assetPathMap(project.assets);
  for(const asset of normalizeAssets(project.assets)){
    if(assetBytes(asset.data)){
      if(/^https?:/i.test(asset.url||''))addCandidate(candidates,asset.url,asset.kind,localPaths.get(asset.id),asset.id);
      continue;
    }
    const raw=/^(?:https?:|blob:)/i.test(asset.data||'')?asset.data:asset.url;
    if(raw)addCandidate(candidates,raw,asset.kind,localPaths.get(asset.id),asset.id);
  }
  const visitNode=node=>{
    const p=node.props||{};const add=(value,kind='image')=>{if(typeof value==='string')addCandidate(candidates,value,kind)};
    if(node.type==='image'){add(p.src||p.url,'image')}
    else if(node.type==='gallery'){for(const item of (Array.isArray(p.images)?p.images:Array.isArray(p.items)?p.items:[]))add(typeof item==='string'?item:(item?.src||item?.image),'image')}
    else if(node.type==='avatar'||node.type==='logo'){add(p.src,'image')}
    else if(node.type==='image-text'||node.type==='hero-split'){add(p.image,'image')}
    else if(node.type==='video'){add(p.src,'video');if(/\.(?:mp4|webm|mov|m4v)(?:[?#]|$)/i.test(p.url||''))add(p.url,'video')}
    else if(node.type==='audio'){add(p.src,'audio')}
    else if(node.type==='download'||node.type==='file'){if(/\.(?:pdf|zip|txt|docx?|xlsx?|pptx?|png|jpe?g|webp)(?:[?#]|$)/i.test(p.url||''))add(p.url,'document')}
    else if(['blog-grid','product-grid','portfolio-grid','testimonial-carousel','filterable-gallery'].includes(node.type)){
      for(const item of (Array.isArray(p.items)?p.items:[]))if(item&&typeof item==='object')add(item.image||item.src,'image');
    }
    // Walk every props object so media in newer/third-party-like component records is exported too.
    const mediaKey=key=>/(?:^|_)(?:src|image|images|poster|cover|thumbnail|favicon|logo|backgroundimage|audio|video|font|mediaurl|downloadurl)$/i.test(String(key).replace(/[A-Z]/g,m=>'_'+m.toLowerCase()))||['src','image','images','poster','cover','thumbnail','favicon','logo','audio','video','font','mediaUrl','downloadUrl'].includes(key);
    const walkMedia=(value,key='',seen=new Set())=>{if(typeof value==='string'){if(mediaKey(key))addCandidate(candidates,value,guessKindFromUrl(value,'image'));return}if(!value||typeof value!=='object'||seen.has(value))return;seen.add(value);if(Array.isArray(value)){value.forEach(item=>walkMedia(item,key,seen));return}for(const [childKey,child] of Object.entries(value))walkMedia(child,childKey,seen)};
    walkMedia(p);
    for(const style of [node.style,node.responsive?.desktop,node.responsive?.tablet,node.responsive?.mobile])for(const value of Object.values(style||{}))for(const url of extractCssUrls(value))addCandidate(candidates,url,guessKindFromUrl(url,'image'));
  };
  for(const page of project.pages||[])walkNodes(page.nodes,visitNode);
  const cms=project.cms;
  const scanCms=value=>{if(!value||typeof value!=='object')return;if(Array.isArray(value)){value.forEach(scanCms);return}for(const [key,child] of Object.entries(value)){if(typeof child==='string'&&['image','src','poster','cover','thumbnail'].includes(key.toLowerCase()))addCandidate(candidates,child,'image');else scanCms(child)}};
  scanCms(cms);
  if(project.site?.favicon)addCandidate(candidates,project.site.favicon,'image');
  for(const style of [project.theme,project.styleLibrary]){const scan=value=>{if(!value||typeof value!=='object')return;for(const [key,child] of Object.entries(value)){if(typeof child==='string'){for(const url of extractCssUrls(child))addCandidate(candidates,url,guessKindFromUrl(url,'image'))}else scan(child)}};scan(style)}
  return candidates;
}
async function fetchCandidate(entry){
  const failures=[];const controller=typeof AbortController!=='undefined'?new AbortController():null;const timer=controller?setTimeout(()=>controller.abort(),9000):null;
  try{
    const response=await fetch(entry.url,{mode:'cors',credentials:'omit',cache:'force-cache',signal:controller?.signal});
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    if(response.type==='opaque')throw new Error('المصدر لا يسمح بالتنزيل عبر CORS');
    const mime=(response.headers.get('content-type')||'').split(';')[0].trim().toLowerCase();
    const expected=[...entry.kinds];const inferred=guessKindFromUrl(entry.url,'');
    const compatible=(kind)=>kind==='image'?mime.startsWith('image/'):kind==='video'?mime.startsWith('video/'):kind==='audio'?mime.startsWith('audio/'):kind==='font'?mime.startsWith('font/')||/woff|octet-stream/.test(mime):kind==='document'?(/pdf|text\/|zip|officedocument|octet-stream/.test(mime)):true;
    if(expected.some(kind=>!compatible(kind))&&mime&&!/octet-stream/.test(mime))throw new Error(`نوع محتوى غير متوقع: ${mime}`);
    const declared=Number(response.headers.get('content-length')||0);if(declared>12*1024*1024)throw new Error('حجم الملف أكبر من حد التضمين 12MB');
    const buffer=await response.arrayBuffer();if(buffer.byteLength>12*1024*1024)throw new Error('حجم الملف أكبر من حد التضمين 12MB');
    const bytes=new Uint8Array(buffer);const path=entry.preferredPath||mediaPath(entry.url,mime,inferred||expected[0]||'image');
    return {url:entry.url,path,bytes,mime,assetIds:entry.assetIds,ok:true};
  }catch(error){return {url:entry.url,assetIds:entry.assetIds,ok:false,reason:error?.name==='AbortError'?'انتهت مهلة الاتصال':String(error?.message||'تعذر تنزيل الملف')}}finally{if(timer)clearTimeout(timer)}
}
async function collectExportResources(project){
  const candidates=collectMediaCandidates(project);const entries=[...candidates.values()];const results=[];let next=0;
  const workers=Array.from({length:Math.min(4,entries.length)},async()=>{while(next<entries.length){const entry=entries[next++];results.push(await fetchCandidate(entry))}});await Promise.all(workers);
  const byUrl=new Map(),byAssetId=new Map(),external=[];let total=0;
  for(const item of results){if(!item.ok){external.push(item);continue}total+=item.bytes.length;if(total>80*1024*1024){external.push({...item,ok:false,reason:'تجاوز مجموع الوسائط حد التضمين 80MB'});total-=item.bytes.length;continue}byUrl.set(item.url,{path:item.path,bytes:item.bytes,mime:item.mime});for(const id of item.assetIds||[])byAssetId.set(id,{path:item.path,bytes:item.bytes,mime:item.mime})}
  for(const asset of normalizeAssets(project.assets)){
    const bytes=assetBytes(asset.data);if(!bytes)continue;
    const path=assetPathMap(project.assets).get(asset.id)||`assets/${safeAssetFilename(asset.filename||asset.name+'.bin')}`;
    if(/^https?:/i.test(asset.url||''))byUrl.set(asset.url,{path,bytes,mime:asset.type});
    if(/^https?:/i.test(asset.data||''))byUrl.set(asset.data,{path,bytes,mime:asset.type});
  }
  const resourceMap=new Map([...byUrl.entries()].map(([url,item])=>[url,item.path]));
  return {byUrl,byAssetId,resourceMap,external};
}
function walk(nodes,fn){(nodes||[]).forEach(node=>{fn(node);walk(node.children,fn)})}
function responsiveCss(project){
  const rules=[];
  const sizes={tablet:{query:'@media (max-width: 900px)',width:768},mobile:{query:'@media (max-width: 640px)',width:390}};
  const important=css=>String(css||'').split(';').map(part=>part.trim()).filter(Boolean).map(part=>{const i=part.indexOf(':');return i<0?part:`${part.slice(0,i+1)}${part.slice(i+1)} !important`}).join(';');
  const cssEscape=id=>String(id).replace(/"/g,'\\"');
  for(const page of project.pages||[])walk(page.nodes,node=>{
    for(const device of ['tablet','mobile']){
      const cfg=sizes[device],selector=`[data-runtime-id="${cssEscape(node.id)}"]`;
      const deviceStyle=resolveStyle(node,device,project.theme,project.styleLibrary,project);
      const css=important(styleObjectToCss(deviceStyle));
      const ownPatch=node.responsive?.[device]||{};
      const declarations=[];
      if(css)declarations.push(css);
      if(node.visibility?.[device]===false)declarations.push('display:none!important');
      const rawWidth=deviceStyle.width;
      const widthText=typeof rawWidth==='number'?`${rawWidth}px`:String(rawWidth??'');
      const widthMatch=widthText.match(/^\s*(\d+(?:\.\d+)?)px\s*$/i);
      if(!Object.prototype.hasOwnProperty.call(ownPatch,'width')&&widthMatch&&Number(widthMatch[1])>cfg.width){declarations.push('width:100%!important','max-width:100%!important','box-sizing:border-box!important');}
      const rawPosition=node.editorPosition&&typeof node.editorPosition==='object'?node.editorPosition:{};
      const pos=rawPosition[device]&&typeof rawPosition[device]==='object'?rawPosition[device]:{};
      const px=Number.isFinite(Number(pos.x))?Math.max(-50000,Math.min(50000,Number(pos.x))):0;
      const py=Number.isFinite(Number(pos.y))?Math.max(-50000,Math.min(50000,Number(pos.y))):0;
      declarations.push(`transform:translate3d(${px}px, ${py}px, 0)!important`);
      if(declarations.length)rules.push(`${cfg.query}{${selector}{${declarations.join(';')}}}`);
    }
  });
  return rules.join('');
}
function buildExportFiles(project,resources={}){
  const map=pageFileMap(project);const assetMap=assetFileMap(project,resources);const resourceMap=resources.resourceMap instanceof Map?resources.resourceMap:new Map();
  const primary=project.theme?.primary||'#5b5ce2';const favicon=resourceMap.get(project.site?.favicon)||project.site?.favicon;
  const manifest={name:project.site?.title||project.meta.name,short_name:project.meta.name,start_url:map.get(project.pages?.[0]?.id)||'index.html',display:'standalone',background_color:project.theme?.surface||'#fff',theme_color:primary,lang:project.site?.language||'ar',dir:project.site?.direction||'rtl',icons:favicon?[{src:favicon,sizes:'any',type:'image/png'}]:[]};
  const externalList=(resources.external||[]).filter(item=>item?.url).map(item=>`- ${item.url}\n  - السبب: ${item.reason||'المصدر لم يسمح بالتضمين'}`);
  const files={
    'index.html':null,
    'styles.css':stylesheet(project.theme,project,resourceMap),
    'script.js':runtimeJs(project,map,assetMap,resourceMap),
    'project.json':JSON.stringify(deepClone(project),null,2),
    'site.json':JSON.stringify({site:project.site,navigation:project.navigation,release:project.release},null,2),
    'manifest.webmanifest':JSON.stringify(manifest,null,2),
    'robots.txt':robotsTxt(project),'sitemap.xml':sitemapXml(project,map),'404.html':null,
    'EXTERNAL_RESOURCES.md':externalList.length?`# وسائط خارجية لم يمكن تضمينها

بقيت هذه العناوين كما هي في الموقع لأن المصدر منع التنزيل أو فشل الاتصال. تحتاج إلى إنترنت كي تعمل.

${externalList.join('\n')}`:'# لا توجد وسائط خارجية فشل تضمينها في وقت التصدير. روابط التنقل الخارجية تظل روابط كما هي.',
    'README.md':`# ${project.meta.name}

موقع متعدد الصفحات مُنشأ بواسطة بَنّاء Bunaa Studio V35.

## التشغيل
افتح index.html في المتصفح أو ارفع كل ملفات هذه الحزمة إلى استضافة موقع ثابتة مع الحفاظ على بنية المجلدات.

## محتويات الحزمة
- ملفات HTML لجميع الصفحات وروابط محلية فيما بينها.
- styles.css وscript.js للتنسيق والتفاعلات.
- مجلد assets للوسائط التي أمكن تضمينها.
- بيانات المشروع وSEO وmanifest وrobots وsitemap.
- EXTERNAL_RESOURCES.md يوضح أي وسائط تعذر تنزيلها.

الروابط الخارجية التي تقود إلى مواقع أخرى تبقى روابط ويب مقصودة ولا يتم تنزيل مواقع الطرف الثالث بأكملها. أما الصور والفيديو والصوت والخطوط والملفات المشار إليها في عناصر الموقع أو CSS فتُضمَّن داخل assets إذا كان الخادم يسمح بجلبها عبر CORS وحجمها ضمن حدود التضمين. إذا منع الخادم ذلك، فسيظل الرابط الأصلي ظاهرًا في EXTERNAL_RESOURCES.md. الصور المحلية/data URI وملفات المشروع المرفوعة تُحفظ في الحزمة.`
  };
  for(const page of project.pages||[])files[map.get(page.id)]=null;
  for(const asset of normalizeAssets(project.assets||[])){
    const path=assetMap.get(asset.id);if(!path)continue;
    const data=resources.byAssetId?.get?.(asset.id)?.bytes||assetBytes(asset.data);if(data)files[path]=data;
  }
  for(const [url,entry] of resources.byUrl||[]){if(entry?.path&&entry?.bytes)files[entry.path]=entry.bytes}
  return {map,assetMap,resourceMap,files};
}

function robotsTxt(project){const policy=project.site?.indexing?.robots||'index,follow';const disallow=policy.includes('noindex')?'/':'';const lines=['User-agent: *',`Disallow: ${disallow}`];if(project.site?.baseUrl&&project.site?.indexing?.sitemap!==false)lines.push(`Sitemap: ${project.site.baseUrl.replace(/\/$/,'')}/sitemap.xml`);return lines.join('\n')}
function sitemapXml(project,map){const base=String(project.site?.baseUrl||'').replace(/\/$/,'');const urls=(project.pages||[]).filter(p=>!p.settings?.hidden&&!p.seo?.noIndex).map(page=>{const file=map.get(page.id)||'index.html';const loc=base?`${base}/${file}`.replace(/\/index\.html$/,'/'):file;return `<url><loc>${escapeXml(loc)}</loc></url>`}).join('');return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`}
function escapeXml(value){return String(value??'').replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]))}
function buildPageHtml(page,project,map=pageFileMap(project),assetMap=assetFileMap(project),resourceMap=new Map()){
  const body=(page.nodes||[]).map(node=>nodeHtml(node,project.theme,project,'desktop',map,assetMap,resourceMap)).join('');
  const menu=project.navigation?.menus?.find(m=>m.id===project.navigation?.headerMenuId);
  const items=menu?.items?.length?menu.items:(project.pages||[]).filter(p=>p.settings?.showInNav!==false&&!p.settings?.hidden).map(p=>({label:p.name,type:'page',targetId:p.id}));
  const nav=items.map(item=>{const target=project.pages.find(p=>p.id===item.targetId);const href=item.type==='url'?safeUrl(item.url||'#'):(target?map.get(target.id):'#');return `<a href="${escapeHtml(href||'#')}"${item.newTab?' target="_blank" rel="noopener noreferrer"':''}>${escapeHtml(item.label||target?.name||'رابط')}</a>`}).join('');
  const site=project.site||{};const noindex=page.seo?.noIndex||site.indexing?.robots?.includes('noindex');
  const canonical=page.seo?.canonical||((site.baseUrl&&page===project.pages[0])?site.baseUrl:`${String(site.baseUrl||'').replace(/\/$/,'')}/${page.slug||''}`);
  const faviconRaw=site.favicon||'';const faviconUrl=resourceMap.get(faviconRaw)||faviconRaw;const favicon=faviconUrl?`<link rel="icon" href="${escapeHtml(faviconUrl)}">`:'';
  return `<!doctype html><html lang="${escapeHtml(site.language||'ar')}" dir="${escapeHtml(site.direction||'rtl')}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="${escapeHtml(page.seo?.description||site.description||'')}">${noindex?'<meta name="robots" content="noindex,nofollow">':''}${canonical?`<link rel="canonical" href="${escapeHtml(canonical)}">`:''}<meta property="og:title" content="${escapeHtml(page.seo?.title||page.name)}"><meta property="og:description" content="${escapeHtml(page.seo?.description||site.description||'')}">${favicon}<meta name="generator" content="Bunaa Studio V35"><link rel="manifest" href="manifest.webmanifest"><link rel="stylesheet" href="styles.css"><title>${escapeHtml(page.seo?.title||page.name)}</title></head><body><header class="export-site-nav"><strong>${escapeHtml(site.brand?.name||project.meta.name)}</strong><nav>${nav}</nav></header><main data-page-id="${escapeHtml(page.id)}">${body}</main><script src="script.js">\u003c/script></body></html>`;
}
function runtimeJs(project,map=pageFileMap(project),assetMap=assetFileMap(project),resourceMap=new Map()){
  const interactions=(project.interactions||[]).filter(i=>i.enabled!==false).map(i=>({
    ...i,steps:Array.isArray(i.steps)&&i.steps.length?i.steps:[{action:i.action||'motion',options:i.options||{},delay:0}]
  }));
  const pages=project.pages.map(p=>({id:p.id,file:map.get(p.id)||''}));
  return `(()=>{'use strict';
const interactions=${JSON.stringify(interactions)};
const assets=${JSON.stringify(normalizeAssets(project.assets).map(a=>({id:a.id,url:assetMap.get(a.id)||resourceMap.get(a.url)||a.url||a.data||'',filename:a.filename,name:a.name,kind:a.kind}))).replace(/<\/script/gi,'<\\/script')};
const pages=${JSON.stringify(pages)};
const assetById=id=>assets.find(a=>a.id===String(id||''))||null;
const findNode=id=>Array.from(document.querySelectorAll('[data-runtime-id]')).find(n=>n.dataset.runtimeId===String(id||''))||null;
const eventTarget=(source,type)=>['input','change','focus','blur','keydown','submit'].includes(type)?(source.querySelector('input,textarea,select,button,form')||source):(['play','pause','ended'].includes(type)?(source.querySelector('audio,video')||source):source);
const visible=el=>{if(!el)return false;const cs=getComputedStyle(el);return !el.hidden&&cs.display!=='none'&&cs.visibility!=='hidden'};
const motion=(el,name='fade',duration=420)=>{if(!el)return;const names=new Set(['fade','slide','zoom','pulse','glow','lift','shake','bounce','spin']);const safe=names.has(name)?name:'fade';el.classList.remove(...Array.from(el.classList).filter(x=>x.startsWith('motion-')));void el.offsetWidth;el.style.animationDuration=Math.max(0,Math.min(10000,Number(duration)||420))+'ms';el.classList.add('motion-'+safe);el.addEventListener('animationend',()=>{el.classList.remove('motion-'+safe);el.style.animationDuration='';},{once:true})};
const toast=(message,duration=2200)=>{document.querySelector('[data-bunaa-toast]')?.remove();const el=document.createElement('div');el.dataset.bunaaToast='1';el.textContent=String(message||'تم التنفيذ');el.style.cssText='position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2147483000;padding:11px 16px;border-radius:12px;background:#171b2a;color:#fff;font:700 13px system-ui;box-shadow:0 16px 40px rgba(0,0,0,.2)';document.body.appendChild(el);setTimeout(()=>el.remove(),Math.max(400,Number(duration)||2200))};
const valueOf=(target,event)=>{const f=event?.target?.matches?.('input,textarea,select')?event.target:target?.querySelector?.('input,textarea,select');if(f){if(f.type==='checkbox'||f.type==='radio')return f.checked?'true':'false';return String(f.value??'')}return String(target?.textContent||'').trim()};
const condition=(i,event,source)=>{const c=i.condition||{type:'always'};if(c.type==='always')return true;const actual=valueOf(source,event);if(c.type==='not-empty')return actual.trim()!=='';if(c.type==='visible')return visible(source);if(c.type==='value'){const v=String(c.value??'');if(c.operator==='equals')return actual===v;if(c.operator==='not-equals')return actual!==v;if(c.operator==='starts')return actual.startsWith(v);if(c.operator==='ends')return actual.endsWith(v);return actual.includes(v)}if(c.type==='key')return String(event?.key||'')===String(c.value||'');return true};
const run=async(item,event,source)=>{if(!condition(item,event,source))return;for(const step of item.steps||[]){const o=step.options||{};if(step.delay)await new Promise(r=>setTimeout(r,Math.min(10000,Number(step.delay)||0)));const target=findNode(o.targetId)||source;switch(step.action){case'motion':motion(target,o.motion,o.duration);break;case'show':target.hidden=false;break;case'hide':target.hidden=true;break;case'toggle':target.hidden=!target.hidden;break;case'scroll':target.scrollIntoView?.({behavior:'smooth',block:'center'});break;case'page':{const p=pages.find(x=>x.id===o.pageId);if(p)location.href=p.file;break}case'url':{const u=String(o.url||'');if(/^(https?:|mailto:|tel:)/i.test(u)){if(o.newTab)window.open(u,'_blank','noopener');else location.href=u}break}case'addClass':if(o.className)target.classList.add(o.className);break;case'removeClass':if(o.className)target.classList.remove(o.className);break;case'toggleClass':if(o.className)target.classList.toggle(o.className);break;case'style':if(o.property&&/^[a-zA-Z-]+$/.test(o.property))target.style.setProperty(o.property,String(o.value??''));break;case'setText':target.textContent=String(o.text??'');break;case'setAttribute':if(o.attribute)target.setAttribute(String(o.attribute),String(o.attributeValue??''));break;case'removeAttribute':if(o.attribute)target.removeAttribute(String(o.attribute));break;case'toggleAttribute':if(o.attribute)target.toggleAttribute(String(o.attribute));break;case'focus':target.focus?.();break;case'blur':target.blur?.();break;case'submit':{const form=target.tagName==='FORM'?target:(target.closest?.('form')||target.querySelector?.('form'));if(form?.requestSubmit)form.requestSubmit();else form?.submit?.();break}case'toast':toast(o.message,o.toastDuration);break;case'copy':{try{await navigator.clipboard.writeText(String(o.text||valueOf(target,event)));toast('تم النسخ')}catch{}}break;case'mediaPlay':{const m=target.querySelector?.('audio,video')||target;m.play?.().catch?.(()=>{});break}case'mediaPause':{const m=target.querySelector?.('audio,video')||target;m.pause?.();break}case'openAsset':{const a=assetById(o.assetId);if(a?.url)window.open(a.url,'_blank','noopener');break}case'downloadAsset':{const a=assetById(o.assetId);if(a?.url){const link=document.createElement('a');link.href=a.url;link.download=a.filename||a.name||'download';document.body.appendChild(link);link.click();link.remove()}break}case'setMedia':{const a=assetById(o.assetId);if(!a?.url)break;target.querySelector?.('img')?.setAttribute('src',a.url);target.querySelector?.('video')?.setAttribute('src',a.url);target.querySelector?.('audio')?.setAttribute('src',a.url);break}}}};
const fired=new WeakMap();const now=()=>Date.now();
const fire=(item,event,source)=>{const prev=fired.get(source)||{};const t=now();if(item.once&&prev[item.id]?.fired)return;if(item.cooldown&&prev[item.id]&&t-prev[item.id].last<item.cooldown)return;fired.set(source,{...prev,[item.id]:{last:t,fired:true}});if(item.preventDefault)event?.preventDefault?.();if(item.stopPropagation)event?.stopPropagation?.();run(item,event,source).catch(()=>{})};
interactions.forEach(item=>{const source=findNode(item.sourceId);if(!source)return;const target=eventTarget(source,item.trigger);if(item.trigger==='load'){setTimeout(()=>fire(item,{currentTarget:source},source),60);return}if(item.trigger==='enterViewport'&&'IntersectionObserver'in globalThis){new IntersectionObserver(es=>{if(es.some(e=>e.isIntersecting))fire(item,{currentTarget:source},source)},{threshold:.15}).observe(source);return}if(item.trigger==='scroll'){window.addEventListener('scroll',()=>{if(visible(source))fire(item,{currentTarget:source},source)},{passive:true});return}target.addEventListener(item.trigger==='hover'?'pointerenter':item.trigger==='hoverleave'?'pointerleave':item.trigger,e=>{const takesNavigation=(item.steps||[]).some(step=>['page','url'].includes(step.action));if(['click','dblclick','contextmenu'].includes(item.trigger)&&((target.tagName==='A'&&item.trigger==='click')||takesNavigation))e.preventDefault();fire(item,e,source)});});
let cartCount=0;const feedback=(message)=>{let toastNode=document.querySelector('[data-bunaa-cart-status]');if(!toastNode){toastNode=document.createElement('div');toastNode.dataset.bunaaCartStatus='1';toastNode.setAttribute('role','status');toastNode.setAttribute('aria-live','polite');toastNode.style.cssText='position:fixed;bottom:18px;inset-inline-end:18px;z-index:9999;padding:10px 14px;border-radius:10px;background:#171b2a;color:#fff;font:600 13px system-ui;box-shadow:0 12px 28px rgba(0,0,0,.2)';document.body.appendChild(toastNode)}toastNode.textContent=message};
document.addEventListener('click',event=>{const filter=event.target.closest('[data-portfolio-filter]');if(filter){event.preventDefault();const host=filter.closest('.built-portfolio');if(!host)return;const wanted=filter.dataset.portfolioFilter||'الكل';host.querySelectorAll('[data-portfolio-filter]').forEach(b=>b.setAttribute('aria-pressed',b===filter?'true':'false'));host.querySelectorAll('[data-portfolio-category]').forEach(card=>{card.hidden=wanted!=='الكل'&&card.dataset.portfolioCategory!==wanted});return}const move=event.target.closest('[data-carousel-move]');if(move){event.preventDefault();const host=move.closest('.built-testimonial-carousel');if(!host)return;const slides=[...host.querySelectorAll('[data-carousel-slide]')];if(!slides.length)return;let index=slides.findIndex(slide=>!slide.hidden);index=(index+Number(move.dataset.carouselMove||0)+slides.length)%slides.length;slides.forEach((slide,i)=>slide.hidden=i!==index);const status=host.querySelector('[data-carousel-status]');if(status)status.textContent=String(index+1)+' / '+String(slides.length);return}const tab=event.target.closest('[data-tab-index]');if(tab){const host=tab.closest('.built-tabs');if(!host)return;host.querySelectorAll('[data-tab-index]').forEach(button=>button.classList.toggle('active',button===tab));host.querySelectorAll('[data-tab-panel]').forEach(panel=>panel.hidden=panel.dataset.tabPanel!==tab.dataset.tabIndex);return}const add=event.target.closest('[data-cart-add]');if(add){event.preventDefault();cartCount+=1;window.__BUNAA_CART={count:cartCount,items:[...(window.__BUNAA_CART?.items||[]),{id:add.dataset.cartAdd,name:add.dataset.cartName}]};add.textContent='أضيفت ✓';add.setAttribute('aria-pressed','true');feedback('أضيف إلى السلة: '+(add.dataset.cartName||'منتج')+' — العدد '+cartCount);return}const back=event.target.closest('[data-back-to-top]');if(back){event.preventDefault();window.scrollTo({top:0,behavior:'smooth'});return}const cookie=event.target.closest('[data-cookie-dismiss]');if(cookie){event.preventDefault();cookie.closest('.built-cookie')?.remove();try{localStorage.setItem('bunaa-cookie-consent','accepted')}catch{}return}});
document.addEventListener('submit',event=>{const form=event.target.closest('form[data-local-contact-form]');if(!form)return;event.preventDefault();const status=form.querySelector('[data-form-status]');if(!form.checkValidity()){form.reportValidity?.();if(status)status.textContent='راجع الحقول المطلوبة والبريد الإلكتروني.';return}if(status)status.textContent='تم التحقق من الحقول محليًا. لإرسال البيانات فعليًا إلى بريد أو CRM، اربط النموذج بخدمة إرسال أو بخادم.';form.dataset.validated='true';feedback('تم التحقق من النموذج. لم يتم إرسال بيانات إلى خادم.');});
})();`;}
function stylesheet(theme={},project={},resourceMap=new Map()){const primary=theme.primary||'#5b5ce2',text=theme.text||'#171b2a';const css=`*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;font-family:${theme.font||'system-ui'},-apple-system,"Segoe UI",Tahoma,Arial,sans-serif;color:${text};line-height:1.6;background:${theme.surface||'#fff'};${themeCss(theme)}}main{width:100%;margin:0 auto}.export-site-nav{position:sticky;top:0;z-index:20;width:100%;display:flex;gap:20px;align-items:center;justify-content:space-between;padding:14px 22px;border-bottom:1px solid var(--b-line);background:color-mix(in srgb,var(--b-surface,#fff) 92%,transparent);backdrop-filter:blur(12px)}.export-site-nav nav{display:flex;gap:14px;flex-wrap:wrap}.export-site-nav a{color:var(--b-primary,${primary});text-decoration:none}.node-wrap{display:block;width:100%}.built-button{display:inline-flex;padding:11px 20px;background:var(--b-primary,${primary});color:#fff;border-radius:11px;text-decoration:none;font-weight:800}.built-card,.built-product,.built-testimonial{padding:18px;border:1px solid var(--b-line,#e7e9ef);border-radius:14px;background:var(--b-surface,#fff);box-shadow:var(--b-shadowSoft,none)}.built-nav{display:flex;justify-content:space-between;align-items:center;gap:16px}.nav-links,.built-social{display:flex;gap:16px;flex-wrap:wrap}.built-nav a,.built-social a{color:var(--b-primary,${primary});text-decoration:none}.built-gallery{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.built-gallery img{width:100%;height:220px;object-fit:cover;border-radius:12px}.built-stats,.built-pricing,.built-timeline{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.built-stats>div,.built-pricing>div,.built-timeline>div{padding:16px;border:1px solid var(--b-line,#e7e9ef);border-radius:12px;background:var(--b-surface,#fff)}.built-progress{height:32px;background:#eef0f5;border-radius:10px;overflow:hidden;position:relative}.built-progress>div{height:100%;background:var(--b-primary,${primary})}.motion-fade{animation:fade .7s ease}.motion-slide{animation:slide .7s ease}.motion-zoom{animation:zoom .7s ease}.motion-pulse{animation:pulse 1.1s ease}.motion-glow{animation:glow .9s ease}.motion-lift{animation:lift .28s ease}.motion-shake{animation:shake .45s ease}.motion-bounce{animation:bounce .6s ease}.motion-spin{animation:spin .65s ease}@keyframes fade{from{opacity:.2}to{opacity:1}}@keyframes slide{from{transform:translateY(14px);opacity:.2}to{transform:translateY(0);opacity:1}}@keyframes zoom{from{transform:scale(.96);opacity:.2}to{transform:scale(1);opacity:1}}@keyframes pulse{50%{transform:scale(1.03)}}@keyframes glow{50%{box-shadow:0 0 0 6px rgba(91,92,226,.13)}}@keyframes lift{from{transform:translateY(0)}50%{transform:translateY(-6px)}to{transform:translateY(0)}}@keyframes shake{20%{transform:translateX(-4px)}40%{transform:translateX(4px)}60%{transform:translateX(-3px)}80%{transform:translateX(3px)}}@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}@keyframes spin{to{transform:rotate(360deg)}} .built-hero-split{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:center;gap:28px;padding:clamp(18px,4vw,48px);border-radius:18px}.built-hero-copy h1{font-size:clamp(30px,4vw,54px);line-height:1.12}.built-hero-media{min-height:220px;aspect-ratio:4/3;overflow:hidden;border-radius:15px}.built-hero-media img,.built-content-card>img,.built-product-listing>img,.built-portfolio-item img{display:block;width:100%;height:100%;object-fit:cover}.built-blog-grid,.built-product-grid,.built-portfolio-grid,.built-process-steps{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.built-content-card,.built-product-listing,.built-process-steps li{min-width:0;overflow:hidden;border:1px solid var(--b-line,#e7e9ef);border-radius:14px;background:var(--b-surface,#fff)}.built-content-card>img,.built-product-listing>img{aspect-ratio:16/10;height:auto}.built-content-card-body,.built-product-actions{padding:14px;display:grid;gap:9px}.built-product-listing{display:flex;flex-direction:column;gap:8px;padding-bottom:12px}.built-product-listing>h3,.built-product-listing>p,.built-product-listing>strong,.built-product-listing>small{margin-inline:12px}.built-product-actions{grid-template-columns:1fr 1fr}.built-cart-add,.built-portfolio-filters button,.built-carousel-controls button{border:1px solid var(--b-line,#e7e9ef);border-radius:9px;padding:9px;background:#fff;cursor:pointer}.built-portfolio,.built-contact-form,.built-newsletter,.built-lead-form,.built-faq-list,.built-testimonial-carousel{display:grid;gap:12px}.built-portfolio-filters{display:flex;flex-wrap:wrap;gap:8px}.built-portfolio-filters button[aria-pressed=true]{background:var(--b-primary,#5b5ce2);color:#fff}.built-portfolio-item{min-width:0;position:relative;aspect-ratio:4/3;overflow:hidden;border-radius:12px;color:inherit;text-decoration:none}.built-portfolio-item[hidden],.built-testimonial-slide[hidden],.built-tabs [data-tab-panel][hidden]{display:none!important}.built-portfolio-item>span{position:absolute;inset-inline:8px;bottom:8px;padding:9px;border-radius:8px;background:#ffffffed;color:#171b2a;display:grid}.built-testimonial-slide{margin:0;padding:24px;border:1px solid var(--b-line,#e7e9ef);border-radius:14px}.built-carousel-controls{display:flex;justify-content:center;align-items:center;gap:14px}.built-contact-form input,.built-contact-form textarea,.built-newsletter input,.built-lead-form input{width:100%;max-width:100%;padding:11px;border:1px solid var(--b-line,#e7e9ef);border-radius:9px;font:inherit}.built-contact-form form,.built-newsletter form,.built-lead-form form{display:grid;gap:10px}.built-form-status{margin:0;padding:8px;border-radius:8px}.built-process-steps{list-style:none;padding:0}.built-process-steps li{padding:18px;display:grid;gap:8px}.built-trust-bar{display:grid;gap:12px;text-align:center}.built-trust-logos{display:flex;justify-content:space-evenly;flex-wrap:wrap;gap:16px}.built-faq-list details{padding:14px;border:1px solid var(--b-line,#e7e9ef);border-radius:10px}.built-faq-list summary{font-weight:800;cursor:pointer}.built-tabs [data-tab-index]{padding:8px 12px;border:1px solid var(--b-line,#e7e9ef);border-radius:8px;background:#fff;cursor:pointer}.built-tabs [data-tab-index].active{background:var(--b-primary,#5b5ce2);color:#fff}.built-tabs [data-tab-panel]{padding:12px}.node-wrap[data-explicit-size="1"]{max-width:none!important}@media(max-width:760px){.built-hero-split{grid-template-columns:1fr!important}.built-blog-grid,.built-product-grid,.built-portfolio-grid,.built-process-steps{grid-template-columns:1fr!important}.built-hero-media{min-height:180px}.built-product-actions{grid-template-columns:1fr 1fr}} 
.built-team-items,.built-service-items,.built-bento-items,.built-review-items{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.built-team-card,.built-service-card,.built-bento-card,.built-review-card{min-width:0;overflow:hidden;padding:18px;border:1px solid var(--line,#e5e8ef);border-radius:15px;background:var(--surface,#fff);box-shadow:0 8px 24px rgba(22,28,50,.05)}.built-team-card>img,.built-bento-card>img{display:block;width:100%;height:auto;aspect-ratio:4/3;object-fit:cover;border-radius:10px;margin-bottom:12px}.built-team-card h3,.built-service-card h3,.built-bento-card h3{margin:5px 0}.built-team-card small,.built-event-card small,.built-job-card small{color:var(--muted,#737b8e)}.built-service-card>span{display:grid;place-items:center;width:42px;height:42px;border-radius:12px;background:color-mix(in srgb,var(--primary,#5b5ce2) 12%,white);color:var(--primary,#5b5ce2);font-size:23px}.built-service-card>a,.built-bento-card>a{display:inline-flex;margin-top:12px;color:var(--primary,#5b5ce2);font-weight:800;text-decoration:none}.built-bento-card:nth-child(1){grid-column:span 2}.built-bento-card:nth-child(1)>img{aspect-ratio:16/7}.built-logo-cloud-items{display:flex;align-items:center;justify-content:space-evenly;flex-wrap:wrap;gap:18px}.built-logo-cloud-item{display:grid;place-items:center;min-width:90px;min-height:48px;padding:10px 16px;color:var(--muted,#737b8e);font-weight:900;text-decoration:none}.built-logo-cloud-item img{display:block;max-width:140px;width:auto;height:auto;max-height:48px;object-fit:contain}.built-event-list,.built-job-board{display:grid;gap:12px}.built-event-card,.built-job-card{display:grid;grid-template-columns:minmax(100px,140px) minmax(0,1fr) auto;align-items:center;gap:16px;padding:18px;border:1px solid var(--line,#e5e8ef);border-radius:14px;background:var(--surface,#fff)}.built-event-card h3,.built-job-card h3{margin:0 0 4px}.built-event-card p,.built-job-card p{margin:4px 0}.built-event-date{padding:10px;border-radius:10px;background:color-mix(in srgb,var(--primary,#5b5ce2) 9%,white);color:var(--primary,#5b5ce2);text-align:center}.built-review-card{margin:0;display:grid;align-content:start;gap:8px}.built-review-card>div{color:#e5a11a;letter-spacing:2px}.built-review-card p{margin:0;line-height:1.8}.built-review-card small{color:var(--muted,#737b8e)}
@media(max-width:760px){.built-team-items,.built-service-items,.built-bento-items,.built-review-items{grid-template-columns:minmax(0,1fr)}.built-bento-card:nth-child(1){grid-column:auto}.built-bento-card:nth-child(1)>img{aspect-ratio:4/3}.built-event-card,.built-job-card{grid-template-columns:minmax(0,1fr);align-items:stretch}.built-event-date{text-align:start}.built-logo-cloud-items{justify-content:center}}
${responsiveCss(project)}@media(max-width:760px){.built-gallery,.built-stats,.built-pricing,.built-timeline,.built-blog-grid,.built-product-grid,.built-portfolio-grid,.built-process-steps{grid-template-columns:1fr}.built-nav,.export-site-nav{align-items:flex-start;flex-direction:column}}`;return String(css).replace(/url\(\s*(['\"]?)(.*?)\1\s*\)/gi,(whole,quote,raw)=>{const key=String(raw||'').trim();const local=resourceMap?.get?.(key);return `url(\"${String(local||key).replace(/\"/g,'%22')}\")`})}
function exportZip(project){return collectExportResources(project).then(resources=>{const {map,assetMap,resourceMap,files}=buildExportFiles(project,resources);for(const page of project.pages)files[map.get(page.id)]=buildPageHtml(page,project,map,assetMap,resourceMap);files['404.html']=build404Html(project,map);const names=Object.keys(files);downloadBlob(zipBlob(files),`${safeName(project.meta.name)}-complete-site.zip`);names.externalResources=resources.external||[];names.pageCount=(project.pages||[]).length;return names;});}
function bytesToDataUrl(bytes,mime='application/octet-stream'){
  if(!bytes)return '';
  let binary='';const chunk=0x8000;for(let i=0;i<bytes.length;i+=chunk)binary+=String.fromCharCode(...bytes.subarray(i,Math.min(bytes.length,i+chunk)));
  return `data:${mime||'application/octet-stream'};base64,${btoa(binary)}`;
}
function inlineExportMaps(project,resources={}){
  const resourceMap=new Map();
  for(const [url,entry] of resources.byUrl||[]){if(entry?.bytes)resourceMap.set(url,bytesToDataUrl(entry.bytes,entry.mime||'application/octet-stream'));}
  const assetMap=new Map();
  for(const asset of normalizeAssets(project.assets||[])){
    const raw=String(asset.data||'');
    if(/^data:/i.test(raw)){assetMap.set(asset.id,raw);if(asset.url)resourceMap.set(asset.url,raw);continue;}
    const fetched=resources.byAssetId?.get?.(asset.id)||resources.byUrl?.get?.(asset.url)||resources.byUrl?.get?.(raw);
    if(fetched?.bytes){const data=bytesToDataUrl(fetched.bytes,fetched.mime||asset.type||'application/octet-stream');assetMap.set(asset.id,data);if(asset.url)resourceMap.set(asset.url,data);if(raw)resourceMap.set(raw,data);continue;}
    const mapped=resourceMap.get(raw)||resourceMap.get(asset.url)||raw||asset.url||'';
    if(mapped)assetMap.set(asset.id,mapped);
    if(/^data:/i.test(mapped)){if(asset.url)resourceMap.set(asset.url,mapped);if(raw)resourceMap.set(raw,mapped);}
  }
  return {assetMap,resourceMap};
}
function buildSingleFileHtml(project,selectedPageId,resources={}){
  const pages=project.pages||[];if(!pages.length)throw new Error('لا توجد صفحات لتصديرها.');
  const tokens=new Map(pages.map((page,index)=>[page.id,`bunaa-page-${index+1}-${hashText(page.id)}`]));
  const pageMap=new Map(pages.map(page=>[page.id,`#${tokens.get(page.id)}`]));
  const {assetMap,resourceMap}=inlineExportMaps(project,resources);
  const initialPage=pages.find(page=>page.id===selectedPageId)||pages.find(page=>page.id===project.activePageId)||pages[0];
  const sections=pages.map(page=>{
    const id=tokens.get(page.id);
    const body=(page.nodes||[]).map(node=>nodeHtml(node,project.theme,project,'desktop',pageMap,assetMap,resourceMap)).join('');
    return `<section class="bunaa-single-page" id="${escapeHtml(id)}" data-bunaa-single-page="${escapeHtml(page.id)}" ${page.id===initialPage.id?'':'hidden'}><main data-page-id="${escapeHtml(page.id)}">${body}</main></section>`;
  }).join('\n');
  const menu=project.navigation?.menus?.find(item=>item.id===project.navigation?.headerMenuId);
  const items=menu?.items?.length?menu.items:pages.filter(page=>page.settings?.showInNav!==false&&!page.settings?.hidden).map(page=>({label:page.name,type:'page',targetId:page.id}));
  const nav=items.map(item=>{
    const target=pages.find(page=>page.id===item.targetId)||pages.find(page=>page.name===item.label);
    const href=item.type==='url'?safeUrl(item.url||'#'):(target?pageMap.get(target.id):'#');
    return `<a href="${escapeHtml(href||'#')}"${target&&item.type!=='url'?` data-bunaa-page-link="${escapeHtml(tokens.get(target.id))}"`:''}${item.newTab?' target="_blank" rel="noopener noreferrer"':''}>${escapeHtml(item.label||target?.name||'رابط')}</a>`;
  }).join('');
  const titles=Object.fromEntries(pages.map(page=>[tokens.get(page.id),page.seo?.title||page.name]));
  const tokenById=Object.fromEntries(pages.map(page=>[page.id,tokens.get(page.id)]));
  const startToken=tokens.get(initialPage.id);
  const theme=project.theme||{};const site=project.site||{};
  const faviconRaw=site.favicon||'';const favicon=resourceMap.get(faviconRaw)||faviconRaw;
  const css=stylesheet(theme,project,resourceMap)+`\nhtml,body{width:100%;max-width:100%;margin:0;padding:0;overflow-x:hidden}body[data-bunaa-single-file="1"]{min-height:100vh}.bunaa-single-page{width:100%;max-width:100%;min-height:100vh;margin:0 auto}.bunaa-single-page[hidden]{display:none!important}.bunaa-single-page>main{width:100%;max-width:none;margin:0 auto}.export-site-nav{box-sizing:border-box;max-width:100%;flex-wrap:wrap}.export-site-nav nav{min-width:0;max-width:100%;flex-wrap:wrap}img,video,iframe,audio,canvas,svg{max-width:100%}.node-wrap{min-width:0;box-sizing:border-box}.node-wrap[data-explicit-size="1"]{max-width:100%}`;
  const script=runtimeJs(project,pageMap,assetMap,resourceMap)+`\n(()=>{'use strict';const titles=${JSON.stringify(titles)};const tokenById=${JSON.stringify(tokenById)};const defaultToken=${JSON.stringify(startToken)};const valid=new Set(Object.keys(titles));const pages=[...document.querySelectorAll('[data-bunaa-single-page]')];function showPage(token,updateHash=false){if(!valid.has(token))token=defaultToken;for(const page of pages)page.hidden=page.id!==token;document.title=(titles[token]||document.title)+' — '+${JSON.stringify(site.brand?.name||project.meta.name||'')};if(updateHash&&location.hash!=='#'+token)history.pushState({bunaaPage:token},'', '#'+token);window.scrollTo({top:0,behavior:'auto'});window.dispatchEvent(new CustomEvent('bunaa:pagechange',{detail:{token,pageId:pages.find(page=>page.id===token)?.dataset.bunaaSinglePage||''}}))}function routeFromHash(){showPage(decodeURIComponent(location.hash.replace(/^#/,'')),false)}document.addEventListener('click',event=>{const link=event.target.closest('a[href^="#bunaa-page-"]');if(!link)return;const token=decodeURIComponent(link.getAttribute('href').slice(1));if(!valid.has(token))return;event.preventDefault();showPage(token,true)});window.addEventListener('hashchange',routeFromHash);window.addEventListener('popstate',routeFromHash);if(!valid.has(decodeURIComponent(location.hash.replace(/^#/,''))))history.replaceState({bunaaPage:defaultToken},'', '#'+defaultToken);routeFromHash();window.__BUNAA_SINGLE_FILE_EXPORT__={pages:tokenById,showPage:(pageId)=>{const token=tokenById[pageId];if(token)showPage(token,true)}}})();`;
  const escapedCss=css.replace(/<\/style/gi,'<\\/style');const escapedScript=script.replace(/<\/script/gi,'<\\/script');
  return `<!doctype html><html lang="${escapeHtml(site.language||'ar')}" dir="${escapeHtml(site.direction||'rtl')}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="${escapeHtml(initialPage.seo?.description||site.description||'')}">${initialPage.seo?.noIndex||site.indexing?.robots?.includes('noindex')?'<meta name="robots" content="noindex,nofollow">':''}${favicon?`<link rel="icon" href="${escapeHtml(favicon)}">`:''}<meta name="generator" content="Bunaa Studio V35 Single-File Export"><title>${escapeHtml(initialPage.seo?.title||initialPage.name)} — ${escapeHtml(site.brand?.name||project.meta.name||'')}</title><style>${escapedCss}</style></head><body data-bunaa-single-file="1" data-default-page="${escapeHtml(initialPage.id)}"><header class="export-site-nav"><strong>${escapeHtml(site.brand?.name||project.meta.name||'الموقع')}</strong><nav>${nav}</nav></header>${sections}<script>${escapedScript}<\/script></body></html>`;
}
const exportCurrentHtml=async(project,selectedPageId)=>{
  const resources=await collectExportResources(project);
  const html=buildSingleFileHtml(project,selectedPageId,resources);
  const page=(project.pages||[]).find(p=>p.id===(selectedPageId||project.activePageId))||(project.pages||[])[0];
  downloadText(html,`${safeName(page?.slug||page?.name||'page')}-standalone.html`,'text/html;charset=utf-8');
  return {page:page?.name||'',pages:(project.pages||[]).length,external:(resources.external||[])};
};
const exportProjectJson=project=>downloadText(JSON.stringify(project,null,2),'bunaa-project.json','application/json;charset=utf-8');
function build404Html(project,map){return `<!doctype html><html lang="${escapeHtml(project.site?.language||'ar')}" dir="${escapeHtml(project.site?.direction||'rtl')}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><link rel="stylesheet" href="styles.css"><title>الصفحة غير موجودة</title></head><body style="min-height:100vh;display:grid;place-items:center;padding:40px"><main style="text-align:center"><h1>404</h1><p>الصفحة التي تبحث عنها غير موجودة.</p><a class="built-button" href="${escapeHtml(map.get(project.pages[0]?.id)||'index.html')}">العودة للرئيسية</a></main></body></html>`}
const te=new TextEncoder(),toBytes=value=>value instanceof Uint8Array?value:te.encode(String(value??'')),u16=n=>new Uint8Array([n&255,(n>>>8)&255]),u32=n=>new Uint8Array([n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255]),cat=xs=>{let size=0;for(const x of xs)size+=x.length;const out=new Uint8Array(size);let i=0;for(const x of xs){out.set(x,i);i+=x.length}return out};const crcTable=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;t[n]=c}return t})();const crc32=b=>{let c=0xffffffff;for(const x of b)c=crcTable[(c^x)&255]^(c>>>8);return(c^0xffffffff)>>>0};function zipBlob(files){const locals=[],centrals=[];let offset=0;for(const [name,data] of Object.entries(files)){const nb=te.encode(name),db=toBytes(data),crc=crc32(db),local=cat([u32(0x04034b50),u16(20),u16(0),u16(0),u16(0),u16(0),u32(crc),u32(db.length),u32(db.length),u16(nb.length),u16(0),nb,db]);locals.push(local);centrals.push(cat([u32(0x02014b50),u16(20),u16(20),u16(0),u16(0),u16(0),u16(0),u32(crc),u32(db.length),u32(db.length),u16(nb.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(offset),nb]));offset+=local.length}const body=cat(locals),central=cat(centrals),end=cat([u32(0x06054b50),u16(0),u16(0),u16(Object.keys(files).length),u16(Object.keys(files).length),u32(central.length),u32(body.length),u16(0)]);return new Blob([body,central,end],{type:'application/zip'})}
exports.assetFileMap = assetFileMap;
exports.assetPathMap = assetPathMap;
exports.collectExportResources = collectExportResources;
exports.pageFileMap = pageFileMap;
exports.buildExportFiles = buildExportFiles;
exports.buildPageHtml = buildPageHtml;
exports.runtimeJs = runtimeJs;
exports.stylesheet = stylesheet;
exports.exportZip = exportZip;
exports.exportCurrentHtml = exportCurrentHtml;
exports.exportProjectJson = exportProjectJson;
});
