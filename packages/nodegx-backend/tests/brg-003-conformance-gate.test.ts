/**
 * BRG-003 AC6 + AC7 — the gate that makes the portability tax visible.
 *
 * §3.5: *"a CI check that fails when a new capability appears on the facade or
 * the schema surface without a conformance case or an explicit declaration.
 * This is what converts the invisible permanent tax into a visible one, and it
 * works from the day it lands with SQLite as the only adapter."*
 *
 * ## Why the gate lives here and not in the contract package
 *
 * `test:packages` runs this package's jest in CI; the contract package's own
 * jest is in no workflow, and — found while building this — neither is its
 * `typecheck` script, which is the same hole the `typecheck:mcp` line in
 * `pr.yml` was added to close. Both are fixed by this task: the runtime half
 * runs here, and `npm run typecheck:contract` is now a step in the Typecheck
 * job. A gate nobody runs is a comment.
 *
 * ## What it actually measures
 *
 * Not annotations. The suite is run **once per case** against a recording proxy
 * ({@link conformance/recorder}), so the gate knows which cases really reached
 * which member, and rejects a register entry claiming a case that did not.
 * The surface is read back out of `storage.ts` by a parse, independent of the
 * register's own keys — a checker fed its own keys cannot disagree with itself.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import type { IStorageAdapter } from '@noodl/backend-contract';
import { CONFORMANCE_CASES, runConformance } from '@noodl/backend-contract/conformance';
import {
  FACADE_COVERAGE,
  checkCoverage,
  formatCoverageFindings,
  type CoverageReport
} from '@noodl/backend-contract/conformance/coverage';
import { createRecorder, recordingAdapter, type SurfaceRecorder } from '@noodl/backend-contract/conformance/recorder';
import { adapterMembers, readStorageSurface, type StorageSurface } from '@noodl/backend-contract/conformance/surface';

import { AdapterFacade } from '../src/persistence/AdapterFacade';
import { createAdapter } from '../src/persistence/createAdapter';

jest.setTimeout(120000);

/**
 * 🔴 The ratchet, and the number it stands for.
 *
 * AC7 asks for *"the list of what needed declaring — that list is the honest
 * measure of how far the product had already drifted."* This is that list's
 * length at the moment the gate first ran, and it may fall and never rise:
 * without a ratchet, `uncovered` is a free escape hatch and the gate becomes
 * decoration, which is the failure mode it was built against.
 *
 * It is asserted as a CEILING, never as an equality — a session that closes a
 * gap must not also have to come here and edit a literal, because the reflex
 * that edits a number to make a gate green is the one that ships the drift.
 * Lower it deliberately when a batch closes; never raise it without a task
 * saying why.
 */
const UNCOVERED_AT_FIRST_RUN = 22;

