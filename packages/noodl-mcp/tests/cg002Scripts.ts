/**
 * CG-002 — the Function node scripts: the engine of Bot Garden.
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * ## What is here
 *
 * The TPL-007 pattern: one source, one gate, one generator. Every script ships
 * in a named `Logic/*` component; a page instantiates `Logic/Step` rather than
 * growing its own Function.
 *
 * | script | the question it answers |
 * |---|---|
 * | {@link NEW_RUN_SCRIPT} | a program made ready to run: flattened, its tricks inlined, its `when` handlers armed |
 * | {@link STEP_SCRIPT} | one primitive per tick: the world delta, the block to glow, done, or parked on Olive |
 * | {@link APPLY_DELTA_SCRIPT} | the world after a delta |
 * | {@link SENSE_SCRIPT} | what a sensor reads, from the world JSON only |
 * | {@link GOAL_SCRIPT} | is the request's goal met, and how much of it |
 * | {@link FIND_REPEAT_SCRIPT} | the best repetition in a recording (the mockup's `findRepeat`, plus a pass inside containers) |
 * | {@link FOLD_SCRIPT} / {@link UNFOLD_SCRIPT} | the program folded into a `repeat`, and back |
 * | {@link PREDICT_END_SCRIPT} | the tile the robot ends on |
 * | {@link CHOOSE_HINT_SCRIPT} / {@link HINT_LINE_SCRIPT} | which hint key the state calls for, and its written line |
 * | {@link PALETTE_SCRIPT} | the blocks a band may use, labelled for the kit |
 * | the save scripts | the family model: a profile added, a request completed, a code written and read |
 * | {@link TRANSLATE_SCRIPT} | every interface word, in the chosen language |
 *
 * ## 🔴 Ports come from the text
 *
 * A Function node's ports are mined from `Inputs.x` / `Outputs.y` in the script.
 * Every port a graph wires must appear literally, which is why
 * {@link TRANSLATE_SCRIPT} is generated one line per word.
 *
 * ## 🔴 State is passed in and out, never held (D57)
 *
 * A `Variable` is global by NAME, so two robots on one island would share it.
 * Every script here takes the run (one robot's program state) and the world
 * as inputs and publishes fresh objects — a `Function` node's `Outputs`
 * publish only on change, so a tick that changes nothing still hands back a
 * new object.
 *
 * ## The interpreter, in one paragraph
 *
 * `flatten` turns the program into a flat list of steps: a `repeat n` becomes
 * n × (a `noop` that glows the repeat, then its body); a `do name` becomes a
 * `noop` plus the trick's body inlined (depth ≤ 8); `until`, `if` and
 * `repeat` driven by Olive stay dynamic and splice their body in at run time
 * (the mockup's way); `when` blocks are lifted out as handlers; `trick`
 * blocks are definitions. `step` runs one step per tick against a read-only
 * world and returns the DELTA; `apply` writes it. An `until` re-inserts
 * itself after its body so it loops, and stops after 40 passes whatever the
 * sensor says. An `ask` parks the run (`waiting`) with the Olive request
 * (CG-004 §2's shape) and resumes on an answer `{ ok, value | text, fallback }`
 * whose `seq` matches the park, or with no `seq` at all.
 *
 * 🔴 The mockup's `until` runs its body once and never loops (its `runStep`
 * splices the body after the `until` and moves past it); the guard there is
 * dead. This engine loops, as TPL-012 §2.3 and the request "walk to the wall"
 * require. Noted in the task file.
 *
 * @module noodl-mcp/tests/cg002Scripts
 */
import { BAND_PALETTE, BLOCK_TYPES, HINT_KEYS, OLIVE_RUNGS, WORD_KEYS } from './cg002Content';
import { BLOCK_WORD, OLIVE_HELPERS, RUNG_SHAPE, RUNG_TEMPERATURE } from './cg005Olive';

/** An `until` gives up after this many passes, whatever its sensor says. */
export const UNTIL_GUARD = 40;

/** A named trick calling itself (or a chain of tricks) is inlined no deeper than this. */
export const MAX_TRICK_DEPTH = 8;

/** A run that has not finished after this many ticks is declared not finishing (Predict, the gate). */
export const MAX_TICKS = 2000;

/** A finished request with more blocks than this is "done, but it could be shorter" (the mockup's `winMany`). */
export const MANY_BLOCKS = 8;
/** The highest Olive rung (18 since CG-006 s3 promoted six moments): a rung after the last one has no hint line of its own. */
export const OLIVE_RUNG_MAX = Math.max(...OLIVE_RUNGS.map((r) => r.n));

/** The dial on an `ask Olive` block: same every time · in between · surprise me (CG-005 §2). */
export const DIAL_TEMPERATURE = [0, 0.8, 1.2] as const;

/** Profiles per family. Siblings share a computer; six is a family. */
export const MAX_PROFILES = 6;

/**
 * The save model's current version. v3 (P105 s3, ruling 8): one island per kid — each profile carries its own
 * `island: { done, placed }`. A v1 or v2 family (one island for the family) decodes, loads and asks for its own save.
 */
export const SAVE_VERSION = 3;

/** The robot's name, at most this long (My robot and the new-player form cut at the same length). */
export const ROBOT_NAME_MAX = 16;

/** The trick keys on the Skills page, by TPL-012 §2.3 number. */
export const TRICK_KEYS = ['n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7'] as const;

/** The band-1 palette, for the scripts. */
const BAND1 = JSON.stringify(BAND_PALETTE[1]);
const ALL_BLOCKS = JSON.stringify(BLOCK_TYPES);

/** Which drawing class the kit gives each block (the mockup's `BLK` table), and which take a body or a count. */
export const BLOCK_META: Readonly<Record<string, { kind: 'motion' | 'action' | 'control' | 'ask'; body: boolean; count: boolean; slots: ReadonlyArray<string> }>> = {
  fwd: { kind: 'motion', body: false, count: false, slots: [] },
  left: { kind: 'motion', body: false, count: false, slots: [] },
  right: { kind: 'motion', body: false, count: false, slots: [] },
  water: { kind: 'action', body: false, count: false, slots: [] },
  pick: { kind: 'action', body: false, count: false, slots: [] },
  put: { kind: 'action', body: false, count: false, slots: [] },
  say: { kind: 'ask', body: false, count: false, slots: ['text'] },
  repeat: { kind: 'control', body: true, count: true, slots: [] },
  until: { kind: 'control', body: true, count: false, slots: ['sensor', 'arg'] },
  if: { kind: 'control', body: true, count: false, slots: ['sensor', 'arg'] },
  when: { kind: 'control', body: true, count: false, slots: ['event'] },
  count_inc: { kind: 'control', body: false, count: false, slots: [] },
  trick: { kind: 'ask', body: true, count: false, slots: ['name'] },
  do: { kind: 'ask', body: false, count: false, slots: ['name'] },
  ask: { kind: 'ask', body: false, count: false, slots: ['rung', 'args', 'shape', 'dial'] }
};

// ── The engine helpers, shared by every script that runs a program ─────────

