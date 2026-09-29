/**
 * CG-005 — Olive in the game: the page's half of the `ask Olive` block family.
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * ## What is here
 *
 * The engine's half (the `ask` step that parks, the shapes it consumes, the
 * proposal a `blocks` answer becomes, the exam gate in the palette) lives in
 * `cg002Scripts.ts`, which reads the tables below. This file holds what only
 * Olive needs, as Function scripts in the TPL-007 pattern:
 *
 * | script | the question it answers |
 * |---|---|
 * | {@link ASK_OLIVE_SCRIPT} | the parked request, validated, sent to the shell's route, answered — or the written answer, at once or after the 12 s timeout |
 * | {@link OLIVE_SLOTS_SCRIPT} | the picker for a rung's slots in a band, and whether the slots filled so far may be sent |
 * | {@link OWL_ROW_SCRIPT} | the owl row: the written hint, replaced by Olive's voiced one only when it is for the SAME key and clean; thinking; resting |
 * | {@link ACCEPT_PROPOSAL_SCRIPT} | the blocks Olive proposed, placed after the ask ONLY when the child accepts |
 *
 * ## One table, three readers
 *
 * The rung table is `garden-desktop/shell/olive-templates.json` (CG-005 §4 named
 * it `olive/rungs.json`; it is this file). The shell composes prompts from it;
 * this file embeds it (trimmed) in the page's scripts; the stub Olive answers
 * from it. The slot rules are the shell's own `checkSlots` and the written
 * answers the shell's own `writtenAnswer` — their SOURCE is embedded here
 * (`Function.prototype.toString`), so the page and the shell cannot drift.
 *
 * ## 🔴 Where this is NOT pure
 *
 * {@link ASK_OLIVE_SCRIPT} calls `fetch`: it is the one Olive script that talks
 * to the shell. It is kept OUT of `FUNCTION_SCRIPTS` (CG-002 AC6: no engine
 * script reaches the network) and ships as {@link OLIVE_SCRIPTS}; the generator
 * spreads both. The rest are pure.
 *
 * @module noodl-mcp/tests/cg005Olive
 */
import * as fs from 'fs';
import * as path from 'path';

/** The shell folder: the rung table, the checks, the written answers, the stub. */
export const SHELL_DIR = path.join(__dirname, '..', '..', '..', 'dev-docs', 'tasks', 'phase-105-the-coding-garden', 'garden-desktop', 'shell');

// eslint-disable-next-line @typescript-eslint/no-var-requires
const oliveCheck = require(path.join(SHELL_DIR, 'olive-check.js'));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const oliveWritten = require(path.join(SHELL_DIR, 'olive-written.js'));
const gardenConfig = JSON.parse(fs.readFileSync(path.join(SHELL_DIR, 'garden.json'), 'utf8'));

/** The rung table, as the shell reads it. */
export const OLIVE_TABLE = JSON.parse(fs.readFileSync(path.join(SHELL_DIR, 'olive-templates.json'), 'utf8'));

type Rung = { n: number; use?: 'block' | 'lesson' | 'voice'; band?: number; ladder: 'pass' | 'fail'; shape: string; temperature: number; slots: Record<string, any>; options?: string };

/** The rungs, in ladder order (n, then the table's order). `voice-hint` (n 0) is the hint voicing, never a palette block. */
export const OLIVE_RUNG_IDS: ReadonlyArray<string> = Object.keys(OLIVE_TABLE.rungs)
  .map((id, i) => ({ id, i, n: (OLIVE_TABLE.rungs[id] as Rung).n }))
  .sort((a, b) => a.n - b.n || a.i - b.i)
  .map((r) => r.id);

/**
 * P106 IG-006 (R6): the rungs a child may PLACE — the three blocks (say, read, is it a…?), rungs 1–3. The eighteen-rung
 * `ask Olive` family is gone from the palette; the five lessons (R7) are asked from the Skills page, never placed.
 */
export const OLIVE_BLOCK_IDS: ReadonlyArray<string> = OLIVE_RUNG_IDS.filter((id) => (OLIVE_TABLE.rungs[id] as Rung).use === 'block');
export const PALETTE_RUNG_IDS: ReadonlyArray<string> = OLIVE_BLOCK_IDS;
/** The five lessons (R7), in the table's order: canned questions on Skills, band 10–12, no block. */
export const OLIVE_LESSON_IDS: ReadonlyArray<string> = Object.keys(OLIVE_TABLE.rungs).filter((id) => (OLIVE_TABLE.rungs[id] as Rung).use === 'lesson');

/** What the page's scripts carry of the table: no prompt text ever reaches the page. */
export const OLIVE_SLIM = {
  rungs: Object.fromEntries(
    Object.entries(OLIVE_TABLE.rungs as Record<string, Rung>).map(([id, r]) => [
      id,
      { n: r.n, use: r.use || 'block', band: r.band || 1, ladder: r.ladder, shape: r.shape, temperature: r.temperature, slots: r.slots, ...(r.options ? { options: r.options } : {}) }
    ])
  ),
  lists: OLIVE_TABLE.lists,
  textSlot: OLIVE_TABLE.textSlot,
  written: Object.fromEntries(Object.entries(OLIVE_TABLE.written).filter(([k]) => k !== '_about'))
};

/** The shape a rung answers in, and its own temperature (used when the block's dial is unset). */
export const RUNG_SHAPE: Readonly<Record<string, string>> = Object.fromEntries(Object.entries(OLIVE_SLIM.rungs).map(([id, r]) => [id, r.shape]));
export const RUNG_TEMPERATURE: Readonly<Record<string, number>> = Object.fromEntries(Object.entries(OLIVE_SLIM.rungs).map(([id, r]) => [id, r.temperature]));

/** Olive's block words (the grammar's enum) → the engine's block types. */
export const BLOCK_WORD: Readonly<Record<string, string>> = { avancer: 'fwd', gauche: 'left', droite: 'right', arroser: 'water' };

/** The page gives up on the shell after the shell's own timeout (garden.json `olive.timeoutMs`, 12 000 ms). */
export const OLIVE_TIMEOUT_MS: number = gardenConfig.olive.timeoutMs;

