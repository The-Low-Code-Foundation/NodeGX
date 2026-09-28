/**
 * CG-003 — the page glue: the Function scripts the PAGES need between the engine (CG-002) and the kit (CG-001).
 *
 * The engine's scripts (`cg002Scripts.ts`, `FUNCTION_SCRIPTS`) are shipped as they are, one `Logic/*` each, generated.
 * What is here is what sits between them and the screen, each one a named utility too:
 *
 * | script | the question it answers |
 * |---|---|
 * | {@link READ_PROGRAM_SCRIPT} | the program as a list, whatever held it (the kit emits JSON text; the engine wants a list) |
 * | {@link START_WORLD_SCRIPT} | the world a request starts from, and the request itself (free play when the id is `free`) |
 * | {@link REQUEST_CARD_SCRIPT} | who is asking and what, in the child's language (kept apart so a language switch never resets the world) |
 * | {@link DRAW_WORLD_SCRIPT} | the engine's world in the kit's words: robots with their looks, things the kit draws, the bubble |
 * | {@link RECORD_STEP_SCRIPT} | a Teach pad press: the block appended, and the robot moved by the engine's own step |
 * | {@link KIT_PALETTE_SCRIPT} | the engine's palette in the kit's shape: an icon, the band's word, slots with their options |
 * | {@link TIDY_LINE_SCRIPT} | the fold offer's sentence, and whether it shows ("Not now" hides it until the program changes) |
 * | {@link FAMILY_SCRIPT} | the family model, read: the active profile, field by field, HER island, the profile rows, and whether a stored model is older than v3 (then the page writes it back) |
 * | {@link ISLAND_PINS_SCRIPT} | the islanders on the mockup's sea as pins: each one's open request for this kid, if any (a pin with one opens it) |
 * | {@link ISLAND_ROWS_SCRIPT} | the requests on the island for this band, each done or not — by THIS kid (one island per kid, ruling 8) |
 * | {@link UPDATE_PROFILE_SCRIPT} | the family with one field of one profile changed (the field is a parameter) |
 * | {@link SELECT_PROFILE_SCRIPT} | the family with another profile active |
 * | {@link SKILL_ROWS_SCRIPT} | the seven tricks as cards: seed, sprouted or blooming |
 * | {@link LOOK_ROWS_SCRIPT} | the robot's paints, eyes, hats (worn, owned, a gift still to earn) and stickers |
 * | {@link WIN_SUMMARY_SCRIPT} | the win card's words, and the tricks the win blooms |
 * | {@link BAR_STATE_SCRIPT} | which tab, band and language is lit on the bar |
 * | {@link OLIVE_STATUS_SCRIPT} / {@link TRY_OLIVE_SCRIPT} | the shell's Olive doors (CG-004), with the written line when there is no shell |
 * | {@link OLIVE_HELD_SCRIPT} | the rungs this computer's exam failed, in words, for Skills ("Olive can't do this here yet") |
 * | {@link TRANSLATE_ALL_SCRIPT} | every word, the engine's AND the pages', one output per key |
 *
 * 🔴 No backtick and no dollar-brace inside any script text (README §7): these are template literals.
 * 🔴 Every output is a fresh object: a `Function` publishes only on change.
 *
 * @module noodl-mcp/tests/cg003Scripts
 */
import { OLIVE_RUNGS, WORDS, WORD_KEYS } from './cg002Content';
import { OLIVE_SLIM, OLIVE_WORDS, OLIVE_WORD_KEYS, PALETTE_RUNG_IDS, rungWordKey } from './cg005Olive';
import { ENGINE, FOLD_HELPERS, MANY_BLOCKS, ROBOT_NAME_MAX, SAVE_HELPERS } from './cg002Scripts';
import { EYES, HATS, ISLANDERS, ISLAND_PINS, PAGE_WORDS, PAGE_WORD_KEYS, REQUEST_SUBS, SKILL_BLOCKS } from './cg003Content';
import { ROBOT_PAINTS } from './cg007Look';

/** Every word key the pages can show: the engine's (CG-002/006), Olive's (CG-005), then the pages' own. */
export const ALL_WORD_KEYS: ReadonlyArray<string> = [...WORD_KEYS, ...OLIVE_WORD_KEYS, ...PAGE_WORD_KEYS];

/** `Data/Words`: the engine's table with the pages' rows appended. */
export const ALL_WORDS_JSON = JSON.stringify(
  ALL_WORD_KEYS.map((key) => {
    const w = (WORDS as Record<string, { en: string; fr: string }>)[key] ?? (OLIVE_WORDS as Record<string, { en: string; fr: string }>)[key] ?? PAGE_WORDS[key];
    return { key, en: w.en, fr: w.fr };
  }),
  null,
  2
);

/** A word from `Inputs.words` rows, `{b}` filled. Shared by the scripts that show words. */
const WORD_HELPER = `
function wordMap(rows, lang, name) {
  var map = {};
  var list = Array.isArray(rows) ? rows : [];
  for (var i = 0; i < list.length; i++) if (list[i] && list[i].key) map[list[i].key] = String(list[i][lang] || list[i].en || '').split('{b}').join(name);
  return map;
}
function fill(text, vars) { var t = String(text || ''); for (var k in vars) t = t.split('{' + k + '}').join(String(vars[k])); return t; }
function langOf(v) { return String(v) === 'fr' ? 'fr' : 'en'; }
function nameOf(v) { var n = String(v || '').trim(); return n || 'Pip'; }
`;

// ── The workshop ────────────────────────────────────────────────────────────

