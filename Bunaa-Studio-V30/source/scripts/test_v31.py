from pathlib import Path
import re, subprocess, sys
ROOT=Path(__file__).resolve().parents[2]
source=ROOT/'source'
workspace=(source/'src/engine/workspace.js').read_text(encoding='utf-8')
commands=(source/'src/core/commands.js').read_text(encoding='utf-8')
renderer=(source/'src/engine/renderer.js').read_text(encoding='utf-8')
assert 'beginMove(e)' in workspace and 'beginResize(e)' in workspace and 'refreshManipulatorOverlay' in workspace
assert 'data-resize' in workspace and 'groupSelected()' in workspace and 'ungroupSelected()' in workspace
assert 'exports.groupNodes = groupNodes' in commands and 'exports.ungroupNode = ungroupNode' in commands
assert "img.style.objectFit=node.props?.fit==='contain'?'contain':'cover'" in renderer
bundle=(source/'bunaa.bundle.js').read_text(encoding='utf-8')
for marker in ['beginMove(e)','beginResize(e)','groupNodes','ungroupNode','bunaa-direct-manipulation-css']:
    assert marker in bundle, f'missing bundle marker: {marker}'
for name in ['index.html','Bunaa.html']:
    html=(ROOT/name).read_text(encoding='utf-8')
    scripts=re.findall(r'<script\\b[^>]*>([\\s\\S]*?)</script\\s*>',html,re.I)
    assert len(scripts)==1, f'{name}: expected one inline script, got {len(scripts)}'
    assert 'Bunaa Studio V31' in html, f'{name}: version label not bumped'
print('V31 contract checks passed: direct move/resize, image fit, grouping/ungrouping, embedded HTML')
