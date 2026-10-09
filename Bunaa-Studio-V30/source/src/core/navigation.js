const {deepClone,uid} = __require("src/core/utils.js");
const MENU_TYPES = Object.freeze({ PAGE: 'page', URL: 'url', ANCHOR: 'anchor' });
function visiblePages(project) {
  return (project?.pages || []).filter(page => page?.settings?.hidden !== true && page?.status !== 'archived');
}
function ensurePageMenu(project, menuId = project?.navigation?.headerMenuId || 'main') {
  project.navigation ||= {};
  project.navigation.menus ||= [];
  let menu = project.navigation.menus.find(item => item.id === menuId);
  if (!menu) {
    menu = { id: menuId, name: menuId === 'main' ? 'الرئيسية' : 'قائمة جديدة', items: [] };
    project.navigation.menus.push(menu);
  }
  menu.items = Array.isArray(menu.items) ? menu.items : [];
  const pages = visiblePages(project);
  const pageIds = new Set(pages.map(page => page.id));
  const existingPageIds = new Set(menu.items.filter(item => item.type === MENU_TYPES.PAGE).map(item => item.targetId));
  for (const page of pages) {
    if (existingPageIds.has(page.id)) continue;
    menu.items.push({ id: uid('nav'), label: page.name, type: MENU_TYPES.PAGE, targetId: page.id, url: '', newTab: false, children: [] });
  }
  menu.items = menu.items.filter(item => item.type !== MENU_TYPES.PAGE || pageIds.has(item.targetId));
  return menu;
}
function addMenuItem(store, menuId, item = {}) {
  return store.transact('إضافة عنصر للقائمة', project => {
    const menu = ensurePageMenu(project, menuId);
    menu.items.push({ id: uid('nav'), label: String(item.label || 'رابط'), type: item.type === MENU_TYPES.URL ? MENU_TYPES.URL : MENU_TYPES.PAGE, targetId: item.targetId || null, url: String(item.url || ''), newTab: Boolean(item.newTab), children: [] });
  });
}
function updateMenuItem(store, menuId, itemId, patch = {}) {
  return store.transact('تعديل عنصر القائمة', project => {
    const menu = project.navigation?.menus?.find(item => item.id === menuId);
    const item = menu?.items?.find(entry => entry.id === itemId);
    if (!item) return;
    Object.assign(item, deepClone(patch));
  });
}
function removeMenuItem(store, menuId, itemId) {
  return store.transact('حذف عنصر القائمة', project => {
    const menu = project.navigation?.menus?.find(item => item.id === menuId);
    if (!menu) return;
    menu.items = menu.items.filter(item => item.id !== itemId);
  });
}
function reorderMenuItem(store, menuId, itemId, direction) {
  return store.transact(direction === 'up' ? 'رفع عنصر القائمة' : 'خفض عنصر القائمة', project => {
    const menu = project.navigation?.menus?.find(item => item.id === menuId);
    if (!menu) return;
    const index = menu.items.findIndex(item => item.id === itemId);
    const next = index + (direction === 'up' ? -1 : 1);
    if (index < 0 || next < 0 || next >= menu.items.length) return;
    [menu.items[index], menu.items[next]] = [menu.items[next], menu.items[index]];
  });
}
function syncAllPageMenus(store) {
  return store.transact('مزامنة قوائم الموقع', project => {
    for (const menu of project.navigation?.menus || []) {
      const isHeader = menu.id === project.navigation?.headerMenuId;
      if (isHeader) ensurePageMenu(project, menu.id);
    }
  });
}
exports.MENU_TYPES = MENU_TYPES;
exports.visiblePages = visiblePages;
exports.ensurePageMenu = ensurePageMenu;
exports.addMenuItem = addMenuItem;
exports.updateMenuItem = updateMenuItem;
exports.removeMenuItem = removeMenuItem;
exports.reorderMenuItem = reorderMenuItem;
exports.syncAllPageMenus = syncAllPageMenus;
