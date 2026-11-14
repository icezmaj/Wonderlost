// Wonderlost - entry point. Boots the save, sizes the stage, owns the frame
// loop and the three screens (title -> home <-> dive).

import { safeStorage, load, save, reset } from './persistence/save.js';
import { initAnalytics, track, flushAnalytics } from './analytics/analytics.js';
import { initAudio, resumeAudio, sfx } from './audio/audio.js';
import { newState, regenSparks, restoration } from './progression/state.js';
import { petCreature } from './progression/actions.js';
import { refreshDaily } from './progression/objectives.js';
import { refreshEvent } from './progression/events.js';
import { createWorldView } from './render/worldView.js';
import { glow, additive } from './render/gfx.js';
import { loadAssets, setSlotDebug } from './render/assets.js';
import { createDiveController } from './game/diveController.js';
import { createUi } from './ui/ui.js';

loadAssets();
const slotsFromUrl = /[?&]slots\b/.test(location.search);

const store = safeStorage();
const boot = load(store, Date.now());

const appEl = document.getElementById('app');
const stage = document.getElementById('stage');
const ctx = stage.getContext('2d');
const view = { W: 360, H: 760, px: 1, scale: 1 };

const app = {
  state: boot.state,
  store,
  screen: 'title',
  world: null,
  ui: null,
  sessionStart: Date.now(),
  sessionDives: 0,

  save() {
    save(store, app.state, Date.now());
    flushAnalytics();
  },

  /** Title button. New players go straight into their first dive. */
  begin() {
    initAudio(app.state.settings);
    resumeAudio();
    sfx.tap();
    if (app.state.stats.dives === 0) app.dive(false, true);
    else app.ui.wipe(() => app.goHome());
  },

  dive(practice, force) {
    if (!force && app.ui.blocking()) return;
    resumeAudio();
    app.ui.wipe(() => {
      if (dive.start(practice)) {
        app.screen = 'dive';
        app.sessionDives++;
      } else app.goHome();
    });
  },

  goHome() {
    const now = Date.now();
    dive.stop();
    app.screen = 'home';
    regenSparks(app.state, now);
    refreshDaily(app.state, now);
    refreshEvent(app.state, now);
    app.ui.hint(null);
    app.ui.show('home');
    app.ui.refresh();
    if (!app.state.flags.homeCoach && app.state.stats.dives > 0) {
      app.state.flags.homeCoach = true;
      app.ui.toast('Glow restores the village. Collect your case reward, then tap <b>Restore</b>.');
    }
    app.save();
  },

  resetProgress() {
    track('save_reset', {});
    reset(store);
    app.state = newState(Date.now());
    initAnalytics({ playerKey: app.state.playerKey, createdAt: app.state.createdAt, store });
    app.world.invalidate();
    dive.stop();
    app.screen = 'title';
    app.ui.show('title');
    app.ui.toast('Progress erased. A fresh case awaits.');
  }
};

app.world = createWorldView(() => app.state);
const dive = createDiveController(app);
app.ui = createUi(app);

initAnalytics({ playerKey: app.state.playerKey, createdAt: app.state.createdAt, store });
if (boot.fresh) track('first_open', {});
track('session_start', {
  days_since_install: Math.floor((Date.now() - app.state.createdAt) / 86400000),
  sparks: app.state.sparks,
  restoration: restoration(app.state)
});
if (boot.recovered) app.ui.toast('Your saved game could not be read, so a new one was started.');

// ------------------------------------------------------------ stage sizing

