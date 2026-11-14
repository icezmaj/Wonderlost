// Every balance number in one place. Change values here (or, later, serve this
// object from remote config) - no gameplay code needs to be touched.

const TUNING = {
  version: '0.1.0',

  // --- Spark physics (logical units; the dive field is 360 x 640) ---
  gravity: 330,
  airDrag: 0.2, // fraction of velocity lost per second
  maxSpeed: 760,
  sparkRadius: 8,
  launchSpeed: 340,
  dashSpeed: 430, // speed after a Rekindle
  boundRest: 0.8, // bounce off the field edges
  ledgeRest: 0.6, // bounce off cloud ledges
  bumperKick: 400, // minimum speed a charged bell bloom throws the spark at
  bumperCharges: 3,
  bumperSpentRest: 0.7,
  geyserSpeed: 600,
  geyserCharges: 2,
  slowMo: 0.12, // time scale while aiming a Rekindle
  maxDiveSeconds: 40,
  settleSpeed: 14,
  settleSeconds: 1.1,
  baseRekindles: 1,
  hearthWidth: 78,
  hearthMaxScale: 1.6, // companion and upgrade bonuses together never widen the Hearth past this
  cogRadius: 20,
  cogFling: 230, // sideways speed a charged spinning cog adds
  cogValue: 7, // Glow per charged cog hit (cogs replace some bell blooms, so they pay more)

  // --- Chains: gathers inside the window build a chain; tiers multiply Glow ---
  chainWindow: 1.5,
  chainTiers: [
    [22, 4],
    [12, 3],
    [5, 2]
  ],

  // --- Glow values ---
  moteValue: 1,
  lanternValue: 6,
  bumperValue: 2,
  geyserValue: 2,
  homeMult: 2, // Homecoming: the spark lands in the Hearth
  hollowBonus: 25, // every lantern in a hollow lit
  swiftDives: 2, // awaken a hollow within this many dives -> Spark refund
  lanternsPerHollow: 4,

  // --- Discoveries (all odds are shown to the player in the Finds sheet) ---
  relicChance: 0.38, // chance a hollow hides a relic crate
  artifactNewChance: 0.7, // a crate holds a new artifact (never two duplicates in a row)
  echoCost: 3, // Echoes needed to pick any missing artifact
  setCompleteCrateGlow: 40,
  rebondChance: 0.22, // chance a befriended creature visits a hollow again
  bondThresholds: [1, 3, 6],

  // --- Sparks (action capacity) ---
  sparkCap: 10,
  startSparks: 10,
  sparkRegenSec: 180,
  rankUpSparks: 3,

  // --- Bureau rank ---
  rankXp: [0, 60, 180, 380, 680, 1100, 1700, 2500, 3600, 5000, 7000],
  rankNames: [
    'Trainee Finder',
    'Junior Finder',
    'Field Finder',
    'Senior Finder',
    'World Warden',
    'Keeper',
    'Master Mender',
    'Lantern Marshal',
    'Cartographer',
    'Luminary',
    'Director'
  ]
};

export { TUNING };
