import * as fs from 'fs';
import * as path from 'path';

import * as ts from 'typescript';

import { Catalog, CatalogIndex, loadCatalog } from '../src/catalog';
import { ComponentPlan, REPEAT_TYPE, STREAM_NODES, planProject } from '../src/analyze/plan';
import { emitApp } from '../src/emit/emitApp';
import { ERRORS_LIB_PATH } from '../src/emit/errorsLib';
import { REPEAT_LIB_PATH, repeatLibSource } from '../src/emit/repeatLib';
import { STREAMING_LIB_PATH } from '../src/emit/streamingLib';
import { TIMER_LIB_PATH } from '../src/emit/timerLib';
import { exportBadgeOf, ledgerEntryOf } from '../src/ledger';
import { parseProject } from '../src/parse/parseProject';
import { typecheckEmittedApp } from './helpers/typecheckApp';
import { ComponentIR, ConnectionIR, ExportIR, NodeIR, ParamValue } from '../src/ir/types';

/**
 * GAM-013 (P88) §6 AC7 — `Repeat` exports. The runtime node (`noodl-viewer-react/src/nodes/std-library/repeat.ts`) owes
 * its `nodegx-export` row in the same change (P88 README §7), and a deferred row would be false: nothing about the node is
 * out of scope. So it translates, as the streaming table's seventh member (`src/lib/repeat.ts`, `useRepeat`).
 *
 * §A grades the emitted beat against the interpreter's own code, loaded from source: `repeat.ts` over the real
 * `timerscheduler.ts`, driven frame by frame, and the emitted `createRepeatBeat` over a scripted clock that fires a due
 * timeout at the same frame instants (a throttled tab is a frame that arrives late). Every script compares the whole
 * trace — Tick with Count, every outcome with Count, the failure's code and sentence — and a deliberately broken copy
 * proves the comparison can fail. The hook is graded under a hook harness: its cleanup is the delete listener.
 *
 * §B grades the translation — graphs in, emitted code out — with every refusal asserted by its named reason.
 *
 * §C is `tests/fixtures/beat-desk` (AC2's project: the beat drives a Counter into a Text, and Count into another),
 * typechecked whole.
 */

const RUNTIME_SRC = path.join(__dirname, '..', '..', 'noodl-runtime', 'src');
const REPEAT_SRC = path.join(__dirname, '..', '..', 'noodl-viewer-react', 'src', 'nodes', 'std-library', 'repeat.ts');
const FIXTURE = path.join(__dirname, 'fixtures', 'beat-desk');

const catalog: Catalog = loadCatalog();
const index = new CatalogIndex(catalog);

const loadModule = (source: string, requireImpl: (id: string) => unknown = () => ({})): Record<string, unknown> => {
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const module = { exports: {} as Record<string, unknown> };
  // eslint-disable-next-line no-new-func
  new Function('exports', 'module', 'require', js)(module.exports, module, requireImpl);
  return module.exports;
};

// ---- §A the emitted beat, against the interpreter ------------------------------------------------------------------

type Verb = 'start' | 'stop' | 'delete' | { interval: unknown };
/** One frame: its instant, and the inputs delivered in it before the scheduler runs (NodeContext.update's order). */
type Frame = { at: number; verbs?: Verb[] };
/** What an author can observe: Tick with Count, every outcome with Count, a Failure's code and sentence. */
type Event = [string, number, ...unknown[]];
/** A graph wired from Tick back into the node: the verbs to deliver inside the Nth tick. */
type FromTick = Record<number, Verb[]>;

interface RepeatDefinition {
  initialize(this: unknown): void;
  inputs: {
    interval: { set(this: unknown, value: unknown): void };
    start: { valueChangedToTrue(this: unknown): void };
    stop: { valueChangedToTrue(this: unknown): void };
  };
  outputs: { count: { getter(this: unknown): number } };
  methods: { _tick(this: unknown): void };
}
const interpreterRepeat = (loadModule(fs.readFileSync(REPEAT_SRC, 'utf8'), (id) => (id.includes('outcome') ? { outcomeOutputs: () => ({}) } : {})) as {
  default: { node: RepeatDefinition };
}).default.node;

interface Scheduler {
  runTimers(t: number): void;
  hasPendingTimers(): boolean;
}
const SchedulerCtor = loadModule(fs.readFileSync(path.join(RUNTIME_SRC, 'timerscheduler.ts'), 'utf8')) as unknown as new (requestFrame: () => void) => Scheduler;

