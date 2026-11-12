/**
 * P26 DEP-002 s4 — `deploy_to_vm` driven through the MCP client against a throwaway VM: real ssh, real tar, the real
 * engine, the real provision-app.sh, a real systemd box. Skipped unless DEP002_VM is set, because it needs the
 * container and a built engine; the recipe is DEP-002 "Session 4".
 *
 *   DEP002_VM=1 DEP002_KEY=<key> NODEGX_DEPLOY_CLI=<s>/eng/nodegx-deploy.cjs NODEGX_BACKEND_ENTRY=<s>/backend/cli.js \
 *     npx jest tests/dep002DeployToVm.drive.test.ts
 *
 * The container (`nodegx-shiptest`, ssh on 127.0.0.1:22722, https on :8443) starts WITHOUT the key authorised, so the
 * first arm is the refused login a stranger meets first; the spec then authorises it with `docker exec`.
 */
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import type { DeployToVmResult } from '../src/tools/deployToVm';
import type { ToolErrorPayload } from '../src/tools/responses';
import { call, connect, reveal, type TestSession } from './helpers';

const drive = process.env.DEP002_VM ? describe : describe.skip;
const KEY = process.env.DEP002_KEY ?? '';
const HOST = 'root@127.0.0.1';
const box = (script: string): string => execFileSync('docker', ['exec', 'nodegx-shiptest', 'bash', '-c', script], { encoding: 'utf8' });
const TEMPLATES = path.resolve(__dirname, '..', '..', '..', 'templates');

function copyTemplate(name: string): string {
  const dir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'dep002s4-drive-')), name);
  fs.cpSync(path.join(TEMPLATES, name), dir, { recursive: true });
  return dir;
}

async function ship(session: TestSession, args: Record<string, unknown>) {
  await reveal(session, 'project');
  return call<DeployToVmResult | ToolErrorPayload>(session, 'deploy_to_vm', { host: HOST, ssh_key: KEY, ssh_port: 22722, ...args });
}

