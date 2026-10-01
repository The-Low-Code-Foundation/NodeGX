/**
 * P106 IG-004 — the island as a world (R1, R9): one island per kid, every request a plot on it, and the robots she
 * taught left working there.
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * ## What is here
 *
 * | script | the question it answers |
 * |---|---|
 * | {@link islandWorldScript} (`Logic/Island world`) | the island as it stands for THIS kid: the base map with every plot's request map stamped on it, what stands on each plot (working, won, open, locked), the islanders, the fences, her robots — and the tick's state |
 * | {@link ISLAND_TICK_SCRIPT} (`Logic/Island tick`) | one tick of the island: every pinned run stepped in turn, each on its own plot with its own id |
 * | {@link PLOT_AT_SCRIPT} (`Logic/Plot at`) | which plot a tapped tile belongs to (an islander standing by her plot counts as her plot) |
 * | {@link ISLAND_CHOOSE_SCRIPT} (`Logic/Island choose`) | the plot card: who asks, what, whether it opens, and "bring {b} home" when the robot is at work |
 * | {@link FIND_ROBOTS_SCRIPT} (`Logic/Find robots`) | the flat island's "find my robots": the robots scrolled into view and ringed for a moment |
 *
 * ## One engine world for the whole island, each pinned run stepped in turn
 *
 * The island's state holds every plot and, for each PINNED plot, its live run and what stands on it. A tick steps each
 * pinned run with the engine's own `step` and `apply` (ENGINE, CG-002), against its plot's window of the island — the
 * plot's own map, its things, its one robot, exactly the world `Start world` gives the Workshop for that request — so a
 * program runs on the island as it ran when it won. Each run has its own id (`island-<request>-<lap>`) and its own
 * robot id (the robot the save pinned there): nothing is held in a `Variable` by name but the one state (a `Variable` is
 * global by NAME, D57 — not one `gardenRun` for everyone). The world a renderer draws is composed from the plots after
 * each tick: one map, every thing, every robot, in island coordinates.
 *
 * A pinned run that ENDS holds the plot done for {@link ISLAND_HOLD_TICKS} ticks, then the plot RESETS — its things back
 * to the request's start, the robot to its start tile — and the run restarts: the robot is seen working forever, the plot
 * is seen done. No Olive on the tick: an ask takes the fallback, as `runToEnd` does.
 *
 * P108 IW-002: a plot whose request carries a `job` is never reset. Its robot works until the job is done, walks home
 * (the engine's walk, `step`'s home op) and WAITS there; wear (only here, on the island tick: `wearOf`) takes a drink, a
 * stone or a food; when that reopens the job the robot starts its program again on the plot as it stands (D3). A program
 * that ends with the job not done walks home and starts again. A plot with no job keeps the hold-and-reset above.
 *
 * 🔴 No backtick and no dollar-brace inside any script text (README §7): these are template literals.
 *
 * @module noodl-mcp/tests/ig004Island
 */
import { ENGINE } from './cg002Scripts';
// P108 IW-003 (lane M): Olive's written answers, for an ask on a job plot (the island has no Olive; the page's fallback).
import { OLIVE_SLIM } from './cg005Olive';
// P108 IW-008 (lane C): the crew — which of her robots does a plot's job.
import { CREW_PICK } from './iw008Crew';
// P108 IW-006 (lane E): the earning rule and the live job's resume, appended to the island engine.
import { EARN_ENGINE } from './iw006Earn';
// P108 IW-007 (lane B): her land — a plot of the island, its drops written to her save, teach again judged by its team.
import { LAND_TICK, LAND_WORLD } from './iw007Building';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { writtenAnswer: islWritten } = require('../../../dev-docs/tasks/phase-105-the-coding-garden/garden-desktop/shell/olive-written.js');

/** A pinned run that has finished shows its done plot for this many ticks before the plot resets and the run restarts. */
export const ISLAND_HOLD_TICKS = 3;

