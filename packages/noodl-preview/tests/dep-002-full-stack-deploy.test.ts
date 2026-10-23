/**
 * P26 DEP-002 s2 — `nodegx-deploy --full-stack`: the app and its backend as one folder.
 *
 * Spawns the BUILT engine, as `ship-to-vm.sh` and `nodegx deploy` do, on copies of two templates:
 * members-area (eight cloud functions, its own access rules) and todo-list with its rules removed.
 * The backend bundle is a stand-in file (`NODEGX_BACKEND_ENTRY`): what is graded here is what the
 * deploy puts where, not the backend — dep-002-serve-app.test.ts and the s2 drive grade that.
 */
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const PKG_ROOT = path.resolve(__dirname, '..');
const REPO = path.resolve(PKG_ROOT, '../..');
const ENGINE_BUNDLE = path.join(PKG_ROOT, 'dist/nodegx-deploy.cjs');
const FIX_SOURCES = [
  path.join(PKG_ROOT, 'src/fullStack.ts'),
  path.join(PKG_ROOT, 'src/deploy.ts'),
  path.join(PKG_ROOT, 'src/deploy-cli.ts'),
  path.join(REPO, 'packages/nodegx-backend/scripts/package-deploy.js'),
  path.join(REPO, 'packages/noodl-editor/src/editor/src/utils/compilation/build/deploy-guide.ts'),
  path.join(REPO, 'packages/noodl-editor/src/editor/src/utils/compilation/build/deployer.ts')
];

jest.setTimeout(240_000);

interface Report {
  ok: boolean;
  stage?: string;
  message?: string;
  files?: string[];
  blank?: string | null;
  fullStack?: {
    uses: { records: boolean; users: boolean; files: boolean; functions: string[] };
    functionFailures: { name: string; reason: string }[];
    rules: boolean;
    buildId: string;
  };
}

let work: string;
let fakeCli: string;

function copyTemplate(template: string, arm: string): string {
  const dir = path.join(work, arm, 'project');
  fs.cpSync(path.join(REPO, 'templates', template), dir, { recursive: true });
  return dir;
}

function deploy(projectDir: string, outDir: string, flags: string[] = ['--full-stack']) {
  // `--allow-development-engine`: a working checkout's viewer runtime is the dev build; the folder is
  // a temp dir and is never uploaded.
  const run = spawnSync(process.execPath, [ENGINE_BUNDLE, projectDir, outDir, ...flags, '--allow-development-engine'], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, NODEGX_BACKEND_ENTRY: fakeCli }
  });
  return { run, report: JSON.parse(run.stdout) as Report };
}

const read = (...p: string[]) => fs.readFileSync(path.join(...p), 'utf8');

beforeAll(() => {
  if (!fs.existsSync(ENGINE_BUNDLE)) {
    throw new Error(`Missing ${ENGINE_BUNDLE}. Build it: npm --prefix packages/noodl-preview run build`);
  }
  const bundleTime = fs.statSync(ENGINE_BUNDLE).mtimeMs;
  const newer = FIX_SOURCES.filter((f) => fs.statSync(f).mtimeMs > bundleTime);
  if (newer.length > 0) {
    throw new Error(
      `${ENGINE_BUNDLE} is older than ${newer.join(', ')}, so it would grade a stale deploy. ` +
        'Rebuild it: node packages/noodl-preview/build.mjs --deploy-only'
    );
  }
  work = fs.mkdtempSync(path.join(os.tmpdir(), 'dep002-engine-'));
  fakeCli = path.join(work, 'cli.js');
  fs.writeFileSync(fakeCli, 'exports.main = async () => {};\n');
});

afterAll(() => {
  if (work) fs.rmSync(work, { recursive: true, force: true });
});

