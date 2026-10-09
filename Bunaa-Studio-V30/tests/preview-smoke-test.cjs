'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const htmlPath = path.join(root, 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');

function staticChecks() {
  assert.ok(html.startsWith('<!doctype html>'), 'index.html has a valid HTML document start');
  assert.ok(html.includes('id="previewBtn"'), 'Preview button exists');
  assert.ok(html.includes("on('previewBtn',()=>this.preview())"), 'Preview button is wired to the preview method');
  assert.ok(html.includes('previewWindow.document.write(html)'), 'Preview writes a full standalone document');
  assert.ok(html.includes("'+sections+runtime+'</body></html>'"), 'Preview includes the generated runtime as an executable script');
  assert.ok(html.includes('data-preview-section'), 'Page routing markup is present');

  const scriptMatches = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
  assert.ok(scriptMatches.length >= 1, 'At least one inline script exists');
  for (let index = 0; index < scriptMatches.length; index += 1) {
    new vm.Script(scriptMatches[index][1], { filename: 'index.html:inline-script-' + index });
  }
  console.log('PASS: static HTML/preview wiring and inline JavaScript syntax');
}

async function browserChecks() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1365, height: 900 } });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push('editor: ' + error.message));

  try {
    await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load' });
    await page.locator('#guestBtn').click();
    await page.waitForSelector('#onboarding:not(.hidden)', { timeout: 10000 });

    await page.locator('#newProjectBtn').click();
    await page.waitForSelector('#newProjectName', { timeout: 5000 });
    await page.locator('#newProjectName').fill('Preview smoke test');
    const alternateTemplate = page.locator('[data-template-choice="1"]');
    if (await alternateTemplate.count()) await alternateTemplate.click();
    await page.getByRole('button', { name: 'إنشاء المشروع', exact: true }).click();
    await page.waitForSelector('#workspace:not(.hidden)', { timeout: 15000 });
    await page.waitForSelector('#previewBtn', { state: 'visible', timeout: 5000 });

    const popupPromise = context.waitForEvent('page', { timeout: 8000 }).catch(() => null);
    await page.locator('#previewBtn').click();
    let preview = await popupPromise;

    // Popup blockers are browser policy; exercise the direct-link fallback too.
    if (!preview) {
      const link = page.locator('#openPreviewLink');
      await link.waitFor({ state: 'visible', timeout: 5000 });
      const fallbackPopupPromise = context.waitForEvent('page', { timeout: 8000 }).catch(() => null);
      await link.click();
      preview = await fallbackPopupPromise;
    }
    assert.ok(preview, 'Preview opens as a separate browser page');
    preview.on('pageerror', error => pageErrors.push('preview: ' + error.message));
    await preview.waitForLoadState('load', { timeout: 10000 }).catch(() => {});
    await preview.waitForSelector('body > .export-site-nav', { timeout: 10000 });
    await preview.waitForFunction(() => {
      const sections = [...document.querySelectorAll('[data-preview-section]')];
      return sections.length > 0 && sections.some(section => !section.hidden && section.querySelector('main'));
    }, null, { timeout: 10000 });

    const title = await preview.title();
    assert.ok(title.length > 0, 'Standalone preview has a document title');
    const sectionCount = await preview.locator('[data-preview-section]').count();
    assert.ok(sectionCount >= 1, 'Preview contains at least one generated page');

    const currentId = await preview.locator('[data-preview-section]:not([hidden])').first().getAttribute('data-preview-section');
    const navLinks = preview.locator('nav a[data-page-target]');
    let navigated = false;
    for (let i = 0; i < await navLinks.count(); i += 1) {
      const link = navLinks.nth(i);
      const targetId = await link.getAttribute('data-page-target');
      if (targetId && targetId !== currentId) {
        await link.click();
        await preview.waitForFunction(id => {
          const target = [...document.querySelectorAll('[data-preview-section]')].find(section => section.dataset.previewSection === id);
          return !!target && !target.hidden;
        }, targetId, { timeout: 5000 });
        navigated = true;
        break;
      }
    }

    await preview.setViewportSize({ width: 390, height: 844 });
    const dimensions = await preview.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth
    }));
    assert.ok(dimensions.document <= dimensions.viewport + 80, 'Mobile preview has no major horizontal overflow');

    await new Promise(resolve => setTimeout(resolve, 250));
    assert.deepEqual(pageErrors, [], 'Editor and preview produce no uncaught JavaScript errors');
    console.log('PASS: guest flow, project creation, standalone preview, generated page rendering');
    console.log(navigated ? 'PASS: internal multi-page navigation' : 'INFO: no second distinct navigation target found in selected template');
    console.log('PASS: mobile viewport sanity (' + dimensions.viewport + 'px viewport / ' + dimensions.document + 'px document)');
  } finally {
    await context.close();
    await browser.close();
  }
}

(async () => {
  staticChecks();
  await browserChecks();
})().catch(error => {
  console.error('FAIL:', error && error.stack || error);
  process.exitCode = 1;
});