/** The interpreter's answer: `repeat.ts` on a node-shaped bag over the runtime's scheduler, frames at the script's instants. */
const interpreterTrace = (interval: unknown, frames: Frame[], fromTick: FromTick = {}): { events: Event[]; pending: boolean; pendingByFrame: boolean[] } => {
  const events: Event[] = [];
  const scheduler = new SchedulerCtor(() => undefined);
  const context = { timerScheduler: scheduler, currentFrameTime: 0 };
  const deleteListeners: Array<() => void> = [];
  const def = interpreterRepeat;
  const pendingByFrame: boolean[] = [];
  let ticks = 0;
  const node: Record<string, unknown> = {
    _internal: {},
    context,
    addDeleteListener: (fn: () => void) => deleteListeners.push(fn),
    beginOutcome: () => ({ reported: undefined }),
    // node.ts reportOutcome, as much of it as an author can observe: the raise carries the code and message, then the pulse, then Completed.
    reportOutcome: (_token: unknown, outcome: string, options?: { code: string; message: string }) => {
      const count = def.outputs.count.getter.call(node);
      events.push(outcome === 'failure' ? [outcome, context.currentFrameTime, count, options!.code, options!.message] : [outcome, context.currentFrameTime, count]);
      events.push(['completed', context.currentFrameTime, count]);
    },
    flagOutputDirty: () => undefined,
    sendSignalOnOutput: (port: string) => {
      if (port !== 'tick') return;
      events.push(['tick', context.currentFrameTime, def.outputs.count.getter.call(node)]);
      ticks++;
      for (const verb of fromTick[ticks] ?? []) deliver(verb);
    }
  };
  node._tick = () => def.methods._tick.call(node);
  const deliver = (verb: Verb) => {
    if (verb === 'start') def.inputs.start.valueChangedToTrue.call(node);
    else if (verb === 'stop') def.inputs.stop.valueChangedToTrue.call(node);
    else if (verb === 'delete') deleteListeners.forEach((fn) => fn());
    else def.inputs.interval.set.call(node, verb.interval);
  };
  def.initialize.call(node);
  if (interval !== undefined) def.inputs.interval.set.call(node, interval);
  for (const frame of frames) {
    context.currentFrameTime = frame.at;
    for (const verb of frame.verbs ?? []) deliver(verb);
    if (scheduler.hasPendingTimers()) scheduler.runTimers(frame.at);
    pendingByFrame.push(scheduler.hasPendingTimers());
  }
  return { events, pending: scheduler.hasPendingTimers(), pendingByFrame };
};

interface AppErrorLike {
  code: string;
  message: string;
  nodeId: string;
  nodeType: string;
  componentName: string;
}
interface Beat {
  readonly count: number;
  readonly running: boolean;
  setIntervalInput(value: unknown): void;
  setListeners(on: Record<string, () => void>): void;
  start(): void;
  stop(): void;
  dispose(): void;
}
interface RepeatClock {
  now(): number;
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}
interface RepeatLib {
  createRepeatBeat(source: { label: string; nodeId: string; componentName: string }, clock?: RepeatClock, rerender?: () => void): Beat;
  useRepeat(source: { label: string; nodeId: string; componentName: string }, options?: Record<string, unknown>, on?: Record<string, () => void>, clock?: RepeatClock): { start(): void; stop(): void; readonly count: number };
  isUsableInterval(value: unknown): boolean;
  REPEAT_ERROR_INTERVAL_NOT_POSITIVE: string;
}

/** A clock whose timeouts fire only when the test says a frame ran: every due timeout, in due order, at the frame's instant. */
function scriptedClock() {
  let now = 0;
  let seq = 0;
  const timers = new Map<number, { due: number; fn: () => void }>();
  const clock: RepeatClock = {
    now: () => now,
    setTimeout: (fn, ms) => {
      const id = ++seq;
      timers.set(id, { due: now + ms, fn });
      return id;
    },
    clearTimeout: (id) => {
      timers.delete(id as number);
    }
  };
  return {
    clock,
    setNow(t: number) {
      now = t;
    },
    fireDue(limit = 10000) {
      for (let fired = 0; fired < limit; fired++) {
        let next: [number, { due: number; fn: () => void }] | undefined;
        for (const entry of timers) if (entry[1].due <= now && (next === undefined || entry[1].due < next[1].due)) next = entry;
        if (next === undefined) return;
        timers.delete(next[0]);
        next[1].fn();
      }
      throw new Error('fireDue: a timeout re-armed itself due in the same frame 10000 times');
    },
    pending: () => timers.size
  };
}

