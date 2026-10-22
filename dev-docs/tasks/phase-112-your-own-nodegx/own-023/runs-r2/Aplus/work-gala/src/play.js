// Playback: the day the engine computed, drawn. Nothing here decides anything; it reads simulate()'s schedule and verdicts.
import * as T from 'three';
import { G, save } from './state.js';
import { CLS, NUMBERS, MOVES, RULES, itemKind, STYLES, PARKING } from './data.js';
import { simulate, dancerId, routineInfo, stageOf, analyseLoge, clamp, seatsOf } from './engine.js';
import {
  scene, V, STAGE, ROOMS, stageToWorld, floorY, route, TABLE, curtain, drawClock, showTable, setParents, setStageFloor,
  stepLights, carMesh, hideCars, placeCar, BAYS, cutTo, view, snapCam,
} from './world.js';
import { makeDancer, lookOf, bubbleOf, applyPose, REST } from './people.js';

export const dancers = [];
const dancersG = new T.Group(); scene.add(dancersG);
const classes = () => G.S && simulateRules().classes;
const simulateRules = () => ({ classes: Object.keys(CLS).filter((c) => CLS[c].from <= G.S.season) });
const numbersOf = (cls) => G.S.plan.order.filter((id) => NUMBERS[id] && NUMBERS[id].cls === cls);

/* ---------------- the people ---------------- */
export function buildDancers() {
  for (const d of dancers) { dancersG.remove(d.g); dancersG.remove(d.bubble); }
  dancers.length = 0; let idx = 0;
  for (const c of classes()) for (let i = 0; i < CLS[c].n; i++, idx++) {
    const bubble = new T.Sprite(bubbleOf('🙂')); bubble.scale.set(0.55, 0.55, 1); bubble.visible = false; bubble.renderOrder = 5; dancersG.add(bubble);
    const d = { id: dancerId(c, i), cls: c, i, idx, g: null, bubble, pos: V(0, 0, 30), face: 0, path: [], goal: null, goalKey: '', walkT: 0, emoji: null, lookKey: '' };
    dress(d, numbersOf(c)[0]); dancers.push(d);
  }
}
// put on number numId's costume (and the class's hair); rebuild the mesh only when something changed
export function dress(d, numId) {
  const np = numId && G.S.plan.numbers[numId], cos = np ? np.costume : { outfit: 'justaucorps', color: CLS[d.cls].color, shoes: 'demi', acc: 'aucun' };
  const hair = G.S.plan.hair[d.cls] || 'queue', key = JSON.stringify([cos, hair]);
  if (key === d.lookKey && d.g) return;
  const was = d.g; d.lookKey = key; d.g = makeDancer(lookOf(d.cls, d.i), cos, hair, CLS[d.cls].scale);
  if (was) { d.g.position.copy(was.position); d.g.rotation.y = was.rotation.y; d.g.visible = was.visible; dancersG.remove(was); }
  dancersG.add(d.g);
}
export const redressAll = () => { for (const d of dancers) { d.lookKey = ''; dress(d, d.wearing || numbersOf(d.cls)[0]); } };

/* ---------------- where each spot is ---------------- */
function spotPos(spot, d) {
  const [kind] = spot, idx = d.idx;
  if (kind === 'drop') return V(7 + (spot[1] % 4) * 0.6, 0, 9.4 + (Math.floor(spot[1] / 4) % 2) * 0.6);
  if (kind === 'foyer') return V(3.8 + (idx % 10) * 0.9, 0, Math.floor(idx / 10) * 0.9);
  if (kind === 'dr') { const per = G.S.school.logeCols - 1; return V(3.6 + (idx % per) * 1.0, 0, -8.3 + Math.floor(idx / per) * 1.4); }
  if (kind === 'wing') return V(0.5 + (d.i % 3) * 0.85, STAGE.h, -8.4 + Math.floor(d.i / 3) * 1.25);
  if (kind === 'finale') {
    const rows = classes().filter((c) => c !== 'petits'), k = rows.indexOf(d.cls), n = CLS[d.cls].n, sp = Math.min(1.25, 10.5 / n);
    return stageToWorld((d.i - (n - 1) / 2) * sp + (k % 2) * 0.3, 0.5 + k * (4.6 / Math.max(1, rows.length)));
  }
  if (kind === 'table') return V(4.3 + (idx % 10) * 0.95, 0, 0.4 + Math.floor(idx / 10) * 1.1);
  if (kind === 'podium') { const n = CLS[d.cls].n; return stageToWorld((d.i - (n - 1) / 2) * Math.min(1.15, 10.5 / n), 0.5); }
  return V(8, 0, 2);
}

