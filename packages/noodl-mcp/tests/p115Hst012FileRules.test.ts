/**
 * P115 HST-012 (P115-HST006-NOFILESRULE) — an agent can say who may upload files.
 *
 * Before: no MCP tool set `security.json` → `files`, so an MCP-written app kept the default (any signed-in account
 * uploads; with open sign-up, anyone on the internet). `set_file_permissions` writes the running backend and the
 * project's nodegx.security.json together, as `set_collection_permissions` does.
 *
 * Driven over MCP against a REAL backend (`nodegx-backend/dist/cli.js`, rules enforced), then graded the way the app
 * meets it: a reader's upload is refused with a sentence that says upload, the owner's is stored.
 */
import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { listBackends, BackendClient } from '../src/backend/client';
import { connect, TestSession, call, reveal } from './helpers';

const BACKEND_CLI = path.join(__dirname, '..', '..', 'nodegx-backend', 'dist', 'cli.js');
const FIXTURE = path.join(__dirname, 'fixtures', 'demo-app');
const ID = 'hst012_backend';

const describeOrSkip = fs.existsSync(BACKEND_CLI) ? describe : describe.skip;
jest.setTimeout(40000);

async function startBackend(): Promise<{ proc: ChildProcess; port: number; backendsDir: string; dataDir: string }> {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hst012-data-'));
  const proc = spawn(process.execPath, [BACKEND_CLI, 'serve', '--data-dir', dataDir, '--port', '0', '--enforce-rules'], {
    stdio: ['ignore', 'pipe', 'pipe']
  });
  const port = await new Promise<number>((resolve, reject) => {
    let buf = '';
    const timer = setTimeout(() => reject(new Error(`backend did not become ready:\n${buf}`)), 20000);
    proc.stdout!.on('data', (chunk) => {
      buf += chunk.toString();
      const m = buf.match(/NODEGX_BACKEND_READY (\{.*\})/);
      if (m) {
        clearTimeout(timer);
        resolve(JSON.parse(m[1]).port);
      }
    });
    proc.on('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`backend exited early (${code}):\n${buf}`));
    });
  });
  const backendsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hst012-backends-'));
  fs.mkdirSync(path.join(backendsDir, ID));
  fs.writeFileSync(path.join(backendsDir, ID, 'config.json'), JSON.stringify({ id: ID, name: 'HST-012 Backend', port }));
  fs.copyFileSync(path.join(dataDir, 'secrets.json'), path.join(backendsDir, ID, 'secrets.json'));
  return { proc, port, backendsDir, dataDir };
}

function bindProject(projectDir: string, instanceId: string, port: number): void {
  const file = path.join(projectDir, 'nodegx.project.json');
  const project = JSON.parse(fs.readFileSync(file, 'utf-8'));
  project.metadata = {
    ...(project.metadata || {}),
    cloudservices: { instanceId, endpoint: `http://127.0.0.1:${port}`, appId: instanceId, type: 'nodegx' }
  };
  fs.writeFileSync(file, JSON.stringify(project, null, 2));
}

const readJson = (file: string) => JSON.parse(fs.readFileSync(file, 'utf-8'));

