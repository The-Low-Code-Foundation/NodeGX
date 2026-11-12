// The formation tab's rows: from reference/src/ui.js paintFormation, musicBar, forecastBox, riskReasons and
// stagePlanSvg. The stage plan is drawn by Groups, not SVG, so this works out every dot's place in pixels:
// the plan box is PLAN_W px wide and shows the stage from above, the audience at the bottom.
const { CLS, NUMBERS, MOVES, MAX_MOVES, LEVELS, STYLES, numDur } = use('rules/data');
const { danceOf, routineInfo, judgeMusic, stageOf } = use('rules/engine');
const { TUNES } = use('rules/tunes');
const { forecast, clsColor, diffDots, LEVEL_ICON, blockColor, blockCounts, chainSum, linkMark, pickedNum, numChips, facts } = use('view/common');

const PLAN_W = 340, DOT = 0.6;
// the plan's geometry: metres ↔ pixels, as the coded SVG's viewBox was
function geometry(stage) {
  const W = stage.halfW, D = stage.depth, k = PLAN_W / (2 * W + 1.8);
  return { W, D, k, h: (D + 1.7) * k, px: (x) => (x + W + 0.9) * k, py: (z) => (D - z + 0.5) * k };
}

function riskReasons(P, cls, w) {
  const out = [], ex = P.ex;
  for (const x of ex.per) if (x.gap >= 1 && !out.some((o) => o.includes(w.move(x.id)))) out.push(w('sum_tooHard', w.move(x.id), MOVES[x.id].d, cls.exp));
  if (ex.per.some((x) => x.streak)) out.push(w('sum_streak'));
  if (ex.bored > 0) out.push(w('sum_bored', w.num(P.info.avgDiff), cls.exp));
  if (ex.long) out.push(w('sum_longRep', P.dance.mostRepeated));
  if (ex.shoe > 1) out.push(w('sum_pointes'));
  if (P.state.energy < 55) out.push(`${w('energy')} ${P.state.energy}`);
  if (P.state.hunger > 50) out.push(`${w('hunger')} ${P.state.hunger}`);
  if (P.state.nerves > 50) out.push(`${w('nerves')} ${P.state.nerves}`);
  if (P.state.focus < 55) out.push(`${w('focus')} ${P.state.focus}`);
  return out.slice(0, 6);
}
function meters(P, w) {
  const s = P.state, m = (key, v, good) => {
    const ok = good === 'high' ? v >= 60 : v <= 40, bad = good === 'high' ? v < 40 : v > 60;
    return { id: key, label: w(key), value: v, tone: ok ? 'good' : bad ? 'bad' : 'warn' };
  };
  return [m('energy', s.energy, 'high'), m('hunger', s.hunger, 'low'), m('nerves', s.nerves, 'low'), m('focus', s.focus, 'high')];
}

