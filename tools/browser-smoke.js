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
    page.on('console', msg => { if (msg.type() === 'error' && !msg.text().includes('Failed to load resource: the server responded with a status of 404')) errors.push(msg.text()); });
    page.on('response', response => { if (response.status() >= 400 && !/\/favicon\.ico(?:\?|$)/.test(response.url())) errors.push('HTTP ' + response.status() + ': ' + response.url()); });
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
    const afterAim = await page.evaluate(() => ({ screen: window.__wonderlost?.app?.screen, hint: document.getElementById('hint')?.textContent }));
    console.log('After aim:', JSON.stringify(afterAim));
    if (afterAim.hint?.includes('Touch and drag to aim')) throw new Error('Aim gesture was ignored; first dive remains stuck waiting for input');
    // Verify players can return home and open the restoration menu.
    await page.evaluate(() => window.__wonderlost.app.goHome());
    await page.waitForFunction(() => window.__wonderlost.app.screen === 'home', null, { timeout: 5000 });
    await page.screenshot({ path: 'wonderlost-home.png' });
    await page.locator('#b-restore').click();
    const restoreOpened = await page.locator('#sheet').evaluate(el => !el.hidden);
    if (!restoreOpened) throw new Error('Restore button did not open the restoration sheet');
    await page.evaluate(() => window.__wonderlost.app.ui.closeSheet());
    await page.locator('#b-dive').click();
    await page.waitForFunction(() => window.__wonderlost.app.screen === 'dive', null, { timeout: 10000 });

    // The deployed Pages URL must load, not just the checked-in local HTML.
    await page.goto('https://icezmaj.github.io/Wonderlost/?smoke=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => window.__wonderlost?.app?.screen === 'title', null, { timeout: 15000 });
    console.log('Public GitHub Pages: title loaded successfully');
    // Returning-player regression: an existing save must open Home instead of
    // forcing the first-time tutorial or leaving a non-interactive screen.
    await page.locator('#b-begin').click();
    await page.waitForFunction(() => window.__wonderlost.app.screen === 'dive', null, { timeout: 15000 });
    await page.evaluate(() => {
      window.__wonderlost.app.state.stats.dives = 1;
      window.__wonderlost.app.goHome();
    });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__wonderlost?.app?.screen === 'title', null, { timeout: 15000 });
    await page.locator('#b-begin').click();
    await page.waitForFunction(() => window.__wonderlost.app.screen === 'home', null, { timeout: 15000 });
    await page.waitForFunction(() => !document.getElementById('wipe').classList.contains('on'), null, { timeout: 5000 });
    await page.screenshot({ path: 'wonderlost-desktop-returning.png' });
    console.log('Public Pages existing save: returned to Home on desktop successfully');
    // Non-destructive rescue mode must keep the game accessible if art fails.
    const classic = await browser.newPage({ viewport: { width: 390, height: 844 } });
    try {
      await classic.goto('https://icezmaj.github.io/Wonderlost/?classic', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await classic.waitForFunction(() => window.__wonderlost?.app?.screen === 'title', null, { timeout: 15000 });
      await classic.locator('#b-begin').click();
      await classic.waitForFunction(() => window.__wonderlost.app.screen === 'dive', null, { timeout: 15000 });
      console.log('Classic-art rescue mode: first dive started');
    } finally { await classic.close(); }
    if (errors.length) throw new Error('Browser errors:\\n' + errors.join('\\n'));
    console.log('PASS: local title, dive, aim, home, Restore, second dive and public Pages launch.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