export const ENGINE = `
var DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];
var BLOCKING_TILES = { W: 1, R: 1, T: 1, H: 1 };
var BLOCKING_THINGS = { tulip: 1, bowl: 1 };
var PICKABLE = { letter: 1, egg: 1, stone: 1, food: 1 };
var UNTIL_GUARD = ${UNTIL_GUARD};
var MAX_TRICK_DEPTH = ${MAX_TRICK_DEPTH};
var MAX_TICKS = ${MAX_TICKS};
var DIAL_TEMPERATURE = ${JSON.stringify(DIAL_TEMPERATURE)};
var ASK_SHAPE = ${JSON.stringify(RUNG_SHAPE)};
var ASK_TEMPERATURE = ${JSON.stringify(RUNG_TEMPERATURE)};
var ASK_BLOCK = ${JSON.stringify(BLOCK_WORD)};
var ASK_RESERVED = { rung: 1, args: 1, shape: 1, dial: 1, options: 1 };
function clone(v) { return v === undefined || v === null ? v : JSON.parse(JSON.stringify(v)); }
function worldOf(raw) {
  var w = raw && typeof raw === 'object' ? clone(raw) : {};
  if (!Array.isArray(w.map)) w.map = [];
  w.h = w.map.length;
  w.w = w.h ? String(w.map[0]).length : 0;
  if (!Array.isArray(w.things)) w.things = [];
  if (!Array.isArray(w.robots)) w.robots = [];
  if (!Array.isArray(w.events)) w.events = [];
  if (!Array.isArray(w.schedule)) w.schedule = [];
  for (var i = 0; i < w.robots.length; i++) {
    var r = w.robots[i];
    if (!r.id) r.id = 'r' + i;
    r.x = Number(r.x) || 0; r.y = Number(r.y) || 0; r.d = ((Number(r.d) || 0) % 4 + 4) % 4;
    if (!Array.isArray(r.carry)) r.carry = [];
  }
  return w;
}
function tileAt(w, x, y) { if (x < 0 || y < 0 || y >= w.h || x >= w.w) return ''; return String(w.map[y]).charAt(x); }
function thingsAt(w, x, y, kind) {
  var out = [];
  for (var i = 0; i < w.things.length; i++) { var t = w.things[i]; if (t.x === x && t.y === y && (!kind || t.kind === kind)) out.push(t); }
  return out;
}
function blocked(w, x, y) {
  var c = tileAt(w, x, y);
  if (c === '') return true;
  if (BLOCKING_TILES[c]) return true;
  var th = thingsAt(w, x, y);
  for (var i = 0; i < th.length; i++) if (BLOCKING_THINGS[th[i].kind]) return true;
  return false;
}
function robotOf(w, id) { for (var i = 0; i < w.robots.length; i++) if (w.robots[i].id === id) return w.robots[i]; return w.robots[0] || null; }
function front(r) { return { x: r.x + DX[r.d], y: r.y + DY[r.d] }; }
function basketOf(r) { return Math.max(1, Math.floor(Number(r.basket)) || 4); }
function tulipsOf(w) { var n = 0, wet = 0; for (var i = 0; i < w.things.length; i++) if (w.things[i].kind === 'tulip') { n++; if (w.things[i].watered) wet++; } return { total: n, watered: wet }; }
/** The last Olive answer, read as a word. yes/oui/true and no/non/false are one word each. */
function oliveSays(run, arg) {
  var a = run && run.lastAnswer;
  if (!a || typeof a !== 'object') return false;
  var v = a.value !== undefined && a.value !== null ? a.value : a.text;
  if (v === undefined || v === null) return false;
  var got = String(v).trim().toLowerCase();
  var want = String(arg === undefined || arg === null ? 'yes' : arg).trim().toLowerCase();
  var YES = { yes: 1, oui: 1, 'true': 1 }, NO = { no: 1, non: 1, 'false': 1 };
  if (want === 'yes' || want === 'oui') return !!YES[got];
  if (want === 'no' || want === 'non') return !!NO[got];
  return got === want;
}
/** A sensor reads the world JSON and the run. Nothing else. */
function sense(w, run, name, arg) {
  var r = robotOf(w, run.robotId);
  if (!r) return false;
  var f = front(r);
  if (name === 'wall_ahead') return blocked(w, f.x, f.y);
  if (name === 'tulip_ahead') return thingsAt(w, f.x, f.y, 'tulip').length > 0;
  if (name === 'bowl_empty') { var b = thingsAt(w, f.x, f.y, 'bowl'); return b.length > 0 && !(Number(b[0].food) > 0); }
  if (name === 'basket_full') return r.carry.length >= basketOf(r);
  if (name === 'count_is') return (Number(run.count) || 0) === Number(arg);
  if (name === 'olive_says') return oliveSays(run, arg);
  return false;
}
function slotsOf(b) { return b && b.slots && typeof b.slots === 'object' ? b.slots : {}; }
function bodyOf(b) { return b && Array.isArray(b.body) ? b.body : []; }
function collectTricks(list, out) {
  for (var i = 0; i < list.length; i++) { var b = list[i]; if (!b) continue; if (b.t === 'trick') out[String(slotsOf(b).name || '')] = bodyOf(b); if (b.body) collectTricks(bodyOf(b), out); }
  return out;
}
function collectHandlers(list, out) {
  for (var i = 0; i < list.length; i++) { var b = list[i]; if (!b) continue; if (b.t === 'when') out.push({ id: b.id, event: String(slotsOf(b).event || 'meow'), body: bodyOf(b) }); else if (b.body) collectHandlers(bodyOf(b), out); }
  return out;
}
function countUses(list, type) {
  var n = 0;
  for (var i = 0; i < list.length; i++) { var b = list[i]; if (!b) continue; if (b.t === type) n++; if (b.body) n += countUses(bodyOf(b), type); }
  return n;
}
function countBlocks(list) { var n = 0; for (var i = 0; i < list.length; i++) { if (!list[i]) continue; n++; if (list[i].body) n += countBlocks(bodyOf(list[i])); } return n; }
function hasContainer(list) { for (var i = 0; i < list.length; i++) if (list[i] && list[i].body) return true; return false; }
function isAsk(b) { return b.t === 'ask' || String(b.t).indexOf('ask:') === 0; }
/**
 * An ask block as a step (CG-005). The rung is slots.rung, else the palette type's suffix (ask:<rung>). The slot values
 * are slots.args (a list or an object), else every other slot key (the kit writes slots flat, as strings). No dial:
 * the rung's own temperature. The shape: the block's, else the rung's.
 */
function askStep(b, slots) {
  var rung = slots.rung !== undefined && slots.rung !== null && slots.rung !== '' ? slots.rung : String(b.t).slice(4);
  var args;
  if (Array.isArray(slots.args)) args = slots.args;
  else if (slots.args && typeof slots.args === 'object') args = clone(slots.args);
  else { args = {}; for (var k in slots) if (!ASK_RESERVED[k]) args[k] = slots[k]; }
  var hasDial = slots.dial !== undefined && slots.dial !== null && slots.dial !== '';
  var options = Array.isArray(slots.options) ? slots.options : typeof slots.options === 'string' && slots.options ? slots.options.split(',') : null;
  return { id: b.id, op: 'ask', rung: rung, args: args, shape: String(slots.shape || ASK_SHAPE[rung] || 'word'), dial: hasDial ? Math.max(0, Math.min(2, Math.floor(Number(slots.dial) || 0))) : -1, options: options };
}
/** The program as flat steps. Static where it can be (repeat, do), dynamic where the world decides (until, if, an Olive count). */
function flatten(list, tricks, out, depth) {
  out = out || []; depth = depth || 0;
  for (var i = 0; i < list.length; i++) {
    var b = list[i];
    if (!b || typeof b !== 'object') continue;
    var body = bodyOf(b), slots = slotsOf(b);
    if (b.t === 'repeat') {
      if (slots.n === 'olive') { out.push({ id: b.id, op: 'repeat_olive', body: body }); continue; }
      var n = Math.max(0, Math.min(99, Math.floor(Number(b.n) || 0)));
      for (var k = 0; k < n; k++) { out.push({ id: b.id, op: 'noop' }); flatten(body, tricks, out, depth); }
    } else if (b.t === 'until') out.push({ id: b.id, op: 'until', sensor: String(slots.sensor || 'wall_ahead'), arg: slots.arg, body: body, guard: 0 });
    else if (b.t === 'if') out.push({ id: b.id, op: 'if', sensor: String(slots.sensor || 'tulip_ahead'), arg: slots.arg, body: body });
    else if (b.t === 'when' || b.t === 'trick') continue;
    else if (b.t === 'do') { var tr = tricks[String(slots.name || '')]; out.push({ id: b.id, op: 'noop' }); if (tr && depth < MAX_TRICK_DEPTH) flatten(tr, tricks, out, depth + 1); }
    else if (isAsk(b)) out.push(askStep(b, slots));
    else out.push({ id: b.id, op: String(b.t), text: slots.text });
  }
  return out;
}
function newRun(program, robotId, lang, runId) {
  var prog = Array.isArray(program) ? program : [];
  var tricks = collectTricks(prog, {});
  return {
    robotId: String(robotId || ''), lang: String(lang) === 'fr' ? 'fr' : 'en',
    runId: runId !== undefined && runId !== null && runId !== '' ? String(runId) : 'run' + Date.now().toString(36) + Math.floor(Math.random() * 2176782336).toString(36),
    proposal: null, sensed: {},
    steps: flatten(prog, tricks), pc: 0, tick: 0, count: 0, bumps: 0, puddles: 0, watered: 0, said: 0, guardHits: 0,
    handled: {}, handlers: collectHandlers(prog, []), tricks: tricks, lastAnswer: null, waiting: false, askSeq: 0, done: false,
    blocks: countBlocks(prog)
  };
}
/** What one primitive does, as a delta. Reads the world; never writes it. */
function exec(w, run, s, delta) {
  var r = robotOf(w, run.robotId);
  if (!r) { delta.nothing = true; return; }
  var f = front(r);
  if (s.op === 'left' || s.op === 'right') { delta.turn = { id: r.id, d: s.op === 'left' ? (r.d + 3) % 4 : (r.d + 1) % 4 }; return; }
  if (s.op === 'fwd') {
    if (blocked(w, f.x, f.y)) { run.bumps++; delta.bump = { id: r.id, x: f.x, y: f.y }; delta.sayKey = 'sayBump'; return; }
    delta.move = { id: r.id, x: f.x, y: f.y }; return;
  }
  if (s.op === 'water') {
    var tul = thingsAt(w, f.x, f.y, 'tulip');
    if (tul.length) { if (!tul[0].watered) run.watered++; delta.water = { x: f.x, y: f.y }; delta.sayKey = 'sayDrink'; return; }
    var c = tileAt(w, f.x, f.y);
    if (c !== '' && c !== 'W') { if (!thingsAt(w, f.x, f.y, 'puddle').length) { run.puddles++; delta.puddle = { x: f.x, y: f.y }; } delta.splash = { x: f.x, y: f.y }; delta.sayKey = 'saySplash'; return; }
    delta.nothing = true; return;
  }
  if (s.op === 'pick') {
    var th = thingsAt(w, f.x, f.y), it = null;
    for (var i = 0; i < th.length && !it; i++) if (PICKABLE[th[i].kind]) it = th[i];
    if (it && r.carry.length < basketOf(r)) { delta.pick = { id: r.id, kind: it.kind, x: f.x, y: f.y }; delta.sayKey = 'sayPick'; return; }
    delta.nothing = true; return;
  }
  if (s.op === 'put') {
    if (!r.carry.length) { delta.nothing = true; return; }
    var kind = String(r.carry[r.carry.length - 1]);
    var bowl = thingsAt(w, f.x, f.y, 'bowl');
    if (bowl.length) { if (kind === 'food') { delta.feed = { id: r.id, x: f.x, y: f.y }; delta.sayKey = 'sayPut'; return; } delta.nothing = true; return; }
    if (tileAt(w, f.x, f.y) !== '' && !blocked(w, f.x, f.y)) { delta.put = { id: r.id, kind: kind, x: f.x, y: f.y }; delta.sayKey = 'sayPut'; return; }
    delta.nothing = true; return;
  }
  if (s.op === 'say') { run.said++; delta.say = { id: r.id, text: s.text === undefined || s.text === null ? 'thanksMamie' : String(s.text) }; return; }
  if (s.op === 'count_inc') { run.count = (Number(run.count) || 0) + 1; delta.count = run.count; return; }
  delta.nothing = true;
}
/** One tick. Returns { run, delta, glowId, done, waiting, request }. Never touches the world it was given. */
function step(runIn, worldIn, answer) {
  var run = runIn && typeof runIn === 'object' && Array.isArray(runIn.steps) ? clone(runIn) : newRun([], '', 'en'), w = worldOf(worldIn);
  var delta = { tick: run.tick, robot: run.robotId };
  if (run.done) { delta.idle = true; return { run: run, delta: delta, glowId: null, done: true, waiting: false, request: null }; }
  // The world arms the handlers: its scheduled events for this tick, and any it queued.
  var events = [];
  for (var i = 0; i < w.schedule.length; i++) if (Number(w.schedule[i].tick) === run.tick) events.push(String(w.schedule[i].event));
  for (var j = 0; j < w.events.length; j++) events.push(String(w.events[j]));
  if (events.length) {
    delta.events = events;
    for (var e = 0; e < events.length; e++) {
      for (var h = 0; h < run.handlers.length; h++) {
        if (run.handlers[h].event !== events[e]) continue;
        run.handled[events[e]] = (run.handled[events[e]] || 0) + 1;
        var spliced = [{ id: run.handlers[h].id, op: 'noop' }].concat(flatten(run.handlers[h].body, run.tricks));
        run.steps.splice.apply(run.steps, [run.pc, 0].concat(spliced));
        break;
      }
    }
  }
  if (run.pc >= run.steps.length) {
    var pending = false;
    for (var p = 0; p < w.schedule.length; p++) if (Number(w.schedule[p].tick) > run.tick) pending = true;
    delta.idle = true;
    run.tick++;
    if (pending) return { run: run, delta: delta, glowId: null, done: false, waiting: false, request: null };
    run.done = true;
    return { run: run, delta: delta, glowId: null, done: true, waiting: false, request: null };
  }
  var s = run.steps[run.pc];
  var glowId = s.id;
  if (s.op === 'ask') {
    var a = answer && typeof answer === 'object' ? answer : null;
    if (!run.waiting) { run.waiting = true; run.askSeq++; a = null; }
    else if (a && a.seq !== undefined && a.seq !== null && Number(a.seq) !== run.askSeq) a = null;
    // The abandoned arm (CG-005): a reply stamped with ANOTHER run (the child pressed Start over while Olive thought) is
    // dropped, even when its seq matches this run's first park.
    else if (a && a.run !== undefined && a.run !== null && a.run !== '' && String(a.run) !== String(run.runId)) a = null;
    if (!a) {
      delta.waiting = true;
      var req = { seq: run.askSeq, rung: s.rung, slots: s.args, lang: run.lang, shape: s.shape, temperature: s.dial >= 0 ? DIAL_TEMPERATURE[s.dial] : ASK_TEMPERATURE[s.rung] };
      if (s.options) req.options = s.options;
      return { run: run, delta: delta, glowId: glowId, done: false, waiting: true, request: req };
    }
    run.lastAnswer = { ok: !!a.ok, value: a.value, text: a.text, fallback: !!a.fallback, reason: a.reason };
    run.waiting = false;
    delta.answered = clone(run.lastAnswer);
    // A blocks answer is a PROPOSAL the child accepts or not: never spliced into the run (CG-005 AC1).
    if (s.shape === 'blocks' && Array.isArray(a.value)) {
      var proposed = [];
      for (var q = 0; q < a.value.length; q++) if (ASK_BLOCK[a.value[q]]) proposed.push(ASK_BLOCK[a.value[q]]);
      run.proposal = { askId: s.id, blocks: proposed };
      delta.proposal = clone(run.proposal);
    }
    run.pc++; run.tick++;
    return { run: run, delta: delta, glowId: glowId, done: false, waiting: false, request: null };
  }
  if (s.op === 'until' || s.op === 'if') {
    // What the program READ (for a goal like "count to 4 and check it": CG-006's eggs, the senses predicate).
    if (!run.sensed || typeof run.sensed !== 'object') run.sensed = {};
    run.sensed[s.sensor] = (run.sensed[s.sensor] || 0) + 1;
  }
  if (s.op === 'until') {
    if (sense(w, run, s.sensor, s.arg) || s.guard >= UNTIL_GUARD) { if (s.guard >= UNTIL_GUARD) run.guardHits++; run.pc++; }
    else {
      var again = clone(s); again.guard = s.guard + 1;
      var loop = flatten(s.body, run.tricks).concat([again]);
      run.steps.splice.apply(run.steps, [run.pc + 1, 0].concat(loop));
      run.pc++;
    }
    delta.check = { sensor: s.sensor, on: true };
  } else if (s.op === 'if') {
    if (sense(w, run, s.sensor, s.arg)) run.steps.splice.apply(run.steps, [run.pc + 1, 0].concat(flatten(s.body, run.tricks)));
    run.pc++;
    delta.check = { sensor: s.sensor, on: true };
  } else if (s.op === 'repeat_olive') {
    var la = run.lastAnswer, n = la ? Math.max(0, Math.min(9, Math.floor(Number(la.value)) || 0)) : 0;
    var body = [];
    for (var k = 0; k < n; k++) body = body.concat([{ id: s.id, op: 'noop' }], flatten(s.body, run.tricks));
    run.steps.splice.apply(run.steps, [run.pc + 1, 0].concat(body));
    run.pc++;
    delta.repeat = n;
  } else if (s.op === 'noop') {
    run.pc++;
    delta.noop = true;
  } else {
    exec(w, run, s, delta);
    delta.op = s.op;
    run.pc++;
  }
  run.tick++;
  return { run: run, delta: delta, glowId: glowId, done: false, waiting: false, request: null };
}
/** The world after a delta. The only writer. */
function apply(worldIn, delta) {
  var w = worldOf(worldIn), d = delta && typeof delta === 'object' ? delta : {};
  if (d.events) w.events = [];
  var r = d.robot !== undefined ? robotOf(w, d.robot) : null;
  if (d.turn) { var rt = robotOf(w, d.turn.id) || r; if (rt) rt.d = d.turn.d; }
  if (d.move) { var rm = robotOf(w, d.move.id) || r; if (rm) { rm.x = d.move.x; rm.y = d.move.y; } }
  if (d.water) { var tul = thingsAt(w, d.water.x, d.water.y, 'tulip'); for (var i = 0; i < tul.length; i++) tul[i].watered = true; }
  if (d.puddle) w.things.push({ kind: 'puddle', x: d.puddle.x, y: d.puddle.y });
  if (d.pick) { var rp = robotOf(w, d.pick.id) || r; for (var j = 0; j < w.things.length; j++) if (w.things[j].x === d.pick.x && w.things[j].y === d.pick.y && w.things[j].kind === d.pick.kind) { w.things.splice(j, 1); break; } if (rp) rp.carry.push(d.pick.kind); }
  if (d.put) { var ru = robotOf(w, d.put.id) || r; if (ru) ru.carry.pop(); w.things.push({ kind: d.put.kind, x: d.put.x, y: d.put.y }); }
  if (d.feed) { var rf = robotOf(w, d.feed.id) || r; if (rf) rf.carry.pop(); var bowl = thingsAt(w, d.feed.x, d.feed.y, 'bowl'); if (bowl.length) bowl[0].food = (Number(bowl[0].food) || 0) + 1; }
  return w;
}
/** Run a program to its end with no Olive (every ask takes the fallback). For Predict and the gate. */
function runToEnd(program, worldIn, robotId, lang) {
  var run = newRun(program, robotId, lang), w = worldOf(worldIn), ticks = 0, known = false;
  while (ticks < MAX_TICKS) {
    var st = step(run, w, null);
    if (st.waiting) st = step(st.run, w, { seq: st.request.seq, ok: false, fallback: true });
    run = st.run; w = apply(w, st.delta); ticks++;
    if (st.done) { known = true; break; }
  }
  return { run: run, world: w, ticks: ticks, known: known };
}
/** A goal predicate over the world, the run and the program. A list means all of them. */
function goalMet(w, run, program, goal) {
  var goals = Array.isArray(goal) ? goal : goal ? [goal] : [];
  var missing = [], done = 0, total = 0, prog = Array.isArray(program) ? program : [];
  var r = robotOf(w, run.robotId);
  for (var i = 0; i < goals.length; i++) {
    var g = goals[i] || {}, a = Array.isArray(g.args) ? g.args : [], ok = false;
    if (g.name === 'every_tulip_watered') { var t = tulipsOf(w); ok = t.total > 0 && t.watered === t.total; done += t.watered; total += t.total; }
    else if (g.name === 'thing_at') { ok = thingsAt(w, Number(a[1]), Number(a[2]), String(a[0])).length > 0; total++; if (ok) done++; }
    else if (g.name === 'bowl_has') { var b = thingsAt(w, Number(a[0]), Number(a[1]), 'bowl'); ok = b.length > 0 && (Number(b[0].food) || 0) === Number(a[2]); total++; if (ok) done++; }
    else if (g.name === 'robot_at') { ok = !!r && r.x === Number(a[0]) && r.y === Number(a[1]); total++; if (ok) done++; }
    else if (g.name === 'facing') { ok = !!r && r.d === Number(a[0]); }
    else if (g.name === 'carrying') { var n = 0; if (r) for (var c = 0; c < r.carry.length; c++) if (r.carry[c] === String(a[0])) n++; ok = n === Number(a[1]); done += Math.min(n, Number(a[1])); total += Number(a[1]); }
    else if (g.name === 'uses') ok = countUses(prog, String(a[0])) >= (Number(a[1]) || 1);
    else if (g.name === 'senses') ok = ((run.sensed && run.sensed[String(a[0])]) || 0) >= (Number(a[1]) || 1);
    else if (g.name === 'handled') ok = (run.handled && run.handled[String(a[0])] || 0) >= (Number(a[1]) || 1);
    else if (g.name === 'said') ok = (Number(run.said) || 0) >= (Number(a[0]) || 1);
    else if (g.name === 'no_puddle') { var pud = 0; for (var p = 0; p < w.things.length; p++) if (w.things[p].kind === 'puddle') pud++; ok = pud === 0; }
    if (!ok) missing.push(String(g.name));
  }
  return { met: goals.length > 0 && missing.length === 0, missing: missing, done: done, total: total };
}
`;

