/**
 * NSP-005 — the pilot five on the React export, graded against the same spec as the runtime.
 *
 * The export target (helpers/node-spec-target.ts) mounts a node as the latch component the
 * exporter translates it in and drives the emitted code headlessly. Two of the five have such a
 * shape (Counter, Switch); the other three do not, and this file holds the exporter's own reasons
 * as the rows routed to phase 18 (README §8: export gaps are recorded here, fixed there).
 *
 *   NSP_ONLY=Counter npx jest tests/node-spec-conformance.test.ts
 *   NSP_DEEP=10000 npx jest tests/node-spec-conformance.test.ts -t deep
 */

import { formatReport, runConformance, type KnownRow } from '../../nodegx-node-spec/src';
import { specFor } from '../../nodegx-node-spec/src/nodes';
import { emitApp } from '../src/emit/emitApp';
import { loadCatalog } from '../src/catalog';
import { EXPORT_REACH, NO_REACH, emitProbe, exportTarget, latchComponent, probeProject } from './helpers/node-spec-target';

const only = process.env.NSP_ONLY ? process.env.NSP_ONLY.split(',') : undefined;
const graded = (names: string[]) => names.filter((n) => !only || only.includes(n));
const spec = (name: string) => {
  const s = specFor(name);
  if (!s) throw new Error(`no spec for ${name}`);
  return s;
};

/**
 * Divergence classes between the export and the spec, each a §6 row in NSP-005 routed to phase
 * 18's ledger. Predicates are NARROW (port + value type + where in the trace) so a row cannot eat
 * the next finding. Empty until the first run says what diverges.
 */
const isNaNValue = (v: unknown) => typeof v === 'object' && v !== null && (v as { $num?: string }).$num === 'NaN';
const KNOWN: Record<string, KnownRow[]> = {
  Counter: [
    {
      // E1 — the project file carries literals only: a Start Value that is not a string, number or boolean (an object, an
      // array, or the generator's `undefined`) cannot reach the exporter; the runtime counts NaN from such a value.
      row: 'NSP-005 §6 E1',
      matches: (d) =>
        'startValue' in d.params &&
        !['string', 'number', 'boolean'].includes(typeof d.params.startValue) &&
        d.difference.reference?.t === 'value' &&
        d.difference.reference.port === 'currentCount' &&
        isNaNValue(d.difference.reference.value)
    },
    {
      // E2 — a non-numeric Start Value STRING ('abc'): the exported latch boots `Number(raw) || 0` = 0 and counts from
      // there; the runtime counts NaN for ever. A behaviour difference the export makes silently — phase 18's row.
      row: 'NSP-005 §6 E2',
      matches: (d) =>
        typeof d.params.startValue === 'string' &&
        Number.isNaN(Number(d.params.startValue)) &&
        d.difference.reference?.t === 'value' &&
        d.difference.reference.port === 'currentCount' &&
        isNaNValue(d.difference.reference.value) &&
        d.difference.actual?.t === 'value' &&
        typeof d.difference.actual.value === 'number'
    }
    ,
    {
      // E3 — negative zero: the runtime keeps a Start Value of -0 (and counts from it); the exported latch's
      // `Number(raw) || 0` turns -0 into 0. Invisible to a person, visible to the trace.
      row: 'NSP-005 §6 E3',
      matches: (d) => Object.is(d.params.startValue, -0) && d.difference.reference?.t === 'value' && d.difference.reference.port === 'currentCount' && Object.is((d.difference.reference.value as { $num?: string })?.$num, '-0')
    }
  ],
  Switch: [
    {
      // E1 — the project file carries literals only (as for Counter): an object, array or undefined Start State
      // cannot reach the exporter, which boots the latch off; the runtime reads truthiness.
      row: 'NSP-005 §6 E1',
      matches: (d) =>
        'onFromStart' in d.params &&
        !['string', 'number', 'boolean'].includes(typeof d.params.onFromStart) &&
        d.difference.reference?.t === 'value' &&
        d.difference.reference.port === 'state' &&
        d.difference.actual?.t === 'value' &&
        d.difference.actual.port === 'state'
    },
    {
      // E4 — a string or number Start State: the exporter reads `=== true` (a `'true'` string, a 1, even a `'false'`
      // string boot the exported Switch OFF); the runtime reads truthiness (all three boot it ON). Phase 18's row.
      row: 'NSP-005 §6 E4',
      matches: (d) =>
        ['string', 'number'].includes(typeof d.params.onFromStart) &&
        d.difference.reference?.t === 'value' &&
        d.difference.reference.port === 'state' &&
        d.difference.actual?.t === 'value' &&
        d.difference.actual.port === 'state'
    }
  ]
};

