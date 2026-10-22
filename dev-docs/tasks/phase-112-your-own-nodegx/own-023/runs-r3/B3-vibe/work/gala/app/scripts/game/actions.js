// What a press does to the save: the onclick handlers of reference/src/ui.js, as pure functions. Each takes the save
// and the screen state and returns { save, ui, toast } — only the parts that changed. The graph writes them back
// into the Global Stores; nothing here touches the page.
const { RULES, NUMBERS, MOVES, MAX_MOVES, OUTFITS, HAIRS, SHOES, ACCS, PIECES, LOGE, SNACKS, UPGRADES } = use('rules/data');
const { clamp, isOwned, fits, footprint, routineInfo, danceOf, stageOf } = use('rules/engine');
const { pickedNum } = use('view/common');
const { geometry } = use('view/formation');
const { foodPrice } = use('view/prep');
const { cleanName } = use('settings/check');

const copy = (o) => JSON.parse(JSON.stringify(o));
const MAX_BLOCKS = 8, MAX_CHAIN = 60;

// buying: a price in stars, kept for good
function buy(save, kind, id, w) {
  const price = kind === 'up' ? UPGRADES[id].price : kind === 'food' ? foodPrice(id) : (({ outfit: OUTFITS, hair: HAIRS, shoes: SHOES, acc: ACCS, piece: PIECES, snack: SNACKS })[kind][id].price || 0);
  const name = kind === 'up' ? w.nm(UPGRADES[id]) : kind === 'food' ? w(`foods_${id}`) : w.nm(({ outfit: OUTFITS, hair: HAIRS, shoes: SHOES, acc: ACCS, piece: PIECES, snack: SNACKS })[kind][id]);
  const sc = save.school;
  if (sc.stars < price) return { ok: false, toast: w('notEnough') };
  sc.stars -= price;
  if (kind === 'up') sc.upgrades[id] = id === 'sieges' ? (sc.upgrades[id] || 0) + 1 : true;
  else sc.owned[`${kind}:${id}`] = true;
  if (kind === 'up' && id === 'logeXL') sc.logeCols = LOGE.colsBig;
  if (kind === 'up' && id.startsWith('decor')) save.plan.backdrop = { decorForet: 'foret', decorMer: 'mer', decorVille: 'ville' }[id];
  return { ok: true, toast: w('bought', name) };
}

/* ---------------- the programme ---------------- */
function orderStep(save0, which, d) {
  const save = copy(save0), P = save.plan;
  if (which === 'start') P.start = clamp(P.start + d * 300, RULES.startMin, RULES.startMax);
  if (which === 'interval') P.interval = clamp(P.interval + d * 300, RULES.intervalMin, RULES.intervalMax);
  return { save };
}
function moveCard(save0, id, d) {
  const save = copy(save0), o = save.plan.order, i = o.indexOf(id), j = clamp(i + d, 1, o.length - 2);
  if (i < 1 || i === j) return {};
  o.splice(i, 1); o.splice(j, 0, id);
  return { save };
}

