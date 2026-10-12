/**
 * P109 ISL-005 AC7 — a project's script files in the exported app.
 *
 * Three kinds of file, all earned by a re-hosted Function whose `uses` lists script files:
 *
 * - `src/lib/projectScripts.ts` — the loader, transcribed from `noodl-runtime/src/scriptfiles.ts`:
 *   a file runs once, the first time anything uses it, and every later user gets the same `exports`;
 *   `use()` takes any spelling of a path; a cycle sees the exports so far (CommonJS); a failure is
 *   remembered and thrown again to every user. `Noodl`, `window` and `document` arrive `undefined`.
 * - `src/lib/projectScriptFiles.ts` — the one registry, `projectScripts`, holding every file in the
 *   project. One registry is what makes a file's top-level state shared by all its users, as in the
 *   runtime; and every file is in it so a `use()` the text scan cannot see still resolves.
 * - `src/project-scripts/<path>.ts` — each file **once**, the author's text verbatim inside the
 *   function the runtime compiles it as. `// @ts-nocheck`, on the same reasoning as a Script node's
 *   file (`component.ts` `scriptFileSource`): it is the author's JavaScript, not TypeScript.
 *
 * The Function's wrapper (`component.ts` `jsWrapperLines`) binds `Scripts` from the registry inside
 * its try, so a file that fails runs none of the body, as the runtime fails the run.
 *
 * Recorded divergence: the runtime raises a broken file once on the editor's error bus, naming its
 * users; the export logs it to the console from each wrapper that meets it, as it logs a body's throw.
 */

import { ScriptFileIR } from '../ir/types';

export const PROJECT_SCRIPTS_LIB_PATH = 'src/lib/projectScripts.ts';
export const PROJECT_SCRIPT_FILES_PATH = 'src/lib/projectScriptFiles.ts';
/** The registry's name, imported into each component that re-hosts a Function with Uses. */
export const PROJECT_SCRIPTS_SYMBOL = 'projectScripts';

/** `engine/world.js` → `src/project-scripts/engine/world.ts`. Not `src/scripts/` (the Script node's files, EXP-011 §52). */
export function projectScriptFilePath(path: string): string {
  return `src/project-scripts/${path.replace(/\.js$/, '')}.ts`;
}

