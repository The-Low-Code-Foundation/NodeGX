/**
 * TPL-013 SC-3 — Star Class's maths for junior secondary: JSS1, JSS2 and JSS3.
 *
 * Until SC-3 the three JSS classes had no maths of their own and borrowed P6's (`nearestClass`). These ten skills give each
 * class its own, every one pinned to a topic of Nigeria's junior secondary programme ({@link JSS_SOURCES}), and every one a
 * TRAP in TPL-007's sense (`tpl007Curriculum.ts`, "The traps are deliberate"): its wrong options are the answers a documented
 * misconception gives, so a child who holds it picks it and gets the correction.
 *
 * | skill | class | the question | the misconception among the options |
 * |---|---|---|---|
 * | `dir-addsub` | JSS1 | (−9) − (−4) = ? | the sign flipped; taking away a negative as taking away |
 * | `eq-two-step` | JSS1 | 3x + 5 = 20, x = ? | c − b (the ÷ forgotten); (c + b) ÷ a (the wrong way across) |
 * | `area-rect-tri` | JSS1 | a triangle's or a rectangle's area | base × height for a triangle (the ½ forgotten); the perimeter |
 * | `volume-cuboid` | JSS1 | a cuboid's volume | the three lengths added; the surface area |
 * | `dir-muldiv` | JSS2 | (−2) × (−7) = ? | "two negatives make a negative"; the numbers added |
 * | `indices-laws` | JSS2 | 2³ × 2⁴ = ? | the powers multiplied; the bases multiplied |
 * | `ratio-share` | JSS2 | 44 oranges in the ratio 7 : 4 | half each; the total divided by one side of the ratio |
 * | `eq-fractions` | JSS3 | x/3 + 4 = 9, x = ? | c − b (the × forgotten) |
 * | `proportion-jss` | JSS3 | 5 bags hold 40, so 8 bags? / 6 workers take 10 days, so 4? | the difference added (additive reasoning); direct for inverse |
 * | `area-circle` | JSS3 | a circle's area, π = 22/7 | the circumference; π × diameter² |
 *
 * 🔴 Every function and case name here is new to the picker: Rocket School's own `proportion` / `proportionQ` were shadowed by a
 * first draft's (a second `case` never runs; a second `function` replaces the first everywhere). Gated in tpl013Edition.test.ts.
 *
 * Every answer is a tap: the answer pad has no minus key, and a trap needs its wrong answers on screen. Nothing here is money,
 * so the edition's ₦ / FCFA swap has nothing to do. Both languages are written (the prompts are short); the bank question of
 * TPL-013 §5.4 is about SC-4's text banks, not these.
 *
 * @module noodl-mcp/tests/tpl013Jss
 */
import type { Skill } from './tpl007Curriculum';

/**
 * Where each skill sits in the programme. NERDC's 2013 Basic Mathematics curriculum for junior secondary, read through the
 * curriculum-matching charts of Pearson's *New General Mathematics* teacher's guides (JSS1 and JSS3, "revised to align to the
 * 2013 NERDC curriculum"); the NERDC document itself could not be read online (TPL-013 §2.1.1). JSS2's guide was not found:
 * its three topics are those the JSS3 guide's review of "Books 1 and 2" covers that Book 1's chart does not (weak, said so).
 */
