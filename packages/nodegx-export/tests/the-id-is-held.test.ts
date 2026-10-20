import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { Catalog, CatalogIndex, loadCatalog } from '../src/catalog';
import { planProject } from '../src/analyze/plan';
import { emitApp, EmittedApp } from '../src/emit/emitApp';
import { parseProject } from '../src/parse/parseProject';
import { typecheckEmittedApp } from './helpers/typecheckApp';

/**
 * "Hold the id" (P18 session 122, BOARD lane 6). members-area's Announcement and Meeting and the Site Builder's PageEditor
 * hold the page's id in a Function run at mount: its `ready` fetches the Record, and its id output is read by nodes that
 * are not drawn: a second Function run from a button, a Set Record, a Query's parameter. HEAD refused the Function ("its
 * out-id output is consumed outside the Run chain by an unrendered sink") and the second Function ("JS-node chains are not
 * translated"), so the page fetched nothing.
 *
 * Now such a reader reads the Function's row (§4f): a render or effect read the state, a handler read the kept node's
 * values as its wires delivered them (`<fn>Node.delivered.x`), which are current within the click that ran it. A
 * materialized run keeps its node across runs (P18-S121-FRESHOUTPUTS), so a run that returns early leaves the id it held.
 *
 * Measured first (`dev-docs/tasks/phase-18-code-export-v2/s122-holdtheid/`, `EXPECTED.md` written before either arm ran):
 * the runtime's own Function, Variable and Set Variable over the variants below; a Set Variable fired by the click that
 * runs the Function reads the run's new value whichever wire comes first; the export's click runs in wire order, so the
 * reader's wire first is refused by name.
 *
 * §A the emitted page rendered by real React under StrictMode (`helpers/export-react-arm.js`) against the runtime's own
 * nodes (`helpers/runtime-ticked-arm.js`), press by press, over `fixtures/held-desk` and seven variants; two controls.
 * §B what is emitted. §C the refusals.
 */

const FIXTURE = path.join(__dirname, 'fixtures', 'held-desk');
const HOME_DIR = path.join(FIXTURE, 'components', 'Pages', 'Home');
const PAGE = 'src/pages/Home.tsx';
const catalog: Catalog = loadCatalog();

interface RawNode {
  id: string;
  type: string;
  label?: string;
  parent?: string;
  children?: string[];
  parameters: Record<string, unknown>;
  [k: string]: unknown;
}
interface RawWire {
  fromId: string;
  fromProperty: string;
  toId: string;
  toProperty: string;
}
interface Graph {
  nodes: RawNode[];
  connections: RawWire[];
}
const baseGraph: Graph = {
  nodes: JSON.parse(fs.readFileSync(path.join(HOME_DIR, 'nodes.json'), 'utf-8')).nodes,
  connections: JSON.parse(fs.readFileSync(path.join(HOME_DIR, 'connections.json'), 'utf-8')).connections
};

/** The fixture with its page edited, written to a temporary copy: both arms read the same graph. */
const fixtureWith = (edit?: (g: Graph) => void): { dir: string; graph: Graph } => {
  const graph: Graph = structuredClone(baseGraph);
  edit?.(graph);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'held-desk-'));
  fs.cpSync(FIXTURE, dir, { recursive: true });
  const home = path.join(dir, 'components', 'Pages', 'Home');
  const nodesDoc = JSON.parse(fs.readFileSync(path.join(home, 'nodes.json'), 'utf-8'));
  const wiresDoc = JSON.parse(fs.readFileSync(path.join(home, 'connections.json'), 'utf-8'));
  fs.writeFileSync(path.join(home, 'nodes.json'), JSON.stringify({ ...nodesDoc, nodes: graph.nodes }, null, 2));
  fs.writeFileSync(path.join(home, 'connections.json'), JSON.stringify({ ...wiresDoc, connections: graph.connections }, null, 2));
  return { dir, graph };
};
const emitDir = (dir: string): EmittedApp => emitApp(parseProject(dir, catalog), catalog);
const planOf = (dir: string) => planProject(parseProject(dir, catalog), new CatalogIndex(catalog)).byLegacyPath.get('/Pages/Home')!;
const nodeOf = (g: Graph, id: string): RawNode => g.nodes.find((n) => n.id === id)!;

// ---- the two arms -----------------------------------------------------------------------------------------------

