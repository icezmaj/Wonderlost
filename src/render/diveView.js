// Renderer for a dive. Pure presentation: it reads the sim, never changes it.
//
// The signature look: a hollow starts dark and asleep. The Spark carries the
// only light, and every lantern it wakes pushes the darkness back for good -
// so the player literally paints the world awake as they play.

import { glow, additive, ellipse, circle, roundRect, cloud, star4, Particles, Popups } from './gfx.js';
import { drawCreature, drawZzz } from './creatures.js';
import { has, place, cover, assetVersion } from './assets.js';
import { FIELD } from '../sim/diveSim.js';
import { TUNING as T } from '../config/tuning.js';
import { mulberry32 } from '../core/rng.js';

function createDiveView() {
  const fx = new Particles(320);
  const pops = new Popups();
  const geom = { W: 360, H: 760, fs: 1, x0: 0, y0: 0 };
  const pulses = new Map(); // entity id -> 1..0 hit pulse
  const dark = document.createElement('canvas');
  const dctx = dark.getContext('2d');
  let bg = null;
  let bgKey = '';
  let trail = [];
  let colors = ['#fff3c4', '#ffcf5c', '#ff9d2e'];
  let t = 0;
  let shake = 0;
  let flash = 0;
  let awake = 0; // eased fraction of lanterns lit
  let endGlow = 0;
  let reduced = false; // accessibility: no shake, softer flashes

  function fit(W, H) {
    geom.W = W;
    geom.H = H;
    geom.fs = Math.min(1, H / 652, W / FIELD.w);
    geom.x0 = (W - FIELD.w * geom.fs) / 2;
    geom.y0 = Math.max(0, (H - FIELD.h * geom.fs) * 0.62);
  }

  /** Screen (logical) -> field coordinates. */
  const toField = (x, y) => [(x - geom.x0) / geom.fs, (y - geom.y0) / geom.fs];
  const toScreen = (x, y) => [geom.x0 + x * geom.fs, geom.y0 + y * geom.fs];

  function begin(sim, trailColors, reducedMotion) {
    reduced = !!reducedMotion;
    fx.clear();
    pops.clear();
    pulses.clear();
    trail = [];
    colors = trailColors || colors;
    shake = 0;
    flash = 0;
    endGlow = 0;
    awake = sim.lit.filter(Boolean).length / sim.lit.length;
    bgKey = '';
  }

  // ------------------------------------------------------------ background

  function buildBg(W, H, px, seed) {
    bg = document.createElement('canvas');
    bg.width = Math.round(W * px);
    bg.height = Math.round(H * px);
    const g = bg.getContext('2d');
    g.scale(px, px);
    if (cover(g, 'dive_backdrop', W, H)) return;
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#1a1550');
    sky.addColorStop(0.45, '#3a2c86');
    sky.addColorStop(0.8, '#6a3f93');
    sky.addColorStop(1, '#3a2466');
    g.fillStyle = sky;
    g.fillRect(0, 0, W, H);

    g.translate(geom.x0, geom.y0);
    g.scale(geom.fs, geom.fs);
    // light falling in through the teapot's opening
    additive(g, () => {
      glow(g, 180, -40, 260, '#8fa8ff', 0.35);
      glow(g, 180, 640, 300, '#ff9d6b', 0.16);
    });
    // drifting cloud banks, far away
    const rng = mulberry32(seed);
    for (let i = 0; i < 9; i++) {
      const y = 90 + rng() * 470;
      const w = 90 + rng() * 120;
      const a = 0.05 + rng() * 0.07;
      cloud(g, rng() * 360, y, w, 20 + rng() * 16, `rgba(255,255,255,${a})`, `rgba(160,150,230,${a * 0.6})`);
    }
    // the porcelain walls of the teapot curving in at the sides
    for (const side of [-1, 1]) {
      const cx = side < 0 ? -322 : 682;
      g.fillStyle = 'rgba(238,243,255,.10)';
      circle(g, cx, 330, 350);
      g.strokeStyle = 'rgba(111,140,255,.35)';
      g.lineWidth = 3;
      g.beginPath();
      g.arc(cx, 330, 350, 0, Math.PI * 2);
      g.stroke();
      g.strokeStyle = 'rgba(111,140,255,.16)';
      g.lineWidth = 1.5;
      g.beginPath();
      g.arc(cx, 330, 342, 0, Math.PI * 2);
      g.stroke();
    }
    // faraway village lights
    for (let i = 0; i < 26; i++) {
      g.fillStyle = `rgba(255,224,160,${0.12 + rng() * 0.25})`;
      circle(g, rng() * 360, 380 + rng() * 200, 0.7 + rng() * 0.9);
    }
  }

  // ------------------------------------------------------------ events -> effects

  function pop(x, y, text, color, size, life) {
    pops.add(x, y, text, color, size, life);
  }

  function onEvent(ev) {
    const { x, y } = ev;
    switch (ev.type) {
      case 'launch':
        fx.emit(x, y, { n: 14, color: colors, speed: [30, 140], life: [0.3, 0.7], size: [2, 4], angle: Math.PI / 2, spread: 1.6 });
        break;
      case 'mote':
        fx.emit(x, y, { n: 4, color: ['#7fe3d8', '#ffffff'], speed: [20, 80], life: [0.25, 0.55], size: [1.5, 3] });
        break;
      case 'lantern':
        pulses.set('L' + Math.round(x) + '_' + Math.round(y), 1);
        fx.emit(x, y, { n: 30, color: ['#ffcf5c', '#fff3c4', '#ff9d2e'], speed: [40, 200], life: [0.5, 1.2], size: [2, 5], gravity: 40 });
        pop(x, y - 24, '+' + ev.value, '#ffe08a', 16);
        shake = Math.max(shake, 0.35);
        flash = Math.max(flash, 0.22);
        break;
      case 'bumper':
        pulses.set(ev.id, 1);
        fx.emit(x, y, { n: 12, color: ['#ff8fa3', '#ffd3dd', '#ffcf5c'], speed: [50, 170], life: [0.3, 0.7], size: [2, 4] });
        pop(x, y - 26, '+' + ev.value, '#ffd3dd', 13, 0.7);
        shake = Math.max(shake, 0.2);
        break;
      case 'thud':
        pulses.set(ev.id, 0.5);
        fx.emit(x, y, { n: 5, color: '#b9b3d9', speed: [20, 70], life: [0.25, 0.5], size: [2, 3], glow: false });
        break;
      case 'geyser':
        pulses.set(ev.id, 1);
        fx.emit(x, y - 10, { n: 30, color: ['#ffffff', '#cfe8ff'], speed: [80, 320], life: [0.4, 1], size: [3, 7], angle: -Math.PI / 2, spread: 0.7, glow: false });
        pop(x, y - 46, 'Whoosh!', '#cfe8ff', 14);
        shake = Math.max(shake, 0.3);
        break;
      case 'wall':
      case 'ledge':
        fx.emit(x, y, { n: 4, color: '#ffffff', speed: [15, 60], life: [0.2, 0.45], size: [1.5, 3], glow: false });
        break;
      case 'rekindle':
        fx.emit(x, y, { n: 26, color: colors, speed: [60, 240], life: [0.3, 0.8], size: [2, 5] });
        flash = Math.max(flash, 0.3);
        shake = Math.max(shake, 0.25);
        break;
      case 'creature':
        fx.emit(x, y, { n: 22, color: ['#cfe8ff', '#ffffff', '#ff8fa3'], speed: [40, 180], life: [0.4, 1], size: [2, 5] });
        shake = Math.max(shake, 0.3);
        break;
      case 'relic':
        fx.emit(x, y, { n: 30, color: ['#ffcf5c', '#fff3c4'], speed: [40, 210], life: [0.5, 1.2], size: [2, 5], gravity: 50 });
        pop(x, y - 26, 'Relic crate!', '#ffe08a', 15, 1.2);
        flash = Math.max(flash, 0.25);
        break;
      case 'tier':
        if (ev.tier > 1) pop(x, y - 34, 'Chain ×' + ev.tier, ['', '', '#7fe3d8', '#ffcf5c', '#ff8fa3'][ev.tier], 19, 1.1);
        break;
      case 'awaken':
        flash = 0.7;
        shake = 0.7;
        pop(180, 300, 'Hollow awakened!', '#fff3c4', 24, 1.8);
        break;
      case 'end':
        if (ev.outcome === 'home') {
          fx.emit(x, y, { n: 60, color: ['#ffcf5c', '#fff3c4', '#ff9d2e', '#ff8fa3'], speed: [60, 300], life: [0.6, 1.5], size: [2, 6], angle: -Math.PI / 2, spread: 2.2, gravity: 120 });
          pop(x, y - 54, 'Home!', '#fff3c4', 26, 1.5);
          flash = Math.max(flash, 0.45);
          shake = 0.6;
          endGlow = 1;
        } else if (ev.outcome === 'mist') {
          fx.emit(x, FIELD.h - 4, { n: 16, color: ['#b9a8f0', '#ffffff'], speed: [20, 90], life: [0.5, 1.1], size: [4, 9], angle: -Math.PI / 2, spread: 2, glow: false });
        } else {
          fx.emit(x, y, { n: 12, color: colors, speed: [10, 60], life: [0.5, 1], size: [2, 4] });
        }
        break;
      default:
    }
  }

  function update(dt, sim) {
    t += dt;
    fx.update(dt);
    pops.update(dt);
    shake = Math.max(0, shake - dt * 2.4);
    flash = Math.max(0, flash - dt * 1.8);
    endGlow = Math.max(0, endGlow - dt * 0.6);
    for (const [k, v] of pulses) {
      if (v - dt * 3 <= 0) pulses.delete(k);
      else pulses.set(k, v - dt * 3);
    }
    const target = sim.lit.filter(Boolean).length / sim.lit.length;
    awake += (target - awake) * Math.min(1, dt * 3);
    if (sim.phase === 'fly') {
      trail.push({ x: sim.spark.x, y: sim.spark.y });
      if (trail.length > 22) trail.shift();
      if (Math.random() < dt * 40) {
        fx.emit(sim.spark.x, sim.spark.y, { n: 1, color: colors, speed: [5, 30], life: [0.25, 0.6], size: [1.5, 3] });
      }
    } else if (trail.length) trail.shift();
    // live geysers breathe steam
    for (const e of sim.ents) {
      if (e.kind === 'geyser' && e.hits < T.geyserCharges && Math.random() < dt * 9) {
        fx.emit(e.x + (Math.random() - 0.5) * e.w * 0.6, e.y - 6, { n: 1, color: '#ffffff', speed: [30, 80], life: [0.5, 1], size: [3, 6], angle: -Math.PI / 2, spread: 0.4, glow: false, drag: 0.6 });
      }
    }
  }

  // ------------------------------------------------------------ drawing

  function drawLedge(g, s) {
    g.lineCap = 'round';
    if (s.kind === 'roof' && has('roof')) {
      // a roof is two segments meeting at a peak: draw the image once, on the rising half
      if (s.y2 < s.y1) place(g, 'roof', s.x2, s.y2 + 6.5);
      return;
    }
    if (s.kind !== 'roof') {
      const flip = s.x2 < s.x1; // keep the image upright whichever way the segment was authored
      const dx = flip ? s.x1 - s.x2 : s.x2 - s.x1;
      const dy = flip ? s.y1 - s.y2 : s.y2 - s.y1;
      if (place(g, 'ledge', (s.x1 + s.x2) / 2, (s.y1 + s.y2) / 2, { w: Math.hypot(dx, dy) + 12, rot: Math.atan2(dy, dx) })) return;
    }
    if (s.kind === 'roof') {
      g.strokeStyle = '#2f3fa8';
      g.lineWidth = 10;
      g.beginPath();
      g.moveTo(s.x1, s.y1 + 2);
      g.lineTo(s.x2, s.y2 + 2);
      g.stroke();
      g.strokeStyle = '#6f8cff';
      g.lineWidth = 7;
      g.beginPath();
      g.moveTo(s.x1, s.y1);
      g.lineTo(s.x2, s.y2);
      g.stroke();
      return;
    }
    g.strokeStyle = '#8a82c8';
    g.lineWidth = 13;
    g.beginPath();
    g.moveTo(s.x1, s.y1 + 3);
    g.lineTo(s.x2, s.y2 + 3);
    g.stroke();
    g.strokeStyle = '#f4f1ff';
    g.lineWidth = 10;
    g.beginPath();
    g.moveTo(s.x1, s.y1);
    g.lineTo(s.x2, s.y2);
    g.stroke();
    g.fillStyle = '#f4f1ff';
    for (let k = 0.2; k < 1; k += 0.3) circle(g, s.x1 + (s.x2 - s.x1) * k, s.y1 + (s.y2 - s.y1) * k - 3, 6.5);
  }

  function drawSolids(g, sim) {
    const lvl = sim.level;
    for (const s of lvl.segments) drawLedge(g, s);

    // the Hearth: the bowl every Spark is trying to come home to
    const h = lvl.hearth;
    const half = sim.hearthW / 2;
    if (!place(g, 'hearth_dive', h.x, h.y + 8, { w: sim.hearthW + 12, h: 36 })) {
      g.fillStyle = '#6d63a6';
      g.beginPath();
      g.moveTo(h.x - half - 6, h.y - 4);
      g.quadraticCurveTo(h.x, h.y + 52, h.x + half + 6, h.y - 4);
      g.closePath();
      g.fill();
      g.fillStyle = '#2a1d55';
      ellipse(g, h.x, h.y - 2, half - 2, 6);
      g.fillStyle = '#e6e0fb';
      circle(g, h.x - half, h.y - 2, 5);
      circle(g, h.x + half, h.y - 2, 5);
    }

    for (const e of sim.ents) {
      if (!e.alive) continue;
      const pulse = pulses.get(e.id) || 0;
      if (e.kind === 'bumper') {
        const charged = e.hits < T.bumperCharges;
        const sc = 1 + pulse * 0.28;
        if (!place(g, charged ? 'bloom_charged' : 'bloom_spent', e.x, e.y, { scale: sc })) {
          g.fillStyle = charged ? '#ff8fa3' : '#7d77a8';
          for (let k = 0; k < 6; k++) {
            const a = (k / 6) * Math.PI * 2 + t * 0.3;
            circle(g, e.x + Math.cos(a) * e.r * 0.7 * sc, e.y + Math.sin(a) * e.r * 0.7 * sc, e.r * 0.44 * sc);
          }
          g.fillStyle = charged ? '#ffcf5c' : '#a59fcb';
          circle(g, e.x, e.y, e.r * 0.62 * sc);
          g.fillStyle = charged ? '#fff3c4' : '#c4bfe0';
          circle(g, e.x - 3, e.y - 3, e.r * 0.24);
        }
        // remaining bounces: gameplay information, so drawn over art too
        g.fillStyle = '#b86a0c';
        for (let k = 0; k < T.bumperCharges - e.hits; k++) circle(g, e.x - 5 + k * 5, e.y + 4, 1.4);
      } else if (e.kind === 'lantern') {
        const lit = sim.lit[e.li];
        if (place(g, lit ? 'lantern_on' : 'lantern_off', e.x, e.y - 1)) continue;
        g.strokeStyle = lit ? '#b86a0c' : '#3a3166';
        g.lineWidth = 1.6;
        g.beginPath();
        g.arc(e.x, e.y - 13, 4.5, Math.PI, 0);
        g.stroke();
        g.fillStyle = lit ? '#b86a0c' : '#3a3166';
        roundRect(g, e.x - 6, e.y - 13, 12, 4, 1.5);
        g.fill();
        roundRect(g, e.x - 5, e.y + 9, 10, 3, 1.5);
        g.fill();
        if (lit) {
          const grad = g.createLinearGradient(0, e.y - 10, 0, e.y + 10);
          grad.addColorStop(0, '#fff3c4');
          grad.addColorStop(1, '#ff9d2e');
          g.fillStyle = grad;
        } else g.fillStyle = '#5d5790';
        roundRect(g, e.x - 9, e.y - 10, 18, 20, 7);
        g.fill();
        g.strokeStyle = lit ? 'rgba(184,106,12,.5)' : 'rgba(255,255,255,.14)';
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(e.x - 3, e.y - 9);
        g.lineTo(e.x - 3, e.y + 9);
        g.moveTo(e.x + 3, e.y - 9);
        g.lineTo(e.x + 3, e.y + 9);
        g.stroke();
      } else if (e.kind === 'geyser') {
        const live = e.hits < T.geyserCharges;
        if (place(g, 'geyser_vent', e.x, e.y + 8, { w: e.w, alpha: live ? 1 : 0.45 })) continue;
        g.fillStyle = live ? '#c7cff5' : '#6d6996';
        g.beginPath();
        g.moveTo(e.x - e.w / 2, e.y - 6);
        g.lineTo(e.x + e.w / 2, e.y - 6);
        g.quadraticCurveTo(e.x + e.w / 2 - 4, e.y + 22, e.x, e.y + 22);
        g.quadraticCurveTo(e.x - e.w / 2 + 4, e.y + 22, e.x - e.w / 2, e.y - 6);
        g.fill();
        g.fillStyle = live ? '#f4f7ff' : '#8a86b3';
        ellipse(g, e.x, e.y - 6, e.w / 2, 5);
        g.fillStyle = live ? '#6f8cff' : '#57527f';
        ellipse(g, e.x, e.y - 6, e.w / 2 - 5, 3);
      } else if (e.kind === 'relic') {
        const bobY = Math.sin(t * 2.4) * 1.5;
        if (place(g, 'relic_closed', e.x, e.y + bobY)) continue;
        g.fillStyle = '#8a5326';
        roundRect(g, e.x - 11, e.y - 8 + bobY, 22, 17, 3);
        g.fill();
        g.fillStyle = '#c98a4b';
        roundRect(g, e.x - 11, e.y - 9 + bobY, 22, 8, 3);
        g.fill();
        g.fillStyle = '#ffcf5c';
        g.fillRect(e.x - 11, e.y - 2 + bobY, 22, 2);
        circle(g, e.x, e.y + 1 + bobY, 2.6);
      } else if (e.kind === 'bubble') {
        drawCreature(g, e.creature, e.x, e.y + 1, 0.82, t, { asleep: true });
        if (!place(g, 'bubble', e.x, e.y, { w: e.r * 2 })) {
          g.fillStyle = 'rgba(190,225,255,.2)';
          circle(g, e.x, e.y, e.r);
          g.strokeStyle = 'rgba(255,255,255,.75)';
          g.lineWidth = 1.4;
          g.beginPath();
          g.arc(e.x, e.y, e.r, 0, Math.PI * 2);
          g.stroke();
          g.strokeStyle = 'rgba(255,255,255,.9)';
          g.lineWidth = 2;
          g.beginPath();
          g.arc(e.x, e.y, e.r - 4, 1.15 * Math.PI, 1.45 * Math.PI);
          g.stroke();
        }
        drawZzz(g, e.x, e.y, t);
      }
    }

    // the spout the Spark drops from
    const L = lvl.launcher;
    if (place(g, 'dive_spout', L.x, L.y - 48)) return;
    g.fillStyle = '#9fb0e8';
    g.beginPath();
    g.moveTo(L.x - 30, -30);
    g.lineTo(L.x + 30, -30);
    g.lineTo(L.x + 15, L.y - 10);
    g.lineTo(L.x - 15, L.y - 10);
    g.closePath();
    g.fill();
    g.fillStyle = '#eef2ff';
    g.beginPath();
    g.moveTo(L.x - 30, -30);
    g.lineTo(L.x + 12, -30);
    g.lineTo(L.x + 4, L.y - 10);
    g.lineTo(L.x - 15, L.y - 10);
    g.closePath();
    g.fill();
    g.fillStyle = '#3f62e0';
    roundRect(g, L.x - 18, L.y - 14, 36, 6, 3);
    g.fill();
  }

  function drawDarkness(ctx, sim) {
    const { W, H } = geom;
    const q = 4;
    const dw = Math.ceil(W / q);
    const dh = Math.ceil(H / q);
    if (dark.width !== dw || dark.height !== dh) {
      dark.width = dw;
      dark.height = dh;
    }
    const alpha = 0.66 * (1 - awake * 0.92);
    if (alpha < 0.02) return;
    dctx.globalCompositeOperation = 'source-over';
    dctx.clearRect(0, 0, dw, dh);
    dctx.fillStyle = `rgba(9,6,34,${alpha})`;
    dctx.fillRect(0, 0, dw, dh);
    dctx.globalCompositeOperation = 'destination-out';
    const hole = (fx_, fy_, r) => {
      const [sx, sy] = toScreen(fx_, fy_);
      const x = sx / q;
      const y = sy / q;
      const rr = (r * geom.fs) / q;
      const grad = dctx.createRadialGradient(x, y, 0, x, y, rr);
      grad.addColorStop(0, 'rgba(0,0,0,1)');
      grad.addColorStop(0.5, 'rgba(0,0,0,.7)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      dctx.fillStyle = grad;
      dctx.fillRect(x - rr, y - rr, rr * 2, rr * 2);
    };
    hole(sim.spark.x, sim.spark.y, 96);
    hole(sim.level.launcher.x, sim.level.launcher.y - 20, 80);
    hole(sim.level.hearth.x, sim.level.hearth.y, 84);
    for (const e of sim.ents) {
      if (e.kind === 'lantern' && sim.lit[e.li]) hole(e.x, e.y, 120);
      else if (e.kind === 'lantern') hole(e.x, e.y, 30);
      else if ((e.kind === 'relic' || e.kind === 'bubble') && e.alive) hole(e.x, e.y, 44);
    }
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(dark, 0, 0, dw * q, dh * q);
  }

  function drawLights(g, sim, aim) {
    const lvl = sim.level;
    const h = lvl.hearth;
    additive(g, () => {
      // hearth fire
      if (has('hearth_dive_glow')) {
        place(g, 'hearth_dive', h.x, h.y + 8, { w: sim.hearthW + 12, h: 36, glow: true, alpha: 0.82 + Math.sin(t * 6) * 0.1 + endGlow * 0.08 });
      } else {
        glow(g, h.x, h.y + 2, sim.hearthW * 0.62 + Math.sin(t * 6) * 3, '#ff9d2e', 0.75 + endGlow * 0.25);
        glow(g, h.x, h.y - 2, sim.hearthW * 0.3, '#fff3c4', 0.7);
      }
      if (endGlow > 0) glow(g, h.x, h.y, 160 * endGlow + 60, '#ffcf5c', endGlow * 0.7);

      for (const e of sim.ents) {
        if (!e.alive) continue;
        if (e.kind === 'mote') {
          const by = e.y + Math.sin(t * 2.2 + e.id) * 1.4;
          glow(g, e.x, by, 9, '#7fe3d8', 0.9);
          glow(g, e.x, by, 3.4, '#ffffff', 1);
        } else if (e.kind === 'lantern' && sim.lit[e.li]) {
          const p = pulses.get('L' + Math.round(e.x) + '_' + Math.round(e.y)) || 0;
          if (has('lantern_on_glow')) place(g, 'lantern_on', e.x, e.y - 1, { glow: true, scale: 1 + p * 0.5, alpha: 0.7 + p * 0.3 + Math.sin(t * 3 + e.id) * 0.06 });
          else glow(g, e.x, e.y, 44 + p * 40 + Math.sin(t * 3 + e.id) * 3, '#ffcf5c', 0.6 + p * 0.4);
        } else if (e.kind === 'lantern') {
          glow(g, e.x, e.y, 16, '#8f88ff', 0.25 + Math.sin(t * 2 + e.id) * 0.1);
        } else if (e.kind === 'relic') {
          glow(g, e.x, e.y, 24 + Math.sin(t * 3) * 3, '#ffcf5c', 0.5);
        } else if (e.kind === 'bumper' && pulses.get(e.id)) {
          glow(g, e.x, e.y, e.r * 2.6, '#ff8fa3', pulses.get(e.id) * 0.8);
        } else if (e.kind === 'geyser' && e.hits < T.geyserCharges) {
          glow(g, e.x, e.y - 12, 26, '#cfe8ff', 0.3 + Math.sin(t * 4 + e.id) * 0.08);
        }
      }

      // aim guide
      if (aim && aim.pts) {
        const n = aim.pts.length;
        for (let i = 0; i < n; i++) {
          const p = aim.pts[i];
          const k = 1 - i / (n + 2);
          glow(g, p.x, p.y, 3.2 + k * 3.2, aim.mode === 'rekindle' ? '#ffffff' : colors[1], 0.35 + k * 0.6);
        }
      }

      // trail + spark
      for (let i = 0; i < trail.length; i++) {
        const k = (i + 1) / trail.length;
        glow(g, trail[i].x, trail[i].y, 4 + k * 11, colors[2], k * 0.5);
        glow(g, trail[i].x, trail[i].y, 2 + k * 5, colors[1], k * 0.7);
      }
      if (sim.phase !== 'done') {
        const s = sim.spark;
        const breathe = sim.phase === 'aim' ? 1 + Math.sin(t * 5) * 0.12 : 1;
        glow(g, s.x, s.y, 30 * breathe, colors[1], 0.9);
        glow(g, s.x, s.y, 13 * breathe, colors[0], 1);
        if (!has('spark')) {
          g.fillStyle = '#ffffff';
          star4(g, s.x, s.y, 9 * breathe, t * 2.5);
        }
      }
    });

    // finished art for the small bright things sits on top of their light
    if (has('mote')) {
      for (const e of sim.ents) {
        if (e.alive && e.kind === 'mote') place(g, 'mote', e.x, e.y + Math.sin(t * 2.2 + e.id) * 1.4, { quiet: true });
      }
    }
    if (sim.phase !== 'done') {
      place(g, 'spark', sim.spark.x, sim.spark.y, { scale: sim.phase === 'aim' ? 1 + Math.sin(t * 5) * 0.12 : 1 });
    }

    // rekindle ring while slowed
    if (aim && aim.mode === 'rekindle') {
      g.strokeStyle = 'rgba(255,255,255,.8)';
      g.lineWidth = 1.5;
      g.setLineDash([4, 5]);
      g.lineDashOffset = -t * 30;
      g.beginPath();
      g.arc(sim.spark.x, sim.spark.y, 22, 0, Math.PI * 2);
      g.stroke();
      g.setLineDash([]);
    }
  }

  function draw(ctx, W, H, px, sim, aim) {
    if (W !== geom.W || H !== geom.H) fit(W, H);
    const key = [W, H, px, sim.level.index, assetVersion()].join(',');
    if (key !== bgKey) {
      fit(W, H);
      buildBg(W, H, px, 100 + sim.level.index);
      bgKey = key;
    }
    ctx.drawImage(bg, 0, 0, W, H);

    // the hollow warms as it wakes
    if (awake > 0.01) additive(ctx, () => glow(ctx, W / 2, H * 0.55, H * 0.75, '#ff9d6b', awake * 0.3));

    const sx = shake && !reduced ? (Math.random() - 0.5) * shake * 7 : 0;
    const sy = shake && !reduced ? (Math.random() - 0.5) * shake * 7 : 0;
    ctx.save();
    ctx.translate(geom.x0 + sx, geom.y0 + sy);
    ctx.scale(geom.fs, geom.fs);
    drawSolids(ctx, sim);
    ctx.restore();

    drawDarkness(ctx, sim);

    ctx.save();
    ctx.translate(geom.x0 + sx, geom.y0 + sy);
    ctx.scale(geom.fs, geom.fs);
    // mist pooling at the bottom of the hollow
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = `rgba(190,170,245,${0.1 + i * 0.05})`;
      ctx.beginPath();
      ctx.moveTo(-40, 700);
      for (let x = -40; x <= 400; x += 20) ctx.lineTo(x, 622 + i * 7 + Math.sin(x * 0.03 + t * (0.6 + i * 0.25) + i) * 5);
      ctx.lineTo(400, 700);
      ctx.fill();
    }
    drawLights(ctx, sim, aim);
    fx.draw(ctx);
    pops.draw(ctx);
    ctx.restore();

    if (flash > 0) {
      ctx.fillStyle = `rgba(255,243,196,${flash * (reduced ? 0.15 : 0.5)})`;
      ctx.fillRect(0, 0, W, H);
    }
    if (aim && aim.mode === 'rekindle') {
      const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.7);
      v.addColorStop(0, 'rgba(20,10,60,0)');
      v.addColorStop(1, 'rgba(20,10,60,.55)');
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, W, H);
    }
  }

  return { begin, update, draw, onEvent, pop, toField, toScreen };
}

export { createDiveView };