/** The shell's route (garden.json `doorPrefix` + `olive`) and the header every POST carries. */
export const OLIVE_URL = `${gardenConfig.doorPrefix}olive`;
export const OLIVE_HEADER: string = gardenConfig.header;

/**
 * The block `t` of an Olive block's palette entry: `olive:<rung>` (IG-006; the old family's prefix is gone with it). The
 * engine reads the rung from it when `slots.rung` is unset.
 */
export const OLIVE_PREFIX = 'olive:';
export const oliveType = (rung: string) => `${OLIVE_PREFIX}${rung}`;

/**
 * `is it a…?`'s vote (IG-006 AC3): the block's `times` option — once, or three times and the majority. An engine-only
 * option (reserved: never sent to the shell as a slot).
 */
export const VOTE_TIMES: ReadonlyArray<number> = [1, 3];

// ── What the ENGINE names (IG-006): the things on a plot, the thing ahead ──────

type Bi2 = { en: string; fr: string };
/** A list word of the rung table in both languages, by its English word (the lists are index-aligned). */
function listWord(list: string, en: string): Bi2 {
  const l = OLIVE_TABLE.lists[list];
  const i = l.en.indexOf(en);
  if (i < 0 || !l.fr[i]) throw new Error(`olive-templates.json ${list} has no "${en}" in both languages`);
  return { en, fr: l.fr[i] };
}

/**
 * The things `read` chooses from, by id: the table's `plot_objects` (the grammar's enum), index-aligned FR/EN. A tulip
 * is told apart by its `color` (IG-006 adds `color: 'red' | 'yellow'` to a tulip thing — brief §4 names no colour; the
 * 2D kit draws every tulip the same until a sprite reads it).
 */
export const OLIVE_OBJECTS: Readonly<Record<string, Bi2>> = {
  red_tulip: listWord('plot_objects', 'red tulip'),
  yellow_tulip: listWord('plot_objects', 'yellow tulip'),
  tulip: listWord('plot_objects', 'tulip'),
  rock: listWord('plot_objects', 'rock'),
  stone: listWord('plot_objects', 'stone'),
  letter: listWord('plot_objects', 'letter'),
  bowl: listWord('plot_objects', 'bowl'),
  egg: listWord('plot_objects', 'egg')
};
export const OLIVE_OBJECT_IDS: ReadonlyArray<string> = Object.keys(OLIVE_OBJECTS);

/**
 * The thing ahead as `is it a…?` sends it — the ENGINE names it from the world, never a slot the child fills (AC3): a
 * thing on the tile ahead (an object id above, or a note/sign), else the tile itself. Every name is a `things_ahead`
 * word, so the shell's slot check passes by construction.
 */
export const OLIVE_AHEAD: Readonly<Record<string, Bi2>> = {
  red_tulip: listWord('things_ahead', 'a red tulip'),
  yellow_tulip: listWord('things_ahead', 'a yellow tulip'),
  tulip: listWord('things_ahead', 'a tulip'),
  rock: listWord('things_ahead', 'a rock'),
  stone: listWord('things_ahead', 'a stone'),
  letter: listWord('things_ahead', 'a letter'),
  bowl: listWord('things_ahead', 'a bowl'),
  egg: listWord('things_ahead', 'an egg'),
  note: listWord('things_ahead', 'a note'),
  sign: listWord('things_ahead', 'a sign'),
  grass: listWord('things_ahead', 'some grass'),
  path: listWord('things_ahead', 'a path'),
  water: listWord('things_ahead', 'some water'),
  tree: listWord('things_ahead', 'a tree'),
  house: listWord('things_ahead', 'a house'),
  postbox: listWord('things_ahead', 'a post box')
};
/** The map's tiles as the thing ahead when nothing stands on them (the legend: G grass, P path, W water, R rock, T tree, H house, F a bed, B the post box). */
export const OLIVE_TILE_AHEAD: Readonly<Record<string, string>> = { G: 'grass', F: 'grass', P: 'path', W: 'water', R: 'rock', T: 'tree', H: 'house', B: 'postbox' };


/** `say-thanks` → `SayThanks`. */
const camel = (id: string) => id.replace(/(^|-)([a-z])/g, (_m, _d, c: string) => c.toUpperCase());

/** The word key for a rung's title, and for a slot's label. */
export const rungWordKey = (id: string) => `rung${camel(id)}`;
export const slotWordKey = (slot: string) => `slot${camel(slot)}`;

/** A shape's word key (the shape words already in CG-002's table, plus `shTwoLines`). */
export const SHAPE_WORD: Readonly<Record<string, string>> = {
  one_word: 'shWord',
  integer: 'shNumber',
  yes_no: 'shYesNo',
  one_of: 'shOneOf',
  list_of_3: 'shList3',
  sentence: 'shSentence',
  blocks: 'shBlocks',
  two_lines: 'shTwoLines'
};

/** A slot refusal's word key (shown inline, before anything is sent). */
export const REASON_WORD: Readonly<Record<string, string>> = {
  'too-long': 'slotTooLong',
  blocklist: 'slotBlocked',
  'not-in-list': 'slotNotOffered',
  'not-offered': 'slotNotOffered',
  'no-typing': 'slotNotOffered',
  'missing-slot': 'slotMissing',
  regex: 'slotBad',
  'control-char': 'slotBad',
  'not-a-string': 'slotBad',
  'unknown-slot': 'slotBad',
  'unknown-rung': 'slotBad',
  'not-in-band': 'slotNotOffered'
};

type Bi = { en: string; fr: string };
const s = (en: string, fr: string): Bi => ({ en, fr });

/**
 * Every NEW string Olive's blocks need, EN and FR. Not in `cg002Content.ts` (lane B owns it this session); the
 * generator spreads `OLIVE_WORDS` into the word table. The shape words, `dialSame`/`dialSurprise` and `oliveCant` are
 * already there and are not repeated (`oliveThinking`/`oliveResting` are HINT lines, not words: the owl row's small tags
 * are new).
 */
