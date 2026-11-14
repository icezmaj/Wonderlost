// World content is pure data. Adding a world, creature, artifact or upgrade is
// an edit to this file (plus art in src/render) - never to gameplay code.
//
// Upgrade `fx` keys are summed across purchased levels into dive/economy modifiers:
//   sparkCap, homeMult, moteBonus, lanternValue, hollowBonus, bumpers,
//   bumperValue, geysers, chainWindow (seconds), cogs, hearthGrow (fraction),
//   gusts, chainStart, rekindleUp
// Upgrades from every world add up: what you restored in one world still
// helps in the next.
// Creature `mods` apply only while that creature is the active companion:
//   extraRekindles, magnet, hearthScale, chainBonus (seconds), bounceBonus,
//   chainHead, gustBonus
//
// `unlock` gates a world behind progress in an earlier one. `dive` picks the
// look and layout of that world's hollows (see sim/level.js, render/diveView.js).

const WORLDS = {
  mistlewick: {
    id: 'mistlewick',
    name: 'Mistlewick',
    caseNo: '001',
    object: 'A cracked teapot',
    tagline: 'A cloud village asleep inside a broken teapot.',
    titleLine: 'Something inside it is still warm.',
    homeWord: 'Village',
    dive: { theme: 'mist', layout: 'rows', into: 'the teapot' },

    upgrades: [
      {
        id: 'teapot',
        name: 'Golden Mending',
        blurb: 'Seal the cracks with seams of gold light.',
        unlockAt: 0,
        levels: [
          { cost: 20, fx: { sparkCap: 1 }, note: '+1 Spark capacity' },
          { cost: 120, fx: { sparkCap: 1 }, note: '+1 Spark capacity' },
          { cost: 380, fx: { sparkCap: 1 }, note: '+1 Spark capacity' }
        ]
      },
      {
        id: 'hearth',
        name: 'Hearth Well',
        blurb: 'Rekindle the well that warms the village.',
        unlockAt: 1,
        levels: [
          { cost: 60, fx: { homeMult: 0.25 }, note: 'Homecoming ×2.25' },
          { cost: 200, fx: { homeMult: 0.25 }, note: 'Homecoming ×2.5' },
          { cost: 520, fx: { homeMult: 0.5 }, note: 'Homecoming ×3' }
        ]
      },
      {
        id: 'cottages',
        name: 'Cloud Cottages',
        blurb: 'Raise homes so the puff-folk can return.',
        unlockAt: 1,
        levels: [
          { cost: 90, fx: { moteBonus: 0.15 }, note: '+15% motes in every hollow' },
          { cost: 260, fx: { moteBonus: 0.15 }, note: '+30% motes in every hollow' },
          { cost: 640, fx: { moteBonus: 0.2 }, note: '+50% motes in every hollow' }
        ]
      },
      {
        id: 'lanterns',
        name: 'Lantern Lane',
        blurb: 'String lanterns between the cloud islands.',
        unlockAt: 3,
        levels: [
          { cost: 130, fx: { lanternValue: 3, hollowBonus: 10 }, note: 'Lanterns and awakenings give more Glow' },
          { cost: 340, fx: { lanternValue: 3, hollowBonus: 10 }, note: 'Lanterns and awakenings give more Glow' },
          { cost: 780, fx: { lanternValue: 4, hollowBonus: 15 }, note: 'Lanterns and awakenings give more Glow' }
        ]
      },
      {
        id: 'belltower',
        name: 'Bell Tower',
        blurb: 'Hang the village bell. Its echo grows bell blooms.',
        unlockAt: 3,
        levels: [
          { cost: 180, fx: { bumpers: 1, bumperValue: 1 }, note: '+1 bell bloom in every hollow' },
          { cost: 440, fx: { bumpers: 1, bumperValue: 1 }, note: '+1 bell bloom in every hollow' },
          { cost: 950, fx: { bumpers: 1, bumperValue: 1 }, note: '+1 bell bloom in every hollow' }
        ]
      },
      {
        id: 'garden',
        name: 'Steam Garden',
        blurb: 'Plant tea bushes around the warm vents.',
        unlockAt: 5,
        levels: [
          { cost: 240, fx: { geysers: 1 }, note: '+1 steam geyser in every hollow' },
          { cost: 560, fx: { geysers: 1 }, note: '+1 steam geyser in every hollow' },
          { cost: 1200, fx: { geysers: 1 }, note: '+1 steam geyser in every hollow' }
        ]
      }
    ],

    creatures: [
      {
        id: 'nimbit',
        name: 'Nimbit',
        rarity: 'Common',
        persona: 'A shy cloud-puff that hums when it thinks no one is listening.',
        arrives: { always: true },
        chance: 1,
        ability: { name: 'Second Wind', text: '+1 Rekindle on every dive', mods: { extraRekindles: 1 } },
        notes: [
          'Sleeps inside steam bubbles. Snores in tiny thunderclaps.',
          'Collects raindrops and names every one of them.',
          'Will follow a warm Spark anywhere, even home.'
        ]
      },
      {
        id: 'sprigget',
        name: 'Sprigget',
        rarity: 'Uncommon',
        persona: 'A tea-leaf glider who is certain it is the village gardener.',
        arrives: { upgrade: 'garden', level: 1, hint: 'Arrives once the Steam Garden is planted.' },
        chance: 0.6,
        ability: { name: 'Leaf Pull', text: 'Nearby motes drift toward your Spark', mods: { magnet: 46 } },
        notes: [
          'Rides the geysers for fun, then insists it was work.',
          'Waters the clouds. The clouds do not need watering.',
          'Keeps a pressed-flower diary of every hollow you awaken.'
        ]
      },
      {
        id: 'whistlewing',
        name: 'Whistlewing',
        rarity: 'Rare',
        persona: 'A kettle-owl whose whistle means the tea, and the day, is ready.',
        arrives: { upgrade: 'belltower', level: 1, hint: 'Arrives once the Bell Tower rings again.' },
        chance: 0.35,
        moving: true,
        ability: { name: 'Warm Welcome', text: 'The Hearth is 45% wider', mods: { hearthScale: 1.45 } },
        notes: [
          'Never sits still inside its bubble. Aim ahead of it.',
          'Whistles one note higher each time the village grows.',
          'Guards the Hearth at night with one eye open.'
        ]
      }
    ],

    artifactSet: {
      id: 'first_dawn',
      name: 'Tea Service of the First Dawn',
      reward: { glow: 300, cosmetic: 'trail_comet', label: 'Comet trail for your Spark + a porcelain moon over Mistlewick' },
      items: [
        { id: 'spoon', name: 'Gilded Teaspoon', lore: 'Stirs the dawn into the sky, one sunrise at a time.' },
        { id: 'sugarstar', name: 'Sugar Star', lore: 'A sugar cube that fell from a constellation.' },
        { id: 'spool', name: 'Cloud-Thread Spool', lore: 'The puff-folk mend their islands with it.' },
        { id: 'bell', name: 'Porcelain Bell', lore: 'Rings only when someone comes home.' },
        { id: 'compass', name: 'Chamomile Compass', lore: 'Always points to the nearest warm cup.' },
        { id: 'whistle', name: 'Steam Whistle', lore: 'One breath wakes every lantern in the lane.' }
      ]
    }
  },

  tocktown: {
    id: 'tocktown',
    name: 'Tocktown',
    caseNo: '002',
    object: 'A stopped pocket watch',
    tagline: 'A clockwork town frozen at one minute to midnight.',
    titleLine: 'It stopped at one minute to midnight.',
    homeWord: 'Town',
    unlock: { world: 'mistlewick', levels: 12 },
    dive: { theme: 'brass', layout: 'dial', into: 'the pocket watch' },

    upgrades: [
      {
        id: 'mainspring',
        name: 'Mainspring',
        blurb: 'Wind the great spring so the town can tick again.',
        unlockAt: 0,
        levels: [
          { cost: 300, fx: { sparkCap: 1 }, note: '+1 Spark capacity' },
          { cost: 800, fx: { sparkCap: 1 }, note: '+1 Spark capacity' },
          { cost: 1700, fx: { sparkCap: 1 }, note: '+1 Spark capacity' }
        ]
      },
      {
        id: 'clocktower',
        name: 'Midnight Tower',
        blurb: 'Coax the tower clock past one minute to midnight.',
        unlockAt: 1,
        levels: [
          { cost: 400, fx: { chainWindow: 0.2 }, note: 'Chains last 0.2s longer' },
          { cost: 1000, fx: { chainWindow: 0.2 }, note: 'Chains last 0.4s longer' },
          { cost: 2000, fx: { chainWindow: 0.2 }, note: 'Chains last 0.6s longer' }
        ]
      },
      {
        id: 'gearworks',
        name: 'Gearworks',
        blurb: 'Oil the big cogs. A spinning cog flings your Spark sideways.',
        unlockAt: 1,
        levels: [
          { cost: 450, fx: { cogs: 1 }, note: '+1 spinning cog in every Tocktown hollow' },
          { cost: 1100, fx: { cogs: 1 }, note: '+1 spinning cog in every Tocktown hollow' },
          { cost: 2200, fx: { cogs: 1 }, note: '+1 spinning cog in every Tocktown hollow' }
        ]
      },
      {
        id: 'lamprow',
        name: "Lamplighter's Row",
        blurb: 'Relight the street lamps along the minute hand.',
        unlockAt: 3,
        levels: [
          { cost: 600, fx: { lanternValue: 4, hollowBonus: 15 }, note: 'Lanterns and awakenings give more Glow' },
          { cost: 1400, fx: { lanternValue: 4, hollowBonus: 15 }, note: 'Lanterns and awakenings give more Glow' },
          { cost: 2600, fx: { lanternValue: 5, hollowBonus: 20 }, note: 'Lanterns and awakenings give more Glow' }
        ]
      },
      {
        id: 'pendulum',
        name: 'Pendulum Hall',
        blurb: 'Set the long pendulum swinging over the Hearth.',
        unlockAt: 3,
        levels: [
          { cost: 700, fx: { hearthGrow: 0.08 }, note: 'The Hearth is 8% wider' },
          { cost: 1500, fx: { hearthGrow: 0.08 }, note: 'The Hearth is 16% wider' },
          { cost: 2800, fx: { hearthGrow: 0.08 }, note: 'The Hearth is 24% wider' }
        ]
      },
      {
        id: 'market',
        name: 'Tick-Tock Market',
        blurb: 'Open the stalls. Everything is sold by the second.',
        unlockAt: 5,
        levels: [
          { cost: 900, fx: { moteBonus: 0.15 }, note: '+15% motes in every hollow' },
          { cost: 1800, fx: { moteBonus: 0.15 }, note: '+30% motes in every hollow' },
          { cost: 3200, fx: { moteBonus: 0.2 }, note: '+50% motes in every hollow' }
        ]
      }
    ],

    creatures: [
      {
        id: 'tocklet',
        name: 'Tocklet',
        rarity: 'Common',
        persona: 'A wind-up mouse who salutes every time something chimes.',
        arrives: { always: true, hint: 'Asleep in a bubble in the first Tocktown hollow.' },
        chance: 1,
        ability: { name: 'Steady Tick', text: 'Chains last 0.4s longer', mods: { chainBonus: 0.4 } },
        notes: [
          'Needs winding twice a day. Pretends it does not.',
          'Keeps a list of every clock that is wrong. The list is long.',
          'Will hold a door for exactly one second, then apologise.'
        ]
      },
      {
        id: 'springle',
        name: 'Springle',
        rarity: 'Uncommon',
        persona: 'A coil-spring hopper that cannot stand still and has stopped trying.',
        arrives: { upgrade: 'gearworks', level: 1, hint: 'Arrives once the Gearworks turns again.' },
        chance: 0.6,
        ability: { name: 'Extra Bounce', text: 'Cogs and bell blooms give +2 Glow', mods: { bounceBonus: 2 } },
        notes: [
          'Measures distance in boings.',
          'Once bounced clean over the Midnight Tower. Nobody saw. It is still upset.',
          'Sleeps upside down so it wakes up already falling.'
        ]
      },
      {
        id: 'hourmoth',
        name: 'Hourmoth',
        rarity: 'Rare',
        persona: 'An hourglass moth that only ever flew at one minute to midnight.',
        arrives: { upgrade: 'pendulum', level: 1, hint: 'Arrives once the pendulum swings again.' },
        chance: 0.35,
        moving: true,
        ability: { name: 'Borrowed Minute', text: '+1 Rekindle and a 20% wider Hearth', mods: { extraRekindles: 1, hearthScale: 1.2 } },
        notes: [
          'Drifts side to side inside its bubble, like sand deciding.',
          'Its wings keep the last minute of every day.',
          'Lands on the Hearth when it thinks you are not looking.'
        ]
      }
    ],

    artifactSet: {
      id: 'last_minute',
      name: 'Regalia of the Last Minute',
      reward: { glow: 600, cosmetic: 'trail_brass', label: 'Brass trail for your Spark + a full moon over Tocktown' },
      items: [
        { id: 'windkey', name: 'Winding Key', lore: 'Turns once a century, and only for a friend.' },
        { id: 'escapement', name: 'Tiny Escapement', lore: 'Lets time out one tick at a time.' },
        { id: 'hairspring', name: 'Silver Hairspring', lore: 'Coiled so tight it hums.' },
        { id: 'moondial', name: 'Moon Dial', lore: 'Shows what the moon is doing, not what time it is.' },
        { id: 'chime', name: 'Midnight Chime', lore: 'Has never once been rung. It has been waiting.' },
        { id: 'lens', name: "Watchmaker's Lens", lore: 'Makes small things matter.' }
      ]
    }
  },

  hushfall: {
    id: 'hushfall',
    name: 'Hushfall',
    caseNo: '003',
    object: 'A forgotten snow globe',
    tagline: 'A winter city waiting for its first snowfall in years.',
    titleLine: 'Nobody has shaken it in years.',
    homeWord: 'City',
    unlock: { world: 'tocktown', levels: 12 },
    dive: { theme: 'frost', layout: 'flake', into: 'the snow globe' },

    upgrades: [
      {
        id: 'dome',
        name: 'Glass Dome',
        blurb: 'Polish the dusty glass so the city can see the sky.',
        unlockAt: 0,
        levels: [
          { cost: 700, fx: { sparkCap: 1 }, note: '+1 Spark capacity' },
          { cost: 1800, fx: { sparkCap: 1 }, note: '+1 Spark capacity' },
          { cost: 3600, fx: { sparkCap: 1 }, note: '+1 Spark capacity' }
        ]
      },
      {
        id: 'weathervane',
        name: 'Weathervane',
        blurb: 'Raise the vane. A gust carries your Spark sideways.',
        unlockAt: 1,
        levels: [
          { cost: 900, fx: { gusts: 1 }, note: '+1 gust of wind in every Hushfall hollow' },
          { cost: 2200, fx: { gusts: 1 }, note: '+1 gust of wind in every Hushfall hollow' },
          { cost: 4200, fx: { gusts: 1 }, note: '+1 gust of wind in every Hushfall hollow' }
        ]
      },
      {
        id: 'chimneys',
        name: 'Chimney Row',
        blurb: 'Light the hearths along the row, one house at a time.',
        unlockAt: 1,
        levels: [
          { cost: 1000, fx: { homeMult: 0.25 }, note: 'Homecoming multiplier +0.25' },
          { cost: 2400, fx: { homeMult: 0.25 }, note: 'Homecoming multiplier +0.25' },
          { cost: 4600, fx: { homeMult: 0.5 }, note: 'Homecoming multiplier +0.5' }
        ]
      },
      {
        id: 'skaters',
        name: 'Skating Pond',
        blurb: 'Sweep the pond. A good glide starts before you push off.',
        unlockAt: 3,
        levels: [
          { cost: 1300, fx: { chainStart: 2 }, note: 'Every dive starts with a chain of 2' },
          { cost: 2800, fx: { chainStart: 2 }, note: 'Every dive starts with a chain of 4' },
          { cost: 5200, fx: { chainStart: 2 }, note: 'Every dive starts with a chain of 6' }
        ]
      },
      {
        id: 'snowlamps',
        name: 'Snow Lanterns',
        blurb: 'Set lanterns in the drifts to guide the first flakes down.',
        unlockAt: 3,
        levels: [
          { cost: 1500, fx: { lanternValue: 5, hollowBonus: 20 }, note: 'Lanterns and awakenings give more Glow' },
          { cost: 3200, fx: { lanternValue: 5, hollowBonus: 20 }, note: 'Lanterns and awakenings give more Glow' },
          { cost: 5800, fx: { lanternValue: 6, hollowBonus: 30 }, note: 'Lanterns and awakenings give more Glow' }
        ]
      },
      {
        id: 'bakery',
        name: 'Midwinter Bakery',
        blurb: 'Fire the ovens. The whole street smells of cinnamon.',
        unlockAt: 5,
        levels: [
          { cost: 1800, fx: { moteBonus: 0.15 }, note: '+15% motes in every hollow' },
          { cost: 3800, fx: { moteBonus: 0.15 }, note: '+30% motes in every hollow' },
          { cost: 7000, fx: { rekindleUp: 1 }, note: '+1 Rekindle on every dive' }
        ]
      }
    ],

    creatures: [
      {
        id: 'flurrin',
        name: 'Flurrin',
        rarity: 'Common',
        persona: 'A snowball in a scarf that rolls everywhere and arrives a little bigger.',
        arrives: { always: true, hint: 'Asleep in a bubble in the first Hushfall hollow.' },
        chance: 1,
        ability: { name: 'Head Start', text: 'Every dive starts with a chain of 3', mods: { chainHead: 3 } },
        notes: [
          'Has never once taken the stairs.',
          'Believes it invented downhill.',
          'Keeps its scarf on in summer, in case summer is a trick.'
        ]
      },
      {
        id: 'mufflet',
        name: 'Mufflet',
        rarity: 'Uncommon',
        persona: 'A knitted fox kit, forever one mitten short.',
        arrives: { upgrade: 'weathervane', level: 1, hint: 'Arrives once the Weathervane turns again.' },
        chance: 0.6,
        ability: { name: 'Tailwind', text: 'Gusts and steam geysers give +4 Glow', mods: { gustBonus: 4 } },
        notes: [
          'Can tell which way the wind blows by which ear is colder.',
          'Has a drawer of single mittens. None of them match.',
          'Curls up in the bakery window until someone notices.'
        ]
      },
      {
        id: 'auroryn',
        name: 'Auroryn',
        rarity: 'Rare',
        persona: 'A tiny reindeer with the northern lights caught in its antlers.',
        arrives: { upgrade: 'snowlamps', level: 1, hint: 'Arrives once the Snow Lanterns are lit.' },
        chance: 0.35,
        moving: true,
        ability: { name: 'Northern Light', text: '+1 Rekindle, and nearby motes drift toward your Spark', mods: { extraRekindles: 1, magnet: 40 } },
        notes: [
          'Paces back and forth in its bubble, practising take-off.',
          'Leaves hoofprints that glow for exactly one night.',
          'Only lands where the snow has not been walked on yet.'
        ]
      }
    ],

    artifactSet: {
      id: 'first_snow',
      name: 'Keepsakes of the First Snow',
      reward: { glow: 1200, cosmetic: 'trail_aurora', label: 'Aurora trail for your Spark + northern lights over Hushfall' },
      items: [
        { id: 'mitten', name: 'Lost Mitten', lore: 'Its pair is still looking for it.' },
        { id: 'sleighbell', name: 'Sleigh Bell', lore: 'Rings once for every flake that lands.' },
        { id: 'cocoa', name: 'Cocoa Tin', lore: 'Never empty. Nobody knows why.' },
        { id: 'skate', name: 'Silver Skate', lore: 'Draws a perfect figure eight on its own.' },
        { id: 'glassflake', name: 'Glass Snowflake', lore: 'The first one. Somebody kept it.' },
        { id: 'candle', name: 'Window Candle', lore: 'Lit so the snow could find its way home.' }
      ]
    }
  }
};

const WORLD_ORDER = ['mistlewick', 'tocktown', 'hushfall'];

// PLACEHOLDER: later worlds exist only as teasers in this slice.
const COMING_SOON = [
  { name: 'Neon Reverie', object: 'An old radio', tagline: 'A musical universe humming between two stations.' }
];

export { WORLDS, WORLD_ORDER, COMING_SOON };
