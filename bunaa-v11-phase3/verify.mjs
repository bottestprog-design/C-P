import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {definitions,supportedTypes} from './src/catalog/components.js';
import {templates,materializeTemplate,validateTemplate} from './src/catalog/templates.js';
import {makeProject,normalizeProject,countNodes,walk} from './src/core/model.js';

const root=path.dirname(fileURLToPath(import.meta.url));
const required=['index.html','styles/app.css','src/main.js','src/app/app.js','src/core/model.js','src/core/store.js','src/core/commands.js','src/core/utils.js','src/catalog/components.js','src/catalog/templates.js','src/engine/renderer.js','src/engine/layout.js','src/engine/interaction.js','src/engine/exporter.js','src/ui/modal.js','src/ui/panels.js','src/ui/inspector.js','src/ui/dialogs.js','README.md','ARCHITECTURE.md','tests/test-suite.mjs'];
const errors=[];const ok=m=>console.log('✓',m);const fail=m=>{errors.push(m);console.error('✗',m)};
for(const f of required)fs.existsSync(path.join(root,f))?ok(`file ${f}`):fail(`missing ${f}`);
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const ref of html.matchAll(/(?:src|href)="([^"]+)"/g)){const r=ref[1];if(r.startsWith('.')||r.includes('/')){if(!['https:','http:'].includes(r.split(':')[0]))fs.existsSync(path.join(root,r))?ok(`reference ${r}`):fail(`broken reference ${r}`)}}
const ids=[...html.matchAll(/id="([^"]+)"/g)].map(x=>x[1]);const dup=ids.filter((x,i)=>ids.indexOf(x)!==i);dup.length?fail(`duplicate ids ${[...new Set(dup)].join(',')}`):ok(`${ids.length} unique DOM ids`);
for(const d of definitions)typeof d.factory==='function'?ok(`factory ${d.type}`):fail(`no factory ${d.type}`);
if(definitions.length>=40)ok(`${definitions.length} component definitions`);else fail(`catalog too small: ${definitions.length}`);
if(templates.length>=9&&templates.every(validateTemplate))ok(`${templates.length} valid templates`);else fail('invalid templates');
for(const t of templates){for(let i=0;i<2;i++){const m=materializeTemplate(t);const ids=new Set();let dupId=false;for(const p of m.pages){if(ids.has(p.id))dupId=true;ids.add(p.id);walk(p.nodes,n=>{if(ids.has(n.id))dupId=true;ids.add(n.id);if(!supportedTypes.has(n.type))fail(`unsupported type ${n.type} in ${t.name}`)})}dupId?fail(`duplicate ids after materializing ${t.name}`):ok(`template isolation ${t.name} pass ${i+1}`)}}
const base=normalizeProject(makeProject());base.pages[0].nodes=materializeTemplate(templates[0]).pages[0].nodes;countNodes(base)>0?ok(`starter has ${countNodes(base)} nodes`):fail('starter is empty');
const imports=[];for(const f of fs.readdirSync(path.join(root,'src'),{withFileTypes:true})){if(f.isDirectory())for(const child of fs.readdirSync(path.join(root,'src',f.name))){if(child.endsWith('.js'))imports.push(path.join(root,'src',f.name,child))}else if(f.name.endsWith('.js'))imports.push(path.join(root,'src',f.name))}
for(const file of [path.join(root,'src','main.js'),...imports]){const text=fs.readFileSync(file,'utf8');for(const m of text.matchAll(/from\s+['"](\.{1,2}\/[^'"]+)['"]/g)){const resolved=path.resolve(path.dirname(file),m[1]);if(fs.existsSync(resolved))ok(`import ${path.relative(root,resolved)}`);else fail(`broken import ${path.relative(root,resolved)}`)}}
if(errors.length){console.error(`\n${errors.length} verification errors`);process.exit(1)}console.log(`\nPASS — V11 Phase 3 verification`);
