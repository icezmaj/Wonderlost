// Canvas drawing helpers shared by every view: cached glow sprites (cheap
// "light" on phones - no shadowBlur per frame), shape shortcuts, particles and
// floating text.

import { rgba } from '../core/util.js';

const sprites = new Map();

/** A soft radial light, rendered once per colour and reused. */
function glowSprite(color) {
  let c = sprites.get(color);
  if (!c) {
    c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, rgba(color, 1));
    grad.addColorStop(0.22, rgba(color, 0.6));
    grad.addColorStop(0.55, rgba(color, 0.16));
    grad.addColorStop(1, rgba(color, 0));
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    sprites.set(color, c);
  }
  return c;
}

function glow(ctx, x, y, r, color, alpha = 1) {
  if (alpha <= 0 || r <= 0) return;
  ctx.globalAlpha = alpha > 1 ? 1 : alpha;
  ctx.drawImage(glowSprite(color), x - r, y - r, r * 2, r * 2);
  ctx.globalAlpha = 1;
}

/** Run drawing code with additive blending (light adds to light). */
function additive(ctx, fn) {
  ctx.globalCompositeOperation = 'lighter';
  fn();
  ctx.globalCompositeOperation = 'source-over';
}

function ellipse(ctx, x, y, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** A puffy cloud bank: flat-ish top, lumpy edges, shaded underside. */
function cloud(ctx, cx, cy, w, h, top, under) {
  const n = Math.max(3, Math.round(w / (h * 0.8)));
  const trace = (dy, squash) => {
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0.5 : i / (n - 1);
      const r = h * (0.42 + 0.3 * Math.sin(t * Math.PI)) * squash;
      const x = cx - w / 2 + r * 0.8 + t * (w - r * 1.6);
      ctx.moveTo(x + r, cy + dy);
      ctx.arc(x, cy + dy, r, 0, Math.PI * 2);
    }
    ctx.fill();
  };
  ctx.fillStyle = under;
  trace(h * 0.26, 0.92);
  ctx.fillStyle = top;
  trace(0, 1);
}

/** Four-point sparkle star. */
function star4(ctx, x, y, r, rot = 0) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = rot + (i * Math.PI) / 4;
    const rr = i % 2 === 0 ? r : r * 0.34;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
}

/** Pooled particles. `glow: true` particles are drawn additively as lights. */
class Particles {
  constructor(max = 280) {
    this.max = max;
    this.list = [];
  }

  /**
   * @param o { n, color, speed:[min,max], life:[min,max], size:[min,max],
   *            angle, spread, gravity, drag, glow, shrink }
   */
  emit(x, y, o) {
    const n = o.n || 1;
    for (let i = 0; i < n; i++) {
      if (this.list.length >= this.max) this.list.shift();
      const a = (o.angle ?? 0) + (Math.random() - 0.5) * (o.spread ?? Math.PI * 2);
      const sp = o.speed ? o.speed[0] + Math.random() * (o.speed[1] - o.speed[0]) : 0;
      const life = o.life ? o.life[0] + Math.random() * (o.life[1] - o.life[0]) : 0.6;
      const colors = Array.isArray(o.color) ? o.color : [o.color];
      this.list.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life,
        max: life,
        size: o.size ? o.size[0] + Math.random() * (o.size[1] - o.size[0]) : 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        gravity: o.gravity ?? 0,
        drag: o.drag ?? 1.5,
        glow: o.glow !== false,
        shrink: o.shrink !== false
      });
    }
  }

  update(dt) {
    const list = this.list;
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      p.life -= dt;
      if (p.life <= 0) {
        list[i] = list[list.length - 1];
        list.pop();
        continue;
      }
      p.vy += p.gravity * dt;
      const k = Math.max(0, 1 - p.drag * dt);
      p.vx *= k;
      p.vy *= k;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  draw(ctx) {
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.list) {
      if (!p.glow) continue;
      const t = p.life / p.max;
      const r = p.size * (p.shrink ? 0.4 + t * 0.6 : 1) * 2.4;
      ctx.globalAlpha = t > 1 ? 1 : t;
      ctx.drawImage(glowSprite(p.color), p.x - r, p.y - r, r * 2, r * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
    for (const p of this.list) {
      if (p.glow) continue;
      const t = p.life / p.max;
      ctx.globalAlpha = Math.min(1, t * 1.4) * 0.7;
      ctx.fillStyle = p.color;
      circle(ctx, p.x, p.y, p.size * (p.shrink ? t : 1 + (1 - t) * 1.2));
    }
    ctx.globalAlpha = 1;
  }

  clear() {
    this.list.length = 0;
  }
}

/** Floating score/label text that rises and fades. */
class Popups {
  constructor() {
    this.list = [];
  }

  add(x, y, text, color = '#fff3c4', size = 15, life = 0.9) {
    this.list.push({ x, y, text, color, size, life, max: life });
    if (this.list.length > 14) this.list.shift();
  }

  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.life -= dt;
      p.y -= 26 * dt;
      if (p.life <= 0) this.list.splice(i, 1);
    }
  }

  draw(ctx) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const p of this.list) {
      const t = p.life / p.max;
      const pop = 1 + Math.max(0, t - 0.8) * 2.2;
      ctx.globalAlpha = Math.min(1, t * 2.2);
      ctx.font = `800 ${Math.round(p.size * pop)}px Nunito, system-ui, sans-serif`;
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = 'rgba(20,14,56,.85)';
      ctx.strokeText(p.text, p.x, p.y);
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, p.x, p.y);
    }
    ctx.globalAlpha = 1;
  }

  clear() {
    this.list.length = 0;
  }
}

export { glowSprite, glow, additive, ellipse, circle, roundRect, cloud, star4, Particles, Popups };
