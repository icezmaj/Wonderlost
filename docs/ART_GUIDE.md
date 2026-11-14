# Wonderlost Art Guide

How every image in Wonderlost should look, and the full list of images the first
world (Mistlewick) needs. Written for whoever makes the art: an illustrator, a
3D artist rendering stills, or someone guiding an image tool.

The target is the snow-globe reference image: a tiny, warm, handmade world
sealed inside an object, lit from within, sitting in a cool quiet dark.

---

## 1. The look in one paragraph

Everything is a **small collectible toy** made of matte clay or soft vinyl:
chunky, rounded, slightly imperfect, no outlines. The world sits **inside its
container** (for Mistlewick, a cracked teapot) on a little cloud island. The
scene is **lit from inside** by warm lamps, windows and the Hearth, against a
**cool teal backdrop**. Colours are few and milky. Nothing is sharp, glossy,
realistic or busy.

## 2. Five rules that keep assets matching

These matter more than any individual asset. If two images disagree on one of
these, they will not sit together on screen.

1. **One light direction.** Soft key light from the **upper left, slightly in
   front**. Shadows fall down and to the right. Never light from below or behind.
2. **One camera.** Three-quarter view from slightly above (about 20–25° down),
   as if looking at a model on a table. No straight-on side views, no top-down.
   Very little perspective distortion (long lens / near-orthographic).
3. **One material.** Matte, slightly soft surfaces with a gentle light bleed at
   the edges (like wax or vinyl). The only shiny things are glass, glaze on the
   teapot, and gold mending seams.
4. **No outlines, no pure black, no pure white.** Darkest value is deep plum
   (`#3a2a55`). Brightest non-glowing value is cream (`#fff4dc`). Only light
   sources may reach white.
5. **Rounded everything.** Every corner has a visible radius. Roof tips droop a
   little. Straight lines wobble slightly. If it could cut you, it is wrong.

## 3. Palette

Use these and tints between them. A single asset should use **three or four**
of them, not all.

| Role | Colour | Hex |
|---|---|---|
| Backdrop, deep | Deep teal | `#1d4f5c` |
| Backdrop, mid | Sea teal | `#2f6f7a` |
| Backdrop, haze | Mist teal | `#6fb3b0` |
| Main warm | Rose pink | `#f4a6b4` |
| Warm accent | Coral | `#f08a8a` |
| Walls, cloud tops | Cream | `#f6e3b4` |
| Roofs, trim, wood | Butter | `#f7d774` |
| Light sources, Glow | Spark gold | `#ffcf5c` |
| Hot core of lights | Warm white | `#fff3c4` |
| Cool accent | Mint | `#a8dcd0` |
| Cool accent 2 | Lavender | `#b9a6e0` |
| Shadows | Plum | `#4a3566` |
| Deepest shadow | Deep plum | `#3a2a55` |
| Gold mending seams | Seam gold | `#f5b942` |

Balance on a full screen: roughly **60% cool backdrop, 30% pinks and creams,
10% glowing gold**. Gold is reserved for things the player wants (Glow, lit
lanterns, the Hearth, rewards). Do not use it for decoration.

Shadows are plum, never grey or black. Shadow areas shift toward lavender;
lit areas shift toward butter.

## 4. Shape and proportion

- **Buildings:** about as wide as tall, oversized roofs (roof is 40–50% of the
  height), one or two windows, one door. Windows are large and simple.
- **Creatures:** head-and-body in one blob, roughly 1:1. Eyes are two dark
  dots set wide and low, tiny smile, round pink cheeks. No teeth, no fingers,
  no eyebrows. Limbs are stubs.
- **Props:** readable as a silhouette at thumbnail size. If it needs detail to
  be recognised, simplify it.
- **Detail budget:** one large shape, two medium shapes, a few small accents.
  Stop there.

## 5. Light and glow

- Every asset that glows is delivered in **two layers**: the object itself, and
  a separate soft glow halo. The game brightens, pulses and tints the halo.