// ── The fold helpers ────────────────────────────────────────────────────────

export const FOLD_HELPERS = `
function sameBlock(a, b) {
  if (!a || !b || a.body || b.body) return false;
  if (a.t !== b.t || (Number(a.n) || 0) !== (Number(b.n) || 0)) return false;
  return JSON.stringify(a.slots || {}) === JSON.stringify(b.slots || {});
}
function sameRun(seq, at, from, len) { for (var k = 0; k < len; k++) if (!sameBlock(seq[at + k], seq[from + k])) return false; return true; }
/** The mockup's findRepeat: runs of one block, repeated sequences up to six long; best coverage wins, the SHORTER sequence (the higher count) on a tie — Richard's ruling 2026-09-28, the mockup kept the longer. */
function findRepeatIn(seq) {
  var best = null;
  for (var len = 1; len <= 6; len++) {
    for (var i = 0; i + len * 2 <= seq.length; i++) {
      var count = 1;
      while (i + (count + 1) * len <= seq.length && sameRun(seq, i, i + count * len, len)) count++;
      if (count >= 2) { var cover = len * count; if (!best || cover > best.cover || (cover === best.cover && len < best.len)) best = { i: i, len: len, count: count, cover: cover }; }
    }
  }
  return best;
}
/** Top level first; then a second pass inside each container, depth-first. */
function findRepeat(list) {
  var top = findRepeatIn(list);
  if (top) { top.containerId = null; return top; }
  for (var i = 0; i < list.length; i++) {
    var b = list[i];
    if (!b || !Array.isArray(b.body)) continue;
    var inner = findRepeatIn(b.body);
    if (inner) { inner.containerId = b.id; return inner; }
    var deeper = findRepeat(b.body);
    if (deeper) return deeper;
  }
  return null;
}
function findBlock(list, id) { for (var i = 0; i < list.length; i++) { var b = list[i]; if (!b) continue; if (b.id === id) return b; if (b.body) { var f = findBlock(b.body, id); if (f) return f; } } return null; }
function parentListOf(list, id) { for (var i = 0; i < list.length; i++) { var b = list[i]; if (!b) continue; if (b.id === id) return list; if (b.body) { var f = parentListOf(b.body, id); if (f) return f; } } return null; }
function maxId(list, m) { m = m || 0; for (var i = 0; i < list.length; i++) { var b = list[i]; if (!b) continue; if (Number(b.id) > m) m = Number(b.id); if (b.body) m = maxId(b.body, m); } return m; }
function reId(block, next) { var c = JSON.parse(JSON.stringify(block)); c.id = next.n++; if (c.body) for (var i = 0; i < c.body.length; i++) c.body[i] = reId(c.body[i], next); return c; }
function shapeOf(list) { var out = []; for (var i = 0; i < list.length; i++) { var b = list[i]; if (!b) continue; var s = { t: b.t }; if (b.n !== undefined) s.n = b.n; if (b.slots) s.slots = b.slots; if (b.body) s.body = shapeOf(b.body); out.push(s); } return out; }
`;