/** The engine helpers the island scripts share: ENGINE (CG-002) plus the plot window, the tick and the composed world. */
export const ISLAND_ENGINE = `${ENGINE}
var ISLAND_HOLD = ${ISLAND_HOLD_TICKS};
function islClone(v) { return v === undefined || v === null ? v : JSON.parse(JSON.stringify(v)); }
/** A short, stable name for what an island was built from (djb2 over the text): the tick's guard against a stale state. */
function islHash(text) { var h = 5381, t = String(text); for (var i = 0; i < t.length; i++) h = ((h * 33) ^ t.charCodeAt(i)) >>> 0; return h.toString(36) + ':' + t.length; }
/**
 * A request's start in its plot's own coordinates: its things and its one robot — Start world's robot, field for field.
 * P106 IG-005: bot is the robot row working it (Read family's): its can and basket (upgrades applied) and its look.
 */
function islStart(req, robotId, bot) {
  var rs = req.robotStart || {};
  var robot = { id: String(robotId || 'me'), x: Number(rs.x) || 0, y: Number(rs.y) || 0, d: Number(rs.d) || 0, carry: Array.isArray(rs.carry) ? rs.carry.slice() : [] };
  if (rs.basket !== undefined) robot.basket = rs.basket;
  robot.can = rs.can === undefined || rs.can === null || rs.can === '' ? null : Math.max(0, Math.floor(Number(rs.can)) || 0);
  robot.canMax = Number(rs.canMax) > 0 ? Math.floor(Number(rs.canMax)) : CAN_MAX;
  if (bot && typeof bot === 'object') {
    if (Number(bot.canMax) > 0) robot.canMax = Math.floor(Number(bot.canMax));
    if (Number(bot.basket) > 0) robot.basket = Math.max(Math.floor(Number(bot.basket)), Number(rs.basket) > 0 ? Math.floor(Number(rs.basket)) : 0);
    robot.look = islLook(bot);
  }
  return { things: islClone(req.things || []), robot: robot, spent: [] };
}
/** IG-005: a robot row's look as Draw world reads it: its name, colour, eyes, hat and the accessory of its job. */
function islLook(bot) { return { name: String(bot.name || ''), colour: String(bot.color || ''), eyes: String(bot.eye || 'round'), hat: String(bot.hat || 'none'), accessory: String(bot.accessory || '') }; }
/** The plot's window of the island as the engine's world: the request's map, what stands on the plot, its robot. */
function islView(plot, live) {
  var w = { map: plot.map.slice(), things: live.things, robots: [live.robot], events: [], schedule: islClone(plot.schedule || []) };
  // P108 IW-008 (lane C): the plot's second robot stands in the same world (its seeks see the first's reservations).
  if (live.mate && live.mate.robot) w.robots.push(live.mate.robot);
  if (live.spent && live.spent.length) w.spent = live.spent.slice();
  // P108 IW-002: a job plot carries its job and its seed (the wear's draws go on from it).
  if (plot.job) { w.job = islClone(plot.job); w.seed = Number(live.seed) >>> 0; }
  // P108 IW-005: what its go to nearest reserved rides the tick (released when picked or the run ends).
  if (live.reserved && typeof live.reserved === 'object') w.reserved = islClone(live.reserved);
  return w;
}
/** IW-005: the plot's reservations after a tick, only on a plot that has had one (a plot that never seeks keeps its shape). */
function islKeep(out, w) { if (w.reserved && typeof w.reserved === 'object') out.reserved = w.reserved; return out; }
function islRun(plot, lap) { return newRun(plot.program, plot.robotId, 'en', 'island-' + plot.id + '-' + lap); }
/** P108 IW-002: a plot's seed, from its request's name (djb2): the island lays a plot the same way every build. */
function islSeedOf(id) { var h = 5381, t = String(id); for (var i = 0; i < t.length; i++) h = ((h * 33) ^ t.charCodeAt(i)) >>> 0; return h; }
// P108 IW-003 (lane M): no Olive on the island — an ask on a job plot takes her WRITTEN answer, the fallback the page
// gives while she rests (Mamie's note read on the island says the day's row, so the pinned program still finishes).
var ISL_WRITTEN = ${JSON.stringify({ written: OLIVE_SLIM.written })};
${Function.prototype.toString.call(islWritten)}
function islAnswer(q) { var a = writtenAnswer(ISL_WRITTEN, q.rung, q.slots, q.lang) || {}, out = { seq: q.seq, ok: false, fallback: true }; if (a.value !== undefined) out.value = a.value; if (a.text !== undefined) out.text = a.text; return out; }
/** IW-002: a run that is only the walk home (a program that ended with the job not done goes home before it starts again). */
function islHomeRun(plot, lap) { var run = newRun([], plot.robotId, 'en', 'island-' + plot.id + '-' + lap + '-home'); run.steps = [{ id: null, op: 'home', guard: 0 }]; return run; }
/**
 * IW-002: one tick of a job plot — wear first (only here), then the robot: working, walking home, or waiting at home
 * until a worn target reopens the job. The plot is never reset: the next lap starts on the plot as it stands.
 */
function islStepJob(plot, cur) {
  var w = worldOf(islView(plot, cur)), age = (Number(cur.age) || 0) + 1, lap = Number(cur.lap) || 0, run = cur.run, phase = cur.phase || 'work';
  var worn = wearOf(w, age);
  for (var i = 0; i < worn.length; i++) w = apply(w, worn[i]);
  var delta = null;
  // P108 IW-006 (lane E): the lap's gain so far; what a lap's end pays; a moment the save is written at (a lap's end, wear reopening the job).
  var gain = cur.gain && typeof cur.gain === 'object' ? cur.gain : {}, paid = null, moment = false;
  if (phase === 'wait' && !jobDone(w)) { lap++; run = islRun(plot, lap); phase = 'work'; moment = true; }
  if (phase !== 'wait') {
    var r = step(run, w, null);
    if (r.waiting && r.request) r = step(r.run, w, islAnswer(r.request));
    // P108 IW-006 (lane E): the robot's own fill this tick (never the wear's), counted into the lap's gain.
    var m0 = iw6Meters(w);
    w = apply(w, r.delta);
    gain = iw6Gain(gain, m0, iw6Meters(w));
    run = r.run; delta = r.delta;
    if (r.done) {
      // P108 IW-006 (lane E): the program run to its end is a lap: it pays what it filled, and the bonus at the finish line.
      if (phase === 'work') { paid = iw6Pay(plot.id, iw6Steps(gain), iw6Total(w), jobDone(w)); gain = {}; moment = true; }
      if (jobDone(w)) phase = 'wait';
      else if (phase === 'return') { lap++; run = islRun(plot, lap); phase = 'work'; }
      else { phase = 'return'; run = islHomeRun(plot, lap); }
    }
  }
  return islKeep({ run: run, things: w.things, robot: w.robots[0], spent: Array.isArray(w.spent) ? w.spent : [], hold: 0, lap: lap, phase: phase, age: age, seed: Number(w.seed) >>> 0, worn: worn, delta: delta, gain: gain, paid: paid, moment: moment }, w);
}
/** One tick of one pinned plot. A finished run holds the plot done, then the plot resets and the run restarts. */
function islStepPlot(plot, cur) {
  // P108 IW-003 (lane B): a stale plot (teach again) is not stepped: its robot waits at home, where it started.
  if (plot.stale) return cur;
  // P108 IW-007 (lane B): on her land, a drop that raises a building is a moment the save is written at (every drop kept).
  if (plot.job && plot.land) return iw7bDropMoment(cur, plot.mate ? islWithMate(plot, cur, islHelped(plot, cur)) : islHelped(plot, cur));
  // P108 IW-008 (lane C): a job plot's second robot steps after the first, on the world the first left.
  // P108 IW-006 (lane H): a job with a shop helper riding on it steps with the helper on (islHelped).
  // Merge (s4): the helper rides the first robot's step; the second robot steps on the world that step left.
  if (plot.job && plot.mate) return islWithMate(plot, cur, islHelped(plot, cur));
  if (plot.job) return islHelped(plot, cur);
  if (cur.hold > 0) {
    if (cur.hold > 1) return { run: cur.run, things: cur.things, robot: cur.robot, spent: cur.spent, hold: cur.hold - 1, lap: cur.lap };
    var st = islClone(plot.start);
    return { run: islRun(plot, cur.lap + 1), things: st.things, robot: st.robot, spent: [], hold: 0, lap: cur.lap + 1 };
  }
  var view = islView(plot, cur);
  var r = step(cur.run, view, null);
  // No Olive on the island: an ask takes the fallback, as runToEnd does.
  if (r.waiting && r.request) r = step(r.run, view, { seq: r.request.seq, ok: false, fallback: true });
  var w = apply(view, r.delta);
  return islKeep({ run: r.run, things: w.things, robot: w.robots[0], spent: Array.isArray(w.spent) ? w.spent : [], hold: r.done ? ISLAND_HOLD : 0, lap: cur.lap }, w);
}
/** The island after one tick: each pinned plot stepped in turn, in plot order. Only the live parts are new objects. */
function islTick(s) {
  if (!s || typeof s !== 'object' || !Array.isArray(s.plots)) return null;
  var live = {};
  for (var k in s.live) live[k] = s.live[k];
  for (var i = 0; i < s.plots.length; i++) {
    var plot = s.plots[i];
    if (plot.status === 'working' && live[plot.id]) live[plot.id] = islStepPlot(plot, live[plot.id]);
  }
  var out = {};
  for (var k2 in s) out[k2] = s[k2];
  out.live = live;
  out.tick = (Number(s.tick) || 0) + 1;
  return out;
}
/** The island as one engine world, in island coordinates: the still plots, the working ones, the islanders and fences, the robots. */
function islWorld(s) {
  var things = [], robots = [];
  for (var a = 0; a < s.still.length; a++) things.push(islClone(s.still[a]));
  for (var i = 0; i < s.plots.length; i++) {
    var plot = s.plots[i], cur = s.live[plot.id];
    if (plot.status !== 'working' || !cur) continue;
    for (var t = 0; t < cur.things.length; t++) { var th = islClone(cur.things[t]); th.x = Number(th.x) + plot.x; th.y = Number(th.y) + plot.y; things.push(th); }
    var r = islClone(cur.robot);
    r.x = Number(r.x) + plot.x; r.y = Number(r.y) + plot.y; r.plot = plot.id;
    robots.push(r);
    // P108 IW-008 (lane C): and the robot that helps there.
    if (cur.mate && cur.mate.robot) { var mr = islClone(cur.mate.robot); mr.x = Number(mr.x) + plot.x; mr.y = Number(mr.y) + plot.y; mr.plot = plot.id; delete mr.home; robots.push(mr); }
  }
  for (var d = 0; d < s.deco.length; d++) things.push(islClone(s.deco[d]));
  for (var h = 0; h < s.home.length; h++) robots.push(islClone(s.home[h]));
  return { map: s.map, things: things, robots: robots, events: [], schedule: [] };
}
// ── P108 IW-008 (lane C): the second robot on a job plot (IW-008 §2) — the first's machine, its own run and home ──
/** The tile beside a start for the second robot: behind it, then its left, its right, ahead — the first free one on the plot. */
function islBeside(map, things, r) {
  var w = worldOf({ map: map, things: things, robots: [] });
  var order = [(r.d + 2) % 4, (r.d + 3) % 4, (r.d + 1) % 4, r.d];
  for (var i = 0; i < order.length; i++) { var x = r.x + DX[order[i]], y = r.y + DY[order[i]]; if (!blocked(w, x, y)) return { x: x, y: y }; }
  return { x: r.x, y: r.y };
}
function islMateRun(plot, lap) { return newRun(plot.mate.program, plot.mate.robotId, 'en', 'island-' + plot.id + '-m' + lap); }
function islMateHome(plot, lap) { var run = newRun([], plot.mate.robotId, 'en', 'island-' + plot.id + '-m' + lap + '-home'); run.steps = [{ id: null, op: 'home', guard: 0 }]; return run; }
/**
 * One tick of the plot's second robot, after the first's (islStepJob's own machine: work → the walk home → wait at home
 * until wear reopens the job → work again; a program that ends with the job not done walks home and starts again). It
 * steps on the world the first left (the same things, the same reservations), and walks home to its own tile.
 */
function islWithMate(plot, cur, out) {
  if (!plot.mate || !cur.mate || !out || out === cur) return out;
  out.mate = cur.mate;
  var w = worldOf(islView(plot, out)), m = cur.mate, run = m.run, phase = m.phase || 'work', lap = Number(m.lap) || 0, delta = null;
  // P108 s7: the helper earns as the first robot does (iw6Pay): its own fill is its lap's gain, its program's end pays it.
  var mgain = m.gain && typeof m.gain === 'object' ? m.gain : {}, mpaid = null;
  if (phase === 'wait' && !jobDone(w)) { lap++; run = islMateRun(plot, lap); phase = 'work'; }
  if (phase !== 'wait') {
    var r = step(run, w, null);
    if (r.waiting && r.request) r = step(r.run, w, islAnswer(r.request));
    var mm0 = iw6Meters(w);
    w = apply(w, r.delta);
    mgain = iw6Gain(mgain, mm0, iw6Meters(w));
    run = r.run; delta = r.delta;
    if (r.done) {
      if (phase === 'work') { mpaid = iw6Pay(plot.id, iw6Steps(mgain), iw6Total(w), jobDone(w)); mgain = {}; out.moment = true; }
      if (jobDone(w)) phase = 'wait';
      else if (phase === 'return') { lap++; run = islMateRun(plot, lap); phase = 'work'; }
      else { phase = 'return'; run = islMateHome(plot, lap); }
    }
  }
  out.things = w.things;
  out.robot = w.robots[0];
  out.spent = Array.isArray(w.spent) ? w.spent : [];
  out.mate = { run: run, robot: w.robots[1], phase: phase, lap: lap, delta: delta, gain: mgain };
  out.matePaid = mpaid;
  return islKeep(out, w);
}

// ── P108 IW-003 (lane B): teach again — a pinned program the rewritten job outgrew ──
/** A request with a job or a seeded layout, laid from its plot's seed (the island's own laying), else null. */
function islLaidOf(req) {
  if (!req || (!req.job && !req.seeded)) return null;
  return worldOf(seedWorld({ map: (Array.isArray(req.map) ? req.map : []).slice(), things: islClone(req.things || []), robots: [] }, req, islSeedOf(req.id)));
}
/**
 * Does a stored program no longer win its (rewritten) job? It is run to its end, the engine's way (no Olive: the written
 * answer), on the plot as its seed lays it with the robot at its start, and judged by the request's own goal — but only
 * where the request's OWN reference program wins that start (a job whose source fills later, a hen with no egg yet,
 * cannot be judged from its start, and is never flagged). Only a request with a job is judged (a stored v4 program is
 * the engine format: nothing to migrate, IW-004 AC8); an empty program is not a pinned one. A robot on a stale plot waits
 * at home: it never flails at a job its program cannot do.
 */
function islStale(req, program, laid, robot) {
  if (!req || !req.job || !Array.isArray(program) || !program.length) return false;
  var lay = laid || islLaidOf(req);
  if (!lay) return false;
  var bot = islClone(robot) || islStart(req, 'me').robot;
  function wins(prog) {
    var w = { map: lay.map.slice(), things: islClone(lay.things), robots: [islClone(bot)], events: [], schedule: islClone(req.schedule || []), job: islClone(lay.job), seed: lay.seed };
    var end = runToEnd(prog, w, bot.id, 'en');
    return end.known && goalMet(end.world, end.run, prog, req.goal).met;
  }
  if (!Array.isArray(req.referenceProgram) || !wins(req.referenceProgram)) return false;
  return !wins(program);
}
// ── P108 IW-006 (lane H): a shop helper riding on a job (AC4) ──
/**
 * One tick of a job plot with a helper riding on it (the live state's helper: selfcan or barrow — the rain cloud never
 * rides, it is spent the moment it is used). The helper is put on the job's world before the step (helperOn: the can
 * full, eight carried) and again after it, so the drawn can never shows a pour spent; the tick the job crosses its finish
 * line (the robot turns to wait at home) it is gone: the state no longer carries it and the robot carries its own again.
 */
function islHelped(plot, cur) {
  var h = cur && typeof cur.helper === 'string' ? cur.helper : '';
  if (!h) return islStepJob(plot, cur);
  var c = {};
  for (var k in cur) c[k] = cur[k];
  c.robot = islClone(cur.robot);
  c.things = islClone(cur.things);
  helperOn({ things: c.things, robots: [c.robot] }, h);
  var out = islStepJob(plot, c);
  if (out.phase === 'wait') {
    var own = plot.start && plot.start.robot ? plot.start.robot.basket : undefined;
    if (h === 'barrow') { if (own === undefined) delete out.robot.basket; else out.robot.basket = own; }
    out.helperDone = h;
    // Merge (s4): '' (not absent) tells lane E's Island keep the helper is gone, so the save drops it too.
    out.helper = '';
    return out;
  }
  helperOn({ things: out.things, robots: [out.robot] }, h);
  out.helper = h;
  return out;
}
${EARN_ENGINE}
${LAND_TICK}
`;

