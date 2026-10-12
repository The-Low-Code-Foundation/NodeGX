/**
 * P109-S39-STALECLIBUNDLE — in a checkout, `nodegx` says when it is older than its own source.
 *
 * The bin is `dist/cli.mjs`, a gitignored esbuild bundle. On 2026-10-10 the primary checkout's was dated 2026-10-05, so
 * five days of `src/cli` changes did not run, the deploy engine's own staleness check (P109-S5) among them. `build.mjs`
 * writes the files the bundle read beside it (`dist/cli.inputs.json`), and the bin reads that list on start.
 *
 * A warning, not a rebuild: the bin cannot replace itself while it runs, and a rebuild would bake whatever is uncommitted
 * in the exporter into the command everyone in the checkout runs. Silent when there is no list beside the running file
 * (running from source, or a bundle built before the list existed) and when no `build.mjs` sits above it (an install).
 *
 * @module nodegx-export/cli/cliBundle
 */
import * as fs from 'fs';
import * as path from 'path';

import { bundleStaleness } from './deployEngine';

/** Written by `build.mjs` beside `dist/cli.mjs`. */
export const CLI_INPUTS = 'cli.inputs.json';

/** The sentence for a bin older than its source, or null. `script` is the file running (`process.argv[1]`). */
export function cliBundleWarning(script: string | undefined): string | null {
  if (!script) return null;
  let bundle: string;
  try {
    bundle = fs.realpathSync(script);
  } catch {
    return null;
  }
  const dist = path.dirname(bundle);
  const packageRoot = path.dirname(dist);
  const listFile = path.join(dist, CLI_INPUTS);
  if (!fs.existsSync(listFile) || !fs.existsSync(path.join(packageRoot, 'build.mjs'))) return null;
  const why = bundleStaleness(bundle, listFile, packageRoot);
  if (why === null) return null;
  return (
    `Warning: this nodegx command (${bundle}) is older than its source (${why}), so a change in this checkout may\n` +
    'not run. Rebuild it with:\n' +
    '  npm run build --workspace @nodegx/export\n'
  );
}