export const READ_PROGRAM_SCRIPT = `
var raw = Inputs.program, list = [];
if (Array.isArray(raw)) list = raw;
else if (typeof raw === 'string' && raw) { try { var parsed = JSON.parse(raw); if (Array.isArray(parsed)) list = parsed; } catch (e) { list = []; } }
function count(l) { var n = 0; for (var i = 0; i < l.length; i++) { if (!l[i]) continue; n++; if (Array.isArray(l[i].body)) n += count(l[i].body); } return n; }
var copy = JSON.parse(JSON.stringify(list));
Outputs.program = copy;
Outputs.blocks = count(copy);
Outputs.text = JSON.stringify(copy);
Outputs.empty = copy.length === 0;
`;

/** Free play: the mockup's garden, three dry tulips, no goal, every block of the band. */
export const FREE_PLAY = {
  id: 'free',
  islander: '',
  band: 1,
  tricks: [] as number[],
  map: ['GGTGGGTH', 'GGGGGGGG', 'GGFGFGFG', 'PPPPPPPP', 'GWWGGRGG', 'GGGGGTGG'],
  things: [
    { kind: 'tulip', x: 2, y: 2, watered: false },
    { kind: 'tulip', x: 4, y: 2, watered: false },
    { kind: 'tulip', x: 6, y: 2, watered: false }
  ],
  robotStart: { x: 0, y: 3, d: 1 },
  goal: [] as unknown[],
  palette: [] as string[],
  // CG-005 s3: free play offers every rung the exam passed — at band 10-12 only (the rung table's band: ruling 4).
  rungs: 'all' as const,
  reward: null,
  copyKeys: { title: 'sandH', blurb: 'isFree', line: 'sandP', reward: '' }
};

/**
 * The world a request starts from. Re-runs only when the request, the requests or the nonce change — never on a
 * language switch — so `ran` is the one reset signal (Start over bumps the nonce).
 */
export const START_WORLD_SCRIPT = `
var FREE = ${JSON.stringify(FREE_PLAY)};
function countRef(list) { var n = 0; var l = Array.isArray(list) ? list : []; for (var i = 0; i < l.length; i++) { if (!l[i]) continue; n++; if (Array.isArray(l[i].body)) n += countRef(l[i].body); } return n; }
var reqs = Array.isArray(Inputs.requests) ? Inputs.requests : [];
var id = String(Inputs.requestId || '');
var req = null;
for (var i = 0; i < reqs.length; i++) if (reqs[i] && reqs[i].id === id) req = reqs[i];
if (!req && id === 'free') req = FREE;
Outputs.found = !!req;
Outputs.requestId = req ? req.id : '';
Outputs.isFree = !!req && req.id === 'free';
// IG-001 D3: the reference program's block count, for Choose hint's "Perfect!" (free play has none: 0).
Outputs.referenceCount = req ? countRef(req.referenceProgram) : 0;
if (req) {
  var rs = req.robotStart || {};
  var robot = { id: 'me', x: Number(rs.x) || 0, y: Number(rs.y) || 0, d: Number(rs.d) || 0, carry: Array.isArray(rs.carry) ? rs.carry.slice() : [] };
  if (rs.basket !== undefined) robot.basket = rs.basket;
  Outputs.world = { map: (req.map || []).slice(), things: JSON.parse(JSON.stringify(req.things || [])), robots: [robot], events: [], schedule: JSON.parse(JSON.stringify(req.schedule || [])) };
  Outputs.request = JSON.parse(JSON.stringify(req));
  Outputs.goal = JSON.parse(JSON.stringify(req.goal || []));
  Outputs.allowed = (req.palette || []).slice();
  Outputs.rungs = req.rungs === 'all' ? 'all' : Array.isArray(req.rungs) ? req.rungs.slice() : [];
  Outputs.islander = String(req.islander || '');
} else {
  Outputs.world = null;
  Outputs.request = null;
  Outputs.goal = [];
  Outputs.allowed = [];
  Outputs.rungs = [];
  Outputs.islander = '';
}
Outputs.nonce = Inputs.nonce;
`;

/** Each request's own line under the title (CG-007 §7.1 item 1): its word key, by request id. */
const SUB_KEYS: Readonly<Record<string, string>> = Object.fromEntries(Object.entries(REQUEST_SUBS).map(([id, r]) => [id, r.key]));

export const REQUEST_CARD_SCRIPT = `${WORD_HELPER}
var ISLANDERS = ${JSON.stringify(ISLANDERS)};
var SUBS = ${JSON.stringify(SUB_KEYS)};
var lang = langOf(Inputs.lang), name = nameOf(Inputs.botName);
var w = wordMap(Inputs.words, lang, name);
var reqs = Array.isArray(Inputs.requests) ? Inputs.requests : [];
var id = String(Inputs.requestId || '');
var req = null;
for (var i = 0; i < reqs.length; i++) if (reqs[i] && reqs[i].id === id) req = reqs[i];
var isl = req ? ISLANDERS[req.islander] : null;
var who = isl ? (w[isl.nameKey] || '') : '';
Outputs.who = who || w.isFree || '';
Outputs.eyebrow = req ? fill(w.wsEyebrowReq, { who: who }) : (w.isFree || '');
Outputs.title = req ? (w[req.copyKeys.title] || '') : (w.wsFreeTitle || '');
Outputs.line = req ? (w[req.copyKeys.line] || '') : (w.sandP || '');
Outputs.faceClass = 'bg-face bg-sp-' + (isl ? isl.sprite : 'owl');
Outputs.rewardWord = req && req.copyKeys.reward ? (w[req.copyKeys.reward] || '') : '';
Outputs.sub = (req && SUBS[req.id] && w[SUBS[req.id]]) || w.isSub || '';
`;

