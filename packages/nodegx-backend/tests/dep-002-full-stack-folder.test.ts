/**
 * DEP-002 s2 — the full-stack folder: `packageDeploy({ fullStack })` and the `start.js` it puts at
 * the top.
 *
 * The backend here is a stand-in `cli.js` that writes down the arguments it was started with and
 * returns. What `start.js` decides — the port, the functions it installs, whether the project's
 * rules go in, what reaches the backend — is all in those arguments and in `data/`; the real
 * backend serving the folder is graded by dep-002-serve-app.test.ts and by the drive.
 */
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as net from 'net';
import * as os from 'os';
import * as path from 'path';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { packageDeploy, LAUNCHER_FILES } = require('../scripts/package-deploy.js');

jest.setTimeout(60000);

/** The deploy runtime's `serve.js`, whose port rule `start.js` copies. */
const SERVE_JS = path.resolve(__dirname, '..', '..', 'noodl-viewer-react', 'static', 'deploy', 'serve.js');

const FAKE_CLI = `
exports.main = async function main(args) {
  require('fs').writeFileSync(process.env.DEP002_ARGS, JSON.stringify(args));
};
`;

const POLICY = JSON.stringify({ version: 1, devOpen: false, collections: {} });
const WORKFLOW = JSON.stringify({ components: [], settings: {}, metadata: {}, deployFingerprint: 'abc' });

function scratch(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function sources(opts: { policy?: boolean; workflow?: string } = {}) {
  const root = scratch('dep002-src-');
  const app = path.join(root, 'app');
  fs.mkdirSync(app);
  // No serve.js: the launcher does not need the app's runtime to be any particular age.
  fs.writeFileSync(path.join(app, 'index.html'), '<html>the app</html>');
  const cli = path.join(root, 'cli.js');
  fs.writeFileSync(cli, FAKE_CLI);
  const backendFiles: Record<string, string> = {};
  const wf = path.join(root, 'todo-1234.workflow.json');
  fs.writeFileSync(wf, opts.workflow ?? WORKFLOW);
  backendFiles['workflows/todo-1234.workflow.json'] = wf;
  if (opts.policy !== false) {
    const policy = path.join(root, 'nodegx.security.json');
    fs.writeFileSync(policy, POLICY);
    backendFiles['nodegx.security.json'] = policy;
  }
  return { app, cli, backendFiles };
}

function pack(opts: { policy?: boolean; workflow?: string } = {}) {
  const { app, cli, backendFiles } = sources(opts);
  // Real path: start.js names its folder by `__dirname`, which macOS reports under /private/var.
  const outDir = path.join(fs.realpathSync(scratch('dep002-out-')), 'my-app');
  const { manifest } = packageDeploy({
    appDir: app,
    cliPath: cli,
    outDir,
    backendFiles,
    fullStack: true,
    backendVersion: null
  });
  fs.writeFileSync(path.join(outDir, 'package.json'), JSON.stringify({ name: 'todo', nodegx: { name: 'Todo List' } }));
  return { outDir, manifest };
}

function start(outDir: string, args: string[] = [], env: Record<string, string> = {}, nodeFlags: string[] = []) {
  const argsFile = path.join(scratch('dep002-args-'), 'args.json');
  const run = spawnSync(process.execPath, [...nodeFlags, path.join(outDir, 'start.js'), ...args], {
    env: { ...process.env, PORT: '', ...env, DEP002_ARGS: argsFile },
    encoding: 'utf8'
  });
  const started = fs.existsSync(argsFile) ? (JSON.parse(fs.readFileSync(argsFile, 'utf8')) as string[]) : null;
  return { run, started };
}

function valueOf(args: string[], flag: string): string | undefined {
  const at = args.indexOf(flag);
  return at === -1 ? undefined : args[at + 1];
}

function freePort(): Promise<number> {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address() as net.AddressInfo;
      s.close(() => resolve(port));
    });
  });
}

