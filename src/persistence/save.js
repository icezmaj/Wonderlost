// Local persistence. The save is one versioned JSON document. Loading never
// throws: unreadable storage falls back to memory, corrupt data is set aside
// and the player starts fresh instead of being locked out.
//
// PROTOTYPE NOTE: this is client-trusted. Cloud saves and a server-owned
// economy replace it before any real-money feature ships (docs/GDD.md, s.10).

import { newState, SAVE_VERSION } from '../progression/state.js';
import { WORLDS } from '../config/worlds.js';

const SAVE_KEY = 'wonderlost.save';

/** Storage that cannot throw. Falls back to memory when localStorage is blocked. */
function safeStorage(candidate) {
  const mem = new Map();
  let backing = null;
  try {
    backing = candidate === undefined ? window.localStorage : candidate;
    if (backing) {
      backing.setItem('wonderlost.probe', '1');
      backing.removeItem('wonderlost.probe');
    }
  } catch (err) {
    backing = null;
  }
  return {
    persistent: !!backing,
    get(key) {
      try {
        return backing ? backing.getItem(key) : mem.has(key) ? mem.get(key) : null;
      } catch (err) {
        return mem.has(key) ? mem.get(key) : null;
      }
    },
    set(key, value) {
      mem.set(key, value);
      try {
        if (backing) backing.setItem(key, value);
        return true;
      } catch (err) {
        return false;
      }
    },
    remove(key) {
      mem.delete(key);
      try {
        if (backing) backing.removeItem(key);
      } catch (err) {
        /* ignore */
      }
    }
  };
}

const isPlain = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** Fill in anything a save is missing from the defaults, keeping what it has. */
function fill(defaults, raw) {
  const out = { ...raw };
  for (const key of Object.keys(defaults)) {
    const d = defaults[key];
    const r = raw[key];
    if (r === undefined || r === null) out[key] = d;
    else if (isPlain(d)) out[key] = isPlain(r) ? fill(d, r) : d;
    else if (d !== null && (typeof d !== typeof r || Array.isArray(d) !== Array.isArray(r))) out[key] = d;
  }
  return out;
}

// Step-by-step upgrades between save versions: MIGRATIONS[n] turns v(n) into v(n+1).
const MIGRATIONS = {
  0: (raw) => ({ ...raw, v: 1 }),
  // v2: a second world. The single "set rewarded" flag becomes one per set.
  1: (raw) => {
    const out = { ...raw, v: 2, sets: { ...(raw.sets || {}) } };
    if (raw.setRewarded) out.sets.first_dawn = true;
    delete out.setRewarded;
    return out;
  }
};

/** Bring any older (or partial) save up to the current shape. */
function migrate(raw, now) {
  if (!isPlain(raw)) throw new Error('save is not an object');
  let data = raw;
  let v = typeof data.v === 'number' ? data.v : 0;
  if (v > SAVE_VERSION) throw new Error('save is from a newer version');
  while (v < SAVE_VERSION) {
    data = MIGRATIONS[v](data);
    v++;
  }
  const state = fill(newState(now), data);
  state.v = SAVE_VERSION;
  if (!WORLDS[state.worldId]) state.worldId = 'mistlewick';
  // Guard numeric balances against hand-edited or damaged values.
  for (const k of ['glow', 'sparks', 'xp', 'echoes']) {
    if (!Number.isFinite(state[k]) || state[k] < 0) state[k] = 0;
  }
  return state;
}

/** @returns {{ state, fresh: boolean, recovered: boolean }} */
function load(store, now) {
  const text = store.get(SAVE_KEY);
  if (!text) return { state: newState(now), fresh: true, recovered: false };
  try {
    return { state: migrate(JSON.parse(text), now), fresh: false, recovered: false };
  } catch (err) {
    store.set(SAVE_KEY + '.corrupt', text);
    return { state: newState(now), fresh: true, recovered: true };
  }
}

function save(store, state, now) {
  state.lastSeen = now;
  return store.set(SAVE_KEY, JSON.stringify(state));
}

function reset(store) {
  store.remove(SAVE_KEY);
}

export { SAVE_KEY, safeStorage, migrate, load, save, reset };