describe('DEP-002 s2 — nodegx-deploy --full-stack', () => {
  let outDir: string;
  let report: Report;
  let stdout: string;

  beforeAll(() => {
    const projectDir = copyTemplate('members-area', 'members');
    outDir = path.join(work, 'members', 'folder');
    const deployed = deploy(projectDir, outDir);
    report = deployed.report;
    stdout = deployed.run.stdout;
  });

  it('writes the app, the backend, the launcher and the guide, and reports one line of JSON', () => {
    expect(report.message).toBeUndefined();
    expect(report.ok).toBe(true);
    expect(stdout.trim().split('\n')).toHaveLength(1);
    expect(report.files).toEqual(
      ['DEPLOY.md', 'MANIFEST.json', 'app', 'backend', 'package.json', 'start.cmd', 'start.js', 'start.sh'].sort()
    );
    expect(report.blank).toBeNull();
    expect(fs.existsSync(path.join(outDir, 'app', 'index.html'))).toBe(true);
    expect(read(outDir, 'backend', 'cli.js')).toBe(read(fakeCli));
    expect(JSON.parse(read(outDir, 'MANIFEST.json')).layout).toBe('full-stack');
    expect(JSON.parse(read(outDir, 'package.json')).scripts).toEqual({ start: 'node start.js' });
  });

  it("keeps the app's backend address file, and no second guide inside app/", () => {
    expect(fs.existsSync(path.join(outDir, 'app', 'nodegx-config.json'))).toBe(true);
    expect(fs.existsSync(path.join(outDir, 'app', 'DEPLOY.md'))).toBe(false);
    expect(fs.existsSync(path.join(outDir, 'app', 'package.json'))).toBe(false);
  });

  it("carries the project's rules beside the backend, never in the app", () => {
    expect(report.fullStack?.rules).toBe(true);
    expect(read(outDir, 'backend', 'nodegx.security.json')).toBe(
      read(work, 'members', 'project', 'nodegx.security.json')
    );
    expect(fs.existsSync(path.join(outDir, 'app', 'nodegx.security.json'))).toBe(false);
  });

  it('builds every cloud function into one bundle in backend/workflows/, and names them in DEPLOY.md', () => {
    expect(report.fullStack?.uses.functions).toEqual([
      'claimAssociation',
      'decideMembership',
      'myNotifySetting',
      'myStanding',
      'notifyMembers',
      'requestAccess',
      'setNotifySetting',
      'unsubscribe'
    ]);
    expect(report.fullStack?.functionFailures).toEqual([]);
    const bundles = fs.readdirSync(path.join(outDir, 'backend', 'workflows'));
    expect(bundles).toHaveLength(1);
    expect(bundles[0]).toMatch(/\.workflow\.json$/);
    const bundle = JSON.parse(read(outDir, 'backend', 'workflows', bundles[0]));
    expect(typeof bundle.deployFingerprint).toBe('string');
    expect(bundle.components.map((c: { name: string }) => c.name)).toContain('/#__cloud__/myStanding');
    // The functions are the backend's, not the app's.
    const appText = fs
      .readdirSync(path.join(outDir, 'app', 'noodl_bundles'))
      .map((f) => read(outDir, 'app', 'noodl_bundles', f));
    expect(appText.join('\n')).not.toContain('/#__cloud__/myStanding');
    expect(read(outDir, 'DEPLOY.md')).toContain('**Cloud functions** (8): `claimAssociation`');
  });

  it('a redeploy replaces app/ and backend/ and leaves data/ exactly as it was', () => {
    fs.mkdirSync(path.join(outDir, 'data', 'data'), { recursive: true });
    fs.writeFileSync(path.join(outDir, 'data', 'data', 'local.db'), 'the records');
    fs.writeFileSync(path.join(outDir, 'data', 'secrets.json'), '{"adminToken":"x"}');
    fs.writeFileSync(path.join(outDir, 'app', 'index-from-the-last-deploy.js'), 'old');
    const again = deploy(path.join(work, 'members', 'project'), outDir).report;
    expect(again.ok).toBe(true);
    expect(again.fullStack?.buildId).toBe(report.fullStack?.buildId);
    expect(read(outDir, 'data', 'data', 'local.db')).toBe('the records');
    expect(read(outDir, 'data', 'secrets.json')).toBe('{"adminToken":"x"}');
    expect(fs.existsSync(path.join(outDir, 'app', 'index-from-the-last-deploy.js'))).toBe(false);
  });

  it('refuses a folder that holds anything but an earlier full-stack deploy, and writes nothing', () => {
    const theirs = path.join(work, 'theirs');
    fs.mkdirSync(path.join(theirs, 'app'), { recursive: true });
    fs.writeFileSync(path.join(theirs, 'app', 'mine.txt'), 'keep');
    const refused = deploy(path.join(work, 'members', 'project'), theirs).report;
    expect(refused.ok).toBe(false);
    expect(refused.stage).toBe('target');
    expect(refused.message).toContain('not a full-stack deploy');
    expect(fs.readdirSync(theirs)).toEqual(['app']);
    expect(read(theirs, 'app', 'mine.txt')).toBe('keep');
  });
});

describe('DEP-002 s2 — a project with no rules of its own', () => {
  it('carries none, and its guide leads with what a visitor who is not signed in can read', () => {
    const projectDir = copyTemplate('todo-list', 'todo');
    fs.rmSync(path.join(projectDir, 'nodegx.security.json'));
    const outDir = path.join(work, 'todo', 'folder');
    const { report } = deploy(projectDir, outDir);
    expect(report.ok).toBe(true);
    expect(report.fullStack?.rules).toBe(false);
    expect(report.fullStack?.uses).toEqual({ records: true, users: true, files: false, functions: [] });
    expect(fs.existsSync(path.join(outDir, 'backend', 'nodegx.security.json'))).toBe(false);
    expect(fs.existsSync(path.join(outDir, 'backend', 'workflows'))).toBe(false);
    const guide = read(outDir, 'DEPLOY.md');
    expect(guide).toContain('Read this before you open the app.');
    expect(guide.indexOf('Read this before you open the app.')).toBeLessThan(guide.indexOf('## Start it'));
  });
});

describe('DEP-002 s2 — without --full-stack nothing changes', () => {
  it('writes the static site, with its own guide and package.json at the top', () => {
    const projectDir = copyTemplate('todo-list', 'static');
    const outDir = path.join(work, 'static', 'folder');
    const { report } = deploy(projectDir, outDir, []);
    expect(report.ok).toBe(true);
    expect(report.fullStack).toBeUndefined();
    expect(fs.existsSync(path.join(outDir, 'index.html'))).toBe(true);
    expect(read(outDir, 'DEPLOY.md')).toContain('node serve.js');
    expect(JSON.parse(read(outDir, 'package.json')).scripts).toEqual({ start: 'node serve.js' });
    expect(fs.existsSync(path.join(outDir, 'nodegx-config.json'))).toBe(true);
    expect(fs.existsSync(path.join(outDir, 'start.js'))).toBe(false);
  });
});
