/**
 * TPL-007 — the Function node scripts: the engine of Rocket School.
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * ## What is JavaScript here and what is not
 *
 * TPL-005's discipline, kept: **no Function node decides what happens next in
 * the game.** Every branch a player sees — was that right, did the rocket reach
 * the planet, is a heart gone, is the board full — is a `Condition` in the
 * graph. The scripts below answer questions and transform data:
 *
 * | script | the question it answers |
 * |---|---|
 * | {@link PICK_QUESTION_SCRIPT} | which skill is due, and what is one question on it? |
 * | {@link GRADE_ANSWER_SCRIPT} | was that right, how fast, and what does the model now believe? |
 * | {@link SLIDE_MERGE_SCRIPT} | what does the board look like after a slide? |
 * | {@link NEW_BOARD_SCRIPT} | a fresh board, from the pool the profile's bonds call for |
 * | {@link DRAW_MERGE_SCRIPT} | the board as rows of squares to draw |
 * | {@link FINISH_MERGE_SCRIPT} | what does a finished board pay? |
 * | {@link BUILD_HUNT_SCRIPT} | a grid and a target with a known number of solutions |
 * | {@link HUNT_MOVE_SCRIPT} | what does the hunt look like after a tap, a way shown, or the next grid? |
 * | {@link DRAW_HUNT_SCRIPT} / {@link FINISH_HUNT_SCRIPT} | the hunt drawn; what a finished hunt pays |
 * | {@link CHECK_HUNT_SCRIPT} | do the picked tiles make the target? |
 * | {@link TOGGLE_INDEX_SCRIPT} | the list with one index added or removed |
 * | the profile scripts | the store's state, read or rewritten |
 * | {@link ENCODE_SAVE_SCRIPT} / {@link DECODE_SAVE_SCRIPT} | a profile as a code, and back |
 * | {@link TRANSLATE_SCRIPT} | every interface word, in the chosen language |
 *
 * Each ships in a **named logic component** under `Logic/` (P10 — the named
 * utility publishes), so a page instantiates `Logic/Pick next question` rather
 * than growing its own anonymous Function.
 *
 * ## 🔴 Ports come from the text
 *
 * A Function node's ports are mined from `Inputs.x` / `Outputs.y` in the script.
 * Every port a graph wires must therefore appear literally — `Outputs[key]` in
 * a loop mints nothing, which is why {@link TRANSLATE_SCRIPT} is generated one
 * line per word.
 *
 * ## The learner model, in one paragraph
 *
 * Per profile: a rating `r` (Elo, starts at the level's base). Per skill the
 * profile has met: an item rating `d` (starts at the skill's base), a count
 * `n`, a `streak`, the last ten outcomes, a half-life `hl` in days and a `due`
 * time, a mastery `m` (0 new · 1 familiar · 2 proficient · 3 mastered) and the
 * best fluent time. On an answer: predicted `p = 1 / (1 + 10^((d − r)/400))`,
 * score `s` = 1 fluent · 0.7 correct-but-slow · 0 wrong; `r += K (s − p)`,
 * `d −= 16 (s − p)`. Correct doubles the half-life (×2.5 if fluent), wrong
 * halves it (floor 6 hours). Mastery rises on the rules in `GRADE_ANSWER_SCRIPT`
 * and **demotes on two misses in a row**. Selection: a due review first; else
 * a weighted draw over the level's skills (and the level below, unless
 * mastered) with the weight peaking where `p ≈ 0.75`. Klinkenberg 2011,
 * Settles 2016, Khan's mastery levels — the briefing cites each.
 *
 * @module noodl-mcp/tests/tpl007Scripts
 */
import { HANGAR_SHELF, LEVELS, WORD_KEYS } from './tpl007Curriculum';

/** How far one correct answer moves a rocket, before the speed factor. Eight fluent answers reach the planet. */
export const RACE_STEP = 1 / 8;

/** A question with no answer after this many fluent windows times out (challenge mode). */
export const LIMIT_FACTOR = 3;

/**
 * 🔴 P95 PLY-006 — the comeback. Richard, 2026-09-18: *"when you've fucked up the beginning and the CPU rocket is at
 * the middle point, you're fucked and you know it."*
 *
 * Measured before anything was written, over 8 000 seeded races: a child 0.3 behind at halfway won **0** of 1 993.
 * The computer moves on every question including the ones the child gets wrong, and nothing anywhere read the gap.
 *
 * Three layers, all earned, all visible, none random — and every one of them MULTIPLIES a gain that is already zero
 * on a wrong answer, so no layer can ever pay a child for being wrong (the briefing's rule 5).
 *
 * - `behindFrom` — one threshold, about a rocket's length. Nothing helps a child who is not behind it.
 * - `slipMax` / `slipSpan` — the slipstream: a correct answer while behind gains up to +60%, reached at a 0.6 gap,
 *   and decaying to nothing as the child draws level, so a lead still means something.
 * - `chainAt` / `turboMult` — the chain: three right answers in a row charge one ⚡, which the CHILD taps to double
 *   their next correct answer. One held at a time; a wrong answer breaks the chain but never discharges a turbo
 *   already earned.
 *
 * 🔴 Slipstream was measured ALONE first, because it was the obvious design, and it moved the comeback rate from 0%
 * to 3%: the multiplier decays exactly as the child closes, so it cannot bridge a gap by itself. The chain is what
 * does the work. Together: 26% of bad starts become comebacks at 75% accuracy, and the overall win rate moves 71% →
 * 77% — a fix that made the race EASY would not be a fix, so the gate holds both ends.
 */
export const COMEBACK = { behindFrom: 0.15, slipMax: 0.6, slipSpan: 0.45, chainAt: 3, turboMult: 2 } as const;

export const COMEBACK_HELPERS = `
var COMEBACK = ${JSON.stringify(COMEBACK)};
/** How much further a correct answer carries because the child is behind. 1 when level or ahead; never for the computer. */
function slipstream(gap) {
  var g = Number(gap) || 0;
  if (!(g > COMEBACK.behindFrom)) return 1;
  return 1 + COMEBACK.slipMax * Math.min(1, (g - COMEBACK.behindFrom) / COMEBACK.slipSpan);
}
/** The race's own chain and the turbo it has charged, kept under the race id so a new race starts clean. */
function chainOf(race) { return { run: Math.max(0, Math.floor(Number(race && race.chain) || 0)), turbo: Math.max(0, Math.floor(Number(race && race.turbo) || 0)) }; }
`;

/** Profiles per browser. Siblings share a computer; six is a family. */
export const MAX_PROFILES = 6;

/**
 * RKT-010 — what earns a star, in one table the scripts and the gate both read, so play-test feedback is a one-line change.
 * Speed pays nothing here: it already moves the rocket.
 */
export const STAR_RULE = { right: 1, finish: 5, level: 10, best: 5 } as const;

/**
 * The stars live inside the model, so saving it (a replace) can never count them twice. A model saved before RKT-010 has
 * no stars: on first read it is granted 10 per mastery level already reached, and those levels are marked paid.
 */
export const STAR_HELPERS = `
var STAR_RULE = ${JSON.stringify(STAR_RULE)};
function withStars(model) {
  if (!model.skills) model.skills = {};
  if (!model.bests || typeof model.bests !== 'object') model.bests = {};
  // PLY-002: what has been spent in the hangar. A model from the RKT-011 pick era has none, so its old picks are never charged for.
  if (typeof model.spent !== 'number' || !(model.spent >= 0)) model.spent = 0;
  if (typeof model.stars === 'number') return model;
  var grant = 0;
  for (var id in model.skills) { var lv = Number(model.skills[id].m) || 0; grant += STAR_RULE.level * lv; model.skills[id].paid = lv; }
  model.stars = grant;
  return model;
}
`;

/**
 * P95 PLY-001 §3.3 / RKT-011 §3.3 — which `<look>/<part>` pairs are OPTIONAL in DiceBear and so need their
 * `<part>Probability` forced to 100, or the seed decides whether the part draws at all. **Derived from the shelf's
 * own `prob` flags**, never hand-listed, and the template gate asserts each one against the installed schema.
 */
export const PROB_PARTS: Readonly<Record<string, 1>> = (() => {
  const out: Record<string, 1> = {};
  for (const item of HANGAR_SHELF) {
    if (item.kind !== 'face' || !item.faces) continue;
    for (const [look, part] of Object.entries(item.faces)) if (part.prob) out[`${look}/${part.part}`] = 1;
  }
  return out;
})();

/**
 * P95 PLY-002, R1 — **the hangar is a shop.** Richard, 2026-09-18: *"when you choose a colour it sort of 'auto-buys'
 * it which is strange UX, it should have a confirmation popup showing you your balance, how much it costs, what
 * you'll have left after"*. That is a price and a purse, so RKT-011's ruling A (one 🎁 pick at each milestone) is
 * retired here, with `HANGAR_MILESTONES` and `HANGAR_EVERY`.
 *
 * 🔴 **`model.stars` still only ever goes UP.** It is what the child has EARNED, and every gate that counts earning
 * still reads it. Spending is a second number, `model.spent`, and the purse is the difference. So RKT-010's rule
 * ("nothing is ever taken away") survives a shop: no answer, no race and no save can lower what you earned, and a
 * price change tomorrow cannot retroactively empty a purse that was already spent at yesterday's price.
 *
 * A profile that owns items from the RKT-011 pick era has `spent: 0`. It keeps every one of them and keeps its whole
 * earned total as its purse — the old picks are not charged for after the fact.
 *
 * `wear.face` is keyed by look then by DiceBear part, so a hat chosen for the pixel face is still there after a trip
 * to another face. `wear.paint` and `wear.pattern` are the rocket's two layers (PLY-002): paint is the hull colour,
 * pattern is the decal the kit draws over it.
 */
/** PLY-002: the cheapest thing on the shelf that is not free — what a purse must hold before the hangar is worth opening. */
export const SHOP_FROM: number = Math.min(...HANGAR_SHELF.filter((i) => i.free !== true).map((i) => i.cost));

export const HANGAR_HELPERS = `
var PROB_PARTS = ${JSON.stringify(PROB_PARTS)};
var SHOP_FROM = ${SHOP_FROM};
function ownedOf(p) { return p && Array.isArray(p.owned) ? p.owned.filter(function (x) { return typeof x === 'string'; }) : []; }
function costOf(item) { var c = item && Number(item.cost); return isFinite(c) && c > 0 ? Math.round(c) : 0; }
function spentOf(model) { var s = model && Number(model.spent); return isFinite(s) && s > 0 ? Math.round(s) : 0; }
function purseOf(model) { return Math.max(0, (Number(model && model.stars) || 0) - spentOf(model)); }
function ownsItem(p, item) { return !!item && (item.free === true || ownedOf(p).indexOf(item.id) !== -1); }
function canAfford(item, purse) { return costOf(item) <= (Number(purse) || 0); }
function wearOf(p) { var w = p && p.wear && typeof p.wear === 'object' ? p.wear : {}; return { face: w.face && typeof w.face === 'object' ? JSON.parse(JSON.stringify(w.face)) : {}, paint: typeof w.paint === 'string' ? w.paint : '', pattern: typeof w.pattern === 'string' ? w.pattern : '' }; }
function wearOptions(look, wear) { var parts = (wear && wear.face && wear.face[look]) || {}; var o = {}; for (var part in parts) { if (typeof parts[part] !== 'string' || !parts[part]) continue; o[part] = [parts[part]]; if (PROB_PARTS[look + '/' + part]) o[part + 'Probability'] = 100; } return o; }
function itemFits(item, look) { return !!item && (item.kind === 'rocket' || !!(item.faces && item.faces[look])); }
function itemLayer(item) { return item && typeof item.pattern === 'string' && item.pattern ? 'pattern' : 'paint'; }
function itemWorn(item, look, wear) {
  if (!item) return false;
  if (item.kind === 'rocket') return itemLayer(item) === 'pattern' ? wear.pattern === item.pattern : wear.paint === item.paint;
  var o = item.faces && item.faces[look];
  return !!o && !!wear.face[look] && wear.face[look][o.part] === o.value;
}
function putOn(item, look, wear) {
  if (item.kind === 'rocket') { if (itemLayer(item) === 'pattern') wear.pattern = item.pattern; else wear.paint = item.paint; return wear; }
  var o = item.faces[look];
  if (!wear.face[look]) wear.face[look] = {};
  wear.face[look][o.part] = o.value;
  return wear;
}
function takeOff(item, look, wear) {
  if (item.kind === 'rocket') { if (itemLayer(item) === 'pattern') { if (wear.pattern === item.pattern) wear.pattern = ''; } else if (wear.paint === item.paint) wear.paint = ''; return wear; }
  var o = item.faces[look];
  if (wear.face[look] && wear.face[look][o.part] === o.value) delete wear.face[look][o.part];
  return wear;
}
function shelfItem(shelf, id) { var list = Array.isArray(shelf) ? shelf : []; for (var i = 0; i < list.length; i++) if (list[i] && list[i].id === id) return list[i]; return null; }
/** PLY-001 §3.2: what a child owns that today's face cannot wear. Never hidden, never offered, never taken away — just counted. */
function ownedElsewhere(p, shelf, look) {
  var owned = ownedOf(p), n = 0;
  for (var i = 0; i < owned.length; i++) { var it = shelfItem(shelf, owned[i]); if (it && it.kind === 'face' && !itemFits(it, look)) n++; }
  return n;
}
`;

/** Elo bases per level. The spread inside a level (×250) is the skill's `diff`. */
export const LEVEL_BASE: Readonly<Record<string, number>> = { CE2: 800, CM1: 1050, CM2: 1300, '6e': 1550 };

/**
 * Helpers every script can use, prepended verbatim. Plain ES5-ish JavaScript
 * because it runs inside a Function node in any browser the viewer supports.
 */
export const HELPERS = `
var LEVELS = ${JSON.stringify(LEVELS)};
var LEVEL_BASE = ${JSON.stringify(LEVEL_BASE)};
function levelIndex(level) { var i = LEVELS.indexOf(String(level || 'CE2')); return i < 0 ? 0 : i; }
function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
function pickOne(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function shuffle(arr) { var a = arr.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
function isFr(lang) { return String(lang) === 'fr'; }
/** 1234567.5 → "1 234 567,5" (fr, grouped with a narrow no-break space) or "1,234,567.5" (en). RKT-003: an ordinary space let a phone break "8 266" across two lines. */
function fmtNum(n, lang) {
  var neg = n < 0; n = Math.abs(n);
  var s = String(Math.round(n * 1000) / 1000);
  var parts = s.split('.');
  var int = parts[0]; var out = '';
  while (int.length > 3) { out = (isFr(lang) ? '\u202f' : ',') + int.slice(-3) + out; int = int.slice(0, -3); }
  out = int + out;
  if (parts[1]) out += (isFr(lang) ? ',' : '.') + parts[1];
  return (neg ? '−' : '') + out;
}
/** What a typed answer becomes before comparison: numbers as numbers, words lower-case. */
function normalise(v) {
  var s = String(v === undefined || v === null ? '' : v).trim().toLowerCase();
  var num = s.replace(/\\s+/g, '').replace(/,/g, '.');
  if (/^-?\\d+(\\.\\d+)?$/.test(num)) return String(Number(num));
  var big = s.replace(/[\\s.,']/g, '');
  if (/^-?\\d+$/.test(big) && /\\d[\\s.,']\\d{3}/.test(s)) return String(Number(big));
  return s.replace(/\\s+/g, ' ');
}
function sameAnswer(a, b) { return normalise(a) === normalise(b); }

var EN_ONES = ['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
var EN_TENS = ['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
function enUnder1000(n) {
  var out = '';
  if (n >= 100) { out = EN_ONES[Math.floor(n / 100)] + ' hundred'; n = n % 100; if (n > 0) out += ' and '; }
  if (n >= 20) { out += EN_TENS[Math.floor(n / 10)]; if (n % 10) out += '-' + EN_ONES[n % 10]; }
  else if (n > 0 || out === '') out += EN_ONES[n];
  return out;
}
function spellEn(n) {
  n = Math.floor(Number(n)); if (n === 0) return 'zero';
  var blocks = [[1000000000, 'billion'], [1000000, 'million'], [1000, 'thousand']];
  var parts = [];
  for (var i = 0; i < blocks.length; i++) { var q = Math.floor(n / blocks[i][0]); if (q > 0) { parts.push(enUnder1000(q) + ' ' + blocks[i][1]); n = n % blocks[i][0]; } }
  if (n > 0) { if (parts.length && n < 100) parts.push('and ' + enUnder1000(n)); else parts.push(enUnder1000(n)); }
  return parts.join(' ');
}
var FR_ONES = ['zéro','un','deux','trois','quatre','cinq','six','sept','huit','neuf','dix','onze','douze','treize','quatorze','quinze','seize'];
var FR_TENS = ['','dix','vingt','trente','quarante','cinquante','soixante','soixante','quatre-vingt','quatre-vingt'];
function frUnder100(n) {
  if (n < 17) return FR_ONES[n];
  if (n < 20) return 'dix-' + FR_ONES[n - 10];
  var t = Math.floor(n / 10), u = n % 10;
  if (t === 7 || t === 9) { u += 10; }
  var base = FR_TENS[t];
  if (t === 8 && u === 0) return 'quatre-vingts';
  if (u === 0) return base;
  if (u === 1 && t !== 8) return base + ' et un';
  if (u === 11 && t === 7) return base + ' et onze';
  var unit = u < 17 ? FR_ONES[u] : 'dix-' + FR_ONES[u - 10];
  return base + '-' + unit;
}
function frUnder1000(n) {
  var out = '';
  if (n >= 100) { var h = Math.floor(n / 100); n = n % 100; out = (h === 1 ? 'cent' : FR_ONES[h] + ' cent') + (n === 0 && h > 1 ? 's' : ''); if (n > 0) out += ' '; }
  if (n > 0 || out === '') out += frUnder100(n);
  return out;
}
function spellFr(n) {
  n = Math.floor(Number(n)); if (n === 0) return 'zéro';
  var parts = [];
  var b = Math.floor(n / 1000000000); if (b > 0) { parts.push((b === 1 ? 'un milliard' : frUnder1000(b) + ' milliards')); n = n % 1000000000; }
  var m = Math.floor(n / 1000000); if (m > 0) { parts.push((m === 1 ? 'un million' : frUnder1000(m) + ' millions')); n = n % 1000000; }
  var k = Math.floor(n / 1000); if (k > 0) { parts.push((k === 1 ? 'mille' : frUnder1000(k) + ' mille')); n = n % 1000; }
  if (n > 0) parts.push(frUnder1000(n));
  return parts.join(' ');
}
function spell(n, lang) { return isFr(lang) ? spellFr(n) : spellEn(n); }
function skillBase(skill) { return LEVEL_BASE[skill.level] + Number(skill.diff || 0) * 250; }
function predict(r, d) { return 1 / (1 + Math.pow(10, (d - r) / 400)); }
function pickText(bi, lang) { if (!bi) return ''; if (typeof bi === 'string') return bi; return isFr(lang) ? (bi.fr || bi.en || '') : (bi.en || bi.fr || ''); }
`;

// ── Pick next question ──────────────────────────────────────────────────────

/**
 * The generators. Each returns `{ prompt, answer, options?, diffAdj? }` for a
 * skill's `params`; `options`, when present, are the four buttons including the
 * answer, distractors first so `shuffle` decides the order. The distractors on
 * a `trap` skill are the misconception's own answers.
 */
