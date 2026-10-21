import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { Catalog, CatalogIndex, loadCatalog } from '../src/catalog';
import { ComponentPlan, planProject } from '../src/analyze/plan';
import { jsHostTraitsOf, jsPurityDefer } from '../src/analyze/jsfun';
import { emitApp, EmittedApp } from '../src/emit/emitApp';
import { FUNCTION_RUN_LIB_PATH } from '../src/emit/functionRunLib';
import { parseProject } from '../src/parse/parseProject';
import { STAMP_SCRIPT, TALLY_SCRIPT, writeHostDesk } from './helpers/host-desk';
import { Desk } from './helpers/root-desk';
import { typecheckEmittedApp } from './helpers/typecheckApp';

/**
 * The script travels as written (P18 session 132, BOARD lane 6, EXP-019 slice 1, Richard's ruling of 2026-10-21).
 *
 * Before: a Function whose body read the clock, drew randomness, scheduled a timer, touched the browser, reached the
 * network or kept state on `this` was refused whole ("the script reads the clock (Date) — not deterministic"), 683 of the
 * templates' 1,285 bodies among them (`s132-hostgates/census-scripts.md`). The gates were shaped like the grading method:
 * the runtime hosts every one of those bodies.
 *
 * Now a Run-wired Function carries those traits (`jsHostTraitsOf`) and runs **once per Run with a kept node**: `host` ⇒
 * `pulsed`, so the body never runs at a read site, and a `this` body runs bound to the node's `self`
 * (`runFunction(body, inputs, node)` hands `node.self`). With no Run wire it is still refused, by the trait's name, until
 * slice 2 (a run on its inputs' arrival). An Expression is held to every gate as before.
 *
 * §A the emitted app rendered by real React under StrictMode (`helpers/export-react-arm.js`, settled) against the
 * runtime's own Function, Variable, Set Variable, Button and component instance rendered by real React
 * (`helpers/runtime-mounted-arm.js`), step by step, over the Host Desk (`helpers/host-desk.ts`) — predicted first in
 * `dev-docs/tasks/phase-18-code-export-v2/s132-hostgates/EXPECTED.md`. §B what is emitted. §C the plan and the
 * classifier. §D typecheck.
 */

const catalog: Catalog = loadCatalog();
type Readings = string[][];

/** One arm in a child process; an arm that throws reads as one reading per scenario holding the error, so rows fail by name. */
const childArm = (helper: string, input: Array<{ dir: string; scenarios: string[][]; settled?: boolean }>): Readings[][] => {
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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'host-desk-app-'));
  for (const [file, text] of Object.entries(app.files)) {
    fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    fs.writeFileSync(path.join(dir, file), text);
  }
  return dir;
};
const emitDir = (dir: string): EmittedApp => emitApp(parseProject(dir, catalog), catalog);
const planOf = (dir: string, legacy: string): ComponentPlan =>
  planProject(parseProject(dir, catalog), new CatalogIndex(catalog)).byLegacyPath.get(legacy)!;

const STEPS = ['Count A', 'Count A', 'Count B', 'Count A', 'Stamp', 'Say'];

/** Tally's Run wire removed: the body keeps `this` and nothing runs it but its inputs (it has none) — slice 2's shape. */
const unwireRun = (d: Desk) => {
  const tally = d.components['Components/Tally'];
  tally.connections = tally.connections.filter((c) => !(c.toId === 'tally' && c.toProperty === 'run'));
};

/** A.count · A.again · B.count · B.again · year · later · picked · timer · win · said. */
const row = (cells: Partial<Record<'aCount' | 'aAgain' | 'bCount' | 'bAgain' | 'year' | 'later' | 'picked' | 'timer' | 'win' | 'said', string>>, from: string[]): string[] => {
  const names = ['aCount', 'aAgain', 'bCount', 'bAgain', 'year', 'later', 'picked', 'timer', 'win', 'said'] as const;
  return names.map((n, i) => cells[n] ?? from[i]);
};
const L0 = row({}, ['count nothing', 'again nothing', 'count nothing', 'again nothing', 'year nothing', 'later nothing', 'picked nothing', 'timer nothing', 'win nothing', 'said nothing']);
const a1 = row({ aCount: '1', aAgain: '1' }, L0);
const a2 = row({ aCount: '2', aAgain: '2' }, a1);
const b1 = row({ bCount: '1', bAgain: '1' }, a2);
const a3 = row({ aCount: '3', aAgain: '3' }, b1);
const stamped = row({ year: '1970', later: 'yes', picked: 'picked', timer: 'set', win: 'window' }, a3);
const said = row({ said: 'hello Ann' }, stamped);
/** As `s132-hostgates/EXPECTED.md` predicted it, before either arm ran. */
const BASE: Readings = [L0, a1, a2, b1, a3, stamped, said];

