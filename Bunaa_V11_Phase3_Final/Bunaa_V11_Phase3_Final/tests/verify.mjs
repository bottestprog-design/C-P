import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';
const root=path.resolve(new URL('..',import.meta.url).pathname.replace(/^\/(?:[A-Za-z]:)/,''));
const required=['index.html','styles.css','app.js','js/core.js','js/model.js','js/catalog.js','js/store.js','js/renderer.js','js/interactions.js','js/exporter.js','js/ui.js','js/editor.js'];
for(const f of required)if(!fs.existsSync(path.join(root,f)))throw new Error('Missing '+f);
for(const f of required.filter(x=>x.endsWith('.js'))){const r=spawnSync(process.execPath,['--check',path.join(root,f)],{encoding:'utf8'});if(r.status!==0)throw new Error(`${f} syntax error: ${r.stderr}`)}
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const f of required.slice(3).filter(x=>x.startsWith('js/')))if(!html.includes(f))throw new Error('index does not reference '+f);
if(!html.includes('styles.css'))throw new Error('index does not reference styles.css');
const domIds=[...html.matchAll(/id=\"([^\"]+)\"/g)].map(m=>m[1]);
for(const id of domIds)if(!html.includes(`id=\"${id}\"`))throw new Error('id scan failure');
if(/type=["']module["']/.test(html))throw new Error('Static build unexpectedly uses ES modules');

class ClassList{constructor(){this.s=new Set()}add(...x){x.forEach(v=>this.s.add(v))}remove(...x){x.forEach(v=>this.s.delete(v))}toggle(v,force){if(force===undefined){if(this.s.has(v)){this.s.delete(v);return false}this.s.add(v);return true}if(force)this.s.add(v);else this.s.delete(v);return force}contains(v){return this.s.has(v)}}
const document={getElementById(){return null},querySelector(){return null},querySelectorAll(){return []},createElement(){return {style:{},click(){},remove(){}}},body:{appendChild(){}}};
const context={window:null,document,console,Blob:function(){},URL:{createObjectURL(){return'blob:'},revokeObjectURL(){}},CSS:{escape:s=>String(s)}};context.window=context;
vm.createContext(context);
for(const f of ['js/core.js','js/model.js','js/catalog.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),context,{filename:f});
const B=context.Bunaa;
const model=B.Model;
const project=model.createProject();
if(!project.pages.length)throw new Error('starter page missing');
const page=project.pages[0];
const parent=model.create('container');
const child=model.create('button',{text:'Child'});
parent.children=[child];page.nodes.push(parent);
const normalized=model.normalizeProject(project);
if(!model.find(normalized.pages[0].nodes,child.id))throw new Error('nested find failed');
if(model.parentOf(normalized.pages[0].nodes,child.id)?.id!==parent.id)throw new Error('parent lookup failed');
if(!model.contains(parent,child.id))throw new Error('contains failed');
if(model.reparent(normalized.pages[0].nodes,child.id,child.id)!==false)throw new Error('cycle prevention failed');
model.reparent(normalized.pages[0].nodes,child.id,null);
if(model.parentOf(normalized.pages[0].nodes,child.id)!==null)throw new Error('detach failed');
const old={schema:6,pages:[{id:'p',name:'A',slug:'a',nodes:[{id:'n',type:'stack',layout:{widthMode:'auto',heightMode:'auto'}}]}],activePageId:'p'};
const migrated=model.normalizeProject(old);
const migratedNode=migrated.pages[0].nodes[0];
if(migratedNode.layout.widthMode!=='hug'||migratedNode.layout.heightMode!=='hug'||migratedNode.layout.display!=='flex')throw new Error('migration failed');
if(B.Core.safeUrl('javascript:alert(1)')!=='#')throw new Error('unsafe URL allowed');

vm.runInContext(fs.readFileSync(path.join(root,'js/store.js'),'utf8'),context,{filename:'js/store.js'});
const store=context.Bunaa.Store.create();
store.load();
const initialName=store.activePage().name;
store.commit('rename',p=>{p.pages[0].name='اختبار'});
if(store.activePage().name!=='اختبار')throw new Error('store commit failed');
store.undo();
if(store.activePage().name!==initialName)throw new Error('store undo failed');
store.redo();
if(store.activePage().name!=='اختبار')throw new Error('store redo failed');

console.log('PASS: structure + syntax + model tree + migration + cycle guard + URL safety + store history');