const childArm = (helper: string, input: unknown): string[][][][] =>
  JSON.parse(
    execFileSync(process.execPath, [path.join(__dirname, 'helpers', helper)], {
      input: JSON.stringify(input),
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      maxBuffer: 16 * 1024 * 1024
    })
  );
/** The emitted app written out, with `PAGE` replaced where a row edits it. */
const writeApp = (app: EmittedApp, page?: string): string => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'held-desk-app-'));
  for (const [file, text] of Object.entries(app.files)) {
    fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    fs.writeFileSync(path.join(dir, file), file === PAGE && page !== undefined ? page : text);
  }
  return dir;
};

const STEPS = ['Remove', 'Pick b', 'Remove', 'Pick nothing', 'Remove'];

/** Remove also fires a Set Variable that reads the second Function's output, its wire after the Run's (or before). */
const sameClick = (order: 'after' | 'before') => (g: Graph) => {
  g.nodes.push({ id: 'echoSet', type: 'Set Variable', label: 'Echo', parameters: { name: 'echo' } });
  g.nodes.push({ id: 'echoRead', type: 'Variable2', label: 'Echo', parameters: { name: 'echo' } });
  g.connections = g.connections.filter((c) => c.fromId !== 'removedRead');
  g.connections.push({ fromId: 'echoRead', fromProperty: 'value', toId: 'removedText', toProperty: 'text' });
  g.connections.push({ fromId: 'confirmed', fromProperty: 'out-saying', toId: 'echoSet', toProperty: 'value' });
  const at = g.connections.findIndex((c) => c.fromId === 'removeBtn' && c.toId === 'confirmed');
  g.connections.splice(order === 'after' ? at + 1 : at, 0, { fromId: 'removeBtn', fromProperty: 'onClick', toId: 'echoSet', toProperty: 'do' });
};

const VARIANTS: Array<{ name: string; edit?: (g: Graph) => void }> = [
  { name: 'the fixture: Did Mount and a ticked Variable run it, Remove runs the second Function' },
  { name: "Hold the id's box unticked: Did Mount alone runs it", edit: (g) => (nodeOf(g, 'hold').parameters['runOnChange-in-id'] = false) },
  { name: 'no seed: Did Mount runs it over nothing', edit: (g) => delete nodeOf(g, 'idRead').parameters.value },
  {
    // P18-S121-FRESHOUTPUTS. Not pulsed: HEAD's materialized run took a fresh record per run, and "Pick nothing" lost b.
    name: 'no ready: a run that is not pulsed keeps its node too',
    edit: (g) => (g.connections = g.connections.filter((c) => !(c.fromId === 'hold' && c.toId === 'loadedSet')))
  },
  { name: "the second Function's box ticked: each new id runs it", edit: (g) => (nodeOf(g, 'confirmed').parameters['runOnChange-in-id'] = true) },
  { name: 'the same click: a Set Variable after the Run reads the run it follows', edit: sameClick('after') },
  {
    name: 'a Group above the Shell holds the page: the Group mounts, as the PageEditor does',
    edit: (g) => {
      for (const c of g.connections) if (c.fromProperty === 'didMount') c.fromId = 'shell';
    }
  }
];

