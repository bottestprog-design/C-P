import {uid,slugify,deepClone} from './utils.js';

export const DEFAULT_THEME={primary:'#5b5ce2',secondary:'#20a06a',accent:'#f4a340',surface:'#ffffff',soft:'#f6f7fb',text:'#171b2a',muted:'#6f778b',radius:14,font:'system-ui'};
export const DEFAULT_DEVICES={desktop:{width:1180},tablet:{width:768},mobile:{width:390}};

export function makeNode(type,props={},style={},children=[]){return {id:uid('node'),type,props,style:{marginTop:0,marginBottom:14,...style},children:[...children]}}
export function makePage(name='الرئيسية',nodes=[],slug){return {id:uid('page'),name,slug:slug||slugify(name),seo:{title:name,description:'',image:''},nodes}}
export function makeProject(seed={}){const home=makePage('الرئيسية',seed.nodes||[],'home');return {version:11,meta:{name:seed.name||'مشروعي',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()},theme:{...DEFAULT_THEME,...(seed.theme||{})},devices:{...DEFAULT_DEVICES},pages:[home],assets:[],variables:{},interactions:[],settings:{advancedDevices:false,propagateDevices:false},activePageId:home.id,activeNodeId:null}}
export function normalizeProject(project){const p=deepClone(project||makeProject());p.version=11;p.meta=p.meta||{name:'مشروعي',createdAt:new Date().toISOString()};p.theme={...DEFAULT_THEME,...(p.theme||{})};p.devices={...DEFAULT_DEVICES,...(p.devices||{})};p.pages=Array.isArray(p.pages)&&p.pages.length?p.pages: [makePage('الرئيسية')];p.pages.forEach(pg=>{pg.id=pg.id||uid('page');pg.slug=slugify(pg.slug||pg.name);pg.nodes=Array.isArray(pg.nodes)?pg.nodes:[];pg.seo=pg.seo||{title:pg.name,description:'',image:''}});p.activePageId=p.pages.some(x=>x.id===p.activePageId)?p.activePageId:p.pages[0].id;p.assets=Array.isArray(p.assets)?p.assets:[];p.interactions=Array.isArray(p.interactions)?p.interactions:[];p.variables=p.variables||{};p.settings={advancedDevices:false,propagateDevices:false,...(p.settings||{})};p.meta.updatedAt=new Date().toISOString();return p}
export function walk(nodes,fn,parent=null,index=0){for(let i=0;i<nodes.length;i++){const n=nodes[i];fn(n,parent,i,nodes);if(n.children?.length)walk(n.children,fn,n,i)}}
export function findNode(project,nodeId){let found=null,parent=null,index=-1;const page=project.pages.find(p=>p.id===project.activePageId);if(!page)return null;walk(page.nodes,(n,par,i)=>{if(n.id===nodeId){found=n;parent=par;index=i}});return found?{node:found,parent,index,page}:null}
export function findNodeGlobal(project,nodeId){for(const page of project.pages){let hit=null;walk(page.nodes,(n,par,i)=>{if(n.id===nodeId)hit={node:n,parent:par,index:i,page}});if(hit)return hit}return null}
export function countNodes(project){let total=0;for(const p of project.pages)walk(p.nodes,()=>total++);return total}
export function collectIds(project){const ids=new Set();for(const p of project.pages){ids.add(p.id);walk(p.nodes,n=>ids.add(n.id))}return ids}
export function nextPageName(project){let i=1;while(project.pages.some(p=>p.name===`صفحة ${i}`))i++;return `صفحة ${i}`}
