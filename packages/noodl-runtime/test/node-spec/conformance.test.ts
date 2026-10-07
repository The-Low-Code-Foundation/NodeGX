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
import type { Divergence, KnownRow, Report, TraceEvent, Withheld } from '../../../nodegx-node-spec/src';
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
/**
 * NSP-016 §6 C79 — a Text (Group, Image, Circle, Video) at Opacity exactly 0 takes no pointer (Text.tsx :88-90), but a Pointer Events
 * Enabled / Mode write after it was drawn reaches the element directly and the opacity rule is not re-applied — the runtime raises a
 * pointer output the spec does not. Narrow: the first difference is a pointer output on the RUNTIME's side, the last Opacity written
 * before it is the number 0, and a Pointer Events input was written before it. s50: a drag from the desktop is under the same hit test,
 * so what it raises on the element counts too — Files Dropped / Files Rejected, Is Dragging Over going true, a dropped file's values.
 */
const POINTER_OUTPUTS = ['pointerDown', 'pointerUp', 'onClick', 'hoverStart', 'pointerEnter', 'hoverEnd', 'filesDropped', 'filesRejected'];
const FILE_DROP_VALUES = ['droppedFile', 'droppedFiles', 'droppedFileName', 'droppedFileType', 'droppedFileSizeInBytes'];
const isZero = (v: unknown) => v === 0 || (typeof v === 'object' && v !== null && (v as { $num?: unknown }).$num === '-0');
const invisibleTakesPointer = (d: Divergence) => {
  if (d.difference.threw !== undefined) return false;
  const a = d.actual[d.difference.index];
  if (!a) return false;
  // s51 — and the drag: the invisible element takes the press that starts its own drag (Is Lifted, Picked Up), or lights as a card's zone
  const raised =
    a.t === 'signal'
      ? POINTER_OUTPUTS.includes(a.port) || a.port === 'pickedUp'
      : a.t === 'value' && ((['isDragOver', 'isLifted', 'isDropTarget'].includes(a.port) && a.value === true) || FILE_DROP_VALUES.includes(a.port));
  if (!raised) return false;
  const before = d.reference.slice(0, d.difference.index);
  const opacity = before.filter((e) => e.t === 'set' && e.port === 'opacity').pop() as { value?: unknown } | undefined;
  if (!opacity || !isZero(opacity.value)) return false;
  return before.some((e) => e.t === 'set' && (e.port === 'pointerEventsEnabled' || e.port === 'pointerEventsMode'));
};

/** The value the input held at the difference: the last write before it, else the placing's param. */
const heldAt = (d: Divergence, port: string): unknown => {
  const written = d.reference.slice(0, d.difference.index).filter((e) => e.t === 'set' && e.port === port).pop() as { value?: unknown } | undefined;
  return written ? written.value : d.params[port];
};

/**
 * NSP-016 s53 — values the generator does not draw on the runtime target (runner `withheld`), because the target cannot survive
 * them: a known row that takes the whole process down cannot be played, so it cannot be counted either. Printed in every report.
 */
/**
 * NSP-016 §6 C95 (s53, R16) — a Focus on a Group that is not on the page reports Unchanged and lists nothing (as a field's does,
 * R13); the runtime lists it (a Group has no `_canFocus`, focus-tracker.ts :60), fires Focused and reports Done. Narrow: the
 * difference is in the group of events a settle printed, and the reference's group holds the Focus action's Unchanged.
 */
const groupFocusOffPage = (d: Divergence) => {
  if (d.difference.threw !== undefined) return false;
  const isStep = (e: TraceEvent) => e.t === 'set' || e.t === 'in' || e.t === 'act' || e.t === 'settle' || e.t === 'advance';
  let k = Math.min(d.difference.index, d.reference.length) - 1;
  while (k >= 0 && d.reference[k].t !== 'settle') {
    if (isStep(d.reference[k])) return false;
    k--;
  }
  if (k < 0) return false;
  for (let i = k + 1; i < d.reference.length && !isStep(d.reference[i]); i++) {
    const e = d.reference[i] as { t: string; port?: string; value?: unknown };
    if (e.t === 'outcome' && e.port === 'focus' && e.value === 'unchanged') return true;
  }
  return false;
};

const WITHHELD: Record<string, Readonly<Record<string, Withheld>>> = {
  // none: C92 (a Shape's Points of 1e9, 2^53 or Infinity ran the heap out) was fixed in P109 ISL-038 — Circle.tsx caps it at 500
};

const KNOWN_ROWS: Record<string, KnownRow[]> = {
  // s43 — the Text: a text style (C61) and the Placement and units-typed style setters; s44 — C79 (R11: the spec says the intent)
  Text: [
    { row: 'NSP-016 §6 C79 — at Opacity 0 after a Pointer Events write the element takes the pointer', matches: invisibleTakesPointer }
  ],
  // s53 — the Shape: the Text's rows (the same shared ports and drag module)
  Circle: [
    { row: 'NSP-016 §6 C79 — at Opacity 0 after a Pointer Events write the element takes the pointer', matches: invisibleTakesPointer }
  ],
  // s53 — the Image: the Text's rows (the same shared ports and drag module)
  Image: [
    { row: 'NSP-016 §6 C79 — at Opacity 0 after a Pointer Events write the element takes the pointer', matches: invisibleTakesPointer }
  ],
  // s52 — the Group: the Text's rows (the same shared ports and drag module), and its own Tag
  Group: [
    { row: 'NSP-016 §6 C79 — at Opacity 0 after a Pointer Events write the element takes the pointer', matches: invisibleTakesPointer },
    { row: 'NSP-016 §6 C95 — a Focus on a Group off the page: the runtime lists it, fires Focused and reports Done (R16: Unchanged)', matches: groupFocusOffPage }
  ],
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
      const report = await runConformance(spec, batchTarget(), { sequences: 200, seed: daySeed, mutants: true, known: KNOWN_ROWS[spec.type] ?? [], withheld: WITHHELD[spec.type], equivalent: EQUIVALENT_MUTANTS[spec.type] });
      // eslint-disable-next-line no-console
      console.log(formatReport(report));
      reports.set(spec.type, report);
    }
    // s39 — the visual nodes' matrix scenarios made the whole batch outgrow ten minutes (Text Input 197 s, Dropdown 124 s, States
    // 134 s; 110 specs ≈ 900 s on a loaded box): thirty, so the hook does not cut the batch at the 90th spec and redden every test
  }, 1_800_000);

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
        known: KNOWN_ROWS[spec.type] ?? [],
        withheld: WITHHELD[spec.type],
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
