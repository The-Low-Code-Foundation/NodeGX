import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { Catalog, CatalogIndex, loadCatalog } from '../src/catalog';
import { ComponentPlan, planProject } from '../src/analyze/plan';
import { jsAwaitsAtTopLevel, jsCallsBackOf, jsHostTraitsOf, jsPurityDefer } from '../src/analyze/jsfun';
import { emitApp, EmittedApp } from '../src/emit/emitApp';
import { parseProject } from '../src/parse/parseProject';
import { BELL_SCRIPT, CHIME_SCRIPT, CLOCK_SCRIPT, PROMISE_SCRIPT, ECHO_SCRIPT, STAMP_SCRIPT, TALLY_SCRIPT, WATCH_SCRIPT, addBell, writeArrivalDesk } from './helpers/arrival-desk';
import { typecheckEmittedApp } from './helpers/typecheckApp';

/**
 * The script runs on its inputs' arrival (P18 session 133, BOARD lane 6, EXP-019 slice 2, Richard's ruling of 2026-10-21).
 *
 * Before: a Function whose body carried a host trait (`this`, the clock, randomness, timers, the browser, the network) and
 * whose Run was not wired was refused ("… and has no Run wire — a run on its inputs' arrival is EXP-019 slice 2"), 73 such
 * Functions in the templates and the nodes that read them (`s133-arrival/census.ts`).
 *
 * Now it is an **arrival run**: compiled as a run is (`compileJsRun`, a kept node, `.call(self)` for a `this` body), with no
 * Done, every output read from its row, and placed as a ticked run's effect that also runs **once at load**
 * (`TickedRunPlan.atLoad`), as the runtime's script setter schedules a run when Run is not connected. The load run waits
 * one task when nothing has arrived yet, for the mount effects above it.
 *
 * §A the emitted app rendered by real React under StrictMode (`helpers/export-react-arm.js`, settled) against the
 * runtime's own Function, Variable, Set Variable, Counter, Button, Text Input and component instance rendered by real
 * React (`helpers/runtime-mounted-arm.js`), step by step, over the Arrival Desk (`helpers/arrival-desk.ts`) — predicted
 * first in `dev-docs/tasks/phase-18-code-export-v2/s133-arrival/EXPECTED.md`. §B what is emitted. §C the plan. §D typecheck.
 */

const catalog: Catalog = loadCatalog();
type Readings = string[][];

/** One arm in a child process; an arm that throws reads as one reading per scenario holding the error, so rows fail by name. */
const childArm = (helper: string, input: Array<{ dir: string; scenarios: string[][]; settled?: boolean; fields?: boolean; ticks?: number }>): Readings[][] => {
  try {
    return JSON.parse(
      execFileSync(process.execPath, [path.join(__dirname, 'helpers', helper)], {
        input: JSON.stringify(input),
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 120000,
        maxBuffer: 16 * 1024 * 1024
      })
    );
  } catch (e) {
    const said = String((e as { stderr?: unknown }).stderr ?? e).split('\n')[0];
    return input.map((project) => project.scenarios.map(() => [[`the ${helper} arm threw: ${said}`]]));
  }
};
const writeApp = (app: EmittedApp): string => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'arrival-desk-app-'));
  for (const [file, text] of Object.entries(app.files)) {
    fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    fs.writeFileSync(path.join(dir, file), text);
  }
  return dir;
};
const emitDir = (dir: string): EmittedApp => emitApp(parseProject(dir, catalog), catalog);
const planOf = (dir: string, legacy: string): ComponentPlan =>
  planProject(parseProject(dir, catalog), new CatalogIndex(catalog)).byLegacyPath.get(legacy)!;

const STEPS = ['Bump', 'Set Bo', 'Set Bo', 'Bump', 'type:Name:Al', 'Clear'];

