// The DOM layer: title, home HUD, dive HUD, hints and toasts. Text and buttons
// live in HTML (crisp, accessible, easy to restyle); the canvas underneath is
// only ever the world.

import { ICON, rewardHtml, rewardText } from './dom.js';
import { fmt, fmtTime } from '../core/util.js';
import { TUNING as T } from '../config/tuning.js';
import { rankOf, nextSparkIn, restoration, anyAffordable, worldOf } from '../progression/state.js';
import { caseProgress, claimCase, dailyClaimable } from '../progression/objectives.js';
import { currentEvent, eventUnlocked, eventClaimable } from '../progression/events.js';
import { createSheets } from './sheets.js';
import { createReward } from './reward.js';
import { sfx } from '../audio/audio.js';
import { track } from '../analytics/analytics.js';

function createUi(app) {
  const root = document.getElementById('ui');
  root.innerHTML = `
    <section class="layer title" id="l-title">
      <div class="title-top">
        <p class="eyebrow">The Bureau of Lost Worlds</p>
        <h1 class="logo">Wonder<span>lost</span></h1>
      </div>
      <div class="title-bottom">
        <p class="case-line"><b>Case 001</b> · A cracked teapot<small>Something inside it is still warm.</small></p>
        <button class="btn btn-xl" id="b-begin">Open the case</button>
        <p class="fine">Prototype ${T.version} · progress saves on this device</p>
      </div>
    </section>

    <section class="layer home" id="l-home" hidden>
      <header class="top">
        <div class="rank" id="h-rank">
          <span class="rank-badge" id="h-rank-n">1</span>
          <span class="rank-body"><span class="rank-name" id="h-rank-name"></span><span class="bar"><i id="h-xp"></i></span></span>
        </div>
        <div class="pill" id="h-glow-pill" aria-label="Glow">${ICON.glow}<b id="h-glow">0</b></div>
        <div class="pill" id="h-spark-pill" aria-label="Sparks">${ICON.spark}<b id="h-sparks">0</b><small id="h-spark-t"></small></div>
        <button class="round" id="b-settings" aria-label="Settings">${ICON.gear}</button>
      </header>
      <button class="chip" id="b-case"></button>
      <button class="event-badge" id="b-board" hidden aria-label="Bureau board">${ICON.lantern}<span id="h-event-t"></span><i class="dot" hidden></i></button>
      <div class="spacer"></div>
      <div class="world-tag"><b id="h-world"></b><span id="h-restored"></span></div>
      <nav class="dock">
        <button class="dock-btn" id="b-restore">${ICON.hammer}<span>Restore</span><i class="dot" hidden></i></button>
        <button class="btn btn-dive" id="b-dive"><span class="dive-label">Dive</span><span class="dive-cost"></span></button>
        <button class="dock-btn" id="b-finds">${ICON.book}<span>Finds</span><i class="dot" hidden></i></button>
      </nav>
    </section>

    <section class="layer dive" id="l-dive" hidden>
      <div class="dive-hud">
        <div class="dh-left">
          <div class="pill big">${ICON.glow}<b id="d-glow">0</b></div>
          <div class="chain" id="d-chain"><span>Chain</span><b>0</b><em></em></div>
        </div>
        <div class="dh-right">
          <div class="pips" id="d-lanterns" aria-label="Lanterns lit"></div>
          <div class="pips rk" id="d-rekindles" aria-label="Rekindles left"></div>
        </div>
      </div>
      <div class="practice-tag" id="d-practice" hidden>Practice dive · no rewards</div>
    </section>

    <div class="hint" id="hint" hidden></div>
    <div class="scrim" id="scrim" hidden></div>
    <section class="sheet" id="sheet" hidden role="dialog" aria-modal="true"></section>
    <section class="reward" id="reward" hidden></section>
    <div class="toasts" id="toasts" aria-live="polite"></div>
    <div class="wipe" id="wipe"></div>
  `;
  const $ = (id) => root.querySelector('#' + id);
  const layers = { title: $('l-title'), home: $('l-home'), dive: $('l-dive') };

  function show(name) {
    for (const k in layers) layers[k].hidden = k !== name;
  }

  // ------------------------------------------------------------ toasts & hints

  function toast(html, kind = '') {
    const node = document.createElement('div');
    node.className = 'toast ' + kind;
    node.innerHTML = html;
    $('toasts').appendChild(node);
    setTimeout(() => node.classList.add('out'), 2600);
    setTimeout(() => node.remove(), 3100);
  }

  function hint(text) {
    const node = $('hint');
    if (!text) {
      node.hidden = true;
      return;
    }
    node.textContent = text;
    node.hidden = false;
  }

  /** Fade to night, run `fn`, fade back. */
  function wipe(fn) {
    const node = $('wipe');
    node.classList.add('on');
    setTimeout(() => {
      fn();
      requestAnimationFrame(() => node.classList.remove('on'));
    }, 240);
  }

  // ------------------------------------------------------------ home HUD

  let lastGlow = -1;

  function refresh() {
    const s = app.state;
    const now = Date.now();
    const rank = rankOf(s);
    $('h-rank-n').textContent = rank.rank + 1;
    $('h-rank-name').textContent = rank.name;
    $('h-xp').style.width = (rank.top ? 100 : Math.round((rank.into / rank.need) * 100)) + '%';

    const glowNode = $('h-glow');
    glowNode.textContent = fmt(s.glow);
    if (lastGlow >= 0 && s.glow !== lastGlow) {
      const pill = $('h-glow-pill');
      pill.classList.remove('bump');
      void pill.offsetWidth;
      pill.classList.add('bump');
    }
    lastGlow = s.glow;

    $('h-sparks').textContent = s.sparks;
    const wait = nextSparkIn(s, now);
    $('h-spark-t').textContent = wait > 0 ? fmtTime(wait) : '';

    $('h-world').textContent = worldOf(s).name;
    const pct = Math.round(restoration(s) * 100);
    $('h-restored').textContent = pct >= 100 ? 'Fully restored' : pct + '% restored';

    // case file chip
    const chip = $('b-case');
    const cp = caseProgress(s);
    if (!cp) {
      chip.className = 'chip closed';
      chip.innerHTML = `<span class="chip-kicker">Case files</span><span class="chip-text">All cases closed. New ones arrive with the next world.</span>`;
    } else {
      chip.className = 'chip' + (cp.done ? ' done' : '');
      chip.innerHTML = `
        <span class="chip-kicker">Case file ${cp.index + 1} of ${cp.total}</span>
        <span class="chip-text">${cp.c.text}</span>
        <span class="chip-foot">
          <span class="bar"><i style="width:${Math.round((cp.value / cp.c.target) * 100)}%"></i></span>
          <span class="chip-count">${cp.done ? 'Tap to collect' : cp.value + ' / ' + cp.c.target}</span>
          <span class="chip-reward">${rewardHtml(cp.c.reward)}</span>
        </span>`;
    }

    // dock
    const afford = anyAffordable(s);
    $('b-restore').querySelector('.dot').hidden = !afford;
    $('b-restore').classList.toggle('pulse', afford && s.stats.upgradesBought === 0);
    const dive = $('b-dive');
    const out = s.sparks <= 0;
    dive.classList.toggle('practice', out);
    dive.querySelector('.dive-label').textContent = out ? 'Practice' : 'Dive';
    dive.querySelector('.dive-cost').innerHTML = out ? `Next Spark ${fmtTime(wait)}` : `${ICON.spark}1`;

    // bureau board badge
    const board = $('b-board');
    const unlocked = eventUnlocked(s);
    board.hidden = !unlocked;
    if (unlocked) {
      const ev = currentEvent(now);
      $('h-event-t').textContent = fmtTime((ev.endsAt - now) / 1000);
      board.querySelector('.dot').hidden = !(eventClaimable(s, now) || dailyClaimable(s));
    }
  }

  // ------------------------------------------------------------ dive HUD

  let hudCache = '';

  function showDive(sim, practice) {
    show('dive');
    $('d-practice').hidden = !practice;
    hudCache = '';
    updateDive(sim);
  }

  function updateDive(sim) {
    const key = [sim.gathered, sim.chain, sim.rekindles, sim.lit.join('')].join('|');
    if (key === hudCache) return;
    hudCache = key;
    $('d-glow').textContent = fmt(sim.gathered);
    const chain = $('d-chain');
    chain.querySelector('b').textContent = sim.chain;
    chain.querySelector('em').textContent = sim.tier > 1 ? '×' + sim.tier : '';
    chain.className = 'chain' + (sim.chain > 0 ? ' live t' + sim.tier : '');
    $('d-lanterns').innerHTML = sim.lit.map((on) => `<i class="lp${on ? ' on' : ''}"></i>`).join('');
    const total = T.baseRekindles + (sim.mods.extraRekindles || 0);
    let rk = '';
    for (let i = 0; i < total; i++) rk += `<i class="rp${i < sim.rekindles ? ' on' : ''}">${ICON.spark}</i>`;
    $('d-rekindles').innerHTML = rk;
  }

  // ------------------------------------------------------------ wiring

  const sheets = createSheets(app, { toast, refresh, root });
  const reward = createReward(app, { root, toast });

  $('b-begin').addEventListener('click', () => app.begin());
  $('b-dive').addEventListener('click', () => {
    sfx.tap();
    app.dive(app.state.sparks <= 0);
  });
  $('b-restore').addEventListener('click', () => sheets.open('restore'));
  $('b-finds').addEventListener('click', () => sheets.open('finds'));
  $('b-board').addEventListener('click', () => sheets.open('board'));
  $('b-settings').addEventListener('click', () => sheets.open('settings'));
  $('b-case').addEventListener('click', () => {
    const cp = caseProgress(app.state);
    if (!cp) return;
    if (cp.done) {
      const c = claimCase(app.state);
      sfx.claim();
      toast(`<b>Case closed</b> ${rewardText(c.reward)}`, 'good');
      track('objective_claimed', { id: c.id, kind: 'case' });
      app.save();
      refresh();
    } else if (cp.c.nudge) {
      sheets.open(cp.c.nudge);
    } else {
      sfx.tap();
      toast('Dive into the teapot to work on this case.');
    }
  });

  setInterval(() => {
    if (!layers.home.hidden) refresh();
  }, 1000);

  return {
    show,
    refresh,
    toast,
    hint,
    wipe,
    showDive,
    updateDive,
    showReward: reward.show,
    openSheet: sheets.open,
    closeSheet: sheets.close,
    blocking: () => sheets.isOpen() || reward.isOpen()
  };
}

export { createUi };
