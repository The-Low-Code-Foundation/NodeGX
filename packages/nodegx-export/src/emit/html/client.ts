/**
 * P134 HTX-004. The backend client in plain files: the React export's own `src/api/*.ts`, `src/lib/noodl.ts` and
 * `src/lib/errors.ts`, the same text with its types taken out, as ES modules a browser loads as they are (`api/client.js`,
 * `api/tasks.js`, `lib/noodl.js`, `lib/errors.js`). One client, three hosts: the React export, the Swift app's
 * JavaScriptCore (EXP-022 S3, `emit/swift/client.ts`), and the plain page.
 *
 * The types come out with Node's own stripper (`stripTypes`, Swift S3's), which leaves every comment and line where it
 * was and turns each type into spaces. A type's spaces are then taken out with it (`closeStripped`): only the characters
 * the stripper blanked are removed, so nothing inside a string or a comment can move. A line that was only a type (an
 * `interface`) goes.
 *
 * Three things a browser does not have are rewritten, each one way, and a module line of any other shape throws with the
 * line, so a new React printer shape fails the HTML export's tests by name instead of loading wrong:
 *
 * - an import path gains its `.js` (`'./client'` → `'./client.js'`); `@nodegx/core` is the folder's own `lib/core.js`;
 * - `import.meta.env` (Vite's) is `env`, from the folder's `env.js`, where a person writes another backend's address;
 * - `react`: the hooks the session and error modules end with (`useSession`, `useAppError`) are React's alone, and are
 *   left out with a line saying so. The page reads the session through `lib/session.js` and raises through
 *   `raiseAppError`, which do not use them. A React name still read after that throws.
 *
 * @module emit/html/client
 */

import { stripTypes } from '../swift/client';

/** The React files the plain page runs: every api module, the Noodl API and the error channel, and what they import. */
const ENTRY = /^src\/api\/[^/]+\.ts$|^src\/lib\/noodl\.ts$|^src\/lib\/errors\.ts$/;

/** `src/api/client.ts` → `api/client.js`. */
const outPath = (file: string): string => file.replace(/^src\//, '').replace(/\.ts$/, '.js');

/** A path from the module at `from` (an output path) to `to` (an output path). */
function relativeTo(from: string, to: string): string {
  const a = from.split('/').slice(0, -1);
  const b = to.split('/');
  let i = 0;
  while (i < a.length && i < b.length - 1 && a[i] === b[i]) i++;
  const up = a.length - i;
  return `${up === 0 ? './' : '../'.repeat(up)}${b.slice(i).join('/')}`;
}

/**
 * The stripped text with the stripper's blanks closed: each run of characters it turned into spaces is removed, with the
 * space before it where the run ends a line or meets punctuation. A line that held only blanked characters is dropped.
 */
export function closeStripped(original: string, stripped: string): string {
  // The transform mode (a parameter property) moves text: then only the trailing spaces go.
  if (original.length !== stripped.length) return stripped.replace(/[ \t]+$/gm, '');
  const origLines = original.split('\n');
  const out: string[] = [];
  stripped.split('\n').forEach((s, n) => {
    const o = origLines[n];
    let line = '';
    let blanked = false;
    for (let i = 0; i < s.length; ) {
      if (s[i] !== ' ') {
        line += s[i++];
        continue;
      }
      // A run of spaces: the stripper's, where any of it was text; the author's otherwise.
      let j = i;
      while (j < s.length && s[j] === ' ') j++;
      const removed = [...o.slice(i, j)].some((c) => c !== ' ' && c !== '\t');
      if (!removed) line += o.slice(i, j);
      else {
        blanked = true;
        const next = s[j];
        if (i === 0) line += o.slice(0, o.length - o.trimStart().length);
        // One space between words and before `=`, `{` or an arrow; none before punctuation or the line's end.
        else if (next !== undefined && !/[,;)\]}>.:?(]/.test(next)) line += ' ';
      }
      i = j;
    }
    if (blanked && line.trim() === '') {
      // A type's own doc comment goes with it.
      if (out.length > 0 && out[out.length - 1].trim().endsWith('*/')) {
        let k = out.length - 1;
        while (k > 0 && !out[k].trim().startsWith('/*')) k--;
        if (out[k].trim().startsWith('/**')) out.splice(k);
      }
      return;
    }
    out.push(line.replace(/[ \t]+$/, ''));
  });
  return out.join('\n').replace(/\n{3,}/g, '\n\n');
}

