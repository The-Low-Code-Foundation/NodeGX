import * as fs from 'fs';
import * as path from 'path';

import * as ts from 'typescript';

import { Catalog, CatalogIndex, loadCatalog } from '../src/catalog';
import { ComponentPlan, planProject } from '../src/analyze/plan';
import { emitApp } from '../src/emit/emitApp';
import { ACTIONS_LIB_PATH, actionsLibSource } from '../src/emit/actionsLib';
import { exportBadgeOf, ledgerEntryOf } from '../src/ledger';
import { parseProject } from '../src/parse/parseProject';
import { typecheckEmittedApp } from './helpers/typecheckApp';
import { ComponentIR, ConnectionIR, ExportIR, NodeIR, ParamValue } from '../src/ir/types';

/**
 * EXP-011 §77 — `Action Dispatcher` (`net.noodl.ActionDispatcher`) and `Action Handler` (`net.noodl.ActionHandler`): the
 * streaming table's eighth and ninth members, one module (`src/lib/actions.ts`) holding the app's one registry.
 *
 * Built on `tests/fixtures/action-desk`: a text input feeds a Variable that feeds the Dispatcher's Action (channel desk,
 * Wait For Handler 500); Dispatch and Cancel All are buttons; five of its values are Texts; Action Completed writes the
 * Action Type into a Variable. The placed Greeter holds two Handlers on the same channel — GREET completes on its own and
 * its Trigger writes its own Payload into a Variable; SLOW has Auto Complete off with Complete and Fail as buttons. A
 * Dispatcher and its Handlers sit in two components and meet only through the channel name.
 *
 * §A the fixture whole · §B the lib's registry and queue against the runtime's own (a differential over seeded scripts,
 * not a reading) · §C the shapes a wire changes and the refusals · §D what building it found · §E the ledger.
 * The node shells are graded on the export by the graph scenarios (t04, `tests/node-spec-graph.test.ts`).
 */

const FIXTURE = path.join(__dirname, 'fixtures', 'action-desk');
const RUNTIME_SRC = path.join(__dirname, '..', '..', 'noodl-runtime', 'src');
const catalog: Catalog = loadCatalog();
const index = new CatalogIndex(catalog);
const baseIr = parseProject(FIXTURE, catalog);
const app = emitApp(baseIr, catalog);

const HOME = 'Pages/Home';
const GREETER = 'Components/Greeter';

const cloneIr = (): ExportIR => structuredClone(baseIr);
const componentOf = (source: ExportIR, componentPath: string): ComponentIR => source.components.find((c) => c.path === componentPath)!;
const nodeOf = (source: ExportIR, componentPath: string, id: string): NodeIR => componentOf(source, componentPath).nodes.find((n) => n.id === id)!;
const planOf = (source: ExportIR, componentPath: string): ComponentPlan => planProject(source, index).plans.find((p) => p.path === componentPath)!;
const setParam = (node: NodeIR, name: string, value: ParamValue) => {
  const existing = node.parameters.find((p) => p.name === name);
  if (existing) existing.value = value;
  else node.parameters.push({ name, value });
};
const connect = (component: ComponentIR, fromId: string, fromProperty: string, toId: string, toProperty: string, kind: ConnectionIR['kind'] = 'value') => {
  component.connections.push({ key: `${fromId}:${fromProperty}->${toId}:${toProperty}`, fromId, fromProperty, toId, toProperty, kind });
};
const refusalOf = (source: ExportIR, componentPath: string, nodeId: string): string | undefined => planOf(source, componentPath).refusals.find((r) => r.nodeId === nodeId)?.reason;
const mutated = (componentPath: string, change: (c: ComponentIR) => void): ExportIR => {
  const ir = cloneIr();
  change(componentOf(ir, componentPath));
  return ir;
};

// ---- §A ------------------------------------------------------------------------------------------------------------

