/**
 * P108 IW-008 (lane C) — the crew: many robots of one kind, each named, each on its own plot doing its own job.
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * ## What is here
 *
 * | name | the question it answers |
 * |---|---|
 * | {@link CREW_CAN} | what each robot kind can place: the moves every robot has, the controls, its own blocks |
 * | {@link CREW_PICK} | which of her robots does THIS plot's job: the one at work there, else one of that kind free at home, else the first of that kind |
 * | {@link CREW_RULES} | the two crew rules on a profile: copy a program between two robots, and send a robot to a plot (or home) |
 * | {@link copyProgramScript} (`Logic/Copy program`) | My robots' "copy {r}'s program to …": done, or refused with the first block the target cannot do, or its brain too small |
 * | {@link assignRobotScript} (`Logic/Assign robot`) | the plot card's crew: a robot tapped works this plot (or helps the one at work here), or comes home |
 * | {@link crewChipsScript} (`Logic/Crew chips`) | the plot card's crew row: her robots of the kind the job needs, the ones here ringed |
 *
 * ## The model (save v5, two optional robot-row fields — brief §4.2 allowed one; `helps` is the deviation, named)
 *
 * - A robot pinned on a plot (`plots[id].robotId`, IG-004) runs THAT plot's program.
 * - A robot row's `program` is the program it carries while it is not pinned: copied onto it, or kept when it came home.
 * - A robot row's `helps` is the plot it works as the SECOND robot, beside the one pinned there, running its own program
 *   (IW-008 §2: "a plot may have a second robot"; AC3: reservation across the crew — two robots on one pen).
 * - Copying onto a robot at work gives its plot the copy (it runs it at once); onto a helper or a robot at home, its row.
 * - Sending a robot to a plot she has WON: with nobody there it works it — the plot's own program (the one that won it)
 *   when the plot kept one, else the program the robot carries; with a robot there it helps, with its own program (else
 *   a copy of the plot's). A robot tapped where it already works comes home, keeping the program it ran.
 *
 * 🔴 No backtick and no dollar-brace inside any script text (README §7): these are template literals.
 *
 * @module noodl-mcp/tests/iw008Crew
 */
import { SAVE_HELPERS } from './cg002Scripts';
import { ROBOTS, ROBOT_CONTROLS, ROBOT_MOVES } from './cg002Content';

/** What each robot kind can place (every block type a program may hold): the moves, the controls, its own blocks. */
export const CREW_CAN: Readonly<Record<string, ReadonlyArray<string>>> = Object.fromEntries(ROBOTS.map((r) => [r.id, [...ROBOT_MOVES, ...ROBOT_CONTROLS, ...r.palette]]));

/**
 * The robot of hers for a plot's job, on the page's robot rows (Read family's, or bare `{ id }` rows): the one pinned
 * on that plot; else the first of that kind at home (pinned nowhere, helping nowhere); else the first of that kind
 * (busy elsewhere — the card says where); null when she has none of that kind.
 */
export const CREW_PICK = `
function crewKindOf(m) { return m && m.kind ? String(m.kind) : m && m.id && m.id !== 'r1' ? String(m.id) : 'pip'; }
function crewWorkOf(m, plots) { var ps = plots && typeof plots === 'object' ? plots : {}; for (var k in ps) if (m && ps[k] && ps[k].robotId === m.id && Array.isArray(ps[k].program) && ps[k].program.length) return k; return ''; }
function crewPick(mine, plots, id, kind) {
  var here = null, free = null, any = null, list = Array.isArray(mine) ? mine : [];
  for (var i = 0; i < list.length; i++) {
    var m = list[i];
    if (!m || crewKindOf(m) !== kind) continue;
    if (!any) any = m;
    var at = crewWorkOf(m, plots);
    if (at && at === id && !here) here = m;
    else if (!at && !m.helps && !free) free = m;
  }
  return here || free || any;
}
`;

/**
 * The crew's rules on a profile (SAVE_HELPERS before it): what a robot can place, a program checked against a robot,
 * copy, and send to a plot. Every one mutates only the profile it is handed and returns what happened.
 */