export function projectScriptsLibSource(): string {
  return [
    '//',
    "// A project's script files (scripts/**.js), loaded the way the runtime loads them. Transcribed from",
    '// noodl-runtime/src/scriptfiles.ts. A file runs once, the first time anything uses it, and every later',
    "// user gets the same exports, so a value a file keeps at its top level is shared, as a module's is.",
    "// Inside a file, use('engine/world') reaches another file; a cycle sees the exports so far. A file that",
    '// fails is remembered, and every later user is given the same error. Noodl, window and document are',
    '// undefined inside a file, as they are in the runtime: calls into the app stay in the Function.',
    '//',
    '',
    '// eslint-disable-next-line @typescript-eslint/no-explicit-any',
    'export type ScriptExports = Record<string, any>;',
    '',
    '/** A file, as the runtime compiles it: `new Function(use, exports, module, Noodl, window, document)`. */',
    'export type ScriptFileBody = (',
    '  // eslint-disable-next-line @typescript-eslint/no-explicit-any',
    '  use: (path: string) => any,',
    '  exports: ScriptExports,',
    '  module: { exports: ScriptExports },',
    '  Noodl: undefined,',
    '  window: undefined,',
    '  document: undefined',
    ') => void;',
    '',
    'export class ScriptFileError extends Error {',
    "  readonly code: 'script/missing' | 'script/threw';",
    '  readonly path: string;',
    '',
    "  constructor(code: 'script/missing' | 'script/threw', path: string, message: string) {",
    '    super(message);',
    "    this.name = 'ScriptFileError';",
    '    this.code = code;',
    '    this.path = path;',
    '  }',
    '',
    '  describe(): string {',
    "    return 'scripts/' + this.path + ': ' + this.message;",
    '  }',
    '}',
    '',
    "/** `engine/world`, `./engine/world.js` and `scripts/engine/world.js` are all `engine/world.js`; `..` names nothing. */",
    'export function normalizeScriptPath(path: unknown): string | undefined {',
    "  if (typeof path !== 'string') return undefined;",
    "  let p = path.trim().replace(/\\\\/g, '/');",
    "  p = p.replace(/^\\.\\//, '').replace(/^\\/+/, '');",
    "  if (p.startsWith('scripts/')) p = p.substring('scripts/'.length);",
    "  if (p === '' || p.endsWith('/')) return undefined;",
    "  if (p.split('/').some((part) => part === '' || part === '.' || part === '..')) return undefined;",
    "  if (!p.endsWith('.js')) p += '.js';",
    '  return p;',
    '}',
    '',
    "type Loaded = { module: { exports: ScriptExports }; state: 'loading' | 'done' | 'failed'; error?: ScriptFileError };",
    '',
    'export class ScriptFiles {',
    '  private readonly bodies: Readonly<Record<string, ScriptFileBody>>;',
    '  private readonly loaded = new Map<string, Loaded>();',
    '',
    '  constructor(bodies: Readonly<Record<string, ScriptFileBody>>) {',
    '    this.bodies = bodies;',
    '  }',
    '',
    '  /** A file\'s exports, running it (and what it uses) the first time. Throws a ScriptFileError. */',
    '  // eslint-disable-next-line @typescript-eslint/no-explicit-any',
    '  load(path: unknown): any {',
    '    const p = normalizeScriptPath(path);',
    "    if (p === undefined) throw new ScriptFileError('script/missing', String(path), 'This is not a script file path: \"' + String(path) + '\"');",
    '    const known = this.loaded.get(p);',
    '    if (known !== undefined) {',
    "      if (known.state === 'failed') throw known.error!;",
    "      // 'loading' is a cycle: what the file has exported so far, as CommonJS does.",
    '      return known.module.exports;',
    '    }',
    '    const body = Object.prototype.hasOwnProperty.call(this.bodies, p) ? this.bodies[p] : undefined;',
    '    if (body === undefined) {',
    "      const error = new ScriptFileError('script/missing', p, 'There is no script file scripts/' + p);",
    "      this.loaded.set(p, { module: { exports: {} }, state: 'failed', error });",
    '      throw error;',
    '    }',
    "    const entry: Loaded = { module: { exports: {} }, state: 'loading' };",
    '    this.loaded.set(p, entry);',
    '    try {',
    '      body((other) => this.load(other), entry.module.exports, entry.module, undefined, undefined, undefined);',
    '    } catch (e) {',
    "      entry.state = 'failed';",
    '      // A file that uses a broken one fails with the broken one\'s error, so the person is sent to the right file.',
    "      entry.error = e instanceof ScriptFileError ? e : new ScriptFileError('script/threw', p, e instanceof Error ? e.message : String(e));",
    '      throw entry.error;',
    '    }',
    "    entry.state = 'done';",
    '    return entry.module.exports;',
    '  }',
    '}',
    ''
  ].join('\n');
}

/** The registry: every file, by its path, under one loader. Files sorted (D1), so the import names are stable. */
export function projectScriptFilesSource(scripts: readonly ScriptFileIR[]): string {
  const imports = scripts.map((s, i) => `import file${i} from ${JSON.stringify(`../project-scripts/${s.path.replace(/\.js$/, '')}`)};`);
  const rows = scripts.map((s, i) => `  ${JSON.stringify(s.path)}: file${i}`);
  return [
    '//',
    "// Every script file in the project, under one loader, so each one runs once for the whole app. A",
    '// Function reaches the files it lists under Uses from here (see src/lib/projectScripts.ts).',
    '//',
    "import { ScriptFiles } from './projectScripts';",
    ...imports,
    '',
    `export const ${PROJECT_SCRIPTS_SYMBOL} = new ScriptFiles({`,
    rows.join(',\n'),
    '});',
    ''
  ].join('\n');
}

/** One file, verbatim, inside the function the runtime compiles it as. */
export function projectScriptFileSource(script: ScriptFileIR): string {
  const up = '../'.repeat(script.path.split('/').length);
  return [
    '// @ts-nocheck',
    '// @nodegx:generated (project script file — P109 ISL-005)',
    '//',
    `// scripts/${script.path}, the author's code, preserved verbatim inside the function the runtime compiles`,
    '// it as (noodl-runtime/src/scriptfiles.ts). It runs once, the first time a Function uses it. Type checking',
    '// is off for this one file: it is JavaScript written against the runtime, not TypeScript. Its loader',
    '// (src/lib/projectScripts.ts) is typed.',
    `import type { ScriptFileBody } from '${up}lib/projectScripts';`,
    '',
    'const body: ScriptFileBody = function (use, exports, module, Noodl, window, document) {',
    ...script.source.split(/\r\n|\n|\r/),
    '};',
    '',
    'export default body;',
    ''
  ].join('\n');
}
