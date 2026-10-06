import {renderPage} from './renderer.js';
import {createRuntime} from './interaction.js';
import {addNode,insertNodeAtDrop} from '../core/commands.js';
import {clamp} from '../core/utils.js';

export class WorkspaceEngine{
  constructor(store,inspector,panels){this.store=store;this.inspector=inspector;this.panels=panels;this.runtimeCleanup=null;this.runtimeKey='';this.wired=false}
  mount(){this.pageCanvas=document.getElementById('pageCanvas');this.deviceFrame=document.getElementById('deviceFrame');this.viewport=document.getElementById('canvasViewport');this.stage=document.getElementById('canvasStage');this.wireCanvas();this.wireControls();this.render()}
  activePage(){return this.store.activePage()}
  wireCanvas(){
    if(this.wired)return;this.wired=true;
    this.pageCanvas.addEventListener('click',event=>{
      const wrap=event.target.closest('.node-wrap');if(!wrap||this.store.ui.interactionMode)return;
      if(event.target.closest('a'))event.preventDefault();
      this.store.setUI({selected:wrap.dataset.nodeId,rightOpen:true});
    });
    this.pageCanvas.addEventListener('dragover',event=>{event.preventDefault();this.pageCanvas.classList.add('drop-target')});
    this.pageCanvas.addEventListener('dragleave',()=>this.pageCanvas.classList.remove('drop-target'));
    this.pageCanvas.addEventListener('drop',event=>{
      event.preventDefault();this.pageCanvas.classList.remove('drop-target');
      const type=event.dataTransfer.getData('application/bunaa-type');if(!type)return;
      const target=event.target.closest?.('.node-wrap')?.dataset?.nodeId||null;
      insertNodeAtDrop(this.store,type,target);this.panels.setTab('layers');
    });
    document.getElementById('dropFooter')?.addEventListener('dragover',event=>event.preventDefault());
    document.getElementById('dropFooter')?.addEventListener('drop',event=>{
      event.preventDefault();const type=event.dataTransfer.getData('application/bunaa-type');if(type)this.addElement(type);
    });
  }
  wireControls(){
    document.getElementById('zoomIn')?.addEventListener('click',()=>this.setZoom(this.store.ui.zoom+.1));
    document.getElementById('zoomOut')?.addEventListener('click',()=>this.setZoom(this.store.ui.zoom-.1));
    document.getElementById('zoomFit')?.addEventListener('click',()=>this.fit());
    document.getElementById('gridBtn')?.addEventListener('click',()=>this.store.setUI({grid:!this.store.ui.grid}));
    document.getElementById('structureBtn')?.addEventListener('click',()=>{this.store.setUI({leftTab:'layers'});this.panels.setTab('layers')});
    document.getElementById('focusBtn')?.addEventListener('click',()=>this.store.setUI({focus:!this.store.ui.focus}));
    this.setupPan();
  }
  setupPan(){
    let pan=null;
    this.viewport.addEventListener('pointerdown',event=>{
      const canvasTarget=event.target.closest('#canvasStage');
      const allowed=event.button===1||(event.button===0&&canvasTarget&&(event.ctrlKey||event.metaKey));
      if(!allowed||event.target.closest('.editor-target')&&!(event.ctrlKey||event.metaKey))return;
      pan={x:event.clientX,y:event.clientY,sx:this.viewport.scrollLeft,sy:this.viewport.scrollTop};
      this.viewport.setPointerCapture(event.pointerId);this.viewport.style.cursor='grabbing';
    });
    const stop=()=>{pan=null;this.viewport.style.cursor='';};
    this.viewport.addEventListener('pointermove',event=>{if(!pan)return;this.viewport.scrollLeft=pan.sx-(event.clientX-pan.x);this.viewport.scrollTop=pan.sy-(event.clientY-pan.y)});
    this.viewport.addEventListener('pointerup',stop);this.viewport.addEventListener('pointercancel',stop);
  }
  setZoom(z){this.store.setUI({zoom:clamp(z,.55,1.5)})}
  applyZoom(){
    const z=this.store.ui.zoom;if(!this.stage)return;
    this.stage.style.transform=`scale(${z})`;this.stage.style.width=`calc(var(--site-width,1180px) * ${z})`;
    const label=document.getElementById('zoomLabel');if(label)label.textContent=`${Math.round(z*100)}%`;
  }
  fit(){
    const available=Math.max(240,this.viewport.clientWidth-90),base=this.deviceWidth();
    this.setZoom(clamp(available/base,.55,1.2));
    requestAnimationFrame(()=>{this.viewport.scrollTop=0;this.viewport.scrollLeft=Math.max(0,(this.viewport.scrollWidth-this.viewport.clientWidth)/2)});
  }
  deviceWidth(){return this.store.project.devices[this.store.ui.device]?.width||1180}
  addElement(type){addNode(this.store,type);this.panels.setTab('layers')}
  toggleInteraction(on){this.store.setUI({interactionMode:Boolean(on)})}
  syncRuntime(){
    if(!this.store.ui.interactionMode){this.cleanupRuntime();this.runtimeKey='';return}
    this.cleanupRuntime();
    const key=JSON.stringify([this.store.project.activePageId,this.store.project.interactions]);
    this.runtimeCleanup=createRuntime({
      document,project:this.store.project,
      navigate:id=>{
        if(!this.store.project.pages.some(page=>page.id===id))return;
        this.store.transact('تنقل',project=>{project.activePageId=id},{record:false});
      },
      scrollToAnchor:id=>this.scrollToAnchor(id)
    });
    this.runtimeKey=key;
  }
  cleanupRuntime(){if(this.runtimeCleanup){this.runtimeCleanup();this.runtimeCleanup=null}}
  scrollToAnchor(id){
    const esc=globalThis.CSS?.escape?CSS.escape(id):String(id).replace(/(["\\])/g,'\\$1');
    this.pageCanvas.querySelector(`[data-node-id="${esc}"]`)?.scrollIntoView({behavior:'smooth',block:'center'});
  }
  render(){
    const page=this.activePage();if(!page||!this.pageCanvas)return;
    if(this.store.ui.interactionMode)this.cleanupRuntime();
    renderPage(page,this.pageCanvas,{project:this.store.project,theme:this.store.project.theme,device:this.store.ui.device,selectedId:this.store.ui.interactionMode?null:this.store.ui.selected});
    this.deviceFrame.className=`site-frame ${this.store.ui.device}`;
    this.pageCanvas.classList.toggle('show-grid',Boolean(this.store.ui.grid));
    const title=document.getElementById('canvasPageTitle');if(title)title.textContent=page.name;
    const mode=document.getElementById('canvasModeLabel');if(mode)mode.textContent=this.store.ui.interactionMode?'وضع تجربة التفاعل':'وضع البناء';
    const selected=this.store.ui.selected?this.store.find(this.store.ui.selected):null;
    const info=document.getElementById('selectionInfo');if(info)info.textContent=selected?`العنصر: ${selected.node.props?.label||selected.node.props?.title||selected.node.type}`:'لم يتم تحديد عنصر';
    const pc=document.getElementById('pageCountLabel');if(pc)pc.textContent=`${this.store.project.pages.length} ${this.store.project.pages.length===1?'صفحة':'صفحات'}`;
    const ec=document.getElementById('elementCountLabel');if(ec)ec.textContent=`${this.store.nodeCount()} عنصر`;
    document.getElementById('dropEmpty')?.classList.toggle('hidden',(page.nodes||[]).length>0);
    document.getElementById('gridBtn')?.classList.toggle('active',Boolean(this.store.ui.grid));
    this.applyZoom();this.syncRuntime();
  }
  renderShell(){const main=document.querySelector('.workspace-main');main?.classList.toggle('focus-mode',Boolean(this.store.ui.focus));document.body.classList.toggle('focus-canvas',Boolean(this.store.ui.focus))}
  sync(){this.render();this.renderShell();this.refreshPageSelect()}
  refreshPageSelect(){
    const select=document.getElementById('pageSelect');if(!select)return;
    select.innerHTML=this.store.project.pages.map(page=>`<option value="${page.id}">${page.name}</option>`).join('');
    select.value=this.store.project.activePageId;
  }
}