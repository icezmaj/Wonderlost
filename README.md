# Wonderlost
Mobile game

## Layout

- `dist/wonderlost.html` — single-file playable build (open in any browser)
- `src/` — game source as ES modules; balance values live in `src/config/tuning.js`
- `assets/` — finished art, one image per slot (see below)
- `docs/ART_GUIDE.md` — art style rules and the full asset list
- `tools/build.js` — bundles `src/` and `assets/` into `dist/wonderlost.html`
- `tools/fit_art.py` — fits downloaded images to their slots and saves them into `assets/`
- `tools/slot-test-art.js` — makes labelled test images for every slot
- `tools/unbundle.py` — splits a bundled build back into `src/`
- `tools/smoke.js` — headless load check: `node tools/smoke.js <abs path to html> <screenshot path>`

## Build

```
node tools/build.js
```

## Adding art

Every piece of art in the game is drawn in code until an image replaces it.
To replace one, name the image after its slot (`nimbit_idle.png`,
`mw_teapot_0.png`, …) and run:

```
python3 tools/fit_art.py <image or folder>   # trim, pad, resize, save to assets/ as WebP
node tools/build.js
```

`fit_art.py` needs Pillow (`pip install pillow`). The slot
names, sizes and positions are defined in `src/config/slots.js` and listed for
artists in `docs/ART_GUIDE.md`.

In the game, **Settings → Art slots** outlines and labels every slot.

Images are inlined into the single HTML file, so prefer WebP and watch the
build size it prints. `node tools/build.js --link` references the files by
path instead of inlining them.