export const GENERATORS = `
// ── RKT-004: the correction works through the question that was asked ──────
// Before, a wrong answer showed the skill's FIXED example: asked 36 + 7, the child read "46 + 8: go to 50 first".
// Each maths generator now returns worked: its own numbers, worked the way the skill's Teach card teaches.
function says(lang, en, fr) { return isFr(lang) ? fr : en; }
function timesWorked(t, k, lang) {
  var ans = t * k;
  if (t === 2) return says(lang, 'Times 2 is doubling: ', 'Fois 2, c’est doubler : ') + k + ' + ' + k + ' = ' + ans + '.';
  if (t === 4) return says(lang, 'Times 4 is double, double: ', 'Fois 4, c’est doubler deux fois : ') + k + ' → ' + (2 * k) + ' → ' + ans + '.';
  if (t === 8) return says(lang, 'Times 8 is double three times: ', 'Fois 8, c’est doubler trois fois : ') + k + ' → ' + (2 * k) + ' → ' + (4 * k) + ' → ' + ans + '.';
  if (t === 5) return says(lang, 'Times 5 is times 10, then half: ', 'Fois 5, c’est fois 10 puis la moitié : ') + k + ' × 10 = ' + (10 * k) + says(lang, ', and half of that is ', ', et la moitié, c’est ') + ans + '.';
  if (t === 9) return says(lang, 'Times 9 is times 10, minus once: ', 'Fois 9, c’est fois 10 moins une fois : ') + k + ' × 10 = ' + (10 * k) + says(lang, ', then ', ', puis ') + (10 * k) + ' − ' + k + ' = ' + ans + '.';
  if (t === 6) return says(lang, 'Times 6 is times 5, plus once: ', 'Fois 6, c’est fois 5 plus une fois : ') + k + ' × 5 = ' + (5 * k) + says(lang, ', then ', ', puis ') + (5 * k) + ' + ' + k + ' = ' + ans + '.';
  if (t === 3) return says(lang, 'Times 3 is double, plus once: ', 'Fois 3, c’est le double plus une fois : ') + k + ' × 2 = ' + (2 * k) + says(lang, ', then ', ', puis ') + (2 * k) + ' + ' + k + ' = ' + ans + '.';
  if (t === 7) return says(lang, 'Times 7 is times 5 plus times 2: ', 'Fois 7, c’est fois 5 plus fois 2 : ') + k + ' × 5 = ' + (5 * k) + ', ' + k + ' × 2 = ' + (2 * k) + says(lang, ', then ', ', puis ') + (5 * k) + ' + ' + (2 * k) + ' = ' + ans + '.';
  if (t === 10) return says(lang, 'Times 10: every digit moves one place left, so ', 'Fois 10 : chaque chiffre se décale d’un rang vers la gauche, donc ') + k + ' → ' + ans + '.';
  return k + ' × ' + t + ' = ' + ans + '.';
}
function missingWorked(a, b, lang) { var n = a * b; return '? × ' + b + ' = ' + n + says(lang, ' asks: ' + b + ' times what makes ' + n + '? ', ' demande : ' + b + ' fois combien font ' + n + ' ? ') + a + ' × ' + b + ' = ' + n + '.'; }
function divisionWorked(a, b, lang) { var n = a * b; return n + ' ÷ ' + b + says(lang, ' asks: ' + b + ' times what makes ' + n + '? ', ' demande : ' + b + ' fois combien font ' + n + ' ? ') + b + ' × ' + a + ' = ' + n + '.'; }
function addWorked(a, b, lang, compensation) {
  var ans = a + b;
  if (compensation) { var up = b + 1; return says(lang, 'Add ' + up + ' and take 1 back: ', 'Ajoute ' + up + ' et retire 1 : ') + a + ' + ' + b + ' = ' + a + ' + ' + up + ' − 1 = ' + (a + up) + ' − 1 = ' + ans + '.'; }
  var x = Math.max(a, b), y = Math.min(a, b), gap = (10 - x % 10) % 10;
  if (y < 10 && gap > 0 && y > gap) return says(lang, 'Go to the ten first: ', 'Passe par la dizaine : ') + x + ' + ' + y + ' = ' + x + ' + ' + gap + ' + ' + (y - gap) + ' = ' + (x + gap) + ' + ' + (y - gap) + ' = ' + ans + '.';
  if (y >= 10 && y % 10) { var tens = y - y % 10; return says(lang, 'The tens first: ', 'Les dizaines d’abord : ') + x + ' + ' + y + ' = ' + x + ' + ' + tens + ' + ' + (y % 10) + ' = ' + (x + tens) + ' + ' + (y % 10) + ' = ' + ans + '.'; }
  return x + ' + ' + y + ' = ' + ans + '.';
}
function subWorked(a, b, lang, p) {
  var ans = a - b;
  if (p.subChoices) { var up = b + 1; return says(lang, 'Take ' + up + ' and give 1 back: ', 'Retire ' + up + ' et rends 1 : ') + a + ' − ' + b + ' = ' + a + ' − ' + up + ' + 1 = ' + (a - up) + ' + 1 = ' + ans + '.'; }
  if (p.borrow && b % 10) {
    var nt = b - b % 10 + 10, g1 = nt - b, g2 = a - nt;
    if (g2 > 0) return says(lang, 'Count up from ' + b + ': ', 'Compte en montant depuis ' + b + ' : ') + b + ' → ' + nt + ' (' + g1 + '), ' + nt + ' → ' + a + ' (' + g2 + ')' + says(lang, ', so ', ', donc ') + g1 + ' + ' + g2 + ' = ' + ans + '.';
  }
  var gap = a % 10;
  if (b < 10 && gap > 0 && b > gap) return says(lang, 'Go down to the ten first: ', 'Descends d’abord à la dizaine : ') + a + ' − ' + b + ' = ' + a + ' − ' + gap + ' − ' + (b - gap) + ' = ' + (a - gap) + ' − ' + (b - gap) + ' = ' + ans + '.';
  if (b >= 10 && b % 10) { var tens = b - b % 10; return says(lang, 'The tens first: ', 'Les dizaines d’abord : ') + a + ' − ' + b + ' = ' + a + ' − ' + tens + ' − ' + (b % 10) + ' = ' + (a - tens) + ' − ' + (b % 10) + ' = ' + ans + '.'; }
  return a + ' − ' + b + ' = ' + ans + '.';
}
function bondWorked(a, target, lang) {
  var ans = target - a;
  if (target === 10) return says(lang, a + ' and ' + ans + ' are partners: ', a + ' et ' + ans + ' sont partenaires : ') + a + ' + ' + ans + ' = 10.';
  var nt = a - a % 10 + 10;
  if (a % 10 === 0 || nt >= target) return a + ' + ' + ans + ' = ' + target + (a % 10 ? says(lang, ', like ', ', comme ') + (a % 10) + ' + ' + (10 - a % 10) + ' = 10' : '') + '.';
  return says(lang, 'Go to the next ten, then to ' + target + ': ', 'Va à la dizaine suivante, puis à ' + target + ' : ') + a + ' → ' + nt + ' (' + (nt - a) + '), ' + nt + ' → ' + target + ' (' + (target - nt) + ')' + says(lang, ', so ', ', donc ') + (nt - a) + ' + ' + (target - nt) + ' = ' + ans + '.';
}
function doubleWorked(n, lang) {
  var tens = n - n % 10, u = n % 10, lead = says(lang, 'Double ' + n + ': ', 'Le double de ' + n + ' : ');
  if (!tens || !u) return lead + n + ' + ' + n + ' = ' + (2 * n) + '.';
  return lead + says(lang, 'double the tens, double the ones, ', 'double les dizaines, double les unités, ') + (2 * tens) + ' + ' + (2 * u) + ' = ' + (2 * n) + '.';
}
function halfWorked(m, lang) {
  var tens = m - m % 10, u = m % 10, lead = says(lang, 'Half of ' + m + ': ', 'La moitié de ' + m + ' : ');
  if (!tens || !u) return lead + (m / 2) + ' + ' + (m / 2) + ' = ' + m + '.';
  return lead + says(lang, 'half of ' + tens + ' is ' + (tens / 2) + ', half of ' + u + ' is ' + (u / 2) + ', so ', 'la moitié de ' + tens + ', c’est ' + (tens / 2) + ', la moitié de ' + u + ', c’est ' + (u / 2) + ', donc ') + (m / 2) + '.';
}
function pow10Worked(n, f, divide, ans, lang) {
  var k = Math.round(Math.abs(Math.log(f) / Math.LN10)), left = divide ? f < 1 : f >= 1;
  return fmtNum(n, lang) + (divide ? ' ÷ ' : ' × ') + fmtNum(f, lang) + ' = ' + fmtNum(ans, lang) + says(lang, ': every digit moves ' + k + (k > 1 ? ' places ' : ' place ') + (left ? 'left.' : 'right.'), ' : chaque chiffre se décale de ' + k + ' rang' + (k > 1 ? 's' : '') + ' vers la ' + (left ? 'gauche.' : 'droite.'));
}
function mulByWorked(n, by, lang) {
  var ans = n * by, lead = n + ' × ' + by + ' = ' + ans + says(lang, ': ', ' : ');
  if (by === 4) return lead + says(lang, 'double, then double again, ', 'double, puis encore double, ') + n + ' → ' + (2 * n) + ' → ' + ans + '.';
  if (by === 8) return lead + says(lang, 'double three times, ', 'double trois fois, ') + n + ' → ' + (2 * n) + ' → ' + (4 * n) + ' → ' + ans + '.';
  if (by === 5) return lead + says(lang, 'times 10, then half, ', 'fois 10, puis la moitié, ') + n + ' × 10 = ' + (10 * n) + ' → ' + ans + '.';
  if (by === 50) return lead + says(lang, 'times 100, then half, ', 'fois 100, puis la moitié, ') + n + ' × 100 = ' + (100 * n) + ' → ' + ans + '.';
  if (by === 25) return lead + says(lang, 'times 100, then half of half, ', 'fois 100, puis la moitié de la moitié, ') + n + ' × 100 = ' + (100 * n) + ' → ' + (50 * n) + ' → ' + ans + '.';
  return n + ' × ' + by + ' = ' + ans + '.';
}
function divByWorked(n, by, lang) {
  var q = n / by;
  if (by === 4) return n + ' ÷ 4' + says(lang, ' is half, then half again: ', ', c’est la moitié, puis encore la moitié : ') + n + ' → ' + (n / 2) + ' → ' + q + '.';
  if (by === 8) return n + ' ÷ 8' + says(lang, ' is half three times: ', ', c’est trois fois la moitié : ') + n + ' → ' + (n / 2) + ' → ' + (n / 4) + ' → ' + q + '.';
  return n + ' ÷ ' + by + ' = ' + q + says(lang, ', because ', ', car ') + by + ' × ' + q + ' = ' + n + '.';
}
function euclidWorked(n, d, q, r, lang) {
  return says(lang, 'How many ' + d + 's fit in ' + n + '? ', 'Combien de fois ' + d + ' dans ' + n + ' ? ') + d + ' × ' + q + ' = ' + (d * q) + says(lang, ' fits, ', ' rentre, ') + d + ' × ' + (q + 1) + ' = ' + (d * (q + 1)) + says(lang, ' is too big. So ', ' est trop grand. Donc ') + n + ' = ' + d + ' × ' + q + ' + ' + r + '.';
}
function blocksWorked(n, lang) {
  var digits = String(n), parts = [];
  while (digits.length > 3) { parts.unshift(digits.slice(-3)); digits = digits.slice(0, -3); }
  parts.unshift(digits);
  return says(lang, 'Three digits in every block, even the empty ones: ', 'Trois chiffres dans chaque classe, même les vides : ') + parts.join(' | ') + ' → ' + fmtNum(n, lang) + '.';
}
function placeWorked(n, place, lang, namesEn, namesFr) {
  var shown = fmtNum(n, lang), seen = 0, marked = '';
  for (var i = shown.length - 1; i >= 0; i--) {
    var ch = shown.charAt(i);
    if (/[0-9]/.test(ch)) { marked = (seen === place ? '[' + ch + ']' : ch) + marked; seen++; }
    else marked = ch + marked;
  }
  var digit = String(n).charAt(String(n).length - 1 - place);
  return shown + says(lang, ': count from the RIGHT, ' + marked + ', the ' + namesEn[place] + ' digit is ' + digit + '.', ' : compte depuis la DROITE, ' + marked + ', le chiffre des ' + namesFr[place] + ' est ' + digit + '.');
}
function compareWorked(a, b, lang) {
  var big = Math.max(a, b), small = Math.min(a, b), sb = String(big), ss = String(small);
  if (sb.length !== ss.length) return fmtNum(big, lang) + says(lang, ' has more digits than ' + fmtNum(small, lang) + ', so it is bigger.', ' a plus de chiffres que ' + fmtNum(small, lang) + ', donc il est plus grand.');
  var i = 0;
  while (sb.charAt(i) === ss.charAt(i)) i++;
  return says(lang, 'Same number of digits, so compare from the left: the first different digit is ' + sb.charAt(i) + ' in ' + fmtNum(big, lang) + ' and ' + ss.charAt(i) + ' in ' + fmtNum(small, lang) + '.', 'Même nombre de chiffres, alors compare depuis la gauche : le premier chiffre différent est ' + sb.charAt(i) + ' dans ' + fmtNum(big, lang) + ' et ' + ss.charAt(i) + ' dans ' + fmtNum(small, lang) + '.');
}
function decimalsOf(x) { var t = String(x); return t.indexOf('.') === -1 ? 0 : t.length - t.indexOf('.') - 1; }
function decCompareWorked(a, b, lang) {
  var k = Math.max(decimalsOf(a), decimalsOf(b));
  var pad = function (x) { var t = x.toFixed(k); return isFr(lang) ? t.replace('.', ',') : t; };
  return says(lang, 'Give them the same number of decimals: ' + pad(a) + ' and ' + pad(b) + ', so ' + fmtNum(Math.max(a, b), lang) + ' is bigger.', 'Donne-leur autant de décimales : ' + pad(a) + ' et ' + pad(b) + ', donc ' + fmtNum(Math.max(a, b), lang) + ' est le plus grand.');
}
function gcdOf(x, y) { return y ? gcdOf(y, x % y) : x; }
function fracCompareWorked(a, b, lang) {
  var fa = a[0] + '/' + a[1], fb = b[0] + '/' + b[1], big = a[0] / a[1] > b[0] / b[1] ? fa : fb;
  if (a[1] === b[1]) return says(lang, 'Same bottom number, so compare the tops: ', 'Même dénominateur, alors compare les numérateurs : ') + fa + says(lang, ' and ', ' et ') + fb + ' → ' + big + '.';
  if (a[0] === b[0]) return says(lang, 'Same top number: more slices means smaller slices, so ', 'Même numérateur : plus de parts, des parts plus petites, donc ') + big + says(lang, ' is bigger than ', ' est plus grande que ') + (big === fa ? fb : fa) + '.';
  var den = a[1] * b[1] / gcdOf(a[1], b[1]);
  return says(lang, 'Give them the same bottom number: ', 'Donne-leur le même dénominateur : ') + fa + ' = ' + (a[0] * den / a[1]) + '/' + den + ', ' + fb + ' = ' + (b[0] * den / b[1]) + '/' + den + says(lang, ', so ', ', donc ') + big + '.';
}
function fractionOfWorked(num, den, n, lang, joiner) {
  var unit = n / den;
  return num + '/' + den + joiner + n + says(lang, ': ', ' : ') + n + ' ÷ ' + den + ' = ' + unit + says(lang, ', then ', ', puis ') + unit + ' × ' + num + ' = ' + (unit * num) + '.';
}
function percentWorked(pc, n, lang) {
  var head = pc + (isFr(lang) ? ' % de ' : '% of ') + n + says(lang, ' is ', ', c’est ');
  if (pc === 10) return head + n + ' ÷ 10 = ' + fmtNum(n / 10, lang) + '.';
  if (pc === 50) return head + says(lang, 'half: ', 'la moitié : ') + n + ' ÷ 2 = ' + (n / 2) + '.';
  if (pc === 25) return head + says(lang, 'a quarter: ', 'le quart : ') + n + ' ÷ 4 = ' + (n / 4) + '.';
  if (pc === 75) return head + says(lang, 'three quarters: ', 'trois quarts : ') + n + ' ÷ 4 = ' + (n / 4) + says(lang, ', then × 3 = ', ', puis × 3 = ') + (n / 4 * 3) + '.';
  return head + fmtNum(n * pc / 100, lang) + '.';
}
function roundIntWorked(m, t, a2, lang) {
  var next = t === 10 ? m % 10 : Math.floor(m / 10) % 10;
  return fmtNum(m, lang) + says(lang, ' to the nearest ' + t + ': the digit just right of the ' + (t === 10 ? 'tens' : 'hundreds') + ' is ' + next + (next >= 5 ? ', 5 or more, so up: ' : ', under 5, so down: '), ' : le chiffre juste à droite des ' + (t === 10 ? 'dizaines' : 'centaines') + ' est ' + next + (next >= 5 ? ', 5 ou plus, on monte : ' : ', moins de 5, on descend : ')) + fmtNum(a2, lang) + '.';
}
function roundDecWorked(cents, to, ans, lang) {
  var next = to === 1 ? Math.floor(cents / 10) % 10 : cents % 10;
  return fmtNum(cents / 100, lang) + says(lang, ': the ' + (to === 1 ? 'tenths' : 'hundredths') + ' digit is ' + next + (next >= 5 ? ', 5 or more, so up: ' : ', under 5, so down: '), ' : le chiffre des ' + (to === 1 ? 'dixièmes' : 'centièmes') + ' est ' + next + (next >= 5 ? ', 5 ou plus, on monte : ' : ', moins de 5, on descend : ')) + fmtNum(ans, lang) + '.';
}
function balanceWorked(a, b, c, lang) {
  var sum = a + b;
  return a + ' + ' + b + ' = ' + sum + says(lang, ', so ? + ' + c + ' must make ' + sum + ' too: ', ', donc ? + ' + c + ' doit faire ' + sum + ' aussi : ') + sum + ' − ' + c + ' = ' + (sum - c) + '.';
}
function orderWorked(a, b, c, lang) {
  return says(lang, '× first: ', 'Le × d’abord : ') + b + ' × ' + c + ' = ' + (b * c) + says(lang, ', then ', ', puis ') + a + ' + ' + (b * c) + ' = ' + (a + b * c) + '.';
}
function mulSmallWorked(n, f, ans, lang) {
  var by = f === 0.5 ? 2 : f === 0.25 ? 4 : f === 0.2 ? 5 : 10;
  return n + ' × ' + fmtNum(f, lang) + says(lang, ' is ', ', c’est ') + n + ' ÷ ' + by + ' = ' + fmtNum(ans, lang) + '.';
}
function divSmallWorked(n, f, ans, lang) {
  var by = f === 0.5 ? 2 : f === 0.25 ? 4 : 10;
  return n + ' ÷ ' + fmtNum(f, lang) + says(lang, ' asks how many ' + fmtNum(f, lang) + 's make ' + n + ': ', ' demande combien de ' + fmtNum(f, lang) + ' font ' + n + ' : ') + n + ' × ' + by + ' = ' + fmtNum(ans, lang) + '.';
}
function proportionWorked(a, b, unit, lang) {
  return says(lang, 'Find one first: ', 'Trouve d’abord un seul : ') + (a * unit) + ' ÷ ' + a + ' = ' + unit + says(lang, ' € each, then ', ' € chacun, puis ') + b + ' × ' + unit + ' = ' + (b * unit) + ' €.';
}
function tableQ(p, lang) {
  var t = Number(p.table) || rnd(2, 9); if (p.table === 0) t = rnd(2, 9);
  var k = rnd(Number(p.min) || 1, Number(p.max) || 10);
  var forms = ['mul'];
  if (p.bothWays) forms.push('missing');
  if (p.division) forms.push('div');
  var form = pickOne(forms);
  var a = Math.random() < 0.5 ? t : k, b = a === t ? k : t;
  if (form === 'mul') return { prompt: a + ' × ' + b + ' = ?', answer: String(a * b), options: [String(a * b), String(a * b + a), String(a * b - b), String(a * (b + 1) + 1)], worked: timesWorked(t, a === t ? b : a, lang) };
  if (form === 'missing') return { prompt: '? × ' + b + ' = ' + (a * b), answer: String(a), options: [String(a), String(a + 1), String(a - 1 || 2), String(a * b - b)], worked: missingWorked(a, b, lang) };
  return { prompt: (a * b) + ' ÷ ' + b + ' = ?', answer: String(a), options: [String(a), String(a + 1), String(a - 1 || 2), String(b)], worked: divisionWorked(a, b, lang) };
}
function addQ(p, lang) {
  var a, b;
  if (p.addChoices) { a = rnd(p.min, p.max); b = pickOne(p.addChoices); }
  else if (p.bridge) { do { a = rnd(p.min, p.max); b = rnd(p.addMin, p.addMax); } while (Math.floor((a + b) / 10) === Math.floor(a / 10)); }
  else { a = rnd(p.min, p.max); b = rnd(p.min, Math.min(p.max, (p.sumMax || 99) - a)); }
  var ans = a + b;
  return { prompt: a + ' + ' + b + ' = ?', answer: String(ans), options: [String(ans), String(ans + 1), String(ans - 1), String(ans + 10)], worked: addWorked(a, b, lang, !!p.addChoices) };
}
function subQ(p, lang) {
  var a, b;
  if (p.subChoices) { a = rnd(p.min, p.max); b = pickOne(p.subChoices); }
  else if (p.borrow) { do { a = rnd(p.min, p.max); b = rnd(p.subMin, p.subMax); } while (b >= a || (a % 10) >= (b % 10)); }
  else if (p.bridge) { do { a = rnd(p.min, p.max); b = rnd(p.subMin, p.subMax); } while (Math.floor((a - b) / 10) === Math.floor(a / 10)); }
  else { a = rnd(p.min, p.max); b = rnd(1, a); }
  var ans = a - b;
  // The smaller-from-larger bug: 52 − 38 → 26. Offered as an option on purpose.
  var bug = Math.abs(Math.floor(a / 10) - Math.floor(b / 10)) * 10 + Math.abs((a % 10) - (b % 10));
  return { prompt: a + ' − ' + b + ' = ?', answer: String(ans), options: [String(ans), String(bug === ans ? ans + 2 : bug), String(ans + 1), String(ans - 10 > 0 ? ans - 10 : ans + 10)], worked: subWorked(a, b, lang, p) };
}
function bondQ(p, lang) {
  var target = Number(p.target) || 10, step = Number(p.step) || 1;
  var a = rnd(1, Math.floor((target - 1) / step)) * step;
  var first = Math.random() < 0.5;
  var prompt = first ? (a + ' + ? = ' + target) : ('? + ' + a + ' = ' + target);
  var ans = target - a;
  return { prompt: prompt, answer: String(ans), options: [String(ans), String(ans + step), String(ans - step > 0 ? ans - step : ans + 2 * step), String(a)], worked: bondWorked(a, target, lang) };
}
function doubleHalfQ(p, lang) {
  var half = Math.random() < 0.5;
  var n = rnd(6, Number(p.max) || 50);
  if (half) { n = n * 2; return { prompt: (isFr(lang) ? 'La moitié de ' : 'Half of ') + n + ' = ?', answer: String(n / 2), options: [String(n / 2), String(n / 2 + 1), String(n / 2 - 1), String(n * 2)], worked: halfWorked(n, lang) }; }
  return { prompt: (isFr(lang) ? 'Le double de ' : 'Double ') + n + ' = ?', answer: String(n * 2), options: [String(n * 2), String(n * 2 + 2), String(n * 2 - 2), String(n / 2)], worked: doubleWorked(n, lang) };
}
function pow10Q(p, lang) {
  var f = pickOne(p.factors);
  var divide = p.divide && Math.random() < 0.4;
  var n = p.decimals ? (rnd(11, 999) / (Math.random() < 0.5 ? 10 : 100)) : rnd(2, Number(p.max) || 99);
  if (p.decimals && f < 1) divide = false;
  var ans = divide ? n / f : n * f;
  if (divide && !p.decimals) { n = n * f; ans = n / f; }
  ans = Math.round(ans * 100000) / 100000;
  var prompt = fmtNum(n, lang) + (divide ? ' ÷ ' : ' × ') + fmtNum(f, lang) + ' = ?';
  // "Add a zero": 2.5 × 10 → 2.50. The trap, offered.
  var addZero = p.decimals ? fmtNum(n, lang) + '0' : fmtNum(n * 10 * (f >= 100 ? 10 : 1), lang);
  return { prompt: prompt, answer: String(ans), options: [fmtNum(ans, lang), addZero, fmtNum(ans * 10, lang), fmtNum(ans / 10, lang)], worked: pow10Worked(n, f, divide, ans, lang) };
}
function mulByQ(p, lang) {
  var by = pickOne(p.by), n = rnd(p.min, p.max), ans = n * by;
  return { prompt: n + ' × ' + by + ' = ?', answer: String(ans), options: [String(ans), String(ans + by), String(ans - by), String(n * (by + 1))], worked: mulByWorked(n, by, lang) };
}
function divByQ(p, lang) {
  var by = pickOne(p.by), q = rnd(3, Math.floor((Number(p.max) || 400) / by)), n = q * by;
  return { prompt: n + ' ÷ ' + by + ' = ?', answer: String(q), options: [String(q), String(q + 1), String(q - 1), String(q * 2)], worked: divByWorked(n, by, lang) };
}
function euclidQ(p, lang) {
  var d = rnd(p.divisorMin, p.divisorMax), q = rnd(2, Math.floor(p.dividendMax / d)), r = rnd(1, d - 1), n = q * d + r;
  var askRem = Math.random() < 0.4;
  if (askRem) return { prompt: (isFr(lang) ? 'Le reste de ' : 'The remainder of ') + n + ' ÷ ' + d + ' = ?', answer: String(r), options: [String(r), String(q), String(r + 1), String(d - r)], worked: euclidWorked(n, d, q, r, lang) };
  return { prompt: (isFr(lang) ? 'Le quotient de ' : 'The quotient of ') + n + ' ÷ ' + d + ' = ?', answer: String(q), options: [String(q), String(q + 1), String(r), String(q - 1)], worked: euclidWorked(n, d, q, r, lang) };
}
function bigNumberQ(p, lang) {
  var max = Number(p.max) || 9999;
  // Numbers that expose the blocks: mostly round-ish, with empty middles.
  var shapes = [];
  if (max >= 1000) shapes.push(function () { return rnd(1, 9) * 1000 + rnd(1, 99); });
  if (max >= 1000) shapes.push(function () { return rnd(1, 9) * 1000 + rnd(1, 9) * 100; });
  if (max >= 100000) shapes.push(function () { return rnd(100, 999) * 1000 + rnd(0, 99); });
  if (max >= 100000) shapes.push(function () { return rnd(1, 999) * 1000; });
  if (max >= 1000000) shapes.push(function () { return rnd(1, 999) * 1000000; });
  if (max >= 1000000) shapes.push(function () { return rnd(1, 999) * 1000000 + rnd(1, 99) * 1000; });
  if (max >= 1000000) shapes.push(function () { return rnd(1, 999) * 1000000 + rnd(1, 999); });
  if (max >= 1000000000) shapes.push(function () { return rnd(1, 9) * 1000000000 + rnd(1, 999) * 1000000; });
  if (max >= 1000000000) shapes.push(function () { return rnd(1, 9) * 1000000000 + rnd(1, 999) * 1000; });
  if (!shapes.length) shapes.push(function () { return rnd(21, max); });
  // The last four shapes are the ones at this level's magnitude; smaller ones
  // belong to the level below and are drilled there.
  shapes = shapes.slice(-4);
  var n = pickOne(shapes)();
  var prompt = (isFr(lang) ? 'Écris en chiffres : ' : 'Write in digits: ') + spell(n, lang);
  return { prompt: prompt, answer: String(n), options: [], typedOnly: true, worked: blocksWorked(n, lang) };
}
function placeValueQ(p, lang) {
  var max = Number(p.max) || 9999;
  var n = rnd(Math.floor(max / 10) + 1, max);
  var digits = String(n);
  var namesEn = ['ones', 'tens', 'hundreds', 'thousands', 'ten thousands', 'hundred thousands', 'millions', 'ten millions', 'hundred millions'];
  var namesFr = ['unités', 'dizaines', 'centaines', 'milliers', 'dizaines de mille', 'centaines de mille', 'millions', 'dizaines de millions', 'centaines de millions'];
  var place = rnd(0, digits.length - 1);
  var ans = digits.charAt(digits.length - 1 - place);
  // The trap: reading the position from the LEFT.
  var fromLeft = digits.charAt(Math.min(place, digits.length - 1));
  // Four DISTINCT digits: the answer, the from-the-left trap, then neighbours,
  // then whatever digits are left — a number like 7 501 has few to offer.
  var opts = [ans];
  var candidates = [fromLeft, digits.charAt(digits.length - 1 - Math.min(place + 1, digits.length - 1)), digits.charAt(digits.length - 1 - Math.max(place - 1, 0))];
  for (var c = 0; c < 10; c++) candidates.push(String(c));
  for (var q2 = 0; q2 < candidates.length && opts.length < 4; q2++) if (opts.indexOf(candidates[q2]) === -1) opts.push(candidates[q2]);
  var prompt = isFr(lang)
    ? 'Dans ' + fmtNum(n, lang) + ', quel est le chiffre des ' + namesFr[place] + ' ?'
    : 'In ' + fmtNum(n, lang) + ', which digit is in the ' + namesEn[place] + ' place?';
  return { prompt: prompt, answer: ans, options: opts, worked: placeWorked(n, place, lang, namesEn, namesFr) };
}
function compareIntQ(p, lang) {
  var a = rnd(10, p.max), b;
  do { b = rnd(10, p.max); } while (b === a);
  var big = Math.max(a, b);
  var prompt = (isFr(lang) ? 'Lequel est le plus grand : ' : 'Which is bigger: ') + fmtNum(a, lang) + (isFr(lang) ? ' ou ' : ' or ') + fmtNum(b, lang) + ' ?';
  return { prompt: prompt, answer: String(big), options: [fmtNum(a, lang), fmtNum(b, lang)], optionValues: [String(a), String(b)], worked: compareWorked(a, b, lang) };
}
function decCompareQ(p, lang) {
  var places = Number(p.places) || 2;
  // Built so that the whole-number reading gives the WRONG answer.
  var pairs = places >= 3
    ? [[0.5, 0.125], [0.7, 0.25], [2.5, 2.45], [0.9, 0.875], [1.3, 1.275], [0.4, 0.399], [3.06, 3.5], [0.8, 0.108]]
    : [[0.7, 0.25], [0.5, 0.15], [2.5, 2.45], [0.9, 0.85], [1.3, 1.25], [0.6, 0.55], [4.1, 4.05], [0.3, 0.12]];
  var pair = pickOne(pairs);
  var a = pair[0], b = pair[1];
  if (Math.random() < 0.5) { var t = a; a = b; b = t; }
  var big = Math.max(a, b);
  var prompt = (isFr(lang) ? 'Lequel est le plus grand : ' : 'Which is bigger: ') + fmtNum(a, lang) + (isFr(lang) ? ' ou ' : ' or ') + fmtNum(b, lang) + ' ?';
  return { prompt: prompt, answer: String(big), options: [fmtNum(a, lang), fmtNum(b, lang)], optionValues: [String(a), String(b)], worked: decCompareWorked(a, b, lang) };
}
function fracCompareQ(p, lang) {
  var d = shuffle(p.denoms);
  var a, b;
  if (p.unit) { a = [1, d[0]]; b = [1, d[1]]; }
  else {
    var kind = rnd(0, 2);
    // 🔴 Same denominator needs at least two numerators to choose from: with den = 2
    // there is only 1/2, and the loop looking for a second one never ended (measured).
    if (kind === 0) { var dens = d.filter(function (x) { return x >= 3; }); var den = dens.length ? dens[0] : 4; var n1 = rnd(1, den - 1), n2; do { n2 = rnd(1, den - 1); } while (n2 === n1); a = [n1, den]; b = [n2, den]; }
    else if (kind === 1) { var num = rnd(1, Math.min(d[0], d[1]) - 1); a = [num, d[0]]; b = [num, d[1]]; }
    else { a = [rnd(1, d[0] - 1), d[0]]; b = [rnd(1, d[1] - 1), d[1]]; if (a[0] / a[1] === b[0] / b[1]) b = [b[0] === 1 ? 2 : b[0] - 1, b[1]]; }
  }
  var av = a[0] / a[1], bv = b[0] / b[1];
  if (av === bv) { a = [1, 2]; b = [1, 3]; av = 0.5; bv = 1 / 3; }
  var fa = a[0] + '/' + a[1], fb = b[0] + '/' + b[1];
  var prompt = (isFr(lang) ? 'Quelle fraction est la plus grande : ' : 'Which fraction is bigger: ') + fa + (isFr(lang) ? ' ou ' : ' or ') + fb + ' ?';
  return { prompt: prompt, answer: av > bv ? fa : fb, options: [fa, fb], optionValues: [fa, fb], worked: fracCompareWorked(a, b, lang) };
}
function fracOfQ(p, lang) {
  var den = pickOne(p.denoms), num = rnd(1, den - 1), unit = rnd(2, Math.floor(p.max / den)), n = unit * den, ans = unit * num;
  var prompt = num + '/' + den + (isFr(lang) ? ' de ' : ' of ') + n + ' = ?';
  return { prompt: prompt, answer: String(ans), options: [String(ans), String(unit), String(n - ans), String(ans + unit)], worked: fractionOfWorked(num, den, n, lang, isFr(lang) ? ' de ' : ' of ') };
}
function fracDecQ(p, lang) {
  var table = [['1/2', 0.5], ['1/4', 0.25], ['3/4', 0.75], ['1/10', 0.1], ['1/5', 0.2], ['2/5', 0.4], ['3/10', 0.3], ['1/100', 0.01], ['7/10', 0.7], ['3/5', 0.6]];
  var row = pickOne(table);
  var wrong = shuffle(table.filter(function (r) { return r[1] !== row[1]; })).slice(0, 3);
  return { prompt: row[0] + ' = ?', answer: String(row[1]), options: [fmtNum(row[1], lang), fmtNum(wrong[0][1], lang), fmtNum(wrong[1][1], lang), fmtNum(wrong[2][1], lang)], optionValues: [String(row[1]), String(wrong[0][1]), String(wrong[1][1]), String(wrong[2][1])], worked: row[0] + ' = ' + row[0].replace('/', ' ÷ ') + ' = ' + fmtNum(row[1], lang) + '.' };
}
function percentQ(p, lang) {
  var pc = pickOne(p.ps), n = rnd(2, Math.floor(p.max / 4)) * 4, ans = n * pc / 100;
  return { prompt: pc + (isFr(lang) ? ' % de ' : '% of ') + n + ' = ?', answer: String(ans), options: [String(ans), String(n / 10), String(n / 2), String(n - ans)], worked: percentWorked(pc, n, lang) };
}
function roundQ(p, lang) {
  if (p.decimals) {
    var to = pickOne(p.to);
    var cents = rnd(101, 999), n = cents / 100;
    var ans = to === 1 ? Math.round(n) : Math.round(n * 10) / 10;
    var prompt = (isFr(lang) ? 'Arrondis ' : 'Round ') + fmtNum(n, lang) + (to === 1 ? (isFr(lang) ? ' à l’unité' : ' to the nearest whole') : (isFr(lang) ? ' au dixième' : ' to the nearest tenth'));
    var trunc = to === 1 ? Math.floor(n) : Math.floor(n * 10) / 10;
    return { prompt: prompt, answer: String(ans), options: [fmtNum(ans, lang), fmtNum(trunc, lang), fmtNum(n, lang), fmtNum(ans + (to === 1 ? 1 : 0.1), lang)], optionValues: [String(ans), String(trunc), String(n), String(Math.round((ans + (to === 1 ? 1 : 0.1)) * 10) / 10)], worked: roundDecWorked(cents, to, ans, lang) };
  }
  var t = pickOne(p.to), m = rnd(t + 1, p.max), a2 = Math.round(m / t) * t;
  return { prompt: (isFr(lang) ? 'Arrondis ' : 'Round ') + fmtNum(m, lang) + (isFr(lang) ? ' à la ' + (t === 10 ? 'dizaine' : 'centaine') : ' to the nearest ' + t), answer: String(a2), options: [fmtNum(a2, lang), fmtNum(Math.floor(m / t) * t, lang), fmtNum(a2 + t, lang), fmtNum(m, lang)], optionValues: [String(a2), String(Math.floor(m / t) * t), String(a2 + t), String(m)], worked: roundIntWorked(m, t, a2, lang) };
}
function balanceQ(p, lang) {
  var a = rnd(2, p.max), b = rnd(2, p.max), c = rnd(1, a + b - 1), ans = a + b - c;
  return { prompt: a + ' + ' + b + ' = ? + ' + c, answer: String(ans), options: [String(ans), String(a + b), String(a + b + c), String(c)], worked: balanceWorked(a, b, c, lang) };
}
function orderOpsQ(p, lang) {
  var a = rnd(2, p.max), b = rnd(2, p.max), c = rnd(2, 9), ans = a + b * c, wrong = (a + b) * c;
  return { prompt: a + ' + ' + b + ' × ' + c + ' = ?', answer: String(ans), options: [String(ans), String(wrong), String(ans + c), String(a * b + c)], worked: orderWorked(a, b, c, lang) };
}
function mulSmallQ(p, lang) {
  var n = rnd(2, 12) * 2, f = pickOne([0.5, 0.1, 0.25, 0.2]), ans = Math.round(n * f * 1000) / 1000;
  var prompt = n + ' × ' + fmtNum(f, lang) + ' = ?';
  return { prompt: prompt, answer: String(ans), options: [fmtNum(ans, lang), fmtNum(n * f * 10, lang), fmtNum(n * 2, lang), fmtNum(n + f, lang)], optionValues: [String(ans), String(Math.round(n * f * 10000) / 1000), String(n * 2), String(n + f)], worked: mulSmallWorked(n, f, ans, lang) };
}
function divSmallQ(p, lang) {
  var n = rnd(2, 12), f = pickOne([0.5, 0.1, 0.25]), ans = Math.round(n / f * 1000) / 1000;
  var prompt = n + ' ÷ ' + fmtNum(f, lang) + ' = ?';
  return { prompt: prompt, answer: String(ans), options: [fmtNum(ans, lang), fmtNum(n * f, lang), fmtNum(n / 2, lang), fmtNum(n, lang)], optionValues: [String(ans), String(n * f), String(n / 2), String(n)], worked: divSmallWorked(n, f, ans, lang) };
}
function fracQuotientQ(p, lang) {
  var table = [['3/4', 0.75], ['1/2', 0.5], ['1/4', 0.25], ['1/5', 0.2], ['2/5', 0.4], ['3/5', 0.6], ['1/8', 0.125], ['5/4', 1.25], ['3/2', 1.5], ['7/10', 0.7]];
  var row = pickOne(table), wrong = shuffle(table.filter(function (r) { return r[1] !== row[1]; })).slice(0, 3);
  var prompt = row[0].replace('/', ' ÷ ') + ' = ?';
  return { prompt: prompt, answer: String(row[1]), options: [fmtNum(row[1], lang), fmtNum(wrong[0][1], lang), fmtNum(wrong[1][1], lang), fmtNum(wrong[2][1], lang)], optionValues: [String(row[1]), String(wrong[0][1]), String(wrong[1][1]), String(wrong[2][1])], worked: row[0].replace('/', ' ÷ ') + ' = ' + row[0] + ' = ' + fmtNum(row[1], lang) + '.' };
}
function fracTimesIntQ(p, lang) {
  var den = pickOne([2, 3, 4, 5, 8]), num = rnd(1, den - 1), unit = rnd(2, Math.floor(p.max / den)), n = unit * den, ans = unit * num;
  return { prompt: num + '/' + den + ' × ' + n + ' = ?', answer: String(ans), options: [String(ans), String(unit), String(n * num), String(ans + unit)], worked: fractionOfWorked(num, den, n, lang, ' × ') };
}
function proportionQ(p, lang) {
  var unit = rnd(2, p.max), a = rnd(2, 6), b; do { b = rnd(2, 9); } while (b === a);
  var prompt = isFr(lang)
    ? a + ' cahiers coûtent ' + (a * unit) + ' €. Combien coûtent ' + b + ' cahiers ?'
    : a + ' notebooks cost ' + (a * unit) + ' €. How much do ' + b + ' notebooks cost?';
  var ans = b * unit;
  return { prompt: prompt, answer: String(ans), options: [String(ans), String(a * unit + b), String(b * a), String(ans + unit)], worked: proportionWorked(a, b, unit, lang) };
}
var KEY_SETS = {
  azerty: { home: 'qsdfjklm', top: 'azertyuiop', bottom: 'wxcvbn', digits: '0123456789' },
  qwerty: { home: 'asdfjkl', top: 'qwertyuiop', bottom: 'zxcvbnm', digits: '0123456789' }
};
// RKT-008 AC7: a UK keyboard drills the same letters as a US one; it is its own name only so the child's choice is kept.
KEY_SETS['qwerty-uk'] = KEY_SETS.qwerty;
function typingKeysQ(p, lang, layout) {
  var sets = KEY_SETS[layout] || KEY_SETS.azerty;
  var keys = sets[p.keys] || sets.home;
  var len = Number(p.length) || 1;
  var word = '';
  for (var i = 0; i < len; i++) word += keys.charAt(Math.floor(Math.random() * keys.length));
  return { prompt: word, answer: word, options: [], typedOnly: true, typing: true };
}
function typingWordsQ(p, lang, layout, wordLists) {
  var list = null;
  for (var i = 0; i < (wordLists || []).length; i++) if (wordLists[i].lang === (isFr(lang) ? 'fr' : 'en')) list = wordLists[i].words;
  list = (list || ['rocket']).filter(function (w) { return w.length >= (p.minLen || 1) && w.length <= (p.maxLen || 99); });
  if (!list.length) list = ['rocket'];
  var count = Number(p.words) || 1, out = [];
  for (var k = 0; k < count; k++) out.push(pickOne(list));
  var word = out.join(' ');
  return { prompt: word, answer: word, options: [], typedOnly: true, typing: true };
}
function customQ(items) {
  var it = pickOne(items && items.length ? items : [{ q: '2 + 2 = ?', a: '4' }]);
  var opts = Array.isArray(it.opts) && it.opts.length ? it.opts.slice() : [];
  if (opts.length && opts.indexOf(String(it.a)) === -1) opts.push(String(it.a));
  return { prompt: String(it.q || ''), answer: String(it.a === undefined ? '' : it.a), options: opts, typedOnly: !opts.length };
}
function generate(skill, lang, layout, wordLists) {
  var p = skill.params || {};
  switch (skill.generator) {
    case 'table': return tableQ(p, lang);
    case 'add': return addQ(p, lang);
    case 'sub': return subQ(p, lang);
    case 'bond': return bondQ(p, lang);
    case 'doubleHalf': return doubleHalfQ(p, lang);
    case 'pow10': return pow10Q(p, lang);
    case 'mulBy': return mulByQ(p, lang);
    case 'divBy': return divByQ(p, lang);
    case 'euclid': return euclidQ(p, lang);
    case 'bigNumber': return bigNumberQ(p, lang);
    case 'placeValue': return placeValueQ(p, lang);
    case 'compareInt': return compareIntQ(p, lang);
    case 'decCompare': return decCompareQ(p, lang);
    case 'fracCompare': return fracCompareQ(p, lang);
    case 'fracOf': return fracOfQ(p, lang);
    case 'fracDec': return fracDecQ(p, lang);
    case 'percent': return percentQ(p, lang);
    case 'round': return roundQ(p, lang);
    case 'balance': return balanceQ(p, lang);
    case 'orderOps': return orderOpsQ(p, lang);
    case 'mulSmall': return mulSmallQ(p, lang);
    case 'divSmall': return divSmallQ(p, lang);
    case 'fracQuotient': return fracQuotientQ(p, lang);
    case 'fracTimesInt': return fracTimesIntQ(p, lang);
    case 'proportion': return proportionQ(p, lang);
    case 'typingKeys': return typingKeysQ(p, lang, layout);
    case 'typingWords': return typingWordsQ(p, lang, layout, wordLists);
    default: return { prompt: '2 + 2 = ?', answer: '4', options: ['4', '3', '5', '22'] };
  }
}
`;

