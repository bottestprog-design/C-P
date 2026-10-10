#!/usr/bin/env python3
"""Optional end-to-end Chromium test. Requires Python Playwright and a Chromium browser."""
from __future__ import annotations
import asyncio
import base64
import json
import os
import shutil
import zipfile
from pathlib import Path

try:
    from playwright.async_api import async_playwright
except ImportError as exc:
    raise SystemExit("Browser test requires the optional Python package 'playwright'.") from exc

ROOT = Path(__file__).resolve().parents[1]

async def run():
    chromium_path = os.environ.get("CHROMIUM_PATH") or shutil.which("chromium") or shutil.which("chromium-browser") or shutil.which("google-chrome")
    async with async_playwright() as pw:
        launch = {"headless": True, "args": ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"]}
        if chromium_path:
            launch["executable_path"] = chromium_path
        browser = await pw.chromium.launch(**launch)
        page = await browser.new_page(viewport={"width": 1440, "height": 960}, device_scale_factor=1)
        page.set_default_timeout(7000)
        page_errors, console_errors = [], []
        page.on("pageerror", lambda error: page_errors.append(str(error)))
        page.on("console", lambda message: console_errors.append(message.text) if message.type == "error" else None)
        await page.set_content((ROOT / "index.html").read_text(encoding="utf-8"), wait_until="load")
        assert await page.evaluate("!!window.__BUNAA_APP && !document.querySelector('#bunaaBootError')"), "App boot failed"
        assert await page.locator("#guestBtn").count() == 1
        await page.click("#guestBtn")
        await page.click("#newProjectBtn")
        await page.locator("#newProjectName").fill("Bunaa QA")
        await page.get_by_text("إنشاء المشروع", exact=True).click()
        await page.wait_for_selector("#pageCanvas .node-wrap")
        assert await page.locator("#pageCanvas .node-wrap").count() >= 1, "Template generated no nodes"

        # Non-scrolling toolbar and no document-level horizontal overflow at desktop/tablet/mobile widths.
        responsive_results = []
        for width in (1440, 1180, 900, 560, 390, 320):
            await page.set_viewport_size({"width": width, "height": 900})
            await page.wait_for_timeout(80)
            result = await page.locator(".topbar").evaluate("""e => ({width:innerWidth,height:e.getBoundingClientRect().height,scrollWidth:e.scrollWidth,clientWidth:e.clientWidth,overflowX:getComputedStyle(e).overflowX,documentWidth:document.documentElement.scrollWidth})""")
            assert result["scrollWidth"] <= result["clientWidth"] + 1, f"Toolbar overflows at {width}px: {result}"
            assert result["documentWidth"] <= width + 2, f"Document has horizontal overflow at {width}px: {result}"
            assert result["overflowX"] not in ("auto", "scroll"), f"Toolbar uses horizontal scroll at {width}px"
            responsive_results.append(result)

        await page.set_viewport_size({"width": 1440, "height": 960})
        await page.wait_for_timeout(100)
        button = page.locator('#pageCanvas .node-wrap[data-type="button"]').first
        assert await button.count(), "The first template should expose a button node for size regression"
        initial_button = await button.evaluate("e => ({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height,canvas:e.closest('#pageCanvas').getBoundingClientRect().width,id:e.dataset.nodeId})")
        assert initial_button["width"] < initial_button["canvas"] * .5, f"Button is not intrinsically sized: {initial_button}"
        await button.click(position={"x": 20, "y": 15})
        # Allow the inspector drawer and canvas-centering observer to finish their layout update.
        await page.wait_for_timeout(300)
        selected = page.locator('#pageCanvas .node-wrap.selected[data-type="button"]').first
        assert await selected.count(), "Clicking a canvas element did not select it"
        assert await selected.locator(".node-resize-handle").count() == 8, "Selected element must expose all 8 intuitive resize handles"

        # Multi-stop gradient editor: add a third color, set direction, apply, and verify the canvas uses it.
        gradient_button = page.locator('#inspector .color-field[data-color-key="background"] [data-gradient-editor]')
        assert await gradient_button.count() == 1, "Background gradient editor is missing from the inspector"
        await gradient_button.click()
        await page.wait_for_selector('#gradientStops [data-stop-color="0"]')
        await page.locator('#gradientType').select_option('radial')
        radial_gradient_preview = await page.locator('#gradientCss').inner_text()
        assert radial_gradient_preview.startswith('radial-gradient') and await page.locator('#gradientAngleWrap').is_hidden(), f"Radial gradient mode did not update its controls: {radial_gradient_preview}"
        await page.locator('#gradientType').select_option('linear')
        await page.locator('#gradientAngle').evaluate("e => {e.value='210';e.dispatchEvent(new Event('input',{bubbles:true}))}")
        await page.click('#gradientAddStop')
        assert await page.locator('#gradientStops [data-stop-color]').count() == 3, "Could not add a third gradient color stop"
        await page.locator('#gradientStops [data-stop-color="2"]').evaluate("e => {e.value='#F97316';e.dispatchEvent(new Event('input',{bubbles:true}))}")
        await page.locator('#gradientStops [data-stop-position="2"]').evaluate("e => {e.value='72';e.dispatchEvent(new Event('input',{bubbles:true}))}")
        gradient_css_preview = await page.locator('#gradientCss').inner_text()
        assert gradient_css_preview.startswith('linear-gradient(210deg') and gradient_css_preview.count('#') >= 3, f"Multi-stop gradient preview is invalid: {gradient_css_preview}"
        await page.get_by_role('button', name='تطبيق التدرج', exact=True).click()
        await page.wait_for_timeout(100)
        gradient_model = await page.evaluate("""() => {const a=window.__BUNAA_APP,id=a.store.ui.selected,n=a.store.find(id)?.node;return {id,background:n?.style?.background,responsive:n?.responsive,backgroundImage:getComputedStyle(document.querySelector('#pageCanvas .node-wrap.selected > .node-content')).backgroundImage}}""")
        assert gradient_model['background'].startswith('linear-gradient(210deg') and gradient_model['background'].count('#') >= 3, f"Gradient was not saved to the selected node: {gradient_model}"
        assert 'linear-gradient' in gradient_model['backgroundImage'], f"Gradient is not rendered on the actual canvas: {gradient_model}"

        box = await selected.bounding_box()
        drag_zoom = await page.evaluate("window.__BUNAA_APP.store.ui.zoom")
        start_x, start_y = box["x"] + box["width"] / 2, box["y"] + box["height"] / 2
        await page.mouse.move(start_x, start_y)
        await page.mouse.down()
        await page.mouse.move(start_x - 34, start_y + 21, steps=6)
        await page.mouse.up()
        await page.wait_for_timeout(400)
        selected = page.locator('#pageCanvas .node-wrap.selected[data-type="button"]').first
        moved = await selected.evaluate("""e => ({id:e.dataset.nodeId,transform:e.style.transform,position:window.__BUNAA_APP.store.find(e.dataset.nodeId)?.node.editorPosition})""")
        assert moved["position"].get("desktop", {}).get("x") == round(-34 / drag_zoom), f"Move was not persisted at fitted zoom {drag_zoom}: {moved}"
        assert moved["position"].get("desktop", {}).get("y") == round(21 / drag_zoom), f"Vertical move was not persisted at fitted zoom {drag_zoom}: {moved}"

        before_resize = await selected.evaluate("e => ({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height})")
        handle = selected.locator('[data-resize-edge="se"]')
        handle_box = await handle.bounding_box()
        assert handle_box is not None, "SE resize handle disappeared after the move operation"
        hx, hy = handle_box["x"] + handle_box["width"] / 2, handle_box["y"] + handle_box["height"] / 2
        assert await page.evaluate("""({x,y}) => document.elementFromPoint(x,y)?.dataset?.resizeEdge === 'se'""", {"x":hx,"y":hy}), "Corner handle is hidden or not hit-testable after moving"
        await page.mouse.move(hx, hy)
        await page.mouse.down()
        await page.mouse.move(hx + 40, hy + 24, steps=6)
        await page.mouse.up()
        await page.wait_for_timeout(300)
        size_model = await page.evaluate("""() => {const app=window.__BUNAA_APP;const node=app.store.find(app.store.ui.selected)?.node;const el=document.querySelector('#pageCanvas .node-wrap.selected');return {style:node?.style,responsive:node?.responsive,rect:el?.getBoundingClientRect().toJSON(),domStyle:el?.getAttribute('style')}}""")
        width_saved = size_model["style"].get("width") or size_model["responsive"].get("desktop", {}).get("width")
        height_saved = size_model["style"].get("height") or size_model["responsive"].get("desktop", {}).get("height")
        assert width_saved and float(width_saved) > before_resize["width"], f"Resizing width did not persist: {size_model}"
        assert height_saved and float(height_saved) > before_resize["height"], f"Resizing height did not persist: {size_model}"

        # Undo/redo checks that resize values remain part of project history.
        await page.click("#undoBtn")
        await page.wait_for_timeout(100)
        undone = await page.evaluate("""() => {const app=window.__BUNAA_APP;return app.store.find(app.store.ui.selected)?.node.style||{}}""")
        assert not (undone.get("width") and undone.get("height")), f"Undo did not revert the resize: {undone}"
        await page.click("#redoBtn")
        await page.wait_for_timeout(120)
        redone = await page.evaluate("""() => window.__BUNAA_APP.store.find(window.__BUNAA_APP.store.ui.selected)?.node.style||{}""")
        assert redone.get("width") and redone.get("height"), f"Redo did not restore the resized dimensions: {redone}"

        # The edge handles must resize only their respective dimension, and a reverse drag must shrink.
        before_edges = {"width": float(redone["width"]), "height": float(redone["height"])}
        east = selected.locator('[data-resize-edge="e"]')
        east_box = await east.bounding_box()
        ex, ey = east_box["x"] + east_box["width"] / 2, east_box["y"] + east_box["height"] / 2
        east_hit = await page.evaluate("({x,y}) => {const h=document.elementFromPoint(x,y);return {edge:h?.dataset?.resizeEdge,tag:h?.tagName,cls:h?.className}}", {"x":ex,"y":ey})
        assert east_hit.get("edge") == "e", f"Right edge resize handle is not hit-testable: {east_hit}; {await selected.evaluate("e => ({rect:e.getBoundingClientRect().toJSON(),handle:e.querySelector('[data-resize-edge=e]').getBoundingClientRect().toJSON()})")}"
        await page.mouse.move(ex, ey); await page.mouse.down(); await page.mouse.move(ex + 18, ey, steps=4); await page.mouse.up()
        await page.wait_for_timeout(250)
        after_east = await page.evaluate("""() => window.__BUNAA_APP.store.find(window.__BUNAA_APP.store.ui.selected)?.node.style||{}""")
        assert float(after_east["width"]) > before_edges["width"] and float(after_east["height"]) == before_edges["height"], f"Width-only handle changed the wrong dimensions: {after_east}"

        selected = page.locator('#pageCanvas .node-wrap.selected[data-type="button"]').first
        south = selected.locator('[data-resize-edge="s"]')
        south_box = await south.bounding_box()
        sx, sy = south_box["x"] + south_box["width"] / 2, south_box["y"] + south_box["height"] / 2
        assert await page.evaluate("({x,y}) => document.elementFromPoint(x,y)?.dataset?.resizeEdge === 's'", {"x":sx,"y":sy}), "Bottom edge resize handle is not hit-testable"
        await page.mouse.move(sx, sy); await page.mouse.down(); await page.mouse.move(sx, sy + 12, steps=4); await page.mouse.up()
        await page.wait_for_timeout(250)
        after_south = await page.evaluate("""() => window.__BUNAA_APP.store.find(window.__BUNAA_APP.store.ui.selected)?.node.style||{}""")
        assert float(after_south["height"]) > float(after_east["height"]) and float(after_south["width"]) == float(after_east["width"]), f"Height-only handle changed the wrong dimensions: {after_south}"

        selected = page.locator('#pageCanvas .node-wrap.selected[data-type="button"]').first
        shrink = selected.locator('[data-resize-edge="se"]')
        shrink_box = await shrink.bounding_box()
        shx, shy = shrink_box["x"] + shrink_box["width"] / 2, shrink_box["y"] + shrink_box["height"] / 2
        await page.mouse.move(shx, shy); await page.mouse.down(); await page.mouse.move(shx - 12, shy - 8, steps=4); await page.mouse.up()
        await page.wait_for_timeout(250)
        after_shrink = await page.evaluate("""() => window.__BUNAA_APP.store.find(window.__BUNAA_APP.store.ui.selected)?.node.style||{}""")
        assert float(after_shrink["width"]) < float(after_south["width"]) and float(after_shrink["height"]) < float(after_south["height"]), f"Dragging the resize corner inward did not shrink the element: {after_shrink}"

        # The new north/west grips and the remaining corners keep opposite edges anchored.
        async def drag_handle(edge, dx, dy, width_direction=0, height_direction=0):
            target = page.locator(f'#pageCanvas .node-wrap.selected[data-type="button"]').first
            before = await target.evaluate("e => ({rect:e.getBoundingClientRect().toJSON(),position:window.__BUNAA_APP.store.find(e.dataset.nodeId)?.node.editorPosition?.desktop||{x:0,y:0},style:window.__BUNAA_APP.store.find(e.dataset.nodeId)?.node.style||{}})")
            grip = target.locator(f'[data-resize-edge="{edge}"]')
            grip_box = await grip.bounding_box()
            gx, gy = grip_box["x"] + grip_box["width"] / 2, grip_box["y"] + grip_box["height"] / 2
            hit = await page.evaluate("({x,y}) => document.elementFromPoint(x,y)?.dataset?.resizeEdge", {"x":gx,"y":gy})
            assert hit == edge, f"Resize grip {edge} is not hit-testable: {hit}"
            await page.mouse.move(gx, gy); await page.mouse.down(); await page.mouse.move(gx + dx, gy + dy, steps=4); await page.mouse.up()
            await page.wait_for_timeout(180)
            after = await target.evaluate("e => ({rect:e.getBoundingClientRect().toJSON(),position:window.__BUNAA_APP.store.find(e.dataset.nodeId)?.node.editorPosition?.desktop||{x:0,y:0},style:window.__BUNAA_APP.store.find(e.dataset.nodeId)?.node.style||{}})")
            bw, bh = before["rect"]["width"], before["rect"]["height"]
            aw, ah = after["rect"]["width"], after["rect"]["height"]
            if width_direction: assert (aw - bw) * width_direction > 3, f"Grip {edge} did not resize width as expected: {bw} -> {aw}"
            else: assert abs(aw - bw) < 2, f"Grip {edge} unexpectedly changed width: {bw} -> {aw}"
            if height_direction: assert (ah - bh) * height_direction > 3, f"Grip {edge} did not resize height as expected: {bh} -> {ah}"
            else: assert abs(ah - bh) < 2, f"Grip {edge} unexpectedly changed height: {bh} -> {ah}"

        await drag_handle("n", 0, -12, 0, 1)
        await drag_handle("w", -12, 0, 1, 0)
        await drag_handle("ne", 12, -12, 1, 1)
        await drag_handle("nw", -12, -12, 1, 1)
        await drag_handle("sw", -12, 12, 1, 1)

        # Fixed-width artboard / manual-only vertical expansion contract.
        # First isolate a node in the QA project so regular content flow cannot disguise canvas behavior.
        await page.evaluate("""() => {
          const app=window.__BUNAA_APP,id=app.store.ui.selected;
          app.store.transact('QA isolate manual height contract',project=>{
            const pg=project.pages.find(p=>p.id===project.activePageId);
            const visit=nodes=>{for(const node of nodes||[]){if(node.id===id){pg.nodes=[node];node.style={...(node.style||{}),width:140,height:80};node.editorPosition={...(node.editorPosition||{}),desktop:{x:0,y:0}};return true}if(visit(node.children))return true}return false};
            visit(pg.nodes);pg.settings={...(pg.settings||{})};delete pg.settings.canvasHeightByDevice;
          });
        }""")
        await page.wait_for_timeout(200)
        base_width = await page.evaluate("() => window.__BUNAA_APP.store.project.devices.desktop.width")
        baseline_height = await page.locator('#pageCanvas').evaluate("e => Math.max(360,parseFloat(e.style.minHeight)||0)")
        assert baseline_height == 360, f"Fresh page must begin with a 360px canvas minimum, not an inferred content height: {baseline_height}"

        # Moving a node far down must not grow the canvas automatically.
        await page.evaluate("""() => {const app=window.__BUNAA_APP,id=app.store.ui.selected;app.store.transact('QA move without canvas expansion',project=>{const pg=project.pages.find(p=>p.id===project.activePageId);const n=pg.nodes.find(item=>item.id===id);n.editorPosition={...(n.editorPosition||{}),desktop:{x:0,y:1500}}})}""")
        await page.wait_for_timeout(220)
        moved_height = await page.locator('#pageCanvas').evaluate("e => parseFloat(e.style.minHeight)||e.getBoundingClientRect().height")
        no_saved_height = await page.evaluate("() => !window.__BUNAA_APP.store.activePage().settings.canvasHeightByDevice")
        assert moved_height <= baseline_height + 2 and no_saved_height, f"Moving a node unexpectedly auto-expanded page height: height={moved_height}, saved={no_saved_height}"

        # A very wide node must not widen the selected device artboard.
        await page.evaluate("""({base_width}) => {const app=window.__BUNAA_APP,id=app.store.ui.selected;app.store.transact('QA fixed artboard width',project=>{const pg=project.pages.find(p=>p.id===project.activePageId);const n=pg.nodes.find(item=>item.id===id);n.style={...(n.style||{}),width:base_width+900,height:80};n.editorPosition={...(n.editorPosition||{}),desktop:{x:0,y:0}}})}""", {"base_width": base_width})
        await page.wait_for_timeout(180)
        fixed_width = await page.evaluate("() => ({device:window.__BUNAA_APP.store.project.devices.desktop.width,canvas:document.querySelector('#pageCanvas').offsetWidth,frame:document.querySelector('#deviceFrame').offsetWidth,host:parseFloat(document.querySelector('#canvasStageHost').style.width)})")
        assert fixed_width['canvas'] == base_width and fixed_width['frame'] == base_width, f"Wide element changed artboard width: {fixed_width}"

        # Restore a normal width and place the node near the bottom. Only explicitly
        # increasing its height through the south grip is allowed to extend the page.
        await page.evaluate("""() => {const app=window.__BUNAA_APP,id=app.store.ui.selected;app.store.transact('QA position for manual extension',project=>{const pg=project.pages.find(p=>p.id===project.activePageId);const n=pg.nodes.find(item=>item.id===id);n.style={...(n.style||{}),width:140,height:80};n.editorPosition={...(n.editorPosition||{}),desktop:{x:0,y:245}}})}""")
        await page.wait_for_timeout(200)
        before_manual_resize = await page.locator('#pageCanvas').evaluate("e => Math.max(360,parseFloat(e.style.minHeight)||0)")
        node = page.locator('#pageCanvas .node-wrap.selected[data-type="button"]').first
        grip = node.locator('[data-resize-edge="s"]')
        grip_box = await grip.bounding_box()
        assert grip_box is not None, 'South grip is missing before manual vertical resize'
        zoom = await page.evaluate("window.__BUNAA_APP.store.ui.zoom")
        gx, gy = grip_box['x'] + grip_box['width']/2, grip_box['y'] + grip_box['height']/2
        await page.mouse.move(gx, gy); await page.mouse.down(); await page.mouse.move(gx, gy + max(130, 240*zoom), steps=6); await page.mouse.up()
        await page.wait_for_timeout(300)
        after_manual_resize = await page.locator('#pageCanvas').evaluate("e => parseFloat(e.style.minHeight)||e.getBoundingClientRect().height")
        saved_height = await page.evaluate("() => window.__BUNAA_APP.store.activePage().settings.canvasHeightByDevice?.desktop||0")
        assert saved_height > 360 and after_manual_resize >= saved_height-2 and after_manual_resize > before_manual_resize+40, f"Explicit vertical resize did not extend canvas: before={before_manual_resize}, after={after_manual_resize}, saved={saved_height}"
        scroll_contract = await page.evaluate("""() => {const host=document.querySelector('#canvasStageHost'),viewport=document.querySelector('#canvasViewport'),canvas=document.querySelector('#pageCanvas'),zoom=Math.max(.2,Number(window.__BUNAA_APP.store.ui.zoom)||1);return {hostHeight:host.offsetHeight,viewportScrollHeight:viewport.scrollHeight,canvasHeight:canvas.offsetHeight,zoom}}""")
        assert scroll_contract['hostHeight']+2 >= scroll_contract['canvasHeight']*scroll_contract['zoom'] and scroll_contract['viewportScrollHeight']+2 >= scroll_contract['hostHeight'], f"Scrollable workspace did not honor manually expanded height: {scroll_contract}"
        # The saved extension must not shrink automatically when the element gets smaller.
        await page.evaluate("""() => {const app=window.__BUNAA_APP,id=app.store.ui.selected;app.store.transact('QA shrink element but keep canvas',project=>{const pg=project.pages.find(p=>p.id===project.activePageId);const n=pg.nodes.find(item=>item.id===id);n.style={...(n.style||{}),height:40}})}""")
        await page.wait_for_timeout(220)
        stayed_height = await page.locator('#pageCanvas').evaluate("e => parseFloat(e.style.minHeight)||e.getBoundingClientRect().height")
        assert stayed_height >= saved_height-2, f"Canvas auto-shrank after an element got smaller: {stayed_height} < {saved_height}"

        # Different device views maintain independent element positions.
        desktop_position = await page.evaluate("""() => window.__BUNAA_APP.store.find(window.__BUNAA_APP.store.ui.selected)?.node.editorPosition?.desktop""")
        await page.click('.device-btn[data-device="tablet"]')
        await page.wait_for_timeout(350)
        tablet_zoom = await page.evaluate("window.__BUNAA_APP.store.ui.zoom")
        tablet_button = page.locator('#pageCanvas .node-wrap.selected[data-type="button"]').first
        tablet_box = await tablet_button.bounding_box()
        tx, ty = tablet_box["x"] + tablet_box["width"] / 2, tablet_box["y"] + tablet_box["height"] / 2
        await page.mouse.move(tx, ty)
        await page.mouse.down()
        await page.mouse.move(tx + 17 * tablet_zoom, ty + 13 * tablet_zoom, steps=5)
        await page.mouse.up()
        await page.wait_for_timeout(300)
        device_positions = await page.evaluate("""() => window.__BUNAA_APP.store.find(window.__BUNAA_APP.store.ui.selected)?.node.editorPosition||{}""")
        tablet_position = device_positions.get("tablet", {})
        assert tablet_position.get("x") == 17 and tablet_position.get("y") == 13, f"Tablet-specific movement was not saved independently: {device_positions}"
        await page.click('.device-btn[data-device="desktop"]')
        await page.wait_for_timeout(250)
        restored_desktop_position = await page.evaluate("""() => window.__BUNAA_APP.store.find(window.__BUNAA_APP.store.ui.selected)?.node.editorPosition?.desktop""")
        assert restored_desktop_position == desktop_position, f"Changing tablet position unexpectedly altered desktop position: {device_positions}"

        # Preview is a visible, responsive, executable website, not merely a source string.
        preview_ids = await page.evaluate("""() => {const app=window.__BUNAA_APP;const pg=app.store.activePage();let button=null,hoverNode=null;const walk=nodes=>{for(const node of nodes||[]){if(node.type==='button'&&!button)button=node;if(!hoverNode&&['heading','text','image','badge','link'].includes(node.type)&&!(node.children||[]).length)hoverNode=node;if(walk(node.children))return true}return false};walk(pg.nodes);if(!button)throw new Error('QA template button missing');button.props=button.props||{};button.props.url='#';if(!hoverNode)hoverNode=button;const inputId='qa-interaction-input-'+Date.now();const inputNode={id:inputId,type:'input',props:{label:'اختبار التفاعلات',placeholder:'اكتب هنا للاختبار',type:'text'},style:{width:300,marginTop:12,marginBottom:12},responsive:{},classes:[],attrs:{},semantic:{tag:'div',role:'',ariaLabel:''},layout:{display:'block',direction:'column',gap:0,align:'stretch',justify:'start',wrap:false},visibility:{desktop:true,tablet:true,mobile:true},locked:false,children:[]};app.store.transact('QA add interaction input',project=>{const target=project.pages.find(p=>p.id===pg.id);target.nodes.push(inputNode)});app.store.project.interactions=[{id:'qa-preview-toggle',sourceId:button.id,trigger:'click',enabled:true,action:'toggle',options:{targetId:button.id}},{id:'qa-preview-hover',sourceId:hoverNode.id,trigger:'hover',enabled:true,action:'addClass',options:{targetId:hoverNode.id,className:'qa-preview-hover'}},{id:'qa-preview-input-event',sourceId:inputId,trigger:'input',enabled:true,action:'setText',options:{targetId:hoverNode.id,text:'Input event worked'}},{id:'qa-preview-change-event',sourceId:inputId,trigger:'change',enabled:true,action:'setAttribute',options:{targetId:hoverNode.id,attribute:'data-qa-changed',attributeValue:'true'}},{id:'qa-preview-focus-event',sourceId:inputId,trigger:'focus',enabled:true,action:'setAttribute',options:{targetId:hoverNode.id,attribute:'data-qa-focused',attributeValue:'true'}},{id:'qa-preview-key-event',sourceId:inputId,trigger:'keydown',enabled:true,condition:{type:'key',value:'Enter',operator:'equals'},action:'setAttribute',options:{targetId:hoverNode.id,attribute:'data-qa-enter',attributeValue:'true'}},{id:'qa-preview-blur-event',sourceId:inputId,trigger:'blur',enabled:true,action:'setAttribute',options:{targetId:hoverNode.id,attribute:'data-qa-blurred',attributeValue:'true'}}];return {buttonId:button.id,hoverId:hoverNode.id,inputId};}""")
        preview_trigger_id, preview_hover_id, preview_input_id = preview_ids['buttonId'], preview_ids['hoverId'], preview_ids['inputId']
        await page.click("#previewBtn")
        await page.wait_for_selector("#previewFrame")
        preview_source = await page.locator("#previewFrame").evaluate("e => e.srcdoc")
        assert "<html" in preview_source.lower(), "Preview did not create a complete HTML document"
        await page.wait_for_function("document.querySelector('#previewFrame')?.contentDocument?.readyState === 'complete'")
        editor_handles = await page.locator("#previewFrame").evaluate("e => e.contentDocument.querySelectorAll('.node-resize-handle,[data-resize-edge]').length")
        assert editor_handles == 0, f"Editor-only resize handles leaked into preview DOM: {editor_handles}"
        assert "linear-gradient(210deg" in preview_source, "Applied multi-stop gradient did not survive into preview HTML"
        await page.wait_for_function("document.querySelector('#previewFrame')?.contentDocument?.readyState === 'complete'")
        preview_layout = await page.locator("#previewFrame").evaluate("e => ({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height,contentWidth:e.contentWindow.innerWidth,ready:e.contentDocument.readyState,button:e.contentDocument.querySelector('[data-runtime-id] a')!==null})")
        parity = await page.evaluate("""({id}) => {const app=window.__BUNAA_APP,canvas=document.querySelector(`#pageCanvas .node-wrap[data-node-id=\"${id}\"]`),frame=document.querySelector('#previewFrame'),actual=Array.from(frame.contentDocument.querySelectorAll('[data-runtime-id]')).find(e=>e.dataset.runtimeId===id);if(!canvas||!actual)return {missing:true};const zoom=Math.max(.2,Number(app.store.ui.zoom)||1),cr=canvas.getBoundingClientRect(),pr=actual.getBoundingClientRect();return {canvasHtml:canvas.querySelector(':scope > .node-content')?.innerHTML,previewHtml:actual.querySelector(':scope > .node-content')?.innerHTML,canvasWidth:cr.width/zoom,previewWidth:pr.width,canvasHeight:cr.height/zoom,previewHeight:pr.height,canvasBg:getComputedStyle(canvas.querySelector(':scope > .node-content')).backgroundImage,previewBg:getComputedStyle(actual.querySelector(':scope > .node-content')).backgroundImage}}""", {"id":preview_trigger_id})
        assert not parity.get('missing'), f'Canvas and preview did not render the same item: {parity}'
        assert parity['canvasHtml'] == parity['previewHtml'], 'Rendered element content differs between editor canvas and live preview'
        assert abs(parity['canvasWidth']-parity['previewWidth']) <= 2 and abs(parity['canvasHeight']-parity['previewHeight']) <= 2, f'Element dimensions differ between editor and live preview: {parity}'
        assert 'linear-gradient' in parity['canvasBg'] and 'linear-gradient' in parity['previewBg'], f'Canvas gradient is not faithfully represented in preview: {parity}'
        assert preview_layout["width"] >= 1100 and preview_layout["height"] >= 400 and preview_layout["contentWidth"] == 1180 and preview_layout["ready"] == "complete", f"Preview iframe is not sized or rendered as a real desktop viewport: {preview_layout}"
        assert await page.locator('[data-preview-device="tablet"]').count() == 1, "Preview tablet viewport control is missing"
        # Deliberately give the node an oversized mobile patch and an independent mobile position.
        await page.evaluate("""({id}) => {const a=window.__BUNAA_APP;a.store.transact('QA device responsive sizing and placement',project=>{const walk=nodes=>{for(const node of nodes||[]){if(node.id===id){node.responsive={...(node.responsive||{}),mobile:{...(node.responsive?.mobile||{}),width:720}};node.editorPosition={...(node.editorPosition||{}),mobile:{x:11,y:9}};return true}if(walk(node.children))return true}return false};for(const pg of project.pages)if(walk(pg.nodes))break})}""", {"id":preview_trigger_id})
        await page.locator('[data-preview-device="tablet"]').click()
        await page.wait_for_function("document.querySelector('#previewFrame')?.contentDocument?.readyState === 'complete'")
        tablet_preview = await page.locator("#previewFrame").evaluate("e => ({width:e.getBoundingClientRect().width,viewport:e.contentWindow.innerWidth,device:e.dataset.previewDevice,scrollWidth:e.contentDocument.documentElement.scrollWidth})")
        assert tablet_preview["width"] == 768 and tablet_preview["viewport"] == 768 and tablet_preview["device"] == "tablet", f"Tablet preview viewport is not real: {tablet_preview}"
        tablet_position = await page.locator('#previewFrame').evaluate("(e,id) => {const n=Array.from(e.contentDocument.querySelectorAll('[data-runtime-id]')).find(x=>x.dataset.runtimeId===id);return {transform:getComputedStyle(n).transform,rect:n.getBoundingClientRect().toJSON(),scrollWidth:e.contentDocument.documentElement.scrollWidth}}", preview_trigger_id)
        assert 'matrix' in tablet_position['transform'] and int(round(float(tablet_position['transform'].split(',')[-2]))) == 17 and int(round(float(tablet_position['transform'].split(',')[-1].split(')')[0]))) == 13, f'Tablet-specific element position not reflected in preview: {tablet_position}'
        assert tablet_position['scrollWidth'] <= 768, f'Tablet preview overflows horizontally: {tablet_position}'
        await page.locator('[data-preview-device="mobile"]').click()
        await page.wait_for_function("document.querySelector('#previewFrame')?.contentDocument?.readyState === 'complete'")
        mobile_preview = await page.locator("#previewFrame").evaluate("e => ({width:e.getBoundingClientRect().width,viewport:e.contentWindow.innerWidth,device:e.dataset.previewDevice,scrollWidth:e.contentDocument.documentElement.scrollWidth})")
        assert mobile_preview["width"] == 390 and mobile_preview["viewport"] == 390 and mobile_preview["device"] == "mobile", f"Mobile preview viewport is not real: {mobile_preview}"
        mobile_node_layout = await page.locator('#previewFrame').evaluate("(e,id) => {const n=Array.from(e.contentDocument.querySelectorAll('[data-runtime-id]')).find(x=>x.dataset.runtimeId===id),content=n?.querySelector(':scope > .node-content');return {transform:getComputedStyle(n).transform,width:n.getBoundingClientRect().width,contentWidth:content?.getBoundingClientRect().width,scrollWidth:e.contentDocument.documentElement.scrollWidth,viewport:e.contentWindow.innerWidth}}", preview_trigger_id)
        assert 'matrix' in mobile_node_layout['transform'] and int(round(float(mobile_node_layout['transform'].split(',')[-2]))) == 11 and int(round(float(mobile_node_layout['transform'].split(',')[-1].split(')')[0]))) == 9, f'Mobile-specific position was not represented in preview: {mobile_node_layout}'
        assert mobile_node_layout['width'] <= 390 and mobile_node_layout['contentWidth'] <= 390 and mobile_node_layout['scrollWidth'] <= 390, f'Oversized element was not adapted to the 390px mobile viewport: {mobile_node_layout}'
        # Run a configured click interaction inside the iframe and confirm it changes the preview DOM.
        preview_button = page.frame_locator('#previewFrame').locator(f'[data-runtime-id="{preview_trigger_id}"] a')
        assert await preview_button.count() == 1, "Actual preview did not render the interactive button"
        await preview_button.click()
        await page.wait_for_timeout(100)
        hidden_after_interaction = await page.locator("#previewFrame").evaluate("(frame,id) => {const d=frame.contentDocument,n=Array.from(d.querySelectorAll('[data-runtime-id]')).find(node=>node.dataset.runtimeId===id);return {hidden:n?.hidden,id:n?.dataset.runtimeId,href:n?.querySelector('a')?.getAttribute('href'),scripts:[...d.scripts].map(s=>s.textContent.includes('qa-preview-toggle')),buttonCount:d.querySelectorAll('[data-runtime-id] a').length};}", preview_trigger_id)
        assert hidden_after_interaction.get("hidden"), f"Click interaction did not execute inside the live preview: {hidden_after_interaction}"
        hover_target = page.frame_locator('#previewFrame').locator(f'[data-runtime-id="{preview_hover_id}"]')
        await hover_target.hover()
        await page.wait_for_timeout(100)
        hover_class_applied = await page.locator('#previewFrame').evaluate("(frame,id) => Array.from(frame.contentDocument.querySelectorAll('[data-runtime-id]')).find(n=>n.dataset.runtimeId===id)?.classList.contains('qa-preview-hover')", preview_hover_id)
        assert hover_class_applied, 'Hover interaction did not execute on a non-button element in live preview'
        interactive_field = page.frame_locator('#previewFrame').locator(f'[data-runtime-id="{preview_input_id}"] input')
        await interactive_field.fill('Bunaa functional test')
        await page.wait_for_function("(id) => Array.from(document.querySelector('#previewFrame').contentDocument.querySelectorAll('[data-runtime-id]')).find(n=>n.dataset.runtimeId===id)?.textContent==='Input event worked'", arg=preview_hover_id)
        await interactive_field.dispatch_event('change')
        await interactive_field.focus()
        await interactive_field.press('Enter')
        await interactive_field.evaluate('(e) => e.blur()')
        await page.wait_for_timeout(120)
        input_events = await page.locator('#previewFrame').evaluate("(frame,id) => {const n=Array.from(frame.contentDocument.querySelectorAll('[data-runtime-id]')).find(x=>x.dataset.runtimeId===id);return {changed:n?.getAttribute('data-qa-changed'),focused:n?.getAttribute('data-qa-focused'),enter:n?.getAttribute('data-qa-enter'),blurred:n?.getAttribute('data-qa-blurred')}}", preview_hover_id)
        assert input_events == {'changed':'true','focused':'true','enter':'true','blurred':'true'}, f'Input/change/focus/keyboard/blur interactions failed on an input element: {input_events}'
        await page.locator('[data-preview-refresh]').click()
        await page.wait_for_function("document.querySelector('#previewFrame')?.contentDocument?.readyState === 'complete'")
        await page.locator("#modalHost .close-btn").last.click()
        await page.evaluate("window.__BUNAA_APP.store.project.interactions=[]")

        # A real photo must scale with the wrapper, not just with the selection outline.
        # The image is mocked through Chromium so this test is deterministic and uses no public server.
        await page.set_viewport_size({"width": 1440, "height": 960})
        qa_photo_url = "https://assets.test-bunaa.invalid/qa-photo.png"
        image_png = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/Z5cAAAAASUVORK5CYII=")
        async def mock_asset(route):
            await route.fulfill(status=200, content_type="image/png", headers={"Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=3600"}, body=image_png)
        await page.route(qa_photo_url, mock_asset)
        extended_ids = await page.evaluate("""({imageUrl}) => {
          const app=window.__BUNAA_APP, page=app.store.activePage();
          const mk=(id,type,props,style={})=>({id,type,props,style:{marginTop:12,marginBottom:12,...style},responsive:{},classes:[],attrs:{},semantic:{tag:'div',role:'',ariaLabel:''},layout:{display:'block',direction:'column',gap:0,align:'stretch',justify:'start',wrap:false},visibility:{desktop:true,tablet:true,mobile:true},locked:false,children:[]});
          const nodes=[
            mk('qa-export-image','image',{src:imageUrl,alt:'صورة اختبارية قابلة للتحجيم'},{width:240,height:150,objectFit:'cover',borderRadius:12}),
            mk('qa-export-external-link','button',{text:'زيارة الوجهة الخارجية',url:'https://example.org/pricing',action:'url'},{paddingY:12,paddingX:18}),
            mk('qa-team-grid','team-grid',{title:'فريق الاختبار',items:[{name:'سارة',role:'تصميم',bio:'نبذة',image:imageUrl,url:'https://example.org/team/sara'}]},{width:'100%'}),
            mk('qa-service-grid','service-grid',{title:'الخدمات',items:[{icon:'✦',title:'تصميم',description:'خدمة عملية',url:'https://example.org/design'}]},{width:'100%'}),
            mk('qa-feature-bento','feature-bento',{title:'المزايا',items:[{title:'تجربة مرنة',description:'تعمل عبر الأجهزة',image:imageUrl,url:'https://example.org/features'}]},{width:'100%'}),
            mk('qa-logo-cloud','logo-cloud',{title:'الشركاء',items:[{name:'NOVA',image:imageUrl,url:'https://example.org/nova'}]},{width:'100%'}),
            mk('qa-event-list','event-list',{title:'الفعاليات',items:[{date:'24 أكتوبر',title:'فعالية اختبار',location:'مسقط',description:'فعالية تجريبية',url:'https://example.org/events'}]},{width:'100%'}),
            mk('qa-review-grid','review-grid',{title:'التقييمات',items:[{quote:'تجربة جيدة',name:'عمر',company:'فريق',rating:5}]},{width:'100%'}),
            mk('qa-job-board','job-board',{title:'الوظائف',items:[{title:'مطور',location:'عن بعد',type:'كامل',description:'وصف الوظيفة',url:'https://example.org/jobs'}]},{width:'100%'}),
            mk('qa-product-grid','product-grid',{title:'المتجر',items:[{id:'qa-product-1',name:'منتج QA',price:'3 ر.ع',description:'وصف منتج',image:imageUrl,url:'https://example.org/product',cta:'تفاصيل'}]},{width:'100%'}),
            mk('qa-portfolio-grid','portfolio-grid',{title:'الأعمال',items:[{title:'هوية 1',category:'هوية',image:imageUrl,url:'https://example.org/work/1'},{title:'موقع 2',category:'ويب',image:imageUrl,url:'https://example.org/work/2'}]},{width:'100%'}),
            mk('qa-testimonial-carousel','testimonial-carousel',{items:[{quote:'الأولى',name:'عميل 1'},{quote:'الثانية',name:'عميل 2'}]},{width:'100%'}),
            mk('qa-contact-form','contact-form',{title:'تواصل QA',button:'إرسال'},{width:'100%',maxWidth:680})
          ];
          app.store.transact('QA add image export and catalog patterns',project=>{const target=project.pages.find(p=>p.id===page.id);target.nodes.push(...nodes)});
          return {imageId:'qa-export-image',types:nodes.map(n=>n.type),ids:nodes.map(n=>n.id)};
        }""", {"imageUrl": qa_photo_url})
        await page.wait_for_function("() => {const i=document.querySelector('#pageCanvas [data-node-id=\"qa-export-image\"] img');return !!i&&i.complete&&i.naturalWidth>0}")
        image_wrap = page.locator('#pageCanvas .node-wrap[data-node-id="qa-export-image"]')
        await image_wrap.click(position={"x": 70, "y": 60})
        selected_image = page.locator('#pageCanvas .node-wrap.selected[data-type="image"][data-node-id="qa-export-image"]')
        await page.wait_for_selector('#pageCanvas .node-wrap.selected[data-node-id="qa-export-image"]')
        await selected_image.scroll_into_view_if_needed()
        await page.wait_for_timeout(120)
        image_before = await selected_image.evaluate("e => ({wrapper:e.getBoundingClientRect().toJSON(),content:e.querySelector(':scope > .node-content').getBoundingClientRect().toJSON(),image:e.querySelector('img').getBoundingClientRect().toJSON(),naturalWidth:e.querySelector('img').naturalWidth,objectFit:getComputedStyle(e.querySelector('img')).objectFit})")
        assert image_before['naturalWidth'] == 1 and abs(image_before['wrapper']['width']-image_before['image']['width']) < 2, f"Image starts at the wrapper's true width: {image_before}"
        image_handle = selected_image.locator('[data-resize-edge="se"]')
        image_handle_box = await image_handle.bounding_box()
        ix, iy = image_handle_box['x']+image_handle_box['width']/2, image_handle_box['y']+image_handle_box['height']/2
        image_resize_probe = await page.evaluate('({x,y})=>({zoom:window.__BUNAA_APP.store.ui.zoom,interactionMode:window.__BUNAA_APP.store.ui.interactionMode,selected:window.__BUNAA_APP.store.ui.selected,hit:document.elementFromPoint(x,y)?.outerHTML?.slice(0,180),handleCount:document.querySelectorAll(\"#pageCanvas [data-node-id=\\\"qa-export-image\\\"] [data-resize-edge]\").length,wrapStyle:document.querySelector(\"#pageCanvas [data-node-id=\\\"qa-export-image\\\"]\")?.getAttribute(\"style\")})', {"x":ix,"y":iy})
        await page.mouse.move(ix, iy); await page.mouse.down(); await page.wait_for_timeout(40)
        image_drag_start = await page.evaluate("() => {const m=window.__BUNAA_APP.engine?.manipulation;return m?{mode:m.mode,edge:m.edge,startWidth:m.startWidth,startHeight:m.startHeight,captureTarget:m.captureTarget?.className,hasCapture:m.captureTarget?.hasPointerCapture?.(m.pointerId)}:null}")
        await page.mouse.move(ix+115, iy+75, steps=7); await page.wait_for_timeout(80)
        image_drag_mid = await page.evaluate("() => {const m=window.__BUNAA_APP.engine?.manipulation;return m?{mode:m.mode,edge:m.edge,moved:m.moved,width:m.width,height:m.height,rect:m.wrapper?.getBoundingClientRect().toJSON()}:null}")
        await page.mouse.up()
        await page.wait_for_timeout(300)
        image_after = await page.evaluate("""() => {const n=window.__BUNAA_APP.store.find('qa-export-image')?.node,e=document.querySelector('#pageCanvas [data-node-id=\"qa-export-image\"]'),img=e?.querySelector('img'),base=n?.style||{},responsive=n?.responsive?.desktop||{};return {style:base,responsive,effectiveWidth:responsive.width??base.width,effectiveHeight:responsive.height??base.height,wrapper:e?.getBoundingClientRect().toJSON(),content:e?.querySelector(':scope > .node-content')?.getBoundingClientRect().toJSON(),image:img?.getBoundingClientRect().toJSON(),objectFit:img?getComputedStyle(img).objectFit:'',canvasWidth:document.querySelector('#pageCanvas')?.getBoundingClientRect().width}}""")
        assert float(image_after['effectiveWidth']) > 320 and float(image_after['effectiveHeight']) > 200, f"Mouse resizing did not enlarge the actual image dimensions: before={image_before}; after={image_after}; probe={image_resize_probe}; handle={image_handle_box}; drag_start={image_drag_start}; drag_mid={image_drag_mid}; log={await page.evaluate("window.__QA_MANIP_LOG||[]")}"
        assert abs(image_after['wrapper']['width']-image_after['image']['width']) < 2 and abs(image_after['wrapper']['height']-image_after['image']['height']) < 2, f"Image pixels did not scale with their resized frame: {image_after}"
        assert image_after['objectFit'] == 'cover', f"Resizing lost object-fit behavior: {image_after}"
        # The newer patterns are actual renderers and work within the real device preview.
        for selector in ('.built-team-card','.built-service-card','.built-bento-card','.built-logo-cloud-item','.built-event-card','.built-review-card','.built-job-card','.built-product-listing','.built-portfolio-item','.built-testimonial-carousel','.built-contact-form'):
            assert await page.locator(f'#pageCanvas {selector}').count() >= 1, f"Newly-added element renderer is missing: {selector}"
        await page.click('#previewBtn')
        await page.wait_for_selector('#previewFrame')
        await page.wait_for_function("document.querySelector('#previewFrame')?.contentDocument?.readyState === 'complete'")
        live_frame=page.frame_locator('#previewFrame')
        assert await live_frame.locator('.built-team-card').count()==1 and await live_frame.locator('.built-service-card').count()==1 and await live_frame.locator('.built-bento-card').count()==1, "The new components did not render in the actual responsive preview"
        await live_frame.locator('[data-cart-add="qa-product-1"]').click()
        cart_status=await page.locator('#previewFrame').evaluate('e=>e.contentWindow.__BUNAA_CART')
        assert cart_status and cart_status['count']==1, f"New product card interaction was inert: {cart_status}"
        await live_frame.locator('[data-portfolio-filter="هوية"]').click()
        portfolio_state=await page.locator('#previewFrame').evaluate("e=>{const d=e.contentDocument;return [...d.querySelectorAll('[data-portfolio-category]')].map(n=>({category:n.dataset.portfolioCategory,hidden:n.hidden}))}")
        assert len(portfolio_state)==2 and sum(1 for x in portfolio_state if not x['hidden'])==1, f"Portfolio filters did not filter the new items: {portfolio_state}"
        await live_frame.locator('[data-carousel-move="1"]').click()
        carousel_state=await page.locator('#previewFrame').evaluate("e=>{const d=e.contentDocument;return {visible:d.querySelectorAll('.built-testimonial-slide:not([hidden])').length,text:d.querySelector('.built-testimonial-slide:not([hidden])')?.textContent,status:d.querySelector('[data-carousel-status]')?.textContent}}")
        assert carousel_state['visible']==1 and 'الثانية' in carousel_state['text'] and carousel_state['status']=='2 / 2', f"Testimonial carousel controls did not work: {carousel_state}"
        contact=live_frame.locator('.built-contact-form form')
        await contact.locator('input[name="name"]').fill('QA User')
        await contact.locator('input[name="email"]').fill('qa@example.org')
        await contact.locator('textarea[name="message"]').fill('Check form validation')
        await contact.locator('button[type="submit"]').click()
        contact_status=await contact.locator('[data-form-status]').inner_text()
        assert 'تم التحقق' in contact_status, f"Contact form did not validate and report honestly: {contact_status}"
        await page.locator('#modalHost .close-btn').last.click()

        # All legacy toolbar actions remain available in a compact drop-down.
        await page.locator(".toolbar-more-toggle").click()
        assert await page.locator(".toolbar-more").evaluate("e => e.open"), "More-tools menu did not open"
        await page.keyboard.press("Escape")
        assert not await page.locator(".toolbar-more").evaluate("e => e.open"), "Escape did not close the More-tools menu"
        await page.locator(".toolbar-more-toggle").click()
        await page.click("#auditBtn")
        await page.wait_for_selector("#modalHost .modal-overlay")
        assert not await page.locator(".toolbar-more").evaluate("e => e.open"), "More-tools menu did not close after an action"
        await page.locator("#modalHost .close-btn").last.click()

        # Exercise the user's actual site-export ZIP from the editor and validate its archive structure.
        await page.click("#exportBtn")
        await page.wait_for_selector("#modalHost #zip")
        async with page.expect_download(timeout=10000) as download_info:
            await page.click("#modalHost #zip")
        download = await download_info.value
        download_path = await download.path()
        with zipfile.ZipFile(download_path) as exported:
            exported_names = set(exported.namelist())
            assert exported.testzip() is None, "Exported website ZIP failed CRC validation"
            required_export_files = {"index.html", "styles.css", "script.js", "project.json", "404.html", "site.json", "manifest.webmanifest", "robots.txt", "sitemap.xml"}
            assert required_export_files.issubset(exported_names), f"Website ZIP is missing expected files: {required_export_files - exported_names}"
            exported_html = exported.read("index.html").decode("utf-8", errors="replace")
            assert "<!doctype html>" in exported_html.lower(), "Exported index.html is not a complete HTML page"
            assert "linear-gradient(210deg" in exported_html, "Applied multi-stop gradient was lost during website ZIP export"
            local_media = sorted(name for name in exported_names if name.startswith("assets/external-") and name.endswith(".png"))
            assert local_media, f"ZIP did not include the mocked remote photo in assets/: {sorted(exported_names)}"
            assert exported.read(local_media[0]) == image_png, "Bundled image bytes differ from the source response"
            assert qa_photo_url not in exported_html, "Remote media URL remains in exported HTML instead of a local relative asset path"
            assert any(f'src=\"{path}\"' in exported_html for path in local_media), "Exported HTML does not point at the downloaded local image file"
            assert "https://example.org/pricing" in exported_html, "External destination links were removed during export"
            assert "EXTERNAL_RESOURCES.md" in exported_names, "Export does not include the report for media which could not be downloaded"
            expected_components = ["built-team-grid", "built-service-grid", "built-feature-bento", "built-logo-cloud", "built-event-list", "built-review-grid", "built-job-board"]
            assert all(value in exported_html for value in expected_components), "One or more new catalog elements did not survive website export"
            assert exported.read("styles.css").decode("utf-8").count("built-team-items") >= 1, "New element styles are not included in the downloaded site"
        exported_count = len(exported_names)
        await page.locator("#modalHost .close-btn").last.click()

        # Applying a radial gradient also persists and renders correctly; CSS-only mode selection is not a visual stub.
        await page.locator('#inspector .color-field[data-color-key="background"] [data-gradient-editor]').click()
        await page.locator('#gradientType').select_option('radial')
        await page.get_by_role('button', name='تطبيق التدرج', exact=True).click()
        await page.wait_for_timeout(100)
        radial_applied = await page.evaluate("""() => {const app=window.__BUNAA_APP,node=app.store.find(app.store.ui.selected)?.node,el=document.querySelector('#pageCanvas .node-wrap.selected > .node-content');return {background:node?.style?.background,image:getComputedStyle(el).backgroundImage}}""")
        assert radial_applied['background'].startswith('radial-gradient') and 'radial-gradient' in radial_applied['image'], f"Applied radial gradient did not reach the node: {radial_applied}"

        # Run the older layout harness in its own page so it cannot tear down the app DOM during live listeners.
        layout_page = await browser.new_page(viewport={"width": 1440, "height": 960})
        layout_errors = []
        layout_page.on("pageerror", lambda error: layout_errors.append(str(error)))
        await layout_page.set_content((ROOT / "tests" / "layout-test.html").read_text(encoding="utf-8"), wait_until="load")
        layout_result = json.loads((await layout_page.locator("#result").inner_text()))
        assert len(layout_result) == 4 and all(item.get("canvas", 0) > 0 for item in layout_result), f"Layout harness failed: {layout_result}"
        assert not layout_errors, f"Layout harness browser errors: {layout_errors}"
        await layout_page.close()

        assert not page_errors, f"Browser runtime errors: {page_errors}"
        result = {
            "checks": [
                "standalone app boots and creates a project",
                "intrinsic button width avoids full-canvas stretch",
                "multi-stop linear/radial gradient editor, live preview, save, application preview, and site export",
                "fixed device width never expands for wide/moved nodes; only explicit vertical resize grows persisted page height and it does not auto-shrink",
                "mouse drag persists x/y movement",
                "all 8 pointer resize grips work; opposite edges stay anchored; reverse drag shrinks; undo/redo works",
                "tablet/mobile positions persist independently and preview uses exact device viewport, position, and adaptive sizing",
                "canvas content, size, gradient and HTML parity; desktop/tablet/mobile responsive viewports; click/hover/input/change/focus/keyboard/blur interactions work on different element types",
                "secondary toolbar actions remain reachable and dropdown closes by action or Escape",
                "website ZIP downloads, contains actual image bytes in assets/, rewrites image paths locally, preserves external hyperlinks, and includes new component rendering/styles",
                "mouse resizing scales image pixels and all 7 new catalog patterns render and their cart/filter/carousel/form controls work",
                "existing layout regression harness passes in an isolated page",
                "no topbar/document horizontal overflow at 1440, 1180, 900, 560, 390, and 320px"
            ],
            "responsive": responsive_results,
            "heightPolicy": {
                "baselineHeight": baseline_height,
                "movedWithoutAutoExpand": moved_height,
                "fixedWidth": fixed_width,
                "heightAfterManualResize": after_manual_resize,
                "savedHeightAfterManualResize": saved_height,
                "heightAfterElementShrink": stayed_height
            },
            "layoutHarness": layout_result,
            "exportedFiles": exported_count,
            "pageErrors": page_errors,
            "consoleErrors": console_errors
        }
        print(json.dumps(result, ensure_ascii=False, indent=2))
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
