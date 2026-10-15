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
 * EXP-011 §78 — `State History` (`net.noodl.StateHistory`), `Undo / Redo` (`net.noodl.StateHistory.Undo`) and
 * `State Snapshot` (`net.noodl.StateSnapshot`): the streaming table's tenth to twelfth members, one module
 * (`src/lib/history.ts`) holding the app's one history manager and its named checkpoints over the exported Global Store.
 *
 * Built on `tests/fixtures/history-desk`: a Global Store "app" declares title "Untitled"; a text input and a Save button
 * write it; a Subscribe shows it. A State History (Max History 20) shows three of its values and has Clear History; an
 * Undo / Redo has Undo, Redo and Back to start (Jump To 0) and shows its Error. The placed Checkpoint holds a State
 * Snapshot of the same store, so the history and the checkpoints are reached from two components by the store alone.
 *
 * §A the fixture whole · §B the lib's history manager and store seam against the runtime's own statehistory.ts over its
 * own globalstore.ts (a differential over seeded scripts, not a reading) · §C the shapes a wire changes and the refusals
 * · §D what building it found · §E the ledger. The node shells are graded on the export by the graph scenarios (t02,
 * `tests/node-spec-graph.test.ts`), all four of which play and pass.
 */

const FIXTURE = path.join(__dirname, 'fixtures', 'history-desk');
const REPO = path.join(__dirname, '..', '..', '..');
const RUNTIME_AGENT = path.join(REPO, 'packages', 'noodl-runtime', 'src', 'nodes', 'std-library', 'agent');
const CORE_SRC = path.join(REPO, 'packages', 'nodegx-core', 'src');
const catalog: Catalog = loadCatalog();
const index = new CatalogIndex(catalog);
const baseIr = parseProject(FIXTURE, catalog);
const app = emitApp(baseIr, catalog);

