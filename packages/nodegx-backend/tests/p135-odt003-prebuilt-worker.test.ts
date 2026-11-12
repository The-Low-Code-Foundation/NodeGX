/**
 * P135 ODT-003 — the deploy runs where there is no bundler: Claude Desktop's extension, which is `@nodegx/mcp` and
 * `@nodegx/preview` with a Node binary (no npm, no esbuild, no backend source; P135 README §3 row 1).
 *
 * `noodl-mcp/build-cloudflare-copy.mjs` (the pack) builds the deploy and the Worker once. This copies the two files,
 * with the cloud-function bundler an install already has, into a folder of the system's temp dir, where nothing
 * resolves `esbuild` and no `packages/` is above, and runs the deploy from there:
 *   - the dry run of Fixture C goes the whole way, and the Worker it would upload is the prebuilt one, byte for byte,
 *     with the app's two modules beside it
 *   - a prebuilt Worker that is not there is refused in words
 *   - with no `nodegx deploy` command, the site is built by the engine itself (`NODEGX_DEPLOY_CLI`), and the engine's
 *     refusals stop the deploy: a refused viewer (with the hint), a blank site, no report at all
 */
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const PACKAGES = path.resolve(__dirname, '..', '..');
const REPO = path.resolve(PACKAGES, '..');
const FIXTURE = path.join(REPO, 'dev-docs', 'tasks', 'phase-115-online-on-your-own-account', 'fixtures', 'c-campus');
const CHECKOUT_ENGINE = path.join(PACKAGES, 'noodl-preview', 'dist', 'nodegx-deploy.cjs');
const CLOUD_BUNDLE = path.join(PACKAGES, 'noodl-mcp', 'dist', 'cloud-bundle.cjs');

let tmp: string;
let kit: string;

beforeAll(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'odt003-'));
  kit = path.join(tmp, 'kit');
  const built = spawnSync(process.execPath, [path.join(PACKAGES, 'noodl-mcp', 'build-cloudflare-copy.mjs'), '--out', kit], { encoding: 'utf8' });
  if (built.status !== 0) throw new Error(`build-cloudflare-copy failed:\n${built.stdout}${built.stderr}`);
  fs.copyFileSync(CLOUD_BUNDLE, path.join(kit, 'cloud-bundle.cjs'));
  fs.copyFileSync(path.join(PACKAGES, 'noodl-mcp', 'dist', 'package.json'), path.join(kit, 'package.json'));
}, 180_000);

afterAll(() => {
  if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
});

/** The deploy from the kit folder, as an install runs it: the env the extension (or ODT-004's tool) sets. */
function deploy(args: string[], env: Record<string, string>) {
  const out = fs.mkdtempSync(path.join(tmp, 'out-'));
  const childEnv: NodeJS.ProcessEnv = {
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    NODEGX_CLOUDFLARE_HOME: path.join(out, 'home'),
    NODEGX_CLOUDFLARE_WORKER: path.join(kit, 'worker.mjs'),
    NODEGX_CLOUD_BUNDLE: path.join(kit, 'cloud-bundle.cjs'),
    NODEGX_DEPLOY_CLI: CHECKOUT_ENGINE,
    ...env
  };
  const script =
    "let esbuild = 'none'; try { require.resolve('esbuild'); esbuild = 'found'; } catch {} console.log('esbuild: ' + esbuild);" +
    `require('./deploy.cjs').main(${JSON.stringify([FIXTURE, '--dry-run', '--name', 'odt003-test', '--out', path.join(out, 'dep'), ...args])})` +
    '.then((c) => process.exit(c), (e) => { console.error(e && e.stack); process.exit(9); });';
  const run = spawnSync(process.execPath, ['-e', script], { cwd: kit, env: childEnv, encoding: 'utf8', timeout: 150_000 });
  return { status: run.status, said: `${run.stdout}${run.stderr}`, dist: path.join(out, 'dep', 'dist') };
}

