/**
 * EXP-022 S7 — the stores in JavaScriptCore (Richard's ruling, 2026-10-22: "Yes, after add & close").
 *
 * The Swift app now runs the web export's own Global Stores (`src/stores/<name>.ts`, `@nodegx/core`'s `store()`) and the
 * modules of the nodes over them (`src/lib/history.ts`, `src/lib/actions.ts`) in its JavaScriptCore context, the road S3
 * opened for the backend client. Swift holds a store as a `JSStore` and each State History, Undo / Redo, State Snapshot,
 * Optimistic Update, Action Dispatcher and Action Handler as a `StreamNode`, made, fed and disposed as React's hook does.
 *
 * §A `@nodegx/core` travels as a constant, transpiled from its source, and only where a carried module imports it;
 * §B the carried modules run in a bare JavaScript context, as the host loads them;
 * §C what the printer writes for the 9 store scenarios;
 * §D todo-list moves not at all, and the templates with a Global Store carry it.
 *
 * The graph scenarios themselves are played in `node-spec-graph-swift.test.ts` (one `swift test`, behind
 * `NODEGX_SWIFT_BUILD=1`).
 */

import * as path from 'path';
import * as vm from 'vm';

import { loadGraphScenarios, projectGraphTrace, type GraphScenario } from '../../nodegx-node-spec/src';
import { playGraph } from '../../nodegx-node-spec/src/runner/graph';
import { loadCatalog } from '../src/catalog';
import { parseProject } from '../src/parse/parseProject';
import { emitApp } from '../src/emit/emitApp';
import { emitSwiftApp } from '../src/emit/swift/emitSwift';
import { clientModulesJs } from '../src/emit/swift/client';
import { CORE_JS } from '../src/emit/swift/coreJs';
import { HOST_JS } from '../src/emit/swift/scripts';
import { coreJs } from './helpers/swift-core-js';
import { drivenInputs, exportGraphTarget, graphComponent, probeProject } from './helpers/node-spec-target';
import { playSwiftGraphs, swiftGraphTarget, swiftGraphVerdicts } from './helpers/swift-graph-target';

const building = process.env.NODEGX_SWIFT_BUILD === '1' && process.platform === 'darwin';
const built = building ? it : it.skip;

const catalog = loadCatalog();
const TEMPLATES = path.join(__dirname, '..', '..', '..', 'templates');
const scenarios = loadGraphScenarios();
const scenario = (file: string, i: number): GraphScenario => scenarios.filter((s) => (s.file ?? '').includes(file))[i];
const probeIr = (sc: GraphScenario) => probeProject(graphComponent(sc.nodes, sc.wires ?? [], drivenInputs(sc)));
/** The 9 store scenarios S5 left on the Swift printer's verdict. */
const STORES: Array<[string, number]> = [
  ['t01-global-store', 0],
  ['t02-state-history', 0],
  ['t02-state-history', 1],
  ['t02-state-history', 2],
  ['t02-state-history', 3],
  ['t03-optimistic-update', 0],
  ['t03-optimistic-update', 2],
  ['t04-action-dispatcher', 0],
  ['t04-action-dispatcher', 2]
];

/** A bare JavaScript context with the host and a project's carried modules in it, as `Scripts.swift` loads them. */
function host(files: Record<string, string>): vm.Context {
  const context = vm.createContext({
    __log: () => undefined,
    __later: (fn: () => void, ms: number) => setTimeout(fn, ms),
    __storage: () => undefined,
    __fetch: () => undefined,
    __env: () => ({}),
    __variable: () => undefined,
    __setVariable: () => undefined
  });
  vm.runInContext(HOST_JS, context);
  for (const mod of clientModulesJs(files)) vm.runInContext(mod.js, context, { filename: mod.name });
  return context;
}