export const OLIVE_WORDS: Readonly<Record<string, Bi>> = {
  oliveThinkingTag: s('Olive is thinking', 'Olive réfléchit'),
  oliveRestingTag: s('Olive is resting', 'Olive se repose'),
  oliveProposes: s('Olive suggests these blocks', 'Olive propose ces blocs'),
  oliveAccept: s('Use them', 'Je les prends'),
  oliveDecline: s('No thanks', 'Non merci'),
  dialBetween: s('a little different', 'un peu différent'),
  shTwoLines: s('two lines', 'deux lignes'),
  slotTooLong: s('Too long: 40 letters at most.', 'Trop long : 40 lettres au plus.'),
  slotBlocked: s('Olive can’t use that word.', 'Olive ne peut pas utiliser ce mot.'),
  slotNotOffered: s('Pick a word from the list.', 'Choisis un mot dans la liste.'),
  slotMissing: s('Fill in every slot first.', 'Remplis d’abord toutes les cases.'),
  slotBad: s('Letters, numbers and spaces only.', 'Seulement des lettres, des chiffres et des espaces.'),
  // The three blocks (IG-006, R6), as the palette names them; the five lessons (R7) by the same keys on Skills.
  rungSayThanks: s('say thank you', 'dire merci'),
  rungRead: s('read the note', 'lire le mot'),
  rungIsItA: s('is it a…?', 'est-ce un… ?'),
  rungCountTulips: s('how many tulips?', 'combien de tulipes ?'),
  rungMaths: s('a sum', 'une addition'),
  rungNoLetterE: s('without the letter e', 'sans la lettre e'),
  rungTallTales: s('ask a question', 'poser une question'),
  rungTranslate: s('translate', 'traduire'),
  // The slots, as the picker names them (a slot the engine fills — the note, the thing ahead — is never in a picker).
  slotTo: s('to whom', 'à qui'),
  slotDeed: s('what Pip did', 'ce que Pip a fait'),
  slotThing: s('what', 'quoi'),
  slotKind: s('is it', 'est-ce'),
  slotList: s('the flowers', 'les fleurs'),
  slotA: s('first number', 'premier nombre'),
  slotB: s('second number', 'deuxième nombre'),
  slotQuestion: s('the question', 'la question'),
  slotNote: s('the note', 'le mot'),
  // IG-006 AC3: is it a…? asked once, or three times and counted.
  slotTimes: s('how many asks', 'combien de fois'),
  timesOnce: s('ask once', 'demander une fois'),
  timesThree: s('ask 3 times', 'demander 3 fois'),
  // IG-006 AC2/AC3: what Olive answered, on the robot, in the olive bubble ({x} her word, {n} of {of} the vote).
  oliveReadSay: s('Olive read: {x}', 'Olive a lu : {x}'),
  oliveSaysBubble: s('Olive: {x}', 'Olive : {x}'),
  oliveVote: s('{n} of {of} said {x}', '{n} sur {of} ont dit {x}'),
  oliveVote1: s('{n} of {of} said {x}', '{n} sur {of} a dit {x}'),
  // IG-006 AC2: the sensor the picker offers once `read` is in the palette — one value per thing she can read.
  sOliveReadX: s('Olive read “{x}”', 'Olive a lu « {x} »')
};

export const OLIVE_WORD_KEYS: ReadonlyArray<string> = Object.keys(OLIVE_WORDS);

/** The bubbles an Olive block puts on the robot (words the page's table also carries, OLIVE_WORDS). */
const OLIVE_BUBBLE_WORDS = ['oliveReadSay', 'oliveSaysBubble', 'oliveVote', 'oliveVote1'] as const;

/**
 * The engine's half of the three blocks (spliced into `cg002Scripts.ts` ENGINE): what `read` sends (the note on the plot,
 * the things on it), what `is it a…?` sends (the thing ahead, named by the engine), the vote, and the bubble. Pure: the
 * world and the run in, words out. No backtick, no dollar-brace.
 */
