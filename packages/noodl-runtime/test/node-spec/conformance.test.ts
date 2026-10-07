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

/**
 * NSP-016 §6 C82 (s50) — Accepted file types holding a truthy value that is not text (a wired number, an object) makes the drop
 * handler throw at `(accept || '').split` (node-shared-port-definitions.ts :294), after Is Dragging Over went false: no File value
 * and neither Files Dropped nor Files Rejected. The spec reads the value as text. Narrow: a file drop came before the difference, the
 * difference is at a file-drop output on either side, and the last Accepted file types (a write, else the placing's) is truthy and
 * not a string (NaN and -0 are falsy).
 */
const FILE_DROP_OUTPUTS = [...FILE_DROP_VALUES, 'filesDropped', 'filesRejected', 'isDragOver'];
const nonTextFileTypes = (d: Divergence) => {
  if (d.difference.threw !== undefined) return false;
  const atFile = (e: TraceEvent | undefined) => !!e && (e.t === 'value' || e.t === 'signal') && FILE_DROP_OUTPUTS.includes(e.port);
  if (!atFile(d.reference[d.difference.index]) && !atFile(d.actual[d.difference.index])) return false;
  const before = d.reference.slice(0, d.difference.index);
  if (!before.some((e) => e.t === 'act' && e.act === 'fileDrop')) return false;
  const written = before.filter((e) => e.t === 'set' && e.port === 'acceptedFileTypes').pop() as { value?: unknown } | undefined;
  const v = written ? written.value : d.params.acceptedFileTypes;
  const falsyNum = typeof v === 'object' && v !== null && ['NaN', '-0'].includes(String((v as { $num?: unknown }).$num));
  return !!v && !falsyNum && typeof v !== 'string';
};

/**
 * NSP-016 §6 C84 and C85 (s51) — two more inputs drag-drop.ts reads as text with `(value || '').split` / `.trim()`: a truthy value
 * that is not text throws inside the controller. Accept Kind (`kindsOf` :155-160, from `accepts`, in `zoneAt` and `orderedZones`):
 * a drag that meets the zone dies there — a pointer let go before its swallow and its drop, so the gesture never ends; a keyboard
 * pick-up starts in no zone. Zone Name (`zoneName` :740-748, in `drop` :393 before `finish`): the drop fires Dropped and Landed, then
 * never ends — the zone stays lit, the source lifted, and no other drag can start. The spec reads both as text (the intent). Shared
 * shape: the difference is on a drag output, and the input held such a value at some point before it with Accept Drops on.
 */
const DRAG_OUTPUTS = ['isDropTarget', 'droppedValue', 'dropIndex', 'isLifted', 'dropped', 'landed', 'pickedUp', 'dragCancelled', 'onClick'];
const notText = (v: unknown) => {
  const falsyNum = typeof v === 'object' && v !== null && ['NaN', '-0'].includes(String((v as { $num?: unknown }).$num));
  return !!v && !falsyNum && typeof v !== 'string';
};
const everHeld = (d: Divergence, port: string, test: (v: unknown) => boolean) =>
  test(d.params[port]) || d.reference.slice(0, d.difference.index).some((e) => e.t === 'set' && e.port === port && test((e as { value?: unknown }).value));
const nonTextDragInput = (port: string) => (d: Divergence) => {
  if (d.difference.threw !== undefined) return false;
  const atDrag = (e: TraceEvent | undefined) => !!e && (e.t === 'value' || e.t === 'signal') && DRAG_OUTPUTS.includes(e.port);
  if (!atDrag(d.reference[d.difference.index]) && !atDrag(d.actual[d.difference.index])) return false;
  return everHeld(d, port, notText) && everHeld(d, 'acceptDrops', (v) => !!v);
};
const nonTextAcceptKind = nonTextDragInput('acceptKind');
const nonTextZoneName = nonTextDragInput('dropZoneName');

/**
 * NSP-016 §6 C87 (s52) — Group.tsx takes its tag with a destructuring default (`const { as = 'div' }`), which covers only `undefined`:
 * a Tag of `""`, null, 0 or false reaches `React.createElement` and the render throws. The spec draws a `div`, as the Text does
 * (`props.as || 'div'`). Narrow: the runtime threw, and the Tag last written before the difference (a placing's param is a set too)
 * is falsy and not undefined (NaN and -0 are falsy).
 */
const heldAt = (d: Divergence, port: string): unknown => {
  const written = d.reference.slice(0, d.difference.index).filter((e) => e.t === 'set' && e.port === port).pop() as { value?: unknown } | undefined;
  return written ? written.value : d.params[port];
};
const emptyTag = (d: Divergence) => {
  if (d.difference.threw === undefined) return false;
  // a placing's Tag throws at the placing, before any step: the param is the Tag then
  const v = heldAt(d, 'as');
  if (v === undefined) return false;
  const falsyNum = typeof v === 'object' && v !== null && ['NaN', '-0'].includes(String((v as { $num?: unknown }).$num));
  return v === '' || v === null || v === false || v === 0 || falsyNum;
};

