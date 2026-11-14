#!/usr/bin/env node
// Fills every art slot with a labelled test image, to check sizes and
// positions before real art exists.
//
//   node tools/slot-test-art.js <output folder>
//   node tools/build.js --assets <output folder> --out <test build>.html
//
// Never point this at assets/: these are test cards, not game art.

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const out = path.resolve(process.argv[2] || '');
if (!process.argv[2]) {
  console.error('usage: node tools/slot-test-art.js <output folder>');
  process.exit(1);
}

(async () => {
  const { slotFiles, MARGIN } = await import('../src/config/slots.js');
  const files = slotFiles();
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const [name, def] of Object.entries(files)) {
    const glow = name.endsWith('_glow');
    const full = !!def.fit;
    const k = full ? 1 : 1 / (1 - MARGIN * 2);
    const scale = (def.px || def.w * 4 * k) / (def.w * k);
    const W = Math.round(def.w * k * scale * (glow ? 2 : 1));
    const H = Math.round(def.h * k * scale * (glow ? 2 : 1));
    const url = await page.evaluate(
      ({ name, W, H, glow, full, M }) => {
        const c = document.createElement('canvas');
        c.width = W;
        c.height = H;
        const g = c.getContext('2d');
        let hash = 0;
        for (const ch of name.replace(/_(\d|glow|idle|asleep|happy|blink)+$/g, '')) hash = (hash * 31 + ch.charCodeAt(0)) % 360;
        if (glow) {
          const r = g.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.min(W, H) / 2);
          r.addColorStop(0, 'rgba(255,207,92,.55)');
          r.addColorStop(1, 'rgba(255,207,92,0)');
          g.fillStyle = r;
          g.fillRect(0, 0, W, H);
          return c.toDataURL('image/png');
        }
        const x = full ? 0 : W * M;
        const y = full ? 0 : H * M;
        const w = W - x * 2;
        const h = H - y * 2;
        const stage = /_(\d)$/.exec(name);
        const light = 45 + (stage ? +stage[1] * 10 : 20);
        g.fillStyle = `hsla(${hash}, 55%, ${light}%, ${name === 'bubble' || name.includes('mist') ? 0.35 : full ? 1 : 0.88})`;
        g.beginPath();
        g.roundRect(x, y, w, h, full ? 0 : Math.min(w, h) * 0.22);
        g.fill();
        g.strokeStyle = 'rgba(255,255,255,.9)';
        g.lineWidth = Math.max(2, W / 120);
        g.stroke();
        // an arrow so flips and rotations are visible
        g.fillStyle = 'rgba(255,255,255,.9)';
        g.beginPath();
        g.moveTo(x + w * 0.5, y + h * 0.08);
        g.lineTo(x + w * 0.6, y + h * 0.26);
        g.lineTo(x + w * 0.4, y + h * 0.26);
        g.fill();
        let size = Math.min(h * 0.3, (w * 1.5) / name.length);
        g.font = `800 ${size}px sans-serif`;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillStyle = '#17133a';
        g.fillText(name, W / 2, y + h * 0.6);
        return c.toDataURL('image/png');
      },
      { name, W, H, glow, full, M: MARGIN }
    );
    fs.writeFileSync(path.join(out, name + '.png'), Buffer.from(url.split(',')[1], 'base64'));
  }
  await browser.close();
  console.log(`${Object.keys(files).length} test images written to ${out}`);
})();