- Windows and lamps glow spark gold with a warm-white core.
- "Asleep" or "unrestored" versions keep the same shape but are **desaturated
  toward lavender-grey, unlit, and slightly slumped**. Not ruined, not scary,
  not dirty. Asleep, not dead.
- Sparkles, drifting dust, steam, hearts and stars are **not painted in**. The
  game draws those so they can move.

## 6. What the game does in code (do not paint these)

- Glass and glaze highlights that shift as the scene moves
- Bobbing, breathing, squash and stretch, blinking (from the two eye frames)
- Glow pulses, bloom, light spilling onto the ground
- Particles: sparkles, steam, motes, confetti, trails
- Parallax between backdrop, island and foreground
- Silhouettes of undiscovered artifacts (made from the artifact image)

## 7. File rules

- **Format:** PNG or WebP with a transparent background and straight
  (non-premultiplied) alpha. The two backdrops are the only opaque images.
  WebP keeps the game file much smaller; prefer it for anything large.
- **Size:** each table below gives the export size in pixels. It is the
  object's on-screen size at 4×, plus the margin.
- **Margin:** leave 12% of the image empty on every side, so soft edges and
  shadows are not cut off. The object fills the middle 76%.
- **Anchor:** grounded objects touch the ground at the horizontal centre, 12%
  up from the bottom edge. Floating objects are centred.
- **Shadows:** include the soft contact shadow under grounded objects. Do not
  include long cast shadows.
- **Glow layers:** a `_glow` file is **twice the width and height** of its
  parent image, centred on the same point, so the halo has room to fade out.
  It contains only light, on transparent.
- **Names:** exactly as listed, lowercase with underscores. The file name is
  what puts the image in the right place.

### Getting an image into the game

1. Name the downloaded file after its slot (for example `lantern_on.png`)
   and put it in any folder, say `downloads/`.
2. Run `python3 tools/fit_art.py downloads/`. This trims the image, adds the
   12% margin, sets the anchor, resizes it to the export size and saves it as
   WebP in `assets/`. It also removes a plain flat background from images that
   came without transparency, and reports anything it could not use.
3. Run `node tools/build.js`.
4. Open `dist/wonderlost.html`.

Because of step 2, images from an image tool do not need to match the size,
margin and anchor rules above exactly. They still need to be one whole object,
not touching the image edge, on a transparent or plain flat background.

Slots without an image keep their current code-drawn art, so images can arrive
one at a time. To see where every slot sits, turn on **Settings → Art slots**
in the game: each slot is outlined and labelled with its file name (pink when
empty, green when filled).

## 8. Asset list: Mistlewick

This list mirrors `src/config/slots.js`, which is what the game actually
reads. "On screen" is the object's size in game units (the play area is
360 wide). Stage 0 is the asleep state; stages 1–3 follow the three upgrade
levels and should each be visibly richer than the last, so a returning player
can see what they paid for.

### 8.1 Home screen

The scene is a teapot standing on a surface, seen from outside with its lid
off. Four small cloud islands float above its opening, and the village is
built on them: bell tower on the top island, cottages on the left, garden on
the right, Hearth Well on the lowest island in the middle.

