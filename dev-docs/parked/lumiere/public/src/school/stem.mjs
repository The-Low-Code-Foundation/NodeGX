// The STEM tasks a promotion asks (work.mjs): a small question pitched at the player's school year (BRIEF answer 3:
// "the STEM stuff hits roughly their age, without making it stuff she'll only see in the second semester").
//
// The years are the French programme's, youngest first. Every kind of question says `known`: the first year whose
// pupils have ALREADY covered it by the start of that year (la rentrée), so a CE2 question is about what CP and CE1
// taught, never what CE2 will teach after Christmas. A year draws from every kind known by then, the newest most.
//
// A question is three choices, one right, and no clock (the older girl hates time pressure). Every word goes through
// strings.mjs (`stem.<kind>`, with the numbers in `vars`); numbers are written by `num()` for the language.
import { t, num } from './strings.mjs';

export const YEARS = ['CP', 'CE1', 'CE2', 'CM1', 'CM2', '6e', '5e'];
export const DEFAULT_YEAR = 'CE2';
const yearIndex = (y) => Math.max(0, YEARS.indexOf(y));

// A whole number from lo to hi.
const int = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
const pick = (r, list) => list[Math.floor(r() * list.length)];

// Two wrong numbers near the right one: the slips a child makes (one out, ten out, the wrong table row).
function near(r, answer, steps) {
  const out = new Set();
  for (let k = 0; out.size < 2 && k < 40; k++) {
    const v = answer + pick(r, steps) * (r() < 0.5 ? -1 : 1);
    if (v > 0 && v !== answer) out.add(Math.round(v * 100) / 100);
  }
  for (let v = answer + 1; out.size < 2; v++) out.add(v);
  return [...out];
}

