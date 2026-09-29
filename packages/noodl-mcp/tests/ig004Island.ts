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
/** A request's start in its plot's own coordinates: its things and its one robot — Start world's robot, field for field. */
function islStart(req, robotId) {
  var rs = req.robotStart || {};
  var robot = { id: String(robotId || 'me'), x: Number(rs.x) || 0, y: Number(rs.y) || 0, d: Number(rs.d) || 0, carry: Array.isArray(rs.carry) ? rs.carry.slice() : [] };
  if (rs.basket !== undefined) robot.basket = rs.basket;
  robot.can = rs.can === undefined || rs.can === null || rs.can === '' ? null : Math.max(0, Math.floor(Number(rs.can)) || 0);
  robot.canMax = Number(rs.canMax) > 0 ? Math.floor(Number(rs.canMax)) : CAN_MAX;
  return { things: islClone(req.things || []), robot: robot, spent: [] };
}
/** The plot's window of the island as the engine's world: the request's map, what stands on the plot, its robot. */
function islView(plot, live) {
  var w = { map: plot.map.slice(), things: live.things, robots: [live.robot], events: [], schedule: islClone(plot.schedule || []) };
  if (live.spent && live.spent.length) w.spent = live.spent.slice();
  return w;
}
function islRun(plot, lap) { return newRun(plot.program, plot.robotId, 'en', 'island-' + plot.id + '-' + lap); }
/** One tick of one pinned plot. A finished run holds the plot done, then the plot resets and the run restarts. */
function islStepPlot(plot, cur) {
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
var rows = [];
for (var b = 0; b < BASE.length; b++) rows.push(String(BASE[b]).split(''));
var H = rows.length, W = H ? rows[0].length : 0;
var list = [];
for (var i = 0; i < reqs.length; i++) if (reqs[i] && reqs[i].plot && isFinite(Number(reqs[i].plot.x))) list.push(reqs[i]);
var freeReq = islClone(FREE); freeReq.plot = FREE_PLOT;
list.push(freeReq);
var plots = [], still = [], deco = [], live = {}, cards = [], busy = {};
function hasRobot(id) { for (var q = 0; q < mine.length; q++) if (mine[q] && mine[q].id === id) return true; return false; }
function wonThings(req) {
  var st = islStart(req, 'me');
  var end = runToEnd(req.referenceProgram || [], { map: req.map.slice(), things: st.things, robots: [st.robot], events: [], schedule: islClone(req.schedule || []) }, 'me', 'en');
  return end.world.things;
}
for (var p = 0; p < list.length; p++) {
  var req = list[p], px = Math.floor(Number(req.plot.x)), py = Math.floor(Number(req.plot.y));
  var map = Array.isArray(req.map) ? req.map : [];
  for (var y = 0; y < map.length; y++) for (var x = 0; x < String(map[y]).length; x++) if (rows[py + y] && py + y < H && px + x < W) rows[py + y][px + x] = String(map[y]).charAt(x);
  var sv = saved[req.id], isFree = req.id === 'free';
  var status = isFree ? 'free' : Number(req.band) > band ? 'locked' : (sv && Array.isArray(sv.program) && sv.program.length && sv.robotId && hasRobot(sv.robotId) && !busy[sv.robotId]) ? 'working' : done.indexOf(req.id) !== -1 ? 'won' : 'open';
  var robotId = status === 'working' ? String(sv.robotId) : '';
  if (robotId) busy[robotId] = req.id;
  var start = islStart(req, robotId || 'me');
  var plot = { id: req.id, x: px, y: py, w: PW, h: PH, map: map.slice(), schedule: islClone(req.schedule || []), status: status, islander: String(req.islander || ''), band: Number(req.band) || 1, robotId: robotId, program: robotId ? islClone(sv.program) : null, start: start };
  plots.push(plot);
  cards.push({ id: req.id, x: px, y: py, w: PW, h: PH, status: status, islander: plot.islander, band: plot.band, robotId: robotId, door: null });
  if (status === 'working') { live[req.id] = { run: islRun(plot, 0), things: islClone(start.things), robot: islClone(start.robot), spent: [], hold: 0, lap: 0 }; continue; }
  var shown = status === 'won' ? wonThings(req) : start.things;
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
  var door = { x: at.x + PW - 1, y: at.y + PH };
  at.door = door;
  var atReq = null;
  for (var r2 = 0; r2 < list.length; r2++) if (list[r2].id === at.id) atReq = list[r2];
  deco.push({ kind: 'islander', who: who, x: door.x, y: door.y, sayKey: open && atReq && atReq.copyKeys ? String(atReq.copyKeys.title || '') : '', requestId: at.id });
}
// Her robots not at work are at home, side by side on the home path.
var home = [], homeN = 0;
for (var m = 0; m < mine.length; m++) {
  if (!mine[m] || busy[mine[m].id]) continue;
  home.push({ id: String(mine[m].id), x: HOME.x + homeN, y: HOME.y, d: 2, carry: [], can: null, home: true });
  homeN++;
}
var state = { v: 1, w: W, h: H, map: rows.map(function (r) { return r.join(''); }), plots: plots, still: still, deco: deco, home: home, live: live, tick: 0 };
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

/** `Logic/Island tick` — one tick: every pinned run stepped in turn; the state and the composed world, fresh each tick. */
export const ISLAND_TICK_SCRIPT = `${ISLAND_ENGINE}
var next = islTick(Inputs.state);
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
export const islandChooseScript = (o: { free: unknown; islanders: unknown; wordHelper: string }): string => `${o.wordHelper}
var FREE = ${JSON.stringify(o.free)};
var ISLANDERS = ${JSON.stringify(o.islanders)};
var lang = langOf(Inputs.lang), name = nameOf(Inputs.botName);
var w = wordMap(Inputs.words, lang, name);
var id = String(Inputs.requestId || '');
var cards = Array.isArray(Inputs.cards) ? Inputs.cards : [];
var reqs = Array.isArray(Inputs.requests) ? Inputs.requests : [];
var plots = Inputs.plots && typeof Inputs.plots === 'object' ? Inputs.plots : {};
var mine = Array.isArray(Inputs.robots) && Inputs.robots.length ? Inputs.robots : [{ id: 'r1' }];
var card = null, req = null;
for (var i = 0; i < cards.length; i++) if (cards[i] && cards[i].id === id) card = cards[i];
for (var j = 0; j < reqs.length; j++) if (reqs[j] && reqs[j].id === id) req = reqs[j];
if (!req && id === 'free') req = FREE;
// Where her robot is at work (v4: her one robot; IG-005 picks the robot for the job).
var robotId = String(mine[0].id || 'r1'), workingAt = '';
for (var k in plots) if (plots[k] && plots[k].robotId === robotId && Array.isArray(plots[k].program) && plots[k].program.length) workingAt = k;
var workReq = null;
for (var m = 0; m < reqs.length; m++) if (reqs[m] && reqs[m].id === workingAt) workReq = reqs[m];
var status = card ? card.status : id === 'free' ? 'free' : '';
var isl = req ? ISLANDERS[req.islander] : null;
var who = isl ? (w[isl.nameKey] || '') : '';
var title = req ? (id === 'free' ? (w.sandH || '') : (w[req.copyKeys.title] || '')) : '';
var workTitle = workReq ? (w[workReq.copyKeys.title] || '') : '';
var canOpen = false, showHome = false, line = '';
if (!req) line = '';
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
`;

/**
 * `Logic/Find robots` — the flat island's "find my robots": every robot on the island scrolled into view in the
 * island's own scroll box (a phone shows part of it) and ringed for a moment. The 3D island frames them itself (its
 * Focus). Page glue: the ONE script here that touches the page, and only its own island.
 */
export const FIND_ROBOTS_SCRIPT = `
var found = 0;
if (typeof document !== 'undefined') {
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
