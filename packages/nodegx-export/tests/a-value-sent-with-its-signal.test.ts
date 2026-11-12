import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { Catalog, CatalogIndex, loadCatalog } from '../src/catalog';
import { ComponentPlan, planProject } from '../src/analyze/plan';
import { emitApp, EmittedApp } from '../src/emit/emitApp';
import { emitHtmlApp } from '../src/emit/html/emitHtml';
import { parseProject } from '../src/parse/parseProject';
import { htmlArm } from './helpers/export-html-arm';
import { Desk } from './helpers/root-desk';
import { writeSiblingDesk } from './helpers/sibling-desk';
import { typecheckEmittedApp } from './helpers/typecheckApp';

/**
 * A placed component's value, sent with its signal (P134 session 10, P134-HTX004-SELECTREFUSED).
 *
 * Before: a Set Variable (or a Global Store Set) whose Value came from a placed component's output was refused, "the value
 * wire has no statically known source" — 106 of the 180 template wires of that shape, and in todo-list every way the app
 * opens something (a task from the list, Today, Done, the log, a routine, an action's description). Neither export could
 * open a task.
 *
 * Now a chain reads the row the component lifts the value into, as an element's binding does; a component that does not
 * lift it refuses the read by name. A chain the same component's signal runs is run one commit late, from an effect: the
 * runtime hands the value before the signal, and the export's value arrives from the child's push effect after the press,
 * so a chain run in the press read the value before (`LiftedPulseChainPlan`).
 *
 * §A the Select Desk (the Sibling Desk, its Shower unwired, a Set Variable on the page fed by the Picker's `picked` and
 * `chose`) on the runtime's own nodes, the React export under StrictMode and the HTML export in jsdom, predicted in
 * `dev-docs/tasks/phase-134-the-app-in-plain-files/htx-004/EXPECTED-SELECT.md`. §B what is emitted. §C the plan, on the
 * desk and on todo-list. §D typecheck. The whole app in Chrome is `htx-004/drive.cjs` (all three arms equal at 12 steps).
 */

const catalog: Catalog = loadCatalog();
type Readings = string[][];

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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'select-desk-app-'));
  for (const [file, text] of Object.entries(app.files)) {
    fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    fs.writeFileSync(path.join(dir, file), text);
  }
  return dir;
};
const planOf = (dir: string, legacy: string): ComponentPlan =>
  planProject(parseProject(dir, catalog), new CatalogIndex(catalog)).byLegacyPath.get(legacy)!;

/** The Sibling Desk with its Shower unwired, and "Select" on the page: Value from `picker.picked`, Do from `picker.chose`. */
const selectDesk = (order: 'value first' | 'do first' | 'no do') => (d: Desk) => {
  const home = d.components['Pages/Home'];
  home.connections = home.connections.filter((c) => c.toId !== 'shower');
  home.nodes.push({ id: 'select', type: 'Set Variable', label: 'Select', parameters: { name: 'said' }, x: 700, y: 900 });
  const value = { fromId: 'picker', fromProperty: 'picked', toId: 'select', toProperty: 'value' };
  const go = { fromId: 'picker', fromProperty: 'chose', toId: 'select', toProperty: 'do' };
  home.connections.push(...(order === 'value first' ? [value, go] : order === 'do first' ? [go, value] : [value]));
};

const STEPS = ['Pick A', 'Pick B', 'Pick A', 'Choose C', 'Pick A'];
const VARIANTS = [
  { name: 'the desk', edit: selectDesk('value first') },
  { name: "Select's two wires the other way round", edit: selectDesk('do first') },
  { name: "the control: no wire into Select's Do", edit: selectDesk('no do') }
];
/** As EXPECTED-SELECT.md predicted it, before any arm ran. */
const BASE: Readings = [
  ['said nothing', 'the shower'],
  ['task a', 'the shower'],
  ['task b', 'the shower'],
  ['task a', 'the shower'],
  ['task a', 'the shower'],
  ['task a', 'the shower']
];
const CONTROL: Readings = BASE.map(() => ['said nothing', 'the shower']);

const desks = VARIANTS.map((v) => writeSiblingDesk(v.edit));
const apps = desks.map((d) => emitApp(parseProject(d.dir, catalog), catalog));
const runtime = childArm(
  'runtime-mounted-arm.js',
  desks.map((d) => ({ dir: d.dir, scenarios: [STEPS] }))
);
const react = childArm(
  'export-react-arm.js',
  apps.map((a) => ({ dir: writeApp(a), scenarios: [STEPS], settled: true }))
);