/**
 * `Logic/Island world` — the island as it stands for this kid, and the tick's first state. Built by a function so the
 * page glue can hand it free play's request, the base map and the home tile (cg003Scripts registers it).
 *
 * Inputs: `requests` (each with its `plot`), `plots` / `robots` / `done` / `band` (Read family: HER island),
 * `pins` (Island pins: each islander's next request). Outputs: `state` (for the tick), `world` (the composed engine
 * world), `cards` (one per plot: where, what state, who), `focus` (the robots' rectangle, for "find my robots"),
 * `working` (how many plots have a robot at work), `found` (the island was built).
 *
 * A plot is **working** (pinned: a program and one of her robots), **won** (done, nobody on it: drawn as won — its
 * request's reference program run to its end, no Olive), **open**, **locked** (a band above hers: a fence, a padlock),
 * or **free** (free play, "the garden": never pinned, its own dry tulips).
 */
export const islandWorldScript = (o: { free: unknown; base: ReadonlyArray<string>; home: { x: number; y: number }; freePlot: { x: number; y: number }; plotW: number; plotH: number }): string => `${ISLAND_ENGINE}${LAND_WORLD}
var FREE = ${JSON.stringify(o.free)};
var FREE_PLOT = ${JSON.stringify(o.freePlot)};
var BASE = ${JSON.stringify(o.base)};
var HOME = ${JSON.stringify(o.home)};
var PW = ${o.plotW}, PH = ${o.plotH};
var reqs = Array.isArray(Inputs.requests) ? Inputs.requests : [];
var saved = Inputs.plots && typeof Inputs.plots === 'object' ? Inputs.plots : {};
var done = Array.isArray(Inputs.done) ? Inputs.done : [];
var band = Number(Inputs.band) === 1 ? 1 : 2;
var mine = Array.isArray(Inputs.robots) && Inputs.robots.length ? Inputs.robots : [{ id: 'r1' }];
var pins = Array.isArray(Inputs.pins) ? Inputs.pins : [];
// P106 IG-005: a robot row's kind (Read family gives it; a bare { id } row is Pip, or its id when that is a kind).
function kindOf(m) { return m && m.kind ? String(m.kind) : m && m.id && m.id !== 'r1' ? String(m.id) : 'pip'; }
function rowOf(id) { for (var q = 0; q < mine.length; q++) if (mine[q] && mine[q].id === id) return mine[q]; return null; }
function ownsKind(k) { for (var q = 0; q < mine.length; q++) if (kindOf(mine[q]) === k) return true; return false; }
var rows = [];
for (var b = 0; b < BASE.length; b++) rows.push(String(BASE[b]).split(''));
var H = rows.length, W = H ? rows[0].length : 0;
var list = [];
for (var i = 0; i < reqs.length; i++) if (reqs[i] && reqs[i].plot && isFinite(Number(reqs[i].plot.x))) list.push(reqs[i]);
var freeReq = islClone(FREE); freeReq.plot = FREE_PLOT;
list.push(freeReq);
// P108 IW-007 (lane B): her land (Read family's), a plot like the others — drawn whether or not anything stands on it.
list.push(iw7bLandRequest(Inputs.land));
var plots = [], still = [], deco = [], live = {}, cards = [], busy = {};
function hasRobot(id) { return !!rowOf(id); }
function wonThings(req, laid) {
  var st = islStart(req, 'me');
  var wv = { map: laid ? laid.map.slice() : req.map.slice(), things: laid ? islClone(laid.things) : st.things, robots: [st.robot], events: [], schedule: islClone(req.schedule || []) };
  if (laid && laid.job) { wv.job = islClone(laid.job); wv.seed = laid.seed; }
  var end = runToEnd(req.referenceProgram || [], wv, 'me', 'en');
  return end.world.things;
}
/** P108 IW-002: a request with a job or a seeded layout, laid from its plot's seed (ids minted for its targets); else null. */
function islLaid(req) {
  if (!req.job && !req.seeded) return null;
  return worldOf(seedWorld({ map: (Array.isArray(req.map) ? req.map : []).slice(), things: islClone(req.things || []), robots: [] }, req, islSeedOf(req.id)));
}
for (var p = 0; p < list.length; p++) {
  var req = list[p], px = Math.floor(Number(req.plot.x)), py = Math.floor(Number(req.plot.y));
  var map = Array.isArray(req.map) ? req.map : [];
  var laid = islLaid(req);
  if (laid) map = laid.map;
  for (var y = 0; y < map.length; y++) for (var x = 0; x < String(map[y]).length; x++) if (rows[py + y] && py + y < H && px + x < W) rows[py + y][px + x] = String(map[y]).charAt(x);
  var sv = saved[req.id], isFree = req.id === 'free';
  // P108 IW-007 (lane B): her land needs no kind and no band; it works when a robot is pinned AND something stands on it.
  var isLand = req.id === LAND_ID;
  // IG-005: a plot is also locked while she has no robot of the kind it needs (the lock line names who lends it).
  var needs = isFree || isLand ? '' : String(req.needs || 'pip');
  var lock = isFree || isLand ? '' : Number(req.band) > band ? 'band' : !ownsKind(needs) ? 'robot' : '';
  var status = isFree ? 'free' : lock ? 'locked' : isLand && !(laid && laid.job) ? 'open' : (sv && Array.isArray(sv.program) && sv.program.length && sv.robotId && hasRobot(sv.robotId) && !busy[sv.robotId]) ? 'working' : done.indexOf(req.id) !== -1 && !isLand ? 'won' : 'open';
  var robotId = status === 'working' ? String(sv.robotId) : '';
  if (robotId) busy[robotId] = req.id;
  var start = islStart(req, robotId || 'me', robotId ? rowOf(robotId) : null);
  if (laid) start.things = islClone(laid.things);
  var plot = { id: req.id, x: px, y: py, w: PW, h: PH, map: map.slice(), schedule: islClone(req.schedule || []), status: status, islander: String(req.islander || ''), band: Number(req.band) || 1, robotId: robotId, program: robotId ? islClone(sv.program) : null, start: start };
  // P108 IW-002: a job plot's job (its targets by id) and its seed; its tick is the job tick (islStepJob), never a reset.
  if (laid && laid.job) { plot.job = laid.job; plot.seed = Number(laid.seed) >>> 0; }
  if (isLand) plot.land = true;
  // P108 IW-003 (lane B): teach again — the pinned program no longer wins this (rewritten) job: flagged, never stepped.
  // P108 IW-007 (lane B): not on her land — its team is judged below, once the helper is known.
  if (status === 'working' && !isLand && laid && laid.job && islStale(req, plot.program, laid, start.robot)) plot.stale = true;
  plots.push(plot);
  cards.push({ id: req.id, x: px, y: py, w: PW, h: PH, status: status, islander: plot.islander, band: plot.band, robotId: robotId, door: null, needs: needs, lock: lock });
  if (plot.stale) cards[cards.length - 1].stale = true;
  if (status === 'working') {
    live[req.id] = { run: islRun(plot, 0), things: islClone(start.things), robot: islClone(start.robot), spent: [], hold: 0, lap: 0 };
    if (plot.job) { live[req.id].phase = plot.stale ? 'teach' : 'work'; live[req.id].age = 0; live[req.id].seed = plot.seed; }
    // P108 IW-006 (lane E): a job plot goes on from the live job its save kept (robot at home; waiting if the job is done).
    if (plot.job && sv.live) iw6Resume(live[req.id], plot, sv.live);
    // P108 IW-007 (lane B): on her land the buildings and bowls are the land's (what Island keep wrote), the sources the live job's.
    // (a robot waiting at home beside a job a new building reopened goes back on the first tick: islStepJob's own rule.)
    if (isLand && plot.job && sv.live) iw7bLandOnto(live[req.id], laid.things);
    // P108 IW-008 (lane C): a robot of hers that helps on this job plot (its kind, its own program), on the tile beside.
    if (plot.job && !plot.stale) for (var hm = 0; hm < mine.length && !plot.mate; hm++) {
      var mh = mine[hm];
      // P108 IW-007 (lane B): on her land a helper of ANY kind (the land needs no one kind).
      if (!mh || String(mh.helps || '') !== req.id || mh.id === robotId || busy[mh.id] || (!isLand && kindOf(mh) !== needs) || !Array.isArray(mh.program) || !mh.program.length) continue;
      var mbot = islStart(req, mh.id, mh).robot, spot = islBeside(plot.map, start.things, mbot);
      mbot.x = spot.x; mbot.y = spot.y; mbot.home = { x: spot.x, y: spot.y, d: mbot.d };
      plot.mate = { robotId: String(mh.id), program: islClone(mh.program) };
      busy[mh.id] = req.id;
      live[req.id].mate = { run: islMateRun(plot, 0), robot: mbot, phase: 'work', lap: 0 };
    }
    // P108 IW-007 (lane B): teach again on her land — judged by its team (iw007Building): neither program fills a step.
    if (isLand && plot.job && iw7bLandStale(plot, live[req.id])) {
      plot.stale = true; cards[cards.length - 1].stale = true; live[req.id].phase = 'teach';
      if (plot.mate) { delete busy[plot.mate.robotId]; delete plot.mate; delete live[req.id].mate; }
    }
    continue;
  }
  var shown = status === 'won' ? wonThings(req, laid) : start.things;
  for (var t = 0; t < shown.length; t++) { var th = islClone(shown[t]); th.x = Number(th.x) + px; th.y = Number(th.y) + py; still.push(th); }
  if (status === 'locked') { deco.push({ kind: 'fence', x: px, y: py, w: PW, h: PH }); deco.push({ kind: 'padlock', x: px + Math.floor(PW / 2), y: py + Math.floor(PH / 2) }); }
}
// The islanders: each stands by the plot of her next request (Island pins), with its title as her bubble; with none
// left for this kid, by her first plot not done yet (a locked one), else by her last.
var ISL = ['sami', 'mamie', 'biscuit'];
for (var n = 0; n < ISL.length; n++) {
  var who = ISL[n], pin = null, at = null, open = false;
  // Island pins names a pin by its islander (its id is hers).
  for (var k = 0; k < pins.length; k++) if (pins[k] && (pins[k].islander || pins[k].id) === who) pin = pins[k];
  var theirs = [];
  for (var c = 0; c < cards.length; c++) if (cards[c].islander === who) theirs.push(cards[c]);
  if (!theirs.length) continue;
  if (pin && pin.isOpen && pin.requestId) for (var c2 = 0; c2 < theirs.length; c2++) if (theirs[c2].id === pin.requestId) { at = theirs[c2]; open = true; }
  if (!at) for (var c3 = 0; c3 < theirs.length && !at; c3++) if (done.indexOf(theirs[c3].id) === -1) at = theirs[c3];
  if (!at) at = theirs[theirs.length - 1];
  // P106 IG-005: she stands below her plot's left side (its third tile, so her bubble — drawn mostly to her right — is not
  // cut by the island's left edge), and her bubble lies over her own open plot, where nobody works: never under a robot
  // at work on the next plot (the 390 look drive: Sami's bubble under Cobble, who works the stones beside it).
  var door = { x: at.x + 2, y: at.y + PH };
  at.door = door;
  var atReq = null;
  for (var r2 = 0; r2 < list.length; r2++) if (list[r2].id === at.id) atReq = list[r2];
  deco.push({ kind: 'islander', who: who, x: door.x, y: door.y, sayKey: open && atReq && atReq.copyKeys ? String(atReq.copyKeys.title || '') : '', requestId: at.id });
}
// Her robots not at work are at home, side by side on the home path.
// P106 IG-005: the robots at home stand apart on the home slot (its path, then its grass), so their names never cover one
// another on a phone's 16 px tiles (a robot is drawn 56 px at least): Pip on the path, the others 3–5 tiles away.
var HOME_SPOTS = [[0, 0], [3, 2], [5, 0], [-1, 2]];
// P108 IW-008 (lane C): a crew of up to CREW_CAP at home — eight more spots round the home slot, three tiles or more from
// one another where the island allows (a name pill is about three tiles wide at 1368): the path above it, the path on its
// left, the shore below it. Never the house, the pond, a tree, a rock, or another plot.
HOME_SPOTS.push([-2, -3], [1, -3], [4, -3], [7, -3], [-3, 0], [-3, 3], [2, 4], [5, 4]);
var home = [], homeN = 0;
for (var m = 0; m < mine.length; m++) {
  if (!mine[m] || busy[mine[m].id]) continue;
  // IG-005: each in its own look (Draw world draws a robot's look over the page's).
  var spot = HOME_SPOTS[homeN] || [homeN, 0];
  var hr = { id: String(mine[m].id), x: HOME.x + spot[0], y: HOME.y + spot[1], d: 2, carry: [], can: null, home: true };
  if (mine[m].name || mine[m].kind) hr.look = islLook(mine[m]);
  home.push(hr);
  homeN++;
}
// P108 IW-006 (lane H): a shop helper riding on a job plot (the save's live.helper) goes on riding on the island built from it.
for (var hp = 0; hp < plots.length; hp++) { var hsv = saved[plots[hp].id]; if (plots[hp].job && live[plots[hp].id] && hsv && hsv.live && typeof hsv.live.helper === 'string' && hsv.live.helper) live[plots[hp].id].helper = hsv.live.helper; }
// The build's name: what it was built from. A tick handed a state from an OLDER build (its Set Variable landed after
// the rebuild's) starts again from this one — so a robot brought home never walks back to its plot.
// P108 IW-006 (lane E): the saved plots WITHOUT their live jobs — a lap's end writes one; the build must not move with it.
var build = islHash(JSON.stringify([iw6Unlive(saved), done, band, mine, pins.map(function (x) { return x ? [x.id, x.requestId, x.isOpen] : null; }), list.map(function (r) { return [r.id, r.plot, r.band]; })]));
// P108 IW-007 (lane B): and which buildings stand on her land and where, which animals — never have or fed (a drop is kept, not rebuilt).
var landKey = iw7bLandKey(Inputs.land);
if (landKey) build = islHash(build + '|' + JSON.stringify(landKey));
var state = { v: 1, build: build, w: W, h: H, map: rows.map(function (r) { return r.join(''); }), plots: plots, still: still, deco: deco, home: home, live: live, tick: 0 };
// P108 IW-003 (lane M, IW-002 AC3): the Island page opened again on the SAME island (nothing she saved changed: the same
// build) goes on from the island it left — each plot's live state as the last tick left it (meters, robots, laps, the
// wear's age) — never from a fresh build. Kept is the state held (quiet: it never makes the island build again).
var kept = Inputs.kept && typeof Inputs.kept === 'object' && !Array.isArray(Inputs.kept) ? Inputs.kept : null;
if (kept && kept.build === build && kept.live && typeof kept.live === 'object') { state.live = kept.live; state.tick = Number(kept.tick) || 0; }
// Find my robots: the rectangle around every plot with a robot at work and the robots at home.
var fx0 = 1e9, fy0 = 1e9, fx1 = -1, fy1 = -1;
for (var f = 0; f < plots.length; f++) if (plots[f].status === 'working') { fx0 = Math.min(fx0, plots[f].x); fy0 = Math.min(fy0, plots[f].y); fx1 = Math.max(fx1, plots[f].x + PW); fy1 = Math.max(fy1, plots[f].y + PH); }
for (var g = 0; g < home.length; g++) { fx0 = Math.min(fx0, home[g].x - 2); fy0 = Math.min(fy0, home[g].y - 2); fx1 = Math.max(fx1, home[g].x + 3); fy1 = Math.max(fy1, home[g].y + 3); }
Outputs.state = state;
Outputs.world = islWorld(state);
Outputs.cards = cards;
Outputs.focus = fx1 < 0 ? { x: 0, y: 0, w: W, h: H } : { x: Math.max(0, fx0), y: Math.max(0, fy0), w: Math.min(W, fx1) - Math.max(0, fx0), h: Math.min(H, fy1) - Math.max(0, fy0) };
Outputs.working = Object.keys(live).length;
Outputs.found = W > 0;
`;

