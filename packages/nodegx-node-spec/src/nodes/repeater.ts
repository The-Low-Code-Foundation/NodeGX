/**
 * Repeater (`For Each`) — read from `packages/noodl-viewer-react/src/nodes/std-library/data/foreach.tsx` (the node),
 * `packages/noodl-runtime/src/collection.ts` (the list it keeps), `model.ts` (`instanceOf`, `create`), `nodescope.ts` and
 * `nodecontext.ts` (`createNode`, `createComponentInstanceNode`, `getComponentModel`), `nodes/componentinstance.ts` (a row: its inputs,
 * its outputs), `node.ts` (a frame-end callback that throws) and `noodl-viewer-react/src/guid.ts` on 2026-10-08, and recorded on the
 * runtime the same day (NSP-016 s59; the reading and the measurements are NSP-016 §7.20).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from; where the rule is JavaScript's (a value the
 * code does not expect), the spec runs the same expression on the same value.
 *
 * THE PLAY'S PROJECT (`REPEATER_TEMPLATES`). A Repeater builds one component per item and adds it to its PARENT, after itself: the
 * rows are the parent's children, in order, and a person sees them there. In a play the Repeater sits alone in a Group, and the project
 * has two row templates — `Row` shows its `label` and hands back `Id` and `Label`; `Card` shows its `title` and hands it back as `Label`;
 * a click on either is `Tapped`. Any other name is a component the project does not have. What a person does is click a row
 * (`tapRow`, the row at that place in the list, from 0). The editor draws the Repeater an output per output of its Template
 * (`itemOutput-<name>`, `itemOutputSignal-<name>` for a signal, setup :1036-1091); the ones it has are the PLACED Template's.
 *
 * THE LIST (collection.ts `set` :569-700, the registry's `set` here). The Repeater keeps its OWN list of records (`initialize` :232 —
 * an anonymous array, ten draws). Items is copied into it with `set`, the diff: a plain object becomes a record — one with an `id`
 * names that record (every row with that id is the one record, its fields the last row's), one without is a new anonymous record (ten
 * draws) unless this list has seen that very object before; then records the new list lacks are removed, the rest put in place, new ones
 * added — each removal and each addition one operation on the Repeater's queue (`initialize` :240-254), the addition at its place in
 * the list. An item that is `null` (or `undefined`) THROWS there (`Model.instanceOf(null)` reads `.target`, model.ts :265): the items
 * before it have become records, and nothing is moved.
 *
 * ITEMS (:301-320): a value is copied at the frame's end (`scheduleCopyItems` :895-921, once per frame, whatever came last); the same
 * value again — the same object, or `null` after `null` — is nothing. A string is evaluated by the port first (`array-literal`).
 * Anything that is not a list empties it (`set` reads no `length`), a list with a `null` in it throws (above).
 *
 * TEMPLATE, TEMPLATE TYPE and REFRESH each ask for a REBUILD at the frame's end (`scheduleRefresh` :453-468) — one per frame, and none
 * while one is asked for and has not started. Placed, a Repeater asks for one before its parameters are set (it learns its parent
 * first: `setNodeModel` → `updateTarget` :436-452). Template Type Explicit (or never set) builds every row from Template; any other
 * value runs Script per item (`getTemplateForModel` :501-537), which v1 never sets — so no item has a component and no row is built.
 *
 * THE FRAME'S END (node.ts :759-763). The Repeater's frame-end callbacks run in the order they were asked for — the copy and the
 * rebuild. A copy that throws ends the frame's callbacks there: a rebuild asked for after it is lost, and since it is still "asked for",
 * no later Template, Template Type or Refresh asks again (row C130).
 *
 * THE QUEUE (`_runQueueOperations` :815-860): one operation at a time, in order.
 *   - **an addition**: the item's component (none: no row); then the row's node id (eight draws, guid.ts) and the build (`await
 *     createNode`). A component the project has lands as a row at its place: its `id` input the record's id, every input the record
 *     has a field for set from it, and kept in step with the record's changes (:592-630). One it does not have THROWS (`getComponentModel`
 *     nodecontext.ts :616-636) — and the queue never runs again (row C128).
 *   - **a removal**: the record's row goes (:658-685).
 *   - **a rebuild** (`refresh` :723-810): no Template (falsy) — every Refresh it answers fails `repeater/no-template`; no Items (falsy)
 *     — `repeater/no-items`. Otherwise the Items are copied again (what that copy queues is dropped), EVERY row goes, and a row is built
 *     for each record in the list, in order, as an addition builds one; then every Refresh it answers is Done. A throw in the copy or a
 *     build is the queue's for good (C128): its Refreshes are never answered.
 *   When the queue empties, **Items Rendered** — after every run of the queue, including one that built nothing (row C129).
 *
 * WHEN THE WORK LANDS. A build lands at the next yield to the event loop (a settle, after the frame's end): eleven microtasks the play
 * does not give it otherwise. What does not build ends sooner, and the queue runs on that many act boundaries later (measured: a
 * removal 1, an addition with no component 2, a rebuild that fails or builds nothing 1 plus 1 per item it looked at) — an act is awaited
 * (one microtask), a set or a signal is not. So the queue a frame's end starts is done by that settle; one a CLICK starts (below) can
 * still be running at the next act.
 *
 * A PERSON (`tapRow`). A click on a row: the row's own click handler drains the graph (pointerlisteners.ts :173-186) — the Repeater's
 * frame-end work waiting from earlier steps runs THERE, before the row's click is delivered (the Repeater was dirty first); a row that
 * work deleted delivers nothing. Then the row's `Tapped` (`creatorCallbacks.onOutputChanged` :633-639 → `itemOutputSignalTriggered`
 * :922-947): **Item Id** the record's id; each `itemOutput-<name>` the Repeater has, the row's output of that name; then
 * **itemOutputSignal-Tapped** — only when the Repeater has that output. A place with no row is nothing to click.
 */

