(()=>{'use strict';
const __modules=new Map();const __cache=new Map();
const __require=(id)=>{if(__cache.has(id))return __cache.get(id);const factory=__modules.get(id);if(!factory)throw new Error("Bunaa module not found: "+id);const exports={};__cache.set(id,exports);factory(exports,__require);return exports};
__modules.set("src/app/app.js",(exports,__require)=>{
const {Store} = __require("src/core/store.js");
const {ProjectRepository} = __require("src/core/project-repository.js");
const {ProjectService} = __require("src/features/projects/project-service.js");
const {WorkspaceEngine} = __require("src/engine/workspace.js");
const {Panels} = __require("src/ui/panels.js");
const {Inspector} = __require("src/ui/inspector.js");
const {Dialogs} = __require("src/ui/dialogs.js");
const {showModal} = __require("src/ui/modal.js");
const {templates,materializeTemplate} = __require("src/catalog/templates.js");
const {AuthStore} = __require("src/app/auth.js");
const {AppRouter,APP_ROUTES} = __require("src/app/router.js");
const {CommandPalette} = __require("src/app/command-palette.js");
const {compileSite} = __require("src/features/seo/index.js");
const {CMS_FIELD_TYPES,addCollection,updateCollection,removeCollection,addItem,updateItem,removeItem} = __require("src/features/cms/index.js");
const {createSymbolFromSelection} = __require("src/features/components/index.js");
const {StudioManagers} = __require("src/app/managers.js");
const {AssetService} = __require("src/features/assets/asset-service.js");
const {ReleaseService} = __require("src/features/releases/release-service.js");
const {defineClass,defineTextStyle,setDesignToken} = __require("src/features/design/design-service.js");
const {listVariables,setVariable,removeVariable} = __require("src/core/variables.js");
const {initializeDevicePresetsTree} = __require("src/core/device-presets.js");

const $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const modeLabel=mode=>mode==='trainee'?'متدرب برمجة':'بناء بصري';
const timeLabel=value=>{try{return new Intl.DateTimeFormat('ar',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value))}catch{return ''}};
class App{
  constructor(){
    this.router=new AppRouter();
    this.auth=new AuthStore();
    this.repository=new ProjectRepository();
    this.projectService=new ProjectService(this.repository);
    this.store=new Store(this.repository);
    this.assetService=new AssetService(this.store);
    this.releaseService=new ReleaseService(this.store);
    this.managers=new StudioManagers(this);
    this.panels=new Panels(this.store);
    this.inspector=new Inspector(this.store);this.inspector.assetService=this.assetService;
    this.engine=new WorkspaceEngine(this.store,this.inspector,this.panels);
    this.panels.engine=this.engine;
    this.panels.assetService=this.assetService;
    this.engine.assetService=this.assetService;
    this.dialogs=new Dialogs(this.store);
    this.booted=false;this.started=false;this.globalBound=false;this.dashboardQuery='';this.dashboardUnbind=null;this.mobileDrawerKey='leftOpen';this.commandPalette=new CommandPalette(this);
  }

  start(){
    if(this.started)return this;
    this.started=true;
    this.bindGlobalAuth();
    this.router.subscribe(route=>this.renderRoute(route));
    if(this.auth.authenticated){this.store.setAccount(this.auth.user.id);this.showDashboard()}else this.showAuth();
    return this;
  }

  bindGlobalAuth(){
    if(this.globalBound)return;
    this.globalBound=true;
    document.querySelectorAll('[data-auth-tab]').forEach(button=>button.addEventListener('click',()=>this.switchAuthTab(button.dataset.authTab||'login')));
    document.querySelectorAll('.account-mode').forEach(card=>{const radio=card.querySelector('input[type="radio"]');const sync=()=>card.parentElement?.querySelectorAll('.account-mode').forEach(item=>item.classList.toggle('active',item===card));card.addEventListener('click',()=>{if(radio)radio.checked=true;sync()});radio?.addEventListener('change',sync)});
    $('loginForm')?.addEventListener('submit',e=>this.submitLogin(e));$('registerForm')?.addEventListener('submit',e=>this.submitRegister(e));
    $('logoutBtn')?.addEventListener('click',()=>this.logout());
    $('guestBtn')?.addEventListener('click',()=>this.enterGuestMode());
    document.querySelectorAll('[data-quick-template]').forEach(button=>button.addEventListener('click',()=>this.createNewProject(Number(button.dataset.quickTemplate||0),button.dataset.projectName||'')));
    $('dashboardHelpBtn')?.addEventListener('click',()=>this.showStartGuide());
    $('dashboardSearch')?.addEventListener('input',e=>{this.dashboardQuery=String(e.target.value||'').trim().toLowerCase();this.renderDashboard()});
    $('emptyNewProjectBtn')?.addEventListener('click',()=>this.createNewProject());
    $('newProjectBtn')?.addEventListener('click',()=>this.createNewProject());
  }

  renderRoute(route){
    document.body.dataset.appRoute=route;
    $('auth')?.classList.toggle('hidden',route!==APP_ROUTES.AUTH);
    $('onboarding')?.classList.toggle('hidden',route!==APP_ROUTES.DASHBOARD);
    $('workspace')?.classList.toggle('hidden',route!==APP_ROUTES.EDITOR);
    if(route===APP_ROUTES.AUTH){setTimeout(()=>$('loginEmail')?.focus(),0);return}
    if(route===APP_ROUTES.DASHBOARD){this.renderDashboard();return}
    if(route===APP_ROUTES.EDITOR){this.boot();this.render()}
  }

  showAuth(){this.router.go(APP_ROUTES.AUTH)}

  showDashboard(){
    if(!this.auth.authenticated){this.showAuth();return this}
    if(!this.store.userId)this.store.setAccount(this.auth.user.id);
    this.router.go(APP_ROUTES.DASHBOARD);return this;
  }

  switchAuthTab(tab='login'){
    const login=tab==='login';document.querySelectorAll('[data-auth-tab]').forEach(button=>button.classList.toggle('active',button.dataset.authTab===tab));$('loginForm')?.classList.toggle('hidden',!login);$('registerForm')?.classList.toggle('hidden',login);this.clearAuthMessages();
  }
  clearAuthMessages(){for(const id of ['loginMessage','registerMessage']){const e=$(id);if(e){e.textContent='';e.className='auth-message'}}}
  authMessage(id,message,kind='error'){const e=$(id);if(e){e.textContent=message;e.className=`auth-message ${kind}`}}
  setFormBusy(form,busy){if(!form)return;form.dataset.busy=busy?'1':'0';form.querySelectorAll('input,button,select,textarea').forEach(control=>control.disabled=busy);const submit=form.querySelector('button[type="submit"]');if(submit){submit.dataset.defaultLabel??=submit.textContent;submit.textContent=busy?'جارٍ التنفيذ…':submit.dataset.defaultLabel}}

  async submitLogin(event){
    event.preventDefault();this.clearAuthMessages();const form=$('loginForm');if(form?.dataset.busy==='1')return;this.setFormBusy(form,true);
    try{const user=await this.auth.login($('loginEmail')?.value,$('loginPassword')?.value);this.store.setAccount(user.id);this.showDashboard()}catch(error){this.authMessage('loginMessage',error?.message||'تعذر تسجيل الدخول.')}finally{this.setFormBusy(form,false)}
  }
  async submitRegister(event){
    event.preventDefault();this.clearAuthMessages();const form=$('registerForm');if(form?.dataset.busy==='1')return;this.setFormBusy(form,true);const password=$('registerPassword')?.value||'',confirmation=$('registerPasswordConfirm')?.value||'';
    if(password!==confirmation){this.authMessage('registerMessage','كلمتا المرور غير متطابقتين.');this.setFormBusy(form,false);return}
    try{const mode=document.querySelector('input[name="accountMode"]:checked')?.value||'normal';const user=await this.auth.register({name:$('registerName')?.value,email:$('registerEmail')?.value,password,mode});this.store.setAccount(user.id);this.showDashboard()}catch(error){this.authMessage('registerMessage',error?.message||'تعذر إنشاء الحساب.')}finally{this.setFormBusy(form,false)}
  }

  enterGuestMode(){try{const user=this.auth.loginGuest();this.store.setAccount(user.id);this.showDashboard();this.toast('أهلًا بك. هذه تجربة محلية تحفظ على هذا الجهاز فقط.')}catch(error){this.authMessage('loginMessage',error?.message||'تعذر بدء التجربة.')}}


  showStartGuide(){const body=`<div class="start-guide"><div class="guide-step"><b>1</b><div><strong>اختر بداية جاهزة</strong><p>ابدأ من قالب بدل بناء كل شيء من الصفر.</p></div></div><div class="guide-step"><b>2</b><div><strong>اضغط على أي عنصر</strong><p>عدّل النص والمظهر من لوحة التخصيص اليمنى.</p></div></div><div class="guide-step"><b>3</b><div><strong>جرّب ثم نزّل</strong><p>استخدم المعاينة، فحص الجودة، ثم نزّل الموقع ZIP.</p></div></div></div>`;return showModal($('modalHost'),{title:'ابدأ في 3 خطوات',body,actions:[{label:'فهمت'}]})}

  renderDashboard(){
    if(!this.auth.authenticated)return this.showAuth();
    const user=this.auth.user;if($('welcomeText'))$('welcomeText').textContent=user?.name||'بك';if($('dashboardUser'))$('dashboardUser').textContent=user?.name||'الحساب';if($('dashboardMode'))$('dashboardMode').textContent=modeLabel(user?.mode);if($('projectCountLabel'))$('projectCountLabel').textContent=String(this.projectService.stats(this.auth.user.id).count);
    const grid=$('projectGrid'),empty=$('dashboardEmpty');if(!grid)return;
    const allProjects=this.projectService.list(this.auth.user.id,this.dashboardQuery);const projects=allProjects;grid.innerHTML=projects.map((project,index)=>`<article class="project-card ${index===0?'recent':''}" data-project-card="${esc(project.id)}"><div class="project-card-preview"><span class="project-preview-badge">${index===0?'الأحدث':'مشروع'}</span><div class="preview-lines"><i></i><i></i><i></i><i></i></div></div><div class="project-card-body"><div><b>${esc(project.name)}</b><small>${project.pages} صفحات • ${project.nodes} عناصر</small><small>آخر حفظ: ${esc(timeLabel(project.updatedAt))}</small></div><div class="project-card-actions"><button class="primary-btn" data-project-open="${esc(project.id)}">فتح</button><button class="icon-btn tiny" title="خيارات" data-project-menu="${esc(project.id)}">⋯</button></div></div></article>`).join('');
    empty?.classList.toggle('hidden',projects.length>0);grid.classList.toggle('hidden',projects.length===0);if(empty&&!projects.length&&allProjects.length)empty.innerHTML='<div class="empty-project-icon">⌕</div><b>لا توجد نتائج</b><p>جرّب اسم مشروع مختلف أو امسح البحث.</p>';
    grid.onclick=e=>{const open=e.target.closest('[data-project-open]');if(open)this.openProject(open.dataset.projectOpen);const menu=e.target.closest('[data-project-menu]');if(menu)this.projectMenu(menu.dataset.projectMenu)};
  }

  createNewProject(preselect=0,presetName=''){

    if(!this.auth.authenticated)return this.showAuth();
    const body=`<div class="create-project-layout"><div class="field"><span>اسم المشروع</span><input id="newProjectName" value="${esc(presetName||'موقعي الجديد')}" maxlength="80"></div><div class="field"><span>ابدأ من قالب</span><div class="template-choice-grid">${templates.map((t,i)=>`<button type="button" class="template-choice ${i===0?'active':''}" data-template-choice="${i}"><strong>${esc(t.name)}</strong><small>${esc(t.description)}</small></button>`).join('')}</div></div></div>`;
    const modal=showModal($('modalHost'),{title:'إنشاء مشروع جديد',body,actions:[{label:'إلغاء'},{label:'إنشاء المشروع',kind:'primary',onClick:()=>this.finishCreateProject(modal)}],wide:true});
    modal.dataset.template=String(Math.max(0,Math.min(templates.length-1,Number(preselect)||0)));
    const selected=modal.querySelector(`[data-template-choice="${modal.dataset.template}"]`);if(selected){modal.querySelectorAll('[data-template-choice]').forEach(x=>x.classList.toggle('active',x===selected))} modal.querySelectorAll('[data-template-choice]').forEach(button=>button.addEventListener('click',()=>{modal.dataset.template=button.dataset.templateChoice;modal.querySelectorAll('[data-template-choice]').forEach(x=>x.classList.toggle('active',x===button))}));
    return modal;
  }

  finishCreateProject(modal){
    try{
      const name=$('newProjectName')?.value?.trim()||'موقعي الجديد';const templateIndex=Number(modal.dataset.template||0);const template=materializeTemplate(templates[templateIndex]);
      this.store.createProject(name,{meta:{template:templates[templateIndex]?.name||''}});
      this.store.transact('بناء المشروع من قالب',project=>{project.pages=template.pages.map(page=>({...page,nodes:initializeDevicePresetsTree(page.nodes||[],this.store.ui.device||'desktop')}));project.activePageId=project.pages[0].id;project.theme=template.theme||project.theme;project.devices=template.devices||project.devices;project.assets=template.assets||[];project.variables=template.variables||{};project.interactions=template.interactions||[];project.settings={...project.settings,...(template.settings||{})};project.meta.template=templates[templateIndex]?.name||''});
      this.store.persistNow();modal.remove();this.showWorkspace(this.store.projectId);
    }catch(error){this.toast(error?.message||'تعذر إنشاء المشروع.');}
  }

  async openProject(projectId){if(!this.auth.authenticated)return this.showAuth();if(!this.store.openProject(projectId)){this.toast('المشروع غير موجود أو لم يعد متاحًا.');this.renderDashboard();return false}await this.showWorkspace(projectId);return true}
  async showWorkspace(){
    if(!this.auth.authenticated){this.showAuth();return this}
    if(!this.store.projectId){const first=this.store.listProjects()[0];if(first)this.store.openProject(first.id);else{this.createNewProject();return this}}
    try{await this.assetService.hydrateProjectAssets(this.store.project)}catch(error){console.warn('Asset hydration skipped',error)}
    this.router.go(APP_ROUTES.EDITOR);return this;
  }

  projectMenu(projectId){
    const project=this.store.listProjects().find(x=>x.id===projectId);if(!project)return;
    const current=projectId===this.store.projectId;
    const body=`<div class="list-stack"><button class="secondary-btn" id="pmOpen">فتح المشروع</button><button class="secondary-btn" id="pmRename">إعادة التسمية</button><button class="secondary-btn" id="pmDuplicate">نسخ المشروع</button><button class="secondary-btn" id="pmBackup">نسخة احتياطية</button><button class="danger-btn" id="pmDelete">حذف المشروع</button></div><div class="tips-card"><b>${current?'المشروع المفتوح حاليًا':'مشروع في مساحة الحساب'}</b><p>${project.pages} صفحات • ${project.nodes} عناصر • آخر تحديث ${esc(timeLabel(project.updatedAt))}</p></div>`;
    const modal=showModal($('modalHost'),{title:esc(project.name),body});
    modal.querySelector('#pmOpen').onclick=()=>{modal.remove();this.openProject(projectId)};
    modal.querySelector('#pmRename').onclick=()=>{const name=prompt('اسم المشروع الجديد',project.name);if(name?.trim()){if(current)this.store.transact('تسمية المشروع',p=>p.meta.name=name.trim());else this.repository.rename(this.auth.user.id,projectId,name.trim())}modal.remove();if(current)this.render();else this.renderDashboard()};
    modal.querySelector('#pmDuplicate').onclick=()=>{const copy=this.store.duplicateProject(projectId);modal.remove();this.renderDashboard();if(copy)this.toast('تم نسخ المشروع كمشروع مستقل.')};
    modal.querySelector('#pmBackup').onclick=()=>{modal.remove();if(current)this.showBackupManager();else{const saved=this.repository.get(this.auth.user.id,projectId);if(saved)this.managers.backupProject(saved)}};
    modal.querySelector('#pmDelete').onclick=()=>{if(!confirm('سيتم حذف المشروع نهائيًا من هذا المتصفح. هل تريد المتابعة؟'))return;this.repository.remove(this.auth.user.id,projectId);modal.remove();if(current){this.store.clearProject();this.showDashboard()}else this.renderDashboard()};
  }

  logout(){this.store.persistNow();this.auth.logout();this.store.clearAccount();this.showAuth()}

  boot(){
    if(this.booted)return;
    this.booted=true;this.panels.mount();this.inspector.mount($('inspector'));this.engine.mount();this.dialogs.bind();this.bindEditorUi();this.store.subscribe(()=>{if(this.router.route===APP_ROUTES.EDITOR)this.render()});window.addEventListener('beforeunload',()=>this.store.persistNow());window.addEventListener('resize',()=>this.syncDrawers());
  }

  bindEditorUi(){
    const on=(id,event,handler)=>$(id)?.addEventListener(event,handler);
    on('homeBtn','click',()=>{this.store.persistNow();this.showDashboard()});on('projectMenuBtn','click',()=>this.projectMenu(this.store.projectId));on('saveBtn','click',()=>{this.store.persistNow();this.toast(this.store.ui.saveError?'تعذر الحفظ':'تم الحفظ')});on('toolsMenuBtn','click',(event)=>{event.stopPropagation();const menu=$('toolsMenu');if(menu){const open=menu.classList.toggle('hidden')===false;event.currentTarget.setAttribute('aria-expanded',String(open))}});document.querySelectorAll('[data-top-tool]').forEach(button=>button.addEventListener('click',()=>{const action=button.dataset.topTool;$('toolsMenu')?.classList.add('hidden');$('toolsMenuBtn')?.setAttribute('aria-expanded','false');const actions={pages:()=>this.panels.pagesModal(),site:()=>this.showSiteSettings(),cms:()=>this.showCmsManager(),navigation:()=>this.showNavigationManager(),design:()=>this.showDesignManager(),quality:()=>this.dialogs.quality(),release:()=>this.showReleaseManager(),backup:()=>this.showBackupManager(),shortcuts:()=>this.dialogs.shortcuts()};actions[action]?.()}));document.addEventListener('click',(event)=>{if(!event.target.closest('.topbar-menu')&&!event.target.closest('#toolsMenuBtn')){$('toolsMenu')?.classList.add('hidden');$('toolsMenuBtn')?.setAttribute('aria-expanded','false')}});on('commandBtn','click',()=>this.commandPalette.open());on('siteSettingsBtnFooter','click',()=>this.showSiteSettings());on('cmsBtn','click',()=>this.showCmsManager());on('designBtn','click',()=>this.showDesignManager());on('siteSettingsBtn','click',()=>this.showSiteSettings());on('navigationBtn','click',()=>this.showNavigationManager());on('releaseBtn','click',()=>this.showReleaseManager());on('createSymbolBtn','click',()=>this.createSharedComponent());on('auditBtn','click',()=>this.showAudit());on('backupBtn','click',()=>this.showBackupManager());on('undoBtn','click',()=>this.store.undo());on('redoBtn','click',()=>this.store.redo());on('leftToggle','click',()=>this.toggle('leftOpen'));on('rightToggle','click',()=>this.toggle('rightOpen'));on('leftClose','click',()=>this.setOpen('leftOpen',false));on('rightClose','click',()=>this.setOpen('rightOpen',false));on('leftRail','click',()=>this.setOpen('leftOpen',true));on('rightRail','click',()=>this.setOpen('rightOpen',true));on('managePagesBtn','click',()=>this.panels.pagesModal());on('pageSelect','change',e=>this.selectPage(e.target.value));on('pagePrev','click',()=>this.stepPage(-1));on('pageNext','click',()=>this.stepPage(1));
    document.querySelectorAll('.device-btn').forEach(button=>button.addEventListener('click',()=>this.engine.setDevice(button.dataset.device)));window.addEventListener('keydown',e=>this.keyboard(e));
  }
  selectPage(id){if(!this.store.setActivePage(id))this.render()}
  stepPage(direction){const pages=this.store.project.pages,index=pages.findIndex(p=>p.id===this.store.project.activePageId);if(index<0||pages.length<2)return;this.selectPage(pages[(index+direction+pages.length)%pages.length].id)}
  toggle(key){this.setOpen(key,!this.store.ui[key])}
  setOpen(key,value){
    const open=Boolean(value);
    if(open&&matchMedia('(max-width:900px)').matches&&['leftOpen','rightOpen'].includes(key)){
      this.mobileDrawerKey=key;
      this.store.setUI({[key]:true,[key==='leftOpen'?'rightOpen':'leftOpen']:false});
      return;
    }
    this.store.setUI({[key]:open});
  }
  syncDrawers(){
    const root=document.querySelector('.workspace-main');if(!root)return;
    const left=$('leftDrawer'),right=$('rightDrawer'),leftRail=$('leftRail'),rightRail=$('rightRail');
    const mobile=matchMedia('(max-width:900px)').matches;
    if(mobile&&this.store.ui.leftOpen&&this.store.ui.rightOpen){
      const keep=this.mobileDrawerKey==='rightOpen'?'rightOpen':'leftOpen';
      const close=keep==='leftOpen'?'rightOpen':'leftOpen';
      this.store.setUI({[keep]:true,[close]:false},{emit:false});
    }
    root.classList.toggle('left-collapsed',!this.store.ui.leftOpen);
    root.classList.toggle('right-collapsed',!this.store.ui.rightOpen);
    root.classList.toggle('drawer-mobile',mobile);
    root.style.removeProperty('grid-template-columns');
    left?.classList.toggle('is-collapsed',!this.store.ui.leftOpen);
    right?.classList.toggle('is-collapsed',!this.store.ui.rightOpen);
    left?.classList.remove('hidden');right?.classList.remove('hidden');
    left?.setAttribute('aria-hidden',String(!this.store.ui.leftOpen));
    right?.setAttribute('aria-hidden',String(!this.store.ui.rightOpen));
    leftRail?.classList.toggle('hidden-rail',this.store.ui.leftOpen);
    rightRail?.classList.toggle('hidden-rail',this.store.ui.rightOpen);
    leftRail?.setAttribute('aria-hidden',String(this.store.ui.leftOpen));
    rightRail?.setAttribute('aria-hidden',String(this.store.ui.rightOpen));
    leftRail?.setAttribute('aria-label',this.store.ui.leftOpen?'إخفاء لوحة العناصر':'إظهار لوحة العناصر');
    rightRail?.setAttribute('aria-label',this.store.ui.rightOpen?'إخفاء لوحة التخصيص':'إظهار لوحة التخصيص');
    requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(()=>{this.engine?.reflowHost?.();this.engine?.centerStage?.()})));
  }
  keyboard(event){const typing=event.target?.matches?.('input,textarea,select,[contenteditable="true"]'),mod=event.ctrlKey||event.metaKey;if(mod&&event.key.toLowerCase()==='k'&&!typing){event.preventDefault();this.commandPalette.open();return;}if(mod&&event.key.toLowerCase()==='z'){event.preventDefault();event.shiftKey?this.store.redo():this.store.undo();return}if(mod&&event.key.toLowerCase()==='y'){event.preventDefault();this.store.redo();return}if(mod&&event.shiftKey&&event.key.toLowerCase()==='z'){event.preventDefault();this.store.redo();return}if(mod&&event.key.toLowerCase()==='s'){event.preventDefault();this.store.persistNow();this.toast(this.store.ui.saveError?'تعذر الحفظ':'تم حفظ المشروع');return}if(mod&&event.key==='='&&!typing){event.preventDefault();this.engine.setZoom(this.store.ui.zoom+.1);return}if(mod&&event.key==='-'&&!typing){event.preventDefault();this.engine.setZoom(this.store.ui.zoom-.1);return}if(event.key.toLowerCase()==='f'&&!typing&&!mod)this.engine.fit()}
  showNavigationManager(){return this.managers.navigation()}
  showReleaseManager(){return this.managers.release()}
  showBackupManager(){return this.managers.backup()}

  showCmsManager(){const collections=this.store.project.cms?.collections||[];const body=`<div class="cms-toolbar"><div><b>Collections</b><small>${collections.length} مجموعات • بيانات مرتبطة بالمشروع</small></div><button id="newCollection" class="primary-btn">＋ مجموعة جديدة</button></div><div class="cms-list">${collections.map(c=>`<article class="cms-manager-card"><div><b>${esc(c.name)}</b><small>${c.items?.length||0} عناصر • ${c.fields?.length||0} حقول • ${esc(c.route||'')}</small></div><div><button class="secondary-btn" data-open-collection="${esc(c.id)}">إدارة</button><button class="secondary-btn" data-add-item="${esc(c.id)}">＋ محتوى</button><button class="danger-btn" data-remove-collection="${esc(c.id)}">حذف</button></div></article>`).join('')||'<div class="tips-card">أنشئ أول Collection لتبدأ محتوى ديناميكيًا.</div>'}</div><div class="tips-card"><b>المحتوى منفصل عن التصميم</b><p>يمكن إعادة استخدام Collection نفسها في صفحات متعددة عبر مكوّن قائمة CMS دون نسخ المحتوى داخل الصفحة.</p></div>`;const modal=showModal($('modalHost'),{title:'مركز المحتوى CMS',body,wide:true});modal.querySelector('#newCollection')?.addEventListener('click',()=>{const name=prompt('اسم المجموعة','المقالات');if(name?.trim()){addCollection(this.store,name.trim());modal.remove();this.showCmsManager()}});modal.querySelectorAll('[data-open-collection]').forEach(b=>b.addEventListener('click',()=>{modal.remove();this.showCmsCollection(b.dataset.openCollection)}));modal.querySelectorAll('[data-add-item]').forEach(b=>b.addEventListener('click',()=>{modal.remove();this.showCmsItem(b.dataset.addItem)}));modal.querySelectorAll('[data-remove-collection]').forEach(b=>b.addEventListener('click',()=>{if(confirm('حذف Collection وعناصرها وكل روابطها؟')){removeCollection(this.store,b.dataset.removeCollection);modal.remove();this.showCmsManager()}}));return modal}

  showCmsCollection(collectionId){const collection=this.store.project.cms?.collections?.find(item=>item.id===collectionId);if(!collection)return null;const types=CMS_FIELD_TYPES.map(([value,label])=>`<option value="${esc(value)}">${esc(label)}</option>`).join('');const body=`<div class="cms-toolbar"><div><b>${esc(collection.name)}</b><small>${esc(collection.key||'')}</small></div><div><button id="addField" class="secondary-btn">＋ حقل</button><button id="addCmsItem" class="primary-btn">＋ عنصر</button></div></div><section class="cms-field-editor"><header><b>حقول المحتوى</b></header><div class="cms-list">${(collection.fields||[]).map(field=>`<article class="cms-manager-card"><div><b>${esc(field.label||field.key)}</b><small>${esc(field.key)} • ${esc(field.type||'text')}${field.required?' • مطلوب':''}</small></div><button class="danger-btn" data-remove-field="${esc(field.id)}">حذف</button></article>`).join('')||'<div class="tips-card">لا توجد حقول.</div>'}</div></section><section class="cms-item-editor"><header><b>العناصر (${collection.items?.length||0})</b></header><div class="cms-list">${(collection.items||[]).map(item=>`<article class="cms-manager-card"><div><b>${esc(item.data?.title||item.slug||'عنصر')}</b><small>${esc(item.slug||'')}</small></div><div><button class="secondary-btn" data-edit-item="${esc(item.id)}">تحرير</button><button class="danger-btn" data-remove-item="${esc(item.id)}">حذف</button></div></article>`).join('')||'<div class="tips-card">لا توجد عناصر بعد.</div>'}</div></section>`;const modal=showModal($('modalHost'),{title:`Collection: ${esc(collection.name)}`,body,wide:true});modal.querySelector('#addField')?.addEventListener('click',()=>{const label=prompt('اسم الحقل','عنوان');if(!label?.trim())return;const key=prompt('المفتاح الإنجليزي/Slug',label.trim());if(!key?.trim())return;const type=prompt(`نوع الحقل (${CMS_FIELD_TYPES.map(x=>x[0]).join(', ')})`,'text')||'text';const normalizedType=CMS_FIELD_TYPES.some(x=>x[0]===type)?type:'text';updateCollection(this.store,collectionId,{fields:[...(collection.fields||[]),{id:`field_${Date.now().toString(36)}`,key:key.trim().toLowerCase().replace(/[^a-z0-9_]+/g,'_'),label:label.trim(),type:normalizedType,required:false}]});modal.remove();this.showCmsCollection(collectionId)});modal.querySelector('#addCmsItem')?.addEventListener('click',()=>{modal.remove();this.showCmsItem(collectionId)});modal.querySelectorAll('[data-remove-field]').forEach(b=>b.addEventListener('click',()=>{if(!confirm('حذف الحقل؟ سيتم إزالة تعريفه فقط ولن يتم حذف بقية العناصر.'))return;updateCollection(this.store,collectionId,{fields:(collection.fields||[]).filter(field=>field.id!==b.dataset.removeField)});modal.remove();this.showCmsCollection(collectionId)}));modal.querySelectorAll('[data-edit-item]').forEach(b=>b.addEventListener('click',()=>{modal.remove();this.showCmsItem(collectionId,b.dataset.editItem)}));modal.querySelectorAll('[data-remove-item]').forEach(b=>b.addEventListener('click',()=>{if(!confirm('حذف العنصر؟'))return;removeItem(this.store,collectionId,b.dataset.removeItem);modal.remove();this.showCmsCollection(collectionId)}));return modal}

  showCmsItem(collectionId,itemId=null){const collection=this.store.project.cms?.collections?.find(item=>item.id===collectionId);if(!collection)return null;const item=collection.items?.find(x=>x.id===itemId)||null;const data=item?.data||{};const inputFor=field=>{const value=String(data[field.key]??(field.key==='title'?(item?.data?.title||''):'')??'');if(['textarea','richtext'].includes(field.type))return `<div class="field"><label>${esc(field.label||field.key)}</label><textarea data-cms-field="${esc(field.key)}" ${field.required?'required':''}>${esc(value)}</textarea></div>`;const type=field.type==='email'?'email':field.type==='number'?'number':'text';return `<div class="field"><label>${esc(field.label||field.key)}</label><input data-cms-field="${esc(field.key)}" type="${type}" value="${esc(value)}" ${field.required?'required':''}></div>`};const body=`<div class="page-settings-grid">${(collection.fields||[]).map(inputFor).join('')||'<div class="tips-card">أضف حقولًا إلى Collection أولًا.</div>'}</div><div class="tips-card"><b>${item?'تحرير عنصر':'عنصر جديد'}</b><p>يتم حفظ البيانات داخل المشروع الحالي ويمكن عرضها عبر مكوّن Collection List.</p></div>`;const modal=showModal($('modalHost'),{title:`${item?'تحرير':'إضافة'} محتوى — ${esc(collection.name)}`,body,wide:true,actions:[{label:'إلغاء',onClick:()=>this.showCmsCollection(collectionId)},{label:item?'حفظ التغييرات':'إنشاء العنصر',kind:'primary',onClick:()=>{const patch={};for(const control of modal.querySelectorAll('[data-cms-field]'))patch[control.dataset.cmsField]=control.value.trim();if(item)updateItem(this.store,collectionId,item.id,patch);else addItem(this.store,collectionId,patch);modal.remove();this.showCmsCollection(collectionId)}}]});return modal}

  showDesignManager(){return this.dialogs.theme()}

  showSiteSettings(){const site=this.store.project.site||{},brand=site.brand||{},links=site.links||{},indexing=site.indexing||{};const modal=showModal($('modalHost'),{title:'إعدادات الموقع',body:`<div class="simple-manager-note"><b>ابدأ بالأساسي</b><br>عدّل اسم الموقع ووصفه وبيانات التواصل. باقي الإعدادات اختيارية.</div><div class="manager-tabs"><button class="active" data-site-tab="basic">أساسي</button><button data-site-tab="search">الظهور في البحث</button><button data-site-tab="contact">التواصل</button></div><section data-site-panel="basic"><div class="design-manager-grid"><div class="field"><label>اسم الموقع</label><input data-site="title" value="${esc(site.title||'')}"></div><div class="field"><label>اسم العلامة</label><input data-site="brand.name" value="${esc(brand.name||'')}"></div><div class="field"><label>وصف الموقع</label><textarea data-site="description" placeholder="اكتب وصفًا قصيرًا للموقع">${esc(site.description||'')}</textarea></div><div class="field"><label>رابط الموقع (اختياري)</label><input data-site="baseUrl" placeholder="https://example.com" value="${esc(site.baseUrl||'')}"></div></div></section><section data-site-panel="search" class="hidden"><div class="simple-section"><h4>هل تريد ظهور الموقع في البحث؟</h4><label class="check-row"><input type="checkbox" data-site-check="seo.enabled" ${this.store.project.seo?.enabled!==false?'checked':''}> نعم، اسمح لمحركات البحث بفهرسته</label><label class="check-row"><input type="checkbox" data-site-check="indexing.sitemap" ${indexing.sitemap!==false?'checked':''}> أنشئ Sitemap عند التصدير</label></div></section><section data-site-panel="contact" class="hidden"><div class="design-manager-grid"><div class="field"><label>البريد الإلكتروني</label><input data-site="links.email" value="${esc(links.email||'')}"></div><div class="field"><label>الهاتف</label><input data-site="links.phone" value="${esc(links.phone||'')}"></div><div class="field"><label>واتساب</label><input data-site="links.whatsapp" value="${esc(links.whatsapp||'')}"></div></div></section>`});modal.querySelectorAll('[data-site-tab]').forEach(b=>b.onclick=()=>{modal.querySelectorAll('[data-site-tab]').forEach(x=>x.classList.toggle('active',x===b));modal.querySelectorAll('[data-site-panel]').forEach(x=>x.classList.toggle('hidden',x.dataset.sitePanel!==b.dataset.siteTab))});const setPath=(project,path,value)=>{const parts=path.split('.');let obj=project;for(let i=0;i<parts.length-1;i++)obj=obj[parts[i]]||(obj[parts[i]]={});obj[parts.at(-1)]=value};modal.querySelectorAll('[data-site]').forEach(input=>input.addEventListener('change',()=>this.store.transact('تعديل إعدادات الموقع',project=>{setPath(project,input.dataset.site,input.value.trim());if(input.dataset.site==='description')project.meta.description=input.value.trim()})));modal.querySelectorAll('[data-site-check]').forEach(input=>input.addEventListener('change',()=>this.store.transact('تعديل إعدادات الموقع',project=>setPath(project,input.dataset.siteCheck,input.checked))));return modal}

  showAudit(){return this.dialogs.quality()}

  createSharedComponent(){if(!this.store.ui.selected){this.toast('حدد عنصرًا أولًا لإنشاء مكون مشترك.');return}const name=prompt('اسم المكون المشترك','مكون مشترك');if(name?.trim()){const symbol=createSymbolFromSelection(this.store,name.trim());if(symbol)this.toast('تم إنشاء المكون المشترك.')}}

  render(){if(!this.booted||this.router.route!==APP_ROUTES.EDITOR)return;this.syncDrawers();this.engine.sync();this.panels.renderLibrary();this.panels.renderLayers();this.panels.renderInteractions();this.inspector.setDevice(this.store.ui.device);this.inspector.render();$('projectName').textContent=this.store.project.meta.name;$('workspaceUser')?.replaceChildren(document.createTextNode(this.auth.user?.name||'الحساب'));$('workspaceMode')?.replaceChildren(document.createTextNode(modeLabel(this.auth.user?.mode)));const status=this.store.saveState==='error'?'⚠ خطأ الحفظ':this.store.saveState==='pending'?'● جارٍ الحفظ':'● محفوظ';$('saveStatus').textContent=status;$('canvasPageTitle').textContent=this.store.activePage()?.name||'الصفحة';$('pageCountLabel').textContent=`${this.store.project.pages.length} ${this.store.project.pages.length===1?'صفحة':'صفحات'}`;$('elementCountLabel').textContent=`${this.store.nodeCount()} عنصر`;$('advancedDevicesBtn')?.replaceChildren(document.createTextNode(this.store.ui.advancedDevices?'إغلاق إعدادات الأجهزة':'إعدادات الأجهزة'));$('undoBtn').disabled=!this.store.canUndo;$('redoBtn').disabled=!this.store.canRedo;document.querySelectorAll('.device-btn').forEach(button=>button.classList.toggle('active',button.dataset.device===this.store.ui.device))}
  toast(message){let host=document.querySelector('.toast-wrap');if(!host){host=document.createElement('div');host.className='toast-wrap';document.body.appendChild(host)}const item=document.createElement('div');item.className='toast';item.setAttribute('role','status');item.textContent=message;host.appendChild(item);setTimeout(()=>item.remove(),1800)}
}
exports.App = App;
});
__modules.set("src/app/auth.js",(exports,__require)=>{
const {storage} = __require("src/core/storage.js");
const USERS_KEY='bunaa_v26_users';
const SESSION_KEY='bunaa_v26_session';
const LEGACY_USERS_KEYS=['bunaa_v25_users','bunaa_v21_users','bunaa_v20_users','bunaa_v19_users','bunaa_v18_users','bunaa_v17_users','bunaa_v16_users','bunaa_v15_users','bunaa_v14_users','bunaa_v13_users','bunaa_v12_users'];
const LEGACY_SESSION_KEYS=['bunaa_v25_session','bunaa_v21_session','bunaa_v20_session','bunaa_v19_session','bunaa_v18_session','bunaa_v17_session','bunaa_v16_session','bunaa_v15_session','bunaa_v14_session','bunaa_v13_session','bunaa_v12_session'];

const normalizeEmail=email=>String(email||'').trim().toLowerCase();
const cleanName=name=>String(name||'').trim().replace(/\s+/g,' ');
const isEmail=email=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const makeId=(prefix='id')=>`${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,9)}`;

async function digest(value){
  const data=new TextEncoder().encode(value);
  if(globalThis.crypto?.subtle){const hash=await crypto.subtle.digest('SHA-256',data);return [...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,'0')).join('')}
  let h=2166136261;for(const byte of data){h^=byte;h=Math.imul(h,16777619)}return (h>>>0).toString(16).padStart(8,'0');
}

function parse(key){try{const raw=storage.getItem(key);return raw?JSON.parse(raw):null}catch{return null}}
function loadUsers(){
  const current=parse(USERS_KEY);if(Array.isArray(current))return current;
  for(const key of LEGACY_USERS_KEYS){const legacy=parse(key);if(Array.isArray(legacy)){try{storage.setItem(USERS_KEY,JSON.stringify(legacy))}catch{};return legacy}}
  return [];
}
function saveUsers(users){storage.setItem(USERS_KEY,JSON.stringify(users))}
function loadSession(){
  const current=parse(SESSION_KEY);if(current)return current;
  for(const key of LEGACY_SESSION_KEYS){const legacy=parse(key);if(legacy){try{storage.setItem(SESSION_KEY,JSON.stringify(legacy))}catch{};return legacy}}
  return null;
}
class AuthStore{
  constructor(){this.user=null;this.hydrate()}
  hydrate(){const session=loadSession();const users=loadUsers();try{if(session?.guest&&session.userId==='guest_local'){this.user={id:'guest_local',name:'تجربة محلية',email:'',mode:'normal',guest:true,createdAt:'local'}}else this.user=session?.userId?users.find(item=>item.id===session.userId)||null:null}catch{this.user=null}return this.user}
  get authenticated(){return Boolean(this.user)}
  async register({name,email,password,mode}){
    const clean=cleanName(name),normalized=normalizeEmail(email);if(clean.length<2)throw new Error('اكتب اسمًا صحيحًا.');if(!isEmail(normalized))throw new Error('اكتب بريدًا إلكترونيًا صحيحًا.');if(String(password||'').length<6)throw new Error('كلمة المرور يجب أن تكون 6 أحرف على الأقل.');if(!['normal','trainee'].includes(mode))throw new Error('اختر نوع الاستخدام.');
    const users=loadUsers();if(users.some(item=>item.email===normalized))throw new Error('هذا البريد مسجل بالفعل. استخدم تسجيل الدخول.');
    const salt=makeId('salt'),passwordHash=await digest(`${salt}:${password}`);const user={id:makeId('user'),name:clean,email:normalized,passwordHash,salt,mode,createdAt:new Date().toISOString()};users.push(user);saveUsers(users);this.user=user;this.saveSession();return user;
  }
  loginGuest(){this.user={id:'guest_local',name:'تجربة محلية',email:'',mode:'normal',guest:true,createdAt:'local'};this.saveSession({guest:true});return this.user}
  async login(email,password){const normalized=normalizeEmail(email),users=loadUsers(),user=users.find(item=>item.email===normalized);if(!user)throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة.');const passwordHash=await digest(`${user.salt}:${password||''}`);if(passwordHash!==user.passwordHash)throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة.');this.user=user;this.saveSession();return user}
  updateUser(patch={}){if(!this.user)return null;const users=loadUsers(),index=users.findIndex(item=>item.id===this.user.id);if(index<0)return null;const next={...users[index],...patch,id:users[index].id,email:users[index].email};users[index]=next;saveUsers(users);this.user=next;this.saveSession();return next}
  logout(){this.user=null;try{storage.removeItem(SESSION_KEY)}catch{}}
  saveSession(extra={}){storage.setItem(SESSION_KEY,JSON.stringify({userId:this.user.id,...extra}))}
}
exports.AuthStore = AuthStore;
});
__modules.set("src/app/command-palette.js",(exports,__require)=>{
const {showModal} = __require("src/ui/modal.js");
class CommandPalette {
  constructor(app) { this.app = app; this.commands = this.build(); }
  build() {
    return [
      ['new-page', 'صفحة جديدة', () => this.app.panels.pagesModal()],
      ['templates', 'فتح القوالب', () => this.app.panels.templatesModal()],
      ['sections', 'فتح الأقسام', () => this.app.panels.sectionsModal()],
      ['assets', 'مكتبة الوسائط', () => this.app.panels.assetsModal()],
      ['cms', 'محتوى الموقع CMS', () => this.app.showCmsManager()],
      ['design', 'نظام التصميم', () => this.app.showDesignManager()],
      ['audit', 'فحص جودة الموقع', () => this.app.showAudit()],
      ['navigation', 'إدارة التنقل والقوائم', () => this.app.showNavigationManager()],
      ['release', 'إدارة الإصدارات', () => this.app.showReleaseManager()],
      ['backup', 'نسخة احتياطية واستعادة', () => this.app.showBackupManager()],
      ['preview', 'معاينة الموقع', () => this.app.dialogs.preview()],
      ['export', 'تصدير الموقع', () => this.app.dialogs.export()],
      ['save', 'حفظ المشروع', () => this.app.store.persistNow()],
    ];
  }
  open() {
    const body = `<div class="command-palette"><input id="commandQuery" class="command-search" placeholder="ابحث عن أمر…"><div id="commandList">${this.render(this.commands)}</div></div>`;
    const modal = showModal(document.getElementById('modalHost'), { title: 'مركز الأوامر', body, wide: true });
    const input = modal.querySelector('#commandQuery');
    const renderList = () => { const q = String(input.value || '').trim().toLowerCase(); modal.querySelector('#commandList').innerHTML = this.render(this.commands.filter(item => item[1].toLowerCase().includes(q))); this.wire(modal); };
    input.addEventListener('input', renderList); this.wire(modal); setTimeout(() => input.focus(), 0); return modal;
  }
  render(commands) { return commands.map(([id,label]) => `<button class="command-row" type="button" data-command="${id}"><span>⌘</span><b>${label}</b><small>Enter</small></button>`).join('') || '<div class="tips-card">لا يوجد أمر بهذا الاسم.</div>'; }
  wire(modal) { modal.querySelectorAll('[data-command]').forEach(button => button.onclick = () => { const item = this.commands.find(command => command[0] === button.dataset.command); modal.remove(); item?.[2]?.(); }); }
}
exports.CommandPalette = CommandPalette;
});
__modules.set("src/app/managers.js",(exports,__require)=>{
const {showModal} = __require("src/ui/modal.js");
const {navigationActions,getMenus} = __require("src/features/navigation/navigation-service.js");
const {compileSite} = __require("src/features/seo/index.js");
const {downloadBackup,parseBackup} = __require("src/features/backup/backup-service.js");

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' }[c]));
class StudioManagers {
  constructor(app) { this.app = app; }
  get store() { return this.app.store; }
  get host() { return document.getElementById('modalHost'); }
  toast(message) { this.app.toast(message); }

  navigation() {
    const project = this.store.project;
    const menus = getMenus(project);
    const menu = menus.find(item => item.id === project.navigation?.headerMenuId) || menus[0];
    const pages = project.pages || [];
    const items = menu?.items || [];
    const body = `<div class="manager-toolbar"><div><b>القائمة الرئيسية</b><small>${items.length} عناصر • ${pages.length} صفحات</small></div><div class="manager-toolbar-actions"><button id="managerAddPage" class="primary-btn">＋ صفحة</button><button id="managerAddUrl" class="secondary-btn">＋ رابط خارجي</button></div></div><div class="navigation-manager">${items.map((item,index)=>{const target=pages.find(page=>page.id===item.targetId);return `<article class="navigation-row"><span class="nav-order">${index+1}</span><div><b>${esc(item.label||target?.name||'رابط')}</b><small>${item.type==='page'?(target?`صفحة: ${esc(target.name)}`:'صفحة مفقودة'):`${esc(item.url||'رابط خارجي')}`}</small></div><div class="navigation-actions"><button data-nav-up="${esc(item.id)}" ${index===0?'disabled':''}>↑</button><button data-nav-down="${esc(item.id)}" ${index===items.length-1?'disabled':''}>↓</button><button data-nav-remove="${esc(item.id)}">×</button></div></article>`;}).join('') || '<div class="tips-card">لا توجد عناصر.</div>'}</div><div class="tips-card"><b>التنقل مرتبط بالنموذج</b><p>تغيير ترتيب الصفحات لا يلزم أن يغيّر ترتيب القائمة؛ القائمة أصبحت كيانًا مستقلًا ويمكن أن تحتوي صفحات وروابط خارجية.</p></div>`;
    const modal = showModal(this.host,{title:'Navigation Manager',body,wide:true});
    modal.querySelector('#managerAddPage')?.addEventListener('click',()=>{
      if (!menu) return;
      const page = pages.find(p => !items.some(item => item.type === 'page' && item.targetId === p.id));
      if (!page) { this.toast('كل الصفحات الظاهرة موجودة في القائمة.'); return; }
      navigationActions.addMenuItem(this.store,menu.id,{label:page.name,type:'page',targetId:page.id}); modal.remove(); this.navigation();
    });
    modal.querySelector('#managerAddUrl')?.addEventListener('click',()=>{
      if (!menu) return;
      const label = prompt('اسم الرابط','رابط خارجي'); const url = prompt('الرابط','https://');
      if (label?.trim() && url?.trim()) { navigationActions.addMenuItem(this.store,menu.id,{label:label.trim(),type:'url',url:url.trim(),newTab:true}); modal.remove(); this.navigation(); }
    });
    modal.querySelectorAll('[data-nav-up]').forEach(button=>button.onclick=()=>{navigationActions.reorderMenuItem(this.store,menu.id,button.dataset.navUp,'up');modal.remove();this.navigation()});
    modal.querySelectorAll('[data-nav-down]').forEach(button=>button.onclick=()=>{navigationActions.reorderMenuItem(this.store,menu.id,button.dataset.navDown,'down');modal.remove();this.navigation()});
    modal.querySelectorAll('[data-nav-remove]').forEach(button=>button.onclick=()=>{navigationActions.removeMenuItem(this.store,menu.id,button.dataset.navRemove);modal.remove();this.navigation()});
    return modal;
  }

  release() {
    const state = this.app.releaseService.inspect();
    const release = state.release;
    const audit = state.diagnostics;
    const issues = [...audit.issues,...audit.warnings];
    const body = `<div class="release-summary"><div class="release-stat"><b>الحالة</b><strong>${esc(release.status||'draft')}</strong></div><div class="release-stat"><b>رقم الإصدار</b><strong>${Number(release.version||1)}</strong></div><div class="release-stat"><b>الجودة</b><strong>${audit.score}/100</strong></div></div><div class="quality-list">${issues.map(item=>`<article class="quality-item ${item.severity==='error'?'bad':'warn'}"><b>${esc(item.title)}</b><small>${esc(item.detail)}</small></article>`).join('') || '<article class="quality-item good">✓ لا توجد مشكلات أساسية تمنع الإصدار.</article>'}</div><div class="modal-actions"><button id="releasePrepare" class="secondary-btn">تجهيز الإصدار</button><button id="releasePublish" class="primary-btn" ${state.canPublish?'':'disabled'}>اعتماد محلي</button>${release.status==='published'?'<button id="releaseDraft" class="danger-btn">إرجاع لمسودة</button>':''}</div><div class="tips-card"><b>الإصدار المحلي</b><p>هذه الخطوة تغير حالة المشروع وتسجل رقم الإصدار داخل ملف المشروع. الاستضافة والنشر على نطاق فعلي تحتاج خدمة نشر خارجية لاحقًا.</p></div>`;
    const modal = showModal(this.host,{title:'Release Manager',body,wide:true});
    modal.querySelector('#releasePrepare')?.addEventListener('click',()=>{this.app.releaseService.markReady();modal.remove();this.release()});
    modal.querySelector('#releasePublish')?.addEventListener('click',()=>{const result=this.app.releaseService.publish();if(!result.ok){this.toast('أصلح أخطاء التدقيق أولًا.');return}modal.remove();this.toast('تم اعتماد الإصدار محليًا.');this.release()});
    modal.querySelector('#releaseDraft')?.addEventListener('click',()=>{this.app.releaseService.unpublish();modal.remove();this.release()});
    return modal;
  }

  backupProject(project=this.store.project) {
    return downloadBackup(project);
  }

  backup() {
    const body = `<div class="backup-layout"><article class="backup-card"><span class="eyebrow">EXPORT</span><b>نسخة احتياطية كاملة</b><p>النسخة تشمل الصفحات، CMS، المكونات المشتركة، الوسائط، Design System، التفاعلات، التنقل وإعدادات SEO.</p><button id="downloadBackup" class="primary-btn">تنزيل .bunaa.json</button></article><article class="backup-card"><span class="eyebrow">RESTORE</span><b>استعادة مشروع</b><p>سيتم إنشاء نسخة جديدة من الملف المستورد حتى لا يتم الكتابة فوق المشروع الحالي.</p><input id="backupInput" type="file" accept=".json,.bunaa.json,application/json"><button id="restoreBackup" class="secondary-btn" disabled>استعادة كمشروع جديد</button></article></div>`;
    const modal = showModal(this.host,{title:'Backup & Restore',body,wide:true});
    modal.querySelector('#downloadBackup')?.addEventListener('click',()=>downloadBackup(this.store.project));
    const input=modal.querySelector('#backupInput'); const restore=modal.querySelector('#restoreBackup');
    input?.addEventListener('change',()=>{restore.disabled=!(input.files?.length)});
    restore?.addEventListener('click',async()=>{const file=input.files?.[0];if(!file)return;try{const project=parseBackup(await file.text());const saved=this.app.repository.importProject(this.app.auth.user.id,project,{duplicateId:true});this.store.openProject(saved.meta.id);modal.remove();this.app.showWorkspace(saved.meta.id);this.toast('تمت الاستعادة كمشروع مستقل.')}catch(error){this.toast(error?.message||'ملف غير صالح.')}});
    return modal;
  }

  siteReport() {
    const result = compileSite(this.store.project);
    return result;
  }
}
exports.StudioManagers = StudioManagers;
});
__modules.set("src/app/router.js",(exports,__require)=>{
const APP_ROUTES=Object.freeze({AUTH:'auth',DASHBOARD:'dashboard',EDITOR:'editor'});
class AppRouter{
  constructor(){this.route=APP_ROUTES.AUTH;this.listeners=new Set()}
  go(route,payload=null){if(!Object.values(APP_ROUTES).includes(route))return false;const changed=this.route!==route;this.route=route;for(const fn of [...this.listeners]){try{fn(route,payload,changed)}catch(error){console.error('AppRouter listener failed',error)}}return changed}
  subscribe(fn){this.listeners.add(fn);return()=>this.listeners.delete(fn)}
}
exports.APP_ROUTES = APP_ROUTES;
exports.AppRouter = AppRouter;
});
__modules.set("src/catalog/components.js",(exports,__require)=>{
const {makeNode} = __require("src/core/model.js");
const iconMap={'document-viewer':'PDF','file-card':'▤','media-grid':'▧','video-gallery':'▶','audio-playlist':'♫','page-embed':'▣','html-snippet':'HTML',heading:'H',text:'T',button:'↗',link:'↗',image:'▧',section:'▦',container:'▣',grid:'▤',columns:'Ⅱ',stack:'≡',hero:'✦',card:'□',navbar:'☰',footer:'▰',list:'☷',quote:'❝',divider:'—',spacer:'↕',gallery:'▧',video:'▶',audio:'♪',form:'☷',input:'⌨',textarea:'▤',select:'▾',checkbox:'✓',radio:'◉',search:'⌕',file:'↥',tabs:'▤',accordion:'⌄',dropdown:'▾',alert:'!',badge:'●',progress:'◐',stats:'123',timeline:'↝',pricing:'$',testimonial:'★',table:'▤',chart:'▥',calendar:'▦',product:'◫',faq:'?',rating:'★★★★★',counter:'01',social:'◎',gradient:'◩',glass:'◈',marquee:'→',spaced:'↔',group:'◌'};
const def=(type,label,category,description,factory)=>({type,label,category,description,icon:iconMap[type]||'◇',factory});
const t=text=>makeNode('text',{text},{fontSize:16,color:'#626b7c',lineHeight:1.8});
const h=text=>makeNode('heading',{text},{fontSize:42,fontWeight:800,lineHeight:1.15,color:'#171b2a'});
const btn=text=>makeNode('button',{text,url:'#',action:'url'},{background:'#5b5ce2',color:'#fff',fontSize:13,fontWeight:800,paddingY:11,paddingX:20,radius:11});
const demoImage=()=>{const svg='<svg xmlns="http://www.w3.org/2000/svg" width="900" height="500"><defs><linearGradient id="g"><stop stop-color="#eeeeff"/><stop offset="1" stop-color="#e8f5ef"/></linearGradient></defs><rect width="900" height="500" fill="url(#g)"/><circle cx="190" cy="210" r="90" fill="#5b5ce2" opacity=".15"/><rect x="350" y="150" width="310" height="28" rx="14" fill="#5b5ce2" opacity=".22"/><rect x="350" y="205" width="240" height="16" rx="8" fill="#7a8498" opacity=".22"/></svg>';return makeNode('image',{src:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg),alt:'صورة توضيحية'},{width:'100%',height:300,radius:16,objectFit:'cover'})};
const categories=[['all','الكل'],['basic','أساسي'],['layout','تخطيط'],['media','وسائط'],['forms','نماذج'],['ui','واجهة'],['data','بيانات'],['marketing','تسويق'],['visual','زخرفة']];
const definitions=[
 def('heading','عنوان','basic','عنوان رئيسي أو فرعي',()=>h('عنوان جديد')),
 def('text','نص','basic','فقرة قابلة للتحرير',()=>t('اكتب نصًا واضحًا ومفيدًا هنا.')),
 def('button','زر','basic','إجراء أو رابط',()=>btn('ابدأ الآن')),
 def('link','رابط','basic','رابط داخلي أو خارجي',()=>makeNode('link',{text:'اقرأ المزيد',url:'#'},{color:'#5b5ce2'})),
 def('list','قائمة','basic','نقاط مرتبة',()=>makeNode('list',{items:'الميزة الأولى\nالميزة الثانية\nالميزة الثالثة'},{})),
 def('quote','اقتباس','basic','نص بارز',()=>makeNode('quote',{text:'جملة مهمة.'},{background:'#f6f7fb',padding:20,radius:14})),
 def('divider','فاصل','basic','فاصل بصري',()=>makeNode('divider',{}, {color:'#e4e7ef',marginTop:18,marginBottom:18})),
 def('spacer','مساحة','basic','مسافة فارغة',()=>makeNode('spacer',{}, {height:40})),
 def('section','قسم','layout','قسم عريض',()=>makeNode('section',{}, {background:'#f7f8fc',padding:40},[h('قسم جديد'),t('محتوى القسم هنا.')])),
 def('container','حاوية','layout','حاوية بعرض محدد',()=>makeNode('container',{}, {maxWidth:1040,paddingX:24})),
 def('grid','شبكة','layout','شبكة أعمدة',()=>makeNode('grid',{count:3,gap:16},{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:16},[makeNode('card',{title:'بطاقة 1',text:'وصف'}),makeNode('card',{title:'بطاقة 2',text:'وصف'}),makeNode('card',{title:'بطاقة 3',text:'وصف'})])),
 def('columns','أعمدة','layout','تخطيط عمودي/أفقي',()=>makeNode('columns',{count:2,gap:18},{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:18})),
 def('stack','مجموعة','layout','ترتيب رأسي',()=>makeNode('stack',{gap:12},{display:'flex',flexDirection:'column',gap:12})),
 def('spaced','توزيع','layout','توزيع بين طرفين',()=>makeNode('spaced',{gap:12},{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12})),
 def('group','مجموعة عامة','layout','حاوية بسيطة',()=>makeNode('group',{},{})),
 def('hero','واجهة افتتاحية','layout','Hero جاهز',()=>makeNode('hero',{}, {background:'linear-gradient(135deg,#f3f3ff,#eef8f3)',padding:58},[h('ابنِ صفحة تليق بفكرتك'),t('صمّم بسرعة وعاين النتيجة كما يراها الزائر.'),btn('ابدأ الآن')])),
 def('card','بطاقة','ui','بطاقة محتوى',()=>makeNode('card',{title:'عنوان البطاقة',text:'وصف قصير مفيد.',button:'اعرف المزيد',url:'#'},{background:'#fff',border:'1px solid #e7e9ef',padding:20,radius:15})),
 def('navbar','شريط تنقل','ui','تنقل الموقع',()=>makeNode('navbar',{brand:'بَنّاء',links:['الرئيسية','الخدمات','من نحن','تواصل']},{background:'#fff',paddingY:15,paddingX:22,borderBottom:'1px solid #eceef3'})),
 def('footer','تذييل','ui','نهاية الصفحة',()=>makeNode('footer',{brand:'بَنّاء',text:'كل الحقوق محفوظة.'},{background:'#151924',color:'#fff',padding:28})),
 def('tabs','تبويبات','ui','محتوى متعدد',()=>makeNode('tabs',{items:['نبذة','المميزات','الأسئلة']},{background:'#fff',padding:14,border:'1px solid #e9ebf1',radius:12})),
 def('accordion','أسئلة قابلة للفتح','ui','تفاصيل قابلة للطي',()=>makeNode('accordion',{items:['ما هو بَنّاء؟','هل أستطيع التصدير؟','هل أحتاج إلى كود؟']},{background:'#fff',padding:14,border:'1px solid #e6e8ef',radius:12})),
 def('dropdown','قائمة منسدلة','ui','اختيارات تفاعلية',()=>makeNode('dropdown',{label:'اختر خيارًا',items:['الخيار الأول','الخيار الثاني','الخيار الثالث']},{})),
 def('alert','تنبيه','ui','رسالة حالة',()=>makeNode('alert',{text:'هذه رسالة تنبيه مفيدة.'},{background:'#eef3ff',color:'#4e61a6',padding:14,radius:11})),
 def('badge','شارة','ui','وسم صغير',()=>makeNode('badge',{text:'جديد'},{background:'#f0f0ff',color:'#5759c9',paddingY:5,paddingX:10,radius:99,fontSize:10,fontWeight:800})),
 def('progress','تقدم','ui','نسبة إنجاز',()=>makeNode('progress',{value:72,label:'التقدم 72%'},{color:'#5b5ce2'})),
 def('stats','إحصاءات','ui','أرقام سريعة',()=>makeNode('stats',{items:[['+120','مشروع'],['98%','رضا'],['24','قالب']]},{background:'#fff',padding:18,radius:14,border:'1px solid #e7e9ef'})),
 def('timeline','خط زمني','ui','مراحل',()=>makeNode('timeline',{items:[['01','الفكرة'],['02','التصميم'],['03','الإطلاق']]},{})),
 def('pricing','خطط الأسعار','ui','خطط اشتراك',()=>makeNode('pricing',{plans:[['أساسي','مجاني'],['احترافي','$12'],['فريق','$29']]},{})),
 def('testimonial','رأي عميل','ui','شهادة',()=>makeNode('testimonial',{quote:'الأداة جعلت البناء أوضح وأسرع.',name:'عميل تجريبي'},{background:'#f8f8ff',padding:20,radius:14})),
 def('image','صورة','media','صورة مع alt',demoImage),
 def('gallery','معرض','media','صور متعددة',()=>makeNode('gallery',{count:6},{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10})),
 def('video','فيديو','media','تضمين فيديو',()=>makeNode('video',{url:'https://www.youtube.com/embed/ScMzIvxBSi4',title:'فيديو تجريبي'},{height:260,radius:14})),
 def('audio','صوت','media','مشغل صوت',()=>makeNode('audio',{src:'',title:'ملف صوتي'},{})),
 def('form','نموذج','forms','نموذج إدخال',()=>makeNode('form',{}, {background:'#fff',padding:20,border:'1px solid #e6e8ef',radius:14},[factory('input'),factory('input'),factory('textarea'),factory('checkbox'),btn('إرسال')])),
 def('input','حقل','forms','حقل نصي',()=>makeNode('input',{label:'الاسم',type:'text',placeholder:'اكتب هنا…'},{})),
 def('textarea','منطقة نص','forms','نص متعدد الأسطر',()=>makeNode('textarea',{label:'الرسالة',placeholder:'اكتب هنا…'},{})),
 def('select','اختيار','forms','قائمة خيارات',()=>makeNode('select',{label:'اختر',items:['الأول','الثاني','الثالث']},{})),
 def('checkbox','مربع اختيار','forms','اختيار',()=>makeNode('checkbox',{label:'أوافق على الشروط'},{})),
 def('radio','خيارات','forms','اختيار واحد',()=>makeNode('radio',{label:'الخيار الأول'},{})),
 def('search','بحث','forms','حقل بحث',()=>makeNode('search',{label:'بحث',placeholder:'ابحث…'},{})),
 def('file','رفع ملف','forms','اختيار ملف',()=>makeNode('file',{label:'رفع ملف'},{})),
 def('table','جدول','data','بيانات صفوف وأعمدة',()=>makeNode('table',{headers:['البند','الحالة','القيمة'],rows:[['صفحة','جاهزة','100%'],['تفاعل','جاهز','80%'],['تصدير','جاهز','100%']]},{})),
 def('chart','مخطط','data','رسم أعمدة بسيط',()=>makeNode('chart',{values:[40,65,52,78,90],labels:['ينا','فبر','مار','أبر','ماي']},{})),
 def('calendar','تقويم','data','تقويم بسيط',()=>makeNode('calendar',{month:'هذا الشهر'},{})),
 def('product','منتج','data','بطاقة منتج',()=>makeNode('product',{name:'منتج تجريبي',price:'49',currency:'ر.س',cta:'أضف إلى السلة',url:'#'},{})),
 def('faq','سؤال شائع','data','سؤال وإجابة',()=>makeNode('faq',{question:'كيف يعمل؟',answer:'عدّل المحتوى ثم عاين أو صدّر المشروع.'},{})),
 def('rating','تقييم','data','تقييم نجوم',()=>makeNode('rating',{value:4,label:'4 من 5'},{})),
 def('counter','عداد','data','رقم متحرك',()=>makeNode('counter',{value:1250,suffix:'+'},{})),
 def('social','روابط اجتماعية','data','روابط اجتماعية',()=>makeNode('social',{items:['X','Instagram','LinkedIn']},{})),
 def('gradient','تدرج','visual','خلفية متدرجة',()=>makeNode('gradient',{}, {height:120,background:'linear-gradient(135deg,#5b5ce2,#20a06a)',radius:14})),
 def('glass','بطاقة زجاجية','visual','مظهر زجاجي',()=>makeNode('glass',{text:'محتوى زجاجي'},{background:'rgba(255,255,255,.65)',backdropFilter:'blur(10px)',padding:22,radius:16,border:'1px solid rgba(255,255,255,.7)'})),
 def('marquee','شريط نص','visual','نص أفقي',()=>makeNode('marquee',{text:'بَنّاء • تصميم • تفاعل • تصدير'},{background:'#171b2a',color:'#fff',padding:12,radius:10}))
];

definitions.push(
 def('richtext','محتوى منسق','basic','محتوى طويل منظم',()=>makeNode('richtext',{text:'عنوان فرعي\nمحتوى منسق متعدد الأسطر.'},{fontSize:15,lineHeight:1.9,maxWidth:820})),
 def('avatar','صورة شخصية','media','صورة دائرية مع اسم',()=>makeNode('avatar',{name:'اسم المستخدم',src:''},{display:'flex',alignItems:'center',gap:10})),
 def('logo','شعار','basic','شعار نصي أو صورة',()=>makeNode('logo',{text:'علامتي'},{fontSize:20,fontWeight:900})),
 def('breadcrumbs','مسار تنقل','ui','تسلسل مسار الصفحة',()=>makeNode('breadcrumbs',{items:['الرئيسية','الخدمات','التفاصيل']},{fontSize:11,color:'#727a8c'})),
 def('chip-list','شرائح','ui','قائمة وسوم صغيرة',()=>makeNode('chip-list',{items:['جديد','مميز','سريع']},{})),
 def('feature-list','قائمة مزايا','ui','مزايا مع أوصاف',()=>makeNode('feature-list',{},{})),
 def('team','فريق','ui','بطاقات أعضاء الفريق',()=>makeNode('team',{},{})),
 def('logo-cloud','شعارات العملاء','ui','عرض شعارات الشركاء',()=>makeNode('logo-cloud',{},{})),
 def('stepper','خطوات','ui','خطوات مرقمة',()=>makeNode('stepper',{},{})),
 def('code','كتلة كود','basic','عرض كود قابل للنسخ',()=>makeNode('code',{code:'const site = "Bunaa";'},{background:'#151924',color:'#f7f8fc',padding:18,radius:12})),
 def('embed','محتوى مضمن','media','Iframe لمصدر خارجي',()=>makeNode('embed',{url:'https://example.com',title:'محتوى مضمن'},{height:320})),
 def('collection-list','قائمة CMS','data','عرض عناصر مجموعة محتوى',()=>makeNode('collection-list',{collectionId:'',limit:6},{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:14})),
 def('video-card','بطاقة فيديو','media','بطاقة مرئية للفيديو',()=>makeNode('video-card',{title:'فيديو تعريفي',duration:'02:40',url:'#'},{background:'#171b2a',color:'#fff',padding:20,radius:14})),
 def('compare','مقارنة','data','جدول مقارنة مبسط',()=>makeNode('compare',{items:[['الميزة','الأساسي','الاحترافي'],['صفحات','3','غير محدود'],['تخصيص','أساسي','متقدم']]},{})),
 def('callout','ملاحظة بارزة','ui','تنبيه معلوماتي',()=>makeNode('callout',{title:'نقطة مهمة',text:'ضع هنا المعلومة التي تريد أن يلاحظها الزائر.'},{background:'#fff7e8',padding:18,radius:14})),
 def('spinner','تحميل','visual','مؤشر تحميل',()=>makeNode('spinner',{}, {width:44,height:44,border:'4px solid #e5e7ee',borderTopColor:'#5b5ce2',borderRadius:999})),
 def('countdown','عداد تنازلي','data','عد تنازلي بصري',()=>makeNode('countdown',{days:3,hours:12,minutes:20},{fontSize:28,fontWeight:900})),
 def('cookie-banner','شريط موافقة','ui','شريط خصوصية جاهز',()=>makeNode('cookie-banner',{text:'نستخدم ملفات ضرورية لتحسين تجربة الموقع.',accept:'موافق'},{})),
 def('cta','قسم دعوة إجراء','marketing','دعوة إجراء مركزية',()=>makeNode('cta',{title:'ابدأ اليوم',text:'خطوة واحدة تفصلك عن الإطلاق.',button:'ابدأ الآن'},{background:'token:primary',color:'#fff',padding:32,radius:16})),
 def('newsletter','اشتراك بريد','marketing','نموذج اشتراك بسيط',()=>makeNode('newsletter',{title:'اشترك في التحديثات',placeholder:'بريدك الإلكتروني',button:'اشتراك'},{})),
 def('lead-form','نموذج عملاء محتملين','marketing','جمع اسم وبريد واحتياج',()=>makeNode('lead-form',{title:'تحدث معنا',button:'إرسال الطلب'},{})),
 def('social-proof','دليل اجتماعي','marketing','شعارات وتقييم قصير',()=>makeNode('social-proof',{label:'يثق بنا أكثر من 1,000 مستخدم'},{padding:16})),
 def('highlight','ميزة مميزة','marketing','بطاقة تركز على ميزة واحدة',()=>makeNode('highlight',{title:'أسرع طريقة',text:'أنجز المهمة في دقائق لا ساعات.'},{padding:24,radius:16,background:'#f5f6ff'})),
 def('announcement','شريط إعلان','marketing','إعلان أعلى الموقع',()=>makeNode('announcement',{text:'جديد: أطلقنا إصدارًا أكبر من بَنّاء.',button:'اعرف المزيد',url:'#'},{background:'#171b2a',color:'#fff',padding:10})),
 def('feature-comparison','مقارنة مزايا','marketing','مقارنة بين باقات',()=>makeNode('feature-comparison',{columns:['الأساسي','الاحترافي'],rows:[['دعم','✓','✓'],['تخصيص','—','✓'],['تحليلات','—','✓']]},{})),
 def('quote-banner','شريط اقتباس','marketing','عبارة مؤثرة قصيرة',()=>makeNode('quote-banner',{text:'التجربة الجيدة تبدأ من وضوح الفكرة.'},{fontSize:24,fontWeight:800,padding:28})),
 def('schedule','برنامج','data','جدول مواعيد بسيط',()=>makeNode('schedule',{items:[['09:00','التسجيل'],['10:00','الجلسة الأولى'],['12:00','استراحة']]},{})),
 def('icon-text','أيقونة ونص','ui','وحدة مختصرة مع أيقونة',()=>makeNode('icon-text',{icon:'✦',title:'ميزة مهمة',text:'وصف الميزة في سطرين.'},{display:'flex',gap:12,padding:16})),
 def('image-text','صورة ونص','marketing','قسم ثنائي بالصورة والمحتوى',()=>makeNode('image-text',{title:'فكرة واضحة',text:'ضع هنا وصفًا يشرح الفكرة أو الخدمة.',image:''},{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24,padding:24})),
 def('feature-grid','شبكة مزايا','marketing','مزايا متعددة في شبكة',()=>makeNode('feature-grid',{items:[['سريع','أداء واضح'],['مرن','تخصيص واسع'],['جاهز','تصدير مباشر']]},{})),
 def('contact-card','بطاقة تواصل','marketing','عنوان وتواصل',()=>makeNode('contact-card',{title:'تواصل معنا',email:'hello@example.com',phone:'+968 9000 0000',address:'مسقط، عُمان'},{padding:20,radius:14})),
 def('stat-card','إحصائية','data','رقم رئيسي مع وصف',()=>makeNode('stat-card',{value:'98%',label:'رضا العملاء',trend:'+12% هذا الشهر'},{padding:20,radius:14})),
 def('pricing-card','بطاقة سعر','marketing','سعر وخطة وإجراء',()=>makeNode('pricing-card',{name:'احترافي',price:'12 ر.ع',period:'شهريًا',button:'ابدأ الآن',features:['10 صفحات','دعم سريع','تصدير']},{padding:22,radius:16})),
 def('testimonial-card','شهادة عميل','marketing','شهادة مختصرة',()=>makeNode('testimonial-card',{quote:'تجربة واضحة وسريعة.',name:'عميل تجريبي',role:'مستخدم'},{padding:22,radius:16})),
 def('logo-row','صف شعارات','marketing','شعارات شركاء أو عملاء',()=>makeNode('logo-row',{items:['Acme','Nova','Orbit','Pixel']},{display:'flex',gap:24,alignItems:'center',justifyContent:'center',padding:20})),
 def('social-links','أزرار اجتماعية','marketing','روابط اجتماعية بارزة',()=>makeNode('social-links',{items:[['Instagram','#'],['LinkedIn','#'],['X','#']]},{display:'flex',gap:10})),
 def('download','زر تحميل','basic','رابط تحميل ملف',()=>makeNode('download',{text:'تحميل الملف',url:'#',filename:'file.pdf'},{background:'#171b2a',color:'#fff',paddingY:11,paddingX:18,radius:10})),
 def('map','خريطة مكان','media','بطاقة موقع دون خدمة خارجية',()=>makeNode('map',{title:'موقعنا',address:'مسقط، سلطنة عُمان',lat:'23.5880',lng:'58.3829'},{padding:24,radius:16,background:'#f3f4f8'})),
 def('back-to-top','عودة للأعلى','ui','زر يعود لأعلى الصفحة',()=>makeNode('back-to-top',{text:'↑ أعلى الصفحة'},{background:'#fff',border:'1px solid #e6e8ef',paddingY:8,paddingX:12,radius:999})),
 def('language-switcher','تبديل اللغة','ui','اختيار لغة واجهة الموقع',()=>makeNode('language-switcher',{languages:['AR','EN']},{border:'1px solid #e6e8ef',padding:8,radius:10})),
 def('divider-label','فاصل بعنوان','ui','فاصل مزود بعنوان',()=>makeNode('divider-label',{text:'أو'},{paddingY:12})),
 def('notice-bar','شريط ملاحظة','marketing','رسالة علوية قابلة للعرض',()=>makeNode('notice-bar',{text:'ملاحظة مهمة للزوار',button:'تفاصيل',url:'#'},{background:'#f5f6ff',padding:10,radius:10})),
 def('document-viewer','عارض PDF','media','عرض ملف PDF داخل الصفحة مع خيار فتحه',()=>makeNode('document-viewer',{assetId:'',title:'المستند',height:640},{width:'100%'})),
 def('file-card','بطاقة ملف','media','فتح أو تنزيل أي ملف من مكتبة الوسائط',()=>makeNode('file-card',{assetId:'',title:'ملف قابل للتنزيل',text:'يمكنك فتح الملف أو تنزيله.',button:'فتح الملف',download:true},{padding:18,border:'1px solid #e5e7ef',radius:14,background:'#fff'})),
 def('media-grid','شبكة وسائط','media','عرض صور وفيديو وصوت ومستندات مختارة',()=>makeNode('media-grid',{assetIds:[],columns:3,showCaptions:true},{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:14})),
 def('video-gallery','معرض فيديوهات','media','عدة فيديوهات بمشغلات فعلية',()=>makeNode('video-gallery',{assetIds:[],columns:2,title:'مقاطع الفيديو'},{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:16})),
 def('audio-playlist','قائمة صوت','media','ملفات صوت مع مشغل مستقل لكل ملف',()=>makeNode('audio-playlist',{assetIds:[],title:'استمع الآن'},{display:'grid',gap:12})),
 def('page-embed','عرض صفحة أو جزء منها','layout','إظهار صفحة داخلية كاملة أو قسم محدد أو نص منها',()=>makeNode('page-embed',{pageId:'',mode:'full',nodeId:'',textLimit:1800},{padding:14,border:'1px dashed #d8dcec',radius:12})),
 def('html-snippet','كتلة HTML آمنة','basic','إضافة نص HTML منسق مع إزالة السكربتات والخصائص الخطرة',()=>makeNode('html-snippet',{html:'<h2>عنوان جديد</h2>\n<p>اكتب محتواك هنا.</p>'},{padding:12}))
);
const definitionsByType=Object.fromEntries(definitions.map(d=>[d.type,d]));
const factory=type=>definitionsByType[type]?.factory?.()||makeNode('text',{text:`عنصر غير معروف: ${type}`},{});
const supportedTypes=new Set(definitions.map(d=>d.type));
const nodeIcon=type=>iconMap[type]||'◇';
const searchDefinitions=(q='',category='all')=>{const n=String(q).trim().toLowerCase();return definitions.filter(d=>(category==='all'||d.category===category)&&(!n||`${d.type} ${d.label} ${d.description}`.toLowerCase().includes(n)))};
exports.categories = categories;
exports.definitions = definitions;
exports.definitionsByType = definitionsByType;
exports.factory = factory;
exports.supportedTypes = supportedTypes;
exports.nodeIcon = nodeIcon;
exports.searchDefinitions = searchDefinitions;
});
__modules.set("src/catalog/sections.js",(exports,__require)=>{
const {makeNode} = __require("src/core/model.js");
const {factory} = __require("src/catalog/components.js");
const heading=text=>makeNode('heading',{text},{fontSize:38,fontWeight:850,lineHeight:1.12,marginBottom:10});
const body=text=>makeNode('text',{text},{fontSize:15,lineHeight:1.85,color:'token:muted',maxWidth:760});
const section=(children,style={})=>makeNode('section',{},{background:'token:surface',paddingY:'token:space6',paddingX:'token:space4',...style},children);
const grid=(children,count=3)=>makeNode('grid',{count,stackOnMobile:true},{display:'grid',gridTemplateColumns:`repeat(${count},minmax(0,1fr))`,gap:'token:space4'},children);
const sections=[
  {id:'hero',name:'Hero + دعوة إجراء',description:'افتتاحية قوية مع عنوان ووصف وزر.',build:()=>section([makeNode('heading',{text:'حوّل فكرتك إلى تجربة واضحة'},{fontSize:52,fontWeight:900}),body('ابدأ من هيكل جاهز ثم عدّل النصوص والألوان والمسافات حتى تصبح الصفحة لك.'),makeNode('button',{text:'ابدأ الآن',url:'#',action:'url'},{background:'token:primary',color:'#fff',paddingY:'token:space3',paddingX:'token:space5',radius:'token:radiusMd',fontWeight:850})],{background:'linear-gradient(135deg,#f3f3ff,#eef8f3)',paddingY:64})},
  {id:'features',name:'مميزات',description:'ثلاث أو أربع بطاقات لشرح القيمة.',build:()=>section([heading('لماذا هذا المنتج؟'),body('قسّم القيمة إلى نقاط قصيرة يسهل فهمها.'),grid([factory('card'),factory('card'),factory('card')],3)])},
  {id:'stats',name:'أرقام ونتائج',description:'شريط إحصائيات سريع.',build:()=>section([heading('أرقام تتكلم'),factory('stats')],{background:'token:soft'})},
  {id:'split',name:'صورة + محتوى',description:'قسم ثنائي مرن للمحتوى والصورة.',build:()=>section([makeNode('columns',{count:2,gap:28},{display:'grid',gridTemplateColumns:'1fr 1fr',gap:28},[factory('image'),makeNode('stack',{gap:12},{display:'flex',flexDirection:'column',gap:12},[heading('قصة بسيطة وواضحة'),body('استخدم هذا القسم لتشرح المنتج، الخدمة أو الخطوة التالية.'),factory('button')])])])},
  {id:'testimonial',name:'شهادات',description:'آراء العملاء مع تقييم.',build:()=>section([heading('ماذا يقول المستخدمون؟'),grid([factory('testimonial'),factory('testimonial')],2)])},
  {id:'pricing',name:'الأسعار',description:'ثلاث خطط مرتبة.',build:()=>section([heading('خطط تناسبك'),factory('pricing')],{background:'token:soft'})},
  {id:'faq',name:'أسئلة شائعة',description:'أسئلة قابلة للفتح.',build:()=>section([heading('أسئلة شائعة'),factory('accordion')])},
  {id:'contact',name:'تواصل',description:'نموذج تواصل جاهز.',build:()=>section([heading('تواصل معنا'),body('أرسل رسالتك وسنعود إليك.'),factory('form')],{background:'token:soft'})},
  {id:'cta',name:'دعوة ختامية',description:'قسم أخير يركز على الإجراء.',build:()=>section([heading('جاهز للخطوة التالية؟'),body('اختر الإجراء الأهم وضعه في مركز الصفحة.'),factory('button')],{background:'linear-gradient(135deg,#171b2a,#303655)',color:'#fff',paddingY:54})},
  {id:'announcement',name:'إعلان علوي',description:'شريط إعلان لخبر أو عرض.',build:()=>section([factory('announcement')],{paddingY:10,paddingX:18})},
  {id:'logos',name:'شعارات وثقة',description:'شعارات عملاء وشركاء.',build:()=>section([heading('يثق بنا الكثيرون'),factory('logo-cloud'),factory('social-proof')],{background:'token:soft'})},
  {id:'team',name:'فريق العمل',description:'أعضاء الفريق والأدوار.',build:()=>section([heading('فريقنا'),body('عرّف الزائر بالأشخاص خلف المنتج.'),factory('team')])},
  {id:'process',name:'كيف نعمل',description:'خطوات عملية واضحة.',build:()=>section([heading('كيف نعمل؟'),factory('stepper')],{background:'token:soft'})},
  {id:'blog',name:'شبكة مقالات',description:'بطاقات لمقالات أو محتوى CMS.',build:()=>section([heading('آخر المحتوى'),factory('collection-list'),grid([factory('card'),factory('card'),factory('card')],3)])},
  {id:'comparison',name:'مقارنة الباقات',description:'اختيار واضح بين الباقات.',build:()=>section([heading('اختر ما يناسبك'),factory('feature-comparison'),factory('compare')],{background:'token:soft'})},
  {id:'newsletter',name:'اشتراك',description:'التقاط البريد والاشتراكات.',build:()=>section([factory('newsletter')])},
  {id:'team-cta',name:'فريق + دعوة',description:'دمج التعريف بالفريق مع الإجراء.',build:()=>section([factory('team'),factory('cta')])},
  {id:'social-proof',name:'ثقة وشعارات',description:'دمج أرقام الثقة والشعارات والشهادات.',build:()=>section([factory('social-proof'),factory('logo-row'),grid([factory('testimonial-card'),factory('testimonial-card')],2)],{background:'token:soft'})},
  {id:'image-text',name:'صورة + قصة',description:'قسم قصصي متوازن للمحتوى التسويقي.',build:()=>section([factory('image-text')])},
  {id:'contact-details',name:'بيانات التواصل',description:'تفاصيل الموقع والهاتف والبريد.',build:()=>section([heading('نحن قريبون منك'),grid([factory('contact-card'),factory('map')],2)])},
  {id:'feature-grid',name:'شبكة المزايا',description:'شبكة مرنة من وحدات القيمة.',build:()=>section([heading('كل ما تحتاجه'),factory('feature-grid')])},
  {id:'pricing-cards',name:'باقات الأسعار',description:'بطاقات أسعار مستقلة قابلة لإعادة الترتيب.',build:()=>section([heading('اختر خطتك'),grid([factory('pricing-card'),factory('pricing-card'),factory('pricing-card')],3)],{background:'token:soft'})},
  {id:'video',name:'فيديو تعريفي',description:'فيديو مع عنوان ودعوة.',build:()=>section([heading('شاهد كيف يعمل'),factory('video'),factory('cta')])},
  {id:'schedule',name:'البرنامج والمواعيد',description:'جدول فعالية أو دورة.',build:()=>section([heading('البرنامج'),factory('schedule'),factory('timeline')],{background:'token:soft'})},
  {id:'content-rich',name:'محتوى طويل',description:'مقدمة ومحتوى منسق وأسئلة شائعة.',build:()=>section([heading('دليل شامل'),factory('richtext'),factory('faq')])},
  {id:'download',name:'تحميل مورد',description:'عنوان مع رابط لتحميل ملف أو دليل.',build:()=>section([heading('حمّل الدليل'),body('احصل على الملف وابدأ الآن.'),factory('download')],{background:'token:soft'})},
  {id:'minimal',name:'قسم بسيط',description:'قسم نظيف لرسالة واحدة وإجراء.',build:()=>section([factory('icon-text'),factory('button')],{paddingY:34})},
  {id:'notice',name:'ملاحظة واشتراك',description:'دمج رسالة قصيرة مع اشتراك البريد.',build:()=>section([factory('notice-bar'),factory('newsletter')])},
  {id:'case-study',name:'دراسة حالة',description:'صورة ونتائج وشهادة عميل.',build:()=>section([factory('image-text'),factory('stat-card'),factory('testimonial-card')],{background:'token:soft'})},
];
const sectionById=id=>sections.find(x=>x.id===id);
const materializeSection=id=>sectionById(id)?.build?.()||section([],{});
exports.sections = sections;
exports.sectionById = sectionById;
exports.materializeSection = materializeSection;
});
__modules.set("src/catalog/templates.js",(exports,__require)=>{
const {makeNode,makePage,normalizeProject} = __require("src/core/model.js");
const {uid,deepClone} = __require("src/core/utils.js");
const {factory} = __require("src/catalog/components.js");
const localImage=()=>factory('image');const hero=()=>factory('hero');const card=()=>factory('card');const heading=text=>makeNode('heading',{text},{fontSize:38,fontWeight:800,color:'#171b2a',align:'right'});const bodyText=text=>makeNode('text',{text},{fontSize:14,color:'#636c7e',lineHeight:1.8,align:'right'});const button=(text,url='#')=>makeNode('button',{text,url,action:'url'},{background:'#5b5ce2',color:'#fff',fontSize:12,fontWeight:800,paddingY:10,paddingX:18,radius:10,align:'right'});const section=(children,style={})=>makeNode('section',{}, {background:'#fff',padding:42,...style},children);const grid=(children,count=3)=>makeNode('grid',{count,gap:16},{display:'grid',gridTemplateColumns:`repeat(${count},minmax(0,1fr))`,gap:16},children);const navbar=()=>makeNode('navbar',{brand:'بَنّاء',links:['الرئيسية','الخدمات','من نحن','تواصل']},{background:'#fff',paddingY:14,paddingX:22,borderBottom:'1px solid #e7e9ef'});const footer=()=>makeNode('footer',{brand:'بَنّاء',text:'كل الحقوق محفوظة.'},{background:'#151924',color:'#fff',padding:28});
function landing(){return {name:'Landing احترافي',description:'صفحة هبوط كاملة للشركات والمنتجات.',thumbnail:'linear',pages:[makePage('الرئيسية',[navbar(),hero(),section([heading('لماذا بَنّاء؟'),bodyText('كل ما تحتاجه لبناء موقع سريع وواضح وقابل للتخصيص.'),grid([card(),card(),card()])]),section([heading('جاهز للانطلاق؟'),bodyText('حوّل فكرتك إلى موقع يعمل الآن.'),button('ابدأ مجانًا')],{background:'#f5f6ff'}),footer()],'home')]}}
function agency(){return {name:'شركة وخدمات',description:'صفحة شركة مع خدمات وأرقام وشهادات.',thumbnail:'agency',pages:[makePage('الرئيسية',[navbar(),section([hero()]),section([heading('خدماتنا'),grid([card(),card(),card()],3)]),section([heading('نتائج نعتز بها'),factory('stats'),factory('testimonial')],{background:'#f7f8fb'}),footer()]),makePage('الخدمات',[navbar(),section([heading('الخدمات'),bodyText('مجموعة خدمات عملية يمكنك تعديلها.'),grid([card(),card(),card(),card()],2)]),footer()]),makePage('تواصل',[navbar(),section([heading('تواصل معنا'),factory('form')]),footer()])]}}
function portfolio(){return {name:'معرض أعمال',description:'صفحة أعمال ومشاريع قابلة للعرض.',thumbnail:'portfolio',pages:[makePage('الرئيسية',[navbar(),hero(),section([heading('أعمال مختارة'),grid([localImage(),localImage(),localImage(),localImage()],2)]),section([heading('من عملائنا'),factory('testimonial'),factory('rating')]),footer()])]}}
function store(){return {name:'متجر بسيط',description:'واجهة متجر ببطاقات منتجات وأسعار.',thumbnail:'store',pages:[makePage('الرئيسية',[navbar(),section([heading('منتجات مختارة'),bodyText('اختر ما يناسبك بسهولة.'),grid([factory('product'),factory('product'),factory('product')])]),section([heading('الأسئلة الشائعة'),factory('accordion')]),footer()]),makePage('منتج',[navbar(),section([localImage(),heading('منتج مميز'),bodyText('وصف المنتج وسعره ومعلوماته.'),button('أضف إلى السلة')]),footer()])]}}
function education(){return {name:'تعليمي',description:'صفحة تعليمية مع وحدات ومراحل.',thumbnail:'edu',pages:[makePage('الدروس',[navbar(),section([heading('تعلم خطوة بخطوة'),factory('progress'),grid([card(),card(),card()],3)]),section([heading('الأسئلة الشائعة'),factory('faq'),factory('faq')]),footer()]),makePage('عن الدورة',[navbar(),section([hero()]),section([heading('المحتوى'),factory('timeline')]),footer()])]}}
function blog(){return {name:'مدونة',description:'قالب مقالات مع بطاقات وتصنيفات.',thumbnail:'blog',pages:[makePage('الرئيسية',[navbar(),section([heading('آخر المقالات'),grid([card(),card(),card(),card()],2)]),section([heading('اشترك'),factory('input'),button('اشتراك')],{background:'#f7f8fb'}),footer()]),makePage('مقال',[navbar(),section([heading('عنوان المقال'),bodyText('محتوى المقال التجريبي…'),bodyText('يمكنك استبدال النص وإضافة صور ومحتويات أخرى.')]),footer()])]}}
function dashboard(){return {name:'لوحة تحكم',description:'واجهة بيانات وإحصاءات.',thumbnail:'dashboard',pages:[makePage('لوحة البيانات',[navbar(),section([heading('ملخص اليوم'),factory('stats'),grid([factory('chart'),factory('chart')],2)]),section([heading('العمليات الأخيرة'),factory('table')]),footer()])]}}
function restaurant(){return {name:'مطعم',description:'صفحة مطعم مع قائمة وطريقة تواصل.',thumbnail:'food',pages:[makePage('الرئيسية',[navbar(),section([hero()]),section([heading('قائمة اليوم'),grid([card(),card(),card(),card()],2)]),section([heading('احجز طاولتك'),factory('form')]),footer()])]}}
function personal(){return {name:'شخصي',description:'صفحة تعريفية شخصية أنيقة.',thumbnail:'personal',pages:[makePage('الرئيسية',[section([heading('مرحبًا، أنا صاحب المشروع'),bodyText('نبذة قصيرة يمكن تعديلها بسهولة.'),button('تواصل معي')]),section([heading('مهاراتي'),factory('progress'),factory('progress'),factory('progress')],{background:'#f7f8fb'}),footer()])]}}
function saas(){return {name:'SaaS منتج رقمي',description:'واجهة منتج اشتراكي مع مزايا وأسعار وشهادات.',thumbnail:'saas',pages:[makePage('الرئيسية',[navbar(),section([hero()]),section([heading('مزايا المنتج'),grid([factory('feature-list'),factory('feature-list'),factory('highlight')],3)]),section([heading('الأسعار'),factory('pricing')],{background:'#f7f8fb'}),section([heading('لماذا نحن؟'),grid([factory('testimonial'),factory('testimonial')])]),section([factory('newsletter')]),footer()]),makePage('التسعير',[navbar(),section([heading('الخطط والأسعار'),factory('pricing'),factory('compare')]),footer()])]}}
function startup(){return {name:'Startup',description:'صفحة إطلاق شركة ناشئة سريعة.',thumbnail:'startup',pages:[makePage('الرئيسية',[navbar(),factory('announcement'),section([hero()]),section([heading('أرقام سريعة'),factory('stats')]),section([heading('كيف نعمل'),factory('stepper')],{background:'#f7f8fb'}),section([factory('cta')]),footer()])]}}
function event(){return {name:'فعالية',description:'صفحة فعالية أو مؤتمر مع برنامج وتسجيل.',thumbnail:'event',pages:[navbarPage(),makePage('البرنامج',[navbar(),section([heading('البرنامج'),factory('timeline'),factory('schedule')]),footer()]),makePage('التسجيل',[navbar(),section([heading('سجل حضورك'),factory('lead-form')]),footer()])]}}
function clinic(){return {name:'عيادة وخدمة',description:'موقع عيادة مع خدمات ومواعيد وتواصل.',thumbnail:'clinic',pages:[makePage('الرئيسية',[navbar(),section([hero()]),section([heading('خدماتنا'),grid([card(),card(),card()],3)]),section([heading('احجز موعدًا'),factory('lead-form')],{background:'#f7f8fb'}),footer()]),makePage('الخدمات',[navbar(),section([heading('الخدمات'),grid([card(),card(),card(),card()],2)]),footer()])]}}
function realEstate(){return {name:'عقارات',description:'واجهة عقارية مع بطاقات وقائمة.',thumbnail:'realestate',pages:[makePage('الرئيسية',[navbar(),section([hero()]),section([heading('عقارات مختارة'),grid([factory('product'),factory('product'),factory('product')],3)]),section([heading('لماذا نحن'),factory('feature-list')],{background:'#f7f8fb'}),footer()]),makePage('تفاصيل',[navbar(),section([heading('تفاصيل العقار'),factory('image'),factory('compare'),factory('lead-form')]),footer()])]}}
function cv(){return {name:'سيرة شخصية',description:'صفحة شخصية للعمل والأعمال.',thumbnail:'cv',pages:[makePage('الرئيسية',[section([factory('logo'),heading('مرحبًا، أنا صاحب الملف'),bodyText('مصمم ومطور يهتم بالتجارب الرقمية الواضحة.'),factory('social-proof'),button('تواصل معي')]),section([heading('المهارات'),factory('progress'),factory('progress'),factory('progress')],{background:'#f7f8fb'}),section([heading('أعمال مختارة'),grid([localImage(),localImage(),localImage()],3)]),footer()])]}}
function navbarPage(){return makePage('التسجيل',[navbar(),section([hero()]),footer()])}
function ecommerce(){return {name:'متجر متكامل',description:'واجهة متجر متعددة الصفحات مع منتج وسلة وFAQ.',thumbnail:'ecommerce',pages:[makePage('الرئيسية',[navbar(),section([hero()]),section([heading('الأكثر مبيعًا'),grid([factory('product'),factory('product'),factory('product'),factory('product')],4)]),section([factory('logo-row'),factory('social-proof')],{background:'#f7f8fb'}),footer()]),makePage('المنتجات',[navbar(),section([heading('كل المنتجات'),factory('collection-list'),grid([factory('product'),factory('product'),factory('product'),factory('product')],4)]),footer()]),makePage('السلة',[navbar(),section([heading('مراجعة الطلب'),factory('table'),factory('cta')]),footer()])]}}
function creator(){return {name:'صانع محتوى',description:'صفحة منشئ محتوى مع أعمال واشتراك وشبكات اجتماعية.',thumbnail:'creator',pages:[makePage('الرئيسية',[navbar(),section([factory('avatar'),heading('مرحبًا، أنا صانع المحتوى'),bodyText('نبذة عنك وعن المجال الذي تقدمه.'),factory('social-links'),button('تواصل')]),section([heading('أحدث الأعمال'),grid([factory('video-card'),factory('video-card'),factory('video-card')],3)]),section([factory('newsletter')]),footer()])]}}
function nonprofit(){return {name:'مؤسسة غير ربحية',description:'موقع مبادرة أو مؤسسة مع أهداف وتبرعات ونتائج.',thumbnail:'nonprofit',pages:[makePage('الرئيسية',[navbar(),section([hero()]),section([heading('أثرنا'),factory('stats'),factory('feature-grid')],{background:'#f7f8fb'}),section([heading('قصص المجتمع'),factory('testimonial-card'),factory('image-text')]),section([factory('cta')]),footer()]),makePage('عن المبادرة',[navbar(),section([heading('من نحن'),factory('richtext')]),footer()]),makePage('تبرع',[navbar(),section([heading('ادعم المبادرة'),factory('pricing-card'),factory('lead-form')]),footer()])]}}
function course(){return {name:'دورة مدفوعة',description:'موقع دورة احترافي مع دروس وأسعار وتسجيل.',thumbnail:'course',pages:[makePage('الرئيسية',[navbar(),section([hero()]),section([heading('ماذا ستتعلم؟'),factory('feature-grid')]),section([heading('المنهج'),factory('stepper'),factory('timeline')],{background:'#f7f8fb'}),section([factory('pricing-card')]),footer()]),makePage('المنهج',[navbar(),section([heading('المحتوى الكامل'),factory('accordion'),factory('progress')]),footer()]),makePage('التسجيل',[navbar(),section([heading('ابدأ التعلم'),factory('lead-form')]),footer()])]}}
function freelancer(){return {name:'مستقل وخدمات',description:'عرض خدمات مستقل مع مشاريع وتسعير وتواصل.',thumbnail:'freelance',pages:[makePage('الرئيسية',[navbar(),section([factory('avatar'),heading('أحوّل الأفكار إلى منتجات رقمية'),bodyText('خدمات تصميم وتطوير وتجارب رقمية.'),factory('cta')]),section([heading('الخدمات'),grid([factory('card'),factory('card'),factory('card')],3)]),section([heading('أعمال مختارة'),grid([factory('image-text'),factory('image-text')],2)]),footer()]),makePage('الخدمات',[navbar(),section([heading('الخدمات'),factory('feature-grid'),factory('pricing')]),footer()]),makePage('تواصل',[navbar(),section([heading('تواصل معنا'),factory('contact-card'),factory('lead-form')]),footer()])]}}
function appLanding(){return {name:'منتج تطبيق',description:'صفحة تطبيق جوال مع مزايا ولقطات وأسئلة.',thumbnail:'app',pages:[makePage('الرئيسية',[navbar(),section([hero(),factory('download')]),section([heading('داخل التطبيق'),grid([localImage(),localImage(),localImage()],3)]),section([heading('لماذا التطبيق؟'),factory('feature-grid')]),section([factory('faq'),factory('cta')]),footer()])]}}
function conference(){return {name:'مؤتمر',description:'مؤتمر متعدد الصفحات مع متحدثين وجدول وتسجيل.',thumbnail:'conference',pages:[makePage('الرئيسية',[navbar(),section([hero()]),section([heading('المتحدثون'),factory('team')]),section([heading('لماذا تحضر؟'),factory('feature-grid')]),section([factory('cta')]),footer()]),makePage('البرنامج',[navbar(),section([heading('البرنامج'),factory('schedule'),factory('timeline')]),footer()]),makePage('التسجيل',[navbar(),section([heading('سجل الآن'),factory('lead-form'),factory('contact-card')]),footer()])]}}
function hospitality(){return {name:'فندق وإقامة',description:'موقع إقامة مع غرف ومزايا وحجز.',thumbnail:'hotel',pages:[makePage('الرئيسية',[navbar(),section([hero()]),section([heading('الغرف'),grid([factory('image-text'),factory('image-text')],2)]),section([heading('الخدمات'),factory('feature-grid')],{background:'#f7f8fb'}),section([heading('احجز'),factory('lead-form')]),footer()]),makePage('الغرف',[navbar(),section([heading('الغرف والأجنحة'),factory('gallery'),grid([factory('pricing-card'),factory('pricing-card')],2)]),footer()])]}}
function jobBoard(){return {name:'وظائف وتوظيف',description:'واجهة وظائف وصفحات شركة وتقديم.',thumbnail:'jobs',pages:[makePage('الرئيسية',[navbar(),section([hero()]),section([heading('الوظائف المفتوحة'),factory('collection-list'),grid([factory('card'),factory('card'),factory('card')],3)]),section([heading('لماذا تعمل معنا؟'),factory('feature-grid')]),footer()]),makePage('الوظيفة',[navbar(),section([heading('مسمى وظيفي'),factory('richtext'),factory('lead-form')]),footer()])]}}
const baseTemplates=[landing(),agency(),portfolio(),store(),education(),blog(),dashboard(),restaurant(),personal(),saas(),startup(),event(),clinic(),realEstate(),cv(),ecommerce(),creator(),nonprofit(),course(),freelancer(),appLanding(),conference(),hospitality(),jobBoard()];
const templates=baseTemplates;
const templateByName=name=>templates.find(template=>template.name===name);
function materializeTemplate(template){const t=deepClone(template);for(const page of t.pages){page.id=uid('page');page.slug=undefined;page.seo={title:page.name,description:'',image:''};page.nodes=(page.nodes||[]).map(remapTree)}const project=normalizeProject({version:12,meta:{name:t.name},pages:t.pages,theme:t.theme,devices:t.devices,assets:t.assets,variables:t.variables,interactions:t.interactions,settings:t.settings,activePageId:t.pages[0].id});for(const page of project.pages){page.nodes=page.nodes||[]}return {name:t.name,description:t.description,pages:project.pages,theme:project.theme,devices:project.devices,assets:project.assets,variables:project.variables,interactions:project.interactions,settings:project.settings,activePageId:project.activePageId}}
function remapTree(node){const copy=deepClone(node);copy.id=uid('node');copy.children=(copy.children||[]).map(remapTree);return copy}
const validateTemplate=t=>Boolean(t?.name&&Array.isArray(t.pages)&&t.pages.length>0&&t.pages.every(p=>p.name&&Array.isArray(p.nodes)));
exports.templates = templates;
exports.templateByName = templateByName;
exports.materializeTemplate = materializeTemplate;
exports.validateTemplate = validateTemplate;
});
__modules.set("src/core/assets.js",(exports,__require)=>{
const {deepClone,uid} = __require("src/core/utils.js");
const ASSET_KINDS = Object.freeze(['image','video','audio','document','font','other']);
const EXT_BY_TYPE={
  'image/jpeg':'jpg','image/png':'png','image/gif':'gif','image/webp':'webp','image/svg+xml':'svg','image/avif':'avif','image/bmp':'bmp','image/tiff':'tif',
  'video/mp4':'mp4','video/webm':'webm','video/ogg':'ogv','video/quicktime':'mov','video/x-matroska':'mkv',
  'audio/mpeg':'mp3','audio/mp4':'m4a','audio/aac':'aac','audio/wav':'wav','audio/x-wav':'wav','audio/ogg':'ogg','audio/webm':'weba','audio/flac':'flac',
  'application/pdf':'pdf','text/plain':'txt','text/csv':'csv','text/markdown':'md','text/html':'html','text/css':'css','text/javascript':'js','application/javascript':'js','application/json':'json','application/zip':'zip','application/x-zip-compressed':'zip','application/rtf':'rtf','text/rtf':'rtf',
  'application/msword':'doc','application/vnd.openxmlformats-officedocument.wordprocessingml.document':'docx','application/vnd.ms-excel':'xls','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':'xlsx','application/vnd.ms-powerpoint':'ppt','application/vnd.openxmlformats-officedocument.presentationml.presentation':'pptx',
  'font/woff':'woff','font/woff2':'woff2','font/ttf':'ttf','font/otf':'otf','application/font-woff':'woff','application/font-woff2':'woff2','application/x-font-ttf':'ttf','application/x-font-opentype':'otf'
};
const KIND_BY_EXTENSION={jpg:'image',jpeg:'image',png:'image',gif:'image',webp:'image',svg:'image',avif:'image',bmp:'image',tif:'image',tiff:'image',mp4:'video',webm:'video',ogv:'video',mov:'video',mkv:'video',mp3:'audio',wav:'audio',ogg:'audio',weba:'audio',m4a:'audio',aac:'audio',flac:'audio',woff:'font',woff2:'font',ttf:'font',otf:'font',pdf:'document',doc:'document',docx:'document',xls:'document',xlsx:'document',ppt:'document',pptx:'document',txt:'document',csv:'document',rtf:'document',md:'document',odt:'document',ods:'document',odp:'document',zip:'other',json:'other',html:'other',css:'other',js:'other',xml:'other'};
const PREFIX_BY_KIND={image:'img',video:'video',audio:'audio',document:'file',font:'font',other:'file'};
function extensionForType(type='',name=''){
  const mime=String(type||'').toLowerCase().split(';')[0];
  if(EXT_BY_TYPE[mime]) return EXT_BY_TYPE[mime];
  const match=String(name||'').match(/\.([a-z0-9]{1,8})$/i); return match?.[1]?.toLowerCase()||'bin';
}
function assetKind(type='',name=''){
  const mime=String(type||'').toLowerCase().split(';')[0].trim();
  if(mime.startsWith('image/')) return 'image';
  if(mime.startsWith('video/')) return 'video';
  if(mime.startsWith('audio/')) return 'audio';
  if(mime.startsWith('font/')) return 'font';
  if(mime==='application/pdf' || mime.includes('document') || mime.includes('wordprocessing') || mime.includes('spreadsheet') || mime.includes('presentation') || mime.includes('font')) return mime.includes('font')?'font':'document';
  const ext=(String(name||'').match(/\.([a-z0-9]{1,8})$/i)||[])[1]?.toLowerCase()||'';
  return KIND_BY_EXTENSION[ext]||'other';
}
function prefixForAsset(raw={}){return PREFIX_BY_KIND[assetKind(raw.type,raw.name)]||'file'}

function nextSequence(assets,kind){
  const prefix=PREFIX_BY_KIND[kind]||'file';
  let max=0;
  for(const asset of normalizeAssets(assets)){
    if(asset.kind!==kind && !String(asset.name||'').startsWith(prefix)) continue;
    const match=String(asset.name||'').match(new RegExp(`^${prefix}(\\d+)$`,'i'));
    if(match) max=Math.max(max,Number(match[1])||0);
  }
  return max+1;
}
function generatedAssetName(assets,raw={}){
  if(typeof raw==='string') raw={type:raw};
  const kind=assetKind(raw.type,raw.originalName||raw.name);
  return `${PREFIX_BY_KIND[kind]||'file'}${nextSequence(assets,kind)}`;
}
function normalizeAsset(asset={},existing=[]){
  const originalName=String(asset.originalName||asset.name||'وسيط');
  const inferredKind=assetKind(asset.type,originalName);const kind=ASSET_KINDS.includes(asset.kind)&&!(asset.kind==='other'&&inferredKind!=='other')?asset.kind:inferredKind;
  let name=String(asset.name||'').trim();
  if(!name || /\.[a-z0-9]{1,8}$/i.test(name)) name=name.replace(/\.[a-z0-9]{1,8}$/i,'');
  if(!/^((img|video|audio|file|font)\d+)$/i.test(name)) name=generatedAssetName(existing, {type:asset.type,name:originalName});
  const extension=String(asset.extension||extensionForType(asset.type,originalName)).toLowerCase();
  const filename=String(asset.filename||`${name}.${extension}`);
  return {
    id:String(asset.id||uid('asset')),
    name,
    filename,
    extension,
    originalName,
    type:String(asset.type||'application/octet-stream'),
    kind,
    purpose:String(asset.purpose||kind),
    size:Number(asset.size||0),
    originalSize:Number(asset.originalSize||asset.size||0),
    optimized:Boolean(asset.optimized),
    storageRef:String(asset.storageRef||''),
    data:String(asset.data||asset.url||''),
    url:String(asset.url||''),
    path:String(asset.path||`assets/${filename}`),
    alt:String(asset.alt||''),
    folder:String(asset.folder||kind),
    tags:Array.isArray(asset.tags)?[...new Set(asset.tags.map(String))]:[],
    width:Number(asset.width||0),
    height:Number(asset.height||0),
    createdAt:asset.createdAt||new Date().toISOString(),
    updatedAt:asset.updatedAt||asset.createdAt||new Date().toISOString(),
  };
}
function normalizeAssets(assets=[]){
  const seen=new Set(); const source=Array.isArray(assets)?assets:[]; const out=[];
  for(const raw of source){
    const asset=normalizeAsset(raw, out);
    if(seen.has(asset.id)) continue;
    // Avoid accidental duplicate generated names while preserving legacy data.
    if(out.some(x=>x.name===asset.name && x.id!==asset.id)) asset.name=generatedAssetName(out,{type:asset.type,name:asset.originalName});
    asset.filename=`${asset.name}.${asset.extension||extensionForType(asset.type,asset.originalName)}`;
    asset.path=`assets/${asset.filename}`;
    seen.add(asset.id);out.push(asset);
  }
  return out;
}
function searchAssets(assets,query='',folder='',tag='',kind=''){
  const q=String(query||'').trim().toLowerCase();
  return normalizeAssets(assets).filter(asset=>{
    const text=`${asset.name} ${asset.filename} ${asset.originalName} ${asset.alt} ${asset.tags.join(' ')} ${asset.folder}`.toLowerCase();
    return (!q||text.includes(q))&&(!folder||asset.folder===folder)&&(!tag||asset.tags.includes(tag))&&(!kind||asset.kind===kind);
  });
}
function addAsset(store,raw={}){
  let asset;
  store.transact('إضافة وسيط',project=>{
    project.assets=normalizeAssets(project.assets);
    asset=normalizeAsset({...raw,name:raw.name||generatedAssetName(project.assets,raw)},project.assets);
    if(project.assets.some(x=>x.name===asset.name)) asset.name=generatedAssetName(project.assets,raw);
    asset.filename=`${asset.name}.${extensionForType(asset.type,asset.originalName||asset.filename)}`;
    asset.path=`assets/${asset.filename}`;
    project.assets.push(deepClone(asset));
  });
  return asset;
}
function updateAsset(store,id,patch={}){
  return store.transact('تعديل بيانات الوسيط',project=>{
    const asset=(project.assets||[]).find(item=>item.id===id); if(!asset)return;
    Object.assign(asset,deepClone(patch),{updatedAt:new Date().toISOString()});
    if(patch.name){asset.name=String(patch.name).trim().replace(/\.[a-z0-9]{1,8}$/i,'')||asset.name;asset.filename=`${asset.name}.${extensionForType(asset.type,asset.originalName)}`;asset.path=`assets/${asset.filename}`;}
  });
}
function removeAsset(store,id){return store.transact('حذف وسيط',project=>{project.assets=(project.assets||[]).filter(item=>item.id!==id);});}
function findAsset(project,id){return normalizeAssets(project?.assets).find(asset=>asset.id===id)||null;}
function assetForNodeType(type){
  if(['image','gallery','avatar','logo','image-text','image-carousel'].includes(type))return 'image';
  if(['video','video-card','video-gallery'].includes(type))return 'video';
  if(['audio','audio-playlist'].includes(type))return 'audio';
  if(type==='document-viewer')return 'document';
  if(['download','file-card'].includes(type))return 'any';
  if(type==='media-grid')return 'mixed';
  return 'other';
}
exports.ASSET_KINDS = ASSET_KINDS;
exports.extensionForType = extensionForType;
exports.assetKind = assetKind;
exports.prefixForAsset = prefixForAsset;
exports.generatedAssetName = generatedAssetName;
exports.normalizeAsset = normalizeAsset;
exports.normalizeAssets = normalizeAssets;
exports.searchAssets = searchAssets;
exports.addAsset = addAsset;
exports.updateAsset = updateAsset;
exports.removeAsset = removeAsset;
exports.findAsset = findAsset;
exports.assetForNodeType = assetForNodeType;
});
__modules.set("src/core/cms.js",(exports,__require)=>{
const {deepClone,uid,slugify} = __require("src/core/utils.js");
const {makeCollection,makeCmsItem} = __require("src/core/site-schema.js");
const CMS_FIELD_TYPES = [
  ['text', 'نص'], ['textarea', 'نص طويل'], ['richtext', 'محتوى منسق'], ['number', 'رقم'], ['boolean', 'نعم/لا'],
  ['image', 'صورة'], ['url', 'رابط'], ['email', 'بريد'], ['date', 'تاريخ'], ['slug', 'Slug'], ['select', 'اختيار'],
];
function addCollection(store, name, fields = []) {
  let created = null;
  store.transact('إنشاء مجموعة محتوى', project => {
    project.cms ||= { collections: [] };
    created = makeCollection(name, fields);
    project.cms.collections.push(created);
  });
  return created;
}
function updateCollection(store, collectionId, patch = {}) {
  return store.transact('تعديل مجموعة محتوى', project => {
    const collection = project.cms?.collections?.find(item => item.id === collectionId);
    if (!collection) return;
    Object.assign(collection, deepClone(patch), { updatedAt: new Date().toISOString() });
  });
}
function removeCollection(store, collectionId) {
  return store.transact('حذف مجموعة محتوى', project => {
    project.cms.collections = (project.cms.collections || []).filter(item => item.id !== collectionId);
    walkPages(project.pages, node => { if (node.type === 'collection-list' && node.props?.collectionId === collectionId) { node.props.collectionId = ''; } });
  });
}
function addItem(store, collectionId, data = {}) {
  let item = null;
  store.transact('إضافة محتوى', project => {
    const collection = project.cms?.collections?.find(item => item.id === collectionId);
    if (!collection) return;
    item = makeCmsItem(collection, data);
    collection.items.push(item);
    collection.updatedAt = new Date().toISOString();
  });
  return item;
}
function updateItem(store, collectionId, itemId, data = {}) {
  return store.transact('تعديل محتوى', project => {
    const item = project.cms?.collections?.find(c => c.id === collectionId)?.items?.find(x => x.id === itemId);
    if (!item) return;
    item.data = { ...item.data, ...deepClone(data) };
    if (data.slug) item.slug = slugify(data.slug);
    item.updatedAt = new Date().toISOString();
  });
}
function removeItem(store, collectionId, itemId) {
  return store.transact('حذف محتوى', project => {
    const collection = project.cms?.collections?.find(item => item.id === collectionId);
    if (!collection) return;
    collection.items = (collection.items || []).filter(item => item.id !== itemId);
    collection.updatedAt = new Date().toISOString();
  });
}
function getCollection(project, collectionId) { return project.cms?.collections?.find(item => item.id === collectionId) || null; }
function getCollectionItems(project, collectionId) { return getCollection(project, collectionId)?.items || []; }

function walkPages(pages, fn) {
  for (const page of pages || []) walkNodes(page.nodes, fn);
}
function walkNodes(nodes, fn) {
  for (const node of nodes || []) { fn(node); walkNodes(node.children, fn); }
}
exports.CMS_FIELD_TYPES = CMS_FIELD_TYPES;
exports.addCollection = addCollection;
exports.updateCollection = updateCollection;
exports.removeCollection = removeCollection;
exports.addItem = addItem;
exports.updateItem = updateItem;
exports.removeItem = removeItem;
exports.getCollection = getCollection;
exports.getCollectionItems = getCollectionItems;
});
__modules.set("src/core/color-mixer.js",(exports,__require)=>{
const clamp=(n,min=0,max=1)=>Math.min(max,Math.max(min,n));
function hexToRgb(input){
  const v=String(input||'').trim().replace(/^#/,'');
  const hex=v.length===3?v.split('').map(x=>x+x).join(''):v;
  if(!/^[0-9a-f]{6}$/i.test(hex))return null;
  return {r:parseInt(hex.slice(0,2),16),g:parseInt(hex.slice(2,4),16),b:parseInt(hex.slice(4,6),16)};
}
function rgbToHex({r,g,b}){return '#'+[r,g,b].map(v=>Math.round(clamp(Number(v),0,255)).toString(16).padStart(2,'0')).join('').toUpperCase()}
function parseColor(input){
  const text=String(input||'').trim();
  if(/^#/.test(text))return hexToRgb(text);
  const rgb=text.match(/^rgba?\(\s*([\d.]+)\s*[, ]\s*([\d.]+)\s*[, ]\s*([\d.]+)(?:\s*[,/]\s*[\d.]+\s*)?\)$/i);
  if(rgb)return {r:Math.round(Number(rgb[1])),g:Math.round(Number(rgb[2])),b:Math.round(Number(rgb[3]))};
  return null;
}
function rgbToHsl({r,g,b}){
  r/=255;g/=255;b/=255;const max=Math.max(r,g,b),min=Math.min(r,g,b);let h=0,s=0;const l=(max+min)/2;
  if(max!==min){const d=max-min;s=l>.5?d/(2-max-min):d/(max+min);switch(max){case r:h=(g-b)/d+(g<b?6:0);break;case g:h=(b-r)/d+2;break;default:h=(r-g)/d+4;}h/=6;}
  return {h:h*360,s:s*100,l:l*100};
}
function hslToRgb({h,s,l}){
  h=((h%360)+360)%360/360;s=clamp(s/100);l=clamp(l/100);if(s===0){const x=Math.round(l*255);return {r:x,g:x,b:x}}
  const q=l<.5?l*(1+s):l+s-l*s,p=2*l-q;
  const hue=t=>{if(t<0)t+=1;if(t>1)t-=1;if(t<1/6)return p+(q-p)*6*t;if(t<1/2)return q;if(t<2/3)return p+(q-p)*(2/3-t)*6;return p};
  return {r:Math.round(hue(h+1/3)*255),g:Math.round(hue(h)*255),b:Math.round(hue(h-1/3)*255)};
}
function mixColors(a,b,ratio=.5,space='rgb'){
  const ca=parseColor(a),cb=parseColor(b);if(!ca||!cb)return '';
  const t=clamp(Number(ratio),0,1);
  if(space==='hsl'){
    const ah=rgbToHsl(ca),bh=rgbToHsl(cb);let dh=((bh.h-ah.h+540)%360)-180;const h=ah.h+dh*t;
    return rgbToHex(hslToRgb({h,s:ah.s+(bh.s-ah.s)*t,l:ah.l+(bh.l-ah.l)*t}));
  }
  return rgbToHex({r:ca.r+(cb.r-ca.r)*t,g:ca.g+(cb.g-ca.g)*t,b:ca.b+(cb.b-ca.b)*t});
}
function gradientColors(stops=[],angle=90){
  const clean=(Array.isArray(stops)?stops:[]).map((stop,i)=>({color:parseColor(stop.color)?rgbToHex(parseColor(stop.color)):String(stop.color||'#000000'),position:stop.position==null?Math.round((i/Math.max(1,stops.length-1))*100):Number(stop.position)})).slice(0,8);
  if(clean.length<2)return clean[0]?.color||'#000000';
  return `linear-gradient(${Number(angle)||90}deg, ${clean.map(s=>`${s.color} ${clamp(s.position,0,100)}%`).join(', ')})`;
}
function contrastLuminance(color){const c=parseColor(color);if(!c)return 0;const f=v=>{v/=255;return v<=0.03928?v/12.92:((v+0.055)/1.055)**2.4};return .2126*f(c.r)+.7152*f(c.g)+.0722*f(c.b)}
function contrastRatio(a,b){const l1=contrastLuminance(a),l2=contrastLuminance(b);return (Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05)}
function bestTextColor(background){return contrastRatio(background,'#000000')>=contrastRatio(background,'#FFFFFF')?'#000000':'#FFFFFF'}
exports.hexToRgb = hexToRgb;
exports.rgbToHex = rgbToHex;
exports.parseColor = parseColor;
exports.rgbToHsl = rgbToHsl;
exports.hslToRgb = hslToRgb;
exports.mixColors = mixColors;
exports.gradientColors = gradientColors;
exports.contrastLuminance = contrastLuminance;
exports.contrastRatio = contrastRatio;
exports.bestTextColor = bestTextColor;
});
__modules.set("src/core/commands.js",(exports,__require)=>{
const {factory} = __require("src/catalog/components.js");
const {uid,deepClone,slugify} = __require("src/core/utils.js");
const {findNodeGlobal,walk} = __require("src/core/model.js");
const {initializeDevicePresetsTree} = __require("src/core/device-presets.js");
const containerTypes=new Set(['section','container','grid','columns','stack','hero','card','form','group']);
function addNode(store,type,parentId=null,index=null){let created;store.transact('إضافة عنصر',p=>{created=factory(type);if(type==='page-embed')created.props.pageId=p.pages.find(pg=>pg.id!==p.activePageId)?.id||'';initializeDevicePresetsTree([created],store.ui?.device||'desktop');const page=p.pages.find(x=>x.id===p.activePageId);const parent=parentId?findNodeGlobal(p,parentId):null;if(parent){parent.node.children=parent.node.children||[];const i=index==null?parent.node.children.length:Math.max(0,Math.min(index,parent.node.children.length));parent.node.children.splice(i,0,created)}else if(page){const i=index==null?page.nodes.length:Math.max(0,Math.min(index,page.nodes.length));page.nodes.splice(i,0,created)}});store.setUI({selected:created?.id||null});return created}
function removeNode(store,id){if(!findNodeGlobal(store.project,id))return false;store.transact('حذف عنصر',p=>{const h=findNodeGlobal(p,id);(h.parent?h.parent.children:h.page.nodes).splice(h.index,1);p.interactions=(p.interactions||[]).filter(i=>i.sourceId!==id&&i.options?.targetId!==id)});store.setUI({selected:null});return true}
function remap(node){node.id=uid('node');node.children=(node.children||[]).map(child=>{const c=deepClone(child);return remap(c)});return node}
function duplicateNode(store,id){const h=findNodeGlobal(store.project,id);if(!h)return null;let copy;store.transact('تكرار عنصر',p=>{const current=findNodeGlobal(p,id);copy=remap(deepClone(current.node));(current.parent?current.parent.children:current.page.nodes).splice(current.index+1,0,copy)});store.setUI({selected:copy.id});return copy}
function moveNode(store,id,direction){const h=findNodeGlobal(store.project,id);if(!h)return false;let moved=false;store.transact(direction==='up'?'تحريك للأعلى':'تحريك للأسفل',p=>{const x=findNodeGlobal(p,id);const arr=x.parent?x.parent.children:x.page.nodes;const to=x.index+(direction==='up'?-1:1);if(to<0||to>=arr.length)return;[arr[x.index],arr[to]]=[arr[to],arr[x.index]];moved=true});return moved}
function updateProps(store,id,patch){store.transact('تعديل المحتوى',p=>{const h=findNodeGlobal(p,id);if(h)h.node.props={...(h.node.props||{}),...patch}})}
function updateStyle(store,id,patch,device='desktop'){store.transact('تعديل المظهر',p=>{const h=findNodeGlobal(p,id);if(!h)return;if(device==='desktop')h.node.style={...(h.node.style||{}),...patch};else h.node.responsive={...(h.node.responsive||{}),[device]:{...(h.node.responsive?.[device]||{}),...patch}}})}
function insertNodeAtDrop(store,type,targetId=null){let created;store.transact('إدراج عنصر',p=>{created=factory(type);if(type==='page-embed')created.props.pageId=p.pages.find(pg=>pg.id!==p.activePageId)?.id||'';initializeDevicePresetsTree([created],store.ui?.device||'desktop');const target=targetId?findNodeGlobal(p,targetId):null;const page=p.pages.find(x=>x.id===p.activePageId);if(target&&containerTypes.has(target.node.type)){target.node.children=target.node.children||[];target.node.children.push(created)}else if(target){const arr=target.parent?target.parent.children:target.page.nodes;arr.splice(target.index+1,0,created)}else if(page)page.nodes.push(created)});store.setUI({selected:created?.id||null});return created}
function setPageName(store,id,name){store.transact('إعادة تسمية الصفحة',p=>{const pg=p.pages.find(x=>x.id===id);if(pg){pg.name=String(name||'').trim()||pg.name;pg.slug=slugify(pg.name);pg.path=`/${pg.slug}`;pg.seo={...(pg.seo||{}),title:pg.name}}})}
exports.addNode = addNode;
exports.removeNode = removeNode;
exports.duplicateNode = duplicateNode;
exports.moveNode = moveNode;
exports.updateProps = updateProps;
exports.updateStyle = updateStyle;
exports.insertNodeAtDrop = insertNodeAtDrop;
exports.setPageName = setPageName;
});
__modules.set("src/core/design-system.js",(exports,__require)=>{
const {deepClone} = __require("src/core/utils.js");
const {DEFAULT_THEME} = __require("src/core/model.js");
const tokenPaths={
  primary:'colors.primary',secondary:'colors.secondary',accent:'colors.accent',surface:'colors.surface',soft:'colors.soft',text:'colors.text',muted:'colors.muted',line:'colors.line',
  space1:'spacing.xs',space2:'spacing.sm',space3:'spacing.md',space4:'spacing.lg',space5:'spacing.xl',space6:'spacing.xxl',
  radiusSm:'radii.sm',radiusMd:'radii.md',radiusLg:'radii.lg',radiusPill:'radii.pill',
  shadowSoft:'shadows.soft',shadowMedium:'shadows.medium',container:'container',
  h1Size:'typography.h1.size',h2Size:'typography.h2.size',bodySize:'typography.body.size',motionFast:'motion.fast',motionNormal:'motion.normal',motionSlow:'motion.slow'
};
function getToken(theme, name, fallback='') {
  const path=tokenPaths[name]||name;
  let current=theme?.tokens;
  for(const part of String(path).split('.')) current=current?.[part];
  return current ?? fallback;
}
function token(name){return `var(--b-${String(name).replace(/[^a-zA-Z0-9_-]/g,'-')})`}
function themeVars(theme={}) {
  const merged={...deepClone(DEFAULT_THEME),...deepClone(theme),tokens:{...deepClone(DEFAULT_THEME.tokens),...(theme.tokens||{})}};
  const vars={};
  Object.keys(tokenPaths).forEach(name=>{const value=getToken(merged,name,'');if(value!==''&&value!=null)vars[`--b-${name}`]=value});
  vars['--b-font-family']=merged.font||'system-ui';
  vars['--b-primary']=getToken(merged,'primary',merged.primary);
  vars['--b-text']=getToken(merged,'text',merged.text);
  vars['--b-muted']=getToken(merged,'muted',merged.muted);
  vars['--b-line']=getToken(merged,'line','#e6e8ef');
  return vars;
}
function themeCss(theme={}) {
  return Object.entries(themeVars(theme)).map(([key,value])=>`${key}:${value};`).join('');
}
function applyThemeVars(element,theme){if(!element)return;Object.entries(themeVars(theme)).forEach(([key,value])=>element.style.setProperty(key,value));}
function themeSnapshot(theme){return deepClone({...DEFAULT_THEME,...theme,tokens:{...DEFAULT_THEME.tokens,...(theme?.tokens||{})}})}
exports.tokenPaths = tokenPaths;
exports.getToken = getToken;
exports.token = token;
exports.themeVars = themeVars;
exports.themeCss = themeCss;
exports.applyThemeVars = applyThemeVars;
exports.themeSnapshot = themeSnapshot;
});
__modules.set("src/core/device-presets.js",(exports,__require)=>{
const {deepClone} = __require("src/core/utils.js");
const DEVICE_ORDER = ['desktop','tablet','mobile'];

const common = {
  desktop: { maxWidth:'100%', minWidth:0, boxSizing:'border-box' },
  tablet: { maxWidth:'100%', minWidth:0, boxSizing:'border-box' },
  mobile: { maxWidth:'100%', minWidth:0, boxSizing:'border-box' },
};

const PRESETS = {
  desktop: {
    heading:{fontSize:42,lineHeight:1.15}, text:{fontSize:16,lineHeight:1.8}, button:{fontSize:13,paddingY:11,paddingX:20}, link:{fontSize:13},
    section:{paddingY:40,paddingX:24}, container:{paddingX:24}, hero:{paddingY:58,paddingX:28}, card:{padding:20},
    grid:{gap:16,gridTemplateColumns:'repeat(3,minmax(0,1fr))'}, columns:{gap:18,gridTemplateColumns:'repeat(2,minmax(0,1fr))'},
    stack:{gap:12}, spaced:{gap:12}, image:{height:300}, gallery:{gap:10,gridTemplateColumns:'repeat(3,minmax(0,1fr))'}, video:{height:260},
    input:{width:'100%',maxWidth:'100%'}, textarea:{width:'100%',maxWidth:'100%'}, select:{width:'100%',maxWidth:'100%'},
    form:{padding:20}, stats:{gap:12}, pricing:{gap:12}, timeline:{gap:12}, featureGrid:{gap:12},
  },
  tablet: {
    heading:{fontSize:34,lineHeight:1.16}, text:{fontSize:15,lineHeight:1.75}, button:{fontSize:12,paddingY:10,paddingX:18}, link:{fontSize:12},
    section:{paddingY:32,paddingX:20}, container:{paddingX:20}, hero:{paddingY:42,paddingX:24}, card:{padding:17},
    grid:{gap:14,gridTemplateColumns:'repeat(2,minmax(0,1fr))'}, columns:{gap:16,gridTemplateColumns:'repeat(2,minmax(0,1fr))'},
    stack:{gap:10}, spaced:{gap:10}, image:{height:260}, gallery:{gap:8,gridTemplateColumns:'repeat(2,minmax(0,1fr))'}, video:{height:220},
    input:{width:'100%',maxWidth:'100%'}, textarea:{width:'100%',maxWidth:'100%'}, select:{width:'100%',maxWidth:'100%'},
    form:{padding:18}, stats:{gap:10}, pricing:{gap:10}, timeline:{gap:10}, featureGrid:{gap:10},
  },
  mobile: {
    heading:{fontSize:28,lineHeight:1.18}, text:{fontSize:14,lineHeight:1.75}, button:{fontSize:12,paddingY:10,paddingX:16}, link:{fontSize:12},
    section:{paddingY:24,paddingX:16}, container:{paddingX:16}, hero:{paddingY:30,paddingX:18}, card:{padding:15},
    grid:{gap:10,gridTemplateColumns:'1fr'}, columns:{gap:12,gridTemplateColumns:'1fr'},
    stack:{gap:9}, spaced:{gap:10}, image:{height:220}, gallery:{gap:7,gridTemplateColumns:'1fr'}, video:{height:200},
    input:{width:'100%',maxWidth:'100%'}, textarea:{width:'100%',maxWidth:'100%'}, select:{width:'100%',maxWidth:'100%'},
    form:{padding:15}, stats:{gap:9,gridTemplateColumns:'1fr'}, pricing:{gap:9,gridTemplateColumns:'1fr'}, timeline:{gap:9,gridTemplateColumns:'1fr'}, featureGrid:{gap:9,gridTemplateColumns:'1fr'},
  }
};

const TYPE_ALIASES = {
  featuregrid:'featureGrid', 'feature-grid':'featureGrid', 'feature-comparison':'featureGrid',
};
function getDevicePreset(type, device='desktop') {
  const d = PRESETS[device] || PRESETS.desktop;
  const key = TYPE_ALIASES[type] || type;
  return { ...(common[device] || common.desktop), ...(d[key] || {}) };
}
function applyDevicePreset(node, device='desktop', {onlyMissing=true}={}) {
  if (!node || !DEVICE_ORDER.includes(device)) return node;
  node.responsive = node.responsive || {};
  const preset = getDevicePreset(node.type, device);
  const existing = node.responsive[device] || {};
  node.responsive[device] = onlyMissing ? { ...preset, ...existing } : { ...existing, ...preset };
  node.device = node.device || {};
  node.device.created = node.device.created || device;
  node.device.touched = Array.from(new Set([...(node.device.touched || []), device]));
  return node;
}
function applyDevicePresetTree(nodes=[], device='desktop', options={}) {
  const cloned = Array.isArray(nodes) ? nodes : [];
  const visit = node => {
    applyDevicePreset(node, device, options);
    (node.children || []).forEach(visit);
    return node;
  };
  cloned.forEach(visit);
  return cloned;
}
function initializeDevicePresetsTree(nodes=[], createdDevice='desktop') {
  const list = Array.isArray(nodes) ? nodes : [];
  const visit = node => {
    if (!node) return node;
    for (const device of DEVICE_ORDER) applyDevicePreset(node, device, {onlyMissing:true});
    node.device = node.device || {};
    node.device.created = DEVICE_ORDER.includes(createdDevice) ? createdDevice : 'desktop';
    node.device.touched = [node.device.created];
    (node.children || []).forEach(visit);
    return node;
  };
  list.forEach(visit);
  return list;
}
function deviceLabel(device) {
  return ({desktop:'سطح المكتب',tablet:'الجهاز اللوحي',mobile:'الهاتف'})[device] || device;
}
exports.DEVICE_ORDER = DEVICE_ORDER;
exports.getDevicePreset = getDevicePreset;
exports.applyDevicePreset = applyDevicePreset;
exports.applyDevicePresetTree = applyDevicePresetTree;
exports.initializeDevicePresetsTree = initializeDevicePresetsTree;
exports.deviceLabel = deviceLabel;
});
__modules.set("src/core/migrations.js",(exports,__require)=>{
const {deepClone} = __require("src/core/utils.js");
const {SCHEMA_VERSION,normalizeProject} = __require("src/core/model.js");
const {DEFAULT_CMS,DEFAULT_GLOBALS,DEFAULT_NAVIGATION,DEFAULT_SITE,DEFAULT_SYMBOLS,DEFAULT_STYLE_LIBRARY,normalizeCms,normalizeGlobals,normalizeNavigation,normalizeSite,normalizeSymbols,normalizeStyleLibrary} = __require("src/core/site-schema.js");
const CURRENT_SCHEMA = 30;
function migrateProject(input) {
  const source = deepClone(input || {});
  const version = Number(source.version || 0);
  const next = {
    ...source,
    version: CURRENT_SCHEMA,
    site: normalizeSite({ ...DEFAULT_SITE, ...(source.site || {}) }),
    navigation: normalizeNavigation({ ...DEFAULT_NAVIGATION, ...(source.navigation || {}) }),
    cms: normalizeCms({ ...DEFAULT_CMS, ...(source.cms || {}) }),
    symbols: normalizeSymbols({ ...DEFAULT_SYMBOLS, ...(source.symbols || {}) }),
    globals: normalizeGlobals({ ...DEFAULT_GLOBALS, ...(source.globals || {}) }),
    styleLibrary: normalizeStyleLibrary({ ...DEFAULT_STYLE_LIBRARY, ...(source.styleLibrary || {}) }),
    release: {
      channel: 'draft',
      status: 'draft',
      version: 1,
      publishedAt: null,
      ...(source.release || {}),
    },
    seo: {
      enabled: true,
      canonicalMode: 'auto',
      ...(source.seo || {}),
    },
  };

  if (!next.navigation.menus.some(menu => menu.id === next.navigation.headerMenuId)) next.navigation.headerMenuId = next.navigation.menus[0]?.id || null;
  if (!next.navigation.menus.some(menu => menu.id === next.navigation.footerMenuId)) next.navigation.footerMenuId = next.navigation.menus[0]?.id || null;

  // V11–V15 stored site title only in meta. Keep it as the first source for the new site object.
  if (version < 16) {
    next.site.title = next.site.title === DEFAULT_SITE.title ? String(next.meta?.name || DEFAULT_SITE.title) : next.site.title;
    next.site.description = next.site.description === DEFAULT_SITE.description ? String(next.meta?.description || DEFAULT_SITE.description) : next.site.description;
  }

  next.theme ||= {};
  next.theme.tokens ||= {};
  next.theme.tokens.typography ||= {};
  next.theme.tokens.motion ||= { fast: 180, normal: 360, slow: 720 };
  const normalized = normalizeProject(next);
  normalized.version = SCHEMA_VERSION;
  normalized.site = normalizeSite(normalized.site);
  normalized.navigation = normalizeNavigation(normalized.navigation);
  normalized.cms = normalizeCms(normalized.cms);
  normalized.symbols = normalizeSymbols(normalized.symbols);
  normalized.globals = normalizeGlobals(normalized.globals);
  normalized.styleLibrary = normalizeStyleLibrary(normalized.styleLibrary);
  normalized.release = { channel: 'draft', status: 'draft', version: 1, publishedAt: null, ...(normalized.release || {}) };
  normalized.seo = { enabled: true, canonicalMode: 'auto', ...(normalized.seo || {}) };
  return normalized;
}
exports.CURRENT_SCHEMA = CURRENT_SCHEMA;
exports.migrateProject = migrateProject;
});
__modules.set("src/core/model.js",(exports,__require)=>{
const {uid,slugify,deepClone} = __require("src/core/utils.js");
const {normalizeVariables} = __require("src/core/variables.js");
const {normalizeAssets} = __require("src/core/assets.js");
const {normalizeInteraction} = __require("src/engine/interaction.js");
const {ensurePageMenu} = __require("src/core/navigation.js");
const SCHEMA_VERSION=30;
const DEFAULT_THEME={
  primary:'#5b5ce2',secondary:'#20a06a',accent:'#f4a340',surface:'#fff',soft:'#f6f7fb',text:'#171b2a',muted:'#6f778b',radius:14,font:'system-ui',
  tokens:{
    container:1180,
    colors:{primary:'#5b5ce2',secondary:'#20a06a',accent:'#f4a340',surface:'#fff',soft:'#f6f7fb',text:'#171b2a',muted:'#6f778b',line:'#e6e8ef'},
    spacing:{xs:4,sm:8,md:12,lg:18,xl:28,xxl:44},
    radii:{sm:8,md:12,lg:16,pill:999},
    shadows:{soft:'0 12px 30px rgba(25,30,55,.08)',medium:'0 20px 50px rgba(25,30,55,.12)'},
    typography:{h1:{size:52,lineHeight:1.08,weight:800},h2:{size:36,lineHeight:1.15,weight:800},h3:{size:26,lineHeight:1.2,weight:750},body:{size:16,lineHeight:1.65,weight:400},small:{size:13,lineHeight:1.5,weight:500}},
    motion:{fast:180,normal:360,slow:720}
  }
};
const DEFAULT_DEVICES={desktop:{width:1180},tablet:{width:768},mobile:{width:390}};
const DEFAULT_SETTINGS={advancedDevices:false,propagateDevices:false,snapToGrid:true,gridSize:8,autoSave:true,autoSaveMs:500};
const obj=value=>value&&typeof value==='object'&&!Array.isArray(value);
function makeNode(type,props={},style={},children=[]){return {id:uid('node'),type,props:{...props},style:{marginTop:0,marginBottom:14,...style},responsive:{},classes:[],attrs:{},semantic:{tag:'div',role:'',ariaLabel:''},layout:{display:'block',direction:'column',gap:0,align:'stretch',justify:'start',wrap:false},visibility:{desktop:true,tablet:true,mobile:true},device:{created:null,touched:[]},locked:false,children:Array.isArray(children)?[...children]:[]}}
function makePage(name='الرئيسية',nodes=[],slug){const pageName=String(name||'الرئيسية').trim()||'الرئيسية';return {id:uid('page'),name:pageName,slug:slug||slugify(pageName),path:`/${slug||slugify(pageName)}`.replace('//','/'),seo:{title:pageName,description:'',image:'',canonical:'',noIndex:false},settings:{showInNav:true,hidden:false,template:false},status:'draft',dataBindings:[],nodes:Array.isArray(nodes)?nodes:[]}}
function makeProject(seed={}){const home=makePage('الرئيسية',seed.nodes||[],'home');const now=new Date().toISOString();const baseTheme=deepClone(DEFAULT_THEME);if(obj(seed.theme))Object.assign(baseTheme,deepClone(seed.theme));return {version:SCHEMA_VERSION,meta:{id:typeof seed.id==='string'?seed.id:uid('project'),name:String(seed.name||'مشروعي'),ownerId:typeof seed.ownerId==='string'?seed.ownerId:null,createdAt:now,updatedAt:now,template:seed.template||'',description:String(seed.description||'')},site:{title:String(seed.site?.title||seed.name||'موقع جديد'),description:String(seed.site?.description||'موقع تم بناؤه باستخدام بَنّاء.'),language:'ar',direction:'rtl',locale:'ar-OM',baseUrl:'',favicon:'',socialImage:'',author:'',brand:{name:'بَنّاء',logo:'',mark:'ب'},analytics:{provider:'none',measurementId:''},indexing:{robots:'index,follow',sitemap:true},links:{email:'',phone:'',whatsapp:''},...(obj(seed.site)?deepClone(seed.site):{})},theme:baseTheme,devices:{...DEFAULT_DEVICES,...(obj(seed.devices)?deepClone(seed.devices):{})},pages:[home],assets:Array.isArray(seed.assets)?deepClone(seed.assets):[],variables:obj(seed.variables)?deepClone(seed.variables):{},interactions:Array.isArray(seed.interactions)?deepClone(seed.interactions):[],navigation:{menus:[{id:'main',name:'الرئيسية',items:[]},{id:'footer',name:'التذييل',items:[]}],headerMenuId:'main',footerMenuId:'footer'},cms:{collections:[]},symbols:{definitions:[]},globals:{header:null,footer:null},styleLibrary:{classes:{},textStyles:{},effects:{}},release:{channel:'draft',status:'draft',version:1,publishedAt:null},seo:{enabled:true,canonicalMode:'auto'},settings:{...DEFAULT_SETTINGS,...(obj(seed.settings)?deepClone(seed.settings):{})},activePageId:home.id,activeNodeId:null}
}
const SAFE_SEMANTIC_TAGS=new Set('div section article aside header footer main nav figure figcaption details summary span p blockquote ul ol li dl dt dd h1 h2 h3 h4 h5 h6'.split(' '));
function normalizeSemantic(raw={}){const source=obj(raw)?raw:{};const rawTag=String(source.tag||'div').toLowerCase();return {tag:SAFE_SEMANTIC_TAGS.has(rawTag)?rawTag:'div',role:String(source.role||''),ariaLabel:String(source.ariaLabel||'')}}
function normalizeNode(raw,ids){const input=obj(raw)?raw:{};const id=typeof input.id==='string'&&!ids.has(input.id)?input.id:uid('node');ids.add(id);const classTokens=Array.isArray(input.classes)?input.classes.flatMap(value=>String(value).split(/\s+/).map(token=>token.trim()).filter(Boolean)):[ ];return {...input,id,type:typeof input.type==='string'&&input.type?input.type:'container',props:obj(input.props)?deepClone(input.props):{},style:{marginTop:0,marginBottom:14,...(obj(input.style)?input.style:{})},responsive:obj(input.responsive)?deepClone(input.responsive):{},classes:[...new Set(classTokens)],attrs:obj(input.attrs)?deepClone(input.attrs):{},semantic:normalizeSemantic(input.semantic),layout:{display:'block',direction:'column',gap:0,align:'stretch',justify:'start',wrap:false,...(obj(input.layout)?deepClone(input.layout):{})},visibility:{desktop:true,tablet:true,mobile:true,...(obj(input.visibility)?deepClone(input.visibility):{})},device:{created:input.device?.created||null,touched:Array.isArray(input.device?.touched)?[...new Set(input.device.touched.map(String))]:[]},locked:Boolean(input.locked),children:(Array.isArray(input.children)?input.children:[]).map(child=>normalizeNode(child,ids))}}
function uniqueSlug(value,used){const base=slugify(value);let candidate=base,index=2;while(used.has(candidate))candidate=`${base}-${index++}`;used.add(candidate);return candidate}
function uniquePath(value,fallbackSlug,used){let base=String(value||`/${fallbackSlug}`).trim().replace(/\s+/g,'-').replace(/\/{2,}/g,'/');if(!base.startsWith('/'))base='/'+base;if(base.length>1)base=base.replace(/\/$/,'');if(!base||base==='/')base='/';let candidate=base,index=2;while(used.has(candidate)){candidate=base==='/'?`/home-${index++}`:`${base}-${index++}`}used.add(candidate);return candidate}
function walkPages(pages,fn){for(const page of pages){walk(page.nodes,fn)}}
function normalizeNavbarLinks(page,allPages){walk(page.nodes,node=>{if(node.type!=='navbar')return;const labels=Array.isArray(node.props?.links)?node.props.links:[];const targets=Array.isArray(node.props?.linkTargets)?node.props.linkTargets:[];node.props.links=labels.map(x=>String(x));node.props.linkTargets=labels.map((label,index)=>{const explicit=targets[index];if(typeof explicit==='string'&&allPages.some(p=>p.id===explicit))return explicit;return allPages.find(p=>p.name===label)?.id||((index<allPages.length)?allPages[index].id:allPages[0]?.id||null)})})}
function mergeTheme(source){const theme=deepClone(DEFAULT_THEME);if(obj(source))Object.assign(theme,source);theme.tokens={...deepClone(DEFAULT_THEME.tokens),...(obj(source?.tokens)?source.tokens:{})};theme.tokens.colors={...DEFAULT_THEME.tokens.colors,...(obj(source?.tokens?.colors)?source.tokens.colors:{})};theme.tokens.spacing={...DEFAULT_THEME.tokens.spacing,...(obj(source?.tokens?.spacing)?source.tokens.spacing:{})};theme.tokens.radii={...DEFAULT_THEME.tokens.radii,...(obj(source?.tokens?.radii)?source.tokens.radii:{})};theme.tokens.shadows={...DEFAULT_THEME.tokens.shadows,...(obj(source?.tokens?.shadows)?source.tokens.shadows:{})};theme.tokens.typography={...deepClone(DEFAULT_THEME.tokens.typography),...(obj(source?.tokens?.typography)?source.tokens.typography:{})};for(const key of Object.keys(DEFAULT_THEME.tokens.typography))theme.tokens.typography[key]={...DEFAULT_THEME.tokens.typography[key],...(obj(source?.tokens?.typography?.[key])?source.tokens.typography[key]:{})};theme.tokens.motion={...DEFAULT_THEME.tokens.motion,...(obj(source?.tokens?.motion)?source.tokens.motion:{})};return theme}
function normalizeProject(project){
  const source=obj(project)?project:makeProject();const now=new Date().toISOString();const normalized=deepClone(source);normalized.version=SCHEMA_VERSION;
  normalized.meta=obj(normalized.meta)?normalized.meta:{};normalized.meta.id=typeof normalized.meta.id==='string'&&normalized.meta.id?normalized.meta.id:uid('project');normalized.meta.name=String(normalized.meta.name||'مشروعي').trim()||'مشروعي';normalized.meta.ownerId=typeof normalized.meta.ownerId==='string'&&normalized.meta.ownerId?normalized.meta.ownerId:null;normalized.meta.createdAt=normalized.meta.createdAt||now;normalized.meta.updatedAt=normalized.meta.updatedAt||now;
  normalized.theme=mergeTheme(normalized.theme);normalized.devices={...DEFAULT_DEVICES,...(obj(normalized.devices)?normalized.devices:{})};normalized.settings={...DEFAULT_SETTINGS,...(obj(normalized.settings)?normalized.settings:{})};normalized.assets=normalizeAssets(normalized.assets);normalized.variables=normalizeVariables(normalized.variables);normalized.site={title:String(normalized.site?.title||normalized.meta.name||'موقع جديد'),description:String(normalized.site?.description||'موقع تم بناؤه باستخدام بَنّاء.'),language:'ar',direction:'rtl',locale:'ar-OM',baseUrl:'',favicon:'',socialImage:'',author:'',brand:{name:'بَنّاء',logo:'',mark:'ب'},analytics:{provider:'none',measurementId:''},indexing:{robots:'index,follow',sitemap:true},links:{email:'',phone:'',whatsapp:''},...(obj(normalized.site)?normalized.site:{})};normalized.navigation={menus:[{id:'main',name:'الرئيسية',items:[]},{id:'footer',name:'التذييل',items:[]}],headerMenuId:'main',footerMenuId:'footer',...(obj(normalized.navigation)?normalized.navigation:{})};normalized.navigation.menus=(Array.isArray(normalized.navigation.menus)?normalized.navigation.menus:[]).map(menu=>({id:String(menu?.id||uid('menu')),name:String(menu?.name||'قائمة'),items:Array.isArray(menu?.items)?menu.items:[]}));normalized.cms={collections:Array.isArray(normalized.cms?.collections)?normalized.cms.collections:[]};normalized.symbols={definitions:Array.isArray(normalized.symbols?.definitions)?normalized.symbols.definitions:[]};normalized.globals={header:null,footer:null,...(obj(normalized.globals)?normalized.globals:{})};normalized.styleLibrary={classes:{},textStyles:{},effects:{},components:{},states:{},...(obj(normalized.styleLibrary)?normalized.styleLibrary:{})};normalized.release={channel:'draft',status:'draft',version:1,publishedAt:null,...(obj(normalized.release)?normalized.release:{})};normalized.seo={enabled:true,canonicalMode:'auto',...(obj(normalized.seo)?normalized.seo:{})};
  normalized.pages=Array.isArray(normalized.pages)&&normalized.pages.length?normalized.pages:[makePage()];const pageIds=new Set(),nodeIds=new Set(),slugs=new Set(),paths=new Set();normalized.pages=normalized.pages.map((raw,index)=>{const page=obj(raw)?raw:{};const name=String(page.name||`صفحة ${index+1}`).trim()||`صفحة ${index+1}`;const id=typeof page.id==='string'&&!pageIds.has(page.id)?page.id:uid('page');pageIds.add(id);const slug=uniqueSlug(page.slug||name,slugs);const pathValue=uniquePath(page.path||`/${slug}`,slug,paths);return {...page,id,name,slug,path:pathValue,type:page.type==='template'?'template':'page',parentId:typeof page.parentId==='string'?page.parentId:null,status:['draft','published','archived'].includes(page.status)?page.status:'draft',dataBindings:Array.isArray(page.dataBindings)?deepClone(page.dataBindings):[],seo:{title:name,description:'',image:'',canonical:'',noIndex:false,...(obj(page.seo)?deepClone(page.seo):{})},settings:{showInNav:true,hidden:false,template:false,...(obj(page.settings)?deepClone(page.settings):{})},nodes:(Array.isArray(page.nodes)?page.nodes:[]).map(node=>normalizeNode(node,nodeIds))}});for(const page of normalized.pages)if(page.parentId===page.id||!pageIds.has(page.parentId))page.parentId=null;normalized.activePageId=normalized.pages.some(page=>page.id===normalized.activePageId)?normalized.activePageId:normalized.pages[0].id;for(const page of normalized.pages)normalizeNavbarLinks(page,normalized.pages);
  const validNodeIds=new Set();const validPageIds=new Set(normalized.pages.map(page=>page.id));walkPages(normalized.pages,node=>validNodeIds.add(node.id));normalized.interactions=(Array.isArray(normalized.interactions)?normalized.interactions:[]).map(normalizeInteraction).filter(Boolean).filter(item=>validNodeIds.has(item.sourceId)).filter(item=>!item.options?.targetId||validNodeIds.has(item.options.targetId)).filter(item=>item.action!=='page'||!item.options?.pageId||validPageIds.has(item.options.pageId));
  const mainMenu=normalized.navigation.menus.find(menu=>menu.id===normalized.navigation.headerMenuId)||normalized.navigation.menus[0];if(mainMenu)ensurePageMenu(normalized,mainMenu.id);normalized.activeNodeId=validNodeIds.has(normalized.activeNodeId)?normalized.activeNodeId:null;return normalized
}
function walk(nodes,fn,parent=null){for(let index=0;index<(nodes||[]).length;index++){const current=nodes[index];fn(current,parent,index,nodes);if(current?.children?.length)walk(current.children,fn,current)}}
function findInPage(page,id){let hit=null;walk(page.nodes,(node,parent,index,nodes)=>{if(node.id===id)hit={node,parent,index,nodes,page}});return hit}
function findNode(project,id){const page=(project.pages||[]).find(item=>item.id===project.activePageId);return page?findInPage(page,id):null}
function findNodeGlobal(project,id){if(!id)return null;for(const page of project.pages||[]){const hit=findInPage(page,id);if(hit)return hit}return null}
function countNodes(project){let count=0;for(const page of project.pages||[])walk(page.nodes,()=>count++);return count}
function collectIds(project){const ids=new Set();for(const page of project.pages||[]){ids.add(page.id);walk(page.nodes,node=>ids.add(node.id))}return ids}
function nextPageName(project){let index=1;while(project.pages.some(page=>page.name===`صفحة ${index}`))index++;return `صفحة ${index}`}
exports.SCHEMA_VERSION = SCHEMA_VERSION;
exports.DEFAULT_THEME = DEFAULT_THEME;
exports.DEFAULT_DEVICES = DEFAULT_DEVICES;
exports.DEFAULT_SETTINGS = DEFAULT_SETTINGS;
exports.makeNode = makeNode;
exports.makePage = makePage;
exports.makeProject = makeProject;
exports.normalizeProject = normalizeProject;
exports.walk = walk;
exports.findNode = findNode;
exports.findNodeGlobal = findNodeGlobal;
exports.countNodes = countNodes;
exports.collectIds = collectIds;
exports.nextPageName = nextPageName;
});
__modules.set("src/core/navigation.js",(exports,__require)=>{
const {deepClone,uid} = __require("src/core/utils.js");
const MENU_TYPES = Object.freeze({ PAGE: 'page', URL: 'url', ANCHOR: 'anchor' });
function visiblePages(project) {
  return (project?.pages || []).filter(page => page?.settings?.hidden !== true && page?.status !== 'archived');
}
function ensurePageMenu(project, menuId = project?.navigation?.headerMenuId || 'main') {
  project.navigation ||= {};
  project.navigation.menus ||= [];
  let menu = project.navigation.menus.find(item => item.id === menuId);
  if (!menu) {
    menu = { id: menuId, name: menuId === 'main' ? 'الرئيسية' : 'قائمة جديدة', items: [] };
    project.navigation.menus.push(menu);
  }
  menu.items = Array.isArray(menu.items) ? menu.items : [];
  const pages = visiblePages(project);
  const pageIds = new Set(pages.map(page => page.id));
  const existingPageIds = new Set(menu.items.filter(item => item.type === MENU_TYPES.PAGE).map(item => item.targetId));
  for (const page of pages) {
    if (existingPageIds.has(page.id)) continue;
    menu.items.push({ id: uid('nav'), label: page.name, type: MENU_TYPES.PAGE, targetId: page.id, url: '', newTab: false, children: [] });
  }
  menu.items = menu.items.filter(item => item.type !== MENU_TYPES.PAGE || pageIds.has(item.targetId));
  return menu;
}
function addMenuItem(store, menuId, item = {}) {
  return store.transact('إضافة عنصر للقائمة', project => {
    const menu = ensurePageMenu(project, menuId);
    menu.items.push({ id: uid('nav'), label: String(item.label || 'رابط'), type: item.type === MENU_TYPES.URL ? MENU_TYPES.URL : MENU_TYPES.PAGE, targetId: item.targetId || null, url: String(item.url || ''), newTab: Boolean(item.newTab), children: [] });
  });
}
function updateMenuItem(store, menuId, itemId, patch = {}) {
  return store.transact('تعديل عنصر القائمة', project => {
    const menu = project.navigation?.menus?.find(item => item.id === menuId);
    const item = menu?.items?.find(entry => entry.id === itemId);
    if (!item) return;
    Object.assign(item, deepClone(patch));
  });
}
function removeMenuItem(store, menuId, itemId) {
  return store.transact('حذف عنصر القائمة', project => {
    const menu = project.navigation?.menus?.find(item => item.id === menuId);
    if (!menu) return;
    menu.items = menu.items.filter(item => item.id !== itemId);
  });
}
function reorderMenuItem(store, menuId, itemId, direction) {
  return store.transact(direction === 'up' ? 'رفع عنصر القائمة' : 'خفض عنصر القائمة', project => {
    const menu = project.navigation?.menus?.find(item => item.id === menuId);
    if (!menu) return;
    const index = menu.items.findIndex(item => item.id === itemId);
    const next = index + (direction === 'up' ? -1 : 1);
    if (index < 0 || next < 0 || next >= menu.items.length) return;
    [menu.items[index], menu.items[next]] = [menu.items[next], menu.items[index]];
  });
}
function syncAllPageMenus(store) {
  return store.transact('مزامنة قوائم الموقع', project => {
    for (const menu of project.navigation?.menus || []) {
      const isHeader = menu.id === project.navigation?.headerMenuId;
      if (isHeader) ensurePageMenu(project, menu.id);
    }
  });
}
exports.MENU_TYPES = MENU_TYPES;
exports.visiblePages = visiblePages;
exports.ensurePageMenu = ensurePageMenu;
exports.addMenuItem = addMenuItem;
exports.updateMenuItem = updateMenuItem;
exports.removeMenuItem = removeMenuItem;
exports.reorderMenuItem = reorderMenuItem;
exports.syncAllPageMenus = syncAllPageMenus;
});
__modules.set("src/core/project-repository.js",(exports,__require)=>{
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
    // Keep the localStorage project record small. Blobs marked IndexedDB live in the
    // independent asset database; the hydrated `normalized` object stays in memory.
    const persisted = deepClone(normalized);
    const binaryIds = new Set((persisted.assets||[]).filter(asset=>asset.storageRef==='indexeddb').map(asset=>asset.id));
    for(const asset of persisted.assets||[])if(asset.storageRef==='indexeddb')asset.data='';
    const stripNodes=nodes=>{for(const node of nodes||[]){if(binaryIds.has(node.props?.assetId)){for(const key of ['src','url'])if(/^data:/i.test(String(node.props?.[key]||'')))delete node.props[key]}stripNodes(node.children)}};
    for(const page of persisted.pages||[])stripNodes(page.nodes);
    for(const symbol of persisted.symbols?.definitions||[])if(symbol.root)stripNodes([symbol.root]);
    write(dataKey(userId, normalized.meta.id), persisted);

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
__modules.set("src/core/quality.js",(exports,__require)=>{
const {walk,countNodes} = __require("src/core/model.js");
const {safeUrl} = __require("src/core/utils.js");
const {resolvePageTarget} = __require("src/engine/routing.js");
const AUDIT_LEVELS = Object.freeze(['error','warning','info']);

const issue = (category, severity, title, detail, meta = {}) => ({
  id: `${category}:${title}`,
  category,
  severity,
  title,
  detail,
  ...meta,
});
function auditProject(project = {}) {
  const errors = [];
  const warnings = [];
  const info = [];
  const pages = Array.isArray(project.pages) ? project.pages : [];
  const pagePaths = new Map();
  const assets = Array.isArray(project.assets) ? project.assets : [];
  const ids = new Set();

  if (!project.site?.title?.trim()) errors.push(issue('seo','error','الموقع بدون عنوان عام.','أضف عنوان الموقع من إعدادات الموقع.'));
  if (!project.site?.description?.trim()) warnings.push(issue('seo','warning','الوصف العام للموقع فارغ.','أضف وصفًا مختصرًا وواضحًا للموقع.'));
  if (!project.site?.favicon) warnings.push(issue('brand','warning','لا توجد Favicon.','أضف أيقونة للموقع.'));
  if (!project.site?.baseUrl) warnings.push(issue('seo','warning','Base URL غير محدد.','حدده قبل تصدير sitemap وcanonical للإنتاج.'));
  if (!pages.length) errors.push(issue('structure','error','المشروع لا يحتوي صفحات.','أنشئ صفحة واحدة على الأقل.'));
  if (pages.length > 1) info.push(issue('structure','info',`${pages.length} صفحات في الموقع.`,'تنقل الصفحات مستقل عن ترتيبها في المستند.'));

  for (const page of pages) {
    if (ids.has(page.id)) errors.push(issue('structure','error',`معرّف صفحة مكرر: ${page.name}.`,'يجب أن تكون لكل صفحة هوية مستقلة.'));
    ids.add(page.id);
    const path = String(page.path || '').trim() || '/';
    if (pagePaths.has(path)) errors.push(issue('routing','error',`مسار صفحة مكرر: ${path}.`,'غيّر مسار إحدى الصفحات.'));
    else pagePaths.set(path,page.id);
    if (!String(page.seo?.title || '').trim()) warnings.push(issue('seo','warning',`عنوان SEO فارغ في «${page.name}».`,'أضف عنوانًا خاصًا بالصفحة.'));
    if (String(page.seo?.title || '').length > 60) info.push(issue('seo','info',`عنوان SEO طويل في «${page.name}».`,'راجع طوله لتحسين الظهور في نتائج البحث.'));
    if (String(page.seo?.description || '').length > 160) info.push(issue('seo','info',`وصف SEO طويل في «${page.name}».`,'راجع الوصف لتقليل الاقتطاع في النتائج.'));
    let h1 = 0;
    walk(page.nodes, node => {
      if (!node?.id) warnings.push(issue('structure','warning',`عنصر بدون ID في «${page.name}».`,'أعد إدراجه من Document Model.'));
      if (node?.id) ids.add(node.id);
      if (node.type === 'heading') {
        const level = Number(node.props?.level || 2);
        if (level === 1) h1 += 1;
        if (!String(node.props?.text || '').trim()) warnings.push(issue('content','warning',`عنوان فارغ في «${page.name}».`,'أدخل نصًا للعنوان.'));
      }
      if (node.type === 'image' && !String(node.props?.alt || '').trim()) warnings.push(issue('a11y','warning',`صورة بدون وصف بديل في «${page.name}».`,'أضف alt وصفيًا.'));
      if (node.type === 'image' && !String(node.props?.src || '').trim()) warnings.push(issue('assets','warning',`صورة بدون مصدر في «${page.name}».`,'اختر وسيطًا من مكتبة الأصول.'));
      if (['button','link','card','product'].includes(node.type)) {
        const url = String(node.props?.url || '').trim();
        if (!url || url === '#') warnings.push(issue('links','warning',`رابط غير مكتمل في «${page.name}».`,'حدد صفحة أو رابطًا خارجيًا.'));
        if (url.startsWith('page:') && !resolvePageTarget(url, project)) errors.push(issue('links','error',`رابط داخلي مكسور في «${page.name}».`,'الصفحة المستهدفة غير موجودة.'));
        if (/^javascript:/i.test(url)) errors.push(issue('security','error',`رابط غير آمن في «${page.name}».`,'تم رفض javascript: كوجهة.'));
      }
      if (node.type === 'form' && !node.props?.action) info.push(issue('forms','info',`النموذج في «${page.name}» لا يملك جهة إرسال.`,'هذه واجهة فقط حتى تضبط جهة الإرسال.'));
      if (['input','textarea','select'].includes(node.type) && !node.semantic?.ariaLabel && !node.props?.label) warnings.push(issue('a11y','warning',`حقل بدون تسمية واضحة في «${page.name}».`,'أضف label أو aria-label.'));
    });
    if (h1 === 0) warnings.push(issue('seo','warning',`صفحة «${page.name}» بلا H1.`,'استخدم H1 واحدًا واضحًا.'));
    if (h1 > 1) warnings.push(issue('seo','warning',`صفحة «${page.name}» تحتوي أكثر من H1.`,'اختصر التسلسل إلى عنوان رئيسي واحد.'));
  }

  const duplicateAssets = assets.length - new Set(assets.map(asset => asset.id)).size;
  if (duplicateAssets > 0) warnings.push(issue('assets','warning',`${duplicateAssets} أصول مكررة المعرف.`,'سيتم إزالة التكرار أثناء normalization.'));
  const largeAssets = assets.filter(asset => Number(asset.size || 0) > 2_000_000);
  if (largeAssets.length) info.push(issue('performance','info',`${largeAssets.length} أصول أكبر من 2MB.`,'ضغط الصور قبل التصدير يساعد الأداء.'));
  const externalLinks = pages.reduce((count,page)=>{let n=0;walk(page.nodes,node=>{for(const key of ['url','src']){const v=String(node.props?.[key]||'');if(v&&safeUrl(v)!=='#'&&/^https?:\/\//i.test(v))n++}});return count+n},0);
  if (externalLinks) info.push(issue('links','info',`${externalLinks} وجهات خارجية.`,'راجع الروابط الخارجية قبل النشر.'));

  const all = [...errors,...warnings,...info];
  const score = Math.max(0, Math.min(100, 100 - errors.length * 14 - warnings.length * 4 - info.length));
  return { score, issues: errors, warnings, info, nodes: countNodes(project), pages: pages.length, assets: assets.length, summary: { errors: errors.length, warnings: warnings.length, info: info.length, score }, all };
}
exports.AUDIT_LEVELS = AUDIT_LEVELS;
exports.auditProject = auditProject;
});
__modules.set("src/core/runtime.js",(exports,__require)=>{
const {storageInfo} = __require("src/core/storage.js");
const RUNTIME_VERSION='28.0.0';
function getClientRuntime(){return {runtime:'html',offline:true,mode:'direct-file',version:RUNTIME_VERSION,storage:storageInfo(),crypto:Boolean(globalThis.crypto?.subtle)}}
exports.RUNTIME_VERSION = RUNTIME_VERSION;
exports.getClientRuntime = getClientRuntime;
});
__modules.set("src/core/site-schema.js",(exports,__require)=>{
const {deepClone,uid,slugify} = __require("src/core/utils.js");
const SITE_SCHEMA_VERSION = 20;
const DEFAULT_SITE = {
  title: 'موقع جديد',
  description: 'موقع تم بناؤه باستخدام بَنّاء.',
  language: 'ar',
  direction: 'rtl',
  locale: 'ar-OM',
  baseUrl: '',
  favicon: '',
  socialImage: '',
  author: '',
  brand: { name: 'بَنّاء', logo: '', mark: 'ب' },
  analytics: { provider: 'none', measurementId: '' },
  indexing: { robots: 'index,follow', sitemap: true },
  links: { email: '', phone: '', whatsapp: '' },
};
const DEFAULT_NAVIGATION = {
  menus: [
    { id: 'main', name: 'الرئيسية', items: [] },
    { id: 'footer', name: 'التذييل', items: [] },
  ],
  headerMenuId: 'main',
  footerMenuId: 'footer',
};
const DEFAULT_CMS = { collections: [] };
const DEFAULT_SYMBOLS = { definitions: [] };
const DEFAULT_GLOBALS = { header: null, footer: null };
const DEFAULT_STYLE_LIBRARY = { classes: {}, textStyles: {}, effects: {}, components: {}, states: {} };

const isObject = value => value && typeof value === 'object' && !Array.isArray(value);
function makeCollection(name = 'مجموعة جديدة', fields = []) {
  const clean = String(name || '').trim() || 'مجموعة جديدة';
  const key = slugify(clean).replace(/-/g, '_') || `collection_${Date.now()}`;
  return {
    id: uid('collection'),
    name: clean,
    key,
    route: `/${slugify(clean)}`,
    fields: fields.length ? deepClone(fields) : [
      { id: uid('field'), key: 'title', label: 'العنوان', type: 'text', required: true },
      { id: uid('field'), key: 'slug', label: 'الرابط', type: 'slug', required: true },
      { id: uid('field'), key: 'body', label: 'المحتوى', type: 'richtext', required: false },
      { id: uid('field'), key: 'image', label: 'الصورة', type: 'image', required: false },
    ],
    items: [],
    settings: { public: true, sortBy: 'createdAt', sortDirection: 'desc' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
function makeCmsItem(collection, data = {}) {
  return {
    id: uid('item'),
    collectionId: collection?.id || null,
    slug: String(data.slug || data.title || 'item').trim().toLowerCase().replace(/\s+/g, '-'),
    data: isObject(data) ? deepClone(data) : {},
    status: 'published',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
function makeSymbol(name = 'مكون مشترك', root = null, options = {}) {
  return {
    id: uid('symbol'),
    name: String(name || 'مكون مشترك').trim() || 'مكون مشترك',
    description: String(options.description || ''),
    root: root ? deepClone(root) : null,
    props: isObject(options.props) ? deepClone(options.props) : {},
    slots: Array.isArray(options.slots) ? deepClone(options.slots) : [],
    scope: options.scope === 'page' ? 'page' : 'site',
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
function normalizeSite(site = {}) {
  return { ...deepClone(DEFAULT_SITE), ...(isObject(site) ? deepClone(site) : {}), brand: { ...DEFAULT_SITE.brand, ...(site?.brand || {}) }, analytics: { ...DEFAULT_SITE.analytics, ...(site?.analytics || {}) }, indexing: { ...DEFAULT_SITE.indexing, ...(site?.indexing || {}) }, links: { ...DEFAULT_SITE.links, ...(site?.links || {}) } };
}
function normalizeNavigation(navigation = {}) {
  const menus = Array.isArray(navigation.menus) && navigation.menus.length ? navigation.menus : deepClone(DEFAULT_NAVIGATION.menus);
  return {
    ...deepClone(DEFAULT_NAVIGATION),
    ...(isObject(navigation) ? deepClone(navigation) : {}),
    menus: menus.map(menu => ({ id: String(menu?.id || uid('menu')), name: String(menu?.name || 'قائمة'), items: Array.isArray(menu?.items) ? deepClone(menu.items) : [] })),
  };
}
function normalizeCms(cms = {}) {
  return {
    collections: Array.isArray(cms?.collections) ? deepClone(cms.collections).map(collection => ({
      ...collection,
      fields: Array.isArray(collection.fields) ? collection.fields : [],
      items: Array.isArray(collection.items) ? collection.items : [],
      settings: { public: true, sortBy: 'createdAt', sortDirection: 'desc', ...(collection.settings || {}) },
    })) : [],
  };
}
function normalizeSymbols(symbols = {}) {
  return { definitions: Array.isArray(symbols?.definitions) ? deepClone(symbols.definitions).filter(item => item?.id && item?.root) : [] };
}
function normalizeGlobals(globals = {}) {
  return { ...deepClone(DEFAULT_GLOBALS), ...(isObject(globals) ? deepClone(globals) : {}) };
}
function normalizeStyleLibrary(library = {}) {
  return { ...deepClone(DEFAULT_STYLE_LIBRARY), ...(isObject(library) ? deepClone(library) : {}), classes: isObject(library?.classes) ? deepClone(library.classes) : {}, textStyles: isObject(library?.textStyles) ? deepClone(library.textStyles) : {}, effects: isObject(library?.effects) ? deepClone(library.effects) : {}, components: isObject(library?.components) ? deepClone(library.components) : {}, states: isObject(library?.states) ? deepClone(library.states) : {} };
}
exports.SITE_SCHEMA_VERSION = SITE_SCHEMA_VERSION;
exports.DEFAULT_SITE = DEFAULT_SITE;
exports.DEFAULT_NAVIGATION = DEFAULT_NAVIGATION;
exports.DEFAULT_CMS = DEFAULT_CMS;
exports.DEFAULT_SYMBOLS = DEFAULT_SYMBOLS;
exports.DEFAULT_GLOBALS = DEFAULT_GLOBALS;
exports.DEFAULT_STYLE_LIBRARY = DEFAULT_STYLE_LIBRARY;
exports.makeCollection = makeCollection;
exports.makeCmsItem = makeCmsItem;
exports.makeSymbol = makeSymbol;
exports.normalizeSite = normalizeSite;
exports.normalizeNavigation = normalizeNavigation;
exports.normalizeCms = normalizeCms;
exports.normalizeSymbols = normalizeSymbols;
exports.normalizeGlobals = normalizeGlobals;
exports.normalizeStyleLibrary = normalizeStyleLibrary;
});
__modules.set("src/core/storage.js",(exports,__require)=>{
class MemoryStorage{constructor(){this.map=new Map()}getItem(key){return this.map.has(String(key))?this.map.get(String(key)):null}setItem(key,value){this.map.set(String(key),String(value))}removeItem(key){this.map.delete(String(key))}clear(){this.map.clear()}key(index){return [...this.map.keys()][index]??null}get length(){return this.map.size}}
const memory=new MemoryStorage();
let cached=null;
function getStorage(){if(cached)return cached;try{const candidate=globalThis.localStorage;const probe='__bunaa_storage_probe__';candidate.setItem(probe,'1');candidate.removeItem(probe);cached=candidate}catch{cached=memory}return cached}
function storageInfo(){const s=getStorage();return {kind:s===memory?'memory':'localStorage',persistent:s!==memory,available:Boolean(s)}}
const storage=getStorage();
exports.getStorage = getStorage;
exports.storageInfo = storageInfo;
exports.storage = storage;
});
__modules.set("src/core/store.js",(exports,__require)=>{
const {storage} = __require("src/core/storage.js");
const {deepClone,debounce} = __require("src/core/utils.js");
const {makeProject,normalizeProject,findNodeGlobal,countNodes,makePage,nextPageName,collectIds} = __require("src/core/model.js");
const {ProjectRepository} = __require("src/core/project-repository.js");
const UI_KEY='bunaa_v26_ui';
const DEFAULT_UI={mode:'normal',device:'desktop',leftTab:'elements',leftOpen:true,rightOpen:true,zoom:1,grid:true,focus:false,interactionMode:false,advancedDevices:false,selected:null,saveError:false};
const readJson=key=>{try{const raw=storage.getItem(key);return raw?JSON.parse(raw):null}catch{return null}};
class Store{
  constructor(repository=new ProjectRepository()){
    this.repo=repository;this.project=makeProject();this.ui={...DEFAULT_UI};this.userId=null;this.projectId=null;this.history=[];this.future=[];this.maxHistory=100;this.subscribers=new Set();this.restorable=false;this.dirty=false;this.lastSavedAt=null;this.saveState='saved';this.persist=debounce(()=>this.persistNow(),500);
  }
  uiKey(){return this.userId?`${UI_KEY}:${this.userId}`:UI_KEY}
  legacyUiKeys(){return this.userId?[`bunaa_v25_ui:${this.userId}`,`bunaa_v20_ui:${this.userId}`,`bunaa_v19_ui:${this.userId}`,`bunaa_v18_ui:${this.userId}`,`bunaa_v17_ui:${this.userId}`,`bunaa_v16_ui:${this.userId}`,`bunaa_v15_ui:${this.userId}`,`bunaa_v14_ui:${this.userId}`]:['bunaa_v25_ui','bunaa_v20_ui','bunaa_v19_ui','bunaa_v18_ui','bunaa_v17_ui','bunaa_v16_ui','bunaa_v15_ui','bunaa_v14_ui']}
  setAccount(userId){
    this.persist.cancel?.();this.userId=String(userId||'')||null;this.projectId=null;this.project=makeProject(this.userId?{ownerId:this.userId}:{});this.ui={...DEFAULT_UI};this.history=[];this.future=[];this.restorable=false;this.dirty=false;this.saveState='saved';
    const saved=readJson(this.uiKey());if(saved)this.ui={...DEFAULT_UI,...saved};else for(const key of this.legacyUiKeys()){const legacy=readJson(key);if(legacy){this.ui={...DEFAULT_UI,...legacy};break}}
    if(this.userId)this.repo.migrateLegacy(this.userId);this.reconcileUi();this.emit();return this.userId;
  }
  listProjects(){return this.userId?this.repo.list(this.userId):[]}
  openProject(projectId){
    if(!this.userId)return false;
    this.persist.cancel?.();const project=this.repo.get(this.userId,projectId);if(!project)return false;
    this.project=normalizeProject(project);this.projectId=this.project.meta.id;this.restorable=true;this.dirty=false;this.saveState='saved';this.history=[];this.future=[];this.ui.selected=null;this.reconcileUi();this.emit();return true;
  }
  createProject(name='مشروعي',seed={}){
    if(!this.userId)throw new Error('سجّل الدخول أولًا.');
    this.persist.cancel?.();const project=this.repo.create(this.userId,{name,seed});this.project=normalizeProject(project);this.projectId=this.project.meta.id;this.restorable=true;this.dirty=false;this.saveState='saved';this.history=[];this.future=[];this.ui.selected=null;this.reconcileUi();this.emit();return this.project;
  }
  deleteProject(projectId=this.projectId){
    if(!this.userId||!projectId)return false;const ok=this.repo.remove(this.userId,projectId);if(ok&&projectId===this.projectId)this.clearProject();return ok;
  }
  duplicateProject(projectId=this.projectId,name=''){
    if(!this.userId||!projectId)return null;const project=this.repo.duplicate(this.userId,projectId,name);return project?normalizeProject(project):null;
  }
  clearProject(){this.persist.cancel?.();this.projectId=null;this.project=makeProject(this.userId?{ownerId:this.userId}:{});this.ui.selected=null;this.history=[];this.future=[];this.restorable=false;this.dirty=false;this.saveState='saved';this.emit()}
  clearAccount(){this.persist.cancel?.();this.userId=null;this.projectId=null;this.project=makeProject();this.ui={...DEFAULT_UI};this.history=[];this.future=[];this.restorable=false;this.dirty=false;this.saveState='saved';this.emit()}
  get canUndo(){return this.history.length>0}
  get canRedo(){return this.future.length>0}
  reconcileUi(){if(!this.project.pages.some(p=>p.id===this.project.activePageId))this.project.activePageId=this.project.pages[0]?.id||null;if(this.ui.selected&&!findNodeGlobal(this.project,this.ui.selected))this.ui.selected=null;if(!['desktop','tablet','mobile'].includes(this.ui.device))this.ui.device='desktop';this.ui.zoom=Math.min(1.5,Math.max(.55,Number(this.ui.zoom)||1));this.ui.leftOpen=Boolean(this.ui.leftOpen);this.ui.rightOpen=Boolean(this.ui.rightOpen)}
  snapshot(){return deepClone(this.project)}
  transact(label,mutator,{record=true,persist=true,emit=true}={}){
    if(typeof mutator!=='function')throw new TypeError('mutator must be a function');const before=this.snapshot();
    try{mutator(this.project);this.project=normalizeProject(this.project);this.project.meta.id=this.projectId||this.project.meta.id;this.project.meta.ownerId=this.userId||this.project.meta.ownerId}catch(error){this.project=before;throw new Error(`${label}: ${error.message}`,{cause:error})}
    const after=this.snapshot();const changed=JSON.stringify(before)!==JSON.stringify(after);if(changed){this.project.meta.updatedAt=new Date().toISOString();this.dirty=true;this.saveState='pending';if(record){this.history.push({label,before,after});if(this.history.length>this.maxHistory)this.history.shift();this.future=[]}if(persist)this.persist();if(emit)this.emit()}return changed;
  }
  undo(){const op=this.history.pop();if(!op)return false;this.future.push(op);this.project=normalizeProject(op.before);this.reconcileUi();this.markDirty();this.persist();this.emit();return true}
  redo(){const op=this.future.pop();if(!op)return false;this.history.push(op);this.project=normalizeProject(op.after);this.reconcileUi();this.markDirty();this.persist();this.emit();return true}
  markDirty(){this.dirty=true;this.saveState='pending';this.project.meta.updatedAt=new Date().toISOString()}
  subscribe(fn){this.subscribers.add(fn);return()=>this.subscribers.delete(fn)}
  emit(){for(const fn of [...this.subscribers])try{fn(this.project,this.ui,this)}catch(error){console.error('Store subscriber failed',error)}}
  setUI(patch,{emit=true}={}){this.ui={...this.ui,...patch};try{storage.setItem(this.uiKey(),JSON.stringify(this.ui))}catch{this.ui.saveError=true}if(emit)this.emit()}
  persistNow(){
    this.persist.cancel?.();if(!this.userId||!this.projectId||!this.dirty)return false;try{this.project.meta.updatedAt=new Date().toISOString();this.project=this.repo.save(this.userId,this.project);this.restorable=true;this.dirty=false;this.saveState='saved';this.lastSavedAt=new Date().toISOString();this.ui.saveError=false;storage.setItem(this.uiKey(),JSON.stringify(this.ui));this.emit();return true}catch(error){this.ui.saveError=true;this.saveState='error';console.warn('Project save failed',error);this.emit();return false}
  }
  find(id){return findNodeGlobal(this.project,id)}
  activePage(){return this.project.pages.find(p=>p.id===this.project.activePageId)||this.project.pages[0]}
  nodeCount(){return countNodes(this.project)}
  setActivePage(id){if(!this.project.pages.some(p=>p.id===id))return false;const changed=this.project.activePageId!==id;this.project.activePageId=id;this.ui.selected=null;if(changed){this.markDirty();this.persist();this.emit()}return changed}
  addPage(name=nextPageName(this.project)){let page;this.transact('إضافة صفحة',project=>{page=makePage(String(name).trim()||nextPageName(project));project.pages.push(page);project.activePageId=page.id});this.ui.selected=null;return page}
  duplicatePage(id=this.project.activePageId){const source=this.project.pages.find(p=>p.id===id);if(!source)return null;const mapping=new Map();let resultId=null;const remap=node=>{const clone=deepClone(node);const oldId=clone.id;clone.id=`${oldId}_${Math.random().toString(36).slice(2,7)}`;mapping.set(oldId,clone.id);clone.children=(clone.children||[]).map(remap);return clone};this.transact('نسخ الصفحة',project=>{const copy=deepClone(source);copy.id=`page_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,6)}`;copy.slug=undefined;copy.name=`${source.name} — نسخة`;copy.nodes=(copy.nodes||[]).map(remap);project.pages.push(copy);project.activePageId=copy.id;const copiedInteractions=(project.interactions||[]).filter(item=>item&&mapping.has(item.sourceId)).map(item=>{const next=deepClone(item);next.id=`int_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`;next.sourceId=mapping.get(item.sourceId);if(next.options?.targetId&&mapping.has(next.options.targetId))next.options.targetId=mapping.get(next.options.targetId);else if(next.options?.targetId)next.options.targetId=null;return next});project.interactions=[...(project.interactions||[]),...copiedInteractions];resultId=copy.id});this.ui.selected=null;return this.project.pages.find(page=>page.id===resultId)||null}
  movePage(id,direction){const index=this.project.pages.findIndex(p=>p.id===id);if(index<0)return false;const to=index+(direction==='up'?-1:1);if(to<0||to>=this.project.pages.length)return false;return this.transact(direction==='up'?'نقل الصفحة للأعلى':'نقل الصفحة للأسفل',project=>{[project.pages[index],project.pages[to]]=[project.pages[to],project.pages[index]]})}
  setHomePage(id){if(!this.project.pages.some(p=>p.id===id))return false;return this.transact('تعيين الصفحة الرئيسية',project=>{const index=project.pages.findIndex(p=>p.id===id);if(index>0){const [page]=project.pages.splice(index,1);project.pages.unshift(page)}})}
  setPageParent(id,parentId=null){if(!this.project.pages.some(p=>p.id===id))return false;if(parentId&&!this.project.pages.some(p=>p.id===parentId))return false;if(parentId===id)return false;const byId=new Map(this.project.pages.map(p=>[p.id,p]));let cursor=parentId;while(cursor){if(cursor===id)return false;cursor=byId.get(cursor)?.parentId||null}return this.transact('تغيير الصفحة الأب',project=>{const page=project.pages.find(p=>p.id===id);if(page)page.parentId=parentId||null})}
  deletePage(id=this.project.activePageId){if(this.project.pages.length<=1)return false;const index=this.project.pages.findIndex(p=>p.id===id);if(index<0)return false;const ok=this.transact('حذف صفحة',project=>{project.pages.splice(index,1);project.activePageId=project.pages[Math.max(0,index-1)].id;const ids=collectIds(project);project.interactions=(project.interactions||[]).filter(item=>ids.has(item.sourceId)&&(!item.options?.targetId||ids.has(item.options.targetId))&&(!item.options?.pageId||project.pages.some(page=>page.id===item.options.pageId)))});this.ui.selected=null;this.reconcileUi();return ok}
}
exports.UI_KEY = UI_KEY;
exports.Store = Store;
});
__modules.set("src/core/symbols.js",(exports,__require)=>{
const {deepClone,uid} = __require("src/core/utils.js");
const {makeSymbol} = __require("src/core/site-schema.js");
const {findNodeGlobal} = __require("src/core/model.js");
const {initializeDevicePresetsTree} = __require("src/core/device-presets.js");
function createSymbolFromSelection(store, name = 'مكون مشترك') {
  const selectedId = store.ui.selected;
  const hit = selectedId ? findNodeGlobal(store.project, selectedId) : null;
  if (!hit) return null;
  const symbol = makeSymbol(name, hit.node, { description: `مكون مشترك مبني من ${hit.node.type}` });
  store.transact('إنشاء مكون مشترك', project => { project.symbols ||= { definitions: [] }; project.symbols.definitions.push(symbol); });
  return symbol;
}
function insertSymbol(store, symbolId) {
  const definition = store.project.symbols?.definitions?.find(item => item.id === symbolId);
  if (!definition?.root) return null;
  let node = null;
  store.transact('إدراج مكون مشترك', project => {
    const page = project.pages.find(item => item.id === project.activePageId);
    if (!page) return;
    node = { id: uid('node'), type: 'symbol-instance', props: { symbolId, overrides: {} }, style: {}, responsive: {}, layout: { display: 'block', direction: 'column', gap: 0, align: 'stretch', justify: 'start', wrap: false }, visibility: { desktop: true, tablet: true, mobile: true }, locked: false, children: [] };
    initializeDevicePresetsTree([node], store.ui?.device || 'desktop');
    page.nodes.push(node);
  });
  return node;
}
function updateSymbol(store, symbolId, patch = {}) {
  return store.transact('تعديل المكون المشترك', project => {
    const definition = project.symbols?.definitions?.find(item => item.id === symbolId);
    if (!definition) return;
    Object.assign(definition, deepClone(patch), { version: Number(definition.version || 1) + 1, updatedAt: new Date().toISOString() });
  });
}
function removeSymbol(store, symbolId) {
  return store.transact('حذف المكون المشترك', project => {
    project.symbols.definitions = (project.symbols.definitions || []).filter(item => item.id !== symbolId);
    walkPages(project.pages, node => { if (node.type === 'symbol-instance' && node.props?.symbolId === symbolId) node.type = 'group'; });
  });
}
function resolveSymbol(project, symbolId) { return project.symbols?.definitions?.find(item => item.id === symbolId) || null; }
exports.createSymbolFromSelection = createSymbolFromSelection;
exports.insertSymbol = insertSymbol;
exports.updateSymbol = updateSymbol;
exports.removeSymbol = removeSymbol;
exports.resolveSymbol = resolveSymbol;
});
__modules.set("src/core/utils.js",(exports,__require)=>{
const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
const uid=(prefix='id')=>{const token=globalThis.crypto?.randomUUID?.()||`${Date.now().toString(36)}_${Math.random().toString(36).slice(2,10)}`;return `${prefix}_${token.replace(/[^a-zA-Z0-9_-]/g,'')}`};
const deepClone=o=>o===undefined?undefined:(typeof structuredClone==='function'?structuredClone(o):JSON.parse(JSON.stringify(o)));
const isObject=v=>v&&typeof v==='object'&&!Array.isArray(v);
const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const escapeAttr=escapeHtml;
const slugify=text=>{const s=String(text||'').normalize('NFKC').trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-+|-+$/g,'');return s||`page-${uid('slug').slice(-8)}`};
const debounce=(fn,wait=250)=>{let t;const wrapped=(...args)=>{clearTimeout(t);t=setTimeout(()=>fn(...args),wait)};wrapped.cancel=()=>clearTimeout(t);return wrapped};
function safeUrl(url=''){const s=String(url??'').trim();if(!s||s==='#')return '#';if(/^(javascript|vbscript|file|data):/i.test(s))return '#';if(/^(https?:|mailto:|tel:)/i.test(s))return s;if(/^[/#.][^\s]*$/.test(s)||/^[^:\s]+(?:[/#][^\s]*)?$/.test(s))return s;return '#'}
function safeMediaUrl(url='',kind='any'){const s=String(url??'').trim();if(!s)return '';if(/^https?:/i.test(s)||/^blob:/i.test(s))return s;if(kind==='image'&&/^data:image\/(?:png|jpe?g|gif|webp|svg\+xml);base64,/i.test(s))return s;if(kind==='audio'&&/^data:audio\/[\w.+-]+;base64,/i.test(s))return s;if(kind==='video'&&/^data:video\/[\w.+-]+;base64,/i.test(s))return s;return ''}
const dataUrlFromFile=file=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(r.error||new Error('فشل قراءة الملف'));r.readAsDataURL(file)});
const formatBytes=b=>{const n=Number(b)||0;return n<1024?`${n} B`:n<1048576?`${(n/1024).toFixed(1)} KB`:`${(n/1048576).toFixed(2)} MB`};
const downloadBlob=(blob,name)=>{const anchor=document.createElement('a');const url=URL.createObjectURL(blob);anchor.href=url;anchor.download=name;document.body.appendChild(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)};
const downloadText=(content,name,type='text/plain;charset=utf-8')=>downloadBlob(new Blob([content],{type}),name);
const throttle=(fn,wait=80)=>{let last=0,timer=null;return (...args)=>{const now=Date.now(),remaining=wait-(now-last);if(remaining<=0){clearTimeout(timer);timer=null;last=now;fn(...args)}else if(!timer){timer=setTimeout(()=>{timer=null;last=Date.now();fn(...args)},remaining)}}};
const deepMerge=(base,patch)=>{if(!isObject(base)||!isObject(patch))return deepClone(patch);const out=deepClone(base);for(const [key,value] of Object.entries(patch))out[key]=isObject(value)&&isObject(out[key])?deepMerge(out[key],value):deepClone(value);return out};
const textToLines=text=>String(text||'').split(/\n+/).map(s=>s.trim()).filter(Boolean);
exports.clamp = clamp;
exports.uid = uid;
exports.deepClone = deepClone;
exports.isObject = isObject;
exports.escapeHtml = escapeHtml;
exports.escapeAttr = escapeAttr;
exports.slugify = slugify;
exports.debounce = debounce;
exports.safeUrl = safeUrl;
exports.safeMediaUrl = safeMediaUrl;
exports.dataUrlFromFile = dataUrlFromFile;
exports.formatBytes = formatBytes;
exports.downloadBlob = downloadBlob;
exports.downloadText = downloadText;
exports.throttle = throttle;
exports.deepMerge = deepMerge;
exports.textToLines = textToLines;
});
__modules.set("src/core/variables.js",(exports,__require)=>{
const {deepClone,uid} = __require("src/core/utils.js");
const VARIABLE_TYPES=Object.freeze(['text','number','color','url','boolean','json']);
const RESERVED_VARIABLES=new Set(['_meta']);
function normalizeVariables(source={}){
  const out={};
  if(source&&typeof source==='object'&&!Array.isArray(source)){
    for(const [key,raw] of Object.entries(source)){
      if(RESERVED_VARIABLES.has(key)) continue;
      if(raw&&typeof raw==='object'&&!Array.isArray(raw)&&('value' in raw || 'type' in raw)){
        out[key]={id:String(raw.id||uid('var')),name:String(raw.name||key),type:VARIABLE_TYPES.includes(raw.type)?raw.type:'text',value:deepClone(raw.value??''),description:String(raw.description||'')};
      }else out[key]={id:uid('var'),name:key,type:'text',value:deepClone(raw),description:''};
    }
  }
  return out;
}
function listVariables(project){return Object.entries(normalizeVariables(project?.variables)).map(([key,v])=>({key,...v})).sort((a,b)=>a.name.localeCompare(b.name,'ar'))}
function getVariable(project,key,fallback=''){const value=normalizeVariables(project?.variables)[String(key||'')];return value?deepClone(value.value):fallback}
function setVariable(store,key,patch={}){
  const clean=String(key||'').trim().replace(/[^a-zA-Z0-9_\u0600-\u06ff-]/g,'_');
  if(!clean||RESERVED_VARIABLES.has(clean)) return false;
  return store.transact('تعديل متغير الموقع',project=>{
    project.variables=normalizeVariables(project.variables);
    const current=project.variables[clean]||{id:uid('var'),name:clean,type:'text',value:'',description:''};
    project.variables[clean]={...current,...deepClone(patch),id:current.id||uid('var'),name:String(patch.name||current.name||clean),type:VARIABLE_TYPES.includes(patch.type)?patch.type:(current.type||'text')};
  });
}
function removeVariable(store,key){return store.transact('حذف متغير الموقع',project=>{if(project.variables)delete project.variables[String(key||'')];})}
function resolveVariableValue(value,project){
  if(typeof value!=='string') return value;
  const exact=value.match(/^var:([a-zA-Z0-9_\u0600-\u06ff-]+)$/);
  if(exact) return getVariable(project,exact[1],value);
  return value.replace(/\{\{var:([a-zA-Z0-9_\u0600-\u06ff-]+)\}\}/g,(_,key)=>String(getVariable(project,key,'')));
}
exports.VARIABLE_TYPES = VARIABLE_TYPES;
exports.RESERVED_VARIABLES = RESERVED_VARIABLES;
exports.normalizeVariables = normalizeVariables;
exports.listVariables = listVariables;
exports.getVariable = getVariable;
exports.setVariable = setVariable;
exports.removeVariable = removeVariable;
exports.resolveVariableValue = resolveVariableValue;
});
__modules.set("src/engine/exporter.js",(exports,__require)=>{
const {nodeHtml} = __require("src/engine/renderer.js");
const {escapeHtml,downloadText,downloadBlob,deepClone} = __require("src/core/utils.js");
const {resolveStyle,styleObjectToCss} = __require("src/engine/layout.js");
const {themeCss} = __require("src/core/design-system.js");
const {normalizeAssets} = __require("src/core/assets.js");

function safeName(value){return String(value||'project').normalize('NFKC').replace(/[^\p{L}\p{N}_-]+/gu,'-').replace(/-+/g,'-').slice(0,60)||'project'}
function assetBytes(data){const text=String(data||'');const match=text.match(/^data:([^;,]+)?(;base64)?,(.*)$/s);if(!match)return null;try{if(match[2]){const bin=atob(match[3]);const bytes=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);return bytes}return new TextEncoder().encode(decodeURIComponent(match[3]))}catch{return null}}
function assetFileMap(project){const map=new Map();for(const asset of normalizeAssets(project.assets)){map.set(asset.id,`assets/${asset.filename||asset.name}`)}return map}
function pageFileMap(project){const used=new Set(['index.html','styles.css','script.js','project.json','README.md']);const map=new Map();for(const [index,page] of project.pages.entries()){if(index===0){map.set(page.id,'index.html');continue}const base=safeName(page.slug||page.name)||`page-${index+1}`;let file=`${base}.html`,n=2;while(used.has(file))file=`${base}-${n++}.html`;used.add(file);map.set(page.id,file)}return map}
function walk(nodes,fn){(nodes||[]).forEach(node=>{fn(node);walk(node.children,fn)})}
function responsiveCss(project){const rules=[];const sizes={tablet:'@media (max-width: 900px)',mobile:'@media (max-width: 640px)'};for(const page of project.pages)walk(page.nodes,node=>{for(const device of ['tablet','mobile']){const style=resolveStyle(node,device,project.theme,project.styleLibrary,project);const css=styleObjectToCss(style);if(css)rules.push(`${sizes[device]}{[data-runtime-id="${String(node.id).replace(/"/g,'\\"')}"]{${css}}}`);if(node.visibility?.[device]===false)rules.push(`${sizes[device]}{[data-runtime-id="${String(node.id).replace(/"/g,'\\"')}"]{display:none!important}}`)}});return rules.join('')}
function buildExportFiles(project){const map=pageFileMap(project);const assetMap=assetFileMap(project);const primary=project.theme?.primary||'#5b5ce2';const manifest={name:project.site?.title||project.meta.name,short_name:project.meta.name,start_url:map.get(project.pages?.[0]?.id)||'index.html',display:'standalone',background_color:project.theme?.surface||'#fff',theme_color:primary,lang:project.site?.language||'ar',dir:project.site?.direction||'rtl',icons:project.site?.favicon?[{src:project.site.favicon,sizes:'any',type:'image/png'}]:[]};const files={'index.html':null,'styles.css':stylesheet(project.theme,project),'script.js':runtimeJs(project,map),'project.json':JSON.stringify(deepClone(project),null,2),'site.json':JSON.stringify({site:project.site,navigation:project.navigation,release:project.release},null,2),'manifest.webmanifest':JSON.stringify(manifest,null,2),'robots.txt':robotsTxt(project),'sitemap.xml':sitemapXml(project,map),'404.html':null,'README.md':`# ${project.meta.name}\n\nموقع متعدد الصفحات مُنشأ بواسطة بَنّاء Studio V30.\n\nالحزمة تشمل صفحات HTML، Responsive CSS، runtime للتفاعلات، manifest، robots وsitemap.\n`};for(const page of project.pages)files[map.get(page.id)]=null;for(const asset of normalizeAssets(project.assets)){const bytes=assetBytes(asset.data);if(bytes)files[assetMap.get(asset.id)]=bytes}return {map,assetMap,files}}

function robotsTxt(project){const policy=project.site?.indexing?.robots||'index,follow';const disallow=policy.includes('noindex')?'/':'';const lines=['User-agent: *',`Disallow: ${disallow}`];if(project.site?.baseUrl&&project.site?.indexing?.sitemap!==false)lines.push(`Sitemap: ${project.site.baseUrl.replace(/\/$/,'')}/sitemap.xml`);return lines.join('\n')}
function sitemapXml(project,map){const base=String(project.site?.baseUrl||'').replace(/\/$/,'');const urls=(project.pages||[]).filter(p=>!p.settings?.hidden&&!p.seo?.noIndex).map(page=>{const file=map.get(page.id)||'index.html';const loc=base?`${base}/${file}`.replace(/\/index\.html$/,'/'):file;return `<url><loc>${escapeXml(loc)}</loc></url>`}).join('');return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`}
function escapeXml(value){return String(value??'').replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]))}
function buildPageHtml(page,project,map=pageFileMap(project),assetMap=assetFileMap(project)){const body=(page.nodes||[]).map(node=>nodeHtml(node,project.theme,project,'desktop',map,assetMap,page.id)).join('');const menu=project.navigation?.menus?.find(m=>m.id===project.navigation?.headerMenuId);const items=menu?.items?.length?menu.items:(project.pages||[]).filter(p=>p.settings?.showInNav!==false&&!p.settings?.hidden).map(p=>({label:p.name,type:'page',targetId:p.id}));const nav=items.map(item=>{const target=project.pages.find(p=>p.id===item.targetId);const href=item.type==='url'?item.url:(target?map.get(target.id):'#');return `<a href="${escapeHtml(href||'#')}"${item.newTab?' target="_blank" rel="noopener"':''}>${escapeHtml(item.label||target?.name||'رابط')}</a>`}).join('');const site=project.site||{};const noindex=page.seo?.noIndex||site.indexing?.robots?.includes('noindex');const canonical=page.seo?.canonical||((site.baseUrl&&page===project.pages[0])?site.baseUrl:`${String(site.baseUrl||'').replace(/\/$/,'')}/${page.slug||''}`);const favicon=site.favicon?`<link rel="icon" href="${escapeHtml(site.favicon)}">`:'';return `<!doctype html><html lang="${escapeHtml(site.language||'ar')}" dir="${escapeHtml(site.direction||'rtl')}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="${escapeHtml(page.seo?.description||site.description||'')}">${noindex?'<meta name="robots" content="noindex,nofollow">':''}${canonical?`<link rel="canonical" href="${escapeHtml(canonical)}">`:''}<meta property="og:title" content="${escapeHtml(page.seo?.title||page.name)}"><meta property="og:description" content="${escapeHtml(page.seo?.description||site.description||'')}">${favicon}<meta name="generator" content="Bunaa Studio V30"><link rel="manifest" href="manifest.webmanifest"><link rel="stylesheet" href="styles.css"><title>${escapeHtml(page.seo?.title||page.name)}</title></head><body><header class="export-site-nav"><strong>${escapeHtml(site.brand?.name||project.meta.name)}</strong><nav>${nav}</nav></header><main data-page-id="${escapeHtml(page.id)}">${body}</main><script src="script.js">\u003c/script></body></html>`}
function runtimeJs(project,map=pageFileMap(project)){
  const interactions=(project.interactions||[]).filter(i=>i.enabled!==false).map(i=>({
    ...i,steps:Array.isArray(i.steps)&&i.steps.length?i.steps:[{action:i.action||'motion',options:i.options||{},delay:0}]
  }));
  const pages=project.pages.map(p=>({id:p.id,file:map.get(p.id)||''}));
  return `(()=>{'use strict';
const interactions=${JSON.stringify(interactions)};
const assets=${JSON.stringify(normalizeAssets(project.assets).map(a=>({id:a.id,url:assetFileMap(project).get(a.id)||'',filename:a.filename,name:a.name,kind:a.kind}))).replace(/<\/script/gi,'<\\/script')};
const pages=${JSON.stringify(pages)};
const assetById=id=>assets.find(a=>a.id===String(id||''))||null;
const findNode=id=>Array.from(document.querySelectorAll('[data-runtime-id]')).find(n=>n.dataset.runtimeId===String(id||''))||null;
const eventTarget=(source,type)=>['input','change','focus','blur','keydown','submit'].includes(type)?(source.querySelector('input,textarea,select,button,form')||source):(['play','pause','ended'].includes(type)?(source.querySelector('audio,video')||source):source);
const visible=el=>{if(!el)return false;const cs=getComputedStyle(el);return !el.hidden&&cs.display!=='none'&&cs.visibility!=='hidden'};
const motion=(el,name='fade',duration=420)=>{if(!el)return;const names=new Set(['fade','slide','zoom','pulse','glow','lift','shake','bounce','spin']);const safe=names.has(name)?name:'fade';el.classList.remove(...Array.from(el.classList).filter(x=>x.startsWith('motion-')));void el.offsetWidth;el.style.animationDuration=Math.max(0,Math.min(10000,Number(duration)||420))+'ms';el.classList.add('motion-'+safe);el.addEventListener('animationend',()=>{el.classList.remove('motion-'+safe);el.style.animationDuration='';},{once:true})};
const toast=(message,duration=2200)=>{document.querySelector('[data-bunaa-toast]')?.remove();const el=document.createElement('div');el.dataset.bunaaToast='1';el.textContent=String(message||'تم التنفيذ');el.style.cssText='position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2147483000;padding:11px 16px;border-radius:12px;background:#171b2a;color:#fff;font:700 13px system-ui;box-shadow:0 16px 40px rgba(0,0,0,.2)';document.body.appendChild(el);setTimeout(()=>el.remove(),Math.max(400,Number(duration)||2200))};
const valueOf=(target,event)=>{const f=event?.target?.matches?.('input,textarea,select')?event.target:target?.querySelector?.('input,textarea,select');if(f){if(f.type==='checkbox'||f.type==='radio')return f.checked?'true':'false';return String(f.value??'')}return String(target?.textContent||'').trim()};
const condition=(i,event,source)=>{const c=i.condition||{type:'always'};if(c.type==='always')return true;const actual=valueOf(source,event);if(c.type==='not-empty')return actual.trim()!=='';if(c.type==='visible')return visible(source);if(c.type==='value'){const v=String(c.value??'');if(c.operator==='equals')return actual===v;if(c.operator==='not-equals')return actual!==v;if(c.operator==='starts')return actual.startsWith(v);if(c.operator==='ends')return actual.endsWith(v);return actual.includes(v)}if(c.type==='key')return String(event?.key||'')===String(c.value||'');return true};
const run=async(item,event,source)=>{if(!condition(item,event,source))return;for(const step of item.steps||[]){const o=step.options||{};if(step.delay)await new Promise(r=>setTimeout(r,Math.min(10000,Number(step.delay)||0)));const target=findNode(o.targetId)||source;switch(step.action){case'motion':motion(target,o.motion,o.duration);break;case'show':target.hidden=false;break;case'hide':target.hidden=true;break;case'toggle':target.hidden=!target.hidden;break;case'scroll':target.scrollIntoView?.({behavior:'smooth',block:'center'});break;case'page':{const p=pages.find(x=>x.id===o.pageId);if(p)location.href=p.file;break}case'url':{const u=String(o.url||'');if(/^(https?:|mailto:|tel:)/i.test(u)){if(o.newTab)window.open(u,'_blank','noopener');else location.href=u}break}case'addClass':if(o.className)target.classList.add(o.className);break;case'removeClass':if(o.className)target.classList.remove(o.className);break;case'toggleClass':if(o.className)target.classList.toggle(o.className);break;case'style':if(o.property&&/^[a-zA-Z-]+$/.test(o.property))target.style.setProperty(o.property,String(o.value??''));break;case'setText':target.textContent=String(o.text??'');break;case'setAttribute':if(o.attribute)target.setAttribute(String(o.attribute),String(o.attributeValue??''));break;case'removeAttribute':if(o.attribute)target.removeAttribute(String(o.attribute));break;case'toggleAttribute':if(o.attribute)target.toggleAttribute(String(o.attribute));break;case'focus':target.focus?.();break;case'blur':target.blur?.();break;case'submit':{const form=target.tagName==='FORM'?target:(target.closest?.('form')||target.querySelector?.('form'));if(form?.requestSubmit)form.requestSubmit();else form?.submit?.();break}case'toast':toast(o.message,o.toastDuration);break;case'copy':{try{await navigator.clipboard.writeText(String(o.text||valueOf(target,event)));toast('تم النسخ')}catch{}}break;case'mediaPlay':{const m=target.querySelector?.('audio,video')||target;m.play?.().catch?.(()=>{});break}case'mediaPause':{const m=target.querySelector?.('audio,video')||target;m.pause?.();break}case'openAsset':{const a=assetById(o.assetId);if(a?.url)window.open(a.url,'_blank','noopener');break}case'downloadAsset':{const a=assetById(o.assetId);if(a?.url){const link=document.createElement('a');link.href=a.url;link.download=a.filename||a.name||'download';document.body.appendChild(link);link.click();link.remove()}break}case'setMedia':{const a=assetById(o.assetId);if(!a?.url)break;target.querySelector?.('img')?.setAttribute('src',a.url);target.querySelector?.('video')?.setAttribute('src',a.url);target.querySelector?.('audio')?.setAttribute('src',a.url);break}}}};
const fired=new WeakMap();const now=()=>Date.now();
const fire=(item,event,source)=>{const prev=fired.get(source)||{};const t=now();if(item.once&&prev[item.id]?.fired)return;if(item.cooldown&&prev[item.id]&&t-prev[item.id].last<item.cooldown)return;fired.set(source,{...prev,[item.id]:{last:t,fired:true}});if(item.preventDefault)event?.preventDefault?.();if(item.stopPropagation)event?.stopPropagation?.();run(item,event,source).catch(()=>{})};
interactions.forEach(item=>{const source=findNode(item.sourceId);if(!source)return;const target=eventTarget(source,item.trigger);if(item.trigger==='load'){setTimeout(()=>fire(item,{currentTarget:source},source),60);return}if(item.trigger==='enterViewport'&&'IntersectionObserver'in globalThis){new IntersectionObserver(es=>{if(es.some(e=>e.isIntersecting))fire(item,{currentTarget:source},source)},{threshold:.15}).observe(source);return}if(item.trigger==='scroll'){window.addEventListener('scroll',()=>{if(visible(source))fire(item,{currentTarget:source},source)},{passive:true});return}target.addEventListener(item.trigger==='hover'?'pointerenter':item.trigger==='hoverleave'?'pointerleave':item.trigger,e=>{const takesNavigation=(item.steps||[]).some(step=>['page','url'].includes(step.action));if(['click','dblclick','contextmenu'].includes(item.trigger)&&((target.tagName==='A'&&item.trigger==='click')||takesNavigation))e.preventDefault();fire(item,e,source)});});
})();`;}
function stylesheet(theme={},project={}){const primary=theme.primary||'#5b5ce2',text=theme.text||'#171b2a';return `*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;font-family:${theme.font||'system-ui'},-apple-system,"Segoe UI",Tahoma,Arial,sans-serif;color:${text};line-height:1.6;background:${theme.surface||'#fff'};${themeCss(theme)}}main{width:100%;margin:0 auto}.export-site-nav{position:sticky;top:0;z-index:20;width:100%;display:flex;gap:20px;align-items:center;justify-content:space-between;padding:14px 22px;border-bottom:1px solid var(--b-line);background:color-mix(in srgb,var(--b-surface,#fff) 92%,transparent);backdrop-filter:blur(12px)}.export-site-nav nav{display:flex;gap:14px;flex-wrap:wrap}.export-site-nav a{color:var(--b-primary,${primary});text-decoration:none}.node-wrap{display:block;width:100%}.built-button{display:inline-flex;padding:11px 20px;background:var(--b-primary,${primary});color:#fff;border-radius:11px;text-decoration:none;font-weight:800}.built-card,.built-product,.built-testimonial{padding:18px;border:1px solid var(--b-line,#e7e9ef);border-radius:14px;background:var(--b-surface,#fff);box-shadow:var(--b-shadowSoft,none)}.built-nav{display:flex;justify-content:space-between;align-items:center;gap:16px}.nav-links,.built-social{display:flex;gap:16px;flex-wrap:wrap}.built-nav a,.built-social a{color:var(--b-primary,${primary});text-decoration:none}.built-gallery{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.built-gallery img{width:100%;height:220px;object-fit:cover;border-radius:12px}.built-stats,.built-pricing,.built-timeline{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.built-stats>div,.built-pricing>div,.built-timeline>div{padding:16px;border:1px solid var(--b-line,#e7e9ef);border-radius:12px;background:var(--b-surface,#fff)}.built-progress{height:32px;background:#eef0f5;border-radius:10px;overflow:hidden;position:relative}.built-progress>div{height:100%;background:var(--b-primary,${primary})}.built-media-grid,.built-video-gallery{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.built-audio-playlist{display:grid;gap:12px}.built-media-tile{min-width:0;padding:10px;border:1px solid var(--b-line,#e4e7ef);border-radius:12px;background:var(--b-surface,#fff)}.built-media-tile img,.built-media-tile video{display:block;width:100%;max-height:420px;object-fit:contain;border-radius:8px}.built-media-tile audio{display:block;width:100%}.built-media-caption{display:block;margin-top:7px;overflow-wrap:anywhere;color:var(--b-muted,#71798b)}.built-file-card,.built-document-viewer{min-width:0;overflow:hidden;padding:16px;border:1px solid var(--b-line,#e4e7ef);border-radius:14px;background:var(--b-surface,#fff)}.built-file-link{display:inline-flex;gap:8px;align-items:center;padding:8px 12px;border-radius:9px;background:var(--b-soft,#f3f4fb);color:var(--b-primary,${primary});text-decoration:none;overflow-wrap:anywhere}.built-page-embed{width:100%;min-width:0;overflow:hidden}.built-html-snippet img{max-width:100%;height:auto}.built-html-snippet table{border-collapse:collapse;max-width:100%}.built-html-snippet td,.built-html-snippet th{border:1px solid var(--b-line,#e4e7ef);padding:7px}.motion-fade{animation:fade .7s ease}.motion-slide{animation:slide .7s ease}.motion-zoom{animation:zoom .7s ease}.motion-pulse{animation:pulse 1.1s ease}.motion-glow{animation:glow .9s ease}.motion-lift{animation:lift .28s ease}.motion-shake{animation:shake .45s ease}.motion-bounce{animation:bounce .6s ease}.motion-spin{animation:spin .65s ease}@keyframes fade{from{opacity:.2}to{opacity:1}}@keyframes slide{from{transform:translateY(14px);opacity:.2}to{transform:translateY(0);opacity:1}}@keyframes zoom{from{transform:scale(.96);opacity:.2}to{transform:scale(1);opacity:1}}@keyframes pulse{50%{transform:scale(1.03)}}@keyframes glow{50%{box-shadow:0 0 0 6px rgba(91,92,226,.13)}}@keyframes lift{from{transform:translateY(0)}50%{transform:translateY(-6px)}to{transform:translateY(0)}}@keyframes shake{20%{transform:translateX(-4px)}40%{transform:translateX(4px)}60%{transform:translateX(-3px)}80%{transform:translateX(3px)}}@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}@keyframes spin{to{transform:rotate(360deg)}}${responsiveCss(project)}@media(max-width:760px){.built-gallery,.built-media-grid,.built-video-gallery,.built-stats,.built-pricing,.built-timeline{grid-template-columns:1fr}.built-nav,.export-site-nav{align-items:flex-start;flex-direction:column}}`}
function exportZip(project){const {map,assetMap,files}=buildExportFiles(project);for(const page of project.pages)files[map.get(page.id)]=buildPageHtml(page,project,map,assetMap);files['404.html']=build404Html(project,map);downloadBlob(zipBlob(files),`${safeName(project.meta.name)}.zip`);return Object.keys(files)}
const exportCurrentHtml=project=>{const map=pageFileMap(project),assetMap=assetFileMap(project),page=project.pages.find(p=>p.id===project.activePageId)||project.pages[0];downloadText(buildPageHtml(page,project,map,assetMap),'page.html','text/html;charset=utf-8')};
const exportProjectJson=project=>downloadText(JSON.stringify(project,null,2),'bunaa-project.json','application/json;charset=utf-8');
function build404Html(project,map){return `<!doctype html><html lang="${escapeHtml(project.site?.language||'ar')}" dir="${escapeHtml(project.site?.direction||'rtl')}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><link rel="stylesheet" href="styles.css"><title>الصفحة غير موجودة</title></head><body style="min-height:100vh;display:grid;place-items:center;padding:40px"><main style="text-align:center"><h1>404</h1><p>الصفحة التي تبحث عنها غير موجودة.</p><a class="built-button" href="${escapeHtml(map.get(project.pages[0]?.id)||'index.html')}">العودة للرئيسية</a></main></body></html>`}
const te=new TextEncoder(),toBytes=value=>value instanceof Uint8Array?value:te.encode(String(value??'')),u16=n=>new Uint8Array([n&255,(n>>>8)&255]),u32=n=>new Uint8Array([n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255]),cat=xs=>{let size=0;for(const x of xs)size+=x.length;const out=new Uint8Array(size);let i=0;for(const x of xs){out.set(x,i);i+=x.length}return out};const crcTable=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;t[n]=c}return t})();const crc32=b=>{let c=0xffffffff;for(const x of b)c=crcTable[(c^x)&255]^(c>>>8);return(c^0xffffffff)>>>0};function zipBlob(files){const locals=[],centrals=[];let offset=0;for(const [name,data] of Object.entries(files)){const nb=te.encode(name),db=toBytes(data),crc=crc32(db),local=cat([u32(0x04034b50),u16(20),u16(0),u16(0),u16(0),u16(0),u32(crc),u32(db.length),u32(db.length),u16(nb.length),u16(0),nb,db]);locals.push(local);centrals.push(cat([u32(0x02014b50),u16(20),u16(20),u16(0),u16(0),u16(0),u16(0),u32(crc),u32(db.length),u32(db.length),u16(nb.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(offset),nb]));offset+=local.length}const body=cat(locals),central=cat(centrals),end=cat([u32(0x06054b50),u16(0),u16(0),u16(Object.keys(files).length),u16(Object.keys(files).length),u32(central.length),u32(body.length),u16(0)]);return new Blob([body,central,end],{type:'application/zip'})}
exports.assetFileMap = assetFileMap;
exports.pageFileMap = pageFileMap;
exports.buildExportFiles = buildExportFiles;
exports.buildPageHtml = buildPageHtml;
exports.runtimeJs = runtimeJs;
exports.stylesheet = stylesheet;
exports.exportZip = exportZip;
exports.exportCurrentHtml = exportCurrentHtml;
exports.exportProjectJson = exportProjectJson;
});
__modules.set("src/engine/interaction.js",(exports,__require)=>{
const {uid,deepClone,safeUrl} = __require("src/core/utils.js");
const triggers=[
 ['click','عند الضغط'],['dblclick','نقرتان'],['hover','عند المرور'],['hoverleave','عند مغادرة العنصر'],
 ['focus','عند التركيز'],['blur','عند فقدان التركيز'],['input','أثناء الكتابة'],['change','عند التغيير'],
 ['submit','عند إرسال النموذج'],['keydown','عند ضغط مفتاح'],['contextmenu','عند زر الفأرة الأيمن'],
 ['mousedown','عند الضغط بالماوس'],['mouseup','عند رفع الماوس'],['load','عند الظهور'],['enterViewport','عند دخول الشاشة'],
 ['scroll','أثناء التمرير'],['play','عند تشغيل الوسائط'],['pause','عند إيقاف الوسائط'],['ended','عند انتهاء الوسائط']
];
const actions=[
 ['motion','حركة'],['show','إظهار'],['hide','إخفاء'],['toggle','تبديل الظهور'],['scroll','تمرير'],
 ['page','انتقال لصفحة'],['url','فتح رابط'],['addClass','إضافة Class'],['removeClass','حذف Class'],['toggleClass','تبديل Class'],
 ['style','تغيير مظهر'],['setText','تغيير النص'],['setAttribute','تغيير خاصية'],['removeAttribute','حذف خاصية'],
 ['focus','تركيز عنصر'],['blur','إلغاء التركيز'],['submit','إرسال نموذج'],['toast','رسالة صغيرة'],['copy','نسخ للنظام'],
 ['mediaPlay','تشغيل صوت'],['mediaPause','إيقاف صوت'],['toggleAttribute','تبديل خاصية'],['openAsset','فتح وسيط محمّل'],['downloadAsset','تحميل وسيط'],['setMedia','تبديل وسيط العنصر']
];
const motions=[
 ['fade','ظهور'],['slide','انزلاق'],['zoom','تكبير'],['pulse','نبض'],['glow','وهج'],['lift','ارتفاع'],['shake','اهتزاز'],['bounce','ارتداد'],['spin','دوران']
];

const capabilityMap={
 button:{triggers:['click','dblclick','hover','hoverleave','focus'],actions:['motion','page','url','scroll','toast','copy','toggle','addClass','toggleClass','openAsset','downloadAsset','setMedia']},
 link:{triggers:['click','dblclick','hover','hoverleave'],actions:['page','url','motion','scroll','toast']},
 card:{triggers:['click','hover','hoverleave'],actions:['page','url','motion','toggle','show','hide','toast']},
 product:{triggers:['click','hover','hoverleave'],actions:['url','page','motion','toast','toggle']},
 image:{triggers:['click','dblclick','hover','hoverleave','load'],actions:['motion','url','show','hide','toggle','toast','openAsset','downloadAsset','setMedia']},
 gallery:{triggers:['click','hover','load'],actions:['motion','toggle','show','hide']},
 video:{triggers:['click','dblclick','hover','hoverleave','play','pause','ended'],actions:['motion','url','page','scroll','show','hide','toast','openAsset','downloadAsset','setMedia','mediaPlay','mediaPause']},
 audio:{triggers:['click','play','pause','ended'],actions:['mediaPlay','mediaPause','motion','show','hide','toast','openAsset','downloadAsset','setMedia']},
 input:{triggers:['focus','blur','input','change','keydown'],actions:['motion','show','hide','toggle','setText','setAttribute','focus','copy','toast']},
 search:{triggers:['focus','input','keydown','change'],actions:['motion','show','hide','toggle','setText','focus','copy','toast']},
 textarea:{triggers:['focus','blur','input','change','keydown'],actions:['motion','show','hide','toggle','setText','copy','toast']},
 select:{triggers:['focus','change'],actions:['motion','show','hide','toggle','setText','toast']},
 checkbox:{triggers:['change','click','focus'],actions:['toggle','show','hide','motion','setText','toast']},
 radio:{triggers:['change','click','focus'],actions:['toggle','show','hide','motion','setText','toast']},
 form:{triggers:['submit','focus','input','change'],actions:['show','hide','toggle','motion','setText','toast']},
 faq:{triggers:['click','hover'],actions:['motion','toggle','show','hide','scroll']},
 tabs:{triggers:['click','hover'],actions:['motion','show','hide','toggle']},
 accordion:{triggers:['click','hover'],actions:['motion','show','hide','toggle']},
 dropdown:{triggers:['change','focus'],actions:['motion','show','hide','toggle','setText']},
 navbar:{triggers:['click','hover'],actions:['page','url','motion','scroll']},
 social:{triggers:['click','hover'],actions:['url','motion','toast']},
 socialLinks:{triggers:['click','hover'],actions:['url','motion','toast']},
 default:{triggers:['click','dblclick','hover','hoverleave','focus','blur','load','enterViewport','scroll'],actions:['motion','show','hide','toggle','scroll','page','url','addClass','removeClass','toggleClass','style','toast','openAsset','downloadAsset','setMedia']}
};
const interactionCapabilities=type=>capabilityMap[type]||capabilityMap.default;
function makeStep(action='motion',options={}){
  return {id:uid('step'),action,delay:0,options:{targetId:null,motion:'fade',duration:420,pageId:null,anchor:'',url:'#',newTab:false,className:'',property:'color',value:'',text:'',attribute:'',attributeValue:'',message:'تم تنفيذ التفاعل',toastDuration:2200,key:'',...options}};
}
function makeInteraction(sourceId,trigger='click',action='motion',options={}){
  const first=makeStep(action,{targetId:sourceId,...options});
  return {id:uid('int'),sourceId,trigger,enabled:true,once:false,preventDefault:false,stopPropagation:false,cooldown:0,condition:{type:'always',value:'',operator:'contains'},steps:[first],action,options:first.options};
}

function normalizeStep(step,sourceId){
  const s=makeStep(step?.action||'motion',{targetId:sourceId,...(step?.options||{})});
  return {...s,id:typeof step?.id==='string'&&step.id?step.id:s.id,delay:Math.max(0,Number(step?.delay)||0)};
}
function normalizeInteraction(item){
  if(!item||typeof item!=='object'||typeof item.sourceId!=='string')return null;
  const legacyOptions=item.options||{};
  const rawSteps=Array.isArray(item.steps)&&item.steps.length?item.steps:[{action:item.action||'motion',options:legacyOptions}];
  const steps=rawSteps.map(step=>normalizeStep(step,item.sourceId));
  return {
    id:typeof item.id==='string'&&item.id?item.id:uid('int'),
    sourceId:item.sourceId,
    trigger:item.trigger||'click',enabled:item.enabled!==false,
    once:Boolean(item.once),preventDefault:Boolean(item.preventDefault),stopPropagation:Boolean(item.stopPropagation),
    cooldown:Math.max(0,Number(item.cooldown)||0),
    condition:{type:item.condition?.type||'always',value:String(item.condition?.value??''),operator:item.condition?.operator||'contains'},
    steps,action:steps[0]?.action||item.action||'motion',options:deepClone(steps[0]?.options||legacyOptions)
  };
}
function upsertInteraction(project,item){const x=normalizeInteraction(item);if(!x)return null;project.interactions=Array.isArray(project.interactions)?project.interactions:[];const i=project.interactions.findIndex(v=>v.id===x.id);if(i<0)project.interactions.push(deepClone(x));else project.interactions[i]=deepClone(x);return x}
const removeInteraction=(project,id)=>{project.interactions=(project.interactions||[]).filter(x=>x.id!==id)};
const interactionsFor=(project,id)=>(project.interactions||[]).filter(x=>x.sourceId===id&&x.enabled!==false).map(normalizeInteraction).filter(Boolean);
const labels=a=>Object.fromEntries(a);
const triggerLabel=x=>labels(triggers)[x]||x;
const actionLabel=x=>labels(actions)[x]||x;

function assetById(project,id){return (project?.assets||[]).find(asset=>asset.id===id)||null}
function select(doc,id){if(!id)return null;const nodes=doc.querySelectorAll('[data-node-id],[data-runtime-id]');for(const node of nodes)if(node.dataset.nodeId===id||node.dataset.runtimeId===id)return node;return null}
function mediaTarget(source){return source?.matches?.('audio,video')?source:(source?.querySelector?.('audio,video')||source)}
function eventTargetFor(source,type){if(['play','pause','ended'].includes(type))return mediaTarget(source);if(['input','change','focus','blur','keydown','submit'].includes(type))return source?.querySelector?.('input,textarea,select,button,form')||source;return source}

function animate(element,name='fade',duration=420){
  if(!element)return;
  const map={fade:'fade',slide:'slide',zoom:'zoom',pulse:'pulse',glow:'glow',lift:'lift',shake:'shake',bounce:'bounce',spin:'spin'};
  const safe=map[name]||'fade';
  element.classList.remove(...[...element.classList].filter(x=>x.startsWith('motion-')));
  void element.offsetWidth;
  element.style.animationDuration=`${Math.max(0,Math.min(10000,Number(duration)||420))}ms`;
  element.classList.add(`motion-${safe}`);
  element.addEventListener('animationend',()=>{element.classList.remove(`motion-${safe}`);element.style.animationDuration=''}, {once:true});
}

function valueOf(target,event){
  const field=event?.target?.matches?.('input,textarea,select')?event.target:target?.querySelector?.('input,textarea,select');
  if(field){if(field.type==='checkbox'||field.type==='radio')return field.checked?'true':'false';return String(field.value??'')}
  return String(target?.textContent||'').trim();
}
function visible(target){if(!target)return false;const r=target.getBoundingClientRect?.();const cs=globalThis.getComputedStyle?.(target);return target.hidden!==true&&cs?.display!=='none'&&cs?.visibility!=='hidden'&&(!r||r.width>0||r.height>0)}
function conditionPasses(i,event,source,device){
  const c=i.condition||{type:'always'};if(c.type==='always')return true;
  if(c.type==='device')return String(device||'desktop')===String(c.value||'desktop');
  const actual=valueOf(event?.currentTarget||source,event);
  if(c.type==='not-empty')return actual.trim()!=='';
  if(c.type==='visible')return visible(select(source?.ownerDocument,i.steps?.[0]?.options?.targetId)||source);
  if(c.type==='value'){const wanted=String(c.value??'');if(c.operator==='equals')return actual===wanted;if(c.operator==='not-equals')return actual!==wanted;if(c.operator==='starts')return actual.startsWith(wanted);if(c.operator==='ends')return actual.endsWith(wanted);return actual.includes(wanted)}
  if(c.type==='key')return String(event?.key||'')===String(c.value||'');
  return true;
}

function toast(document,message,duration=2200){
  const old=document.querySelector('[data-bunaa-toast]');old?.remove();
  const el=document.createElement('div');el.dataset.bunaaToast='1';el.textContent=String(message||'تم التنفيذ');el.style.cssText='position:fixed;inset-inline-start:50%;bottom:24px;transform:translateX(-50%);z-index:2147483000;padding:11px 16px;border-radius:12px;background:#171b2a;color:#fff;font:700 13px system-ui;box-shadow:0 16px 40px rgba(0,0,0,.2);pointer-events:none;max-width:min(90vw,520px);text-align:center';document.body.appendChild(el);setTimeout(()=>el.remove(),Math.max(400,Number(duration)||2200))
}
async function copyText(text,document){try{if(globalThis.navigator?.clipboard?.writeText){await globalThis.navigator.clipboard.writeText(String(text));toast(document,'تم النسخ');return true}}catch{}const area=document.createElement('textarea');area.value=String(text);area.style.position='fixed';area.style.opacity='0';document.body.appendChild(area);area.select();try{document.execCommand('copy');toast(document,'تم النسخ');return true}finally{area.remove()}}
function targetForStep(document,step,source){return select(document,step.options?.targetId)||source}

function assetUrl(asset){return asset?.data||asset?.url||''}
function triggerAssetDownload(url,filename){if(!url)return false;const link=document.createElement('a');link.href=url;link.download=filename||'download';link.target='_blank';link.rel='noopener';document.body.appendChild(link);link.click();link.remove();return true}
async function runInteraction(interaction,event,{document,source,navigate,device='desktop',project}={}){
  const i=normalizeInteraction(interaction);if(!i||!source||!conditionPasses(i,event,source,device))return false;
  const state=runInteraction._state||(runInteraction._state=new WeakMap());
  let bucket=state.get(source);if(!bucket){bucket=new Map();state.set(source,bucket)}
  const runtimeKey=i.id;const now=Date.now();const previous=bucket.get(runtimeKey)||{last:0,fired:false};
  if(i.once&&previous.fired)return false;if(i.cooldown&&now-previous.last<i.cooldown)return false;
  bucket.set(runtimeKey,{last:now,fired:true});
  if(i.preventDefault)event?.preventDefault?.();if(i.stopPropagation)event?.stopPropagation?.();
  for(const step of i.steps){if(step.delay)await new Promise(resolve=>setTimeout(resolve,Math.min(10000,Number(step.delay)||0)));const o=step.options||{},target=targetForStep(document,step,source);switch(step.action){
    case'motion':animate(target,o.motion,o.duration);break;
    case'show':if(target)target.hidden=false;break;
    case'hide':if(target)target.hidden=true;break;
    case'toggle':if(target)target.hidden=!target.hidden;break;
    case'scroll':target?.scrollIntoView?.({behavior:'smooth',block:o.anchor==='start'?'start':o.anchor==='end'?'end':'center'});break;
    case'page':if(o.pageId)navigate?.(o.pageId);break;
    case'url':{const u=safeUrl(o.url||'#');if(u!=='#'){if(o.newTab)window.open(u,'_blank','noopener');else location.href=u}break}
    case'addClass':if(target&&o.className)target.classList.add(o.className);break;
    case'removeClass':if(target&&o.className)target.classList.remove(o.className);break;
    case'toggleClass':if(target&&o.className)target.classList.toggle(o.className);break;
    case'style':if(target&&o.property&&/^[a-zA-Z-]+$/.test(o.property))target.style.setProperty(o.property,String(o.value??''));break;
    case'setText':if(target)target.textContent=String(o.text??'');break;
    case'setAttribute':if(target&&o.attribute)target.setAttribute(String(o.attribute),String(o.attributeValue??''));break;
    case'removeAttribute':if(target&&o.attribute)target.removeAttribute(String(o.attribute));break;
    case'toggleAttribute':if(target&&o.attribute){target.toggleAttribute(String(o.attribute))}break;
    case'focus':target?.focus?.();break;
    case'blur':target?.blur?.();break;
    case'submit':{const form=target?.tagName==='FORM'?target:target?.closest?.('form')||target?.querySelector?.('form');if(form?.requestSubmit)form.requestSubmit();else form?.submit?.();break}
    case'toast':toast(document,o.message,o.toastDuration);break;
    case'copy':await copyText(o.text||valueOf(target,event),document);break;
    case'mediaPlay':{const m=mediaTarget(target);m?.play?.().catch?.(()=>{});break}
    case'mediaPause':{const m=mediaTarget(target);m?.pause?.();break}
    case'openAsset':{const asset=assetById(project,o.assetId),url=assetUrl(asset);if(url){if(o.newTab!==false)globalThis.open?.(url,'_blank','noopener');else globalThis.location&&(globalThis.location.href=url)}break}
    case'downloadAsset':{const asset=assetById(project,o.assetId);triggerAssetDownload(assetUrl(asset),asset?.filename||asset?.name||'download');break}
    case'setMedia':{const asset=assetById(project,o.assetId),url=assetUrl(asset);if(!url||!target)break;const media=mediaTarget(target);if(media?.setAttribute)media.setAttribute('src',url);if(media?.load)media.load();if(asset?.alt&&media?.tagName==='IMG')media.setAttribute('alt',asset.alt);break}
  }}
  return true;
}
function createRuntime({document,project,navigate,device='desktop'}){
  const clean=[];const on=(target,type,fn,opts)=>{target.addEventListener(type,fn,opts);clean.push(()=>target.removeEventListener(type,fn,opts))};
  const nodeMap=new Map((project.pages||[]).flatMap(page=>{const out=[];const walk=(nodes)=>{for(const node of nodes||[]){out.push(node);walk(node.children)}};walk(page.nodes);return out}).map(node=>[node.id,node]));
  for(const raw of project.interactions||[]){const i=normalizeInteraction(raw);if(!i?.enabled||!nodeMap.has(i.sourceId))continue;const source=select(document,i.sourceId);if(!source)continue;
    const target=eventTargetFor(source,i.trigger);const fire=event=>{const current=event?.currentTarget||source;const isAnchor=current?.tagName==='A'||current?.closest?.('a');const takesNavigation=i.steps?.some(step=>['page','url'].includes(step.action));if(['click','dblclick','contextmenu'].includes(i.trigger)&&isAnchor&&(takesNavigation||i.trigger==='click'))event?.preventDefault?.();const p=runInteraction(i,event,{document,source,navigate,device,project});if(p?.catch)p.catch(error=>console.warn('Bunaa interaction failed',error))};
    if(i.trigger==='load'){const t=setTimeout(()=>fire({currentTarget:source,preventDefault(){},stopPropagation(){}}),60);clean.push(()=>clearTimeout(t));continue}
    if(i.trigger==='enterViewport'&&'IntersectionObserver' in globalThis){const ob=new IntersectionObserver(es=>{if(es.some(e=>e.isIntersecting))fire({currentTarget:source})},{threshold:.15});ob.observe(source);clean.push(()=>ob.disconnect());continue}
    if(i.trigger==='scroll'){const handler=()=>{if(visible(source))fire({currentTarget:source})};on(window,'scroll',handler,{passive:true});continue}
    if(i.trigger==='hover')on(target,'pointerenter',fire);else if(i.trigger==='hoverleave')on(target,'pointerleave',fire);else on(target,i.trigger,fire);
  }
  return()=>clean.splice(0).forEach(fn=>fn());
}
exports.triggers = triggers;
exports.actions = actions;
exports.motions = motions;
exports.interactionCapabilities = interactionCapabilities;
exports.makeStep = makeStep;
exports.makeInteraction = makeInteraction;
exports.normalizeInteraction = normalizeInteraction;
exports.upsertInteraction = upsertInteraction;
exports.removeInteraction = removeInteraction;
exports.interactionsFor = interactionsFor;
exports.triggerLabel = triggerLabel;
exports.actionLabel = actionLabel;
exports.runInteraction = runInteraction;
exports.createRuntime = createRuntime;
});
__modules.set("src/engine/layout.js",(exports,__require)=>{
const {clamp} = __require("src/core/utils.js");
const {getToken} = __require("src/core/design-system.js");
const {resolveVariableValue} = __require("src/core/variables.js");
const DEVICES=['desktop','tablet','mobile'];
const px=v=>typeof v==='number'?`${v}px`:v;
const resolveToken=(value,theme,project)=>{if(typeof value!=='string')return value;const m=value.match(/^token:(.+)$/);if(m)return getToken(theme,m[1],value);return resolveVariableValue(value,project)};
const numericPx=v=>{if(typeof v==='number'&&Number.isFinite(v))return v;const m=String(v??'').trim().match(/^(-?\d+(?:\.\d+)?)px$/i);return m?Number(m[1]):null};
const deviceWidth=(project,device)=>Number(project?.devices?.[device]?.width)||({desktop:1180,tablet:768,mobile:390}[device]||1180);
function keepInsideDevice(s,project,device){
  const width=deviceWidth(project,device);
  const w=numericPx(s.width),mw=numericPx(s.maxWidth),min=numericPx(s.minWidth);
  if(w!=null&&w>width)s.width='100%';
  if(mw!=null&&mw>width)s.maxWidth='100%';
  if(min!=null&&min>width)s.minWidth=0;
  s.maxWidth=s.maxWidth||'100%';
  s.minWidth=0;
  s.boxSizing='border-box';
  return s;
}
function resolveStyle(node,device='desktop',theme={},styleLibrary={},project=null){
  const responsive=node.responsive?.[device]||{};const classStyles=(node.classes||[]).reduce((acc,name)=>({...acc,...(styleLibrary?.classes?.[name]||{})}),{});const textStyle=styleLibrary?.textStyles?.[node.props?.textStyle]||{};const s={...classStyles,...textStyle,...(node.style||{}),...responsive};
  Object.entries(s).forEach(([key,value])=>{s[key]=resolveToken(value,theme,project)});
  keepInsideDevice(s,project,device);
  if(node.type==='section'){s.width=s.width||'100%';s.maxWidth='100%';s.boxSizing='border-box';s.paddingBlock=s.paddingBlock||px(getToken(theme,'space6',44));}
  if(node.type==='container'){s.width=s.width||'100%';s.maxWidth=Math.min(numericPx(s.maxWidth)??getToken(theme,'container',1180),deviceWidth(project,device));s.marginInline=s.marginInline||'auto';s.boxSizing='border-box';s.paddingInline=s.paddingInline||px(getToken(theme,'space4',18));}
  if(['grid','columns'].includes(node.type)){s.display=s.display||'grid';const count=clamp(Number(node.props?.count)||3,1,6);const fallback= device==='mobile'?'1fr':device==='tablet'?`repeat(${Math.min(count,2)},minmax(0,1fr))`:`repeat(${count},minmax(0,1fr))`;s.gridTemplateColumns=s.gridTemplateColumns||fallback;s.gap=s.gap??node.props?.gap??getToken(theme,'space3',12);}
  if(node.type==='stack'||node.type==='spaced'){s.display=s.display||'flex';s.flexDirection=s.flexDirection||'column';s.gap=s.gap??node.props?.gap??getToken(theme,'space3',12);}
  if(node.type==='spaced'){s.flexDirection=device==='mobile'?'column':'row';s.justifyContent=s.justifyContent||'space-between';s.alignItems=s.alignItems||'center';}
  if(node.layout){if(node.layout.display&&node.layout.display!=='block')s.display=s.display||node.layout.display;if(node.layout.gap)s.gap=s.gap??node.layout.gap;if(node.layout.direction)s.flexDirection=s.flexDirection||node.layout.direction;if(node.layout.align==='center')s.alignItems=s.alignItems||'center';if(node.layout.justify==='center')s.justifyContent=s.justifyContent||'center';if(node.layout.wrap)s.flexWrap='wrap';}
  if(s.radius!=null)s.borderRadius=s.radius===getToken(theme,'radiusPill',999)?'999px':px(s.radius);if(s.paddingY!=null)s.paddingBlock=px(s.paddingY);if(s.paddingX!=null)s.paddingInline=px(s.paddingX);if(s.shadow){const shadow=s.shadow==='medium'?getToken(theme,'shadowMedium','0 20px 50px rgba(25,30,55,.12)'):getToken(theme,'shadowSoft','0 12px 30px rgba(25,30,55,.08)');s.boxShadow=shadow}
  if(s.width!=null)s.width=px(s.width);if(s.height!=null)s.height=px(s.height);if(s.maxWidth!=null)s.maxWidth=px(s.maxWidth);if(s.minHeight!=null)s.minHeight=px(s.minHeight);if(!s.color)s.color=getToken(theme,'text',theme.text);
  return s;
}
const numericUnitless=new Set(['opacity','zIndex','fontWeight','lineHeight','flexGrow','flexShrink','order']);
const kebab=s=>s.replace(/[A-Z]/g,m=>`-${m.toLowerCase()}`);
const styleObjectToCss=s=>Object.entries(s).filter(([k,v])=>v!==undefined&&v!==null&&v!==''&&!['radius','paddingY','paddingX','shadow'].includes(k)).map(([k,v])=>`${kebab(k)}:${typeof v==='number'&&!numericUnitless.has(k)?`${v}px`:v};`).join('');
function propagateStyle(node,device,patch){if(!node)return;node.responsive=node.responsive||{};const ratios={desktop:1,tablet:.78,mobile:.5};for(const d of DEVICES){if(d===device)continue;node.responsive[d]={...(node.responsive[d]||{})};for(const [k,v] of Object.entries(patch)){if(typeof v==='number'&&['fontSize','gap','height','marginTop','marginBottom','paddingY','paddingX'].includes(k))node.responsive[d][k]=Math.round(v*(ratios[d]/ratios[device]));else node.responsive[d][k]=v}}}
exports.DEVICES = DEVICES;
exports.resolveStyle = resolveStyle;
exports.styleObjectToCss = styleObjectToCss;
exports.propagateStyle = propagateStyle;
});
__modules.set("src/engine/preview-router.js",(exports,__require)=>{
function buildPreviewRuntimeScript(pageIds,interactions){
  const pagesJson=JSON.stringify(Array.isArray(pageIds)?pageIds:[]);
  const interactionsJson=JSON.stringify(Array.isArray(interactions)?interactions:[]);
  const script=`
(function(){
'use strict';
var PAGE_IDS=${pagesJson};
var INTERACTIONS=${interactionsJson};
var sections=Array.prototype.slice.call(document.querySelectorAll('[data-preview-section]'));
function findSection(id){return sections.find(function(section){return section.dataset.previewSection===String(id);});}
function getHashId(){var hash=location.hash||'';return hash.indexOf('#page-')===0?decodeURIComponent(hash.slice(6)):null;}
function getCurrentId(){return getHashId()||PAGE_IDS[0]||null;}
function setActive(id,updateHash){
  var target=findSection(id)||sections[0];
  if(!target)return false;
  var targetId=target.dataset.previewSection;
  sections.forEach(function(section){section.hidden=section!==target;});
  var wanted='#page-'+encodeURIComponent(targetId);
  if(updateHash&&location.hash!==wanted){try{location.hash=wanted.slice(1);}catch(error){}}
  if(updateHash&&target.scrollIntoView)target.scrollIntoView({behavior:'smooth',block:'start'});
  return true;
}
function goToPage(id){return setActive(String(id||''),true);}
function getPageTarget(link){
  var explicit=link.dataset.pageTarget||link.dataset.previewPage||'';
  if(explicit&&PAGE_IDS.indexOf(explicit)!==-1)return explicit;
  var href=link.getAttribute('href')||'';
  return href.indexOf('#page-')===0?decodeURIComponent(href.slice(6)):null;
}
function selector(id){return '[data-runtime-id="'+String(id||'').replace(/(["\\\\])/g,'\\\\$1')+'"]';}
function findNode(id){return id?document.querySelector(selector(id)):null;}
function playMotion(node,name,duration){
  if(!node)return;
  Array.prototype.slice.call(node.classList).filter(function(c){return c.indexOf('motion-')===0;}).forEach(function(c){node.classList.remove(c);});
  void node.offsetWidth;
  var ms=Math.max(0,Math.min(10000,Number(duration)||420));
  var cls='motion-'+(name||'fade');
  node.style.animationDuration=ms+'ms';
  node.classList.add(cls);
  node.addEventListener('animationend',function(){node.classList.remove(cls);node.style.animationDuration='';},{once:true});
}
function runInteraction(item){
  var options=item.options||{};
  var target=findNode(options.targetId||item.sourceId);
  switch(item.action){
    case 'motion':playMotion(target,options.motion,options.duration);break;
    case 'show':if(target)target.hidden=false;break;
    case 'hide':if(target)target.hidden=true;break;
    case 'toggle':if(target)target.hidden=!target.hidden;break;
    case 'scroll':if(target&&target.scrollIntoView)target.scrollIntoView({behavior:'smooth',block:'center'});break;
    case 'page':goToPage(options.pageId);break;
    case 'url':if(options.url&&options.url!=='#')location.href=options.url;break;
  }
}
function runTrigger(sourceId,trigger){
  INTERACTIONS.filter(function(item){return item&&item.enabled!==false&&item.sourceId===sourceId&&item.trigger===trigger;}).forEach(runInteraction);
}
document.addEventListener('click',function(event){
  var link=event.target.closest&&event.target.closest('a');
  if(link){var pageId=getPageTarget(link);if(pageId&&PAGE_IDS.indexOf(pageId)!==-1){event.preventDefault();goToPage(pageId);return;}}
  var source=event.target.closest&&event.target.closest('[data-runtime-id]');
  if(source)runTrigger(source.dataset.runtimeId,'click');
});
document.addEventListener('pointerover',function(event){
  var source=event.target.closest&&event.target.closest('[data-runtime-id]');
  if(source&&source!==event.relatedTarget&&!source.contains(event.relatedTarget))runTrigger(source.dataset.runtimeId,'hover');
});
document.addEventListener('focusin',function(event){
  var source=event.target.closest&&event.target.closest('[data-runtime-id]');
  if(source)runTrigger(source.dataset.runtimeId,'focus');
});
document.addEventListener('input',function(event){
  var source=event.target.closest&&event.target.closest('[data-runtime-id]');
  if(source)runTrigger(source.dataset.runtimeId,'input');
});
if('IntersectionObserver' in window){
  var observer=new IntersectionObserver(function(entries){entries.forEach(function(entry){if(entry.isIntersecting)runTrigger(entry.target.dataset.runtimeId,'scroll');});},{threshold:.15});
  document.querySelectorAll('[data-runtime-id]').forEach(function(node){observer.observe(node);});
}
window.addEventListener('hashchange',function(){setActive(getCurrentId(),false);});
setActive(getCurrentId(),false);
INTERACTIONS.filter(function(item){return item&&item.enabled!==false&&item.trigger==='load';}).forEach(function(item){setTimeout(function(){runInteraction(item);},60);});
})();`;
  return `<script>${script}<\/script>`;
}
exports.buildPreviewRuntimeScript = buildPreviewRuntimeScript;
});
__modules.set("src/engine/quality-audit.js",(exports,__require)=>{
const {auditProject: coreAuditProject} = __require("src/core/quality.js");
const auditProject = coreAuditProject;
exports.auditProject = auditProject;
});
__modules.set("src/engine/renderer.js",(exports,__require)=>{
const {safeUrl,safeMediaUrl} = __require("src/core/utils.js");
const {resolveStyle,styleObjectToCss} = __require("src/engine/layout.js");
const {applyThemeVars} = __require("src/core/design-system.js");
const {pageAnchor,resolvePageTarget} = __require("src/engine/routing.js");
const {resolveSymbol} = __require("src/core/symbols.js");
const {getCollectionItems} = __require("src/core/cms.js");
const {findAsset} = __require("src/core/assets.js");

const el=(tag,cls='')=>{const node=document.createElement(tag);if(cls)node.className=cls;return node};
const textNode=(text,tag='p')=>{const node=el(tag);node.textContent=String(text??'');return node};

function safeWrapperTag(node){const requested=node.semantic?.tag&&/^[a-z][a-z0-9-]*$/i.test(node.semantic.tag)?String(node.semantic.tag).toLowerCase():'div';const interactiveTags=new Set(['a','button','form','input','textarea','select','option','label','nav','footer']);return interactiveTags.has(requested)?'div':requested}
function wrap(node,ctx){const semanticTag=safeWrapperTag(node);const w=el(semanticTag,'node-wrap');w.dataset[ctx.export?'runtimeId':'nodeId']=node.id;w.dataset.bunaaType=node.type;if(node.locked)w.dataset.locked='1';if(ctx.device&&node.visibility&&node.visibility[ctx.device]===false)w.hidden=true;if(!ctx.export){w.dataset.type=node.type;w.dataset.label=node.props?.label||node.props?.title||node.props?.text||node.type}for(const cls of node.classes||[])w.classList.add(String(cls));for(const [key,value] of Object.entries(node.attrs||{})){const attrName=String(key||'').trim();if(value!=null&&attrName&&!/^on[a-z]+$/i.test(attrName)&&attrName.toLowerCase()!=='srcdoc'&&attrName.toLowerCase()!=='style')w.setAttribute(attrName,String(value))}if(node.semantic?.role)w.setAttribute('role',node.semantic.role);if(node.semantic?.ariaLabel)w.setAttribute('aria-label',node.semantic.ariaLabel);const content=el('div','node-content');content.dataset.bunaaContent='1';content.style.cssText=styleObjectToCss(resolveStyle(node,ctx.device,ctx.theme,ctx.styleLibrary,ctx.project));renderContent(content,node,ctx);for(const child of node.children||[])content.appendChild(wrap(child,ctx));w.appendChild(content);if(!ctx.export&&ctx.selectedId===node.id)w.classList.add('selected');return w}


function boundValue(node,ctx,key,fallback=''){const variable=node?.props?.bindingVariable;if(variable&&ctx.project?.variables){const source=ctx.project.variables[variable];if(source&&Object.prototype.hasOwnProperty.call(source,'value'))return String(source.value)}return String(node?.props?.[key]??fallback)}

function assetSrc(node,kind,ctx){const asset=findAsset(ctx.project,node?.props?.assetId);if(!asset)return safeMediaUrl(node?.props?.src||node?.props?.url||'',kind)||'';return ctx.export&&ctx.assetMap?.get(asset.id)?ctx.assetMap.get(asset.id):asset.data}

function pageHref(page,ctx){if(!page)return '#';if(ctx.export&&ctx.pageMap)return ctx.pageMap.get(page.id)||'#';return pageAnchor(page.id)}
function resolveHref(url,ctx){const target=resolvePageTarget(url,ctx.project);return target?pageHref(target,ctx):safeUrl(url||'#')}
function assetById(ctx,id){return (ctx.project?.assets||[]).find(asset=>asset.id===id)||null}
function assetTile(asset,ctx){
  const card=el('article','built-media-tile');const source=asset?(ctx.export&&ctx.assetMap?.get(asset.id)?ctx.assetMap.get(asset.id):asset.data):'';
  if(asset?.kind==='image'){const img=el('img');img.src=source||placeholder(asset.name);img.alt=asset.alt||asset.name;img.loading='lazy';card.appendChild(img)}
  else if(asset?.kind==='video'){const video=el('video');video.controls=true;video.preload='metadata';video.playsInline=true;if(source)video.src=source;card.appendChild(video)}
  else if(asset?.kind==='audio'){const audio=el('audio');audio.controls=true;audio.preload='metadata';if(source)audio.src=source;card.appendChild(audio)}
  else if(asset){const a=el('a','built-file-link');a.href=source||'#';a.textContent=`▤ ${asset.name}.${asset.extension||'bin'}`;a.download=asset.filename||'';card.appendChild(a)}
  else card.appendChild(textNode('اختر ملفات من مكتبة الوسائط.'));
  if(asset){const caption=el('small','built-media-caption');caption.textContent=asset.alt||asset.originalName||asset.filename;card.appendChild(caption)}return card;
}
function walkNodes(nodes,fn){for(const node of nodes||[]){fn(node);walkNodes(node.children,fn)}}
function findNodeOnPage(page,id){let found=null;walkNodes(page?.nodes,n=>{if(n.id===id)found=n});return found}
function plainTextFromNode(node){if(!node)return '';const p=node.props||{};const keys=['title','text','description','question','answer','quote','name','label','body'];return keys.map(k=>p[k]).filter(v=>typeof v==='string'&&v.trim()).join('\n')}
const SAFE_SNIPPET_TAGS=new Set(['h1','h2','h3','h4','h5','h6','p','span','strong','em','b','i','u','s','ul','ol','li','a','img','blockquote','pre','code','br','hr','figure','figcaption','table','thead','tbody','tr','th','td','div','section','small','mark','sup','sub','del','ins']);
function safeSnippetUrl(value,tag,attr){const v=String(value||'').trim();if(!v)return '';if(/^(javascript|vbscript):/i.test(v))return '';if(/^data:/i.test(v))return tag==='img'&&attr==='src'&&/^data:image\/(png|jpeg|gif|webp|svg\+xml);/i.test(v)?v:'';if(/^(https?:|mailto:|tel:|#|\/|\.\.?\/)/i.test(v))return v;return ''}
function appendSafeSnippet(root,markup){
  let parsed;try{parsed=new DOMParser().parseFromString(String(markup||''),'text/html')}catch{return}
  const copy=(source,parent)=>{for(const child of [...source.childNodes]){if(child.nodeType===3){parent.appendChild(document.createTextNode(child.nodeValue||''));continue}if(child.nodeType!==1)continue;const tag=child.tagName.toLowerCase();if(['script','style','iframe','object','embed','form','input','button','textarea','select','option','link','meta','base','template','svg','math'].includes(tag))continue;if(!SAFE_SNIPPET_TAGS.has(tag)){copy(child,parent);continue}const target=document.createElement(tag);for(const attr of [...child.attributes]){const name=attr.name.toLowerCase();if(name.startsWith('on')||['style','srcdoc','formaction','action','contenteditable'].includes(name))continue;if(['href','src'].includes(name)){const value=safeSnippetUrl(attr.value,tag,name);if(value)target.setAttribute(name,value);continue}if(['class','title','alt','width','height','rowspan','colspan','scope','role','aria-label','loading'].includes(name)||/^aria-[a-z-]+$/.test(name)){if(name==='class')target.className=attr.value.split(/\s+/).filter(x=>/^[a-z0-9_-]{1,50}$/i.test(x)).join(' ');else target.setAttribute(name,attr.value.slice(0,300))}}if(tag==='a'&&target.target==='_blank')target.rel='noopener noreferrer';copy(child,target);parent.appendChild(target)}};copy(parsed.body,root)
}

function renderContent(root,node,ctx){const p=node.props||{};switch(node.type){
case'heading':root.appendChild(textNode(boundValue(node,ctx,'text','عنوان'),'h2'));break;
case'text':root.appendChild(textNode(boundValue(node,ctx,'text','نص')));break;
case'button':{const a=el('a','built-button');a.textContent=boundValue(node,ctx,'text','زر');a.href=resolveHref(p.url,ctx);a.dataset.action=p.action||'url';const target=resolvePageTarget(p.url,ctx.project);if(target)a.dataset.pageTarget=target.id;if(p.newTab)a.target='_blank';root.appendChild(a);break}
case'link':{const a=el('a');a.textContent=boundValue(node,ctx,'text','رابط');a.href=resolveHref(p.url,ctx);const target=resolvePageTarget(p.url,ctx.project);if(target)a.dataset.pageTarget=target.id;root.appendChild(a);break}
case'image':{const img=el('img');img.src=assetSrc(node,'image',ctx)||safeMediaUrl(node.props?.bindingVariable?boundValue(node,ctx,'src',p.src):p.src,'image')||placeholder();img.alt=p.alt||'';img.loading='lazy';root.appendChild(img);break}
case'gallery':case'media-grid':{const gallery=el('div',node.type==='gallery'?'built-gallery':'built-media-grid');const ids=Array.isArray(p.assetIds)&&p.assetIds.length?p.assetIds:(ctx.project.assets||[]).filter(a=>node.type==='media-grid'||a.kind==='image').slice(0,Math.max(1,Math.min(24,Number(p.count)||6))).map(a=>a.id);gallery.style.gridTemplateColumns=`repeat(${Math.max(1,Math.min(6,Number(p.columns)||3))},minmax(0,1fr))`;const items=ids.map(id=>assetById(ctx,id)).filter(Boolean);if(items.length)items.forEach(asset=>gallery.appendChild(assetTile(asset,ctx)));else for(let i=0;i<Math.max(1,Math.min(12,Number(p.count)||3));i++){const placeholderAsset={kind:'image',name:`صورة ${i+1}`,alt:`صورة تجريبية ${i+1}`,data:placeholder(`صورة ${i+1}`)};gallery.appendChild(assetTile(placeholderAsset,ctx))}root.appendChild(gallery);break}
case'video-gallery':case'audio-playlist':{const type=node.type==='video-gallery'?'video':'audio';const box=el('div',node.type==='video-gallery'?'built-video-gallery':'built-audio-playlist');if(p.title)box.appendChild(textNode(p.title,'h3'));const assets=(p.assetIds||[]).map(id=>assetById(ctx,id)).filter(a=>a&&a.kind===type);if(node.type==='video-gallery')box.style.gridTemplateColumns=`repeat(${Math.max(1,Math.min(4,Number(p.columns)||2))},minmax(0,1fr))`;if(assets.length)assets.forEach(asset=>box.appendChild(assetTile(asset,ctx)));else box.appendChild(textNode(type==='video'?'أضف فيديوهات من مكتبة الوسائط.':'أضف ملفات صوت من مكتبة الوسائط.'));root.appendChild(box);break}
case'document-viewer':{const asset=assetById(ctx,p.assetId);const src=assetSrc(node,'document',ctx);const isPdf=(asset?.extension||'').toLowerCase()==='pdf'||/application\/pdf/i.test(asset?.type||'');const box=el('div','built-document-viewer');if(p.title)box.appendChild(textNode(p.title,'h3'));if(asset&&src&&isPdf){const frame=el('iframe');frame.src=src;frame.title=p.title||asset.filename||'PDF';frame.loading='lazy';frame.style.width='100%';frame.style.height=`${Math.max(260,Math.min(1400,Number(p.height)||640))}px`;frame.setAttribute('loading','lazy');box.appendChild(frame)}if(asset&&src){const link=el('a','built-file-link');link.href=src;link.textContent=isPdf?'فتح أو تنزيل ملف PDF':`فتح ${asset.filename}`;link.target='_blank';link.rel='noopener';link.download=asset.filename||'';box.appendChild(link)}else box.appendChild(textNode('اختر ملف PDF من خصائص العنصر.'));root.appendChild(box);break}
case'file-card':{const asset=assetById(ctx,p.assetId);const src=assetSrc(node,'document',ctx);const box=el('article','built-file-card');box.append(textNode('▤','strong'),textNode(p.title||asset?.name||'ملف قابل للتنزيل','h3'));if(p.text)box.appendChild(textNode(p.text));if(asset&&src){const link=el('a','built-button');link.href=src;link.textContent=p.button||'فتح الملف';link.download=p.download===false?'':asset.filename||'';link.target=p.download===false?'_blank':'';if(link.target)link.rel='noopener';box.append(link);box.appendChild(textNode(`${asset.filename||asset.name} • ${Math.round((asset.size||0)/1024)} KB`,'small'))}else box.appendChild(textNode('اختر ملفًا من مكتبة الوسائط.'));root.appendChild(box);break}
case'page-embed':{const target=(ctx.project.pages||[]).find(pg=>pg.id===p.pageId);const box=el('div','built-page-embed');box.dataset.pageEmbedContent='1';if(!target){box.appendChild(textNode('اختر صفحة داخلية من خصائص العنصر.'))}else if((ctx.embeddingPages||[]).includes(target.id)){box.appendChild(textNode('توقف تضمين الصفحة لتجنب حلقة لا نهائية.'))}else{const mode=p.mode||'full';if(mode==='text'){const chosen=p.nodeId?findNodeOnPage(target,p.nodeId):null;let value=chosen?plainTextFromNode(chosen):(target.nodes||[]).map(plainTextFromNode).filter(Boolean).join('\n');value=String(value||'').slice(0,Math.max(120,Math.min(10000,Number(p.textLimit)||1800)));box.appendChild(textNode(value||'لا يوجد نص في الصفحة.'))}else{let nodes=target.nodes||[];if(mode==='section'){const chosen=findNodeOnPage(target,p.nodeId);nodes=chosen?[chosen]:[]}if(!nodes.length)box.appendChild(textNode(mode==='section'?'اختر قسمًا من الصفحة المحددة.':'الصفحة لا تحتوي عناصر بعد.'));else{const nested={...ctx,pageId:target.id,embeddingPages:[...(ctx.embeddingPages||[]),target.id]};nodes.forEach(child=>box.appendChild(wrap(child,nested)))}}}root.appendChild(box);break}
case'html-snippet':{const d=el('div','built-html-snippet');appendSafeSnippet(d,p.html||'');root.appendChild(d);break}
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
case'avatar':{const img=el('img','built-avatar');img.src=assetSrc(node,'image',ctx)||safeMediaUrl(p.src,'image')||placeholder(p.name||'ش');img.alt=p.name||'';root.appendChild(img);root.appendChild(textNode(p.name||'اسم','strong'));break}
case'logo':{const d=el('div','built-logo');const src=assetSrc(node,'image',ctx)||safeMediaUrl(p.src,'image');if(src){const img=el('img');img.src=src;img.alt=p.text||'';d.appendChild(img)}else d.append(textNode(p.text||ctx.project.site?.brand?.name||'العلامة','strong'));root.appendChild(d);break}
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
case'image-text':{const d=el('div','built-image-text');const img=el('img');img.src=assetSrc(node,'image',ctx)||safeMediaUrl(p.image,'image')||placeholder();img.alt=p.title||'';const copy=el('div');copy.append(textNode(p.title||'عنوان','h3'),textNode(p.text||''));d.append(img,copy);root.appendChild(d);break}
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
case'video-card':{const d=el('article','built-video-card');d.append(textNode(p.title||'فيديو','h3'));const asset=assetById(ctx,p.assetId);const src=assetSrc(node,'video',ctx)||safeMediaUrl(p.url,'video');if(src&&(asset?.kind==='video'||/^data:video\//i.test(src)||/^assets\//i.test(src))){const video=el('video');video.src=src;video.controls=true;video.playsInline=true;video.preload='metadata';video.title=p.title||'فيديو';d.appendChild(video)}else if(src&&/^https?:\/\//i.test(src)){const frame=el('iframe');frame.src=src;frame.title=p.title||'فيديو';frame.loading='lazy';frame.setAttribute('allow','fullscreen; picture-in-picture');d.appendChild(frame)}else d.appendChild(textNode('ارفع مقطع فيديو من مكتبة الوسائط لعرضه هنا.'));if(p.duration)d.appendChild(textNode(p.duration,'small'));root.appendChild(d);break}
case'compare':case'feature-comparison':{const table=el('table','comparison-table');(p.items||p.rows||[]).forEach((row,ri)=>{const tr=el('tr');row.forEach(cell=>tr.appendChild(textNode(cell,ri===0?'th':'td')));table.appendChild(tr)});root.appendChild(table);break}
case'callout':{const d=el('aside','built-callout');d.append(textNode(p.title||'ملاحظة','strong'),textNode(p.text||''));root.appendChild(d);break}
case'spinner':{const d=el('span','built-spinner');d.setAttribute('aria-label','تحميل');root.appendChild(d);break}
case'countdown':{root.appendChild(textNode(`${p.days||0} يوم • ${p.hours||0} ساعة • ${p.minutes||0} دقيقة`,'div'));break}
case'cookie-banner':{const d=el('div','built-cookie');d.append(textNode(p.text||''));const b=el('button');b.type='button';b.textContent=p.accept||'موافق';b.onclick=()=>d.remove();d.appendChild(b);root.appendChild(d);break}
case'cta':case'newsletter':case'lead-form':case'social-proof':case'highlight':case'announcement':case'quote-banner':{const d=el('div');if(p.title)d.appendChild(textNode(p.title,'h3'));d.appendChild(textNode(p.text||p.label||''));if(p.button){const b=el('button','built-button');b.type='button';b.textContent=p.button;d.appendChild(b)}root.appendChild(d);break}
case'symbol-instance':{const symbol=resolveSymbol(ctx.project,p.symbolId);if(symbol?.root&&!ctx.symbolDepth){const rendered=wrap(symbol.root,{...ctx,symbolDepth:(ctx.symbolDepth||0)+1});root.appendChild(rendered)}else if(!symbol?.root){root.appendChild(textNode('مكون مشترك غير موجود.'));}break}
default:if(p.text)root.appendChild(textNode(p.text));}}

const placeholder=(label='صورة')=>'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="420"><rect width="800" height="420" fill="#eef0f7"/><rect x="280" y="150" width="240" height="26" rx="13" fill="#5b5ce2" opacity=".25"/><text x="400" y="235" text-anchor="middle" font-family="Arial" font-size="28" fill="#5b5ce2">${label}</text></svg>`);
function renderPage(page,container,ctx){applyThemeVars(container,ctx.theme||{});container.dataset.pageId=page?.id||'';const pageCtx={...ctx,pageId:page?.id||ctx.pageId,embeddingPages:ctx.embeddingPages||[page?.id].filter(Boolean)};container.replaceChildren(...(page.nodes||[]).map(node=>wrap(node,pageCtx)));container.classList.toggle('is-empty',!(page.nodes||[]).length);return container}
function nodeHtml(node,theme,project,device='desktop',pageMap=null,assetMap=null,pageId=null){return wrap(node,{theme,project,styleLibrary:project?.styleLibrary||{},device,selectedId:null,headingTag:'h2',export:true,pageMap,assetMap,pageId,embeddingPages:[pageId].filter(Boolean)}).outerHTML}
exports.renderPage = renderPage;
exports.nodeHtml = nodeHtml;
});
__modules.set("src/engine/routing.js",(exports,__require)=>{
function pageAnchor(pageId){return `#page-${encodeURIComponent(String(pageId||''))}`}
function pageFromAnchor(hash,project){const value=String(hash||'');if(!value.startsWith('#page-'))return null;const id=decodeURIComponent(value.slice(6));return project.pages.find(page=>page.id===id)||null}
function pageFile(project,page,map){return map?.get(page.id)||((page===project.pages[0])?'index.html':`${page.slug||'page'}.html`)}
function resolvePageTarget(url,project){if(typeof url!=='string'||!url.startsWith('page:'))return null;return project.pages.find(page=>page.id===url.slice(5))||null}
exports.pageAnchor = pageAnchor;
exports.pageFromAnchor = pageFromAnchor;
exports.pageFile = pageFile;
exports.resolvePageTarget = resolvePageTarget;
});
__modules.set("src/engine/site-compiler.js",(exports,__require)=>{
const {auditProject} = __require("src/engine/quality-audit.js");
const {pageFileMap} = __require("src/engine/exporter.js");
function compileSite(project) {
  const audit = auditProject(project);
  const map = pageFileMap(project);
  const diagnostics = { ...audit, blocking: audit.issues.length > 0, generatedAt: new Date().toISOString() };
  const manifest = {
    name: project.site?.title || project.meta?.name || 'موقع بَنّاء',
    short_name: project.meta?.name || 'موقع',
    start_url: map.get(project.pages?.[0]?.id) || 'index.html',
    display: 'standalone',
    lang: project.site?.language || 'ar',
    dir: project.site?.direction || 'rtl',
    icons: project.site?.favicon ? [{ src: project.site.favicon, sizes: 'any', type: 'image/png' }] : [],
  };
  return { diagnostics, pageMap: map, manifest, robots: robotsTxt(project), sitemap: sitemapXml(project, map) };
}

function robotsTxt(project) {
  const policy = project.site?.indexing?.robots || 'index,follow';
  const disallow = policy.includes('noindex') ? '/' : '';
  const lines = [`User-agent: *`, `Disallow: ${disallow}`];
  if (project.site?.baseUrl && project.site?.indexing?.sitemap !== false) lines.push(`Sitemap: ${project.site.baseUrl.replace(/\/$/, '')}/sitemap.xml`);
  return lines.join('\n');
}

function sitemapXml(project, map) {
  const base = String(project.site?.baseUrl || '').replace(/\/$/, '');
  const urls = (project.pages || []).filter(page => !page.settings?.hidden).map(page => {
    const href = map.get(page.id) || 'index.html';
    const loc = base ? `${base}/${href}`.replace(/index\.html$/, '') : href;
    return `<url><loc>${escapeXml(loc)}</loc></url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`;
}
function escapeXml(value) { return String(value || '').replace(/[<>&'"]/g, char => ({ '<':'&lt;', '>':'&gt;', '&':'&amp;', "'":'&apos;', '"':'&quot;' }[char])); }
exports.compileSite = compileSite;
});
__modules.set("src/engine/workspace.js",(exports,__require)=>{
const {renderPage} = __require("src/engine/renderer.js");
const {createRuntime} = __require("src/engine/interaction.js");
const {addNode,insertNodeAtDrop} = __require("src/core/commands.js");
const {clamp} = __require("src/core/utils.js");
const {pageFromAnchor} = __require("src/engine/routing.js");
class WorkspaceEngine{constructor(store,inspector,panels){this.store=store;this.inspector=inspector;this.panels=panels;this.runtimeCleanup=null;this.runtimeKey='';this.wired=false;this.space=false}
mount(){this.pageCanvas=document.getElementById('pageCanvas');this.deviceFrame=document.getElementById('deviceFrame');this.viewport=document.getElementById('canvasViewport');this.stage=document.getElementById('canvasStage');this.host=document.getElementById('canvasStageHost');this.wireCanvas();this.wireControls();this.resizeObserver=globalThis.ResizeObserver?new ResizeObserver(()=>{this.reflowHost();this.centerStage()}):null;this.resizeObserver?.observe(this.viewport)}
wireCanvas(){if(this.wired)return;this.wired=true;this.pageCanvas.addEventListener('click',e=>{if(!this.store.ui.interactionMode&&e.target.closest('[data-page-embed-content]'))return;const link=e.target.closest('a');const w=e.target.closest('.node-wrap');if(this.store.ui.interactionMode){if(w){const sourceId=w.dataset.nodeId;const ownsClick=this.store.project.interactions?.some(i=>i.sourceId===sourceId&&i.enabled!==false&&i.trigger==='click');if(ownsClick){if(link)e.preventDefault();return}}if(link){const target=link.dataset.pageTarget||pageFromAnchor(link.getAttribute('href'),this.store.project)?.id;if(target){e.preventDefault();this.store.setActivePage(target);this.store.setUI({leftTab:'elements'});return}}return}if(!w)return;e.preventDefault();this.store.setUI({selected:w.dataset.nodeId,rightOpen:true})});this.pageCanvas.addEventListener('dragover',e=>{if(e.dataTransfer?.types?.includes('Files')||e.dataTransfer?.types?.includes('application/bunaa-type'))e.preventDefault()});this.pageCanvas.addEventListener('drop',async e=>{e.preventDefault();const target=e.target.closest('.node-wrap')?.dataset.nodeId||null;const files=[...(e.dataTransfer?.files||[])];if(files.length){const targetNode=target?this.store.find(target)?.node:null;const multiTypes=new Set(['gallery','image-carousel','media-grid','video-gallery','audio-playlist']);let attachedSingle=false;for(const file of files){try{const asset=await this.assetService?.addFile(file);if(!asset)continue;let attached=false;if(target&&targetNode&&multiTypes.has(targetNode.type)){const current=this.store.find(target)?.node?.props?.assetIds||[];this.assetService?.assignMany(target,[...current,asset.id]);attached=(this.store.find(target)?.node?.props?.assetIds||[]).includes(asset.id)}else if(target&&!attachedSingle){attached=Boolean(this.assetService?.assignToNode(target,asset.id));if(attached)attachedSingle=true}if(!attached)this.panels.insertAsset(asset)}catch(error){console.warn('Dropped asset failed',error);globalThis.__BUNAA_APP?.toast?.(error.message||'تعذر إضافة الملف')}}this.panels.setTab('layers');return}const type=e.dataTransfer.getData('application/bunaa-type');if(type){insertNodeAtDrop(this.store,type,target);this.panels.setTab('layers')}});document.getElementById('dropFooter')?.addEventListener('dragover',e=>{if(e.dataTransfer?.types?.includes('Files'))e.preventDefault()});document.getElementById('dropFooter')?.addEventListener('drop',async e=>{e.preventDefault();const files=[...(e.dataTransfer?.files||[])];if(files.length){for(const file of files){try{const asset=await this.assetService?.addFile(file);if(asset)this.panels.insertAsset(asset)}catch(error){console.warn(error);globalThis.__BUNAA_APP?.toast?.(error.message||'تعذر إضافة الملف')}}return}const type=e.dataTransfer.getData('application/bunaa-type');if(type)this.addElement(type)})}
wireControls(){document.getElementById('zoomIn')?.addEventListener('click',()=>this.setZoom(this.store.ui.zoom+.1));document.getElementById('zoomOut')?.addEventListener('click',()=>this.setZoom(this.store.ui.zoom-.1));document.getElementById('zoomFit')?.addEventListener('click',()=>this.fit());document.getElementById('gridBtn')?.addEventListener('click',()=>this.store.setUI({grid:!this.store.ui.grid}));document.getElementById('structureBtn')?.addEventListener('click',()=>this.panels.setTab('layers'));document.getElementById('focusBtn')?.addEventListener('click',()=>this.store.setUI({focus:!this.store.ui.focus}));this.setupPan()}
setupPan(){let pan=null;const stop=()=>{pan=null;this.viewport.style.cursor=''};this.viewport.addEventListener('pointerdown',e=>{const allow=e.button===1||(e.button===0&&this.space)||(e.button===0&&(e.ctrlKey||e.metaKey));if(!allow||!e.target.closest('#canvasStage'))return;pan={x:e.clientX,y:e.clientY,sx:this.viewport.scrollLeft,sy:this.viewport.scrollTop};try{this.viewport.setPointerCapture(e.pointerId)}catch{}this.viewport.style.cursor='grabbing'});this.viewport.addEventListener('pointermove',e=>{if(!pan)return;this.viewport.scrollLeft=pan.sx-(e.clientX-pan.x);this.viewport.scrollTop=pan.sy-(e.clientY-pan.y)});this.viewport.addEventListener('pointerup',stop);this.viewport.addEventListener('pointercancel',stop);window.addEventListener('keydown',e=>{if(e.code==='Space'&&!e.repeat&&!e.target.matches('input,textarea,select'))this.space=true});window.addEventListener('keyup',e=>{if(e.code==='Space')this.space=false});window.addEventListener('blur',()=>{this.space=false;stop()});this.viewport.addEventListener('wheel',e=>{if(!(e.ctrlKey||e.metaKey))return;e.preventDefault();this.setZoom(this.store.ui.zoom+(e.deltaY<0?.08:-.08))},{passive:false});window.addEventListener('keydown',e=>{if(e.target?.matches?.('input,textarea,select'))return;if(e.key==='PageDown')this.viewport.scrollBy({top:Math.max(240,this.viewport.clientHeight*.8),behavior:'smooth'});else if(e.key==='PageUp')this.viewport.scrollBy({top:-Math.max(240,this.viewport.clientHeight*.8),behavior:'smooth'});else if(e.key==='Home'&&this.store.ui.focus)this.viewport.scrollTo({top:0,behavior:'smooth'});else if(e.key==='End'&&this.store.ui.focus)this.viewport.scrollTo({top:this.viewport.scrollHeight,behavior:'smooth'});})}
setZoom(z){this.store.setUI({zoom:clamp(Number(z)||1,.2,1.5)})}
setDevice(device){if(!['desktop','tablet','mobile'].includes(device))return;this.store.setUI({device,zoom:1});this.inspector?.setDevice?.(device);requestAnimationFrame(()=>this.fit())}
deviceWidth(){return this.store.project.devices[this.store.ui.device]?.width||1180}
fit(){const base=this.deviceWidth(),available=Math.max(260,this.viewport.clientWidth-96);this.setZoom(clamp(available/base,.2,1.2));requestAnimationFrame(()=>{this.centerStage();this.viewport.scrollTop=0})}
centerStage(){if(!this.viewport)return;const overflow=this.viewport.scrollWidth>this.viewport.clientWidth+2;if(!overflow)this.viewport.scrollLeft=0}
addElement(type){addNode(this.store,type);this.panels.setTab('layers')}
syncRuntime(){if(!this.store.ui.interactionMode){this.runtimeCleanup?.();this.runtimeCleanup=null;this.runtimeKey='';return}const key=JSON.stringify([this.store.project.activePageId,this.store.project.interactions,this.store.ui.device]);if(key===this.runtimeKey&&this.runtimeCleanup)return;this.runtimeCleanup?.();this.runtimeCleanup=createRuntime({document,project:this.store.project,navigate:id=>{if(this.store.project.pages.some(p=>p.id===id))this.store.setActivePage(id)}});this.runtimeKey=key}
render(){const page=this.store.activePage();if(!page)return;renderPage(page,this.pageCanvas,{project:this.store.project,theme:this.store.project.theme,styleLibrary:this.store.project.styleLibrary,device:this.store.ui.device,selectedId:this.store.ui.interactionMode?null:this.store.ui.selected,pageId:page.id,embeddingPages:[page.id]});this.deviceFrame.className=`site-frame ${this.store.ui.device}`;this.pageCanvas.classList.toggle('show-grid',this.store.ui.grid);document.getElementById('canvasPageTitle').textContent=page.name;document.getElementById('canvasModeLabel').textContent=this.store.ui.interactionMode?'وضع تجربة التفاعل':'وضع البناء';const hit=this.store.ui.selected?this.store.find(this.store.ui.selected):null;document.getElementById('selectionInfo').textContent=hit?`العنصر: ${hit.node.props?.label||hit.node.props?.title||hit.node.type}`:'لم يتم تحديد عنصر';document.getElementById('pageCountLabel').textContent=`${this.store.project.pages.length} صفحة`;document.getElementById('elementCountLabel').textContent=`${this.store.nodeCount()} عنصر`;document.getElementById('dropEmpty').classList.toggle('hidden',page.nodes.length>0);document.getElementById('gridBtn').classList.toggle('active',this.store.ui.grid);this.applyZoom();this.syncRuntime()}
reflowHost(){const z=this.store.ui.zoom,base=this.deviceWidth(),viewportWidth=this.viewport?.clientWidth||0,padding=48;const required=Math.ceil(base*z+padding);this.host.style.setProperty('width',`${Math.max(viewportWidth,required)}px`,'important');this.host.style.setProperty('height',`${Math.ceil(Math.max(this.stage.offsetHeight*z,760*z)+70)}px`,'important')}
applyZoom(){const z=this.store.ui.zoom,base=this.deviceWidth();this.stage.style.width=`${base}px`;this.stage.style.maxWidth='none';this.stage.style.transform=`scale(${z})`;this.stage.style.transformOrigin='top center';this.reflowHost();document.getElementById('zoomLabel').textContent=`${Math.round(z*100)}%`;}
sync(){this.render();document.body.classList.toggle('focus-canvas',this.store.ui.focus);this.refreshPages()}
refreshPages(){const select=document.getElementById('pageSelect');if(!select)return;select.replaceChildren(...this.store.project.pages.map(p=>{const o=document.createElement('option');o.value=p.id;o.textContent=p.name;return o}));select.value=this.store.project.activePageId}
cleanup(){this.runtimeCleanup?.();this.runtimeCleanup=null;this.resizeObserver?.disconnect?.()}
}
exports.WorkspaceEngine = WorkspaceEngine;
});
__modules.set("src/features/assets/asset-service.js",(exports,__require)=>{
const {addAsset,updateAsset,searchAssets,normalizeAssets,findAsset,assetForNodeType,assetKind,extensionForType} = __require("src/core/assets.js");
const {dataUrlFromFile,uid} = __require("src/core/utils.js");
const {findNodeGlobal,walk} = __require("src/core/model.js");
const {assetBlobStore} = __require("src/features/assets/blob-store.js");
const MAX_ASSET_BYTES=75*1024*1024;
class AssetService {
  constructor(store){this.store=store;this.blobStore=assetBlobStore;this.uploading=0}
  list({query='',folder='',tag='',kind=''}={}){return searchAssets(this.store.project.assets,query,folder,tag,kind)}
  folders(){return [...new Set(normalizeAssets(this.store.project.assets).map(asset=>asset.folder))].sort()}
  tags(){return [...new Set(normalizeAssets(this.store.project.assets).flatMap(asset=>asset.tags))].sort()}
  get(id){return findAsset(this.store.project,id)}
  add(raw){return addAsset(this.store,raw)}
  update(id,patch){return updateAsset(this.store,id,patch)}
  remove(id){
    const asset=this.get(id);if(!asset)return false;
    const changed=this.store.transact('حذف وسيط وإلغاء ربطه',project=>{
      project.assets=(project.assets||[]).filter(item=>item.id!==id);
      const detach=nodes=>walk(nodes,node=>{
        if(node.props?.assetId===id){delete node.props.assetId;delete node.props.filename;for(const key of ['src','url'])if(String(node.props?.[key]||'')===String(asset.data||asset.url||''))delete node.props[key]}
        if(Array.isArray(node.props?.assetIds))node.props.assetIds=node.props.assetIds.filter(assetId=>assetId!==id);
      });
      for(const page of project.pages||[])detach(page.nodes);
      for(const symbol of project.symbols?.definitions||[])if(symbol.root)detach([symbol.root]);
    });
    if(changed)this._deleteBlobIfUnused(id).catch(()=>{});
    return changed;
  }
  async _deleteBlobIfUnused(id){
    const userId=this.store.userId;
    if(userId){for(const meta of this.store.repo.list(userId)){const project=meta.id===this.store.projectId?this.store.project:this.store.repo.get(userId,meta.id);if(project?.assets?.some(asset=>asset.id===id))return false}}
    return this.blobStore.delete(id);
  }
  async _optimizedFile(file){
    if(!file||file.size<1400*1024||!String(file.type||'').startsWith('image/')||['image/gif','image/svg+xml','image/avif'].includes(file.type))return {file,optimized:false,originalSize:file?.size||0};
    try{
      let image; if(globalThis.createImageBitmap)image=await createImageBitmap(file); else {const url=URL.createObjectURL(file);image=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=url})}
      const max=2200,scale=Math.min(1,max/Math.max(image.width||image.naturalWidth,image.height||image.naturalHeight));
      const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round((image.width||image.naturalWidth)*scale));canvas.height=Math.max(1,Math.round((image.height||image.naturalHeight)*scale));const ctx=canvas.getContext('2d');if(!ctx)return {file,optimized:false,originalSize:file.size};ctx.drawImage(image,0,0,canvas.width,canvas.height);image.close?.();
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.84));if(!blob||blob.size>=file.size*.96)return {file,optimized:false,originalSize:file.size};
      const derived=new File([blob],String(file.name||'image').replace(/\.[^.]+$/,'')+'.webp',{type:'image/webp',lastModified:file.lastModified||Date.now()});return {file:derived,optimized:true,originalSize:file.size,width:canvas.width,height:canvas.height};
    }catch{return {file,optimized:false,originalSize:file?.size||0}}
  }
  async addFile(file,{purpose='',folder='',tags=[],alt='',attachTo=null}={}){
    if(!file||typeof file.size!=='number')throw new Error('اختر ملفًا صالحًا أولًا.');
    if(file.size>MAX_ASSET_BYTES)throw new Error('حجم الملف أكبر من الحد الحالي (75 ميجابايت). قلّل الحجم ثم جرّب مرة أخرى.');
    this.uploading++;
    try{
      const optimized=await this._optimizedFile(file);const storedFile=optimized.file;const assetId=uid('asset');
      // Put binary first to avoid the autosave timer briefly writing a huge data URL to localStorage.
      const stored=await this.blobStore.put(assetId,storedFile,{name:storedFile.name||file.name,type:storedFile.type||file.type});
      if(!stored){const inlineTotal=(this.store.project.assets||[]).filter(a=>a.storageRef!=='indexeddb').reduce((sum,a)=>sum+Number(a.size||0),0);if(storedFile.size>1200*1024||inlineTotal+storedFile.size>1800*1024)throw new Error('هذا المتصفح لا يسمح بتخزين الملفات الكبيرة خارج بيانات المشروع. صغّر الملف إلى أقل من 1.2 ميجابايت أو افتح المشروع في متصفح يسمح بتخزين الوسائط.')}
      const data=await dataUrlFromFile(storedFile);
      const raw={id:assetId,originalName:file.name||storedFile.name,name:'',type:storedFile.type||file.type||'application/octet-stream',size:storedFile.size,originalSize:optimized.originalSize,data,storageRef:stored?'indexeddb':'',folder:folder||purpose||assetKind(storedFile.type,storedFile.name)||'general',tags,alt:alt||String(file.name||storedFile.name).replace(/\.[^.]+$/,''),optimized:optimized.optimized,width:optimized.width||0,height:optimized.height||0};
      if(String(raw.type).startsWith('image/')&&!raw.width){try{const url=URL.createObjectURL(storedFile);const image=new Image();await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;image.src=url});raw.width=image.naturalWidth;raw.height=image.naturalHeight;URL.revokeObjectURL(url)}catch{}}
      const asset=this.add(raw);
      if(attachTo)this.assignToNode(attachTo,asset.id);
      return this.get(asset.id)||asset;
    } finally {this.uploading=Math.max(0,this.uploading-1)}
  }
  async hydrateProjectAssets(project=this.store.project){
    if(!project||!Array.isArray(project.assets))return {restored:0,migrated:0};
    let restored=0,migrated=0;
    for(const item of [...project.assets]){
      if(item.storageRef==='indexeddb'&&!item.data){
        const record=await this.blobStore.get(item.id);if(record?.blob){try{const file=new File([record.blob],item.filename||record.name||item.originalName||item.name,{type:item.type||record.type||record.blob.type});const data=await dataUrlFromFile(file);this.store.transact('استعادة وسيط محفوظ',p=>{const a=p.assets.find(x=>x.id===item.id);if(a)a.data=data},{record:false,persist:false,emit:false});restored++}catch{}}
      } else if(item.data&&/^data:/i.test(item.data)&&!item.storageRef&&Number(item.size||0)>128*1024){
        try{const blob=await (await fetch(item.data)).blob();const stored=await this.blobStore.put(item.id,blob,{name:item.filename,type:item.type});if(stored){this.store.transact('نقل الوسائط إلى التخزين المخصص',p=>{const a=p.assets.find(x=>x.id===item.id);if(a){a.storageRef='indexeddb';a.data=item.data}},{record:false,persist:false,emit:false});migrated++}}catch{}
      }
    }
    if(restored||migrated){this.store.markDirty();this.store.persist();this.store.emit()}
    return {restored,migrated};
  }
  assignToNode(nodeId,assetId){
    const asset=this.get(assetId);if(!asset)return false;const hitBefore=findNodeGlobal(this.store.project,nodeId);if(!hitBefore)return false;const expected=assetForNodeType(hitBefore.node.type);
    if(expected!=='other'&&expected!=='any'&&expected!=='mixed'&&asset.kind!==expected)return false;
    return this.store.transact('ربط وسيط بالعنصر',project=>{const hit=findNodeGlobal(project,nodeId);if(!hit)return;const n=hit.node;n.props={...(n.props||{}),assetId:asset.id,filename:asset.filename};if(asset.kind==='image')n.props.alt=n.props.alt||asset.alt||asset.name;
      if(n.props.src&&/^data:/i.test(n.props.src))delete n.props.src;if(n.props.url&&/^data:/i.test(n.props.url))delete n.props.url;
    });
  }
  assignMany(nodeId,assetIds){
    const hit=findNodeGlobal(this.store.project,nodeId);if(!hit)return false;const expected=assetForNodeType(hit.node.type);const valid=[...new Set(assetIds||[])].filter(id=>{const a=this.get(id);return a&&(expected==='mixed'||expected==='any'||expected==='other'||a.kind===expected)});
    return this.store.transact('تحديث وسائط متعددة',project=>{const target=findNodeGlobal(project,nodeId)?.node;if(!target)return;target.props={...(target.props||{}),assetIds:valid};if(['gallery','image-carousel'].includes(target.type))target.props.count=Math.max(valid.length,1)});
  }
  compatibleForNode(nodeType){const desired=assetForNodeType(nodeType);return this.list({kind:['any','mixed','other'].includes(desired)?'':desired})}
}
exports.AssetService = AssetService;
});
__modules.set("src/features/assets/blob-store.js",(exports,__require)=>{
const DB_NAME='bunaa-studio-assets-v30';
const DB_VERSION=1;
class AssetBlobStore{
  constructor(){this.dbPromise=null}
  open(){
    if(!globalThis.indexedDB)return Promise.resolve(null);
    if(this.dbPromise)return this.dbPromise;
    this.dbPromise=new Promise(resolve=>{
      try{const request=indexedDB.open(DB_NAME,DB_VERSION);request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains('assets'))db.createObjectStore('assets',{keyPath:'id'})};request.onsuccess=()=>resolve(request.result);request.onerror=()=>resolve(null);request.onblocked=()=>resolve(null)}catch{resolve(null)}
    });
    return this.dbPromise;
  }
  async available(){return Boolean(await this.open())}
  async put(id,blob,meta={}){const db=await this.open();if(!db)return false;return new Promise(resolve=>{try{const tx=db.transaction('assets','readwrite');tx.objectStore('assets').put({id:String(id),blob,type:blob?.type||meta.type||'application/octet-stream',name:meta.name||'',updatedAt:Date.now()});tx.oncomplete=()=>resolve(true);tx.onerror=()=>resolve(false);tx.onabort=()=>resolve(false)}catch{resolve(false)}})}
  async get(id){const db=await this.open();if(!db)return null;return new Promise(resolve=>{try{const req=db.transaction('assets','readonly').objectStore('assets').get(String(id));req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>resolve(null)}catch{resolve(null)}})}
  async delete(id){const db=await this.open();if(!db)return false;return new Promise(resolve=>{try{const tx=db.transaction('assets','readwrite');tx.objectStore('assets').delete(String(id));tx.oncomplete=()=>resolve(true);tx.onerror=()=>resolve(false);tx.onabort=()=>resolve(false)}catch{resolve(false)}})}
}
const assetBlobStore=new AssetBlobStore();
exports.AssetBlobStore=AssetBlobStore;
exports.assetBlobStore=assetBlobStore;
});
__modules.set("src/features/backup/backup-service.js",(exports,__require)=>{
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
__modules.set("src/features/cms/index.js",(exports,__require)=>{
const {CMS_FIELD_TYPES,addCollection,updateCollection,removeCollection,addItem,updateItem,removeItem,getCollection,getCollectionItems} = __require("src/core/cms.js");
exports.CMS_FIELD_TYPES = CMS_FIELD_TYPES;
exports.addCollection = addCollection;
exports.updateCollection = updateCollection;
exports.removeCollection = removeCollection;
exports.addItem = addItem;
exports.updateItem = updateItem;
exports.removeItem = removeItem;
exports.getCollection = getCollection;
exports.getCollectionItems = getCollectionItems;
});
__modules.set("src/features/components/index.js",(exports,__require)=>{
const {createSymbolFromSelection,insertSymbol,updateSymbol,removeSymbol,resolveSymbol} = __require("src/core/symbols.js");
exports.createSymbolFromSelection = createSymbolFromSelection;
exports.insertSymbol = insertSymbol;
exports.updateSymbol = updateSymbol;
exports.removeSymbol = removeSymbol;
exports.resolveSymbol = resolveSymbol;
});
__modules.set("src/features/design/design-service.js",(exports,__require)=>{
const {deepClone} = __require("src/core/utils.js");
function setDesignToken(store, group, key, value) {
  return store.transact('تعديل Design Token', project => {
    project.theme.tokens ||= {};
    if (group === '') project.theme.tokens[key] = deepClone(value);
    else if (group.includes('.')) { const parts = group.split('.'); let target = project.theme.tokens; for (const part of parts) target = target[part] ||= {}; target[key] = deepClone(value); }
    else { project.theme.tokens[group] ||= {}; project.theme.tokens[group][key] = deepClone(value); }
    if (group === 'colors' && ['primary','secondary','accent','surface','text','muted'].includes(key)) project.theme[key] = value;
  });
}
function defineClass(store, name, styles = {}) {
  return store.transact('إنشاء Class', project => {
    project.styleLibrary ||= { classes: {}, textStyles: {}, effects: {} };
    project.styleLibrary.classes[name] = deepClone(styles);
  });
}
function defineTextStyle(store, name, styles = {}) {
  return store.transact('إنشاء Text Style', project => {
    project.styleLibrary ||= { classes: {}, textStyles: {}, effects: {} };
    project.styleLibrary.textStyles[name] = deepClone(styles);
  });
}
exports.setDesignToken = setDesignToken;
exports.defineClass = defineClass;
exports.defineTextStyle = defineTextStyle;
});
__modules.set("src/features/navigation/navigation-service.js",(exports,__require)=>{
const {addMenuItem,updateMenuItem,removeMenuItem,reorderMenuItem,ensurePageMenu,visiblePages} = __require("src/core/navigation.js");
function getMenus(project) {
  return (project?.navigation?.menus || []).map(menu => ({ ...menu, items: Array.isArray(menu.items) ? menu.items : [] }));
}
function getHeaderMenu(project) {
  return getMenus(project).find(menu => menu.id === project?.navigation?.headerMenuId) || getMenus(project)[0] || null;
}
function syncNavigation(project) {
  const draft = { ...project, navigation: structuredClone(project.navigation || {}) };
  if (!draft.navigation.headerMenuId) draft.navigation.headerMenuId = 'main';
  ensurePageMenu(draft, draft.navigation.headerMenuId);
  return draft.navigation;
}
const navigationActions = { addMenuItem, updateMenuItem, removeMenuItem, reorderMenuItem, visiblePages };
exports.getMenus = getMenus;
exports.getHeaderMenu = getHeaderMenu;
exports.syncNavigation = syncNavigation;
exports.navigationActions = navigationActions;
});
__modules.set("src/features/projects/project-service.js",(exports,__require)=>{
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
});
__modules.set("src/features/releases/release-service.js",(exports,__require)=>{
const {compileSite} = __require("src/features/seo/index.js");
class ReleaseService {
  constructor(store) { this.store = store; }
  inspect() {
    const diagnostics = compileSite(this.store.project).diagnostics;
    const release = this.store.project.release || { channel: 'draft', status: 'draft', version: 1, publishedAt: null };
    return { release: { ...release }, diagnostics, canPublish: diagnostics.issues.length === 0 };
  }
  markReady(channel = 'production') {
    return this.store.transact('تجهيز الإصدار', project => {
      project.release ||= { channel: 'draft', status: 'draft', version: 1, publishedAt: null };
      project.release.channel = channel;
      project.release.status = 'ready';
      project.release.version = Number(project.release.version || 0) + 1;
    });
  }
  publish() {
    const state = this.inspect();
    if (!state.canPublish) return { ok: false, ...state };
    const publishedAt = new Date().toISOString();
    this.store.transact('نشر إصدار الموقع', project => {
      project.release ||= {};
      project.release.status = 'published';
      project.release.channel = 'production';
      project.release.version = Number(project.release.version || 0) + 1;
      project.release.publishedAt = publishedAt;
      for (const page of project.pages || []) if (page.status === 'draft') page.status = 'published';
    });
    this.store.persistNow();
    return { ok: true, ...this.inspect() };
  }
  unpublish() {
    return this.store.transact('إيقاف النشر', project => {
      project.release ||= {};
      project.release.status = 'draft';
      project.release.channel = 'draft';
    });
  }
}
exports.ReleaseService = ReleaseService;
});
__modules.set("src/features/seo/index.js",(exports,__require)=>{
const {auditProject} = __require("src/engine/quality-audit.js"); const {compileSite} = __require("src/engine/site-compiler.js");
exports.auditProject = auditProject;
exports.compileSite = compileSite;
});
__modules.set("src/main.js",(exports,__require)=>{
const {getClientRuntime} = __require("src/core/runtime.js");
const {App} = __require("src/app/app.js");
const app=new App();
if(typeof window!=='undefined')window.__BUNAA_APP=app;

const showBootError=(error)=>{
  try{
    console.error('Bunaa boot failed',error);
    const existing=document.getElementById('bunaaBootError');
    const box=existing||document.createElement('section');
    if(!existing){box.id='bunaaBootError';document.body?.appendChild(box)}
    box.innerHTML='<div style="max-width:720px;margin:8vh auto;padding:28px;border:1px solid #ddd;border-radius:18px;background:#fff;font-family:system-ui;direction:rtl"><h1 style="margin-top:0">تعذر تشغيل بَنّاء</h1><p>حدث خطأ أثناء تشغيل الاستوديو. أعد تحميل الصفحة. تفاصيل الخطأ تظهر في Console للمراجعة التقنية.</p><button onclick="location.reload()" style="padding:10px 16px;border:0;border-radius:10px;cursor:pointer">إعادة تحميل</button></div>';
    Object.assign(box.style,{position:'fixed',inset:'0',zIndex:'999999',background:'#f5f6fa',padding:'20px'});
  }catch{}
};

if(typeof window!=='undefined'){
  window.addEventListener('error',event=>{if(!app.booted)showBootError(event.error||event.message)});
  window.addEventListener('unhandledrejection',event=>{if(!app.booted)showBootError(event.reason)});
}
const openWorkspace=mode=>app.showWorkspace(mode||'normal');
const bootstrap=()=>app.start();
if(typeof window!=='undefined'){window.__BUNAA_LAYOUT_DIAGNOSTICS__=()=>{const root=document.querySelector('.workspace-main'),canvas=document.querySelector('.canvas-area'),viewport=document.querySelector('#canvasViewport');return {rootWidth:root?.getBoundingClientRect().width||0,canvasWidth:canvas?.getBoundingClientRect().width||0,viewportWidth:viewport?.getBoundingClientRect().width||0,display:getComputedStyle(root||document.body).display,leftCollapsed:root?.classList.contains('left-collapsed')||false,rightCollapsed:root?.classList.contains('right-collapsed')||false,scrollWidth:viewport?.scrollWidth||0,scrollHeight:viewport?.scrollHeight||0,clientWidth:viewport?.clientWidth||0,clientHeight:viewport?.clientHeight||0};};}

try{if(typeof window!=='undefined')window.__BUNAA_RUNTIME__=getClientRuntime();bootstrap()}catch(error){showBootError(error)}
exports.app = app;
exports.openWorkspace = openWorkspace;
exports.bootstrap = bootstrap;
});
__modules.set("src/ui/dialogs.js",(exports,__require)=>{
const {showModal} = __require("src/ui/modal.js");
const {exportZip,exportCurrentHtml,exportProjectJson} = __require("src/engine/exporter.js");
const {nodeHtml} = __require("src/engine/renderer.js");
const {pageAnchor} = __require("src/engine/routing.js");
const {buildPreviewRuntimeScript} = __require("src/engine/preview-router.js");
const {auditProject} = __require("src/engine/quality-audit.js");
class Dialogs{
  constructor(store){this.store=store;this.host=document.getElementById('modalHost')}
  bind(){const on=(id,fn)=>document.getElementById(id)?.addEventListener('click',fn);on('previewBtn',()=>this.preview());on('exportBtn',()=>this.export());on('qualityBtn',()=>this.quality());on('globalStyleBtn',()=>this.theme());on('shortcutsBtn',()=>this.shortcuts());on('advancedDevicesBtn',()=>this.store.setUI({advancedDevices:!this.store.ui.advancedDevices}))}
  preview(){const html=this.previewHtml();const modal=showModal(this.host,{title:'معاينة الموقع',body:'<iframe id="previewFrame" class="preview-iframe" title="المعاينة"></iframe>',wide:true});const frame=modal.querySelector('#previewFrame');frame.srcdoc=html;return modal}
  previewHtml(){
    const project=this.store.project;
    const pages=project.pages;
    const nav=pages.map(page=>`<a href="${pageAnchor(page.id)}" data-page-target="${escapeText(page.id)}">${escapeText(page.name)}</a>`).join('');
    const sections=pages.map((page,index)=>{
      const body=(page.nodes||[]).map(node=>nodeHtml(node,project.theme,project,'desktop',null)).join('');
      return `<section class="preview-page" data-preview-section="${escapeText(page.id)}" id="page-${encodeURIComponent(page.id)}" ${index?'hidden':''}><main>${body}</main></section>`;
    }).join('');
    const theme=project.theme;
    const script=buildPreviewRuntimeScript(pages.map(page=>page.id),project.interactions||[]);
    return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html{scroll-behavior:smooth}body{margin:0;font-family:system-ui;color:${theme.text};background:#fff;line-height:1.6}.preview-nav{position:sticky;top:0;z-index:10;background:#fff;border-bottom:1px solid #e6e8f0;padding:12px 18px}.preview-nav nav{display:flex;gap:14px;flex-wrap:wrap}.preview-nav a{color:${theme.primary};text-decoration:none}.preview-page{max-width:1180px;margin:0 auto}.preview-page main{max-width:none}.preview-page[hidden]{display:none!important}.node-wrap{display:block}.built-button{display:inline-flex;padding:11px 20px;background:${theme.primary};color:#fff;border-radius:11px;text-decoration:none;font-weight:800}.built-card,.built-product,.built-testimonial{padding:18px;border:1px solid #e7e9ef;border-radius:14px;background:#fff}.built-gallery{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.built-gallery img{width:100%;height:200px;object-fit:cover;border-radius:12px}.built-stats,.built-pricing,.built-timeline{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.built-stats>div,.built-pricing>div,.built-timeline>div{padding:16px;border:1px solid #e7e9ef;border-radius:12px}.built-progress{height:32px;background:#eef0f5;border-radius:10px;overflow:hidden;position:relative}.built-progress>div{height:100%;background:${theme.primary}}.tab-panel.hidden{display:none!important}.motion-fade{animation:previewFade .7s ease}.motion-slide{animation:previewSlide .7s ease}.motion-zoom{animation:previewZoom .7s ease}.motion-pulse{animation:previewPulse 1.2s ease}.motion-shake{animation:previewShake .5s ease}.motion-bounce{animation:previewBounce .7s ease}@keyframes previewFade{from{opacity:.2}to{opacity:1}}@keyframes previewSlide{from{transform:translateY(14px);opacity:.2}to{transform:translateY(0);opacity:1}}@keyframes previewZoom{from{transform:scale(.96);opacity:.2}to{transform:scale(1);opacity:1}}@keyframes previewPulse{50%{transform:scale(1.03)}}@keyframes previewShake{25%{transform:translateX(5px)}50%{transform:translateX(-5px)}75%{transform:translateX(3px)}}@keyframes previewBounce{45%{transform:translateY(-9px)}}@media(max-width:760px){.built-gallery,.built-stats,.built-pricing,.built-timeline{grid-template-columns:1fr}}
/* V27 legacy stable editor contract retained; V28 UX overrides below */
.workspace-main{
  display:flex !important;
  flex:1 1 auto !important;
  width:100% !important;
  min-width:0 !important;
  min-height:0 !important;
  height:auto !important;
  position:relative !important;
  overflow:hidden !important;
  isolation:isolate;
  gap:0 !important;
}
.workspace-main > .left-drawer{
  position:relative !important;
  inset:auto !important;
  width:var(--sidebar) !important;
  min-width:0 !important;
  max-width:var(--sidebar) !important;
  flex:0 0 var(--sidebar) !important;
  height:100% !important;
  min-height:0 !important;
  grid-area:auto !important;
}
.workspace-main > .right-drawer{
  position:relative !important;
  inset:auto !important;
  width:var(--inspector) !important;
  min-width:0 !important;
  max-width:var(--inspector) !important;
  flex:0 0 var(--inspector) !important;
  height:100% !important;
  min-height:0 !important;
  grid-area:auto !important;
}
.workspace-main > .left-drawer.is-collapsed{
  width:0 !important;
  max-width:0 !important;
  flex-basis:0 !important;
  border-inline-width:0 !important;
  overflow:hidden !important;
}
.workspace-main > .right-drawer.is-collapsed{
  width:0 !important;
  max-width:0 !important;
  flex-basis:0 !important;
  border-inline-width:0 !important;
  overflow:hidden !important;
}
.workspace-main > .canvas-area{
  position:relative !important;
  flex:1 1 0% !important;
  width:auto !important;
  min-width:0 !important;
  max-width:none !important;
  min-height:0 !important;
  height:100% !important;
  overflow:hidden !important;
  grid-area:auto !important;
  grid-column:auto !important;
  grid-row:auto !important;
}
.workspace-main > .drawer-rail{
  position:absolute !important;
  top:50% !important;
  bottom:auto !important;
  z-index:300 !important;
  flex:none !important;
  width:34px !important;
  height:92px !important;
  margin:0 !important;
}
.workspace-main > .left-rail{inset-inline-start:0 !important;}
.workspace-main > .right-rail{inset-inline-end:0 !important;}
.workspace-main > .drawer-rail.hidden-rail{display:none !important;}
.workspace-main > .canvas-area .canvas-viewport{
  width:100% !important;
  min-width:0 !important;
  min-height:0 !important;
  height:100% !important;
  overflow:auto !important;
  scrollbar-gutter:stable both-edges;
  overscroll-behavior:contain;
}
@media (max-width:900px){
  .workspace-main,
  .workspace-main.left-collapsed,
  .workspace-main.right-collapsed,
  .workspace-main.left-collapsed.right-collapsed{
    display:flex !important;
    flex-direction:row !important;
    width:100% !important;
    min-width:0 !important;
    min-height:0 !important;
    height:100% !important;
  }
  .workspace-main > .canvas-area{
    flex:1 1 100% !important;
    width:100% !important;
    height:100% !important;
  }
  .workspace-main > .left-drawer,
  .workspace-main > .right-drawer{
    position:absolute !important;
    top:0 !important;
    bottom:0 !important;
    height:100% !important;
    max-width:none !important;
    z-index:170 !important;
    flex:none !important;
  }
  .workspace-main > .left-drawer{inset-inline-start:0 !important;transform:translateX(0);}
  .workspace-main > .right-drawer{inset-inline-end:0 !important;transform:translateX(0);}
  .workspace-main.left-collapsed > .left-drawer{transform:translateX(-105%);}
  .workspace-main.right-collapsed > .right-drawer{transform:translateX(105%);}
  .workspace-main > .drawer-rail{display:grid !important;}
}
</style></head><body><header class="preview-nav"><strong>${escapeText(project.meta.name)}</strong><nav>${nav}</nav></header>${sections}${script}</body></html>`;
  }
  export(){const modal=showModal(this.host,{title:'تصدير المشروع',body:'<div class="list-stack"><div class="quality-item good">سيتم إنشاء ملف مستقل لكل صفحة، مع index.html للصفحة الرئيسية وروابط فعلية بين الصفحات.</div><button id="zip" class="primary-btn" type="button">تنزيل ZIP</button><button id="html" class="secondary-btn" type="button">تنزيل HTML للصفحة الحالية</button><button id="json" class="secondary-btn" type="button">تنزيل JSON</button></div>'});modal.querySelector('#zip').onclick=()=>exportZip(this.store.project);modal.querySelector('#html').onclick=()=>exportCurrentHtml(this.store.project);modal.querySelector('#json').onclick=()=>exportProjectJson(this.store.project);return modal}
  quality(){const audit=auditProject(this.store.project),errors=audit.issues?.length||0,warnings=audit.warnings?.length||0,infos=audit.info?.length||0,score=Math.max(0,Math.min(100,Number(audit.score)||0)),items=[...(audit.issues||[]),...(audit.warnings||[]),...(audit.info||[])];const body=`<div class="simple-manager-note"><b>ما الذي يفحصه بَنّاء؟</b><br>الصفحات، الروابط، الإعدادات الأساسية، وتجهيز الموقع للتصدير. ستجد الأخطاء أولًا ثم التنبيهات.</div><div class="audit-summary"><div class="audit-meter" style="--score:${score}"><span>${score}</span></div><div><b>${score>=90?'الموقع ممتاز':score>=70?'الموقع جيد ويحتاج لمسات':'الموقع يحتاج مراجعة'}</b><p style="margin:4px 0 7px;color:#747c8e;font-size:9px">${errors?`هناك ${errors} أخطاء تحتاج مراجعة.`:'لا توجد أخطاء أساسية.'}</p><div class="audit-counts"><span>أخطاء ${errors}</span><span>تنبيهات ${warnings}</span><span>معلومات ${infos}</span></div></div></div><div class="quality-list">${items.map(item=>`<article class="quality-item ${item.severity==='error'?'bad':item.severity==='warning'?'warn':'good'}"><b>${escapeText(item.title||'ملاحظة')}</b><small>${escapeText(item.detail||'')}</small></article>`).join('')||'<div class="quality-item good">✓ الموقع جاهز من ناحية الفحوصات الأساسية.</div>'}</div>`;return showModal(this.host,{title:'فحص جودة الموقع',body,wide:true})}
  theme(){const t=this.store.project.theme||{},tokens=t.tokens||{},colors=tokens.colors||{};const modal=showModal(this.host,{title:'الألوان والتصميم',body:`<div class="simple-manager-note"><b>غيّر الشكل من مكان واحد</b><br>اختر لونًا جاهزًا أو اكتب HEX. لا تحتاج إلى معرفة كلمات تقنية.</div><div class="color-grid-simple">${[['primary','اللون الأساسي',colors.primary||t.primary],['secondary','اللون الثانوي',colors.secondary||t.secondary],['accent','لون التمييز',colors.accent||t.accent],['text','لون النص',colors.text||t.text],['surface','خلفية البطاقات',colors.surface||t.surface],['muted','النص الهادئ',colors.muted||t.muted],['line','لون الحدود',colors.line||'#e4e7ef']].map(([k,l,v])=>`<div class="color-card-simple"><label>${l}</label><div class="simple-color-row"><input type="color" data-dcolor="${k}" value="${normalizeColor(v)}"><input type="text" data-dcolor-text="${k}" value="${escapeText(v||'')}"></div></div>`).join('')}</div><div class="color-actions-simple"><button id="themeAuto" type="button">🎨 ألوان متناسقة</button><button id="themeReset" type="button">↺ إعادة الألوان</button></div><div class="simple-section"><h4>عرض الموقع</h4><div class="field"><label>أقصى عرض للصفحة</label><input id="themeContainer" type="number" min="320" value="${Number(tokens.container||1180)}"></div><p>هذا العرض يؤثر على الصفحات التي تصممها وتصدرها.</p></div>`});const setColor=(key,val)=>{const safe=normalizeColor(val);const text=modal.querySelector(`[data-dcolor-text="${key}"]`),picker=modal.querySelector(`[data-dcolor="${key}"]`);if(text)text.value=safe;if(picker)picker.value=safe;this.store.transact('تحديث اللون العام',p=>{p.theme.tokens=p.theme.tokens||{};p.theme.tokens.colors={...(p.theme.tokens.colors||{}),[key]:safe};if(['primary','secondary','text','surface','accent'].includes(key))p.theme[key]=safe})};modal.querySelectorAll('[data-dcolor]').forEach(el=>el.addEventListener('input',()=>setColor(el.dataset.dcolor,el.value)));modal.querySelectorAll('[data-dcolor-text]').forEach(el=>el.addEventListener('change',()=>setColor(el.dataset.dcolorText,el.value)));modal.querySelector('#themeContainer')?.addEventListener('change',e=>this.store.transact('تغيير عرض الموقع',p=>{p.theme.tokens=p.theme.tokens||{};p.theme.tokens.container=Math.max(320,Math.min(1800,Number(e.target.value)||1180))}));modal.querySelector('#themeAuto')?.addEventListener('click',()=>{const base=normalizeColor(colors.primary||t.primary||'#5b5ce2');const rgb=hexToRgb(base),shift=(n)=>'#'+[rgb.r,rgb.g,rgb.b].map(v=>Math.max(0,Math.min(255,v+n)).toString(16).padStart(2,'0')).join('');const palette={primary:base,secondary:shift(-24),accent:shift(34),text:'#171b2a',surface:'#ffffff',muted:'#6d7588',line:'#e4e7ef'};this.store.transact('اقتراح ألوان متناسقة',p=>{p.theme.tokens=p.theme.tokens||{};p.theme.tokens.colors={...(p.theme.tokens.colors||{}),...palette};Object.assign(p.theme,{primary:palette.primary,secondary:palette.secondary,accent:palette.accent,text:palette.text,surface:palette.surface})});modal.remove();this.theme()});modal.querySelector('#themeReset')?.addEventListener('click',()=>{const palette={primary:'#5b5ce2',secondary:'#4b4cc7',accent:'#28a77b',text:'#171b2a',surface:'#ffffff',muted:'#6d7588',line:'#e4e7ef'};this.store.transact('إعادة الألوان',p=>{p.theme.tokens=p.theme.tokens||{};p.theme.tokens.colors={...(p.theme.tokens.colors||{}),...palette};Object.assign(p.theme,{primary:palette.primary,secondary:palette.secondary,accent:palette.accent,text:palette.text,surface:palette.surface})});modal.remove();this.theme()});return modal}
  shortcuts(){showModal(this.host,{title:'الاختصارات',body:'<div class="simple-manager-note"><b>أهم الاختصارات فقط</b><br>استخدمها لتسريع العمل. كلها اختيارية ويمكنك استخدام الأزرار بدلًا منها.</div><div class="shortcut-group"><div class="shortcut-row-simple"><span>حفظ المشروع</span><kbd>Ctrl / ⌘ + S</kbd></div><div class="shortcut-row-simple"><span>تراجع</span><kbd>Ctrl / ⌘ + Z</kbd></div><div class="shortcut-row-simple"><span>إعادة</span><kbd>Ctrl / ⌘ + Y</kbd></div><div class="shortcut-row-simple"><span>تكبير / تصغير</span><kbd>Ctrl / ⌘ + عجلة</kbd></div><div class="shortcut-row-simple"><span>ملاءمة شاشة التعديل</span><kbd>F</kbd></div><div class="shortcut-row-simple"><span>تحريك الشاشة</span><kbd>Space + سحب</kbd></div></div>'})}
  renameProject(){const name=prompt('اسم المشروع',this.store.project.meta.name);if(name?.trim())this.store.transact('تسمية المشروع',project=>project.meta.name=name.trim())}
}
const normalizeColor=value=>{const v=String(value||'').trim();if(/^#[0-9a-fA-F]{6}$/.test(v))return v.toLowerCase();if(/^#[0-9a-fA-F]{3}$/.test(v))return '#'+v.slice(1).split('').map(c=>c+c).join('').toLowerCase();return '#5b5ce2'};const hexToRgb=value=>{const v=normalizeColor(value).slice(1);return {r:parseInt(v.slice(0,2),16),g:parseInt(v.slice(2,4),16),b:parseInt(v.slice(4,6),16)}};
const escapeText=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
exports.Dialogs = Dialogs;
});
__modules.set("src/ui/inspector.js",(exports,__require)=>{
const {findNodeGlobal} = __require("src/core/model.js");
const {DEVICES,propagateStyle} = __require("src/engine/layout.js");
const {applyDevicePreset,deviceLabel} = __require("src/core/device-presets.js");
const {updateProps,updateStyle} = __require("src/core/commands.js");
const {showModal} = __require("src/ui/modal.js");
const {nodeHtml} = __require("src/engine/renderer.js");
const {listVariables} = __require("src/core/variables.js");
const {mixColors,gradientColors,contrastRatio,bestTextColor,hexToRgb} = __require("src/core/color-mixer.js");
const {findAsset,assetForNodeType} = __require("src/core/assets.js");
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const nativeHex=value=>{const v=String(value||'').trim();if(/^#[0-9a-f]{6}$/i.test(v))return v;if(/^#[0-9a-f]{3}$/i.test(v))return '#'+[...v.slice(1)].map(x=>x+x).join('');const m=v.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);if(m)return '#'+[m[1],m[2],m[3]].map(x=>Math.max(0,Math.min(255,Number(x))).toString(16).padStart(2,'0')).join('');return '#000000'};
const colorPalette=theme=>[theme?.primary,theme?.secondary,theme?.accent,theme?.surface,theme?.soft,theme?.text,theme?.muted,...Object.values(theme?.tokens?.colors||{}),'#ffffff','#000000','#ef4444','#f97316','#eab308','#22c55e','#06b6d4','#3b82f6','#8b5cf6','#ec4899'].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i);

const STYLE_KEYS=new Set(['color','background','fontSize','radius','marginTop','marginBottom','width','height','minHeight','maxWidth','gap','opacity','paddingY','paddingX']);
function mediaKindForNode(node){return assetForNodeType(node?.type||'')}
function mediaAccept(kind){return kind==='image'?'image/*':kind==='video'?'video/*':kind==='audio'?'audio/*':kind==='document'?'.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip':kind==='font'?'.woff,.woff2,.ttf,.otf':'image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.md,.json,.zip,.woff,.woff2,.ttf,.otf'}
function colorMixerHtml(){return `<div class="color-mixer-box"><div class="color-mixer-head"><div><b>مزج الألوان</b><small>امزج لونين، وشاهد النتيجة مباشرة.</small></div><span class="mix-result-swatch" data-mix-result></span></div><div class="color-mix-grid"><label class="field"><span>اللون الأول</span><div class="mix-color-input"><input type="color" id="mixA" value="#5B5CE2"><input id="mixAText" value="#5B5CE2"></div></label><label class="field"><span>اللون الثاني</span><div class="mix-color-input"><input type="color" id="mixB" value="#20A06A"><input id="mixBText" value="#20A06A"></div></label></div><div class="field"><label>نسبة المزج <output id="mixRatioOut">50%</output></label><input id="mixRatio" type="range" min="0" max="100" value="50"></div><div class="field"><label>طريقة المزج</label><select id="mixSpace"><option value="rgb">RGB — متوازن</option><option value="hsl">HSL — ناعم</option></select></div><div class="mix-preview-row"><div><small>النتيجة</small><b id="mixHex">#6D7E76</b></div><div><small>تباين مع الأبيض</small><b id="mixContrast">—</b></div><button type="button" class="secondary-btn" id="mixCopy">نسخ اللون</button></div><div class="field"><label>Gradient جاهز</label><div class="gradient-preview" data-gradient-preview></div><code data-gradient-value>linear-gradient(90deg, #5B5CE2 0%, #20A06A 100%)</code><div class="mix-action-row"><button type="button" class="secondary-btn" data-apply-gradient>استخدم الـGradient في الخلفية</button><button type="button" class="secondary-btn" data-save-mix>حفظ اللون في ألوان الموقع</button></div></div></div>`}
class Inspector{
  constructor(store){this.store=store;this.device='desktop';this.advanced=false}
  mount(el){this.el=el;this.el.__assetService=this.assetService;this.render()}
  setDevice(d){if(!DEVICES.includes(d))return;this.device=d;const id=this.store.ui.selected;const hit=id?findNodeGlobal(this.store.project,id):null;if(hit&&!hit.node.responsive?.[d])this.store.transact('تهيئة إعدادات الجهاز',project=>{const current=findNodeGlobal(project,id);if(current)applyDevicePreset(current.node,d,{onlyMissing:true})});this.render()}
  field(label,key,value,type='text'){return `<div class="field"><label>${label}</label><input data-key="${key}" data-type="${type}" value="${esc(value)}"></div>`}
  textareaField(label,key,value,placeholder=''){return `<div class="field"><label>${label}</label><textarea data-key="${key}" rows="6" placeholder="${esc(placeholder)}">${esc(value)}</textarea></div>`}
  multiAssetField(node,kind,label){
    const current=Array.isArray(node.props?.assetIds)?node.props.assetIds:[];const assets=this.store.project.assets.filter(a=>kind==='mixed'||a.kind===kind);const preview=current.length?`${current.length} ملف محدد`:'لم يتم اختيار ملفات بعد';
    const choices=assets.map(a=>`<label class="asset-choice"><input type="checkbox" data-media-item value="${esc(a.id)}" ${current.includes(a.id)?'checked':''}><span><b>${esc(a.name)}.${esc(a.extension||'bin')}</b><small>${esc(a.originalName||a.kind)} • ${esc(a.kind)}</small></span></label>`).join('');
    return `<section class="media-binding multi-media-binding"><div class="media-binding-head"><div><b>${esc(label)}</b><small data-media-count>${esc(preview)}</small></div><span class="asset-current-icon">${current.length||'＋'}</span></div><div class="asset-choice-grid">${choices||'<div class="asset-choice-empty">لا توجد ملفات من هذا النوع حتى الآن. استخدم زر الرفع أو افتح المكتبة.</div>'}</div><div class="media-binding-actions"><button type="button" class="primary-btn" data-media-upload-multi>＋ رفع ملفات متعددة</button><button type="button" class="secondary-btn" data-open-assets>اختيار من مكتبة الوسائط</button></div><small class="media-help">علّم على الملفات التي تريد عرضها. لا تحتاج إلى الضغط على Ctrl أو Cmd.</small></section>`
  }
  pageEmbedField(node){
    const props=node.props||{};const pages=this.store.project.pages||[];const target=pages.find(page=>page.id===props.pageId)||pages.find(page=>page.id!==this.store.project.activePageId)||pages[0];
    const pageOptions=pages.map(page=>`<option value="${esc(page.id)}" ${target?.id===page.id?'selected':''}>${esc(page.name)}</option>`).join('');
    const nodes=[];const visit=list=>(list||[]).forEach(item=>{nodes.push(item);visit(item.children)});if(target)visit(target.nodes);
    const nodeOptions=`<option value="">اختر القسم</option>`+nodes.map(item=>`<option value="${esc(item.id)}" ${props.nodeId===item.id?'selected':''}>${esc(item.props?.title||item.props?.text||item.type)} (${esc(item.type)})</option>`).join('');
    return `<section class="page-embed-settings"><div class="field"><label>الصفحة المطلوبة</label><select data-key="pageId" data-embed-page>${pageOptions}</select></div><div class="field"><label>ماذا تريد أن تعرض؟</label><select data-key="mode"><option value="full" ${(!props.mode||props.mode==='full')?'selected':''}>الصفحة كاملة</option><option value="section" ${props.mode==='section'?'selected':''}>قسم أو عنصر محدد</option><option value="text" ${props.mode==='text'?'selected':''}>النص فقط</option></select></div><div class="field"><label>القسم / العنصر (اختياري)</label><select data-key="nodeId">${nodeOptions}</select></div>${this.field('الحد الأقصى للنص','textLimit',props.textLimit??1800,'number')}<small>إذا كانت الصفحة تحتوي على إدراج متبادل، يوقف النظام الحلقة تلقائيًا لتجنب التعليق.</small></section>`;
  }

  colorField(label,key,value,theme,device){
    const hex=nativeHex(value);const palette=colorPalette(theme);const swatches=palette.map((c,i)=>`<button type="button" class="color-swatch" title="${esc(c)}" data-color-value="${esc(c)}" style="background:${esc(c)}"></button>`).join('');
    return `<div class="field color-field" data-color-key="${esc(key)}"><label>${esc(label)}</label><div class="color-control"><button type="button" class="color-preview" data-color-trigger data-color-key="${esc(key)}" title="اختيار لون" style="background:${esc(value||hex)}"><span></span></button><input type="color" data-color-native data-color-key="${esc(key)}" value="${hex}" aria-label="${esc(label)}"><input class="color-text" data-color-text data-color-key="${esc(key)}" value="${esc(value||'')}" placeholder="#5b5ce2 أو rgba(...)" spellcheck="false"><button type="button" class="color-action" data-color-transparent>شفاف</button><button type="button" class="color-action" data-color-eyedropper ${globalThis.EyeDropper?'':'disabled'}>◉</button><button type="button" class="color-action" data-color-mix>مزج</button></div><div class="color-swatches">${swatches}</div><small>اضغط مربع اللون للاختيار، أو اكتب HEX / RGB / RGBA. يمكنك اختيار لون جاهز أو قطّارة النظام.</small></div>`;
  }
  destinationField(node,props){const options=[`<option value="#" ${!props.url||props.url==='#'?'selected':''}>بدون وجهة</option>`,...this.store.project.pages.map(page=>`<option value="page:${page.id}" ${props.url===`page:${page.id}`?'selected':''}>صفحة: ${esc(page.name)}</option>`),`<option value="__external__" ${props.url&&/^https?:\/\//i.test(props.url)?'selected':''}>رابط خارجي</option>`].join('');const external=this.field('الرابط الخارجي','url',/^https?:\/\//i.test(props.url||'')?props.url:'');return `<div class="field"><label>الوجهة</label><select data-destination-for="${node.id}">${options}</select></div><div data-external-wrap="${node.id}" class="${props.url&&/^https?:\/\//i.test(props.url)?'':'hidden'}">${external}</div>`}
  semanticText(label,key,value){return `<div class="field"><label>${label}</label><input data-semantic-text="${key}" value="${esc(value)}"></div>`}
  semanticField(label,key,value,options){return `<div class="field"><label>${label}</label><select data-semantic-key="${key}">${options.map(([v,t])=>`<option value="${esc(v)}" ${String(value)===String(v)?'selected':''}>${t}</option>`).join('')}</select></div>`}
  layoutControl(label,key,value,options){return `<div class="field"><label>${label}</label><select data-layout-key="${key}">${options.map(([v,t])=>`<option value="${v}" ${String(value)===String(v)?'selected':''}>${t}</option>`).join('')}</select></div>`}
  mediaField(node){
    const kind=mediaKindForNode(node); if(!['image','video','audio','document','any','mixed','font','other'].includes(kind)) return '';
    const current=findAsset(this.store.project,node.props?.assetId); const assets=this.store.project.assets.filter(a=>kind==='any'||kind==='mixed'||a.kind===kind||(kind==='document'&&a.kind==='other')); const preview=current?(current.kind==='image'?`<img src="${esc(current.data)}" alt="${esc(current.alt||current.name)}">`:current.kind==='video'?`<span class="asset-current-icon">▶ VIDEO</span>`:current.kind==='audio'?`<span class="asset-current-icon">♫ AUDIO</span>`:`<span class="asset-current-icon">${esc((current.extension||'FILE').toUpperCase())}</span>`):'<span class="asset-current-icon">＋</span>';
    return `<section class="media-binding" data-media-kind="${kind}"><div class="media-binding-head"><div><b>الملف المرتبط</b><small>${current?`مرتبط بـ ${esc(current.name)} • ${esc(current.originalName)}`:'لم يتم اختيار ملف بعد'}</small></div><span class="asset-current-preview">${preview}</span></div><div class="media-binding-actions"><select data-media-select><option value="">${current?'تغيير الملف…':'اختر من المكتبة…'}</option>${assets.map(a=>`<option value="${esc(a.id)}" ${current?.id===a.id?'selected':''}>${esc(a.name)}.${esc(a.extension||'bin')} — ${esc(a.originalName)}</option>`).join('')}</select><button type="button" class="secondary-btn" data-media-upload>رفع من الجهاز</button><button type="button" class="secondary-btn" data-open-assets>فتح المكتبة</button></div><small class="media-help">الملف يُحفظ في مكتبة المشروع، ويمكن استخدامه في أكثر من عنصر.</small></section>`;
  }
  render(){
    if(!this.el)return;const id=this.store.ui.selected,hit=id?findNodeGlobal(this.store.project,id):null;if(!hit){this.el.classList.add('hidden');document.getElementById('inspectorEmpty').classList.remove('hidden');return}document.getElementById('inspectorEmpty').classList.add('hidden');this.el.classList.remove('hidden');
    const n=hit.node,p=n.props||{},s={...(n.style||{}),...(n.responsive?.[this.device]||{})},layout=n.layout||{};let content='';
    if(['heading','text','quote','badge','alert','button','link','marquee','gradient','glass'].includes(n.type))content+=this.field('النص','text',p.text||'');
    if(['button','link'].includes(n.type))content+=this.destinationField(n,p);
    if(n.type==='image')content+=this.mediaField(n)+this.field('الوصف البديل','alt',p.alt||'');
    if(['video','video-card','audio','download','document-viewer','file-card','avatar','logo','image-text'].includes(n.type))content+=this.mediaField(n);
    if(n.type==='gallery'||n.type==='image-carousel')content+=this.multiAssetField(n,'image','صور المعرض');
    if(n.type==='media-grid')content+=this.multiAssetField(n,'mixed','الوسائط المعروضة');
    if(n.type==='video-gallery')content+=this.multiAssetField(n,'video','مقاطع الفيديو');
    if(n.type==='audio-playlist')content+=this.multiAssetField(n,'audio','الملفات الصوتية');
    if(['gallery','media-grid','video-gallery'].includes(n.type))content+=this.field('عدد الأعمدة','columns',p.columns??(n.type==='gallery'?3:2),'number');
    if(n.type==='gallery')content+=this.field('عدد الصور الافتراضي','count',p.count??6,'number');
    if(['video-gallery','audio-playlist'].includes(n.type))content+=this.field('عنوان المجموعة','title',p.title||'');
    if(['document-viewer','file-card'].includes(n.type))content+=this.field('العنوان','title',p.title||'')+this.field('النص المساعد','text',p.text||'')+(n.type==='document-viewer'?this.field('ارتفاع العارض','height',p.height??640,'number'):this.field('نص الزر','button',p.button||''));
    if(n.type==='video-card')content+=this.field('عنوان الفيديو','title',p.title||'فيديو')+this.field('المدة','duration',p.duration||'');
    if(n.type==='page-embed')content+=this.pageEmbedField(n);
    if(n.type==='html-snippet')content+=this.textareaField('محتوى HTML (آمن)','html',p.html||'','اكتب فقرة أو عناوين أو جدولًا بسيطًا…')+'<div class="tips-card">تُحذف تلقائيًا السكربتات والروابط الخطرة والـiframe داخل هذا العنصر.</div>';
    if(n.type==='card')content+=this.field('العنوان','title',p.title||'')+this.field('الوصف','text',p.text||'')+this.field('نص الزر','button',p.button||'')+this.destinationField(n,p);
    if(n.type==='product')content+=this.field('الاسم','name',p.name||'')+this.field('السعر','price',p.price||'')+this.field('العملة','currency',p.currency||'')+this.destinationField(n,p);
    if(['input','textarea','select','search','file'].includes(n.type))content+=this.field('عنوان الحقل','label',p.label||'')+this.field('النص المساعد','placeholder',p.placeholder||'');
    if(n.type==='faq')content+=this.field('السؤال','question',p.question||'')+this.field('الإجابة','answer',p.answer||'');
    if(n.type==='navbar')content+=this.field('العلامة','brand',p.brand||'');
    if(n.type==='collection-list'){const opts=[`<option value="">اختر مجموعة…</option>`,...(this.store.project.cms?.collections||[]).map(c=>`<option value="${esc(c.id)}" ${p.collectionId===c.id?'selected':''}>${esc(c.name)}</option>`)].join('');content+=`<div class="field"><label>مجموعة CMS</label><select data-cms-collection="${n.id}">${opts}</select></div>`+this.field('عدد العناصر','limit',p.limit??6,'number')}
    const variables=listVariables(this.store.project);
    const boundTypes=new Set(['heading','text','button','link','image','card','product']);
    if(boundTypes.has(n.type)){content+=`<div class="field"><label>ربط محتوى بمتغير</label><select data-variable-bind><option value="">بدون</option>${variables.map(v=>`<option value="${esc(v.key)}" ${p.bindingVariable===v.key?'selected':''}>${esc(v.name)}</option>`).join('')}</select></div>`}
    if(n.type==='symbol-instance')content+=`<div class="tips-card"><b>مكون مشترك</b><p>تستخدم هذه النسخة تعريفًا مشتركًا. عدّل الأصل لتطبيق التغييرات على كل النسخ.</p></div>`;
    const classOptions=Object.keys(this.store.project.styleLibrary?.classes||{});const textStyleOptions=Object.keys(this.store.project.styleLibrary?.textStyles||{});const libraryPanel=`<div class="field-row"><div class="field"><label>Text Style</label><select data-style-library-text><option value="">بدون</option>${textStyleOptions.map(name=>`<option value="${esc(name)}" ${p.textStyle===name?'selected':''}>${esc(name)}</option>`).join('')}</select></div><div class="field"><label>Effect / State</label><select data-style-library-effect><option value="">بدون</option>${Object.keys(this.store.project.styleLibrary?.effects||{}).map(name=>`<option value="${esc(name)}" ${p.effect===name?'selected':''}>${esc(name)}</option>`).join('')}</select></div></div><div class="class-chips">${classOptions.length?classOptions.map(name=>`<button type="button" data-class-toggle="${esc(name)}" class="${(n.classes||[]).includes(name)?'active':''}">.${esc(name)}</button>`).join(''):'<small>أنشئ Classes من Design System لإعادة استخدامها.</small>'}</div>`;const semantic=`<div class="field-row">${this.semanticField('وسم HTML','tag',n.semantic?.tag||'div',[['div','div'],['section','section'],['header','header'],['main','main'],['nav','nav'],['article','article'],['aside','aside'],['footer','footer'],['button','button']])}${this.semanticField('الدور ARIA','role',n.semantic?.role||'', [['','افتراضي'],['banner','banner'],['navigation','navigation'],['main','main'],['contentinfo','contentinfo'],['article','article'],['region','region']])}</div>${this.semanticText('اسم ARIA','ariaLabel',n.semantic?.ariaLabel||'')}<div class="field"><label>Classes</label><input data-class-list value="${esc((n.classes||[]).join(', '))}"><small>افصل بين أسماء الكلاسات بفاصلة.</small></div>${libraryPanel}`;
    if(!content)content=this.field('اسم وصفي','label',p.label||'');
    const style=this.colorField('لون النص','color',s.color||'',this.store.project.theme,this.device)+this.colorField('الخلفية','background',s.background||'',this.store.project.theme,this.device)+`<div class="field-row">${this.field('حجم النص','fontSize',s.fontSize??'','number')}${this.field('الاستدارة','radius',s.radius??'','number')}</div><div class="field-row">${this.field('هامش أعلى','marginTop',s.marginTop??0,'number')}${this.field('هامش أسفل','marginBottom',s.marginBottom??14,'number')}</div>`;
    const structure=`<div class="field-row">${this.layoutControl('العرض', 'display', layout.display||'block', [['block','Block'],['flex','Flex'],['grid','Grid']])}${this.layoutControl('اتجاه', 'direction', layout.direction||'column', [['column','عمودي'],['row','أفقي']])}</div><div class="field-row">${this.layoutControl('المحاذاة','align',layout.align||'stretch',[['stretch','Stretch'],['start','Start'],['center','Center'],['end','End']])}${this.layoutControl('التوزيع','justify',layout.justify||'start',[['start','Start'],['center','Center'],['between','Between'],['end','End']])}</div><div class="field-row">${this.field('الفجوة','gap',s.gap??layout.gap??0,'number')}${this.layoutControl('التفاف','wrap',layout.wrap?'1':'0',[['0','لا'],['1','نعم']])}</div>`;
    const visibility=`<div class="visibility-grid">${DEVICES.map(d=>`<label><input type="checkbox" data-visibility-device="${d}" ${n.visibility?.[d]!==false?'checked':''}>${d}</label>`).join('')}</div>`;
    const createdLabel=n.device?.created?deviceLabel(n.device.created):'قبل تحديد الجهاز';
    this.el.innerHTML=`<div class="device-context"><b>المعاينة الآن: ${esc(deviceLabel(this.device))}</b><small>تمت تهيئة العنصر عند إنشائه على: ${esc(createdLabel)} • يمكنك تخصيص كل جهاز بشكل مستقل.</small></div><section class="inspector-section"><header><b>المحتوى</b><span>${n.type}</span></header><div class="inspector-body">${content}</div></section><section class="inspector-section"><header><b>المظهر</b><span>${this.device}</span></header><div class="inspector-body">${style}</div></section><section class="inspector-section"><header><b>البنية</b><span>Layout</span></header><div class="inspector-body">${structure}</div></section><section class="inspector-section"><header><b>Responsive</b><span>إظهار العنصر</span></header><div class="inspector-body">${visibility}<div class="segmented">${DEVICES.map(d=>`<button data-device="${d}" class="${d===this.device?'active':''}">${d}</button>`).join('')}</div><label class="sync-row"><span>مزامنة نسبية</span><input id="propagate" type="checkbox" ${this.store.project.settings.propagateDevices?'checked':''}></label></div></section><button id="toggleAdvanced" class="advanced-toggle">${this.advanced?'إخفاء التخصيص المتقدم':'التخصيص المتقدم'}</button>${this.advanced?`<section class="inspector-section"><div class="inspector-body">${this.field('العرض','width',s.width??'')}${this.field('الحد الأقصى','maxWidth',s.maxWidth??'')}${this.field('الارتفاع','height',s.height??'','number')}${this.field('الارتفاع الأدنى','minHeight',s.minHeight??'','number')}${this.field('العتامة','opacity',s.opacity??1,'number')}</div></section>`:''}${this.store.ui.mode==='trainee'?'<button id="codeBtn" class="advanced-toggle">&lt;/&gt; كود العنصر</button>':''}`;
    this.wire(n.id);
  }
  openColorMixer(fieldKey,wrap){
    const base=wrap.querySelector('[data-color-text]')?.value||'#5B5CE2';
    const body=colorMixerHtml(); const modal=showModal(document.getElementById('modalHost'),{title:'مزج الألوان',body,wide:true,actions:[{label:'إلغاء'},{label:'تطبيق النتيجة',kind:'primary',onClick:()=>{const color=modal.querySelector('#mixHex')?.textContent?.trim();if(color) {const input=wrap.querySelector('[data-color-text]');if(input){input.value=color;input.dispatchEvent(new Event('change',{bubbles:true}))}}modal.remove()}}]});
    const a=modal.querySelector('#mixA'),b=modal.querySelector('#mixB'),at=modal.querySelector('#mixAText'),bt=modal.querySelector('#mixBText'),ratio=modal.querySelector('#mixRatio'),space=modal.querySelector('#mixSpace');a.value=/^#[0-9a-f]{6}$/i.test(base)?base:'#5B5CE2';at.value=a.value;
    const update=()=>{const c=mixColors(at.value,bt.value,Number(ratio.value)/100,space.value)||'#000000';modal.querySelector('[data-mix-result]').style.background=c;modal.querySelector('#mixHex').textContent=c;modal.querySelector('#mixRatioOut').textContent=`${ratio.value}%`;const cr=contrastRatio(c,'#FFFFFF');modal.querySelector('#mixContrast').textContent=`${cr.toFixed(2)}:1`;const grad=gradientColors([{color:at.value,position:0},{color:bt.value,position:100}],90);modal.querySelector('[data-gradient-preview]').style.background=grad;modal.querySelector('[data-gradient-value]').textContent=grad};
    modal.querySelector('[data-apply-gradient]')?.addEventListener('click',()=>{const grad=modal.querySelector('[data-gradient-value]')?.textContent||'';if(fieldKey==='background'&&grad){const input=wrap.querySelector('[data-color-text]');if(input){input.value=grad;input.dispatchEvent(new Event('change',{bubbles:true}))}modal.remove()}});
    modal.querySelector('[data-save-mix]')?.addEventListener('click',()=>{const color=modal.querySelector('#mixHex')?.textContent?.trim();if(!color)return;this.store.transact('حفظ لون ممزوج',project=>{project.theme.tokens=project.theme.tokens||{};project.theme.tokens.colors={...(project.theme.tokens.colors||{})};let n=1;while(project.theme.tokens.colors[`mix${n}`]&&n<999)n++;project.theme.tokens.colors[`mix${n}`]=color});this.render();modal.remove()});
    a.oninput=()=>{at.value=a.value.toUpperCase();update()};b.oninput=()=>{bt.value=b.value.toUpperCase();update()};at.onchange=()=>{const v=/^#[0-9a-f]{6}$/i.test(at.value)?at.value:'#5B5CE2';at.value=v.toUpperCase();a.value=v;update()};bt.onchange=()=>{const v=/^#[0-9a-f]{6}$/i.test(bt.value)?bt.value:'#20A06A';bt.value=v.toUpperCase();b.value=v;update()};ratio.oninput=update;space.onchange=update;modal.querySelector('#mixCopy')?.addEventListener('click',()=>navigator.clipboard?.writeText(modal.querySelector('#mixHex').textContent||''));update();
  }

  wire(id){
    for(const input of this.el.querySelectorAll('[data-key]'))input.addEventListener('change',()=>{const key=input.dataset.key,type=input.dataset.type;let value=input.value;if(type==='number')value=value===''?0:Number(value);if(STYLE_KEYS.has(key)){updateStyle(this.store,id,{[key]:value},this.device);if(this.store.project.settings.propagateDevices)propagateStyle(findNodeGlobal(this.store.project,id)?.node,this.device,{[key]:value})}else updateProps(this.store,id,{[key]:value})});
    this.el.querySelector('[data-class-list]')?.addEventListener('change',event=>{const classes=[...new Set(String(event.target.value||'').split(',').map(x=>x.trim()).filter(Boolean))];updateProps(this.store,id,{classes})});
    this.el.querySelectorAll('[data-class-toggle]').forEach(button=>button.addEventListener('click',()=>{const name=button.dataset.classToggle;this.store.transact('تبديل Class',project=>{const hit=findNodeGlobal(project,id);if(!hit)return;const classes=new Set(hit.node.classes||[]);classes.has(name)?classes.delete(name):classes.add(name);hit.node.classes=[...classes]})}));
    this.el.querySelector('[data-style-library-text]')?.addEventListener('change',event=>updateProps(this.store,id,{textStyle:event.target.value}));
    this.el.querySelector('[data-style-library-effect]')?.addEventListener('change',event=>updateProps(this.store,id,{effect:event.target.value}));
    this.el.querySelectorAll('[data-semantic-text]').forEach(input=>input.addEventListener('change',()=>{const key=input.dataset.semanticText;this.store.transact('تعديل الدلالة والوصول',project=>{const hit=findNodeGlobal(project,id);if(!hit)return;hit.node.semantic={tag:'div',role:'',ariaLabel:'',...(hit.node.semantic||{}),[key]:input.value}})}));
    this.el.querySelectorAll('[data-semantic-key]').forEach(select=>select.addEventListener('change',()=>{const key=select.dataset.semanticKey;this.store.transact('تعديل الدلالة والوصول',project=>{const hit=findNodeGlobal(project,id);if(!hit)return;hit.node.semantic={tag:'div',role:'',ariaLabel:'',...(hit.node.semantic||{}),[key]:select.value}})}));
    this.el.querySelector('[data-variable-bind]')?.addEventListener('change',event=>updateProps(this.store,id,{bindingVariable:event.target.value}));
    this.el.querySelector('[data-media-select]')?.addEventListener('change',event=>{const assetId=event.target.value;if(assetId&&this.el.__assetService){this.el.__assetService.assignToNode(id,assetId);this.render()}});
    this.el.querySelector('[data-media-upload]')?.addEventListener('click',()=>{const input=document.createElement('input');input.type='file';input.accept=mediaAccept(mediaKindForNode(n));input.multiple=false;input.onchange=async()=>{const file=input.files?.[0];if(!file||!this.el.__assetService)return;try{const asset=await this.el.__assetService.addFile(file,{purpose:mediaKindForNode(n),attachTo:id,alt:file.name.replace(/\.[^.]+$/,'')});if(asset){this.render();this.store.setUI({selected:id})}}catch(error){globalThis.__BUNAA_APP?.toast?.(error.message||'تعذر رفع الملف')}};input.click()});
    this.el.querySelectorAll('[data-media-item]').forEach(control=>control.addEventListener('change',()=>{const selected=[...this.el.querySelectorAll('[data-media-item]:checked')].map(input=>input.value);this.el.__assetService?.assignMany(id,selected);const count=this.el.querySelector('[data-media-count]');if(count)count.textContent=selected.length?`${selected.length} ملف محدد`:'لم يتم اختيار ملفات بعد';const badge=this.el.querySelector('.asset-current-icon');if(badge)badge.textContent=selected.length||'＋';}));
    this.el.querySelector('[data-media-upload-multi]')?.addEventListener('click',()=>{const kind=mediaKindForNode(n);const input=document.createElement('input');input.type='file';input.accept=mediaAccept(kind);input.multiple=true;input.onchange=async()=>{try{const added=[];for(const file of [...(input.files||[])]){const asset=await this.el.__assetService?.addFile(file,{purpose:kind,alt:file.name.replace(/\.[^.]+$/,'')});if(asset)added.push(asset.id)}if(added.length){this.el.__assetService?.assignMany(id,[...(n.props?.assetIds||[]),...added]);this.render();this.store.setUI({selected:id})}}catch(error){globalThis.__BUNAA_APP?.toast?.(error.message||'تعذر رفع الملفات')}};input.click()});
    this.el.querySelector('[data-open-assets]')?.addEventListener('click',()=>document.getElementById('openAssetsBtn')?.click());
    this.el.querySelector('[data-embed-page]')?.addEventListener('change',()=>setTimeout(()=>this.render(),0));

    this.el.querySelectorAll('[data-cms-collection]').forEach(select=>select.addEventListener('change',()=>updateProps(this.store,id,{collectionId:select.value})));
    this.el.querySelectorAll('[data-destination-for]').forEach(select=>select.addEventListener('change',()=>{const value=select.value;if(value==='__external__'){const current=this.store.find(id)?.node?.props?.url||'';updateProps(this.store,id,{url:/^https?:\/\//i.test(current)?current:'https://'});this.el.querySelector(`[data-external-wrap="${id}"]`)?.classList.remove('hidden')}else{updateProps(this.store,id,{url:value});this.el.querySelector(`[data-external-wrap="${id}"]`)?.classList.add('hidden')}}));

    const applyColor=(key,value)=>{updateStyle(this.store,id,{[key]:value},this.device);if(this.store.project.settings.propagateDevices)propagateStyle(findNodeGlobal(this.store.project,id)?.node,this.device,{[key]:value});};
    this.el.querySelectorAll('.color-field').forEach(wrap=>{
      const text=wrap.querySelector('[data-color-text]'),native=wrap.querySelector('[data-color-native]'),preview=wrap.querySelector('[data-color-trigger]');
      const fieldKey=wrap.dataset.colorKey||text?.dataset?.colorKey||native?.dataset?.colorKey||preview?.dataset?.colorKey||'color';
      const sync=value=>{if(text)text.value=value;if(native&&/^#[0-9a-f]{6}$/i.test(nativeHex(value)))native.value=nativeHex(value);if(preview)preview.style.background=value||nativeHex(value)};
      native?.addEventListener('input',e=>{sync(e.target.value);applyColor(fieldKey,e.target.value)});
      text?.addEventListener('change',e=>{const value=String(e.target.value||'').trim();sync(value);applyColor(fieldKey,value)});
      preview?.addEventListener('click',()=>native?.click());
      wrap.querySelector('[data-color-transparent]')?.addEventListener('click',()=>{sync('transparent');applyColor(fieldKey,'transparent')});
      wrap.querySelectorAll('[data-color-value]').forEach(b=>b.addEventListener('click',()=>{const value=b.dataset.colorValue;sync(value);applyColor(fieldKey,value)}));
      wrap.querySelector('[data-color-eyedropper]')?.addEventListener('click',async()=>{if(!globalThis.EyeDropper)return;try{const result=await new EyeDropper().open();if(result?.sRGBHex){sync(result.sRGBHex);applyColor(fieldKey,result.sRGBHex)}}catch{}});
      wrap.querySelector('[data-color-mix]')?.addEventListener('click',()=>this.openColorMixer(fieldKey,wrap));

    });
    this.el.querySelectorAll('[data-device]').forEach(b=>b.onclick=()=>this.setDevice(b.dataset.device));
    this.el.querySelectorAll('[data-layout-key]').forEach(select=>select.addEventListener('change',()=>{const key=select.dataset.layoutKey;const value=key==='wrap'?select.value==='1':select.value;this.store.transact('تعديل بنية العنصر',p=>{const hit=findNodeGlobal(p,id);if(hit)hit.node.layout={...(hit.node.layout||{}),[key]:value}})}));
    this.el.querySelectorAll('[data-visibility-device]').forEach(input=>input.addEventListener('change',()=>this.store.transact('تعديل الظهور responsive',p=>{const hit=findNodeGlobal(p,id);if(hit)hit.node.visibility={...(hit.node.visibility||{}),[input.dataset.visibilityDevice]:input.checked}})));
    this.el.querySelector('#propagate')?.addEventListener('change',e=>this.store.transact('إعداد مزامنة',p=>p.settings.propagateDevices=e.target.checked));this.el.querySelector('#toggleAdvanced')?.addEventListener('click',()=>{this.advanced=!this.advanced;this.render()});
    this.el.querySelector('#codeBtn')?.addEventListener('click',()=>{const hit=this.store.find(id);if(hit)showModal(document.getElementById('modalHost'),{title:'كود العنصر',body:`<div class="field"><textarea readonly style="height:260px">${esc(nodeHtml(hit.node,this.store.project.theme,this.store.project,this.device))}</textarea></div>`})});
  }
}
exports.Inspector = Inspector;
});
__modules.set("src/ui/modal.js",(exports,__require)=>{
function showModal(host,{title,body,actions=[],wide=false}={}){const overlay=document.createElement('div');overlay.className='modal-overlay';const card=document.createElement('div');card.className=`modal-card${wide?' preview-card':''}`;const head=document.createElement('div');head.className='modal-head';const titleBox=document.createElement('div');titleBox.innerHTML=`<span class="eyebrow">بَنّاء</span><h3>${title||''}</h3>`;const close=document.createElement('button');close.className='close-btn';close.textContent='×';head.append(titleBox,close);const content=document.createElement('div');content.className='modal-body';content.innerHTML=body||'';const footer=document.createElement('div');footer.className='modal-actions';actions.forEach((a,i)=>{const b=document.createElement('button');b.className=a.kind==='primary'?'primary-btn':'secondary-btn';b.textContent=a.label;b.dataset.action=String(i);footer.appendChild(b)});card.append(head,content,footer);overlay.appendChild(card);host.appendChild(overlay);const remove=()=>overlay.remove();close.onclick=remove;overlay.onclick=e=>{if(e.target===overlay)remove();const b=e.target.closest('[data-action]');if(b)actions[Number(b.dataset.action)]?.onClick?.();};return overlay}
const closeAll=host=>host.replaceChildren();
exports.showModal = showModal;
exports.closeAll = closeAll;
});
__modules.set("src/ui/panels.js",(exports,__require)=>{
const {categories,searchDefinitions,nodeIcon} = __require("src/catalog/components.js");
const {templates,materializeTemplate} = __require("src/catalog/templates.js");
const {sections,materializeSection} = __require("src/catalog/sections.js");
const {addNode,removeNode,duplicateNode,moveNode,setPageName} = __require("src/core/commands.js");
const {triggers,actions,motions,makeInteraction,makeStep,upsertInteraction,removeInteraction,interactionsFor,triggerLabel,actionLabel,interactionCapabilities,normalizeInteraction} = __require("src/engine/interaction.js");
const {findNodeGlobal,walk} = __require("src/core/model.js");
const {dataUrlFromFile,escapeHtml,formatBytes} = __require("src/core/utils.js");
const {insertSymbol} = __require("src/core/symbols.js");
const {showModal} = __require("src/ui/modal.js");
const {assetForNodeType} = __require("src/core/assets.js");
const {applyDevicePresetTree,initializeDevicePresetsTree,deviceLabel} = __require("src/core/device-presets.js");
class Panels{constructor(store){this.store=store;this.engine=null;this.category='all';this.search='';this.currentTab='elements'}
mount(){document.querySelectorAll('[data-left-tab]').forEach(b=>b.addEventListener('click',()=>this.setTab(b.dataset.leftTab)));document.getElementById('elementSearch')?.addEventListener('input',e=>{this.search=e.target.value;this.renderLibrary()});document.getElementById('categoryTabs')?.addEventListener('click',e=>{const b=e.target.closest('[data-cat]');if(b){this.category=b.dataset.cat;this.renderLibrary()}});document.getElementById('openTemplatesBtn')?.addEventListener('click',()=>this.templatesModal());document.getElementById('openSectionsBtn')?.addEventListener('click',()=>this.sectionsModal());document.getElementById('openAssetsBtn')?.addEventListener('click',()=>this.assetsModal())}
setTab(tab){this.currentTab=tab;this.store.setUI({leftTab:tab},{emit:false});document.querySelectorAll('.drawer-tab').forEach(b=>b.classList.toggle('active',b.dataset.leftTab===tab));for(const id of ['elements','layers','interaction'])document.getElementById(`${id}View`)?.classList.toggle('hidden',id!==tab);if(tab==='elements')this.renderLibrary();if(tab==='layers')this.renderLayers();if(tab==='interaction')this.renderInteractions()}
renderLibrary(){const cat=document.getElementById('categoryTabs');cat.innerHTML=categories.map(([id,label])=>`<button class="category-chip ${id===this.category?'active':''}" data-cat="${id}">${label}</button>`).join('');const grid=document.getElementById('elementLibrary');const elements=searchDefinitions(this.search,this.category).map(d=>`<div class="element-card" draggable="true" data-type="${d.type}"><div class="element-thumb">${d.icon}</div><b>${d.label}</b><small>${d.description}</small><button class="add-element" data-add="${d.type}">إضافة لـ${deviceLabel(this.store.ui.device)}</button></div>`).join('');const symbols=(this.store.project.symbols?.definitions||[]).map(s=>`<div class="element-card symbol-card" data-symbol="${escapeHtml(s.id)}"><div class="element-thumb">◈</div><b>${escapeHtml(s.name)}</b><small>مكون مشترك • إصدار ${s.version||1}</small><button class="add-element" data-insert-symbol="${escapeHtml(s.id)}">إدراج</button></div>`).join('');grid.innerHTML=elements+(symbols?`<div class="library-section-title">المكونات المشتركة</div>${symbols}`:'');grid.onclick=e=>{const b=e.target.closest('[data-add]');if(b)this.engine.addElement(b.dataset.add);const symbol=e.target.closest('[data-insert-symbol]');if(symbol){insertSymbol(this.store,symbol.dataset.insertSymbol);this.engine.sync();this.renderLayers()}};grid.ondragstart=e=>{const c=e.target.closest('[data-type]');if(c)e.dataTransfer.setData('application/bunaa-type',c.dataset.type)}}
renderLayers(){const page=this.store.activePage();const tree=document.getElementById('layerTree');tree.innerHTML=(page?.nodes||[]).map(n=>this.layerHtml(n,0)).join('')||'<div class="tips-card">لا توجد عناصر.</div>';tree.querySelectorAll('[data-select-layer]').forEach(b=>b.addEventListener('click',()=>this.store.setUI({selected:b.dataset.selectLayer})));tree.querySelectorAll('[data-layer-action]').forEach(b=>b.addEventListener('click',()=>{const a=b.dataset.layerAction,id=b.dataset.id;if(a==='up'||a==='down')moveNode(this.store,id,a);else if(a==='duplicate')duplicateNode(this.store,id);else if(a==='delete')removeNode(this.store,id);this.renderLayers()}))}
layerHtml(n,depth){const label=escapeHtml(n.props?.label||n.props?.title||n.props?.text||n.type);return `<div class="layer-row ${n.id===this.store.ui.selected?'selected':''}" style="margin-right:${depth*12}px"><span class="layer-icon">${nodeIcon(n.type)}</span><button class="layer-name" data-select-layer="${n.id}">${label}<small>${n.type}</small></button><span class="layer-actions"><button data-layer-action="up" data-id="${n.id}">↑</button><button data-layer-action="down" data-id="${n.id}">↓</button><button data-layer-action="duplicate" data-id="${n.id}">＋</button><button data-layer-action="delete" data-id="${n.id}">×</button></span></div>${(n.children||[]).map(c=>this.layerHtml(c,depth+1)).join('')}`}
renderInteractions(){
  const box=document.getElementById('interactionPanel');
  const id=this.store.ui.selected;
  const hit=id?findNodeGlobal(this.store.project,id):null;
  if(!hit){box.innerHTML='<div class="tips-card"><b>حدد عنصرًا أولًا</b><p>ثم أضف تفاعلًا. لكل نوع عنصر اقتراحات مختلفة.</p></div>';return}
  const node=hit.node;
  const list=interactionsFor(this.store.project,id);
  const caps=interactionCapabilities(node.type);
  const suggestedTriggers=caps.triggers||[];
  const targetOptions=this.interactionTargets();
  const presets=this.interactionPresets(node);
  box.innerHTML=`
    <div class="selected-target"><b>التفاعل: ${escapeHtml(node.props?.label||node.props?.title||node.props?.text||node.type)}</b><small>${escapeHtml(this.interactionDescription(node.type))}</small></div>
    <div class="interaction-toolbar"><button class="primary-btn" id="newInteractionBtn">＋ تفاعل جديد</button><button class="secondary-btn" id="interactionModeBtn">${this.store.ui.interactionMode?'■ إيقاف التجربة':'▶ تجربة التفاعلات'}</button></div>
    <section class="interaction-presets"><div class="mini-section-title"><b>اقتراحات لهذا العنصر</b><small>جاهزة بنقرة واحدة وتقدر تعدلها.</small></div>${presets.map((x,i)=>`<button class="interaction-preset" data-int-preset="${i}"><strong>${escapeHtml(x.label)}</strong><small>${escapeHtml(x.description)}</small></button>`).join('')}</section>
    <section class="interaction-current"><div class="mini-section-title"><b>التفاعلات الحالية</b><small>${list.length} تفاعل</small></div>
      ${list.length?list.map((item,index)=>`<article class="interaction-item ${item.enabled===false?'disabled':''}"><div class="interaction-item-main"><span class="interaction-badge">${index+1}</span><div><b>${escapeHtml(triggerLabel(item.trigger))}</b><small>${item.steps.length} إجراء • ${item.once?'مرة واحدة':'متكرر'}${item.condition?.type&&item.condition.type!=='always'?' • شرط':''}</small></div></div><div class="interaction-item-actions"><button data-int-toggle="${item.id}" title="تفعيل/تعطيل">${item.enabled===false?'○':'●'}</button><button data-int-edit="${item.id}">تعديل</button><button data-int-copy="${item.id}">نسخ</button><button data-remove-int="${item.id}" class="danger-btn">×</button></div></article>`).join(''):'<div class="tips-card">لا توجد تفاعلات بعد. ابدأ باقتراح جاهز أو اضغط «تفاعل جديد».</div>'}
    </section>
    <details class="interaction-help"><summary>ما الذي يمكنني فعله؟</summary><p>أحداث كثيرة + أكثر من إجراء داخل التفاعل نفسه + شروط + تأخير + أهداف مختلفة. مثال: عند الضغط ← أضف Class ← انتظر 300ms ← أظهر بطاقة ← اعرض رسالة.</p></details>`;
  box.querySelector('#interactionModeBtn')?.addEventListener('click',()=>{this.store.setUI({interactionMode:!this.store.ui.interactionMode});this.engine.sync();this.renderInteractions()});
  box.querySelector('#newInteractionBtn')?.addEventListener('click',()=>this.interactionModal(id));
  box.querySelectorAll('[data-int-preset]').forEach(b=>b.addEventListener('click',()=>{const preset=presets[Number(b.dataset.intPreset)];if(!preset)return;const interaction=makeInteraction(id,preset.trigger,preset.steps?.[0]?.action||'motion',preset.steps?.[0]?.options||{});interaction.steps=preset.steps.map(step=>makeStep(step.action,step.options||{}));interaction.steps.forEach((step,i)=>{step.id=i===0?interaction.steps[0].id:step.id;step.delay=Number(preset.steps[i]?.delay)||0});interaction.action=interaction.steps[0].action;interaction.options=interaction.steps[0].options;this.store.transact('إضافة تفاعل جاهز',project=>upsertInteraction(project,interaction));this.store.setUI({interactionMode:true});this.engine.sync();this.renderInteractions()}));
  box.querySelectorAll('[data-int-toggle]').forEach(b=>b.addEventListener('click',()=>{this.store.transact('تفعيل أو تعطيل تفاعل',project=>{const item=project.interactions?.find(x=>x.id===b.dataset.intToggle);if(item)item.enabled=item.enabled===false});this.engine.sync();this.renderInteractions()}));
  box.querySelectorAll('[data-int-edit]').forEach(b=>b.addEventListener('click',()=>this.interactionModal(id,b.dataset.intEdit)));
  box.querySelectorAll('[data-int-copy]').forEach(b=>b.addEventListener('click',()=>{const src=this.store.project.interactions?.find(x=>x.id===b.dataset.intCopy);if(!src)return;const copy=normalizeInteraction(src);copy.id=`int_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`;copy.steps=copy.steps.map(step=>({...step,id:`step_${Math.random().toString(36).slice(2,8)}`}));this.store.transact('نسخ التفاعل',project=>upsertInteraction(project,copy));this.renderInteractions()}));
  box.querySelectorAll('[data-remove-int]').forEach(b=>b.addEventListener('click',()=>{this.store.transact('حذف تفاعل',project=>removeInteraction(project,b.dataset.removeInt));this.engine.sync();this.renderInteractions()}));
}
interactionDescription(type){const map={button:'زر يدعم النقر والروابط والحركة والرسائل.',link:'رابط مناسب للتنقل والفتح الخارجي.',image:'صورة مناسبة للعرض والحركة والفتح.',input:'حقل مناسب للتركيز والكتابة والتغيير.',select:'قائمة مناسبة للتغيير والاختيار.',checkbox:'اختيار مناسب للتغيير والتبديل.',radio:'اختيار مناسب للتغيير والتبديل.',video:'وسائط تدعم التشغيل والإيقاف.',audio:'صوت يدعم التشغيل والإيقاف.',form:'نموذج يدعم الإرسال والأحداث.',faq:'سؤال شائع يمكن ربطه بالظهور أو الحركة.',default:'تفاعلات عامة يمكن تخصيصها بحرية.'};return map[type]||map.default}
interactionPresets(node){const page=this.store.project.pages.find(p=>p.id!==this.store.project.activePageId);const target=page?.id||null;const type=node.type;const presets=[];if(['button','link','card','product','navbar'].includes(type)&&target)presets.push({label:'نقرة → صفحة',description:'انتقال فوري إلى صفحة أخرى.',trigger:'click',steps:[{action:'page',options:{targetId:node.id,pageId:target}}]});if(['button','link','card','image','product'].includes(type))presets.push({label:'مرور → تكبير',description:'تكبير لطيف أثناء مرور المؤشر.',trigger:'hover',steps:[{action:'motion',options:{targetId:node.id,motion:'zoom',duration:260}}]});if(['button','link','image','card'].includes(type))presets.push({label:'مرور → رفع',description:'إحساس بطاقة تفاعلية خفيف.',trigger:'hover',steps:[{action:'motion',options:{targetId:node.id,motion:'lift',duration:220}}]});if(['input','search','textarea'].includes(type))presets.push({label:'تركيز → وهج',description:'يوضح الحقل النشط للمستخدم.',trigger:'focus',steps:[{action:'motion',options:{targetId:node.id,motion:'glow',duration:320}}]});if(['input','search','textarea'].includes(type))presets.push({label:'كتابة → رسالة',description:'رسالة تظهر عند كتابة النص.',trigger:'input',steps:[{action:'toast',options:{targetId:node.id,message:'تم تحديث الحقل',toastDuration:1200}}]});if(type==='audio')presets.push({label:'نقرة → تشغيل',description:'تشغيل الصوت من العنصر.',trigger:'click',steps:[{action:'mediaPlay',options:{targetId:node.id}}]});if(type==='audio')presets.push({label:'إيقاف → رسالة',description:'رسالة عند الإيقاف.',trigger:'pause',steps:[{action:'toast',options:{targetId:node.id,message:'تم إيقاف الوسائط',toastDuration:1200}}]});if(['checkbox','radio','select','dropdown'].includes(type))presets.push({label:'تغيير → حركة',description:'حركة قصيرة بعد تغيير الاختيار.',trigger:'change',steps:[{action:'motion',options:{targetId:node.id,motion:'pulse',duration:260}}]});presets.push({label:'دخول الشاشة → ظهور',description:'تشغيل ظهور عندما يدخل العنصر الشاشة.',trigger:'enterViewport',steps:[{action:'motion',options:{targetId:node.id,motion:'fade',duration:520}}]});return presets.slice(0,6)}
interactionTargets(){const out=[];for(const page of this.store.project.pages||[])walk(page.nodes,(node)=>out.push({id:node.id,label:`${page.name} — ${node.props?.label||node.props?.title||node.props?.text||node.type}`,type:node.type}));return out}
interactionTargetOptions(selected){return [`<option value="">العنصر نفسه</option>`,...this.interactionTargets().map(t=>`<option value="${escapeHtml(t.id)}" ${selected===t.id?'selected':''}>${escapeHtml(t.label)}</option>`)].join('')}
interactionStepFields(step){const o=step.options||{};const target=this.interactionTargetOptions(o.targetId);switch(step.action){case'motion':return `<div class="field-row"><div class="field"><label>الحركة</label><select data-step-key="motion">${motions.map(([v,l])=>`<option value="${v}" ${o.motion===v?'selected':''}>${l}</option>`).join('')}</select></div><div class="field"><label>المدة ms</label><input type="number" data-step-key="duration" value="${Number(o.duration)||420}"></div></div>`;case'page':return `<div class="field"><label>الصفحة</label><select data-step-key="pageId"><option value="">اختر صفحة…</option>${this.store.project.pages.map(pg=>`<option value="${pg.id}" ${o.pageId===pg.id?'selected':''}>${escapeHtml(pg.name)}</option>`).join('')}</select></div>`;case'url':return `<div class="field"><label>الرابط</label><input data-step-key="url" value="${escapeHtml(o.url||'')}" placeholder="https://example.com"></div><label class="check-row"><input type="checkbox" data-step-bool="newTab" ${o.newTab?'checked':''}> فتح في تبويب جديد</label>`;case'addClass':case'removeClass':case'toggleClass':return `<div class="field"><label>اسم الـClass</label><input data-step-key="className" value="${escapeHtml(o.className||'interactive')}" placeholder="highlight"></div>`;case'style':return `<div class="field-row"><div class="field"><label>خاصية CSS</label><input data-step-key="property" value="${escapeHtml(o.property||'color')}" placeholder="color"></div><div class="field"><label>القيمة</label><input data-step-key="value" value="${escapeHtml(o.value||'')}" placeholder="#5b5ce2"></div></div>`;case'setText':return `<div class="field"><label>النص الجديد</label><textarea data-step-key="text" rows="3">${escapeHtml(o.text||'')}</textarea></div>`;case'setAttribute':return `<div class="field-row"><div class="field"><label>اسم الخاصية</label><input data-step-key="attribute" value="${escapeHtml(o.attribute||'aria-label')}"></div><div class="field"><label>القيمة</label><input data-step-key="attributeValue" value="${escapeHtml(o.attributeValue||'')}"></div></div>`;case'removeAttribute':case'toggleAttribute':return `<div class="field"><label>اسم الخاصية</label><input data-step-key="attribute" value="${escapeHtml(o.attribute||'hidden')}"></div>`;case'toast':return `<div class="field"><label>الرسالة</label><input data-step-key="message" value="${escapeHtml(o.message||'تم التنفيذ')}"></div><div class="field"><label>المدة ms</label><input type="number" data-step-key="toastDuration" value="${Number(o.toastDuration)||2200}"></div>`;case'copy':return `<div class="field"><label>النص المراد نسخه</label><textarea data-step-key="text" rows="2">${escapeHtml(o.text||'')}</textarea><small>اتركه فارغًا لنسخ قيمة الحقل نفسه.</small></div>`;case'openAsset':case'downloadAsset':case'setMedia':{const kind=this.store.project.assets.map(a=>a.kind);return `<div class="field"><label>الوسيط المحمّل من المشروع</label><select data-step-key="assetId"><option value="">اختر وسيطًا…</option>${this.store.project.assets.filter(a=>step.action==='setMedia'?['image','video','audio'].includes(a.kind):true).map(a=>`<option value="${escapeHtml(a.id)}" ${o.assetId===a.id?'selected':''}>${escapeHtml(a.name)} — ${escapeHtml(a.originalName)} (${escapeHtml(a.kind)})</option>`).join('')}</select></div><label class="check-row"><input type="checkbox" data-step-bool="newTab" ${o.newTab!==false?'checked':''}> فتح في تبويب جديد</label><small class="step-hint">الملف يجب أن يكون مرفوعًا إلى مكتبة المشروع أولًا. أسماء الوسائط تكون تلقائيًا مثل img1 وvideo1 وaudio1.</small>`};default:return `<small class="step-hint">هذا الإجراء يعتمد على العنصر المستهدف أو المتصفح.</small>`}}
interactionTriggerOptions(sourceId,selected){const type=this.store.find(sourceId)?.node?.type||'default';const caps=interactionCapabilities(type);const preferred=triggers.filter(([v])=>caps.triggers.includes(v));const rest=triggers.filter(([v])=>!caps.triggers.includes(v));return `<optgroup label="مناسب لهذا العنصر">${preferred.map(([v,l])=>`<option value="${v}" ${selected===v?'selected':''}>${l}</option>`).join('')}</optgroup><optgroup label="كل المحفزات">${rest.map(([v,l])=>`<option value="${v}" ${selected===v?'selected':''}>${l}</option>`).join('')}</optgroup>`}
interactionActionOptions(sourceId,selected){const type=this.store.find(sourceId)?.node?.type||'default';const caps=interactionCapabilities(type);const preferred=actions.filter(([v])=>caps.actions.includes(v));const rest=actions.filter(([v])=>!caps.actions.includes(v));return `<optgroup label="أفعال مناسبة لهذا العنصر">${preferred.map(([v,l])=>`<option value="${v}" ${selected===v?'selected':''}>${l}</option>`).join('')}</optgroup><optgroup label="كل الأفعال">${rest.map(([v,l])=>`<option value="${v}" ${selected===v?'selected':''}>${l}</option>`).join('')}</optgroup>`}
interactionStepHtml(step,index){return `<article class="interaction-step" data-step-id="${escapeHtml(step.id)}"><div class="step-head"><span>الإجراء ${index+1}</span><div><button type="button" data-step-up="${escapeHtml(step.id)}">↑</button><button type="button" data-step-down="${escapeHtml(step.id)}">↓</button><button type="button" data-step-remove="${escapeHtml(step.id)}">×</button></div></div><div class="field-row"><div class="field"><label>الإجراء</label><select data-step-action>${this.interactionActionOptions(this.store.ui.selected,step.action)}</select></div><div class="field"><label>العنصر المستهدف</label><select data-step-target>${this.interactionTargetOptions(step.options?.targetId)}</select></div></div><div class="field"><label>تأخير قبل التنفيذ ms</label><input type="number" data-step-delay min="0" max="10000" value="${Number(step.delay)||0}"></div><div class="step-fields">${this.interactionStepFields(step)}</div></article>`}
readInteractionStep(article,sourceId){const step=makeStep(article.querySelector('[data-step-action]')?.value||'motion');step.id=article.dataset.stepId||step.id;step.delay=Math.max(0,Math.min(10000,Number(article.querySelector('[data-step-delay]')?.value)||0));step.options.targetId=article.querySelector('[data-step-target]')?.value||sourceId;article.querySelectorAll('[data-step-key]').forEach(input=>{const key=input.dataset.stepKey;step.options[key]=input.type==='number'?Number(input.value||0):input.value});article.querySelectorAll('[data-step-bool]').forEach(input=>{step.options[input.dataset.stepBool]=input.checked});return step}
interactionModal(sourceId,interactionId=null){
  const existing=interactionId?this.store.project.interactions?.find(x=>x.id===interactionId):null;
  const i=existing?normalizeInteraction(existing):makeInteraction(sourceId,'click','motion',{targetId:sourceId});
  const body=`<div class="interaction-editor"><div class="field-row"><div class="field"><label>المحفّز</label><select id="ieTrigger">${this.interactionTriggerOptions(sourceId,i.trigger)}</select></div><div class="field"><label>الشرط</label><select id="ieCondition"><option value="always">دائمًا</option><option value="not-empty">القيمة ليست فارغة</option><option value="visible">العنصر ظاهر</option><option value="value">قيمة محددة</option><option value="device">جهاز محدد</option><option value="key">مفتاح محدد</option></select></div></div><div id="ieConditionFields"></div><div class="field-row"><label class="check-row"><input id="ieOnce" type="checkbox" ${i.once?'checked':''}> مرة واحدة فقط</label><label class="check-row"><input id="iePrevent" type="checkbox" ${i.preventDefault?'checked':''}> منع السلوك الافتراضي</label><label class="check-row"><input id="ieStop" type="checkbox" ${i.stopPropagation?'checked':''}> منع انتشار الحدث</label></div><div class="field"><label>مهلة بين التشغيلات ms</label><input id="ieCooldown" type="number" min="0" max="60000" value="${Number(i.cooldown)||0}"></div><div class="interaction-steps-head"><div><b>سلسلة الإجراءات</b><small>أضف أكثر من إجراء، ورتّبها بالسهمين.</small></div><button id="ieAddStep" class="secondary-btn" type="button">＋ إجراء</button></div><div id="ieSteps">${i.steps.map((step,index)=>this.interactionStepHtml(step,index)).join('')}</div></div>`;
  const modal=showModal(document.getElementById('modalHost'),{title:interactionId?'تعديل التفاعل':'إنشاء تفاعل متقدم',body,wide:true,actions:[{label:'إلغاء'},{label:'حفظ التفاعل',kind:'primary',onClick:()=>this.saveInteractionModal(modal,sourceId,interactionId)}]});
  const renderCondition=()=>{const type=modal.querySelector('#ieCondition')?.value||'always';const box=modal.querySelector('#ieConditionFields');if(type==='value')box.innerHTML=`<div class="field-row"><div class="field"><label>القيمة</label><input id="ieCondValue" value="${escapeHtml(i.condition?.value||'')}"></div><div class="field"><label>المقارنة</label><select id="ieCondOperator"><option value="contains">تحتوي</option><option value="equals">تساوي</option><option value="not-equals">لا تساوي</option><option value="starts">تبدأ بـ</option><option value="ends">تنتهي بـ</option></select></div></div>`;else if(type==='device')box.innerHTML=`<div class="field"><label>الجهاز</label><select id="ieCondValue"><option value="desktop">Desktop</option><option value="tablet">Tablet</option><option value="mobile">Mobile</option></select></div>`;else if(type==='key')box.innerHTML=`<div class="field"><label>اسم المفتاح</label><input id="ieCondValue" value="${escapeHtml(i.condition?.value||'Enter')}"></div>`;else box.innerHTML='';if(i.condition?.type===type){const v=modal.querySelector('#ieCondValue');if(v)v.value=i.condition.value||v.value||'';const op=modal.querySelector('#ieCondOperator');if(op)op.value=i.condition.operator||'contains'}};
  modal.querySelector('#ieCondition').value=i.condition?.type||'always';renderCondition();modal.querySelector('#ieCondition').addEventListener('change',renderCondition);
  modal.querySelector('#ieAddStep').addEventListener('click',()=>{const step=makeStep('motion',{targetId:sourceId});const holder=modal.querySelector('#ieSteps');holder.insertAdjacentHTML('beforeend',this.interactionStepHtml(step,holder.children.length));this.bindInteractionStepUi(modal,sourceId)});
  this.bindInteractionStepUi(modal,sourceId);return modal;
}
bindInteractionStepUi(modal,sourceId){
  modal.querySelectorAll('[data-step-action]').forEach(select=>{select.onchange=()=>{const article=select.closest('.interaction-step');const step=this.readInteractionStep(article,sourceId);article.querySelector('.step-fields').innerHTML=this.interactionStepFields(step);this.bindInteractionStepUi(modal,sourceId)}});
  modal.querySelectorAll('[data-step-remove]').forEach(b=>b.onclick=()=>b.closest('.interaction-step')?.remove());
  modal.querySelectorAll('[data-step-up]').forEach(b=>b.onclick=()=>{const a=b.closest('.interaction-step');const prev=a?.previousElementSibling;if(prev)a.parentElement.insertBefore(a,prev)});
  modal.querySelectorAll('[data-step-down]').forEach(b=>b.onclick=()=>{const a=b.closest('.interaction-step');const next=a?.nextElementSibling;if(next)a.parentElement.insertBefore(next,a)});
}
saveInteractionModal(modal,sourceId,interactionId){
  const steps=[...modal.querySelectorAll('.interaction-step')].map(article=>this.readInteractionStep(article,sourceId));if(!steps.length)steps.push(makeStep('motion',{targetId:sourceId}));
  const conditionType=modal.querySelector('#ieCondition')?.value||'always';const value=modal.querySelector('#ieCondValue')?.value||'';const operator=modal.querySelector('#ieCondOperator')?.value||'contains';
  const item={id:interactionId||undefined,sourceId,trigger:modal.querySelector('#ieTrigger')?.value||'click',enabled:interactionId?(this.store.project.interactions?.find(x=>x.id===interactionId)?.enabled!==false):true,once:modal.querySelector('#ieOnce')?.checked||false,preventDefault:modal.querySelector('#iePrevent')?.checked||false,stopPropagation:modal.querySelector('#ieStop')?.checked||false,cooldown:Number(modal.querySelector('#ieCooldown')?.value)||0,condition:{type:conditionType,value,operator},steps,action:steps[0].action,options:steps[0].options};
  this.store.transact(interactionId?'تحديث تفاعل':'إنشاء تفاعل',project=>upsertInteraction(project,item));this.store.setUI({interactionMode:true});this.engine.sync();modal.remove();this.renderInteractions();
}
templatesModal(){const body=`<div class="template-grid">${templates.map((t,i)=>`<article class="template-card"><div class="template-preview"><div class="mock-block mock-wide"></div><div class="mock-block"></div><div class="mock-block mock-short"></div></div><div class="template-info"><b>${escapeHtml(t.name)}</b><small>${escapeHtml(t.description)}</small><div class="template-actions"><button data-add-template="${i}">إضافة قسم</button><button class="apply" data-apply-template="${i}">تطبيق كامل</button></div></div></article>`).join('')}</div>`;const modal=showModal(document.getElementById('modalHost'),{title:'القوالب الجاهزة',body});modal.querySelectorAll('[data-apply-template]').forEach(b=>b.onclick=()=>{const t=materializeTemplate(templates[Number(b.dataset.applyTemplate)]);const device=this.store.ui.device||'desktop';this.store.transact('تطبيق قالب',p=>{p.pages=t.pages.map(page=>({...page,nodes:initializeDevicePresetsTree(page.nodes||[],device)}));p.activePageId=p.pages[0].id;p.meta.name=t.name;p.interactions=[]});this.store.setUI({selected:null});modal.remove()});modal.querySelectorAll('[data-add-template]').forEach(b=>b.onclick=()=>{const t=materializeTemplate(templates[Number(b.dataset.addTemplate)]);const device=this.store.ui.device||'desktop';this.store.transact('إضافة قسم من قالب',p=>{const page=p.pages.find(x=>x.id===p.activePageId);if(page)page.nodes.push(...initializeDevicePresetsTree(t.pages[0].nodes||[],device))});modal.remove()})}
assetsModal(){
  const selectedId=this.store.ui.selected;
  const selectedNode=selectedId?findNodeGlobal(this.store.project,selectedId)?.node:null;
  const preferred=selectedNode?assetForNodeType(selectedNode.type):'';
  const initial=this.assetService?this.assetService.list({kind:['image','video','audio','document','font'].includes(preferred)?preferred:''}):this.store.project.assets||[];
  const body=`
    <section class="asset-library">
      <div class="asset-dropzone" id="assetDropzone" tabindex="0" role="button" aria-label="اسحب الملفات هنا أو اختر من الجهاز">
        <div class="asset-drop-icon">⇧</div><b>أضف ملفات إلى موقعك</b><small>اسحب الصور أو الفيديو أو الصوت أو المستندات هنا، أو اختر ملفات من جهازك.</small>
        <button type="button" class="primary-btn" id="selectAssetFiles">اختيار ملفات من الجهاز</button>
        <input id="assetUploader" type="file" multiple hidden accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.md,.json,.zip,.woff,.woff2,.ttf,.otf,.html,.css,.js,.xml">
        <div id="assetUploadStatus" class="asset-upload-status" aria-live="polite">الملفات تحفظ في مكتبة المشروع وتبقى متاحة لإعادة الاستخدام.</div>
      </div>
      <div class="asset-toolbar">
        <div class="field"><label for="assetSearch">ابحث في المكتبة</label><input id="assetSearch" placeholder="اسم الملف أو نوعه أو الوسوم…"></div>
        <div class="field"><label for="assetKind">نوع الملف</label><select id="assetKind"><option value="">كل الأنواع</option><option value="image" ${preferred==='image'?'selected':''}>صور</option><option value="video" ${preferred==='video'?'selected':''}>فيديو</option><option value="audio" ${preferred==='audio'?'selected':''}>صوت</option><option value="document" ${preferred==='document'?'selected':''}>مستندات</option><option value="font">خطوط</option><option value="other">ملفات أخرى</option></select></div>
        <div class="field"><label for="assetSort">الترتيب</label><select id="assetSort"><option value="recent">الأحدث</option><option value="name">الاسم</option><option value="size">الحجم</option></select></div>
      </div>
      <div class="asset-library-summary" id="assetSummary">${initial.length} ملف في المكتبة</div>
      <div id="assetList" class="asset-grid">${initial.map(a=>this.assetCardHtml(a)).join('')||'<div class="tips-card asset-empty"><b>المكتبة فارغة حاليًا</b><p>ارفع أول ملف، وبعدها تقدر تستخدمه في أي عنصر أو صفحة.</p></div>'}</div>
      <div id="assetPreviewPane" class="asset-preview-pane hidden"></div>
      <section id="assetEditorPane" class="asset-editor-pane hidden"><h3>تعديل بيانات الملف</h3><div class="field-row"><div class="field"><label>الاسم داخل المشروع</label><input id="assetEditName"></div><div class="field"><label>المجلد</label><input id="assetEditFolder"></div></div><div class="field"><label>الوصف البديل للصورة (يساعد الوصول)</label><input id="assetEditAlt"></div><div class="field"><label>وسوم مفصولة بفاصلة</label><input id="assetEditTags"></div><button type="button" class="primary-btn" id="saveAssetMeta">حفظ البيانات</button><button type="button" class="secondary-btn" id="cancelAssetMeta">إلغاء</button><input type="hidden" id="assetEditId"></section>
    </section>`;
  const modal=showModal(document.getElementById('modalHost'),{title:'مكتبة الوسائط والملفات',body,wide:true});
  const status=message=>{const element=modal.querySelector('#assetUploadStatus');if(element)element.textContent=message};
  const previewPane=modal.querySelector('#assetPreviewPane');
  const selectedMeta=()=>modal.querySelector('#assetEditorPane');
  const refresh=()=>{
    const query=modal.querySelector('#assetSearch')?.value||'',kind=modal.querySelector('#assetKind')?.value||'',sort=modal.querySelector('#assetSort')?.value||'recent';
    let list=this.assetService?this.assetService.list({query,kind}):this.store.project.assets||[];
    list=[...list].sort((a,b)=>sort==='name'?String(a.name).localeCompare(String(b.name),'ar'):sort==='size'?Number(b.size||0)-Number(a.size||0):String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
    const host=modal.querySelector('#assetList');host.innerHTML=list.map(a=>this.assetCardHtml(a)).join('')||'<div class="tips-card asset-empty"><b>لا توجد نتائج</b><p>جرّب تغيير البحث أو نوع الملف.</p></div>';
    modal.querySelector('#assetSummary').textContent=`${list.length} ملف${query?' مطابق للبحث':''} • إجمالي المكتبة ${this.store.project.assets.length}`;
    bindCards();
  };
  const bindCards=()=>{
    modal.querySelectorAll('[data-asset-action]').forEach(button=>button.addEventListener('click',async e=>{
      e.preventDefault();e.stopPropagation();const action=button.dataset.assetAction;const asset=this.assetService?.get(button.dataset.assetId);if(!asset)return;
      if(action==='insert'){this.insertAsset(asset);status(`تمت إضافة ${asset.name}.${asset.extension||'bin'} إلى الصفحة.`);refresh();return}
      if(action==='use'){const ok=this.useAssetOnSelectedNode(asset);status(ok?'تم ربط الملف بالعنصر المحدد.':'اختر عنصرًا مناسبًا أو أضف الملف كعنصر جديد.');if(ok){this.engine.sync();this.renderLayers();this.engine.inspector?.render?.()}return}
      if(action==='preview'){
        previewPane.classList.remove('hidden');let content='';const src=asset.data||asset.url||'';
        if(asset.kind==='image')content=`<img src="${escapeHtml(src)}" alt="${escapeHtml(asset.alt||asset.name)}">`;
        else if(asset.kind==='video')content=`<video src="${escapeHtml(src)}" controls playsinline preload="metadata"></video>`;
        else if(asset.kind==='audio')content=`<audio src="${escapeHtml(src)}" controls preload="metadata"></audio>`;
        else if((asset.extension||'').toLowerCase()==='pdf')content=`<iframe src="${escapeHtml(src)}" title="${escapeHtml(asset.filename)}"></iframe>`;
        else content=`<div class="asset-preview-generic"><b>${escapeHtml(asset.filename||asset.name)}</b><p>${escapeHtml(asset.type)} • ${escapeHtml(formatBytes(asset.size))}</p><a href="${escapeHtml(src)}" target="_blank" rel="noopener">فتح الملف</a></div>`;
        previewPane.innerHTML=`<div class="asset-preview-head"><b>معاينة: ${escapeHtml(asset.name)}.${escapeHtml(asset.extension||'bin')}</b><button type="button" class="secondary-btn" data-close-preview>إغلاق المعاينة</button></div><div class="asset-preview-content">${content}</div>`;previewPane.querySelector('[data-close-preview]').onclick=()=>{previewPane.classList.add('hidden');previewPane.innerHTML=''};return;
      }
      if(action==='download'){const a=document.createElement('a');a.href=asset.data||asset.url||'';a.download=asset.filename||asset.name||'download';document.body.appendChild(a);a.click();a.remove();return}
      if(action==='edit'){const pane=selectedMeta();pane.classList.remove('hidden');modal.querySelector('#assetEditId').value=asset.id;modal.querySelector('#assetEditName').value=asset.name||'';modal.querySelector('#assetEditFolder').value=asset.folder||asset.kind;modal.querySelector('#assetEditAlt').value=asset.alt||'';modal.querySelector('#assetEditTags').value=(asset.tags||[]).join(', ');pane.scrollIntoView({behavior:'smooth',block:'nearest'});return}
      if(action==='delete'){if(!confirm(`حذف الملف ${asset.filename||asset.name} من المكتبة؟`))return;this.assetService?.remove(asset.id);status('تم حذف الملف من المكتبة.');previewPane.classList.add('hidden');refresh()}
    }));
  };
  bindCards();
  modal.querySelector('#selectAssetFiles')?.addEventListener('click',()=>modal.querySelector('#assetUploader')?.click());
  const upload=async files=>{files=[...files||[]];if(!files.length)return;let done=0,errors=[];for(const file of files){status(`جارٍ رفع ${file.name} (${done+1} من ${files.length})…`);try{await this.assetService.addFile(file,{folder:'المكتبة',alt:file.name.replace(/\.[^.]+$/,'')});done++}catch(error){errors.push(`${file.name}: ${error.message||'تعذر الرفع'}`)}}modal.querySelector('#assetUploader').value='';refresh();status(errors.length?`تم رفع ${done} ملفات. لم يتم رفع: ${errors.join(' • ')}`:`اكتمل رفع ${done} ملف بنجاح. بقيت المكتبة مفتوحة لاختيار الملفات.`)};
  modal.querySelector('#assetUploader')?.addEventListener('change',e=>upload(e.target.files));
  const dropzone=modal.querySelector('#assetDropzone');dropzone?.addEventListener('click',e=>{if(e.target.closest('button'))return;modal.querySelector('#assetUploader')?.click()});dropzone?.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();modal.querySelector('#assetUploader')?.click()}});['dragenter','dragover'].forEach(type=>dropzone?.addEventListener(type,e=>{e.preventDefault();dropzone.classList.add('drag-active')}));['dragleave','drop'].forEach(type=>dropzone?.addEventListener(type,e=>{e.preventDefault();dropzone.classList.remove('drag-active')}));dropzone?.addEventListener('drop',e=>upload(e.dataTransfer?.files||[]));
  modal.querySelector('#assetSearch')?.addEventListener('input',refresh);modal.querySelector('#assetKind')?.addEventListener('change',refresh);modal.querySelector('#assetSort')?.addEventListener('change',refresh);
  modal.querySelector('#saveAssetMeta')?.addEventListener('click',()=>{const id=modal.querySelector('#assetEditId').value;this.assetService?.update(id,{name:modal.querySelector('#assetEditName').value,folder:modal.querySelector('#assetEditFolder').value,alt:modal.querySelector('#assetEditAlt').value,tags:modal.querySelector('#assetEditTags').value.split(',').map(v=>v.trim()).filter(Boolean)});selectedMeta().classList.add('hidden');refresh();status('تم حفظ بيانات الملف.')});modal.querySelector('#cancelAssetMeta')?.addEventListener('click',()=>selectedMeta().classList.add('hidden'));
  return modal;
}
assetCardHtml(asset){
  const id=escapeHtml(asset.id),name=escapeHtml(asset.name),extension=escapeHtml(asset.extension||'bin'),src=escapeHtml(asset.data||asset.url||'');
  let preview='';if(asset.kind==='image')preview=`<img src="${src}" alt="${escapeHtml(asset.alt||asset.name)}" loading="lazy">`;else if(asset.kind==='video')preview=`<div class="asset-audio-thumb">▶<small>فيديو • اضغط معاينة للتشغيل</small></div><span class="asset-type-stamp">فيديو</span>`;else if(asset.kind==='audio')preview=`<div class="asset-audio-thumb">♫<small>ملف صوتي</small></div>`;else preview=`<div class="asset-doc-thumb"><strong>${asset.kind==='font'?'Aa':extension.toUpperCase()}</strong><small>${escapeHtml(asset.kind==='document'?'مستند':asset.kind==='font'?'خط':'ملف')}</small></div>`;
  const selected=Boolean(this.store.ui.selected);return `<article class="asset-card" data-asset-card="${id}"><div class="asset-card-preview">${preview}</div><div class="asset-card-meta"><b title="${name}.${extension}">${name}.${extension}</b><small title="${escapeHtml(asset.originalName||'')}">${escapeHtml(asset.originalName||'')}</small><small>${escapeHtml(formatBytes(asset.size))} • ${escapeHtml(asset.kind)}${asset.optimized?' • محسّن':''}</small></div><div class="asset-card-actions"><button type="button" data-asset-action="preview" data-asset-id="${id}">معاينة</button><button type="button" class="primary-btn" data-asset-action="insert" data-asset-id="${id}">إدراج عنصر</button><button type="button" data-asset-action="use" data-asset-id="${id}" ${selected?'':'disabled'}>استخدم في المحدد</button><div class="asset-more-actions"><button type="button" data-asset-action="download" data-asset-id="${id}">تنزيل</button><button type="button" data-asset-action="edit" data-asset-id="${id}">بيانات</button><button type="button" class="danger-btn" data-asset-action="delete" data-asset-id="${id}">حذف</button></div></div></article>`
}
insertAsset(asset){
  if(!asset||!this.assetService)return null;
  let type='file-card';if(asset.kind==='image')type='image';else if(asset.kind==='video')type='video';else if(asset.kind==='audio')type='audio';else if((asset.extension||'').toLowerCase()==='pdf')type='document-viewer';
  const node=addNode(this.store,type);this.assetService.assignToNode(node.id,asset.id);if(type==='file-card')this.store.transact('تحديث بطاقة الملف',project=>{const hit=findNodeGlobal(project,node.id);if(hit){hit.node.props.title=asset.name;hit.node.props.text=asset.originalName||asset.filename;hit.node.props.filename=asset.filename}});if(type==='document-viewer')this.store.transact('ضبط عارض المستند',project=>{const hit=findNodeGlobal(project,node.id);if(hit)hit.node.props.title=asset.originalName||asset.filename});this.store.setUI({selected:node.id,rightOpen:true});this.engine?.sync();this.renderLayers();this.engine?.inspector?.render?.();return node;
}
useAssetOnSelectedNode(asset){
  const id=this.store.ui.selected;if(!id||!asset||!this.assetService)return false;const hit=findNodeGlobal(this.store.project,id);if(!hit)return false;const multi=new Set(['gallery','image-carousel','media-grid','video-gallery','audio-playlist']);
  if(multi.has(hit.node.type)){const current=hit.node.props?.assetIds||[];if(!this.assetService.assignMany(id,[...current,asset.id]))return false;return true}return Boolean(this.assetService.assignToNode(id,asset.id));
}

pageSettingsModal(pageId){
  const page=this.store.project.pages.find(item=>item.id===pageId); if(!page)return null;
  const parentOptions=`<option value="">جذر الموقع</option>${this.store.project.pages.filter(item=>item.id!==pageId).map(item=>`<option value="${escapeHtml(item.id)}" ${page.parentId===item.id?'selected':''}>${escapeHtml(item.name)}</option>`).join('')}`;
  const body=`<div class="page-settings-grid"><div class="field"><label>اسم الصفحة</label><input id="pageName" value="${escapeHtml(page.name)}"></div><div class="field"><label>المسار</label><input id="pagePath" value="${escapeHtml(page.path||`/${page.slug}`)}"></div><div class="field"><label>الصفحة الأب</label><select id="pageParent">${parentOptions}</select></div><div class="field"><label>عنوان SEO</label><input id="pageSeoTitle" value="${escapeHtml(page.seo?.title||page.name)}"></div><div class="field"><label>وصف SEO</label><textarea id="pageSeoDescription">${escapeHtml(page.seo?.description||'')}</textarea></div><div class="field"><label>Canonical</label><input id="pageCanonical" value="${escapeHtml(page.seo?.canonical||'')}"></div><label class="check-row"><input id="pageShowInNav" type="checkbox" ${page.settings?.showInNav!==false?'checked':''}> إظهار في التنقل</label><label class="check-row"><input id="pageHidden" type="checkbox" ${page.settings?.hidden?'checked':''}> إخفاء الصفحة</label><label class="check-row"><input id="pageNoIndex" type="checkbox" ${page.seo?.noIndex?'checked':''}> منع الفهرسة</label><label class="check-row"><input id="pageTemplate" type="checkbox" ${page.settings?.template?'checked':''}> استخدام كقالب</label></div><div class="tips-card"><b>حالة الصفحة</b><p>الصفحة جزء من Document Model ويمكن أن يكون لها مسار وSEO وحالة تنقل مستقلة عن ترتيبها في المحرر.</p></div>`;
  const modal=showModal(document.getElementById('modalHost'),{title:`إعدادات: ${escapeHtml(page.name)}`,body,wide:true,actions:[{label:'إلغاء'},{label:'حفظ التغييرات',kind:'primary',onClick:()=>this.savePageSettings(modal,pageId)}]});
  return modal;
}
savePageSettings(modal,pageId){
  const val=id=>modal.querySelector(id)?.value||''; const checked=id=>Boolean(modal.querySelector(id)?.checked);
  this.store.transact('تحديث إعدادات الصفحة',project=>{const page=project.pages.find(item=>item.id===pageId);if(!page)return;page.name=String(val('#pageName')||page.name).trim();page.slug=String(page.slug||page.name).trim();page.path=String(val('#pagePath')||`/${page.slug}`).trim();if(!page.path.startsWith('/'))page.path='/'+page.path;page.parentId=String(val('#pageParent')||'')||null;page.seo={...(page.seo||{}),title:String(val('#pageSeoTitle')||page.name).trim(),description:val('#pageSeoDescription'),canonical:val('#pageCanonical'),noIndex:checked('#pageNoIndex')};page.settings={...(page.settings||{}),showInNav:checked('#pageShowInNav'),hidden:checked('#pageHidden'),template:checked('#pageTemplate')};});
}

sectionsModal(){const body=`<div class="section-grid">${sections.map(s=>`<article class="section-card"><div class="section-preview"><div></div><div></div><div></div></div><div><b>${escapeHtml(s.name)}</b><small>${escapeHtml(s.description)}</small><button data-add-section="${s.id}" class="primary-btn">إضافة إلى الصفحة</button></div></article>`).join('')}</div>`;const modal=showModal(document.getElementById('modalHost'),{title:'أقسام جاهزة',body,wide:true});modal.querySelectorAll('[data-add-section]').forEach(b=>b.onclick=()=>{const node=materializeSection(b.dataset.addSection);this.store.transact('إضافة قسم جاهز',p=>p.pages.find(x=>x.id===p.activePageId)?.nodes.push(...initializeDevicePresetsTree([node],this.store.ui.device||'desktop')));modal.remove()});return modal}

pagesModal(){
  const pages=this.store.project.pages;
  const body=`<div class="list-stack">${pages.map((page,index)=>`<div class="page-row ${page.id===this.store.project.activePageId?'active':''}"><div><b>${escapeHtml(page.name)}${index===0?' • الرئيسية':''}</b><small>${escapeHtml(page.path||('/'+page.slug))} • ${page.parentId?'فرعية من: '+escapeHtml(pages.find(parent=>parent.id===page.parentId)?.name||'صفحة'): 'جذر'} • ${(page.nodes||[]).length} عناصر</small></div><div class="page-row-actions"><button data-page-open="${page.id}">فتح</button><button data-page-copy="${page.id}">نسخ</button><button data-page-up="${page.id}" ${index===0?'disabled':''}>↑</button><button data-page-down="${page.id}" ${index===pages.length-1?'disabled':''}>↓</button><button data-page-home="${page.id}" ${index===0?'disabled':''}>⌂</button><button data-page-settings="${page.id}">SEO</button><button data-page-rename="${page.id}">تسمية</button><button data-page-delete="${page.id}" ${pages.length<=1?'disabled':''}>×</button></div></div>`).join('')}</div><div class="modal-actions"><button id="newPageBtn" class="primary-btn" type="button">＋ صفحة جديدة</button></div>`;
  const modal=showModal(document.getElementById('modalHost'),{title:'إدارة صفحات الموقع',body});
  modal.querySelector('#newPageBtn').onclick=()=>{const name=prompt('اسم الصفحة','صفحة جديدة');if(name?.trim()){this.store.addPage(name.trim());modal.remove();this.pagesModal()}};
  modal.querySelectorAll('[data-page-open]').forEach(b=>b.onclick=()=>{this.store.setActivePage(b.dataset.pageOpen);modal.remove()});
  modal.querySelectorAll('[data-page-settings]').forEach(b=>b.onclick=()=>{modal.remove();this.pageSettingsModal(b.dataset.pageSettings)});
  modal.querySelectorAll('[data-page-copy]').forEach(b=>b.onclick=()=>{this.store.duplicatePage(b.dataset.pageCopy);modal.remove();this.pagesModal()});
  modal.querySelectorAll('[data-page-up]').forEach(b=>b.onclick=()=>{this.store.movePage(b.dataset.pageUp,'up');modal.remove();this.pagesModal()});
  modal.querySelectorAll('[data-page-down]').forEach(b=>b.onclick=()=>{this.store.movePage(b.dataset.pageDown,'down');modal.remove();this.pagesModal()});
  modal.querySelectorAll('[data-page-home]').forEach(b=>b.onclick=()=>{this.store.setHomePage(b.dataset.pageHome);modal.remove();this.pagesModal()});
  modal.querySelectorAll('[data-page-rename]').forEach(b=>b.onclick=()=>{const page=this.store.project.pages.find(p=>p.id===b.dataset.pageRename);const name=prompt('الاسم الجديد',page?.name||'');if(name?.trim())setPageName(this.store,b.dataset.pageRename,name.trim());modal.remove();this.pagesModal()});
  modal.querySelectorAll('[data-page-delete]').forEach(b=>b.onclick=()=>{if(confirm('حذف الصفحة؟'))this.store.deletePage(b.dataset.pageDelete);modal.remove();this.pagesModal()});
  return modal;
}
}
exports.Panels = Panels;
});
const __app=__require("src/main.js");if(typeof window!=='undefined'&&__app?.app)window.__BUNAA_APP=__app.app;})();