describe('§A the fixture whole', () => {
  test('the app typechecks, ships the lib and errors.ts, and nothing in it is refused', () => {
    expect(typecheckEmittedApp(app)).toEqual([]);
    expect(app.files[ACTIONS_LIB_PATH]).toContain(actionsLibSource());
    expect(app.files['src/lib/errors.ts']).toBeDefined();
    expect(app.notes.filter((n) => !n.startsWith('App:'))).toEqual([]);
  });

  test('the Dispatcher prints as one hook with its literal inputs as options, and its Action read at the Dispatch pulse', () => {
    const home = app.files['src/pages/Home.tsx'];
    expect(home).toContain("import { useActionDispatcher } from '../lib/actions';");
    expect(home).toContain("const desk = useActionDispatcher({ label: 'Desk', nodeId: 'desk', componentName: '/Pages/Home' }, { channel: 'desk', waitForHandler: 500 }, {");
    expect(home).toContain('actionCompleted: () => lastDone.set(desk.actionType)');
    expect(home).toContain('<button onClick={() => desk.dispatch(actionText.get())}>Dispatch</button>');
    expect(home).toContain('<button onClick={() => desk.cancel()}>Cancel All</button>');
    // the values are live getters; Result may be undefined, the counts never are
    expect(home).toContain("{String(desk.result ?? '')}");
    expect(home).toContain('{String(desk.completedCount)}');
    expect(home).toContain('// Desk — an Action Dispatcher (actiondispatchernode.ts), hosted by actions.ts');
  });

  test('both Handlers print in the other component, importing the same module — one registry for the app', () => {
    const greeter = app.files['src/components/Greeter.tsx'];
    expect(greeter).toContain("import { useActionHandler } from '../lib/actions';");
    expect(greeter).toContain("useActionHandler({ label: 'Greet', nodeId: 'greet', componentName: '/Components/Greeter' }, { channel: 'desk', actionType: 'GREET', result: 'hello' }, {");
    expect(greeter).toContain('trigger: () => greeting.set(greet.payload)');
    expect(greeter).toContain("{ channel: 'desk', actionType: 'SLOW', autoComplete: false, errorMessage: 'slow failed' });");
    expect(greeter).toContain('<button onClick={() => slow.complete()}>Complete</button>');
    expect(greeter).toContain('<button onClick={() => slow.fail()}>Fail</button>');
    expect(app.files[ACTIONS_LIB_PATH]).toContain('export const actionRegistry = new ActionRegistry();');
  });

  test('an app with neither node ships no actions.ts', () => {
    const ir = cloneIr();
    for (const p of [HOME, GREETER]) {
      const c = componentOf(ir, p);
      c.nodes = c.nodes.filter((n) => n.type !== 'net.noodl.ActionDispatcher' && n.type !== 'net.noodl.ActionHandler');
      const ids = new Set(c.nodes.map((n) => n.id));
      c.connections = c.connections.filter((w) => ids.has(w.fromId) && ids.has(w.toId));
    }
    expect(emitApp(ir, catalog).files[ACTIONS_LIB_PATH]).toBeUndefined();
  });
});

// ---- §B ------------------------------------------------------------------------------------------------------------

type AnyModule = Record<string, any>;
const loadModule = (source: string, stubs: Record<string, unknown>): AnyModule => {
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const module = { exports: {} as AnyModule };
  // eslint-disable-next-line no-new-func
  new Function('require', 'module', 'exports', js)((id: string) => stubs[id] ?? {}, module, module.exports);
  return module.exports;
};
const runtimeBus = () => loadModule(fs.readFileSync(path.join(RUNTIME_SRC, 'nodes', 'std-library', 'agent', 'action-dispatcher.ts'), 'utf8'), { './globalstore': { globalStoreManager: {} } });
const exportBus = () => loadModule(actionsLibSource(), { react: {}, './errors': { raiseAppError: () => undefined } });

/** A seeded generator (mulberry32), so a failing script is reproducible by its seed. */
const rng = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

type Behaviour = 'complete' | 'complete-undefined' | 'hold' | 'fail' | 'throw';
type Op =
  | { op: 'register'; channel: string; type: string; behaviour: Behaviour; result: unknown }
  | { op: 'unregister'; index: number }
  | { op: 'dispatch'; raw: unknown }
  | { op: 'complete'; result: unknown }
  | { op: 'fail'; message: string }
  | { op: 'cancel' }
  | { op: 'advance'; ms: number };

const TYPES = ['A', 'B', 'LATE', 'SET_STORE'];
const ACTION_POOL: unknown[] = [
  { type: 'A', id: 'x1', payload: { n: 1 } },
  { type: 'B', data: 0 },
  { type: 'A' },
  { type: 'LATE', payload: null },
  { type: 'GHOST' },
  [{ type: 'A' }, { type: 'B' }],
  [{ type: 'A' }, 7, { type: '' }, { type: 'B', id: 'b2' }],
  [],
  '{"type":"B","payload":"text"}',
  '[{"type":"A"},{"type":"LATE"}]',
  'not json{',
  '   ',
  null,
  undefined,
  42,
  { type: 'SET_STORE', key: 'count', value: 3 },
  { type: 'SET_STORE', payload: { key: 'secret', value: 1 } },
  { type: 'SET_STORE', key: '' },
  { type: 'MERGE_STORE', values: { count: 1, other: 2 } },
  { type: 'MERGE_STORE', values: 'no' },
  { type: 'DELETE_STORE_KEY', key: 'count' },
  { type: 'CLEAR_STORE' },
  { type: 'SET_STORE', key: 'count', value: { deep: true }, merge: true, storeName: 'elsewhere' }
];
const BEHAVIOURS: Behaviour[] = ['complete', 'complete-undefined', 'hold', 'fail', 'throw'];