export const OLIVE_ENGINE = `
var OLIVE_OBJECT = ${JSON.stringify(OLIVE_OBJECTS)};
var OLIVE_AHEAD = ${JSON.stringify(OLIVE_AHEAD)};
var OLIVE_TILE_AHEAD = ${JSON.stringify(OLIVE_TILE_AHEAD)};
var OLIVE_BUBBLE = ${JSON.stringify(Object.fromEntries(OLIVE_BUBBLE_WORDS.map((k) => [k, OLIVE_WORDS[k]])))};
var OLIVE_YES = { yes: 1, oui: 1, 'true': 1 };
var OLIVE_NOTES = ${JSON.stringify(OLIVE_TABLE.lists.notes_read)};
var OLIVE_SLOT_LISTS = ${JSON.stringify(
  Object.fromEntries(
    OLIVE_BLOCK_IDS.map((id) => [id, Object.fromEntries(Object.entries((OLIVE_TABLE.rungs[id] as Rung).slots).filter(([, spec]) => spec.list).map(([slot, spec]) => [slot, OLIVE_TABLE.lists[spec.list]]))])
  )
)};
function oliveL(lang) { return String(lang) === 'fr' ? 'fr' : 'en'; }
function oliveFill(t, vars) { var out = String(t || ''); for (var k in vars) out = out.split('{' + k + '}').join(String(vars[k])); return out; }
/** A thing as read's object id: a tulip by its colour, the rest by kind; '' for a thing she does not name. */
function oliveObjectOf(t) {
  if (!t || typeof t !== 'object') return '';
  if (t.kind === 'tulip') return t.color === 'red' ? 'red_tulip' : t.color === 'yellow' ? 'yellow_tulip' : 'tulip';
  return OLIVE_OBJECT[t.kind] ? String(t.kind) : '';
}
/** A note's text in the run's language: the table's notes are index-aligned, so either language's text finds its twin. */
function oliveNoteIn(text, lang) {
  var L = oliveL(lang), t = String(text || '');
  for (var k in OLIVE_NOTES) { var i = OLIVE_NOTES[k].indexOf(t); if (i !== -1) return OLIVE_NOTES[L][i] || t; }
  return t;
}
/** The note read reads: the note or sign on the tile ahead, else the first on the plot; '' when there is none. */
function oliveNoteOf(w, r, lang) {
  var f = r ? front(r) : null, first = null;
  for (var i = 0; i < w.things.length; i++) {
    var t = w.things[i];
    if (!t || (t.kind !== 'note' && t.kind !== 'sign')) continue;
    if (f && t.x === f.x && t.y === f.y) return oliveNoteIn(t.text, lang);
    if (first === null) first = t.text;
  }
  return first === null ? '' : oliveNoteIn(first, lang);
}
/** The things on the plot read chooses from, in the world's order, each once, in the language. */
function oliveObjectsOf(w, lang) {
  var seen = {}, out = [], L = oliveL(lang);
  for (var i = 0; i < w.things.length; i++) { var id = oliveObjectOf(w.things[i]); if (id && !seen[id]) { seen[id] = 1; out.push(OLIVE_OBJECT[id][L]); } }
  return out;
}
/** The thing ahead, named: a thing on the tile ahead (not a puddle), else the tile. */
function oliveAheadOf(w, r, lang) {
  var L = oliveL(lang);
  if (!r) return OLIVE_AHEAD.grass[L];
  var f = front(r), th = thingsAt(w, f.x, f.y);
  for (var i = 0; i < th.length; i++) {
    var id = th[i].kind === 'note' || th[i].kind === 'sign' ? th[i].kind : oliveObjectOf(th[i]);
    if (id && OLIVE_AHEAD[id]) return OLIVE_AHEAD[id][L];
  }
  var tile = OLIVE_TILE_AHEAD[tileAt(w, f.x, f.y)] || 'grass';
  return OLIVE_AHEAD[tile][L];
}
/** Her word back to read's object id (either language), for the olive_read sensor. */
function oliveObjectId(v) {
  var got = String(v === undefined || v === null ? '' : v).trim().toLowerCase();
  for (var id in OLIVE_OBJECT) if (OLIVE_OBJECT[id].en.toLowerCase() === got || OLIVE_OBJECT[id].fr.toLowerCase() === got) return id;
  return '';
}
/**
 * A list word in the run's language: a block keeps the word it was given in the language it was placed in; the lists
 * are index-aligned, so "a flower" is sent as "une fleur" when the run is French (else the shell refuses it).
 */
function oliveInLang(rung, slot, v, lang) {
  var lists = OLIVE_SLOT_LISTS[rung], l = lists ? lists[slot] : null, L = oliveL(lang);
  if (!l || typeof v !== 'string') return v;
  for (var k in l) { var i = l[k].indexOf(v); if (i !== -1) return l[L][i] || v; }
  return v;
}
/** The slots and options the engine sends for an Olive step: the block's own, plus what only the world knows. */
function oliveRequestOf(s, w, run) {
  var args = clone(s.args) || {}, options = s.options || null, r = robotOf(w, run.robotId);
  if (!Array.isArray(args)) for (var slot in args) args[slot] = oliveInLang(s.rung, slot, args[slot], run.lang);
  if (s.rung === 'read' && !Array.isArray(args)) { args.note = oliveNoteOf(w, r, run.lang); options = oliveObjectsOf(w, run.lang); }
  if (s.rung === 'is-it-a' && !Array.isArray(args)) args.thing = oliveAheadOf(w, r, run.lang);
  return { slots: args, options: options };
}
/**
 * An answer to an Olive step, before the run moves on. The vote (is it a…? asked 3 times): each answer is one vote; until
 * the last, the step asks again ('again'); then the majority is the answer if Olive says yes reads, with the count on the
 * robot. read: the object she named (for if Olive read), "Olive read: …" on the robot. is it a…? once: "Olive: yes".
 */
function oliveAnswered(run, s, a) {
  var L = oliveL(run.lang), out = { again: false, say: '' };
  var v = a.value !== undefined && a.value !== null ? a.value : a.text;
  if (s.rung === 'is-it-a' && s.times > 1) {
    var here = run.steps[run.pc];
    if (!Array.isArray(here.votes)) here.votes = [];
    here.votes.push(OLIVE_YES[String(v === undefined || v === null ? '' : v).trim().toLowerCase()] ? 1 : 0);
    if (here.votes.length < s.times) { out.again = true; out.vote = { yes: sumOf(here.votes), of: here.votes.length, times: s.times }; return out; }
    var yes = sumOf(here.votes), word = L === 'fr' ? 'oui' : 'yes';
    run.lastAnswer.value = yes * 2 > s.times ? word : L === 'fr' ? 'non' : 'no';
    run.lastAnswer.vote = { yes: yes, of: s.times };
    out.vote = { yes: yes, of: s.times, times: s.times };
    out.say = oliveFill(OLIVE_BUBBLE[yes === 1 ? 'oliveVote1' : 'oliveVote'][L], { n: yes, of: s.times, x: word });
    here.votes = [];
    return out;
  }
  // A thank-you Olive wrote is a thing the robot SAID (a request's said goal counts it, like the say block).
  if (s.rung === 'say-thanks') run.said = (Number(run.said) || 0) + 1;
  if (s.rung === 'read') run.lastAnswer.object = '';
  if (v === undefined || v === null || String(v) === '') return out;
  if (s.rung === 'read') { run.lastAnswer.object = oliveObjectId(v); out.say = oliveFill(OLIVE_BUBBLE.oliveReadSay[L], { x: String(v) }); }
  else if (s.rung === 'is-it-a') out.say = oliveFill(OLIVE_BUBBLE.oliveSaysBubble[L], { x: String(v) });
  return out;
}
function sumOf(list) { var n = 0; for (var i = 0; i < list.length; i++) n += Number(list[i]) || 0; return n; }
`;

// ── The helpers every Olive script carries ──────────────────────────────────

const src = (fn: (...a: any[]) => unknown) => Function.prototype.toString.call(fn);

/**
 * The shell's own slot rules and written answers, by SOURCE, plus the page's band and request rules. Plain JS text,
 * spliced into each script; no backtick and no dollar-brace (the TPL-007 rule), asserted by the gate.
 */