/**
 * `Logic/Island tick` — one tick: every pinned run stepped in turn; the state and the composed world, fresh each tick.
 * `Inputs.state` is the state held (the Variable); `Inputs.built` the island's latest build — a held state from another
 * build is dropped for it (s3 drive: a tick's write landed after a rebuild's and a robot brought home walked back).
 */
export const ISLAND_TICK_SCRIPT = `${ISLAND_ENGINE}
// The state held by name, unless it is from an older build than the island's latest (a tick's write that landed after
// a rebuild's): then the latest build is where the island goes on from.
var held = Inputs.state && typeof Inputs.state === 'object' ? Inputs.state : null;
var built = Inputs.built && typeof Inputs.built === 'object' && Array.isArray(Inputs.built.plots) ? Inputs.built : null;
var next = islTick(built && (!held || held.build !== built.build) ? built : held);
if (next) {
  Outputs.state = next;
  Outputs.world = islWorld(next);
  Outputs.ticks = next.tick;
}
Outputs.ok = !!next;
`;

/** `Logic/Plot at` — which plot a tapped tile is on; the islander standing by her plot counts as that plot. */
export const PLOT_AT_SCRIPT = `
var cards = Array.isArray(Inputs.cards) ? Inputs.cards : [];
var x = Math.floor(Number(Inputs.x)), y = Math.floor(Number(Inputs.y));
var id = '';
for (var i = 0; i < cards.length && !id; i++) {
  var c = cards[i];
  if (!c) continue;
  if (x >= c.x && x < c.x + c.w && y >= c.y && y < c.y + c.h) id = String(c.id);
  else if (c.door && c.door.x === x && c.door.y === y) id = String(c.id);
}
Outputs.requestId = id;
Outputs.found = !!id;
`;

