/**
 * @jest-environment ../nodegx-node-spec/tests/jest-env-real-process.js
 *
 * NSP-003 on the runtime — the runner pointed at the interpreted runtime. The environment is the
 * node one plus the REAL `process.env` (its header): a `timezone` spec's play sets the zone
 * through it (world.ts TIME ZONE), and jest's sandboxed copy would move nothing.
 *
 * AC1  a planted divergence in a COPY of the runtime's Counter (never the real file: the copy is
 *      made in memory from the source text, transpiled, and registered on a fresh target) is
 *      caught within the R5 budget and shrinks to a sequence of ≤ 4 steps.
 * AC5  PR-CI mode (200 sequences, no shrink) stays within budget; the time per node is printed.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

import type { NodeModule } from '@noodl/types';

import { Counter, EQUIVALENT_MUTANTS, specs, runConformance, formatReport } from '../../../nodegx-node-spec/src';
import type { Divergence, KnownRow, Report, TraceEvent } from '../../../nodegx-node-spec/src';
import { runtimeTarget, withViewerNodes, type RuntimeTarget } from '../helpers/node-spec-target';

import NodeDefinition = require('../../src/nodedefinition');

/** The runtime target every spec is graded on: the runtime's own nodes plus the viewer-provided ones this phase specced. */
const batchTarget = (): RuntimeTarget => withViewerNodes(runtimeTarget());

const COUNTER_FILE = path.join(__dirname, '..', '..', 'src', 'nodes', 'std-library', 'counter.ts');

/**
 * A copy of a runtime node module with one textual change, compiled in memory. `cp` before
 * mutating (memory: `git checkout --` kills a peer's edit) — here the copy never touches disk.
 */
function copyOfCounterWith(find: string, replace: string): NodeModule {
  const source = fs.readFileSync(COUNTER_FILE, 'utf8');
  if (!source.includes(find)) throw new Error(`counter.ts no longer contains ${JSON.stringify(find)} — re-read the file`);
  const mutated = source.replace(find, replace);
  const js = ts.transpileModule(mutated, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 } }).outputText;
  const dir = path.dirname(COUNTER_FILE);
  const module = { exports: {} as NodeModule };
  const localRequire = (spec: string) => (spec.startsWith('.') ? require(path.resolve(dir, spec)) : require(spec));
  new Function('require', 'module', 'exports', js)(localRequire, module, module.exports);
  return module.exports;
}

/**
 * The §6 rows of NSP-004 that are written up and awaiting a ruling (R3 (a): no runtime change
 * rides with a spec). Each predicate is as NARROW as the row: it names the step, the port, the
 * value's type and requires the difference to come AFTER that step — a wider predicate would eat
 * the next finding. When a row is ruled and fixed, its entry here goes, and the `known` count
 * below must read 0 in the same commit.
 */
const isSet = (e: TraceEvent, port: string, bad: (value: unknown, present: boolean) => boolean) =>
  e.t === 'set' && e.port === port && bad((e as { value?: unknown }).value, 'value' in e);

/**
 * NSP-011 §6 C4 — a `.toString()` in a setter: `null` (and, where noted, `undefined`) THROWS inside
 * `setInputValue`, so the runtime target dies at that step (or in `mount`, when the value is a
 * parameter — then nothing was recorded and the difference sits at 0). Narrow: the throw's own
 * message, and the difference no later than the step after the bad set.
 */
const throwsOnToString = (ports: readonly string[], values: (v: unknown, present: boolean) => boolean) => (d: Divergence) => {
  if (d.difference.threw === undefined || !/toString/.test(d.difference.threw)) return false;
  const bad = d.reference.findIndex((e) => ports.some((p) => isSet(e, p, values)));
  return bad >= 0 && d.difference.index <= bad + 1;
};
const isNull = (v: unknown, present: boolean) => present && v === null;
const isNullOrUndefined = (v: unknown, present: boolean) => !present || v === null;

/**
 * NSP-011 §6 C6 / R7 — node.ts `setInputValue` (:410-420) merges a later value into a `{ value,
 * unit }` object the port once held. Narrow: a unit object set on the port, then a later set on
 * the SAME port of something that is not one, and the difference after that later set.
 */