/** A stand-in engine: writes `index.html` and prints the given report as its last line, as `nodegx-deploy.cjs` does. */
function fakeEngine(report: Record<string, unknown> | string): string {
  const file = path.join(tmp, `engine-${Math.random().toString(36).slice(2)}.cjs`);
  const line = typeof report === 'string' ? report : JSON.stringify(report);
  fs.writeFileSync(
    file,
    `const fs = require('fs'), path = require('path'); const out = process.argv[3];\n` +
      `fs.mkdirSync(out, { recursive: true }); fs.writeFileSync(path.join(out, 'index.html'), '<p>hi</p>');\n` +
      `console.log('working'); console.log(${JSON.stringify(line)});\n`
  );
  return file;
}

test('the packed deploy runs where nothing resolves esbuild, and uploads the prebuilt Worker beside the app', () => {
  const r = deploy(['--allow-development-engine'], {});
  expect(r.said).toContain('esbuild: none');
  expect(r.status).toBe(0);
  expect(r.said).toContain('the prebuilt Worker (nothing bundled on this computer)');
  expect(r.said).toMatch(/Dry run: built in/);
  expect(fs.readdirSync(r.dist).sort()).toEqual(['app.mjs', 'printed-code.mjs', 'worker.mjs']);
  expect(fs.readFileSync(path.join(r.dist, 'worker.mjs')).equals(fs.readFileSync(path.join(kit, 'worker.mjs')))).toBe(true);
  expect(JSON.parse(fs.readFileSync(path.join(r.dist, 'app.mjs'), 'utf8').replace(/^export default /, '').replace(/;\s*$/, ''))).toMatchObject({
    appId: 'odt003-test',
    appName: 'Campus'
  });
  // The Worker asks for the app's two modules and nothing else of its folder.
  const worker = fs.readFileSync(path.join(kit, 'worker.mjs'), 'utf8');
  expect([...new Set(worker.match(/from ["']\.\/[^"']+["']/g))].sort()).toEqual(['from "./app.mjs"', 'from "./printed-code.mjs"']);
}, 180_000);

test('a prebuilt Worker that is not there is refused in words', () => {
  const r = deploy(['--allow-development-engine'], { NODEGX_CLOUDFLARE_WORKER: path.join(tmp, 'nowhere', 'worker.mjs') });
  expect(r.status).toBe(1);
  expect(r.said).toContain('The prebuilt Worker is not here');
}, 180_000);

test("with no nodegx deploy command, the engine builds the site and its report is what is believed", () => {
  const good = deploy([], {
    NODEGX_DEPLOY_CLI: fakeEngine({ ok: true, projectName: 'Campus', files: ['index.html'], blank: null, engine: { kind: 'production', bytes: 1_810_000 }, warnings: ['one wire is broken'] })
  });
  expect(good.status).toBe(0);
  expect(good.said).toContain('engine: production build of the NodeGX viewer, 1.81 MB');
  expect(good.said).toContain('! one wire is broken');

  const viewer = deploy([], { NODEGX_DEPLOY_CLI: fakeEngine({ ok: false, stage: 'engine', message: 'a DEVELOPMENT build of the viewer' }) });
  expect(viewer.status).toBe(1);
  expect(viewer.said).toContain("The site's deploy engine refused (engine): a DEVELOPMENT build of the viewer");
  expect(viewer.said).toContain('--viewer');

  const blank = deploy([], { NODEGX_DEPLOY_CLI: fakeEngine({ ok: true, projectName: 'Campus', files: ['index.html'], blank: 'No page renders anything.' }) });
  expect(blank.status).toBe(1);
  expect(blank.said).toContain('would ship a blank site');
  expect(blank.said).not.toContain('Dry run: built');

  const silent = deploy([], { NODEGX_DEPLOY_CLI: fakeEngine('not json') });
  expect(silent.status).toBe(1);
  expect(silent.said).toContain("The site's deploy engine gave no report");
}, 180_000);
