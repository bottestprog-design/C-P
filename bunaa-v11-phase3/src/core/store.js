import {deepClone,debounce} from './utils.js';
import {makeProject,normalizeProject,findNodeGlobal,countNodes,nextPageName,makePage} from './model.js';

export const STORAGE_KEY='bunaa_v11_phase3_project';
export const UI_KEY='bunaa_v11_phase3_ui';

export class Store{
  constructor(){this.project=makeProject();this.ui={mode:'normal',device:'desktop',leftTab:'elements',leftOpen:true,rightOpen:true,zoom:1,grid:true,interactionMode:false,advancedDevices:false,selected:null,focus:false};this.subscribers=new Set();this.history=[];this.future=[];this.maxHistory=80;this.restorable=false;this.persist=debounce(()=>this.persistNow(),260)}
  hydrate(){try{const raw=localStorage.getItem(STORAGE_KEY);if(raw){this.project=normalizeProject(JSON.parse(raw));this.restorable=true}}catch(e){console.warn('restore failed',e)}try{const ui=JSON.parse(localStorage.getItem(UI_KEY)||'{}');this.ui={...this.ui,...ui}}catch{}return this.restorable}
  startFresh(){this.project=normalizeProject(makeProject());this.history=[];this.future=[];this.ui.selected=null;this.persist();this.emit()}
  loadProject(project){this.project=normalizeProject(project);this.history=[];this.future=[];this.persist();this.emit()}
  snapshot(){return deepClone(this.project)}
  transact(label,mutator,{record=true,persist=true}={}){const before=this.snapshot();mutator(this.project);this.project.meta.updatedAt=new Date().toISOString();if(record)this.history.push({label,before,after:this.snapshot()});if(this.history.length>this.maxHistory)this.history.shift();this.future=[];if(persist)this.persist();this.emit();return this.project}
  undo(){const op=this.history.pop();if(!op)return false;this.future.push(op);this.project=deepClone(op.before);this.emit();this.persist();return true}
  redo(){const op=this.future.pop();if(!op)return false;this.history.push(op);this.project=deepClone(op.after);this.emit();this.persist();return true}
  subscribe(fn){this.subscribers.add(fn);return()=>this.subscribers.delete(fn)}
  emit(){for(const fn of this.subscribers)try{fn(this.project,this.ui)}catch(e){console.error(e)}}
  setUI(patch){this.ui={...this.ui,...patch};try{localStorage.setItem(UI_KEY,JSON.stringify(this.ui))}catch{};this.emit()}
  persistNow(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(this.project));}catch(e){this.ui.saveError=true;try{localStorage.removeItem(STORAGE_KEY)}catch{};console.warn('save failed',e)};this.emit()}
  find(id){return findNodeGlobal(this.project,id)}
  activePage(){return this.project.pages.find(p=>p.id===this.project.activePageId)||this.project.pages[0]}
  nodeCount(){return countNodes(this.project)}
  addPage(name=nextPageName(this.project)){let pg;this.transact('إضافة صفحة',p=>{pg=makePage(name);p.pages.push(pg);p.activePageId=pg.id});return pg}
  deletePage(id=this.project.activePageId){if(this.project.pages.length<=1)return false;const idx=this.project.pages.findIndex(p=>p.id===id);if(idx<0)return false;this.transact('حذف صفحة',p=>{p.pages.splice(idx,1);p.activePageId=p.pages[Math.max(0,idx-1)].id;const hasNode=(nodes,id)=>{for(const n of nodes){if(n.id===id)return true;if(hasNode(n.children||[],id))return true}return false};p.interactions=p.interactions.filter(x=>p.pages.some(pg=>hasNode(pg.nodes,x.sourceId))) });this.ui.selected=null;this.emit();return true}
}
