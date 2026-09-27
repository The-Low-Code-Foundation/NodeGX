/**
 * BRG-003 AC1 — the conformance suite, run against the built-in SQLite adapter.
 *
 * This is the file §3.1 describes as *"`nodegx-backend` runs it against SQLite.
 * BRG-005 adds one file to run it against Postgres. Nothing else changes."*
 *
 * 🔴 **It deliberately builds the adapter through `createAdapter()` and never
 * names `LocalSQLAdapter`.** Every existing adapter test in the monorepo
 * constructs that class directly, which is what makes them implementation tests
 * rather than a contract. If this file ever needs to know what is underneath
 * it, the suite has stopped being portable and that is the finding.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import type { IStorageAdapter } from '@noodl/backend-contract';
import {
  CONFORMANCE_CASES,
  formatFailures,
  runConformance,
  type ConformanceReport
} from '@noodl/backend-contract/conformance';

import { createAdapter } from '../src/persistence/createAdapter';

jest.setTimeout(60000);

describe('BRG-003 — conformance, SQLite', () => {
  let tmpDir: string;
  let adapter: IStorageAdapter | undefined;
  let report: ConformanceReport;

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'brg003-conformance-'));
    report = await runConformance(
      async () => {
        const handle = await createAdapter({ dataDir: tmpDir });
        adapter = handle.adapter;
        return handle.adapter;
      },
      {
        adapter: 'local-sql (node:sqlite)'
        // No `cases` declaration: the built-in adapter is the reference
        // implementation, so every case must pass outright. The day one cannot,
        // it is declared here with a reason (§3.4) — and that declaration is
        // the honest record of what stopped crossing.
      }
    );
  });

  afterAll(async () => {
    if (adapter) await adapter.disconnect();
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('AC1 — the suite runs against SQLite and is green', () => {
    if (report.failures.length > 0) {
      throw new Error(`${report.failures.length} conformance failure(s):\n${formatFailures(report)}`);
    }
    expect(report.failed).toBe(0);
    expect(report.passed).toBe(report.total);
  });

  it('AC2 — every area of §3.2 has cases, and the count is reported', () => {
    const byArea = new Map<string, number>();
    for (const c of CONFORMANCE_CASES) byArea.set(c.area, (byArea.get(c.area) ?? 0) + 1);

    // Each area in the promise must actually have cases. An area with zero is
    // a capability the suite silently does not test, which rule 2 of the phase
    // README names as the failure mode: "a capability the built-in backend has
    // and the suite does not test is a capability that silently will not cross".
    for (const area of ['records', 'filters', 'acl', 'relations', 'schema']) {
      expect(byArea.get(area) ?? 0).toBeGreaterThan(0);
    }

    // The count is an artefact of the suite, not a number kept by hand in a
    // task file — a hand-maintained count drifts the first time a case lands.
    // eslint-disable-next-line no-console
    console.log(
      `BRG-003 case count: ${CONFORMANCE_CASES.length} — ` +
        [...byArea.entries()].map(([a, n]) => `${a} ${n}`).join(', ')
    );
    expect(CONFORMANCE_CASES.length).toBe(report.total);
  });

  it('AC6 — no case reaches the raw handle', () => {
    // The structural half of AC6. `ConformanceContext` does not expose
    // `getDatabase`, so a case cannot depend on it even by accident; this
    // asserts the suite did not smuggle one in through the adapter reference.
    const source = fs.readFileSync(
      path.join(__dirname, '../../nodegx-backend-contract/conformance/context.ts'),
      'utf8'
    );
    expect(source).not.toMatch(/adapter\.getDatabase/);
  });
});
