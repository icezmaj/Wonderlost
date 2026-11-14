// Tocktown's home scene: a clockwork town rising from a stopped pocket watch.
// Everything here is drawn in code. worldView.js owns the sky, the table, the
// creatures and the frame; this file only knows what Tocktown looks like at
// each restoration level.
//
// Coordinates are the same 360 x 480 diorama box Mistlewick uses.

import { glow, additive, ellipse, circle, roundRect, star4 } from './gfx.js';
import { upgradeLevel, restoration } from '../progression/state.js';
import { mixHex } from '../core/util.js';

/** Where each upgrade lives, for build celebrations. */
const TOCK_ANCHOR = {
  mainspring: [184, 398],
  clocktower: [180, 90],
  gearworks: [290, 198],
  lamprow: [180, 222],
  pendulum: [180, 262],
  market: [76, 204]
};

const WATCH = { x: 184, y: 398, r: 62 };
// brass cog platforms the town stands on: x, y of the top face, width
const PLAT = {
  clocktower: [180, 152, 92],
  market: [76, 228, 118],
  gearworks: [288, 224, 112],
  pendulum: [180, 300, 122]
};
const GEARS = [
  [308, 204, 14, 1],
  [323, 184, 9, -1],
  [268, 184, 8, -1]
];
const STRINGS = [
  [[112, 176], [154, 138]],
  [[206, 138], [262, 184]],
  [[122, 216], [150, 232]],
  [[210, 232], [246, 214]]
];
const LAMP_COLORS = ['#ffcf5c', '#ffe9a8', '#ffb86b'];
const CRACKS = [
  [[150, 372], [166, 384], [160, 398], [174, 410]],
  [[214, 366], [204, 380], [216, 392]],
  [[196, 424], [208, 436], [202, 448]]
];

const ASLEEP = { hi: '#b9b4d2', mid: '#8f8aae', dk: '#676287' };
const BRASS = { hi: '#f8d789', mid: '#e7ae4a', dk: '#a8742a' };
const tone = (on) => (on ? BRASS : ASLEEP);

// Each building is authored small, then enlarged about the middle of its
// platform so it reads at phone size: [x, y, scale].
const GROW = {
  clocktower: [180, 152, 1.16],
  market: [76, 228, 1.42],
  gearworks: [288, 224, 1.36],
  pendulum: [180, 300, 1.12]
};
function within(g, id, fn) {
  const [x, y, k] = GROW[id];
  g.save();
  g.translate(x, y);
  g.scale(k, k);
  g.translate(-x, -y);
  fn();
  g.restore();
}
const grown = (id, x, y) => [GROW[id][0] + (x - GROW[id][0]) * GROW[id][2], GROW[id][1] + (y - GROW[id][1]) * GROW[id][2]];

/** A toothed wheel. `a` is its rotation. */
function gear(g, x, y, r, a, fill, hub) {
  const teeth = Math.max(6, Math.round(r * 0.8));
  g.fillStyle = fill;
  g.beginPath();
  for (let i = 0; i < teeth * 2; i++) {
    const rr = i % 2 ? r : r * 0.76;
    const a0 = a + (i / (teeth * 2)) * Math.PI * 2;
    const a1 = a + ((i + 0.72) / (teeth * 2)) * Math.PI * 2;
    g.lineTo(x + Math.cos(a0) * rr, y + Math.sin(a0) * rr);
    g.lineTo(x + Math.cos(a1) * rr, y + Math.sin(a1) * rr);
  }
  g.closePath();
  g.fill();
  g.fillStyle = hub;
  circle(g, x, y, r * 0.34);
}

/** A cog seen from above and a little in front: the islands of Tocktown. */
function platform(g, id, on) {
  const [x, y, w] = PLAT[id];
  const c = tone(on);
  const rx = w / 2;
  const ry = w * 0.16;
  g.save();
  if (!on) g.globalAlpha = 0.5;
  g.fillStyle = c.dk;
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    circle(g, x + Math.cos(a) * rx, y + 6 + Math.sin(a) * ry, 4.6);
  }
  ellipse(g, x, y + 7, rx, ry);
  g.fillStyle = c.mid;
  ellipse(g, x, y, rx, ry);
  g.fillStyle = c.hi;
  ellipse(g, x - rx * 0.06, y - ry * 0.14, rx * 0.84, ry * 0.74);
  g.restore();
}

function ghost(g, on, fn) {
  g.save();
  if (!on) g.globalAlpha = 0.24;
  fn(!on);
  g.restore();
}

