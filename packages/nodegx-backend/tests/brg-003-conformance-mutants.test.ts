/**
 * BRG-003 AC3 — the suite must be able to fail.
 *
 * *"A deliberately broken adapter … fails the suite, one distinct failure per
 * mutation, and each is recorded here by name. A suite that cannot fail proves
 * nothing."*
 *
 * Every case in `brg-003-conformance-sqlite.test.ts` is green. That is exactly
 * as much evidence as a suite of empty test bodies would produce, until this
 * file shows the cases are load-bearing. Each mutation below breaks one
 * property of a real, working adapter and asserts the suite notices.
 *
 * 🔴 It also asserts the **control**: an unmutated adapter passes the same
 * cases in the same run. Without it, a harness bug that failed everything would
 * read as six successful detections.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import type { IStorageAdapter } from '@noodl/backend-contract';
import { runConformance, type ConformanceReport } from '@noodl/backend-contract/conformance';
import { MUTATIONS, MUTATION_DESCRIPTIONS, mutate, type MutationKind } from '@noodl/backend-contract/conformance/mutants';

import { createAdapter } from '../src/persistence/createAdapter';

jest.setTimeout(120000);

describe('BRG-003 AC3 — a broken adapter fails the suite', () => {
  const tmpDirs: string[] = [];
  const adapters: IStorageAdapter[] = [];
  const reports = new Map<MutationKind, ConformanceReport>();
  let control: ConformanceReport;

  async function freshAdapter(): Promise<IStorageAdapter> {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'brg003-mutant-'));
    tmpDirs.push(dir);
    const handle = await createAdapter({ dataDir: dir });
    adapters.push(handle.adapter);
    return handle.adapter;
  }

  beforeAll(async () => {
    control = await runConformance(() => freshAdapter(), { adapter: 'control (unmutated)' });
    for (const kind of MUTATIONS) {
      reports.set(
        kind,
        await runConformance(async () => mutate(await freshAdapter(), kind), { adapter: `mutant:${kind}` })
      );
    }
  });

  afterAll(async () => {
    for (const a of adapters) {
      try {
        await a.disconnect();
      } catch {
        /* a mutant may have left it in an odd state; teardown is best-effort */
      }
    }
    for (const d of tmpDirs) fs.rmSync(d, { recursive: true, force: true });
  });

  it('the control passes — enforcement that fails everything proves nothing', () => {
    expect(control.failures).toEqual([]);
    expect(control.passed).toBe(control.total);
  });

  it.each(MUTATIONS)('%s is caught', (kind) => {
    const report = reports.get(kind)!;
    expect(report).toBeDefined();

    // The record AC3 asks for: which cases caught this mutation, by name.
    // eslint-disable-next-line no-console
    console.log(
      `\n[AC3] ${kind} — ${MUTATION_DESCRIPTIONS[kind]}\n` +
        `      caught by ${report.failures.length} case(s):\n` +
        report.failures.map((f) => `        ${f.id}`).join('\n')
    );

    expect(report.failures.length).toBeGreaterThan(0);
  });

  it('each mutation is caught by a DIFFERENT set of cases', () => {
    // Six mutations all caught by the same one case would mean the suite has
    // one real assertion and five decorations. This asserts the signatures
    // differ, which is what makes a failure diagnostic rather than merely red.
    const signatures = new Map<string, MutationKind[]>();
    for (const [kind, report] of reports) {
      const sig = report.failures
        .map((f) => f.id)
        .sort()
        .join('|');
      signatures.set(sig, [...(signatures.get(sig) ?? []), kind]);
    }
    const collisions = [...signatures.entries()].filter(([, kinds]) => kinds.length > 1);
    expect(collisions.map(([, kinds]) => kinds.join(' == '))).toEqual([]);
  });

  it('no mutation fails the entire suite — a mutant breaks one property, not the harness', () => {
    // If a mutation reds every case, the wrapper is broken rather than the
    // property, and the "detection" above would be meaningless.
    const wholesale = [...reports.entries()]
      .filter(([, r]) => r.passed === 0 || r.failed === r.total)
      .map(([kind, r]) => `${kind} failed ${r.failed}/${r.total}`);
    expect(wholesale).toEqual([]);
  });
});