describe('DEP-002 s2 — packageDeploy({ fullStack }) makes a folder a person runs', () => {
  it('puts the launcher at the top, the functions and rules under backend/, and lists every file in the manifest', () => {
    const { outDir, manifest } = pack();
    for (const f of LAUNCHER_FILES) expect(fs.existsSync(path.join(outDir, f))).toBe(true);
    expect(fs.statSync(path.join(outDir, 'start.sh')).mode & 0o111).not.toBe(0);
    expect(fs.existsSync(path.join(outDir, 'backend', 'cli.js'))).toBe(true);
    expect(fs.existsSync(path.join(outDir, 'backend', 'workflows', 'todo-1234.workflow.json'))).toBe(true);
    expect(fs.existsSync(path.join(outDir, 'backend', 'nodegx.security.json'))).toBe(true);
    // The Docker placeholder is not part of a folder whose app is never empty.
    expect(fs.existsSync(path.join(outDir, 'app', '.keep'))).toBe(false);
    expect(manifest.layout).toBe('full-stack');
    const listed = manifest.files.map((f: { path: string }) => f.path);
    expect(listed).toEqual(
      expect.arrayContaining([
        'start.js',
        'start.sh',
        'start.cmd',
        'backend/cli.js',
        'backend/nodegx.security.json',
        'backend/workflows/todo-1234.workflow.json',
        'app/index.html'
      ])
    );
    expect(manifest.endpointAudit.level).toBe('ok');
  });

  it('refuses a cloud function carrying a credential — the scan covers what the backend carries', () => {
    const key = 'sk-ant-' + 'a'.repeat(40);
    expect(() => pack({ workflow: JSON.stringify({ components: [{ apiKey: key }] }) })).toThrow(
      /credential material found[\s\S]*backend\/workflows\/todo-1234\.workflow\.json: Anthropic API key/
    );
  });

  it('refuses a full-stack artifact with no app', () => {
    const { cli } = sources();
    expect(() => packageDeploy({ cliPath: cli, outDir: path.join(scratch('dep002-'), 'x'), fullStack: true })).toThrow(
      /needs --app/
    );
  });
});

