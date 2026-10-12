/**
 * Bundles the live-preview harness into a single self-contained CJS executable.
 *
 * Unlike the MCP server (which only needs the pure format engines), this harness
 * runs the editor's *real* export pipeline headlessly — `ProjectModel`,
 * `NodeLibrary`, `utils/exporter` and the deploy `HtmlProcessor` — plus the
 * browser runtime's node register, which is what supplies `NodeLibrary` with
 * node types. All of that is Electron-free once four things are shimmed, and
 * every shim below exists for a reason that bites immediately if removed:
 *
 *   1. `@noodl/platform` must be bound to the Node implementation. Handled at
 *      runtime by importing `@noodl/platform-node` first (see src/headless.ts) —
 *      several editor modules read `platform.getUserDataPath()` at module scope.
 *   2. `bugtracker` hijacks `console.log` and appends to a log file under the
 *      user data dir at import time. Stubbed here: a CLI must not do that.
 *   3. `noodl-viewer-react/src/types.ts` exports TS types only, but a few node
 *      modules import identifiers from it that exist as runtime globals
 *      (`Noodl.*`), which esbuild cannot elide cross-file. Replaced with noop
 *      proxies — none of it runs during node registration. (Same plugin the
 *      node-catalog generator uses; see scripts/node-catalog/generate.js.)
 *   4. Asset imports (css/svg/png/fonts) from the viewer's node modules are
 *      loaded as `empty` — registration is metadata-only and never renders.
 *
 * Note the `alias` map mirrors noodl-editor/tsconfig.json's `paths`. Anything
 * added there that the export path touches must be added here too, otherwise
 * the bundle fails loudly at build time (which is the good failure mode).
 */
import path from 'path';
import { readFileSync, renameSync, writeFileSync } from 'fs';
import { readFile, writeFile } from 'fs/promises';
import { fileURLToPath } from 'url';

import esbuild from 'esbuild';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..');
const EDITOR_SRC = path.join(REPO_ROOT, 'packages/noodl-editor/src/editor/src');

/** Modules replaced wholesale, by the tail of their import specifier. */
const stubs = {
  bugtracker: 'exports.bugtracker = { identify() {}, track() {}, debug() {} };'
};

const shimPlugin = {
  name: 'noodl-preview-shims',
  setup(build) {
    // (2) bugtracker — see header.
    build.onResolve({ filter: /(^|\/)bugtracker$/ }, () => ({ path: 'bugtracker', namespace: 'preview-stub' }));

    // (3) viewer-react type-only module imported for runtime identifiers.
    const typeModule = path.join(REPO_ROOT, 'packages/noodl-viewer-react/src/types.ts');
    build.onResolve({ filter: /^\.\.?\/.*types$/ }, (args) =>
      path.resolve(args.resolveDir, args.path) + '.ts' === typeModule
        ? { path: 'viewer-types', namespace: 'preview-stub' }
        : null
    );

    build.onLoad({ filter: /.*/, namespace: 'preview-stub' }, (args) => ({
      contents:
        stubs[args.path] ??
        'const noop = new Proxy(function () {}, { get: () => noop, apply: () => noop });\n' +
          'module.exports = new Proxy({}, { get: () => noop });',
      loader: 'js'
    }));
  }
};

/**
 * HLS-015 — two entry points, one configuration.
 *
 * `noodl-preview` renders a project in a browser and reloads it; `nodegx-deploy` writes the
 * folder a deploy produces. They are different programs and they need **identical** shims: the
 * deploy engine drags in the same `ProjectModel`, the same `NodeLibrary` and the same viewer node
 * register, so a second build script would be a second copy of the four shims below, drifting
 * from the day it was written.
 */
const ENTRIES = [
  { entry: 'src/cli.ts', out: 'dist/noodl-preview.cjs' },
  { entry: 'src/deploy-cli.ts', out: 'dist/nodegx-deploy.cjs' }
];

