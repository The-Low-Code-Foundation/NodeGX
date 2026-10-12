/**
 * ISL-005 — script files: code a project keeps once, in `scripts/**.js`, for any Function to use.
 *
 * Ruled by Richard on 2026-10-05 ("ship it", on the mockup of shape 1 of the "Big scripts, split into
 * parts" page): a project holds plain JavaScript files beside its components; a Function lists the
 * files it uses (its `uses` parameter) and reaches each one as `Scripts.<name>`; inside a file another
 * file is reached with `use('engine/world')` and what a file offers is what it puts on `exports`.
 *
 * What this module owns, and the rules it keeps:
 *
 * - **One compile per app run, per file.** The sources arrive with the project (`GraphModel.scripts`);
 *   each file is compiled and run the first time anything uses it, and every later user gets the same
 *   `exports` object. A value a file keeps at its top level is therefore shared by every Function that
 *   uses the file, as a module's is in any JavaScript program. A new set of sources (an edit in the
 *   editor) starts again from nothing.
 * - **A file sees `use`, `exports` and `module`, and nothing of the app.** `Noodl`, `window` and
 *   `document` are passed in as `undefined`, so a file behaves the same in the browser, in a server
 *   render, in the export and on any future target. Calls into the app stay in the Function. This is
 *   what keeps a script file free of the viewer, of React and of the editor.
 * - **A file never makes a port.** Ports come from a Function's own text only (ISL-006); nothing here
 *   is read for `Inputs.x` / `Outputs.x`.
 * - **A broken file is named once.** A file that fails to compile or throws while loading is
 *   remembered with its error until the sources change; every user is told the same failure, and the
 *   caller raises it once (see `ScriptFileError.reported`).
 * - **Cycles behave as CommonJS does.** A file reached again while it is still loading gets its
 *   `exports` as they stand at that moment.
 */

/** A file's path as the project names it: relative to `scripts/`, with `.js`. */
export type ScriptPath = string;

/** The source of every script file in a project, keyed by {@link ScriptPath}. */
export type ScriptSources = Record<ScriptPath, string>;

/** Lines `new Function` puts in front of the body: `function anonymous(use,exports,…\n) {\n`. */
const HEADER_LINES = 2;

const PARAMS = ['use', 'exports', 'module', 'Noodl', 'window', 'document'];

/**
 * A script file that could not be loaded: missing, not compilable, or threw while it ran.
 * `path` is the file at fault, which is not always the one a Function asked for: a file that
 * `use()`s a broken one fails with the broken one's error.
 */
export class ScriptFileError extends Error {
  readonly code: 'script/missing' | 'script/not-compiled' | 'script/threw';
  readonly path: ScriptPath;
  readonly line?: number;
  readonly column?: number;
  /** Set by whoever raised it on the error bus, so the same failure is raised once. */
  reported = false;

  constructor(code: ScriptFileError['code'], path: ScriptPath, message: string, line?: number, column?: number) {
    super(message);
    this.name = 'ScriptFileError';
    this.code = code;
    this.path = path;
    this.line = line;
    this.column = column;
  }

  /** `scripts/engine/world.js:12: nope is not defined`, the way a person reads it. */
  describe(): string {
    return 'scripts/' + this.path + (this.line !== undefined ? ':' + this.line : '') + ': ' + this.message;
  }
}

/**
 * A path as an author or a file may write it, as the project names it: `engine/world`,
 * `./engine/world.js`, `/engine/world.js` and `scripts/engine/world.js` are all `engine/world.js`.
 * Returns `undefined` for a path that leaves `scripts/` (`..`) or names nothing.
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
 * A Function's `uses` parameter as a list of paths. The editor's string list stores a comma-separated
 * string; a project written by an agent may hold an array. Both are read; empty entries and repeats are
 * dropped. An entry that is not a script path is kept as written (trimmed), so a caller can name it.
 * The one reader of `uses`: the runtime, the validator and the door all call it.
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

/**
 * What a script file offers, read from its text: the `exports.name = …` (or `module.exports.name = …`)
 * names, in order. A reading for people and agents (the door's list, the editor's file panel), not
 * what the runtime does: a file that builds `exports` another way gives more than this says.
 */
export function scriptGives(source: string): string[] {
  // An exec loop and an array, not matchAll and a Set: the viewer's ES5 build reads this file too.
  const names: string[] = [];
  const re = /\b(?:module\.)?exports\.([A-Za-z_$][\w$]*)\s*=/g;
  for (let m = re.exec(source); m; m = re.exec(source)) if (names.indexOf(m[1]) < 0) names.push(m[1]);
  return names;
}

