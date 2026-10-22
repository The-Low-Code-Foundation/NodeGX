// The rows of the preparation tabs (all but the formation, which has its own file): from reference/src/ui.js
// paintOrder, paintGouter, paintCostumes, paintBuild, paintParking, paintShop and paintNotebook.
const {
  CLS, NUMBERS, numDur, itemKind, STYLES, OUTFITS, HAIRS, SHOES, ACCS, PIECES, SNACKS, UPGRADES, BACKDROPS, PARKING, COLORS,
} = use('rules/data');
const { isOwned, analyseLoge } = use('rules/engine');
const { rules, forecast, clsColor, pickedNum, numChips, facts } = use('view/common');

/* ---------------- the programme ---------------- */
function order(save, ui, w) {
  const P = save.plan, s = save.season;
  const cards = P.order.map((id, k) => {
    const kind = itemKind(id), locked = k === 0 || k === P.order.length - 1;
    const dur = kind === 'interval' ? P.interval : kind === 'number' ? numDur(id) : null;
    const tags = kind === 'number' && s >= 3 ? `${STYLES[NUMBERS[id].style].icon}${NUMBERS[id].mood === 'calme' ? '🐢' : '⚡'}` : '';
    return { id, name: w.item(id), dot: clsColor(kind === 'number' ? NUMBERS[id].cls : null), tags, dur: dur ? w.dur(dur) : id === 'accueil' ? '4 min' : '3 min', locked };
  });
  const list = [0, 1, 2, 3, 4, ...(s >= 3 ? [5, 6] : [])].map((i) => w(`orderFacts_${i}`));
  return { facts: facts(list), start: w.clock(P.start), interval: w.dur(P.interval), cards };
}

/* ---------------- the goûter ---------------- */
function gouter(save, ui, w) {
  const P = save.plan, sc = save.school;
  const snacks = Object.entries(SNACKS).map(([id, s]) => {
    const own = isOwned(sc, 'snack', id);
    return { id, icon: s.icon, label: w.nm(s), small: own ? w(`snackFx_${id}`) : w('buy', s.price), pressed: P.snack === id, locked: !own };
  });
  const crepes = !!sc.owned['food:crepes'], compotes = !!sc.owned['food:compotes'];
  const table = rules(save).classes.map((c) => ({ id: c, cls: `${w.cls(c)} (${CLS[c].age})`, n: String(CLS[c].n), kcal: `${CLS[c].kcal} kcal`, juice: `${CLS[c].juice} cl` }));
  return {
    snacks, table, crepesOn: crepes, compotesOn: compotes,
    facts: facts([w('gouterFacts_0'), w('gouterFacts_1'), crepes && w('crepeFact'), compotes && w('compoteFact')]),
    cake: `${P.cakeG} g`, bottles: String(P.bottles), crepes: String(P.crepes || 0), compotes: String(P.compotes || 0),
  };
}

/* ---------------- the costumes ---------------- */
function costumes(save, ui, w) {
  const id = pickedNum(save, ui), N = NUMBERS[id], cos = save.plan.numbers[id].costume, sc = save.school, cls = CLS[N.cls];
  const opt = (kind, list, cur, extra) => Object.entries(list).filter(([, x]) => !x.season || x.season <= save.season).map(([k, x]) => {
    const own = isOwned(sc, kind, k), suits = (x.themes || []).includes(N.theme);
    return { id: `${kind}:${k}`, icon: x.icon || '', label: w.nm(x), small: (own ? (extra ? extra(x) : '') : w('buy', x.price)) + (suits ? ' ✨' : ''), pressed: cur === k, locked: !own };
  });
  const hair = rules(save).classes.map((c) => ({
    id: c, label: w.cls(c), dot: clsColor(c),
    chips: Object.entries(HAIRS).map(([k, x]) => {
      const own = isOwned(sc, 'hair', k);
      return { id: `${c}:${k}`, label: `${w.nm(x)} ${own ? `⏱ ${x.min} min` : w('buy', x.price)}`, pressed: save.plan.hair[c] === k, locked: !own };
    }),
  }));
  const shoe = SHOES[cos.shoes];
  return {
    num: id, numChips: numChips(save, ui, w, id),
    outfits: opt('outfit', OUTFITS, cos.outfit, (x) => w('putOn', x.min)),
    colors: COLORS.map((c) => ({ id: c, color: c, pressed: cos.color === c })),
    shoes: opt('shoes', SHOES, cos.shoes), shoeWarn: !!(shoe && shoe.expMin && cls.exp < shoe.expMin),
    accs: opt('acc', ACCS, cos.acc), hair,
  };
}

