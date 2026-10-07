# بَنّاء — Visual Builder Pro Static

نسخة Static محلية منظمة، تفتح مباشرة من `index.html` بدون Node.js أو npm أو BAT.

## البنية
- `index.html` الواجهة.
- `styles.css` التصميم.
- `app.js` boot وDiagnostics.
- `js/core.js` utilities.
- `js/model.js` schema + tree + layout model + migration.
- `js/catalog.js` مكتبة العناصر.
- `js/store.js` state/history/persistence.
- `js/renderer.js` DOM rendering + measurement.
- `js/interactions.js` interaction runtime.
- `js/editor.js` editor/controller للـcanvas والسحب والـresize والـzoom.
- `js/ui.js` المكتبة والطبقات والمفتش.
- `js/exporter.js` تصدير HTML/JSON.

## مبادئ التصميم
يستخدم المشروع أفكارًا عامة شائعة في محررات الواجهات الكبرى: Hug/Fill/Fixed sizing، Block/Flex/Grid، nesting، Navigator، multi-selection، alignment، responsive device preview، interaction preview، والـundo/redo.

## التشغيل
افتح `index.html` مباشرة.

## تشخيص سريع
بعد التشغيل في Console:
`BunaaDiagnostics()`
