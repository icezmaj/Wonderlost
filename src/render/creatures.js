// Original procedural art for creatures and artifacts. Everything is drawn
// with canvas paths (no image assets), so the same functions serve the village,
// the dive field, reward cards and the Finds sheet at any size.

import { circle, ellipse, roundRect, star4 } from './gfx.js';
import { has, place } from './assets.js';

/**
 * Draw a creature centred on (x, y). `s` scales a ~24px-tall figure.
 * opts: { asleep, happy, flip }
 */
function drawCreature(ctx, id, x, y, s, t, opts = {}) {
  const blink = opts.asleep ? 0.12 : Math.sin(t * 0.9 + x) > 0.985 ? 0.15 : 1;
  // Finished art, if this creature has any: pick the pose, falling back to idle.
  const pose = opts.asleep ? 'asleep' : blink < 0.5 ? 'blink' : opts.happy ? 'happy' : 'idle';
  const file = has(`${id}_${pose}`) ? `${id}_${pose}` : `${id}_idle`;
  if (place(ctx, file, x, y, { scale: s, flip: opts.flip })) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(opts.flip ? -s : s, s);
  if (id === 'nimbit') nimbit(ctx, t, blink, opts);
  else if (id === 'sprigget') sprigget(ctx, t, blink, opts);
  else if (id === 'whistlewing') whistlewing(ctx, t, blink, opts);
  else if (id === 'tocklet') tocklet(ctx, t, blink, opts);
  else if (id === 'springle') springle(ctx, t, blink, opts);
  else if (id === 'hourmoth') hourmoth(ctx, t, blink, opts);
  ctx.restore();
}

function eyes(ctx, dx, y, r, blink, color = '#2a2150') {
  ctx.fillStyle = color;
  ellipse(ctx, -dx, y, r, r * blink);
  ellipse(ctx, dx, y, r, r * blink);
  if (blink > 0.5) {
    ctx.fillStyle = '#ffffff';
    circle(ctx, -dx + r * 0.35, y - r * 0.35, r * 0.32);
    circle(ctx, dx + r * 0.35, y - r * 0.35, r * 0.32);
  }
}

function cheeks(ctx, dx, y, r) {
  ctx.fillStyle = 'rgba(255,143,163,.6)';
  circle(ctx, -dx, y, r);
  circle(ctx, dx, y, r);
}

function smile(ctx, y, w, happy) {
  ctx.strokeStyle = '#2a2150';
  ctx.lineWidth = 0.9;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, y - (happy ? 0.6 : 0), w, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
}

// Nimbit: a shy cloud-puff with rosy cheeks and tiny feet.
function nimbit(ctx, t, blink, o) {
  const bob = Math.sin(t * 3.2) * 0.8;
  ctx.fillStyle = '#ffc9a8';
  ellipse(ctx, -4, 10.5 - bob * 0.3, 2.6, 1.7);
  ellipse(ctx, 4, 10.5 - bob * 0.3, 2.6, 1.7);
  const puffs = [[0, 1, 10], [-8, 3, 7], [8, 3, 7], [-4.5, -5.5, 7], [5, -5, 6.6]];
  ctx.fillStyle = '#c9cdf5';
  for (const [px, py, r] of puffs) circle(ctx, px, py + 1.6 + bob, r);
  ctx.fillStyle = '#ffffff';
  for (const [px, py, r] of puffs) circle(ctx, px, py + bob, r);
  eyes(ctx, 3.6, 0.5 + bob, 1.6, blink);
  cheeks(ctx, 6.6, 3.4 + bob, 2);
  smile(ctx, 2.6 + bob, 1.6, o.happy);
}

// Sprigget: a tea-leaf glider who thinks it is the gardener.
function sprigget(ctx, t, blink, o) {
  const sway = Math.sin(t * 2.4) * 0.08;
  ctx.rotate(sway);
  ctx.strokeStyle = '#3d8f5c';
  ctx.lineWidth = 1.4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-6, 4);
  ctx.lineTo(-10, 6 + Math.sin(t * 5) * 1.2);
  ctx.moveTo(6, 4);
  ctx.lineTo(10, 6 - Math.sin(t * 5) * 1.2);
  ctx.moveTo(-3, 10);
  ctx.lineTo(-3.5, 13);
  ctx.moveTo(3, 10);
  ctx.lineTo(3.5, 13);
  ctx.stroke();
  const g = ctx.createLinearGradient(-8, -12, 8, 12);
  g.addColorStop(0, '#a8ecb0');
  g.addColorStop(1, '#3fa66b');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, -13);
  ctx.bezierCurveTo(11, -5, 9, 9, 0, 11.5);
  ctx.bezierCurveTo(-9, 9, -11, -5, 0, -13);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.45)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(0, -11);
  ctx.lineTo(0, -4);
  ctx.stroke();
  // sprout
  ctx.fillStyle = '#c9f5b5';
  ctx.beginPath();
  ctx.ellipse(-2.8, -14.5, 3, 1.5, -0.6, 0, Math.PI * 2);
  ctx.ellipse(2.8, -14.5, 3, 1.5, 0.6, 0, Math.PI * 2);
  ctx.fill();
  eyes(ctx, 3.1, 1, 1.5, blink);
  cheeks(ctx, 5.2, 3.8, 1.6);
  smile(ctx, 3.2, 1.5, o.happy);
}

