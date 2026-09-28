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

type Rung = { n: number; band?: number; ladder: 'pass' | 'fail'; shape: string; temperature: number; slots: Record<string, any>; options?: string };

/** The rungs, in ladder order (n, then the table's order). `voice-hint` (n 0) is the hint voicing, never a palette block. */
export const OLIVE_RUNG_IDS: ReadonlyArray<string> = Object.keys(OLIVE_TABLE.rungs)
  .map((id, i) => ({ id, i, n: (OLIVE_TABLE.rungs[id] as Rung).n }))
  .sort((a, b) => a.n - b.n || a.i - b.i)
  .map((r) => r.id);

/** The rungs a child may place (every rung but the hint voicing). */
export const PALETTE_RUNG_IDS: ReadonlyArray<string> = OLIVE_RUNG_IDS.filter((id) => id !== 'voice-hint');

/** What the page's scripts carry of the table: no prompt text ever reaches the page. */
export const OLIVE_SLIM = {
  rungs: Object.fromEntries(
    Object.entries(OLIVE_TABLE.rungs as Record<string, Rung>).map(([id, r]) => [
      id,
      { n: r.n, band: r.band || 1, ladder: r.ladder, shape: r.shape, temperature: r.temperature, slots: r.slots, ...(r.options ? { options: r.options } : {}) }
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

/** The block `t` of a rung's palette entry: `ask:<rung>`. The engine reads the rung from it when `slots.rung` is unset. */
export const askType = (rung: string) => `ask:${rung}`;

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
  // The rungs (TPL-012 §2.6), as the palette names them.
  rungSayThanks: s('say thank you', 'dire merci'),
  rungNameOne: s('give a name', 'donner un prénom'),
  rungNameThree: s('three names', 'trois noms'),
  rungWordsToBlocks: s('words into blocks', 'des mots en blocs'),
  rungCountInWords: s('count in words', 'compter en mots'),
  rungWhatWants: s('what do they want?', 'que veut-il ?'),
  rungIsItA: s('is it a…?', 'est-ce un… ?'),
  rungCountTulips: s('how many tulips?', 'combien de tulipes ?'),
  rungMathsSeeds: s('add the seeds', 'compter les graines'),
  rungMaths: s('a sum', 'une addition'),
  rungUnderFiveWords: s('in under 5 words', 'en moins de 5 mots'),
  rungTallTales: s('ask a question', 'poser une question'),
  rungTranslate: s('translate', 'traduire'),
  rungPoem: s('a poem', 'un poème'),
  // The slots, as the picker names them.
  slotTo: s('to whom', 'à qui'),
  slotDeed: s('what Pip did', 'ce que Pip a fait'),
  slotThing: s('what', 'quoi'),
  slotRoute: s('the route', 'le chemin'),
  slotLine: s('what they said', 'ce qu’on a dit'),
  slotKind: s('is it', 'est-ce'),
  slotList: s('the flowers', 'les fleurs'),
  slotA: s('first number', 'premier nombre'),
  slotB: s('second number', 'deuxième nombre'),
  slotQuestion: s('the question', 'la question'),
  slotNote: s('the note', 'le mot'),
  slotFlower: s('the tulip’s name', 'le nom de la tulipe')
};

export const OLIVE_WORD_KEYS: ReadonlyArray<string> = Object.keys(OLIVE_WORDS);

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
  `var OLIVE_RESERVED = { rung: 1, args: 1, shape: 1, dial: 1, options: 1 };`,
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
    var entry = { key: name, label: word[OLIVE_SLOT_WORD[name]] || name, options: [] };
    var pool = spec.list ? oliveListOf(spec.list, lang) : spec.suggest ? oliveListOf(spec.suggest, lang) : spec.regex ? ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'] : [];
    var only = oliveNarrowOf(narrow, String(rung), name);
    for (var i = 0; i < pool.length; i++) if (!only || only.indexOf(pool[i]) !== -1) entry.options.push({ value: pool[i], label: pool[i] });
    if (band === 2 && (spec.text || spec.regex)) { entry.text = true; entry.max = spec.text ? TEXT_MAX : 2; }
    out.push(entry);
  }
  return out;
}
/** The exam gate: the rungs this machine's exam FAILED (an ungraded rung is not withheld). */
function oliveWithheld(exam) {
  var out = [], rungs = exam && exam.rungs && typeof exam.rungs === 'object' ? exam.rungs : {};
  for (var id in rungs) if (rungs[id] && rungs[id].pass === false) out.push(id);
  return out.sort();
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
 * For one `ask` block: the picker entries the kit draws (`{key, label, options, text?, max?}`), and whether the slots
 * filled so far may be sent — the reason and its words when not, shown inline before anything is sent (AC6).
 */
export const OLIVE_SLOTS_SCRIPT = `${OLIVE_HELPERS}
var lang = String(Inputs.lang) === 'en' ? 'en' : 'fr';
var band = Number(Inputs.band) === 1 ? 1 : 2;
var slots = Inputs.slots && typeof Inputs.slots === 'object' ? Inputs.slots : {};
var rung = String(Inputs.rung || slots.rung || '');
if (rung.indexOf('ask:') === 0) rung = rung.slice(4);
var word = oliveWords(Inputs.words, lang);
var c = oliveCheckForBand(rung, slots, band, lang, Inputs.narrow);
Outputs.slots = olivePickerSlots(rung, band, lang, Inputs.narrow, word);
Outputs.ok = c.ok;
Outputs.reason = c.ok ? '' : String(c.reason);
Outputs.slot = c.ok ? '' : String(c.slot || '');
Outputs.message = c.ok ? '' : word[OLIVE_REASON_WORD[c.reason]] || String(c.reason);
`;

// ── The owl row ─────────────────────────────────────────────────────────────

/**
 * The owl row under the world. The written hint line shows at once; Olive's voiced line replaces it ONLY when it
 * voices the SAME key, in the same language, and passes the blocklist here too — otherwise it is dropped silently
 * (AC3). "Thinking" (dots, no clock) while a run is parked on Olive; "Olive is resting" when the last answer the
 * program used was a fallback (AC2, AC4). `voiceRequest` is the request that voices the current key (null for a key
 * Olive may not voice), for a second `Logic/Ask Olive`.
 */
export const OWL_ROW_SCRIPT = `${OLIVE_HELPERS}
var lang = String(Inputs.lang) === 'en' ? 'en' : 'fr';
var word = oliveWords(Inputs.words, lang);
var key = String(Inputs.hintKey || '');
var written = String(Inputs.written || '');
var v = Inputs.voiced && typeof Inputs.voiced === 'object' ? Inputs.voiced : null;
var vText = v && typeof v.text === 'string' ? v.text.trim() : '';
var useVoiced = !!v && v.ok === true && v.rung === 'voice-hint' && key !== '' && String(v.key) === key && (v.lang === undefined || v.lang === lang) && vText !== '' && !blocked(vText, lang);
var a = Inputs.answer && typeof Inputs.answer === 'object' ? Inputs.answer : null;
var waiting = Inputs.waiting === true;
var resting = !waiting && !!a && a.fallback === true;
var keys = oliveListOf('hintKeys', lang);
var vars = Inputs.vars && typeof Inputs.vars === 'object' ? Inputs.vars : {};
var voiceSlots = { key: key, b: String(Inputs.botName || 'Pip') };
if (vars.n !== undefined && vars.n !== null && vars.n !== '') voiceSlots.n = String(vars.n);
if (vars.w !== undefined && vars.w !== null && vars.w !== '') voiceSlots.w = String(vars.w);
Outputs.text = useVoiced ? vText : written;
Outputs.voiced = useVoiced;
Outputs.thinking = waiting;
Outputs.thinkingText = waiting ? word.oliveThinkingTag || '' : '';
Outputs.resting = resting;
Outputs.restingText = resting ? word.oliveRestingTag || '' : '';
Outputs.voiceRequest = keys.indexOf(key) !== -1 ? { rung: 'voice-hint', slots: voiceSlots, lang: lang } : null;
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
  { component: 'Logic/Accept proposal', script: ACCEPT_PROPOSAL_SCRIPT, seam: 'the blocks Olive proposed, placed only when the child accepts' }
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