export const PICK_QUESTION_SCRIPT = `${HELPERS}${GENERATORS}
// The nudge: read so the port exists; a Counter wired here re-runs the pick.
Outputs.nonce = Number(Inputs.nonce) || 0;

var curriculum = Inputs.curriculum || [];
var model = Inputs.model && typeof Inputs.model === 'object' ? Inputs.model : { rating: 0, skills: {}, lastSkill: '' };
var skills = model.skills || {};
var level = String(Inputs.level || 'CE2');
var lang = isFr(Inputs.lang) ? 'fr' : 'en';
var layout = String(Inputs.layout || (lang === 'fr' ? 'azerty' : 'qwerty'));
var mode = String(Inputs.mode || 'maths');
var answerMode = String(Inputs.answerMode || 'auto');
var now = Date.now();
var li = levelIndex(level);
var r = Number(model.rating) || (LEVEL_BASE[level] + 50);

var q, skill;
if (mode !== 'custom' && !curriculum.length) {
  // Nothing to ask yet (the curriculum has not arrived): an honest blank, not a throw.
  skill = { id: 'none', name: { en: '', fr: '' }, strategy: { en: '', fr: '' }, teach: '', fluentMs: 4000, level: level, diff: 0.5, answer: 'typed' };
  q = { prompt: '', answer: '', options: [], typedOnly: true };
} else if (mode === 'custom') {
  var items = Inputs.customSet || [];
  q = customQ(items);
  skill = { id: 'custom', name: { en: 'My questions', fr: 'Mes questions' }, strategy: { en: '', fr: '' }, teach: '', fluentMs: 6000, level: level, diff: 0.5, answer: 'either' };
} else {
  var wanted = mode === 'typing' ? ['typing'] : mode === 'mixed' ? ['calc', 'number', 'typing'] : ['calc', 'number'];
  var candidates = [];
  for (var i = 0; i < curriculum.length; i++) {
    var sk = curriculum[i];
    if (wanted.indexOf(sk.strand) === -1) continue;
    var si = levelIndex(sk.level);
    var st = skills[sk.id];
    if (si > li) continue;
    if (si < li - 1) { if (!st || st.m < 3) { if (si < li - 1 && (!st || st.n > 0)) continue; } else continue; }
    if (si === li - 1 && st && st.m >= 3 && !(st.due <= now)) continue;
    candidates.push(sk);
  }
  if (!candidates.length) candidates = curriculum.filter(function (sk) { return wanted.indexOf(sk.strand) !== -1; });
  if (!candidates.length) candidates = curriculum.slice();

  // A due review first — the most overdue one.
  var due = null, dueBy = 0;
  for (var j = 0; j < candidates.length; j++) {
    var cs = skills[candidates[j].id];
    if (cs && cs.m > 0 && cs.due && cs.due <= now && candidates[j].id !== model.lastSkill) {
      var over = now - cs.due;
      if (!due || over > dueBy) { due = candidates[j]; dueBy = over; }
    }
  }
  if (due) skill = due;
  else {
    // Otherwise a weighted draw, peaking where the child is predicted ~75% right.
    var total = 0, weights = [];
    for (var k = 0; k < candidates.length; k++) {
      var c = candidates[k], cst = skills[c.id];
      var d = cst && cst.d ? cst.d : skillBase(c);
      var p = predict(r, d);
      var w = Math.exp(-Math.pow((p - 0.75) / 0.15, 2)) + 0.05;
      if (!cst) w += 0.15;                                  // unseen at this level: meet it
      if (cst && cst.m >= 3) w *= 0.3;                       // mastered: rarely, until due
      if (c.id === model.lastSkill && candidates.length > 1) w = 0;   // never twice running
      weights.push(w); total += w;
    }
    var roll = Math.random() * total, acc = 0; skill = candidates[candidates.length - 1];
    for (var m = 0; m < candidates.length; m++) { acc += weights[m]; if (roll <= acc) { skill = candidates[m]; break; } }
  }
  q = generate(skill, lang, layout, Inputs.wordLists);
}

var state = skills[skill.id];
var itemDiff = state && state.d ? state.d : skillBase(skill);
// Buttons or a box: an 'options' skill always gets buttons (nobody types "1/3");
// a profile set to 'options' gets buttons wherever the generator offers them
// (CE2, or a child who is not typing yet); 'either' (a custom set with choices)
// gets buttons unless the profile insists on typing.
var useOptions = !q.typedOnly && !!(q.options && q.options.length) &&
  (skill.answer === 'options' || answerMode === 'options' || (skill.answer === 'either' && answerMode !== 'typed'));
var options = [], optionValues = [];
if (useOptions && q.options && q.options.length) {
  var pairs = [];
  var seen = {};
  for (var o = 0; o < q.options.length; o++) {
    var label = String(q.options[o]);
    var value = q.optionValues ? String(q.optionValues[o]) : label;
    if (seen[normalise(value)]) continue;
    seen[normalise(value)] = true;
    pairs.push({ label: label, value: value });
  }
  pairs = shuffle(pairs);
  for (var o2 = 0; o2 < pairs.length; o2++) { options.push(pairs[o2].label); optionValues.push(pairs[o2].value); }
}

Outputs.skillId = skill.id;
Outputs.skillName = pickText(skill.name, lang);
Outputs.prompt = q.prompt;
Outputs.answer = q.answer;
Outputs.options = options;
Outputs.optionValues = optionValues;
// The same choices as rows, for a For Each: { label, value }.
var choices = [];
for (var c2 = 0; c2 < options.length; c2++) choices.push({ id: 'o' + c2 + '-' + optionValues[c2], label: options[c2], value: optionValues[c2] });
Outputs.choices = choices;
Outputs.kind = options.length ? 'options' : 'typed';
Outputs.isTyping = !!q.typing;
Outputs.nextKey = q.typing ? q.answer.charAt(0) : '';
// RKT-005: the answer pad's keys. A numeric answer gets the ten digits and this language's decimal point (the grader takes
// either); a typing question gets the accented letters its word list actually uses, so a word with a new accent grows the strip.
var padNumeric = !q.typing && /^-?\\d+(\\.\\d+)?$/.test(normalise(q.answer));
var padKeys = '';
if (q.typing) {
  var accents = [];
  for (var wl = 0; wl < (Inputs.wordLists || []).length; wl++) {
    if (!Inputs.wordLists[wl] || Inputs.wordLists[wl].lang !== (isFr(lang) ? 'fr' : 'en')) continue;
    var letters = (Inputs.wordLists[wl].words || []).join('').toLowerCase();
    for (var li = 0; li < letters.length; li++) {
      var letter = letters.charAt(li);
      if (letter !== letter.toUpperCase() && !/[a-z]/.test(letter) && accents.indexOf(letter) === -1) accents.push(letter);
    }
  }
  padKeys = accents.sort().join('');
} else if (padNumeric) {
  padKeys = '1234567890' + (isFr(lang) ? ',' : '.') + (/^-/.test(String(q.answer)) || String(Inputs.mode) === 'custom' ? '-' : '');
}
Outputs.padKeys = padKeys;
Outputs.padNumeric = padNumeric;
Outputs.fluentMs = Number(skill.fluentMs) || 4000;
// TPL-007 §16: in Monster Gate the walk is the clock, so a monster that crept closer arrives sooner. Only a scale in (0, 1] is heard,
// and the race sends none.
var limitScale = Number(Inputs.limitScale);
if (!(limitScale > 0 && limitScale <= 1)) limitScale = 1;
Outputs.limitMs = Math.round((Number(skill.fluentMs) || 4000) * ${LIMIT_FACTOR} * limitScale);
Outputs.strategy = pickText(skill.strategy, lang);
Outputs.teach = skill.teach || '';
// RKT-004: this question worked through in its own numbers ('' for a typing drill or a custom set).
// Looked at, build 1: "donc 3 + 10 =" ended a line and "13." began the next. An equals sign keeps both its neighbours.
Outputs.worked = String(q.worked || '').replace(/ = /g, '\u00a0=\u00a0');
Outputs.itemDiff = itemDiff;
Outputs.predicted = Math.round(predict(r, itemDiff) * 100) / 100;
Outputs.shownAt = now;
`;

