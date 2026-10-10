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
function groupNodes(store,ids,layoutMode='row'){
  const unique=[...new Set((ids||[]).filter(Boolean))];
  if(unique.length<2)return null;
  const layouts={
    row:{display:'flex',direction:'row',gap:12,align:'start',justify:'start',wrap:true},
    column:{display:'flex',direction:'column',gap:12,align:'stretch',justify:'start',wrap:false},
    grid:{display:'grid',direction:'row',gap:12,align:'stretch',justify:'start',wrap:true},
    stack:{display:'flex',direction:'column',gap:8,align:'stretch',justify:'start',wrap:false}
  };
  const mode=layouts[layoutMode]?layoutMode:'row';
  let created=null;
  store.transact('تجميع العناصر في حاوية',project=>{
    const hits=unique.map(id=>findNodeGlobal(project,id));
    if(hits.some(hit=>!hit)||hits.some(hit=>hit.nodes!==hits[0].nodes))return;
    const siblings=hits[0].nodes;
    const firstIndex=Math.min(...hits.map(hit=>hit.index));
    const ordered=[...hits].sort((x,y)=>x.index-y.index);
    created=factory('group');
    created.props={...(created.props||{}),name:'حاوية جديدة',layoutMode:mode};
    created.style={...(created.style||{}),marginTop:0,marginBottom:12,padding:12,background:'#fbfbff',border:'1px dashed #d0d4e2',radius:12,width:'fit-content',maxWidth:'100%'};
    created.layout={...(created.layout||{}),...layouts[mode]};
    if(mode==='grid')created.style={...created.style,gridTemplateColumns:'repeat(2,minmax(0,1fr))'};
    created.children=ordered.map(hit=>hit.node);
    hits.slice().sort((x,y)=>y.index-x.index).forEach(hit=>siblings.splice(hit.index,1));
    siblings.splice(firstIndex,0,created);
  });
  if(created)store.setUI({selected:created.id,multiSelected:[],rightOpen:true});
  return created;
}