const SOURCE = { label: 'Beat', nodeId: 'beat', componentName: '/Pages/Beat' };
const loadRepeatLib = (source = repeatLibSource(), raised: AppErrorLike[] = [], react: unknown = {}): RepeatLib =>
  loadModule(source, (id) => {
    if (id === './errors') return { raiseAppError: (e: AppErrorLike) => raised.push(e) };
    if (id === 'react') return react;
    throw new Error(`unexpected import ${id}`);
  }) as unknown as RepeatLib;

/** The emitted beat's answer: `createRepeatBeat` over the scripted clock, the same frames, the same inputs in them. */
const emittedTrace = (source: string, interval: unknown, frames: Frame[], fromTick: FromTick = {}): { events: Event[]; pending: boolean; pendingByFrame: boolean[]; raised: AppErrorLike[] } => {
  const raised: AppErrorLike[] = [];
  const lib = loadRepeatLib(source, raised);
  const time = scriptedClock();
  const events: Event[] = [];
  const pendingByFrame: boolean[] = [];
  let at = 0;
  const beat = lib.createRepeatBeat(SOURCE, time.clock);
  let ticks = 0;
  const deliver = (verb: Verb) => {
    if (verb === 'start') beat.start();
    else if (verb === 'stop') beat.stop();
    else if (verb === 'delete') beat.dispose();
    else beat.setIntervalInput(verb.interval);
  };
  beat.setListeners({
    tick: () => {
      events.push(['tick', at, beat.count]);
      ticks++;
      for (const verb of fromTick[ticks] ?? []) deliver(verb);
    },
    done: () => events.push(['done', at, beat.count]),
    unchanged: () => events.push(['unchanged', at, beat.count]),
    // The raise lands before the pulse, so the failure reads its own raise.
    failure: () => events.push(['failure', at, beat.count, raised[raised.length - 1]?.code, raised[raised.length - 1]?.message]),
    completed: () => events.push(['completed', at, beat.count])
  });
  if (interval !== undefined) beat.setIntervalInput(interval);
  for (const frame of frames) {
    at = frame.at;
    time.setNow(frame.at);
    for (const verb of frame.verbs ?? []) deliver(verb);
    time.fireDue();
    pendingByFrame.push(time.pending() > 0);
  }
  return { events, pending: time.pending() > 0, pendingByFrame, raised };
};

/** Frames every `step` ms from `from` to `until`, with inputs at the instants given. */
const frames = (verbs: Record<number, Verb[]>, until: number, step = 16, from = 0): Frame[] => {
  const out: Frame[] = [];
  const instants = new Set<number>();
  for (let t = from; t <= until; t += step) instants.add(t);
  for (const t of Object.keys(verbs)) instants.add(Number(t));
  for (const t of [...instants].sort((a, b) => a - b)) out.push({ at: t, ...(verbs[t] ? { verbs: verbs[t] } : {}) });
  return out;
};
const count = (events: Event[], name: string) => events.filter((e) => e[0] === name).length;