function resize() {
  const host = appEl.parentElement;
  const availW = host.clientWidth || window.innerWidth;
  const availH = host.clientHeight || window.innerHeight;
  // Portrait stage: never wider than ~half its height, so desktop shows a phone-shaped column.
  const cssW = Math.max(260, Math.min(availW, Math.round(availH * 0.52)));
  appEl.style.width = cssW + 'px';
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  stage.width = Math.round(cssW * dpr);
  stage.height = Math.round(availH * dpr);
  view.scale = cssW / 360;
  view.W = 360;
  view.H = availH / view.scale;
  view.px = view.scale * dpr;
  // UI text scales gently with the stage so tall phones are not tiny.
  appEl.style.setProperty('--u', Math.max(0.86, Math.min(1.25, view.scale)).toFixed(3));
}
window.addEventListener('resize', resize);
resize();

// ------------------------------------------------------------ input

function local(e) {
  const r = stage.getBoundingClientRect();
  return [(e.clientX - r.left) / view.scale, (e.clientY - r.top) / view.scale];
}

stage.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  resumeAudio();
  const [x, y] = local(e);
  if (app.screen === 'dive') {
    try {
      stage.setPointerCapture(e.pointerId);
    } catch (err) {
      /* not critical */
    }
    dive.pointerDown(x, y);
  } else if (app.screen === 'home' && !app.ui.blocking()) {
    const id = app.world.tap(x, y);
    if (id) {
      petCreature(app.state);
      sfx.pet();
      app.save();
      app.ui.refresh();
    }
  }
});
stage.addEventListener('pointermove', (e) => {
  if (app.screen !== 'dive') return;
  const [x, y] = local(e);
  dive.pointerMove(x, y);
});
stage.addEventListener('pointerup', () => app.screen === 'dive' && dive.pointerUp());
stage.addEventListener('pointercancel', () => app.screen === 'dive' && dive.pointerCancel());
stage.addEventListener('contextmenu', (e) => e.preventDefault());

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    track('session_end', { seconds: Math.round((Date.now() - app.sessionStart) / 1000), dives: app.sessionDives });
    app.save();
  } else {
    app.sessionStart = Date.now();
    app.sessionDives = 0;
    if (app.screen === 'home') app.goHome();
  }
});

// ------------------------------------------------------------ frame loop

let last = null; // timestamp of the previous frame
let clock = 0;
let frames = 0;
let frameErrors = 0;

function titleVeil() {
  const { W, H } = view;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, 'rgba(10,8,31,.92)');
  g.addColorStop(0.34, 'rgba(10,8,31,.25)');
  g.addColorStop(0.62, 'rgba(10,8,31,.2)');
  g.addColorStop(1, 'rgba(10,8,31,.9)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // sparks drifting up out of the teapot
  additive(ctx, () => {
    for (let i = 0; i < 14; i++) {
      const k = (clock * 0.07 + i / 14) % 1;
      const x = W / 2 + Math.sin(i * 2.4 + clock * 0.5) * (30 + k * 110);
      const y = H * 0.66 - k * H * 0.5;
      glow(ctx, x, y, 5 + (1 - k) * 7, i % 3 ? '#ffcf5c' : '#7fe3d8', Math.sin(k * Math.PI) * 0.9);
    }
  });
}

function frame(now) {
  // Time never runs backwards: the first frame's timestamp can be earlier
  // than "now" was when the script started, and animation code assumes t >= 0.
  const dt = last === null ? 0 : Math.max(0, Math.min(0.05, (now - last) / 1000));
  last = now;
  clock += dt;
  frames++;
  // One bad frame must never stop the game: always schedule the next one.
  try {
    setSlotDebug(slotsFromUrl || app.state.settings.artSlots);
    ctx.setTransform(view.px, 0, 0, view.px, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    if (app.screen === 'dive') {
      dive.update(dt);
      dive.draw(ctx, view.W, view.H, view.px);
    } else {
      app.world.update(dt);
      app.world.draw(ctx, view.W, view.H, view.px);
      if (app.screen === 'title') titleVeil();
    }
  } catch (err) {
    if (frameErrors++ < 5) console.error('[frame]', err);
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Handy for playtests and automated checks; not used by the game itself.
window.__wonderlost = { app, view, frames: () => frames, frameErrors: () => frameErrors };
