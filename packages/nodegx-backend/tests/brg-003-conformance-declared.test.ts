/**
 * BRG-003 AC5 — the declaration mechanism, exercised.
 *
 * §3.4: *"a case marked `degraded` must still return correct rows and may
 * differ in order; a case marked `unsupported` must **fail loudly**, never
 * return a wrong answer quietly. An undeclared divergence is a suite failure.
 * Silence is the failure mode this whole phase was created by."*
 *
 * s2 built the vocabulary and left it unexercised, which AC5's row recorded
 * honestly: *"the vocabulary is implemented and `unsupported` inverts
 * correctly, but nothing declares yet."* This file is the exercise, run against
 * adapters with a genuine limitation (`conformance/limited.ts`) rather than
 * against mutants — an honest limitation and a bug are different things and the
 * mechanism has to tell them apart.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import type { IStorageAdapter } from '@noodl/backend-contract';
import {
  CONFORMANCE_CASES,
  formatFailures,
  runConformance,
  type ConformanceDeclaration
} from '@noodl/backend-contract/conformance';
import { limit } from '@noodl/backend-contract/conformance/limited';

import { createAdapter } from '../src/persistence/createAdapter';

jest.setTimeout(120000);

/** The three cases that exercise full-text search. */
const SEARCH_CASES = [
  'records/search-finds-a-row-by-its-text',
  'records/search-composes-with-a-structured-where',
  'acl/search-returns-only-visible-rows'
];

function declareSearch(state: 'unsupported' | 'degraded' | 'conditional', reason: string): ConformanceDeclaration {
  return {
    adapter: `search-${state}`,
    cases: Object.fromEntries(SEARCH_CASES.map((id) => [id, { state, reason }]))
  };
}

describe('BRG-003 AC5 — declared divergence', () => {
  let tmpDir: string;
  let real: IStorageAdapter;

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'brg003-declared-'));
    const handle = await createAdapter({ dataDir: tmpDir });
    real = handle.adapter;
    // Every case in the suite must be reachable, or a declaration test would be
    // asserting over a suite that is already red for unrelated reasons.
    expect(CONFORMANCE_CASES.filter((c) => SEARCH_CASES.includes(c.id))).toHaveLength(3);
  });

  afterAll(async () => {
    if (real) await real.disconnect();
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('an honest refusal, declared unsupported, is accepted — and stays visible as a failure', async () => {
    const report = await runConformance(
      async () => limit(real, 'no-search'),
      declareSearch('unsupported', 'this engine has no full-text index')
    );

    // Accepted: the run is not red…
    expect(report.failures).toEqual([]);
    // …but the three are NOT counted as passing. An adapter that cannot search
    // must never be able to report a clean sweep, which is what would let a
    // missing capability travel as a green build.
    expect(report.failedAsDeclared).toBe(3);
    expect(report.passed).toBe(report.total - 3);
  });

  it('a capability the adapter HAS cannot be declared away', async () => {
    // The inversion §3.4 asks for: declaring `unsupported` is a statement about
    // the adapter, not a mute button. The real adapter can search, so the
    // declaration is false and the suite says so.
    const report = await runConformance(async () => real, declareSearch('unsupported', 'claimed, untruthfully'));

    expect(report.failed).toBe(3);
    for (const f of report.failures) {
      expect(f.message).toContain('must fail loudly');
    }
  });

  it('🔴 an adapter that ANSWERS WRONGLY cannot hide behind an unsupported declaration', async () => {
    // The shape the other two do not cover, and the one this phase exists for.
    // `search-ignores-the-term` returns every row: it does not refuse, it
    // answers, and the answer is wrong. §3.4 says `unsupported` covers a loud
    // failure and "never a wrong answer quietly" — so all three must land as
    // genuine failures, not as failed-as-declared.
    const report = await runConformance(
      async () => limit(real, 'search-ignores-the-term'),
      declareSearch('unsupported', 'we would rather not talk about search')
    );

    expect(report.failed).toBe(3);
    expect(report.failedAsDeclared).toBe(0);
  });

  it('degraded returns correct rows in a different order, and the suite is green', async () => {
    // What `degraded` promises. Reads come back reversed — ranking and
    // collation genuinely differ between FTS5 and tsvector — and every case
    // still passes, because `pluck()` sorts and only the cases that are ABOUT
    // ordering assert it.
    const report = await runConformance(
      async () => limit(real, 'reordered-reads'),
      declareSearch('degraded', 'ranking differs; the rows are the same')
    );

    if (report.failures.length > 0) {
      throw new Error(`a degraded adapter returned correct rows and still failed:\n${formatFailures(report)}`);
    }
    expect(report.failed).toBe(0);
    expect(report.passed).toBe(report.total);
  });

  it('conditional is reported as skipped, never as passed', async () => {
    const report = await runConformance(
      async () => real,
      declareSearch('conditional', 'settled against a live instance, not here')
    );

    expect(report.skipped).toBe(3);
    expect(report.passed).toBe(report.total - 3);
    expect(report.failed).toBe(0);
    for (const id of SEARCH_CASES) {
      expect(report.results.find((r) => r.id === id)?.status).toBe('skipped');
    }
  });
});
