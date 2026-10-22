/**
 * EXP-022 S3. The backend client in the JavaScriptCore host: the React export's own `src/api/*` and `src/lib/noodl.ts`,
 * the same text, with its types taken out — one client in two hosts (§8's ruling).
 *
 * The React export writes the client per project (the endpoint and app id, a schema table, the collections' modules, and
 * sections switched on by what the graph uses), so a constant cannot be the same client. Nor can a bundler run when a
 * person exports: the published package carries neither esbuild nor TypeScript. Node itself can take the types out
 * (`module.stripTypeScriptTypes`, in Node 22.13 and later: types become spaces, nothing else moves), and the client's
 * module lines have one shape each, because the React printer writes them. So each file becomes one module the host
 * requires by its path (`api/client`, `lib/noodl`): its named imports a destructuring of `__require`, its exports getters
 * on `exports` (live, as an ES module's are), and `import.meta.env` the host's `__nodegxEnv` (the app's environment, so a
 * test or a scheme points the app at another backend without editing generated code, as `.env` does on the web).
 *
 * A line of a shape this does not know throws with the line, so a new React printer shape fails the Swift export's
 * tests by name instead of loading wrong.
 *
 * @module emit/swift/client
 */

import * as nodeModule from 'node:module';

/** The React files the client is made of: every api module, the Noodl API, and whatever they import, transitively. */
const ENTRY = /^src\/api\/[^/]+\.ts$|^src\/lib\/noodl\.ts$/;

/** `src/api/client.ts` → `api/client`. */
function moduleName(file: string): string {
  return file.replace(/^src\//, '').replace(/\.ts$/, '');
}

/** An import's path, from the importing module, as a module name; bare `react` is the host's own stand-in. */
function resolve(from: string, spec: string): string {
  if (spec === 'react') return 'react';
  if (!spec.startsWith('.')) throw new Error(`the client imports "${spec}", which the Swift host does not carry`);
  const parts = moduleName(from).split('/').slice(0, -1);
  for (const p of spec.split('/')) {
    if (p === '.') continue;
    if (p === '..') parts.pop();
    else parts.push(p);
  }
  return parts.join('/');
}

let strip: ((code: string) => string) | undefined;
/** Node's own type stripper, with its one-time "experimental" warning kept off the person's terminal. */
function stripTypes(code: string): string {
  if (strip === undefined) {
    // A namespace read, not a named import: on a Node without it the package still loads, and only this export refuses.
    const mod = nodeModule as unknown as { stripTypeScriptTypes?: (code: string, options?: { mode: 'strip' }) => string };
    if (typeof mod.stripTypeScriptTypes !== 'function') {
      throw new Error(`the Swift export carries the backend client as JavaScript, which needs Node 22.13 or later (this is ${process.version})`);
    }
    const stripper = mod.stripTypeScriptTypes;
    strip = (text) => {
      const emit = process.emitWarning;
      process.emitWarning = (() => undefined) as typeof process.emitWarning;
      try {
        return stripper(text, { mode: 'strip' });
      } finally {
        process.emitWarning = emit;
      }
    };
  }
  return strip(code);
}

/** One React file as one module of the host: `__define("api/client", function (exports, __require) { … });`. */
export function clientModuleJs(file: string, ts: string): { name: string; js: string; imports: string[] } {
  const name = moduleName(file);
  const exported: string[] = [];
  const imports: string[] = [];
  const lines = stripTypes(ts)
    .split('\n')
    .map((line) => {
      let m = /^import\s*\{([^}]*)\}\s*from\s*'([^']+)';?\s*$/.exec(line);
      if (m) {
        const from = resolve(file, m[2]);
        imports.push(from);
        const names = m[1]
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
          .map((s) => s.replace(/^(\w+)\s+as\s+(\w+)$/, '$1: $2'));
        return `const { ${names.join(', ')} } = __require(${JSON.stringify(from)});`;
      }
      m = /^import\s+\*\s+as\s+(\w+)\s+from\s*'([^']+)';?\s*$/.exec(line);
      if (m) {
        const from = resolve(file, m[2]);
        imports.push(from);
        return `const ${m[1]} = __require(${JSON.stringify(from)});`;
      }
      m = /^export\s+((?:async\s+)?function\*?|const|let|var|class)\s+(\w+)/.exec(line);
      if (m) {
        exported.push(m[2]);
        return line.replace(/^export\s+/, '').replace(/\bimport\.meta\.env\b/g, '__nodegxEnv');
      }
      if (/^\s*(import|export)\b/.test(line) && !/^\s*(import|export)\s*$/.test(line)) {
        throw new Error(`${file}: a module line the Swift host does not know: ${line.trim()}`);
      }
      return line.replace(/\bimport\.meta\.env\b/g, '__nodegxEnv');
    });
  const getters = exported.map((n) => `  Object.defineProperty(exports, ${JSON.stringify(n)}, { enumerable: true, get: function () { return ${n}; } });`);
  return {
    name,
    imports,
    js: [
      `// @nodegx:generated (EXP-022) — ${file} of the web export, its types taken out: the same client, in the app's JavaScriptCore context.`,
      `__define(${JSON.stringify(name)}, function (exports, __require) {`,
      ...getters,
      ...lines,
      '});',
      ''
    ].join('\n')
  };
}

/**
 * The client modules of a React export's files: the api modules and the Noodl API, and every local module they import.
 * Empty when the React export writes none (a project with no record, user or Noodl API use).
 */
export function clientModulesJs(reactFiles: Record<string, string>): Array<{ name: string; js: string }> {
  const out = new Map<string, { name: string; js: string }>();
  const queue = Object.keys(reactFiles).filter((f) => ENTRY.test(f)).sort();
  while (queue.length > 0) {
    const file = queue.shift()!;
    const name = moduleName(file);
    if (out.has(name)) continue;
    const mod = clientModuleJs(file, reactFiles[file]);
    out.set(name, { name: mod.name, js: mod.js });
    for (const imp of mod.imports) {
      if (imp === 'react' || out.has(imp)) continue;
      const next = `src/${imp}.ts`;
      if (!(next in reactFiles)) throw new Error(`${file} imports ${imp}, which the web export does not write`);
      queue.push(next);
    }
  }
  return [...out.values()].sort((a, b) => a.name.localeCompare(b.name));
}
