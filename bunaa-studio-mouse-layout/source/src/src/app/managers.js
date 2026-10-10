const {showModal} = __require("src/ui/modal.js");
const {navigationActions,getMenus} = __require("src/features/navigation/navigation-service.js");
const {compileSite} = __require("src/features/seo/index.js");
const {downloadBackup,parseBackup} = __require("src/features/backup/backup-service.js");

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' }[c]));
class StudioManagers {
  constructor(app) { this.app = app; }
  get store() { return this.app.store; }
  get host() { return document.getElementById('modalHost'); }
  toast(message) { this.app.toast(message); }

  navigation() {
    const project = this.store.project;
    const menus = getMenus(project);
    const menu = menus.find(item => item.id === project.navigation?.headerMenuId) || menus[0];
    const pages = project.pages || [];
    const items = menu?.items || [];
    const body = `<div class="manager-toolbar"><div><b>القائمة الرئيسية</b><small>${items.length} عناصر • ${pages.length} صفحات</small></div><div class="manager-toolbar-actions"><button id="managerAddPage" class="primary-btn">＋ صفحة</button><button id="managerAddUrl" class="secondary-btn">＋ رابط خارجي</button></div></div><div class="navigation-manager">${items.map((item,index)=>{const target=pages.find(page=>page.id===item.targetId);return `<article class="navigation-row"><span class="nav-order">${index+1}</span><div><b>${esc(item.label||target?.name||'رابط')}</b><small>${item.type==='page'?(target?`صفحة: ${esc(target.name)}`:'صفحة مفقودة'):`${esc(item.url||'رابط خارجي')}`}</small></div><div class="navigation-actions"><button data-nav-up="${esc(item.id)}" ${index===0?'disabled':''}>↑</button><button data-nav-down="${esc(item.id)}" ${index===items.length-1?'disabled':''}>↓</button><button data-nav-remove="${esc(item.id)}">×</button></div></article>`;}).join('') || '<div class="tips-card">لا توجد عناصر.</div>'}</div><div class="tips-card"><b>التنقل مرتبط بالنموذج</b><p>تغيير ترتيب الصفحات لا يلزم أن يغيّر ترتيب القائمة؛ القائمة أصبحت كيانًا مستقلًا ويمكن أن تحتوي صفحات وروابط خارجية.</p></div>`;
    const modal = showModal(this.host,{title:'Navigation Manager',body,wide:true});
    modal.querySelector('#managerAddPage')?.addEventListener('click',()=>{
      if (!menu) return;
      const page = pages.find(p => !items.some(item => item.type === 'page' && item.targetId === p.id));
      if (!page) { this.toast('كل الصفحات الظاهرة موجودة في القائمة.'); return; }
      navigationActions.addMenuItem(this.store,menu.id,{label:page.name,type:'page',targetId:page.id}); modal.remove(); this.navigation();
    });
    modal.querySelector('#managerAddUrl')?.addEventListener('click',()=>{
      if (!menu) return;
      const label = prompt('اسم الرابط','رابط خارجي'); const url = prompt('الرابط','https://');
      if (label?.trim() && url?.trim()) { navigationActions.addMenuItem(this.store,menu.id,{label:label.trim(),type:'url',url:url.trim(),newTab:true}); modal.remove(); this.navigation(); }
    });
    modal.querySelectorAll('[data-nav-up]').forEach(button=>button.onclick=()=>{navigationActions.reorderMenuItem(this.store,menu.id,button.dataset.navUp,'up');modal.remove();this.navigation()});
    modal.querySelectorAll('[data-nav-down]').forEach(button=>button.onclick=()=>{navigationActions.reorderMenuItem(this.store,menu.id,button.dataset.navDown,'down');modal.remove();this.navigation()});
    modal.querySelectorAll('[data-nav-remove]').forEach(button=>button.onclick=()=>{navigationActions.removeMenuItem(this.store,menu.id,button.dataset.navRemove);modal.remove();this.navigation()});
    return modal;
  }

