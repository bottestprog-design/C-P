import {factory} from '../catalog/components.js';
import {uid,deepClone,slugify} from './utils.js';
import {findNodeGlobal,walk} from './model.js';

export function addNode(store,type,parentId=null,index=null){let created=null;store.transact('إضافة عنصر',p=>{created=factory(type);const page=p.pages.find(x=>x.id===p.activePageId);if(!page)return;if(parentId){const hit=findNodeGlobal(p,parentId);if(hit){hit.node.children=hit.node.children||[];const at=index==null?hit.node.children.length:index;hit.node.children.splice(Math.max(0,Math.min(at,hit.node.children.length)),0,created);return}}const at=index==null?page.nodes.length:index;page.nodes.splice(Math.max(0,Math.min(at,page.nodes.length)),0,created)});store.setUI({selected:created?.id||null});return created}
export function addNodeObject(store,node,parentId=null,index=null,label='إضافة عنصر'){let made=null;store.transact(label,p=>{made=deepClone(node);made.id=made.id||uid('node');walk([made],x=>{if(x!==made)x.id=uid('node')});const hit=parentId?findNodeGlobal(p,parentId):null;const page=p.pages.find(x=>x.id===p.activePageId);const arr=hit?.node.children||(page?.nodes||[]);arr.splice(index==null?arr.length:index,0,made)});store.setUI({selected:made.id});return made}
export function removeNode(store,id){const hit=findNodeGlobal(store.project,id);if(!hit)return false;store.transact('حذف عنصر',p=>{const h=findNodeGlobal(p,id);if(h.parent)h.parent.children.splice(h.index,1);else h.page.nodes.splice(h.index,1)});store.setUI({selected:null});return true}
export function duplicateNode(store,id){const hit=findNodeGlobal(store.project,id);if(!hit)return null;let copy;store.transact('نسخ عنصر',p=>{const h=findNodeGlobal(p,id);copy=deepClone(h.node);remap(copy);if(h.parent)h.parent.children.splice(h.index+1,0,copy);else h.page.nodes.splice(h.index+1,0,copy)});store.setUI({selected:copy.id});return copy}
function remap(n){n.id=uid('node');n.children=(n.children||[]).map(c=>{const x=deepClone(c);remap(x);return x})}
export function moveNode(store,id,direction){const hit=findNodeGlobal(store.project,id);if(!hit)return false;store.transact(direction==='up'?'نقل للأعلى':'نقل للأسفل',p=>{const h=findNodeGlobal(p,id);const arr=h.parent?h.parent.children:h.page.nodes;const to=h.index+(direction==='up'?-1:1);if(to<0||to>=arr.length)return;[arr[h.index],arr[to]]=[arr[to],arr[h.index]]});return true}
export function updateProps(store,id,patch){store.transact('تعديل المحتوى',p=>{const h=findNodeGlobal(p,id);if(h)Object.assign(h.node.props||{},patch)})}
export function updateStyle(store,id,patch,device='base'){store.transact('تعديل المظهر',p=>{const h=findNodeGlobal(p,id);if(!h)return;h.node.style=h.node.style||{};if(device==='base')Object.assign(h.node.style,patch);else{h.node.responsive=h.node.responsive||{};h.node.responsive[device]={...(h.node.responsive[device]||{}),...patch}}})}
export function setPageName(store,id,name){store.transact('إعادة تسمية الصفحة',p=>{const pg=p.pages.find(x=>x.id===id);if(pg){pg.name=name;pg.slug=slugify(name);pg.seo.title=name}})}
export function setProjectName(store,name){store.transact('تسمية المشروع',p=>p.meta.name=name)}

export function insertNodeAtDrop(store,type,targetId=null){
 let created=null;
 store.transact('إدراج عنصر',p=>{
   created=factory(type);
   const target=targetId?findNodeGlobal(p,targetId):null;
   const page=p.pages.find(x=>x.id===p.activePageId); if(!page)return;
   const containerTypes=new Set(['section','container','grid','columns','stack','hero','form','card','spaced','group']);
   if(target&&containerTypes.has(target.node.type)){target.node.children=target.node.children||[];target.node.children.push(created)}
   else if(target){const arr=target.parent?target.parent.children:target.page.nodes;arr.splice(target.index+1,0,created)}
   else page.nodes.push(created);
 });
 store.setUI({selected:created?.id||null});return created;
}
