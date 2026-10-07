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

import { Counter, EQUIVALENT_MUTANTS, specs, runConformance, formatReport, poolFor } from '../../../nodegx-node-spec/src';
import type { Divergence, KnownRow, Report, Withheld } from '../../../nodegx-node-spec/src';
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
 * NSP-016 §6 C96–C100 (s54) — the Video. Each throw is narrowed by the message the runtime throws with and the input that leads to it:
 *   - C96: Source Object on an embed — `setSourceObject` reads `this.video.srcObject`, and an embed has no `<video>` (`reading 'srcObject'`);
 *   - C97: Play or Restart on an embed once the component has seen a `<video>` load — `startPlayback` calls `this.video.play()` (`reading 'play'`);
 *   - C98: a Volume outside 0 to 1, or not a number — `componentDidUpdate` writes it to the element, whose setter throws (IndexSizeError, or a
 *     TypeError for a value that is not a finite number); withheld below, so a generated play is not cut short by it;
 *   - C99: a Source Object that is not a stream — the browser's setter refuses it (TypeError); withheld below too;
 *   - C100: on a `<video>` the pointer outputs and the file drop never fire (`CachedVideo` is handed no `pointer` prop). Narrow: the first
 *     difference is such an output on the REFERENCE's side, and the Source last held names a file, not an embed.
 */