describe('NSP-005 — the latch nodes conform on the export inside their reach at 200', () => {
  for (const name of graded(['Counter', 'Switch'])) {
    test(`${name} conforms on the export inside EXPORT_REACH`, async () => {
      const report = await runConformance(spec(name), exportTarget(), { sequences: 200, mutants: true, reach: EXPORT_REACH[name], known: KNOWN[name] });
      // eslint-disable-next-line no-console
      console.log(formatReport(report));
      expect(report.refused).toBeUndefined();
      expect(report.reach).toEqual(EXPORT_REACH[name]);
      expect(report.scenarios.filter((s) => s.status === 'failed' || s.status === 'refused').map((s) => `${s.status} ${s.name}`)).toEqual([]);
      expect(report.generated.ran).toBe(200);
      expect(report.generated.divergences.map((d) => JSON.stringify([d.params, d.steps, d.difference]))).toEqual([]);
      expect(report.mutants!.unreached).toEqual([]);
      expect(report.conforms).toBe(true);
    }, 300_000);
  }
});

describe('NSP-005 — the three pilot nodes the export has no drivable shape for, in the exporter\'s own words', () => {
  const catalog = loadCatalog();
  for (const name of graded(['And', 'Condition', 'String Format'])) {
    test(`${name}: mount refuses with the reason, and the exporter's notes on the latch wrapper say why`, () => {
      expect(() => exportTarget().mount(name, {})).toThrow(/no shape of the export runs/);
      expect(NO_REACH[name]).toBeDefined();
      const app = emitApp(probeProject(latchComponent(spec(name), {})), catalog);
      const notes = app.notes.filter((n) => n.includes('Components/Probe') && !n.includes('no route reaches'));
      // eslint-disable-next-line no-console
      console.log(`${name}:\n  ${notes.join('\n  ')}`);
      expect(notes.length).toBeGreaterThan(0);
    });
  }
});

describe('NSP-005 — the spike\'s numbers (§6): a mount is a render when the emission is cached', () => {
  test('Counter: emit + transpile once, then renders', () => {
    const first = emitProbe(spec('Counter'), { startValue: 3 });
    const again = emitProbe(spec('Counter'), { startValue: 3 });
    expect(again).toBe(first);
    expect(first.tsx).toContain('useState<number>(3)');
    expect(first.notes).toEqual([]);
    const target = exportTarget();
    const t0 = performance.now();
    const h = target.mount('Counter', { startValue: 3 });
    const mountMs = performance.now() - t0;
    target.signal(h, 'increase');
    target.dispose(h);
    // eslint-disable-next-line no-console
    console.log(`Counter emit+transpile ${first.emitMs.toFixed(1)} ms; cached mount ${mountMs.toFixed(2)} ms`);
    expect(mountMs).toBeLessThan(500);
  });
});

const deep = Number(process.env.NSP_DEEP || 0);
(deep > 0 ? describe : describe.skip)(`NSP-005 deep run — ${deep} sequences on the export, shrink on`, () => {
  for (const name of graded(['Counter', 'Switch'])) {
    test(`${name} at ${deep}`, async () => {
      const report = await runConformance(spec(name), exportTarget(), { sequences: deep, shrink: true, reach: EXPORT_REACH[name], known: KNOWN[name] });
      // eslint-disable-next-line no-console
      console.log(formatReport(report));
      expect(report.generated.divergences).toEqual([]);
      expect(report.conforms).toBe(true);
    }, 3_600_000);
  }
});
