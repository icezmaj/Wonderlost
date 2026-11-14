// Case files (one-at-a-time onboarding + early-game goals) and daily tasks.
// `metric` names a counter in state.stats; a case is complete when the
// lifetime counter reaches `target`. A case with `world` counts only what
// happened in that world (state.wstats) and waits until that world is open.
// Daily tasks count from the start of the day.

const CASE_FILES = [
  { id: 'first_spark', text: 'Launch a Spark into the teapot', metric: 'dives', target: 1, reward: { glow: 20 } },
  { id: 'mend', text: 'Mend the first crack', metric: 'upgradesBought', target: 1, reward: { sparks: 2 }, nudge: 'restore' },
  { id: 'lanterns3', text: 'Light 3 lanterns', metric: 'lanternsLit', target: 3, reward: { glow: 30 } },
  { id: 'pet', text: 'Say hello to Nimbit (tap it in the village)', metric: 'pets', target: 1, reward: { glow: 20 } },
  { id: 'hollow1', text: 'Awaken a hollow: light every lantern', metric: 'hollowsAwakened', target: 1, reward: { sparks: 2 } },
  { id: 'home1', text: 'Bring a Spark home to the Hearth', metric: 'homecomings', target: 1, reward: { glow: 40 } },
  { id: 'build3', text: 'Restore 3 things in Mistlewick', metric: 'upgradesBought', target: 3, reward: { sparks: 3 }, nudge: 'restore' },
  { id: 'rekindle3', text: 'Rekindle mid-flight 3 times', metric: 'rekindlesUsed', target: 3, reward: { glow: 40 } },
  { id: 'chain10', text: 'Build a chain of 10', metric: 'bestChain', target: 10, reward: { glow: 50 } },
  { id: 'artifact1', text: 'Recover a lost artifact', metric: 'artifactsFound', target: 1, reward: { sparks: 3 }, nudge: 'finds' },
  { id: 'build6', text: 'Restore 6 things in Mistlewick', metric: 'upgradesBought', target: 6, reward: { glow: 80 }, nudge: 'restore' },
  { id: 'creature2', text: 'Befriend a second creature', metric: 'creaturesFound', target: 2, reward: { sparks: 3 }, nudge: 'finds' },
  { id: 'home5', text: 'Come home to the Hearth 5 times', metric: 'homecomings', target: 5, reward: { glow: 100 } },
  { id: 'hollows8', text: 'Awaken 8 hollows', metric: 'hollowsAwakened', target: 8, reward: { sparks: 4 } },
  { id: 'chain20', text: 'Build a chain of 20', metric: 'bestChain', target: 20, reward: { glow: 120 } },
  { id: 'build12', text: 'Restore 12 things in Mistlewick', metric: 'upgradesBought', target: 12, reward: { sparks: 5 }, nudge: 'restore' },
  { id: 'artifacts4', text: 'Recover 4 different artifacts', metric: 'artifactsOwned', target: 4, reward: { glow: 150 }, nudge: 'finds' },
  { id: 'creature3', text: 'Befriend all three creatures', metric: 'creaturesFound', target: 3, reward: { sparks: 5 }, nudge: 'finds' },
  { id: 'restore_all', text: 'Fully restore Mistlewick', metric: 'upgradesBought', target: 18, reward: { glow: 500 }, nudge: 'restore' },

  // ---- Case 002: Tocktown ----
  { id: 'tt_open', world: 'tocktown', text: 'Launch a Spark into the pocket watch', metric: 'dives', target: 1, reward: { sparks: 3 } },
  { id: 'tt_wind', world: 'tocktown', text: 'Wind the Mainspring', metric: 'upgradesBought', target: 1, reward: { glow: 150 }, nudge: 'restore' },
  { id: 'tt_friend', world: 'tocktown', text: 'Befriend a Tocktown creature', metric: 'creaturesFound', target: 1, reward: { sparks: 3 }, nudge: 'finds' },
  { id: 'tt_lamps', world: 'tocktown', text: 'Light 8 lanterns in Tocktown', metric: 'lanternsLit', target: 8, reward: { glow: 150 } },
  { id: 'tt_build3', world: 'tocktown', text: 'Restore 3 things in Tocktown', metric: 'upgradesBought', target: 3, reward: { sparks: 4 }, nudge: 'restore' },
  { id: 'tt_cogs', world: 'tocktown', text: 'Ride spinning cogs 10 times', metric: 'cogHits', target: 10, reward: { glow: 200 } },
  { id: 'tt_hollows', world: 'tocktown', text: 'Awaken 5 hollows in Tocktown', metric: 'hollowsAwakened', target: 5, reward: { glow: 300 } },
  { id: 'tt_relics', world: 'tocktown', text: 'Recover 3 pieces of the Regalia', metric: 'artifactsOwned', target: 3, reward: { sparks: 5 }, nudge: 'finds' },
  { id: 'tt_build10', world: 'tocktown', text: 'Restore 10 things in Tocktown', metric: 'upgradesBought', target: 10, reward: { glow: 400 }, nudge: 'restore' },
  { id: 'tt_all', world: 'tocktown', text: 'Fully restore Tocktown', metric: 'upgradesBought', target: 18, reward: { glow: 1000 }, nudge: 'restore' }
];

// Three of these are offered each local day (seeded by the date). No streaks,
// no penalties for skipping a day.
const DAILY_POOL = [
  { id: 'd_lanterns', text: 'Light 12 lanterns', metric: 'lanternsLit', target: 12, reward: { glow: 60 } },
  { id: 'd_glow', text: 'Gather 400 Glow', metric: 'glowEarned', target: 400, reward: { sparks: 2 } },
  { id: 'd_home', text: 'Come home 4 times', metric: 'homecomings', target: 4, reward: { glow: 70 } },
  { id: 'd_hollows', text: 'Awaken 3 hollows', metric: 'hollowsAwakened', target: 3, reward: { sparks: 2 } },
  { id: 'd_blooms', text: 'Ring bell blooms 20 times', metric: 'bumperHits', target: 20, reward: { glow: 50 } },
  { id: 'd_dives', text: 'Complete 8 dives', metric: 'dives', target: 8, reward: { sparks: 2 } },
  { id: 'd_pet', text: 'Greet a creature 3 times', metric: 'pets', target: 3, reward: { glow: 30 } }
];

const DAILY_COUNT = 3;

export { CASE_FILES, DAILY_POOL, DAILY_COUNT };
