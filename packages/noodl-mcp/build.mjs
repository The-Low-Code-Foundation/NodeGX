/**
 * Bundles the `noodl-mcp` server into a self-contained CJS executable.
 *
 * The pure format engines (io/, schemas/, validation/) are bundled from
 * noodl-editor sources, and the enriched node catalog JSON is inlined — so the
 * artifact runs standalone with only Node ≥ 18 present, and there is a single
 * source of truth for the format logic (no duplication).
 *
 * ⚠️ **`nodegx-observe` is not built here any more.** It lives in
 * `packages/nodegx-observe` (moved 2026-08-02, Richard's call). The two never
 * shared a code path; they shared this package for packaging convenience, and
 * the spec's standing warning is that the two must not be *confused* — which one
 * `npm install` producing both worked directly against.
 */
import { copyFileSync } from 'node:fs';
import path from 'node:path';

import esbuild from 'esbuild';

import { common } from './build-common.mjs';
import { buildCloudBundle } from './build-cloud-bundle.mjs';
import { buildKitExtract } from './build-kit-extract.mjs';


await esbuild.build({
  ...common,
  entryPoints: ['src/cli.ts'],
  target: 'node18',
  outfile: 'dist/noodl-mcp.cjs'
});

/**
 * HLS-008 — the node catalog travels with the server, because `export_react` reads it.
 *
 * 🔴 **This is not bookkeeping; without it the tool is dead in the shipped app.**
 * `@nodegx/export`'s `loadCatalog()` reads `node-catalog.json` from disk, trying
 * `__dirname/node-catalog.json` (the packaged copy) then
 * `__dirname/../../noodl-types/src/node-catalog.json` (the in-repo source). Bundled into
 * `dist/noodl-mcp.cjs`, `__dirname` is this package's `dist/` — and the in-repo fallback happens
 * to resolve, because `packages/noodl-mcp/dist` sits at the same depth as
 * `packages/nodegx-export/src`. **In a checkout it therefore works by coincidence.**
 *
 * In the packaged app it does not. `noodl-editor`'s `extraResources` copies exactly one file —
 * `dist/noodl-mcp.cjs` → `Resources/noodl-mcp/noodl-mcp.cjs` — so `__dirname` is a directory
 * holding one `.cjs` and there is no `packages/` above it. Both candidates miss and `loadCatalog()`
 * throws, naming two paths that mean nothing to the person reading it.
 *
 * So the copy is made here, into the one directory that is both `__dirname` in a checkout and the
 * thing `extraResources` ships. **`extraResources` needs a second entry for it** — the two are
 * asserted to agree by `tests/hls008ExportReact.test.ts`, because a build step and a packaging
 * manifest that disagree fail only in a signed build nobody runs in CI.
 */
copyFileSync('../noodl-types/src/node-catalog.json', 'dist/node-catalog.json');

// HLS-013 — the headless cloud-function bundler. P109 ISL-042: built by `build-cloud-bundle.mjs`, which a spec
// also runs into a temp path.
await buildCloudBundle(path.resolve('dist/cloud-bundle.cjs'));

/**
 * CN-003 — the headless kit extractor, bundled as its own artifact.
 *
 * It is a second bundle rather than part of the server because it is *spawned*:
 * a kit's `index.js` is project code that runs at import time, and a child
 * process is what keeps a throwing or register-mutating kit away from the
 * server. See `src/kitExtract/entry.js`.
 *
 * 🔴 It must land in `dist/`. `scripts/node-catalog/` is where its sibling (the
 * built-in catalog generator) lives, and that directory is outside every shipped
 * package's `files`/`build.files` — an extractor there works in a checkout and
 * is missing from the packaged app.
 *
 * The build options come from the catalog generator's own bundler so the two
 * extractors cannot drift into observing different node libraries. Importing
 * from `scripts/` is fine *here*: this runs at build time in the checkout, and
 * esbuild inlines what it reaches.
 */
//
// P109 ISL-014: the build itself lives in `build-kit-extract.mjs`, which a server running from a
// checkout also spawns when the reader is missing or older than one of its inputs; it writes the
// input list (`dist/kit-extract.inputs.json`) that decides "older".
await buildKitExtract(path.resolve('dist/kit-extract.cjs'));