// ── Grade an answer ─────────────────────────────────────────────────────────

export const GRADE_ANSWER_SCRIPT = `${HELPERS}${STAR_HELPERS}${COMEBACK_HELPERS}
var model = Inputs.model && typeof Inputs.model === 'object' ? JSON.parse(JSON.stringify(Inputs.model)) : { rating: 0, skills: {}, lastSkill: '' };
if (!model.skills) model.skills = {};
// RKT-010: migrate BEFORE this answer moves any mastery, so the grant is for levels reached before today.
model = withStars(model);
var skillId = String(Inputs.skillId || '');
var level = String(Inputs.level || 'CE2');
var lang = isFr(Inputs.lang) ? 'fr' : 'en';
var timedOut = Inputs.timedOut === true;
var answer = Inputs.answer;
var typed = Inputs.typed;
var fluentMs = Number(Inputs.fluentMs) || 4000;
var itemDiff = Number(Inputs.itemDiff) || (LEVEL_BASE[level] + 100);
var shownAt = Number(Inputs.shownAt) || Date.now();
var elapsed = Math.max(0, Date.now() - shownAt);
if (Number(Inputs.elapsedOverride) > 0) elapsed = Number(Inputs.elapsedOverride);

// 🔴 RKT-012: a typing pad refuses a wrong key, so the word always ends spelled right, and the keys it refused grade the accuracy.
// None: graded as before. One or two: right, never fluent. MISTAKES_WRONG or more: a miss, so the word comes back sooner.
var MISTAKES_WRONG = 3;
var mistakes = Math.max(0, Math.floor(Number(Inputs.mistakes) || 0));
var spelled = !timedOut && sameAnswer(typed, answer);
var correct = spelled && mistakes < MISTAKES_WRONG;
var fluent = correct && elapsed <= fluentMs && mistakes === 0;
var s = fluent ? 1 : correct ? 0.7 : 0;

var r = Number(model.rating) || (LEVEL_BASE[level] + 50);
var st = model.skills[skillId] || { d: itemDiff, n: 0, streak: 0, miss: 0, last: [], hl: 1, due: 0, m: 0, best: 0, fluentRun: 0, paid: 0 };
var p = predict(r, st.d || itemDiff);
var K = st.n < 10 ? 40 : 24;
var before = r;
r = r + K * (s - p);
st.d = (st.d || itemDiff) - 16 * (s - p);
st.n += 1;
st.last = (st.last || []).concat([correct ? 1 : 0]).slice(-10);
if (correct) { st.streak += 1; st.miss = 0; st.fluentRun = fluent ? st.fluentRun + 1 : 0; if (fluent && (!st.best || elapsed < st.best)) st.best = elapsed; }
else { st.streak = 0; st.miss += 1; st.fluentRun = 0; }

// Spacing: a half-life in days, doubled by a correct, halved by a miss.
var hl = Number(st.hl) || 1;
hl = correct ? hl * (fluent ? 2.5 : 2) : Math.max(0.25, hl / 2);
st.hl = Math.min(hl, 120);
st.due = Date.now() + st.hl * 86400000;

// Mastery: 0 new · 1 familiar · 2 proficient · 3 mastered — with demotion.
var wasDue = Inputs.wasDue === true;
var acc10 = st.last.reduce(function (a, b) { return a + b; }, 0) / st.last.length;
var m = st.m || 0;
if (st.miss >= 2 && m > 0) m -= 1;
else if (m === 0 && st.n >= 5 && acc10 >= 0.7) m = 1;
else if (m === 1 && st.streak >= 5 && st.fluentRun >= 3) m = 2;
else if (m === 2 && correct && wasDue) m = 3;
st.m = m;

// 🔴 RKT-010: a right answer pays the same fast or slow (speed already moved the rocket), and a mastery level pays only the FIRST
// time it is reached: paid is the highest level already paid for, so a demotion and a re-promotion pay nothing. Player two's turns
// pay nothing, because they are graded into this profile's model (D63), but they still mark a level paid so it is never paid later.
var forB = Inputs.forB === true;
var paidLevel = Number(st.paid) || 0;
var levelStars = m > paidLevel ? STAR_RULE.level * (m - paidLevel) : 0;
if (m > paidLevel) st.paid = m;
var rightStars = correct ? STAR_RULE.right : 0;
var starsEarned = forB ? 0 : rightStars + levelStars;
model.stars += starsEarned;
// This race so far, under the id Race/Play mints at every start: the longest run of right answers, and what the answers paid.
var raceId = String(Inputs.raceId || '');
if (!model.race || model.race.id !== raceId) model.race = { id: raceId, run: 0, bestRun: 0, rightStars: 0, levelStars: 0, chain: 0, turbo: Math.max(0, Math.floor(Number(Inputs.startTurbo) || 0)) };
if (!forB) {
  model.race.run = correct ? model.race.run + 1 : 0;
  model.race.bestRun = Math.max(model.race.bestRun, model.race.run);
  model.race.rightStars += rightStars;
  model.race.levelStars += levelStars;
}

model.rating = Math.round(r);
model.skills[skillId] = st;
model.lastSkill = skillId;
model.answered = (Number(model.answered) || 0) + 1;

var speed = fluent ? 1 : Math.max(0.5, 1 - (elapsed - fluentMs) / (2 * fluentMs));

// 🔴 PLY-006, and RKT-007's rule still holds: ONE formula. Everything the verdict line says about this answer is read
// off the numbers computed here, and nothing downstream recomputes any of it.
var myAt = Math.max(0, Number(Inputs.myAt) || 0);
var cpuAt = Math.max(0, Number(Inputs.cpuAt) || 0);
var gap = cpuAt - myAt;
var behind = gap >= COMEBACK.behindFrom;
// The chain lives under the race id, beside the stars this race has paid, so a new race starts it clean.
var chain = chainOf(model.race);
if (!forB) {
  if (correct) {
    chain.run += 1;
    if (chain.run >= COMEBACK.chainAt && chain.turbo < 1) { chain.turbo = 1; chain.run = 0; }
  } else chain.run = 0;
}
// A turbo is spent only when the child asks for it, only on a right answer, and only while behind.
var turboUsed = correct && !forB && Inputs.useTurbo === true && behind && chain.turbo > 0;
if (turboUsed) chain.turbo -= 1;
var slip = correct ? slipstream(gap) : 1;
// 🔴 Not named boost: that name is already the verdict LINE further down, and reusing it made the multiplier a string.
var turboMult = turboUsed ? COMEBACK.turboMult : 1;
var gain = correct ? ${RACE_STEP} * speed * slip * turboMult : 0;
// 🔴 Persisted HERE, not in the stars block above: the chain is computed in this block, and writing it earlier read an
// undefined chain (var hoists, the value does not).
model.race.chain = chain.run;
model.race.turbo = chain.turbo;
var cpuGain = ${RACE_STEP} * (0.35 + 0.35 * p);

// 🔴 RKT-007: the child is told why the rocket went as far as it did. ONE formula: the percentage said is the \`speed\` that moved
// the rocket, so the line can never tell a different story from the track. Nothing downstream recomputes it.
var boostPct = Math.round(speed * 100);
var secs = (Math.round(elapsed / 100) / 10).toFixed(1);
if (isFr(lang)) secs = secs.replace('.', ',');
var boost = timedOut ? (isFr(lang) ? 'Ta fusée ne bouge pas' : 'Your rocket stays put')
  : !correct ? (isFr(lang) ? 'Pas de turbo' : 'No boost')
  : fluent ? '⚡ ' + secs + ' s · ' + (isFr(lang) ? 'turbo à fond' : 'full boost')
  : secs + ' s · ' + (isFr(lang) ? 'turbo ' + boostPct + ' %' : 'boost ' + boostPct + '%');

// TPL-007 §16: in Monster Gate there is no rocket. Beat it to the gate turns the speed into a hit (quick: a big one, slow: a small one,
// and the meter says half); Push it back turns the same speed into a push. The race sends no Game and keeps its words.
var game = String(Inputs.game || 'race');
if (game === 'gate') {
  boostPct = fluent ? 100 : 50;
  boost = !correct ? (isFr(lang) ? 'Pas de coup' : 'No hit')
    : fluent ? '⚡ ' + secs + ' s · ' + (isFr(lang) ? 'grand coup' : 'big hit')
    : secs + ' s · ' + (isFr(lang) ? 'petit coup' : 'small hit');
} else if (game === 'push') {
  boost = !correct ? (isFr(lang) ? 'Pas de poussée' : 'No push')
    : fluent ? '⚡ ' + secs + ' s · ' + (isFr(lang) ? 'poussée à fond' : 'full push')
    : secs + ' s · ' + (isFr(lang) ? 'poussée ' + boostPct + ' %' : 'push ' + boostPct + '%');
}

// PLY-006: one or two more clauses on the line, each only when it is true. After the gate/push branches, so every
// game says it the same way.
if (turboUsed) boost = boost + (isFr(lang) ? ' · ⚡⚡ turbo lancé' : ' · ⚡⚡ turbo fired');
if (slip > 1) boost = boost + (isFr(lang) ? ' · 🌀 aspiration +' + Math.round((slip - 1) * 100) + ' %' : ' · 🌀 slipstream +' + Math.round((slip - 1) * 100) + '%');

var shownAnswer = String(answer);
var strategy = String(Inputs.strategy || '');
// 🔴 RKT-004: the correction works the numbers that were asked. The skill's strategy is a fixed example with its own numbers,
// so it is said only where there is no worked line (a typing drill, whose tip has no numbers).
var worked = String(Inputs.worked || '');
// RKT-005: a French pad writes 2,5, so the correction says 2,5 (the model stores 2.5), with thousands grouped the way the prompt groups them.
var toLang = function (numberText) {
  if (!/^\\d+(\\.\\d+)?$/.test(numberText)) return numberText;
  var sides = numberText.split('.');
  return fmtNum(Number(sides[0]), lang) + (sides[1] ? (isFr(lang) ? ',' : '.') + sides[1] : '');
};
shownAnswer = toLang(shownAnswer);
// RKT-003 §3, built in RKT-005: the child's own answer beside the right one. Said as they entered it; a timeout has none.
var said = timedOut ? '' : String(typed === undefined || typed === null ? '' : typed).trim();
if (isFr(lang) && /^\\d+\\.\\d+$/.test(said)) said = said.replace('.', ',');
// A child can type anything; the verdict shares one screen with the track, so the echo is bounded (RKT-003 foldWorst holds the longest).
if (said.length > 12) said = said.slice(0, 11) + '…';
var message = '';
// RKT-012: spelled right with too many wrong keys. "You answered rocket. The answer was rocket." would say nothing.
if (!correct && spelled) message = (isFr(lang) ? mistakes + ' touches fausses. Cherche la touche allumée avant d’appuyer.' : mistakes + ' wrong keys. Find the lit key before you press it.') + (strategy ? ' ' + strategy : '');
else if (!correct) message = (said ? (isFr(lang) ? 'Tu as répondu ' : 'You answered ') + said + '. ' : '') + (isFr(lang) ? 'La réponse était ' : 'The answer was ') + shownAnswer + '.' + (worked ? ' ' + worked : strategy ? ' ' + strategy : '');

Outputs.correct = correct;
Outputs.fluent = fluent;
Outputs.outcome = timedOut ? 'timeout' : fluent ? 'fluent' : correct ? 'correct' : 'wrong';
Outputs.elapsedMs = elapsed;
Outputs.model = model;
Outputs.gain = Math.round(gain * 1000) / 1000;
Outputs.speed = correct ? Math.round(speed * 1000) / 1000 : 0;
Outputs.boost = boost;
// The meter is this same number, wired straight into a percentage width.
Outputs.boostPct = correct ? boostPct : 0;
Outputs.cpuGain = Math.round(cpuGain * 1000) / 1000;
// PLY-006: the comeback, said in the same numbers that moved the rocket.
Outputs.slip = Math.round(slip * 1000) / 1000;
Outputs.slipPct = slip > 1 ? Math.round((slip - 1) * 100) : 0;
Outputs.behind = behind;
Outputs.turboUsed = turboUsed;
Outputs.chain = chain.run;
Outputs.turbo = chain.turbo;
Outputs.chainReady = chain.turbo > 0;
Outputs.chainOf = COMEBACK.chainAt;
Outputs.message = message;
Outputs.mastery = m;
Outputs.ratingDelta = Math.round(r - before);
Outputs.streak = st.streak;
Outputs.missCount = st.miss;
Outputs.starsEarned = starsEarned;
Outputs.stars = model.stars;
`;

// ── Make Ten Merge ──────────────────────────────────────────────────────────

/**
 * What a new tile can be (§2.2 B: "new tiles are drawn from the bonds the profile is weakest on"), by the three bond skills in
 * `Data/Curriculum`. Single numbers (pairs that make 10) always. Teens (pairs that make 20, 13 + 7) from CM1, or once pairs to 10
 * are proficient. Fives to 95 (pairs that make 100, 35 + 65) from CM2, or once pairs to 20 are proficient. The weakest group in
 * play (the lowest mastery, the easier one on a tie) is drawn twice as often. The scripts and the engine gate both read this.
 */
export const MERGE_POOL_GROUPS = [
  { skill: 'bond-10', fromLevel: 0, after: '', tiles: [1, 2, 3, 4, 5, 6, 7, 8, 9] },
  { skill: 'bond-20', fromLevel: 1, after: 'bond-10', tiles: [11, 12, 13, 14, 15, 16, 17, 18, 19] },
  { skill: 'bond-100', fromLevel: 2, after: 'bond-20', tiles: [5, 15, 25, 35, 45, 55, 65, 75, 85, 95] }
] as const;

/**
 * What a finished Make Ten board pays (RKT-010's table, for the second game). A join is a bond made: one star each, capped at about
 * a race's answers, so a long board does not outrun the hangar's curve. Finishing a board pays what landing a race pays.
 */
export const MERGE_STAR_RULE = { join: 1, joinCap: 15, finish: STAR_RULE.finish } as const;

/**
 * Make Ten Merge's two modes. Richard, 2026-09-14: "it's bloody hard … can we make an easy and hard mode?" (ruled: Easy + Hard, Easy the
 * default). Helper is the chance a new tile is the partner, from the pool, of a single number already on the board. Simulated over 3,000
 * CE2 boards for a player who always takes the most joins: helper 0 (Hard, the game as first built) gives a median of 21 moves and a
 * 100 tile on 3% of boards; helper 0.5 (Easy) gives 37 moves and 48%.
 */
export const MERGE_MODES = { easy: { helper: 0.5 }, hard: { helper: 0 } } as const;

/**
 * The board is 16 numbers, row-major, 0 = empty. Tiles slide in the direction
 * pressed; two tiles that meet **merge only when their sum is a multiple of
 * ten** (7+3, 14+6, 25+25) and become that sum. Everything else stays apart —
 * that is the whole difference from 2048, and it is what makes it drill bonds.
 */
export const MERGE_RULE = `
function canMerge(a, b) { return a > 0 && b > 0 && (a + b) % 10 === 0; }
function slideLine(line) {
  var tiles = line.filter(function (v) { return v > 0; });
  var out = [], joined = [], score = 0, merges = 0;
  for (var i = 0; i < tiles.length; i++) {
    if (i + 1 < tiles.length && canMerge(tiles[i], tiles[i + 1])) { joined.push(out.length); out.push(tiles[i] + tiles[i + 1]); score += tiles[i] + tiles[i + 1]; merges++; i++; }
    else out.push(tiles[i]);
  }
  while (out.length < 4) out.push(0);
  return { line: out, joined: joined, score: score, merges: merges };
}
function lines(board, dir) {
  var out = [];
  for (var i = 0; i < 4; i++) {
    var idx = [];
    for (var j = 0; j < 4; j++) {
      if (dir === 'left') idx.push(i * 4 + j);
      else if (dir === 'right') idx.push(i * 4 + (3 - j));
      else if (dir === 'up') idx.push(j * 4 + i);
      else idx.push((3 - j) * 4 + i);
    }
    out.push(idx);
  }
  return out;
}
function slide(board, dir) {
  var next = board.slice(), moved = false, score = 0, merges = 0, joined = [];
  var ls = lines(board, dir);
  for (var l = 0; l < ls.length; l++) {
    var idx = ls[l];
    var line = idx.map(function (i) { return board[i]; });
    var res = slideLine(line);
    for (var k = 0; k < 4; k++) { if (next[idx[k]] !== res.line[k]) moved = true; next[idx[k]] = res.line[k]; }
    for (var j = 0; j < res.joined.length; j++) joined.push(idx[res.joined[j]]);
    score += res.score; merges += res.merges;
  }
  return { board: next, moved: moved, score: score, merges: merges, joined: joined };
}
function anyMove(board) {
  var dirs = ['left', 'right', 'up', 'down'];
  for (var i = 0; i < dirs.length; i++) if (slide(board, dirs[i]).moved) return true;
  return false;
}
function spawnAt(board, pool, count, helper) {
  var next = board.slice(), at = [];
  var list = pool && pool.length ? pool : [1, 2, 3, 4, 5, 6, 7, 8, 9];
  for (var c = 0; c < count; c++) {
    var empties = [];
    for (var i = 0; i < 16; i++) if (next[i] === 0) empties.push(i);
    if (!empties.length) break;
    var cell = pickOne(empties);
    var value = pickOne(list);
    // A helper tile (Easy): the partner, from the pool, of a single number already on the board, so a join is always near.
    if (Number(helper) > 0 && Math.random() < Number(helper)) {
      var singles = [];
      for (var k = 0; k < 16; k++) if (next[k] > 0 && next[k] % 10 !== 0) singles.push(next[k]);
      if (singles.length) {
        var t = pickOne(singles);
        var partners = list.filter(function (w) { return (t + w) % 10 === 0; });
        if (partners.length) value = pickOne(partners);
      }
    }
    next[cell] = value;
    at.push(cell);
  }
  return { board: next, at: at };
}
function spawn(board, pool, count) { return spawnAt(board, pool, count, 0).board; }
var MERGE_MODES = ${JSON.stringify(MERGE_MODES)};
function modeOf(mode) { return String(mode) === 'hard' ? 'hard' : 'easy'; }
function biggestOf(board) { var b = 0; for (var i = 0; i < board.length; i++) if (board[i] > b) b = board[i]; return b; }
var MERGE_POOL_GROUPS = ${JSON.stringify(MERGE_POOL_GROUPS)};
function mergePool(level, model) {
  var li = levelIndex(level), skills = (model && model.skills) || {};
  var mOf = function (id) { return Number(skills[id] && skills[id].m) || 0; };
  var groups = MERGE_POOL_GROUPS.filter(function (g) { return li >= g.fromLevel || (!!g.after && mOf(g.after) >= 2); });
  var weakest = groups[0];
  for (var i = 1; i < groups.length; i++) if (mOf(groups[i].skill) < mOf(weakest.skill)) weakest = groups[i];
  var pool = [];
  for (var k = 0; k < groups.length; k++) for (var t = 0; t < (groups[k] === weakest ? 2 : 1); t++) pool = pool.concat(groups[k].tiles);
  return { pool: pool, skills: groups.map(function (g) { return g.skill; }), weakest: weakest.skill };
}
`;

