import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { Catalog, CatalogIndex, loadCatalog } from '../src/catalog';
import { ComponentPlan, planProject } from '../src/analyze/plan';
import { emitApp, EmittedApp } from '../src/emit/emitApp';
import { parseProject } from '../src/parse/parseProject';
import { addAskAndUnless, writeHeaderDesk } from './helpers/header-desk';
import { writeDesk } from './helpers/root-desk';
import { STORE_KEY } from './helpers/store-desk';
import { typecheckEmittedApp } from './helpers/typecheckApp';

/**
 * The Header writes the store (P18 session 141, BOARD lane 6, EXP-021).
 *
 * rocket-school's Header places two Update settings (a setting, the edited player) and a Delete profile; all three `app`s
 * feed its one output `app`, all three `done`s its `write`, and every page hands both to App store. The export refused
 * the output ("two wires feed value output "app" — last-writer-wins is not statically ordered") and with it the Header's
 * `write` on the 8 pages that place it: settings, rename and delete-player saved nothing.
 *
 * Now several placed components' values into one output are each handed this component's own callback: each pushes when
 * it changes, the last writer by when each changed, as the runtime's Component Outputs hands on what arrived last. A feed
 * that is not a drawn placement that lifts its value keeps the output refused, whole.
 *
 * Measuring it found **P18-S141-PASSLATE** (high), live on HEAD: s139's single pass-through (a row, then a push effect of
 * its own) reached the parent one commit after a pulse its own run sent, so the parent's Set wrote the value before —
 * `undefined` over a persisted store on the first press. Every pass-through now forwards the callback, no row between.
 *
 * Driving rocket-school then found **P18-S141-MOUNTEDIN** (high): a placed component that declares `mounted` among its own
 * inputs reads it, and the export spent the wire on the render wrapper alone. The New player form and Confirm mount their
 * root on `m === true`, so the Header's Edit player, and every "are you sure?" in the Hangar and on the Moon, drew nothing.
 *
 * §A the Header Desk (`helpers/header-desk.ts`) on both arms, with the browser's storage seeded and read, predicted first in
 * `dev-docs/tasks/phase-18-code-export-v2/s141-header-app/EXPECTED.md`. §B what is emitted. §C the plan. §D typecheck.
 * §E rocket-school. §F MOUNTEDIN on s126's Root Desk with Ask and Unless (`addAskAndUnless`), predicted in the same file.
 */

const catalog: Catalog = loadCatalog();
type Readings = string[][];

/** One arm in a child process; an arm that throws reads as one reading per scenario holding the error, so rows fail by name. */
const childArm = (helper: string, input: Array<Record<string, unknown> & { scenarios: string[][] }>, env: Record<string, string> = {}): Readings[][] => {
  try {
    return JSON.parse(
      execFileSync(process.execPath, [path.join(__dirname, 'helpers', helper)], {
        input: JSON.stringify(input),
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 120000,
        maxBuffer: 16 * 1024 * 1024,
        env: { ...process.env, ...env }
      })
    );
  } catch (e) {
    const said = String((e as { stderr?: unknown }).stderr ?? e).split('\n')[0];
    return input.map((project) => project.scenarios.map(() => [[`the ${helper} arm threw: ${said}`]]));
  }
};
const writeApp = (app: EmittedApp): string => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'header-desk-app-'));
  for (const [file, text] of Object.entries(app.files)) {
    fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    fs.writeFileSync(path.join(dir, file), text);
  }
  return dir;
};
const emitDir = (dir: string): EmittedApp => emitApp(parseProject(dir, catalog), catalog);
const planOf = (dir: string, legacy: string): ComponentPlan =>
  planProject(parseProject(dir, catalog), new CatalogIndex(catalog)).byLegacyPath.get(legacy)!;
/** A file the export did not write reads '' — at describe time a throw would fail the suite and grade no row by name (s120). */
const fileOf = (app: EmittedApp, pattern: RegExp): string => Object.entries(app.files).find(([f]) => pattern.test(f))?.[1] ?? '';
const reportOf = (app: EmittedApp): string => app.files['EXPORT-REPORT.md'] ?? '';

