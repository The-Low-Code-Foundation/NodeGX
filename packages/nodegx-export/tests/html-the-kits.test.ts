/**
 * P134 session 13 — kit nodes in the HTML export, by Richard's R8 (2026-11-04): "A little React just to run the kits is
 * totally justifiable. We're not religious about HTML only."
 *
 * A kit node is its author's own React component, so the HTML export runs it the way the React export does (EXP-010
 * Route B): the kit's script as written, behind the same bridge (`lib/kits.js` is the React export's `runtime.tsx`, its
 * types out), on React 19's global builds (`lib/vendor/`, the files the running app's deploy loads), written into an app
 * only when one of its pages draws a kit node. Each node is a `display: contents` box `mountKitNode` renders with
 * `createRoot`, again whenever what its inputs read changes.
 *
 * §A grades it on the React export's own kit desk (`fixtures/kit-signals`, GAM-017: a Fire button pulsing a kit's signal
 * inputs, a signal prop and an `inputs` + `valueChangedToTrue` signal, beside an unwired copy), pressed in both arms and
 * read by the kit's own elements, against a prediction written first. §B checks the four templates that use kits.
 */

import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { loadCatalog } from '../src/catalog';
import { parseProject } from '../src/parse/parseProject';
import { emitApp } from '../src/emit/emitApp';
import { emitHtmlApp } from '../src/emit/html/emitHtml';
import { KITS_JS } from '../src/emit/html/kitsJs';
import { reactGlobalsDir } from '../src/emit/html/reactGlobals';
import { htmlArm } from './helpers/export-html-arm';
import { htmlKitsJs } from './helpers/html-core-js';
import { openHtmlExport } from './helpers/html-in-jsdom';

const catalog = loadCatalog();
const TEMPLATES = path.join(__dirname, '..', '..', '..', 'templates');

/** The export's text files with its copies read in (a kit's script is a copy, as written): the folder as it lands. */
const landed = (out: { files: Record<string, string>; copies: Array<{ from: string; to: string }> }, project: string): Record<string, string> => {
  const files = { ...out.files };
  for (const c of out.copies) if (/\.(js|mjs|css|json)$/.test(c.to)) files[c.to] = fs.readFileSync(path.join(project, c.from), 'utf8');
  return files;
};

