/**
 * TPL-013 SC-4 — Star Class's third bank: Verbal Reasoning, with Quantitative Reasoning as a generator, under one 🧩 Reasoning
 * subject.
 *
 * The subjects briefing (`tpl-013-subjects-briefing.md` §2, §7) ranks Verbal Reasoning third: Nigeria's National Common Entrance
 * (end of P6, the paper that decides a Unity College place) sets "Quantitative and Verbal Aptitude", it is the largest
 * motivator for the first users, and its items fit a tap-the-answer format almost perfectly. Quantitative Reasoning is the same
 * paper's number half: patterns and rules, so it is a generator, not a list. Both sit at P4–P6, where the exam is.
 *
 * Every item is written fresh: the briefing's §3 names the item types (analogies, odd one out, word families, alphabetical
 * order, codes; sequences, missing numbers, number boxes), nothing is copied from a past paper. English only (TPL-013 §5.4).
 * Verbal Reasoning has no facts to source: each item's rule is checkable on the screen, and the note says it.
 *
 * ## Verbal Reasoning (`subject: 'reasoning'`, topic `sc-verbal`)
 *
 * | skill | class | the question |
 * |---|---|---|
 * | `vr-odd-one-out` | P4 | four words; the one that does not belong (the note says what the others share) |
 * | `vr-alphabet` | P4 | four words; the one a dictionary lists first |
 * | `vr-analogies` | P5 | A is to B as C is to ___ |
 * | `vr-letter-series` | P5 | A, C, E, G, ? |
 * | `vr-compound` | P5 | foot + ___ makes one word (exactly one button does) |
 * | `vr-codes` | P6 | if CAT is written DBU, how is DOG written? |
 *
 * ## Quantitative Reasoning (`subject: 'reasoning'`, topic `sc-quant`)
 *
 * | skill | class | the question | the wrong buttons |
 * |---|---|---|---|
 * | `qr-series-add` | P4 | 7, 12, 17, 22, ? (or a gap in the middle) | one step too many or too few; one off |
 * | `qr-series-mul` | P5 | 3, 6, 12, 24, ? (× 2, × 3, or ÷ going down) | the last gap added again (seeing + where it is ×) |
 * | `qr-rule` | P5 | 3 → 7 · 5 → 11 · 8 → ? | the first pair's difference added; the × without the + |
 * | `qr-series-grow` | P6 | gaps that grow, square numbers, + then − | the last gap repeated |
 *
 * 🔴 Every function and case name here is new to the picker (`qr…`): a second `case` never runs and a second `function`
 * replaces the first everywhere (TPL-013 s4's `proportion`). Gated in tpl013Edition.test.ts, which counts both.
 *
 * @module noodl-mcp/tests/tpl013Reasoning
 */
import type { Skill } from './tpl007Curriculum';
import type { ListItem } from './tpl007Subjects';
import { bank, gap, s } from './tpl013Banks';

// ── Verbal Reasoning ────────────────────────────────────────────────────────

/** Four words, one of which does not belong. The buttons are the four; the note says what the other three share. */
const odd = (words: [string, string, string, string], a: string, why: string): ListItem => gap(words.join(' · '), a, words, why);

const ODD_ONE_OUT: ListItem[] = [
  odd(['mango', 'orange', 'cassava', 'pawpaw'], 'cassava', 'The others are fruits; cassava is a root.'),
  odd(['goat', 'cow', 'sheep', 'eagle'], 'eagle', 'The others have four legs; an eagle is a bird.'),
  odd(['red', 'yellow', 'blue', 'round'], 'round', 'The others are colours; round is a shape.'),
  odd(['Abuja', 'Accra', 'Ghana', 'Monrovia'], 'Ghana', 'The others are cities; Ghana is a country.'),
  odd(['Monday', 'Friday', 'June', 'Sunday'], 'June', 'The others are days of the week; June is a month.'),
  odd(['square', 'triangle', 'rectangle', 'cube'], 'cube', 'The others are flat shapes; a cube is solid.'),
  odd(['nose', 'ear', 'eye', 'elbow'], 'elbow', 'The others are sense organs: we smell, hear and see with them.'),
  odd(['run', 'jump', 'swim', 'happy'], 'happy', 'The others are action words (verbs).'),
  odd(['2', '4', '7', '8'], '7', 'The others are even numbers.'),
  odd(['doctor', 'nurse', 'pharmacist', 'driver'], 'driver', 'The others work in health.'),
  odd(['hammer', 'saw', 'chisel', 'bucket'], 'bucket', 'The others are a carpenter’s tools.'),
  odd(['lion', 'leopard', 'cheetah', 'crocodile'], 'crocodile', 'The others are cats (mammals); a crocodile is a reptile.'),
  odd(['Niger', 'Benue', 'Volta', 'Sahara'], 'Sahara', 'The others are rivers; the Sahara is a desert.'),
  odd(['happy', 'glad', 'joyful', 'angry'], 'angry', 'The others mean the same.')
];

