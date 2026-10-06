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
/**
 * NSP-016 §6 C67 — a Check / Uncheck that reverts a person's click in the same frame does not redraw the box: `checkedChanged`
 * writes `props.checked` (FB-020) but React's last-rendered `props.checked` is the value before the click, so the component's
 * `useEffect([props.checked])` sees no change and keeps its local state — the input stays drawn as the person left it, and the
 * next click reports the opposite of what the spec reads. Narrow: an act `click`, then a `check` / `uncheck` pulse, then a
 * `click` (or a `set` of `checked` between the clicks), all before the difference, which is on `checked` or `onChange`.
 */
const clickActionClick = (d: Divergence) => {
  const ref = d.difference.reference as TraceEvent | undefined;
  const act = d.difference.actual as TraceEvent | undefined;
  const onTick = (e: TraceEvent | undefined) => !!e && ((e.t === 'value' && e.port === 'checked') || (e.t === 'signal' && e.port === 'onChange'));
  if (!onTick(ref) && !onTick(act)) return false;
  const before = d.reference.slice(0, d.difference.index);
  let stage = 0;
  for (const e of before) {
    if (stage === 0 && e.t === 'act' && e.act === 'click') stage = 1;
    else if (stage === 1 && ((e.t === 'in' && (e.port === 'check' || e.port === 'uncheck')) || (e.t === 'set' && e.port === 'checked'))) stage = 2;
    else if (stage === 2 && e.t === 'act' && e.act === 'click') stage = 3;
  }
  return stage === 3;
};

/**
 * NSP-016 §6 C71 — a Value written back to the very value React last rendered, after a person's pick, does not move the
 * selection: the component's effect keys on `props.value` (Select.tsx :44-47), which that write did not change, so the
 * `<select>` keeps the pick; the output says the author's Value, the screen the pick, and picking it again raises nothing.
 * Narrow: an act `choose` of V, a `set` of `value` after it, then a `choose` of V again — all before the difference, which
 * is on `value` or `onChange` (the reference has them, the runtime has nothing).
 */
const pickWriteBackPick = (d: Divergence) => {
  const ref = d.difference.reference as TraceEvent | undefined;
  const act = d.difference.actual as TraceEvent | undefined;
  const onPick = (e: TraceEvent | undefined) => !!e && ((e.t === 'value' && e.port === 'value') || (e.t === 'signal' && e.port === 'onChange'));
  if (!onPick(ref) && !onPick(act)) return false;
  const before = d.reference.slice(0, d.difference.index);
  let stage = 0;
  let picked: unknown;
  for (const e of before) {
    if (e.t === 'act' && e.act === 'choose') {
      if (stage === 2 && 'value' in e && e.value === picked) stage = 3;
      else if (stage < 2) { stage = 1; picked = 'value' in e ? e.value : undefined; }
    } else if (stage === 1 && e.t === 'set' && e.port === 'value') stage = 2;
  }
  return stage === 3;
};

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
 * NSP-023 (R12, ruled 2026-10-05) — the Text Input v2 states the intent; what the runtime does instead only because of how React
 * draws is these known rows. Shared shape: a frame (the steps since the last settle) and the group of events that settle prints.
 */
const isStep = (e: TraceEvent) => e.t === 'set' || e.t === 'in' || e.t === 'act' || e.t === 'settle' || e.t === 'advance';
const portOf = (e: TraceEvent) => (e as { port?: string }).port;
const valueOf = (e: TraceEvent) => (e as { value?: unknown }).value;
/** The frame the difference is printed for: [first step of the frame, the settle that closed it], or undefined when the difference is not in a settle's group. */
function settledFrame(t: readonly TraceEvent[], index: number): [number, number] | undefined {
  let k = index - 1;
  while (k >= 0 && !isStep(t[k])) k--;
  if (k < 0 || t[k].t !== 'settle') return undefined;
  let start = k - 1;
  while (start >= 0 && t[start].t !== 'settle') start--;
  return [start + 1, k];
}
/**
 * NSP-023 step 3 (R12, R14, the remount ruling — 2026-10-05) — the Slider v2 states the intent; what the runtime does instead only
 * because its component reports the graph's Value through React's effect (Slider.tsx :88-95) is these two rows.
 */
