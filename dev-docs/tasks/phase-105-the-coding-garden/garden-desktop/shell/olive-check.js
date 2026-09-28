/**
 * Olive's checks (P105 CG-004): what goes IN to the model and what comes OUT of it.
 *
 * In: a request is `{rung, slots, lang, shape, temperature, options?}`. The page never sends prompt text; the
 * shell composes the prompt from `olive-templates.json`. Every slot is validated BEFORE anything reaches the
 * model: a word from the rung's list, or a short regex-checked text (≤ 40 characters, no control characters,
 * not on the blocklist). A refusal names its reason, so a test and the page can tell them apart.
 *
 * Out: the model's answer passes the shape's grammar (parsed here), the cap (one word / 3 items / 25 words /
 * 2 lines / the enum / an integer / ≤ 8 blocks), the FR/EN blocklist and the rung's must-contain list. A refused
 * output is `{ok:false, reason}` and the page shows the written line instead (TPL-012 §2.6: containment comes
 * from construction, not from a system prompt a 0.8B model cannot hold).
 *
 * Plain Node, no dependencies, no Electron: `node --test` runs it.
 */
'use strict';

const TEXT_MAX = 40;
const SENTENCE_WORDS = 25;

// Whole words, case-insensitive, accents folded. `shared` applies to both languages.
const BLOCKLIST = {
  shared: ['merde', 'putain', 'fuck', 'fucking', 'shit', 'bitch', 'bastard', 'asshole', 'cunt', 'wanker', 'slut', 'whore', 'dick', 'crap', 'salope', 'connard', 'connasse', 'salaud', 'pute', 'encule', 'batard', 'nique', 'niquer', 'foutre', 'chier', 'couilles', 'idiot', 'idiote', 'stupid', 'stupide', 'debile', 'imbecile', 'cretin', 'cretine'],
  fr: ['con', 'conne', 'cul', 'bite', 'bordel', 'pd', 'pede'],
  en: ['twat', 'piss', 'cock', 'pussy', 'damn', 'hell']
};

