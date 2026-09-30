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
// P106 IG-005: the robot catalogue, the upgrades, and the moves and controls every robot has.
import { ROBOTS_JSON, ROBOT_CONTROLS, ROBOT_MOVES, UPGRADES_JSON } from './cg002Content';
import { BLOCK_WORD, OLIVE_ENGINE, OLIVE_HELPERS, RUNG_SHAPE, RUNG_TEMPERATURE } from './cg005Olive';
// P108 IW-003 (lane P): what an envelope says, by the name on it.
import { ENVELOPE_NOTES } from './cg005Olive';
// P108 IW-002: the job model's vocabulary, its wear clock and its seeded layouts.
import { HEN_CAPACITY, JOB_ITEMS, JOB_KINDS, SITE_STAGES, WALL_TILE, WEAR } from './cg002Content';
// P108 IW-006 / IW-008 (session-4 base): the economy's names.
import { BRAIN_SIZE, BRAIN_SIZES, CREW_CAP, SHOP_JSON } from './cg002Content';

/** An `until` gives up after this many passes, whatever its sensor says. */
export const UNTIL_GUARD = 40;

/** A named trick calling itself (or a chain of tricks) is inlined no deeper than this. */
export const MAX_TRICK_DEPTH = 8;

/** A run that has not finished after this many ticks is declared not finishing (Predict, the gate). */
export const MAX_TICKS = 2000;

/** A finished request with more blocks than this is "done, but it could be shorter" (the mockup's `winMany`). */
export const MANY_BLOCKS = 8;
/**
 * The longest repeated sequence the fold looks for. The mockup's was six; IG-002's fetch-and-return dance (fill, turn
 * round, walk, water, step down, walk back) is nine, and a child's own route with a turn more is a little longer.
 */
export const FOLD_MAX_LEN = 12;
/** IG-002: what `fill` fills a robot's can to when the robot names no `canMax` (IG-005 upgrades it as a number). */
export const CAN_MAX = 3;
/** The highest Olive rung (18 since CG-006 s3 promoted six moments): a rung after the last one has no hint line of its own. */
export const OLIVE_RUNG_MAX = Math.max(...OLIVE_RUNGS.map((r) => r.n));

/** The dial on an `ask Olive` block: same every time · in between · surprise me (CG-005 §2). */
export const DIAL_TEMPERATURE = [0, 0.8, 1.2] as const;

/** Profiles per family. Siblings share a computer; six is a family. */
export const MAX_PROFILES = 6;

/**
 * The save model's current version. v3 (P105 s3, ruling 8): one island per kid — each profile carries its own
 * `island: { done, placed }`. A v1 or v2 family (one island for the family) decodes, loads and asks for its own save.
 * v4 (P106 IG-004, R1): `island: { done, plots, robots }` — a won plot keeps its program and the robot pinned to it;
 * `placed` (never written by anything) is dropped. A v3 family decodes, loads and asks for its own save.
 * v5 (P108 IW-006, session-4 base): each profile's `shells: { earned, spent }` and `owned` (what she bought); a plot's
 * `live` (its job as the island left it: things, age, seed, spent); a robot row's `brain` (only once bigger than
 * BRAIN_SIZE); robot rows of any id (copies, IW-008). A v4 family decodes with 0 shells, nothing owned, and asks for its save.
 */
export const SAVE_VERSION = 5;

/** IG-004: the one robot a v4 profile has (its look is `profile.robot`); IG-005 adds more under `island.robots`. */
export const FIRST_ROBOT_ID = 'r1';

/** The robot's name, at most this long (My robot and the new-player form cut at the same length). */
export const ROBOT_NAME_MAX = 16;

/** P108 IW-001 F8: the most block cards a profile keeps as seen (more than every card there is; a hand-edit is capped). */
export const CARDS_MAX = 64;

/** The trick keys on the Skills page, by TPL-012 §2.3 number. */
export const TRICK_KEYS = ['n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7'] as const;

/** The band-1 palette, for the scripts. */
const BAND1 = JSON.stringify(BAND_PALETTE[1]);
const ALL_BLOCKS = JSON.stringify(BAND_PALETTE[2]);

/** Which drawing class the kit gives each block (the mockup's `BLK` table), and which take a body or a count. */
export const BLOCK_META: Readonly<Record<string, { kind: 'motion' | 'action' | 'control' | 'ask'; body: boolean; count: boolean; slots: ReadonlyArray<string> }>> = {
  fwd: { kind: 'motion', body: false, count: false, slots: [] },
  left: { kind: 'motion', body: false, count: false, slots: [] },
  right: { kind: 'motion', body: false, count: false, slots: [] },
  water: { kind: 'action', body: false, count: false, slots: [] },
  fill: { kind: 'action', body: false, count: false, slots: [] },
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
  ask: { kind: 'ask', body: false, count: false, slots: ['rung', 'args', 'shape', 'dial'] },
  // P108 IW-005 (lane J): go to nearest [kind] · go to [thing chip | what Olive read] · set [name] to [value] · change [name] by [by].
  go_nearest: { kind: 'motion', body: false, count: false, slots: ['kind'] },
  go_to: { kind: 'motion', body: false, count: false, slots: ['thing'] },
  set: { kind: 'control', body: false, count: false, slots: ['name', 'value'] },
  change: { kind: 'control', body: false, count: false, slots: ['name', 'by'] }
};

// ── P108 IW-002: the seed — mulberry32 over the world's own seed, and the layouts a request lays from it ──────

/**
 * The seed helpers: the engine carries them, and so does `Start world` (its seed line), so the world a run starts on is
 * already laid. `rngOf(w)` draws from `w.seed` and writes the state back, so a world JSON is always its own replay.
 */
export const SEED_HELPERS = `
function rngOf(w) {
  return function () {
    var a = ((Number(w.seed) >>> 0) + 0x6D2B79F5) >>> 0;
    w.seed = a;
    var t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** A request's seeded layout on its world: a wall tile at one column of wallAt (on wallRow, else the robot's row); eggs on count of the tiles among. */
function layOut(w, seeded, rs) {
  var rnd = rngOf(w), sd = seeded && typeof seeded === 'object' ? seeded : {};
  if (Array.isArray(sd.wallAt) && sd.wallAt.length === 2 && Array.isArray(w.map)) {
    var lo = Math.floor(Number(sd.wallAt[0])), hi = Math.floor(Number(sd.wallAt[1]));
    if (hi < lo) { var sw = lo; lo = hi; hi = sw; }
    var wx = lo + Math.floor(rnd() * (hi - lo + 1));
    var wy = sd.wallRow !== undefined && sd.wallRow !== null && sd.wallRow !== '' ? Math.floor(Number(sd.wallRow)) : Math.floor(Number(rs && rs.y) || 0);
    if (wy >= 0 && wy < w.map.length && wx >= 0 && wx < String(w.map[wy]).length) { var row = String(w.map[wy]); w.map[wy] = row.slice(0, wx) + ${JSON.stringify(WALL_TILE)} + row.slice(wx + 1); }
  }
  if (sd.eggs && typeof sd.eggs === 'object' && Array.isArray(sd.eggs.among)) {
    var pool = sd.eggs.among.slice(), n = Math.max(0, Math.min(pool.length, Math.floor(Number(sd.eggs.count)) || 0));
    if (!Array.isArray(w.things)) w.things = [];
    for (var e = 0; e < n; e++) {
      var k = e + Math.floor(rnd() * (pool.length - e)), pk = pool[k];
      pool[k] = pool[e]; pool[e] = pk;
      w.things.push({ kind: 'egg', x: Math.floor(Number(pk[0])), y: Math.floor(Number(pk[1])) });
    }
  }
  // P108 IW-003 (s3 base): three more layouts, each over things named by their id, drawn AFTER the wall and the eggs (so
  // a seed lays those exactly as before). choose: one value of among into a thing's field (today's note, a colour);
  // shuffle: the values dealt one to each thing (the envelopes' names); place: a thing moved to one tile of among.
  var byId = function (id) { for (var q = 0; q < (w.things || []).length; q++) if (w.things[q] && String(w.things[q].id) === String(id)) return w.things[q]; return null; };
  if (Array.isArray(sd.choose)) for (var ci = 0; ci < sd.choose.length; ci++) {
    var ch = sd.choose[ci], cth = ch && byId(ch.thing);
    if (cth && ch.field && Array.isArray(ch.among) && ch.among.length) { var ck = Math.floor(rnd() * ch.among.length); cth[ch.field] = JSON.parse(JSON.stringify(ch.among[ck])); chosenTargets(w, ch, ck); }
  }
  if (sd.shuffle && Array.isArray(sd.shuffle.things) && Array.isArray(sd.shuffle.values) && sd.shuffle.field) {
    var deck = sd.shuffle.values.slice();
    for (var si = deck.length - 1; si > 0; si--) { var sj = Math.floor(rnd() * (si + 1)), sv = deck[si]; deck[si] = deck[sj]; deck[sj] = sv; }
    for (var st = 0; st < sd.shuffle.things.length && st < deck.length; st++) { var sth = byId(sd.shuffle.things[st]); if (sth) sth[sd.shuffle.field] = JSON.parse(JSON.stringify(deck[st])); }
  }
  if (Array.isArray(sd.place)) for (var pi = 0; pi < sd.place.length; pi++) {
    var pl = sd.place[pi], pth = pl && byId(pl.thing);
    if (pth && Array.isArray(pl.among) && pl.among.length) { var pt = pl.among[Math.floor(rnd() * pl.among.length)]; pth.x = Math.floor(Number(pt[0])); pth.y = Math.floor(Number(pt[1])); }
  }
  // P108 IW-003 (lane B): a thing laid beside the wall this seed drew (Biscuit's ball rolled into its corner); no draw.
  if (Array.isArray(sd.byWall) && wx !== undefined) layByWall(w, sd.byWall, wx, wy, byId);
  return w;
}
/**
 * P108 IW-003 (lane B): byWall — each { thing, dx, dy, spotOn } moves the thing with that id to the wall's tile plus
 * (dx, dy), and writes that tile as the spot of the container spotOn names (where the thing goes back when the container
 * wears: rollOut). Laid after place; it draws nothing from the seed, so every other layout lays exactly as before.
 */
function layByWall(w, list, wx, wy, byId) {
  for (var i = 0; i < list.length; i++) {
    var e = list[i], t = e && byId(e.thing);
    if (!t) continue;
    t.x = wx + (Math.floor(Number(e.dx)) || 0); t.y = wy + (Math.floor(Number(e.dy)) || 0);
    var box = e.spotOn ? byId(e.spotOn) : null;
    if (box) box.spot = [t.x, t.y];
  }
}
/** The world a run starts on, given its seed (none: one is picked): the job copied in, the seeded layout laid. A request with neither is untouched. */
function seedWorld(world, req, seed) {
  if (!world || !req || (!req.seeded && !req.job)) return world;
  world.seed = seed !== undefined && seed !== null && seed !== '' && isFinite(Number(seed)) ? Number(seed) >>> 0 : (Date.now() ^ Math.floor(Math.random() * 4294967296)) >>> 0;
  if (req.job) world.job = JSON.parse(JSON.stringify(req.job));
  if (req.seeded) layOut(world, req.seeded, req.robotStart);
  return world;
}
// P108 IW-003 (lane M): a choose may carry the job's targets for each of its values (index-aligned): the value drawn
// sets the targets too, so the job follows the day (Mamie's note says the yellow ones: the yellow row is the job). No draw.
function chosenTargets(w, ch, k) {
  if (!Array.isArray(ch.targets) || !Array.isArray(ch.targets[k]) || !w.job || typeof w.job !== 'object') return;
  w.job.targets = JSON.parse(JSON.stringify(ch.targets[k]));
}
`;

// ── The engine helpers, shared by every script that runs a program ─────────