import { defineNode, type Patch } from '../spec';
import type { CollectionRef, RecordRef } from '../registry';

/** What a row template is in the play's project: a component a target registers by name before the node is placed. */
export interface RowTemplate {
  inputs: Readonly<Record<string, 'value' | 'signal'>>;
  outputs: Readonly<Record<string, 'value' | 'signal'>>;
  /** the component's own nodes, by local id */
  nodes: Readonly<Record<string, { type: string; params?: Readonly<Record<string, unknown>> }>>;
  /** wires between them, `"<local id>.<port>"` */
  wires: ReadonlyArray<{ from: string; to: string }>;
  /** its visual roots, by local id: what a person sees of a row */
  roots: readonly string[];
}

/**
 * THE PLAY'S PROJECT: two row templates. `Row` shows its `label` and hands back its `id` and `label`; `Card` shows its `title` and
 * hands it back as `Label`; a click on either is `Tapped`. Any other name is a component the project does not have.
 */
export const REPEATER_TEMPLATES: Readonly<Record<string, RowTemplate>> = {
  Row: {
    inputs: { id: 'value', label: 'value' },
    outputs: { Id: 'value', Label: 'value', Tapped: 'signal' },
    nodes: { in: { type: 'Component Inputs' }, text: { type: 'Text' }, out: { type: 'Component Outputs' } },
    wires: [
      { from: 'in.label', to: 'text.text' },
      { from: 'in.label', to: 'out.Label' },
      { from: 'in.id', to: 'out.Id' },
      { from: 'text.onClick', to: 'out.Tapped' }
    ],
    roots: ['text']
  },
  Card: {
    inputs: { title: 'value' },
    outputs: { Label: 'value', Tapped: 'signal' },
    nodes: { in: { type: 'Component Inputs' }, text: { type: 'Text' }, out: { type: 'Component Outputs' } },
    wires: [
      { from: 'in.title', to: 'text.text' },
      { from: 'in.title', to: 'out.Label' },
      { from: 'text.onClick', to: 'out.Tapped' }
    ],
    roots: ['text']
  }
};

/** What each output of a row reads: the input wired to it, which the Repeater keeps in step with the record (:592-630). */
const ROW_OUTPUT: Readonly<Record<string, Readonly<Record<string, (rec: RecordRef) => unknown>>>> = {
  Row: { Id: (rec) => rec.getId(), Label: (rec) => rec.data.label },
  Card: { Label: (rec) => rec.data.title }
};