function ungroupNode(store,id){let children=[];store.transact('فك تجميع العناصر',p=>{const h=findNodeGlobal(p,id);if(!h||h.node.type!=='group'||!(h.node.children||[]).length)return;children=[...h.node.children];h.nodes.splice(h.index,1,...children)});if(children.length)store.setUI({selected:children[0].id,multiSelected:children.length>1?children.map(n=>n.id):[],rightOpen:true});return children.map(n=>n.id)}
function decomposeNode(store,id){let changed=false;store.transact('فصل أجزاء العنصر',project=>{const h=findNodeGlobal(project,id);if(!h)return;const node=h.node,p={...(node.props||{})};const makePart=(type,props={},style={})=>{const part=factory(type);part.props={...(part.props||{}),...props};part.style={...(part.style||{}),...style};return part};let parts=[],newType='group',newProps={name:'مجموعة قابلة للتحرير'};if(node.type==='card'){if(p.title)parts.push(makePart('heading',{text:String(p.title)},{fontSize:22,fontWeight:800,marginTop:0,marginBottom:8}));if(p.text)parts.push(makePart('text',{text:String(p.text)},{fontSize:14,marginTop:0,marginBottom:12}));if(p.button)parts.push(makePart('button',{text:String(p.button),url:p.url||'#',action:'url'},{marginTop:4,marginBottom:0}))}else if(node.type==='testimonial'){if(p.quote)parts.push(makePart('quote',{text:String(p.quote)},{marginTop:0,marginBottom:10,fontSize:15}));if(p.name)parts.push(makePart('text',{text:String(p.name)},{fontWeight:800,marginTop:0,marginBottom:0}))}else if(node.type==='footer'){if(p.brand)parts.push(makePart('heading',{text:String(p.brand)},{fontSize:18,fontWeight:800,marginTop:0,marginBottom:8,color:node.style?.color||'#fff'}));if(p.text)parts.push(makePart('text',{text:String(p.text)},{fontSize:12,marginTop:0,marginBottom:0,color:node.style?.color||'#fff'}))}else if(node.type==='navbar'){if(p.brand)parts.push(makePart('text',{text:String(p.brand)},{fontWeight:900,marginTop:0,marginBottom:0}));(Array.isArray(p.links)?p.links:[]).forEach((label,index)=>{const pageId=p.linkTargets?.[index];const page=(project.pages||[]).find(pg=>pg.id===pageId);parts.push(makePart('link',{text:String(label),url:page?.path||'#'},{marginTop:0,marginBottom:0,fontSize:13}))});node.style={...(node.style||{}),display:'flex',flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:14,flexWrap:'wrap'}}else if(['stats','timeline','pricing'].includes(node.type)){const source=node.type==='stats'?(p.items||[]):node.type==='timeline'?(p.items||[]):(p.plans||[]);if(!source.length)return;newType='grid';newProps={count:source.length};node.style={...(node.style||{}),display:'grid',gridTemplateColumns:'repeat('+Math.max(1,Math.min(4,source.length))+',minmax(0,1fr))',gap:Number(node.style?.gap)||12};parts=source.map((item,index)=>{const a=Array.isArray(item)?item:[String(item),String(index+1)];const box=makePart('group',{name:'جزء '+(index+1)},{background:'#fff',border:'1px solid #e7e9ef',padding:14,radius:11,marginTop:0,marginBottom:0});box.children=[makePart('heading',{text:String(a[0]??'')},{fontSize:20,fontWeight:800,marginTop:0,marginBottom:6}),makePart('text',{text:String(a[1]??'')},{fontSize:13,marginTop:0,marginBottom:0})];return box})}else if(node.type==='product'){if(p.name)parts.push(makePart('heading',{text:String(p.name)},{fontSize:22,fontWeight:800,marginTop:0,marginBottom:8}));if(p.price||p.currency)parts.push(makePart('text',{text:(String(p.price||'')+' '+String(p.currency||'')).trim()},{fontSize:16,fontWeight:800,marginTop:0,marginBottom:10}));if(p.cta)parts.push(makePart('button',{text:String(p.cta),url:p.url||'#',action:'url'},{marginTop:0,marginBottom:0}))}if(!parts.length)return;node.type=newType;node.props=newProps;node.children=[...parts,...(node.children||[])];changed=true});if(changed)store.setUI({selected:id,multiSelected:[],rightOpen:true});return changed}
function updateProps(store,id,patch){store.transact('تعديل المحتوى',p=>{const h=findNodeGlobal(p,id);if(h)h.node.props={...(h.node.props||{}),...patch}})}
function updateStyle(store,id,patch,device='desktop'){store.transact('تعديل المظهر',p=>{const h=findNodeGlobal(p,id);if(!h)return;if(device==='desktop')h.node.style={...(h.node.style||{}),...patch};else h.node.responsive={...(h.node.responsive||{}),[device]:{...(h.node.responsive?.[device]||{}),...patch}}})}
function insertNodeAtDrop(store,type,targetId=null){let created;store.transact('إدراج عنصر',p=>{created=factory(type);if(type==='page-embed')created.props.pageId=p.pages.find(pg=>pg.id!==p.activePageId)?.id||'';initializeDevicePresetsTree([created],store.ui?.device||'desktop');const target=targetId?findNodeGlobal(p,targetId):null;const page=p.pages.find(x=>x.id===p.activePageId);if(target&&containerTypes.has(target.node.type)){target.node.children=target.node.children||[];target.node.children.push(created)}else if(target){const arr=target.parent?target.parent.children:target.page.nodes;arr.splice(target.index+1,0,created)}else if(page)page.nodes.push(created)});store.setUI({selected:created?.id||null});return created}
function setPageName(store,id,name){store.transact('إعادة تسمية الصفحة',p=>{const pg=p.pages.find(x=>x.id===id);if(pg){pg.name=String(name||'').trim()||pg.name;pg.slug=slugify(pg.name);pg.path=`/${pg.slug}`;pg.seo={...(pg.seo||{}),title:pg.name}}})}
exports.addNode = addNode;
exports.removeNode = removeNode;
exports.duplicateNode = duplicateNode;

function moveNodeByDrop(store,id,targetId,before=true,device='desktop'){
  if(!id||!targetId||id===targetId)return false;
  let moved=false;
  store.transact('ترتيب العناصر بالسحب',project=>{
    const source=findNodeGlobal(project,id),target=findNodeGlobal(project,targetId);
    if(!source||!target||source.nodes!==target.nodes)return;
    const siblings=source.nodes;
    const originalIndex=source.index;
    const [node]=siblings.splice(originalIndex,1);
    const targetIndex=siblings.findIndex(item=>item.id===targetId);
    if(targetIndex<0){siblings.splice(originalIndex,0,node);return}
    siblings.splice(targetIndex+(before?0:1),0,node);
    if(device==='desktop')node.style={...(node.style||{}),translate:'0px 0px'};
    else node.responsive={...(node.responsive||{}),[device]:{...(node.responsive?.[device]||{}),translate:'0px 0px'}};
    moved=true;
  });
  return moved;
}
exports.moveNode = moveNode;
exports.moveNodeByDrop = moveNodeByDrop;
exports.updateProps = updateProps;
exports.groupNodes = groupNodes;
exports.ungroupNode = ungroupNode;
exports.decomposeNode = decomposeNode;
exports.updateStyle = updateStyle;
exports.insertNodeAtDrop = insertNodeAtDrop;
exports.setPageName = setPageName;