describe('§A the export against the runtime, press by press', () => {
  const cases = VARIANTS.map((v) => {
    const { dir, graph } = fixtureWith(v.edit);
    return { ...v, graph, app: emitDir(dir) };
  });
  // One child process per arm for all variants. Caught here and rethrown in each row, so an arm that throws fails its
  // rows rather than the suite's collection (s120: that reads "0 total", like a broken compile).
  const armOrError = (run: () => string[][][][]): string[][][][] | Error => {
    try {
      return run();
    } catch (e) {
      return e as Error;
    }
  };
  const runtime = armOrError(() => childArm('runtime-ticked-arm.js', cases.map((c) => ({ ...c.graph, scenarios: [STEPS] }))));
  const exported = armOrError(() => childArm('export-react-arm.js', cases.map((c) => ({ dir: writeApp(c.app), scenarios: [STEPS] }))));
  const runtimeOf = (i: number): string[][] => {
    if (runtime instanceof Error) throw runtime;
    return runtime[i][0];
  };
  /** The three values: what Loaded, Saying and Removed show (the headings and labels are the same in both arms). */
  const values = (readings: string[][]) => readings.map((row) => [row[2], row[4], row[6]]);

  cases.forEach((c, i) => {
    test(`${c.name}: the same at load and after every press`, () => {
      if (exported instanceof Error) throw exported;
      expect(values(exported[i][0])).toEqual(values(runtimeOf(i)));
    });
  });

  test('the fixture reads what EXPECTED.md predicted for the runtime', () => {
    expect(values(runtimeOf(0))).toEqual([
      ['a', '', ''],
      ['a', 'removing a', 'a'],
      ['b', 'removing a', 'a'],
      ['b', 'removing b', 'b'],
      ['b', 'removing b', 'b'],
      ['b', 'removing b', 'b']
    ]);
  });

  test('a control: the click reading the state row, not the kept node, lags the same-click reader by one', () => {
    const k = cases.findIndex((c) => c.edit === VARIANTS[5].edit);
    const page = cases[k].app.files[PAGE];
    expect(page).toContain('echo.set(theIdAndTheGoAheadNode.delivered.saying)');
    const control = childArm('export-react-arm.js', [
      { dir: writeApp(cases[k].app, page.replace('echo.set(theIdAndTheGoAheadNode.delivered.saying)', 'echo.set(theIdAndTheGoAheadOut?.saying)')), scenarios: [STEPS] }
    ])[0][0];
    expect(values(control)).not.toEqual(values(runtimeOf(k)));
  });

  test('a control: a fresh node per run (HEAD\'s materialized run) loses b after "Pick nothing"', () => {
    const k = 3;
    const page = cases[k].app.files[PAGE];
    const kept = 'runFunction(Hold_the_id, { id: id.get() }, holdTheIdNode)';
    expect(page).toContain(kept);
    const fresh = page.split(kept).join("runFunction(Hold_the_id, { id: id.get() }, { signals: ['ready'], outputs: {}, delivered: {} })");
    const control = childArm('export-react-arm.js', [{ dir: writeApp(cases[k].app, fresh), scenarios: [STEPS] }])[0][0];
    // The reader reads nothing at all then: the kept node it reads is never the one that ran.
    expect(values(control)[5]).toEqual(['', 'removing nothing', '']);
    expect(values(runtimeOf(k))[5]).toEqual(['', 'removing b', 'b']);
  });

  test('every variant typechecks', () => {
    for (const c of cases) expect(typecheckEmittedApp(c.app)).toEqual([]);
  });
});

// ---- §B ---------------------------------------------------------------------------------------------------------

describe('§B what is emitted', () => {
  const { dir } = fixtureWith();
  const page = emitDir(dir).files[PAGE];
  const plan = planOf(dir);

  test('Hold the id and the second Function both export, and so do the Set Variables their signals drive', () => {
    for (const id of ['hold', 'confirmed', 'loadedSet', 'removedSet']) expect(plan.dispositions[id]?.kind).not.toBe('deferred');
  });

  test("the second Function's Run reads the id from Hold the id's kept node, as its wire delivered it", () => {
    expect(page).toContain('runFunction(The_id_and_the_go_ahead, { id: holdTheIdNode.delivered.id }, theIdAndTheGoAheadNode)');
  });

  test("Hold the id's runs keep its node and copy its outputs into its row", () => {
    expect(page).toContain('const holdTheIdNode = useRef(functionNode<NonNullable<Parameters<typeof Hold_the_id>[1]>>([\'ready\'])).current;');
    expect(page.split('setHoldTheIdOut({ ...holdTheIdRun.outputs });').length - 1).toBe(2);
  });

  test('a reader listed before its feeder still reads the row: the sink loop compiles a node\'s Function feeders first', () => {
    const { dir: reordered } = fixtureWith((g) => {
      const confirmed = g.nodes.splice(g.nodes.findIndex((n) => n.id === 'confirmed'), 1)[0];
      g.nodes.splice(g.nodes.findIndex((n) => n.id === 'hold'), 0, confirmed);
    });
    expect(planOf(reordered).dispositions.confirmed?.kind).not.toBe('deferred');
    expect(emitDir(reordered).files[PAGE]).toContain('{ id: holdTheIdNode.delivered.id }');
  });

  test("a ticked reader's effect is keyed on the field it reads, not on the row, which is a fresh copy every run", () => {
    const ticked = emitDir(fixtureWith((g) => (nodeOf(g, 'confirmed').parameters['runOnChange-in-id'] = true)).dir).files[PAGE];
    expect(ticked).toContain('}, [holdTheIdOut?.id]);');
    expect(ticked).not.toContain('}, [holdTheIdOut]);');
  });
});