const HOME = 'Pages/Home';
const CHECKPOINT = 'Components/Checkpoint';

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

  test('State History and Undo / Redo print as hooks handed the store module, with the literal inputs as options', () => {
    const home = app.files['src/pages/Home.tsx'];
    expect(home).toContain("import { useStateHistory, useUndoRedo } from '../lib/history';");
    expect(home).toContain("import { app } from '../stores/app';");
    expect(home).toContain("const history = useStateHistory({ label: 'History', nodeId: 'history', componentName: '/Pages/Home' }, { store: app, maxHistory: 20 });");
    expect(home).toContain("const steps = useUndoRedo({ label: 'Steps', nodeId: 'steps', componentName: '/Pages/Home' }, { store: app });");
    expect(home).toContain('<button onClick={() => steps.undo()}>Undo</button>');
    expect(home).toContain('<button onClick={() => steps.redo()}>Redo</button>');
    // Target Index is carried by Jump To, read at the pulse
    expect(home).toContain('<button onClick={() => steps.jumpTo(0)}>Back to start</button>');
    expect(home).toContain('<button onClick={() => history.clearHistory()}>Clear history</button>');
    expect(home).toContain('{String(history.historySize)}');
    expect(home).toContain('{String(history.canUndo)}');
    expect(home).toContain('// History — a State History (statehistorynode.ts), hosted by history.ts');
  });

  test('the State Snapshot prints in the other component, handed the same store module — one history for the app', () => {
    const checkpoint = app.files['src/components/Checkpoint.tsx'];
    expect(checkpoint).toContain("import { useStateSnapshot } from '../lib/history';");
    expect(checkpoint).toContain("import { app } from '../stores/app';");
    expect(checkpoint).toContain("useStateSnapshot({ label: 'Checkpoint', nodeId: 'cp', componentName: '/Components/Checkpoint' }, { store: app });");
    // Snapshot Name is carried by both verbs, read at the pulse
    expect(checkpoint).toContain("<button onClick={() => checkpoint.save('saved')}>Save checkpoint</button>");
    expect(checkpoint).toContain("<button onClick={() => checkpoint.restore('saved')}>Restore checkpoint</button>");
    expect(app.files[HISTORY_LIB_PATH]).toContain('export const stateHistoryManager = new StateHistoryManager();');
  });

  test("the store module names the three nodes it is handed to, beside its declarer and writer", () => {
    const store = app.files['src/stores/app.ts'];
    expect(store).toContain(' * History kept by "History" (net.noodl.StateHistory `history` on /Pages/Home).');
    expect(store).toContain(' * Stepped through by "Steps" (net.noodl.StateHistory.Undo `steps` on /Pages/Home).');
    expect(store).toContain(' * Checkpointed by "Checkpoint" (net.noodl.StateSnapshot `cp` on /Components/Checkpoint).');
  });

  test('an app with none of the three ships no history.ts', () => {
    const ir = cloneIr();
    for (const p of [HOME, CHECKPOINT]) {
      const c = componentOf(ir, p);
      c.nodes = c.nodes.filter((n) => !['net.noodl.StateHistory', 'net.noodl.StateHistory.Undo', 'net.noodl.StateSnapshot'].includes(n.type));
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
const loaderOf = (stubs: Record<string, unknown> = {}) => {
  const cache = new Map<string, { exports: AnyModule }>();
  const load = (file: string): AnyModule => {
    const hit = cache.get(file);
    if (hit) return hit.exports;
    const module = { exports: {} as AnyModule };
    cache.set(file, module);
    const req = (id: string): unknown => {
      if (stubs[id] !== undefined) return stubs[id];
      if (id.startsWith('.')) {
        const base = path.resolve(path.dirname(file), id);
        for (const candidate of [`${base}.ts`, path.join(base, 'index.ts')]) if (fs.existsSync(candidate)) return load(candidate);
      }
      return {};
    };
    // eslint-disable-next-line no-new-func
    new Function('require', 'module', 'exports', transpiled(file, () => fs.readFileSync(file, 'utf8')))(req, module, module.exports);
    return module.exports;
  };
  return load;
};
/** The runtime's own statehistory.ts over its own globalstore.ts and model.ts, fresh. */
const runtimeHistory = () => {
  const load = loaderOf();
  return { gsm: load(path.join(RUNTIME_AGENT, 'globalstore.ts')).globalStoreManager, shm: load(path.join(RUNTIME_AGENT, 'statehistory.ts')).stateHistoryManager };
};
/** The lib over @nodegx/core's own store, both fresh. `source` defaults to the emitted lib (a mutant can be handed in). */
const exportHistory = (source = historyLibSource()) => {
  const core = loaderOf()(path.join(CORE_SRC, 'index.ts'));
  const raised: unknown[] = [];
  const module = { exports: {} as AnyModule };
  const req = (id: string): unknown => (id === '@nodegx/core' ? core : id === './errors' ? { raiseAppError: (e: unknown) => raised.push(e) } : {});
  // eslint-disable-next-line no-new-func
  new Function('require', 'module', 'exports', transpiled(`lib:${source.length}:${source.slice(-64)}`, () => source))(req, module, module.exports);
  return { core, lib: module.exports, raised };
};

/** A seeded generator (mulberry32), so a failing script is reproducible by its seed. */
const rng = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

class Thing {
  constructor(public n: number) {}
}
const sharedThing = new Thing(1);
const sharedFn = () => 1;
const KEYS = ['a', 'b', 'c', 'd'];
/** Factories, so each side gets objects of its own; the two by-reference values are the same on both sides. */
const VALUES: Array<() => unknown> = [() => 0, () => 1, () => 2, () => 'x', () => 'y', () => '', () => true, () => false, () => null, () => ({ n: 1 }), () => ({ n: 1, deep: { list: [1, 2] } }), () => [1, 2, 3], () => [], () => new Date(5), () => sharedThing, () => sharedFn];

type Op =
  | { op: 'set'; key: string; value: number }
  | { op: 'del'; key: string }
  | { op: 'undo' }
  | { op: 'redo' }
  | { op: 'jump'; index: number }
  | { op: 'clear' }
  | { op: 'save'; name: string }
  | { op: 'restore'; name: string }
  | { op: 'restoreData'; data: unknown }
  | { op: 'advance'; ms: number }
  | { op: 'configure'; options: Record<string, unknown> }
  | { op: 'attach2' };
interface Script {
  initial: Record<string, unknown>;
  attachOptions: Record<string, unknown>;
  ops: Op[];
}

const scriptOf = (seed: number): Script => {
  const r = rng(seed);
  const pick = <T>(list: T[]): T => list[Math.floor(r() * list.length)];
  const ops: Op[] = [];
  for (let i = 0; i < 30; i++) {
    const roll = r();
    if (roll < 0.34) ops.push({ op: 'set', key: pick(KEYS), value: Math.floor(r() * VALUES.length) });
    // a delete is the seam's own write (an undo or a restore); a graph's Set never sends undefined
    else if (roll < 0.4) ops.push({ op: 'del', key: pick(KEYS) });
    else if (roll < 0.52) ops.push({ op: 'undo' });
    else if (roll < 0.6) ops.push({ op: 'redo' });
    else if (roll < 0.65) ops.push({ op: 'jump', index: Math.floor(r() * 7) - 1 });
    else if (roll < 0.68) ops.push({ op: 'clear' });
    else if (roll < 0.73) ops.push({ op: 'save', name: pick(['cp', 'cp2', '']) });
    else if (roll < 0.78) ops.push({ op: 'restore', name: pick(['cp', 'cp2', 'missing']) });
    else if (roll < 0.8) ops.push({ op: 'restoreData', data: pick<unknown>([{ state: { a: 9, z: 'q' } }, '{"state":{"b":3}}', { nope: 1 }, 'not json']) });
    else if (roll < 0.86) ops.push({ op: 'advance', ms: pick([1, 5, 20, 100]) });
    else if (roll < 0.95) {
      const options: Record<string, unknown> = {};
      if (r() < 0.4) options.maxHistory = pick([0, 1, 2, 3, 5, 50, -4, NaN]);
      if (r() < 0.4) options.coalesceMs = pick([0, 10, 50, -1]);
      if (r() < 0.3) options.enabled = r() < 0.5;
      if (r() < 0.3) options.trackKeys = pick([[], ['a'], ['a', 'b'], ['c']]);
      ops.push({ op: 'configure', options });
    } else ops.push({ op: 'attach2' });
  }
  return { initial: r() < 0.5 ? { a: 0 } : {}, attachOptions: { coalesceMs: pick([0, 0, 30]), maxHistory: pick([50, 4]), trackKeys: pick([[], [], ['a', 'b']]) }, ops };
};

/** A value as both sides can be compared on: undefined is absence, the two by-reference values by name, key order kept. */
const norm = (v: unknown): unknown => {
  if (v === sharedThing) return '<thing>';
  if (v === sharedFn) return '<fn>';
  if (v instanceof Date) return `<date ${v.getTime()}>`;
  if (Array.isArray(v)) return v.map(norm);
  if (v && typeof v === 'object') {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v)) if ((v as Record<string, unknown>)[k] !== undefined) out[k] = norm((v as Record<string, unknown>)[k]);
    return out;
  }
  return v;
};
// `takenAt` and `revision` are left out: the revision counts from the history module's first sight of the store (§78.4)
const snapNorm = (s: AnyModule | undefined) => (s ? { storeName: s.storeName, state: norm(s.state), byReference: s.byReference } : s);
const attempt = (fn: () => unknown) => {
  try {
    return { ok: fn() };
  } catch (e) {
    return { threw: String((e as Error).message) };
  }
};

/** Plays a script on one side; one observation per step: the result, how many history listeners heard it, the history, the store. */
const play = (script: Script, side: 'runtime' | 'export', libSource?: string): unknown[] => {
  let clock = 1000;
  const realNow = Date.now;
  Date.now = () => clock;
  const log: unknown[] = [];
  try {
    let api: { state(): unknown; set(k: string, v: unknown): void; del(k: string): void; attach(o: unknown, cb: () => void): () => void; save(n: string): unknown; restore(n: string): unknown; restoreData(d: unknown): unknown; shm: AnyModule };
    if (side === 'runtime') {
      const { gsm, shm } = runtimeHistory();
      shm.setClock(() => clock);
      if (Object.keys(script.initial).length) gsm.configureStore('app', { initialState: script.initial });
      api = {
        state: () => norm(gsm.getSnapshot('app').state),
        set: (k, v) => gsm.setKey('app', k, v),
        del: (k) => gsm.deleteKey('app', k),
        attach: (o, cb) => shm.attach('app', o, cb),
        save: (n) => shm.saveNamedSnapshot(n, 'app'),
        restore: (n) => shm.restoreNamedSnapshot(n, { storeName: 'app' }),
        restoreData: (d) => shm.restoreSnapshotData(d, { storeName: 'app' }),
        shm
      };
    } else {
      const { core, lib } = exportHistory(libSource);
      const store = core.store('app', script.initial);
      const shm = lib.stateHistoryManager;
      shm.setClock(() => clock);
      api = {
        state: () => norm(lib.getSnapshot(store).state),
        set: (k, v) => store.set({ [k]: v }),
        del: (k) => store.set({ [k]: undefined }),
        attach: (o, cb) => shm.attach(store, o, cb),
        save: (n) => shm.saveNamedSnapshot(n, store),
        restore: (n) => shm.restoreNamedSnapshot(n, store),
        restoreData: (d) => shm.restoreSnapshotData(d, store),
        shm
      };
    }
    let notified = 0;
    api.attach(script.attachOptions, () => notified++);
    const info = () => {
      const i = api.shm.getHistoryInfo('app');
      return i && { ...i, entries: i.entries.map((e: unknown) => ({ ...(e as object) })) };
    };
    log.push({ info: info(), state: api.state() });
    for (const op of script.ops) {
      notified = 0;
      let result: unknown;
      if (op.op === 'set') result = attempt(() => api.set(op.key, VALUES[op.value]()));
      else if (op.op === 'del') result = attempt(() => api.del(op.key));
      else if (op.op === 'undo') result = attempt(() => api.shm.undo('app'));
      else if (op.op === 'redo') result = attempt(() => api.shm.redo('app'));
      else if (op.op === 'jump') result = attempt(() => api.shm.jumpTo('app', op.index));
      else if (op.op === 'clear') result = attempt(() => api.shm.clearHistory('app'));
      else if (op.op === 'save') result = attempt(() => snapNorm(api.save(op.name) as AnyModule));
      else if (op.op === 'restore') result = attempt(() => snapNorm(api.restore(op.name) as AnyModule));
      else if (op.op === 'restoreData') result = attempt(() => snapNorm(api.restoreData(op.data) as AnyModule));
      else if (op.op === 'advance') clock += op.ms;
      else if (op.op === 'configure') result = attempt(() => api.shm.configure('app', op.options));
      else result = attempt(() => api.attach({}, () => notified++)());
      log.push({ op, result, notified, info: info(), state: api.state() });
    }
  } finally {
    Date.now = realNow;
  }
  return log;
};

const SEEDS = 300;
/** The first step at which the two sides disagree, or null. */
const firstDifference = (seed: number, libSource?: string): string | null => {
  const script = scriptOf(seed);
  const a = play(script, 'runtime');
  const b = play(script, 'export', libSource);
  for (let i = 0; i < a.length; i++) {
    const x = JSON.stringify(a[i]);
    const y = JSON.stringify(b[i]);
    if (x !== y) return `seed ${seed} step ${i}\n runtime ${x}\n export  ${y}`;
  }
  return null;
};

describe('§B the history manager and the store seam, against the runtime’s own', () => {
  test(`${SEEDS} seeded scripts of 30 steps: every result, listener count, history and store state equal, step by step`, () => {
    const differences: string[] = [];
    for (let seed = 1; seed <= SEEDS; seed++) {
      const d = firstDifference(seed);
      if (d !== null) differences.push(d);
    }
    expect(differences.slice(0, 2)).toEqual([]);
  });

  test('the grid reaches every verb, every end-stop and refusal, coalescing, a by-reference key, a pause and a projected restore', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= SEEDS; seed++) {
      const script = scriptOf(seed);
      const log = play(script, 'runtime') as Array<{ op?: Op; result?: { ok?: unknown; threw?: string }; notified?: number; info: AnyModule }>;
      for (let i = 1; i < log.length; i++) {
        const { op, result, notified, info } = log[i];
        const before = log[i - 1].info;
        seen.add(op!.op + (result?.threw !== undefined ? ':threw' : '') + (result && result.ok === null ? ':null' : ''));
        for (const e of info.entries) seen.add(`entry:${String(e.description).split(':')[0]}`);
        if (info.byReferenceKeys.length) seen.add('byReference');
        if (op!.op === 'set' && notified! > 0 && info.size === before.size && info.enabled) seen.add('coalesced');
        if (op!.op === 'set' && info.size === before.size && info.size > 3) seen.add('trimmed-or-coalesced');
        if ((op!.op === 'undo' || op!.op === 'jump') && result?.ok && script.attachOptions.trackKeys && (script.attachOptions.trackKeys as string[]).length) seen.add('projected-restore');
      }
    }
    for (const k of ['set', 'del', 'undo', 'undo:null', 'redo', 'redo:null', 'jump', 'jump:null', 'clear', 'save', 'save:threw', 'restore', 'restore:threw', 'restoreData', 'restoreData:threw', 'configure', 'attach2', 'entry:Initial state', 'entry:Changed', 'entry:Cleared', 'entry:Resumed', 'byReference', 'coalesced', 'trimmed-or-coalesced', 'projected-restore']) {
      expect([k, seen.has(k)]).toEqual([k, true]);
    }
  });

  test('the grid can see: a seam that commits a write which changed nothing differs within the first scripts', () => {
    const line = '    if (changedKeys.length === 0) return;';
    expect(historyLibSource()).toContain(line);
    const mutant = historyLibSource().replace(line, '');
    let caught = 0;
    for (let seed = 1; seed <= 40; seed++) if (firstDifference(seed, mutant) !== null) caught++;
    expect(caught).toBeGreaterThan(0);
  });

  test('the grid can see: a restore that records itself differs within the first scripts', () => {
    const line = '    if (!record.enabled || record.restoring) return;';
    expect(historyLibSource()).toContain(line);
    const mutant = historyLibSource().replace(line, '    if (!record.enabled) return;');
    let caught = 0;
    for (let seed = 1; seed <= 40; seed++) if (firstDifference(seed, mutant) !== null) caught++;
    expect(caught).toBeGreaterThan(0);
  });
});