// Whistlewing: a kettle-owl with a spout for a beak.
function whistlewing(ctx, t, blink, o) {
  const flap = o.asleep ? 0.2 : Math.sin(t * 9) * 0.6;
  ctx.fillStyle = '#3d57c4';
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(side * 8.5, 0);
    ctx.rotate(side * (0.5 + flap));
    ellipse(ctx, side * 3, 1, 5.5, 3);
    ctx.restore();
  }
  // ear tufts
  ctx.fillStyle = '#4c6fe6';
  ctx.beginPath();
  ctx.moveTo(-7, -7);
  ctx.lineTo(-8.5, -13);
  ctx.lineTo(-3, -9.5);
  ctx.moveTo(7, -7);
  ctx.lineTo(8.5, -13);
  ctx.lineTo(3, -9.5);
  ctx.fill();
  const g = ctx.createRadialGradient(-3, -4, 1, 0, 0, 11);
  g.addColorStop(0, '#86a2ff');
  g.addColorStop(1, '#4460d6');
  ctx.fillStyle = g;
  circle(ctx, 0, 0, 10);
  ctx.fillStyle = '#f4ecd8';
  ellipse(ctx, 0, 4.5, 6, 5);
  // copper band, like a kettle's base
  ctx.strokeStyle = '#e59a4c';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.arc(0, 0, 9.3, 0.2 * Math.PI, 0.8 * Math.PI);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  circle(ctx, -3.8, -2.5, 3.6);
  circle(ctx, 3.8, -2.5, 3.6);
  eyes(ctx, 3.8, -2.3, 1.9, blink);
  // spout beak
  ctx.fillStyle = '#ffb347';
  ctx.beginPath();
  ctx.moveTo(-1.6, 0.6);
  ctx.quadraticCurveTo(0, 5.4, 2.6, 2.8);
  ctx.lineTo(1.6, 0.6);
  ctx.closePath();
  ctx.fill();
  if (!o.asleep) {
    const puff = (t * 0.8) % 1;
    ctx.fillStyle = `rgba(255,255,255,${0.55 * (1 - puff)})`;
    circle(ctx, 3 + puff * 5, 2.5 - puff * 7, 1.2 + puff * 2.2);
  }
}

// Tocklet: a wind-up mouse with a brass key in its back.
function tocklet(ctx, t, blink, o) {
  const bob = Math.sin(t * 3) * 0.6;
  const turn = o.asleep ? 0 : t * 2.4;
  // winding key
  ctx.save();
  ctx.translate(-8.5, -3 + bob);
  ctx.strokeStyle = '#a8742a';
  ctx.lineWidth = 1.6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-4, -2);
  ctx.stroke();
  ctx.fillStyle = '#f5b942';
  ellipse(ctx, -6, -3 + Math.sin(turn) * 0.4, 1.8, 3.6 * Math.abs(Math.cos(turn)) + 0.8);
  ctx.restore();
  // tail
  ctx.strokeStyle = '#f4a6b4';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(-7, 7 + bob);
  ctx.quadraticCurveTo(-14, 10, -12, 3 + Math.sin(t * 2) * 1.5);
  ctx.stroke();
  // feet
  ctx.fillStyle = '#f4a6b4';
  ellipse(ctx, -3.6, 10.4, 2.6, 1.5);
  ellipse(ctx, 4.4, 10.4, 2.6, 1.5);
  // ears
  ctx.fillStyle = '#c9b8a8';
  circle(ctx, -5.5, -7 + bob, 4.8);
  circle(ctx, 6, -7.5 + bob, 4.8);
  ctx.fillStyle = '#f4a6b4';
  circle(ctx, -5.5, -7 + bob, 2.8);
  circle(ctx, 6, -7.5 + bob, 2.8);
  // body
  ctx.fillStyle = '#c9b8a8';
  ellipse(ctx, 0, 3.4 + bob, 9.4, 8);
  ctx.fillStyle = '#efe4d6';
  ellipse(ctx, 0.4, 2 + bob, 8.8, 7.4);
  ctx.fillStyle = '#fff6e2';
  ellipse(ctx, 1.4, 5.4 + bob, 5, 4);
  // brass seam and rivet: it is clockwork, after all
  ctx.strokeStyle = 'rgba(168,116,42,.55)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.arc(0.4, 2 + bob, 8.2, 0.62 * Math.PI, 0.95 * Math.PI);
  ctx.stroke();
  eyes(ctx, 3.4, 0.6 + bob, 1.5, blink);
  cheeks(ctx, 6.2, 3.2 + bob, 1.8);
  ctx.fillStyle = '#c9647a';
  circle(ctx, 0.6, 2.6 + bob, 1);
  smile(ctx, 3.2 + bob, 1.4, o.happy);
}