const stored = (items: string[] | null) => `storage=${items === null ? 'null' : JSON.stringify({ app: { items } })}`;
/** As `s141-header-app/EXPECTED.md` predicted it, before either arm ran: the line, then what is stored. */
const EXPECTED: Readings[] = [
  [
    ['none', stored(null)],
    ['a', stored(['a'])],
    ['a,b', stored(['a', 'b'])],
    ['b', stored(['b'])],
    ['b,a', stored(['b', 'a'])],
    ['b,a,s', stored(['b', 'a', 's'])],
    ['b,a,s,b', stored(['b', 'a', 's', 'b'])]
  ],
  [
    ['kept', stored(['kept'])],
    ['empty', stored([])],
    ['s', stored(['s'])]
  ],
  [
    ['none', stored(null)],
    ['s', stored(['s'])],
    ['s,s', stored(['s', 's'])]
  ]
];
const SCENARIOS = [['Mark A', 'Mark B', 'Header drop', 'Mark A', 'Solo', 'Mark B'], ['Header drop', 'Solo'], ['Solo', 'Solo']];
const STORAGE = { keys: [STORE_KEY], seeds: [{}, { [STORE_KEY]: JSON.stringify({ app: { items: ['kept'] } }) }, {}] };
const RUNTIME_ENV = { RUNTIME_ARM_URL: 'http://localhost/' };

const desk = writeHeaderDesk();
const app = emitDir(desk.dir);
const runtime = childArm('runtime-mounted-arm.js', [{ dir: desk.dir, scenarios: SCENARIOS, storage: STORAGE }], RUNTIME_ENV);
const exported = childArm('export-react-arm.js', [{ dir: writeApp(app), scenarios: SCENARIOS, settled: true, ticks: 2, storage: STORAGE }]);

const unlifted = writeHeaderDesk({ unlifted: true, solo: false });
const unliftedApp = emitDir(unlifted.dir);

const header = fileOf(app, /components\/Header\.tsx$/);
const solo = fileOf(app, /components\/Solo\.tsx$/);
const home = fileOf(app, /pages\/Home\.tsx$/);

describe('§A the emitted app writes what the runtime writes, step by step', () => {
  it('A1 the runtime reads what EXPECTED.md says, in all three scenarios (the arm grades the runtime first)', () => {
    expect(runtime[0]).toEqual(EXPECTED);
  });

  it('A2 the export reads exactly what the runtime reads, the line and the stored JSON, at every step', () => {
    expect(exported[0]).toEqual(runtime[0]);
  });

  it("A3 each of the Header's three writers is the last writer when it runs: Mark A, Mark B, Drop, Mark A again", () => {
    expect(exported[0][0].slice(1, 5).map((r) => r[0])).toEqual(['a', 'a,b', 'b', 'b,a']);
  });

  it('A4 P18-S141-PASSLATE: a pass-through whose pulse comes from the same run does not write over a stored copy (HEAD wrote `{}`)', () => {
    expect(exported[0][1][2]).toEqual(['s', stored(['s'])]);
    expect(exported[0][2][1]).toEqual(['s', stored(['s'])]);
  });
});

describe('§B what is emitted', () => {
  it("B1 the Header hands its own `onAppChanged` to each of the three it places", () => {
    expect(header.match(/^ {4}onAppChanged,$/gm)?.length).toBe(3);
  });

  it('B2 the Header keeps no row for `app` and pushes nothing of its own: the placements push', () => {
    expect(header).not.toContain('onAppChanged?.(');
    expect(header).not.toMatch(/useState<any \| undefined>/);
  });

  it('B3 Solo, the single pass-through, forwards the same way (P18-S141-PASSLATE)', () => {
    expect(solo).toContain('onAppChanged,');
    expect(solo).not.toContain('onAppChanged?.(');
  });

  it("B4 the page writes one row from both, and counts both one's `write`", () => {
    expect(home).toMatch(/<Header\s+app=\{app\}\s+onAppChanged=\{setApp2\}\s+onWrite=\{\(\) => setTheStoreWritePulses\(\(v\) => v \+ 1\)\}/);
    expect(home).toContain('<Solo app={app} onAppChanged={setApp2} onWrite={() => setTheStoreWritePulses((v) => v + 1)} />');
  });
});

