const {compileSite} = __require("src/features/seo/index.js");
class ReleaseService {
  constructor(store) { this.store = store; }
  inspect() {
    const diagnostics = compileSite(this.store.project).diagnostics;
    const release = this.store.project.release || { channel: 'draft', status: 'draft', version: 1, publishedAt: null };
    return { release: { ...release }, diagnostics, canPublish: diagnostics.issues.length === 0 };
  }
  markReady(channel = 'production') {
    return this.store.transact('تجهيز الإصدار', project => {
      project.release ||= { channel: 'draft', status: 'draft', version: 1, publishedAt: null };
      project.release.channel = channel;
      project.release.status = 'ready';
      project.release.version = Number(project.release.version || 0) + 1;
    });
  }
  publish() {
    const state = this.inspect();
    if (!state.canPublish) return { ok: false, ...state };
    const publishedAt = new Date().toISOString();
    this.store.transact('نشر إصدار الموقع', project => {
      project.release ||= {};
      project.release.status = 'published';
      project.release.channel = 'production';
      project.release.version = Number(project.release.version || 0) + 1;
      project.release.publishedAt = publishedAt;
      for (const page of project.pages || []) if (page.status === 'draft') page.status = 'published';
    });
    this.store.persistNow();
    return { ok: true, ...this.inspect() };
  }
  unpublish() {
    return this.store.transact('إيقاف النشر', project => {
      project.release ||= {};
      project.release.status = 'draft';
      project.release.channel = 'draft';
    });
  }
}
exports.ReleaseService = ReleaseService;
});
