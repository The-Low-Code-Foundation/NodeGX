/**
 * P112-S13-CLOUDDEPLOY — the cloud-function bundler runs from a folder that is not an npm package.
 *
 * `deploy_cloud_functions` spawns `cloud-bundle.cjs` with the MCP server's own working directory. Under `npx` (the npm
 * kit) and in the packaged editor's sidecar that is the person's project folder, and `@noodl/platform-node` threw at
 * import there: "Cannot find package.json, to get the build version". Found from a packed tarball in OWN-015, and on
 * the installed NodeGX 0.3.0. ISL-042's spec runs the same bundle with `cwd` set to this package, which is a package,
 * so it could not see this.
 *
 * Graded on the door's own bundler, built from source into a temp directory, run from an EMPTY temp directory. The
 * control removes the file the fix writes and must fail with the original sentence.
 */
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

jest.setTimeout(180000);

const PKG = path.join(__dirname, '..');

describe('P112-S13-CLOUDDEPLOY — the cloud bundler does not need to stand in an npm package', () => {
  let tmp: string;
  let bundle: string;
  let project: string;
  let elsewhere: string;

  beforeAll(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'own015-cwd-'));
    const out = path.join(tmp, 'dist');
    fs.mkdirSync(out);
    bundle = path.join(out, 'cloud-bundle.cjs');
    const built = spawnSync(process.execPath, [path.join(PKG, 'build-cloud-bundle.mjs'), bundle], { encoding: 'utf8' });
    if (built.status !== 0) throw new Error('build-cloud-bundle.mjs failed: ' + built.stderr);
    project = path.join(tmp, 'project');
    fs.cpSync(path.join(__dirname, 'fixtures', 'demo-app'), project, { recursive: true });
    elsewhere = fs.mkdtempSync(path.join(os.tmpdir(), 'own015-not-a-package-'));
  });
  afterAll(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
    fs.rmSync(elsewhere, { recursive: true, force: true });
  });

  const run = () => spawnSync(process.execPath, [bundle, project], { encoding: 'utf8', cwd: elsewhere, maxBuffer: 64 * 1024 * 1024 });

  it('writes a package.json beside the bundle it builds', () => {
    const meta = JSON.parse(fs.readFileSync(path.join(path.dirname(bundle), 'package.json'), 'utf8'));
    expect(meta.private).toBe(true);
    expect(typeof meta.version).toBe('string');
  });

  it('🔴 bundles a project from a working directory with no package.json', () => {
    expect(fs.existsSync(path.join(elsewhere, 'package.json'))).toBe(false);
    const r = run();
    expect(r.stderr).not.toContain('Cannot find package.json');
    expect(r.status).toBe(0);
  });

  it('control: without that file, the same run fails the way every npm install did', () => {
    fs.rmSync(path.join(path.dirname(bundle), 'package.json'));
    const r = run();
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain('Cannot find package.json, to get the build version');
  });
});
