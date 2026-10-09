const {factory} = __require("src/catalog/components.js");
const {uid,deepClone,slugify} = __require("src/core/utils.js");
const {findNodeGlobal,walk} = __require("src/core/model.js");
const {initializeDevicePresetsTree} = __require("src/core/device-presets.js");
const containerTypes=new Set(['section','container','grid','columns','stack','hero','card','form','group']);
function addNode(store,type,parentId=null,index=null){let created;store.transact('إضافة عنصر',p=>{created=factory(type);if(type==='page-embed')created.props.pageId=p.pages.find(pg=>pg.id!==p.activePageId)?.id||'';initializeDevicePresetsTree([created],store.ui?.device||'desktop');const page=p.pages.find(x=>x.id===p.activePageId);const parent=parentId?findNodeGlobal(p,parentId):null;if(parent){parent.node.children=parent.node.children||[];const i=index==null?parent.node.children.length:Math.max(0,Math.min(index,parent.node.children.length));parent.node.children.splice(i,0,created)}else if(page){const i=index==null?page.nodes.length:Math.max(0,Math.min(index,page.nodes.length));page.nodes.splice(i,0,created)}});store.setUI({selected:created?.id||null});return created}
function removeNode(store,id){if(!findNodeGlobal(store.project,id))return false;store.transact('حذف عنصر',p=>{const h=findNodeGlobal(p,id);(h.parent?h.parent.children:h.page.nodes).splice(h.index,1);p.interactions=(p.interactions||[]).filter(i=>i.sourceId!==id&&i.options?.targetId!==id)});store.setUI({selected:null});return true}
function remap(node){node.id=uid('node');node.children=(node.children||[]).map(child=>{const c=deepClone(child);return remap(c)});return node}
function duplicateNode(store,id){const h=findNodeGlobal(store.project,id);if(!h)return null;let copy;store.transact('تكرار عنصر',p=>{const current=findNodeGlobal(p,id);copy=remap(deepClone(current.node));(current.parent?current.parent.children:current.page.nodes).splice(current.index+1,0,copy)});store.setUI({selected:copy.id});return copy}
function moveNode(store,id,direction){const h=findNodeGlobal(store.project,id);if(!h)return false;let moved=false;store.transact(direction==='up'?'تحريك للأعلى':'تحريك للأسفل',p=>{const x=findNodeGlobal(p,id);const arr=x.parent?x.parent.children:x.page.nodes;const to=x.index+(direction==='up'?-1:1);if(to<0||to>=arr.length)return;[arr[x.index],arr[to]]=[arr[to],arr[x.index]];moved=true});return moved}
function updateProps(store,id,patch){store.transact('تعديل المحتوى',p=>{const h=findNodeGlobal(p,id);if(h)h.node.props={...(h.node.props||{}),...patch}})}
function updateStyle(store,id,patch,device='desktop'){store.transact('تعديل المظهر',p=>{const h=findNodeGlobal(p,id);if(!h)return;if(device==='desktop')h.node.style={...(h.node.style||{}),...patch};else h.node.responsive={...(h.node.responsive||{}),[device]:{...(h.node.responsive?.[device]||{}),...patch}}})}
function insertNodeAtDrop(store,type,targetId=null){let created;store.transact('إدراج عنصر',p=>{created=factory(type);if(type==='page-embed')created.props.pageId=p.pages.find(pg=>pg.id!==p.activePageId)?.id||'';initializeDevicePresetsTree([created],store.ui?.device||'desktop');const target=targetId?findNodeGlobal(p,targetId):null;const page=p.pages.find(x=>x.id===p.activePageId);if(target&&containerTypes.has(target.node.type)){target.node.children=target.node.children||[];target.node.children.push(created)}else if(target){const arr=target.parent?target.parent.children:target.page.nodes;arr.splice(target.index+1,0,created)}else if(page)page.nodes.push(created)});store.setUI({selected:created?.id||null});return created}
function setPageName(store,id,name){store.transact('إعادة تسمية الصفحة',p=>{const pg=p.pages.find(x=>x.id===id);if(pg){pg.name=String(name||'').trim()||pg.name;pg.slug=slugify(pg.name);pg.path=`/${pg.slug}`;pg.seo={...(pg.seo||{}),title:pg.name}}})}
exports.addNode = addNode;
exports.removeNode = removeNode;
exports.duplicateNode = duplicateNode;
exports.moveNode = moveNode;
exports.updateProps = updateProps;
exports.updateStyle = updateStyle;
exports.insertNodeAtDrop = insertNodeAtDrop;
exports.setPageName = setPageName;
