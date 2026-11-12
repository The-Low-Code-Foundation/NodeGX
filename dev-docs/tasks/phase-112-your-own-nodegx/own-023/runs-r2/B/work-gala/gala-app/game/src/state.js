// The one shared object every module reads: the save (G.S) and what is happening on screen right now.
import { defaultPlan, defaultSchool, addSeasonNumbers, numberPlan, migrateNumber, DEFAULT_HAIR } from './plan.js';
import { NUMBERS, MOVES, OUTFITS, HAIRS, SHOES, ACCS } from './data.js';

export const G = {
  S: null, lang: 'fr',
  screen: 'prep', tab: 'order', run: null, speed: 1, follow: true,
  pickedRoom: null, armed: null, selected: null,
  pickNum: 'G1', editB: false, pickDancer: null, ruler: null,
  realT: 0, frames: 0,
};

/* ---------------- the save ---------------- */
const SAVE_KEY = 'gala-game-v2', OLD_KEY = 'gala-toy-v1';
export function fresh() {
  return { v: 2, lang: 'fr', season: 1, galaDone: false, seenIntro: 0, plan: defaultPlan(), school: defaultSchool(), notebook: [], sound: true, seed: (Math.random() * 1e9) >>> 0 };
}
// round 1's save: the running order, the formation and the goûter carry over; costumes per class become costumes per number
function fromRound1(o) {
  const s = fresh(), p = s.plan;
  try {
    if (o.plan) {
      p.start = o.plan.start ?? p.start; p.interval = o.plan.interval ?? p.interval;
      if (Array.isArray(o.plan.order) && o.plan.order.every((id) => NUMBERS[id] || ['accueil', 'entracte', 'final'].includes(id))) p.order = o.plan.order;
      if (Array.isArray(o.plan.formation) && o.plan.formation.length === 8) p.numbers.G1.A = o.plan.formation.map((q) => ({ x: q.x, z: q.z }));
      p.cakeG = o.plan.cakeG ?? p.cakeG; p.bottles = o.plan.bottles ?? p.bottles;
    }
    if (o.school) {
      s.school.name = o.school.name || '';
      const cos = o.school.costumes || {};
      for (const [id, np] of Object.entries(p.numbers)) { const c = cos[NUMBERS[id].cls]; if (c) { np.costume.color = c.color; if (['tutu', 'jupette', 'justaucorps'].includes(c.style)) np.costume.outfit = c.style; } }
      for (const [cls, c] of Object.entries(cos)) { const h = { bun: 'chignon', ponytail: 'queue', braids: 'tresses', bob: 'carre' }[c.hair]; if (h) p.hair[cls] = h; }
    }
    s.lang = o.lang || 'fr';
  } catch { /* a broken old save starts fresh */ }
  return s;
}
// fill in anything a newer version added, so an older save keeps working
function mend(s) {
  const f = fresh();
  for (const k of Object.keys(f)) if (s[k] === undefined) s[k] = f[k];
  for (const k of Object.keys(f.plan)) if (s.plan[k] === undefined) s.plan[k] = f.plan[k];
  for (const k of Object.keys(f.school)) if (s.school[k] === undefined) s.school[k] = f.school[k];
  addSeasonNumbers(s.plan, s.season);
  for (const id of Object.keys(s.plan.numbers)) { const np = s.plan.numbers[id]; s.plan.numbers[id] = np.blocks || np.moves ? migrateNumber(np) : numberPlan(id); }
  for (const c of Object.keys(DEFAULT_HAIR)) if (!s.plan.hair[c] && c in s.plan.hair) s.plan.hair[c] = DEFAULT_HAIR[c];
  forgetWhatIsGone(s.plan);
  return s;
}
// a step or a costume a grown-up added and has since taken away: the save forgets it rather than break the game
function forgetWhatIsGone(plan) {
  const has = (table, id) => Object.prototype.hasOwnProperty.call(table, id);
  for (const [id, np] of Object.entries(plan.numbers)) {
    for (const b of np.blocks || []) b.moves = (b.moves || []).filter((m) => has(MOVES, m));
    const c = np.costume || {}, d = numberPlan(id).costume;
    if (!has(OUTFITS, c.outfit)) c.outfit = d.outfit;
    if (!has(SHOES, c.shoes)) c.shoes = d.shoes;
    if (!has(ACCS, c.acc)) c.acc = d.acc;
    np.costume = c;
  }
  for (const cls of Object.keys(plan.hair)) if (!has(HAIRS, plan.hair[cls])) plan.hair[cls] = DEFAULT_HAIR[cls];
}
export function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) { const s = JSON.parse(raw); if (s && s.v === 2) { G.S = mend(s); G.lang = G.S.lang || 'fr'; return; } }
    const old = localStorage.getItem(OLD_KEY);
    if (old) { const o = JSON.parse(old); if (o && o.v === 1) { G.S = mend(fromRound1(o)); G.lang = G.S.lang; return; } }
  } catch { /* storage blocked: play without a save */ }
  G.S = fresh(); G.lang = 'fr';
}
export function save() { try { G.S.lang = G.lang; localStorage.setItem(SAVE_KEY, JSON.stringify(G.S)); } catch { /* storage blocked */ } }
export function resetAll() { G.S = fresh(); save(); }
