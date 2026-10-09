const {showModal} = __require("src/ui/modal.js");
class CommandPalette {
  constructor(app) { this.app = app; this.commands = this.build(); }
  build() {
    return [
      ['new-page', 'صفحة جديدة', () => this.app.panels.pagesModal()],
      ['templates', 'فتح القوالب', () => this.app.panels.templatesModal()],
      ['sections', 'فتح الأقسام', () => this.app.panels.sectionsModal()],
      ['assets', 'مكتبة الوسائط', () => this.app.panels.assetsModal()],
      ['cms', 'محتوى الموقع CMS', () => this.app.showCmsManager()],
      ['design', 'نظام التصميم', () => this.app.showDesignManager()],
      ['audit', 'فحص جودة الموقع', () => this.app.showAudit()],
      ['navigation', 'إدارة التنقل والقوائم', () => this.app.showNavigationManager()],
      ['release', 'إدارة الإصدارات', () => this.app.showReleaseManager()],
      ['backup', 'نسخة احتياطية واستعادة', () => this.app.showBackupManager()],
      ['preview', 'معاينة الموقع', () => this.app.dialogs.preview()],
      ['export', 'تصدير الموقع', () => this.app.dialogs.export()],
      ['save', 'حفظ المشروع', () => this.app.store.persistNow()],
    ];
  }
  open() {
    const body = `<div class="command-palette"><input id="commandQuery" class="command-search" placeholder="ابحث عن أمر…"><div id="commandList">${this.render(this.commands)}</div></div>`;
    const modal = showModal(document.getElementById('modalHost'), { title: 'مركز الأوامر', body, wide: true });
    const input = modal.querySelector('#commandQuery');
    const renderList = () => { const q = String(input.value || '').trim().toLowerCase(); modal.querySelector('#commandList').innerHTML = this.render(this.commands.filter(item => item[1].toLowerCase().includes(q))); this.wire(modal); };
    input.addEventListener('input', renderList); this.wire(modal); setTimeout(() => input.focus(), 0); return modal;
  }
  render(commands) { return commands.map(([id,label]) => `<button class="command-row" type="button" data-command="${id}"><span>⌘</span><b>${label}</b><small>Enter</small></button>`).join('') || '<div class="tips-card">لا يوجد أمر بهذا الاسم.</div>'; }
  wire(modal) { modal.querySelectorAll('[data-command]').forEach(button => button.onclick = () => { const item = this.commands.find(command => command[0] === button.dataset.command); modal.remove(); item?.[2]?.(); }); }
}
exports.CommandPalette = CommandPalette;
