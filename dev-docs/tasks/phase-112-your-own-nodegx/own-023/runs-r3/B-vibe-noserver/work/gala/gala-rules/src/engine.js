// The gala day as a pure function of the plan and the school: simulate() returns every verdict, every dancer's schedule,
// the points and a trace of { t, who, step, verdict, say }. No DOM, no three.js, no words: the sheet turns `say` into
// sentences. This is the engine the port would package; tests/engine.test.mjs runs it in Node.
import {
  RULES, CLS, NUMBERS, numDur, OTHER_ITEMS, itemKind, STYLES, MOVES, OUTFITS, HAIRS, SHOES, ACCS, PIECES, LOGE,
  doorTiles, SNACKS, BACKDROP_THEMES, PARKING, seasonRules, hm,
} from './data.js';

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const rngFor = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let x = a; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; };
export const dancerId = (c, i) => `${c}-${i}`;
const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);

/* ---------------- what she owns ---------------- */
// kind: 'outfit' | 'hair' | 'shoes' | 'acc' | 'piece' | 'snack' | 'up' (hall and car park) | 'food'
const CATALOG = { outfit: OUTFITS, hair: HAIRS, shoes: SHOES, acc: ACCS, piece: PIECES, snack: SNACKS };
export function isOwned(school, kind, id) {
  if (kind === 'up') return !!school.upgrades[id];
  const item = CATALOG[kind] ? CATALOG[kind][id] : null;
  if (kind === 'food') return !!school.owned[`food:${id}`];
  return !!item && (!item.price || !!school.owned[`${kind}:${id}`]);
}
export const stageOf = (school) => (school.upgrades.scene ? RULES.stageBig : RULES.stage);
export const seatsOf = (school) => 112 + 14 * (school.upgrades.sieges || 0);

/* ---------------- the dressing room ---------------- */
export function footprint(f) { const p = PIECES[f.id]; return f.rot % 2 ? { w: p.d, d: p.w } : { w: p.w, d: p.d }; }
// a piece that hangs on a wall must have its back against one: turning it changes which side is its back
export function againstWall(f, cols) {
  const fp = footprint(f);
  switch (((f.rot % 4) + 4) % 4) {
    case 0: return f.r === 0;
    case 1: return f.c + fp.w === cols;
    case 2: return f.r + fp.d === LOGE.rows;
    default: return f.c === 0;
  }
}
export function fits(f, list, cols, ignore) {
  const fp = footprint(f);
  if (f.c < 0 || f.r < 0 || f.c + fp.w > cols || f.r + fp.d > LOGE.rows) return false;
  if (PIECES[f.id].flat) return true;
  for (const [c, r] of doorTiles(cols)) if (c >= f.c && c < f.c + fp.w && r >= f.r && r < f.r + fp.d) return false;
  for (const o of list) {
    if (o === ignore || PIECES[o.id].flat) continue;
    const q = footprint(o);
    if (f.c < o.c + q.w && o.c < f.c + fp.w && f.r < o.r + q.d && o.r < f.r + fp.d) return false;
  }
  return true;
}
export function analyseLoge(school, totalDancers) {
  const cols = school.logeCols, fx = { postes: 0, rail: 0, seats: 0, calm: 0, water: 0, fruit: 0, fan: 0, shoes: 0, screen: 0, sieste: 0, doudous: 0, barre: 0, clock: 0, music: 0 };
  const invalid = []; let covered = 0;
  for (const f of school.furniture) {
    const p = PIECES[f.id]; if (!p) continue;
    const fp = footprint(f); if (!p.flat) covered += fp.w * fp.d;
    if (p.wall && !againstWall(f, cols)) { invalid.push(f); continue; }
    for (const k of Object.keys(p.fx)) fx[k] += p.fx[k];
  }
  const tiles = cols * LOGE.rows;
  return {
    ...fx, postesRaw: fx.postes, postes: Math.max(1, fx.postes), calmRaw: fx.calm, calm: Math.min(30, fx.calm),
    railCap: fx.rail * RULES.railCap, covered, tiles, clutter: covered / tiles > 0.5, invalid, totalDancers,
    seatRatio: Math.min(1, fx.seats / Math.max(1, totalDancers)),
  };
}
// minutes for a class to change from one number's costume to the next
export function changeTime(prev, next, loge) {
  const lines = [['outfit', OUTFITS[next.outfit].min, next.outfit]];
  if (prev.shoes !== next.shoes) lines.push(['shoes', loge.shoes ? 1 : 2]);
  if (prev.acc !== next.acc && next.acc !== 'aucun') lines.push(['acc', 1]);
  if (loge.railCap < loge.totalDancers) lines.push(['rails', 3]);
  if (loge.screen) lines.push(['screen', -1]);
  if (loge.clutter) lines.push(['clutter', 2]);
  const sum = lines.reduce((s, l) => s + l[1], 0);
  return { min: Math.max(2, sum), sum, lines };
}