export const CREW_RULES = `
var CREW_CAN = ${JSON.stringify(CREW_CAN)};
function crewRowOf(p, id) { var l = p && p.island ? p.island.robots : []; for (var i = 0; i < l.length; i++) if (l[i].id === String(id)) return l[i]; return null; }
/** A block's id as the kinds' lists name it: an ask of a rung is that rung's olive block. */
function crewBlockId(b) { var t = String(b.t || ''); if (t === 'ask') { var rg = b.slots && b.slots.rung ? String(b.slots.rung) : ''; return rg ? 'olive:' + rg : 'ask'; } return t; }
/** The program a robot runs or carries: its plot's when it is pinned, else its row's; null when it knows none. */
function crewProgramOf(p, id) {
  var at = plotOfRobot(p.island, String(id));
  if (at) return p.island.plots[at].program;
  var r = crewRowOf(p, id);
  return r && Array.isArray(r.program) && r.program.length ? r.program : null;
}
/** A program against a robot: the first block (in reading order) its kind cannot place, else too many for its brain. */
function crewCheck(program, kind, brain) {
  var can = CREW_CAN[kind] || CREW_CAN.pip, first = '';
  function walk(l) {
    for (var i = 0; i < l.length && !first; i++) {
      var b = l[i];
      if (!b || typeof b !== 'object') continue;
      var t = crewBlockId(b);
      if (can.indexOf(t) === -1) { first = t; return; }
      if (Array.isArray(b.body)) walk(b.body);
      if (Array.isArray(b['else'])) walk(b['else']);
    }
  }
  walk(Array.isArray(program) ? program : []);
  var n = crewBlocks(program);
  if (first) return { ok: false, error: 'block', block: first, n: n, brain: brain };
  if (n > brain) return { ok: false, error: 'brain', block: '', n: n, brain: brain };
  return { ok: true, error: '', block: '', n: n, brain: brain };
}
/** Copy the program one robot runs or carries onto another: its plot's (at work), else its row's. */
function crewCopy(p, fromId, toId) {
  var from = crewRowOf(p, fromId), to = crewRowOf(p, toId);
  var out = { ok: false, error: '', block: '', n: 0, brain: 0, from: from ? robotRow(p, from).name : '', to: to ? robotRow(p, to).name : '' };
  if (!from || !to) { out.error = 'robot'; return out; }
  if (from.id === to.id) { out.error = 'same'; return out; }
  var prog = crewProgramOf(p, from.id);
  if (!prog || !prog.length) { out.error = 'none'; return out; }
  var tr = robotRow(p, to), chk = crewCheck(prog, tr.kind, tr.brain);
  out.n = chk.n; out.brain = chk.brain; out.block = chk.block;
  if (!chk.ok) { out.error = chk.error; return out; }
  var at = plotOfRobot(p.island, to.id);
  if (at) p.island.plots[at].program = JSON.parse(JSON.stringify(prog));
  else to.program = JSON.parse(JSON.stringify(prog));
  out.ok = true;
  return out;
}
/**
 * Send a robot to a plot she has won (or home, when it already works there). 'req' is the request (its needs, band);
 * 'band' hers. Returns '{ ok, error, role, block, n, brain, mate }': role 'works' | 'helps' | 'home'; error 'robot' |
 * 'plot' | 'kind' | 'locked' | 'open' (not won yet) | 'full' (two robots there) | 'teach' (no program to run) | 'block' |
 * 'brain'; mate = the robot already at work there (for 'helps').
 */
function crewAssign(p, robotId, req, band, now) {
  var out = { ok: false, error: '', role: '', block: '', n: 0, brain: 0, mate: '' };
  var row = crewRowOf(p, robotId);
  if (!row) { out.error = 'robot'; return out; }
  if (!req || !req.id || req.id === 'free') { out.error = 'plot'; return out; }
  var kind = req.needs ? String(req.needs) : 'pip';
  if (robotKindOf(row) !== kind) { out.error = 'kind'; return out; }
  if (Number(req.band) > (Number(band) === 1 ? 1 : 2)) { out.error = 'locked'; return out; }
  if (p.island.done.indexOf(req.id) === -1) { out.error = 'open'; return out; }
  var plots = p.island.plots, q = plots[req.id] || null, at = plotOfRobot(p.island, row.id);
  var primary = q && q.robotId && Array.isArray(q.program) && q.program.length ? q.robotId : '';
  // Tapped where it already works: home, with the program it ran (the plot keeps its win and its live job).
  if (at === req.id || row.helps === req.id) {
    if (at === req.id) { row.program = JSON.parse(JSON.stringify(q.program)); q.program = null; q.robotId = ''; }
    delete row.helps;
    out.ok = true; out.role = 'home';
    return out;
  }
  var helper = !!primary;
  var prog = null;
  if (helper) {
    for (var h = 0; h < p.island.robots.length; h++) if (p.island.robots[h].helps === req.id && p.island.robots[h].id !== row.id) { out.error = 'full'; return out; }
    prog = crewProgramOf(p, row.id) || q.program;
    out.mate = primary;
  } else prog = (q && Array.isArray(q.program) && q.program.length ? q.program : null) || crewProgramOf(p, row.id);
  if (!prog || !prog.length) { out.error = 'teach'; return out; }
  var chk = crewCheck(prog, kind, robotRow(p, row).brain);
  out.n = chk.n; out.brain = chk.brain; out.block = chk.block;
  if (!chk.ok) { out.error = chk.error; return out; }
  prog = JSON.parse(JSON.stringify(prog));
  // It leaves wherever it was: a plot it worked keeps its program for the next robot (as a win elsewhere leaves it).
  if (at) { row.program = JSON.parse(JSON.stringify(plots[at].program)); plots[at].robotId = ''; }
  delete row.helps;
  if (helper) { row.program = prog; row.helps = req.id; out.role = 'helps'; }
  else {
    var next = { program: prog, robotId: row.id, wonAt: q && q.wonAt ? q.wonAt : Number(now) > 0 ? Number(now) : Date.now() };
    if (q && q.live) next.live = q.live;
    plots[req.id] = next;
    out.role = 'works';
  }
  out.ok = true;
  return out;
}
`;

