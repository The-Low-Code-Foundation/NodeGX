/**
 * ISL-013 — a kit says what it needs (ruled 2026-10-05: rulings 1 (a) and 2 (a)).
 *
 * A manifest's `requires` names the kits this one reads. The injector loads those first, whatever the folder names, and a kit
 * whose needed kit is missing is not loaded, and says so by name. Without it the page's order is alphabetical by path, so a
 * kit called `aa-user` runs before the `zz-base` it reads and finds nothing — the island's 3D kit only works because "garden-3d-kit"
 * happens to sort before "garden-kit" and reads it late.
 *
 * 🔴 The names are chosen so the user sorts FIRST: a test whose kits happen to sort right passes with no ordering at all.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const { buildInjectionTags, scanModuleManifests, scanModuleManifestsSync, toInjectModules } = require('../src/index.js');

/** A project on disk with one folder per kit: `{ folder: manifest }`. */
function project(kits) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'isl013-'));
  for (const [folder, manifest] of Object.entries(kits)) {
    fs.mkdirSync(path.join(dir, 'noodl_modules', folder), { recursive: true });
    fs.writeFileSync(path.join(dir, 'noodl_modules', folder, 'manifest.json'), JSON.stringify(manifest));
    if (manifest.main) fs.writeFileSync(path.join(dir, 'noodl_modules', folder, manifest.main), '');
  }
  return dir;
}

const injected = async (kits) => toInjectModules(await scanModuleManifests(project(kits)));
const mains = (modules) => modules.filter((m) => m.index).map((m) => m.index.split('/')[1]);

