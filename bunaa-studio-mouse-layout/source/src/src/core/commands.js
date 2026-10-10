const {factory} = __require("src/catalog/components.js");
const {uid,deepClone,slugify} = __require("src/core/utils.js");
const {findNodeGlobal,walk} = __require("src/core/model.js");
const {initializeDevicePresetsTree} = __require("src/core/device-presets.js");
const containerTypes=new Set(['section','container','grid','columns','stack','spaced','hero','card','form','group']);
function addNode(store,type,parentId=null,index=null){let created;store.transact('إضافة عنصر',p=>{created=factory(type);initializeDevicePresetsTree([created],store.ui?.device||'desktop');const page=p.pages.find(x=>x.id===p.activePageId);const parent=parentId?findNodeGlobal(p,parentId):null;if(parent){parent.node.children=parent.node.children||[];const i=index==null?parent.node.children.length:Math.max(0,Math.min(index,parent.node.children.length));parent.node.children.splice(i,0,created)}else if(page){const i=index==null?page.nodes.length:Math.max(0,Math.min(index,page.nodes.length));page.nodes.splice(i,0,created)}});store.setUI({selected:created?.id||null});return created}
function removeNode(store,id){if(!findNodeGlobal(store.project,id))return false;store.transact('حذف عنصر',p=>{const h=findNodeGlobal(p,id);(h.parent?h.parent.children:h.page.nodes).splice(h.index,1);p.interactions=(p.interactions||[]).filter(i=>i.sourceId!==id&&i.options?.targetId!==id)});store.setUI({selected:null});return true}
function remap(node){node.id=uid('node');node.children=(node.children||[]).map(child=>{const c=deepClone(child);return remap(c)});return node}
function duplicateNode(store,id){const h=findNodeGlobal(store.project,id);if(!h)return null;let copy;store.transact('تكرار عنصر',p=>{const current=findNodeGlobal(p,id);copy=remap(deepClone(current.node));(current.parent?current.parent.children:current.page.nodes).splice(current.index+1,0,copy)});store.setUI({selected:copy.id});return copy}
function moveNode(store,id,direction){const h=findNodeGlobal(store.project,id);if(!h)return false;let moved=false;store.transact(direction==='up'?'تحريك للأعلى':'تحريك للأسفل',p=>{const x=findNodeGlobal(p,id);if(!x)return;const arr=x.parent?x.parent.children:x.page.nodes;const to=x.index+(direction==='up'?-1:1);if(to<0||to>=arr.length)return;[arr[x.index],arr[to]]=[arr[to],arr[x.index]];moved=true});return moved}
function updateProps(store,id,patch){store.transact('تعديل المحتوى',p=>{const h=findNodeGlobal(p,id);if(h)h.node.props={...(h.node.props||{}),...patch}})}
function updateStyle(store,id,patch,device='desktop'){store.transact('تعديل المظهر',p=>{const h=findNodeGlobal(p,id);if(!h)return;if(device==='desktop'){h.node.style={...(h.node.style||{}),...patch};h.node.responsive={...(h.node.responsive||{}),desktop:{...(h.node.responsive?.desktop||{}),...patch}}}else h.node.responsive={...(h.node.responsive||{}),[device]:{...(h.node.responsive?.[device]||{}),...patch}}})}
function insertNodeAtDrop(store,type,targetId=null){let created;store.transact('إدراج عنصر',p=>{created=factory(type);initializeDevicePresetsTree([created],store.ui?.device||'desktop');const target=targetId?findNodeGlobal(p,targetId):null;const page=p.pages.find(x=>x.id===p.activePageId);if(target&&containerTypes.has(target.node.type)){target.node.children=target.node.children||[];target.node.children.push(created)}else if(target){const arr=target.parent?target.parent.children:target.page.nodes;arr.splice(target.index+1,0,created)}else if(page)page.nodes.push(created)});store.setUI({selected:created?.id||null});return created}
function moveNodeByDrop(store,id,targetId,before=true,device='desktop',into=false){
  if(!id||!targetId||id===targetId)return false;
  let moved=false;
  store.transact('تحريك العنصر بالماوس',p=>{
    const source=findNodeGlobal(p,id), target=findNodeGlobal(p,targetId);
    if(!source||!target||source.page.id!==target.page.id||source.node.locked)return;
    // A node cannot be dropped into itself or one of its own descendants.
    let cursor=target;
    while(cursor){if(cursor.node?.id===id)return;cursor=cursor.parent?findNodeGlobal(p,cursor.parent.id):null;}
    const sourceArray=source.parent?source.parent.children:source.page.nodes;
    const [moving]=sourceArray.splice(source.index,1);
    if(into&&containerTypes.has(target.node.type)){
      const fresh=findNodeGlobal(p,targetId);if(!fresh){sourceArray.splice(source.index,0,moving);return;}
      fresh.node.children=fresh.node.children||[];fresh.node.children.push(moving);moved=true;return;
    }
    const freshTarget=findNodeGlobal(p,targetId);
    if(!freshTarget){sourceArray.splice(source.index,0,moving);return;}
    const destination=freshTarget.parent?freshTarget.parent.children:freshTarget.page.nodes;
    destination.splice(freshTarget.index+(before?0:1),0,moving);moved=true;
  });
  if(moved)store.setUI({selected:id});
  return moved;
}
function moveNodeToEnd(store,id){let moved=false;store.transact('تحريك العنصر لنهاية الحاوية',p=>{const hit=findNodeGlobal(p,id);if(!hit||hit.node.locked)return;const arr=hit.parent?hit.parent.children:hit.page.nodes;if(hit.index===arr.length-1)return;const [node]=arr.splice(hit.index,1);arr.push(node);moved=true});if(moved)store.setUI({selected:id});return moved}
function groupNodes(store,ids,layoutMode='row'){
  const valid=[...new Set((ids||[]).filter(Boolean))];if(valid.length<2)return null;
  const modes=new Set(['row','column','grid','stack']);if(!modes.has(layoutMode))layoutMode='row';
  const activePageId=store.project.activePageId;let group=null,error='';
  store.transact('تجميع العناصر في حاوية',p=>{
    const hits=valid.map(id=>findNodeGlobal(p,id)).filter(hit=>hit&&hit.page.id===activePageId&&!hit.node.locked);
    if(hits.length<2){error='حدد عنصرين على الأقل من الصفحة نفسها.';return;}
    const first=hits[0],sameParent=hits.every(hit=>hit.page.id===first.page.id&&(hit.parent?.id||null)===(first.parent?.id||null));
    if(!sameParent){error='لازم العناصر المحددة تكون في المستوى نفسه. حدّد عناصر شقيقة داخل الحاوية نفسها ثم أعد التجميع.';return;}
    const source=first.parent?first.parent.children:first.page.nodes;
    const indices=hits.map(hit=>hit.index);const selectedIds=new Set(hits.map(hit=>hit.node.id));
    const ordered=source.filter(node=>selectedIds.has(node.id));
    if(ordered.length<2){error='لم يتم العثور على عناصر صالحة للتجميع.';return;}
    const firstIndex=Math.min(...indices);
    for(let i=source.length-1;i>=0;i--)if(selectedIds.has(source[i].id))source.splice(i,1);
    const base=factory('group');base.props={...(base.props||{}),label:'حاوية جديدة',groupLayout:layoutMode};
    const direction=(layoutMode==='column'||layoutMode==='stack')?'column':'row';
    base.style={...(base.style||{}),marginTop:0,marginBottom:0,display:layoutMode==='grid'?'grid':'flex',flexDirection:direction,flexWrap:layoutMode==='row'?'wrap':'nowrap',gap:12,width:layoutMode==='grid'?'100%':'fit-content',maxWidth:'100%'};
    if(layoutMode==='grid'){base.style.gridTemplateColumns='repeat(2,minmax(120px,1fr))';base.style.alignItems='start';}
    base.layout={...(base.layout||{}),display:layoutMode==='grid'?'grid':'flex',direction,gap:12,align:'start',justify:'start',wrap:layoutMode==='row'};
    base.children=ordered;
    initializeDevicePresetsTree([base],store.ui?.device||'desktop');
    source.splice(Math.min(firstIndex,source.length),0,base);group=base;
  });
  if(group){store.setUI({selected:group.id});return group;}
  return null;
}
function setPageName(store,id,name){store.transact('إعادة تسمية الصفحة',p=>{const pg=p.pages.find(x=>x.id===id);if(pg){pg.name=String(name||'').trim()||pg.name;pg.slug=slugify(pg.name);pg.path=`/${pg.slug}`;pg.seo={...(pg.seo||{}),title:pg.name}}})}
exports.addNode = addNode;
exports.removeNode = removeNode;
exports.duplicateNode = duplicateNode;
exports.moveNode = moveNode;
exports.moveNodeByDrop = moveNodeByDrop;
exports.moveNodeToEnd = moveNodeToEnd;
exports.groupNodes = groupNodes;
exports.updateProps = updateProps;
exports.updateStyle = updateStyle;
exports.insertNodeAtDrop = insertNodeAtDrop;
exports.setPageName = setPageName;
