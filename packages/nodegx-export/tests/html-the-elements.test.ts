/**
 * P134 session 11 — the elements the HTML printer did not draw: Image, Video, Icon and Columns.
 *
 * Graded against the React export, which draws them already: the Element Desk (`helpers/element-desk.ts`) exported both
 * ways, each page mounted in jsdom (React's by `export-react-arm.js`, under StrictMode), and what each draws read the same
 * way (`helpers/skeleton.js`: tag, attributes, switches, classes, text, in document order) after the load and after each
 * press. The two must be equal but for three differences the HTML export decides, each stated here and nowhere hidden:
 *
 * 1. **A component's own class** is named by its printer (`Home_film` in React's CSS module, `Home-film` here): read as a
 *    count by the skeleton, so the HTML export's classes are compared by how many a node has, not by name.
 * 2. **A project path stays relative** (`films/intro.mp4`, React `/films/intro.mp4`). The running app and the React export
 *    route by the address's path, so their page sits at a route and a project path must start at the site root; this
 *    page's route is after `#` and it stays at `index.html`, so a project path is read beside it and the app works from
 *    any folder on any server (README §4, R4). An address with a scheme, or one already at the root, is written as it is.
 * 3. **A button is `type="button"`** (HTX-001's), so a button in a form never sends it.
 *
 * §B reads the stylesheets: the Columns' grid, its container and its breakpoint are React's declarations, word for word.
 */

import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { loadCatalog } from '../src/catalog';
import { parseProject } from '../src/parse/parseProject';
import { emitApp } from '../src/emit/emitApp';
import { emitHtmlApp } from '../src/emit/html/emitHtml';
import { openHtmlExport } from './helpers/html-in-jsdom';
import { writeElementDesk } from './helpers/element-desk';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { skeleton } = require('./helpers/skeleton.js') as { skeleton: (root: unknown) => string[] };

const catalog = loadCatalog();
const STEPS = ['Set picture', 'Clear picture'];

const desk = writeElementDesk().dir;
const ir = parseProject(desk, catalog);
const react = emitApp(ir, catalog);
const html = emitHtmlApp(ir, catalog);

/** React's page at each step: the arm's reading is every `<p>`'s text, then the skeleton, which starts at its first element. */
const reactReadings = (app = react, steps = STEPS): string[][] => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'element-desk-react-'));
  for (const [file, text] of Object.entries(app.files)) {
    fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    fs.writeFileSync(path.join(dir, file), text);
  }
  try {
    const out = JSON.parse(
      execFileSync(process.execPath, [path.join(__dirname, 'helpers', 'export-react-arm.js')], {
        input: JSON.stringify([{ dir, scenarios: [steps], settled: true, skeleton: true }]),
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 120000,
        maxBuffer: 16 * 1024 * 1024
      })
    ) as string[][][][];
    return out[0][0].map((reading) => reading.slice(reading.findIndex((l) => l.startsWith('<'))));
  } catch (e) {
    return [[`the React arm threw: ${String((e as { stderr?: unknown }).stderr ?? e).split('\n')[0]}`]];
  }
};

const htmlReadings = async (files = html.files, steps = STEPS): Promise<string[][]> => {
  const page = await openHtmlExport(files);
  const root = page.document.getElementById('app');
  const readings = [skeleton(root)];
  for (const label of steps) {
    const button = [...page.document.querySelectorAll('button')].find((b: any) => b.textContent.trim() === label) as any;
    button.click();
    await page.settle();
    readings.push(skeleton(root));
  }
  page.close();
  return readings;
};