// ---- §C ------------------------------------------------------------------------------------------------------------

describe('§C the shapes a wire changes, and the refusals by name', () => {
  test('a wired Store Name is refused by name, on each of the three — the store module must be readable off the graph', () => {
    const sentence = 'its Store Name is wired — which store it works on must be readable off the graph, where the store module is';
    const home = mutated(HOME, (h) => {
      connect(h, 'titleInput', 'onTextChanged', 'history', 'storeName');
      connect(h, 'titleInput', 'onTextChanged', 'steps', 'storeName');
    });
    expect(refusalOf(home, HOME, 'history')).toBe(sentence);
    expect(refusalOf(home, HOME, 'steps')).toBe(sentence);
    const cp = mutated(CHECKPOINT, (c) => {
      c.nodes.push({ ...nodeIn(c, 'cpError'), id: 'nameInput', type: 'net.noodl.controls.textinput', parameters: [] } as NodeIR);
      connect(c, 'nameInput', 'onTextChanged', 'cp', 'storeName');
    });
    expect(refusalOf(cp, CHECKPOINT, 'cp')).toBe(sentence);
  });

  test('a store that defers as a whole (an authored Persist) is named in the refusal', () => {
    const ir = mutated(HOME, (h) => setParam(nodeIn(h, 'appStore'), 'persist', { kind: 'literal', value: true }));
    expect(refusalOf(ir, HOME, 'history')).toBe('the store "app" it names is not exported: a declarer authors persist — browser-storage rehydration is not translatable');
  });

  test('a store that only a history node names still gets its module, and the app typechecks', () => {
    const ir = mutated(HOME, (h) => setParam(nodeIn(h, 'history'), 'storeName', { kind: 'literal', value: 'drafts' }));
    const emitted = emitApp(ir, catalog);
    expect(emitted.files['src/stores/drafts.ts']).toContain('History kept by "History" (net.noodl.StateHistory `history` on /Pages/Home).');
    expect(emitted.files['src/stores/drafts.ts']).toContain("export const drafts = store<DraftsState>('drafts', {});");
    expect(emitted.files['src/pages/Home.tsx']).toContain('{ store: drafts, maxHistory: 20 }');
    expect(typecheckEmittedApp(emitted)).toEqual([]);
  });

  test('a wired Target Index is read at the Jump To pulse; a wired Snapshot Name at the Save and the Restore pulse', () => {
    const home = mutated(HOME, (h) => connect(h, 'watchTitle', 'value', 'steps', 'targetIndex'));
    expect(refusalOf(home, HOME, 'steps')).toBeUndefined();
    expect(emitApp(home, catalog).files['src/pages/Home.tsx']).toContain('<button onClick={() => steps.jumpTo(app.get().title)}>Back to start</button>');
    const cp = mutated(CHECKPOINT, (c) => {
      c.nodes.push({ id: 'nameVar', type: 'Variable2', label: 'Checkpoint name', parameters: [{ name: 'name', value: { kind: 'literal', value: 'cpName' } }], children: [], declaredPorts: [] } as unknown as NodeIR);
      connect(c, 'nameVar', 'value', 'cp', 'snapshotName');
    });
    const emitted = emitApp(cp, catalog);
    expect(refusalOf(cp, CHECKPOINT, 'cp')).toBeUndefined();
    expect(emitted.files['src/components/Checkpoint.tsx']).toMatch(/checkpoint\.save\(cpName\w*\.get\(\)\)/);
    expect(emitted.files['src/components/Checkpoint.tsx']).toMatch(/checkpoint\.restore\(cpName\w*\.get\(\)\)/);
    expect(typecheckEmittedApp(emitted)).toEqual([]);
  });

  test('Track Keys, Coalesce and Enabled are options, applied through the node’s setters as they change', () => {
    const ir = mutated(HOME, (h) => {
      setParam(nodeIn(h, 'history'), 'trackKeys', { kind: 'literal', value: 'title' });
      setParam(nodeIn(h, 'history'), 'coalesceMs', { kind: 'literal', value: 300 });
      setParam(nodeIn(h, 'history'), 'enabled', { kind: 'literal', value: false });
    });
    expect(emitApp(ir, catalog).files['src/pages/Home.tsx']).toContain("{ store: app, trackKeys: 'title', maxHistory: 20, coalesceMs: 300, enabled: false }");
  });

  test('a pulse wired into a value input is refused by name, never emitted as a read', () => {
    const ir = mutated(HOME, (h) => connect(h, 'steps', 'undone', 'setTitle', 'value', 'signal'));
    expect(refusalOf(ir, HOME, 'steps')).toBe('its undone output is consumed as a value — a pulse carries nothing to read');
  });
});

