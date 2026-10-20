/**
 * P112-OWN021-NOSHARP — the backend the packaged editor runs can make a thumbnail.
 *
 * On 0.4.2 every marketplace photo drew broken: the shop asks for `?thumb=`, and `Resources/nodegx-backend/` held
 * `cli.js` alone, so `require('sharp')` found nothing and every transform answered 501. Every earlier drive ran the
 * backend from the repo, where `node_modules/sharp` is always within reach, so none could see it.
 *
 * This lays out `nodegx-backend/` the way electron-builder does — from the editor's own `extraResources` list, each
 * build output made the way `scripts/build.js` makes it, into a temp directory with no `node_modules` above it — and
 * asks a 640 × 480 photo for `?thumb=md`. The packaged artefact gets the same smoke in the editor's afterPack and
 * afterSign hooks (packages/noodl-editor/build/check-packaged-backend.js).
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const esbuild = require('esbuild');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { shared, SHARP_RUNTIME_DIR } = require('../scripts/build.js');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { stageSharp, targetPackages } = require('../scripts/stage-sharp.js');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { thumbSmoke } = require('../scripts/thumb-smoke.js');

jest.setTimeout(180000);

const EDITOR_DIR = path.join(__dirname, '..', '..', 'noodl-editor');
const BACKEND_DIST = path.join(__dirname, '..', 'dist');

interface ResourceEntry {
  from: string;
  to: string;
}

const backendResources = (): ResourceEntry[] =>
  JSON.parse(fs.readFileSync(path.join(EDITOR_DIR, 'package.json'), 'utf8')).build.extraResources.filter(
    (e: ResourceEntry) => typeof e === 'object' && e.to.startsWith('nodegx-backend/')
  );

describe('P112-OWN021-NOSHARP — a packaged backend answers ?thumb=', () => {
  let work: string;
  /** dist-relative build output → where this spec built it */
  const built: Record<string, string> = {};

  /** `<resources>/nodegx-backend/…` from the given entries, as electron-builder would copy them. */
  function layOut(name: string, entries: ResourceEntry[]): string {
    const resources = path.join(work, name);
    for (const entry of entries) {
      const rel = path.relative(BACKEND_DIST, path.resolve(EDITOR_DIR, entry.from));
      const source = built[rel];
      if (!source) throw new Error(`no recipe for the build output ${entry.from}; teach this spec to make it`);
      fs.mkdirSync(path.dirname(path.join(resources, entry.to)), { recursive: true });
      fs.cpSync(source, path.join(resources, entry.to), { recursive: true });
    }
    return resources;
  }

  beforeAll(async () => {
    work = fs.mkdtempSync(path.join(os.tmpdir(), 'nosharp-'));
    built['cli.js'] = path.join(work, 'build', 'cli.js');
    await esbuild.build({
      ...shared,
      logLevel: 'silent',
      sourcemap: false,
      entryPoints: [path.join(__dirname, '..', 'src', 'cli.ts')],
      outfile: built['cli.js']
    });
    built[SHARP_RUNTIME_DIR] = path.join(work, 'build', SHARP_RUNTIME_DIR);
    stageSharp({ outDir: built[SHARP_RUNTIME_DIR] });
  });

  afterAll(() => {
    fs.rmSync(work, { recursive: true, force: true });
  });

  it('each release target stages the packages sharp lists for it: libvips on its own, except on Windows', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const manifest = require('sharp/package.json');
    expect(
      Object.fromEntries(
        ['darwin-arm64', 'darwin-x64', 'win32-x64', 'linux-x64'].map((t) => [
          t,
          targetPackages(manifest, ...t.split('-'))
        ])
      )
    ).toEqual({
      'darwin-arm64': ['@img/sharp-darwin-arm64', '@img/sharp-libvips-darwin-arm64'],
      'darwin-x64': ['@img/sharp-darwin-x64', '@img/sharp-libvips-darwin-x64'],
      // libvips-42.dll ships inside @img/sharp-win32-x64 (measured on the registry, 0.33.5)
      'win32-x64': ['@img/sharp-win32-x64'],
      'linux-x64': ['@img/sharp-linux-x64', '@img/sharp-libvips-linux-x64']
    });
    expect(() => targetPackages(manifest, 'freebsd', 'x64')).toThrow(/no prebuild for freebsd-x64/);
  });

  it('known-firing: cli.js alone — 0.4.2 as shipped — answers 501 naming sharp', async () => {
    const resources = layOut('cli-only', [{ from: '../nodegx-backend/dist/cli.js', to: 'nodegx-backend/cli.js' }]);
    await expect(thumbSmoke({ resourcesDir: resources })).rejects.toThrow(/answered 501.*Cannot find module 'sharp'/s);
  });

  it("the editor's extraResources put sharp beside cli.js, and ?thumb=md is a 256 px image", async () => {
    const result = await thumbSmoke({ resourcesDir: layOut('packaged', backendResources()) });
    expect(result).toMatchObject({ status: 200, width: 256 });
  });
});