drive('DEP-002 s4 — deploy_to_vm against a throwaway VM', () => {
  jest.setTimeout(15 * 60_000);
  const backends = fs.mkdtempSync(path.join(os.tmpdir(), 'dep002s4-backends-'));
  beforeAll(() => {
    process.env.NODEGX_BACKENDS_DIR = backends;
    // A local backend holding one function secret (a stand-in value), as set_function_secret leaves it.
    fs.mkdirSync(path.join(backends, 'drivebackend'), { recursive: true });
    fs.writeFileSync(path.join(backends, 'drivebackend', 'secrets.json'), JSON.stringify({ adminToken: 'x', functions: { drive_probe: 'stand-in-value' } }));
  });

  it('a key the server does not accept: refused at the first call, with the one command that fixes it', async () => {
    const session = await connect(copyTemplate('todo-list'));
    try {
      const res = await ship(session, { app: 'shiptodo', port: 8721 });
      expect(res.isError).toBe(true);
      const error = (res.data as ToolErrorPayload).error;
      console.log('[drive] refused login:', JSON.stringify(error));
      expect(error.code).toBe('deploy-failed');
      expect(error.details).toMatchObject({ stage: 'connect' });
      expect(error.message).toContain('ssh-copy-id -p 22722 root@127.0.0.1');
    } finally {
      await session.close();
    }
    box(`echo '${fs.readFileSync(`${KEY}.pub`, 'utf8').trim()}' >> /root/.ssh/authorized_keys`);
  });

  it('todo-list with no domain: installed, answering, a person can sign up and keep a task', async () => {
    const session = await connect(copyTemplate('todo-list'));
    try {
      const res = await ship(session, { app: 'shiptodo', port: 8721 });
      console.log('[drive] todo-list:', JSON.stringify(res.data, null, 1));
      expect(res.isError).toBe(false);
      const r = res.data as DeployToVmResult;
      expect(r).toMatchObject({ ok: true, url: null, health: 200, appStatus: 200, build: { rules: 'project' } });
      expect(r.see).toBe('ssh -p 22722 -L 8721:127.0.0.1:8721 root@127.0.0.1   then open http://localhost:8721');
    } finally {
      await session.close();
    }
    expect(box('systemctl is-active shiptodo-backend').trim()).toBe('active');
    expect(box('ls /opt/shiptodo')).toMatch(/start\.js/);
    const signup = box(
      `curl -s -w '\\n%{http_code}' -X POST http://127.0.0.1:8721/users -H 'Content-Type: application/json' -d '{"username":"drive@x.io","password":"drive-pass-1","email":"drive@x.io"}'`
    );
    console.log('[drive] sign-up', signup.split('\n').pop());
    expect(signup.split('\n').pop()).toBe('201');
    const token = JSON.parse(signup.split('\n')[0]).sessionToken as string;
    const task = box(
      `curl -s -o /dev/null -w '%{http_code}' -X POST http://127.0.0.1:8721/classes/Task -H 'Content-Type: application/json' -H 'X-Parse-Session-Token: ${token}' -d '{"title":"shipped by deploy_to_vm"}'`
    );
    console.log('[drive] a task', task);
    expect(task).toBe('201');
    expect(box(`curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8721/classes/_User`)).not.toBe('200');
  });

  it('members-area with a domain and a function secret: Caddy serves https, the secret is in the process by name', async () => {
    const dir = copyTemplate('members-area');
    const project = JSON.parse(fs.readFileSync(path.join(dir, 'nodegx.project.json'), 'utf8'));
    project.metadata = { ...(project.metadata ?? {}), cloudservices: { instanceId: 'drivebackend', endpoint: 'http://127.0.0.1:1', appId: 'x', type: 'nodegx' } };
    fs.writeFileSync(path.join(dir, 'nodegx.project.json'), JSON.stringify(project, null, 2));
    const session = await connect(dir);
    try {
      const res = await ship(session, { app: 'shipmembers', port: 8722, domain: 'shipmembers.localhost' });
      console.log('[drive] members-area:', JSON.stringify(res.data, null, 1));
      expect(res.isError).toBe(false);
      const r = res.data as DeployToVmResult;
      expect(r).toMatchObject({ ok: true, url: 'https://shipmembers.localhost', secrets: ['drive_probe'], health: 200, appStatus: 200 });
      expect(r.build.functions.length).toBeGreaterThan(0);
      expect(JSON.stringify(r)).not.toContain('stand-in-value');
    } finally {
      await session.close();
    }
    const pid = box('systemctl show -p MainPID --value shipmembers-backend').trim();
    expect(box(`tr '\\0' '\\n' < /proc/${pid}/environ | sed 's/=.*//' | grep NODEGX_SECRET_ || true`).trim()).toBe('NODEGX_SECRET_DRIVE_PROBE');
    const https = execFileSync('curl', ['-sk', '--resolve', 'shipmembers.localhost:8443:127.0.0.1', '-o', '/dev/null', '-w', '%{http_code}', 'https://shipmembers.localhost:8443/'], { encoding: 'utf8' });
    const config = execFileSync('curl', ['-sk', '--resolve', 'shipmembers.localhost:8443:127.0.0.1', 'https://shipmembers.localhost:8443/nodegx-config.json'], { encoding: 'utf8' });
    const admin = execFileSync('curl', ['-sk', '--resolve', 'shipmembers.localhost:8443:127.0.0.1', '-o', '/dev/null', '-w', '%{http_code}', 'https://shipmembers.localhost:8443/_admin'], { encoding: 'utf8' });
    console.log('[drive] https', https, 'config', config, '_admin', admin);
    expect(https).toBe('200');
    expect(config).toContain('https://shipmembers.localhost:8443');
    expect(admin).toBe('404');
  });

  it('todo-list again: the rules unchanged, the account kept', async () => {
    const before = box('sha256sum /var/lib/shiptodo/data/security.json');
    const session = await connect(copyTemplate('todo-list'));
    try {
      const res = await ship(session, { app: 'shiptodo', port: 8721 });
      console.log('[drive] reship provision lines:', JSON.stringify((res.data as DeployToVmResult).provision));
      expect(res.isError).toBe(false);
    } finally {
      await session.close();
    }
    expect(box('sha256sum /var/lib/shiptodo/data/security.json')).toBe(before);
    const login = box(
      `curl -s -w '\\n%{http_code}' -X POST http://127.0.0.1:8721/login -H 'Content-Type: application/json' -d '{"username":"drive@x.io","password":"drive-pass-1"}'`
    );
    console.log('[drive] login after reship', login.split('\n').pop());
    expect(login.split('\n').pop()).toBe('200');
    const token = JSON.parse(login.split('\n')[0]).sessionToken as string;
    const tasks = box(`curl -s http://127.0.0.1:8721/classes/Task -H 'X-Parse-Session-Token: ${token}'`);
    console.log('[drive] tasks after reship', tasks);
    expect(tasks).toContain('shipped by deploy_to_vm');
  });

  it("a port another app holds: provision-app.sh refuses in its own words, and the app holding it keeps running", async () => {
    const session = await connect(copyTemplate('todo-list'));
    try {
      const res = await ship(session, { app: 'shipclash', port: 8721 });
      console.log('[drive] clash:', JSON.stringify(res.data));
      expect(res.isError).toBe(true);
      const error = (res.data as ToolErrorPayload<{ stage: string; said: string[] }>).error;
      expect(error.details).toMatchObject({ stage: 'provision' });
      expect(error.details!.said.join('\n')).toContain('FATAL: port 8721 is taken by something else');
    } finally {
      await session.close();
    }
    expect(box('systemctl is-active shiptodo-backend').trim()).toBe('active');
    expect(box('ls /etc/systemd/system | grep -c shipclash || true').trim()).toBe('0');
  });
});