/* ---------------- dancing: each move has its own shape, on its counts ---------------- */
const S = Math.sin, PI = Math.PI, hump = (u) => S(PI * clamp(u, 0, 1));
const walk = (u) => ({ lL: 0.5 * S(4 * PI * u), lR: -0.5 * S(4 * PI * u), afL: -0.4 * S(4 * PI * u), afR: 0.4 * S(4 * PI * u), aL: 0.1, aR: 0.1 });
const hop = (u) => ({ aL: 1.5, aR: 1.5, y: 0.08 * Math.abs(S(4 * PI * u)), lL: 0.35 * S(4 * PI * u), lR: -0.35 * S(4 * PI * u) });
export const MOVE_POSE = {
  plie: (u) => ({ aL: 0.9, aR: 0.9, sit: 0.25 * hump(u) }),
  releve: (u) => ({ aL: 0.9 + 2.0 * u, aR: 0.9 + 2.0 * u, y: 0.12 * u }),
  bras: (u) => ({ aL: 0.3 + 2.5 * hump(u), aR: 0.3 + 2.5 * hump(u), afL: 0.6 * S(2 * PI * u), afR: 0.6 * S(2 * PI * u), side: 0.15 * S(2 * PI * u) }),
  chasseD: hop, chasseG: hop, avance: walk, recule: walk, echange: walk,
  tourne: (u) => ({ aL: 1.2, aR: 1.2, spin: 2 * PI * u }),
  saute: (u) => ({ aL: 0.6, aR: 0.6, y: 0.22 * Math.abs(S(4 * PI * u)), lL: 0.2 * Math.abs(S(4 * PI * u)), lR: 0.2 * Math.abs(S(4 * PI * u)) }),
  reception: (u) => ({ aL: 1.5 - 0.8 * u, aR: 1.5 - 0.8 * u, y: 0.25 * (1 - u) * (1 - u), sit: 0.2 * hump(u) }),
  clap: (u) => { const k = Math.abs(S(4 * PI * u)); return { afL: 1.4, afR: 1.4, aL: -0.15 + 0.5 * k, aR: -0.15 + 0.5 * k, y: 0.04 * k }; },
  vague: (u) => ({ bow: 0.3 * S(2 * PI * u), side: 0.2 * S(4 * PI * u), afL: 0.8 + 0.5 * S(2 * PI * u + 1), afR: 0.8 + 0.5 * S(2 * PI * u + 2), aL: 0.4, aR: 0.4 }),
  descente: (u) => ({ sit: u, aL: 0.6 + 0.6 * u, aR: 0.6 + 0.6 * u, bow: 0.2 * hump(u) }),
  remonte: (u) => ({ sit: 1 - u, aL: 1.2, aR: 1.2 }),
  pirouette: (u) => ({ aL: 2.4, aR: 2.4, afL: 0.6, afR: 0.6, y: 0.12, spin: 4 * PI * u, lR: 0.5 }),
  arabesque: (u) => ({ lR: -1.3 * hump(u * 1.3), bow: 0.35 * hump(u), afL: 1.3, aL: 0.6, aR: 1.6, y: 0.06 }),
  sautChat: (u) => ({ y: 0.45 * hump(u), lL: 1.0 * hump(u), lR: 0.8 * hump(u), aL: 2.2 * hump(u) + 0.4, aR: 2.2 * hump(u) + 0.4 }),
  kick: (u) => ({ lL: 1.6 * hump(u * 2), lR: 1.6 * hump(u * 2 - 1), aL: 1.6, aR: 1.6 }),
  roulade: (u) => ({ sit: 1, roll: 2 * PI * u, aL: 1.0, aR: 1.0 }),
  moonwalk: (u) => ({ lL: 0.4 * S(4 * PI * u), lR: -0.4 * S(4 * PI * u), y: 0.03, afL: 0.3 * S(4 * PI * u), afR: -0.3 * S(4 * PI * u), aL: 0.2, aR: 0.2, bow: -0.08 }),
  toprock: (u) => ({ lL: 0.45 * S(4 * PI * u), lR: -0.45 * S(4 * PI * u), afL: 0.7 * S(4 * PI * u), afR: -0.7 * S(4 * PI * u), aL: 0.4, aR: 0.4, y: 0.05 * Math.abs(S(4 * PI * u)), side: 0.12 * S(4 * PI * u) }),
  grandJete: (u) => ({ y: 0.7 * hump(u), lL: 1.3 * hump(u), lR: -1.3 * hump(u), aL: 1.7, aR: 1.7, afL: 0.8 * hump(u), afR: 0.3 }),
  fouette: (u) => ({ spin: 6 * PI * u, lR: 1.2 * Math.abs(S(6 * PI * u)), aL: 1.5, aR: 1.5, y: 0.12 }),
  freeze: (u) => ({ sit: 1, side: 0.9 * Math.min(1, u * 3), aR: 2.6, lL: 0.4, lR: 0.9 }),
  reverence: (u) => ({ bow: 0.5 * hump(u), sit: 0.18 * hump(u), aL: 0.7, aR: 0.7, afL: 0.3, afR: 0.3 }),
};
// where dancer i of a number is, and what she is doing, at count c
// np: the flat dance (perf.dance), played once through
export function danceAt(numId, np, info, i, c, slips) {
  const A = np.A, B = np.B || np.A, total = np.repeats * info.phrase;
  if (!info.phrase) return { x: A[i].x, z: A[i].z, pose: REST, done: true };
  const hurt = slips && slips.find((s) => s.i === i && s.kind === 'ankle' && info.starts[s.k] + 1 <= c);
  if (hurt) { const at = danceAt(numId, np, info, i, info.starts[hurt.k] + 1, null); return { ...at, pose: { sit: 1, bow: 0.25, aL: 0.5, aR: 0.5, lR: 0.6 }, slip: hurt, jolt: false, done: c >= total }; }
  const cc = Math.min(c, total - 1e-6), r = Math.floor(cc / info.phrase), pc = cc - r * info.phrase;
  let k = 0; while (k + 1 < np.moves.length && info.starts[k + 1] <= pc) k++;
  const m = MOVES[np.moves[k]], u = clamp((pc - info.starts[k]) / m.c, 0, 1);
  const swapsBefore = r * info.swaps + np.moves.slice(0, k).filter((id) => MOVES[id].swap).length, F = swapsBefore % 2 ? B : A, Gf = F === A ? B : A;
  const prev = k ? info.offsets[k - 1] : { dx: 0, dz: 0 }, ox = r * info.net.dx + prev.dx + u * (m.dx || 0), oz = r * info.net.dz + prev.dz + u * (m.dz || 0);
  let x = F[i].x, z = F[i].z; if (m.swap && np.B) { x += (Gf[i].x - x) * u; z += (Gf[i].z - z) * u; }
  const slip = slips && slips.find((s) => s.i === i && s.r === r && s.k === k);
  // a step a grown-up added moves like the step it was given ("moves like", settings)
  let pose = (MOVE_POSE[np.moves[k]] || MOVE_POSE[m.like] || (() => REST))(u);
  if (slip && slip.kind === 'trip' && u > 0.3) pose = { sit: 1, bow: -0.35, aL: 1.6, aR: 1.6 };
  if (slip && slip.kind === 'forget') pose = { aR: 2.7, afR: 0.4, aL: 0.1, side: 0.1 };
  const link = k > 0 ? info.links[k - 1] : null;
  return { x: x + ox, z: z + oz, pose, slip, jolt: !!link && link.gap === 2 && u < 0.35, done: c >= total, k, r };
}

