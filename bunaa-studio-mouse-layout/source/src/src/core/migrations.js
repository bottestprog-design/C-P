const {deepClone} = __require("src/core/utils.js");
const {SCHEMA_VERSION,normalizeProject} = __require("src/core/model.js");
const {DEFAULT_CMS,DEFAULT_GLOBALS,DEFAULT_NAVIGATION,DEFAULT_SITE,DEFAULT_SYMBOLS,DEFAULT_STYLE_LIBRARY,normalizeCms,normalizeGlobals,normalizeNavigation,normalizeSite,normalizeSymbols,normalizeStyleLibrary} = __require("src/core/site-schema.js");
const CURRENT_SCHEMA = 26;
function migrateProject(input) {
  const source = deepClone(input || {});
  const version = Number(source.version || 0);
  const next = {
    ...source,
    version: CURRENT_SCHEMA,
    site: normalizeSite({ ...DEFAULT_SITE, ...(source.site || {}) }),
    navigation: normalizeNavigation({ ...DEFAULT_NAVIGATION, ...(source.navigation || {}) }),
    cms: normalizeCms({ ...DEFAULT_CMS, ...(source.cms || {}) }),
    symbols: normalizeSymbols({ ...DEFAULT_SYMBOLS, ...(source.symbols || {}) }),
    globals: normalizeGlobals({ ...DEFAULT_GLOBALS, ...(source.globals || {}) }),
    styleLibrary: normalizeStyleLibrary({ ...DEFAULT_STYLE_LIBRARY, ...(source.styleLibrary || {}) }),
    release: {
      channel: 'draft',
      status: 'draft',
      version: 1,
      publishedAt: null,
      ...(source.release || {}),
    },
    seo: {
      enabled: true,
      canonicalMode: 'auto',
      ...(source.seo || {}),
    },
  };

  if (!next.navigation.menus.some(menu => menu.id === next.navigation.headerMenuId)) next.navigation.headerMenuId = next.navigation.menus[0]?.id || null;
  if (!next.navigation.menus.some(menu => menu.id === next.navigation.footerMenuId)) next.navigation.footerMenuId = next.navigation.menus[0]?.id || null;

  // V11–V15 stored site title only in meta. Keep it as the first source for the new site object.
  if (version < 16) {
    next.site.title = next.site.title === DEFAULT_SITE.title ? String(next.meta?.name || DEFAULT_SITE.title) : next.site.title;
    next.site.description = next.site.description === DEFAULT_SITE.description ? String(next.meta?.description || DEFAULT_SITE.description) : next.site.description;
  }

  next.theme ||= {};
  next.theme.tokens ||= {};
  next.theme.tokens.typography ||= {};
  next.theme.tokens.motion ||= { fast: 180, normal: 360, slow: 720 };
  const normalized = normalizeProject(next);
  normalized.version = SCHEMA_VERSION;
  normalized.site = normalizeSite(normalized.site);
  normalized.navigation = normalizeNavigation(normalized.navigation);
  normalized.cms = normalizeCms(normalized.cms);
  normalized.symbols = normalizeSymbols(normalized.symbols);
  normalized.globals = normalizeGlobals(normalized.globals);
  normalized.styleLibrary = normalizeStyleLibrary(normalized.styleLibrary);
  normalized.release = { channel: 'draft', status: 'draft', version: 1, publishedAt: null, ...(normalized.release || {}) };
  normalized.seo = { enabled: true, canonicalMode: 'auto', ...(normalized.seo || {}) };
  return normalized;
}
exports.CURRENT_SCHEMA = CURRENT_SCHEMA;
exports.migrateProject = migrateProject;
});
