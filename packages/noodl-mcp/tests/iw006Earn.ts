/**
 * P108 IW-006 (session 4, lane E) — shells earned by jobs (D2, D3), the "+N 🐚" a child sees after the meter fills, and
 * the island's live job kept in the save across an app restart.
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * ## The earning rule (one function: `iw6Pay`)
 *
 * A run pays **1 shell per target step it filled** — the sum over the job's targets of each meter's net rise (a tulip's
 * drinks, a square's stones, the basket's eggs, a door's letters) — at most {@link SHELLS_RUN_CAP} a run; and, when the job
 * crosses its finish line, the islander's **bonus** ({@link JOB_BONUS}): whole for a whole job, its share for a part of one
 * (an island lap that filled 1 of 9 steps gets a ninth of it, rounded; a win in the Workshop always the whole). Nothing
 * for time played; no streaks (D2). The wallet's
 * `earned` rises only through `earnShells` (SAVE_HELPERS), and `spent` is never touched here (D4).
 *
 * - **On the island** (D3; only while the Island page ticks, R2) a pinned robot's lap is a run: `islStepJob` counts the
 *   robot's own fill (never the wear's) into the lap's gain; the program run to its end pays it. P108 s7: a robot that
 *   HELPS on the plot (`islWithMate`) earns the same way from its own fill (`matePaid`, its own "+N 🐚" line). A done job waits at home;
 *   wear reopens it and the robot goes back and earns again. `Logic/Island keep` writes the plot's live job and the
 *   shells into HER profile (one island per kid, ruling 8 — the island ticking is the active profile's) at the moments
 *   that matter: a lap's end (the finish line is one) and wear reopening a job — never every tick.
 * - **In the Workshop** the world starts fresh every run, so a replay would pay forever: `Logic/Win pay` pays a win only
 *   for a job that is not done-and-unworn on her island — the first win (its whole lack from the island's start), or a
 *   win while its plot has worn (what the plot lacks) — and the plot then starts done (`jobLive`, written by Complete
 *   request). A plot done and never worn (won, or its robot brought home) pays nothing more (AC1).
 *
 * ## The live job in the save
 *
 * The island's build name (`islandWorldScript`'s `build`) is taken over the saved plots WITHOUT their `live` (`iw6Unlive`):
 * the island writes `live` at every lap's end, and a build name that moved with it would rebuild the island and drop the
 * state it keeps. A build with no kept state (an app restart) starts each pinned job plot from its saved `live`
 * (`iw6Resume`): its things, its wear clock and seed; the robot at home, waiting when the job is done.
 *
 * 🔴 No backtick and no dollar-brace inside any script text (README §7): these are template literals.
 *
 * @module noodl-mcp/tests/iw006Earn
 */
import { JOB_BONUS, SHELLS_RUN_CAP } from './cg002Content';
import { SAVE_HELPERS } from './cg002Scripts';
// P108 IW-007 (lane B): the land's write (landKeep: a building never un-builds).
import { LAND_KEEP } from './iw007Building';

export { JOB_BONUS, SHELLS_RUN_CAP };

/**
 * The earning helpers, appended to ISLAND_ENGINE (ig004Island.ts): they read the engine's own `jobOf`, `thingById`,
 * `meterOf`, `jobDone` and the island's `islClone`, `islView`.
 */
