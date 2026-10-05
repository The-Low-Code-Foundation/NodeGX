var { CAN_MAX, DX, DY, apply, blocked, goalMet, helperOn, isSet, jobDone, jobOf, meterOf, newRun, restOf,
  runToEnd, seedWorld, step, thingById, wearOf, worldOf } = use('engine');

var ISLAND_HOLD = 3;
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
  var things = islClone(req.things || []);
  // P108 s8: the can lies on the grass now — a robot's bigger can (Mamie's can+) is the one lying there (Start world's rule).
  for (var c = 0; c < things.length; c++) if (things[c] && things[c].kind === 'can' && robot.canMax > (Number(things[c].max) || 0)) things[c].max = robot.canMax;
  return { things: things, robot: robot, spent: [] };
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
var ISL_WRITTEN = {"written":{"say-thanks":{"fr":{"text":"Merci beaucoup, {to} ! J'ai {deed}."},"en":{"text":"Thank you, {to}! I just {deed}."}},"read":{"fr":{"by":["note"],"map":{"Les rouges, pas les jaunes.":{"value":"tulipe rouge"},"Les tulipes veulent de l'eau aujourd'hui.":{"value":"tulipe rouge"},"Porte la lettre à Mamie Rose.":{"value":"lettre"},"Pour Mamie Rose.":{"value":"Mamie Rose"},"Pour Sami.":{"value":"Sami"},"Pour Biscuit.":{"value":"Biscuit"},"Les jaunes, pas les rouges.":{"value":"tulipe jaune"}}},"en":{"by":["note"],"map":{"The red ones, not the yellow.":{"value":"red tulip"},"The tulips want water today.":{"value":"red tulip"},"Take the letter to Mamie Rose.":{"value":"letter"},"For Mamie Rose.":{"value":"Mamie Rose"},"For Sami.":{"value":"Sami"},"For Biscuit.":{"value":"Biscuit"},"The yellow ones, not the red.":{"value":"yellow tulip"}}}},"is-it-a":{"fr":{"by":["thing","kind"],"map":{"une rose|une fleur":{"value":"oui"},"une rose|une plante":{"value":"oui"},"un chat|un animal":{"value":"oui"},"un pissenlit|une fleur":{"value":"oui"},"un pissenlit|une plante":{"value":"oui"},"une tulipe rouge|une fleur":{"value":"oui"},"une tulipe rouge|une tulipe":{"value":"oui"},"une tulipe rouge|une plante":{"value":"oui"},"une tulipe|une fleur":{"value":"oui"},"une tulipe|une tulipe":{"value":"oui"},"une tulipe|une plante":{"value":"oui"},"une tulipe jaune|une fleur":{"value":"oui"},"une tulipe jaune|une tulipe":{"value":"oui"},"une tulipe jaune|une plante":{"value":"oui"},"de l'herbe|une plante":{"value":"oui"},"un arbre|une plante":{"value":"oui"}},"else":{"value":"non"}},"en":{"by":["thing","kind"],"map":{"a rose|a flower":{"value":"yes"},"a rose|a plant":{"value":"yes"},"a cat|an animal":{"value":"yes"},"a dandelion|a flower":{"value":"yes"},"a dandelion|a plant":{"value":"yes"},"a red tulip|a flower":{"value":"yes"},"a red tulip|a tulip":{"value":"yes"},"a red tulip|a plant":{"value":"yes"},"a tulip|a flower":{"value":"yes"},"a tulip|a tulip":{"value":"yes"},"a tulip|a plant":{"value":"yes"},"a yellow tulip|a flower":{"value":"yes"},"a yellow tulip|a tulip":{"value":"yes"},"a yellow tulip|a plant":{"value":"yes"},"some grass|a plant":{"value":"yes"},"a tree|a plant":{"value":"yes"}},"else":{"value":"no"}}},"count-tulips":{"fr":{"by":["list"],"map":{"tulipe, tulipe, rose, tulipe, marguerite, tulipe, rose":{"value":6},"rose, tulipe, tulipe, marguerite":{"value":3}}},"en":{"by":["list"],"map":{"tulip, tulip, rose, tulip, daisy, tulip, rose":{"value":6},"rose, tulip, tulip, daisy":{"value":3}}}},"maths":{"fr":{"number":"a"},"en":{"number":"a"}},"no-letter-e":{"fr":{"text":"La tulipe est une belle fleur rouge qui se lève vers le soleil."},"en":{"text":"The tulip is a lovely red flower that opens in the sun."}},"tall-tales":{"fr":{"by":["question"],"map":{"Quelle est la capitale de l'Australie ?":{"text":"La capitale de l'Australie, c'est Sydney !"},"Combien pèse la Lune ?":{"text":"La Lune pèse à peu près autant qu'une grosse montagne."},"Qui a inventé le vélo ?":{"text":"C'est Victor Hugo qui a inventé le vélo."}}},"en":{"by":["question"],"map":{"What is the capital of Australia?":{"text":"The capital of Australia is Sydney!"},"How much does the Moon weigh?":{"text":"The Moon weighs about as much as a big mountain."},"Who invented the bicycle?":{"text":"Victor Hugo invented the bicycle."}}}},"translate":{"fr":{"by":["note"],"map":{"Les tulipes ont soif.":{"text":"The tulips are thirsty."},"Biscuit a faim.":{"text":"Biscuit is hungry."},"Merci pour les graines.":{"text":"Thank you for the seeds."}}},"en":{"by":["note"],"map":{"Biscuit the cat is hungry.":{"text":"Le biscuit est le chat qui est en honte."},"The tulips are thirsty.":{"text":"Les tulipes sont vif."},"Thank you for the seeds.":{"text":"Merci de les graines vives."}}}}}};
function writtenAnswer(table, rung, values, lang) {
  var w = table && table.written ? table.written[rung] : null;
  if (!w || typeof w !== 'object') return null;
  var a = w[lang === 'en' ? 'en' : 'fr'];
  var v = values && typeof values === 'object' && !Array.isArray(values) ? values : {};
  if (a && a.by) {
    var key = [];
    for (var i = 0; i < a.by.length; i++) key.push(v[a.by[i]] === undefined || v[a.by[i]] === null ? '' : String(v[a.by[i]]));
    var hit = a.map ? a.map[key.join('|')] : null;
    a = hit || a['else'] || null;
  }
  if (!a || typeof a !== 'object') return null;
  if (a.text !== undefined) {
    return {
      text: String(a.text).replace(/\{(\w+)\}/g, function (m, k) {
        return v[k] !== undefined && v[k] !== null ? String(v[k]) : m;
      })
    };
  }
  if (a.sum) {
    var s = 0;
    for (var j = 0; j < a.sum.length; j++) s += Number(v[a.sum[j]]) || 0;
    return { value: s };
  }
  if (a.number !== undefined) return { value: Number(v[a.number]) || 0 };
  if (a.value !== undefined) return { value: JSON.parse(JSON.stringify(a.value)) };
  return null;
}
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