  release() {
    const state = this.app.releaseService.inspect();
    const release = state.release;
    const audit = state.diagnostics;
    const issues = [...audit.issues,...audit.warnings];
    const body = `<div class="release-summary"><div class="release-stat"><b>الحالة</b><strong>${esc(release.status||'draft')}</strong></div><div class="release-stat"><b>رقم الإصدار</b><strong>${Number(release.version||1)}</strong></div><div class="release-stat"><b>الجودة</b><strong>${audit.score}/100</strong></div></div><div class="quality-list">${issues.map(item=>`<article class="quality-item ${item.severity==='error'?'bad':'warn'}"><b>${esc(item.title)}</b><small>${esc(item.detail)}</small></article>`).join('') || '<article class="quality-item good">✓ لا توجد مشكلات أساسية تمنع الإصدار.</article>'}</div><div class="modal-actions"><button id="releasePrepare" class="secondary-btn">تجهيز الإصدار</button><button id="releasePublish" class="primary-btn" ${state.canPublish?'':'disabled'}>اعتماد محلي</button>${release.status==='published'?'<button id="releaseDraft" class="danger-btn">إرجاع لمسودة</button>':''}</div><div class="tips-card"><b>الإصدار المحلي</b><p>هذه الخطوة تغير حالة المشروع وتسجل رقم الإصدار داخل ملف المشروع. الاستضافة والنشر على نطاق فعلي تحتاج خدمة نشر خارجية لاحقًا.</p></div>`;
    const modal = showModal(this.host,{title:'Release Manager',body,wide:true});
    modal.querySelector('#releasePrepare')?.addEventListener('click',()=>{this.app.releaseService.markReady();modal.remove();this.release()});
    modal.querySelector('#releasePublish')?.addEventListener('click',()=>{const result=this.app.releaseService.publish();if(!result.ok){this.toast('أصلح أخطاء التدقيق أولًا.');return}modal.remove();this.toast('تم اعتماد الإصدار محليًا.');this.release()});
    modal.querySelector('#releaseDraft')?.addEventListener('click',()=>{this.app.releaseService.unpublish();modal.remove();this.release()});
    return modal;
  }

  backupProject(project=this.store.project) {
    return downloadBackup(project);
  }

  backup() {
    const body = `<div class="backup-layout"><article class="backup-card"><span class="eyebrow">EXPORT</span><b>نسخة احتياطية كاملة</b><p>النسخة تشمل الصفحات، CMS، المكونات المشتركة، الوسائط، Design System، التفاعلات، التنقل وإعدادات SEO.</p><button id="downloadBackup" class="primary-btn">تنزيل .bunaa.json</button></article><article class="backup-card"><span class="eyebrow">RESTORE</span><b>استعادة مشروع</b><p>سيتم إنشاء نسخة جديدة من الملف المستورد حتى لا يتم الكتابة فوق المشروع الحالي.</p><input id="backupInput" type="file" accept=".json,.bunaa.json,application/json"><button id="restoreBackup" class="secondary-btn" disabled>استعادة كمشروع جديد</button></article></div>`;
    const modal = showModal(this.host,{title:'Backup & Restore',body,wide:true});
    modal.querySelector('#downloadBackup')?.addEventListener('click',()=>downloadBackup(this.store.project));
    const input=modal.querySelector('#backupInput'); const restore=modal.querySelector('#restoreBackup');
    input?.addEventListener('change',()=>{restore.disabled=!(input.files?.length)});
    restore?.addEventListener('click',async()=>{const file=input.files?.[0];if(!file)return;try{const project=parseBackup(await file.text());const saved=this.app.repository.importProject(this.app.auth.user.id,project,{duplicateId:true});this.store.openProject(saved.meta.id);modal.remove();this.app.showWorkspace(saved.meta.id);this.toast('تمت الاستعادة كمشروع مستقل.')}catch(error){this.toast(error?.message||'ملف غير صالح.')}});
    return modal;
  }

  siteReport() {
    const result = compileSite(this.store.project);
    return result;
  }
}
exports.StudioManagers = StudioManagers;
});
