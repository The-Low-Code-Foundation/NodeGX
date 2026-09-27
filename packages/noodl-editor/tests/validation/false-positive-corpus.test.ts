/**
 * SUB-006 — False-positive corpus suite
 *
 * THE most important test in the task. Every known-good real project must
 * validate with ZERO errors. A validator that cries wolf on real projects is
 * ignored, so any error surfacing here is a bug in a rule — not in the fixture.
 *
 * The corpus is the same real-project set the git/import/round-trip suites use
 * (verbatim from tests/testfs/), plus the synthetic-awkward project that
 * exercises dynamic-port nodes, deep nesting, and variant/route edge cases.
 *
 * Warnings ARE expected: these legacy projects legitimately contain
 * module-provided and other-version node types the catalog cannot enumerate
 * (Markdown, module.inlineHtml, Rectangle, REST, On Item Action, …). Those are
 * honest observations, not false positives — the assertion is on *errors*.
 *
 * 🔴 KNOWN_TRUE_POSITIVES is the one exception, and it is not a false positive.
 * `big-merge-test-mine` wires into the deprecated Text Input's `disabled`, an
 * input that is commented out in `nodes-deprecated/controls/text-input.tsx`, so
 * the wire reaches nothing at runtime. P88 GAM-019 (`4bb438165`) ruled that such a
 * wire is refused, and `dynamic-ports.test.ts` pins that refusal. The project is
 * verbatim and shared with the git merge suites, so it is not edited. Each entry
 * is matched exactly (project, rule, node, port) and asserted to STILL fire, so
 * the allowance cannot hide a rule that went quiet, nor any other error.
 */

import { SemanticValidator } from '../../src/editor/src/validation/SemanticValidator';
import { fromLegacyProject, LegacyProjectLike } from '../../src/editor/src/validation/normalize';
import { Diagnostic, DiagnosticCode, formatDiagnosticLine } from '../../src/editor/src/validation/diagnostics';

/* eslint-disable @typescript-eslint/no-var-requires */
const CORPUS: Array<{ name: string; project: LegacyProjectLike }> = [
  { name: 'import_proj1', project: require('../testfs/import_proj1/project.json') },
  { name: 'import_proj2', project: require('../testfs/import_proj2/project.json') },
  { name: 'import_proj5', project: require('../testfs/import_proj5/project.json') },
  { name: 'watchproject', project: require('../testfs/watchproject/project.json') },
  { name: 'git-repo-utf8', project: require('../testfs/git-repo-utf8/project.json') },
  { name: 'big-merge-test-mine', project: require('../testfs/big-merge-test-mine/project.json') },
  { name: 'synthetic-awkward', project: require('../io/fixtures/synthetic-awkward.project.json') }
];
/* eslint-enable @typescript-eslint/no-var-requires */

/** Real errors in a verbatim corpus project, ruled correct. See the header. */
const KNOWN_TRUE_POSITIVES: Array<{ project: string; code: DiagnosticCode; nodeId: string; port: string }> = [
  {
    project: 'big-merge-test-mine',
    code: DiagnosticCode.NonexistentPort,
    nodeId: '94df2e83-36f4-21c0-c716-a1ddad346263', // Text Input in /UI Components/Search Header
    port: 'disabled'
  }
];

function isKnownTruePositive(project: string, d: Diagnostic): boolean {
  return KNOWN_TRUE_POSITIVES.some(
    (k) => k.project === project && k.code === d.code && k.nodeId === d.location.nodeId && k.port === d.location.port
  );
}

/** Errors, less the ruled true positives for this project. */
function unexpectedErrors(project: string, diagnostics: Diagnostic[]): Diagnostic[] {
  return diagnostics.filter((d) => d.severity === 'error' && !isKnownTruePositive(project, d));
}

describe('SUB-006 false-positive corpus', () => {
  const validator = new SemanticValidator();

  for (const { name, project } of CORPUS) {
    it(`validates ${name} with zero errors`, () => {
      const report = validator.validate(fromLegacyProject(project));
      const unexpected = unexpectedErrors(name, report.diagnostics);
      if (unexpected.length > 0) {
        // Surface exactly what misfired so the failure is actionable.
        const errs = unexpected.map(formatDiagnosticLine).join('\n');
        fail(`${name} produced ${unexpected.length} error(s):\n${errs}`);
      }
      expect(unexpected.length).toBe(0);
    });
  }

  it('produces zero dangling-connection, orphaned-node, or nonexistent-port errors across the whole corpus', () => {
    let staticErrors = 0;
    for (const { name, project } of CORPUS) {
      const report = validator.validate(fromLegacyProject(project));
      staticErrors += unexpectedErrors(name, report.diagnostics).length;
    }
    expect(staticErrors).toBe(0);
  });

  it('still refuses every ruled true positive, each exactly once (the allowance hides nothing else)', () => {
    for (const k of KNOWN_TRUE_POSITIVES) {
      const entry = CORPUS.find((c) => c.name === k.project)!;
      const report = validator.validate(fromLegacyProject(entry.project));
      const hits = report.diagnostics.filter((d) => d.severity === 'error' && isKnownTruePositive(k.project, d));
      expect(hits.length).toBe(1);
    }
  });

  it('still surfaces useful warnings (unknown module/legacy types) on the large legacy corpus', () => {
    // Sanity: the validator is not silently passing everything — git-repo-utf8
    // carries module/legacy node types that should warn (with the tool still
    // functioning). This guards against a rule accidentally becoming a no-op.
    const gitRepo = CORPUS.find((c) => c.name === 'git-repo-utf8')!;
    const report = validator.validate(fromLegacyProject(gitRepo.project));
    expect(report.summary.warnings).toBeGreaterThan(0);
  });
});
