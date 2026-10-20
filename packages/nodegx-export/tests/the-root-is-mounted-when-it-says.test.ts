import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { Catalog, CatalogIndex, loadCatalog } from '../src/catalog';
import { ComponentPlan, planProject } from '../src/analyze/plan';
import { emitApp, EmittedApp } from '../src/emit/emitApp';
import { parseProject } from '../src/parse/parseProject';
import { Desk, writeDesk } from './helpers/root-desk';
import { typecheckEmittedApp } from './helpers/typecheckApp';

/**
 * The root is mounted when it says (P18 session 126, BOARD lane 6, EXP-011 §93): the Mounted wires the export did not
 * carry, the family with the most reach a test can grade against the runtime's own nodes.
 *
 * Before: a wire into a component root's Mounted was "a router concern" from every source, so a root authored Mounted
 * false was never drawn (todo-list's Note dialog and Money sheet, gram's Nav on four pages, bot-garden's Form, Pad and Win
 * card, rocket-school's Result and Teach card) and one authored true always was (planning's ten sheets and editors,
 * rocket-school's Choice row and eleven more), whatever the input said; their triggers were refused by name (EXP-011 §91).
 * A Did Mount under an element a value mounts was refused, and so was a field's announcement there.
 *
 * Now a root's Mounted binds as any element's does, a Page's alone staying the router's; the component returns `null`
 * while it says not to, after its hooks, so its state is kept across as the runtime keeps its nodes. A Did Mount under a
 * Mounted a value decides runs each time those values say mounted (the viewer sends it from `componentDidMount`, again
 * after every unmount); a field there announces the first time. And an element whose Mounted is authored true keeps it
 * while its source has no value (`Node.sendValue` never delivers `undefined`).
 *
 * §A the emitted app rendered by real React under StrictMode (`helpers/export-react-arm.js`) against the runtime's own
 * nodes rendered by real React (`helpers/runtime-mounted-arm.js`: the viewer's Group, Text, Button and Text Input, the
 * runtime's component instances), press by press, over the desk (`helpers/root-desk.ts`, built in a temporary folder so
 * the corpus golden does not move) and its variants, a control among them. §B what is emitted. §C the plan. §D typecheck.
 * The expected readings are `dev-docs/tasks/phase-18-code-export-v2/s126-mounted/EXPECTED.md`, written before the
 * variants ran.
 */

const catalog: Catalog = loadCatalog();
type Readings = string[][];

/**
 * One arm in a child process. An arm that throws (a press on a button the page does not draw) reads as one reading per
 * project holding the error, so the rows fail by name instead of the file failing to load.
 */
const childArm = (helper: string, input: Array<{ scenarios: string[][] }>): Readings[][] => {
  try {
    return JSON.parse(
      execFileSync(process.execPath, [path.join(__dirname, 'helpers', helper)], {
        input: JSON.stringify(input),
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        maxBuffer: 16 * 1024 * 1024
      })
    );
  } catch (e) {
    const said = String((e as { stderr?: unknown }).stderr ?? e).split('\n')[0];
    return input.map((project) => project.scenarios.map(() => [[`the ${helper} arm threw: ${said}`]]));
  }
};
const writeApp = (app: EmittedApp): string => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'root-desk-app-'));
  for (const [file, text] of Object.entries(app.files)) {
    fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    fs.writeFileSync(path.join(dir, file), text);
  }
  return dir;
};
const emitDir = (dir: string): EmittedApp => emitApp(parseProject(dir, catalog), catalog);
const plansOf = (dir: string) => planProject(parseProject(dir, catalog), new CatalogIndex(catalog));
const planOf = (dir: string, legacy: string): ComponentPlan => plansOf(dir).byLegacyPath.get(legacy)!;

const STEPS = ['Open', 'Inside', 'Close', 'Reset', 'Open', 'Close'];

const VARIANTS: Array<{ name: string; edit?: (d: Desk) => void }> = [
  { name: 'the desk' },
  {
    name: 'the Mounted wire on an element inside the root',
    edit: (d) => {
      const sheet = d.components['Components/Sheet'];
      const root = sheet.nodes.find((n) => n.id === 'shRoot')!;
      const inside = root.children!;
      root.children = ['shBody'];
      root.parameters = {};
      sheet.nodes.push({ id: 'shBody', type: 'Group', label: 'Sheet body', parent: 'shRoot', children: inside, parameters: { mounted: false } });
      for (const id of inside) sheet.nodes.find((n) => n.id === id)!.parent = 'shBody';
      sheet.connections.find((c) => c.toId === 'shRoot' && c.toProperty === 'mounted')!.toId = 'shBody';
    }
  },
  {
    name: 'the control: no root and no element has a Mounted wire',
    edit: (d) => {
      for (const graph of Object.values(d.components)) graph.connections = graph.connections.filter((c) => c.toProperty !== 'mounted');
    }
  }
];

