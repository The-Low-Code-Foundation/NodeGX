#!/usr/bin/env node
/**
 * P112 OWN-014 — the render harness an npm install of `@nodegx/mcp` renders with.
 *
 *   node build-render-harness.mjs            bundle the harness + build a PRODUCTION viewer into dist/ (npm's prepack)
 *   node build-render-harness.mjs --remove   delete them again (npm's postpack)
 *
 * In a checkout `render_report` runs `scripts/devtools/measure-from-disk.js`; in the packaged editor, the copy inside
 * `app.asar/render-harness/` (UNI-012). An npm install had neither, so `render_report` refused and a stranger's agent
 * built blind. This writes the packaged editor's layout one level down, so `harness-paths.js` needs no new rule:
 *
 *   dist/render-harness/{measure-from-disk,render-from-disk,drive-steps}.js   bundled (render-report, harness-paths,
 *                                                                              @nodegx/render-measure, module-inject inlined)
 *   dist/render-harness/data/{node-catalog.json,node-catalog-enriched.json,tokens.ts}
 *   dist/src/external/viewer/                                                 PACKAGED_ROOT/src/external/viewer
 *
 * `ws` is a computed `require` (harness-paths' WS_MODULE), which esbuild cannot inline, so the package itself is copied
 * to `dist/render-harness/node_modules/ws` (MIT, its LICENSE with it), where plain resolution from the harness finds it.
 * Vendored rather than declared, so the tarball needs no install step to render and the shared lockfile is untouched.
 * The three entries keep their file names because they find each other by name: render-report spawns
 * `render-from-disk.js` beside itself, and `resolveDriveCli` takes `drive-steps.js` beside the harness.
 *
 * 🔴 Like the preview's `pack-runtime.mjs`, it exists only between prepack and postpack: a checkout never holds a second
 * copy that drifts, and the checkout candidates come first in `resolveRenderCli` anyway. The viewer is BUILT here,
 * never copied from `noodl-editor/src/external/viewer`, which holds whichever build ran last (the 17 MB dev one on any
 * checkout where `npm run dev` has run, EXP-017); a non-production build stops the pack.
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import esbuild from 'esbuild';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');
const HARNESS_OUT = path.join(HERE, 'dist', 'render-harness');
const EXTERNAL_OUT = path.join(HERE, 'dist', 'src');
const VIEWER_PKG = path.join(REPO, 'packages', 'noodl-viewer-react');

if (process.argv.includes('--remove')) {
  rmSync(HARNESS_OUT, { recursive: true, force: true });
  rmSync(EXTERNAL_OUT, { recursive: true, force: true });
  process.exit(0);
}

const started = Date.now();
rmSync(HARNESS_OUT, { recursive: true, force: true });
rmSync(EXTERNAL_OUT, { recursive: true, force: true });

// 1. The harness: the same three entries the editor's packaging ships, each bundled on its own.
const ENTRIES = ['measure-from-disk', 'render-from-disk', 'drive-steps'];
await esbuild.build({
  entryPoints: Object.fromEntries(ENTRIES.map((n) => [n, path.join(REPO, 'scripts', 'devtools', `${n}.js`)])),
  outdir: HARNESS_OUT,
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node18',
  external: ['ws', 'bufferutil', 'utf-8-validate'],
  logLevel: 'warning'
});

// 2. Its data, from the files the checkout resolves (UNI-012's gate pins the editor's copy of the same list).
const DATA = path.join(HARNESS_OUT, 'data');
mkdirSync(DATA, { recursive: true });
for (const [from, name] of [
  ['packages/noodl-types/src/node-catalog.json', 'node-catalog.json'],
  ['packages/noodl-types/src/node-catalog-enriched.json', 'node-catalog-enriched.json'],
  ['packages/nodegx-project-contract/tokens.ts', 'tokens.ts']
]) {
  copyFileSync(path.join(REPO, from), path.join(DATA, name));
}
const WS = path.dirname(createRequire(path.join(REPO, 'scripts', 'devtools', 'render-report.js')).resolve('ws/package.json'));
cpSync(WS, path.join(HARNESS_OUT, 'node_modules', 'ws'), { recursive: true });

// 3. A production viewer, where harness-paths' packaged candidate looks (`<harness>/../src/external/viewer`).
if (!existsSync(path.join(VIEWER_PKG, 'webpack-configs', 'webpack.viewer.prod.js'))) {
  console.error(`build-render-harness: no viewer package at ${VIEWER_PKG} — @nodegx/mcp is packed from a checkout.`);
  process.exit(1);
}
const external = path.join(EXTERNAL_OUT, 'external');
const run = spawnSync('npx', ['webpack', '--config', 'webpack-configs/webpack.viewer.prod.js'], {
  cwd: VIEWER_PKG,
  stdio: ['ignore', 'inherit', 'inherit'],
  env: { ...process.env, OUT_PATH: external }
});
if (run.status !== 0) {
  console.error(`build-render-harness: the production viewer build failed (exit ${run.status ?? run.signal}).`);
  process.exit(1);
}
rmSync(path.join(external, 'viewer', 'noodl.viewer.inputs.json'), { force: true });

// EXP-017's classifier, compiled from its source so there is one definition of "production".
const scratch = mkdtempSync(path.join(tmpdir(), 'build-render-harness-'));
const classifier = path.join(scratch, 'viewerBuild.cjs');
const { outputFiles } = await esbuild.build({
  entryPoints: [path.join(REPO, 'packages', 'noodl-preview', 'src', 'viewerBuild.ts')],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  write: false
});
writeFileSync(classifier, outputFiles[0].text);
const { readViewerBuild, summariseViewerBuild } = createRequire(import.meta.url)(classifier);
rmSync(scratch, { recursive: true, force: true });

const reading = readViewerBuild(path.join(external, 'viewer', 'noodl.viewer.js'));
console.log(`build-render-harness: ${summariseViewerBuild(reading)} (${((Date.now() - started) / 1000).toFixed(1)} s)`);
if (reading.kind !== 'production') {
  rmSync(HARNESS_OUT, { recursive: true, force: true });
  rmSync(EXTERNAL_OUT, { recursive: true, force: true });
  console.error(`build-render-harness: refusing to pack a ${reading.kind} viewer — ${reading.reasons.join('; ')}`);
  process.exit(1);
}
