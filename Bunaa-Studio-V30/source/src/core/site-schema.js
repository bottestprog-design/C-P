const {deepClone,uid,slugify} = __require("src/core/utils.js");
const SITE_SCHEMA_VERSION = 20;
const DEFAULT_SITE = {
  title: 'موقع جديد',
  description: 'موقع تم بناؤه باستخدام بَنّاء.',
  language: 'ar',
  direction: 'rtl',
  locale: 'ar-OM',
  baseUrl: '',
  favicon: '',
  socialImage: '',
  author: '',
  brand: { name: 'بَنّاء', logo: '', mark: 'ب' },
  analytics: { provider: 'none', measurementId: '' },
  indexing: { robots: 'index,follow', sitemap: true },
  links: { email: '', phone: '', whatsapp: '' },
};
const DEFAULT_NAVIGATION = {
  menus: [
    { id: 'main', name: 'الرئيسية', items: [] },
    { id: 'footer', name: 'التذييل', items: [] },
  ],
  headerMenuId: 'main',
  footerMenuId: 'footer',
};
const DEFAULT_CMS = { collections: [] };
const DEFAULT_SYMBOLS = { definitions: [] };
const DEFAULT_GLOBALS = { header: null, footer: null };
const DEFAULT_STYLE_LIBRARY = { classes: {}, textStyles: {}, effects: {}, components: {}, states: {} };

const isObject = value => value && typeof value === 'object' && !Array.isArray(value);
function makeCollection(name = 'مجموعة جديدة', fields = []) {
  const clean = String(name || '').trim() || 'مجموعة جديدة';
  const key = slugify(clean).replace(/-/g, '_') || `collection_${Date.now()}`;
  return {
    id: uid('collection'),
    name: clean,
    key,
    route: `/${slugify(clean)}`,
    fields: fields.length ? deepClone(fields) : [
      { id: uid('field'), key: 'title', label: 'العنوان', type: 'text', required: true },
      { id: uid('field'), key: 'slug', label: 'الرابط', type: 'slug', required: true },
      { id: uid('field'), key: 'body', label: 'المحتوى', type: 'richtext', required: false },
      { id: uid('field'), key: 'image', label: 'الصورة', type: 'image', required: false },
    ],
    items: [],
    settings: { public: true, sortBy: 'createdAt', sortDirection: 'desc' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
function makeCmsItem(collection, data = {}) {
  return {
    id: uid('item'),
    collectionId: collection?.id || null,
    slug: String(data.slug || data.title || 'item').trim().toLowerCase().replace(/\s+/g, '-'),
    data: isObject(data) ? deepClone(data) : {},
    status: 'published',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
function makeSymbol(name = 'مكون مشترك', root = null, options = {}) {
  return {
    id: uid('symbol'),
    name: String(name || 'مكون مشترك').trim() || 'مكون مشترك',
    description: String(options.description || ''),
    root: root ? deepClone(root) : null,
    props: isObject(options.props) ? deepClone(options.props) : {},
    slots: Array.isArray(options.slots) ? deepClone(options.slots) : [],
    scope: options.scope === 'page' ? 'page' : 'site',
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
function normalizeSite(site = {}) {
  return { ...deepClone(DEFAULT_SITE), ...(isObject(site) ? deepClone(site) : {}), brand: { ...DEFAULT_SITE.brand, ...(site?.brand || {}) }, analytics: { ...DEFAULT_SITE.analytics, ...(site?.analytics || {}) }, indexing: { ...DEFAULT_SITE.indexing, ...(site?.indexing || {}) }, links: { ...DEFAULT_SITE.links, ...(site?.links || {}) } };
}
function normalizeNavigation(navigation = {}) {
  const menus = Array.isArray(navigation.menus) && navigation.menus.length ? navigation.menus : deepClone(DEFAULT_NAVIGATION.menus);
  return {
    ...deepClone(DEFAULT_NAVIGATION),
    ...(isObject(navigation) ? deepClone(navigation) : {}),
    menus: menus.map(menu => ({ id: String(menu?.id || uid('menu')), name: String(menu?.name || 'قائمة'), items: Array.isArray(menu?.items) ? deepClone(menu.items) : [] })),
  };
}
function normalizeCms(cms = {}) {
  return {
    collections: Array.isArray(cms?.collections) ? deepClone(cms.collections).map(collection => ({
      ...collection,
      fields: Array.isArray(collection.fields) ? collection.fields : [],
      items: Array.isArray(collection.items) ? collection.items : [],
      settings: { public: true, sortBy: 'createdAt', sortDirection: 'desc', ...(collection.settings || {}) },
    })) : [],
  };
}
function normalizeSymbols(symbols = {}) {
  return { definitions: Array.isArray(symbols?.definitions) ? deepClone(symbols.definitions).filter(item => item?.id && item?.root) : [] };
}
function normalizeGlobals(globals = {}) {
  return { ...deepClone(DEFAULT_GLOBALS), ...(isObject(globals) ? deepClone(globals) : {}) };
}
function normalizeStyleLibrary(library = {}) {
  return { ...deepClone(DEFAULT_STYLE_LIBRARY), ...(isObject(library) ? deepClone(library) : {}), classes: isObject(library?.classes) ? deepClone(library.classes) : {}, textStyles: isObject(library?.textStyles) ? deepClone(library.textStyles) : {}, effects: isObject(library?.effects) ? deepClone(library.effects) : {}, components: isObject(library?.components) ? deepClone(library.components) : {}, states: isObject(library?.states) ? deepClone(library.states) : {} };
}
exports.SITE_SCHEMA_VERSION = SITE_SCHEMA_VERSION;
exports.DEFAULT_SITE = DEFAULT_SITE;
exports.DEFAULT_NAVIGATION = DEFAULT_NAVIGATION;
exports.DEFAULT_CMS = DEFAULT_CMS;
exports.DEFAULT_SYMBOLS = DEFAULT_SYMBOLS;
exports.DEFAULT_GLOBALS = DEFAULT_GLOBALS;
exports.DEFAULT_STYLE_LIBRARY = DEFAULT_STYLE_LIBRARY;
exports.makeCollection = makeCollection;
exports.makeCmsItem = makeCmsItem;
exports.makeSymbol = makeSymbol;
exports.normalizeSite = normalizeSite;
exports.normalizeNavigation = normalizeNavigation;
exports.normalizeCms = normalizeCms;
exports.normalizeSymbols = normalizeSymbols;
exports.normalizeGlobals = normalizeGlobals;
exports.normalizeStyleLibrary = normalizeStyleLibrary;