const BASE: Readings = [
  ['said nothing', 'seen nothing', 'named nobody', 'the flag box', 'the card'],
  ['said nothing', 'seen the sheet', 'named Ann', 'the flag box', 'the sheet', 'the card', 'the gate'],
  ['said inside', 'seen the sheet', 'named Ann', 'the flag box', 'the sheet', 'the card', 'the gate'],
  ['said inside', 'seen the sheet', 'named Ann', 'the flag box', 'the card'],
  ['said inside', 'seen nothing', 'named Ann', 'the flag box', 'the card'],
  ['said inside', 'seen the sheet', 'named Ann', 'the flag box', 'the sheet', 'the card', 'the gate'],
  ['said inside', 'seen the sheet', 'named Ann', 'the flag box', 'the card']
];
const CONTROL_STEPS = ['Open', 'Close', 'Reset', 'Open'];
const CONTROL: Readings = Array.from({ length: CONTROL_STEPS.length + 1 }, () => [
  'said nothing',
  'seen nothing',
  'named nobody',
  'the flag box',
  'the card',
  'the gate'
]);

const desks = VARIANTS.map((v) => writeDesk(v.edit));
const apps = desks.map((d) => emitDir(d.dir));
const stepsOf = (i: number) => (i === 2 ? CONTROL_STEPS : STEPS);
const runtime = childArm(
  'runtime-mounted-arm.js',
  desks.map((d, i) => ({ dir: d.dir, scenarios: [stepsOf(i)] }))
);
const exported = childArm(
  'export-react-arm.js',
  apps.map((a, i) => ({ dir: writeApp(a), scenarios: [stepsOf(i)] }))
);

describe('§A the emitted app draws what the runtime draws, press by press', () => {
  it('A1 the desk: the runtime reads what EXPECTED.md says (the arm grades the runtime first)', () => {
    expect(runtime[0][0]).toEqual(BASE);
  });

  it('A2 the desk: the export reads exactly what the runtime reads', () => {
    expect(exported[0][0]).toEqual(runtime[0][0]);
  });

  it('A3 a root mounted from an input: drawn when it says, its button runs, its Did Mount runs on every mount, its field announces', () => {
    const [load, open, inside, close, reset, again] = exported[0][0];
    expect(load).not.toContain('the sheet');
    expect(open).toContain('the sheet');
    expect(open).toContain('seen the sheet');
    expect(open).toContain('named Ann');
    expect(inside).toContain('said inside');
    expect(close).not.toContain('the sheet');
    expect(reset).toContain('seen nothing');
    expect(again).toContain('seen the sheet');
  });

  it('A4 a root authored Mounted true and an element on the page, wired from nothing yet: drawn, as the runtime draws them', () => {
    for (const reading of exported[0][0]) {
      expect(reading).toContain('the card');
      expect(reading).toContain('the flag box');
    }
  });

  it('A5 a root authored Mounted false with nothing passed is never drawn; a root an Expression mounts is drawn when it says', () => {
    for (const reading of exported[0][0]) expect(reading).not.toContain('the ghost');
    expect(exported[0][0].map((r) => r.includes('the gate'))).toEqual([false, true, true, false, false, true, false]);
  });

  it('A6 the Mounted wire on an element inside the root: the same readings, the Did Mount and the field gated by it', () => {
    expect(runtime[1][0]).toEqual(BASE);
    expect(exported[1][0]).toEqual(runtime[1][0]);
  });

  it('A7 the control: with no Mounted wire, both arms read the authored state at every step', () => {
    expect(runtime[2][0]).toEqual(CONTROL);
    expect(exported[2][0]).toEqual(CONTROL);
  });
});