/** A.count · B.count · runs · greeting · stamp · loaded · seen · bumped · echo · [Name] · focus. */
const NAMES = ['aCount', 'bCount', 'runs', 'greeting', 'stamp', 'loaded', 'seen', 'bumped', 'echo', 'field', 'focus'] as const;
const row = (cells: Partial<Record<(typeof NAMES)[number], string>>, from: string[]): string[] => NAMES.map((n, i) => cells[n] ?? from[i]);
const ECHO = NAMES.indexOf('echo');
const L0 = row({}, ['Ann 1', 'B 1', 'runs 1', 'hi Ann', 'stamped', 'loaded 1 object', 'seen nothing', '0', 'echo 2', '[Name]=', 'focus=none']);
const bump1 = row({ bumped: '1' }, L0);
const bo = row({ aCount: 'Bo 2', runs: 'runs 2', greeting: 'hi Bo', seen: 'seen Bo' }, bump1);
const boAgain = row({}, bo);
const bump2 = row({ bumped: '2' }, boAgain);
const typed = row({ echo: 'echo 3 Al', field: '[Name]=Al' }, bump2);
/** As `s133-arrival/EXPECTED.md` predicted it, with the one cell the runtime arm answered otherwise (echo at load: 2 runs). */
/** Clear: a Set Variable with no Value. The runtime sends no `undefined`; the export refuses the Set by name. Nothing runs in either. */
const cleared = row({}, typed);
const BASE: Readings = [L0, bump1, bo, boAgain, bump2, typed, cleared];

const desk = writeArrivalDesk();
const app = emitDir(desk.dir);
const runtime = childArm('runtime-mounted-arm.js', [{ dir: desk.dir, scenarios: [STEPS], fields: true }]);
// `ticks`: a zero timer the page started has fired before each reading, as the runtime arm lets frames run.
const exported = childArm('export-react-arm.js', [{ dir: writeApp(app), scenarios: [STEPS], settled: true, fields: true, ticks: 3 }]);

describe('§A the emitted app runs what the runtime runs, step by step', () => {
  it('A1 the desk: the runtime reads what EXPECTED.md says (the arm grades the runtime first)', () => {
    expect(runtime[0][0]).toEqual(BASE);
  });

  /** The echo is refused by name (C3): a field's Text exists only inside its own handler, so no effect can watch it. */
  const withoutEcho = (rows: Readings): Readings => rows.map((r) => r.map((c, i) => (i === ECHO ? '' : c)));

  it('A2 the desk: the export reads exactly what the runtime reads, except the echo it refuses', () => {
    expect(exported[0][0]).toEqual(withoutEcho(runtime[0][0]));
  });

  it('A3 one run at load, none per render: runs 1 and loaded 1 survive two Bumps', () => {
    for (const r of exported[0][0]) expect(r[NAMES.indexOf('loaded')]).toBe('loaded 1 object');
    expect(exported[0][0].map((r) => r[NAMES.indexOf('runs')])).toEqual(['runs 1', 'runs 1', 'runs 2', 'runs 2', 'runs 2', 'runs 2', 'runs 2']);
  });

  it('A4 an arrival runs it, the same value again does not, and two placements keep two `this` (Clear: the runtime sends no undefined; the export refuses a Set Variable with no Value — both do nothing)', () => {
    expect(exported[0][0].map((r) => r.slice(0, 2))).toEqual([
      ['Ann 1', 'B 1'],
      ['Ann 1', 'B 1'],
      ['Bo 2', 'B 1'],
      ['Bo 2', 'B 1'],
      ['Bo 2', 'B 1'],
      ['Bo 2', 'B 1'],
      ['Bo 2', 'B 1']
    ]);
  });

  it('A5 the arrival run\'s own signal runs its chain, on Bo and never on Ann', () => {
    expect(exported[0][0].map((r) => r[NAMES.indexOf('seen')])).toEqual(['seen nothing', 'seen nothing', 'seen Bo', 'seen Bo', 'seen Bo', 'seen Bo', 'seen Bo']);
  });

  it('A6 the refused echo shows nothing in the export where the runtime ran it twice at load (said by name in C3)', () => {
    expect(runtime[0][0].map((r) => r[ECHO])).toEqual(['echo 2', 'echo 2', 'echo 2', 'echo 2', 'echo 2', 'echo 3 Al', 'echo 3 Al']);
    expect(exported[0][0].map((r) => r[ECHO])).toEqual(['', '', '', '', '', '', '']);
  });
});