const unitMerge = (port: string) => (d: Divergence) => {
  const withUnit = (v: unknown) => !!v && typeof v === 'object' && !Array.isArray(v) && 'unit' in (v as object);
  const first = d.reference.findIndex((e) => isSet(e, port, (v) => withUnit(v)));
  if (first < 0) return false;
  const later = d.reference.findIndex((e, i) => i > first && isSet(e, port, (v) => !withUnit(v)));
  return later >= 0 && d.difference.index > later;
};

/** C6 on every port a predicate names — the Object node's `prop-<name>` inputs are derived, any name. */
const unitMergeOnAny = (portMatches: (port: string) => boolean) => (d: Divergence) => {
  const ports = new Set(d.reference.filter((e) => e.t === 'set' && portMatches((e as { port: string }).port)).map((e) => (e as { port: string }).port));
  return [...ports].some((port) => unitMerge(port)(d));
};

/**
 * NSP-012 §6 C9 — Create New Array, Create New Object and Set Object Properties coalesce two `Do`
 * presses in one frame into ONE outcome (the `hasScheduled…` guard sits before `beginOutcome`),
 * where the spec, the contract and their siblings (Array's Fetch, Set Variable, Array Filter)
 * report one per press. Narrow: a frame with two or more `in` on the port, and the difference at
 * or after that frame's settle.
 */
const coalescedPress = (port: string) => (d: Divergence) => {
  let presses = 0;
  for (let i = 0; i < d.reference.length; i++) {
    const e = d.reference[i];
    if (e.t === 'in' && e.port === port) presses++;
    else if (e.t === 'settle') {
      if (presses >= 2 && d.difference.index >= i) return true;
      presses = 0;
    }
  }
  return false;
};

/**
 * NSP-012 §6 C10 — Array Filter and Array Map bind `Items` with `collection.on('change', …)`
 * (:343, :233): a value that is neither an array nor null/undefined — a number, a boolean, a plain
 * object — has no `on` and the setter THROWS. Narrow: the throw's own message, at the set.
 */
const nonArrayOnItems = (d: Divergence) => {
  if (d.difference.threw === undefined || !/\.on is not a function/.test(d.difference.threw)) return false;
  const bad = d.reference.findIndex((e) => isSet(e, 'items', (v, present) => present && v !== null && typeof v !== 'string' && !Array.isArray(v) && typeof v === 'object' ? true : present && (typeof v === 'number' || typeof v === 'boolean')));
  return bad >= 0 && d.difference.index <= bad + 1;
};

/**
 * NSP-012 §6 C11 — the Object node's `<property> Changed` outputs are declared to the editor
 * (modelnode2.ts :517-525) and never registered: `registerOutputIfNeeded` handles `prop-` only
 * (:451-460), a wire from `<p> Changed` throws inside the connection and is dropped
 * (nodescope.ts :149-153), and the pulse at :113 is guarded by `hasOutput`. Narrow: the first
 * differing event in the reference is a `changed-…` signal.
 */
const deadPropertyChanged = (d: Divergence) => {
  const e = d.reference[d.difference.index];
  return e !== undefined && e.t === 'signal' && /^changed-/.test(e.port);
};

/**
 * NSP-013 §6 C16 — Date Add stores a Unit and then recomputes (dateadd.ts :77-78); a unit that is
 * not one of the eight and not empty THROWS in `addToDate` (datemath.ts :88), so the setter
 * throws and the runtime target dies at that step. Narrow: the throw's own message, at a `set`
 * of `unit` to such a value, and the difference no later than the step after it.
 */
const unknownUnitThrows = (d: Divergence) => {
  const m = d.difference.threw === undefined ? null : /^runtime threw: Unknown unit "(.*)"\.$/.exec(d.difference.threw);
  if (!m) return false;
  // the unit the throw names arrived on the port — as a mount parameter or a `set` before the difference
  const named = m[1];
  if (d.params.unit === named) return true;
  return d.reference.findIndex((e, i) => i < d.difference.index + 1 && isSet(e, 'unit', (v) => v === named)) >= 0;
};

/**
 * NSP-013 §6 C21 — States builds each animated value's bezier from its transition's `curve` inside
 * the frame-end callback (states.ts :811); bezier-easing 1.1.1 THROWS for anything but four finite
 * numbers with both x in [0, 1] (`{}`, `true`, text, `{ dur, delay }` with no `curve`). The scheduler
 * logs it and the move is abandoned half-done, with no outcome. Narrow: a `transition…` port was
 * written, before the divergence, with a truthy value whose `curve` the library refuses — the only
 * values that reach `BezierEasing` and throw (a falsy one reads the state's Default, :792-793).
 */
