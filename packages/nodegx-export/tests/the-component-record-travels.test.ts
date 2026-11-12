import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { Catalog, CatalogIndex, loadCatalog } from '../src/catalog';
import { ComponentPlan, planProject } from '../src/analyze/plan';
import { jsComponentUseOf, jsHostTraitsOf, jsPurityDefer } from '../src/analyze/jsfun';
import { COMPONENT_SCOPE_LIB_PATH } from '../src/emit/componentScopeLib';
import { emitApp, EmittedApp } from '../src/emit/emitApp';
import { parseProject } from '../src/parse/parseProject';
import { ADD_SCRIPT, READ_SCRIPT, writeComponentDesk } from './helpers/component-desk';
import { writeHostDesk } from './helpers/host-desk';
import { typecheckEmittedApp } from './helpers/typecheckApp';

/**
 * The component's record travels (P18 session 135, BOARD lane 6, EXP-020 slice 2).
 *
 * Before: a Function whose body read `Component.Object` was refused whole ("the script reads the Component scope — the
 * component-record tier"), and EXP-020 §5 and EXP-021 §5 each sent it to the other. Measured first (`s135-componentrecord/`):
 * it was the only gate left on gram's ten page loaders and marketplace's two — every Noodl member they read travels since
 * session 134 — and every template use is the instance's private scratch record (`var keep = Component.Object; …
 * keep.get('links') … keep.set('links', links)`), in a component with no Component Object node.
 *
 * Now `Component.Object` is a host trait: the body runs once per trigger with a kept node, the component keeps one scope
 * per mount (`src/lib/componentScope.ts`, the runtime's Model transcribed: its methods and its proxy), every kept node
 * carries it, and `runFunction` hands it to the body as the runtime hands it the fourth parameter. Beside a Component
 * Object family node the record is `useComponentObject`'s (EXP-011 §60) and the body is refused by name; any other
 * member of the scope is refused by its name.
 *
 * §A the emitted app rendered by real React under StrictMode (`helpers/export-react-arm.js`, settled) against the
 * runtime's own Function, Button, Group, Text and component instances (`helpers/runtime-mounted-arm.js`), step by step,
 * over the Component Desk (`helpers/component-desk.ts`), predicted first in `s135-componentrecord/EXPECTED.md`. §B what
 * is emitted. §C the classifier and the plan. §D typecheck.
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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'component-desk-app-'));
  for (const [file, text] of Object.entries(app.files)) {
    fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    fs.writeFileSync(path.join(dir, file), text);
  }
  return dir;
};
const emitDir = (dir: string): EmittedApp => emitApp(parseProject(dir, catalog), catalog);
const planOf = (dir: string, legacy: string): ComponentPlan =>
  planProject(parseProject(dir, catalog), new CatalogIndex(catalog)).byLegacyPath.get(legacy)!;

const STEPS = ['Read B', 'Add A', 'Add A', 'Add B', 'Read A', 'Read B', 'Toggle', 'Add C', 'Toggle', 'Toggle', 'Add C', 'Read C'];

const NN = 'n nothing';
const GN = 'got nothing';
const EMPTY = 'got|||||kept|state';
const got = (n: number) => `got|${n}|${n}|w${n}|n,word|kept|state`;
/** As `s135-componentrecord/EXPECTED.md` predicted it, before either arm ran: A.n · A.got · B.n · B.got [· C.n · C.got]. */
const BASE: Readings = [
  [NN, GN, NN, GN],
  [NN, GN, NN, EMPTY],
  ['1', GN, NN, EMPTY],
  ['2', GN, NN, EMPTY],
  ['2', GN, '1', EMPTY],
  ['2', got(2), '1', EMPTY],
  ['2', got(2), '1', got(1)],
  ['2', got(2), '1', got(1), NN, GN],
  ['2', got(2), '1', got(1), '1', GN],
  ['2', got(2), '1', got(1)],
  ['2', got(2), '1', got(1), '1', GN],
  ['2', got(2), '1', got(1), '2', GN],
  ['2', got(2), '1', got(1), '2', got(2)]
];

const desk = writeComponentDesk();
const app = emitDir(desk.dir);
const runtime = childArm('runtime-mounted-arm.js', [{ dir: desk.dir, scenarios: [STEPS] }]);
const exported = childArm('export-react-arm.js', [{ dir: writeApp(app), scenarios: [STEPS], settled: true }]);