const desk = writeHostDesk();
const app = emitDir(desk.dir);
const runtime = childArm('runtime-mounted-arm.js', [{ dir: desk.dir, scenarios: [STEPS] }]);
const exported = childArm('export-react-arm.js', [{ dir: writeApp(app), scenarios: [STEPS], settled: true }]);

describe('§A the emitted app runs what the runtime runs, step by step', () => {
  it('A1 the desk: the runtime reads what EXPECTED.md says (the arm grades the runtime first)', () => {
    expect(runtime[0][0]).toEqual(BASE);
  });

  /** P18-S132-AUTHOREDTEXT (filed this session, low): a wired Text's own text, which the runtime shows until the wire delivers. */
  const AUTHORED = new Set(['count nothing', 'again nothing']);
  const withoutAuthored = (rows: Readings): Readings => rows.map((r) => r.map((c) => (AUTHORED.has(c) ? '' : c)));

  it('A2 the desk: the export reads exactly what the runtime reads, except the one filed divergence', () => {
    expect(exported[0][0]).toEqual(withoutAuthored(runtime[0][0]));
  });

  it('A2b P18-S132-AUTHOREDTEXT, pinned by name: the runtime shows a wired Text\'s own text until the wire delivers; the export shows nothing there', () => {
    // Not graded away: A's two Texts before its first press, B's before its (rows 0–2). When the bug is fixed this row
    // flips to a plain equality and A2's mask goes.
    expect(runtime[0][0][0].slice(0, 4)).toEqual(['count nothing', 'again nothing', 'count nothing', 'again nothing']);
    expect(runtime[0][0][2].slice(2, 4)).toEqual(['count nothing', 'again nothing']);
    expect(exported[0][0][0].slice(0, 4)).toEqual(['', '', '', '']);
    expect(exported[0][0][2].slice(2, 4)).toEqual(['', '']);
    expect(exported[0][0].map((r) => r.slice(4))).toEqual(runtime[0][0].map((r) => r.slice(4)));
  });

  it('A3 `this` persists across runs, and one run read twice reads once: three presses read 3 and 3', () => {
    expect(exported[0][0][4].slice(0, 2)).toEqual(['3', '3']);
  });

  it('A4 two placements keep two counts', () => {
    expect(exported[0][0][3].slice(0, 4)).toEqual(['2', '2', '1', '1']);
  });

  it('A5 the clock, randomness, a timer and the browser are read where the runtime reads them', () => {
    expect(exported[0][0][5].slice(4, 9)).toEqual(['1970', 'yes', 'picked', 'set', 'window']);
  });

  it('A6 the control: the pure body is untouched', () => {
    expect(exported[0][0][6][9]).toBe('hello Ann');
  });
});