export const DRAW_WORLD_SCRIPT = `${WORD_HELPER}
// IG-001 D9 (P106 s1): a stone, an egg, the cat's food and the Predict flag are the kit's own sprites; the post box is the
// B tile itself (legend B: postbox, drawn on path). No emoji in a white pill any more.
var SPRITE_THINGS = { stone: 1, egg: 1, food: 1 };
var world = Inputs.world && typeof Inputs.world === 'object' ? Inputs.world : { map: [], things: [], robots: [] };
var rows = Array.isArray(world.map) ? world.map.slice() : [];
var things = [];
var list = Array.isArray(world.things) ? world.things : [];
var watered = 0, total = 0;
for (var i = 0; i < list.length; i++) {
  var t = list[i];
  if (!t) continue;
  if (t.kind === 'tulip') { total++; if (t.watered) watered++; things.push({ kind: 'tulip', x: t.x, y: t.y, watered: !!t.watered }); }
  else if (t.kind === 'puddle' || t.kind === 'letter' || SPRITE_THINGS[t.kind]) things.push({ kind: t.kind, x: t.x, y: t.y });
  else if (t.kind === 'bowl') things.push({ kind: 'bowl', x: t.x, y: t.y, full: (Number(t.food) || 0) > 0 });
  else if (t.kind === 'label') things.push({ kind: 'label', x: t.x, y: t.y, text: String(t.text || '') });
}
if (Inputs.showEnd === true && Inputs.endX !== undefined && Inputs.endX !== null && Number(Inputs.endX) >= 0) things.push({ kind: 'flag', x: Number(Inputs.endX), y: Number(Inputs.endY) });
var bump = (Number(Inputs.bumps) || 0) + (Number(Inputs.teachBumps) || 0);
var robots = [];
var rl = Array.isArray(world.robots) ? world.robots : [];
for (var r = 0; r < rl.length; r++) robots.push({ x: rl[r].x, y: rl[r].y, d: rl[r].d, colour: String(Inputs.color || '#FF7A59'), eyes: String(Inputs.eye || 'round'), hat: String(Inputs.hat || 'none'), name: nameOf(Inputs.botName), bump: bump });
var lang = langOf(Inputs.lang);
var w = wordMap(Inputs.words, lang, nameOf(Inputs.botName));
var say = String(Inputs.sayKey || '');
Outputs.map = { rows: rows, legend: { B: 'postbox' } };
Outputs.things = things;
Outputs.robots = robots;
Outputs.watered = watered;
Outputs.total = total;
var marks = [];
for (var d = 0; d < total; d++) marks.push({ id: 'm' + d, lit: d < watered, cls: d < watered ? 'bg-mark bg-mark-lit bg-sp-tulip' : 'bg-mark' });
Outputs.marks = marks;
Outputs.hasTulips = total > 0;
Outputs.bubble = say && w[say] ? { robot: 0, text: w[say], style: 'plain', n: Number(Inputs.sayN) || 0 } : null;
`;

/**
 * A Teach pad press. The block is appended (into the container the kit has selected, like a palette tap), and the
 * robot moves by the ENGINE's own step and apply, so what the child drives is exactly what Play will do.
 */
export const RECORD_STEP_SCRIPT = `${ENGINE}${FOLD_HELPERS}
var OPS = { fwd: 1, left: 1, right: 1, water: 1, pick: 1, put: 1 };
var op = String(Inputs.op || '');
var raw = Inputs.program, prog = [];
if (Array.isArray(raw)) prog = JSON.parse(JSON.stringify(raw));
else if (typeof raw === 'string' && raw) { try { var parsed = JSON.parse(raw); if (Array.isArray(parsed)) prog = parsed; } catch (e) { prog = []; } }
var w = worldOf(Inputs.world);
var ok = !!OPS[op] && w.robots.length > 0;
var sayKey = '', bumped = false;
if (ok) {
  var id = maxId(prog) + 1;
  var host = null, sel = Inputs.selected;
  if (sel !== undefined && sel !== null && sel !== '') { var c = findBlock(prog, Number(sel)); if (c && Array.isArray(c.body) && c.t !== 'if') host = c.body; }
  (host || prog).push({ id: id, t: op });
  var st = step(newRun([{ id: id, t: op }], w.robots[0].id, Inputs.lang), w, null);
  w = apply(w, st.delta);
  sayKey = st.delta.sayKey || '';
  bumped = !!st.delta.bump;
}
Outputs.program = JSON.stringify(prog);
Outputs.world = w;
Outputs.recorded = ok;
Outputs.sayKey = sayKey;
Outputs.sayN = countBlocks(prog);
Outputs.bumps = (Number(Inputs.bumps) || 0) + (bumped ? 1 : 0);
Outputs.blocks = countBlocks(prog);
`;

export const KIT_PALETTE_SCRIPT = `${WORD_HELPER}
var ICON = { fwd: 'fwd', left: 'left', right: 'right', water: 'water', pick: 'pick', put: 'put', say: 'say', repeat: 'loop', until: 'wall', 'if': 'if', when: 'if', count_inc: 'count', trick: 'loop', 'do': 'fwd', ask: 'owl' };
var SENSORS = [['wall_ahead', 'sWallAhead'], ['tulip_ahead', 'sTulipAhead'], ['bowl_empty', 'sBowlEmpty'], ['basket_full', 'sBasketFull'], ['count_is', 'sCountIs']];
var EVENTS = [['meow', 'eMeow']];
var SAYS = [['thanksMamie', 'thanksMamie'], ['thanksSami', 'thanksSami'], ['thanksBiscuit', 'thanksBiscuit']];
var TRICK_NAMES = ['row', 'hop', 'zigzag'];
var lang = langOf(Inputs.lang), band = Number(Inputs.band) === 1 ? 1 : 2;
var w = wordMap(Inputs.words, lang, nameOf(Inputs.botName));
function opts(pairs) { var out = []; for (var i = 0; i < pairs.length; i++) out.push({ value: pairs[i][0], label: w[pairs[i][1]] || pairs[i][0] }); return out; }
function slot(key) {
  if (key === 'sensor') return { key: 'sensor', label: w.bIf || key, options: opts(SENSORS) };
  if (key === 'arg') { var n = []; for (var k = 1; k <= 9; k++) n.push({ value: String(k), label: String(k) }); return { key: 'arg', label: '#', options: n }; }
  if (key === 'event') return { key: 'event', label: w.bWhen || key, options: opts(EVENTS) };
  if (key === 'name') { var t = []; for (var j = 0; j < TRICK_NAMES.length; j++) t.push({ value: TRICK_NAMES[j], label: TRICK_NAMES[j] }); return { key: 'name', label: w.bTrick || key, options: t }; }
  if (key === 'text') return { key: 'text', label: w.bSay || key, options: opts(SAYS), text: true, max: 40 };
  return null;
}
var src = Array.isArray(Inputs.palette) ? Inputs.palette : [];
var out = [];
for (var i = 0; i < src.length; i++) {
  var e = src[i];
  if (!e || typeof e.id !== 'string') continue;
  var slots = [];
  var names = Array.isArray(e.slots) ? e.slots : [];
  for (var s = 0; s < names.length; s++) { var made = names[s] && typeof names[s] === 'object' ? names[s] : slot(String(names[s])); if (made) slots.push(made); }
  out.push({ id: e.id, kind: e.kind, icon: ICON[e.id] || (e.id.indexOf('ask:') === 0 ? 'owl' : 'pick'), label: band === 1 ? String(e.caption || e.label || e.id) : String(e.label || e.id), hasBody: !!e.hasBody, hasCount: !!e.hasCount, slots: slots });
}
Outputs.palette = out;
Outputs.count = out.length;
`;

