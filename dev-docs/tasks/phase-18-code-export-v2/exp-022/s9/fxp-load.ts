/**
 * EXP-022 S9 — load the generated fast-xml-parser constant through a copy of the Swift host's loader (with `module`), and
 * parse the same text with it and with the installed package. Prints both and whether they are equal.
 *   cd packages/nodegx-export && npx ts-node --transpile-only -O '{"module":"commonjs"}' ../../dev-docs/tasks/phase-18-code-export-v2/exp-022/s9/fxp-load.ts
 */
const PKG = '../../../../../packages/nodegx-export';
/* eslint-disable @typescript-eslint/no-var-requires */
const { FXP_JS } = require(`${PKG}/src/emit/swift/fxpJs`);
const mods: Record<string, Function> = {};
const loaded: Record<string, { exports: any }> = {};
const define = (n: string, f: Function) => void (mods[n] = f);
const req = (n: string): any => {
  if (loaded[n]) return loaded[n].exports;
  const f = mods[n];
  if (!f) throw new Error('The app carries no module ' + n);
  const module = { exports: {} };
  loaded[n] = module;
  f(module.exports, req, module);
  return module.exports;
};
new Function('__define', '__require', FXP_JS)(define, req);
const text = '<feed><a x="1"><b>0123</b><b>2</b></a></feed>';
const options = { ignoreAttributes: false, attributeNamePrefix: '@', parseTagValue: false, isArray: () => false };
const carried = new (req('fast-xml-parser').XMLParser)(options).parse(text);
const installed = new (require('fast-xml-parser').XMLParser)(options).parse(text);
console.log(Object.keys(mods).length, 'modules');
console.log(JSON.stringify(carried));
console.log('equal:', JSON.stringify(carried) === JSON.stringify(installed));
