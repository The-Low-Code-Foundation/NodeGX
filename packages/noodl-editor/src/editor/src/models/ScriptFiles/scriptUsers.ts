/**
 * P109 ISL-005 — which Functions use which script files, read from the project in memory.
 *
 * A Function lists the files it uses in its `uses` parameter; this is the reverse index the editor
 * shows (a script's "Used by", a row's count in the Scripts list). It reads `uses` with the runtime's
 * own `scriptUsesOf`, so the editor counts a user exactly when the runtime would load the file for it.
 */
import { scriptUsesOf } from '@noodl/runtime/src/scriptfiles';

import type { ProjectModel } from '../projectmodel';

export const FUNCTION_NODE_TYPE = 'JavaScriptFunction';

export interface ScriptUser {
  /** The component's full name, e.g. `/Logic/Step`. */
  component: string;
  nodeId: string;
  /** The node's label, else its id. */
  label: string;
}

/** Every script path a project's Functions name, with the Functions that name it. */
export function scriptUsageIndex(project: ProjectModel | undefined | null): Map<string, ScriptUser[]> {
  const index = new Map<string, ScriptUser[]>();
  if (!project) return index;
  for (const component of project.getComponents()) {
    for (const node of component.getNodesWithTypeRecursive(FUNCTION_NODE_TYPE)) {
      for (const path of scriptUsesOf(node.parameters?.uses)) {
        const users = index.get(path) ?? [];
        users.push({ component: component.name, nodeId: node.id, label: node.label || node.id });
        index.set(path, users);
      }
    }
  }
  return index;
}

/** The Functions that use one script file. */
export function scriptUsersOf(project: ProjectModel | undefined | null, path: string): ScriptUser[] {
  return scriptUsageIndex(project).get(path) ?? [];
}