/** The fold offer's sentence. "Not now" keeps it hidden until the program is a different program. */
export const TIDY_LINE_SCRIPT = `${WORD_HELPER}
var LABEL = { fwd: 'bFwd', left: 'bLeft', right: 'bRight', water: 'bWater', pick: 'bPick', put: 'bPut', say: 'bSay', repeat: 'bRepeat', until: 'bUntil', 'if': 'bIf', when: 'bWhen', count_inc: 'bCountInc', trick: 'bTrick', 'do': 'bDo', ask: 'bAsk' };
var lang = langOf(Inputs.lang);
var w = wordMap(Inputs.words, lang, nameOf(Inputs.botName));
var vars = Inputs.vars && typeof Inputs.vars === 'object' ? Inputs.vars : {};
var key = String(Inputs.textKey || '');
var text = key ? fill(w[key], { n: vars.n, len: vars.len, s: w[LABEL[String(Inputs.sample || '')]] || String(Inputs.sample || '') }) : '';
var program = String(Inputs.programText || '');
var dismissed = String(Inputs.dismissed || '');
Outputs.text = text;
Outputs.show = Inputs.isOffered === true && program !== '' && program !== dismissed;
var n = Math.max(0, Math.floor(Number(Inputs.blocks)) || 0);
Outputs.countText = fill(n === 1 ? w.block1 : w.blocks, { n: n });
`;

// ── The family ──────────────────────────────────────────────────────────────

export const FAMILY_SCRIPT = `${SAVE_HELPERS}
var raw = Inputs.model && typeof Inputs.model === 'object' ? Inputs.model : null;
var model = modelOf(raw || {});
// A stored family older than v3 is migrated here on every read until it is written back: the page writes it at once.
Outputs.migrated = migrationDue(raw);
var active = null;
for (var i = 0; i < model.profiles.length; i++) if (model.profiles[i].id === model.island.activeId) active = model.profiles[i];
var fallback = String(Inputs.fallbackLang) === 'fr' ? 'fr' : 'en';
Outputs.hasProfile = !!active;
Outputs.profileId = active ? active.id : '';
Outputs.name = active ? active.name : '';
Outputs.band = active ? active.band : 2;
Outputs.older = active ? active.band === 2 : true;
Outputs.younger = !!active && active.band === 1;
Outputs.lang = active ? active.lang : fallback;
Outputs.face = active ? (active.face || active.name) : '';
Outputs.botName = active ? active.robot.name : 'Pip';
Outputs.color = active ? active.robot.color : '#FF7A59';
Outputs.eye = active ? active.robot.eye : 'round';
Outputs.hat = active ? active.robot.hat : 'none';
Outputs.hats = active ? active.hats.slice() : [];
Outputs.stickers = active ? active.stickers.slice() : [];
Outputs.tricks = active ? JSON.parse(JSON.stringify(active.tricks)) : {};
// One island per kid (ruling 8): what THIS kid has done, never a sibling's.
Outputs.done = active ? active.island.done.slice() : [];
var rows = [];
for (var j = 0; j < model.profiles.length; j++) {
  var p = model.profiles[j];
  rows.push({ id: p.id, name: p.name, face: p.face || p.name, band: p.band === 1 ? '7–9' : '10–12', robot: p.robot.name, color: p.robot.color, eye: p.robot.eye, hat: p.robot.hat, selected: p.id === model.island.activeId });
}
Outputs.profiles = rows;
Outputs.count = rows.length;
Outputs.canAdd = rows.length < MAX_PROFILES;
Outputs.isEmpty = rows.length === 0;
Outputs.model = model;
`;

/**
 * The islanders on the sea (ruling 6), as pins: each one's label in the language and, for THIS kid, the first request
 * of theirs she has not done in her band. A pin with one is open (tappable, it opens that request); the list beside the
 * map stays the path a screen reader and a keyboard take. The robot's pin and Olive's are drawn by Island/Map.
 */