const onSliderValue = (e: TraceEvent | undefined) => !!e && e.t === 'value' && (portOf(e) === 'value' || portOf(e) === 'valuePercent');
const isChanged = (e: TraceEvent | undefined) => !!e && e.t === 'signal' && portOf(e) === 'onChange';
/**
 * NSP-016 §6 D36 — Changed with nobody sliding: the effect calls the slide's own `updateOutputValue`, so a graph Value, a Min or Max
 * that clamps it, and the mount announce it; and a remount takes the author's Value back (a fresh `useState(props.value)`) and
 * reports it. Narrow: the RUNTIME fires a Changed where the spec does not; or, in the settle group of a frame whose reference prints
 * Did Mount after an earlier Will Unmount, the runtime reports Value, Value Percent or Changed where the spec has something else.
 */
const changedWithNobodySliding = (d: Divergence) => {
  const ref = d.difference.reference;
  const act = d.difference.actual;
  // s46 (the 10,000 at 20731) — the runtime's Changed IS the difference even when a setter throws later in the sequence (C63)
  if (isChanged(act) && !isChanged(ref)) return true;
  if (d.difference.threw !== undefined) return false;
  if (!(onSliderValue(act) || isChanged(act))) return false;
  const f = settledFrame(d.reference, d.difference.index);
  if (!f) return false;
  let group = f[1] + 1;
  let remount = false;
  for (; group < d.reference.length && !isStep(d.reference[group]); group++) if (d.reference[group].t === 'signal' && portOf(d.reference[group]) === 'didMount') remount = true;
  return remount && d.reference.slice(0, f[0]).some((e) => e.t === 'signal' && portOf(e) === 'willUnmount');
};
/**
 * NSP-016 §6 C73 — the runtime drops a graph Value the spec draws: `_setInputValue` (slider.ts :265) drops a value equal to the last
 * the author wrote, which after a person's slide is not where the handle is; and the effect (`[props.value]`, `Object.is`) drops a
 * second NaN the setter kept. Narrow: the SPEC reports Value or Value Percent in the settle group of a frame holding a Value write,
 * where the runtime does not, after a person's slide, with the author's Value NaN, or as Value Percent alone (a word equal to the
 * handle that recomputes a falsy percent).
 */
const graphValueDropped = (d: Divergence) => {
  const ref = d.difference.reference;
  const act = d.difference.actual;
  // s46 (the 10,000 at 20731) — the runtime may print the same output with the value it kept (a Value Percent of 0 where the drawing made -0)
  if (d.difference.threw !== undefined || !onSliderValue(ref) || (onSliderValue(act) && portOf(act!) !== portOf(ref!))) return false;
  const f = settledFrame(d.reference, d.difference.index);
  if (!f || !d.reference.slice(f[0], f[1]).some((e) => e.t === 'set' && portOf(e) === 'value')) return false;
  const slid = d.reference.slice(0, f[1]).some((e) => e.t === 'act' && (e as { act?: string }).act === 'slide');
  const v = valueOf(d.difference.reference!);
  const nan = typeof v === 'object' && v !== null && (v as { $num?: unknown }).$num === 'NaN';
  // s46 (seed 20730) — a dropped write equal to the handle shows only as Value Percent: drawing it recomputes a falsy percent
  // against a Min or Max moved since (slider.ts :51-53)
  const percentAlone = portOf(d.difference.reference!) === 'valuePercent';
  return slid || nan || percentAlone;
};

/**
 * NSP-023 step 4 (R14, 2026-10-05) — NSP-016 §6 D34: Changed with nobody picking. The Dropdown's component keeps its own copy of the
 * choice (`useState(props.value)`, Select.tsx :42) and an effect keyed on `[props.value, props.items]` (:44-47) that ends in
 * `valueChanged(props.value)`: at a remount, and at the paint after Items was written, a node holding a person's pick takes the
 * author's Value back, sends it and fires Changed. Narrow: the RUNTIME prints Value or Changed where the spec prints something else,
 * after a person's pick, in the settle group of a frame that holds an Items write or whose reference prints Did Mount after an earlier
 * Will Unmount.
 */