export const EARN_ENGINE = `
// ── P108 IW-006 (lane E): earning — shells for the steps a run fills, the bonus at the finish line ──
var SHELLS_RUN_CAP = ${SHELLS_RUN_CAP};
var JOB_BONUS = ${JSON.stringify(JOB_BONUS)};
/** A job's meters by target id: what each target holds now. */
function iw6Meters(w) {
  var j = jobOf(w), out = {};
  if (!j) return out;
  for (var i = 0; i < j.targets.length; i++) { var t = thingById(w, j.targets[i]); out[String(j.targets[i])] = t ? meterOf(t).have : 0; }
  return out;
}
/** The steps a job has in all: every target's need (a container with no capacity counts none). */
function iw6Total(w) {
  var j = jobOf(w), n = 0;
  if (!j) return 0;
  for (var i = 0; i < j.targets.length; i++) { var m = meterOf(thingById(w, j.targets[i])); if (isFinite(m.need) && m.need > 0) n += m.need; }
  return n;
}
/** The steps a job lacks: every target up to its need. */
function iw6Lack(w) {
  var j = jobOf(w), n = 0;
  if (!j) return 0;
  for (var i = 0; i < j.targets.length; i++) { var m = meterOf(thingById(w, j.targets[i])); if (isFinite(m.need) && m.need > m.have) n += m.need - m.have; }
  return n;
}
/** A lap's gain with one tick's change added, target by target (its NET rise: an egg taken out and put back counts nothing). */
function iw6Gain(gain, m0, m1) {
  var out = {};
  for (var k in gain) out[k] = gain[k];
  for (var id in m1) { var d = (Number(m1[id]) || 0) - (Number(m0[id]) || 0); if (d) out[id] = (Number(out[id]) || 0) + d; }
  return out;
}
/** The steps a lap filled: the targets that rose, by how much. */
function iw6Steps(gain) { var n = 0; for (var k in gain) if (Number(gain[k]) > 0) n += Math.floor(Number(gain[k])); return n; }
/**
 * THE earning rule (D2): 1 shell per step filled, at most SHELLS_RUN_CAP a run; at the finish line the islander's bonus,
 * whole for a whole job and its share for a part of one (the steps filled over the job's steps, rounded). Nothing filled,
 * nothing paid.
 */
function iw6Pay(requestId, steps, total, done) {
  var n = Math.max(0, Math.floor(Number(steps)) || 0), all = Math.max(0, Math.floor(Number(total)) || 0);
  var b = Math.max(0, Math.floor(Number(JOB_BONUS[String(requestId)])) || 0);
  var work = Math.min(n, SHELLS_RUN_CAP);
  var bonus = done && n > 0 && all > 0 ? Math.floor((b * Math.min(n, all)) / all + 0.5) : 0;
  return { shells: work + bonus, steps: work, bonus: bonus };
}
/** The saved plots without their live jobs: the island's build name must not move when a lap's end writes one. */
function iw6Unlive(saved) {
  var out = {};
  for (var k in saved) {
    var p = saved[k];
    if (!p || typeof p !== 'object' || Array.isArray(p)) { out[k] = p; continue; }
    var q = {};
    for (var f in p) if (f !== 'live') q[f] = p[f];
    out[k] = q;
  }
  return out;
}
/**
 * A pinned job plot built with no island kept (an app restart) goes on from its saved live job: its things, its wear
 * clock and seed, what it used up (and a helper riding on it); the robot at home — waiting there when the job is done.
 */
function iw6Resume(cur, plot, lv) {
  if (!cur || !plot || !plot.job || !lv || typeof lv !== 'object' || !Array.isArray(lv.things)) return cur;
  cur.things = islClone(lv.things);
  cur.age = Math.max(0, Math.floor(Number(lv.age)) || 0);
  cur.seed = Number(lv.seed) >>> 0;
  cur.spent = Array.isArray(lv.spent) ? islClone(lv.spent) : [];
  if (typeof lv.helper === 'string' && lv.helper) cur.helper = lv.helper;
  if (cur.phase !== 'teach' && jobDone(worldOf(islView(plot, cur)))) cur.phase = 'wait';
  // P108 s7: a job done when the save was kept — the robot waits where it rests (her finished spa), not at its start.
  if (cur.phase === 'wait' && cur.robot) {
    var rw = worldOf(islView(plot, cur)), rest = restOf(rw, rw.robots[0]);
    if (rest) { cur.robot.x = Number(rest.x); cur.robot.y = Number(rest.y); cur.robot.d = Number(rest.d) || 0; }
  }
  return cur;
}
`;

/** Words, by key, in the language (the pages' WORD_HELPER's reading of the table, kept to what these scripts need). */
const EARN_WORDS = `
/**
 * A live job the save keeps has no robot in it (its row is only things, age, seed): a can in the robot's hand goes back
 * where the job lays it, its level kept — so the robot built at home after a restart picks it up as its program expects.
 */
function iw6CanBack(things, robot, laidThings) {
  var out = JSON.parse(JSON.stringify(Array.isArray(things) ? things : []));
  if (!robot || robot.holds !== 'can') return out;
  for (var i = 0; i < out.length; i++) if (out[i] && out[i].kind === 'can') return out;
  var at = null, list = Array.isArray(laidThings) ? laidThings : [];
  for (var j = 0; j < list.length && !at; j++) if (list[j] && list[j].kind === 'can') at = list[j];
  if (!at) return out;
  var can = JSON.parse(JSON.stringify(at));
  can.level = Math.max(0, Math.floor(Number(robot.can)) || 0);
  out.push(can);
  return out;
}
function iw6WordsOf(rows, lang) { var map = {}, list = Array.isArray(rows) ? rows : []; for (var i = 0; i < list.length; i++) if (list[i] && list[i].key) map[list[i].key] = String(list[i][lang] || list[i].en || ''); return map; }
function iw6Fill(text, vars) { var t = String(text || ''); for (var k in vars) t = t.split('{' + k + '}').join(String(vars[k])); return t; }
`;

