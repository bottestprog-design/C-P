import {makeNode,makePage} from '../core/model.js';
import {uid,deepClone} from '../core/utils.js';
import {factory} from './components.js';

const localImage=()=>factory('image');
const hero=()=>factory('hero');
const card=()=>factory('card');
const heading=(text)=>makeNode('heading',{text},{fontSize:38,fontWeight:800,color:'#171b2a',align:'right'});
const text=(text)=>makeNode('text',{text},{fontSize:14,color:'#636c7e',lineHeight:1.8,align:'right'});
const button=(text,url='#')=>makeNode('button',{text,url,action:'url'},{background:'#5b5ce2',color:'#fff',fontSize:12,fontWeight:800,paddingY:10,paddingX:18,radius:10,align:'right'});
const section=(children,style={})=>makeNode('section',{}, {background:'#fff',padding:42,...style},children);
const grid=(children,count=3)=>makeNode('grid',{count,gap:16},{display:'grid',gridTemplateColumns:`repeat(${count},minmax(0,1fr))`,gap:16},children);
const navbar=()=>makeNode('navbar',{brand:'بَنّاء',links:['الرئيسية','الخدمات','من نحن','تواصل']},{background:'#fff',paddingY:14,paddingX:22,borderBottom:'1px solid #e7e9ef'});
const footer=()=>makeNode('footer',{brand:'بَنّاء',text:'كل الحقوق محفوظة.'},{background:'#151924',color:'#fff',padding:28});

function landing(){return {name:'Landing احترافي',description:'صفحة هبوط كاملة للشركات والمنتجات.',thumbnail:'linear',pages:[makePage('الرئيسية',[navbar(),hero(),section([heading('لماذا بَنّاء؟'),text('كل ما تحتاجه لبناء موقع سريع وواضح وقابل للتخصيص.'),grid([card(),card(),card()])]),section([heading('جاهز للانطلاق؟'),text('حوّل فكرتك إلى موقع يعمل الآن.'),button('ابدأ مجانًا')],{background:'#f5f6ff'}),footer()],'home')]}}
function agency(){return {name:'شركة وخدمات',description:'صفحة شركة مع خدمات وأرقام وشهادات.',thumbnail:'agency',pages:[makePage('الرئيسية',[navbar(),section([hero()]),section([heading('خدماتنا'),grid([card(),card(),card()],3)]),section([heading('نتائج نعتز بها'),factory('stats'),factory('testimonial')],{background:'#f7f8fb'}),footer()]),makePage('الخدمات',[navbar(),section([heading('الخدمات'),text('مجموعة خدمات عملية يمكنك تعديلها.'),grid([card(),card(),card(),card()],2)]),footer()]),makePage('تواصل',[navbar(),section([heading('تواصل معنا'),factory('form')]),footer()])]}}
function portfolio(){return {name:'معرض أعمال',description:'صفحة أعمال ومشاريع قابلة للعرض.',thumbnail:'portfolio',pages:[makePage('الرئيسية',[navbar(),hero(),section([heading('أعمال مختارة'),grid([localImage(),localImage(),localImage(),localImage()],2)]),section([heading('من عملائنا'),factory('testimonial'),factory('rating')]),footer()]) ]}}
function store(){return {name:'متجر بسيط',description:'واجهة متجر ببطاقات منتجات وأسعار.',thumbnail:'store',pages:[makePage('الرئيسية',[navbar(),section([heading('منتجات مختارة'),text('اختر ما يناسبك بسهولة.'),grid([factory('product'),factory('product'),factory('product')])]),section([heading('الأسئلة الشائعة'),factory('accordion')]),footer()]),makePage('منتج',[navbar(),section([localImage(),heading('منتج مميز'),text('وصف المنتج وسعره ومعلوماته.'),button('أضف إلى السلة')]),footer()])]}}
function education(){return {name:'تعليمي',description:'صفحة تعليمية مع وحدات ومراحل.',thumbnail:'edu',pages:[makePage('الدروس',[navbar(),section([heading('تعلم خطوة بخطوة'),factory('progress'),grid([card(),card(),card()],3)]),section([heading('الأسئلة الشائعة'),factory('faq'),factory('faq')]),footer()]),makePage('عن الدورة',[navbar(),section([hero()]),section([heading('المحتوى'),factory('timeline')]),footer()])]}}
function blog(){return {name:'مدونة',description:'قالب مقالات مع بطاقات وتصنيفات.',thumbnail:'blog',pages:[makePage('الرئيسية',[navbar(),section([heading('آخر المقالات'),grid([card(),card(),card(),card()],2)]),section([heading('اشترك'),factory('input'),button('اشتراك')],{background:'#f7f8fb'}),footer()]),makePage('مقال',[navbar(),section([heading('عنوان المقال'),text('محتوى المقال التجريبي…'),text('يمكنك استبدال النص وإضافة صور ومحتويات أخرى.')]),footer()])]}}
function dashboard(){return {name:'لوحة تحكم',description:'واجهة بيانات وإحصاءات.',thumbnail:'dashboard',pages:[makePage('لوحة البيانات',[navbar(),section([heading('ملخص اليوم'),factory('stats'),grid([factory('chart'),factory('chart')],2)]),section([heading('العمليات الأخيرة'),factory('table')]),footer()])]}}
function restaurant(){return {name:'مطعم',description:'صفحة مطعم مع قائمة وطريقة تواصل.',thumbnail:'food',pages:[makePage('الرئيسية',[navbar(),section([hero()]),section([heading('قائمة اليوم'),grid([card(),card(),card(),card()],2)]),section([heading('احجز طاولتك'),factory('form')]),footer()])]}}
function personal(){return {name:'شخصي',description:'صفحة تعريفية شخصية أنيقة.',thumbnail:'personal',pages:[makePage('الرئيسية',[section([heading('مرحبًا، أنا صاحب المشروع'),text('نبذة قصيرة يمكن تعديلها بسهولة.'),button('تواصل معي')]),section([heading('مهاراتي'),factory('progress'),factory('progress'),factory('progress')],{background:'#f7f8fb'}),footer()])]}}

export const templates=[landing(),agency(),portfolio(),store(),education(),blog(),dashboard(),restaurant(),personal()];
export const templateByName=n=>templates.find(t=>t.name===n);
export function materializeTemplate(template){const t=deepClone(template);for(const page of t.pages){page.id=uid('page');page.nodes=(page.nodes||[]).map(n=>remapTree(n));page.slug=page.slug||page.name.toLowerCase().replace(/\s+/g,'-')||`page-${page.id.slice(-4)}`;page.seo={title:page.name,description:'',image:''}}return t}
function remapTree(n){const x=deepClone(n);x.id=uid('node');x.children=(x.children||[]).map(remapTree);return x}
export function validateTemplate(t){return !!t?.name&&Array.isArray(t.pages)&&t.pages.length>0&&t.pages.every(p=>p.name&&Array.isArray(p.nodes))}
