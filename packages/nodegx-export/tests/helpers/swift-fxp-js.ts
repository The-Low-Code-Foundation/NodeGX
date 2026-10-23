/**
 * EXP-022 S9. `fast-xml-parser` as the Swift app's JavaScript host carries it (`src/emit/swift/fxpJs.ts`): the web
 * export's `src/lib/parse.ts` imports `{ XMLParser }` from it, at the version `PARSE_DEPENDENCIES` pins, and the Swift app
 * runs that module in its JavaScriptCore context. A second XML parser would be a second answer.
 *
 * Only `XMLParser` and what it requires travel (its validator and builder are not imported), each file as the package
 * ships it, CommonJS, under its own path. The test makes it again from the installed package and fails when the two
 * differ, and fails when the installed version is not the pinned one.
 *
 *   cd packages/nodegx-export && npx ts-node --transpile-only -O '{"module":"commonjs"}' tests/helpers/swift-fxp-js.ts
 *
 * writes the constant.
 */

import * as fs from 'fs';
import * as path from 'path';

import { PARSE_DEPENDENCIES } from '../../src/emit/parseLib';

/** The package's root, as the exporter's own tests resolve it. */
export function fxpRoot(): string {
  return path.dirname(require.resolve('fast-xml-parser/package.json'));
}

/** `fast-xml-parser/src/xmlparser/XMLParser.js` and every file it requires, transitively; `strnum` by its main file. */
export function fxpJs(root = fxpRoot()): string {
  const version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf-8')).version as string;
  if (version !== PARSE_DEPENDENCIES['fast-xml-parser']) {
    throw new Error(`fast-xml-parser ${version} is installed; the web export pins ${PARSE_DEPENDENCIES['fast-xml-parser']}`);
  }
  const strnum = require.resolve('strnum', { paths: [root] });
  const nameOf = (file: string): string => (file === strnum ? 'strnum' : `fast-xml-parser/${path.relative(root, file).replace(/\.js$/, '')}`);
  const seen = new Map<string, string>();
  const queue = [path.join(root, 'src', 'xmlparser', 'XMLParser.js')];
  while (queue.length > 0) {
    const file = queue.shift()!;
    const name = nameOf(file);
    if (seen.has(name)) continue;
    const text = fs.readFileSync(file, 'utf-8');
    const body = text.replace(/\brequire\(\s*(['"])([^'"]+)\1\s*\)/g, (_m, _q, spec: string) => {
      const dep = spec === 'strnum' ? strnum : require.resolve(path.resolve(path.dirname(file), spec));
      queue.push(dep);
      return `__require(${JSON.stringify(nameOf(dep))})`;
    });
    seen.set(name, [`__define(${JSON.stringify(name)}, function (exports, __require, module) {`, body.trimEnd(), '});'].join('\n'));
  }
  const files = [...seen.keys()].sort().map((name) => seen.get(name)!);
  // What the web export imports: `{ XMLParser }` from the package.
  const alias = [
    '__define("fast-xml-parser", function (exports, __require) {',
    '  exports.XMLParser = __require("fast-xml-parser/src/xmlparser/XMLParser");',
    '});'
  ].join('\n');
  return `// fast-xml-parser ${version} (its XMLParser and what that requires, strnum included), as the package ships it.\n${files.join('\n')}\n${alias}\n`;
}

/** The module `src/emit/swift/fxpJs.ts`. */
export function fxpJsModule(): string {
  return [
    '/**',
    " * EXP-022 S9. `fast-xml-parser`'s JavaScript, as the Swift app's host carries it: the web export's `src/lib/parse.ts`",
    ' * imports its `XMLParser`, and the Swift app runs that module in its JavaScriptCore context.',
    ' *',
    ' * 🔴 Generated, never edited: `tests/helpers/swift-fxp-js.ts` reads the installed package at the pinned version.',
    ' * `tests/the-same-graph-in-swift-s9.test.ts` makes it again and fails when the two differ.',
    ' *',
    ' * @module emit/swift/fxpJs',
    ' */',
    '',
    `export const FXP_JS = ${JSON.stringify(fxpJs())};`,
    ''
  ].join('\n');
}

if (require.main === module) {
  const target = path.join(__dirname, '..', '..', 'src', 'emit', 'swift', 'fxpJs.ts');
  fs.writeFileSync(target, fxpJsModule());
  // eslint-disable-next-line no-console
  console.log(`wrote ${target}`);
}
