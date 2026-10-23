/**
 * P26 DEP-002 s4 — `deploy_to_vm`.
 *
 * The glue is graded here with a fake runner standing in for `ssh` and the engine: every call is recorded, so the
 * ORDER (nothing reaches the box before the box is checked and the folder is built), the refusals (each one stops
 * before the next step) and the one secrecy property (a secret's value travels on stdin, never in an argument list)
 * are assertions rather than hopes. What a fake cannot grade — that the box ends up running the app — is graded by
 * driving the tool against the throwaway VM container (DEP-002 "Session 4").
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Readable } from 'stream';

import { ToolError } from '../src/errors';
import {
  checkRequest,
  deployToVm,
  describeSshFailure,
  resolveDeployEngine,
  resolveProvisionScript,
  untouchedSkeletonPages,
  type DeployDeps,
  type DeployToVmRequest,
  type RunOptions,
  type RunResult
} from '../src/tools/deployToVm';
import { ProjectStore } from '../src/project/ProjectStore';
import { writeProjectSkeleton } from '../src/tools/createProject';
import type { ToolErrorPayload } from '../src/tools/responses';
import { call, connect, copyFixture, reveal } from './helpers';

interface Recorded {
  command: string;
  args: string[];
  input: string;
}

const ok = (stdout = ''): RunResult => ({ code: 0, stdout, stderr: '', timedOut: false });

const REPORT = {
  ok: true,
  projectName: 'Members',
  written: ['a', 'b', 'c'],
  fullStack: { buildId: 'b-1', functionFailures: [], uses: { functions: ['myStanding'] }, rules: { version: 1 } }
};

const PROBE_ROOT = 'uid=0\nnode=v22.13.1\nsystemctl=yes\nrsync=yes\ncurl=yes\ncaddy=yes\nsudo=yes\n';

/** A box that answers like the throwaway VM did, unless a step is overridden. */
function fakeBox(overrides: Partial<Record<'probe' | 'engine' | 'stage' | 'provision' | 'secrets' | 'up', RunResult>> = {}) {
  const calls: Recorded[] = [];
  const run = async (command: string, args: string[], options: RunOptions): Promise<RunResult> => {
    let input = '';
    if (typeof options.input === 'string') input = options.input;
    else if (options.input) for await (const chunk of options.input) input += chunk;
    calls.push({ command, args, input });
    if (command !== 'ssh') return overrides.engine ?? ok('a copy report on stdout\n' + JSON.stringify(REPORT) + '\n');
    const remote = args[args.length - 1];
    if (remote.includes('id -u')) return overrides.probe ?? ok(PROBE_ROOT);
    if (remote.includes('tar -xzf')) return overrides.stage ?? ok();
    if (remote.includes('bash -s')) return overrides.provision ?? ok('    [start] installing the project\'s rules\n==> provisioned shipapp on 127.0.0.1:8720\n');
    if (remote.includes('secrets.env')) return overrides.secrets ?? ok();
    if (remote.includes('/health')) return overrides.up ?? ok('health=200\napp=200\n');
    throw new Error(`unexpected remote command ${remote}`);
  };
  const deps: DeployDeps = {
    run,
    tar: () => ({ stream: Readable.from(['TARBYTES']), done: Promise.resolve({ code: 0, stderr: '' }) }),
    engine: { command: '/usr/bin/node', args: ['/x/nodegx-deploy.cjs'], via: 'env' },
    provisionScript: resolveProvisionScript(path.join(__dirname, '..', 'src', 'tools'))
  };
  const remotes = () => calls.filter((c) => c.command === 'ssh').map((c) => c.args[c.args.length - 1]);
  return { calls, deps, remotes };
}

const request = (extra: Partial<DeployToVmRequest> = {}): DeployToVmRequest => ({
  projectDir: '/projects/members',
  host: 'root@203.0.113.7',
  app: 'shipapp',
  port: 8720,
  ...extra
});

