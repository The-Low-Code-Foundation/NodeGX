#!/usr/bin/env node
/**
 * Build the Digital Bricks lesson kit into the template:
 *
 *   templates/digital-bricks-training/noodl_modules/dbt-lesson/
 *     index.js         = banner + the DbtMarkdown bundle (esbuild, IIFE, minified)
 *                        + src/kit.js verbatim
 *     styles.css       = src/styles.css verbatim
 *     manifest.json    = written here, so `main` and the stylesheet cannot drift
 *     README.md        = src/README.md verbatim
 *     types/           = the node-kit types copy
 *
 *     node library/modules/dbt-lesson/build.mjs
 *
 * Deterministic: the same inputs give the same bytes (esbuild is; the banner
 * carries no date), so a `git diff` on the output is a real diff. TASK-L155
 * AC1 runs it twice and compares.
 *
 * THE THIRD-PARTY LIBRARIES COME FROM THE PRODUCT'S OWN REPO. OpenNoodl's
 * `node_modules` has react-markdown and remark-gfm but NOT rehype-sanitize or
 * dompurify (measured 2026-09-19), and the kit must render with the versions
 * the source renders with. `DBT_REPO` points at the checkout; the default is
 * the sibling directory. esbuild's `nodePaths` resolves the bare imports there.
 *
 * REACT IS A GLOBAL, NEVER BUNDLED. The `react-global` plugin below answers
 * `react` with the runtime's `React` and `react/jsx-runtime` with a four-line
 * shim over `React.createElement`. Bundling React would put a second copy in
 * the page (phase 69 P1: a kit node IS a node, on the page's React).
 */
import { build } from 'esbuild';
import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..', '..');
const DBT_REPO = process.env.DBT_REPO || resolve(repoRoot, '..', 'digital-bricks-training');
const out = join(repoRoot, 'templates', 'digital-bricks-training', 'noodl_modules', 'dbt-lesson');


/** The pure (node) entry of decode-named-character-reference, found in pnpm's store. */
function decodeEntry() {
  const store = join(DBT_REPO, 'node_modules', '.pnpm');
  const dir = readdirSync(store).find((d) => d.startsWith('decode-named-character-reference@'));
  if (!dir) throw new Error(`decode-named-character-reference not found under ${store}`);
  return join(store, dir, 'node_modules', 'decode-named-character-reference', 'index.js');
}

const JSX_SHIM = `
const R = globalThis.React;
export const Fragment = R.Fragment;
export function jsx(type, props, key) {
  const p = props ? Object.assign({}, props) : {};
  const children = p.children;
  delete p.children;
  if (key !== undefined) p.key = key;
  if (children === undefined) return R.createElement(type, p);
  return Array.isArray(children) ? R.createElement(type, p, ...children) : R.createElement(type, p, children);
}
export const jsxs = jsx;
export const jsxDEV = jsx;
`;

const reactGlobal = {
  name: 'react-global',
  setup(b) {
    b.onResolve({ filter: /^react$/ }, () => ({ path: 'react', namespace: 'react-global' }));
    b.onResolve({ filter: /^react\/jsx-(runtime|dev-runtime)$/ }, () => ({ path: 'jsx', namespace: 'react-global' }));
    b.onLoad({ filter: /.*/, namespace: 'react-global' }, (args) => ({
      contents: args.path === 'react' ? 'module.exports = globalThis.React;' : JSX_SHIM,
      loader: 'js'
    }));
  }
};

const bundle = await build({
  entryPoints: [join(here, 'src', 'markdown-entry.js')],
  bundle: true,
  format: 'iife',
  globalName: 'DbtMarkdown',
  minify: true,
  write: false,
  logLevel: 'warning',
  legalComments: 'none',
  platform: 'browser',
  target: ['es2020'],
  nodePaths: [join(DBT_REPO, 'node_modules')],
  // `decode-named-character-reference` ships a browser entry that does
  // `document.createElement('i')` AT LOAD, which throws in a server render —
  // and the runtime loads a kit's script in SSR too (kit-types: a kit reaches
  // a server render by declaring `browser`). Its node entry is a pure table.
  // Measured 2026-09-19: the first bundle threw `document is not defined`
  // under plain Node at exactly that line. The product repo is pnpm, so the
  // package lives in the store, not at the top of node_modules.
  alias: { 'decode-named-character-reference': decodeEntry() },
  define: { 'process.env.NODE_ENV': '"production"' },
  plugins: [reactGlobal]
});
const libs = bundle.outputFiles[0].text;
if (/createElement\s*=\s*function|__SECRET_INTERNALS/.test(libs)) {
  throw new Error('the bundle contains a React — the react-global plugin did not catch an import');
}
const kit = readFileSync(join(here, 'src', 'kit.js'), 'utf8');

/*
 * ── strings.en.json IS GENERATED, NEVER AUTHORED (TASK-L160 §2, corrected) ───
 *
 * The doc as written named an authored `strings.en.json` AND a `Data/Strings`
 * node holding the same 80 strings: two hand-written copies of one thing, free
 * to drift, which is the L86 failure inside the task that exists to give every
 * string one owner. Corrected: `src/kit.js`'s COMMON/COPY/TL_COPY remain the
 * only place English is WRITTEN, and everything else is derived from them.
 *
 *   kit.js  COMMON + COPY + TL_COPY
 *      └─▶ strings.en.json  ─▶  the Data/Strings node's JSON
 *
 * So the kit's fallback and the graph's table cannot start out disagreeing, and
 * L160 AC3b re-runs this to prove the committed file is not stale.
 */
