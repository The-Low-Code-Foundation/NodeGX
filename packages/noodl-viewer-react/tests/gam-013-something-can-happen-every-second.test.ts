/**
 * GAM-013 (P78 D40) — something can happen every second without a script.
 *
 * R1 (Richard, 2026-09-17): a new `Repeat` node (Start, Stop, Interval → Tick, Count), not a Repeat option on
 * Delay; it stops when its page is navigated away from; no ticks during server render.
 *
 * Everything here runs on the runtime's own scheduler, advanced by `graph.frame(dt)`, the same three steps
 * `NoodlRuntime._doUpdate` takes. No fake timers: a node on a raw `setInterval` would grade a different clock (§7).
 */

/* eslint-env jest */

(globalThis as Record<string, any>).Noodl = { deployed: true, baseUrl: '/' };

import * as fs from 'node:fs';
import * as path from 'node:path';

import type { NodeInstance, NodeModule } from '@noodl/types';

import { createCorpusGraph, type CorpusGraph } from '../../noodl-runtime/test/corpus/graph-harness';

import RepeatModule from '../src/nodes/std-library/repeat';
import TimerModule from '../src/nodes/std-library/timer';

// =================================================================================================
// AC1 — the census: does anything in the logic library fire more than once from one action?
// =================================================================================================

const LIBRARY_DIRS = [
  path.join(__dirname, '..', 'src', 'nodes', 'std-library'),
  path.join(__dirname, '..', '..', 'noodl-runtime', 'src', 'nodes', 'std-library')
];

interface Definition {
  name: string;
  inputs?: Record<string, { type?: unknown; valueChangedToTrue?: unknown }>;
  outputs?: Record<string, { type?: unknown }>;
}

function nodeFilesUnder(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return nodeFilesUnder(full);
    return /\.(ts|js)$/.test(entry.name) && !/\.d\.ts$/.test(entry.name) ? [full] : [];
  });
}

function definitionsIn(file: string): Definition[] {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const loaded = require(file);
  const candidates = [loaded, loaded?.default, ...Object.values(loaded ?? {})];
  const found: Definition[] = [];
  for (const candidate of candidates) {
    const def = candidate?.node ?? candidate;
    if (def && typeof def === 'object' && typeof def.name === 'string' && (def.inputs || def.outputs)) {
      if (!found.some((f) => f.name === def.name)) found.push(def);
    }
  }
  return found;
}

const isSignal = (port: { type?: unknown; valueChangedToTrue?: unknown }) =>
  port.type === 'signal' || (port.type as { name?: string })?.name === 'signal' || typeof port.valueChangedToTrue === 'function';

/** Outcome ports fire once per invocation by contract; they are not what "repeats" means. */
const OUTCOME_PORTS = new Set(['done', 'completed', 'unchanged', 'failure']);

interface CensusRow {
  type: string;
  action: string;
  most: { output: string; count: number } | null;
}

/**
 * A signal can fire again with no new input only if something in the node holds a clock. So the census probes the
 * node files that reach for one, and names every file it read, so "found none" is about a list, not a guess.
 */
const CLOCK = /timerScheduler|setTimeout|setInterval|requestAnimationFrame/;

