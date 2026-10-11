/**
 * P109 ISL-042 — P96-FED005-R10, the editor's half: a cloud component's description reaches the bundle it deploys in.
 *
 * `exportComponent` drops `ComponentModel.description`, so a backend's MCP tool never saw what the author wrote for
 * the model (the backend half is `nodegx-backend/tests/isl042-function-description.test.ts`). The cloud bundle now
 * carries it, and only the cloud bundle: a page's notes never reach the public frontend.
 *
 * Graded on the door's own cloud bundler (`deploy_cloud_functions`), built from source into a temp directory, over a
 * project with one described function and one without (the control).
 */
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

jest.setTimeout(180000);

const PKG = path.join(__dirname, '..');
const DESCRIPTION = 'Read this first. It is the writing brief: tone, length and the words to avoid.';

function writeJson(file: string, value: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2));
}

function cloudFunction(components: string, name: string, description?: string): void {
  const dir = path.join(components, '__cloud__', name);
  writeJson(path.join(dir, 'component.json'), {
    $schema: 'https://opennoodl.dev/schemas/component-v2.json',
    id: `c_${name}`,
    name,
    path: `/#__cloud__/${name}`,
    type: 'cloud',
    ...(description === undefined ? {} : { description })
  });
  writeJson(path.join(dir, 'nodes.json'), {
    $schema: 'https://opennoodl.dev/schemas/nodes-v2.json',
    componentId: `c_${name}`,
    version: 1,
    nodes: [
      { id: `req_${name}`, type: 'noodl.cloud.request', parameters: { params: 'topic' } },
      { id: `res_${name}`, type: 'noodl.cloud.response', parameters: {} }
    ]
  });
  writeJson(path.join(dir, 'connections.json'), {
    $schema: 'https://opennoodl.dev/schemas/connections-v2.json',
    componentId: `c_${name}`,
    version: 1,
    connections: [{ fromId: `req_${name}`, fromProperty: 'receive', toId: `res_${name}`, toProperty: 'send' }]
  });
  const registryFile = path.join(components, '_registry.json');
  const registry = JSON.parse(fs.readFileSync(registryFile, 'utf8'));
  registry.components[`__cloud__/${name}`] = { path: `__cloud__/${name}`, type: 'cloud', nodeCount: 2, connectionCount: 1 };
  writeJson(registryFile, registry);
}

describe('ISL-042 P96-FED005-R10 — a cloud function\'s description travels in its bundle', () => {
  let tmp: string;
  let bundled: Record<string, { description?: unknown }>;

  beforeAll(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'isl042-desc-'));
    const child = path.join(tmp, 'cloud-bundle.cjs');
    const built = spawnSync(process.execPath, [path.join(PKG, 'build-cloud-bundle.mjs'), child], { encoding: 'utf8' });
    if (built.status !== 0) throw new Error('build-cloud-bundle.mjs failed: ' + built.stderr);

    const project = path.join(tmp, 'project');
    fs.cpSync(path.join(__dirname, 'fixtures', 'demo-app'), project, { recursive: true });
    cloudFunction(path.join(project, 'components'), 'authoringGuide', DESCRIPTION);
    cloudFunction(path.join(project, 'components'), 'plainFunction');

    const run = spawnSync(process.execPath, [child, project], { encoding: 'utf8', cwd: PKG, maxBuffer: 64 * 1024 * 1024 });
    if (run.status !== 0) throw new Error('cloud bundler failed: ' + run.stderr);
    const answer = JSON.parse(run.stdout) as { parts: { bundle: { components: { name: string; description?: unknown }[] } | null } };
    bundled = Object.fromEntries((answer.parts.bundle?.components ?? []).map((c) => [c.name, c]));
  });
  afterAll(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('the described function\'s bundle component carries its description', () => {
    expect(bundled['/#__cloud__/authoringGuide']?.description).toBe(DESCRIPTION);
  });

  it('control: a function with no description carries no description key', () => {
    expect(bundled['/#__cloud__/plainFunction']).toBeDefined();
    expect('description' in bundled['/#__cloud__/plainFunction']).toBe(false);
  });
});
