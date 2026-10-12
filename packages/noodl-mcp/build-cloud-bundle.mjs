/**
 * The headless cloud-function bundler (`dist/cloud-bundle.cjs`), built from `src/cloud/bundleEntry.js`.
 *
 * Two callers: `build.mjs` (`npm run build`), and a spec that builds it into a temp path so it grades the
 * source and never the shared `dist/` (P109 ISL-042, D84):
 *
 *     node build-cloud-bundle.mjs [outfile]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import esbuild from 'esbuild';

import { common } from './build-common.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));

/**
 * HLS-013 — the headless cloud-function bundler, bundled as its own artifact.
 *
 * A second bundle rather than part of the server for the reason its own header
 * gives: it reaches `ProjectModel`, whose import chain does not belong in a
 * server bundle (it drags renderer view modules in) and whose singletons must
 * not outlive one build. `dist/` is where it has to land — `files: ["bin","dist"]`
 * is what ships.
 */
export async function buildCloudBundle(outfile = path.join(here, 'dist', 'cloud-bundle.cjs'), logLevel = common.logLevel) {
  await esbuild.build({
    ...common,
    logLevel,
    absWorkingDir: here,
    entryPoints: [path.join(here, 'src', 'cloud', 'bundleEntry.js')],
    target: 'node18',
    outfile,
    // The editor sources it reaches import CSS-module and asset paths through
    // modules that are never executed on this path; keep esbuild from trying to
    // resolve them into a Node bundle.
    loader: { '.css': 'empty', '.scss': 'empty', '.svg': 'empty', '.png': 'empty' }
  });
  /**
   * P112-S13-CLOUDDEPLOY (register row C68, the preview's `build.mjs` has the same fix). `@noodl/platform-node`'s
   * `getAppPath()` throws at import unless a `package.json` is in `process.cwd()` or beside the bundle, and the
   * bundler is spawned with the MCP server's own working directory. Under `npx`, or a packaged editor's sidecar,
   * that is the person's project folder, which is not an npm package, so `deploy_cloud_functions` failed on every
   * one of them (installed 0.3.0 and `@nodegx/mcp@0.1.0` both). One file beside the bundle makes `__dirname`
   * answer, whoever spawns it from wherever. Named apart from the package so no tool reads it as a second copy.
   */
  const pkg = JSON.parse(readFileSync(path.join(here, 'package.json'), 'utf8'));
  writeFileSync(
    path.join(path.dirname(outfile), 'package.json'),
    JSON.stringify(
      {
        name: 'nodegx-mcp-bundles',
        version: pkg.version,
        private: true,
        description: 'Build metadata for the bundled CLIs beside it. See build-cloud-bundle.mjs: @noodl/platform reads it.'
      },
      null,
      2
    ) + '\n'
  );
  return { outfile };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  buildCloudBundle(process.argv[2] ? path.resolve(process.argv[2]) : undefined, 'silent').then(
    (r) => process.stdout.write(JSON.stringify(r) + '\n'),
    (err) => {
      process.stderr.write(String(err && err.message ? err.message : err) + '\n');
      process.exit(1);
    }
  );
}
