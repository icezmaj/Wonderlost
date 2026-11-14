// Browser regression test for the GitHub Pages build.
// Usage: npm install --no-save playwright-core && node tools/browser-smoke.js
const { chromium } = require('playwright-core');
const path = require('node:path');

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.stack || String(error)));
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    page.on('requestfailed', req => errors.push('Failed request: ' + req.url() + ' (' + req.failure()?.errorText + ')'));
    await page.goto('file://' + path.resolve(__dirname, '../docs/index.html'), { waitUntil: 'load' });
    await page.waitForFunction(() => window.__wonderlost?.app?.screen === 'title', null, { timeout: 15000 });
    await page.waitForTimeout(1500); // allow embedded images to decode
    const title = await page.evaluate(() => ({
      screen: window.__wonderlost.app.screen,
      visibleBegin: !!document.getElementById('b-begin')?.getClientRects().length,
      canvasWidth: document.getElementById('stage').width,
      canvasHeight: document.getElementById('stage').height
    }));
    console.log('Title:', JSON.stringify(title));
    if (!title.visibleBegin || title.canvasWidth <= 0 || title.canvasHeight <= 0) throw new Error('Title/button/canvas not visible');
    await page.screenshot({ path: 'wonderlost-title.png' });
    await page.locator('#b-begin').click({ timeout: 10000 });
    await page.waitForFunction(() => window.__wonderlost?.app?.screen === 'dive', null, { timeout: 15000 });
    await page.waitForTimeout(1200);
    const dive = await page.evaluate(() => ({
      screen: window.__wonderlost.app.screen,
      hint: document.querySelector('#hint')?.textContent,
      canvasWidth: document.getElementById('stage').width
    }));
    console.log('Dive:', JSON.stringify(dive));
    await page.screenshot({ path: 'wonderlost-dive.png' });
    // A player must be able to use the aim gesture without crashing the frame loop.
    const c = page.locator('#stage');
    const box = await c.boundingBox();
    if (!box) throw new Error('Game canvas has no clickable bounds');
    await page.mouse.move(box.x + box.width * 0.52, box.y + box.height * 0.36);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.70, box.y + box.height * 0.52, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(900);
    console.log('After aim:', await page.evaluate(() => window.__wonderlost?.app?.screen));
    if (errors.length) throw new Error('Browser errors:\n' + errors.join('\n'));
    console.log('PASS: title, begin, first dive and aim gesture completed without browser errors.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
