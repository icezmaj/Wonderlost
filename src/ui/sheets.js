// Bottom sheets: Restore, Finds (creatures + artifacts), the Bureau Board
// (live event + daily tasks) and Settings. Each sheet is re-rendered from state
// after every action, so what the player sees can never drift from the save.

import { ICON, rewardHtml, rewardText } from './dom.js';
import { fmt, fmtTime } from '../core/util.js';
import { TUNING as T } from '../config/tuning.js';
import { COMING_SOON } from '../config/worlds.js';
import { TRAILS, EVENT_UNLOCK_RANK } from '../config/events.js';
import { worldOf, upgradeOffer, restoration, bondLevel } from '../progression/state.js';
import { buyUpgrade, setCompanion, setTrail, craftArtifact } from '../progression/actions.js';
import { dailyList, claimDaily, refreshDaily } from '../progression/objectives.js';
import { currentEvent, eventUnlocked, eventMilestones, claimMilestone } from '../progression/events.js';
import { creaturePortrait, artifactPortrait } from '../render/creatures.js';
import { sfx, applySettings } from '../audio/audio.js';
import { track } from '../analytics/analytics.js';

const SETTINGS = [
  ['sfx', 'Sound effects', 'Chimes, bells and whooshes'],
  ['music', 'Music box', 'A quiet generative tune'],
  ['haptics', 'Vibration', 'Small taps on phones that support it'],
  ['aimGuide', 'Aim guide', 'Show the dotted path before you launch'],
  ['reducedMotion', 'Reduce motion', 'No screen shake, softer flashes']
];

