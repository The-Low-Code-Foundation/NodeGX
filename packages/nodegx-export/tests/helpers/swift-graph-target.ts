/**
 * EXP-022 S5 (AC4). The Swift export as a graph target: P107's graph scenarios (CONTRACT.md C1–C11) on the SwiftUI app
 * the second printer writes, graded by the same runner, the same projection and the same settle rule as the React
 * export's `exportGraphTarget` (node-spec-target.ts).
 *
 * WHY IT IS TWO HALVES. The React target is driven step by step: each press is an `act` in this process. A Swift app
 * runs in another process, and a `swift test` launch costs seconds, so one process per scenario (S3's way) does not
 * scale to 85. So:
 *
 *   1. `swiftGraphVerdicts` decides, per scenario, whether the Swift export can play it, in the same three bounds as
 *      React: the harness's limits (read off the React target's own `canPlay`, so the two harnesses are one), the
 *      exporter's verdict (the plan's own notes, which both printers read, then what the Swift printer reports it does
 *      not print), and the reach (the lifted outputs whose push the Swift printer printed).
 *   2. `playSwiftGraphs` prints EVERY playable scenario's probe as its own component of ONE package (`Probe<k>`), writes
 *      one XCTest that plays each scenario's steps in order through the package's own `Drive` (a press by label, a prop
 *      moved, a settle) and records what each lifted callback last delivered at every settle, then runs `swift test`
 *      once. One build, one process.
 *   3. `swiftGraphTarget` replays those snapshots through the runner's `playGraph`: `mountGraph`, `signal` and `set`
 *      write the same events the React target writes, and `settle` takes the next snapshot and records a value when its
 *      canonical form moved, exactly as the React target's `settle` does. So the grading is the runner's, untouched.
 *
 * macOS only, and a heavy job (a `swift build`): behind `NODEGX_SWIFT_BUILD=1` in the test that calls `playSwiftGraphs`.
 */

import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import type { GraphReach, GraphScenario, GraphTarget, Handle, TraceEvent } from '../../../nodegx-node-spec/src';
import { canonicalise, parseEndpoint, projectGraphTrace } from '../../../nodegx-node-spec/src';
import { hasObservation } from '../../../nodegx-node-spec/src/runner/compare';
import { CatalogIndex, loadCatalog, type Catalog } from '../../src/catalog';
import { planProject, type ComponentPlan } from '../../src/analyze/plan';
import { emitSwiftApp } from '../../src/emit/swift/emitSwift';
import { ident } from '../../src/emit/swift/view';
import type { ComponentIR, ExportIR } from '../../src/ir/types';
import { asRuntimeHarnessNames, drivenInputs, exportGraphTarget, graphComponent, probeProject } from './node-spec-target';
import { World } from '../../../nodegx-node-spec/src/world';
import { specFor } from '../../../nodegx-node-spec/src/nodes';
import { rawString, writePackage } from './export-swift-arm';

let catalogCache: Catalog | undefined;
const catalog = (): Catalog => (catalogCache ??= loadCatalog());

/** The React target's words for a verdict that is the exporter's, not the harness's (node-spec-graph.test.ts). */
export const EXPORTER_VERDICT = /refused part of the graph|lifts none of the outputs|declares no prop for/;
/** The Swift printer's own verdict: a node, button or wire of the scenario the plan keeps and Swift does not print. */
export const SWIFT_PRINTER_VERDICT = /the Swift printer does not print part of the graph/;
/** The React target's refusal filter (emitGraph): a scenario node, its button or a wire, not the probe's own lift. */
const REFUSED = (note: string) => /\b(dropped|deferred)\b/.test(note) && !/->out:|node out \(Component Outputs\)|: output "/.test(note);
/** A lifted output the Swift printer has no push for: the reach's edge, not the graph's. */
const UNPUSHED = /^its output (\S+) is pushed from a .* expression, which the Swift target does not print yet$/;