async function refusal(promise: Promise<unknown>): Promise<ToolError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof ToolError) return error;
    throw error;
  }
  throw new Error('expected a refusal');
}

describe('DEP-002 s4 — deploy_to_vm, the glue', () => {
  it('ships in order: the box checked, the folder built, staged, provisioned, the secrets, then up', async () => {
    const box = fakeBox();
    const secrets = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'dep002s4-')), 'secrets.json');
    fs.writeFileSync(secrets, JSON.stringify({ adminToken: 'not-this', functions: { stripe_key: 'sk_live_SECRETVALUE' } }));
    const result = await deployToVm(request({ secretsFile: secrets }), box.deps);

    expect(box.calls.map((c) => (c.command === 'ssh' ? 'ssh' : 'engine'))).toEqual(['ssh', 'engine', 'ssh', 'ssh', 'ssh', 'ssh']);
    const [probe, stage, provision, write, up] = box.remotes();
    expect(probe).toContain('id -u');
    expect(stage).toBe('rm -rf /tmp/shipapp-provision && mkdir -p /tmp/shipapp-provision && tar -xzf - -C /tmp/shipapp-provision');
    expect(box.calls[2].input).toBe('TARBYTES');
    expect(provision).toBe('env APP=shipapp PORT=8720 DOMAIN= CADDY=off bash -s');
    // The script that runs is the one file, sent whole.
    expect(box.calls[3].input).toBe(fs.readFileSync(box.deps.provisionScript, 'utf8'));
    expect(box.calls[3].input).toContain('start.js" --check');
    expect(write).toContain('cat > /etc/shipapp/secrets.env');
    expect(write).toContain('systemctl restart shipapp-backend');
    expect(box.calls[4].input).toBe('NODEGX_SECRET_STRIPE_KEY=sk_live_SECRETVALUE\n');
    expect(up).toContain('http://127.0.0.1:8720/health');

    // 🔴 The value travels on stdin only: in no argument list, and not in the result.
    for (const c of box.calls) expect(c.args.join(' ')).not.toContain('SECRETVALUE');
    expect(JSON.stringify(result)).not.toContain('SECRETVALUE');
    expect(JSON.stringify(result)).not.toContain('not-this');

    // The engine is asked for the full-stack folder of THIS project.
    expect(box.calls[1].args.slice(-3)).toEqual(['/projects/members', expect.stringMatching(/shipapp$/), '--full-stack']);
    // ssh can never stop to ask: no password prompt, a new host trusted once, a changed one refused.
    expect(box.calls[0].args.slice(0, 6)).toEqual(['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=15', '-o', 'StrictHostKeyChecking=accept-new']);

    expect(result).toMatchObject({
      ok: true,
      url: null,
      secrets: ['stripe_key'],
      health: 200,
      appStatus: 200,
      build: { projectName: 'Members', buildId: 'b-1', files: 3, functions: ['myStanding'], rules: 'project', engine: 'env' }
    });
    expect(result.see).toBe('ssh -L 8720:127.0.0.1:8720 root@203.0.113.7   then open http://localhost:8720');
    expect(result.provision).toEqual(["[start] installing the project's rules", '==> provisioned shipapp on 127.0.0.1:8720']);
  });

  it('a domain turns Caddy on and the URL is https; ssh_key and ssh_port reach every ssh call', async () => {
    const box = fakeBox();
    const key = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'dep002s4-')), 'id_ed25519');
    fs.writeFileSync(key, 'k');
    const result = await deployToVm(request({ domain: 'app.example.com', sshKey: key, sshPort: 22722 }), box.deps);
    expect(box.remotes()[2]).toBe('env APP=shipapp PORT=8720 DOMAIN=app.example.com CADDY=on bash -s');
    for (const c of box.calls.filter((c) => c.command === 'ssh')) {
      expect(c.args).toEqual(expect.arrayContaining(['-i', key, '-p', '22722']));
    }
    expect(result.url).toBe('https://app.example.com');
    expect(result.see).toBeUndefined();
    // No secrets file: an empty one is written, which clears any the project no longer has.
    expect(box.calls[4].input).toBe('');
  });

  it('a login that is not root runs every root step through passwordless sudo', async () => {
    const box = fakeBox({ probe: ok(PROBE_ROOT.replace('uid=0', 'uid=1000')) });
    await deployToVm(request({ host: 'ubuntu@203.0.113.7' }), box.deps);
    const [, stage, provision, write, up] = box.remotes();
    expect(stage.startsWith('sudo -n rm -rf ')).toBe(true);
    expect(provision.startsWith('sudo -n env APP=')).toBe(true);
    expect(write.startsWith("sudo -n sh -c '")).toBe(true);
    expect(up.startsWith('sudo')).toBe(false);
  });

  it('a refused login stops at the first call and names ssh-copy-id; nothing is built', async () => {
    const box = fakeBox({ probe: { code: 255, stdout: '', stderr: 'root@203.0.113.7: Permission denied (publickey).\n', timedOut: false } });
    const error = await refusal(deployToVm(request(), box.deps));
    expect(error.code).toBe('deploy-failed');
    expect(error.data).toMatchObject({ stage: 'connect' });
    expect(error.message).toContain('ssh-copy-id root@203.0.113.7');
    expect(box.calls).toHaveLength(1);
  });

  it('a changed host key is said, never bypassed', () => {
    expect(describeSshFailure('nexus', '@@@ WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED! @@@\nHost key verification failed.')).toContain('different host key');
    expect(describeSshFailure('nexus', 'ssh: Could not resolve hostname nexus')).toContain('Could not reach nexus');
  });

  it('a box without what the app needs is refused before the build, with every missing thing named', async () => {
    const box = fakeBox({ probe: ok('uid=1000\nnode=v20.11.0\nsystemctl=yes\nrsync=no\ncurl=yes\ncaddy=no\nsudo=no\n') });
    const error = await refusal(deployToVm(request({ domain: 'app.example.com' }), box.deps));
    expect(error.data).toMatchObject({ stage: 'box' });
    expect(error.message).toContain('Node 22.13 or later (it has v20.11.0)');
    expect(error.message).toContain('rsync');
    expect(error.message).toContain('Caddy');
    expect(error.message).toContain('passwordless sudo');
    expect(box.calls).toHaveLength(1);
  });

  it('Node 22.13 passes and 22.12 does not', async () => {
    for (const [node, passes] of [['v22.13.0', true], ['v22.12.0', false], ['v24.1.0', true]] as const) {
      const box = fakeBox({ probe: ok(PROBE_ROOT.replace('v22.13.1', node)) });
      const outcome = await deployToVm(request(), box.deps).then(() => 'shipped', (e: ToolError) => e.data?.stage);
      expect([node, outcome]).toEqual([node, passes ? 'shipped' : 'box']);
    }
  });

  it('a cloud function that would not build refuses the ship by name; nothing reaches the box', async () => {
    const report = { ...REPORT, fullStack: { ...REPORT.fullStack, functionFailures: [{ name: 'chargeCard', reason: 'a key in the source' }] } };
    const box = fakeBox({ engine: ok(JSON.stringify(report)) });
    const error = await refusal(deployToVm(request(), box.deps));
    expect(error.data).toMatchObject({ stage: 'build' });
    expect(error.message).toContain('chargeCard: a key in the source');
    expect(box.remotes()).toHaveLength(1);
  });

  it('an engine refusal, an engine with no full-stack folder and an engine with no report are three sentences', async () => {
    const refused = await refusal(deployToVm(request(), fakeBox({ engine: ok(JSON.stringify({ ok: false, stage: 'project', message: 'No renderable root node' })) }).deps));
    expect(refused.message).toBe('The deploy refused (project): No renderable root node');
    const old = await refusal(deployToVm(request(), fakeBox({ engine: ok(JSON.stringify({ ...REPORT, fullStack: undefined })) }).deps));
    expect(old.message).toContain('predates DEP-002');
    const silent = await refusal(deployToVm(request(), fakeBox({ engine: { code: 1, stdout: '', stderr: 'boom\n', timedOut: false } }).deps));
    expect(silent.message).toContain('gave no report');
    expect(silent.data).toMatchObject({ said: ['boom'] });
  });

  it("provision-app.sh's refusal comes back in its own words, and the secrets are never sent", async () => {
    const box = fakeBox({
      provision: { code: 1, stdout: '    [start] refused: rules switched off\n', stderr: 'FATAL: refused before anything was changed: the app that is running now keeps running as it is.\n', timedOut: false }
    });
    const error = await refusal(deployToVm(request(), box.deps));
    expect(error.data).toMatchObject({ stage: 'provision' });
    expect((error.data as { said: string[] }).said).toEqual([
      '    [start] refused: rules switched off',
      'FATAL: refused before anything was changed: the app that is running now keeps running as it is.'
    ]);
    expect(box.remotes()).toHaveLength(3);
  });

  it('installed but not answering is a failure, not a URL', async () => {
    const error = await refusal(deployToVm(request(), fakeBox({ up: ok('health=200\napp=404\n') }).deps));
    expect(error.data).toMatchObject({ stage: 'up' });
    expect(error.message).toContain('the app 404');
  });

  it('a secret with a line break is refused before anything runs', async () => {
    const box = fakeBox();
    const secrets = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'dep002s4-')), 'secrets.json');
    fs.writeFileSync(secrets, JSON.stringify({ functions: { pem: 'line1\nline2' } }));
    const error = await refusal(deployToVm(request({ secretsFile: secrets }), box.deps));
    expect(error.message).toContain('pem holds a line break');
    expect(box.calls).toHaveLength(0);
  });

  it('every value that reaches the box shell is checked first', () => {
    const bad: [Partial<DeployToVmRequest>, string][] = [
      [{ host: '-oProxyCommand=touch /tmp/x' }, 'host'],
      [{ host: 'root@host;reboot' }, 'host'],
      [{ app: 'Lingo' }, 'app'],
      [{ app: 'a;rm' }, 'app'],
      [{ port: 80 }, 'port'],
      [{ port: 8720.5 }, 'port'],
      [{ domain: 'https://app.example.com' }, 'domain'],
      [{ domain: 'app.example.com; reboot' }, 'domain'],
      [{ sshPort: 0 }, 'ssh_port'],
      [{ sshKey: '/no/such/key' }, 'ssh_key']
    ];
    for (const [extra, field] of bad) {
      expect(() => checkRequest(request(extra))).toThrow(new RegExp(`^${field}`));
    }
    for (const host of ['root@203.0.113.7', 'nexus', 'ubuntu@app.example.com']) expect(() => checkRequest(request({ host }))).not.toThrow();
  });
});

