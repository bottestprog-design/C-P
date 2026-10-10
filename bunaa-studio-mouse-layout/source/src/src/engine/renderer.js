const {safeUrl,safeMediaUrl} = __require("src/core/utils.js");
const {resolveStyle,styleObjectToCss} = __require("src/engine/layout.js");
const {applyThemeVars} = __require("src/core/design-system.js");
const {pageAnchor,resolvePageTarget} = __require("src/engine/routing.js");
const {resolveSymbol} = __require("src/core/symbols.js");
const {getCollectionItems} = __require("src/core/cms.js");
const {findAsset} = __require("src/core/assets.js");

const el=(tag,cls='')=>{const node=document.createElement(tag);if(cls)node.className=cls;return node};
const textNode=(text,tag='p')=>{const node=el(tag);node.textContent=String(text??'');return node};

function wrap(node,ctx){const semanticTag=node.semantic?.tag&&/^[a-z][a-z0-9-]*$/i.test(node.semantic.tag)?node.semantic.tag:'div';const w=el(semanticTag,'node-wrap');w.dataset[ctx.export?'runtimeId':'nodeId']=node.id;w.dataset.bunaaType=node.type;const effective={...(node.style||{}),...(node.responsive?.[ctx.device]||{})};const legacyAutoField=['input','textarea','select'].includes(node.type)&&node.style?.width==null&&node.responsive?.[ctx.device]?.width==='100%';const legacyAutoImage=node.type==='image'&&node.style?.width==='100%'&&Number(node.style?.height)===300&&Number(node.style?.radius)===16&&node.style?.objectFit==='cover';w.dataset.customWidth=effective.width!=null&&effective.width!==''&&!legacyAutoField&&!legacyAutoImage?'1':'0';w.dataset.customHeight=effective.height!=null&&effective.height!==''&&!legacyAutoImage?'1':'0';if(node.locked)w.dataset.locked='1';if(ctx.device&&node.visibility&&node.visibility[ctx.device]===false)w.hidden=true;if(!ctx.export){w.dataset.type=node.type;w.dataset.label=node.props?.label||node.props?.title||node.props?.text||node.type}for(const cls of node.classes||[])w.classList.add(String(cls));for(const [key,value] of Object.entries(node.attrs||{})){if(value!=null)w.setAttribute(key,String(value))}if(node.semantic?.role)w.setAttribute('role',node.semantic.role);if(node.semantic?.ariaLabel)w.setAttribute('aria-label',node.semantic.ariaLabel);const content=el('div','node-content');content.dataset.bunaaContent='1';const resolved=resolveStyle(node,ctx.device,ctx.theme,ctx.styleLibrary,ctx.project);content.style.cssText=styleObjectToCss(resolved);if(resolved.width)w.style.width=resolved.width;if(resolved.height)w.style.height=resolved.height;renderContent(content,node,ctx);for(const child of node.children||[])content.appendChild(wrap(child,ctx));w.appendChild(content);if(!ctx.export&&ctx.selectedId===node.id)w.classList.add('selected');return w}


function boundValue(node,ctx,key,fallback=''){const variable=node?.props?.bindingVariable;if(variable&&ctx.project?.variables){const source=ctx.project.variables[variable];if(source&&Object.prototype.hasOwnProperty.call(source,'value'))return String(source.value)}return String(node?.props?.[key]??fallback)}

function assetSrc(node,kind,ctx){const asset=findAsset(ctx.project,node?.props?.assetId);if(!asset)return safeMediaUrl(node?.props?.src||node?.props?.url||'',kind)||'';return ctx.export&&ctx.assetMap?.get(asset.id)?ctx.assetMap.get(asset.id):asset.data}

function pageHref(page,ctx){if(!page)return '#';if(ctx.export&&ctx.pageMap)return ctx.pageMap.get(page.id)||'#';return pageAnchor(page.id)}
function resolveHref(url,ctx){const target=resolvePageTarget(url,ctx.project);return target?pageHref(target,ctx):safeUrl(url||'#')}