/**
 * `Logic/Island choose` — the plot card for a plot (tapped on the island, or a request card the robot cannot take now):
 * who asks and what; a locked plot's one-line reason (the band, and the block it needs); where the robot is at work and
 * "bring {b} home"; whether the plot opens now. Free play always opens (the garden is never pinned).
 */
export const islandChooseScript = (o: { free: unknown; islanders: unknown; wordHelper: string; robots?: unknown; robotWords?: unknown }): string => `${o.wordHelper}${CREW_PICK}
var FREE = ${JSON.stringify(o.free)};
var ISLANDERS = ${JSON.stringify(o.islanders)};
var ROBOTS = ${JSON.stringify(o.robots ?? [])};
var ROBOT_WORDS = ${JSON.stringify(o.robotWords ?? { does: {} })};
var lang = langOf(Inputs.lang), name = nameOf(Inputs.botName);
var id = String(Inputs.requestId || '');
var cards = Array.isArray(Inputs.cards) ? Inputs.cards : [];
var reqs = Array.isArray(Inputs.requests) ? Inputs.requests : [];
var plots = Inputs.plots && typeof Inputs.plots === 'object' ? Inputs.plots : {};
var mine = Array.isArray(Inputs.robots) && Inputs.robots.length ? Inputs.robots : [{ id: 'r1' }];
var card = null, req = null;
for (var i = 0; i < cards.length; i++) if (cards[i] && cards[i].id === id) card = cards[i];
for (var j = 0; j < reqs.length; j++) if (reqs[j] && reqs[j].id === id) req = reqs[j];
if (!req && id === 'free') req = FREE;
// P108 IW-007 (lane B): her land's card — its title and line (the land's own words), any robot of hers may work it.
var isLandCard = !req && id === 'land';
if (isLandCard) req = { id: 'land', islander: '', band: 1, needs: '', copyKeys: { title: 'iw7bLandTitle', blurb: 'iw7bLandBlurb', line: 'iw7bLandLine', reward: '' } };
// P106 IG-005: the robot for this job — hers of the kind the request needs (free play: Pip) — and where IT is at work.
function kindOf(m) { return m && m.kind ? String(m.kind) : m && m.id && m.id !== 'r1' ? String(m.id) : 'pip'; }
var needs = req && req.id !== 'free' && req.needs ? String(req.needs) : 'pip';
// P108 IW-008 (lane C): with a crew, the robot at work HERE, else one of that kind at home, else the first (busy elsewhere).
var job = crewPick(mine, plots, id, needs);
// P108 IW-007 (lane B): on her land, the robot pinned there whatever its kind (else her Pip, as above).
// P108 IW-007 (s6): the one she chose on the card's robots (any kind), else the one at work or helping there.
if (isLandCard) job = iw7tLandPick(mine, plots, Inputs.landBot);
var spec = null;
for (var s = 0; s < ROBOTS.length; s++) if (ROBOTS[s].id === needs) spec = ROBOTS[s];
var jobName = job && job.name ? String(job.name) : job ? name : spec ? String(spec.defaultName[lang] || spec.defaultName.en) : name;
var w = wordMap(Inputs.words, lang, jobName);
var robotId = job ? String(job.id || 'r1') : '', workingAt = '';
if (robotId) for (var k in plots) if (plots[k] && plots[k].robotId === robotId && Array.isArray(plots[k].program) && plots[k].program.length) workingAt = k;
var workReq = null;
for (var m = 0; m < reqs.length; m++) if (reqs[m] && reqs[m].id === workingAt) workReq = reqs[m];
var status = card ? card.status : id === 'free' ? 'free' : '';
var isl = req ? ISLANDERS[req.islander] : null;
var who = isl ? (w[isl.nameKey] || '') : '';
var title = req ? (id === 'free' ? (w.sandH || '') : (w[req.copyKeys.title] || '')) : '';
var workTitle = workReq ? (w[workReq.copyKeys.title] || '') : '';
// P108 IW-007 (lane B): a robot at work on her land is at work on "Your land".
if (workingAt === 'land') workTitle = w.iw7bLandTitle || '';
var canOpen = false, showHome = false, line = '';
if (!req) line = '';
else if (status === 'locked' && card && card.lock === 'robot' && spec) {
  // IG-005 (AC5): the robot it needs, what that robot does, who lends it and after which request.
  var lender = spec.lentBy && ISLANDERS[spec.lentBy] ? w[ISLANDERS[spec.lentBy].nameKey] || '' : '';
  var after = null;
  for (var a = 0; a < reqs.length; a++) if (reqs[a] && reqs[a].id === spec.unlockedBy) after = reqs[a];
  line = fill(w.ig5Locked, { r: jobName, does: w[ROBOT_WORDS.does[spec.id]] || '', who: lender, q: after ? w[after.copyKeys.title] || '' : '' });
}
else if (status === 'locked') line = fill(w.ig4Locked, { who: who, trick: w[req.copyKeys.blurb] || '' });
else if (id === 'free') { canOpen = true; line = w.sandP || ''; }
// P108 IW-003 (lane B): the job changed under a pinned program — the robot waits at home until she teaches it again.
else if (workingAt && workingAt === id && card && card.stale) { canOpen = true; showHome = true; line = fill(w.iw3bTeachAgain, { b: jobName }); }
else if (workingAt && workingAt === id) { canOpen = true; showHome = true; line = w.ig4WorksHere || ''; }
// P108 IW-007 (lane B): on her land, a robot at work elsewhere is brought home from THAT plot's card (this card is for building).
else if (isLandCard && workingAt) { line = fill(w.iw7bLandBusy, { plot: workTitle }); }
// P108 IW-007 (s6): the robot chosen helps on her land — teach it again, or bring it home.
else if (isLandCard && job && String(job.helps || '') === 'land') { canOpen = true; showHome = true; line = w.iw7tHelpsHere || ''; }
else if (workingAt) { showHome = true; line = fill(w.ig4AtWork, { plot: workTitle }); }
else if (status === 'won') { canOpen = true; line = w.ig4Won || ''; }
else { canOpen = true; line = w[req.copyKeys.line] || title; }
Outputs.requestId = id;
Outputs.found = !!req;
Outputs.status = status;
Outputs.canOpen = canOpen;
Outputs.blocked = !!req && !canOpen;
Outputs.showHome = showHome;
Outputs.workingAt = workingAt;
Outputs.who = who || (id === 'free' ? (w.isFree || '') : '');
Outputs.title = title;
Outputs.line = line;
Outputs.faceClass = 'bg-face bg-sp-' + (isl ? isl.sprite : 'owl');
Outputs.homeText = w.ig4Home || '';
Outputs.openText = isLandCard ? w.iw7tTeach || '' : w.ig4Open || '';
Outputs.robotId = robotId;
Outputs.needs = needs;
Outputs.stale = !!(card && card.stale);
`;

