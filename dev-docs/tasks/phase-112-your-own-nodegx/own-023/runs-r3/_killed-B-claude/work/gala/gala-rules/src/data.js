// Everything the game knows, as data. The engine (engine.js) reads it, the world draws it, the sheet lists it.
// To add a costume, a move, a piece of furniture or a shop item, add a row here: nothing else needs to change
// unless the new thing has a new kind of effect.
export const hm = (h, m = 0, s = 0) => h * 3600 + m * 60 + s;

/* ---------------- the day's fixed facts ---------------- */
export const RULES = {
  arrive: hm(18, 30), warmUp: hm(18, 45), hairStart: hm(19, 0), dressedBy: hm(19, 45), snackAt: hm(19, 15),
  hallCloses: hm(21, 0), bedtime: hm(20, 45),
  setChange: 90, floorSwap: 150, wingsBefore: 150,
  stage: { halfW: 5.5, depth: 5 }, stageBig: { halfW: 6, depth: 5.5 },
  hideDx: 0.5, bump: 0.6,
  cakeKcal: 400, bottleCl: 150, crepeKcal: 150, compoteKcal: 70,
  startMin: hm(19, 45), startMax: hm(20, 30), intervalMin: 600, intervalMax: 1800,
  railCap: 8, countsPerSec: 4,
  ankle: 0.15, // the share of falls on a step above the class's level that twist an ankle
};

/* ---------------- the classes: who dances ---------------- */
// exp: experience (1 beginner .. 3 experienced); span: arms open, hand to hand, in metres
// drain: energy lost per minute awake; nerves: stage fright at the start of the evening
export const CLASSES = [
  { id: 'petits', n: 6, age: 6, scale: 0.7, kcal: 200, juice: 15, exp: 1, span: 1.0, from: 1, nerves: 30, drain: 0.2, color: '#ff9ec7', fr: 'Les petits', en: 'The little ones' },
  { id: 'moyens', n: 10, age: 10, scale: 0.85, kcal: 300, juice: 20, exp: 2, span: 1.3, from: 1, nerves: 45, drain: 0.15, color: '#7cc6ff', fr: 'Les moyens', en: 'The middles' },
  { id: 'grandes', n: 8, age: 15, scale: 1, kcal: 400, juice: 25, exp: 3, span: 1.6, from: 1, nerves: 35, drain: 0.12, color: '#b48cff', fr: 'Les grandes', en: 'The seniors' },
  { id: 'ados', n: 8, age: 13, scale: 0.95, kcal: 350, juice: 25, exp: 2, span: 1.5, from: 3, nerves: 40, drain: 0.13, color: '#ffb86b', fr: 'Les ados', en: 'The teens' },
  { id: 'mamans', n: 6, age: 38, scale: 1.04, kcal: 300, juice: 25, exp: 1, span: 1.7, from: 4, nerves: 60, drain: 0.1, color: '#86d9a6', fr: 'Les mamans', en: 'The mums' },
];
export const CLS = Object.fromEntries(CLASSES.map((c) => [c.id, c]));
export const NAMES = {
  petits: ['Lou', 'Mila', 'Jade', 'Rose', 'Nino', 'Alba'],
  moyens: ['Inès', 'Léna', 'Chloé', 'Manon', 'Zoé', 'Sacha', 'Lina', 'Maëlle', 'Romy', 'Iris'],
  grandes: ['Camille', 'Juliette', 'Clara', 'Anaïs', 'Margaux', 'Louise', 'Emma', 'Salomé'],
  ados: ['Yanis', 'Kenza', 'Noé', 'Maya', 'Lilou', 'Tom', 'Aya', 'Nora'],
  mamans: ['Sophie', 'Nadia', 'Claire', 'Fatou', 'Hélène', 'Julie'],
};

