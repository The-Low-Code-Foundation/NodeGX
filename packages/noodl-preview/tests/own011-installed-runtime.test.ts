/**
 * P112 OWN-011 — P112-S9-NORUNTIME: an installed package renders with the runtime `npm pack` put beside its bundle.
 *
 * The preview and `nodegx-deploy` resolve the viewer runtime through one constant (`loader.ts` `EXTERNAL_DIR`) from
 * **their own `__dirname`**, so, as in EXP-017's spec, the built engine is copied into a temporary layout and run there.
 * This layout is the one npm makes — `node_modules/@nodegx/preview/dist/` with no checkout around it — and the runtime
 * sits in `dist/external/deploy/`, where `scripts/pack-runtime.mjs` builds it on `npm pack`.
 *
 * Before OWN-011 the engine looked only at `../../noodl-editor/src/external`, which an install never has: the control
 * arm (no `dist/external`) is that engine's answer for every project.
 */
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const PKG_ROOT = path.resolve(__dirname, '..');
const ENGINE_BUNDLE = path.join(PKG_ROOT, 'dist/nodegx-deploy.cjs');
const REAL_DEPLOY_DIR = path.resolve(PKG_ROOT, '../noodl-editor/src/external/deploy');
const FIXTURE_PROJECT = path.join(PKG_ROOT, 'tests/fixtures/hello-world');

let install: string;
let dist: string;

/** Run the installed engine and read the one JSON object it puts on stdout. */
function deploy(outDir: string): { ok?: boolean; stage?: string; message?: string; engine?: { path: string } } {
  // The checkout's runtime is whichever build ran last (often development); which kind it is, is EXP-017's subject.
  const run = spawnSync(process.execPath, [path.join(dist, 'nodegx-deploy.cjs'), FIXTURE_PROJECT, outDir, '--allow-development-engine'], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024
  });
  const last = (run.stdout ?? '').trim().split('\n').pop() ?? '';
  try {
    return JSON.parse(last);
  } catch {
    throw new Error(`The engine produced no report.\nstdout: ${last.slice(0, 400)}\nstderr: ${run.stderr?.slice(-800)}`);
  }
}

beforeAll(() => {
  if (!fs.existsSync(ENGINE_BUNDLE)) {
    throw new Error(`Missing ${ENGINE_BUNDLE}. Build it: npm --prefix packages/noodl-preview run build`);
  }
  if (!fs.existsSync(path.join(REAL_DEPLOY_DIR, 'index.json'))) {
    throw new Error(`Missing the deployed viewer runtime in ${REAL_DEPLOY_DIR}. Build it: npm run build:editor:_viewer`);
  }
  // realpath: the engine reports the path its own __dirname resolved to, and macOS's tmpdir is a symlink.
  install = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'own011-install-')));
  dist = path.join(install, 'node_modules/@nodegx/preview/dist');
  fs.mkdirSync(dist, { recursive: true });
  fs.cpSync(ENGINE_BUNDLE, path.join(dist, 'nodegx-deploy.cjs'));
});

afterAll(() => {
  if (install) fs.rmSync(install, { recursive: true, force: true });
});

describe('OWN-011 — the runtime an installed package carries', () => {
  it('control: with nothing beside the bundle, the installed engine refuses, naming the checkout path', () => {
    const result = deploy(path.join(install, 'site-control'));
    expect(result.ok).toBe(false);
    expect(result.message).toContain(path.join('node_modules', '@nodegx', 'noodl-editor', 'src', 'external'));
  });

  it('with dist/external/deploy beside the bundle, it deploys, and from that copy', () => {
    fs.cpSync(REAL_DEPLOY_DIR, path.join(dist, 'external', 'deploy'), { recursive: true });
    const out = path.join(install, 'site');

    const result = deploy(out);

    expect(result.ok).toBe(true);
    expect(result.engine?.path).toBe(path.join(dist, 'external', 'deploy', 'noodl.deploy.js'));
    expect(fs.existsSync(path.join(out, 'noodl.deploy.js'))).toBe(true);
  });
});