describe('§A @nodegx/core travels as a constant, and only where a carried module imports it', () => {
  it('A1 the constant is the core\'s source transpiled now (the React binding apart): a change to the core reaches the Swift app or turns this red', () => {
    expect(CORE_JS).toBe(coreJs());
    expect(CORE_JS).toContain('__define("@nodegx/core", function (exports, __require) {');
    expect(CORE_JS).toContain('__define("@nodegx/core/store", function (exports, __require) {');
    expect(CORE_JS).not.toContain('@nodegx/core/react');
  });

  it('A2 a store scenario carries its store module, the history library and the core; a project without a store carries none of them', () => {
    const names = clientModulesJs(emitApp(probeIr(scenario('t02-state-history', 0)), catalog).files).map((m) => m.name);
    expect(names).toEqual(['lib/errors', 'lib/history', 'nodegx-core', 'stores/app']);
    const clause = clientModulesJs(emitApp(probeIr(scenario('c02-every-send-is-delivered', 0)), catalog).files).map((m) => m.name);
    expect(clause).toEqual([]);
  });
});

describe('§B the carried modules run in a bare JavaScript context, as the host loads them', () => {
  it('B1 a Set writes the store; State History records it; Undo puts the store back and Redo forward (the web export\'s own lib/history)', () => {
    const context = host(emitApp(probeIr(scenario('t02-state-history', 0)), catalog).files);
    const read = vm.runInContext(
      `var h = __nodegx.module('lib/history'), app = __nodegx.module('stores/app').app;
       var t = __nodegx.stream('lib/history', 'createStateHistoryNode', { label: 'H', nodeId: 'h', componentName: 'P' }, app, function () {});
       t.setupTracking();
       __nodegx.storeSet(app, 'count', 1);
       var u = __nodegx.stream('lib/history', 'createUndoRedoNode', { label: 'U', nodeId: 'u', componentName: 'P' }, app, function () {});
       var steps = [JSON.stringify({ count: app.peek().count, size: t.historySize, canUndo: t.canUndo })];
       u.undo(); steps.push(JSON.stringify({ count: app.peek().count, canRedo: t.canRedo }));
       u.redo(); steps.push(JSON.stringify({ count: app.peek().count, canUndo: t.canUndo }));
       steps`,
      context
    ) as string[];
    expect(read).toEqual(['{"count":1,"size":2,"canUndo":true}', '{"canRedo":true}', '{"count":1,"canUndo":true}']);
  });

  it('B2 an Action Dispatcher runs an action through the Action Handler that registered its type (lib/actions, its one parameter property taken out by Node\'s transform)', () => {
    const context = host(emitApp(probeIr(scenario('t04-action-dispatcher', 0)), catalog).files);
    const read = vm.runInContext(
      `var h = __nodegx.stream('lib/actions', 'createHandlerNode', { label: 'H', nodeId: 'h', componentName: 'P' }, null, function () {});
       __nodegx.applyInputs(h, new Map(), { actionType: 'ADD', autoComplete: true, result: 'ok' });
       var triggered = 0;
       __nodegx.setListeners(h, ['trigger'], function () { triggered++; });
       if (h.setupRequested) h.setupRegistration();
       var d = __nodegx.stream('lib/actions', 'createDispatcherNode', { label: 'D', nodeId: 'd', componentName: 'P' }, null, function () {});
       __nodegx.applyInputs(d, new Map(), { waitForHandler: 0 });
       d.dispatch(JSON.stringify({ type: 'ADD', payload: 1 }));
       JSON.stringify({ triggered: triggered, completed: d.completedCount, result: d.result })`,
      context
    );
    expect(JSON.parse(read as string)).toEqual({ triggered: 1, completed: 1, result: 'ok' });
  });

  it('B3 `fresh()` starts the modules and the stores again, as React\'s graph target loads them for each scenario', () => {
    const context = host(emitApp(probeIr(scenario('t02-state-history', 0)), catalog).files);
    const read = vm.runInContext(
      `var before = __nodegx.module('stores/app').app; __nodegx.storeSet(before, 'count', 1);
       __nodegx.fresh();
       var after = __nodegx.module('stores/app').app;
       JSON.stringify({ same: before === after, count: after.peek().count === undefined, history: __nodegx.module('lib/history') === __nodegx.module('lib/history') })`,
      context
    );
    expect(JSON.parse(read as string)).toEqual({ same: false, count: true, history: true });
  });
});