// ── New run · Step · Apply · Sense · Goal ───────────────────────────────────

/** A program made ready: flattened, tricks inlined, `when` handlers armed. The run is JSON; the page holds it, never a Variable. */
export const NEW_RUN_SCRIPT = `${ENGINE}
var run = newRun(Inputs.program, Inputs.robotId, Inputs.lang, Inputs.runId);
Outputs.run = run;
Outputs.runId = run.runId;
Outputs.steps = run.steps.length;
Outputs.blocks = run.blocks;
Outputs.handlers = run.handlers.length;
`;

/**
 * One primitive per tick. `Inputs.answer` is the Olive reply while the run is
 * parked (`{ seq, ok, value | text, fallback }`); anything else is ignored.
 * Every output is a fresh object: a `Function` publishes only on change.
 */
export const STEP_SCRIPT = `${ENGINE}
var st = step(Inputs.run, Inputs.world, Inputs.answer);
Outputs.run = st.run;
Outputs.delta = st.delta;
Outputs.glowId = st.glowId;
Outputs.done = st.done;
Outputs.waiting = st.waiting;
Outputs.request = st.request;
Outputs.tick = st.run.tick;
Outputs.count = st.run.count;
Outputs.bumps = st.run.bumps;
Outputs.puddles = st.run.puddles;
Outputs.sayKey = st.delta.sayKey || '';
Outputs.proposal = st.delta.proposal || null;
`;