/* ---------------- the formation and the choreography ---------------- */
function formationAct(save0, ui0, act, arg, w) {
  const save = copy(save0), ui = copy(ui0), id = pickedNum(save, ui, 'G1'), N = NUMBERS[id], np = save.plan.numbers[id];
  ui.selBlock = ui.selBlock || {};
  const bid = np.blocks.some((b) => b.id === ui.selBlock[id]) ? ui.selBlock[id] : np.blocks[0].id, blk = np.blocks.find((b) => b.id === bid);
  const free = () => 'abcdefgh'.split('').find((c) => !np.blocks.some((b) => b.id === c));
  const moveIn = (list, k, d) => { const j = clamp(k + d, 0, list.length - 1); if (j !== k) { const [x] = list.splice(k, 1); list.splice(j, 0, x); } return j; };
  switch (act) {
    case 'pickNum': return { ui: { ...ui0, pickNum: arg, pickDancer: null, editB: false, selMove: null, selChain: null } };
    case 'ab': {
      if (arg === 'B' && !np.B) np.B = np.A.map((p) => ({ ...p }));
      return { save, ui: { ...ui0, editB: arg === 'B' } };
    }
    case 'block': return { ui: { ...ui, selBlock: { ...ui.selBlock, [id]: arg }, selMove: null } };
    case 'newBlock': case 'copyBlock': {
      if (np.blocks.length >= MAX_BLOCKS) return { toast: w('maxBlocks') };
      const f = free();
      np.blocks.push(act === 'newBlock' ? { id: f, name: f.toUpperCase(), moves: [] } : { id: f, name: `${blk.name} 2`.slice(0, 24), moves: [...blk.moves] });
      return { save, ui: { ...ui, selBlock: { ...ui.selBlock, [id]: f }, selMove: null } };
    }
    case 'renameBlock': {
      const name = cleanName(arg, 24);
      if (!name) return { toast: w('nameRefused') };
      blk.name = name; return { save };
    }
    case 'delBlock': {
      if (np.blocks.length < 2) return {};
      np.blocks = np.blocks.filter((b) => b !== blk); np.chain = np.chain.filter((x) => x !== bid);
      return { save, ui: { ...ui, selChain: null, selMove: null } };
    }
    case 'step': return { ui: { ...ui0, selMove: ui0.selMove === arg ? null : arg } };
    case 'stepTool': {
      const k = ui.selMove; if (k === null || k === undefined || !blk.moves[k]) return {};
      if (arg === 'x') { blk.moves.splice(k, 1); return { save, ui: { ...ui0, selMove: null } }; }
      return { save, ui: { ...ui0, selMove: moveIn(blk.moves, k, arg) } };
    }
    case 'addMove': {
      if (!MOVES[arg]) return {};
      if (blk.moves.length >= MAX_MOVES) return { toast: w('maxMoves') };
      blk.moves.push(arg);
      if (MOVES[arg].swap && !np.B) np.B = np.A.map((p) => ({ ...p }));
      return { save };
    }
    case 'chain': return { ui: { ...ui0, selChain: ui0.selChain === arg ? null : arg } };
    case 'chainTool': {
      const k = ui.selChain; if (k === null || k === undefined || k >= np.chain.length) return {};
      if (arg === 'x') { np.chain.splice(k, 1); return { save, ui: { ...ui0, selChain: null } }; }
      return { save, ui: { ...ui0, selChain: moveIn(np.chain, k, arg) } };
    }
    case 'addChain': {
      if (np.chain.length >= MAX_CHAIN) return { toast: w('maxChain') };
      np.chain.push(bid); return { save };
    }
    case 'filter': return { ui: { ...ui0, allMoves: arg === 'all' } };
    case 'pickDancer': return { ui: { ...ui0, pickDancer: arg } };
    case 'dropDancer': {
      // arg: { index, left, top } — the dot's new top-left corner on the plan, in pixels
      const g = geometry(stageOf(save.school)), info = routineInfo(danceOf(np).moves, N.style, false);
      const F = ui.editB && info.swaps && np.B ? np.B : np.A, size = 0.6 * g.k;
      const x = (arg.left + size / 2) / g.k - g.W - 0.9, z = g.D + 0.5 - (arg.top + size / 2) / g.k;
      if (!F[arg.index]) return {};
      F[arg.index] = { x: clamp(Math.round(x * 2) / 2, -g.W - 0.5, g.W + 0.5), z: clamp(Math.round(z * 2) / 2, 0, g.D) };
      return { save, ui: { ...ui0, pickDancer: arg.index } };
    }
    default: return {};
  }
}

/* ---------------- the goûter ---------------- */
function gouterStep(save0, which, d) {
  const save = copy(save0), P = save.plan;
  if (which === 'cake') P.cakeG = clamp(P.cakeG + d * 50, 0, 8000);
  if (which === 'bottles') P.bottles = clamp(P.bottles + d, 0, 20);
  if (which === 'crepes') P.crepes = clamp((P.crepes || 0) + d, 0, 60);
  if (which === 'compotes') P.compotes = clamp((P.compotes || 0) + d, 0, 60);
  return { save };
}
function snack(save0, id, w) {
  if (!SNACKS[id]) return {};
  const save = copy(save0);
  if (!isOwned(save.school, 'snack', id)) { const b = buy(save, 'snack', id, w); if (!b.ok) return { toast: b.toast }; save.plan.snack = id; return { save, toast: b.toast }; }
  save.plan.snack = id; return { save };
}

/* ---------------- the costumes ---------------- */
function costume(save0, ui, act, arg, w) {
  const save = copy(save0), id = pickedNum(save, ui), cos = save.plan.numbers[id].costume;
  if (act === 'pickNum') return { ui: { ...ui, pickNum: arg } };
  if (act === 'color') { cos.color = arg; return { save }; }
  let toast;
  if (act === 'item') {
    const [kind, k] = String(arg).split(':'), list = { outfit: OUTFITS, shoes: SHOES, acc: ACCS }[kind];
    if (!list || !list[k]) return {};
    if (!isOwned(save.school, kind, k)) { const b = buy(save, kind, k, w); if (!b.ok) return { toast: b.toast }; toast = b.toast; }
    cos[kind === 'outfit' ? 'outfit' : kind === 'shoes' ? 'shoes' : 'acc'] = k;
    return { save, toast };
  }
  if (act === 'hair') {
    const [cls, k] = String(arg).split(':');
    if (!HAIRS[k]) return {};
    if (!isOwned(save.school, 'hair', k)) { const b = buy(save, 'hair', k, w); if (!b.ok) return { toast: b.toast }; toast = b.toast; }
    save.plan.hair[cls] = k;
    return { save, toast };
  }
  return {};
}

