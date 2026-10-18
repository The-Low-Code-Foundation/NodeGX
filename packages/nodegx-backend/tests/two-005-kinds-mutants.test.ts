/**
 * TWO-005 slice 4b — the kinds spec's mutants: each loosens one rule in the SHIPPED `sharePost` (in a copy of the
 * template), and `two-005-kinds.test.ts` must go red against it.
 *
 * Slow (one backend spec per mutant), so it runs only when asked:
 *
 *     TWO005_MUTANTS=1 npx jest tests/two-005-kinds-mutants.test.ts
 */
import { spawnSync } from 'child_process';
import * as path from 'path';

import { mutateGram } from './helpers/gram-mutant';

const TEMPLATE = path.join(__dirname, '../../../templates/gram');
const RUN = process.env.TWO005_MUTANTS === '1';

jest.setTimeout(1800000);

const KINDS = '["post","prayer","testimony","event"].indexOf(kind) < 0';

/** [what it loosens, function, text in its script, what replaces it] */
export const KINDS_MUTANTS: Array<[string, string, string, unknown]> = [
  // which kinds
  ['a testimony refused', 'sharePost', KINDS, '["post","prayer","event"].indexOf(kind) < 0'],
  ['an event refused', 'sharePost', KINDS, '["post","prayer","testimony"].indexOf(kind) < 0'],
  // words
  ['a testimony with no words', 'sharePost', '"testimony":"Tell the members what happened.",', ''],
  ['an event with no words', 'sharePost', ',"event":"Say what the event is."', ''],
  // the day
  ['an event with no day', 'sharePost', "if (!isFinite(t)) { refuse('Say when the event is: its day and its time.'); return; }", ''],
  ['any string a day', 'sharePost', "typeof a.eventOn === 'string' && /^[0-9]{4}-[0-9]{2}-[0-9]{2}T/.test(a.eventOn)", "typeof a.eventOn === 'string'"],
  ['a number a day', 'sharePost', "typeof a.eventOn === 'string' && /^[0-9]{4}-[0-9]{2}-[0-9]{2}T/.test(a.eventOn) ? Date.parse(a.eventOn)", "a.eventOn !== undefined ? new Date(a.eventOn).getTime()"],
  ['a passed event', 'sharePost', 'if (t < Date.now()) {', 'if (false) {'],
  ['an event years ahead', 'sharePost', 'if (t > Date.now() + 366 * 86400000)', 'if (false)'],
  ['the day not kept', 'sharePost', 'if (eventOn) row.eventOn = eventOn;', ''],
  ['the day kept as it came', 'sharePost', "eventOn = { __type: 'Date', iso: new Date(t).toISOString() };", "eventOn = { __type: 'Date', iso: a.eventOn };"],
  ['a post keeps a day', 'sharePost', "var eventOn = null;\nif (kind === 'event') {", "var eventOn = null;\nif (kind === 'event' || a.eventOn) {"]
];

(RUN ? describe : describe.skip)('TWO-005 slice 4b — the kinds spec’s mutants', () => {
  it.each(KINDS_MUTANTS)('mutant red: %s (%s)', (_what, fn, from, to) => {
    const copy = mutateGram(TEMPLATE, fn, from, to);
    const r = spawnSync('npx', ['jest', 'tests/two-005-kinds.test.ts', '--silent'], {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, TWO005_TEMPLATE: copy, TWO005_MUTANTS: '' },
      encoding: 'utf8'
    });
    const tally = /Tests:\s+(.*)/.exec(`${r.stdout}\n${r.stderr}`)?.[1] ?? 'no tally';
    // Red means the spec ran and failed: a crash before any test ran would be red for the wrong reason.
    expect([r.status, /failed/.test(tally), /passed/.test(tally)]).toEqual([1, true, true]);
  });
});
