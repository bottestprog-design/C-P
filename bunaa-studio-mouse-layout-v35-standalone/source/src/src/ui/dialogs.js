const {showModal} = __require("src/ui/modal.js");
const {exportZip,exportCurrentHtml,exportProjectJson,stylesheet} = __require("src/engine/exporter.js");
const {nodeHtml} = __require("src/engine/renderer.js");
const {pageAnchor} = __require("src/engine/routing.js");
const {buildPreviewRuntimeScript} = __require("src/engine/preview-router.js");
const {auditProject} = __require("src/engine/quality-audit.js");
class Dialogs{
  constructor(store){this.store=store;this.host=document.getElementById('modalHost')}
  bind(){document.getElementById('previewBtn').onclick=()=>this.preview();document.getElementById('exportBtn').onclick=()=>this.export();document.getElementById('qualityBtn').onclick=()=>this.quality();document.getElementById('globalStyleBtn').onclick=()=>this.theme();document.getElementById('shortcutsBtn').onclick=()=>this.shortcuts();document.getElementById('advancedDevicesBtn').onclick=()=>this.store.setUI({advancedDevices:!this.store.ui.advancedDevices})}
  preview(){
    const body=`<div class="preview-toolbar" role="toolbar" aria-label="أدوات المعاينة">
      <div class="preview-device-switcher" role="group" aria-label="حجم شاشة المعاينة">
        <button type="button" class="active" data-preview-device="desktop" aria-pressed="true">كمبيوتر <small>1180px</small></button>
        <button type="button" data-preview-device="tablet" aria-pressed="false">لوحي <small>768px</small></button>
        <button type="button" data-preview-device="mobile" aria-pressed="false">هاتف <small>390px</small></button>
      </div>
      <div class="preview-actions"><span id="previewViewportLabel" aria-live="polite">معاينة الكمبيوتر · 1180px</span>
        <button type="button" class="secondary-btn" data-preview-refresh title="إعادة تحميل الموقع في المعاينة">↻ تحديث</button>
        <button type="button" class="secondary-btn" data-preview-popout title="فتح المعاينة في نافذة منفصلة">↗ نافذة مستقلة</button>
      </div>
    </div><div class="preview-frame-shell" id="previewFrameShell"><iframe id="previewFrame" class="preview-iframe" title="معاينة تفاعلية للموقع"></iframe></div>`;
    const modal=showModal(this.host,{title:'معاينة الموقع الفعلية',body,wide:true});
    const frame=modal.querySelector('#previewFrame');
    const shell=modal.querySelector('#previewFrameShell');
    const label=modal.querySelector('#previewViewportLabel');
    const devices={desktop:{width:1180,label:'الكمبيوتر'},tablet:{width:768,label:'الجهاز اللوحي'},mobile:{width:390,label:'الهاتف'}};
    let currentDevice='desktop';
    const applyDevice=(device)=>{
      const key=Object.prototype.hasOwnProperty.call(devices,device)?device:'desktop';
      const preset=devices[key];currentDevice=key;
      frame.style.setProperty('width',`${preset.width}px`,'important');
      frame.style.setProperty('flex-basis',`${preset.width}px`,'important');
      frame.style.setProperty('min-width','0','important');
      frame.style.setProperty('max-width','none','important');
      frame.dataset.previewDevice=key;
      label.textContent=`معاينة ${preset.label} · ${preset.width}px`;
      modal.querySelectorAll('[data-preview-device]').forEach(button=>{
        const active=button.dataset.previewDevice===key;
        button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));
      });
      // Regenerate from the same document model using this device's saved styles
      // and positions. The iframe width is the viewport used by its media queries.
      frame.srcdoc=this.previewHtml(key);
    };
    frame.addEventListener('load',()=>{
      requestAnimationFrame(()=>{shell.scrollLeft=Math.max(0,(shell.scrollWidth-shell.clientWidth)/2)});
    });
    modal.querySelectorAll('[data-preview-device]').forEach(button=>button.addEventListener('click',()=>applyDevice(button.dataset.previewDevice)));
    modal.querySelector('[data-preview-refresh]')?.addEventListener('click',()=>{frame.srcdoc=this.previewHtml(currentDevice);label.textContent=`معاينة ${devices[currentDevice].label} · ${devices[currentDevice].width}px · تم التحديث`});
    modal.querySelector('[data-preview-popout]')?.addEventListener('click',()=>{
      try{
        const url=URL.createObjectURL(new Blob([this.previewHtml(currentDevice)],{type:'text/html;charset=utf-8'}));
        const opened=window.open(url,'_blank','noopener,noreferrer');
        if(!opened){label.textContent='السماح بالنوافذ المنبثقة مطلوب لفتح نافذة مستقلة';URL.revokeObjectURL(url);return;}
        setTimeout(()=>URL.revokeObjectURL(url),120000);
      }catch(error){label.textContent='تعذر فتح نافذة مستقلة؛ استخدم المعاينة داخل المحرر';}
    });
    applyDevice(currentDevice);
    return modal;
  }
  previewHtml(device='desktop'){
    const project=this.store.project;
    const pages=project.pages||[];
    const targetDevice=['desktop','tablet','mobile'].includes(device)?device:'desktop';
    const navMenu=project.navigation?.menus?.find(item=>item.id===project.navigation?.headerMenuId);
    const navItems=Array.isArray(navMenu?.items)&&navMenu.items.length?navMenu.items:pages.map(page=>({label:page.name,type:'page',targetId:page.id}));
    const hasAuthoredNavbar=nodes=>(nodes||[]).some(node=>node.type==='navbar'||hasAuthoredNavbar(node.children));
    // A navbar authored on the canvas is the source of truth; do not add a second
    // synthetic header over it. For multipage sites without one, keep a compact
    // navigation header so internal pages remain testable in preview.
    const needsFallbackNav=pages.length>1&&!pages.some(page=>hasAuthoredNavbar(page.nodes));
    const nav=needsFallbackNav?navItems.map(item=>{
      const target=pages.find(page=>page.id===item.targetId)||pages.find(page=>page.name===item.label);
      const internal=item.type!=='url'&&!!target;
      const href=internal?pageAnchor(target.id):String(item.url||'#');
      return `<a href="${escapeText(href)}"${internal?` data-page-target="${escapeText(target.id)}"`:''}${item.newTab?' target="_blank" rel="noopener noreferrer"':''}>${escapeText(item.label||target?.name||'رابط')}</a>`;
    }).join(''):'';
    const sections=pages.map((page,index)=>{
      const body=(page.nodes||[]).map(node=>nodeHtml(node,project.theme,project,targetDevice,null,null)).join('');
      return `<section class="preview-page" data-preview-section="${escapeText(page.id)}" id="page-${encodeURIComponent(page.id)}" ${index?'hidden':''}><main>${body}</main></section>`;
    }).join('');
    const theme=project.theme||{};
    const brand=project.site?.brand?.name||project.meta?.name||'بَنّاء';
    const siteNav=needsFallbackNav?`<header class="export-site-nav preview-site-nav"><strong>${escapeText(brand)}</strong><nav>${nav}</nav></header>`:'';
    const script=buildPreviewRuntimeScript(pages.map(page=>page.id),project.interactions||[],project.assets||[],targetDevice);
    const css=stylesheet(theme,project);
    const previewCss=`html,body{min-height:100%;}html{scroll-behavior:smooth}body{margin:0;overflow-x:hidden}.preview-page{width:100%;max-width:1180px;margin:0 auto;min-height:360px}.preview-page main{width:100%;max-width:none;margin:0 auto}.preview-page[hidden]{display:none!important}.node-resize-handle{display:none!important}img,video,iframe,audio,canvas,svg{max-width:100%}.preview-site-nav{position:sticky;top:0;z-index:50;background:var(--b-surface,#fff)}.preview-site-nav nav{display:flex;gap:14px;flex-wrap:wrap}.preview-site-nav a{color:var(--b-primary,#5b5ce2);text-decoration:none}@media(max-width:640px){.preview-page{max-width:100%}.preview-site-nav{padding:10px 12px;gap:8px}.preview-site-nav nav{gap:8px}}`;
    return `<!doctype html><html lang="${escapeText(project.site?.language||'ar')}" dir="${escapeText(project.site?.direction||'rtl')}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escapeText(project.site?.title||project.meta?.name||'معاينة الموقع')}</title><style>${css}\n${previewCss}</style></head><body>${siteNav}${sections}${script}</body></html>`;
  }
  export(){
    const pages=this.store.project.pages||[];
    const pageOptions=pages.map(page=>`<option value="${escapeText(page.id)}" ${page.id===this.store.project.activePageId?'selected':''}>${escapeText(page.name||page.slug||'صفحة')}</option>`).join('');
    const body=`<div class="list-stack">
      <div class="quality-item good">HTML مستقل: يضم كل صفحات المشروع وروابطها والتنقلات والحركات وCSS وJavaScript والوسائط التي يمكن تضمينها داخل ملف واحد، ويبدأ بالصفحة التي تختارها أدناه. ZIP كامل: ينشئ ملف HTML منفصلًا لكل صفحة ويربطها بباقي الصفحات، ويضم CSS وJavaScript ووسائط المشروع والملفات الوصفية. الروابط الخارجية العادية تظل روابط خارجية؛ والوسائط التي يمنع مصدرها تنزيلها تُذكر في تقرير واضح ولا تُعتبر منسوخة.</div>
      <button id="zip" class="primary-btn" type="button">تنزيل ZIP كامل لكل الصفحات</button>
      <div id="exportStatus" class="quality-item hidden" role="status" aria-live="polite"></div>
      <div class="field"><label for="htmlPage">الصفحة التي تفتح أولًا داخل ملف HTML المستقل</label><select id="htmlPage">${pageOptions}</select></div>
      <button id="html" class="secondary-btn" type="button">تنزيل HTML مستقل (كل الصفحات في ملف واحد)</button>
      <button id="json" class="secondary-btn" type="button">تنزيل بيانات المشروع JSON</button>
    </div>`;
    const modal=showModal(this.host,{title:'تصدير الموقع',body});
    const zipButton=modal.querySelector('#zip'),htmlButton=modal.querySelector('#html'),status=modal.querySelector('#exportStatus');
    const showStatus=message=>{status.classList.remove('hidden');status.textContent=message};
    zipButton.onclick=async()=>{
      zipButton.disabled=true;zipButton.textContent='يجمع الصفحات والأصول…';showStatus('يجري جمع صفحات المشروع والوسائط الممكن تضمينها والتحقق من مسارات الروابط.');
      try{
        const files=await exportZip(this.store.project);const failed=files.externalResources||[];
        showStatus(`اكتمل ZIP: ${files.pageCount||this.store.project.pages.length} صفحة و${files.length} ملفًا.${failed.length?` تعذر تضمين ${failed.length} وسيطًا خارجيًا؛ راجع EXTERNAL_RESOURCES.md داخل ZIP.`:' لم تتبقَّ وسائط مرصودة فشل تضمينها.'}`);
        zipButton.textContent='تم تجهيز ZIP الكامل';
      }catch(error){showStatus(`تعذر التصدير: ${String(error?.message||error)}`);zipButton.disabled=false;zipButton.textContent='إعادة محاولة ZIP';}
    };
    htmlButton.onclick=async()=>{
      htmlButton.disabled=true;const old=htmlButton.textContent;htmlButton.textContent='يجمع الصفحات داخل ملف واحد…';showStatus('يجري إنشاء HTML مستقل مع CSS وJavaScript والتنقل بين جميع صفحات المشروع.');
      try{
        const result=await exportCurrentHtml(this.store.project,modal.querySelector('#htmlPage').value);
        showStatus(`اكتمل HTML المستقل: ${result.pages} صفحة مضمنة في ملف واحد، والصفحة الأولى «${result.page}».${result.external?.length?` تعذر تضمين ${result.external.length} وسيطًا خارجيًا؛ تحتاج هذه العناصر اتصالًا بالمصدر أو استكمال الوسائط من أداة ZIP.`:' تم تضمين الوسائط التي أمكن الوصول إليها.'}`);
        htmlButton.textContent='تم تجهيز HTML المستقل';
      }catch(error){showStatus(`تعذر تصدير HTML: ${String(error?.message||error)}`);htmlButton.disabled=false;htmlButton.textContent='إعادة محاولة HTML';}
      if(!htmlButton.disabled&&htmlButton.textContent===old)htmlButton.textContent='تم تجهيز HTML المستقل';
    };
    modal.querySelector('#json').onclick=()=>exportProjectJson(this.store.project);
    return modal;
  }
  quality(){const audit=auditProject(this.store.project);const items=[...audit.issues,...audit.warnings,...audit.info];const body=`<div class="audit-head"><div class="audit-score"><strong>${audit.score}</strong><span>/ 100</span></div><div><b>تدقيق موحّد</b><p>${items.length?`${items.length} ملاحظات بين أخطاء وتحسينات.`:'لا توجد ملاحظات أساسية.'}</p></div></div><div class="quality-list">${items.map(item=>`<article class="quality-item ${item.severity==='error'?'bad':item.severity==='warning'?'warn':'good'}"><b>${escapeText(item.title)}</b><small>${escapeText(item.detail)}</small></article>`).join('')||'<div class="quality-item good">✓ كل الاختبارات الأساسية سليمة.</div>'}</div>`;return showModal(this.host,{title:'فحص جودة الموقع',body,wide:true})}
  theme(){const t=this.store.project.theme,tokens=t.tokens||{};const colors=tokens.colors||{};const modal=showModal(this.host,{title:'النظام البصري',body:`<div class="theme-grid"><div class="field"><label>اللون الأساسي</label><input id="primary" value="${escapeText(colors.primary||t.primary)}"></div><div class="field"><label>اللون الثانوي</label><input id="secondary" value="${escapeText(colors.secondary||t.secondary)}"></div><div class="field"><label>لون النص</label><input id="text" value="${escapeText(colors.text||t.text)}"></div><div class="field"><label>الخلفية</label><input id="surface" value="${escapeText(colors.surface||t.surface)}"></div><div class="field"><label>لون الخطوط</label><input id="line" value="${escapeText(colors.line||'#e6e8ef')}"></div><div class="field"><label>عرض الحاوية</label><input id="container" type="number" value="${escapeText(tokens.container||1180)}"></div></div><div class="tips-card"><b>Design Tokens</b><p>غيّر القيم الأساسية مرة واحدة، ثم استخدم الأقسام والمكونات لتظل الهوية البصرية متسقة.</p></div>`});modal.querySelectorAll('input').forEach(input=>input.onchange=e=>{const key=input.id,value=input.type==='number'?Number(input.value):input.value;this.store.transact('تعديل النظام البصري',project=>{project.theme.tokens=project.theme.tokens||{};project.theme.tokens.colors=project.theme.tokens.colors||{};if(key==='container')project.theme.tokens.container=Math.max(320,value||1180);else{project.theme.tokens.colors[key]=value;if(['primary','secondary','text','surface'].includes(key))project.theme[key]=value}})})}
  shortcuts(){showModal(this.host,{title:'الاختصارات',body:'<div class="shortcut-grid"><div><span>تراجع</span><kbd>Ctrl/⌘ Z</kbd></div><div><span>إعادة</span><kbd>Ctrl/⌘ Y</kbd></div><div><span>حفظ</span><kbd>Ctrl/⌘ S</kbd></div><div><span>تكبير</span><kbd>Ctrl/⌘ + عجلة</kbd></div><div><span>تحريك</span><kbd>Space + سحب</kbd></div><div><span>ملاءمة</span><kbd>F</kbd></div></div>'})}
  renameProject(){const name=prompt('اسم المشروع',this.store.project.meta.name);if(name?.trim())this.store.transact('تسمية المشروع',project=>project.meta.name=name.trim())}
}
const escapeText=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
exports.Dialogs = Dialogs;
});
