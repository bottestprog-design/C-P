const {auditProject} = __require("src/engine/quality-audit.js");
const {pageFileMap} = __require("src/engine/exporter.js");
function compileSite(project) {
  const audit = auditProject(project);
  const map = pageFileMap(project);
  const diagnostics = { ...audit, blocking: audit.issues.length > 0, generatedAt: new Date().toISOString() };
  const manifest = {
    name: project.site?.title || project.meta?.name || 'موقع بَنّاء',
    short_name: project.meta?.name || 'موقع',
    start_url: map.get(project.pages?.[0]?.id) || 'index.html',
    display: 'standalone',
    lang: project.site?.language || 'ar',
    dir: project.site?.direction || 'rtl',
    icons: project.site?.favicon ? [{ src: project.site.favicon, sizes: 'any', type: 'image/png' }] : [],
  };
  return { diagnostics, pageMap: map, manifest, robots: robotsTxt(project), sitemap: sitemapXml(project, map) };
}

function robotsTxt(project) {
  const policy = project.site?.indexing?.robots || 'index,follow';
  const disallow = policy.includes('noindex') ? '/' : '';
  const lines = [`User-agent: *`, `Disallow: ${disallow}`];
  if (project.site?.baseUrl && project.site?.indexing?.sitemap !== false) lines.push(`Sitemap: ${project.site.baseUrl.replace(/\/$/, '')}/sitemap.xml`);
  return lines.join('\n');
}

function sitemapXml(project, map) {
  const base = String(project.site?.baseUrl || '').replace(/\/$/, '');
  const urls = (project.pages || []).filter(page => !page.settings?.hidden).map(page => {
    const href = map.get(page.id) || 'index.html';
    const loc = base ? `${base}/${href}`.replace(/index\.html$/, '') : href;
    return `<url><loc>${escapeXml(loc)}</loc></url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`;
}
function escapeXml(value) { return String(value || '').replace(/[<>&'"]/g, char => ({ '<':'&lt;', '>':'&gt;', '&':'&amp;', "'":'&apos;', '"':'&quot;' }[char])); }
exports.compileSite = compileSite;