/* ---------------- the run ---------------- */
let toastFn = () => {}, sayFn = () => '';
export function onSay(fn, toast) { sayFn = fn; toastFn = toast; }
export function startRun(mode, tryId) {
  if (mode === 'gala' && G.S.galaDone) return null;
  // a try-out rolls its own dice every time; the gala keeps the season's seed
  const res = simulate({ plan: G.S.plan, school: G.S.school, season: G.S.season, mode, seed: mode === 'try' ? (Math.random() * 1e9) >>> 0 : G.S.seed });
  const run = { mode, res, t: Math.min(RULES.arrive - 300, res.doors - 300), i: 0, done: false, feed: [], tryId, auto: '' };
  if (mode === 'try') {
    const it = res.order.items.find((x) => x.id === tryId); run.t = it.start - 4; run.endT = it.end + 3; run.item = it;
    run.i = res.trace.findIndex((e) => e.t >= run.t); if (run.i < 0) run.i = res.trace.length;
  } else run.endT = res.end;
  for (const d of dancers) { d.goalKey = ''; d.path = []; d.emoji = null; d.g.visible = false; d.bubble.visible = false; d.pos.set(0, 0, 30); }
  hideCars(); setParents(0);
  showTable(1, G.S.plan.bottles, G.S.plan.crepes);
  G.run = run; G.speed = 1;
  if (mode === 'try') cutTo('stage');
  return run;
}
function rateAt(t) {
  const run = G.run, R = run.res; if (run.mode === 'try') return (60 / NUMBERS[run.tryId].bpm) * RULES.countsPerSec;
  if (t < R.doors - 300) return 300; if (t >= R.finalEnd) return 50;
  const it = R.order.items.find((i) => t >= i.start && t < i.end); if (!it) return 90;
  if (it.kind === 'number') return (60 / NUMBERS[it.id].bpm) * RULES.countsPerSec;
  return it.kind === 'finale' ? 20 : it.kind === 'interval' ? 200 : 80;
}
export function stepRun(dt) {
  const run = G.run; if (!run || run.done) return;
  const R = run.res; run.t += dt * rateAt(run.t) * G.speed;
  while (run.i < R.trace.length && R.trace[run.i].t <= run.t) {
    const e = R.trace[run.i++]; if (!e.say) continue;
    if (run.mode === 'try' && !(e.who === `number:${run.tryId}`)) continue;
    const text = sayFn(e.say, R); run.feed.push({ t: e.t, text }); toastFn(text);
  }
  // the camera follows the numbers when she asked it to
  if (G.follow && run.mode !== 'try') {
    const it = R.order.items.find((i) => run.t >= i.start - 20 && run.t < i.end + 4), want = it && (it.kind === 'number' || it.kind === 'finale') ? 'stage' : 'school';
    if (want !== run.auto) { run.auto = want; if (view.mode !== want) { G.pickedRoom = null; cutTo(want); } }
  }
  if (run.t >= run.endT) { run.done = true; run.onDone && run.onDone(); }
}
export const currentItem = () => { const run = G.run; if (!run) return null; return run.res.order.items.find((i) => run.t >= i.start && run.t < i.end) || null; };
export function skipNumber() {
  const run = G.run; if (!run) return; const it = currentItem();
  const target = it && (it.kind === 'number' || it.kind === 'finale' || it.kind === 'interval') ? it.end : (run.res.order.items.find((i) => i.start > run.t) || { start: run.endT }).start;
  fastForward(Math.max(1, target - run.t + 0.5));
}
export function fastForward(sec) { const run = G.run; if (!run) return; const end = Math.min(run.endT, run.t + sec); while (G.run && !run.done && run.t < end) { const r = rateAt(run.t) * G.speed, step = Math.min(30, end - run.t); stepRun(step / r); } snapDancers(); }

