/**
 * P109 ISL-005 — a Function's `uses` names script files that exist, and no two of them share a name.
 *
 * A Function lists the project's script files it uses (`uses`), and its code reaches each one as
 * `Scripts.<file name>`. Both ways that can go wrong are facts about the project, not the node, so
 * this is a precondition check the caller hands the project's script paths to:
 *
 * - **A path that names no file.** The runtime refuses the run (`function/script-missing`) and none of
 *   the body runs; caught here, it is refused at the write with the files that do exist.
 * - **Two files with one name** (`engine/world.js` and `maps/world.js` are both `Scripts.world`). The
 *   runtime refuses the run (`function/script-name-clash`); caught here instead.
 *
 * Pure, and imports only the runtime's own path rules, so the editor and the door judge a path the
 * way the runtime will load it.
 */
import { normalizeScriptPath, scriptAlias, scriptUsesOf } from '@noodl/runtime/src/scriptfiles';

import { DiagnosticCode, type Diagnostic } from './diagnostics';

export const FUNCTION_NODE_TYPE = 'JavaScriptFunction';

export interface FunctionScriptUsesNode {
  id: string;
  type: string;
  label?: string;
  parameters?: Record<string, unknown> | null;
}

export interface CheckFunctionScriptUsesOptions {
  component: string;
  /** Every script file in the project, as the project names them (`engine/world.js`). */
  scripts: readonly string[];
}

export function checkFunctionScriptUses(
  nodes: readonly FunctionScriptUsesNode[],
  options: CheckFunctionScriptUsesOptions
): Diagnostic[] {
  const { component } = options;
  const known = new Set(options.scripts.map((p) => normalizeScriptPath(p)).filter((p): p is string => p !== undefined));
  const diagnostics: Diagnostic[] = [];

  for (const node of nodes) {
    if (node.type !== FUNCTION_NODE_TYPE || !node.parameters) continue;
    const uses = scriptUsesOf(node.parameters.uses);
    if (uses.length === 0) continue;

    const location = {
      component,
      nodeId: node.id,
      nodeType: node.type,
      ...(node.label ? { nodeLabel: node.label } : {}),
      port: 'uses'
    };

    const byAlias = new Map<string, string>();
    for (const path of uses) {
      if (!known.has(path)) {
        const available = [...known].sort();
        diagnostics.push({
          code: DiagnosticCode.FunctionUsesMissingScript,
          severity: 'error',
          message:
            `This Function uses "${path}", and there is no script file scripts/${path} in the project. ` +
            'A run would stop before any of its code runs.',
          location,
          suggestion:
            available.length > 0
              ? `Use one of the project's script files (${available.join(', ')}), or create scripts/${path} first.`
              : `The project has no script files yet. Create scripts/${path} first, or take "${path}" out of Uses.`
        });
        continue;
      }
      const alias = scriptAlias(path);
      const other = byAlias.get(alias);
      if (other !== undefined) {
        diagnostics.push({
          code: DiagnosticCode.FunctionUsesScriptNameClash,
          severity: 'error',
          message:
            `This Function uses scripts/${other} and scripts/${path}, and both would be Scripts.${alias}. ` +
            'A run would stop before any of its code runs.',
          location,
          suggestion: `Rename one of the two files, so each has a name of its own.`
        });
        continue;
      }
      byAlias.set(alias, path);
    }
  }

  return diagnostics;
}
