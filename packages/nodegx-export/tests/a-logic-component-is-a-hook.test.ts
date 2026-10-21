import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { Catalog, CatalogIndex, loadCatalog } from '../src/catalog';
import { ComponentPlan, planProject } from '../src/analyze/plan';
import { emitApp, EmittedApp } from '../src/emit/emitApp';
import { parseProject } from '../src/parse/parseProject';
import { writeHookDesk } from './helpers/hook-desk';
import { typecheckEmittedApp } from './helpers/typecheckApp';

/**
 * A logic component is a hook (P18 session 136, BOARD lane 6, EXP-021 slice 1).
 *
 * Before: a component with no visual node — the templates have 332, placed 649 times, and 223 of them are Component Inputs
 * → one Function → Component Outputs — was refused whole ("no visual root — logic-only components defer to EXP-003"), and
 * every node in it and its placements fell to the catch-all "logic node (…)": 1,962 of the templates' 3,790 refusals
 * (`dev-docs/tasks/phase-18-code-export-v2/s136-hooks/`).
 *
 * Now a logic component that some component places is planned without a root, as the router shell is, and emitted as a
 * hook, `use<Name>(props)`, with the props interface a visual component has. Its placements join the parent's rendered
 * set as instances, so every pass that binds a placed component's inputs, pulses its signal inputs (§94), runs its signal
 * outputs' chains and lifts its value outputs (§4d, §96) treats them as it treats a drawn one; the parent calls the hook
 * after its state rows, refs and render locals, and draws nothing for it. Beside it: a Run-wired Function's value may
 * feed Component Outputs (s122 refused it before §96 ordered a pulse after its value; Echo grades that), and a Function's
 * value may feed a placed component's declared input (Pass 4e).
 *
 * §A the emitted app rendered by real React under StrictMode (`helpers/export-react-arm.js`, settled) against the
 * runtime's own Function, Button, Group, Text, Component Inputs/Outputs and component instances
 * (`helpers/runtime-mounted-arm.js`), step by step, over the Hook Desk (`helpers/hook-desk.ts`), predicted first in
 * `s136-hooks/EXPECTED.md`. §B what is emitted. §C the plan. §D typecheck.
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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hook-desk-app-'));
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

const STEPS = ['More', 'Go A', 'Go B', 'Go A', 'More'];

/** P18-S122-TEXTDEFAULT: a wired Text the wire has not reached shows the word "Text" in the runtime. */
const T = 'Text';
/** As `s136-hooks/EXPECTED.md` predicted it, before either arm ran: y · label · total A · total B · dones · echo. */
const BASE: Readings = [
  ['0', 'y is 0', T, T, T, T],
  ['2', 'y is 2', T, T, T, T],
  ['2', 'y is 2', 'total 1', T, 'dones 1', 'echo total 1'],
  ['2', 'y is 2', 'total 1', 'total 10', 'dones 2', 'echo total 1'],
  ['2', 'y is 2', 'total 2', 'total 10', 'dones 3', 'echo total 2'],
  ['4', 'y is 4', 'total 2', 'total 10', 'dones 3', 'echo total 2']
];
const withoutDefault = (rows: Readings): Readings => rows.map((r) => r.map((c) => (c === T ? '' : c)));

const desk = writeHookDesk();
const app = emitDir(desk.dir);
const runtime = childArm('runtime-mounted-arm.js', [{ dir: desk.dir, scenarios: [STEPS] }]);
const exported = childArm('export-react-arm.js', [{ dir: writeApp(app), scenarios: [STEPS], settled: true }]);

describe('§A the emitted app does what the runtime does, step by step', () => {
  it('A1 the desk: the runtime reads what EXPECTED.md says (the arm grades the runtime first)', () => {
    expect(runtime[0][0]).toEqual(BASE);
  });

  it('A2 the desk: the export reads exactly what the runtime reads, at every step, but the word "Text"', () => {
    expect(exported[0][0]).toEqual(withoutDefault(runtime[0][0]));
  });

  it('A3 a logic component with no Run computes at load, and feeds another: y 0, "y is 0", then 2 and "y is 2" after More', () => {
    expect(exported[0][0].slice(0, 2).map((r) => r.slice(0, 2))).toEqual([['0', 'y is 0'], ['2', 'y is 2']]);
  });

  it('A4 a signal into a logic component runs it once, and the signal it sends out runs the page\'s chain', () => {
    expect(exported[0][0][2].slice(2, 5)).toEqual(['total 1', '', 'dones 1']);
    expect(exported[0][0][4][4]).toBe('dones 3');
  });

  it('A5 two placements are two instances: Tally B keeps its own total while Tally A counts on', () => {
    expect(exported[0][0][4].slice(2, 4)).toEqual(['total 2', 'total 10']);
  });

  it('A6 a value and the signal sent with it reach another logic component in that order (todo-list\'s lists, s122)', () => {
    expect(exported[0][0].map((r) => r[5])).toEqual(['', '', 'echo total 1', 'echo total 1', 'echo total 2', 'echo total 2']);
  });
});