function renderContent(root,node,ctx){const p=node.props||{};switch(node.type){
case'heading':root.appendChild(textNode(boundValue(node,ctx,'text','عنوان'),'h2'));break;
case'text':root.appendChild(textNode(boundValue(node,ctx,'text','نص')));break;
case'button':{const a=el('a','built-button');a.textContent=boundValue(node,ctx,'text','زر');a.href=resolveHref(p.url,ctx);a.dataset.action=p.action||'url';const target=resolvePageTarget(p.url,ctx.project);if(target)a.dataset.pageTarget=target.id;if(p.newTab)a.target='_blank';root.appendChild(a);break}
case'link':{const a=el('a');a.textContent=boundValue(node,ctx,'text','رابط');a.href=resolveHref(p.url,ctx);const target=resolvePageTarget(p.url,ctx.project);if(target)a.dataset.pageTarget=target.id;root.appendChild(a);break}
case'image':{const img=el('img');img.src=assetSrc(node,'image',ctx)||safeMediaUrl(node.props?.bindingVariable?boundValue(node,ctx,'src',p.src):p.src,'image')||placeholder();img.alt=p.alt||'';img.loading='lazy';img.style.width='100%';img.style.maxWidth='100%';img.style.height=root.style.height&&root.style.height!=='auto'?'100%':'auto';img.style.objectFit=root.style.objectFit||'cover';img.draggable=false;root.appendChild(img);break}
case'gallery':{const gallery=el('div','built-gallery');for(let i=0;i<Math.max(1,Math.min(12,Number(p.count)||6));i++){const img=el('img');img.src=placeholder(`صورة ${i+1}`);img.alt=`صورة ${i+1}`;img.loading='lazy';gallery.appendChild(img)}root.appendChild(gallery);break}
case'quote':root.appendChild(textNode(p.text||'اقتباس','blockquote'));break;
case'list':{const ul=el('ul');String(p.items||'').split(/\n+/).filter(Boolean).forEach(x=>ul.appendChild(textNode(x,'li')));root.appendChild(ul);break}
case'divider':root.appendChild(el('hr'));break;
case'spacer':root.appendChild(el('div'));break;
case'section':case'container':case'grid':case'columns':case'stack':case'spaced':case'group':case'hero':break;
case'card':{const c=el('div','built-card');c.append(textNode(p.title||'بطاقة','h3'),textNode(p.text||'وصف مختصر'));if(p.button){const a=el('a');a.href=resolveHref(p.url,ctx);a.textContent=p.button;if(resolvePageTarget(p.url,ctx.project))a.dataset.pageTarget=resolvePageTarget(p.url,ctx.project).id;c.appendChild(a)}root.appendChild(c);break}
case'navbar':{const nav=el('nav','built-nav');nav.appendChild(textNode(p.brand||ctx.project.site?.brand?.name||'الموقع','strong'));const links=el('div','nav-links');const menuId=p.menuId||ctx.project.navigation?.headerMenuId;const menu=ctx.project.navigation?.menus?.find(item=>item.id===menuId);const items=Array.isArray(menu?.items)&&menu.items.length?menu.items:(Array.isArray(p.links)?p.links.map((label,index)=>({label,targetId:p.linkTargets?.[index]})):[]);items.forEach((item,index)=>{const a=el('a');a.textContent=item.label||item.name||`رابط ${index+1}`;const target=ctx.project.pages.find(pg=>pg.id===item.targetId)||ctx.project.pages.find(pg=>pg.name===a.textContent)||ctx.project.pages[index]||ctx.project.pages[0];a.href=item.type==='url'?safeUrl(item.url||'#'):pageHref(target,ctx);if(item.newTab)a.target='_blank';links.appendChild(a)});nav.appendChild(links);root.appendChild(nav);break}
case'footer':{const f=el('footer');f.append(textNode(p.brand||'الموقع','strong'),textNode(p.text||''));root.appendChild(f);break}
case'alert':root.appendChild(textNode(p.text||'تنبيه'));break;
case'badge':root.appendChild(textNode(p.text||'جديد','span'));break;
case'progress':{const bar=el('div','built-progress'),fill=el('div'),value=Math.max(0,Math.min(100,Number(p.value)||0));fill.style.width=`${value}%`;bar.append(fill,textNode(p.label||`${value}%`));root.appendChild(bar);break}
case'stats':{const g=el('div','built-stats');(p.items||[]).forEach(([v,l])=>{const d=el('div');d.append(textNode(v,'strong'),textNode(l));g.appendChild(d)});root.appendChild(g);break}
case'timeline':{const g=el('div','built-timeline');(p.items||[]).forEach(([v,l])=>{const d=el('div');d.append(textNode(v,'strong'),textNode(l));g.appendChild(d)});root.appendChild(g);break}
case'pricing':{const g=el('div','built-pricing');(p.plans||[]).forEach(([n,v])=>{const d=el('div');d.append(textNode(n,'h3'),textNode(v,'strong'));g.appendChild(d)});root.appendChild(g);break}
case'testimonial':{const d=el('div','built-testimonial');d.append(textNode(`“${p.quote||''}”`),textNode(p.name||'عميل','strong'));root.appendChild(d);break}
case'tabs':{const g=el('div','built-tabs');const items=p.items||[];const panels=[];const buttons=[];items.forEach((item,i)=>{const b=el('button');b.type='button';b.textContent=item;const panel=textNode(`محتوى ${item}`);panel.className=i?'tab-panel hidden':'tab-panel';b.onclick=()=>{panels.forEach(x=>x.classList.add('hidden'));panel.classList.remove('hidden');buttons.forEach(x=>x.classList.remove('active'));b.classList.add('active')};if(i===0)b.classList.add('active');buttons.push(b);panels.push(panel);g.append(b,panel)});root.appendChild(g);break}
case'accordion':{const g=el('div','built-accordion');(p.items||[]).forEach(q=>{const d=el('details');d.append(textNode(q,'summary'),textNode('أضف الإجابة من التخصيص.'));g.appendChild(d)});root.appendChild(g);break}
case'dropdown':{const s=el('select');(p.items||[]).forEach(x=>s.appendChild(textNode(x,'option')));root.appendChild(s);break}
case'input':case'search':case'file':{const label=textNode(p.label||'حقل','label'),input=el('input');input.type=node.type==='search'?'search':node.type==='file'?'file':(p.type||'text');input.placeholder=p.placeholder||'';root.append(label,input);break}
case'textarea':{root.append(textNode(p.label||'رسالة','label'),Object.assign(el('textarea'),{placeholder:p.placeholder||''}));break}
case'select':{root.append(textNode(p.label||'اختيار','label'));const s=el('select');(p.items||[]).forEach(x=>s.appendChild(textNode(x,'option')));root.appendChild(s);break}
case'checkbox':case'radio':{const label=el('label');const input=el('input');input.type=node.type;label.append(input,textNode(p.label||'اختيار'));root.appendChild(label);break}
case'form':{const f=el('form','built-form');f.noValidate=true;f.addEventListener('submit',e=>e.preventDefault());f.appendChild(textNode(p.submitLabel||'النموذج','strong'));root.appendChild(f);break;}
case'video':{const src=assetSrc(node,'video',ctx)||safeMediaUrl(p.url,'video');if(/^data:video\//i.test(src)||findAsset(ctx.project,p.assetId)?.kind==='video'){const video=el('video');video.controls=true;video.playsInline=true;video.preload='metadata';video.src=src;video.title=p.title||'فيديو';if(p.poster)video.poster=safeMediaUrl(p.poster,'image');root.appendChild(video)}else{const iframe=el('iframe');iframe.src=src;iframe.title=p.title||'فيديو';iframe.loading='lazy';root.appendChild(iframe)}break}
case'audio':{const audio=el('audio');audio.controls=true;const src=assetSrc(node,'audio',ctx);if(src)audio.src=src;root.appendChild(audio);break}
case'table':{const table=el('table'),thead=el('thead'),tr=el('tr');(p.headers||[]).forEach(h=>tr.appendChild(textNode(h,'th')));thead.appendChild(tr);const tbody=el('tbody');(p.rows||[]).forEach(row=>{const r=el('tr');row.forEach(v=>r.appendChild(textNode(v,'td')));tbody.appendChild(r)});table.append(thead,tbody);root.appendChild(table);break}
case'chart':{const g=el('div','built-chart');(p.values||[40,60,80]).forEach(v=>{const b=el('i');b.style.height=`${Math.max(10,Math.min(100,Number(v)||0))}%`;g.appendChild(b)});root.appendChild(g);break}
case'calendar':root.appendChild(textNode(p.month||'هذا الشهر','div'));break;
case'product':{const c=el('div','built-product');c.append(textNode(p.name||'منتج','h3'),textNode(`${p.price||''} ${p.currency||''}`,'strong'));const a=el('a');a.href=resolveHref(p.url,ctx);a.textContent=p.cta||'اختيار';c.appendChild(a);root.appendChild(c);break}
case'faq':{const d=el('details','built-faq');d.append(textNode(p.question||'سؤال','summary'),textNode(p.answer||''));root.appendChild(d);break}
case'rating':root.appendChild(textNode('★'.repeat(Math.max(0,Math.min(5,Number(p.value)||0))),'div'));break;
case'counter':root.appendChild(textNode(`${p.value||0}${p.suffix||''}`,'div'));break;
case'social':{const g=el('div','built-social');(p.items||[]).forEach(x=>{const a=el('a');a.href=safeUrl(p.urls?.[x]||'#');a.textContent=x;g.appendChild(a)});root.appendChild(g);break}
case'gradient':case'glass':case'marquee':root.appendChild(textNode(p.text||''));break;
case'richtext':{const d=el('div','richtext');d.textContent=String(p.text||p.html||'');root.appendChild(d);break}
case'avatar':{const img=el('img','built-avatar');img.src=safeMediaUrl(p.src,'image')||placeholder(p.name||'ش');img.alt=p.name||'';root.appendChild(img);root.appendChild(textNode(p.name||'اسم','strong'));break}
case'logo':{const d=el('div','built-logo');if(p.src){const img=el('img');img.src=safeMediaUrl(p.src,'image');img.alt=p.text||'';d.appendChild(img)}else d.append(textNode(p.text||ctx.project.site?.brand?.name||'العلامة','strong'));root.appendChild(d);break}
case'breadcrumbs':{const nav=el('nav','built-breadcrumbs');(p.items||ctx.project.pages.map(pg=>pg.name)).forEach((label,i,arr)=>{const span=textNode(label,'span');if(i<arr.length-1)span.append(' › ');nav.appendChild(span)});root.appendChild(nav);break}
case'chip-list':{const d=el('div','built-chips');(p.items||['ميزة','جديد','شائع']).forEach(x=>d.appendChild(textNode(x,'span')));root.appendChild(d);break}
case'feature-list':{const d=el('div','built-feature-list');(p.items||[['ميزة','وصف مختصر'],['ميزة ثانية','وصف مختصر']]).forEach(([title,desc])=>{const item=el('div');item.append(textNode('✓','strong'),textNode(title,'h3'),textNode(desc));d.appendChild(item)});root.appendChild(d);break}
case'team':{const d=el('div','built-team');(p.items||[['أحمد','مدير'],['سارة','مصممة'],['علي','مطور']]).forEach(([name,role])=>{const item=el('div');item.appendChild(textNode(name,'strong'));item.appendChild(textNode(role));d.appendChild(item)});root.appendChild(d);break}
case'logo-cloud':{const d=el('div','built-logo-cloud');(p.items||['Acme','Nova','Orbit','Pixel']).forEach(x=>d.appendChild(textNode(x,'strong')));root.appendChild(d);break}
case'stepper':{const d=el('ol','built-stepper');(p.items||[['01','ابدأ'],['02','صمّم'],['03','أطلق']]).forEach(([n,label])=>{const item=el('li');item.append(textNode(n,'strong'),textNode(label));d.appendChild(item)});root.appendChild(d);break}
case'code':{const pre=el('pre');pre.textContent=p.code||'// اكتب الكود هنا';root.appendChild(pre);break}
case'embed':{const iframe=el('iframe');iframe.src=safeUrl(p.url||'');iframe.title=p.title||'مضمن';iframe.loading='lazy';root.appendChild(iframe);break}
case'collection-list':{const d=el('div','built-collection-list');const items=getCollectionItems(ctx.project,p.collectionId).slice(0,Math.max(1,Math.min(50,Number(p.limit)||6)));items.forEach(item=>{const card=el('article','cms-card');const title=item.data?.title||item.slug||'عنصر';card.appendChild(textNode(title,'h3'));if(item.data?.image){const img=el('img');img.src=safeMediaUrl(item.data.image,'image');img.alt=title;card.appendChild(img)}if(item.data?.body)card.appendChild(textNode(item.data.body));d.appendChild(card)});if(!items.length)d.appendChild(textNode('لا توجد عناصر محتوى بعد.'));root.appendChild(d);break}
case'schedule':{const d=el('div','built-schedule');(p.items||[['09:00','موعد']]).forEach(([time,title])=>{const item=el('div');item.append(textNode(time,'strong'),textNode(title));d.appendChild(item)});root.appendChild(d);break}
case'icon-text':{const d=el('div','built-icon-text');d.append(textNode(p.icon||'✦','strong'),textNode(p.title||'ميزة','h3'),textNode(p.text||''));root.appendChild(d);break}
case'image-text':{const d=el('div','built-image-text');const img=el('img');img.src=safeMediaUrl(p.image,'image')||placeholder();img.alt=p.title||'';const copy=el('div');copy.append(textNode(p.title||'عنوان','h3'),textNode(p.text||''));d.append(img,copy);root.appendChild(d);break}
case'feature-grid':{const d=el('div','built-feature-grid');(p.items||[]).forEach(([title,desc])=>{const card=el('article');card.append(textNode(title,'h3'),textNode(desc));d.appendChild(card)});root.appendChild(d);break}
case'contact-card':{const d=el('address','built-contact-card');d.append(textNode(p.title||'تواصل معنا','h3'),textNode(p.email||''),textNode(p.phone||''),textNode(p.address||''));root.appendChild(d);break}
case'stat-card':{const d=el('div','built-stat-card');d.append(textNode(p.value||'0','strong'),textNode(p.label||''),textNode(p.trend||''));root.appendChild(d);break}
case'pricing-card':{const d=el('article','built-pricing-card');d.append(textNode(p.name||'خطة','h3'),textNode(p.price||''),textNode(p.period||''));const ul=el('ul');(p.features||[]).forEach(x=>ul.appendChild(textNode(x,'li')));d.appendChild(ul);const b=el('a','built-button');b.href=resolveHref(p.url,ctx);b.textContent=p.button||'ابدأ';d.appendChild(b);root.appendChild(d);break}
case'testimonial-card':{const d=el('blockquote','built-testimonial-card');d.append(textNode(`“${p.quote||''}”`),textNode(`${p.name||'عميل'}${p.role?' — '+p.role:''}`,'cite'));root.appendChild(d);break}
case'logo-row':{const d=el('div','built-logo-row');(p.items||[]).forEach(x=>d.appendChild(textNode(x,'strong')));root.appendChild(d);break}
case'social-links':{const d=el('div','built-social-links');(p.items||[]).forEach(([name,url])=>{const a=el('a');a.href=safeUrl(url||'#');a.textContent=name;d.appendChild(a)});root.appendChild(d);break}
case'download':{const a=el('a','built-button');a.href=assetSrc(node,'document',ctx)||safeUrl(p.url||'#');a.download=p.filename||findAsset(ctx.project,p.assetId)?.filename||'';a.textContent=p.text||'تحميل';root.appendChild(a);break}
case'map':{const d=el('div','built-map');d.append(textNode(p.title||'الموقع','h3'),textNode(p.address||'حدد الموقع من الخصائص.'),textNode(`${p.lat||''}, ${p.lng||''}`));root.appendChild(d);break}
case'back-to-top':{const b=el('button','built-button');b.type='button';b.textContent=p.text||'↑ أعلى الصفحة';b.onclick=()=>window.scrollTo({top:0,behavior:'smooth'});root.appendChild(b);break}
case'language-switcher':{const s=el('select','built-language-switcher');(p.languages||['AR','EN']).forEach(x=>s.appendChild(textNode(x,'option')));root.appendChild(s);break}
case'divider-label':{const d=el('div','built-divider-label');d.append(el('span'),textNode(p.text||'أو'),el('span'));root.appendChild(d);break}
case'notice-bar':{const d=el('div','built-notice-bar');d.appendChild(textNode(p.text||''));if(p.button){const a=el('a');a.href=resolveHref(p.url,ctx);a.textContent=p.button;d.appendChild(a)}root.appendChild(d);break}
case'video-card':{const d=el('article','built-video-card');d.append(textNode('▶','strong'),textNode(p.title||'فيديو','h3'),textNode(p.duration||''));root.appendChild(d);break}
case'compare':case'feature-comparison':{const table=el('table','comparison-table');(p.items||p.rows||[]).forEach((row,ri)=>{const tr=el('tr');row.forEach(cell=>tr.appendChild(textNode(cell,ri===0?'th':'td')));table.appendChild(tr)});root.appendChild(table);break}
case'callout':{const d=el('aside','built-callout');d.append(textNode(p.title||'ملاحظة','strong'),textNode(p.text||''));root.appendChild(d);break}
case'spinner':{const d=el('span','built-spinner');d.setAttribute('aria-label','تحميل');root.appendChild(d);break}
case'countdown':{root.appendChild(textNode(`${p.days||0} يوم • ${p.hours||0} ساعة • ${p.minutes||0} دقيقة`,'div'));break}
case'cookie-banner':{const d=el('div','built-cookie');d.append(textNode(p.text||''));const b=el('button');b.type='button';b.textContent=p.accept||'موافق';b.onclick=()=>d.remove();d.appendChild(b);root.appendChild(d);break}
case'cta':case'newsletter':case'lead-form':case'social-proof':case'highlight':case'announcement':case'quote-banner':{const d=el('div');if(p.title)d.appendChild(textNode(p.title,'h3'));d.appendChild(textNode(p.text||p.label||''));if(p.button){const b=el('button','built-button');b.type='button';b.textContent=p.button;d.appendChild(b)}root.appendChild(d);break}
case'symbol-instance':{const symbol=resolveSymbol(ctx.project,p.symbolId);if(symbol?.root&&!ctx.symbolDepth){const rendered=wrap(symbol.root,{...ctx,symbolDepth:(ctx.symbolDepth||0)+1});root.appendChild(rendered)}else if(!symbol?.root){root.appendChild(textNode('مكون مشترك غير موجود.'));}break}
default:if(p.text)root.appendChild(textNode(p.text));}}

const placeholder=(label='صورة')=>'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="420"><rect width="800" height="420" fill="#eef0f7"/><rect x="280" y="150" width="240" height="26" rx="13" fill="#5b5ce2" opacity=".25"/><text x="400" y="235" text-anchor="middle" font-family="Arial" font-size="28" fill="#5b5ce2">${label}</text></svg>`);
function renderPage(page,container,ctx){applyThemeVars(container,ctx.theme||{});container.dataset.pageId=page?.id||'';container.replaceChildren(...(page.nodes||[]).map(node=>wrap(node,ctx)));container.classList.toggle('is-empty',!(page.nodes||[]).length);return container}
function nodeHtml(node,theme,project,device='desktop',pageMap=null,assetMap=null){return wrap(node,{theme,project,styleLibrary:project?.styleLibrary||{},device,selectedId:null,headingTag:'h2',export:true,pageMap,assetMap}).outerHTML}
exports.renderPage = renderPage;
exports.nodeHtml = nodeHtml;
});
