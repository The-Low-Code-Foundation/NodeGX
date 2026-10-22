// The one shared object every module reads: the save (G.S) and what is happening on screen right now.
// The save lives in two places: this browser (localStorage) and the server's save.json, outside the game folder, so it
// survives a cleared browser and a new version of the game. Whichever copy was written last (`at`) wins.
import { defaultPlan, defaultSchool, addSeasonNumbers, numberPlan, migrateNumber, DEFAULT_HAIR } from './plan.js';
import { NUMBERS, MOVES, OUTFITS, SHOES, ACCS, HAIRS, START } from './data.js';
import { clean } from './words.js';
import { putFile } from './store.js';

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
  return { v: 2, at: 0, lang: 'fr', season: 1, galaDone: false, seenIntro: 0, plan: defaultPlan(), school: defaultSchool(), notebook: [], sound: true, seed: (Math.random() * 1e9) >>> 0 };
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
export function mend(s) {
  const f = fresh();
  for (const k of Object.keys(f)) if (s[k] === undefined) s[k] = f[k];
  for (const k of Object.keys(f.plan)) if (s.plan[k] === undefined) s.plan[k] = f.plan[k];
  for (const k of Object.keys(f.school)) if (s.school[k] === undefined) s.school[k] = f.school[k];
  if (!Number.isFinite(s.at)) s.at = 0;
  addSeasonNumbers(s.plan, s.season);
  for (const id of Object.keys(s.plan.numbers)) { const np = s.plan.numbers[id]; s.plan.numbers[id] = np.blocks || np.moves ? migrateNumber(np) : numberPlan(id); }
  for (const c of Object.keys(DEFAULT_HAIR)) if (!s.plan.hair[c] && c in s.plan.hair) s.plan.hair[c] = DEFAULT_HAIR[c];
  // a costume, a step or a hairdo a grown-up has since taken out of the settings: back to the number's own
  for (const [id, np] of Object.entries(s.plan.numbers)) {
    const own = numberPlan(id).costume, cos = np.costume;
    if (!OUTFITS[cos.outfit]) cos.outfit = own.outfit;
    if (!SHOES[cos.shoes]) cos.shoes = own.shoes;
    if (!ACCS[cos.acc]) cos.acc = own.acc;
    for (const b of np.blocks) { b.moves = b.moves.filter((m) => MOVES[m]); b.name = clean(b.name, b.id.toUpperCase(), 24); }
  }
  for (const c of Object.keys(s.plan.hair)) if (!HAIRS[s.plan.hair[c]]) s.plan.hair[c] = DEFAULT_HAIR[c] || 'queue';
  // whatever a save says, the name is kind and the stars a sane number
  s.school.name = clean(s.school.name, '', 40);
  s.school.stars = Number.isFinite(s.school.stars) ? Math.max(0, Math.min(999999, Math.round(s.school.stars))) : START.stars;
  return s;
}
function fromLocal() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (raw) { const s = JSON.parse(raw); if (s && s.v === 2) return mend(s); }
  const old = localStorage.getItem(OLD_KEY);
  if (old) { const o = JSON.parse(old); if (o && o.v === 1) return mend(fromRound1(o)); }
  return null;
}
// remote: the server's save.json (null when there is none, or the server can't be reached)
export function load(remote = null) {
  let here = null, there = null;
  try { here = fromLocal(); } catch { /* storage blocked or a broken copy */ }
  try { if (remote && remote.v === 2 && remote.plan && remote.school) there = mend(JSON.parse(JSON.stringify(remote))); } catch { /* a broken file */ }
  G.S = here && (!there || here.at > there.at) ? here : there || fresh();
  G.lang = G.S.lang === 'en' ? 'en' : 'fr';
  if (G.S !== there) save(G.S.at); // the server's copy catches up with this browser's
  else try { localStorage.setItem(SAVE_KEY, JSON.stringify(G.S)); } catch { /* storage blocked */ }
}
export function save(at = Date.now()) {
  G.S.lang = G.lang; G.S.at = at;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(G.S)); } catch { /* storage blocked */ }
  putFile('save', G.S);
}
export function resetAll() { G.S = fresh(); save(); }