export const ISLAND_PINS_SCRIPT = `${WORD_HELPER}
var ISLANDERS = ${JSON.stringify(ISLANDERS)};
var PINS = ${JSON.stringify(ISLAND_PINS)};
var lang = langOf(Inputs.lang), name = nameOf(Inputs.botName);
var w = wordMap(Inputs.words, lang, name);
var band = Number(Inputs.band) === 1 ? 1 : 2;
var done = Array.isArray(Inputs.done) ? Inputs.done : [];
var reqs = Array.isArray(Inputs.requests) ? Inputs.requests : [];
var pins = [], open = 0;
for (var i = 0; i < PINS.length; i++) {
  var pin = PINS[i], isl = ISLANDERS[pin.islander] || { nameKey: '' };
  var requestId = '';
  for (var k = 0; k < reqs.length && !requestId; k++) {
    var r = reqs[k];
    if (r && r.islander === pin.islander && Number(r.band) <= band && done.indexOf(r.id) === -1) requestId = String(r.id);
  }
  if (requestId) open++;
  pins.push({
    id: pin.id, label: w[isl.nameKey] || '', requestId: requestId, isOpen: !!requestId,
    pinClass: 'bg-pin bg-pin-' + pin.id + (requestId ? ' bg-pin-open bg-press' : ''), picClass: 'bg-pin-pic bg-sp-' + pin.sprite
  });
}
Outputs.pins = pins;
Outputs.open = open;
Outputs.count = pins.length;
`;

export const ISLAND_ROWS_SCRIPT = `${WORD_HELPER}
var ISLANDERS = ${JSON.stringify(ISLANDERS)};
var KIND = { 1: 'motion', 2: 'control', 3: 'control', 4: 'control', 5: 'control', 6: 'control', 7: 'ask' };
var lang = langOf(Inputs.lang), name = nameOf(Inputs.botName);
var w = wordMap(Inputs.words, lang, name);
var band = Number(Inputs.band) === 1 ? 1 : 2;
var done = Array.isArray(Inputs.done) ? Inputs.done : [];
var reqs = Array.isArray(Inputs.requests) ? Inputs.requests : [];
var rows = [], open = 0;
for (var i = 0; i < reqs.length; i++) {
  var r = reqs[i];
  if (!r || Number(r.band) > band) continue;
  var isl = ISLANDERS[r.islander] || { sprite: 'owl', nameKey: '' };
  var isDone = done.indexOf(r.id) !== -1;
  if (!isDone) open++;
  var trick = Array.isArray(r.tricks) && r.tricks.length ? Number(r.tricks[0]) : 1;
  var kind = r.palette && r.palette.indexOf('say') !== -1 ? 'ask' : (KIND[trick] || 'control');
  rows.push({
    id: r.id, who: w[isl.nameKey] || '', title: w[r.copyKeys.title] || '', trick: w[r.copyKeys.blurb] || '',
    faceClass: 'bg-face bg-sp-' + isl.sprite, tagClass: 'bg-tag bg-tag-' + kind, isDone: isDone, doneWord: '✓ ' + (w.done || '')
  });
}
Outputs.rows = rows;
Outputs.count = rows.length;
Outputs.open = open;
`;

/** One field of one profile. `field` is a parameter, placed once per field (the Hunt move shape). */
export const UPDATE_PROFILE_SCRIPT = `${SAVE_HELPERS}
var model = modelOf(Inputs.model && typeof Inputs.model === 'object' ? Inputs.model : {});
var id = String(Inputs.profileId || model.island.activeId);
var field = String(Inputs.field || '');
var v = Inputs.value;
var p = null, changed = false;
for (var i = 0; i < model.profiles.length; i++) if (model.profiles[i].id === id) p = model.profiles[i];
if (p) {
  if (field === 'name') { var n = String(v || '').trim().slice(0, 24); if (n && n !== p.name) { p.name = n; changed = true; } }
  else if (field === 'band') { var b = Number(v) === 1 ? 1 : 2; if (b !== p.band) { p.band = b; changed = true; } }
  else if (field === 'lang') { var l = String(v) === 'fr' ? 'fr' : 'en'; if (l !== p.lang) { p.lang = l; changed = true; } }
  else if (field === 'robotName') { var rn = String(v || '').trim().slice(0, ROBOT_NAME_MAX); if (rn && rn !== p.robot.name) { p.robot.name = rn; changed = true; } }
  else if (field === 'color') { var c = String(v || ''); if (/^#[0-9A-Fa-f]{6}$/.test(c) && c !== p.robot.color) { p.robot.color = c; changed = true; } }
  else if (field === 'eye') { var e = String(v || ''); if ((e === 'round' || e === 'happy' || e === 'wink') && e !== p.robot.eye) { p.robot.eye = e; changed = true; } }
  else if (field === 'hat') { var h = String(v || ''); if ((h === 'none' || p.hats.indexOf(h) !== -1) && h !== p.robot.hat) { p.robot.hat = h; changed = true; } }
}
Outputs.model = model;
Outputs.changed = changed;
`;

export const SELECT_PROFILE_SCRIPT = `${SAVE_HELPERS}
var model = modelOf(Inputs.model && typeof Inputs.model === 'object' ? Inputs.model : {});
var id = String(Inputs.profileId || '');
var found = false;
for (var i = 0; i < model.profiles.length; i++) if (model.profiles[i].id === id) found = true;
if (found) activate(model, id);
Outputs.model = model;
Outputs.found = found;
`;

export const SKILL_ROWS_SCRIPT = `${WORD_HELPER}
var BLOCKS = ${JSON.stringify(SKILL_BLOCKS)};
var lang = langOf(Inputs.lang), name = nameOf(Inputs.botName);
var w = wordMap(Inputs.words, lang, name);
var tricks = Inputs.tricks && typeof Inputs.tricks === 'object' ? Inputs.tricks : {};
var rows = [], blooming = 0;
for (var i = 0; i < BLOCKS.length; i++) {
  var b = BLOCKS[i];
  var st = tricks[b.key] === 'bloom' ? 'bloom' : tricks[b.key] === 'sprout' ? 'sprout' : (b.key === 'n1' ? 'sprout' : 'seed');
  if (st === 'bloom') blooming++;
  rows.push({
    id: b.key, cardClass: 'bg-notion bg-notion-' + st, stateClass: 'bg-caps bg-st-' + st, isBlooming: st === 'bloom',
    stateText: (st === 'bloom' ? '🌷 ' + (w.stBloom || '') : st === 'sprout' ? '🌱 ' + (w.stSprout || '') : '• ' + (w.stSeed || '')),
    title: w[b.key] || '', text: w[b.key + 'p'] || '', blockWord: w[b.word] || '', blockClass: 'bg-blk bg-blk-' + b.kind, prog: w['p' + (i + 1)] || ''
  });
}
Outputs.rows = rows;
Outputs.blooming = blooming;
`;

