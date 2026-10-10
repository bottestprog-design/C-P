const {storage} = __require("src/core/storage.js");
const {deepClone,debounce} = __require("src/core/utils.js");
const {makeProject,normalizeProject,findNodeGlobal,countNodes,makePage,nextPageName,collectIds} = __require("src/core/model.js");
const {ProjectRepository} = __require("src/core/project-repository.js");
const UI_KEY='bunaa_v26_ui';
const DEFAULT_UI={mode:'normal',device:'desktop',leftTab:'elements',leftOpen:true,rightOpen:true,zoom:1,grid:true,focus:false,interactionMode:false,advancedDevices:false,selected:null,saveError:false};
const readJson=key=>{try{const raw=storage.getItem(key);return raw?JSON.parse(raw):null}catch{return null}};
class Store{
  constructor(repository=new ProjectRepository()){
    this.repo=repository;this.project=makeProject();this.ui={...DEFAULT_UI};this.userId=null;this.projectId=null;this.history=[];this.future=[];this.maxHistory=100;this.subscribers=new Set();this.restorable=false;this.dirty=false;this.lastSavedAt=null;this.saveState='saved';this.persist=debounce(()=>this.persistNow(),500);
  }
  uiKey(){return this.userId?`${UI_KEY}:${this.userId}`:UI_KEY}
  legacyUiKeys(){return this.userId?[`bunaa_v25_ui:${this.userId}`,`bunaa_v20_ui:${this.userId}`,`bunaa_v19_ui:${this.userId}`,`bunaa_v18_ui:${this.userId}`,`bunaa_v17_ui:${this.userId}`,`bunaa_v16_ui:${this.userId}`,`bunaa_v15_ui:${this.userId}`,`bunaa_v14_ui:${this.userId}`]:['bunaa_v25_ui','bunaa_v20_ui','bunaa_v19_ui','bunaa_v18_ui','bunaa_v17_ui','bunaa_v16_ui','bunaa_v15_ui','bunaa_v14_ui']}
  setAccount(userId){
    this.persist.cancel?.();this.userId=String(userId||'')||null;this.projectId=null;this.project=makeProject(this.userId?{ownerId:this.userId}:{});this.ui={...DEFAULT_UI};this.history=[];this.future=[];this.restorable=false;this.dirty=false;this.saveState='saved';
    const saved=readJson(this.uiKey());if(saved)this.ui={...DEFAULT_UI,...saved};else for(const key of this.legacyUiKeys()){const legacy=readJson(key);if(legacy){this.ui={...DEFAULT_UI,...legacy};break}}
    if(this.userId)this.repo.migrateLegacy(this.userId);this.reconcileUi();this.emit();return this.userId;
  }
  listProjects(){return this.userId?this.repo.list(this.userId):[]}
  openProject(projectId){
    if(!this.userId)return false;
    this.persist.cancel?.();const project=this.repo.get(this.userId,projectId);if(!project)return false;
    this.project=normalizeProject(project);this.projectId=this.project.meta.id;this.restorable=true;this.dirty=false;this.saveState='saved';this.history=[];this.future=[];this.ui.selected=null;this.reconcileUi();this.emit();return true;
  }
  createProject(name='مشروعي',seed={}){
    if(!this.userId)throw new Error('سجّل الدخول أولًا.');
    this.persist.cancel?.();const project=this.repo.create(this.userId,{name,seed});this.project=normalizeProject(project);this.projectId=this.project.meta.id;this.restorable=true;this.dirty=false;this.saveState='saved';this.history=[];this.future=[];this.ui.selected=null;this.reconcileUi();this.emit();return this.project;
  }
  deleteProject(projectId=this.projectId){
    if(!this.userId||!projectId)return false;const ok=this.repo.remove(this.userId,projectId);if(ok&&projectId===this.projectId)this.clearProject();return ok;
  }
  duplicateProject(projectId=this.projectId,name=''){
    if(!this.userId||!projectId)return null;const project=this.repo.duplicate(this.userId,projectId,name);return project?normalizeProject(project):null;
  }
  clearProject(){this.persist.cancel?.();this.projectId=null;this.project=makeProject(this.userId?{ownerId:this.userId}:{});this.ui.selected=null;this.history=[];this.future=[];this.restorable=false;this.dirty=false;this.saveState='saved';this.emit()}
  clearAccount(){this.persist.cancel?.();this.userId=null;this.projectId=null;this.project=makeProject();this.ui={...DEFAULT_UI};this.history=[];this.future=[];this.restorable=false;this.dirty=false;this.saveState='saved';this.emit()}
  get canUndo(){return this.history.length>0}
  get canRedo(){return this.future.length>0}
  reconcileUi(){if(!this.project.pages.some(p=>p.id===this.project.activePageId))this.project.activePageId=this.project.pages[0]?.id||null;if(this.ui.selected&&!findNodeGlobal(this.project,this.ui.selected))this.ui.selected=null;if(!['desktop','tablet','mobile'].includes(this.ui.device))this.ui.device='desktop';this.ui.zoom=Math.min(1.5,Math.max(.55,Number(this.ui.zoom)||1));this.ui.leftOpen=Boolean(this.ui.leftOpen);this.ui.rightOpen=Boolean(this.ui.rightOpen)}
  snapshot(){return deepClone(this.project)}
  transact(label,mutator,{record=true,persist=true,emit=true}={}){
    if(typeof mutator!=='function')throw new TypeError('mutator must be a function');const before=this.snapshot();
    try{mutator(this.project);this.project=normalizeProject(this.project);this.project.meta.id=this.projectId||this.project.meta.id;this.project.meta.ownerId=this.userId||this.project.meta.ownerId}catch(error){this.project=before;throw new Error(`${label}: ${error.message}`,{cause:error})}
    const after=this.snapshot();const changed=JSON.stringify(before)!==JSON.stringify(after);if(changed){this.project.meta.updatedAt=new Date().toISOString();this.dirty=true;this.saveState='pending';if(record){this.history.push({label,before,after});if(this.history.length>this.maxHistory)this.history.shift();this.future=[]}if(persist)this.persist();if(emit)this.emit()}return changed;
  }
  undo(){const op=this.history.pop();if(!op)return false;this.future.push(op);this.project=normalizeProject(op.before);this.reconcileUi();this.markDirty();this.persist();this.emit();return true}
  redo(){const op=this.future.pop();if(!op)return false;this.history.push(op);this.project=normalizeProject(op.after);this.reconcileUi();this.markDirty();this.persist();this.emit();return true}
  markDirty(){this.dirty=true;this.saveState='pending';this.project.meta.updatedAt=new Date().toISOString()}
  subscribe(fn){this.subscribers.add(fn);return()=>this.subscribers.delete(fn)}
  emit(){for(const fn of [...this.subscribers])try{fn(this.project,this.ui,this)}catch(error){console.error('Store subscriber failed',error)}}
  setUI(patch,{emit=true}={}){this.ui={...this.ui,...patch};try{storage.setItem(this.uiKey(),JSON.stringify(this.ui))}catch{this.ui.saveError=true}if(emit)this.emit()}
  persistNow(){
    this.persist.cancel?.();if(!this.userId||!this.projectId||!this.dirty)return false;try{this.project.meta.updatedAt=new Date().toISOString();this.project=this.repo.save(this.userId,this.project);this.restorable=true;this.dirty=false;this.saveState='saved';this.lastSavedAt=new Date().toISOString();this.ui.saveError=false;storage.setItem(this.uiKey(),JSON.stringify(this.ui));this.emit();return true}catch(error){this.ui.saveError=true;this.saveState='error';console.warn('Project save failed',error);this.emit();return false}
  }
  find(id){return findNodeGlobal(this.project,id)}
  activePage(){return this.project.pages.find(p=>p.id===this.project.activePageId)||this.project.pages[0]}
  nodeCount(){return countNodes(this.project)}
  setActivePage(id){if(!this.project.pages.some(p=>p.id===id))return false;const changed=this.project.activePageId!==id;this.project.activePageId=id;this.ui.selected=null;if(changed){this.markDirty();this.persist();this.emit()}return changed}
  addPage(name=nextPageName(this.project)){let page;this.transact('إضافة صفحة',project=>{page=makePage(String(name).trim()||nextPageName(project));project.pages.push(page);project.activePageId=page.id});this.ui.selected=null;return page}
  duplicatePage(id=this.project.activePageId){const source=this.project.pages.find(p=>p.id===id);if(!source)return null;const mapping=new Map();let resultId=null;const remap=node=>{const clone=deepClone(node);const oldId=clone.id;clone.id=`${oldId}_${Math.random().toString(36).slice(2,7)}`;mapping.set(oldId,clone.id);clone.children=(clone.children||[]).map(remap);return clone};this.transact('نسخ الصفحة',project=>{const copy=deepClone(source);copy.id=`page_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,6)}`;copy.slug=undefined;copy.name=`${source.name} — نسخة`;copy.nodes=(copy.nodes||[]).map(remap);project.pages.push(copy);project.activePageId=copy.id;const copiedInteractions=(project.interactions||[]).filter(item=>item&&mapping.has(item.sourceId)).map(item=>{const next=deepClone(item);next.id=`int_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`;next.sourceId=mapping.get(item.sourceId);if(next.options?.targetId&&mapping.has(next.options.targetId))next.options.targetId=mapping.get(next.options.targetId);else if(next.options?.targetId)next.options.targetId=null;return next});project.interactions=[...(project.interactions||[]),...copiedInteractions];resultId=copy.id});this.ui.selected=null;return this.project.pages.find(page=>page.id===resultId)||null}
  movePage(id,direction){const index=this.project.pages.findIndex(p=>p.id===id);if(index<0)return false;const to=index+(direction==='up'?-1:1);if(to<0||to>=this.project.pages.length)return false;return this.transact(direction==='up'?'نقل الصفحة للأعلى':'نقل الصفحة للأسفل',project=>{[project.pages[index],project.pages[to]]=[project.pages[to],project.pages[index]]})}
  setHomePage(id){if(!this.project.pages.some(p=>p.id===id))return false;return this.transact('تعيين الصفحة الرئيسية',project=>{const index=project.pages.findIndex(p=>p.id===id);if(index>0){const [page]=project.pages.splice(index,1);project.pages.unshift(page)}})}
  setPageParent(id,parentId=null){if(!this.project.pages.some(p=>p.id===id))return false;if(parentId&&!this.project.pages.some(p=>p.id===parentId))return false;if(parentId===id)return false;const byId=new Map(this.project.pages.map(p=>[p.id,p]));let cursor=parentId;while(cursor){if(cursor===id)return false;cursor=byId.get(cursor)?.parentId||null}return this.transact('تغيير الصفحة الأب',project=>{const page=project.pages.find(p=>p.id===id);if(page)page.parentId=parentId||null})}
  deletePage(id=this.project.activePageId){if(this.project.pages.length<=1)return false;const index=this.project.pages.findIndex(p=>p.id===id);if(index<0)return false;const ok=this.transact('حذف صفحة',project=>{project.pages.splice(index,1);project.activePageId=project.pages[Math.max(0,index-1)].id;const ids=collectIds(project);project.interactions=(project.interactions||[]).filter(item=>ids.has(item.sourceId)&&(!item.options?.targetId||ids.has(item.options.targetId))&&(!item.options?.pageId||project.pages.some(page=>page.id===item.options.pageId)))});this.ui.selected=null;this.reconcileUi();return ok}
}
exports.UI_KEY = UI_KEY;
exports.Store = Store;
});