describe('DEP-002 s2 — start.js starts the backend with the app beside it', () => {
  it('serves the app from app/, keeps the data in data/, and enforces the rules from the first record', () => {
    const { outDir } = pack();
    const { run, started } = start(outDir);
    expect(run.status).toBe(0);
    expect(started).not.toBeNull();
    const args = started as string[];
    expect(args[0]).toBe('serve');
    expect(valueOf(args, '--serve-app')).toBe(path.join(outDir, 'app'));
    expect(valueOf(args, '--data-dir')).toBe(path.join(outDir, 'data'));
    expect(args).toContain('--enforce-rules');
    expect(valueOf(args, '--project-dir')).toBe(path.join(outDir, 'backend'));
    expect(valueOf(args, '--backend-name')).toBe('Todo List');
    expect(Number(valueOf(args, '--port'))).toBeGreaterThanOrEqual(3000);
  });

  it('installs the project rules only when the project ships them', () => {
    const { outDir } = pack({ policy: false });
    const { started } = start(outDir);
    expect(started).not.toContain('--project-dir');
    expect(started).toContain('--enforce-rules');
  });

  it('takes the port asked for, by flag or by PORT, and passes every other option to the backend', async () => {
    const { outDir } = pack();
    const port = await freePort();
    const byFlag = start(outDir, ['--port', String(port), '--no-admin']).started as string[];
    expect(byFlag.filter((a) => a === '--port')).toHaveLength(1);
    expect(valueOf(byFlag, '--port')).toBe(String(port));
    expect(byFlag).toContain('--no-admin');
    const byEnv = start(outDir, [], { PORT: String(port) }).started as string[];
    expect(valueOf(byEnv, '--port')).toBe(String(port));
  });

  it('stops with a sentence when the port asked for is taken, and starts nothing', async () => {
    const { outDir } = pack();
    const holder = net.createServer();
    await new Promise<void>((resolve) => holder.listen(0, '127.0.0.1', resolve));
    const { port } = holder.address() as net.AddressInfo;
    try {
      const { run, started } = start(outDir, ['--port', String(port)]);
      expect(run.status).toBe(1);
      expect(run.stderr).toContain(`Port ${port} is already in use`);
      expect(started).toBeNull();
      // The rule is a copy of the deploy runtime's serve.js (see start.js): the same refusal, word for word.
      const serve = spawnSync(process.execPath, [SERVE_JS, '--port', String(port)], {
        cwd: path.join(outDir, 'app'),
        env: { ...process.env, PORT: '' },
        encoding: 'utf8',
        timeout: 15000
      });
      const refusal = (text: string) =>
        text.split('\n').filter((line) => /already in use|Leave the port out/.test(line));
      expect(refusal(serve.stderr + serve.stdout)).toHaveLength(2);
      expect(refusal(run.stderr)).toEqual(refusal(serve.stderr + serve.stdout));
    } finally {
      holder.close();
    }
  });

  it("replaces the previous deploy's cloud functions and touches nothing else in data/", () => {
    const { outDir } = pack();
    const installed = path.join(outDir, 'data', 'workflows');
    fs.mkdirSync(installed, { recursive: true });
    fs.writeFileSync(path.join(installed, 'deleted-from-the-project.workflow.json'), '{}');
    fs.writeFileSync(path.join(outDir, 'data', 'local.db'), 'the records');
    const { run } = start(outDir);
    expect(run.stdout).toContain('cloud functions: installed backend/workflows/todo-1234.workflow.json');
    expect(fs.readdirSync(installed).sort()).toEqual(['todo-1234.workflow.json']);
    expect(fs.readFileSync(path.join(installed, 'todo-1234.workflow.json'), 'utf8')).toBe(WORKFLOW);
    expect(fs.readFileSync(path.join(outDir, 'data', 'local.db'), 'utf8')).toBe('the records');
  });

  it('keeps the data in the --data-dir given (a server with a read-only app folder), never in a second data/', () => {
    const { outDir } = pack();
    for (const form of ['spaced', 'equals']) {
      const dataDir = path.join(fs.realpathSync(scratch('dep002-var-')), 'data');
      const flag = form === 'spaced' ? ['--data-dir', dataDir] : [`--data-dir=${dataDir}`];
      const { run, started } = start(outDir, [...flag, '--no-admin']);
      expect(run.status).toBe(0);
      const args = started as string[];
      expect(args.filter((a) => a === '--data-dir' || a.startsWith('--data-dir='))).toEqual(['--data-dir']);
      expect(valueOf(args, '--data-dir')).toBe(dataDir);
      expect(args).toContain('--no-admin');
      expect(fs.readdirSync(path.join(dataDir, 'workflows'))).toEqual(['todo-1234.workflow.json']);
      expect(fs.existsSync(path.join(outDir, 'data'))).toBe(false);
    }
  });

  it('refuses a data folder whose access rules are switched off (devOpen: true), and starts nothing', () => {
    const { outDir } = pack();
    const data = path.join(outDir, 'data');
    fs.mkdirSync(data, { recursive: true });
    const security = path.join(data, 'security.json');
    // The control: the same file with the rules on starts.
    fs.writeFileSync(security, JSON.stringify({ version: 1, devOpen: false, collections: {} }));
    expect(start(outDir).started).not.toBeNull();
    fs.writeFileSync(security, JSON.stringify({ version: 1, devOpen: true, collections: {} }, null, 2));
    for (const args of [[], ['--data-dir', data]]) {
      const { run, started } = start(outDir, args);
      expect(run.status).toBe(1);
      expect(run.stderr).toContain(`access rules are switched off: ${security} has "devOpen": true`);
      expect(started).toBeNull();
    }
    // The file is the operator's: a refusal leaves it as it was.
    expect(fs.readFileSync(security, 'utf8')).toContain('"devOpen": true');
  });

  it('says which Node it needs when this one cannot keep the data, and starts nothing', () => {
    const { outDir } = pack();
    // The control: the same folder starts under this Node.
    expect(start(outDir).started).not.toBeNull();
    const { run, started } = start(outDir, [], {}, ['--no-experimental-sqlite']);
    expect(run.status).toBe(1);
    expect(run.stderr).toContain('This app needs Node.js 22.13 or later');
    expect(run.stderr).toContain(process.version);
    expect(started).toBeNull();
  });
});
