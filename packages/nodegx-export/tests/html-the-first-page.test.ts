/**
 * P134 HTX-001 — the first page in plain files.
 *
 * story-engine (the smallest template, as EXP-022 S1 chose it) goes through `emitHtmlApp`, which reads the plan the
 * React and Swift exports read, and comes out as a folder of HTML, CSS and JavaScript with nothing to install. These
 * assertions run that folder in jsdom (`helpers/html-in-jsdom.ts`: `app.js` and every module it imports, from the
 * export's own files only) and read the first page's words off it. The screenshot beside `nodegx render` is in
 * `dev-docs/tasks/phase-134-the-app-in-plain-files/htx-001/`.
 */

import * as path from 'path';

import { loadCatalog } from '../src/catalog';
import { parseProject } from '../src/parse/parseProject';
import { emitHtmlApp } from '../src/emit/html/emitHtml';
import { CORE_JS } from '../src/emit/html/coreJs';
import { htmlCoreJs } from './helpers/html-core-js';
import { bundleApp, openHtmlExport } from './helpers/html-in-jsdom';

const STORY = path.join(__dirname, '..', '..', '..', 'templates', 'story-engine');
const catalog = loadCatalog();
const app = emitHtmlApp(parseProject(STORY, catalog), catalog);

describe('P134 HTX-001: story-engine as plain files', () => {
  it('writes a folder with nothing to install: no package.json, no TypeScript, no framework', () => {
    expect(Object.keys(app.files)).toEqual([
      'EXPORT-PREFLIGHT.md',
      'README.md',
      'app.js',
      'components/Carried.css',
      'components/Carried.js',
      'components/Choice.css',
      'components/Choice.js',
      'components/Passage.css',
      'components/Passage.js',
      'components/Paster.css',
      'components/Paster.js',
      'components/Sidebar.css',
      'components/Sidebar.js',
      // HTX-002: the logic component, its Function in a file of its own, the runner, and the app's Variables.
      'components/Source.js',
      'functions/components/Source/Which_story_is_being_read.js',
      'index.html',
      'lib/animate.js',
      'lib/core.js',
      'lib/dom.js',
      'lib/functionRun.js',
      'lib/router.js',
      // HTX-002: the States node is the React export's own machine (`statesLib.ts`), its types out.
      'lib/states.js',
      'pages/Read.css',
      'pages/Read.js',
      'pages/Remix.css',
      'pages/Remix.js',
      'styles/app.css',
      'styles/base.css',
      'styles/theme.css',
      'variables.js'
    ]);
    for (const [file, text] of Object.entries(app.files)) {
      if (!file.endsWith('.js')) continue;
      // Every import is a relative path to a file in the folder: no package, no bundler.
      for (const m of text.matchAll(/^import .* from '([^']+)';$/gm)) expect(m[1]).toMatch(/^\.\.?\//);
      expect(text).not.toMatch(/from '(react|react-dom|vite)/);
    }
    expect(app.files['index.html']).toContain('<script type="module" src="app.js"></script>');
    // The fonts travel as the project's own files, linked relative to the page so the folder works from anywhere.
    expect(app.files['index.html']).toContain('<link rel="stylesheet" href="noodl_modules/story-engine-fonts/styles.css" />');
    expect(app.copies.map((c) => c.to)).toContain('noodl_modules/story-engine-fonts/styles.css');
  });

  it('is deterministic: the same project prints the same files', () => {
    expect(emitHtmlApp(parseProject(STORY, catalog), catalog).files).toEqual(app.files);
  });

  it("carries @nodegx/core's own source as lib/core.js, made again from the core here", () => {
    expect(CORE_JS).toBe(htmlCoreJs());
    expect(app.files['lib/core.js']).toBe(CORE_JS);
    expect(CORE_JS).toMatch(/\nexport \{\n  Value,\n  value,\n  Derived,[\s\S]*\n  effect,\n[\s\S]*\};\n$/);
  });

  it("prints the plan's decisions: the start page, a navigate, a States table, a mounted", () => {
    expect(app.files['app.js']).toContain("start: '/read'");
    const read = app.files['pages/Read.js'];
    expect(read).toContain("navigate('/remix');");
    expect(read).toContain("const whatThePageHasToSayInWords = statesNode(WHAT_THE_PAGE_HAS_TO_SAY_IN_WORDS_STATES, 'reading');");
    expect(read).toContain("note: { type: 'string', byState: { reading: '', ending: 'That is an ending.");
    expect(read).toContain(
      [
        '  when(l, rdShell, function () {',
        '    const on = whatThePageHasToSayInWords.get().values.note;',
        '    return on === undefined ? true : truthy(on);',
        '  }, function (into, at, l) {'
      ].join('\n')
    );
    // The Restart press runs a chain the plan refuses: the button draws, its press does nothing, and the preflight says why.
    expect(read).toContain('// Nothing is wired to this press.');
    // A Text whose Tag is span is a span; one with none is a p, as the React export draws it.
    expect(read).toContain("const rdEyebrow = el(rdHead, 'span', 'ReadPage-rdEyebrow', 'An interactive story');");
    expect(read).toContain("const rdSourceLine = el(rdHead, 'p', 'ReadPage-rdSourceLine');");
    // The look is the shared style layer's, one class per node; the author's CSS Class rides beside it.
    expect(app.files['pages/Read.css']).toContain('.ReadPage-rdShell {\n  display: flex;\n  flex-direction: column;\n  align-items: flex-start;\n  width: 100%;\n  max-width: 760px;');
    expect(read).toContain("'ReadPage-rdToRemix pressable'");
    // The shell's CSS Definition, which the React export drops (P18-S140-SHELLUNSAID), is the page's ground here.
    expect(app.files['styles/app.css']).toContain('html, body { background: var(--background); }');
    expect(app.files['styles/theme.css']).toContain('--primary: #8a4f16;');
  });

  it('draws the first page in jsdom from its own files, and a press changes page', async () => {
    const page = await openHtmlExport(app.files);
    try {
      expect(page.document.title).toBe('Read');
      const text = page.text();
      for (const words of [
        'An interactive story',
        // Passage's States node follows the mode the page hands it: "reading", so its eyebrow is the reading one.
        'You are here',
        'What you carry',
        'Nothing yet. Some choices hand you something',
        'Start again',
        'Write your own story',
        'Every passage in this story is one list in the Story/Source component.'
      ]) {
        expect(text).toContain(words);
      }
      // HTX-002: the logic component /Story/Source runs its Function over the Static Data and the Variable, and the value it
      // sends out reaches the page.
      expect(page.document.querySelector('.ReadPage-rdSourceLine').textContent).toBe('The story this template ships with — 7 passages');
      // The note is mounted only while the state's note is non-empty: in "reading" it is "".
      expect(page.document.querySelector('.ReadPage-rdNote')).toBeNull();
      const eyebrow = page.document.querySelector('.Passage-psEyebrow');
      expect(eyebrow.style.getPropertyValue('color')).toBe('var(--muted-foreground)');

      const toRemix = [...page.document.querySelectorAll('button')].find((b: any) => b.textContent === 'Write your own story');
      toRemix.click();
      await page.settle();
      expect(page.window.location.hash).toBe('#/remix');
      expect(page.document.title).toBe('Remix');
      expect(page.text()).toContain('Read this story');
      // The Read page is gone, and nothing it drew stays behind.
      expect(page.document.querySelector('.ReadPage-rdShell')).toBeNull();
    } finally {
      page.close();
    }
  });

  it('opens on the page the address names, so a refresh stays where it was', async () => {
    const page = await openHtmlExport(app.files, '#/remix');
    try {
      expect(page.document.title).toBe('Remix');
      const box = page.document.querySelector('textarea');
      expect(box.placeholder).toBe('Paste a list of passages here…');
      // Its Mounted is wired from the input "problem", which the page does not set: no value keeps the authored Mounted
      // (on), as the running app draws it, so the empty line is there and holds its gap.
      expect(page.document.querySelector('.Paster-paProblem')).not.toBeNull();
    } finally {
      page.close();
    }
  });

  it('refuses an import of anything the export did not write', async () => {
    await expect(bundleApp({ 'app.js': "import { x } from 'react';\n" })).rejects.toThrow(/not a file in the export/);
  });

  it('says before anything is written what will not travel, by node', () => {
    const p = app.preflight;
    expect([...p.components].sort()).toEqual(['mountCarried', 'mountChoice', 'mountPassage', 'mountPaster', 'mountReadPage', 'mountRemixPage', 'mountSidebar']);
    expect(p.logic).toEqual(['Story/Source']);
    // The same plan refusals the Swift preflight counts (EXP-022 S1: 21).
    expect(p.planRefusals).toHaveLength(21);
    const losses = p.htmlLosses.map((l) => `${l.component} ${l.label ?? l.nodeId}: ${l.what}`);
    // The plan gives this For Each no items, so the React export draws no rows either.
    expect(losses).toContain('Pages/Read One row per choice you can see: a For Each whose rows the HTML target does not draw yet (HTX-003)');
    // HTX-002: the Variable is read, and the logic component runs.
    expect(losses.filter((l) => /reads the Variable|logic component/.test(l))).toEqual([]);
    expect(app.files['EXPORT-PREFLIGHT.md']).toContain(`## Read in the plan, not printed by the HTML target yet (${p.htmlLosses.length})`);
  });
});
