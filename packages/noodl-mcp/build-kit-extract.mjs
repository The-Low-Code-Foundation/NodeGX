/**
 * The kit reader (`dist/kit-extract.cjs`) and the list of files it was built from.
 *
 * Two callers: `build.mjs` (`npm run build`), and the server itself when it runs from a checkout and
 * finds the reader missing or older than one of its inputs (P109 ISL-014, Richard's ruling 2026-10-02:
 * "Build it automatically"). The server cannot call esbuild in-process — `catalogIndex()` is synchronous
 * and esbuild's synchronous API refuses the plugin the extractor's build needs — so it spawns this file:
 *
 *     node build-kit-extract.mjs [outfile]
 *
 * 🔴 **The input list is the staleness rule.** The reader bundles the runtime's whole node library
 * (~475 files), not just `src/kitExtract/entry.js`, so a reader newer than `entry.js` can still miss a
 * built-in type added since. esbuild's metafile names every file it read; it is written beside the
 * reader as `kit-extract.inputs.json`, and a reader older than any file on that list is out of date
 * (`src/kitExtract/extract.ts`, `kitExtractStaleness`).
 *
 * Both files are written to a temporary name and renamed, so a server spawning the reader while
 * another rebuilds it reads a whole file, old or new — twelve installed servers share the primary's
 * `dist/`. The input list lands first, so a reader is never newer than the list that describes it.
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import esbuild from 'esbuild';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { extractorBuildOptions } = require('../../scripts/node-catalog/lib/bundle.js');

/** Beside the reader: the files it was built from, relative to this package. */
export const KIT_EXTRACT_INPUTS = 'kit-extract.inputs.json';

export async function buildKitExtract(outfile = path.join(here, 'dist', 'kit-extract.cjs'), logLevel = 'info') {
  fs.mkdirSync(path.dirname(outfile), { recursive: true });
  const suffix = `.${process.pid}.tmp`;
  const result = await esbuild.build({
    ...extractorBuildOptions(path.join(here, 'src', 'kitExtract', 'entry.js'), outfile + suffix),
    absWorkingDir: here,
    target: 'node18',
    metafile: true,
    logLevel
  });
  // A plugin's own namespace (`type-stub:…`) is not a file; everything else is, relative to `here`.
  const inputs = Object.keys(result.metafile.inputs)
    .filter((p) => !/^[a-z-]+:/.test(p))
    .sort();
  const listFile = path.join(path.dirname(outfile), KIT_EXTRACT_INPUTS);
  fs.writeFileSync(listFile + suffix, JSON.stringify({ inputs }, null, 1) + '\n');
  fs.renameSync(listFile + suffix, listFile);
  fs.renameSync(outfile + suffix, outfile);
  return { outfile, inputs: inputs.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  buildKitExtract(process.argv[2] ? path.resolve(process.argv[2]) : undefined, 'silent').then(
    (r) => process.stdout.write(JSON.stringify(r) + '\n'),
    (err) => {
      process.stderr.write(String(err && err.message ? err.message : err) + '\n');
      process.exit(1);
    }
  );
}