export interface SwiftGraphVerdict {
  name: string;
  /** Why the Swift export cannot play it; absent when it can. */
  outside?: string;
  /** For a playable scenario: the probe, its plan, and the reach. */
  component?: ComponentIR;
  plan?: ComponentPlan;
  /** `<id>.<port>` → the Swift callback member, for every lifted output whose push the Swift printer printed. */
  lifted: Map<string, string>;
  /** `<id>.<port>` → the Swift prop member, for every value input a `set` step drives. */
  driven: Map<string, string>;
}

const reachOf = (lifted: ReadonlyMap<string, string>): GraphReach => ({ signals: false, outcomes: false, output: (subject, port) => lifted.has(`${subject}.${port}`) });

/** The verdict on every scenario, in order. Pure: it emits, and runs nothing. */
export function swiftGraphVerdicts(scenarios: readonly GraphScenario[]): SwiftGraphVerdict[] {
  const react = exportGraphTarget();
  const index = new CatalogIndex(catalog());
  return scenarios.map((sc): SwiftGraphVerdict => {
    const none = { name: sc.name, lifted: new Map<string, string>(), driven: new Map<string, string>() };
    // The harness is one harness: a limit the React target names (a world, a tree of instances, a late wire, a clock, a
    // type nothing knows) is this target's too, in its words. An exporter's verdict there is React's, so it is decided
    // again here, from what the Swift export reads.
    const reactOutside = react.canPlay!(sc);
    if (reactOutside !== undefined && !EXPORTER_VERDICT.test(reactOutside)) return { ...none, outside: reactOutside };
    const driven = drivenInputs(sc);
    const component = graphComponent(sc.nodes, sc.wires ?? [], driven);
    const ir = probeProject(component);
    const plan = planProject(ir, index).plans.find((p) => p.path === component.path)!;
    const refused = plan.notes.filter(REFUSED);
    if (refused.length) return { ...none, outside: `the exporter refused part of the graph: ${refused.join(' | ')}` };
    const app = emitSwiftApp(ir, catalog());
    const unpushed = new Set<string>();
    const lost: string[] = [];
    for (const l of app.preflight.swiftLosses) {
      const m = UNPUSHED.exec(l.what);
      if (m) unpushed.add(m[1]);
      else lost.push(`${l.nodeId}: ${l.what}`);
    }
    if (lost.length) return { ...none, outside: `the Swift printer does not print part of the graph: ${lost.join(' | ')}` };
    const lifted = new Map<string, string>();
    for (const id of Object.keys(sc.nodes)) {
      for (const o of plan.liftedOutputProps) {
        if (!o.port.startsWith(`${id}_`) || unpushed.has(o.prop)) continue;
        const port = o.port.slice(id.length + 1);
        // a node id holding `_` would make `<id>_<port>` ambiguous; the scenarios name none, and this says so if one does
        if (lifted.has(`${id}.${port}`)) throw new Error(`two lifted outputs read as ${id}.${port}`);
        lifted.set(`${id}.${port}`, ident(o.prop));
      }
    }
    const drivenMap = new Map<string, string>();
    for (const input of driven) {
      const prop = plan.props.find((p) => p.name === input.replace('.', '_'));
      if (prop) drivenMap.set(input, ident(prop.name));
    }
    const undriven = driven.filter((input) => !drivenMap.has(input));
    if (undriven.length) return { ...none, outside: `the emitted component declares no prop for ${undriven.join(', ')} — the set cannot reach it` };
    if (sc.expect && !hasObservation(projectGraphTrace(sc.expect, reachOf(lifted)))) {
      return { ...none, outside: `the exporter lifts none of the outputs this scenario observes (${unpushed.size} not pushed by the Swift printer)` };
    }
    return { name: sc.name, component, plan, lifted, driven: drivenMap };
  });
}

/** What the Swift app recorded for one scenario: each lifted callback's last value at every settle, and the presses that found no button. */
export interface SwiftGraphPlay {
  snapshots: Array<Record<string, unknown>>;
  missing: string[];
  error?: string;
}

/** A JSON value as the generated test hands it to Swift: undefined is absent, so a set to undefined passes nil. */
const swiftValue = (value: unknown) => (value === undefined ? 'nil' : `jsonValue(${rawString(JSON.stringify(value))})`);

