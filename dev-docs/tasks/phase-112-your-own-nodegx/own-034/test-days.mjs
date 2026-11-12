// OWN-034 §5: the harness's date logic (blocks/days.js), tested against the grader's frozen days before any model runs.
// The file is loaded the way the runtime loads a script file: its source, given `exports`. Run it under two time zones:
//   TZ=Europe/Paris node test-days.mjs && TZ=America/Los_Angeles node test-days.mjs
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const D = {};
new Function('exports', fs.readFileSync(path.join(HERE, 'blocks/days.js'), 'utf8'))(D);

let n = 0;
const check = (name, fn) => { fn(); n++; console.log(`  ok  ${name}`); };
const MON = '2026-11-02', TUE = '2026-11-03', WED = '2026-11-04', THU = '2026-11-05';

// The grader's three days are noon Europe/Paris; in any zone a local noon is that local date.
check('dayKey is the local date', () => {
  assert.equal(D.dayKey(new Date(2026, 10, 2, 12)), MON);
  assert.equal(D.dayKey(new Date(2026, 10, 2, 23, 30)), MON); // late evening is still today, not UTC's tomorrow
  assert.equal(D.dayKey(new Date(2026, 10, 3, 0, 5)), TUE);
});
check('addDays steps across months and the October clock change', () => {
  assert.equal(D.addDays(MON, -3), '2026-10-30');
  assert.equal(D.addDays('2026-10-26', -1), '2026-10-25'); // Europe's change is 25 Oct 2026
  assert.equal(D.addDays('2026-10-25', -1), '2026-10-24');
  assert.equal(D.addDays('2026-12-31', 1), '2027-01-01');
});

// The grader's story: Mon tick (B5), Tue tick (B9, streak 2), Thu before (B10: 0) and after (1).
check('B5: a tick today makes a streak of 1', () => assert.equal(D.streak([MON], MON), 1));
check('B8: on Tue, Mon is done and today is not; the streak still counts Mon', () => {
  const week = D.lastDays([MON], TUE, 7);
  assert.deepEqual(week.map((c) => c.done), [false, false, false, false, false, true, false]);
  assert.equal(week[6].isToday, true);
  assert.equal(D.streak([MON], TUE), 1);
});
check('B9: Tue ticked → streak 2', () => assert.equal(D.streak([MON, TUE], TUE), 2));
check('B10: Thu with Wed missed → 0; ticked → 1', () => {
  assert.equal(D.streak([MON, TUE], THU), 0);
  assert.equal(D.streak([MON, TUE, THU], THU), 1);
});
check('B12: Thu\'s last 7 days, oldest first, match the grader\'s WEEK_A', () => {
  const week = D.lastDays([MON, TUE, THU], THU, 7);
  assert.deepEqual(week.map((c) => c.day), ['2026-10-30', '2026-10-31', '2026-11-01', MON, TUE, WED, THU]);
  assert.deepEqual(week.map((c) => c.done), [false, false, false, true, true, false, true]);
  assert.deepEqual(week.map((c) => c.letter), ['F', 'S', 'S', 'M', 'T', 'W', 'T']);
  assert.equal(new Set(week.map((c) => c.id)).size, 7);
});
check('best streak and done this week', () => {
  assert.equal(D.bestStreak([MON, TUE, THU]), 2);
  assert.equal(D.bestStreak([]), 0);
  assert.equal(D.bestStreak([THU, MON, TUE, TUE]), 2); // unsorted, a duplicate
  assert.equal(D.doneThisWeek([MON, TUE, THU, '2026-10-29'], THU), 3); // 29 Oct is 7 days back: out
});
check('done today out of all', () => {
  const items = [{ id: 'a' }, { id: 'b' }];
  assert.equal(D.doneToday(items, { a: [THU], b: [TUE] }, THU), 1);
  assert.equal(D.doneToday([], {}, THU), 0);
  assert.equal(D.doneToday(items, undefined, THU), 0);
});
check('B7: toggle ticks, unticks (when allowed), ticks again, and never mutates', () => {
  const t0 = { a: [MON] };
  const t1 = D.toggle(t0, 'a', MON, true);
  assert.deepEqual(t1.a, []);
  assert.deepEqual(t0.a, [MON]);
  assert.deepEqual(D.toggle(t1, 'a', MON, true).a, [MON]);
  assert.deepEqual(D.toggle(t0, 'a', MON, false).a, [MON]); // untick not chosen: a second press keeps the tick
  assert.deepEqual(D.toggle({}, 'b', MON, true).b, [MON]);
});
console.log(`${n} checks passed (TZ=${process.env.TZ || Intl.DateTimeFormat().resolvedOptions().timeZone})`);
