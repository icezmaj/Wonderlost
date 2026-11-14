// DOM helpers and the icon set. Icons are original inline SVGs (no icon font,
// no emoji) so they stay crisp and identical on every phone.

function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

const svg = (body, vb = '0 0 24 24') => `<svg class="ic" viewBox="${vb}" aria-hidden="true" focusable="false">${body}</svg>`;

const ICON = {
  spark: svg('<path fill="#ffcf5c" d="M12 1.5l2.6 7.9 7.9 2.6-7.9 2.6-2.6 7.9-2.6-7.9-7.9-2.6 7.9-2.6z"/><circle cx="12" cy="12" r="2.4" fill="#fff8e0"/>'),
  glow: svg('<circle cx="12" cy="12" r="9" fill="#7fe3d8" opacity=".35"/><circle cx="12" cy="12" r="6" fill="#7fe3d8"/><circle cx="10" cy="10" r="2.2" fill="#ffffff"/>'),
  echo: svg('<circle cx="12" cy="12" r="9" fill="none" stroke="#b9a8f0" stroke-width="2" opacity=".5"/><circle cx="12" cy="12" r="5.5" fill="none" stroke="#b9a8f0" stroke-width="2"/><circle cx="12" cy="12" r="2" fill="#b9a8f0"/>'),
  hammer: svg('<path d="M5 20l8-8" stroke="currentColor" stroke-width="3" stroke-linecap="round" fill="none"/><path fill="currentColor" d="M11.5 4.5l8 8-3 3-2-2-4 .5.5-4-2-2z"/>'),
  book: svg('<path fill="currentColor" d="M4 5.5C4 4.1 5.1 3 6.5 3H19a1 1 0 011 1v15a1 1 0 01-1 1H6.5A2.5 2.5 0 014 17.5z" opacity=".9"/><path fill="#17133a" d="M8 7h8v2H8zm0 4h6v2H8z"/>'),
  lantern: svg('<path d="M9 4a3 3 0 016 0" stroke="currentColor" stroke-width="1.8" fill="none"/><rect x="8" y="4" width="8" height="3" rx="1" fill="currentColor"/><rect x="6" y="7" width="12" height="12" rx="5" fill="#ffcf5c"/><rect x="9" y="19" width="6" height="2.4" rx="1" fill="currentColor"/>'),
  gear: svg('<circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" stroke-width="4.5" stroke-dasharray="3.6 2.6"/><circle cx="12" cy="12" r="5.6" fill="currentColor"/><circle cx="12" cy="12" r="2.4" fill="#17133a"/>'),
  lock: svg('<path d="M8 11V8a4 4 0 018 0v3" stroke="currentColor" stroke-width="2.2" fill="none"/><rect x="5.5" y="10.5" width="13" height="10" rx="2.5" fill="currentColor"/>'),
  check: svg('<path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>'),
  close: svg('<path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/>'),
  heart: svg('<path fill="currentColor" d="M12 20.5l-1.3-1.2C5.6 14.7 3 12.3 3 8.9 3 6.4 5 4.5 7.4 4.5c1.6 0 3.2.8 4.1 2.1.9-1.3 2.5-2.1 4.1-2.1C18 4.5 21 6.4 21 8.9c0 3.4-2.6 5.8-7.700 10.400z"/>'),
  home: svg('<path fill="currentColor" d="M12 3.5l9 8h-2.5v8.500h-5v-5.500h-3v5.500h-5V11.500H3z"/>')
};

/** "<icon> 60" markup for a reward bundle { glow?, sparks?, label? }. */
function rewardHtml(r) {
  const parts = [];
  if (r.glow) parts.push(`<span class="rw">${ICON.glow}${r.glow}</span>`);
  if (r.sparks) parts.push(`<span class="rw">${ICON.spark}${r.sparks}</span>`);
  if (r.label && r.cosmetic) parts.push(`<span class="rw rw-text">${r.label}</span>`);
  return parts.join('');
}

/** Plain-text version for toasts and aria labels. */
function rewardText(r) {
  const parts = [];
  if (r.glow) parts.push(`+${r.glow} Glow`);
  if (r.sparks) parts.push(`+${r.sparks} Spark${r.sparks > 1 ? 's' : ''}`);
  if (r.label && r.cosmetic) parts.push(r.label);
  return parts.join(' · ');
}

export { el, ICON, rewardHtml, rewardText };
