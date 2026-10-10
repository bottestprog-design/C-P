const {storage} = __require("src/core/storage.js");
const {makeProject} = __require("src/core/model.js");
const {migrateProject} = __require("src/core/migrations.js");
const {deepClone,uid} = __require("src/core/utils.js");
const REPOSITORY_VERSION = 2;
const PROJECT_INDEX_PREFIX = 'bunaa_v26_project_index:';
const PROJECT_DATA_PREFIX = 'bunaa_v26_project:';
const LEGACY_PROJECT_PREFIXES = [
  'bunaa_v25_project:',
  'bunaa_v21_project:',
  'bunaa_v20_project:',
  'bunaa_v19_project:',
  'bunaa_v11_improved_project:',
  'bunaa_v12_project:',
  'bunaa_v13_project:',
  'bunaa_v14_project:',
  'bunaa_v15_project:',
  'bunaa_v18_project:',
  'bunaa_v17_project:',
  'bunaa_v16_project:',
];

const read = (key, fallback) => {
  try {
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};
const write = (key, value) => storage.setItem(key, JSON.stringify(value));
const indexKey = userId => `${PROJECT_INDEX_PREFIX}${userId}`;
const dataKey = (userId, projectId) => `${PROJECT_DATA_PREFIX}${userId}:${projectId}`;
const cleanName = value => String(value || '').trim().replace(/\s+/g, ' ');
class ProjectRepository {
  list(userId) {
    if (!userId) return [];
    const index = read(indexKey(userId), {version: REPOSITORY_VERSION, projects: []});
    const projects = Array.isArray(index?.projects) ? index.projects : [];
    const valid = projects.filter(item => item?.id && item?.name);
    if (valid.length !== projects.length) this._writeIndex(userId, valid);
    return deepClone(valid.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))));
  }

  get(userId, projectId) {
    if (!userId || !projectId) return null;
    const stored = read(dataKey(userId, projectId), null);
    if (stored) return migrateProject(stored);
    return null;
  }

  getFirst(userId) {
    const first = this.list(userId)[0];
    return first ? this.get(userId, first.id) : null;
  }

  create(userId, {name = 'مشروعي', template = null, seed = {}} = {}) {
    if (!userId) throw new Error('لا يمكن إنشاء مشروع بدون حساب.');
    const id = uid('project');
    const base = makeProject({ownerId: userId, name: cleanName(name) || 'مشروعي'});
    const project = migrateProject({
      ...base,
      ...deepClone(seed),
      meta: {
        ...base.meta,
        ...(seed.meta || {}),
        id,
        ownerId: userId,
        name: cleanName(name) || 'مشروعي',
      },
    });
    if (template) {
      project.meta.template = String(template);
    }
    this.save(userId, project);
    return project;
  }

  save(userId, project) {
    if (!userId) throw new Error('لا يمكن حفظ مشروع بدون حساب.');
    const normalized = migrateProject(deepClone(project));
    normalized.meta.id = String(normalized.meta.id || uid('project'));
    normalized.meta.ownerId = userId;
    normalized.meta.updatedAt = new Date().toISOString();
    if (!normalized.meta.createdAt) normalized.meta.createdAt = normalized.meta.updatedAt;
    write(dataKey(userId, normalized.meta.id), normalized);

    const existing = this.list(userId).filter(item => item.id !== normalized.meta.id);
    const meta = {
      id: normalized.meta.id,
      name: normalized.meta.name,
      createdAt: normalized.meta.createdAt,
      updatedAt: normalized.meta.updatedAt,
      pages: normalized.pages.length,
      nodes: this._nodeCount(normalized),
      activePageId: normalized.activePageId,
      template: normalized.meta.template || '',
    };
    this._writeIndex(userId, [meta, ...existing]);
    return deepClone(normalized);
  }

  rename(userId, projectId, name) {
    const project = this.get(userId, projectId);
    if (!project) return null;
    project.meta.name = cleanName(name) || project.meta.name;
    return this.save(userId, project);
  }

  duplicate(userId, projectId, name) {
    const source = this.get(userId, projectId);
    if (!source) return null;
    const copy = deepClone(source);
    copy.meta = {
      ...copy.meta,
      id: uid('project'),
      ownerId: userId,
      name: cleanName(name) || `${source.meta.name} — نسخة`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return this.save(userId, copy);
  }

  exportProject(userId, projectId) {
    return this.get(userId, projectId);
  }

  importProject(userId, project, { duplicateId = true } = {}) {
    if (!userId) throw new Error('لا يمكن استيراد مشروع بدون حساب.');
    const copy = migrateProject(deepClone(project));
    if (duplicateId || !copy.meta?.id || this.get(userId, copy.meta.id)) copy.meta.id = uid('project');
    copy.meta.ownerId = userId;
    copy.meta.createdAt = new Date().toISOString();
    copy.meta.updatedAt = copy.meta.createdAt;
    return this.save(userId, copy);
  }

  remove(userId, projectId) {
    if (!userId || !projectId) return false;
    const existed = Boolean(storage.getItem(dataKey(userId, projectId)));
    storage.removeItem(dataKey(userId, projectId));
    if (existed) this._writeIndex(userId, this.list(userId).filter(item => item.id !== projectId));
    return existed;
  }

  migrateLegacy(userId) {
    if (!userId) return [];
    if (this.list(userId).length) return this.list(userId);
    for (const prefix of LEGACY_PROJECT_PREFIXES) {
      const legacy = read(`${prefix}${userId}`, null);
      if (!legacy) continue;
      const project = migrateProject(legacy);
      project.meta.id = uid('project');
      project.meta.ownerId = userId;
      this.save(userId, project);
      return this.list(userId);
    }
    const anonymousKeys = ['bunaa_v11_improved_project', 'bunaa_v11_phase3_project', 'bunaa_v11_project', 'bunaa_project'];
    for (const key of anonymousKeys) {
      const legacy = read(key, null);
      if (!legacy) continue;
      const project = migrateProject(legacy);
      project.meta.id = uid('project');
      project.meta.ownerId = userId;
      this.save(userId, project);
      try { storage.setItem(`${key}:migrated:v26`, '1'); } catch {}
      return this.list(userId);
    }
    return [];
  }

  _writeIndex(userId, projects) {
    write(indexKey(userId), {version: REPOSITORY_VERSION, projects: deepClone(projects)});
  }

  _nodeCount(project) {
    let count = 0;
    const walk = nodes => (nodes || []).forEach(node => { count += 1; walk(node.children); });
    (project.pages || []).forEach(page => walk(page.nodes));
    return count;
  }
}
exports.REPOSITORY_VERSION = REPOSITORY_VERSION;
exports.PROJECT_INDEX_PREFIX = PROJECT_INDEX_PREFIX;
exports.PROJECT_DATA_PREFIX = PROJECT_DATA_PREFIX;
exports.LEGACY_PROJECT_PREFIXES = LEGACY_PROJECT_PREFIXES;
exports.ProjectRepository = ProjectRepository;
exports.indexKey = indexKey;
exports.dataKey = dataKey;
});
