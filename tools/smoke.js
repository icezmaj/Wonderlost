const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.goto('file://' + process.argv[2]);
  await p.waitForTimeout(1500);
  const ok = await p.evaluate(() => !!window.__wonderlost && window.__wonderlost.app.screen);
  console.log('screen:', ok, 'errors:', JSON.stringify(errs));
  await p.screenshot({ path: process.argv[3] });
  await b.close();
})();