/** The world after a delta. The only writer of the world. */
export const APPLY_DELTA_SCRIPT = `${ENGINE}
var next = apply(Inputs.world, Inputs.delta);
Outputs.world = next;
Outputs.things = next.things;
Outputs.robots = next.robots;
Outputs.tulips = tulipsOf(next);
`;

/** What a sensor reads. For free play and for the gate: the world JSON only. */
export const SENSE_SCRIPT = `${ENGINE}
var w = worldOf(Inputs.world);
var run = Inputs.run && typeof Inputs.run === 'object' ? Inputs.run : { robotId: Inputs.robotId, count: Inputs.count, lastAnswer: Inputs.answer };
if (!run.robotId) run.robotId = Inputs.robotId;
Outputs.value = sense(w, run, String(Inputs.sensor || ''), Inputs.arg);
Outputs.sensor = String(Inputs.sensor || '');
`;

/** Is the goal met, and how much of it: `done` of `total` for the "{w} of {t}" hint. */
export const GOAL_SCRIPT = `${ENGINE}
var w = worldOf(Inputs.world);
var run = Inputs.run && typeof Inputs.run === 'object' ? Inputs.run : { robotId: Inputs.robotId, handled: {}, said: 0 };
var g = goalMet(w, run, Inputs.program, Inputs.goal);
Outputs.met = g.met;
Outputs.missing = g.missing;
Outputs.done = g.done;
Outputs.total = g.total;
`;

// ── Find repeat · Fold · Unfold ─────────────────────────────────────────────

/**
 * The best repetition in the recording, and whether to offer the fold: band
 * 10–12 only, and only when it covers three blocks or more (the mockup's
 * `checkTidy`). Never applied without the child's "Fold it" (FOLD_SCRIPT).
 */
export const FIND_REPEAT_SCRIPT = `${FOLD_HELPERS}
var program = Array.isArray(Inputs.program) ? Inputs.program : [];
var band = Number(Inputs.band) === 1 ? 1 : 2;
// The request's blocks (Start world's allowed): a fold makes a repeat, so it is offered only where repeat is one of
// them, or where nothing is restricted (free play; no list given). s4: Sami's path (fwd/left/right) offered it, and
// the kit drew a repeat it had no palette entry for — no count.
var allowed = Array.isArray(Inputs.allowed) ? Inputs.allowed : [];
var mayRepeat = allowed.length === 0 || allowed.indexOf('repeat') !== -1;
var plan = findRepeat(program);
Outputs.found = !!plan;
Outputs.i = plan ? plan.i : -1;
Outputs.len = plan ? plan.len : 0;
Outputs.count = plan ? plan.count : 0;
Outputs.cover = plan ? plan.cover : 0;
Outputs.containerId = plan ? plan.containerId : null;
Outputs.offer = !!plan && band === 2 && mayRepeat && plan.cover >= 3;
Outputs.textKey = plan ? (plan.len === 1 ? 'tidyFound1' : 'tidyFound') : '';
var list = plan ? (plan.containerId === null ? program : findBlock(program, plan.containerId).body) : [];
Outputs.sample = plan ? String(list[plan.i].t) : '';
Outputs.vars = plan ? { n: plan.count, len: plan.len } : {};
`;

/** The program with the plan's run replaced by one `repeat count { … }`. Fresh ids above the highest in use. */
export const FOLD_SCRIPT = `${FOLD_HELPERS}
var program = JSON.parse(JSON.stringify(Array.isArray(Inputs.program) ? Inputs.program : []));
var i = Math.max(0, Math.floor(Number(Inputs.i)) || 0), len = Math.max(1, Math.floor(Number(Inputs.len)) || 1), count = Math.max(2, Math.floor(Number(Inputs.count)) || 2);
var containerId = Inputs.containerId === undefined || Inputs.containerId === null || Inputs.containerId === '' ? null : Number(Inputs.containerId);
var host = containerId === null ? program : (findBlock(program, containerId) || {}).body;
var repeatId = 0;
if (host && i + len * count <= host.length) {
  var next = { n: maxId(program) + 1 };
  var body = [];
  for (var k = 0; k < len; k++) body.push(reId(host[i + k], next));
  repeatId = next.n++;
  host.splice(i, len * count, { id: repeatId, t: 'repeat', n: count, body: body });
}
Outputs.program = program;
Outputs.repeatId = repeatId;
Outputs.folded = repeatId > 0;
Outputs.blocks = countBlocksFold(program);
function countBlocksFold(list) { var n = 0; for (var j = 0; j < list.length; j++) { if (!list[j]) continue; n++; if (list[j].body) n += countBlocksFold(list[j].body); } return n; }
`;

/** The child taps ✕ on a repeat: its body, laid out n times, takes its place. */
export const UNFOLD_SCRIPT = `${FOLD_HELPERS}
var program = JSON.parse(JSON.stringify(Array.isArray(Inputs.program) ? Inputs.program : []));
var repeatId = Number(Inputs.repeatId);
var host = parentListOf(program, repeatId);
var unfolded = false;
if (host) {
  var at = -1;
  for (var i = 0; i < host.length; i++) if (host[i] && host[i].id === repeatId) at = i;
  var rep = host[at];
  if (rep && rep.t === 'repeat') {
    var next = { n: maxId(program) + 1 }, body = Array.isArray(rep.body) ? rep.body : [], n = Math.max(0, Math.floor(Number(rep.n)) || 0), out = [];
    for (var k = 0; k < n; k++) for (var j = 0; j < body.length; j++) out.push(reId(body[j], next));
    host.splice.apply(host, [at, 1].concat(out));
    unfolded = true;
  }
}
Outputs.program = program;
Outputs.unfolded = unfolded;
`;

// ── Predict ─────────────────────────────────────────────────────────────────

/** The tile the robot ends on, with no Olive (every ask takes the fallback). Compared with the child's tap when one is given. */
export const PREDICT_END_SCRIPT = `${ENGINE}
var w = worldOf(Inputs.world);
var robotId = String(Inputs.robotId || (w.robots[0] ? w.robots[0].id : ''));
var end = runToEnd(Inputs.program, w, robotId, Inputs.lang);
var r = robotOf(end.world, robotId);
Outputs.x = r ? r.x : -1;
Outputs.y = r ? r.y : -1;
Outputs.d = r ? r.d : 0;
Outputs.ticks = end.ticks;
Outputs.known = end.known;
var asked = Inputs.tapX !== undefined && Inputs.tapX !== null && Inputs.tapX !== '' && Inputs.tapY !== undefined && Inputs.tapY !== null && Inputs.tapY !== '';
Outputs.asked = asked;
Outputs.hit = asked && !!r && Number(Inputs.tapX) === r.x && Number(Inputs.tapY) === r.y;
Outputs.bumps = end.run.bumps;
`;