// ------------------------------------------------------------ the watch

/** The pocket watch itself (static parts). Level = Mainspring. */
function drawWatch(g, st) {
  const lv = upgradeLevel(st, 'mainspring');
  const q = Math.min(1, (lv / 3) * 0.8 + restoration(st) * 0.2);
  const { x, y, r } = WATCH;
  const caseMid = mixHex('#8c88a8', '#e7ae4a', q);
  const caseDk = mixHex('#5f5a7c', '#a8742a', q);
  const caseHi = mixHex('#b9b4d2', '#f8d789', q);

  // contact shadow on the table
  g.save();
  g.translate(x, y + r + 4);
  g.scale(1, 0.13);
  glow(g, 0, 0, 150, '#03171c', 0.9);
  glow(g, 0, 0, 96, '#03171c', 0.8);
  g.restore();

  // bow and crown
  g.strokeStyle = caseDk;
  g.lineWidth = 5.5;
  g.beginPath();
  g.arc(x, y - r - 17, 9, 0, Math.PI * 2);
  g.stroke();
  g.strokeStyle = caseHi;
  g.lineWidth = 2.2;
  g.beginPath();
  g.arc(x, y - r - 17, 9, 1.05 * Math.PI, 1.75 * Math.PI);
  g.stroke();
  g.fillStyle = caseDk;
  roundRect(g, x - 8, y - r - 11, 16, 10, 3);
  g.fill();
  g.fillStyle = caseMid;
  roundRect(g, x - 8, y - r - 11, 11, 10, 3);
  g.fill();

  // case
  const body = g.createRadialGradient(x - r * 0.4, y - r * 0.5, 4, x, y, r + 9);
  body.addColorStop(0, caseHi);
  body.addColorStop(0.6, caseMid);
  body.addColorStop(1, caseDk);
  g.fillStyle = body;
  circle(g, x, y, r + 8);
  g.fillStyle = caseDk;
  circle(g, x, y, r + 1.5);

  // face
  const face = g.createRadialGradient(x - 14, y - 18, 4, x, y, r);
  face.addColorStop(0, mixHex('#cfcbe0', '#fffaf0', q));
  face.addColorStop(1, mixHex('#a09bbd', '#f6e3b4', q));
  g.fillStyle = face;
  circle(g, x, y, r);

  // the mainspring, coiled behind the dial
  g.strokeStyle = mixHex('#8f8aae', '#f5b942', q);
  g.globalAlpha = 0.3 + q * 0.3;
  g.lineWidth = 1.6;
  g.beginPath();
  for (let i = 0; i <= 120; i++) {
    const a = (i / 120) * Math.PI * 6;
    const rr = 6 + (i / 120) * (r * 0.56);
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr;
    if (i) g.lineTo(px, py);
    else g.moveTo(px, py);
  }
  g.stroke();
  g.globalAlpha = 1;

  // hours
  g.strokeStyle = mixHex('#5f5a7c', '#7a2f3f', q);
  g.lineCap = 'round';
  for (let h = 0; h < 12; h++) {
    const a = (h / 12) * Math.PI * 2;
    const big = h % 3 === 0;
    g.lineWidth = big ? 2.6 : 1.4;
    g.beginPath();
    g.moveTo(x + Math.cos(a) * (r - (big ? 11 : 8)), y + Math.sin(a) * (r - (big ? 11 : 8)));
    g.lineTo(x + Math.cos(a) * (r - 4), y + Math.sin(a) * (r - 4));
    g.stroke();
  }

  // cracks in the glass: dark until mended, then gold
  g.lineJoin = 'round';
  CRACKS.forEach((pts, i) => {
    const mended = lv > i;
    g.strokeStyle = mended ? '#f5b942' : '#3a3458';
    g.lineWidth = mended ? 2.6 : 1.8;
    g.beginPath();
    pts.forEach(([px, py], k) => (k ? g.lineTo(px, py) : g.moveTo(px, py)));
    g.stroke();
    if (mended) {
      g.strokeStyle = 'rgba(255,255,255,.7)';
      g.lineWidth = 0.8;
      g.stroke();
    }
  });

  // stopped at one minute to midnight until the spring is wound
  if (lv === 0) hands(g, x, y, r, 11, 59, null, '#4a4468');

  // glass highlight
  g.strokeStyle = 'rgba(255,255,255,.5)';
  g.lineWidth = 2.4;
  g.beginPath();
  g.arc(x, y, r - 6, 1.1 * Math.PI, 1.42 * Math.PI);
  g.stroke();
  g.strokeStyle = caseHi;
  g.lineWidth = 1.6;
  g.beginPath();
  g.arc(x, y, r + 6.5, 1.05 * Math.PI, 1.6 * Math.PI);
  g.stroke();
}

