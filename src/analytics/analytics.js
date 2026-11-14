// Analytics façade. Gameplay code calls track(name, props) and nothing else.
//
// PROTOTYPE NOTE (mocked): events are validated against the schema below and
// kept in a local ring buffer only - nothing leaves the device. Swapping in a
// real sink (Firebase, Amplitude, own endpoint) is a change to `sinks` here.
//
// Every event automatically carries: ts, session id, app version, cohort date
// and a random non-identifying player key (never a name, email or device id).

import { TUNING as T } from '../config/tuning.js';
import { dayKey } from '../core/util.js';

/** Event name -> required property names. Unknown events/props are flagged in dev. */
const SCHEMA = {
  first_open: [],
  session_start: ['days_since_install', 'sparks', 'restoration'],
  session_end: ['seconds', 'dives'],
  tutorial_step: ['step'],
  tutorial_complete: ['seconds_since_install'],
  action_spent: ['hollow', 'sparks_left', 'practice'],
  reward_granted: ['outcome', 'glow', 'chain', 'lanterns', 'seconds', 'rekindles', 'hollow_done'],
  hollow_awakened: ['hollow', 'dives'],
  upgrade_completed: ['id', 'level', 'cost', 'restoration'],
  collection_added: ['kind', 'id', 'is_new'],
  objective_claimed: ['id', 'kind'],
  event_milestone: ['event', 'index'],
  rank_up: ['rank'],
  companion_set: ['id'],
  sparks_depleted: ['next_in'],
  setting_changed: ['key', 'value'],
  sheet_opened: ['sheet'],
  save_reset: []
};

const BUFFER_KEY = 'wonderlost.analytics';
const MAX_BUFFER = 300;

let ctx = { playerKey: 'unknown', cohort: '', sessionId: '', store: null };
const buffer = [];
const sinks = [];

function initAnalytics({ playerKey, createdAt, store }) {
  ctx = {
    playerKey,
    cohort: dayKey(createdAt),
    sessionId: 's_' + Date.now().toString(36),
    store
  };
}

/** Register an extra destination: fn(event). */
const addSink = (fn) => sinks.push(fn);

function track(name, props = {}) {
  const required = SCHEMA[name];
  if (!required) console.warn('[analytics] unknown event', name);
  else for (const key of required) if (!(key in props)) console.warn('[analytics]', name, 'missing', key);

  const event = { name, ts: Date.now(), session: ctx.sessionId, player: ctx.playerKey, cohort: ctx.cohort, app: T.version, ...props };
  buffer.push(event);
  if (buffer.length > MAX_BUFFER) buffer.shift();
  for (const sink of sinks) {
    try {
      sink(event);
    } catch (err) {
      /* a broken sink must never break the game */
    }
  }
  return event;
}

/** Persist the tail of the buffer (called alongside saves, not per event). */
function flushAnalytics() {
  if (ctx.store) ctx.store.set(BUFFER_KEY, JSON.stringify(buffer.slice(-MAX_BUFFER)));
}

const recentEvents = () => buffer.slice();

export { SCHEMA, initAnalytics, addSink, track, flushAnalytics, recentEvents };