/** P18-S132-AUTHOREDTEXT (low, open): a wired Text's own text, which the runtime shows until the wire delivers. */
const withoutAuthored = (rows: Readings): Readings => rows.map((r) => r.map((c) => (c === NN || c === GN ? '' : c)));

describe('§A the emitted app keeps what the runtime keeps, step by step', () => {
  it('A1 the desk: the runtime reads what EXPECTED.md says (the arm grades the runtime first)', () => {
    expect(runtime[0][0]).toEqual(BASE);
  });

  it('A2 the desk: the export reads exactly what the runtime reads until C is hidden, but the authored texts', () => {
    expect(exported[0][0].slice(0, 10)).toEqual(withoutAuthored(runtime[0][0].slice(0, 10)));
  });

  it('A3 the record boots empty, and its id is read-only and is the component state\'s', () => {
    expect(exported[0][0][1][3]).toBe(EMPTY);
  });

  it('A4 one record per instance, shared by its Functions: Read reads what Add wrote, every way the record answers', () => {
    expect(exported[0][0][5][1]).toBe(got(2));
  });

  it('A5 two placements keep two records', () => {
    expect(exported[0][0][6]).toEqual(['2', got(2), '1', got(1)]);
  });

  it('A6 P18-S135-HIDDENINSTANCE, pinned by name: a placement the runtime hides keeps its record there; the export mounts a new one', () => {
    // When the bug is fixed this row flips to a plain equality and A2's slice goes.
    expect(runtime[0][0].slice(10).map((r) => r.slice(4))).toEqual([['1', GN], ['2', GN], ['2', got(2)]]);
    expect(exported[0][0].slice(10).map((r) => r.slice(4))).toEqual([['', ''], ['1', ''], ['1', got(1)]]);
    expect(exported[0][0].slice(10).map((r) => r.slice(0, 4))).toEqual(runtime[0][0].slice(10).map((r) => r.slice(0, 4)));
  });
});

describe('§B what is emitted', () => {
  const addFile = Object.keys(app.files).find((f) => /functions\/.*Add_one\.ts$/.test(f))!;
  const readFile = Object.keys(app.files).find((f) => /functions\/.*Read_it\.ts$/.test(f))!;
  const keep = Object.entries(app.files).find(([f]) => /components\/Keep\.tsx$/.test(f))![1];
  const home = Object.entries(app.files).find(([f]) => /pages\/Home\.tsx$/.test(f))![1];

  it('B1 each body is verbatim and takes the component\'s scope fourth, after an unused `_self`', () => {
    for (const [file, script] of [[addFile, ADD_SCRIPT], [readFile, READ_SCRIPT]]) {
      const text = app.files[file];
      expect(text).toContain(script);
      expect(text).toMatch(/, _self: Record<string, any> = \{\}, Component\?: ComponentScope\): /);
      expect(text).toContain("import type { ComponentScope } from '../../../lib/componentScope';");
      expect(text).not.toContain('.call(self)');
    }
  });

  it('B2 the component keeps one scope per mount and hands it to each kept node', () => {
    expect(keep.match(/useState\(createComponentScope\)/g)).toHaveLength(1);
    expect(keep).toContain('const [componentScope] = useState(createComponentScope);');
    expect(keep).toMatch(/const addOneNode = useRef\(functionNode<[^\n]*>\(\[\], componentScope\)\)\.current;/);
    expect(keep).toMatch(/const readItNode = useRef\(functionNode<[^\n]*>\(\[\], componentScope\)\)\.current;/);
    expect(keep).toContain("import { createComponentScope } from '../lib/componentScope';");
  });

  it('B3 a component whose Functions do not read the record keeps none (the Toggle keeps `this` only)', () => {
    expect(home).not.toContain('createComponentScope');
    expect(home).toMatch(/const theToggleNode = useRef\(functionNode<[^\n]*>\(\[\]\)\)\.current;/);
  });

  it('B4 the library is the runtime\'s record: its proxy, its read-only id, its spelling of the instance id', () => {
    const lib = app.files[COMPONENT_SCOPE_LIB_PATH];
    expect(lib).toContain("    if (typeof member === 'function') return member.bind(target);");
    expect(lib).toContain('    else return target.get(prop as string);');
    expect(lib).toContain('Noodl.Object warning: id is readonly');
    expect(lib).toContain("  record.id = 'componentState' + '__$ndl_componentInstaceId' + scopeCounter;");
  });

  it('B5 the library is emitted only where a Function reads the record', () => {
    expect(emitDir(writeHostDesk().dir).files[COMPONENT_SCOPE_LIB_PATH]).toBeUndefined();
  });
});

