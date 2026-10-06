# بَنّاء V11 — Phase 3 Architecture

هذه النسخة مبنية على V11 كخط أساس مع تقسيم فعلي إلى طبقات صغيرة واضحة:

```text
index.html
styles/app.css
src/main.js
│
├── core/
│   ├── model.js       Document Model + normalization + tree utilities
│   ├── store.js       State + history + persistence + page helpers
│   ├── commands.js    Mutations/commands for nodes/pages/styles
│   └── utils.js       General pure helpers
│
├── catalog/
│   ├── components.js  Component registry + factories + search
│   └── templates.js   Ready-made websites/sections
│
├── engine/
│   ├── renderer.js    Visual renderer + preview markup
│   ├── layout.js      Responsive layout resolution + propagation
│   ├── interaction.js Interaction runtime + motion presets
│   └── exporter.js    Clean export + self-contained ZIP writer
│
└── ui/
    ├── modal.js       Reusable modal primitive
    ├── panels.js      Elements/layers/interactions/templates/assets/pages
    ├── inspector.js   Contextual inspector + advanced device controls
    └── dialogs.js     Preview/export/quality/theme/shortcuts
```

المصدر الأساسي للحقيقة هو Document Model؛ الـDOM يستخدم كعرض، وليس كمخزن للحالة. كل تعديل مهم يمر عبر Store/Commands بحيث يمكن حفظه والتراجع عنه وإعادة تطبيقه.

الصفحات مستقلة، والقوالب تُحوّل إلى نسخ جديدة بمعرفات جديدة، والتفاعلات تشير إلى `sourceId/targetId/pageId` بدل ربطها بعناصر DOM عابرة.

الـResponsive موحّد افتراضيًا. تخصيص الجهاز المنفصل لا يظهر إلا عند تفعيل الإعدادات المتقدمة، ومزامنة الأجهزة تعيد حساب القيم الرقمية وفق الجهاز المستهدف بدل نسخها كما هي.

التصدير يولد HTML/CSS/JS وJSON وREADME، ويحوي الصفحات كملفات منفصلة داخل ZIP بدون metadata خاصة بالمحرر في HTML الناتج.