/* ---------------- the dressing room ---------------- */
function build(save, ui, w) {
  const sc = save.school, total = rules(save).classes.reduce((s, c) => s + CLS[c].n, 0), L = analyseLoge(sc, total);
  const lines = [L.postesRaw ? w('fx_postes', L.postesRaw) : w('fx_postesNone'), w('fx_rail', L.rail, L.railCap, total), w('fx_seats', L.seats, total)];
  if (L.calm) lines.push(w('fx_calm', L.calm));
  for (const k of ['water', 'fruit', 'fan', 'shoes', 'screen', 'sieste', 'doudous', 'barre', 'clock', 'music']) if (L[k]) lines.push(w(`fx_${k}`));
  if (L.clutter) lines.push(w('fx_clutter'));
  const tag = (p) => Object.entries(p.fx).map(([k, v]) => (w.has(`fxTag_${k}`) ? w(`fxTag_${k}`, v) : k)).join(' · ') + (p.wall ? ` · ${w('wallTag')}` : '');
  const pieces = Object.entries(PIECES).map(([id, p]) => {
    const own = isOwned(sc, 'piece', id);
    return { id, icon: p.icon, label: w.nm(p), small: own ? tag(p) : `${w('buy', p.price)} · ${tag(p)}`, pressed: !!(ui.armed && ui.armed.id === id), locked: !own };
  });
  const selected = ui.selected && PIECES[ui.selected.id] ? ui.selected : null;
  return {
    name: sc.name || '', fx: facts(lines), warnings: facts(L.invalid.map((f) => `⚠️ ${w('wallWarn', w.nm(PIECES[f.id]))}`)),
    inLoge: ui.pickedRoom === 'dr', armed: !!ui.armed, selected: !!selected,
    removeLabel: selected ? `${w('remove')} · ${w.nm(PIECES[selected.id])}` : w('remove'), pieces,
  };
}

/* ---------------- the car park ---------------- */
function parking(save, ui, w) {
  const P = save.plan, sc = save.school, pk = forecast(save).parking;
  const list = pk ? [w('parkFacts_0', pk.dancers, pk.families), w('parkFacts_1', pk.guests), w('parkFacts_2'), w('parkFacts_3', pk.rate), w('parkFacts_4'), w('parkFacts_5')] : [];
  return {
    facts: facts(list),
    widths: PARKING.widths.map((x) => ({ id: String(x), label: `${w.num(x)} m`, pressed: P.parking.width === x })),
    narrow: P.parking.width < 2.5,
    doors: PARKING.doorsOptions.map((m) => ({ id: String(m), label: w('doorsVal', m), pressed: P.parking.doors === m })),
    upgrades: ['placeur', 'covoit', 'navette', 'rangee'].map((k) => { const u = UPGRADES[k], own = !!sc.upgrades[k]; return { id: k, icon: u.icon, label: w.nm(u), small: own ? w('owned') : w('buy', u.price), pressed: own, locked: !own }; }),
  };
}