function hands(g, x, y, r, hour, minute, second, color) {
  const ma = (minute / 60) * Math.PI * 2 - Math.PI / 2;
  const ha = (((hour % 12) + minute / 60) / 12) * Math.PI * 2 - Math.PI / 2;
  g.lineCap = 'round';
  g.strokeStyle = color;
  g.lineWidth = Math.max(1.2, r * 0.06);
  g.beginPath();
  g.moveTo(x, y);
  g.lineTo(x + Math.cos(ha) * r * 0.46, y + Math.sin(ha) * r * 0.46);
  g.stroke();
  g.lineWidth = Math.max(1, r * 0.042);
  g.beginPath();
  g.moveTo(x, y);
  g.lineTo(x + Math.cos(ma) * r * 0.72, y + Math.sin(ma) * r * 0.72);
  g.stroke();
  if (second !== null) {
    const sa = (second / 60) * Math.PI * 2 - Math.PI / 2;
    g.strokeStyle = '#f08a8a';
    g.lineWidth = Math.max(0.7, r * 0.02);
    g.beginPath();
    g.moveTo(x - Math.cos(sa) * r * 0.12, y - Math.sin(sa) * r * 0.12);
    g.lineTo(x + Math.cos(sa) * r * 0.78, y + Math.sin(sa) * r * 0.78);
    g.stroke();
  }
  g.fillStyle = color;
  circle(g, x, y, Math.max(1.4, r * 0.06));
}

/** Per-frame parts of the watch: light, and hands that move once it is wound. */
function drawWatchLive(ctx, st, t, p) {
  const lv = upgradeLevel(st, 'mainspring');
  const { x, y, r } = WATCH;
  additive(ctx, () => {
    // warm light rising from the watch to the town it holds up
    const lift = 0.08 + p * 0.15 + Math.sin(t * 1.3) * 0.02;
    for (let i = 0; i < 6; i++) glow(ctx, x, y - r - i * 22, 44 + i * 9, '#ffd68c', lift * (1 - i / 6.5));
    glow(ctx, x, y, r * (0.9 + Math.sin(t * 2) * 0.04), '#ffcf5c', 0.1 + lv * 0.07 + p * 0.1);
    // gold seams shimmer
    for (let i = 0; i < lv; i++) {
      const pts = CRACKS[i];
      const u = (((t * 0.35 + i * 0.3) % 1) + 1) % 1;
      const seg = Math.max(0, Math.min(pts.length - 2, Math.floor(u * (pts.length - 1))));
      const f = u * (pts.length - 1) - seg;
      glow(ctx, pts[seg][0] + (pts[seg + 1][0] - pts[seg][0]) * f, pts[seg][1] + (pts[seg + 1][1] - pts[seg][1]) * f, 10, '#ffe08a', 0.7);
    }
  });
  if (lv >= 1) {
    // wound: it tells the real time, and from the last level the second hand ticks
    const now = new Date();
    hands(ctx, x, y, r, now.getHours(), now.getMinutes() + now.getSeconds() / 60, lv >= 3 ? now.getSeconds() : null, '#5a2a3a');
  }
}

// ------------------------------------------------------------ the town

