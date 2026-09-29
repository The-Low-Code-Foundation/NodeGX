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
import { OLIVE_HELPERS, OLIVE_LESSON_IDS, OLIVE_OBJECTS, OLIVE_SLIM, OLIVE_TABLE, OLIVE_WORDS, OLIVE_WORD_KEYS, PALETTE_RUNG_IDS, rungWordKey } from './cg005Olive';
import { BLOCK_META, CAN_MAX, ENGINE, FOLD_HELPERS, MANY_BLOCKS, ROBOT_NAME_MAX, SAVE_HELPERS } from './cg002Scripts';
import { BLOCK_CARDS, CardBlock, EYES, HATS, IG006_WORDS, IG006_WORD_KEYS, ISLANDERS, ISLAND_PINS, PAD_KEYS, PAGE_WORDS, PAGE_WORD_KEYS, REQUEST_SUBS, SKILL_BLOCKS } from './cg003Content';
import { ROBOT_PAINTS } from './cg007Look';
import { FREE_PLAY_PLOT, ISLAND_BASE, ISLAND_HOME, PLOT_H, PLOT_W } from './cg002Content';
import { FIND_ROBOTS_SCRIPT, ISLAND_TICK_SCRIPT, PLOT_AT_SCRIPT, islandChooseScript, islandWorldScript } from './ig004Island';
// P106 IG-005 (lane B): the robot catalogue and its upgrades.
import { ROBOTS_JSON, UPGRADES_JSON } from './cg002Content';
// P108 IW-002 (lane J): Start world's seed line lays a request's seeded layout with the engine's own helpers.
import { SEED_HELPERS } from './cg002Scripts';

/** P106 IG-005 (lane B): the islanders' name keys, for the lock line and the gifts. */
const ISLANDER_WORDS = Object.fromEntries(Object.entries(ISLANDERS).map(([id, i]) => [id, i.nameKey]));
/** The word for what each robot does, what it wears, and each upgrade — by kind / id. */
const ROBOT_WORDS = {
  does: { pip: 'ig5DoesPip', cobble: 'ig5DoesCobble', pocket: 'ig5DoesPocket', echo: 'ig5DoesEcho' },
  wears: { can: 'ig5WearsCan', hod: 'ig5WearsHod', satchel: 'ig5WearsSatchel', bell: 'ig5WearsBell' },
  upgrade: { 'can+': 'ig5UpCan', 'basket+': 'ig5UpBasket', boots: 'ig5UpBoots' }
};

/** Every word key the pages can show: the engine's (CG-002/006), Olive's (CG-005), then the pages' own. */
export const ALL_WORD_KEYS: ReadonlyArray<string> = [...WORD_KEYS, ...OLIVE_WORD_KEYS, ...PAGE_WORD_KEYS, ...IG006_WORD_KEYS];

