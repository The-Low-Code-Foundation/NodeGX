/**
 * P127 BKO-001 — what the agent writes to its project's backend is kept in the project.
 *
 * Before: `set_collection_permissions`, the trigger tools and the workflow tools wrote the running
 * backend only, so an agent-built app's rules, reminders and workflows were on one machine
 * (P127-BKO001-BACKENDONLY; the rules half measured in OWN-026 test 2). Now each write goes to the
 * backend first and then into `nodegx.security.json` / `nodegx.automations.json`, both or neither.
 *
 * Driven over MCP against a REAL backend (`nodegx-backend/dist/cli.js`), discovered as the tools
 * discover one, with the project bound to it by `metadata.cloudservices.instanceId`.
 */
import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { connect, TestSession, call, reveal } from './helpers';

const BACKEND_CLI = path.join(__dirname, '..', '..', 'nodegx-backend', 'dist', 'cli.js');
const FIXTURE = path.join(__dirname, 'fixtures', 'demo-app');
const ID = 'p127_backend';

const describeOrSkip = fs.existsSync(BACKEND_CLI) ? describe : describe.skip;
jest.setTimeout(40000);

async function startBackend(): Promise<{ proc: ChildProcess; port: number; backendsDir: string; dataDir: string }> {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'p127-data-'));
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
  const backendsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'p127-backends-'));
  fs.mkdirSync(path.join(backendsDir, ID));
  fs.writeFileSync(path.join(backendsDir, ID, 'config.json'), JSON.stringify({ id: ID, name: 'P127 Backend', port }));
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

