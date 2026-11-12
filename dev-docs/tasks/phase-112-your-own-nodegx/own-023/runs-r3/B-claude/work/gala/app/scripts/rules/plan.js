// GENERATED from gala-rules/src/plan.js by tools/sync-rules.mjs — do not edit here, edit gala-rules and run it again.
// The starting plan and the starting school, and how a season adds its new numbers. Pure: no DOM, no three.js.
const { hm, NUMBERS, CLS, LOGE, seasonRules, START } = use('rules/data');

const xz = (pts) => pts.map(([x, z]) => ({ x, z }));
// each number's starting formation: every one fits on the stage except the seniors' "Lumière", a line a metre apart
// (the arms of a senior span 1.6 m: the first rehearsal shows their hands touching, as in round 1)
const FORMATIONS = {
  petits: xz([[-2.5, 1], [-0.5, 1], [1.5, 1], [-1.5, 2.5], [0.5, 2.5], [2.5, 2.5]]),
  moyens: xz([[-3.5, 1], [-1.5, 1], [0.5, 1], [2.5, 1], [-2.5, 2.5], [-0.5, 2.5], [1.5, 2.5], [3.5, 2.5], [-3, 4], [3, 4]]),
  grandes: xz([[-3, 1.5], [-1, 1.5], [1, 1.5], [3, 1.5], [-4, 3.5], [-2, 3.5], [2, 3.5], [4, 3.5]]),
  ados: xz([[-3, 1.5], [-1, 1.5], [1, 1.5], [3, 1.5], [-4, 3.5], [-2, 3.5], [2, 3.5], [4, 3.5]]),
  mamans: xz([[-3, 1.5], [0, 1.5], [3, 1.5], [-4.5, 3.5], [-1.5, 3.5], [1.5, 3.5]]),
};
const G1_LINE = xz([[-3.5, 1.5], [-2.5, 1.5], [-1.5, 1.5], [-0.5, 1.5], [0.5, 1.5], [1.5, 1.5], [2.5, 1.5], [3.5, 1.5]]);
// each number's starting phrase and how many times it repeats (one block, chained that many times). All fill their music
// exactly, except "Lumière": 16 × 32 = 512 counts for 480 counts of music, and a pirouette straight off the floor
const ROUTINES = {
  P1: { moves: ['plie', 'bras', 'saute', 'reception', 'tourne', 'plie', 'reverence'], repeats: 9 },
  P2: { moves: ['clap', 'chasseD', 'clap', 'chasseG', 'saute', 'reception'], repeats: 9 },
  M1: { moves: ['bras', 'descente', 'roulade', 'remonte', 'arabesque'], repeats: 12 },
  M2: { moves: ['kick', 'chasseD', 'kick', 'chasseG', 'sautChat', 'reception'], repeats: 12 },
  G1: { moves: ['plie', 'bras', 'arabesque', 'descente', 'pirouette', 'reverence'], repeats: 16 },
  G2: { moves: ['releve', 'pirouette', 'bras', 'chasseD', 'chasseG'], repeats: 15 },
  A1: { moves: ['toprock', 'vague', 'clap', 'moonwalk', 'chasseD'], repeats: 10 },
  A2: { moves: ['toprock', 'descente', 'freeze', 'remonte', 'vague', 'toprock'], repeats: 12 },
  F1: { moves: ['clap', 'chasseD', 'chasseG', 'tourne', 'kick', 'clap'], repeats: 8 },
};
const COSTUMES = {
  P1: { outfit: 'tutu', color: '#ff9ec7', shoes: 'demi', acc: 'noeud' }, P2: { outfit: 'jupette', color: '#ff6f91', shoes: 'demi', acc: 'aucun' },
  M1: { outfit: 'jupette', color: '#7cc6ff', shoes: 'pieds', acc: 'aucun' }, M2: { outfit: 'justaucorps', color: '#4f7cff', shoes: 'demi', acc: 'aucun' },
  G1: { outfit: 'justaucorps', color: '#b48cff', shoes: 'demi', acc: 'aucun' }, G2: { outfit: 'tutu', color: '#ffffff', shoes: 'demi', acc: 'aucun' },
  A1: { outfit: 'street', color: '#c23652', shoes: 'baskets', acc: 'aucun' }, A2: { outfit: 'street', color: '#2b2236', shoes: 'baskets', acc: 'aucun' },
  F1: { outfit: 'jupette', color: '#86d9a6', shoes: 'demi', acc: 'noeud' },
};
const DEFAULT_HAIR = { petits: 'chignon', moyens: 'queue', grandes: 'chignon', ados: 'queue', mamans: 'carre' };

function numberPlan(id) {
  const cls = NUMBERS[id].cls, A = (id === 'G1' ? G1_LINE : FORMATIONS[cls]).map((p) => ({ ...p }));
  return { A, B: null, ...oneBlock(ROUTINES[id].moves, ROUTINES[id].repeats), costume: { ...COSTUMES[id] } };
}
// a dance as blocks and a chain: round 2's "phrase × repeats" is one block, chained `repeats` times
const oneBlock = (moves, repeats) => ({ blocks: [{ id: 'a', name: 'A', moves: [...moves] }], chain: Array(repeats).fill('a') });
// an older save's number (moves + repeats) becomes one block, chained as many times: the same dance, nothing lost
function migrateNumber(np) {
  if (np.blocks) return np;
  const { moves = [], repeats = 1, ...rest } = np;
  return { ...rest, ...oneBlock(moves, repeats) };
}

function defaultPlan() {
  const numbers = {};
  for (const id of ['P1', 'P2', 'M1', 'M2', 'G1', 'G2']) numbers[id] = numberPlan(id);
  return {
    start: hm(20, 0), interval: 1500,
    order: ['accueil', 'P1', 'M1', 'G1', 'entracte', 'P2', 'M2', 'G2', 'final'],
    numbers, hair: { petits: 'chignon', moyens: 'queue', grandes: 'chignon' },
    snack: 'rien', cakeG: 1500, bottles: 3, crepes: 0, compotes: 0,
    parking: { width: 2.5, doors: 30 }, backdrop: 'nuit',
  };
}

function defaultSchool() {
  return {
    name: '', logeCols: LOGE.cols, stars: START.stars, earned: 0, owned: {}, upgrades: {},
    furniture: [
      { id: 'banc', c: 1, r: 4, rot: 0 }, { id: 'portant', c: 6, r: 5, rot: 0 },
      { id: 'miroir', c: 3, r: 0, rot: 0 }, { id: 'miroir', c: 5, r: 0, rot: 0 },
    ],
  };
}

// a new season brings its new classes: their numbers join the programme just before the interval and the finale
const ARRIVALS = { ados: [['A1', 'entracte'], ['A2', 'final']], mamans: [['F1', 'final']] };
function addSeasonNumbers(plan, season) {
  for (const cls of seasonRules(season).classes) {
    if (!ARRIVALS[cls]) continue;
    if (!plan.hair[cls]) plan.hair[cls] = DEFAULT_HAIR[cls];
    for (const [id, before] of ARRIVALS[cls]) {
      if (plan.numbers[id]) continue;
      plan.numbers[id] = numberPlan(id);
      const k = plan.order.indexOf(before); plan.order.splice(k < 0 ? plan.order.length - 1 : k, 0, id);
    }
  }
  return plan;
}
const classOf = (id) => CLS[NUMBERS[id].cls];

Object.assign(exports, { DEFAULT_HAIR, numberPlan, oneBlock, migrateNumber, defaultPlan, defaultSchool, addSeasonNumbers, classOf });
