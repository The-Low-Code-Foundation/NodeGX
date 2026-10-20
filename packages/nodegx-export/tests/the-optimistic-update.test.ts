import * as fs from 'fs';
import * as path from 'path';

import * as ts from 'typescript';

import { Catalog, CatalogIndex, loadCatalog } from '../src/catalog';
import { ComponentPlan, planProject } from '../src/analyze/plan';
import { emitApp } from '../src/emit/emitApp';
import { HISTORY_LIB_PATH, historyLibSource } from '../src/emit/historyLib';
import { exportBadgeOf, ledgerEntryOf } from '../src/ledger';
import { parseProject } from '../src/parse/parseProject';
import { typecheckEmittedApp } from './helpers/typecheckApp';
import { ComponentIR, ConnectionIR, ExportIR, NodeIR, ParamValue } from '../src/ir/types';

/**
 * EXP-011 §78 part 2 — `Optimistic Update` (`net.noodl.OptimisticUpdate`): the streaming table's thirteenth member, in
 * the history family's module (`src/lib/history.ts`), over the same store seam: a patch is one write through it, with
 * the values each key held before.
 *
 * Built on `tests/fixtures/optimistic-desk`: a Global Store "app" declares status "Draft", notice "" and title "Untitled". An
 * Optimistic Update "Publish" writes status "Published" (Timeout 5000, Error Message "The server said no") from a Publish
 * button; Server said yes commits and Server said no rolls back, and Rolled Back writes notice "Put back". The placed
 * Rename holds a second Optimistic Update on title, its Optimistic Value wired from a Variable a text input writes.
 *
 * §A the fixture whole · §B the lib's patches and node shell against the runtime's own optimisticupdatenode.ts over its own
 * globalstore.ts (a differential over seeded scripts, not a reading) · §C the shapes a wire changes and the refusals · §D
 * what building it found, and the one recorded difference · §E the ledger. On the export, t03's two clock-free graph
 * scenarios play and pass (`tests/node-spec-graph.test.ts`); its third advances a clock, which that harness does not.
 */

const REPO = path.join(__dirname, '..', '..', '..');
const RUNTIME_SRC = path.join(REPO, 'packages', 'noodl-runtime', 'src');
const RUNTIME_AGENT = path.join(RUNTIME_SRC, 'nodes', 'std-library', 'agent');
const CORE_SRC = path.join(REPO, 'packages', 'nodegx-core', 'src');
const FIXTURE = path.join(__dirname, 'fixtures', 'optimistic-desk');
const catalog: Catalog = loadCatalog();
const index = new CatalogIndex(catalog);
const baseIr = parseProject(FIXTURE, catalog);
const app = emitApp(baseIr, catalog);

const HOME = 'Pages/Home';
const RENAME = 'Components/Rename';

const cloneIr = (): ExportIR => structuredClone(baseIr);
const componentOf = (source: ExportIR, componentPath: string): ComponentIR => source.components.find((c) => c.path === componentPath)!;
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
const nodeIn = (c: ComponentIR, id: string): NodeIR => c.nodes.find((n) => n.id === id)!;

// ---- §A ------------------------------------------------------------------------------------------------------------