/* ---------------- the numbers: one piece of music each ---------------- */
// counts = the beats in the music; the music lasts counts × 60 ÷ bpm seconds
// floor: classical and contemporary dance on the dance mat ("tapis"), jazz and hip-hop on the wooden boards
export const NUMBERS = {
  P1: { cls: 'petits', bpm: 96, counts: 288, style: 'classique', mood: 'calme', theme: 'lucioles', fr: 'Les lucioles', en: 'Fireflies' },
  P2: { cls: 'petits', bpm: 120, counts: 288, style: 'jazz', mood: 'vif', theme: 'lapins', fr: 'La ronde des lapins', en: 'Rabbit round' },
  M1: { cls: 'moyens', bpm: 90, counts: 384, style: 'contemporain', mood: 'calme', theme: 'vent', fr: 'Le vent', en: 'The wind' },
  M2: { cls: 'moyens', bpm: 128, counts: 384, style: 'jazz', mood: 'vif', theme: 'marins', fr: 'Les marins', en: 'Sailors' },
  G1: { cls: 'grandes', bpm: 120, counts: 480, style: 'classique', mood: 'calme', theme: 'lumiere', fr: 'Lumière', en: 'Light' },
  G2: { cls: 'grandes', bpm: 96, counts: 480, style: 'classique', mood: 'calme', theme: 'lac', fr: 'Le lac', en: 'The lake' },
  A1: { cls: 'ados', bpm: 100, counts: 320, style: 'hiphop', mood: 'vif', theme: 'street', fr: 'Dans la rue', en: 'Street' },
  A2: { cls: 'ados', bpm: 120, counts: 384, style: 'hiphop', mood: 'vif', theme: 'battle', fr: 'La battle', en: 'The battle' },
  F1: { cls: 'mamans', bpm: 120, counts: 256, style: 'jazz', mood: 'vif', theme: 'disco', fr: 'Disco des mamans', en: 'Mums’ disco' },
};
export const numDur = (id) => (NUMBERS[id].counts * 60) / NUMBERS[id].bpm;
export const OTHER_ITEMS = { accueil: { kind: 'talk', dur: 240 }, entracte: { kind: 'interval' }, final: { kind: 'finale', dur: 180 } };
export const itemKind = (id) => (NUMBERS[id] ? 'number' : OTHER_ITEMS[id].kind);
export const STYLES = {
  classique: { icon: '🩰', floor: 'tapis', fr: 'classique', en: 'ballet' },
  contemporain: { icon: '🌊', floor: 'tapis', fr: 'contemporain', en: 'contemporary' },
  jazz: { icon: '🎷', floor: 'bois', fr: 'jazz', en: 'jazz' },
  hiphop: { icon: '🧢', floor: 'bois', fr: 'hip-hop', en: 'hip-hop' },
};

