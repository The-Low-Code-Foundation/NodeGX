/**
 * P134 session 12 — a Condition that tests again on every change, in plain files. Before this session each one was left
 * out of the HTML export (31 across bot-garden, rocket-school and star-class: a tab lit when chosen, a card ringed when
 * selected, a Function run when a round is drawn over).
 *
 * The React export's way, carried (LOGIC-TARGET §10): one effect per Condition, keyed on the reads its test makes (React's
 * `effectDeps`), never on the answer, running one arm — `l.watch` over the same reads. So a new value that tests true
 * again runs the true arm again, as the running node does on every arrival.
 *
 * Graded on the Condition Desk (`helpers/condition-desk.ts`, both template shapes): the runtime's own nodes
 * (`runtime-mounted-arm.js`), the React export under StrictMode, and the HTML export in jsdom, press by press. The HTML
 * export reads what React reads at every step; React reads what the runtime reads but at two kinds of cell both exports
 * hold, filed: a wired Text before its first delivery (P134-HTX003-TEXTKEEPS) and a part's logic while its parent is not
 * mounted (P134-S12-HIDDENRUNS).
 */

import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { loadCatalog } from '../src/catalog';
import { parseProject } from '../src/parse/parseProject';
import { emitApp } from '../src/emit/emitApp';
import { emitHtmlApp } from '../src/emit/html/emitHtml';
import { htmlArm } from './helpers/export-html-arm';
import { writeConditionDesk } from './helpers/condition-desk';

const catalog = loadCatalog();
const STEPS = ['Lit', 'Lit again', 'Dark', 'Show', 'Lit', 'Hide', 'Dark'];

const dir = writeConditionDesk();
const ir = parseProject(dir, catalog);
const html = emitHtmlApp(ir, catalog);

/**
 * The running app, read before either export: [said, the Lamp's word, its count, then the second Lamp's two while shown].
 * "lit 2" after Lit again is the rule this spec is for: a new value that tests true again runs the arm again.
 */
const RUNTIME = [
  ['home dark', 'lamp off', 'lit 0'],
  ['home lit', 'lamp on', 'lit 1'],
  ['home lit', 'lamp on', 'lit 2'],
  ['home dark', 'lamp off', 'lit 2'],
  ['home dark', 'lamp off', 'lit 2', 'lamp off', 'lit 2'],
  ['home lit', 'lamp on', 'lit 3', 'lamp on', 'lit 3'],
  ['home lit', 'lamp on', 'lit 3'],
  ['home dark', 'lamp off', 'lit 3']
];
/** The cells both exports hold, each filed: [reading, cell, what the exports read]. */
const PINNED: Array<[number, number, string, string]> = [
  [0, 2, '', 'P134-HTX003-TEXTKEEPS: the count is wired from a Function that has not run'],
  [4, 4, '', 'P134-S12-HIDDENRUNS + TEXTKEEPS: the second Lamp is made when shown, its Function has not run'],
  [5, 4, 'lit 1', 'P134-S12-HIDDENRUNS: the second Lamp did not count while it was hidden']
];

const run = (script: string, input: unknown): string[][] => {
  try {
    return JSON.parse(
      execFileSync(process.execPath, [path.join(__dirname, 'helpers', script)], {
        input: JSON.stringify(input),
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 180000,
        maxBuffer: 16 * 1024 * 1024
      })
    )[0][0];
  } catch (e) {
    return [[`${script} threw: ${String((e as { stderr?: unknown }).stderr ?? e).split('\n')[0]}`]];
  }
};

describe('P134 session 12 — a Condition tests again on every change, in plain files', () => {
  let fromRuntime: string[][];
  let fromReact: string[][];
  let fromHtml: string[][];
  beforeAll(async () => {
    fromRuntime = run('runtime-mounted-arm.js', [{ dir, scenarios: [STEPS] }]);
    const reactDir = fs.mkdtempSync(path.join(os.tmpdir(), 'condition-desk-react-'));
    for (const [file, text] of Object.entries(emitApp(ir, catalog).files)) {
      fs.mkdirSync(path.dirname(path.join(reactDir, file)), { recursive: true });
      fs.writeFileSync(path.join(reactDir, file), text);
    }
    fromReact = run('export-react-arm.js', [{ dir: reactDir, scenarios: [STEPS], settled: true }]);
    fromHtml = (await htmlArm(html.files, [STEPS], {}))[0];
  }, 300000);

  it('T0. no Condition on the desk is left out, and the plan refuses nothing', () => {
    expect(html.preflight.htmlLosses).toEqual([]);
    expect(html.preflight.planRefusals).toEqual([]);
  });

  it('T1. the running app reads the desk as written above (the reference, read first)', () => {
    expect(fromRuntime).toEqual(RUNTIME);
  });

  it('T2. the HTML export reads what the React export reads, after every press', () => {
    expect(fromHtml).toEqual(fromReact);
  });

  it('T3. the React export reads what the running app reads, but at the pinned cells, each filed', () => {
    const expected = RUNTIME.map((r) => [...r]);
    for (const [at, cell, value] of PINNED) expected[at][cell] = value;
    expect(fromReact).toEqual(expected);
  });

  it('T4. true again with a new value runs the true arm again, in all three (the Function counts 2)', () => {
    for (const arm of [fromRuntime, fromReact, fromHtml]) expect(arm[2][2]).toBe('lit 2');
  });

  it('T5. printed as an effect keyed on the input it reads, not on the answer', () => {
    const lamp = Object.entries(html.files).find(([f]) => /Lamp\.js$/.test(f))?.[1] ?? '';
    expect(lamp).toMatch(/\/\/ Is it lit\? — re-tested whenever its condition changes[^\n]*\n {2}l\.watch\(function \(\) \{\n {4}return \[input\.lit\.get\(\)\];/);
  });
});
