/**
 * ISL-013 — a kit says what it needs, in the door's catalog reader (ruled 2026-10-05: rulings 1 (a) and 2 (a)).
 *
 * The reader loads kits in the page's order (`@nodegx/module-inject`'s `toInjectModules`): a kit's `requires` first, and a kit
 * whose needed kit is missing refused, by name — so the door's catalog and the page agree about which kit nodes exist. `aa-user`
 * reads `zz-base` AT DEFINITION through `Noodl.getModule` and names its node after what it read; its folder sorts first, so it
 * reads the base only when the reader honours `requires`. The reader is built from source per run (`buildKitExtractor`).
 */
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { extractProjectOverlay } from '../src/kitExtract/extract';
import { clearProjectOverlay } from '../src/kitOverlay';
import { buildKitExtractor, call, connect } from './helpers';
import type { ProjectInfoResponse } from '../src/tools/responses';

let tempDir: string;

beforeAll(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'isl013-'));
  process.env.NODEGX_KIT_EXTRACT = await buildKitExtractor(tempDir);
}, 120_000);

afterAll(() => {
  delete process.env.NODEGX_KIT_EXTRACT;
  fs.rmSync(tempDir, { recursive: true, force: true });
});

afterEach(() => clearProjectOverlay());

const USER = `
var base = Noodl.getModule('zz-base');
var said = base ? base.greet('island') : 'nothing';
Noodl.defineModule({ nodes: [{ name: 'aa.user.' + said.replace(/\\W/g, '_'), category: 'Math', inputs: {}, outputs: {} }] });`;
const BASE = `Noodl.defineModule({ nodes: [{ name: 'zz.base', category: 'Math', inputs: {}, outputs: {} }], exports: { greet: function (n) { return 'hello ' + n; } } });`;

/** A v2 project to put the kits in: kit-app's components, none of its kits (the door refuses a legacy project.json). */
const KIT_APP = path.join(__dirname, 'fixtures', 'kit-app');

function project(opts: { requires: boolean; base: boolean }): string {
  const dir = fs.mkdtempSync(path.join(tempDir, 'project-'));
  fs.cpSync(KIT_APP, dir, { recursive: true });
  fs.rmSync(path.join(dir, 'noodl_modules'), { recursive: true, force: true });
  const kit = (folder: string, manifest: object, source: string) => {
    fs.mkdirSync(path.join(dir, 'noodl_modules', folder), { recursive: true });
    fs.writeFileSync(path.join(dir, 'noodl_modules', folder, 'manifest.json'), JSON.stringify(manifest));
    fs.writeFileSync(path.join(dir, 'noodl_modules', folder, 'index.js'), source);
  };
  kit('aa-user', { name: 'User', main: 'index.js', ...(opts.requires ? { requires: ['zz-base'] } : {}) }, USER);
  if (opts.base) kit('zz-base', { name: 'Base Kit', main: 'index.js' }, BASE);
  return dir;
}

const kitTypes = (dir: string) => {
  const overlay = extractProjectOverlay(dir);
  return { overlay, types: overlay.nodes.map((n) => n.typeName).filter((t) => /^(aa|zz)\./.test(t)).sort() };
};

describe('ISL-013 in the catalog reader', () => {
  test('a kit that requires another loads after it and reads it at definition', () => {
    const { overlay, types } = kitTypes(project({ requires: true, base: true }));
    expect(overlay.unavailable).toBeUndefined();
    expect(overlay.kits.map((k) => k.kitModule)).toEqual(['Base Kit', 'User']);
    expect(types).toEqual(['aa.user.hello_island', 'zz.base']);
    expect(overlay.failures).toEqual([]);
  });

  test('the reverted arm: without requires the user loads first and reads nothing', () => {
    const { overlay, types } = kitTypes(project({ requires: false, base: true }));
    expect(overlay.kits.map((k) => k.kitModule)).toEqual(['User', 'Base Kit']);
    expect(types).toEqual(['aa.user.nothing', 'zz.base']);
  });

  test('installed alone, the user is refused by name — no half-registered node', () => {
    const { overlay, types } = kitTypes(project({ requires: true, base: false }));
    expect(types).toEqual([]);
    expect(overlay.failures).toEqual([
      { kitModule: 'User', dirPath: 'noodl_modules/aa-user', message: 'not loaded: it needs "zz-base", which is not installed in this project' }
    ]);
  });

  test('get_project_info names the refused kit and why', async () => {
    const session = await connect(project({ requires: true, base: false }));
    try {
      const info = await call<ProjectInfoResponse>(session, 'get_project_info');
      expect(JSON.stringify(info.data.kits?.failures ?? [])).toContain('it needs \\"zz-base\\", which is not installed in this project');
      expect(info.data.kits?.failures?.[0]?.kitModule).toBe('User');
    } finally {
      await session.close();
    }
  }, 60_000);
});