describe('§C the printer: the 9 store scenarios, printed whole', () => {
  it('C1 none of the 9 leaves anything on the Swift printer: every Set, Subscribe, verb, value, listener and option is printed', () => {
    const left = STORES.map(([file, i]) => [`${file}:${i}`, emitSwiftApp(probeIr(scenario(file, i)), catalog).preflight.swiftLosses.map((l) => l.what)]);
    expect(left.filter(([, losses]) => (losses as string[]).length > 0)).toEqual([]);
  });

  it("C2 a State History is the web export's own node, made once per placement; its setup runs before the component's pushes, as a hook's effect runs first", () => {
    const app = emitSwiftApp(probeIr(scenario('t02-state-history', 0)), catalog);
    const view = app.files['Sources/NodeSpecKit/Views/ProbeView.swift'];
    expect(view).toContain(
      '@StateObject var history = StreamNode(module: "lib/history", factory: "createStateHistoryNode", source: ["label": "State History", "nodeId": "h", "componentName": "/Components/Probe"], with: Stores.app.value)'
    );
    const setup = view.indexOf('.onChange(of: history.changes, initial: true) { _, _ in history.call("setupTracking") }');
    expect(setup).toBeGreaterThan(-1);
    expect(setup).toBeLessThan(view.indexOf('onHByReferenceKeysChanged(value.value)'));
    expect(view).toContain('.onChange(of: Same(history.read("canUndo")), initial: true) { _, value in onHCanUndoChanged(value.value) }');
    expect(view).toContain('    undoRedo.act("undo")');
    expect(view).toContain('.onDisappear { history.call("dispose") }');
    expect(app.files['Sources/NodeSpecKit/Stores.swift']).toContain('public static var app: JSStore { JSStore.named("stores/app", "app") }');
  });

  it('C3 a Set writes one key of the store; a Subscribe read as the view draws observes the store, as `useStore` subscribes', () => {
    const view = emitSwiftApp(probeIr(scenario('t01-global-store', 0)), catalog).files['Sources/NodeSpecKit/Views/ProbeView.swift'];
    expect(view).toContain('  @ObservedObject var appStore = Stores.app');
    expect(view).toContain('Stores.app.set("count", set_value)');
    expect(view).toContain('.onChange(of: Same(Stores.app.get("count")), initial: true) { _, value in onSubValueChanged(value.value) }');
  });

  it("C4 an Action Handler's options are applied at every draw, its registration runs when what it registers under moves; a Dispatch carries the Action", () => {
    const view = emitSwiftApp(probeIr(scenario('t04-action-dispatcher', 2)), catalog).files['Sources/NodeSpecKit/Views/ProbeView.swift'];
    expect(view).toContain('    let _ = handler3.inputs(["actionType": "LATE", "enabled": late_enabled])');
    expect(view).toContain('.onChange(of: handler.registrationKey, initial: true) { _, _ in if handler.setupRequested { handler.call("setupRegistration") } }');
    expect(view).toContain('    dispatcher.act("dispatch", d_action)');
  });
});

