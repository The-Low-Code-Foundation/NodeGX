/**
 * P125-PUPPY2-RENDER1MB — render_report's pictures fit the answer.
 *
 * Claude refuses a tool result over 1 MB. Richard's Muddy Paws run (Claude Desktop, 2026-10-24) sent three
 * full-page PNGs of a long landing page and was refused three times; the agent went on without its own evidence.
 * The harness now takes a budget (`imageBudget`, base64 characters for all the subject pictures): a picture over
 * its share is retaken as a JPEG, then cut to its first screens, and carries `fit` saying so.
 *
 * The control comes first: the same page with no budget must be over the share, or the budget arm grades nothing.
 *
 * ⚠️ Needs the built viewer bundle and a Chrome, like every drive in this directory (run with the sandbox off).
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { shotExtent } from '../src/tools/renderTools';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { renderReport } = require(path.resolve(__dirname, '..', '..', '..', 'scripts', 'devtools', 'render-report.js'));

jest.setTimeout(600000);

interface Shot {
  name: string;
  mimeType: string;
  base64: string;
  fit?: { format: string; quality: number; screens: number; of: number; overBudget: boolean };
}

/** One page, forty rows of coloured text: tall (many screens) and busy enough that a PNG of it is large. */
function writeTallProject(dir: string): void {
  const write = (rel: string, value: unknown) => {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), JSON.stringify(value, null, 2));
  };
  const rows = Array.from({ length: 40 }, (_, i) => i);
  write('components/Pages/Home/component.json', { id: 'c-home', name: 'Home', path: '/Pages/Home', type: 'page' });
  write('components/Pages/Home/nodes.json', {
    componentId: 'c-home',
    nodes: [
      { id: 'home', type: 'Page', children: ['col'], parameters: { title: 'Home', urlPath: '' } },
      { id: 'col', type: 'Group', parent: 'home', children: rows.map((i) => `r${i}`), parameters: { sizeMode: 'contentHeight' } },
      ...rows.map((i) => ({
        id: `r${i}`,
        type: 'Text',
        parent: 'col',
        parameters: {
          text: `Row ${i}: ${'The quick brown fox jumps over the lazy dog, again and again. '.repeat(6)}`,
          fontSize: '22px',
          color: `hsl(${(i * 37) % 360}, 70%, 35%)`,
          backgroundColor: `hsl(${(i * 53) % 360}, 80%, 90%)`,
          paddingTop: '40px',
          paddingBottom: '40px'
        }
      }))
    ]
  });
  write('components/App/component.json', { id: 'c-app', name: 'App', path: '/App', type: 'visual' });
  write('components/App/nodes.json', {
    componentId: 'c-app',
    nodes: [
      { id: 'appRoot', type: 'Group', children: ['appRouter'] },
      { id: 'appRouter', type: 'Router', parent: 'appRoot', parameters: { name: 'Main', pages: { startPage: '/Pages/Home', routes: ['/Pages/Home'] } } }
    ]
  });
  write('components/_registry.json', {
    version: 1,
    components: { App: { path: 'App', type: 'visual' }, 'Pages/Home': { path: 'Pages/Home', type: 'page' } }
  });
  write('nodegx.project.json', {
    name: 'RENDER1MB tall page',
    version: '4',
    // The page scrolls (what create_project writes): without it the page is clipped at one screen.
    settings: { htmlTitle: 'RENDER1MB', navigationPathType: 'hash', bodyScroll: true },
    structure: { componentsDir: 'components' },
    rootNodeId: 'appRoot'
  });
}

describe('P125-PUPPY2-RENDER1MB — the harness fits its pictures to a budget', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'render1mb-'));
  writeTallProject(dir);
  const viewports = [
    { name: 'desktop', width: 1280, height: 900 },
    { name: 'phone', width: 390, height: 844 }
  ];
  const BUDGET = 200_000;
  const share = BUDGET / viewports.length;
  let unbudgeted: Shot[] = [];
  let budgeted: Shot[] = [];

  beforeAll(async () => {
    unbudgeted = (await renderReport({ projectDir: dir, viewports, deviceScaleFactor: 0.4, renderRoutedPages: false })).screenshots;
    budgeted = (await renderReport({ projectDir: dir, viewports, deviceScaleFactor: 0.4, renderRoutedPages: false, imageBudget: BUDGET }))
      .screenshots;
  });

  it('control: with no budget, every picture is a PNG over its share, and none says it was fitted', () => {
    expect(unbudgeted.map((s) => s.name)).toEqual(['desktop', 'phone']);
    for (const s of unbudgeted) {
      expect(s.mimeType).toBe('image/png');
      expect(s.base64.length).toBeGreaterThan(share);
      expect(s.fit).toBeUndefined();
    }
  });

  it('with the budget, every picture fits its share', () => {
    expect(budgeted.map((s) => s.name)).toEqual(['desktop', 'phone']);
    for (const s of budgeted) {
      expect(s.base64.length).toBeLessThanOrEqual(share);
      expect(s.fit?.overBudget).toBe(false);
    }
    expect(budgeted.reduce((n, s) => n + s.base64.length, 0)).toBeLessThanOrEqual(BUDGET);
  });

  it('a picture cut to fit says how much of the page it shows, top first, as a JPEG', () => {
    const phone = budgeted.find((s) => s.name === 'phone')!;
    expect(phone.mimeType).toBe('image/jpeg');
    expect(phone.fit!.of).toBeGreaterThan(2);
    expect(phone.fit!.screens).toBeGreaterThanOrEqual(1);
    expect(phone.fit!.screens).toBeLessThan(phone.fit!.of);
    // A real JPEG, not a PNG relabelled.
    expect(Buffer.from(phone.base64, 'base64').subarray(0, 3)).toEqual(Buffer.from([0xff, 0xd8, 0xff]));
  });
});

describe('P125-PUPPY2-RENDER1MB — the answer says what a picture covers', () => {
  it('a whole page says "full page"', () => {
    expect(shotExtent({ name: 'desktop', mimeType: 'image/png', base64: '' })).toBe('full page');
  });
  it('a page re-encoded but whole says so', () => {
    expect(shotExtent({ name: 'd', mimeType: 'image/jpeg', base64: '', fit: { format: 'jpeg', quality: 70, screens: 4, of: 4, overBudget: false } })).toBe(
      'full page, as a JPEG to fit this answer'
    );
  });
  it('a cut page names how much of it is pictured and the way to see the rest', () => {
    const words = shotExtent({ name: 'phone', mimeType: 'image/jpeg', base64: '', fit: { format: 'jpeg', quality: 70, screens: 3, of: 9, overBudget: false } });
    expect(words).toMatch(/^only the first 3 screens of 9, cut to fit this answer/);
    expect(words).toMatch(/out_dir/);
  });
});
