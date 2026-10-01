/**
 * ISL-014 (P78 D83) — a missing kit reader is named as one, in the refusal.
 *
 * The door learns a project's kit node types by running a bundled reader (`kitExtract/extract.ts`,
 * `dist/kit-extract.cjs`). When that reader is missing — a fresh clone, CI, a worktree without a
 * build — or when a kit threw at import, the project's own node types are **unknown for a reason
 * the author cannot see**, and the editor's shared rule refused every kit node with *"Unknown node
 * type … If this is a module-provided node, ensure the module is installed"*. The module was
 * installed. The server knew why (`currentKitOverlay().unavailable` / `.failures`) and said so in
 * `get_project_info`, which is not the answer an author who was just refused is reading.
 *
 * This module is the door's half of CN-003's "absent is not the same as empty": where the overlay
 * is known, an `unknown-node-type` diagnostic is rewritten to say the true reason, that the module
 * may well be installed, what to do, and that the server must be re-bound or restarted afterwards —
 * because a project's kits are read once, when it is bound (`kitOverlay.ts`).
 *
 * 🔴 The editor's rule is untouched: it sees only the catalog, and the editor and
 * `scripts/validate-project.ts` share it. The rewrite lives on the door's validator, so every
 * caller of it — the write gate, the plan door, `validate_project`, the lesson grader — says the
 * same thing, and the editor's own message is byte-for-byte what it was.
 *
 * The near-miss trap (`unknownNodeType.ts`): when the rule finds a close catalog name it drops the
 * module sentence and says only *"did you mean X"*. A kit type one edit from a built-in was pointed
 * at the built-in. A kit-shaped name — a module folder's name, or `<folder>.<Name>`, or a dotted
 * name whose nearest catalog type is not itself dotted — loses that suggestion here when the
 * reader could not run, because the suggestion was made without knowing the project's types.
 *
 * @module noodl-mcp/kitRefusal
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import { SemanticValidator } from './editor-deps';
import type { Diagnostic, NormProject, ValidationReport, ValidatorOptions } from './editor-deps';
import { currentKitOverlay } from './kitOverlay';
import type { ProjectKitOverlay } from './kitOverlay';

const UNKNOWN_NODE_TYPE = 'unknown-node-type';

const REBIND = "restart or re-bind this server afterwards — a project's kits are read once, when it is bound.";

/**
 * The door's validator: the editor's `SemanticValidator`, with every report's `unknown-node-type`
 * diagnostics explained from the session's kit overlay. `validateComponent` goes through
 * `validate`, so overriding the one covers both.
 */
export class KitAwareValidator extends SemanticValidator {
  validate(project: NormProject, options: ValidatorOptions = {}): ValidationReport {
    const report = super.validate(project, options);
    return { ...report, diagnostics: explainUnknownNodeTypes(report.diagnostics) };
  }
}

/**
 * Rewrite `unknown-node-type` diagnostics when the overlay says why a kit type would be unknown.
 *
 * Untouched when there is no overlay, when the project has no `noodl_modules` (then "ensure the
 * module is installed" is the right sentence), and when the reader ran and every kit loaded.
 */
export function explainUnknownNodeTypes(
  diagnostics: Diagnostic[],
  overlay: ProjectKitOverlay | null = currentKitOverlay()
): Diagnostic[] {
  if (!overlay || overlay.skipped) return diagnostics;
  const unavailable = overlay.unavailable;
  const failures = overlay.failures;
  if (!unavailable && failures.length === 0) return diagnostics;
  if (!diagnostics.some((d) => d.code === UNKNOWN_NODE_TYPE)) return diagnostics;

  const dirs = moduleDirs(overlay.projectDir);

  return diagnostics.map((d) => {
    if (d.code !== UNKNOWN_NODE_TYPE) return d;
    const type = d.location.nodeType;
    if (!type) return d;
    const kitShaped = looksLikeKitType(type, dirs, d.suggestion);

    if (unavailable) {
      const message =
        `Unknown node type "${type}" — not found in the node catalog, and this project's own kit node types ` +
        `could not be read, so a kit node is not recognised here: ${unavailable.reason} ${readerFix(unavailable.reason)}`;
      // A kit-shaped name's near-miss was made without knowing the project's types; a built-in's
      // misspelling keeps its suggestion and learns, beside it, why a kit would be unknown too.
      return kitShaped ? { ...d, message, suggestion: undefined } : { ...d, message };
    }

    // The reader ran; some kit failed. A misspelt built-in with a near-miss is still that.
    if (!kitShaped && d.suggestion) return d;
    const list = failures.map((f) => `${f.kitModule} (${f.dirPath}): ${f.message}`).join('; ');
    const head = failures.length === 1 ? 'A kit in this project failed to load' : `${failures.length} kits in this project failed to load`;
    const message =
      `Unknown node type "${type}" — not found in the node catalog. ${head}, so its node types are unknown: ${list}. ` +
      `If this node comes from that kit, the module is installed — fix the kit, and ${REBIND}`;
    return { ...d, message, suggestion: kitShaped ? undefined : d.suggestion };
  });
}

/** What to do, from the reader's own reason: build it, or fix the kit that broke it. */
function readerFix(reason: string): string {
  const readerMissing =
    reason.includes('not present in this installation') || reason.includes('NODEGX_KIT_EXTRACT points at');
  if (readerMissing) {
    if (reason.includes('npm run build')) return `The module may well be installed. Do what the reason says, and ${REBIND}`;
    return (
      'The module may well be installed. Build the reader with `npm run build` in packages/noodl-mcp, or point ' +
      `NODEGX_KIT_EXTRACT at a built kit-extract.cjs, and ${REBIND}`
    );
  }
  return (
    'The module may well be installed; the reader ran and failed, so fix what the reason names (a kit that writes ' +
    `to stdout breaks the reader's JSON answer), and ${REBIND}`
  );
}

/**
 * A name that reads as a kit's: a module folder's own name, `<folder>.<Name>`, or any dotted name
 * whose nearest catalog type is not itself dotted (then the dot is the kit convention, not a typo of
 * a dotted built-in such as `net.noodl.ParseFeed`).
 */
function looksLikeKitType(type: string, moduleFolders: string[], suggestion: string | undefined): boolean {
  if (moduleFolders.some((dir) => type === dir || type.startsWith(dir + '.'))) return true;
  if (!type.includes('.')) return false;
  return !(suggestion && suggestion.includes('.'));
}

function moduleDirs(projectDir: string): string[] {
  try {
    return fs
      .readdirSync(path.join(projectDir, 'noodl_modules'), { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
  } catch {
    return [];
  }
}