/**
 * NSP-016 §6 C88 (s52) — Enable Scroll on and Native platform scroll off (the setting the Scroll To actions ask for): Group.tsx wraps
 * the children in the scroller's `scroll-wrapper-internal` div, and drag-drop.ts `slots` counts the zone element's own children — one,
 * the wrapper. So a keyboard drop's index runs 0 to 1 whatever the children. The spec counts the children (the port's own words).
 * Narrow: the difference is Drop Index, with Enable Scroll truthy and Native platform scroll falsy at it.
 */
const scrollerWrapsChildren = (d: Divergence) => {
  if (d.difference.threw !== undefined) return false;
  const at = (e: TraceEvent | undefined) => !!e && e.t === 'value' && e.port === 'dropIndex';
  if (!at(d.reference[d.difference.index]) && !at(d.actual[d.difference.index])) return false;
  return !!heldAt(d, 'scrollEnabled') && !heldAt(d, 'nativeScroll');
};

/**
 * NSP-016 §6 C89 (s52) — Native platform scroll holding a truthy value that is not `true` (a wired 1, "false"): Group.tsx `render`
 * reads it as native (`!props.nativeScroll`, no wrapper) and `componentDidMount` as not native (`!== true`), so the JavaScript scroller
 * runs on the unwrapped children: Scroll To Index looks for the child inside the first child and fails, and the scroller takes the
 * click (with Block Pointer Events, Click never fires). The spec reads it as native, as the render does. Narrow: Enable Scroll and such
 * a Native platform scroll held at some point before the difference (the scroller started at the mount outlives the value).
 */
const nativeScrollNotBoolean = (d: Divergence) => {
  if (d.difference.threw !== undefined) return false;
  // s52's 10,000: the scroller on unwrapped children reaches further than the scroll and the click (a tap after a carry: Focused)
  const odd = (v: unknown) => !!v && v !== true && !(typeof v === 'object' && v !== null && ['NaN', '-0'].includes(String((v as { $num?: unknown }).$num)));
  return everHeld(d, 'nativeScroll', odd) && everHeld(d, 'scrollEnabled', (v) => !!v);
};

/**
 * NSP-016 §6 C90 (s52) — the JavaScript scroller (Enable Scroll on, Native platform scroll not `true`) and Block Pointer Events
 * together: a click on the Group or a child fires no Click (the focus walk still hears it). Either alone keeps Click. Narrow: the
 * difference is at Click, with all three held at it.
 */
const scrollerBlocksClick = (d: Divergence) => {
  if (d.difference.threw !== undefined) return false;
  const at = (e: TraceEvent | undefined) => !!e && e.t === 'signal' && e.port === 'onClick';
  if (!at(d.reference[d.difference.index]) && !at(d.actual[d.difference.index])) return false;
  return !!heldAt(d, 'blockTouch') && !!heldAt(d, 'scrollEnabled') && heldAt(d, 'nativeScroll') !== true;
};

/**
 * NSP-016 §6 C91 (s53) — a Shape (`Circle`) takes no children, so a card dropped on it lands at 0. With Shape Custom SVG, Circle.tsx
 * draws the markup inside a `<span>`, and drag-drop.ts `slots` counts the zone element's HTML children (an `<svg>` is not one, a
 * `<span>` is): a card picked up from the keyboard starts after it, at 1, and the arrow keys move it between 0 and 1. Narrow: the
 * difference is Drop Index, with Shape Custom SVG held at it.
 */
const svgShapeIsASlot = (d: Divergence) => {
  if (d.difference.threw !== undefined) return false;
  const at = (e: TraceEvent | undefined) => !!e && e.t === 'value' && e.port === 'dropIndex';
  if (!at(d.reference[d.difference.index]) && !at(d.actual[d.difference.index])) return false;
  return heldAt(d, 'shape') === 'svg';
};

/**
 * NSP-016 s53 — values the generator does not draw on the runtime target (runner `withheld`), because the target cannot survive
 * them: a known row that takes the whole process down cannot be played, so it cannot be counted either. Printed in every report.
 */
/**
 * NSP-016 §6 C94 (s53) — Source Set holds `true` (a boolean is no `srcset`: the spec fetches nothing), but React 19.0 creates the
 * `<img>` with `srcset="true"` (an update to `true` removes it), so the runtime's browser fetches and the node reports a load or
 * a failure. Narrow: the RUNTIME reports Error, On Error or On Load where the spec has something else, with no source and Source
 * Set `true` held at the difference.
 */
const booleanSrcSetAtMount = (d: Divergence) => {
  if (d.difference.threw !== undefined) return false;
  const fetchedOutput = (e: TraceEvent | undefined) => !!e && ((e.t === 'value' && e.port === 'imageError') || (e.t === 'signal' && (e.port === 'onError' || e.port === 'onLoad')));
  if (!fetchedOutput(d.actual[d.difference.index])) return false;
  const src = heldAt(d, 'src');
  return heldAt(d, 'srcSet') === true && (src === undefined || src === null || src === '');
};