/**
 * EXP-022 S7. The world the runner plays a scenario in (graph.ts `worldFor`, the same rule): the React target installs its
 * clock and its random source over `Date.now` and `Math.random`, and the store nodes read both (a history entry's time, a
 * transaction's and an action's id). So the Swift play is handed the same: the clock's time and the first random numbers.
 */
const RANDOMS = 512;
function worldOf(sc: GraphScenario): { now: number; randoms: number[] } | undefined {
  const needs = Object.values(sc.nodes).some((n) => (specFor(n.type)?.needs?.length ?? 0) > 0);
  if (sc.world === undefined && !needs) return undefined;
  const world = new World(sc.world ?? {});
  return { now: world.clock.now(), randoms: Array.from({ length: RANDOMS }, () => world.random.next()) };
}

/** The Swift that plays one scenario on its probe `Probe<k>View`. */
function playSource(k: number, sc: GraphScenario, v: SwiftGraphVerdict): string[] {
  const plan = v.plan!;
  const world = worldOf(sc);
  const struct = `Probe${k}View`;
  const liftedByProp = new Map([...v.lifted].map(([output, prop]) => [prop, output]));
  // A memberwise init takes its arguments in declaration order: props, then output callbacks, then lifted ones.
  const args = [
    ...plan.props.map((p) => `${ident(p.name)}: model.props[${JSON.stringify(ident(p.name))}] ?? nil`),
    ...plan.liftedOutputProps.filter((o) => liftedByProp.has(ident(o.prop))).map((o) => `${ident(o.prop)}: { model.latest[${JSON.stringify(liftedByProp.get(ident(o.prop)))}] = $0 }`)
  ];
  const initial: string[] = [];
  for (const [input, prop] of v.driven) {
    const { node, port } = parseEndpoint(input);
    const value = sc.nodes[node].params?.[port];
    if (value !== undefined) initial.push(`${JSON.stringify(prop)}: ${swiftValue(value)}`);
  }
  const steps: string[] = [];
  for (const step of sc.steps) {
    if (step === 'settle') steps.push('    drive.settle(); snapshots.append(model.snapshot())');
    else if ('signal' in step) steps.push(`    if !drive.press(${JSON.stringify(`${step.node}.${step.signal}`)}) { missing.append(${JSON.stringify(`${step.node}.${step.signal}`)}) }`);
    else if ('set' in step) steps.push(`    model.props[${JSON.stringify(v.driven.get(`${step.node}.${step.set}`)!)}] = ${swiftValue(step.value)}; drive.settle()`);
    else throw new Error(`${sc.name}: a ${Object.keys(step).join('/')} step reached the Swift play (the verdict admits none)`);
  }
  return [
    `  /// ${sc.name.replace(/\s+/g, ' ').slice(0, 110)}`,
    `  struct Host${k}: View {`,
    '    @ObservedObject var model: GraphModel',
    `    var body: some View { ${struct}(${args.join(', ')}) }`,
    '  }',
    `  func play${k}() -> [String: Any] {`,
    '    Scripts.shared.fresh()',
    ...(world ? [`    Scripts.shared.world(now: ${world.now}, randoms: [${world.randoms.map((r) => JSON.stringify(r)).join(', ')}])`] : []),
    `    let model = GraphModel([${initial.join(', ') || ':'}])`,
    `    let drive = Drive(Host${k}(model: model))`,
    '    var snapshots: [[String: Any]] = []',
    '    var missing: [String] = []',
    ...steps,
    '    drive.close()',
    '    return ["snapshots": snapshots, "missing": missing]',
    '  }',
    ''
  ];
}

