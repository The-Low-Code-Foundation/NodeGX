/**
 * P107-C92 (P109 ISL-038) — a Shape's Points had no upper bound: 1e9, 2^53 or Infinity built that many vertices and the tab ran out
 * of memory. Ruled 2026-10-07 "Cap at 500"; a value that is not a finite number draws the default 5.
 */
import { MAX_POINTS, pointCountOf } from '../src/components/visual/Circle/Circle';

describe('C92 — Points is a corner count from 3 to 500', () => {
  test('the cap is 500', () => {
    expect(MAX_POINTS).toBe(500);
  });

  test.each([
    [1e9, 500],
    [2 ** 53, 500],
    [Infinity, 5],
    [-Infinity, 5],
    [NaN, 5],
    ['many', 5],
    [500, 500],
    [501, 500],
    [499.6, 500]
  ])('a value far too big, or not a number: %p draws %p', (points, n) => {
    expect(pointCountOf(points)).toBe(n);
  });

  test.each([
    [undefined, 5],
    [null, 5],
    [7, 7],
    ['7', 7],
    [6.4, 6],
    [2, 3],
    [-4, 3],
    [0, 3]
  ])('what it did before stays: %p draws %p', (points, n) => {
    expect(pointCountOf(points)).toBe(n);
  });
});
