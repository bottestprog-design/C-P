(function(w){
'use strict';
const U=w.Bunaa.Core,M=w.Bunaa.Model,S={};
function create(){
 let project=M.createProject(),history=[],future=[],listeners=[],saved=true;
 const ui={mode:'normal',selectedIds:[],tab:'elements',category:'الكل',search:'',device:'desktop',zoom:1,grid:true,snap:true,preview:false,pan:{x:0,y:0},collapsedLayers:{}};
 function emit(type,meta={}){listeners.slice().forEach(fn=>fn({type,meta,project,ui,canUndo:history.length>0,canRedo:future.length>0,saved}))}
 function persist(){U.writeStore(M.STORAGE_KEY,JSON.stringify(project));saved=true}
 function load(){let data=null;try{let raw=U.readStore(M.STORAGE_KEY);if(!raw)for(const key of M.LEGACY_STORAGE_KEYS){raw=U.readStore(key);if(raw)break}data=raw?JSON.parse(raw):null}catch{}project=M.normalizeProject(data||M.createProject());saved=true;history=[];future=[];emit('load')}
 function commit(label,mutate){const before=U.clone(project);mutate(project);project=M.normalizeProject(project);const after=U.clone(project);if(JSON.stringify(before)===JSON.stringify(after))return false;history.push({label,before,after});if(history.length>120)history.shift();future=[];saved=false;persist();emit('change',{label});return true}
 function begin(label){return {label,before:U.clone(project),active:true}}
 function draft(tx,mutate){if(!tx?.active)return false;mutate(project);project=M.normalizeProject(project);saved=false;emit('draft',{label:tx.label});return true}
 function end(tx){if(!tx?.active)return false;const after=U.clone(project);tx.active=false;if(JSON.stringify(tx.before)===JSON.stringify(after)){saved=true;emit('noop');return false}history.push({label:tx.label,before:tx.before,after});if(history.length>120)history.shift();future=[];persist();emit('change',{label:tx.label});return true}
 function undo(){const step=history.pop();if(!step)return;future.push(step);project=U.clone(step.before);persist();emit('undo',{label:step.label})}
 function redo(){const step=future.pop();if(!step)return;history.push(step);project=U.clone(step.after);persist();emit('redo',{label:step.label})}
 function setUi(patch){Object.assign(ui,patch);emit('ui',patch)}
 function subscribe(fn){listeners.push(fn);return()=>{const i=listeners.indexOf(fn);if(i>=0)listeners.splice(i,1)}}
 function activePage(){return project.pages.find(p=>p.id===project.activePageId)||project.pages[0]}
 function find(id){const p=activePage();return p?M.find(p.nodes,id):null}
 function parentOf(id){const p=activePage();return p?M.parentOf(p.nodes,id):null}
 function all(){const p=activePage(),out=[];if(p)M.walk(p.nodes,(node,parent)=>out.push({node,parent}));return out}
 function reset(){U.removeStore(M.STORAGE_KEY);project=M.createProject();history=[];future=[];saved=true;setUi({selectedIds:[],preview:false});persist();emit('reset')}
 return {get project(){return project},get ui(){return ui},get saved(){return saved},get canUndo(){return history.length>0},get canRedo(){return future.length>0},load,persist,commit,begin,draft,end,undo,redo,setUi,subscribe,activePage,find,parentOf,all,reset};
}
S.singleton=create();S.create=create;w.Bunaa.Store=S;
})(window);