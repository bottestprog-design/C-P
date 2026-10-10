const {addMenuItem,updateMenuItem,removeMenuItem,reorderMenuItem,ensurePageMenu,visiblePages} = __require("src/core/navigation.js");
function getMenus(project) {
  return (project?.navigation?.menus || []).map(menu => ({ ...menu, items: Array.isArray(menu.items) ? menu.items : [] }));
}
function getHeaderMenu(project) {
  return getMenus(project).find(menu => menu.id === project?.navigation?.headerMenuId) || getMenus(project)[0] || null;
}
function syncNavigation(project) {
  const draft = { ...project, navigation: structuredClone(project.navigation || {}) };
  if (!draft.navigation.headerMenuId) draft.navigation.headerMenuId = 'main';
  ensurePageMenu(draft, draft.navigation.headerMenuId);
  return draft.navigation;
}
const navigationActions = { addMenuItem, updateMenuItem, removeMenuItem, reorderMenuItem, visiblePages };
exports.getMenus = getMenus;
exports.getHeaderMenu = getHeaderMenu;
exports.syncNavigation = syncNavigation;
exports.navigationActions = navigationActions;
});