/** Four words; the right one is the one a dictionary lists first. */
const abc = (words: [string, string, string, string], why: string): ListItem => {
  const first = [...words].sort((x, y) => x.toLowerCase().localeCompare(y.toLowerCase()))[0];
  return gap(words.join(' · '), first, words, why);
};

const ALPHABET: ListItem[] = [
  abc(['mango', 'melon', 'maize', 'milk'], 'm-a-i comes before m-a-n: look at the third letter.'),
  abc(['bread', 'banana', 'beans', 'butter'], 'a comes before e, r and u: look at the second letter.'),
  abc(['cat', 'car', 'cap', 'can'], 'n comes before p, r and t: look at the third letter.'),
  abc(['school', 'sand', 'sun', 'stone'], 'a comes before c, t and u: look at the second letter.'),
  abc(['town', 'teacher', 'tiger', 'table'], 'a comes before e, i and o: look at the second letter.'),
  abc(['door', 'dog', 'dot', 'doll'], 'g comes before l, o and t: look at the third letter.'),
  abc(['pen', 'pencil', 'peace', 'pea'], 'A short word that starts a longer one comes first: pea, peace, pen, pencil.'),
  abc(['river', 'rich', 'ring', 'rice'], 'r-i-c-e and r-i-c-h share three letters; e comes before h.'),
  abc(['farm', 'father', 'fast', 'fan'], 'n comes before r, s and t: look at the third letter.'),
  abc(['goat', 'gold', 'good', 'go'], 'go is the start of the others, so it comes first.'),
  abc(['Abuja', 'Accra', 'Aba', 'Asaba'], 'b comes before c and s; then Aba before Abuja, because a comes before u.'),
  abc(['water', 'watch', 'wash', 'was'], 'was is the start of wash, and s comes before t.')
];

const ANALOGIES: ListItem[] = [
  gap('Hot is to cold as tall is to ___.', 'short', ['short', 'big', 'high', 'long'], 'Opposites: hot ↔ cold, tall ↔ short.'),
  gap('Bird is to nest as bee is to ___.', 'hive', ['hive', 'honey', 'flower', 'tree'], 'Where it lives: a bird in a nest, a bee in a hive.'),
  gap('Finger is to hand as toe is to ___.', 'foot', ['foot', 'leg', 'shoe', 'knee'], 'A part of: fingers are on the hand, toes on the foot.'),
  gap('Fish is to swim as bird is to ___.', 'fly', ['fly', 'feather', 'egg', 'beak'], 'How it moves: a fish swims, a bird flies.'),
  gap('Doctor is to hospital as teacher is to ___.', 'school', ['school', 'book', 'pupil', 'market'], 'Where they work.'),
  gap('Cow is to calf as goat is to ___.', 'kid', ['kid', 'lamb', 'puppy', 'foal'], 'The young: a calf is a young cow, a kid a young goat. A lamb is a young sheep.'),
  gap('Pen is to write as knife is to ___.', 'cut', ['cut', 'cook', 'fork', 'sharp'], 'What it is used for.'),
  gap('Eye is to see as ear is to ___.', 'hear', ['hear', 'smell', 'speak', 'touch'], 'What it does.'),
  gap('One is to first as two is to ___.', 'second', ['second', 'twice', 'double', 'third'], 'Counting and order: one → first, two → second.'),
  gap('Shoe is to foot as glove is to ___.', 'hand', ['hand', 'arm', 'head', 'neck'], 'What it covers.'),
  gap('Lion is to roar as dog is to ___.', 'bark', ['bark', 'hiss', 'bray', 'crow'], 'Its sound: a snake hisses, a donkey brays, a cock crows.'),
  gap('Tailor is to cloth as carpenter is to ___.', 'wood', ['wood', 'hammer', 'house', 'nail'], 'What they work with. A hammer is a tool, not the material.'),
  gap('Big is to bigger as good is to ___.', 'better', ['better', 'gooder', 'best', 'well'], 'good, better, best: “gooder” is not a word.'),
  gap('Water is to thirsty as food is to ___.', 'hungry', ['hungry', 'full', 'eat', 'tired'], 'What we need it for: water when thirsty, food when hungry.')
];

