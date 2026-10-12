/**
 * P109 ISL-042 — P78-DBT-SECRETSCAN: `package-deploy.js` refused every backend build. Its secret scan found a
 * "connection string with password" in the backend's own bundle: the example in a NODEGX_STORAGE_URL error
 * message (`postgres://user:password@…`, from `noodl-runtime`'s `storageUrl.ts`). No self-host image could be
 * packaged.
 *
 * This bundles the service exactly as `scripts/build.js` does (its own config, exported), to a temp directory so
 * the `dist/` a running editor uses is never touched, and runs the packager's own scan over it. The next example
 * sentence that looks like a credential turns this red, not the next person's deploy.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const esbuild = require('esbuild');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { shared } = require('../scripts/build.js');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { scanForSecrets } = require('../scripts/package-deploy.js');

jest.setTimeout(180000);

describe('ISL-042 P78-DBT-SECRETSCAN — the packaged backend passes its own secret scan', () => {
  let outDir: string;

  beforeAll(async () => {
    outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'isl042-bundle-'));
    await esbuild.build({
      ...shared,
      logLevel: 'silent',
      sourcemap: false,
      entryPoints: [path.join(__dirname, '..', 'src', 'cli.ts')],
      outfile: path.join(outDir, 'cli.js')
    });
  });
  afterAll(() => {
    fs.rmSync(outDir, { recursive: true, force: true });
  });

  it('known-firing: the scan finds a connection string with a password in a file beside the bundle', () => {
    const planted = path.join(outDir, 'planted.txt');
    fs.writeFileSync(planted, 'url = "postgres://deploy:hunter22@db:5432/app"');
    try {
      expect(scanForSecrets(outDir).map((f: { file: string; finding: string }) => [f.file, f.finding])).toContainEqual([
        'planted.txt',
        'connection string with password'
      ]);
    } finally {
      fs.rmSync(planted);
    }
  });

  it('the service bundle (dist/cli.js as build.js makes it) has no finding', () => {
    expect(fs.statSync(path.join(outDir, 'cli.js')).size).toBeGreaterThan(1_000_000);
    expect(scanForSecrets(outDir)).toEqual([]);
  });
});