/** Block words: `go_nearest` → `bGoNearest` (band 7–9: the short `c…` form), an Olive block by its rung's word. */
const BLOCK_WORD = `
function crewBlockWord(t, w, band) {
  if (String(t).indexOf('olive:') === 0) return w[OLIVE_WORD[t]] || String(t);
  var k = String(t).split('_').map(function (x) { return x.charAt(0).toUpperCase() + x.slice(1); }).join('');
  return (band === 1 && w['c' + k]) || w['b' + k] || String(t);
}
`;

/**
 * `Logic/Copy program` (go) — My robots' "copy {r}'s program to …": the program robot From runs or carries, onto robot
 * To (a card's chip id: the robot after its last '|'). Answers the family (Model), Ok, Error, and Told: the card it is
 * said on (the target's, or the source's when it had nothing to copy) and the line — done, or the first block it cannot do, or its brain too small, or no program to copy.
 */
export const copyProgramScript = (o: { wordHelper: string; oliveWords: Record<string, string> }): string => `${SAVE_HELPERS}${o.wordHelper}${CREW_RULES}
var OLIVE_WORD = ${JSON.stringify(o.oliveWords)};
${BLOCK_WORD}
var model = modelOf(Inputs.model && typeof Inputs.model === 'object' ? Inputs.model : {});
var pid = String(Inputs.profileId || model.island.activeId);
var lang = langOf(Inputs.lang), band = Number(Inputs.band) === 1 ? 1 : 2;
var w = wordMap(Inputs.words, lang, 'Pip');
var fromId = String(Inputs.from || ''), toRaw = String(Inputs.to || ''), toId = toRaw.slice(toRaw.lastIndexOf('|') + 1);
var p = null;
for (var i = 0; i < model.profiles.length; i++) if (model.profiles[i].id === pid) p = model.profiles[i];
var res = p ? crewCopy(p, fromId, toId) : { ok: false, error: 'robot', block: '', n: 0, brain: 0, from: '', to: '' };
var vars = { r: res.to, f: res.from, blk: crewBlockWord(res.block, w, band), n: res.brain, k: res.n };
var line = res.ok ? fill(w.iw8cCopied, vars) : res.error === 'block' ? fill(w.iw8cNoBlock, vars) : res.error === 'brain' ? fill(w.iw8cNoBrain, vars) : res.error === 'none' ? fill(w.iw8cNoProgram, vars) : '';
Outputs.model = model;
Outputs.ok = res.ok;
Outputs.error = res.error;
Outputs.told = { robotId: res.ok || res.error === 'block' || res.error === 'brain' ? toId : fromId, text: line, ok: res.ok, n: Date.now() };
`;

/**
 * `Logic/Assign robot` (go) — the plot card's crew row: robot Robot Id (a chip id: the robot after its last '|') sent to
 * the plot Request Id — it works it, or helps the robot at work there, or (tapped where it already works) comes home.
 * Answers the family (Model), Ok, Error, Role and Told: the plot it is said on and the card's line.
 */