const LETTER_SERIES: ListItem[] = [
  gap('A, C, E, G, ?', 'I', ['I', 'H', 'J', 'K'], 'Skip one letter each time: G, (H), I.'),
  gap('Z, Y, X, W, ?', 'V', ['V', 'U', 'A', 'X'], 'The alphabet backwards.'),
  gap('A, B, D, G, ?', 'K', ['K', 'J', 'H', 'L'], 'The gaps grow: +1, +2, +3, then +4. G + 4 = K.'),
  gap('AB, CD, EF, ?', 'GH', ['GH', 'FG', 'HI', 'EG'], 'Pairs of letters in order.'),
  gap('A, Z, B, Y, C, ?', 'X', ['X', 'D', 'W', 'Z'], 'Two patterns take turns: A, B, C forwards and Z, Y, X backwards.'),
  gap('M, O, Q, S, ?', 'U', ['U', 'T', 'V', 'W'], 'Skip one letter each time: S, (T), U.'),
  gap('AZ, BY, CX, ?', 'DW', ['DW', 'DX', 'EW', 'CW'], 'The first letter goes forwards, the second backwards.'),
  gap('C, F, I, L, ?', 'O', ['O', 'N', 'P', 'M'], 'Jump three letters each time: L, (M, N), O.'),
  gap('Y, W, U, S, ?', 'Q', ['Q', 'R', 'P', 'T'], 'Back two letters each time: S, (R), Q.'),
  gap('A1, B2, C3, ?', 'D4', ['D4', 'C4', 'D3', 'E5'], 'The letter and the number both go up by one.'),
  gap('ACE, BDF, CEG, ?', 'DFH', ['DFH', 'DEF', 'CFH', 'DFG'], 'Every letter moves on by one: A→B→C→D, C→D→E→F, E→F→G→H.'),
  gap('B, E, H, K, ?', 'N', ['N', 'M', 'O', 'L'], 'Jump three letters each time: K, (L, M), N.')
];

/** Exactly one of the four buttons joins on to make one word (raincoat and rainfall are left off rain's buttons on purpose). */
const COMPOUND: ListItem[] = [
  gap('foot + ___', 'ball', ['ball', 'cap', 'pen', 'run'], 'football'),
  gap('rain + ___', 'bow', ['bow', 'sun', 'fish', 'leg'], 'rainbow'),
  gap('class + ___', 'room', ['room', 'door', 'desk', 'sit'], 'classroom'),
  gap('sun + ___', 'flower', ['flower', 'rain', 'cup', 'hand'], 'sunflower'),
  gap('tooth + ___', 'brush', ['brush', 'mouth', 'cup', 'white'], 'toothbrush'),
  gap('bed + ___', 'room', ['room', 'sleep', 'chair', 'cap'], 'bedroom'),
  gap('butter + ___', 'fly', ['fly', 'bread', 'shoe', 'pot'], 'butterfly'),
  gap('grand + ___', 'mother', ['mother', 'house', 'big', 'chair'], 'grandmother'),
  gap('water + ___', 'melon', ['melon', 'cup', 'river', 'drink'], 'watermelon'),
  gap('note + ___', 'book', ['book', 'pen', 'write', 'desk'], 'notebook'),
  gap('some + ___', 'thing', ['thing', 'many', 'much', 'few'], 'something'),
  gap('any + ___', 'body', ['body', 'hand', 'face', 'leg'], 'anybody'),
  gap('fire + ___', 'wood', ['wood', 'hot', 'smoke', 'red'], 'firewood')
];

