/**
 * P134 HTX-006 — one part inside another page.
 *
 * `nodegx export --target html --component <name>` writes one component and what it needs into a folder a page of
 * someone else's shares: the whole export's own files for that part (the same bytes), an entry (`<Name>.js`), the one
 * stylesheet to link (`<Name>.css`) and the cut where the page's styles stop (`styles/<Name>.floor.css`), and a
 * manifest (`nodegx-export.json`) that lets it export again without touching a file it did not write.
 *
 * The fixture is `fixtures/game-menu`: a settings menu (a volume slider, a Resume button) built for HTX-006's three.js
 * page. The page itself, and the Chrome drive that widens the menu and re-exports it, are in
 * `dev-docs/tasks/phase-134-the-app-in-plain-files/htx-006/`.
 */

import { createHash } from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { loadCatalog } from '../src/catalog';
import { parseArgs } from '../src/cli/args';
import { chooseHtmlPart, emitHtmlApp, emitHtmlComponent, type EmittedHtmlComponent } from '../src/emit/html/emitHtml';
import { parseProject } from '../src/parse/parseProject';
import { PART_MANIFEST, writePart, type PartManifest } from '../src/write/writePart';
import { bundleApp } from './helpers/html-in-jsdom';

const MENU = path.join(__dirname, 'fixtures', 'game-menu');
const catalog = loadCatalog();
const whole = emitHtmlApp(parseProject(MENU, catalog), catalog);
const partOf = (dir: string): EmittedHtmlComponent => {
  const out = emitHtmlComponent(parseProject(dir, catalog), catalog, 'Settings');
  if ('refused' in out) throw new Error(out.refused);
  return out;
};
const part = partOf(MENU);
const sha = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');

/** Every file under `dir`, relative, with its bytes' hash. */
function snapshot(dir: string): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (at: string) => {
    for (const e of fs.readdirSync(at, { withFileTypes: true })) {
      const p = path.join(at, e.name);
      if (e.isDirectory()) walk(p);
      else out[path.relative(dir, p)] = sha(fs.readFileSync(p));
    }
  };
  walk(dir);
  return out;
}
const tmp = (name: string) => fs.mkdtempSync(path.join(os.tmpdir(), `htx006-${name}-`));
/** A game's folder, with files of its own. */
function gameFolder(): string {
  const dir = tmp('game');
  fs.writeFileSync(path.join(dir, 'index.html'), '<!doctype html><title>game</title>\n');
  fs.writeFileSync(path.join(dir, 'game.js'), "import { mountSettings } from './Settings.js';\n");
  fs.mkdirSync(path.join(dir, 'vendor'));
  fs.writeFileSync(path.join(dir, 'vendor', 'three.module.min.js'), '// three\n');
  return dir;
}
/** A copy of the menu project with its panel `px` wide (what Studio writes when the width is changed). */
function menuAt(px: number): string {
  const dir = tmp('menu');
  fs.cpSync(MENU, dir, { recursive: true });
  const file = path.join(dir, 'components', 'Menu', 'Settings', 'nodes.json');
  const nodes = JSON.parse(fs.readFileSync(file, 'utf8'));
  nodes.nodes.find((n: { id: string }) => n.id === 'panel').parameters.width = { value: px, unit: 'px' };
  fs.writeFileSync(file, JSON.stringify(nodes, null, 2) + '\n');
  return dir;
}
const write = (dir: string, p: EmittedHtmlComponent = part) => writePart(MENU, 'Game menu', dir, p, fs);

