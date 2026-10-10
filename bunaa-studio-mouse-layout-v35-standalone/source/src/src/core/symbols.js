const {deepClone,uid} = __require("src/core/utils.js");
const {makeSymbol} = __require("src/core/site-schema.js");
const {findNodeGlobal} = __require("src/core/model.js");
const {initializeDevicePresetsTree} = __require("src/core/device-presets.js");
function createSymbolFromSelection(store, name = 'مكون مشترك') {
  const selectedId = store.ui.selected;
  const hit = selectedId ? findNodeGlobal(store.project, selectedId) : null;
  if (!hit) return null;
  const symbol = makeSymbol(name, hit.node, { description: `مكون مشترك مبني من ${hit.node.type}` });
  store.transact('إنشاء مكون مشترك', project => { project.symbols ||= { definitions: [] }; project.symbols.definitions.push(symbol); });
  return symbol;
}
function insertSymbol(store, symbolId) {
  const definition = store.project.symbols?.definitions?.find(item => item.id === symbolId);
  if (!definition?.root) return null;
  let node = null;
  store.transact('إدراج مكون مشترك', project => {
    const page = project.pages.find(item => item.id === project.activePageId);
    if (!page) return;
    node = { id: uid('node'), type: 'symbol-instance', props: { symbolId, overrides: {} }, style: {}, responsive: {}, layout: { display: 'block', direction: 'column', gap: 0, align: 'stretch', justify: 'start', wrap: false }, visibility: { desktop: true, tablet: true, mobile: true }, locked: false, children: [] };
    initializeDevicePresetsTree([node], store.ui?.device || 'desktop');
    page.nodes.push(node);
  });
  return node;
}
function updateSymbol(store, symbolId, patch = {}) {
  return store.transact('تعديل المكون المشترك', project => {
    const definition = project.symbols?.definitions?.find(item => item.id === symbolId);
    if (!definition) return;
    Object.assign(definition, deepClone(patch), { version: Number(definition.version || 1) + 1, updatedAt: new Date().toISOString() });
  });
}
function removeSymbol(store, symbolId) {
  return store.transact('حذف المكون المشترك', project => {
    project.symbols.definitions = (project.symbols.definitions || []).filter(item => item.id !== symbolId);
    walkPages(project.pages, node => { if (node.type === 'symbol-instance' && node.props?.symbolId === symbolId) node.type = 'group'; });
  });
}
function resolveSymbol(project, symbolId) { return project.symbols?.definitions?.find(item => item.id === symbolId) || null; }
exports.createSymbolFromSelection = createSymbolFromSelection;
exports.insertSymbol = insertSymbol;
exports.updateSymbol = updateSymbol;
exports.removeSymbol = removeSymbol;
exports.resolveSymbol = resolveSymbol;
});