describe('§C the classifier and the plan', () => {
  it('C1 `Component.Object` is read every way the runtime\'s record is, handed on included', () => {
    expect(jsComponentUseOf(ADD_SCRIPT)).toEqual({ reads: true });
    expect(jsComponentUseOf(READ_SCRIPT)).toEqual({ reads: true });
    expect(jsComponentUseOf('var o = Component.Object; helper(o); Object.keys(Component.Object);')).toEqual({ reads: true });
    expect(jsComponentUseOf("Outputs.x = a.Component.y; Outputs.y = 'Component.RepeaterObject'; // Component.ParentObject")).toEqual({ reads: false });
  });

  it('C2 the rest of the scope is refused by its name', () => {
    const said = (body: string) => jsComponentUseOf(body).refusal;
    expect(said('Outputs.x = Component.RepeaterObject.id;')).toMatch(/^reads `Component\.RepeaterObject` — the export's Component scope carries Component\.Object/);
    expect(said('Component.ParentObject.set("x", 1);')).toContain('reads `Component.ParentObject`');
    expect(said('Component.UpdateFilter = function () {};')).toContain('reads `Component.UpdateFilter`');
    expect(said('Component.UpdateFilter();')).toContain('reads `Component.UpdateFilter`');
    expect(said('Component.Object = {};')).toContain('reads `Component.Object`');
    expect(said('Outputs.x = Component[k];')).toContain('reads `Component[…]`');
    expect(said('var c = Component;')).toContain('reads `Component`');
    expect(jsPurityDefer('function', 'Component.Object.set("x", 1); Outputs.y = Component.RepeaterObject;')).toContain('reads `Component.RepeaterObject`');
  });

  it('C3 it is a host trait for a Function and still a gate for an Expression', () => {
    expect(jsHostTraitsOf(ADD_SCRIPT)).toEqual(["reads its component's record (Component.Object)"]);
    expect(jsPurityDefer('function', ADD_SCRIPT)).toBeNull();
    expect(jsPurityDefer('expression', 'Component.Object.n')).toContain('reads the Component scope');
  });

  it('C4 the plan marks the body, keeps the node, and collapses it', () => {
    const keepPlan = planOf(desk.dir, '/Components/Keep');
    const add = Object.values(keepPlan.jsFunctions).find((f) => f.fnName === 'Add_one')!;
    expect(add.component).toBe(true);
    expect(add.pulsed).toBe(true);
    expect(add.host).toEqual(["reads its component's record (Component.Object)"]);
    expect(keepPlan.dispositions['add']).toMatchObject({ kind: 'collapsed' });
    expect(keepPlan.dispositions['read']).toMatchObject({ kind: 'collapsed' });
    const toggle = Object.values(planOf(desk.dir, '/Pages/Home').jsFunctions).find((f) => f.fnName === 'The_toggle')!;
    expect(toggle.component).toBeUndefined();
  });

  it('C6 with no Run wire the body is kept all the same, and runs at load and on its inputs\' arrival (the trait, not its outputs, keeps it)', () => {
    const { dir } = writeComponentDesk((d) => {
      const kp = d.components['Components/Keep'];
      kp.connections = kp.connections.filter((c) => !(c.toId === 'add' && c.toProperty === 'run') && !(c.fromId === 'add'));
    });
    const keepPlan = planOf(dir, '/Components/Keep');
    const add = Object.values(keepPlan.jsFunctions).find((f) => f.fnName === 'Add_one')!;
    expect(add.mode).toBe('reactive');
    expect(add.pulsed).toBe(true);
    expect(keepPlan.tickedRuns).toEqual([expect.objectContaining({ nodeId: 'add', atLoad: true })]);
  });

  it('C5 beside a Component Object family node the body is refused, naming the node', () => {
    for (const type of ['net.noodl.ComponentObject', 'net.noodl.SetComponentObjectProperties']) {
      const { dir } = writeComponentDesk((d) => {
        d.components['Components/Keep'].nodes.push({ id: 'kpObject', type, label: 'The record', parameters: {}, x: 600, y: 600 });
      });
      expect(planOf(dir, '/Components/Keep').dispositions['add']).toMatchObject({
        kind: 'deferred',
        reason: `the script reads \`Component.Object\` in a component with a ${type} node — the export's record for that node is not yet the script's (EXP-020)`
      });
    }
  });
});

describe('§D the emitted app typechecks', () => {
  it('D1 the Component Desk\'s app passes its own tsc', () => {
    expect(typecheckEmittedApp(app)).toEqual([]);
  });
});
