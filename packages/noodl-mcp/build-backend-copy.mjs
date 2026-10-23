#!/usr/bin/env node
/**
 * P112 OWN-015 — the backend an npm install of `@nodegx/mcp` provisions.
 *
 *   node build-backend-copy.mjs            bundle nodegx-backend's service into dist/backend/cli.js, and its full-stack
 *                                          launcher into dist/backend/folder/ (npm's prepack)
 *   node build-backend-copy.mjs --remove   delete it again (npm's postpack)
 *   … --out <dir>                          build into (or remove) <dir> instead — @nodegx/preview's prepack
 *
 * `provision_backend` starts `nodegx-backend/dist/cli.js`, found beside a checkout (or inside the editor app). An npm
 * install had none, so it refused, and an API key could only sit in an HTTP Request node in the page. The service is
 * already ONE self-contained file by design (its build.js: "copy this file and run it"; Node built-ins and
 * `node:sqlite` only, the optional sharp / pg-native / better-sqlite3 by guarded require), and everything it inlines
 * is MIT. So it ships inside this package, built here with the backend's OWN esbuild config (`shared`, exported for
 * exactly this, P109 ISL-042) to a path of this package's, never over the `dist/` a running editor or peer is using.
 *
 * Not a dependency on a separate npm package: no workspace is called that, so declaring one would send the
 * monorepo's own install to the registry. A standalone package for servers is OWN-016's question.
 */
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import esbuild from 'esbuild';

const HERE = path.dirname(fileURLToPath(import.meta.url));
// `--out <dir>`: P112-OWN019-BACKENDSESSION — @nodegx/preview ships the same service (its prepack builds it here into
// its own dist/backend), so a person's preview can start the app's own backend.
const outAt = process.argv.indexOf('--out');
const OUT = outAt > 0 ? path.resolve(process.argv[outAt + 1]) : path.join(HERE, 'dist', 'backend');
const BACKEND = path.resolve(HERE, '..', 'nodegx-backend');

if (process.argv.includes('--remove')) {
  rmSync(OUT, { recursive: true, force: true });
  process.exit(0);
}

const require = createRequire(import.meta.url);
const { shared } = require(path.join(BACKEND, 'scripts', 'build.js'));
const { buildAdminApp } = require(path.join(BACKEND, 'scripts', 'build-admin-app.js'));

const started = Date.now();
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
// The service bundle inlines the admin dashboard this writes (build/admin/, gitignored), as its own build does.
await buildAdminApp();
await esbuild.build({
  ...shared,
  sourcemap: false,
  logLevel: 'warning',
  entryPoints: [path.join(BACKEND, 'src', 'cli.ts')],
  outfile: path.join(OUT, 'cli.js')
});
// P26 DEP-002 — the launcher a full-stack deploy puts beside the app (`start.js`, `start.sh`, `start.cmd`). It ships
// beside the backend it starts, so `nodegx-deploy --full-stack` from an install finds both in one place.
cpSync(path.join(BACKEND, 'deploy', 'folder'), path.join(OUT, 'folder'), { recursive: true });
console.log(`build-backend-copy: ${path.relative(process.cwd(), path.join(OUT, 'cli.js'))} (${((Date.now() - started) / 1000).toFixed(1)} s)`);