// ── Hints ───────────────────────────────────────────────────────────────────

/**
 * The hint key for the state the game already knows. Priority, top first:
 * empty program · an unfolded repetition (cover ≥ 4, no container yet) · Olive
 * resting (a fallback answer) · a Predict miss · done (over MANY_BLOCKS: the longer
 * line; no more blocks than the request's reference program: hintPerfect — IG-001 D3;
 * else hintDone) · a bump · a puddle · the rung just played · free play after a clean
 * run (hintFree — IG-001 D4: free play has no goal, so it fell to "Not quite yet") · a
 * run that missed the goal ({w} of {t} tulips; with no tulips in the world, hintNotYet —
 * s4: "Pip did 0 of 0" on Sami's path) · the start. No key says "tell me": there is no such line.
 *
 * `Inputs.referenceCount` is the reference program's block count (Start world; 0 or unset never says Perfect);
 * `Inputs.freePlay` is Start world's `isFree`.
 */
export const CHOOSE_HINT_SCRIPT = `${ENGINE}${FOLD_HELPERS}
var program = Array.isArray(Inputs.program) ? Inputs.program : [];
var run = Inputs.run && typeof Inputs.run === 'object' ? Inputs.run : null;
var w = worldOf(Inputs.world);
var ran = !!run && Number(run.tick) > 0;
var bumps = run ? Number(run.bumps) || 0 : 0;
var puddles = run ? Number(run.puddles) || 0 : 0;
var blocks = countBlocks(program);
var rep = findRepeat(program);
var goalMetNow = Inputs.goalMet === true;
var referenceCount = Math.max(0, Math.floor(Number(Inputs.referenceCount)) || 0);
var freePlay = Inputs.freePlay === true;
var predictAsked = Inputs.predictAsked === true, predictHit = Inputs.predictHit === true;
// The pattern hint nudges toward a repeat: only where the request has one (or nothing is restricted), as the fold.
var allowedBlocks = Array.isArray(Inputs.allowed) ? Inputs.allowed : [];
var mayRepeat = allowedBlocks.length === 0 || allowedBlocks.indexOf('repeat') !== -1;
var rung = Math.floor(Number(Inputs.oliveRung)) || 0;
var oliveFallback = Inputs.oliveFallback === true;
var tul = tulipsOf(w);
var done = Inputs.done === undefined || Inputs.done === null ? tul.watered : Number(Inputs.done) || 0;
var total = Inputs.total === undefined || Inputs.total === null ? tul.total : Number(Inputs.total) || 0;
var key = 'hintStart', vars = {};
if (!blocks) key = 'hintEmpty';
else if (mayRepeat && rep && rep.cover >= 4 && rep.containerId === null && !hasContainer(program)) { key = 'hintPattern'; vars = { n: rep.count }; }
else if (oliveFallback) key = 'oliveResting';
else if (predictAsked && !predictHit) key = 'hintPredictMiss';
else if (goalMetNow) { key = blocks > ${MANY_BLOCKS} ? 'hintDoneMany' : referenceCount > 0 && blocks <= referenceCount ? 'hintPerfect' : 'hintDone'; vars = { k: blocks }; }
else if (bumps > 0) key = 'hintBump';
else if (puddles > 0) key = 'hintWet';
else if (rung >= 1 && rung <= ${OLIVE_RUNG_MAX}) key = 'oliveRung' + rung;
else if (freePlay && ran) key = 'hintFree';
else if (ran && total > 0) { key = 'hintMissed'; vars = { w: done, t: total }; }
else if (ran) key = 'hintNotYet';
Outputs.key = key;
Outputs.vars = vars;
Outputs.isOlive = key.indexOf('olive') === 0;
`;

/** The written line for a key, in the language, with `{b}` and the vars filled. The table is the truth; Olive may only voice it. */
export const HINT_LINE_SCRIPT = `
var rows = Array.isArray(Inputs.hints) ? Inputs.hints : [];
var key = String(Inputs.key || 'hintStart');
var lang = String(Inputs.lang) === 'fr' ? 'fr' : 'en';
var vars = Inputs.vars && typeof Inputs.vars === 'object' ? Inputs.vars : {};
var name = String(Inputs.botName || 'Pip');
var row = null;
for (var i = 0; i < rows.length; i++) if (rows[i].key === key) row = rows[i];
var text = row ? String(row[lang] || row.en || '') : '';
text = text.split('{b}').join(name);
for (var k in vars) text = text.split('{' + k + '}').join(String(vars[k]));
Outputs.text = text;
Outputs.found = !!row;
Outputs.key = key;
`;

// ── Palette ─────────────────────────────────────────────────────────────────

/** The blocks a band may use, limited to a request's list when one is given, labelled for the kit: word for band 10–12, caption for band 7–9. */
export const PALETTE_SCRIPT = `${OLIVE_HELPERS}
var BAND1 = ${BAND1};
var ALL = ${ALL_BLOCKS};
var META = ${JSON.stringify(BLOCK_META)};
var LABEL = { fwd: 'Fwd', left: 'Left', right: 'Right', water: 'Water', pick: 'Pick', put: 'Put', say: 'Say', repeat: 'Repeat', until: 'Until', 'if': 'If', when: 'When', count_inc: 'CountInc', trick: 'Trick', 'do': 'Do', ask: 'Ask' };
var band = Number(Inputs.band) === 1 ? 1 : 2;
var allowed = Array.isArray(Inputs.allowed) && Inputs.allowed.length ? Inputs.allowed : null;
var lang = String(Inputs.lang) === 'fr' ? 'fr' : 'en';
var rows = Array.isArray(Inputs.words) ? Inputs.words : [];
var word = {};
for (var i = 0; i < rows.length; i++) word[rows[i].key] = rows[i][lang] || rows[i].en || '';
var ids = band === 1 ? BAND1 : ALL;
var out = [];
for (var j = 0; j < ids.length; j++) {
  var id = ids[j];
  if (allowed && allowed.indexOf(id) === -1) continue;
  var m = META[id];
  out.push({ id: id, kind: m.kind, label: word['b' + LABEL[id]] || id, caption: word['c' + LABEL[id]] || id, hasBody: m.body, hasCount: m.count, slots: m.slots, band: band });
}
// Olive's rungs (CG-005): one entry per rung the request offers ('all' = the ladder), each with its picker. The exam
// gate: a rung this machine's exam FAILED is withheld (the Skills page shows it as "Olive can't do this here yet").
var rungIds = Inputs.rungs === 'all' ? OLIVE_ORDER : Array.isArray(Inputs.rungs) ? Inputs.rungs : [];
var withheld = oliveWithheld(Inputs.exam);
var olive = [], offered = [], heldHere = [];
for (var r = 0; r < rungIds.length; r++) {
  var rid = String(rungIds[r]), rr = OLIVE.rungs[rid];
  if (!rr || rid === 'voice-hint' || (Number(rr.band) || 1) > band) continue;
  if (withheld.indexOf(rid) !== -1) { heldHere.push(rid); continue; }
  offered.push(rid);
  var title = word[OLIVE_RUNG_WORD[rid]] || rid;
  olive.push({ id: 'ask:' + rid, kind: 'ask', label: title, caption: title, hasBody: false, hasCount: false, slots: olivePickerSlots(rid, band, lang, Inputs.narrow, word), band: band, rung: rid, shape: rr.shape, shapeLabel: word[OLIVE_SHAPE_WORD[rr.shape]] || rr.shape, ladder: rr.ladder });
}
if (rungIds.length) { var kept = []; for (var o = 0; o < out.length; o++) if (out[o].id !== 'ask') kept.push(out[o]); out = kept.concat(olive); }
Outputs.palette = out;
Outputs.olive = olive;
Outputs.offered = offered;
Outputs.withheld = withheld;
Outputs.heldHere = heldHere;
Outputs.count = out.length;
Outputs.band = band;
`;

// ── The save model ──────────────────────────────────────────────────────────

