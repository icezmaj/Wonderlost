// Art slots: every place a finished image can replace code-drawn art.
//
// A slot is filled by putting a file with the slot's name in assets/
// (assets/lantern_on.png fills "lantern_on") and running tools/build.js.
// An empty slot falls back to the original code-drawn art, so images can
// arrive one at a time.
//
// Fields
//   w, h    size of the visible object in game units (not of the image file:
//           the file also carries the margin below)
//   x, y    fixed position, for slots that never move. World slots use the
//           360 x 480 diorama box; `screen` slots use the screen.
//   anchor  'ground': (x, y) is where the object touches the ground
//           'center': (x, y) is the middle of the object
//   stages  the slot has files _0 .. _(stages-1), one per restoration level
//   glow    an optional additive "<name>_glow" halo layer exists
//   fit     'cover' fills the whole screen; 'band' spans the screen width
//   px      export width in pixels when it should differ from 4 x the width
//
// Image files keep MARGIN empty space on every side (docs/ART_GUIDE.md s.7),
// so soft edges and contact shadows are never cut off. Glow files cover twice
// the width and height of their parent image, centred on the same point.

const MARGIN = 0.12;

const SLOTS = {
  // ---- home screen: Mistlewick ----
  mw_backdrop: { group: 'world', fit: 'cover', w: 360, h: 640, note: 'Sky only. Opaque.' },
  mw_desk: { group: 'world', fit: 'band', w: 360, h: 200, note: 'The surface the teapot stands on. Top edge is the horizon line.' },
  mw_moon: { group: 'world', w: 40, h: 40, anchor: 'center', note: 'Porcelain moon, shown once the artifact set is complete.' },
  mw_teapot: { group: 'world', stages: 4, x: 184, y: 470, w: 300, h: 146, anchor: 'ground', note: 'Whole teapot seen from outside, lid off. The village rises from its opening.' },
  mw_island: { group: 'world', w: 160, h: 40, anchor: 'center', note: 'One cloud island, reused for all four.' },
  mw_hearth: { group: 'world', stages: 4, glow: true, x: 180, y: 300, w: 86, h: 108, anchor: 'ground' },
  mw_cottages: { group: 'world', stages: 4, glow: true, x: 76, y: 228, w: 136, h: 86, anchor: 'ground' },
  mw_lanterns: { group: 'world', stages: 4, glow: true, x: 180, y: 200, w: 250, h: 170, anchor: 'center', note: 'All lantern strings as one overlay across the islands.' },
  mw_belltower: { group: 'world', stages: 4, glow: true, x: 180, y: 152, w: 78, h: 124, anchor: 'ground' },
  mw_garden: { group: 'world', stages: 4, x: 286, y: 224, w: 128, h: 64, anchor: 'ground' },
  mw_fore_mist: { group: 'world', fit: 'band', w: 360, h: 90, note: 'Soft mist band drawn in front of the teapot foot.' },

  // ---- creatures (three poses and a blink frame each) ----
  nimbit: { group: 'creature', poses: true, w: 30, h: 30, anchor: 'center', px: 384 },
  sprigget: { group: 'creature', poses: true, w: 30, h: 30, anchor: 'center', px: 384 },
  whistlewing: { group: 'creature', poses: true, w: 30, h: 30, anchor: 'center', px: 384 },

  // ---- artifacts ----
  art_spoon: { group: 'artifact', w: 30, h: 30, anchor: 'center', px: 256 },
  art_sugarstar: { group: 'artifact', w: 30, h: 30, anchor: 'center', px: 256 },
  art_spool: { group: 'artifact', w: 30, h: 30, anchor: 'center', px: 256 },
  art_bell: { group: 'artifact', w: 30, h: 30, anchor: 'center', px: 256 },
  art_compass: { group: 'artifact', w: 30, h: 30, anchor: 'center', px: 256 },
  art_whistle: { group: 'artifact', w: 30, h: 30, anchor: 'center', px: 256 },

  // ---- dive screen (positions come from the level) ----
  dive_backdrop: { group: 'dive', fit: 'cover', w: 360, h: 640, note: 'Inside a hollow. Opaque.' },
  dive_spout: { group: 'dive', w: 64, h: 80, anchor: 'center', note: 'The spout the Spark drops from, at the top of the field.' },
  spark: { group: 'dive', w: 20, h: 20, anchor: 'center', note: 'Its glow and trail are drawn in code so trail colours still apply.' },
  mote: { group: 'dive', w: 8, h: 8, anchor: 'center' },
  lantern_off: { group: 'dive', w: 22, h: 30, anchor: 'center' },
  lantern_on: { group: 'dive', glow: true, w: 22, h: 30, anchor: 'center' },
  bloom_charged: { group: 'dive', w: 40, h: 40, anchor: 'center' },
  bloom_spent: { group: 'dive', w: 40, h: 40, anchor: 'center' },
  ledge: { group: 'dive', w: 72, h: 22, anchor: 'center', note: 'Drawn level; the game tilts it.' },
  roof: { group: 'dive', w: 62, h: 22, anchor: 'center' },
  relic_closed: { group: 'dive', w: 26, h: 22, anchor: 'center' },
  geyser_vent: { group: 'dive', w: 48, h: 30, anchor: 'center', note: 'Steam is drawn in code.' },
  hearth_dive: { group: 'dive', glow: true, w: 90, h: 36, anchor: 'center', note: 'Stretched to the Hearth\'s current width.' },
  bubble: { group: 'dive', w: 38, h: 38, anchor: 'center', note: 'Mostly transparent; the sleeping creature shows through.' }
};

const POSES = ['idle', 'asleep', 'happy', 'blink'];

/** Every file name the game will accept, mapped to its slot definition. */
function slotFiles() {
  const files = {};
  for (const [base, def] of Object.entries(SLOTS)) {
    const names = def.stages
      ? Array.from({ length: def.stages }, (_, i) => `${base}_${i}`)
      : def.poses
        ? POSES.map((p) => `${base}_${p}`)
        : [base];
    for (const name of names) {
      files[name] = def;
      // stage 0 is the unlit, asleep state, so it has no glow layer
      if (def.glow && !name.endsWith('_0')) files[name + '_glow'] = def;
    }
  }
  return files;
}

export { MARGIN, SLOTS, POSES, slotFiles };