function fold(s) {
  return String(s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

function words(text) {
  return String(text)
    .split(/\s+/)
    .map((w) => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''))
    .filter(Boolean);
}

/** The first listed word found in `text` for `lang`, or null. */
function blocked(text, lang) {
  const list = BLOCKLIST.shared.concat(BLOCKLIST[lang === 'en' ? 'en' : 'fr']);
  const seen = new Set(words(fold(text)));
  for (const w of list) if (seen.has(w)) return w;
  return null;
}

const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

/**
 * Validate the request's slots against the rung's slot table. Returns `{ok:true, values}` or `{ok:false, reason, slot}`.
 * Reasons: unknown-rung, unknown-slot, missing-slot, not-a-string, control-char, too-long, not-in-list, regex, blocklist.
 */
function checkSlots(templates, rungId, slots, lang) {
  const rung = templates.rungs[rungId];
  if (!rung) return { ok: false, reason: 'unknown-rung' };
  const L = lang === 'en' ? 'en' : 'fr';
  const given = slots && typeof slots === 'object' ? slots : {};
  for (const name of Object.keys(given)) if (!rung.slots[name]) return { ok: false, reason: 'unknown-slot', slot: name };
  const values = {};
  for (const [name, spec] of Object.entries(rung.slots)) {
    const v = given[name];
    if (v === undefined || v === null || v === '') {
      if (spec.optional) {
        values[name] = '';
        continue;
      }
      return { ok: false, reason: 'missing-slot', slot: name };
    }
    if (typeof v !== 'string') return { ok: false, reason: 'not-a-string', slot: name };
    if (CONTROL.test(v) || /[\r\n\t]/.test(v)) return { ok: false, reason: 'control-char', slot: name };
    if (spec.list) {
      // A list word is the table's own (a canned sentence may be long); the 40-character rule is for what a child types.
      const list = (templates.lists[spec.list] || {})[L] || [];
      if (!list.includes(v)) return { ok: false, reason: 'not-in-list', slot: name };
    } else if (v.length > TEXT_MAX) {
      return { ok: false, reason: 'too-long', slot: name };
    } else if (spec.regex) {
      if (!new RegExp(spec.regex, 'u').test(v)) return { ok: false, reason: 'regex', slot: name };
    } else if (spec.text) {
      if (!new RegExp(templates.textSlot.regex, 'u').test(v)) return { ok: false, reason: 'regex', slot: name };
      if (blocked(v, L)) return { ok: false, reason: 'blocklist', slot: name };
    } else {
      return { ok: false, reason: 'regex', slot: name };
    }
    values[name] = v;
  }
  return { ok: true, values };
}

function fill(template, values) {
  return String(template).replace(/\{(\w+)\}/g, (m, k) => (k in values ? values[k] : m));
}

/**
 * The prompt for a validated request: `{system, user, shape, temperature, maxTokens, enumValues, mustContain}`.
 * `shape` may only be one the rung allows; `temperature` only one of the table's dial values; `options` (for one_of)
 * only words from the rung's option list.
 */
function compose(templates, rungId, values, { lang, shape, temperature, options } = {}) {
  const rung = templates.rungs[rungId];
  const L = lang === 'en' ? 'en' : 'fr';
  const allowedShapes = rung.shapes || [rung.shape];
  const useShape = shape && allowedShapes.includes(shape) ? shape : allowedShapes[0];
  const temp = typeof temperature === 'number' && templates.temperatures.includes(temperature) ? temperature : rung.temperature;
  const vars = { ...values };
  if (rungId === 'voice-hint') {
    const line = (templates.hints[values.key] || {})[L] || '';
    vars.hint = fill(line, { b: values.b || 'Pip', n: values.n || '3', w: values.w || '0' });
  }
  const sys = typeof rung.system === 'string' ? templates.systems[rung.system][L] : rung.system[L];
  let enumValues = null;
  if (useShape === 'one_of') {
    const pool = (templates.lists[rung.options] || {})[L] || [];
    enumValues = Array.isArray(options) && options.length ? options.filter((o) => pool.includes(o)) : pool;
    if (!enumValues.length) enumValues = pool;
  }
  if (useShape === 'yes_no') enumValues = L === 'en' ? ['yes', 'no'] : ['oui', 'non'];
  if (useShape === 'blocks') enumValues = templates.blocks.slice();
  const cap = Math.min(64, rung.maxTokens || templates.shapes[useShape].maxTokens || 48);
  return {
    system: fill(sys, vars),
    user: fill(rung.user[L], vars),
    shape: useShape,
    temperature: temp,
    maxTokens: cap,
    enumValues,
    mustContain: rung.mustContain ? (rung.mustContain[L] || []).map((m) => fill(m, vars)) : [],
    lang: L,
    // CG-005: the rung and the validated slot values ride along for the stub Olive (olive-stub.js answers by rung + slots);
    // the real engine reads only system/user/schema/temperature/maxTokens and never sees them.
    rung: rungId,
    values: { ...values }
  };
}

/**
 * The JSON key per shape. It is PART OF THE PROMPT the model sees (the grammar makes it emit the key first), and the
 * readout was taken with these exact keys: `objet` for "which object" (C5/C6 6/6 with `objet`; 0/2 with `reponse`,
 * measured 2026-09-27 in the contract test), `reponse` for yes/no, `blocs`, `nombre`, `prenom`/`noms` for names.
 */
const KEYS = { one_word: 'prenom', list_of_3: 'noms', yes_no: 'reponse', one_of: 'objet', integer: 'nombre', blocks: 'blocs' };

/** The JSON schema the grammar is built from, per shape (null = free text). */
function schemaFor(shape, enumValues) {
  const key = KEYS[shape];
  switch (shape) {
    case 'one_word':
      return { type: 'object', properties: { [key]: { type: 'string', minLength: 1, maxLength: 16 } }, required: [key] };
    case 'list_of_3':
      return { type: 'object', properties: { [key]: { type: 'array', items: { type: 'string', minLength: 1, maxLength: 20 }, minItems: 3, maxItems: 3 } }, required: [key] };
    case 'yes_no':
    case 'one_of':
      return { type: 'object', properties: { [key]: { type: 'string', enum: enumValues } }, required: [key] };
    case 'integer':
      return { type: 'object', properties: { [key]: { type: 'integer' } }, required: [key] };
    case 'blocks':
      return { type: 'object', properties: { [key]: { type: 'array', items: { type: 'string', enum: enumValues }, maxItems: 8 } }, required: [key] };
    default:
      return null;
  }
}

/**
 * The grammar holds the shape but the readout (tpl-012-olive-exam/results-2026-09-27-metal.txt, D1/D2/D4) shows the
 * model stopping one token short of the closing brace: `{ "blocs": [ "avancer", "gauche" ]`. A bounded repair, by
 * appending what the grammar would have forced next, and nothing more. Null when nothing parses.
 */
function parseLoose(text) {
  for (const tail of ['', '}', ']}', '"}', '"]}']) {
    try {
      const v = JSON.parse(text + tail);
      if (v && typeof v === 'object') return v;
    } catch {
      // try the next closing
    }
  }
  return null;
}

/**
 * Strip a trailing incomplete UTF-8 sequence (an emoji cut by the token cap prints as U+FFFD), a think tag the model
 * sometimes emits as plain text even with the block prefilled ("Merci. Je suis Olive. 👋 </think>", contract test
 * 2026-09-27 on Metal), and collapse whitespace.
 */
function tidy(raw) {
  return String(raw)
    .replace(/�+/g, '')
    .replace(/<\/?think>/g, '')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

/**
 * Grade the model's raw text for a shape. Returns `{ok:true, value}` for a shaped answer, `{ok:true, text}` for
 * prose (trimmed to the cap), or `{ok:false, reason}`: grammar, cap, blocklist, must-contain, empty.
 */
function checkOutput(raw, { shape, enumValues, mustContain = [], lang }) {
  const text = tidy(raw);
  if (!text) return { ok: false, reason: 'empty' };
  const L = lang === 'en' ? 'en' : 'fr';
  const schema = schemaFor(shape, enumValues);
  if (schema) {
    const parsed = parseLoose(text);
    if (parsed === null) return { ok: false, reason: 'grammar' };
    let value;
    const got = parsed[KEYS[shape]];
    switch (shape) {
      case 'one_word':
        value = typeof got === 'string' ? got.trim() : '';
        if (!value) return { ok: false, reason: 'empty' };
        if (/\s/.test(value)) return { ok: false, reason: 'cap' };
        break;
      case 'list_of_3':
        value = Array.isArray(got) ? got.map((s) => String(s).trim()) : [];
        if (value.length !== 3 || value.some((s) => !s)) return { ok: false, reason: 'cap' };
        break;
      case 'yes_no':
      case 'one_of':
        value = got;
        if (!enumValues.includes(value)) return { ok: false, reason: 'grammar' };
        break;
      case 'integer':
        value = got;
        if (!Number.isInteger(value)) return { ok: false, reason: 'grammar' };
        break;
      case 'blocks':
        value = Array.isArray(got) ? got : null;
        if (!value || value.some((b) => !enumValues.includes(b))) return { ok: false, reason: 'grammar' };
        if (value.length > 8) return { ok: false, reason: 'cap' };
        break;
      default:
        return { ok: false, reason: 'grammar' };
    }
    const flat = Array.isArray(value) ? value.join(' ') : String(value);
    const bad = blocked(flat, L);
    if (bad) return { ok: false, reason: 'blocklist' };
    return { ok: true, value };
  }
  // Prose: sentence (≤ 25 words) or two_lines (≤ 2 lines), trimmed to the cap, never refused for length alone.
  let out = text;
  let trimmed = false;
  if (shape === 'two_lines') {
    const lines = out
      .split(/\n+/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length > 2) trimmed = true;
    out = lines.slice(0, 2).join('\n');
    if (!lines.length) return { ok: false, reason: 'empty' };
  } else {
    out = out.replace(/\s*\n+\s*/g, ' ');
    const ws = out.split(' ').filter(Boolean);
    if (ws.length > SENTENCE_WORDS) {
      trimmed = true;
      out = ws.slice(0, SENTENCE_WORDS).join(' ').replace(/[,;:\-–—]$/, '') + '…';
    }
  }
  const bad = blocked(out, L);
  if (bad) return { ok: false, reason: 'blocklist' };
  if (mustContain.length) {
    const f = fold(out);
    if (!mustContain.some((m) => f.includes(fold(m)))) return { ok: false, reason: 'must-contain' };
  }
  return trimmed ? { ok: true, text: out, trimmed: true } : { ok: true, text: out };
}

// CONTROL is exported for CG-005: the page embeds `checkSlots` and its helpers' SOURCE (cg005Olive.ts), so it needs the
// same constants by value. 🔴 Keep checkSlots, blocked, words and fold free of backticks and dollar-braces: they run
// inside a template-literal Function script on the page.
module.exports = { TEXT_MAX, SENTENCE_WORDS, BLOCKLIST, CONTROL, KEYS, blocked, words, fold, checkSlots, compose, schemaFor, checkOutput, tidy, parseLoose };
