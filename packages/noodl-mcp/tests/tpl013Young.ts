/**
 * TPL-013 SC-2 — Star Class's P1 and P2: numbers and pictures.
 *
 * TPL-013 §2.2.2: at the end of P2, half of Ghana's pupils could not read one English word, and 99% could name numbers.
 * So nothing here is read but numerals. The objects are emoji (no art to ship), the answer is a tap, and every line a
 * child is shown (the skill's line, the prompt, the options, the worked line) holds only digits, symbols and emoji —
 * `tpl013Edition.test.ts` checks every character.
 *
 * | skill | class | the question | the tap |
 * |---|---|---|---|
 * | `count-10`, `count-20` | P1, P2 | a pile of things `= ?` | its number, of four |
 * | `more-10`, `more-20` | P1, P2 | 👆 ➕ | the bigger of two piles |
 * | `match-10` | P1 | a numeral | the pile that many, of three |
 * | `missing-20`, `missing-100` | P1, P2 | five numbers in a row, one a `?` (P2 counts in 2s, 5s and 10s) | the missing one, of four |
 * | `odd-kind`, `odd-count` | P1, P2 | 👆 ≠ | the one not like the others: a different kind of thing (P1), a different number of things (P2) |
 *
 * The answer to a pile question is the pile itself, so a miss says "The answer was 🐔🐔🐔🐔." and not a letter. Piles are
 * drawn in fives with a space between, so 13 reads as 5 + 5 + 3 and wraps on a phone between the groups, never inside one.
 *
 * The skill's own line (above the prompt) is an icon and its range: 🔢 10 count, ⚖️ 20 more, 🎯 10 match, ❓ 100 missing,
 * 🔍 odd one out (🔍 🔢 by number). Every name is different, so a grown-up, the chooser and a drive can tell them apart.
 *
 * Rocket School does not get these: its youngest class is CE2. They reach the picker through the edition, as two counted
 * insertions ({@link YOUNG_GENERATORS} beside `generate`, {@link YOUNG_CASES} in its switch).
 *
 * @module noodl-mcp/tests/tpl013Young
 */
import type { Skill } from './tpl007Curriculum';

/** The things counted. Everyday, and none of TPL-013 §2.1.5's (pork, alcohol, betting). */
export const YOUNG_THINGS = ['🥭', '🍌', '🍊', '🥚', '🐐', '🐔', '🐟', '⚽', '⭐', '🌽', '✏️', '🦋'];

/** The kinds the P1 odd one out draws from: three of one kind and one of another. */
export const YOUNG_KINDS = [
  ['🥭', '🍌', '🍊', '🍍', '🍉'],
  ['🐐', '🐔', '🐟', '🐄', '🦆'],
  ['🚲', '🚌', '🚗', '🛵'],
  ['✏️', '📚', '📏', '🎒']
];

export const YOUNG_TOPIC = { id: 'counting', subject: 'maths', name: { en: 'Counting and numbers', fr: 'Compter et les nombres' } } as const;