const threwWith = (d: Divergence, text: string) => d.difference.threw !== undefined && d.difference.threw.includes(text);
const sourceObjectOnEmbed = (d: Divergence) => threwWith(d, "reading 'srcObject'") && (d.params.srcObject !== undefined || 'srcObject' in d.params || d.reference.some((e) => e.t === 'set' && e.port === 'srcObject'));
const playOnEmbed = (d: Divergence) => threwWith(d, "reading 'play'");
const volumeOutOfRange = (d: Divergence) => threwWith(d, 'The index is not in the allowed range') || threwWith(d, "Failed to set the 'volume' property");
const sourceObjectNotAStream = (d: Divergence) => threwWith(d, "Failed to set the 'srcObject' property");
const EMBED = [/youtu\.be\/[A-Za-z0-9_-]{6,}/i, /(?:youtube\.com|youtube-nocookie\.com)\/(?:watch\?(?:[^#]*&)?v=|embed\/|v\/|shorts\/)[A-Za-z0-9_-]{6,}/i, /vimeo\.com\/(?:video\/|channels\/[^/]+\/)?\d+/i];
const videoFileTakesNoPointer = (d: Divergence) => {
  if (d.difference.threw !== undefined) return false;
  const r = d.reference[d.difference.index];
  if (!r) return false;
  const missing = r.t === 'signal' ? POINTER_OUTPUTS.includes(r.port) : r.t === 'value' && (FILE_DROP_VALUES.includes(r.port) || r.port === 'isDragOver');
  if (!missing) return false;
  // the Source the person acted on: held at the last act before the difference — a frame reports its outputs after all its steps,
  // so a Source switched to an embed after the act, in the same frame, is not the element the act landed on (s54's 10,000)
  const lastAct = d.reference.slice(0, d.difference.index).map((e) => e.t).lastIndexOf('act');
  const written = d.reference.slice(0, Math.max(lastAct, 0)).filter((e) => e.t === 'set' && e.port === 'src').pop() as { value?: unknown } | undefined;
  const src = lastAct >= 0 ? (written ? written.value : d.params.src) : heldAt(d, 'src');
  return !(typeof src === 'string' && EMBED.some((p) => p.test(src)));
};
/**
 * NSP-016 §6 C102 (s55) — a Drag reports the pointer's movement on an axis Axis locks: Drag X / Y or Delta X / Y differ on that axis.
 * The Axis is the one held at the person's last act before the difference (written before it in its frame is painted before it).
 * Either side's event may be the locked axis's: a frame's values are sorted, so the reference's next one can be the other axis.
 */
const DRAG_AXIS_PORTS: Record<string, 'x' | 'y'> = { positionX: 'x', deltaX: 'x', positionY: 'y', deltaY: 'y' };
const dragLockedAxisReported = (d: Divergence) => {
  if (d.difference.threw !== undefined) return false;
  const lastAct = d.reference.slice(0, d.difference.index).map((e) => e.t).lastIndexOf('act');
  if (lastAct < 0) return false;
  const written = d.reference.slice(0, lastAct).filter((e) => e.t === 'set' && e.port === 'axis').pop() as { value?: unknown } | undefined;
  const axis = written ? written.value : 'axis' in d.params ? d.params.axis : 'x';
  const locked = (e: { t: string; port?: string } | undefined) => !!e && e.t === 'value' && !!DRAG_AXIS_PORTS[e.port!] && axis !== DRAG_AXIS_PORTS[e.port!] && axis !== 'both';
  return locked(d.reference[d.difference.index]) || locked(d.actual[d.difference.index]);
};
/** NSP-016 §6 C105 (s55) — a Snap Do that waited for the Drag to mount runs from 0: Drag X / Y differ after a Do sent while it was off the page. */
const dragWaitedSnapFromZero = (d: Divergence) => {
  if (d.difference.threw !== undefined) return false;
  const at = [d.reference[d.difference.index], d.actual[d.difference.index]];
  if (!at.some((e) => e && e.t === 'value' && (e.port === 'positionX' || e.port === 'positionY'))) return false;
  let wanted = 'mounted' in d.params ? !!d.params.mounted : true;
  for (const e of d.reference.slice(0, d.difference.index)) {
    if (e.t === 'set' && e.port === 'mounted') wanted = !!(e as { value?: unknown }).value;
    if (e.t === 'in' && (e.port === 'snapToPositionX.do' || e.port === 'snapToPositionY.do') && !wanted) return true;
  }
  return false;
};
/** C98 / C99 — every value of the port's pool the browser's setter refuses */
const refusedVolume = poolFor(specs['Video'].inputs.volume).filter((v) => typeof v !== 'number' ? !(Number(v) >= 0 && Number(v) <= 1) : !(v >= 0 && v <= 1));
const refusedSourceObject = poolFor(specs['Video'].inputs.srcObject).filter((v) => v !== null && v !== undefined);

/** C106 (s55) — a Start Drag X / Y of NaN: `componentDidUpdate` compares it with itself (`NaN !== NaN`) and sets state at every update, until React gives up */
const nanStart = (port: string) => poolFor(specs['Drag'].inputs[port as 'inputPositionX']).filter((v) => typeof v === 'number' && Number.isNaN(v));

const WITHHELD: Record<string, Readonly<Record<string, Withheld>>> = {
  Drag: {
    inputPositionX: { values: nanStart('inputPositionX'), row: 'NSP-016 §6 C106 — a Start Drag X or Y of NaN loops the Drag\'s update until React throws' },
    inputPositionY: { values: nanStart('inputPositionY'), row: 'NSP-016 §6 C106 — a Start Drag X or Y of NaN loops the Drag\'s update until React throws' }
  },
  // C92 (a Shape's Points of 1e9, 2^53 or Infinity ran the heap out) was fixed in P109 ISL-038 — Circle.tsx caps it at 500
  Video: {
    volume: { values: refusedVolume, row: 'NSP-016 §6 C98 — a Volume outside 0 to 1 throws while React draws the Video' },
    srcObject: { values: refusedSourceObject, row: 'NSP-016 §6 C99 — a Source Object that is not a stream: the browser refuses it and the node throws' }
  }
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
  // s54 — the Video's own rows (C96–C100). Not C79: on a video file no pointer act reaches the node at all while C100 stands, so an
  // invisible one cannot take it either — the five C79 scenarios agree with the runtime for that reason, and diverge again once C100
  // is fixed (measured with C100 fixed in memory): the fix carries C79's row back here and onto those five
  Video: [
    { row: 'NSP-016 §6 C96 — Source Object on an embed: the runtime throws (no `<video>`)', matches: sourceObjectOnEmbed },
    { row: 'NSP-016 §6 C97 — Play or Restart on an embed after a `<video>` loaded: the runtime throws', matches: playOnEmbed },
    { row: 'NSP-016 §6 C98 — a Volume outside 0 to 1 throws while React draws the Video', matches: volumeOutOfRange },
    { row: 'NSP-016 §6 C99 — a Source Object that is not a stream: the browser refuses it and the node throws', matches: sourceObjectNotAStream },
    { row: 'NSP-016 §6 C100 — a Video playing a file fires no pointer output and takes no file drop', matches: videoFileTakesNoPointer }
  ],
  // s55 — the Drag's own rows: C102 (a locked axis reports the pointer's movement), C105 (a snap that waited runs from 0), C106 (a NaN start loops)
  Drag: [
    { row: 'NSP-016 §6 C102 — a Drag locked to one Axis reports the pointer\'s movement on the other', matches: dragLockedAxisReported },
    { row: 'NSP-016 §6 C105 — a Snap Do that waited for the Drag to mount runs from 0', matches: dragWaitedSnapFromZero },
    { row: 'NSP-016 §6 C106 — a Start Drag X or Y of NaN loops the Drag\'s update until React throws', matches: (d: Divergence) => threwWith(d, 'Maximum update depth exceeded') }
  ],
  // s52 — the Group: the Text's rows (the same shared ports and drag module); its own C86–C90 and C95 fixed in P109 ISL-038 (s29)
  Group: [
    { row: 'NSP-016 §6 C79 — at Opacity 0 after a Pointer Events write the element takes the pointer', matches: invisibleTakesPointer }
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
