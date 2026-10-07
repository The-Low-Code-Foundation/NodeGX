/**
 * ISL-013 — a kit says what it needs, on the server render.
 *
 * The page is built by `@nodegx/module-inject` itself and replayed by the SSR loader with the SSR bootstrap installed: the
 * same chain a deployed SSR app runs. `aa-user` reads `zz-base` AT DEFINITION through `Noodl.getModule`, and its folder sorts
 * first, so it only finds the base when the injector honours `requires`.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const { scanModuleManifests, toInjectModules, buildInjectionTags, injectIntoTemplate, DEPENDENCIES_PLACEHOLDER, MAIN_PLACEHOLDER } = require('@nodegx/module-inject');
const { installRuntimeGlobals } = require('../static/ssr/runtime-globals');
const { loadKitModules } = require('../static/ssr/kit-modules');

const BASE = `Noodl.defineModule({ nodes: [{ name: 'zz.base', category: 'Math' }], exports: { greet: function (n) { return 'hello ' + n; } } });`;
const USER = `
var base = Noodl.getModule('zz-base');
Noodl.defineModule({ nodes: [{ name: 'aa.user', category: 'Math' }], readAtDefinition: base ? base.greet('island') : 'nothing' });`;

/** A deploy root holding the kits, and the page the injector writes for them. */
async function deploy(kits) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'isl013-ssr-'));
  for (const [folder, { manifest, source }] of Object.entries(kits)) {
    fs.mkdirSync(path.join(root, 'noodl_modules', folder), { recursive: true });
    fs.writeFileSync(path.join(root, 'noodl_modules', folder, 'manifest.json'), JSON.stringify(manifest));
    fs.writeFileSync(path.join(root, 'noodl_modules', folder, 'index.js'), source);
  }
  const modules = toInjectModules(await scanModuleManifests(root));
  const html = injectIntoTemplate(`<html><head>${DEPENDENCIES_PLACEHOLDER}</head><body>${MAIN_PLACEHOLDER}</body></html>`, buildInjectionTags(modules, '/'));
  return { root, html };
}

async function render(kits) {
  installRuntimeGlobals({ React: {}, ReactDOMServer: {}, XMLHttpRequest: function XMLHttpRequest() {}, fetch: () => Promise.resolve() });
  const { root, html } = await deploy(kits);
  const warnings = [];
  const result = loadKitModules({ htmlData: html, rootDir: root, warn: (w) => warnings.push(w) });
  return { result, warnings, modules: globalThis.__noodl_modules };
}

const user = (requires) => ({ manifest: { name: 'User', main: 'index.js', ...(requires ? { requires } : {}) }, source: USER });
const base = { manifest: { name: 'Base Kit', main: 'index.js' }, source: BASE };

describe('ISL-013 on the server render', () => {
  test('a kit that requires another reads it at definition, by folder, through Noodl.getModule', async () => {
    const { modules, warnings } = await render({ 'aa-user': user(['zz-base']), 'zz-base': base });
    expect(modules.map((m) => m.name)).toEqual(['Base Kit', 'User']);
    expect(modules[0].folder).toBe('zz-base');
    expect(modules[1].readAtDefinition).toBe('hello island');
    expect(warnings).toEqual([]);
  });

  test('…and by name', async () => {
    const { modules } = await render({ 'aa-user': { ...user(['Base Kit']), source: USER.replace("'zz-base'", "'Base Kit'") }, 'zz-base': base });
    expect(modules[1].readAtDefinition).toBe('hello island');
  });

  test('the reverted arm: without requires the user sorts first and finds nothing', async () => {
    const { modules } = await render({ 'aa-user': user(), 'zz-base': base });
    expect(modules.map((m) => m.name)).toEqual(['User', 'Base Kit']);
    expect(modules[0].readAtDefinition).toBe('nothing');
    expect(modules[1].folder).toBeUndefined(); // nobody requires it, so the page says nothing new about it
  });

  test('installed alone, the user is not loaded, and the server log names it and why', async () => {
    const { modules, warnings, result } = await render({ 'aa-user': user(['zz-base']) });
    expect(modules).toEqual([]);
    expect(result.loaded).toEqual([]);
    expect(warnings).toEqual(['SSR: The kit "User" was not loaded: it needs "zz-base", which is not installed in this project']);
  });

  test('getModule answers undefined for a kit that is not there, and the folder marker does not leak', async () => {
    const { modules } = await render({ 'aa-user': user(['zz-base']), 'zz-base': base });
    expect(globalThis.Noodl.getModule('nope')).toBeUndefined();
    expect(globalThis.Noodl.getModule('zz-base').greet('x')).toBe('hello x');
    expect(modules[1].folder).toBeUndefined();
    expect(globalThis.__noodl_module_folder).toBeUndefined();
  });
});
