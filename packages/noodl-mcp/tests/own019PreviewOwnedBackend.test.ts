/**
 * P112-OWN019-BACKENDSESSION — an agent adopts the backend a person's preview started (R38).
 *
 * The preview now starts an app's own local backend (`@nodegx/preview` `ownBackend.ts`). A person with the preview
 * open who then asks their agent for more work makes `provision_backend` meet a backend it did not start, on the same
 * data dir and port. It must ADOPT it — not sweep it as an orphan (its owner, the preview, is alive), and not start a
 * second writer on the same SQLite file (which, with the port taken, fails: "exited before becoming ready" — the very
 * answer the editor grader got in s5 against the gallery's kept backend).
 *
 * Needs the built preview (`npm --prefix packages/noodl-preview run build`) and the backend service; skipped without.
 */
import { spawn, type ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as net from 'net';
import * as os from 'os';
import * as path from 'path';

import { provisionBackend } from '../src/backend/provision';
import { readRuntimeRecord } from '../src/backend/runtimeRecord';

const PREVIEW = path.resolve(__dirname, '..', '..', 'noodl-preview', 'dist', 'noodl-preview.cjs');
const FIXTURE = path.resolve(__dirname, '..', '..', 'noodl-preview', 'tests', 'fixtures', 'hello-world');
const SERVICE = path.resolve(__dirname, '..', '..', 'nodegx-backend', 'dist', 'cli.js');
const ready = [PREVIEW, FIXTURE, SERVICE].every((p) => fs.existsSync(p));
const itOrSkip = ready ? it : it.skip;

const ID = 'backend_own019adopt';
const freePort = () =>
  new Promise<number>((resolve) => {
    const s = net.createServer();
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address() as net.AddressInfo;
      s.close(() => resolve(port));
    });
  });

describe('P112-OWN019-BACKENDSESSION — provision_backend and a preview-started backend', () => {
  let preview: ChildProcess | null = null;
  let root = '';
  let dir = '';
  afterAll(() => {
    preview?.kill('SIGKILL');
    if (dir) fs.rmSync(dir, { recursive: true, force: true });
    // The backend dies with its preview (--parent-pid, polled every 5 s); its folder can go after.
    setTimeout(() => root && fs.rmSync(root, { recursive: true, force: true }), 7000).unref();
  });

  itOrSkip('adopts it: same pid, same port, nothing swept, no second process', async () => {
    const port = await freePort();
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'own019-adopt-'));
    fs.mkdirSync(path.join(root, ID, 'data'), { recursive: true });
    fs.mkdirSync(path.join(root, ID, 'workflows'), { recursive: true });
    fs.writeFileSync(path.join(root, ID, 'config.json'), JSON.stringify({ id: ID, name: 'Quiz backend', createdAt: new Date().toISOString(), port, projectIds: ['p-own019'] }));
    fs.writeFileSync(path.join(root, ID, 'schema.json'), JSON.stringify({ tables: [] }));
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'own019-adopt-app-'));
    fs.cpSync(FIXTURE, dir, { recursive: true });
    const projectFile = path.join(dir, 'nodegx.project.json');
    const project = JSON.parse(fs.readFileSync(projectFile, 'utf8'));
    project.metadata = { cloudservices: { instanceId: ID, endpoint: `http://127.0.0.1:${port}`, appId: ID, type: 'nodegx' } };
    fs.writeFileSync(projectFile, JSON.stringify(project, null, 2));

    preview = spawn(process.execPath, [PREVIEW, dir, '--port', '0', '--no-watch'], { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, NODEGX_BACKENDS_DIR: root } });
    let out = '';
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error(`preview did not start its backend:\n${out}`)), 60_000);
      preview!.stdout!.on('data', (c) => {
        out += c;
        if (out.includes("started the app's backend")) {
          clearTimeout(t);
          resolve();
        }
      });
    });
    const before = readRuntimeRecord(ID, root);
    expect(before?.owner.kind).toBe('preview');

    const r = await provisionBackend({ name: 'Quiz backend', collections: [], projectId: 'p-own019', root });
    expect({ adopted: r.adopted, reused: r.reused, pid: r.pid, port: r.port }).toEqual({ adopted: true, reused: true, pid: before!.pid, port });
    // The preview still owns it: the record is the preview's, and the backend still answers.
    expect(readRuntimeRecord(ID, root)?.owner.kind).toBe('preview');
  }, 120_000);
});
