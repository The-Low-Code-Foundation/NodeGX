/**
 * EXP-022 S5 (AC4) — P107's graph scenarios (CONTRACT.md C1–C11) on the Swift export, graded as `node-spec-graph.test.ts`
 * grades the React export: the same runner, the same projection, the same three bounds, printed and never hidden.
 *
 * - **outside** is counted apart, by whose limit it is: the harness's (one harness for both targets: its limits are read
 *   off the React target's own `canPlay`), the plan's (the plan's own notes, which both printers read, so the same
 *   scenarios in the same words), and the Swift printer's (a node, button or wire the plan keeps and Swift does not
 *   print: §7's cut). Outside is never conforming.
 * - **the reach** is the lifted outputs whose push the Swift printer printed; signals and outcomes are projected out.
 * - **C7, C8 and G1** are asserted as DIFFERENCES, as on React: the scenario's `divergence.export` is carried to this
 *   target, because the Swift app prints the same plan. A run where Swift agrees with the runtime there is the finding.
 *
 * And one row React's file has no counterpart for: on every scenario both exports play, Swift's trace equals React's,
 * event for event. That is the claim this task measures (§7): a second printer of the same plan, the same behaviour.
 *
 * The verdict rows run in the package suite (they emit, and build nothing). The play is one `swift build` and one
 * `swift test` (helpers/swift-graph-target.ts), behind `NODEGX_SWIFT_BUILD=1` on a Mac:
 *
 *   NODEGX_SWIFT_BUILD=1 npx jest tests/node-spec-graph-swift.test.ts
 */

import { formatGraphReport, loadGraphScenarios, runGraphScenarios, type GraphReport, type GraphScenario } from '../../nodegx-node-spec/src';
import { loadCatalog } from '../src/catalog';
import { emitSwiftApp } from '../src/emit/swift/emitSwift';
import { exportGraphTarget, probeProject } from './helpers/node-spec-target';
import { EXPORTER_VERDICT, playSwiftGraphs, swiftGraphTarget, swiftGraphVerdicts, SWIFT_PRINTER_VERDICT, type SwiftGraphRun } from './helpers/swift-graph-target';

const building = process.env.NODEGX_SWIFT_BUILD === '1' && process.platform === 'darwin';
const built = building ? test : test.skip;