describeOrSkip('P127 BKO-001 — the agent’s backend writes reach the project’s files', () => {
  let backend: Awaited<ReturnType<typeof startBackend>>;
  let session: TestSession;
  let projectDir: string;
  let automations: string;
  let rules: string;
  const prevBackendsDir = process.env.NODEGX_BACKENDS_DIR;

  beforeAll(async () => {
    backend = await startBackend();
    process.env.NODEGX_BACKENDS_DIR = backend.backendsDir;
    projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'p127-proj-'));
    fs.cpSync(FIXTURE, projectDir, { recursive: true });
    bindProject(projectDir, ID, backend.port);
    automations = path.join(projectDir, 'nodegx.automations.json');
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

  it('a schedule the agent adds is in nodegx.automations.json, with no run state', async () => {
    expect(fs.existsSync(automations)).toBe(false);
    const made = await call<{ trigger: { id: string }; project: { written: boolean; file: string } }>(session, 'create_backend_trigger', {
      type: 'schedule',
      name: 'Every day at 9',
      target: { kind: 'function', name: 'sendReminders' },
      schedule: { cron: '0 9 * * *', missedFirePolicy: 'skip' }
    });
    expect(made.isError).toBe(false);
    expect(made.data.project).toEqual({ file: 'nodegx.automations.json', written: true });
    const file = readJson(automations);
    expect(file.triggers).toEqual([
      {
        id: made.data.trigger.id,
        type: 'schedule',
        name: 'Every day at 9',
        enabled: true,
        target: { kind: 'function', name: 'sendReminders' },
        schedule: { cron: '0 9 * * *', missedFirePolicy: 'skip' }
      }
    ]);
    expect(JSON.stringify(file)).not.toMatch(/createdAt|updatedAt|status|fireCount/);
  });

  it('turning it off and changing its time follow into the file', async () => {
    const id = readJson(automations).triggers[0].id;
    expect((await call(session, 'set_backend_trigger_enabled', { id, enabled: false })).isError).toBe(false);
    expect(readJson(automations).triggers[0].enabled).toBe(false);
    const moved = await call(session, 'update_backend_trigger', {
      id,
      type: 'schedule',
      enabled: false,
      target: { kind: 'function', name: 'sendReminders' },
      schedule: { cron: '0 10 * * *', missedFirePolicy: 'skip' }
    });
    expect(moved.isError).toBe(false);
    expect(readJson(automations).triggers[0].schedule.cron).toBe('0 10 * * *');
  });

  it('a webhook is kept without its secret, which still comes back once to the agent', async () => {
    const hook = await call<{ trigger: { id: string }; secret: string }>(session, 'create_backend_trigger', {
      type: 'webhook',
      target: { kind: 'function', name: 'orderPaid' },
      webhook: { slug: 'order-paid' }
    });
    expect(hook.data.secret).toMatch(/^whsec_/);
    const text = fs.readFileSync(automations, 'utf-8');
    expect(text).toContain('order-paid');
    expect(text).not.toContain(hook.data.secret);
    expect(text).not.toContain('whsec_');
  });

  it('a workflow is kept, and deleting it removes it from the file', async () => {
    const made = await call<{ workflow: { id: string } }>(session, 'create_backend_workflow', {
      id: 'tidy-up',
      name: 'Tidy up',
      entry: 'a',
      steps: [{ id: 'a', kind: 'call-function', ref: 'archiveDone' }]
    });
    expect(made.isError).toBe(false);
    expect(readJson(automations).workflows.map((w: { id: string }) => w.id)).toEqual(['tidy-up']);
    expect((await call(session, 'delete_backend_workflow', { id: 'tidy-up' })).isError).toBe(false);
    expect(readJson(automations).workflows).toEqual([]);
  });

  it('a rule the agent sets makes the project a nodegx.security.json, switched on; a reset takes it out', async () => {
    expect(fs.existsSync(rules)).toBe(false);
    const lock = await call<{ project: { written: boolean } }>(session, 'set_collection_permissions', {
      collection: 'Books',
      permissions: { find: 'authenticated', get: 'authenticated', create: 'authenticated', update: 'nobody', delete: 'nobody' },
      creatorOwns: true
    });
    expect(lock.isError).toBe(false);
    expect(lock.data.project.written).toBe(true);
    const file = readJson(rules);
    expect(file.devOpen).toBe(false);
    expect(file.collections.Books.permissions.update).toBe('nobody');
    expect(file.collections.Books.creatorOwns).toBe(true);
    expect((await call(session, 'reset_collection_permissions', { collection: 'Books' })).isError).toBe(false);
    expect(readJson(rules).collections.Books).toBeUndefined();
  });

  it('🔴 both or neither: when the file cannot be written, the backend is put back', async () => {
    const before = fs.readFileSync(automations, 'utf-8');
    const listBefore = await call<{ triggers: { id: string }[] }>(session, 'list_backend_triggers');
    // A directory where the file's temporary copy would go makes the write fail after the backend took it.
    const blocker = `${automations}.tmp-${process.pid}`;
    fs.mkdirSync(blocker);
    try {
      const refused = await call<{ error?: { message: string } }>(session, 'create_backend_trigger', {
        type: 'schedule',
        target: { kind: 'function', name: 'nightly' },
        schedule: { cron: '0 2 * * *', missedFirePolicy: 'skip' }
      });
      expect(refused.isError).toBe(true);
      expect(JSON.stringify(refused.data)).toMatch(/put back as it was/);
    } finally {
      fs.rmSync(blocker, { recursive: true, force: true });
    }
    const listAfter = await call<{ triggers: { id: string }[] }>(session, 'list_backend_triggers');
    expect(listAfter.data.triggers.map((t) => t.id).sort()).toEqual(listBefore.data.triggers.map((t) => t.id).sort());
    expect(fs.readFileSync(automations, 'utf-8')).toBe(before);
  });

  it('a write to a backend that is not this project’s leaves the project alone, and says so', async () => {
    bindProject(projectDir, 'someone_elses', backend.port);
    try {
      const before = fs.readFileSync(automations, 'utf-8');
      const made = await call<{ project: { written: boolean; reason: string } }>(session, 'create_backend_trigger', {
        backendId: ID,
        type: 'schedule',
        target: { kind: 'function', name: 'other' },
        schedule: { cron: '0 4 * * *', missedFirePolicy: 'skip' }
      });
      expect(made.isError).toBe(false);
      expect(made.data.project.written).toBe(false);
      expect(made.data.project.reason).toMatch(/not this project's backend/);
      expect(fs.readFileSync(automations, 'utf-8')).toBe(before);
    } finally {
      bindProject(projectDir, ID, backend.port);
    }
  });
});
