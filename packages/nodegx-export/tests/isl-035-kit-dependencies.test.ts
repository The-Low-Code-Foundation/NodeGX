/**
 * P109-S17-EXPORTKITDEPS (ISL-035) — an exported app loads a kit's `manifest.dependencies`, as the deployed one does.
 *
 * The export copied each dependency to `public/` and no file referenced it, so a kit that reads `window.THREE` at mount
 * threw in the exported app (blanking the page, P109-S17-KITTHROWBLANKS) and drew in the deployed one.
 *
 * 🔴 **The expected column is the deploy's own tag builder.** The same project on disk goes through
 * `@nodegx/module-inject`'s `scanModuleManifestsSync` → `toInjectModules` → `buildInjectionTags`, which is what
 * `nodegx deploy` writes into `<%modules_dependencies%>`; the exported `index.html` must load the same scripts in the
 * same order. The project carries the shapes the injector treats differently: a relative and an `http` entry, the same
 * URL from two modules (loaded once), a module with no `main` (ordered after the kits), a cloud-only module (not
 * loaded on a page), and a kit refused for a missing `requires` (its dependencies never load).
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { loadCatalog } from '../src/catalog';
import { emitApp } from '../src/emit/emitApp';
import { parseProject } from '../src/parse/parseProject';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const inject = require('@nodegx/module-inject') as {
  scanModuleManifestsSync: (dir: string) => unknown[];
  toInjectModules: (scanned: unknown[]) => unknown[];
  buildInjectionTags: (modules: unknown[], pathPrefix: string) => { dependencies: string; modulesMain: string };
};

const catalog = loadCatalog();
const SOURCE = path.join(__dirname, 'fixtures', 'kit-signals');

const write = (dir: string, file: string, text: string) => {
  fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
  fs.writeFileSync(path.join(dir, file), text);
};

/** kit-signals, whose one kit's nodes the page uses, with four more modules beside it. */
const makeProject = (): string => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'isl035-kitdeps-'));
  fs.cpSync(SOURCE, dir, { recursive: true });
  const kit = path.join('noodl_modules', 'gam017-kit');
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, kit, 'manifest.json'), 'utf8'));
  manifest.dependencies = ['lib/three.bundle.js', 'https://cdn.example.com/shared.js'];
  write(dir, path.join(kit, 'manifest.json'), JSON.stringify(manifest));
  write(dir, path.join(kit, 'lib', 'three.bundle.js'), 'window.THREE = { ok: true };\n');
  // No `main`: the injector orders it after every kit that has one, whatever its folder sorts as.
  write(dir, 'noodl_modules/a-lib/manifest.json', JSON.stringify({ name: 'A Lib', dependencies: ['https://cdn.example.com/shared.js', 'a.js'] }));
  write(dir, 'noodl_modules/a-lib/a.js', 'window.A = 1;\n');
  // Cloud only: its files ship, nothing on a page loads them.
  write(dir, 'noodl_modules/cloud-lib/manifest.json', JSON.stringify({ name: 'Cloud Lib', runtimes: ['cloud'], dependencies: ['c.js'] }));
  write(dir, 'noodl_modules/cloud-lib/c.js', 'module.exports = {};\n');
  // Needs a kit nobody installed: refused, so its dependency never loads.
  write(
    dir,
    'noodl_modules/needy-kit/manifest.json',
    JSON.stringify({ name: 'Needy', main: 'index.js', requires: ['missing-kit'], dependencies: ['needy-dep.js'] })
  );
  write(dir, 'noodl_modules/needy-kit/index.js', 'Noodl.defineModule({ nodes: [] });\n');
  write(dir, 'noodl_modules/needy-kit/needy-dep.js', 'window.NEEDY = 1;\n');
  return dir;
};

const scriptSrcs = (html: string): string[] => [...html.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)].map((m) => m[1]);

describe('P109-S17-EXPORTKITDEPS — the exported page loads what the deployed page loads', () => {
  const dir = makeProject();
  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));
  const app = emitApp(parseProject(dir, catalog), catalog);
  const html = app.files['index.html'];
  const deployed = scriptSrcs(inject.buildInjectionTags(inject.toInjectModules(inject.scanModuleManifestsSync(dir)), '/').dependencies);

  it('the deploy loads three dependencies here, in its order, and the export loads the same three', () => {
    expect(deployed).toEqual(['/noodl_modules/gam017-kit/lib/three.bundle.js', 'https://cdn.example.com/shared.js', '/noodl_modules/a-lib/a.js']);
    expect(scriptSrcs(html).filter((src) => src !== '/src/main.tsx')).toEqual(deployed);
  });

  it('each dependency is a classic script before the app’s module script, so it has run when the bundled kit evaluates', () => {
    const app_ = html.indexOf('<script type="module" src="/src/main.tsx">');
    for (const src of deployed) {
      const tag = `<script src="${src}"></script>`;
      expect(html).toContain(tag);
      expect(html.indexOf(tag)).toBeLessThan(app_);
    }
  });

  it('every local dependency is copied to the public path its tag names', () => {
    for (const src of deployed.filter((s) => s.startsWith('/'))) {
      expect(app.copies).toContainEqual({ from: src.slice(1), to: `public${src}` });
    }
  });

  it('a project whose kits declare no dependencies gets no tag, as before', () => {
    const plain = emitApp(parseProject(SOURCE, catalog), catalog);
    expect(scriptSrcs(plain.files['index.html'])).toEqual(['/src/main.tsx']);
  });
});