describe('§D todo-list does not move; the templates with a Global Store carry it', () => {
  it('D1 todo-list carries no store, no history or action library and no core (its only store module is the Variables, which Swift keeps itself); 96 things left out, as at S6 (91 the plan\'s, 5 the Swift printer\'s)', () => {
    const ir = parseProject(path.join(TEMPLATES, 'todo-list'), catalog);
    const swift = emitSwiftApp(ir, catalog);
    const names = clientModulesJs(emitApp(ir, catalog).files).map((m) => m.name);
    expect(names.filter((n) => /^stores\/|^lib\/(history|actions)$|^nodegx-core$/.test(n))).toEqual([]);
    expect(Object.keys(swift.files).filter((f) => f.endsWith('/Stores.swift'))).toEqual([]);
    expect({ plan: swift.preflight.planRefusals.length, swiftPrinter: swift.preflight.swiftLosses.length }).toEqual({ plan: 91, swiftPrinter: 5 });
  });

  it('D2 bot-garden, rocket-school and star-class carry their Global Store and the core, and a view reads it through `Stores`', () => {
    const carried: Record<string, string[]> = {};
    for (const name of ['bot-garden', 'rocket-school', 'star-class']) {
      const ir = parseProject(path.join(TEMPLATES, name), catalog);
      const names = clientModulesJs(emitApp(ir, catalog).files).map((m) => m.name);
      carried[name] = names.filter((n) => /^stores\/|^nodegx-core$/.test(n));
      const files = emitSwiftApp(ir, catalog).files;
      const stores = Object.keys(files).filter((f) => f.endsWith('/Stores.swift'));
      expect(stores).toHaveLength(1);
      expect(files[stores[0]]).toContain('JSStore.named(');
    }
    expect(carried).toEqual({ 'bot-garden': ['nodegx-core', 'stores/garden'], 'rocket-school': ['nodegx-core', 'stores/rocket'], 'star-class': ['nodegx-core', 'stores/rocket'] });
  });
});

describe('§E a store node\'s listener, which no P107 scenario reaches (mutant M5 changed nothing: no played scenario wires one)', () => {
  /** t02's first graph, and a Counter that History Changed and Undone each step: the chain runs inside the node's own call. */
  const t02 = scenario('t02-state-history', 0);
  const LISTENED: GraphScenario = {
    ...t02,
    name: 'S7 listener: State History\'s History Changed and Undo / Redo\'s Undone each step a Counter',
    nodes: { ...t02.nodes, c: { type: 'Counter' } },
    wires: [...(t02.wires ?? []), { from: 'h.historyChanged', to: 'c.increase' }, { from: 'u.undone', to: 'c.increase' }],
    steps: ['settle', { node: 'set', signal: 'set' }, 'settle', { node: 'u', signal: 'undo' }, 'settle'],
    expect: undefined,
    claims: undefined,
    divergence: undefined
  } as unknown as GraphScenario;

  it('E1 the listeners are printed: one `on` per node, each signal a chain that steps the Counter', () => {
    const view = emitSwiftApp(probeIr(LISTENED), catalog).files['Sources/NodeSpecKit/Views/ProbeView.swift'];
    expect(view).toMatch(/let _ = history\.on\(\[\n\s+"historyChanged": \{ [^\n]*\+= 1 \}\n\s+\]\)/);
    expect(view).toMatch(/let _ = undoRedo\.on\(\[\n\s+"undone": \{ [^\n]*\+= 1 \}\n\s+\]\)/);
  });

  built('E2 played on both exports, the Counter moves the same at every settle (one swift build)', async () => {
    const verdicts = swiftGraphVerdicts([LISTENED]);
    expect(verdicts[0].outside).toBeUndefined();
    const run = playSwiftGraphs('s7-listener', [LISTENED], verdicts);
    const swift = swiftGraphTarget(verdicts, run);
    expect(swift.canPlay!(LISTENED)).toBeUndefined();
    const reach = swift.graphReach!(LISTENED)!;
    const swiftTrace = projectGraphTrace(await playGraph(swift, LISTENED), reach);
    const react = exportGraphTarget();
    expect(react.canPlay!(LISTENED)).toBeUndefined();
    const reactTrace = projectGraphTrace(await playGraph(react, LISTENED), reach);
    const counts = swiftTrace.filter((e) => e.subject === 'c' && e.t === 'value').map((e) => (e as { value?: unknown }).value);
    expect(counts.length).toBeGreaterThan(1);
    expect(swiftTrace).toEqual(reactTrace);
  }, 600_000);
});