// ---- §D ------------------------------------------------------------------------------------------------------------

describe('§D what building it found', () => {
  test('the store keeps the runtime’s key order: a key that disappears and comes back is last, in a snapshot and in a restore’s changed keys', () => {
    // The runtime's Model deletes a key outright, so writing it again appends it. The exported store has no delete and
    // keeps the key in place (as undefined). Before the seam kept its own order, 26 of 300 scripts differed: the
    // History's By-Reference Keys ("d,a" against "a,d") and a full restore's Changed description.
    const { core, lib } = exportHistory();
    const store = core.store('app', { a: 1, b: 2 });
    lib.getSnapshot(store);
    store.set({ a: undefined });
    store.set({ a: 3 });
    expect(Object.keys(store.peek())).toEqual(['a', 'b']);
    expect(Object.keys(lib.getSnapshot(store).state)).toEqual(['b', 'a']);
    const { gsm } = runtimeHistory();
    gsm.configureStore('app', { initialState: { a: 1, b: 2 } });
    gsm.deleteKey('app', 'a');
    gsm.setKey('app', 'a', 3);
    expect(Object.keys(gsm.getSnapshot('app').state)).toEqual(['b', 'a']);
  });

  test('a write that changed nothing is no commit: the history records nothing, as the runtime’s does', () => {
    const { core, lib } = exportHistory();
    const store = core.store('app', { title: 'x' });
    let heard = 0;
    lib.stateHistoryManager.attach(store, {}, () => heard++);
    store.set({ title: 'x' });
    expect([heard, lib.stateHistoryManager.getHistoryInfo('app').size]).toEqual([0, 1]);
    store.set({ title: 'y' });
    expect([heard, lib.stateHistoryManager.getHistoryInfo('app').size]).toEqual([1, 2]);
  });

  test('the graph harness serves a store module and installs the world’s clock — t02 could not play without either', () => {
    const harness = fs.readFileSync(path.join(__dirname, 'helpers', 'node-spec-target.ts'), 'utf8');
    expect(harness).toContain('const st = /^\\.\\.\\/stores\\/([\\w-]+)$/.exec(id);');
    expect(harness).toContain('Date.now = () => world.clock.now();');
  });
});

// ---- §E ------------------------------------------------------------------------------------------------------------

describe('§E the ledger', () => {
  test('all three rows are translated, and none is badged in the editor any more', () => {
    for (const type of ['net.noodl.StateHistory', 'net.noodl.StateHistory.Undo', 'net.noodl.StateSnapshot']) {
      expect(ledgerEntryOf(type)?.status).toBe('translated');
      expect(exportBadgeOf(type)).toBeUndefined();
    }
  });

  test('the picker floor moved by three in the same change', () => {
    const ledger = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'coverage-ledger.json'), 'utf8'));
    expect(ledger.pickerCoverageFloor).toBe(128); // EXP-011 §78 State History + Undo / Redo + State Snapshot (session 107) on top of §77 Action Dispatcher + Action Handler (session 106)
  });
});
