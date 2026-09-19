/**
 * The conformance suite — one suite, any adapter.
 *
 * BRG-003. **The promise "your app moves" is a test suite that runs, not a
 * sentence someone wrote.** This module is that suite: it is handed a factory
 * for a connected {@link IStorageAdapter} and reports, case by case, whether
 * that adapter behaves the way every consumer of the storage seam already
 * assumes it does.
 *
 * ## Why it is framework-neutral
 *
 * `runConformance()` returns a {@link ConformanceReport` rather than declaring
 * jest `describe`/`it` blocks, for three reasons:
 *
 * 1. This package is `main: src/index.ts` and declares jest only as a
 *    devDependency. A suite that consumers import must not drag a test runner
 *    into the dependency graph of the thing it tests.
 * 2. **AC3 needs the suite to fail.** A deliberately broken adapter must
 *    produce one distinct failure per mutation, and asserting *that* is far
 *    cleaner over a returned report than over a nested runner's output.
 * 3. BRG-005 adds one file to run it against Postgres (§3.1). That file should
 *    not have to care which runner `nodegx-backend` happens to use.
 *
 * ## What it deliberately does not cover
 *
 * Emitted SQL text, engine-specific plans, and anything that would make this a
 * second implementation (§3.3).
 *
 * @module conformance
 */

import type { IStorageAdapter } from '../src/storage';

import { aclCases } from './cases/acl';
import { filterCases } from './cases/filters';
import { recordCases } from './cases/records';
import { relationCases } from './cases/relations';
import { schemaCases } from './cases/schema';
import { makeContext, type ConformanceContext } from './context';

export type { ConformanceContext, Row, ReadResult } from './context';
export { read, write, ConformanceError } from './context';

/**
 * The areas of §3.2, each one in the promise because something real consumes
 * it. Kept as a closed union so a case cannot invent an area that no adapter
 * author has been told about.
 */
export type ConformanceArea = 'records' | 'filters' | 'acl' | 'relations' | 'schema';

/** One case: an id nobody else uses, the area it belongs to, and the body. */
export interface ConformanceCase {
  /** Stable across runs and adapters — AC3 records failures by this name. */
  id: string;
  area: ConformanceArea;
  /** What property this pins, in one line, for whoever reads a failure. */
  pins: string;
  run(ctx: ConformanceContext): Promise<void>;
}

/**
 * What an adapter declares it cannot do identically (§3.4).
 *
 * Reuses `capabilities.ts`'s vocabulary — `supported | unsupported |
 * conditional | degraded` — **but is keyed by conformance case id, not by
 * `CapabilityKey`.** That is deliberate and was measured: every one of the 27
 * `CapabilityKey`s exists so the editor can grey out something an author can
 * see on the canvas (a node, a port), and `gating.test.ts` enumerates them
 * across all eight backend descriptors. A conformance case is not a node and
 * not a port, so adding keys for cases would put entries in eight descriptors
 * that nothing consumes. See BRG-003 §3.4.1, which reached the same conclusion
 * about the notify channel for the same reason.
 *
 * The states, as the suite reads them:
 *
 * - **`supported`** (the default when undeclared) — the case must pass.
 * - **`degraded`** — the case must still pass; it is expected to return
 *   *correct* rows and may differ in ordering. A degraded case that returns
 *   wrong rows is a failure like any other.
 * - **`unsupported`** — the case must **fail loudly**. An adapter that declares
 *   a capability unsupported and then quietly returns a wrong answer is the
 *   exact failure mode this phase was created by, so the suite inverts: a case
 *   declared unsupported that *passes* is itself reported as a failure.
 * - **`conditional`** — settled elsewhere against a live instance; skipped here
 *   and reported as skipped, never as passed.
 */
export interface ConformanceDeclaration {
  /** Adapter name, for the report. */
  adapter: string;
  /** Case id → state. Undeclared means `supported`. */
  cases?: Record<string, { state: 'unsupported' | 'degraded' | 'conditional'; reason: string }>;
}

export type CaseStatus = 'passed' | 'failed' | 'skipped' | 'failed-as-declared';

export interface ConformanceCaseResult {
  id: string;
  area: ConformanceArea;
  pins: string;
  status: CaseStatus;
  /** The failure, or the declared reason for a skip or an expected failure. */
  message?: string;
  durationMs: number;
}