/* ---------------- a dance: the phrase, the spacing, the music ---------------- */
// a dance: named blocks of steps, and the chain that says in which order the class dances them (a block can come back as
// often as she likes, like a component placed many times). The engine reads the chain flat: one long run of steps, danced once.
export function danceOf(np) {
  const byId = Object.fromEntries(np.blocks.map((b) => [b.id, b])), moves = [], marks = [], times = {};
  np.chain.forEach((bid, j) => { const b = byId[bid]; if (!b) return; marks.push({ j, block: bid, k0: moves.length, k1: moves.length + b.moves.length }); moves.push(...b.moves); times[bid] = (times[bid] || 0) + 1; });
  return { A: np.A, B: np.B, costume: np.costume, moves, repeats: 1, marks, chainLen: marks.length, mostRepeated: Math.max(0, ...Object.values(times)), blocksUsed: Object.keys(times).length };
}
// cyclic: the last step leads back into the first (true for a block shown on its own, which may repeat; false for a whole dance)
export function routineInfo(moves, style, cyclic = true) {
  const M = moves.map((id) => MOVES[id]);
  const phrase = M.reduce((s, m) => s + m.c, 0);
  const links = (cyclic ? M : M.slice(0, -1)).map((m, k) => {
    const n = M[(k + 1) % M.length], gap = Math.abs(m.b - n.a), off = n.st !== '*' && !n.st.split(' ').includes(style);
    let score = gap === 0 ? 1 : gap === 1 ? 0.6 : 0; if (off) score *= 0.5;
    return { k, from: moves[k], to: moves[(k + 1) % M.length], gap, off, score };
  });
  let dx = 0, dz = 0; const offsets = M.map((m) => { dx += m.dx || 0; dz += m.dz || 0; return { dx, dz }; });
  const hardPairs = M.length > 1 ? links.filter((l) => MOVES[l.from].d >= 2 && MOVES[l.to].d >= 2).length : 0;
  return {
    phrase, links, avgHarmony: links.length ? mean(links.map((l) => l.score)) : 1, avgDiff: phrase ? M.reduce((s, m) => s + m.d * m.c, 0) / phrase : 0,
    offsets, net: { dx, dz }, swaps: M.filter((m) => m.swap).length, distinct: new Set(moves.filter((id) => !MOVES[id].swap)).size,
    hardPairs, starts: M.reduce((a, m, k) => (a.push(k ? a[k - 1] + M[k - 1].c : 0), a), []),
  };
}
// where every dancer is after each move of each repetition; the spacing judged there
export function judgeSpacing(np, cls, stage, info) {
  const n = cls.n, A = np.A, B = info.swaps ? (np.B || np.A) : null, span = cls.span, out = { collide: [], hidden: [], offstage: [], bump: [], moved: 0 };
  const statics = B ? [['A', A], ['B', B]] : [['A', A]];
  for (const [tag, P] of statics) for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const d = Math.hypot(P[i].x - P[j].x, P[i].z - P[j].z);
    if (d < span - 1e-9) out.collide.push({ i, j, d, tag });
    else if (Math.abs(P[i].x - P[j].x) < RULES.hideDx - 1e-9) out.hidden.push(P[i].z > P[j].z ? { b: i, f: j, tag, dx: Math.abs(P[i].x - P[j].x) } : { b: j, f: i, tag, dx: Math.abs(P[i].x - P[j].x) });
  }
  if (B) out.moved = Math.max(...A.map((p, i) => Math.hypot(p.x - B[i].x, p.z - B[i].z)));
  const off = (p) => p.x > stage.halfW + 1e-9 || p.x < -stage.halfW - 1e-9 || p.z < -1e-9 || p.z > stage.depth + 1e-9;
  const seenOff = new Set(), seenBump = new Set(), R = np.repeats, mv = np.moves;
  let F = A, ox = 0, oz = 0;
  const check = (P, r, k) => P.forEach((p, i) => { if (!seenOff.has(i) && off({ x: p.x + ox, z: p.z + oz })) { seenOff.add(i); out.offstage.push({ i, r, k, x: p.x + ox, z: p.z + oz, x0: p.x, z0: p.z }); } });
  check(F, 0, -1);
  for (let r = 0; r < R && r < 60; r++) for (let k = 0; k < mv.length; k++) {
    const m = MOVES[mv[k]];
    if (m.swap && B) {
      const G = F === A ? B : A;
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
        if (seenBump.has(`${i}|${j}`)) continue;
        for (let s = 1; s < 8; s++) {
          const u = s / 8, xi = F[i].x + (G[i].x - F[i].x) * u, zi = F[i].z + (G[i].z - F[i].z) * u, xj = F[j].x + (G[j].x - F[j].x) * u, zj = F[j].z + (G[j].z - F[j].z) * u;
          if (Math.hypot(xi - xj, zi - zj) < RULES.bump) { seenBump.add(`${i}|${j}`); out.bump.push({ i, j, r, k }); break; }
        }
      }
      F = G;
    }
    ox += m.dx || 0; oz += m.dz || 0; check(F, r, k);
  }
  out.ok = !out.collide.length && !out.hidden.length && !out.offstage.length && !out.bump.length;
  return out;
}
export function judgeMusic(id, d, info) {
  const N = NUMBERS[id], have = info.phrase, diff = have - N.counts, endOf = (mk) => (mk.k1 > mk.k0 ? info.starts[mk.k1 - 1] + MOVES[d.moves[mk.k1 - 1]].c : info.starts[mk.k0] || 0);
  const parts = d.marks.map((mk) => endOf(mk) - (mk.k1 > mk.k0 ? info.starts[mk.k0] : endOf(mk)));
  const over = diff > 0 ? d.marks.find((mk) => endOf(mk) > N.counts) : null;
  return { counts: N.counts, bpm: N.bpm, dur: numDur(id), phrase: info.phrase, parts, have, diff, ok: diff === 0 && info.phrase > 0, stopsIn: over ? over.j + 1 : 0, playsOn: diff < 0 ? (-diff * 60) / N.bpm : 0 };
}