export const OLIVE_HELPERS = [
  `var OLIVE = ${JSON.stringify(OLIVE_SLIM)};`,
  `var OLIVE_TIMEOUT_MS = ${OLIVE_TIMEOUT_MS};`,
  `var OLIVE_URL = ${JSON.stringify(OLIVE_URL)};`,
  `var OLIVE_HEADER = ${JSON.stringify(OLIVE_HEADER)};`,
  `var OLIVE_ORDER = ${JSON.stringify(PALETTE_RUNG_IDS)};`,
  `var OLIVE_BLOCK_WORD = ${JSON.stringify(BLOCK_WORD)};`,
  `var OLIVE_REASON_WORD = ${JSON.stringify(REASON_WORD)};`,
  `var OLIVE_RUNG_WORD = ${JSON.stringify(Object.fromEntries(PALETTE_RUNG_IDS.map((id) => [id, rungWordKey(id)])))};`,
  `var OLIVE_SLOT_WORD = ${JSON.stringify(Object.fromEntries([...new Set(Object.values(OLIVE_SLIM.rungs).flatMap((r) => Object.keys(r.slots)))].map((k) => [k, slotWordKey(k)])))};`,
  `var OLIVE_SHAPE_WORD = ${JSON.stringify(SHAPE_WORD)};`,
  `var OLIVE_RESERVED = { rung: 1, args: 1, shape: 1, dial: 1, options: 1, times: 1 };`,
  `var OLIVE_PREFIX = ${JSON.stringify(OLIVE_PREFIX)};`,
  `var TEXT_MAX = ${oliveCheck.TEXT_MAX};`,
  `var BLOCKLIST = ${JSON.stringify(oliveCheck.BLOCKLIST)};`,
  `var CONTROL = ${String(oliveCheck.CONTROL)};`,
  src(oliveCheck.fold),
  src(oliveCheck.words),
  src(oliveCheck.blocked),
  src(oliveCheck.checkSlots),
  src(oliveWritten.writtenAnswer),
  `
function oliveListOf(name, lang) { var l = OLIVE.lists[name]; return l ? (l[lang === 'en' ? 'en' : 'fr'] || []) : []; }
/** The request's narrowing for one rung's slot: { rung: { slot: [values] } } → the values, or null (no narrowing). */
function oliveNarrowOf(narrow, rung, slot) {
  var byRung = narrow && typeof narrow === 'object' ? narrow[rung] : null;
  var only = byRung && typeof byRung === 'object' ? byRung[slot] : null;
  return Array.isArray(only) ? only.map(String) : null;
}
/** The slot values a block carries, without the ask block's own keys. */
function oliveSlotValues(slots) {
  var out = {};
  if (!slots || typeof slots !== 'object' || Array.isArray(slots)) return out;
  for (var k in slots) if (!OLIVE_RESERVED[k]) out[k] = slots[k];
  return out;
}
/**
 * May these slots be sent? The page's rules first (the rung's band; the request's narrowed list; band 7-9 never
 * types, so a text slot holds one of its suggested words), then the SHELL'S rules, by the shell's own function.
 */
function oliveCheckForBand(rung, slots, band, lang, narrow) {
  var r = OLIVE.rungs[String(rung)];
  if (!r) return { ok: false, reason: 'unknown-rung' };
  if ((Number(r.band) || 1) > band) return { ok: false, reason: 'not-in-band' };
  var given = oliveSlotValues(slots);
  for (var name in r.slots) {
    var spec = r.slots[name], val = given[name];
    if (val === undefined || val === null || val === '') continue;
    var only = oliveNarrowOf(narrow, String(rung), name);
    if (only && only.indexOf(String(val)) === -1) return { ok: false, reason: 'not-offered', slot: name };
    if (band === 1 && spec.text && String(rung) !== 'voice-hint') {
      var sug = spec.suggest ? oliveListOf(spec.suggest, lang) : [];
      if (sug.indexOf(String(val)) === -1) return { ok: false, reason: 'no-typing', slot: name };
    }
  }
  return checkSlots(OLIVE, String(rung), given, lang);
}
/** The picker the kit draws for a rung's slots: options from the list (narrowed by the request), a text field in band 10-12 only. */
function olivePickerSlots(rung, band, lang, narrow, word) {
  var r = OLIVE.rungs[String(rung)], out = [];
  if (!r || String(rung) === 'voice-hint') return out;
  for (var name in r.slots) {
    var spec = r.slots[name];
    // IG-006: a slot the ENGINE fills (the note on the plot, the thing ahead) is never the child's to pick.
    if (spec.engine) continue;
    var entry = { key: name, label: word[OLIVE_SLOT_WORD[name]] || name, options: [] };
    var pool = spec.list ? oliveListOf(spec.list, lang) : spec.suggest ? oliveListOf(spec.suggest, lang) : spec.regex ? ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'] : [];
    var only = oliveNarrowOf(narrow, String(rung), name);
    for (var i = 0; i < pool.length; i++) if (!only || only.indexOf(pool[i]) !== -1) entry.options.push({ value: pool[i], label: pool[i] });
    if (band === 2 && (spec.text || spec.regex)) { entry.text = true; entry.max = spec.text ? TEXT_MAX : 2; }
    out.push(entry);
  }
  // IG-006 AC3: is it a…? asks once, or three times and takes the majority (an engine option, never sent as a slot).
  if (String(rung) === 'is-it-a') out.push({ key: 'times', label: word.slotTimes || 'times', options: [{ value: '1', label: word.timesOnce || '1' }, { value: '3', label: word.timesThree || '3' }] });
  return out;
}
/** The block's own slots with the engine's slots stood in (their list's first word), to judge only what the child picks. */
function oliveBlockSlots(rung, slots, lang) {
  var r = OLIVE.rungs[String(rung)], out = oliveSlotValues(slots);
  if (!r) return out;
  for (var name in r.slots) if (r.slots[name].engine && (out[name] === undefined || out[name] === '')) out[name] = oliveListOf(r.slots[name].list, lang)[0] || '';
  return out;
}
/** The exam gate: the rungs this machine's exam FAILED (an ungraded rung is not withheld). */
function oliveWithheld(exam) {
  var out = [], rungs = exam && exam.rungs && typeof exam.rungs === 'object' ? exam.rungs : {};
  for (var id in rungs) if (rungs[id] && rungs[id].pass === false) out.push(id);
  return out.sort();
}
/**
 * The page's own copy of the shell's rule (olive-check.js, reason unfaithful, 2026-09-28): a voiced hint is the game's
 * hint in other words, or it is not shown. It keeps the written line's question, the robot's name, and plain text. The
 * shell refuses such a voicing first; this is for a shell that let one through (an older one), like the blocklist here.
 */
function oliveFaithful(text, written, name) {
  var out = String(text || ''), line = String(written || ''), who = String(name || '');
  if (/\\*\\*|__|^#|\\x60/m.test(out)) return false;
  if (line.indexOf('?') !== -1 && out.indexOf('?') === -1) return false;
  if (who && fold(line).indexOf(fold(who)) !== -1 && fold(out).indexOf(fold(who)) === -1) return false;
  return true;
}
/** Every ask block of a program, depth first: { id, rung, slots }. */
function oliveAskBlocks(list, out) {
  var l = Array.isArray(list) ? list : [];
  for (var i = 0; i < l.length; i++) {
    var b = l[i];
    if (!b) continue;
    if (typeof b.t === 'string' && b.t.indexOf(OLIVE_PREFIX) === 0) out.push({ id: b.id, rung: b.t.slice(OLIVE_PREFIX.length), slots: b.slots && typeof b.slots === 'object' ? b.slots : {} });
    if (Array.isArray(b.body)) oliveAskBlocks(b.body, out);
  }
  return out;
}
function oliveWords(rows, lang) {
  var word = {};
  var list = Array.isArray(rows) ? rows : [];
  for (var i = 0; i < list.length; i++) if (list[i] && list[i].key) word[list[i].key] = String(list[i][lang] || list[i].en || '');
  return word;
}
`
].join('\n');