/* ---------------- the dressing room ---------------- */
function build(save0, ui0, act, arg, w) {
  const save = copy(save0), ui = copy(ui0), sc = save.school, cols = sc.logeCols;
  const same = (a, b) => a && b && a.id === b.id && a.c === b.c && a.r === b.r && a.rot === b.rot;
  const selIndex = ui.selected ? sc.furniture.findIndex((f) => same(f, ui.selected)) : -1;
  switch (act) {
    case 'name': {
      const name = cleanName(arg, 40);
      if (name === null) return { toast: w('nameRefused') };
      sc.name = name; return { save };
    }
    case 'piece': {
      if (!PIECES[arg]) return {};
      let toast;
      if (!isOwned(sc, 'piece', arg)) { const b = buy(save, 'piece', arg, w); if (!b.ok) return { toast: b.toast }; toast = b.toast; }
      return { save, toast, ui: { ...ui0, armed: ui0.armed && ui0.armed.id === arg ? null : { id: arg, rot: 0 }, selected: null } };
    }
    case 'rotateArmed': return ui.armed ? { ui: { ...ui0, armed: { ...ui.armed, rot: (ui.armed.rot + 1) % 4 } } } : {};
    case 'cancelArmed': {
      if (ui.armed && ui.armed.was) sc.furniture.push(ui.armed.was);
      return { save, ui: { ...ui0, armed: null } };
    }
    case 'rotateSelected': {
      if (selIndex < 0) return {};
      const f = sc.furniture[selIndex], old = { c: f.c, r: f.r, rot: f.rot };
      f.rot = (f.rot + 1) % 4;
      if (!fits(f, sc.furniture, cols, f)) { const fp = footprint(f); f.c = clamp(f.c, 0, cols - fp.w); f.r = clamp(f.r, 0, LOGE.rows - fp.d); if (!fits(f, sc.furniture, cols, f)) Object.assign(f, old); }
      return { save, ui: { ...ui0, selected: { ...f } } };
    }
    case 'moveSelected': {
      if (selIndex < 0) return {};
      const [f] = sc.furniture.splice(selIndex, 1);
      return { save, ui: { ...ui0, armed: { id: f.id, rot: f.rot, was: f }, selected: null } };
    }
    case 'removeSelected': {
      if (selIndex < 0) return {};
      sc.furniture.splice(selIndex, 1);
      return { save, ui: { ...ui0, selected: null } };
    }
    case 'place': {
      // arg: { id, c, r, rot } — the 3D view says where the ghost stood when she tapped
      if (!ui.armed || !PIECES[arg.id] || !fits(arg, sc.furniture, cols)) return {};
      const f = { id: arg.id, c: arg.c, r: arg.r, rot: arg.rot };
      sc.furniture.push(f);
      return { save, ui: { ...ui0, selected: { ...f }, armed: ui.armed.was ? null : ui.armed } };
    }
    case 'select': return { ui: { ...ui0, selected: arg ? { ...arg } : null } };
    default: return {};
  }
}

/* ---------------- the car park and the shop ---------------- */
function parking(save0, act, arg, w) {
  const save = copy(save0), P = save.plan;
  if (act === 'width') P.parking.width = Number(arg);
  if (act === 'doors') P.parking.doors = Number(arg);
  if (act === 'up') { if (save.school.upgrades[arg] || !UPGRADES[arg]) return {}; const b = buy(save, 'up', arg, w); return b.ok ? { save, toast: b.toast } : { toast: b.toast }; }
  return { save };
}
function shop(save0, act, arg, w) {
  const save = copy(save0);
  if (act === 'backdrop') { save.plan.backdrop = arg; return { save }; }
  if (act === 'buy') {
    const [kind, id] = String(arg).split('|');
    const b = buy(save, kind, id, w);
    return b.ok ? { save, toast: b.toast } : { toast: b.toast };
  }
  return {};
}

/* ---------------- the end of a gala ---------------- */
function finishGala(save0, R) {
  const save = copy(save0);
  save.galaDone = true; save.school.stars += R.points; save.school.earned += R.points;
  save.notebook.unshift({ season: save.season, at: new Date().toISOString().slice(0, 10), points: R.points, satisfaction: R.parents.satisfaction, nums: Object.fromEntries(Object.values(R.perf).map((p) => [p.id, p.total])) });
  return { save };
}

Object.assign(exports, { buy, orderStep, moveCard, formationAct, gouterStep, snack, costume, build, parking, shop, finishGala });