export const assignRobotScript = (o: { wordHelper: string; oliveWords: Record<string, string> }): string => `${SAVE_HELPERS}${o.wordHelper}${CREW_RULES}
var OLIVE_WORD = ${JSON.stringify(o.oliveWords)};
${BLOCK_WORD}
var model = modelOf(Inputs.model && typeof Inputs.model === 'object' ? Inputs.model : {});
var pid = String(Inputs.profileId || model.island.activeId);
var lang = langOf(Inputs.lang);
var w = wordMap(Inputs.words, lang, 'Pip');
var raw = String(Inputs.robotId || ''), rid = raw.slice(raw.lastIndexOf('|') + 1), reqId = String(Inputs.requestId || '');
var reqs = Array.isArray(Inputs.requests) ? Inputs.requests : [];
var req = null, p = null;
for (var i = 0; i < reqs.length; i++) if (reqs[i] && reqs[i].id === reqId) req = reqs[i];
for (var j = 0; j < model.profiles.length; j++) if (model.profiles[j].id === pid) p = model.profiles[j];
var res = p ? crewAssign(p, rid, req, p.band, Inputs.now) : { ok: false, error: 'robot', role: '', block: '', n: 0, brain: 0, mate: '' };
var me = p && crewRowOf(p, rid) ? robotRow(p, crewRowOf(p, rid)).name : '';
var mate = p && res.mate && crewRowOf(p, res.mate) ? robotRow(p, crewRowOf(p, res.mate)).name : '';
var vars = { r: me, m: mate, blk: crewBlockWord(res.block, w, p ? p.band : 2), n: res.brain, k: res.n };
var line = res.role === 'works' ? fill(w.iw8cSent, vars) : res.role === 'helps' ? fill(w.iw8cHelping, vars) : res.role === 'home' ? fill(w.iw8cGoneHome, vars)
  : res.error === 'teach' ? fill(w.iw8cTeach, vars) : res.error === 'full' ? fill(w.iw8cFull, vars) : res.error === 'block' ? fill(w.iw8cNoBlockHere, vars) : res.error === 'brain' ? fill(w.iw8cNoBrainHere, vars) : res.error ? fill(w.iw8cKind, vars) : '';
Outputs.model = model;
Outputs.ok = res.ok;
Outputs.error = res.error;
Outputs.role = res.role;
Outputs.told = { requestId: reqId, text: line, ok: res.ok, n: Date.now() };
`;

/**
 * `Logic/Crew chips` — the plot card's crew row (reactive): her robots of the kind this plot's job needs, one chip each
 * (the Robot/Chip pill: its name, ink when it works or helps HERE), shown only on a plot she has won and only when she
 * has two robots of that kind at least (one robot has nothing to choose: the card is IG-004's). Who is here, in words.
 */
export const crewChipsScript = (o: { wordHelper: string }): string => `${o.wordHelper}${CREW_PICK}
var lang = langOf(Inputs.lang);
var w = wordMap(Inputs.words, lang, 'Pip');
var id = String(Inputs.requestId || '');
var reqs = Array.isArray(Inputs.requests) ? Inputs.requests : [];
var cards = Array.isArray(Inputs.cards) ? Inputs.cards : [];
var plots = Inputs.plots && typeof Inputs.plots === 'object' ? Inputs.plots : {};
var mine = Array.isArray(Inputs.robots) ? Inputs.robots : [];
var req = null, card = null;
for (var i = 0; i < reqs.length; i++) if (reqs[i] && reqs[i].id === id) req = reqs[i];
for (var c = 0; c < cards.length; c++) if (cards[c] && cards[c].id === id) card = cards[c];
var kind = req && req.needs ? String(req.needs) : 'pip';
var rows = [], here = [];
for (var j = 0; j < mine.length; j++) {
  var m = mine[j];
  if (!m || crewKindOf(m) !== kind) continue;
  var works = crewWorkOf(m, plots) === id, helps = String(m.helps || '') === id;
  rows.push({ id: 'crew|' + String(m.id), label: String(m.name || m.id), selected: works || helps, locked: false });
  if (works) here.unshift(fill(w.iw8cWorks, { r: String(m.name || m.id) }));
  if (helps) here.push(fill(w.iw8cHelps, { r: String(m.name || m.id) }));
}
var show = !!req && !!card && (card.status === 'won' || card.status === 'working') && rows.length >= 2;
Outputs.rows = show ? rows : [];
Outputs.show = show;
Outputs.label = w.iw8cCrew || '';
Outputs.line = w.iw8cCrewTap || '';
Outputs.hereText = here.join(' · ');
// What the last tap said, on this plot's card only (another plot's card opened since says nothing).
var told = Inputs.told && typeof Inputs.told === 'object' ? Inputs.told : null;
Outputs.saidText = show && told && String(told.requestId || '') === id ? String(told.text || '') : '';
`;