describe('§B what is emitted', () => {
  const tally = Object.entries(app.files).find(([f]) => /components\/Tally\.tsx$/.test(f))![1];
  const home = Object.entries(app.files).find(([f]) => /pages\/Home\.tsx$/.test(f))![1];
  const fileOf = (fn: string) => app.files[Object.keys(app.files).find((f) => new RegExp(`functions/.*${fn}\\.ts$`).test(f))!];

  it('B1 the bodies are verbatim; a `this` body is bound to the node\'s self', () => {
    expect(fileOf('The_tally')).toContain(TALLY_SCRIPT);
    expect(fileOf('The_tally')).toContain('}).call(self);');
    expect(fileOf('The_stamp')).toContain(STAMP_SCRIPT);
    expect(fileOf('The_clock')).toContain(CLOCK_SCRIPT);
    expect(fileOf('The_watch')).toContain(WATCH_SCRIPT);
    expect(fileOf('The_watch')).not.toContain('.call(self)');
  });

  it('B2 each run is one runFunction over a kept node, in an effect keyed on what arrives, with a load run', () => {
    expect(tally).toMatch(/const theTallyNode = useRef\(functionNode</);
    expect(tally.match(/runFunction\(The_tally, \{ label \}, theTallyNode\)/g)).toHaveLength(1);
    expect(tally).toContain('if (tickedArrival(theTallyHeld, [label])) {');
    expect(tally).toContain('const theTallyRunAtLoad = setTimeout(() => {');
    expect(tally).toContain('return () => clearTimeout(theTallyRunAtLoad);');
    expect(tally).toMatch(/\}, \[label\]\);/);
    expect(home).toContain('if (tickedArrival(theClockHeld, [])) {');
    expect(home).toMatch(/runFunction\(The_clock, \{\}, theClockNode\)[\s\S]*?\}, \[\]\);/);
  });

  it('B3 every read of an arrival run\'s output is its row; no body is called at a read site', () => {
    expect(tally).toContain('{theTallyOut?.count ?? \'\'}');
    for (const fn of ['The_tally', 'The_stamp', 'The_clock', 'The_watch']) expect(tally + home).not.toMatch(new RegExp(`${fn}\\(\\{`));
  });

  it('B4 the signal\'s chain runs inside the run, off its pulses', () => {
    expect(home).toMatch(/for \(const theWatchPulse of theWatchRun\.pulses\) \{\s*if \(theWatchPulse\.signal === 'isBo'\) \{\s*seen\.set\('seen Bo'\);/);
  });
});

