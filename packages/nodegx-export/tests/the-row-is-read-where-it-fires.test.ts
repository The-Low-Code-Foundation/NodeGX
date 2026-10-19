import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { Catalog, CatalogIndex, loadCatalog } from '../src/catalog';
import { ComponentPlan, planProject } from '../src/analyze/plan';
import { emitApp, EmittedApp } from '../src/emit/emitApp';
import { parseProject } from '../src/parse/parseProject';
import { writeReadDesk } from './helpers/read-desk';
import { Desk, RawWire } from './helpers/root-desk';
import { typecheckEmittedApp } from './helpers/typecheckApp';

/**
 * The row is read where it fires (P18 session 131, BOARD lane 6, EXP-011 §100, §99.6.1).
 *
 * Before: a node in the component that holds a repeater, run by one of its rows' relayed signals, that read the
 * repeater's relayed row value (`itemOutput-<name>`) was refused, "the value wire has no statically known source" (20 Set
 * Variable Values and a Condition in the templates; rocket-school's Lists page `lsSetEditId`, so a list could not be
 * opened for editing).
 *
 * Now, inside a chain a row's relayed signal runs (directly, down a Done chain, in a Condition's arm), a read of that
 * repeater's relayed value is the firing row's: the runtime's `itemOutputSignalTriggered` (`foreach.tsx`) copies that
 * row's relayed outputs onto the repeater, then sends the signal. Each row's callback closes over its own item, so the
 * read prints as what the row is handed for the input the value passes through. Read anywhere else, it is the value of
 * whichever row fired last, which no row's closure holds: refused by name. A compile that read one is cached per scope.
 *
 * §A the emitted app rendered by real React under StrictMode (`helpers/export-react-arm.js`, settled) against the
 * runtime's own nodes, the viewer's own For Each among them (`helpers/runtime-mounted-arm.js`), press by press, over the
 * Read Desk (`helpers/read-desk.ts`) and its variants. §B what is emitted. §C the plan. §D typecheck.
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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'read-desk-app-'));
  for (const [file, text] of Object.entries(app.files)) {
    fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    fs.writeFileSync(path.join(dir, file), text);
  }
  return dir;
};
const emitDir = (dir: string): EmittedApp => emitApp(parseProject(dir, catalog), catalog);
const planOf = (dir: string, legacy: string): ComponentPlan =>
  planProject(parseProject(dir, catalog), new CatalogIndex(catalog)).byLegacyPath.get(legacy)!;

/** t1 and t2 send a row's `pick`, Milk and Bread its `open`, "Edit …" its `edit`. */
const STEPS = ['t2', 'Milk', 'Bread', 'Edit Milk', 't1', 'Edit Bread'];
const AGAIN_STEPS = ['Again', 't2', 'Milk', 'Again'];

/** An Again button in the List that also sends the `picked` Set's Do, its wire first or last. */
const withAgain = (first: boolean) => (d: Desk) => {
  const list = d.components['Components/List'];
  list.nodes.find((n) => n.id === 'lsRoot')!.children!.push('lsAgain');
  list.nodes.push({ id: 'lsAgain', type: 'net.noodl.controls.button', label: 'Again', parent: 'lsRoot', parameters: { label: 'Again' }, x: 100, y: 1400 });
  const wire: RawWire = { fromId: 'lsAgain', fromProperty: 'onClick', toId: 'lsSetPicked', toProperty: 'do' };
  list.connections = first ? [wire, ...list.connections] : [...list.connections, wire];
};

const VARIANTS: Array<{ name: string; steps: string[]; edit?: (d: Desk) => void }> = [
  { name: 'the desk', steps: STEPS },
  {
    name: 'the List\'s wires reversed',
    steps: STEPS,
    edit: (d) => {
      const list = d.components['Components/List'];
      list.connections = [...list.connections].reverse();
    }
  },
  {
    name: 'the List also lifts the row\'s id to a value output',
    steps: STEPS,
    edit: (d) => {
      const list = d.components['Components/List'];
      list.nodes.push({ id: 'lsOut', type: 'Component Outputs', label: 'Outputs', parameters: {}, ports: [{ name: 'lastId', plug: 'input', type: 'string' }], x: 700, y: 1400 });
      list.connections.push({ fromId: 'lsEach', fromProperty: 'itemOutput-id', toId: 'lsOut', toProperty: 'lastId' });
    }
  },
  { name: 'an Again button also sends the Set, its wire first', steps: AGAIN_STEPS, edit: withAgain(true) },
  { name: 'an Again button also sends the Set, its wire last', steps: AGAIN_STEPS, edit: withAgain(false) }
];