const shared = {
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  sourcemap: false,
  // chokidar loads the optional native `fsevents` binding on macOS, which
  // cannot be bundled. It is a declared dependency, so leaving it external is
  // both correct and the only thing that works.
  external: ['chokidar'],
  alias: {
    '@noodl/runtime': path.join(REPO_ROOT, 'packages/noodl-runtime'),
    '@noodl-models': path.join(EDITOR_SRC, 'models'),
    '@noodl-utils': path.join(EDITOR_SRC, 'utils'),
    '@noodl-constants': path.join(EDITOR_SRC, 'constants'),
    '@noodl-store': path.join(EDITOR_SRC, 'store'),
    '@noodl-core-ui': path.join(REPO_ROOT, 'packages/noodl-core-ui/src')
  },
  // (4) asset imports from viewer node modules.
  loader: {
    '.css': 'empty',
    '.svg': 'empty',
    '.png': 'empty',
    '.jpg': 'empty',
    '.gif': 'empty',
    '.woff': 'empty',
    '.woff2': 'empty'
  },
  plugins: [shimPlugin],
  logLevel: 'warning'
};

/**
 * P109-S5 — each CLI bundle is written with the list of files it was built from beside it
 * (`dist/nodegx-deploy.inputs.json`), the ISL-014 rule for the MCP's kit reader: a bundle older than any
 * file on its list is out of date. `nodegx deploy` reads the list (`nodegx-export/src/cli/deployEngine.ts`),
 * and in a checkout rebuilds a stale engine with `node build.mjs --deploy-only` before it runs it — a
 * gitignored engine bundled weeks before the node library refused valid projects, blaming them.
 *
 * Both files go to a temporary name and are renamed, the list first, so a deploy that starts while
 * another rebuilds reads a whole engine, and never one newer than the list that describes it.
 */
const DEPLOY_ONLY = process.argv.includes('--deploy-only');
for (const { entry, out } of DEPLOY_ONLY ? ENTRIES.filter((e) => e.out === 'dist/nodegx-deploy.cjs') : ENTRIES) {
  const outfile = path.join(HERE, out);
  const suffix = `.${process.pid}.tmp`;
  const result = await esbuild.build({
    ...shared,
    entryPoints: [path.join(HERE, entry)],
    outfile: outfile + suffix,
    absWorkingDir: HERE,
    metafile: true
  });
  // A plugin's own namespace (`preview-stub:…`) is not a file; everything else is, relative to this package.
  const inputs = Object.keys(result.metafile.inputs)
    .filter((p) => !/^[a-z-]+:/.test(p))
    .sort();
  const listFile = outfile.replace(/\.cjs$/, '.inputs.json');
  writeFileSync(listFile + suffix, JSON.stringify({ inputs }, null, 1) + '\n');
  renameSync(listFile + suffix, listFile);
  renameSync(outfile + suffix, outfile);
}

/**
 * P112 OWN-004 — the in-page preview: the same export, run by a page on files it holds in memory.
 *
 * The editor modules the export reaches are browser code (the editor runs in a renderer), except
 * for seven imports of Node built-ins on paths the export never takes: the kit scanner and kit
 * scaffold (`@nodegx/module-inject`, `@nodegx/kit-scaffold`, via `projectmodules.ts`; the scan
 * returns before touching `fs` when there is no project folder, and a page has none), the format
 * detector, `verifyJson`, `utils.ts` and `bugtracker` (stubbed as above). Each built-in becomes a
 * module whose every function **throws** "not available in a page" when called — not a silent
 * no-op — so the day the export does reach one, the page says which.
 *
 * Node's `Buffer` is the `buffer` package, injected (`src/inPage/buffer.ts` says who needs it).
 *
 * No viewer node register and no runtime: the page's own deploy runtime supplies the node library
 * (see `src/inPage/index.ts`), so this bundle carries only the export.
 */
const NODE_BUILTINS = /^(node:)?(fs|path|os|vm|child_process|http|https)$/;
const inPagePlugin = {
  name: 'noodl-preview-in-page',
  setup(build) {
    build.onResolve({ filter: NODE_BUILTINS }, (args) => ({ path: args.path, namespace: 'in-page-builtin' }));
    build.onLoad({ filter: /.*/, namespace: 'in-page-builtin' }, (args) => ({
      contents:
        `const fail = (name) => () => { throw new Error('${args.path}.' + String(name) + ' is not available in a page (noodl-preview in-page build).'); };\n` +
        'module.exports = new Proxy({}, { get: (_, name) => (name === "__esModule" ? false : fail(name)) });',
      loader: 'js'
    }));
  }
};

