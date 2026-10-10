'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');

function sourceModule(id) {
  let source = fs.readFileSync(path.join(root, 'source', 'src', id), 'utf8').trimEnd();
  if (source.endsWith('});')) source = source.slice(0, -3).trimEnd();
  return source;
}
let uidCounter = 0;
function findNodeGlobal(project, id) {
  for (const page of project.pages || []) {
    const visit = (nodes, parent = null) => {
      for (let index = 0; index < (nodes || []).length; index++) {
        const node = nodes[index];
        if (node.id === id) return { node, parent, index, nodes, page };
        const found = visit(node.children || [], node);
        if (found) return found;
      }
      return null;
    };
    const found = visit(page.nodes || []);
    if (found) return found;
  }
  return null;
}
function walk(nodes, fn, parent = null) {
  (nodes || []).forEach((node, index) => { fn(node, parent, index, nodes); walk(node.children || [], fn, node); });
}
const mocks = {
  'src/catalog/components.js': { factory(type) { return { id: `new_${++uidCounter}`, type, props: {}, style: { marginTop: 0, marginBottom: 14 }, responsive: {}, layout: { display: 'block' }, children: [], locked: false }; } },
  'src/core/utils.js': { uid(prefix = 'id') { return `${prefix}_${++uidCounter}`; }, deepClone(v) { return structuredClone(v); }, slugify(v) { return String(v).toLowerCase().replace(/\W+/g, '-'); } },
  'src/core/model.js': { findNodeGlobal, walk },
  'src/core/device-presets.js': { initializeDevicePresetsTree(nodes) { return nodes; } },
};
function load(id, moreMocks = {}) {
  const moduleExports = {};
  const require = key => {
    if (Object.prototype.hasOwnProperty.call(moreMocks, key)) return moreMocks[key];
    if (Object.prototype.hasOwnProperty.call(mocks, key)) return mocks[key];
    throw new Error(`Unexpected module dependency in smoke test: ${key}`);
  };
  const run = new Function('exports', '__require', sourceModule(id));
  run(moduleExports, require);
  return moduleExports;
}
function makeNode(id, type='text', children=[]) { return { id, type, props:{text:id}, style:{}, responsive:{}, layout:{display:'block'}, children, locked:false }; }
function makeStore(nodes) {
  const page = { id:'p1', name:'Home', nodes };
  const store = { project:{activePageId:'p1',pages:[page],interactions:[],devices:{desktop:{width:1180}}}, ui:{device:'desktop',selected:null},
    transact(_label, mutator) { mutator(this.project); return true; },
    setUI(patch) { this.ui={...this.ui,...patch}; },
  };
  return store;
}

// Store commands are tested as actual source functions with a focused project model.
const commands = load('src/core/commands.js');
{
  const store = makeStore([makeNode('a'), makeNode('b'), makeNode('c')]);
  assert.equal(commands.moveNodeByDrop(store,'a','c',false,'desktop',false), true);
  assert.deepEqual(store.project.pages[0].nodes.map(n=>n.id), ['b','c','a'], 'drag after target reorders root siblings');
  commands.moveNodeToEnd(store, 'b');
  assert.deepEqual(store.project.pages[0].nodes.map(n=>n.id), ['c','a','b'], 'drop on blank canvas moves item to end of its parent');
}
{
  const store = makeStore([makeNode('a'), makeNode('b'), makeNode('c')]);
  const group = commands.groupNodes(store, ['c','a','b'], 'row');
  assert.ok(group, 'creates a group');
  assert.equal(store.project.pages[0].nodes.length, 1, 'selected siblings are replaced by one group');
  assert.deepEqual(group.children.map(n=>n.id), ['a','b','c'], 'group preserves document order');
  assert.equal(group.props.groupLayout, 'row');
  assert.equal(group.style.flexDirection, 'row');
}
{
  const store = makeStore([makeNode('parent','container',[makeNode('child')]), makeNode('sibling')]);
  const before = JSON.stringify(store.project.pages[0].nodes);
  assert.equal(commands.groupNodes(store, ['child','sibling'], 'grid'), null, 'rejects cross-parent grouping');
  assert.equal(JSON.stringify(store.project.pages[0].nodes), before, 'invalid grouping never mutates or deletes nodes');
}
{
  const store = makeStore([makeNode('source'), makeNode('box','container')]);
  assert.equal(commands.moveNodeByDrop(store,'source','box',true,'desktop',true), true, 'can drop an element into a container');
  assert.deepEqual(store.project.pages[0].nodes.map(n=>n.id), ['box']);
  assert.deepEqual(store.project.pages[0].nodes[0].children.map(n=>n.id), ['source']);
}
{
  const store = makeStore([makeNode('img','image')]);
  store.project.pages[0].nodes[0].responsive={desktop:{height:300}};
  commands.updateStyle(store, 'img', {width:280,height:156}, 'desktop');
  const node = store.project.pages[0].nodes[0];
  assert.equal(node.style.width,280); assert.equal(node.style.height,156);
  assert.deepEqual(node.responsive.desktop,{height:156,width:280},'desktop resize overrides old device defaults');
  commands.updateStyle(store,'img',{width:180},'mobile');
  assert.equal(node.responsive.mobile.width,180); assert.equal(node.style.width,280,'mobile resize does not overwrite desktop size');
}