/** The files a script reaches with `use('…')`, as the project names them, read from its text. */
export function scriptUses(source: string): ScriptPath[] {
  const out: ScriptPath[] = [];
  const re = /\buse\(\s*['"]([^'"]+)['"]\s*\)/g;
  for (let m = re.exec(source); m; m = re.exec(source)) {
    const p = normalizeScriptPath(m[1]);
    if (p !== undefined && out.indexOf(p) < 0) out.push(p);
  }
  return out;
}

/** The name a Function's code reaches a file by: its file name without `.js` (`engine/world.js` → `world`). */
export function scriptAlias(path: ScriptPath): string {
  const base = path.substring(path.lastIndexOf('/') + 1);
  return base.endsWith('.js') ? base.substring(0, base.length - 3) : base;
}

/** The position of `scripts/<path>` in a stack, in the file's own lines. */
function positionInStack(stack: unknown, path: ScriptPath): { line: number; column: number } | undefined {
  if (typeof stack !== 'string') return undefined;
  const marker = 'scripts/' + path + ':';
  const at = stack.indexOf(marker);
  if (at < 0) return undefined;
  const match = /^(\d+):(\d+)/.exec(stack.substring(at + marker.length));
  if (!match) return undefined;
  return { line: Math.max(1, Number(match[1]) - HEADER_LINES), column: Number(match[2]) };
}

interface Loaded {
  module: { exports: Record<string, unknown> };
  state: 'loading' | 'done' | 'failed';
  error?: ScriptFileError;
}

export class ScriptFiles {
  private sources: ScriptSources = {};
  private loaded = new Map<ScriptPath, Loaded>();
  /** Goes up by one every time the sources are replaced; a user can tell a stale answer by it. */
  version = 0;

  /** Replace every source. Everything compiled from the old ones is dropped. */
  setSources(sources: ScriptSources | undefined): void {
    const next: ScriptSources = {};
    for (const key in sources || {}) {
      const path = normalizeScriptPath(key);
      if (path !== undefined && typeof sources![key] === 'string') next[path] = sources![key];
    }
    this.sources = next;
    this.loaded.clear();
    this.version++;
  }

  has(path: unknown): boolean {
    const p = normalizeScriptPath(path);
    return p !== undefined && Object.prototype.hasOwnProperty.call(this.sources, p);
  }

  paths(): ScriptPath[] {
    return Object.keys(this.sources).sort();
  }

  /**
   * The `exports` of a file, compiling and running it (and what it uses) the first time.
   * Throws a {@link ScriptFileError}; the same error object every time until the sources change.
   */
  load(path: unknown): Record<string, unknown> {
    const p = normalizeScriptPath(path);
    if (p === undefined) {
      throw new ScriptFileError('script/missing', String(path), 'This is not a script file path: "' + String(path) + '"');
    }

    const known = this.loaded.get(p);
    if (known) {
      if (known.state === 'failed') throw known.error!;
      // 'loading' is a cycle: hand back what the file has exported so far, as CommonJS does.
      return known.module.exports;
    }

    if (!Object.prototype.hasOwnProperty.call(this.sources, p)) {
      const error = new ScriptFileError('script/missing', p, 'There is no script file scripts/' + p);
      this.loaded.set(p, { module: { exports: {} }, state: 'failed', error });
      throw error;
    }

    const entry: Loaded = { module: { exports: {} }, state: 'loading' };
    this.loaded.set(p, entry);

    let body: (...args: unknown[]) => unknown;
    try {
      body = new Function(...PARAMS, this.sources[p] + '\n//# sourceURL=scripts/' + p) as typeof body;
    } catch (e) {
      return this.fail(entry, new ScriptFileError('script/not-compiled', p, messageOf(e)));
    }

    // A file that uses a broken one fails with the broken one's error (rethrown below as it is),
    // so the person is sent to the file that is actually wrong.
    const use = (other: unknown) => this.load(other);

    try {
      body(use, entry.module.exports, entry.module, undefined, undefined, undefined);
    } catch (e) {
      if (e instanceof ScriptFileError) return this.fail(entry, e);
      const at = positionInStack(e && (e as Error).stack, p);
      return this.fail(entry, new ScriptFileError('script/threw', p, messageOf(e), at && at.line, at && at.column));
    }

    entry.state = 'done';
    return entry.module.exports;
  }

  private fail(entry: Loaded, error: ScriptFileError): never {
    entry.state = 'failed';
    entry.error = error;
    throw error;
  }
}

function messageOf(e: unknown): string {
  return e && typeof (e as Error).message === 'string' ? (e as Error).message : String(e);
}