export const LOOK_ROWS_SCRIPT = `${WORD_HELPER}
var PAINTS = ${JSON.stringify(ROBOT_PAINTS)};
var EYES = ${JSON.stringify(EYES)};
var HATS = ${JSON.stringify(HATS)};
var lang = langOf(Inputs.lang), name = nameOf(Inputs.botName);
var w = wordMap(Inputs.words, lang, name);
var color = String(Inputs.color || '#FF7A59').toUpperCase(), eye = String(Inputs.eye || 'round'), hat = String(Inputs.hat || 'none');
var owned = Array.isArray(Inputs.hats) ? Inputs.hats : [];
var paints = [], eyes = [], hats = [], stickers = [];
for (var i = 0; i < PAINTS.length; i++) paints.push({ id: PAINTS[i].hex, paint: 'var(' + PAINTS[i].token + ')', label: PAINTS[i].name[lang], selected: PAINTS[i].hex.toUpperCase() === color });
for (var j = 0; j < EYES.length; j++) eyes.push({ id: EYES[j].id, label: w[EYES[j].word] || EYES[j].id, selected: EYES[j].id === eye, locked: false });
for (var k = 0; k < HATS.length; k++) {
  var h = HATS[k];
  var has = h.free || owned.indexOf(h.id) !== -1;
  hats.push({ id: h.id, label: (h.id === 'sun' ? '🌻 ' : h.id === 'crown' ? '👑 ' : '') + (w[h.word] || h.id) + (has || !h.from ? '' : ' · ' + fill(w.hatLocked, { who: w[h.from] || '' })), selected: h.id === hat, locked: !has });
}
var st = Array.isArray(Inputs.stickers) ? Inputs.stickers : [];
var STICKER = { letter: ['✉️', 'stickerLetter'], paw: ['🐾', 'stickerPaw'], tulip: ['🌷', 'stickerTulip'], bell: ['🔔', 'itemBell'], basket: ['🧺', 'itemBasket'], gnome: ['🧙', 'itemGnome'], seeds: ['🌱', 'seeds'] };
for (var s = 0; s < st.length; s++) { var d = STICKER[st[s]] || ['⭐', '']; stickers.push({ id: String(st[s]), label: d[0] + ' ' + (w[d[1]] || String(st[s])) }); }
Outputs.paints = paints;
Outputs.eyes = eyes;
Outputs.hats = hats;
Outputs.stickers = stickers;
Outputs.hasStickers = stickers.length > 0;
Outputs.noStickers = stickers.length === 0;
`;

/** The win card's words, and every trick the win blooms: the request's, the ones the program used, and steps (n1). */
export const WIN_SUMMARY_SCRIPT = `${WORD_HELPER}
var USE = { repeat: 2, until: 3, 'if': 4, when: 5, count_inc: 6, trick: 7, 'do': 7 };
var lang = langOf(Inputs.lang), name = nameOf(Inputs.botName);
var w = wordMap(Inputs.words, lang, name);
var prog = Array.isArray(Inputs.program) ? Inputs.program : [];
var req = Inputs.request && typeof Inputs.request === 'object' ? Inputs.request : null;
var used = {}, blocks = 0;
function walk(l) { for (var i = 0; i < l.length; i++) { var b = l[i]; if (!b) continue; blocks++; if (USE[b.t]) used[USE[b.t]] = true; if (Array.isArray(b.body)) walk(b.body); } }
walk(prog);
var bloom = [1];
var asked = req && Array.isArray(req.tricks) ? req.tricks : [];
for (var a = 0; a < asked.length; a++) if (bloom.indexOf(Number(asked[a])) === -1) bloom.push(Number(asked[a]));
for (var u in used) if (bloom.indexOf(Number(u)) === -1) bloom.push(Number(u));
var learnt = 0;
for (var t = 0; t < asked.length; t++) if (used[asked[t]]) learnt = Number(asked[t]);
Outputs.bloom = bloom;
Outputs.thanks = fill(w.winThanks, {});
Outputs.line = fill(blocks > ${MANY_BLOCKS} ? w.winMany : w.winFew, { k: blocks });
Outputs.rewardText = req && req.copyKeys && req.copyKeys.reward ? fill(w.winNew, { reward: w[req.copyKeys.reward] || '' }) : '';
Outputs.hasReward = !!(req && req.reward);
Outputs.learnText = learnt ? fill(w.winLearn, { trick: String(w['n' + learnt] || '').toLowerCase() }) : '';
Outputs.hasLearn = learnt > 0;
Outputs.blocks = blocks;
Outputs.reward = req && req.reward ? JSON.parse(JSON.stringify(req.reward)) : null;
Outputs.requestId = req ? String(req.id) : '';
`;

export const BAR_STATE_SCRIPT = `
var page = String(Inputs.page || '');
var band = Number(Inputs.band) === 1 ? 1 : 2;
var lang = String(Inputs.lang) === 'fr' ? 'fr' : 'en';
Outputs.islandOn = page === 'island';
Outputs.workshopOn = page === 'workshop';
Outputs.robotOn = page === 'robot';
Outputs.skillsOn = page === 'skills';
Outputs.grownOn = page === 'grown';
Outputs.band1On = band === 1;
Outputs.band2On = band === 2;
Outputs.enOn = lang === 'en';
Outputs.frOn = lang === 'fr';
`;