const GRAPH_SUPPORT = [
  '/// The props a scenario drives (a `set` moves one, and the probe draws again), and what each lifted callback last sent.',
  '@MainActor',
  'final class GraphModel: ObservableObject {',
  '  @Published var props: [String: Any?]',
  '  /// `<node>.<port>` → the last value its callback delivered; undefined (nil) is no entry, as the React target skips it.',
  '  var latest: [String: Any] = [:]',
  '  init(_ props: [String: Any?]) { self.props = props }',
  '  func snapshot() -> [String: Any] { latest.mapValues(jsonable) }',
  '}',
  '',
  '/// A scenario\'s JSON value as the graph\'s values are in Swift (`JS`): a number is a Double, a boolean a Bool.',
  'func jsonValue(_ json: String) -> Any? {',
  '  native(try! JSONSerialization.jsonObject(with: Data(json.utf8), options: [.fragmentsAllowed]))',
  '}',
  'func native(_ x: Any) -> Any {',
  '  switch x {',
  '  case let n as NSNumber where CFGetTypeID(n) == CFBooleanGetTypeID(): return n.boolValue',
  '  case let n as NSNumber: return n.doubleValue',
  '  case let s as String: return s',
  '  case let a as [Any]: return a.map(native)',
  '  case let d as [String: Any]: return d.mapValues(native)',
  '  default: return x',
  '  }',
  '}',
  '/// A recorded value as JSON: a number JSON cannot hold is marked, and anything JavaScript made is read into Swift first.',
  'func jsonable(_ x: Any) -> Any {',
  '  switch x {',
  '  case is NSNull: return NSNull()',
  '  case let b as Bool: return b',
  '  case let d as Double: return d.isFinite ? d : ["$nonfinite": JS.string(d)]',
  '  case let i as Int: return i',
  '  case let s as String: return s',
  '  case let a as [Any?]: return a.map { $0.map(jsonable) ?? ["$undefined": true] }',
  '  case let a as [Any]: return a.map(jsonable)',
  '  case let d as [String: Any]: return d.mapValues(jsonable)',
  '  case let v as JSValue: return Scripts.shared.swift(v).map(jsonable) ?? ["$undefined": true]',
  '  default: return ["$unknown": String(describing: x)]',
  '  }',
  '}',
  ''
];

/** A recorded JSON value back as the trace format holds it. */
function revive(x: unknown): unknown {
  if (Array.isArray(x)) return x.map(revive);
  if (x && typeof x === 'object') {
    const o = x as Record<string, unknown>;
    if ('$nonfinite' in o) return Number(o.$nonfinite);
    if ('$undefined' in o) return undefined;
    return Object.fromEntries(Object.entries(o).map(([k, val]) => [k, revive(val)]));
  }
  return x;
}

export interface SwiftGraphRun {
  /** By scenario name. */
  plays: Map<string, SwiftGraphPlay>;
  /** The printed package, path → text (the probes and the generated test). */
  files: Record<string, string>;
  buildMs: number;
  scenarios: number;
}

