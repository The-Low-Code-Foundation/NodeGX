/**
 * P109 ISL-042 — P78 D84: a child process whose stdout is its one JSON answer failed when something logged.
 *
 * - The headless cloud-function bundler (`dist/cloud-bundle.cjs`, behind `deploy_cloud_functions`) loads the project,
 *   and a format-4 project's load runs NDA-017's migration, which prints "[NDA-017] migrated …". That line led
 *   stdout and the parent refused the answer: "The cloud-function bundler produced output that was not JSON".
 * - The kit extractor (`dist/kit-extract.cjs`) imports each kit's `index.js`, which is project code and can log.
 *
 * Both are built from source into a temp directory per run (never the shared `dist/`), run on a copy of an in-repo
 * fixture, and graded on what the parent reads: stdout parses whole, and the log line is on stderr. The log line on
 * stderr is also the known-firing arm: it proves the fixture logs, so a green stdout is not a project that was quiet.
 */
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { buildKitExtractor } from './helpers';

jest.setTimeout(180000);

const PKG = path.join(__dirname, '..');

function run(child: string, projectDir: string): { stdout: string; stderr: string; status: number | null } {
  const r = spawnSync(process.execPath, [child, projectDir], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return { stdout: r.stdout, stderr: r.stderr, status: r.status };
}

function parses(text: string): boolean {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
}

describe('ISL-042 P78 D84 — a child that answers on stdout keeps logs off it', () => {
  let tmp: string;
  let cloudBundle: string;
  let kitExtract: string;

  beforeAll(async () => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'isl042-children-'));
    cloudBundle = path.join(tmp, 'cloud-bundle.cjs');
    const built = spawnSync(process.execPath, [path.join(PKG, 'build-cloud-bundle.mjs'), cloudBundle], { encoding: 'utf8' });
    if (built.status !== 0) throw new Error('build-cloud-bundle.mjs failed: ' + built.stderr);
    kitExtract = await buildKitExtractor(tmp);
  });
  afterAll(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('the cloud bundler answers JSON for a project whose load logs a migration', () => {
    // demo-app is format 4; a Condition whose `eval` is wired is a node NDA-017 rewrites, so loading it logs.
    const project = path.join(tmp, 'migrating');
    fs.cpSync(path.join(__dirname, 'fixtures', 'demo-app'), project, { recursive: true });
    const dir = path.join(project, 'components', 'Card');
    const nodes = JSON.parse(fs.readFileSync(path.join(dir, 'nodes.json'), 'utf8'));
    nodes.nodes.push({ id: 'd84-flag', type: 'Boolean', x: 400, y: 40, parameters: { value: true } });
    nodes.nodes.push({ id: 'd84-cond', type: 'Condition', x: 400, y: 160, parameters: { condition: true } });
    fs.writeFileSync(path.join(dir, 'nodes.json'), JSON.stringify(nodes, null, 2));
    const connections = JSON.parse(fs.readFileSync(path.join(dir, 'connections.json'), 'utf8'));
    connections.connections.push({ fromId: 'd84-flag', fromProperty: 'savedValue', toId: 'd84-cond', toProperty: 'eval' });
    fs.writeFileSync(path.join(dir, 'connections.json'), JSON.stringify(connections, null, 2));

    const r = run(cloudBundle, project);
    expect(r.stderr).toContain('[NDA-017] migrated');
    expect({ status: r.status, parses: parses(r.stdout), head: r.stdout.slice(0, 15) }).toEqual({ status: 0, parses: true, head: '{"bundleName":"' });
  });

  it('the kit extractor answers JSON when a kit logs as it loads', () => {
    const project = path.join(tmp, 'logging-kit');
    fs.cpSync(path.join(__dirname, 'fixtures', 'kit-app'), project, { recursive: true });
    const index = path.join(project, 'noodl_modules', 'demo-kit', 'index.js');
    fs.writeFileSync(index, 'console.log("demo-kit loading");\n' + fs.readFileSync(index, 'utf8'));

    const r = run(kitExtract, project);
    expect(r.stderr).toContain('demo-kit loading');
    expect({ status: r.status, parses: parses(r.stdout) }).toEqual({ status: 0, parses: true });
  });
});
