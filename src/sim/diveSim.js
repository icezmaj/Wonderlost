// Spark Diving - the headless, deterministic simulation of one dive.
//
// No rendering, audio, DOM or clock access happens here. The sim advances in
// fixed 1/120 s ticks and its only inputs are launch/rekindle angles stamped
// with the tick they happened on. Same level + same inputs = same result, which
// is what makes the mechanic testable, bot-simulatable and (later) verifiable
// by a server replaying `inputs`.

import { TUNING as T } from '../config/tuning.js';

const FIELD = { w: 360, h: 640 };
const STEP = 1 / 120;

const CHAIN_TICKS = Math.round(T.chainWindow / STEP);
const SETTLE_TICKS = Math.round(T.settleSeconds / STEP);
const MAX_TICKS = Math.round(T.maxDiveSeconds / STEP);

/** Glow multiplier for a chain length. */
function tierOf(chain) {
  for (const [min, mult] of T.chainTiers) if (chain >= min) return mult;
  return 1;
}

/**
 * @param level  output of buildLevel()
 * @param mods   merged upgrade + companion modifiers (see progression/state.js)
 */
function createDive(level, mods = {}) {
  return {
    level,
    mods,
    tick: 0,
    phase: 'aim', // 'aim' -> 'fly' -> 'done'
    outcome: null, // 'home' | 'mist' | 'fizzle'
    spark: { x: level.launcher.x, y: level.launcher.y, vx: 0, vy: 0, r: T.sparkRadius },
    hearthW: level.hearth.w * (mods.hearthScale || 1),
    rekindles: T.baseRekindles + (mods.extraRekindles || 0),
    rekindlesUsed: 0,
    chain: 0,
    tier: 1,
    bestChain: 0,
    chainTicks: 0,
    gathered: 0,
    motes: 0,
    bumperHits: 0,
    lit: level.lit.slice(),
    lanternsLitNow: [],
    gotRelic: false,
    gotCreature: null,
    stillTicks: 0,
    ents: level.ents.map((e, i) => ({ ...e, id: i, alive: true, hits: 0, x0: e.x, y0: e.y })),
    events: [], // drained by the renderer/audio each frame
    inputs: [] // replay log
  };
}

/** Launch angles are clamped so the spark always heads down into the world. */
function clampLaunchAngle(a) {
  const lo = 0.14;
  const hi = Math.PI - 0.14;
  if (a < -Math.PI / 2) a += Math.PI * 2;
  return a < lo ? lo : a > hi ? hi : a;
}

function launch(sim, angle) {
  if (sim.phase !== 'aim') return false;
  const a = clampLaunchAngle(angle);
  sim.spark.vx = Math.cos(a) * T.launchSpeed;
  sim.spark.vy = Math.sin(a) * T.launchSpeed;
  sim.phase = 'fly';
  sim.inputs.push({ tick: sim.tick, kind: 'launch', angle: a });
  sim.events.push({ type: 'launch', x: sim.spark.x, y: sim.spark.y });
  return true;
}

/** Mid-flight re-aim: spend a charge, dash in any direction, keep the chain alive. */
function rekindle(sim, angle) {
  if (sim.phase !== 'fly' || sim.rekindles <= 0) return false;
  sim.rekindles--;
  sim.rekindlesUsed++;
  sim.spark.vx = Math.cos(angle) * T.dashSpeed;
  sim.spark.vy = Math.sin(angle) * T.dashSpeed;
  if (sim.chain > 0) sim.chainTicks = CHAIN_TICKS;
  sim.stillTicks = 0;
  sim.inputs.push({ tick: sim.tick, kind: 'rekindle', angle });
  sim.events.push({ type: 'rekindle', x: sim.spark.x, y: sim.spark.y });
  return true;
}

function gather(sim, base, x, y, kind) {
  sim.chain++;
  sim.chainTicks = CHAIN_TICKS;
  if (sim.chain > sim.bestChain) sim.bestChain = sim.chain;
  const tier = tierOf(sim.chain);
  if (tier !== sim.tier) {
    sim.tier = tier;
    sim.events.push({ type: 'tier', tier, x, y });
  }
  const value = base * tier;
  sim.gathered += value;
  sim.events.push({ type: kind, x, y, value, chain: sim.chain });
  return value;
}

function finish(sim, outcome) {
  sim.phase = 'done';
  sim.outcome = outcome;
  sim.events.push({ type: 'end', outcome, x: sim.spark.x, y: sim.spark.y });
}

/** Circle vs thick segment. Returns impact speed (0 if no contact). */
function hitSegment(s, seg, rest) {
  const dx = seg.x2 - seg.x1;
  const dy = seg.y2 - seg.y1;
  let t = ((s.x - seg.x1) * dx + (s.y - seg.y1) * dy) / (dx * dx + dy * dy);
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const px = seg.x1 + dx * t;
  const py = seg.y1 + dy * t;
  let nx = s.x - px;
  let ny = s.y - py;
  const R = s.r + (seg.th || 4);
  const d2 = nx * nx + ny * ny;
  if (d2 >= R * R || d2 < 1e-9) return 0;
  const d = Math.sqrt(d2);
  nx /= d;
  ny /= d;
  s.x = px + nx * R;
  s.y = py + ny * R;
  const vn = s.vx * nx + s.vy * ny;
  if (vn >= 0) return 0;
  s.vx -= (1 + rest) * vn * nx;
  s.vy -= (1 + rest) * vn * ny;
  return -vn;
}

