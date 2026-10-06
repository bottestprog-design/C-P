import {findNodeGlobal} from '../core/model.js';
import {DEVICE_ORDER,propagateStyle} from '../engine/layout.js';
import {showModal} from './modal.js';
import {nodeHtml} from '../engine/renderer.js';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export class Inspector{
  constructor(store){this.store=store;this.device='desktop';this.advanced=false;store.subscribe(()=>this.render())}
  mount(el){this.el=el;this.render()}
  setDevice(d){this.device=d;this.render()}
  section(title,body){return `<section class="inspector-section"><header><b>${title}</b><span>${this.store.ui.advancedDevices&&this.device!=='desktop'?'خاص بالجهاز':'مشترك'}</span></header><div class="inspector-body">${body}</div></section>`}
  field(label,key,value,type='text',extra=''){return `<div class="field"><label>${label}</label><input data-prop="${key}" data-kind="${type}" value="${esc(value??'')}" ${extra}></div>`}
  contentFields(n){const p=n.props||{};let html='';
    if(['heading','text','quote','badge','alert','button','link','marquee'].includes(n.type))html+=this.field(n.type==='heading'?'العنوان':'النص','text',p.text||p.title||'');
    if(['button','link'].includes(n.type))html+=`<div class="field"><label>الوجهة</label><select data-prop="url"><option value="#" ${p.url==='#'?'selected':''}>لا توجد وجهة</option><option value="${p.url?.startsWith('http')?esc(p.url):'#'}" ${p.url?.startsWith('http')?'selected':''}>رابط خارجي</option>${this.store.project.pages.map(pg=>`<option value="page:${pg.id}" ${p.url===`page:${pg.id}`?'selected':''}>صفحة: ${esc(pg.name)}</option>`).join('')}</select></div>`;
    if(n.type==='image')html+=this.field('مصدر الصورة','src',p.src||'')+this.field('الوصف البديل','alt',p.alt||'');
    if(['input','textarea','select'].includes(n.type))html+=this.field('اسم الحقل','label',p.label||'')+this.field('النص المساعد','placeholder',p.placeholder||'');
    if(n.type==='card')html+=this.field('العنوان','title',p.title||'')+this.field('الوصف','text',p.text||'')+this.field('نص الزر','button',p.button||'');
    if(n.type==='navbar')html+=this.field('اسم العلامة','brand',p.brand||'');
    if(!html)html=this.field('اسم وصفي','label',p.label||'');
    return html;
  }
  styleFields(n){const s=n.style||{};return this.field('لون النص','color',s.color||'')+this.field('الخلفية','background',s.background||'')+`<div class="field-row">${this.field('حجم النص','fontSize',s.fontSize??'', 'number')}${this.field('الاستدارة','radius',s.radius??'', 'number')}</div><div class="field-row">${this.field('هامش أعلى','marginTop',s.marginTop??0,'number')}${this.field('هامش أسفل','marginBottom',s.marginBottom??14,'number')}</div>`}
  behaviorFields(){return `<div class="sync-row"><span>مزامنة تخصيص الأجهزة</span><input id="deviceSync" type="checkbox" ${this.store.project.settings.propagateDevices?'checked':''}></div><button class="advanced-toggle" id="addInteractionFromInspector">⚡ تخصيص التفاعل</button>`}
  advancedFields(n){const s=n.style||{};return this.section('التخصيص المتقدم',`${this.field('العرض','width',s.width||'')}${this.field('الارتفاع','height',s.height??'', 'number')}<div class="field-row">${this.field('الفجوة','gap',s.gap??'', 'number')}${this.field('العتامة','opacity',s.opacity??1,'number')}</div><div class="field"><label>الجهاز</label><div class="segmented">${DEVICE_ORDER.map(d=>`<button data-device-pick="${d}" class="${d===this.device?'active':''}">${d}</button>`).join('')}</div></div><div class="tips-card"><b>تخصيص متوافق</b><p>عند تفعيل المزامنة، القيم الرقمية تنتقل لباقي الأجهزة بنسبة مناسبة بدل نسخ القيمة كما هي.</p></div>`) }
  render(){if(!this.el)return;const id=this.store.ui.selected;const hit=id?findNodeGlobal(this.store.project,id):null;if(!hit){this.el.classList.add('hidden');document.getElementById('inspectorEmpty')?.classList.remove('hidden');return}document.getElementById('inspectorEmpty')?.classList.add('hidden');this.el.classList.remove('hidden');document.getElementById('inspectorTitle').textContent=hit.node.props?.label||hit.node.props?.title||hit.node.props?.text||hit.node.type;this.el.innerHTML=`${this.section('المحتوى',this.contentFields(hit.node))}${this.section('المظهر',this.styleFields(hit.node))}${this.section('السلوك',this.behaviorFields())}<button class="advanced-toggle" id="advancedInspectorToggle">${this.advanced?'إخفاء التخصيص المتقدم':'إظهار التخصيص المتقدم'}</button>${this.advanced?this.advancedFields(hit.node):''}${this.store.ui.mode==='trainee'?'<button class="advanced-toggle" id="elementCodeBtn">&lt;/&gt; عرض كود العنصر</button>':''}`;this.wire(hit.node)}
  wire(node){
    for(const input of this.el.querySelectorAll('[data-prop]'))input.addEventListener('change',()=>{const key=input.dataset.prop;let val=input.dataset.kind==='number'?(input.value===''?0:Number(input.value)):input.value;this.store.transact('تعديل العنصر',p=>{const find=(nodes)=>{for(const n of nodes){if(n.id===node.id)return n;const f=find(n.children||[]);if(f)return f}return null};const h=find((p.pages.find(pg=>pg.id===p.activePageId)||{}).nodes||[]);if(!h)return;if(['color','background','fontSize','radius','marginTop','marginBottom','width','height','gap','opacity'].includes(key)){h.style=h.style||{};if(this.store.ui.advancedDevices){h.responsive=h.responsive||{};h.responsive[this.device]={...(h.responsive[this.device]||{}),[key]:val};if(p.settings.propagateDevices&&this.store.ui.advancedDevices)propagateStyle(h,this.device,{[key]:val})}else h.style[key]=val}else h.props=h.props||{};if(!['color','background','fontSize','radius','marginTop','marginBottom','width','height','gap','opacity'].includes(key))h.props[key]=val});this.store.emit()});
    this.el.querySelector('#advancedInspectorToggle')?.addEventListener('click',()=>{this.advanced=!this.advanced;this.render()});
    this.el.querySelector('#deviceSync')?.addEventListener('change',e=>{this.store.project.settings.propagateDevices=e.target.checked;this.store.setUI({})});
    this.el.querySelector('#addInteractionFromInspector')?.addEventListener('click',()=>document.querySelector('[data-left-tab="interaction"]')?.click());
    this.el.querySelectorAll('[data-device-pick]').forEach(b=>b.addEventListener('click',()=>{this.device=b.dataset.devicePick;this.render()}));
    this.el.querySelector('#elementCodeBtn')?.addEventListener('click',()=>{const body=`<div class="field"><label>HTML</label><textarea readonly style="height:180px">${esc(nodeHtml(node,this.store.project.theme,this.store.project,this.device))}</textarea></div><div class="tips-card"><b>وضع المتدرب</b><p>هذا الكود يمثل العنصر داخل محرك بَنّاء. التعديل الأساسي منظم عبر النموذج البصري.</p></div>`;showModal(document.getElementById('modalHost'),{title:'كود العنصر',body,actions:[]})});
  }
}