/** Prints every playable scenario's probe into one package and plays them all in one `swift test`. */
export function playSwiftGraphs(
  name: string,
  scenarios: readonly GraphScenario[],
  verdicts: readonly SwiftGraphVerdict[],
  /** A mutant: the printed text changed before it is built (`exp-022/s5/mutants.ts`), so the rows can be seen to fail. */
  mutate?: (file: string, text: string) => string
): SwiftGraphRun {
  const played = scenarios.map((sc, i) => ({ sc, v: verdicts[i] })).filter(({ v }) => v.outside === undefined);
  const components = played.map(({ v }, k) => ({ ...v.component!, id: `probe-graph-${k}`, path: `Components/Probe${k}` }));
  const ir: ExportIR = { ...probeProject(components[0]), components };
  // EXP-022 S7. One package is one app, so a Global Store's name is one store across every probe: `Scripts.shared.fresh()`
  // empties it between plays, but its Initial State is the merge of every probe's declarers. A store that more than one
  // probe declares, with an Initial State, would start one scenario with another's keys; refused by name, not played.
  for (const store of planProject(ir, new CatalogIndex(catalog())).stores) {
    const probes = new Set(store.declarers.map((d) => d.componentPath));
    if (probes.size > 1 && store.keys.some((k) => k.required)) {
      throw new Error(`the store "${store.name}" has an Initial State and is declared by ${probes.size} probes: one package cannot keep their scenarios apart`);
    }
  }
  const app = emitSwiftApp(ir, catalog());
  const kit = `${app.preflight.appName}Kit`;
  const files: Record<string, string> = { ...app.files };
  const body = played.flatMap(({ sc, v }, k) => playSource(k, sc, v));
  files[`Tests/${kit}Tests/GraphTests.swift`] = [
    '// Written by tests/helpers/swift-graph-target.ts (EXP-022 S5): every playable graph scenario, played through the',
    '// package\'s own Drive, in one process. Each probe is its own component; each play records, at every settle, what',
    '// each lifted callback last delivered.',
    'import XCTest',
    'import Foundation',
    'import SwiftUI',
    'import JavaScriptCore',
    `@testable import ${kit}`,
    '',
    ...GRAPH_SUPPORT,
    '@MainActor',
    'final class GraphTests: XCTestCase {',
    ...body,
    '  func testGraphScenarios() throws {',
    `    let plays: [[String: Any]] = [${played.map((_, k) => `play${k}()`).join(', ')}]`,
    '    let data = try JSONSerialization.data(withJSONObject: plays)',
    '    // A file, not a line of output: `swift test` splits a long line (S7\'s 14 plays came back cut at 15,559 characters).',
    '    try data.write(to: URL(fileURLWithPath: ProcessInfo.processInfo.environment["NODEGX_GRAPHS_OUT"]!))',
    '  }',
    '}',
    ''
  ].join('\n');
  if (mutate) for (const f of Object.keys(files)) files[f] = mutate(f, files[f]);
  const dir = path.join(os.tmpdir(), 'nodegx-swift-arm', name);
  writePackage(dir, files);
  const t0 = Date.now();
  const plays = new Map<string, SwiftGraphPlay>();
  const out = path.join(dir, 'plays.json');
  fs.rmSync(out, { force: true });
  let error: string | undefined;
  try {
    execFileSync('nice', ['-n', '19', 'swift', 'test', '--filter', 'GraphTests'], {
      cwd: dir,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 64 * 1024 * 1024,
      env: { ...process.env, NODEGX_GRAPHS_OUT: out }
    });
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string };
    error = `the Swift package did not build or run: ${`${err.stdout ?? ''}\n${err.stderr ?? ''}`.split('\n').filter((l) => /error:/.test(l)).slice(0, 3).join(' | ') || String(e).split('\n')[0]}`;
  }
  const written = fs.existsSync(out) ? fs.readFileSync(out, 'utf-8') : undefined;
  if (!error && written === undefined) error = 'the Swift package wrote no plays';
  const recorded = written !== undefined ? (JSON.parse(written) as Array<{ snapshots: Array<Record<string, unknown>>; missing: string[] }>) : [];
  played.forEach(({ sc }, k) => {
    const r = recorded[k];
    plays.set(sc.name, r ? { snapshots: r.snapshots.map((s) => revive(s) as Record<string, unknown>), missing: r.missing } : { snapshots: [], missing: [], error: error ?? 'no play recorded' });
  });
  return { plays, files, buildMs: Date.now() - t0, scenarios: played.length };
}

interface SwiftGraphHandle extends Handle {
  graph: ReplayGraph;
}

interface ReplayGraph {
  ids: string[];
  /** EXP-022 S9. Each node's type, for the React target's one rename (`asRuntimeHarnessNames`). */
  types: Record<string, string>;
  live: Set<string>;
  play: SwiftGraphPlay;
  lifted: string[];
  latest: Record<string, unknown>;
  recorded: Record<string, string>;
  settles: number;
  events: Record<string, TraceEvent[]>;
  driven: ReadonlyMap<string, string>;
}

/**
 * The graph target over a finished Swift run. The runner asks `canPlay` and `graphReach` for a scenario and then plays
 * it; `mountGraph` is handed only the nodes and wires, so the scenario `canPlay` was last asked for is the one played
 * (the runner grades one scenario at a time, `runGraphScenarios`).
 */
