/**
 * P109 ISL-005 AC4 — a broken script file is named once, by file and line, with the Functions it breaks.
 *
 * The runtime raises a broken file once, from the first Function that meets it (`simplejavascript.ts`,
 * `ScriptFileError.reported`); every other user fails quietly. The warning the editor receives carries
 * only the message, which is `ScriptFileError.describe()`: `scripts/<path>[:<line>]: <what went wrong>`.
 * Two things are missing from it, and both are cheaper to find here than to send:
 *
 * - **The line of a syntax error.** `new Function` gives none (measured in slice 1), so the runtime
 *   names the file only. The editor holds the file's text and parses it for the position.
 * - **The users.** Every Function that reaches the file, directly under Uses or through another file's
 *   `use()`, because each of those fails with it. The warning sits on one of them; the others are named.
 */
import { parse } from '@babel/parser';
import { normalizeScriptPath, scriptUses, scriptUsesOf } from '@noodl/runtime/src/scriptfiles';

import { FUNCTION_NODE_TYPE } from './scriptUsers';

/** The runtime codes whose message is a `ScriptFileError`'s. */
export const SCRIPT_FILE_WARNING_KEYS: readonly string[] = ['function/script-file-failed', 'function/script-missing'];

/** What this reads of a project: its scripts and its Functions. `ProjectModel` is one. */
export interface ScriptFileWarningProject {
  getScript(path: string): string | undefined;
  getComponents(): ReadonlyArray<{
    name: string;
    getNodesWithTypeRecursive(type: string): ReadonlyArray<{ id: string; label?: string; parameters?: Record<string, unknown> }>;
  }>;
}

export interface ScriptFileWarningFacts {
  path: string;
  line?: number;
  /** `Component / label`, every Function that reaches the file. */
  users: string[];
}

const DESCRIBED = /^scripts\/(.+?\.js)(?::(\d+))?: ([\s\S]*)$/;

/**
 * The warning, its message completed: `scripts/engine/words.js:3: Unexpected token — breaks 2 Functions:
 * /Pages/Home / greet Olive, /Pages/About / greet Robot`. A warning whose message does not name a file is
 * returned as it came.
 */
export function scriptFileWarning<W extends { message?: string }>(
  warning: W,
  project: ScriptFileWarningProject | undefined | null
): W & { scriptFile?: ScriptFileWarningFacts } {
  const match = typeof warning?.message === 'string' ? DESCRIBED.exec(warning.message) : null;
  if (!match || !project) return warning;
  const path = match[1];
  const line = match[2] !== undefined ? Number(match[2]) : syntaxErrorLine(project.getScript(path));
  const users = usersReaching(project, path);
  const where = `scripts/${path}${line !== undefined ? `:${line}` : ''}`;
  const breaks = users.length === 0 ? '' : ` — breaks ${users.length === 1 ? '1 Function' : `${users.length} Functions`}: ${users.join(', ')}`;
  return { ...warning, message: `${where}: ${match[3]}${breaks}`, scriptFile: { path, line, users } };
}

/** The line of the first syntax error, parsed as the runtime compiles a file (a function body). */
export function syntaxErrorLine(source: string | undefined): number | undefined {
  if (typeof source !== 'string') return undefined;
  try {
    parse(source, { sourceType: 'script', allowReturnOutsideFunction: true });
    return undefined;
  } catch (e) {
    const line = (e as { loc?: { line?: number } }).loc?.line;
    return typeof line === 'number' ? line : undefined;
  }
}

/** Every Function whose Uses reaches `path`, directly or through `use()`, as `Component / label`. */
function usersReaching(project: ScriptFileWarningProject, path: string): string[] {
  const reachCache = new Map<string, Set<string>>();
  const reach = (start: string): Set<string> => {
    const known = reachCache.get(start);
    if (known) return known;
    const seen = new Set<string>();
    const queue = [start];
    while (queue.length > 0) {
      const p = queue.shift()!;
      if (seen.has(p)) continue;
      seen.add(p);
      const source = project.getScript(p);
      if (typeof source === 'string') queue.push(...scriptUses(source));
    }
    reachCache.set(start, seen);
    return seen;
  };
  const target = normalizeScriptPath(path) ?? path;
  const users: string[] = [];
  for (const component of project.getComponents()) {
    for (const node of component.getNodesWithTypeRecursive(FUNCTION_NODE_TYPE)) {
      if (scriptUsesOf(node.parameters?.uses).some((p) => reach(p).has(target))) {
        users.push(`${component.name} / ${node.label || node.id}`);
      }
    }
  }
  return users;
}