// Springle: a coil-spring hopper. The spring squashes and stretches.
function springle(ctx, t, blink, o) {
  const sq = o.asleep ? 0 : Math.sin(t * 5.2);
  const h = 9 + sq * 2.4;
  ctx.strokeStyle = '#a8742a';
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const y = 10 - (i / 3.4) * h;
    ctx.strokeStyle = i % 2 ? '#e7ae4a' : '#a8742a';
    ctx.beginPath();
    ctx.ellipse(0, y, 6.4 - i * 0.5, 2, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  const hy = 10 - h - 6;
  ctx.fillStyle = '#5fb7a8';
  circle(ctx, 0, hy + 1, 7.4);
  ctx.fillStyle = '#8fdccd';
  circle(ctx, 0, hy, 7);
  ctx.fillStyle = '#d6f6ee';
  ellipse(ctx, -1.6, hy - 2.6, 3.6, 2.4);
  // antenna with a bead
  ctx.strokeStyle = '#a8742a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, hy - 6.6);
  ctx.quadraticCurveTo(2 + sq, hy - 11, 3 + sq * 1.4, hy - 12);
  ctx.stroke();
  ctx.fillStyle = '#f5b942';
  circle(ctx, 3 + sq * 1.4, hy - 12.6, 1.7);
  eyes(ctx, 2.9, hy + 0.2, 1.5, blink);
  cheeks(ctx, 5, hy + 2.6, 1.6);
  smile(ctx, hy + 2.4, 1.5, o.happy);
}

// Hourmoth: an hourglass moth with sand-coloured wings.
function hourmoth(ctx, t, blink, o) {
  const flap = o.asleep ? 0.25 : Math.sin(t * 9) * 0.5 + 0.5;
  const bob = Math.sin(t * 2.6) * 1.2;
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(side * 3.4, -1 + bob);
    ctx.scale(side * (0.5 + flap * 0.5), 1);
    ctx.fillStyle = '#e6c39c';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(7, -15, 13, -7);
    ctx.quadraticCurveTo(11, 1, 0, 2);
    ctx.fill();
    ctx.fillStyle = '#fbe9c6';
    ctx.beginPath();
    ctx.moveTo(0, 2);
    ctx.quadraticCurveTo(11, 4, 9, 11);
    ctx.quadraticCurveTo(3, 11, 0, 4);
    ctx.fill();
    ctx.fillStyle = '#f5b942';
    circle(ctx, 8.4, -6.4, 1.8);
    ctx.restore();
  }
  // hourglass body
  ctx.fillStyle = '#b9a6e0';
  ctx.beginPath();
  ctx.moveTo(-4.2, -8 + bob);
  ctx.lineTo(4.2, -8 + bob);
  ctx.lineTo(1.2, 1 + bob);
  ctx.lineTo(4.2, 10 + bob);
  ctx.lineTo(-4.2, 10 + bob);
  ctx.lineTo(-1.2, 1 + bob);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f5b942';
  ctx.beginPath();
  ctx.moveTo(-3, 9 + bob);
  ctx.lineTo(3, 9 + bob);
  ctx.lineTo(0.6, 4.4 + bob);
  ctx.lineTo(-0.6, 4.4 + bob);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#a8742a';
  roundRect(ctx, -5, -9.4 + bob, 10, 2.2, 1);
  ctx.fill();
  roundRect(ctx, -5, 9.4 + bob, 10, 2.2, 1);
  ctx.fill();
  // face on the top bulb
  ctx.fillStyle = '#d9cdf2';
  circle(ctx, 0, -11.6 + bob, 4.6);
  eyes(ctx, 1.9, -11.8 + bob, 1.2, blink);
  cheeks(ctx, 3.3, -10.2 + bob, 1.2);
}

