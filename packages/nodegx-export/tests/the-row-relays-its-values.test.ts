import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { Catalog, CatalogIndex, loadCatalog } from '../src/catalog';
import { ComponentPlan, planProject } from '../src/analyze/plan';
import { emitApp, EmittedApp } from '../src/emit/emitApp';
import { parseProject } from '../src/parse/parseProject';
import { writeRelayDesk } from './helpers/relay-desk';
import { Desk } from './helpers/root-desk';
import { typecheckEmittedApp } from './helpers/typecheckApp';

/**
 * The row relays its values (P18 session 130, BOARD lane 6, EXP-011 §99, the repeater's row relay, §31 and §96.5.1).
 *
 * Before: a repeater's relayed row value (`itemOutput-<name>`) into its component's value output was refused, "a repeater
 * relays its rows' outputs into … — which row fired is not statically expressible" (144 template wires; todo-list's Task
 * list and Today list into the Dialog flow among them), so the parent never received the row a person picked.
 *
 * Now, where the row's output is one of its inputs passed straight through, the component keeps a state row per relayed
 * value, and each row's relayed-signal callback writes it from what that row is handed, then runs the signal's chain:
 * the runtime's `itemOutputSignalTriggered` (`foreach.tsx`) copies the firing row's relayed outputs, then sends the
 * signal. The value output lifts the state row (CONTROLLED-STATE §4d), and a sibling the signal pulses reads it on time
 * (P18-S127-SIBLINGVALUE's delivered count).
 *
 * §A the emitted app rendered by real React under StrictMode (`helpers/export-react-arm.js`, settled) against the
 * runtime's own nodes, the viewer's own For Each among them (`helpers/runtime-mounted-arm.js`), press by press, over the
 * Relay Desk (`helpers/relay-desk.ts`) and its variants. §B what is emitted. §C the plan. §D typecheck.
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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'relay-desk-app-'));
  for (const [file, text] of Object.entries(app.files)) {
    fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    fs.writeFileSync(path.join(dir, file), text);
  }
  return dir;
};
const emitDir = (dir: string): EmittedApp => emitApp(parseProject(dir, catalog), catalog);
const planOf = (dir: string, legacy: string): ComponentPlan =>
  planProject(parseProject(dir, catalog), new CatalogIndex(catalog)).byLegacyPath.get(legacy)!;

/** Milk and Bread send a row's `open`, t1 and t2 its `pick`. */
const STEPS = ['Milk', 't2', 'Bread', 't1'];

const VARIANTS: Array<{ name: string; edit?: (d: Desk) => void }> = [
  { name: 'the desk' },
  {
    name: 'the List\'s relayed value wires listed before its signal wires',
    edit: (d) => {
      const list = d.components['Components/List'];
      const isValue = (p: string) => p.startsWith('itemOutput-');
      list.connections = [...list.connections.filter((c) => isValue(c.fromProperty)), ...list.connections.filter((c) => !isValue(c.fromProperty))];
    }
  },
  {
    name: 'the control: no relayed value wire',
    edit: (d) => {
      const list = d.components['Components/List'];
      list.connections = list.connections.filter((c) => !c.fromProperty.startsWith('itemOutput-'));
    }
  },
  {
    name: 'the row\'s label computed inside the row',
    edit: (d) => {
      const row = d.components['Components/Row'];
      row.nodes.push({ id: 'rwBang', type: 'Expression', label: 'Shout', parameters: { expression: "title + '!'" }, x: 700, y: 900 });
      row.connections = row.connections.filter((c) => !(c.fromId === 'rwIn' && c.fromProperty === 'title' && c.toId === 'rwOut'));
      row.connections.push(
        { fromId: 'rwIn', fromProperty: 'title', toId: 'rwBang', toProperty: 'title' },
        { fromId: 'rwBang', fromProperty: 'result', toId: 'rwOut', toProperty: 'label' }
      );
    }
  }
];