// ── Ask Olive: the one script that talks to the shell ──────────────────────

/**
 * The parked request (`Logic/Step`'s `request`) → the answer `Logic/Step` resumes on. Validates BEFORE sending (a
 * refused slot is never sent: `sent` false, the written answer at once); POSTs to the shell with its header; gives up
 * after the shell's own timeout; on any failure (no model, a refusal, the timeout, no shell at all) answers with the
 * rung's WRITTEN answer and `fallback: true`, so the program still runs and the owl row can say Olive is resting.
 * Every answer carries the request's `seq` and the run's `runId` (`run`): a reply that arrives after the run was reset
 * is dropped by the step (the abandoned arm). A `voice-hint` answer also carries the hint `key` it voices.
 *
 * Async (the Function node awaits it and fires `Success` when it is done). `Inputs.url` / `Inputs.timeoutMs` exist for
 * a drive; the page leaves them unset.
 */
export const ASK_OLIVE_SCRIPT = `${OLIVE_HELPERS}
var req = Inputs.request && typeof Inputs.request === 'object' ? Inputs.request : null;
if (req) {
  var run = Inputs.run && typeof Inputs.run === 'object' ? Inputs.run : null;
  var lang = String(req.lang) === 'en' ? 'en' : 'fr';
  var band = Number(Inputs.band) === 1 ? 1 : 2;
  var rung = String(req.rung);
  var slots = oliveSlotValues(req.slots);
  var check = oliveCheckForBand(rung, slots, band, lang, Inputs.narrow);
  var t0 = Date.now();
  var reply = null, sent = false;
  if (check.ok) {
    sent = true;
    var body = { rung: rung, slots: check.values, lang: lang };
    if (req.shape) body.shape = String(req.shape);
    if (typeof req.temperature === 'number') body.temperature = req.temperature;
    if (Array.isArray(req.options)) body.options = req.options;
    var limit = Number(Inputs.timeoutMs) > 0 ? Number(Inputs.timeoutMs) : OLIVE_TIMEOUT_MS;
    var timer = null;
    var late = new Promise(function (resolve) { timer = setTimeout(function () { resolve({ ok: false, fallback: true, reason: 'timeout' }); }, limit); });
    var call;
    try {
      var headers = { 'content-type': 'application/json' };
      headers[OLIVE_HEADER] = '1';
      call = fetch(String(Inputs.url || OLIVE_URL), { method: 'POST', headers: headers, body: JSON.stringify(body) }).then(function (r) {
        if (!r || !r.ok) return { ok: false, fallback: true, reason: 'http-' + (r ? r.status : 0) };
        return r.json().then(function (j) { return j && typeof j === 'object' ? j : { ok: false, fallback: true, reason: 'bad-json' }; }, function () { return { ok: false, fallback: true, reason: 'bad-json' }; });
      }, function () { return { ok: false, fallback: true, reason: 'no-shell' }; });
    } catch (e) {
      call = Promise.resolve({ ok: false, fallback: true, reason: 'no-shell' });
    }
    reply = await Promise.race([call, late]);
    clearTimeout(timer);
  } else {
    reply = { ok: false, fallback: true, reason: check.reason, slot: check.slot };
  }
  var out = { seq: req.seq, run: run && run.runId ? String(run.runId) : req.run === undefined ? null : req.run, rung: rung, lang: lang, sent: sent, ms: Date.now() - t0 };
  if (rung === 'voice-hint') out.key = String(slots.key || '');
  if (reply && reply.ok === true && (reply.value !== undefined || typeof reply.text === 'string')) {
    out.ok = true;
    out.fallback = false;
    if (reply.value !== undefined) out.value = reply.value; else out.text = reply.text;
  } else {
    out.ok = false;
    out.fallback = true;
    out.reason = String((reply && reply.reason) || 'fallback');
    if (reply && reply.slot) out.slot = String(reply.slot);
    var w = writtenAnswer(OLIVE, rung, check.ok ? check.values : slots, lang);
    if (w) { if (w.value !== undefined) out.value = w.value; else out.text = w.text; }
  }
  Outputs.answer = out;
  Outputs.sent = sent;
  Outputs.fallback = out.fallback;
  Outputs.refused = check.ok ? '' : String(check.reason);
  Outputs.refusedSlot = check.ok ? '' : String(check.slot || '');
}
`;

// ── Olive slots: the picker, and the inline refusal ────────────────────────

/**
 * For one Olive block: the picker entries the kit draws (`{key, label, options, text?, max?}`), and whether the slots
 * filled so far may be sent — the reason and its words when not, shown inline before anything is sent (AC6).
 *
 * On the page (CG-005 s3) the block is found in the PROGRAM: the ask block the child has selected, else the first ask
 * block whose slots would be refused, else the first ask block. `blockId` names it; `show` says the line is up (a
 * program with no ask block, or with every ask block sendable, shows nothing). `rung` + `slots` still judge one block
 * when no program is given.
 */
