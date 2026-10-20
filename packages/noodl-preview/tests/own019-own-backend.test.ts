/**
 * P112-OWN019-BACKENDSESSION — the preview starts the app's own local backend (R38, Richard 2026-10-14).
 *
 * E1 and SE1 (OWN-019 s4) built the editor brief on a local backend, as "kept on this computer … start it again
 * tomorrow" asks. The backend was a child of the agent's MCP session: once the session ended, the app's page loaded
 * and every save failed. Now the preview starts the backend the project names, writes the runtime record an agent's
 * `provision_backend` adopts, and the backend dies with the preview however the preview dies.
 *
 * Control: on HEAD before the fix the preview starts nothing — nothing answers on the app's port.
 * Every backend here lives under a temp NODEGX_BACKENDS_DIR, never the machine's ~/.noodl.
 */
import * as fs from 'fs';
import * as net from 'net';
import * as os from 'os';
import * as path from 'path';

import { assertPrerequisites, scratchCopy, startPreview, writeJson } from './helpers';

beforeAll(() => assertPrerequisites());

const ID = 'backend_own019test';
const freePort = () =>
  new Promise<number>((resolve) => {
    const s = net.createServer();
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address() as net.AddressInfo;
      s.close(() => resolve(port));
    });
  });
const answering = (port: number) =>
  new Promise<boolean>((resolve) => {
    const c = net.connect({ host: '127.0.0.1', port });
    c.once('connect', () => (c.destroy(), resolve(true)));
    c.once('error', () => resolve(false));
  });
const until = async (cond: () => Promise<boolean>, ms: number) => {
  for (const end = Date.now() + ms; Date.now() < end; await new Promise((r) => setTimeout(r, 250))) if (await cond()) return true;
  return cond();
};

/** An app bound to a local backend, and that backend's folder as `createBackendDir` lays it out. */
async function appWithBackend(withConfig = true) {
  const port = await freePort();
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'own019-backends-'));
  if (withConfig) {
    fs.mkdirSync(path.join(root, ID, 'data'), { recursive: true });
    fs.mkdirSync(path.join(root, ID, 'workflows'), { recursive: true });
    fs.writeFileSync(path.join(root, ID, 'config.json'), JSON.stringify({ id: ID, name: 'Own019 test backend', createdAt: new Date().toISOString(), port, projectIds: [] }));
    fs.writeFileSync(path.join(root, ID, 'schema.json'), JSON.stringify({ tables: [] }));
  }
  const dir = scratchCopy('hello-world');
  writeJson<TSFixme>(path.join(dir, 'nodegx.project.json'), (p) => {
    p.metadata = { cloudservices: { instanceId: ID, endpoint: `http://127.0.0.1:${port}`, appId: ID, type: 'nodegx' } };
  });
  return { port, root, dir, env: { ...process.env, NODEGX_BACKENDS_DIR: root } };
}

describe("P112-OWN019-BACKENDSESSION — the preview starts the app's own backend", () => {
  it('starts it, records itself as its owner, and the backend dies with the preview (even a SIGKILL)', async () => {
    const app = await appWithBackend();
    expect(await answering(app.port)).toBe(false);
    const preview = await startPreview(app.dir, ['--no-watch'], app.env);
    try {
      expect(preview.stdout).toContain(`started the app's backend (${ID}) on http://127.0.0.1:${app.port}`);
      expect(await answering(app.port)).toBe(true);
      const record = JSON.parse(fs.readFileSync(path.join(app.root, ID, 'runtime.json'), 'utf8'));
      expect({ kind: record.owner.kind, port: record.port, id: record.backendId, beat: typeof record.heartbeatAt }).toEqual({
        kind: 'preview',
        port: app.port,
        id: ID,
        beat: 'string'
      });
    } finally {
      await preview.stop(); // SIGKILL: no shutdown handler runs; the backend's --parent-pid guard must notice
    }
    expect(await until(async () => !(await answering(app.port)), 15_000)).toBe(true);
    fs.rmSync(app.dir, { recursive: true, force: true });
    fs.rmSync(app.root, { recursive: true, force: true });
  }, 90_000);

  it('uses a backend already running instead of starting a second one, and starts nothing it cannot find', async () => {
    const app = await appWithBackend();
    const first = await startPreview(app.dir, ['--no-watch'], app.env);
    const second = await startPreview(app.dir, ['--no-watch'], app.env);
    try {
      expect(second.stdout).toContain(`the app's backend (${ID}) is already running on http://127.0.0.1:${app.port} (preview)`);
      expect(second.stdout).not.toContain('started the app');
    } finally {
      await second.stop();
      await first.stop();
    }
    // No backend folder on this machine: said, and nothing started.
    const none = await appWithBackend(false);
    const p = await startPreview(none.dir, ['--no-watch'], none.env);
    try {
      expect(p.stdout).toContain(`names a backend (${ID}) that is not on this machine`);
      expect(await answering(none.port)).toBe(false);
    } finally {
      await p.stop();
    }
    // --no-backend: a person (or a grader) who starts the backend themselves.
    const off = await appWithBackend();
    const q = await startPreview(off.dir, ['--no-watch', '--no-backend'], off.env);
    try {
      expect(await answering(off.port)).toBe(false);
    } finally {
      await q.stop();
    }
    for (const a of [app, none, off]) {
      fs.rmSync(a.dir, { recursive: true, force: true });
      fs.rmSync(a.root, { recursive: true, force: true });
    }
  }, 120_000);
});
