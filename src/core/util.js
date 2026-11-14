// Small shared helpers. No game logic lives here.

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
const easeInOut = (t) => {
  t = clamp(t, 0, 1);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
/** Overshooting ease for "pop" animations. */
const easeBack = (t) => {
  t = clamp(t, 0, 1);
  const c = 1.70158;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
};

/** 1234 -> "1,234"; 15300 -> "15.3k". */
function fmt(n) {
  n = Math.floor(n);
  if (n >= 100000) return (n / 1000).toFixed(0) + 'k';
  if (n >= 10000) return (n / 1000).toFixed(1) + 'k';
  return n.toLocaleString('en-US');
}

/** Seconds -> "2:05" or "3h 12m" or "2d 4h". */
function fmtTime(sec) {
  sec = Math.max(0, Math.ceil(sec));
  if (sec >= 86400) return Math.floor(sec / 86400) + 'd ' + Math.floor((sec % 86400) / 3600) + 'h';
  if (sec >= 3600) return Math.floor(sec / 3600) + 'h ' + Math.floor((sec % 3600) / 60) + 'm';
  return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
}

/** Mix two "#rrggbb" colours. */
function mixHex(a, b, t) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const r = Math.round(lerp((pa >> 16) & 255, (pb >> 16) & 255, t));
  const g = Math.round(lerp((pa >> 8) & 255, (pb >> 8) & 255, t));
  const bl = Math.round(lerp(pa & 255, pb & 255, t));
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
}

/** "#rrggbb" + alpha -> "rgba(...)". */
function rgba(hex, a) {
  const p = parseInt(hex.slice(1), 16);
  return `rgba(${(p >> 16) & 255},${(p >> 8) & 255},${p & 255},${a})`;
}

/** Local calendar day key, e.g. "2026-11-13". */
function dayKey(ms) {
  const d = new Date(ms);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

export { clamp, lerp, easeOut, easeInOut, easeBack, fmt, fmtTime, mixHex, rgba, dayKey };