/**
 * `Logic/Win pay` — what a win in the Workshop pays, BEFORE Complete request records it (it reads her island as it
 * stood): `pay` (shells), `jobLive` (the plot as a done job — the reference program's end on the island's own laying,
 * every target full — which Complete request writes as the plot's live job: the plot starts done), and the win card's
 * "+N 🐚" line (`text`, `has`). Inputs: `requestId`, `requests`, `plots` and `done` (Read family: HER island), `words`,
 * `lang`. Built over the island engine (cg003Scripts hands it ISLAND_ENGINE, which carries EARN_ENGINE).
 */
export const winPayScript = (islandEngine: string): string => `${islandEngine}
${EARN_WORDS}
var reqs = Array.isArray(Inputs.requests) ? Inputs.requests : [];
var saved = Inputs.plots && typeof Inputs.plots === 'object' ? Inputs.plots : {};
var doneList = Array.isArray(Inputs.done) ? Inputs.done : [];
var id = String(Inputs.requestId || '');
var req = null;
for (var i = 0; i < reqs.length; i++) if (reqs[i] && reqs[i].id === id) req = reqs[i];
var pay = { shells: 0, steps: 0, bonus: 0 }, jobLive = null;
// P108 IW-007 (lane B): a win on her land pays nothing here and never starts the land done — it pins the robot; the
// building rises on the island, a drop at a time (a land lap pays its steps there, D2, no bonus).
if (req && req.job && id !== 'free' && id !== 'land') {
  var laid = islLaidOf(req);
  if (laid) {
    // Her plot as her island has it: its live job when the island kept one; else the island's start when never won;
    // else (done, never worn: drawn won, or its robot brought home) nothing to pay.
    var sv = saved[id], now = null;
    if (sv && sv.live && Array.isArray(sv.live.things)) now = worldOf({ map: laid.map.slice(), things: islClone(sv.live.things), robots: [], job: islClone(laid.job), seed: laid.seed });
    else if (doneList.indexOf(id) === -1) now = laid;
    // A win crosses the finish line of the job she was asked to do: its whole bonus (the lack is its total here).
    if (now && !jobDone(now)) pay = iw6Pay(id, iw6Lack(now), iw6Lack(now), true);
    // The plot starts done: the reference program run to its end on the island's laying (as the island draws a won
    // plot), and any target it left short filled — a done job the island's robot waits beside until wear reopens it.
    var bot = islStart(req, 'me').robot;
    var wv = { map: laid.map.slice(), things: islClone(laid.things), robots: [bot], events: [], schedule: islClone(req.schedule || []), job: islClone(laid.job), seed: laid.seed };
    var end = runToEnd(Array.isArray(req.referenceProgram) ? req.referenceProgram : [], wv, bot.id, 'en').world;
    var jb = jobOf(end);
    if (jb) for (var t = 0; t < jb.targets.length; t++) { var tg = thingById(end, jb.targets[t]); if (tg && !isFull(tg)) setMeter(tg, meterOf(tg).need); }
    jobLive = { things: iw6CanBack(end.things, end.robots[0], laid.things), age: 0, seed: Number(end.seed) >>> 0 };
    if (Array.isArray(end.spent) && end.spent.length) jobLive.spent = end.spent;
  }
}
var w = iw6WordsOf(Inputs.words, String(Inputs.lang) === 'fr' ? 'fr' : 'en');
Outputs.pay = pay.shells;
Outputs.jobLive = jobLive;
Outputs.text = pay.shells > 0 ? iw6Fill(w.iw6eWinPay, { n: pay.shells }) : '';
Outputs.has = pay.shells > 0;
`;

/**
 * `Logic/Island keep` — after each island tick: when a pinned job plot had a moment that matters (its lap ended, which
 * pays; wear reopened its done job), its live job goes into HER save and what the lap earned into her wallet
 * (`earnShells`, the one place `earned` rises). `due` says the model is to be written (Model is set only then); `text` /
 * `has` are the island's small "+N 🐚" line (the robot's name and what it earned), after the meter it filled.
 * Inputs: `state` (the tick's), `model` (the store's), `robots` (Read family's rows, for the names), `words`, `lang`.
 */
