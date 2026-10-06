import {Store} from './core/store.js';
import {WorkspaceEngine} from './engine/workspace.js';
import {Panels} from './ui/panels.js';
import {Inspector} from './ui/inspector.js';
import {Dialogs} from './ui/dialogs.js';
import {templates,materializeTemplate} from './catalog/templates.js';

const store=new Store();
store.hydrate();
const inspector=new Inspector(store);
const panels=new Panels(store,null);
const engine=new WorkspaceEngine(store,inspector,panels);
panels.engine=engine;
const dialogs=new Dialogs(store,engine,panels);
let booted=false;

function qs(id){return document.getElementById(id)}
function showWorkspace(mode='normal'){qs('onboarding').classList.add('hidden');qs('workspace').classList.remove('hidden');store.setUI({mode});if(!store.project.pages?.length||store.project.pages.length===0||!store.project.pages.some(p=>p.nodes?.length)){if(!store.restorable)applyStarter()}boot();}
function applyStarter(){const t=materializeTemplate(templates[0]);store.transact('تحميل البداية',p=>{p.pages=t.pages;p.activePageId=t.pages[0].id;p.meta.name='مشروع البداية'})}
function boot(){if(booted)return;booted=true;panels.mount();inspector.mount(qs('inspector'));engine.mount();dialogs.bind();wireTopbar();renderAll();}
function wireTopbar(){
 qs('homeBtn').onclick=()=>{qs('workspace').classList.add('hidden');qs('onboarding').classList.remove('hidden')};
 qs('undoBtn').onclick=()=>{store.undo();renderAll()};qs('redoBtn').onclick=()=>{store.redo();renderAll()};
 qs('leftToggle').onclick=()=>toggleLeft();qs('rightToggle').onclick=()=>toggleRight();qs('leftClose').onclick=()=>toggleLeft(false);qs('rightClose').onclick=()=>toggleRight(false);qs('leftRail').onclick=()=>toggleLeft(true);qs('rightRail').onclick=()=>toggleRight(true);
 qs('previewBtn').onclick=()=>dialogs.preview();qs('managePagesBtn').onclick=()=>panels.pagesModal();
 qs('pageSelect').onchange=e=>selectPage(e.target.value);
 qs('pagePrev').onclick=()=>stepPage(-1);qs('pageNext').onclick=()=>stepPage(1);
 document.querySelectorAll('.device-btn').forEach(b=>b.onclick=()=>{store.setUI({device:b.dataset.device});inspector.setDevice(b.dataset.device);engine.sync()});
 window.addEventListener('keydown',keyboard);
 window.addEventListener('beforeunload',()=>store.persistNow());
 store.subscribe(()=>renderAll());
}
function selectPage(id){if(!store.project.pages.some(p=>p.id===id))return;store.setUI({selected:null});store.transact('فتح صفحة',p=>p.activePageId=id,{record:false});renderAll()}
function stepPage(dir){const ps=store.project.pages,idx=ps.findIndex(p=>p.id===store.project.activePageId);const p=ps[(idx+dir+ps.length)%ps.length];if(p)selectPage(p.id)}
function toggleLeft(force){const open=force===undefined?!store.ui.leftOpen:force;store.setUI({leftOpen:open});document.getElementById('leftDrawer').classList.toggle('hidden',!open);document.getElementById('leftRail').classList.toggle('hidden',open);syncGrid()}
function toggleRight(force){const open=force===undefined?!store.ui.rightOpen:force;store.setUI({rightOpen:open});document.getElementById('rightDrawer').classList.toggle('hidden',!open);document.getElementById('rightRail').classList.toggle('hidden',open);syncGrid()}
function syncGrid(){const main=document.querySelector('.workspace-main');main.style.gridTemplateColumns=`${store.ui.leftOpen?'var(--sidebar)':'0px'} minmax(0,1fr) ${store.ui.rightOpen?'var(--inspector)':'0px'}`;}
function keyboard(e){const mod=e.ctrlKey||e.metaKey;if(mod&&e.key.toLowerCase()==='z'){e.preventDefault();store.undo();renderAll()}else if(mod&&(e.key.toLowerCase()==='y'||(e.shiftKey&&e.key.toLowerCase()==='z'))){e.preventDefault();store.redo();renderAll()}else if(mod&&e.key.toLowerCase()==='s'){e.preventDefault();store.persistNow();toast('تم حفظ المشروع')}else if(mod&&e.key==='='){e.preventDefault();engine.setZoom(store.ui.zoom+.1)}else if(mod&&e.key==='-'){e.preventDefault();engine.setZoom(store.ui.zoom-.1)}else if(e.key.toLowerCase()==='f'&&!e.target.matches('input,textarea,select'))engine.fit();}
function renderAll(){if(!booted)return;engine.sync();panels.renderLibrary();panels.renderLayers();panels.renderInteractions();inspector.render();syncGrid();qs('projectName').textContent=store.project.meta.name;qs('saveStatus').textContent=store.ui.saveError?'⚠ الحفظ ممتلئ':'● محفوظ';if(qs('resumeProject')){qs('resumeProject').classList.toggle('hidden',!store.restorable)}}
function toast(message){let wrap=document.querySelector('.toast-wrap');if(!wrap){wrap=document.createElement('div');wrap.className='toast-wrap';document.body.appendChild(wrap)}const t=document.createElement('div');t.className='toast';t.textContent=message;wrap.appendChild(t);setTimeout(()=>t.remove(),1800)}

function onboardingRestore(){if(store.restorable){qs('resumeProject').classList.remove('hidden');qs('resumeMeta').textContent=`${store.project.meta.name} • ${store.project.pages.length} صفحات`}}
document.querySelectorAll('.mode-card').forEach(b=>b.addEventListener('click',()=>showWorkspace(b.dataset.mode)));qs('resumeBtn').onclick=()=>showWorkspace(store.ui.mode||'normal');onboardingRestore();