const acceptedCurve = (points: unknown) =>
  Array.isArray(points) && points.length === 4 && points.every((p) => typeof p === 'number' && isFinite(p)) && points[0] >= 0 && points[0] <= 1 && points[2] >= 0 && points[2] <= 1;
const refusedCurveWritten = (d: Divergence) =>
  d.reference.some((e, i) => i < d.difference.index && e.t === 'set' && /^transition/.test(e.port) && !!(e as { value?: unknown }).value && !acceptedCurve(((e as { value?: { curve?: unknown } }).value as { curve?: unknown }).curve));

/**
 * NSP-011 §6 C6 is node.ts's, not a node's: `setInputValue` merges a later value into a `{ value, unit }`
 * the port once held, on EVERY port of EVERY node. The per-node entries below each carry a hand scenario
 * and must keep firing; this one is the same narrow predicate on any port, counted for every spec, so a
 * daily rotation that first draws C6 on a port nobody listed (s12: Object, Variable, HTTP's Headers — one
 * a day for three of seven seeds) reads as the known row, not as a red run. Never asserted to fire.
 */
const C6_ANY_PORT: KnownRow = { row: 'NSP-011 §6 C6 (any port — node.ts) — a later value merged into a unit object the port once held (R7)', matches: unitMergeOnAny(() => true) };

const KNOWN_ROWS: Record<string, KnownRow[]> = {
  States: [{ row: 'NSP-013 §6 C21 — a transition whose curve bezier-easing refuses throws in the frame-end callback: the move is abandoned half-done, the rest of the queue dropped, no outcome reported', matches: refusedCurveWritten }],
  'net.noodl.DateAdd': [{ row: 'NSP-013 §6 C16 — an unknown Unit throws in Date Add\'s setter', matches: unknownUnitThrows }],
  CollectionNew: [{ row: 'NSP-012 §6 C9 — a second Do in one frame reports nothing (the guard sits before beginOutcome)', matches: coalescedPress('new') }],
  NewModel: [{ row: 'NSP-012 §6 C9 — a second Do in one frame reports nothing (the guard sits before beginOutcome)', matches: coalescedPress('new') }],
  SetModelProperties: [{ row: 'NSP-012 §6 C9 — a second Do in one frame reports nothing (the guard sits before beginOutcome)', matches: coalescedPress('store') }],
  Model2: [{ row: 'NSP-012 §6 C11 — `<property> Changed` never fires: nothing registers the output', matches: deadPropertyChanged },
    { row: 'NSP-011 §6 C6 — node.ts merges a later value into a unit object the port once held (R7)', matches: unitMergeOnAny((p) => p.startsWith('prop-')) }
  ],
  'Filter Collection': [{ row: 'NSP-012 §6 C10 — a non-array on Items throws in the setter (`collection.on` on a number, a boolean, a plain object)', matches: nonArrayOnItems }],
  'Map Collection': [{ row: 'NSP-012 §6 C10 — a non-array on Items throws in the setter (`collection.on` on a number, a boolean, a plain object)', matches: nonArrayOnItems }],
  'String Format': [
    {
      row: 'NSP-004 §6 C3 — a non-string Format is stored unconverted, `.match` throws in the after-inputs callback, the scheduler logs it, and `formatScheduled` is never cleared: the node never formats again',
      matches: (d: Divergence) => {
        const bad = d.reference.findIndex((e) => e.t === 'set' && e.port === 'format' && typeof (e as { value?: unknown }).value !== 'string');
        return bad >= 0 && d.difference.index > bad;
      }
    }
  ],
  Substring: [
    {
      row: 'NSP-011 §6 C4 — Substring `string`: `value.toString()` (:77) throws on null and undefined; the description says it "raises an error"',
      matches: throwsOnToString(['string'], isNullOrUndefined)
    }
  ],
  'String Mapper': [
    {
      row: 'NSP-011 §6 C4 — String Mapper: `.toString()` on Input String (:70) and on every numbered input (:42, :54) throws on null',
      matches: (d: Divergence) => {
        const numbered = d.reference.map((e) => (e.t === 'set' ? (e as { port: string }).port : '')).filter((p) => /^(input|output) \d+$/.test(p));
        return throwsOnToString(['inputString', ...numbered], isNull)(d);
      }
    }
  ],
  'Value Changed': [{ row: 'NSP-011 §6 C6 — node.ts merges a later value into a unit object the port once held (R7)', matches: unitMerge('value') }],
  'net.noodl.Log': [{ row: 'NSP-011 §6 C6 — node.ts merges a later value into a unit object the port once held (R7)', matches: unitMerge('value') }],
  'net.noodl.HTTP': [{ row: 'NSP-011 §6 C6 — node.ts merges a later value into a unit object the port once held (R7)', matches: unitMerge('headers') }],
  Variable2: [{ row: 'NSP-011 §6 C6 — node.ts merges a later value into a unit object the port once held (R7)', matches: unitMerge('value') }],
  'net.noodl.StreamBuffer': [{ row: 'NSP-011 §6 C6 — node.ts merges a later value into a unit object the port once held (R7)', matches: unitMerge('data') }]
};

