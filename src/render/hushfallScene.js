// Hushfall's home scene: a winter city inside a snow globe, waiting for its
// first snowfall. Unlike the other worlds, everything lives INSIDE the object:
// the city is drawn within the glass, and the glass is drawn over it.
// Snow only begins to fall as the city is restored.
//
// Everything here is drawn in code, in the same 360 x 480 box as the others.

import { glow, additive, ellipse, circle, roundRect, star4 } from './gfx.js';
import { upgradeLevel, restoration, setDone } from '../progression/state.js';
import { mixHex } from '../core/util.js';

const HUSH_ANCHOR = {
  dome: [180, 426],
  weathervane: [180, 152],
  chimneys: [85, 278],
  skaters: [180, 350],
  snowlamps: [180, 325],
  bakery: [282, 272]
};

const GLOBE = { x: 180, y: 236, r: 172 };
/** Height of the snowy ground at x (the city stands on a low hill). */
const gy = (x) => 372 - 60 * Math.sqrt(Math.max(0, 1 - ((x - 180) / 170) ** 2));

// The city is authored small and then enlarged about a point below the hill,
// so it fills the glass. `zoomed` gives where an authored point ends up.
const ZOOM = 1.25;
const PIVOT = [180, 390];
function zoom(g, fn) {
  g.save();
  g.translate(PIVOT[0], PIVOT[1]);
  g.scale(ZOOM, ZOOM);
  g.translate(-PIVOT[0], -PIVOT[1]);
  fn();
  g.restore();
}
/** Ground height at a screen x, after the zoom (for snow landing on it). */
const groundAt = (x) => PIVOT[1] + (gy(PIVOT[0] + (x - PIVOT[0]) / ZOOM) - PIVOT[1]) * ZOOM;

const HOUSES = [
  [70, '#f4a6b4', '#c9647a'],
  [104, '#f6e3b4', '#b9566c'],
  [138, '#a8dcd0', '#7a4a5a']
];
const LAMP_XS = [60, 300, 124, 236];
const PINES = [[44, 22], [226, 28], [306, 22], [132, 20], [322, 16]];

function ghost(g, on, fn) {
  g.save();
  if (!on) g.globalAlpha = 0.26;
  fn(!on);
  g.restore();
}

function pine(g, x, base, h, p) {
  g.fillStyle = '#5a4a4a';
  g.fillRect(x - 1.5, base - 4, 3, 5);
  for (let i = 0; i < 3; i++) {
    const w = h * (0.62 - i * 0.14);
    const y = base - 3 - i * h * 0.28;
    g.fillStyle = mixHex('#4b5a66', '#2f7a6e', 0.3 + p * 0.7);
    g.beginPath();
    g.moveTo(x - w, y);
    g.lineTo(x, y - h * 0.44);
    g.lineTo(x + w, y);
    g.closePath();
    g.fill();
    if (p > 0.12) {
      // snow settles on the boughs once it has begun to fall
      g.fillStyle = `rgba(255,255,255,${Math.min(0.95, p * 1.2)})`;
      g.beginPath();
      g.moveTo(x - w * 0.5, y - h * 0.22);
      g.lineTo(x, y - h * 0.44);
      g.lineTo(x + w * 0.5, y - h * 0.22);
      g.quadraticCurveTo(x, y - h * 0.14, x - w * 0.5, y - h * 0.22);
      g.fill();
    }
  }
}

/** A drift of snow lying along a roof edge. */
function snowcap(g, x1, x2, y, p) {
  if (p < 0.12) return;
  g.fillStyle = `rgba(255,255,255,${Math.min(1, p * 1.3)})`;
  roundRect(g, x1, y - 3.4, x2 - x1, 5, 2.5);
  g.fill();
}

// ------------------------------------------------------------ behind the city

/** Background layer: the shadow on the table and the back of the glass. */
function drawGlobe(g) {
  const { x, y, r } = GLOBE;
  g.save();
  g.translate(x, 464);
  g.scale(1, 0.12);
  glow(g, 0, 0, 190, '#03171c', 0.9);
  glow(g, 0, 0, 130, '#03171c', 0.8);
  g.restore();
  const back = g.createRadialGradient(x - 50, y - 70, 20, x, y, r);
  back.addColorStop(0, 'rgba(206,232,248,.20)');
  back.addColorStop(1, 'rgba(120,166,208,.34)');
  g.fillStyle = back;
  circle(g, x, y, r);
}

// ------------------------------------------------------------ the city

