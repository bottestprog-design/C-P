const {showModal} = __require("src/ui/modal.js");
const {exportZip,exportCurrentHtml,exportProjectJson} = __require("src/engine/exporter.js");
const {nodeHtml} = __require("src/engine/renderer.js");
const {pageAnchor} = __require("src/engine/routing.js");
const {buildPreviewRuntimeScript} = __require("src/engine/preview-router.js");
const {auditProject} = __require("src/engine/quality-audit.js");
class Dialogs{
  constructor(store){this.store=store;this.host=document.getElementById('modalHost')}
  bind(){document.getElementById('previewBtn').onclick=()=>this.preview();document.getElementById('canvasPreviewBtn')?.addEventListener('click',()=>this.preview());document.getElementById('exportBtn').onclick=()=>this.export();document.getElementById('qualityBtn').onclick=()=>this.quality();document.getElementById('globalStyleBtn').onclick=()=>this.theme();document.getElementById('shortcutsBtn').onclick=()=>this.shortcuts();document.getElementById('advancedDevicesBtn').onclick=()=>this.store.setUI({advancedDevices:!this.store.ui.advancedDevices})}
  preview(){const html=this.previewHtml();let previewWindow=null;try{previewWindow=window.open('about:blank','_blank')}catch(error){previewWindow=null}if(previewWindow&&!previewWindow.closed){try{const url=URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'}));previewWindow.location.href=url;previewWindow.addEventListener('load',()=>previewWindow.addEventListener('pagehide',()=>URL.revokeObjectURL(url),{once:true}),{once:true});previewWindow.focus();return previewWindow}catch(error){try{previewWindow.close()}catch{}}}const modal=showModal(this.host,{title:'معاينة الموقع',body:'<p class="preview-fallback-note">المتصفح منع فتح تبويب جديد؛ يمكنك مشاهدة النسخة الفعلية هنا، أو السماح بالنوافذ المنبثقة لفتح المعاينة في تبويب مستقل.</p><iframe id="previewFrame" class="preview-iframe" title="المعاينة المستقلة"></iframe>',wide:true});const frame=modal.querySelector('#previewFrame');frame.srcdoc=html;return modal}
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
    return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeText(project.meta.name)} — معاينة بَنّاء</title><style>html{scroll-behavior:smooth}body{margin:0;font-family:system-ui;color:${theme.text};background:#fff;line-height:1.6}.preview-nav{position:sticky;top:0;z-index:10;background:#fff;border-bottom:1px solid #e6e8f0;padding:12px 18px}.preview-nav nav{display:flex;gap:14px;flex-wrap:wrap}.preview-nav a{color:${theme.primary};text-decoration:none}.preview-page{max-width:1180px;margin:0 auto}.preview-page main{display:flex;flex-wrap:wrap;align-items:flex-start;align-content:flex-start;gap:12px;width:100%;max-width:none;padding:12px;box-sizing:border-box}.preview-page[hidden]{display:none!important}.node-wrap{display:inline-block;position:relative;vertical-align:top;width:fit-content;max-width:100%;min-width:0;flex:0 0 auto}.node-content{display:flow-root;width:fit-content;max-width:100%;min-width:0;box-sizing:border-box}.node-content img{display:block;width:100%;max-width:100%;height:auto}.node-wrap[data-custom-width="0"][data-bunaa-type="section"],.node-wrap[data-custom-width="0"][data-bunaa-type="container"],.node-wrap[data-custom-width="0"][data-bunaa-type="hero"],.node-wrap[data-custom-width="0"][data-bunaa-type="navbar"],.node-wrap[data-custom-width="0"][data-bunaa-type="footer"],.node-wrap[data-custom-width="0"][data-bunaa-type="form"],.node-wrap[data-custom-width="0"][data-bunaa-type="grid"],.node-wrap[data-custom-width="0"][data-bunaa-type="columns"],.node-wrap[data-custom-width="0"][data-bunaa-type="stack"],.node-wrap[data-custom-width="0"][data-bunaa-type="spaced"]{display:block;flex:0 0 100%;width:100%;max-width:100%}.node-wrap[data-custom-width="0"][data-bunaa-type="hero"]>.node-content,.node-wrap[data-custom-width="0"][data-bunaa-type="navbar"]>.node-content,.node-wrap[data-custom-width="0"][data-bunaa-type="footer"]>.node-content,.node-wrap[data-custom-width="0"][data-bunaa-type="form"]>.node-content,.node-wrap[data-custom-width="0"][data-bunaa-type="grid"]>.node-content,.node-wrap[data-custom-width="0"][data-bunaa-type="columns"]>.node-content,.node-wrap[data-custom-width="0"][data-bunaa-type="stack"]>.node-content,.node-wrap[data-custom-width="0"][data-bunaa-type="spaced"]>.node-content{width:100%}.node-wrap[data-custom-width="1"]>.node-content{width:100%}.node-wrap[data-custom-height="1"]>.node-content{height:100%}.node-wrap[data-custom-width="1"][data-bunaa-type="button"] .built-button{display:flex;width:100%;height:100%;align-items:center;justify-content:center}.node-wrap[data-custom-width="1"][data-bunaa-type="link"] .node-content>a{display:inline-block;width:100%}.built-button{display:inline-flex;padding:11px 20px;background:${theme.primary};color:#fff;border-radius:11px;text-decoration:none;font-weight:800}.built-card,.built-product,.built-testimonial{padding:18px;border:1px solid #e7e9ef;border-radius:14px;background:#fff}.built-gallery{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.built-gallery img{width:100%;height:200px;object-fit:cover;border-radius:12px}.built-stats,.built-pricing,.built-timeline{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.built-stats>div,.built-pricing>div,.built-timeline>div{padding:16px;border:1px solid #e7e9ef;border-radius:12px}.built-progress{height:32px;background:#eef0f5;border-radius:10px;overflow:hidden;position:relative}.built-progress>div{height:100%;background:${theme.primary}}.tab-panel.hidden{display:none!important}.motion-fade{animation:previewFade .7s ease}.motion-slide{animation:previewSlide .7s ease}.motion-zoom{animation:previewZoom .7s ease}.motion-pulse{animation:previewPulse 1.2s ease}.motion-shake{animation:previewShake .5s ease}.motion-bounce{animation:previewBounce .7s ease}@keyframes previewFade{from{opacity:.2}to{opacity:1}}@keyframes previewSlide{from{transform:translateY(14px);opacity:.2}to{transform:translateY(0);opacity:1}}@keyframes previewZoom{from{transform:scale(.96);opacity:.2}to{transform:scale(1);opacity:1}}@keyframes previewPulse{50%{transform:scale(1.03)}}@keyframes previewShake{25%{transform:translateX(5px)}50%{transform:translateX(-5px)}75%{transform:translateX(3px)}}@keyframes previewBounce{45%{transform:translateY(-9px)}}@media(max-width:760px){.built-gallery,.built-stats,.built-pricing,.built-timeline{grid-template-columns:1fr}}
/* V27 — Stable Editor Workspace Contract */
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
  quality(){const audit=auditProject(this.store.project);const items=[...audit.issues,...audit.warnings,...audit.info];const body=`<div class="audit-head"><div class="audit-score"><strong>${audit.score}</strong><span>/ 100</span></div><div><b>تدقيق موحّد</b><p>${items.length?`${items.length} ملاحظات بين أخطاء وتحسينات.`:'لا توجد ملاحظات أساسية.'}</p></div></div><div class="quality-list">${items.map(item=>`<article class="quality-item ${item.severity==='error'?'bad':item.severity==='warning'?'warn':'good'}"><b>${escapeText(item.title)}</b><small>${escapeText(item.detail)}</small></article>`).join('')||'<div class="quality-item good">✓ كل الاختبارات الأساسية سليمة.</div>'}</div>`;return showModal(this.host,{title:'فحص جودة الموقع',body,wide:true})}
  theme(){const t=this.store.project.theme,tokens=t.tokens||{};const colors=tokens.colors||{};const modal=showModal(this.host,{title:'النظام البصري',body:`<div class="theme-grid"><div class="field"><label>اللون الأساسي</label><input id="primary" value="${escapeText(colors.primary||t.primary)}"></div><div class="field"><label>اللون الثانوي</label><input id="secondary" value="${escapeText(colors.secondary||t.secondary)}"></div><div class="field"><label>لون النص</label><input id="text" value="${escapeText(colors.text||t.text)}"></div><div class="field"><label>الخلفية</label><input id="surface" value="${escapeText(colors.surface||t.surface)}"></div><div class="field"><label>لون الخطوط</label><input id="line" value="${escapeText(colors.line||'#e6e8ef')}"></div><div class="field"><label>عرض الحاوية</label><input id="container" type="number" value="${escapeText(tokens.container||1180)}"></div></div><div class="tips-card"><b>Design Tokens</b><p>غيّر القيم الأساسية مرة واحدة، ثم استخدم الأقسام والمكونات لتظل الهوية البصرية متسقة.</p></div>`});modal.querySelectorAll('input').forEach(input=>input.onchange=e=>{const key=input.id,value=input.type==='number'?Number(input.value):input.value;this.store.transact('تعديل النظام البصري',project=>{project.theme.tokens=project.theme.tokens||{};project.theme.tokens.colors=project.theme.tokens.colors||{};if(key==='container')project.theme.tokens.container=Math.max(320,value||1180);else{project.theme.tokens.colors[key]=value;if(['primary','secondary','text','surface'].includes(key))project.theme[key]=value}})})}
  shortcuts(){showModal(this.host,{title:'الاختصارات',body:'<div class="shortcut-grid"><div><span>تراجع</span><kbd>Ctrl/⌘ Z</kbd></div><div><span>إعادة</span><kbd>Ctrl/⌘ Y</kbd></div><div><span>حفظ</span><kbd>Ctrl/⌘ S</kbd></div><div><span>تكبير</span><kbd>Ctrl/⌘ + عجلة</kbd></div><div><span>تحريك</span><kbd>Space + سحب</kbd></div><div><span>ملاءمة</span><kbd>F</kbd></div></div>'})}
  renameProject(){const name=prompt('اسم المشروع',this.store.project.meta.name);if(name?.trim())this.store.transact('تسمية المشروع',project=>project.meta.name=name.trim())}
}
const escapeText=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
exports.Dialogs = Dialogs;
});