export const SLIDE_MERGE_SCRIPT = `${HELPERS}${MERGE_RULE}
var was = Inputs.game && typeof Inputs.game === 'object' ? Inputs.game : null;
var board = ((was && Array.isArray(was.board) ? was.board : Inputs.board) || []).slice();
while (board.length < 16) board.push(0);
var dir = String(Inputs.dir || 'left');
var pool = Array.isArray(Inputs.pool) && Inputs.pool.length ? Inputs.pool : was && Array.isArray(was.pool) && was.pool.length ? was.pool : [1, 2, 3, 4, 5, 6, 7, 8, 9];
var res = slide(board, dir);
var next = res.board, landed = [];
var helper = typeof Inputs.helper === 'number' ? Inputs.helper : was && typeof was.helper === 'number' ? was.helper : 0;
if (res.moved) { var s = spawnAt(next, pool, 1, helper); next = s.board; landed = s.at; }
var biggest = biggestOf(next);
var over = !anyMove(next);
Outputs.board = next;
Outputs.moved = res.moved;
Outputs.score = res.score;
Outputs.merges = res.merges;
Outputs.biggest = biggest;
Outputs.gameOver = over;
// The game carries its own totals, so the one Variable holding it is the whole state. A fresh object every run, so it always publishes.
Outputs.game = {
  id: was && was.id ? String(was.id) : '',
  board: next,
  pool: pool,
  score: (was ? Number(was.score) || 0 : 0) + res.score,
  made: (was ? Number(was.made) || 0 : 0) + res.merges,
  biggest: biggest,
  moves: (was ? Number(was.moves) || 0 : 0) + (res.moved ? 1 : 0),
  over: over,
  joined: res.moved ? res.joined : [],
  landed: landed,
  mode: was && was.mode ? String(was.mode) : '',
  helper: helper
};
`;

/** A fresh board: two tiles from the pool the profile's bonds call for, and a new id, so the board is paid once (Logic/Finish merge). */
export const NEW_BOARD_SCRIPT = `${HELPERS}${MERGE_RULE}
var drawn = mergePool(Inputs.level, Inputs.model);
var pool = Array.isArray(Inputs.pool) && Inputs.pool.length ? Inputs.pool : drawn.pool;
var empty = [];
for (var i = 0; i < 16; i++) empty.push(0);
var mode = modeOf(Inputs.mode);
var helper = MERGE_MODES[mode].helper;
var s = spawnAt(empty, pool, 2, helper);
Outputs.board = s.board;
Outputs.pool = pool;
Outputs.game = { id: 'm' + Date.now().toString(36) + Math.floor(Math.random() * 1000000).toString(36), board: s.board, pool: pool, score: 0, made: 0, biggest: biggestOf(s.board), moves: 0, over: false, joined: [], landed: s.at, mode: mode, helper: helper };
Outputs.mode = mode;
`;

/**
 * The board as the graph draws it: four rows of four squares (TPL-005's nested repeaters), each with its number in the child's
 * language, what kind of number it is (the square's colour), and the class that pops a square that just joined or just landed.
 * The two class names swap on every move, so the same square can pop twice in a row.
 */
export const DRAW_MERGE_SCRIPT = `${HELPERS}
var g = Inputs.game && typeof Inputs.game === 'object' ? Inputs.game : {};
var lang = isFr(Inputs.lang) ? 'fr' : 'en';
var board = Array.isArray(g.board) ? g.board : [];
var joined = Array.isArray(g.joined) ? g.joined : [];
var landed = Array.isArray(g.landed) ? g.landed : [];
var beat = (Number(g.moves) || 0) % 2 === 0 ? 'a' : 'b';
var rows = [];
for (var r = 0; r < 4; r++) {
  var cells = [];
  for (var c = 0; c < 4; c++) {
    var i = r * 4 + c, n = Number(board[i]) || 0;
    var kind = n === 0 ? 'empty' : n % 10 !== 0 ? 'unit' : n === 10 ? 'ten' : n < 100 ? 'tens' : 'big';
    var fx = 'rkt-merge-tile' + (n && joined.indexOf(i) !== -1 ? ' rkt-join-' + beat : n && landed.indexOf(i) !== -1 ? ' rkt-land-' + beat : '');
    cells.push({ id: 'c' + i, word: n ? fmtNum(n, lang) : '', kind: kind, fx: fx });
  }
  rows.push({ id: 'r' + r, cells: cells });
}
var score = Number(g.score) || 0, made = Number(g.made) || 0, biggest = Number(g.biggest) || 0;
Outputs.rows = rows;
Outputs.score = score;
Outputs.made = made;
Outputs.biggest = biggest;
Outputs.over = g.over === true;
Outputs.phase = g.over === true ? 'over' : 'playing';
// Richard, 2026-09-14: a board that filled while a join was still there "doesn't say anything", and felt like the end. Full and not over
// is its own state, so the rule line gives way to a hint.
var filled = board.length === 16;
for (var f = 0; f < board.length; f++) if (!(Number(board[f]) > 0)) filled = false;
Outputs.fullness = filled && g.over !== true ? 'full' : 'roomy';
Outputs.scoreLine = lang === 'fr'
  ? 'Score ' + fmtNum(score, lang) + ' · Plus grande tuile ' + fmtNum(biggest, lang) + ' · Fusions ' + made
  : 'Score ' + fmtNum(score, lang) + ' · Biggest tile ' + fmtNum(biggest, lang) + ' · Joins ' + made;
`;

/**
 * What a finished board pays, under RKT-010's rules: nothing for speed, nothing random, nothing ever taken away. A join is a bond
 * made, so each pays a star, up to about a race's worth, and finishing a board pays what landing a race does. Keyed by the board's
 * id, so a second Finish for the same board pays nothing. A board abandoned with New game pays nothing (RKT-006's rule for Restart).
 */
export const FINISH_MERGE_SCRIPT = `${HELPERS}${STAR_HELPERS}${HANGAR_HELPERS}
var MERGE_STAR_RULE = ${JSON.stringify(MERGE_STAR_RULE)};
var model = Inputs.model && typeof Inputs.model === 'object' ? JSON.parse(JSON.stringify(Inputs.model)) : { rating: 0, skills: {}, lastSkill: '', answered: 0 };
model = withStars(model);
var g = Inputs.game && typeof Inputs.game === 'object' ? Inputs.game : {};
var fr = isFr(Inputs.lang);
var lang = fr ? 'fr' : 'en';
var made = Number(g.made) || 0, biggest = Number(g.biggest) || 0;
var joinStars = Math.min(made * MERGE_STAR_RULE.join, MERGE_STAR_RULE.joinCap);
var total = g.over === true ? joinStars + MERGE_STAR_RULE.finish : 0;
var id = g.id ? String(g.id) : '';
var paid = false;
if (total > 0 && id && model.lastMergeId !== id) { model.stars += total; model.lastMergeId = id; paid = true; }
var counted = !!id && model.lastMergeId === id;
Outputs.paid = paid;
Outputs.model = model;
Outputs.starsEarned = paid ? total : 0;
Outputs.stars = model.stars;
// PLY-002: the purse can buy something, so the end screen offers the hangar. (Was RKT-011's milestone crossing.)
Outputs.earnedPick = counted && purseOf(model) >= SHOP_FROM;
Outputs.won = biggest >= 100;
Outputs.starsText = total > 0 ? '+' + total + ' ⭐' : '';
var parts = [];
if (joinStars) parts.push((fr ? 'fusions +' : 'joins +') + joinStars + (made * MERGE_STAR_RULE.join > MERGE_STAR_RULE.joinCap ? (fr ? ' (le maximum)' : ' (the most a board pays)') : ''));
if (total) parts.push((fr ? 'grille finie +' : 'board finished +') + MERGE_STAR_RULE.finish);
Outputs.why = parts.join(' · ');
Outputs.headline = fr ? 'Plus aucun coup !' : 'No more moves!';
Outputs.line = fr
  ? 'Plus grande tuile : ' + fmtNum(biggest, lang) + ' · ' + made + (made === 1 ? ' fusion' : ' fusions')
  : 'Biggest tile: ' + fmtNum(biggest, lang) + ' · ' + made + (made === 1 ? ' join' : ' joins');
`;

// ── Number Hunt ─────────────────────────────────────────────────────────────

/** A hunt is this many grids, then its end card. */
export const HUNT_ROUNDS = 5;

/** Misses on one grid before "Show me one" is offered. A way shown pays nothing. */
export const HUNT_HELP_AFTER = 2;

/**
 * What a finished hunt pays (RKT-010's table, for the third game). A way the child found is a star, capped where a Make Ten board is
 * capped; finishing pays what landing a race pays. A way shown by "Show me one" pays nothing. An abandoned hunt pays nothing.
 */
export const HUNT_STAR_RULE = { way: 1, wayCap: 15, finish: STAR_RULE.finish } as const;

/**
 * P95 PLY-003 — the kinds of grid, and which class gets which.
 *
 * > "normally you have a 3 numbers addition variant, a multiplication, addition, maybe subtraction variant? In any
 * > case, more variations would be good, more or less depending on the kid's age" — Richard, 2026-09-18
 *
 * The first build had four kinds and three bands, and **CM2 and 6e shared one band** (`li === 0 ? … : li === 1 ? … : …`).
 * There are now eight kinds and a band per class. `op` is what the squares are joined by; `fixed` is a target that never
 * changes (pairs to 100, to 1000, to 1); `max` is the biggest number a square may hold, by class.
 *
 * Pinned to the 2025 programmes, as TPL-007 §1 requires: CE2 adds and subtracts and knows pairs to 100; CM1 adds the
 * tables; CM2 adds Euclidean division and pairs to 1000; 6e keeps those and adds tenths. The briefing's §3 has the
 * BO references.
 */
export const HUNT_KINDS = {
  add2: { count: 2, op: 'add', max: [15, 30, 50, 99] },
  add3: { count: 3, op: 'add', max: [15, 30, 50, 99] },
  sub2: { count: 2, op: 'sub', max: [20, 60, 100, 999] },
  mul2: { count: 2, op: 'mul', max: [10, 10, 12, 15] },
  div2: { count: 2, op: 'div', max: [0, 0, 60, 99] },
  add100: { count: 2, op: 'add', fixed: 100, max: [99, 99, 99, 99] },
  add1000: { count: 2, op: 'add', fixed: 1000, max: [0, 0, 950, 950] },
  /**
   * 🔴 Not "two tenths that make 1". That was the first try, and it FAILED about four times in five: with sixteen
   * squares drawn from 0,1–0,9 a grid holds about thirteen pairs that make 1, so it was rejected for having more
   * than three ways and fell back to `add2` — silently, which is how a 6e class quietly got CE2 sums. The pool is
   * 0,1–9,9 and the target floats, so the ways are few and the drill is real decimal addition.
   */
  dec: { count: 2, op: 'add', tenths: true, max: [0, 0, 99, 99] }
} as const;

/** The kinds each class draws from, in order CE2 · CM1 · CM2 · 6e. A kind repeated is a kind drawn more often. */
export const HUNT_LEVEL_KINDS: ReadonlyArray<ReadonlyArray<keyof typeof HUNT_KINDS>> = [
  ['add2', 'add2', 'add3', 'sub2', 'add100'],
  ['add2', 'add3', 'sub2', 'sub2', 'mul2', 'add100'],
  ['add3', 'sub2', 'mul2', 'div2', 'add100', 'add1000'],
  ['add3', 'sub2', 'mul2', 'div2', 'add1000', 'dec']
];

export const HUNT_RULE = `
var HUNT_ROUNDS = ${HUNT_ROUNDS};
var HUNT_HELP_AFTER = ${HUNT_HELP_AFTER};
var HUNT_KINDS = ${JSON.stringify(HUNT_KINDS)};
var HUNT_LEVEL_KINDS = ${JSON.stringify(HUNT_LEVEL_KINDS)};
function huntSpec(kind) { return HUNT_KINDS[kind] || HUNT_KINDS.add2; }
function huntRound2(v) { return Math.round(v * 100) / 100; }
function huntCombos(n, k) {
  var out = [];
  function rec(start, chosen) { if (chosen.length === k) { out.push(chosen.slice()); return; } for (var i = start; i < n; i++) { chosen.push(i); rec(i + 1, chosen); chosen.pop(); } }
  rec(0, []);
  return out;
}
/**
 * What a set of squares makes. 🔴 Subtraction and division are asked of the PAIR, not of the order it was tapped in:
 * the bigger takes the smaller, so a child who taps 3 then 12 has made the same 9 as one who tapped 12 then 3.
 * Division that does not come out exactly makes nothing — it can never equal a whole target.
 */
function huntValue(kind, values) {
  var spec = huntSpec(kind);
  if (!values.length) return 0;
  if (spec.op === 'mul') { var m = 1; for (var i = 0; i < values.length; i++) m = m * values[i]; return m; }
  if (spec.op === 'sub' || spec.op === 'div') {
    var hi = Math.max.apply(null, values), lo = Math.min.apply(null, values);
    if (spec.op === 'sub') return huntRound2(hi - lo);
    if (!lo || hi % lo !== 0) return NaN;
    return hi / lo;
  }
  var s = 0;
  for (var j = 0; j < values.length; j++) s = s + values[j];
  return huntRound2(s);
}
/** One square's value for this kind and class: a tenth for the decimals grid, a whole number otherwise. */
function huntCell(kind, max) { var spec = huntSpec(kind); return spec.tenths ? huntRound2(rnd(1, max) / 10) : rnd(spec.op === 'mul' ? 2 : 1, max); }
/**
 * 🔴 Some kinds will not turn up by chance. Sixteen random numbers almost never hold a pair that divides exactly, or two
 * multiples of 50 that make 1000, so those grids are PLANTED: one or two true pairs are written in, and the rest of the
 * grid is filled at random. The ways are then counted honestly over the whole grid, so a pair the filling happened to
 * create counts exactly like a planted one.
 */
function huntPlant(kind, cells, max) {
  var spec = huntSpec(kind);
  var pairs = rnd(1, 2);
  for (var n = 0; n < pairs; n++) {
    var a, b;
    if (spec.op === 'div') { var t = rnd(2, 12); b = rnd(2, Math.max(2, Math.floor(max / t))); a = b * t; }
    else if (spec.fixed === 1000) { b = rnd(1, 19) * 50; a = 1000 - b; }
    else if (spec.fixed === 100) { b = rnd(1, 99); a = 100 - b; }
    else continue;
    if (!(a > 0) || !(b > 0)) continue;
    var i1 = rnd(0, 15), i2 = rnd(0, 15);
    while (i2 === i1) i2 = rnd(0, 15);
    cells[i1] = a;
    cells[i2] = b;
  }
  return cells;
}
function huntTry(kind, li) {
  var spec = huntSpec(kind);
  var count = spec.count;
  var max = spec.max[Math.max(0, Math.min(spec.max.length - 1, li))];
  if (!(max > 0)) return null;
  var all = huntCombos(16, count);
  for (var attempt = 0; attempt < 400; attempt++) {
    var cells = [];
    for (var i = 0; i < 16; i++) cells.push(huntCell(kind, max));
    cells = huntPlant(kind, cells, max);
    var byValue = {};
    for (var c = 0; c < all.length; c++) {
      var v = huntValue(kind, all[c].map(function (k) { return cells[k]; }));
      if (!isFinite(v)) continue;
      if (!byValue[v]) byValue[v] = [];
      byValue[v].push(all[c]);
    }
    if (spec.fixed !== undefined) {
      var ways = byValue[spec.fixed];
      if (ways && ways.length >= 1 && ways.length <= 3) return { kind: kind, count: count, cells: cells, target: spec.fixed, ways: ways };
      continue;
    }
    var goods = [];
    for (var key in byValue) {
      var t = Number(key), n = byValue[key].length;
      if (n < 1 || n > 3) continue;
      // A target worth hunting: big enough that it is not the first thing you see, and never 1 (every square divides by itself).
      var floorFor = spec.op === 'mul' ? 12 : spec.op === 'div' ? 2 : spec.op === 'sub' ? 5 : spec.tenths ? 3 : 10;
      if (t >= floorFor) goods.push(t);
    }
    if (goods.length) { var target = pickOne(goods); return { kind: kind, count: count, cells: cells, target: target, ways: byValue[target] }; }
  }
  return null;
}
function huntGrid(level) {
  var li = levelIndex(level);
  var kinds = HUNT_LEVEL_KINDS[Math.max(0, Math.min(HUNT_LEVEL_KINDS.length - 1, li))];
  var grid = huntTry(pickOne(kinds), li) || huntTry('add2', li);
  if (!grid) grid = { kind: 'add2', count: 2, cells: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16], target: 31, ways: [[14, 15]] };
  return grid;
}
var HUNT_WORDS = {
  add2: { en: 'Pick 2 numbers that add up to ', fr: 'Choisis 2 nombres dont la somme fait ' },
  add3: { en: 'Pick 3 numbers that add up to ', fr: 'Choisis 3 nombres dont la somme fait ' },
  sub2: { en: 'Pick 2 numbers with a difference of ', fr: 'Choisis 2 nombres dont la différence fait ' },
  mul2: { en: 'Pick 2 numbers that multiply to ', fr: 'Choisis 2 nombres dont le produit fait ' },
  div2: { en: 'Pick 2 numbers where the bigger ÷ the smaller makes ', fr: 'Choisis 2 nombres où le plus grand ÷ le plus petit fait ' },
  add100: { en: 'Pick 2 numbers that make 100', fr: 'Choisis 2 nombres qui font 100' },
  add1000: { en: 'Pick 2 numbers that make 1000', fr: 'Choisis 2 nombres qui font 1000' },
  dec: { en: 'Pick 2 decimals that add up to ', fr: 'Choisis 2 décimaux dont la somme fait ' }
};
function huntInstruction(kind, target, lang) { var fixed = huntSpec(kind).fixed !== undefined; return pickText(HUNT_WORDS[kind] || HUNT_WORDS.add2, lang) + (fixed ? '' : fmtNum(target, lang)); }
function huntSign(kind) { var op = huntSpec(kind).op; return op === 'mul' ? ' × ' : op === 'sub' ? ' − ' : op === 'div' ? ' ÷ ' : ' + '; }
/** How a way is read back. Subtraction and division are said biggest first, because that is the sum the child did. */
function huntSay(kind, values, lang) {
  var op = huntSpec(kind).op;
  var order = values.slice();
  if (op === 'sub' || op === 'div') order.sort(function (a, b) { return b - a; });
  return order.map(function (v) { return fmtNum(v, lang); }).join(huntSign(kind)) + ' = ' + fmtNum(huntValue(kind, values), lang);
}
function huntKey(combo) { return combo.slice().sort(function (a, b) { return a - b; }).join('-'); }
function huntHas(list, combo) { var k = huntKey(combo); for (var i = 0; i < list.length; i++) if (huntKey(list[i]) === k) return true; return false; }
function huntGot(g) { var n = 0; for (var i = 0; i < g.ways.length; i++) if (huntHas(g.found, g.ways[i]) || huntHas(g.shown, g.ways[i])) n++; return n; }
`;

export const BUILD_HUNT_SCRIPT = `${HELPERS}${HUNT_RULE}
Outputs.nonce = Number(Inputs.nonce) || 0;
var lang = isFr(Inputs.lang) ? 'fr' : 'en';
var grid = huntGrid(Inputs.level);
var rows = [];
for (var r = 0; r < 16; r++) rows.push({ i: r, v: grid.cells[r], label: String(grid.cells[r]) });
Outputs.cells = rows;
Outputs.target = grid.target;
Outputs.count = grid.count;
Outputs.kind = grid.kind;
Outputs.solutions = grid.ways.length;
Outputs.instruction = huntInstruction(grid.kind, grid.target, lang) + (grid.ways.length > 1 ? (lang === 'fr' ? ' (' + grid.ways.length + ' façons)' : ' (' + grid.ways.length + ' ways)') : '');
`;

/** A fresh hunt: the first of HUNT_ROUNDS grids for the level, and a new id, so the hunt is paid once (Logic/Finish hunt). */
export const NEW_HUNT_SCRIPT = `${HELPERS}${HUNT_RULE}
var level = String(Inputs.level || 'CE2');
var grid = huntGrid(level);
Outputs.rounds = HUNT_ROUNDS;
Outputs.game = { id: 'h' + Date.now().toString(36) + Math.floor(Math.random() * 1000000).toString(36), level: level, round: 1, rounds: HUNT_ROUNDS, kind: grid.kind, count: grid.count, cells: grid.cells, target: grid.target, ways: grid.ways, found: [], shown: [], picked: [], missed: [], lately: [], said: [], note: 'start', made: 0, helped: 0, misses: 0, gridMisses: 0, taps: 0, over: false };
`;