const changedWithNobodyPicking = (d: Divergence) => {
  const act = d.difference.actual;
  if (!(isChanged(act) || (!!act && act.t === 'value' && portOf(act) === 'value'))) return false;
  const f = settledFrame(d.reference, d.difference.index);
  if (!f) return false;
  const pickAt = d.reference.findIndex((e) => e.t === 'act' && (e as { act?: string }).act === 'choose');
  if (pickAt < 0 || pickAt >= f[1]) return false;
  // s47 (the 10,000 at 20732): a pick EARLIER IN THE FRAME than the Items write counts too — the frame's end paints the new list
  if (d.reference.slice(Math.max(f[0], pickAt), f[1]).some((e) => e.t === 'set' && portOf(e) === 'items')) return true;
  if (pickAt >= f[0]) return false;
  let remount = false;
  for (let g = f[1] + 1; g < d.reference.length && !isStep(d.reference[g]); g++) if (d.reference[g].t === 'signal' && portOf(d.reference[g]) === 'didMount') remount = true;
  return remount && d.reference.slice(0, f[0]).some((e) => e.t === 'signal' && portOf(e) === 'willUnmount');
};

/**
 * NSP-023 step 5 (2026-10-06, "Show what Value says") — NSP-016 §6 C76: the Radio Button Group's component keeps a copy of the
 * selection and follows the node through an effect keyed on the Value its last PAINT rendered (RadioButtonGroup.tsx :21, :37-39);
 * a Value written back to that one in the frame of a pick is no change to it, and the picked button stays selected: picking it
 * again raises nothing. Narrow: the SPEC reports Value or Changed where the runtime does not, after a frame in which a pick was
 * followed by a Value write.
 */
const groupPickWrittenBack = (d: Divergence) => {
  const ref = d.difference.reference;
  if (d.difference.threw !== undefined || !ref || !((ref.t === 'value' && portOf(ref) === 'value') || isChanged(ref))) return false;
  let pickInFrame = false;
  for (let k = 0; k < d.difference.index; k++) {
    const e = d.reference[k] as TraceEvent & { act?: string };
    if (e.t === 'settle') pickInFrame = false;
    else if (e.t === 'act' && e.act === 'pick') pickInFrame = true;
    else if (pickInFrame && e.t === 'set' && portOf(e) === 'value') return true;
  }
  return false;
};

/**
 * NSP-023 step 5 (2026-10-06, "Fire from the click") — NSP-016 §6 D37: the Radio Button's component fires Changed from an effect
 * (RadioButton.tsx :78-84 → radiobutton.ts :39-55) whenever its Checked moves while the group's last selection was a person's — a
 * sibling carrying the same Value picked, its own Value written in the frame of a pick, a remount. Narrow: the RUNTIME fires a
 * Changed where the spec prints something else.
 */
const changedWithNobodyClicking = (d: Divergence) => isChanged(d.difference.actual) && !isChanged(d.difference.reference);
/**
 * NSP-016 §6 C76 seen from a button: the group's component keeps a copy of the selection (RadioButtonGroup.tsx :21, :37-39), and the
 * buttons read the copy; the group's Value written back in the frame of a pick (a world write, delivered at an `advance`) leaves the
 * copy on the pick. Narrow: Checked or Changed differ, after a frame in which a pick or a click was followed by an advance.
 */
const buttonPickWrittenBack = (d: Divergence) => {
  const on = (e: TraceEvent | undefined) => !!e && ((e.t === 'value' && portOf(e) === 'checked') || isChanged(e));
  if (d.difference.threw !== undefined || !(on(d.difference.reference) || on(d.difference.actual))) return false;
  let pickInFrame = false;
  for (let k = 0; k < d.difference.index; k++) {
    const e = d.reference[k] as TraceEvent & { act?: string };
    if (e.t === 'settle') pickInFrame = false;
    else if (e.t === 'act' && (e.act === 'pick' || e.act === 'click')) pickInFrame = true;
    else if (pickInFrame && e.t === 'advance') return true;
  }
  return false;
};