describe('§C the plan', () => {
  it("C1 the Header lifts `app`, and each placement's callback is a forward of it", () => {
    const plan = planOf(desk.dir, '/Form/Header');
    expect(plan.liftedOutputProps).toEqual([{ port: 'app', prop: 'onAppChanged', tsType: 'any' }]);
    for (const id of ['markA', 'markB', 'hdDrop']) {
      expect(plan.instanceLifted[id]).toEqual([{ prop: 'onAppChanged', setterName: 'onAppChanged', forward: { tsType: 'any' } }]);
    }
  });

  it('C2 the report says nothing of two wires, nor of a dropped Header wire', () => {
    expect(reportOf(app)).not.toContain('two wires feed value output');
    expect(reportOf(app)).not.toMatch(/wire header:\w+->store:\w+ dropped/);
  });

  it('C3 one writer that does not lift keeps the output refused, whole: the others are named, and the page refuses the pulse', () => {
    const plan = planOf(unlifted.dir, '/Form/Header');
    expect(plan.liftedOutputProps).toEqual([]);
    expect(plan.instanceLifted['markA']).toBeUndefined();
    const report = reportOf(unliftedApp);
    expect(report).toContain(
      'wire markA:app->hdOut:app dropped: another value into output "app" is not handed on (instance output "app" is not lifted by /Logic/Twice — its feed defers there), so the last writer is not one the export knows'
    );
    expect(report).toContain('wire hdDrop:app->hdOut:app dropped: instance output "app" is not lifted by /Logic/Twice — its feed defers there');
    // Said once for the Header's output, not once per writer (Twice's own output says it in its own section).
    const headerSection = report.slice(report.indexOf('### `Form/Header`'), report.indexOf('### ', report.indexOf('### `Form/Header`') + 4));
    expect(headerSection.split('output "app" is a value output with no statically-translatable feed').length - 1).toBe(1);
    expect(report).toMatch(/wire header:write->store:write dropped: the placed component that sends it also hands this one its "app"/);
  });
});

describe('§D typecheck', () => {
  it('D1 the desk and its unlifted variant typecheck as their own `tsc -b` would', () => {
    expect(typecheckEmittedApp(app)).toEqual([]);
    expect(typecheckEmittedApp(unliftedApp)).toEqual([]);
  });
});

describe('§E rocket-school', () => {
  const rocket = emitDir(path.join(__dirname, '..', '..', '..', 'templates', 'rocket-school'));
  const rocketHeader = fileOf(rocket, /components\/Header\.tsx$/);

  it("E1 the Header hands `onAppChanged` to both Update settings and to Delete profile", () => {
    expect(rocketHeader.match(/^ {4}onAppChanged,$/gm)?.length).toBe(3);
  });

  it("E2 none of the 8 pages that place it drops the Header's `app` or `write`", () => {
    expect(reportOf(rocket)).not.toMatch(/wire \w+Header:(app|write)->\w+Store:\w+ dropped/);
  });
});

const ASK_STEPS = [['Open', 'Close']];
const ask = writeDesk(addAskAndUnless);
const askApp = emitDir(ask.dir);
const askRuntime = childArm('runtime-mounted-arm.js', [{ dir: ask.dir, scenarios: ASK_STEPS }]);
const askExported = childArm('export-react-arm.js', [{ dir: writeApp(askApp), scenarios: ASK_STEPS }]);
const askOnly = (r: string[]) => r.filter((t) => /^the (ask|unless)$/.test(t));

describe('§F a placed component reads its own Mounted (P18-S141-MOUNTEDIN)', () => {
  it('F1 the runtime: Ask (`m === true`, Mounted wired) only while `open` is true; Unless (`m !== false`, nothing wired) always', () => {
    expect(askRuntime[0][0].map(askOnly)).toEqual([['the unless'], ['the ask', 'the unless'], ['the unless']]);
  });

  it('F2 the export draws every Text the runtime draws, at every step (HEAD drew no ask after Open)', () => {
    expect(askExported[0]).toEqual(askRuntime[0]);
  });

  it('F3 the wire is handed in as the prop as well as gating the placement', () => {
    expect(fileOf(askApp, /pages\/Home\.tsx$/)).toMatch(/<Ask mounted=\{/);
  });

  it("F4 rocket-school: the Header's New player form and the four Confirms are handed their Mounted", () => {
    const rocket = emitDir(path.join(__dirname, '..', '..', '..', 'templates', 'rocket-school'));
    expect(fileOf(rocket, /components\/Header\.tsx$/)).toContain('mounted={closedTheMenuOrEditingThePlayer.values.form}');
    const confirms = Object.entries(rocket.files).filter(([f]) => /\.tsx$/.test(f)).map(([, t]) => (t.match(/<Confirm\b[^>]*?\bmounted=\{/gs) ?? []).length);
    expect(confirms.reduce((a, b) => a + b, 0)).toBe(4);
  });
});
