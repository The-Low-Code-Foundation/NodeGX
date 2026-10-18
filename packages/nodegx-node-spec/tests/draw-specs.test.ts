/**
 * OWN-012 step 2 — the drawer's generated spec table (src/draw-specs.generated.ts, written by scripts/gen-draw-specs.mjs)
 * is the live table's own derivation (`drawSpecTable` over `specs`), field for field. A spec edit that moves a default, a
 * layout role or a portability class fails here until the file is regenerated: the small drawer entry (`src/draw-only.ts`)
 * never drifts from the specs it stands for.
 */
import { drawSpecTable, specs } from '../src';
import { DRAW_SPECS } from '../src/draw-specs.generated';

describe('OWN-012 — the drawer-only table is derived from the specs, not copied', () => {
  test('the generated table equals the derivation over the live specs', () => {
    expect(DRAW_SPECS).toEqual(drawSpecTable(specs));
  });

  test('it holds every type whose spec gives an input a layout role, and no other', () => {
    const visual = Object.keys(specs)
      .filter((t) => Object.values(specs[t].inputs).some((d) => (d as { layout?: string }).layout !== undefined))
      .sort();
    expect(Object.keys(DRAW_SPECS).sort()).toEqual(visual);
    expect(visual.length).toBeGreaterThanOrEqual(17);
  });

  test('every entry is JSON (a default that is a function would be lost in the file)', () => {
    expect(JSON.parse(JSON.stringify(DRAW_SPECS))).toEqual(drawSpecTable(specs));
  });
});