describe('GAM-013 §A — the emitted beat, against repeat.ts over timerscheduler.ts', () => {
  const cases: Array<{ name: string; interval: unknown; frames: Frame[]; fromTick?: FromTick; ticks: number }> = [
    { name: 'Start, 5 s of 16 ms frames: the first tick one Interval later, then on the beat', interval: 1000, frames: frames({ 0: ['start'] }, 5008), ticks: 5 },
    { name: 'an Interval off the frame grid does not drift: 60 s at 333 ms', interval: 333, frames: frames({ 0: ['start'] }, 60000), ticks: 180 },
    {
      name: 'a long frame skips the missed ticks and keeps the phase',
      interval: 1000,
      frames: [...frames({ 0: ['start'] }, 1500), ...frames({}, 13100, 16, 10500)],
      ticks: 5
    },
    { name: 'Start, Start, Stop, Start: Done, Unchanged, Done, Done — and one beat', interval: 1000, frames: frames({ 0: ['start'], 400: ['start'], 2500: ['stop'], 2600: ['start'] }, 5000), ticks: 4 },
    { name: 'two Starts in one frame begin one beat', interval: 500, frames: frames({ 0: ['start', 'start'] }, 3008), ticks: 6 },
    { name: 'Stop with nothing running is Unchanged; Stop keeps Count; Start resets it', interval: 1000, frames: frames({ 0: ['stop', 'start'], 3100: ['stop'], 3200: ['stop'], 4000: ['start'] }, 6500), ticks: 5 },
    { name: 'an Interval change lands from the next tick', interval: 1000, frames: frames({ 0: ['start'], 2500: [{ interval: 250 }] }, 5000), ticks: 10 },
    { name: 'an unusable Interval mid-run keeps the last valid beat', interval: 1000, frames: frames({ 0: ['start'], 1500: [{ interval: 0 }] }, 4000), ticks: 4 },
    { name: 'Interval 0: Failure with its code and sentence, no tick', interval: 0, frames: frames({ 0: ['start'] }, 3000), ticks: 0 },
    { name: "Interval '500' (a string): Failure, as the node's typeof test answers", interval: '500', frames: frames({ 0: ['start'] }, 2000), ticks: 0 },
    { name: 'Interval NaN, then a usable one: Failure, then Done', interval: Number.NaN, frames: frames({ 0: ['start'], 100: [{ interval: 400 }], 200: ['start'] }, 2000), ticks: 4 },
    { name: 'deleted mid-run: no tick after, no outcome', interval: 1000, frames: frames({ 0: ['start'], 2500: ['delete'] }, 6000), ticks: 2 },
    { name: 'Stop wired from the third Tick: three ticks, then none', interval: 500, frames: frames({ 0: ['start'] }, 4000), fromTick: { 3: ['stop'] }, ticks: 3 },
    { name: 'Stop then Start wired from the second Tick: one timer, on the tick path’s duration', interval: 500, frames: frames({ 0: ['start'] }, 5000), fromTick: { 2: ['stop', 'start'] }, ticks: 8 },
    { name: 'deleted from inside its own Tick', interval: 500, frames: frames({ 0: ['start'] }, 3000), fromTick: { 1: ['delete'] }, ticks: 1 }
  ];
  for (const c of cases) {
    it(`${c.name}: the same trace at the same instants`, () => {
      const theirs = interpreterTrace(c.interval, c.frames, c.fromTick);
      const mine = emittedTrace(repeatLibSource(), c.interval, c.frames, c.fromTick);
      expect(mine.events).toEqual(theirs.events);
      expect(count(theirs.events, 'tick')).toBe(c.ticks);
      expect(mine.pending).toBe(theirs.pending);
      // A timer left armed after a Stop or a delete ticks into nothing, and no event shows it: read the clock after every frame.
      expect(mine.pendingByFrame).toEqual(theirs.pendingByFrame);
    });
  }

  it('the traces read what the node promises: 1000..5000, a skipped gap, the failure sentence', () => {
    // Due at 1000, 2000, …; each fires on the first 16 ms frame at or after it — never drifting later.
    const plain = interpreterTrace(1000, frames({ 0: ['start'] }, 5008)).events.filter((e) => e[0] === 'tick');
    expect(plain.map((e) => e[1])).toEqual([1008, 2000, 3008, 4000, 5008]);
    const gap = interpreterTrace(1000, [...frames({ 0: ['start'] }, 1500), ...frames({}, 13100, 16, 10500)]).events.filter((e) => e[0] === 'tick');
    // The tick due at 2000 fires once in the 10.5 s frame; the next is on the beat, due 11000 (the frame at 11012), not a burst of eight.
    expect(gap.map((e) => [e[1], e[2]])).toEqual([[1008, 1], [10500, 2], [11012, 3], [12004, 4], [13012, 5]]);
    // The Interval change at 2500 is read by the tick due at 3000, which schedules the next one 250 later.
    const changed = interpreterTrace(1000, frames({ 0: ['start'], 2500: [{ interval: 250 }] }, 5000)).events.filter((e) => e[0] === 'tick');
    expect(changed.map((e) => e[1])).toEqual([1008, 2000, 3008, 3264, 3504, 3760, 4000, 4256, 4512, 4752]);
    // Stop then Start inside Tick 2 (at 1008): Start re-bases the beat (due 1508), the tick path then adds one more beat (2008)
    // and re-arms the one timer with that duration — so the next tick, Count 1, is at 2016, and no second timer exists.
    const restarted = interpreterTrace(500, frames({ 0: ['start'] }, 5000), { 2: ['stop', 'start'] }).events.filter((e) => e[0] === 'tick');
    expect(restarted.map((e) => [e[1], e[2]])).toEqual([[512, 1], [1008, 2], [2016, 1], [2512, 2], [3008, 3], [3520, 4], [4016, 5], [4512, 6]]);
    const failed = emittedTrace(repeatLibSource(), 0, frames({ 0: ['start'] }, 100));
    expect(failed.events.slice(0, 2)).toEqual([
      ['failure', 0, 0, 'repeat/interval-not-positive', 'Interval is 0, and Repeat needs a number of milliseconds above zero'],
      ['completed', 0, 0]
    ]);
    expect(failed.raised).toEqual([{ code: 'repeat/interval-not-positive', message: 'Interval is 0, and Repeat needs a number of milliseconds above zero', nodeId: 'beat', nodeType: 'Repeat', componentName: '/Pages/Beat' }]);
  });

  /** 🔴 The controls: copies that each break one rule must disagree with the interpreter on the script that grades it. */
  it('a copy that replays missed ticks disagrees', () => {
    const source = repeatLibSource();
    const skip = '  if (s.nextAt <= now) {\n';
    expect(source.split(skip).length - 1).toBe(1);
    const broken = source.replace(skip, '  if (false) {\n');
    const script = [...frames({ 0: ['start'] }, 1500), ...frames({}, 13000, 16, 10500)];
    expect(emittedTrace(broken, 1000, script).events).not.toEqual(interpreterTrace(1000, script).events);
  });

  it('a copy without the running guard disagrees', () => {
    const source = repeatLibSource();
    const guard = '      if (s.running) {\n        reportOutcome(s, \'unchanged\');\n        return;\n      }\n';
    expect(source.split(guard).length - 1).toBe(1);
    const broken = source.replace(guard, '');
    const script = frames({ 0: ['start'], 400: ['start'] }, 3000);
    expect(emittedTrace(broken, 1000, script).events).not.toEqual(interpreterTrace(1000, script).events);
  });

  it('isUsableInterval is the node’s test', () => {
    const lib = loadRepeatLib();
    expect([1, 0.5, 1000].map(lib.isUsableInterval)).toEqual([true, true, true]);
    expect([0, -1, Number.NaN, Number.POSITIVE_INFINITY, '500', null, undefined, true].map(lib.isUsableInterval)).toEqual([false, false, false, false, false, false, false, false]);
    expect(lib.REPEAT_ERROR_INTERVAL_NOT_POSITIVE).toBe('repeat/interval-not-positive');
  });
});