describe('§B what is emitted', () => {
  const home = fileOf(app, /pages\/Home\.tsx$/);
  const tally = fileOf(app, /components\/Tally\.tsx$/);
  const double = fileOf(app, /components\/Double\.tsx$/);

  it('B1 each logic component is a hook in its own file: `use<Name>`, typed by `<Name>Props`, returning nothing', () => {
    for (const name of ['Double', 'Label', 'Tally', 'Echo']) {
      const text = fileOf(app, new RegExp(`components/${name}\\.tsx$`));
      expect(text).toContain(`export interface ${name}Props {`);
      // A placement that passes nothing calls it with nothing (bot-garden's Pick thing): the props default.
      expect(text).toMatch(new RegExp(`export function use${name}\\(\\{ [^}]+ \\}: ${name}Props = \\{\\}\\) \\{`));
      expect(text).not.toMatch(/^ {2}return\b/m);
      expect(text).not.toMatch(/^\s*<[A-Za-z>]|\/>/m);
    }
  });

  it('B2 the boundary is the visual one: values, a pulse, a signal out, a lifted value', () => {
    expect(tally).toContain('  go?: { sent: number; taken: { current: number } };');
    expect(tally).toContain('  onDone?: () => void;');
    expect(tally).toContain('  onTotalChanged?: (value: string | undefined) => void;');
    expect(tally).toContain('onDone?.();');
    expect(double).toContain('const WorkOut = Work({ x });');
  });

  it('B3 the page calls each placement once, after its state rows and refs, with no early return above, and draws nothing for it', () => {
    expect(home).toContain('  useDouble({ x: bumpOut?.n, onYChanged: setY });');
    expect(home).toContain('  useLabel({ y, onTextChanged: setText });');
    expect(home.match(/^ {2}useTally\(\{$/gm)).toHaveLength(2);
    expect(home).toMatch(/useEcho\(\{\n {4}take: \{ sent: echoTakeDelivered, taken: echoTakeTaken \},\n {4}said: total,/);
    const firstCall = home.indexOf('  useDouble(');
    expect(firstCall).toBeGreaterThan(home.lastIndexOf('useState<'));
    expect(firstCall).toBeGreaterThan(home.lastIndexOf('useRef('));
    expect(home.slice(0, firstCall)).not.toMatch(/^ {2}(if \([^\n]*\) )?return\b/m);
    expect(home).not.toMatch(/<use[A-Z]|<(Double|Label|Tally|Echo)\b/);
  });
});

describe('§C the plan', () => {
  it('C1 a placed logic component plans as a hook: a file named for it, nothing in it refused', () => {
    for (const [legacy, symbol] of [['/Logic/Double', 'useDouble'], ['/Logic/Tally', 'useTally'], ['/Logic/Echo', 'useEcho']]) {
      const plan = planOf(desk.dir, legacy);
      expect(plan.hook).toBe(true);
      expect(plan.file).toMatchObject({ dir: 'components', symbol });
      expect(Object.values(plan.dispositions).filter((d) => d.kind === 'deferred')).toEqual([]);
    }
  });

  it('C2 its placements are hook calls: instances in the rendered set, in source order, none refused', () => {
    const home = planOf(desk.dir, '/Pages/Home');
    expect(home.hookCalls).toEqual(['double', 'label', 'tallyA', 'tallyB', 'echo']);
    for (const id of home.hookCalls) {
      expect(home.roleOf[id]).toBe('instance');
      expect(home.dispositions[id]).toEqual({ kind: 'static' });
    }
    expect(Object.values(home.dispositions).filter((d) => d.kind === 'deferred')).toEqual([]);
  });

  it('C3 a logic component nobody places keeps the old refusal (nothing would call it)', () => {
    const { dir } = writeHookDesk((d) => {
      d.components['Logic/Orphan'] = JSON.parse(JSON.stringify(d.components['Logic/Double']));
    });
    const orphan = planOf(dir, '/Logic/Orphan');
    expect(orphan.hook).toBeUndefined();
    expect(orphan.skipReason).toBe('no visual root — logic-only components defer to EXP-003');
  });

  it('C4 a logic component placed inside the visual tree is called too, never drawn', () => {
    const { dir } = writeHookDesk((d) => {
      const home = d.components['Pages/Home'];
      home.nodes.find((n) => n.id === 'double')!.parent = 'shell';
      home.nodes.find((n) => n.id === 'shell')!.children!.push('double');
    });
    const plan = planOf(dir, '/Pages/Home');
    expect(plan.hookCalls).toContain('double');
    expect(plan.childrenOf['shell']).not.toContain('double');
    const page = fileOf(emitDir(dir), /pages\/Home\.tsx$/);
    expect(page).toContain('  useDouble({ x: bumpOut?.n, onYChanged: setY });');
    expect(page).not.toMatch(/<use[A-Z]/);
  });

  it('C5 a component with a node that draws is not a logic component, even with no visual root', () => {
    const { dir } = writeHookDesk((d) => {
      d.components['Logic/Double'].nodes.push({ id: 'dbStray', type: 'Text', label: 'Stray', parent: 'nowhere', parameters: {}, x: 600, y: 600 });
    });
    expect(planOf(dir, '/Logic/Double').hook).toBeUndefined();
  });

  it('C6 a Run-wired Function\'s value lifts through Component Outputs: the run compiles first, its row is read', () => {
    const tally = planOf(desk.dir, '/Logic/Tally');
    expect(tally.liftedOutputProps).toEqual([{ port: 'total', prop: 'onTotalChanged', tsType: 'string' }]);
    expect(tally.pushEffects).toEqual([expect.objectContaining({ prop: 'onTotalChanged', expr: expect.objectContaining({ kind: 'jsfun-out', viaState: 'workOut' }) })]);
  });
});

/**
 * §E what reading the templates' emitted code found, each pinned where it was found (`s136-hooks/README.md`). The count
 * said 1,520 gained and 0 lost; the code said a query's lists were pushed once and never again, a component whose only
 * root is a logic placement drew `<useWriteHistory />`, a ticked input watched another chain's local, a list of lists
 * typed `readonly readonly`, and an Expression's inferred type met a typed prop.
 */
describe('§E the templates, where the code was read', () => {
  const TEMPLATES = path.join(__dirname, '..', '..', '..', 'templates');
  const emitted = new Map<string, EmittedApp>();
  const tpl = (name: string): EmittedApp => {
    if (!emitted.has(name)) emitted.set(name, emitDir(path.join(TEMPLATES, name)));
    return emitted.get(name)!;
  };

  it('E1 P18-S136-QUERYPUSH: todo-list\'s Todo data pushes each list when its query answers, not once at mount', () => {
    const data = fileOf(tpl('todo-list'), /components\/TodoData\.tsx$/);
    expect(data).toContain('    onTasksChanged?.(tasks);\n  }, [tasks, onTasksChanged]);');
    expect(data).toContain('  }, [routineChecks, onChecksChanged]);');
    expect(fileOf(tpl('todo-list'), /pages\/Todo\.tsx$/)).toMatch(/useTodoData\(\{\n {4}refresh: \{ sent: \w+, taken: \w+ \},/);
  });

  it('E2 a component whose only root is a logic placement is a logic component: a hook that calls the other', () => {
    const add = fileOf(tpl('todo-list'), /components\/AddAction\.tsx$/);
    expect(add).toMatch(/export function useAddAction\(/);
    expect(add).toContain('  useWriteHistory({');
    expect(add).not.toMatch(/<use[A-Z]/);
  });

  it('E3 P18-S136-CHAINWATCH: a ticked input read from a call\'s answer inside its chain is refused by name, not watched out of scope', () => {
    const standing = fileOf(tpl('members-area'), /components\/Standing\.tsx$/);
    const plan = planProject(parseProject(path.join(TEMPLATES, 'members-area'), catalog), new CatalogIndex(catalog));
    const notes = [...plan.byLegacyPath.values()].flatMap((p) => Object.values(p.dispositions)).filter((d) => d.kind === 'deferred' && d.reason.includes('P18-S136-CHAINWATCH'));
    expect(notes.length).toBeGreaterThan(0);
    expect(standing).not.toMatch(/useEffect\(\(\) => \{\n {4}if \(!tickedArrival\([^\n]*myStandingAnswer/);
  });

  it('E4 P18-S136-NESTEDROWS: a list of lists is `readonly (readonly number[])[]`', () => {
    const requests = fileOf(tpl('bot-garden'), /components\/Requests\.tsx$/);
    expect(requests).toContain('among: readonly (readonly number[])[];');
    expect(requests).not.toContain('readonly readonly');
  });

  it('E5 a placement that passes nothing calls the hook with nothing', () => {
    expect(fileOf(tpl('bot-garden'), /components\/Play\.tsx$/)).toContain('  usePickThing();');
  });

  it('E6 an Expression meets a typed prop as itself, said to be the prop\'s type (rocket-school\'s Editor and Play4)', () => {
    // nightbook (untracked here) has 71 of these and its pages' Gate; the page-group half is the-root-is-mounted's C5.
    expect(fileOf(tpl('rocket-school'), /components\/Editor\.tsx$/)).toContain('value={Which_pill_is_onOut as string | undefined}');
    expect(fileOf(tpl('rocket-school'), /components\/Play4\.tsx$/)).toContain('won={Something_to_cheerOut as boolean | undefined}');
  });
});

describe('§D the emitted app typechecks', () => {
  it('D1 the Hook Desk\'s app passes its own tsc', () => {
    expect(typecheckEmittedApp(app)).toEqual([]);
  });
});
