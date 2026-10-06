import {Store} from '../core/store.js';
import {WorkspaceEngine} from '../engine/workspace.js';
import {Panels} from '../ui/panels.js';
import {Inspector} from '../ui/inspector.js';
import {Dialogs} from '../ui/dialogs.js';
import {templates,materializeTemplate} from '../catalog/templates.js';

const $=id=>document.getElementById(id);

export class App{
  constructor(){
    this.store=new Store();
    this.inspector=new Inspector(this.store);
    this.panels=new Panels(this.store,null);
    this.engine=new WorkspaceEngine(this.store,this.inspector,this.panels);
    this.panels.engine=this.engine;
    this.dialogs=new Dialogs(this.store,this.engine,this.panels);
    this.booted=false;
  }

  start(){
    this.store.hydrate();
    document.querySelectorAll('.mode-card').forEach(button=>{
      button.addEventListener('click',()=>this.showWorkspace(button.dataset.mode||'normal'));
    });
    $('resumeBtn')?.addEventListener('click',()=>this.showWorkspace(this.store.ui.mode||'normal'));
    this.updateResume();
  }

  showWorkspace(mode='normal'){
    $('onboarding')?.classList.add('hidden');
    $('workspace')?.classList.remove('hidden');
    this.store.setUI({mode});
    if(!this.store.project.pages.length||!this.store.project.pages.some(page=>(page.nodes||[]).length))this.applyStarter();
    this.boot();
  }

  applyStarter(){
    const materialized=materializeTemplate(templates[0]);
    this.store.transact('تحميل البداية',project=>{
      project.pages=materialized.pages;
      project.activePageId=materialized.pages[0].id;
      project.meta.name='مشروع البداية';
      project.interactions=[];
    });
    this.store.setUI({selected:null},{emit:false});
  }

  boot(){
    if(this.booted)return;
    this.booted=true;
    this.panels.mount();
    this.inspector.mount($('inspector'));
    this.engine.mount();
    this.dialogs.bind();
    this.bindGlobalUi();
    this.store.subscribe(()=>this.render());
    this.render();
  }

  bindGlobalUi(){
    $('homeBtn')?.addEventListener('click',()=>this.showOnboarding());
    $('undoBtn')?.addEventListener('click',()=>this.store.undo());
    $('redoBtn')?.addEventListener('click',()=>this.store.redo());
    $('leftToggle')?.addEventListener('click',()=>this.toggleDrawer('left'));
    $('rightToggle')?.addEventListener('click',()=>this.toggleDrawer('right'));
    $('leftClose')?.addEventListener('click',()=>this.toggleDrawer('left',false));
    $('rightClose')?.addEventListener('click',()=>this.toggleDrawer('right',false));
    $('leftRail')?.addEventListener('click',()=>this.toggleDrawer('left',true));
    $('rightRail')?.addEventListener('click',()=>this.toggleDrawer('right',true));
    $('pageSelect')?.addEventListener('change',event=>this.selectPage(event.target.value));
    $('pagePrev')?.addEventListener('click',()=>this.stepPage(-1));
    $('pageNext')?.addEventListener('click',()=>this.stepPage(1));

    document.querySelectorAll('.device-btn').forEach(button=>{
      button.addEventListener('click',()=>this.store.setUI({device:button.dataset.device}));
    });

    window.addEventListener('keydown',event=>this.keyboard(event));
    window.addEventListener('beforeunload',()=>this.store.persistNow());
    window.addEventListener('resize',()=>this.syncDrawers());
  }

  showOnboarding(){
    $('workspace')?.classList.add('hidden');
    $('onboarding')?.classList.remove('hidden');
    this.updateResume();
  }

  selectPage(id){
    if(!this.store.project.pages.some(page=>page.id===id))return;
    this.store.setUI({selected:null},{emit:false});
    this.store.transact('فتح صفحة',project=>{project.activePageId=id},{record:false});
  }

