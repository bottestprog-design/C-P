const {deepClone,uid,slugify} = __require("src/core/utils.js");
const {makeCollection,makeCmsItem} = __require("src/core/site-schema.js");
const CMS_FIELD_TYPES = [
  ['text', 'نص'], ['textarea', 'نص طويل'], ['richtext', 'محتوى منسق'], ['number', 'رقم'], ['boolean', 'نعم/لا'],
  ['image', 'صورة'], ['url', 'رابط'], ['email', 'بريد'], ['date', 'تاريخ'], ['slug', 'Slug'], ['select', 'اختيار'],
];
function addCollection(store, name, fields = []) {
  let created = null;
  store.transact('إنشاء مجموعة محتوى', project => {
    project.cms ||= { collections: [] };
    created = makeCollection(name, fields);
    project.cms.collections.push(created);
  });
  return created;
}
function updateCollection(store, collectionId, patch = {}) {
  return store.transact('تعديل مجموعة محتوى', project => {
    const collection = project.cms?.collections?.find(item => item.id === collectionId);
    if (!collection) return;
    Object.assign(collection, deepClone(patch), { updatedAt: new Date().toISOString() });
  });
}
function removeCollection(store, collectionId) {
  return store.transact('حذف مجموعة محتوى', project => {
    project.cms.collections = (project.cms.collections || []).filter(item => item.id !== collectionId);
    walkPages(project.pages, node => { if (node.type === 'collection-list' && node.props?.collectionId === collectionId) { node.props.collectionId = ''; } });
  });
}
function addItem(store, collectionId, data = {}) {
  let item = null;
  store.transact('إضافة محتوى', project => {
    const collection = project.cms?.collections?.find(item => item.id === collectionId);
    if (!collection) return;
    item = makeCmsItem(collection, data);
    collection.items.push(item);
    collection.updatedAt = new Date().toISOString();
  });
  return item;
}
function updateItem(store, collectionId, itemId, data = {}) {
  return store.transact('تعديل محتوى', project => {
    const item = project.cms?.collections?.find(c => c.id === collectionId)?.items?.find(x => x.id === itemId);
    if (!item) return;
    item.data = { ...item.data, ...deepClone(data) };
    if (data.slug) item.slug = slugify(data.slug);
    item.updatedAt = new Date().toISOString();
  });
}
function removeItem(store, collectionId, itemId) {
  return store.transact('حذف محتوى', project => {
    const collection = project.cms?.collections?.find(item => item.id === collectionId);
    if (!collection) return;
    collection.items = (collection.items || []).filter(item => item.id !== itemId);
    collection.updatedAt = new Date().toISOString();
  });
}
function getCollection(project, collectionId) { return project.cms?.collections?.find(item => item.id === collectionId) || null; }
function getCollectionItems(project, collectionId) { return getCollection(project, collectionId)?.items || []; }

function walkPages(pages, fn) {
  for (const page of pages || []) walkNodes(page.nodes, fn);
}
function walkNodes(nodes, fn) {
  for (const node of nodes || []) { fn(node); walkNodes(node.children, fn); }
}
exports.CMS_FIELD_TYPES = CMS_FIELD_TYPES;
exports.addCollection = addCollection;
exports.updateCollection = updateCollection;
exports.removeCollection = removeCollection;
exports.addItem = addItem;
exports.updateItem = updateItem;
exports.removeItem = removeItem;
exports.getCollection = getCollection;
exports.getCollectionItems = getCollectionItems;
