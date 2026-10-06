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
  // s25: a registry array's canonical form (`{ "$array": name, items }`, a `$array` step) is an array, not a plain object
  const isRegistryArray = (v: unknown) => typeof (v as { $array?: unknown }).$array === 'string';
  const bad = d.reference.findIndex((e) => isSet(e, 'items', (v, present) => present && v !== null && typeof v !== 'string' && !Array.isArray(v) && typeof v === 'object' && !isRegistryArray(v) ? true : present && (typeof v === 'number' || typeof v === 'boolean')));
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
 * NSP-011 §6 C6 is node.ts's, not a node's: `setInputValue` merges a later value into a `{ value, unit }`
 * the port once held, on EVERY port of EVERY node. The per-node entries below each carry a hand scenario
 * and must keep firing; this one is the same narrow predicate on any port, counted for every spec, so a
 * daily rotation that first draws C6 on a port nobody listed (s12: Object, Variable, HTTP's Headers — one
 * a day for three of seven seeds) reads as the known row, not as a red run. Never asserted to fire.
 */
const C6_ANY_PORT: KnownRow = { row: 'NSP-011 §6 C6 (any port — node.ts) — a later value merged into a unit object the port once held (R7)', matches: unitMergeOnAny(() => true) };

/**
 * NSP-015 §6.2 C24 / C25 — Navigate To Path's frame-end callback THROWS (the scheduler logs it,
 * nodecontext.ts :466-472) and the frame's presses are never answered. Narrow: the first difference
 * is the spec's own answer for that case (Error's message or the outcome's code), and for C24 the
 * last Path written before it is defined and not text.
 */
const navigateToPathAnswer = (message: string, code: string) => (e: TraceEvent | undefined) =>
  !!e && ((e.t === 'value' && e.port === 'error' && e.value === message) || (e.t === 'outcome' && e.port === 'navigate' && e.value === 'failure' && e.error === code));
const nonTextPath = (d: Divergence) => {
  if (!navigateToPathAnswer('No path to navigate to', 'navigate-to-path/no-path')(d.difference.reference)) return false;
  const sets = d.reference.slice(0, d.difference.index).filter((e) => e.t === 'set' && e.port === 'path');
  const last = sets[sets.length - 1] as { value?: unknown } | undefined;
  return !!last && last.value !== undefined && typeof last.value !== 'string';
};
const refusedPush = (d: Divergence) => navigateToPathAnswer('The browser refused to navigate to this path', 'navigate-to-path/refused')(d.difference.reference);

/**
 * NSP-014 §6.5 C36 — Delete Record's success reads the record binding LIVE (deletedbmodelpropertiesnode.ts :70,
 * `internal.model.notify('delete')`): a binding cleared while the delete is out throws there, and the REST adapter hands
 * the throw to `error` (RestDataAdapter.ts :531) — Error is V8's TypeError text, every press Failure, the record deleted.
 * Narrow: the runtime's trace carries that text on Error at or before the first difference — or, when a later failure in
 * the same frame overwrote the text before the settle recorded it, the difference is the spec's Done against the family's
 * Failure, after a press and then a write that clears the binding (Id Source → From repeater, an empty Id).
 */
const notifyOnCleared = (d: Divergence) => {
  if (d.actual.slice(0, d.difference.index + 1).some((e) => e.t === 'value' && e.port === 'error' && /\(reading 'notify'\)/.test(String((e as { value: unknown }).value)))) return true;
  const ref = d.difference.reference;
  const act = d.difference.actual;
  if (!ref || !act || ref.t !== 'outcome' || ref.value !== 'done' || act.t !== 'outcome' || act.value !== 'failure' || act.error !== 'record/storage-op-failed') return false;
  const before = d.reference.slice(0, d.difference.index);
  const press = before.findIndex((e) => e.t === 'in' && e.port === 'store');
  return press >= 0 && before.slice(press).some((e) => isSet(e, 'idSource', (v) => v === 'foreach') || isSet(e, 'modelId', (v, present) => !present || v === null || v === ''));
};

