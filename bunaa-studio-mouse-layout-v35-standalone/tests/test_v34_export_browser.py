#!/usr/bin/env python3
"""Browser integration coverage for V34 single-file multi-page HTML and full-site ZIP exports."""
from __future__ import annotations
import asyncio, base64, json, os, shutil, zipfile
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
PNG=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADUlEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC')
DATA='data:image/png;base64,'+base64.b64encode(PNG).decode()

async def main():
    executable=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or '/usr/bin/chromium'
    async with async_playwright() as p:
        browser=await p.chromium.launch(headless=True,executable_path=executable,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'])
        page=await browser.new_page(viewport={'width':1440,'height':960},accept_downloads=True)
        page_errors=[];console_errors=[]
        page.on('pageerror',lambda e:page_errors.append(str(e)))
        page.on('console',lambda m:console_errors.append(m.text) if m.type=='error' else None)
        print('TEST starting editor',flush=True); await page.set_content((ROOT/'index.html').read_text(encoding='utf-8'),wait_until='load')
        assert await page.evaluate('!!window.__BUNAA_APP'), 'App boot failed'
        await page.click('#guestBtn');await page.click('#newProjectBtn');await page.locator('#newProjectName').fill('V34 Multipage Export Test');await page.get_by_text('إنشاء المشروع',exact=True).click();await page.wait_for_selector('#pageCanvas')
        # A self-contained deterministic project with two linked pages, an uploaded local image, and an animation interaction.
        print('TEST creating project',flush=True); await page.evaluate('''(dataUrl)=>{
          const app=window.__BUNAA_APP,store=app.store;
          const mk=(id,type,props={},style={})=>({id,type,props,style:{marginTop:0,marginBottom:14,...style},responsive:{},classes:[],attrs:{},semantic:{tag:'div',role:'',ariaLabel:''},layout:{display:'block',direction:'column',gap:0,align:'stretch',justify:'start',wrap:false},visibility:{desktop:true,tablet:true,mobile:true},device:{created:'desktop',touched:['desktop']},locked:false,children:[]});
          const imageId='qa-image-node',buttonId='qa-navigation-button',homeId='qa-home',aboutId='qa-about';
          store.transact('Prepare V34 export QA',project=>{
            project.meta.name='V34 Multipage Export Test';
            project.site.brand={...(project.site.brand||{}),name:'V34 Export QA'};
            project.assets=[{id:'qa-image-asset',name:'qa-pic',filename:'qa-pic.png',originalName:'qa-pic.png',type:'image/png',kind:'image',data:dataUrl,url:'',size:68,alt:'embedded test image',folder:'qa',tags:[]}];
            project.pages=[
              {id:homeId,name:'Home QA',slug:'index',path:'/home',seo:{title:'Home QA',description:'home'},settings:{showInNav:true,hidden:false},status:'draft',dataBindings:[],nodes:[mk('qa-home-title','heading',{text:'Home QA Heading'},{width:'fit-content',fontSize:32}),mk(buttonId,'button',{text:'Go About QA',url:'page:qa-about',action:'page'},{width:'fit-content',paddingX:20,paddingY:12}),mk(imageId,'image',{assetId:'qa-image-asset',src:'',alt:'embedded test image'},{width:260,height:160,objectFit:'contain'})]},
              {id:aboutId,name:'About QA',slug:'about',path:'/about',seo:{title:'About QA',description:'about'},settings:{showInNav:true,hidden:false},status:'draft',dataBindings:[],nodes:[mk('qa-about-title','heading',{text:'About QA Heading'},{width:'fit-content',fontSize:30}),mk('qa-return-home','link',{text:'Return Home QA',url:'page:qa-home'},{width:'fit-content'})]}
            ];
            project.activePageId=aboutId;
            project.navigation={menus:[{id:'main',name:'Main',items:[{label:'Home QA',type:'page',targetId:homeId},{label:'About QA',type:'page',targetId:aboutId}]},{id:'footer',name:'Footer',items:[]}],headerMenuId:'main',footerMenuId:'footer'};
            project.interactions=[{id:'qa-motion',sourceId:buttonId,trigger:'click',enabled:true,condition:{type:'always'},steps:[{action:'motion',options:{targetId:buttonId,motion:'pulse',duration:180},delay:0}]}];
          });
          store.setActivePage(aboutId);
        }''',DATA)
        await page.wait_for_timeout(400)
        print('TEST project created',flush=True); # The initial editor view must auto-fit the artboard to usable viewport width.
        await page.click('#zoomFit')
        await page.wait_for_timeout(120)
        canvas_metrics=await page.evaluate('''()=>{const v=document.querySelector('#canvasViewport'),s=document.querySelector('#canvasStage');const r=v.getBoundingClientRect(),b=s.getBoundingClientRect();return {vw:v.clientWidth,stageWidth:b.width,zoom:window.__BUNAA_APP.store.ui.zoom,pad:getComputedStyle(v).paddingLeft,leftGap:Math.round(b.left-r.left),rightGap:Math.round(r.right-b.right),overflow:document.documentElement.scrollWidth-innerWidth}}''')
        assert canvas_metrics['overflow']<=2, f'Document viewport horizontal overflow: {canvas_metrics}'
        assert canvas_metrics['stageWidth'] <= canvas_metrics['vw']+2, f'Fit-to-width leaves stage wider than viewport: {canvas_metrics}'
        assert abs(canvas_metrics['leftGap']-canvas_metrics['rightGap']) <= 8, f'Canvas not centered after fitting: {canvas_metrics}'
        responsive_fit=[]
        for width,height in [(1180,900),(900,900),(560,900),(390,844),(320,780)]:
            await page.set_viewport_size({'width':width,'height':height})
            await page.wait_for_timeout(220)
            metric=await page.evaluate('''()=>{const v=document.querySelector('#canvasViewport'),s=document.querySelector('#canvasStage'),vr=v.getBoundingClientRect(),sr=s.getBoundingClientRect();return {vw:v.clientWidth,sw:sr.width,left:Math.round(sr.left-vr.left),right:Math.round(vr.right-sr.right),zoom:window.__BUNAA_APP.store.ui.zoom}}''')
            assert metric['sw'] <= metric['vw']+3, f'Automatic canvas fit failed at viewport {width}: {metric}'
            assert abs(metric['left']-metric['right']) <= 12, f'Canvas margins drifted at viewport {width}: {metric}'
            responsive_fit.append({'viewport':width,**metric})
        await page.set_viewport_size({'width':1440,'height':960});await page.wait_for_timeout(250)
        canvas_metrics['responsiveFit']=responsive_fit
        # Standalone HTML: explicitly choose the second page as the initial page.
        print('TEST open export modal',flush=True); await page.click('#exportBtn');await page.wait_for_selector('#htmlPage'); print('TEST export modal open',flush=True)
        await page.locator('#htmlPage').select_option('qa-about')
        print('TEST click standalone export',flush=True)
        async with page.expect_download(timeout=30000) as download_info:
            await page.click('#html')
        download=await download_info.value
        html_path=ROOT/'tests'/'downloaded-v34-standalone.html';await download.save_as(html_path)
        print('TEST download received',flush=True); html=html_path.read_text(encoding='utf-8')
        assert 'data-bunaa-single-file="1"' in html, 'HTML export is not self-contained single file'
        assert html.count('data-bunaa-single-page=')==2, 'Standalone HTML must include both linked pages'
        assert 'Home QA Heading' in html and 'About QA Heading' in html, 'A page is missing from standalone HTML'
        assert DATA in html and 'data:image/png;base64,' in html, 'Uploaded image bytes were not inlined into HTML'
        assert '<script src=' not in html and '<link rel="stylesheet" href="styles.css"' not in html, 'HTML export still depends on sidecar CSS/JS'
        assert 'motion-pulse' in html and 'Bunaa Studio V34 Single-File Export' in html, 'Animation runtime/styles missing from HTML export'
        # Run the downloaded HTML in Chromium and actually navigate between pages.
        site=await browser.new_page(viewport={'width':390,'height':844})
        site.set_default_timeout(8000); site_errors=[];site.on('pageerror',lambda e:site_errors.append(str(e)))
        print('TEST load standalone html',flush=True); await site.set_content(html,wait_until='load'); print('TEST standalone loaded',flush=True)
        assert await site.locator('.bunaa-single-page:not([hidden])').get_attribute('data-bunaa-single-page')=='qa-about', 'HTML did not open the selected page'
        assert await site.locator('.bunaa-single-page:not([hidden])').inner_text() and 'About QA Heading' in await site.locator('.bunaa-single-page:not([hidden])').inner_text()
        image=site.locator('[data-runtime-id="qa-image-node"] img')
        # The image lives in the hidden home page initially; navigate, then verify it is decoded.
        print('TEST navigate to home page',flush=True); await site.locator('header.export-site-nav a[data-bunaa-page-link]').filter(has_text='Home QA').click()
        assert await site.locator('.bunaa-single-page:not([hidden])').get_attribute('data-bunaa-single-page')=='qa-home', 'Internal nav did not switch page within same HTML'
        assert await site.locator('#qa-image-node img').count()==0, 'Unexpected test selector'
        image=site.locator('[data-runtime-id="qa-image-node"] img')
        await image.wait_for()
        print('TEST image visible and decode',flush=True); await image.evaluate('img=>img.decode()')
        assert await image.evaluate('img=>img.naturalWidth===1 && img.naturalHeight===1'), 'Inline uploaded image failed to load'
        print('TEST navigate using page element',flush=True); await site.locator('a').filter(has_text='Go About QA').click()
        assert await site.locator('.bunaa-single-page:not([hidden])').get_attribute('data-bunaa-single-page')=='qa-about', 'Link within page did not navigate to About page'
        assert not site_errors, f'Single HTML runtime errors: {site_errors}'
        # Full ZIP: every page, local CSS/JS, image file, and real local navigation targets.
        print('TEST click zip export',flush=True)
        async with page.expect_download(timeout=30000) as zip_info:
            await page.click('#zip')
        zip_download=await zip_info.value
        zip_path=ROOT/'tests'/'downloaded-v34-complete-site.zip';await zip_download.save_as(zip_path)
        print('TEST ZIP received',flush=True)
        with zipfile.ZipFile(zip_path) as z:
            assert z.testzip() is None, 'ZIP CRC verification failed'
            names=z.namelist()
            assert 'index.html' in names and 'about.html' in names, f'ZIP page files missing: {names}'
            assert 'styles.css' in names and 'script.js' in names and 'project.json' in names, 'ZIP site runtime files missing'
            asset_names=[n for n in names if n.startswith('assets/') and n.endswith('.png')]
            assert asset_names, f'Uploaded image asset missing from ZIP: {names}'
            about=z.read('about.html').decode('utf-8')
            home=z.read('index.html').decode('utf-8')
            assert 'href="about.html"' in home and 'href="index.html"' in about, 'Internal page navigation not rewritten to local files'
            assert asset_names[0] in home, 'HTML page does not reference the exported local image path'
            assert z.read(asset_names[0])==PNG, 'Downloaded image bytes differ from original upload'
            assert '<script src="script.js">' in home and '<link rel="stylesheet" href="styles.css">' in home, 'ZIP page is missing JS/CSS references'
            assert 'motion-pulse' in z.read('styles.css').decode() and 'const names=new Set' in z.read('script.js').decode(), 'ZIP animation styles/runtime not connected'
        assert not page_errors and not console_errors, f'Editor runtime issues: page={page_errors}, console={console_errors}'
        print('PASS V34 exports: selected-page single HTML embeds every linked page, CSS, animations, JS, and image bytes; navigation works in Chromium.')
        print('PASS V34 ZIP export: all pages linked locally, styles/script present, uploaded media stored and referenced, ZIP CRC valid.')
        print(f'PASS canvas spacing metrics: {json.dumps(canvas_metrics)}')
        await browser.close()
        html_path.unlink(missing_ok=True);zip_path.unlink(missing_ok=True)

if __name__=='__main__':
    asyncio.run(main())