export const ENGINE = `
var DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];
var BLOCKING_TILES = { W: 1, R: 1, T: 1, H: 1, L: 1 };
// IG-002: a rock (a mineable thing on grass) and a sign block a move like a tulip; a note on the ground does not.
var BLOCKING_THINGS = { tulip: 1, bowl: 1, rock: 1, sign: 1, basket: 1, store: 1, can: 1, hen: 1, postbox: 1, door: 1 };
// P108 IW-002: the job model (brief §4.2) — its kinds and their roles, a container's item, the wear clock (island ticks only).
var JOB_KINDS = ${JSON.stringify(JOB_KINDS)};
var JOB_ITEMS = ${JSON.stringify(JOB_ITEMS)};
var WEAR = ${JSON.stringify(WEAR)};
var HEN_CAPACITY = ${HEN_CAPACITY};
var SITE_STAGES = ${JSON.stringify(SITE_STAGES)};
var CAN_MAX = ${CAN_MAX};
var PICKABLE = { letter: 1, egg: 1, stone: 1, food: 1, ball: 1 };
var UNTIL_GUARD = ${UNTIL_GUARD};
var MAX_TRICK_DEPTH = ${MAX_TRICK_DEPTH};
var MAX_TICKS = ${MAX_TICKS};
var DIAL_TEMPERATURE = ${JSON.stringify(DIAL_TEMPERATURE)};
var ASK_SHAPE = ${JSON.stringify(RUNG_SHAPE)};
var ASK_TEMPERATURE = ${JSON.stringify(RUNG_TEMPERATURE)};
var ASK_BLOCK = ${JSON.stringify(BLOCK_WORD)};
var ASK_RESERVED = { rung: 1, args: 1, shape: 1, dial: 1, options: 1, times: 1 };
${OLIVE_ENGINE}
${SEED_HELPERS}
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
  // P108 IW-002: a job names its targets by id; one named by its tile [x, y] is given an id (t + its index) here.
  var jb = jobOf(w);
  if (jb) {
    for (var ti = 0; ti < jb.targets.length; ti++) {
      var tg = jb.targets[ti];
      if (!Array.isArray(tg)) { jb.targets[ti] = String(tg); continue; }
      var hit = null;
      for (var q = 0; q < w.things.length && !hit; q++) { var cand = w.things[q]; if (cand && cand.x === Number(tg[0]) && cand.y === Number(tg[1]) && (JOB_KINDS[cand.kind] === 'target' || JOB_KINDS[cand.kind] === 'container')) hit = cand; }
      if (hit && !hit.id) hit.id = 't' + w.things.indexOf(hit);
      jb.targets[ti] = hit ? String(hit.id) : '';
    }
  }
  for (var si = 0; si < w.things.length; si++) if (w.things[si] && w.things[si].kind === 'site') w.things[si].stage = stageOf(w.things[si]);
  return w;
}
/** IW-002: a full path site reads as path (P) whatever the map says under it; the site thing stays (wear can take a stone back). */
function tileAt(w, x, y) {
  if (x < 0 || y < 0 || y >= w.h || x >= w.w) return '';
  var c = String(w.map[y]).charAt(x);
  // P108 IW-003 (lane S): a path square only (pathSite) — a finished bench is not path.
  if (c !== 'P' && Array.isArray(w.things)) for (var i = 0; i < w.things.length; i++) { var t = w.things[i]; if (t && pathSite(t) && t.x === x && t.y === y && isFull(t)) return 'P'; }
  return c;
}
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
  for (var i = 0; i < th.length; i++) if (BLOCKING_THINGS[th[i].kind] || buildSite(th[i])) return true;
  return false;
}
function robotOf(w, id) { for (var i = 0; i < w.robots.length; i++) if (w.robots[i].id === id) return w.robots[i]; return w.robots[0] || null; }
function front(r) { return { x: r.x + DX[r.d], y: r.y + DY[r.d] }; }
function basketOf(r) { return Math.max(1, Math.floor(Number(r.basket)) || 4); }
/** IG-002: the can. null = this robot has no can (water is free, as before IG-002); a number is the waters it holds. */
function canOf(r) { if (!r || r.can === undefined || r.can === null || r.can === '' || !isFinite(Number(r.can))) return null; return Math.max(0, Math.floor(Number(r.can))); }
function canMaxOf(r) { return Number(r.canMax) > 0 ? Math.floor(Number(r.canMax)) : CAN_MAX; }
/** A tile whose rock was mined to nothing (the world's spent list: the rock thing itself is gone). */
function spentAt(w, x, y) { return Array.isArray(w.spent) && w.spent.indexOf(x + ',' + y) !== -1; }
function tulipsOf(w) { var n = 0, wet = 0; for (var i = 0; i < w.things.length; i++) if (w.things[i].kind === 'tulip') { n++; if (w.things[i].watered) wet++; } return { total: n, watered: wet }; }
// ── P108 IW-002: the job model — meters, containers, the can as a thing, the finish line, the walk home, wear ──
function jobOf(w) { return w && w.job && typeof w.job === 'object' && Array.isArray(w.job.targets) ? w.job : null; }
function thingById(w, id) { if (id === undefined || id === null || id === '') return null; for (var i = 0; i < w.things.length; i++) if (w.things[i] && String(w.things[i].id) === String(id)) return w.things[i]; return null; }
/** The thing a delta names: by its id, else the first of its kind on its tile. */
function thingOf(w, ref, kinds) {
  var t = ref && ref.id ? thingById(w, ref.id) : null;
  if (t) return t;
  for (var i = 0; i < w.things.length; i++) { var c = w.things[i]; if (c && c.x === ref.x && c.y === ref.y && (kinds ? kinds[c.kind] : c.kind === ref.kind)) return c; }
  return null;
}
function itemOf(t) { return String((t && t.item) || JOB_ITEMS[t && t.kind] || ''); }
/** A tulip with a meter (have or need set). One without keeps today's watered flag: need 1, one pour. */
function hasMeter(t) { return !!t && ((t.need !== undefined && t.need !== null) || (t.have !== undefined && t.have !== null)); }
/** A thing's meter: a tulip's drinks, a site's stones, a container's count of its capacity (none: never full). */
function meterOf(t) {
  if (!t) return { have: 0, need: 0 };
  if (t.kind === 'tulip') {
    var nd = Number(t.need) > 0 ? Math.floor(Number(t.need)) : 1;
    var hv = t.have !== undefined && t.have !== null && isFinite(Number(t.have)) ? Math.max(0, Math.floor(Number(t.have))) : (t.watered ? nd : 0);
    return { have: Math.min(hv, nd), need: nd };
  }
  if (t.kind === 'site') { var sn = Number(t.need) > 0 ? Math.floor(Number(t.need)) : 1; return { have: Math.max(0, Math.min(sn, Math.floor(Number(t.have)) || 0)), need: sn }; }
  if (JOB_KINDS[t.kind] === 'container') {
    var cn = t.count !== undefined && t.count !== null ? t.count : t.food;
    return { have: Math.max(0, Math.floor(Number(cn)) || 0), need: Number(t.capacity) > 0 ? Math.floor(Number(t.capacity)) : Infinity };
  }
  return { have: 0, need: 0 };
}
function isFull(t) { var m = meterOf(t); return m.need > 0 && m.have >= m.need; }
function meterDelta(t, x, y, have) { var m = meterOf(t); return { id: String(t.id || ''), x: x, y: y, have: have, need: isFinite(m.need) ? m.need : 0 }; }
/** A site's look: dirt (0) · gravel (under half) · cobbles (under full) · path (full). */
function stageOf(t) { var m = meterOf(t); return SITE_STAGES[m.have <= 0 ? 0 : m.have * 2 < m.need ? 1 : m.have < m.need ? 2 : 3]; }
/** Write a meter (never below 0, never above the need): a tulip's drinks and watered flag, a site's stones and stage, a container's count (a bowl's food too). */
function setMeter(t, have) {
  var m = meterOf(t), h = Math.max(0, Math.floor(Number(have)) || 0);
  if (isFinite(m.need)) h = Math.min(m.need, h);
  if (t.kind === 'tulip') { if (hasMeter(t)) t.have = h; t.watered = h >= m.need; }
  else if (t.kind === 'site') { t.have = h; t.stage = stageOf(t); }
  else if (JOB_KINDS[t.kind] === 'container') { t.count = h; if (t.kind === 'bowl') t.food = h; }
}
/** A can world: a can lies on the map, or a robot holds one, or a robot row says it needs one. There, fill and water need the can in hand. */
function canWorld(w) {
  for (var i = 0; i < w.things.length; i++) if (w.things[i] && w.things[i].kind === 'can') return true;
  for (var j = 0; j < w.robots.length; j++) if (w.robots[j].holds === 'can' || w.robots[j].needsCan === true) return true;
  return false;
}
/** How much of the job is done: its targets, and how many are full. */
function jobProgress(w) {
  var j = jobOf(w), full = 0, total = 0;
  if (!j) return { full: 0, total: 0 };
  for (var i = 0; i < j.targets.length; i++) { total++; if (isFull(thingById(w, j.targets[i]))) full++; }
  return { full: full, total: total };
}
function jobDone(w) { var p = jobProgress(w); return p.total > 0 && p.full === p.total; }
/** The robot's home: its own (r.home as a tile) or the job's. */
function homeOf(w, r) {
  if (r && r.home && typeof r.home === 'object' && isFinite(Number(r.home.x)) && isFinite(Number(r.home.y))) return r.home;
  var j = jobOf(w);
  return j && j.home && typeof j.home === 'object' && isFinite(Number(j.home.x)) && isFinite(Number(j.home.y)) ? j.home : null;
}
/** The first tile of a shortest path from one tile to another over tiles that do not block (breadth first; up, right, down, left). */
function bfsNext(w, fx, fy, tx, ty) {
  if (fx === tx && fy === ty) return null;
  var from = {}, start = fx + ',' + fy, q = [[fx, fy]], head = 0;
  from[start] = '';
  while (head < q.length) {
    var c = q[head++];
    if (c[0] === tx && c[1] === ty) break;
    for (var d = 0; d < 4; d++) {
      var nx = c[0] + DX[d], ny = c[1] + DY[d], k = nx + ',' + ny;
      if (from[k] !== undefined || blocked(w, nx, ny)) continue;
      from[k] = c[0] + ',' + c[1];
      q.push([nx, ny]);
    }
  }
  var cur = tx + ',' + ty;
  if (from[cur] === undefined) return null;
  while (from[cur] !== start) cur = from[cur];
  var p = cur.split(',');
  return { x: Number(p[0]), y: Number(p[1]) };
}
/** One tick of the walk home (the engine's, not the child's program): a turn or a step on the shortest path; at home, face home.d, then the home event. */
function homeStep(w, run, s, delta) {
  var r = robotOf(w, run.robotId), hm = r ? homeOf(w, r) : null;
  delta.op = 'home';
  s.guard = (Number(s.guard) || 0) + 1;
  if (!r || !hm || s.guard > (w.w * w.h + 4) * 3) { delta.nothing = true; if (r) delta.lost = { id: r.id, x: r.x, y: r.y }; run.pc++; return; }
  var hx = Math.floor(Number(hm.x)), hy = Math.floor(Number(hm.y)), want = r.d;
  if (r.x === hx && r.y === hy) {
    if (hm.d !== undefined && hm.d !== null && hm.d !== '' && isFinite(Number(hm.d))) want = ((Math.floor(Number(hm.d)) % 4) + 4) % 4;
    if (want === r.d) { delta.home = { id: r.id, x: r.x, y: r.y }; delta.sayKey = 'sayHome'; run.pc++; return; }
  } else {
    var nx = bfsNext(w, r.x, r.y, hx, hy);
    if (!nx) { delta.nothing = true; delta.lost = { id: r.id, x: r.x, y: r.y }; run.pc++; return; }
    for (var d = 0; d < 4; d++) if (r.x + DX[d] === nx.x && r.y + DY[d] === nx.y) want = d;
    if (want === r.d) { delta.move = { id: r.id, x: nx.x, y: nx.y }; return; }
  }
  delta.turn = { id: r.id, d: (want - r.d + 4) % 4 === 3 ? (r.d + 3) % 4 : (r.d + 1) % 4 };
}
/**
 * Wear (R2, D7): what the world loses and grows at island tick age — ONLY the island tick calls this, never step or
 * runToEnd. One thing of each worn kind per period (a tulip, a bowl, a basket, a store: picked by the seed; a site: the
 * most walked), never below 0; a rock with a max regrows a stone; a hen lays on a free tile of her pen; a letter comes.
 * Returns deltas for apply (the only writer); the last carries the seed when a draw was made.
 */
function wearOf(worldIn, age) {
  var w = worldOf(worldIn), out = [], n = Math.floor(Number(age)) || 0, drew = false;
  if (n <= 0) return out;
  var rnd = rngOf(w);
  function due(kind) { return Number(WEAR[kind]) > 0 && n % Number(WEAR[kind]) === 0; }
  var picked = ['tulip', 'bowl', 'basket', 'store'];
  for (var k = 0; k < picked.length; k++) {
    if (!due(picked[k])) continue;
    var pool = [];
    for (var i = 0; i < w.things.length; i++) if (w.things[i] && w.things[i].kind === picked[k] && meterOf(w.things[i]).have > 0) pool.push(w.things[i]);
    if (!pool.length) continue;
    var t = pool[Math.floor(rnd() * pool.length)];
    drew = true;
    out.push({ wear: { id: String(t.id || ''), kind: t.kind, x: t.x, y: t.y, have: meterOf(t).have - 1 } });
  }
  if (due('site')) {
    var best = null;
    for (var s2 = 0; s2 < w.things.length; s2++) { var st = w.things[s2]; if (st && st.kind === 'site' && meterOf(st).have > 0 && (!best || (Number(st.walked) || 0) > (Number(best.walked) || 0))) best = st; }
    if (best) out.push({ wear: { id: String(best.id || ''), kind: 'site', x: best.x, y: best.y, have: meterOf(best).have - 1 } });
  }
  if (due('rock')) for (var r2 = 0; r2 < w.things.length; r2++) { var rk = w.things[r2]; if (rk && rk.kind === 'rock' && Number(rk.max) > 0 && (Math.floor(Number(rk.left)) || 0) < Math.floor(Number(rk.max))) out.push({ regrow: { id: String(rk.id || ''), x: rk.x, y: rk.y, left: (Math.floor(Number(rk.left)) || 0) + 1 } }); }
  if (due('hen')) for (var h = 0; h < w.things.length; h++) {
    var hen = w.things[h];
    if (!hen || hen.kind !== 'hen' || !Array.isArray(hen.pen) || hen.pen.length !== 4) continue;
    var x0 = Math.min(hen.pen[0], hen.pen[2]), x1 = Math.max(hen.pen[0], hen.pen[2]), y0 = Math.min(hen.pen[1], hen.pen[3]), y1 = Math.max(hen.pen[1], hen.pen[3]);
    var cap = Number(hen.capacity) > 0 ? Math.floor(Number(hen.capacity)) : HEN_CAPACITY, eggs = 0, free = [];
    for (var py = y0; py <= y1; py++) for (var px = x0; px <= x1; px++) {
      eggs += thingsAt(w, px, py, 'egg').length;
      if (tileAt(w, px, py) !== '' && !blocked(w, px, py) && !thingsAt(w, px, py).length) free.push({ x: px, y: py });
    }
    if (eggs >= cap || !free.length) continue;
    var at = free[Math.floor(rnd() * free.length)];
    drew = true;
    out.push({ lay: { x: at.x, y: at.y } });
  }
  if (due('postbox')) for (var b = 0; b < w.things.length; b++) { var pb = w.things[b]; if (pb && pb.kind === 'postbox' && !thingsAt(w, pb.x, pb.y, 'letter').length) out.push({ letter: { x: pb.x, y: pb.y } }); }
  // P108 IW-003 (lane P): a door's owner takes a letter in; the post box's new letter is addressed.
  if (mailWear(w, n, rnd, out)) drew = true;
  if (drew) out.push({ seed: w.seed });
  return out;
}
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
  if (name === 'can_empty') { var cn = canOf(r); return cn !== null && cn <= 0; }
  if (name === 'count_is') return (Number(run.count) || 0) === Number(arg);
  if (name === 'olive_says') return oliveSays(run, arg);
  // IG-001 D7: the picker offers "Olive says yes" / "Olive says no" as one sensor value each (olive_says:yes, olive_says:no).
  if (name.indexOf('olive_says:') === 0) return oliveSays(run, name.slice(11));
  // IG-006 AC2: "if Olive read [red tulip]" — the thing her last read answer named (its id, so either language matches).
  if (name.indexOf('olive_read:') === 0) return !!run.lastAnswer && run.lastAnswer.object === name.slice(11);
  return false;
}
// ── P108 IW-005 (lane J): conditions and values (brief 4.3), seek (go to nearest, go to), reservation ──────────
/** An expression nested deeper than this is malformed: the whole of it reads as false / 0 (it never throws out, never hangs). */
var EXPR_DEPTH = 32;
function exprText(v) { return String(v === undefined || v === null ? '' : v).trim().toLowerCase(); }
function exprNum(v) { if (typeof v === 'number') return isFinite(v) ? v : null; if (typeof v === 'string' && v.trim() !== '' && isFinite(Number(v))) return Number(v); return null; }
function isSet(v) { return v !== undefined && v !== null && v !== ''; }
function reservedOf(w) { return w && w.reserved && typeof w.reserved === 'object' && !Array.isArray(w.reserved) ? w.reserved : {}; }
/** A thing's id for a reservation: its own, else one minted from its kind and tile (kind@x,y, then #2, #3 when taken). */
function mintId(w, t) {
  if (isSet(t.id)) return String(t.id);
  var base = String(t.kind) + '@' + t.x + ',' + t.y, id = base, n = 1;
  while (thingById(w, id)) id = base + '#' + (++n);
  return id;
}
/**
 * The thing Olive's last read names: the first thing whose id, name or owner is her object (or whose read-object id is,
 * so red_tulip finds the red tulip); then, when her word is no object id (a name: "Mamie"), the first whose id, name or
 * owner is that word. null when she read nothing.
 */
function readThing(w, run) {
  var a = run && run.lastAnswer;
  if (!a || typeof a !== 'object') return null;
  var obj = exprText(a.object), said = a.value !== undefined && a.value !== null ? a.value : a.text;
  var word = Array.isArray(said) || typeof said === 'object' ? '' : exprText(said);
  var keys = [obj, word];
  for (var p = 0; p < keys.length; p++) {
    if (!keys[p]) continue;
    for (var i = 0; i < w.things.length; i++) {
      var t = w.things[i];
      if (!t) continue;
      if (exprText(t.id) === keys[p] || exprText(t.name) === keys[p] || exprText(t.owner) === keys[p] || (p === 0 && oliveObjectOf(t) === keys[p])) return t;
    }
  }
  return null;
}
/**
 * A REF resolved against the world: { kind, x, y } plus thing (a thing on the map), tile (ahead / here), held (what the
 * robot carries: kind can when it holds the can, else kind held = its carry list) or robot. null = not found.
 */
function refOf(w, run, r, ref) {
  if (!ref || typeof ref !== 'object' || Array.isArray(ref) || !r) return null;
  var which = ref.ref;
  if (which === 'ahead' || which === 'here') { var p = which === 'ahead' ? front(r) : { x: r.x, y: r.y }; return { kind: which, tile: true, x: p.x, y: p.y }; }
  if (which === 'held') return { kind: r.holds === 'can' ? 'can' : 'held', held: true, x: r.x, y: r.y };
  if (which === 'robot') return { kind: 'robot', robot: true, x: r.x, y: r.y };
  if (which === 'read') { var rt = readThing(w, run); return rt ? { kind: String(rt.kind), thing: rt, x: rt.x, y: rt.y } : null; }
  if (isSet(which)) return null;
  // A chip picked on the world: by its id, else the first thing of its kind on its tile, else (a can) the can the robot holds.
  var byId = isSet(ref.id) ? thingById(w, ref.id) : null;
  if (byId) return { kind: String(byId.kind), thing: byId, x: byId.x, y: byId.y };
  var k = String(ref.kind || ''), x = Math.floor(Number(ref.x)), y = Math.floor(Number(ref.y));
  for (var i = 0; i < w.things.length; i++) { var t = w.things[i]; if (t && t.kind === k && t.x === x && t.y === y) return { kind: k, thing: t, x: t.x, y: t.y }; }
  if (k === 'can' && r.holds === 'can') return { kind: 'can', held: true, x: r.x, y: r.y };
  return null;
}
function carried(r, what) { var n = 0; for (var i = 0; i < r.carry.length; i++) if (String(r.carry[i]) === what) n++; return n; }
/** How many of what the thing holds (VAL count): a container's count of its own item; what the robot carries; the things on a tile; a hen's eggs in her pen. */
function countIn(w, r, it, what) {
  if (!it) return 0;
  if (it.tile) return thingsAt(w, it.x, it.y, what).length;
  if (it.robot || it.held) return carried(r, what);
  var t = it.thing;
  if (JOB_KINDS[t.kind] === 'container') return itemOf(t) === what ? meterOf(t).have : 0;
  if (t.kind === 'hen' && what === 'egg' && Array.isArray(t.pen) && t.pen.length === 4) {
    var n = 0, x0 = Math.min(t.pen[0], t.pen[2]), x1 = Math.max(t.pen[0], t.pen[2]), y0 = Math.min(t.pen[1], t.pen[3]), y1 = Math.max(t.pen[1], t.pen[3]);
    for (var py = y0; py <= y1; py++) for (var px = x0; px <= x1; px++) n += thingsAt(w, px, py, 'egg').length;
    return n;
  }
  return 0;
}
/** A thing's level (VAL level): a can's water (held or on the map), a container's count, a target's have, a rock's stones; held with no can, or the robot: how many it carries. */
function levelIn(w, r, it) {
  if (!it || it.tile) return 0;
  if (it.robot) return r.carry.length;
  if (it.held) return it.kind === 'can' ? canOf(r) || 0 : r.carry.length;
  var t = it.thing;
  if (t.kind === 'can') return Math.max(0, Math.floor(Number(t.level)) || 0);
  if (t.kind === 'rock') return Math.max(0, Math.floor(Number(t.left)) || 0);
  if (t.kind === 'tulip' || t.kind === 'site' || JOB_KINDS[t.kind] === 'container') return meterOf(t).have;
  return 0;
}
/** Is the thing in that state (COND is; the states by kind, brief 4.3). Unknown state or thing: false. */
function stateOf(w, r, it, state, n, what) {
  if (!it) return false;
  var need = isSet(n) && isFinite(Number(n)) ? Number(n) : 1;
  if (state === 'front') { var f = front(r); return !it.held && !it.robot && it.x === f.x && it.y === f.y; }
  if (it.tile) {
    if (state === 'wall') return blocked(w, it.x, it.y);
    var on = thingsAt(w, it.x, it.y), real = [];
    for (var i = 0; i < on.length; i++) if (on[i].kind !== 'puddle') real.push(on[i]);
    if (state === 'nothing') return !real.length && !blocked(w, it.x, it.y);
    if (state === 'has') { if (!isSet(what)) return real.length > 0; for (var j = 0; j < real.length; j++) if (real[j].kind === String(what)) return true; return false; }
    return false;
  }
  if ((it.held && it.kind === 'held') || it.robot) {
    if (state === 'empty') return r.carry.length === 0;
    if (state === 'full') return r.carry.length >= basketOf(r);
    if (state === 'has') return (isSet(what) ? carried(r, String(what)) : r.carry.length) >= need;
    return false;
  }
  var lv = null, mx = 0;
  if (it.held) { lv = canOf(r) || 0; mx = canMaxOf(r); }
  else if (it.thing.kind === 'can') { lv = Math.max(0, Math.floor(Number(it.thing.level)) || 0); mx = Number(it.thing.max) > 0 ? Math.floor(Number(it.thing.max)) : CAN_MAX; }
  if (lv !== null) { if (state === 'empty') return lv <= 0; if (state === 'full') return lv >= mx; if (state === 'has') return lv >= need; return false; }
  var t = it.thing, m = meterOf(t);
  if (JOB_KINDS[t.kind] === 'container') { if (state === 'empty') return m.have <= 0; if (state === 'full') return isFinite(m.need) && m.have >= m.need; if (state === 'has') return m.have >= need; return false; }
  if (t.kind === 'tulip') { if (state === 'drunk') return isFull(t); if (state === 'thirsty') return !isFull(t); return false; }
  if (t.kind === 'site') { if (state === 'done') return isFull(t); if (state === 'dirt') return m.have <= 0; return false; }
  if (t.kind === 'rock') { var left = Math.floor(Number(t.left)) || 0; if (state === 'stones') return left > 0; if (state === 'used') return left <= 0; return false; }
  return false;
}
function valOf(w, run, r, v, depth) {
  if (depth > EXPR_DEPTH) throw new Error('deep');
  if (!v || typeof v !== 'object' || Array.isArray(v)) return 0;
  if (v.op === 'num') { var n = Number(v.n); return isFinite(n) ? n : 0; }
  if (v.op === 'text') return isSet(v.s) && typeof v.s !== 'object' ? String(v.s) : '';
  if (v.op === 'var') { var vs = run.vars && typeof run.vars === 'object' ? run.vars : {}, k = String(v.name); var x = Object.prototype.hasOwnProperty.call(vs, k) ? vs[k] : 0; return typeof x === 'number' || typeof x === 'string' ? x : 0; }
  if (v.op === 'read') { var a = run.lastAnswer; if (!a || typeof a !== 'object') return ''; if (isSet(a.object)) return String(a.object); var said = a.value !== undefined && a.value !== null ? a.value : a.text; return isSet(said) && typeof said !== 'object' ? String(said) : ''; }
  if (v.op === 'count') return countIn(w, r, refOf(w, run, r, v.thing), String(v.what || ''));
  if (v.op === 'level') return levelIn(w, r, refOf(w, run, r, v.thing));
  return 0;
}
function condOf(w, run, r, c, depth) {
  if (depth > EXPR_DEPTH) throw new Error('deep');
  if (!c || typeof c !== 'object' || Array.isArray(c)) return false;
  var subA = !!c.a && typeof c.a === 'object', subB = !!c.b && typeof c.b === 'object';
  if (c.op === 'and') return subA && subB && condOf(w, run, r, c.a, depth + 1) && condOf(w, run, r, c.b, depth + 1);
  if (c.op === 'or') return subA && subB && (condOf(w, run, r, c.a, depth + 1) || condOf(w, run, r, c.b, depth + 1));
  if (c.op === 'not') return subA && !condOf(w, run, r, c.a, depth + 1);
  if (c.op === 'sensor') return sense(w, run, String(c.sensor || ''), c.arg);
  if (c.op === 'cmp') {
    if (!subA || !subB) return false;
    var a = valOf(w, run, r, c.a, depth + 1), b = valOf(w, run, r, c.b, depth + 1), na = exprNum(a), nb = exprNum(b);
    if (na !== null && nb !== null) return c.cmp === 'eq' ? na === nb : c.cmp === 'lt' ? na < nb : c.cmp === 'gt' ? na > nb : false;
    return c.cmp === 'eq' && typeof a === 'string' && typeof b === 'string' ? exprText(a) === exprText(b) : false;
  }
  if (c.op === 'is') return stateOf(w, r, refOf(w, run, r, c.thing), String(c.state || ''), c.n, c.what);
  return false;
}
/** A COND on the world and the run: never throws — a malformed expression, an unknown state, a thing not found: false. */
function evalCond(w, run, c) { try { var r = robotOf(w, run && run.robotId); return !!r && condOf(w, run || {}, r, c, 0); } catch (e) { return false; } }
/** A VAL on the world and the run: a number or a text; never throws (0). */
function evalVal(w, run, v) { try { var r = robotOf(w, run && run.robotId); return r ? valOf(w, run || {}, r, v, 0) : 0; } catch (e) { return 0; } }
/** The sensor names a COND reads (its sensor leaves), for the senses goal. */
function condSensors(c, out, depth) {
  if (!c || typeof c !== 'object' || depth > EXPR_DEPTH) return out;
  if (c.op === 'sensor' && isSet(c.sensor)) out.push(String(c.sensor));
  condSensors(c.a, out, depth + 1); condSensors(c.b, out, depth + 1);
  return out;
}
/** An until / if step's condition: its cond when it has one (the sensor and arg ignored), else its sensor as before. */
function checkOf(w, run, s) { return s.cond !== undefined ? evalCond(w, run, s.cond) : sense(w, run, s.sensor, s.arg); }
/**
 * Every tile's path length from a tile over tiles that do not block, and the tile each was reached from (breadth first:
 * up, right, down, left). The world IS the robot's plot (the island steps each plot on its own map): off the map blocks, so a search never leaves the plot.
 */
function pathsFrom(w, fx, fy) {
  var dist = {}, from = {}, q = [[fx, fy]], head = 0;
  dist[fx + ',' + fy] = 0; from[fx + ',' + fy] = '';
  while (head < q.length) {
    var c = q[head++], dc = dist[c[0] + ',' + c[1]];
    for (var d = 0; d < 4; d++) {
      var nx = c[0] + DX[d], ny = c[1] + DY[d], k = nx + ',' + ny;
      if (dist[k] !== undefined || blocked(w, nx, ny)) continue;
      dist[k] = dc + 1; from[k] = c[0] + ',' + c[1];
      q.push([nx, ny]);
    }
  }
  return { dist: dist, from: from };
}
/** The tile to face a thing from: of its four neighbours (up, right, down, left of it) the one the robot reaches soonest (the first on a tie). */
function standFor(ps, t) {
  var best = null;
  for (var d = 0; d < 4; d++) { var sx = t.x + DX[d], sy = t.y + DY[d], n = ps.dist[sx + ',' + sy]; if (n !== undefined && (!best || n < best.n)) best = { x: sx, y: sy, d: (d + 2) % 4, n: n }; }
  return best;
}
/** The tiles from the robot to a stand tile, first step first. */
function routeTo(ps, st) {
  var out = [], cur = st.x + ',' + st.y;
  while (ps.from[cur]) { var p = cur.split(','); out.unshift([Number(p[0]), Number(p[1])]); cur = ps.from[cur]; }
  return out;
}
/**
 * go to nearest: of the things of that kind not reserved by another robot, the one the robot reaches in the fewest
 * steps; a tie goes to the upper one, then the left one (then the first in the world). null = none reachable.
 */
function nearestOf(w, r, kind, ps) {
  var res = reservedOf(w), best = null;
  for (var i = 0; i < w.things.length; i++) {
    var t = w.things[i];
    if (!t || t.kind !== kind) continue;
    if (seekSkips(t)) continue; // P108 IW-003 (lane S)
    if (isSet(t.id) && res[String(t.id)] && res[String(t.id)] !== r.id) continue;
    var st = standFor(ps, t);
    if (!st) continue;
    if (!best || st.n < best.st.n || (st.n === best.st.n && (t.y < best.t.y || (t.y === best.t.y && t.x < best.t.x)))) best = { t: t, st: st };
  }
  return best;
}
/** Does this robot hold a reservation (a run that ends releases them). */
function heldBy(w, id) { var res = reservedOf(w); for (var k in res) if (res[k] === id) return true; return false; }
/**
 * One tick of go to nearest (op seek) or go to (op goto): one move or one quarter turn toward the tile facing the thing,
 * the block ending on the tick the robot stands there facing it. The route is searched once and kept on the step until
 * the thing moves or goes, or its next tile blocks (then searched again; s.searches and run.searches count the searches).
 * Nothing to reach: the none event and sayNone, and the block ends.
 */
function seekStep(w, run, s, delta) {
  var r = robotOf(w, run.robotId);
  delta.op = s.op === 'goto' ? 'go_to' : 'go_nearest';
  if (!r) { delta.nothing = true; run.pc++; return; }
  s.guard = (Number(s.guard) || 0) + 1;
  var t = null, kind = s.op === 'goto' ? String((s.ref && (s.ref.kind || s.ref.ref)) || '') : String(s.kind || '');
  // The target the step already walks to: still there, on the same tile, and (seek) still this robot's.
  if (s.target) {
    t = isSet(s.target.id) ? thingById(w, s.target.id) : null;
    if (!t && s.op === 'goto') { var again = refOf(w, run, r, s.ref); t = again && again.thing ? again.thing : null; }
    var res = reservedOf(w);
    if (!t || t.x !== s.target.x || t.y !== s.target.y || (s.op === 'seek' && isSet(t.id) && res[String(t.id)] && res[String(t.id)] !== r.id)) { t = null; s.route = null; }
  }
  if (s.route && s.route.length) { var nx = s.route[0]; if (blocked(w, nx[0], nx[1]) || Math.abs(nx[0] - r.x) + Math.abs(nx[1] - r.y) !== 1) s.route = null; }
  if (!t || !s.route) {
    var ps = pathsFrom(w, r.x, r.y), st = null, old = s.target ? s.target.id : '';
    s.searches = (Number(s.searches) || 0) + 1;
    run.searches = (Number(run.searches) || 0) + 1;
    if (s.op === 'seek') {
      var found = t ? { t: t, st: standFor(ps, t) } : null;
      if (!found || !found.st) found = nearestOf(w, r, kind, ps);
      if (found) { t = found.t; st = found.st; } else t = null;
    } else {
      var it = t ? { thing: t } : refOf(w, run, r, s.ref);
      if (it && (it.held || (it.tile && it.kind === 'ahead'))) { delta.nothing = true; run.pc++; return; }
      if (it && it.thing) { t = it.thing; st = standFor(ps, t); } else t = null;
    }
    if (!t || !st || s.guard > (w.w * w.h + 4) * 3) {
      if (s.op === 'seek' && isSet(old) && reservedOf(w)[String(old)] === r.id) delta.release = { robot: r.id, thing: String(old) };
      delta.none = { id: r.id, kind: kind }; delta.sayKey = 'sayNone'; run.pc++; return;
    }
    var tid = mintId(w, t);
    if (s.op === 'seek' && reservedOf(w)[tid] !== r.id) {
      if (isSet(old) && String(old) !== tid && reservedOf(w)[String(old)] === r.id) delta.release = { robot: r.id, thing: String(old) };
      delta.reserve = { thing: tid, robot: r.id, kind: String(t.kind), x: t.x, y: t.y };
    }
    s.target = { id: tid, kind: String(t.kind), x: t.x, y: t.y };
    s.stand = { x: st.x, y: st.y, d: st.d };
    s.route = routeTo(ps, st);
    delta.aim = { id: r.id, x: st.x, y: st.y };
  }
  var want = r.d, x = r.x, y = r.y;
  if (s.route.length) {
    var nt = s.route[0];
    for (var d = 0; d < 4; d++) if (r.x + DX[d] === nt[0] && r.y + DY[d] === nt[1]) want = d;
    if (want === r.d) { delta.move = { id: r.id, x: nt[0], y: nt[1] }; s.route.shift(); x = nt[0]; y = nt[1]; }
    else delta.turn = { id: r.id, d: (want - r.d + 4) % 4 === 3 ? (r.d + 3) % 4 : (r.d + 1) % 4 };
  } else if (r.d !== s.stand.d) delta.turn = { id: r.id, d: (s.stand.d - r.d + 4) % 4 === 3 ? (r.d + 3) % 4 : (r.d + 1) % 4 };
  var nd = delta.turn ? delta.turn.d : r.d;
  if (!s.route.length && x === s.stand.x && y === s.stand.y && nd === s.stand.d) run.pc++;
}
/** set and change (brief 4.3): run.vars[name] = value, or += by (default 1); the delta's vars are every var after it. */
function varStep(w, run, s, delta) {
  delta.op = s.op;
  var name = isSet(s.name) ? String(s.name) : '';
  run.pc++;
  if (!name) { delta.nothing = true; return; }
  if (!run.vars || typeof run.vars !== 'object' || Array.isArray(run.vars)) run.vars = {};
  if (s.op === 'set') run.vars[name] = evalVal(w, run, s.value);
  else { var by = s.by === undefined || s.by === null ? 1 : exprNum(evalVal(w, run, s.by)); run.vars[name] = (exprNum(run.vars[name]) || 0) + (by === null ? 0 : by); }
  delta.vars = clone(run.vars);
}
// ── P108 IW-006 (lane H): the shop's helpers on one job (AC4). A helper is used on a job (a plot): the rain cloud fills
// every tulip there at once and is gone; the self-filling can and the wheelbarrow ride on that job until it crosses its
// finish line (the island tick puts them on the job's world before each step and takes them off at the finish line).
/** What the wheelbarrow lets a robot carry (the shop's line: "Carries eight, for one job"). */
var BARROW_CARRY = 8;
/** The rain cloud: every tulip of the world full (its meter at its need). Returns how many it filled. */
function helperRain(w) {
  var n = 0, list = w && Array.isArray(w.things) ? w.things : [];
  for (var i = 0; i < list.length; i++) if (list[i] && list[i].kind === 'tulip' && !isFull(list[i])) { setMeter(list[i], meterOf(list[i]).need); n++; }
  return n;
}
/** A riding helper put on a job's world: the self-filling can keeps every can (held, or lying on the plot) full; the wheelbarrow lets the robots carry BARROW_CARRY. */
function helperOn(w, h) {
  var bots = w && Array.isArray(w.robots) ? w.robots : [], list = w && Array.isArray(w.things) ? w.things : [];
  for (var i = 0; i < bots.length; i++) {
    var r = bots[i];
    if (!r) continue;
    if (h === 'selfcan' && canOf(r) !== null) r.can = canMaxOf(r);
    if (h === 'barrow') r.basket = Math.max(basketOf(r), BARROW_CARRY);
  }
  if (h === 'selfcan') for (var j = 0; j < list.length; j++) if (list[j] && list[j].kind === 'can') list[j].level = Number(list[j].max) > 0 ? Math.floor(Number(list[j].max)) : CAN_MAX;
  return w;
}
/**
 * Does a helper do anything for this job, as it stands? Never for a job that is done. Rain: a tulip not full. The
 * self-filling can: a job with a can (lying on the plot, held, or the robot's own). The wheelbarrow: a job whose targets
 * take carried things (a site, a basket, a bowl, a crate, a door).
 */
function helperFits(w, h) {
  if (!w || jobDone(w)) return false;
  var list = Array.isArray(w.things) ? w.things : [], bots = Array.isArray(w.robots) ? w.robots : [];
  if (h === 'rain') { for (var i = 0; i < list.length; i++) if (list[i] && list[i].kind === 'tulip' && !isFull(list[i])) return true; return false; }
  if (h === 'selfcan') { if (canWorld(w)) return true; for (var k = 0; k < bots.length; k++) if (canOf(bots[k]) !== null) return true; return false; }
  if (h === 'barrow') { var j = jobOf(w); if (!j) return false; for (var t = 0; t < j.targets.length; t++) { var th = thingById(w, j.targets[t]); if (th && (th.kind === 'site' || JOB_KINDS[th.kind] === 'container')) return true; } return false; }
  return false;
}
// ── P108 IW-003 (lane P): the post — a door takes letters, an addressed letter goes only into its owner's door, and
// Olive reads the name on an envelope (IW-005 dev. 6). The carry stays a list of plain strings (letter, stone, egg…):
// an addressed letter keeps its name in carryTo, a list BESIDE it (carryTo[i] is the name on carry[i], '' for none),
// which a robot has only while an addressed letter is in its hands — every other robot's JSON is exactly as before.
/** What an envelope says, by the name on it, in both languages (the shell's notes_read entries, cg005Olive.ts). */
var MAIL_NOTES = ${JSON.stringify(ENVELOPE_NOTES)};
function sameName(a, b) { return isSet(a) && isSet(b) && exprText(a) === exprText(b); }
/** The name on the thing the robot would put next (the last carried), '' when none. */
function mailTopTo(r) { return r && Array.isArray(r.carryTo) && r.carry.length && r.carryTo.length === r.carry.length ? String(r.carryTo[r.carry.length - 1] || '') : ''; }
/** pick: a letter taken from the post box keeps its name on the delta; a letter taken back out of a door wears its owner's. */
function mailPick(t, delta) {
  if (!t || !delta.pick) return;
  if (t.kind === 'letter' && isSet(t.to)) delta.pick.to = String(t.to);
  else if (t.kind === 'door' && isSet(t.owner)) delta.pick.to = String(t.owner);
}
/**
 * put with a door ahead (a door blocks, so nothing else can be put there): only its item (a letter) goes in, one at a
 * time, up to its capacity; a letter with a name goes only into the door whose owner is that name — else the wrongDoor
 * event, the letter stays in hand and the robot says so. true = handled (the put is over).
 */
function mailPut(w, run, r, f, delta) {
  var doors = thingsAt(w, f.x, f.y, 'door');
  if (!doors.length) return false;
  var door = doors[0], top = r.carry.length ? String(r.carry[r.carry.length - 1]) : '', to = mailTopTo(r);
  if (!top || top !== itemOf(door)) { delta.nothing = true; return true; }
  if (to && isSet(door.owner) && !sameName(to, door.owner)) { run.wrongDoors = (Number(run.wrongDoors) || 0) + 1; delta.wrongDoor = { id: r.id, x: f.x, y: f.y, to: to, owner: String(door.owner) }; delta.sayKey = 'iw3pWrongDoor'; return true; }
  var dm = meterOf(door);
  if (dm.have >= dm.need) { delta.full = { id: String(door.id || ''), x: f.x, y: f.y }; delta.sayKey = 'sayFull'; return true; }
  delta.post = { id: r.id, x: f.x, y: f.y, into: String(door.id || ''), owner: String(door.owner || ''), to: to };
  delta.meter = meterDelta(door, f.x, f.y, dm.have + 1); delta.sayKey = 'iw3pPosted';
  return true;
}
/**
 * Wear (the island tick only, from wearOf): every WEAR.door ticks a door's owner takes one letter in (the seed picks the
 * door), and a letter the post box gets this tick is addressed to that owner (else to a door still waiting). true = a
 * draw was made (wearOf then writes the seed back).
 */
function mailWear(w, n, rnd, out) {
  var drew = false, worn = null, pool = [];
  if (Number(WEAR.door) > 0 && n % Number(WEAR.door) === 0) {
    for (var i = 0; i < w.things.length; i++) if (w.things[i] && w.things[i].kind === 'door' && meterOf(w.things[i]).have > 0) pool.push(w.things[i]);
    if (pool.length) { worn = pool[Math.floor(rnd() * pool.length)]; drew = true; out.push({ wear: { id: String(worn.id || ''), kind: 'door', x: worn.x, y: worn.y, have: meterOf(worn).have - 1 } }); }
  }
  for (var k = 0; k < out.length; k++) {
    if (!out[k].letter || isSet(out[k].letter.to)) continue;
    var to = worn && isSet(worn.owner) ? String(worn.owner) : '';
    for (var j = 0; j < w.things.length && !to; j++) { var dj = w.things[j]; if (dj && dj.kind === 'door' && isSet(dj.owner) && !isFull(dj)) to = String(dj.owner); }
    if (to) out[k].letter.to = to;
  }
  return drew;
}
/**
 * apply's post half (after the rest of apply): a letter posted through a door; the names beside the carry kept in step
 * with it (both lists pop and push at their ends — a letter put on the ground keeps its name there); a letter the post
 * box got wears its name.
 */
function mailApply(w, d) {
  if (d.post) {
    var rp = robotOf(w, d.post.id), door = thingOf(w, { id: d.post.into, x: d.post.x, y: d.post.y }, { door: 1 });
    if (rp && door && rp.carry.length) { rp.carry.pop(); setMeter(door, meterOf(door).have + 1); }
  }
  if (d.put) {
    var ru = robotOf(w, d.put.id);
    if (ru && Array.isArray(ru.carryTo) && ru.carryTo.length > ru.carry.length && ru.carryTo[ru.carry.length]) for (var p = w.things.length - 1; p >= 0; p--) { var lp = w.things[p]; if (lp && lp.kind === d.put.kind && lp.x === d.put.x && lp.y === d.put.y) { lp.to = String(ru.carryTo[ru.carry.length]); break; } }
  }
  for (var i = 0; i < w.robots.length; i++) {
    var r = w.robots[i];
    if (!Array.isArray(r.carryTo)) continue;
    while (r.carryTo.length > r.carry.length) r.carryTo.pop();
    while (r.carryTo.length < r.carry.length) r.carryTo.push('');
  }
  if (d.pick && isSet(d.pick.to)) {
    var rk = robotOf(w, d.pick.id);
    if (rk && rk.carry.length) { if (!Array.isArray(rk.carryTo)) rk.carryTo = []; while (rk.carryTo.length < rk.carry.length) rk.carryTo.push(''); rk.carryTo[rk.carry.length - 1] = String(d.pick.to); }
  }
  for (var j = 0; j < w.robots.length; j++) { var rj = w.robots[j], any = false; if (!Array.isArray(rj.carryTo)) continue; for (var q = 0; q < rj.carryTo.length; q++) if (rj.carryTo[q]) any = true; if (!any) delete rj.carryTo; }
  if (d.letter && isSet(d.letter.to)) for (var t = w.things.length - 1; t >= 0; t--) { var lt = w.things[t]; if (lt && lt.kind === 'letter' && lt.x === d.letter.x && lt.y === d.letter.y && !isSet(lt.to)) { lt.to = String(d.letter.to); break; } }
}
/** The name on the envelope Olive would read: the letter in hand (the last carried), else the letter a pick would take from the tile ahead. */
function mailEnvelopeTo(w, r) {
  if (!r) return '';
  var to = mailTopTo(r);
  if (to) return to;
  var f = front(r), th = thingsAt(w, f.x, f.y);
  for (var i = 0; i < th.length; i++) if (PICKABLE[th[i].kind]) return th[i].kind === 'letter' && isSet(th[i].to) ? String(th[i].to) : '';
  return '';
}
/**
 * read with an envelope: what she reads is the envelope (the table's note for that name, in the run's language) and her
 * choices are the doors' owners on the plot. The step keeps the name (s.envelope): an ask that comes back with no word
 * (the island's tick and runToEnd take the fallback with none) reads it, as the shell's written answer does. Returns
 * the options.
 */
function mailRead(s, w, r, lang, args, options) {
  var to = mailEnvelopeTo(w, r), note = null, L = oliveL(lang);
  for (var k in MAIL_NOTES) if (sameName(k, to)) note = MAIL_NOTES[k];
  if (!note) { delete s.envelope; return options; }
  var out = [], seen = {};
  for (var i = 0; i < w.things.length; i++) { var dr = w.things[i]; if (dr && dr.kind === 'door' && isSet(dr.owner) && MAIL_NOTES[String(dr.owner)] && !seen[String(dr.owner)]) { seen[String(dr.owner)] = 1; out.push(String(dr.owner)); } }
  args.note = note[L];
  s.envelope = to;
  return out.length ? out : options;
}
/** An envelope read that came back with no word: the name on the envelope (the written answer's own). */
function mailFallback(run, s, v) {
  if (s.rung !== 'read' || !isSet(s.envelope) || (v !== undefined && v !== null && String(v) !== '')) return v;
  run.lastAnswer.value = String(s.envelope);
  return String(s.envelope);
}
/** Did this run's Olive read an envelope (the after-run line then names the door, not "the right row"). */
function mailRan(run) {
  var st = run && Array.isArray(run.steps) ? run.steps : [];
  for (var i = 0; i < st.length; i++) if (st[i] && st[i].op === 'ask' && st[i].rung === 'read' && isSet(st[i].envelope)) return true;
  return false;
}
// P108 IW-003 (lane B): a container that remembers a spot (layByWall) puts back on it the one it lost to wear —
// Biscuit takes his ball out of the basket and it rolls back to the wall, so the job reopens with a ball to fetch.
function rollOut(w, t) {
  if (!t || !Array.isArray(t.spot) || t.spot.length !== 2 || JOB_KINDS[t.kind] !== 'container') return;
  var it = itemOf(t), sx = Math.floor(Number(t.spot[0])), sy = Math.floor(Number(t.spot[1]));
  if (!PICKABLE[it] || !isFinite(sx) || !isFinite(sy)) return;
  w.things.push({ kind: it, x: sx, y: sy });
}

// ── P108 IW-003 (lane S): Sami's stones — go to nearest skips what is not worth the walk; a build site (the bench) ──
/**
 * go to nearest passes over a thing not worth the walk (IW-005 dev. 5; the mockup's rule): a rock with no stones left
 * (left 0 — a rock with a max stays on the map to regrow) and a target already full (a site or a tulip at its need).
 */
function seekSkips(t) {
  if (!t) return true;
  if (t.kind === 'rock') return !(Number(t.left) > 0);
  if (JOB_KINDS[t.kind] === 'target') return isFull(t);
  return false;
}
/** A path square: a site with no build. A full one reads as path (P); a site with a build (the bench) never does. */
function pathSite(t) { return !!t && t.kind === 'site' && !isSet(t.build); }
/** A build site (build: 'bench'): robots walk round it at every stage, and a finished bench is furniture Sami sits on. */
function buildSite(t) { return !!t && t.kind === 'site' && isSet(t.build); }
function slotsOf(b) { return b && b.slots && typeof b.slots === 'object' ? b.slots : {}; }
function bodyOf(b) { return b && Array.isArray(b.body) ? b.body : []; }
function collectTricks(list, out) {
  for (var i = 0; i < list.length; i++) { var b = list[i]; if (!b) continue; if (b.t === 'trick') out[String(slotsOf(b).name || '')] = bodyOf(b); if (b.body) collectTricks(bodyOf(b), out); if (Array.isArray(b.else)) collectTricks(b.else, out); }
  return out;
}
function collectHandlers(list, out) {
  for (var i = 0; i < list.length; i++) { var b = list[i]; if (!b) continue; if (b.t === 'when') out.push({ id: b.id, event: String(slotsOf(b).event || 'meow'), body: bodyOf(b) }); else { if (b.body) collectHandlers(bodyOf(b), out); if (Array.isArray(b.else)) collectHandlers(b.else, out); } }
  return out;
}
function countUses(list, type) {
  var n = 0;
  for (var i = 0; i < list.length; i++) { var b = list[i]; if (!b) continue; if (b.t === type) n++; if (b.body) n += countUses(bodyOf(b), type); if (Array.isArray(b.else)) n += countUses(b.else, type); }
  return n;
}
function countBlocks(list) { var n = 0; for (var i = 0; i < list.length; i++) { if (!list[i]) continue; n++; if (list[i].body) n += countBlocks(bodyOf(list[i])); if (Array.isArray(list[i].else)) n += countBlocks(list[i].else); } return n; }
function hasContainer(list) { for (var i = 0; i < list.length; i++) if (list[i] && list[i].body) return true; return false; }
function isAsk(b) { return b.t === 'ask' || String(b.t).indexOf('olive:') === 0; }
/**
 * An ask block as a step (CG-005). The rung is slots.rung, else the palette type's suffix (ask:<rung>). The slot values
 * are slots.args (a list or an object), else every other slot key (the kit writes slots flat, as strings). No dial:
 * the rung's own temperature. The shape: the block's, else the rung's.
 */
function askStep(b, slots) {
  var rung = slots.rung !== undefined && slots.rung !== null && slots.rung !== '' ? slots.rung : String(b.t).replace(/^olive:/, '');
  var args;
  if (Array.isArray(slots.args)) args = slots.args;
  else if (slots.args && typeof slots.args === 'object') args = clone(slots.args);
  else { args = {}; for (var k in slots) if (!ASK_RESERVED[k]) args[k] = slots[k]; }
  var hasDial = slots.dial !== undefined && slots.dial !== null && slots.dial !== '';
  var options = Array.isArray(slots.options) ? slots.options : typeof slots.options === 'string' && slots.options ? slots.options.split(',') : null;
  // IG-006: times — is it a…? asked once, or 3 times and the majority (the vote).
  var times = Math.floor(Number(slots.times)) === 3 ? 3 : 1;
  return { id: b.id, op: 'ask', rung: rung, args: args, shape: String(slots.shape || ASK_SHAPE[rung] || 'word'), dial: hasDial ? Math.max(0, Math.min(2, Math.floor(Number(slots.dial) || 0))) : -1, options: options, times: times };
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
    } else if (b.t === 'until') { var us = { id: b.id, op: 'until', sensor: String(slots.sensor || 'wall_ahead'), arg: slots.arg, body: body, guard: 0 }; if (isSet(slots.cond)) us.cond = slots.cond; out.push(us); }
    else if (b.t === 'if') {
      // P108 IW-005: a cond (brief 4.3) is evaluated instead of the sensor; an else list runs when the check is false.
      var fs = { id: b.id, op: 'if', sensor: String(slots.sensor || 'tulip_ahead'), arg: slots.arg, body: body };
      if (isSet(slots.cond)) fs.cond = slots.cond;
      if (Array.isArray(b.else)) fs.alt = b.else;
      out.push(fs);
    }
    else if (b.t === 'go_nearest') out.push({ id: b.id, op: 'seek', kind: String(slots.kind || ''), guard: 0 });
    else if (b.t === 'go_to') out.push({ id: b.id, op: 'goto', ref: slots.thing && typeof slots.thing === 'object' ? clone(slots.thing) : null, guard: 0 });
    else if (b.t === 'set') out.push({ id: b.id, op: 'set', name: slots.name, value: slots.value === undefined ? null : clone(slots.value) });
    else if (b.t === 'change') out.push({ id: b.id, op: 'change', name: slots.name, by: slots.by === undefined ? null : clone(slots.by) });
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
    steps: flatten(prog, tricks), pc: 0, tick: 0, count: 0, bumps: 0, puddles: 0, watered: 0, said: 0, guardHits: 0, dries: 0, rockGone: 0,
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
    // IG-002: a robot with a can spends one water per pour; an EMPTY can pours nothing — no water, no puddle — and the
    // dry event is the error message. A robot with no can (null) waters for free, as before.
    // P108 IW-002: in a can world the can must be in hand (else noCan, and nothing changes).
    if (canWorld(w) && r.holds !== 'can') { run.noCans = (Number(run.noCans) || 0) + 1; delta.noCan = { id: r.id }; delta.sayKey = 'sayNoCan'; return; }
    var can = canOf(r);
    if (can !== null && can <= 0) { run.dries++; delta.dry = { id: r.id, x: f.x, y: f.y }; delta.sayKey = 'sayDry'; return; }
    var tul = thingsAt(w, f.x, f.y, 'tulip');
    // IW-002: a tulip with a meter takes one drink up to its need; a full one refuses (nothing spent) and says so.
    if (tul.length && hasMeter(tul[0])) {
      var tm = meterOf(tul[0]);
      if (tm.have >= tm.need) { delta.full = { id: String(tul[0].id || ''), x: f.x, y: f.y }; delta.sayKey = 'sayFull'; return; }
      if (tm.have + 1 >= tm.need) run.watered++;
      delta.water = { x: f.x, y: f.y }; delta.meter = meterDelta(tul[0], f.x, f.y, tm.have + 1); delta.sayKey = 'sayDrink';
      if (can !== null) delta.can = { id: r.id, can: can - 1 };
      return;
    }
    if (tul.length) { if (!tul[0].watered) run.watered++; delta.water = { x: f.x, y: f.y }; delta.sayKey = 'sayDrink'; if (can !== null) delta.can = { id: r.id, can: can - 1 }; return; }
    var c = tileAt(w, f.x, f.y);
    if (c !== '' && c !== 'W') { if (!thingsAt(w, f.x, f.y, 'puddle').length) { run.puddles++; delta.puddle = { x: f.x, y: f.y }; } delta.splash = { x: f.x, y: f.y }; delta.sayKey = 'saySplash'; if (can !== null) delta.can = { id: r.id, can: can - 1 }; return; }
    delta.nothing = true; return;
  }
  // IG-002: fill at the water ahead fills the can to canMax; with no water ahead it is a no-op (no bump).
  if (s.op === 'fill') {
    if (canWorld(w) && r.holds !== 'can') { run.noCans = (Number(run.noCans) || 0) + 1; delta.noCan = { id: r.id }; delta.sayKey = 'sayNoCan'; return; }
    if (tileAt(w, f.x, f.y) === 'W') { delta.fill = { id: r.id, x: f.x, y: f.y }; delta.can = { id: r.id, can: canMaxOf(r) }; delta.sayKey = 'sayFill'; return; }
    delta.nothing = true; return;
  }
  if (s.op === 'pick') {
    var th = thingsAt(w, f.x, f.y), it = null, rock = null, box = null, rock0 = null, canT = null;
    for (var i = 0; i < th.length && !it; i++) if (PICKABLE[th[i].kind]) it = th[i];
    for (var ri = 0; ri < th.length && !rock; ri++) if (th[ri].kind === 'rock' && Number(th[ri].left) > 0) rock = th[ri];
    // P108 IW-002: the can is a thing the robot picks up (it holds it; the can leaves the map with its level)…
    for (var ci = 0; ci < th.length && !canT; ci++) if (th[ci].kind === 'can') canT = th[ci];
    if (canT && r.holds !== 'can') { delta.holds = { id: r.id, what: 'can', x: f.x, y: f.y, level: Math.max(0, Math.floor(Number(canT.level)) || 0), max: Number(canT.max) > 0 ? Math.floor(Number(canT.max)) : 0 }; delta.sayKey = 'sayPick'; return; }
    // …a container gives one of its item; a rock with a max stays on the map at 0 (it regrows on island ticks).
    for (var bi = 0; bi < th.length && !box; bi++) if (JOB_KINDS[th[bi].kind] === 'container' && meterOf(th[bi]).have > 0) box = th[bi];
    for (var r0 = 0; r0 < th.length && !rock0; r0++) if (th[r0].kind === 'rock' && !(Number(th[r0].left) > 0) && Number(th[r0].max) > 0) rock0 = th[r0];
    if (it && r.carry.length < basketOf(r)) { delta.pick = { id: r.id, kind: it.kind, x: f.x, y: f.y }; mailPick(it, delta); delta.sayKey = 'sayPick'; return; }
    // IG-002: a rock ahead gives one stone per pick (the basket bounds it); apply shrinks the rock and removes it at 0.
    if (!it && rock && r.carry.length < basketOf(r)) { delta.pick = { id: r.id, kind: 'stone', x: f.x, y: f.y, rock: true }; delta.sayKey = 'sayPick'; return; }
    if (!it && !rock && box && r.carry.length < basketOf(r)) { delta.pick = { id: r.id, kind: itemOf(box), x: f.x, y: f.y, box: true, from: String(box.id || '') }; delta.meter = meterDelta(box, f.x, f.y, meterOf(box).have - 1); mailPick(box, delta); delta.sayKey = 'sayPick'; return; }
    // A pick where a rock was used up: a bump with nothing carried (the rockGone hint names why).
    if (!it && !rock && (spentAt(w, f.x, f.y) || rock0)) { run.rockGone++; run.bumps++; delta.bump = { id: r.id, x: f.x, y: f.y }; delta.rockGone = { x: f.x, y: f.y }; delta.sayKey = 'sayBump'; return; }
    delta.nothing = true; return;
  }
  if (s.op === 'put') {
    // P108 IW-003 (lane P): a door ahead takes the letter (its owner's only), or refuses.
    if (mailPut(w, run, r, f, delta)) return;
    // P108 IW-002: a site, a basket or a store ahead takes its own item, one at a time, to its need; a full one refuses
    // (the item stays carried) and says so. Anything else carried is not put there.
    var top = r.carry.length ? String(r.carry[r.carry.length - 1]) : '', into = null, ahead = thingsAt(w, f.x, f.y);
    for (var ai = 0; ai < ahead.length && !into; ai++) if (ahead[ai].kind === 'site' || ahead[ai].kind === 'basket' || ahead[ai].kind === 'store') into = ahead[ai];
    if (into && top) {
      if (top !== itemOf(into)) { delta.nothing = true; return; }
      var im = meterOf(into);
      if (im.have >= im.need) { delta.full = { id: String(into.id || ''), x: f.x, y: f.y }; delta.sayKey = 'sayFull'; return; }
      delta.stow = { id: r.id, kind: top, x: f.x, y: f.y, into: String(into.id || ''), target: into.kind };
      delta.meter = meterDelta(into, f.x, f.y, im.have + 1); delta.sayKey = 'sayPut';
      return;
    }
    // The can put back down, with its level, on a free tile ahead.
    if (r.holds === 'can' && tileAt(w, f.x, f.y) !== '' && !blocked(w, f.x, f.y) && !ahead.length) { delta.holds = { id: r.id, what: '', x: f.x, y: f.y, level: canOf(r) || 0, max: canMaxOf(r) }; delta.sayKey = 'sayPut'; return; }
    if (!r.carry.length) { delta.nothing = true; return; }
    var kind = String(r.carry[r.carry.length - 1]);
    var bowl = thingsAt(w, f.x, f.y, 'bowl');
    // IW-002: a bowl with a capacity refuses when full and shows its meter; one without fills as before.
    if (bowl.length && kind === itemOf(bowl[0]) && isFull(bowl[0])) { delta.full = { id: String(bowl[0].id || ''), x: f.x, y: f.y }; delta.sayKey = 'sayFull'; return; }
    if (bowl.length && kind === itemOf(bowl[0]) && Number(bowl[0].capacity) > 0) delta.meter = meterDelta(bowl[0], f.x, f.y, meterOf(bowl[0]).have + 1);
    if (bowl.length) { if (kind === 'food') { delta.feed = { id: r.id, x: f.x, y: f.y }; delta.sayKey = 'sayPut'; return; } delta.nothing = true; return; }
    if (tileAt(w, f.x, f.y) !== '' && !blocked(w, f.x, f.y)) { delta.put = { id: r.id, kind: kind, x: f.x, y: f.y }; delta.sayKey = 'sayPut'; return; }
    delta.nothing = true; return;
  }
  // IG-001 D6: a say block speaks its line — the word key (or a typed text) as the plain bubble's sayKey.
  if (s.op === 'say') { run.said++; var said = s.text === undefined || s.text === null || s.text === '' ? 'thanksMamie' : String(s.text); delta.say = { id: r.id, text: said }; delta.sayKey = said; delta.sayStyle = 'plain'; return; }
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
  // P108 IW-002: the finish line. The tick the job's last target is full, the walk home is appended (the engine's own
  // steps, after whatever is left of the child's program); the run ends at home.
  if (!run.jobDone && jobDone(w)) { run.jobDone = true; run.steps.push({ id: null, op: 'home', guard: 0 }); delta.jobDone = true; }
  if (run.pc >= run.steps.length) {
    var pending = false;
    for (var p = 0; p < w.schedule.length; p++) if (Number(w.schedule[p].tick) > run.tick) pending = true;
    delta.idle = true;
    run.tick++;
    if (pending) return { run: run, delta: delta, glowId: null, done: false, waiting: false, request: null };
    run.done = true;
    // P108 IW-005: a run that ends releases what its go to nearest reserved.
    var ender = robotOf(w, run.robotId);
    if (ender && heldBy(w, ender.id)) delta.release = { robot: ender.id };
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
      // IG-006: the note on the plot, the things on it, the thing ahead — named by the engine from the world.
      var ctx = oliveRequestOf(s, w, run);
      var req = { seq: run.askSeq, rung: s.rung, slots: ctx.slots, lang: run.lang, shape: s.shape, temperature: s.dial >= 0 ? DIAL_TEMPERATURE[s.dial] : ASK_TEMPERATURE[s.rung] };
      if (ctx.options) req.options = ctx.options;
      return { run: run, delta: delta, glowId: glowId, done: false, waiting: true, request: req };
    }
    run.lastAnswer = { ok: !!a.ok, value: a.value, text: a.text, fallback: !!a.fallback, reason: a.reason };
    // IG-006 AC3: the vote asks again until its last answer; the run stays parked on the same block.
    var olive = oliveAnswered(run, s, a);
    if (olive.again) {
      run.askSeq++;
      delta.waiting = true;
      delta.vote = olive.vote;
      var again = oliveRequestOf(s, w, run);
      var req2 = { seq: run.askSeq, rung: s.rung, slots: again.slots, lang: run.lang, shape: s.shape, temperature: s.dial >= 0 ? DIAL_TEMPERATURE[s.dial] : ASK_TEMPERATURE[s.rung] };
      if (again.options) req2.options = again.options;
      return { run: run, delta: delta, glowId: glowId, done: false, waiting: true, request: req2 };
    }
    if (olive.vote) delta.vote = olive.vote;
    run.waiting = false;
    delta.answered = clone(run.lastAnswer);
    // A blocks answer is a PROPOSAL the child accepts or not: never spliced into the run (CG-005 AC1).
    if (s.shape === 'blocks' && Array.isArray(a.value)) {
      var proposed = [];
      for (var q = 0; q < a.value.length; q++) if (ASK_BLOCK[a.value[q]]) proposed.push(ASK_BLOCK[a.value[q]]);
      run.proposal = { askId: s.id, blocks: proposed };
      delta.proposal = clone(run.proposal);
    } else {
      // IG-001 D6: every other answer (hers or the written one) is spoken by the robot, in the olive bubble.
      var spoken = a.value !== undefined && a.value !== null ? a.value : a.text;
      if (spoken !== undefined && spoken !== null && String(spoken) !== '') { delta.sayText = Array.isArray(spoken) ? spoken.join(', ') : String(spoken); delta.sayStyle = 'olive'; }
    }
    // IG-006 AC2/AC3: read and is it a…? say WHAT she answered ("Olive read: red tulip", "Olive: yes", "2 of 3 said yes").
    if (olive.say) { delta.sayText = olive.say; delta.sayStyle = 'olive'; }
    run.pc++; run.tick++;
    return { run: run, delta: delta, glowId: glowId, done: false, waiting: false, request: null };
  }
  if (s.op === 'until' || s.op === 'if') {
    // What the program READ (for a goal like "count to 4 and check it": CG-006's eggs, the senses predicate).
    if (!run.sensed || typeof run.sensed !== 'object') run.sensed = {};
    // P108 IW-005: a cond counts as read 'cond', and each legacy sensor inside it as itself.
    var reads = s.cond !== undefined ? ['cond'].concat(condSensors(s.cond, [], 0)) : [s.sensor];
    for (var rd = 0; rd < reads.length; rd++) run.sensed[reads[rd]] = (run.sensed[reads[rd]] || 0) + 1;
  }
  if (s.op === 'until') {
    var met = checkOf(w, run, s);
    if (met || s.guard >= UNTIL_GUARD) { if (s.guard >= UNTIL_GUARD) run.guardHits++; run.pc++; }
    else {
      var again = clone(s); again.guard = s.guard + 1;
      var loop = flatten(s.body, run.tricks).concat([again]);
      run.steps.splice.apply(run.steps, [run.pc + 1, 0].concat(loop));
      run.pc++;
    }
    delta.check = s.cond !== undefined ? { sensor: 'cond', on: true, cond: true, value: met } : { sensor: s.sensor, on: true };
  } else if (s.op === 'if') {
    var yes = checkOf(w, run, s);
    if (yes) run.steps.splice.apply(run.steps, [run.pc + 1, 0].concat(flatten(s.body, run.tricks)));
    else if (Array.isArray(s.alt)) run.steps.splice.apply(run.steps, [run.pc + 1, 0].concat(flatten(s.alt, run.tricks)));
    run.pc++;
    delta.check = s.cond !== undefined ? { sensor: 'cond', on: true, cond: true, value: yes } : { sensor: s.sensor, on: true };
  } else if (s.op === 'repeat_olive') {
    var la = run.lastAnswer, n = la ? Math.max(0, Math.min(9, Math.floor(Number(la.value)) || 0)) : 0;
    var body = [];
    for (var k = 0; k < n; k++) body = body.concat([{ id: s.id, op: 'noop' }], flatten(s.body, run.tricks));
    run.steps.splice.apply(run.steps, [run.pc + 1, 0].concat(body));
    run.pc++;
    delta.repeat = n;
  } else if (s.op === 'home') {
    homeStep(w, run, s, delta);
  } else if (s.op === 'seek' || s.op === 'goto') {
    seekStep(w, run, s, delta);
  } else if (s.op === 'set' || s.op === 'change') {
    varStep(w, run, s, delta);
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
  if (d.move) {
    var rm = robotOf(w, d.move.id) || r; if (rm) { rm.x = d.move.x; rm.y = d.move.y; }
    // IW-002: a site remembers how often it is walked on (wear takes its stone from the most walked).
    var ws = thingsAt(w, d.move.x, d.move.y, 'site'); for (var wi = 0; wi < ws.length; wi++) ws[wi].walked = (Number(ws[wi].walked) || 0) + 1;
  }
  if (d.water) {
    var tul = thingsAt(w, d.water.x, d.water.y, 'tulip');
    // IW-002: a tulip with a meter takes one drink up to its need; the rest are watered as before. Full again: no droop.
    for (var i = 0; i < tul.length; i++) { if (hasMeter(tul[i])) setMeter(tul[i], meterOf(tul[i]).have + 1); else tul[i].watered = true; if (tul[i].droop && tul[i].watered) tul[i].droop = false; }
  }
  if (d.puddle) w.things.push({ kind: 'puddle', x: d.puddle.x, y: d.puddle.y });
  if (d.pick) {
    var rp = robotOf(w, d.pick.id) || r;
    if (d.pick.rock) {
      // IG-002: the rock ahead gives a stone and shrinks; at 0 it is removed and its tile remembered as spent.
      for (var k = 0; k < w.things.length; k++) {
        var rk = w.things[k];
        if (rk.x !== d.pick.x || rk.y !== d.pick.y || rk.kind !== 'rock') continue;
        rk.left = Math.max(0, Math.floor(Number(rk.left)) - 1);
        if (!(rk.left > 0) && !(Number(rk.max) > 0)) { w.things.splice(k, 1); w.spent = (Array.isArray(w.spent) ? w.spent : []).concat([d.pick.x + ',' + d.pick.y]); }
        break;
      }
    } else if (d.pick.box) { var bx = thingOf(w, { id: d.pick.from, x: d.pick.x, y: d.pick.y }, { basket: 1, bowl: 1, store: 1 }); if (bx) setMeter(bx, meterOf(bx).have - 1); }
    else for (var j = 0; j < w.things.length; j++) if (w.things[j].x === d.pick.x && w.things[j].y === d.pick.y && w.things[j].kind === d.pick.kind) { if (isSet(w.things[j].id) && w.reserved && typeof w.reserved === 'object') delete w.reserved[String(w.things[j].id)]; w.things.splice(j, 1); break; }
    if (rp) rp.carry.push(d.pick.kind);
  }
  if (d.can) { var rc = robotOf(w, d.can.id) || r; if (rc) rc.can = Math.max(0, Math.floor(Number(d.can.can)) || 0); }
  if (d.put) { var ru = robotOf(w, d.put.id) || r; if (ru) ru.carry.pop(); w.things.push({ kind: d.put.kind, x: d.put.x, y: d.put.y }); }
  if (d.feed) { var rf = robotOf(w, d.feed.id) || r; if (rf) rf.carry.pop(); var bowl = thingsAt(w, d.feed.x, d.feed.y, 'bowl'); if (bowl.length) setMeter(bowl[0], meterOf(bowl[0]).have + 1); }
  // ── P108 IW-002: the job model's deltas ──
  if (d.stow) { var rs = robotOf(w, d.stow.id) || r; var into = thingOf(w, { id: d.stow.into, x: d.stow.x, y: d.stow.y }, { site: 1, basket: 1, store: 1 }); if (rs && into) { rs.carry.pop(); setMeter(into, meterOf(into).have + 1); } }
  if (d.holds) {
    var rh = robotOf(w, d.holds.id) || r;
    if (d.holds.what === 'can') {
      for (var hc = 0; hc < w.things.length; hc++) if (w.things[hc].kind === 'can' && w.things[hc].x === d.holds.x && w.things[hc].y === d.holds.y) { w.things.splice(hc, 1); break; }
      if (rh) { rh.holds = 'can'; rh.can = Math.max(0, Math.floor(Number(d.holds.level)) || 0); if (Number(d.holds.max) > 0) rh.canMax = Math.floor(Number(d.holds.max)); }
    } else if (rh) { w.things.push({ kind: 'can', x: d.holds.x, y: d.holds.y, level: canOf(rh) || 0, max: canMaxOf(rh) }); delete rh.holds; rh.can = null; }
  }
  if (d.wear) { var wt = thingOf(w, d.wear); if (wt) { setMeter(wt, d.wear.have); if (wt.kind === 'tulip') wt.droop = true; rollOut(w, wt); } }
  if (d.regrow) { var rg = thingOf(w, { id: d.regrow.id, x: d.regrow.x, y: d.regrow.y, kind: 'rock' }); if (rg) rg.left = Math.max(0, Math.min(Math.floor(Number(rg.max)) || 0, Math.floor(Number(d.regrow.left)) || 0)); }
  if (d.lay) w.things.push({ kind: 'egg', x: d.lay.x, y: d.lay.y });
  if (d.letter) w.things.push({ kind: 'letter', x: d.letter.x, y: d.letter.y });
  if (d.seed !== undefined && d.seed !== null && isFinite(Number(d.seed))) w.seed = Number(d.seed) >>> 0;
  // ── P108 IW-005: reservations — a found thing is its robot's until picked (above) or the run ends (release) ──
  if (d.release) { var rl = reservedOf(w); for (var rk2 in rl) if (rl[rk2] === String(d.release.robot) && (!isSet(d.release.thing) || rk2 === String(d.release.thing))) delete rl[rk2]; }
  if (d.reserve) {
    var rv = thingOf(w, { id: d.reserve.thing, x: d.reserve.x, y: d.reserve.y, kind: d.reserve.kind });
    if (rv) {
      if (!isSet(rv.id)) rv.id = String(d.reserve.thing);
      if (!w.reserved || typeof w.reserved !== 'object' || Array.isArray(w.reserved)) w.reserved = {};
      w.reserved[String(rv.id)] = String(d.reserve.robot);
    }
  }
  // P108 IW-003 (lane P): a letter through a door, the names beside the carry, an addressed letter in the post box.
  mailApply(w, d);
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
    // IG-006: exactly n tulips of one colour watered (Mamie's note: the red row, and none of the yellow).
    else if (g.name === 'tulips_watered') { var tw = 0; for (var q = 0; q < w.things.length; q++) if (w.things[q].kind === 'tulip' && String(w.things[q].color || '') === String(a[0]) && w.things[q].watered) tw++; ok = tw === (Number(a[1]) || 0); done += Math.min(tw, Number(a[1]) || 0); total += Number(a[1]) || 0; }
    // P108 IW-002: the finish line — every target of the job full, and the robot at its home.
    // P108 IW-003 (lane B): the run bumped into nothing (Biscuit's wall: sense it, never crash into it).
    else if (g.name === 'no_bump') ok = !(Number(run.bumps) > 0);
    else if (g.name === 'job_done') { var jp = jobProgress(w), jh = homeOf(w, r); done += jp.full; total += jp.total; ok = jp.total > 0 && jp.full === jp.total && !!r && (!jh || (r.x === Math.floor(Number(jh.x)) && r.y === Math.floor(Number(jh.y)))); }
    if (!ok) missing.push(String(g.name));
  }
  return { met: goals.length > 0 && missing.length === 0, missing: missing, done: done, total: total };
}
`;