/** Difference 2: React's root-absolute project path, as the HTML export writes it. */
const relativePaths = (line: string): string => line.replace(/\b(src|poster|href)="\/(?!\/)/g, '$1="');
/** Difference 3: the HTML export's `type="button"`. */
const noButtonType = (line: string): string => (/^\s*<button\b/.test(line) ? line.replace(/ type="button"/, '') : line);

describe('P134 session 11 — Image, Video, Icon and Columns, drawn as the React export draws them', () => {
  let fromReact: string[][];
  let fromHtml: string[][];
  beforeAll(async () => {
    fromReact = reactReadings();
    fromHtml = await htmlReadings();
  }, 180000);

  it('A0. the HTML export names no loss on the desk', () => {
    expect(html.preflight.htmlLosses).toEqual([]);
  });

  it.each([
    ['A1. as it loads', 0],
    ['A2. after "Set picture" (a project path into the wired Source)', 1],
    ['A3. after "Clear picture" (an empty Source takes the address off)', 2]
  ])('%s: the same page, but for the three stated differences', (_name, step) => {
    expect(fromHtml[step].map(noButtonType)).toEqual(fromReact[step].map(relativePaths));
  });

  it('A4. the readings are of the elements, not of nothing (the control: each arm drew all seven)', () => {
    for (const reading of [fromReact[0], fromHtml[0]]) {
      expect(reading.filter((l) => /^\s*<img\b/.test(l))).toHaveLength(3);
      expect(reading.filter((l) => /^\s*<video\b/.test(l))).toHaveLength(1);
      expect(reading.filter((l) => /\.lucide \.icon-sparkles>$/.test(l))).toHaveLength(1);
      expect(reading.filter((l) => /\.material-icons>$/.test(l))).toHaveLength(1);
    }
    expect(fromHtml[1].find((l) => l.includes('The chosen picture'))).toContain('src="pics/b.png"');
    expect(fromHtml[2].find((l) => l.includes('The chosen picture'))).not.toContain('src=');
  });

  it('B1. the Columns: its grid, its container and its breakpoint are React\'s declarations', () => {
    const reactCss = Object.entries(react.files).find(([f]) => /Home\.module\.css$/.test(f))?.[1] ?? '';
    const htmlCss = Object.entries(html.files).find(([f]) => /Home\.css$/.test(f))?.[1] ?? '';
    const block = (css: string, selector: RegExp): string => {
      const at = css.search(selector);
      if (at < 0) return '';
      let depth = 0;
      let i = css.indexOf('{', at);
      const start = i;
      for (; i < css.length; i++) {
        if (css[i] === '{') depth++;
        if (css[i] === '}' && --depth === 0) break;
      }
      return css.slice(start, i + 1).replace(/\.[A-Za-z][\w-]*/g, '.own').replace(/\s+/g, ' ');
    };
    const grid = block(htmlCss, /\.HomePage-grid \{/);
    expect(grid).toContain('grid-template-columns');
    expect(grid).toBe(block(reactCss, /\.grid \{/));
    const container = block(htmlCss, /\.HomePage-gridContainer \{/);
    expect(container).toContain('container-type: inline-size');
    expect(container).toBe(block(reactCss, /\.gridContainer \{/));
    const query = block(htmlCss, /@container \(max-width: 600px\)/);
    expect(query).toContain('grid-template-columns');
    expect(query).toBe(block(reactCss, /@container \(max-width: 600px\)/));
  });
});

/**
 * §C. A component that takes children placed inside it (EXP-011 §51): the slot desk the React export was built on
 * (`fixtures/slot-desk`, `component-children.test.ts`). Panel draws its title, then the children Home placed inside it
 * (a Text and a button), then its footer; Plain has no slot, so the Text placed inside it is drawn by neither.
 */
describe('P134 session 11 — children placed inside a component, drawn where its slot is', () => {
  const slotIr = parseProject(path.join(__dirname, 'fixtures', 'slot-desk'), catalog);
  const slotHtml = emitHtmlApp(slotIr, catalog);
  let fromReact: string[][];
  let fromHtml: string[][];
  beforeAll(async () => {
    fromReact = reactReadings(emitApp(slotIr, catalog), []);
    fromHtml = await htmlReadings(slotHtml.files, []);
  }, 180000);

  it('C0. no placement on the desk is left out', () => {
    expect(slotHtml.preflight.htmlLosses).toEqual([]);
  });

  it('C1. the same page as React draws, but for the stated differences', () => {
    expect(fromHtml[0].map(noButtonType)).toEqual(fromReact[0].map(relativePaths));
  });

  it('C2. the control: the placed children are between the title and the footer, and the orphan is nowhere', () => {
    const words = fromHtml[0].map((l) => l.trim()).filter((l) => l.startsWith('"'));
    expect(words.indexOf('"Hello there"')).toBeGreaterThan(-1);
    expect(words.indexOf('"Hello there"')).toBeLessThan(words.indexOf('"— end of panel —"'));
    expect(words.indexOf('"Continue"')).toBe(words.indexOf('"Hello there"') + 1);
    expect(words).not.toContain('"Never drawn"');
  });
});
