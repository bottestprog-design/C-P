import {nodeHtml} from './renderer.js';
import {escapeHtml,downloadBlob,downloadText,deepClone} from '../core/utils.js';

function pageFileMap(project){
  const used=new Set(['index.html','styles.css','script.js','project.json','README.md']),map=new Map();
  project.pages.forEach((page,index)=>{
    if(index===0){map.set(page.id,'index.html');return}
    const base=String(page.slug||'page-'+(index+1)).replace(/[^\p{L}\p{N}-]+/gu,'-').replace(/^-+|-+$/g,'')||'page-'+(index+1);
    let file=base+'.html',n=2;while(used.has(file))file=base+'-'+n++ +'.html';used.add(file);map.set(page.id,file);
  });
  return map;
}

function replacePageLinks(html,project,map){
  let out=html;
  for(const page of project.pages)out=out.replaceAll(`href="#page-${page.slug}"`,`href="${map.get(page.id)||'#'}"`);
  return out;
}

export function buildPageHtml(page,project,map=pageFileMap(project)){
  const body=(page.nodes||[]).map(node=>nodeHtml(node,project.theme,project,'desktop')).join('');
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(page.seo?.title||page.name)}</title><meta name="description" content="${escapeHtml(page.seo?.description||'')}"><link rel="stylesheet" href="styles.css"></head><body><main>${replacePageLinks(body,project,map)}</main><script src="script.js"></script></body></html>`;
}

export const buildHomeHtml=(page,project)=>buildPageHtml(page,project);

export function runtimeJs(project,map=pageFileMap(project)){
  const interactions=(project.interactions||[]).filter(item=>item.enabled!==false);
  const pages=project.pages.map(page=>({id:page.id,file:map.get(page.id)}));
  return `(()=>{const I=${JSON.stringify(interactions)};const P=${JSON.stringify(pages)};const esc=id=>{const s=String(id||'');return globalThis.CSS?.escape?CSS.escape(s):s.replace(/(["\\\\])/g,'\\\\$1')};const q=id=>document.querySelector('[data-runtime-id="'+esc(id)+'"]');const motion=(e,m='fade',d=420)=>{if(!e)return;[...e.classList].filter(c=>c.startsWith('motion-')).forEach(c=>e.classList.remove(c));void e.offsetWidth;e.style.animationDuration=(Number(d)||420)+'ms';const c='motion-'+m;e.classList.add(c);e.addEventListener('animationend',()=>{e.classList.remove(c);e.style.animationDuration=''}, {once:true})};const run=i=>{const o=i.options||{},e=q(o.targetId||i.sourceId);if(i.action==='motion')motion(e,o.motion,o.duration);else if(i.action==='show'&&e)e.hidden=false;else if(i.action==='hide'&&e)e.hidden=true;else if(i.action==='toggle'&&e)e.hidden=!e.hidden;else if(i.action==='scroll'&&o.anchor)document.getElementById(o.anchor)?.scrollIntoView({behavior:'smooth'});else if(i.action==='page'&&o.pageId){const p=P.find(x=>x.id===o.pageId);if(p)location.href=p.file}else if(i.action==='url'&&o.url)location.href=o.url};for(const i of I){const s=q(i.sourceId);if(!s)continue;const run1=()=>run(i);if(i.trigger==='load')setTimeout(run1,40);else if(i.trigger==='click')s.addEventListener('click',e=>{if(s.matches('a[href="#"]'))e.preventDefault();run1()});else if(i.trigger==='hover')s.addEventListener('pointerenter',run1);else if(i.trigger==='focus')s.addEventListener('focus',run1);else if(i.trigger==='input')s.addEventListener('input',run1);else if(i.trigger==='scroll'&&'IntersectionObserver' in globalThis)new IntersectionObserver(es=>{if(es.some(x=>x.isIntersecting))run1()},{threshold:.15}).observe(s)}})();`;
}

export function stylesheet(theme={}){
  const primary=theme.primary||'#5b5ce2',text=theme.text||'#171b2a';
  return `*{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",Tahoma,Arial,sans-serif;color:${primary};background:#fff;line-height:1.6}main{max-width:1180px;margin:0 auto;color:${text}}a{color:${primary}}.node-wrap{display:block}.built-button{display:inline-flex;padding:11px 20px;border-radius:11px;background:${primary};color:#fff;text-decoration:none;font-weight:800}.built-gallery{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.built-gallery img{width:100%;height:220px;object-fit:cover;border-radius:12px}.built-card,.built-product,.built-modal{padding:18px;border:1px solid #e7e9ef;border-radius:14px;background:#fff}.built-nav{display:flex;align-items:center;justify-content:space-between;gap:16px}.nav-links,.built-social{display:flex;gap:16px;flex-wrap:wrap}.built-nav a,.built-social a{color:${primary};text-decoration:none}.built-stats,.built-pricing,.built-timeline{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.built-stats>div,.built-pricing>div,.built-timeline>div{padding:16px;border:1px solid #e7e9ef;border-radius:12px;background:#fff}.built-progress{position:relative;height:36px;background:#eef0f5;border-radius:12px;overflow:hidden}.built-progress>div{height:100%;background:${primary}}.built-progress span{position:absolute;inset:0;display:grid;place-items:center;font-size:10px;color:#fff}.built-chart{display:flex;align-items:flex-end;gap:10px;height:180px}.built-chart i{flex:1;background:${primary};border-radius:7px 7px 2px 2px;min-height:14px}.built-form input,.built-form textarea,.built-form select,.node-content input,.node-content textarea,.node-content select{width:100%;padding:10px;border:1px solid #e2e5ee;border-radius:9px;background:#fff}.built-accordion details,.built-faq{border-bottom:1px solid #eceef3;padding:10px}.built-rating{letter-spacing:3px}.built-counter{font-size:30px;font-weight:800}.built-calendar{padding:24px;border:1px solid #e7e9ef;border-radius:14px;background:#fff;text-align:center}.motion-pulse{animation:pulse 1.2s infinite}.motion-fade{animation:fade .7s ease}.motion-slide{animation:slide .7s ease}.motion-zoom{animation:zoom .7s ease}.motion-shake{animation:shake .5s ease}.motion-bounce{animation:bounce .7s ease}.motion-glow{animation:glow .9s ease}@keyframes pulse{50%{transform:scale(1.03);opacity:.8}}@keyframes fade{from{opacity:.2}to{opacity:1}}@keyframes slide{from{transform:translateY(14px);opacity:.2}to{transform:translateY(0);opacity:1}}@keyframes zoom{from{transform:scale(.96);opacity:.2}to{transform:scale(1);opacity:1}}@keyframes shake{25%{transform:translateX(5px)}50%{transform:translateX(-5px)}75%{transform:translateX(3px)}}@keyframes bounce{0%,100%{transform:translateY(0)}45%{transform:translateY(-9px)}}@keyframes glow{50%{box-shadow:0 0 0 6px rgba(91,92,226,.12)}}@media(max-width:760px){main{width:auto;padding:0 12px}.built-gallery,.built-stats,.built-pricing,.built-timeline{grid-template-columns:1fr}.built-nav{align-items:flex-start;flex-direction:column}}`;
}

export async function exportZip(project){
  const map=pageFileMap(project);
  const files={'index.html':buildPageHtml(project.pages[0],project,map),'styles.css':stylesheet(project.theme),'script.js':runtimeJs(project,map),'project.json':JSON.stringify(deepClone(project),null,2),'README.md':`# ${project.meta.name}\n\nتم إنشاء الموقع بواسطة بَنّاء V11 Phase 3.\n`};
  for(const page of project.pages.slice(1))files[map.get(page.id)]=buildPageHtml(page,project,map);
  downloadBlob(zipBlob(files),`${safeName(project.meta.name)}.zip`);
  return Object.keys(files);
}

export function exportCurrentHtml(project){const map=pageFileMap(project);const page=project.pages.find(x=>x.id===project.activePageId)||project.pages[0];downloadText(buildPageHtml(page,project,map),'page.html','text/html;charset=utf-8')}
export function exportProjectJson(project){downloadText(JSON.stringify(project,null,2),'bunaa-project.json','application/json;charset=utf-8')}
const safeName=s=>String(s||'project').replace(/[^\p{L}\p{N}_-]+/gu,'-').replace(/-+/g,'-').slice(0,60)||'project';
function u16(n){return new Uint8Array([n&255,(n>>>8)&255])}
function u32(n){return new Uint8Array([n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255])}
function concat(parts){let size=0;for(const part of parts)size+=part.length;const out=new Uint8Array(size);let offset=0;for(const part of parts){out.set(part,offset);offset+=part.length}return out}
const te=new TextEncoder();
const crcTable=(()=>{const table=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;table[n]=c}return table})();
function crc32(bytes){let c=0xffffffff;for(const byte of bytes)c=crcTable[(c^byte)&255]^(c>>>8);return(c^0xffffffff)>>>0}
function zipBlob(files){const locals=[],centrals=[];let offset=0;for(const [name,data] of Object.entries(files)){const nb=te.encode(name),db=te.encode(data),crc=crc32(db);const local=concat([u32(0x04034b50),u16(20),u16(0),u16(0),u16(0),u16(0),u32(crc),u32(db.length),u32(db.length),u16(nb.length),u16(0),nb,db]);locals.push(local);centrals.push(concat([u32(0x02014b50),u16(20),u16(20),u16(0),u16(0),u16(0),u16(0),u32(crc),u32(db.length),u32(db.length),u16(nb.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(offset),nb]));offset+=local.length}const body=concat(locals),central=concat(centrals),end=concat([u32(0x06054b50),u16(0),u16(0),u16(Object.keys(files).length),u16(Object.keys(files).length),u32(central.length),u32(body.length),u16(0)]);return new Blob([body,central,end],{type:'application/zip'})}