async function census(): Promise<{
  clockFiles: string[];
  rows: CensusRow[];
  notRun: Array<{ type: string; reason: string }>;
  /** How many times Delay's Finished fired for one Start: the known-firing half. */
  finished: number;
}> {
  const clockFiles = LIBRARY_DIRS.flatMap(nodeFilesUnder).filter((file) => CLOCK.test(fs.readFileSync(file, 'utf8')));
  const definitions = clockFiles.flatMap((file) => {
    try {
      return definitionsIn(file);
    } catch {
      return [];
    }
  });
  const rows: CensusRow[] = [];
  let finished = -1;
  const notRun: Array<{ type: string; reason: string }> = [];

  for (const def of definitions) {
    const actions = Object.entries(def.inputs ?? {}).filter(([, port]) => isSignal(port));
    const signalOutputs = Object.entries(def.outputs ?? {})
      .filter(([name, port]) => isSignal(port) && !OUTCOME_PORTS.has(name))
      .map(([name]) => name);
    if (actions.length === 0 || signalOutputs.length === 0) continue;

    for (const [action] of actions) {
      let graph: CorpusGraph;
      try {
        graph = await createCorpusGraph({
          modules: [{ node: def } as unknown as NodeModule],
          data: { components: [{ name: '/root', nodes: [{ id: 'probe', type: def.name, parameters: probeParameters(def) }] }] } as never
        });
        const probe = graph.node('probe');
        probe.setInputValue(action, true);
        graph.update();
        probe.setInputValue(action, false);
        // Five seconds of 16 ms frames.
        for (let i = 0; i < 313; i++) graph.frame(16);
      } catch (error) {
        notRun.push({ type: def.name, reason: String((error as Error).message ?? error).slice(0, 120) });
        continue;
      }
      const signals = graph.signalsFor('probe');
      if (def.name === 'Timer' && action === 'start') finished = signals.filter((x) => x === 'timerFinished').length;
      const counts = signalOutputs.map((output) => ({ output, count: signals.filter((s) => s === output).length }));
      const most = counts.sort((a, b) => b.count - a.count)[0];
      rows.push({ type: def.name, action, most: most && most.count > 0 ? most : null });
    }
  }
  return { clockFiles: clockFiles.map((f) => path.relative(path.join(__dirname, '..', '..'), f)), rows, notRun, finished };
}

/** A short Duration for Delay, so its one-shot lands inside the five seconds; an Interval for Repeat. */
function probeParameters(def: Definition): Record<string, unknown> {
  if (def.name === 'Timer') return { duration: 100 };
  if (def.name === 'Repeat') return { interval: 1000 };
  return {};
}

describe('GAM-013 AC1: the logic library census, one action, five seconds', () => {
  let result: Awaited<ReturnType<typeof census>>;
  beforeAll(async () => {
    // Nodes under probe log freely (a Function with no script, a request with no URL); none of it is under test.
    const quiet = ['log', 'warn', 'error', 'info'].map((k) => jest.spyOn(console, k as 'log').mockImplementation(() => undefined));
    try {
      result = await census();
    } finally {
      quiet.forEach((spy) => spy.mockRestore());
    }
  }, 60_000);

  test("known-firing: Delay's Start fires Finished exactly once", () => {
    expect(result.finished).toBe(1);
  });

  test('Repeat is the only node whose one Start fires a signal more than once, and it fires 5 in 5 s', () => {
    const repeating = result.rows.filter((r) => r.most && r.most.count > 1);
    expect(repeating).toEqual([{ type: 'Repeat', action: 'start', most: { output: 'tick', count: 5 } }]);
  });

  test('the census ran over the library it names (it is not an empty sweep)', () => {
    // eslint-disable-next-line no-console
    console.log(
      'GAM013 census',
      JSON.stringify({
        clockFiles: result.clockFiles,
        probed: result.rows,
        notRun: result.notRun
      })
    );
    expect(result.rows.map((r) => r.type)).toEqual(expect.arrayContaining(['Timer', 'Repeat']));
  });
});

// =================================================================================================
// The node
// =================================================================================================

interface Placed {
  graph: CorpusGraph;
  repeat: NodeInstance & { _internal: { running: boolean; count: number } };
  ticks(): number;
  /** Count, read through its output port the way a wire reads it. */
  count(): unknown;
  outcomes(): string[];
  press(port: string): void;
  seconds(s: number, dt?: number): void;
}

async function place(parameters: Record<string, unknown> = { interval: 1000 }): Promise<Placed> {
  const graph = await createCorpusGraph({
    modules: [RepeatModule as unknown as NodeModule],
    data: { components: [{ name: '/root', nodes: [{ id: 'repeat', type: 'Repeat', parameters }] }] } as never
  });
  const repeat = graph.node('repeat') as unknown as Placed['repeat'];
  // The page's first update, which delivers the parameters. A signal cannot arrive before it on a real page.
  graph.update();
  return {
    graph,
    repeat,
    ticks: () => graph.signalsFor('repeat').filter((s) => s === 'tick').length,
    count: () => (repeat.getOutput('count') as unknown as { value: unknown }).value,
    outcomes: () => graph.signalsFor('repeat').filter((s) => ['done', 'unchanged', 'failure'].includes(s)),
    press(port: string) {
      repeat.setInputValue(port, true);
      graph.update();
      repeat.setInputValue(port, false);
      graph.update();
    },
    seconds(s: number, dt = 16) {
      for (let t = 0; t < s * 1000; t += dt) graph.frame(dt);
    }
  };
}