const L0 = ['said nothing', 'title nothing'];
/** As `s130-relay/EXPECTED.md` reads it. */
const BASE: Readings = [L0, ['t1', 'Milk'], ['t2', 'Bread'], ['t2', 'Bread'], ['t1', 'Milk']];
const RUNTIME_CONTROL: Readings = [L0, L0, L0, L0, L0];
/** The export's control: the Shower is handed `undefined` and its Set writes it; the Text prints '' (P18-S130-UNDEFTEXT). */
const EXPORT_CONTROL: Readings = [L0, ['', ''], ['', ''], ['', ''], ['', '']];
const RUNTIME_COMPUTED: Readings = [L0, ['t1', 'Milk!'], ['t2', 'Bread!'], ['t2', 'Bread!'], ['t1', 'Milk!']];
/**
 * P18 session 139 (P18-S139-STALEPULSE). Before: the computed label refused by name, the id still relayed, and the Shower's
 * `show` ran with its `named` missing (it printed ''). Now the List's `open` and `picked` into the Shower are refused by
 * name with it: the runtime hands the Shower the label with the pulse, and the export cannot.
 */
const EXPORT_COMPUTED: Readings = [L0, L0, L0, L0, L0];

const desks = VARIANTS.map((v) => writeRelayDesk(v.edit));
const apps = desks.map((d) => emitDir(d.dir));
const runtime = childArm('runtime-mounted-arm.js', desks.map((d) => ({ dir: d.dir, scenarios: [STEPS] })));
const exported = childArm('export-react-arm.js', apps.map((a) => ({ dir: writeApp(a), scenarios: [STEPS], settled: true })));

describe('§A the emitted app runs what the runtime runs, press by press', () => {
  it('A1 the desk: the runtime reads what EXPECTED.md says (the arm grades the runtime first, the viewer\'s own For Each)', () => {
    expect(runtime[0][0]).toEqual(BASE);
  });

  it('A2 the desk: the export reads exactly what the runtime reads', () => {
    expect(exported[0][0]).toEqual(runtime[0][0]);
  });

  it('A3 a row\'s open hands the sibling that row\'s id and its label, an output named apart from the input it passes', () => {
    expect(exported[0][0][1]).toEqual(['t1', 'Milk']);
    expect(exported[0][0][3]).toEqual(['t2', 'Bread']);
  });

  it('A4 the row\'s other relayed signal writes the relayed values too', () => {
    expect(exported[0][0][2]).toEqual(['t2', 'Bread']);
    expect(exported[0][0][4]).toEqual(['t1', 'Milk']);
  });

  it('A5 the value wires listed first: the same readings', () => {
    expect(runtime[1][0]).toEqual(BASE);
    expect(exported[1][0]).toEqual(runtime[1][0]);
  });

  it('A6 the control: with no relayed value wire the runtime never delivers one; the export writes undefined (P18-S130-UNDEFTEXT)', () => {
    expect(runtime[2][0]).toEqual(RUNTIME_CONTROL);
    expect(exported[2][0]).toEqual(EXPORT_CONTROL);
  });

  it('A7 a label computed in the row: the runtime relays it; the export refuses that value, and the pulse it goes with, by name (P18-S139-STALEPULSE)', () => {
    expect(runtime[3][0]).toEqual(RUNTIME_COMPUTED);
    expect(exported[3][0]).toEqual(EXPORT_COMPUTED);
  });
});

describe('§B what is emitted', () => {
  const list = apps[0].files['src/components/List.tsx'];
  const home = apps[0].files['src/pages/Home.tsx'];

  it('B1 one state row per relayed value, undefined until a row signal fires', () => {
    expect(list).toContain('const [relayedId, setRelayedId] = useState<string | undefined>();');
    expect(list).toContain('const [relayedLabel, setRelayedLabel] = useState<string | undefined>();');
  });

  it('B2 every relayed row signal writes every relayed value from its own row, before the signal\'s chain', () => {
    expect(list).toContain('onOpen={() => { setRelayedId(item.id); setRelayedLabel(item.title); onOpen?.(); }}');
    expect(list).toContain('onPick={() => { setRelayedId(item.id); setRelayedLabel(item.title); onPicked?.(); }}');
  });

  it('B3 the value outputs lift the state rows', () => {
    expect(list).toContain('onTaskIdChanged?.(relayedId);');
    expect(list).toContain('onTaskTitleChanged?.(relayedLabel);');
  });

  it('B4 the page binds the sibling to the lifted rows and hands its pulse on one commit late', () => {
    expect(home).toContain('which={taskId}');
    expect(home).toContain('named={taskTitle}');
    expect(home).toMatch(/show=\{\{ sent: \w+Delivered, taken: \w+ \}\}/);
  });
});

