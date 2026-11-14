// The home diorama: Mistlewick, a cloud village rising out of a cracked teapot
// on the Bureau's desk. Every restoration level changes what is drawn here, so
// progress is always visible. Static parts are cached in two offscreen layers
// (desk + teapot, and the village) and only lights, steam and creatures are
// redrawn each frame.

import { mixHex, clamp } from '../core/util.js';
import { mulberry32 } from '../core/rng.js';
import { glow, additive, ellipse, circle, roundRect, cloud, star4, Particles } from './gfx.js';
import { drawCreature } from './creatures.js';
import { has, place, slot, cover, band, assetVersion } from './assets.js';
import { upgradeLevel, restoration } from '../progression/state.js';

const BOX = { w: 360, h: 480 }; // the diorama is authored in this box, then fitted to the screen

// Where each upgrade lives (box coords) - used for build celebrations.
const ANCHOR = {
  teapot: [184, 400],
  hearth: [180, 256],
  cottages: [76, 192],
  lanterns: [180, 226],
  belltower: [180, 96],
  garden: [286, 200]
};

// The four buildings were first drawn small, at the `from` points. PLACE moves
// and enlarges each one (code-drawn art, its lights and its island alike) so
// the village fills the screen. Image slots in config/slots.js sit at `to`.
const PLACE = {
  belltower: { from: [180, 106], to: [180, 152], k: 1.28 },
  cottages: { from: [88, 196], to: [76, 228], k: 1.22 },
  garden: { from: [288, 192], to: [286, 224], k: 1.26 },
  hearth: { from: [180, 272], to: [180, 300], k: 1.32 }
};
const ISLAND = { belltower: [180, 112, 104, 28], cottages: [84, 202, 124, 32], garden: [280, 198, 120, 32], hearth: [180, 282, 158, 36] };

/** Run drawing code written for a building's original spot at its new place and size. */
function at(g, id, fn) {
  const p = PLACE[id];
  g.save();
  g.translate(p.to[0], p.to[1]);
  g.scale(p.k, p.k);
  g.translate(-p.from[0], -p.from[1]);
  fn();
  g.restore();
}
/** Where an original-layout point of a building ends up. */
const moved = (id, x, y) => {
  const p = PLACE[id];
  return [p.to[0] + (x - p.from[0]) * p.k, p.to[1] + (y - p.from[1]) * p.k];
};

const CRACKS = [
  [[128, 362], [141, 378], [133, 393], [149, 409], [142, 430]],
  [[216, 350], [206, 367], [221, 382], [212, 401]],
  [[238, 406], [227, 420], [239, 436], [231, 451]]
];

const CUP_SPOTS = [[62, 189, '#ffd3dd', '#ff8fa3'], [92, 184, '#d6efff', '#6fa8ff'], [117, 191, '#fff0c2', '#f5b942']];
const BUSH_SPOTS = [[256, 181], [300, 181], [276, 177], [314, 186]];
const FOLK_SPOTS = [[50, 191], [76, 194], [104, 192], [124, 196], [66, 199], [110, 200]];
const LAMP_COLORS = ['#ffcf5c', '#ff8fa3', '#7fe3d8'];
// Cases still waiting on the Bureau desk, behind the teapot (box coords).
const TEASERS = [
  { x: 24, y: 456, r: 21, kind: 'watch' },
  { x: 342, y: 456, r: 22, kind: 'globe' }
];
const CREATURE_SCALE = 1.45; // creatures in the village, relative to their ~28-unit base size