/** A hook harness: refs, a reducer that marks the render dirty, effects with deps and cleanups. */
function makeHarness() {
  const slots: any[] = [];
  const effects: Array<{ deps?: unknown[]; cleanup?: () => void } | undefined> = [];
  let cursor = 0;
  let pending: Array<{ slot: number; fn: () => void | (() => void); deps?: unknown[] }> = [];
  const same = (a?: unknown[], b?: unknown[]) => a !== undefined && b !== undefined && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const harness = {
    publishes: 0,
    React: {
      useRef: (v: unknown) => {
        const i = cursor++;
        if (slots[i] === undefined) slots[i] = { current: v };
        return slots[i];
      },
      useReducer: (r: (s: any, a?: any) => any, init: any) => {
        const i = cursor++;
        if (slots[i] === undefined) slots[i] = { state: init };
        const slot = slots[i];
        return [
          slot.state,
          (a?: any) => {
            slot.state = r(slot.state, a);
            harness.publishes++;
          }
        ];
      },
      useEffect: (fn: () => void | (() => void), deps?: unknown[]) => {
        pending.push({ slot: cursor++, fn, deps });
      }
    },
    render<T>(component: () => T): T {
      cursor = 0;
      pending = [];
      const out = component();
      for (const e of pending) {
        const prev = effects[e.slot];
        if (prev !== undefined && same(prev.deps, e.deps)) continue;
        prev?.cleanup?.();
        const cleanup = e.fn();
        effects[e.slot] = { deps: e.deps, cleanup: typeof cleanup === 'function' ? cleanup : undefined };
      }
      return out;
    },
    unmount() {
      for (const e of effects) e?.cleanup?.();
    }
  };
  return harness;
}