// Layout sizing: leaves are intrinsic-size, structural sections deliberately fill the available row.
const layout = load('src/engine/layout.js', {
  'src/core/utils.js': { clamp(v,min,max){return Math.min(max,Math.max(min,v));} },
  'src/core/design-system.js': { getToken(_theme,_name,fallback){return fallback;} },
  'src/core/variables.js': { resolveVariableValue(v){return v;} },
});
const project={devices:{desktop:{width:1180},tablet:{width:768},mobile:{width:390}},theme:{text:'#111'},styleLibrary:{}};
const leaf=layout.resolveStyle(makeNode('btn','button'), 'desktop', {}, {}, project);
assert.equal(leaf.width, undefined, 'default button has no forced full-row width');
const section=layout.resolveStyle(makeNode('sec','section'), 'desktop', {}, {}, project);
assert.equal(section.width, '100%', 'layout section keeps intentional full width');
const oldImage=makeNode('old-img','image');oldImage.style={width:'100%',height:300,radius:16,objectFit:'cover'};oldImage.responsive={desktop:{height:300}};
const imageStyle=layout.resolveStyle(oldImage,'desktop',{}, {},project);
assert.equal(imageStyle.width,'280px','legacy auto-generated full-width image gets a compact default');
assert.equal(imageStyle.height,'156px','legacy image keeps compact height instead of preset 300px');
const field=makeNode('field','input');field.responsive={desktop:{width:'100%'}};
assert.equal(layout.resolveStyle(field,'desktop',{}, {},project).width,'220px','legacy auto-generated input becomes intrinsic-width');
const edited=makeNode('edited','image');edited.style={width:360,height:180};edited.responsive={desktop:{height:300}};
assert.equal(layout.resolveStyle(edited,'desktop',{}, {},project).height,'180px','explicit desktop height beats stale preset');

// Bundle, HTML linkage, preview/export contracts, and package source consistency.
const bundle=fs.readFileSync(path.join(root,'bundle-extracted.js'),'utf8');
const moduleIds=[...bundle.matchAll(/__modules\.set\("([^"]+)",\(exports,__require\)=>\{/g)].map(m=>m[1]);
assert.equal(moduleIds.length,49,'all original source modules stay in the bundle');
for(const id of moduleIds) assert.ok(fs.existsSync(path.join(root,'source','src',id)),`source file exists for ${id}`);
const requiredTokens=['moveNodeByDrop','moveNodeToEnd','groupNodes','node-resize-handle','selection-marquee','groupSelectionBtn','canvasPreviewBtn','window.open(\'about:blank\'','groupLayout','savedScrollTop','this.viewport.scrollTop=Math.min(savedScrollTop,maxTop)'];
for(const token of requiredTokens) assert.ok(bundle.includes(token),`bundle includes ${token}`);
for(const rel of ['index.html','Bunaa.html']) {
  const html=fs.readFileSync(path.join(root,rel),'utf8');
  assert.ok(html.includes('id="bunaa-direct-manipulation"'),`${rel} includes direct manipulation CSS`);
  assert.equal((html.match(/id="groupSelectionBtn"/g)||[]).length,1,`${rel} has one grouping control`);
  assert.equal((html.match(/id="canvasPreviewBtn"/g)||[]).length,1,`${rel} has one visible workspace preview control`);
  assert.ok(html.includes('window.open(\'about:blank\''),`${rel} embeds the new preview behavior`);
  assert.ok(html.includes('data-custom-width'),`${rel} contains the sizing contract`);
  assert.ok(html.includes('id="previewBtn"'),`${rel} keeps original preview control`);
  const inlineStart=html.indexOf('<script>');
  const inlineEnd=html.lastIndexOf('</script>');
  assert.ok(inlineStart>=0&&inlineEnd>inlineStart,`${rel} has an embedded app bundle`);
  assert.equal(html.slice(inlineStart+8,inlineEnd).trim(),bundle.trim(),`${rel} embeds the exact tested bundle`);
}
const workspace=sourceModule('src/engine/workspace.js');
assert.ok(workspace.includes("g.kind==='marquee'"), 'workspace implements rectangle selection');
assert.ok(workspace.includes("kind:'resize'"), 'workspace implements mouse resize');
assert.ok(workspace.includes('this.viewport.scrollTop=Math.min(savedScrollTop,maxTop)'), 'rerender keeps the workspace scroll location');
assert.ok(workspace.includes('value=\"stack\"') || workspace.includes('value=\'stack\''), 'group layout includes stack mode');
const dialogs=sourceModule('src/ui/dialogs.js');
assert.ok(dialogs.includes('URL.createObjectURL(new Blob([html]'), 'preview opens a real standalone page');
assert.ok(dialogs.includes('previewFrame'), 'preview has an iframe fallback when popups are blocked');
assert.ok(dialogs.includes('canvasPreviewBtn'), 'workspace preview control is wired');
const exporter=sourceModule('src/engine/exporter.js');
assert.ok(exporter.includes('main{display:flex;flex-wrap:wrap'), 'exporter maintains compact flow');
console.log('PASS direct manipulation smoke: source/model checks; 49-module bundle; standalone HTML bundle parity');