/**
 * NSP-014 §6.14 C43 — Filter Records sorts OUTSIDE its filter's `try` (filterdbmodelsnode.ts :491): a Sorting over two
 * or more rows that are not records throws `a.get is not a function` out of the scheduled run, the press's token already
 * drained — nothing on Error, no Failure, no outcome. The spec reports it as the filter's failure. Narrow: the first
 * differing reference event is that failure — its Error value carrying the comparator's own message, or (the message
 * already on Error) its failure outcome or plain Failure pulse with that message the last one on Error.
 */
const SORT_CANNOT_COMPARE = /^The filter could not be applied: [ab]\.get is not a function$/;
const sortCannotCompare = (d: Divergence) => {
  const ref = d.difference.reference;
  if (!ref) return false;
  const errorText = (e: TraceEvent) => (e.t === 'value' && e.port === 'error' ? String((e as { value?: unknown }).value) : undefined);
  if (errorText(ref) !== undefined) return SORT_CANNOT_COMPARE.test(errorText(ref)!);
  const failing = (ref.t === 'outcome' && ref.value === 'failure' && ref.error === 'filter-records/filter-failed') || (ref.t === 'signal' && ref.port === 'failure');
  if (!failing) return false;
  const last = d.reference.slice(0, d.difference.index).reverse().find((e) => errorText(e) !== undefined);
  return last !== undefined && SORT_CANNOT_COMPARE.test(errorText(last)!);
};

/**
 * NSP-014 §6.14 C44 — Filter Records' store listener tests `collection === undefined` (filterdbmodelsnode.ts :157) and
 * then calls `collection.contains` (:164): with null on Items it throws inside the store's `save` event — measured s25 in
 * a graph: the WRITER's Error output carries the message and a Query Records listening after it never hears the save.
 * The spec reads a null array as holding nothing. Narrow: the runtime threw that message, with null set on Items before it.
 */
const nullContains = (d: Divergence) => /Cannot read properties of null \(reading 'contains'\)/.test(d.difference.threw ?? '') && d.reference.slice(0, d.difference.index + 1).some((e) => isSet(e, 'items', (v, present) => present && v === null));

/**
 * NSP-014 §6.41 C57 — Server-Sent Events keeps a non-text Event Types / Method (`value || ''`, `value || 'GET'`) and Connect calls
 * `.split` / `.toUpperCase` on it. Narrow: such a write is on the reference before the difference, and the runtime either threw
 * that TypeError or (a throw inside the frame end, logged by the scheduler) never made the request.
 */
const sseNonText = (d: Divergence) => {
  const bad = d.reference.findIndex((e) => e.t === 'set' && (e.port === 'eventTypes' || e.port === 'method') && 'value' in e && typeof (e as { value?: unknown }).value !== 'string' && !!(e as { value?: unknown }).value);
  if (bad < 0 || d.difference.index <= bad) return false;
  return d.difference.threw === undefined || /(split|toUpperCase) is not a function/.test(d.difference.threw);
};

/**
 * NSP-014 §6.35 C54 — Cloud Function's success reads `res.result` after checking only `res !== undefined`
 * (cloudfunction2.ts :292, :301): a 200 / 201 whose body is JSON `null` throws inside the XHR's `readystatechange` —
 * nothing is sent and the call's presses are never answered. The spec reads it as no result: Done. Narrow: the world
 * answers some request with a success whose body is `null`, and the first difference is the spec's Done on Call.
 */
const nullSuccessBody = (d: Divergence) => {
  const ref = d.difference.reference;
  if (!ref || ref.t !== 'outcome' || ref.port !== 'call' || ref.value !== 'done') return false;
  return (d.world?.network ?? []).some((r) => {
    const a = r.answer as { status?: number; body?: unknown };
    return (a.status === 200 || a.status === 201) && (a.body === null || a.body === 'null');
  });
};

/**
 * NSP-016 §6 C65 — a Checkbox's Label wired an object or an array is rendered as it is (Checkbox.tsx :205-207) and React
 * throws at the next paint (a settle or an act). Narrow: React's own message, and a `set` of `label` to an object or an
 * array somewhere in the reference before the difference (a parameter is a set at the mount).
 */
