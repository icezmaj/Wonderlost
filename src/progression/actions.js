// Every change to player state goes through one of these functions. They are
// synchronous, take the clock as an argument, and return a plain summary the UI
// can animate - which is also the shape a server-authoritative version would
// return over the wire.

import { TUNING as T } from '../config/tuning.js';
import { mulberry32, hashSeed, pick } from '../core/rng.js';
import { worldOf, modsOf, rankOf, bondLevel, upgradeLevel, upgradeOffer, totalLevels, maxLevels, regenSparks, isUnlocked } from './state.js';
import { grant, bumpWorld } from './objectives.js';
import { WORLDS, WORLD_ORDER } from '../config/worlds.js';
import { addEventPoints } from './events.js';

const creatureArrived = (s, c) => c.arrives.always || upgradeLevel(s, c.arrives.upgrade) >= c.arrives.level;

/** Add XP; returns the ranks gained (each grants bonus Sparks). */
function addXp(s, amount) {
  const before = rankOf(s).rank;
  s.xp += Math.max(0, Math.round(amount));
  const after = rankOf(s).rank;
  const ups = [];
  for (let r = before + 1; r <= after; r++) {
    s.sparks += T.rankUpSparks;
    ups.push({ rank: r, name: T.rankNames[Math.min(r, T.rankNames.length - 1)], sparks: T.rankUpSparks });
  }
  return ups;
}

/**
 * Make sure there is an unfinished hollow to dive into. What a hollow hides is
 * decided once, here, from its seed - not at reveal time.
 */
function ensureHollow(s) {
  if (s.hollow && !s.hollow.lit.every(Boolean)) return s.hollow;
  const index = s.hollowCount;
  const seed = hashSeed(s.playerKey, s.worldId, index);
  const rng = mulberry32(seed ^ 0x9e3779b9);
  const world = worldOf(s);

  const relicRoll = rng();
  const relic = index === 1 || (index > 1 && relicRoll < T.relicChance);

  let bubble = null;
  const creatureRoll = rng();
  const arrived = world.creatures.filter((c) => creatureArrived(s, c));
  const fresh = arrived.filter((c) => !s.creatures[c.id]);
  if (fresh.length) {
    if (index === 0 || creatureRoll < fresh[0].chance) bubble = fresh[0].id;
  } else {
    const growing = arrived.filter((c) => bondLevel(s.creatures[c.id].bond) < T.bondThresholds.length);
    if (growing.length && creatureRoll < T.rebondChance) bubble = pick(rng, growing).id;
  }
  const def = world.creatures.find((c) => c.id === bubble);

  s.hollow = {
    index,
    seed,
    lit: new Array(T.lanternsPerHollow).fill(false),
    dives: 0,
    relic,
    relicTaken: false,
    bubble,
    bubbleTaken: false,
    bubbleMoving: !!(def && def.moving)
  };
  s.hollowCount++;
  return s.hollow;
}

/** Spend a Spark to begin a dive. */
function startDive(s, now) {
  regenSparks(s, now);
  ensureHollow(s);
  if (s.sparks <= 0) return { ok: false, reason: 'no_sparks' };
  s.sparks--;
  return { ok: true };
}

function checkSetComplete(s, world) {
  if (s.sets[world.artifactSet.id]) return false;
  if (!world.artifactSet.items.every((it) => s.artifacts[it.id])) return false;
  s.sets[world.artifactSet.id] = true;
  grant(s, world.artifactSet.reward);
  return true;
}

/**
 * Open a relic crate. Rules (disclosed in the Finds sheet):
 *  - 70% new artifact / 30% duplicate while any are missing
 *  - the first crate is always new, and never two duplicates in a row
 *  - a duplicate becomes 1 Echo; 3 Echoes buy any missing artifact
 *  - once the set is complete a crate holds Glow instead
 */
function drawArtifact(s, world, rng) {
  const items = world.artifactSet.items;
  const missing = items.filter((it) => !s.artifacts[it.id]);
  const owned = items.filter((it) => s.artifacts[it.id]);
  if (!missing.length) return { glow: T.setCompleteCrateGlow };
  s.stats.artifactsFound++;
  const roll = rng();
  if (s.lastWasDup || !owned.length || roll < T.artifactNewChance) {
    const it = pick(rng, missing);
    s.artifacts[it.id] = 1;
    s.lastWasDup = false;
    s.stats.artifactsOwned++;
    bumpWorld(s, 'artifactsOwned');
    return { id: it.id, isNew: true, setComplete: checkSetComplete(s, world) };
  }
  const it = pick(rng, owned);
  s.artifacts[it.id]++;
  s.echoes++;
  s.lastWasDup = true;
  return { id: it.id, isNew: false, echo: 1 };
}

/** Spend Echoes to take a specific missing artifact. */
function craftArtifact(s, id) {
  const world = worldOf(s);
  if (s.echoes < T.echoCost || s.artifacts[id] || !world.artifactSet.items.some((it) => it.id === id)) return null;
  s.echoes -= T.echoCost;
  s.artifacts[id] = 1;
  s.stats.artifactsOwned++;
  bumpWorld(s, 'artifactsOwned');
  return { id, setComplete: checkSetComplete(s, world) };
}

function befriend(s, id) {
  const was = s.creatures[id];
  const before = was ? bondLevel(was.bond) : 0;
  if (!was) {
    s.creatures[id] = { bond: 1 };
    s.stats.creaturesFound++;
    bumpWorld(s, 'creaturesFound');
    if (!s.companion) s.companion = id;
  } else {
    was.bond++;
  }
  const level = bondLevel(s.creatures[id].bond);
  return { id, isNew: !was, bond: s.creatures[id].bond, level, levelUp: level > before };
}