describe('GAM-013 §A — useRepeat, under a hook harness', () => {
  const mount = (options: Record<string, unknown>) => {
    const harness = makeHarness();
    const lib = loadRepeatLib(repeatLibSource(), [], harness.React);
    const time = scriptedClock();
    const log: string[] = [];
    const current = { options };
    const on = { tick: () => log.push('tick'), done: () => log.push('done'), unchanged: () => log.push('unchanged') };
    const render = () => harness.render(() => lib.useRepeat(SOURCE, current.options, on, time.clock));
    const handle = render();
    return { harness, time, log, current, render, handle };
  };
  const at = (m: ReturnType<typeof mount>, t: number) => {
    m.time.setNow(t);
    m.time.fireDue();
  };

  it('one beat per mount: the handle is stable, Count is live, and every tick re-renders', () => {
    const m = mount({ interval: 1000 });
    expect(m.render()).toBe(m.handle);
    m.handle.start();
    for (let t = 100; t <= 3000; t += 100) at(m, t);
    expect(m.log).toEqual(['done', 'tick', 'tick', 'tick']);
    expect(m.handle.count).toBe(3);
    expect(m.harness.publishes).toBe(3);
  });

  it('unmount is the delete listener: the beat stops, no timeout is left, no outcome fires', () => {
    const m = mount({ interval: 1000 });
    m.handle.start();
    at(m, 1000);
    m.harness.unmount();
    expect(m.time.pending()).toBe(0);
    for (let t = 1100; t <= 5000; t += 100) at(m, t);
    expect(m.log).toEqual(['done', 'tick']);
  });

  it('an undefined option is no delivery (the Interval keeps its last value); a new one lands from the next tick', () => {
    const m = mount({ interval: 400 });
    m.current.options = { interval: undefined };
    m.render();
    m.handle.start();
    at(m, 400);
    m.current.options = { interval: 100 };
    m.render();
    at(m, 800);
    at(m, 900);
    expect(m.log).toEqual(['done', 'tick', 'tick', 'tick']);
    const unset = mount({});
    unset.handle.start();
    at(unset, 999);
    at(unset, 1000);
    expect(unset.log).toEqual(['done', 'tick']);
  });
});

// ---- §B the translation --------------------------------------------------------------------------------------------

const PAGE = 'Pages/Beat';
const PAGE_FILE = 'src/pages/Beat.tsx';
const baseIr = parseProject(FIXTURE, catalog);
const cloneIr = (): ExportIR => structuredClone(baseIr);
const componentOf = (source: ExportIR): ComponentIR => source.components.find((c) => c.path === PAGE)!;
const nodeOf = (source: ExportIR, id: string): NodeIR => componentOf(source).nodes.find((n) => n.id === id)!;
const planOf = (source: ExportIR): ComponentPlan => planProject(source, index).plans.find((p) => p.path === PAGE)!;
const setParam = (node: NodeIR, name: string, value: ParamValue | undefined) => {
  node.parameters = node.parameters.filter((p) => p.name !== name);
  if (value !== undefined) node.parameters.push({ name, value });
};
const connect = (component: ComponentIR, fromId: string, fromProperty: string, toId: string, toProperty: string, kind: ConnectionIR['kind'] = 'signal') => {
  component.connections.push({ key: `${fromId}:${fromProperty}->${toId}:${toProperty}`, fromId, fromProperty, toId, toProperty, kind });
};
const addNode = (component: ComponentIR, node: Partial<NodeIR> & { id: string; type: string }): NodeIR => {
  const full = { catalogRef: node.type, parameters: [], declaredPorts: [], portKnowledge: 'complete', ...node } as NodeIR;
  component.nodes.push(full);
  return full;
};
const refusalOf = (source: ExportIR, id: string) => emitApp(source, catalog).report.components.find((c) => c.path === PAGE)?.refusals?.find((r) => r.nodeId === id);
const sentence = (mutate: (ir: ExportIR, page: ComponentIR) => void): string | undefined => {
  const ir = cloneIr();
  mutate(ir, componentOf(ir));
  return refusalOf(ir, 'beat')?.reason;
};

const HOOK_LINE =
  "  const beat = useRepeat({ label: 'Beat', nodeId: 'beat', componentName: '/Pages/Beat' }, { interval: 1000 }, {\n" +
  '    tick: () => setSeconds((v) => v + 1),\n' +
  "    done: () => outcome.set('Done'),\n" +
  "    unchanged: () => outcome.set('Unchanged'),\n" +
  "    failure: () => outcome.set('Failure')\n" +
  '  });';