const objectChild = (port: string) => (d: Divergence) => {
  if (d.difference.threw === undefined || !/Objects are not valid as a React child/.test(d.difference.threw)) return false;
  // a throw at the mount (index 0) leaves no trace: any parameter set qualifies; else a set before the paint that threw
  const upTo = d.difference.index === 0 ? d.reference.findIndex((e) => e.t !== 'set') : d.difference.index + 1;
  return d.reference.slice(0, upTo < 0 ? d.reference.length : upTo).some((e) => isSet(e, port, (v, present) => present && typeof v === 'object' && v !== null));
};
const objectLabel = objectChild('label');
/** s39 — C65's fourth instance: Select.tsx :182 renders `{props.placeholder}` raw while nothing is selected */
const objectPlaceholder = objectChild('placeholder');
/**
 * NSP-016 §6 C66 — a Checkbox whose Enable Label went from on to off has lost its root element (two elements, one ref
 * callback: the removed one nulls it), so a Focus action reports Unchanged with the box on the page. Narrow: the
 * difference is the Focus outcome — Unchanged on the runtime where the reference says Done — and the reference holds
 * a truthy `useLabel` (a parameter or a set) followed by a falsy one before it.
 */
const lostRootAfterLabelOff = (d: Divergence) => {
  // the frame of the difference: the runtime reports the Focus Unchanged where the reference reports Done (the value
  // and signal lines of that frame sort before the outcome, so the first difference may be one of them)
  const frameStart = (t: readonly TraceEvent[], i: number) => { let k = i; while (k > 0 && t[k - 1].t !== 'settle') k--; return k; };
  const frameEnd = (t: readonly TraceEvent[], i: number) => { let k = i; while (k < t.length && t[k].t !== 'settle') k++; return k; };
  const has = (t: readonly TraceEvent[], v: string) => t.slice(frameStart(t, d.difference.index), frameEnd(t, d.difference.index + 1)).some((e) => e.t === 'outcome' && e.port === 'focus' && e.value === v);
  // s45 (the Checkbox's 10,000 run, seed 970083277): the same lost root met by a Blur action — Done on both sides, but the keyboard stays
  // on the runtime's element, so the reference's Focused false / Blurred is the difference
  const ref = d.difference.reference as TraceEvent | undefined;
  const frame = settledFrame(d.reference, d.difference.index);
  const blurLost =
    !!ref &&
    !!frame &&
    ((ref.t === 'value' && ref.port === 'focusState' && ref.value === false) || (ref.t === 'signal' && ref.port === 'onBlur')) &&
    d.reference.slice(frame[0], frame[1]).some((e) => e.t === 'in' && e.port === 'blur');
  if (!blurLost && (!has(d.actual, 'unchanged') || !has(d.reference, 'done'))) return false;
  const before = d.reference.slice(0, d.difference.index);
  let on = false;
  let offAfterOn = false;
  for (const e of before) {
    if (e.t !== 'set' || e.port !== 'useLabel') continue;
    const v = 'value' in e ? e.value : undefined;
    if (v) on = true;
    else if (on) offAfterOn = true;
  }
  return offAfterOn;
};

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
 * NSP-016 §6 C70 — a Dropdown's Items wired a truthy value that is not a list (the legacy stored form is a string), or a list
 * holding null: Select.tsx :118 maps it (`props.items.map`) and :119 reads `.Value` of each item, and React throws at the
 * next paint. Narrow: the throw's own message, and a `set` of `items` to such a value before the paint that threw.
 */
