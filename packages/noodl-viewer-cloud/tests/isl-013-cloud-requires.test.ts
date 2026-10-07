/**
 * ISL-013 — a kit says what it needs, in cloud functions. The bundle's modules come from `@nodegx/module-inject`'s
 * `readCloudModuleSources` (the injector's order and refusals) and are loaded by `loadCloudKitModules`, whose `Noodl` now has
 * `getModule`. `aa-user` reads `zz-base` at definition and names its node after what it read.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { loadCloudKitModules } from '../src';
import type { CloudKitModule } from '../src';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { readCloudModuleSources } = require('@nodegx/module-inject');

const USER = `
var base = Noodl.getModule('zz-base');
var said = base ? base.greet('island') : 'nothing';
Noodl.defineModule({ nodes: [{ name: 'aa.user.' + said.replace(/\\W/g, '_'), category: 'Math', inputs: {}, outputs: {} }] });`;
const BASE = `Noodl.defineModule({ nodes: [{ name: 'zz.base', category: 'Math', inputs: {}, outputs: {} }], exports: { greet: function (n) { return 'hello ' + n; } } });`;

async function bundleModules(opts: { requires: boolean; base: boolean }): Promise<CloudKitModule[]> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'isl013-cloud-'));
  const kit = (folder: string, manifest: object, source: string) => {
    fs.mkdirSync(path.join(dir, 'noodl_modules', folder), { recursive: true });
    fs.writeFileSync(path.join(dir, 'noodl_modules', folder, 'manifest.json'), JSON.stringify(manifest));
    fs.writeFileSync(path.join(dir, 'noodl_modules', folder, 'index.js'), source);
  };
  kit('aa-user', { name: 'User', main: 'index.js', runtimes: ['cloud'], ...(opts.requires ? { requires: ['zz-base'] } : {}) }, USER);
  if (opts.base) kit('zz-base', { name: 'Base Kit', main: 'index.js', runtimes: ['cloud'] }, BASE);
  return readCloudModuleSources(dir);
}

const fakeRuntime = () => ({ registered: [] as any[], registerModule(m: any) { this.registered.push(m); } });

describe('ISL-013 in cloud functions', () => {
  it('a kit that requires another loads after it and reads it at definition', async () => {
    const result = loadCloudKitModules(fakeRuntime(), await bundleModules({ requires: true, base: true }), new Set());
    expect(result.registered).toEqual(['Base Kit', 'User']);
    expect(result.nodeTypes).toEqual(['zz.base', 'aa.user.hello_island']);
    expect(result.failures).toEqual([]);
  });

  it('the reverted arm: without requires the user loads first and reads nothing', async () => {
    const result = loadCloudKitModules(fakeRuntime(), await bundleModules({ requires: false, base: true }), new Set());
    expect(result.nodeTypes).toEqual(['aa.user.nothing', 'zz.base']);
  });

  it('installed alone, the user is not loaded, and the failure says which kit it needed', async () => {
    const result = loadCloudKitModules(fakeRuntime(), await bundleModules({ requires: true, base: false }), new Set());
    expect(result.registered).toEqual([]);
    expect(result.failures.map((f) => f.message)).toEqual(['Kit "User": it was not loaded: it needs "zz-base", which is not installed in this project']);
  });

  it("one runtime's kits are not another's", async () => {
    const modules = await bundleModules({ requires: false, base: true });
    loadCloudKitModules(fakeRuntime(), modules.filter((m) => m.name === 'Base Kit'), new Set());
    const other = loadCloudKitModules(fakeRuntime(), modules.filter((m) => m.name === 'User'), new Set());
    expect(other.nodeTypes).toEqual(['aa.user.nothing']);
  });
});