describe('GAM-013: Repeat ticks once an Interval', () => {
  test('five seconds after Start: 5 ticks and Count 5; the first tick is one Interval after Start', async () => {
    const r = await place();
    r.press('start');
    r.seconds(0.98);
    expect(r.ticks()).toBe(0);
    r.seconds(4.02);
    expect({ ticks: r.ticks(), count: r.count() }).toEqual({ ticks: 5, count: 5 });
  });

  test('no drift: 60 seconds of 16 ms frames gives 60 ticks, not 59', async () => {
    const r = await place();
    r.press('start');
    r.seconds(60.005);
    expect(r.ticks()).toBe(60);
  });

  test('no catch-up burst: a 10 s frame (a throttled tab) fires one tick, and the beat keeps its phase', async () => {
    const r = await place();
    r.press('start');
    r.seconds(2.4); // ticks at 1 s and 2 s
    expect(r.ticks()).toBe(2);
    r.graph.frame(10_000); // 12.4 s: ten ticks were due
    expect(r.ticks()).toBe(3);
    r.seconds(0.5); // 12.9 s: the next beat is 13 s, not 13.4 s
    expect(r.ticks()).toBe(3);
    r.seconds(0.2);
    expect(r.ticks()).toBe(4);
  });

  test('Stop stops ticking and keeps Count; the next Start begins again from 0', async () => {
    const r = await place();
    r.press('start');
    r.seconds(3.05);
    r.press('stop');
    r.seconds(3);
    expect({ ticks: r.ticks(), count: r.count() }).toEqual({ ticks: 3, count: 3 });
    r.press('start');
    r.graph.update();
    expect(r.count()).toBe(0);
    r.seconds(1.05);
    expect(r.count()).toBe(1);
  });

  test('a change of Interval while running takes effect from the next tick', async () => {
    const r = await place();
    r.press('start');
    r.seconds(1.05); // tick at 1 s
    r.repeat.setInputValue('interval', 250);
    r.seconds(0.9); // 1.95 s: the 2 s tick was already scheduled on the old beat
    expect(r.ticks()).toBe(1);
    r.seconds(0.1); // 2.05 s: tick at 2 s, next at 2.25
    expect(r.ticks()).toBe(2);
    r.seconds(0.5); // 2.55 s: 2.25, 2.5
    expect(r.ticks()).toBe(4);
  });
});

describe('GAM-013 AC4: Start, Start, Stop, Start is one running interval', () => {
  test('the second Start reports Unchanged, and the sequence ticks once a second', async () => {
    const r = await place();
    r.press('start');
    r.press('start');
    r.press('stop');
    r.press('start');
    expect(r.outcomes()).toEqual(['done', 'unchanged', 'done', 'done']);
    r.seconds(5.05);
    expect(r.ticks()).toBe(5);
  });

  test('two Starts in the same update, before any frame, still give one interval', async () => {
    const r = await place();
    r.repeat.setInputValue('start', true);
    r.repeat.setInputValue('start', false);
    r.repeat.setInputValue('start', true);
    r.graph.update();
    r.seconds(3.05);
    expect(r.ticks()).toBe(3);
  });

  test('Stop with nothing running reports Unchanged', async () => {
    const r = await place();
    r.press('stop');
    expect(r.outcomes()).toEqual(['unchanged']);
  });

  test('a Start with an Interval of 0 fails, with a reason, and never ticks', async () => {
    const r = await place({ interval: 0 });
    r.press('start');
    r.seconds(1);
    expect({ outcomes: r.outcomes(), ticks: r.ticks() }).toEqual({ outcomes: ['failure'], ticks: 0 });
    expect(r.graph.errors.map((e) => e.code)).toContain('repeat/interval-not-positive');
  });
});

