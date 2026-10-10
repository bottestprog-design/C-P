const {renderPage} = __require("src/engine/renderer.js");
const {createRuntime} = __require("src/engine/interaction.js");
const {addNode,insertNodeAtDrop} = __require("src/core/commands.js");
const {clamp} = __require("src/core/utils.js");
const {pageFromAnchor} = __require("src/engine/routing.js");
const {findNodeGlobal} = __require("src/core/model.js");
class WorkspaceEngine{constructor(store,inspector,panels){this.store=store;this.inspector=inspector;this.panels=panels;this.runtimeCleanup=null;this.runtimeKey='';this.wired=false;this.space=false;this.manipulation=null;this.suppressCanvasClickUntil=0;this.didInitialFit=false;this.manuallyZoomed=false;this.isFitting=false}
mount(){this.pageCanvas=document.getElementById('pageCanvas');this.deviceFrame=document.getElementById('deviceFrame');this.viewport=document.getElementById('canvasViewport');this.stage=document.getElementById('canvasStage');this.host=document.getElementById('canvasStageHost');this.contentHeightFrame=0;this.wireCanvas();this.wireControls();this.resizeObserver=globalThis.ResizeObserver?new ResizeObserver(()=>{this.scheduleContentHeight();this.reflowHost();this.centerStage();if(this.didInitialFit&&!this.manuallyZoomed)requestAnimationFrame(()=>this.fit())}):null;this.resizeObserver?.observe(this.viewport);this.pageCanvas.addEventListener('load',()=>this.scheduleContentHeight(),true)}
wireCanvas(){
  if(this.wired)return;
  this.wired=true;
  this.pageCanvas.addEventListener('pointerdown',e=>this.beginNodeManipulation(e));
  // Track the whole gesture at window level so resizing keeps working when a grip
  // starts at the canvas edge or the pointer crosses into a side drawer.
  window.addEventListener('pointermove',e=>this.moveNodeManipulation(e),true);
  window.addEventListener('pointerup',e=>this.finishNodeManipulation(e),true);
  window.addEventListener('pointercancel',e=>this.cancelNodeManipulation(e),true);
  this.pageCanvas.addEventListener('lostpointercapture',e=>this.cancelNodeManipulation(e),true);
  this.wireToolbarMenu();
  this.pageCanvas.addEventListener('click',e=>{
    if(Date.now()<this.suppressCanvasClickUntil){e.preventDefault();e.stopPropagation();return}
    const link=e.target.closest('a');const w=e.target.closest('.node-wrap');
    if(this.store.ui.interactionMode){
      if(w){const sourceId=w.dataset.nodeId;const ownsClick=this.store.project.interactions?.some(i=>i.sourceId===sourceId&&i.enabled!==false&&i.trigger==='click');if(ownsClick){if(link)e.preventDefault();return}}
      if(link){const target=link.dataset.pageTarget||pageFromAnchor(link.getAttribute('href'),this.store.project)?.id;if(target){e.preventDefault();this.store.setActivePage(target);this.store.setUI({leftTab:'elements'});return}}
      return;
    }
    if(e.target.closest('.node-resize-handle')){e.preventDefault();return}
    if(!w)return;
    e.preventDefault();this.store.setUI({selected:w.dataset.nodeId,rightOpen:true});
  });
  this.pageCanvas.addEventListener('dragover',e=>e.preventDefault());
  this.pageCanvas.addEventListener('drop',e=>{e.preventDefault();const type=e.dataTransfer.getData('application/bunaa-type');if(!type)return;insertNodeAtDrop(this.store,type,e.target.closest('.node-wrap')?.dataset.nodeId||null);this.panels.setTab('layers')});
  document.getElementById('dropFooter')?.addEventListener('drop',e=>{e.preventDefault();const type=e.dataTransfer.getData('application/bunaa-type');if(type)this.addElement(type)});
}
beginNodeManipulation(e){
  if(e.button!==0||this.store.ui.interactionMode||this.manipulation)return;
  if(e.target.closest('input,textarea,select,[contenteditable="true"]'))return;
  const handle=e.target.closest('.node-resize-handle');
  const wrapper=handle?.closest('.node-wrap')||e.target.closest('.node-wrap');
  if(!wrapper||wrapper.dataset.locked==='1')return;
  const nodeId=wrapper.dataset.nodeId;
  const found=this.store.find(nodeId);
  if(!found)return;
  const rect=wrapper.getBoundingClientRect();
  const zoom=Math.max(.2,Number(this.store.ui.zoom)||1);
  const pos=found.node.editorPosition?.[this.store.ui.device]||found.node.editorPosition||{};
  const style={...(found.node.style||{}),...(found.node.responsive?.[this.store.ui.device]||{})};
  const content=wrapper.querySelector(':scope > .node-content');
  this.manipulation={
    pointerId:e.pointerId,nodeId,pageId:this.store.project.activePageId,wrapper,mode:handle?'resize':'move',edge:handle?.dataset.resizeEdge||'',
    startClientX:e.clientX,startClientY:e.clientY,startX:Number(pos.x)||0,startY:Number(pos.y)||0,
    startRectX:rect.left,startRectY:rect.top,
    startWidth:Math.max(1,rect.width/zoom),startHeight:Math.max(1,rect.height/zoom),
    startStyleWidth:style.width,startStyleHeight:style.height,
    startWrapperWidth:wrapper.style.width,startWrapperHeight:wrapper.style.height,startTransform:wrapper.style.transform,
    content,startContentWidth:content?.style.width||'',startContentHeight:content?.style.height||'',
    startChildrenStyles:[...(content?.children||[])].map(child=>({child,width:child.style.width,height:child.style.height,boxSizing:child.style.boxSizing})),
    widthMoved:false,heightMoved:false,moved:false,zoom,device:this.store.ui.device,captureTarget:handle||wrapper
  };
  try{m.captureTarget?.setPointerCapture(e.pointerId);m.captureTarget?.addEventListener('lostpointercapture',event=>this.cancelNodeManipulation(event),{once:true})}catch{}
  if(handle){e.preventDefault();e.stopPropagation()}
}
moveNodeManipulation(e){
  const m=this.manipulation;
  if(!m||m.pointerId!==e.pointerId)return;
  const dx=(e.clientX-m.startClientX)/m.zoom,dy=(e.clientY-m.startClientY)/m.zoom;
  if(!m.moved&&Math.hypot(dx,dy)<3)return;
  const firstMove=!m.moved;
  m.moved=true;
  if(firstMove){try{if(!m.captureTarget?.hasPointerCapture(e.pointerId))m.captureTarget?.setPointerCapture(e.pointerId)}catch{}}
  const canvasBounds=this.pageCanvas.getBoundingClientRect();
  if(m.mode==='move'){
    /* The artboard width is tied to the selected device. Moving nodes never changes
       the device width; only the user's explicit vertical resize may extend page height. */
    const currentLeft=(m.startRectX-canvasBounds.left)/m.zoom;
    const currentTop=(m.startRectY-canvasBounds.top)/m.zoom;
    const minDx=-Math.max(2000,currentLeft+2000);
    const maxDx=Math.max(0,50000-currentLeft-m.startWidth);
    const minDy=-Math.max(2000,currentTop+2000);
    const maxDy=Math.max(0,50000-currentTop-m.startHeight);
    const boundedDx=clamp(dx,minDx,maxDx);
    const boundedDy=clamp(dy,minDy,maxDy);
    m.x=Math.round(m.startX+boundedDx);
    m.y=Math.round(m.startY+boundedDy);
    m.wrapper.style.transform=`translate3d(${m.x}px, ${m.y}px, 0)`;
    m.wrapper.classList.add('is-manipulating');
  }else{
    const minWidth=24,minHeight=20;
    const west=m.edge.includes('w'),east=m.edge.includes('e');
    const north=m.edge.includes('n'),south=m.edge.includes('s');
    m.widthMoved=west||east;m.heightMoved=north||south;
    // West/north grips keep the opposite edge fixed, rather than resizing from
    // the top-left and making the element appear to jump under the pointer.
    if(m.widthMoved){
      // Keep the artboard fixed to the selected device width. A node may be wider,
      // but that must not silently widen the page or reposition other nodes.
      const available=west
        ?m.startWidth+Math.max(0,(m.startRectX-canvasBounds.left)/m.zoom)
        :20000;
      const maxWidth=Math.max(minWidth,Math.min(20000,Math.floor(available)));
      m.width=Math.round(clamp(m.startWidth+(west?-dx:dx),minWidth,maxWidth));
    }
    if(m.heightMoved){
      const available=north
        ?m.startHeight+Math.max(0,(m.startRectY-canvasBounds.top)/m.zoom)
        :20000;
      const maxHeight=Math.max(minHeight,Math.min(20000,Math.floor(available)));
      m.height=Math.round(clamp(m.startHeight+(north?-dy:dy),minHeight,maxHeight));
    }
    if(m.widthMoved){
      m.wrapper.style.width=`${m.width}px`;
      if(m.content){m.content.style.width=`${m.width}px`;if(!m.wrapper.querySelector(':scope > .node-content > .node-wrap'))for(const child of m.content.children){child.style.width='100%';child.style.boxSizing='border-box'}}
    }
    if(m.heightMoved){
      m.wrapper.style.height=`${m.height}px`;
      if(m.content){m.content.style.height=`${m.height}px`;if(!m.wrapper.querySelector(':scope > .node-content > .node-wrap'))for(const child of m.content.children){child.style.height='100%';child.style.boxSizing='border-box'}}
    }
    m.x=west?Math.round(m.startX+m.startWidth-m.width):m.startX;
    m.y=north?Math.round(m.startY+m.startHeight-m.height):m.startY;
    if(m.widthMoved||m.heightMoved)m.wrapper.style.transform=`translate3d(${m.x}px, ${m.y}px, 0)`;
    m.wrapper.classList.add('is-manipulating');
  }
  this.scheduleContentHeight();
  e.preventDefault();
}
finishNodeManipulation(e){
  const m=this.manipulation;
  if(!m||m.pointerId!==e.pointerId)return;
  this.manipulation=null;
  try{if(m.captureTarget?.hasPointerCapture(e.pointerId))m.captureTarget.releasePointerCapture(e.pointerId)}catch{}
  m.wrapper.classList.remove('is-manipulating');
  if(!m.moved)return;
  this.suppressCanvasClickUntil=Date.now()+350;
  const label=m.mode==='move'?'تحريك عنصر بالماوس':'تغيير حجم عنصر بالماوس';
  // The canvas height is extended only by an explicit vertical resize, never by
  // moving a node, changing devices, observing content, or recomputing width.
  const requestedPageHeight=(m.mode==='resize'&&m.heightMoved)?this.measureResizedNodeBottom(m):0;
  this.store.transact(label,project=>{
    const hit=findNodeGlobal(project,m.nodeId);if(!hit)return;
    if(m.mode==='move'){
      const current=hit.node.editorPosition&&typeof hit.node.editorPosition==='object'?hit.node.editorPosition:{};
      const old=current[m.device]&&typeof current[m.device]==='object'?current[m.device]:(m.device==='desktop'&&('x'in current||'y'in current)?current:{});
      hit.node.editorPosition={...current,[m.device]:{...old,x:m.x??m.startX,y:m.y??m.startY}};
    }else{
      const dimensions={...(m.widthMoved?{width:m.width}:{}),...(m.heightMoved?{height:m.height}:{})};
      if(m.device==='desktop'){
        const existingDesktop=hit.node.responsive?.desktop||{},basePatch={},responsivePatch={};
        for(const [key,value] of Object.entries(dimensions)){
          if(Object.prototype.hasOwnProperty.call(existingDesktop,key))responsivePatch[key]=value;
          else basePatch[key]=value;
        }
        hit.node.style={...(hit.node.style||{}),...basePatch};
        if(Object.keys(responsivePatch).length)hit.node.responsive={...(hit.node.responsive||{}),desktop:{...existingDesktop,...responsivePatch}};
      }else hit.node.responsive={...(hit.node.responsive||{}),[m.device]:{...(hit.node.responsive?.[m.device]||{}),...dimensions}};
      const current=hit.node.editorPosition&&typeof hit.node.editorPosition==='object'?hit.node.editorPosition:{};
      const old=current[m.device]&&typeof current[m.device]==='object'?current[m.device]:(m.device==='desktop'&&('x'in current||'y'in current)?current:{});
      hit.node.editorPosition={...current,[m.device]:{...old,x:m.x??m.startX,y:m.y??m.startY}};
    }
    if(requestedPageHeight>0){
      const page=(project.pages||[]).find(item=>item.id===m.pageId);
      if(page){
        const settings=page.settings&&typeof page.settings==='object'?page.settings:{};
        const saved=settings.canvasHeightByDevice&&typeof settings.canvasHeightByDevice==='object'?settings.canvasHeightByDevice:{};
        const currentHeight=Math.max(360,Number(saved[m.device])||360);
        if(requestedPageHeight>currentHeight+2){
          page.settings={...settings,canvasHeightByDevice:{...saved,[m.device]:Math.min(50000,Math.ceil(requestedPageHeight+48))}};
        }
      }
    }
  });
  this.store.setUI({selected:m.nodeId,rightOpen:true});
  this.scheduleContentHeight();
}
cancelNodeManipulation(e){
  const m=this.manipulation;if(!m||e.pointerId!==undefined&&m.pointerId!==e.pointerId)return;
  this.manipulation=null;
  if(m.wrapper?.isConnected){
    m.wrapper.classList.remove('is-manipulating');
    m.wrapper.style.transform=m.startTransform||'';
    if(m.mode==='resize'){
      m.wrapper.style.width=m.startWrapperWidth||'';m.wrapper.style.height=m.startWrapperHeight||'';
      const c=m.content||m.wrapper.querySelector(':scope > .node-content');
      if(c){c.style.width=m.startContentWidth||'';c.style.height=m.startContentHeight||''}
      for(const item of m.startChildrenStyles||[]){item.child.style.width=item.width;item.child.style.height=item.height;item.child.style.boxSizing=item.boxSizing}
    }
  }
}
wireToolbarMenu(){
  const menu=document.querySelector('.toolbar-more');if(!menu||menu.dataset.wired==='1')return;menu.dataset.wired='1';
  menu.addEventListener('click',event=>{if(event.target.closest('.toolbar-menu-item'))menu.open=false});
  document.addEventListener('click',event=>{if(menu.open&&!menu.contains(event.target))menu.open=false});
  document.addEventListener('keydown',event=>{if(event.key==='Escape')menu.open=false});
}
wireControls(){document.getElementById('zoomIn')?.addEventListener('click',()=>this.setZoom(this.store.ui.zoom+.1));document.getElementById('zoomOut')?.addEventListener('click',()=>this.setZoom(this.store.ui.zoom-.1));document.getElementById('zoomFit')?.addEventListener('click',()=>this.fit());document.getElementById('gridBtn')?.addEventListener('click',()=>this.store.setUI({grid:!this.store.ui.grid}));document.getElementById('structureBtn')?.addEventListener('click',()=>this.panels.setTab('layers'));document.getElementById('focusBtn')?.addEventListener('click',()=>this.store.setUI({focus:!this.store.ui.focus}));this.setupPan()}
setupPan(){let pan=null;const stop=()=>{pan=null;this.viewport.style.cursor=''};this.viewport.addEventListener('pointerdown',e=>{const allow=e.button===1||(e.button===0&&this.space)||(e.button===0&&(e.ctrlKey||e.metaKey));if(!allow||!e.target.closest('#canvasStage'))return;pan={x:e.clientX,y:e.clientY,sx:this.viewport.scrollLeft,sy:this.viewport.scrollTop};try{this.viewport.setPointerCapture(e.pointerId)}catch{}this.viewport.style.cursor='grabbing'});this.viewport.addEventListener('pointermove',e=>{if(!pan)return;this.viewport.scrollLeft=pan.sx-(e.clientX-pan.x);this.viewport.scrollTop=pan.sy-(e.clientY-pan.y)});this.viewport.addEventListener('pointerup',stop);this.viewport.addEventListener('pointercancel',stop);window.addEventListener('keydown',e=>{if(e.code==='Space'&&!e.repeat&&!e.target.matches('input,textarea,select'))this.space=true});window.addEventListener('keyup',e=>{if(e.code==='Space')this.space=false});window.addEventListener('blur',()=>{this.space=false;stop()});this.viewport.addEventListener('wheel',e=>{if(!(e.ctrlKey||e.metaKey))return;e.preventDefault();this.setZoom(this.store.ui.zoom+(e.deltaY<0?.08:-.08))},{passive:false});window.addEventListener('keydown',e=>{if(e.target?.matches?.('input,textarea,select'))return;if(e.key==='PageDown')this.viewport.scrollBy({top:Math.max(240,this.viewport.clientHeight*.8),behavior:'smooth'});else if(e.key==='PageUp')this.viewport.scrollBy({top:-Math.max(240,this.viewport.clientHeight*.8),behavior:'smooth'});else if(e.key==='Home'&&this.store.ui.focus)this.viewport.scrollTo({top:0,behavior:'smooth'});else if(e.key==='End'&&this.store.ui.focus)this.viewport.scrollTo({top:this.viewport.scrollHeight,behavior:'smooth'});})}
setZoom(z){if(!this.isFitting)this.manuallyZoomed=true;this.store.setUI({zoom:clamp(Number(z)||1,.2,1.5)})}
setDevice(device){if(!['desktop','tablet','mobile'].includes(device))return;this.manuallyZoomed=false;this.contentWidth=this.store.project.devices[device]?.width||({desktop:1180,tablet:768,mobile:390}[device]);for(const element of [this.pageCanvas,this.deviceFrame])if(element){element.style.width='';element.style.maxWidth=''}if(this.stage){this.stage.style.width='';this.stage.style.maxWidth=''}this.store.setUI({device,zoom:1});this.inspector?.setDevice?.(device);requestAnimationFrame(()=>this.fit())}
deviceWidth(){return this.store.project.devices[this.store.ui.device]?.width||1180}
fit(){if(!this.viewport)return;const base=this.contentWidth||this.deviceWidth(),style=getComputedStyle(this.viewport),padding=(parseFloat(style.paddingLeft)||0)+(parseFloat(style.paddingRight)||0),available=Math.max(260,this.viewport.clientWidth-padding-12);this.isFitting=true;this.setZoom(clamp(available/base,.2,1.2));this.isFitting=false;this.manuallyZoomed=false;requestAnimationFrame(()=>{this.centerStage();this.viewport.scrollTop=0})}
centerStage(){if(!this.viewport)return;const maxX=Math.max(0,this.viewport.scrollWidth-this.viewport.clientWidth);this.viewport.scrollLeft=Math.round(maxX/2)}
addElement(type){addNode(this.store,type);this.panels.setTab('layers')}
syncRuntime(){if(!this.store.ui.interactionMode){this.runtimeCleanup?.();this.runtimeCleanup=null;this.runtimeKey='';return}const key=JSON.stringify([this.store.project.activePageId,this.store.project.interactions,this.store.ui.device]);if(key===this.runtimeKey&&this.runtimeCleanup)return;this.runtimeCleanup?.();this.runtimeCleanup=createRuntime({document,project:this.store.project,navigate:id=>{if(this.store.project.pages.some(p=>p.id===id))this.store.setActivePage(id)}});this.runtimeKey=key}
render(){const page=this.store.activePage();if(!page)return;renderPage(page,this.pageCanvas,{project:this.store.project,theme:this.store.project.theme,styleLibrary:this.store.project.styleLibrary,device:this.store.ui.device,selectedId:this.store.ui.interactionMode?null:this.store.ui.selected});this.deviceFrame.className=`site-frame ${this.store.ui.device}`;this.pageCanvas.classList.toggle('show-grid',this.store.ui.grid);this.fitPageWidth();this.fitPageHeight();document.getElementById('canvasPageTitle').textContent=page.name;document.getElementById('canvasModeLabel').textContent=this.store.ui.interactionMode?'وضع تجربة التفاعل':'وضع البناء';const hit=this.store.ui.selected?this.store.find(this.store.ui.selected):null;document.getElementById('selectionInfo').textContent=hit?`العنصر: ${hit.node.props?.label||hit.node.props?.title||hit.node.type}`:'لم يتم تحديد عنصر';document.getElementById('pageCountLabel').textContent=`${this.store.project.pages.length} صفحة`;document.getElementById('elementCountLabel').textContent=`${this.store.nodeCount()} عنصر`;document.getElementById('dropEmpty').classList.toggle('hidden',page.nodes.length>0);document.getElementById('gridBtn').classList.toggle('active',this.store.ui.grid);this.applyZoom();this.syncRuntime();if(!this.didInitialFit){this.didInitialFit=true;requestAnimationFrame(()=>this.fit())}}
fitPageWidth(){
  if(!this.pageCanvas||!this.deviceFrame||!this.stage||!this.host)return this.deviceWidth();
  // Fixed device artboard: horizontal overflow from an element never expands the page.
  const desired=Math.max(320,Math.min(5000,Number(this.deviceWidth())||1180));
  this.contentWidth=desired;
  for(const element of [this.pageCanvas,this.deviceFrame]){
    element.style.width=`${desired}px`;
    element.style.maxWidth='none';
    element.style.boxSizing='border-box';
  }
  this.stage.style.width=`${desired}px`;
  this.stage.style.maxWidth='none';
  this.host.style.width=`${Math.ceil(desired*Math.max(.2,Number(this.store.ui.zoom)||1))}px`;
  return desired;
}
fitPageHeight(){
  if(!this.pageCanvas||!this.deviceFrame)return 360;
  // Height is a user-controlled extension saved per page and device. It is NOT
  // measured and rewritten during render, drag, viewport resize, or content changes.
  const page=this.store.activePage();
  const byDevice=page?.settings?.canvasHeightByDevice;
  const stored=Number(byDevice?.[this.store.ui.device]);
  const desired=Math.max(360,Math.min(50000,Number.isFinite(stored)&&stored>0?stored:360));
  for(const element of [this.pageCanvas,this.deviceFrame]){
    if(Math.abs((parseFloat(element.style.minHeight)||0)-desired)>2)element.style.minHeight=`${desired}px`;
    element.style.maxWidth='none';
  }
  return desired;
}
measureResizedNodeBottom(manipulation){
  if(!manipulation?.wrapper?.isConnected||!this.pageCanvas)return 0;
  const canvasRect=this.pageCanvas.getBoundingClientRect();
  const rect=manipulation.wrapper.getBoundingClientRect();
  const zoom=Math.max(.2,Number(manipulation.zoom)||1);
  if(!rect.width||!rect.height)return 0;
  // A page grows only if the element the user explicitly stretched crosses its
  // current lower edge. Horizontal overflow is deliberately ignored.
  const bottom=(rect.bottom-canvasRect.top)/zoom;
  const page=this.store.project.pages.find(item=>item.id===manipulation.pageId);
  const saved=Number(page?.settings?.canvasHeightByDevice?.[manipulation.device])||360;
  const current=Math.max(360,saved,this.pageCanvas.offsetHeight||0,this.deviceFrame?.offsetHeight||0);
  return bottom>current+4?Math.ceil(bottom):0;
}
scheduleContentHeight(){
  if(this.contentHeightFrame||typeof requestAnimationFrame!=='function')return;
  this.contentHeightFrame=requestAnimationFrame(()=>{
    this.contentHeightFrame=0;
    // Width always follows the chosen device. Height only follows native document
    // flow or a previously recorded manual vertical resize; no content scanning.
    this.fitPageWidth();
    this.reflowHost();
  });
}
reflowHost(){if(!this.host||!this.stage)return;const z=Math.max(.2,Number(this.store.ui.zoom)||1),base=Math.max(320,Math.min(5000,Number(this.deviceWidth())||1180));const logicalHeight=Math.max(this.stage.offsetHeight||0,this.deviceFrame?.offsetHeight||0,this.pageCanvas?.offsetHeight||0,360);this.host.style.width=`${Math.ceil(base*z)}px`;this.host.style.height=`${Math.ceil(logicalHeight*z+70)}px`}
applyZoom(){const z=this.store.ui.zoom,base=Math.max(320,Math.min(5000,Number(this.deviceWidth())||1180));this.stage.style.width=`${base}px`;this.stage.style.maxWidth='none';this.stage.style.transform=`scale(${z})`;this.stage.style.transformOrigin='top left';this.stage.style.left='0';this.stage.style.right='auto';this.stage.style.margin='0';this.reflowHost();document.getElementById('zoomLabel').textContent=`${Math.round(z*100)}%`;}
sync(){this.render();document.body.classList.toggle('focus-canvas',this.store.ui.focus);this.refreshPages()}
refreshPages(){const select=document.getElementById('pageSelect');if(!select)return;select.replaceChildren(...this.store.project.pages.map(p=>{const o=document.createElement('option');o.value=p.id;o.textContent=p.name;return o}));select.value=this.store.project.activePageId}
cleanup(){this.runtimeCleanup?.();this.runtimeCleanup=null;this.resizeObserver?.disconnect?.()}
}
exports.WorkspaceEngine = WorkspaceEngine;
});
