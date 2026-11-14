// Case files (sequential goals), daily tasks, and the shared reward grant.

import { CASE_FILES, DAILY_POOL, DAILY_COUNT } from '../config/objectives.js';
import { mulberry32, hashSeed, shuffle } from '../core/rng.js';
import { dayKey } from '../core/util.js';
import { WORLDS } from '../config/worlds.js';
import { unlockNeed } from './state.js';

/**
 * Apply a reward bundle { glow?, sparks?, cosmetic? }.
 * Reward Sparks may exceed the regen cap on purpose: a reward is never wasted.
 */
function grant(s, reward) {
  if (!reward) return;
  if (reward.glow) {
    s.glow += reward.glow;
    s.stats.glowEarned += reward.glow;
  }
  if (reward.sparks) s.sparks += reward.sparks;
  if (reward.cosmetic && !s.cosmetics.includes(reward.cosmetic)) s.cosmetics.push(reward.cosmetic);
}

// --- case files ---

const activeCase = (s) => CASE_FILES[s.caseIdx] || null;

function caseProgress(s) {
  const c = activeCase(s);
  if (!c) return null;
  // A case that belongs to a world not opened yet waits, and says what opens it.
  const need = c.world ? unlockNeed(s, c.world) : 0;
  const counters = c.world ? s.wstats[c.world] || {} : s.stats;
  const value = need ? 0 : Math.min(c.target, counters[c.metric] || 0);
  const locked = need ? { need, world: WORLDS[c.world], gate: WORLDS[WORLDS[c.world].unlock.world] } : null;
  return { c, value, done: value >= c.target, locked, index: s.caseIdx, total: CASE_FILES.length };
}

/** Count something that happened in the current world (for that world's cases). */
function bumpWorld(s, metric, n = 1) {
  const w = (s.wstats[s.worldId] = s.wstats[s.worldId] || {});
  w[metric] = (w[metric] || 0) + n;
}

/** Claim the active case if complete. Returns the claimed case or null. */
function claimCase(s) {
  const p = caseProgress(s);
  if (!p || !p.done) return null;
  grant(s, p.c.reward);
  s.caseIdx++;
  return p.c;
}

// --- daily tasks ---

/** Roll today's tasks if the local day changed. Returns true when re-rolled. */
function refreshDaily(s, now) {
  const day = dayKey(now);
  if (s.daily.day === day) return false;
  const rng = mulberry32(hashSeed('daily', day));
  s.daily = {
    day,
    ids: shuffle(rng, DAILY_POOL).slice(0, DAILY_COUNT).map((d) => d.id),
    base: { ...s.stats },
    claimed: []
  };
  return true;
}

function dailyList(s) {
  return s.daily.ids
    .map((id) => DAILY_POOL.find((d) => d.id === id))
    .filter(Boolean)
    .map((d) => {
      const value = Math.min(d.target, (s.stats[d.metric] || 0) - (s.daily.base[d.metric] || 0));
      return { d, value, done: value >= d.target, claimed: s.daily.claimed.includes(d.id) };
    });
}

function claimDaily(s, id) {
  const row = dailyList(s).find((r) => r.d.id === id);
  if (!row || !row.done || row.claimed) return null;
  s.daily.claimed.push(id);
  grant(s, row.d.reward);
  return row.d;
}

const dailyClaimable = (s) => dailyList(s).some((r) => r.done && !r.claimed);

export { grant, activeCase, caseProgress, bumpWorld, claimCase, refreshDaily, dailyList, claimDaily, dailyClaimable };
