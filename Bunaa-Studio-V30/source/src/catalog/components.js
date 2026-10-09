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