describe('DEP-002 s4 — what it runs', () => {
  it('NODEGX_DEPLOY_CLI that points at nothing is refused, never fallen through', () => {
    expect(() => resolveDeployEngine({ NODEGX_DEPLOY_CLI: '/no/such/engine.cjs' })).toThrow('there is nothing there');
  });

  it('with no engine on disk, npx runs @nodegx/preview (or NODEGX_PREVIEW_PKG)', () => {
    const bare = fs.mkdtempSync(path.join(os.tmpdir(), 'dep002s4-bare-'));
    expect(resolveDeployEngine({}, bare)).toMatchObject({ via: 'npx', args: ['-y', '--package', '@nodegx/preview@latest', 'nodegx-deploy'] });
    expect(resolveDeployEngine({ NODEGX_PREVIEW_PKG: '/tmp/p.tgz' }, bare).args[2]).toBe('/tmp/p.tgz');
  });

  it('the provision script is found from an install (dist/backend/vm) and from a checkout', () => {
    const dist = fs.mkdtempSync(path.join(os.tmpdir(), 'dep002s4-dist-'));
    fs.mkdirSync(path.join(dist, 'backend', 'vm'), { recursive: true });
    fs.writeFileSync(path.join(dist, 'backend', 'vm', 'provision-app.sh'), '#!/bin/bash\n');
    expect(resolveProvisionScript(dist)).toBe(path.join(dist, 'backend', 'vm', 'provision-app.sh'));
    expect(resolveProvisionScript(path.join(__dirname, '..', 'src', 'tools'))).toBe(
      path.resolve(__dirname, '..', '..', 'nodegx-backend', 'deploy', 'vm', 'provision-app.sh')
    );
    expect(() => resolveProvisionScript(fs.mkdtempSync(path.join(os.tmpdir(), 'dep002s4-none-')))).toThrow('no provision-app.sh');
  });
});

