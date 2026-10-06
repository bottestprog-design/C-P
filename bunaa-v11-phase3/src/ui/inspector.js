import {findNodeGlobal} from '../core/model.js';
import {DEVICE_ORDER,propagateStyle} from '../engine/layout.js';
import {showModal} from './modal.js';
import {nodeHtml} from '../engine/renderer.js';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const STYLE_KEYS=new Set(['color','background','fontSize','radius','marginTop','marginBottom','width','height','gap','opacity']);

export class Inspector{
  constructor(store){this.store=store;this.device='desktop';this.advanced=false}
  mount(element){this.el=element;this.render()}
  setDevice(device){if(DEVICE_ORDER.includes(device))this.device=device;this.render()}
  section(title,body){
    return `<section class="inspector-section"><header><b>${title}</b><span>${this.store.ui.advancedDevices&&this.device!=='desktop'?'خاص بالجهاز':'مشترك'}</span></header><div class="inspector-body">${body}</div></section>`;
  }
  field(label,key,value,type='text',extra=''){return `<div class="field"><label>${label}</label><input data-prop="${key}" data-kind="${type}" value="${esc(value??'')}" ${extra}></div>`}
  contentFields(node){
    const p=node.props||{};let html='';
    if(['heading','text','quote','badge','alert','button','link','marquee'].includes(node.type))html+=this.field(node.type==='heading'?'العنوان':'النص','text',p.text||p.title||'');
    if(['button','link'].includes(node.type))html+=`<div class="field"><label>الوجهة</label><select data-prop="url"><option value="#" ${p.url==='#'?'selected':''}>لا توجد وجهة</option><option value="${p.url?.startsWith('http')?esc(p.url):'#'}" ${p.url?.startsWith('http')?'selected':''}>رابط خارجي</option>${this.store.project.pages.map(page=>`<option value="page:${page.id}" ${p.url===`page:${page.id}`?'selected':''}>صفحة: ${esc(page.name)}</option>`).join('')}</select></div>`;
    if(node.type==='image')html+=this.field('مصدر الصورة','src',p.src||'')+this.field('الوصف البديل','alt',p.alt||'');
    if(['input','textarea','select','search','file'].includes(node.type))html+=this.field('اسم الحقل','label',p.label||'')+this.field('النص المساعد','placeholder',p.placeholder||'');
    if(node.type==='card')html+=this.field('العنوان','title',p.title||'')+this.field('الوصف','text',p.text||'')+this.field('نص الزر','button',p.button||'')+this.field('وجهة الزر','url',p.url||'#');
    if(node.type==='product')html+=this.field('اسم المنتج','name',p.name||'')+this.field('السعر','price',p.price||'')+this.field('نص الدعوة','cta',p.cta||'')+this.field('الوجهة','url',p.url||'#');
    if(node.type==='faq')html+=this.field('السؤال','question',p.question||'')+this.field('الإجابة','answer',p.answer||'');
    if(node.type==='calendar')html+=this.field('العنوان','month',p.month||'');
    if(node.type==='navbar')html+=this.field('اسم العلامة','brand',p.brand||'');
    if(!html)html+=this.field('اسم وصفي','label',p.label||'');
    return html;
  }
  effectiveStyle(node){
    const base={...(node.style||{})};
    if(this.store.ui.advancedDevices&&this.device!=='desktop')Object.assign(base,node.responsive?.[this.device]||{});
    return base;
  }
  styleFields(node){
    const s=this.effectiveStyle(node);
    return this.field('لون النص','color',s.color||'')+
      this.field('الخلفية','background',s.background||'')+
      `<div class="field-row">${this.field('حجم النص','fontSize',s.fontSize??'','number')}${this.field('الاستدارة','radius',s.radius??'','number')}</div>`+
      `<div class="field-row">${this.field('هامش أعلى','marginTop',s.marginTop??0,'number')}${this.field('هامش أسفل','marginBottom',s.marginBottom??14,'number')}</div>`;
  }
  behaviorFields(){
    return `<div class="sync-row"><span>مزامنة تخصيص الأجهزة</span><input id="deviceSync" type="checkbox" ${this.store.project.settings.propagateDevices?'checked':''}></div><button class="advanced-toggle" id="addInteractionFromInspector">⚡ تخصيص التفاعل</button>`;
  }
  advancedFields(node){
    const s=this.effectiveStyle(node);
    return this.section('التخصيص المتقدم',
      `${this.field('العرض','width',s.width??'')}${this.field('الارتفاع','height',s.height??'','number')}`+
      `<div class="field-row">${this.field('الفجوة','gap',s.gap??'','number')}${this.field('العتامة','opacity',s.opacity??1,'number')}</div>`+
      `<div class="field"><label>الجهاز</label><div class="segmented">${DEVICE_ORDER.map(d=>`<button data-device-pick="${d}" class="${d===this.device?'active':''}">${d}</button>`).join('')}</div></div>`+
      `<div class="tips-card"><b>تخصيص متوافق</b><p>يمكن تخصيص كل جهاز وحده مع مزامنة نسبية للقيم الرقمية.</p></div>`);
  }
  render(){
    if(!this.el)return;
    const id=this.store.ui.selected,hit=id?findNodeGlobal(this.store.project,id):null;
    if(!hit){this.el.classList.add('hidden');document.getElementById('inspectorEmpty')?.classList.remove('hidden');return}
    document.getElementById('inspectorEmpty')?.classList.add('hidden');this.el.classList.remove('hidden');
    document.getElementById('inspectorTitle').textContent=hit.node.props?.label||hit.node.props?.title||hit.node.props?.text||hit.node.type;
    this.el.innerHTML=this.section('المحتوى',this.contentFields(hit.node))+this.section('المظهر',this.styleFields(hit.node))+this.section('السلوك',this.behaviorFields())+
      `<button class="advanced-toggle" id="advancedInspectorToggle">${this.advanced?'إخفاء التخصيص المتقدم':'إظهار التخصيص المتقدم'}</button>${this.advanced?this.advancedFields(hit.node):''}${this.store.ui.mode==='trainee'?'<button class="advanced-toggle" id="elementCodeBtn">&lt;/&gt; عرض كود العنصر</button>':''}`;
    this.wire(hit.node.id);
  }
  wire(nodeId){
    for(const input of this.el.querySelectorAll('[data-prop]'))input.addEventListener('change',()=>this.updateField(nodeId,input));
    this.el.querySelector('#advancedInspectorToggle')?.addEventListener('click',()=>{this.advanced=!this.advanced;this.render()});
    this.el.querySelector('#deviceSync')?.addEventListener('change',event=>this.store.setProjectSetting('propagateDevices',event.target.checked));
    this.el.querySelector('#addInteractionFromInspector')?.addEventListener('click',()=>document.querySelector('[data-left-tab="interaction"]')?.click());
    this.el.querySelectorAll('[data-device-pick]').forEach(button=>button.addEventListener('click',()=>this.setDevice(button.dataset.devicePick)));
    this.el.querySelector('#elementCodeBtn')?.addEventListener('click',()=>{
      const node=this.store.find(nodeId)?.node;if(!node)return;
      const body=`<div class="field"><label>HTML</label><textarea readonly style="height:180px">${esc(nodeHtml(node,this.store.project.theme,this.store.project,this.device))}</textarea></div>`;
      showModal(document.getElementById('modalHost'),{title:'كود العنصر',body,actions:[]});
    });
  }
  updateField(nodeId,input){
    const key=input.dataset.prop;
    const numeric=input.dataset.kind==='number';
    const value=numeric?(input.value===''?0:Number(input.value)):input.value;
    this.store.transact('تعديل العنصر',project=>{
      const hit=findNodeGlobal(project,nodeId);if(!hit)return;
      if(STYLE_KEYS.has(key)){
        if(this.store.ui.advancedDevices&&this.device!=='desktop'){
          hit.node.responsive={...(hit.node.responsive||{})};
          hit.node.responsive[this.device]={...(hit.node.responsive[this.device]||{}),[key]:value};
          if(project.settings.propagateDevices)propagateStyle(hit.node,this.device,{[key]:value});
        }else hit.node.style={...(hit.node.style||{}),[key]:value};
      }else hit.node.props={...(hit.node.props||{}),[key]:value};
    });
  }
}