/**
 * Turn a finished dive (diveSim.summarize) into rewards.
 * One dive feeds: Glow, hollow progress, XP/rank, case files, dailies, the live
 * event, creature bonds and the artifact set.
 */
function settleDive(s, result, now, practice = false) {
  const world = worldOf(s);
  const mods = modsOf(s);
  const h = s.hollow;
  const sum = {
    practice,
    outcome: result.outcome,
    gathered: result.gathered,
    bestChain: result.bestChain,
    home: result.outcome === 'home',
    homeMult: 1,
    homeBonus: 0,
    lanternsLitNow: result.lanternsLitNow,
    lit: result.lit.slice(),
    hollowDone: false,
    hollowBonus: 0,
    sparkRefund: 0,
    crateGlow: 0,
    total: 0,
    creature: null,
    artifact: null,
    rankUps: [],
    eventPoints: 0
  };
  if (practice) {
    s.stats.practiceDives++;
    return sum;
  }

  h.dives++;
  h.lit = result.lit.slice();

  let total = result.gathered;
  if (sum.home) {
    sum.homeMult = mods.homeMult;
    sum.homeBonus = Math.round(result.gathered * mods.homeMult) - result.gathered;
    total += sum.homeBonus;
    s.stats.homecomings++;
    bumpWorld(s, 'homecomings');
  }
  if (result.gotRelic && h.relic && !h.relicTaken) {
    h.relicTaken = true;
    sum.artifact = drawArtifact(s, world, mulberry32(h.seed ^ 0x51ed270b));
    if (sum.artifact.glow) {
      sum.crateGlow = sum.artifact.glow;
      total += sum.crateGlow;
    }
  }
  if (result.gotCreature && h.bubble === result.gotCreature && !h.bubbleTaken) {
    h.bubbleTaken = true;
    sum.creature = befriend(s, result.gotCreature);
  }
  if (h.lit.every(Boolean)) {
    sum.hollowDone = true;
    sum.hollowBonus = T.hollowBonus + mods.hollowBonus;
    total += sum.hollowBonus;
    s.stats.hollowsAwakened++;
    bumpWorld(s, 'hollowsAwakened');
    if (h.dives <= T.swiftDives) {
      sum.sparkRefund = 1;
      s.sparks++;
    }
  }

  sum.total = total;
  s.glow += total;
  const st = s.stats;
  st.dives++;
  st.glowEarned += total;
  st.lanternsLit += result.lanternsLitNow;
  st.rekindlesUsed += result.rekindlesUsed;
  st.bumperHits += result.bumperHits;
  bumpWorld(s, 'dives');
  bumpWorld(s, 'lanternsLit', result.lanternsLitNow);
  if (result.cogHits) bumpWorld(s, 'cogHits', result.cogHits);
  if (result.bestChain > st.bestChain) st.bestChain = result.bestChain;
  if (total > st.bestDive) st.bestDive = total;

  sum.rankUps = addXp(s, total);
  sum.eventPoints = addEventPoints(s, sum, now);
  return sum;
}

/** Buy the next level of a restoration upgrade. */
function buyUpgrade(s, id) {
  const up = worldOf(s).upgrades.find((u) => u.id === id);
  if (!up) return { ok: false, reason: 'unknown' };
  const offer = upgradeOffer(s, up);
  if (offer.locked) return { ok: false, reason: 'locked' };
  if (offer.maxed) return { ok: false, reason: 'maxed' };
  if (s.glow < offer.cost) return { ok: false, reason: 'glow', short: offer.cost - s.glow };
  const lockedBefore = WORLD_ORDER.filter((w) => !isUnlocked(s, w));
  s.glow -= offer.cost;
  s.upgrades[id] = offer.lvl + 1;
  s.stats.upgradesBought++;
  bumpWorld(s, 'upgradesBought');
  const rankUps = addXp(s, offer.cost * 0.5);
  const opened = lockedBefore.filter((w) => isUnlocked(s, w)).map((w) => WORLDS[w]);
  return { ok: true, id, level: offer.lvl + 1, cost: offer.cost, rankUps, opened, worldComplete: totalLevels(s) === maxLevels(s) };
}

/**
 * Move to another open world. Each world keeps its own unfinished hollow and
 * hollow count; everything else (Glow, Sparks, rank, friends) comes along.
 */
function travel(s, worldId) {
  if (!WORLDS[worldId] || worldId === s.worldId) return { ok: false, reason: 'same' };
  if (!isUnlocked(s, worldId)) return { ok: false, reason: 'locked' };
  s.byWorld[s.worldId] = { hollow: s.hollow, hollowCount: s.hollowCount };
  const there = s.byWorld[worldId] || { hollow: null, hollowCount: 0 };
  s.worldId = worldId;
  s.hollow = there.hollow;
  s.hollowCount = there.hollowCount;
  return { ok: true, world: WORLDS[worldId], first: there.hollowCount === 0 };
}

function setCompanion(s, id) {
  if (!s.creatures[id]) return false;
  s.companion = id;
  return true;
}

function setTrail(s, id) {
  if (!s.cosmetics.includes(id)) return false;
  s.trail = id;
  return true;
}

function petCreature(s) {
  s.stats.pets++;
}

export { addXp, ensureHollow, startDive, drawArtifact, craftArtifact, settleDive, buyUpgrade, travel, setCompanion, setTrail, petCreature };
