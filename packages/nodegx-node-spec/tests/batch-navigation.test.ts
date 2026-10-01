/**
 * NSP-015 — navigation on the interpreter, and the seam the world grew for it: the LOCATION
 * (world.ts) — a play with a window records every `window.open` as handed, and says whether the
 * press came from a person (`navigator.userActivation.isActive`).
 *
 *   AC1–4 (as NSP-011 §4): every batch spec with a reducer conforms on the interpreter against its
 *          own scenarios, with every mutant killed or declared and no reducer unreached (the
 *          runtime-side reading is packages/noodl-runtime/test/node-spec/conformance.test.ts; the
 *          component nodes are graph-graded, tests/graph.test.ts);
 *   LOCATION the mechanism: with no window there is no location and no activation; with one,
 *          `window.open` is recorded and returns null, `navigator.userActivation` exists only when
 *          the script says what it is, and the globals are restored after the play.
 */

import type { AnyNodeSpec } from '../src';
import { DEFAULT_WORLD_POOL, EQUIVALENT_MUTANTS, generateSequence, installWorld, interpreterAdapter, runConformance, specs, World } from '../src';

const BATCH = ['net.noodl.externallink'];

describe('NSP-015 — every batch spec with a reducer conforms on the interpreter: scenarios, 200 sequences, every mutant killed or declared', () => {
  for (const type of BATCH) {
    test(`${type}`, async () => {
      const spec = specs[type];
      expect(spec).toBeDefined();
      const report = await runConformance(spec, interpreterAdapter({ resolve: () => spec }), { sequences: 200, seed: 13, mutants: true, equivalent: EQUIVALENT_MUTANTS[type] });
      expect(report.refused).toBeUndefined();
      expect(report.scenarios.filter((s) => s.status === 'failed' || s.status === 'refused').map((s) => `${s.name}: ${s.reason ?? JSON.stringify(s.difference)}`)).toEqual([]);
      expect(report.scenarios.length).toBeGreaterThanOrEqual(4);
      expect(report.generated.divergences).toEqual([]);
      expect(report.mutants!.survivors.map((m) => `${m.reducer} ${m.kind} ${m.branch}`)).toEqual([]);
      expect(report.mutants!.unreached).toEqual([]);
      expect(report.mutants!.total).toBeGreaterThan(0);
      expect(report.conforms).toBe(true);
    }, 120_000);
  }
});

describe('LOCATION — the world records an open and says whether the press was a person\'s', () => {
  const g = globalThis as unknown as Record<string, unknown>;

  test('no window: no location, and installWorld leaves `window` as the host has it', () => {
    const world = new World({ activation: true });
    expect(world.location).toBeUndefined();
    const before = g.window;
    const installed = installWorld(world);
    try {
      expect(g.window).toBe(before);
    } finally {
      installed.restore();
    }
  });

  test('a window: window.open is recorded as handed and returns null; the activation is the script\'s; restored after', () => {
    const world = new World({ viewport: { width: 800, height: 600 }, activation: false });
    const seen: unknown[] = [];
    world.location!.onOpen((r) => seen.push(r));
    const installed = installWorld(world);
    try {
      const w = g.window as { open(...a: unknown[]): unknown; navigator: { userActivation?: { isActive: boolean } } };
      expect(w.open(5, '_blank', 'noopener')).toBeNull();
      expect(w.navigator.userActivation).toEqual({ isActive: false });
    } finally {
      installed.restore();
    }
    expect(world.location!.opened).toEqual([{ url: 5, target: '_blank', features: 'noopener' }]);
    expect(seen).toEqual(world.location!.opened);
    expect(g.window).toBeUndefined();
  });

  test('a window with no activation in the script has no `userActivation` — the browser cannot say', () => {
    const installed = installWorld(new World({ viewport: { width: 800, height: 600 } }));
    try {
      expect((g.window as { navigator: Record<string, unknown> }).navigator.userActivation).toBeUndefined();
    } finally {
      installed.restore();
    }
  });

  test('a `location` spec\'s sequences draw a window or none, and each activation, from the default pools', () => {
    const spec = specs['net.noodl.externallink'] as AnyNodeSpec;
    const worlds = Array.from({ length: 60 }, (_, i) => generateSequence(spec, 1, i).world ?? {});
    expect(new Set(worlds.map((w) => (w.viewport ? 'window' : 'none')))).toEqual(new Set(['window', 'none']));
    expect(new Set(worlds.map((w) => String(w.activation)))).toEqual(new Set(DEFAULT_WORLD_POOL.activations.map((a) => String(a ?? undefined))));
  });
});