describe('§A the fixture whole', () => {
  test('the app typechecks, ships the lib and errors.ts, and nothing in it is refused', () => {
    expect(typecheckEmittedApp(app)).toEqual([]);
    expect(app.files[HISTORY_LIB_PATH]).toContain(historyLibSource());
    expect(app.files['src/lib/errors.ts']).toBeDefined();
    expect(app.notes.filter((n) => !n.startsWith('App:'))).toEqual([]);
  });

  test('Publish prints as a hook handed the store module, the literal inputs as options and Rolled Back as its listener', () => {
    const home = app.files['src/pages/Home.tsx'];
    expect(home).toContain("import { useOptimisticUpdate } from '../lib/history';");
    expect(home).toContain("import { app } from '../stores/app';");
    expect(home).toContain("const publish = useOptimisticUpdate({ label: 'Publish', nodeId: 'publish', componentName: '/Pages/Home' }, { store: app, key: 'status', errorMessage: 'The server said no', timeout: 5000 }, {");
    expect(home).toContain("    rolledBack: () => app.set({ notice: 'Put back' })");
    // Optimistic Value is carried by Apply, read at the pulse
    expect(home).toContain("<button onClick={() => publish.apply('Published')}>Publish</button>");
    expect(home).toContain('<button onClick={() => publish.commit()}>Server said yes</button>');
    expect(home).toContain('<button onClick={() => publish.rollback()}>Server said no</button>');
    expect(home).toContain("{String(publish.value ?? '')}");
    expect(home).toContain('{String(publish.pendingCount)}');
    expect(home).toContain('{publish.error}');
    expect(home).toContain('// Publish — an Optimistic Update (optimisticupdatenode.ts), hosted by history.ts');
  });

  test('Rename prints in the other component, handed the same store module; its wired Optimistic Value rides Apply', () => {
    const rename = app.files['src/components/Rename.tsx'];
    expect(rename).toContain("import { useOptimisticUpdate } from '../lib/history';");
    expect(rename).toContain("import { app } from '../stores/app';");
    expect(rename).toContain("useOptimisticUpdate({ label: 'Rename', nodeId: 'renameUpdate', componentName: '/Components/Rename' }, { store: app, key: 'title', transactionId: 'rename', timeout: 0, onDispose: 'commit' });");
    expect(rename).toContain('<button onClick={() => rename.apply(draftTitle.get())}>Rename</button>');
    expect(rename).toContain('{String(rename.isPending)}');
  });

  test('the store module names both updates it is handed to, beside its declarer and writer', () => {
    const store = app.files['src/stores/app.ts'];
    expect(store).toContain(' * Written optimistically by "Publish" (net.noodl.OptimisticUpdate `publish` on /Pages/Home).');
    expect(store).toContain(' * Written optimistically by "Rename" (net.noodl.OptimisticUpdate `renameUpdate` on /Components/Rename).');
  });

  test('an app with no Optimistic Update ships no history.ts', () => {
    const ir = cloneIr();
    for (const p of [HOME, RENAME]) {
      const c = componentOf(ir, p);
      c.nodes = c.nodes.filter((n) => n.type !== 'net.noodl.OptimisticUpdate');
      const ids = new Set(c.nodes.map((n) => n.id));
      c.connections = c.connections.filter((w) => ids.has(w.fromId) && ids.has(w.toId));
    }
    expect(emitApp(ir, catalog).files[HISTORY_LIB_PATH]).toBeUndefined();
  });
});

// ---- §B ------------------------------------------------------------------------------------------------------------