// a dancer's place and doing at day-time t
function segmentAt(d, t) {
  const s = G.run.res.seg[d.id]; if (!s) return null; let cur = null;
  for (const x of s) { if (x.t > t) break; if (x.spot) cur = { ...x, sleepy: cur && cur.sleepy }; else if (x.act === 'sleepy' && cur) cur = { ...cur, sleepy: x.until }; }
  return cur;
}
const EMO = { arrive: '👋', warm: '🤸', hair: '💇', dress: '👗', change: '👗', wings: '✨', notready: '😕', bow: '😊', eat: '🍰', pout: '😕', party: '🎉', sleepy: '😴', leave: '👋' };
function needEmoji(d, run) {
  const R = run.res, next = R.order.items.find((it) => it.kind === 'number' && NUMBERS[it.id].cls === d.cls && it.end > run.t);
  if (!next || d.i % 3) return null; const st = R.perf[next.id].state;
  if (st.hunger > 55) return '🍽️'; if (st.energy < 45) return '🥱'; if (st.focus < 45) return '🌫️'; if (st.nerves > 60) return '😬'; return null;
}
export function updateDancers(dt) {
  const run = G.run;
  for (const d of dancers) {
    let act = 'wait', target = null, key = '', pose = null, emo = null;
    if (run) {
      const s = segmentAt(d, run.t);
      if (run.mode === 'try' && d.cls !== NUMBERS[run.tryId].cls) { d.g.visible = false; d.bubble.visible = false; continue; }
      if (!s || s.act === 'gone') { d.g.visible = false; d.bubble.visible = false; continue; }
      if (s.cos && s.cos !== d.wearing) { d.wearing = s.cos; dress(d, s.cos); }
      act = s.act;
      if (act === 'dance') {
        const P = run.res.perf[s.item], np = P.dance, it = run.res.order.items.find((x) => x.id === s.item);
        const c = (run.t - it.start) * NUMBERS[s.item].bpm / 60, D = danceAt(s.item, np, P.info, d.i, c, P.slips);
        target = stageToWorld(D.x, D.z); pose = D.done ? REST : D.pose; key = 'dance';
        const sp = P.spacing;
        if (D.slip) emo = D.slip.kind === 'trip' ? '😵' : D.slip.kind === 'ankle' ? '🤕' : '🤔';
        else if (D.jolt) emo = '💥';
        else if (sp.collide.some((x) => x.i === d.i || x.j === d.i)) emo = '😬';
        else if (sp.offstage.some((x) => x.i === d.i && (x.r < D.r || (x.r === D.r && x.k <= D.k)))) emo = '😮';
        else if (sp.hidden.some((x) => x.b === d.i)) emo = '🙈';
        else if (D.done && P.music.diff < 0) emo = '😐';
        if (!d.g.visible) { d.g.visible = true; d.pos.copy(target); }
        d.pos.copy(target); d.path = []; d.goalKey = 'dance';
      } else {
        target = spotPos(s.spot, d); key = s.spot.join('|');
        if (s.sleepy && run.t < s.sleepy && run.t >= RULES.bedtime && act !== 'bow') act = 'sleepy';
        if (!d.g.visible) { d.g.visible = true; d.pos.copy(target); d.path = []; d.goalKey = key; d.goal = target.clone(); }
        emo = EMO[act] || null;
        if ((act === 'wait' || act === 'wings') && s.spot[0] !== 'table') emo = needEmoji(d, run) || (act === 'wings' ? '✨' : null);
        if (act === 'wait' && s.spot[0] === 'dr') { const L = run.res.loge; if (d.idx >= L.seats && d.idx % 4 === 1) emo = '🪑'; }
      }
    } else {
      target = d.idle; key = 'idle' + d.idleKey; act = d.idleAct;
      d.g.visible = true;
    }
    if (key !== 'dance' && (key !== d.goalKey || !d.goal || d.goal.distanceTo(target) > 0.01)) { d.goalKey = key; d.goal = target.clone(); d.path = route(d.pos, target); }
    let moving = false;
    if (key !== 'dance' && d.path.length) {
      const p = d.path[0], dx = p.x - d.pos.x, dz = p.z - d.pos.z, L = Math.hypot(dx, dz);
      let rest = L; for (let k = 1; k < d.path.length; k++) rest += d.path[k].distanceTo(d.path[k - 1]);
      const sp = Math.max(run ? 4.5 * Math.sqrt(G.speed) : 5, rest / 1.0) * dt;
      if (L < 0.05) d.path.shift(); else { const k = Math.min(1, sp / L); d.pos.x += dx * k; d.pos.z += dz * k; d.face = Math.atan2(dx, dz); moving = true; }
    }
    d.pos.y = floorY(d.pos.x, d.pos.z);
    const u = d.g.userData;
    if (moving) { d.walkT += dt * 9; applyPose(d, walk((d.walkT / (4 * PI)) % 1)); }
    else if (pose) { applyPose(d, pose); d.face = 0; }
    else if (act === 'bow') { const c = (G.realT * 2) % 4; applyPose(d, { bow: c < 1 ? S(c * PI) * 0.5 : 0 }); d.face = 0; }
    else if (act === 'warm') { const c = G.realT * 2 + d.i; applyPose(d, { aL: 2.6 + S(c) * 0.2, aR: 2.6 + S(c) * 0.2, side: S(c) * 0.25 }); }
    else if (act === 'party') applyPose(d, { aL: 2.7, aR: 2.7, y: Math.abs(S(G.realT * 5 + d.i)) * 0.25 });
    else if (act === 'sleepy') applyPose(d, { side: 0.25, aL: 0.05, aR: 0.05 });
    else if (act === 'sit') applyPose(d, { sit: 0.55, aL: 0.2, aR: 0.2 });
    else if (act === 'hair') applyPose(d, { aL: 0.1, aR: 0.1, bow: 0.1 });
    else applyPose(d, REST);
    if (!moving && !pose && act !== 'bow') d.face = act === 'eat' || act === 'pout' || act === 'party' ? Math.atan2(TABLE.x - 1 - d.pos.x, TABLE.z - d.pos.z) : run ? d.face : d.idleFace;
    if (d.cls === 'petits' && !moving && !pose) u.body.rotation.z += S(performance.now() / 260 + d.i) * 0.05;
    d.g.position.set(d.pos.x, d.pos.y, d.pos.z); d.g.rotation.y = d.face;
    if (!run) emo = null;
    if (emo !== d.emoji) { d.emoji = emo; if (emo) d.bubble.material = bubbleOf(emo); }
    d.bubble.visible = !!emo && d.g.visible; d.bubble.position.set(d.pos.x + 0.25, d.pos.y + u.h + 0.35, d.pos.z);
  }
}
export function snapDancers() { updateDancers(0.001); for (const d of dancers) if (d.goal && d.g.visible && d.goalKey !== 'dance') { d.pos.copy(d.goal); d.path = []; } updateDancers(0.001); }