// Each kind: `known` (above), `science` (a science question, not a sum), and `make(r)` → { vars, answer, wrong,
// explain } (numbers, or string keys for a science question's choices). The text is `stem.<id>` and `stem.<id>.explain`.
export const KINDS = [
  // Known by the start of CP (the end of nursery school): counting and putting small groups together, to 10.
  { id: 'count10', known: 'CP', make: (r) => { const a = int(r, 2, 6), b = int(r, 2, 10 - a); return { vars: { a, b }, answer: a + b, wrong: near(r, a + b, [1, 2]) }; } },
  { id: 'senses', known: 'CP', science: true, make: () => ({ answer: 'stem.c.nose', wrong: ['stem.c.ears', 'stem.c.eyes'] }) },
  { id: 'stars', known: 'CP', science: true, make: () => ({ answer: 'stem.c.night', wrong: ['stem.c.morning', 'stem.c.lunchtime'] }) },

  // Known by the start of CE1 (CP taught it): numbers to 100, tens and ones, doubles, take-away within 20.
  { id: 'tensOnes', known: 'CE1', make: (r) => { const a = int(r, 1, 8) * 10, b = int(r, 1, 9); return { vars: { a, b }, answer: a + b, wrong: near(r, a + b, [1, 10]) }; } },
  { id: 'double', known: 'CE1', make: (r) => { const a = int(r, 2, 10); return { vars: { a }, answer: 2 * a, wrong: near(r, 2 * a, [1, 2]) }; } },
  { id: 'takeAway20', known: 'CE1', make: (r) => { const a = int(r, 11, 20), b = int(r, 2, 9); return { vars: { a, b }, answer: a - b, wrong: near(r, a - b, [1, 2]) }; } },
  { id: 'alive', known: 'CE1', science: true, make: (r) => ({ answer: 'stem.c.tree', wrong: r() < 0.5 ? ['stem.c.stone', 'stem.c.spoon'] : ['stem.c.cloud', 'stem.c.chair'] }) },

  // Known by the start of CE2 (CE1 taught it): sums to 100 with carrying, the 2, 3, 4, 5 and 10 times tables, halves,
  // half past the hour, metres and centimetres; water freezes; plants need water and light.
  { id: 'add2d', known: 'CE2', make: (r) => { const a = int(r, 15, 59), b = int(r, 12, 99 - a); return { vars: { a, b }, answer: a + b, wrong: near(r, a + b, [1, 10]) }; } },
  { id: 'boxes', known: 'CE2', make: (r) => { const a = int(r, 2, 9), b = pick(r, [2, 3, 4, 5, 10]); return { vars: { a, b }, answer: a * b, wrong: near(r, a * b, [b, 1]), explain: { a, b, c: a * b } }; } },
  { id: 'half', known: 'CE2', make: (r) => { const a = r() < 0.5 ? int(r, 3, 20) * 2 : int(r, 2, 10) * 10; return { vars: { a }, answer: a / 2, wrong: near(r, a / 2, [1, 2, 5]), explain: { a, c: a / 2 } }; } },
  { id: 'halfHour', known: 'CE2', make: (r) => { const h = int(r, 1, 11); return { vars: { h }, answer: time(h, 30), wrong: [time(h + 1, 0), time(h + 1, 30)], explain: { h } }; } },
  { id: 'metre', known: 'CE2', make: () => ({ answer: 100, wrong: [10, 1000] }) },
  { id: 'freezer', known: 'CE2', science: true, make: () => ({ answer: 'stem.c.ice', wrong: ['stem.c.steam', 'stem.c.sand'] }) },
  { id: 'plantNeeds', known: 'CE2', science: true, make: () => ({ answer: 'stem.c.waterLight', wrong: ['stem.c.darkCold', 'stem.c.sugarSalt'] }) },

  // Known by the start of CM1 (CE2 taught it): all the times tables, × 10 and × 100, sharing, km, kg and hours.
  { id: 'tables', known: 'CM1', make: (r) => { const a = int(r, 3, 9), b = int(r, 3, 9); return { vars: { a, b }, answer: a * b, wrong: near(r, a * b, [a, b, 1]), explain: { a, b, c: a * b } }; } },
  { id: 'times10', known: 'CM1', make: (r) => { const a = int(r, 12, 99), b = pick(r, [10, 100]); return { vars: { a, b }, answer: a * b, wrong: [a * (b === 10 ? 100 : 10), a + b] }; } },
  { id: 'share', known: 'CM1', make: (r) => { const b = int(r, 2, 6), c = int(r, 2, 9); return { vars: { a: b * c, b }, answer: c, wrong: near(r, c, [1, 2]), explain: { a: b * c, b, c } }; } },
  { id: 'units', known: 'CM1', make: (r) => { const u = pick(r, ['km', 'kg', 'h']); return { key: `stem.units.${u}`, answer: u === 'h' ? 60 : 1000, wrong: u === 'h' ? [100, 30] : [100, 10] }; } },
  { id: 'steam', known: 'CM1', science: true, make: () => ({ answer: 'stem.c.steam', wrong: ['stem.c.ice', 'stem.c.salt'] }) },
  { id: 'spin', known: 'CM1', science: true, make: () => ({ answer: 'stem.c.aDay', wrong: ['stem.c.aWeek', 'stem.c.aYear'] }) },

  // Known by the start of CM2 (CM1 taught it): simple fractions of a number, tenths, 2-digit × 1-digit, perimeters.
  { id: 'fraction', known: 'CM2', make: (r) => { const d = pick(r, [2, 3, 4]), c = int(r, 2, 9); return { vars: { d, a: d * c }, answer: c, wrong: near(r, c, [1, c]), explain: { d, a: d * c, c } }; } },
  { id: 'tenths', known: 'CM2', make: (r) => { const a = int(r, 11, 49) / 10, b = int(r, 11, 49) / 10; const c = Math.round((a + b) * 10) / 10; return { vars: { a, b }, answer: c, wrong: near(r, c, [0.1, 1]) }; } },
  { id: 'mult2x1', known: 'CM2', make: (r) => { const a = int(r, 12, 39), b = int(r, 2, 5); return { vars: { a, b }, answer: a * b, wrong: near(r, a * b, [10, b, 1]), explain: { a, b, c: a * b } }; } },
  { id: 'perimeter', known: 'CM2', make: (r) => { const a = int(r, 3, 12), b = int(r, 2, a - 1); return { vars: { a, b }, answer: 2 * (a + b), wrong: [a * b === 2 * (a + b) ? a + b : a * b, a + b], explain: { a, b, c: 2 * (a + b) } }; } },
  { id: 'orbit', known: 'CM2', science: true, make: () => ({ answer: 'stem.c.aYear', wrong: ['stem.c.aDay', 'stem.c.aMonth'] }) },
  { id: 'boil', known: 'CM2', science: true, make: () => ({ answer: 100, wrong: [50, 10] }) },

  // Known by the start of 6e (CM2 taught it): fractions of a quantity, hundredths, the area of a rectangle; the
  // planets; food chains.
  { id: 'fractionOf', known: '6e', make: (r) => { const d = pick(r, [3, 4, 5]), n = int(r, 2, d - 1), c = int(r, 2, 8); return { vars: { n, d, a: d * c }, answer: n * c, wrong: near(r, n * c, [c, 1]), explain: { a: d * c, d, c, n, e: n * c } }; } },
  { id: 'hundredths', known: '6e', make: (r) => { const a = int(r, 5, 95) / 100, b = pick(r, [0.5, 0.25, 0.1, 0.05]); const c = Math.round((a + b) * 100) / 100; return { vars: { a, b }, answer: c, wrong: near(r, c, [0.1, 0.01]) }; } },
  { id: 'area', known: '6e', make: (r) => { const a = int(r, 3, 12), b = int(r, 2, 9); return { vars: { a, b }, answer: a * b, wrong: [2 * (a + b) === a * b ? a * b + 1 : 2 * (a + b), a + b], explain: { a, b, c: a * b } }; } },
  { id: 'planet', known: '6e', science: true, make: () => ({ answer: 'stem.c.jupiter', wrong: ['stem.c.mars', 'stem.c.earth'] }) },
  { id: 'foodChain', known: '6e', science: true, make: () => ({ answer: 'stem.c.fox', wrong: ['stem.c.grass', 'stem.c.carrot'] }) },

  // Known by the start of 5e (6e taught it): simple percentages, proportion, right angles; green plants and light.
  { id: 'percent', known: '5e', make: (r) => { const p = pick(r, [10, 25, 50]), c = int(r, 2, 20); const a = (100 / p) * c; return { vars: { p, a }, answer: c, wrong: near(r, c, [c, 1, 2]), explain: { p, a, c } }; } },
  { id: 'proportion', known: '5e', make: (r) => { const a = int(r, 2, 4), each = pick(r, [50, 100, 150, 200]), b = int(r, a + 1, 8); return { vars: { a, m: a * each, b }, answer: b * each, wrong: near(r, b * each, [each, 50]), explain: { each, b, c: b * each } }; } },
  { id: 'rightAngle', known: '5e', make: () => ({ answer: 90, wrong: [180, 45] }) },
  { id: 'leaves', known: '5e', science: true, make: () => ({ answer: 'stem.c.light', wrong: ['stem.c.heatOnly', 'stem.c.nothing'] }) }
];
const time = (h, m) => ({ time: [((h - 1) % 12) + 1, m] });

