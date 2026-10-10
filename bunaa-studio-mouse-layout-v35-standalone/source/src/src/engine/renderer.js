const {safeUrl,safeMediaUrl} = __require("src/core/utils.js");
const {resolveStyle,styleObjectToCss} = __require("src/engine/layout.js");
const {applyThemeVars} = __require("src/core/design-system.js");
const {pageAnchor,resolvePageTarget} = __require("src/engine/routing.js");
const {resolveSymbol} = __require("src/core/symbols.js");
const {getCollectionItems} = __require("src/core/cms.js");
const {findAsset} = __require("src/core/assets.js");

const el=(tag,cls='')=>{const node=document.createElement(tag);if(cls)node.className=cls;return node};
const textNode=(text,tag='p')=>{const node=el(tag);node.textContent=String(text??'');return node};

const INTRINSIC_NODE_TYPES = new Set([
  'button','link','badge','heading','text','quote','divider','spacer','icon','spinner',
  'progress','counter','rating','image','language-switcher','back-to-top','download','social-links',
  'notice','notice-bar','callout','stat-card','icon-text','tag','chip','alert'
]);
// Eight familiar resize grips make direct manipulation predictable: each side
// changes one axis and each corner changes both axes.
const EDITOR_RESIZE_EDGES = [
  ['n','تغيير الارتفاع من الأعلى'],['e','تغيير العرض من اليمين'],
  ['s','تغيير الارتفاع من الأسفل'],['w','تغيير العرض من اليسار'],
  ['ne','تغيير الحجم من أعلى اليمين'],['nw','تغيير الحجم من أعلى اليسار'],
  ['se','تغيير الحجم من أسفل اليمين'],['sw','تغيير الحجم من أسفل اليسار']
];
function editorPositionFor(node,device){
  const raw=node?.editorPosition;
  if(!raw||typeof raw!=='object')return {x:0,y:0};
  const entry=raw[device]&&typeof raw[device]==='object'?raw[device]:(device==='desktop'?raw:null);
  const limit=10000;
  const number=value=>Number.isFinite(Number(value))?Math.max(-limit,Math.min(limit,Number(value))):0;
  return {x:number(entry?.x),y:number(entry?.y)};
}
function resourceUrl(value,kind='image',ctx={}){
  const raw=String(value??'').trim();if(!raw)return '';
  if(ctx.export&&ctx.resourceMap?.has(raw))return ctx.resourceMap.get(raw);
  return safeMediaUrl(raw,kind)||'';
}
function rewriteCssResources(css,resourceMap){
  if(!(resourceMap instanceof Map)||!resourceMap.size)return String(css??'');
  return String(css??'').replace(/url\(\s*(['\"]?)(.*?)\1\s*\)/gi,(whole,quote,raw)=>{
    const key=String(raw||'').trim();const local=resourceMap.get(key);
    return `url(\"${String(local||key).replace(/\"/g,'%22')}\")`;
  });
}
function appendResizeHandles(wrapper,node){
  for(const [edge,label] of EDITOR_RESIZE_EDGES){
    const handle=el('button','node-resize-handle');
    handle.type='button';handle.dataset.resizeEdge=edge;
    handle.setAttribute('aria-label',`${label} للعنصر ${node.props?.label||node.props?.title||node.type}`);
    handle.setAttribute('title',label);
    handle.setAttribute('tabindex','-1');
    wrapper.appendChild(handle);
  }
}
function wrap(node,ctx){
  const semanticTag=node.semantic?.tag&&/^[a-z][a-z0-9-]*$/i.test(node.semantic.tag)?node.semantic.tag:'div';
  const w=el(semanticTag,'node-wrap');
  w.dataset[ctx.export?'runtimeId':'nodeId']=node.id;
  w.dataset.bunaaType=node.type;
  if(node.locked)w.dataset.locked='1';
  if(ctx.device&&node.visibility&&node.visibility[ctx.device]===false)w.hidden=true;
  if(!ctx.export){w.dataset.type=node.type;w.dataset.label=node.props?.label||node.props?.title||node.props?.text||node.type;w.dataset.editorResizable='1'}
  for(const cls of node.classes||[])w.classList.add(String(cls));
  for(const [key,value] of Object.entries(node.attrs||{})){if(value!=null)w.setAttribute(key,String(value))}
  if(node.semantic?.role)w.setAttribute('role',node.semantic.role);
  if(node.semantic?.ariaLabel)w.setAttribute('aria-label',node.semantic.ariaLabel);
  const resolvedStyle=resolveStyle(node,ctx.device,ctx.theme,ctx.styleLibrary,ctx.project);
  const devicePatch=node.responsive?.[ctx.device]||{};
  const explicitWidth=(devicePatch.width??node.style?.width);
  const explicitHeight=(devicePatch.height??node.style?.height);
  const hasExplicitWidth=explicitWidth!==undefined&&explicitWidth!==null&&explicitWidth!=='';
  const hasExplicitHeight=explicitHeight!==undefined&&explicitHeight!==null&&explicitHeight!=='';
  if(resolvedStyle.width!=null)w.style.width=String(resolvedStyle.width);
  else if(INTRINSIC_NODE_TYPES.has(node.type))w.style.width='fit-content';
  else w.style.width='100%';
  if(resolvedStyle.height!=null)w.style.height=String(resolvedStyle.height);
  const position=editorPositionFor(node,ctx.device||'desktop');
  if(position.x||position.y)w.style.transform=`translate3d(${position.x}px, ${position.y}px, 0)`;
  if(hasExplicitWidth||hasExplicitHeight)w.dataset.explicitSize='1';
  const content=el('div','node-content');
  content.dataset.bunaaContent='1';
  content.style.cssText=ctx.export?rewriteCssResources(styleObjectToCss(resolvedStyle),ctx.resourceMap):styleObjectToCss(resolvedStyle);
  renderContent(content,node,ctx);
  if(!node.children?.length&&(hasExplicitWidth||hasExplicitHeight)){
    for(const child of content.children){
      if(hasExplicitWidth)child.style.width='100%';
      if(hasExplicitHeight)child.style.height='100%';
      child.style.boxSizing='border-box';
    }
  }
  for(const child of node.children||[])content.appendChild(wrap(child,ctx));
  w.appendChild(content);
  if(!ctx.export&&ctx.selectedId===node.id){w.classList.add('selected');appendResizeHandles(w,node)}
  return w;
}

function boundValue(node,ctx,key,fallback=''){const variable=node?.props?.bindingVariable;if(variable&&ctx.project?.variables){const source=ctx.project.variables[variable];if(source&&Object.prototype.hasOwnProperty.call(source,'value'))return String(source.value)}return String(node?.props?.[key]??fallback)}

function assetSrc(node,kind,ctx){
  const asset=findAsset(ctx.project,node?.props?.assetId);
  if(asset){
    if(ctx.export&&ctx.assetMap?.get(asset.id))return ctx.assetMap.get(asset.id);
    const raw=asset.data||asset.url||'';
    return resourceUrl(raw,kind,ctx)||resourceUrl(asset.url,kind,ctx)||'';
  }
  const raw=node?.props?.src||node?.props?.url||'';
  return resourceUrl(raw,kind,ctx)||'';
}

function pageHref(page,ctx){if(!page)return '#';if(ctx.export&&ctx.pageMap)return ctx.pageMap.get(page.id)||'#';return pageAnchor(page.id)}
function resolveHref(url,ctx){const target=resolvePageTarget(url,ctx.project);return target?pageHref(target,ctx):safeUrl(url||'#')}

function renderContent(root,node,ctx){const p=node.props||{};switch(node.type){
case'heading':root.appendChild(textNode(boundValue(node,ctx,'text','عنوان'),'h2'));break;
case'text':root.appendChild(textNode(boundValue(node,ctx,'text','نص')));break;
case'button':{const a=el('a','built-button');a.textContent=boundValue(node,ctx,'text','زر');a.href=resolveHref(p.url,ctx);a.dataset.action=p.action||'url';const target=resolvePageTarget(p.url,ctx.project);if(target)a.dataset.pageTarget=target.id;if(p.newTab)a.target='_blank';root.appendChild(a);break}
case'link':{const a=el('a');a.textContent=boundValue(node,ctx,'text','رابط');a.href=resolveHref(p.url,ctx);const target=resolvePageTarget(p.url,ctx.project);if(target)a.dataset.pageTarget=target.id;root.appendChild(a);break}
case'image':{
  const img=el('img');const raw=p.bindingVariable?boundValue(node,ctx,'src',p.src):p.src;
  img.src=assetSrc(node,'image',ctx)||resourceUrl(raw,'image',ctx)||placeholder();
  img.alt=p.alt||'';img.loading='lazy';img.decoding='async';
  const size={...(node.style||{}),...(node.responsive?.[ctx.device]||{})};const hasHeight=size.height!==undefined&&size.height!==null&&size.height!=='';
  img.style.width='100%';img.style.maxWidth='100%';img.style.minWidth='0';img.style.height=hasHeight?'100%':'auto';
  img.style.objectFit=String(size.objectFit||p.objectFit||(hasHeight?'cover':'contain'));
  img.style.objectPosition=String(size.objectPosition||p.objectPosition||'center');img.style.aspectRatio=String(p.aspectRatio||'auto');
  img.style.objectPosition=String(size.objectPosition||p.objectPosition||'center');
  img.style.display='block';root.appendChild(img);break;
}
case'gallery':{
  const gallery=el('div','built-gallery');const supplied=Array.isArray(p.images)?p.images:Array.isArray(p.items)?p.items:[];const count=Math.max(1,Math.min(12,Number(p.count)||supplied.length||6));
  for(let i=0;i<count;i++){const entry=supplied[i];const src=typeof entry==='string'?entry:(entry?.src||entry?.image||'');const img=el('img');img.src=resourceUrl(src,'image',ctx)||placeholder(`صورة ${i+1}`);img.alt=(typeof entry==='object'&&entry?.alt)||`صورة ${i+1}`;img.loading='lazy';img.decoding='async';img.style.width='100%';img.style.height='100%';img.style.objectFit='cover';gallery.appendChild(img)}root.appendChild(gallery);break;
}
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
case'tabs':{const g=el('div','built-tabs');const items=p.items||[];const bar=el('div','built-tab-buttons');items.forEach((item,i)=>{const b=el('button');b.type='button';b.dataset.tabIndex=String(i);b.textContent=item;if(i===0)b.classList.add('active');bar.appendChild(b)});const panels=el('div','built-tab-panels');items.forEach((item,i)=>{const panel=textNode(p.panelContents?.[i]||`محتوى ${item}`);panel.className='tab-panel';panel.dataset.tabPanel=String(i);panel.hidden=i!==0;panels.appendChild(panel)});g.append(bar,panels);root.appendChild(g);break}
case'accordion':{const g=el('div','built-accordion');(p.items||[]).forEach(q=>{const d=el('details');d.append(textNode(q,'summary'),textNode('أضف الإجابة من التخصيص.'));g.appendChild(d)});root.appendChild(g);break}
case'dropdown':{const s=el('select');(p.items||[]).forEach(x=>s.appendChild(textNode(x,'option')));root.appendChild(s);break}
case'input':case'search':case'file':{const label=textNode(p.label||'حقل','label'),input=el('input');input.type=node.type==='search'?'search':node.type==='file'?'file':(p.type||'text');input.placeholder=p.placeholder||'';root.append(label,input);break}
case'textarea':{root.append(textNode(p.label||'رسالة','label'),Object.assign(el('textarea'),{placeholder:p.placeholder||''}));break}
case'select':{root.append(textNode(p.label||'اختيار','label'));const s=el('select');(p.items||[]).forEach(x=>s.appendChild(textNode(x,'option')));root.appendChild(s);break}
case'checkbox':case'radio':{const label=el('label');const input=el('input');input.type=node.type;label.append(input,textNode(p.label||'اختيار'));root.appendChild(label);break}
case'form':{const f=el('form','built-form');f.noValidate=true;f.addEventListener('submit',e=>e.preventDefault());f.appendChild(textNode(p.submitLabel||'النموذج','strong'));root.appendChild(f);break;}
case'video':{const src=assetSrc(node,'video',ctx)||safeMediaUrl(p.url,'video');if(/^data:video\//i.test(src)||findAsset(ctx.project,p.assetId)?.kind==='video'){const video=el('video');video.controls=true;video.playsInline=true;video.preload='metadata';video.src=src;video.title=p.title||'فيديو';if(p.poster)video.poster=resourceUrl(p.poster,'image',ctx)||p.poster;root.appendChild(video)}else{const iframe=el('iframe');iframe.src=src;iframe.title=p.title||'فيديو';iframe.loading='lazy';root.appendChild(iframe)}break}
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
case'avatar':{const img=el('img','built-avatar');img.src=resourceUrl(p.src,'image',ctx)||placeholder(p.name||'ش');img.alt=p.name||'';img.style.width='100%';img.style.maxWidth='100%';img.style.height='100%';img.style.objectFit=String(p.objectFit||'cover');img.style.display='block';root.appendChild(img);root.appendChild(textNode(p.name||'اسم','strong'));break}
case'logo':{const d=el('div','built-logo');if(p.src){const img=el('img');img.src=resourceUrl(p.src,'image',ctx);img.alt=p.text||'';img.style.width='100%';img.style.maxWidth='100%';img.style.height='100%';img.style.objectFit=String(p.objectFit||'contain');img.style.display='block';d.appendChild(img)}else d.append(textNode(p.text||ctx.project.site?.brand?.name||'العلامة','strong'));root.appendChild(d);break}
case'breadcrumbs':{const nav=el('nav','built-breadcrumbs');(p.items||ctx.project.pages.map(pg=>pg.name)).forEach((label,i,arr)=>{const span=textNode(label,'span');if(i<arr.length-1)span.append(' › ');nav.appendChild(span)});root.appendChild(nav);break}
case'chip-list':{const d=el('div','built-chips');(p.items||['ميزة','جديد','شائع']).forEach(x=>d.appendChild(textNode(x,'span')));root.appendChild(d);break}
case'feature-list':{const d=el('div','built-feature-list');(p.items||[['ميزة','وصف مختصر'],['ميزة ثانية','وصف مختصر']]).forEach(([title,desc])=>{const item=el('div');item.append(textNode('✓','strong'),textNode(title,'h3'),textNode(desc));d.appendChild(item)});root.appendChild(d);break}
case'team':{const d=el('div','built-team');(p.items||[['أحمد','مدير'],['سارة','مصممة'],['علي','مطور']]).forEach(([name,role])=>{const item=el('div');item.appendChild(textNode(name,'strong'));item.appendChild(textNode(role));d.appendChild(item)});root.appendChild(d);break}

case'stepper':{const d=el('ol','built-stepper');(p.items||[['01','ابدأ'],['02','صمّم'],['03','أطلق']]).forEach(([n,label])=>{const item=el('li');item.append(textNode(n,'strong'),textNode(label));d.appendChild(item)});root.appendChild(d);break}
case'code':{const pre=el('pre');pre.textContent=p.code||'// اكتب الكود هنا';root.appendChild(pre);break}
case'embed':{const iframe=el('iframe');iframe.src=safeUrl(p.url||'');iframe.title=p.title||'مضمن';iframe.loading='lazy';root.appendChild(iframe);break}
case'collection-list':{const d=el('div','built-collection-list');const items=getCollectionItems(ctx.project,p.collectionId).slice(0,Math.max(1,Math.min(50,Number(p.limit)||6)));items.forEach(item=>{const card=el('article','cms-card');const title=item.data?.title||item.slug||'عنصر';card.appendChild(textNode(title,'h3'));if(item.data?.image){const img=el('img');img.src=resourceUrl(item.data.image,'image',ctx)||placeholder(title);img.alt=title;img.loading='lazy';img.style.maxWidth='100%';card.appendChild(img)}if(item.data?.body)card.appendChild(textNode(item.data.body));d.appendChild(card)});if(!items.length)d.appendChild(textNode('لا توجد عناصر محتوى بعد.'));root.appendChild(d);break}
case'schedule':{const d=el('div','built-schedule');(p.items||[['09:00','موعد']]).forEach(([time,title])=>{const item=el('div');item.append(textNode(time,'strong'),textNode(title));d.appendChild(item)});root.appendChild(d);break}
case'icon-text':{const d=el('div','built-icon-text');d.append(textNode(p.icon||'✦','strong'),textNode(p.title||'ميزة','h3'),textNode(p.text||''));root.appendChild(d);break}
case'image-text':{const d=el('div','built-image-text');const img=el('img');img.src=resourceUrl(p.image,'image',ctx)||placeholder();img.alt=p.title||'';img.loading='lazy';img.style.width='100%';img.style.maxWidth='100%';img.style.objectFit=String(p.objectFit||'cover');const copy=el('div');copy.append(textNode(p.title||'عنوان','h3'),textNode(p.text||''));d.append(img,copy);root.appendChild(d);break}
case'hero-split':{const d=el('section','built-hero-split');const copy=el('div','built-hero-copy');copy.append(textNode(p.eyebrow||'اكتشف ما يمكنك بناؤه','small'),textNode(p.title||'حوّل فكرتك إلى تجربة واضحة','h1'),textNode(p.text||'قسم افتتاحي بصورة ورسالة واضحة ودعوة لإجراء.'));if(p.button){const a=el('a','built-button');a.href=resolveHref(p.url||'#',ctx);a.textContent=p.button;if(p.newTab){a.target='_blank';a.rel='noopener noreferrer'}copy.appendChild(a)}const media=el('div','built-hero-media');const img=el('img');img.src=resourceUrl(p.image,'image',ctx)||placeholder(p.title||'صورة');img.alt=p.imageAlt||p.title||'';img.loading='lazy';img.decoding='async';img.style.width='100%';img.style.height='100%';img.style.objectFit=String(p.objectFit||'cover');media.appendChild(img);d.append(copy,media);root.appendChild(d);break}
case'blog-grid':{const d=el('div','built-blog-grid');for(const item of (p.items||[])){const card=el('article','built-content-card');const image=el('img');image.src=resourceUrl(item.image||item.src,'image',ctx)||placeholder(item.title||'مقال');image.alt=item.title||'';image.loading='lazy';image.decoding='async';card.appendChild(image);const body=el('div','built-content-card-body');if(item.category)body.appendChild(textNode(item.category,'small'));body.appendChild(textNode(item.title||'عنوان المقال','h3'));body.appendChild(textNode(item.excerpt||item.text||'نبذة مختصرة تساعد الزائر على معرفة المحتوى.'));const a=el('a','built-inline-link');a.href=resolveHref(item.url||'#',ctx);a.textContent=item.cta||'اقرأ المقال';body.appendChild(a);card.appendChild(body);d.appendChild(card)}root.appendChild(d);break}
case'product-grid':{const d=el('div','built-product-grid');(p.items||[]).forEach((item,index)=>{const card=el('article','built-product-listing');const image=el('img');image.src=resourceUrl(item.image||item.src,'image',ctx)||placeholder(item.name||'منتج');image.alt=item.name||'';image.loading='lazy';image.decoding='async';card.appendChild(image);if(item.badge)card.appendChild(textNode(item.badge,'small'));card.appendChild(textNode(item.name||`منتج ${index+1}`,'h3'));card.appendChild(textNode(item.description||''));const price=textNode(item.price||'اطلب السعر','strong');price.className='built-product-price';card.appendChild(price);const row=el('div','built-product-actions');const link=el('a','built-button');link.href=resolveHref(item.url||'#',ctx);link.textContent=item.cta||'التفاصيل';row.appendChild(link);const add=el('button','built-cart-add');add.type='button';add.dataset.cartAdd=String(item.id||index);add.dataset.cartName=String(item.name||`منتج ${index+1}`);add.textContent=p.cartLabel||'أضف للسلة';row.appendChild(add);card.appendChild(row);d.appendChild(card)});root.appendChild(d);break}
case'portfolio-grid':case'filterable-gallery':{const d=el('section','built-portfolio');const items=Array.isArray(p.items)?p.items:[];const cats=['الكل',...new Set(items.map(item=>String(item.category||'أخرى')).filter(Boolean))];const filters=el('div','built-portfolio-filters');cats.forEach((cat,i)=>{const button=el('button');button.type='button';button.dataset.portfolioFilter=cat;button.setAttribute('aria-pressed',i===0?'true':'false');button.textContent=cat;filters.appendChild(button)});const grid=el('div','built-portfolio-grid');items.forEach((item,index)=>{const card=el('a','built-portfolio-item');card.href=resolveHref(item.url||'#',ctx);card.dataset.portfolioCategory=String(item.category||'أخرى');card.setAttribute('aria-label',item.title||`عمل ${index+1}`);const image=el('img');image.src=resourceUrl(item.image||item.src,'image',ctx)||placeholder(item.title||'عمل');image.alt=item.title||'';image.loading='lazy';image.decoding='async';card.append(image);const label=el('span');label.append(textNode(item.title||`عمل ${index+1}`,'strong'),textNode(item.category||'أعمال'));card.appendChild(label);grid.appendChild(card)});d.append(filters,grid);root.appendChild(d);break}
case'testimonial-carousel':{const d=el('section','built-testimonial-carousel');const items=Array.isArray(p.items)&&p.items.length?p.items:[{quote:'تجربة ممتازة وواضحة.',name:'عميل',role:'مستخدم'}];d.dataset.carouselCount=String(items.length);const cards=el('div','built-testimonial-slides');items.forEach((item,index)=>{const card=el('blockquote','built-testimonial-slide');card.dataset.carouselSlide=String(index);card.hidden=index!==0;card.append(textNode(`“${item.quote||item.text||''}”`,'p'),textNode(item.name||'عميل','strong'));if(item.role)card.appendChild(textNode(item.role,'small'));cards.appendChild(card)});const controls=el('div','built-carousel-controls');const prev=el('button');prev.type='button';prev.dataset.carouselMove='-1';prev.setAttribute('aria-label','الشهادة السابقة');prev.textContent='→';const status=textNode(`1 / ${items.length}`,'span');status.dataset.carouselStatus='';const next=el('button');next.type='button';next.dataset.carouselMove='1';next.setAttribute('aria-label','الشهادة التالية');next.textContent='←';controls.append(prev,status,next);d.append(cards,controls);root.appendChild(d);break}
case'contact-form':{const d=el('section','built-contact-form');d.append(textNode(p.title||'تواصل معنا','h2'));if(p.text)d.appendChild(textNode(p.text));const form=el('form');form.dataset.localContactForm='1';const name=el('input');name.name='name';name.placeholder=p.namePlaceholder||'الاسم';name.autocomplete='name';name.required=true;name.setAttribute('aria-label','الاسم');const email=el('input');email.name='email';email.type='email';email.placeholder=p.emailPlaceholder||'البريد الإلكتروني';email.autocomplete='email';email.required=true;email.setAttribute('aria-label','البريد الإلكتروني');const message=el('textarea');message.name='message';message.placeholder=p.messagePlaceholder||'كيف يمكننا مساعدتك؟';message.required=true;message.setAttribute('aria-label','الرسالة');const submit=el('button','built-button');submit.type='submit';submit.textContent=p.button||'إرسال';const status=el('p','built-form-status');status.setAttribute('role','status');status.dataset.formStatus='1';status.setAttribute('aria-live','polite');form.append(name,email,message,submit,status);d.appendChild(form);root.appendChild(d);break}
case'process-steps':{const d=el('ol','built-process-steps');(p.items||[]).forEach((item,index)=>{const step=el('li');step.appendChild(textNode(String(index+1).padStart(2,'0'),'strong'));step.appendChild(textNode(item.title||item.name||`الخطوة ${index+1}`,'h3'));step.appendChild(textNode(item.description||item.text||''));d.appendChild(step)});root.appendChild(d);break}
case'trust-bar':{const d=el('section','built-trust-bar');if(p.title)d.appendChild(textNode(p.title,'p'));const logos=el('div','built-trust-logos');(p.items||[]).forEach(item=>{const value=typeof item==='string'?item:(item.name||item.label||item.value||'');logos.appendChild(textNode(value,'strong'))});d.appendChild(logos);if(p.rating)d.appendChild(textNode(`★ ${p.rating} / 5`,'span'));root.appendChild(d);break}
case'faq-list':{const d=el('section','built-faq-list');if(p.title)d.appendChild(textNode(p.title,'h2'));(p.items||[]).forEach(item=>{const details=el('details');const summary=textNode(item.question||item.title||'سؤال','summary');details.appendChild(summary);details.appendChild(textNode(item.answer||item.text||''));d.appendChild(details)});root.appendChild(d);break}
case'team-grid':{const d=el('section','built-team-grid');if(p.title)d.appendChild(textNode(p.title,'h2'));const grid=el('div','built-team-items');(p.items||[]).forEach(item=>{const card=el('article','built-team-card');if(item.image){const img=el('img');img.src=resourceUrl(item.image,'image',ctx)||placeholder(item.name||'عضو');img.alt=item.name||'';img.loading='lazy';img.decoding='async';card.appendChild(img)}card.append(textNode(item.name||'عضو الفريق','h3'),textNode(item.role||'','small'),textNode(item.bio||item.description||''));if(item.url&&item.url!=='#'){const a=el('a','built-button');a.href=resolveHref(item.url,ctx);a.textContent='الملف الشخصي';card.appendChild(a)}grid.appendChild(card)});d.appendChild(grid);root.appendChild(d);break}
case'service-grid':{const d=el('section','built-service-grid');if(p.title)d.appendChild(textNode(p.title,'h2'));const grid=el('div','built-service-items');(p.items||[]).forEach(item=>{const card=el('article','built-service-card');card.append(textNode(item.icon||'✦','span'),textNode(item.title||'خدمة','h3'),textNode(item.description||item.text||''));if(item.url){const a=el('a');a.href=resolveHref(item.url,ctx);a.textContent=item.button||'اعرف المزيد';card.appendChild(a)}grid.appendChild(card)});d.appendChild(grid);root.appendChild(d);break}
case'feature-bento':{const d=el('section','built-feature-bento');if(p.title)d.appendChild(textNode(p.title,'h2'));const grid=el('div','built-bento-items');(p.items||[]).forEach((item,index)=>{const card=el('article','built-bento-card');card.dataset.bentoIndex=String(index);if(item.image){const img=el('img');img.src=resourceUrl(item.image,'image',ctx)||placeholder(item.title||'ميزة');img.alt=item.title||'';img.loading='lazy';img.decoding='async';card.appendChild(img)}card.append(textNode(item.title||'ميزة','h3'),textNode(item.description||item.text||''));if(item.url){const a=el('a');a.href=resolveHref(item.url,ctx);a.textContent='استكشف';card.appendChild(a)}grid.appendChild(card)});d.appendChild(grid);root.appendChild(d);break}
case'logo-cloud':{const d=el('section','built-logo-cloud');if(p.title)d.appendChild(textNode(p.title,'h2'));const grid=el('div','built-logo-cloud-items');(p.items||[]).forEach(item=>{const obj=typeof item==='string'?{name:item}:item||{},a=el(obj.url?'a':'span','built-logo-cloud-item');if(obj.url)a.href=resolveHref(obj.url,ctx);if(obj.image){const img=el('img');img.src=resourceUrl(obj.image,'image',ctx)||placeholder(obj.name||'شعار');img.alt=obj.name||'';img.loading='lazy';a.appendChild(img)}else a.appendChild(textNode(obj.name||obj.label||'شريك','strong'));grid.appendChild(a)});d.appendChild(grid);root.appendChild(d);break}
case'event-list':{const d=el('section','built-event-list');if(p.title)d.appendChild(textNode(p.title,'h2'));(p.items||[]).forEach(item=>{const card=el('article','built-event-card');const date=textNode(item.date||'التاريخ يحدد لاحقًا','strong');date.className='built-event-date';const content=el('div');content.append(textNode(item.title||'فعالية','h3'),textNode(item.description||''),textNode(item.location||''));card.append(date,content);if(item.url){const a=el('a','built-button');a.href=resolveHref(item.url,ctx);a.textContent=item.button||'تفاصيل الفعالية';card.appendChild(a)}d.appendChild(card)});root.appendChild(d);break}
case'review-grid':{const d=el('section','built-review-grid');if(p.title)d.appendChild(textNode(p.title,'h2'));const grid=el('div','built-review-items');(p.items||[]).forEach(item=>{const card=el('blockquote','built-review-card');card.appendChild(textNode('★'.repeat(Math.min(5,Math.max(1,Number(item.rating)||5))),'div'));card.append(textNode(item.quote||item.text||'','p'),textNode(item.name||'عميل','strong'));if(item.company)card.appendChild(textNode(item.company,'small'));grid.appendChild(card)});d.appendChild(grid);root.appendChild(d);break}
case'job-board':{const d=el('section','built-job-board');if(p.title)d.appendChild(textNode(p.title,'h2'));(p.items||[]).forEach(item=>{const card=el('article','built-job-card');const body=el('div');body.append(textNode(item.title||'فرصة عمل','h3'),textNode([item.location,item.type].filter(Boolean).join(' • '),'small'),textNode(item.description||''));card.appendChild(body);const a=el('a','built-button');a.href=resolveHref(item.url||'#',ctx);a.textContent=item.button||'التقديم';card.appendChild(a);d.appendChild(card)});root.appendChild(d);break}
case'feature-grid':{const d=el('div','built-feature-grid');(p.items||[]).forEach(([title,desc])=>{const card=el('article');card.append(textNode(title,'h3'),textNode(desc));d.appendChild(card)});root.appendChild(d);break}
case'contact-card':{const d=el('address','built-contact-card');d.append(textNode(p.title||'تواصل معنا','h3'),textNode(p.email||''),textNode(p.phone||''),textNode(p.address||''));root.appendChild(d);break}
case'stat-card':{const d=el('div','built-stat-card');d.append(textNode(p.value||'0','strong'),textNode(p.label||''),textNode(p.trend||''));root.appendChild(d);break}
case'pricing-card':{const d=el('article','built-pricing-card');d.append(textNode(p.name||'خطة','h3'),textNode(p.price||''),textNode(p.period||''));const ul=el('ul');(p.features||[]).forEach(x=>ul.appendChild(textNode(x,'li')));d.appendChild(ul);const b=el('a','built-button');b.href=resolveHref(p.url,ctx);b.textContent=p.button||'ابدأ';d.appendChild(b);root.appendChild(d);break}
case'testimonial-card':{const d=el('blockquote','built-testimonial-card');d.append(textNode(`“${p.quote||''}”`),textNode(`${p.name||'عميل'}${p.role?' — '+p.role:''}`,'cite'));root.appendChild(d);break}
case'logo-row':{const d=el('div','built-logo-row');(p.items||[]).forEach(x=>d.appendChild(textNode(x,'strong')));root.appendChild(d);break}
case'social-links':{const d=el('div','built-social-links');(p.items||[]).forEach(([name,url])=>{const a=el('a');a.href=safeUrl(url||'#');a.textContent=name;d.appendChild(a)});root.appendChild(d);break}
case'download':{const a=el('a','built-button');a.href=assetSrc(node,'document',ctx)||safeUrl(p.url||'#');a.download=p.filename||findAsset(ctx.project,p.assetId)?.filename||'';a.textContent=p.text||'تحميل';root.appendChild(a);break}
case'map':{const d=el('div','built-map');d.append(textNode(p.title||'الموقع','h3'),textNode(p.address||'حدد الموقع من الخصائص.'),textNode(`${p.lat||''}, ${p.lng||''}`));root.appendChild(d);break}
case'back-to-top':{const b=el('button','built-button');b.type='button';b.dataset.backToTop='1';b.textContent=p.text||'↑ أعلى الصفحة';root.appendChild(b);break}
case'language-switcher':{const s=el('select','built-language-switcher');(p.languages||['AR','EN']).forEach(x=>s.appendChild(textNode(x,'option')));root.appendChild(s);break}
case'divider-label':{const d=el('div','built-divider-label');d.append(el('span'),textNode(p.text||'أو'),el('span'));root.appendChild(d);break}
case'notice-bar':{const d=el('div','built-notice-bar');d.appendChild(textNode(p.text||''));if(p.button){const a=el('a');a.href=resolveHref(p.url,ctx);a.textContent=p.button;d.appendChild(a)}root.appendChild(d);break}
case'video-card':{const d=el('article','built-video-card');d.append(textNode('▶','strong'),textNode(p.title||'فيديو','h3'),textNode(p.duration||''));root.appendChild(d);break}
case'compare':case'feature-comparison':{const table=el('table','comparison-table');(p.items||p.rows||[]).forEach((row,ri)=>{const tr=el('tr');row.forEach(cell=>tr.appendChild(textNode(cell,ri===0?'th':'td')));table.appendChild(tr)});root.appendChild(table);break}
case'callout':{const d=el('aside','built-callout');d.append(textNode(p.title||'ملاحظة','strong'),textNode(p.text||''));root.appendChild(d);break}
case'spinner':{const d=el('span','built-spinner');d.setAttribute('aria-label','تحميل');root.appendChild(d);break}
case'countdown':{root.appendChild(textNode(`${p.days||0} يوم • ${p.hours||0} ساعة • ${p.minutes||0} دقيقة`,'div'));break}
case'cookie-banner':{const d=el('div','built-cookie');d.append(textNode(p.text||''));const b=el('button');b.type='button';b.dataset.cookieDismiss='1';b.textContent=p.accept||'موافق';d.appendChild(b);root.appendChild(d);break}
case'newsletter':case'lead-form':{const d=el('section',node.type==='newsletter'?'built-newsletter':'built-lead-form');if(p.title)d.appendChild(textNode(p.title,'h3'));if(p.text)d.appendChild(textNode(p.text));const f=el('form');f.dataset.localContactForm='1';if(node.type==='lead-form'){const name=el('input');name.name='name';name.required=true;name.placeholder=p.namePlaceholder||'الاسم';name.setAttribute('aria-label','الاسم');f.appendChild(name)}const email=el('input');email.name='email';email.type='email';email.required=true;email.placeholder=p.placeholder||p.emailPlaceholder||'البريد الإلكتروني';email.setAttribute('aria-label','البريد الإلكتروني');const b=el('button','built-button');b.type='submit';b.textContent=p.button||(node.type==='newsletter'?'اشتراك':'إرسال الطلب');const status=el('p','built-form-status');status.dataset.formStatus='1';status.setAttribute('role','status');status.setAttribute('aria-live','polite');f.append(email,b,status);d.appendChild(f);root.appendChild(d);break}
case'cta':case'social-proof':case'highlight':case'announcement':case'quote-banner':{const d=el('section',`built-${node.type}`);if(p.title)d.appendChild(textNode(p.title,'h3'));d.appendChild(textNode(p.text||p.label||''));if(p.button){const b=el('a','built-button');b.href=resolveHref(p.url||'#',ctx);b.textContent=p.button;if(p.newTab){b.target='_blank';b.rel='noopener noreferrer'}d.appendChild(b)}root.appendChild(d);break}
case'symbol-instance':{const symbol=resolveSymbol(ctx.project,p.symbolId);if(symbol?.root&&!ctx.symbolDepth){const rendered=wrap(symbol.root,{...ctx,symbolDepth:(ctx.symbolDepth||0)+1});root.appendChild(rendered)}else if(!symbol?.root){root.appendChild(textNode('مكون مشترك غير موجود.'));}break}
default:if(p.text)root.appendChild(textNode(p.text));}}

const placeholder=(label='صورة')=>'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="420"><rect width="800" height="420" fill="#eef0f7"/><rect x="280" y="150" width="240" height="26" rx="13" fill="#5b5ce2" opacity=".25"/><text x="400" y="235" text-anchor="middle" font-family="Arial" font-size="28" fill="#5b5ce2">${label}</text></svg>`);
function renderPage(page,container,ctx){applyThemeVars(container,ctx.theme||{});container.dataset.pageId=page?.id||'';container.replaceChildren(...(page.nodes||[]).map(node=>wrap(node,ctx)));container.classList.toggle('is-empty',!(page.nodes||[]).length);return container}
function nodeHtml(node,theme,project,device='desktop',pageMap=null,assetMap=null,resourceMap=null){return wrap(node,{theme,project,styleLibrary:project?.styleLibrary||{},device,selectedId:null,headingTag:'h2',export:true,pageMap,assetMap,resourceMap}).outerHTML}
exports.renderPage = renderPage;
exports.nodeHtml = nodeHtml;
});