const L0 = ['picked nothing', 'named nothing', 'verdict nothing', 'editing nothing'];
/** As `s131-rowread/EXPECTED.md` reads it. */
const BASE: Readings = [
  L0,
  ['t2', 'Bread', 'verdict nothing', 'editing nothing'],
  ['t2', 'Bread', 'Milk', 'editing nothing'],
  ['t2', 'Bread', 'finished', 'editing nothing'],
  ['t2', 'Bread', 'finished', 't1'],
  ['t1', 'Milk', 'finished', 't1'],
  ['t1', 'Milk', 'finished', 't2']
];
const AGAIN_HEAD: Readings = [L0, L0, ['t2', 'Bread', 'verdict nothing', 'editing nothing'], ['t2', 'Bread', 'Milk', 'editing nothing']];
/** The runtime's Again reads the row that fired last (Milk's). */
const RUNTIME_AGAIN: Readings = [...AGAIN_HEAD, ['t1', 'Milk', 'Milk', 'editing nothing']];
/** The export refuses the Again wire by name: the press does nothing; the row's pick still runs. */
const EXPORT_AGAIN: Readings = [...AGAIN_HEAD, ['t2', 'Bread', 'Milk', 'editing nothing']];
const OUTSIDE = (output: string) =>
  `it reads the repeater lsEach's relayed row value "${output}" in a chain no row's relayed signal of that repeater starts in the export — there it is the value of whichever row fired last, which the export does not hold (in a row's chain it is the firing row's own)`;

const desks = VARIANTS.map((v) => writeReadDesk(v.edit));
const apps = desks.map((d) => emitDir(d.dir));
const runtime = childArm('runtime-mounted-arm.js', desks.map((d, i) => ({ dir: d.dir, scenarios: [VARIANTS[i].steps] })));
const exported = childArm('export-react-arm.js', apps.map((a, i) => ({ dir: writeApp(a), scenarios: [VARIANTS[i].steps], settled: true })));

describe('§A the emitted app runs what the runtime runs, press by press', () => {
  it('A1 the desk: the runtime reads what EXPECTED.md says (the arm grades the runtime first, the viewer\'s own For Each)', () => {
    expect(runtime[0][0]).toEqual(BASE);
  });

  it('A2 the desk: the export reads exactly what the runtime reads', () => {
    expect(exported[0][0]).toEqual(runtime[0][0]);
  });

  it('A3 a row\'s pick writes that row\'s id, and the Set\'s Done chain that row\'s label', () => {
    expect(exported[0][0][1].slice(0, 2)).toEqual(['t2', 'Bread']);
    expect(exported[0][0][5].slice(0, 2)).toEqual(['t1', 'Milk']);
  });

  it('A4 a row\'s open evaluates the Condition on that row\'s done, and the false arm writes that row\'s label', () => {
    expect(exported[0][0][2][2]).toBe('Milk');
    expect(exported[0][0][3][2]).toBe('finished');
  });

  it('A5 a row\'s edit sets the id to edit, and the placed Editor\'s fill reads it (the Lists Editor\'s edit path)', () => {
    expect(exported[0][0][4][3]).toBe('t1');
    expect(exported[0][0][6][3]).toBe('t2');
  });

  it('A6 the wires reversed: the same readings', () => {
    expect(runtime[1][0]).toEqual(BASE);
    expect(exported[1][0]).toEqual(runtime[1][0]);
  });

  it('A7 a relay lifted beside the reads: the same readings', () => {
    expect(runtime[2][0]).toEqual(BASE);
    expect(exported[2][0]).toEqual(runtime[2][0]);
  });

  it('A8 a read outside the row\'s chain, its wire first: the runtime reads the row that fired last; the export refuses that wire and the row\'s pick still runs', () => {
    expect(runtime[3][0]).toEqual(RUNTIME_AGAIN);
    expect(exported[3][0]).toEqual(EXPORT_AGAIN);
  });

  it('A9 the same with the Again wire last', () => {
    expect(runtime[4][0]).toEqual(RUNTIME_AGAIN);
    expect(exported[4][0]).toEqual(EXPORT_AGAIN);
  });
});