/* ---------------- the moves she chains into a phrase ---------------- */
// counts: 4 or 8; diff 1..3; a = the level it starts on, b = the level it ends on (0 floor, 1 standing, 2 up in the air);
// dx: metres to the right (seen from the audience), dz: metres back (away from the audience);
// st: the styles it belongs to ('*' every style); swap: walks to the other formation
export const MOVES = {
  plie: { c: 4, d: 1, a: 1, b: 1, st: '*', icon: '🙇', fr: 'Plié', en: 'Plié' },
  releve: { c: 4, d: 1, a: 1, b: 2, st: 'classique contemporain jazz', icon: '⬆️', fr: 'Relevé', en: 'Rise' },
  bras: { c: 8, d: 1, a: 1, b: 1, st: 'classique contemporain', icon: '🦢', fr: 'Port de bras', en: 'Arm sweep' },
  chasseD: { c: 8, d: 1, a: 1, b: 1, dx: 1, st: '*', icon: '➡️', fr: 'Chassé à droite', en: 'Chassé right' },
  chasseG: { c: 8, d: 1, a: 1, b: 1, dx: -1, st: '*', icon: '⬅️', fr: 'Chassé à gauche', en: 'Chassé left' },
  avance: { c: 4, d: 1, a: 1, b: 1, dz: -1, st: '*', icon: '⏬', fr: 'Pas en avant', en: 'Step forward' },
  recule: { c: 4, d: 1, a: 1, b: 1, dz: 1, st: '*', icon: '⏫', fr: 'Pas en arrière', en: 'Step back' },
  tourne: { c: 4, d: 1, a: 1, b: 1, st: '*', icon: '🔄', fr: 'Tour sur soi', en: 'Spin' },
  saute: { c: 4, d: 1, a: 1, b: 2, st: '*', icon: '🐇', fr: 'Petits sauts', en: 'Hops' },
  reception: { c: 4, d: 1, a: 2, b: 1, st: '*', icon: '🛬', fr: 'Réception', en: 'Landing' },
  clap: { c: 4, d: 1, a: 1, b: 1, st: 'jazz hiphop', icon: '👏', fr: 'Tape des mains', en: 'Clap' },
  vague: { c: 4, d: 1, a: 1, b: 1, st: 'hiphop jazz contemporain', icon: '〰️', fr: 'Vague', en: 'Body wave' },
  descente: { c: 4, d: 1, a: 1, b: 0, st: 'contemporain jazz hiphop', icon: '⤵️', fr: 'Descente au sol', en: 'Down to the floor' },
  remonte: { c: 4, d: 1, a: 0, b: 1, st: '*', icon: '⤴️', fr: 'Se relever', en: 'Get up' },
  pirouette: { c: 4, d: 2, a: 2, b: 1, st: 'classique jazz contemporain', icon: '🌀', fr: 'Pirouette', en: 'Pirouette' },
  arabesque: { c: 8, d: 2, a: 1, b: 1, st: 'classique contemporain', icon: '🕊️', fr: 'Arabesque', en: 'Arabesque' },
  sautChat: { c: 4, d: 2, a: 1, b: 2, st: 'classique jazz', icon: '🐈', fr: 'Saut de chat', en: 'Cat leap' },
  kick: { c: 4, d: 2, a: 1, b: 1, st: 'jazz', icon: '🦵', fr: 'Kick jazz', en: 'Jazz kick' },
  roulade: { c: 8, d: 2, a: 0, b: 0, st: 'contemporain hiphop', icon: '🌪️', fr: 'Roulade au sol', en: 'Floor roll' },
  moonwalk: { c: 8, d: 2, a: 1, b: 1, dx: -1, st: 'hiphop jazz', icon: '🌙', fr: 'Moonwalk', en: 'Moonwalk' },
  toprock: { c: 8, d: 1, a: 1, b: 1, st: 'hiphop', icon: '🕺', fr: 'Toprock', en: 'Toprock' },
  grandJete: { c: 8, d: 3, a: 1, b: 2, dx: 1, st: 'classique contemporain', icon: '🦌', fr: 'Grand jeté', en: 'Grand jeté' },
  fouette: { c: 8, d: 3, a: 2, b: 2, st: 'classique', icon: '💫', fr: 'Fouettés', en: 'Fouettés' },
  freeze: { c: 4, d: 3, a: 0, b: 0, st: 'hiphop', icon: '🧊', fr: 'Freeze', en: 'Freeze' },
  echange: { c: 8, d: 1, a: 1, b: 1, swap: true, st: '*', icon: '🔀', fr: 'Changer de place', en: 'Swap places' },
  reverence: { c: 4, d: 1, a: 1, b: 1, st: '*', icon: '🎀', fr: 'Révérence', en: 'Curtsy' },
};
export const MAX_MOVES = 12;
export const LEVELS = { fr: ['au sol', 'debout', 'en l’air'], en: ['on the floor', 'standing', 'in the air'] };