| File | On screen | Export px | Notes |
|---|---|---|---|
| `mw_backdrop` | 360 × 640 | 1440 × 2560 | Teal sky with soft haze, no objects. Opaque. Cropped to fit each phone, so keep the edges plain. |
| `mw_desk` | 360 × 200 | 1440 × 800 | The surface the teapot stands on. The top edge is the horizon line. |
| `mw_moon` | 40 × 40 | 211 × 211 | Porcelain moon, shown once the artifact set is complete. |
| `mw_teapot_0`–`_3` | 296 × 144 | 1558 × 758 | Whole teapot: handle left, spout right, open top. 0: cracked, dull glaze. 1–3: cracks sealed one by one with seam gold, glaze warming. |
| `mw_island` | 160 × 40 | 842 × 211 | One cloud island, reused for all four (shown faint under anything not yet built). |
| `mw_hearth_0`–`_3` | 64 × 80 | 337 × 421 | Hearth Well. 0: cold and dark. 3: roofed and brimming with gold light. |
| `mw_cottages_0`–`_3` | 110 × 70 | 579 × 368 | Cloud Cottages. 0: one sleepy hut. 3: a cluster of three with lit windows. |
| `mw_lanterns_0`–`_3` | 240 × 160 | 1263 × 842 | Lantern Lane: every lantern string as one transparent overlay spanning the islands. 0: bare cords. 3: four full glowing strings. Use the Art slots outline to line the ends up with the islands. |
| `mw_belltower_0`–`_3` | 60 × 96 | 316 × 506 | Bell Tower. 0: stump, no bell. 3: tall tower, gold bell, pointed drooping roof. |
| `mw_garden_0`–`_3` | 100 × 50 | 526 × 263 | Steam Garden. 0: bare vents. 3: tea bushes and flowers around steaming vents. |
| `mw_fore_mist` | 360 × 90 | 1440 × 360 | Soft mist band in front of the teapot's foot. |
| `mw_hearth_1`–`_3_glow`, `mw_cottages_…_glow`, `mw_lanterns_…_glow`, `mw_belltower_…_glow` | 2× parent | 2× parent | One glow layer for each of stages 1–3 of these four buildings. |

**41 images** (29 + 12 glow layers).

### 8.2 Creatures

Four files each, 384 × 384 px. They appear small in the village (about 28
units) and large on their journal cards, so they must read at both sizes.

| Files | Creature | Notes |
|---|---|---|
| `nimbit_idle`, `_asleep`, `_happy`, `_blink` | Nimbit, a shy cloud-puff | Round white-cream puff, mint underside, tiny feet. |
| `sprigget_idle`, `_asleep`, `_happy`, `_blink` | Sprigget, a tea-leaf glider | Small body with two large leaf wings, mint and butter. |
| `whistlewing_idle`, `_asleep`, `_happy`, `_blink` | Whistlewing, a kettle-owl | Owl shaped like a little kettle, spout beak, rose and cream. |

`_blink` is the idle pose with eyes closed. Only `_idle` is required; any
missing pose falls back to it. Creatures face right; the game mirrors them.

**12 images.**

### 8.3 Artifacts (Tea Service of the First Dawn)

One image each, 256 × 256 px, same toy treatment, each with a small gold
accent so they read as treasures. The game makes the "not found yet"
silhouette from the same file.

`art_spoon` (Gilded Teaspoon), `art_sugarstar` (Sugar Star), `art_spool`
(Cloud-Thread Spool), `art_bell` (Porcelain Bell), `art_compass` (Chamomile
Compass), `art_whistle` (Steam Whistle).

**6 images.**

### 8.4 Dive screen

These are small on screen and move fast, so they need the **strongest
silhouettes and the least detail** of anything in the game.

| File | On screen | Export px | Notes |
|---|---|---|---|
| `dive_backdrop` | 360 × 640 | 1440 × 2560 | Inside a hollow: darker teal, soft cloud walls at the edges. Opaque. |
| `dive_spout` | 64 × 80 | 337 × 421 | The spout the Spark drops from, hanging down from the top edge. |
| `spark` | 20 × 20 | 105 × 105 | The player's Spark: a small warm-white star-drop, no face. Its glow and trail are drawn in code so unlockable trail colours still work. |
| `mote` | 8 × 8 | 42 × 42 | A tiny bead of Glow. |
| `lantern_off` | 22 × 30 | 116 × 158 | Paper lantern, unlit. |
| `lantern_on` | 22 × 30 | 116 × 158 | The same lantern, lit. |
| `lantern_on_glow` | 2× parent | 232 × 316 | Its halo. |
| `bloom_charged` | 40 × 40 | 211 × 211 | Bell bloom: a bell-shaped flower that bounces the Spark. |
| `bloom_spent` | 40 × 40 | 211 × 211 | The same bloom, closed and pale. |
| `ledge` | 72 × 22 | 379 × 116 | Cloud ledge, drawn level; the game tilts it. |
| `roof` | 62 × 22 | 326 × 116 | Small peaked roof that shelters a relic. |
| `relic_closed` | 26 × 22 | 137 × 116 | Relic crate: a small gift-like box with a gold clasp. |
| `geyser_vent` | 48 × 30 | 253 × 158 | Steam vent in the hollow floor. Steam is drawn in code. |
| `hearth_dive` | 90 × 36 | 474 × 190 | The Hearth: a wide glowing bowl. Stretched sideways as the Hearth widens, so keep it simple. |
| `hearth_dive_glow` | 2× parent | 948 × 380 | Its halo. |
| `bubble` | 38 × 38 | 200 × 200 | Glass bubble a sleeping creature floats in. Mostly transparent. |