describe('§C the plan', () => {
  const home = planOf(desk.dir, '/Pages/Home');
  const tally = planOf(desk.dir, '/Components/Tally');
  const def = (plan: ComponentPlan, fn: string) => Object.values(plan.jsFunctions).find((f) => f.fnName === fn)!;

  it('C1 the four arrival runs export: reactive, traited, kept (pulsed), each a ticked run with a load run', () => {
    for (const [plan, id, fn] of [[tally, 'tally', 'The_tally'], [home, 'stamp', 'The_stamp'], [home, 'clock', 'The_clock'], [home, 'watch', 'The_watch']] as const) {
      expect(plan.dispositions[id]).toMatchObject({ kind: 'collapsed' });
      expect(def(plan, fn).mode).toBe('reactive');
      expect(def(plan, fn).host!.length).toBeGreaterThan(0);
      expect(def(plan, fn).pulsed).toBe(true);
      expect(plan.tickedRuns.find((t) => t.nodeId === id)).toMatchObject({ atLoad: true });
    }
  });

  it('C2 the slice-2 sentence is gone from every disposition and note', () => {
    for (const plan of [home, tally]) {
      expect(JSON.stringify(plan.dispositions)).not.toContain('EXP-019 slice 2');
      expect(plan.notes.join('\n')).not.toContain('EXP-019 slice 2');
    }
  });

  it('C3 the field-fed echo is refused by name: its Text exists only inside the field\'s handler', () => {
    expect(ECHO_SCRIPT).toContain('this.e');
    expect(home.dispositions['echo']).toMatchObject({ kind: 'deferred' });
    expect((home.dispositions['echo'] as { reason: string }).reason).toBe(
      'the script runs on its inputs\' arrival (it keeps state on `this` across runs), and that run is not exported: its "text" input is ticked under Run On Value Change, so a new value runs it again, and that value exists only inside a handler — the export cannot watch it'
    );
  });

  it('C4 a Done wired on an arrival run is refused by name: nothing sends it', () => {
    const { dir } = writeArrivalDesk((d) => {
      d.components['Pages/Home'].connections.push({ fromId: 'clock', fromProperty: 'done', toId: 'sdSeen', toProperty: 'do' });
    });
    const plan = planOf(dir, '/Pages/Home');
    expect(plan.dispositions['clock']).toMatchObject({ kind: 'deferred' });
    expect(JSON.stringify(plan.dispositions['clock'])).toContain('its Done is wired, and with no Run wire nothing sends it');
  });

  it('C6 no note says the watch\'s signal wire was dropped: its chain runs inside the arrival run (B4)', () => {
    expect(home.notes.filter((n) => n.includes('watch:out-isBo'))).toEqual([]);
    expect(home.dispositions['sdSeen']).toMatchObject({ kind: 'collapsed' });
  });

  it('C7 a body that writes nothing and sends nothing still runs, kept, at load and on arrival (the browser is what it changes)', () => {
    const NOTE = "localStorage.setItem('arrival-note', String(Inputs.name));";
    const { dir } = writeArrivalDesk((d) => {
      const homeGraph = d.components['Pages/Home'];
      homeGraph.nodes.push({ id: 'note', type: 'JavaScriptFunction', label: 'The note', x: 600, y: 600, parameters: { functionScript: NOTE, 'runOnChange-in-name': true }, ports: [{ name: 'in-name', plug: 'input', type: '*' }] });
      homeGraph.connections.push({ fromId: 'nameVar', fromProperty: 'value', toId: 'note', toProperty: 'in-name' });
    });
    const plan = planOf(dir, '/Pages/Home');
    expect(plan.dispositions['note']).toMatchObject({ kind: 'collapsed' });
    expect(def(plan, 'The_note').pulsed).toBe(true);
    expect(plan.tickedRuns.find((t) => t.nodeId === 'note')).toMatchObject({ atLoad: true });
    const page = Object.entries(emitDir(dir).files).find(([f]) => /pages\/Home\.tsx$/.test(f))![1];
    expect(page).toMatch(/runFunction\(The_note, \{ name: name\.get\(\) \}, theNoteNode\)/);
  });

  it('C8 a signal whose chain is refused keeps its reason on the wire (not the catch-all), and the run still exports', () => {
    const { dir } = writeArrivalDesk((d) => {
      d.components['Pages/Home'].connections.push({ fromId: 'watch', fromProperty: 'out-isBo', toId: 'sdClear', toProperty: 'do' });
    });
    const plan = planOf(dir, '/Pages/Home');
    expect(plan.dispositions['watch']).toMatchObject({ kind: 'collapsed' });
    const said = plan.notes.filter((n) => n.startsWith('wire watch:out-isBo->'));
    expect(said.length).toBeGreaterThan(0);
    for (const n of said) expect(n).not.toContain('has no deterministic translation');
    expect(said.join('\n')).toContain('nothing is wired into value');
    // A refused signal's wires are not reads: no row is minted for a body with no value output (planning's TS2345, s133).
    expect(plan.stateVars.some((v) => v.originNodeId === 'watch')).toBe(false);
    expect(typecheckEmittedApp(emitDir(dir))).toEqual([]);
  });

  it('C5 a Run wire makes it an invoked run again: no load run (slice 1)', () => {
    const { dir } = writeArrivalDesk((d) => {
      d.components['Pages/Home'].connections.push({ fromId: 'bumpBtn', fromProperty: 'onClick', toId: 'clock', toProperty: 'run' });
    });
    const plan = planOf(dir, '/Pages/Home');
    expect(def(plan, 'The_clock').mode).toBe('invoked');
    expect(plan.tickedRuns.find((t) => t.nodeId === 'clock')).toBeUndefined();
  });
});

/**
 * §E The Bell variant (s133): a body that writes and signals after its run has returned, from a zero timer — an arrival
 * run (the bell) and a Run-wired one (the chime). Found by reading the gained nodes' emitted code (todo-list's minute clock,
 * planning's Escape listener); `FunctionNode.late` hands the late write and signal to the component.
 */
