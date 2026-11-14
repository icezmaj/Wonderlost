// The reward reveal shown after every dive. One dive pays into several tracks
// at once (Glow, the hollow, rank, case file, live event, creatures, artifacts)
// and this screen is where the player sees them all tick forward together.

import { ICON, rewardText } from './dom.js';
import { fmt } from '../core/util.js';
import { rankOf, worldOf } from '../progression/state.js';
import { caseProgress } from '../progression/objectives.js';
import { currentEvent, eventUnlocked } from '../progression/events.js';
import { creaturePortrait, artifactPortrait } from '../render/creatures.js';
import { sfx } from '../audio/audio.js';

const HEAD = {
  home: ['Home at the Hearth', 'Your Spark made it all the way back.'],
  mist: ['Drifted into the mist', 'Everything it gathered still counts.'],
  fizzle: ['The Spark settled', 'Everything it gathered still counts.']
};

function createReward(app, { root }) {
  const node = root.querySelector('#reward');
  let open = false;
  let timers = [];

  function clear() {
    timers.forEach(clearTimeout);
    timers = [];
  }

  function countUp(target, to, ms) {
    const start = performance.now();
    let last = -1;
    const tick = (now) => {
      if (!open) return;
      const k = Math.min(1, (now - start) / ms);
      const v = Math.round(to * (1 - Math.pow(1 - k, 3)));
      if (v !== last) {
        target.textContent = fmt(v);
        if (k < 1) sfx.count();
        last = v;
      }
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /**
   * @param sum     settleDive() summary
   * @param cbs     { again(), home() }
   */
  function show(sum, cbs) {
    clear();
    open = true;
    const s = app.state;
    const world = worldOf(s);
    const [title, sub] = sum.practice ? ['Practice dive', 'No Sparks spent, nothing earned. Just for the joy of it.'] : HEAD[sum.outcome];
    const litCount = sum.lit.filter(Boolean).length;

    const lines = [];
    lines.push(['Gathered', fmt(sum.gathered), sum.bestChain >= 5 ? `best chain ${sum.bestChain}` : '']);
    if (sum.home && !sum.practice) lines.push([`Homecoming ×${sum.homeMult}`, '+' + fmt(sum.homeBonus), '']);
    if (sum.hollowDone) lines.push(['Hollow awakened', '+' + fmt(sum.hollowBonus), sum.sparkRefund ? 'swift: Spark refunded' : '']);
    if (sum.crateGlow) lines.push(['Relic crate', '+' + fmt(sum.crateGlow), 'set already complete']);

    const cards = [];
    if (sum.creature) {
      const def = world.creatures.find((c) => c.id === sum.creature.id);
      cards.push({
        kind: 'creature',
        id: def.id,
        badge: sum.creature.isNew ? 'New friend' : sum.creature.levelUp ? 'Bond grew' : 'Old friend',
        title: def.name,
        text: sum.creature.isNew ? def.persona : sum.creature.levelUp ? def.notes[sum.creature.level - 1] : 'Happy to see you again.'
      });
    }
    if (sum.artifact && sum.artifact.id) {
      const def = world.artifactSet.items.find((a) => a.id === sum.artifact.id);
      cards.push({
        kind: 'artifact',
        id: def.id,
        badge: sum.artifact.isNew ? 'New artifact' : 'Duplicate → 1 Echo',
        title: def.name,
        text: sum.artifact.isNew ? def.lore : 'Echoes can be traded for any artifact you are missing.'
      });
    }

    const rank = rankOf(s);
    const cp = caseProgress(s);
    const chips = [];
    chips.push(`<span class="rchip"><b>Rank ${rank.rank + 1}</b><span class="bar"><i style="width:${rank.top ? 100 : Math.round((rank.into / rank.need) * 100)}%"></i></span></span>`);
    if (cp) chips.push(`<span class="rchip${cp.done ? ' done' : ''}"><b>Case</b>${cp.done ? 'ready to collect' : cp.value + ' / ' + cp.c.target}</span>`);
    if (eventUnlocked(s) && sum.eventPoints > 0) {
      const ev = currentEvent(Date.now());
      chips.push(`<span class="rchip"><b>+${sum.eventPoints}</b>${ev.def.pointName}</span>`);
    }

    const extra = [];
    for (const up of sum.rankUps) extra.push(`<div class="rline promo"><span>Promoted to <b>${up.name}</b></span><span>${ICON.spark}+${up.sparks}</span></div>`);
    if (sum.artifact && sum.artifact.setComplete) {
      extra.push(`<div class="rline promo"><span><b>${world.artifactSet.name}</b> complete</span><span>${rewardText(world.artifactSet.reward)}</span></div>`);
    }

    const canAgain = s.sparks > 0;
    node.innerHTML = `
      <div class="rcard ${sum.practice ? 'practice' : sum.outcome}">
        <p class="eyebrow">${sum.practice ? 'No stakes' : 'Dive complete'}</p>
        <h2>${title}</h2>
        <p class="rsub">${sub}</p>
        ${sum.practice ? '' : `
        <div class="rlines">
          ${lines.map(([a, b, c]) => `<div class="rline"><span>${a}${c ? `<small>${c}</small>` : ''}</span><span>${b}</span></div>`).join('')}
        </div>
        <div class="rtotal">${ICON.glow}<b id="r-total">0</b><span>Glow</span></div>
        <div class="rhollow">
          <div class="pips">${sum.lit.map((on) => `<i class="lp${on ? ' on' : ''}"></i>`).join('')}</div>
          <span>${sum.hollowDone ? 'Every lantern lit. A new hollow awaits.' : `${sum.lit.length - litCount} lantern${sum.lit.length - litCount === 1 ? '' : 's'} left in this hollow`}</span>
        </div>
        ${cards.map((c, i) => `<div class="rfind" data-i="${i}"><div class="rfind-art"></div><div><span class="badge">${c.badge}</span><b>${c.title}</b><p>${c.text}</p></div></div>`).join('')}
        ${extra.join('')}
        <div class="rchips">${chips.join('')}</div>`}
        <div class="rbtns">
          <button class="btn btn-ghost" id="r-home">${ICON.home}<span>Village</span></button>
          <button class="btn" id="r-again">${canAgain ? `Dive again <span class="dive-cost">${ICON.spark}1</span>` : 'Practice dive'}</button>
        </div>
      </div>`;
    node.hidden = false;

    cards.forEach((c, i) => {
      const slot = node.querySelector(`.rfind[data-i="${i}"] .rfind-art`);
      slot.appendChild(c.kind === 'creature' ? creaturePortrait(c.id, 64) : artifactPortrait(c.id, 56));
    });

    // staged reveal: lines, then the total counts up, then discoveries
    const stage = [...node.querySelectorAll('.rline, .rtotal, .rhollow, .rfind, .rchips, .rbtns')];
    stage.forEach((n, i) => {
      n.classList.add('pre');
      timers.push(setTimeout(() => {
        n.classList.remove('pre');
        if (n.classList.contains('rfind')) sfx.reveal();
        if (n.classList.contains('promo')) sfx.rankUp();
      }, 180 + i * 130));
    });
    if (!sum.practice) {
      const totalNode = node.querySelector('#r-total');
      timers.push(setTimeout(() => countUp(totalNode, sum.total, 650), 180 + lines.length * 130));
    }

    const done = (fn) => () => {
      sfx.tap();
      close();
      fn(!canAgain);
    };
    node.querySelector('#r-home').addEventListener('click', done(cbs.home));
    node.querySelector('#r-again').addEventListener('click', done(cbs.again));
  }

  function close() {
    clear();
    open = false;
    node.hidden = true;
    node.innerHTML = '';
  }

  return { show, close, isOpen: () => open };
}

export { createReward };