export interface ConformanceReport {
  adapter: string;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  /** Cases declared `unsupported` that failed loudly, as they must. */
  failedAsDeclared: number;
  results: ConformanceCaseResult[];
  /** Only the genuine failures — what a caller asserts is empty. */
  failures: ConformanceCaseResult[];
}

/**
 * Every case in the suite, in a stable order.
 *
 * Exported so AC2's count can be read off the suite itself rather than
 * maintained by hand in a task file — a hand-maintained count is a number that
 * drifts the first time someone adds a case.
 */
export const CONFORMANCE_CASES: readonly ConformanceCase[] = Object.freeze([
  ...recordCases,
  ...filterCases,
  ...aclCases,
  ...relationCases,
  ...schemaCases
]);

/** Case ids, asserted unique at module load — a duplicate id would silently
 * overwrite a declaration and hide a divergence. */
(function assertUniqueIds(): void {
  const seen = new Set<string>();
  for (const c of CONFORMANCE_CASES) {
    if (seen.has(c.id)) throw new Error(`duplicate conformance case id: ${c.id}`);
    seen.add(c.id);
  }
})();

export interface RunOptions {
  /** Run only these areas. Omitted = all. */
  areas?: ConformanceArea[];
  /** Run only these case ids. Omitted = all. */
  only?: string[];
}

/**
 * Run the suite against one adapter.
 *
 * `makeAdapter` returns a **connected** adapter; the suite does not connect or
 * disconnect it, because teardown differs per adapter (a temp file here, a
 * dropped schema there) and owning it would put adapter knowledge in the suite.
 */
export async function runConformance(
  makeAdapter: () => Promise<IStorageAdapter>,
  decl: ConformanceDeclaration,
  options: RunOptions = {}
): Promise<ConformanceReport> {
  const adapter = await makeAdapter();
  const runId = `c${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
  const ctx = makeContext(adapter, runId);

  const selected = CONFORMANCE_CASES.filter(
    (c) => (!options.areas || options.areas.includes(c.area)) && (!options.only || options.only.includes(c.id))
  );

  const results: ConformanceCaseResult[] = [];

  for (const c of selected) {
    const declared = decl.cases?.[c.id];
    const started = Date.now();

    if (declared?.state === 'conditional') {
      results.push({
        id: c.id,
        area: c.area,
        pins: c.pins,
        status: 'skipped',
        message: declared.reason,
        durationMs: 0
      });
      continue;
    }

    let thrown: unknown;
    try {
      await c.run(ctx);
    } catch (err) {
      thrown = err ?? new Error('case threw a falsy value');
    }
    const durationMs = Date.now() - started;
    const message = thrown instanceof Error ? thrown.message : thrown === undefined ? undefined : String(thrown);

    if (declared?.state === 'unsupported') {
      // Inverted on purpose: an unsupported capability must fail loudly, never
      // return a wrong answer quietly.
      results.push(
        thrown
          ? { id: c.id, area: c.area, pins: c.pins, status: 'failed-as-declared', message: declared.reason, durationMs }
          : {
              id: c.id,
              area: c.area,
              pins: c.pins,
              status: 'failed',
              message: `declared unsupported (${declared.reason}) but the case passed — an unsupported capability must fail loudly, not answer quietly`,
              durationMs
            }
      );
      continue;
    }

    results.push({
      id: c.id,
      area: c.area,
      pins: c.pins,
      status: thrown ? 'failed' : 'passed',
      message,
      durationMs
    });
  }

  const failures = results.filter((r) => r.status === 'failed');

  return {
    adapter: decl.adapter,
    total: results.length,
    passed: results.filter((r) => r.status === 'passed').length,
    failed: failures.length,
    skipped: results.filter((r) => r.status === 'skipped').length,
    failedAsDeclared: results.filter((r) => r.status === 'failed-as-declared').length,
    results,
    failures
  };
}

/** A one-line-per-failure rendering, for a test runner's failure message. */
export function formatFailures(report: ConformanceReport): string {
  if (report.failures.length === 0) return '';
  return report.failures.map((f) => `  [${f.area}] ${f.id} — ${f.pins}\n      ${f.message ?? ''}`).join('\n');
}