const CODES: ListItem[] = [
  gap('If CAT is written DBU, how is DOG written?', 'EPH', ['EPH', 'CNF', 'EOG', 'DPH'], 'Each letter moves on one: D→E, O→P, G→H.'),
  gap('If PEN is written QFO, how is BOOK written?', 'CPPL', ['CPPL', 'ANNJ', 'CPOL', 'BPPL'], 'Each letter moves on one: B→C, O→P, O→P, K→L.'),
  gap('If BAG is written AZF, how is HEN written?', 'GDM', ['GDM', 'IFO', 'GEM', 'HDM'], 'Each letter goes back one (A goes back round to Z): H→G, E→D, N→M.'),
  gap('If A = 1, B = 2, C = 3…, what is BAD?', '2 1 4', ['2 1 4', '2 1 3', '1 2 4', '2 4 1'], 'B = 2, A = 1, D = 4.'),
  gap('If A = 1, B = 2…, which word is 6 1 14?', 'FAN', ['FAN', 'FAT', 'EAN', 'FAM'], '6 = F, 1 = A, 14 = N.'),
  gap('If GO is written HP, how is SIT written?', 'TJU', ['TJU', 'RHS', 'SJU', 'TIU'], 'Each letter moves on one: S→T, I→J, T→U.'),
  gap('If MILK is written KLIM, how is RICE written?', 'ECIR', ['ECIR', 'RECI', 'ICER', 'ERIC'], 'The word is written backwards.'),
  gap('If BOOK is 2 15 15 11, what is COOK?', '3 15 15 11', ['3 15 15 11', '2 15 15 11', '3 14 14 11', '4 15 15 11'], 'Only the first letter changes: C = 3.'),
  gap('If RAT is written TCV, how is MAP written?', 'OCR', ['OCR', 'NBQ', 'OCQ', 'KYN'], 'Each letter moves on two: M→O, A→C, P→R.'),
  gap('In a code, TEA is written AET. How is SUN written?', 'NUS', ['NUS', 'SNU', 'USN', 'NSU'], 'The word is written backwards.'),
  gap('If DOG is written FQI, how is CAT written?', 'ECV', ['ECV', 'DBU', 'ECU', 'EBV'], 'Each letter moves on two: C→E, A→C, T→V.'),
  gap('If A = 26, B = 25, C = 24…, what is CAB?', '24 26 25', ['24 26 25', '3 1 2', '24 25 26', '23 26 25'], 'The alphabet counted backwards: C = 24, A = 26, B = 25.')
];

const ASK_ODD = s('Which one does not belong?', 'Lequel n’est pas à sa place ?');
const ASK_ABC = s('Which comes first in a dictionary?', 'Lequel vient en premier dans le dictionnaire ?');
const ASK_NEXT = s('What comes next?', 'Qu’est-ce qui vient ensuite ?');
const ASK_JOIN = s('Which word joins on to make one word?', 'Quel mot s’attache pour faire un seul mot ?');

// ── Quantitative Reasoning: the generators, as the picker runs them (ES5, beside the helpers) ─────────────────

