// Image slots. Loads whatever images the build found, and draws them into the
// slots defined in src/config/slots.js. Every draw call returns false when its
// image is missing, so callers fall back to code-drawn art:
//
//   if (!place(g, 'lantern_on', x, y)) drawLanternByHand(g, x, y);

import { ASSET_INDEX } from '../config/assetIndex.js';
import { MARGIN, slotFiles } from '../config/slots.js';

const FILES = slotFiles();
const images = new Map();
const tints = new Map();
let version = 0; // bumps whenever what is drawn could change; views use it to drop caches
let debug = false;

function loadAssets() {
  if (typeof Image === 'undefined') return;
  for (const [name, url] of Object.entries(ASSET_INDEX)) {
    if (!FILES[name]) {
      console.warn(`[art] "${name}" does not match any slot and was ignored`);
      continue;
    }
    const img = new Image();
    img.onload = () => {
      images.set(name, img);
      version++;
    };
    img.onerror = () => console.warn(`[art] could not load "${name}"`);
    img.src = url;
  }
}

const has = (name) => images.has(name);
const assetVersion = () => version;
const slotDef = (name) => FILES[name];

function setSlotDebug(on) {
  if (debug === !!on) return;
  debug = !!on;
  version++;
}

function outline(ctx, name, x, y, w, h, filled) {
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = filled ? '#7be0a0' : '#ff8fa3';
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 2]);
  ctx.strokeRect(x, y, w, h);
  ctx.setLineDash([]);
  ctx.font = '700 6px Nunito, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  const tw = ctx.measureText(name).width;
  ctx.fillStyle = 'rgba(13,10,38,.8)';
  ctx.fillRect(x, y - 8, tw + 4, 8);
  ctx.fillStyle = filled ? '#7be0a0' : '#ff8fa3';
  ctx.fillText(name, x + 2, y - 0.5);
  ctx.restore();
}

/**
 * Draw the image for `name` with its object at (x, y).
 * opts: w, h (override the slot's size), anchor, alpha, rot, flip, scale,
 *       silhouette (a colour: draw the shape filled with it), glow (draw the
 *       "<name>_glow" layer additively instead), quiet (no debug outline)
 * Returns true when an image was drawn.
 */
function place(ctx, name, x, y, opts = {}) {
  const def = FILES[name];
  if (!def) return false;
  const file = opts.glow ? name + '_glow' : name;
  const img = images.get(file);
  const sc = opts.scale || 1;
  const w = (opts.w || def.w) * sc;
  const h = (opts.h || def.h) * sc;
  const ground = (opts.anchor || def.anchor) === 'ground';
  const left = x - w / 2;
  const top = ground ? y - h : y - h / 2;

  if (img) {
    // The file is the object plus MARGIN on each side. A glow file covers
    // twice its parent image, centred on the same point.
    const iw = w / (1 - MARGIN * 2);
    const ih = opts.h ? h / (1 - MARGIN * 2) : iw * (img.naturalHeight / img.naturalWidth);
    const m = opts.glow ? 2 : 1;
    const src = opts.silhouette ? tinted(file, img, opts.silhouette) : img;
    ctx.save();
    ctx.translate(x, ground ? y - ih * (0.5 - MARGIN) : y);
    if (opts.rot) ctx.rotate(opts.rot);
    if (opts.flip) ctx.scale(-1, 1);
    if (opts.alpha !== undefined) ctx.globalAlpha = Math.max(0, Math.min(1, opts.alpha));
    if (opts.glow) ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(src, (-iw * m) / 2, (-ih * m) / 2, iw * m, ih * m);
    ctx.restore();
  }
  if (debug && !opts.quiet && !opts.glow) {
    if (opts.rot) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(opts.rot);
      outline(ctx, name, -w / 2, -h / 2, w, h, !!img);
      ctx.restore();
    } else outline(ctx, name, left, top, w, h, !!img);
  }
  return !!img;
}

/** Draw a slot that has a fixed position (x, y in its definition). */
function slot(ctx, name, opts) {
  const def = FILES[name];
  return def ? place(ctx, name, def.x, def.y, opts) : false;
}

/** Draw a full-screen image, scaled to cover W x H. */
function cover(ctx, name, W, H) {
  const img = images.get(name);
  if (!img) return false;
  const s = Math.max(W / img.naturalWidth, H / img.naturalHeight);
  const w = img.naturalWidth * s;
  const h = img.naturalHeight * s;
  ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
  return true;
}

/**
 * Draw an image across the full screen width with its top edge at `top`.
 * With `toBottom` it is stretched down to `toBottom` if it would fall short.
 */
function band(ctx, name, W, top, toBottom) {
  const img = images.get(name);
  if (img) {
    let h = W * (img.naturalHeight / img.naturalWidth);
    if (toBottom !== undefined && top + h < toBottom) h = toBottom - top;
    ctx.drawImage(img, 0, top, W, h);
  }
  if (debug) outline(ctx, name, 1, top, W - 2, FILES[name].h * (W / 360), !!img);
  return !!img;
}

function tinted(file, img, color) {
  const key = file + color;
  let c = tints.get(key);
  if (!c) {
    c = document.createElement('canvas');
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = color;
    g.fillRect(0, 0, c.width, c.height);
    tints.set(key, c);
  }
  return c;
}

export { loadAssets, has, place, slot, cover, band, assetVersion, setSlotDebug, slotDef };