describe('§A the kit desk, in both exports', () => {
  const desk = path.join(__dirname, 'fixtures', 'kit-signals');
  const ir = parseProject(desk, catalog);
  const html = emitHtmlApp(ir, catalog);
  const STEPS = ['Fire', 'Fire'];
  const CELLS = '[data-face]';
  /** The page's Text, then each face: "<face> <how many times it reacted>"; predicted from GAM-017's rules. */
  const EXPECTED = [
    ['gam017 page drew', 'cell=signal-prop 0', 'cell=signal-prop 0', 'cell=inputs-route 0'],
    ['gam017 page drew', 'cell=signal-prop 1', 'cell=signal-prop 0', 'cell=inputs-route 1'], // both wired ways pulse; the unwired copy does not
    ['gam017 page drew', 'cell=signal-prop 2', 'cell=signal-prop 0', 'cell=inputs-route 2']
  ];
  let fromReact: string[][];
  let fromHtml: string[][];
  beforeAll(async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-desk-react-'));
    const react = emitApp(ir, catalog);
    for (const [file, text] of Object.entries(react.files)) {
      fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
      fs.writeFileSync(path.join(dir, file), text);
    }
    for (const c of react.copies) {
      fs.mkdirSync(path.dirname(path.join(dir, c.to)), { recursive: true });
      fs.copyFileSync(path.join(desk, c.from), path.join(dir, c.to));
    }
    try {
      fromReact = JSON.parse(
        execFileSync(process.execPath, [path.join(__dirname, 'helpers', 'export-react-arm.js')], {
          input: JSON.stringify([{ dir, scenarios: [STEPS], settled: true, cells: CELLS }]),
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe'],
          timeout: 180000,
          maxBuffer: 16 * 1024 * 1024
        })
      )[0][0];
    } catch (e) {
      fromReact = [[`the React arm threw: ${String((e as { stderr?: unknown }).stderr ?? e).split('\n')[0]}`]];
    }
    fromHtml = (await htmlArm(landed(html, desk), [STEPS], { cells: CELLS }))[0];
  }, 300000);

  it('A0. no kit node is left out; the app carries the bridge, React\'s two builds, the kit\'s module and its script as written', () => {
    expect(html.preflight.htmlLosses.filter((l) => !/app shell's own Group/.test(l.what))).toEqual([]);
    for (const f of ['lib/kits.js', 'lib/vendor/react.production.min.js', 'lib/vendor/react-dom.production.min.js', 'kits/gam017-kit.js']) expect(Object.keys(html.files)).toContain(f);
    expect(html.copies.map((c) => c.to)).toContain('noodl_modules/gam017-kit/index.js');
    expect(html.files['index.html']).toMatch(/<script src="lib\/vendor\/react\.production\.min\.js"><\/script>\n\s*<script src="lib\/vendor\/react-dom\.production\.min\.js"><\/script>\n\s*<script type="module" src="app\.js"><\/script>/);
    expect(html.files['kits/gam017-kit.js']).toMatch(/import '\.\.\/lib\/kits\.js';\nimport '\.\.\/noodl_modules\/gam017-kit\/index\.js';/);
  });

  it('A1. the React export reads the prediction at every press', () => {
    expect(fromReact).toEqual(EXPECTED);
  });

  it('A2. the HTML export reads what the React export reads at every press', () => {
    expect(fromHtml).toEqual(fromReact);
  });

  it('A3. lib/kits.js is the React export\'s kit bridge with its types out, made again from its source; React is the deploy\'s own build', () => {
    expect(KITS_JS).toBe(htmlKitsJs());
    expect(KITS_JS).not.toMatch(/from 'react'|: KitDefinition|interface /);
    const viewer = path.join(__dirname, '..', '..', 'noodl-viewer-react', 'static', 'shared-react19');
    expect(html.files['lib/vendor/react.production.min.js']).toBe(fs.readFileSync(path.join(viewer, 'react.production.min.js'), 'utf8'));
    expect(html.files['lib/vendor/react-dom.production.min.js']).toBe(fs.readFileSync(path.join(viewer, 'react-dom.production.min.js'), 'utf8'));
    expect(fs.existsSync(reactGlobalsDir())).toBe(true);
  });

  it('A4. a mutant that renders the node once, not again when its inputs change, never hears Fire (killed)', async () => {
    const again = /l\.run\(function \(\) \{\n\s*root\.render\(React\.createElement\(KitNode, \{ type: type, params: params\(\), signals: signals, values: values \}\)\);\n\s*\}\);/;
    expect(KITS_JS).toMatch(again);
    const once = KITS_JS.replace(again, 'root.render(React.createElement(KitNode, { type: type, params: params(), signals: signals, values: values }));');
    const readings = (await htmlArm({ ...landed(html, desk), 'lib/kits.js': once }, [STEPS.slice(0, 1)], { cells: CELLS }))[0];
    expect(readings[1]).toEqual(EXPECTED[0]);
  }, 120000);

  it('A5. an app with no kit node carries no React', () => {
    const plain = emitHtmlApp(parseProject(path.join(TEMPLATES, 'todo-list'), catalog), catalog);
    expect(Object.keys(plain.files).filter((f) => /^lib\/(vendor|kits)/.test(f))).toEqual([]);
    expect(plain.files['index.html']).not.toContain('react');
  });
});

describe('§B the templates that use kits', () => {
  const APPS = ['rocket-school', 'star-class', 'digital-bricks-training', 'nightbook'];

  it.each(APPS)('B1. %s: every kit node is drawn by its kit, none left out', (app) => {
    const out = emitHtmlApp(parseProject(path.join(TEMPLATES, app), catalog), catalog);
    expect(out.preflight.htmlLosses.filter((l) => /kit node|custom node/.test(l.what))).toEqual([]);
    expect(out.files['lib/kits.js']).toBe(KITS_JS);
  });

  it('B2. rocket-school\'s HTML export loads in jsdom with the game kit\'s own script, and its start page draws', async () => {
    const project = path.join(TEMPLATES, 'rocket-school');
    const out = emitHtmlApp(parseProject(project, catalog), catalog);
    const page = await openHtmlExport(landed(out, project));
    try {
      expect(page.text().length).toBeGreaterThan(0);
      expect(page.document.querySelectorAll('[data-nodegx-missing-kit-node]').length).toBe(0);
    } finally {
      page.close();
    }
  }, 120000);
});