export function swiftGraphTarget(verdicts: readonly SwiftGraphVerdict[], run: SwiftGraphRun | undefined): GraphTarget<SwiftGraphHandle> {
  const byName = new Map(verdicts.map((v) => [v.name, v]));
  let current: SwiftGraphVerdict | undefined;
  let live: ReplayGraph | undefined;
  const graphOf = (h: SwiftGraphHandle): ReplayGraph => {
    if (!h.graph.live.has(h.id)) throw new Error(`no live node ${h.id}`);
    return h.graph;
  };
  return {
    name: 'swift',
    canPlay(sc) {
      current = byName.get(sc.name);
      if (!current) throw new Error(`no Swift verdict for ${JSON.stringify(sc.name)}`);
      if (current.outside === undefined && !run) return 'not played: the Swift build is behind NODEGX_SWIFT_BUILD=1';
      return current.outside;
    },
    graphReach(sc) {
      return reachOf(byName.get(sc.name)!.lifted);
    },
    // The world is played inside the Swift app (`Scripts.shared.world`, written into each play from the same script), so
    // there is nothing to install here; the runner's clock never moves, as no played scenario advances it.
    install() {
      return () => undefined;
    },
    mountGraph(nodes) {
      const v = current!;
      const play = run!.plays.get(v.name);
      if (!play) throw new Error(`the Swift run holds no play for ${JSON.stringify(v.name)}`);
      if (play.error) throw new Error(play.error);
      const g: ReplayGraph = { ids: Object.keys(nodes), types: Object.fromEntries(Object.entries(nodes).map(([id, n]) => [id, n.type])), live: new Set(Object.keys(nodes)), play, lifted: [...v.lifted.keys()], latest: {}, recorded: {}, settles: 0, events: {}, driven: v.driven };
      const handles: Record<string, SwiftGraphHandle> = {};
      for (const id of g.ids) {
        g.events[id] = [];
        const params = nodes[id].params ?? {};
        for (const k of Object.keys(params)) {
          const val = params[k];
          g.events[id].push(val === undefined ? { t: 'set', port: k } : { t: 'set', port: k, value: canonicalise(val) });
        }
        handles[id] = { id, type: nodes[id].type, graph: g };
      }
      live = g;
      return handles;
    },
    mount() {
      throw new Error('the Swift graph target mounts graphs (mountGraph)');
    },
    set(h, port, value) {
      const g = graphOf(h);
      if (!g.driven.has(`${h.id}.${port}`)) throw new Error(`${h.type} on the Swift export has no prop driving "${port}"`);
      g.events[h.id].push(value === undefined ? { t: 'set', port } : { t: 'set', port, value: canonicalise(value) });
    },
    signal(h, port) {
      const g = graphOf(h);
      const label = `${h.id}.${port}`;
      if (g.play.missing.includes(label)) throw new Error(`the Swift probe draws no Button labelled ${label}`);
      g.events[h.id].push({ t: 'in', port });
    },
    async settle() {
      const g = live;
      if (!g) return;
      const snapshot = g.play.snapshots[g.settles++];
      if (!snapshot) throw new Error(`the Swift play recorded ${g.play.snapshots.length} settles; the scenario asks for a ${g.settles}th`);
      g.latest = snapshot;
      for (const id of g.ids) {
        if (!g.live.has(id)) continue;
        g.events[id].push({ t: 'settle' });
        const ports = g.lifted.filter((o) => o.startsWith(`${id}.`)).map((o) => o.slice(id.length + 1)).sort();
        for (const port of ports) {
          const output = `${id}.${port}`;
          if (!(output in g.latest) || g.latest[output] === undefined) continue;
          const value = canonicalise(asRuntimeHarnessNames(g.types[id], port, g.latest[output], g.latest[`${id}.nodeId`]));
          const k = JSON.stringify(value);
          if (g.recorded[output] === k) continue;
          g.recorded[output] = k;
          g.events[id].push({ t: 'value', port, value });
        }
      }
    },
    trace(h) {
      return h.graph.events[h.id].map((e) => ({ ...e }));
    },
    dispose(h) {
      h.graph.live.delete(h.id);
      if (live === h.graph && h.graph.live.size === 0) live = undefined;
    }
  };
}