/**
 * NSP-004 — every registered spec, in PR-CI mode (200 sequences, the day's seed, no shrink) plus
 * the mutants (interpreter-side, cheap). The reports are printed in full so a red run names the
 * node, the scenario or the seed, and the first differing line.
 *
 *   NSP_ONLY="String Format" npx jest test/node-spec/conformance.test.ts     one node (or a comma-separated list)
 *   NSP_SEED=20731 …                                    another day's seed (the default rotates by UTC day)
 *   NSP_DEEP=10000 NSP_REPLAY_DIR=<dir> npx jest test/node-spec/conformance.test.ts -t deep
 *                                                       the deep run: shrink on, replays written
 */
describe('NSP-004 / NSP-011 — every registered spec on the runtime, 200 sequences each, every mutant', () => {
  const reports = new Map<string, Report>();
  const only = process.env.NSP_ONLY ? process.env.NSP_ONLY.split(',') : undefined;
  const pilot = Object.values(specs).filter((s) => !only || only.includes(s.type));
  /** Another day's rotation, to check a known row fires on more than today's seed (NSP-013 s12). */
  const daySeed = process.env.NSP_SEED ? Number(process.env.NSP_SEED) : undefined;
  beforeAll(async () => {
    for (const spec of pilot) {
      const report = await runConformance(spec, batchTarget(), { sequences: 200, seed: daySeed, mutants: true, known: [...(KNOWN_ROWS[spec.type] ?? []), C6_ANY_PORT], equivalent: EQUIVALENT_MUTANTS[spec.type] });
      // eslint-disable-next-line no-console
      console.log(formatReport(report));
      reports.set(spec.type, report);
    }
  }, 600_000);

  for (const type of pilot.map((s) => s.type)) {
    test(`${type} conforms on the runtime (known rows counted, not hidden)`, () => {
      const report = reports.get(type)!;
      expect(report.refused).toBeUndefined();
      expect(report.scenarios.filter((s) => s.status === 'failed' || s.status === 'refused').map((s) => s.name)).toEqual([]);
      expect(report.generated.ran).toBe(200);
      expect(report.generated.divergences.map((d) => JSON.stringify([d.params, d.steps, d.difference]))).toEqual([]);
      expect(report.mutants!.survivors).toEqual([]);
      expect(report.mutants!.unreached).toEqual([]);
      expect(report.conforms).toBe(true);
    });
  }

  test('the known rows are still open — each still fires; a row that stops firing must be closed in its §6', () => {
    for (const [type, rows] of Object.entries(KNOWN_ROWS)) {
      if (only && !only.includes(type)) continue;
      const report = reports.get(type)!;
      for (const row of rows) {
        // NSP-013 s12 (T4): a row fires when a hand scenario carrying it reproduces OR the generated
        // sequences hit it. Generated alone was right only while every day replayed one corpus; under a
        // real rotation a rare row (Value Changed's C6: 0, 2, 1 on three seeds) reads 0 on some days.
        const k = report.generated.known.find((x) => x.row === row.row)!;
        const byScenario = report.scenarios.some((sc) => sc.status === 'known' && sc.row !== undefined && row.row.startsWith(sc.row));
        expect({ type, row: row.row, fires: byScenario || k.count > 0 }).toEqual({ type, row: row.row, fires: true });
      }
      expect(report.scenarios.filter((s) => s.status === 'known').length).toBeGreaterThan(0);
      expect(report.scenarios.filter((s) => s.status === 'passed' && s.row)).toEqual([]);
    }
  });
});