describe('GAM-013 AC3: deleting the node stops it', () => {
  test('started, deleted, five seconds: zero ticks and nothing left on the scheduler', async () => {
    const r = await place();
    r.press('start');
    r.seconds(1.05);
    expect(r.ticks()).toBe(1);
    (r.repeat as unknown as { _onNodeDeleted(): void })._onNodeDeleted();
    r.seconds(5);
    const scheduler = (r.graph.context as unknown as { timerScheduler: { newTimers: unknown[]; runningTimers: unknown[] } })
      .timerScheduler;
    expect({ ticks: r.ticks(), timers: scheduler.newTimers.length + scheduler.runningTimers.length }).toEqual({
      ticks: 1,
      timers: 0
    });
  });

  test('deleted from inside its own Tick (a page left on a tick): no further ticks', async () => {
    const r = await place();
    const node = r.repeat as unknown as { sendSignalOnOutput(name: string): void; _onNodeDeleted(): void };
    const send = node.sendSignalOnOutput.bind(node);
    node.sendSignalOnOutput = (name: string) => {
      send(name);
      if (name === 'tick') node._onNodeDeleted();
    };
    r.press('start');
    r.seconds(1.05);
    // Read straight after the tick: a timer re-armed after its node was deleted would tick into nothing a beat
    // later and then stop, so a tick count alone cannot see it. The scheduler can.
    const scheduler = (r.graph.context as unknown as { timerScheduler: { newTimers: unknown[]; runningTimers: unknown[] } })
      .timerScheduler;
    expect({ ticks: r.ticks(), timers: scheduler.newTimers.length + scheduler.runningTimers.length }).toEqual({
      ticks: 1,
      timers: 0
    });
    r.seconds(3);
    expect(r.ticks()).toBe(1);
  });
});

describe('GAM-013: Delay is unchanged (AC6 for ruling (a): no existing port list moves)', () => {
  test("Delay's ports are the ones it had", () => {
    const node = (TimerModule as unknown as { node: Definition }).node;
    expect({ inputs: Object.keys(node.inputs ?? {}), outputs: Object.keys(node.outputs ?? {}) }).toEqual({
      inputs: ['start', 'restart', 'duration', 'startDelay', 'stop'],
      outputs: ['timerStarted', 'timerFinished', 'done', 'completed', 'unchanged']
    });
  });
});

describe('GAM-013 AC5: a server render', () => {
  /**
   * The SSR server's platform, as far as the scheduler reads it: `isSSRServer`, a clock frozen at 0
   * (`noodl-viewer-react.js`'s server platform), and every `scheduleUpdate` counted. `render-gate.js`'s `settle` calls the
   * render quiet only after ten turns with no update scheduled, and gives up at 3000.
   */
  function serverRender() {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const NodeContext = require('../../noodl-runtime/src/nodecontext');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const NodeDefinition = require('../../noodl-runtime/src/nodedefinition');
    let requested = 0;
    const context = new NodeContext({
      platform: {
        isSSRServer: () => true,
        getCurrentTime: () => 0,
        requestUpdate: () => undefined,
        objectToString: (o: unknown) => JSON.stringify(o)
      }
    });
    // `NodeContext.scheduleUpdate` is an event the runtime turns into `platform.requestUpdate`; count the event.
    context.eventEmitter.on('scheduleUpdate', () => {
      requested++;
    });
    context.nodeRegister.register(NodeDefinition.defineNode((RepeatModule as unknown as { node: Definition }).node));
    const node = context.nodeRegister.createNode('Repeat', 'repeat');
    const signals: string[] = [];
    const send = node.sendSignalOnOutput.bind(node);
    node.sendSignalOnOutput = (name: string) => {
      signals.push(name);
      send(name);
    };
    return { context, node, signals, requested: () => requested };
  }

  test('a Start on the server (Did Mount fires there) ticks 0 times and leaves nothing that keeps the render from going quiet', () => {
    const quiet = ['log', 'warn'].map((k) => jest.spyOn(console, k as 'log').mockImplementation(() => undefined));
    try {
      const r = serverRender();
      r.node.setInputValue('start', true);
      r.context.update();
      const before = r.requested();
      for (let i = 0; i < 100; i++) r.context.update();
      expect({
        ticks: r.signals.filter((s) => s === 'tick').length,
        pendingTimers: r.context.timerScheduler.hasPendingTimers(),
        updatesRequestedOver100Turns: r.requested() - before
      }).toEqual({ ticks: 0, pendingTimers: false, updatesRequestedOver100Turns: 0 });
    } finally {
      quiet.forEach((s) => s.mockRestore());
    }
  });

  test("the node's ssr note says so", () => {
    const node = (RepeatModule as unknown as { node: { ssr: { compat: string; note: string } } }).node;
    expect(node.ssr.note).toContain('server render');
  });
});
