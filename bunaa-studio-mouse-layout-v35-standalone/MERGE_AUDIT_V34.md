# Bunaa Studio V34 — تقرير الحفاظ على الملفات والدمج

تمت المقارنة آليًا مع `bunaa-studio-mouse-layout-v33-standalone.zip` على مستوى مسارات الملفات ومحتوياتها. لم تُجرَ أي كتابة إلى GitHub.

- مسارات V33 السابقة: **78**
- المسارات السابقة المفقودة: **0**
- المسارات السابقة التي تغيّر محتواها عمدًا للتطوير/التوثيق/الاختبار: **13**
- الملفات الجديدة في V34: **7**
- وحدات JavaScript المصدرية: **49**

## ملفات سابقة تغيّر محتواها

- `Bunaa.html`
- `README.md`
- `SHA256.txt`
- `START_HERE.md`
- `build_bundle.py`
- `bundle-extracted.js`
- `index.html`
- `source/README.md`
- `source/src/src/engine/exporter.js`
- `source/src/src/engine/workspace.js`
- `source/src/src/ui/dialogs.js`
- `tests/editor_browser_test.py`
- `tests/verify_project.py`

## ملفات جديدة

- `MERGE_AUDIT_V34.md`
- `QA_REPORT_V34.md`
- `tests/browser-results-v34.json`
- `tests/export-results-v34.txt`
- `tests/media-helper-results-v34.txt`
- `tests/test_v34_export_browser.py`
- `tests/verify-results-v34.txt`

لم تُحذف ملفات V33. يشمل التعديل إصلاح احتواء مساحة الرسم، والتحويل من الزاوية العليا اليسرى لمنع الانزياح، وملاءمة تلقائية عند فتح المحرر وتغيير عرض نافذة العمل، وتصدير HTML مستقل لجميع الصفحات مع اختيار الصفحة الافتتاحية، وتصدير ZIP متعدد الصفحات والوسائط، واختبارات وتوثيق الإصدار الجديد.

راجع `QA_REPORT_V34.md` لنتائج الاختبارات والقيود المعروفة.