/** Static parts of the city and the globe's base. Returns lamp positions that glow each frame. */
function drawCity(g, st) {
  const L = (id) => upgradeLevel(st, id);
  const p = restoration(st);
  const lamps = [];
  const { x: cx, y: cy, r } = GLOBE;
  g.lineCap = 'round';
  g.lineJoin = 'round';

  g.save();
  g.beginPath();
  g.arc(cx, cy, r - 2, 0, Math.PI * 2);
  g.clip();
  g.translate(PIVOT[0], PIVOT[1]);
  g.scale(ZOOM, ZOOM);
  g.translate(-PIVOT[0], -PIVOT[1]);

  // far hills and pines
  g.fillStyle = mixHex('#6f7c9c', '#dfeaf6', p);
  ellipse(g, 84, 338, 118, 50);
  g.fillStyle = mixHex('#7884a4', '#eaf2fa', p);
  ellipse(g, 276, 334, 128, 56);
  for (const [px, h] of PINES) pine(g, px, gy(px) + 2, h, p);

  // the ground: bare and grey until the snow comes
  const ground = g.createLinearGradient(0, 312, 0, 420);
  ground.addColorStop(0, mixHex('#a2a8ba', '#ffffff', p));
  ground.addColorStop(1, mixHex('#7c8498', '#c9def0', p));
  g.fillStyle = ground;
  ellipse(g, 180, 372, 170, 60);

  // --- Skating Pond ---
  const sk = L('skaters');
  g.fillStyle = mixHex('#8490aa', '#eef6fb', p);
  ellipse(g, 180, 359, 61, 14.5);
  g.fillStyle = sk ? '#bfe6f5' : '#8b97b3';
  ellipse(g, 180, 358, 56, 12);
  if (sk) {
    g.strokeStyle = 'rgba(255,255,255,.75)';
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(150, 355);
    g.lineTo(172, 352);
    g.moveTo(186, 362);
    g.lineTo(214, 359);
    g.stroke();
    if (sk >= 2) {
      // figure eights scored into the ice
      g.strokeStyle = 'rgba(111,166,200,.5)';
      g.lineWidth = 0.8;
      g.beginPath();
      g.ellipse(166, 358, 12, 4, 0, 0, Math.PI * 2);
      g.ellipse(194, 358, 12, 4, 0, 0, Math.PI * 2);
      g.stroke();
    }
    if (sk >= 3) {
      // a little bench and a string of flags
      g.fillStyle = '#7a4a5a';
      roundRect(g, 232, 350, 14, 3, 1);
      g.fill();
      g.fillRect(234, 353, 1.6, 4);
      g.fillRect(243, 353, 1.6, 4);
    }
  }

  // --- Weathervane tower ---
  const wv = L('weathervane');
  ghost(g, wv > 0, (gh) => {
    const base = gy(180) + 3;
    g.fillStyle = gh ? '#8d88c6' : '#b9c6dc';
    g.beginPath();
    g.moveTo(166, base);
    g.lineTo(169, 224);
    g.lineTo(191, 224);
    g.lineTo(194, base);
    g.closePath();
    g.fill();
    g.fillStyle = gh ? '#9d98d6' : '#e8eef7';
    g.beginPath();
    g.moveTo(166, base);
    g.lineTo(169, 224);
    g.lineTo(184, 224);
    g.lineTo(185, base);
    g.closePath();
    g.fill();
    // steep roof
    g.fillStyle = gh ? '#9d98d6' : '#3d6f8f';
    g.beginPath();
    g.moveTo(163, 226);
    g.quadraticCurveTo(178, 218, 180, 190);
    g.quadraticCurveTo(182, 218, 197, 226);
    g.closePath();
    g.fill();
    if (gh) return;
    g.fillStyle = '#5f93b3';
    g.beginPath();
    g.moveTo(163, 226);
    g.quadraticCurveTo(176, 218, 180, 190);
    g.lineTo(180, 226);
    g.closePath();
    g.fill();
    snowcap(g, 162, 198, 226, p);
    g.fillStyle = '#4a5a7a';
    g.beginPath();
    g.moveTo(175, base);
    g.lineTo(175, base - 12);
    g.arc(180, base - 12, 5, Math.PI, 0);
    g.lineTo(185, base);
    g.fill();
    if (wv >= 2) {
      g.fillStyle = '#ffe08a';
      roundRect(g, 176, 240, 5, 8, 2);
      g.fill();
      roundRect(g, 181, 262, 5, 8, 2);
      g.fill();
      g.fillStyle = '#7f93b3';
      roundRect(g, 164, 282, 32, 3.5, 1.5);
      g.fill();
    }
    if (wv >= 3) {
      g.strokeStyle = '#f5b942';
      g.lineWidth = 1.6;
      g.beginPath();
      g.moveTo(164, 226);
      g.lineTo(196, 226);
      g.stroke();
    }
  });

  // --- Chimney Row: one more house comes home per level ---
  const ch = L('chimneys');
  HOUSES.forEach(([hx, wall, roof], i) => {
    const on = i < ch;
    if (!on && i > 0) return;
    const base = gy(hx) + 3;
    ghost(g, on, (gh) => {
      g.fillStyle = gh ? '#9d98d6' : '#8a6a6a';
      g.fillRect(hx + 5, base - 42, 6, 14);
      g.fillStyle = gh ? '#9d98d6' : wall;
      roundRect(g, hx - 14, base - 22, 28, 22, 3);
      g.fill();
      g.fillStyle = gh ? '#8d88c6' : roof;
      g.beginPath();
      g.moveTo(hx - 18, base - 20);
      g.lineTo(hx, base - 38);
      g.lineTo(hx + 18, base - 20);
      g.closePath();
      g.fill();
      if (gh) return;
      // snow on the roof once it falls
      if (p > 0.12) {
        g.fillStyle = `rgba(255,255,255,${Math.min(1, p * 1.3)})`;
        g.beginPath();
        g.moveTo(hx - 18, base - 20);
        g.lineTo(hx, base - 38);
        g.lineTo(hx + 18, base - 20);
        g.lineTo(hx + 12, base - 21);
        g.lineTo(hx, base - 32);
        g.lineTo(hx - 12, base - 21);
        g.closePath();
        g.fill();
        snowcap(g, hx + 4, hx + 12, base - 42, p);
      }
      g.fillStyle = '#ffe08a';
      roundRect(g, hx - 9, base - 15, 7, 7, 1.5);
      g.fill();
      g.fillStyle = '#7a4a5a';
      roundRect(g, hx + 2, base - 13, 7, 13, 2);
      g.fill();
    });
  });

  // --- Midwinter Bakery ---
  const bk = L('bakery');
  ghost(g, bk > 0, (gh) => {
    const bx = 262;
    const base = gy(bx) + 3;
    g.fillStyle = gh ? '#9d98d6' : '#8a6a6a';
    g.fillRect(bx + 10, base - 52, 7, 16);
    if (!gh && bk >= 3) g.fillRect(bx - 16, base - 48, 6, 12);
    g.fillStyle = gh ? '#9d98d6' : '#f6e3b4';
    roundRect(g, bx - 24, base - 30, 48, 30, 3);
    g.fill();
    g.fillStyle = gh ? '#8d88c6' : '#b9566c';
    g.beginPath();
    g.moveTo(bx - 28, base - 28);
    g.lineTo(bx - 14, base - 44);
    g.lineTo(bx + 14, base - 44);
    g.lineTo(bx + 28, base - 28);
    g.closePath();
    g.fill();
    if (gh) return;
    snowcap(g, bx - 15, bx + 15, base - 44, p);
    snowcap(g, bx + 9, bx + 18, base - 52, p);
    // big warm window and a door
    g.fillStyle = '#ffe08a';
    roundRect(g, bx - 19, base - 21, 20, 13, 2);
    g.fill();
    g.fillStyle = '#c98a4b';
    circle(g, bx - 13, base - 12.5, 2.4);
    circle(g, bx - 6, base - 12.5, 2.4);
    g.fillStyle = '#7a4a5a';
    roundRect(g, bx + 7, base - 17, 10, 17, 2.5);
    g.fill();
    if (bk >= 2) {
      // striped awning and a round sign
      for (let k = 0; k < 5; k++) {
        g.fillStyle = k % 2 ? '#fff4dc' : '#f08a8a';
        g.fillRect(bx - 22 + k * 4.6, base - 26, 4.6, 5);
        circle(g, bx - 22 + k * 4.6 + 2.3, base - 21, 2.3);
      }
      g.fillStyle = '#f5b942';
      circle(g, bx + 26, base - 22, 5);
      g.fillStyle = '#7a4a5a';
      circle(g, bx + 26, base - 22, 2.2);
    }
    if (bk >= 3) {
      g.fillStyle = '#2f7a6e';
      circle(g, bx + 12, base - 23, 4.2);
      g.fillStyle = '#f6e3b4';
      circle(g, bx + 12, base - 23, 2);
      g.fillStyle = '#f08a8a';
      circle(g, bx + 12, base - 19.4, 1.4);
    }
  });

  // --- Snow Lanterns: posts set in the drifts ---
  const nLamps = [0, 1, 2, 4][L('snowlamps')];
  LAMP_XS.forEach((lx, i) => {
    const on = i < nLamps;
    if (!on && i > 1) return;
    const base = gy(lx) + 20;
    g.save();
    if (!on) g.globalAlpha = 0.26;
    g.strokeStyle = on ? '#4a5a7a' : '#9d98d6';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(lx, base);
    g.lineTo(lx, base - 17);
    g.stroke();
    g.fillStyle = on ? '#4a5a7a' : '#9d98d6';
    roundRect(g, lx - 4, base - 26, 8, 2.4, 1);
    g.fill();
    g.fillStyle = on ? '#ffe08a' : '#9d98d6';
    roundRect(g, lx - 3.4, base - 24, 6.8, 8, 2);
    g.fill();
    if (on) lamps.push([lx, base - 20, '#ffe08a']); // (authored coords: the glow is drawn inside the same zoom)
    g.restore();
  });
  g.restore(); // end of what is inside the glass

  // --- the base: the Glass Dome upgrade polishes it too ---
  const dm = L('dome');
  const q = dm / 3;
  const wood = mixHex('#6b6596', '#8a4a3a', q);
  const woodDk = mixHex('#57527f', '#5f2f2a', q);
  const trim = mixHex('#9d98c6', '#f5b942', q);
  g.fillStyle = woodDk;
  g.beginPath();
  g.moveTo(72, 400);
  g.lineTo(288, 400);
  g.quadraticCurveTo(302, 440, 300, 462);
  g.lineTo(60, 462);
  g.quadraticCurveTo(58, 440, 72, 400);
  g.fill();
  g.fillStyle = wood;
  g.beginPath();
  g.moveTo(72, 400);
  g.lineTo(230, 400);
  g.quadraticCurveTo(240, 440, 238, 462);
  g.lineTo(60, 462);
  g.quadraticCurveTo(58, 440, 72, 400);
  g.fill();
  g.fillStyle = trim;
  roundRect(g, 66, 392, 228, 12, 6);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,.3)';
  roundRect(g, 72, 394, 150, 3, 1.5);
  g.fill();
  g.fillStyle = trim;
  roundRect(g, 144, 422, 72, 20, 4);
  g.fill();
  g.fillStyle = woodDk;
  g.font = '800 8px Nunito, sans-serif';
  g.textAlign = 'center';
  g.fillText('HUSHFALL', 180, 435.5);
  return lamps;
}

