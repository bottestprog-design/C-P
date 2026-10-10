const {walk,countNodes} = __require("src/core/model.js");
const {safeUrl} = __require("src/core/utils.js");
const {resolvePageTarget} = __require("src/engine/routing.js");
const AUDIT_LEVELS = Object.freeze(['error','warning','info']);

const issue = (category, severity, title, detail, meta = {}) => ({
  id: `${category}:${title}`,
  category,
  severity,
  title,
  detail,
  ...meta,
});
function auditProject(project = {}) {
  const errors = [];
  const warnings = [];
  const info = [];
  const pages = Array.isArray(project.pages) ? project.pages : [];
  const pagePaths = new Map();
  const assets = Array.isArray(project.assets) ? project.assets : [];
  const ids = new Set();

  if (!project.site?.title?.trim()) errors.push(issue('seo','error','الموقع بدون عنوان عام.','أضف عنوان الموقع من إعدادات الموقع.'));
  if (!project.site?.description?.trim()) warnings.push(issue('seo','warning','الوصف العام للموقع فارغ.','أضف وصفًا مختصرًا وواضحًا للموقع.'));
  if (!project.site?.favicon) warnings.push(issue('brand','warning','لا توجد Favicon.','أضف أيقونة للموقع.'));
  if (!project.site?.baseUrl) warnings.push(issue('seo','warning','Base URL غير محدد.','حدده قبل تصدير sitemap وcanonical للإنتاج.'));
  if (!pages.length) errors.push(issue('structure','error','المشروع لا يحتوي صفحات.','أنشئ صفحة واحدة على الأقل.'));
  if (pages.length > 1) info.push(issue('structure','info',`${pages.length} صفحات في الموقع.`,'تنقل الصفحات مستقل عن ترتيبها في المستند.'));

  for (const page of pages) {
    if (ids.has(page.id)) errors.push(issue('structure','error',`معرّف صفحة مكرر: ${page.name}.`,'يجب أن تكون لكل صفحة هوية مستقلة.'));
    ids.add(page.id);
    const path = String(page.path || '').trim() || '/';
    if (pagePaths.has(path)) errors.push(issue('routing','error',`مسار صفحة مكرر: ${path}.`,'غيّر مسار إحدى الصفحات.'));
    else pagePaths.set(path,page.id);
    if (!String(page.seo?.title || '').trim()) warnings.push(issue('seo','warning',`عنوان SEO فارغ في «${page.name}».`,'أضف عنوانًا خاصًا بالصفحة.'));
    if (String(page.seo?.title || '').length > 60) info.push(issue('seo','info',`عنوان SEO طويل في «${page.name}».`,'راجع طوله لتحسين الظهور في نتائج البحث.'));
    if (String(page.seo?.description || '').length > 160) info.push(issue('seo','info',`وصف SEO طويل في «${page.name}».`,'راجع الوصف لتقليل الاقتطاع في النتائج.'));
    let h1 = 0;
    walk(page.nodes, node => {
      if (!node?.id) warnings.push(issue('structure','warning',`عنصر بدون ID في «${page.name}».`,'أعد إدراجه من Document Model.'));
      if (node?.id) ids.add(node.id);
      if (node.type === 'heading') {
        const level = Number(node.props?.level || 2);
        if (level === 1) h1 += 1;
        if (!String(node.props?.text || '').trim()) warnings.push(issue('content','warning',`عنوان فارغ في «${page.name}».`,'أدخل نصًا للعنوان.'));
      }
      if (node.type === 'image' && !String(node.props?.alt || '').trim()) warnings.push(issue('a11y','warning',`صورة بدون وصف بديل في «${page.name}».`,'أضف alt وصفيًا.'));
      if (node.type === 'image' && !String(node.props?.src || '').trim()) warnings.push(issue('assets','warning',`صورة بدون مصدر في «${page.name}».`,'اختر وسيطًا من مكتبة الأصول.'));
      if (['button','link','card','product'].includes(node.type)) {
        const url = String(node.props?.url || '').trim();
        if (!url || url === '#') warnings.push(issue('links','warning',`رابط غير مكتمل في «${page.name}».`,'حدد صفحة أو رابطًا خارجيًا.'));
        if (url.startsWith('page:') && !resolvePageTarget(url, project)) errors.push(issue('links','error',`رابط داخلي مكسور في «${page.name}».`,'الصفحة المستهدفة غير موجودة.'));
        if (/^javascript:/i.test(url)) errors.push(issue('security','error',`رابط غير آمن في «${page.name}».`,'تم رفض javascript: كوجهة.'));
      }
      if (node.type === 'form' && !node.props?.action) info.push(issue('forms','info',`النموذج في «${page.name}» لا يملك جهة إرسال.`,'هذه واجهة فقط حتى تضبط جهة الإرسال.'));
      if (['input','textarea','select'].includes(node.type) && !node.semantic?.ariaLabel && !node.props?.label) warnings.push(issue('a11y','warning',`حقل بدون تسمية واضحة في «${page.name}».`,'أضف label أو aria-label.'));
    });
    if (h1 === 0) warnings.push(issue('seo','warning',`صفحة «${page.name}» بلا H1.`,'استخدم H1 واحدًا واضحًا.'));
    if (h1 > 1) warnings.push(issue('seo','warning',`صفحة «${page.name}» تحتوي أكثر من H1.`,'اختصر التسلسل إلى عنوان رئيسي واحد.'));
  }

  const duplicateAssets = assets.length - new Set(assets.map(asset => asset.id)).size;
  if (duplicateAssets > 0) warnings.push(issue('assets','warning',`${duplicateAssets} أصول مكررة المعرف.`,'سيتم إزالة التكرار أثناء normalization.'));
  const largeAssets = assets.filter(asset => Number(asset.size || 0) > 2_000_000);
  if (largeAssets.length) info.push(issue('performance','info',`${largeAssets.length} أصول أكبر من 2MB.`,'ضغط الصور قبل التصدير يساعد الأداء.'));
  const externalLinks = pages.reduce((count,page)=>{let n=0;walk(page.nodes,node=>{for(const key of ['url','src']){const v=String(node.props?.[key]||'');if(v&&safeUrl(v)!=='#'&&/^https?:\/\//i.test(v))n++}});return count+n},0);
  if (externalLinks) info.push(issue('links','info',`${externalLinks} وجهات خارجية.`,'راجع الروابط الخارجية قبل النشر.'));

  const all = [...errors,...warnings,...info];
  const score = Math.max(0, Math.min(100, 100 - errors.length * 14 - warnings.length * 4 - info.length));
  return { score, issues: errors, warnings, info, nodes: countNodes(project), pages: pages.length, assets: assets.length, summary: { errors: errors.length, warnings: warnings.length, info: info.length, score }, all };
}
exports.AUDIT_LEVELS = AUDIT_LEVELS;
exports.auditProject = auditProject;
});
