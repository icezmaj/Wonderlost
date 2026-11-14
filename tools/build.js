#!/usr/bin/env node
// Bundles src/ into the single playable file dist/wonderlost.html.
//
//   node tools/build.js                 inline every image in assets/ into the file
//   node tools/build.js --assets <dir>  take images from another folder
//   node tools/build.js --link          reference images by path instead of inlining
//   node tools/build.js --out <file>    write somewhere other than dist/wonderlost.html
//
// Images are matched to art slots by file name (assets/nimbit_idle.png fills
// the slot "nimbit_idle"). See docs/ART_GUIDE.md and src/config/slots.js.

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const opt = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : null);
const assetsDir = path.resolve(opt('--assets') || path.join(root, 'assets'));
const outFile = path.resolve(opt('--out') || path.join(root, 'dist', 'wonderlost.html'));
const link = args.includes('--link');

const MIME = { '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' };

function assetIndex() {
  const index = {};
  if (!fs.existsSync(assetsDir)) return index;
  for (const file of fs.readdirSync(assetsDir).sort()) {
    const ext = path.extname(file).toLowerCase();
    if (!MIME[ext]) continue;
    const full = path.join(assetsDir, file);
    index[path.basename(file, ext)] = link
      ? path.relative(path.dirname(outFile), full).split(path.sep).join('/')
      : `data:${MIME[ext]};base64,${fs.readFileSync(full).toString('base64')}`;
  }
  return index;
}

const order = [];
const seen = new Set();
const code = {};

function visit(id) {
  if (seen.has(id)) return;
  seen.add(id);
  const lines = fs.readFileSync(path.join(root, id), 'utf8').replace(/\n+$/, '').split('\n');
  const out = [];
  for (const line of lines) {
    const imp = line.match(/^import (\{.*\}) from '(.+)';$/);
    const exp = line.match(/^export \{(.*)\};$/);
    if (imp) {
      const dep = path.posix.join(path.posix.dirname(id), imp[2]);
      visit(dep);
      out.push(`const ${imp[1].replace(/ as /g, ': ')} = __m['${dep}'];`);
    } else if (exp) {
      out.push(`return { ${exp[1].trim()} };`);
    } else if (/^(import|export)\b/.test(line)) {
      throw new Error(`${id}: unsupported module syntax: ${line}`);
    } else out.push(line);
  }
  if (!/^return \{/.test(out[out.length - 1])) out.push('return {  };');
  code[id] = out.join('\n');
  order.push(id);
}

visit('src/main.js');

const index = assetIndex();
code['src/config/assetIndex.js'] = `const ASSET_INDEX = ${JSON.stringify(index)};\n\nreturn { ASSET_INDEX };`;

const js =
  "(function () {\n'use strict';\nconst __m = {};\n" +
  order.map((id) => `// ---- ${id} ----\n__m['${id}'] = (function () {\n${code[id]}\n})();\n`).join('\n') +
  '})();';

const html = fs
  .readFileSync(path.join(root, 'src', 'index.html'), 'utf8')
  .replace('/*__CSS__*/', () => fs.readFileSync(path.join(root, 'src', 'styles.css'), 'utf8').trimEnd())
  .replace('/*__JS__*/', () => js);

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, html);

// Keep the GitHub Pages version in sync with the playable build.
// Pages is published from main /docs; the HTML is self-contained with
// embedded assets. Linked builds cannot be copied to Pages safely.
if (!args.includes('--out') && !link) {
  const pagesFile = path.join(root, 'docs', 'index.html');
  fs.mkdirSync(path.dirname(pagesFile), { recursive: true });
  fs.writeFileSync(pagesFile, html);
  console.log('docs/index.html: GitHub Pages build synchronized');
}
const names = Object.keys(index);
console.log(`${path.relative(root, outFile)}: ${order.length} modules, ${names.length} image(s)${link ? ' linked' : ' inlined'}, ${(html.length / 1024).toFixed(0)} KB`);
