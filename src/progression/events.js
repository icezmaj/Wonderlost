// Live-event scheduler and milestone ladder. Which event is live is a pure
// function of the clock and the config list, so every device agrees without a
// server (prototype) and a server can later own the same calculation.

import { EVENTS, EVENT_CYCLE_HOURS, EVENT_UNLOCK_RANK } from '../config/events.js';
import { rankOf } from './state.js';
import { grant } from './objectives.js';

const CYCLE_MS = EVENT_CYCLE_HOURS * 3600 * 1000;

function currentEvent(now) {
  const cycle = Math.floor(now / CYCLE_MS);
  return { cycle, def: EVENTS[cycle % EVENTS.length], endsAt: (cycle + 1) * CYCLE_MS };
}

const eventUnlocked = (s) => rankOf(s).rank >= EVENT_UNLOCK_RANK;

/** Reset progress when a new cycle begins. Returns the live event. */
function refreshEvent(s, now) {
  const cur = currentEvent(now);
  if (s.event.cycle !== cur.cycle) s.event = { cycle: cur.cycle, points: 0, claimed: [] };
  return cur;
}

/** Credit a settled dive to the live event. Returns points added. */
function addEventPoints(s, diveSummary, now) {
  if (!eventUnlocked(s)) return 0;
  const cur = refreshEvent(s, now);
  const pts = Math.max(0, Math.floor(diveSummary[cur.def.metric] || 0));
  s.event.points += pts;
  return pts;
}

function eventMilestones(s, now) {
  const cur = refreshEvent(s, now);
  return cur.def.milestones.map((m, i) => ({
    ...m,
    index: i,
    reached: s.event.points >= m.at,
    claimed: s.event.claimed.includes(i)
  }));
}

function claimMilestone(s, now, index) {
  const m = eventMilestones(s, now)[index];
  if (!m || !m.reached || m.claimed) return null;
  s.event.claimed.push(index);
  grant(s, m.reward);
  return m;
}

const eventClaimable = (s, now) => eventUnlocked(s) && eventMilestones(s, now).some((m) => m.reached && !m.claimed);

export { currentEvent, eventUnlocked, refreshEvent, addEventPoints, eventMilestones, claimMilestone, eventClaimable };