// ── The fold helpers ────────────────────────────────────────────────────────

export const FOLD_HELPERS = `
function sameBlock(a, b) {
  if (!a || !b) return false;
  // P108 IW-003 (lane M): two REPEATS are the same block when their shapes are (t, n, slots, body, else): pours folded
  // into repeat 3 inside each pass of the tulips dance still let the passes fold (before, a container never matched).
  // (s3 merge) Only a repeat: an if / until / when still never matches — with it, bowl-if's recording offered a rotated
  // body holding its if (lane F's fold-nudge rule, red), and a pad recording never holds one anyway.
  if (a.body || b.body) return a.t === 'repeat' && b.t === 'repeat' && !!a.body && !!b.body && JSON.stringify(shapeOf([a])) === JSON.stringify(shapeOf([b]));
  if (a.t !== b.t || (Number(a.n) || 0) !== (Number(b.n) || 0)) return false;
  return JSON.stringify(a.slots || {}) === JSON.stringify(b.slots || {});
}
function sameRun(seq, at, from, len) { for (var k = 0; k < len; k++) if (!sameBlock(seq[at + k], seq[from + k])) return false; return true; }
/** The mockup's findRepeat: runs of one block, repeated sequences up to FOLD_MAX_LEN long (the mockup: six; IG-002: the fetch-and-return dance is nine); best coverage wins, the SHORTER sequence (the higher count) on a tie — Richard's ruling 2026-09-28, the mockup kept the longer. */
function findRepeatIn(seq) {
  var best = null;
  for (var len = 1; len <= ${FOLD_MAX_LEN}; len++) {
    for (var i = 0; i + len * 2 <= seq.length; i++) {
      var count = 1;
      while (i + (count + 1) * len <= seq.length && sameRun(seq, i, i + count * len, len)) count++;
      // P106 s3 (lane F): a run seen only twice that does not start the list is held back. It may be the tail of a longer
      // body the child is still recording (the tulips dance ends right, forward, right, forward), and folding it first
      // leaves a shape the longer body can never fold into. Seen a third time, or from the list's start, it is offered.
      if (count === 2 && i > 0) continue;
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
// P108 IW-004 (lane B): an if's else list (brief §4.3) is walked wherever a body is — the ids, the parent list, the copy,
// the shape — so maxId never mints an id an else block already has.
function findBlock(list, id) { for (var i = 0; i < list.length; i++) { var b = list[i]; if (!b) continue; if (b.id === id) return b; if (b.body) { var f = findBlock(b.body, id); if (f) return f; } if (Array.isArray(b['else'])) { var fe = findBlock(b['else'], id); if (fe) return fe; } } return null; }
function parentListOf(list, id) { for (var i = 0; i < list.length; i++) { var b = list[i]; if (!b) continue; if (b.id === id) return list; if (b.body) { var f = parentListOf(b.body, id); if (f) return f; } if (Array.isArray(b['else'])) { var fe = parentListOf(b['else'], id); if (fe) return fe; } } return null; }
function maxId(list, m) { m = m || 0; for (var i = 0; i < list.length; i++) { var b = list[i]; if (!b) continue; if (Number(b.id) > m) m = Number(b.id); if (b.body) m = maxId(b.body, m); if (Array.isArray(b['else'])) m = maxId(b['else'], m); } return m; }
function reId(block, next) { var c = JSON.parse(JSON.stringify(block)); c.id = next.n++; if (c.body) for (var i = 0; i < c.body.length; i++) c.body[i] = reId(c.body[i], next); if (Array.isArray(c['else'])) for (var e = 0; e < c['else'].length; e++) c['else'][e] = reId(c['else'][e], next); return c; }
function shapeOf(list) { var out = []; for (var i = 0; i < list.length; i++) { var b = list[i]; if (!b) continue; var s = { t: b.t }; if (b.n !== undefined) s.n = b.n; if (b.slots) s.slots = b.slots; if (b.body) s.body = shapeOf(b.body); if (Array.isArray(b['else'])) s['else'] = shapeOf(b['else']); out.push(s); } return out; }
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
// P108 IW-003 (lane M): nothing found is said by what was sought — sayNone:<kind>, worded by the page (Draw world).
Outputs.sayKey = st.delta.none && st.delta.sayKey === 'sayNone' && st.delta.none.kind ? 'sayNone:' + st.delta.none.kind : st.delta.sayKey || '';
Outputs.sayText = st.delta.sayText || '';
Outputs.sayStyle = st.delta.sayStyle || '';
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
function countBlocksFold(list) { var n = 0; for (var j = 0; j < list.length; j++) { if (!list[j]) continue; n++; if (list[j].body) n += countBlocksFold(list[j].body); if (Array.isArray(list[j]['else'])) n += countBlocksFold(list[j]['else']); } return n; }
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
 * resting (a fallback answer) · a Predict miss · done (no more blocks than the request's
 * reference program: hintPerfect — IG-001 D3, and first since IG-002, whose tulips reference
 * is ten blocks; over MANY_BLOCKS: the longer line; else hintDone) · a pick at a rock used up
 * (hintRockGone) · water from an empty can (hintDry) — IG-002 · a bump · a puddle · the rung just played · free play after a clean
 * run (hintFree — IG-001 D4: free play has no goal, so it fell to "Not quite yet") · a
 * run that missed the goal ({w} of {t} tulips; with no tulips in the world, hintNotYet —
 * s4: "Pip did 0 of 0" on Sami's path) · the start — or, in Drive (`Inputs.mode`, P106 s4), hintDriveReady. No key says
 * "tell me": there is no such line.
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
var dries = run ? Number(run.dries) || 0 : 0;
var rockGone = run ? Number(run.rockGone) || 0 : 0;
var noCans = run ? Number(run.noCans) || 0 : 0;
var job = jobOf(w) ? jobProgress(w) : null;
var blocks = countBlocks(program);
var rep = findRepeat(program);
// IG-003 (P106 s3): a win is a run's. Goal met keeps its last answer until the next run finishes, so after Stop has
// emptied the run (Teach, Drive, Start over) a met goal with no run behind it is a leftover, never the hint.
var goalMetNow = Inputs.goalMet === true && ran;
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
else if (oliveFallback) key = rung >= 1 && rung <= ${OLIVE_RUNG_MAX} ? 'oliveResting' + rung : 'oliveResting';
// P108 IW-001 F2: the Runner stopped a played run at the cap (the run is kept): a loop that never ends.
else if (Inputs.capped === true && ran) key = 'iw1Loop';
else if (predictAsked && !predictHit) key = 'hintPredictMiss';
else if (goalMetNow) { key = referenceCount > 0 && blocks <= referenceCount ? 'hintPerfect' : blocks > ${MANY_BLOCKS} ? 'hintDoneMany' : 'hintDone'; vars = { k: blocks }; }
else if (rockGone > 0) key = 'hintRockGone';
else if (dries > 0) key = 'hintDry';
else if (bumps > 0) key = 'hintBump';
else if (puddles > 0) key = 'hintWet';
// P108 IW-003 (s3 base): no can in hand; then (after Olive's line and free play) how much of the job is done.
else if (noCans > 0) key = 'iw3NoCan';
// P108 IW-003 (lane P): Olive read an envelope — the line names go to, not the if of Mamie's note.
else if (rung === 2 && mailRan(run)) key = 'iw3pRead';
else if (rung >= 1 && rung <= ${OLIVE_RUNG_MAX}) key = 'oliveRung' + rung;
else if (freePlay && ran) key = 'hintFree';
// P108 IW-003 (lane B): every target full and the robot home, yet no win — the goal wants the mission's own block (an if,
// an until, a when): "3 of 3 done. What is still waiting?" would send her looking for a job that is not there.
else if (ran && job && job.total > 0 && job.full === job.total) key = 'iw3bTrick';
else if (ran && job && job.total > 0) { key = 'iw3Job'; vars = { w: job.full, t: job.total }; }
else if (ran && total > 0) { key = 'hintMissed'; vars = { w: done, t: total }; }
else if (ran) key = 'hintNotYet';
// P106 s4: a program not run yet, in Drive: Play it or Teach more — the start line ("press Teach and show") is Teach's.
else if (String(Inputs.mode || '') === 'drive') key = 'hintDriveReady';
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
var LABEL = { fwd: 'Fwd', left: 'Left', right: 'Right', water: 'Water', fill: 'Fill', pick: 'Pick', put: 'Put', say: 'Say', repeat: 'Repeat', until: 'Until', 'if': 'If', when: 'When', count_inc: 'CountInc', trick: 'Trick', 'do': 'Do', ask: 'Ask', go_nearest: 'GoNearest', go_to: 'GoTo', set: 'Set', change: 'Change' };
var band = Number(Inputs.band) === 1 ? 1 : 2;
var allowed = Array.isArray(Inputs.allowed) && Inputs.allowed.length ? Inputs.allowed : null;
var lang = String(Inputs.lang) === 'fr' ? 'fr' : 'en';
// P106 IG-005 (R8): the palette is band × request × ROBOT. Robot is the robot doing the job (a row with its kind and
// palette, or a catalogue kind); it keeps every move, the controls of the band and what it can do. Needs is the kind
// the request asks for: another robot is refused (no palette at all). No robot (free play) filters nothing.
var ROBOTS = ${ROBOTS_JSON};
var CAN_ALWAYS = ${JSON.stringify([...ROBOT_MOVES, ...ROBOT_CONTROLS])};
var bot = Inputs.robot && typeof Inputs.robot === 'object' ? Inputs.robot : null;
if (!bot && typeof Inputs.robot === 'string' && Inputs.robot) for (var rk = 0; rk < ROBOTS.length; rk++) if (ROBOTS[rk].id === Inputs.robot) bot = ROBOTS[rk];
var botKind = bot ? String(bot.kind || bot.id || '') : '';
var needs = String(Inputs.needs || '');
var refused = !!bot && needs !== '' && botKind !== needs;
var botCan = bot ? CAN_ALWAYS.concat(Array.isArray(bot.palette) ? bot.palette : []) : null;
var rows = Array.isArray(Inputs.words) ? Inputs.words : [];
var word = {};
for (var i = 0; i < rows.length; i++) word[rows[i].key] = rows[i][lang] || rows[i].en || '';
var ids = band === 1 ? BAND1 : ALL;
var out = [];
for (var j = 0; j < ids.length; j++) {
  var id = ids[j];
  if (allowed && allowed.indexOf(id) === -1) continue;
  if (refused || (botCan && botCan.indexOf(id) === -1)) continue;
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
  // IG-006: only a BLOCK is placed (a lesson is asked on Skills, the voicing is the owl row's).
  if (!rr || rid === 'voice-hint' || rr.use !== 'block' || (Number(rr.band) || 1) > band) continue;
  if (refused || (botCan && botCan.indexOf('olive:' + rid) === -1)) continue;
  if (withheld.indexOf(rid) !== -1) { heldHere.push(rid); continue; }
  offered.push(rid);
  var title = word[OLIVE_RUNG_WORD[rid]] || rid;
  olive.push({ id: 'olive:' + rid, kind: 'ask', label: title, caption: title, hasBody: false, hasCount: false, slots: olivePickerSlots(rid, band, lang, Inputs.narrow, word), band: band, rung: rid, shape: rr.shape, shapeLabel: word[OLIVE_SHAPE_WORD[rr.shape]] || rr.shape, ladder: rr.ladder });
}
if (rungIds.length) { var kept = []; for (var o = 0; o < out.length; o++) if (out[o].id !== 'ask') kept.push(out[o]); out = kept.concat(olive); }
Outputs.palette = out;
Outputs.olive = olive;
Outputs.offered = offered;
Outputs.withheld = withheld;
Outputs.heldHere = heldHere;
Outputs.count = out.length;
Outputs.band = band;
Outputs.refused = refused;
`;

