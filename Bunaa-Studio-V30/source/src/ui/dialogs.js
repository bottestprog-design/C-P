const {showModal} = __require("src/ui/modal.js");
const {exportZip,exportCurrentHtml,exportProjectJson} = __require("src/engine/exporter.js");
const {nodeHtml} = __require("src/engine/renderer.js");
const {pageAnchor} = __require("src/engine/routing.js");
const {buildPreviewRuntimeScript} = __require("src/engine/preview-router.js");
const {auditProject} = __require("src/engine/quality-audit.js");
class Dialogs{
  constructor(store){this.store=store;this.host=document.getElementById('modalHost')}
  bind(){const on=(id,fn)=>document.getElementById(id)?.addEventListener('click',fn);on('previewBtn',()=>this.preview());on('exportBtn',()=>this.export());on('qualityBtn',()=>this.quality());on('globalStyleBtn',()=>this.theme());on('shortcutsBtn',()=>this.shortcuts());on('advancedDevicesBtn',()=>this.store.setUI({advancedDevices:!this.store.ui.advancedDevices}))}
  preview(){
    let previewWindow=null,url='',html='';
    const project=this.store.project||{};
    const safeName=String(project.meta?.name||'bunaa-preview').replace(/[<>:"/\\|?*\x00-\x1f]/g,'-').slice(0,80)||'bunaa-preview';
    try{
      // Open synchronously during the click gesture so popup blockers can recognize it.
      try{previewWindow=window.open('about:blank','_blank')}catch(openError){}
      html=this.previewHtml();
      if(previewWindow&&!previewWindow.closed){
        try{
          // Write a complete standalone document instead of navigating to a Blob URL.
          // This is more reliable when the editor was opened directly from disk (file://).
          previewWindow.document.open();
          previewWindow.document.write(html);
          previewWindow.document.close();
          try{previewWindow.opener=null}catch(openerError){}
          try{previewWindow.focus()}catch(focusError){}
          return previewWindow;
        }catch(writeError){
          try{previewWindow.close()}catch(closeError){}
          previewWindow=null;
        }
      }
      // Keep a real HTML document available through a direct user-clickable fallback.
      const blob=new Blob([html],{type:'text/html;charset=utf-8'});
      url=URL.createObjectURL(blob);
      const safeUrl=escapeText(url);
      const modal=showModal(this.host,{
        title:'فتح الموقع في صفحة مستقلة',
        body:'<div class="tips-card"><b>تم تجهيز معاينة حقيقية للموقع</b><p>هذه صفحة HTML مستقلة تشمل تصميم الموقع وصفحاته وتفاعلاته. إذا منع المتصفح التبويب المنبثق، اضغط على رابط الفتح المباشر أدناه.</p></div><div class="preview-open-actions"><button id="openPreviewTabNow" class="primary-btn" type="button">↗ فتح الموقع في تبويب جديد</button><a id="openPreviewLink" class="secondary-btn" href="'+safeUrl+'" target="_blank" rel="noopener noreferrer">فتح المعاينة كرابط</a><a class="secondary-btn" href="'+safeUrl+'" download="'+escapeText(safeName)+'.html">تنزيل HTML</a></div>',
        wide:true
      });
      const openNow=()=>{
        let tab=null;
        try{tab=window.open('about:blank','_blank')}catch(openError){}
        if(tab&&!tab.closed){
          try{tab.document.open();tab.document.write(html);tab.document.close();try{tab.opener=null}catch(openerError){}tab.focus();modal.remove();return}catch(writeError){try{tab.close()}catch(closeError){}}
        }
        globalThis.__BUNAA_APP?.toast?.('المعاينة جاهزة. اضغط رابط «فتح المعاينة كرابط» إذا منع المتصفح التبويب المنبثق.');
      };
      modal.querySelector('#openPreviewTabNow')?.addEventListener('click',openNow);
      window.addEventListener('pagehide',()=>{if(url){try{URL.revokeObjectURL(url)}catch(error){}}},{once:true});
      return modal;
    }catch(error){
      try{if(previewWindow&&!previewWindow.closed)previewWindow.close()}catch(closeError){}
      if(url){try{URL.revokeObjectURL(url)}catch(closeError){}}
      globalThis.__BUNAA_APP?.toast?.('تعذّر إنشاء المعاينة. راجع وحدة التحكم لمعرفة التفاصيل.');
      console.error('Preview failed',error);
      return null;
    }
  }
  previewHtml(){
    const project=this.store.project;
    const pages=Array.isArray(project.pages)?project.pages:[];
    const theme=project.theme||{};
    const menu=project.navigation?.menus?.find(item=>item.id===project.navigation?.headerMenuId);
    const items=menu?.items?.length?menu.items:pages.filter(page=>page.settings?.showInNav!==false&&!page.settings?.hidden).map(page=>({label:page.name,type:'page',targetId:page.id}));
    const nav=items.map(item=>{
      const target=pages.find(page=>page.id===item.targetId);
      const external=item.type==='url';
      const href=external?(item.url||'#'):(target?pageAnchor(target.id):'#');
      const targetAttr=item.newTab?' target="_blank" rel="noopener noreferrer"':'';
      const routeAttr=!external&&target?' data-page-target="'+escapeText(target.id)+'"':'';
      return '<a href="'+escapeText(href||'#')+'"'+routeAttr+targetAttr+'>'+escapeText(item.label||target?.name||'رابط')+'</a>';
    }).join('');
    const startPage=pages.find(page=>page.id===project.activePageId)||pages[0]||null;
    const pageIds=startPage?[startPage.id,...pages.filter(page=>page.id!==startPage.id).map(page=>page.id)]:[];
    const sections=pages.map(page=>{
      const body=(page.nodes||[]).map(node=>nodeHtml(node,theme,project,'desktop',null,null,page.id)).join('');
      const hidden=page.id!==startPage?.id;
      return '<section class="preview-page" data-preview-section="'+escapeText(page.id)+'" id="page-'+encodeURIComponent(page.id)+'"'+(hidden?' hidden':'')+'><main data-page-id="'+escapeText(page.id)+'">'+body+'</main></section>';
    }).join('');
    const runtime=buildPreviewRuntimeScript(pageIds,project.interactions||[]);
    const previewCss='html{min-height:100%;scroll-behavior:smooth}body{min-height:100vh;width:100%;margin:0;padding:0;background:'+(theme.surface||'#fff')+';color:'+(theme.text||'#171b2a')+';font-family:'+(theme.font||'system-ui')+',-apple-system,"Segoe UI",Tahoma,Arial,sans-serif;line-height:1.6}.preview-page{display:block;width:100%;min-height:100vh;margin:0;padding:0}.preview-page[hidden]{display:none!important}.preview-page main{width:100%;max-width:none;margin:0 auto}.export-site-nav{position:sticky;top:0;z-index:100;width:100%;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px 22px;background:rgba(255,255,255,.96);border-bottom:1px solid #e6e8ef;backdrop-filter:blur(12px)}.export-site-nav nav{display:flex;flex-wrap:wrap;align-items:center;gap:14px}.export-site-nav a{text-decoration:none;color:'+(theme.primary||'#5b5ce2')+'}.export-site-nav a:hover{text-decoration:underline}img,video,iframe{max-width:100%}button,input,select,textarea{font:inherit}@media(max-width:640px){.export-site-nav{align-items:flex-start;flex-direction:column;padding:12px 14px}.export-site-nav nav{gap:9px}.preview-page main{overflow-wrap:anywhere}}';
    const css=stylesheet(theme,project)+'\n'+responsiveCss(project)+'\n'+previewCss;
    const title=escapeText(project.site?.title||project.meta?.name||'معاينة الموقع');
    const favicon=project.site?.favicon?'<link rel="icon" href="'+escapeText(project.site.favicon)+'">':'';
    return '<!doctype html><html lang="'+escapeText(project.site?.language||'ar')+'" dir="'+escapeText(project.site?.direction||'rtl')+'"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="'+escapeText(theme.primary||'#5b5ce2')+'"><meta name="description" content="'+escapeText(project.site?.description||'')+'">'+favicon+'<title>'+title+'</title><style>'+css+'</style></head><body><header class="export-site-nav"><strong>'+escapeText(project.site?.brand?.name||project.meta?.name||'الموقع')+'</strong><nav aria-label="التنقل الرئيسي">'+nav+'</nav></header>'+sections+runtime+'</body></html>';

  }
  quality(){const audit=auditProject(this.store.project),errors=audit.issues?.length||0,warnings=audit.warnings?.length||0,infos=audit.info?.length||0,score=Math.max(0,Math.min(100,Number(audit.score)||0)),items=[...(audit.issues||[]),...(audit.warnings||[]),...(audit.info||[])];const body=`<div class="simple-manager-note"><b>ما الذي يفحصه بَنّاء؟</b><br>الصفحات، الروابط، الإعدادات الأساسية، وتجهيز الموقع للتصدير. ستجد الأخطاء أولًا ثم التنبيهات.</div><div class="audit-summary"><div class="audit-meter" style="--score:${score}"><span>${score}</span></div><div><b>${score>=90?'الموقع ممتاز':score>=70?'الموقع جيد ويحتاج لمسات':'الموقع يحتاج مراجعة'}</b><p style="margin:4px 0 7px;color:#747c8e;font-size:9px">${errors?`هناك ${errors} أخطاء تحتاج مراجعة.`:'لا توجد أخطاء أساسية.'}</p><div class="audit-counts"><span>أخطاء ${errors}</span><span>تنبيهات ${warnings}</span><span>معلومات ${infos}</span></div></div></div><div class="quality-list">${items.map(item=>`<article class="quality-item ${item.severity==='error'?'bad':item.severity==='warning'?'warn':'good'}"><b>${escapeText(item.title||'ملاحظة')}</b><small>${escapeText(item.detail||'')}</small></article>`).join('')||'<div class="quality-item good">✓ الموقع جاهز من ناحية الفحوصات الأساسية.</div>'}</div>`;return showModal(this.host,{title:'فحص جودة الموقع',body,wide:true})}
  theme(){const t=this.store.project.theme||{},tokens=t.tokens||{},colors=tokens.colors||{};const modal=showModal(this.host,{title:'الألوان والتصميم',body:`<div class="simple-manager-note"><b>غيّر الشكل من مكان واحد</b><br>اختر لونًا جاهزًا أو اكتب HEX. لا تحتاج إلى معرفة كلمات تقنية.</div><div class="color-grid-simple">${[['primary','اللون الأساسي',colors.primary||t.primary],['secondary','اللون الثانوي',colors.secondary||t.secondary],['accent','لون التمييز',colors.accent||t.accent],['text','لون النص',colors.text||t.text],['surface','خلفية البطاقات',colors.surface||t.surface],['muted','النص الهادئ',colors.muted||t.muted],['line','لون الحدود',colors.line||'#e4e7ef']].map(([k,l,v])=>`<div class="color-card-simple"><label>${l}</label><div class="simple-color-row"><input type="color" data-dcolor="${k}" value="${normalizeColor(v)}"><input type="text" data-dcolor-text="${k}" value="${escapeText(v||'')}"></div></div>`).join('')}</div><div class="color-actions-simple"><button id="themeAuto" type="button">🎨 ألوان متناسقة</button><button id="themeReset" type="button">↺ إعادة الألوان</button></div><div class="simple-section"><h4>عرض الموقع</h4><div class="field"><label>أقصى عرض للصفحة</label><input id="themeContainer" type="number" min="320" value="${Number(tokens.container||1180)}"></div><p>هذا العرض يؤثر على الصفحات التي تصممها وتصدرها.</p></div>`});const setColor=(key,val)=>{const safe=normalizeColor(val);const text=modal.querySelector(`[data-dcolor-text="${key}"]`),picker=modal.querySelector(`[data-dcolor="${key}"]`);if(text)text.value=safe;if(picker)picker.value=safe;this.store.transact('تحديث اللون العام',p=>{p.theme.tokens=p.theme.tokens||{};p.theme.tokens.colors={...(p.theme.tokens.colors||{}),[key]:safe};if(['primary','secondary','text','surface','accent'].includes(key))p.theme[key]=safe})};modal.querySelectorAll('[data-dcolor]').forEach(el=>el.addEventListener('input',()=>setColor(el.dataset.dcolor,el.value)));modal.querySelectorAll('[data-dcolor-text]').forEach(el=>el.addEventListener('change',()=>setColor(el.dataset.dcolorText,el.value)));modal.querySelector('#themeContainer')?.addEventListener('change',e=>this.store.transact('تغيير عرض الموقع',p=>{p.theme.tokens=p.theme.tokens||{};p.theme.tokens.container=Math.max(320,Math.min(1800,Number(e.target.value)||1180))}));modal.querySelector('#themeAuto')?.addEventListener('click',()=>{const base=normalizeColor(colors.primary||t.primary||'#5b5ce2');const rgb=hexToRgb(base),shift=(n)=>'#'+[rgb.r,rgb.g,rgb.b].map(v=>Math.max(0,Math.min(255,v+n)).toString(16).padStart(2,'0')).join('');const palette={primary:base,secondary:shift(-24),accent:shift(34),text:'#171b2a',surface:'#ffffff',muted:'#6d7588',line:'#e4e7ef'};this.store.transact('اقتراح ألوان متناسقة',p=>{p.theme.tokens=p.theme.tokens||{};p.theme.tokens.colors={...(p.theme.tokens.colors||{}),...palette};Object.assign(p.theme,{primary:palette.primary,secondary:palette.secondary,accent:palette.accent,text:palette.text,surface:palette.surface})});modal.remove();this.theme()});modal.querySelector('#themeReset')?.addEventListener('click',()=>{const palette={primary:'#5b5ce2',secondary:'#4b4cc7',accent:'#28a77b',text:'#171b2a',surface:'#ffffff',muted:'#6d7588',line:'#e4e7ef'};this.store.transact('إعادة الألوان',p=>{p.theme.tokens=p.theme.tokens||{};p.theme.tokens.colors={...(p.theme.tokens.colors||{}),...palette};Object.assign(p.theme,{primary:palette.primary,secondary:palette.secondary,accent:palette.accent,text:palette.text,surface:palette.surface})});modal.remove();this.theme()});return modal}
  shortcuts(){showModal(this.host,{title:'الاختصارات',body:'<div class="simple-manager-note"><b>أهم الاختصارات فقط</b><br>استخدمها لتسريع العمل. كلها اختيارية ويمكنك استخدام الأزرار بدلًا منها.</div><div class="shortcut-group"><div class="shortcut-row-simple"><span>حفظ المشروع</span><kbd>Ctrl / ⌘ + S</kbd></div><div class="shortcut-row-simple"><span>تراجع</span><kbd>Ctrl / ⌘ + Z</kbd></div><div class="shortcut-row-simple"><span>إعادة</span><kbd>Ctrl / ⌘ + Y</kbd></div><div class="shortcut-row-simple"><span>تكبير / تصغير</span><kbd>Ctrl / ⌘ + عجلة</kbd></div><div class="shortcut-row-simple"><span>ملاءمة شاشة التعديل</span><kbd>F</kbd></div><div class="shortcut-row-simple"><span>تحريك الشاشة</span><kbd>Space + سحب</kbd></div></div>'})}
  renameProject(){const name=prompt('اسم المشروع',this.store.project.meta.name);if(name?.trim())this.store.transact('تسمية المشروع',project=>project.meta.name=name.trim())}
}
const normalizeColor=value=>{const v=String(value||'').trim();if(/^#[0-9a-fA-F]{6}$/.test(v))return v.toLowerCase();if(/^#[0-9a-fA-F]{3}$/.test(v))return '#'+v.slice(1).split('').map(c=>c+c).join('').toLowerCase();return '#5b5ce2'};const hexToRgb=value=>{const v=normalizeColor(value).slice(1);return {r:parseInt(v.slice(0,2),16),g:parseInt(v.slice(2,4),16),b:parseInt(v.slice(4,6),16)}};
const escapeText=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
exports.Dialogs = Dialogs;