/**
 * `Logic/Find robots` — the flat island's "find my robots": every robot on the island scrolled into view in the
 * island's own scroll box (a phone shows part of it) and ringed for a moment. The 3D island frames them itself (its
 * Focus). With `what` = `card` (a parameter), the plot card is scrolled into view instead (a request card tapped far
 * down a phone's list opens the plot card above it). Page glue: the ONE script here that touches the page, and only
 * the island's own elements.
 */
export const FIND_ROBOTS_SCRIPT = `
var found = 0;
if (typeof document !== 'undefined') {
  if (String(Inputs.what) === 'card') {
    var card = document.querySelector('.bg-plot-card');
    if (card && card.scrollIntoView) { card.scrollIntoView({ block: 'nearest' }); found = 1; }
  } else {
    var box = document.querySelector('.bg-isle-scroll');
    var bots = box ? box.querySelectorAll('.gd-bot') : [];
    found = bots.length;
    if (bots.length && bots[0].scrollIntoView) bots[0].scrollIntoView({ block: 'nearest', inline: 'center' });
    if (box) {
      box.classList.remove('bg-isle-found');
      void box.offsetWidth;
      box.classList.add('bg-isle-found');
    }
  }
}
Outputs.found = found;
`;

/**
 * The island's content gate (AC4): what is wrong with a set of plots on a base map, in words — each plot inside the
 * island, no two plots overlapping, every request's map one plot's size, the base the island's size, every `.` of the
 * base under exactly one plot and no plot on anything else (home keeps its own tiles). Empty when the island is sound.
 * The engine gate (cg002Engine.test.ts) runs it, and the generator runs that gate first: a bad plot fails at generate time.
 */