export const QR_GENERATORS = `
// TPL-013 SC-4: Quantitative Reasoning, as Nigeria's Common Entrance asks it. Every answer a tap; the wrong buttons are what a
// child who sees half the pattern answers. jssOptions and signed are tpl013Jss.ts's.
/** The terms as a child reads them, with ? where one is missing. */
function qrList(terms, at) { var out = []; for (var i = 0; i < terms.length; i++) out.push(i === at ? '?' : String(terms[i])); return out.join(', '); }
/** Only the traps a child could answer, whole and above zero, then spares above the answer: never a 0 button (second reader, s6). */
function qrTraps(list, ans) { var out = [], all = list.concat([ans + 1, ans + 2, ans + 3]); for (var i = 0; i < all.length; i++) if (all[i] > 0) out.push(all[i]); return out; }
function qrSeriesQ(p, lang) {
  var kind = p && p.kind ? String(p.kind) : 'add', terms = [], at = 4, traps = [], why = '', i;
  if (kind === 'mul') {
    var r = Math.random() < 0.6 ? 2 : 3, a = r === 2 ? rnd(1, 6) : rnd(1, 3), down = Math.random() < 0.35;
    for (i = 0; i < 5; i++) terms.push(a * Math.pow(r, i));
    if (down) terms.reverse();
    var last = terms[3], prev = terms[2];
    traps = down ? [last - r, last - 1, 2 * last - prev] : [2 * last - prev, last + r, last * r + r];
    why = (down ? says(lang, 'Each number is the one before ÷ ', 'Chaque nombre est le précédent ÷ ') + r + ': ' + last + ' ÷ ' + r
      : says(lang, 'Each number is the one before × ', 'Chaque nombre est le précédent × ') + r + ': ' + last + ' × ' + r) + ' = ' + terms[4] + '.';
  } else if (kind === 'grow') {
    var shape = rnd(0, 2);
    if (shape === 0) {
      var d = rnd(1, 5), t = rnd(1, 10);
      for (i = 0; i < 6; i++) { terms.push(t); t += d + i; }
      why = says(lang, 'The gaps grow by 1: +', 'Les écarts grandissent de 1 : +') + d + ', +' + (d + 1) + ', +' + (d + 2) + ', +' + (d + 3) + says(lang, ', so next +', ', donc ensuite +') + (d + 4) + ': ' + terms[4] + ' + ' + (d + 4) + ' = ' + terms[5] + '.';
      traps = [terms[4] + d + 3, terms[4] + d + 5, terms[4] + d];
    } else if (shape === 1) {
      var n0 = rnd(1, 5);
      for (i = 0; i < 6; i++) terms.push((n0 + i) * (n0 + i));
      why = says(lang, 'Square numbers: ', 'Les carrés : ') + (n0 + 5) + ' × ' + (n0 + 5) + ' = ' + terms[5] + says(lang, '. The gaps grow by 2 each time.', '. Les écarts grandissent de 2 à chaque fois.');
      traps = [2 * terms[4] - terms[3], 2 * terms[4] - terms[3] + 1, terms[4] + n0 + 5];
    } else {
      var up = rnd(4, 9), back = rnd(1, up - 1), x = rnd(2, 15);
      for (i = 0; i < 6; i++) { terms.push(x); x += i % 2 === 0 ? up : -back; }
      why = says(lang, 'Two steps take turns: +', 'Deux pas à tour de rôle : +') + up + says(lang, ', then −', ', puis −') + back + '. ' + terms[4] + ' + ' + up + ' = ' + terms[5] + '.';
      traps = [terms[4] - back, terms[4] + up - back, terms[4] + back];
    }
    at = 5;
  } else {
    var step = rnd(2, 12), start = rnd(1, 40), fall = Math.random() < 0.4;
    for (i = 0; i < 5; i++) terms.push(start + i * step);
    if (fall) terms.reverse();
    at = Math.random() < 0.6 ? 4 : rnd(1, 3);
    var ans0 = terms[at], before = terms[at - 1];
    traps = [ans0 + step, ans0 - step, ans0 + 1, ans0 - 1];
    why = (fall ? says(lang, 'Each number is ', 'Chaque nombre est ') + step + says(lang, ' less than the one before: ', ' de moins que le précédent : ') + before + ' − ' + step
      : says(lang, 'Each number is ', 'Chaque nombre est ') + step + says(lang, ' more than the one before: ', ' de plus que le précédent : ') + before + ' + ' + step) + ' = ' + ans0 + '.';
  }
  var o = jssOptions(terms[at], qrTraps(traps, terms[at]));
  return { prompt: says(lang, 'Find the missing number: ', 'Trouve le nombre qui manque : ') + qrList(terms, at), answer: o.answer, options: o.options, optionValues: o.optionValues, worked: why };
}
function qrRuleQ(p, lang) {
  // The two examples are 1 or 2 apart, so the × shows at P5. When they add up to m, x × x + k fits both as well (1 → 7 · 4 → 22
  // is × 5 + 2 and x² + 6): redrawn (second reader, s6).
  var m = rnd(2, 5), c = Math.random() < 0.2 ? 0 : rnd(-3, 6), xs = [];
  do {
    var x0 = rnd(1, 9);
    xs = [x0, x0 + rnd(1, 2), rnd(1, 12)];
  } while (xs[2] === xs[0] || xs[2] === xs[1] || xs[0] + xs[1] === m || m * xs[0] + c <= 0 || m * xs[2] + c <= 0);
  var ys = [m * xs[0] + c, m * xs[1] + c, m * xs[2] + c], arrow = '\\u00a0→\\u00a0';
  var o = jssOptions(ys[2], qrTraps([xs[2] + (ys[0] - xs[0]), m * xs[2], xs[2] + (ys[1] - xs[1]), ys[1] + (xs[2] - xs[1])], ys[2]));
  var rule = '× ' + m + (c > 0 ? ' + ' + c : c < 0 ? ' − ' + (-c) : '');
  var why = says(lang, 'When the number goes up by 1, the answer goes up by ', 'Quand le nombre augmente de 1, la réponse augmente de ') + m + says(lang, '. The rule is ', '. La règle : ') + rule + ': ' + xs[2] + ' ' + rule + ' = ' + ys[2] + '.';
  return { prompt: says(lang, 'Same rule each time: ', 'Même règle à chaque fois : ') + xs[0] + arrow + ys[0] + ' · ' + xs[1] + arrow + ys[1] + ' · ' + xs[2] + arrow + '?', answer: o.answer, options: o.options, optionValues: o.optionValues, worked: why };
}
`;