// ---- §C ---------------------------------------------------------------------------------------------------------

describe('§C refused by name', () => {
  const notesOf = (edit: (g: Graph) => void) => emitDir(fixtureWith(edit).dir).notes;

  test("a reader whose Do the same click sends before the Run: the export's would read the run before", () => {
    expect(notesOf(sameClick('before'))).toContain(
      'Pages/Home: wire removeBtn:onClick->confirmed:run dropped: its out-saying output is read by Set Variable.value, whose do the same onClick sends before it runs this — the runtime\'s reader waits for the run\'s value, the export\'s would read the one before'
    );
  });

  test("a read on its own signal's target, where that signal's chain is refused, names the chain", () => {
    // ready into a Variable's Value is no action, so ready's chain is refused, and the Set Variable it fires reads the id
    // there. (Not into a Text: a Function's `out-ready` wired into a drawn Text reads as a drawn stray, as on HEAD.)
    const notes = notesOf((g) => {
      g.connections = g.connections.filter((c) => c.toId !== 'confirmed' && !(c.fromId === 'hold' && c.toProperty === 'do'));
      g.connections.push({ fromId: 'hold', fromProperty: 'out-ready', toId: 'removedRead', toProperty: 'value' });
      g.connections.push({ fromId: 'hold', fromProperty: 'out-ready', toId: 'loadedSet', toProperty: 'do' });
    });
    expect(notes.join('\n')).toContain(
      'its out-id output feeds Set Variable.value, which its "ready" signal runs, and that chain is not exported: its "ready" signal drives no translatable action'
    );
  });

  test('a reader that is not one that reads at its own trigger keeps the old refusal (an Expression)', () => {
    const notes = notesOf((g) => {
      g.nodes.push({ id: 'shout', type: 'Expression', label: 'Shout it', parameters: { expression: 'id + "!"' } });
      g.connections.push({ fromId: 'hold', fromProperty: 'out-id', toId: 'shout', toProperty: 'id' });
      g.connections.push({ fromId: 'shout', fromProperty: 'result', toId: 'sayingText', toProperty: 'text' });
      g.connections = g.connections.filter((c) => c.fromId !== 'confirmed' || c.fromProperty !== 'out-saying');
    });
    expect(notes.join('\n')).toContain('consumed outside the Run chain by an unrendered sink');
  });

  test("HEAD's materialized Function (its first reader drawn) keeps its export, whatever its other readers", () => {
    const { dir } = fixtureWith((g) => {
      g.connections.unshift({ fromId: 'hold', fromProperty: 'out-id', toId: 'sayingText', toProperty: 'text' });
      g.nodes.push({ id: 'shout', type: 'Expression', label: 'Shout it', parameters: { expression: 'id + "!"' } });
      g.connections.push({ fromId: 'hold', fromProperty: 'out-id', toId: 'shout', toProperty: 'id' });
    });
    expect(planOf(dir).dispositions.hold?.kind).not.toBe('deferred');
  });

  test('a reader listed before a feeder run by no element event and no Did Mount stays refused, as on HEAD', () => {
    // Its Run from a Variable's Changed: the feeder-first compile leaves it to the node order, where the reader comes first
    // and finds no row (P18-S122-DEADROW: a row whose run never attaches is never written).
    const { dir } = fixtureWith((g) => {
      for (const c of g.connections) if (c.fromProperty === 'didMount') Object.assign(c, { fromId: 'idRead', fromProperty: 'changed' });
      const confirmed = g.nodes.splice(g.nodes.findIndex((n) => n.id === 'confirmed'), 1)[0];
      g.nodes.splice(g.nodes.findIndex((n) => n.id === 'hold'), 0, confirmed);
    });
    expect(planOf(dir).dispositions.confirmed?.kind).toBe('deferred');
  });

  test("a feeder whose Run is refused names its reason at the reader", () => {
    const notes = notesOf((g) => (nodeOf(g, 'hold').parameters.functionScript = "Outputs.id = Noodl.Variables.id;\nOutputs.ready();"));
    expect(notes.join('\n')).toMatch(/input "id" is fed by JavaScriptFunction — the Function that feeds it is not exported: the script/);
  });
});