// ── The save model ──────────────────────────────────────────────────────────

/**
 * The family model (v4): `{ v, family: { id, created }, profiles: [...], island: { activeId, done, plots, robots } }`.
 * A profile is `{ id, name, band, lang, face, robot: { name, color, eye, hat }, tricks: { n1..n7 }, stickers, hats,
 * island: { done, plots, robots } }` — ONE ISLAND PER KID (ruling 8): what a child has done, and the robots she left
 * working on it, are hers. P106 IG-004 (R1): `plots[requestId] = { program, robotId, wonAt }` — a plot is PINNED while
 * its program is a non-empty list and its robotId names one of `robots` (a robot works one plot at a time); a robot
 * brought home leaves `{ program: null, robotId: '', wonAt }`. P108 IW-001 F8: `cardsSeen` (optional, absent = none) is
 * the block cards the child has seen — packed as row 15 only when there are any. `robots` is `[{ id: 'r1' }]` in v4 (its look is
 * `profile.robot`); IG-005 adds more. v3's `placed` was never written by anything: it is dropped, never migrated.
 * P108 IW-006 (v5): a profile's `shells: { earned, spent }` and `owned: [shop ids]`; a plot's optional `live` (its job as
 * the island left it: `{ things, age, seed, spent? }`); a robot row's optional `brain` (16 or 20); robot rows of any id
 * (a copy bought in the shop has its own id and its `kind`).
 *
 * `model.island` is the island ON SCREEN: `activeId`, and `done`/`plots`/`robots` DERIVED from the active profile (the
 * very same objects, so a reader of `model.island.done` reads the active kid's). It is never read back from a stored
 * model: `modelOf` re-derives it every time, so a stale copy in storage cannot leak into anyone's island.
 *
 * The migration rule for a v1/v2 family (one island for the family): EVERY existing profile keeps what the family had
 * done — nobody loses a request they finished together. A v3 profile keeps its own `done`. `migrationDue(raw)` says a
 * stored model is older than v5 so the page writes the migrated model back at once (an on-load migration owes its own
 * save, P100).
 */
