/**
 * P109 ISL-005 — script files, as the export reads them: code a project keeps once, in
 * `scripts/**.js`, that any Function lists under its `uses` parameter and reaches as
 * `Scripts.<name>`. Inside a file another file is reached with `use('engine/world')`, and what a
 * file offers is what it puts on `exports`.
 *
 * 🔴 **Mirrors, not imports.** This package installs on its own (HLS-001), so it cannot reach
 * `noodl-runtime/src/scriptfiles.ts`. The four readers below are that file's, transcribed; the
 * spec `tests/isl-005-script-files.test.ts` runs both over the same table so the two cannot drift.
 * The runtime is the definition: a path the runtime resolves, this resolves the same way.
 */

/** A file's path as the project names it: relative to `scripts/`, with `.js`. */
export type ScriptPath = string;

/**
 * `engine/world`, `./engine/world.js`, `/engine/world.js` and `scripts/engine/world.js` are all
 * `engine/world.js`. Undefined for a path that leaves `scripts/` (`..`) or names nothing.
 */
export function normalizeScriptPath(path: unknown): ScriptPath | undefined {
  if (typeof path !== 'string') return undefined;
  let p = path.trim().replace(/\\/g, '/');
  p = p.replace(/^\.\//, '').replace(/^\/+/, '');
  if (p.startsWith('scripts/')) p = p.substring('scripts/'.length);
  if (p === '' || p.endsWith('/')) return undefined;
  const parts = p.split('/');
  if (parts.some((part) => part === '' || part === '.' || part === '..')) return undefined;
  if (!p.endsWith('.js')) p += '.js';
  return p;
}

/**
 * A Function's `uses` parameter as a list of paths: the editor's comma string, or an array. Empty
 * entries and repeats are dropped; an entry that is not a script path is kept as written (trimmed),
 * so the caller can name it.
 */
export function scriptUsesOf(value: unknown): string[] {
  const raw = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [];
  const out: string[] = [];
  for (const entry of raw) {
    if (typeof entry !== 'string' || entry.trim() === '') continue;
    const path = normalizeScriptPath(entry) ?? entry.trim();
    if (!out.includes(path)) out.push(path);
  }
  return out;
}

/** The files a script reaches with `use('…')`, read from its text. */
export function scriptUses(source: string): ScriptPath[] {
  const out: ScriptPath[] = [];
  const re = /\buse\(\s*['"]([^'"]+)['"]\s*\)/g;
  for (let m = re.exec(source); m; m = re.exec(source)) {
    const p = normalizeScriptPath(m[1]);
    if (p !== undefined && !out.includes(p)) out.push(p);
  }
  return out;
}

/** The name a Function's code reaches a file by: `engine/world.js` → `world`. */
export function scriptAlias(path: ScriptPath): string {
  const base = path.substring(path.lastIndexOf('/') + 1);
  return base.endsWith('.js') ? base.substring(0, base.length - 3) : base;
}

/** What the runtime compiles a file with (`scriptfiles.ts` `PARAMS`); the three app names arrive `undefined`. */
export const SCRIPT_FILE_PARAMS = ['use', 'exports', 'module', 'Noodl', 'window', 'document'] as const;
