/**
 * NSP-008 — the graph scenarios (CONTRACT.md C1–C11) on the React export, graded against the
 * runtime's recording through the graph target (helpers/node-spec-target.ts `exportGraphTarget`).
 *
 * What the export can say about a clause is bounded three ways, and each bound is printed, never
 * hidden: a scenario it cannot play is `outside` with the exporter's own sentence (a consumed
 * change pulse, a value wire between two logic nodes, a late wire, a `set`); an event it cannot
 * observe (every signal and outcome) is projected out of the reference; and the two clauses
 * CONTRACT.md Part 2 says the library does not implement (C7's per-port queues, C8's first-update
 * consolidation) are asserted as DIFFERENCES — a run on which the export agrees with the runtime
 * there is the finding (AC3).
 *
 *   npx jest tests/node-spec-graph.test.ts
 */

import { formatGraphReport, loadGraphScenarios, runGraphScenarios, type GraphReport } from '../../nodegx-node-spec/src';
import { exportGraphTarget } from './helpers/node-spec-target';

const scenarios = loadGraphScenarios();
let report: GraphReport;

beforeAll(async () => {
  report = await runGraphScenarios(exportGraphTarget(), scenarios);
  // eslint-disable-next-line no-console
  console.log(formatGraphReport(report));
}, 120_000);

const result = (prefix: string) => {
  const r = report.results.find((x) => x.name.startsWith(prefix));
  if (!r) throw new Error(`no scenario starts with ${JSON.stringify(prefix)}`);
  return r;
};

/**
 * The scenarios that play on the export and FAIL, each a filed `dev-docs/bugs/` row. Pinned by name so a new red is new
 * and a fixed row turns this pin red too (take it out with the fix). `report.conforms` is false while any is here.
 */
const FAILING_ROWS: Readonly<Record<string, string>> = {
  'On App Error with no Filter reports': 'P18-S106-PARSERAISE',
  "On App Error's Filter is a Code prefix": 'P18-S106-PARSERAISE',
  "On App Error's Filter cleared to null": 'P18-S106-PARSERAISE',
  'On App Error declared AFTER the node that fails': 'P18-S106-PARSERAISE'
};

/** Where an outside reason puts the limit: the exporter's own verdict on the graph, or this harness's. */
const EXPORTER_VERDICT = /refused part of the graph|lifts none of the outputs|declares no prop for/;