describe('§A the value the component sent with its signal, in every arm', () => {
  const html: Array<Readings | string> = [];
  const losses: string[][] = [];
  beforeAll(async () => {
    for (const d of desks) {
      const exported = emitHtmlApp(parseProject(d.dir, catalog), catalog);
      losses.push(exported.preflight.htmlLosses.map((l) => `${l.component} ${l.label ?? l.nodeId}: ${l.what}`));
      try {
        html.push((await htmlArm(exported.files, [STEPS]))[0]);
      } catch (e) {
        html.push(String(e));
      }
    }
  }, 300000);

  it('A1 the runtime reads what EXPECTED-SELECT.md says', () => {
    expect(runtime[0][0]).toEqual(BASE);
  });

  it('A2 the React export reads exactly what the runtime reads, the last Pick A included (the value before it was "task c")', () => {
    expect(react[0][0]).toEqual(runtime[0][0]);
  });

  it('A3 the HTML export reads exactly what the runtime reads, nothing left out', () => {
    expect(html[0]).toEqual(runtime[0][0]);
    expect(losses[0]).toEqual([]);
  });

  it("A4 Select's wires the other way round: the same readings in every arm", () => {
    expect(runtime[1][0]).toEqual(BASE);
    expect(react[1][0]).toEqual(BASE);
    expect(html[1]).toEqual(BASE);
  });

  it('A5 the control: with nothing into Do, every arm reads the load at every step', () => {
    expect(runtime[2][0]).toEqual(CONTROL);
    expect(react[2][0]).toEqual(CONTROL);
    expect(html[2]).toEqual(CONTROL);
  });
});

describe('§B what is emitted', () => {
  const home = apps[0].files['src/pages/Home.tsx'];

  it('B1 the value is lifted into a row the press does not read; the press counts', () => {
    expect(home).toContain('const [pickerPicked, setPickerPicked] = useState<string | undefined>();');
    expect(home).toContain('<Picker onPickedChanged={setPickerPicked} onChose={() => setPickerChoseSent((v) => v + 1)} />');
  });

  it('B2 the count is handed on one commit later, and the chain runs once per pulse on the handed-on count', () => {
    expect(home).toContain(['  useEffect(() => {', '    setPickerChoseDelivered(pickerChoseSent);', '  }, [pickerChoseSent]);'].join('\n'));
    expect(home).toContain(
      [
        '  useEffect(() => {',
        '    if (pickerChoseTaken.current === pickerChoseDelivered) return;',
        '    pickerChoseTaken.current = pickerChoseDelivered;',
        '    said.set(pickerPicked);',
        '  }, [pickerChoseDelivered]);'
      ].join('\n')
    );
  });
});