/** Circle vs solid circle. Returns the contact normal or null. */
function hitCircle(s, cx, cy, cr) {
  let nx = s.x - cx;
  let ny = s.y - cy;
  const R = s.r + cr;
  const d2 = nx * nx + ny * ny;
  if (d2 >= R * R || d2 < 1e-9) return null;
  const d = Math.sqrt(d2);
  nx /= d;
  ny /= d;
  s.x = cx + nx * R;
  s.y = cy + ny * R;
  return { nx, ny };
}

/** Advance the dive by exactly one fixed tick. */
function step(sim) {
  if (sim.phase !== 'fly') return;
  const s = sim.spark;
  const m = sim.mods;
  const lvl = sim.level;
  sim.tick++;

  // --- integrate ---
  s.vy += T.gravity * STEP;
  const drag = 1 - T.airDrag * STEP;
  s.vx *= drag;
  s.vy *= drag;
  const sp2 = s.vx * s.vx + s.vy * s.vy;
  if (sp2 > T.maxSpeed * T.maxSpeed) {
    const k = T.maxSpeed / Math.sqrt(sp2);
    s.vx *= k;
    s.vy *= k;
  }
  s.x += s.vx * STEP;
  s.y += s.vy * STEP;

  // --- field edges ---
  if (s.x < s.r) {
    s.x = s.r;
    if (s.vx < 0) {
      if (s.vx < -90) sim.events.push({ type: 'wall', x: s.x, y: s.y });
      s.vx = -s.vx * T.boundRest;
    }
  } else if (s.x > FIELD.w - s.r) {
    s.x = FIELD.w - s.r;
    if (s.vx > 0) {
      if (s.vx > 90) sim.events.push({ type: 'wall', x: s.x, y: s.y });
      s.vx = -s.vx * T.boundRest;
    }
  }
  if (s.y < s.r) {
    s.y = s.r;
    if (s.vy < 0) s.vy = -s.vy * T.boundRest;
  }

  // --- cloud ledges ---
  for (const seg of lvl.segments) {
    const impact = hitSegment(s, seg, T.ledgeRest);
    if (impact > 90) sim.events.push({ type: 'ledge', x: s.x, y: s.y });
  }

  // --- hearth rim posts (solid) ---
  const hx = lvl.hearth.x;
  const hy = lvl.hearth.y;
  const half = sim.hearthW / 2;
  for (const px of [hx - half, hx + half]) {
    const n = hitCircle(s, px, hy - 2, 5);
    if (n) {
      const vn = s.vx * n.nx + s.vy * n.ny;
      if (vn < 0) {
        s.vx -= 1.5 * vn * n.nx;
        s.vy -= 1.5 * vn * n.ny;
      }
    }
  }

  // --- entities ---
  for (const e of sim.ents) {
    if (!e.alive) continue;
    if (e.kind === 'mote') {
      let dx = s.x - e.x;
      let dy = s.y - e.y;
      let d2 = dx * dx + dy * dy;
      if (m.magnet && d2 < m.magnet * m.magnet && d2 > 1) {
        const d = Math.sqrt(d2);
        const pull = 230 * STEP;
        e.x += (dx / d) * pull;
        e.y += (dy / d) * pull;
        dx = s.x - e.x;
        dy = s.y - e.y;
        d2 = dx * dx + dy * dy;
      }
      if (d2 < (s.r + 7) * (s.r + 7)) {
        e.alive = false;
        sim.motes++;
        gather(sim, T.moteValue, e.x, e.y, 'mote');
      }
    } else if (e.kind === 'lantern') {
      if (sim.lit[e.li]) continue;
      const dx = s.x - e.x;
      const dy = s.y - e.y;
      if (dx * dx + dy * dy < (s.r + e.r) * (s.r + e.r)) {
        sim.lit[e.li] = true;
        sim.lanternsLitNow.push(e.li);
        gather(sim, T.lanternValue + (m.lanternValue || 0), e.x, e.y, 'lantern');
        if (sim.lit.every(Boolean)) sim.events.push({ type: 'awaken', x: e.x, y: e.y });
      }
    } else if (e.kind === 'bumper') {
      const n = hitCircle(s, e.x, e.y, e.r);
      if (!n) continue;
      const vn = s.vx * n.nx + s.vy * n.ny;
      if (vn >= 0) continue;
      const charged = e.hits < T.bumperCharges;
      const rest = charged ? 1 : T.bumperSpentRest;
      s.vx -= (1 + rest) * vn * n.nx;
      s.vy -= (1 + rest) * vn * n.ny;
      if (charged) {
        const sp = Math.hypot(s.vx, s.vy);
        if (sp < T.bumperKick) {
          const k = T.bumperKick / (sp || 1);
          s.vx *= k;
          s.vy *= k;
        }
        e.hits++;
        sim.bumperHits++;
        gather(sim, T.bumperValue + (m.bumperValue || 0), e.x, e.y, 'bumper');
        sim.events[sim.events.length - 1].id = e.id;
      } else {
        sim.events.push({ type: 'thud', x: e.x, y: e.y, id: e.id });
      }
    } else if (e.kind === 'geyser') {
      if (e.hits >= T.geyserCharges || s.vy <= 0) continue;
      if (Math.abs(s.x - e.x) < e.w / 2 && s.y + s.r > e.y - 8 && s.y < e.y + 14) {
        e.hits++;
        s.vy = -T.geyserSpeed;
        s.vx = s.vx * 0.35 + (FIELD.w / 2 - s.x) * 0.45;
        gather(sim, T.geyserValue, e.x, e.y, 'geyser');
        sim.events[sim.events.length - 1].id = e.id;
      }
    } else if (e.kind === 'bubble') {
      if (e.moving) e.x = e.x0 + Math.sin(sim.tick * STEP * 1.25) * e.amp;
      const dx = s.x - e.x;
      const dy = s.y - e.y;
      if (dx * dx + dy * dy < (s.r + e.r) * (s.r + e.r)) {
        e.alive = false;
        sim.gotCreature = e.creature;
        gather(sim, 3, e.x, e.y, 'creature');
        sim.events[sim.events.length - 1].creature = e.creature;
      }
    } else if (e.kind === 'relic') {
      const dx = s.x - e.x;
      const dy = s.y - e.y;
      if (dx * dx + dy * dy < (s.r + e.r) * (s.r + e.r)) {
        e.alive = false;
        sim.gotRelic = true;
        gather(sim, 3, e.x, e.y, 'relic');
      }
    }
  }

  // --- chain window ---
  if (sim.chainTicks > 0 && --sim.chainTicks === 0) {
    if (sim.chain >= 5) sim.events.push({ type: 'chainEnd', chain: sim.chain, x: s.x, y: s.y });
    sim.chain = 0;
    sim.tier = 1;
  }

  // --- endings ---
  if (s.vy > 0 && s.y >= hy - 4 && s.y < hy + 16 && Math.abs(s.x - hx) < half - 3) return finish(sim, 'home');
  if (s.y > FIELD.h + 16) return finish(sim, 'mist');
  if (s.vx * s.vx + s.vy * s.vy < T.settleSpeed * T.settleSpeed) {
    if (++sim.stillTicks > SETTLE_TICKS) return finish(sim, 'fizzle');
  } else {
    sim.stillTicks = 0;
  }
  if (sim.tick > MAX_TICKS) return finish(sim, 'fizzle');
}

