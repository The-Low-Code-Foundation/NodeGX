// The universe as data: factions, sectors and the threads between them, goods and their prices, upgrades,
// ship classes and the mission templates. This is the half of the game a NodeGX app would own.

export const FACTIONS = {
  concord: { id: 'concord', name: 'Concord', color: '#58b0ff', blurb: 'The lawful navy. Pays bounties on Rooks, frowns on piracy.' },
  rooks: { id: 'rooks', name: 'Free Rooks', color: '#ff5540', blurb: 'Pirates with a flag. Pay well for raids, hunt those who hunt them.' },
  guild: { id: 'guild', name: 'Guild', color: '#ffb347', blurb: 'The traders. Their freighters cross every thread; their prices are fair, mostly.' }
};
export const HOSTILE_AT = -40; // standing below this and the faction sends hunters when you arrive

export const GOODS = {
  ore: { id: 'ore', name: 'Ore', base: 40, size: 1 },
  medicine: { id: 'medicine', name: 'Medicine', base: 140, size: 1 },
  parts: { id: 'parts', name: 'Ship parts', base: 90, size: 2 },
  contraband: { id: 'contraband', name: 'Contraband', base: 260, size: 1, illegal: true }
};

export const STATIONS = {
  haven: { id: 'haven', name: 'Haven Station', faction: 'concord', sector: 'haven', prices: { ore: 1.3, medicine: 0.8, parts: 1.0 }, sells: ['medicine', 'parts'], greeting: 'Concord keeps the lights on here. Mind the rules.' },
  hollow: { id: 'hollow', name: "Rook's Hollow", faction: 'rooks', sector: 'drift', prices: { ore: 0.7, medicine: 1.6, parts: 1.4, contraband: 0.8 }, sells: ['ore', 'contraband'], greeting: 'No Concord here. Everything has a price, including you.' }
};

export const SECTORS = {
  haven: {
    id: 'haven', name: 'Haven', seed: 11, blurb: 'Concord core. A station, patrols, quiet lanes.',
    station: 'haven', threads: ['drift'], pirates: 0, asteroids: 40, derelict: false, freighter: true
  },
  drift: {
    id: 'drift', name: 'The Drift', seed: 23, blurb: 'An asteroid field the Rooks call home. Their outpost hides in it.',
    station: 'hollow', threads: ['haven', 'cinder'], pirates: 3, asteroids: 220, derelict: false, freighter: true
  },
  cinder: {
    id: 'cinder', name: 'Cinder Reach', seed: 37, blurb: 'A graveyard of ships round a dead star. The Carrion patrols it.',
    station: null, threads: ['drift'], pirates: 2, asteroids: 90, derelict: true, corvette: true, freighter: false
  }
};

export const SHIPS = {
  frigate: { name: 'Kestrel', cls: 'Kestrel-class frigate', hull: 600, shields: 150, speed: [0, 38], turn: 0.28, radius: 38, half: [8, 5, 36], cargo: 24, bays: 1 },
  fighter: { name: 'Wren', cls: 'Wren light fighter', hull: 80, shields: 100, speed: [0, 120], turn: 1.5, radius: 5, half: [5, 2, 5] },
  pirate: { name: 'Rook', cls: 'Rook raider', hull: 60, shields: 0, speed: [50, 85], turn: 1.3, radius: 5, half: [5, 2, 5] },
  corvette: { name: 'Carrion', cls: 'Carrion-class corvette', hull: 900, shields: 100, speed: [0, 22], turn: 0.18, radius: 48, half: [9, 6, 46], cargo: 40, boardable: true },
  freighter: { name: 'Guild hauler', cls: 'Guild hauler', hull: 500, shields: 60, speed: [0, 18], turn: 0.15, radius: 42, half: [10, 8, 40], cargo: 60, boardable: true }
};

