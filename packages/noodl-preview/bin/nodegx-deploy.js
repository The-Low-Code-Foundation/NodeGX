#!/usr/bin/env node
/**
 * P112 OWN-016 — `nodegx deploy` from an npm install: `npx -y --package @nodegx/preview nodegx-deploy <project> <out>`.
 *
 * The deploy engine (`dist/nodegx-deploy.cjs`, HLS-015) already shipped in this package for `@nodegx/export`'s
 * `nodegx deploy` to spawn, but `@nodegx/export` is not published and refuses outside a checkout by design. The
 * engine itself was always a complete CLI: `<project-dir> <out-dir> [--base-url <url>]`, one JSON report on stdout,
 * everything human on stderr. This gives it a name an install can run.
 */
const fs = require('fs');
const path = require('path');

const engine = path.join(__dirname, '..', 'dist', 'nodegx-deploy.cjs');
if (!fs.existsSync(engine)) {
  process.stderr.write(
    'nodegx-deploy: dist/nodegx-deploy.cjs is missing.\n' + 'Build it first:  npm --prefix packages/noodl-preview run build\n'
  );
  process.exit(2);
}
require(engine);