/**
 * One move in a hunt, placed once per action with the action as a parameter (Make Ten's slide rule, placed four times):
 * - tap: a square joins the pick, or leaves it; the moment the pick holds Count squares it is checked and cleared. A way already found
 *   says so and pays nothing; a wrong pick is a miss on this grid.
 * - show: one way the child has not found, once HUNT_HELP_AFTER misses are on this grid. It pays nothing.
 * - next: the next grid, once every way on this one is found or shown.
 * The hunt is over the moment the last grid's last way is found or shown. A move that does not apply changes nothing.
 */
export const HUNT_MOVE_SCRIPT = `${HELPERS}${HUNT_RULE}
var was = Inputs.game && typeof Inputs.game === 'object' ? Inputs.game : null;
var g = was ? JSON.parse(JSON.stringify(was)) : null;
var action = String(Inputs.action || 'tap');
var changed = false;
if (g && Array.isArray(g.cells) && Array.isArray(g.ways) && g.ways.length && g.over !== true) {
  ['found', 'shown', 'picked', 'missed', 'lately', 'said'].forEach(function (k) { if (!Array.isArray(g[k])) g[k] = []; });
  var rounds = Number(g.rounds) || HUNT_ROUNDS;
  var done = huntGot(g) === g.ways.length;
  var index = Number(Inputs.index);
  if (action === 'tap' && !done && Math.floor(index) === index && index >= 0 && index < g.cells.length) {
    var at = g.picked.indexOf(index);
    if (at >= 0) g.picked.splice(at, 1);
    else g.picked.push(index);
    // The shake and the pop belong to the move that made them: the next tap stills both.
    g.missed = [];
    g.lately = [];
    if (g.picked.length >= (Number(g.count) || 2)) {
      var combo = g.picked.slice().sort(function (a, b) { return a - b; });
      var values = combo.map(function (k) { return g.cells[k]; });
      g.said = values;
      if (huntValue(g.kind, values) === g.target) {
        if (huntHas(g.found, combo) || huntHas(g.shown, combo)) g.note = 'again';
        else { g.found.push(combo); g.lately = combo; g.made = (Number(g.made) || 0) + 1; g.note = 'right'; }
      } else {
        g.missed = combo;
        g.misses = (Number(g.misses) || 0) + 1;
        g.gridMisses = (Number(g.gridMisses) || 0) + 1;
        g.note = 'wrong';
      }
      g.picked = [];
    }
    changed = true;
  } else if (action === 'show' && !done && (Number(g.gridMisses) || 0) >= HUNT_HELP_AFTER) {
    for (var w = 0; w < g.ways.length && !changed; w++) {
      if (huntHas(g.found, g.ways[w]) || huntHas(g.shown, g.ways[w])) continue;
      g.shown.push(g.ways[w].slice());
      g.lately = g.ways[w].slice();
      g.helped = (Number(g.helped) || 0) + 1;
      g.said = g.ways[w].map(function (k) { return g.cells[k]; });
      g.note = 'shown';
      g.picked = [];
      g.missed = [];
      changed = true;
    }
  } else if (action === 'next' && done && (Number(g.round) || 1) < rounds) {
    var grid = huntGrid(g.level);
    g.round = (Number(g.round) || 1) + 1;
    g.kind = grid.kind; g.count = grid.count; g.cells = grid.cells; g.target = grid.target; g.ways = grid.ways;
    g.found = []; g.shown = []; g.picked = []; g.missed = []; g.lately = []; g.said = [];
    g.gridMisses = 0;
    g.note = 'start';
    changed = true;
  }
  if (changed) {
    g.taps = (Number(g.taps) || 0) + 1;
    if (huntGot(g) === g.ways.length && (Number(g.round) || 1) >= rounds) g.over = true;
  }
}
Outputs.changed = changed;
Outputs.note = g ? String(g.note || '') : '';
// A fresh object every run, so the one Variable holding the hunt always publishes.
Outputs.game = g || {};
`;

/**
 * The hunt as the graph draws it: four rows of four squares (Make Ten's nested repeaters), each with its number in the child's language,
 * where it stands (idle, picked, found, shown, or a wrong pick), and its class: `rkt-hunt-<where>`, plus a pop on the way just found or
 * shown and a shake on a wrong pick, their two names swapping every move. And the instruction, the progress, the note on the last pick
 * (right, wrong, already found, shown, or how many ways there are), and the phase: playing, found (every way on this grid) or over.
 */
export const DRAW_HUNT_SCRIPT = `${HELPERS}${HUNT_RULE}
var g = Inputs.game && typeof Inputs.game === 'object' ? JSON.parse(JSON.stringify(Inputs.game)) : {};
var lang = isFr(Inputs.lang) ? 'fr' : 'en';
var fr = lang === 'fr';
['cells', 'ways', 'found', 'shown', 'picked', 'missed', 'lately', 'said'].forEach(function (k) { if (!Array.isArray(g[k])) g[k] = []; });
var kind = String(g.kind || 'add2');
var target = Number(g.target) || 0;
var beat = (Number(g.taps) || 0) % 2 === 0 ? 'a' : 'b';
var fresh = g.lately;
function inAny(list, i) { for (var k = 0; k < list.length; k++) if (list[k].indexOf(i) !== -1) return true; return false; }
var rows = [];
for (var r = 0; r < 4; r++) {
  var cells = [];
  for (var c = 0; c < 4; c++) {
    var i = r * 4 + c;
    var here = i < g.cells.length;
    var where = !here ? 'idle' : g.picked.indexOf(i) !== -1 ? 'picked' : g.missed.indexOf(i) !== -1 ? 'wrong' : inAny(g.found, i) ? 'found' : inAny(g.shown, i) ? 'shown' : 'idle';
    var fx = 'rkt-hunt-tile rkt-hunt-' + where + (where !== 'picked' && fresh.indexOf(i) !== -1 ? ' rkt-join-' + beat : where === 'wrong' ? ' rkt-shake-' + beat : '');
    cells.push({ id: 't' + i, at: i, word: here ? fmtNum(Number(g.cells[i]) || 0, lang) : '', kind: where, fx: fx });
  }
  rows.push({ id: 'r' + r, cells: cells });
}
var total = g.ways.length;
var got = huntGot(g);
var left = total - got;
var over = g.over === true;
var round = Number(g.round) || 1, rounds = Number(g.rounds) || HUNT_ROUNDS;
var said = g.said.length ? huntSay(kind, g.said, lang) : '';
var note = '', noteKind = 'quiet';
if (g.cells.length) {
  if (g.note === 'right') {
    noteKind = 'right';
    note = '✅ ' + said + ' · ' + (left > 0 ? (fr ? 'encore ' + left + ' à trouver' : left + ' more to find') : total === 1 ? (fr ? 'trouvé !' : 'found it!') : (fr ? 'toutes trouvées !' : 'all ' + total + ' found!'));
  } else if (g.note === 'wrong') {
    noteKind = 'wrong';
    note = said + (fr ? ', pas ' : ', not ') + fmtNum(target, lang) + (fr ? '. Essaie encore.' : '. Try again.');
  } else if (g.note === 'again') {
    note = (fr ? 'Tu as déjà trouvé ' : 'You already found ') + said + '.';
  } else if (g.note === 'shown') {
    noteKind = 'shown';
    note = (fr ? 'En voici une : ' : 'Here is one: ') + said + (left > 0 ? '.' : fr ? '. C’était la dernière.' : '. That was the last one.');
  } else {
    var count = Number(g.count) || 2;
    note = (total === 1 ? (fr ? 'Il y a 1 façon. ' : 'There is 1 way. ') : fr ? 'Il y a ' + total + ' façons. ' : 'There are ' + total + ' ways. ') + (fr ? 'Touche ' + count + ' nombres.' : 'Tap ' + count + ' numbers.');
  }
}
Outputs.rows = rows;
Outputs.instruction = g.cells.length ? huntInstruction(kind, target, lang) : '';
Outputs.progress = g.cells.length ? (fr ? 'Grille ' + round + ' sur ' + rounds + ' · trouvées : ' + got + ' sur ' + total : 'Grid ' + round + ' of ' + rounds + ' · found ' + got + ' of ' + total) : '';
Outputs.note = note;
Outputs.noteKind = noteKind;
Outputs.phase = over ? 'over' : total > 0 && left === 0 ? 'found' : 'playing';
Outputs.over = over;
Outputs.canShow = !over && left > 0 && (Number(g.gridMisses) || 0) >= HUNT_HELP_AFTER;
Outputs.made = Number(g.made) || 0;
Outputs.helped = Number(g.helped) || 0;
Outputs.round = round;
`;

/**
 * What a finished hunt pays, under RKT-010's rules: nothing for speed, nothing random, nothing ever taken away. A way the child found
 * is a star, up to the cap; a way shown pays nothing; finishing pays a landing's five. Keyed by the hunt's id, so a second Finish for
 * the same hunt pays nothing, and a hunt left with New game pays nothing.
 */
export const FINISH_HUNT_SCRIPT = `${HELPERS}${STAR_HELPERS}${HANGAR_HELPERS}
var HUNT_STAR_RULE = ${JSON.stringify(HUNT_STAR_RULE)};
var model = Inputs.model && typeof Inputs.model === 'object' ? JSON.parse(JSON.stringify(Inputs.model)) : { rating: 0, skills: {}, lastSkill: '', answered: 0 };
model = withStars(model);
var g = Inputs.game && typeof Inputs.game === 'object' ? Inputs.game : {};
var fr = isFr(Inputs.lang);
var made = Number(g.made) || 0, helped = Number(g.helped) || 0;
var wayStars = Math.min(made * HUNT_STAR_RULE.way, HUNT_STAR_RULE.wayCap);
var total = g.over === true ? wayStars + HUNT_STAR_RULE.finish : 0;
var id = g.id ? String(g.id) : '';
var paid = false;
if (total > 0 && id && model.lastHuntId !== id) { model.stars += total; model.lastHuntId = id; paid = true; }
var counted = !!id && model.lastHuntId === id;
Outputs.paid = paid;
Outputs.model = model;
Outputs.starsEarned = paid ? total : 0;
Outputs.stars = model.stars;
// RKT-011: this hunt's take crossed a milestone, so the end screen offers the pick.
Outputs.earnedPick = counted && purseOf(model) >= SHOP_FROM;
// Every finished hunt is a cheer: every grid was cleared.
Outputs.won = g.over === true;
Outputs.starsText = total > 0 ? '+' + total + ' ⭐' : '';
var parts = [];
if (wayStars) parts.push((fr ? 'trouvées +' : 'ways found +') + wayStars + (made * HUNT_STAR_RULE.way > HUNT_STAR_RULE.wayCap ? (fr ? ' (le maximum)' : ' (the most a hunt pays)') : ''));
if (total) parts.push((fr ? 'chasse finie +' : 'hunt finished +') + HUNT_STAR_RULE.finish);
Outputs.why = parts.join(' · ');
Outputs.headline = fr ? 'Chasse terminée !' : 'Hunt complete!';
Outputs.line = (fr ? made + (made === 1 ? ' trouvée' : ' trouvées') : made + (made === 1 ? ' way found' : ' ways found')) + (helped ? (fr ? ' · ' + helped + (helped === 1 ? ' montrée' : ' montrées') : ' · ' + helped + ' shown') : '');
`;

// ── Monster Gate ────────────────────────────────────────────────────────────

/**
 * Monster Gate (§2.2 D, ruled 2026-09-14 in §16.1): the race's questions, three hearts, three monsters, two ways to play.
 *
 * - `gate` — **Beat it to the gate.** In Challenge the monster walks from where it stands to the gate while the question is up, and
 *   the question's clock is exactly that walk (a monster that crept closer arrives sooner: `timeScale`). In Practice it stands still.
 *   A right answer is a hit (quick: `bigHit`, slow: `smallHit`) and knocks it back; `hp` hits and it runs away. A wrong answer: it
 *   creeps closer (`creep`). Reaching the gate, by the clock or by creeping, costs a heart and sends it back.
 * - `push` — **Push it back.** The race engine run backwards: every answer, a right one pushes it towards its cave by `push` × the
 *   race's gain, and it steps towards the gate by `step` × the computer rocket's step (read off the rating, as the rocket's is). Into
 *   its cave: beaten. At the gate: a heart, and it comes back to the middle.
 *
 * `healRun` quick answers in a row give a heart back, up to `hearts`. Every number is here, so a play-test note is a one-line change.
 */
export const MONSTER = {
  monsters: 3,
  hearts: 3,
  hp: 4,
  bigHit: 2,
  smallHit: 1,
  creep: { practice: 1 / 3, challenge: 0.25 },
  /**
   * 🔴 P95 PLY-004 — how far a right answer pushes the monster back towards the far side, and WHICH right answer does it.
   *
   * > "it's a bit too easy at the moment, you have to really fuck up a lot to have the monster break down your door.
   * > In the defi mode it works well with the timer adding stakes, but in the entrainement mode it's pretty much
   * > unlosable. I'm not saying make it as hard as defi, but a good compromise please" — Richard, 2026-09-18
   *
   * It was 1, on ANY right answer: the monster was thrown all the way back, so losing a heart needed three wrong
   * answers **with no right one between them**. Now, in Practice:
   *   · a wrong answer creeps `creep` closer, and the creeps ACCUMULATE across the whole game
   *   · a right-but-slow answer holds it exactly where it stands — it neither gains nor loses ground
   *   · only a QUICK right answer pushes it back, by `back.practice`
   *
   * 🔴 The quick/slow half is the part that does the work, and it is why this is not just "a bigger number". Practice
   * has no visible clock and is not getting one (TPL-007 §1.4, and the briefing's §4 — a soft "fluent" flag, never a
   * countdown). The flag already exists, the child already sees ⚡ on a fluent answer, and hesitating is the only
   * thing in Practice that can let a monster gain. Measured over 200 seeded games at each accuracy, half the right
   * answers quick (engine gate):
   *
   * | right | loses the game | hearts lost when they win |
   * |---|---|---|
   * | 40% | 59% | 1.3 |
   * | 50% | 25% | 1.0 |
   * | 60% |  7% | 0.8 |
   * | 70% |  1% | 0.5 |
   * | 80% |  1% | 0.2 |
   *
   * 🔴 And the honest part: `Pick next question` serves questions the child gets right about three times in four
   * (Klinkenberg's ~75%), so a child playing normally should still WIN. That is the pedagogy, not a bug. What this
   * buys is that they lose half a heart on the way and can see the monster near the gate — stakes, without punishing
   * a child for being right.
   */
  back: { practice: 0.15, challenge: 1 },
  push: 2,
  step: 1.5,
  pushStart: 0.5,
  healRun: 3
} as const;

/** The three monsters, in the order they come: a shape and a colour each (ruling 5). The pixels are `MONSTER_PIXELS` in the components. */
export const MONSTER_LOOKS = ['horns', 'eye', 'spikes'] as const;

/** What a finished game pays that is not answers (those were paid as they were graded): a landing's five, win or lose, once per game id. */
export const MONSTER_STAR_RULE = { finish: STAR_RULE.finish } as const;

export const MONSTER_HELPERS = `
var MONSTER = ${JSON.stringify(MONSTER)};
var MONSTER_LOOKS = ${JSON.stringify(MONSTER_LOOKS)};
function monsterRound(v) { return Math.round(v * 1000) / 1000; }
`;

/** A fresh game in the chosen way to play and pace: three hearts, the first monster, and a new id (the answers' tally and the finish key on it). */
export const NEW_MONSTER_SCRIPT = `${MONSTER_HELPERS}
var style = String(Inputs.style) === 'push' ? 'push' : 'gate';
var timed = Inputs.timed === true;
var id = 'm' + Date.now().toString(36) + Math.floor(Math.random() * 1000000).toString(36);
Outputs.id = id;
Outputs.timeScale = 1;
Outputs.game = { id: id, style: style, timed: timed, hearts: MONSTER.hearts, beaten: 0, hp: MONSTER.hp, start: 1, pos: style === 'push' ? MONSTER.pushStart : 1, streak: 0, right: 0, answered: 0, event: 'start', fresh: false, healed: false, over: false, won: false, moves: 0 };
`;

/**
 * One move, placed once per action with the action as a parameter (Number Hunt's shape):
 * - answer: the round was graded (Outcome fluent, correct, wrong or timeout; Gain and Cpu Gain as the grader wrote them).
 * - next: the monster that was just beaten makes way for the next one (only the look changes).
 * Nothing moves once the game is over, and a move that does not apply changes nothing.
 */
export const MONSTER_MOVE_SCRIPT = `${MONSTER_HELPERS}
var was = Inputs.game && typeof Inputs.game === 'object' ? Inputs.game : null;
var g = was ? JSON.parse(JSON.stringify(was)) : null;
var action = String(Inputs.action || 'answer');
var outcome = String(Inputs.outcome || '');
var changed = false;
if (g && g.id && g.over !== true) {
  var push = g.style === 'push';
  if (action === 'answer' && (outcome === 'fluent' || outcome === 'correct' || outcome === 'wrong' || outcome === 'timeout')) {
    var correct = outcome === 'fluent' || outcome === 'correct';
    var quick = outcome === 'fluent';
    var hearts = Number(g.hearts) || 0;
    g.fresh = false;
    g.healed = false;
    g.answered = (Number(g.answered) || 0) + 1;
    if (correct) g.right = (Number(g.right) || 0) + 1;
    if (push) {
      var gain = Math.max(0, Number(Inputs.gain) || 0);
      var cpu = Math.max(0, Number(Inputs.cpuGain) || 0);
      g.pos = monsterRound((Number(g.pos) || 0) + (correct ? MONSTER.push * gain : 0) - MONSTER.step * cpu);
      g.event = correct ? 'pushed' : 'stepped';
      if (g.pos >= 1) { g.beaten = (Number(g.beaten) || 0) + 1; g.event = 'beaten'; g.fresh = true; g.pos = MONSTER.pushStart; }
      else if (g.pos <= 0) { hearts -= 1; g.event = 'bang'; g.pos = MONSTER.pushStart; }
    } else {
      if (correct) {
        g.hp = Math.max(0, (Number(g.hp) || 0) - (quick ? MONSTER.bigHit : MONSTER.smallHit));
        // PLY-004: a right answer pushes it back by MONSTER.back, not all the way. In Challenge that IS all the way (1).
        g.start = Math.min(1, (Number(g.start) || 1) + (g.timed === true ? MONSTER.back.challenge : quick ? MONSTER.back.practice : 0));
        g.event = quick ? 'bigHit' : 'hit';
        if (g.hp <= 0) { g.beaten = (Number(g.beaten) || 0) + 1; g.event = 'beaten'; g.fresh = true; g.hp = MONSTER.hp; g.start = 1; }
      } else if (outcome === 'timeout') {
        hearts -= 1;
        g.event = 'bang';
        g.start = 1;
      } else {
        // Ruling 2: a wrong answer, it creeps closer. Creeping all the way is reaching the gate.
        var closer = monsterRound((Number(g.start) || 1) - (g.timed === true ? MONSTER.creep.challenge : MONSTER.creep.practice));
        if (closer <= 0.01) { hearts -= 1; g.event = 'bang'; g.start = 1; }
        else { g.start = closer; g.event = 'creep'; }
      }
      g.pos = g.start;
    }
    // Ruling 7: three quick answers in a row, a heart back (the run starts again whether or not a heart was missing).
    g.streak = quick ? (Number(g.streak) || 0) + 1 : 0;
    if (g.streak >= MONSTER.healRun) {
      g.streak = 0;
      if (hearts > 0 && hearts < MONSTER.hearts) { hearts += 1; g.healed = true; }
    }
    g.hearts = Math.max(0, hearts);
    if (g.beaten >= MONSTER.monsters) { g.over = true; g.won = true; }
    else if (g.hearts <= 0) { g.over = true; g.won = false; }
    changed = true;
  } else if (action === 'next' && g.fresh === true) {
    g.fresh = false;
    g.healed = false;
    g.event = 'arrive';
    changed = true;
  }
  if (changed) g.moves = (Number(g.moves) || 0) + 1;
}
Outputs.changed = changed;
Outputs.event = g ? String(g.event || '') : '';
// The next question's clock, as a share of the skill's: the walk from where the monster stands (Beat it to the gate, Challenge only).
Outputs.timeScale = g && g.style !== 'push' && g.timed === true ? Number(g.start) || 1 : 1;
// A fresh object every run, so the one Variable holding the game always publishes.
Outputs.game = g || {};
`;

/**
 * The game as the lane draws it: the hearts, which monster of three, its hits left (Beat it to the gate), what just happened in words,
 * the monster's class (its look, and a hit, a lunge, running away or arriving, their two names swapping every move), the lane's class
 * (a bang shakes the gate), where the monster stands between answers (Rest, 0 the gate, 1 the far side), and Walk From: where a
 * Challenge walk starts, 0 when nothing walks.
 */
