const {normalizeProject,SCHEMA_VERSION} = __require("src/core/model.js");
const {deepClone} = __require("src/core/utils.js");

const BACKUP_VERSION = 1;
function createBackup(project) {
  return {
    format: 'bunaa-project-backup',
    backupVersion: BACKUP_VERSION,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    project: deepClone(normalizeProject(project)),
  };
}
function parseBackup(raw) {
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!parsed || parsed.format !== 'bunaa-project-backup' || !parsed.project) throw new Error('ملف النسخة الاحتياطية غير صالح.');
  return normalizeProject(parsed.project);
}
function restoreBackup(store, raw, { rename = '' } = {}) {
  const project = parseBackup(raw);
  if (rename) project.meta.name = String(rename).trim() || project.meta.name;
  project.meta.updatedAt = new Date().toISOString();
  const saved = store.repo.create(store.userId, { name: project.meta.name, seed: project });
  store.openProject(saved.meta.id);
  return store.project;
}
function downloadBackup(project) {
  const blob = new Blob([JSON.stringify(createBackup(project), null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${String(project.meta?.name || 'bunaa-project').replace(/[^\w\u0600-\u06ff.-]+/g, '-').slice(0, 80)}.bunaa.json`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
exports.createBackup = createBackup;
exports.parseBackup = parseBackup;
exports.restoreBackup = restoreBackup;
exports.downloadBackup = downloadBackup;
});
