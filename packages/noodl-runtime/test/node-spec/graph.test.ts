/**
 * NSP-008 — CONTRACT.md C1–C11 as graph scenarios on the runtime, the reference for graphs.
 *
 * Every scenario in `nodegx-node-spec/scenarios/graph/` is played on the runtime target
 * (`mountGraph`: the runtime's own `connectInput`, queues, breakers; NSP-012: one real `NodeScope`
 * per declared component instance, the three process-wide managers reset per play) and
 *   - its trace validates against the schema (every event carries the node id as `subject`);
 *   - its CLAIMS hold — the clause's sentence as facts about the trace, hand-written from the
 *     clause (src/graph.ts). A scenario marked `row` is one whose recorded trace does NOT bear the
 *     clause out: the failure is reported as known, and the day it passes the row has closed;
 *   - its trace equals the recorded `expect` — the ratchet: a runtime change that moves a clause
 *     goes red here, named by the clause.
 *
 * Record mode writes the runtime's trace into each scenario file as `expect` (AC2: "they are read
 * from it"); read the diff, then commit the file:
 *
 *   NSP_RECORD=1 npx jest test/node-spec/graph.test.ts
 */

import * as fs from 'fs';

import { checkClaims, CLAUSES, loadGraphScenarios, playGraph, validateTrace, type GraphScenario, type TraceEvent } from '../../../nodegx-node-spec/src';
import { runtimeTarget, withViewerNodes } from '../helpers/node-spec-target';

const RECORD = process.env.NSP_RECORD === '1';
const scenarios = loadGraphScenarios();

function record(sc: GraphScenario, trace: TraceEvent[]): void {
  const file = sc.file!;
  const all = JSON.parse(fs.readFileSync(file, 'utf8')) as Array<Record<string, unknown>>;
  const entry = all.find((s) => s.name === sc.name);
  if (!entry) throw new Error(`${file}: no scenario named ${JSON.stringify(sc.name)}`);
  entry.expect = trace;
  fs.writeFileSync(file, JSON.stringify(all, null, 2) + '\n');
}

describe('NSP-008 — every clause has a scenario (AC1)', () => {
  for (const clause of CLAUSES) {
    test(`${clause} is graded by at least one graph scenario`, () => {
      expect(scenarios.filter((s) => s.clauses.includes(clause)).map((s) => s.name)).not.toHaveLength(0);
    });
  }
});

describe('NSP-008 — graph scenarios on the runtime (AC2)', () => {
  for (const sc of scenarios) {
    test(`[${sc.clauses.join(' ')}] ${sc.name}`, async () => {
      const target = withViewerNodes(runtimeTarget());
      const actual = await playGraph(target, sc);

      const v = validateTrace(actual);
      if (v.ok === false) throw new Error(`${sc.name}: the trace is malformed at ${v.path}: ${v.message}`);
      expect(actual.every((e) => e.t === 'settle' || typeof e.subject === 'string')).toBe(true);
      expect(actual.some((e) => e.t === 'value' || e.t === 'signal' || e.t === 'outcome')).toBe(true);

      if (RECORD) record(sc, actual);

      const failures = checkClaims(actual, sc.claims);
      if (sc.row) {
        // a row: the runtime does not bear the clause out — known, and red the day it does
        expect(failures.length > 0 ? 'known' : `row ${sc.row} no longer reproduces — close it and drop the mark`).toBe('known');
      } else if (failures.length) {
        throw new Error(`${sc.name}:\n  ${failures.join('\n  ')}\n${JSON.stringify(actual)}`);
      }

      if (!RECORD) {
        expect(sc.expect).toBeDefined();
        expect(actual).toEqual(sc.expect);
      }
    });
  }
});