describe('§C the plan', () => {
  it('C1 the Set Variable is collapsed into the late chain, not refused', () => {
    const plan = planOf(desks[0].dir, '/Pages/Home');
    expect(plan.dispositions['select']).toEqual({ kind: 'collapsed', into: 'picker' });
    expect(plan.handlers['picker']?.['chose']).toEqual([{ kind: 'state-set', name: 'pickerChoseSent', op: 'inc' }]);
    expect(plan.liftedPulseChains.map((c) => [c.nodeId, c.port, c.sent.name, c.delivered.name, c.takenLocal])).toEqual([
      ['picker', 'chose', 'pickerChoseSent', 'pickerChoseDelivered', 'pickerChoseTaken']
    ]);
  });

  it('C2 a value its component does not lift: the read is refused by name, and no row or callback is left', () => {
    const dir = writeSiblingDesk((d) => {
      selectDesk('value first')(d);
      const picker = d.components['Components/Picker'];
      picker.connections = picker.connections.filter((c) => !(c.toId === 'pkOut' && c.toProperty === 'picked'));
      picker.nodes.push({ id: 'pkRand', type: 'Expression', label: 'Random', parameters: { expression: 'Math.random()' }, x: 700, y: 900 });
      picker.connections.push({ fromId: 'pkRand', fromProperty: 'result', toId: 'pkOut', toProperty: 'picked' });
    }).dir;
    const plan = planOf(dir, '/Pages/Home');
    expect(plan.dispositions['select']).toEqual({
      kind: 'deferred',
      to: 'EXP-003',
      reason: 'instance output "picked" is not lifted by /Components/Picker — its feed defers there'
    });
    expect(plan.stateVars.filter((v) => v.originNodeId === 'picker').map((v) => v.name)).toEqual([]);
    expect(plan.instanceLifted['picker'] ?? []).toEqual([]);
    expect(plan.liftedPulseChains).toEqual([]);
  });

  it('C3 a chain another trigger runs reads the row in the press, as it is (no late chain)', () => {
    const dir = writeSiblingDesk((d) => {
      selectDesk('no do')(d);
      d.components['Pages/Home'].connections.push({ fromId: 'chooseC', fromProperty: 'onClick', toId: 'select', toProperty: 'do' });
    }).dir;
    const plan = planOf(dir, '/Pages/Home');
    expect(plan.dispositions['select']).toEqual({ kind: 'collapsed', into: 'chooseC' });
    expect(plan.liftedPulseChains).toEqual([]);
  });

  it("C4 todo-list: the six ways it opens something compile, and the three whose component does not lift the value say whose it is", () => {
    const pp = planProject(parseProject(path.join(__dirname, '../../../templates/todo-list'), catalog), new CatalogIndex(catalog));
    const todo = pp.byLegacyPath.get('/Pages/Todo')!;
    for (const id of ['tdSelectFromList', 'tdSelectFromDone', 'tdSelectFromLog', 'tdSelectFromToday', 'tdSelectFromRoutines', 'tdOpenDesc', 'tdLayout']) {
      expect([id, todo.dispositions[id]?.kind]).toEqual([id, 'collapsed']);
    }
    expect(todo.liftedPulseChains.map((c) => `${c.nodeId}.${c.port}`).sort()).toEqual(
      ['tdDone.open', 'tdList.open', 'tdLog.open', 'tdNext.openDescription', 'tdProjectsPane.toggle', 'tdRoutineSummary.pickDay', 'tdRoutines.open', 'tdToday.open'].sort()
    );
    const reasonOf = (id: string) => (todo.dispositions[id] as { reason?: string }).reason;
    expect(reasonOf('tdSelectNewRoutine')).toBe('instance output "id" is not lifted by /Commands/Add routine — its feed defers there');
    expect(reasonOf('tdSelectFromProject')).toBe('instance output "openTaskId" is not lifted by /Projects/View — its feed defers there');
    expect((pp.byLegacyPath.get('/Projects/View')!.dispositions['pvEditLine'] as { reason?: string }).reason).toBe(
      'instance output "itemKey" is not lifted by /Projects/Money sheet — its feed defers there'
    );
  });
});

/**
 * §E P134-S10-SCREENREAD, found by the Chrome drive once §C4's "One pane or two?" compiled: the HTML printer had no read of
 * a Screen Resolution, so the Function's memo was not made and every Mounted reading it was left out, and a phone drew
 * the list and the open task side by side. Graded in Chrome by `htx-004/drive.cjs`; pinned here on todo-list's export.
 */
describe('§E todo-list in plain files reads the screen, and decides one pane or two', () => {
  const exported = emitHtmlApp(parseProject(path.join(__dirname, '../../../templates/todo-list'), catalog), catalog);
  const todo = exported.files['pages/Todo.js'] ?? '';

  it('E1 nothing on the Todo page is left out for reading the layout Function', () => {
    expect(exported.preflight.htmlLosses.filter((l) => l.component === 'Pages/Todo' && l.what.includes('jsfun-out'))).toEqual([]);
  });

  it("E2 the window's size is kept with the part, read again on every resize, and the listener goes with the part", () => {
    expect(todo).toContain('const howWideTheScreenIs = keep({ width: window.innerWidth, height: window.innerHeight, aspectRatio: window.innerWidth / window.innerHeight });');
    expect(todo).toContain("window.addEventListener('resize', howWideTheScreenIsResize);");
    expect(todo).toContain("window.removeEventListener('resize', howWideTheScreenIsResize);");
    expect(todo).toContain('width: howWideTheScreenIs.get().width');
  });
});

describe('§D the emitted apps typecheck', () => {
  it.each(VARIANTS.map((v, i) => [v.name, i] as const))('D %s', (_name, i) => {
    expect(typecheckEmittedApp(apps[i])).toEqual([]);
  });
});