/** Static parts of the town. Returns the lamp positions that glow each frame. */
function drawTown(g, st) {
  const L = (id) => upgradeLevel(st, id);
  const lamps = [];
  g.lineCap = 'round';
  g.lineJoin = 'round';

  platform(g, 'clocktower', L('clocktower') > 0);
  platform(g, 'market', L('market') > 0);
  platform(g, 'gearworks', L('gearworks') > 0);
  platform(g, 'pendulum', true);

  // --- Lamplighter's Row: strings of lamps from platform to platform ---
  const nStrings = [0, 1, 2, 4][L('lamprow')];
  STRINGS.forEach(([a, b], si) => {
    const on = si < nStrings;
    if (!on && si > 1) return;
    g.save();
    if (!on) g.globalAlpha = 0.18;
    const mx = (a[0] + b[0]) / 2;
    const my = (a[1] + b[1]) / 2 + 15;
    g.strokeStyle = on ? '#c9a05a' : '#9d98d6';
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
      g.fillStyle = on ? '#a8742a' : '#9d98d6';
      roundRect(g, x - 2.4, y, 4.8, 3, 1);
      g.fill();
      g.fillStyle = on ? col : '#9d98d6';
      circle(g, x, y + 6.4, 4);
      if (on) lamps.push([x, y + 6.4, col]);
    }
    g.restore();
  });

  // --- Midnight Tower ---
  const tw = L('clocktower');
  within(g, 'clocktower', () => ghost(g, tw > 0, (gh) => {
    const wall = gh ? '#9d98d6' : '#fbe9c6';
    const side = gh ? '#8d88c6' : '#e6c39c';
    g.fillStyle = side;
    g.beginPath();
    g.moveTo(162, 153);
    g.lineTo(169, 86);
    g.lineTo(191, 86);
    g.lineTo(198, 153);
    g.closePath();
    g.fill();
    g.fillStyle = wall;
    g.beginPath();
    g.moveTo(162, 153);
    g.lineTo(169, 86);
    g.lineTo(184, 86);
    g.lineTo(186, 153);
    g.closePath();
    g.fill();
    // clock housing
    g.fillStyle = gh ? '#9d98d6' : '#a8742a';
    circle(g, 180, 76, 17);
    g.fillStyle = gh ? '#aaa6dc' : '#e7ae4a';
    circle(g, 180, 75, 15.5);
    g.fillStyle = gh ? '#b6b2e2' : '#fff6e2';
    circle(g, 180, 75, 11.5);
    if (gh) return;
    g.fillStyle = '#7a2f3f';
    for (let h = 0; h < 12; h += 3) {
      const a = (h / 12) * Math.PI * 2;
      circle(g, 180 + Math.cos(a) * 9, 75 + Math.sin(a) * 9, 1);
    }
    // door
    g.fillStyle = '#7a2f3f';
    g.beginPath();
    g.moveTo(174, 153);
    g.lineTo(174, 140);
    g.arc(180, 140, 6, Math.PI, 0);
    g.lineTo(186, 153);
    g.fill();
    if (tw >= 2) {
      // pointed roof and lit windows
      g.fillStyle = '#c9647a';
      g.beginPath();
      g.moveTo(160, 62);
      g.quadraticCurveTo(178, 56, 180, 30);
      g.quadraticCurveTo(182, 56, 200, 62);
      g.closePath();
      g.fill();
      g.fillStyle = '#f4a6b4';
      g.beginPath();
      g.moveTo(160, 62);
      g.quadraticCurveTo(176, 56, 180, 30);
      g.lineTo(180, 62);
      g.closePath();
      g.fill();
      g.fillStyle = '#ffe08a';
      roundRect(g, 175, 104, 5, 8, 2);
      g.fill();
      roundRect(g, 181, 120, 5, 8, 2);
      g.fill();
    } else {
      g.fillStyle = '#c9647a';
      roundRect(g, 164, 56, 32, 6, 3);
      g.fill();
    }
    if (tw >= 3) {
      g.fillStyle = '#ffcf5c';
      star4(g, 180, 24, 6, 0);
      g.fillStyle = '#a8742a';
      roundRect(g, 158, 126, 4, 6, 1.5);
      g.fill();
      roundRect(g, 198, 126, 4, 6, 1.5);
      g.fill();
    }
  }));

  // --- Gearworks (the wheels themselves turn, so they are drawn each frame) ---
  const gw = L('gearworks');
  within(g, 'gearworks', () => ghost(g, gw > 0, (gh) => {
    g.fillStyle = gh ? '#8d88c6' : '#e6c39c';
    roundRect(g, 262, 196, 38, 30, 5);
    g.fill();
    g.fillStyle = gh ? '#9d98d6' : '#fbe9c6';
    roundRect(g, 262, 196, 27, 30, 5);
    g.fill();
    g.fillStyle = gh ? '#9d98d6' : '#a8742a';
    g.beginPath();
    g.moveTo(256, 199);
    g.lineTo(272, 180);
    g.lineTo(306, 199);
    g.closePath();
    g.fill();
    if (gh) {
      gear(g, GEARS[0][0], GEARS[0][1], GEARS[0][2], 0.3, '#9d98d6', '#8d88c6');
      return;
    }
    g.fillStyle = '#e7ae4a';
    g.beginPath();
    g.moveTo(256, 199);
    g.lineTo(272, 180);
    g.lineTo(284, 199);
    g.closePath();
    g.fill();
    g.fillStyle = '#7a2f3f';
    roundRect(g, 270, 208, 10, 18, 4);
    g.fill();
    if (gw >= 2) {
      g.fillStyle = '#ffe08a';
      circle(g, 290, 208, 3.4);
    }
    if (gw >= 3) {
      g.fillStyle = '#a8742a';
      roundRect(g, 292, 174, 7, 18, 2);
      g.fill();
      g.fillStyle = '#e7ae4a';
      roundRect(g, 290, 172, 11, 4, 2);
      g.fill();
    }
  }));

  // --- Tick-Tock Market: one more stall per level ---
  const mk = L('market');
  const stalls = [[50, 228], [78, 226], [104, 229]];
  stalls.forEach(([sx, sy], i) => {
    const on = i < mk;
    if (!on && i > 0) return;
    within(g, 'market', () => ghost(g, on, (gh) => {
      g.strokeStyle = gh ? '#9d98d6' : '#a8742a';
      g.lineWidth = 1.6;
      g.beginPath();
      g.moveTo(sx - 9, sy);
      g.lineTo(sx - 9, sy - 20);
      g.moveTo(sx + 9, sy);
      g.lineTo(sx + 9, sy - 20);
      g.stroke();
      g.fillStyle = gh ? '#9d98d6' : '#fbe9c6';
      roundRect(g, sx - 11, sy - 9, 22, 9, 2.5);
      g.fill();
      // striped awning
      const cols = gh ? ['#9d98d6', '#aaa6dc'] : [['#f08a8a', '#fff4dc'], ['#7fd0c4', '#fff4dc'], ['#f5b942', '#fff4dc']][i];
      for (let k = 0; k < 4; k++) {
        g.fillStyle = cols[k % 2];
        g.beginPath();
        g.moveTo(sx - 13 + k * 6.5, sy - 18);
        g.lineTo(sx - 13 + (k + 1) * 6.5, sy - 18);
        g.lineTo(sx - 11 + (k + 1) * 5.5, sy - 26);
        g.lineTo(sx - 11 + k * 5.5, sy - 26);
        g.closePath();
        g.fill();
        circle(g, sx - 13 + k * 6.5 + 3.25, sy - 18, 3.25);
      }
      if (gh) return;
      // wares: tiny clocks sold by the second
      g.fillStyle = '#e7ae4a';
      circle(g, sx - 5, sy - 11, 2.4);
      g.fillStyle = '#f08a8a';
      circle(g, sx + 1, sy - 11.5, 2.1);
      g.fillStyle = '#7fd0c4';
      circle(g, sx + 6, sy - 11, 2.2);
    }));
  });
  if (mk >= 3) within(g, 'market', () => {
    g.strokeStyle = '#c9a05a';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(38, 196);
    g.quadraticCurveTo(78, 208, 116, 197);
    g.stroke();
    for (let k = 0; k < 6; k++) {
      const u = (k + 0.5) / 6;
      const x = (1 - u) * (1 - u) * 38 + 2 * (1 - u) * u * 78 + u * u * 116;
      const y = (1 - u) * (1 - u) * 196 + 2 * (1 - u) * u * 208 + u * u * 197;
      g.fillStyle = ['#f08a8a', '#ffcf5c', '#7fd0c4'][k % 3];
      g.beginPath();
      g.moveTo(x - 3, y);
      g.lineTo(x + 3, y);
      g.lineTo(x, y + 5.5);
      g.closePath();
      g.fill();
    }
  });

  // --- Pendulum Hall (the pendulum itself swings, so it is drawn each frame) ---
  const ph = L('pendulum');
  const on = ph > 0;
  within(g, 'pendulum', () => {
  g.fillStyle = on ? '#e6c39c' : '#7a74a6';
  roundRect(g, 152, 250, 9, 52, 3);
  g.fill();
  roundRect(g, 199, 250, 9, 52, 3);
  g.fill();
  g.fillStyle = on ? '#fbe9c6' : '#8c86b6';
  roundRect(g, 152, 250, 6, 52, 3);
  g.fill();
  roundRect(g, 199, 250, 6, 52, 3);
  g.fill();
  g.fillStyle = on ? '#c9647a' : '#6b6596';
  g.beginPath();
  g.moveTo(142, 254);
  g.quadraticCurveTo(180, 208, 218, 254);
  g.closePath();
  g.fill();
  g.fillStyle = on ? '#f4a6b4' : '#7a74a6';
  g.beginPath();
  g.moveTo(142, 254);
  g.quadraticCurveTo(170, 216, 180, 231);
  g.lineTo(180, 254);
  g.closePath();
  g.fill();
  g.fillStyle = on ? '#a8742a' : '#57527f';
  roundRect(g, 146, 296, 68, 6, 3);
  g.fill();
  if (ph >= 2) {
    g.fillStyle = '#a8742a';
    roundRect(g, 144, 262, 5, 3, 1);
    g.fill();
    roundRect(g, 211, 262, 5, 3, 1);
    g.fill();
    g.fillStyle = '#ffe08a';
    circle(g, 146.5, 268, 3.4);
    circle(g, 213.5, 268, 3.4);
    lamps.push([...grown('pendulum', 146.5, 268), '#ffe08a'], [...grown('pendulum', 213.5, 268), '#ffe08a']);
  }
  if (ph >= 3) {
    g.strokeStyle = '#f5b942';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(144, 254);
    g.quadraticCurveTo(180, 211, 216, 254);
    g.stroke();
    g.fillStyle = '#ffcf5c';
    star4(g, 180, 222, 6, 0);
  }
  if (!on) {
    // hanging dead still
    g.strokeStyle = '#57527f';
    g.lineWidth = 1.6;
    g.beginPath();
    g.moveTo(180, 250);
    g.lineTo(180, 284);
    g.stroke();
    g.fillStyle = '#6b6596';
    circle(g, 180, 287, 5.5);
  }
  });
  return lamps;
}