type AnyModule = Record<string, any>;
const compiled = new Map<string, string>();
const transpiled = (key: string, source: () => string): string => {
  if (!compiled.has(key)) {
    compiled.set(key, ts.transpileModule(source(), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText);
  }
  return compiled.get(key)!;
};
/** A fresh module graph per call: each file evaluated once, a relative import resolved to its `.ts` file. */
const loaderOf = () => {
  const cache = new Map<string, { exports: AnyModule }>();
  const load = (file: string): AnyModule => {
    const hit = cache.get(file);
    if (hit) return hit.exports;
    const module = { exports: {} as AnyModule };
    cache.set(file, module);
    const req = (id: string): unknown => {
      if (id.startsWith('.')) {
        const base = path.resolve(path.dirname(file), id);
        for (const candidate of [`${base}.ts`, `${base}.js`, path.join(base, 'index.ts')]) if (fs.existsSync(candidate)) return load(candidate);
      }
      return {};
    };
    // eslint-disable-next-line no-new-func
    new Function('require', 'module', 'exports', transpiled(file, () => fs.readFileSync(file, 'utf8')))(req, module, module.exports);
    return module.exports;
  };
  return load;
};

const OUTPUTS = ['value', 'previousValue', 'isPending', 'pendingCount', 'isCommitted', 'isRolledBack', 'transactionId', 'error'] as const;
const SIGNALS = ['applied', 'committed', 'rolledBack', 'timedOut', 'done', 'unchanged', 'failure', 'completed'] as const;
type InputPort = 'key' | 'optimisticValue' | 'errorMessage' | 'transactionId' | 'timeout' | 'onDispose';

/** One side of the differential: two Optimistic Update nodes on the "app" store, and the plain writes beside them. */
interface Side {
  set(slot: number, port: InputPort, value: unknown): void;
  pulse(slot: number, action: 'apply' | 'commit' | 'rollback'): void;
  remove(slot: number): void;
  write(key: string, value: unknown): void;
  remove_key(key: string): void;
  outputs(slot: number): Record<string, unknown>;
  state(): Record<string, unknown>;
  openPatches(): Array<{ id: string; keys: string[] }>;
  /** Signals and raises, in order, since the last call. */
  drain(): string[];
}

/** The runtime's own node, in a NodeContext, over its own globalstore.ts; each frame is a tick (a pulse is deferred to it). */
const runtimeSide = (): Side => {
  const load = loaderOf();
  const NodeContext = load(path.join(RUNTIME_SRC, 'nodecontext.ts')) as unknown as new () => any;
  const NodeDefinition = load(path.join(RUNTIME_SRC, 'nodedefinition.ts'));
  const gsm = load(path.join(RUNTIME_AGENT, 'globalstore.ts')).globalStoreManager;
  const module = load(path.join(RUNTIME_AGENT, 'optimisticupdatenode.ts'));
  const context = new NodeContext();
  context.nodeRegister.register(NodeDefinition.defineNode(module.node));
  const log: string[] = [];
  let next = 0;
  const create = (slot: number) => {
    const node = context.nodeRegister.createNode('net.noodl.OptimisticUpdate', `ou-${slot}-${++next}`);
    const send = node.sendSignalOnOutput.bind(node);
    node.sendSignalOnOutput = (name: string) => {
      log.push(`${slot}:${name}`);
      send(name);
    };
    node.raiseRuntimeError = (code: string, message: string) => {
      log.push(`${slot}:raise ${code}: ${message}`);
    };
    return node;
  };
  const nodes = [create(0), create(1)];
  const tick = (node: any) => {
    context.updateIteration++;
    node.update();
  };
  const frame = () => nodes.forEach(tick);
  return {
    set(slot, port, value) {
      nodes[slot].setInputValue(port, value);
      frame();
    },
    pulse(slot, action) {
      nodes[slot].setInputValue(action, false);
      nodes[slot].setInputValue(action, true);
      frame();
    },
    remove(slot) {
      nodes[slot]._onNodeDeleted();
      nodes[slot] = create(slot);
      frame();
    },
    write(key, value) {
      gsm.setKey('app', key, value);
      frame();
    },
    remove_key(key) {
      gsm.deleteKey('app', key);
      frame();
    },
    outputs(slot) {
      const out: Record<string, unknown> = {};
      for (const port of OUTPUTS) out[port] = nodes[slot].getOutput(port).value;
      return out;
    },
    state: () => gsm.getState('app'),
    openPatches: () => gsm.getOpenPatches('app').map((p: { id: string; keys: string[] }) => ({ id: p.id, keys: p.keys })),
    drain: () => log.splice(0)
  };
};

/** The lib over @nodegx/core's own store, both fresh. `source` defaults to the emitted lib (a mutant can be handed in). */
const exportSide = (source = historyLibSource()): Side => {
  const core = loaderOf()(path.join(CORE_SRC, 'index.ts'));
  const log: string[] = [];
  let raisingSlot = 0;
  const module = { exports: {} as AnyModule };
  const errors = { raiseAppError: (e: { code: string; message: string }) => log.push(`${raisingSlot}:raise ${e.code}: ${e.message}`) };
  const req = (id: string): unknown => (id === '@nodegx/core' ? core : id === './errors' ? errors : id === 'react' ? {} : {});
  // eslint-disable-next-line no-new-func
  new Function('require', 'module', 'exports', transpiled(`lib:${source.length}:${source.slice(-64)}`, () => source))(req, module, module.exports);
  const lib = module.exports;
  const store = core.store('app', {});
  const create = (slot: number) => {
    const node = lib.createOptimisticUpdateNode({ label: 'Update', nodeId: `ou-${slot}`, componentName: '/Pages/Home' }, store);
    const on: Record<string, () => void> = {};
    for (const signal of SIGNALS) on[signal] = () => log.push(`${slot}:${signal}`);
    node.setListeners(on);
    return node;
  };
  const nodes = [create(0), create(1)];
  const as = <T>(slot: number, fn: () => T): T => {
    raisingSlot = slot;
    return fn();
  };
  return {
    set(slot, port, value) {
      // an undefined value is never sent (C3), as the hook's applyInputs runs no setter for one
      if (value === undefined) return;
      nodes[slot].setInput(port, value);
      if (port === 'key') nodes[slot].setupSubscription();
    },
    pulse(slot, action) {
      as(slot, () => nodes[slot][action]());
    },
    remove(slot) {
      nodes[slot].dispose();
      nodes[slot] = create(slot);
    },
    write(key, value) {
      store.set({ [key]: value });
    },
    remove_key(key) {
      store.set({ [key]: undefined });
    },
    outputs(slot) {
      const out: Record<string, unknown> = {};
      for (const port of OUTPUTS) out[port] = nodes[slot][port];
      return out;
    },
    state: () => store.peek(),
    openPatches: () => lib.getOpenPatches(store).map((p: { id: string; keys: string[] }) => ({ id: p.id, keys: p.keys })),
    drain: () => log.splice(0)
  };
};

/** A seeded generator (mulberry32), so a failing script is reproducible by its seed. */
const rng = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const KEYS = ['a', 'b', ''];
const SHARED = { shared: true };
/** Factories, so each side gets objects of its own; the shared object is one identity on both sides. */
const VALUES: Array<() => unknown> = [() => 0, () => 1, () => 5, () => 'x', () => '', () => true, () => false, () => null, () => ({ n: 1 }), () => [1, 2], () => SHARED];
const IDS = ['', 't1', 't2'];

type Op =
  | { op: 'set'; slot: number; port: InputPort; value: unknown }
  | { op: 'pulse'; slot: number; action: 'apply' | 'commit' | 'rollback' }
  | { op: 'remove'; slot: number }
  | { op: 'write'; key: string; value: number }
  | { op: 'del'; key: string }
  | { op: 'advance'; ms: number };

const scriptOf = (seed: number): Op[] => {
  const r = rng(seed);
  const pick = <T>(list: readonly T[]): T => list[Math.floor(r() * list.length)];
  const slot = () => (r() < 0.6 ? 0 : 1);
  const ops: Op[] = [];
  // §D2: a key an Apply with no Optimistic Value has written holds undefined in the runtime and is absent in the
  // export, so a delete of that key afterwards is the one recorded difference; the generator never deletes one.
  const keyOf: Array<string | undefined> = [undefined, undefined];
  const valued = [false, false];
  const unvalued = new Set<string>();
  const push = (op: Op) => {
    ops.push(op);
    if (op.op === 'set' && op.port === 'key') keyOf[op.slot] = op.value as string;
    if (op.op === 'set' && op.port === 'optimisticValue') valued[op.slot] = true;
    if (op.op === 'remove') {
      keyOf[op.slot] = undefined;
      valued[op.slot] = false;
    }
    if (op.op === 'pulse' && op.action === 'apply' && !valued[op.slot] && keyOf[op.slot]) unvalued.add(keyOf[op.slot]!);
  };
  // every script starts with both nodes keyed, mostly on the same key, so overlapping patches are common
  push({ op: 'set', slot: 0, port: 'key', value: 'a' });
  push({ op: 'set', slot: 1, port: 'key', value: r() < 0.7 ? 'a' : 'b' });
  for (let i = 0; i < 40; i++) {
    const roll = r();
    if (roll < 0.25) push({ op: 'pulse', slot: slot(), action: 'apply' });
    else if (roll < 0.38) push({ op: 'pulse', slot: slot(), action: 'commit' });
    else if (roll < 0.52) push({ op: 'pulse', slot: slot(), action: 'rollback' });
    else if (roll < 0.64) push({ op: 'set', slot: slot(), port: 'optimisticValue', value: Math.floor(r() * VALUES.length) });
    else if (roll < 0.7) push({ op: 'set', slot: slot(), port: 'transactionId', value: pick(IDS) });
    else if (roll < 0.73) push({ op: 'set', slot: slot(), port: 'key', value: pick(KEYS) });
    else if (roll < 0.76) push({ op: 'set', slot: slot(), port: 'errorMessage', value: pick(['', 'Server said no']) });
    else if (roll < 0.8) push({ op: 'set', slot: slot(), port: 'timeout', value: pick<unknown>([0, 50, 200, -1, 'soon', 30000]) });
    else if (roll < 0.82) push({ op: 'set', slot: slot(), port: 'onDispose', value: pick(['rollback', 'commit', 'nonsense']) });
    else if (roll < 0.88) push({ op: 'write', key: pick(['a', 'b']), value: Math.floor(r() * VALUES.length) });
    else if (roll < 0.9) {
      const key = pick(['a', 'b']);
      if (!unvalued.has(key)) push({ op: 'del', key });
    }
    else if (roll < 0.93) push({ op: 'remove', slot: slot() });
    else push({ op: 'advance', ms: pick([10, 50, 150, 300]) });
  }
  return ops;
};

/** A value as both sides can be compared on: undefined is absence, the shared object by name, objects by shape. */
const norm = (v: unknown): unknown => {
  if (v === SHARED) return '<shared>';
  if (Array.isArray(v)) return v.map(norm);
  if (v && typeof v === 'object') {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v).sort()) if ((v as Record<string, unknown>)[k] !== undefined) out[k] = norm((v as Record<string, unknown>)[k]);
    return out;
  }
  return v;
};

