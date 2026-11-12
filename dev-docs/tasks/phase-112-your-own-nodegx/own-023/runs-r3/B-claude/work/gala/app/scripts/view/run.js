// The evening as it plays and the verdicts after it: from reference/src/ui.js sayText, paintRunSheet, trySteps,
// verdictCards, quotes and paintResults. R is what the rules' simulate() returned for this run.
const { CLS, NUMBERS, MOVES, OUTFITS, RULES } = use('rules/data');
const { stageOf } = use('rules/engine');
const { clsColor, blockColor, chainSum, facts } = use('view/common');
const { riskReasons } = use('view/formation');

// a trace line's `say` → a sentence
function sayText(say, w) {
  const [k, ...a] = say;
  switch (k) {
    case 'wait': return w('say_wait', w.cls(a[0]), w.dur(a[1]));
    case 'floorSwap': return w(`say_floorSwap_${a[1] === 'bois' ? 'bois' : 'tapis'}`, w.dur(a[0]));
    case 'startLate': return w('say_startLate', w.dur(a[0]), w.clock(a[1]));
    case 'yawn': return w('say_yawn', w.numName(a[0]));
    case 'late': return w('say_late', w.dur(a[0]));
    case 'onTime': return w('say_onTime', w.clock(a[0]));
    case 'collide': case 'hidden': case 'bump': return w(`say_${k}`, w.dancer(a[0], a[1]), w.dancer(a[0], a[2]));
    case 'offstage': case 'forget': return w(`say_${k}`, w.dancer(a[0], a[1]));
    case 'jolt': return w('say_jolt', w.move(a[0]), w.move(a[1]));
    case 'trip': case 'ankle': return w(`say_${k}`, w.dancer(a[0], a[1]), w.move(a[2]));
    case 'musicLong': return w('say_musicLong', w.numName(a[0]), a[1]);
    case 'musicShort': return w('say_musicShort', w.numName(a[0]), w.dur(a[1]));
    case 'applause': return w(a[1] >= 13 ? 'say_applauseBig' : 'say_applause', w.numName(a[0]), a[1]);
    case 'cakeOut': case 'juiceOut': return w(`say_${k}`, w.cls(a[0]));
    default: return w.has(`say_${k}`) ? w(`say_${k}`, ...a) : k;
  }
}

const feedRows = (live, w) => (live.feed || []).slice().reverse().map((f, i, all) => ({ id: `e${all.length - i}`, time: w.clock(f.t, false), text: sayText(f.say, w) }));

// a try-out step by step: each block of the dance, each step in it, what happened on it
function trySteps(R, live, all, w) {
  const id = live.tryId, P = R.perf[id], d = P.dance, info = P.info, N = NUMBERS[id], np = R.plan.numbers[id];
  const it = R.order.items.find((x) => x.id === id);
  const c = all ? Infinity : ((live.t - it.start) * N.bpm) / 60, who = (i) => w.dancer(N.cls, i);
  const byId = Object.fromEntries(np.blocks.map((b) => [b.id, b])), seen = P.slips.filter((x) => info.starts[x.k] < c);
  const count = (kind) => seen.filter((x) => x.kind === kind).length;
  const start = [...P.spacing.collide.map((x) => w('step_touch', who(x.i), who(x.j))), ...P.spacing.hidden.map((x) => w('step_hidden', who(x.b)))];
  const blocks = [];
  if (start.length) blocks.push({ id: 'start', title: w('step_start'), color: '#ff7a7a', steps: [{ id: 'start-0', icon: '', name: '', out: start.slice(0, 6).join('\n'), state: 'bad', bad: true }] });
  let nowK = null;
  for (const mk of d.marks) {
    if (mk.k1 === mk.k0) continue;
    const steps = [];
    for (let k = mk.k0; k < mk.k1; k++) {
      const m = MOVES[d.moves[k]], s0 = info.starts[k], past = c >= s0 + m.c, now = !past && c >= s0;
      let out = '', bad = false;
      if (past || now) {
        const notes = [];
        if (s0 >= N.counts) notes.push(w('step_silent'));
        for (const x of P.slips) if (x.k === k) notes.push(w(x.kind === 'trip' ? 'step_fell' : x.kind === 'ankle' ? 'step_ankle' : 'step_forgot', who(x.i)));
        if (k > 0 && info.links[k - 1].gap === 2) notes.push(w('step_jar'));
        for (const o of P.spacing.offstage) if (o.k === k) notes.push(w('step_off', who(o.i)));
        for (const x of P.spacing.bump) if (x.k === k) notes.push(w('step_bump', who(x.i), who(x.j)));
        bad = notes.length > 0; out = bad ? notes.join('\n') : past ? w('step_ok') : '…';
      }
      if (now) nowK = k;
      steps.push({ id: `k${k}`, icon: m.icon, name: w.move(d.moves[k]), out, state: bad ? 'bad' : now ? 'now' : past ? 'done' : 'wait', bad });
    }
    blocks.push({ id: `b${mk.j}`, title: `${byId[mk.block].name} · ${mk.j + 1}`, color: blockColor(np, mk.block), steps });
  }
  return { summary: `😵 ${count('trip')} · 🤔 ${count('forget')} · 🤕 ${count('ankle')}`, blocks, nowK };
}

