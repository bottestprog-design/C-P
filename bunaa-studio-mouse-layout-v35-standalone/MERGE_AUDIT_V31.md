# V31 Merge Audit — preservation check

## Base and scope

The base was the standalone V30 ZIP. The current V31 tree was compared against its complete ZIP member-path set before adding V31 audit documents.

- V30 project files: 71
- V31 working tree before adding this audit/report: 71
- V30 files missing from V31: **0**
- New files in V31 working tree at the comparison point: **0**
- New additive V31 documents subsequently added: `QA_REPORT_V31.md`, `MERGE_AUDIT_V31.md`

No source module, asset, test, HTML entry point or historical QA report was removed.

## Existing functionality kept

- Original project shell, account/guest entry, project creation, elements library and inspector.
- Page management, design tokens and themes, assets, CMS/navigation and secondary tools.
- Compact toolbar with older actions in More.
- Multi-stop linear/radial gradient editor and export path.
- Content-aware editor page height, element drag, all eight resize grips, per-device positions and undo/redo.
- Preview dialog and website ZIP export.
- All 49 original mirrored JavaScript source modules and standalone generated files.

## V31 source changes

- `source/src/src/ui/dialogs.js`: rebuilds preview from the same project renderer and site stylesheet for the chosen viewport; uses per-device node styles/positions and avoids a duplicate synthetic navbar when the project includes a user-authored navbar.
- `source/src/src/engine/preview-router.js`: runs preview interactions across the editor's supported event/action vocabulary, including input/focus/keyboard and media/scroll triggers.
- `source/src/src/engine/exporter.js`: shared responsive CSS/metadata, adaptive device styles/positions, and V31 generator metadata.
- `source/src/src/engine/workspace.js`: ensures the scaled scroll host tracks the actual stage/page height; content height changes follow drag/resize.
- `tests/editor_browser_test.py`: adds functional assertions for same-element canvas/preview parity, responsive device-specific styles/positions, phone width adaptation, bottom-of-page resizing/scroll, and non-button/input interactions.
- `tests/verify_project.py`, `build_bundle.py`, `README.md`, `START_HERE.md`: version/build/check documentation updates.

`index.html`, `Bunaa.html`, and `bundle-extracted.js` are regenerated from the retained 49 source modules, and historical QA reports are kept unmodified.