// ── Olive (CG-004's doors; the page never waits, and a missing shell is the written line) ──

export const OLIVE_STATUS_SCRIPT = `
var out = { running: false, model: 'none', passed: 0, total: 0, hasExam: false, exam: null };
try {
  if (typeof fetch === 'function') {
    var ctl = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = ctl ? setTimeout(function () { ctl.abort(); }, 4000) : null;
    var res = await fetch('/__garden/olive/status', ctl ? { signal: ctl.signal, cache: 'no-store' } : { cache: 'no-store' });
    if (timer) clearTimeout(timer);
    if (res && res.ok) {
      var s = await res.json();
      out.model = String(s && s.model || 'none');
      out.running = out.model === 'ready' || out.model === 'loading' || out.model === 'unloaded';
      if (s && s.exam) { out.hasExam = true; out.passed = Number(s.exam.passed) || 0; out.total = (Number(s.exam.passed) || 0) + (Number(s.exam.failed) || 0); out.exam = JSON.parse(JSON.stringify(s.exam)); }
    }
  }
} catch (e) { out.running = false; }
Outputs.running = out.running;
Outputs.stopped = !out.running;
Outputs.model = out.model;
Outputs.hasExam = out.hasExam;
Outputs.noExam = !out.hasExam;
Outputs.passed = out.passed;
Outputs.total = out.total;
Outputs.examVars = { p: out.passed, t: out.total };
// The exam as the shell reports it, for the palette's gate and Skills (CG-005 AC5): a rung it failed is withheld.
Outputs.exam = out.exam;
Outputs.checked = Inputs.nonce;
`;

/**
 * The rungs this computer's exam failed, as Skills says them: "Olive can't do this here yet: words into blocks". Band
 * 10-12 only (the rungs are theirs, ruling 4); nothing to say — no exam, or every rung passed — shows nothing.
 */
export const OLIVE_HELD_SCRIPT = `${WORD_HELPER}
var ORDER = ${JSON.stringify(PALETTE_RUNG_IDS)};
var BAND = ${JSON.stringify(Object.fromEntries(PALETTE_RUNG_IDS.map((id) => [id, Number(OLIVE_SLIM.rungs[id].band) || 1])))};
var TITLE = ${JSON.stringify(Object.fromEntries(PALETTE_RUNG_IDS.map((id) => [id, rungWordKey(id)])))};
var lang = langOf(Inputs.lang), band = Number(Inputs.band) === 1 ? 1 : 2;
var w = wordMap(Inputs.words, lang, nameOf(Inputs.botName));
var rungs = Inputs.exam && Inputs.exam.rungs && typeof Inputs.exam.rungs === 'object' ? Inputs.exam.rungs : {};
var held = [];
for (var i = 0; i < ORDER.length; i++) { var id = ORDER[i]; if (BAND[id] <= band && rungs[id] && rungs[id].pass === false) held.push(id); }
var names = [];
for (var j = 0; j < held.length; j++) names.push(w[TITLE[held[j]]] || held[j]);
Outputs.held = held;
Outputs.show = held.length > 0;
Outputs.text = held.length ? (w.oliveCant || '') + (lang === 'fr' ? ' : ' : ': ') + names.join(', ') : '';
`;

/**
 * The rung this run asked Olive (CG-005 §8 residual): the parked ask's answer → `Choose hint`'s `oliveRung` (1–18, the
 * rung table's number for the answer's rung) and `oliveFallback` (she did not answer; the written line was used). Only
 * an answer to THIS run counts: an answer from a run since reset (another program, Start over) says nothing, or its
 * lesson line would follow the child into the next run. A voiced hint is not a rung. An ask REFUSED before sending (a
 * listed word, an empty slot: `sent` false) is neither: she was not asked, so she is not resting (CG-005 AC6).
 */
export const OLIVE_PLAYED_SCRIPT = `
var RUNG_OF = ${JSON.stringify(Object.fromEntries(OLIVE_RUNGS.flatMap((r) => r.table.map((t) => [t, r.n]))))};
var a = Inputs.answer && typeof Inputs.answer === 'object' ? Inputs.answer : null;
var run = Inputs.run && typeof Inputs.run === 'object' ? Inputs.run : null;
var runId = run && run.runId !== undefined && run.runId !== null ? String(run.runId) : '';
var mine = !!a && a.sent === true && runId !== '' && String(a.run) === runId && String(a.rung) !== 'voice-hint';
Outputs.oliveRung = mine ? RUNG_OF[String(a.rung)] || 0 : 0;
Outputs.oliveFallback = mine && a.fallback === true;
`;

/**
 * Olive's eighteen lessons as Skills cards (CG-006 §4, CG-005 §8 residual): the rung's title and lesson, whether it is a
 * thing she does (green) or a thing a program does better (🎓), and "Olive can't do this here yet" where this computer's
 * exam failed any of its rung-table entries. Band 10–12 only (ruling 8): at 7–9 there are no rows and nothing shows.
 * No progress is kept per rung: the cards say what the lesson is, never how far a child got.
 */
export const RUNG_ROWS_SCRIPT = `${WORD_HELPER}
var RUNGS = ${JSON.stringify(OLIVE_RUNGS.map((r) => ({ n: r.n, mark: r.mark, table: r.table, title: r.copyKeys.title, lesson: r.copyKeys.lesson })))};
var lang = langOf(Inputs.lang), band = Number(Inputs.band) === 1 ? 1 : 2;
var w = wordMap(Inputs.words, lang, nameOf(Inputs.botName));
var exam = Inputs.exam && Inputs.exam.rungs && typeof Inputs.exam.rungs === 'object' ? Inputs.exam.rungs : {};
var rows = [];
if (band === 2) for (var i = 0; i < RUNGS.length; i++) {
  var r = RUNGS[i], held = false;
  for (var t = 0; t < r.table.length; t++) if (exam[r.table[t]] && exam[r.table[t]].pass === false) held = true;
  var green = r.mark === 'green';
  rows.push({ id: 'rung' + r.n, n: r.n, title: w[r.title] || '', lesson: w[r.lesson] || '', markText: green ? w.rungGreen || '' : w.rungGrad || '', markClass: green ? 'bg-tag bg-tag-ask' : 'bg-tag bg-tag-control', isHeld: held, heldText: held ? w.oliveCant || '' : '' });
}
Outputs.rows = rows;
Outputs.show = rows.length > 0;
Outputs.count = rows.length;
`;

