import {makeNode} from '../core/model.js';
import {textToLines} from '../core/utils.js';

export const categories=[['basic','أساسي'],['layout','تخطيط'],['media','وسائط'],['forms','نماذج'],['ui','واجهة'],['data','بيانات'],['visual','زخرفة']];
const iconMap={heading:'H',text:'T',button:'↗',link:'🔗',image:'▧',card:'□',section:'▦',container:'▣',grid:'▤',columns:'Ⅱ',stack:'≡',hero:'✦',navbar:'☰',footer:'▰',form:'☷',input:'⌨',textarea:'▤',select:'▾',checkbox:'✓',gallery:'▧',carousel:'◀',video:'▶',audio:'♪',table:'▤',stats:'123',pricing:'$',testimonial:'★',faq:'?',alert:'!',badge:'●',quote:'❝',list:'☷',divider:'—',spacer:'↕',tabs:'▤',accordion:'⌄',modal:'□',dropdown:'⌄',timeline:'↝',progress:'◐',rating:'★★★★★',counter:'01',social:'◎',gradient:'◩',glass:'◈',marquee:'→'};
const def=(type,label,category,description,factory)=>({type,label,category,description,icon:iconMap[type]||'◇',factory});

const textNode=t=>makeNode('text',{text:t},{fontSize:16,color:'#5d6678',lineHeight:1.8,align:'right'});
const headingNode=t=>makeNode('heading',{text:t},{fontSize:42,fontWeight:800,color:'#171b2a',lineHeight:1.15,align:'right'});
const buttonNode=(t,url='#')=>makeNode('button',{text:t,url,action:'url'},{background:'#5b5ce2',color:'#fff',fontSize:13,fontWeight:800,paddingY:11,paddingX:20,radius:11,align:'right'});
const linkNode=(t,url='#')=>makeNode('link',{text:t,url},{color:'#5b5ce2',fontSize:12,underline:false,align:'right'});
const imageNode=(label='صورة توضيحية')=>makeNode('image',{src:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="700"><defs><linearGradient id="g" x1="0" x2="1"><stop stop-color="#ececff"/><stop offset="1" stop-color="#e7f3ef"/></linearGradient></defs><rect width="1200" height="700" fill="url(#g)"/><rect x="120" y="130" width="960" height="430" rx="35" fill="#fff" opacity=".75"/><circle cx="360" cy="300" r="85" fill="#5b5ce2" opacity=".18"/><rect x="520" y="245" width="360" height="26" rx="13" fill="#7376ec" opacity=".35"/><rect x="520" y="300" width="260" height="18" rx="9" fill="#9ba0b1" opacity=".42"/><text x="600" y="420" font-family="Arial" font-size="42" fill="#5b5ce2" text-anchor="middle">${label}</text></svg>`),alt:label},{width:'100%',height:300,radius:16,objectFit:'cover'});

export const definitions=[
 def('heading','عنوان','basic','عنوان رئيسي أو فرعي',()=>headingNode('عنوان جديد')),
 def('text','نص','basic','فقرة وصفية قابلة للتحرير',()=>textNode('اكتب نصًا واضحًا ومفيدًا هنا.')),
 def('button','زر','basic','زر لتنفيذ إجراء',()=>buttonNode('ابدأ الآن')),
 def('link','رابط','basic','رابط داخلي أو خارجي',()=>linkNode('اقرأ المزيد')),
 def('quote','اقتباس','basic','اقتباس بارز',()=>makeNode('quote',{text:'جملة أو اقتباس مهم.'},{background:'#f6f7fb',color:'#525a6d',padding:20,radius:14})),
 def('list','قائمة','basic','قائمة نقاط أو عناصر',()=>makeNode('list',{items:'الميزة الأولى\nالميزة الثانية\nالميزة الثالثة'},{color:'#5d6678',lineHeight:1.9})),
 def('divider','فاصل','basic','فاصل بصري',()=>makeNode('divider',{}, {color:'#e3e6ef',height:1,marginTop:18,marginBottom:18})),
 def('spacer','مساحة','basic','فراغ منظم',()=>makeNode('spacer',{}, {height:40})),
 def('section','قسم','layout','قسم واسع للمحتوى',()=>makeNode('section',{}, {background:'#f7f8fc',padding:40,radius:0})),
 def('container','حاوية','layout','حاوية عرض منظم',()=>makeNode('container',{}, {maxWidth:1040,padding:0})),
 def('grid','شبكة','layout','شبكة أعمدة وبطاقات',()=>makeNode('grid',{count:3,gap:16},{display:'grid',gridTemplateColumns:'repeat(3,1fr)'})),
 def('columns','أعمدة','layout','توزيع أفقي',()=>makeNode('columns',{count:2,gap:18},{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))'})),
 def('stack','مجموعة','layout','ترتيب رأسي',()=>makeNode('stack',{gap:12},{display:'flex',flexDirection:'column'})),
 def('hero','واجهة افتتاحية','layout','قسم افتتاحي جاهز',()=>makeNode('hero',{}, {background:'linear-gradient(135deg,#f4f4ff,#edf7f2)',padding:58,radius:0},[headingNode('ابنِ صفحة تليق بفكرتك'),textNode('صمّم بسرعة، خصص ببساطة، وعاين النتيجة كما يراها الزائر.'),buttonNode('ابدأ الآن')])),
 def('card','بطاقة','ui','بطاقة محتوى',()=>makeNode('card',{title:'عنوان البطاقة',text:'وصف قصير مفيد.',button:'اعرف المزيد'},{background:'#fff',border:'1px solid #e7e9ef',padding:20,radius:15,shadow:true})),
 def('navbar','شريط تنقل','ui','تنقل الموقع',()=>makeNode('navbar',{brand:'بَنّاء',links:['الرئيسية','من نحن','الخدمات','تواصل']},{background:'#fff',paddingY:15,paddingX:22,borderBottom:'1px solid #eceef3'})),
 def('footer','تذييل','ui','نهاية الموقع',()=>makeNode('footer',{brand:'بَنّاء',text:'صُمم ببَنّاء — كل الحقوق محفوظة.'},{background:'#151924',color:'#fff',padding:28})),
 def('tabs','تبويبات','ui','تنقل داخلي بين محتويات',()=>makeNode('tabs',{items:['نبذة','المميزات','الأسئلة']},{background:'#fff',border:'1px solid #e9ebf1',padding:14,radius:12})),
 def('accordion','أسئلة شائعة','ui','أسئلة تفتح وتغلق',()=>makeNode('accordion',{items:['ما هو بَنّاء؟','هل أستطيع تنزيل موقعي؟','هل أحتاج إلى برمجة؟']},{background:'#fff',border:'1px solid #e6e8ef',padding:14,radius:12})),
 def('modal','نافذة منبثقة','ui','نافذة تفاعلية',()=>makeNode('modal',{title:'رسالة',text:'هذا محتوى النافذة.'},{background:'#fff',border:'1px solid #e6e8ef',padding:20,radius:14,shadow:true})),
 def('dropdown','قائمة منسدلة','ui','قائمة خيارات تفاعلية',()=>makeNode('dropdown',{label:'اختر خيارًا',items:['الخيار الأول','الخيار الثاني','الخيار الثالث']},{background:'#fff',border:'1px solid #e6e8ef',padding:10,radius:10})),
 def('breadcrumb','مسار الصفحة','ui','توضيح مكان المستخدم',()=>makeNode('breadcrumb',{items:['الرئيسية','قسم','صفحة']},{color:'#7a8292',fontSize:10})),
 def('alert','تنبيه','ui','رسالة حالة',()=>makeNode('alert',{tone:'info',text:'هذه رسالة تنبيه مفيدة للمستخدم.'},{background:'#eef3ff',color:'#4e61a6',padding:14,radius:11})),
 def('badge','شارة','ui','وسم صغير',()=>makeNode('badge',{text:'جديد'},{background:'#f0f0ff',color:'#5759c9',paddingY:5,paddingX:10,radius:99,fontSize:9,fontWeight:800})),
 def('progress','تقدم','ui','نسبة إنجاز',()=>makeNode('progress',{value:72,label:'التقدم 72%'},{color:'#5b5ce2'})),
 def('stats','إحصاءات','ui','أرقام سريعة',()=>makeNode('stats',{items:[['+120','مشروع'],['98%','رضا'],['24','قالب']]},{background:'#fff',padding:18,radius:14,border:'1px solid #e7e9ef'})),
 def('timeline','خط زمني','ui','مراحل متتابعة',()=>makeNode('timeline',{items:[['01','الفكرة'],['02','التصميم'],['03','الإطلاق']]},{color:'#5b5ce2'})),
 def('pricing','خطط الأسعار','ui','بطاقات اشتراك',()=>makeNode('pricing',{plans:[['أساسي','مجاني'],['احترافي','$12'],['فريق','$29']]},{background:'#fff'})),
 def('testimonial','رأي عميل','ui','شهادة مستخدم',()=>makeNode('testimonial',{quote:'الأداة جعلت بناء الصفحة أوضح وأسرع.',name:'عميل تجريبي'},{background:'#f8f8ff',padding:20,radius:14})),
 def('image','صورة','media','صورة مع وصف',()=>imageNode('صورة الموقع')),
 def('gallery','معرض','media','شبكة صور',()=>makeNode('gallery',{count:6},{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10})),
 def('carousel','شريط صور','media','تنقل بين شرائح',()=>makeNode('carousel',{index:0,slides:['الشريحة الأولى','الشريحة الثانية','الشريحة الثالثة']},{background:'#f7f8fc',padding:20,radius:14})),
 def('video','فيديو','media','فيديو قابل للتضمين',()=>makeNode('video',{url:'https://www.youtube.com/embed/dQw4w9WgXcQ',title:'فيديو'},{height:260,radius:14,background:'#161a25'})),
 def('audio','صوت','media','مشغل صوت',()=>makeNode('audio',{src:'',title:'ملف صوتي'},{padding:14})),
 def('form','نموذج','forms','نموذج إدخال كامل',()=>makeNode('form',{}, {background:'#fff',border:'1px solid #e6e8ef',padding:20,radius:14},[
   makeNode('input',{label:'الاسم',type:'text',placeholder:'اكتب اسمك'},{marginBottom:9}),
   makeNode('input',{label:'البريد الإلكتروني',type:'email',placeholder:'name@example.com'},{marginBottom:9}),
   makeNode('textarea',{label:'الرسالة',placeholder:'اكتب رسالتك…'},{marginBottom:9}),
   makeNode('checkbox',{label:'أوافق على الشروط'},{marginBottom:10}),
   buttonNode('إرسال','#')
 ])),
 def('input','حقل نص','forms','حقل إدخال',()=>makeNode('input',{label:'حقل نص',type:'text',placeholder:'اكتب هنا…'},{background:'#fff'})),
 def('textarea','منطقة نص','forms','إدخال متعدد الأسطر',()=>makeNode('textarea',{label:'رسالتك',placeholder:'اكتب هنا…'},{background:'#fff'})),
 def('select','اختيار','forms','قائمة اختيارات',()=>makeNode('select',{label:'اختر خيارًا',items:['الأول','الثاني','الثالث']},{background:'#fff'})),
 def('checkbox','مربع اختيار','forms','اختيار واحد أو أكثر',()=>makeNode('checkbox',{label:'أوافق على الشروط'},{color:'#5d6678'})),
 def('radio','خيارات','forms','اختيار واحد',()=>makeNode('radio',{label:'الخيار الأول'},{color:'#5d6678'})),
 def('search','بحث','forms','بحث داخل الموقع',()=>makeNode('search',{label:'بحث',type:'search',placeholder:'ابحث…'},{background:'#fff'})),
 def('file','رفع ملف','forms','رفع ملف من الجهاز',()=>makeNode('file',{label:'رفع ملف',type:'file'},{background:'#fff'})),
 def('table','جدول','data','جدول بيانات',()=>makeNode('table',{headers:['البند','الحالة','القيمة'],rows:[['صفحة','جاهزة','100%'],['تفاعل','جاهز','80%'],['تصدير','جاهز','100%']]},{background:'#fff',border:'1px solid #e6e8ef',padding:10,radius:12})),
 def('chart','مخطط','data','مخطط مبسط',()=>makeNode('chart',{values:[40,65,52,78,90],labels:['ينا','فبر','مار','أبر','ماي']},{background:'#fff',padding:16,radius:14,border:'1px solid #e7e9ef'})),
 def('calendar','تقويم','data','تقويم بسيط',()=>makeNode('calendar',{month:'هذا الشهر'},{background:'#fff',padding:15,radius:14,border:'1px solid #e7e9ef'})),
 def('product','منتج','data','بطاقة منتج',()=>makeNode('product',{name:'منتج تجريبي',price:'49 ر.س',cta:'أضف إلى السلة'},{background:'#fff',padding:16,radius:14,border:'1px solid #e7e9ef'})),
 def('faq','سؤال شائع','data','عنصر سؤال/إجابة',()=>makeNode('faq',{question:'ما الذي أستطيع فعله هنا؟',answer:'يمكنك بناء موقع متعدد الصفحات وتخصيصه.'},{background:'#fff',padding:16,radius:14,border:'1px solid #e7e9ef'})),
 def('rating','تقييم','data','تقييم بالنجوم',()=>makeNode('rating',{value:4,label:'4 من 5'},{color:'#e3a21a',fontSize:16})),
 def('counter','عداد','data','عداد رقمي',()=>makeNode('counter',{value:1250,suffix:'+'},{color:'#5b5ce2',fontSize:32,fontWeight:800})),
 def('social','روابط اجتماعية','data','روابط المنصات',()=>makeNode('social',{items:['X','Instagram','LinkedIn']},{color:'#5d5ce2'})),
 def('gradient','تدرج','visual','خلفية متدرجة',()=>makeNode('gradient',{}, {height:120,background:'linear-gradient(135deg,#5b5ce2,#20a06a)',radius:14})),
 def('glass','بطاقة زجاجية','visual','تأثير زجاجي',()=>makeNode('glass',{text:'محتوى زجاجي'},{background:'rgba(255,255,255,.65)',backdropFilter:'blur(10px)',padding:22,radius:16,border:'1px solid rgba(255,255,255,.7)'})),
 def('marquee','نص متحرك','visual','شريط نص بسيط',()=>makeNode('marquee',{text:'بَنّاء • تصميم • تفاعل • تصدير'},{background:'#171b2a',color:'#fff',padding:12,radius:10,animation:'marquee'}))
].filter(Boolean);
export const definitionsByType=Object.fromEntries(definitions.map(x=>[x.type,x]));
export const factory=(type)=>definitionsByType[type]?.factory?.()||makeNode(type,{label:type});
export function searchDefinitions(q='',category='all'){const n=q.trim().toLowerCase();return definitions.filter(d=>(category==='all'||d.category===category)&&(!n||(`${d.label} ${d.description} ${d.type}`).toLowerCase().includes(n)))}
export const supportedTypes=new Set(definitions.map(d=>d.type));
export const nodeIcon=type=>iconMap[type]||'◇';
export const simpleNodeTypes=definitions.filter(d=>['basic','layout','ui','media'].includes(d.category)).map(d=>d.type);
