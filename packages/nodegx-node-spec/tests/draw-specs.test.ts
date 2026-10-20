/**
 * OWN-012 step 2 — the drawer's generated spec table (src/draw-specs.generated.ts, written by scripts/gen-draw-specs.mjs)
 * is the live table's own derivation (`drawSpecTable` over `specs`), field for field. A spec edit that moves a default, a
 * layout role or a portability class fails here until the file is regenerated: the small drawer entry (`src/draw-only.ts`)
 * never drifts from the specs it stands for.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

import { drawSpecTable, specs } from '../src';
import * as drawOnly from '../src/draw-only';
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

// OWN-012 s3 — the small entry is published as `@nodegx/node-spec/draw` (for the next npm cut): the brief tells a
// stranger to import it, so the exports map must name the files build.mjs writes from src/draw-only.ts, in both formats.
describe('OWN-012 — `@nodegx/node-spec/draw` is the drawer-only entry', () => {
  const root = join(__dirname, '..');
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const build = readFileSync(join(root, 'build.mjs'), 'utf8');
  const entry = pkg.exports['./draw'];

  test('the exports map points at what build.mjs bundles from src/draw-only.ts, ESM and CJS, with its types', () => {
    expect(entry.types).toBe('./dist/types/nodegx-node-spec/src/draw-only.d.ts');
    expect(pkg.typesVersions['*'].draw).toEqual([entry.types]);
    for (const [format, file] of [['esm', entry.import], ['cjs', entry.require]] as const) {
      const outfile = String(file).replace(/^\.\//, '');
      expect(build).toContain(`entryPoints: ['src/draw-only.ts'], format: '${format}', outfile: '${outfile}'`);
    }
  });

  test('it gives a page what it needs to draw: the drawer, the canvas measurer, the trace coercion', () => {
    for (const name of ['draw', 'isVisualType', 'createDrawer', 'canvasTextMeasurer', 'traceValue'] as const) expect(typeof drawOnly[name]).toBe('function');
  });
});
