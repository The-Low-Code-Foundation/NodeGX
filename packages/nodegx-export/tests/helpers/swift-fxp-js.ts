/**
 * EXP-022 S9. `fast-xml-parser` as the Swift app's JavaScript host carries it (`src/emit/swift/fxpJs.ts`): the web
 * export's `src/lib/parse.ts` imports `{ XMLParser }` from it, at the version `PARSE_DEPENDENCIES` pins, and the Swift app
 * runs that module in its JavaScriptCore context. A second XML parser would be a second answer.
 *
 * Only `XMLParser` travels (its validator and builder are not imported): since 5.x the package ships it as one
 * self-contained file, `lib/fxparser.min.js` (its dependencies bundled in, no `require`), carried as it ships under its
 * own path. 4.x shipped loose CommonJS files under `src/`, which 5.x replaced with ES modules, so the walk that carried
 * those went with it. The test makes it again from the installed package and fails when the two differ, and fails when
 * the installed version is not the pinned one.
 *
 *   cd packages/nodegx-export && npx ts-node --transpile-only -O '{"module":"commonjs"}' tests/helpers/swift-fxp-js.ts
 *
 * writes the constant.
 */

import * as fs from 'fs';
import * as path from 'path';

import { PARSE_DEPENDENCIES } from '../../src/emit/parseLib';

/** The package's root, as the exporter's own tests resolve it. 5.x exports no `./package.json`, so from its main file. */
export function fxpRoot(): string {
  let dir = path.dirname(require.resolve('fast-xml-parser'));
  while (!fs.existsSync(path.join(dir, 'package.json'))) dir = path.dirname(dir);
  return dir;
}

/** The installed package's version, read from its `package.json`. */
export function fxpVersion(root = fxpRoot()): string {
  return JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf-8')).version as string;
}

/** `fast-xml-parser/lib/fxparser.min.js`, the package's own parser-only build, and the name the web export imports. */
export function fxpJs(root = fxpRoot()): string {
  const version = fxpVersion(root);
  if (version !== PARSE_DEPENDENCIES['fast-xml-parser']) {
    throw new Error(`fast-xml-parser ${version} is installed; the web export pins ${PARSE_DEPENDENCIES['fast-xml-parser']}`);
  }
  const file = path.join(root, 'lib', 'fxparser.min.js');
  const text = fs.readFileSync(file, 'utf-8').replace(/\n\/\/# sourceMappingURL=\S+\s*$/, '');
  if (/\brequire\(/.test(text)) throw new Error(`${file} requires another module; it no longer travels as one file`);
  const name = 'fast-xml-parser/lib/fxparser.min';
  // What the web export imports: `{ XMLParser }` from the package. The build's UMD wrapper hands `{ default: XMLParser }`.
  return [
    `// fast-xml-parser ${version} (its XMLParser, lib/fxparser.min.js, its dependencies bundled in), as the package ships it.`,
    `__define(${JSON.stringify(name)}, function (exports, __require, module) {`,
    text.trimEnd(),
    '});',
    '__define("fast-xml-parser", function (exports, __require) {',
    `  exports.XMLParser = __require(${JSON.stringify(name)}).default;`,
    '});',
    ''
  ].join('\n');
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