describe('BRG-003 AC6/AC7 — the conformance gate', () => {
  let tmpDir: string;
  let adapter: IStorageAdapter | undefined;
  let recorder: SurfaceRecorder;
  let surface: StorageSurface;
  let report: CoverageReport;

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'brg003-gate-'));
    const handle = await createAdapter({ dataDir: tmpDir });
    adapter = handle.adapter;
    recorder = createRecorder();
    const wrapped = recordingAdapter(handle.adapter, recorder);

    // One run per case, so a member is attributed to the case that reached it
    // rather than to "the suite". All 56 cost ~200ms measured: cases are
    // isolated by a per-call collection name, so re-entering the runner is the
    // only overhead.
    for (const c of CONFORMANCE_CASES) {
      recorder.begin(c.id);
      const run = await runConformance(async () => wrapped, { adapter: 'gate' }, { only: [c.id] });
      recorder.end();
      if (run.failed > 0) {
        throw new Error(`the gate's own run of ${c.id} failed: ${run.failures[0]?.message}`);
      }
    }

    surface = readStorageSurface();
    report = checkCoverage({
      surface,
      caseIds: CONFORMANCE_CASES.map((c) => c.id),
      callersOf: (member) => recorder.callersOf(member)
    });
  });

  afterAll(async () => {
    if (adapter) await adapter.disconnect();
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('AC6 — every member of the storage surface has a case or a declaration', () => {
    if (report.findings.length > 0) {
      throw new Error(
        `${report.findings.length} coverage finding(s) — a capability on the storage surface is neither ` +
          `tested nor declared, or a declaration no longer matches what the suite does:\n` +
          formatCoverageFindings(report)
      );
    }
    expect(report.findings).toHaveLength(0);
  });

  it('AC6 — the gate names the method when a new capability appears', () => {
    // The control AC3 set for the suite, applied to the gate: a detector that
    // cannot fail proves nothing. A method is added to the surface the parse
    // reports, without touching the register, exactly as a new facade method
    // would arrive tomorrow.
    const invented = checkCoverage({
      surface: { ...surface, facade: [...surface.facade, 'rawExportEverything'] },
      caseIds: CONFORMANCE_CASES.map((c) => c.id),
      callersOf: (member) => recorder.callersOf(member)
    });

    const hit = invented.findings.find((f) => f.member === 'rawExportEverything');
    expect(hit).toBeDefined();
    // AC6 asks for the failure message to name the method. It has to carry the
    // name itself, not just a count — whoever reads this line in a build log is
    // someone who does not yet know what they broke.
    expect(hit?.problem).toContain('rawExportEverything');
    expect(hit?.problem).toContain('conformance/coverage.ts');
  });

  it('AC6 — the gate is measuring the run, not reading the register', () => {
    // If the recording is emptied, every `cases` claim and every `through` that
    // depends on one must collapse. A gate that stays green with no evidence
    // underneath it is reporting its own register back to itself.
    const blind = checkCoverage({
      surface,
      caseIds: CONFORMANCE_CASES.map((c) => c.id),
      callersOf: () => []
    });
    const named = new Set(blind.findings.map((f) => `${f.surface}.${f.member}`));
    expect(named.has('adapter.query')).toBe(true);
    expect(named.has('schema.createTable')).toBe(true);
    // …including one hop away: `rawQuery` is only ever covered THROUGH
    // `adapter:query`, so losing the evidence for the data-plane member has to
    // take the facade method with it.
    expect(named.has('facade.rawQuery')).toBe(true);
  });

  it('the facade delegations in the register are the ones the facade performs', () => {
    // Thirteen entries say "rawX is a one-line this.call('x', …)". That is a
    // claim about another package's source, so it is read rather than trusted —
    // `AdapterFacade.call()` dispatches BY STRING (README §2), which means the
    // string is right there in the compiled method.
    const proto = AdapterFacade.prototype as unknown as Record<string, (...args: unknown[]) => unknown>;
    const checked: string[] = [];

    for (const [name, entry] of Object.entries(FACADE_COVERAGE)) {
      if (entry.kind !== 'through' || name === 'schemaManager') continue;
      const dispatched = entry.member.split(':')[1];
      const body = proto[name]?.toString() ?? '';
      expect(body).not.toBe('');
      expect(`${name} -> ${body.includes(`'${dispatched}'`)}`).toBe(`${name} -> true`);
      checked.push(name);
    }

    // The register may not quietly stop claiming delegations: if a `through`
    // entry is downgraded to `uncovered` the count falls and this line says so.
    //
    // PRD-001 moved it from 12 to 13: `rawQueryAll` is a thirteenth dispatch to
    // the SAME adapter member as `rawQuery` (`'query'`), with the page cap
    // explicitly off. Two facade methods over one adapter member is what the
    // `through` claim is for, and both are checked by the loop above — the
    // capped one still has to contain `'query'`, which is what catches a
    // rewrite that buries the dispatch behind a helper.
    expect(checked.length).toBe(13);
  });

  it('AC7 — the uncovered list is recorded, owned, and does not grow', () => {
    // eslint-disable-next-line no-console
    console.log(
      `BRG-003 AC7 — ${report.uncovered.length} of ${
        adapterMembers(surface).length + surface.schema.length + surface.facade.length
      } storage-surface members are declared uncovered:\n  ${report.uncovered.join('\n  ')}`
    );
    expect(report.uncovered.length).toBeLessThanOrEqual(UNCOVERED_AT_FIRST_RUN);
  });
});
