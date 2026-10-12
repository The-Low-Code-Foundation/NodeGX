/**
 * Injected by `build.mjs` (esbuild `inject`) wherever the in-page bundle names a free `Buffer`.
 *
 * The exporter's xxhash64 (`utils/exporter/hash/xxhash64`) loads its WebAssembly with `Buffer.from` when
 * its module loads, so a page without Node's `Buffer` fails before the export is even called. The
 * `buffer` package is the browser implementation Node's own API is modelled on.
 */
export { Buffer } from 'buffer';
