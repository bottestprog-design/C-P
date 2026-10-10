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