/** The generators, as the picker runs them (ES5, beside the helpers). */
export const YOUNG_GENERATORS = `
// TPL-013 SC-2: P1–P2, numbers and pictures. Nothing to read but numerals: the things are emoji, the answer is a tap.
var YOUNG_THINGS = ${JSON.stringify(YOUNG_THINGS)};
var YOUNG_KINDS = ${JSON.stringify(YOUNG_KINDS)};
/** n of a thing, in fives with a space between, so 13 reads as 5 + 5 + 3 and a phone wraps between groups. */
function pile(thing, n) { var out = ''; for (var i = 0; i < n; i++) out += (i && i % 5 === 0 ? ' ' : '') + thing; return out; }
/** k different numbers near n (within 3), never n, inside lo..hi. */
function youngNear(n, lo, hi, k) {
  var out = [];
  for (var t = 0; t < 200 && out.length < k; t++) { var v = n + rnd(1, 3) * (Math.random() < 0.5 ? -1 : 1); if (v >= lo && v <= hi && v !== n && out.indexOf(v) === -1) out.push(v); }
  for (var w = lo; out.length < k && w <= hi; w++) if (w !== n && out.indexOf(w) === -1) out.push(w);
  return out;
}
function countObjectsQ(p) {
  var max = Number(p.max) || 10, min = Number(p.min) || 1;
  var n = rnd(min, max), thing = pickOne(YOUNG_THINGS);
  var opts = [n].concat(youngNear(n, 1, max + 3, 3));
  return { prompt: pile(thing, n) + ' = ?', answer: String(n), options: opts.map(String), worked: pile(thing, n) + ' = ' + n };
}
function morePileQ(p) {
  var max = Number(p.max) || 10, min = Number(p.min) || 1;
  var a = rnd(min, max), b = rnd(min, max);
  while (b === a) b = rnd(min, max);
  var thing = pickOne(YOUNG_THINGS), pa = pile(thing, a), pb = pile(thing, b);
  return { prompt: '👆 ➕', answer: a > b ? pa : pb, options: [pa, pb], optionValues: [pa, pb], worked: a + (a > b ? ' > ' : ' < ') + b };
}
function matchNumeralQ(p) {
  var max = Number(p.max) || 10;
  var n = rnd(1, max), thing = pickOne(YOUNG_THINGS);
  var labels = [n].concat(youngNear(n, 1, max, 2)).map(function (c) { return pile(thing, c); });
  return { prompt: String(n), answer: labels[0], options: labels, optionValues: labels, worked: labels[0] + ' = ' + n };
}
function missingNumberQ(p) {
  var max = Number(p.max) || 20, steps = Array.isArray(p.steps) && p.steps.length ? p.steps : [1];
  var step = Number(pickOne(steps)), len = 5;
  var start = step === 1 ? rnd(1, max - len + 1) : rnd(0, Math.floor((max - step * (len - 1)) / step)) * step;
  var seq = [];
  for (var i = 0; i < len; i++) seq.push(start + i * step);
  var hole = rnd(1, len - 2), ans = seq[hole];
  // 🔴 Never a number already in the row: with three of them on screen, the answer is the one that is not, and nothing is counted.
  var flip = Number(String(ans).split('').reverse().join(''));
  var near = shuffle([seq[0] - step, seq[len - 1] + step, ans + 10, ans - 10, flip, ans + step * len, ans + 5]);
  var opts = [ans];
  for (var k = 0; k < near.length && opts.length < 4; k++) if (near[k] >= 0 && seq.indexOf(near[k]) === -1 && opts.indexOf(near[k]) === -1) opts.push(near[k]);
  // 🔴 P78-TPL013-MISSINGTHREE: 0 ? 10 15 20 left only 25 and 30 (−5 and −5 below zero, 15 and 10 in the row, 5 its own flip). Top up off the row.
  for (var d = 1; opts.length < 4 && d < 100; d++) if (seq.indexOf(ans + d) === -1 && opts.indexOf(ans + d) === -1) opts.push(ans + d);
  var shown = seq.map(function (v, j) { return j === hole ? '?' : String(v); }).join('  ');
  return { prompt: shown, answer: String(ans), options: opts.map(String), worked: seq.join('  ') };
}
function oddOneQ(p) {
  var kinds = shuffle(YOUNG_KINDS);
  if (!p.byCount) {
    var same = shuffle(kinds[0]).slice(0, 3), odd = pickOne(kinds[1]);
    var opts = same.concat([odd]);
    return { prompt: '👆 ≠', answer: odd, options: opts, optionValues: opts, worked: same.join(' ') + '  ≠  ' + odd };
  }
  var max = Number(p.max) || 6, n = rnd(2, max), m = n + (Math.random() < 0.5 ? -1 : 1) * rnd(1, 2);
  if (m < 1) m = n + rnd(1, 2);
  var things = shuffle(YOUNG_THINGS).slice(0, 4);
  var labels = [pile(things[0], n), pile(things[1], n), pile(things[2], n), pile(things[3], m)];
  return { prompt: '👆 ≠', answer: labels[3], options: labels, optionValues: labels, worked: n + ' · ' + n + ' · ' + n + '  ≠  ' + m };
}
`;

/** The cases `generate` gains, after its first. */
export const YOUNG_CASES = `
    case 'countObjects': return countObjectsQ(p);
    case 'morePile': return morePileQ(p);
    case 'matchNumeral': return matchNumeralQ(p);
    case 'missingNumber': return missingNumberQ(p);
    case 'oddOne': return oddOneQ(p);`;

const same = (text: string) => ({ en: text, fr: text });

function young(id: string, level: 'P1' | 'P2', generator: string, params: Record<string, unknown>, diff: number, name: string, strategy: string, fluentMs: number): Skill {
  return {
    id,
    level: level as unknown as Skill['level'],
    strand: 'number',
    subject: 'maths',
    topic: YOUNG_TOPIC.id,
    generator,
    params,
    answer: 'options',
    fluentMs,
    diff,
    name: same(name),
    strategy: same(strategy),
    teach: ''
  };
}

/** P1 and P2. Each one's name and strategy are icons, the same in both languages. */
export const YOUNG_SKILLS: ReadonlyArray<Skill> = [
  young('count-10', 'P1', 'countObjects', { max: 10 }, 0.1, '🔢 10', '👆 1 · 2 · 3 …', 7000),
  young('odd-kind', 'P1', 'oddOne', {}, 0.2, '🔍', '👀', 5000),
  young('more-10', 'P1', 'morePile', { max: 10 }, 0.3, '⚖️ 10', '👀 ➕', 5000),
  young('match-10', 'P1', 'matchNumeral', { max: 10 }, 0.5, '🎯 10', '👆 1 · 2 · 3 …', 7000),
  young('missing-20', 'P1', 'missingNumber', { max: 20, steps: [1] }, 0.7, '❓ 20', '1 · 2 · 3 · 4 · 5', 6000),
  young('count-20', 'P2', 'countObjects', { min: 8, max: 20 }, 0.2, '🔢 20', '👆 5 · 10 · 15 …', 9000),
  young('more-20', 'P2', 'morePile', { min: 6, max: 20 }, 0.3, '⚖️ 20', '👀 ➕', 6000),
  young('odd-count', 'P2', 'oddOne', { byCount: true, max: 6 }, 0.5, '🔍 🔢', '👆 1 · 2 · 3 …', 7000),
  young('missing-100', 'P2', 'missingNumber', { max: 100, steps: [1, 2, 5, 10] }, 0.7, '❓ 100', '2 · 4 · 6 · 8', 7000)
];