function liveSheet(R, live, w) {
  const head = w(`live_${live.mode}`);
  if (live.mode === 'try') return { title: head, isTry: true, cards: [], feed: feedRows(live, w), steps: trySteps(R, live, false, w) };
  const cards = R.order.items.map((it) => ({
    id: it.id, name: w.item(it.id), dot: clsColor(it.kind === 'number' ? NUMBERS[it.id].cls : null),
    time: live.t >= it.start ? w.clock(it.start, false) : '', state: live.t >= it.end ? 'done' : live.t >= it.start - (it.wait || 0) ? 'now' : 'wait',
  }));
  return { title: head, isTry: false, cards, feed: feedRows(live, w), steps: null };
}

/* ---------------- the verdicts ---------------- */
const L = (a, b, tot) => ({ a, b: b === undefined ? '' : String(b), tot: !!tot });
function quotes(R, w) {
  const keys = R.parents.sat.map(([k]) => k), out = [];
  for (const k of ['late', 'lateParents', 'standing', 'yawns', 'startLate', 'buvetteShort', 'longWait', 'narrow']) if (keys.includes(k)) out.push(w(`quotes_${k}`));
  if (R.order.sleepy) out.push(w('quotes_sleepy'));
  if (keys.includes('comfy')) out.push(w('quotes_comfy'));
  if (keys.includes('buvette')) out.push(w('quotes_buvette'));
  out.push(R.parents.satisfaction >= 80 ? w('quotes_great') : w('quotes_good'));
  return out.slice(0, 3);
}
function verdicts(R, save, w) {
  const P = R.plan, O = R.order, G2 = R.gouter, out = [];
  const card = (id, title, ok, says, lines, badge) => out.push({
    id, title: `${ok ? '🌟' : '🔧'} ${title} · ${ok ? w('perfect') : w('fix')}`, ok, badge: badge || '',
    says: says.filter(Boolean).join('\n'), lines: lines.map((l, i) => ({ id: `${id}-${i}`, ...l })), why: w('why'),
  });
  // the programme
  const os = [L(w('sum_start'), w.clock(P.start)), L(w('sum_hair', O.hairTotal, R.loge.postes, O.hairMin, w.clock(19 * 3600 + O.hairMin * 60)))];
  if (O.startLate) os.push(L(w('sum_realStart'), w.clock(O.start), true));
  for (const it of O.items) {
    if (it.co) os.push(L(`+ ${w.dur(it.co)} · ${w('sum_setChange')}`));
    if (it.fl) os.push(L(`+ ${w.dur(it.fl)} · ${w(`sum_floor_${it.floor === 'bois' ? 'bois' : 'tapis'}`)}`));
    if (it.change) os.push(L(`${w('sum_change', w.cls(NUMBERS[it.id].cls), it.change.min)} ${it.change.lines.map(([k, m, o]) => (k === 'outfit' ? w('sum_chLines_outfit', w.nm(OUTFITS[o]), m) : w(`sum_chLines_${k}`, m))).join(' · ')}`));
    if (it.wait) os.push(L(`+ ${w.dur(it.wait)} · ${w('sum_waitCos')}`));
    os.push(L(`+ ${w.dur(it.dur)} · ${w.item(it.id)}`, w.clock(it.end)));
  }
  os.push(L(`${w('sum_end')} : ${w.clock(O.end)} ${O.end <= RULES.hallCloses ? '≤' : '>'} ${w.clock(RULES.hallCloses)}`, '', true));
  if (O.lastEnd.petits !== undefined) os.push(L(`${w('sum_petitsEnd')} ${w.clock(O.lastEnd.petits)} ${O.lastEnd.petits <= RULES.bedtime ? '≤' : '>'} ${w.clock(RULES.bedtime)}`, '', true));
  for (const y of O.yawns) os.push(L(w('sum_yawn', w.numName(y.id))));
  card('order', w('vOrder'), O.ok, [O.late ? w('say_late', w.dur(O.late)) : w('say_onTime', w.clock(O.end)), O.startLate && w('say_startLate', w.dur(O.startLate)), ...O.waits.map((x) => w('say_wait', w.cls(NUMBERS[x.id].cls), w.dur(x.wait))), O.sleepy && w('say_sleepy'), ...O.yawns.slice(0, 1).map((y) => w('say_yawn', w.numName(y.id)))], os);
  // each number
  const half = stageOf(save.school).halfW;
  for (const it of O.items.filter((i) => i.kind === 'number')) {
    const p = R.perf[it.id], N = NUMBERS[it.id], cls = CLS[N.cls], sp = p.spacing, m = p.music, nmOf = (i) => `${w.dancer(N.cls, i)} (${i + 1})`, mm = (x) => `${w.num(x)} m`;
    const s = [L(`${w('numParts_placement')} ${p.pts.placement}/3 · ${w('numParts_music')} ${p.pts.music}/2 · ${w('numParts_harmony')} ${p.pts.harmony}/3 · ${w('numParts_execution')} ${p.pts.execution}/4 · ${w('numParts_wow')} ${p.pts.wow}/5`, '', true)];
    sp.collide.slice(0, 3).forEach((c) => s.push(L(w('sum_span', nmOf(c.i), nmOf(c.j), mm(c.d), mm(cls.span)))));
    sp.offstage.slice(0, 2).forEach((o) => s.push(L(Math.abs(o.x) > half ? w('sum_off', nmOf(o.i), w.num(Math.abs(o.x)), w.num(half)) : w('sum_offZ', nmOf(o.i)))));
    if (sp.offstage.length && (p.info.net.dx || p.info.net.dz)) s.push(L(p.info.net.dz ? w('sum_driftZ', w.num(p.info.net.dx), w.num(p.info.net.dz)) : w('sum_drift', w.num(p.info.net.dx))));
    sp.hidden.slice(0, 2).forEach((h) => s.push(L(w('sum_behind', nmOf(h.b), nmOf(h.f), mm(h.dx)))));
    sp.bump.slice(0, 2).forEach((b) => s.push(L(w('sum_bump', nmOf(b.i), nmOf(b.j)))));
    if (sp.ok) s.push(L(w('sum_spanOk', mm(cls.span))));
    s.push(L(w('sum_counts', w.dur(m.dur), m.bpm, m.counts)), L(w('sum_chainSum', chainSum(m.parts), m.have, m.counts, m.have === m.counts ? '=' : m.have > m.counts ? '>' : '<'), '', true));
    p.info.links.filter((l) => l.gap === 2).forEach((l) => s.push(L(w('sum_link', w.move(l.from), w.move(l.to)))));
    p.info.links.filter((l) => l.off).slice(0, 2).forEach((l) => s.push(L(w('sum_linkOff', w.move(l.to)))));
    s.push(L(w('sum_harmony', p.pts.harmony)), L(w('sum_state', p.state.energy, p.state.hunger, p.state.nerves, p.state.focus)));
    for (const r of riskReasons(p, cls, w)) s.push(L(`· ${r}`));
    s.push(L(R.mode !== 'rehearsal' ? w('sum_slips', p.slips.length) : w('sum_expected', w.num(p.ex.expected, 1)), '', true));
    if (p.wow.src.length) s.push(L(`✨ ${p.wow.src.map((x) => w(`wow_${x}`)).join(' · ')}`));
    const says = [];
    sp.collide.slice(0, 1).forEach((c) => says.push(w('say_collide', w.dancer(N.cls, c.i), w.dancer(N.cls, c.j))));
    sp.offstage.slice(0, 1).forEach((o) => says.push(w('say_offstage', w.dancer(N.cls, o.i))));
    sp.hidden.slice(0, 1).forEach((h) => says.push(w('say_hidden', w.dancer(N.cls, h.b), w.dancer(N.cls, h.f))));
    sp.bump.slice(0, 1).forEach((b) => says.push(w('say_bump', w.dancer(N.cls, b.i), w.dancer(N.cls, b.j))));
    if (m.diff > 0) says.push(w('say_musicLong', w.numName(it.id), m.stopsIn));
    if (m.diff < 0) says.push(w('say_musicShort', w.numName(it.id), w.dur(m.playsOn)));
    const jl = p.info.links.find((l) => l.gap === 2); if (jl) says.push(w('say_jolt', w.move(jl.from), w.move(jl.to)));
    if (R.mode !== 'rehearsal' && p.slips.length) says.push(w('sum_slips', p.slips.length));
    card(`num-${it.id}`, `${w.cls(N.cls)} · ${w.numName(it.id)}`, sp.ok && m.ok && !jl, says, s, w('ptsOf', p.total, p.max));
  }
  // the goûter
  const gs = R.rules.classes.map((c) => L(w('sum_kcal', c, CLS[c].n, CLS[c].kcal), `${CLS[c].n * CLS[c].kcal} kcal`));
  gs.push(L(w('sum_total', G2.needKcal), '', true));
  const parts = [`${P.cakeG} g × 4 = ${G2.offer.cake} kcal`, ...(P.crepes ? [`${P.crepes} × 150 = ${G2.offer.crepes}`] : []), ...(P.compotes ? [`${P.compotes} × 70 = ${G2.offer.compotes}`] : [])].join(' + ');
  gs.push(L(`${w('sum_offer', parts, G2.kcal0)} ${G2.kcal0 >= G2.needKcal ? '≥' : '<'} ${G2.needKcal}`, '', true));
  R.rules.classes.forEach((c) => gs.push(L(`${CLS[c].n} × ${CLS[c].juice} cl`, `${CLS[c].n * CLS[c].juice} cl`)));
  gs.push(L(w('sum_juice', G2.needCl, w.num(G2.needCl / 100, 2), P.bottles, w.num(P.bottles * 1.5)), '', true));
  card('gouter', w('vGouter'), G2.ok, [G2.cakeOut && w('say_cakeOut', w.cls(G2.cakeOut)), G2.juiceOut && w('say_juiceOut', w.cls(G2.juiceOut)), G2.ok && w('say_gouterOk')], gs);
  // the car park
  if (R.parking) {
    const pk = R.parking, ps = [];
    if (save.school.upgrades.covoit) ps.push(L(w('sum_carpool', pk.families, pk.famCars)));
    ps.push(L(w('sum_cars', pk.famCars, pk.guests, pk.cars)), L(w(pk.rows > 1 ? 'sum_baysRows' : 'sum_bays', w.num(pk.width), pk.perRow, pk.rows, pk.bays)));
    if (pk.overflow) ps.push(L(w('sum_overflow', pk.overflow)));
    ps.push(L(pk.lateCars ? w('sum_lateCars', pk.lateCars, pk.lateParents) : w('sum_noLate'), '', true));
    card('park', w('vPark'), pk.ok, [pk.lateCars ? w('say_lateParents', pk.lateParents) : w('say_parkOk')], ps);
  }
  // the parents
  const pl = R.parents.sat.map(([k, v]) => L(w(`satLines_${k}`), `${v > 0 ? '+' : ''}${v}`));
  pl.push(L(`${R.parents.audience} / ${R.parents.seats}`, '', true));
  card('parents', w('vParents'), R.parents.satisfaction >= 70, [w('satisfaction', R.parents.satisfaction), ...quotes(R, w)], pl);
  return out;
}

function results(R, live, save, w) {
  if (live.mode === 'try') {
    const v = verdicts(R, save, w).filter((x) => x.id === `num-${live.tryId}`);
    return { title: w('endTry'), isTry: true, points: '', note: '', ptsList: [], verdicts: v, steps: trySteps(R, live, true, w) };
  }
  const gala = live.mode === 'gala';
  return {
    title: gala ? w('endGala') : w('endReh'), isTry: false,
    points: gala ? w('galaPts', R.points) : w('rehPts', R.points), note: gala ? '' : w('rehNote'),
    ptsList: R.pts.map(([k, v]) => ({ id: k, label: k.startsWith('num:') ? w.numName(k.slice(4)) : w(`ptsLines_${k}`), value: String(v) })),
    verdicts: verdicts(R, save, w), steps: null,
  };
}

Object.assign(exports, { sayText, liveSheet, trySteps, verdicts, results });