function createWorldView(getState) {
  let bg = null;
  let village = null;
  let key = '';
  let t = 0;
  let geom = { W: 360, H: 760, s: 1, ox: 0, oy: 0, px: 1 };
  let lamps = []; // lantern positions (box coords) for per-frame glow
  const fx = new Particles(180);
  const steam = [];
  const hearts = [];
  // Ambient life, so the sky around the village is never flat or still.
  const amb = mulberry32(77);
  const drift = Array.from({ length: 7 }, () => ({ x: -60 + amb() * 480, y: 16 + amb() * 250, w: 70 + amb() * 90, v: 2 + amb() * 4, a: 0.07 + amb() * 0.08 }));
  const farIsles = [
    { x: 18, y: 270, k: 0.52, ph: 0 },
    { x: 334, y: 58, k: 0.46, ph: 2 },
    { x: 346, y: 318, k: 0.5, ph: 4 },
    { x: 92, y: 20, k: 0.4, ph: 1 }
  ];
  const flies = Array.from({ length: 34 }, () => ({ x: -30 + amb() * 420, y: amb() * 470, v: 3 + amb() * 7, ph: amb() * 6.28, r: 1.6 + amb() * 2.2, c: amb() < 0.7 ? '#ffe08a' : '#a8f0e4' }));
  const critters = {
    nimbit: { x: 126, min: 104, max: 256, y: 292, dir: 1, pause: 1, hop: 0, happy: 0, sx: 0, sy: 0 },
    sprigget: { x: 270, min: 236, max: 334, y: 214, dir: -1, pause: 2, hop: 0, happy: 0, sx: 0, sy: 0 },
    whistlewing: { x: 180, y: 60, phase: 0, hop: 0, happy: 0, sx: 0, sy: 0 }
  };

  const toScreen = (bx, by, bob = 0) => [geom.ox + bx * geom.s, geom.oy + (by + bob) * geom.s];
  const bobNow = () => Math.sin(t * 0.8) * 2.2;

  function fit(W, H) {
    const top = 150; // clear of the HUD and case chip
    const bottom = H - 158;
    const s = clamp((bottom - top) / BOX.h, 0.5, 1.14);
    geom.W = W;
    geom.H = H;
    geom.s = s;
    geom.ox = (W - BOX.w * s) / 2;
    geom.oy = top + (bottom - top - BOX.h * s) / 2;
  }

  // ------------------------------------------------------------ static layers

  function drawBackdrop(g, st) {
    const { W, H } = geom;
    const p = restoration(st);
    const deskY = geom.oy + 452 * geom.s;
    const sky = g.createLinearGradient(0, 0, 0, deskY);
    sky.addColorStop(0, mixHex('#0a081f', '#17235f', p));
    sky.addColorStop(0.5, mixHex('#191343', '#4d3f99', p));
    sky.addColorStop(1, mixHex('#30205a', '#f09aa8', p));
    if (!cover(g, 'mw_backdrop', W, H)) {
      g.fillStyle = sky;
      g.fillRect(0, 0, W, H);

      // stars (fewer as dawn arrives)
      const rng = mulberry32(11);
      for (let i = 0; i < 70; i++) {
        const x = rng() * W;
        const y = rng() * deskY * 0.85;
        const r = 0.4 + rng() * 1.1;
        g.fillStyle = `rgba(255,255,255,${(0.25 + rng() * 0.6) * (1 - p * 0.55)})`;
        circle(g, x, y, r);
      }
    }
    // porcelain moon: reward for completing the artifact set
    const my = geom.oy + 70 * geom.s;
    if (st.setRewarded && !place(g, 'mw_moon', 56, my)) {
      additive(g, () => glow(g, 56, my, 60, '#bcd0ff', 0.5));
      g.fillStyle = '#f4f7ff';
      circle(g, 56, my, 19);
      g.fillStyle = mixHex('#14103a', '#3a3186', p);
      circle(g, 64, my - 6, 16);
    }
    // warm horizon behind the teapot
    const painted = has('mw_backdrop'); // painted skies carry their own light
    additive(g, () => {
      glow(g, W / 2, deskY, 250 * geom.s, '#ff9d6b', painted ? 0.06 + p * 0.12 : 0.12 + p * 0.3);
      if (p >= 1) glow(g, W / 2, geom.oy + 60 * geom.s, 190 * geom.s, '#ffe9a8', painted ? 0.1 : 0.22);
    });

    // the Bureau desk
    if (band(g, 'mw_desk', W, deskY, H)) {
      // haze over the horizon so the desk's top edge is not a hard line
      const haze = g.createLinearGradient(0, deskY - 30 * geom.s, 0, deskY + 44 * geom.s);
      haze.addColorStop(0, 'rgba(126,196,192,0)');
      haze.addColorStop(0.42, `rgba(126,196,192,${0.3 + p * 0.1})`);
      haze.addColorStop(1, 'rgba(126,196,192,0)');
      g.fillStyle = haze;
      g.fillRect(0, deskY - 30 * geom.s, W, 74 * geom.s);
      additive(g, () => glow(g, W / 2, deskY + 20 * geom.s, 190 * geom.s, '#ffb86b', 0.1 + p * 0.1));
      return;
    }
    const desk = g.createLinearGradient(0, deskY, 0, H);
    desk.addColorStop(0, '#4a2f55');
    desk.addColorStop(0.12, '#38223f');
    desk.addColorStop(1, '#150e29');
    g.fillStyle = desk;
    g.fillRect(0, deskY, W, H - deskY);
    g.fillStyle = 'rgba(255,220,200,.16)';
    g.fillRect(0, deskY, W, 1.5);
    g.strokeStyle = 'rgba(0,0,0,.14)';
    g.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      g.beginPath();
      const y = deskY + 18 + i * 26;
      g.moveTo(0, y);
      g.bezierCurveTo(W * 0.3, y + 6, W * 0.7, y - 6, W, y + 3);
      g.stroke();
    }
    additive(g, () => glow(g, W / 2, deskY + 20 * geom.s, 190 * geom.s, '#ffb86b', 0.2 + p * 0.12));
  }

  function drawTeapot(g, st) {
    const lv = upgradeLevel(st, 'teapot');
    if (has('mw_teapot_' + lv)) {
      // soft contact shadow so the pot stands on the desk instead of floating
      g.save();
      g.translate(184, 459);
      g.scale(1, 0.13);
      glow(g, 0, 0, 170, '#03171c', 0.9);
      glow(g, 0, 0, 110, '#03171c', 0.8);
      g.restore();
      slot(g, 'mw_teapot_' + lv);
      return;
    }
    const q = Math.min(1, (lv / 3) * 0.75 + restoration(st) * 0.25);
    const light = mixHex('#a9acc6', '#ffffff', q);
    const base = mixHex('#8386a6', '#eef2ff', q);
    const shade = mixHex('#4d4f73', '#9fb0e8', q);
    const blue = mixHex('#63678c', '#3f62e0', q);

    g.fillStyle = 'rgba(0,0,0,.4)';
    ellipse(g, 186, 462, 118, 11);

    // lid, set down on the desk
    g.fillStyle = shade;
    ellipse(g, 304, 461, 34, 8);
    g.fillStyle = base;
    g.beginPath();
    g.ellipse(304, 459, 32, 15, 0, Math.PI, 0);
    g.fill();
    g.fillStyle = blue;
    circle(g, 304, 442, 5.5);

    // handle
    g.lineCap = 'round';
    g.strokeStyle = shade;
    g.lineWidth = 16;
    g.beginPath();
    g.arc(90, 396, 33, 0.55 * Math.PI, 1.45 * Math.PI);
    g.stroke();
    g.strokeStyle = base;
    g.lineWidth = 10;
    g.beginPath();
    g.arc(90, 395, 33, 0.55 * Math.PI, 1.45 * Math.PI);
    g.stroke();

    // spout
    g.fillStyle = shade;
    g.beginPath();
    g.moveTo(258, 384);
    g.quadraticCurveTo(300, 390, 310, 350);
    g.lineTo(334, 342);
    g.quadraticCurveTo(330, 416, 262, 432);
    g.closePath();
    g.fill();
    g.fillStyle = base;
    g.beginPath();
    g.moveTo(258, 384);
    g.quadraticCurveTo(298, 386, 310, 350);
    g.lineTo(326, 345);
    g.quadraticCurveTo(318, 404, 262, 420);
    g.closePath();
    g.fill();

    // foot
    g.fillStyle = shade;
    ellipse(g, 180, 457, 64, 10);

    // body
    const body = g.createRadialGradient(146, 366, 6, 184, 400, 112);
    body.addColorStop(0, light);
    body.addColorStop(0.55, base);
    body.addColorStop(1, shade);
    g.fillStyle = body;
    ellipse(g, 180, 398, 97, 64);

    // cobalt pattern (clipped to the body)
    g.save();
    g.beginPath();
    g.ellipse(180, 398, 97, 64, 0, 0, Math.PI * 2);
    g.clip();
    g.strokeStyle = blue;
    g.globalAlpha = 0.85;
    g.lineWidth = 3;
    g.beginPath();
    g.ellipse(180, 372, 100, 22, 0, 0.08 * Math.PI, 0.92 * Math.PI);
    g.stroke();
    g.lineWidth = 2;
    g.beginPath();
    g.ellipse(180, 430, 96, 20, 0, 0.1 * Math.PI, 0.9 * Math.PI);
    g.stroke();
    // little cloud swirls
    g.lineWidth = 2.2;
    for (const [cx, cy] of [[122, 412], [180, 420], [238, 412]]) {
      g.beginPath();
      g.arc(cx - 7, cy, 6, Math.PI, 0);
      g.arc(cx + 3, cy - 3, 8, Math.PI, 0);
      g.arc(cx + 12, cy, 5, Math.PI, 0);
      g.stroke();
    }
    g.restore();

    // rim and the dark opening the village rises from
    g.fillStyle = shade;
    ellipse(g, 180, 340, 62, 14);
    g.fillStyle = light;
    ellipse(g, 180, 338, 60, 12.5);
    g.fillStyle = '#1b1440';
    ellipse(g, 180, 339, 51, 8.5);

    // cracks: dark until mended, then kintsugi gold
    g.lineJoin = 'round';
    CRACKS.forEach((pts, i) => {
      const mended = lv > i;
      g.strokeStyle = mended ? '#ffd76e' : '#241a40';
      g.lineWidth = mended ? 2.8 : 2.2;
      g.beginPath();
      pts.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.stroke();
      if (mended) {
        g.strokeStyle = 'rgba(255,255,255,.7)';
        g.lineWidth = 0.9;
        g.stroke();
      }
    });

    // case tag tied to the handle
    g.save();
    g.translate(64, 432);
    g.rotate(0.22);
    g.strokeStyle = '#c9b28a';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(8, -3);
    g.quadraticCurveTo(14, -22, 4, -32);
    g.stroke();
    g.fillStyle = '#f1e2c2';
    roundRect(g, -14, -4, 34, 20, 3);
    g.fill();
    g.fillStyle = '#7a4b3a';
    g.font = '800 6.5px Nunito, sans-serif';
    g.textAlign = 'center';
    g.fillText('CASE 001', 3, 5);
    g.font = '700 5px Nunito, sans-serif';
    g.fillText('MISTLEWICK', 3, 12);
    g.restore();
  }

  // One soft cloud, drawn once and reused for every drifting cloud.
  let puffSprite = null;
  function puff() {
    if (!puffSprite) {
      puffSprite = document.createElement('canvas');
      puffSprite.width = 320;
      puffSprite.height = 128;
      const g = puffSprite.getContext('2d');
      cloud(g, 160, 56, 300, 60, 'rgba(255,255,255,.17)', 'rgba(168,220,214,.1)');
    }
    return puffSprite;
  }

  // Slanting light and far-off islands: they never change, so they are drawn
  // once into the background layer instead of every frame.
  function drawFarSky(g, st) {
    const p = restoration(st);
    additive(g, () => {
      for (let i = 0; i < 3; i++) {
        g.save();
        g.translate(40 + i * 120, 150);
        g.rotate(0.36);
        g.scale(1, 7);
        glow(g, 0, 0, 34 + i * 4, '#fff0d0', 0.05 + p * 0.03);
        g.restore();
      }
    });
    for (const f of farIsles) {
      if (!place(g, 'mw_island', f.x, f.y, { w: 160 * f.k, alpha: 0.55, quiet: true })) {
        cloud(g, f.x, f.y, 150 * f.k, 34 * f.k, 'rgba(255,255,255,.2)', 'rgba(170,200,230,.14)');
      }
      const u = f.k * 1.1;
      g.fillStyle = 'rgba(246,227,180,.62)';
      roundRect(g, f.x - 7 * u, f.y - 19 * u, 14 * u, 12 * u, 3 * u);
      g.fill();
      g.fillStyle = 'rgba(244,166,180,.7)';
      g.beginPath();
      g.moveTo(f.x - 10 * u, f.y - 17 * u);
      g.quadraticCurveTo(f.x, f.y - 34 * u, f.x + 10 * u, f.y - 17 * u);
      g.closePath();
      g.fill();
    }
  }

  // The next cases, waiting their turn: dark shapes on the desk behind the pot.
  function drawTeasers(g) {
    const body = '#0f3d48';
    const face = '#1a5662';
    const dark = '#0a2c35';
    const rim = 'rgba(196,238,230,.5)';
    g.lineCap = 'round';
    for (const tz of TEASERS) {
      g.save();
      g.translate(tz.x, tz.y);
      g.fillStyle = 'rgba(3,23,28,.55)';
      ellipse(g, 2, 1, tz.r * 1.05, 3.4);
      if (tz.kind === 'watch') {
        // a stopped pocket watch, propped up, one minute to midnight
        g.rotate(-0.16);
        g.strokeStyle = body;
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(3, -tz.r * 2.05);
        g.quadraticCurveTo(26, -tz.r * 2.3, 30, -6);
        g.stroke();
        g.fillStyle = body;
        roundRect(g, -3.5, -tz.r * 2.2, 7, 6, 2);
        g.fill();
        circle(g, 0, -tz.r, tz.r);
        g.fillStyle = face;
        circle(g, 0, -tz.r, tz.r * 0.76);
        g.strokeStyle = dark;
        g.lineWidth = 1.6;
        g.beginPath();
        g.moveTo(0, -tz.r);
        g.lineTo(0, -tz.r * 1.58);
        g.moveTo(0, -tz.r);
        g.lineTo(-tz.r * 0.2, -tz.r * 1.4);
        g.stroke();
        g.strokeStyle = rim;
        g.lineWidth = 1.4;
        g.beginPath();
        g.arc(0, -tz.r, tz.r - 0.8, 1.05 * Math.PI, 1.55 * Math.PI);
        g.stroke();
      } else {
        // a forgotten snow globe
        g.fillStyle = body;
        g.beginPath();
        g.moveTo(-tz.r * 0.9, 0);
        g.lineTo(tz.r * 0.9, 0);
        g.lineTo(tz.r * 0.7, -tz.r * 0.5);
        g.lineTo(-tz.r * 0.7, -tz.r * 0.5);
        g.closePath();
        g.fill();
        roundRect(g, -tz.r * 0.98, -tz.r * 0.16, tz.r * 1.96, tz.r * 0.2, 2);
        g.fill();
        g.fillStyle = face;
        circle(g, 0, -tz.r * 1.3, tz.r * 0.98);
        // a tiny pine and a house, asleep under the glass
        g.fillStyle = dark;
        g.beginPath();
        g.moveTo(-tz.r * 0.55, -tz.r * 0.62);
        g.lineTo(-tz.r * 0.25, -tz.r * 1.6);
        g.lineTo(tz.r * 0.05, -tz.r * 0.62);
        g.closePath();
        g.fill();
        roundRect(g, tz.r * 0.12, -tz.r * 1.02, tz.r * 0.46, tz.r * 0.42, 1.5);
        g.fill();
        g.beginPath();
        g.moveTo(tz.r * 0.04, -tz.r * 1.0);
        g.lineTo(tz.r * 0.35, -tz.r * 1.3);
        g.lineTo(tz.r * 0.66, -tz.r * 1.0);
        g.closePath();
        g.fill();
        ellipse(g, 0, -tz.r * 0.6, tz.r * 0.8, tz.r * 0.16);
        g.fillStyle = 'rgba(196,238,230,.1)';
        circle(g, -tz.r * 0.3, -tz.r * 1.6, tz.r * 0.42);
        g.strokeStyle = rim;
        g.lineWidth = 1.4;
        g.beginPath();
        g.arc(0, -tz.r * 1.3, tz.r * 0.98 - 0.8, 1.05 * Math.PI, 1.55 * Math.PI);
        g.stroke();
      }
      g.restore();
    }
  }

  function island(g, id, alive, p) {
    // building images stand on their own painted cloud, so they need no island
    if (has(`mw_${id}_${upgradeLevel(getState(), id)}`)) return;
    const [ox, oy, ow, h] = ISLAND[id];
    const [x, y] = moved(id, ox, oy);
    const w = ow * PLACE[id].k;
    if (place(g, 'mw_island', x, y, { w, alpha: alive ? 1 : 0.3 })) return;
    if (alive) cloud(g, x, y, w, h, mixHex('#b9b6e2', '#ffffff', 0.45 + p * 0.55), mixHex('#7772b3', '#c9b8ee', 0.4 + p * 0.6));
    else cloud(g, x, y, w, h, 'rgba(150,146,208,.22)', 'rgba(110,106,170,.14)');
  }

  function ghost(g, on, fn) {
    g.save();
    if (!on) g.globalAlpha = 0.2;
    fn(!on);
    g.restore();
  }

  function cup(g, x, y, col, trim, lit, isGhost) {
    g.save();
    g.translate(x, y);
    const c = isGhost ? '#9d98d6' : col;
    const tr = isGhost ? '#9d98d6' : trim;
    g.strokeStyle = tr;
    g.lineWidth = 2.6;
    g.beginPath();
    g.arc(12, -9, 5, -Math.PI / 2, Math.PI / 2);
    g.stroke();
    g.fillStyle = c;
    g.beginPath();
    g.moveTo(-13, 0);
    g.lineTo(-10, -13);
    g.quadraticCurveTo(0, -24, 10, -13);
    g.lineTo(13, 0);
    g.closePath();
    g.fill();
    g.fillStyle = tr;
    roundRect(g, -14, -3, 28, 4, 2);
    g.fill();
    if (!isGhost) {
      g.fillStyle = '#5b4a8a';
      g.beginPath();
      g.moveTo(-6, -3);
      g.lineTo(-6, -8);
      g.arc(-3, -8, 3, Math.PI, 0);
      g.lineTo(0, -3);
      g.fill();
      g.fillStyle = lit ? '#ffe08a' : '#4b4080';
      circle(g, 5.5, -11, 2.6);
    }
    g.restore();
  }

  function drawVillage(g, st) {
    const p = restoration(st);
    const L = (id) => upgradeLevel(st, id);
    lamps = [];

    island(g, 'belltower', L('belltower') > 0, p);
    island(g, 'cottages', L('cottages') > 0, p);
    island(g, 'garden', L('garden') > 0, p);
    island(g, 'hearth', true, p);

    // --- Lantern Lane: strings of lanterns between islands ---
    // each string runs from one building's island to another's
    const strings = [
      [[112, 172], [154, 132]],
      [[206, 132], [262, 180]],
      [[122, 214], [150, 226]],
      [[210, 226], [246, 212]]
    ];
    const nStrings = [0, 1, 2, 4][L('lanterns')];
    const lanternArt = slot(g, 'mw_lanterns_' + L('lanterns'));
    strings.forEach(([a, b], si) => {
      const on = si < nStrings;
      if (lanternArt || (!on && si > 1)) return;
      g.save();
      if (!on) g.globalAlpha = 0.16;
      const mx = (a[0] + b[0]) / 2;
      const my = (a[1] + b[1]) / 2 + 16;
      g.strokeStyle = on ? '#e9c9c2' : '#9d98d6';
      g.lineWidth = 1.2;
      g.beginPath();
      g.moveTo(a[0], a[1]);
      g.quadraticCurveTo(mx, my, b[0], b[1]);
      g.stroke();
      for (let k = 1; k <= 4; k++) {
        const u = k / 5;
        const x = (1 - u) * (1 - u) * a[0] + 2 * (1 - u) * u * mx + u * u * b[0];
        const y = (1 - u) * (1 - u) * a[1] + 2 * (1 - u) * u * my + u * u * b[1];
        const col = LAMP_COLORS[(k + si) % 3];
        g.fillStyle = on ? col : '#9d98d6';
        roundRect(g, x - 3.6, y + 1, 7.2, 9.6, 3.1);
        g.fill();
        if (on) {
          g.fillStyle = 'rgba(255,255,255,.55)';
          roundRect(g, x - 2, y + 2.4, 2.2, 4.4, 1.1);
          g.fill();
          lamps.push([x, y + 5.8, col]);
        }
      }
      g.restore();
    });

    // --- Bell Tower ---
    const bell = L('belltower');
    if (!slot(g, 'mw_belltower_' + bell)) at(g, 'belltower', () => ghost(g, bell > 0, (gh) => {
      const wall = gh ? '#9d98d6' : '#efe6ff';
      g.fillStyle = gh ? '#9d98d6' : '#c9bdf0';
      g.beginPath();
      g.moveTo(168, 102);
      g.lineTo(171, 56);
      g.lineTo(189, 56);
      g.lineTo(192, 102);
      g.fill();
      g.fillStyle = wall;
      g.beginPath();
      g.moveTo(168, 102);
      g.lineTo(171, 56);
      g.lineTo(183, 56);
      g.lineTo(184, 102);
      g.fill();
      g.fillStyle = gh ? '#9d98d6' : '#4c6fff';
      g.beginPath();
      g.moveTo(164, 58);
      g.lineTo(180, 32);
      g.lineTo(196, 58);
      g.closePath();
      g.fill();
      if (gh) return;
      g.fillStyle = '#35296a';
      g.beginPath();
      g.moveTo(174, 78);
      g.lineTo(174, 68);
      g.arc(180, 68, 6, Math.PI, 0);
      g.lineTo(186, 78);
      g.fill();
      g.fillStyle = bell >= 2 ? '#ffcf5c' : '#b9b3d9';
      g.beginPath();
      g.moveTo(175.5, 76);
      g.quadraticCurveTo(176, 66, 180, 66);
      g.quadraticCurveTo(184, 66, 184.5, 76);
      g.fill();
      if (bell >= 2) {
        g.strokeStyle = '#efe6ff';
        g.lineWidth = 1.2;
        g.beginPath();
        g.moveTo(180, 32);
        g.lineTo(180, 20);
        g.stroke();
        g.fillStyle = '#ff8fa3';
        g.beginPath();
        g.moveTo(180, 20);
        g.lineTo(191, 23.5);
        g.lineTo(180, 27);
        g.fill();
      }
      if (bell >= 3) {
        g.fillStyle = '#ffe08a';
        circle(g, 180, 90, 4.2);
        g.fillStyle = '#ffcf5c';
        star4(g, 180, 17, 5, 0);
      }
    }));

    // --- Cloud Cottages (teacup houses) ---
    const cots = L('cottages');
    if (!slot(g, 'mw_cottages_' + cots)) at(g, 'cottages', () => CUP_SPOTS.forEach(([x, y, col, trim], i) => cup(g, x, y, col, trim, cots >= 3 || (cots >= 2 && i === 0), i >= cots)));

    // --- Steam Garden ---
    const gar = L('garden');
    if (!slot(g, 'mw_garden_' + gar)) at(g, 'garden', () => ghost(g, gar > 0, (gh) => {
      const n = gh ? 2 : gar + 1;
      for (let i = 0; i < n; i++) {
        const [x, y] = BUSH_SPOTS[i];
        g.fillStyle = gh ? '#9d98d6' : '#3fa66b';
        circle(g, x - 5, y, 6);
        circle(g, x + 5, y, 6);
        g.fillStyle = gh ? '#9d98d6' : '#63c98a';
        circle(g, x, y - 4, 7);
        if (!gh) {
          g.fillStyle = '#ffffff';
          circle(g, x - 3, y - 6, 1.3);
          circle(g, x + 4, y - 2, 1.3);
          circle(g, x - 6, y + 1, 1.1);
        }
      }
      if (gh) return;
      // the warm vent
      g.fillStyle = '#8e86bd';
      roundRect(g, 282, 180, 12, 7, 3);
      g.fill();
      if (gar >= 3) {
        g.strokeStyle = '#7a5a4a';
        g.lineWidth = 2.4;
        g.beginPath();
        g.moveTo(322, 186);
        g.quadraticCurveTo(320, 172, 324, 160);
        g.stroke();
        g.fillStyle = '#ffb3c6';
        circle(g, 318, 157, 8);
        circle(g, 330, 158, 7);
        g.fillStyle = '#ffd3dd';
        circle(g, 324, 151, 8);
      }
    }));

    // --- Hearth Well ---
    const hearth = L('hearth');
    if (slot(g, 'mw_hearth_' + hearth)) return;
    g.translate(PLACE.hearth.to[0], PLACE.hearth.to[1]);
    g.scale(PLACE.hearth.k, PLACE.hearth.k);
    g.translate(-PLACE.hearth.from[0], -PLACE.hearth.from[1]);
    g.fillStyle = hearth ? '#8e86bd' : '#57527f';
    ellipse(g, 180, 265, 27, 8);
    g.fillStyle = hearth ? '#cfc8ee' : '#6b6596';
    roundRect(g, 158, 246, 44, 19, 7);
    g.fill();
    g.fillStyle = hearth ? '#e6e0fb' : '#7a74a6';
    ellipse(g, 180, 247, 22, 7);
    g.fillStyle = hearth ? '#ffb347' : '#1f183f';
    ellipse(g, 180, 247, 16, 4.6);
    if (hearth >= 2) {
      g.fillStyle = '#7a5ea8';
      g.fillRect(160, 222, 3, 25);
      g.fillRect(197, 222, 3, 25);
      g.fillStyle = '#ff8fa3';
      g.beginPath();
      g.moveTo(151, 225);
      g.lineTo(180, 205);
      g.lineTo(209, 225);
      g.closePath();
      g.fill();
      g.fillStyle = 'rgba(255,255,255,.25)';
      g.beginPath();
      g.moveTo(151, 225);
      g.lineTo(180, 205);
      g.lineTo(180, 225);
      g.fill();
    }
    if (hearth >= 3) {
      g.fillStyle = '#ffcf5c';
      star4(g, 180, 199, 6, 0);
    }
  }

  function rebuild(st, px) {
    const mk = () => {
      const c = document.createElement('canvas');
      c.width = Math.round(geom.W * px);
      c.height = Math.round(geom.H * px);
      const g = c.getContext('2d');
      g.scale(px, px);
      return [c, g];
    };
    let g;
    [bg, g] = mk();
    drawBackdrop(g, st);
    g.translate(geom.ox, geom.oy);
    g.scale(geom.s, geom.s);
    drawFarSky(g, st);
    drawTeasers(g);
    drawTeapot(g, st);
    [village, g] = mk();
    g.translate(geom.ox, geom.oy);
    g.scale(geom.s, geom.s);
    drawVillage(g, st);
  }

  // ------------------------------------------------------------ per frame

  function update(dt) {
    t += dt;
    const st = getState();
    const p = restoration(st);
    fx.update(dt);

    // steam rising from the teapot's opening and spout
    if (Math.random() < dt * (3 + p * 6)) {
      const art = has('mw_teapot_' + upgradeLevel(st, 'teapot'));
      const spout = !art && Math.random() < 0.25; // the painted pots have their spout elsewhere
      steam.push({
        x: spout ? 328 : (art ? 184 : 180) + (Math.random() - 0.5) * (art ? 44 : 60),
        y: spout ? 342 : 336,
        vx: spout ? 8 : (Math.random() - 0.5) * 6,
        vy: -(10 + Math.random() * 12),
        r: 6 + Math.random() * 6,
        life: 1,
        village: false
      });
    }
    if (upgradeLevel(st, 'garden') > 0 && Math.random() < dt * 3) {
      const [gx, gy] = moved('garden', 288, 178);
      steam.push({ x: gx, y: gy, vx: (Math.random() - 0.5) * 5, vy: -16, r: 3, life: 1, village: true });
    }
    for (let i = steam.length - 1; i >= 0; i--) {
      const s = steam[i];
      s.life -= dt * 0.42;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.r += dt * 5;
      if (s.life <= 0) steam.splice(i, 1);
    }
    for (let i = hearts.length - 1; i >= 0; i--) {
      const h = hearts[i];
      h.life -= dt;
      h.y -= 26 * dt;
      h.x += Math.sin(h.life * 8) * 12 * dt;
      if (h.life <= 0) hearts.splice(i, 1);
    }

    for (const c of drift) {
      c.x += c.v * dt;
      if (c.x - c.w / 2 > 420) c.x = -60 - c.w / 2;
    }
    for (const f of flies) {
      f.y -= f.v * dt;
      f.x += Math.sin(t * 0.7 + f.ph) * 4 * dt;
      if (f.y < -12) f.y = 474;
    }

    // creatures potter about
    for (const id of ['nimbit', 'sprigget']) {
      const c = critters[id];
      c.hop = Math.max(0, c.hop - dt * 2.4);
      c.happy = Math.max(0, c.happy - dt);
      if (c.pause > 0) {
        c.pause -= dt;
        continue;
      }
      c.x += c.dir * 9 * dt;
      if (c.x > c.max) c.dir = -1;
      if (c.x < c.min) c.dir = 1;
      if (Math.random() < dt * 0.35) {
        c.pause = 0.8 + Math.random() * 2.2;
        if (Math.random() < 0.4) c.dir *= -1;
      }
    }
    const w = critters.whistlewing;
    w.phase += dt * 0.9;
    w.hop = Math.max(0, w.hop - dt * 2.4);
    w.happy = Math.max(0, w.happy - dt);
    w.x = 180 + Math.cos(w.phase) * 78;
    w.y = 84 + Math.sin(w.phase * 2) * 14;
  }

  function draw(ctx, W, H, px) {
    const st = getState();
    const k = [W, H, px, assetVersion(), st.setRewarded, ...Object.keys(ANCHOR).map((id) => upgradeLevel(st, id))].join(',');
    if (k !== key) {
      fit(W, H);
      rebuild(st, px);
      key = k;
    }
    const bob = bobNow();
    const p = restoration(st);
    const L = (id) => upgradeLevel(st, id);

    ctx.drawImage(bg, 0, 0, W, H);

    ctx.save();
    ctx.translate(geom.ox, geom.oy);
    ctx.scale(geom.s, geom.s);

    // --- the sky: drifting cloud, and lit windows on the far-off islands ---
    // (the light shafts and the islands themselves are baked into the background)
    for (const c of drift) {
      ctx.globalAlpha = c.a * 6;
      ctx.drawImage(puff(), c.x - c.w / 2, c.y - c.w * 0.2, c.w, c.w * 0.4);
    }
    ctx.globalAlpha = 1;
    if (p > 0.15) {
      additive(ctx, () => {
        for (const f of farIsles) glow(ctx, f.x, f.y - 13 * f.k, 10 * f.k + 3, '#ffd98a', 0.35 + p * 0.35 + Math.sin(t * 1.4 + f.ph) * 0.12);
      });
    }

    // light inside the teapot
    const potArt = has('mw_teapot_' + L('teapot'));
    additive(ctx, () => {
      // a column of warm light rising from the pot to the village it holds up
      const lift = 0.1 + p * 0.16 + Math.sin(t * 1.3) * 0.02;
      for (let i = 0; i < 6; i++) glow(ctx, 183, 338 - i * 24, 46 + i * 9, '#ffd68c', lift * (1 - i / 6.5));
      glow(ctx, potArt ? 184 : 180, 340, 46 + Math.sin(t * 2) * 3, '#ffb347', 0.25 + L('hearth') * 0.12 + p * 0.25);
      // gold seams shimmer
      const tp = potArt ? 0 : L('teapot');
      for (let i = 0; i < tp; i++) {
        const pts = CRACKS[i];
        const u = (((t * 0.35 + i * 0.3) % 1) + 1) % 1; // 0..1 even if t were negative
        const seg = Math.max(0, Math.min(pts.length - 2, Math.floor(u * (pts.length - 1))));
        const f = u * (pts.length - 1) - seg;
        const x = pts[seg][0] + (pts[seg + 1][0] - pts[seg][0]) * f;
        const y = pts[seg][1] + (pts[seg + 1][1] - pts[seg][1]) * f;
        glow(ctx, x, y, 12, '#ffe08a', 0.75);
      }
    });

    // steam behind the village
    for (const s of steam) {
      if (s.village) continue;
      ctx.fillStyle = `rgba(255,255,255,${0.1 * s.life + 0.08 * s.life * p})`;
      circle(ctx, s.x, s.y, s.r);
    }
    ctx.restore();

    ctx.drawImage(village, 0, bob * geom.s, W, H);

    ctx.save();
    ctx.translate(geom.ox, geom.oy + bob * geom.s);
    ctx.scale(geom.s, geom.s);

    // Where finished art fills a slot, its own glow layer replaces the
    // hand-placed lights (which sit on the code-drawn windows and lamps).
    const art = (id) => has(`mw_${id}_${L(id)}`);
    // kept gentle: at full strength the halos bleach the buildings to flat yellow
    const halo = (id, i) => slot(ctx, `mw_${id}_${L(id)}`, { glow: true, alpha: 0.34 + Math.sin(t * 2.6 + i * 1.7) * 0.08 });
    additive(ctx, () => {
      const hearth = L('hearth');
      if (art('hearth')) halo('hearth', 0);
      else at(ctx, 'hearth', () => {
        if (hearth) glow(ctx, 180, 244, 20 + hearth * 9 + Math.sin(t * 5) * 2, '#ffb347', 0.75);
        else glow(ctx, 180, 246, 14, '#ffb347', 0.12 + Math.sin(t * 1.5) * 0.05);
      });
      for (let i = 0; i < lamps.length; i++) {
        const [x, y, col] = lamps[i];
        glow(ctx, x, y, 11 + Math.sin(t * 3 + i * 1.7) * 1.6, col, 0.8);
      }
      if (art('lanterns')) halo('lanterns', 1);
      const cots = L('cottages');
      if (art('cottages')) halo('cottages', 2);
      else at(ctx, 'cottages', () => CUP_SPOTS.forEach(([x, y], i) => {
        if (cots >= 3 || (cots >= 2 && i === 0)) glow(ctx, x + 5.5, y - 11, 9, '#ffe08a', 0.7);
      }));
      const bell = L('belltower');
      if (art('belltower')) halo('belltower', 3);
      else at(ctx, 'belltower', () => {
        if (bell >= 2) glow(ctx, 180, 71, 12 + Math.sin(t * 2.2) * 2, '#ffcf5c', 0.55);
        if (bell >= 3) glow(ctx, 180, 90, 12, '#ffe08a', 0.8);
      });
    });

    for (const s of steam) {
      if (!s.village) continue;
      ctx.fillStyle = `rgba(255,255,255,${0.3 * s.life})`;
      circle(ctx, s.x, s.y, s.r);
    }

    // puff-folk move in as cottages are raised
    // (code-drawn folk only: they do not match painted cottages)
    const folk = art('cottages') ? 0 : L('cottages') * 2;
    for (let i = 0; i < folk; i++) {
      const [x, y] = moved('cottages', FOLK_SPOTS[i][0], FOLK_SPOTS[i][1]);
      const hop = Math.max(0, Math.sin(t * 2.2 + i * 1.9)) * 3;
      ctx.fillStyle = '#ffffff';
      circle(ctx, x, y - 3 - hop, 3.4);
      circle(ctx, x - 2.6, y - 1.6 - hop, 2.4);
      circle(ctx, x + 2.6, y - 1.6 - hop, 2.4);
      ctx.fillStyle = '#2a2150';
      circle(ctx, x - 1.1, y - 3.2 - hop, 0.6);
      circle(ctx, x + 1.1, y - 3.2 - hop, 0.6);
    }

    // befriended creatures live here
    for (const id of ['nimbit', 'sprigget', 'whistlewing']) {
      if (!st.creatures[id]) continue;
      const c = critters[id];
      const hop = Math.sin(Math.min(1, c.hop) * Math.PI) * 9;
      const y = c.y - hop;
      if (id !== 'whistlewing') {
        ctx.fillStyle = 'rgba(40,30,90,.18)';
        ellipse(ctx, c.x, c.y + 15, 12 - hop * 0.4, 3);
      }
      drawCreature(ctx, id, c.x, y, has(id + '_idle') ? CREATURE_SCALE : 1.05, t, { happy: c.happy > 0, flip: c.dir === -1 });
      [c.sx, c.sy] = toScreen(c.x, y, bob);
    }

    for (const h of hearts) {
      ctx.globalAlpha = Math.min(1, h.life * 1.6);
      ctx.fillStyle = '#ff8fa3';
      const r = 3.4;
      ctx.beginPath();
      ctx.moveTo(h.x, h.y + r);
      ctx.bezierCurveTo(h.x - r * 2, h.y - r * 0.6, h.x - r * 0.6, h.y - r * 1.8, h.x, h.y - r * 0.5);
      ctx.bezierCurveTo(h.x + r * 0.6, h.y - r * 1.8, h.x + r * 2, h.y - r * 0.6, h.x, h.y + r);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // --- drifting lights in front of everything; more of them as the world wakes ---
    ctx.save();
    ctx.translate(geom.ox, geom.oy);
    ctx.scale(geom.s, geom.s);
    additive(ctx, () => {
      const n = Math.min(flies.length, 10 + Math.round(p * 24));
      for (let i = 0; i < n; i++) {
        const f = flies[i];
        const tw = 0.5 + 0.5 * Math.sin(t * 2 + f.ph);
        glow(ctx, f.x, f.y, f.r * (2.2 + tw), f.c, 0.25 + tw * 0.5);
      }
      // a slow twinkle on the cases still waiting
      TEASERS.forEach((tz, i) => glow(ctx, tz.x - 4, tz.y - tz.r * 1.5, 7, '#c4eee6', Math.max(0, Math.sin(t * 1.1 + i * 2.4)) * 0.5));
    });
    ctx.restore();

    band(ctx, 'mw_fore_mist', W, geom.oy + 436 * geom.s);
    fx.draw(ctx);
  }

  /** Tap test in screen coords. Returns the creature id that was greeted, if any. */
  function tap(x, y) {
    const st = getState();
    for (const id of ['whistlewing', 'sprigget', 'nimbit']) {
      const c = critters[id];
      if (!st.creatures[id]) continue;
      if (Math.hypot(x - c.sx, y - c.sy) < 30 * geom.s + 8) {
        c.hop = 1;
        c.happy = 1.6;
        c.pause = 1.2;
        for (let i = 0; i < 3; i++) hearts.push({ x: c.x + (i - 1) * 9, y: c.y - 22 - i * 3, life: 0.9 + i * 0.15 });
        return id;
      }
    }
    return null;
  }

  /** Tap test for the cases waiting on the desk. Returns 0, 1 or -1. */
  function tapTeaser(x, y) {
    for (let i = 0; i < TEASERS.length; i++) {
      const [sx, sy] = toScreen(TEASERS[i].x, TEASERS[i].y - TEASERS[i].r);
      if (Math.hypot(x - sx, y - sy) < TEASERS[i].r * geom.s + 12) return i;
    }
    return -1;
  }

  /** Sparkle burst where an upgrade was just built. */
  function celebrate(id) {
    const a = ANCHOR[id];
    if (!a) return;
    const [x, y] = toScreen(a[0], a[1], id === 'teapot' ? 0 : bobNow());
    fx.emit(x, y, { n: 38, color: ['#ffcf5c', '#fff3c4', '#ff8fa3', '#7fe3d8'], speed: [30, 190], life: [0.5, 1.3], size: [2, 5], gravity: 60, drag: 1.8 });
  }

  return { update, draw, tap, tapTeaser, celebrate, anchorScreen: (id) => toScreen(ANCHOR[id][0], ANCHOR[id][1]), invalidate: () => (key = '') };
}

export { createWorldView };