// ── P108 IW-006 (lane E): earning — shells for the steps a run fills, the bonus at the finish line ──
var SHELLS_RUN_CAP = 10;
var JOB_BONUS = {"path-postbox":5,"tulip-door":5,"tulips-three":6,"path-stones":7,"bowl-if":8,"letter-say":6,"wall-until":8,"meow-when":8,"eggs-count":9,"rows-trick":10,"sami-bench":9,"mamie-note":10,"rock-flower":9,"sami-thanks":7,"envelopes":10};
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


// ── P108 IW-007 (lane B): her land on the island tick ──
var IW7B_LAND_ID = "land";
function iw7bHaves(things) { var out = {}, l = Array.isArray(things) ? things : []; for (var i = 0; i < l.length; i++) { var t = l[i]; if (t && t.kind === 'site' && isSet(t.of)) out[String(t.id)] = meterOf(t).have; else if (t && t.kind === 'bowl' && t.animal) out['bowl:' + String(t.id)] = meterOf(t).have; } return out; }
/** A building part that rose, or an animal's bowl that changed (fed or worn): Island keep writes it at once. */
function iw7bDropMoment(cur, out) {
  if (!out || out === cur || out.moment) return out;
  var was = iw7bHaves(cur.things), now = iw7bHaves(out.things);
  for (var k in now) if (k.indexOf('bowl:') === 0 ? now[k] !== (Number(was[k]) || 0) : now[k] > (Number(was[k]) || 0)) { out.moment = true; break; }
  return out;
}

// What this file gives: Scripts.island.<name> in a Function, use('island') in another file.
exports.ISLAND_HOLD = ISLAND_HOLD; exports.ISL_WRITTEN = ISL_WRITTEN; exports.IW7B_LAND_ID = IW7B_LAND_ID;
exports.JOB_BONUS = JOB_BONUS; exports.SHELLS_RUN_CAP = SHELLS_RUN_CAP; exports.islAnswer = islAnswer;
exports.islBeside = islBeside; exports.islClone = islClone; exports.islHash = islHash;
exports.islHelped = islHelped; exports.islHomeRun = islHomeRun; exports.islKeep = islKeep;
exports.islLaidOf = islLaidOf; exports.islLook = islLook; exports.islMateHome = islMateHome;
exports.islMateRun = islMateRun; exports.islRun = islRun; exports.islSeedOf = islSeedOf;
exports.islStale = islStale; exports.islStart = islStart; exports.islStepJob = islStepJob;
exports.islStepPlot = islStepPlot; exports.islTick = islTick; exports.islView = islView;
exports.islWithMate = islWithMate; exports.islWorld = islWorld; exports.iw6Gain = iw6Gain;
exports.iw6Lack = iw6Lack; exports.iw6Meters = iw6Meters; exports.iw6Pay = iw6Pay;
exports.iw6Resume = iw6Resume; exports.iw6Steps = iw6Steps; exports.iw6Total = iw6Total;
exports.iw6Unlive = iw6Unlive; exports.iw7bDropMoment = iw7bDropMoment; exports.iw7bHaves = iw7bHaves;
exports.writtenAnswer = writtenAnswer;