describeOrSkip('P115 HST-012 — set_file_permissions: who may upload, on the backend and in the project', () => {
  let backend: Awaited<ReturnType<typeof startBackend>>;
  let session: TestSession;
  let projectDir: string;
  let rules: string;
  let base: string;
  const prevBackendsDir = process.env.NODEGX_BACKENDS_DIR;

  async function signUp(username: string): Promise<{ id: string; token: string }> {
    const res = await fetch(`${base}/users`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username, password: `pw-${username}-123456` })
    });
    const json = (await res.json()) as { objectId: string; sessionToken: string };
    expect(res.status).toBe(201);
    return { id: json.objectId, token: json.sessionToken };
  }

  const uploadAs = (token: string, name: string) =>
    fetch(`${base}/files/${name}`, {
      method: 'POST',
      headers: { 'content-type': 'text/plain', 'x-parse-session-token': token },
      body: 'open day: 14 November'
    });

  beforeAll(async () => {
    backend = await startBackend();
    base = `http://127.0.0.1:${backend.port}`;
    process.env.NODEGX_BACKENDS_DIR = backend.backendsDir;
    projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hst012-proj-'));
    fs.cpSync(FIXTURE, projectDir, { recursive: true });
    bindProject(projectDir, ID, backend.port);
    rules = path.join(projectDir, 'nodegx.security.json');
    session = await connect(projectDir, true);
    await reveal(session, 'backend');
  });

  afterAll(async () => {
    if (session) await session.close();
    if (backend) {
      backend.proc.kill('SIGTERM');
      fs.rmSync(backend.backendsDir, { recursive: true, force: true });
      fs.rmSync(backend.dataDir, { recursive: true, force: true });
    }
    fs.rmSync(projectDir, { recursive: true, force: true });
    if (prevBackendsDir === undefined) delete process.env.NODEGX_BACKENDS_DIR;
    else process.env.NODEGX_BACKENDS_DIR = prevBackendsDir;
  });

  it('the owner-only upload: set through the MCP, held by the backend, kept in the project; a reader is refused with a sentence', async () => {
    const owner = await signUp('owner');
    const reader = await signUp('reader');
    // Before: the default lets any signed-in account upload (the finding).
    expect((await uploadAs(reader.token, 'before.txt')).status).toBe(201);

    expect((await call(session, 'create_backend_role', { name: 'owner' })).isError).toBe(false);
    expect((await call(session, 'assign_role_user', { role: 'owner', userId: owner.id })).isError).toBe(false);

    const set = await call<{ files: Record<string, unknown>; project: { file: string; written: boolean } }>(session, 'set_file_permissions', {
      upload: 'role:owner'
    });
    expect(set.isError).toBe(false);
    expect(set.data.files).toEqual({ upload: 'role:owner', read: 'public', delete: 'nobody' });
    expect(set.data.project).toEqual({ file: 'nodegx.security.json', written: true });
    expect(readJson(rules).files).toEqual({ upload: 'role:owner', read: 'public', delete: 'nobody' });

    const client = new BackendClient(listBackends().find((b) => b.id === ID)!);
    const held = (await client.request('GET', '/admin/permissions')).json as { config: { files: unknown } };
    expect(held.config.files).toEqual({ upload: 'role:owner', read: 'public', delete: 'nobody' });

    const refused = await uploadAs(reader.token, 'after.txt');
    expect(refused.status).toBe(403);
    expect(((await refused.json()) as { error: string }).error).toBe('Permission denied: you may not upload files to this app.');

    const stored = await uploadAs(owner.token, 'timetable.txt');
    expect(stored.status).toBe(201);
    const { url } = (await stored.json()) as { url: string };
    expect((await fetch(url)).status).toBe(200);
  });

  it('a field left out keeps its rule; nothing said is refused; a malformed rule changes neither side', async () => {
    expect((await call(session, 'set_file_permissions', { read: 'authenticated' })).isError).toBe(false);
    expect(readJson(rules).files).toEqual({ upload: 'role:owner', read: 'authenticated', delete: 'nobody' });

    const empty = await call(session, 'set_file_permissions', {});
    expect(empty.isError).toBe(true);
    expect(JSON.stringify(empty.data)).toMatch(/at least one of upload, read or delete/);

    const fileBefore = fs.readFileSync(rules, 'utf-8');
    const bad = await call(session, 'set_file_permissions', { upload: 'role:' });
    expect(bad.isError).toBe(true);
    expect(fs.readFileSync(rules, 'utf-8')).toBe(fileBefore);
    const client = new BackendClient(listBackends().find((b) => b.id === ID)!);
    const held = (await client.request('GET', '/admin/permissions')).json as { config: { files: unknown } };
    expect(held.config.files).toEqual({ upload: 'role:owner', read: 'authenticated', delete: 'nobody' });

    // back to the default, said in its own words
    expect((await call(session, 'set_file_permissions', { upload: 'authenticated', read: 'public' })).isError).toBe(false);
    expect(readJson(rules).files).toEqual({ upload: 'authenticated', read: 'public', delete: 'nobody' });
  });
});