describe('DEP-002 s4 — the tool on the server', () => {
  it('is reached from find_tools on a writing server, refuses a bad name before anything runs, and is absent read-only', async () => {
    const session = await connect(copyFixture());
    try {
      await reveal(session, 'project');
      const listed = (await session.client.listTools()).tools.map((t) => t.name);
      expect(listed).toContain('deploy_to_vm');
      const res = await call<ToolErrorPayload>(session, 'deploy_to_vm', { host: 'root@203.0.113.7', app: 'Bad Name', port: 8720 });
      expect(res.isError).toBe(true);
      expect(res.data.error.code).toBe('invalid-argument');
      expect(res.data.error.message).toContain('app "Bad Name"');
    } finally {
      await session.close();
    }
    const readOnly = await connect(copyFixture(), false);
    try {
      await reveal(readOnly, 'project');
      expect((await readOnly.client.listTools()).tools.map((t) => t.name)).not.toContain('deploy_to_vm');
    } finally {
      await readOnly.close();
    }
  });
});

describe('P26-SKELSHIP — a project with nothing built is not shipped', () => {
  it('refuses before the box is touched, naming the placeholder pages and the way on', async () => {
    const box = fakeBox();
    const err = await deployToVm(request({ skeletonPages: ['Pages/Home'] }), box.deps).catch((e) => e);
    expect(err).toBeInstanceOf(ToolError);
    expect(err.message).toMatch(/^Nothing is built in this project yet: Pages\/Home is still the placeholder/);
    expect(err.message).toMatch(/nothing was sent/);
    expect(err.message).toMatch(/allow_empty/);
    expect(box.calls).toHaveLength(0);
  });

  it('ships it with allow_empty, and ships a built project without asking (control)', async () => {
    const fixture = fakeBox();
    await deployToVm(request({ skeletonPages: ['Pages/Home'], allowEmpty: true }), fixture.deps);
    expect(fixture.remotes().some((r) => r.includes('bash -s'))).toBe(true);
    const built = fakeBox();
    await deployToVm(request({ skeletonPages: [] }), built.deps);
    expect(built.remotes().some((r) => r.includes('bash -s'))).toBe(true);
  });

  it('reads the pages: every one the untouched placeholder, or any one built', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'skelship-'));
    try {
      writeProjectSkeleton(dir, 'Lingo');
      expect(untouchedSkeletonPages(new ProjectStore(dir))).toEqual(['Pages/Home']);
      const file = path.join(dir, 'components/Pages/Home/nodes.json');
      const nodes = JSON.parse(fs.readFileSync(file, 'utf8'));
      nodes.nodes[1].parameters.text = 'Welcome to Lingo';
      fs.writeFileSync(file, JSON.stringify(nodes));
      expect(untouchedSkeletonPages(new ProjectStore(dir))).toEqual([]);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