/* ---------------- the costumes ---------------- */
// min: minutes to put it on; themes: the numbers it suits (a costume that suits the number makes the parents go "oh!")
export const OUTFITS = {
  justaucorps: { min: 2, fr: 'Justaucorps', en: 'Leotard', icon: '🩱' },
  jupette: { min: 3, fr: 'Jupette', en: 'Skirt', icon: '👗' },
  tutu: { min: 4, fr: 'Tutu', en: 'Tutu', icon: '🩰', themes: ['lumiere'] },
  robe: { min: 4, price: 20, fr: 'Robe longue', en: 'Long dress', icon: '👘', themes: ['vent'] },
  marin: { min: 3, price: 20, fr: 'Marinière', en: 'Sailor', icon: '⚓', themes: ['marins'] },
  fee: { min: 6, price: 35, fr: 'Fée', en: 'Fairy', icon: '🧚', themes: ['lucioles', 'lumiere'] },
  papillon: { min: 5, price: 30, fr: 'Papillon', en: 'Butterfly', icon: '🦋', themes: ['vent', 'lucioles'] },
  cygne: { min: 6, price: 40, fr: 'Cygne', en: 'Swan', icon: '🦢', themes: ['lac'] },
  lapin: { min: 4, price: 25, fr: 'Lapin', en: 'Bunny', icon: '🐰', themes: ['lapins'] },
  flocon: { min: 5, price: 30, fr: 'Flocon', en: 'Snowflake', icon: '❄️', themes: ['lac', 'vent'] },
  etoile: { min: 4, price: 35, fr: 'Étoile à paillettes', en: 'Sequin star', icon: '⭐', themes: ['lumiere', 'disco'] },
  flamenco: { min: 5, price: 30, fr: 'Robe à volants', en: 'Flamenco dress', icon: '💃', themes: ['disco'] },
  princesse: { min: 6, price: 40, fr: 'Princesse', en: 'Princess', icon: '👑', themes: ['lumiere', 'lac'] },
  street: { min: 2, fr: 'Jogging et sweat', en: 'Joggers and hoodie', icon: '🧢', themes: ['street', 'battle'], season: 3 },
  abeille: { min: 4, price: 25, fr: 'Abeille', en: 'Bee', icon: '🐝', themes: ['lapins'] },
  disco: { min: 3, price: 25, fr: 'Combi disco', en: 'Disco jumpsuit', icon: '🪩', themes: ['disco', 'battle'] },
};
// min: minutes to do one dancer's hair
export const HAIRS = {
  chignon: { min: 4, fr: 'Chignon', en: 'Bun' },
  queue: { min: 2, fr: 'Queue de cheval', en: 'Ponytail' },
  tresses: { min: 6, fr: 'Tresses', en: 'Braids' },
  carre: { min: 1, fr: 'Carré', en: 'Bob' },
  couettes: { min: 3, price: 10, fr: 'Couettes', en: 'Pigtails' },
  laches: { min: 1, price: 10, fr: 'Cheveux lâchés', en: 'Hair down' },
  macarons: { min: 5, price: 15, fr: 'Macarons', en: 'Space buns' },
  couronne: { min: 8, price: 20, fr: 'Couronne de tresses', en: 'Crown braid' },
  ruban: { min: 3, price: 15, fr: 'Queue haute à ruban', en: 'High pony with ribbon' },
  afro: { min: 2, price: 15, fr: 'Afro', en: 'Afro' },
};
export const SHOES = {
  demi: { fr: 'Demi-pointes', en: 'Ballet slippers', color: '#f2a7bb' },
  pieds: { fr: 'Pieds nus', en: 'Barefoot', color: null },
  pointes: { price: 30, fr: 'Pointes', en: 'Pointe shoes', color: '#ffc9d6', expMin: 3 },
  jazz: { price: 15, fr: 'Bottines jazz', en: 'Jazz boots', color: '#2b2236' },
  baskets: { price: 15, fr: 'Baskets', en: 'Trainers', color: '#ffffff', season: 3 },
  paillettes: { price: 25, fr: 'Chaussons à paillettes', en: 'Glitter slippers', color: '#f5d76e' },
  claquettes: { price: 20, fr: 'Claquettes', en: 'Tap shoes', color: '#1b1720' },
};
export const ACCS = {
  aucun: { fr: 'Rien', en: 'Nothing' },
  noeud: { fr: 'Nœud', en: 'Bow' },
  tiare: { price: 20, fr: 'Tiare', en: 'Tiara', themes: ['lac', 'lumiere'] },
  fleurs: { price: 15, fr: 'Couronne de fleurs', en: 'Flower crown', themes: ['vent', 'lucioles'] },
  ailes: { price: 30, fr: 'Ailes', en: 'Wings', themes: ['lucioles'] },
  oreilles: { price: 15, fr: 'Oreilles de lapin', en: 'Bunny ears', themes: ['lapins'] },
  casquette: { price: 10, fr: 'Casquette', en: 'Cap', themes: ['street', 'battle'] },
  beret: { price: 10, fr: 'Béret de marin', en: 'Sailor cap', themes: ['marins'] },
  baguette: { price: 15, fr: 'Baguette magique', en: 'Magic wand', themes: ['lucioles'] },
  antennes: { price: 15, fr: 'Antennes', en: 'Antennae', themes: ['lapins'] },
};
export const COLORS = ['#ff9ec7', '#ff6f91', '#c23652', '#ffb86b', '#f5d76e', '#86d9a6', '#2e8b8b', '#7cc6ff', '#4f7cff', '#b48cff', '#ffffff', '#2b2236'];