const scriptOf = (seed: number, length: number): Op[] => {
  const r = rng(seed);
  const pick = <T>(xs: readonly T[]): T => xs[Math.floor(r() * xs.length)];
  const ops: Op[] = [];
  for (let i = 0; i < length; i++) {
    const roll = r();
    if (roll < 0.2) ops.push({ op: 'register', channel: pick(['', 'default', 'x']), type: pick(TYPES), behaviour: pick(BEHAVIOURS), result: pick([1, 'r', undefined, null]) });
    else if (roll < 0.28) ops.push({ op: 'unregister', index: Math.floor(r() * 4) });
    else if (roll < 0.6) ops.push({ op: 'dispatch', raw: pick(ACTION_POOL) });
    else if (roll < 0.7) ops.push({ op: 'complete', result: pick([undefined, 'late', 0]) });
    else if (roll < 0.76) ops.push({ op: 'fail', message: pick(['', 'nope']) });
    else if (roll < 0.82) ops.push({ op: 'cancel' });
    else ops.push({ op: 'advance', ms: pick([1, 100, 299, 300, 500, 1000, 60000]) });
  }
  return ops;
};

/** Plays one script against one module and returns everything observable, in order. */
const play = (bus: AnyModule, options: Record<string, unknown>, ops: Op[]): unknown[] => {
  const log: unknown[] = [];
  let now = 0;
  let nextTimer = 1;
  const timers = new Map<number, { at: number; fn: () => void }>();
  const store = {
    setKey: (...a: unknown[]) => log.push(['store.setKey', ...a]),
    setState: (...a: unknown[]) => log.push(['store.setState', ...a]),
    deleteKey: (...a: unknown[]) => log.push(['store.deleteKey', ...a]),
    clearStore: (...a: unknown[]) => log.push(['store.clearStore', ...a])
  };
  const registry = new bus.ActionRegistry();
  const held: Array<{ complete(r?: unknown): void; fail(m: string): void }> = [];
  let dispatcher: any;
  const snap = () => [dispatcher.queueSize, dispatcher.isExecuting, dispatcher.waitingFor];
  const hook = (name: string) => (info?: Record<string, unknown>) => {
    log.push([name, info === undefined ? null : JSON.stringify(info, (_k, v) => (v === undefined ? '<undefined>' : v)), ...snap()]);
  };
  dispatcher = new bus.ActionDispatcher(
    { channel: 'default', storeName: 'app', builtIns: [], allowedKeys: [], handlerTimeout: 300, waitForHandler: 500, maxQueueSize: 100, rateLimit: 0, rateLimitWindow: 60000, ...options },
    { onDispatched: hook('dispatched'), onCompleted: hook('completed'), onFailed: hook('failed'), onRefused: hook('refused'), onQueueChanged: hook('queue'), onIdle: hook('idle') },
    {
      registry,
      store,
      setTimeoutImpl: (fn: () => void, ms: number) => {
        const id = nextTimer++;
        timers.set(id, { at: now + ms, fn });
        return id;
      },
      clearTimeoutImpl: (id: unknown) => timers.delete(id as number),
      nowImpl: () => now
    }
  );
  const unregisters: Array<() => void> = [];
  for (const o of ops) {
    try {
      switch (o.op) {
        case 'register':
          unregisters.push(
            registry.register(o.channel, o.type, {
              invoke(ctx: any) {
                log.push(['invoke', o.type, ctx.actionId, JSON.stringify(ctx.payload ?? '<undefined>')]);
                if (o.behaviour === 'complete') ctx.complete(o.result);
                else if (o.behaviour === 'complete-undefined') ctx.complete();
                else if (o.behaviour === 'hold') held.push(ctx);
                else if (o.behaviour === 'fail') ctx.fail('handler said no');
                else throw new Error('handler threw');
              }
            })
          );
          break;
        case 'unregister':
          unregisters[o.index]?.();
          break;
        case 'dispatch':
          log.push(['admitted', dispatcher.dispatch(o.raw)]);
          break;
        case 'complete':
          held.shift()?.complete(o.result);
          break;
        case 'fail':
          held.shift()?.fail(o.message);
          break;
        case 'cancel':
          log.push(['cancelled', dispatcher.cancelAll()]);
          break;
        case 'advance': {
          now += o.ms;
          for (;;) {
            const due = [...timers.entries()].filter(([, t]) => t.at <= now).sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0];
            if (!due) break;
            timers.delete(due[0]);
            due[1].fn();
          }
          break;
        }
      }
    } catch (error) {
      log.push(['threw', String((error as Error).message)]);
    }
    log.push(['after', o.op, ...snap(), registry.registeredTypes('default').join(','), registry.registeredTypes('x').join(',')]);
  }
  return log;
};