function formation(save, ui, w) {
  const id = pickedNum(save, ui, 'G1'), N = NUMBERS[id], cls = CLS[N.cls], np = save.plan.numbers[id], st = stageOf(save.school);
  const dance = danceOf(np), info = routineInfo(dance.moves, N.style, false);
  const editB = !!(ui.editB && info.swaps && np.B);
  const sel = ui.selBlock && np.blocks.some((b) => b.id === ui.selBlock[id]) ? ui.selBlock[id] : np.blocks[0].id;
  const blk = np.blocks.find((b) => b.id === sel), binfo = routineInfo(blk.moves, N.style, false);
  const selMove = ui.selMove !== null && ui.selMove !== undefined && blk.moves[ui.selMove] ? ui.selMove : null;
  const selChain = ui.selChain !== null && ui.selChain !== undefined && ui.selChain < np.chain.length ? ui.selChain : null;
  const res = forecast(save), P = res.perf[id];
  const g = geometry(st), F = editB ? np.B : np.A, col = np.costume.color === '#ffffff' ? '#e8e2f5' : np.costume.color;
  const pick = ui.pickDancer !== null && ui.pickDancer !== undefined && F[ui.pickDancer] ? ui.pickDancer : null;

  // the plan: the dancers, the selected one's arms and her path through the chosen block
  const dots = F.map((p, i) => ({ id: `${id}-${editB ? 'B' : 'A'}-${i}`, index: i, left: g.px(p.x) - (DOT * g.k) / 2, top: g.py(p.z) - (DOT * g.k) / 2, size: DOT * g.k, color: col, label: String(i + 1), picked: pick === i }));
  let arms = null; const path = [];
  if (pick !== null) {
    const p = F[pick], r = cls.span / 2;
    arms = { left: g.px(p.x - r), top: g.py(p.z) - r * g.k, size: 2 * r * g.k };
    let x = p.x, z = p.z, cur = F, other = cur === np.A ? (np.B || np.A) : np.A;
    blk.moves.forEach((mid, k) => {
      const m = MOVES[mid]; if (!m) return;
      if (m.swap && np.B) { x += other[pick].x - cur[pick].x; z += other[pick].z - cur[pick].z; [cur, other] = [other, cur]; }
      x += m.dx || 0; z += m.dz || 0; path.push({ id: `p${k}`, left: g.px(x) - 3, top: g.py(z) - 3 });
    });
  }
  const ticksX = []; for (let x = Math.ceil(-g.W); x <= g.W; x++) ticksX.push({ id: `x${x}`, label: String(Math.abs(x)), left: g.px(x) - 6, top: g.py(0) + 2 });
  const ticksZ = []; for (let z = 1; z <= g.D; z++) ticksZ.push({ id: `z${z}`, label: String(z), left: g.px(-g.W) - 16, top: g.py(z) - 7 });

  // the blocks, the steps of the chosen one, the step palette
  const blocks = np.blocks.map((b) => ({ id: b.id, label: `${b.name} · ${w('countsShort', blockCounts(b))}`, pressed: b.id === sel, dot: blockColor(np, b.id) }));
  const steps = blk.moves.map((mid, k) => { const m = MOVES[mid] || { icon: '?', c: 0, d: 1 }; return { id: `s${k}`, index: k, icon: m.icon, label: w.move(mid), small: `${w('countsShort', m.c)} · ${diffDots(m.d)}`, pressed: selMove === k, link: linkMark(binfo.links[k]) }; });
  const palette = Object.entries(MOVES).filter(([, m]) => ui.allMoves || m.st === '*' || m.st.split(' ').includes(N.style)).map(([mid, m]) => ({
    id: mid, icon: m.icon, label: w.move(mid), pressed: false, locked: blk.moves.length >= MAX_MOVES,
    small: `${w('countsShort', m.c)} · ${diffDots(m.d)} · ${LEVEL_ICON[m.a] || ''}→${LEVEL_ICON[m.b] || ''}${m.dx ? ` · ${m.dx > 0 ? '→' : '←'}1 m` : ''}${m.dz ? ` · ${m.dz < 0 ? '↓' : '↑'}1 m` : ''}`,
  }));

  // the dance: its blocks in order, and the music bar above it
  const byId = Object.fromEntries(np.blocks.map((b) => [b.id, b])), music = judgeMusic(id, dance, info);
  const chain = dance.marks.map((mk, n) => {
    const next = dance.marks[n + 1], l = next && mk.k1 > mk.k0 && next.k1 > next.k0 ? info.links[mk.k1 - 1] : null;
    return { id: `c${mk.j}`, index: mk.j, label: byId[mk.block].name, dot: blockColor(np, mk.block), pressed: selChain === mk.j, link: linkMark(l) };
  });
  const scale = Math.max(N.counts, info.phrase, 1), segs = [];
  for (const mk of dance.marks.slice(0, 120)) {
    if (mk.k1 === mk.k0) continue;
    const s0 = info.starts[mk.k0], s1 = info.starts[mk.k1 - 1] + MOVES[dance.moves[mk.k1 - 1]].c;
    const x0 = (s0 / scale) * 100, x1 = Math.min((s1 / scale) * 100, 100);
    segs.push({ id: `m${mk.j}`, left: x0, width: Math.max(0.2, x1 - x0 - 0.25), color: s1 > N.counts ? '#ff6f6f' : blockColor(np, mk.block) });
  }

  return {
    num: id, numChips: numChips(save, ui, w, id),
    facts: facts([w('musicFacts_0', w.dur(numDur(id)), N.bpm), w('tuneFact', w.nm(TUNES[id].title), w.nm(TUNES[id].by)), w('spanFact', w.cls(N.cls), `${w.num(cls.span)} m`), w('hiddenFact'), `${STYLES[N.style].icon} ${w.nm(STYLES[N.style])}`]),
    swaps: !!info.swaps, editB,
    abChips: info.swaps ? [{ id: 'A', label: w('posA'), pressed: !editB }, { id: 'B', label: w('posB'), pressed: editB }] : [],
    plan: { width: PLAN_W, height: g.h, k: g.k, W: g.W, D: g.D, stageLeft: g.px(-g.W), stageTop: g.py(g.D), stageWidth: 2 * g.W * g.k, stageHeight: g.D * g.k, wing: 0.9 * g.k },
    dots, arms, showArms: !!arms, path, ticksX, ticksZ,
    names: F.map((_, i) => `${i + 1} ${w.dancer(N.cls, i)}`).join(' · '),
    blocks, canDelBlock: np.blocks.length > 1, blockName: blk.name, blockColor: blockColor(np, sel),
    steps, stepsEmpty: steps.length === 0, moveTools: selMove !== null,
    blockLen: w('blockLen', blk.name, blockCounts(blk)),
    filterChips: [{ id: 'style', label: w('onlyStyle', w.nm(STYLES[N.style])), pressed: !ui.allMoves }, { id: 'all', label: w('allMoves'), pressed: !!ui.allMoves }],
    palette, levels: LEVEL_ICON.map((ic, k) => `${ic} ${LEVELS[w.lang][k]}`).join(' · '),
    chain, chainEmpty: chain.length === 0, chainTools: selChain !== null, addToChain: w('addToChain', blk.name),
    danceLen: w('danceLen', chainSum(music.parts), info.phrase, N.counts),
    musicWidth: (N.counts / scale) * 100, segs,
    meters: P ? meters(P, w) : [], risk: P ? w(`risk_${P.risk}`) : '', riskTone: P ? P.risk : 'low', reasons: P ? facts(riskReasons(P, cls, w)) : [],
  };
}

Object.assign(exports, { formation, geometry, riskReasons, PLAN_W });