/* ---------------- the dressing room ("la loge") ---------------- */
// w × d tiles of 1 m; wall: must stand with its back against a wall, facing the room; flat: a rug, you can walk on it
// the effects are read by the engine: postes (hair stations), rail (holds 8 costumes), seats, calm (less stage fright),
// and the named effects (water, fruit, fan, shoes, screen, sieste, doudous, barre, clock, music)
export const PIECES = {
  miroir: { w: 1, d: 1, wall: true, icon: '🪞', fx: { postes: 1 }, fr: 'Miroir', en: 'Mirror' },
  banc: { w: 2, d: 1, icon: '🪑', fx: { seats: 2 }, fr: 'Banc', en: 'Bench' },
  portant: { w: 2, d: 1, icon: '👗', fx: { rail: 1 }, fr: 'Portant', en: 'Clothes rail' },
  chaise: { w: 1, d: 1, icon: '💺', fx: { seats: 1 }, fr: 'Chaise', en: 'Chair' },
  plante: { w: 1, d: 1, icon: '🪴', fx: { calm: 4 }, fr: 'Plante', en: 'Plant' },
  lampe: { w: 1, d: 1, icon: '💡', fx: { calm: 3 }, fr: 'Lampe douce', en: 'Soft lamp' },
  tapis: { w: 2, d: 2, flat: true, icon: '🟪', fx: { calm: 3 }, fr: 'Tapis', en: 'Rug' },
  coiffeuse: { w: 2, d: 1, wall: true, icon: '💄', fx: { postes: 2 }, price: 30, fr: 'Coiffeuse lumineuse', en: 'Make-up table' },
  etagere: { w: 2, d: 1, wall: true, icon: '👟', fx: { shoes: 1 }, price: 20, fr: 'Étagère à chaussons', en: 'Shoe shelf' },
  pouf: { w: 1, d: 1, icon: '🟣', fx: { seats: 1, calm: 1 }, price: 10, fr: 'Pouf', en: 'Pouffe' },
  canape: { w: 3, d: 1, icon: '🛋️', fx: { seats: 3, calm: 2 }, price: 35, fr: 'Canapé', en: 'Sofa' },
  paravent: { w: 2, d: 1, icon: '🎎', fx: { screen: 1 }, price: 20, fr: 'Paravent', en: 'Changing screen' },
  fontaine: { w: 1, d: 1, wall: true, icon: '🚰', fx: { water: 1 }, price: 25, fr: 'Fontaine à eau', en: 'Water cooler' },
  fruits: { w: 1, d: 1, icon: '🍎', fx: { fruit: 1 }, price: 15, fr: 'Corbeille de fruits', en: 'Fruit bowl' },
  enceinte: { w: 1, d: 1, icon: '🔊', fx: { calm: 8, music: 1 }, price: 25, fr: 'Enceinte', en: 'Speaker' },
  barre: { w: 3, d: 1, wall: true, icon: '🤸', fx: { calm: 6, barre: 1 }, price: 30, fr: 'Barre d’échauffement', en: 'Warm-up barre' },
  ventilo: { w: 1, d: 1, icon: '🌀', fx: { fan: 1 }, price: 15, fr: 'Ventilateur', en: 'Fan' },
  doudous: { w: 1, d: 1, icon: '🧸', fx: { doudous: 1 }, price: 15, fr: 'Coffre à doudous', en: 'Cuddly-toy chest' },
  sieste: { w: 2, d: 2, flat: true, icon: '😴', fx: { sieste: 1 }, price: 30, fr: 'Coin sieste', en: 'Nap corner' },
  horloge: { w: 1, d: 1, wall: true, icon: '🕰️', fx: { clock: 1 }, price: 10, fr: 'Horloge', en: 'Wall clock' },
};
export const LOGE = { rows: 8, cols: 10, colsBig: 13 };
// the doorways: nothing may stand in them
export const doorTiles = (cols) => [[0, 1], [0, 2], [4, 7], [5, 7]].filter(([c]) => c < cols);