/** `Data/Words`: the engine's table with the pages' rows appended. */
export const ALL_WORDS_JSON = JSON.stringify(
  ALL_WORD_KEYS.map((key) => {
    const w = (WORDS as Record<string, { en: string; fr: string }>)[key] ?? (OLIVE_WORDS as Record<string, { en: string; fr: string }>)[key] ?? PAGE_WORDS[key] ?? IG006_WORDS[key];
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
// P106 IG-005: the robot doing the job (Job robot's row). It does not re-run this script by itself (the page marks it
// quiet): Robot Key — its id, kind and look as text — does, so a win that upgrades it never resets the world under the
// win card; the upgrade is on the robot the next time the request opens. No robot: the world as before IG-005.
var bot = Inputs.robot && typeof Inputs.robot === 'object' ? Inputs.robot : null;
Outputs.found = !!req;
Outputs.requestId = req ? req.id : '';
Outputs.isFree = !!req && req.id === 'free';
// IG-001 D3: the reference program's block count, for Choose hint's "Perfect!" (free play has none: 0).
Outputs.referenceCount = req ? countRef(req.referenceProgram) : 0;
if (req) {
  var rs = req.robotStart || {};
  var robot = { id: 'me', x: Number(rs.x) || 0, y: Number(rs.y) || 0, d: Number(rs.d) || 0, carry: Array.isArray(rs.carry) ? rs.carry.slice() : [] };
  if (rs.basket !== undefined) robot.basket = rs.basket;
  // IG-002: the can — a number where the request has a pond to fetch from (0: empty), null where it has none (free water).
  robot.can = rs.can === undefined || rs.can === null || rs.can === '' ? null : Math.max(0, Math.floor(Number(rs.can)) || 0);
  robot.canMax = Number(rs.canMax) > 0 ? Math.floor(Number(rs.canMax)) : ${CAN_MAX};
  // IG-005: the robot's own can (an upgrade makes it 6) and basket (never smaller than the request's), and its look.
  if (bot) {
    if (Number(bot.canMax) > 0) robot.canMax = Math.floor(Number(bot.canMax));
    if (Number(bot.basket) > 0) robot.basket = Math.max(Math.floor(Number(bot.basket)), Number(rs.basket) > 0 ? Math.floor(Number(rs.basket)) : 0);
    robot.look = { name: String(bot.name || ''), colour: String(bot.color || ''), eyes: String(bot.eye || 'round'), hat: String(bot.hat || 'none'), accessory: String(bot.accessory || '') };
  }
  Outputs.world = { map: (req.map || []).slice(), things: JSON.parse(JSON.stringify(req.things || [])), robots: [robot], events: [], schedule: JSON.parse(JSON.stringify(req.schedule || [])) };
  Outputs.request = JSON.parse(JSON.stringify(req));
  Outputs.goal = JSON.parse(JSON.stringify(req.goal || []));
  Outputs.allowed = (req.palette || []).slice();
  Outputs.rungs = req.rungs === 'all' ? 'all' : Array.isArray(req.rungs) ? req.rungs.slice() : [];
  Outputs.islander = String(req.islander || '');
  // IG-003 (R5): the islander's challenge on this request ('predict'), or none.
  Outputs.challenge = req.challenge === 'predict' ? 'predict' : '';
  // IG-005: the robot kind this request needs (free play: none — the garden takes every block).
  Outputs.needs = req.id === 'free' ? '' : String(req.needs || 'pip');
} else {
  Outputs.world = null;
  Outputs.request = null;
  Outputs.goal = [];
  Outputs.allowed = [];
  Outputs.rungs = [];
  Outputs.islander = '';
  Outputs.challenge = '';
  Outputs.needs = '';
}
// P108 IW-002 (lane J): the run's seed (Inputs.seed, else one picked), the job copied in, the seeded layout laid.
if (req && Outputs.world) Outputs.world = seedWorld(Outputs.world, req, Inputs.seed);
Outputs.nonce = Inputs.nonce;
Outputs.robotKey = String(Inputs.robotKey || '');
${SEED_HELPERS}`;

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
  if (t.kind === 'tulip') { total++; if (t.watered) watered++; things.push({ kind: 'tulip', x: t.x, y: t.y, watered: !!t.watered, colour: t.color === 'yellow' ? 'yellow' : 'red' }); }
  else if (t.kind === 'puddle' || t.kind === 'letter' || SPRITE_THINGS[t.kind]) things.push({ kind: t.kind, x: t.x, y: t.y });
  else if (t.kind === 'bowl') things.push({ kind: 'bowl', x: t.x, y: t.y, full: (Number(t.food) || 0) > 0 });
  else if (t.kind === 'label') things.push({ kind: 'label', x: t.x, y: t.y, text: String(t.text || '') });
  // IG-002: a rock drawn at its size by what is left; a sign and a note carry their text (the kit does not draw it).
  else if (t.kind === 'rock') things.push({ kind: 'rock', x: t.x, y: t.y, left: Math.max(0, Math.floor(Number(t.left)) || 0) });
  else if (t.kind === 'sign' || t.kind === 'note') things.push({ kind: t.kind, x: t.x, y: t.y, text: String(t.text || '') });
  // P106 IG-004: the island's islanders (her open request's title as her bubble), a locked plot's fence and padlock.
  else if (t.kind === 'islander') things.push({ kind: 'islander', x: t.x, y: t.y, who: String(t.who || ''), say: t.sayKey ? String(wordMap(Inputs.words, langOf(Inputs.lang), nameOf(Inputs.botName))[t.sayKey] || '') : '' });
  else if (t.kind === 'fence') things.push({ kind: 'fence', x: t.x, y: t.y, w: Number(t.w) || 1, h: Number(t.h) || 1 });
  else if (t.kind === 'padlock') things.push({ kind: 'padlock', x: t.x, y: t.y });
}
if (Inputs.showEnd === true && Inputs.endX !== undefined && Inputs.endX !== null && Number(Inputs.endX) >= 0) things.push({ kind: 'flag', x: Number(Inputs.endX), y: Number(Inputs.endY) });
// IG-003 (R5): the challenge was right: a tick on the tile the child tapped (the real end).
if (Inputs.showTick === true && Inputs.endX !== undefined && Inputs.endX !== null && Number(Inputs.endX) >= 0) things.push({ kind: 'tick', x: Number(Inputs.endX), y: Number(Inputs.endY) });
var bump = (Number(Inputs.bumps) || 0) + (Number(Inputs.teachBumps) || 0);
var robots = [];
var rl = Array.isArray(world.robots) ? world.robots : [];
// IG-002: the can's level (null: no can, no drops) and the load on the robot's back (the last thing carried).
// P106 IG-005: a robot carrying its own look (the island's robots, the Workshop's job robot) is drawn in it — its name,
// colour, eyes, hat and the accessory of its job; one without is drawn in the page's look (Pip's, with his can).
for (var r = 0; r < rl.length; r++) {
  var lk = rl[r].look && typeof rl[r].look === 'object' ? rl[r].look : {};
  robots.push({ x: rl[r].x, y: rl[r].y, d: rl[r].d, colour: String(lk.colour || Inputs.color || '#FF7A59'), eyes: String(lk.eyes || Inputs.eye || 'round'), hat: String(lk.hat || Inputs.hat || 'none'), name: nameOf(lk.name || Inputs.botName), bump: bump, can: rl[r].can === undefined || rl[r].can === null ? null : rl[r].can, canMax: Number(rl[r].canMax) > 0 ? Number(rl[r].canMax) : ${CAN_MAX}, carry: Array.isArray(rl[r].carry) ? rl[r].carry.slice() : [], accessory: lk.accessory !== undefined ? String(lk.accessory) : Inputs.accessory !== undefined && Inputs.accessory !== null ? String(Inputs.accessory) : 'can' });
}
var lang = langOf(Inputs.lang);
var w = wordMap(Inputs.words, lang, nameOf(Inputs.botName));
var say = String(Inputs.sayKey || '');
// IG-001 D6: what Olive said (sayText, olive style, Step Ms × 3) or a say block's line (its word, or the text itself),
// keyed by run and tick so the same line on a later tick is a new bubble. Nothing to say leaves the port alone: the
// kit's own timer hides a bubble, and a null here would hide it on the very next tick.
var sayText = String(Inputs.sayText || ''), sayStyle = String(Inputs.sayStyle || '');
var stepMs = Number(Inputs.stepMs) > 0 ? Number(Inputs.stepMs) : 380;
var runId = Inputs.run && typeof Inputs.run === 'object' && Inputs.run.runId ? String(Inputs.run.runId) : '';
var sayN = runId + ':' + (Number(Inputs.sayN) || 0);
Outputs.map = { rows: rows, legend: { B: 'postbox' } };
Outputs.things = things;
Outputs.robots = robots;
Outputs.watered = watered;
Outputs.total = total;
var marks = [];
for (var d = 0; d < total; d++) marks.push({ id: 'm' + d, lit: d < watered, cls: d < watered ? 'bg-mark bg-mark-lit bg-sp-tulip' : 'bg-mark' });
Outputs.marks = marks;
Outputs.hasTulips = total > 0;
if (sayText) Outputs.bubble = { robot: 0, text: sayText, style: sayStyle === 'olive' ? 'olive' : 'plain', ms: sayStyle === 'olive' ? stepMs * 3 : 0, n: sayN };
else if (say) Outputs.bubble = { robot: 0, text: w[say] || say, style: 'plain', n: sayN };
`;

/**
 * IG-001 D10: the Teach pad by request — one key per allowed step, in the pad's order; with no list (free play) every
 * step the engine knows (IG-002: `fill` is a block now, so it is a key where allowed). The first action takes the
 * d-pad's centre (the mockup's water key), the rest a third row.
 */
export const PAD_KEYS_SCRIPT = `${WORD_HELPER}
var PAD = ${JSON.stringify(PAD_KEYS.map((k) => [k.op, k.place, k.icon, k.word]))};
// IG-003: the key's label (what a screen reader says; the key shows its icon) is the step's word in the child's language —
// the pad is up from the moment a request opens (Drive), and an English op name there was the one word a switch left.
var W = wordMap(Inputs.words, langOf(Inputs.lang), 'Pip');
var KNOWN = ${JSON.stringify(Object.keys(BLOCK_META))};
var allowed = Array.isArray(Inputs.allowed) ? Inputs.allowed : [];
var slots = ['bg-key-mid', 'bg-key-r3a', 'bg-key-r3b', 'bg-key-r3c'], used = 0;
var keys = [];
for (var i = 0; i < PAD.length; i++) {
  var op = PAD[i][0];
  var ok = allowed.length ? allowed.indexOf(op) !== -1 : KNOWN.indexOf(op) !== -1;
  if (!ok) continue;
  var place = PAD[i][1] || slots[Math.min(used++, slots.length - 1)];
  keys.push({ op: op, cls: 'bg-key bg-key-' + op + (place === 'bg-key-' + op ? '' : ' ' + place) + ' bg-i-' + PAD[i][2] + ' bg-press', label: W[PAD[i][3]] || op });
}
Outputs.keys = keys;
Outputs.count = keys.length;
`;

/**
 * A pad press. Teach (Record true, or unset): the block is appended (into the container the kit has selected, like a
 * palette tap), and the robot moves by the ENGINE's own step and apply, so what the child drives is exactly what Play
 * will do. Drive (IG-003, Record false): the robot moves the same way and NOTHING is recorded — the program comes back
 * as it came in, and Recorded is false (the page writes the program only when a press was recorded).
 */
export const RECORD_STEP_SCRIPT = `${ENGINE}${FOLD_HELPERS}
var OPS = { fwd: 1, left: 1, right: 1, water: 1, fill: 1, pick: 1, put: 1 };
// Record is 'yes' / 'no' from the Workshop's mode (a string: a States node's first-state false never arrives); false works too.
var record = Inputs.record !== false && String(Inputs.record) !== 'no';
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
  if (record) (host || prog).push({ id: id, t: op });
  var st = step(newRun([{ id: id, t: op }], w.robots[0].id, Inputs.lang), w, null);
  w = apply(w, st.delta);
  sayKey = st.delta.sayKey || '';
  bumped = !!st.delta.bump;
}
Outputs.program = JSON.stringify(prog);
Outputs.world = w;
Outputs.recorded = ok && record;
Outputs.moved = ok;
Outputs.sayKey = sayKey;
Outputs.sayN = countBlocks(prog);
Outputs.bumps = (Number(Inputs.bumps) || 0) + (bumped ? 1 : 0);
Outputs.blocks = countBlocks(prog);
`;

export const KIT_PALETTE_SCRIPT = `${WORD_HELPER}
var ICON = { fwd: 'fwd', left: 'left', right: 'right', water: 'water', fill: 'fill', pick: 'pick', put: 'put', say: 'say', repeat: 'loop', until: 'wall', 'if': 'if', when: 'if', count_inc: 'count', trick: 'loop', 'do': 'fwd', ask: 'owl' };
// IG-001 D7: "Olive says yes" / "Olive says no" — one value each, so "if Olive says yes" can be built from the picker.
var SENSORS = [['wall_ahead', 'sWallAhead'], ['tulip_ahead', 'sTulipAhead'], ['bowl_empty', 'sBowlEmpty'], ['basket_full', 'sBasketFull'], ['count_is', 'sCountIs'], ['olive_says:yes', 'sOliveSaysYes'], ['olive_says:no', 'sOliveSaysNo'], ['can_empty', 'sCanEmpty']];
// IG-006 AC2: "if Olive read [red tulip]" — one sensor value per thing read can name, offered once read is in the palette.
var OLIVE_OBJECTS = ${JSON.stringify(OLIVE_OBJECTS)};
var EVENTS = [['meow', 'eMeow']];
var SAYS = [['thanksMamie', 'thanksMamie'], ['thanksSami', 'thanksSami'], ['thanksBiscuit', 'thanksBiscuit']];
var TRICK_NAMES = ['row', 'hop', 'zigzag'];
var lang = langOf(Inputs.lang), band = Number(Inputs.band) === 1 ? 1 : 2;
var w = wordMap(Inputs.words, lang, nameOf(Inputs.botName));
function opts(pairs) { var out = []; for (var i = 0; i < pairs.length; i++) out.push({ value: pairs[i][0], label: w[pairs[i][1]] || pairs[i][0] }); return out; }
var src = Array.isArray(Inputs.palette) ? Inputs.palette : [];
var reads = false;
for (var rp = 0; rp < src.length; rp++) if (src[rp] && src[rp].id === 'olive:read') reads = true;
function sensorOpts() {
  var out = opts(SENSORS);
  if (reads) for (var id in OLIVE_OBJECTS) out.push({ value: 'olive_read:' + id, label: fill(w.sOliveReadX || '{x}', { x: OLIVE_OBJECTS[id][lang] }) });
  return out;
}
function slot(key) {
  if (key === 'sensor') return { key: 'sensor', label: w.bIf || key, options: sensorOpts() };
  if (key === 'arg') { var n = []; for (var k = 1; k <= 9; k++) n.push({ value: String(k), label: String(k) }); return { key: 'arg', label: '#', options: n }; }
  if (key === 'event') return { key: 'event', label: w.bWhen || key, options: opts(EVENTS) };
  if (key === 'name') { var t = []; for (var j = 0; j < TRICK_NAMES.length; j++) t.push({ value: TRICK_NAMES[j], label: TRICK_NAMES[j] }); return { key: 'name', label: w.bTrick || key, options: t }; }
  if (key === 'text') return { key: 'text', label: w.bSay || key, options: opts(SAYS), text: true, max: 40 };
  return null;
}
var out = [];
for (var i = 0; i < src.length; i++) {
  var e = src[i];
  if (!e || typeof e.id !== 'string') continue;
  var slots = [];
  var names = Array.isArray(e.slots) ? e.slots : [];
  for (var s = 0; s < names.length; s++) { var made = names[s] && typeof names[s] === 'object' ? names[s] : slot(String(names[s])); if (made) slots.push(made); }
  out.push({ id: e.id, kind: e.kind, icon: ICON[e.id] || (e.id.indexOf('olive:') === 0 ? 'owl' : 'pick'), label: band === 1 ? String(e.caption || e.label || e.id) : String(e.label || e.id), hasBody: !!e.hasBody, hasCount: !!e.hasCount, slots: slots });
}
Outputs.palette = out;
Outputs.count = out.length;
`;

/** The fold offer's sentence. "Not now" keeps it hidden until the program is a different program. */
export const TIDY_LINE_SCRIPT = `${WORD_HELPER}
var LABEL = { fwd: 'bFwd', left: 'bLeft', right: 'bRight', water: 'bWater', fill: 'bFill', pick: 'bPick', put: 'bPut', say: 'bSay', repeat: 'bRepeat', until: 'bUntil', 'if': 'bIf', when: 'bWhen', count_inc: 'bCountInc', trick: 'bTrick', 'do': 'bDo', ask: 'bAsk' };
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
// A stored family older than v4 is migrated here on every read until it is written back: the page writes it at once.
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
// P106 IG-004: her plots (a won plot's program and the robot pinned to it) and her robots (v4: the one).
Outputs.plots = active ? JSON.parse(JSON.stringify(active.island.plots)) : {};
// IG-005: each robot resolved for the pages — its look, what it can do, its upgrades applied, where it works.
Outputs.robots = active ? robotRowsOf(active) : [];
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
 * Each islander who asks: her label in the language and, for THIS kid, the first request of hers she has not done in
 * her band (open while there is one). `Logic/Island world` stands her by that request's plot (IG-004). The P105 sea's
 * pin classes went with the sea (P106 s4).
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
    id: pin.id, label: w[isl.nameKey] || '', requestId: requestId, isOpen: !!requestId
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
// P106 IG-004: where her robot is at work. Another request is blocked until it comes home. IG-005: the robot a request
// NEEDS — blocked while that robot works another plot, or while she has no robot of that kind yet (a padlock's card).
var plots = Inputs.plots && typeof Inputs.plots === 'object' ? Inputs.plots : {};
var mine = Array.isArray(Inputs.robots) && Inputs.robots.length ? Inputs.robots : [{ id: 'r1' }];
function kindOfRow(m) { return m && m.kind ? String(m.kind) : m && m.id !== 'r1' && m.id ? String(m.id) : 'pip'; }
function jobOf(r) { var k = r && r.needs ? String(r.needs) : 'pip'; for (var q = 0; q < mine.length; q++) if (kindOfRow(mine[q]) === k) return mine[q]; return null; }
function workOf(bot) { if (!bot) return ''; for (var pk in plots) if (plots[pk] && plots[pk].robotId === bot.id && Array.isArray(plots[pk].program) && plots[pk].program.length) return pk; return ''; }
var rows = [], open = 0;
for (var i = 0; i < reqs.length; i++) {
  var r = reqs[i];
  if (!r || Number(r.band) > band) continue;
  var isl = ISLANDERS[r.islander] || { sprite: 'owl', nameKey: '' };
  var isDone = done.indexOf(r.id) !== -1;
  var job = jobOf(r), workingAt = workOf(job);
  var botName = job && job.name ? String(job.name) : name;
  var wRaw = wordMap(Inputs.words, lang, '{b}');
  if (!isDone) open++;
  var trick = Array.isArray(r.tricks) && r.tricks.length ? Number(r.tricks[0]) : 1;
  var kind = r.palette && r.palette.indexOf('say') !== -1 ? 'ask' : (KIND[trick] || 'control');
  rows.push({
    id: r.id, who: w[isl.nameKey] || '', title: w[r.copyKeys.title] || '', trick: w[r.copyKeys.blurb] || '',
    faceClass: 'bg-face bg-sp-' + isl.sprite, tagClass: 'bg-tag bg-tag-' + kind, isDone: isDone, doneWord: '✓ ' + (w.done || '') + (workingAt === r.id ? ' · ' + String(wRaw.ig4Working || '').split('{b}').join(botName) : ''),
    blocked: !job || (!!workingAt && workingAt !== r.id)
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
var STICKER = { 'can+': ['🪣', 'ig5UpCan'], 'basket+': ['🧺', 'ig5UpBasket'], boots: ['🥾', 'ig5UpBoots'], letter: ['✉️', 'stickerLetter'], paw: ['🐾', 'stickerPaw'], tulip: ['🌷', 'stickerTulip'], bell: ['🔔', 'itemBell'], basket: ['🧺', 'itemBasket'], gnome: ['🧙', 'itemGnome'], seeds: ['🌱', 'seeds'], note: ['📝', 'stickerNote'], flower: ['🌹', 'stickerFlower'], thanks: ['💐', 'stickerThanks'] };
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
// IG-002: a win with no more blocks than the request's own reference is never "it could be shorter" (the tulips' is ten).
function countRef(l) { var n = 0; var a = Array.isArray(l) ? l : []; for (var i = 0; i < a.length; i++) { if (!a[i]) continue; n++; if (Array.isArray(a[i].body)) n += countRef(a[i].body); } return n; }
var refBlocks = req ? countRef(req.referenceProgram) : 0;
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
Outputs.line = fill(blocks > ${MANY_BLOCKS} && !(refBlocks > 0 && blocks <= refBlocks) ? w.winMany : w.winFew, { k: blocks });
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

/**
 * IG-007 (P106 s2) — which renderer draws the world on THIS computer, read from the store's `renderer` key (kept beside
 * the family in the same persisted store, never inside the family model: the save code carries the islands to another
 * computer, and a tablet's "too slow" is not the Mac's). `{ mode: '3d' | '2d', why: '' | 'unsupported' | 'slow' |
 * 'grown-up' }`; nothing stored yet is 3D. The line is the Grown-ups page's sentence for it.
 */
export const RENDERER_SCRIPT = `${WORD_HELPER}
var r = Inputs.stored && typeof Inputs.stored === 'object' ? Inputs.stored : {};
var mode = r.mode === '2d' ? '2d' : '3d';
var why = r.why === 'unsupported' || r.why === 'slow' || r.why === 'grown-up' ? r.why : '';
var lang = String(Inputs.lang) === 'fr' ? 'fr' : 'en';
var w = wordMap(Inputs.words, lang, 'Pip');
Outputs.use3d = mode === '3d';
Outputs.use2d = mode === '2d';
Outputs.mode = mode;
Outputs.why = why;
Outputs.line = mode === '3d' ? (w.guRend3dLine || '') : (w[why === 'slow' ? 'guRendSlow' : why === 'unsupported' ? 'guRendNoGl' : 'guRendFlat'] || '');
`;

/**
 * IG-007 AC4 — the fallback rule's write. `event` is a parameter per placement: `unsupported` (Garden 3D said
 * Supported false), `slow` (it fired Too Slow: Frame Ms above 50 ms for 3 s of visible time), `use3d` / `use2d` (the
 * Grown-ups switch). The next `renderer` value is a fresh object; Changed says whether it differs from the stored one.
 */
export const RENDERER_CHOICE_SCRIPT = `
var before = Inputs.stored && typeof Inputs.stored === 'object' ? Inputs.stored : {};
var event = String(Inputs.event || '');
var next = event === 'unsupported' ? { mode: '2d', why: 'unsupported' }
  : event === 'slow' ? { mode: '2d', why: 'slow' }
  : event === 'use2d' ? { mode: '2d', why: 'grown-up' }
  : event === 'use3d' ? { mode: '3d', why: 'grown-up' }
  : { mode: before.mode === '2d' ? '2d' : '3d', why: String(before.why || '') };
Outputs.renderer = next;
Outputs.changed = next.mode !== (before.mode === '2d' ? '2d' : '3d') || next.why !== String(before.why || '');
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

// ── P106 IG-006 (lane C): the cards, the `?`, Olive's lessons ───────────────

/** Every word a script can show, as `{ en, fr }` (the engine's, Olive's, the pages', IG-006's). */
const BI_WORD = (key: string): { en: string; fr: string } => {
  const w = (WORDS as Record<string, { en: string; fr: string }>)[key] ?? (OLIVE_WORDS as Record<string, { en: string; fr: string }>)[key] ?? PAGE_WORDS[key] ?? IG006_WORDS[key];
  if (!w) throw new Error('no word ' + key);
  return { en: w.en, fr: w.fr };
};

/** The kit's icon per block (the same table Kit palette draws with); an Olive block is the owl. */
const KIT_ICON: Readonly<Record<string, string>> = { fwd: 'fwd', left: 'left', right: 'right', water: 'water', pick: 'pick', put: 'put', say: 'say', repeat: 'loop', until: 'wall', if: 'if', when: 'if', count_inc: 'count', trick: 'loop', do: 'fwd', ask: 'owl' };

/** A slot as the card's example shows it: the value's word in both languages (the kit reads `{ en, fr }` labels). */
function cardSlot(key: string): { key: string; label: { en: string; fr: string }; options: Array<{ value: string; label: { en: string; fr: string } }> } | null {
  const pairs = (list: Array<[string, string]>) => list.map(([value, word]) => ({ value, label: BI_WORD(word) }));
  const listed = (name: string) => (OLIVE_TABLE.lists[name].en as string[]).map((en: string, i: number) => ({ value: en, label: { en, fr: OLIVE_TABLE.lists[name].fr[i] as string } }));
  if (key === 'sensor') {
    const base = pairs([['wall_ahead', 'sWallAhead'], ['tulip_ahead', 'sTulipAhead'], ['bowl_empty', 'sBowlEmpty'], ['basket_full', 'sBasketFull'], ['count_is', 'sCountIs'], ['olive_says:yes', 'sOliveSaysYes'], ['olive_says:no', 'sOliveSaysNo']]);
    const x = BI_WORD('sOliveReadX');
    const reads = Object.entries(OLIVE_OBJECTS).map(([id, o]) => ({ value: 'olive_read:' + id, label: { en: x.en.split('{x}').join(o.en), fr: x.fr.split('{x}').join(o.fr) } }));
    return { key, label: BI_WORD('bIf'), options: [...base, ...reads] };
  }
  if (key === 'event') return { key, label: BI_WORD('bWhen'), options: pairs([['meow', 'eMeow']]) };
  if (key === 'name') return { key, label: BI_WORD('bTrick'), options: ['row', 'hop', 'zigzag'].map((n) => ({ value: n, label: { en: n, fr: n } })) };
  if (key === 'text') return { key, label: BI_WORD('bSay'), options: pairs([['thanksMamie', 'thanksMamie'], ['thanksSami', 'thanksSami'], ['thanksBiscuit', 'thanksBiscuit']]) };
  if (key === 'to') return { key, label: BI_WORD('slotTo'), options: listed('islanders') };
  if (key === 'deed') return { key, label: BI_WORD('slotDeed'), options: listed('deeds') };
  if (key === 'kind') return { key, label: BI_WORD('slotKind'), options: listed('kinds') };
  if (key === 'times') return { key, label: BI_WORD('slotTimes'), options: [{ value: '1', label: BI_WORD('timesOnce') }, { value: '3', label: BI_WORD('timesThree') }] };
  return null;
}

/** The palette the card's example is drawn with: every block a card shows, in the kit's shape, both languages. */
export const CARD_PALETTE = Object.entries(BLOCK_CARDS).map(([id, c]) => {
  const olive = id.indexOf('olive:') === 0;
  const meta = olive ? { kind: 'ask', body: false, count: false, slots: id === 'olive:say-thanks' ? ['to', 'deed'] : id === 'olive:is-it-a' ? ['kind', 'times'] : [] } : BLOCK_META[id];
  return { id, kind: meta.kind, icon: olive ? 'owl' : KIT_ICON[id] || 'pick', label: BI_WORD(c.label), hasBody: meta.body, hasCount: meta.count, slots: meta.slots.map(cardSlot).filter(Boolean) };
});

/** The cards with their examples numbered (the kit needs an id per block). */
const CARDS_DRAWN = Object.fromEntries(
  Object.entries(BLOCK_CARDS).map(([id, c]) => {
    let n = 1;
    const number = (list: ReadonlyArray<CardBlock>): unknown[] => list.map((b) => ({ id: n++, t: b.t, ...(b.n !== undefined ? { n: b.n } : {}), ...(b.body ? { body: number(b.body) } : {}), ...(b.slots ? { slots: { ...b.slots } } : {}) }));
    return [id, { label: c.label, line: c.line, example: number(c.example) }];
  })
);

/**
 * IG-006 AC5 — the first tap on a palette block opens its card and places nothing. The kit has already drawn the new
 * block when it says so (Changed); this gate sees exactly one new block of a kind this child has not seen the card of,
 * hands back the program as it was BEFORE (a fresh list, so the Variable changes and the kit redraws without it) and
 * names the card to open. Anything else — a second tap, a drag, a count, a removal — goes through untouched, as text.
 */
export const CARD_GATE_SCRIPT = `
var CARDS = ${JSON.stringify(Object.keys(BLOCK_CARDS))};
function listOf(raw) { if (Array.isArray(raw)) return raw; if (typeof raw === 'string' && raw) { try { var p = JSON.parse(raw); if (Array.isArray(p)) return p; } catch (e) { return []; } } return []; }
function flat(list, out) { for (var i = 0; i < list.length; i++) { var b = list[i]; if (!b) continue; out.push(b); if (Array.isArray(b.body)) flat(b.body, out); } return out; }
var now = listOf(Inputs.program), before = listOf(Inputs.before);
var seen = Array.isArray(Inputs.seen) ? Inputs.seen : [];
var nowAll = flat(now, []), beforeAll = flat(before, []), had = {};
for (var i = 0; i < beforeAll.length; i++) had[String(beforeAll[i].id)] = 1;
var added = [];
for (var j = 0; j < nowAll.length; j++) if (!had[String(nowAll[j].id)]) added.push(nowAll[j]);
var t = added.length === 1 ? String(added[0].t) : '';
var hold = nowAll.length === beforeAll.length + 1 && t !== '' && CARDS.indexOf(t) !== -1 && seen.indexOf(t) === -1;
Outputs.program = hold ? JSON.parse(JSON.stringify(before)) : typeof Inputs.program === 'string' ? Inputs.program : JSON.stringify(now);
Outputs.hold = hold;
Outputs.cardId = hold ? t : '';
`;

/** "Got it": the card's block is seen, so the next tap on it places it. */
export const CARD_SEEN_SCRIPT = `
var seen = Array.isArray(Inputs.seen) ? Inputs.seen.slice() : [];
var id = String(Inputs.cardId || '');
if (id && seen.indexOf(id) === -1) seen.push(id);
Outputs.seen = seen;
`;

/** The open card's words and its example, drawn as blocks by a second, locked Block List. */
export const BLOCK_CARD_SCRIPT = `${WORD_HELPER}
var CARDS = ${JSON.stringify(CARDS_DRAWN)};
var PALETTE = ${JSON.stringify(CARD_PALETTE)};
var lang = langOf(Inputs.lang), band = Number(Inputs.band) === 1 ? 1 : 2;
var w = wordMap(Inputs.words, lang, nameOf(Inputs.botName));
// A ? chip's row id is help:<block> (a row is a Noodl Object, global by id): the card is the block's.
var id = String(Inputs.cardOpen || '').replace(/^help:/, '');
var c = CARDS[id] || null;
var label = c ? c.label : '';
if (c && band === 1 && w['c' + label.slice(1)] && label.charAt(0) === 'b') label = 'c' + label.slice(1);
Outputs.show = !!c;
Outputs.title = c ? (w[label] || id) : '';
Outputs.line = c ? (w[c.line] || '') : '';
Outputs.example = c ? JSON.parse(JSON.stringify(c.example)) : [];
Outputs.palette = PALETTE;
Outputs.gotIt = w.cardGotIt || '';
Outputs.exampleWord = w.cardExample || '';
Outputs.cardId = c ? id : '';
`;

/** The ? for each kind of block placed (first placed first): a tap opens that block's card again. */
export const HELP_CHIPS_SCRIPT = `${WORD_HELPER}
var CARDS = ${JSON.stringify(Object.fromEntries(Object.entries(BLOCK_CARDS).map(([id, c]) => [id, c.label])))};
var lang = langOf(Inputs.lang), band = Number(Inputs.band) === 1 ? 1 : 2;
var w = wordMap(Inputs.words, lang, nameOf(Inputs.botName));
var prog = Array.isArray(Inputs.program) ? Inputs.program : [];
var rows = [], seen = {};
function walk(list) { for (var i = 0; i < list.length; i++) { var b = list[i]; if (!b) continue; var t = String(b.t); if (CARDS[t] && !seen[t]) { seen[t] = 1; var k = CARDS[t]; if (band === 1 && k.charAt(0) === 'b' && w['c' + k.slice(1)]) k = 'c' + k.slice(1); rows.push({ id: 'help:' + t, label: '? ' + (w[k] || t) }); } if (Array.isArray(b.body)) walk(b.body); } }
walk(prog);
Outputs.rows = rows;
Outputs.show = rows.length > 0;
Outputs.helpsText = rows.length ? w.cardHelpsH || '' : '';
`;

/** Olive's five lessons (R7) as they are asked on Skills: the rung, the canned slots, and in which language. */
const LESSONS: ReadonlyArray<{ id: string; title: string; lesson: string; asks: ReadonlyArray<{ slots: Record<string, string>; lang?: 'en' | 'fr'; q?: string; book?: string }> }> = [
  { id: 'count-tulips', title: 'or7Title', lesson: 'or7Lesson', asks: [{ slots: { list: '@flowerlists' } }] },
  { id: 'maths', title: 'or8Title', lesson: 'or8Lesson', asks: [{ slots: { a: '14', b: '9' } }] },
  { id: 'no-letter-e', title: 'or9Title', lesson: 'or9Lesson', asks: [{ slots: {} }] },
  { id: 'tall-tales', title: 'or10Title', lesson: 'or10Lesson', asks: [0, 1, 2].map((i) => ({ slots: { question: '@questions_tall:' + i }, q: '@questions_tall:' + i, book: 'lsTrue' + (i + 1) })) },
  { id: 'translate', title: 'or11Title', lesson: 'or11Lesson', asks: [{ slots: { note: 'Les tulipes ont soif.' }, lang: 'fr', q: 'lsFrEn', book: 'The tulips are thirsty.' }, { slots: { note: 'The tulips are thirsty.' }, lang: 'en', q: 'lsEnFr', book: 'Les tulipes ont soif.' }] }
];
const LESSON_QUESTION: Readonly<Record<string, string>> = { 'count-tulips': 'lsQ7', maths: 'lsQ8', 'no-letter-e': 'lsQ9', 'tall-tales': 'lsQ10', translate: 'lsQ11' };
if (LESSONS.map((l) => l.id).join() !== OLIVE_LESSON_IDS.join()) throw new Error('IG-006: the Skills lessons are not the rung table’s five');

/** The words each lesson card carries in its row (a repeated card has no word table of its own). */
const LESSON_WORD_KEYS = ['oliveSaysBubble', 'lsCheck7', 'lsCheck8', 'lsCheck9', 'lsCheck9None', 'lsBook', 'lsTrue1', 'lsTrue2', 'lsTrue3', 'lsFrEn', 'lsEnFr'];

/**
 * The five lesson cards, band 10–12 only (at 7–9 there are no rows and nothing shows): title, lesson, the canned
 * question, the Ask Olive word, and the few words the card's answers need; "Olive can't do this here yet" where this
 * computer's exam withheld the lesson.
 */
export const LESSON_ROWS_SCRIPT = `${WORD_HELPER}
var LESSONS = ${JSON.stringify(LESSONS.map((l) => ({ id: l.id, title: l.title, lesson: l.lesson })))};
var QUESTION = ${JSON.stringify(LESSON_QUESTION)};
var KEYS = ${JSON.stringify(LESSON_WORD_KEYS)};
var FLOWERS = ${JSON.stringify(OLIVE_TABLE.lists.flowerlists)};
var lang = langOf(Inputs.lang), band = Number(Inputs.band) === 1 ? 1 : 2;
var w = wordMap(Inputs.words, lang, nameOf(Inputs.botName));
var exam = Inputs.exam && Inputs.exam.rungs && typeof Inputs.exam.rungs === 'object' ? Inputs.exam.rungs : {};
var few = {};
for (var k = 0; k < KEYS.length; k++) few[KEYS[k]] = w[KEYS[k]] || '';
var rows = [];
if (band === 2) for (var i = 0; i < LESSONS.length; i++) {
  var l = LESSONS[i], held = !!exam[l.id] && exam[l.id].pass === false;
  rows.push({ id: l.id, title: w[l.title] || '', lesson: w[l.lesson] || '', question: fill(w[QUESTION[l.id]], { list: FLOWERS[lang][0] }), askWord: w.lsAsk || '', lang: lang, w: few, isHeld: held, heldText: held ? w.oliveCant || '' : '' });
}
Outputs.rows = rows;
Outputs.show = rows.length > 0;
Outputs.count = rows.length;
`;

/**
 * "Ask Olive" on a lesson card: each canned question sent to the shell (never a word the child typed), her answer — or
 * her written one when she does not answer — and the page's CHECK underneath: the program's count (4), the rule's sum
 * (23), every letter e in her sentence found and marked (Letters), the book's answer, the translation a person gives.
 */
export const OLIVE_LESSON_SCRIPT = `${OLIVE_HELPERS}
var ASKS = ${JSON.stringify(Object.fromEntries(LESSONS.map((l) => [l.id, l.asks])))};
var lesson = String(Inputs.lesson || '');
var lang = String(Inputs.lang) === 'fr' ? 'fr' : 'en';
var W = Inputs.w && typeof Inputs.w === 'object' ? Inputs.w : {};
function fillIn(t, vars) { var out = String(t || ''); for (var k in vars) out = out.split('{' + k + '}').join(String(vars[k])); return out; }
function listed(v, L) { var m = /^@(\\w+)(?::(\\d+))?$/.exec(String(v)); if (!m) return String(v); var l = oliveListOf(m[1], L); return l[Number(m[2]) || 0] || ''; }
function isE(ch) { return fold(ch) === 'e'; }
var asks = ASKS[lesson] || [];
var lines = [], letters = [], fallback = false, eCount = 0;
for (var i = 0; i < asks.length; i++) {
  var a = asks[i], L = a.lang || lang, slots = {};
  for (var s in a.slots) slots[s] = listed(a.slots[s], L);
  var reply = null;
  try {
    var ctl = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = ctl ? setTimeout(function () { ctl.abort(); }, Number(Inputs.timeoutMs) > 0 ? Number(Inputs.timeoutMs) : OLIVE_TIMEOUT_MS) : null;
    var headers = { 'content-type': 'application/json' };
    headers[OLIVE_HEADER] = '1';
    var res = await fetch(String(Inputs.url || OLIVE_URL), { method: 'POST', headers: headers, body: JSON.stringify({ rung: lesson, slots: slots, lang: L }), signal: ctl ? ctl.signal : undefined });
    if (timer) clearTimeout(timer);
    if (res && res.ok) reply = await res.json();
  } catch (e) { reply = null; }
  var said;
  if (reply && reply.ok === true && (reply.value !== undefined || typeof reply.text === 'string')) said = reply.value !== undefined ? reply.value : reply.text;
  else { fallback = true; var wr = writtenAnswer(OLIVE, lesson, slots, L); said = wr ? (wr.value !== undefined ? wr.value : wr.text) : ''; }
  said = String(said === undefined || said === null ? '' : said);
  // A repeater's row is a Noodl Object, global by id: every card's rows carry the lesson in their id, or five cards share one row.
  var line = { id: lesson + ':l' + i, q: '', a: fillIn(W.oliveSaysBubble || '{x}', { x: said }), check: '' };
  if (lesson === 'count-tulips') { var n = 0, parts = String(slots.list).split(','); for (var p = 0; p < parts.length; p++) if (/^(tulip|tulipe)$/.test(parts[p].trim())) n++; line.check = fillIn(W.lsCheck7, { n: n }); }
  else if (lesson === 'maths') line.check = fillIn(W.lsCheck8, { n: Number(slots.a) + Number(slots.b) });
  else if (lesson === 'no-letter-e') {
    var run = '', parts2 = [], chars = Array.from ? Array.from(said) : said.split('');
    for (var c = 0; c < chars.length; c++) {
      var ch = chars[c];
      if (isE(ch) || ch === ' ') { if (run) parts2.push({ text: run, e: false }); run = ''; parts2.push({ text: ch === ' ' ? '\\u00a0' : ch, e: ch !== ' ' }); if (ch !== ' ') eCount++; }
      else run += ch;
    }
    if (run) parts2.push({ text: run, e: false });
    for (var q = 0; q < parts2.length; q++) letters.push({ id: lesson + ':c' + q, text: parts2[q].text, isE: parts2[q].e, ground: parts2[q].e ? 'var(--sun)' : 'transparent' });
    line.a = '';
    line.check = eCount ? fillIn(W.lsCheck9, { n: eCount }) : W.lsCheck9None || '';
  } else if (lesson === 'tall-tales') { line.q = listed(a.q, L); line.check = fillIn(W.lsBook, { x: W[a.book] || '' }); }
  else if (lesson === 'translate') { line.q = fillIn(W[a.q], { q: slots.note }); line.check = fillIn(W.lsBook, { x: a.book }); }
  lines.push(line);
}
Outputs.lines = lines;
Outputs.letters = letters;
Outputs.hasLetters = letters.length > 0;
Outputs.eCount = eCount;
Outputs.fallback = fallback;
Outputs.asked = asks.length > 0;
`;

// ── P106 IG-003 (lane B): Drive · Teach · Play, and the islander's Predict challenge ──────────────────────────────

/**
 * Entering Teach: the robot goes back to the request's start, then along the program already there (run with no Olive,
 * every ask taking the fallback), so the next press is recorded exactly where Play will be when it reaches it. With no
 * program that IS the start (the task's "Drive → Teach resets the robot to the start"). At Entry is the program's block
 * count when Teach began (the mode line says "back to the start" until a press is recorded).
 */
export const TEACH_START_SCRIPT = `${ENGINE}
var start = Inputs.start && typeof Inputs.start === 'object' ? Inputs.start : null;
var program = Array.isArray(Inputs.program) ? Inputs.program : [];
var n = countBlocks(program);
if (start) {
  var w0 = worldOf(start);
  var rid = w0.robots.length ? w0.robots[0].id : 'me';
  Outputs.world = n ? runToEnd(program, w0, rid, Inputs.lang).world : w0;
} else Outputs.world = null;
Outputs.blocks = n;
Outputs.resumed = n > 0;
`;

/**
 * What the Workshop says the mode is: a short tag on the world (Just driving / {b} is learning…), one line under it
 * (drive: nothing is remembered; teach: back to the start — or where the steps end when there were steps — until a press
 * is recorded, then the tag alone), and the steps panel's note while driving. Play shows none of them.
 */
export const MODE_LINE_SCRIPT = `${WORD_HELPER}
var lang = langOf(Inputs.lang), w = wordMap(Inputs.words, lang, nameOf(Inputs.botName));
var mode = String(Inputs.mode || '');
var blocks = Math.max(0, Math.floor(Number(Inputs.blocks)) || 0), atEntry = Math.max(0, Math.floor(Number(Inputs.atEntry)) || 0);
var badge = '', line = '';
if (mode === 'drive') { badge = w.ig3DrivingTag || ''; line = w.ig3Driving || ''; }
else if (mode === 'teach') { badge = w.recording || ''; line = blocks > atEntry ? '' : atEntry > 0 ? w.ig3TeachGoOn || '' : w.ig3TeachOn || ''; }
Outputs.badge = badge;
Outputs.line = line;
Outputs.showLine = line !== '';
Outputs.driving = mode === 'drive';
Outputs.note = mode === 'drive' ? w.ig3StepsDriving || '' : '';
`;

/**
 * The islander's Predict challenge (R5), band 10–12 only, on a request that carries it. Armed while the program has
 * blocks and has not been played, stepped or answered as it stands (Asked For holds the program text the challenge was
 * last settled for) and no run is live: the islander's card line asks. A right tap settles it with Outcome hit — the
 * card says "You were right!" and the tick shows on the tile — until the program changes. Anything else: the card's line.
 */
export const CHALLENGE_SCRIPT = `${WORD_HELPER}
var lang = langOf(Inputs.lang), w = wordMap(Inputs.words, lang, nameOf(Inputs.botName));
var on = String(Inputs.challenge || '') === 'predict' && Number(Inputs.band) === 2;
var text = String(Inputs.programText || '');
var settled = text !== '' && String(Inputs.askedFor || '') === text;
var blocks = Math.max(0, Math.floor(Number(Inputs.blocks)) || 0);
var hit = on && settled && String(Inputs.outcome || '') === 'hit';
var armed = on && blocks > 0 && !settled && Inputs.live !== true;
Outputs.armed = armed;
Outputs.showTick = hit;
Outputs.line = hit ? w.ig3PredictRight || '' : armed ? w.ig3PredictAsk || '' : String(Inputs.cardLine || '');
`;

// ── P106 IG-004 (lane E): the island as a world — built here, where free play and the word helper live ─────

/** `Logic/Island world`: the island for this kid, from the requests' plots, her save and the islanders' next requests. */
export const ISLAND_WORLD_SCRIPT = islandWorldScript({ free: FREE_PLAY, base: ISLAND_BASE, home: ISLAND_HOME, freePlot: FREE_PLAY_PLOT, plotW: PLOT_W, plotH: PLOT_H });
/** `Logic/Island choose`: the plot card's words and what it offers. */
export const ISLAND_CHOOSE_SCRIPT = islandChooseScript({ free: FREE_PLAY, islanders: ISLANDERS, wordHelper: WORD_HELPER, robots: JSON.parse(ROBOTS_JSON), robotWords: ROBOT_WORDS });

// ── P106 IG-005 (lane B): robots for the job ──────────────────────────────────────────────────────────────────────

/**
 * `Logic/Job robot` — the robot doing this request: the kind it needs (Pip when it names none; free play: Pip), and
 * her robot of that kind — its row (look, what it can do, the upgrades), its id for the win to pin, its words' name,
 * and the Workshop's step time with its boots. With no robot of that kind (the plot is padlocked; the island never
 * opens it) the catalogue's robot, `owned` false. `robotKey` is the text Start world re-runs on (id, kind, look).
 * `paletteRobot` is the row, except in free play (the garden offers every block, whoever drives).
 */
export const JOB_ROBOT_SCRIPT = `${WORD_HELPER}
var ROBOTS = ${ROBOTS_JSON};
var lang = langOf(Inputs.lang);
var reqs = Array.isArray(Inputs.requests) ? Inputs.requests : [];
var id = String(Inputs.requestId || '');
var req = null;
for (var i = 0; i < reqs.length; i++) if (reqs[i] && reqs[i].id === id) req = reqs[i];
var kind = req && req.needs ? String(req.needs) : 'pip';
var mine = Array.isArray(Inputs.robots) ? Inputs.robots : [];
var row = null;
for (var j = 0; j < mine.length && !row; j++) if (mine[j] && String(mine[j].kind || '') === kind) row = mine[j];
var owned = !!row;
if (!row) {
  var spec = null;
  for (var k = 0; k < ROBOTS.length; k++) if (ROBOTS[k].id === kind) spec = ROBOTS[k];
  spec = spec || ROBOTS[0];
  row = { id: '', kind: spec.id, name: spec.defaultName[lang] || spec.defaultName.en, color: spec.colour, eye: 'round', hat: 'none', accessory: spec.accessory, palette: spec.palette.slice(), canMax: spec.canMax, basket: spec.basket, stepFactor: 1 };
}
var base = Number(Inputs.stepMs) > 0 ? Number(Inputs.stepMs) : 420;
Outputs.needs = kind;
Outputs.owned = owned;
Outputs.robot = JSON.parse(JSON.stringify(row));
Outputs.paletteRobot = id === 'free' ? null : JSON.parse(JSON.stringify(row));
Outputs.robotId = String(row.id || '');
Outputs.botName = String(row.name || 'Pip');
Outputs.color = String(row.color || '#FF7A59');
Outputs.eye = String(row.eye || 'round');
Outputs.hat = String(row.hat || 'none');
Outputs.accessory = String(row.accessory || '');
Outputs.stepMs = Math.round(base * (Number(row.stepFactor) > 0 ? Number(row.stepFactor) : 1));
Outputs.robotKey = JSON.stringify([row.id, row.kind, row.name, row.color, row.eye, row.hat, row.accessory]);
`;

/**
 * `Logic/Gift line` — the win card's line for what the win lent and gave (Complete request's Lent and Upgraded):
 * "Sami lends you Cobble! Cobble lays stones." / "Mamie Rose gives you Bigger can · 6 waters." Nothing when nothing.
 */
export const GIFT_LINE_SCRIPT = `${WORD_HELPER}
var ROBOTS = ${ROBOTS_JSON};
var UPGRADES = ${UPGRADES_JSON};
var WHO = ${JSON.stringify(ISLANDER_WORDS)};
var RW = ${JSON.stringify(ROBOT_WORDS)};
var lang = langOf(Inputs.lang);
var w = wordMap(Inputs.words, lang, nameOf(Inputs.botName));
var lent = Array.isArray(Inputs.lent) ? Inputs.lent : [];
var upgraded = Array.isArray(Inputs.upgraded) ? Inputs.upgraded : [];
var out = [];
for (var i = 0; i < lent.length; i++) for (var j = 0; j < ROBOTS.length; j++) if (ROBOTS[j].id === lent[i]) {
  var r = ROBOTS[j], nm = r.defaultName[lang] || r.defaultName.en;
  out.push(fill(w.ig5Lends, { who: w[WHO[r.lentBy]] || '', r: nm, does: w[RW.does[r.id]] || '' }));
}
for (var u = 0; u < upgraded.length; u++) for (var k = 0; k < UPGRADES.length; k++) if (UPGRADES[k].id === upgraded[u]) out.push(fill(w.ig5Gives, { who: w[WHO[UPGRADES[k].from]] || '', up: w[RW.upgrade[UPGRADES[k].id]] || '' }));
Outputs.text = out.join(' ');
Outputs.has = out.length > 0;
`;

/**
 * `Logic/Robot cards` — My robots (the mockup's 09-robots): one card per robot of the catalogue, in its order. An owned
 * robot: its name, whose it is (Yours / Lent by …), what it wears, its colours and hats to pick (ringed and worn), its
 * blocks as chips (the moves, its own, the controls of her band), its upgrade (owned, or the empty slot and who gives
 * it), where it works. A robot not lent yet: Locked, who lends it and after what, its blocks — nothing to pick.
 */
export const ROBOT_CARDS_SCRIPT = `${WORD_HELPER}
var ROBOTS = ${ROBOTS_JSON};
var UPGRADES = ${UPGRADES_JSON};
var WHO = ${JSON.stringify(ISLANDER_WORDS)};
var RW = ${JSON.stringify(ROBOT_WORDS)};
var PAINTS = ${JSON.stringify(ROBOT_PAINTS)};
var HATS = ${JSON.stringify(HATS)};
var META = ${JSON.stringify(BLOCK_META)};
var MOVES = ['fwd', 'left', 'right'];
var CONTROLS = ['repeat', 'until', 'if', 'when', 'count_inc'];
var LABEL = { fwd: 'bFwd', left: 'bLeft', right: 'bRight', water: 'bWater', fill: 'bFill', pick: 'bPick', put: 'bPut', say: 'bSay', repeat: 'bRepeat', until: 'bUntil', 'if': 'bIf', when: 'bWhen', count_inc: 'bCountInc' };
var OLIVE_WORD = ${JSON.stringify(Object.fromEntries(PALETTE_RUNG_IDS.map((id) => ['olive:' + id, rungWordKey(id)])))};
var lang = langOf(Inputs.lang), band = Number(Inputs.band) === 1 ? 1 : 2;
var w = wordMap(Inputs.words, lang, nameOf(Inputs.botName));
var mine = Array.isArray(Inputs.robots) ? Inputs.robots : [];
var owned = Array.isArray(Inputs.hats) ? Inputs.hats : [];
var reqs = Array.isArray(Inputs.requests) ? Inputs.requests : [];
function titleOf(id) { for (var i = 0; i < reqs.length; i++) if (reqs[i] && reqs[i].id === id) return w[reqs[i].copyKeys.title] || id; return id; }
function blockWord(id) { if (id.indexOf('olive:') === 0) return w[OLIVE_WORD[id]] || id; var k = LABEL[id]; if (band === 1 && k && w['c' + k.slice(1)]) k = 'c' + k.slice(1); return w[k] || id; }
function kindClass(id) { return 'bg-ability bg-blk bg-blk-' + (id.indexOf('olive:') === 0 ? 'ask' : META[id] ? META[id].kind : 'action'); }
var cards = [];
for (var i = 0; i < ROBOTS.length; i++) {
  var spec = ROBOTS[i], row = null;
  for (var j = 0; j < mine.length && !row; j++) if (mine[j] && String(mine[j].kind || '') === spec.id) row = mine[j];
  var has = !!row;
  var look = row || { id: '', name: spec.defaultName[lang] || spec.defaultName.en, color: spec.colour, eye: 'round', hat: 'none', canMax: spec.canMax, basket: spec.basket, upgraded: false, working: '' };
  var abilities = [], ids = MOVES.slice();
  for (var a = 0; a < spec.palette.length; a++) if (band === 2 || spec.palette[a].indexOf('olive:') !== 0) ids.push(spec.palette[a]);
  if (band === 2) ids = ids.concat(CONTROLS);
  // 🔴 A repeater's row is a Noodl Object, global by id (P105 D57): every nested row id carries its card's kind, or two
  // cards (and the Options panel's own swatches and hats) would share one row and one ring.
  var pre = spec.id + '|';
  for (var b = 0; b < ids.length; b++) if (!(band === 1 && ids[b] === 'say')) abilities.push({ id: pre + ids[b], label: blockWord(ids[b]), cls: kindClass(ids[b]) });
  var up = null;
  for (var u = 0; u < UPGRADES.length; u++) if (UPGRADES[u].id === spec.upgrade) up = UPGRADES[u];
  var upWord = up ? w[RW.upgrade[up.id]] || '' : '', upWho = up ? w[WHO[up.from]] || '' : '';
  var paints = [], hats = [];
  if (has) {
    for (var q = 0; q < PAINTS.length; q++) paints.push({ id: pre + PAINTS[q].hex, paint: 'var(' + PAINTS[q].token + ')', label: PAINTS[q].name[lang], selected: PAINTS[q].hex.toUpperCase() === String(look.color).toUpperCase() });
    for (var h = 0; h < HATS.length; h++) { var hs = HATS[h], got = hs.free || owned.indexOf(hs.id) !== -1; hats.push({ id: pre + hs.id, label: (hs.id === 'sun' ? '🌻 ' : hs.id === 'crown' ? '👑 ' : '') + (w[hs.word] || hs.id) + (got || !hs.from ? '' : ' · ' + fill(w.hatLocked, { who: w[hs.from] || '' })), selected: hs.id === look.hat, locked: !got }); }
  }
  var lender = spec.lentBy ? w[WHO[spec.lentBy]] || '' : '';
  var nm = String(look.name || spec.defaultName.en);
  // The card's id is its KIND (stable whether she has the robot or not: an id that changed between runs left a stale
  // row behind in the repeater); the robot's own id rides in robotId, for Update robot.
  cards.push({
    id: spec.id, robotId: has ? String(row.id) : '', kind: spec.id, name: nm, owned: has, locked: !has,
    tag: !has ? (w.ig5LockedTag || '') : spec.lentBy ? fill(w.ig5LentBy, { who: lender }) : (w.ig5Yours || ''),
    tagClass: 'bg-robot-tag ' + (!has ? 'bg-robot-tag-locked' : spec.lentBy ? 'bg-robot-tag-lent' : 'bg-robot-tag-yours'),
    cardClass: 'bg-panel bg-robot-card bg-robot-' + spec.id + (has ? '' : ' bg-robot-locked'),
    wears: w[RW.wears[spec.accessory]] || '', color: String(look.color), eye: String(look.eye || 'round'), hat: String(look.hat || 'none'), accessory: spec.accessory,
    paints: paints, hats: hats, abilities: abilities,
    upgradeText: up ? fill(has && look.upgraded ? w.ig5UpHas : w.ig5UpEmpty, { up: upWord, who: upWho }) : '',
    upgradeClass: 'bg-robot-up' + (has && look.upgraded ? ' bg-robot-up-on' : ''),
    whereText: !has ? fill(w.ig5WhenLent, { who: lender, r: nm, q: titleOf(spec.unlockedBy) }) : look.working ? fill(w.ig5AtWork, { plot: titleOf(look.working) }) : (w.ig5AtHome || ''),
    nameWord: w.rbName || '', colourWord: w.rbColour || '', hatWord: w.rbHat || '', canDoWord: w.ig5CanDo || '', upgradeWord: w.ig5Upgrade || '', whereWord: w.ig5Where || ''
  });
}
Outputs.cards = cards;
Outputs.count = cards.length;
Outputs.owned = mine.length;
`;

// ── P106 s4 (lane G): the running ring ─────

/**
 * `Logic/Glow` (the Runner's): the block the page rings is Step's Glow Id while a run is live (playing or paused on One
 * step), and none otherwise. Step's own answer is left as it was by Stop, so without this a Start over after One step
 * kept the ring, and a new program's block with the same id wore it (P105, found by IG-003 s3).
 */
export const GLOW_SCRIPT = `
var g = Inputs.glowId;
Outputs.id = Inputs.live === true && g !== null && g !== undefined && g !== '' ? String(g) : '';
`;

/** The glue, as the generator places it: one `Logic/*` each. */
export const GLUE_SCRIPTS: ReadonlyArray<{ component: string; script: string; seam: string }> = [
  { component: 'Logic/Read program', script: READ_PROGRAM_SCRIPT, seam: 'the program as a list, whatever held it' },
  { component: 'Logic/Start world', script: START_WORLD_SCRIPT, seam: 'the world a request starts from, and the request' },
  { component: 'Logic/Request card', script: REQUEST_CARD_SCRIPT, seam: 'who is asking and what, in the child’s language' },
  { component: 'Logic/Draw world', script: DRAW_WORLD_SCRIPT, seam: 'the engine’s world in the kit’s words' },
  { component: 'Logic/Record step', script: RECORD_STEP_SCRIPT, seam: 'a Teach pad press: the block appended, the robot moved by the engine' },
  { component: 'Logic/Kit palette', script: KIT_PALETTE_SCRIPT, seam: 'the engine’s palette in the kit’s shape' },
  { component: 'Logic/Pad keys', script: PAD_KEYS_SCRIPT, seam: 'the Teach pad’s keys: one per step the request allows' },
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
  { component: 'Logic/Olive played', script: OLIVE_PLAYED_SCRIPT, seam: 'the rung this run asked Olive, and whether she answered, for the after-run hint' },
  // P106 IG-006 (lane C).
  { component: 'Logic/Card gate', script: CARD_GATE_SCRIPT, seam: 'the first tap on a palette block opens its card and places nothing' },
  { component: 'Logic/Card seen', script: CARD_SEEN_SCRIPT, seam: 'Got it: the block’s card is seen, the next tap places it' },
  { component: 'Logic/Block card', script: BLOCK_CARD_SCRIPT, seam: 'the open card’s words and its example as blocks' },
  { component: 'Logic/Help chips', script: HELP_CHIPS_SCRIPT, seam: 'a ? for each kind of block placed, to open its card again' },
  { component: 'Logic/Lesson rows', script: LESSON_ROWS_SCRIPT, seam: 'Olive’s five lessons as Skills cards, band 10–12' },
  { component: 'Logic/Olive lesson', script: OLIVE_LESSON_SCRIPT, seam: 'a lesson asked of Olive, her answer, and the page’s check underneath' },
  // IG-007 (P106 s2): the renderer this computer uses, and the fallback rule's write.
  { component: 'Logic/Renderer', script: RENDERER_SCRIPT, seam: 'which renderer draws the world on this computer, and the grown-ups\u2019 line for it' },
  { component: 'Logic/Renderer choice', script: RENDERER_CHOICE_SCRIPT, seam: 'the renderer after a fallback or the grown-ups\u2019 switch' },
  // P106 IG-003 (lane B): Drive · Teach · Play, and the Predict challenge.
  { component: 'Logic/Teach start', script: TEACH_START_SCRIPT, seam: 'where the robot stands when Teach begins: the start, then along the steps already there' },
  { component: 'Logic/Mode line', script: MODE_LINE_SCRIPT, seam: 'what the Workshop says the mode is: the tag on the world, the line under it, the steps note' },
  { component: 'Logic/Challenge', script: CHALLENGE_SCRIPT, seam: 'the islander\u2019s Predict challenge: armed, the card\u2019s line, the tick on a right tap' },
  // P106 IG-004 (lane E): the island as a world.
  { component: 'Logic/Island world', script: ISLAND_WORLD_SCRIPT, seam: 'her island as it stands: every plot stamped from its request, who works where, the islanders, the fences, and the tick\u2019s first state' },
  { component: 'Logic/Island tick', script: ISLAND_TICK_SCRIPT, seam: 'one tick of the island: every pinned run stepped in turn on its own plot' },
  { component: 'Logic/Plot at', script: PLOT_AT_SCRIPT, seam: 'which plot a tapped tile is on' },
  { component: 'Logic/Island choose', script: ISLAND_CHOOSE_SCRIPT, seam: 'the plot card: who asks, what, whether it opens, and bring the robot home' },
  { component: 'Logic/Find robots', script: FIND_ROBOTS_SCRIPT, seam: 'the flat island\u2019s find my robots, and the plot card scrolled into view' },
  // P106 IG-005 (lane B): robots for the job.
  { component: 'Logic/Job robot', script: JOB_ROBOT_SCRIPT, seam: 'the robot this request needs, hers of that kind, its look, its step time' },
  { component: 'Logic/Gift line', script: GIFT_LINE_SCRIPT, seam: 'the win card\u2019s line for the robot lent and the upgrade given' },
  { component: 'Logic/Robot cards', script: ROBOT_CARDS_SCRIPT, seam: 'My robots: a card per robot, owned or still to be lent' },
  // P106 s4 (lane G).
  { component: 'Logic/Glow', script: GLOW_SCRIPT, seam: 'the block the page rings: Step\u2019s while a run is live, none once it stops' }
];