const bellDesk = writeArrivalDesk(addBell);
const bellApp = emitDir(bellDesk.dir);
const bellRuntime = childArm('runtime-mounted-arm.js', [{ dir: bellDesk.dir, scenarios: [['Chime']] }]);
const bellExported = childArm('export-react-arm.js', [{ dir: writeApp(bellApp), scenarios: [['Chime']], settled: true, ticks: 3 }]);
const BELL = 9; // bell · rings · chimed · promised · keeps, after the nine desk Texts

describe('§E a write after the run has returned', () => {
  it('E1 the runtime: the bell rang and the promise was kept at load, the chime writes after its press', () => {
    expect(bellRuntime[0][0].map((r) => r.slice(BELL))).toEqual([
      ['rung object', '1', 'Text', 'promise kept', '1'],
      ['rung object', '1', 'chimed', 'promise kept', '1']
    ]);
  });

  it('E2 the export reads the same, except the chime\'s Text before its wire delivers (P18-S132-AUTHOREDTEXT, pinned)', () => {
    expect(bellExported[0][0].map((r) => r.slice(BELL))).toEqual([
      ['rung object', '1', '', 'promise kept', '1'],
      ['rung object', '1', 'chimed', 'promise kept', '1']
    ]);
  });

  it('E3 each kept node is handed what its body does later: the row, and the signal\'s chain', () => {
    const home = Object.entries(bellApp.files).find(([f]) => /pages\/Home\.tsx$/.test(f))![1];
    expect(home).toMatch(/theBellNode\.late = \(theBellRun\) => \{\s*setTheBellOut\(\{ \.\.\.theBellRun\.outputs \}\);\s*for \(const theBellPulse of theBellRun\.pulses\)/);
    expect(home).toMatch(/theChimeNode\.late = \(theChimeRun\) => \{\s*setTheChimeOut\(\{ \.\.\.theChimeRun\.outputs \}\);\s*\};/);
    expect(home).toMatch(/thePromiseNode\.late = \(thePromiseRun\) => \{\s*setThePromiseOut\(\{ \.\.\.thePromiseRun\.outputs \}\);\s*for \(const thePromisePulse of thePromiseRun\.pulses\)/);
    // The desk's other bodies do not call back, and print no handler.
    expect(home).not.toContain('theStampNode.late');
    expect(BELL_SCRIPT + CHIME_SCRIPT).toContain('setTimeout');
    expect(PROMISE_SCRIPT).toContain('.then(');
  });

  it('E4 the plan marks the bodies that may call back, and only those', () => {
    const plan = planOf(bellDesk.dir, '/Pages/Home');
    const late = Object.values(plan.jsFunctions).filter((f) => f.late === true).map((f) => f.fnName).sort();
    expect(late).toEqual(['The_bell', 'The_chime', 'The_promise']);
  });

  it('E6 asynchrony that is not a top-level await is a host trait that calls back; a top-level await keeps the gate (slice 1b)', () => {
    expect(jsHostTraitsOf(PROMISE_SCRIPT)).toEqual(['is asynchronous (it calls back)']);
    expect(jsCallsBackOf(PROMISE_SCRIPT)).toBe(true);
    expect(jsAwaitsAtTopLevel(PROMISE_SCRIPT)).toBe(false);
    expect(jsAwaitsAtTopLevel('async function go() { await fetch("/x"); } go();')).toBe(false);
    expect(jsAwaitsAtTopLevel('Outputs.n = await fetch("/x");')).toBe(true);
    expect(jsPurityDefer('function', 'Outputs.n = await fetch("/x");')).toBe(
      'is asynchronous — it awaits at its top level, and a run the export awaits before Success and Done is EXP-019 slice 1b'
    );
    expect(jsPurityDefer('expression', 'x.then(1)')).toContain('is asynchronous');
  });

  it('E5 the Bell app passes its own tsc', () => {
    expect(typecheckEmittedApp(bellApp)).toEqual([]);
  });
});

describe('§D the emitted app typechecks', () => {
  it('D1 the Arrival Desk\'s app passes its own tsc', () => {
    expect(typecheckEmittedApp(app)).toEqual([]);
  });
});
