/**
 * The coercion table, case by case. Each row is the runtime behaviour the cited line produces;
 * NSP-002's runtime adapter is what proves the citation still holds.
 */

import { coerce, COERCIONS } from '../src/coerce';
import type { Coercion } from '../src/coerce';

const FB = 'fallback';

const table: Array<[Coercion, unknown, unknown]> = [
  ['none', '3', '3'],
  ['js-number', '3', 3],
  ['js-number', 'abc', NaN],
  ['js-number', null, 0],
  ['js-number', undefined, NaN],
  ['js-number', true, 1],
  ['js-string', 3, '3'],
  ['js-string', null, 'null'],
  ['js-boolean', '', false],
  ['js-boolean', 'no', true],
  ['js-boolean', 0, false],
  ['typed-number', '3', 3],
  ['typed-number', 'abc', FB],
  ['typed-number', null, FB],
  ['typed-number', undefined, FB],
  ['typed-string', 3, '3'],
  ['typed-string', null, FB],
  ['typed-boolean', 0, false],
  ['typed-boolean', undefined, FB],
  ['typed-color', '#fff', '#fff'],
  ['typed-color', '#A1B2C3', '#A1B2C3'],
  ['typed-color', 'rgb(1, 2, 3)', 'rgb(1, 2, 3)'],
  ['typed-color', 'rgba(1,2,3,.5)', 'rgba(1,2,3,.5)'],
  ['typed-color', 'red', FB],
  ['typed-color', '#ff000080', FB],
  ['typed-color', 'hsl(0 0% 0%)', FB],
  ['typed-color', null, FB]
];

describe('coercion table', () => {
  test.each(table)('%s(%p) → %p', (kind, input, expected) => {
    const got = coerce(kind, input, FB);
    if (typeof expected === 'number' && Number.isNaN(expected)) expect(Number.isNaN(got)).toBe(true);
    else expect(got).toBe(expected);
  });

  test('every rule cites its source', () => {
    for (const [kind, rule] of Object.entries(COERCIONS)) {
      expect(rule.source.length).toBeGreaterThan(10);
      expect(kind).toBeTruthy();
    }
  });

  test('undefined kind means none', () => {
    expect(coerce(undefined, 'x', FB)).toBe('x');
  });
});