/* ---------------- how the dancers feel at a moment of the evening ---------------- */
// energy (tiredness), hunger, nerves (stage fright) and focus (brain fog), each 0..100
export function classState(clsId, T, ctx) {
  const c = CLS[clsId], { plan, loge } = ctx, snack = SNACKS[plan.snack] || SNACKS.rien, minutes = Math.max(0, (T - RULES.arrive) / 60);
  const lines = {};
  const seatF = 1 - 0.35 * loge.seatRatio, fanF = loge.fan ? 0.85 : 1;
  let energy = 100 - c.drain * minutes * seatF * fanF; lines.awake = -c.drain * minutes * seatF * fanF;
  if (T >= RULES.snackAt) { energy += snack.boost; lines.snack = snack.boost; }
  if (snack.crash && T >= RULES.snackAt + 3600) { energy -= snack.crash; lines.crash = -snack.crash; }
  if (clsId === 'petits' && T > hm(20, 30)) { const k = ((T - hm(20, 30)) / 60) * 0.8 * (loge.sieste ? 0.4 : 1); energy -= k; lines.bedtime = -k; }
  if (loge.music) { energy += 4; lines.music = 4; }
  energy -= ctx.cost || 0; if (ctx.cost) lines.danced = -ctx.cost;
  let hunger = 0.45 * minutes - (T >= RULES.snackAt ? snack.relief : 0) - (loge.fruit ? 10 : 0);
  let nerves = c.nerves + (ctx.wingsMin || 0) * 2 - loge.calm - (loge.doudous && clsId === 'petits' ? 12 : 0) - (ctx.k > 0 ? 10 : 0) + (ctx.gala ? 10 : 0);
  energy = clamp(energy, 5, 100); hunger = clamp(hunger, 0, 100); nerves = clamp(nerves, 0, 100);
  const thirst = loge.water ? 0 : Math.max(0, (T - hm(19, 30)) / 60) * 0.25;
  const focus = clamp(100 - hunger * 0.6 - thirst - Math.max(0, 50 - energy) * 0.5, 5, 100);
  return { energy: Math.round(energy), hunger: Math.round(hunger), nerves: Math.round(nerves), focus: Math.round(focus), thirst: Math.round(thirst), lines };
}
// a step's chance to go wrong, by how far it is above the class's level (round 2½: a fouetté for six-year-olds fails often)
const GAP_P = { '-2': 0.0001, '-1': 0.0003, 0: 0.001, 1: 0.015, 2: 0.08 };
// the chance that each dancer slips on each move, and forgets her steps on each repetition
export function execution(cls, info, d, state) {
  const exp = cls.exp, fat = 1 + (100 - state.energy) / 60, nerv = 1 + state.nerves / 120;
  const sh = SHOES[d.costume.shoes], shoe = sh && sh.expMin && exp < sh.expMin ? 2.5 : 1, mv = d.moves;
  const per = mv.map((id, k) => {
    const m = MOVES[id], gap = clamp(m.d - exp, -2, 2), prev = k > 0 ? MOVES[mv[k - 1]] : null, streak = !!prev && m.d >= 2 && prev.d >= 2;
    return { id, k, gap, streak, p: GAP_P[gap] * fat * nerv * shoe * (streak ? 1.5 : 1) };
  });
  const bored = Math.max(0, exp - 0.8 - info.avgDiff), long = Math.max(0, d.mostRepeated - 12);
  const forget = (100 - state.focus) / 30000 + bored * 0.006 + long * 0.0004 * exp;
  const expected = cls.n * (per.reduce((s, x) => s + x.p, 0) + d.chainLen * forget);
  return { per, forget, bored, long, expected, fat, nerv, shoe };
}
const TARGET_DIFF = { 1: 1.2, 2: 1.8, 3: 2.4 };
function wowOf(id, np, cls, info, spacing, plan, school, dance) {
  const N = NUMBERS[id], c = np.costume, src = [];
  if (info.distinct >= 5) src.push('variety');
  if (dance.blocksUsed >= 3) src.push('structure');
  if (Math.abs(info.avgDiff - TARGET_DIFF[cls.exp]) <= 0.4) src.push('level');
  if ((OUTFITS[c.outfit].themes || []).includes(N.theme)) src.push('costume');
  if ((ACCS[c.acc].themes || []).includes(N.theme)) src.push('acc');
  if (info.swaps && spacing.moved >= 1) src.push('formation');
  if ((BACKDROP_THEMES[plan.backdrop] || []).includes(N.theme)) src.push('backdrop');
  if (school.upgrades.projecteurs) src.push('lights');
  if (school.upgrades.boule && ['jazz', 'hiphop'].includes(N.style)) src.push('disco');
  return { src, pts: Math.min(5, src.length) };
}