const KNOWN_ROWS: Record<string, KnownRow[]> = {
  // s39 — the Dropdown: C65's third instance (Select.tsx :245 renders `{props.label}` raw), and two of its own
  'net.noodl.controls.options': [
    { row: "NSP-016 §6 C71 — a Value written back to the value React last rendered, after a pick, leaves the pick selected: picking it again raises nothing", matches: pickWriteBackPick },
    // NSP-023 step 4 (v3) — the spec keeps the pick; what React's effect makes the runtime do instead
    { row: "NSP-016 §6 D34 — Changed fires with nobody picking: a remount, or Items written again, after a pick takes the author's Value back", matches: changedWithNobodyPicking }
  ],
  // s41 — the Slider: no label and no text style, so two of the three throwing setters (the Placement and units-typed style inputs)
  'net.noodl.controls.range': [
    { row: 'NSP-016 §6 D36 — Changed fires with nobody sliding (a graph Value, a clamping Min or Max, the mount), and a remount takes the author\'s Value back', matches: changedWithNobodySliding },
    { row: 'NSP-016 §6 C73 — a graph Value equal to the last the author wrote, after a slide, or a second NaN, is dropped: the handle stays', matches: graphValueDropped }
  ],
  // s42 — the Radio Button: the Checkbox's label, so the Checkbox's C65 and C66 beside the three setters
  'net.noodl.controls.radiobutton': [
    // NSP-023 step 5 (v2) — what React's drawing makes the runtime do instead of what the spec says
    { row: 'NSP-016 §6 C76 — the group\'s Value written back in the frame of a pick leaves the group\'s copy of the selection on the pick: the buttons show the pick', matches: buttonPickWrittenBack },
    { row: 'NSP-016 §6 D37 — Changed fires with nobody clicking this button: a sibling carrying its Value picked, its Value written in a pick\'s frame, a remount', matches: changedWithNobodyClicking }
  ],
  // s42 — the Radio Button Group: no text style either — the Placement and units-typed style setters
  'Radio Button Group': [
    // NSP-023 step 5 (v2) — the buttons show what the Value says; what the component's copy of the selection makes the runtime do instead
    { row: 'NSP-016 §6 C76 — a Value written back in the frame of a pick leaves the picked button selected: picking it again raises nothing', matches: groupPickWrittenBack }
  ],
  // s43 — the Text: a text style (C61) and the Placement and units-typed style setters; s44 — C79 (R11: the spec says the intent)
  Text: [
    { row: 'NSP-016 §6 C79 — at Opacity 0 after a Pointer Events write the element takes the pointer', matches: invisibleTakesPointer },
    { row: 'NSP-016 §6 C82 — Accepted file types not text: the drop handler throws, so the drop gives no File and no signal', matches: nonTextFileTypes },
    // s51 — the zone side's two: the drag controller reads Accept Kind and Zone Name as text and throws on anything else
    { row: 'NSP-016 §6 C84 — Accept Kind not text: the drag controller throws where it reads the kinds, so a drag that meets the zone dies there', matches: nonTextAcceptKind },
    { row: 'NSP-016 §6 C85 — Zone Name not text: a drop on the zone throws after Dropped, so the drag never ends', matches: nonTextZoneName }
  ],
  'net.noodl.controls.checkbox': [
    { row: 'NSP-016 §6 C67 — a Check / Uncheck or a Checked write reverting a click in the same frame leaves the box drawn as the click left it; the next click reports the opposite', matches: clickActionClick },
  ]
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
      const report = await runConformance(spec, batchTarget(), { sequences: 200, seed: daySeed, mutants: true, known: KNOWN_ROWS[spec.type] ?? [], equivalent: EQUIVALENT_MUTANTS[spec.type] });
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
