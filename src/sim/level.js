// Hollow generator. A "hollow" is one dive field: lanterns to light, motes to
// chain, bell blooms, cloud ledges, geysers and (sometimes) a hidden relic or a
// sleeping creature. Layout is a pure function of the hollow seed and the
// player's restoration modifiers, so the same hollow is rebuilt identically for
// every dive until all of its lanterns are lit.

import { mulberry32, range, shuffle } from '../core/rng.js';
import { TUNING as T } from '../config/tuning.js';
import { FIELD, STEP } from './diveSim.js';

// Ten staggered anchor points: rows of 3 / 2 / 3 / 2.
const SLOTS = [
  [70, 170, 0], [180, 170, 0], [290, 170, 0],
  [124, 262, 1], [236, 262, 1],
  [70, 354, 2], [180, 354, 2], [290, 354, 2],
  [124, 446, 3], [236, 446, 3]
];

// The first hollow every player sees (hollow 0) is authored by hand.
const TUTORIAL = {
  lanterns: [[180, 282], [92, 338], [268, 338], [180, 492]],
  bumpers: [[166, 392]],
  clusters: [[70, 190], [290, 190], [104, 452], [256, 452]],
  bubble: [180, 196]
};

function lanternsSpread(slots) {
  const rows = [0, 0, 0, 0];
  let left = 0;
  let right = 0;
  for (const s of slots) {
    rows[s.row]++;
    if (s.x < 160) left++;
    if (s.x > 200) right++;
  }
  return Math.max(...rows) <= 2 && left >= 1 && right >= 1;
}

function ring(x, y, r, n, phase = 0) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = phase + (i / n) * Math.PI * 2;
    out.push({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r });
  }
  return out;
}

/** Motes along the path a spark launched at `angle` would fly (gravity + drag only). */
function trail(launcher, angle, fromSec, toSec, everySec) {
  const out = [];
  let x = launcher.x;
  let y = launcher.y;
  let vx = Math.cos(angle) * T.launchSpeed;
  let vy = Math.sin(angle) * T.launchSpeed;
  const drag = 1 - T.airDrag * STEP;
  const every = Math.round(everySec / STEP);
  const from = Math.round(fromSec / STEP);
  const to = Math.round(toSec / STEP);
  for (let i = 1; i <= to; i++) {
    vy += T.gravity * STEP;
    vx *= drag;
    vy *= drag;
    x += vx * STEP;
    y += vy * STEP;
    if (x < 16 || x > FIELD.w - 16 || y > 500) break;
    if (i >= from && (i - from) % every === 0) out.push({ x, y });
  }
  return out;
}

function distToSegment(px, py, seg) {
  const dx = seg.x2 - seg.x1;
  const dy = seg.y2 - seg.y1;
  let t = ((px - seg.x1) * dx + (py - seg.y1) * dy) / (dx * dx + dy * dy);
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return Math.hypot(px - seg.x1 - dx * t, py - seg.y1 - dy * t);
}

/**
 * @param hollow { index, seed, lit[], relic, relicTaken, bubble, bubbleTaken, bubbleMoving }
 * @param mods   restoration modifiers: bumpers, geysers, moteBonus
 */