export const QR_CASES = `
    case 'qrSeries': return qrSeriesQ(p, lang);
    case 'qrRule': return qrRuleQ(p, lang);`;

function qr(id: string, level: 'P4' | 'P5' | 'P6', generator: string, params: Record<string, unknown>, diff: number, fluentMs: number, name: { en: string; fr: string }, strategy: { en: string; fr: string }): Skill {
  return { id, level: level as unknown as Skill['level'], strand: 'calc', subject: 'reasoning' as unknown as Skill['subject'], topic: 'sc-quant', generator, params, answer: 'options', fluentMs, diff, name, strategy, teach: '' };
}

export const REASONING_TOPICS = [
  { id: 'sc-verbal', subject: 'reasoning', name: { en: 'Verbal reasoning', fr: 'Raisonnement verbal' } },
  { id: 'sc-quant', subject: 'reasoning', name: { en: 'Quantitative reasoning', fr: 'Raisonnement numérique' } }
] as const;

export const VR_SKILLS: ReadonlyArray<Skill> = [
  bank('vr-odd-one-out', 'P4', 'reasoning', 'sc-verbal', 0.3, s('Odd one out', 'L’intrus'), s('Find what three of them share. The fourth is the odd one.', 'Trouve ce que trois d’entre eux ont en commun. Le quatrième est l’intrus.'), ODD_ONE_OUT, ASK_ODD),
  bank('vr-alphabet', 'P4', 'reasoning', 'sc-verbal', 0.4, s('Alphabetical order', 'L’ordre alphabétique'), s('Same first letter? Look at the second, then the third.', 'Même première lettre ? Regarde la deuxième, puis la troisième.'), ALPHABET, ASK_ABC),
  bank('vr-analogies', 'P5', 'reasoning', 'sc-verbal', 0.5, s('A is to B as C is to…', 'A est à B ce que C est à…'), s('Say how the first two go together, then do the same with the third.', 'Dis le lien entre les deux premiers, puis fais pareil avec le troisième.'), ANALOGIES),
  bank('vr-letter-series', 'P5', 'reasoning', 'sc-verbal', 0.5, s('Letter patterns', 'Suites de lettres'), s('Count the jumps between the letters.', 'Compte les sauts entre les lettres.'), LETTER_SERIES, ASK_NEXT),
  bank('vr-compound', 'P5', 'reasoning', 'sc-verbal', 0.4, s('Join two words', 'Deux mots en un'), s('Say each one joined on, out loud. Only one is a real word.', 'Dis chacun accroché, à voix haute. Un seul est un vrai mot.'), COMPOUND, ASK_JOIN),
  bank('vr-codes', 'P6', 'reasoning', 'sc-verbal', 0.6, s('Letter and number codes', 'Codes de lettres et de chiffres'), s('Work out what happened to ONE letter, then do it to every letter.', 'Trouve ce qui arrive à UNE lettre, puis fais-le à chaque lettre.'), CODES)
];

export const QR_SKILLS: ReadonlyArray<Skill> = [
  qr('qr-series-add', 'P4', 'qrSeries', { kind: 'add' }, 0.3, 10000, s('Number patterns: adding and taking away', 'Suites : ajouter et enlever'), s('Find the gap between two numbers side by side.', 'Trouve l’écart entre deux nombres côte à côte.')),
  qr('qr-series-mul', 'P5', 'qrSeries', { kind: 'mul' }, 0.5, 12000, s('Number patterns: × and ÷', 'Suites : × et ÷'), s('If the gaps keep growing or shrinking, try × or ÷ by 2 or 3.', 'Si les écarts grandissent ou rétrécissent toujours, essaie × ou ÷ par 2 ou 3.')),
  qr('qr-rule', 'P5', 'qrRule', {}, 0.6, 15000, s('Number machines', 'Machines à nombres'), s('How much does the answer grow when the number grows by 1? That is the ×.', 'De combien grandit la réponse quand le nombre grandit de 1 ? C’est le ×.')),
  qr('qr-series-grow', 'P6', 'qrSeries', { kind: 'grow' }, 0.7, 15000, s('Number patterns: growing gaps', 'Suites : des écarts qui grandissent'), s('Write the gaps under the numbers, then find the pattern in the gaps.', 'Écris les écarts sous les nombres, puis trouve la suite des écarts.'))
];

export const REASONING_SKILLS: ReadonlyArray<Skill> = [...VR_SKILLS, ...QR_SKILLS];