export function islandProblems(o: {
  requests: ReadonlyArray<{ id: string; plot?: { x: number; y: number }; map: ReadonlyArray<string> }>;
  freePlot: { x: number; y: number };
  homePlot: { x: number; y: number };
  base: ReadonlyArray<string>;
  w: number;
  h: number;
  plotW: number;
  plotH: number;
}): string[] {
  const out: string[] = [];
  if (o.base.length !== o.h || o.base.some((r) => r.length !== o.w)) out.push(`the base map is not ${o.w} × ${o.h}`);
  const rects: Array<{ id: string; x: number; y: number; stamped: boolean }> = [];
  for (const r of o.requests) {
    const p = r.plot;
    if (!p || !Number.isInteger(p.x) || !Number.isInteger(p.y)) {
      out.push(`${r.id} has no plot`);
      continue;
    }
    if (r.map.length !== o.plotH || r.map.some((row) => row.length !== o.plotW)) out.push(`${r.id}'s map is not ${o.plotW} × ${o.plotH}`);
    rects.push({ id: r.id, x: p.x, y: p.y, stamped: true });
  }
  rects.push({ id: 'free', x: o.freePlot.x, y: o.freePlot.y, stamped: true });
  rects.push({ id: 'home', x: o.homePlot.x, y: o.homePlot.y, stamped: false });
  for (const r of rects) if (r.x < 0 || r.y < 0 || r.x + o.plotW > o.w || r.y + o.plotH > o.h) out.push(`${r.id}'s plot (${r.x}, ${r.y}) is not inside the ${o.w} × ${o.h} island`);
  for (let i = 0; i < rects.length; i++)
    for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i];
      const b = rects[j];
      if (a.x < b.x + o.plotW && b.x < a.x + o.plotW && a.y < b.y + o.plotH && b.y < a.y + o.plotH) out.push(`${a.id} and ${b.id} overlap`);
    }
  const cover = new Map<string, string[]>();
  for (const r of rects.filter((x) => x.stamped))
    for (let y = r.y; y < r.y + o.plotH; y++)
      for (let x = r.x; x < r.x + o.plotW; x++) {
        const k = `${x},${y}`;
        cover.set(k, [...(cover.get(k) ?? []), r.id]);
        if ((o.base[y] ?? '').charAt(x) !== '.') out.push(`${r.id}'s plot covers ${k}, which the base keeps for itself`);
      }
  o.base.forEach((row, y) => row.split('').forEach((c, x) => {
    if (c === '.' && (cover.get(`${x},${y}`) ?? []).length !== 1) out.push(`the base's slot tile ${x},${y} is under ${(cover.get(`${x},${y}`) ?? []).length} plots`);
  }));
  return [...new Set(out)];
}
