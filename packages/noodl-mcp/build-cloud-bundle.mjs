/**
 * The headless cloud-function bundler (`dist/cloud-bundle.cjs`), built from `src/cloud/bundleEntry.js`.
 *
 * Two callers: `build.mjs` (`npm run build`), and a spec that builds it into a temp path so it grades the
 * source and never the shared `dist/` (P109 ISL-042, D84):
 *
 *     node build-cloud-bundle.mjs [outfile]
 */
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