/** Plain-data result handed to the economy. */
function summarize(sim) {
  return {
    outcome: sim.outcome,
    gathered: sim.gathered,
    bestChain: sim.bestChain,
    motes: sim.motes,
    bumperHits: sim.bumperHits,
    lit: sim.lit.slice(),
    lanternsLitNow: sim.lanternsLitNow.length,
    gotRelic: sim.gotRelic,
    gotCreature: sim.gotCreature,
    rekindlesUsed: sim.rekindlesUsed,
    seconds: sim.tick * STEP,
    inputs: sim.inputs.slice()
  };
}

/**
 * Aim guide: the ballistic path up to the first solid contact (never beyond -
 * what happens after the first bounce is the player's to read).
 */
function previewPath(level, x, y, vx, vy, maxTicks = 150) {
  const s = { x, y, vx, vy, r: T.sparkRadius };
  const pts = [];
  const drag = 1 - T.airDrag * STEP;
  for (let i = 0; i < maxTicks; i++) {
    s.vy += T.gravity * STEP;
    s.vx *= drag;
    s.vy *= drag;
    s.x += s.vx * STEP;
    s.y += s.vy * STEP;
    if (s.x < s.r || s.x > FIELD.w - s.r || s.y < s.r || s.y > FIELD.h) break;
    let hit = false;
    for (const seg of level.segments) {
      const dx = seg.x2 - seg.x1;
      const dy = seg.y2 - seg.y1;
      let t = ((s.x - seg.x1) * dx + (s.y - seg.y1) * dy) / (dx * dx + dy * dy);
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const R = s.r + (seg.th || 4);
      if ((s.x - seg.x1 - dx * t) ** 2 + (s.y - seg.y1 - dy * t) ** 2 < R * R) hit = true;
    }
    for (const e of level.ents) {
      if (e.kind === 'bumper' && (s.x - e.x) ** 2 + (s.y - e.y) ** 2 < (s.r + e.r) ** 2) hit = true;
    }
    if (i % 6 === 5) pts.push({ x: s.x, y: s.y });
    if (hit) break;
  }
  return pts;
}

export { FIELD, STEP, tierOf, createDive, clampLaunchAngle, launch, rekindle, step, summarize, previewPath };
