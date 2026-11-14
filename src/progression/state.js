// Player state shape + read-only selectors. Nothing in this file mutates state
// except regenSparks(), which is pure bookkeeping against a supplied clock.

import { TUNING as T } from '../config/tuning.js';
import { WORLDS } from '../config/worlds.js';

const SAVE_VERSION = 1;

/** @returns a brand-new player state. `now` is epoch milliseconds. */
function newState(now) {
  return {
    v: SAVE_VERSION,
    createdAt: now,
    lastSeen: now,
    playerKey: 'p_' + Math.floor(now % 1e9).toString(36) + Math.floor(Math.random() * 1e9).toString(36),
    worldId: 'mistlewick',

    glow: 0,
    sparks: T.startSparks,
    sparkStamp: now, // start of the current regen interval
    xp: 0,

    upgrades: {}, // id -> level
    creatures: {}, // id -> { bond }
    companion: null,
    artifacts: {}, // id -> count
    echoes: 0,
    lastWasDup: false,
    setRewarded: false,
    cosmetics: ['default'],
    trail: 'default',

    hollow: null, // current dive field; see actions.ensureHollow
    hollowCount: 0,

    stats: {
      dives: 0,
      practiceDives: 0,
      glowEarned: 0,
      lanternsLit: 0,
      hollowsAwakened: 0,
      homecomings: 0,
      bestChain: 0,
      bestDive: 0,
      rekindlesUsed: 0,
      bumperHits: 0,
      upgradesBought: 0,
      creaturesFound: 0,
      artifactsFound: 0,
      artifactsOwned: 0,
      pets: 0
    },

    caseIdx: 0, // index into CASE_FILES of the active case
    daily: { day: '', ids: [], base: {}, claimed: [] },
    event: { cycle: -1, points: 0, claimed: [] },

    flags: {}, // onboarding beats already shown
    settings: { sfx: true, music: true, haptics: true, reducedMotion: false, aimGuide: true }
  };
}

const worldOf = (s) => WORLDS[s.worldId];
const upgradeLevel = (s, id) => s.upgrades[id] || 0;

/** Sum of `fx` over every purchased upgrade level, plus the companion's mods. */
function modsOf(s) {
  const m = {
    sparkCap: 0,
    homeMult: T.homeMult,
    moteBonus: 0,
    lanternValue: 0,
    hollowBonus: 0,
    bumpers: 0,
    bumperValue: 0,
    geysers: 0
  };
  const world = worldOf(s);
  for (const up of world.upgrades) {
    const lvl = upgradeLevel(s, up.id);
    for (let i = 0; i < lvl; i++) for (const k in up.levels[i].fx) m[k] += up.levels[i].fx[k];
  }
  const comp = world.creatures.find((c) => c.id === s.companion);
  if (comp && s.creatures[comp.id]) Object.assign(m, comp.ability.mods);
  return m;
}

const sparkCap = (s) => T.sparkCap + modsOf(s).sparkCap;

/** Total upgrade levels bought in the current world. */
function totalLevels(s) {
  let n = 0;
  for (const up of worldOf(s).upgrades) n += upgradeLevel(s, up.id);
  return n;
}

function maxLevels(s) {
  let n = 0;
  for (const up of worldOf(s).upgrades) n += up.levels.length;
  return n;
}

/** 0..1 restoration of the current world. Drives how alive the diorama looks. */
const restoration = (s) => totalLevels(s) / maxLevels(s);

function rankOf(s) {
  const xs = T.rankXp;
  let r = 0;
  while (r + 1 < xs.length && s.xp >= xs[r + 1]) r++;
  const top = r + 1 >= xs.length;
  return {
    rank: r,
    name: T.rankNames[Math.min(r, T.rankNames.length - 1)],
    into: s.xp - xs[r],
    need: top ? 0 : xs[r + 1] - xs[r],
    top
  };
}

/** Bond level 0..3 from encounter count. */
function bondLevel(bond) {
  let lvl = 0;
  for (const th of T.bondThresholds) if (bond >= th) lvl++;
  return lvl;
}

/**
 * Add Sparks earned by waiting. Safe against a clock that jumps backwards
 * (the timer simply restarts) and never exceeds the cap.
 */
function regenSparks(s, now) {
  const cap = sparkCap(s);
  const interval = T.sparkRegenSec * 1000;
  if (now < s.sparkStamp) s.sparkStamp = now;
  if (s.sparks >= cap) {
    s.sparkStamp = now;
    return 0;
  }
  const gained = Math.min(Math.floor((now - s.sparkStamp) / interval), cap - s.sparks);
  if (gained > 0) {
    s.sparks += gained;
    s.sparkStamp = s.sparks >= cap ? now : s.sparkStamp + gained * interval;
  }
  return gained;
}

/** Seconds until the next Spark, or 0 when full. */
function nextSparkIn(s, now) {
  if (s.sparks >= sparkCap(s)) return 0;
  return Math.max(0, (s.sparkStamp + T.sparkRegenSec * 1000 - now) / 1000);
}

/** What the next level of an upgrade costs, or null when maxed/locked. */
function upgradeOffer(s, up) {
  const lvl = upgradeLevel(s, up.id);
  const locked = totalLevels(s) < up.unlockAt;
  const maxed = lvl >= up.levels.length;
  return {
    lvl,
    max: up.levels.length,
    locked,
    lockNeed: Math.max(0, up.unlockAt - totalLevels(s)),
    maxed,
    cost: maxed ? null : up.levels[lvl].cost,
    note: maxed ? 'Fully restored' : up.levels[lvl].note,
    affordable: !locked && !maxed && s.glow >= up.levels[lvl].cost
  };
}

const anyAffordable = (s) => worldOf(s).upgrades.some((up) => upgradeOffer(s, up).affordable);

export { SAVE_VERSION, newState, worldOf, upgradeLevel, modsOf, sparkCap, totalLevels, maxLevels, restoration, rankOf, bondLevel, regenSparks, nextSparkIn, upgradeOffer, anyAffordable };