function literalBlock(name) {
  const i = kit.indexOf(`var ${name} = {`);
  if (i < 0) throw new Error(`${name} not found in src/kit.js`);
  const j = kit.indexOf('{', i);
  let depth = 0;
  for (let k = j; k < kit.length; k++) {
    if (kit[k] === '{') depth++;
    else if (kit[k] === '}' && --depth === 0) return kit.slice(j, k + 1);
  }
  throw new Error(`${name} is unbalanced in src/kit.js`);
}

/** Pure data only: a function or a number in a copy map is a bug, not a string. */
function copyMap(name) {
  const value = (0, eval)('(' + literalBlock(name) + ')');
  (function assertStrings(o, path) {
    for (const k of Object.keys(o)) {
      const v = o[k];
      const q = path ? `${path}.${k}` : k;
      if (typeof v === 'string') continue;
      if (v && typeof v === 'object') assertStrings(v, q);
      else throw new Error(`${name}.${q} is ${typeof v}, not a string — a copy map holds words`);
    }
  })(value, '');
  return value;
}

const strings = {
  // JSON carries no comments, so the notice is a key. i18next reads named
  // namespaces only, so it is inert everywhere except a human's eyes.
  _generated: 'by library/modules/dbt-lesson/build.mjs from src/kit.js — do not hand-edit (TASK-L160 §2)',
  common: copyMap('COMMON'),
  lesson: copyMap('COPY'),
  timeline: copyMap('TL_COPY')
};
writeFileSync(join(here, 'strings.en.json'), JSON.stringify(strings, null, 2) + '\n');

/*
 * ── AND STRAIGHT INTO THE NODE, BECAUSE THE LAST HOP WAS THE MANUAL ONE ─────
 * TASK-L163. L160's chain stopped at `strings.en.json` and a human copied it
 * into the `Data/Strings` node by hand. That is one hop, and it is the hop where
 * "generated, do not hand-edit" stops being enforceable: a kit string added
 * without the paste reaches the kit's own fallback and never the graph's table,
 * so the two disagree and everything still renders. The node's own JSON says it
 * is generated; now it actually is.
 *
 * The file is rewritten with `indent: 2` and NO trailing newline, which is this
 * project's on-disk format — `JSON.stringify(…, 2)` round-trips these files
 * byte-for-byte, and writing `indent: 1` reindents every line and buries the
 * real change in a 258-line diff (recorded in sprint 46).
 */
const STRINGS_NODES = join(repoRoot, 'templates', 'digital-bricks-training', 'components', 'Data', 'Strings', 'nodes.json');
const stringsDoc = JSON.parse(readFileSync(STRINGS_NODES, 'utf8'));
const generatedNode = stringsDoc.nodes.find((n) => n.id === 'str_data');
if (!generatedNode) throw new Error(`no node "str_data" in ${STRINGS_NODES} — the generated half of the string table`);
generatedNode.parameters.json = JSON.stringify([strings], null, 2);
writeFileSync(STRINGS_NODES, JSON.stringify(stringsDoc, null, 2));


const banner =
  '/* dbt-lesson — the Digital Bricks Training lesson kit. GENERATED by\n' +
  '   library/modules/dbt-lesson/build.mjs: the first line is the DbtMarkdown bundle\n' +
  '   (react-markdown, rehype-sanitize, remark-gfm — MIT; dompurify — Apache-2.0/MPL-2.0),\n' +
  '   the rest is src/kit.js verbatim. Edit src/kit.js, not this file. React is the\n' +
  '   runtime\'s global and is not in here. */\n';

mkdirSync(join(out, 'types'), { recursive: true });
writeFileSync(join(out, 'index.js'), banner + libs + '\n' + kit);
copyFileSync(join(here, 'src', 'styles.css'), join(out, 'styles.css'));
copyFileSync(join(here, 'src', 'README.md'), join(out, 'README.md'));
copyFileSync(join(here, 'types', 'node-kit.d.ts'), join(out, 'types', 'node-kit.d.ts'));
writeFileSync(
  join(out, 'manifest.json'),
  JSON.stringify(
    {
      name: 'Digital Bricks lesson kit',
      main: 'index.js',
      dependencies: [],
      nodeKitTypes: '1.0.0',
      browser: { stylesheets: ['noodl_modules/dbt-lesson/styles.css'] },
      _note:
        'GENERATED by library/modules/dbt-lesson/build.mjs (TASK-L155, sprint 44). The stylesheet carries the product\'s token names as aliases of NodeGX\'s (TASK-L154 §2) and the lesson CSS lifted from globals.css; index.js carries the 19 section nodes and the Section dispatcher over one sanitised markdown path.'
    },
    null,
    2
  ) + '\n'
);
console.log(`wrote ${here}/strings.en.json (${Object.keys(strings.lesson).length} lesson + ${Object.keys(strings.timeline).length} timeline + ${Object.keys(strings.common).length} common keys)`);
console.log(`wrote ${out}/index.js (${(libs.length / 1024).toFixed(0)} KB libraries + ${(kit.length / 1024).toFixed(0)} KB kit)`);