describe('§B the registry and the queue against the runtime — a differential over seeded scripts', () => {
  const GRID: Array<Record<string, unknown>> = [
    {},
    { waitForHandler: 0 },
    { handlerTimeout: 0 },
    { maxQueueSize: 2 },
    { rateLimit: 2, rateLimitWindow: 1000 },
    { builtIns: ['SET_STORE', 'MERGE_STORE', 'DELETE_STORE_KEY', 'CLEAR_STORE'] },
    { builtIns: ['SET_STORE', 'CLEAR_STORE', 'MERGE_STORE'], allowedKeys: ['count'] },
    { channel: 'x', waitForHandler: 0, handlerTimeout: 0 }
  ];
  const SEEDS = 60;

  test.each(GRID.map((options, i) => [i, options] as const))('options #%i: every observable event, in order, equal for %j', (_i, options) => {
    let cells = 0;
    for (let seed = 1; seed <= SEEDS; seed++) {
      const ops = scriptOf(seed * 7919 + _i, 24);
      // a fresh module per side per script: the action id counter is module state, and both start at zero
      const expected = play(runtimeBus(), options, ops);
      const actual = play(exportBus(), options, ops);
      expect({ seed, log: actual }).toEqual({ seed, log: expected });
      cells += expected.length;
    }
    // the grid is not vacuous: every option row produced hundreds of observations
    expect(cells).toBeGreaterThan(SEEDS * 24);
  });

  test('the grid reaches every hook and every refusal reason at least once', () => {
    const seen = new Set<string>();
    GRID.forEach((options, i) => {
      for (let seed = 1; seed <= SEEDS; seed++) {
        for (const entry of play(exportBus(), options, scriptOf(seed * 7919 + i, 24)) as unknown[][]) {
          seen.add(String(entry[0]));
          if (entry[0] === 'refused') seen.add(`reason:${JSON.parse(entry[1] as string).reason}`);
        }
      }
    });
    for (const k of ['dispatched', 'completed', 'failed', 'refused', 'queue', 'idle', 'invoke', 'store.setKey', 'store.setState', 'store.deleteKey', 'store.clearStore', 'reason:invalid', 'reason:unknown', 'reason:not-allowed', 'reason:rate-limited', 'reason:queue-full']) {
      expect([k, seen.has(k)]).toEqual([k, true]);
    }
  });

  test('payloadOf, builtInFieldOf and parseList agree with the runtime on their edge cases', () => {
    const rt = runtimeBus();
    const ex = exportBus();
    const envelopes = [{ type: 'A' }, { type: 'A', payload: 0 }, { type: 'A', payload: null, data: 1 }, { type: 'A', data: false }, { type: 'S', payload: { key: 'k', value: 0 } }, { type: 'S', key: 'top', payload: { key: 'k' } }];
    for (const e of envelopes) {
      expect(ex.payloadOf(e)).toEqual(rt.payloadOf(e));
      for (const f of ['key', 'value', 'values', 'merge']) expect(ex.builtInFieldOf(e, f)).toEqual(rt.builtInFieldOf(e, f));
    }
    for (const v of ['', ' , ', 'a, b,,c ', undefined, null]) expect(ex.parseList(v)).toEqual(rt.parseList(v));
  });
});

// ---- §C ------------------------------------------------------------------------------------------------------------

