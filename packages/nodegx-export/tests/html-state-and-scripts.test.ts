/**
 * P134 HTX-002 — state and scripts in plain files.
 *
 * HTX-001 printed the visual tier. HTX-002 prints what the React export's sessions decided about when things run, read
 * off the same plan: a logic component as a component that draws nothing, a signal input's pulse, a value a placed
 * component sends out, a Function's run and its signals, a run at load, the app's Variables. Every Function body runs as
 * it was written, in its own file, through the React export's own runner (`lib/functionRun.js`, its types taken out).
 *
 * §A grades it the way the React arm (`a-logic-component-is-a-hook.test.ts`) and the Swift arm (EXP-022 S2) were graded:
 * the Hook Desk, driven step by step in the HTML export (`helpers/export-html-arm.ts`, jsdom, no browser), against the
 * runtime's own nodes (`helpers/runtime-mounted-arm.js`), predicted in `phase-18-code-export-v2/s136-hooks/EXPECTED.md`.
 */

import { execFileSync } from 'child_process';
import * as path from 'path';

import { loadCatalog } from '../src/catalog';
import { parseProject } from '../src/parse/parseProject';
import { emitHtmlApp } from '../src/emit/html/emitHtml';
import { FUNCTION_RUN_JS } from '../src/emit/html/functionRunJs';
import { ANIMATE_JS, STATES_JS } from '../src/emit/html/statesJs';
import { htmlAnimateJs, htmlFunctionRunJs, htmlStatesJs } from './helpers/html-core-js';
import { openHtmlExport } from './helpers/html-in-jsdom';
import { writeHookDesk } from './helpers/hook-desk';
import { htmlArm } from './helpers/export-html-arm';
import { writeArrivalDesk } from './helpers/arrival-desk';
import { writeSignalDesk } from './helpers/signal-desk';
import { writeSetDesk } from './helpers/set-desk';
import { writeSiblingDesk } from './helpers/sibling-desk';
import { writeRelayDesk } from './helpers/relay-desk';
import { writeSuccessDesk } from './helpers/success-desk';

const catalog = loadCatalog();
const desk = writeHookDesk();
const app = emitHtmlApp(parseProject(desk.dir, catalog), catalog);

const STEPS = ['More', 'Go A', 'Go B', 'Go A', 'More', 'pick b', 'pick a', 'More', 'pick c'];

/** The runtime's own nodes, in a child process (as `a-logic-component-is-a-hook.test.ts` runs them). */
const runtimeArm = (dir: string, scenarios: string[][], fields = false): string[][][] => {
  try {
    return JSON.parse(
      execFileSync(process.execPath, [path.join(__dirname, 'helpers', 'runtime-mounted-arm.js')], {
        input: JSON.stringify([{ dir, scenarios, fields }]),
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 120000,
        maxBuffer: 16 * 1024 * 1024
      })
    )[0];
  } catch (e) {
    return scenarios.map(() => [[`the runtime arm threw: ${String((e as { stderr?: unknown }).stderr ?? e).split('\n')[0]}`]]);
  }
};
/** P18-S122-TEXTDEFAULT: a wired Text the wire has not reached shows the word "Text" in the runtime; an export draws ''. */
const withoutDefault = (rows: string[][]): string[][] => rows.map((r) => r.map((c) => (c === 'Text' ? '' : c)));

describe('§A the HTML export does what the runtime does, step by step (the Hook Desk, in jsdom)', () => {
  let html: string[][] = [];
  let runtime: string[][] = [];
  beforeAll(async () => {
    html = (await htmlArm(app.files, [STEPS]))[0];
    runtime = runtimeArm(desk.dir, [STEPS])[0];
  }, 120000);

  it('A1 the desk: the HTML export reads exactly what the runtime reads, at every step, but the word "Text"', () => {
    expect(runtime).toHaveLength(STEPS.length + 1);
    expect(html).toEqual(withoutDefault(runtime));
  });

  it('A2 a logic component with no Run computes at load and feeds another: y 0, "y is 0", then 2 and "y is 2" after More', () => {
    expect(html.slice(0, 2).map((r) => r.slice(0, 2))).toEqual([
      ['0', 'y is 0'],
      ['2', 'y is 2']
    ]);
  });

  it("A3 a signal into a logic component runs its Function once; the signal it sends runs the page's chain; two placements keep two totals", () => {
    expect(html[2].slice(2, 5)).toEqual(['total 1', '', 'dones 1']);
    expect(html[4].slice(2, 5)).toEqual(['total 2', 'total 10', 'dones 3']);
  });

  it('A4 a value and the signal sent with it reach another logic component in that order (the delivered count)', () => {
    expect(html[2][5]).toBe('echo total 1');
    expect(html[4][5]).toBe('echo total 2');
  });
});