export const SAVE_HELPERS = `
var SAVE_VERSION = ${SAVE_VERSION};
var MAX_PROFILES = ${MAX_PROFILES};
var ROBOT_NAME_MAX = ${ROBOT_NAME_MAX};
var CARDS_MAX = ${CARDS_MAX};
var TRICK_KEYS = ${JSON.stringify(TRICK_KEYS)};
var FIRST_ROBOT_ID = ${JSON.stringify(FIRST_ROBOT_ID)};
var ROBOTS = ${ROBOTS_JSON};
var UPGRADES = ${UPGRADES_JSON};
// P108 IW-006 / IW-008 (session-4 base): the economy's names.
var BRAIN_SIZE = ${BRAIN_SIZE};
var BRAIN_SIZES = ${JSON.stringify(BRAIN_SIZES)};
var CREW_CAP = ${CREW_CAP};
var SHOP = ${SHOP_JSON};
function newId(prefix) { return prefix + Date.now().toString(36) + Math.floor(Math.random() * 46656).toString(36); }
function tricksOf(raw) {
  var out = {};
  for (var i = 0; i < TRICK_KEYS.length; i++) { var v = raw && raw[TRICK_KEYS[i]]; out[TRICK_KEYS[i]] = v === 'bloom' || v === 'sprout' ? v : (TRICK_KEYS[i] === 'n1' ? 'sprout' : 'seed'); }
  return out;
}
/** IG-004: the robots of an island — every { id } row once, the first robot always there and first. */
function robotsOf(raw) {
  var out = [{ id: FIRST_ROBOT_ID }], seen = {};
  seen[FIRST_ROBOT_ID] = 1;
  var list = Array.isArray(raw) ? raw : [];
  for (var i = 0; i < list.length; i++) {
    var r = list[i], id = r && typeof r === 'object' ? String(r.id || '') : typeof r === 'string' ? r : '';
    // P108 IW-006 (v5): r1 is always first; its stored row gives it only its brain.
    if (id === FIRST_ROBOT_ID && seen[id] === 1) { brainOnto(out[0], r); seen[id] = 2; continue; }
    if (!id || seen[id]) continue;
    seen[id] = 1;
    // IG-005: a lent robot's row keeps its own kind and look (each field only when it is there and sound); r1's look
    // stays profile.robot (one source). A v4 row from session 3 is { id } and reads as it did.
    out.push(id === FIRST_ROBOT_ID ? brainOnto({ id: id }, r) : robotFields(id, r));
  }
  return out;
}
/** P108 IW-006 (v5): a row's brain, kept only when it is one of BRAIN_SIZES and bigger than BRAIN_SIZE (absent = BRAIN_SIZE). */
function brainOnto(row, r) {
  var b = r && typeof r === 'object' ? Math.floor(Number(r.brain)) : 0;
  if (b > BRAIN_SIZE && BRAIN_SIZES.indexOf(b) !== -1) row.brain = b;
  return row;
}
/** IG-005: a robot row's own fields, each kept only when it is there and sound (kind, name, color, eye, hat). */
function robotFields(id, r) {
  var row = { id: id };
  if (!r || typeof r !== 'object') return row;
  if (robotSpec(r.kind)) row.kind = String(r.kind);
  var n = typeof r.name === 'string' ? r.name.trim().slice(0, ROBOT_NAME_MAX) : '';
  if (n) row.name = n;
  if (typeof r.color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(r.color)) row.color = r.color;
  if (r.eye === 'round' || r.eye === 'happy' || r.eye === 'wink') row.eye = r.eye;
  if (typeof r.hat === 'string' && r.hat) row.hat = r.hat;
  return brainOnto(row, r);
}
/** IG-005: the catalogue's entry for a robot kind, or null. */
function robotSpec(kind) { for (var i = 0; i < ROBOTS.length; i++) if (ROBOTS[i].id === String(kind)) return ROBOTS[i]; return null; }
/** IG-005: a row's kind — its own, else its id when that is a kind (a lent robot's id IS its kind), else Pip. */
function robotKindOf(row) {
  if (!row) return 'pip';
  if (row.id === FIRST_ROBOT_ID) return 'pip';
  if (robotSpec(row.kind)) return String(row.kind);
  return robotSpec(row.id) ? String(row.id) : 'pip';
}
/**
 * IG-005: a robot as the pages use it — its look (r1's is profile.robot; a lent one's its row, else the catalogue's
 * name in the profile's language and colour), what it can do, its can and basket with the upgrades the profile owns
 * applied, its step factor (boots), and the plot it works ('' at home).
 */
function robotRow(p, row) {
  var kind = robotKindOf(row), spec = robotSpec(kind) || ROBOTS[0], first = row.id === FIRST_ROBOT_ID;
  var lang = p && p.lang === 'fr' ? 'fr' : 'en';
  var look = first && p ? p.robot : row;
  var out = {
    id: String(row.id), kind: kind,
    name: String((look && look.name) || spec.defaultName[lang] || spec.defaultName.en).slice(0, ROBOT_NAME_MAX),
    color: String((look && look.color) || spec.colour), eye: String((look && look.eye) || 'round'), hat: String((look && look.hat) || 'none'),
    accessory: spec.accessory, palette: spec.palette.slice(), canMax: spec.canMax, basket: spec.basket, stepFactor: 1,
    upgrade: spec.upgrade, upgraded: false, lentBy: spec.lentBy || '', working: p ? plotOfRobot(p.island, String(row.id)) : '',
    brain: Number(row.brain) > BRAIN_SIZE ? Number(row.brain) : BRAIN_SIZE
  };
  // P108 IW-006 (v5): an upgrade counts given (an islander's sticker) or bought (the shop's owned).
  var owned = (p && Array.isArray(p.stickers) ? p.stickers : []).concat(p && Array.isArray(p.owned) ? p.owned : []);
  for (var u = 0; u < UPGRADES.length; u++) {
    var up = UPGRADES[u];
    if (owned.indexOf(up.id) === -1 || up.fits.indexOf(kind) === -1) continue;
    if (up.canMax) out.canMax = up.canMax;
    if (up.basket) out.basket = up.basket;
    if (up.stepFactor) out.stepFactor = up.stepFactor;
    if (up.id === spec.upgrade) out.upgraded = true;
  }
  return out;
}
/** IG-005: every robot of a profile, resolved (r1 first). */
function robotRowsOf(p) { var out = []; var list = p && p.island ? p.island.robots : [{ id: FIRST_ROBOT_ID }]; for (var i = 0; i < list.length; i++) out.push(robotRow(p, list[i])); return out; }
/** IG-005: the robot of a profile that does a job needing this kind ('' when she has none of that kind). */
function jobRobotId(p, kind) {
  var want = robotSpec(kind) ? String(kind) : 'pip';
  var list = p && p.island ? p.island.robots : [{ id: FIRST_ROBOT_ID }];
  for (var i = 0; i < list.length; i++) if (robotKindOf(list[i]) === want) return String(list[i].id);
  return '';
}
/** IG-005: lend a robot of this kind to a profile (once): its id is its kind, its name the catalogue's in her language. */
function lendRobot(p, kind) {
  var spec = robotSpec(kind);
  if (!p || !spec || spec.id === 'pip' || jobRobotId(p, spec.id)) return false;
  p.island.robots.push({ id: spec.id, kind: spec.id, name: spec.defaultName[p.lang === 'fr' ? 'fr' : 'en'], color: spec.colour, eye: 'round', hat: 'none' });
  return true;
}
/** IG-004: a program as the save keeps it — a list (JSON text is read), else null. */
function programOf(v) {
  var p = v;
  if (typeof p === 'string') { try { p = JSON.parse(p); } catch (e) { p = null; } }
  return Array.isArray(p) ? JSON.parse(JSON.stringify(p)) : null;
}
/** IG-004: is this plot pinned (a program to run, and a robot of this island running it)? */
function pinnedPlot(plot, robots) {
  if (!plot || !Array.isArray(plot.program) || !plot.program.length || !plot.robotId) return false;
  for (var i = 0; i < robots.length; i++) if (robots[i].id === plot.robotId) return true;
  return false;
}
/** IG-004: the plots of an island. A robot pinned twice keeps the plot it won last; the other plot lets it go. */
function plotsOf(raw, robots) {
  var out = {}, ids = [];
  var src = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  for (var id in src) {
    var p = src[id];
    if (!id || id === 'free' || !p || typeof p !== 'object') continue;
    out[id] = { program: programOf(p.program), robotId: String(p.robotId || ''), wonAt: Number(p.wonAt) || 0 };
    // P108 IW-006 (v5): the job as the island left it, when there is one.
    var lv = liveOf(p.live);
    if (lv) out[id].live = lv;
    if (!pinnedPlot(out[id], robots)) out[id].robotId = '';
    ids.push(id);
  }
  ids.sort(function (a, b) { return out[b].wonAt - out[a].wonAt; });
  var taken = {};
  for (var k = 0; k < ids.length; k++) {
    var q = out[ids[k]];
    if (!q.robotId) continue;
    if (taken[q.robotId]) q.robotId = '';
    else taken[q.robotId] = ids[k];
  }
  return out;
}
/**
 * P108 IW-006 (v5): a plot's live job as the save keeps it — '{ things, age, seed }' (+ 'spent', the things used up, when
 * any; + 'helper', the shop helper at work on this job until it is done, IW-006 AC4), or null when it is not one. The
 * island goes on from it after a restart (IW-002 AC3 across an app restart).
 */
function liveOf(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || !Array.isArray(raw.things)) return null;
  var out = { things: JSON.parse(JSON.stringify(raw.things)), age: Math.max(0, Math.floor(Number(raw.age)) || 0), seed: Number(raw.seed) >>> 0 };
  if (Array.isArray(raw.spent) && raw.spent.length) out.spent = JSON.parse(JSON.stringify(raw.spent));
  if (typeof raw.helper === 'string' && raw.helper) out.helper = raw.helper.slice(0, 40);
  return out;
}
function islandOf(raw) {
  var i = raw && typeof raw === 'object' ? raw : {};
  var done = [];
  var list = Array.isArray(i.done) ? i.done : [];
  for (var k = 0; k < list.length; k++) if (done.indexOf(String(list[k])) === -1) done.push(String(list[k]));
  var robots = robotsOf(i.robots);
  // v3's placed is not read: nothing ever wrote it (IG-004).
  return { done: done, plots: plotsOf(i.plots, robots), robots: robots };
}
/** IG-004: the plot a robot is pinned to on an island, or ''. */
function plotOfRobot(island, robotId) {
  var plots = island && island.plots ? island.plots : {};
  for (var id in plots) if (plots[id] && plots[id].robotId === robotId && Array.isArray(plots[id].program) && plots[id].program.length) return id;
  return '';
}
function profileOf(raw) {
  var p = raw && typeof raw === 'object' ? raw : {};
  var robot = p.robot && typeof p.robot === 'object' ? p.robot : {};
  var out = {
    id: String(p.id || newId('p')), name: String(p.name || '').slice(0, 24), band: Number(p.band) === 1 ? 1 : 2, lang: p.lang === 'fr' ? 'fr' : 'en',
    face: String(p.face || ''),
    robot: { name: String(robot.name || 'Pip').slice(0, ROBOT_NAME_MAX), color: String(robot.color || '#FF7A59'), eye: String(robot.eye || 'round'), hat: String(robot.hat || 'none') },
    tricks: tricksOf(p.tricks), stickers: Array.isArray(p.stickers) ? p.stickers.map(String) : [], hats: Array.isArray(p.hats) ? p.hats.map(String) : [],
    island: islandOf(p.island),
    // P108 IW-006 (v5): her shells (earned only grows; spent is a second number, D4) and what she bought.
    shells: shellsOf(p.shells), owned: ownedOf(p.owned)
  };
  // P108 IW-001 F8: the block cards this child has seen (Got it), OPTIONAL — absent is none seen, so a profile without
  // it is this very profile (adding the field owed no migration; v5, IW-006, did).
  var seen = cardsOf(p.cardsSeen);
  if (seen.length) out.cardsSeen = seen;
  return out;
}
/** IW-001 F8: a cards-seen list as the save keeps it — text ids, trimmed, once each, first seen first, at most CARDS_MAX. */
function cardsOf(raw) {
  var out = [], list = Array.isArray(raw) ? raw : [];
  for (var i = 0; i < list.length && out.length < CARDS_MAX; i++) {
    var id = typeof list[i] === 'string' ? list[i].trim().slice(0, 40) : '';
    if (id && out.indexOf(id) === -1) out.push(id);
  }
  return out;
}
/** P108 IW-006 (v5): a wallet — whole shells, never below 0, never more spent than earned. */
function shellsOf(raw) {
  var r = raw && typeof raw === 'object' ? raw : {};
  var earned = Math.max(0, Math.floor(Number(r.earned)) || 0);
  return { earned: earned, spent: Math.min(earned, Math.max(0, Math.floor(Number(r.spent)) || 0)) };
}
/**
 * P108 IW-006 (v5): what she bought and still has — text ids (the shop's), trimmed, once each, in the order bought, at most
 * CARDS_MAX (a helper leaves it when used). Not filtered by the catalogue: the shell packs the same list without one.
 */
function ownedOf(raw) {
  var out = [], list = Array.isArray(raw) ? raw : [];
  for (var i = 0; i < list.length && out.length < CARDS_MAX; i++) { var id = typeof list[i] === 'string' ? list[i].trim().slice(0, 40) : ''; if (id && out.indexOf(id) === -1) out.push(id); }
  return out;
}
/** P108 IW-006: the catalogue's entry, or null. */
function shopItem(id) { for (var i = 0; i < SHOP.length; i++) if (SHOP[i].id === String(id)) return SHOP[i]; return null; }
/** P108 IW-006 (D4): what she can spend. */
function balanceOf(p) { return p && p.shells ? p.shells.earned - p.shells.spent : 0; }
/** P108 IW-006 (D2): shells earned — whole, never negative; earned only grows. Returns what was added. */
function earnShells(p, n) { var k = Math.max(0, Math.floor(Number(n)) || 0); if (p && k) p.shells.earned += k; return k; }
/**
 * P108 IW-006 / IW-008 — THE purchase rule (the purchase card's Buy; the one place spent rises). Returns
 * '{ ok, error, short, left, robotId }': error '' | 'unknown' | 'short' (short = how many more shells) | 'kind' (a copy of a
 * robot kind the island does not have) | 'cap' (CREW_CAP robots) | 'robot' (a brain for no robot of hers) | 'size' (that
 * robot's brain is not the size before this one) | 'held' (that helper is held already, unused) | 'owned' (that upgrade is hers).
 * 'opts.robotId' names the robot a brain is for; 'opts.name' a copy's name (else the kind's name and its number).
 */
function buyItem(p, id, opts) {
  var o = opts && typeof opts === 'object' ? opts : {};
  var it = shopItem(id), out = { ok: false, error: '', short: 0, left: balanceOf(p), robotId: '' };
  if (!p || !it) { out.error = 'unknown'; return out; }
  var row = null;
  if (it.kind === 'robot') {
    if (!jobRobotId(p, it.robot)) { out.error = 'kind'; return out; }
    if (p.island.robots.length >= CREW_CAP) { out.error = 'cap'; return out; }
  } else if (it.kind === 'brain') {
    for (var r = 0; r < p.island.robots.length; r++) if (p.island.robots[r].id === String(o.robotId || '')) row = p.island.robots[r];
    if (!row) { out.error = 'robot'; return out; }
    var at = BRAIN_SIZES.indexOf(Number(row.brain) > BRAIN_SIZE ? Number(row.brain) : BRAIN_SIZE);
    if (BRAIN_SIZES[at + 1] !== it.size) { out.error = 'size'; return out; }
  } else if (p.owned.indexOf(it.id) !== -1 || (it.kind === 'upgrade' && p.stickers.indexOf(it.upgrade) !== -1)) { out.error = it.kind === 'helper' ? 'held' : 'owned'; return out; }
  if (balanceOf(p) < it.price) { out.error = 'short'; out.short = it.price - balanceOf(p); return out; }
  p.shells.spent += it.price;
  if (it.kind === 'robot') {
    var spec = robotSpec(it.robot), lang = p.lang === 'fr' ? 'fr' : 'en', n = 1;
    for (var k = 0; k < p.island.robots.length; k++) if (robotKindOf(p.island.robots[k]) === it.robot) n++;
    var nm = typeof o.name === 'string' ? o.name.trim().slice(0, ROBOT_NAME_MAX) : '';
    var nid = newId('r');
    p.island.robots.push({ id: nid, kind: spec.id, name: nm || (spec.defaultName[lang] + ' ' + n).slice(0, ROBOT_NAME_MAX), color: spec.colour, eye: 'round', hat: 'none' });
    out.robotId = nid;
  } else if (it.kind === 'brain') row.brain = it.size;
  else p.owned.push(it.id);
  out.ok = true;
  out.left = balanceOf(p);
  return out;
}
/** A stored model older than the current version (v5) that has anyone in it: the page writes the migrated model back at once. */
function migrationDue(raw) {
  return !!raw && typeof raw === 'object' && Array.isArray(raw.profiles) && raw.profiles.length > 0 && !(Number(raw.v) >= SAVE_VERSION);
}
function modelOf(raw) {
  var m = raw && typeof raw === 'object' ? raw : {};
  var fam = m.family && typeof m.family === 'object' ? m.family : {};
  var isl = m.island && typeof m.island === 'object' ? m.island : {};
  // v1/v2 had ONE island for the family; v3 (ruling 8) and v4 keep one per profile.
  var old = !(Number(m.v) >= 3);
  var profiles = [];
  var list = Array.isArray(m.profiles) ? m.profiles : [];
  for (var i = 0; i < list.length && i < MAX_PROFILES; i++) {
    var p = profileOf(list[i]);
    // v1/v2: the family had one island. Every existing profile keeps what it had done (the rule, CG-002 §8).
    if (old) p.island = islandOf({ done: isl.done });
    profiles.push(p);
  }
  var model = { v: SAVE_VERSION, family: { id: String(fam.id || newId('f')), created: Number(fam.created) || Date.now() }, profiles: profiles, island: null };
  return activate(model, String(isl.activeId || (profiles[0] ? profiles[0].id : '')));
}
/** The profile playing: model.island becomes its island (the same objects), never a copy that could go stale. */
function activate(model, id) {
  var active = null;
  for (var j = 0; j < model.profiles.length; j++) if (model.profiles[j].id === id) active = model.profiles[j];
  model.island = { activeId: String(id || ''), done: active ? active.island.done : [], plots: active ? active.island.plots : {}, robots: active ? active.island.robots : [{ id: FIRST_ROBOT_ID }] };
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
 * it. Never a score. P106 IG-004 (R1): the program that won is kept in the plot
 * with the robot that ran it — the robot is PINNED there (taken off any other
 * plot first: a robot works one plot). No program (or free play) pins nothing.
 * `Inputs.robotId` defaults to the island's first robot; `Inputs.now` to the clock.
 */
export const COMPLETE_REQUEST_SCRIPT = `${SAVE_HELPERS}
var model = modelOf(Inputs.model);
var requestId = String(Inputs.requestId || '');
var profileId = String(Inputs.profileId || model.island.activeId);
var tricks = Array.isArray(Inputs.tricks) ? Inputs.tricks : [];
var reward = Inputs.reward && typeof Inputs.reward === 'object' ? Inputs.reward : null;
var program = programOf(Inputs.program);
var p = null;
for (var i = 0; i < model.profiles.length; i++) if (model.profiles[i].id === profileId) p = model.profiles[i];
var newlyDone = false, bloomed = [], pinned = '', lent = [], upgraded = [];
if (p) {
  if (requestId && p.island.done.indexOf(requestId) === -1) { p.island.done.push(requestId); newlyDone = true; }
  for (var t = 0; t < tricks.length; t++) { var key = 'n' + Math.floor(Number(tricks[t])); if (p.tricks[key] !== undefined && p.tricks[key] !== 'bloom') { p.tricks[key] = 'bloom'; bloomed.push(key); } }
  if (reward && reward.kind === 'hat' && p.hats.indexOf(String(reward.id)) === -1) p.hats.push(String(reward.id));
  if (reward && (reward.kind === 'sticker' || reward.kind === 'item' || reward.kind === 'seed') && p.stickers.indexOf(String(reward.id)) === -1) p.stickers.push(String(reward.id));
  // P106 IG-005: a robot reward lends that robot (its name the catalogue's, in her language); the catalogue's own gifts
  // for this request — the robot an islander lends after it, the upgrade she gives — come with every first win.
  if (reward && reward.kind === 'robot' && lendRobot(p, reward.id)) lent.push(String(reward.id));
  for (var g = 0; g < ROBOTS.length; g++) if (requestId && ROBOTS[g].unlockedBy === requestId && lendRobot(p, ROBOTS[g].id)) lent.push(ROBOTS[g].id);
  // P108 IW-006 (lane H): the upgrades moved to the shop — a first win no longer gives one; the shop shows it once its
  // request is done (Shop rows). One given before (a sticker) is still hers; Upgraded stays empty.
  var robotId = String(Inputs.robotId || p.island.robots[0].id);
  var known = false;
  for (var r = 0; r < p.island.robots.length; r++) if (p.island.robots[r].id === robotId) known = true;
  if (requestId && requestId !== 'free' && program && program.length && known) {
    for (var other in p.island.plots) if (other !== requestId && p.island.plots[other].robotId === robotId) p.island.plots[other].robotId = '';
    p.island.plots[requestId] = { program: program, robotId: robotId, wonAt: Number(Inputs.now) > 0 ? Number(Inputs.now) : Date.now() };
    pinned = robotId;
  }
}
Outputs.model = model;
Outputs.newlyDone = newlyDone;
Outputs.bloomed = bloomed;
Outputs.found = !!p;
Outputs.pinned = pinned;
Outputs.lent = lent;
Outputs.upgraded = upgraded;
`;

/**
 * P106 IG-004 — "bring {name} home": the robot leaves the plot it was pinned to. The plot keeps its win (`done`, its
 * `wonAt`) and is drawn as it was won; its program is cleared and nobody runs it. `Inputs.robotId` (default: the
 * island's first robot); `Outputs.freed` is the request the robot left ('' when it was already home).
 */
export const BRING_HOME_SCRIPT = `${SAVE_HELPERS}
var model = modelOf(Inputs.model);
var profileId = String(Inputs.profileId || model.island.activeId);
var p = null;
for (var i = 0; i < model.profiles.length; i++) if (model.profiles[i].id === profileId) p = model.profiles[i];
var freed = '';
if (p) {
  var robotId = String(Inputs.robotId || p.island.robots[0].id);
  freed = plotOfRobot(p.island, robotId);
  if (freed) p.island.plots[freed] = { program: null, robotId: '', wonAt: p.island.plots[freed].wonAt };
}
Outputs.model = model;
Outputs.freed = freed;
Outputs.found = !!p;
`;

/**
 * P106 IG-005 — one field of one robot on My robots (`field` is a parameter, placed once per field, like Update
 * profile): `name`, `color`, `eye` or `hat` (a hat she owns, or none). The first robot's look is the profile's own
 * (`profile.robot`), so renaming Pip here is renaming him everywhere; a lent robot's look is its row.
 */
export const UPDATE_ROBOT_SCRIPT = `${SAVE_HELPERS}
var model = modelOf(Inputs.model && typeof Inputs.model === 'object' ? Inputs.model : {});
var id = String(Inputs.profileId || model.island.activeId);
var robotId = String(Inputs.robotId || FIRST_ROBOT_ID);
var field = String(Inputs.field || '');
// A card's colour and hat rows carry their card's kind before a | (a repeater row is global by id): the value is after it.
var v = (field === 'color' || field === 'hat') && typeof Inputs.value === 'string' ? Inputs.value.slice(Inputs.value.lastIndexOf('|') + 1) : Inputs.value;
var p = null, row = null, changed = false;
for (var i = 0; i < model.profiles.length; i++) if (model.profiles[i].id === id) p = model.profiles[i];
if (p) for (var r = 0; r < p.island.robots.length; r++) if (p.island.robots[r].id === robotId) row = p.island.robots[r];
if (p && row) {
  // The look being changed: r1's is the profile's; a lent robot's row starts from what the pages show for it.
  var cur = robotRow(p, row);
  var look = row.id === FIRST_ROBOT_ID ? p.robot : row;
  if (row.id !== FIRST_ROBOT_ID) { row.kind = cur.kind; row.name = cur.name; row.color = cur.color; row.eye = cur.eye; row.hat = cur.hat; }
  if (field === 'name') { var n = String(v || '').trim().slice(0, ROBOT_NAME_MAX); if (n && n !== cur.name) { look.name = n; changed = true; } }
  else if (field === 'color') { var c = String(v || ''); if (/^#[0-9A-Fa-f]{6}$/.test(c) && c !== cur.color) { look.color = c; changed = true; } }
  else if (field === 'eye') { var e = String(v || ''); if ((e === 'round' || e === 'happy' || e === 'wink') && e !== cur.eye) { look.eye = e; changed = true; } }
  else if (field === 'hat') { var h = String(v || ''); if ((h === 'none' || p.hats.indexOf(h) !== -1) && h !== cur.hat) { look.hat = h; changed = true; } }
}
Outputs.model = model;
Outputs.changed = changed;
Outputs.found = !!row;
`;

/** The family as a code: base64 of the packed model with its version, like Rocket School's. */
export const ENCODE_SAVE_SCRIPT = `${SAVE_HELPERS}
var model = modelOf(Inputs.model);
var packed = { v: SAVE_VERSION, f: [model.family.id, model.family.created], p: [], a: model.island.activeId };
for (var i = 0; i < model.profiles.length; i++) {
  var p = model.profiles[i], tr = '';
  for (var k = 0; k < TRICK_KEYS.length; k++) tr += p.tricks[TRICK_KEYS[k]] === 'bloom' ? 'b' : p.tricks[TRICK_KEYS[k]] === 'sprout' ? 's' : '-';
  // IG-004: the plots as [requestId, program, robotId, wonAt] rows (sorted: the same island is the same code), the robots as ids.
  var plots = [];
  // P108 IW-006 (v5): a plot's live job rides as a fifth field, only when it has one.
  for (var id in p.island.plots) { var pr = [id, p.island.plots[id].program, p.island.plots[id].robotId, p.island.plots[id].wonAt]; if (p.island.plots[id].live) pr.push(p.island.plots[id].live); plots.push(pr); }
  plots.sort(function (x, y) { return x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : 0; });
  var robots = [];
  // IG-005: r1 (and any row with nothing of its own) is its id, as in session 3; a lent robot is [id, kind, name, color, eye, hat].
  // P108 IW-006 (v5): a robot with a bigger brain is always a row, its brain the seventh field.
  for (var r = 0; r < p.island.robots.length; r++) {
    var rb = p.island.robots[r], rr = (rb.id === FIRST_ROBOT_ID || !rb.kind) && !rb.brain ? rb.id : [rb.id, rb.id === FIRST_ROBOT_ID ? '' : rb.kind || '', rb.name || '', rb.color || '', rb.eye || '', rb.hat || ''];
    if (rb.brain && Array.isArray(rr)) rr.push(rb.brain);
    robots.push(rr);
  }
  var row = [p.id, p.name, p.band, p.lang, p.face, p.robot.name, p.robot.color, p.robot.eye, p.robot.hat, tr, p.stickers, p.hats, p.island.done, plots, robots];
  // P108 IW-001 F8: row 15, the cards seen (null when none). P108 IW-006 (v5): row 16 the shells [earned, spent], row 17 owned.
  row.push(p.cardsSeen && p.cardsSeen.length ? p.cardsSeen : null, [p.shells.earned, p.shells.spent], p.owned);
  packed.p.push(row);
}
var code = 'BG1.' + toB64(JSON.stringify(packed));
Outputs.code = code;
Outputs.length = code.length;
`;

/**
 * A code back into a model. A v1 code (no tricks, stickers, hats or placed
 * things) or a v2 code (one island for the family) decodes by the migration
 * rule — every profile keeps what the family had done; a v3 code (one island
 * per kid, row 13 = the never-written `placed`, dropped) keeps each kid's own.
 * Anything older than v5 says `migrated`, so the page saves it at once: an
 * on-load migration owes its own save (P100).
 */
export const DECODE_SAVE_SCRIPT = `${SAVE_HELPERS}
var code = String(Inputs.code || '').trim();
var ok = false, error = '', migrated = false, model = null;
try {
  if (code.indexOf('BG1.') !== 0) throw new Error('prefix');
  var packed = JSON.parse(fromB64(code.slice(4)));
  if (!packed || [1, 2, 3, 4, 5].indexOf(packed.v) === -1 || !Array.isArray(packed.p) || !Array.isArray(packed.f)) throw new Error('shape');
  var v2 = packed.v >= 2, v3 = packed.v >= 3, v4 = packed.v >= 4, v5 = packed.v >= 5;
  var family = { done: Array.isArray(packed.d) ? packed.d : [] };
  var profiles = [];
  for (var i = 0; i < packed.p.length; i++) {
    var a = packed.p[i];
    var tricks = {};
    if (v2 && typeof a[9] === 'string') for (var k = 0; k < TRICK_KEYS.length; k++) tricks[TRICK_KEYS[k]] = a[9].charAt(k) === 'b' ? 'bloom' : a[9].charAt(k) === 's' ? 'sprout' : 'seed';
    var plots = {};
    if (v4 && Array.isArray(a[13])) for (var q = 0; q < a[13].length; q++) { var row = a[13][q]; if (Array.isArray(row) && row[0]) plots[String(row[0])] = { program: row[1], robotId: row[2], wonAt: row[3], live: v5 ? row[4] : undefined }; }
    // IG-005: a robot is its id (session 3, and r1) or [id, kind, name, color, eye, hat] (a lent robot and its look).
    var robots = [];
    if (v4 && Array.isArray(a[14])) for (var rb = 0; rb < a[14].length; rb++) { var ro = a[14][rb]; robots.push(Array.isArray(ro) ? { id: ro[0], kind: ro[1], name: ro[2], color: ro[3], eye: ro[4], hat: ro[5], brain: v5 ? ro[6] : undefined } : ro); }
    var island = v4 ? { done: a[12], plots: plots, robots: robots } : v3 ? { done: a[12] } : family;
    profiles.push({ id: a[0], name: a[1], band: a[2], lang: a[3], face: a[4], robot: { name: a[5], color: a[6], eye: a[7], hat: a[8] }, tricks: v2 ? tricks : undefined, stickers: v2 ? a[10] : [], hats: v2 ? a[11] : [], island: island, cardsSeen: v4 && Array.isArray(a[15]) ? a[15] : undefined, shells: v5 && Array.isArray(a[16]) ? { earned: a[16][0], spent: a[16][1] } : undefined, owned: v5 ? a[17] : undefined });
  }
  model = modelOf({ v: SAVE_VERSION, family: { id: packed.f[0], created: packed.f[1] }, profiles: profiles, island: { activeId: packed.a } });
  migrated = !v5;
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
  { component: 'Logic/Hint table', script: HINT_TABLE_SCRIPT, seam: 'every hint line in the chosen language' },
  // P106 IG-004 (lane E): the robot leaves its plot.
  { component: 'Logic/Bring home', script: BRING_HOME_SCRIPT, seam: 'the family with a robot brought home from its plot, the plot kept as won' },
  // P106 IG-005 (lane B): a robot's own name, colour, eyes and hat.
  { component: 'Logic/Update robot', script: UPDATE_ROBOT_SCRIPT, seam: 'the family with one field of one robot changed' }
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