function buildLevel(hollow, mods = {}) {
  const rng = mulberry32(hollow.seed);
  const tutorial = hollow.index === 0;
  const launcher = { x: 180, y: 58 };
  const hearth = { x: tutorial ? 180 : 180 + Math.round(range(rng, -28, 28)), y: 606, w: T.hearthWidth };
  const segments = [];
  const ents = [];
  let motes = [];

  const slots = SLOTS.map(([x, y, row], i) => ({
    i,
    row,
    x: tutorial ? x : x + Math.round(range(rng, -10, 10)),
    y: tutorial ? y : y + Math.round(range(rng, -8, 8))
  }));

  // --- decide which slot holds what ---
  const nLanterns = hollow.lit.length;
  const at = ([x, y]) => ({ x, y, row: 2 });
  let pool;
  let lanternSlots;
  if (tutorial) {
    // Hand-placed first hollow. A plain straight drop chains motes, wakes
    // Nimbit, lights the centre lantern, then glances off the (deliberately
    // off-centre) bell bloom into a second lantern.
    lanternSlots = TUTORIAL.lanterns.map(at);
    pool = [...TUTORIAL.bumpers.map(at), ...TUTORIAL.clusters.map(at)];
  } else {
    let order;
    for (let tries = 0; tries < 40; tries++) {
      order = shuffle(rng, slots);
      if (lanternsSpread(order.slice(0, nLanterns))) break;
    }
    pool = order.slice();
    lanternSlots = pool.splice(0, nLanterns);
  }
  const take = (pred) => {
    const idx = pred ? pool.findIndex(pred) : 0;
    return pool.splice(idx < 0 ? 0 : idx, 1)[0];
  };

  lanternSlots.forEach((s, li) => {
    ents.push({ kind: 'lantern', x: s.x, y: s.y, r: 16, li });
    // Three motes arc over each lantern to lead the eye (and the spark) in.
    for (let k = -1; k <= 1; k++) {
      const a = -Math.PI / 2 + k * 0.7;
      motes.push({ x: s.x + Math.cos(a) * 30, y: s.y + Math.sin(a) * 30 });
    }
  });

  const nBumpers = tutorial ? TUTORIAL.bumpers.length : Math.min(4, 1 + (mods.bumpers || 0));
  for (let b = 0; b < nBumpers && pool.length; b++) {
    const s = take((q) => q.row >= 1);
    ents.push({ kind: 'bumper', x: s.x, y: s.y, r: 17 });
  }

  if (!tutorial && hollow.relic && !hollow.relicTaken && pool.length) {
    const s = take((q) => q.row >= 2);
    // A chevron roof hides the crate: it can only be reached from the side or below.
    segments.push({ x1: s.x - 27, y1: s.y - 13, x2: s.x, y2: s.y - 26, th: 4, kind: 'roof' });
    segments.push({ x1: s.x, y1: s.y - 26, x2: s.x + 27, y2: s.y - 13, th: 4, kind: 'roof' });
    ents.push({ kind: 'relic', x: s.x, y: s.y + 3, r: 13 });
  }

  const nLedges = tutorial ? 0 : Math.min(2, pool.length);
  for (let l = 0; l < nLedges; l++) {
    const s = take();
    const dir = s.x < 150 ? 1 : s.x > 210 ? -1 : rng() < 0.5 ? 1 : -1; // slope toward the centre
    segments.push({ x1: s.x - 30, y1: s.y - 11 * dir, x2: s.x + 30, y2: s.y + 11 * dir, th: 4, kind: 'ledge' });
    for (let k = -1; k <= 1; k++) motes.push({ x: s.x + k * 20, y: s.y + k * 7 * dir - 24 });
  }

  // Remaining slots become mote clusters.
  for (const s of pool) {
    const kind = Math.floor(rng() * 3);
    if (kind === 0) motes.push(...ring(s.x, s.y, 24, 6, rng() * 6));
    else if (kind === 1) {
      motes.push({ x: s.x, y: s.y }, ...ring(s.x, s.y, 23, 4, Math.PI / 4));
    } else for (let k = -2; k <= 2; k++) motes.push({ x: s.x + k * 18, y: s.y + Math.sin(k * 1.2) * 8 });
  }

  // --- guide trails: motes laid along real launch arcs, so a good aim chains at once ---
  if (tutorial) {
    for (let y = 100; y <= 250; y += 26) motes.push({ x: 180, y });
  } else {
    const targets = shuffle(rng, slots).slice(0, 3);
    for (const tg of targets) {
      const angle = Math.atan2(tg.y - launcher.y, tg.x - launcher.x);
      motes.push(...trail(launcher, angle, 0.22, 0.95, 0.1));
    }
  }

  // --- the floor: inward ledges, replaced by geysers as the Steam Garden grows ---
  const nGeysers = Math.min(3, mods.geysers || 0);
  const firstSide = rng() < 0.5 ? -1 : 1;
  const geyserSides = nGeysers >= 2 ? [-1, 1] : nGeysers === 1 ? [firstSide] : [];
  for (const side of [-1, 1]) {
    if (geyserSides.includes(side)) {
      ents.push({ kind: 'geyser', x: side < 0 ? 42 : FIELD.w - 42, y: 620, w: 48 });
    } else if (side < 0) {
      segments.push({ x1: -4, y1: 546, x2: 58, y2: 571, th: 4, kind: 'ledge' });
    } else {
      segments.push({ x1: FIELD.w + 4, y1: 546, x2: FIELD.w - 58, y2: 571, th: 4, kind: 'ledge' });
    }
  }
  if (nGeysers >= 3) ents.push({ kind: 'geyser', x: hearth.x + firstSide * 102, y: 620, w: 44 });

  // --- sleeping creature ---
  if (hollow.bubble && !hollow.bubbleTaken) {
    if (tutorial) ents.push({ kind: 'bubble', x: TUTORIAL.bubble[0], y: TUTORIAL.bubble[1], r: 19, creature: hollow.bubble });
    else if (hollow.bubbleMoving) {
      ents.push({ kind: 'bubble', x: 180, y: 308, r: 19, creature: hollow.bubble, moving: true, amp: 78 });
    } else {
      ents.push({ kind: 'bubble', x: rng() < 0.5 ? 38 : FIELD.w - 38, y: 118, r: 19, creature: hollow.bubble });
    }
  }

  // --- extra motes from Cloud Cottages ---
  const extra = Math.round(motes.length * (mods.moteBonus || 0));
  for (let k = 0; k < extra; k++) motes.push({ x: range(rng, 24, FIELD.w - 24), y: range(rng, 120, 520) });

  // --- drop motes that overlap solids or each other ---
  const kept = [];
  for (const p of motes) {
    if (p.x < 14 || p.x > FIELD.w - 14 || p.y < 92 || p.y > 540) continue;
    let ok = true;
    for (const e of ents) {
      const min = e.kind === 'bumper' ? e.r + 13 : e.kind === 'lantern' ? 20 : e.kind === 'geyser' ? 0 : e.r + 10;
      if (min && Math.hypot(p.x - e.x, p.y - e.y) < min) ok = false;
    }
    for (const seg of segments) if (distToSegment(p.x, p.y, seg) < 15) ok = false;
    for (const q of kept) if (Math.hypot(p.x - q.x, p.y - q.y) < 15) ok = false;
    if (ok) kept.push(p);
  }
  for (const p of kept) ents.push({ kind: 'mote', x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 });

  return { index: hollow.index, launcher, hearth, segments, ents, lit: hollow.lit.slice() };
}

export { buildLevel };