/**
 * §C. The other desks the React export is graded on, each driven with its own spec's steps, default variant, in both arms.
 * Where the readings differ, every differing cell is pinned here with the loss that names it (all HTX-003's: a field's Set,
 * Clear and typing chain, a For Each over Static Data), so a difference nobody named turns the row red.
 */
describe('§C the desks the React export is graded on, in the HTML export', () => {
  const DESKS = {
    set: { write: () => writeSetDesk(), steps: ['Ready', 'Order', 'Play', 'Answer'], fields: false },
    sibling: { write: () => writeSiblingDesk(), steps: ['Pick A', 'Pick B', 'Pick A', 'Choose C', 'Pick A'], fields: false },
    signal: { write: () => writeSignalDesk(), steps: ['Show', 'Change', 'Wipe', 'Hide', 'Ask', 'Ask', 'Pick', 'Show'], fields: false },
    success: { write: () => writeSuccessDesk(), steps: ['Say', 'Bob', 'Say', 'Show', 'Pick b', 'Pick b', 'Pick c and show', 'Edit'], fields: true },
    arrival: { write: () => writeArrivalDesk(), steps: ['Bump', 'Set Bo', 'Set Bo', 'Bump', 'type:Name:Al', 'Clear'], fields: true },
    relay: { write: () => writeRelayDesk(), steps: ['Milk', 't2', 'Bread', 't1'], fields: false }
  };
  type Name = keyof typeof DESKS;
  const got: Record<string, { html: string[][] | string; runtime: string[][]; losses: string[] }> = {};
  beforeAll(async () => {
    for (const [name, d] of Object.entries(DESKS)) {
      const { dir } = d.write();
      const exported = emitHtmlApp(parseProject(dir, catalog), catalog);
      let html: string[][] | string;
      try {
        html = (await htmlArm(exported.files, [d.steps], { fields: d.fields }))[0];
      } catch (e) {
        html = String(e);
      }
      got[name] = { html, runtime: withoutDefault(runtimeArm(dir, [d.steps], d.fields)[0]), losses: exported.preflight.htmlLosses.map((l) => `${l.component} ${l.label ?? l.nodeId}: ${l.what}`) };
    }
  }, 300000);
  /** The cells where the two arms differ: `reading:column html≠runtime`. */
  const diff = (name: Name): string[] => {
    const { html, runtime } = got[name];
    if (typeof html === 'string') return [html];
    const out: string[] = [];
    runtime.forEach((row, i) => row.forEach((cell, j) => (html[i]?.[j] !== cell ? out.push(`${i}:${j} ${JSON.stringify(html[i]?.[j])}≠${JSON.stringify(cell)}`) : undefined)));
    if (html.length !== runtime.length) out.push(`${html.length} readings ≠ ${runtime.length}`);
    return out;
  };

  it('C1 the Set Desk: equal at every step, nothing left out', () => {
    expect(got.set.runtime).toHaveLength(5);
    expect(diff('set')).toEqual([]);
    expect(got.set.losses).toEqual([]);
  });

  it('C2 the Sibling Desk: equal at every step, nothing left out', () => {
    expect(got.sibling.runtime).toHaveLength(6);
    expect(diff('sibling')).toEqual([]);
    expect(got.sibling.losses).toEqual([]);
  });

  it("C3 the Signal Desk: equal but where the Banner's Wipe clears its field (HTX-003)", () => {
    expect(diff('signal')).toEqual(['3:3 "note Ann"≠""', '8:3 "note Ann"≠""']);
    expect(got.signal.losses).toEqual(['Components/Banner Banner: its signal input "wipe" runs a Clear on a text field (HTX-003); the chain is left out whole']);
  });

  it("C4 the Success Desk: equal but at the last step, the Editor's Fill setting its field (HTX-003)", () => {
    expect(diff('success')).toEqual(['8:8 "filled nothing"≠"filled yes"', '8:9 "[draft]="≠"[draft]=edit Cleo"']);
    expect(got.success.losses).toContain('Components/Editor Editor: its signal input "fill" runs a Set on a text field (HTX-003); the chain is left out whole');
  });

  it("C5 the Arrival Desk: equal but the field's own echo, which its typing chain writes (HTX-003)", () => {
    expect(diff('arrival')).toEqual([0, 1, 2, 3, 4, 5, 6].map((i) => `${i}:8 ""≠${JSON.stringify(i < 5 ? 'echo 2' : 'echo 3 Al')}`));
    expect(got.arrival.losses).toEqual(['Pages/Home Name: its text has no state row in the plan, so nothing reads what is typed']);
  });

  it('C6 the Relay Desk: its rows are a For Each over Static Data, which HTX-003 draws; named, not drawn', () => {
    expect(got.relay.html).toMatch(/no button "Milk"/);
    expect(got.relay.losses).toEqual(['Components/List One row per task: a For Each over Static Data, a query or a named list, which the HTML target does not draw yet (HTX-003)']);
  });
});