function createSheets(app, { toast, refresh, root }) {
  const sheet = root.querySelector('#sheet');
  const scrim = root.querySelector('#scrim');
  let current = null;
  let tab = 'creatures';
  let picked = null; // selected artifact id
  let confirmReset = false;

  const head = (kicker, title) => `
    <header class="sh-head">
      <div><p class="eyebrow">${kicker}</p><h2>${title}</h2></div>
      <button class="round" data-act="close" aria-label="Close">${ICON.close}</button>
    </header>`;
  const pips = (n, max) => `<span class="lvl">${Array.from({ length: max }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</span>`;

  // ------------------------------------------------------------ Restore

  function restoreHtml() {
    const s = app.state;
    const world = worldOf(s);
    const pct = Math.round(restoration(s) * 100);
    const rows = world.upgrades.map((up) => {
      const o = upgradeOffer(s, up);
      let action;
      if (o.locked) action = `<span class="up-state">${ICON.lock}<small>Restore ${o.lockNeed} more</small></span>`;
      else if (o.maxed) action = `<span class="up-state ok">${ICON.check}<small>Restored</small></span>`;
      else action = `<button class="btn btn-buy${o.affordable ? '' : ' poor'}" data-act="buy" data-id="${up.id}">${ICON.glow}${fmt(o.cost)}</button>`;
      return `
        <div class="up${o.locked ? ' locked' : ''}${o.maxed ? ' maxed' : ''}">
          <div class="up-main">
            <div class="up-title"><b>${up.name}</b>${pips(o.lvl, o.max)}</div>
            <p>${up.blurb}</p>
            ${o.locked || o.maxed ? '' : `<p class="up-note">Next: ${o.note}</p>`}
          </div>
          ${action}
        </div>`;
    });
    return `
      ${head('Case ' + world.caseNo + ' · ' + world.object, 'Restore ' + world.name)}
      <div class="sh-progress">
        <span class="bar"><i style="width:${pct}%"></i></span>
        <span>${pct}% restored</span>
        <span class="pill small">${ICON.glow}<b>${fmt(s.glow)}</b></span>
      </div>
      <div class="sh-body">
        ${rows.join('')}
        <div class="soon">
          <p class="eyebrow">Next on the Bureau's shelf · placeholder teasers</p>
          ${COMING_SOON.map((w) => `<div class="soon-row"><b>${w.name}</b><span>${w.object}. ${w.tagline}</span></div>`).join('')}
        </div>
      </div>`;
  }

  function buy(id) {
    const s = app.state;
    const firstEver = s.stats.upgradesBought === 0;
    const r = buyUpgrade(s, id);
    if (!r.ok) {
      sfx.deny();
      if (r.reason === 'glow') toast(`You need ${fmt(r.short)} more Glow. A dive or two will do it.`);
      return;
    }
    const up = worldOf(s).upgrades.find((u) => u.id === id);
    sfx.build();
    track('upgrade_completed', { id, level: r.level, cost: r.cost, restoration: restoration(s) });
    if (firstEver) {
      track('tutorial_step', { step: 'first_upgrade' });
      s.flags.built = true;
      if (s.flags.rekindle) track('tutorial_complete', { seconds_since_install: Math.round((Date.now() - s.createdAt) / 1000) });
    }
    app.save();
    close();
    app.world.celebrate(id);
    toast(`<b>${up.name}</b> level ${r.level}. ${up.levels[r.level - 1].note}`, 'good');
    for (const rk of r.rankUps) {
      sfx.rankUp();
      track('rank_up', { rank: rk.rank });
      toast(`Promoted to <b>${rk.name}</b> +${rk.sparks} Sparks`, 'good');
    }
    if (r.worldComplete) setTimeout(() => open('complete'), 1400);
    refresh();
  }

  // ------------------------------------------------------------ Finds

  function creaturesHtml() {
    const s = app.state;
    return worldOf(s).creatures
      .map((c) => {
        const own = s.creatures[c.id];
        if (!own) {
          return `
            <div class="cre unknown">
              <div class="cre-art"><span>?</span></div>
              <div class="cre-body">
                <div class="cre-top"><b>Not yet met</b><span class="rar">${c.rarity}</span></div>
                <p>${c.arrives.hint || 'Asleep in a steam bubble in the very first hollow.'}</p>
              </div>
            </div>`;
        }
        const lvl = bondLevel(own.bond);
        const next = T.bondThresholds[lvl];
        const active = s.companion === c.id;
        return `
          <div class="cre${active ? ' active' : ''}">
            <div class="cre-art" data-portrait="creature:${c.id}"></div>
            <div class="cre-body">
              <div class="cre-top"><b>${c.name}</b><span class="rar">${c.rarity}</span></div>
              <p>${c.persona}</p>
              <p class="abil"><b>${c.ability.name}</b> ${c.ability.text}</p>
              <div class="bond">
                <span class="hearts">${[0, 1, 2].map((i) => `<i class="${i < lvl ? 'on' : ''}">${ICON.heart}</i>`).join('')}</span>
                <small>${next ? `Meet ${next - own.bond} more time${next - own.bond === 1 ? '' : 's'} to grow closer` : 'Best of friends'}</small>
              </div>
              <ul class="notes">${c.notes.slice(0, lvl).map((n) => `<li>${n}</li>`).join('')}</ul>
              ${active ? `<span class="tag">${ICON.check}Travelling with you</span>` : `<button class="btn btn-small" data-act="companion" data-id="${c.id}">Travel together</button>`}
            </div>
          </div>`;
      })
      .join('');
  }

  function artifactsHtml() {
    const s = app.state;
    const set = worldOf(s).artifactSet;
    const owned = set.items.filter((it) => s.artifacts[it.id]).length;
    const sel = set.items.find((it) => it.id === picked);
    let detail = '<p class="muted">Tap an artifact to read its story.</p>';
    if (sel) {
      const has = s.artifacts[sel.id];
      if (has) detail = `<b>${sel.name}</b><p>${sel.lore}</p>`;
      else if (s.echoes >= T.echoCost) detail = `<b>Not yet recovered</b><p>Trade ${T.echoCost} Echoes to restore this piece.</p><button class="btn btn-small" data-act="craft" data-id="${sel.id}">Restore with ${T.echoCost} Echoes</button>`;
      else detail = `<b>Not yet recovered</b><p>Relic crates hide under blue roofs inside hollows. ${T.echoCost} Echoes can also restore this exact piece.</p>`;
    }
    return `
      <div class="set-head">
        <b>${set.name}</b>
        <span>${owned} of ${set.items.length} recovered</span>
      </div>
      <p class="set-reward">${s.setRewarded ? ICON.check + ' Set complete. Reward collected.' : 'Complete the set: ' + rewardText(set.reward)}</p>
      <div class="art-grid">
        ${set.items.map((it) => `
          <button class="art${s.artifacts[it.id] ? ' owned' : ''}${picked === it.id ? ' sel' : ''}" data-act="artifact" data-id="${it.id}">
            <span data-portrait="artifact:${it.id}${s.artifacts[it.id] ? '' : ':sil'}"></span>
            <small>${s.artifacts[it.id] ? it.name : '???'}</small>
            ${s.artifacts[it.id] > 1 ? `<i class="count">×${s.artifacts[it.id]}</i>` : ''}
          </button>`).join('')}
      </div>
      <div class="art-detail">${detail}</div>
      <div class="echo-row">${ICON.echo}<b>${s.echoes}</b><span>Echoes. Every duplicate becomes one; ${T.echoCost} restore any missing piece.</span></div>
      <div class="set-head"><b>Spark trails</b><span>cosmetic only</span></div>
      <div class="trails">
        ${Object.entries(TRAILS).map(([id, tr]) => {
          const has = s.cosmetics.includes(id);
          return `<button class="trail${s.trail === id ? ' sel' : ''}${has ? '' : ' locked'}" data-act="trail" data-id="${id}" ${has ? '' : 'disabled'}>
            <i style="background:linear-gradient(90deg,${tr.colors[2]},${tr.colors[1]},${tr.colors[0]})"></i>${has ? tr.name : ICON.lock + tr.name}</button>`;
        }).join('')}
      </div>
      <details class="odds">
        <summary>How discoveries work (exact odds)</summary>
        <ul>
          <li>About ${Math.round(T.relicChance * 100)}% of hollows hide a relic crate. You can see it before you dive.</li>
          <li>A crate always holds an artifact: ${Math.round(T.artifactNewChance * 100)}% new, ${Math.round((1 - T.artifactNewChance) * 100)}% duplicate. Your first crate is always new, and you never get two duplicates in a row.</li>
          <li>The whole set takes at most 11 crates. After that, crates hold ${T.setCompleteCrateGlow} Glow.</li>
          <li>A newly arrived creature appears in ${worldOf(s).creatures.map((c) => `${Math.round(c.chance * 100)}% (${c.name})`).join(', ')} of hollows until you meet. Friends you know visit ${Math.round(T.rebondChance * 100)}% of hollows.</li>
          <li>Nothing here can be bought. There are no purchases in this prototype.</li>
        </ul>
      </details>`;
  }

  function findsHtml() {
    return `
      ${head('Field journal', 'Finds')}
      <div class="tabs">
        <button class="tab${tab === 'creatures' ? ' on' : ''}" data-act="tab" data-id="creatures">Creatures</button>
        <button class="tab${tab === 'artifacts' ? ' on' : ''}" data-act="tab" data-id="artifacts">Artifacts</button>
      </div>
      <div class="sh-body">${tab === 'creatures' ? creaturesHtml() : artifactsHtml()}</div>`;
  }

  // ------------------------------------------------------------ Bureau Board

  function boardHtml() {
    const s = app.state;
    const now = Date.now();
    refreshDaily(s, now);
    let eventBlock;
    if (!eventUnlocked(s)) {
      eventBlock = `<div class="ev locked">${ICON.lock}<p>Live events open at rank ${EVENT_UNLOCK_RANK + 1}, ${T.rankNames[EVENT_UNLOCK_RANK]}.</p></div>`;
    } else {
      const ev = currentEvent(now);
      const ms = eventMilestones(s, now);
      const top = ms[ms.length - 1].at;
      eventBlock = `
        <div class="ev">
          <p class="eyebrow">Live event · ends in ${fmtTime((ev.endsAt - now) / 1000)}</p>
          <h3>${ev.def.name}</h3>
          <p>${ev.def.blurb}</p>
          <div class="ev-score"><b>${fmt(s.event.points)}</b><span>${ev.def.pointName}</span><span class="bar"><i style="width:${Math.min(100, Math.round((s.event.points / top) * 100))}%"></i></span></div>
          ${ms.map((m) => `
            <div class="row${m.claimed ? ' claimed' : m.reached ? ' ready' : ''}">
              <span class="row-at">${m.at}</span>
              <span class="row-reward">${rewardHtml(m.reward)}</span>
              ${m.claimed ? `<span class="row-state">${ICON.check}</span>` : m.reached ? `<button class="btn btn-small" data-act="claim-ms" data-id="${m.index}">Collect</button>` : `<span class="row-state muted">${m.at - s.event.points} to go</span>`}
            </div>`).join('')}
          <p class="fine">Events come back regularly. Sitting one out costs you nothing.</p>
        </div>`;
    }
    const dailies = dailyList(s);
    return `
      ${head('This week at the Bureau', 'Bureau Board')}
      <div class="sh-body">
        ${eventBlock}
        <div class="set-head"><b>Today's tasks</b><span>fresh every day</span></div>
        ${dailies.map((r) => `
          <div class="row${r.claimed ? ' claimed' : r.done ? ' ready' : ''}">
            <span class="row-text">${r.d.text}<span class="bar"><i style="width:${Math.round((r.value / r.d.target) * 100)}%"></i></span></span>
            <span class="row-reward">${rewardHtml(r.d.reward)}</span>
            ${r.claimed ? `<span class="row-state">${ICON.check}</span>` : r.done ? `<button class="btn btn-small" data-act="claim-daily" data-id="${r.d.id}">Collect</button>` : `<span class="row-state muted">${r.value} / ${r.d.target}</span>`}
          </div>`).join('')}
        <p class="fine">No streaks here. Miss a day and nothing is taken away.</p>
      </div>`;
  }

  // ------------------------------------------------------------ Settings

  function settingsHtml() {
    const s = app.state;
    const st = s.stats;
    return `
      ${head('Prototype ' + T.version, 'Settings')}
      <div class="sh-body">
        ${SETTINGS.map(([key, label, sub]) => `
          <button class="toggle${s.settings[key] ? ' on' : ''}" id="set-${key}" role="switch" aria-checked="${!!s.settings[key]}" data-act="toggle" data-id="${key}">
            <span><b>${label}</b><small>${sub}</small></span><i></i>
          </button>`).join('')}
        <div class="set-head"><b>Your record</b><span>${app.store.persistent ? 'saved on this device' : 'storage is blocked: progress lasts until you close this page'}</span></div>
        <div class="stats">
          <span><b>${fmt(st.dives)}</b>dives</span>
          <span><b>${fmt(st.hollowsAwakened)}</b>hollows awakened</span>
          <span><b>${st.bestChain}</b>best chain</span>
          <span><b>${fmt(st.bestDive)}</b>best dive</span>
        </div>
        <details class="odds">
          <summary>What is real and what is a placeholder</summary>
          <ul>
            <li><b>Real:</b> the dive physics, one world, 18 restoration levels, 3 creatures, 6 artifacts, case files, daily tasks, a rotating event, local saves.</li>
            <li><b>Placeholder:</b> later worlds are teasers only.</li>
            <li><b>Mocked:</b> analytics stay on this device; the event calendar runs on your clock.</li>
            <li><b>Not built:</b> accounts, friends, trading, clubs, purchases, ads.</li>
          </ul>
        </details>
        ${confirmReset
          ? `<div class="danger"><p>Erase all progress on this device? This cannot be undone.</p><div class="danger-btns"><button class="btn btn-ghost" data-act="reset-cancel">Keep my world</button><button class="btn btn-danger" data-act="reset-confirm">Erase everything</button></div></div>`
          : `<button class="btn btn-ghost wide" data-act="reset">Erase progress and start over</button>`}
      </div>`;
  }

  function completeHtml() {
    const world = worldOf(app.state);
    return `
      ${head('Case ' + world.caseNo + ' closed', world.name + ' is awake')}
      <div class="sh-body">
        <p class="lead">Every crack is sealed with gold, the lanterns are lit, and the village is home again. This is the end of the prototype's first world.</p>
        <p>Hollows, daily tasks and events keep going, and your village is yours to visit.</p>
        <div class="soon">
          <p class="eyebrow">Next on the Bureau's shelf · placeholder teasers</p>
          ${COMING_SOON.map((w) => `<div class="soon-row"><b>${w.name}</b><span>${w.object}. ${w.tagline}</span></div>`).join('')}
        </div>
        <button class="btn wide" data-act="close">Back to the village</button>
      </div>`;
  }

  // ------------------------------------------------------------ plumbing

  const RENDER = { restore: restoreHtml, finds: findsHtml, board: boardHtml, settings: settingsHtml, complete: completeHtml };

  function render() {
    const body = sheet.querySelector('.sh-body');
    const scroll = body ? body.scrollTop : 0;
    sheet.innerHTML = RENDER[current]();
    for (const slot of sheet.querySelectorAll('[data-portrait]')) {
      const [kind, id, sil] = slot.dataset.portrait.split(':');
      slot.appendChild(kind === 'creature' ? creaturePortrait(id, 64) : artifactPortrait(id, 52, sil === 'sil'));
    }
    const nb = sheet.querySelector('.sh-body');
    if (nb) nb.scrollTop = scroll;
  }

  function open(name) {
    if (!RENDER[name]) return;
    sfx.tap();
    current = name;
    confirmReset = false;
    sheet.innerHTML = '';
    render();
    sheet.hidden = false;
    scrim.hidden = false;
    sheet.classList.remove('in');
    void sheet.offsetWidth;
    sheet.classList.add('in');
    track('sheet_opened', { sheet: name });
  }

  function close() {
    current = null;
    sheet.hidden = true;
    scrim.hidden = true;
    refresh();
  }

  scrim.addEventListener('click', close);
  sheet.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b || !current) return;
    const s = app.state;
    const id = b.dataset.id;
    switch (b.dataset.act) {
      case 'close':
        sfx.tap();
        return close();
      case 'buy':
        return buy(id);
      case 'tab':
        sfx.tap();
        tab = id;
        break;
      case 'companion':
        if (setCompanion(s, id)) {
          sfx.pet();
          track('companion_set', { id });
          app.save();
        }
        break;
      case 'trail':
        if (setTrail(s, id)) {
          sfx.tap();
          app.save();
        }
        break;
      case 'artifact':
        sfx.tap();
        picked = id;
        break;
      case 'craft': {
        const r = craftArtifact(s, id);
        if (r) {
          sfx.reveal();
          track('collection_added', { kind: 'artifact', id, is_new: true });
          toast('Artifact restored from Echoes', 'good');
          if (r.setComplete) toast(`<b>Set complete</b> ${rewardText(worldOf(s).artifactSet.reward)}`, 'good');
          app.world.invalidate();
          app.save();
        }
        break;
      }
      case 'claim-ms': {
        const m = claimMilestone(s, Date.now(), Number(id));
        if (m) {
          sfx.claim();
          track('event_milestone', { event: currentEvent(Date.now()).def.id, index: m.index });
          toast(`<b>Collected</b> ${rewardText(m.reward)}`, 'good');
          app.save();
        }
        break;
      }
      case 'claim-daily': {
        const d = claimDaily(s, id);
        if (d) {
          sfx.claim();
          track('objective_claimed', { id: d.id, kind: 'daily' });
          toast(`<b>Collected</b> ${rewardText(d.reward)}`, 'good');
          app.save();
        }
        break;
      }
      case 'toggle':
        s.settings[id] = !s.settings[id];
        applySettings(s.settings);
        sfx.tap();
        track('setting_changed', { key: id, value: s.settings[id] });
        app.save();
        break;
      case 'reset':
        confirmReset = true;
        break;
      case 'reset-cancel':
        confirmReset = false;
        break;
      case 'reset-confirm':
        close();
        return app.resetProgress();
      default:
        return;
    }
    render();
  });

  return { open, close, isOpen: () => current !== null };
}

export { createSheets };