/* ---------------- the evening's running order ---------------- */
export function programme(plan, school, rules, loge) {
  const active = new Set(rules.classes);
  const hairTotal = rules.classes.reduce((s, c) => s + CLS[c].n * HAIRS[plan.hair[c] || 'queue'].min, 0);
  const hairMin = Math.ceil(hairTotal / loge.postes), ready = RULES.hairStart + hairMin * 60;
  const start = Math.max(plan.start, ready), startLate = start - plan.start;
  let tt = start, prevDance = false, prevKind = null, floor = null, calmRun = 0;
  const items = [], lastEnd = {}, lastNum = {}, yawns = [], swaps = [];
  for (const id of plan.order) {
    const kind = itemKind(id);
    if (kind === 'number' && !active.has(NUMBERS[id].cls)) continue;
    const isDance = kind === 'number' || kind === 'finale', co = isDance && prevDance ? RULES.setChange : 0;
    let fl = 0;
    if (rules.floors && kind === 'number') {
      const need = STYLES[NUMBERS[id].style].floor;
      if (floor && need !== floor) { fl = prevKind === 'interval' ? 0 : RULES.floorSwap; swaps.push({ id, to: need, free: fl === 0 }); }
      floor = need;
    }
    tt += co + fl;
    let s = tt, wait = 0, change = null;
    if (kind === 'number') {
      const cls = NUMBERS[id].cls;
      if (lastEnd[cls] !== undefined) {
        change = changeTime(plan.numbers[lastNum[cls]].costume, plan.numbers[id].costume, loge);
        const readyC = lastEnd[cls] + change.min * 60; if (readyC > s) { wait = readyC - s; s += wait; }
      }
      if (rules.moods) { if (NUMBERS[id].mood === 'calme') { calmRun++; if (calmRun >= 2) yawns.push({ id, run: calmRun }); } else calmRun = 0; }
    } else if (kind !== 'finale') calmRun = 0;
    const dur = kind === 'interval' ? plan.interval : kind === 'number' ? numDur(id) : OTHER_ITEMS[id].dur;
    items.push({ id, kind, start: s, end: s + dur, dur, co, fl, wait, change, floor: kind === 'number' ? floor : null });
    tt = s + dur; prevDance = isDance; prevKind = kind;
    if (kind === 'number') { lastEnd[NUMBERS[id].cls] = tt; lastNum[NUMBERS[id].cls] = id; }
  }
  const end = items[items.length - 1].end, late = Math.max(0, end - RULES.hallCloses);
  const sleepy = lastEnd.petits !== undefined ? Math.max(0, lastEnd.petits - RULES.bedtime) : 0;
  const waits = items.filter((i) => i.wait > 0);
  return { items, lastEnd, lastNum, end, late, sleepy, waits, yawns, swaps, hairTotal, hairMin, ready, start, startLate, ok: !late && !sleepy && !waits.length && !startLate && !yawns.length };
}

