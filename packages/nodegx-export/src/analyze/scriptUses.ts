/**
 * P109 ISL-005 AC7 — can a Function's `uses` be carried into the export, and if not, why not.
 *
 * A Function that lists script files re-hosts as any other (EXP-003 §4), with one more name in its
 * scope: `Scripts`, holding each listed file's `exports` (the runtime's `simplejavascript.ts`
 * `scriptsFor`). The files themselves are emitted once, under `src/project-scripts/`, never pasted
 * into the wrapper (ISL-005 §7: a copy at save time is not sharing).
 *
 * Each refusal below is one the runtime makes too, or one the re-host makes of a body — never a
 * new rule. A Function this refuses is deferred by name, so the export's report says which file
 * and why, instead of emitting a wrapper whose `Scripts` is unbound (the red this closed:
 * `TS2304 Cannot find name 'Scripts'` on every page that used a file).
 */

import { ScriptFileIR } from '../ir/types';
import { normalizeScriptPath, SCRIPT_FILE_PARAMS, scriptAlias, ScriptPath, scriptUses, scriptUsesOf } from '../scriptFiles';
import { scriptFileMarkerDefer } from './jsfun';

/** A listed file, by the name the body reaches it by (`Scripts.<alias>`). */
export interface ScriptUsePlan {
  alias: string;
  path: ScriptPath;
}

/**
 * `{ uses }` — the files to bind, in the order listed (empty: the Function lists none).
 * `{ defer }` — the reason, worded to follow "the script " in the report.
 */
export function scriptUsesPlan(usesValue: unknown, files: ScriptFileIR[] | undefined): { uses: ScriptUsePlan[] } | { defer: string } {
  const listed = scriptUsesOf(usesValue);
  if (listed.length === 0) return { uses: [] };
  const sourceOf = new Map((files ?? []).map((f) => [f.path, f.source]));

  const uses: ScriptUsePlan[] = [];
  for (const entry of listed) {
    const p = normalizeScriptPath(entry);
    if (p === undefined) return { defer: `lists "${entry}" under Uses, which is not a script file path` };
    if (!sourceOf.has(p)) {
      return { defer: `uses scripts/${p}, which the project does not have (the runtime refuses this Function too: function/script-missing)` };
    }
    const alias = scriptAlias(p);
    const clash = uses.find((u) => u.alias === alias);
    if (clash !== undefined) {
      return {
        defer: `uses two script files named "${alias}" (scripts/${clash.path} and scripts/${p}) — the runtime refuses it too (function/script-name-clash)`
      };
    }
    uses.push({ alias, path: p });
  }

  // Every file the listed ones reach through use(), each read once. A file's own failure is named
  // by the file at fault, as the runtime names it (`ScriptFileError.path`).
  const seen = new Set<ScriptPath>();
  const queue: Array<{ path: ScriptPath; via?: ScriptPath }> = uses.map((u) => ({ path: u.path }));
  while (queue.length > 0) {
    const { path: p, via } = queue.shift()!;
    if (seen.has(p)) continue;
    seen.add(p);
    const source = sourceOf.get(p);
    if (source === undefined) {
      return { defer: `uses scripts/${via}, which use()s scripts/${p}, which the project does not have` };
    }
    const fileDefer = scriptFileDefer(source);
    if (fileDefer !== null) return { defer: `uses scripts/${p}, which ${fileDefer}` };
    for (const next of scriptUses(source)) queue.push({ path: next, via: p });
  }
  return { uses };
}

/**
 * One file's own fitness: it compiles as the runtime compiles it, it compiles strict (the emitted
 * file is an ES module, always strict, where the runtime's `new Function` is not), and it passes
 * the file-scope marker gates.
 */
function scriptFileDefer(source: string): string | null {
  try {
    // eslint-disable-next-line no-new-func
    new Function(...SCRIPT_FILE_PARAMS, source);
  } catch (e) {
    return `does not compile: ${(e as Error).message}`;
  }
  try {
    // eslint-disable-next-line no-new-func
    new Function(...SCRIPT_FILE_PARAMS, `'use strict';\n${source}`);
  } catch (e) {
    return `compiles only in sloppy mode (${(e as Error).message}) — the exported file is an ES module, which is always strict`;
  }
  return scriptFileMarkerDefer(source);
}