if (!DEPLOY_ONLY) await esbuild.build({
  ...shared,
  platform: 'browser',
  target: 'es2020',
  format: 'iife',
  globalName: 'NodegxPreview',
  external: [],
  // NOODL_PREVIEW_MINIFY=0 for a readable stack in the browser.
  minify: process.env.NOODL_PREVIEW_MINIFY !== '0',
  define: { 'process.env.NODE_ENV': '"production"', global: 'globalThis' },
  plugins: [shimPlugin, inPagePlugin],
  inject: [path.join(HERE, 'src/inPage/buffer.ts')],
  entryPoints: [path.join(HERE, 'src/inPage/index.ts')],
  outfile: path.join(HERE, 'dist/browser/noodl-preview-in-page.js')
});

/**
 * P112 OWN-003 — THE GRAPH TARGET: the real engine with a way in, for a page (`src/inPage/graphTarget.ts`).
 *
 * The runtime test helper (`noodl-runtime/test/helpers/node-spec-target.ts`) — the reference that records the graph
 * scenarios' traces — bundled for a browser with `@noodl/runtime`, the viewer's picker nodes it lists and
 * `@nodegx/node-spec`'s browser entry, as one script with a global (`NodegxGraphTarget`). Four things a page lacks or
 * must not have are replaced, each named here because each bites at once if dropped:
 *
 *   1. `async_hooks` — `src/inPage/asyncLocalStorage.ts` (what it can and cannot attribute is written there).
 *   2. `buffer` — the helper takes Node's `File` from it; the page's own `File` is handed back.
 *   3. `jsdom` — the helper's PERSON half renders a visual node into a jsdom page. A graph scenario mounts no node on a
 *      page, so a constructor that throws, naming this file, is the honest stand-in.
 *   4. the package's `/node` entry — the helper imports `nodegx-node-spec/src` (the file loaders over `fs`); the page
 *      gets `src/browser.ts`, which has everything else.
 *
 * The viewer's node modules are the helper's four lists, read from its source at build time and imported STATICALLY in
 * a generated module (`nodegx-viewer-node-modules`) — so the page registers exactly what Node does, and a module added
 * to a list is in the next build. ESM order matters: a visual node's module reads the `Noodl` global when it loads,
 * so the generated module's first import (`nodegx-viewer-globals`) calls the helper's `ensureAppGlobals()` before any
 * of them evaluates. The Node built-ins and the asset loaders are the in-page build's (above), for the same reasons.
 *
 * The gate is `npm run graph-target-check`: the 85 graph scenarios on this bundle in headless Chrome, graded against
 * the traces the Node helper recorded.
 */
