/**
 * Loaded FIRST by a child process whose stdout is its answer: one JSON document the parent parses whole.
 *
 * 🔴 Anything that logs while the child works would corrupt that answer. Loading a project logs (`applyPatches`
 * prints "[NDA-017] migrated …" with `console.info`), and a kit's `index.js` is project code that can log at import.
 * One such line made every headless deploy of that project fail with "The cloud-function bundler produced output
 * that was not JSON" (P78 D84, measured on TPL-011's spike, 2026-09-26; re-measured P109 ISL-042, 2026-10-11, on the
 * cloud bundler and the kit extractor both). So `console.log`, `info` and `debug` go to stderr, where the parent
 * keeps them for a failure. `warn` and `error` already do.
 *
 * Used by `cloud/bundleEntry.js` (`dist/cloud-bundle.cjs`) and `kitExtract/entry.js` (`dist/kit-extract.cjs`).
 */
'use strict';

const util = require('util');

const toStderr = (...args) => process.stderr.write(util.format(...args) + '\n');
console.log = toStderr;
console.info = toStderr;
console.debug = toStderr;
