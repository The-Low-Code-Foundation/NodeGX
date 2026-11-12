/**
 * WHERE THE LOCAL DEMO BACKEND LIVES, AND HOW TO TALK TO IT (DBU-01).
 *
 * One owner for the defaults every tool shares, so `node tools/check-seed.mjs`
 * with no arguments checks the backend `reset-demo.mjs` just built.
 *
 *   ~/.nodegx/dbu-demo/
 *     data/          the backend's data dir (wiped by reset-demo)
 *     admin-token    the admin credential (also the master key), made once
 *     backend.pid    the process reset-demo started
 *     backend.log    its output
 *
 * Every default can be overridden: --backend, --token, --root, --port, or
 * DBU_BACKEND / NODEGX_ADMIN_TOKEN / DBU_ROOT / NODEGX_BACKEND_BIN.
 */
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const APP = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

export const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};
export const has = (name) => process.argv.includes(`--${name}`);

export const ROOT = resolve(arg('root') || process.env.DBU_ROOT || join(homedir(), '.nodegx', 'dbu-demo'));
export const DATA_DIR = join(ROOT, 'data');
export const TOKEN_FILE = join(ROOT, 'admin-token');
export const PID_FILE = join(ROOT, 'backend.pid');
export const LOG_FILE = join(ROOT, 'backend.log');
export const PORT = Number(arg('port') || 8595);
export const BACKEND = (arg('backend') || process.env.DBU_BACKEND || `http://127.0.0.1:${PORT}`).replace(/\/$/, '');

/** The mail sandbox reset-demo runs (Docker). Its own ports: 1025/8025 may be somebody else's catcher. */
export const MAILPIT = { name: 'dbu-mailpit', smtpPort: 1028, webPort: 8028, web: 'http://127.0.0.1:8028' };
/** Where the app is served locally (tools/serve-app.mjs). The backend's redirect allow-list names it. */
export const APP_URL = (arg('app-url') || process.env.DBU_APP_URL || 'http://127.0.0.1:8596').replace(/\/$/, '');

export function token() {
  const t = arg('token') || process.env.NODEGX_ADMIN_TOKEN || (existsSync(TOKEN_FILE) ? readFileSync(TOKEN_FILE, 'utf8').trim() : '');
  if (!t) throw new Error(`no admin token: pass --token, set NODEGX_ADMIN_TOKEN, or run tools/reset-demo.mjs (it writes ${TOKEN_FILE}).`);
  return t;
}

/** The NodeGX backend CLI. Not vendored: it comes from the NodeGX checkout on this machine. */
export function backendBin() {
  const candidates = [
    arg('nodegx-backend'),
    process.env.NODEGX_BACKEND_BIN,
    join(homedir(), 'vscode_projects', 'OpenNoodl', 'packages', 'nodegx-backend', 'bin', 'nodegx-backend.js')
  ].filter(Boolean);
  const found = candidates.find((p) => existsSync(p));
  if (!found) throw new Error(`no nodegx-backend found (tried ${candidates.join(', ')}). Pass --nodegx-backend <path to bin/nodegx-backend.js>.`);
  return found;
}

export async function answers(url = BACKEND) {
  try {
    const r = await fetch(`${url}/health`, { signal: AbortSignal.timeout(2000) });
    return r.ok;
  } catch {
    return false;
  }
}

export const readJson = (...parts) => JSON.parse(readFileSync(join(APP, ...parts), 'utf8'));