/**
 * The family model (v3): `{ v, family: { id, created }, profiles: [...], island: { activeId, done, placed } }`.
 * A profile is `{ id, name, band, lang, face, robot: { name, color, eye, hat }, tricks: { n1..n7 }, stickers, hats,
 * island: { done, placed } }` — ONE ISLAND PER KID (ruling 8): what a child has done and placed is hers.
 *
 * `model.island` is the island ON SCREEN: `activeId`, and `done`/`placed` DERIVED from the active profile (the very
 * same arrays, so a reader of `model.island.done` reads the active kid's). It is never read back from a v3 model:
 * `modelOf` re-derives it every time, so a stale copy in storage cannot leak into anyone's island.
 *
 * The migration rule for a v1/v2 family (one island for the family): EVERY existing profile keeps what the family had
 * done and placed — nobody loses a request they finished together. `migrationDue(raw)` says a stored model is older
 * than v3 so the page writes the migrated model back at once (an on-load migration owes its own save, P100).
 */
export const SAVE_HELPERS = `
var SAVE_VERSION = ${SAVE_VERSION};
var MAX_PROFILES = ${MAX_PROFILES};
var ROBOT_NAME_MAX = ${ROBOT_NAME_MAX};
var TRICK_KEYS = ${JSON.stringify(TRICK_KEYS)};
function newId(prefix) { return prefix + Date.now().toString(36) + Math.floor(Math.random() * 46656).toString(36); }
function tricksOf(raw) {
  var out = {};
  for (var i = 0; i < TRICK_KEYS.length; i++) { var v = raw && raw[TRICK_KEYS[i]]; out[TRICK_KEYS[i]] = v === 'bloom' || v === 'sprout' ? v : (TRICK_KEYS[i] === 'n1' ? 'sprout' : 'seed'); }
  return out;
}
function islandOf(raw) {
  var i = raw && typeof raw === 'object' ? raw : {};
  var done = [];
  var list = Array.isArray(i.done) ? i.done : [];
  for (var k = 0; k < list.length; k++) if (done.indexOf(String(list[k])) === -1) done.push(String(list[k]));
  return { done: done, placed: Array.isArray(i.placed) ? JSON.parse(JSON.stringify(i.placed)) : [] };
}
function profileOf(raw) {
  var p = raw && typeof raw === 'object' ? raw : {};
  var robot = p.robot && typeof p.robot === 'object' ? p.robot : {};
  return {
    id: String(p.id || newId('p')), name: String(p.name || '').slice(0, 24), band: Number(p.band) === 1 ? 1 : 2, lang: p.lang === 'fr' ? 'fr' : 'en',
    face: String(p.face || ''),
    robot: { name: String(robot.name || 'Pip').slice(0, ROBOT_NAME_MAX), color: String(robot.color || '#FF7A59'), eye: String(robot.eye || 'round'), hat: String(robot.hat || 'none') },
    tricks: tricksOf(p.tricks), stickers: Array.isArray(p.stickers) ? p.stickers.map(String) : [], hats: Array.isArray(p.hats) ? p.hats.map(String) : [],
    island: islandOf(p.island)
  };
}
/** A stored model older than v3 that has anyone in it: the page writes the migrated model back at once. */
function migrationDue(raw) {
  return !!raw && typeof raw === 'object' && Array.isArray(raw.profiles) && raw.profiles.length > 0 && !(Number(raw.v) >= SAVE_VERSION);
}
function modelOf(raw) {
  var m = raw && typeof raw === 'object' ? raw : {};
  var fam = m.family && typeof m.family === 'object' ? m.family : {};
  var isl = m.island && typeof m.island === 'object' ? m.island : {};
  var old = !(Number(m.v) >= SAVE_VERSION);
  var profiles = [];
  var list = Array.isArray(m.profiles) ? m.profiles : [];
  for (var i = 0; i < list.length && i < MAX_PROFILES; i++) {
    var p = profileOf(list[i]);
    // v1/v2: the family had one island. Every existing profile keeps what it had done and placed (the rule, CG-002 §8).
    if (old) p.island = islandOf(isl);
    profiles.push(p);
  }
  var model = { v: SAVE_VERSION, family: { id: String(fam.id || newId('f')), created: Number(fam.created) || Date.now() }, profiles: profiles, island: null };
  return activate(model, String(isl.activeId || (profiles[0] ? profiles[0].id : '')));
}
/** The profile playing: model.island becomes its island (the same arrays), never a copy that could go stale. */
function activate(model, id) {
  var active = null;
  for (var j = 0; j < model.profiles.length; j++) if (model.profiles[j].id === id) active = model.profiles[j];
  model.island = { activeId: String(id || ''), done: active ? active.island.done : [], placed: active ? active.island.placed : [] };
  return model;
}
function toB64(str) {
  var bytes = unescape(encodeURIComponent(str));
  var b64 = typeof btoa === 'function' ? btoa(bytes) : Buffer.from(bytes, 'binary').toString('base64');
  return b64.replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/, '');
}
function fromB64(code) {
  var b64 = String(code || '').trim().replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  var bytes = typeof atob === 'function' ? atob(b64) : Buffer.from(b64, 'base64').toString('binary');
  return decodeURIComponent(escape(bytes));
}
`;

/** A profile added to the family (at most six). The new one becomes active. */
export const ADD_PROFILE_SCRIPT = `${SAVE_HELPERS}
var model = modelOf(Inputs.model);
var name = String(Inputs.name || '').trim().slice(0, 24);
var ok = false, profileId = '', error = '';
if (!name) error = 'name';
else if (model.profiles.length >= MAX_PROFILES) error = 'full';
else {
  var p = profileOf({ name: name, band: Inputs.band, lang: Inputs.lang, face: Inputs.face, robot: { name: Inputs.robotName, color: Inputs.color, eye: Inputs.eye, hat: 'none' } });
  model.profiles.push(p);
  activate(model, p.id);
  profileId = p.id;
  ok = true;
}
Outputs.model = model;
Outputs.ok = ok;
Outputs.error = error;
Outputs.profileId = profileId;
Outputs.count = model.profiles.length;
`;

/**
 * A request finished by a profile: THAT profile's island marks it done (once;
 * one island per kid, ruling 8 — a sibling's island still offers it), the
 * profile's tricks bloom, and the reward is given to the profile that earned
 * it. Never a score.
 */
export const COMPLETE_REQUEST_SCRIPT = `${SAVE_HELPERS}
var model = modelOf(Inputs.model);
var requestId = String(Inputs.requestId || '');
var profileId = String(Inputs.profileId || model.island.activeId);
var tricks = Array.isArray(Inputs.tricks) ? Inputs.tricks : [];
var reward = Inputs.reward && typeof Inputs.reward === 'object' ? Inputs.reward : null;
var p = null;
for (var i = 0; i < model.profiles.length; i++) if (model.profiles[i].id === profileId) p = model.profiles[i];
var newlyDone = false, bloomed = [];
if (p) {
  if (requestId && p.island.done.indexOf(requestId) === -1) { p.island.done.push(requestId); newlyDone = true; }
  for (var t = 0; t < tricks.length; t++) { var key = 'n' + Math.floor(Number(tricks[t])); if (p.tricks[key] !== undefined && p.tricks[key] !== 'bloom') { p.tricks[key] = 'bloom'; bloomed.push(key); } }
  if (reward && reward.kind === 'hat' && p.hats.indexOf(String(reward.id)) === -1) p.hats.push(String(reward.id));
  if (reward && (reward.kind === 'sticker' || reward.kind === 'item' || reward.kind === 'seed') && p.stickers.indexOf(String(reward.id)) === -1) p.stickers.push(String(reward.id));
}
Outputs.model = model;
Outputs.newlyDone = newlyDone;
Outputs.bloomed = bloomed;
Outputs.found = !!p;
`;

/** The family as a code: base64 of the packed model with its version, like Rocket School's. */
export const ENCODE_SAVE_SCRIPT = `${SAVE_HELPERS}
var model = modelOf(Inputs.model);
var packed = { v: SAVE_VERSION, f: [model.family.id, model.family.created], p: [], a: model.island.activeId };
for (var i = 0; i < model.profiles.length; i++) {
  var p = model.profiles[i], tr = '';
  for (var k = 0; k < TRICK_KEYS.length; k++) tr += p.tricks[TRICK_KEYS[k]] === 'bloom' ? 'b' : p.tricks[TRICK_KEYS[k]] === 'sprout' ? 's' : '-';
  packed.p.push([p.id, p.name, p.band, p.lang, p.face, p.robot.name, p.robot.color, p.robot.eye, p.robot.hat, tr, p.stickers, p.hats, p.island.done, p.island.placed]);
}
var code = 'BG1.' + toB64(JSON.stringify(packed));
Outputs.code = code;
Outputs.length = code.length;
`;