/* ---------------- when nothing runs: everyone somewhere sensible, the class she is working on in front ---------------- */
export function idle() {
  const tab = G.tab, num = G.pickNum && G.S.plan.numbers[G.pickNum] ? G.pickNum : null, focusCls = (tab === 'formation' || tab === 'costumes') && num ? NUMBERS[num].cls : null;
  for (const d of dancers) {
    let p, act = 'wait', face = 0, k = '';
    const first = numbersOf(d.cls)[0];
    if (d.cls === focusCls && tab === 'formation') { const np = G.S.plan.numbers[num], F = G.editB && np.B ? np.B : np.A; p = stageToWorld(F[d.i].x, F[d.i].z); dress(d, num); d.wearing = num; k = 'f' + num; }
    else if (d.cls === focusCls && tab === 'costumes') { p = spotPos(['podium'], d); dress(d, num); d.wearing = num; k = 'p' + num; }
    else {
      if (d.wearing !== first) { dress(d, first); d.wearing = first; }
      if (d.cls === 'grandes' && !focusCls) { const F = G.S.plan.numbers.G1.A; p = stageToWorld(F[d.i].x, F[d.i].z); }
      else if (d.cls === 'petits') { p = V(4.6 + (d.i % 3) * 1.4, 0, 1.2 + Math.floor(d.i / 3) * 1.4); act = 'warm'; face = PI / 4; }
      else if (d.cls === 'ados') { p = V(9 + (d.i % 4) * 1.0, 0, 0.6 + Math.floor(d.i / 4) * 1.2); face = -0.5; }
      else if (d.cls === 'mamans') { p = V(4.4 + d.i * 0.9, 0, 5.6); act = 'sit'; face = PI; }
      else { const per = G.S.school.logeCols - 1; p = V(4.4 + (d.i % 5) * 1.5, 0, -6.6 + Math.floor(d.i / 5) * 2.4); face = 0.4; if (per < 5) p.x = 4; }
    }
    d.idle = p; d.idleAct = act; d.idleFace = face; d.idleKey = k; d.pos.copy(p); d.path = []; d.goalKey = ''; d.g.visible = true; d.emoji = null; d.bubble.visible = false; d.face = face;
  }
}

