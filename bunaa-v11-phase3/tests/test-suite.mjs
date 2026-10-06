import assert from 'node:assert/strict';
import {makeProject,makePage,normalizeProject,walk,findNodeGlobal,countNodes} from '../src/core/model.js';
import {definitions,factory,supportedTypes} from '../src/catalog/components.js';
import {templates,materializeTemplate} from '../src/catalog/templates.js';
import {makeInteraction,interactionsFor} from '../src/engine/interaction.js';

const project=makeProject({name:'اختبار'});
assert.equal(project.pages.length,1);assert.equal(project.activePageId,project.pages[0].id);
const sample=materializeTemplate(templates[0]);assert.ok(sample.pages.length>=1);assert.ok(sample.pages[0].nodes.length>=3);
project.pages=sample.pages;project.activePageId=project.pages[0].id;assert.ok(countNodes(project)>0);
const seen=new Set();walk(project.pages[0].nodes,n=>{assert.ok(supportedTypes.has(n.type));assert.ok(!seen.has(n.id));seen.add(n.id)});
for(const d of definitions){const n=factory(d.type);assert.ok(n&&n.type===d.type)}
const nested=project.pages[0].nodes.find(n=>n.children?.length);if(nested){const id=nested.children[0].id;assert.equal(findNodeGlobal(project,id).node.id,id)}
const int=makeInteraction(project.pages[0].nodes[0].id,'click','motion',{motion:'fade'});project.interactions=[int];assert.equal(interactionsFor(project,int.sourceId).length,1);
const broken=normalizeProject({...project,pages:[]});assert.equal(broken.pages.length,1);
const duplicate=normalizeProject({...project,pages:[{...project.pages[0],id:'same',slug:'same'},{...project.pages[0],id:'same',slug:'same'}]});assert.notEqual(duplicate.pages[0].id,duplicate.pages[1].id);assert.notEqual(duplicate.pages[0].slug,duplicate.pages[1].slug);
const orphan=normalizeProject({...project,interactions:[{id:'x',sourceId:'missing',options:{targetId:'missing'}}]});assert.equal(orphan.interactions.length,0);
console.log(`PASS — unit/model tests (${definitions.length} components, ${templates.length} templates)`);