export const DRAW_MONSTER_SCRIPT = `${MONSTER_HELPERS}
var g = Inputs.game && typeof Inputs.game === 'object' ? Inputs.game : {};
var fr = String(Inputs.lang) === 'fr';
var has = !!g.id;
var push = g.style === 'push';
var over = has && g.over === true;
var won = over && g.won === true;
var fresh = has && g.fresh === true;
var heartsLeft = has ? Math.max(0, Math.min(MONSTER.hearts, Number(g.hearts) || 0)) : MONSTER.hearts;
var beaten = Math.max(0, Math.min(MONSTER.monsters, Number(g.beaten) || 0));
var shown = Math.max(1, Math.min(MONSTER.monsters, fresh || won ? beaten : beaten + 1));
var look = MONSTER_LOOKS[shown - 1];
var beat = (Number(g.moves) || 0) % 2 === 0 ? 'a' : 'b';
var event = has ? String(g.event || 'start') : 'start';
var W = fr
  ? { monster: 'Monstre ', of: ' sur ', start: push ? 'Repousse-le dans sa grotte.' : g.timed === true ? 'Réponds avant qu’il n’atteigne la porte.' : 'Il n’avance que si tu te trompes.', bigHit: 'Un grand coup !', hit: 'Un petit coup. Plus vite, ça tape plus fort.', creep: 'Il s’approche.', bang: 'Bang ! Il a atteint la porte : un cœur en moins.', runs: 'Il s’enfuit !', cave: 'Retour dans sa grotte !', pushed: 'Repoussé !', stepped: 'Il avance d’un pas.', arrive: 'Voici le suivant !', healed: ' Trois réponses rapides : un cœur de plus !', held: 'Tous renvoyés !', gotIn: 'Il est entré !' }
  : { monster: 'Monster ', of: ' of ', start: push ? 'Push it back into its cave.' : g.timed === true ? 'Answer before it reaches the gate.' : 'It only moves when you get one wrong.', bigHit: 'A big hit!', hit: 'A small hit. Quicker hits harder.', creep: 'It creeps closer.', bang: 'Bang! It reached the gate: a heart gone.', runs: 'It runs away!', cave: 'Back into its cave!', pushed: 'Pushed back!', stepped: 'It takes a step closer.', arrive: 'Here comes the next one!', healed: ' Three quick answers: a heart back!', held: 'All three sent home!', gotIn: 'It got in!' };
var note = !has ? '' : won ? W.held : over ? W.gotIn : event === 'beaten' ? (push ? W.cave : W.runs) : W[event] || W.start;
if (has && !over && g.healed === true) note += W.healed;
var hearts = [];
for (var i = 0; i < MONSTER.hearts; i++) hearts.push(i < heartsLeft ? '❤️' : '🤍');
var pips = '';
if (has && !push) {
  var hp = fresh || won ? 0 : Math.max(0, Math.min(MONSTER.hp, Number(g.hp) || 0));
  for (var k = 0; k < MONSTER.hp; k++) pips += k < hp ? '●' : '○';
}
var fx = '';
if (won || event === 'beaten') fx = ' rkt-monster-gone';
else if (event === 'bigHit' || event === 'hit' || event === 'pushed') fx = ' rkt-monster-hit-' + beat;
else if (event === 'arrive') fx = ' rkt-monster-arrive-' + beat;
else if (event === 'creep' || event === 'stepped') fx = ' rkt-monster-lunge-' + beat;
var rest = !has ? (push ? MONSTER.pushStart : 1) : fresh || won ? 1 : over ? 0 : push ? Number(g.pos) || 0 : Number(g.start) || 0;
Outputs.hearts = hearts.join(' ');
Outputs.heartsLeft = heartsLeft;
Outputs.line = has ? W.monster + shown + W.of + MONSTER.monsters : '';
Outputs.note = note;
Outputs.pips = pips;
Outputs.look = look;
Outputs.monsterClass = 'rkt-monster rkt-monster-' + look + fx;
Outputs.laneClass = 'rkt-lane rkt-lane-' + (push ? 'push' : 'gate') + (has && event === 'bang' ? ' rkt-bang-' + beat : '');
Outputs.rest = Math.max(0, Math.min(1, monsterRound(rest)));
Outputs.walkFrom = has && !push && g.timed === true && !over && !fresh ? Math.max(0, Math.min(1, Number(g.start) || 1)) : 0;
Outputs.phase = over ? 'over' : 'playing';
Outputs.over = over;
Outputs.won = won;
Outputs.beaten = beaten;
Outputs.right = Number(g.right) || 0;
`;

/**
 * What a finished game pays, under RKT-010's rules: the answers were paid as they were graded (a star each, and a new mastery level's
 * ten), so a finish adds a landing's five, win or lose, once per game id. The end card says the game's whole take, as a race's does.
 */
export const FINISH_MONSTER_SCRIPT = `${HELPERS}${STAR_HELPERS}${HANGAR_HELPERS}${MONSTER_HELPERS}
var MONSTER_STAR_RULE = ${JSON.stringify(MONSTER_STAR_RULE)};
var model = Inputs.model && typeof Inputs.model === 'object' ? JSON.parse(JSON.stringify(Inputs.model)) : { rating: 0, skills: {}, lastSkill: '', answered: 0 };
model = withStars(model);
var g = Inputs.game && typeof Inputs.game === 'object' ? Inputs.game : {};
var fr = isFr(Inputs.lang);
var id = g.id ? String(g.id) : '';
var over = g.over === true;
var won = over && g.won === true;
var paid = false;
if (over && id && model.lastMonsterId !== id) { model.stars += MONSTER_STAR_RULE.finish; model.lastMonsterId = id; paid = true; }
var counted = over && !!id && model.lastMonsterId === id;
// The answers' tally: Logic/Grade answer keeps it under the id it is given, and Monster/Play gives it the game's.
var tally = model.race && model.race.id === id ? model.race : { rightStars: 0, levelStars: 0 };
var rightStars = Number(tally.rightStars) || 0;
var levelStars = Number(tally.levelStars) || 0;
var total = counted ? rightStars + levelStars + MONSTER_STAR_RULE.finish : 0;
var right = Number(g.right) || 0;
var beaten = Math.max(0, Math.min(MONSTER.monsters, Number(g.beaten) || 0));
Outputs.paid = paid;
Outputs.model = model;
Outputs.starsEarned = paid ? MONSTER_STAR_RULE.finish : 0;
Outputs.stars = model.stars;
// RKT-011: this game's take crossed a milestone, so the end screen offers the pick.
Outputs.earnedPick = counted && purseOf(model) >= SHOP_FROM;
Outputs.won = won;
Outputs.starsText = total > 0 ? '+' + total + ' ⭐' : '';
var parts = [];
if (counted && rightStars) parts.push((fr ? 'bonnes réponses +' : 'right answers +') + rightStars);
if (counted && levelStars) parts.push((fr ? 'niveau gagné +' : 'new level +') + levelStars);
if (total) parts.push((fr ? 'partie finie +' : 'game finished +') + MONSTER_STAR_RULE.finish);
Outputs.why = parts.join(' · ');
Outputs.headline = won ? (fr ? 'La porte a tenu !' : 'The gate held!') : fr ? 'Le monstre est entré !' : 'The monster got in!';
Outputs.line = (won
  ? (fr ? MONSTER.monsters + ' monstres renvoyés' : MONSTER.monsters + ' monsters sent home')
  : (fr ? 'Tu en as renvoyé ' + beaten + ' sur ' + MONSTER.monsters : 'You sent ' + beaten + ' of ' + MONSTER.monsters + ' home')) +
  ' · ' + right + (fr ? (right === 1 ? ' bonne réponse' : ' bonnes réponses') : ' right');
`;

/**
 * 🔴 PLY-003: this used to compute the running total itself — `kind === 'mul2' ? × : +` — which knew addition and one
 * multiplication and nothing else. The moment subtraction, division and decimals arrived it would have told a child
 * their right answer was wrong. It now asks `huntValue`, the same function that grades the move, so the number under
 * the grid and the verdict on it can never disagree.
 */
export const CHECK_HUNT_SCRIPT = `${HELPERS}${HUNT_RULE}
var cells = Inputs.cells || [];
var selected = Inputs.selected || [];
var count = Number(Inputs.count) || 2;
var target = Number(Inputs.target) || 0;
var kind = String(Inputs.kind || 'add2');
var values = [];
for (var i = 0; i < selected.length; i++) {
  var cell = cells[selected[i]];
  values.push(cell && typeof cell === 'object' ? Number(cell.v) : Number(cell));
}
var value = values.length ? huntValue(kind, values) : 0;
if (!isFinite(value)) value = 0;
Outputs.value = value;
Outputs.picked = selected.length;
Outputs.complete = selected.length >= count;
Outputs.correct = selected.length === count && value === target;
`;

export const TOGGLE_INDEX_SCRIPT = `
var list = (Inputs.list || []).slice();
var index = Number(Inputs.index);
var max = Number(Inputs.max) || 99;
var at = list.indexOf(index);
if (at >= 0) list.splice(at, 1);
else if (list.length < max) list.push(index);
Outputs.list = list;
Outputs.count = list.length;
`;

// ── Profiles, in the store ──────────────────────────────────────────────────

/**
 * The store's `app` value: `{ profiles: [...], activeId, sets: [...] }`. Every
 * script here takes the whole value and returns a new one; the graph writes it
 * back with `Set Global Store`. A profile is `{ id, name, look, seed, level,
 * lang, layout, sound, answerMode, created, days: [yyyy-mm-dd...], model }`.
 */
export const PROFILE_HELPERS = `${HANGAR_HELPERS}
function today() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function appOf(v) { var a = v && typeof v === 'object' ? JSON.parse(JSON.stringify(v)) : {}; if (!Array.isArray(a.profiles)) a.profiles = []; if (!Array.isArray(a.sets)) a.sets = []; if (typeof a.activeId !== 'string') a.activeId = ''; return a; }
function dueCount(model) { var n = 0, now = Date.now(); var sk = (model && model.skills) || {}; for (var id in sk) if (sk[id].m > 0 && sk[id].due && sk[id].due <= now) n++; return n; }
function daysThisWeek(days) { var now = new Date(); var start = new Date(now); start.setDate(now.getDate() - ((now.getDay() + 6) % 7)); var s = start.getFullYear() + '-' + String(start.getMonth() + 1).padStart(2, '0') + '-' + String(start.getDate()).padStart(2, '0'); var n = 0; for (var i = 0; i < (days || []).length; i++) if (days[i] >= s) n++; return n; }
function decorate(p) { var out = JSON.parse(JSON.stringify(p)); out.due = dueCount(p.model); out.days7 = daysThisWeek(p.days); out.answered = (p.model && p.model.answered) || 0; out.faceOptions = wearOptions(p.look, wearOf(p)); return out; }
`;

export const LIST_PROFILES_SCRIPT = `${PROFILE_HELPERS}
var app = appOf(Inputs.app);
var rows = app.profiles.map(function (p) { var d = decorate(p); d.selected = p.id === app.activeId; return d; });
Outputs.profiles = rows;
Outputs.count = rows.length;
Outputs.canAdd = rows.length < ${MAX_PROFILES};
Outputs.hasActive = app.profiles.some(function (p) { return p.id === app.activeId; });
`;

export const CREATE_PROFILE_SCRIPT = `${PROFILE_HELPERS}
var app = appOf(Inputs.app);
var name = String(Inputs.name || '').trim();
if (!name) name = 'Player ' + (app.profiles.length + 1);
var id = 'p' + Date.now().toString(36) + Math.floor(Math.random() * 1000).toString(36);
var lang = String(Inputs.lang) === 'fr' ? 'fr' : 'en';
var profile = {
  id: id, name: name.slice(0, 24),
  look: String(Inputs.look || 'pixel-art'),
  seed: String(Inputs.seed || name),
  level: String(Inputs.level || 'CE2'),
  lang: lang,
  layout: String(Inputs.layout || (lang === 'fr' ? 'azerty' : 'qwerty')),
  sound: true,
  answerMode: String(Inputs.answerMode || 'auto'),
  created: Date.now(), days: [], model: { rating: 0, skills: {}, lastSkill: '', answered: 0 }
};
if (app.profiles.length < ${MAX_PROFILES}) { app.profiles.push(profile); app.activeId = id; }
Outputs.app = app;
Outputs.profileId = app.activeId;
Outputs.created = app.activeId === id;
`;

export const SELECT_PROFILE_SCRIPT = `${PROFILE_HELPERS}
var app = appOf(Inputs.app);
var id = String(Inputs.profileId || '');
if (app.profiles.some(function (p) { return p.id === id; })) app.activeId = id;
Outputs.app = app;
`;

export const DELETE_PROFILE_SCRIPT = `${PROFILE_HELPERS}
var app = appOf(Inputs.app);
var id = String(Inputs.profileId || '');
app.profiles = app.profiles.filter(function (p) { return p.id !== id; });
if (app.activeId === id) app.activeId = app.profiles.length ? app.profiles[0].id : '';
Outputs.app = app;
`;

export const ACTIVE_PROFILE_SCRIPT = `${PROFILE_HELPERS}${STAR_HELPERS}
var app = appOf(Inputs.app);
var p = null;
for (var i = 0; i < app.profiles.length; i++) if (app.profiles[i].id === app.activeId) p = app.profiles[i];
var has = !!p;
if (!p) p = { id: '', name: '', look: 'pixel-art', seed: 'Rocket', level: 'CE2', lang: 'en', layout: 'qwerty', sound: true, answerMode: 'auto', days: [], model: { rating: 0, skills: {}, lastSkill: '', answered: 0 } };
var d = decorate(p);
Outputs.hasProfile = has;
Outputs.profileId = p.id;
Outputs.name = p.name;
Outputs.look = p.look;
Outputs.seed = p.seed;
Outputs.level = p.level;
Outputs.lang = p.lang;
Outputs.layout = p.layout;
Outputs.sound = p.sound !== false;
// RKT-008: the menu's sound pills, as the value a Choice row holds.
Outputs.soundMode = p.sound === false ? 'off' : 'on';
Outputs.answerMode = p.answerMode || 'auto';
// Make Ten Merge's mode: Easy unless the child chose Hard.
Outputs.mergeMode = p.mergeMode === 'hard' ? 'hard' : 'easy';
Outputs.model = p.model || {};
Outputs.due = d.due;
Outputs.days7 = d.days7;
Outputs.answered = d.answered;
// RKT-010: the total a profile from before today is granted on its first read, so Home never shows a player behind a newcomer.
var stars = withStars(JSON.parse(JSON.stringify(p.model || {}))).stars;
Outputs.stars = stars;
// RKT-011 / PLY-002: what the face and the rocket wear (a part is drawn only on the look it was chosen for), and the purse.
var wear = wearOf(p);
Outputs.faceOptions = wearOptions(p.look, wear);
Outputs.paint = wear.paint || 'var(--primary)';
Outputs.pattern = wear.pattern || '';
var model0 = withStars(JSON.parse(JSON.stringify(p.model || {})));
var purse = purseOf(model0);
Outputs.picks = purse;
Outputs.hasPicks = purse >= SHOP_FROM;
Outputs.nextAt = SHOP_FROM;
Outputs.nextPct = purse >= SHOP_FROM ? 100 : Math.max(0, Math.min(100, Math.round((100 * purse) / SHOP_FROM)));
var frNext = String(p.lang) === 'fr';
Outputs.nextText = purse >= SHOP_FROM
  ? (frNext ? '⭐ ' + purse + ' à dépenser au hangar' : '⭐ ' + purse + ' to spend in the hangar')
  : (frNext ? 'Encore ' + (SHOP_FROM - purse) + ' ⭐ pour ta première peinture' : (SHOP_FROM - purse) + ' ⭐ more for your first paint');
Outputs.sets = app.sets;
`;

export const SAVE_MODEL_SCRIPT = `${PROFILE_HELPERS}
var app = appOf(Inputs.app);
var id = String(Inputs.profileId || app.activeId);
var model = Inputs.model && typeof Inputs.model === 'object' ? Inputs.model : null;
for (var i = 0; i < app.profiles.length; i++) {
  if (app.profiles[i].id !== id) continue;
  if (model) app.profiles[i].model = model;
  var t = today();
  if (!Array.isArray(app.profiles[i].days)) app.profiles[i].days = [];
  if (app.profiles[i].days.indexOf(t) === -1) app.profiles[i].days.push(t);
  app.profiles[i].days = app.profiles[i].days.slice(-60);
}
Outputs.app = app;
`;

/**
 * RKT-010: the stars a race pays that are not answers. 5 for landing, win or lose, and 5 for a new personal best (the most right
 * answers in a row in one race, per mode; the first race sets it without paying, because there was nothing to beat). Keyed by the
 * race id, so a second Finished for the same race pays nothing. It also says the race's whole take, and why, in the child's language.
 */
export const FINISH_RACE_SCRIPT = `${HELPERS}${STAR_HELPERS}${HANGAR_HELPERS}
var model = Inputs.model && typeof Inputs.model === 'object' ? JSON.parse(JSON.stringify(Inputs.model)) : { rating: 0, skills: {}, lastSkill: '', answered: 0 };
model = withStars(model);
var lang = isFr(Inputs.lang) ? 'fr' : 'en';
var raceId = String(Inputs.raceId || '');
var mode = Inputs.timed === true ? 'defi' : 'practice';
var race = model.race && model.race.id === raceId ? model.race : { id: raceId, run: 0, bestRun: 0, rightStars: 0, levelStars: 0 };
var earned = 0;
if (raceId && model.lastRaceId !== raceId) {
  race.finishStars = STAR_RULE.finish;
  race.bestStars = 0;
  var had = model.bests[mode];
  if (typeof had !== 'number') model.bests[mode] = race.bestRun;
  else if (race.bestRun > had) { model.bests[mode] = race.bestRun; race.bestStars = STAR_RULE.best; }
  earned = race.finishStars + race.bestStars;
  model.stars += earned;
  model.lastRaceId = raceId;
  model.race = race;
}
var total = (race.rightStars || 0) + (race.levelStars || 0) + (race.finishStars || 0) + (race.bestStars || 0);
var fr = isFr(lang);
var parts = [];
if (race.rightStars) parts.push((fr ? 'bonnes réponses +' : 'right answers +') + race.rightStars);
if (race.finishStars) parts.push((fr ? 'arrivée +' : 'landed +') + race.finishStars);
if (race.levelStars) parts.push((fr ? 'niveau gagné +' : 'new level +') + race.levelStars);
if (race.bestStars) parts.push((fr ? 'record +' : 'new best +') + race.bestStars);
var isBest = (race.bestStars || 0) > 0;
// PLY-002: the purse can buy something, so the result screen offers the hangar. (Was RKT-011's milestone crossing.)
Outputs.earnedPick = purseOf(model) >= SHOP_FROM;
Outputs.model = model;
Outputs.starsEarned = earned;
Outputs.raceStars = total;
Outputs.starsText = '+' + total + ' ⭐';
Outputs.why = (isBest ? (fr ? 'Nouveau record ! · ' : 'New best! · ') : '') + parts.join(' · ');
Outputs.newBest = isBest;
Outputs.stars = model.stars;
`;

export const UPDATE_SETTINGS_SCRIPT = `${PROFILE_HELPERS}
var app = appOf(Inputs.app);
var id = String(Inputs.profileId || app.activeId);
// RKT-008 AC7: UK and US are one QWERTY when a key press reports a keyboard.
function keyFamily(layout) { return String(layout) === 'azerty' ? 'azerty' : 'qwerty'; }
// RKT-008: a rename follows Create's rules (trimmed, 24 characters). An empty name is refused, so the name stays: a form nobody typed
// in sends nothing, and a cleared box sends blanks.
var name = String(Inputs.name === undefined || Inputs.name === null ? '' : Inputs.name).trim().slice(0, 24);
for (var i = 0; i < app.profiles.length; i++) {
  if (app.profiles[i].id !== id) continue;
  if (name) app.profiles[i].name = name;
  // RKT-008: the menu's sound pills say 'on' or 'off'; the profile keeps true or false.
  if (Inputs.soundMode === 'on' || Inputs.soundMode === 'off') app.profiles[i].sound = Inputs.soundMode === 'on';
  if (Inputs.lang !== undefined && Inputs.lang !== null && Inputs.lang !== '') app.profiles[i].lang = String(Inputs.lang) === 'fr' ? 'fr' : 'en';
  // RKT-008 AC7: a keyboard the child picks is kept for good. One a key press reports (layoutSeen) is written only while the child has
  // picked none, and only when it is a different keyboard, so it is stored once.
  if (Inputs.layout) { app.profiles[i].layout = String(Inputs.layout); app.profiles[i].layoutPicked = true; }
  if (Inputs.layoutSeen && app.profiles[i].layoutPicked !== true && keyFamily(Inputs.layoutSeen) !== keyFamily(app.profiles[i].layout)) app.profiles[i].layout = keyFamily(Inputs.layoutSeen);
  if (Inputs.level) app.profiles[i].level = String(Inputs.level);
  if (Inputs.sound !== undefined && Inputs.sound !== null) app.profiles[i].sound = Inputs.sound === true;
  if (Inputs.answerMode) app.profiles[i].answerMode = String(Inputs.answerMode);
  if (Inputs.mergeMode === 'easy' || Inputs.mergeMode === 'hard') app.profiles[i].mergeMode = Inputs.mergeMode;
  if (Inputs.look) app.profiles[i].look = String(Inputs.look);
  if (Inputs.seed) app.profiles[i].seed = String(Inputs.seed);
}
Outputs.app = app;
`;

// ── The hangar (RKT-011) ────────────────────────────────────────────────────

/**
 * PLY-002 R1 — **buy a shelf item with stars**, and wear it at once. Refused, with nothing changed, when the item is free or
 * already owned, does not fit the face the child has now, or the purse cannot cover it. Owned only grows: nothing in any script
 * removes an item. The cost is added to `model.spent`, so `model.stars` — what was EARNED — never moves.
 *
 * 🔴 This script does not ask. The confirmation Richard asked for is a surface (`Hangar/Confirm`), and a tap that reaches here
 * has already been confirmed. The script still re-checks every condition, because a stale dialog must not be able to overdraw.
 */
export const PICK_ITEM_SCRIPT = `${PROFILE_HELPERS}${STAR_HELPERS}
var app = appOf(Inputs.app);
var id = String(Inputs.profileId || app.activeId);
var item = shelfItem(Inputs.shelf, String(Inputs.itemId || ''));
var picked = false, why = 'noProfile', cost = 0, before = 0, after = 0;
for (var i = 0; i < app.profiles.length; i++) {
  var p = app.profiles[i];
  if (p.id !== id) continue;
  var model = withStars(JSON.parse(JSON.stringify(p.model || {})));
  before = purseOf(model);
  cost = costOf(item);
  after = before;
  if (!item) why = 'unknown';
  else if (item.free === true) why = 'free';
  else if (ownedOf(p).indexOf(item.id) !== -1) why = 'owned';
  else if (!itemFits(item, p.look)) why = 'fits';
  else if (!canAfford(item, before)) why = 'tooDear';
  else {
    model.spent = spentOf(model) + cost;
    p.model = model;
    p.owned = ownedOf(p).concat([item.id]);
    p.wear = putOn(item, p.look, wearOf(p));
    after = purseOf(model);
    picked = true;
    why = '';
  }
}
Outputs.app = app;
Outputs.picked = picked;
Outputs.why = why;
Outputs.cost = cost;
Outputs.purseBefore = before;
Outputs.purseAfter = after;
`;

/** Put an item the child has (owned, or free) on, or take it off if it is on. A face item works on the face it fits. */
export const WEAR_ITEM_SCRIPT = `${PROFILE_HELPERS}
var app = appOf(Inputs.app);
var id = String(Inputs.profileId || app.activeId);
var item = shelfItem(Inputs.shelf, String(Inputs.itemId || ''));
var worn = false, changed = false;
for (var i = 0; i < app.profiles.length; i++) {
  var p = app.profiles[i];
  if (p.id !== id || !item || !itemFits(item, p.look)) continue;
  if (item.free !== true && ownedOf(p).indexOf(item.id) === -1) continue;
  var wear = wearOf(p);
  if (itemWorn(item, p.look, wear)) wear = takeOff(item, p.look, wear);
  else { wear = putOn(item, p.look, wear); worn = true; }
  p.wear = wear;
  changed = true;
}
Outputs.app = app;
Outputs.worn = worn;
Outputs.changed = changed;
`;