/** What a plain page reads where the React export calls the hook. */
const HOOK_INSTEAD: Record<string, string> = {
  useSession: 'a plain page reads the same stored session through lib/session.js',
  useAppError: "the On App Error node's boundary, which the HTML export does not print yet; raiseAppError above is the same"
};

/** One `export function use…` block, its doc comment above it, cut from a module; the name of each one cut. */
function cutHooks(ts: string): { text: string; hooks: string[] } {
  const lines = ts.split('\n');
  const hooks: string[] = [];
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const m = /^export function (use[A-Z]\w*)\b/.exec(lines[i]);
    if (!m) {
      out.push(lines[i]);
      continue;
    }
    // Its doc comment, if the lines just above are one.
    if (out.length > 0 && out[out.length - 1].trim() === '*/') {
      let k = out.length - 1;
      while (k > 0 && !out[k].trim().startsWith('/**')) k--;
      out.splice(k);
    }
    let end = i;
    while (end < lines.length && lines[end] !== '}') end++;
    if (end === lines.length) throw new Error(`the hook ${m[1]} has no closing line the HTML export can find`);
    hooks.push(m[1]);
    const instead = HOOK_INSTEAD[m[1]] ?? 'the HTML export does not print the node that uses it yet';
    out.push(`// \`${m[1]}\` is a React hook, and only the React export carries it: ${instead}.`);
    i = end;
  }
  return { text: out.join('\n'), hooks };
}

/** One React file as one ES module of the plain page. */
export function clientModuleEsm(file: string, ts: string): { path: string; js: string; imports: string[] } {
  const path = outPath(file);
  const imports: string[] = [];
  // React's own import goes, and the hooks that used it.
  let reactNames: string[] = [];
  let text = ts.replace(/^import\s*\{([^}]*)\}\s*from\s*'react';?[ \t]*\n/m, (_, names: string) => {
    reactNames = names.split(',').map((s) => s.trim()).filter(Boolean);
    return '';
  });
  if (reactNames.length > 0) {
    text = cutHooks(text).text;
    for (const name of reactNames) {
      if (new RegExp(`\\b${name}\\b`).test(text)) throw new Error(`${file} still reads React's ${name} once its hooks are left out`);
    }
  }
  let usesEnv = false;
  const closed = closeStripped(text, stripTypes(text));
  const lines = closed.split('\n').map((line) => {
    const m = /^(import\s*(?:\{[^}]*\}|\*\s+as\s+\w+)\s*from\s*)'([^']+)';?\s*$/.exec(line);
    if (m) {
      const spec = m[2];
      let target: string;
      if (spec === '@nodegx/core') target = 'lib/core.js';
      else if (spec.startsWith('.')) {
        const parts = file.split('/').slice(0, -1);
        for (const p of spec.split('/')) {
          if (p === '.') continue;
          if (p === '..') parts.pop();
          else parts.push(p);
        }
        target = outPath(`${parts.join('/')}.ts`);
        imports.push(`${parts.join('/')}.ts`);
      } else throw new Error(`${file} imports "${spec}", which the HTML export does not carry`);
      // A list the stripper emptied of a type leaves `, }`.
      const head = m[1].replace(/,\s*\}/, ' }').replace(/\{\s*,/, '{ ');
      return `${head}'${relativeTo(path, target)}';`;
    }
    if (/^\s*import\b/.test(line) && !/^\s*import\s*$/.test(line)) throw new Error(`${file}: a module line the HTML export does not know: ${line.trim()}`);
    if (/^\s*export\s+(?!(?:async\s+)?function\*?\s|const\s|let\s|var\s|class\s)/.test(line)) throw new Error(`${file}: a module line the HTML export does not know: ${line.trim()}`);
    if (/\bimport\.meta\.env\b/.test(line)) {
      usesEnv = true;
      return line.replace(/\bimport\.meta\.env\b/g, 'env');
    }
    return line;
  });
  if (usesEnv) {
    // After the file's own header comment, before its first import or code.
    const at = lines.findIndex((l) => l.trim() !== '' && !/^\s*(\/\/|\/\*|\*)/.test(l));
    lines.splice(at < 0 ? 0 : at, 0, `import { env } from '${relativeTo(path, 'env.js')}';`, ...(lines[at]?.startsWith('import') ? [] : ['']));
  }
  const header = `// @nodegx:generated by \`nodegx export --target html\` — ${file} of the React export, its types taken out: the same client.`;
  return { path, imports, js: `${header}\n${lines.join('\n').replace(/^\/\/ @nodegx:generated[^\n]*\n/, '')}${lines[lines.length - 1] === '' ? '' : '\n'}` };
}