export const JSS_SOURCES: Readonly<Record<string, { level: 'JSS1' | 'JSS2' | 'JSS3'; topic: string; strength: 'ok' | 'weak' }>> = {
  'dir-addsub': { level: 'JSS1', topic: 'NERDC JSS1 Basic Operations, Topic 1: Addition and subtraction — directed numbers (NGM JSS1 ch. 12)', strength: 'ok' },
  'eq-two-step': { level: 'JSS1', topic: 'NERDC JSS1 Algebraic Processes, Topic 3: Simple equations — open sentences with two operations (NGM JSS1 ch. 19)', strength: 'ok' },
  'area-rect-tri': { level: 'JSS1', topic: 'NERDC JSS1 Geometry and Mensuration, Topic 1: Plane shapes — area (NGM JSS1 ch. 14)', strength: 'ok' },
  'volume-cuboid': { level: 'JSS1', topic: 'NERDC JSS1 Geometry and Mensuration, Topic 2: Three-dimensional figures — volume of cubes and cuboids (NGM JSS1 ch. 16)', strength: 'ok' },
  'dir-muldiv': { level: 'JSS2', topic: 'Basic Operations — multiplying and dividing directed numbers (NGM JSS3 guide, review of Books 1 and 2)', strength: 'weak' },
  'indices-laws': { level: 'JSS2', topic: 'Algebraic processes — the laws of indices (NGM JSS3 guide, Review Test 4, Book 2)', strength: 'weak' },
  'ratio-share': { level: 'JSS2', topic: 'Number and numeration — dividing a quantity in a given ratio (NGM JSS3 guide, review of Books 1 and 2)', strength: 'weak' },
  'eq-fractions': { level: 'JSS3', topic: 'NERDC JSS3 Algebraic Processes, Topic 2: Simple equations — equations involving fractions (NGM JSS3 ch. 10)', strength: 'ok' },
  'proportion-jss': { level: 'JSS3', topic: 'NERDC JSS3 Number and Numeration — direct and inverse proportion (NGM JSS3 ch. 13)', strength: 'ok' },
  'area-circle': { level: 'JSS3', topic: 'NERDC JSS3 Mensuration and Geometry, Topic 5: Area of plane figures — circles (NGM JSS3 ch. 5)', strength: 'ok' }
};

export const JSS_TOPICS = [
  { id: 'negatives', subject: 'maths', name: { en: 'Negative numbers', fr: 'Nombres relatifs' } },
  { id: 'algebra', subject: 'maths', name: { en: 'Equations and powers', fr: 'Équations et puissances' } },
  { id: 'measures', subject: 'maths', name: { en: 'Area and volume', fr: 'Aires et volumes' } }
] as const;

