/**
 * Builds `@nodegx/node-spec` into what its `exports` map advertises (OWN-002):
 *   dist/index.mjs, dist/index.cjs   the browser-safe entry (src/browser.ts), platform-neutral
 *   dist/node.cjs                     the `/node` entry (src/index.ts): adds the scenario files on disk;
 *                                     CJS only, because it finds `scenarios/` from `__dirname`
 *   dist/draw.mjs, dist/draw.cjs      the `/draw` entry (src/draw-only.ts): the drawer, the canvas measurer, the layout model
 *                                     and the generated table of what the drawer reads — about 12 KB gzipped against the
 *                                     whole browser entry's 361 KB, for a page that only draws a screen (OWN-012)
 *   dist/types/src/*.d.ts             declarations, from tsc (tsconfig.build.json)
 * `fast-xml-parser` (the XML and feed parsers) stays a dependency the consumer's bundler resolves.
 * `dist/` is gitignored: the source is the source of truth.
 */
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import esbuild from 'esbuild';

const here = dirname(fileURLToPath(import.meta.url));
const shared = { bundle: true, target: 'es2020', external: ['fast-xml-parser'], sourcemap: true, logLevel: 'info', absWorkingDir: here };

await esbuild.build({ ...shared, platform: 'neutral', entryPoints: ['src/browser.ts'], format: 'esm', outfile: 'dist/index.mjs' });
await esbuild.build({ ...shared, platform: 'neutral', entryPoints: ['src/browser.ts'], format: 'cjs', outfile: 'dist/index.cjs' });
await esbuild.build({ ...shared, platform: 'node', entryPoints: ['src/index.ts'], format: 'cjs', outfile: 'dist/node.cjs' });
await esbuild.build({ ...shared, platform: 'neutral', entryPoints: ['src/draw-only.ts'], format: 'esm', outfile: 'dist/draw.mjs' });
await esbuild.build({ ...shared, platform: 'neutral', entryPoints: ['src/draw-only.ts'], format: 'cjs', outfile: 'dist/draw.cjs' });

execFileSync(join(here, '..', '..', 'node_modules', '.bin', 'tsc'), ['--project', join(here, 'tsconfig.build.json')], { stdio: 'inherit' });