  stepPage(direction){
    const pages=this.store.project.pages;
    const index=pages.findIndex(page=>page.id===this.store.project.activePageId);
    if(index<0||!pages.length)return;
    const page=pages[(index+direction+pages.length)%pages.length];
    if(page)this.selectPage(page.id);
  }

  toggleDrawer(side,force){
    const key=side==='left'?'leftOpen':'rightOpen';
    this.store.setUI({[key]:force===undefined?!this.store.ui[key]:Boolean(force)});
  }

  syncDrawers(){
    const root=document.querySelector('.workspace-main');
    if(!root)return;
    const mobile=window.matchMedia('(max-width:900px)').matches;
    if(mobile){
      root.style.gridTemplateColumns='';
      root.classList.toggle('mobile-left-open',Boolean(this.store.ui.leftOpen));
      root.classList.toggle('mobile-right-open',Boolean(this.store.ui.rightOpen));
      $('leftDrawer')?.classList.remove('hidden');
      $('rightDrawer')?.classList.remove('hidden');
    }else{
      root.classList.remove('mobile-left-open','mobile-right-open');
      root.style.gridTemplateColumns=`${this.store.ui.leftOpen?'var(--sidebar)':'0px'} minmax(0,1fr) ${this.store.ui.rightOpen?'var(--inspector)':'0px'}`;
      $('leftDrawer')?.classList.toggle('hidden',!this.store.ui.leftOpen);
      $('rightDrawer')?.classList.toggle('hidden',!this.store.ui.rightOpen);
    }
    $('leftRail')?.classList.toggle('hidden',Boolean(this.store.ui.leftOpen));
    $('rightRail')?.classList.toggle('hidden',Boolean(this.store.ui.rightOpen));
  }

  keyboard(event){
    const modifier=event.ctrlKey||event.metaKey;
    const typing=event.target?.matches?.('input,textarea,select,[contenteditable="true"]');
    if(modifier&&event.key.toLowerCase()==='z'){event.preventDefault();this.store.undo();return;}
    if(modifier&&(event.key.toLowerCase()==='y'||(event.shiftKey&&event.key.toLowerCase()==='z'))){event.preventDefault();this.store.redo();return;}
    if(modifier&&event.key.toLowerCase()==='s'){event.preventDefault();this.store.persistNow();this.toast('تم حفظ المشروع');return;}
    if(modifier&&event.key==='='&&!typing){event.preventDefault();this.engine.setZoom(this.store.ui.zoom+.1);return;}
    if(modifier&&event.key==='-'&&!typing){event.preventDefault();this.engine.setZoom(this.store.ui.zoom-.1);return;}
    if(event.key.toLowerCase()==='f'&&!typing&&!modifier)this.engine.fit();
  }

  toast(message){
    let host=document.querySelector('.toast-wrap');
    if(!host){host=document.createElement('div');host.className='toast-wrap';document.body.appendChild(host);}
    const item=document.createElement('div');item.className='toast';item.textContent=message;host.appendChild(item);
    setTimeout(()=>item.remove(),1800);
  }

  render(){
    if(!this.booted)return;
    this.engine.sync();
    this.panels.renderLibrary();
    this.panels.renderLayers();
    this.panels.renderInteractions();
    this.inspector.render();
    this.syncDrawers();
    $('projectName').textContent=this.store.project.meta.name;
    $('saveStatus').textContent=this.store.ui.saveError?'⚠ تعذر الحفظ':'● محفوظ';
    $('advancedDevicesBtn').textContent=this.store.ui.advancedDevices?'إغلاق إعدادات الأجهزة':'إعدادات الأجهزة';
    document.querySelectorAll('.device-btn').forEach(button=>button.classList.toggle('active',button.dataset.device===this.store.ui.device));
    this.updateResume();
  }

  updateResume(){
    const card=$('resumeProject');
    if(!card)return;
    card.classList.toggle('hidden',!this.store.restorable);
    if(this.store.restorable)$('resumeMeta').textContent=`${this.store.project.meta.name} • ${this.store.project.pages.length} صفحات`;
  }
}