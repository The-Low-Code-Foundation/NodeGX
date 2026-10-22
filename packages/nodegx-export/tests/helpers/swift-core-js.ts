/**
 * EXP-022 S7. `@nodegx/core` as the Swift app's JavaScript host carries it (`src/emit/swift/coreJs.ts`): each source file
 * of `packages/nodegx-core/src` but the React binding, transpiled to CommonJS and defined as a module the host requires
 * by name (`@nodegx/core`, `@nodegx/core/internal`, …).
 *
 * The exporter does not depend on `@nodegx/core` and carries no TypeScript when it is installed, so the core travels as a
 * constant, the way S2's runner does. This is the one place the constant is made: the test transpiles it again from the
 * core's source and fails when the two differ, so a change to the core reaches the Swift app or turns the suite red.
 *
 *   cd packages/nodegx-export && npx ts-node --transpile-only -O '{"module":"commonjs"}' tests/helpers/swift-core-js.ts
 *
 * writes the constant.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

export const CORE_SRC = path.join(__dirname, '..', '..', '..', 'nodegx-core', 'src');

/** `index` → `@nodegx/core`; `internal` → `@nodegx/core/internal`. */
const moduleOf = (base: string) => (base === 'index' ? '@nodegx/core' : `@nodegx/core/${base}`);

/** The core's JavaScript, one `__define` per source file, in file order. */
export function coreJs(dir = CORE_SRC): string {
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.ts') && f !== 'react.ts')
    .sort();
  const parts = files.map((file) => {
    const base = file.replace(/\.ts$/, '');
    const out = ts.transpileModule(fs.readFileSync(path.join(dir, file), 'utf-8'), {
      compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, removeComments: true }
    }).outputText;
    const body = out
      .replace(/^\/\/# sourceMappingURL=.*$/m, '')
      .replace(/require\("\.\/([^"]+)"\)/g, (_m, dep: string) => `__require(${JSON.stringify(moduleOf(dep))})`)
      .trimEnd();
    if (/\brequire\(/.test(body.replace(/__require\(/g, ''))) throw new Error(`${file} requires a module the Swift host does not carry`);
    return [`__define(${JSON.stringify(moduleOf(base))}, function (exports, __require) {`, body, '});'].join('\n');
  });
  return `// @nodegx/core (packages/nodegx-core/src, the React binding apart), transpiled to CommonJS.\n${parts.join('\n')}\n`;
}

/** The module `src/emit/swift/coreJs.ts`. */
export function coreJsModule(): string {
  return [
    '/**',
    " * EXP-022 S7. `@nodegx/core`'s JavaScript, as the Swift app's host carries it: the Global Stores the web export writes",
    ' * (`src/stores/<name>.ts`) are `store()` calls, and they run in the JavaScriptCore context over this.',
    ' *',
    ' * 🔴 Generated, never edited: `tests/helpers/swift-core-js.ts` transpiles `packages/nodegx-core/src` (the React binding',
    ' * apart). `tests/the-same-graph-in-swift-s7.test.ts` transpiles it again and fails when the two differ.',
    ' *',
    ' * @module emit/swift/coreJs',
    ' */',
    '',
    `export const CORE_JS = ${JSON.stringify(coreJs())};`,
    ''
  ].join('\n');
}

if (require.main === module) {
  const target = path.join(__dirname, '..', '..', 'src', 'emit', 'swift', 'coreJs.ts');
  fs.writeFileSync(target, coreJsModule());
  // eslint-disable-next-line no-console
  console.log(`wrote ${target}`);
}