/* ---------------- the goûter: classes reach the table in the order they leave the stage ---------------- */
function judgeGouter(plan, rules, order) {
  const finalEnd = order.items.find((i) => i.id === 'final').end;
  const leave = (c) => (c === 'petits' ? order.lastEnd.petits + 120 : finalEnd + 120);
  const sequence = [...rules.classes].sort((a, b) => leave(a) - leave(b) || order.lastEnd[a] - order.lastEnd[b]);
  const offer = { cake: plan.cakeG * (RULES.cakeKcal / 100), crepes: (plan.crepes || 0) * RULES.crepeKcal, compotes: (plan.compotes || 0) * RULES.compoteKcal };
  const kcal0 = offer.cake + offer.crepes + offer.compotes, cl0 = plan.bottles * RULES.bottleCl;
  let kcal = kcal0, cl = cl0, cakeOut = null, juiceOut = null; const eaters = [];
  for (const c of sequence) for (let i = 0; i < CLS[c].n; i++) {
    const k = CLS[c].kcal, j = CLS[c].juice, gotK = kcal + 1e-9 >= k, gotJ = cl + 1e-9 >= j;
    if (gotK) kcal -= k; else { if (!cakeOut) cakeOut = c; kcal = 0; }
    if (gotJ) cl -= j; else { if (!juiceOut) juiceOut = c; cl = 0; }
    eaters.push({ id: dancerId(c, i), cls: c, cake: gotK, juice: gotJ });
  }
  const needKcal = rules.classes.reduce((s, c) => s + CLS[c].n * CLS[c].kcal, 0), needCl = rules.classes.reduce((s, c) => s + CLS[c].n * CLS[c].juice, 0);
  const variety = (plan.crepes > 0 ? 1 : 0) + (plan.compotes > 0 ? 1 : 0);
  return { sequence, leave: Object.fromEntries(sequence.map((c) => [c, leave(c)])), eaters, cakeOut, juiceOut, offer, kcal0, cl0, needKcal, needCl, leftKcal: kcal0 - needKcal, leftCl: cl0 - needCl, variety, ok: !cakeOut && !juiceOut };
}

/* ---------------- the car park (season 2 on) ---------------- */
export function judgeParking(plan, school, rules, start) {
  const P = PARKING, dancers = rules.classes.reduce((s, c) => s + CLS[c].n, 0);
  const families = Math.round(dancers * P.perFamily), guests = P.guestsPerSeason * rules.season;
  const famCars = school.upgrades.covoit ? Math.round(families * (1 - P.carpool)) : families, cars = famCars + guests;
  const width = plan.parking.width, perRow = Math.floor(P.lotLength / width), rows = school.upgrades.rangee ? 2 : 1, bays = perRow * rows;
  const W = plan.parking.doors * 60, rate = school.upgrades.placeur ? P.gateRatePlaceur : P.gateRate, gap = 60 / rate;
  const walk = school.upgrades.navette ? P.shuttleWalk : P.overflowWalk, list = [];
  let prev = -Infinity;
  for (let k = 0; k < cars; k++) {
    const arr = start - W + ((k + 0.5) * (W * 2 / 3)) / cars, through = Math.max(arr, prev + gap); prev = through;
    const bay = k < bays ? k : null, seated = bay !== null ? through + (P.parkMin[width] + P.walkFromBay) * 60 : through + (P.overflowDrive + walk) * 60;
    list.push({ k, arr, through, bay, seated, late: seated > start + 1e-6 });
  }
  const lateCars = list.filter((c) => c.late).length, queue = Math.max(0, ...list.map((c) => c.through - c.arr));
  return {
    dancers, families, famCars, guests, cars, width, perRow, rows, bays, doors: plan.parking.doors, rate, walk, list, lateCars,
    lateParents: Math.round(lateCars * P.perCar), overflow: Math.max(0, cars - bays), queue, narrow: width < 2.5, ok: lateCars === 0,
  };
}

