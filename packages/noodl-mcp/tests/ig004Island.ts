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
  if (live.spent && live.spent.length) w.spent = live.spent.slice();
  // P108 IW-002: a job plot carries its job and its seed (the wear's draws go on from it).
  if (plot.job) { w.job = islClone(plot.job); w.seed = Number(live.seed) >>> 0; }
  return w;
}
function islRun(plot, lap) { return newRun(plot.program, plot.robotId, 'en', 'island-' + plot.id + '-' + lap); }
/** P108 IW-002: a plot's seed, from its request's name (djb2): the island lays a plot the same way every build. */
function islSeedOf(id) { var h = 5381, t = String(id); for (var i = 0; i < t.length; i++) h = ((h * 33) ^ t.charCodeAt(i)) >>> 0; return h; }
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
  if (phase === 'wait' && !jobDone(w)) { lap++; run = islRun(plot, lap); phase = 'work'; }
  if (phase !== 'wait') {
    var r = step(run, w, null);
    if (r.waiting && r.request) r = step(r.run, w, { seq: r.request.seq, ok: false, fallback: true });
    w = apply(w, r.delta);
    run = r.run; delta = r.delta;
    if (r.done) {
      if (jobDone(w)) phase = 'wait';
      else if (phase === 'return') { lap++; run = islRun(plot, lap); phase = 'work'; }
      else { phase = 'return'; run = islHomeRun(plot, lap); }
    }
  }
  return { run: run, things: w.things, robot: w.robots[0], spent: Array.isArray(w.spent) ? w.spent : [], hold: 0, lap: lap, phase: phase, age: age, seed: Number(w.seed) >>> 0, worn: worn, delta: delta };
}
/** One tick of one pinned plot. A finished run holds the plot done, then the plot resets and the run restarts. */
function islStepPlot(plot, cur) {
  if (plot.job) return islStepJob(plot, cur);
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
  return { run: r.run, things: w.things, robot: w.robots[0], spent: Array.isArray(w.spent) ? w.spent : [], hold: r.done ? ISLAND_HOLD : 0, lap: cur.lap };
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
  }
  for (var d = 0; d < s.deco.length; d++) things.push(islClone(s.deco[d]));
  for (var h = 0; h < s.home.length; h++) robots.push(islClone(s.home[h]));
  return { map: s.map, things: things, robots: robots, events: [], schedule: [] };
}
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
export const islandWorldScript = (o: { free: unknown; base: ReadonlyArray<string>; home: { x: number; y: number }; freePlot: { x: number; y: number }; plotW: number; plotH: number }): string => `${ISLAND_ENGINE}
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
  // IG-005: a plot is also locked while she has no robot of the kind it needs (the lock line names who lends it).
  var needs = isFree ? '' : String(req.needs || 'pip');
  var lock = isFree ? '' : Number(req.band) > band ? 'band' : !ownsKind(needs) ? 'robot' : '';
  var status = isFree ? 'free' : lock ? 'locked' : (sv && Array.isArray(sv.program) && sv.program.length && sv.robotId && hasRobot(sv.robotId) && !busy[sv.robotId]) ? 'working' : done.indexOf(req.id) !== -1 ? 'won' : 'open';
  var robotId = status === 'working' ? String(sv.robotId) : '';
  if (robotId) busy[robotId] = req.id;
  var start = islStart(req, robotId || 'me', robotId ? rowOf(robotId) : null);
  if (laid) start.things = islClone(laid.things);
  var plot = { id: req.id, x: px, y: py, w: PW, h: PH, map: map.slice(), schedule: islClone(req.schedule || []), status: status, islander: String(req.islander || ''), band: Number(req.band) || 1, robotId: robotId, program: robotId ? islClone(sv.program) : null, start: start };
  // P108 IW-002: a job plot's job (its targets by id) and its seed; its tick is the job tick (islStepJob), never a reset.
  if (laid && laid.job) { plot.job = laid.job; plot.seed = Number(laid.seed) >>> 0; }
  plots.push(plot);
  cards.push({ id: req.id, x: px, y: py, w: PW, h: PH, status: status, islander: plot.islander, band: plot.band, robotId: robotId, door: null, needs: needs, lock: lock });
  if (status === 'working') { live[req.id] = { run: islRun(plot, 0), things: islClone(start.things), robot: islClone(start.robot), spent: [], hold: 0, lap: 0 }; if (plot.job) { live[req.id].phase = 'work'; live[req.id].age = 0; live[req.id].seed = plot.seed; } continue; }
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
// The build's name: what it was built from. A tick handed a state from an OLDER build (its Set Variable landed after
// the rebuild's) starts again from this one — so a robot brought home never walks back to its plot.
var build = islHash(JSON.stringify([saved, done, band, mine, pins.map(function (x) { return x ? [x.id, x.requestId, x.isOpen] : null; }), list.map(function (r) { return [r.id, r.plot, r.band]; })]));
var state = { v: 1, build: build, w: W, h: H, map: rows.map(function (r) { return r.join(''); }), plots: plots, still: still, deco: deco, home: home, live: live, tick: 0 };
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
export const islandChooseScript = (o: { free: unknown; islanders: unknown; wordHelper: string; robots?: unknown; robotWords?: unknown }): string => `${o.wordHelper}
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
// P106 IG-005: the robot for this job — hers of the kind the request needs (free play: Pip) — and where IT is at work.
function kindOf(m) { return m && m.kind ? String(m.kind) : m && m.id && m.id !== 'r1' ? String(m.id) : 'pip'; }
var needs = req && req.id !== 'free' && req.needs ? String(req.needs) : 'pip';
var job = null;
for (var q = 0; q < mine.length && !job; q++) if (kindOf(mine[q]) === needs) job = mine[q];
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
else if (workingAt && workingAt === id) { canOpen = true; showHome = true; line = w.ig4WorksHere || ''; }
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
Outputs.openText = w.ig4Open || '';
Outputs.robotId = robotId;
Outputs.needs = needs;
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