/**
 * Plays a script on a side and returns what was observable after each step. A generated transaction id is named by
 * the order it first appeared (the two sides mint different ones); an authored one is kept. Object identity is
 * observable through the supersession check, so a value written by one op is the same object every time it is read.
 */
const play = (side: Side, ops: Op[]) => {
  const ids = new Map<string, string>();
  const idOf = (id: unknown): unknown => {
    if (typeof id !== 'string' || !/^(tx_|patch_)/.test(id)) return id;
    if (!ids.has(id)) ids.set(id, `<gen ${ids.size + 1}>`);
    return ids.get(id);
  };
  const generated = (text: string) => text.replace(/(tx|patch)_[0-9a-z]+_[0-9a-z]+/g, (m) => String(idOf(m)));
  const trace: unknown[] = [];
  for (const op of ops) {
    if (op.op === 'set') side.set(op.slot, op.port, op.port === 'optimisticValue' ? VALUES[op.value as number]() : op.value);
    else if (op.op === 'pulse') side.pulse(op.slot, op.action);
    else if (op.op === 'remove') side.remove(op.slot);
    else if (op.op === 'write') side.write(op.key, VALUES[op.value]());
    else if (op.op === 'del') side.remove_key(op.key);
    else jest.advanceTimersByTime(op.ms);
    const outputs = [0, 1].map((slot) => {
      const o = side.outputs(slot);
      return { ...norm({ ...o, transactionId: undefined }) as object, transactionId: idOf(o.transactionId), error: typeof o.error === 'string' ? generated(o.error) : o.error };
    });
    trace.push({ op, events: side.drain().map(generated), outputs, state: norm(side.state()), open: side.openPatches().map((p) => ({ id: idOf(p.id), keys: p.keys })) });
  }
  return trace;
};

