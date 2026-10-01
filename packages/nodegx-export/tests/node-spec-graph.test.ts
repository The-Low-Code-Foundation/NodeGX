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

describe('NSP-008 on the export', () => {
  test('the export conforms: every scenario passed, diverged as declared, is a known row, or is outside in the exporter\'s words', () => {
    expect(report.results.filter((r) => r.status === 'failed' || r.status === 'refused').map((r) => `${r.name}: ${r.reason ?? ''}`)).toEqual([]);
    expect(report.conforms).toBe(true);
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

  test('G1 — the And diamond: the export computes x && !x atomically and bears C6\'s sentence out where the runtime does not (known row)', () => {
    const r = result('the same diamond into a per-write node');
    expect(r.status).toBe('known');
    expect(r.reason).toMatch(/G1/);
  });

  test('the rest are outside, each in the exporter\'s own words', () => {
    const outside = report.results.filter((r) => r.status === 'outside');
    expect(outside.length).toBeGreaterThan(0);
    // the fourth reason is s10's (NSP-012): a scenario that declares a world is outside the export's reach — this line
    // lagged behind it, and the gate read red from s10's commit on (found s11, 2026-10-01)
    // the fifth is s13's (NSP-013): a graph-graded node with no reducer spec — the harness's limit, said as such
    // the sixth is s15's (NSP-015): a graph with the component boundary and no world — again the harness's limit
    for (const r of outside) expect(r.reason).toMatch(/refused part of the graph|not drivable|no wire is made after mount|no world to install|emits only nodes with a reducer spec|harness emits ONE component/);
    // the C4 pulse-into-pulse graph: a consumed Count Changed defers the latch — phase 18's row, in its words
    expect(result('two pulses in one frame').reason).toMatch(/countChanged signal is consumed/);
  });
});