export const OLIVE_SLOTS_SCRIPT = `${OLIVE_HELPERS}
var lang = String(Inputs.lang) === 'en' ? 'en' : 'fr';
var band = Number(Inputs.band) === 1 ? 1 : 2;
var slots = Inputs.slots && typeof Inputs.slots === 'object' ? Inputs.slots : {};
var rung = String(Inputs.rung || slots.rung || '');
var blockId = '';
var prog = Inputs.program;
if (typeof prog === 'string' && prog) { try { prog = JSON.parse(prog); } catch (e) { prog = null; } }
if (Array.isArray(prog)) {
  var asks = oliveAskBlocks(prog, []), pick = null, sel = Inputs.selected === undefined || Inputs.selected === null ? '' : String(Inputs.selected);
  for (var a = 0; a < asks.length && !pick; a++) if (sel !== '' && String(asks[a].id) === sel) pick = asks[a];
  for (var f = 0; f < asks.length && !pick; f++) if (!oliveCheckForBand(asks[f].rung, oliveBlockSlots(asks[f].rung, asks[f].slots, lang), band, lang, Inputs.narrow).ok) pick = asks[f];
  if (!pick && asks.length) pick = asks[0];
  rung = pick ? pick.rung : '';
  slots = pick ? pick.slots : {};
  blockId = pick ? String(pick.id) : '';
}
if (rung.indexOf(OLIVE_PREFIX) === 0) rung = rung.slice(OLIVE_PREFIX.length);
var word = oliveWords(Inputs.words, lang);
var c = rung ? oliveCheckForBand(rung, oliveBlockSlots(rung, slots, lang), band, lang, Inputs.narrow) : { ok: true };
Outputs.slots = olivePickerSlots(rung, band, lang, Inputs.narrow, word);
Outputs.ok = c.ok;
Outputs.reason = c.ok ? '' : String(c.reason);
Outputs.slot = c.ok ? '' : String(c.slot || '');
Outputs.message = c.ok ? '' : word[OLIVE_REASON_WORD[c.reason]] || String(c.reason);
Outputs.show = !c.ok;
Outputs.blockId = blockId;
`;

// ── The owl row ─────────────────────────────────────────────────────────────

/**
 * The owl row under the world. The written hint line shows at once; Olive's voiced line replaces it ONLY when it
 * answers THIS voice request (its `seq` is the request's signature: the same key, the same numbers, the same robot,
 * the same language), is clean here too (the blocklist) and is still the hint (the shell's `unfaithful` rule, mirrored)
 * — otherwise it is dropped silently (AC3). "Thinking" (dots, no clock) while a run is parked on Olive or while the
 * current voicing is out (TPL-012: on the tablet a hint takes 5–10 s); "Olive is resting" when the last answer the
 * program used was a fallback and nothing is out (AC2, AC4).
 *
 * `voiceRequest` is the request that voices the current key (null for a key Olive may not voice); `voiceSig` is its
 * signature as TEXT, so `Logic/Voice hint` — fed that text alone — fires once per new line and never on its own answer.
 */
export const OWL_ROW_SCRIPT = `${OLIVE_HELPERS}
var lang = String(Inputs.lang) === 'en' ? 'en' : 'fr';
var word = oliveWords(Inputs.words, lang);
var key = String(Inputs.hintKey || '');
var written = String(Inputs.written || '');
var name = String(Inputs.botName || 'Pip');
var keys = oliveListOf('hintKeys', lang);
var vars = Inputs.vars && typeof Inputs.vars === 'object' ? Inputs.vars : {};
var voiceSlots = { key: key, b: name };
if (vars.n !== undefined && vars.n !== null && vars.n !== '') voiceSlots.n = String(vars.n);
if (vars.w !== undefined && vars.w !== null && vars.w !== '') voiceSlots.w = String(vars.w);
if (vars.t !== undefined && vars.t !== null && vars.t !== '') voiceSlots.t = String(vars.t);
var voiceable = key !== '' && keys.indexOf(key) !== -1;
var sig = voiceable ? JSON.stringify({ rung: 'voice-hint', slots: voiceSlots, lang: lang }) : '';
var v = Inputs.voiced && typeof Inputs.voiced === 'object' ? Inputs.voiced : null;
var mine = !!v && sig !== '' && String(v.seq) === sig;
var vText = v && typeof v.text === 'string' ? v.text.trim() : '';
var useVoiced = mine && v.ok === true && v.rung === 'voice-hint' && String(v.key) === key && (v.lang === undefined || v.lang === lang) && vText !== '' && !blocked(vText, lang) && oliveFaithful(vText, written, name);
var a = Inputs.answer && typeof Inputs.answer === 'object' ? Inputs.answer : null;
var waiting = Inputs.waiting === true;
var voicing = voiceable && !mine;
var thinking = waiting || voicing;
// Resting is Olive not answering a question that was SENT: a slot the rules refused never left the page (the slot line says why).
var resting = !thinking && !!a && a.fallback === true && a.sent !== false;
Outputs.text = useVoiced ? vText : written;
Outputs.voiced = useVoiced;
Outputs.thinking = thinking;
Outputs.thinkingText = thinking ? word.oliveThinkingTag || '' : '';
Outputs.resting = resting;
Outputs.restingText = resting ? word.oliveRestingTag || '' : '';
Outputs.voiceRequest = voiceable ? { rung: 'voice-hint', slots: voiceSlots, lang: lang, seq: sig } : null;
Outputs.voiceSig = sig;
`;

// ── Voice hint: one ask per new line ────────────────────────────────────────

/**
 * The second `Logic/Ask Olive`'s trigger (CG-005 s3). Fed ONLY the owl row's `voiceSig` (text), it runs when the line
 * to voice changes — a new key, new numbers, the robot renamed, the other language — and never on Olive's answer
 * (the answer changes the row, not the signature), so the page asks once per line and cannot loop. `request` is the
 * voice request rebuilt from the signature, stamped with it (`seq`), so the row can tell its own answer from a late one.
 */
