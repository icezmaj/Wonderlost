// Runs one dive: turns touches into sim inputs, steps the sim on a fixed
// clock, fans sim events out to sound/visuals, and hands the finished dive to
// the economy. The controller owns no rules - those live in sim/ and progression/.

import { TUNING as T } from '../config/tuning.js';
import { TRAILS } from '../config/events.js';
import { createDive, launch, rekindle, step, summarize, previewPath, clampLaunchAngle, STEP } from '../sim/diveSim.js';
import { buildLevel } from '../sim/level.js';
import { modsOf, worldOf } from '../progression/state.js';
import { startDive, ensureHollow, settleDive } from '../progression/actions.js';
import { createDiveView } from '../render/diveView.js';
import { sfx } from '../audio/audio.js';
import { track } from '../analytics/analytics.js';

function createDiveController(app) {
  const view = createDiveView();
  let sim = null;
  let d = null; // per-dive scratch state

  /** Begin a dive. Returns false when there is no Spark to spend. */
  function start(practice) {
    const s = app.state;
    const now = Date.now();
    if (practice) ensureHollow(s);
    else if (!startDive(s, now).ok) return false;
    const mods = modsOf(s);
    sim = createDive(buildLevel(s.hollow, mods, worldOf(s).dive), mods);
    view.begin(sim, (TRAILS[s.trail] || TRAILS.default).colors, s.settings.reducedMotion);
    d = { practice, pointer: null, aim: null, acc: 0, ended: 0, settled: false, teach: false, hintUntil: 0, first: s.stats.dives === 0 && !practice };
    track('action_spent', { hollow: s.hollow.index, sparks_left: s.sparks, practice });
    if (!practice && s.sparks === 0) track('sparks_depleted', { next_in: T.sparkRegenSec });
    app.save();
    app.ui.showDive(sim, practice);
    let hint = d.first ? 'Touch and drag to aim. Let go to drop your Spark.' : null;
    // the first time a spinning cog appears, say what it does
    if (!hint && !s.flags.cogs && sim.ents.some((e) => e.kind === 'cog')) {
      s.flags.cogs = true;
      hint = 'New: spinning cogs fling your Spark the way they turn.';
    }
    if (!hint && !s.flags.ice && sim.level.segments.some((g) => g.kind === 'ice')) {
      s.flags.ice = true;
      hint = 'New: ice slides. Your Spark glides along them instead of bouncing.';
    }
    if (!hint && !s.flags.gusts && sim.ents.some((e) => e.kind === 'gust')) {
      s.flags.gusts = true;
      hint = 'New: gusts of wind push your Spark sideways. The aim guide shows the bend.';
    }
    app.ui.hint(hint);
    return true;
  }

  function onSimEvent(ev) {
    view.onEvent(ev);
    switch (ev.type) {
      case 'mote':
        sfx.mote(ev.chain);
        break;
      case 'lantern':
        sfx.lantern();
        break;
      case 'bumper':
      case 'cog':
        sfx.bumper(ev.chain % 7);
        break;
      case 'thud':
        sfx.thud();
        break;
      case 'wall':
      case 'ledge':
        sfx.wall();
        break;
      case 'geyser':
      case 'gust':
        sfx.geyser();
        break;
      case 'creature': {
        sfx.creature();
        const def = worldOf(app.state).creatures.find((c) => c.id === ev.creature);
        if (def) view.pop(ev.x, ev.y - 30, def.name + ' woke up!', '#cfe8ff', 16, 1.5);
        break;
      }
      case 'relic':
        sfx.relic();
        break;
      case 'tier':
        if (ev.tier > 1) sfx.tier(ev.tier);
        break;
      case 'awaken':
        sfx.awaken();
        break;
      case 'end':
        if (ev.outcome === 'home') sfx.home();
        else sfx.mist();
        break;
      default:
    }
  }

  function settle() {
    const s = app.state;
    d.settled = true;
    app.ui.hint(null);
    const result = summarize(sim);
    const sum = settleDive(s, result, Date.now(), d.practice);
    if (!d.practice) {
      track('reward_granted', {
        outcome: sum.outcome,
        glow: sum.total,
        chain: sum.bestChain,
        lanterns: sum.lanternsLitNow,
        seconds: Math.round(result.seconds * 10) / 10,
        rekindles: result.rekindlesUsed,
        hollow_done: sum.hollowDone
      });
      if (d.first) track('tutorial_step', { step: 'first_reward' });
      if (sum.hollowDone) track('hollow_awakened', { hollow: s.hollow.index, dives: s.hollow.dives });
      if (sum.creature) track('collection_added', { kind: 'creature', id: sum.creature.id, is_new: sum.creature.isNew });
      if (sum.artifact && sum.artifact.id) track('collection_added', { kind: 'artifact', id: sum.artifact.id, is_new: sum.artifact.isNew });
      for (const up of sum.rankUps) track('rank_up', { rank: up.rank });
      if (sum.artifact && sum.artifact.setComplete) app.world.invalidate();
    }
    app.save();
    app.ui.showReward(sum, {
      again: (practiceOnly) => app.dive(practiceOnly, true),
      home: () => app.goHome()
    });
  }

  function update(dt) {
    if (!sim) return;
    const s = app.state;

    // One-time lesson: on the second dive, time almost stops until the player rekindles.
    if (!d.teach && !d.practice && !s.flags.rekindle && s.stats.dives >= 1 && sim.phase === 'fly' && sim.tick > 84 && sim.rekindles > 0) {
      d.teach = true;
      d.teachLeft = 12;
      app.ui.hint('Touch and hold to slow time. Aim, then let go to Rekindle.');
    }
    // Never trap anyone in the lesson: after 12 s the dive simply carries on.
    if (d.teach && !d.pointer && (d.teachLeft -= dt) <= 0) {
      d.teach = false;
      s.flags.rekindle = true;
      app.ui.hint(null);
    }
    if (d.hintUntil && performance.now() > d.hintUntil) {
      d.hintUntil = 0;
      app.ui.hint(null);
    }

    const holding = d.pointer && sim.phase === 'fly' && sim.rekindles > 0;
    const scale = holding ? T.slowMo : d.teach ? 0.035 : 1;
    d.acc += dt * scale;
    while (d.acc >= STEP && sim.phase === 'fly') {
      step(sim);
      d.acc -= STEP;
    }
    if (sim.phase !== 'fly') d.acc = 0;
    for (const ev of sim.events) onSimEvent(ev);
    sim.events.length = 0;

    // aim guide
    d.aim = null;
    if (d.pointer) {
      const full = s.settings.aimGuide;
      if (sim.phase === 'aim') {
        const L = sim.level.launcher;
        const a = clampLaunchAngle(Math.atan2(d.pointer.y - L.y, d.pointer.x - L.x));
        const pts = previewPath(sim.level, L.x, L.y, Math.cos(a) * T.launchSpeed, Math.sin(a) * T.launchSpeed, full ? 150 : 36);
        d.aim = { mode: 'launch', pts };
      } else if (holding) {
        const sp = sim.spark;
        const a = Math.atan2(d.pointer.y - sp.y, d.pointer.x - sp.x);
        const pts = previewPath(sim.level, sp.x, sp.y, Math.cos(a) * T.dashSpeed, Math.sin(a) * T.dashSpeed, full ? 110 : 30);
        d.aim = { mode: 'rekindle', pts };
      }
    }

    view.update(dt, sim);
    app.ui.updateDive(sim);

    if (sim.phase === 'done' && !d.settled) {
      d.ended += dt;
      if (d.ended > (sim.outcome === 'home' ? 1.25 : 0.85)) settle();
    }
  }

  function draw(ctx, W, H, px) {
    if (sim) view.draw(ctx, W, H, px, sim, d.aim);
  }

  // ------------------------------------------------------------ input

  function pointerDown(x, y) {
    if (!sim || d.settled) return;
    const [fx, fy] = view.toField(x, y);
    if (sim.phase === 'aim') d.pointer = { x: fx, y: fy };
    else if (sim.phase === 'fly') {
      if (sim.rekindles > 0) {
        d.pointer = { x: fx, y: fy };
        sfx.slow();
      } else if (!d.warned) {
        d.warned = true;
        view.pop(sim.spark.x, sim.spark.y - 26, 'No Rekindle left', '#b7afe0', 13, 1);
      }
    }
  }

  function pointerMove(x, y) {
    if (!sim || !d.pointer) return;
    const [fx, fy] = view.toField(x, y);
    d.pointer.x = fx;
    d.pointer.y = fy;
  }

  function pointerUp() {
    if (!sim || !d.pointer) return;
    const p = d.pointer;
    d.pointer = null;
    const s = app.state;
    if (sim.phase === 'aim') {
      const L = sim.level.launcher;
      launch(sim, Math.atan2(p.y - L.y, p.x - L.x));
      sfx.launch();
      if (d.first) {
        track('tutorial_step', { step: 'first_launch' });
        app.ui.hint('Light the lanterns, then land in the glowing Hearth.');
        d.hintUntil = performance.now() + 3800;
      } else app.ui.hint(null);
    } else if (sim.phase === 'fly' && sim.rekindles > 0) {
      const sp = sim.spark;
      if (Math.hypot(p.x - sp.x, p.y - sp.y) < 12) return; // too close to mean a direction
      if (rekindle(sim, Math.atan2(p.y - sp.y, p.x - sp.x))) {
        sfx.rekindle();
        if (d.teach || !s.flags.rekindle) {
          d.teach = false;
          app.ui.hint(null);
          if (!s.flags.rekindle && !d.practice) {
            s.flags.rekindle = true;
            track('tutorial_step', { step: 'first_rekindle' });
            if (s.flags.built) track('tutorial_complete', { seconds_since_install: Math.round((Date.now() - s.createdAt) / 1000) });
          }
        }
      }
    }
  }

  function pointerCancel() {
    if (d) d.pointer = null;
  }

  return { start, update, draw, pointerDown, pointerMove, pointerUp, pointerCancel, stop: () => (sim = null) };
}

export { createDiveController };
