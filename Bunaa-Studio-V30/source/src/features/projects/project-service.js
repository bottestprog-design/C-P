class ProjectService {
  constructor(repository) { this.repository = repository; }
  list(userId, query = '') {
    const all = this.repository.list(userId);
    const q = String(query || '').trim().toLowerCase();
    return q ? all.filter(project => `${project.name} ${project.template || ''}`.toLowerCase().includes(q)) : all;
  }
  stats(userId) {
    const projects = this.list(userId);
    return { count: projects.length, pages: projects.reduce((sum, item) => sum + Number(item.pages || 0), 0), nodes: projects.reduce((sum, item) => sum + Number(item.nodes || 0), 0) };
  }
  recent(userId, limit = 3) { return this.list(userId).slice(0, Math.max(1, Number(limit) || 3)); }
}
exports.ProjectService = ProjectService;