describe('P134 HTX-006: one part inside another page', () => {
  it('writes the part, what it places and imports, an entry, its stylesheet and the cut — no index.html, no router', () => {
    expect(Object.keys(part.files)).toEqual(['Settings.css', 'Settings.js', 'components/Settings.css', 'components/Settings.js', 'lib/core.js', 'lib/dom.js', 'styles/Settings.floor.css']);
    expect(part.entry).toEqual({ js: 'Settings.js', css: 'Settings.css', mount: 'mountSettings' });
    expect(part.component).toBe('Menu/Settings');
    expect(part.copies).toEqual([]);
    expect(part.preflight.planRefusals).toEqual([]);
    expect(part.preflight.htmlLosses).toEqual([]);
  });

  it("is the whole export's own files, byte for byte: a part exported alone and in its app is the same file", () => {
    for (const file of ['components/Settings.css', 'components/Settings.js', 'lib/core.js', 'lib/dom.js']) expect(part.files[file]).toBe(whole.files[file]);
  });

  it('scopes its look to its box: the tokens on the box, not :root; nothing on body; the cut before its own sheets', () => {
    const css = part.files['Settings.css'];
    expect(css.split('\n').filter((l) => l.startsWith('@import'))).toEqual(["@import url('styles/Settings.floor.css');", "@import url('components/Settings.css');"]);
    expect(css).toMatch(/\n\.nodegx-Settings \{\n {2}\/\* Main brand and action color \*\/\n {2}--primary: /);
    for (const text of [css, part.files['styles/Settings.floor.css'], part.files['components/Settings.css']]) {
      expect(text).not.toMatch(/:root|(^|\n)\s*body\b|(^|\n)\s*html\b/);
    }
    // Every rule of the cut names the box, so it reaches nothing of the page's.
    const floor = part.files['styles/Settings.floor.css'].replace(/\/\*[\s\S]*?\*\//g, '');
    const selectors = floor.split('\n').filter((l) => /[{,]$/.test(l) && !l.startsWith(' '));
    expect(selectors.length).toBe(9);
    for (const selector of selectors) expect(selector).toMatch(/^\.nodegx-Settings[ {]/);
    expect(floor).toContain('.nodegx-Settings {\n  all: initial;');
    expect(floor).toContain('.nodegx-Settings :where(*)::after {\n  all: revert;\n}');
  });

  describe('its outputs, for a page that is not NodeGX', () => {
    let page: { window: any; part: any; calls: string[]; got: { volume: unknown[]; resume: number }; atMount: { calls: string[]; volume: unknown[] } };
    beforeEach(async () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { JSDOM } = require('jsdom');
      const dom = new JSDOM('<!doctype html><body><main id="game"><canvas></canvas><div id="overlay"></div></main></body>', { runScripts: 'outside-only', pretendToBeVisual: true });
      const host = [
        "import { mountSettings } from './Settings.js';",
        'window.calls = [];',
        'window.got = { volume: [], resume: 0 };',
        "window.part = mountSettings(document.getElementById('overlay'), {",
        '  volume: 0.8,',
        "  onVolumeChanged(v) { window.calls.push('volume ' + v); },",
        "  onResume() { window.calls.push('resume'); }",
        '});',
        'window.part.outputs.volume.subscribe(function (v) { window.got.volume.push(v); });',
        'window.part.outputs.resume.subscribe(function () { window.got.resume += 1; });',
        ''
      ].join('\n');
      dom.window.eval(await bundleApp({ ...part.files, 'host.js': host }, 'host.js'));
      await new Promise((r) => dom.window.setTimeout(r, 0));
      // What mounting sent, kept apart; each case below starts from a settled part.
      const atMount = { calls: dom.window.calls.splice(0), volume: dom.window.got.volume.splice(0) };
      page = { window: dom.window, part: dom.window.part, calls: dom.window.calls, got: dom.window.got, atMount };
    });
    const flush = () => new Promise((r) => page.window.setTimeout(r, 0));

    it('draws into the element it is given, inside a box of its own that lays out as if it were not there', () => {
      const box = page.window.document.querySelector('#overlay > .nodegx-Settings');
      expect(box.style.display).toBe('contents');
      expect(box.firstElementChild.className).toBe('Settings-panel');
      expect(box.textContent).toBe('PausedVolumeResume');
      expect(page.window.document.querySelector('input[type="range"]').value).toBe('0.8');
    });

    it("at mount, the value output settles on the volume it is given; the page's subscriber hears that value", () => {
      // The slider starts at its own 0, then follows its input to 0.8: a NodeGX parent's callback hears both, in React's
      // order (\`useState(0)\`, then the sync effect); the page subscribes after the mount returns, between the two.
      expect(page.atMount.calls).toEqual(['volume 0', 'volume 0.8']);
      expect(page.atMount.volume).toEqual([0.8]);
      expect(page.part.outputs.volume.peek()).toBe(0.8);
    });

    it('a value output is a value: its last value read at once, each new one to every subscriber', async () => {
      expect(page.part.outputs.volume.peek()).toBe(0.8);
      const slider = page.window.document.querySelector('input[type="range"]');
      slider.value = '0.25';
      slider.dispatchEvent(new page.window.Event('input'));
      await flush();
      expect(page.got.volume).toEqual([0.25]);
      expect(page.part.outputs.volume.peek()).toBe(0.25);
      // The callback a NodeGX parent passes is called as before, first.
      expect(page.calls).toEqual(['volume 0.25']);
    });

    it('a signal output is a signal: one call per press, nothing kept', async () => {
      const resume = page.window.document.querySelector('button');
      resume.click();
      resume.click();
      await flush();
      expect(page.got.resume).toBe(2);
      expect(page.calls).toEqual(['resume', 'resume']);
      expect('peek' in page.part.outputs.resume).toBe(false);
    });

    it("update() is the inputs: the slider follows a new volume, and the value output says it, as the app's own wire would", async () => {
      page.part.update({ volume: 0.5 });
      await flush();
      expect(page.window.document.querySelector('input[type="range"]').value).toBe('0.5');
      expect(page.got.volume).toEqual([0.5]);
    });

    it('destroy() takes the part and its box away, and nothing it made runs after', async () => {
      page.part.destroy();
      expect(page.window.document.querySelector('.nodegx-Settings')).toBeNull();
      expect(page.window.document.getElementById('overlay').childNodes.length).toBe(0);
      page.part.update({ volume: 0.1 });
      await flush();
      expect(page.got.volume).toEqual([]);
    });
  });

  describe('the manifest: export again, and only its own files change', () => {
    it("writes into a folder of the page's own and touches none of the page's files", () => {
      const dir = gameFolder();
      const before = snapshot(dir);
      const r = write(dir);
      expect(r).toMatchObject({ ok: true, first: true, removed: [], unchanged: [] });
      const after = snapshot(dir);
      for (const [file, hash] of Object.entries(before)) expect(after[file]).toBe(hash);
      const manifest: PartManifest = JSON.parse(fs.readFileSync(path.join(dir, PART_MANIFEST), 'utf8'));
      expect(manifest.component).toBe('Menu/Settings');
      expect(Object.keys(manifest.files)).toEqual(Object.keys(part.files));
      for (const [file, hash] of Object.entries(manifest.files)) expect(after[file]).toBe(hash);
    });

    it('exported again unchanged, it writes nothing but its manifest', () => {
      const dir = gameFolder();
      write(dir);
      const r = write(dir);
      expect(r).toMatchObject({ ok: true, first: false, written: [], removed: [] });
      if (r.ok) expect(r.unchanged).toEqual(Object.keys(part.files));
    });

    it("the menu made wider: one file is written again, the page's own files are byte-identical", () => {
      const dir = gameFolder();
      write(dir);
      const before = snapshot(dir);
      const wider = partOf(menuAt(420));
      expect(wider.files['components/Settings.css']).toContain('width: 420px;');
      const r = writePart(MENU, 'Game menu', dir, wider, fs);
      expect(r).toMatchObject({ ok: true, written: ['components/Settings.css'], removed: [] });
      const after = snapshot(dir);
      for (const file of ['index.html', 'game.js', path.join('vendor', 'three.module.min.js')]) expect(after[file]).toBe(before[file]);
      expect(fs.readFileSync(path.join(dir, 'components', 'Settings.css'), 'utf8')).toContain('width: 420px;');
    });

    it('a file it wrote, changed by hand since: it refuses, names the file, and writes nothing', () => {
      const dir = gameFolder();
      write(dir);
      fs.appendFileSync(path.join(dir, 'components', 'Settings.css'), '\n.Settings-panel { outline: 1px solid red; }\n');
      const before = snapshot(dir);
      const r = writePart(MENU, 'Game menu', dir, partOf(menuAt(420)), fs);
      expect(r.ok).toBe(false);
      if (r.ok === false) {
        expect(r.files).toEqual(['components/Settings.css']);
        expect(r.reason).toContain('components/Settings.css');
        expect(r.reason).toContain('Nothing was written.');
      }
      expect(snapshot(dir)).toEqual(before);
    });

    it("a file of the page's own where it would write: it refuses by name and writes nothing", () => {
      const dir = gameFolder();
      fs.mkdirSync(path.join(dir, 'lib'));
      fs.writeFileSync(path.join(dir, 'lib', 'core.js'), '// the game engine\n');
      const before = snapshot(dir);
      const r = write(dir);
      expect(r).toMatchObject({ ok: false, files: ['lib/core.js'] });
      expect(snapshot(dir)).toEqual(before);
    });

    it("a folder that holds another part's export: refused, since the two would remove each other's files", () => {
      const dir = gameFolder();
      fs.writeFileSync(path.join(dir, PART_MANIFEST), JSON.stringify({ component: 'Menu/Inventory', files: {} }));
      const r = write(dir);
      expect(r.ok).toBe(false);
      if (r.ok === false) expect(r.reason).toContain('"Menu/Inventory"');
    });

    it('a file it wrote last time and no longer writes is removed, and a folder it emptied with it; nothing else', () => {
      const dir = gameFolder();
      write(dir);
      // An earlier export placed a part this one no longer places (its file, its hash in the manifest).
      const stale = path.join('components', 'parts', 'Old.js');
      fs.mkdirSync(path.join(dir, 'components', 'parts'));
      fs.writeFileSync(path.join(dir, stale), '// gone\n');
      const manifestPath = path.join(dir, PART_MANIFEST);
      const m: PartManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      m.files[stale] = sha('// gone\n');
      fs.writeFileSync(manifestPath, JSON.stringify(m));
      const r = write(dir);
      expect(r).toMatchObject({ ok: true, removed: [stale], written: [] });
      expect(fs.existsSync(path.join(dir, 'components', 'parts'))).toBe(false);
      expect(fs.existsSync(path.join(dir, 'components', 'Settings.js'))).toBe(true);
      expect(fs.existsSync(path.join(dir, 'game.js'))).toBe(true);
    });
  });

  describe('naming the part', () => {
    it('by its path or, when only one has it, its last name; a logic component and an unknown name refused in a sentence', () => {
      expect(chooseHtmlPart(whole.parts, 'Menu/Settings')).toMatchObject({ ok: true, part: { path: 'Menu/Settings' } });
      expect(chooseHtmlPart(whole.parts, '/Menu/Settings')).toMatchObject({ ok: true });
      expect(chooseHtmlPart(whole.parts, 'Settings')).toMatchObject({ ok: true });
      const unknown = chooseHtmlPart(whole.parts, 'Inventory');
      expect(unknown).toEqual({ ok: false, reason: 'The project has no component "Inventory". The components it can export: "Menu/Settings", "Pages/Preview".' });
      const two = chooseHtmlPart([...whole.parts, { ...whole.parts[1], path: 'Other/Settings' }], 'Settings');
      expect(two).toMatchObject({ ok: false, reason: expect.stringContaining('is the name of 2 components') });
      const logic = chooseHtmlPart([...whole.parts, { path: 'Logic/Clock', file: 'components/Clock.js', mount: 'mountClock', logic: true, page: false }], 'Logic/Clock');
      expect(logic).toMatchObject({ ok: false, reason: expect.stringContaining('is a logic component') });
    });

    it('`--component` takes a name and needs --target html; `--out-dir` names the folder', () => {
      expect(parseArgs(['export', '--target', 'html', '--component', 'Settings', 'proj', '--out-dir', 'game'])).toMatchObject({ kind: 'export', component: 'Settings', projectDir: 'proj', outDir: 'game', target: 'html' });
      expect(parseArgs(['export', '--target', 'html', 'proj', 'out'])).toMatchObject({ kind: 'export', component: null });
      expect(parseArgs(['export', '--component', 'Settings', 'proj', 'out'])).toEqual({ kind: 'usage', problem: '`--component` exports one component as plain files, so it needs `--target html`.' });
      expect(parseArgs(['export', '--target', 'html', '--component'])).toEqual({ kind: 'usage', problem: '`--component` needs a value.' });
    });
  });
});