/* ---------------- the whole day ---------------- */
// input: { plan, school, season, mode: 'rehearsal' | 'try' | 'gala', seed }
// the dice roll on gala night and in a try-out (each try its own seed); the general rehearsal only times the evening
export function simulate({ plan, school, season = 1, mode = 'rehearsal', seed = 1 }) {
  const rules = seasonRules(season), stage = stageOf(school), gala = mode === 'gala', rolls = gala || mode === 'try';
  const totalDancers = rules.classes.reduce((s, c) => s + CLS[c].n, 0);
  const loge = analyseLoge(school, totalDancers), order = programme(plan, school, rules, loge);
  const rng = rngFor(seed), trace = [], seg = {};
  const push = (t, who, step, verdict, say) => trace.push({ t, who, step, verdict, say });
  const nums = order.items.filter((i) => i.kind === 'number'), finale = order.items.find((i) => i.id === 'final');

  // every number: the spacing, the music, the harmony, how the dancers feel, what goes wrong
  const perf = {}, costSoFar = {}, kOf = {};
  for (const it of nums) {
    const id = it.id, N = NUMBERS[id], cls = CLS[N.cls], np = plan.numbers[id], dance = danceOf(np), info = routineInfo(dance.moves, N.style, false);
    const spacing = judgeSpacing(dance, cls, stage, info), music = judgeMusic(id, dance, info);
    const wingsMin = ((loge.clock ? 60 : RULES.wingsBefore) + it.wait) / 60, k = kOf[N.cls] || 0;
    const state = classState(N.cls, it.start, { plan, loge, cost: costSoFar[N.cls] || 0, wingsMin, k, gala });
    const ex = execution(cls, info, dance, state);
    // the slips: in the rehearsal nothing goes wrong but the spacing; in a try-out and on the gala night the dice roll.
    // A fall on a step above the class's level can twist an ankle: she sits out the rest of the dance.
    const slips = [];
    if (rolls) {
      for (let i = 0; i < cls.n; i++) {
        let out = false;
        for (const mk of dance.marks) {
          if (out || info.starts[mk.k0] >= N.counts) break;
          for (let k = mk.k0; k < mk.k1 && !out; k++) {
            if (info.starts[k] >= N.counts) break;
            if (rng() < ex.per[k].p) { const ankle = ex.per[k].gap >= 1 && rng() < RULES.ankle; slips.push({ i, r: 0, k, kind: ankle ? 'ankle' : 'trip' }); out = ankle; }
          }
          if (!out && mk.k1 > mk.k0 && rng() < ex.forget) slips.push({ i, r: 0, k: mk.k0 + Math.floor(rng() * (mk.k1 - mk.k0)), kind: 'forget' });
        }
      }
      slips.sort((a, b) => a.k - b.k);
    }
    const wow = wowOf(id, np, cls, info, spacing, plan, school, dance);
    const slipsN = rolls ? slips.length + slips.filter((s) => s.kind === 'ankle').length : ex.expected;
    const pts = {
      placement: spacing.ok ? 3 : !spacing.collide.length && !spacing.offstage.length && !spacing.bump.length ? 1 : 0,
      music: music.ok ? 2 : 0, harmony: Math.round(info.avgHarmony * 3), execution: Math.max(0, 4 - Math.round(slipsN)), wow: wow.pts,
    };
    const total = Object.values(pts).reduce((s, x) => s + x, 0);
    perf[id] = { id, cls: N.cls, dance, info, spacing, music, state, ex, slips, wow, pts, total, max: 17, risk: ex.expected < 0.5 ? 'low' : ex.expected < 1.5 ? 'mid' : 'high' };
    costSoFar[N.cls] = (costSoFar[N.cls] || 0) + 0.012 * dance.moves.reduce((s, mid) => s + MOVES[mid].d * MOVES[mid].c, 0) * (info.avgDiff > cls.exp + 0.3 ? 1.5 : 1);
    kOf[N.cls] = k + 1;
  }
  const gouter = judgeGouter(plan, rules, order);
  const parking = rules.parking ? judgeParking(plan, school, rules, order.start) : null;

  // the parents: how many came, where they sat, how they felt
  const audience = Math.round(totalDancers * 2.5) + 8 * (season - 1), seats = seatsOf(school), standing = Math.max(0, audience - seats);
  const sat = [['base', 60]];
  if (standing) sat.push(['standing', -Math.min(20, standing)]);
  if (school.upgrades.confort) sat.push(['comfy', 10]);
  if (school.upgrades.buvette) sat.push(plan.interval >= 900 ? ['buvette', 10] : ['buvetteShort', 4]);
  if (order.late) sat.push(['late', -15]);
  if (order.startLate) sat.push(['startLate', -5]);
  if (order.yawns.length) sat.push(['yawns', -5 * order.yawns.length]);
  if (parking) {
    if (parking.lateParents) sat.push(['lateParents', -Math.min(20, parking.lateParents)]);
    if (parking.narrow) sat.push(['narrow', -5]);
    if (parking.doors >= 45 && !school.upgrades.buvette) sat.push(['longWait', parking.doors >= 60 ? -10 : -5]);
  }
  const showQ = nums.length ? mean(nums.map((it) => perf[it.id].total / 17)) : 0;
  sat.push(['show', Math.round(showQ * 20)]);
  if (school.upgrades.projecteurs) sat.push(['lights', 5]);
  const satisfaction = clamp(sat.reduce((s, l) => s + l[1], 0), 0, 100);

  // the points: what the evening earns (a rehearsal shows what it would have earned)
  const pts = [];
  for (const it of nums) pts.push([`num:${it.id}`, perf[it.id].total]);
  pts.push(['onTime', order.late ? 0 : 10], ['bedtime', order.sleepy ? 0 : 5], ['noWait', order.waits.length ? 0 : 5], ['startOk', order.startLate ? 0 : 5]);
  if (rules.moods) pts.push(['noYawn', order.yawns.length ? 0 : 5]);
  pts.push(['gouter', gouter.ok ? 10 : 0]); if (gouter.ok && gouter.variety) pts.push(['variety', 3 * gouter.variety]);
  if (parking) pts.push(['parking', parking.ok ? 10 : 0]);
  pts.push(['parents', Math.round(satisfaction / 5)]);
  const allOk = order.ok && gouter.ok && (!parking || parking.ok) && nums.every((it) => perf[it.id].spacing.ok && perf[it.id].music.ok);
  if (allOk) pts.push(['perfect', 20]);
  const points = pts.reduce((s, p) => s + p[1], 0);

  /* ---- the trace and every dancer's schedule, for playback ---- */
  const at = (id) => order.items.find((i) => i.id === id);
  const numbersOf = (c) => nums.filter((it) => NUMBERS[it.id].cls === c);
  // the hair: the stations work through the dancers in the order of their classes' first number
  const hairOrder = [...rules.classes].sort((a, b) => (numbersOf(a)[0]?.start ?? 1e9) - (numbersOf(b)[0]?.start ?? 1e9));
  const hairDone = {}; let hairAcc = 0;
  for (const c of hairOrder) for (let i = 0; i < CLS[c].n; i++) { hairAcc += HAIRS[plan.hair[c] || 'queue'].min; hairDone[dancerId(c, i)] = RULES.hairStart + Math.ceil(hairAcc / loge.postes) * 60; }
  let idx = 0;
  for (const c of rules.classes) {
    const mine = numbersOf(c);
    for (let i = 0; i < CLS[c].n; i++, idx++) {
      const id = dancerId(c, i), s = (seg[id] = []), first = mine[0] ? mine[0].id : null, tArr = RULES.arrive + idx * 25;
      s.push({ t: tArr, spot: ['drop', idx], act: 'arrive', cos: first }); push(tArr, `dancer:${id}`, 'arrive', 'ok');
      s.push({ t: tArr + 20, spot: ['foyer', idx], act: 'walk', cos: first });
      s.push({ t: RULES.warmUp, spot: ['foyer', idx], act: 'warm', cos: first });
      s.push({ t: RULES.hairStart, spot: ['dr', idx], act: 'hair', cos: first });
      s.push({ t: hairDone[id], spot: ['dr', idx], act: 'dress', cos: first });
      s.push({ t: hairDone[id] + 240, spot: ['dr', idx], act: 'wait', cos: first });
      mine.forEach((it, k) => {
        const tw = it.start - it.wait - (loge.clock ? 60 : RULES.wingsBefore);
        s.push({ t: tw, spot: ['wing', id], act: 'wings', cos: it.id });
        if (it.wait) s.push({ t: it.start - it.wait, spot: ['wing', id], act: 'notready', cos: it.id });
        s.push({ t: it.start, spot: ['stage', id, it.id], act: 'dance', item: it.id, cos: it.id }); push(it.start, `dancer:${id}`, 'dance', 'ok');
        const next = mine[k + 1];
        if (next) { s.push({ t: it.end, spot: ['dr', idx], act: 'change', cos: it.id }); s.push({ t: it.end + (next.change ? next.change.min * 60 : 300), spot: ['dr', idx], act: 'wait', cos: next.id }); }
        else s.push({ t: it.end, spot: ['dr', idx], act: 'wait', cos: it.id });
      });
      const last = mine.length ? mine[mine.length - 1].id : first;
      if (c === 'petits') {
        if (order.sleepy) s.push({ t: RULES.bedtime, spot: null, act: 'sleepy', until: order.lastEnd.petits });
      } else {
        s.push({ t: finale.start - 150, spot: ['wing', id], act: 'wings', cos: last });
        s.push({ t: finale.start, spot: ['finale', id], act: 'bow', cos: last }); push(finale.start, `dancer:${id}`, 'bow', 'ok');
        s.push({ t: finale.end, spot: ['dr', idx], act: 'wait', cos: last });
      }
    }
  }
  if (order.startLate) push(plan.start, 'problem:order', 'hair', 'late', ['startLate', order.startLate, order.ready]);
  for (const it of order.items) {
    push(it.start, `item:${it.id}`, 'start', it.wait ? 'wait' : 'ok');
    if (it.wait) push(it.start - it.wait, `item:${it.id}`, 'costume', 'wait', ['wait', NUMBERS[it.id].cls, it.wait]);
    if (it.fl) push(it.start - it.fl, `item:${it.id}`, 'floor', 'wait', ['floorSwap', it.fl, it.floor]);
  }
  for (const y of order.yawns) push(at(y.id).start + 30, 'problem:order', 'yawn', 'bored', ['yawn', y.id]);
  if (order.sleepy) push(RULES.bedtime, 'class:petits', 'bedtime', 'sleepy', ['sleepy']);
  if (order.late) push(RULES.hallCloses, 'problem:order', 'hall-closes', 'late', ['late', order.late]);
  else push(order.end, 'problem:order', 'curtain', 'ok', ['onTime', order.end]);
  // each number judged on the stage, while it is danced
  for (const it of nums) {
    const P = perf[it.id], N = NUMBERS[it.id], sp = P.spacing, secPerCount = 60 / N.bpm, who = `number:${it.id}`;
    sp.collide.slice(0, 2).forEach((c, k) => push(it.start + 3 + k, who, 'arms', 'collide', ['collide', N.cls, c.i, c.j]));
    sp.offstage.slice(0, 2).forEach((o, k) => push(it.start + Math.max(4 + k, ((o.r * P.info.phrase + (o.k >= 0 ? P.info.starts[o.k] + MOVES[P.dance.moves[o.k]].c : 0)) * secPerCount)), who, 'travel', 'offstage', ['offstage', N.cls, o.i]));
    sp.hidden.slice(0, 1).forEach((h) => push(it.start + 8, who, 'seen', 'hidden', ['hidden', N.cls, h.b, h.f]));
    sp.bump.slice(0, 1).forEach((b) => push(it.start + (b.r * P.info.phrase + P.info.starts[b.k] + 4) * secPerCount, who, 'swap', 'bump', ['bump', N.cls, b.i, b.j]));
    const jolt = P.info.links.find((l) => l.gap === 2);
    if (jolt) push(it.start + (P.info.starts[jolt.k] + MOVES[jolt.from].c) * secPerCount, who, 'link', 'jolt', ['jolt', jolt.from, jolt.to]);
    P.slips.slice(0, 4).forEach((x) => push(it.start + (x.r * P.info.phrase + P.info.starts[x.k] + 1) * secPerCount, who, 'slip', x.kind, [x.kind, N.cls, x.i, P.dance.moves[x.k]]));
    if (P.music.diff > 0) push(it.end, who, 'music', 'long', ['musicLong', it.id, P.music.stopsIn]);
    if (P.music.diff < 0) push(it.end - P.music.playsOn, who, 'music', 'short', ['musicShort', it.id, P.music.playsOn]);
    push(it.end + 1, who, 'applause', P.total >= 13 ? 'ok' : 'meh', ['applause', it.id, P.total]);
  }
  // the goûter: the little ones on their way to bed, then everyone after the finale
  let eatT = finale.end + 120;
  gouter.sequence.forEach((c, ci) => {
    const t0 = gouter.leave[c] + (c === 'petits' ? 0 : ci * 60), list = gouter.eaters.filter((e) => e.cls === c);
    list.forEach((e, i) => {
      const tt = t0 + i * 6; eatT = Math.max(eatT, tt);
      seg[e.id].push({ t: tt - 40, spot: ['table', e.id], act: 'walk' });
      seg[e.id].push({ t: tt, spot: ['table', e.id], act: e.cake && e.juice ? 'eat' : 'pout' });
      push(tt, `dancer:${e.id}`, 'eat', e.cake && e.juice ? 'ok' : 'pout');
      if (c === 'petits') { seg[e.id].push({ t: tt + 90, spot: ['drop', i], act: 'leave' }); seg[e.id].push({ t: tt + 130, spot: ['gone'], act: 'gone' }); }
    });
    if (gouter.cakeOut === c) push(t0, 'problem:gouter', 'table', 'empty', ['cakeOut', c]);
    else if (gouter.juiceOut === c) push(t0, 'problem:gouter', 'table', 'empty', ['juiceOut', c]);
  });
  if (gouter.ok) push(eatT + 10, 'problem:gouter', 'table', 'ok', ['gouterOk']);
  for (const id of Object.keys(seg)) { const L = seg[id][seg[id].length - 1]; if (L.act !== 'gone') seg[id].push({ t: eatT + 20, spot: ['table', id], act: L.act === 'pout' ? 'pout' : 'party' }); }
  for (const id of Object.keys(seg)) seg[id].sort((a, b) => a.t - b.t);
  if (parking) {
    const full = parking.list.find((c) => c.bay === null); if (full) push(full.through, 'problem:parking', 'full', 'full', ['parkFull']);
    if (parking.lateCars) push(order.start + 5, 'problem:parking', 'late', 'late', ['lateParents', parking.lateParents]);
    else push(order.start - 60, 'problem:parking', 'ok', 'ok', ['parkOk']);
  }
  trace.sort((a, b) => a.t - b.t);
  const doors = parking ? order.start - parking.doors * 60 : order.start - 900;
  return {
    plan: JSON.parse(JSON.stringify(plan)), season, mode, seed, rules, stage, loge, order, perf, gouter, parking,
    parents: { audience, seats, standing, sat, satisfaction }, points, pts, allOk,
    trace, seg, doors, start: order.start, finalStart: finale.start, finalEnd: finale.end, end: eatT + 60, ok: allOk,
  };
}