const itemsNotAList = (d: Divergence) => {
  if (d.difference.threw === undefined || !/props\.items\.(map|findIndex) is not a function|Cannot read properties of null \(reading 'Value'\)/.test(d.difference.threw)) return false;
  const upTo = d.difference.index === 0 ? d.reference.findIndex((e) => e.t !== 'set') : d.difference.index + 1;
  const offending = (v: unknown, present: boolean) => present && ((!!v && !Array.isArray(v)) || (Array.isArray(v) && v.some((i) => i === null)));
  return d.reference.slice(0, upTo < 0 ? d.reference.length : upTo).some((e) => isSet(e, 'items', offending));
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
 * before it is the number 0, and a Pointer Events input was written before it.
 */
const POINTER_OUTPUTS = ['pointerDown', 'pointerUp', 'onClick', 'hoverStart', 'pointerEnter', 'hoverEnd'];
const isZero = (v: unknown) => v === 0 || (typeof v === 'object' && v !== null && (v as { $num?: unknown }).$num === '-0');
const invisibleTakesPointer = (d: Divergence) => {
  if (d.difference.threw !== undefined) return false;
  const a = d.actual[d.difference.index];
  if (!a || a.t !== 'signal' || !POINTER_OUTPUTS.includes(a.port)) return false;
  const before = d.reference.slice(0, d.difference.index);
  const opacity = before.filter((e) => e.t === 'set' && e.port === 'opacity').pop() as { value?: unknown } | undefined;
  if (!opacity || !isZero(opacity.value)) return false;
  return before.some((e) => e.t === 'set' && (e.port === 'pointerEventsEnabled' || e.port === 'pointerEventsMode'));
};

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
const TEXT_WRITES = ['clear', 'backspace', 'set', 'insert'];
const isTextWrite = (e: TraceEvent) => (e.t === 'in' && TEXT_WRITES.includes(portOf(e) ?? '')) || (e.t === 'set' && portOf(e) === 'startValue');
/** The difference is on the text: the Value output, Value Changed, or a write's outcome. */
const onText = (e: TraceEvent | undefined) =>
  !!e && ((e.t === 'value' && portOf(e) === 'onTextChanged') || (e.t === 'signal' && portOf(e) === 'textChanged') || (e.t === 'outcome' && TEXT_WRITES.includes(portOf(e) ?? '')));
/** The Type the reference last wrote before `index` (params arrive as sets first); `'text'` when none. */
const typeBefore = (t: readonly TraceEvent[], index: number) => {
  for (let k = index - 1; k >= 0; k--) if (t[k].t === 'set' && portOf(t[k]) === 'type') return valueOf(t[k]);
  return 'text';
};

/**
 * NSP-016 §6 C69 — TextInput.tsx :331 `edit` reads the text React last drew: an Insert Text or Backspace in a frame with another write
 * to the text works on the text before it, and React's last write wins. Narrow: a frame holding an Insert Text or Backspace and at least
 * one other write to the text (a Value, Set, Clear, Insert Text or Backspace), and the difference on the text in that frame's settle group.
 */
const staleEdit = (d: Divergence) => {
  if (d.difference.threw !== undefined || !(onText(d.difference.reference) || onText(d.difference.actual))) return false;
  const f = settledFrame(d.reference, d.difference.index);
  if (!f) return false;
  const writes = d.reference.slice(f[0], f[1]).filter(isTextWrite);
  return writes.length >= 2 && writes.some((e) => e.t === 'in' && (portOf(e) === 'insert' || portOf(e) === 'backspace'));
};

/**
 * NSP-016 §6 C72 — TextInput.tsx :94 / :346 convert with the Type, and measure an Insert Text's room with the Max length, React last
 * drew: a write in the frame a Type or Max length change arrives uses the old one. Narrow: a frame holding a Type or Max length write
 * and a write to the text, and the difference on the text in that frame's settle group.
 */
const staleProps = (d: Divergence) => {
  if (d.difference.threw !== undefined || !(onText(d.difference.reference) || onText(d.difference.actual))) return false;
  const f = settledFrame(d.reference, d.difference.index);
  if (!f) return false;
  const frame = d.reference.slice(f[0], f[1]);
  return frame.some((e) => e.t === 'set' && (portOf(e) === 'type' || portOf(e) === 'maxLength')) && frame.some(isTextWrite);
};

/**
 * NSP-016 §6 C68 — TextInput.tsx :202-204: the one-line field's own `onMouseDown` replaces the control's, so a mouse press fires no
 * Pointer Down, sets no Pressed and runs no drain. Narrow: the difference is in the settle group of a frame holding a `press` or
 * `click` act (an act's outputs print with its frame's settle) on a field that was not a Text Area at that act.
 */
const mousePressOnOneLine = (d: Divergence) => {
  if (d.difference.threw !== undefined) return false;
  const f = settledFrame(d.reference, d.difference.index);
  if (!f) return false;
  for (let k = f[0]; k < f[1]; k++) {
    const a = d.reference[k] as { t: string; act?: string };
    if (a.t === 'act' && (a.act === 'press' || a.act === 'click') && typeBefore(d.reference, k) !== 'textArea') return true;
  }
  return false;
};

/**
 * NSP-016 §6 C80 — TextInput.tsx :248-281: the field sits in a different tree with a label, so React builds a new element when Enable
 * Label changes, and the keyboard leaves with the old one, silently (row D30's silence). Narrow: the label's truthiness changed at a
 * paint (a settle or an act) while the reference's field held the keyboard (a Focused signal, or a Focus action or focusing act earlier
 * in that frame), and no Blurred or Will Unmount in the reference from that paint to the difference.
 */
const labelTakesKeyboard = (d: Divergence) => {
  if (d.difference.threw !== undefined) return false;
  // s45 (the Checkbox's 10,000 run): a Focus action or a focusing act earlier in the SAME frame holds the keyboard when the label's
  // paint comes, though its Focused prints only in the frame's settle group — so the frame's steps are read for it, in order
  const FOCUSING = new Set(['focus', 'press', 'click', 'type', 'key', 'choose']);
  // s47 (the Dropdown's 10,000 at 20732): the placing is a paint — a node placed with the label on, given a Focus before the first
  // frame and its label written off, loses the keyboard at the first paint (the Focus waits for the element the placing drew)
  let written = !!(d.params as Record<string, unknown> | undefined)?.useLabel;
  let painted = written;
  let holds = false;
  let lost = false;
  // s47 (the Radio Button's 10,000 at 20732): a settle group prints a frame's outputs after all its steps, so a Blurred there may
  // belong to a Blur signal BEFORE the label's paint — only a Blurred or Will Unmount from a LATER frame gives the keyboard up
  let frame = 0;
  let lostIn = -1;
  for (let k = 0; k < d.difference.index; k++) {
    const e = d.reference[k] as TraceEvent & { act?: string };
    if (e.t === 'set' && portOf(e) === 'useLabel') written = !!valueOf(e);
    else if (e.t === 'in' && portOf(e) === 'focus') holds = true;
    else if (e.t === 'in' && portOf(e) === 'blur') holds = false;
    else if (e.t === 'settle' || e.t === 'act') {
      if (written !== painted && holds) { lost = true; lostIn = frame; }
      painted = written;
      if (e.t === 'act' && FOCUSING.has(e.act ?? '')) holds = true;
      if (e.t === 'act' && e.act === 'blur') holds = false;
      if (e.t === 'settle') frame++;
    } else if (e.t === 'signal' && portOf(e) === 'onFocus') holds = true;
    else if (e.t === 'signal' && (portOf(e) === 'onBlur' || portOf(e) === 'willUnmount')) {
      holds = false;
      // a group's outputs belong to the frame its settle closed (frame - 1)
      if (frame - 1 > lostIn) lost = false;
    }
  }
  return lost;
};

/**
 * NSP-016 §6 D35 — a `<textarea>` React puts on the page holds its text as default content, so its cursor rests at the START, where the
 * spec rests a field's cursor at the end: an Insert Text, a typed key or an Enter goes in at the start, a Backspace finds nothing
 * before it. Narrow: the field is a Text Area, and the difference is the Value holding the same characters in another order, or a
 * Backspace the runtime answers Unchanged where the reference says Done.
 */
const textAreaRestsAtStart = (d: Divergence) => {
  if (d.difference.threw !== undefined || typeBefore(d.reference, d.difference.index) !== 'textArea') return false;
  const r = d.difference.reference;
  const a = d.difference.actual;
  if (!r || !a) return false;
  if (r.t === 'outcome' && a.t === 'outcome' && portOf(r) === 'backspace' && portOf(a) === 'backspace') return valueOf(r) === 'done' && valueOf(a) === 'unchanged';
  if (r.t !== 'value' || a.t !== 'value' || portOf(r) !== 'onTextChanged' || portOf(a) !== 'onTextChanged') return false;
  const rv = valueOf(r);
  const av = valueOf(a);
  return typeof rv === 'string' && typeof av === 'string' && rv !== av && [...rv].sort().join('') === [...av].sort().join('');
};

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
  'net.noodl.controls.textinput': [
    // s38 — C65's second instance: TextInput.tsx :274 renders `{props.label}` raw too
    { row: 'NSP-016 §6 C65 — a Label wired an object or an array: React throws rendering it at the next paint', matches: objectLabel },
    // NSP-023 (R12) — the Text Input v2 states the intent; what React's drawing makes the runtime do instead
    { row: 'NSP-016 §6 C68 — a mouse press on a one-line field fires no Pointer Down, sets no Pressed and runs no drain (its own onMouseDown replaces the control\'s)', matches: mousePressOnOneLine },
    { row: 'NSP-016 §6 C72 — a write in the frame a Type or Max length change arrives converts / measures with the old one (the props React last drew)', matches: staleProps },
    { row: 'NSP-016 §6 C69 — an Insert Text or Backspace in a frame with another write to the text works on the text React last drew', matches: staleEdit },
    { row: 'NSP-016 §6 C80 — Enable Label changed while the field holds the keyboard: React builds a new element and the keyboard leaves with the old one, silently', matches: labelTakesKeyboard },
    { row: 'NSP-016 §6 D35 — a Text Area React puts on the page rests its cursor at the start: an insert, a key or an Enter goes in before the text', matches: textAreaRestsAtStart }
  ],
  // s39 — the Dropdown: C65's third instance (Select.tsx :245 renders `{props.label}` raw), and two of its own
  'net.noodl.controls.options': [
    { row: 'NSP-016 §6 C65 — a Label wired an object or an array: React throws rendering it at the next paint', matches: objectLabel },
    { row: 'NSP-016 §6 C65 — a Placeholder wired an object or an array, with nothing selected: React throws rendering it at the next paint', matches: objectPlaceholder },
    { row: 'NSP-016 §6 C66 — Enable Label on then off: the node lost its root element (two elements share the root ref), so Focus reports Unchanged with the dropdown on the page', matches: lostRootAfterLabelOff },
    { row: 'NSP-016 §6 C80 — Enable Label changed while the dropdown holds the keyboard: React builds a new element and the keyboard leaves with the old one, silently', matches: labelTakesKeyboard },
    { row: 'NSP-016 §6 C70 — Items wired a truthy value that is not a list, or a list holding null: the render throws at the next paint', matches: itemsNotAList },
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
    { row: 'NSP-016 §6 C65 — a Label wired an object or an array: React throws rendering it at the next paint', matches: objectLabel },
    { row: 'NSP-016 §6 C66 — Enable Label on then off: the node lost its root element (two elements share the root ref), so Focus reports Unchanged with the button on the page', matches: lostRootAfterLabelOff },
    // NSP-023 step 5 (v2) — what React's drawing makes the runtime do instead of what the spec says
    { row: 'NSP-016 §6 C80 — Enable Label changed while the button holds the keyboard: React builds a new element and the keyboard leaves with the old one, silently', matches: labelTakesKeyboard },
    { row: 'NSP-016 §6 C76 — the group\'s Value written back in the frame of a pick leaves the group\'s copy of the selection on the pick: the buttons show the pick', matches: buttonPickWrittenBack },
    { row: 'NSP-016 §6 D37 — Changed fires with nobody clicking this button: a sibling carrying its Value picked, its Value written in a pick\'s frame, a remount', matches: changedWithNobodyClicking }
  ],
  // s42 — the Radio Button Group: no text style either — the Placement and units-typed style setters
  'Radio Button Group': [
    // NSP-023 step 5 (v2) — the buttons show what the Value says; what the component's copy of the selection makes the runtime do instead
    { row: 'NSP-016 §6 C76 — a Value written back in the frame of a pick leaves the picked button selected: picking it again raises nothing', matches: groupPickWrittenBack }
  ],
  // s43 — the Text: a text style (C61) and the Placement and units-typed style setters; s44 — C79 (R11: the spec says the intent)
  Text: [{ row: 'NSP-016 §6 C79 — at Opacity 0 after a Pointer Events write the element takes the pointer', matches: invisibleTakesPointer }],
  'net.noodl.controls.checkbox': [
    { row: 'NSP-016 §6 C65 — a Label wired an object or an array: React throws rendering it at the next paint', matches: objectLabel },
    { row: 'NSP-016 §6 C66 — Enable Label on then off: the node lost its root element (two elements share the root ref), so Focus reports Unchanged with the box on the page', matches: lostRootAfterLabelOff },
    { row: 'NSP-016 §6 C67 — a Check / Uncheck or a Checked write reverting a click in the same frame leaves the box drawn as the click left it; the next click reports the opposite', matches: clickActionClick },
    { row: 'NSP-016 §6 C80 — Enable Label changed while the box holds the keyboard: React builds a new element and the keyboard leaves with the old one, silently', matches: labelTakesKeyboard }
  ],
  // s32 — the one throw on the success path DEF-026 left (it made the error path total)
  // s34 — Server-Sent Events: a setter keeps a non-text value (`value || ''`) that Connect calls a string method on
  'net.noodl.SSE': [{ row: 'NSP-014 §6.41 C57 — Event Types or Method wired a value that is not text: Connect throws calling `.split` / `.toUpperCase` on it', matches: sseNonText }],
  CloudFunction2: [{ row: 'NSP-014 §6.35 C54 — a success whose body is JSON null throws reading `.result`: nothing sent, the presses never answered', matches: nullSuccessBody }],
  // s25 — Array Filter's twin: the same `bindCollection` (filterdbmodelsnode.ts :316-320), and a sort outside the `try`
  FilterDBModels: [
    { row: 'NSP-012 §6 C10 — a non-array on Items throws in the setter (`collection.on` on a number, a boolean, a plain object)', matches: nonArrayOnItems },
    { row: 'NSP-014 §6.14 C43 — a Sorting over rows that are not records throws out of the run: no Error, no Failure, the press never answered', matches: sortCannotCompare },
    { row: "NSP-014 §6.14 C44 — null on Items throws `null.contains` inside the store's save event: the writer's Error carries it, later listeners never hear the save", matches: nullContains }
  ],
  // s23 — C11's twin on the Record node: `registerOutputIfNeeded` handles `prop-` only (dbmodelnode2.ts :478-480)
  DbModel2: [{ row: 'NSP-014 §6.8 C37 — the Record\'s `<field> Changed` never fires: nothing registers the output', matches: deadPropertyChanged }],
  // s26 — C37's twin on the User node: `registerOutputIfNeeded` handles `prop-` and the three session signals only (user.ts :447-463)
  'net.noodl.user.User': [{ row: 'NSP-014 §6.17 C48 — the User\'s `<field> Changed` never fires: nothing registers the output', matches: deadPropertyChanged }],
  DeleteDbModelProperties: [{ row: "NSP-014 §6.5 C36 — Delete Record's success reads the binding live; cleared while the delete is out, it throws: Failure, not Done", matches: notifyOnCleared }],
  PageStackNavigateToPath: [
    { row: 'NSP-015 §6.2 C24 — a Path that is not text throws at `.match` in the frame-end callback; the presses are never answered', matches: nonTextPath },
    { row: 'NSP-015 §6.2 C25 — a push the browser refuses (another origin) throws in the frame-end callback; no popstate, the presses are never answered', matches: refusedPush }
  ],
  CollectionNew: [{ row: 'NSP-012 §6 C9 — a second Do in one frame reports nothing (the guard sits before beginOutcome)', matches: coalescedPress('new') }],
  NewModel: [{ row: 'NSP-012 §6 C9 — a second Do in one frame reports nothing (the guard sits before beginOutcome)', matches: coalescedPress('new') }],
  SetModelProperties: [{ row: 'NSP-012 §6 C9 — a second Do in one frame reports nothing (the guard sits before beginOutcome)', matches: coalescedPress('store') }],
  Model2: [{ row: 'NSP-012 §6 C11 — `<property> Changed` never fires: nothing registers the output', matches: deadPropertyChanged },
    { row: 'NSP-011 §6 C6 — node.ts merges a later value into a unit object the port once held (R7)', matches: unitMergeOnAny((p) => p.startsWith('prop-')) }
  ],
  'Filter Collection': [{ row: 'NSP-012 §6 C10 — a non-array on Items throws in the setter (`collection.on` on a number, a boolean, a plain object)', matches: nonArrayOnItems }],
  'Map Collection': [{ row: 'NSP-012 §6 C10 — a non-array on Items throws in the setter (`collection.on` on a number, a boolean, a plain object)', matches: nonArrayOnItems }],
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
