#!/usr/bin/env node
/**
 * SERVE THE BROWSER-ONLY DEMO LOCALLY (DBU-11).
 *
 *   node tools/build-demo.mjs && node tools/serve-demo.mjs [--port 8602]
 *
 * The same preview harness as serve-app, on ../demo/. No backend: the demo's service worker plays it, and a
 * service worker needs a secure origin, which http://127.0.0.1 is.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { arg } from './lib/local.mjs';
import { OUT } from './build-demo.mjs';

const bin = [process.env.NODEGX_PREVIEW_BIN, join(homedir(), 'vscode_projects', 'OpenNoodl', 'packages', 'noodl-preview', 'bin', 'noodl-preview.js')]
  .filter(Boolean)
  .find((p) => existsSync(p));
if (!bin) {
  console.error('serve-demo: no noodl-preview found. Set NODEGX_PREVIEW_BIN to packages/noodl-preview/bin/noodl-preview.js.');
  process.exit(2);
}
if (!existsSync(join(OUT, 'demo-sw.js'))) {
  console.error(`serve-demo: no demo at ${OUT}. Run node tools/build-demo.mjs first.`);
  process.exit(2);
}
const port = arg('port') || '8602';
const child = spawn(process.execPath, [bin, OUT, '--host', '127.0.0.1', '--port', port], { stdio: 'inherit' });
child.on('exit', (code) => process.exit(code ?? 0));
