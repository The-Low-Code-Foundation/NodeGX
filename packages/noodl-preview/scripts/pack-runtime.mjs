#!/usr/bin/env node
/**
 * P112 OWN-011 — the viewer runtime an installed `@noodl/preview` renders with (P112-S9-NORUNTIME).
 *
 *   node scripts/pack-runtime.mjs            build a PRODUCTION runtime into dist/external/deploy (npm's prepack)
 *   node scripts/pack-runtime.mjs --remove   delete dist/external again (npm's postpack)
 *
 * In a checkout the preview reads the editor's build output (`noodl-editor/src/external/deploy`); an installed package has
 * no checkout around it, so `npm pack` and `npm publish` put a runtime of its own beside the bundle, where `loader.ts`
 * `EXTERNAL_DIR` looks second. It exists only between prepack and postpack, so a checkout never holds a second copy
 * that drifts from the one `npm run dev` keeps rebuilding.
 *
 * 🔴 Built here, never copied from the editor's folder. That folder holds whichever build ran last, and on any checkout
 * where `npm run dev` has run it is the DEVELOPMENT one: 17 MB, two-thirds of it a base64 source map of the whole viewer
 * source (EXP-017). The webpack config's `OUT_PATH` sends the production build here instead, and the build is then read
 * with EXP-017's own classifier — a development build stops the pack.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PKG = path.resolve(HERE, '..');
const OUT = path.join(PKG, 'dist', 'external');
const VIEWER = path.resolve(PKG, '../noodl-viewer-react');

if (process.argv.includes('--remove')) {
  rmSync(OUT, { recursive: true, force: true });
  process.exit(0);
}

if (!existsSync(path.join(VIEWER, 'webpack-configs', 'webpack.deploy.prod.js'))) {
  console.error(`pack-runtime: no viewer package at ${VIEWER} — @noodl/preview is packed from a checkout.`);
  process.exit(1);
}

rmSync(OUT, { recursive: true, force: true });
const started = Date.now();
const run = spawnSync('npx', ['webpack', '--config', 'webpack-configs/webpack.deploy.prod.js'], {
  cwd: VIEWER,
  stdio: ['ignore', 'inherit', 'inherit'],
  env: { ...process.env, OUT_PATH: OUT }
});
if (run.status !== 0) {
  console.error(`pack-runtime: the production viewer build failed (exit ${run.status ?? run.signal}).`);
  process.exit(1);
}
// Its paths are relative to a checkout (`nodegx deploy` reads it only there); installed, it names nothing.
rmSync(path.join(OUT, 'deploy', 'noodl.deploy.inputs.json'), { force: true });

// EXP-017's classifier, compiled from its source so there is one definition of "production".
const esbuild = (await import('esbuild')).default;
const scratch = mkdtempSync(path.join(tmpdir(), 'pack-runtime-'));
const classifier = path.join(scratch, 'viewerBuild.cjs');
const { outputFiles } = await esbuild.build({
  entryPoints: [path.join(PKG, 'src', 'viewerBuild.ts')],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  write: false
});
writeFileSync(classifier, outputFiles[0].text);
const { readViewerBuild, summariseViewerBuild } = createRequire(import.meta.url)(classifier);
rmSync(scratch, { recursive: true, force: true });

const reading = readViewerBuild(path.join(OUT, 'deploy', 'noodl.deploy.js'));
console.log(`pack-runtime: ${summariseViewerBuild(reading)} (${((Date.now() - started) / 1000).toFixed(1)} s)`);
if (reading.kind !== 'production') {
  rmSync(OUT, { recursive: true, force: true });
  console.error(`pack-runtime: refusing to pack a ${reading.kind} runtime — ${reading.reasons.join('; ')}`);
  process.exit(1);
}