/* ---------------- the goûter and the snack before the show ---------------- */
export const SNACKS = {
  rien: { relief: 0, boost: 0, crash: 0, fr: 'Rien', en: 'Nothing', icon: '🚫' },
  bonbons: { relief: 15, boost: 15, crash: 20, fr: 'Bonbons', en: 'Sweets', icon: '🍬' },
  fruits: { relief: 25, boost: 5, crash: 0, fr: 'Fruits', en: 'Fruit', icon: '🍌' },
  barres: { relief: 35, boost: 10, crash: 0, price: 15, fr: 'Barres de céréales', en: 'Cereal bars', icon: '🥣' },
  tartines: { relief: 45, boost: 5, crash: 0, price: 20, fr: 'Tartines', en: 'Bread and jam', icon: '🍞' },
};

/* ---------------- the hall, the car park: what the shop sells beyond costumes ---------------- */
export const UPGRADES = {
  sieges: { price: 40, max: 3, icon: '💺', fr: 'Une rangée de 14 sièges', en: 'A row of 14 seats' },
  confort: { price: 60, icon: '🛋️', fr: 'Sièges en velours moelleux', en: 'Soft velvet seats' },
  buvette: { price: 50, icon: '🥤', fr: 'Buvette (boissons et crêpes à l’entracte)', en: 'Snack bar (drinks at the interval)' },
  projecteurs: { price: 60, icon: '🔦', fr: 'Projecteurs de couleur', en: 'Coloured spotlights' },
  boule: { price: 40, icon: '🪩', fr: 'Boule à facettes', en: 'Disco ball' },
  scene: { price: 90, icon: '🎭', fr: 'Agrandir la scène (+1 m de large)', en: 'Bigger stage (+1 m wide)' },
  decorForet: { price: 20, icon: '🌳', fr: 'Décor : la forêt', en: 'Backdrop: the forest' },
  decorMer: { price: 20, icon: '🌊', fr: 'Décor : la mer', en: 'Backdrop: the sea' },
  decorVille: { price: 20, icon: '🏙️', fr: 'Décor : la ville', en: 'Backdrop: the city' },
  logeXL: { price: 80, icon: '🧱', fr: 'Agrandir la loge (+3 m)', en: 'Bigger dressing room (+3 m)' },
  placeur: { price: 25, season: 2, icon: '🦺', fr: 'Un placeur au portail', en: 'A car-park attendant' },
  covoit: { price: 30, season: 2, icon: '🚙', fr: 'Affiche « covoiturage »', en: '“Car-share” poster' },
  navette: { price: 60, season: 2, icon: '🚐', fr: 'Navette depuis le supermarché', en: 'Shuttle from the supermarket' },
  rangee: { price: 100, season: 2, icon: '🅿️', fr: 'Une 2e rangée de places', en: 'A 2nd row of bays' },
};
export const BACKDROPS = { nuit: { icon: '🌙' }, foret: { icon: '🌳', need: 'decorForet' }, mer: { icon: '🌊', need: 'decorMer' }, ville: { icon: '🏙️', need: 'decorVille' } };
// the backdrop that suits a number makes it shine a little more
export const BACKDROP_THEMES = { nuit: ['lucioles', 'lumiere'], foret: ['lapins', 'vent'], mer: ['marins', 'lac'], ville: ['street', 'battle', 'disco'] };