/**
 * A code back into a model. A v1 code (no tricks, stickers, hats or placed
 * things) or a v2 code (one island for the family) decodes by the migration
 * rule — every profile keeps what the family had done — and says `migrated`,
 * so the page saves it at once: an on-load migration owes its own save (P100).
 */
export const DECODE_SAVE_SCRIPT = `${SAVE_HELPERS}
var code = String(Inputs.code || '').trim();
var ok = false, error = '', migrated = false, model = null;
try {
  if (code.indexOf('BG1.') !== 0) throw new Error('prefix');
  var packed = JSON.parse(fromB64(code.slice(4)));
  if (!packed || [1, 2, 3].indexOf(packed.v) === -1 || !Array.isArray(packed.p) || !Array.isArray(packed.f)) throw new Error('shape');
  var v2 = packed.v >= 2, v3 = packed.v >= 3;
  var family = { done: Array.isArray(packed.d) ? packed.d : [], placed: v2 && Array.isArray(packed.pl) ? packed.pl : [] };
  var profiles = [];
  for (var i = 0; i < packed.p.length; i++) {
    var a = packed.p[i];
    var tricks = {};
    if (v2 && typeof a[9] === 'string') for (var k = 0; k < TRICK_KEYS.length; k++) tricks[TRICK_KEYS[k]] = a[9].charAt(k) === 'b' ? 'bloom' : a[9].charAt(k) === 's' ? 'sprout' : 'seed';
    profiles.push({ id: a[0], name: a[1], band: a[2], lang: a[3], face: a[4], robot: { name: a[5], color: a[6], eye: a[7], hat: a[8] }, tricks: v2 ? tricks : undefined, stickers: v2 ? a[10] : [], hats: v2 ? a[11] : [], island: v3 ? { done: a[12], placed: a[13] } : family });
  }
  model = modelOf({ v: SAVE_VERSION, family: { id: packed.f[0], created: packed.f[1] }, profiles: profiles, island: { activeId: packed.a } });
  migrated = !v3;
  ok = true;
} catch (e) {
  error = 'bad';
}
// A bad code publishes NO model: a null on the page's store input would be written by the next writer that fires.
if (ok) Outputs.model = model;
Outputs.ok = ok;
Outputs.error = error;
Outputs.migrated = migrated;
Outputs.profiles = model ? model.profiles.length : 0;
`;

// ── Translate words ─────────────────────────────────────────────────────────

/**
 * Generated one line per word, because `Outputs[key]` in a loop mints no port.
 * `Inputs.words` is the `Data/Words` array of `{ key, en, fr }`; `{b}` is filled with the robot's name.
 */
export const TRANSLATE_SCRIPT = `
var lang = String(Inputs.lang) === 'fr' ? 'fr' : 'en';
var rows = Inputs.words || [];
var name = String(Inputs.botName || 'Pip');
var map = {};
for (var i = 0; i < rows.length; i++) map[rows[i].key] = String(rows[i][lang] || rows[i].en || '').split('{b}').join(name);
Outputs.lang = lang;
Outputs.isFr = lang === 'fr';
${WORD_KEYS.map((key) => `Outputs.${key} = map.${key} || '';`).join('\n')}
`;

/** The hint lines, every key as an output, for a page that shows more than one at once (the Skills page's Olive column). */
export const HINT_TABLE_SCRIPT = `
var lang = String(Inputs.lang) === 'fr' ? 'fr' : 'en';
var rows = Inputs.hints || [];
var name = String(Inputs.botName || 'Pip');
var map = {};
for (var i = 0; i < rows.length; i++) map[rows[i].key] = String(rows[i][lang] || rows[i].en || '').split('{b}').join(name);
Outputs.lang = lang;
${HINT_KEYS.map((key) => `Outputs.${key} = map.${key} || '';`).join('\n')}
`;

/** Every Function script the template ships, by the logic component that holds it. */
export const FUNCTION_SCRIPTS: ReadonlyArray<{ component: string; script: string; seam: string }> = [
  { component: 'Logic/New run', script: NEW_RUN_SCRIPT, seam: 'a program made ready to run: flattened, tricks inlined, handlers armed' },
  { component: 'Logic/Step', script: STEP_SCRIPT, seam: 'one primitive per tick: the delta, the block to glow, done, or parked on Olive' },
  { component: 'Logic/Apply delta', script: APPLY_DELTA_SCRIPT, seam: 'the world after a delta' },
  { component: 'Logic/Sense', script: SENSE_SCRIPT, seam: 'what a sensor reads, from the world only' },
  { component: 'Logic/Goal met', script: GOAL_SCRIPT, seam: 'is the goal met, and how much of it' },
  { component: 'Logic/Find repeat', script: FIND_REPEAT_SCRIPT, seam: 'the best repetition in a recording, and whether to offer the fold' },
  { component: 'Logic/Fold', script: FOLD_SCRIPT, seam: 'the program with a run folded into one repeat' },
  { component: 'Logic/Unfold', script: UNFOLD_SCRIPT, seam: 'a repeat laid back out as its steps' },
  { component: 'Logic/Predict end', script: PREDICT_END_SCRIPT, seam: 'the tile the robot ends on, and whether the tap hit it' },
  { component: 'Logic/Choose hint', script: CHOOSE_HINT_SCRIPT, seam: 'the hint key for the state the game knows' },
  { component: 'Logic/Hint line', script: HINT_LINE_SCRIPT, seam: 'the written line for a key, in the language' },
  { component: 'Logic/Palette', script: PALETTE_SCRIPT, seam: 'the blocks a band may use, labelled for the kit' },
  { component: 'Logic/Add profile', script: ADD_PROFILE_SCRIPT, seam: 'the family with one more profile' },
  { component: 'Logic/Complete request', script: COMPLETE_REQUEST_SCRIPT, seam: 'the island with a request done, the tricks bloomed, the reward given' },
  { component: 'Logic/Encode save code', script: ENCODE_SAVE_SCRIPT, seam: 'the family as a code' },
  { component: 'Logic/Decode save code', script: DECODE_SAVE_SCRIPT, seam: 'a code back into a family, migrated if it is old' },
  { component: 'Logic/Translate words', script: TRANSLATE_SCRIPT, seam: 'every interface word in the chosen language' },
  { component: 'Logic/Hint table', script: HINT_TABLE_SCRIPT, seam: 'every hint line in the chosen language' }
];

/**
 * Run a Function script the way the node does, for the gate: `Inputs` in,
 * `Outputs` out. Synchronous (no script here awaits: an Olive answer arrives as
 * an input on a later tick).
 */
type ScriptFn = (inputs: Record<string, unknown>, outputs: Record<string, any>) => void;
const compiled = new Map<string, ScriptFn>();
export function runScript(script: string, inputs: Record<string, unknown>): Record<string, any> {
  const outputs: Record<string, any> = {};
  let fn = compiled.get(script);
  if (!fn) {
    // Compiled once per script text, as the node compiles once; a mutant is a different text and compiles afresh.
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    fn = new Function('Inputs', 'Outputs', script) as ScriptFn;
    compiled.set(script, fn);
  }
  fn(inputs, outputs);
  return outputs;
}

/** The port names a script mints, the way the runtime mines them. */
export function portsOf(script: string): { inputs: string[]; outputs: string[] } {
  const inputs = new Set<string>();
  const outputs = new Set<string>();
  for (const m of script.matchAll(/Inputs\.([A-Za-z_$][\w$]*)/g)) inputs.add(m[1]);
  for (const m of script.matchAll(/Outputs\.([A-Za-z_$][\w$]*)/g)) outputs.add(m[1]);
  return { inputs: [...inputs].sort(), outputs: [...outputs].sort() };
}

/** Run a helper out of ENGINE (or another helper block) by name, for the gate. */
export function helper<T>(block: string, name: string, ...args: unknown[]): T {
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const fn = new Function('args', `${block}; return ${name}.apply(null, args);`);
  return fn(args) as T;
}
