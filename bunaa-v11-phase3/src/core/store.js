import {deepClone,debounce} from './utils.js';
import {makeProject,normalizeProject,findNodeGlobal,countNodes,nextPageName,makePage,collectIds} from './model.js';
export const STORAGE_KEY='bunaa_v11_phase3_project',UI_KEY='bunaa_v11_phase3_ui';
const DEFAULT_UI={mode:'normal',device:'desktop',leftTab:'elements',leftOpen:true,rightOpen:true,zoom:1,grid:true,interactionMode:false,advancedDevices:false,selected:null,focus:false,saveError:false};
export class Store{
constructor(){this.project=makeProject();this.ui={...DEFAULT_UI};this.history=[];this.future=[];this.maxHistory=80;this.subscribers=new Set();this.restorable=false;this.persist=debounce(()=>this.persistNow(),300)}
hydrate(){try{const raw=localStorage.getItem(STORAGE_KEY);if(raw){this.project=normalizeProject(JSON.parse(raw));this.restorable=true}}catch(e){console.warn('Project restore failed',e)}try{const raw=localStorage.getItem(UI_KEY);if(raw)this.ui={...DEFAULT_UI,...JSON.parse(raw)}}catch(e){console.warn('UI restore failed',e)}this.reconcileUi();return this.restorable}
reconcileUi(){if(!this.project.pages.some(p=>p.id===this.project.activePageId))this.project.activePageId=this.project.pages[0]?.id||null;if(this.ui.selected&&!findNodeGlobal(this.project,this.ui.selected))this.ui.selected=null;if(!['desktop','tablet','mobile'].includes(this.ui.device))this.ui.device='desktop'}
startFresh(){this.project=makeProject();this.history=[];this.future=[];this.restorable=false;this.ui={...DEFAULT_UI};this.persistNow();this.emit()}
loadProject(project){this.project=normalizeProject(project);this.history=[];this.future=[];this.reconcileUi();this.persist();this.emit()}
snapshot(){return deepClone(this.project)}
transact(label,mutator,{record=true,persist=true,emit=true}={}){if(typeof mutator!=='function')throw new TypeError('mutator must be a function');const before=this.snapshot();try{mutator(this.project);this.project=normalizeProject(this.project)}catch(e){this.project=before;console.error('Transaction failed:',label,e);throw e}const after=this.snapshot(),changed=JSON.stringify(before)!==JSON.stringify(after);if(changed&&record){this.history.push({label,before,after});if(this.history.length>this.maxHistory)this.history.shift();this.future=[]}if(changed&&persist)this.persist();if(changed&&emit)this.emit();return this.project}
undo(){const op=this.history.pop();if(!op)return false;this.future.push(op);this.project=normalizeProject(op.before);this.reconcileUi();this.persist();this.emit();return true}
redo(){const op=this.future.pop();if(!op)return false;this.history.push(op);this.project=normalizeProject(op.after);this.reconcileUi();this.persist();this.emit();return true}
subscribe(fn){this.subscribers.add(fn);return()=>this.subscribers.delete(fn)}
emit(){for(const fn of [...this.subscribers])try{fn(this.project,this.ui)}catch(e){console.error('Store subscriber failed',e)}}
setUI(patch,{emit=true}={}){this.ui={...this.ui,...patch};try{localStorage.setItem(UI_KEY,JSON.stringify(this.ui))}catch(e){console.warn('UI save failed',e)}if(emit)this.emit()}
setProjectSetting(key,value){this.transact('تعديل إعداد المشروع',p=>p.settings[key]=value)}
persistNow(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(this.project));this.ui.saveError=false;try{localStorage.setItem(UI_KEY,JSON.stringify(this.ui))}catch{}}catch(e){this.ui.saveError=true;console.warn('Project save failed',e)}}
find(id){return findNodeGlobal(this.project,id)}activePage(){return this.project.pages.find(p=>p.id===this.project.activePageId)||this.project.pages[0]}nodeCount(){return countNodes(this.project)}
addPage(name=nextPageName(this.project)){let pg;this.transact('إضافة صفحة',p=>{pg=makePage(String(name).trim()||nextPageName(p));p.pages.push(pg);p.activePageId=pg.id});this.setUI({selected:null},{emit:false});this.emit();return pg}
deletePage(id=this.project.activePageId){if(this.project.pages.length<=1)return false;const i=this.project.pages.findIndex(p=>p.id===id);if(i<0)return false;this.transact('حذف صفحة',p=>{p.pages.splice(i,1);p.activePageId=p.pages[Math.max(0,i-1)].id;const ids=collectIds(p);p.interactions=(p.interactions||[]).filter(x=>ids.has(x.sourceId)&&(!x.options?.targetId||ids.has(x.options.targetId)))});this.setUI({selected:null},{emit:false});this.reconcileUi();this.emit();return true}
}