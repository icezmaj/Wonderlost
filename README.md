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

## Worlds

- **Mistlewick** (Case 001, the cracked teapot) is the first world.
- **Tocktown** (Case 002, the stopped pocket watch) opens after 12 restorations
  in Mistlewick. Tap the watch on the desk to travel there, and the teapot to
  come back. Its hollows are laid out like a clock face and add spinning cogs.

- **Hushfall** (Case 003, the forgotten snow globe) opens after 12 restorations
  in Tocktown. Its hollows are a snowflake of ice slides, with gusts of wind,
  and snow only starts to fall in the globe as the city is restored.

World content is data in `src/config/worlds.js` (upgrades, creatures, artifacts)
and `src/config/objectives.js` (case files). Tocktown's home scene is drawn in
`src/render/tocktownScene.js` and Hushfall's in `src/render/hushfallScene.js`;
neither has painted art yet.

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

## Play online with GitHub Pages

The game has a self-contained Pages build at `docs/index.html`.

**One-time GitHub setup:** Go to **Settings → Pages** in this repository, select
**Deploy from a branch**, choose branch **main** and folder **/docs**, then
click **Save**. The site will appear at:

https://icezmaj.github.io/Wonderlost/

Running `node tools/build.js` generates both `dist/wonderlost.html` and
`docs/index.html` (including art assets), so commit both generated files
when you update the game to keep the live website current. Use the normal
build rather than `--link`; standalone asset URLs aren't suitable for this
self-contained Pages deployment. GitHub Pages typically takes a few minutes
to publish after changes are pushed.