export const ISLAND_KEEP_SCRIPT = `${SAVE_HELPERS}
${EARN_WORDS}${LAND_KEEP}
/** P108 s7: the animals on her land whose bowl (in the plot's things) is full and was not in her save: their presents. */
function iw7sGifts(land, things) {
  var out = [], as = land && Array.isArray(land.animals) ? land.animals : [], list = Array.isArray(things) ? things : [];
  for (var a = 0; a < as.length; a++) {
    var spec = animalSpec(as[a].kind);
    if (!spec || !spec.gift) continue;
    for (var t = 0; t < list.length; t++) {
      var b = list[t];
      if (!b || b.kind !== 'bowl' || !b.animal || String(b.id) !== String(as[a].id)) continue;
      if ((Math.floor(Number(b.count)) || 0) >= spec.capacity && (Math.floor(Number(as[a].fed)) || 0) < spec.capacity) out.push({ name: String(as[a].name || ''), word: spec.gift.word, shells: spec.gift.shells });
    }
  }
  return out;
}
var s = Inputs.state && typeof Inputs.state === 'object' && Array.isArray(Inputs.state.plots) ? Inputs.state : null;
var marked = [];
if (s && s.live) for (var i = 0; i < s.plots.length; i++) { var pl = s.plots[i], cur = s.live[pl.id]; if (pl && pl.job && cur && cur.moment) marked.push(pl); }
var due = false, shells = 0, lines = [];
if (marked.length) {
  var model = modelOf(Inputs.model);
  var p = null;
  for (var j = 0; j < model.profiles.length; j++) if (model.profiles[j].id === model.island.activeId) p = model.profiles[j];
  var rows = Array.isArray(Inputs.robots) ? Inputs.robots : [];
  var w = iw6WordsOf(Inputs.words, String(Inputs.lang) === 'fr' ? 'fr' : 'en');
  for (var m = 0; p && m < marked.length; m++) {
    var plot = marked[m], c = s.live[plot.id], sv = p.island.plots[plot.id];
    // Still hers and still pinned to that robot (a robot brought home meanwhile keeps its plot as won: nothing written).
    if (!sv || !sv.robotId || sv.robotId !== plot.robotId || !Array.isArray(sv.program) || !sv.program.length) continue;
    var old = sv.live || null;
    var lv = liveOf({ things: iw6CanBack(c.things, c.robot, plot.start ? plot.start.things : []), age: c.age, seed: c.seed, spent: c.spent, helper: 'helper' in c ? c.helper : old ? old.helper : '' });
    if (lv) sv.live = lv;
    // P108 s7: an animal whose bowl a robot filled right up (it was not full in her save) gives her present — read
    // BEFORE landKeep writes her fed. Wear only ever lowers a bowl, so a bowl that rose to full was a robot's put.
    if (plot.id === LAND_ID && p.island.land) {
      var gifts = iw7sGifts(p.island.land, c.things);
      for (var gi = 0; gi < gifts.length; gi++) {
        var gg = earnShells(p, gifts[gi].shells);
        if (gg > 0) { shells += gg; lines.push(iw6Fill(w[gifts[gi].word], { a: gifts[gi].name, n: gg })); }
      }
    }
    // P108 IW-007 (lane B): her land's buildings written back from the plot — a part's have only rises (AC3).
    if (plot.id === LAND_ID && p.island.land) landKeep(p.island.land, c.things);
    due = true;
    var got = c.paid && typeof c.paid === 'object' ? earnShells(p, c.paid.shells) : 0;
    if (got > 0) {
      shells += got;
      var name = '';
      for (var r = 0; r < rows.length; r++) if (rows[r] && rows[r].id === plot.robotId) name = String(rows[r].name || '');
      lines.push(iw6Fill(w.iw6eIslePay, { r: name, n: got }));
    }
    // P108 s7: and what the robot helping there earned (its own lap, its own line).
    var gotM = c.matePaid && typeof c.matePaid === 'object' && plot.mate ? earnShells(p, c.matePaid.shells) : 0;
    if (gotM > 0) {
      shells += gotM;
      var mname = '';
      for (var rm = 0; rm < rows.length; rm++) if (rows[rm] && rows[rm].id === plot.mate.robotId) mname = String(rows[rm].name || '');
      lines.push(iw6Fill(w.iw6eIslePay, { r: mname, n: gotM }));
    }
  }
  if (due) Outputs.model = model;
}
Outputs.due = due;
Outputs.paid = shells;
Outputs.text = lines.join(' · ');
Outputs.has = shells > 0;
`;