/* ---------------- the hall around the dancers: parents, cars, curtain, lights, the table ---------------- */
export function stepScene(dt) {
  const run = G.run;
  if (!run) { curtain.target = 1; stepLights(dt, false, false); return; }
  const R = run.res, t = run.t, it = currentItem(), dancing = it && (it.kind === 'number' || it.kind === 'finale');
  curtain.target = dancing || run.mode === 'try' ? 1 : 0;
  stepLights(dt, dancing, it && it.kind === 'number' && ['jazz', 'hiphop'].includes(NUMBERS[it.id].style));
  if (it && it.kind === 'number') setStageFloor(STYLES[NUMBERS[it.id].style].floor === 'bois' && R.rules.floors ? 'bois' : 'tapis');
  drawClock(t);
  // the parents: they take their seats as they arrive; the late ones come in during the first numbers
  const audience = R.parents.audience;
  let seated;
  if (R.parking) { const per = audience / Math.max(1, R.parking.cars); seated = R.parking.list.filter((c) => c.seated <= t).length * per; }
  else seated = clamp((t - R.doors) / Math.max(60, R.start - R.doors), 0, 1) * audience;
  if (run.mode === 'try') seated = audience;
  const gone = t > R.finalEnd + 120, clapping = R.order.items.some((x) => (x.kind === 'number' || x.kind === 'finale') && t >= x.end && t < x.end + 8);
  setParents(gone ? 0 : seated, clapping ? 1 : 0);
  // the cars
  if (R.parking) R.parking.list.forEach((c, k) => { const ahead = R.parking.list.filter((o) => o.k < k && o.arr <= t && o.through > t).length; placeCar(carMesh(k), c, t, ahead); });
  else for (let k = 0; k < Math.min(11, BAYS.length); k++) { const arr = R.doors + k * 60; placeCar(carMesh(k), { arr, through: arr, bay: k }, t, 0); }
  // the goûter table empties as the dancers eat
  const ate = R.trace.filter((e) => e.step === 'eat' && e.t <= t).length;
  let kcal = R.gouter.kcal0, cl = R.gouter.cl0;
  for (const e of R.gouter.eaters.slice(0, ate)) { kcal = Math.max(0, kcal - CLS[e.cls].kcal); cl = Math.max(0, cl - CLS[e.cls].juice); }
  showTable(kcal / Math.max(1, R.gouter.kcal0), cl / RULES.bottleCl, R.plan.crepes);
}
export function idleScene() {
  hideCars(); for (let k = 0; k < Math.min(4, BAYS.length); k++) placeCar(carMesh(k), { arr: 0, through: 0, bay: k }, 100, 0);
  setParents(0); curtain.target = 1; showTable(1, G.S.plan.bottles, G.S.plan.crepes); drawClock(G.S.plan.start);
}
export { simulate };