/** `env.js`: where the app's backend is, empty for the project's own (the defaults in `api/client.js`). */
export const ENV_JS = [
  "// The app's environment. Empty, the app talks to the project's own backend (the defaults in api/client.js).",
  '// To point it at another backend without editing the generated code, write its address and app id here:',
  "//   export const env = { VITE_NODEGX_ENDPOINT: 'https://my-backend.example', VITE_NODEGX_APP_ID: 'my-app' };",
  'export const env = {};',
  ''
].join('\n');

/**
 * `lib/session.js`: who is signed in, as a value a page reads and follows. The React export's `useSession`
 * (`api/session.ts`) over the same stored session and the same listeners, as a `derived` instead of a hook.
 */
export const SESSION_JS = [
  '// @nodegx:generated by `nodegx export --target html` — who is signed in, as a value a page reads.',
  "// The React export's useSession (api/session.ts), over the same stored session: a sign-in or a sign-out, here or in",
  '// another tab, changes it, and everything that reads it follows.',
  "import { derived } from './core.js';",
  "import { keep } from './dom.js';",
  "import { readSession, readSessionRaw, subscribeSession } from '../api/client.js';",
  '',
  '/** `{ authenticated, user }`, `user` being `{ id, username, email }` or null; followed for as long as `l` lives. */',
  'export function followSession(l) {',
  '  const raw = keep(readSessionRaw());',
  '  l.add(',
  '    subscribeSession(function () {',
  '      raw.set(readSessionRaw());',
  '    })',
  '  );',
  '  return derived(function () {',
  '    if (raw.get() === undefined) return { authenticated: false, user: null };',
  '    const stored = readSession();',
  '    return stored === undefined',
  '      ? { authenticated: false, user: null }',
  '      : { authenticated: true, user: { id: stored.objectId, username: stored.username, email: stored.email } };',
  '  });',
  '}',
  ''
].join('\n');

/** `lib/session.js` where the project declares no backend: the React export's stub `useSession`, as a value. */
export const SESSION_NONE_JS = [
  '// @nodegx:generated by `nodegx export --target html` — who is signed in. This app declares no backend, so nobody',
  "// ever is: the React export's stub useSession (api/session.ts) answers the same.",
  "import { keep } from './dom.js';",
  '',
  'export function followSession() {',
  '  return keep({ authenticated: false, user: null });',
  '}',
  ''
].join('\n');

/**
 * The client modules of a React export's files, by output path: the api modules, the Noodl API and the error channel,
 * and every local module they import; `env.js` and `lib/session.js` beside them. Empty when the React export writes no
 * backend client (a project with no backend declared).
 */
export function clientFilesEsm(reactFiles: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  const queue = Object.keys(reactFiles).filter((f) => ENTRY.test(f)).sort();
  const seen = new Set<string>();
  while (queue.length > 0) {
    const file = queue.shift()!;
    if (seen.has(file)) continue;
    seen.add(file);
    const mod = clientModuleEsm(file, reactFiles[file]);
    out[mod.path] = mod.js;
    for (const next of mod.imports) {
      if (seen.has(next)) continue;
      if (!(next in reactFiles)) throw new Error(`${file} imports ${next}, which the React export does not write`);
      queue.push(next);
    }
  }
  if (Object.keys(out).length === 0) return out;
  // With no backend declared the React export writes its api modules as stubs and no client: nobody is ever signed in.
  if ('src/api/client.ts' in reactFiles) {
    out['env.js'] = ENV_JS;
    out['lib/session.js'] = SESSION_JS;
  } else out['lib/session.js'] = SESSION_NONE_JS;
  return out;
}
