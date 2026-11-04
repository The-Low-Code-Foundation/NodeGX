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
import * as fs from 'fs';
import * as os from 'os';
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
import { addBell, writeArrivalDesk } from './helpers/arrival-desk';
import { writeSignalDesk } from './helpers/signal-desk';
import { writeSetDesk } from './helpers/set-desk';
import { writeSiblingDesk } from './helpers/sibling-desk';
import { writeRelayDesk } from './helpers/relay-desk';
import { writeSuccessDesk } from './helpers/success-desk';
import { button, SHOW_SCRIPT, STORE_KEY, writeStoreDesk } from './helpers/store-desk';
import type { Desk } from './helpers/root-desk';
import { writeHeaderDesk } from './helpers/header-desk';
import { PERSIST_STORE_JS } from '../src/emit/html/persistStoreJs';
import { htmlPersistStoreJs } from './helpers/html-core-js';

const catalog = loadCatalog();
const desk = writeHookDesk();
const app = emitHtmlApp(parseProject(desk.dir, catalog), catalog);

const STEPS = ['More', 'Go A', 'Go B', 'Go A', 'More', 'pick b', 'pick a', 'More', 'pick c'];

/** The runtime's own nodes, in a child process (as `a-logic-component-is-a-hook.test.ts` runs them). */
type Storage = { keys: string[]; seeds?: Array<Record<string, string>> };
const runtimeArm = (dir: string, scenarios: string[][], fields = false, storage?: Storage): string[][][] => {
  try {
    return JSON.parse(
      execFileSync(process.execPath, [path.join(__dirname, 'helpers', 'runtime-mounted-arm.js')], {
        input: JSON.stringify([{ dir, scenarios, fields, ...(storage ? { storage } : {}) }]),
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 120000,
        maxBuffer: 16 * 1024 * 1024,
        // P18 session 139: the runtime arm gives its window an origin, so it keeps a storage.
        env: storage ? { ...process.env, RUNTIME_ARM_URL: 'http://localhost/' } : process.env
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
 * Where the readings differ, every differing cell is pinned here with the refusal that names it, so a difference nobody
 * named turns the row red. HTX-002 pinned the cells HTX-003 then drew (a field's Set and Clear, a For Each over Static
 * Data); what is left is the plan's own refusal, which the React export makes too.
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
  const got: Record<string, { html: string[][] | string; runtime: string[][]; losses: string[]; refusals: string[] }> = {};
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
      got[name] = { html, runtime: withoutDefault(runtimeArm(dir, [d.steps], d.fields)[0]), losses: exported.preflight.htmlLosses.map((l) => `${l.component} ${l.label ?? l.nodeId}: ${l.what}`), refusals: exported.preflight.planRefusals.map((r) => `${r.component} ${r.name}: ${r.reason}`) };
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

  it("C3 the Signal Desk: equal at every step, the Banner's Wipe clearing its field too (HTX-003)", () => {
    expect(diff('signal')).toEqual([]);
    expect(got.signal.losses).toEqual([]);
  });

  it("C4 the Success Desk: equal at every step, the Editor's Fill setting its field too (HTX-003)", () => {
    expect(diff('success')).toEqual([]);
    expect(got.success.losses).toEqual(['Components/Editor draft: its runOnChange-startValue is not carried (no style the export knows for it)']);
  });

  /**
   * HTX-002 pinned these cells on HTX-003. Measured in HTX-003: they are the plan's refusal, the React export's own
   * (`the-script-runs-on-arrival.test.ts` C3, A6): the echo's ticked input is the field's text, which exists only inside
   * the field's handler, so no effect can watch it. The HTML export reads what the React export reads.
   */
  it("C5 the Arrival Desk: equal but the field-fed echo, which the plan refuses in every export (as React's C3)", () => {
    expect(diff('arrival')).toEqual([0, 1, 2, 3, 4, 5, 6].map((i) => `${i}:8 ""≠${JSON.stringify(i < 5 ? 'echo 2' : 'echo 3 Al')}`));
    expect(got.arrival.losses).toEqual([]);
    expect(got.arrival.refusals.filter((r) => /The echo/.test(r))).toEqual([expect.stringMatching(/that value exists only inside a handler — the export cannot watch it/)]);
  });

  it('C6 the Relay Desk: its rows, a For Each over Static Data kept by their id, equal at every step (HTX-003)', () => {
    expect(diff('relay')).toEqual([]);
    expect(got.relay.losses).toEqual([]);
  });
});

/**
 * §E. The Global Store (HTX-002's last piece): the Store Desk and the Header Desk, the two the React export's persisted
 * store is graded on (`a-persisted-store-travels.test.ts`, `a-header-writes-the-store.test.ts`), with the browser's
 * storage seeded before load and read at every step, in both arms. The predictions are theirs
 * (`phase-18-code-export-v2/s139-persisted-store/EXPECTED.md`, `s141-header-app/EXPECTED.md`).
 */
describe('§E the Global Store, kept in the browser', () => {
  const stored = (items: string[] | null) => `storage=${items === null ? 'null' : JSON.stringify({ app: { items } })}`;
  const KEPT = { [STORE_KEY]: JSON.stringify({ app: { items: ['kept'] } }) };
  const STORE_STEPS = [['Save', 'Next', 'Save', 'Drop', 'Save'], ['Save']];
  const STORE_STORAGE: Storage = { keys: [STORE_KEY], seeds: [{}, KEPT] };
  const BAD_STEPS = [['Save', 'Bad write', 'Save'], ['Bad write']];
  const HEADER_STEPS = [['Mark A', 'Mark B', 'Header drop', 'Mark A', 'Solo', 'Mark B'], ['Header drop', 'Solo'], ['Solo', 'Solo']];
  const HEADER_STORAGE: Storage = { keys: [STORE_KEY], seeds: [{}, KEPT, {}] };
  /**
   * A write to another key: Show counts its own runs, and a page button writes `other`. The runtime's Subscribe of `app`
   * fires only when `app` changed (`globalstoresubscribenode.ts`, its Changed port), as React's `useStore` selector does.
   */
  const otherKey = (d: Desk) => {
    d.components['Logic/Show'].nodes.find((n) => n.id === 'shFn')!.parameters.functionScript = SHOW_SCRIPT + "\nthis.n = (this.n || 0) + 1;\nOutputs.line = Outputs.line + ' #' + this.n;";
    const home = d.components['Pages/Home'];
    home.nodes.find((n) => n.id === 'shell')!.children!.push('otherBtn');
    home.nodes.push(button('otherBtn', 'Other', 'shell'), { id: 'otherSet', type: 'net.noodl.GlobalStore.Set', label: 'Write another key', parameters: { storeName: 'desk', key: 'other', merge: false, value: 'x' } });
    home.connections.push({ fromId: 'otherBtn', fromProperty: 'onClick', toId: 'otherSet', toProperty: 'set' });
    // A reader beside its Subscribe, in one component: a Function with no Run that counts its own runs, into a Text. Its
    // key is `other`, which the store's Initial State types (an untyped key into a Function is the plan's refusal).
    d.components['Logic/Store'].nodes.find((n) => n.id === 'stStore')!.parameters.initialState = '{"other":"none"}';
    home.nodes.find((n) => n.id === 'shell')!.children!.push('hereText');
    home.nodes.push(
      { id: 'hereText', type: 'Text', label: 'here', parent: 'shell', parameters: {} },
      { id: 'hereRead', type: 'net.noodl.GlobalStore.Subscribe', label: 'Read the app here', parameters: { storeName: 'desk', keys: 'other' } },
      {
        id: 'hereFn',
        type: 'JavaScriptFunction',
        label: 'Count here',
        parameters: { functionScript: "this.n = (this.n || 0) + 1;\nOutputs.here = Inputs.other + ' #' + this.n;", 'runOnChange-in-other': true },
        ports: [
          { name: 'in-other', plug: 'input', type: '*' },
          { name: 'out-here', plug: 'output', type: '*' }
        ]
      }
    );
    home.connections.push({ fromId: 'hereRead', fromProperty: 'value', toId: 'hereFn', toProperty: 'in-other' }, { fromId: 'hereFn', fromProperty: 'out-here', toId: 'hereText', toProperty: 'text' });
  };
  const OTHER_STEPS = [['Save', 'Other', 'Save', 'Other'], ['Other']];
  const got: Record<string, { html: string[][][] | string; runtime: string[][][]; losses: string[]; files: Record<string, string> }> = {};
  const both = async (name: string, dir: string, steps: string[][], storage: Storage) => {
    const exported = emitHtmlApp(parseProject(dir, catalog), catalog);
    let html: string[][][] | string;
    try {
      html = await htmlArm(exported.files, steps, { storage });
    } catch (e) {
      html = String(e);
    }
    got[name] = { html, runtime: runtimeArm(dir, steps, false, storage), losses: exported.preflight.htmlLosses.map((l) => `${l.component} ${l.label ?? l.nodeId}: ${l.what}`), files: exported.files };
  };
  beforeAll(async () => {
    await both('store', writeStoreDesk().dir, STORE_STEPS, STORE_STORAGE);
    await both('bad', writeStoreDesk({ bad: true }).dir, BAD_STEPS, STORE_STORAGE);
    await both('header', writeHeaderDesk().dir, HEADER_STEPS, HEADER_STORAGE);
    await both('other', writeStoreDesk({ edit: otherKey }).dir, OTHER_STEPS, STORE_STORAGE);
  }, 300000);

  it('E1 the Store Desk: the line and the stored JSON equal the runtime at every step, with nothing stored and with a stored copy', () => {
    expect(got.store.runtime[1][0]).toEqual(['kept', stored(['kept'])]);
    expect(got.store.html).toEqual(got.store.runtime);
    expect(got.store.losses).toEqual([]);
  });

  it('E2 the Header Desk: three placed writers into one store, equal to the runtime at every step of all three scenarios', () => {
    expect(got.header.runtime[0]).toHaveLength(7);
    expect(got.header.html).toEqual(got.header.runtime);
  });

  it("E3 Bad: the plan refuses a pulse whose value it cannot deliver, so the store keeps what it held — the React export's readings, not the runtime's", () => {
    expect(got.bad.html).toEqual([
      [
        ['none', stored(null)],
        ['w0', stored(['w0'])],
        ['w0', stored(['w0'])],
        ['w0,w0', stored(['w0', 'w0'])]
      ],
      [
        ['kept', stored(['kept'])],
        ['kept', stored(['kept'])]
      ]
    ]);
  });

  it('E5 a write to one key runs nothing that reads another: Show (through a push) and a Function beside its Subscribe keep their run counts, in both arms', () => {
    const lines = (r: string[][][] | string) => (typeof r === 'string' ? [[r]] : r.map((sc) => sc.map((x) => x[0])));
    // Predicted before either arm ran: the count moves on Save, never on Other.
    expect(lines(got.other.runtime)[0][2]).toBe(lines(got.other.runtime)[0][1]);
    expect(lines(got.other.runtime)[0][4]).toBe(lines(got.other.runtime)[0][3]);
    const here = (r: string[][][] | string) => (typeof r === 'string' ? [[r]] : r.map((sc) => sc.map((x) => x[1])));
    // Beside its Subscribe: a Save (a write to `app`) runs nothing that reads `other`.
    expect(here(got.other.runtime)[0][1]).toBe(here(got.other.runtime)[0][0]);
    expect(here(got.other.runtime)[0][3]).toBe(here(got.other.runtime)[0][2]);
    expect(got.other.html).toEqual(got.other.runtime);
    expect(got.other.losses).toEqual([]);
  });

  it("E4 the store is its own file over lib/core.js's store(), Persist its one call, and lib/persistStore.js is React's, made again here", () => {
    expect(PERSIST_STORE_JS).toBe(htmlPersistStoreJs());
    const files = got.store.files;
    expect(files['stores/desk.js']).toContain("export const desk = store('desk', {});");
    expect(files['stores/desk.js']).toContain("persistStore(desk, 'store-desk');");
    expect(files['lib/persistStore.js']).toBe(PERSIST_STORE_JS);
    expect(files['components/Store.js']).toContain("const deskApp = storeKey(l, desk, 'app');");
    expect(files['components/Store.js']).toContain('desk.set({ app: input.app.get() });');
  });
});

/**
 * §F. A write after the run has returned (EXP-019 session 133's Bell variant, `the-script-runs-on-arrival.test.ts` §E): a
 * body that writes and signals from a zero timer at load (the bell), on a press (the chime), and from a promise (the
 * promise). The kept node hands what happens later to the component, as React's `<name>Node.late` does.
 */
describe('§F a write after the run has returned', () => {
  const BELL = 9; // bell · rings · chimed · promised · keeps, after the Arrival Desk's nine Texts
  let html: string[][] | string = [];
  let runtime: string[][] = [];
  let printed: ReturnType<typeof emitHtmlApp>;
  beforeAll(async () => {
    const { dir } = writeArrivalDesk(addBell);
    printed = emitHtmlApp(parseProject(dir, catalog), catalog);
    try {
      html = (await htmlArm(printed.files, [['Chime']]))[0];
    } catch (e) {
      html = String(e);
    }
    runtime = withoutDefault(runtimeArm(dir, [['Chime']])[0]);
  }, 120000);

  it('F1 the bell rang and the promise was kept at load, the chime writes after its press: equal to the runtime', () => {
    expect(runtime.map((r) => r.slice(BELL))).toEqual([
      ['rung object', '1', '', 'promise kept', '1'],
      ['rung object', '1', 'chimed', 'promise kept', '1']
    ]);
    expect(typeof html === 'string' ? html : html.map((r) => r.slice(BELL))).toEqual(runtime.map((r) => r.slice(BELL)));
  });

  it("F2 each kept node is handed what its body does later: the row, and the signal's chain; nothing about it is left out", () => {
    const home = printed.files['pages/Home.js'];
    expect(home).toMatch(/theBellNode\.late = function \(theBellRun\) \{\n {4}state\.theBellOut\.set\(\{ \.\.\.theBellRun\.outputs \}\);\n {4}for \(const theBellPulse of theBellRun\.pulses\)/);
    expect(home).toMatch(/theChimeNode\.late = function \(theChimeRun\) \{\n {4}state\.theChimeOut\.set\(\{ \.\.\.theChimeRun\.outputs \}\);\n {2}\};/);
    expect(home).not.toContain('theStampNode.late');
    expect(printed.preflight.htmlLosses.filter((l) => /after its run/.test(l.what))).toEqual([]);
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

  it('D1 every one of its 36 logic components prints, and 63 Function bodies travel, each in its own file', () => {
    expect(todo.preflight.logic).toHaveLength(36);
    // 59 in HTX-002; HTX-004 adds the four that read Noodl or await (the minute clock's wake among them).
    expect(Object.keys(todo.files).filter((f) => f.startsWith('functions/'))).toHaveLength(63);
  });

  it('D2 what is left out is named, and none of it is a logic component or a Function it could not place', () => {
    const losses = todo.preflight.htmlLosses.map((l) => l.what);
    // 368 before HTX-002 (session 2's first measurement), 101 after it, 87 after HTX-003, 29 after HTX-004's backend: five
    // For Eaches fed by a Function the plan refuses in every export (EXP-003), the style ports the React export drops too,
    // and the app shell's Group.
    expect(losses.length).toBeLessThanOrEqual(29);
    expect(losses.filter((w) => /HTX-004|api-call|query|session|record|verb-id|Noodl|awaits/.test(w))).toEqual([]);
    expect(losses.filter((w) => /text field|field-focus|HTX-003/.test(w))).toEqual([]);
    expect(losses.filter((w) => /logic component|states-go|Variable's starting value|a Value Changed/.test(w))).toEqual([]);
  });

  it('D3 as it ships (no backend declared), its first page runs from its own files with no error and, nobody being signed in, sends the person to Sign in', async () => {
    // HTX-004: the Todo page's session check prints now, as the running app runs it (its User node's Authenticated false).
    const page = await openHtmlExport(todo.files);
    try {
      for (let i = 0; i < 3; i++) await page.settle();
      expect(page.window.location.hash).toBe('#/sign-in');
      expect(page.text()).toContain('Sign in, or create an account.');
    } finally {
      page.close();
    }
  });

  it('D3b bound to a backend, with a session stored, it draws its tabs and asks for each of its collections once', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'htx004-todo-'));
    fs.cpSync(TODO, dir, { recursive: true });
    const file = path.join(dir, 'nodegx.project.json');
    const project = JSON.parse(fs.readFileSync(file, 'utf-8'));
    project.metadata = { ...(project.metadata ?? {}), cloudservices: { endpoint: 'http://backend.test', appId: 'todo', instanceId: 'x', type: 'nodegx' } };
    fs.writeFileSync(file, JSON.stringify(project));
    const bound = emitHtmlApp(parseProject(dir, catalog), catalog);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fake = require('./helpers/fake-parse-backend').createFakeBackend({ classes: {}, sessions: { 'tok-ann': { objectId: 'u1', username: 'ann' } } });
    const page = await openHtmlExport(bound.files, '', { 'Parse/todo/currentUser': JSON.stringify({ objectId: 'u1', username: 'ann', sessionToken: 'tok-ann' }) }, { prepare: (w) => (w.fetch = fake.fetch) });
    try {
      for (let i = 0; i < 3; i++) await page.settle();
      expect(page.document.title).toBe('Todo list');
      for (const words of ['List (0)', 'Today (0)', 'Done (0)', 'Nothing on the list. Add the next thing you need to do.']) expect(page.text()).toContain(words);
      const asked = fake.log.map((r: { method: string; path: string }) => `${r.method} ${r.path}`);
      expect(asked).toEqual([...new Set(asked)]);
      expect(asked).toContain('POST /classes/Task');
      expect(fake.log.every((r: { signedIn: boolean }) => r.signedIn)).toBe(true);
    } finally {
      page.close();
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
