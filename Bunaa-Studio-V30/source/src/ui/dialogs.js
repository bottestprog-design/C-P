const {showModal} = __require("src/ui/modal.js");
const {exportZip,exportCurrentHtml,exportProjectJson} = __require("src/engine/exporter.js");
const {nodeHtml} = __require("src/engine/renderer.js");
const {pageAnchor} = __require("src/engine/routing.js");
const {buildPreviewRuntimeScript} = __require("src/engine/preview-router.js");
const {auditProject} = __require("src/engine/quality-audit.js");
class Dialogs{
  constructor(store){this.store=store;this.host=document.getElementById('modalHost')}
  bind(){const on=(id,fn)=>document.getElementById(id)?.addEventListener('click',fn);on('previewBtn',()=>this.preview());on('exportBtn',()=>this.export());on('qualityBtn',()=>this.quality());on('globalStyleBtn',()=>this.theme());on('shortcutsBtn',()=>this.shortcuts());on('advancedDevicesBtn',()=>this.store.setUI({advancedDevices:!this.store.ui.advancedDevices}))}
  preview(){const html=this.previewHtml();const modal=showModal(this.host,{title:'معاينة الموقع',body:'<iframe id="previewFrame" class="preview-iframe" title="المعاينة"></iframe>',wide:true});const frame=modal.querySelector('#previewFrame');frame.srcdoc=html;return modal}
  previewHtml(){
    const project=this.store.project;
    const pages=project.pages;
    const nav=pages.map(page=>`<a href="${pageAnchor(page.id)}" data-page-target="${escapeText(page.id)}">${escapeText(page.name)}</a>`).join('');
    const sections=pages.map((page,index)=>{
      const body=(page.nodes||[]).map(node=>nodeHtml(node,project.theme,project,'desktop',null)).join('');
      return `<section class="preview-page" data-preview-section="${escapeText(page.id)}" id="page-${encodeURIComponent(page.id)}" ${index?'hidden':''}><main>${body}</main></section>`;
    }).join('');
    const theme=project.theme;
    const script=buildPreviewRuntimeScript(pages.map(page=>page.id),project.interactions||[]);
    return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html{scroll-behavior:smooth}body{margin:0;font-family:system-ui;color:${theme.text};background:#fff;line-height:1.6}.preview-nav{position:sticky;top:0;z-index:10;background:#fff;border-bottom:1px solid #e6e8f0;padding:12px 18px}.preview-nav nav{display:flex;gap:14px;flex-wrap:wrap}.preview-nav a{color:${theme.primary};text-decoration:none}.preview-page{max-width:1180px;margin:0 auto}.preview-page main{max-width:none}.preview-page[hidden]{display:none!important}.node-wrap{display:block}.built-button{display:inline-flex;padding:11px 20px;background:${theme.primary};color:#fff;border-radius:11px;text-decoration:none;font-weight:800}.built-card,.built-product,.built-testimonial{padding:18px;border:1px solid #e7e9ef;border-radius:14px;background:#fff}.built-gallery{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.built-gallery img{width:100%;height:200px;object-fit:cover;border-radius:12px}.built-stats,.built-pricing,.built-timeline{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.built-stats>div,.built-pricing>div,.built-timeline>div{padding:16px;border:1px solid #e7e9ef;border-radius:12px}.built-progress{height:32px;background:#eef0f5;border-radius:10px;overflow:hidden;position:relative}.built-progress>div{height:100%;background:${theme.primary}}.tab-panel.hidden{display:none!important}.motion-fade{animation:previewFade .7s ease}.motion-slide{animation:previewSlide .7s ease}.motion-zoom{animation:previewZoom .7s ease}.motion-pulse{animation:previewPulse 1.2s ease}.motion-shake{animation:previewShake .5s ease}.motion-bounce{animation:previewBounce .7s ease}@keyframes previewFade{from{opacity:.2}to{opacity:1}}@keyframes previewSlide{from{transform:translateY(14px);opacity:.2}to{transform:translateY(0);opacity:1}}@keyframes previewZoom{from{transform:scale(.96);opacity:.2}to{transform:scale(1);opacity:1}}@keyframes previewPulse{50%{transform:scale(1.03)}}@keyframes previewShake{25%{transform:translateX(5px)}50%{transform:translateX(-5px)}75%{transform:translateX(3px)}}@keyframes previewBounce{45%{transform:translateY(-9px)}}@media(max-width:760px){.built-gallery,.built-stats,.built-pricing,.built-timeline{grid-template-columns:1fr}}
/* V27 legacy stable editor contract retained; V28 UX overrides below */
.workspace-main{
  display:flex !important;
  flex:1 1 auto !important;
  width:100% !important;
  min-width:0 !important;
  min-height:0 !important;
  height:auto !important;
  position:relative !important;
  overflow:hidden !important;
  isolation:isolate;
  gap:0 !important;
}
.workspace-main > .left-drawer{
  position:relative !important;
  inset:auto !important;
  width:var(--sidebar) !important;
  min-width:0 !important;
  max-width:var(--sidebar) !important;
  flex:0 0 var(--sidebar) !important;
  height:100% !important;
  min-height:0 !important;
  grid-area:auto !important;
}
.workspace-main > .right-drawer{
  position:relative !important;
  inset:auto !important;
  width:var(--inspector) !important;
  min-width:0 !important;
  max-width:var(--inspector) !important;
  flex:0 0 var(--inspector) !important;
  height:100% !important;
  min-height:0 !important;
  grid-area:auto !important;
}
.workspace-main > .left-drawer.is-collapsed{
  width:0 !important;
  max-width:0 !important;
  flex-basis:0 !important;
  border-inline-width:0 !important;
  overflow:hidden !important;
}
.workspace-main > .right-drawer.is-collapsed{
  width:0 !important;
  max-width:0 !important;
  flex-basis:0 !important;
  border-inline-width:0 !important;
  overflow:hidden !important;
}
.workspace-main > .canvas-area{
  position:relative !important;
  flex:1 1 0% !important;
  width:auto !important;
  min-width:0 !important;
  max-width:none !important;
  min-height:0 !important;
  height:100% !important;
  overflow:hidden !important;
  grid-area:auto !important;
  grid-column:auto !important;
  grid-row:auto !important;
}
.workspace-main > .drawer-rail{
  position:absolute !important;
  top:50% !important;
  bottom:auto !important;
  z-index:300 !important;
  flex:none !important;
  width:34px !important;
  height:92px !important;
  margin:0 !important;
}
.workspace-main > .left-rail{inset-inline-start:0 !important;}
.workspace-main > .right-rail{inset-inline-end:0 !important;}
.workspace-main > .drawer-rail.hidden-rail{display:none !important;}
.workspace-main > .canvas-area .canvas-viewport{
  width:100% !important;
  min-width:0 !important;
  min-height:0 !important;
  height:100% !important;
  overflow:auto !important;
  scrollbar-gutter:stable both-edges;
  overscroll-behavior:contain;
}
@media (max-width:900px){
  .workspace-main,
  .workspace-main.left-collapsed,
  .workspace-main.right-collapsed,
  .workspace-main.left-collapsed.right-collapsed{
    display:flex !important;
    flex-direction:row !important;
    width:100% !important;
    min-width:0 !important;
    min-height:0 !important;
    height:100% !important;
  }
  .workspace-main > .canvas-area{
    flex:1 1 100% !important;
    width:100% !important;
    height:100% !important;
  }
  .workspace-main > .left-drawer,
  .workspace-main > .right-drawer{
    position:absolute !important;
    top:0 !important;
    bottom:0 !important;
    height:100% !important;
    max-width:none !important;
    z-index:170 !important;
    flex:none !important;
  }
  .workspace-main > .left-drawer{inset-inline-start:0 !important;transform:translateX(0);}
  .workspace-main > .right-drawer{inset-inline-end:0 !important;transform:translateX(0);}
  .workspace-main.left-collapsed > .left-drawer{transform:translateX(-105%);}
  .workspace-main.right-collapsed > .right-drawer{transform:translateX(105%);}
  .workspace-main > .drawer-rail{display:grid !important;}
}
</style></head><body><header class="preview-nav"><strong>${escapeText(project.meta.name)}</strong><nav>${nav}</nav></header>${sections}${script}</body></html>`;
  }
  export(){const modal=showModal(this.host,{title:'تصدير المشروع',body:'<div class="list-stack"><div class="quality-item good">سيتم إنشاء ملف مستقل لكل صفحة، مع index.html للصفحة الرئيسية وروابط فعلية بين الصفحات.</div><button id="zip" class="primary-btn" type="button">تنزيل ZIP</button><button id="html" class="secondary-btn" type="button">تنزيل HTML للصفحة الحالية</button><button id="json" class="secondary-btn" type="button">تنزيل JSON</button></div>'});modal.querySelector('#zip').onclick=()=>exportZip(this.store.project);modal.querySelector('#html').onclick=()=>exportCurrentHtml(this.store.project);modal.querySelector('#json').onclick=()=>exportProjectJson(this.store.project);return modal}
  quality(){const audit=auditProject(this.store.project),errors=audit.issues?.length||0,warnings=audit.warnings?.length||0,infos=audit.info?.length||0,score=Math.max(0,Math.min(100,Number(audit.score)||0)),items=[...(audit.issues||[]),...(audit.warnings||[]),...(audit.info||[])];const body=`<div class="simple-manager-note"><b>ما الذي يفحصه بَنّاء؟</b><br>الصفحات، الروابط، الإعدادات الأساسية، وتجهيز الموقع للتصدير. ستجد الأخطاء أولًا ثم التنبيهات.</div><div class="audit-summary"><div class="audit-meter" style="--score:${score}"><span>${score}</span></div><div><b>${score>=90?'الموقع ممتاز':score>=70?'الموقع جيد ويحتاج لمسات':'الموقع يحتاج مراجعة'}</b><p style="margin:4px 0 7px;color:#747c8e;font-size:9px">${errors?`هناك ${errors} أخطاء تحتاج مراجعة.`:'لا توجد أخطاء أساسية.'}</p><div class="audit-counts"><span>أخطاء ${errors}</span><span>تنبيهات ${warnings}</span><span>معلومات ${infos}</span></div></div></div><div class="quality-list">${items.map(item=>`<article class="quality-item ${item.severity==='error'?'bad':item.severity==='warning'?'warn':'good'}"><b>${escapeText(item.title||'ملاحظة')}</b><small>${escapeText(item.detail||'')}</small></article>`).join('')||'<div class="quality-item good">✓ الموقع جاهز من ناحية الفحوصات الأساسية.</div>'}</div>`;return showModal(this.host,{title:'فحص جودة الموقع',body,wide:true})}
  theme(){const t=this.store.project.theme||{},tokens=t.tokens||{},colors=tokens.colors||{};const modal=showModal(this.host,{title:'الألوان والتصميم',body:`<div class="simple-manager-note"><b>غيّر الشكل من مكان واحد</b><br>اختر لونًا جاهزًا أو اكتب HEX. لا تحتاج إلى معرفة كلمات تقنية.</div><div class="color-grid-simple">${[['primary','اللون الأساسي',colors.primary||t.primary],['secondary','اللون الثانوي',colors.secondary||t.secondary],['accent','لون التمييز',colors.accent||t.accent],['text','لون النص',colors.text||t.text],['surface','خلفية البطاقات',colors.surface||t.surface],['muted','النص الهادئ',colors.muted||t.muted],['line','لون الحدود',colors.line||'#e4e7ef']].map(([k,l,v])=>`<div class="color-card-simple"><label>${l}</label><div class="simple-color-row"><input type="color" data-dcolor="${k}" value="${normalizeColor(v)}"><input type="text" data-dcolor-text="${k}" value="${escapeText(v||'')}"></div></div>`).join('')}</div><div class="color-actions-simple"><button id="themeAuto" type="button">🎨 ألوان متناسقة</button><button id="themeReset" type="button">↺ إعادة الألوان</button></div><div class="simple-section"><h4>عرض الموقع</h4><div class="field"><label>أقصى عرض للصفحة</label><input id="themeContainer" type="number" min="320" value="${Number(tokens.container||1180)}"></div><p>هذا العرض يؤثر على الصفحات التي تصممها وتصدرها.</p></div>`});const setColor=(key,val)=>{const safe=normalizeColor(val);const text=modal.querySelector(`[data-dcolor-text="${key}"]`),picker=modal.querySelector(`[data-dcolor="${key}"]`);if(text)text.value=safe;if(picker)picker.value=safe;this.store.transact('تحديث اللون العام',p=>{p.theme.tokens=p.theme.tokens||{};p.theme.tokens.colors={...(p.theme.tokens.colors||{}),[key]:safe};if(['primary','secondary','text','surface','accent'].includes(key))p.theme[key]=safe})};modal.querySelectorAll('[data-dcolor]').forEach(el=>el.addEventListener('input',()=>setColor(el.dataset.dcolor,el.value)));modal.querySelectorAll('[data-dcolor-text]').forEach(el=>el.addEventListener('change',()=>setColor(el.dataset.dcolorText,el.value)));modal.querySelector('#themeContainer')?.addEventListener('change',e=>this.store.transact('تغيير عرض الموقع',p=>{p.theme.tokens=p.theme.tokens||{};p.theme.tokens.container=Math.max(320,Math.min(1800,Number(e.target.value)||1180))}));modal.querySelector('#themeAuto')?.addEventListener('click',()=>{const base=normalizeColor(colors.primary||t.primary||'#5b5ce2');const rgb=hexToRgb(base),shift=(n)=>'#'+[rgb.r,rgb.g,rgb.b].map(v=>Math.max(0,Math.min(255,v+n)).toString(16).padStart(2,'0')).join('');const palette={primary:base,secondary:shift(-24),accent:shift(34),text:'#171b2a',surface:'#ffffff',muted:'#6d7588',line:'#e4e7ef'};this.store.transact('اقتراح ألوان متناسقة',p=>{p.theme.tokens=p.theme.tokens||{};p.theme.tokens.colors={...(p.theme.tokens.colors||{}),...palette};Object.assign(p.theme,{primary:palette.primary,secondary:palette.secondary,accent:palette.accent,text:palette.text,surface:palette.surface})});modal.remove();this.theme()});modal.querySelector('#themeReset')?.addEventListener('click',()=>{const palette={primary:'#5b5ce2',secondary:'#4b4cc7',accent:'#28a77b',text:'#171b2a',surface:'#ffffff',muted:'#6d7588',line:'#e4e7ef'};this.store.transact('إعادة الألوان',p=>{p.theme.tokens=p.theme.tokens||{};p.theme.tokens.colors={...(p.theme.tokens.colors||{}),...palette};Object.assign(p.theme,{primary:palette.primary,secondary:palette.secondary,accent:palette.accent,text:palette.text,surface:palette.surface})});modal.remove();this.theme()});return modal}
  shortcuts(){showModal(this.host,{title:'الاختصارات',body:'<div class="simple-manager-note"><b>أهم الاختصارات فقط</b><br>استخدمها لتسريع العمل. كلها اختيارية ويمكنك استخدام الأزرار بدلًا منها.</div><div class="shortcut-group"><div class="shortcut-row-simple"><span>حفظ المشروع</span><kbd>Ctrl / ⌘ + S</kbd></div><div class="shortcut-row-simple"><span>تراجع</span><kbd>Ctrl / ⌘ + Z</kbd></div><div class="shortcut-row-simple"><span>إعادة</span><kbd>Ctrl / ⌘ + Y</kbd></div><div class="shortcut-row-simple"><span>تكبير / تصغير</span><kbd>Ctrl / ⌘ + عجلة</kbd></div><div class="shortcut-row-simple"><span>ملاءمة شاشة التعديل</span><kbd>F</kbd></div><div class="shortcut-row-simple"><span>تحريك الشاشة</span><kbd>Space + سحب</kbd></div></div>'})}
  renameProject(){const name=prompt('اسم المشروع',this.store.project.meta.name);if(name?.trim())this.store.transact('تسمية المشروع',project=>project.meta.name=name.trim())}
}
const normalizeColor=value=>{const v=String(value||'').trim();if(/^#[0-9a-fA-F]{6}$/.test(v))return v.toLowerCase();if(/^#[0-9a-fA-F]{3}$/.test(v))return '#'+v.slice(1).split('').map(c=>c+c).join('').toLowerCase();return '#5b5ce2'};const hexToRgb=value=>{const v=normalizeColor(value).slice(1);return {r:parseInt(v.slice(0,2),16),g:parseInt(v.slice(2,4),16),b:parseInt(v.slice(4,6),16)}};
const escapeText=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
exports.Dialogs = Dialogs;