describe('§C the plan', () => {
  it('C1 the List\'s value outputs lift: its Component Outputs is static, nothing named dropped', () => {
    const list = planOf(desks[0].dir, '/Components/List');
    expect(list.dispositions['lsOut']).toEqual({ kind: 'static' });
    expect(list.rowRelays).toEqual([
      { repeaterId: 'lsEach', output: 'id', input: 'id', stateName: 'relayedId' },
      { repeaterId: 'lsEach', output: 'label', input: 'title', stateName: 'relayedLabel' }
    ]);
    expect(list.notes.filter((n) => n.includes('itemOutput-'))).toEqual([]);
  });

  it('C2 a row output computed inside the row is refused by name; the passed-through one still relays', () => {
    const list = planOf(desks[3].dir, '/Components/List');
    expect(list.notes).toContain(
      'wire lsEach:itemOutput-label->lsOut:taskTitle dropped: /Components/Row\'s row output "label" is computed inside the row (by Expression.result) — only a row input passed straight through is relayed in this slice'
    );
    expect(list.rowRelays.map((r) => r.output)).toEqual(['id']);
  });

  it('C3 two relays of one row value share one state row', () => {
    const dir = writeRelayDesk((d) => {
      const list = d.components['Components/List'];
      list.nodes.find((n) => n.id === 'lsOut')!.ports!.push({ name: 'sameId', plug: 'input', type: 'string' });
      list.connections.push({ fromId: 'lsEach', fromProperty: 'itemOutput-id', toId: 'lsOut', toProperty: 'sameId' });
    }).dir;
    expect(planOf(dir, '/Components/List').rowRelays.map((r) => r.stateName)).toEqual(['relayedId', 'relayedLabel']);
  });

  it('C4 a row output nothing in the row feeds, and one fed twice, are refused by name', () => {
    const dir = writeRelayDesk((d) => {
      const row = d.components['Components/Row'];
      row.connections = row.connections.filter((c) => !(c.toId === 'rwOut' && c.toProperty === 'id'));
      row.connections.push({ fromId: 'rwIn', fromProperty: 'id', toId: 'rwOut', toProperty: 'label' });
    }).dir;
    const notes = planOf(dir, '/Components/List').notes;
    expect(notes).toContain('wire lsEach:itemOutput-id->lsOut:taskId dropped: nothing in /Components/Row feeds the row output "id" that the repeater relays');
    expect(notes).toContain(
      'wire lsEach:itemOutput-label->lsOut:taskTitle dropped: 2 wires feed /Components/Row\'s row output "label" — last-writer-wins is not statically ordered'
    );
  });

  it('C5 a repeater that draws no rows in the export relays nothing: the lift is taken back and the value output says why', () => {
    const dir = writeRelayDesk((d) => {
      const list = d.components['Components/List'];
      list.connections = list.connections.filter((c) => c.toId !== 'lsEach' || c.toProperty !== 'items');
    }).dir;
    const list = planOf(dir, '/Components/List');
    const why = 'the repeater relaying "id" draws no rows in the export (its items are not fed by a query, a named array, or a statically-known list), so no row ever relays it';
    expect(list.rowRelays).toEqual([]);
    expect(list.notes).toContain(`wire lsEach:itemOutput-id->lsOut:taskId dropped: ${why}`);
    expect(list.dispositions['lsOut']).toEqual({ kind: 'deferred', to: 'EXP-003', reason: why });
    expect(list.liftedOutputProps).toEqual([]);
  });
});

describe('§D the emitted apps typecheck', () => {
  it.each(VARIANTS.map((v, i) => [v.name, i] as const))('D %s', (_name, i) => {
    expect(typecheckEmittedApp(apps[i])).toEqual([]);
  });
});
