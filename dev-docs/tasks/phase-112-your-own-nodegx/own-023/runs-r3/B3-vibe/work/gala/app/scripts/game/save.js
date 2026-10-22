// The save's shape and its repairs, from reference/src/state.js. Where it is kept is the graph's business: the
// persisted Global Store "gala" holds it under the key "save".
const { defaultPlan, defaultSchool, addSeasonNumbers, numberPlan, migrateNumber, DEFAULT_HAIR } = use('rules/plan');
const { NUMBERS } = use('rules/data');

const newSeed = () => (Math.random() * 1e9) >>> 0;

function fresh(lang) {
  return { v: 2, lang: lang || 'fr', season: 1, galaDone: false, seenIntro: 0, plan: defaultPlan(), school: defaultSchool(), notebook: [], sound: true, seed: newSeed() };
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
  } catch (e) { /* a broken old save starts fresh */ }
  return s;
}

// fill in anything a newer version added, so an older save keeps working; anything unreadable starts fresh
function mend(input) {
  if (!input || input.v !== 2 || !input.plan || !input.school) return fresh(input && input.lang);
  const s = JSON.parse(JSON.stringify(input)), f = fresh(s.lang);
  for (const k of Object.keys(f)) if (s[k] === undefined) s[k] = f[k];
  for (const k of Object.keys(f.plan)) if (s.plan[k] === undefined) s.plan[k] = f.plan[k];
  for (const k of Object.keys(f.school)) if (s.school[k] === undefined) s.school[k] = f.school[k];
  addSeasonNumbers(s.plan, s.season);
  for (const id of Object.keys(s.plan.numbers)) {
    if (!NUMBERS[id]) { delete s.plan.numbers[id]; continue; }
    const np = s.plan.numbers[id];
    s.plan.numbers[id] = np.blocks || np.moves ? migrateNumber(np) : numberPlan(id);
  }
  s.plan.order = s.plan.order.filter((id) => NUMBERS[id] || ['accueil', 'entracte', 'final'].includes(id));
  for (const c of Object.keys(DEFAULT_HAIR)) if (!s.plan.hair[c] && c in s.plan.hair) s.plan.hair[c] = DEFAULT_HAIR[c];
  return s;
}

// the next season: new classes join, the dice change
function nextSeason(save) {
  const s = JSON.parse(JSON.stringify(save));
  s.season++; s.galaDone = false; s.seed = newSeed();
  addSeasonNumbers(s.plan, s.season);
  return s;
}

Object.assign(exports, { fresh, fromRound1, mend, nextSeason, newSeed });
