// Live events are data. The scheduler (src/progression/events.js) rotates
// through this list in fixed-length cycles; each event is a milestone ladder
// fed by a per-dive metric. A new event is a new entry here.
//
// PROTOTYPE NOTE: the schedule runs on the device clock. In production the
// calendar and reward grants come from the server (see docs/GDD.md, section 10).

const EVENT_CYCLE_HOURS = 72;
const EVENT_UNLOCK_RANK = 1; // rank index (0-based) at which events appear

const EVENTS = [
  {
    id: 'lantern_festival',
    name: 'The Lantern Festival',
    blurb: 'Every lantern you light anywhere adds to the festival sky.',
    pointName: 'Festival lights',
    metric: 'lanternsLitNow', // field on the dive summary
    milestones: [
      { at: 6, reward: { glow: 60 } },
      { at: 16, reward: { sparks: 3 } },
      { at: 32, reward: { glow: 180 } },
      { at: 55, reward: { sparks: 5 } },
      { at: 90, reward: { glow: 400, cosmetic: 'trail_festival', label: 'Festival trail' } }
    ]
  },
  {
    id: 'chain_rally',
    name: 'Chain Reaction Rally',
    blurb: 'Your best chain in each dive is added to your rally score.',
    pointName: 'Rally points',
    metric: 'bestChain',
    milestones: [
      { at: 30, reward: { glow: 60 } },
      { at: 80, reward: { sparks: 3 } },
      { at: 160, reward: { glow: 180 } },
      { at: 280, reward: { sparks: 5 } },
      { at: 450, reward: { glow: 400, cosmetic: 'trail_rally', label: 'Rally trail' } }
    ]
  }
];

// Cosmetic Spark trails. Purely visual - never affects physics or rewards.
const TRAILS = {
  default: { name: 'Ember', colors: ['#fff3c4', '#ffcf5c', '#ff9d2e'] },
  trail_comet: { name: 'Comet', colors: ['#ffffff', '#9ad8ff', '#6f7dff'] },
  trail_festival: { name: 'Festival', colors: ['#fff0f3', '#ff8fa3', '#ffcf5c'] },
  trail_rally: { name: 'Rally', colors: ['#f0fff7', '#7fe3d8', '#7be0a0'] },
  trail_brass: { name: 'Brass', colors: ['#fff6d6', '#f5b942', '#b8732a'] }
};

export { EVENT_CYCLE_HOURS, EVENT_UNLOCK_RANK, EVENTS, TRAILS };