/**
 * The shelf, one tab at a time, for the active player.
 *
 * 🔴 **PLY-001: a face item the chosen face cannot wear is not on the shelf at all.** RKT-011 §3.2 drew it greyed, on a face it
 * did fit, captioned "Fits the Pixel and Smile faces" — and Richard's second play test found that is exactly the complaint
 * ("pixel avatar sunglasses ... offered" to an adventurer child). Every kept look carries ≥ MIN_FACE_ITEMS_PER_LOOK of its own,
 * so filtering shrinks nothing. What a child owns for another face is counted in `elsewhere`, never hidden and never removed.
 *
 * PLY-002: every row carries its price and whether the purse covers it, so the tile can say so before the tap, and the
 * confirmation can be built from the row without asking a second script.
 */
export const HANGAR_SHELF_SCRIPT = `${PROFILE_HELPERS}${STAR_HELPERS}
var app = appOf(Inputs.app);
var p = null;
for (var i = 0; i < app.profiles.length; i++) if (app.profiles[i].id === app.activeId) p = app.profiles[i];
var look = p ? String(p.look || 'pixel-art') : 'pixel-art';
var seed = p ? String(p.seed || p.name || 'Rocket') : 'Rocket';
var fr = !!p && String(p.lang) === 'fr';
var tab = String(Inputs.tab) === 'rocket' ? 'rocket' : 'face';
var model = p ? withStars(JSON.parse(JSON.stringify(p.model || {}))) : {};
var purse = p ? purseOf(model) : 0;
var owned = ownedOf(p);
var wear = wearOf(p);
var list = Array.isArray(Inputs.shelf) ? Inputs.shelf : [];
var rows = [];
for (var j = 0; j < list.length; j++) {
  var item = list[j];
  if (!item || item.kind !== tab) continue;
  // 🔴 The filter. A rocket item fits every face; a face item must name this look.
  if (!itemFits(item, look)) continue;
  var has = ownsItem(p, item);
  var worn = itemWorn(item, look, wear);
  var cost = costOf(item);
  var afford = canAfford(item, purse);
  var options = item.kind === 'face' && itemFits(item, look) ? wearOptions(look, putOn(item, look, wearOf(p))) : {};
  var canBuy = !has && afford;
  var note;
  if (worn) note = fr ? '✓ Sur toi' : '✓ Wearing';
  else if (has) note = fr ? 'À toi · touche pour mettre' : 'Yours · tap to wear';
  else if (canBuy) note = cost + ' ⭐';
  else note = (fr ? '🔒 ' + cost + ' ⭐ · encore ' + (cost - purse) : '🔒 ' + cost + ' ⭐ · ' + (cost - purse) + ' more');
  // PLY-002: a rocket tile draws a real rocket. A PAINT is shown plain, so its colour is the whole of it; a PATTERN is
  // shown on the paint the child is wearing, because that is what buying it would actually look like.
  var swatchPaint = item.paint || wear.paint || 'var(--primary)';
  var swatchPattern = item.pattern || '';
  rows.push({
    id: item.id, label: fr ? item.fr : item.en, note: note,
    isFace: item.kind === 'face', look: look, seed: seed, options: options,
    paint: swatchPaint, pattern: swatchPattern,
    cost: cost, worn: worn, canWear: has, canPick: canBuy,
    dim: !has && !afford
  });
}
// PLY-001 §3.2: owned, for a face that is not this one. A fact under the shelf — never a tile, never an offer.
var elsewhere = tab === 'face' ? ownedElsewhere(p, list, look) : 0;
Outputs.rows = rows;
Outputs.count = rows.length;
Outputs.picks = purse;
Outputs.hasPicks = purse >= SHOP_FROM;
Outputs.purse = purse;
Outputs.elsewhere = elsewhere;
Outputs.elsewhereText = elsewhere > 0
  ? (fr ? elsewhere + (elsewhere === 1 ? ' objet t’appartient' : ' objets t’appartiennent') + ' pour d’autres têtes.' : elsewhere + (elsewhere === 1 ? ' thing you own is' : ' things you own are') + ' for other faces.')
  : '';
`;

// ── Custom question sets ────────────────────────────────────────────────────

/**
 * P95 PLY-005 — the faces this child has rolled, and where in them they are standing.
 *
 * > "if you accidentally roll when you wanted the previous avatar, there should be a 'back' button [...] going back
 * > and then rolling forward again would be nice" — Richard, 2026-09-18
 *
 * Roll wrote a fresh random seed straight over the old one and kept nothing, so an accidental roll lost a face for
 * good. A roll now APPENDS and steps to the end, and Back and Forward walk the list — the whole list, not one step,
 * because a list costs the same as a single previous value and a child who rolled four times past the one they
 * wanted is in exactly the position Richard describes. Nothing is ever discarded: rolling from the middle still
 * appends at the end, so every face already seen is still reachable with Back.
 *
 * Actions, one placement per action (Logic/Hunt move's shape): `set` starts the list at one face (the form opening,
 * or an existing player's own), `roll` adds one, `back` and `forward` step.
 */
export const ROLL_HISTORY = 30;

export const ROLL_FACE_SCRIPT = `
var ROLL_HISTORY = ${ROLL_HISTORY};
var hist = Array.isArray(Inputs.history) ? Inputs.history.filter(function (x) { return typeof x === 'string' && x; }) : [];
var at = Math.floor(Number(Inputs.at));
if (!(at >= 0) || at > hist.length - 1) at = hist.length - 1;
var action = String(Inputs.action || 'roll');
var seed = String(Inputs.seed || '');
if (action === 'set') { hist = seed ? [seed] : []; at = hist.length - 1; }
else if (action === 'roll') { if (seed) { hist = hist.concat([seed]).slice(-ROLL_HISTORY); at = hist.length - 1; } }
else if (action === 'back') { if (at > 0) at -= 1; }
else if (action === 'forward') { if (at < hist.length - 1) at += 1; }
Outputs.history = hist;
Outputs.at = at;
Outputs.seed = at >= 0 && at < hist.length ? hist[at] : seed;
Outputs.canBack = at > 0;
Outputs.canForward = at >= 0 && at < hist.length - 1;
Outputs.position = hist.length ? (at + 1) + '/' + hist.length : '';
`;

export const PARSE_SET_SCRIPT = `
// Accepts the editor's rows OR pasted JSON: [{ "q": "...", "a": "...", "opts": [...] }] — or [["q","a"], ...].
var raw = Inputs.json;
var rows = Inputs.rows;
var items = [], error = '';
function push(q, a, opts) { q = String(q === undefined ? '' : q).trim(); a = String(a === undefined ? '' : a).trim(); if (q && a) items.push(opts && opts.length ? { q: q, a: a, opts: opts.map(String) } : { q: q, a: a }); }
if (Array.isArray(rows) && rows.length) { for (var i = 0; i < rows.length; i++) push(rows[i].q, rows[i].a, rows[i].opts); }
else if (typeof raw === 'string' && raw.trim()) {
  try {
    var parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error('not a list');
    for (var j = 0; j < parsed.length; j++) { var it = parsed[j]; if (Array.isArray(it)) push(it[0], it[1], it[2]); else if (it && typeof it === 'object') push(it.q || it.question, it.a || it.answer, it.opts || it.options); }
  } catch (e) { error = 'That is not a list of questions. Expected [{"q": "...", "a": "..."}].'; }
}
Outputs.items = items;
Outputs.count = items.length;
Outputs.error = error;
Outputs.valid = items.length > 0 && !error;
`;

export const UPSERT_SET_SCRIPT = `${PROFILE_HELPERS}
var app = appOf(Inputs.app);
var id = String(Inputs.setId || '');
var name = String(Inputs.name || '').trim() || 'My questions';
var items = Array.isArray(Inputs.items) ? Inputs.items : [];
if (!id) id = 's' + Date.now().toString(36);
var found = false;
for (var i = 0; i < app.sets.length; i++) if (app.sets[i].id === id) { app.sets[i] = { id: id, name: name, items: items }; found = true; }
if (!found) app.sets.push({ id: id, name: name, items: items });
Outputs.app = app;
Outputs.setId = id;
`;

export const DELETE_SET_SCRIPT = `${PROFILE_HELPERS}
var app = appOf(Inputs.app);
var id = String(Inputs.setId || '');
app.sets = app.sets.filter(function (s) { return s.id !== id; });
Outputs.app = app;
`;

export const LIST_SETS_SCRIPT = `${PROFILE_HELPERS}
var app = appOf(Inputs.app);
var wanted = String(Inputs.setId || '');
var rows = app.sets.map(function (s) { return { id: s.id, name: s.name, count: (s.items || []).length, itemsJson: JSON.stringify(s.items || [], null, 2), selected: s.id === wanted }; });
var chosen = null;
for (var i = 0; i < app.sets.length; i++) if (app.sets[i].id === wanted) chosen = app.sets[i];
if (!chosen && app.sets.length) chosen = app.sets[0];
Outputs.sets = rows;
Outputs.count = rows.length;
Outputs.hasSets = rows.length > 0;
Outputs.chosenId = chosen ? chosen.id : '';
Outputs.chosenName = chosen ? chosen.name : '';
Outputs.chosenItems = chosen ? chosen.items : [];
Outputs.chosenJson = chosen ? JSON.stringify(chosen.items, null, 2) : '[]';
`;

// ── The save code ───────────────────────────────────────────────────────────

/**
 * One profile as text: version, the profile fields, and each skill's state
 * quantised to integers. Base64 of UTF-8 JSON, URL-safe alphabet, no padding —
 * about 60 characters plus ~12 per skill met. Not encrypted and not signed: it
 * is a child's own maths progress, and the code is the password.
 */
export const SAVE_CODE_HELPERS = `
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

export const ENCODE_SAVE_SCRIPT = `${PROFILE_HELPERS}${SAVE_CODE_HELPERS}${STAR_HELPERS}
var app = appOf(Inputs.app);
var id = String(Inputs.profileId || app.activeId);
var p = null;
for (var i = 0; i < app.profiles.length; i++) if (app.profiles[i].id === id) p = app.profiles[i];
var code = '';
if (p) {
  var sk = {};
  // RKT-010 v2: the stars, each skill's paid level (index 8) and the personal bests. PLY-002 v3: what has been SPENT, so a
  // restored profile's purse is its own and not its whole earned total.
  var mdl = withStars(JSON.parse(JSON.stringify(p.model || {})));
  var skills = mdl.skills;
  for (var k in skills) { var s = skills[k]; sk[k] = [Math.round(s.d || 0), s.n || 0, s.streak || 0, Math.round((s.hl || 1) * 4), Math.round((s.due || 0) / 3600000), s.m || 0, Math.round(s.best || 0), s.miss || 0, s.paid || 0]; }
  // RKT-011: what the child owns and wears travels in the same code.
  var packed = { v: 3, n: p.name, k: p.look, s: p.seed, l: p.level, g: p.lang, y: p.layout, r: mdl.rating || 0, a: mdl.answered || 0, d: (p.days || []).slice(-14), sk: sk, st: mdl.stars, b: mdl.bests, o: ownedOf(p), w: wearOf(p), sp: spentOf(mdl) };
  code = 'RS1.' + toB64(JSON.stringify(packed));
}
Outputs.code = code;
Outputs.length = code.length;
`;

export const DECODE_SAVE_SCRIPT = `${PROFILE_HELPERS}${SAVE_CODE_HELPERS}
var app = appOf(Inputs.app);
var code = String(Inputs.code || '').trim();
var ok = false, error = '', profileId = '';
try {
  if (code.indexOf('RS1.') !== 0) throw new Error('prefix');
  var packed = JSON.parse(fromB64(code.slice(4)));
  if (!packed || [1, 2, 3].indexOf(packed.v) === -1 || typeof packed.n !== 'string') throw new Error('shape');
  var v2 = packed.v >= 2;
  var v3 = packed.v >= 3;
  var skills = {};
  // A v1 code carries no stars: its model is migrated on first read, the same as a profile saved before RKT-010.
  for (var k in (packed.sk || {})) { var a = packed.sk[k]; skills[k] = { d: a[0], n: a[1], streak: a[2], hl: a[3] / 4, due: a[4] * 3600000, m: a[5], best: a[6], miss: a[7] || 0, last: [], fluentRun: 0 }; if (v2) skills[k].paid = a[8] || 0; }
  var lang = packed.g === 'fr' ? 'fr' : 'en';
  var profile = { id: 'p' + Date.now().toString(36) + Math.floor(Math.random() * 1000).toString(36), name: String(packed.n).slice(0, 24), look: String(packed.k || 'pixel-art'), seed: String(packed.s || packed.n), level: String(packed.l || 'CE2'), lang: lang, layout: String(packed.y || (lang === 'fr' ? 'azerty' : 'qwerty')), sound: true, answerMode: 'auto', created: Date.now(), days: Array.isArray(packed.d) ? packed.d : [], model: { rating: Number(packed.r) || 0, skills: skills, lastSkill: '', answered: Number(packed.a) || 0 } };
  if (v2) { profile.model.stars = Number(packed.st) || 0; profile.model.bests = packed.b && typeof packed.b === 'object' ? packed.b : {}; }
  // PLY-002: a v2 code was written before prices existed, so it restores with an unspent purse — generous on purpose, never in debt.
  profile.model.spent = v3 ? Math.max(0, Number(packed.sp) || 0) : 0;
  if (v2 && Array.isArray(packed.o)) profile.owned = ownedOf({ owned: packed.o });
  if (v2 && packed.w && typeof packed.w === 'object') profile.wear = wearOf({ wear: packed.w });
  // The same name already here: replace it rather than make a twin.
  var replaced = false;
  for (var i = 0; i < app.profiles.length; i++) if (app.profiles[i].name === profile.name) { profile.id = app.profiles[i].id; app.profiles[i] = profile; replaced = true; }
  if (!replaced) { if (app.profiles.length >= ${MAX_PROFILES}) throw new Error('full'); app.profiles.push(profile); }
  app.activeId = profile.id;
  profileId = profile.id;
  ok = true;
} catch (e) {
  error = e && e.message === 'full' ? 'full' : 'bad';
}
Outputs.app = app;
Outputs.ok = ok;
Outputs.error = error;
Outputs.profileId = profileId;
`;

// ── Translate words ─────────────────────────────────────────────────────────

/**
 * Generated one line per word, because `Outputs[key]` in a loop mints no port.
 * `Inputs.words` is the `Data/Words` array of `{ key, en, fr }`.
 */
export const TRANSLATE_SCRIPT = `
var lang = String(Inputs.lang) === 'fr' ? 'fr' : 'en';
var rows = Inputs.words || [];
var map = {};
for (var i = 0; i < rows.length; i++) map[rows[i].key] = rows[i][lang] || rows[i].en || '';
Outputs.lang = lang;
Outputs.isFr = lang === 'fr';
${WORD_KEYS.map((key) => `Outputs.${key} = map.${key} || '';`).join('\n')}
`;

// ── Mark the selected item ──────────────────────────────────────────────────

/**
 * A row list with `selected` set on the one whose `value` is the current
 * value — what a segmented control's For Each needs, since a repeated row
 * cannot read its parent's value any other way.
 */
export const MARK_SELECTED_SCRIPT = `
var items = Inputs.items || [];
var value = String(Inputs.value === undefined || Inputs.value === null ? '' : Inputs.value);
var rows = [];
for (var i = 0; i < items.length; i++) {
  var it = items[i] && typeof items[i] === 'object' ? items[i] : { label: String(items[i]), value: String(items[i]) };
  // "id" — a repeater tells rows apart by id; without one every re-run is a fresh set of rows.
  rows.push({ id: String(it.value), label: String(it.label === undefined ? it.value : it.label), value: String(it.value), selected: String(it.value) === value });
}
Outputs.rows = rows;
Outputs.count = rows.length;
`;

// ── Teach card lookup ───────────────────────────────────────────────────────

export const TEACH_CARD_SCRIPT = `${HELPERS}
var cards = Inputs.cards || [];
var id = String(Inputs.teachId || '');
var lang = isFr(Inputs.lang) ? 'fr' : 'en';
var step = Math.max(0, Math.min(2, Number(Inputs.step) || 0));
var card = null;
for (var i = 0; i < cards.length; i++) if (cards[i].id === id) card = cards[i];
Outputs.found = !!card;
Outputs.title = card ? pickText(card.title, lang) : '';
Outputs.text = card ? pickText(card.steps[step], lang) : '';
Outputs.example = card ? pickText(card.example, lang) : '';
Outputs.step = step;
Outputs.isFaded = step > 0;
`;

/** Every Function script the template ships, by the logic component that holds it. */
export const FUNCTION_SCRIPTS: ReadonlyArray<{ component: string; script: string; seam: string }> = [
  { component: 'Logic/Pick next question', script: PICK_QUESTION_SCRIPT, seam: 'which skill is due, and one question on it' },
  { component: 'Logic/Grade answer', script: GRADE_ANSWER_SCRIPT, seam: 'was it right, how fast, what the model now believes' },
  { component: 'Logic/Slide and merge', script: SLIDE_MERGE_SCRIPT, seam: 'the board after a slide' },
  { component: 'Logic/New merge board', script: NEW_BOARD_SCRIPT, seam: 'a fresh board, from the pool the profile’s bonds call for' },
  { component: 'Logic/Draw merge board', script: DRAW_MERGE_SCRIPT, seam: 'the board as rows of squares to draw, and the score line' },
  { component: 'Logic/Finish merge', script: FINISH_MERGE_SCRIPT, seam: 'the stars a finished board pays, once' },
  { component: 'Logic/Build number hunt', script: BUILD_HUNT_SCRIPT, seam: 'a grid and a target with a known number of solutions' },
  { component: 'Logic/New hunt', script: NEW_HUNT_SCRIPT, seam: 'a fresh hunt: its first grid, and a new id' },
  { component: 'Logic/Hunt move', script: HUNT_MOVE_SCRIPT, seam: 'the hunt after a tap, a way shown, or the next grid' },
  { component: 'Logic/Draw hunt', script: DRAW_HUNT_SCRIPT, seam: 'the hunt as rows of squares, the instruction, the progress and the note' },
  { component: 'Logic/Finish hunt', script: FINISH_HUNT_SCRIPT, seam: 'the stars a finished hunt pays, once' },
  { component: 'Logic/New monster game', script: NEW_MONSTER_SCRIPT, seam: 'a fresh Monster Gate game: three hearts, the first monster, a new id' },
  { component: 'Logic/Monster move', script: MONSTER_MOVE_SCRIPT, seam: 'the game after a graded answer, or the next monster arriving' },
  { component: 'Logic/Draw monster', script: DRAW_MONSTER_SCRIPT, seam: 'the game as the lane draws it: hearts, the monster, where it stands, what just happened' },
  { component: 'Logic/Finish monster', script: FINISH_MONSTER_SCRIPT, seam: 'the stars a finished game pays beyond its answers, once' },
  { component: 'Logic/Check hunt pick', script: CHECK_HUNT_SCRIPT, seam: 'do the picked tiles make the target' },
  { component: 'Logic/Toggle index', script: TOGGLE_INDEX_SCRIPT, seam: 'a list with one index added or removed' },
  { component: 'Logic/List profiles', script: LIST_PROFILES_SCRIPT, seam: 'the profiles, decorated' },
  { component: 'Logic/Create profile', script: CREATE_PROFILE_SCRIPT, seam: 'the store with one more profile' },
  { component: 'Logic/Select profile', script: SELECT_PROFILE_SCRIPT, seam: 'the store with a different active profile' },
  { component: 'Logic/Delete profile', script: DELETE_PROFILE_SCRIPT, seam: 'the store with one fewer profile' },
  { component: 'Logic/Active profile', script: ACTIVE_PROFILE_SCRIPT, seam: 'the active profile, field by field' },
  { component: 'Logic/Save model', script: SAVE_MODEL_SCRIPT, seam: 'the store with the profile\'s model replaced and today recorded' },
  { component: 'Logic/Finish race', script: FINISH_RACE_SCRIPT, seam: 'the stars a race pays that are not answers, once per race' },
  { component: 'Logic/Update settings', script: UPDATE_SETTINGS_SCRIPT, seam: 'the store with a profile\'s settings changed' },
  { component: 'Logic/Pick item', script: PICK_ITEM_SCRIPT, seam: 'the store with one pick spent on an item, and the item worn' },
  { component: 'Logic/Wear item', script: WEAR_ITEM_SCRIPT, seam: 'the store with an item the child has put on or taken off' },
  { component: 'Logic/Hangar shelf', script: HANGAR_SHELF_SCRIPT, seam: 'one tab of the shelf, as the active player sees it' },
  { component: 'Logic/Parse question set', script: PARSE_SET_SCRIPT, seam: 'rows or JSON into a clean list of questions' },
  { component: 'Logic/Save question set', script: UPSERT_SET_SCRIPT, seam: 'the store with a set added or replaced' },
  { component: 'Logic/Delete question set', script: DELETE_SET_SCRIPT, seam: 'the store with a set removed' },
  { component: 'Logic/List question sets', script: LIST_SETS_SCRIPT, seam: 'the sets, and the chosen one' },
  { component: 'Logic/Encode save code', script: ENCODE_SAVE_SCRIPT, seam: 'a profile as a code' },
  { component: 'Logic/Decode save code', script: DECODE_SAVE_SCRIPT, seam: 'a code back into a profile' },
  { component: 'Logic/Translate words', script: TRANSLATE_SCRIPT, seam: 'every interface word in the chosen language' },
  { component: 'Logic/Mark selected', script: MARK_SELECTED_SCRIPT, seam: 'rows with the chosen one flagged' },
  { component: 'Logic/Teach card', script: TEACH_CARD_SCRIPT, seam: 'one card at one fading step' }
];

/**
 * Run a Function script the way the node does, for the gate: `Inputs` in,
 * `Outputs` out. Synchronous (no script here awaits).
 */
export function runScript(script: string, inputs: Record<string, unknown>): Record<string, any> {
  const outputs: Record<string, any> = {};
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const fn = new Function('Inputs', 'Outputs', script);
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