describe('GAM-013 §B — the translation', () => {
  const app = emitApp(baseIr, catalog);
  const page = app.files[PAGE_FILE];
  const plan = planOf(baseIr);

  it('B1 the table row is the catalog’s port set for Repeat: 1 config + 2 actions in, 5 signals + 1 value out', () => {
    const spec = STREAM_NODES[REPEAT_TYPE];
    const node = catalog.nodes.find((n) => n.typeName === REPEAT_TYPE)!;
    expect([...spec.config.map((c) => c.port), ...Object.keys(spec.actions)].sort()).toEqual((node.inputs ?? []).map((p) => p.name).sort());
    expect([...spec.signals, ...Object.keys(spec.values)].sort()).toEqual((node.outputs ?? []).map((p) => p.name).sort());
    expect(spec.data).toBeUndefined();
    expect(spec.values.count).toEqual({ tsType: 'number', cast: 'number', maybeUndefined: false });
    expect(spec).toMatchObject({ kind: 'repeat', hook: 'useRepeat', lib: 'repeat', sourceFile: 'repeat.ts' });
  });

  it('B2 the plan: one stream of kind repeat, the Interval its config, the four wired listeners in the table’s order; the node collapsed', () => {
    const beat = plan.streams.find((s) => s.nodeId === 'beat')!;
    expect(beat).toMatchObject({ type: REPEAT_TYPE, kind: 'repeat', label: 'Beat', local: 'beat' });
    expect(beat.config).toEqual([{ port: 'interval', expr: { kind: 'literal', value: 1000 } }]);
    expect(Object.keys(beat.listeners)).toEqual(['tick', 'done', 'unchanged', 'failure']);
    expect(plan.dispositions['beat']).toEqual({ kind: 'collapsed', into: PAGE_FILE });
  });

  it('B3 the page: the import, the hook line, the verbs, Count as a String() read; repeat.ts and errors.ts shipped, timer.ts and streaming.ts not', () => {
    expect(page).toContain("import { useRepeat } from '../lib/repeat';");
    expect(page).toContain('  // Beat — a Repeat (repeat.ts), hosted by repeat.ts; its value outputs read live off the handle.\n' + HOOK_LINE);
    expect(page).toContain('<button onClick={() => beat.start()}>Start</button>');
    expect(page).toContain('<button onClick={() => beat.stop()}>Stop</button>');
    expect(page).toContain('<p className={styles.text}>{String(beat.count)}</p>');
    expect(page).toContain('<p className={styles.text}>{seconds}</p>');
    expect(app.files[REPEAT_LIB_PATH]).toContain('export function useRepeat(');
    expect(app.files[ERRORS_LIB_PATH]).toBeDefined();
    expect(app.files[TIMER_LIB_PATH]).toBeUndefined();
    expect(app.files[STREAMING_LIB_PATH]).toBeUndefined();
  });

  it('B4 an unset Interval passes no option (the hook keeps initialize’s 1000); a wired one is read at render; Completed is a listener', () => {
    const unset = cloneIr();
    setParam(nodeOf(unset, 'beat'), 'interval', undefined);
    expect(emitApp(unset, catalog).files[PAGE_FILE]).toContain("componentName: '/Pages/Beat' }, {}, {");
    const wired = cloneIr();
    addNode(componentOf(wired), { id: 'rate', type: 'Number', parameters: [{ name: 'value', value: { kind: 'literal', value: 250 } }] });
    connect(componentOf(wired), 'rate', 'savedValue', 'beat', 'interval', 'value');
    const wiredPage = emitApp(wired, catalog).files[PAGE_FILE];
    expect(refusalOf(wired, 'beat')).toBeUndefined();
    expect(wiredPage).toContain("componentName: '/Pages/Beat' }, { interval: 250 }, {");
    const completed = cloneIr();
    connect(componentOf(completed), 'beat', 'completed', 'setDone', 'do');
    const completedPage = emitApp(completed, catalog).files[PAGE_FILE];
    expect(refusalOf(completed, 'beat')).toBeUndefined();
    expect(completedPage).toContain("    completed: () => outcome.set('Done'),");
  });

  it('B5 a Repeat nothing starts or stops still exports (the runtime instance exists and never ticks), and prints no verb', () => {
    const idle = cloneIr();
    componentOf(idle).connections = componentOf(idle).connections.filter((c) => c.toId !== 'beat');
    const out = emitApp(idle, catalog);
    expect(refusalOf(idle, 'beat')).toBeUndefined();
    expect(out.files[PAGE_FILE]).toContain('const beat = useRepeat(');
    expect(out.files[PAGE_FILE]).not.toContain('beat.start()');
    expect(out.files[PAGE_FILE]).not.toContain('beat.stop()');
    expect(out.notes.filter((n) => n.startsWith(PAGE))).toEqual([]);
  });

  it('B7 a Tick wire listed before the wire that starts the node is not reported dropped (the wire-order row §39.3 found)', () => {
    const ir = cloneIr();
    const pageIr = componentOf(ir);
    const tick = pageIr.connections.find((c) => c.fromId === 'beat' && c.fromProperty === 'tick')!;
    const done = pageIr.connections.find((c) => c.fromId === 'beat' && c.fromProperty === 'done')!;
    pageIr.connections = [tick, done, ...pageIr.connections.filter((c) => c !== tick && c !== done)];
    const out = emitApp(ir, catalog);
    expect(out.notes.filter((n) => n.startsWith(PAGE))).toEqual([]);
    expect(out.files[PAGE_FILE]).toContain('    tick: () => setSeconds((v) => v + 1),');
  });

  it('B6 refuses by name: two wires on the Interval, a handler-only Interval, a pulse read as a value, a port the node has not got', () => {
    expect(
      sentence((_ir, pageIr) => {
        addNode(pageIr, { id: 'rateA', type: 'Number', parameters: [{ name: 'value', value: { kind: 'literal', value: 250 } }] });
        addNode(pageIr, { id: 'rateB', type: 'Number', parameters: [{ name: 'value', value: { kind: 'literal', value: 500 } }] });
        connect(pageIr, 'rateA', 'savedValue', 'beat', 'interval', 'value');
        connect(pageIr, 'rateB', 'savedValue', 'beat', 'interval', 'value');
      })
    ).toBe('two wires feed its Interval input — last-writer-wins is not statically ordered');
    expect(
      sentence((_ir, pageIr) => {
        connect(pageIr, 'beat', 'tick', 'ticksText', 'text', 'value');
      })
    ).toBe('its tick output is consumed as a value — a pulse carries nothing to read');
    expect(
      sentence((_ir, pageIr) => {
        connect(pageIr, 'beat', 'finished', 'setDone', 'do');
      })
    ).toBe('its finished output is consumed, and this node has no such port');
    expect(
      sentence((_ir, pageIr) => {
        connect(pageIr, 'rateMissing', 'value', 'beat', 'duration', 'value');
      })
    ).toBe('its duration input is not a port this node has');
    const handlerOnly = sentence((_ir, pageIr) => {
      addNode(pageIr, { id: 'rateInput', type: 'net.noodl.controls.textinput', parent: 'shell' } as never);
      const shell = pageIr.nodes.find((n) => n.id === 'shell') as NodeIR & { children?: string[] };
      shell.children = [...(shell.children ?? []), 'rateInput'];
      connect(pageIr, 'rateInput', 'onTextChanged', 'beat', 'interval', 'value');
    });
    expect(handlerOnly).toBe('its Interval input reads a value that only exists inside a handler');
  });
});