describe('§B what is printed', () => {
  it('B1 carries the React export\'s Function runner as lib/functionRun.js, made again from its source here', () => {
    expect(FUNCTION_RUN_JS).toBe(htmlFunctionRunJs());
    expect(app.files['lib/functionRun.js']).toBe(FUNCTION_RUN_JS);
  });

  it('B2 a Function is its body as written, in a file of its own, in the wrapper every export gives it', () => {
    const tally = app.files['functions/components/Tally/Work.js'];
    expect(tally).toContain('export function Work(Inputs, Outputs = { done() {} }, self = {}, Component) {');
    expect(tally).toContain("this.total = (this.total || 0) + (Number(Inputs.step) || 0);\nOutputs.total = 'total ' + this.total;\nOutputs.done();");
  });

  it('B3 a logic component draws nothing and is placed with no element; what it sends out is written where it lands', () => {
    const home = app.files['pages/Home.js'];
    expect(home).toContain('const tallyA = place(l, mountTally, null, {');
    expect(home).toContain('state.total.set(value);');
    expect(app.files['components/Tally.js']).toContain('export function mountTally(element, inputs = {}, before) {');
  });

  it('B4 nothing in the desk is left out', () => {
    expect(app.preflight.htmlLosses.map((l) => `${l.component} ${l.label ?? l.nodeId}: ${l.what}`)).toEqual([]);
  });

  it("B5 carries the React export's States machine and its run engine as lib/states.js and lib/animate.js, made again here", () => {
    expect(STATES_JS).toBe(htmlStatesJs());
    expect(ANIMATE_JS).toBe(htmlAnimateJs());
    expect(STATES_JS).toContain('export function statesNode(def, start, listeners) {');
    expect(STATES_JS).not.toMatch(/from 'react'|useState|useEffect/);
    expect(ANIMATE_JS).not.toMatch(/from 'react'|useState|useEffect/);
  });
});

/** §D. todo-list, HTX-002's work list (as it was Swift S2's): its logic printed, its Functions in files, its first page drawn. */
describe('§D todo-list', () => {
  const TODO = path.join(__dirname, '..', '..', '..', 'templates', 'todo-list');
  const todo = emitHtmlApp(parseProject(TODO, catalog), catalog);

  it('D1 every one of its 36 logic components prints, and 59 Function bodies travel, each in its own file', () => {
    expect(todo.preflight.logic).toHaveLength(36);
    expect(Object.keys(todo.files).filter((f) => f.startsWith('functions/'))).toHaveLength(59);
  });

  it('D2 what is left out is named, and none of it is a logic component or a Function it could not place', () => {
    const losses = todo.preflight.htmlLosses.map((l) => l.what);
    // 368 before HTX-002 (session 2's first measurement); the rest is the backend (HTX-004), fields and lists (HTX-003),
    // and the style ports the React export drops too.
    expect(losses.length).toBeLessThanOrEqual(101);
    expect(losses.filter((w) => /logic component|states-go|Variable's starting value|a Value Changed/.test(w))).toEqual([]);
  });

  it('D3 its first page runs in jsdom from its own files, with no error, and draws its tabs', async () => {
    const page = await openHtmlExport(todo.files);
    try {
      expect(page.document.title).toBe('Todo list');
      for (const words of ['List (0)', 'Today (0)', 'Done (0)', 'Nothing on the list. Add the next thing you need to do.']) expect(page.text()).toContain(words);
    } finally {
      page.close();
    }
  });
});
