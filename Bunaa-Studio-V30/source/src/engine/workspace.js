const {renderPage} = __require("src/engine/renderer.js");
const {createRuntime} = __require("src/engine/interaction.js");
const {addNode,insertNodeAtDrop,updateStyle,updateProps,groupNodes,ungroupNode} = __require("src/core/commands.js");
const {clamp} = __require("src/core/utils.js");
const {pageFromAnchor} = __require("src/engine/routing.js");
class WorkspaceEngine{constructor(store,inspector,panels){this.store=store;this.inspector=inspector;this.panels=panels;this.runtimeCleanup=null;this.runtimeKey='';this.wired=false;this.space=false}
mount(){this.pageCanvas=document.getElementById('pageCanvas');this.deviceFrame=document.getElementById('deviceFrame');this.viewport=document.getElementById('canvasViewport');this.stage=document.getElementById('canvasStage');this.host=document.getElementById('canvasStageHost');this.wireCanvas();this.wireControls();this.wireManipulator();this.resizeObserver=globalThis.ResizeObserver?new ResizeObserver(()=>{this.reflowHost();this.centerStage()}):null;this.resizeObserver?.observe(this.viewport)}
wireCanvas(){if(this.wired)return;this.wired=true;this.pageCanvas.addEventListener('click',e=>{if(this.suppressNextClick){this.suppressNextClick=false;e.preventDefault();return}if(!this.store.ui.interactionMode&&e.target.closest('[data-page-embed-content]'))return;const link=e.target.closest('a');const w=e.target.closest('.node-wrap');if(this.store.ui.interactionMode){if(w){const sourceId=w.dataset.nodeId;const ownsClick=this.store.project.interactions?.some(i=>i.sourceId===sourceId&&i.enabled!==false&&i.trigger==='click');if(ownsClick){if(link)e.preventDefault();return}}if(link){const target=link.dataset.pageTarget||pageFromAnchor(link.getAttribute('href'),this.store.project)?.id;if(target){e.preventDefault();this.store.setActivePage(target);this.store.setUI({leftTab:'elements'});return}}return}if(!w)return;e.preventDefault();const id=w.dataset.nodeId;const multi=Boolean(e.shiftKey||e.ctrlKey||e.metaKey);const current=Array.isArray(this.store.ui.selectedIds)&&this.store.ui.selectedIds.length?this.store.ui.selectedIds:[this.store.ui.selected].filter(Boolean);let ids=multi?(current.includes(id)?current.filter(x=>x!==id):[...current,id]):[id];if(!ids.length)ids=[id];const selected=ids.includes(id)?id:(ids[ids.length-1]||null);this.store.setUI({selected,selectedIds:ids,rightOpen:true})});this.pageCanvas.addEventListener('dragover',e=>{if(e.dataTransfer?.types?.includes('Files')||e.dataTransfer?.types?.includes('application/bunaa-type'))e.preventDefault()});this.pageCanvas.addEventListener('drop',async e=>{e.preventDefault();const target=e.target.closest('.node-wrap')?.dataset.nodeId||null;const files=[...(e.dataTransfer?.files||[])];if(files.length){const targetNode=target?this.store.find(target)?.node:null;const multiTypes=new Set(['gallery','image-carousel','media-grid','video-gallery','audio-playlist']);let attachedSingle=false;for(const file of files){try{const asset=await this.assetService?.addFile(file);if(!asset)continue;let attached=false;if(target&&targetNode&&multiTypes.has(targetNode.type)){const current=this.store.find(target)?.node?.props?.assetIds||[];this.assetService?.assignMany(target,[...current,asset.id]);attached=(this.store.find(target)?.node?.props?.assetIds||[]).includes(asset.id)}else if(target&&!attachedSingle){attached=Boolean(this.assetService?.assignToNode(target,asset.id));if(attached)attachedSingle=true}if(!attached)this.panels.insertAsset(asset)}catch(error){console.warn('Dropped asset failed',error);globalThis.__BUNAA_APP?.toast?.(error.message||'تعذر إضافة الملف')}}this.panels.setTab('layers');return}const type=e.dataTransfer.getData('application/bunaa-type');if(type){insertNodeAtDrop(this.store,type,target);this.panels.setTab('layers')}});document.getElementById('dropFooter')?.addEventListener('dragover',e=>{if(e.dataTransfer?.types?.includes('Files'))e.preventDefault()});document.getElementById('dropFooter')?.addEventListener('drop',async e=>{e.preventDefault();const files=[...(e.dataTransfer?.files||[])];if(files.length){for(const file of files){try{const asset=await this.assetService?.addFile(file);if(asset)this.panels.insertAsset(asset)}catch(error){console.warn(error);globalThis.__BUNAA_APP?.toast?.(error.message||'تعذر إضافة الملف')}}return}const type=e.dataTransfer.getData('application/bunaa-type');if(type)this.addElement(type)})}
wireControls(){document.getElementById('zoomIn')?.addEventListener('click',()=>this.setZoom(this.store.ui.zoom+.1));document.getElementById('zoomOut')?.addEventListener('click',()=>this.setZoom(this.store.ui.zoom-.1));document.getElementById('zoomFit')?.addEventListener('click',()=>this.fit());document.getElementById('gridBtn')?.addEventListener('click',()=>this.store.setUI({grid:!this.store.ui.grid}));document.getElementById('structureBtn')?.addEventListener('click',()=>this.panels.setTab('layers'));document.getElementById('focusBtn')?.addEventListener('click',()=>this.store.setUI({focus:!this.store.ui.focus}));this.setupPan()}
setupPan(){let pan=null;const stop=()=>{pan=null;this.viewport.style.cursor=''};this.viewport.addEventListener('pointerdown',e=>{const allow=e.button===1||(e.button===0&&this.space)||(e.button===0&&(e.ctrlKey||e.metaKey));if(!allow||!e.target.closest('#canvasStage'))return;pan={x:e.clientX,y:e.clientY,sx:this.viewport.scrollLeft,sy:this.viewport.scrollTop};try{this.viewport.setPointerCapture(e.pointerId)}catch{}this.viewport.style.cursor='grabbing'});this.viewport.addEventListener('pointermove',e=>{if(!pan)return;this.viewport.scrollLeft=pan.sx-(e.clientX-pan.x);this.viewport.scrollTop=pan.sy-(e.clientY-pan.y)});this.viewport.addEventListener('pointerup',stop);this.viewport.addEventListener('pointercancel',stop);window.addEventListener('keydown',e=>{if(e.code==='Space'&&!e.repeat&&!e.target.matches('input,textarea,select'))this.space=true});window.addEventListener('keyup',e=>{if(e.code==='Space')this.space=false});window.addEventListener('blur',()=>{this.space=false;stop()});this.viewport.addEventListener('wheel',e=>{if(!(e.ctrlKey||e.metaKey))return;e.preventDefault();this.setZoom(this.store.ui.zoom+(e.deltaY<0?.08:-.08))},{passive:false});window.addEventListener('keydown',e=>{if(e.target?.matches?.('input,textarea,select'))return;if(e.key==='PageDown')this.viewport.scrollBy({top:Math.max(240,this.viewport.clientHeight*.8),behavior:'smooth'});else if(e.key==='PageUp')this.viewport.scrollBy({top:-Math.max(240,this.viewport.clientHeight*.8),behavior:'smooth'});else if(e.key==='Home'&&this.store.ui.focus)this.viewport.scrollTo({top:0,behavior:'smooth'});else if(e.key==='End'&&this.store.ui.focus)this.viewport.scrollTo({top:this.viewport.scrollHeight,behavior:'smooth'});})}
setZoom(z){this.store.setUI({zoom:clamp(Number(z)||1,.2,1.5)})}
setDevice(device){if(!['desktop','tablet','mobile'].includes(device))return;this.store.setUI({device,zoom:1});this.inspector?.setDevice?.(device);requestAnimationFrame(()=>this.fit())}
deviceWidth(){return this.store.project.devices[this.store.ui.device]?.width||1180}
fit(){const base=this.deviceWidth(),available=Math.max(260,this.viewport.clientWidth-96);this.setZoom(clamp(available/base,.2,1.2));requestAnimationFrame(()=>{this.centerStage();this.viewport.scrollTop=0})}
centerStage(){if(!this.viewport)return;const overflow=this.viewport.scrollWidth>this.viewport.clientWidth+2;if(!overflow)this.viewport.scrollLeft=0}
addElement(type){addNode(this.store,type);this.panels.setTab('layers')}
syncRuntime(){if(!this.store.ui.interactionMode){this.runtimeCleanup?.();this.runtimeCleanup=null;this.runtimeKey='';return}const key=JSON.stringify([this.store.project.activePageId,this.store.project.interactions,this.store.ui.device]);if(key===this.runtimeKey&&this.runtimeCleanup)return;this.runtimeCleanup?.();this.runtimeCleanup=createRuntime({document,project:this.store.project,navigate:id=>{if(this.store.project.pages.some(p=>p.id===id))this.store.setActivePage(id)}});this.runtimeKey=key}

wireManipulator(){
 if(this.manipulatorWired)return;this.manipulatorWired=true;
 const css=document.createElement('style');css.id='bunaa-direct-manipulation-css';css.textContent=`
 #bunaa-manip-overlay{position:absolute;box-sizing:border-box;z-index:80;pointer-events:none;border:1.5px solid #5b5ce2;border-radius:2px;min-width:1px;min-height:1px}
 #bunaa-manip-overlay[hidden]{display:none!important}
 #bunaa-manip-overlay .bm-handle{position:absolute;box-sizing:border-box;width:10px;height:10px;padding:0;background:#fff;border:2px solid #5b5ce2;border-radius:3px;transform:translate(-50%,-50%);pointer-events:auto;touch-action:none;z-index:3}
 #bunaa-manip-overlay .bm-handle[data-resize="n"],#bunaa-manip-overlay .bm-handle[data-resize="s"]{cursor:ns-resize}
 #bunaa-manip-overlay .bm-handle[data-resize="e"],#bunaa-manip-overlay .bm-handle[data-resize="w"]{cursor:ew-resize}
 #bunaa-manip-overlay .bm-handle[data-resize="ne"],#bunaa-manip-overlay .bm-handle[data-resize="sw"]{cursor:nesw-resize}
 #bunaa-manip-overlay .bm-handle[data-resize="nw"],#bunaa-manip-overlay .bm-handle[data-resize="se"]{cursor:nwse-resize}
 #bunaa-manip-overlay .bm-n{left:50%;top:0}#bunaa-manip-overlay .bm-ne{left:100%;top:0}#bunaa-manip-overlay .bm-e{left:100%;top:50%}#bunaa-manip-overlay .bm-se{left:100%;top:100%}#bunaa-manip-overlay .bm-s{left:50%;top:100%}#bunaa-manip-overlay .bm-sw{left:0;top:100%}#bunaa-manip-overlay .bm-w{left:0;top:50%}#bunaa-manip-overlay .bm-nw{left:0;top:0}
 .bm-manip-actions{display:flex;align-items:center;gap:5px;flex-wrap:wrap;min-width:0}
 .bm-manip-actions button,.bm-manip-actions select{font:inherit;font-size:10px;line-height:1.3;min-height:25px;border:1px solid #dfe2ee;border-radius:7px;background:#fff;color:#34384a;padding:3px 8px}
 .bm-manip-actions button:disabled{opacity:.4;cursor:not-allowed}
 .bm-manip-actions [data-bm-hint]{font-size:9px;color:#7a8194;white-space:normal}
 .bm-manip-actions [data-bm-fit-wrap]{display:none;align-items:center;gap:4px}
 .bm-manip-actions [data-bm-fit-wrap].visible{display:flex}
 .canvas-statusbar{gap:8px;flex-wrap:wrap}
 .node-wrap.multi-selected>.node-content{outline:1px dashed #6d74ed;outline-offset:2px}
 `;document.head.appendChild(css);
 this.manipOverlay=document.createElement('div');this.manipOverlay.id='bunaa-manip-overlay';this.manipOverlay.hidden=true;
 const frame=document.createElement('div');frame.style.cssText='position:absolute;inset:0;pointer-events:none';
 this.manipOverlay.appendChild(frame);
 for(const dir of ['n','ne','e','se','s','sw','w','nw']){const h=document.createElement('button');h.type='button';h.className='bm-handle bm-'+dir;h.dataset.resize=dir;h.setAttribute('aria-label','تغيير الحجم '+dir);h.title='اسحب لتغيير الحجم';this.manipOverlay.appendChild(h)}
 this.viewport.appendChild(this.manipOverlay);
 this.selectionActions=document.createElement('div');this.selectionActions.className='bm-manip-actions';
 this.selectionActions.innerHTML='<button type="button" data-bm-group disabled>تجميع المحدد</button><button type="button" data-bm-ungroup disabled>فك المجموعة</button><span data-bm-fit-wrap>ملاءمة الصورة <select data-bm-fit><option value="cover">قص لملء المساحة</option><option value="contain">إظهار الصورة كاملة</option></select></span><small data-bm-hint>اسحب العنصر لتحريكه، والمقابض لتغيير حجمه.</small>';
 const status=document.querySelector('.canvas-statusbar');if(status)status.insertBefore(this.selectionActions,status.children[1]||null);
 this.selectionActions.querySelector('[data-bm-group]').addEventListener('click',()=>this.groupSelected());
 this.selectionActions.querySelector('[data-bm-ungroup]').addEventListener('click',()=>this.ungroupSelected());
 this.selectionActions.querySelector('[data-bm-fit]').addEventListener('change',e=>{const id=this.store.ui.selected;if(id)updateProps(this.store,id,{fit:e.target.value})});
 this.pageCanvas.addEventListener('pointerdown',e=>this.beginMove(e));
 this.manipOverlay.addEventListener('pointerdown',e=>this.beginResize(e));
 window.addEventListener('pointermove',e=>this.movePointer(e),{passive:false});
 window.addEventListener('pointerup',e=>this.endPointer(e));
 window.addEventListener('pointercancel',e=>this.endPointer(e));
 this.viewport.addEventListener('scroll',()=>this.refreshManipulatorOverlay(),{passive:true});
 window.addEventListener('resize',()=>this.refreshManipulatorOverlay());
 window.addEventListener('keydown',e=>{
  if(!(e.ctrlKey||e.metaKey)||e.altKey||e.target?.matches?.('input,textarea,select,[contenteditable="true"]'))return;
  if(e.key.toLowerCase()==='g'&&!e.shiftKey){if((this.store.ui.selectedIds||[]).length>1){e.preventDefault();this.groupSelected()}}
  else if(e.key.toLowerCase()==='g'&&e.shiftKey){const hit=this.store.ui.selected?this.store.find(this.store.ui.selected):null;if(hit?.node?.type==='group'){e.preventDefault();this.ungroupSelected()}}
 });
}
selectedContent(id){
 const wraps=[...(this.pageCanvas?.querySelectorAll('.node-wrap[data-node-id]')||[])];
 const w=wraps.find(x=>x.dataset.nodeId===id);
 if(!w)return null;
 return {wrap:w,content:[...w.children].find(x=>x.classList?.contains('node-content'))||w.querySelector('.node-content')};
}
styleForDevice(node){
 return this.store.ui.device==='desktop'?(node.style||{}):(node.responsive?.[this.store.ui.device]||{});
}
readTranslate(value){
 const m=String(value||'').match(/(-?\d+(?:\.\d+)?)px\s+(-?\d+(?:\.\d+)?)px/);
 return m?{x:Number(m[1])||0,y:Number(m[2])||0}:{x:0,y:0};
}
beginMove(e){
 if(e.button!==0||this.store.ui.interactionMode||e.shiftKey||e.ctrlKey||e.metaKey)return;
 const w=e.target.closest?.('.node-wrap[data-node-id]');if(!w||e.target.closest?.('input,textarea,select,[contenteditable="true"]'))return;
 const id=w.dataset.nodeId;const hit=this.store.find(id);if(!hit||hit.node.locked)return;
 const target=this.selectedContent(id);if(!target?.content)return;
 const t=this.readTranslate(this.styleForDevice(hit.node).translate);
 this.pointer={mode:'move',id,pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,baseX:t.x,baseY:t.y,x:t.x,y:t.y,zoom:this.store.ui.zoom||1,active:false,content:target.content};
}
beginResize(e){
 const handle=e.target.closest?.('[data-resize]');if(!handle||this.store.ui.interactionMode)return;
 e.preventDefault();e.stopPropagation();
 const id=this.store.ui.selected;const hit=id?this.store.find(id):null;const target=id?this.selectedContent(id):null;
 if(!hit||!target?.content||hit.node.locked)return;
 const style=this.styleForDevice(hit.node);const t=this.readTranslate(style.translate);const rect=target.content.getBoundingClientRect();const zoom=this.store.ui.zoom||1;
 this.pointer={mode:'resize',id,pointerId:e.pointerId,handle:handle.dataset.resize,startX:e.clientX,startY:e.clientY,startW:Math.max(24,rect.width/zoom),startH:Math.max(20,rect.height/zoom),baseX:t.x,baseY:t.y,x:t.x,y:t.y,width:Math.max(24,rect.width/zoom),height:Math.max(20,rect.height/zoom),zoom,active:false,content:target.content,nodeType:hit.node.type,ratio:rect.width/Math.max(1,rect.height)};
}
movePointer(e){
 const p=this.pointer;if(!p||e.pointerId!==p.pointerId)return;
 let dx=(e.clientX-p.startX)/p.zoom,dy=(e.clientY-p.startY)/p.zoom;
 if(!p.active&&Math.hypot(dx,dy)<3)return;
 p.active=true;e.preventDefault();
 if(p.mode==='move'){p.x=p.baseX+dx;p.y=p.baseY+dy;p.content.style.translate=p.x+'px '+p.y+'px'}
 else{
  let w=p.startW,h=p.startH,x=p.baseX,y=p.baseY;const k=p.handle;
  if(k.includes('e'))w=p.startW+dx;if(k.includes('w')){w=p.startW-dx;x=p.baseX+dx}
  if(k.includes('s'))h=p.startH+dy;if(k.includes('n')){h=p.startH-dy;y=p.baseY+dy}
  w=Math.max(24,w);h=Math.max(20,h);
  if(e.shiftKey&&k.length===2){const ratio=p.ratio;if(Math.abs(dx)>=Math.abs(dy)){h=Math.max(20,w/ratio);if(k.includes('n'))y=p.baseY+(p.startH-h)}else{w=Math.max(24,h*ratio);if(k.includes('w'))x=p.baseX+(p.startW-w)}}
  p.width=w;p.height=h;p.x=x;p.y=y;
  p.content.style.width=w+'px';p.content.style.height=h+'px';p.content.style.translate=x+'px '+y+'px';
  if(p.nodeType==='image'){const img=p.content.querySelector('img');if(img){img.style.width='100%';img.style.height='100%';const fit=this.store.find(p.id)?.node?.props?.fit;img.style.objectFit=fit==='contain'?'contain':'cover'}}
 }
 this.suppressNextClick=p.mode==='move';
 this.refreshManipulatorOverlay(p.id);
}
endPointer(e){
 const p=this.pointer;if(!p||e.pointerId!==p.pointerId)return;this.pointer=null;
 if(!p.active){this.refreshManipulatorOverlay();return}
 const patch=p.mode==='move'?{translate:p.x+'px '+p.y+'px'}:{width:Math.round(p.width)+'px',height:Math.round(p.height)+'px',translate:p.x+'px '+p.y+'px'};
 updateStyle(this.store,p.id,patch,this.store.ui.device);
 this.store.setUI({selected:p.id,selectedIds:[p.id],rightOpen:true});
 this.suppressNextClick=p.mode==='move';
 this.refreshManipulatorOverlay(p.id);
}
refreshManipulatorOverlay(overrideId=null){
 if(!this.manipOverlay||!this.viewport)return;
 const id=overrideId||this.store.ui.selected;
 const ids=Array.isArray(this.store.ui.selectedIds)?this.store.ui.selectedIds:[];
 const hit=id?this.store.find(id):null;const target=id?this.selectedContent(id):null;
 for(const w of this.pageCanvas?.querySelectorAll('.node-wrap[data-node-id]')||[])w.classList.toggle('multi-selected',ids.includes(w.dataset.nodeId)&&ids.length>1);
 if(!hit||!target?.content||this.store.ui.interactionMode){this.manipOverlay.hidden=true;if(this.selectionActions)this.selectionActions.style.display='none';return}
 const rect=target.content.getBoundingClientRect(),vr=this.viewport.getBoundingClientRect();
 this.manipOverlay.hidden=false;
 this.manipOverlay.style.left=(rect.left-vr.left+this.viewport.scrollLeft)+'px';
 this.manipOverlay.style.top=(rect.top-vr.top+this.viewport.scrollTop)+'px';
 this.manipOverlay.style.width=Math.max(1,rect.width)+'px';this.manipOverlay.style.height=Math.max(1,rect.height)+'px';
 this.manipOverlay.style.display=rect.width>0&&rect.height>0?'block':'none';
 if(this.selectionActions){
  this.selectionActions.style.display='flex';
  const group=this.selectionActions.querySelector('[data-bm-group]');const ungroup=this.selectionActions.querySelector('[data-bm-ungroup]');
  if(group)group.disabled=ids.length<2;
  if(ungroup)ungroup.disabled=hit.node.type!=='group';
  const fitWrap=this.selectionActions.querySelector('[data-bm-fit-wrap]');
  if(fitWrap)fitWrap.classList.toggle('visible',hit.node.type==='image');
  const fit=this.selectionActions.querySelector('[data-bm-fit]');if(fit)fit.value=hit.node.props?.fit==='contain'?'contain':'cover';
 }
}
groupSelected(){
 const ids=Array.isArray(this.store.ui.selectedIds)?this.store.ui.selectedIds:[];
 if(ids.length<2){globalThis.__BUNAA_APP?.toast?.('حدد عنصرين أو أكثر مع Shift أو Ctrl ثم اضغط تجميع');return}
 const group=groupNodes(this.store,ids);if(!group){globalThis.__BUNAA_APP?.toast?.('اختر عناصر شقيقة داخل الصفحة نفسها لتجميعها');return}
 this.panels.setTab('layers');this.store.setUI({selected:group.id,selectedIds:[group.id],rightOpen:true});
}
ungroupSelected(){
 const id=this.store.ui.selected;if(!id)return;
 if(!ungroupNode(this.store,id)){globalThis.__BUNAA_APP?.toast?.('اختر مجموعة لفك تجميعها');return}
 this.panels.setTab('layers');
}

render(){const page=this.store.activePage();if(!page)return;renderPage(page,this.pageCanvas,{project:this.store.project,theme:this.store.project.theme,styleLibrary:this.store.project.styleLibrary,device:this.store.ui.device,selectedId:this.store.ui.interactionMode?null:this.store.ui.selected,pageId:page.id,embeddingPages:[page.id]});this.deviceFrame.className=`site-frame ${this.store.ui.device}`;this.pageCanvas.classList.toggle('show-grid',this.store.ui.grid);document.getElementById('canvasPageTitle').textContent=page.name;document.getElementById('canvasModeLabel').textContent=this.store.ui.interactionMode?'وضع تجربة التفاعل':'وضع البناء';const hit=this.store.ui.selected?this.store.find(this.store.ui.selected):null;document.getElementById('selectionInfo').textContent=hit?`العنصر: ${hit.node.props?.label||hit.node.props?.title||hit.node.type}`:'لم يتم تحديد عنصر';document.getElementById('pageCountLabel').textContent=`${this.store.project.pages.length} صفحة`;document.getElementById('elementCountLabel').textContent=`${this.store.nodeCount()} عنصر`;document.getElementById('dropEmpty').classList.toggle('hidden',page.nodes.length>0);document.getElementById('gridBtn').classList.toggle('active',this.store.ui.grid);this.applyZoom();this.refreshManipulatorOverlay();this.syncRuntime()}
reflowHost(){const z=this.store.ui.zoom,base=this.deviceWidth(),viewportWidth=this.viewport?.clientWidth||0,padding=48;const required=Math.ceil(base*z+padding);this.host.style.setProperty('width',`${Math.max(viewportWidth,required)}px`,'important');this.host.style.setProperty('height',`${Math.ceil(Math.max(this.stage.offsetHeight*z,760*z)+70)}px`,'important')}
applyZoom(){const z=this.store.ui.zoom,base=this.deviceWidth();this.stage.style.width=`${base}px`;this.stage.style.maxWidth='none';this.stage.style.transform=`scale(${z})`;this.stage.style.transformOrigin='top center';this.reflowHost();document.getElementById('zoomLabel').textContent=`${Math.round(z*100)}%`;}
sync(){this.render();document.body.classList.toggle('focus-canvas',this.store.ui.focus);this.refreshPages()}
refreshPages(){const select=document.getElementById('pageSelect');if(!select)return;select.replaceChildren(...this.store.project.pages.map(p=>{const o=document.createElement('option');o.value=p.id;o.textContent=p.name;return o}));select.value=this.store.project.activePageId}
cleanup(){this.runtimeCleanup?.();this.runtimeCleanup=null;this.resizeObserver?.disconnect?.()}
}
exports.WorkspaceEngine = WorkspaceEngine;