describe('§B what is emitted', () => {
  const sheet = apps[0].files['src/components/Sheet.tsx'];
  const card = apps[0].files['src/components/Card.tsx'];
  const gate = apps[0].files['src/components/Gate.tsx'];
  const home = apps[0].files['src/pages/Home.tsx'];

  it('B1 the root returns null while it says not to, after every hook, and draws its element otherwise', () => {
    const guard = sheet.indexOf('  if (!shown) return null;');
    expect(guard).toBeGreaterThan(0);
    expect(sheet.indexOf('useEffect(')).toBeLessThan(guard);
    expect(sheet.slice(guard)).toContain('<button onClick={() => said.set(');
    expect(sheet).not.toContain('router concern');
    expect(sheet).not.toContain('removed from the tree');
  });

  it('B2 an authored-true root keeps its Mounted while its input has no value; an Expression answer is no such source', () => {
    expect(card).toContain('  if (!(shown === undefined || shown)) return null;');
    expect(gate).toContain('  if (!Is_it_openOut) return null;');
    expect(home).toContain('{(flagValue === undefined || !!flagValue) && (');
  });

  it('B3 the Did Mount under the root runs when the root says, and again after an unmount', () => {
    expect(sheet).toContain('    if (!shown) {\n      mounted.current = false;\n      return;\n    }');
    expect(sheet).toContain('  }, [shown]);');
  });

  it('B4 the field under the root announces the first time it mounts', () => {
    expect(sheet).toMatch(/if \(announced\.current\) return;\n {4}if \(!shown\) return;\n {4}announced\.current = true;/);
  });
});

describe('§C the plan', () => {
  const plan = planOf(desks[0].dir, '/Components/Sheet');

  it('C1 the root is bound to its input, and its triggers keep their chains', () => {
    expect(plan.bindings['shRoot']?.['mounted']).toEqual({ kind: 'prop', name: 'shown' });
    expect(plan.dispositions['shSay']).toEqual({ kind: 'collapsed', into: 'shBtn' });
    expect(plan.dispositions['shSeen']).toEqual({ kind: 'collapsed', into: 'shMount' });
    expect(plan.fieldMounts.map((m) => [m.inputId, m.gates])).toEqual([['shField', ['shRoot']]]);
  });

  it('C2 an Expression into a root is bound and collapsed, not refused', () => {
    const gatePlan = planOf(desks[0].dir, '/Components/Gate');
    expect(gatePlan.bindings['gtRoot']?.['mounted']?.kind).toBe('computed');
    expect(gatePlan.dispositions['gtExpr']?.kind).toBe('collapsed');
  });

  it('C3 a Page\'s Mounted is still the router\'s: the wire is dropped, named', () => {
    const page = writeDesk((d) =>
      d.components['Pages/Home'].connections.push({ fromId: 'openVar', fromProperty: 'value', toId: 'page', toProperty: 'mounted' })
    );
    const home = planOf(page.dir, '/Pages/Home');
    expect(home.notes).toContain('wire openVar:value->page:mounted dropped: a mounted wire into the component root is a router concern — not translated in this slice');
    expect(home.bindings['page']?.['mounted']).toBeUndefined();
  });

  it('C4 the authored Mounted false root with nothing passed: bound, never refused (drawn when a value arrives)', () => {
    const ghost = planOf(desks[0].dir, '/Components/Ghost');
    expect(ghost.bindings['ghRoot']?.['mounted']).toEqual({ kind: 'prop', name: 'shown' });
    expect(Object.values(ghost.dispositions).filter((d) => d.kind === 'deferred')).toEqual([]);
  });
});

describe('§C\' the one Mounted still not carried: a page\'s own Group', () => {
  it('C5 a Did Mount in a page\'s sole Group mounted by a value: refused by name in the plan and the emitter alike', () => {
    const wired = writeDesk((d) => {
      const home = d.components['Pages/Home'];
      home.connections.push({ fromId: 'openVar', fromProperty: 'value', toId: 'shell', toProperty: 'mounted' });
      home.nodes.push({ id: 'pageSeen', type: 'Set Variable', label: 'Say the page', parameters: { name: 'seen', value: 'seen the page' } });
      home.connections.push({ fromId: 'flagBox', fromProperty: 'didMount', toId: 'pageSeen', toProperty: 'do' });
    });
    const home = planOf(wired.dir, '/Pages/Home');
    const reason = home.dispositions['pageSeen'];
    expect(reason).toEqual({
      kind: 'deferred',
      to: 'EXP-003',
      reason:
        'its trigger, the Did Mount of "Flag box" (flagBox), is not run: the page\'s own Group, "Shell" (shell) is mounted by a value the export does not carry (it draws the page), so when it mounts is not known here'
    });
    expect(emitDir(wired.dir).files['src/pages/Home.tsx']).not.toContain('Flag box — Did Mount');
  });
});

describe('§D the emitted apps typecheck', () => {
  it.each(VARIANTS.map((v, i) => [v.name, i] as const))('D %s', (_name, i) => {
    expect(typecheckEmittedApp(apps[i])).toEqual([]);
  });
});