describe('ISL-013 — requires: the kits a kit needs load first', () => {
  test('a user that sorts before its base loads after it', async () => {
    const modules = await injected({
      'aa-user': { name: 'aa-user', main: 'index.js', requires: ['zz-base'] },
      'zz-base': { name: 'zz-base', main: 'index.js' }
    });
    expect(mains(modules)).toEqual(['zz-base', 'aa-user']);
  });

  test('the known-firing control: with no requires the order is alphabetical, user first', async () => {
    const modules = await injected({
      'aa-user': { name: 'aa-user', main: 'index.js' },
      'zz-base': { name: 'zz-base', main: 'index.js' }
    });
    expect(mains(modules)).toEqual(['aa-user', 'zz-base']);
  });

  test('a needed kit is named by its manifest name or its folder', async () => {
    const byFolder = await injected({
      'aa-user': { name: 'User', main: 'index.js', requires: ['zz-base'] },
      'zz-base': { name: 'Base Kit', main: 'index.js' }
    });
    expect(mains(byFolder)).toEqual(['zz-base', 'aa-user']);
    const byName = await injected({
      'aa-user': { name: 'User', main: 'index.js', requires: ['Base Kit'] },
      'zz-base': { name: 'Base Kit', main: 'index.js' }
    });
    expect(mains(byName)).toEqual(['zz-base', 'aa-user']);
  });

  test('a chain loads in its order, and kits that declare nothing keep their places', async () => {
    const modules = await injected({
      'aa-top': { main: 'index.js', requires: ['mm-middle'] },
      'bb-plain': { main: 'index.js' },
      'mm-middle': { main: 'index.js', requires: ['zz-bottom'] },
      'yy-plain': { main: 'index.js' },
      'zz-bottom': { main: 'index.js' }
    });
    expect(mains(modules)).toEqual(['zz-bottom', 'mm-middle', 'aa-top', 'bb-plain', 'yy-plain']);
  });

  test('a kit whose needed kit is missing is not loaded, and the page says why by name', async () => {
    const modules = await injected({ 'aa-user': { name: 'aa-user', main: 'index.js', requires: ['zz-base'] } });
    expect(mains(modules)).toEqual([]);
    expect(modules).toEqual([expect.objectContaining({ name: 'aa-user', refused: 'it needs "zz-base", which is not installed in this project' })]);
    const tags = buildInjectionTags(modules, '/');
    expect(tags.modulesMain).not.toContain('aa-user/index.js');
    expect(tags.modulesMain).toContain('The kit \\"aa-user\\" was not loaded: it needs \\"zz-base\\", which is not installed in this project');
  });

  test('a refused kit is on the page\'s failure list, so Settings → Kits names it as well as the console', async () => {
    const tags = buildInjectionTags(await injected({ 'aa-user': { name: 'aa-user', main: 'index.js', requires: ['zz-base'] } }), '/');
    const errors = [];
    const page = { console: { error: (m) => errors.push(m) } };
    page.window = page;
    const context = require('vm').createContext(page);
    for (const [, body] of tags.modulesMain.matchAll(/<script type="text\/javascript">([\s\S]*?)<\/script>/g)) require('vm').runInContext(body, context);
    expect(page.__noodl_module_failures).toEqual([
      { module: 'aa-user', reason: 'refused', message: 'it needs "zz-base", which is not installed in this project' }
    ]);
    expect(errors).toEqual(['The kit "aa-user" was not loaded: it needs "zz-base", which is not installed in this project']);
  });

  test('a kit that needs a refused kit is refused too, and a cycle refuses both', async () => {
    const chain = await injected({
      'aa-top': { main: 'index.js', requires: ['mm-middle'] },
      'mm-middle': { main: 'index.js', requires: ['zz-gone'] }
    });
    // the cause first: the console reads top to bottom
    expect(chain.map((m) => [m.name, m.refused])).toEqual([
      ['mm-middle', 'it needs "zz-gone", which is not installed in this project'],
      ['aa-top', 'it needs "mm-middle", which was not loaded']
    ]);
    const cycle = await injected({
      'aa-one': { main: 'index.js', requires: ['zz-two'] },
      'zz-two': { main: 'index.js', requires: ['aa-one'] }
    });
    expect(mains(cycle)).toEqual([]);
    expect(cycle.every((m) => typeof m.refused === 'string')).toBe(true);
  });

  test('a project that declares no requires injects exactly what it did (byte-identical tags)', async () => {
    const kits = {
      'aa-kit': { main: 'index.js', dependencies: ['lib.js'] },
      'demo-iconset': { type: 'iconset', browser: { stylesheets: ['icons.css'] } },
      'zz-kit': { main: 'index.js' }
    };
    const modules = toInjectModules(await scanModuleManifests(project(kits)));
    // the rule before ISL-013: kits with a main by path, then the rest — and nothing refused, so the tags are the old tags
    expect(modules.map((m) => m.name)).toEqual(['aa-kit', 'zz-kit', 'demo-iconset']);
    expect(modules.some((m) => 'refused' in m)).toBe(false);
    expect(buildInjectionTags(modules, '/').modulesMain).not.toContain('was not loaded');
  });

  test('requires is part of the manifest schema: a wrong type is warned about by name', () => {
    const scanned = scanModuleManifestsSync(project({ 'aa-user': { main: 'index.js', requires: 'zz-base' } }));
    expect(scanned[0].warnings.join(' ')).toMatch(/requires/);
  });
});

describe('ISL-013 — the page tells a required kit its folder, and no other kit', () => {
  test('a required kit is wrapped in a folder marker; the kit that needs it and an unrelated kit are not', async () => {
    const modules = await injected({
      'aa-user': { name: 'User', main: 'index.js', requires: ['zz-base'] },
      'mm-other': { name: 'Other', main: 'index.js' },
      'zz-base': { name: 'Base Kit', main: 'index.js' }
    });
    const main = buildInjectionTags(modules, '/').modulesMain;
    const at = (needle) => main.indexOf(needle);
    expect(at('window.__noodl_module_folder = "zz-base"')).toBeGreaterThan(at('window.__noodl_module_name = "Base Kit"'));
    expect(at('window.__noodl_module_folder = "zz-base"')).toBeLessThan(at('zz-base/index.js'));
    expect(at('window.__noodl_module_folder = undefined')).toBeGreaterThan(at('zz-base/index.js'));
    expect(at('window.__noodl_module_folder = undefined')).toBeLessThan(at('aa-user/index.js'));
    expect(main.match(/__noodl_module_folder = /g)).toHaveLength(2);
  });
});