describe('§B the lib against the runtime’s own optimisticupdatenode.ts over its own globalstore.ts', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  const SEEDS = Array.from({ length: 300 }, (_, i) => i + 1);
  const runtimeTraces = new Map<number, unknown[]>();
  const runtimeTrace = (seed: number) => {
    if (!runtimeTraces.has(seed)) {
      runtimeTraces.set(seed, play(runtimeSide(), scriptOf(seed)));
      jest.clearAllTimers();
    }
    return runtimeTraces.get(seed)!;
  };
  /** The seeds on which the lib (or a mutant of it) differs from the runtime, and the first difference. */
  const differing = (source?: string) => {
    const seeds: number[] = [];
    let first: { seed: number; step: number; runtime: unknown; lib: unknown } | undefined;
    for (const seed of SEEDS) {
      const a = runtimeTrace(seed);
      const b = play(exportSide(source), scriptOf(seed));
      jest.clearAllTimers();
      const step = a.findIndex((entry, i) => JSON.stringify(entry) !== JSON.stringify(b[i]));
      if (step !== -1) {
        seeds.push(seed);
        if (first === undefined) first = { seed, step, runtime: a[step], lib: b[step] };
      }
    }
    return { seeds, first };
  };

  test('B1 300 seeded scripts of 42 steps: every signal, raise, output, the store and the open patches agree after every step', () => {
    const { seeds, first } = differing();
    if (first !== undefined) console.log(JSON.stringify(first, null, 1));
    expect(seeds).toEqual([]);
  });

  test('B2 the grid reaches every signal, every refusal, the deadline, supersession and both removal policies', () => {
    const events = new Set<string>();
    let removedOpen = { rollback: 0, commit: 0 };
    let overlapping = 0;
    for (const seed of SEEDS) {
      const ops = scriptOf(seed);
      const trace = runtimeTrace(seed) as Array<{ events: string[]; open: Array<{ keys: string[] }> }>;
      const policy = ['rollback', 'rollback'];
      trace.forEach((step, i) => {
        for (const e of step.events) events.add(e.replace(/^\d:/, '').replace(/"[^"]*"/g, '"…"'));
        const op = ops[i];
        if (op.op === 'set' && op.port === 'onDispose') policy[op.slot] = op.value === 'commit' ? 'commit' : 'rollback';
        if (op.op === 'remove') {
          if (i > 0 && trace[i - 1].open.length > step.open.length) removedOpen[policy[op.slot] as 'rollback' | 'commit']++;
          policy[op.slot] = 'rollback';
        }
        if (step.open.filter((p) => p.keys[0] === 'a').length >= 2) overlapping++;
      });
    }
    for (const signal of SIGNALS) expect(events).toContain(signal);
    expect([...events].filter((e) => e.startsWith('raise ')).sort()).toEqual([
      'raise optimistic-update/operation-failed: Global Store: patch "…" is already open',
      'raise optimistic-update/operation-failed: Key is required',
      'raise optimistic-update/operation-failed: No open update with transaction id "…" to commit',
      'raise optimistic-update/operation-failed: No open update with transaction id "…" to roll back',
      'raise optimistic-update/operation-failed: There is no open update to commit',
      'raise optimistic-update/operation-failed: There is no open update to roll back'
    ]);
    expect(removedOpen.rollback).toBeGreaterThan(0);
    expect(removedOpen.commit).toBeGreaterThan(0);
    expect(overlapping).toBeGreaterThan(0);
  });

  test('B3 three mutants are caught: a rollback that clobbers a newer patch, a newer patch read as supersession, When Removed ignored', () => {
    const lib = historyLibSource();
    const mutants = {
      clobbers: ['    if (successor) {', '    if (successor && false) {'],
      supersedes: ['      if (newerPatchOnKey) return false;', '      if (newerPatchOnKey && false) return false;'],
      ignoresPolicy: ["        if (s.onDispose === 'commit' || isSuperseded(transaction)) {", '        if (isSuperseded(transaction)) {']
    };
    for (const [name, [from, to]] of Object.entries(mutants)) {
      expect(lib.split(from).length - 1).toBe(1);
      const caught = differing(lib.replace(from, to)).seeds.length;
      expect({ name, caught: caught > 0 }).toEqual({ name, caught: true });
    }
  });
});

