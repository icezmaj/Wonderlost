# Wonderlost
Mobile game

## Layout

- `dist/wonderlost.html` — single-file playable build (open in any browser)
- `src/` — game source as ES modules; balance values live in `src/config/tuning.js`
- `tools/unbundle.py` — splits a bundled build back into `src/`
- `tools/smoke.js` — headless load check: `node tools/smoke.js <abs path to html> <screenshot path>`