export const PARKING = {
  lotLength: 28, widths: [2.2, 2.5, 2.8], doorsOptions: [15, 30, 45, 60],
  perFamily: 0.8, perCar: 2.2, guestsPerSeason: 4, gateRate: 2, gateRatePlaceur: 3,
  parkMin: { 2.2: 1, 2.5: 0.5, 2.8: 0.5 }, walkFromBay: 1, overflowDrive: 2, overflowWalk: 12, shuttleWalk: 4, carpool: 0.25,
};

/* ---------------- the seasons: a new challenge each year ---------------- */
export const SEASONS = [
  { n: 1, icon: '🌟' },
  { n: 2, icon: '🚗', adds: ['parking'] },
  { n: 3, icon: '🧢', adds: ['ados', 'floors', 'moods'] },
  { n: 4, icon: '💃', adds: ['mamans'] },
];
export const seasonRules = (season) => ({
  season, parking: season >= 2, floors: season >= 3, moods: season >= 3,
  classes: CLASSES.filter((c) => c.from <= season).map((c) => c.id),
});
// the stars a new school starts with
export const START = { stars: 30 };

/* ---------------- the rows a grown-up may change ---------------- */
// Everything above is the default game. applyRows(over) lays changed rows over it, in place, before the game starts:
//   { moves: { plie: { fr: 'Plié royal' } }, outfits: { fee: { price: 20 } }, start: { stars: 50 } }
// A row that exists gets the given fields; a new id adds a row (it must carry every field its table's rows have);
// nothing is removed. Every module reads these same objects, so a change reaches the rules, the 3D and the sheet alike.
// WHERE the changes are kept between visits is the page's business, not this file's.
const ROW_TABLES = { classes: CLS, names: NAMES, numbers: NUMBERS, moves: MOVES, outfits: OUTFITS, hairs: HAIRS, shoes: SHOES, accs: ACCS, pieces: PIECES, snacks: SNACKS, upgrades: UPGRADES };
const ONE_ROW = { rules: RULES, start: START, parking: PARKING };
export const EDITABLE = [...Object.keys(ROW_TABLES), ...Object.keys(ONE_ROW)];
export function applyRows(over = {}) {
  for (const [t, rows] of Object.entries(over)) {
    if (ONE_ROW[t]) { Object.assign(ONE_ROW[t], rows); continue; }
    const T = ROW_TABLES[t]; if (!T) throw new Error(`applyRows: no table "${t}" (tables: ${EDITABLE.join(', ')})`);
    for (const [id, row] of Object.entries(rows)) {
      if (Array.isArray(row) || !T[id] || typeof T[id] !== 'object' || Array.isArray(T[id])) T[id] = row;
      else Object.assign(T[id], row);
      if (t === 'classes' && !CLASSES.includes(T[id])) CLASSES.push(T[id]);
    }
  }
}