const ITEMS: readonly unknown[] = [
  [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
  [{ id: 'b', label: 'B2' }, { id: 'c', label: 'C' }, { id: 'a', label: 'A' }],
  [{ label: 'x' }, { label: 'y' }],
  [{ id: 'a', title: 'T' }],
  [{ id: 'a', label: 'A' }, { id: 'a', label: 'A2' }, { id: 'b', label: 'B' }],
  [{ id: 'c', label: 'C' }, null],
  "[{id:'s',label:'S'}]",
  { id: 'z', label: 'Z' },
  [7, 'xy']
];
const TEMPLATES: readonly unknown[] = ['Row', 'Card', 'Missing', '', null];

/** :1028 `templateScript`'s default (`defaultDynamicScript`) — the editor's; it never runs the setter */
const DEFAULT_SCRIPT =
  "// Set the 'component' variable to the name of the desired component for this item.\n" +
  "// Component name must start with a '/'.\n" +
  "// A component in a sheet is referred to by '/#Sheet Name/Comopnent Name'.\n" +
  "// The data for each item is available in a variable called 'item'\n" +
  "component = '/MyComponent';";

/** One operation on the queue (:240-254, :465) */
type Op = { kind: 'add'; rec: RecordRef; index: number } | { kind: 'remove'; rec: RecordRef } | { kind: 'refresh' };
/** A row: its record and the component it was built from */
type Row = { rec: RecordRef; template: string };
/** The operation waiting on a build (`await createNode`): it lands at the next yield */
type Building = { kind: 'add'; row: Row; index: number } | { kind: 'refresh'; row: Row; index: number; rest: RecordRef[]; tokens: number };

type State = {
  /** `_internal.collection` (:232) — the Repeater's own list */
  own: CollectionRef | null;
  /** `_internal.items` (:316-317) — as set, the very value */
  items: unknown;
  /** `_internal.template` / `_internal.templateType` — `undefined` until written (a declared default never runs its setter) */
  template: unknown;
  templateType: unknown;
  /** the outputs the editor drew for the PLACED Template: the value outputs' names, and whether `Tapped` is one (`itemOutputSignals`) */
  registered: { values: string[]; tapped: boolean };
  /** `hasScheduledCopyItems`, `hasScheduledRefresh` */
  copyScheduled: boolean;
  refreshScheduled: boolean;
  /** the frame-end callbacks, in the order asked for */
  callbacks: Array<'copy' | 'refresh'>;
  /** `pendingRefreshOutcomes` — Refreshes waiting on the next rebuild */
  tokens: number;
  /** `queuedOperations` */
  queue: Op[];
  /** `runningOperations` — the queue is working (for good, once something threw) */
  running: boolean;
  stuck: boolean;
  /** the act boundaries before the queue runs on, after an operation that did not build */
  hops: number;
  /** an act ended: the next step starts one microtask later (one hop) */
  owed: boolean;
  building: Building | null;
  /** the parent's children after the Repeater: the rows, in order */
  rows: Row[];
  /**
   * Refresh answers made at an act boundary inside an input's step (the queue running on), held for the next reducer the format lets
   * answer an invocation (a frame's end, an act, the yield) — the same settle, in the order made
   */
  answered: ReadonlyArray<{ port: 'refresh'; outcome: 'done' | 'failure'; error?: string }>;
  // ---- the outputs as last written ----
  itemId: unknown;
  outs: Readonly<Record<string, unknown>>;
};

type Work = { st: State; view: View; pulses: string[]; send: Set<'itemActionItemId'>; sendDerived: Set<string>; outcomes: Array<{ port: 'refresh'; outcome: 'done' | 'failure'; error?: string }>; resume: boolean };
type View = { random(): number; registry: { create(data?: unknown): RecordRef; collection(name?: unknown): CollectionRef; isRecord(v: unknown): v is RecordRef } };

/** The outputs the editor draws for a Template (setup :1036-1091) */
function outputsOf(template: unknown): { values: string[]; tapped: boolean } {
  const t = typeof template === 'string' && Object.prototype.hasOwnProperty.call(REPEATER_TEMPLATES, template) ? REPEATER_TEMPLATES[template] : undefined;
  const values: string[] = [];
  let tapped = false;
  for (const [name, kind] of Object.entries(t?.outputs ?? {})) {
    if (kind === 'signal') tapped = tapped || name === 'Tapped';
    else values.push(name);
  }
  return { values, tapped };
}

export const Repeater = defineNode({
  type: 'For Each',
  version: 1,
  source: 'packages/noodl-viewer-react/src/nodes/std-library/data/foreach.tsx',
  needs: ['person', 'registry', 'project'],
  worldPool: {
    // :829-860 — chunked creation reads the page's clock, which does not move while the node works: the same as one run
    projectSettings: [{}, { repeaterCreateComponentsAsync: true }]
  },
  // ERG-001 §4 :426-433 — Refresh's: Done or Failure, never Unchanged
  outcomes: ['done', 'failure'],

  state: {
    own: null,
    items: undefined,
    template: undefined,
    templateType: undefined,
    registered: { values: [], tapped: false },
    copyScheduled: false,
    refreshScheduled: false,
    callbacks: [],
    tokens: 0,
    queue: [],
    running: false,
    stuck: false,
    hops: 0,
    owed: false,
    building: null,
    rows: [],
    answered: [],
    itemId: undefined,
    outs: {}
  } as State,
  // `initialize` :232 — its own list (an anonymous array: ten draws); placed, it learns its parent before its parameters are set and asks
  // for a rebuild (`updateTarget` :436-439)
  init: (w, params) => ({ own: w.registry.collection(), registered: outputsOf(params.template), refreshScheduled: true, callbacks: ['refresh' as const] }),

  acts: {
    tapRow: { description: 'a person clicks the row the Repeater drew at this place in the list, counting from 0', values: [0, 1, 2, 3] }
  },

  inputs: {
    // :276-320
    items: { type: 'array', coerce: 'array-literal', displayName: 'Items', group: 'Data', description: 'The array or query result to repeat over; an empty value clears the list, including null and an empty array', portability: 'logic', examples: ITEMS },
    // :321-337
    templateType: { type: 'enum', enums: ['explicit', 'dynamic'], default: 'explicit', coerce: 'none', displayName: 'Template Type', group: 'Appearance', description: 'Explicit uses one component for every item; Dynamic picks one per item by running Script', portability: 'logic' },
    // :338-347
    template: { type: 'component', coerce: 'none', displayName: 'Template', group: 'Appearance', description: 'Component to create once per item, with the item available to it as its Component Object', portability: 'logic', examples: TEMPLATES },
    // :348-378 — JavaScript; v2
    templateScript: { type: 'string', default: DEFAULT_SCRIPT, editOnly: true, coerce: 'none', displayName: 'Script', group: 'Appearance', description: 'JavaScript run per item that sets `component` to a component path; the item is available as `item`', portability: 'logic', undriven: 'JavaScript run per item: v2' },
    // :379-391
    refresh: { type: 'signal', outcome: true, displayName: 'Refresh', group: 'Appearance', description: 'Rebuilds every item from the current Items, discarding any state the item components held', portability: 'logic' }
  },

  outputs: {
    // :394-402
    itemActionItemId: { type: 'string', from: (s) => s.itemId, displayName: 'Item Id', group: 'Values', description: 'Id of the item whose Repeater Item node last raised an action' },
    // :408-414
    itemsRendered: { type: 'signal', displayName: 'Items Rendered', group: 'Events', description: 'Fires once every item component exists and has been added; item creation is spread across frames, so this is the only honest moment to measure or scroll the list' }
  }
}).on(
  {
    // :301-320 — the same value again is nothing; else it is copied at the frame's end
    items: (s, v, _i, view) =>
      run(s, view, (w) => {
        if (v === w.st.items) return;
        w.st.items = v;
        scheduleCopy(w);
      }),
    // :333-336
    templateType: (s, v, _i, view) => run(s, view, (w) => ((w.st.templateType = v), scheduleRefresh(w))),
    // :343-346
    template: (s, v, _i, view) => run(s, view, (w) => ((w.st.template = v), scheduleRefresh(w))),
    // :384-390 — answered by the next rebuild
    refresh: (s, _i, view) => ({ ...run(s, view, (w) => ((w.st.tokens += 1), scheduleRefresh(w))), outcome: 'pending' })
  },
  {
    derived: {
      // `inputMappingScript` (:968-1010) is the editor's, drawn with a Template: JavaScript, v2
      inputs: () => ({}),
      outputs: (params) => {
        const r = outputsOf(params.template);
        const out: Record<string, unknown> = {};
        for (const name of r.values) out[`itemOutput-${name}`] = { type: '*', from: (s: State) => s.outs[name], displayName: name, group: 'Item Outputs' };
        if (r.tapped) out['itemOutputSignal-Tapped'] = { type: 'signal', displayName: 'Tapped', group: 'Item Signals' };
        return out as never;
      },
      on: () => ({ send: [] })
    },
    // the frame's end: the callbacks asked for, in order; what they queue starts at once
    afterInputs: (s, _i, view) => run(s, view, (w) => frameWork(w), 'frame'),
    world: {
      // the yield: the build lands, and the queue runs to its end
      resume: (s, _i, _tag, view) => run(s, view, (w) => atYield(w), 'yield')
    },
    person: {
      tapRow: (s, _i, v, view) =>
        run(
          s,
          view,
          (w) => {
            // the row at that place as painted; no row, no click
            const row = typeof v === 'number' ? w.st.rows[v] : undefined;
            if (!row) return;
            // the click's handler drains the graph: the Repeater's waiting frame-end work first (it was dirty first)
            frameWork(w);
            // a row that work deleted delivers nothing
            if (!w.st.rows.includes(row)) return;
            tapped(w, row);
          },
          'act'
        )
    }
  }
);

// ---------------------------------------------------------------------------------------------
// the work: a draft of the whole state, and what the work said
// ---------------------------------------------------------------------------------------------

/** A reducer's patch: the whole state as the work leaves it (s54, s55), and what it sent */
function run(s: Readonly<State>, view: View, f: (w: Work) => void, mode: 'step' | 'act' | 'frame' | 'yield' = 'step'): any { // eslint-disable-line @typescript-eslint/no-explicit-any
  const w: Work = { st: { ...s, rows: [...s.rows], queue: [...s.queue], callbacks: [...s.callbacks] }, view, pulses: [], send: new Set(), sendDerived: new Set(), outcomes: [], resume: false };
  // a step after an act starts one microtask generation later — the settle's frame too (the act was awaited before it)
  if (mode !== 'yield' && w.st.owed) hop(w);
  w.st.owed = false;
  f(w);
  if (mode === 'act') w.st.owed = true;
  // the answers made: held in a step, handed over by a frame's end, an act or the yield
  const answers = [...w.st.answered, ...w.outcomes];
  w.st.answered = mode === 'step' ? answers : [];
  const patch: Patch<State, never> & Record<string, unknown> = {
    set: w.st,
    send: [...w.send] as never,
    sendDerived: [...w.sendDerived],
    pulses: w.pulses.map((d) => (d === 'itemsRendered' ? d : { derived: d })) as never
  };
  if (mode !== 'step' && answers.length > 0) patch.outcomes = answers;
  if (w.resume) patch.resume = 'build';
  return patch;
}

/** :895-899 */
function scheduleCopy(w: Work): void {
  if (w.st.copyScheduled) return;
  w.st.copyScheduled = true;
  w.st.callbacks.push('copy');
}
/** :453-468 — no new one while one is asked for and has not started */
function scheduleRefresh(w: Work): void {
  if (w.st.refreshScheduled) return;
  w.st.refreshScheduled = true;
  w.st.callbacks.push('refresh');
}

/** The Repeater's frame-end callbacks (node.ts :759-763): a throw ends them there, and the rest of the frame's are lost (row C130) */
function frameWork(w: Work): void {
  const callbacks = w.st.callbacks;
  w.st.callbacks = [];
  for (const cb of callbacks) {
    if (cb === 'copy') {
      // :900-920
      w.st.copyScheduled = false;
      if (copy(w, w.st.items) === THROWS) return;
    } else enqueue(w, { kind: 'refresh' });
  }
}

// ---------------------------------------------------------------------------------------------
// THE LIST — the registry's array is the runtime's diff; the throw on an item that is `null` is the runtime's own
// ---------------------------------------------------------------------------------------------

const THROWS = Symbol('throws');

/**
 * `collection.set(src)` (collection.ts :569-700) on the Repeater's own list: each addition and removal one queued operation (:240-254).
 * `Model.instanceOf(item)` reads `item.target` — a `null` or `undefined` item throws there, after the items before it were converted.
 */
function copy(w: Work, src: unknown): void | typeof THROWS {
  const own = w.st.own as CollectionRef;
  const source = (src || []) as ArrayLike<unknown>;
  const n = source.length;
  for (let i = 0; i < n; i++) {
    const item = source[i];
    if (item === null || item === undefined) {
      convert(w, own, source, i);
      return THROWS;
    }
  }
  const ops: Op[] = [];
  const list = own as unknown as { on(e: string, f: (a: { item: RecordRef; index: number }) => void): void; off(e: string, f: (a: { item: RecordRef; index: number }) => void): void };
  const add = (a: { item: RecordRef; index: number }) => void ops.push({ kind: 'add', rec: a.item, index: a.index });
  const remove = (a: { item: RecordRef; index: number }) => void ops.push({ kind: 'remove', rec: a.item });
  list.on('add', add);
  list.on('remove', remove);
  try {
    own.set(src);
  } finally {
    list.off('add', add);
    list.off('remove', remove);
  }
  for (const op of ops) enqueue(w, op);
}

/** The conversion loop of `set` (:584-631) up to item `upTo`: what becomes a record before the throw (the same cache the diff keeps) */
function convert(w: Work, own: CollectionRef, source: ArrayLike<unknown>, upTo: number): void {
  const holder = own as unknown as { _plainItemModels?: WeakMap<object, RecordRef> };
  if (!holder._plainItemModels) Object.defineProperty(holder, '_plainItemModels', { value: new WeakMap(), enumerable: false, writable: true });
  const cache = holder._plainItemModels!;
  for (let i = 0; i < upTo; i++) {
    const item = source[i];
    if (w.view.registry.isRecord(item)) continue;
    const plain = item as Record<string, unknown>;
    const isObject = typeof plain === 'object' && plain !== null;
    const model = isObject ? cache.get(plain) : undefined;
    if (model === undefined) {
      const made = w.view.registry.create(plain);
      if (isObject) cache.set(plain, made);
    } else {
      for (const key in plain) {
        if (key === 'id') continue;
        if (model.data[key] !== plain[key]) model.set(key, plain[key]);
      }
    }
  }
}

// ---------------------------------------------------------------------------------------------
// THE QUEUE
// ---------------------------------------------------------------------------------------------

/** `_queueOperation` (:811-814): queued; an idle queue starts at once */
function enqueue(w: Work, op: Op): void {
  w.st.queue.push(op);
  if (w.st.running) return;
  w.st.running = true;
  w.resume = true;
  next(w);
}

/** The runner goes on (:851-858): the next operation, or — the queue empty — Items Rendered and idle (row C129) */
function next(w: Work): void {
  const op = w.st.queue.shift();
  if (op === undefined) {
    w.st.running = false;
    w.pulses.push('itemsRendered');
    return;
  }
  start(w, op);
}

/** One act boundary: a queue waiting on an operation that did not build runs on */
function hop(w: Work): void {
  if (w.st.hops === 0) return;
  w.st.hops -= 1;
  if (w.st.hops === 0) next(w);
}

/** The yield: the build lands, and the queue runs to its end */
function atYield(w: Work): void {
  if (!w.st.running || w.st.stuck) return;
  w.st.hops = 0;
  for (;;) {
    const b = w.st.building;
    if (b) {
      w.st.building = null;
      land(w, b);
      if (w.st.building || w.st.stuck) {
        if (w.st.stuck) return;
        continue;
      }
    }
    if (w.st.hops > 0) w.st.hops = 0;
    const op = w.st.queue.shift();
    if (op === undefined) {
      w.st.running = false;
      w.pulses.push('itemsRendered');
      return;
    }
    start(w, op);
    if (w.st.stuck) return;
  }
}

/** An operation's synchronous part: it ends (the queue runs on `hops` act boundaries later), waits on a build, or throws (C128) */
function start(w: Work, op: Op): void {
  if (op.kind === 'remove') {
    removeItem(w, op.rec);
    w.st.hops = 1;
  } else if (op.kind === 'add') {
    const b = addItem(w, op.rec, op.index);
    if (b === THROWS) w.st.stuck = true;
    else if (b === null) w.st.hops = 2;
    else w.st.building = { kind: 'add', row: b, index: op.index };
  } else refresh(w);
}

/** `getTemplateForModel` (:501-537): Explicit (or never set) reads Template; anything else runs Script, which v1 never sets */
function templateFor(st: State): unknown {
  return st.templateType === undefined || st.templateType === 'explicit' ? st.template : undefined;
}

/**
 * `addItem` (:556-657) up to its build: no component — no row (null); else the row's node id (eight draws, guid.ts) and the build —
 * a component the project does not have throws (`getComponentModel`), one it has is the row to land.
 */
function addItem(w: Work, rec: RecordRef, _index: number): Row | null | typeof THROWS {
  const template = templateFor(w.st);
  if (!template) return null;
  for (let i = 0; i < 8; i++) w.view.random();
  const name = String(template);
  if (!Object.prototype.hasOwnProperty.call(REPEATER_TEMPLATES, name)) return THROWS;
  return { rec, template: name };
}

/** The row lands (:592-656): added at its place among the parent's children (after the Repeater, so its place in the list) */
function land(w: Work, b: Building): void {
  w.st.rows.splice(b.index, 0, b.row);
  if (b.kind === 'add') return;
  // a rebuild goes on: the next record's row
  rebuildFrom(w, b.rest, b.index + 1, b.tokens);
}

/** `removeItem` (:658-685): the record's row goes */
function removeItem(w: Work, rec: RecordRef): void {
  const i = w.st.rows.findIndex((r) => r.rec === rec);
  if (i >= 0) w.st.rows.splice(i, 1);
}

/** `refresh` (:723-810) */
function refresh(w: Work): void {
  const st = w.st;
  st.refreshScheduled = false;
  const tokens = st.tokens;
  st.tokens = 0;
  const settle = (outcome: 'done' | 'failure', error?: string) => {
    for (let i = 0; i < tokens; i++) w.outcomes.push(error === undefined ? { port: 'refresh', outcome } : { port: 'refresh', outcome, error });
  };
  // :745-752 — Script is never set in v1, so only Template counts
  if (!st.template) {
    settle('failure', 'repeater/no-template');
    st.hops = 1;
    return;
  }
  if (!st.items) {
    settle('failure', 'repeater/no-items');
    st.hops = 1;
    return;
  }
  // :770-772 — the copy again; what it queued is dropped
  const before = st.queue.length;
  if (copy(w, st.items) === THROWS) {
    st.stuck = true;
    return;
  }
  st.queue.length = before;
  // :779 — every row goes
  st.rows = [];
  // :797-805 — a row per record of the list, in order
  rebuildFrom(w, [...(st.own as CollectionRef)], 0, tokens);
}

/** The rebuild's loop from record `k`: a record with no component costs an act boundary; a build waits for the yield */
function rebuildFrom(w: Work, records: RecordRef[], k: number, tokens: number): void {
  let looked = 0;
  for (let i = k; i < records.length; i++) {
    const b = addItem(w, records[i], i);
    if (b === THROWS) {
      w.st.stuck = true;
      return;
    }
    if (b === null) {
      looked += 1;
      continue;
    }
    // a build lands only at the yield (eleven microtasks), so the act boundaries the records before it cost are not counted here:
    // within one rebuild every record has a component or none, unless Template Type is written while it runs
    w.st.building = { kind: 'refresh', row: b, index: i, rest: records, tokens };
    return;
  }
  // :809 — every Refresh it answers is Done
  for (let i = 0; i < tokens; i++) w.outcomes.push({ port: 'refresh', outcome: 'done' });
  w.st.hops = looked + 1;
}

/** `itemOutputSignalTriggered` (:922-947), when the Repeater has a `Tapped` output: Item Id, the outputs it has, then the signal */
function tapped(w: Work, row: Row): void {
  if (!w.st.registered.tapped) return;
  w.st.itemId = row.rec.getId();
  w.send.add('itemActionItemId');
  const reads = ROW_OUTPUT[row.template];
  const outs = { ...w.st.outs };
  for (const name of Object.keys(REPEATER_TEMPLATES[row.template].outputs)) {
    if (!w.st.registered.values.includes(name)) continue;
    outs[name] = reads[name](row.rec);
    w.sendDerived.add(`itemOutput-${name}`);
  }
  w.st.outs = outs;
  w.pulses.push('itemOutputSignal-Tapped');
}