/* ---------------- the shop ---------------- */
const PARK_UPS = ['placeur', 'covoit', 'navette', 'rangee'];
const foodPrice = (id) => 15 + (id === 'crepes' ? 5 : 0);
function shop(save, ui, w) {
  const sc = save.school, cats = ['hall', ...(rules(save).parking ? ['park'] : []), 'loge', 'outfit', 'hair', 'shoes', 'acc', 'food'];
  const cat = cats.includes(ui.shopCat) ? ui.shopCat : 'hall';
  const rows = [];
  const row = (kind, id, icon, name, price, own, note) => rows.push({ id: `${kind}|${id}`, icon: icon || '✨', name, note: note || '', own: own ? (own === 'max' ? w('maxed') : w('owned')) : '', price: own ? '' : w('buy', price), poor: sc.stars < price });
  const fxTags = (p) => Object.entries(p.fx).map(([k, v]) => (w.has(`fxTag_${k}`) ? w(`fxTag_${k}`, v) : k)).join(' · ');
  if (cat === 'hall' || cat === 'park') {
    for (const [k, u] of Object.entries(UPGRADES)) {
      if ((cat === 'park') !== PARK_UPS.includes(k) || (u.season && u.season > save.season)) continue;
      const n = sc.upgrades[k], own = u.max ? (n >= u.max ? 'max' : false) : !!n;
      row('up', k, u.icon, w.nm(u) + (u.max && n ? ` (${n}/${u.max})` : ''), u.price, own);
    }
  }
  if (cat === 'loge') for (const [k, p] of Object.entries(PIECES)) if (p.price) row('piece', k, p.icon, w.nm(p), p.price, isOwned(sc, 'piece', k), fxTags(p));
  if (cat === 'outfit') for (const [k, o] of Object.entries(OUTFITS)) if (o.price) row('outfit', k, o.icon, w.nm(o), o.price, isOwned(sc, 'outfit', k), w('putOn', o.min));
  if (cat === 'hair') for (const [k, o] of Object.entries(HAIRS)) if (o.price) row('hair', k, '💇', w.nm(o), o.price, isOwned(sc, 'hair', k), `⏱ ${o.min} min`);
  if (cat === 'shoes') for (const [k, o] of Object.entries(SHOES)) if (o.price && (!o.season || o.season <= save.season)) row('shoes', k, '🩰', w.nm(o), o.price, isOwned(sc, 'shoes', k));
  if (cat === 'acc') for (const [k, o] of Object.entries(ACCS)) if (o.price) row('acc', k, '🎀', w.nm(o), o.price, isOwned(sc, 'acc', k));
  if (cat === 'food') {
    for (const [k, s] of Object.entries(SNACKS)) if (s.price) row('snack', k, s.icon, w.nm(s), s.price, isOwned(sc, 'snack', k));
    for (const k of ['crepes', 'compotes']) row('food', k, k === 'crepes' ? '🥞' : '🍏', w(`foods_${k}`), foodPrice(k), !!sc.owned[`food:${k}`]);
  }
  const backdrops = Object.entries(BACKDROPS).filter(([, b]) => !b.need || sc.upgrades[b.need]).map(([k, b]) => ({ id: k, label: b.icon, pressed: save.plan.backdrop === k }));
  return {
    title: `${w('shopH')} · ${w('stars', sc.stars)}`,
    cats: cats.map((c) => ({ id: c, label: w(`cats_${c}`), pressed: c === cat })),
    rows, showBackdrops: cat === 'hall', backdrops,
  };
}

/* ---------------- the notebook ---------------- */
function notebook(save, ui, w) {
  const entries = (save.notebook || []).map((n, i) => ({
    id: `n${i}`, title: `${w('noteGala', n.season)} · ${n.at} · ${n.points} ⭐`, line: w('satisfaction', n.satisfaction),
    nums: Object.entries(n.nums || {}).filter(([id]) => NUMBERS[id]).map(([id, p]) => `${w.numName(id)} ${p} ⭐`).join(' · '),
  }));
  return { entries, empty: entries.length === 0 };
}

Object.assign(exports, { order, gouter, costumes, build, parking, shop, notebook, foodPrice });