export const UPGRADES = [
  { id: 'shields2', name: 'Shield capacitors', cost: 1800, blurb: 'Frigate shields 150 → 260.', apply: (s) => (s.shieldsMax = 260) },
  { id: 'engine2', name: 'Drive tuning', cost: 1500, blurb: 'Frigate top speed 38 → 54, turns 40% faster.', apply: (s) => ((s.speedMax = 54), (s.turn = 0.4)) },
  { id: 'turret2', name: 'Twin turret', cost: 2200, blurb: 'The turret fires twice as fast and hits harder.', apply: (s) => ((s.turretEvery = 0.22), (s.turretDamage = 34)) },
  { id: 'cargo2', name: 'Cargo racks', cost: 900, blurb: 'Hold 24 → 40 units.', apply: (s) => (s.cargoMax = 40) },
  { id: 'cannons2', name: 'Wren cannons II', cost: 1600, blurb: 'The fighter hits for 40 instead of 25.', apply: (s) => (s.fighterDamage = 40) },
  { id: 'hull2', name: 'Hull plating', cost: 2600, blurb: 'Frigate hull 600 → 900.', apply: (s) => (s.hullMax = 900) },
  { id: 'rifle2', name: 'Boarding rifle II', cost: 1200, blurb: 'Your rifle hits for 45 instead of 25.', apply: (s) => (s.rifleDamage = 45) },
  { id: 'armour', name: 'Boarding armour', cost: 1400, blurb: 'You and your crew take half the hits when boarding.', apply: (s) => (s.armour = 0.5) }
];

export const PAINTS = ['#9aa3ad', '#d8d2c2', '#3d5a80', '#7a2e2e', '#2f6f4e', '#5b4a8a', '#1e2228', '#c98b2a'];
export const ENGINE_COLORS = ['#58b0ff', '#ff8c42', '#b48cff', '#39d27a', '#ff5540', '#ffffff'];

export const CREW = [
  { id: 'vex', name: 'Vex', role: 'pilot', skill: 'Flies the Kestrel. Holds a course, brings her to a stop, never scratches the paint.', fps: 60 },
  { id: 'dag', name: 'Dag', role: 'gunner', skill: 'Mans the turret. Leads a Rook by habit.', fps: 80 }
];
export const HIRE = [
  { id: 'ilse', name: 'Ilse', role: 'gunner', skill: 'Ex-Concord gunnery. Second turret seat once you have one.', fps: 90, cost: 1200, at: 'haven' },
  { id: 'moss', name: 'Moss', role: 'marine', skill: 'Boards with you. Follows, shoots, swears.', fps: 110, cost: 1800, at: 'hollow' }
];

export const MISSIONS = {
  bounty: { title: 'Bounty: Rook raiders', giver: 'concord', at: 'haven', sector: 'drift', count: 3, reward: 900, standing: { concord: 6, rooks: -8 }, blurb: 'Concord pays per raider confirmed destroyed in the Drift. Three will do.' },
  courier: { title: 'Courier: medicine to the Hollow', giver: 'guild', at: 'haven', to: 'hollow', cargo: { medicine: 4 }, reward: 700, standing: { guild: 5, rooks: 2 }, blurb: 'The Guild trades with anyone. Four crates of medicine for the Rooks, no questions, paid on delivery.' },
  salvage: { title: 'Salvage: the Meridian core', giver: 'concord', at: 'haven', sector: 'cinder', reward: 1400, standing: { concord: 8 }, blurb: 'The survey ship Meridian went dark in Cinder Reach. Recover her data core: that means a space walk.' },
  capture: { title: 'Capture: the Carrion', giver: 'concord', at: 'haven', sector: 'cinder', reward: 3000, standing: { concord: 15, rooks: -20 }, blurb: 'The Rook corvette Carrion patrols Cinder Reach. Board her, take her bridge, and she is yours to keep or scuttle. Concord pays either way.' },
  raid: { title: 'Raid: the Guild hauler', giver: 'rooks', at: 'hollow', sector: 'haven', reward: 1600, standing: { rooks: 12, concord: -15, guild: -20 }, blurb: 'A Guild hauler runs the Haven lane fat with parts. Take her cargo. Concord will not forgive it.' },
  courier2: { title: 'Courier: ore to Haven', giver: 'rooks', at: 'hollow', to: 'haven', cargo: { ore: 6 }, reward: 500, standing: { rooks: 4 }, blurb: 'Honest ore, dishonest miners. Haven pays well and does not ask where it came from.' }
};

export const FLEET_JOBS = [
  { id: 'patrol', name: 'Patrol the lane', minutes: 2, reward: 350, risk: 0.1, blurb: 'Escort traffic for the sector. Steady pay.' },
  { id: 'haul', name: 'Trade run', minutes: 3, reward: 650, risk: 0.2, blurb: 'A cargo run on her own. More pay, more Rooks.' }
];
