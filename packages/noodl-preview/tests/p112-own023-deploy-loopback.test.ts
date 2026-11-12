/**
 * P112-OWN023-DEPLOYLOOPBACK — a static deploy of an app bound to a backend on this computer says so.
 *
 * The deploy copies `metadata.cloudservices.endpoint` into the bundle as written. Bound to a local backend
 * (`provision_backend`: `http://127.0.0.1:<port>`), every visitor's copy asks their own machine for its records, and
 * the builder, whose backend is running, is the one person who sees it work. It answered `ok: true` with no word.
 *
 * Now the outcome names the address (`localBackend`), its sentence is in `warnings`, and the CLI says it on stderr.
 * Known-firing beside the absences: the same fixture with a reachable endpoint, and with none, deploys with no such
 * warning, so the sentence is about the address and not about deploying.
 *
 * ⚠️ Grades `dist/nodegx-deploy.cjs`, a build artefact: rebuild it (`npm run build`) after editing the source.
 */
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const PKG_ROOT = path.resolve(__dirname, '..');
const ENGINE_BUNDLE = path.join(PKG_ROOT, 'dist/nodegx-deploy.cjs');
const FIXTURE_PROJECT = path.join(PKG_ROOT, 'tests/fixtures/hello-world');
const SOURCES = ['src/deploy.ts', 'src/deploy-cli.ts', 'src/projectExport.ts'].map((f) => path.join(PKG_ROOT, f));

let work: string;

beforeAll(() => {
  if (!fs.existsSync(ENGINE_BUNDLE)) throw new Error(`Missing ${ENGINE_BUNDLE}. Build it: npm --prefix packages/noodl-preview run build`);
  const built = fs.statSync(ENGINE_BUNDLE).mtimeMs;
  const newer = SOURCES.filter((f) => fs.statSync(f).mtimeMs > built);
  if (newer.length) throw new Error(`${ENGINE_BUNDLE} is older than ${newer.join(', ')}. Rebuild it: npm --prefix packages/noodl-preview run build`);
  work = fs.mkdtempSync(path.join(os.tmpdir(), 'p112-deployloopback-'));
});

afterAll(() => {
  if (work) fs.rmSync(work, { recursive: true, force: true });
});

function deployWith(name: string, endpoint: string | undefined) {
  const projectDir = path.join(work, name, 'project');
  fs.cpSync(FIXTURE_PROJECT, projectDir, { recursive: true });
  if (endpoint) {
    const file = path.join(projectDir, 'nodegx.project.json');
    const project = JSON.parse(fs.readFileSync(file, 'utf8'));
    project.metadata = { cloudservices: { instanceId: 'backend_test', endpoint, appId: 'backend_test', type: 'nodegx' } };
    fs.writeFileSync(file, JSON.stringify(project));
  }
  const run = spawnSync(process.execPath, [ENGINE_BUNDLE, projectDir, path.join(work, name, 'out'), '--allow-development-engine'], {
    encoding: 'utf8'
  });
  const report = JSON.parse(run.stdout.trim().split('\n').pop() ?? '{}');
  return { report, stderr: run.stderr };
}

const SENTENCE = 'talks to a backend on this computer';

describe('P112-OWN023-DEPLOYLOOPBACK', () => {
  test('🔴 a loopback backend: ok, and the address, the sentence and the stderr line all say so', () => {
    const { report, stderr } = deployWith('loopback', 'http://127.0.0.1:8585');
    expect(report.ok).toBe(true);
    expect(report.localBackend).toBe('http://127.0.0.1:8585');
    const warning = (report.warnings as string[]).find((w) => w.includes(SENTENCE));
    expect(warning).toContain('http://127.0.0.1:8585');
    expect(warning).toContain('deploy_to_vm');
    expect(stderr).toContain(`nodegx-deploy: ${warning}`);
  });

  test('localhost reads the same', () => {
    expect(deployWith('localhost', 'http://localhost:8585').report.localBackend).toBe('http://localhost:8585');
  });

  test('a backend others can reach, and no backend at all: deployed, with no such warning (known-firing arms)', () => {
    for (const [name, endpoint] of [['reachable', 'https://api.example.com'], ['none', undefined]] as const) {
      const { report, stderr } = deployWith(name, endpoint);
      expect({ name, ok: report.ok }).toEqual({ name, ok: true });
      expect(report.localBackend).toBeUndefined();
      expect((report.warnings as string[]).filter((w) => w.includes(SENTENCE))).toEqual([]);
      expect(stderr).not.toContain(SENTENCE);
    }
  });
});