// ---- §C the project, typechecked whole ------------------------------------------------------------------------------

describe('GAM-013 §C — tests/fixtures/beat-desk', () => {
  const app = emitApp(baseIr, catalog);

  it('exports whole: no refusal, the router shell note alone', () => {
    expect(app.report.components.flatMap((c) => c.refusals ?? [])).toEqual([]);
    expect(app.notes.filter((n) => !n.startsWith('App:'))).toEqual([]);
  });

  it('typechecks, repeat.ts included', () => {
    expect(Object.keys(app.files)).toEqual(expect.arrayContaining([REPEAT_LIB_PATH, ERRORS_LIB_PATH, PAGE_FILE]));
    expect(typecheckEmittedApp(app)).toEqual([]);
  });
});

// ---- the ledger ----------------------------------------------------------------------------------------------------

describe('GAM-013 — the ledger', () => {
  it('Repeat is translated with a note, carries no badge, and the floor and total moved together', () => {
    expect(ledgerEntryOf(REPEAT_TYPE)?.status).toBe('translated');
    expect(exportBadgeOf(REPEAT_TYPE)).toBeUndefined();
    const ledger = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'coverage-ledger.json'), 'utf8'));
    const row = (ledger.entries as Array<{ typeName: string; note?: string; exemption?: string }>).find((e) => e.typeName === REPEAT_TYPE)!;
    expect(row.exemption).toBeUndefined();
    expect(String(row.note)).toContain('useRepeat');
    expect(String(row.note)).toContain('What this row cannot see');
    expect(ledger.pickerCoverageFloor).toBe(118); // GAM-013 Repeat (P88)
    // 128 → 130 at P96/FED-002 (2026-09-18): `Parse Feed` and `Parse XML` entered the picker with
    // FED-001 and are `scheduled`, not translated — so the total moved and the floor did not,
    // which is the opposite of what GAM-013's own row did and is why this line says which.
    expect(ledger.pickerCoverageTotal).toBe(130); // P96 FED-001's two parsers on top of GAM-013 Repeat (P88)
    expect(String(ledger.$pickerCoverageFloorComment)).toContain('118 of 128 after GAM-013 (P88) Repeat');
  });
});