const WITHHELD: Record<string, Readonly<Record<string, Withheld>>> = {
  // C92 — Circle.tsx builds a Polygon or Star of `Math.round(Points)` vertices: 1e9, 2^53 or Infinity runs the heap out (measured)
  Circle: { points: { values: [1e9, 2 ** 53, Infinity], row: 'NSP-016 §6 C92 — a Polygon or Star with a huge or infinite Points builds that many vertices and the page runs out of memory' } }
};

const KNOWN_ROWS: Record<string, KnownRow[]> = {
  // s43 — the Text: a text style (C61) and the Placement and units-typed style setters; s44 — C79 (R11: the spec says the intent)
  Text: [
    { row: 'NSP-016 §6 C79 — at Opacity 0 after a Pointer Events write the element takes the pointer', matches: invisibleTakesPointer },
    { row: 'NSP-016 §6 C82 — Accepted file types not text: the drop handler throws, so the drop gives no File and no signal', matches: nonTextFileTypes },
    // s51 — the zone side's two: the drag controller reads Accept Kind and Zone Name as text and throws on anything else
    { row: 'NSP-016 §6 C84 — Accept Kind not text: the drag controller throws where it reads the kinds, so a drag that meets the zone dies there', matches: nonTextAcceptKind },
    { row: 'NSP-016 §6 C85 — Zone Name not text: a drop on the zone throws after Dropped, so the drag never ends', matches: nonTextZoneName }
  ],
  // s53 — the Shape: the Text's rows (the same shared ports and drag module), and Custom SVG's span
  Circle: [
    { row: 'NSP-016 §6 C79 — at Opacity 0 after a Pointer Events write the element takes the pointer', matches: invisibleTakesPointer },
    { row: 'NSP-016 §6 C82 — Accepted file types not text: the drop handler throws, so the drop gives no File and no signal', matches: nonTextFileTypes },
    { row: 'NSP-016 §6 C84 — Accept Kind not text: the drag controller throws where it reads the kinds, so a drag that meets the zone dies there', matches: nonTextAcceptKind },
    { row: 'NSP-016 §6 C85 — Zone Name not text: a drop on the zone throws after Dropped, so the drag never ends', matches: nonTextZoneName },
    { row: 'NSP-016 §6 C91 — Shape Custom SVG: the span holding the drawing counts as a child, so a keyboard drop lands at 1', matches: svgShapeIsASlot }
  ],
  // s53 — the Image: the Text's rows (the same shared ports and drag module)
  Image: [
    { row: 'NSP-016 §6 C79 — at Opacity 0 after a Pointer Events write the element takes the pointer', matches: invisibleTakesPointer },
    { row: 'NSP-016 §6 C82 — Accepted file types not text: the drop handler throws, so the drop gives no File and no signal', matches: nonTextFileTypes },
    { row: 'NSP-016 §6 C84 — Accept Kind not text: the drag controller throws where it reads the kinds, so a drag that meets the zone dies there', matches: nonTextAcceptKind },
    { row: 'NSP-016 §6 C85 — Zone Name not text: a drop on the zone throws after Dropped, so the drag never ends', matches: nonTextZoneName },
    { row: 'NSP-016 §6 C94 — Source Set true as the element is made: React writes srcset="true", so the browser fetches a picture called true', matches: booleanSrcSetAtMount }
  ],
  // s52 — the Group: the Text's rows (the same shared ports and drag module), and its own Tag
  Group: [
    { row: 'NSP-016 §6 C79 — at Opacity 0 after a Pointer Events write the element takes the pointer', matches: invisibleTakesPointer },
    { row: 'NSP-016 §6 C82 — Accepted file types not text: the drop handler throws, so the drop gives no File and no signal', matches: nonTextFileTypes },
    { row: 'NSP-016 §6 C84 — Accept Kind not text: the drag controller throws where it reads the kinds, so a drag that meets the zone dies there', matches: nonTextAcceptKind },
    { row: 'NSP-016 §6 C85 — Zone Name not text: a drop on the zone throws after Dropped, so the drag never ends', matches: nonTextZoneName },
    { row: 'NSP-016 §6 C87 — a Tag written empty, null, 0 or false: React throws drawing the element', matches: emptyTag },
    { row: 'NSP-016 §6 C88 — Enable Scroll on and Native platform scroll off: the scroller wraps the children, so Drop Index counts the wrapper (0 or 1)', matches: scrollerWrapsChildren },
    { row: 'NSP-016 §6 C89 — Native platform scroll truthy but not true: the scroller runs on unwrapped children (Scroll To Index fails, the click is taken)', matches: nativeScrollNotBoolean },
    { row: 'NSP-016 §6 C90 — the JavaScript scroller and Block Pointer Events together: a click fires no Click', matches: scrollerBlocksClick }
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
