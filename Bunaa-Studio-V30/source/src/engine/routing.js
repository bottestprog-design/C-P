function pageAnchor(pageId){return `#page-${encodeURIComponent(String(pageId||''))}`}
function pageFromAnchor(hash,project){const value=String(hash||'');if(!value.startsWith('#page-'))return null;const id=decodeURIComponent(value.slice(6));return project.pages.find(page=>page.id===id)||null}
function pageFile(project,page,map){return map?.get(page.id)||((page===project.pages[0])?'index.html':`${page.slug||'page'}.html`)}
function resolvePageTarget(url,project){if(typeof url!=='string'||!url.startsWith('page:'))return null;return project.pages.find(page=>page.id===url.slice(5))||null}
exports.pageAnchor = pageAnchor;
exports.pageFromAnchor = pageFromAnchor;
exports.pageFile = pageFile;
exports.resolvePageTarget = resolvePageTarget;