describe('NSP-011 — the Log line is an effect the target keeps beside the trace (checked, not ignored)', () => {
  test('a Log pulse writes one line to the scope sink with the level, the message and the data; the console is not used', async () => {
    const target = batchTarget();
    const h = target.mount('net.noodl.Log', { message: 'hello', level: 'warn', data: { a: 1 } });
    target.signal(h, 'log');
    target.set(h, 'level', 'loud');
    target.signal(h, 'log');
    await target.settle();
    expect(h.logs).toEqual([
      { level: 'warn', message: 'hello', data: { a: 1 } },
      { level: 'info', message: 'hello', data: { a: 1 } }
    ]);
    expect(target.trace(h).filter((e) => e.t === 'outcome')).toHaveLength(2);
  });
});

const deep = Number(process.env.NSP_DEEP || 0);
(deep > 0 ? describe : describe.skip)(`NSP-004 / NSP-011 deep run — ${deep} sequences, shrink, replays`, () => {
  const only = process.env.NSP_ONLY ? process.env.NSP_ONLY.split(',') : undefined;
  for (const spec of Object.values(specs).filter((s) => !only || only.includes(s.type))) {
    test(`${spec.type} at ${deep}`, async () => {
      const report = await runConformance(spec, batchTarget(), {
        sequences: deep,
        shrink: true,
        mutants: true,
        replayDir: process.env.NSP_REPLAY_DIR,
        known: [...(KNOWN_ROWS[spec.type] ?? []), C6_ANY_PORT],
        equivalent: EQUIVALENT_MUTANTS[spec.type]
      });
      // eslint-disable-next-line no-console
      console.log(formatReport(report));
      expect(report.conforms).toBe(true);
    }, 3_600_000);
  }
});

describe('NSP-003 on the runtime', () => {
  test('AC5 — Counter conforms on the runtime in PR-CI mode: 200 sequences, the day\'s seed, no shrink', async () => {
    const report = await runConformance(Counter, runtimeTarget(), { sequences: 200 });
    // eslint-disable-next-line no-console
    console.log(formatReport(report));
    expect(report.refused).toBeUndefined();
    expect(report.scenarios.map((s) => s.status)).toEqual(Array(report.scenarios.length).fill('passed'));
    expect(report.scenarios.length).toBeGreaterThanOrEqual(7);
    expect(report.generated.ran).toBe(200);
    expect(report.generated.divergences).toEqual([]);
    expect(report.conforms).toBe(true);
    expect(report.timeMs).toBeLessThan(30_000);
  }, 60_000);

  test('AC1 — a planted off-by-one in a COPY of counter.ts is caught and shrinks to ≤ 4 steps', async () => {
    const target = runtimeTarget();
    const copy = copyOfCounterWith('this._internal.currentValue >= this._internal.limitsMax', 'this._internal.currentValue > this._internal.limitsMax');
    target.context.nodeRegister.register(NodeDefinition.defineNode(copy.node!));
    const report = await runConformance(Counter, target, { sequences: 200, seed: 1, shrink: true, stopAtFirst: true });
    expect(report.conforms).toBe(false);
    expect(report.scenarios.find((s) => s.name.startsWith('limits: at Max'))!.status).toBe('failed');
    expect(report.generated.divergences).toHaveLength(1);
    const d = report.generated.divergences[0];
    expect(d.shrunk).toBe(true);
    expect(d.steps.length).toBeLessThanOrEqual(4);
    // the shrunk sequence shows the off-by-one itself: the spec holds at Max and reports
    // unchanged, the copy counts past it and reports done
    expect(d.reference).toContainEqual({ t: 'outcome', port: 'increase', value: 'unchanged' });
    expect(d.actual).toContainEqual({ t: 'outcome', port: 'increase', value: 'done' });
    expect(d.difference.index).toBeGreaterThanOrEqual(0);
    // eslint-disable-next-line no-console
    console.log(formatReport(report));
  }, 60_000);

  test('the real Counter file was not touched by the copy', () => {
    expect(fs.readFileSync(COUNTER_FILE, 'utf8')).toContain('this._internal.currentValue >= this._internal.limitsMax');
  });
});