describe('§B what is emitted', () => {
  const tallyFile = Object.keys(app.files).find((f) => /functions\/.*The_tally\.ts$/.test(f))!;
  const stampFile = Object.keys(app.files).find((f) => /functions\/.*The_stamp\.ts$/.test(f))!;
  const page = Object.entries(app.files).find(([f]) => /components\/Tally\.tsx$/.test(f))![1];
  const home = Object.entries(app.files).find(([f]) => /pages\/Home\.tsx$/.test(f))![1];

  it('B1 the this-keeping body is verbatim, bound to the node\'s self, and takes self as its third parameter', () => {
    const text = app.files[tallyFile];
    expect(text).toContain(TALLY_SCRIPT);
    expect(text).toContain('(function (this: Record<string, any>) {');
    expect(text).toContain('}).call(self);');
    expect(text).toMatch(/, self: Record<string, any> = \{\}\): /);
  });

  it('B2 the four-trait body is verbatim and takes the plain wrapper (no self)', () => {
    const text = app.files[stampFile];
    expect(text).toContain(STAMP_SCRIPT);
    expect(text).not.toContain('.call(self)');
    expect(text).not.toContain('self: Record');
  });

  it('B3 each component keeps the node and runs it once per Run through runFunction', () => {
    expect(page).toMatch(/const theTallyNode = useRef\(functionNode</);
    expect(page).toMatch(/const theTallyRun = runFunction\(The_tally, \{\}, theTallyNode\)/);
    expect(page.match(/runFunction\(The_tally/g)).toHaveLength(1);
    expect(home).toMatch(/const theStampRun = runFunction\(The_stamp, \{\}, theStampNode\)/);
  });

  it('B4 the chain reads the run\'s outputs, never the function again', () => {
    expect(page).toContain("setTheTallyOut({ ...theTallyRun.outputs })");
    expect(page).not.toMatch(/The_tally\(\{/);
  });

  it('B5 the library hands the body the node\'s self', () => {
    const lib = app.files[FUNCTION_RUN_LIB_PATH];
    expect(lib).toContain('self: Record<string, unknown>;');
    expect(lib).toContain('return { signals, outputs: {}, delivered: {}, self: {} };');
    expect(lib).toContain('body(inputs, outputs as unknown as O, node.self);');
  });
});

describe('§C the plan and the classifier', () => {
  it('C1 the classifier names the traits, in gate order, and passes the body', () => {
    expect(jsHostTraitsOf(TALLY_SCRIPT)).toEqual(['keeps state on `this` across runs']);
    expect(jsHostTraitsOf(STAMP_SCRIPT)).toEqual(['reads the clock (Date)', 'draws randomness (Math.random)', 'schedules timers', 'touches the browser environment']);
    expect(jsPurityDefer('function', TALLY_SCRIPT)).toBeNull();
    expect(jsPurityDefer('function', STAMP_SCRIPT)).toBeNull();
  });

  it('C2 the gates still hold for an Expression, for the Noodl API, and for asynchrony (slice 1b)', () => {
    expect(jsPurityDefer('expression', 'random() * 2')).toBe('draws randomness (random) — not deterministic');
    expect(jsPurityDefer('expression', 'Date.now()')).toBe('reads the clock (Date) — not deterministic');
    expect(jsPurityDefer('function', 'Outputs.n = Noodl.Events.emit("x");')).toContain('reads the Noodl API');
    expect(jsPurityDefer('function', 'Outputs.n = await fetch("/x");')).toContain('is asynchronous');
    expect(jsHostTraitsOf('Outputs.n = Inputs.a + 1;')).toEqual([]);
  });

  it('C3 the plan carries the traits and keeps the node (pulsed)', () => {
    const tally = planOf(desk.dir, '/Components/Tally');
    const def = Object.values(tally.jsFunctions).find((f) => f.fnName === 'The_tally')!;
    expect(def.host).toEqual(['keeps state on `this` across runs']);
    expect(def.pulsed).toBe(true);
    expect(def.mode).toBe('invoked');
    expect(tally.dispositions['tally']).toMatchObject({ kind: 'collapsed' });
    const home = planOf(desk.dir, '/Pages/Home');
    const stamp = Object.values(home.jsFunctions).find((f) => f.fnName === 'The_stamp')!;
    expect(stamp.host).toHaveLength(4);
    expect(stamp.pulsed).toBe(true);
    expect(Object.values(home.jsFunctions).find((f) => f.fnName === 'The_greeting')!.host).toBeUndefined();
  });

  it('C4 with no Run wire a traited body is refused by its trait\'s name (slice 2)', () => {
    const { dir } = writeHostDesk(unwireRun);
    const tally = planOf(dir, '/Components/Tally');
    expect(tally.dispositions['tally']).toMatchObject({ kind: 'deferred' });
    expect((tally.dispositions['tally'] as { reason: string }).reason).toBe(
      "the script keeps state on `this` across runs and has no Run wire — a run on its inputs' arrival is EXP-019 slice 2"
    );
  });
});

describe('§D the emitted app typechecks', () => {
  it('D1 the Host Desk\'s app passes its own tsc', () => {
    expect(typecheckEmittedApp(app)).toEqual([]);
  });
});
