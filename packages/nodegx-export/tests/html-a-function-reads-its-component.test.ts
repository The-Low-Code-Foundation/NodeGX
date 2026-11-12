/**
 * P134 session 11 — a Function whose body reads `Component.Object`, in plain files. Before this session the HTML printer
 * left each one out, and every chain that ran it (45 losses across gram, marketplace and HiveClip's cover panels).
 *
 * The React export's way, carried (EXP-020 slice 2): the component keeps one scope per mount (`lib/componentScope.js`,
 * React's `componentScope.ts` with its types out, generated), each kept Function node carries it, and the runner hands it
 * to the body fourth, as the runtime does.
 *
 * Graded on the Component Desk (`helpers/component-desk.ts`), the desk `the-component-record-travels.test.ts` grades
 * React on against the runtime: the HTML export in jsdom reads what the React export reads, step by step, under
 * StrictMode, the runtime's pinned bug included (P18-S135-HIDDENINSTANCE: a placement the runtime hides keeps its
 * record; both exports mount a new one).
 */

import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { loadCatalog } from '../src/catalog';
import { parseProject } from '../src/parse/parseProject';
import { emitApp } from '../src/emit/emitApp';
import { emitHtmlApp } from '../src/emit/html/emitHtml';
import { COMPONENT_SCOPE_JS } from '../src/emit/html/componentScopeJs';
import { htmlArm } from './helpers/export-html-arm';
import { htmlComponentScopeJs } from './helpers/html-core-js';
import { writeComponentDesk } from './helpers/component-desk';

const catalog = loadCatalog();
const STEPS = ['Read B', 'Add A', 'Add A', 'Add B', 'Read A', 'Read B', 'Toggle', 'Add C', 'Toggle', 'Toggle', 'Add C', 'Read C'];

const desk = writeComponentDesk();
const ir = parseProject(desk.dir, catalog);
const html = emitHtmlApp(ir, catalog);

const reactReadings = (): string[][] => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'component-desk-react-'));
  for (const [file, text] of Object.entries(emitApp(ir, catalog).files)) {
    fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    fs.writeFileSync(path.join(dir, file), text);
  }
  try {
    return JSON.parse(
      execFileSync(process.execPath, [path.join(__dirname, 'helpers', 'export-react-arm.js')], {
        input: JSON.stringify([{ dir, scenarios: [STEPS], settled: true }]),
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 120000,
        maxBuffer: 16 * 1024 * 1024
      })
    )[0][0];
  } catch (e) {
    return [[`the React arm threw: ${String((e as { stderr?: unknown }).stderr ?? e).split('\n')[0]}`]];
  }
};

describe('P134 session 11 — a Function reads its component\'s record, in plain files', () => {
  let fromReact: string[][];
  let fromHtml: string[][];
  beforeAll(async () => {
    fromReact = reactReadings();
    fromHtml = (await htmlArm(html.files, [STEPS], {}))[0];
  }, 180000);

  it('R0. nothing on the desk is left out by the HTML printer', () => {
    expect(html.preflight.htmlLosses).toEqual([]);
  });

  it('R1. the HTML export reads what the React export reads, at every one of the 13 readings', () => {
    expect(fromReact).toHaveLength(STEPS.length + 1);
    expect(fromHtml).toEqual(fromReact);
  });

  it('R2. the control: the readings move (the record is written and read back), so R1 grades something', () => {
    expect(fromHtml[0]).not.toEqual(fromHtml[5]);
    expect(fromHtml[5][1]).toBe('got|2|2|w2|n,word|kept|state');
  });

  it('R3. one scope per placement, carried on each kept node; the library is the React one with its types out', () => {
    const keep = Object.entries(html.files).find(([f]) => /components\/Keep\.js$/.test(f))?.[1] ?? '';
    expect(keep).toContain('const component = createComponentScope();');
    expect(keep.match(/functionNode\(\[[^\]]*\], component\)/g)?.length).toBeGreaterThanOrEqual(2);
    expect(html.files['lib/componentScope.js']).toBe(COMPONENT_SCOPE_JS);
    expect(COMPONENT_SCOPE_JS).toBe(htmlComponentScopeJs());
  });
});