/** The scenarios, each declared difference on the export carried to the Swift target: it prints the same plan. */
const scenarios: GraphScenario[] = loadGraphScenarios().map((sc) => (sc.divergence?.export !== undefined ? { ...sc, divergence: { ...sc.divergence, swift: sc.divergence.export } } : sc));
const verdicts = swiftGraphVerdicts(scenarios);
const react = exportGraphTarget();
const reactOutside = new Map(scenarios.map((sc) => [sc.name, react.canPlay!(sc)]));
const fileOf = (name: string) => (scenarios.find((s) => s.name === name)!.file ?? '').replace(/^.*\//, '').replace(/\.json$/, '');

let run: SwiftGraphRun | undefined;
let report: GraphReport | undefined;
let reactReport: GraphReport | undefined;

beforeAll(async () => {
  if (!building) return;
  run = playSwiftGraphs('node-spec-graphs', scenarios, verdicts);
  report = await runGraphScenarios(swiftGraphTarget(verdicts, run), scenarios);
  // eslint-disable-next-line no-console
  console.log(`${formatGraphReport(report)}\n(${run.scenarios} scenarios in one package, one swift test: ${run.buildMs} ms)`);
  reactReport = await runGraphScenarios(exportGraphTarget(), loadGraphScenarios());
}, 900_000);

describe('the verdicts: what the Swift export can play, and whose limit the rest is', () => {
  const outside = verdicts.filter((v) => v.outside !== undefined);
  const swiftPrinter = outside.filter((v) => SWIFT_PRINTER_VERDICT.test(v.outside!));
  const plan = outside.filter((v) => !SWIFT_PRINTER_VERDICT.test(v.outside!) && EXPORTER_VERDICT.test(v.outside!));
  const harness = outside.filter((v) => !EXPORTER_VERDICT.test(v.outside!) && !SWIFT_PRINTER_VERDICT.test(v.outside!));

  // EXP-022 S7. The stores carried (Global Store, State History, Optimistic Update, Action Dispatcher): 13 → 4.
  test('V1 the split, pinned: 14 playable; 21 outside on the plan, 4 on the Swift printer, 46 on the harness', () => {
    expect({ of: verdicts.length, playable: verdicts.length - outside.length, plan: plan.length, swiftPrinter: swiftPrinter.length, harness: harness.length }).toEqual({
      of: 85,
      playable: 14,
      plan: 21,
      swiftPrinter: 4,
      harness: 46
    });
  });

  test("V2 the plan's verdict is one verdict: the scenarios React leaves outside on the exporter's words are Swift's, in the same words", () => {
    const reactExporter = scenarios.filter((sc) => EXPORTER_VERDICT.test(reactOutside.get(sc.name) ?? '')).map((sc) => sc.name);
    expect(plan.map((v) => v.name)).toEqual(reactExporter);
    for (const v of plan) expect(v.outside).toBe(reactOutside.get(v.name)!.replace(/Components\/Probe: /g, ''));
    // and the harness's limits are the React harness's, scenario for scenario
    for (const v of harness) expect(v.outside).toBe(reactOutside.get(v.name));
  });

  test("V3 the Swift printer's 4 are On App Error, which no ruling carries (S5's 13 less the 9 stores S7 carried)", () => {
    const byFile: Record<string, number> = {};
    for (const v of swiftPrinter) byFile[fileOf(v.name)] = (byFile[fileOf(v.name)] ?? 0) + 1;
    expect(byFile).toEqual({ 't07-on-app-error': 4 });
    // every one of them React plays: the Swift printer's verdict is the whole of the difference between the two reaches
    for (const v of swiftPrinter) expect(reactOutside.get(v.name)).toBeUndefined();
  });

  test('V4 Swift plays nothing React does not: the clause scenarios (C2, the G1 diamond, C7, C8, C10) and, since S7, the 9 store scenarios', () => {
    const playable = verdicts.filter((v) => v.outside === undefined);
    for (const v of playable) expect(reactOutside.get(v.name)).toBeUndefined();
    expect(playable.map((v) => fileOf(v.name)).sort()).toEqual([
      'c02-every-send-is-delivered',
      'c06-upstream-is-pulled-first',
      'c07-lockstep',
      'c08-the-first-update-consolidates',
      'c10-units-travel-as-objects',
      't01-global-store',
      't02-state-history',
      't02-state-history',
      't02-state-history',
      't02-state-history',
      't03-optimistic-update',
      't03-optimistic-update',
      't04-action-dispatcher',
      't04-action-dispatcher'
    ]);
  });

  test("V5 a Log prints (S5): C10's two Log buttons write what the React export's `log('info', undefined)` writes — before S5 they were C10's only loss", () => {
    const c10 = verdicts.find((v) => fileOf(v.name) === 'c10-units-travel-as-objects')!;
    const app = emitSwiftApp(probeProject(c10.component!), loadCatalog());
    const view = app.files['Sources/NodeSpecKit/Views/ProbeView.swift'];
    expect(view.match(/JS\.log\(.*\)/g)).toEqual(['JS.log("info", nil)', 'JS.log("info", nil)']);
    expect(app.files['Sources/NodeSpecKit/Support.swift']).toContain('let text = message == nil || message is NSNull ? "" : string(message)');
  });

  test('V6 a project with no routed page gets a Router that builds (P18-EXP022-S5-NOROUTE): one case that draws nothing, and a start value', () => {
    const app = emitSwiftApp(probeProject(verdicts.find((v) => v.component)!.component!), loadCatalog());
    const router = app.files['Sources/NodeSpecKit/Router.swift'];
    expect(router).toContain('public enum Route: Hashable {\n  case none\n}');
    expect(router).toContain('@Published public var current: Route = .none');
    expect(router).toContain('case .none: EmptyView()');
  });
});

describe('the play: one package, one swift test', () => {
  built('B1 the ledger line (Swift), pinned beside React\'s: played, conforming and declared-different counted apart; outside never conforms', () => {
    const r = report!;
    // The runner counts a throw as a difference, so a package that did not build reads "differ as declared" on every
    // declared difference (S5's first run did). A play that threw is not counted: it is this row's failure, by name.
    expect([...run!.plays].filter(([, p]) => p.error !== undefined || p.missing.length > 0).map(([name, p]) => `${name}: ${p.error ?? `no Button ${p.missing.join(', ')}`}`)).toEqual([]);
    const count = (s: string) => r.results.filter((x) => x.status === s).length;
    const outside = r.results.filter((x) => x.status === 'outside');
    const swiftPrinter = outside.filter((x) => SWIFT_PRINTER_VERDICT.test(x.reason ?? '')).length;
    const exporter = outside.filter((x) => EXPORTER_VERDICT.test(x.reason ?? '') || SWIFT_PRINTER_VERDICT.test(x.reason ?? '')).length;
    const line = {
      of: r.results.length,
      played: r.results.length - outside.length,
      conforming: count('passed'),
      declaredDifferent: count('diverged'),
      knownRows: count('known'),
      failing: count('failed'),
      outsideExporter: exporter,
      outsideSwiftPrinter: swiftPrinter,
      outsideHarness: outside.length - exporter
    };
    // eslint-disable-next-line no-console
    console.log(`P18 ledger (Swift): ${line.conforming} of ${line.of} graph scenarios conform on the Swift export — ${line.played} played (${line.conforming} conform, ${line.declaredDifferent} differ as declared, ${line.knownRows} known rows, ${line.failing} fail on filed rows); ${line.outsideExporter} outside on the exporter's verdict (${line.outsideExporter - line.outsideSwiftPrinter} the plan's, ${line.outsideSwiftPrinter} the Swift printer's), ${line.outsideHarness} on this harness's limits`);
    expect(r.results.filter((x) => x.status === 'refused')).toEqual([]);
    expect(line).toEqual({ of: 85, played: 14, conforming: 11, declaredDifferent: 3, knownRows: 0, failing: 0, outsideExporter: 25, outsideSwiftPrinter: 4, outsideHarness: 46 });
  });

  built('B2 the claim: on every scenario both exports play, the Swift app\'s trace equals the React export\'s, event for event', () => {
    const both = report!.results.filter((s) => s.status !== 'outside' && reactReport!.results.find((x) => x.name === s.name)?.status !== 'outside');
    expect(both.length).toBe(14);
    for (const s of both) {
      const r = reactReport!.results.find((x) => x.name === s.name)!;
      expect({ name: s.name, status: s.status, trace: s.actual }).toEqual({ name: s.name, status: r.status, trace: r.actual });
    }
  });

  built('B3 the three declared differences differ on Swift as on React: the Counter behind the And stays at 1 (C7, G1); C8\'s two Increases are two deliveries', () => {
    const result = (file: string) => report!.results.find((x) => fileOf(x.name) === file && x.status !== 'outside')!;
    for (const file of ['c06-upstream-is-pulled-first', 'c07-lockstep']) {
      const r = result(file);
      expect(r.status).toBe('diverged');
      expect(r.actual?.some((e) => e.t === 'value' && e.subject === 'c' && e.port === 'currentCount' && e.value === 3)).toBe(false);
    }
    const c8 = result('c08-the-first-update-consolidates');
    expect(c8.status).toBe('diverged');
    expect(c8.actual?.some((e) => e.t === 'value' && e.subject === 'c' && e.port === 'currentCount' && e.value === 3)).toBe(true);
  });

  built('B4 one build and one process for every played scenario', () => {
    expect(run!.scenarios).toBe(14);
    expect(Object.keys(run!.files).filter((f) => /\/Views\/Probe\d+View\.swift$/.test(f))).toHaveLength(14);
  });
});