const HELPER = path.join(REPO_ROOT, 'packages/noodl-runtime/test/helpers/node-spec-target.ts');
const VIEWER_NODES_DIR = path.join(REPO_ROOT, 'packages/noodl-viewer-react/src/nodes');
function viewerNodeLists() {
  const src = readFileSync(HELPER, 'utf8');
  const list = (name) => {
    const m = src.match(new RegExp(`export const ${name} = \\[([^\\]]*)\\] as const`));
    if (!m) throw new Error(`node-spec-target.ts: no ${name} list — the graph-target build reads the helper's four lists`);
    return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
  };
  return {
    stdLibrary: list('VIEWER_NODES').map((f) => path.join(VIEWER_NODES_DIR, 'std-library', f)),
    navigation: list('VIEWER_NAVIGATION_NODES').map((f) => path.join(VIEWER_NODES_DIR, 'navigation', f)),
    visual: list('VIEWER_VISUAL_NODES').map((f) => path.join(VIEWER_NODES_DIR, f)),
    runtimeRegistered: list('VIEWER_REGISTERED_RUNTIME_NODES').map((f) => path.join(REPO_ROOT, 'packages/noodl-runtime/src/nodes/std-library', f))
  };
}
const graphTargetPlugin = {
  name: 'noodl-graph-target',
  setup(build) {
    build.onResolve({ filter: /^(node:)?async_hooks$/ }, () => ({ path: path.join(HERE, 'src/inPage/asyncLocalStorage.ts') }));
    build.onResolve({ filter: /^(node:)?(buffer|jsdom)$/ }, (args) => ({ path: args.path.replace(/^node:/, ''), namespace: 'graph-target-stub' }));
    build.onLoad({ filter: /.*/, namespace: 'graph-target-stub' }, (args) => ({
      contents:
        args.path === 'buffer'
          ? 'exports.File = globalThis.File;'
          : 'exports.JSDOM = class { constructor() { throw new Error("jsdom is not available in a page (noodl-graph-target): a graph scenario mounts no node on a page"); } };',
      loader: 'js'
    }));
    build.onResolve({ filter: /(^|\/)nodegx-node-spec\/src$/ }, () => ({ path: path.join(REPO_ROOT, 'packages/nodegx-node-spec/src/browser.ts') }));
    build.onResolve({ filter: /^nodegx-viewer-globals$/ }, () => ({ path: 'nodegx-viewer-globals', namespace: 'graph-target-globals' }));
    build.onLoad({ filter: /.*/, namespace: 'graph-target-globals' }, () => ({
      contents: `import { ensureAppGlobals } from ${JSON.stringify(HELPER)};\nensureAppGlobals();`,
      loader: 'js',
      resolveDir: REPO_ROOT
    }));
    build.onResolve({ filter: /^nodegx-viewer-node-modules$/ }, () => ({ path: 'nodegx-viewer-node-modules', namespace: 'graph-target-viewer' }));
    build.onLoad({ filter: /.*/, namespace: 'graph-target-viewer' }, () => {
      const lines = [`import 'nodegx-viewer-globals';`];
      const names = {};
      let i = 0;
      for (const [key, files] of Object.entries(viewerNodeLists())) {
        names[key] = files.map((f) => {
          const id = `m${i++}`;
          lines.push(`import * as ${id} from ${JSON.stringify(f)};`);
          return id;
        });
      }
      lines.push(`export default { ${Object.entries(names).map(([k, ids]) => `${k}: [${ids.join(', ')}]`).join(', ')} };`);
      return { contents: lines.join('\n'), loader: 'js', resolveDir: REPO_ROOT };
    });
  }
};

if (!DEPLOY_ONLY) await esbuild.build({
  ...shared,
  platform: 'browser',
  target: 'es2020',
  format: 'iife',
  globalName: 'NodegxGraphTarget',
  external: [],
  minify: process.env.NOODL_PREVIEW_MINIFY !== '0',
  define: { 'process.env.NODE_ENV': '"production"', global: 'globalThis' },
  plugins: [shimPlugin, graphTargetPlugin, inPagePlugin],
  entryPoints: [path.join(HERE, 'src/inPage/graphTarget.ts')],
  outfile: path.join(HERE, 'dist/browser/noodl-graph-target.js')
});

/**
 * HLS-015 / register row C68 — the bundle needs a `package.json` beside it, and that is not
 * housekeeping.
 *
 * `@noodl/platform-node`'s `getAppPath()` looks for a `package.json` in `process.cwd()` and then
 * in its own `__dirname`, and **throws a bare string at module scope** when it finds neither:
 *
 *   [@noodl/platform] Cannot find package.json, to get the build version. (…/dist)
 *
 * That happens in the `PlatformNode` constructor, which runs on import, before any code in this
 * package has a chance to catch anything — and a thrown string has no `stack`, so a caller that
 * reports `error.stack` reports `undefined`. Running the bundle from any folder that is not itself
 * an npm package (`/tmp`, a project directory, `~`) hits it every time, which is the normal case
 * for a CLI. One file makes `__dirname` answer, whatever the caller's working directory is.
 *
 * ⚠️ It does **not** make `getAppPath()` right — `process.cwd()` still wins when the caller happens
 * to stand in a package. That is why the deploy states its runtime folder explicitly through
 * `setExternalFolderPath()` instead of trusting this.
 */
const pkg = JSON.parse(await readFile(path.join(HERE, 'package.json'), 'utf8'));
await writeFile(
  path.join(HERE, 'dist', 'package.json'),
  JSON.stringify(
    {
      name: pkg.name,
      version: pkg.version,
      private: true,
      description: 'Build metadata for the bundled CLIs. See build.mjs — @noodl/platform reads it.'
    },
    null,
    2
  ) + '\n'
);
