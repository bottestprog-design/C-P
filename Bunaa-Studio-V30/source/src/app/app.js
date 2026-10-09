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