/** The grown-ups' Try Olive: a thank-you rung, slots only, never a prompt; the written line when she does not answer. */
export const TRY_OLIVE_SCRIPT = `
var lang = String(Inputs.lang) === 'fr' ? 'fr' : 'en';
var written = String(Inputs.fallback || '');
var body = { rung: String(Inputs.rung || 'say-thanks'), slots: Inputs.slots && typeof Inputs.slots === 'object' ? Inputs.slots : {}, lang: lang, shape: 'sentence', temperature: 0.8 };
var text = written, ok = false;
try {
  if (typeof fetch === 'function') {
    var ctl = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = ctl ? setTimeout(function () { ctl.abort(); }, 20000) : null;
    var res = await fetch('/__garden/olive', { method: 'POST', headers: { 'content-type': 'application/json', 'x-garden': '1' }, body: JSON.stringify(body), signal: ctl ? ctl.signal : undefined });
    if (timer) clearTimeout(timer);
    if (res && res.ok) {
      var a = await res.json();
      if (a && a.ok && (a.text || a.value !== undefined)) { text = String(a.text !== undefined ? a.text : a.value); ok = true; }
    }
  }
} catch (e) { ok = false; }
Outputs.text = text;
Outputs.ok = ok;
Outputs.fallback = !ok;
`;

/** Every word, the engine's and the pages', one output per key (`Outputs[key]` in a loop mints no port). */
export const TRANSLATE_ALL_SCRIPT = `
var lang = String(Inputs.lang) === 'fr' ? 'fr' : 'en';
var rows = Inputs.words || [];
var name = String(Inputs.botName || 'Pip');
var map = {};
for (var i = 0; i < rows.length; i++) map[rows[i].key] = String(rows[i][lang] || rows[i].en || '').split('{b}').join(name);
Outputs.lang = lang;
Outputs.isFr = lang === 'fr';
${ALL_WORD_KEYS.map((key) => `Outputs.${key} = map.${key} || '';`).join('\n')}
`;

/** The glue, as the generator places it: one `Logic/*` each. */
export const GLUE_SCRIPTS: ReadonlyArray<{ component: string; script: string; seam: string }> = [
  { component: 'Logic/Read program', script: READ_PROGRAM_SCRIPT, seam: 'the program as a list, whatever held it' },
  { component: 'Logic/Start world', script: START_WORLD_SCRIPT, seam: 'the world a request starts from, and the request' },
  { component: 'Logic/Request card', script: REQUEST_CARD_SCRIPT, seam: 'who is asking and what, in the child’s language' },
  { component: 'Logic/Draw world', script: DRAW_WORLD_SCRIPT, seam: 'the engine’s world in the kit’s words' },
  { component: 'Logic/Record step', script: RECORD_STEP_SCRIPT, seam: 'a Teach pad press: the block appended, the robot moved by the engine' },
  { component: 'Logic/Kit palette', script: KIT_PALETTE_SCRIPT, seam: 'the engine’s palette in the kit’s shape' },
  { component: 'Logic/Tidy line', script: TIDY_LINE_SCRIPT, seam: 'the fold offer’s sentence, and whether it shows' },
  { component: 'Logic/Read family', script: FAMILY_SCRIPT, seam: 'the family read: the active profile and the profile rows' },
  { component: 'Logic/Island pins', script: ISLAND_PINS_SCRIPT, seam: 'the islanders on the sea as pins, each one open when she has a request left' },
  { component: 'Logic/Island rows', script: ISLAND_ROWS_SCRIPT, seam: 'the requests on the island for this band, done or not by this kid' },
  { component: 'Logic/Update profile', script: UPDATE_PROFILE_SCRIPT, seam: 'the family with one field of one profile changed' },
  { component: 'Logic/Select profile', script: SELECT_PROFILE_SCRIPT, seam: 'the family with another profile active' },
  { component: 'Logic/Skill rows', script: SKILL_ROWS_SCRIPT, seam: 'the seven tricks as cards' },
  { component: 'Logic/Look rows', script: LOOK_ROWS_SCRIPT, seam: 'the robot’s paints, eyes, hats and stickers' },
  { component: 'Logic/Win summary', script: WIN_SUMMARY_SCRIPT, seam: 'the win card’s words and the tricks it blooms' },
  { component: 'Logic/Bar state', script: BAR_STATE_SCRIPT, seam: 'which tab, band and language is lit' },
  { component: 'Logic/Olive status', script: OLIVE_STATUS_SCRIPT, seam: 'where Olive runs, from the shell’s status door' },
  { component: 'Logic/Try Olive', script: TRY_OLIVE_SCRIPT, seam: 'the grown-ups\u2019 Try Olive: one thank-you asked of her, the written line when she does not answer' },
  { component: 'Logic/Olive held', script: OLIVE_HELD_SCRIPT, seam: 'the rungs this computer\u2019s exam failed, in words, for Skills' },
  { component: 'Logic/Rung rows', script: RUNG_ROWS_SCRIPT, seam: 'Olive\u2019s eighteen lessons as Skills cards, band 10\u201312, marked where this computer\u2019s exam withheld them' },
  { component: 'Logic/Olive played', script: OLIVE_PLAYED_SCRIPT, seam: 'the rung this run asked Olive, and whether she answered, for the after-run hint' }
];