/** The generators, as the picker runs them (ES5, beside the helpers). */
export const JSS_GENERATORS = `
// TPL-013 SC-3: junior secondary. Every answer a tap; the wrong options are what a misconception answers.
var SUP = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];
function sup(n) { return String(n).split('').map(function (d) { return SUP[Number(d)]; }).join(''); }
/** A number as a child reads it: a real minus sign. */
function signed(n) { return n < 0 ? '−' + Math.abs(n) : String(n); }
/** A directed number in brackets, as the books write it: (+8), (−3). */
function dirn(n) { return n < 0 ? '(−' + Math.abs(n) + ')' : '(+' + n + ')'; }
/** The right answer and the traps, each once and never the answer, topped up with near misses to four. */
function jssOptions(ans, traps) {
  var vals = [ans];
  for (var i = 0; i < traps.length && vals.length < 4; i++) {
    var t = traps[i];
    if (typeof t === 'number' && isFinite(t) && Math.round(t) === t && vals.indexOf(t) === -1) vals.push(t);
  }
  for (var d = 1; vals.length < 4 && d < 50; d++) { if (vals.indexOf(ans + d) === -1) vals.push(ans + d); else if (vals.indexOf(ans - d) === -1) vals.push(ans - d); }
  return { options: vals.map(signed), optionValues: vals.map(String), answer: String(ans) };
}
/** A number stays on the line with its unit, and "= ?" with what it asks: a phone wraps between words, never inside "21 cm". */
function nb(text) { return text.replace(/([\\d?]) (cm|mm|m)(?![a-z])/g, '$1\\u00a0$2').replace(/ = \\?/g, '\\u00a0=\\u00a0?').replace(/ \\(π = 22\\/7\\)/, '\\u00a0(π\\u00a0=\\u00a022/7)'); }
function nonZero(max) { return rnd(1, max) * (Math.random() < 0.5 ? -1 : 1); }
function dirAddSubQ(p, lang) {
  var a = nonZero(12), b = nonZero(12), sub = Math.random() < 0.6;
  var ans = sub ? a - b : a + b;
  if (ans === 0) { a = a + (a > 0 ? 1 : -1); ans = sub ? a - b : a + b; }
  var o = jssOptions(ans, [-ans, sub ? a + b : a - b, -(Math.abs(a) + Math.abs(b)), Math.abs(a) + Math.abs(b)]);
  var worked = sub && b < 0
    ? says(lang, 'Taking away a negative is adding: ', 'Soustraire un négatif, c’est ajouter : ') + dirn(a) + ' − ' + dirn(b) + ' = ' + signed(a) + ' + ' + Math.abs(b) + ' = ' + signed(ans) + '.'
    : says(lang, 'On the number line, start at ', 'Sur la droite graduée, pars de ') + signed(a) + says(lang, ' and move ', ' et avance de ') + Math.abs(b) + ((sub ? -b : b) > 0 ? says(lang, ' to the right', ' vers la droite') : says(lang, ' to the left', ' vers la gauche')) + ': ' + signed(ans) + '.';
  return { prompt: dirn(a) + (sub ? ' − ' : ' + ') + dirn(b) + ' = ?', answer: o.answer, options: o.options, optionValues: o.optionValues, worked: worked };
}
function dirMulDivQ(p, lang) {
  var a = nonZero(9), b = nonZero(9), div = Math.random() < 0.4;
  while (Math.abs(a) < 2) a = nonZero(9);
  while (Math.abs(b) < 2) b = nonZero(9);
  var prod = a * b, ans = div ? a : prod;
  var o = div ? jssOptions(ans, [-ans, prod + b, Math.abs(prod) - Math.abs(b)]) : jssOptions(ans, [-ans, a + b, -(Math.abs(a) + Math.abs(b))]);
  var rule = says(lang, 'Same signs make +, different signs make −: ', 'Mêmes signes : +, signes différents : − : ');
  var worked = div
    ? rule + Math.abs(prod) + ' ÷ ' + Math.abs(b) + ' = ' + Math.abs(a) + says(lang, ', so ', ', donc ') + dirn(prod) + ' ÷ ' + dirn(b) + ' = ' + signed(ans) + '.'
    : rule + Math.abs(a) + ' × ' + Math.abs(b) + ' = ' + Math.abs(prod) + says(lang, ', so ', ', donc ') + dirn(a) + ' × ' + dirn(b) + ' = ' + signed(ans) + '.';
  return { prompt: div ? dirn(prod) + ' ÷ ' + dirn(b) + ' = ?' : dirn(a) + ' × ' + dirn(b) + ' = ?', answer: o.answer, options: o.options, optionValues: o.optionValues, worked: worked };
}
function eqTwoStepQ(p, lang) {
  var a = rnd(2, 9), x = rnd(2, 12), b = rnd(1, 20), minus = Math.random() < 0.4;
  if (minus && a * x - b < 1) minus = false;
  var c = minus ? a * x - b : a * x + b;
  var o = minus ? jssOptions(x, [c + b, (c - b) / a, c / a + b, c - b]) : jssOptions(x, [c - b, (c + b) / a, c / a - b, c + b]);
  var worked = (minus ? says(lang, 'Add ', 'Ajoute ') + b + says(lang, ' to both sides: ', ' des deux côtés : ') + a + 'x = ' + (c + b) : says(lang, 'Take ', 'Retire ') + b + says(lang, ' from both sides: ', ' des deux côtés : ') + a + 'x = ' + (c - b)) +
    says(lang, '. Then divide by ', '. Puis divise par ') + a + ': x = ' + x + '.';
  return { prompt: a + 'x ' + (minus ? '−' : '+') + ' ' + b + ' = ' + c + says(lang, ', so x = ?', ', donc x = ?'), answer: o.answer, options: o.options, optionValues: o.optionValues, worked: worked };
}
function eqFractionQ(p, lang) {
  var a = rnd(2, 9), k = rnd(1, 12), b = rnd(1, 15), x = a * k, c = k + b;
  var o = jssOptions(x, [c - b, a * (c + b), c * a - b, (c - b) + a]);
  var worked = says(lang, 'Take ', 'Retire ') + b + says(lang, ' from both sides: ', ' des deux côtés : ') + 'x/' + a + ' = ' + k + says(lang, '. Then multiply both sides by ', '. Puis multiplie les deux côtés par ') + a + ': x = ' + x + '.';
  return { prompt: 'x/' + a + ' + ' + b + ' = ' + c + says(lang, ', so x = ?', ', donc x = ?'), answer: o.answer, options: o.options, optionValues: o.optionValues, worked: worked };
}
function areaRectTriQ(p, lang) {
  var tri = Math.random() < 0.6, b = rnd(3, 16), h = rnd(2, 12);
  if (tri && (b * h) % 2) b = b + 1;
  var ans = tri ? b * h / 2 : b * h;
  var o = tri ? jssOptions(ans, [b * h, b + h, 2 * (b + h)]) : jssOptions(ans, [2 * (b + h), b + h, 2 * b * h]);
  var prompt = tri
    ? says(lang, 'A triangle, base ', 'Un triangle, base ') + b + ' cm, ' + says(lang, 'height ', 'hauteur ') + h + ' cm. ' + says(lang, 'Area', 'Aire') + ' = ? cm²'
    : says(lang, 'A rectangle, ', 'Un rectangle, ') + b + ' cm × ' + h + ' cm. ' + says(lang, 'Area', 'Aire') + ' = ? cm²';
  var worked = tri
    ? says(lang, 'A triangle is half the rectangle round it: ', 'Un triangle, c’est la moitié du rectangle autour : ') + b + ' × ' + h + ' ÷ 2 = ' + ans + ' cm².'
    : says(lang, 'Length times width: ', 'Longueur fois largeur : ') + b + ' × ' + h + ' = ' + ans + ' cm². ' + says(lang, 'Going round it is the perimeter, ', 'Le tour, c’est le périmètre, ') + 2 * (b + h) + ' cm.';
  return { prompt: nb(prompt), answer: o.answer, options: o.options, optionValues: o.optionValues, worked: worked };
}
function volumeCuboidQ(p, lang) {
  var l = rnd(2, 12), w = rnd(2, 10), h = rnd(2, 9), ans = l * w * h;
  var o = jssOptions(ans, [l + w + h, 2 * (l * w + w * h + h * l), l * w]);
  return {
    prompt: nb(says(lang, 'A cuboid, ', 'Un pavé droit, ') + l + ' cm × ' + w + ' cm × ' + h + ' cm. Volume = ? cm³'),
    answer: o.answer, options: o.options, optionValues: o.optionValues,
    worked: says(lang, 'Length × width × height: ', 'Longueur × largeur × hauteur : ') + l + ' × ' + w + ' × ' + h + ' = ' + ans + ' cm³.'
  };
}
function indicesQ(p, lang) {
  var base = pickOne(['2', '3', '5', 'x', 'a']), m = rnd(2, 7), n = rnd(2, 6), kind = pickOne(['times', 'times', 'divide', 'power']);
  if (kind === 'divide' && m <= n) { var t = m; m = n + 1; n = t; }
  var ans = kind === 'times' ? m + n : kind === 'divide' ? m - n : m * n;
  var traps = kind === 'times' ? [m * n, m + n + 1] : kind === 'divide' ? [m + n, m * n] : [m + n, m * n + 1];
  var vals = [ans];
  for (var i = 0; i < traps.length; i++) if (vals.indexOf(traps[i]) === -1 && traps[i] > 0) vals.push(traps[i]);
  for (var d = 1; vals.length < 3; d++) if (vals.indexOf(ans + d) === -1) vals.push(ans + d);
  var labels = vals.map(function (e) { return base + sup(e); }), values = vals.map(function (e) { return base + '^' + e; });
  // The bases multiplied too (2³ × 2⁴ = 4⁷), where a number makes that a different answer.
  if (kind === 'times' && /^[0-9]+$/.test(base)) { labels.push(String(Number(base) * Number(base)) + sup(ans)); values.push(String(Number(base) * Number(base)) + '^' + ans); }
  var prompt = kind === 'times' ? base + sup(m) + ' × ' + base + sup(n) + ' = ?' : kind === 'divide' ? base + sup(m) + ' ÷ ' + base + sup(n) + ' = ?' : '(' + base + sup(m) + ')' + sup(n) + ' = ?';
  var rule = kind === 'times' ? says(lang, 'Multiplying, add the powers: ', 'Pour multiplier, ajoute les puissances : ') + m + ' + ' + n + ' = ' + ans
    : kind === 'divide' ? says(lang, 'Dividing, take the powers away: ', 'Pour diviser, soustrais les puissances : ') + m + ' − ' + n + ' = ' + ans
    : says(lang, 'A power of a power, multiply them: ', 'Puissance d’une puissance, multiplie-les : ') + m + ' × ' + n + ' = ' + ans;
  return { prompt: prompt, answer: base + '^' + ans, options: labels, optionValues: values, worked: rule + ', ' + prompt.replace(' = ?', '') + ' = ' + base + sup(ans) + '.' };
}
var JSS_THINGS = [['oranges', 'oranges'], ['mangoes', 'mangues'], ['eggs', 'œufs'], ['pencils', 'crayons'], ['books', 'livres']];
function ratioShareQ(p, lang) {
  var a = rnd(1, 9), b = rnd(1, 9);
  while (b === a) b = rnd(1, 9);
  var k = rnd(2, 15), total = (a + b) * k, big = Math.random() < 0.6, thing = pickOne(JSS_THINGS), word = isFr(lang) ? thing[1] : thing[0];
  var ans = (big ? Math.max(a, b) : Math.min(a, b)) * k, other = (big ? Math.min(a, b) : Math.max(a, b)) * k;
  var o = jssOptions(ans, [total / 2, other, total / (big ? Math.max(a, b) : Math.min(a, b)), k]);
  return {
    prompt: says(lang, 'Share ', 'Partage ') + total + ' ' + word + says(lang, ' in the ratio ', ' selon le rapport ') + a + ' : ' + b + '. ' +
      (big ? says(lang, 'The bigger share = ?', 'La plus grande part = ?') : says(lang, 'The smaller share = ?', 'La plus petite part = ?')),
    answer: o.answer, options: o.options, optionValues: o.optionValues,
    worked: a + ' + ' + b + ' = ' + (a + b) + says(lang, ' parts. ', ' parts. ') + total + ' ÷ ' + (a + b) + ' = ' + k + says(lang, ' in a part, so ', ' par part, donc ') + (big ? Math.max(a, b) : Math.min(a, b)) + ' × ' + k + ' = ' + ans + '.'
  };
}
function jssProportionQ(p, lang) {
  if (Math.random() < 0.5) {
    // Direct: more bags hold more. The trap is adding the difference (5 → 8 is +3, so 40 → 43).
    var per = rnd(3, 12), n1 = rnd(2, 9), n2 = rnd(2, 12);
    while (n2 === n1) n2 = rnd(2, 12);
    var have = per * n1, ans = per * n2;
    var o = jssOptions(ans, [have + (n2 - n1), have * n1 / n2, have * n2]);
    return {
      prompt: n1 + says(lang, ' bags hold ', ' sacs contiennent ') + have + ' ' + says(lang, 'mangoes. How many in ', 'mangues. Combien dans ') + n2 + says(lang, ' bags?', ' sacs ?'),
      answer: o.answer, options: o.options, optionValues: o.optionValues,
      worked: says(lang, 'Find one bag first: ', 'Trouve d’abord un sac : ') + have + ' ÷ ' + n1 + ' = ' + per + says(lang, ', then ', ', puis ') + n2 + ' × ' + per + ' = ' + ans + '.'
    };
  }
  // Inverse: more workers take fewer days. The trap is treating it as direct (more workers, more days).
  var w1 = rnd(2, 8), w2 = rnd(2, 12);
  while (w2 === w1) w2 = rnd(2, 12);
  var m = rnd(1, 4), d1 = w2 * m, d2 = w1 * m;
  var oi = jssOptions(d2, [d1 * w2 / w1, d1 + (w2 - w1), d1 - (w2 - w1)]);
  return {
    prompt: w1 + says(lang, ' workers take ', ' ouvriers mettent ') + d1 + says(lang, ' days to build a wall. How many days for ', ' jours pour bâtir un mur. Combien de jours pour ') + w2 + says(lang, ' workers?', ' ouvriers ?'),
    answer: oi.answer, options: oi.options, optionValues: oi.optionValues,
    worked: says(lang, 'The whole job is ', 'Le travail entier, c’est ') + w1 + ' × ' + d1 + ' = ' + w1 * d1 + says(lang, ' worker-days. ', ' jours-ouvrier. ') + w1 * d1 + ' ÷ ' + w2 + ' = ' + d2 + says(lang, ': more workers, fewer days.', ' : plus d’ouvriers, moins de jours.')
  };
}
function areaCircleQ(p, lang) {
  var r = pickOne([7, 14, 21, 28, 35]), ans = 22 * r * r / 7;
  var o = jssOptions(ans, [44 * r / 7, 4 * ans, 22 * r / 7]);
  return {
    prompt: nb(says(lang, 'A circle, radius ', 'Un cercle, rayon ') + r + ' cm. ' + says(lang, 'Area', 'Aire') + ' = ? cm² (π = 22/7)'),
    answer: o.answer, options: o.options, optionValues: o.optionValues,
    worked: 'π × r × r = 22/7 × ' + r + ' × ' + r + ' = ' + ans + ' cm². ' + says(lang, 'Round the edge is 2 × π × r, ', 'Le tour, c’est 2 × π × r, ') + 44 * r / 7 + ' cm.'
  };
}
`;