// A question for `year`, from `random` (Math.random by default: never the seeded dice, which free will owns). The
// kinds known by then, weighted to the newest (the year just finished counts most), one science question in three.
// → { kind, text, choices (three strings), answer (its index), explain }
export function makeTask(year = DEFAULT_YEAR, random = Math.random) {
  const y = yearIndex(year);
  const known = KINDS.filter((k) => yearIndex(k.known) <= y);
  const weight = (k) => [4, 2, 1][Math.min(2, y - yearIndex(k.known))];
  const science = random() < 1 / 3;
  const pool = known.filter((k) => !!k.science === science).length ? known.filter((k) => !!k.science === science) : known;
  let r = random() * pool.reduce((s, k) => s + weight(k), 0);
  const kind = pool.find((k) => (r -= weight(k)) <= 0) ?? pool[0];
  return taskOfKind(kind.id, random);
}

// A question of one kind (round 9: the school's "In the lab" topic asks them one by one).
export function taskOfKind(id, random = Math.random) {
  const kind = KINDS.find((k) => k.id === id);
  const q = kind.make(random);
  const show = (v) => (typeof v === 'number' ? num(v) : v?.time ? t('stem.time', { h: v.time[0], m: String(v.time[1]).padStart(2, '0') }) : t(v));
  const vars = Object.fromEntries(Object.entries(q.vars ?? {}).map(([k, v]) => [k, typeof v === 'number' ? num(v) : t(v)]));
  // Two different wrong ones, neither the answer (a 6 × 3 rectangle's area and perimeter are both 18).
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const wrong = [];
  for (const w of q.wrong) if (!same(w, q.answer) && !wrong.some((x) => same(x, w))) wrong.push(w);
  for (let k = 1; wrong.length < 2; k++) if (!wrong.includes(q.answer + k)) wrong.push(q.answer + k);
  const choices = [q.answer, ...wrong].map(show);
  // Shuffled, so the right one is not always first.
  const order = [0, 1, 2];
  for (let i = 2; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const ev = Object.fromEntries(Object.entries(q.explain ?? q.vars ?? {}).map(([k, v]) => [k, typeof v === 'number' ? num(v) : t(v)]));
  return {
    kind: kind.id,
    known: kind.known,
    text: t(q.key ?? `stem.${kind.id}`, vars),
    choices: order.map((i) => choices[i]),
    answer: order.indexOf(0),
    explain: t(`${q.key ?? `stem.${kind.id}`}.explain`, { ...ev, answer: choices[0] })
  };
}