describe('§B what is emitted', () => {
  const list = apps[0].files['src/components/List.tsx'];

  it('B1 a row\'s pick writes from its own item, down the Done chain too', () => {
    expect(list).toContain('onPick={() => { picked.set(item.id); named.set(item.title); }}');
  });

  it('B2 a row\'s open tests its own item, and the arm writes from it', () => {
    expect(list).toContain('if (item.done) verdict.set(\'finished\'); else verdict.set(item.title);');
  });

  it('B3 a row\'s edit writes its own id, then pulses the placed Editor', () => {
    expect(list).toContain('onEdit={() => { editId.set(item.id); setEditorFillPulses((v) => v + 1); }}');
  });

  it('B4 beside a lifted relay: the state row first, then the chain reads the row\'s own field', () => {
    expect(apps[2].files['src/components/List.tsx']).toContain('onPick={() => { setRelayedId(item.id); picked.set(item.id); named.set(item.title); }}');
  });

  it('B5 the Again button prints no handler; the row\'s pick still does', () => {
    const again = apps[3].files['src/components/List.tsx'];
    expect(again).toContain('onPick={() => { picked.set(item.id); named.set(item.title); }}');
    expect(again).not.toMatch(/onClick=\{[^}]*picked\.set/);
  });
});

describe('§C the plan', () => {
  it('C1 every node the rows run is collapsed into the repeater; no wire out of a relayed value is dropped', () => {
    const list = planOf(desks[0].dir, '/Components/List');
    for (const id of ['lsSetPicked', 'lsSetNamed', 'lsIsDone', 'lsSetFinished', 'lsSetOpen', 'lsSetEditId']) {
      expect([id, list.dispositions[id]]).toEqual([id, { kind: 'collapsed', into: 'lsEach' }]);
    }
    expect(list.notes.filter((n) => n.includes('itemOutput-'))).toEqual([]);
  });

  it('C2 the read is the row\'s relayed value, by the input it passes through', () => {
    const pick = planOf(desks[0].dir, '/Components/List').handlers['lsEach']['itemOutputSignal-pick'];
    expect(JSON.stringify(pick)).toContain('{"kind":"row-relay","repeaterId":"lsEach","output":"label","input":"title","tsType":"string"}');
  });

  it('C3 a read outside the row\'s chain is refused by name, whichever wire is listed first; the row\'s chain keeps its read', () => {
    for (const i of [3, 4]) {
      const list = planOf(desks[i].dir, '/Components/List');
      expect(list.notes).toContain(`wire lsAgain:onClick->lsSetPicked:do dropped: ${OUTSIDE('id')}`);
      expect(JSON.stringify(list.handlers['lsEach']['itemOutputSignal-pick'])).toContain('"kind":"row-relay"');
      expect(list.handlers['lsAgain']).toBeUndefined();
    }
  });

  it('C4 a Set that reads nothing relayed, whose Done chain does, reached first from a button: the row\'s chain still carries the read', () => {
    const dir = writeReadDesk((d) => {
      const list = d.components['Components/List'];
      list.nodes.find((n) => n.id === 'lsRoot')!.children!.push('lsMarkBtn');
      list.nodes.push(
        { id: 'lsMarkBtn', type: 'net.noodl.controls.button', label: 'Mark', parent: 'lsRoot', parameters: { label: 'Mark' }, x: 100, y: 1500 },
        { id: 'lsMark', type: 'Set Variable', label: 'Mark it', parameters: { name: 'mark', value: 'marked' }, x: 700, y: 1500 }
      );
      list.connections = [
        { fromId: 'lsMarkBtn', fromProperty: 'onClick', toId: 'lsMark', toProperty: 'do' },
        ...list.connections.filter((c) => !(c.fromId === 'lsSetPicked' && c.fromProperty === 'done')),
        { fromId: 'lsEach', fromProperty: 'itemOutputSignal-pick', toId: 'lsMark', toProperty: 'do' },
        { fromId: 'lsMark', fromProperty: 'done', toId: 'lsSetNamed', toProperty: 'do' }
      ];
    }).dir;
    const list = planOf(dir, '/Components/List');
    const pick = JSON.stringify(list.handlers['lsEach']['itemOutputSignal-pick']);
    expect(pick).toContain('"variableName":"mark"');
    expect(pick).toContain('{"kind":"store-set","variableName":"named","expr":{"kind":"row-relay"');
    expect(JSON.stringify(list.handlers['lsMarkBtn']?.['onClick'] ?? [])).not.toContain('row-relay');
  });

  it('C5 a row output computed inside the row is refused by name inside the chain too', () => {
    const dir = writeReadDesk((d) => {
      const row = d.components['Components/Row'];
      row.nodes.push({ id: 'rwBang', type: 'Expression', label: 'Shout', parameters: { expression: "title + '!'" }, x: 700, y: 900 });
      row.connections = row.connections.filter((c) => !(c.fromId === 'rwIn' && c.fromProperty === 'title' && c.toId === 'rwOut'));
      row.connections.push(
        { fromId: 'rwIn', fromProperty: 'title', toId: 'rwBang', toProperty: 'title' },
        { fromId: 'rwBang', fromProperty: 'result', toId: 'rwOut', toProperty: 'label' }
      );
    }).dir;
    const list = planOf(dir, '/Components/List');
    const computed = '/Components/Row\'s row output "label" is computed inside the row (by Expression.result) — only a row input passed straight through is relayed in this slice';
    // The Condition whose false arm reads it, and the Set down the pick's Done chain (named by the sweep, asked in the
    // row's scope), each say the row's reason; the pick itself still writes the id.
    expect(list.dispositions['lsIsDone']).toEqual({ kind: 'deferred', to: 'EXP-003', reason: computed });
    expect(list.dispositions['lsSetNamed']).toEqual({ kind: 'deferred', to: 'EXP-003', reason: computed });
    expect(list.notes).toContain(`wire lsSetPicked:done->lsSetNamed:do dropped: ${computed}`);
    expect(list.dispositions['lsSetPicked']).toEqual({ kind: 'collapsed', into: 'lsEach' });
  });
});