describe('NSP-008 on the export', () => {
  test('the export plays every scenario it can, and every failure is a filed row: nothing refused, no failure unpinned', () => {
    expect(report.results.filter((r) => r.status === 'refused').map((r) => `${r.name}: ${r.reason ?? ''}`)).toEqual([]);
    const failed = report.results.filter((r) => r.status === 'failed').map((r) => r.name);
    const pinned = Object.keys(FAILING_ROWS);
    expect(failed.map((n) => pinned.find((p) => n.startsWith(p)) ?? `UNPINNED: ${n}`).sort()).toEqual([...pinned].sort());
  });

  /**
   * P18's second ledger line (BOARD lane 6): "N graph scenarios conform on the export". Outside is NOT conforming: the
   * line counts what played, and of that what conformed (passed), what differs as CONTRACT.md Part 2 declares, what is a
   * known row and what failed — then why the rest did not play, split by whose limit it is. Pinned, so a move is seen.
   */
  test('the ledger line: played, conforming and declared-different counted apart; outside never counts as conforming', () => {
    const count = (s: string) => report.results.filter((r) => r.status === s).length;
    const outside = report.results.filter((r) => r.status === 'outside');
    const line = {
      of: report.results.length,
      played: report.results.length - outside.length,
      conforming: count('passed'),
      declaredDifferent: count('diverged'),
      knownRows: count('known'),
      failing: count('failed'),
      outsideExporter: outside.filter((r) => EXPORTER_VERDICT.test(r.reason ?? '')).length,
      outsideHarness: outside.filter((r) => !EXPORTER_VERDICT.test(r.reason ?? '')).length
    };
    // eslint-disable-next-line no-console
    console.log(`P18 ledger: ${line.conforming} of ${line.of} graph scenarios conform on the export — ${line.played} played (${line.conforming} conform, ${line.declaredDifferent} differ as declared, ${line.knownRows} known rows, ${line.failing} fail on filed rows); ${line.outsideExporter} outside on the exporter's verdict, ${line.outsideHarness} on this harness's limits`);
    // s107 §78: t02's four (State History, Undo / Redo, State Snapshot) play and pass — the harness now serves a store
    // module and installs the world's clock, as the runtime target does
    expect(line).toEqual({ of: 85, played: 15, conforming: 8, declaredDifferent: 3, knownRows: 0, failing: 4, outsideExporter: 24, outsideHarness: 46 }); // s106 §77: t04 S1 and S3 play and pass
  });

  test('C2 — two values in one frame are both delivered: the emitted Counter → Value Changed → Counter reads 3, as the runtime does', () => {
    expect(result('two values sent in one frame').status).toBe('passed');
  });

  test('AC3 — C7 lockstep is a DIFFERENCE on the export: synchronous in-order delivery never forms the (true,true) pair', () => {
    const r = result('two ports fed two values each');
    expect(r.status).toBe('diverged');
    expect(r.difference?.index).toBeGreaterThanOrEqual(0);
    // the Counter behind the And stays at 1 on the export; the runtime's recording reads 3
    expect(r.actual?.some((e) => e.t === 'value' && e.subject === 'c' && e.port === 'currentCount' && e.value === 3)).toBe(false);
  });

  test('C8 — first-update consolidation is a DIFFERENCE on the export: the two Increases before the first frame are two deliveries', () => {
    const r = result('values queued before a node');
    expect(r.status).toBe('diverged');
    expect(r.actual?.some((e) => e.t === 'value' && e.subject === 'c' && e.port === 'currentCount' && e.value === 3)).toBe(true);
  });

  // was a `known` row (the export bore C6's old sentence out); ISL-033 corrected the sentence to what the runtime does
  // (8a177580d), so the export's atomic And is a declared DIFFERENCE now — this row lagged it (P18-S102-GRAPHNOSPEC)
  test('G1 — the And diamond is a DIFFERENCE on the export: And computed atomically sends no passing true, the Counter stays at 1', () => {
    const r = result('the same diamond into a per-write node');
    expect(r.status).toBe('diverged');
    expect(r.reason).toMatch(/G1/);
    // the runtime's Value Changed fires twice in the flip's frame and its Counter reads 3; the export's never moves
    expect(r.actual?.some((e) => e.t === 'value' && e.subject === 'c' && e.port === 'currentCount' && e.value === 3)).toBe(false);
  });

  test('the rest are outside, each in the exporter\'s own words', () => {
    const outside = report.results.filter((r) => r.status === 'outside');
    expect(outside.length).toBeGreaterThan(0);
    // the fourth reason is s10's (NSP-012): a scenario that declares a world is outside the export's reach — this line
    // lagged behind it, and the gate read red from s10's commit on (found s11, 2026-10-01)
    // the fifth is s13's (NSP-013): a graph-graded node with no reducer spec — the harness's limit, said as such
    // the sixth is s15's (NSP-015): a graph with the component boundary and no world — again the harness's limit
    // s106 (P18): a `set` drives a Component Inputs prop, an EMPTY world is admitted and a node with no reducer spec is
    // built from the catalog — so "not drivable" and "reducer spec" left the list, and the exporter's verdict on a graph
    // whose observed outputs it will not lift, and a world clock, joined it
    for (const r of outside) expect(r.reason).toMatch(/refused part of the graph|lifts none of the outputs|declares no prop for|no wire is made after mount|no world to install|no world clock to advance|harness emits ONE component|knows no ports for/);
    // the C4 pulse-into-pulse graph: a consumed Count Changed defers the latch — phase 18's row, in its words
    expect(result('two pulses in one frame').reason).toMatch(/countChanged signal is consumed/);
  });
});