export const VOICE_HINT_SCRIPT = `
var sig = typeof Inputs.sig === 'string' ? Inputs.sig : '';
var req = null;
if (sig) { try { req = JSON.parse(sig); } catch (e) { req = null; } }
if (req && typeof req === 'object' && req.rung === 'voice-hint') req.seq = sig; else req = null;
Outputs.request = req;
Outputs.due = !!req;
`;

// ── The proposal card ───────────────────────────────────────────────────────

/**
 * "Olive suggests these blocks — Use them / No thanks" (CG-005 s3, AC1). A `blocks` answer is latched in the RUN
 * (`run.proposal`: the Step publishes it on one tick only). The card shows while that proposal is for an ask block still
 * in the program and the child has not answered it (`handled` is the signature of the last one she answered: the run,
 * the ask, the blocks). A new run that proposes again shows it again; Start over (the ask gone) hides it. Nothing here
 * writes the program: `Logic/Accept proposal`, on "Use them" only, does.
 */
export const PROPOSAL_CARD_SCRIPT = `${OLIVE_HELPERS}
var lang = String(Inputs.lang) === 'en' ? 'en' : 'fr';
var word = oliveWords(Inputs.words, lang);
var LABEL = { fwd: 'bFwd', left: 'bLeft', right: 'bRight', water: 'bWater' };
var run = Inputs.run && typeof Inputs.run === 'object' ? Inputs.run : null;
var p = run && run.proposal && typeof run.proposal === 'object' && Array.isArray(run.proposal.blocks) ? run.proposal : null;
var prog = Inputs.program;
if (typeof prog === 'string' && prog) { try { prog = JSON.parse(prog); } catch (e) { prog = []; } }
var asks = oliveAskBlocks(Array.isArray(prog) ? prog : [], []);
var here = false;
for (var i = 0; p && i < asks.length; i++) if (String(asks[i].id) === String(p.askId)) here = true;
var sig = p ? String(run.runId || '') + '|' + String(p.askId) + '|' + p.blocks.join(',') : '';
var names = [];
for (var j = 0; p && j < p.blocks.length; j++) names.push(word[LABEL[p.blocks[j]]] || String(p.blocks[j]));
var show = !!p && p.blocks.length > 0 && here && sig !== String(Inputs.handled || '');
Outputs.show = show;
// The proposal itself does not depend on the answer: "Use them" marks it answered AFTER Accept proposal has placed it.
Outputs.proposal = p && here ? { askId: p.askId, blocks: p.blocks.slice() } : null;
Outputs.blocksText = show ? names.join(' · ') : '';
Outputs.sig = sig;
`;

// ── Accept a proposal ───────────────────────────────────────────────────────

/**
 * Olive's `blocks` answer is a PROPOSAL (the step never splices it into the run). The child's "Use them" places the
 * proposed blocks right after the ask that proposed them, with fresh ids; "No thanks" (or no press) changes nothing.
 */
export const ACCEPT_PROPOSAL_SCRIPT = `
var KNOWN = { fwd: 1, left: 1, right: 1, water: 1 };
function oliveMaxId(list, m) { for (var i = 0; i < list.length; i++) { var b = list[i]; if (!b) continue; if (Number(b.id) > m) m = Number(b.id); if (b.body) m = oliveMaxId(b.body, m); } return m; }
function oliveHostOf(list, id) { for (var i = 0; i < list.length; i++) { var b = list[i]; if (!b) continue; if (String(b.id) === String(id)) return { list: list, at: i }; if (b.body) { var f = oliveHostOf(b.body, id); if (f) return f; } } return null; }
var program = JSON.parse(JSON.stringify(Array.isArray(Inputs.program) ? Inputs.program : []));
var p = Inputs.proposal && typeof Inputs.proposal === 'object' ? Inputs.proposal : null;
var added = 0;
if (Inputs.accept === true && p && Array.isArray(p.blocks)) {
  var next = oliveMaxId(program, 0) + 1, blocks = [];
  for (var i = 0; i < p.blocks.length; i++) if (KNOWN[p.blocks[i]]) blocks.push({ id: next++, t: String(p.blocks[i]) });
  var host = p.askId === undefined || p.askId === null ? null : oliveHostOf(program, p.askId);
  if (host) host.list.splice.apply(host.list, [host.at + 1, 0].concat(blocks));
  else program = program.concat(blocks);
  added = blocks.length;
}
Outputs.program = program;
Outputs.added = added;
Outputs.accepted = added > 0;
`;

/** Every Olive script the template ships, by the logic component that holds it (the generator spreads it beside FUNCTION_SCRIPTS). */
export const OLIVE_SCRIPTS: ReadonlyArray<{ component: string; script: string; seam: string; async?: boolean }> = [
  { component: 'Logic/Ask Olive', script: ASK_OLIVE_SCRIPT, seam: 'the parked request sent to Olive, or its written answer; never a slot the rules refuse', async: true },
  { component: 'Logic/Olive slots', script: OLIVE_SLOTS_SCRIPT, seam: 'the picker for an ask block in a band, and the inline refusal' },
  { component: 'Logic/Owl row', script: OWL_ROW_SCRIPT, seam: 'the written hint, voiced only for the same key; thinking; resting' },
  { component: 'Logic/Accept proposal', script: ACCEPT_PROPOSAL_SCRIPT, seam: 'the blocks Olive proposed, placed only when the child accepts' },
  { component: 'Logic/Voice hint', script: VOICE_HINT_SCRIPT, seam: 'the voice request for a new hint line, once per line' },
  { component: 'Logic/Proposal card', script: PROPOSAL_CARD_SCRIPT, seam: 'the blocks Olive proposed, offered until the child answers' }
];

/**
 * Run an Olive script the way the Function node does — compiled as an ASYNC function over `Inputs`, `Outputs` — with
 * `fetch` (and the timers) injected for the gate. The runtime passes the global ones.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function runOliveScript(script: string, inputs: Record<string, unknown>, env: { fetch?: (...a: any[]) => Promise<any> } = {}): Promise<Record<string, any>> {
  const outputs: Record<string, any> = {};
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  const noFetch = () => Promise.reject(new Error('no fetch in this gate'));
  const fn = new AsyncFunction('Inputs', 'Outputs', 'fetch', script);
  await fn(inputs, outputs, env.fetch || noFetch);
  return outputs;
}
