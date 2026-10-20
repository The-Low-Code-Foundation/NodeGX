// Test copies: a copy of the app's folder and a backend of its own (the kit's, from @nodegx/preview),
// with the app's tables applied. The real folder and the real backend are never touched.

import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const CLI = path.join(here, '..', 'node_modules', '@nodegx', 'preview', 'dist', 'backend', 'cli.js');
export const REAL_APP = path.resolve(here, '..', '..', 'training');

export function hashTree(dir) {
  const out = {};
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else out[path.relative(dir, p)] = crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
    }
  };
  walk(dir);
  return out;
}

export const freePort = () =>
  new Promise((resolve) => {
    const s = net.createServer().listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });

export const stop = (child) => new Promise((resolve) => (child.exitCode !== null ? resolve() : (child.once('exit', resolve), child.kill())));

/** A copy of `source` under test/.work, with a token and a data folder for its backend. */
export function makeCopy(source = REAL_APP, label = 'run') {
  const work = path.join(here, '.work', `${label}-${Date.now()}`);
  const copy = path.join(work, 'training');
  fs.mkdirSync(work, { recursive: true });
  fs.cpSync(source, copy, { recursive: true });
  return { work, copy, dataDir: path.join(work, 'backend-data'), token: crypto.randomBytes(16).toString('hex') };
}

export async function startBackend({ copy, dataDir, token }, port) {
  const child = spawn(process.execPath, [CLI, 'serve', '--data-dir', dataDir, '--port', String(port), '--token', token, '--project-dir', copy, '--backend-name', 'Backend map test copy'], {
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let log = '';
  child.stdout.on('data', (d) => (log += d));
  child.stderr.on('data', (d) => (log += d));
  for (let i = 0; i < 100; i++) {
    const r = await fetch(`http://127.0.0.1:${port}/health`).catch(() => null);
    if (r?.ok) return child;
    await new Promise((r) => setTimeout(r, 200));
  }
  child.kill();
  throw new Error('The test backend did not start:\n' + log.slice(-2000));
}

export function adminClient(base, token) {
  return (p, init = {}) =>
    fetch(base + p, { ...init, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) } }).then((r) => r.json());
}

/** The app's own tables on the copy backend, as the app's setup applies them. */
export async function applySchema(admin, copy) {
  const schemaFile = JSON.parse(fs.readFileSync(path.join(copy, 'backend', 'schema.json'), 'utf8'));
  return admin('/admin/schema/apply', { method: 'POST', body: JSON.stringify({ source: { tables: schemaFile.tables } }) });
}