describe('§C the shapes a wire changes, and the refusals by name', () => {
  test('a Dispatcher that enables a built-in is refused by name — a server writing the Global Store is not in this slice', () => {
    const ir = mutated(HOME, (h) => setParam(h.nodes.find((n) => n.id === 'desk')!, 'builtIns', { kind: 'literal', value: 'SET_STORE, CLEAR_STORE' }));
    expect(refusalOf(ir, HOME, 'desk')).toBe("it enables the built-in store actions SET_STORE, CLEAR_STORE — a server writing the app's Global Store is not exported in this slice");
  });

  test('a wired Enabled Built-ins is refused by name', () => {
    const ir = mutated(HOME, (h) => connect(h, 'actionVar', 'value', 'desk', 'builtIns'));
    expect(refusalOf(ir, HOME, 'desk')).toBe('its Enabled Built-ins input is wired — which store writes a server may make must be readable off the graph');
  });

  test('a misspelt built-in enables nothing and translates — the node reports it on Last Error, and so does the lib', () => {
    const ir = mutated(HOME, (h) => setParam(h.nodes.find((n) => n.id === 'desk')!, 'builtIns', { kind: 'literal', value: 'SET_STOR' }));
    expect(refusalOf(ir, HOME, 'desk')).toBeUndefined();
    expect(emitApp(ir, catalog).files['src/pages/Home.tsx']).toContain("builtIns: 'SET_STOR'");
    expect(actionsLibSource()).toContain("s.lastError = 'Not built-in action names, so not enabled: ' + unknown.join(', ');");
  });

  test('a wired Result with Auto Complete on is refused by name: the export would hand back the value from the render before', () => {
    const ir = mutated(GREETER, (g) => connect(g, 'greetingVar', 'value', 'greet', 'result'));
    expect(refusalOf(ir, GREETER, 'greet')).toBe(
      'its Result input is wired while Auto Complete is on — the runtime hands back the value its Trigger chain has just written, and the export would hand back the one from the render before'
    );
  });

  test('a wired Result with Auto Complete off translates: Complete is a later pulse, after the render that carries it', () => {
    const ir = mutated(GREETER, (g) => connect(g, 'greetingVar', 'value', 'slow', 'result'));
    expect(refusalOf(ir, GREETER, 'slow')).toBeUndefined();
    const greeter = emitApp(ir, catalog).files['src/components/Greeter.tsx'];
    expect(greeter).toContain("autoComplete: false, result: greetingValue, errorMessage: 'slow failed'");
    expect(typecheckEmittedApp(emitApp(ir, catalog))).toEqual([]);
  });

  test('a wired Channel is read live and re-registers the handler — the hook keys its registration on it', () => {
    const ir = mutated(GREETER, (g) => connect(g, 'greetingVar', 'value', 'slow', 'channel'));
    expect(refusalOf(ir, GREETER, 'slow')).toBeUndefined();
    expect(emitApp(ir, catalog).files['src/components/Greeter.tsx']).toContain("{ channel: greetingValue, actionType: 'SLOW'");
    expect(actionsLibSource()).toContain('  }, [node, key]);');
  });

  test('a Trigger wired into a value input is refused by name, never emitted as a read', () => {
    const ir = mutated(GREETER, (g) => connect(g, 'greet', 'trigger', 'setGreeting', 'value', 'signal'));
    expect(refusalOf(ir, GREETER, 'greet')).toBe('its trigger output drives no translatable action');
  });
});

// ---- §D ------------------------------------------------------------------------------------------------------------

describe('§D what building it found', () => {
  test("a Handler nothing pulses, whose Trigger chain reads its own Payload, registers from its own side — not 'its trigger chain is cyclic'", () => {
    // Before §77 the registration pass reached GREET last; the dropped-wire pass compiled setGreeting first, registered the
    // handler from inside that sink, and the listener compile re-entered the same key (§54's trap, a streaming node's turn).
    expect(refusalOf(baseIr, GREETER, 'greet')).toBeUndefined();
    expect(app.files['src/components/Greeter.tsx']).toContain('trigger: () => greeting.set(greet.payload)');
  });
});

// ---- §E ------------------------------------------------------------------------------------------------------------

describe('§E the ledger', () => {
  test('both rows are translated, and neither is badged in the editor any more', () => {
    for (const type of ['net.noodl.ActionDispatcher', 'net.noodl.ActionHandler']) {
      expect(ledgerEntryOf(type)?.status).toBe('translated');
      expect(exportBadgeOf(type)).toBeUndefined();
    }
  });

  test('the picker floor moved by two in the same change', () => {
    const ledger = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'coverage-ledger.json'), 'utf8'));
    expect(ledger.pickerCoverageFloor).toBe(125); // EXP-011 §77 Action Dispatcher + Action Handler (session 106)
  });
});