// ---- §C ------------------------------------------------------------------------------------------------------------

describe('§C the shapes a wire changes, and the refusals by name', () => {
  test('a wired Store Name is refused by name — the store module must be readable off the graph', () => {
    const ir = mutated(RENAME, (c) => connect(c, 'draft', 'value', 'renameUpdate', 'storeName'));
    expect(refusalOf(ir, RENAME, 'renameUpdate')).toBe('its Store Name is wired — which store it works on must be readable off the graph, where the store module is');
  });

  test('a store that defers as a whole (an authored Persist) is named in the refusal', () => {
    const ir = mutated(HOME, (h) => setParam(nodeIn(h, 'appStore'), 'persist', { kind: 'literal', value: true }));
    expect(refusalOf(ir, HOME, 'publish')).toBe('the store "app" it names is not exported: a declarer authors persist — browser-storage rehydration is not translatable');
  });

  test('a store that only an Optimistic Update names still gets its module, and the app typechecks', () => {
    const ir = mutated(RENAME, (c) => setParam(nodeIn(c, 'renameUpdate'), 'storeName', { kind: 'literal', value: 'drafts' }));
    const emitted = emitApp(ir, catalog);
    expect(emitted.files['src/stores/drafts.ts']).toContain('Written optimistically by "Rename" (net.noodl.OptimisticUpdate `renameUpdate` on /Components/Rename).');
    expect(emitted.files['src/stores/drafts.ts']).toContain("export const drafts = store<DraftsState>('drafts', {});");
    expect(emitted.files['src/components/Rename.tsx']).toContain('{ store: drafts, key: ');
    expect(typecheckEmittedApp(emitted)).toEqual([]);
  });

  test('an Optimistic Value only a handler holds is refused by name — a text input’s change event carries it, no render does', () => {
    const ir = mutated(RENAME, (c) => {
      c.connections = c.connections.filter((w) => !(w.fromId === 'draft' && w.toId === 'renameUpdate'));
      connect(c, 'titleInput', 'onTextChanged', 'renameUpdate', 'optimisticValue');
    });
    expect(refusalOf(ir, RENAME, 'renameUpdate')).toBe('its Optimistic Value input reads a value that only exists inside a handler');
  });

  test('a wired Key and Transaction Id are options, applied through the node’s setters as they change', () => {
    const ir = mutated(RENAME, (c) => {
      connect(c, 'draft', 'value', 'renameUpdate', 'key');
      connect(c, 'draft', 'value', 'renameUpdate', 'transactionId');
    });
    const emitted = emitApp(ir, catalog);
    expect(refusalOf(ir, RENAME, 'renameUpdate')).toBeUndefined();
    // a render read subscribes, so a new Key re-renders and the hook re-subscribes (the runtime's scheduled setup)
    expect(emitted.files['src/components/Rename.tsx']).toContain('const title = useValue(draftTitle);');
    expect(emitted.files['src/components/Rename.tsx']).toContain("{ store: app, key: title, transactionId: title, timeout: 0, onDispose: 'commit' }");
    expect(typecheckEmittedApp(emitted)).toEqual([]);
  });

  test('a pulse wired into a value input is refused by name, never emitted as a read', () => {
    const ir = mutated(HOME, (h) => connect(h, 'publish', 'applied', 'setNotice', 'value', 'signal'));
    expect(refusalOf(ir, HOME, 'publish')).toBe('its applied output is consumed as a value — a pulse carries nothing to read');
  });
});