**16 images.**

### 8.5 Interface

Menus, buttons and icons stay as they are (drawn in code) for now. Optional
later: a painted `logo` and a painted app icon in this style.

### Totals

| Group | Images |
|---|---|
| Home screen | 41 |
| Creatures | 12 |
| Artifacts | 6 |
| Dive screen | 16 |
| **Total** | **75** |

## 9. Make these twelve first

Do not start on all 75. Make this batch, put it in the game, and judge the look
on a phone before continuing. It covers one of every kind of thing.

1. `mw_backdrop`
2. `mw_teapot_0`
3. `mw_teapot_3`
4. `mw_island`
5. `mw_cottages_0`
6. `mw_cottages_3` (+ `mw_cottages_3_glow`)
7. `mw_hearth_3` (+ `mw_hearth_3_glow`)
8. `nimbit_idle`
9. `nimbit_asleep`
10. `lantern_off`
11. `lantern_on` (+ `lantern_on_glow`)
12. `art_bell`

If `mw_cottages_3` and `nimbit_idle` look like they belong in the same box,
the style is working.

## 10. Brief template for an artist or image tool

Use the same opening and closing text for every asset and change only the
middle. Keeping the wording identical is the main defence against style drift.

> **Style (always the same):** Small collectible toy made of matte clay and
> soft vinyl. Chunky rounded shapes, no outlines, no sharp edges. Soft key
> light from the upper left, gentle plum shadows, slight waxy light bleed at
> the edges. Three-quarter view from slightly above, near-orthographic. Milky
> pastel palette: rose pink, cream, butter yellow, mint, lavender; warm gold
> only for light sources.
>
> **Subject (changes):** _[one sentence: what it is, its state, its two or
> three colours]_
>
> **Framing (always the same):** Single object, centred, whole object visible
> with empty margin all round, plain flat background for clean cut-out, soft
> contact shadow only. No text, no extra props, no scenery, no sparkles.

Example subject line: _"A cluster of three tiny cloud-village cottages with
oversized drooping butter-yellow roofs, cream walls, rose doors, and warmly
lit windows, standing on a puff of cloud."_

Tips for image tools specifically:
- Generate each family (all four cottage stages, all creature poses) in one
  sitting, using the best result as a visual reference for the rest.
- Reject on rule breaks, not on taste: wrong light direction, wrong camera
  angle, outlines, glossy plastic, photorealism, extra objects.
- Expect to cut out backgrounds and correct colours by hand toward the palette.

## 11. Check before accepting an asset

- [ ] Lit from the upper left; shadow falls down-right
- [ ] Three-quarter view from slightly above
- [ ] Matte, soft, no outlines, no pure black or white
- [ ] Uses three or four palette colours; gold only on light or treasure
- [ ] Recognisable as a silhouette at thumbnail size
- [ ] Transparent background, clean edges, 12% margin, correct anchor
- [ ] Glow delivered as a separate `_glow` layer, twice the parent's size
- [ ] No painted sparkles, steam, hearts or text
- [ ] Sits comfortably next to `mw_cottages_3` and `nimbit_idle`

## 12. Not to do

- Do not copy characters, buildings or compositions from the reference image
  or from any existing game or toy line. It is a mood reference only.
- No realistic textures (wood grain, brick, fur strands).
- No dark, broken or frightening versions of "asleep".
- No neon, no saturated primaries, no gradients that look airbrushed-digital.