/** Per-frame parts of the town: turning wheels, swinging pendulum, moving hands, light. */
function drawTownLive(ctx, st, t, lamps) {
  const L = (id) => upgradeLevel(st, id);

  // gears turn, faster the more the works are oiled
  const gw = L('gearworks');
  within(ctx, 'gearworks', () => {
    for (let i = 0; i < gw; i++) {
      const [x, y, r, dir] = GEARS[i];
      gear(ctx, x, y, r, t * (0.5 + gw * 0.22) * dir * (14 / r), i === 0 ? '#e7ae4a' : '#f8d789', '#a8742a');
    }
  });

  // the tower clock keeps the real time once it is running
  const tw = L('clocktower');
  within(ctx, 'clocktower', () => {
    if (tw >= 1) {
      const now = new Date();
      hands(ctx, 180, 75, 11.5, now.getHours(), now.getMinutes(), null, '#5a2a3a');
    } else {
      ctx.globalAlpha = 0.24;
      hands(ctx, 180, 75, 11.5, 11, 59, null, '#4a4468');
    }
  });

  // the pendulum swings wider as the hall is restored
  const ph = L('pendulum');
  if (ph >= 1) within(ctx, 'pendulum', () => {
    const a = Math.sin(t * 2.3) * (0.22 + ph * 0.1);
    const bx = 180 + Math.sin(a) * 36;
    const by = 250 + Math.cos(a) * 36;
    ctx.strokeStyle = '#a8742a';
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(180, 250);
    ctx.lineTo(bx, by);
    ctx.stroke();
    ctx.fillStyle = '#f5b942';
    circle(ctx, bx, by, 6);
    ctx.fillStyle = '#fff3c4';
    circle(ctx, bx - 1.6, by - 1.8, 2);
  });

  additive(ctx, () => {
    for (let i = 0; i < lamps.length; i++) {
      const [x, y, col] = lamps[i];
      glow(ctx, x, y, 11 + Math.sin(t * 3 + i * 1.7) * 1.6, col, 0.8);
    }
    const at = (id, x, y, r, col, a) => glow(ctx, ...grown(id, x, y), r * GROW[id][2], col, a);
    if (tw >= 2) at('clocktower', 180, 75, 20 + Math.sin(t * 2.2) * 2, '#ffe08a', 0.4);
    if (tw >= 3) at('clocktower', 180, 24, 13, '#ffcf5c', 0.7);
    if (ph >= 1) at('pendulum', 180, 286, 16 + ph * 5 + Math.sin(t * 4.6) * 2, '#ffb347', 0.5);
    if (gw >= 2) at('gearworks', 290, 208, 9, '#ffe08a', 0.7);
    const mk = L('market');
    for (let i = 0; i < mk; i++) at('market', [50, 78, 104][i], 216, 12, '#ffd98a', 0.35);
  });
}

export { TOCK_ANCHOR, drawWatch, drawWatchLive, drawTown, drawTownLive, gear };