/** Per-frame life inside the globe: smoke, skaters, the turning vane, warm light. */
function drawCityLive(ctx, st, t, lamps) {
  zoom(ctx, () => cityLive(ctx, st, t, lamps));
}

function cityLive(ctx, st, t, lamps) {
  const L = (id) => upgradeLevel(st, id);

  // chimney smoke from every lit hearth
  const ch = L('chimneys');
  const stacks = HOUSES.slice(0, ch).map(([hx]) => [hx + 8, gy(hx) + 3 - 42]);
  const bk = L('bakery');
  if (bk >= 1) stacks.push([275, gy(262) + 3 - 52]);
  if (bk >= 3) stacks.push([249, gy(262) + 3 - 48]);
  stacks.forEach(([sx, sy], k) => {
    for (let i = 0; i < 3; i++) {
      const u = (((t * 0.22 + i / 3 + k * 0.17) % 1) + 1) % 1;
      ctx.fillStyle = `rgba(255,255,255,${(1 - u) * 0.34})`;
      circle(ctx, sx + u * 7 + Math.sin(u * 5 + k) * 3, sy - u * 34, 2.6 + u * 5);
    }
  });

  // skaters circle the pond: one more per level
  const sk = L('skaters');
  for (let i = 0; i < sk; i++) {
    const a = t * (0.8 + i * 0.13) * (i % 2 ? -1 : 1) + i * 2.1;
    const x = 180 + Math.cos(a) * (40 - i * 7);
    const y = 357 + Math.sin(a) * (8 - i * 1.4);
    ctx.fillStyle = 'rgba(60,80,110,.2)';
    ellipse(ctx, x, y + 1, 3.4, 1.1);
    ctx.fillStyle = ['#f08a8a', '#7fd0c4', '#f5b942'][i];
    roundRect(ctx, x - 2.2, y - 8, 4.4, 7, 2);
    ctx.fill();
    ctx.fillStyle = '#ffe4d0';
    circle(ctx, x, y - 10.4, 2.3);
    ctx.fillStyle = ['#7a4a5a', '#3d6f8f', '#b9566c'][i];
    ctx.beginPath();
    ctx.arc(x, y - 11, 2.4, Math.PI, 0);
    ctx.fill();
  }

  // the weathervane swings with the wind
  const wv = L('weathervane');
  if (wv >= 1) {
    const w = Math.cos(t * 0.9 + Math.sin(t * 0.37) * 1.4);
    ctx.strokeStyle = '#f5b942';
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(180, 191);
    ctx.lineTo(180, 174);
    ctx.moveTo(180 - 12 * w, 178);
    ctx.lineTo(180 + 12 * w, 178);
    ctx.stroke();
    ctx.fillStyle = '#f5b942';
    ctx.beginPath();
    ctx.moveTo(180 + 15 * w, 178);
    ctx.lineTo(180 + 9 * w, 174.4);
    ctx.lineTo(180 + 9 * w, 181.6);
    ctx.closePath();
    ctx.fill();
    circle(ctx, 180, 172.6, 2);
  }

  additive(ctx, () => {
    for (let i = 0; i < lamps.length; i++) {
      const [x, y, col] = lamps[i];
      glow(ctx, x, y, 12 + Math.sin(t * 3 + i * 1.7) * 1.6, col, 0.8);
    }
    HOUSES.slice(0, ch).forEach(([hx], i) => glow(ctx, hx - 5.5, gy(hx) - 8.5, 9, '#ffe08a', 0.6 + Math.sin(t * 2 + i) * 0.08));
    if (bk >= 1) glow(ctx, 253, gy(262) - 11, 15 + bk * 2, '#ffd98a', 0.55);
    if (wv >= 2) glow(ctx, 180, 252, 14, '#ffe08a', 0.4);
    if (wv >= 3) glow(ctx, 180, 174, 11 + Math.sin(t * 2.4) * 2, '#ffcf5c', 0.6);
  });
}