/** The cases `generate` gains. */
export const JSS_CASES = `
    case 'dirAddSub': return dirAddSubQ(p, lang);
    case 'dirMulDiv': return dirMulDivQ(p, lang);
    case 'eqTwoStep': return eqTwoStepQ(p, lang);
    case 'eqFraction': return eqFractionQ(p, lang);
    case 'areaRectTri': return areaRectTriQ(p, lang);
    case 'volumeCuboid': return volumeCuboidQ(p, lang);
    case 'indices': return indicesQ(p, lang);
    case 'ratioShare': return ratioShareQ(p, lang);
    case 'jssProportion': return jssProportionQ(p, lang);
    case 'areaCircle': return areaCircleQ(p, lang);`;

const s = (en: string, fr: string) => ({ en, fr });

function jss(id: string, level: 'JSS1' | 'JSS2' | 'JSS3', topic: string, generator: string, diff: number, fluentMs: number, name: { en: string; fr: string }, strategy: { en: string; fr: string }): Skill {
  return { id, level: level as unknown as Skill['level'], strand: 'calc', subject: 'maths', topic, generator, params: {}, answer: 'options', fluentMs, diff, name, strategy, teach: '', trap: true };
}

export const JSS_SKILLS: ReadonlyArray<Skill> = [
  jss('dir-addsub', 'JSS1', 'negatives', 'dirAddSub', 0.2, 8000, s('Negative numbers: adding and taking away', 'Nombres relatifs : additions et soustractions'), s('Taking away a negative is adding: 3 − (−2) = 3 + 2.', 'Soustraire un négatif, c’est ajouter : 3 − (−2) = 3 + 2.')),
  jss('eq-two-step', 'JSS1', 'algebra', 'eqTwoStep', 0.5, 12000, s('Simple equations', 'Équations simples'), s('Undo the + or − first, then the ×.', 'Défais d’abord le + ou le −, puis le ×.')),
  jss('area-rect-tri', 'JSS1', 'measures', 'areaRectTri', 0.4, 10000, s('Area: rectangles and triangles', 'Aire : rectangles et triangles'), s('A triangle is half its rectangle: base × height ÷ 2.', 'Un triangle, c’est la moitié de son rectangle : base × hauteur ÷ 2.')),
  jss('volume-cuboid', 'JSS1', 'measures', 'volumeCuboid', 0.6, 12000, s('Volume of a cuboid', 'Volume d’un pavé droit'), s('Volume is length × width × height, in cubes (cm³).', 'Le volume, c’est longueur × largeur × hauteur, en cubes (cm³).')),
  jss('dir-muldiv', 'JSS2', 'negatives', 'dirMulDiv', 0.2, 8000, s('Negative numbers: multiplying and dividing', 'Nombres relatifs : multiplications et divisions'), s('Same signs make +, different signs make −.', 'Mêmes signes : +, signes différents : −.')),
  jss('indices-laws', 'JSS2', 'algebra', 'indices', 0.5, 10000, s('The laws of indices', 'Les règles des puissances'), s('× adds the powers, ÷ takes them away, a power of a power multiplies them.', '× ajoute les puissances, ÷ les soustrait, une puissance de puissance les multiplie.')),
  jss('ratio-share', 'JSS2', 'percent-proportion', 'ratioShare', 0.6, 14000, s('Sharing in a ratio', 'Partager selon un rapport'), s('Add the ratio to count the parts, find one part, then multiply.', 'Additionne le rapport pour compter les parts, trouve une part, puis multiplie.')),
  jss('eq-fractions', 'JSS3', 'algebra', 'eqFraction', 0.4, 12000, s('Equations with fractions', 'Équations avec des fractions'), s('Undo the + first, then multiply to undo the ÷.', 'Défais d’abord le +, puis multiplie pour défaire le ÷.')),
  jss('proportion-jss', 'JSS3', 'percent-proportion', 'jssProportion', 0.5, 15000, s('Direct and inverse proportion', 'Proportionnalité directe et inverse'), s('Find one first. More workers on one job take fewer days.', 'Trouve d’abord pour un. Plus d’ouvriers sur un travail, moins de jours.')),
  jss('area-circle', 'JSS3', 'measures', 'areaCircle', 0.7, 15000, s('Area of a circle', 'Aire d’un disque'), s('Area is π × r × r; the way round is 2 × π × r.', 'L’aire, c’est π × r × r ; le tour, c’est 2 × π × r.'))
];