describe('§C\' a repeater that draws no rows runs none of its rows\' chains (P18-S131-ROWLESSTRIGGER)', () => {
  it('C6 its rows\' chains are refused by name, the read among them, not counted collapsed into a repeater that prints no callback', () => {
    const dir = writeReadDesk((d) => {
      const list = d.components['Components/List'];
      list.connections = list.connections.filter((c) => c.toId !== 'lsEach' || c.toProperty !== 'items');
    }).dir;
    const list = planOf(dir, '/Components/List');
    const why = 'its trigger, "One row per task" (lsEach), is not drawn: it draws no rows in the export (its items are not fed by a query, a named array, or a statically-known list)';
    for (const id of ['lsSetPicked', 'lsIsDone', 'lsSetEditId']) {
      expect([id, list.dispositions[id]]).toEqual([id, { kind: 'deferred', to: 'EXP-003', reason: why }]);
    }
    expect(list.notes).toContain(`wire lsEach:itemOutputSignal-pick->lsSetPicked:do dropped: ${why}`);
  });

  it('C7 the control: a Set a row\'s chain shares with a drawn button stays collapsed, into the button', () => {
    const dir = writeReadDesk((d) => {
      withAgain(true)(d);
      const list = d.components['Components/List'];
      list.connections = list.connections.filter((c) => c.toId !== 'lsEach' || c.toProperty !== 'items');
      list.nodes.find((n) => n.id === 'lsSetFinished')!.parameters = { name: 'verdict', value: 'finished' };
      list.connections.push({ fromId: 'lsAgain', fromProperty: 'onClick', toId: 'lsSetFinished', toProperty: 'do' });
    }).dir;
    expect(planOf(dir, '/Components/List').dispositions['lsSetFinished']).toEqual({ kind: 'collapsed', into: 'lsAgain' });
  });
});

describe('§D the emitted apps typecheck', () => {
  it.each(VARIANTS.map((v, i) => [v.name, i] as const))('D %s', (_name, i) => {
    expect(typecheckEmittedApp(apps[i])).toEqual([]);
  });
});
