/**
 * P134 session 11 — the Delay node in plain files. Before this session every chain with a Delay in it was left out whole
 * (about 20 across the quizzes, the games and planning: a "well done" that waits, a hint that comes later).
 *
 * The React export's way, carried (EXP-011 §39): `lib/timer.js` is React's `timer.ts` with its types out (generated, and
 * graded there against the runtime's own scheduler), each Delay node keeps one handle the component owns, stopped when
 * the component goes, and Start, Restart and Stop answer Done or Unchanged as React's `if` reads them.
 *
 * Graded on the Delay Desk (`helpers/delay-desk.ts`): the HTML export in jsdom against the React export under StrictMode,
 * the same presses, the same readings after each, and a prediction of both written first from the node's own rules.
 */

import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { loadCatalog } from '../src/catalog';
import { parseProject } from '../src/parse/parseProject';
import { emitApp } from '../src/emit/emitApp';
import { emitHtmlApp } from '../src/emit/html/emitHtml';
import { TIMER_JS } from '../src/emit/html/timerJs';
import { htmlArm } from './helpers/export-html-arm';
import { htmlTimerJs } from './helpers/html-core-js';
import { writeDelayDesk } from './helpers/delay-desk';

const catalog = loadCatalog();
const STEPS = ['Quick', 'Reset', 'Long', 'Long', 'Reset', 'Stop long', 'Stop long', 'Reset', 'Restart long'];

const ir = parseProject(writeDelayDesk(), catalog);
const html = emitHtmlApp(ir, catalog);

/** began · started · finished · long's Done · long's Unchanged, predicted from the node's rules before either arm ran. */
const NO = ['no', 'no', 'no', 'no', 'no'];
const EXPECTED = [
  NO,
  ['began', 'started', 'finished', 'no', 'no'], // Quick: Done at once, then Started and Finished as its zero timers run
  NO,
  ['no', 'no', 'no', 'done', 'no'], // Long: began
  ['no', 'no', 'no', 'done', 'unchanged'], // Long again: one is running
  NO,
  ['no', 'no', 'no', 'done', 'no'], // Stop long: there was one to stop
  ['no', 'no', 'no', 'done', 'unchanged'], // Stop long again: nothing runs
  NO,
  ['no', 'no', 'no', 'done', 'no'] // Restart long: always Done
];

const reactReadings = (): string[][] => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'delay-desk-react-'));
  for (const [file, text] of Object.entries(emitApp(ir, catalog).files)) {
    fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    fs.writeFileSync(path.join(dir, file), text);
  }
  try {
    return JSON.parse(
      execFileSync(process.execPath, [path.join(__dirname, 'helpers', 'export-react-arm.js')], {
        input: JSON.stringify([{ dir, scenarios: [STEPS], settled: true, ticks: 4 }]),
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

describe('P134 session 11 — a Delay counts down in plain files', () => {
  let fromReact: string[][];
  let fromHtml: string[][];
  beforeAll(async () => {
    fromReact = reactReadings();
    fromHtml = (await htmlArm(html.files, [STEPS], {}))[0];
  }, 180000);

  it('T0. no Delay on the desk is left out', () => {
    expect(html.preflight.htmlLosses).toEqual([]);
  });

  it('T1. the React export reads the prediction (the arm grades the reference first)', () => {
    expect(fromReact).toEqual(EXPECTED);
  });

  it('T2. the HTML export reads what the React export reads, after every press', () => {
    expect(fromHtml).toEqual(fromReact);
  });

  it('T3. each Delay keeps one countdown, stopped when its part goes (printed: jsdom runs no page to its end)', () => {
    const home = Object.entries(html.files).find(([f]) => /pages\/Home\.js$/.test(f))?.[1] ?? '';
    for (const label of ['Quick', 'Long']) {
      expect(home).toMatch(new RegExp(`const \\w+ = \\{ current: null \\}; // the Delay "${label}"'s countdown, stopped when this part goes\\n {2}l\\.add\\(function \\(\\) \\{\\n {4}stopDelay\\(\\w+\\);`));
    }
  });

  it('T4. the library is React\'s timer with its types out', () => {
    expect(html.files['lib/timer.js']).toBe(TIMER_JS);
    expect(TIMER_JS).toBe(htmlTimerJs());
  });
});