// ---- §D ------------------------------------------------------------------------------------------------------------

describe('§D what building it found, and the one recorded difference', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test('the recorded difference: after an Apply with no Optimistic Value, a delete of the key is a supersession in the runtime and not in the export', () => {
    // The runtime writes undefined into the key: it exists, holding undefined. The exported store has no such state
    // (undefined is absence), so a later delete is no change there, and the Rollback restores where the runtime keeps.
    // The differential's generator never deletes a key an unvalued Apply has written (§B); this pins the difference.
    const ops: Op[] = [
      { op: 'set', slot: 0, port: 'key', value: 'a' },
      { op: 'write', key: 'a', value: 2 },
      { op: 'pulse', slot: 0, action: 'apply' },
      { op: 'del', key: 'a' },
      { op: 'pulse', slot: 0, action: 'rollback' }
    ];
    const last = (side: Side) => play(side, ops).slice(-1)[0] as { events: string[]; state: unknown };
    const runtime = last(runtimeSide());
    jest.clearAllTimers();
    const exported = last(exportSide());
    expect(runtime.events).toEqual(['0:rolledBack', '0:unchanged', '0:completed']);
    expect(runtime.state).toEqual({});
    expect(exported.events).toEqual(['0:rolledBack', '0:done', '0:completed']);
    expect(exported.state).toEqual({ a: 5 });
    // and without the delete the two agree: the rollback restores on both
    const without = ops.filter((o) => o.op !== 'del');
    expect(JSON.stringify(play(runtimeSide(), without))).toBe(JSON.stringify(play(exportSide(), without)));
  });

  test('the graph harness installs the world’s seeded Math.random — t03 differed on the generated Transaction Id without it', () => {
    const harness = fs.readFileSync(path.join(__dirname, 'helpers', 'node-spec-target.ts'), 'utf8');
    expect(harness).toContain('Math.random = () => world.random.next();');
    expect(historyLibSource()).toContain("  return 'tx_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 11);");
  });
});

// ---- §E ------------------------------------------------------------------------------------------------------------

describe('§E the ledger', () => {
  test('the row is translated, and it is not badged in the editor any more', () => {
    expect(ledgerEntryOf('net.noodl.OptimisticUpdate')?.status).toBe('translated');
    expect(exportBadgeOf('net.noodl.OptimisticUpdate')).toBeUndefined();
  });

  test('the picker floor moved by one in the same change', () => {
    const ledger = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'coverage-ledger.json'), 'utf8'));
    expect(ledger.pickerCoverageFloor).toBe(130); // EXP-011 §79 Sign In With (session 109) on top of EXP-011 §78 part 2 Optimistic Update (session 108) on top of §78 State History + Undo / Redo + State Snapshot (session 107)
  });
});
