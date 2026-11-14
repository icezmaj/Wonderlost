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

- **Format:** PNG, transparent background, straight (non-premultiplied) alpha.
  The backdrop is the only opaque image.
- **Size:** the game's play area is 360 × 640 units. Export at **4×**: an object
  listed as 32 units wide is drawn 128 px wide.
- **Padding:** leave at least 12% empty margin on every side so soft edges and
  shadows are not cut off.
- **Anchor:** the object's ground contact point sits at the horizontal centre
  of the image, 12% up from the bottom. Floating objects are centred.
- **Shadows:** include the soft contact shadow under grounded objects. Do not
  include long cast shadows.
- **Names:** lowercase, underscores, as listed below. Stages end in `_0` to
  `_3`. Glow halos end in `_glow`.

## 8. Asset list: Mistlewick

Sizes are in game units (multiply by 4 for pixels). "Stage 0" is the asleep
state; stages 1–3 follow the three upgrade levels and should each be visibly
richer than the last, so a returning player can see what they paid for.

### 8.1 World scene (home screen)

| File | What it is | Size (units) | Count |
|---|---|---|---|
| `mw_backdrop` | Teal gradient sky with soft haze, no objects. Opaque. | 360 × 640 | 1 |
| `mw_teapot_0`–`_3` | The teapot the village lives in, cut away so the inside shows. Stage 0: cracked, dull glaze. Stages 1–3: cracks sealed with seam gold, glaze warming up. | 320 × 300 | 4 |
| `mw_island` | Cloud island the village stands on, inside the teapot. | 260 × 90 | 1 |
| `mw_hearth_0`–`_3` | Hearth Well: a stone well. 0: cold and dark. 3: brimming with gold light. | 56 × 64 | 4 |
| `mw_cottages_0`–`_3` | Cloud Cottages: 0: one sleepy hut. 3: a cluster of three with lit windows. | 110 × 90 | 4 |
| `mw_lanterns_0`–`_3` | Lantern Lane: strings of paper lanterns. 0: bare posts. 3: full glowing string. | 200 × 60 | 4 |
| `mw_belltower_0`–`_3` | Bell Tower: 0: stump of a tower, no bell. 3: tall tower, gold bell, pointed drooping roof. | 60 × 130 | 4 |
| `mw_garden_0`–`_3` | Steam Garden: 0: bare vents. 3: tea bushes and flowers around steaming vents. | 120 × 50 | 4 |
| `mw_moon` | Porcelain moon (reward for the artifact set). | 48 × 48 | 1 |
| `mw_fore_mist` | Soft foreground mist band for depth. | 360 × 100 | 1 |
| `*_glow` | Glow halo for each stage 1–3 of hearth, cottages, lanterns, belltower. | as parent | 12 |

**40 images.**

### 8.2 Creatures

Each creature needs three poses at 96 × 96 units. Eyes are delivered open; add
one extra eyes-closed frame per creature for blinking.

| File | Creature | Notes |
|---|---|---|
| `nimbit_idle`, `_asleep`, `_happy`, `_blink` | Nimbit, a shy cloud-puff | Round white-cream puff, mint underside, tiny feet. |
| `sprigget_idle`, `_asleep`, `_happy`, `_blink` | Sprigget, a tea-leaf glider | Small body with two large leaf wings, mint and butter. |
| `whistlewing_idle`, `_asleep`, `_happy`, `_blink` | Whistlewing, a kettle-owl | Owl shaped like a little kettle, spout beak, rose and cream. |

**12 images.**

### 8.3 Artifacts (Tea Service of the First Dawn)

One image each at 64 × 64 units, same toy treatment, each with a small gold
accent so they read as treasures.

`art_spoon` (Gilded Teaspoon), `art_sugarstar` (Sugar Star), `art_spool`
(Cloud-Thread Spool), `art_bell` (Porcelain Bell), `art_compass` (Chamomile
Compass), `art_whistle` (Steam Whistle).

**6 images.**

### 8.4 Dive screen

These are small on screen and move fast, so they need the **strongest
silhouettes and the least detail** of anything in the game.

| File | What it is | Size (units) | Count |
|---|---|---|---|
| `dive_backdrop` | Inside a hollow: darker teal, soft cloud walls at the edges. Opaque. | 360 × 640 | 1 |
| `spark`, `spark_glow` | The player's Spark: a small gold star-drop with a face-free warm core. | 24 × 24 | 2 |
| `mote` | A tiny gold bead of Glow. | 10 × 10 | 1 |
| `lantern_off`, `lantern_on`, `lantern_glow` | Paper lantern, unlit and lit. | 40 × 48 | 3 |
| `bloom_charged`, `bloom_spent` | Bell bloom: a bell-shaped flower that bounces the Spark. Spent is closed and pale. | 44 × 44 | 2 |
| `ledge` | Cloud ledge, drawn level; the game tilts it. | 72 × 24 | 1 |
| `roof` | Small peaked roof that shelters a relic. | 64 × 32 | 1 |
| `relic_closed`, `relic_open` | Relic crate: a small gift-like box with a gold clasp. | 36 × 36 | 2 |
| `geyser_vent` | Steam vent in the hollow floor. Steam is drawn by the game. | 56 × 28 | 1 |
| `hearth_dive`, `hearth_dive_glow` | The Hearth at the bottom of the hollow: a wide glowing bowl. | 96 × 44 | 2 |
| `bubble` | Glass bubble a sleeping creature floats in. Mostly transparent. | 52 × 52 | 1 |

**17 images.**

### 8.5 Interface

Menus, buttons and icons stay as they are (drawn in code) for now. Optional
later: a painted `logo` and a painted app icon in this style.

### Totals

| Group | Images |
|---|---|
| World scene | 40 |
| Creatures | 12 |
| Artifacts | 6 |
| Dive screen | 17 |
| **Total** | **75** |

## 9. Make these twelve first

Do not start on all 75. Make this batch, put it in the game, and judge the look
on a phone before continuing. It covers one of every kind of thing.

1. `mw_backdrop`
2. `mw_teapot_0`
3. `mw_teapot_3`
4. `mw_island`
5. `mw_cottages_0`
6. `mw_cottages_3` (+ `_glow`)
7. `mw_hearth_3` (+ `_glow`)
8. `nimbit_idle`
9. `nimbit_asleep`
10. `lantern_off`
11. `lantern_on` (+ `_glow`)
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
- [ ] Glow delivered as a separate `_glow` layer
- [ ] No painted sparkles, steam, hearts or text
- [ ] Sits comfortably next to `mw_cottages_3` and `nimbit_idle`

## 12. Not to do

- Do not copy characters, buildings or compositions from the reference image
  or from any existing game or toy line. It is a mood reference only.
- No realistic textures (wood grain, brick, fur strands).
- No dark, broken or frightening versions of "asleep".
- No neon, no saturated primaries, no gradients that look airbrushed-digital.