/** Drawn last, over the city and its creatures: falling snow, northern lights, and the glass. */
function drawGlassOver(ctx, st, t, p) {
  const { x: cx, y: cy, r } = GLOBE;
  const dm = upgradeLevel(st, 'dome');

  // the first snowfall: nothing at all until the city starts to wake
  const flakes = Math.round(p * 54);
  ctx.fillStyle = 'rgba(255,255,255,.9)';
  for (let i = 0; i < flakes; i++) {
    const fx = cx + Math.sin(i * 12.9898) * 152 + Math.sin(t * 0.8 + i) * 8;
    const fy = 72 + ((i * 37.7 + t * (13 + (i % 7) * 3)) % 300);
    if (Math.hypot(fx - cx, fy - cy) > r - 10 || fy > groundAt(fx) + 26) continue;
    circle(ctx, fx, fy, 1.1 + (i % 3) * 0.5);
  }

  // northern lights: the reward for the Keepsakes
  if (setDone(st, 'hushfall')) {
    additive(ctx, () => {
      ['#7be0a0', '#7fe3d8', '#b9a6ff'].forEach((col, k) => {
        for (let ax = 70; ax <= 290; ax += 20) {
          const ay = 118 + k * 15 + Math.sin(ax * 0.022 + t * 0.45 + k * 1.3) * 15;
          glow(ctx, ax, ay, 26, col, 0.13 + Math.sin(t * 0.8 + ax * 0.05 + k) * 0.04);
        }
      });
    });
  }

  // years of dust on the glass, polished away level by level
  const film = [0.36, 0.2, 0.09, 0][dm];
  if (film > 0) {
    ctx.fillStyle = `rgba(150,154,176,${film})`;
    circle(ctx, cx, cy, r - 1);
  }
  // rim and highlights
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(232,246,255,.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r - 1, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = `rgba(255,255,255,${0.28 + dm * 0.1})`;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(cx, cy, r - 14, 1.1 * Math.PI, 1.4 * Math.PI);
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, r - 24, 1.46 * Math.PI, 1.53 * Math.PI);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.16)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx, cy, r - 10, 0.1 * Math.PI, 0.3 * Math.PI);
  ctx.stroke();
  if (dm >= 3) {
    ctx.fillStyle = `rgba(255,255,255,${0.5 + Math.sin(t * 2.4) * 0.4})`;
    star4(ctx, cx - 96, cy - 112, 6, 0);
  }
}

export { HUSH_ANCHOR, drawGlobe, drawCity, drawCityLive, drawGlassOver };
