#!/usr/bin/env node
/**
 * SERVE THE APP LOCALLY, LIVE (DBU-02).
 *
 *   node tools/serve-app.mjs [--port 8596]
 *
 * Runs NodeGX's preview harness (@nodegx/preview) on this project: it renders the app from the files on
 * disk and reloads when the MCP writes them. The app calls the backend at the endpoint in
 * nodegx.project.json (metadata.cloudservices, http://127.0.0.1:8595), so start that first with
 * tools/reset-demo.mjs.
 *
 * WHY A FIXED PORT: a magic link brings the person back to the app's ORIGIN, and the backend sends no mail
 * at all for an origin that is not on its redirect allow-list (it logs auth.redirect-refused). setup-signin
 * allows http://127.0.0.1:8596; serve on another port and pass the same --app-url to setup-signin.
 *
 * The harness is not vendored: it comes from the NodeGX checkout (NODEGX_PREVIEW_BIN overrides).
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { APP, APP_URL } from './lib/local.mjs';

const bin = [process.env.NODEGX_PREVIEW_BIN, join(homedir(), 'vscode_projects', 'OpenNoodl', 'packages', 'noodl-preview', 'bin', 'noodl-preview.js')]
  .filter(Boolean)
  .find((p) => existsSync(p));
if (!bin) {
  console.error('serve-app: no noodl-preview found. Set NODEGX_PREVIEW_BIN to packages/noodl-preview/bin/noodl-preview.js.');
  process.exit(2);
}
const { hostname, port } = new URL(APP_URL);
const child = spawn(process.execPath, [bin, APP, '--host', hostname, '--port', port], { stdio: 'inherit' });
child.on('exit', (code) => process.exit(code ?? 0));