/** "Zzz" above a sleeping creature. */
function drawZzz(ctx, x, y, t) {
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  ctx.textAlign = 'center';
  for (let i = 0; i < 2; i++) {
    const k = (t * 0.5 + i * 0.5) % 1;
    ctx.globalAlpha = 1 - k;
    ctx.font = `800 ${7 + k * 5}px Nunito, sans-serif`;
    ctx.fillText('z', x + 8 + k * 9, y - 10 - k * 14);
  }
  ctx.globalAlpha = 1;
}

/**
 * Draw an artifact icon in a ~30px box centred on (x, y).
 * `silhouette` draws the undiscovered version.
 */
function drawArtifact(ctx, id, x, y, s, silhouette = false) {
  if (place(ctx, 'art_' + id, x, y, { scale: s, silhouette: silhouette ? '#0c3540' : null })) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  const c = (color) => (silhouette ? '#0c3540' : color);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (id === 'spoon') {
    ctx.rotate(-0.6);
    ctx.strokeStyle = c('#e9a93a');
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -2);
    ctx.lineTo(0, 13);
    ctx.stroke();
    ctx.fillStyle = c('#ffd76e');
    ellipse(ctx, 0, -8, 5.5, 7.5);
    ctx.fillStyle = c('#fff3c4');
    ellipse(ctx, -1.4, -9.5, 2, 3.4);
  } else if (id === 'sugarstar') {
    ctx.rotate(0.2);
    ctx.fillStyle = c('#dfe6ff');
    roundRect(ctx, -9, -8, 18, 18, 4);
    ctx.fill();
    ctx.fillStyle = c('#ffffff');
    roundRect(ctx, -9, -10, 18, 15, 4);
    ctx.fill();
    ctx.fillStyle = c('#ffcf5c');
    star4(ctx, 0, -2.5, 6.5, 0);
  } else if (id === 'spool') {
    ctx.fillStyle = c('#7fe3d8');
    roundRect(ctx, -7, -8, 14, 16, 3);
    ctx.fill();
    ctx.strokeStyle = c('#4fbfb2');
    ctx.lineWidth = 1;
    for (let i = -5; i <= 5; i += 3.3) {
      ctx.beginPath();
      ctx.moveTo(-7, i);
      ctx.lineTo(7, i + 1.5);
      ctx.stroke();
    }
    ctx.fillStyle = c('#c98a4b');
    roundRect(ctx, -10, -12, 20, 4.5, 2);
    ctx.fill();
    roundRect(ctx, -10, 7.5, 20, 4.5, 2);
    ctx.fill();
  } else if (id === 'bell') {
    ctx.fillStyle = c('#ffcf5c');
    circle(ctx, 0, 10, 2.6);
    ctx.fillStyle = c('#ffffff');
    ctx.beginPath();
    ctx.moveTo(-10, 8);
    ctx.quadraticCurveTo(-8, -11, 0, -11);
    ctx.quadraticCurveTo(8, -11, 10, 8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = c('#4c6fff');
    roundRect(ctx, -10.5, 3, 21, 3.4, 1.5);
    ctx.fill();
    ctx.fillStyle = c('#dfe6ff');
    circle(ctx, 0, -12, 2.4);
  } else if (id === 'compass') {
    ctx.fillStyle = c('#ffffff');
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ellipse(ctx, Math.cos(a) * 8.5, Math.sin(a) * 8.5, 3.6, 3.6);
    }
    ctx.fillStyle = c('#ffcf5c');
    circle(ctx, 0, 0, 7);
    ctx.fillStyle = c('#ff6b81');
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(2, 0);
    ctx.lineTo(-2, 0);
    ctx.fill();
    ctx.fillStyle = c('#4c6fff');
    ctx.beginPath();
    ctx.moveTo(0, 6);
    ctx.lineTo(2, 0);
    ctx.lineTo(-2, 0);
    ctx.fill();
  } else if (id === 'whistle') {
    ctx.rotate(-0.35);
    ctx.fillStyle = c('#e9a93a');
    roundRect(ctx, -11, -3, 19, 9, 4);
    ctx.fill();
    ctx.fillStyle = c('#ffd76e');
    roundRect(ctx, -11, -3, 19, 4, 3);
    ctx.fill();
    ctx.fillStyle = c('#c98a4b');
    roundRect(ctx, 6, -5, 5, 13, 2);
    ctx.fill();
    ctx.fillStyle = c('#ffffff');
    circle(ctx, -3, -8, 3);
    circle(ctx, 1.5, -11, 2.2);
  } else if (id === 'windkey') {
    ctx.rotate(0.5);
    ctx.strokeStyle = c('#e7ae4a');
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -3);
    ctx.lineTo(0, 12);
    ctx.moveTo(0, 8);
    ctx.lineTo(4, 8);
    ctx.moveTo(0, 12);
    ctx.lineTo(5, 12);
    ctx.stroke();
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.arc(-4.4, -8, 4, 0, Math.PI * 2);
    ctx.arc(4.4, -8, 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = c('#fff3c4');
    circle(ctx, 0, -3, 1.6);
  } else if (id === 'escapement') {
    ctx.fillStyle = c('#e7ae4a');
    ctx.beginPath();
    for (let i = 0; i < 20; i++) {
      const rr = i % 2 ? 11 : 7.6;
      const a = (i / 20) * Math.PI * 2;
      ctx.lineTo(Math.cos(a) * rr, 2 + Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = c('#a8742a');
    circle(ctx, 0, 2, 3);
    ctx.strokeStyle = c('#f08a8a');
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-8, -9);
    ctx.lineTo(0, -13);
    ctx.lineTo(8, -9);
    ctx.stroke();
  } else if (id === 'hairspring') {
    ctx.strokeStyle = c('#cfd8ea');
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    for (let i = 0; i <= 90; i++) {
      const a = (i / 90) * Math.PI * 7;
      const rr = 1.5 + (i / 90) * 11;
      const px = Math.cos(a) * rr;
      const py = Math.sin(a) * rr;
      if (i) ctx.lineTo(px, py);
      else ctx.moveTo(px, py);
    }
    ctx.stroke();
    ctx.fillStyle = c('#f5b942');
    circle(ctx, 0, 0, 2.2);
  } else if (id === 'moondial') {
    ctx.fillStyle = c('#a8742a');
    circle(ctx, 0, 0, 12.5);
    ctx.fillStyle = c('#2b3a78');
    circle(ctx, 0, 0, 10.4);
    ctx.fillStyle = c('#fff3c4');
    circle(ctx, -1, 0, 6.4);
    ctx.fillStyle = c('#2b3a78');
    circle(ctx, 2.6, -1.4, 5.6);
    ctx.fillStyle = c('#ffe08a');
    circle(ctx, 6, 5.4, 1);
    circle(ctx, -6.4, -6, 0.9);
  } else if (id === 'chime') {
    ctx.strokeStyle = c('#a8742a');
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-9, -11);
    ctx.lineTo(9, -11);
    ctx.stroke();
    [[-6, 10], [0, 14], [6, 8]].forEach(([x, len], k) => {
      ctx.fillStyle = c(['#f8d789', '#e7ae4a', '#f8d789'][k]);
      roundRect(ctx, x - 2.2, -10, 4.4, len + 8, 2.2);
      ctx.fill();
    });
    ctx.fillStyle = c('#f08a8a');
    circle(ctx, 0, -12.6, 2);
  } else if (id === 'lens') {
    ctx.strokeStyle = c('#a8742a');
    ctx.lineWidth = 3.4;
    ctx.beginPath();
    ctx.moveTo(5, 5);
    ctx.lineTo(12, 12);
    ctx.stroke();
    ctx.fillStyle = c('#bfe9f2');
    circle(ctx, -2, -2, 9);
    ctx.strokeStyle = c('#e7ae4a');
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.arc(-2, -2, 9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = c('#ffffff');
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(-2, -2, 5.6, 1.1 * Math.PI, 1.5 * Math.PI);
    ctx.stroke();
  }
  ctx.restore();
}

/** Render a creature into a standalone canvas (for DOM cards). */
function creaturePortrait(id, size = 72, asleep = false) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const c = document.createElement('canvas');
  c.width = c.height = size * dpr;
  c.style.width = c.style.height = size + 'px';
  const ctx = c.getContext('2d');
  ctx.scale(dpr, dpr);
  drawCreature(ctx, id, size / 2, size / 2 + 2, size / 32, 0.4, { asleep, happy: true });
  return c;
}

/** Render an artifact into a standalone canvas (for DOM cards). */
function artifactPortrait(id, size = 56, silhouette = false) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const c = document.createElement('canvas');
  c.width = c.height = size * dpr;
  c.style.width = c.style.height = size + 'px';
  const ctx = c.getContext('2d');
  ctx.scale(dpr, dpr);
  drawArtifact(ctx, id, size / 2, size / 2, size / 34, silhouette);
  return c;
}

export { drawCreature, drawZzz, drawArtifact, creaturePortrait, artifactPortrait };
