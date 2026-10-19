import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { Catalog, CatalogIndex, loadCatalog } from '../src/catalog';
import { planProject } from '../src/analyze/plan';
import { emitApp, EmittedApp } from '../src/emit/emitApp';
import { FUNCTION_RUN_LIB_PATH, functionRunLibSource } from '../src/emit/functionRunLib';
import { parseProject } from '../src/parse/parseProject';
import { typecheckEmittedApp } from './helpers/typecheckApp';

/**
 * P18-S119-TICKEDRUN — a Function whose Run is wired still runs when a value input whose Run On Value Change box is ticked
 * gets a new value (NDA-017 §2): it sends its own signals and writes its outputs, and never Done. HEAD ran it on Run alone,
 * and refused its signals by name. And P18-S121-DIDMOUNT — an element's Did Mount chain, which the plan compiled as the
 * element's handlers and the emitter then dropped ("no DOM event equivalent"): it runs once per mount now.
 *
 * Measured first (`s121-tickedrun/tickprobe.out`, the runtime's own Function; `readings.json`, the real viewer): a value
 * arriving at creation runs it; `undefined` is never delivered; the same value again does not run it; two arrivals, or an
 * arrival and a Run, in one update make one run, the Run's, with Done; a literal on a ticked input runs it once at load;
 * at load the arrival's run comes first, then Did Mount's Run.
 *
 * §A the emitted page, bundled and rendered by real React under StrictMode (`helpers/export-react-arm.js`), against the
 * runtime's OWN Function, Variable and Set Variable running the same page (`helpers/runtime-ticked-arm.js`), press by
 * press, over eight variants of `fixtures/ticked-desk`; and a control: the page without its two new effects disagrees.
 * §B what is emitted. §C the refusals. §D `tickedArrival` against the runtime's delivery rule.
 */

const FIXTURE = path.join(__dirname, 'fixtures', 'ticked-desk');
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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ticked-desk-'));
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
const addNode = (g: Graph, node: RawNode, parentChildren?: { parent: string; after: string }) => {
  g.nodes.push(node);
  if (parentChildren) {
    const parent = nodeOf(g, parentChildren.parent);
    parent.children!.splice(parent.children!.indexOf(parentChildren.after) + 1, 0, node.id);
  }
};
const bodyOf = (lines: string[]) => lines.join('\n');

// ---- the two arms -----------------------------------------------------------------------------------------------

const childArm = (helper: string, input: unknown): string[][][] =>
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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ticked-desk-app-'));
  for (const [file, text] of Object.entries(app.files)) {
    fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    fs.writeFileSync(path.join(dir, file), file === PAGE && page !== undefined ? page : text);
  }
  return dir;
};
const exportArm = (app: EmittedApp, scenarios: string[][], page?: string): string[][][] =>
  childArm('export-react-arm.js', [{ dir: writeApp(app, page), scenarios }])[0] as unknown as string[][][];

const STEPS = ['Pick b', 'Pick b', 'Run', 'Pick c and run', 'Again'];

/** The eight variants: each a graph edit, and the presses after load. */
const VARIANTS: Array<{ name: string; edit?: (g: Graph) => void; presses: string[] }> = [
  { name: 'the fixture: a seeded Variable, Did Mount, a literal', presses: STEPS },
  {
    name: 'the item box unticked: Did Mount and the Runs only',
    edit: (g) => (nodeOf(g, 'hold').parameters['runOnChange-in-item'] = false),
    presses: STEPS
  },
  {
    name: 'no Did Mount: the arrival alone runs it at load',
    edit: (g) => (g.connections = g.connections.filter((c) => c.fromProperty !== 'didMount')),
    presses: STEPS
  },
  {
    name: 'no seed: nothing arrives at load, Did Mount runs over nothing',
    edit: (g) => delete nodeOf(g, 'itemRead').parameters.value,
    presses: STEPS
  },
  {
    name: 'two ticked inputs, both set in one click',
    edit: (g) => {
      const hold = nodeOf(g, 'hold');
      hold.parameters.functionScript = String(hold.parameters.functionScript).replace(
        'Outputs.item = Inputs.item;',
        "Outputs.item = Inputs.item + '/' + Inputs.other;"
      );
      hold.parameters['runOnChange-in-other'] = true;
      (hold.ports as Array<Record<string, string>>).push({ name: 'in-other', plug: 'input', type: '*' });
      addNode(g, { id: 'otherRead', type: 'Variable2', label: 'The other', parameters: { name: 'other', value: 'x' } });
      addNode(g, { id: 'pickBoth', type: 'net.noodl.controls.button', label: 'Pick both', parent: 'shell', parameters: { label: 'Pick both' } }, { parent: 'shell', after: 'againBtn' });
      addNode(g, { id: 'bothItem', type: 'Set Variable', label: 'Both — the item', parameters: { name: 'item', value: 'd' } });
      addNode(g, { id: 'bothOther', type: 'Set Variable', label: 'Both — the other', parameters: { name: 'other', value: 'y' } });
      g.connections.push(
        { fromId: 'otherRead', fromProperty: 'value', toId: 'hold', toProperty: 'in-other' },
        { fromId: 'pickBoth', fromProperty: 'onClick', toId: 'bothItem', toProperty: 'do' },
        { fromId: 'pickBoth', fromProperty: 'onClick', toId: 'bothOther', toProperty: 'do' }
      );
    },
    presses: ['Pick both', 'Pick both', 'Pick b', 'Run']
  },
  {
    name: "a Group's Did Mount, not the Page's",
    edit: (g) => {
      for (const c of g.connections) if (c.fromProperty === 'didMount') c.fromId = 'shell';
    },
    presses: STEPS
  },
  {
    // P18-S121-SAMEOUTPUTS. ready writes a constant and Done nothing, so after the first run only the run's own §4f write
    // can re-render: it hands React a copy, where HEAD handed it the node's one record and React kept it.
    name: 'ready writes a constant: only the run re-renders the count',
    edit: (g) => {
      g.connections = g.connections.filter((c) => !(c.fromId === 'hold' && (c.toProperty === 'value' || c.fromProperty === 'done')));
      nodeOf(g, 'readySet').parameters.value = 'yes';
    },
    presses: STEPS
  },
  {
    name: 'the literal unticked: Again alone runs it',
    edit: (g) => (nodeOf(g, 'say').parameters['runOnChange-in-word'] = false),
    presses: STEPS
  }
];

describe('§A the export against the runtime, press by press', () => {
  const cases = VARIANTS.map((v) => {
    const { dir, graph } = fixtureWith(v.edit);
    return { ...v, graph, app: emitDir(dir) };
  });
  // One child process per arm for all variants: the arms are slow to start. Caught here and rethrown in each row, so an
  // arm that throws fails its rows rather than the suite's collection (s120: that reads "0 total", like a broken compile).
  const armOrError = (run: () => string[][][][]): string[][][][] | Error => {
    try {
      return run();
    } catch (e) {
      return e as Error;
    }
  };
  const runtimeOrError = armOrError(() => childArm('runtime-ticked-arm.js', cases.map((c) => ({ ...c.graph, scenarios: [c.presses] }))) as unknown as string[][][][]);
  const exported = armOrError(() => childArm('export-react-arm.js', cases.map((c) => ({ dir: writeApp(c.app), scenarios: [c.presses] }))) as unknown as string[][][][]);
  const runtimeOf = (i: number): string[][] => {
    if (runtimeOrError instanceof Error) throw runtimeOrError;
    return runtimeOrError[i][0];
  };
  /** The wired Texts' readings: what each Text shows, the static headings and labels left out of both. */
  const wiredTexts = (graph: Graph) => {
    const texts = graph.nodes.filter((n) => n.type === 'Text');
    return texts.map((n, i) => (graph.connections.some((c) => c.toId === n.id && c.toProperty === 'text') ? i : -1)).filter((i) => i >= 0);
  };
  cases.forEach((c, i) => {
    test(`${c.name}: the same at load and after every press`, () => {
      if (exported instanceof Error) throw exported;
      const pick = wiredTexts(c.graph);
      const read = (readings: string[][]) => readings.map((row) => pick.map((k) => row[k]));
      expect(read(exported[i][0])).toEqual(read(runtimeOf(i)));
    });
  });

  test('the fixture reads what the viewer read in the s121 drive', () => {
    expect(runtimeOf(0).map((row) => wiredTexts(cases[0].graph).map((k) => row[k]))).toEqual([
      ['a', '2', '2', '2', '1'],
      ['b', '3', '3', '2', '1'],
      ['b', '3', '3', '2', '1'],
      ['b', '4', '4', '4', '1'],
      ['c', '5', '5', '5', '1'],
      ['c', '5', '5', '5', '2']
    ]);
  });

  test('a control: the page without its ticked and Did Mount effects disagrees', () => {
    const page = cases[0].app.files[PAGE]
      .split('\n\n')
      .filter((block) => !/also runs when a ticked input|Did Mount: once/.test(block))
      .join('\n\n');
    expect(page).not.toContain('tickedArrival(holdTheItemHeld, [item.get()])) return');
    const control = exportArm(cases[0].app, [cases[0].presses], page)[0];
    const pick = wiredTexts(cases[0].graph);
    expect(control.map((row) => pick.map((k) => row[k]))).not.toEqual(runtimeOf(0).map((row) => pick.map((k) => row[k])));
  });
});

// ---- §B ---------------------------------------------------------------------------------------------------------

describe('§B what is emitted', () => {
  const { dir } = fixtureWith();
  const app = emitDir(dir);
  const page = app.files[PAGE];
  const plan = planOf(dir);

  test('the plan holds one ticked run per Function a ticked input runs, without its Done', () => {
    expect(plan.tickedRuns.map((t) => t.nodeId)).toEqual(['hold', 'say']);
    const hold = plan.tickedRuns[0];
    expect(hold.watch).toEqual([{ kind: 'store-get', variableName: 'item' }]);
    expect(hold.action.ticked).toBe(true);
    expect(JSON.stringify(hold.action)).not.toContain('doneAt');
    expect(plan.tickedRuns[1].watch).toEqual([{ kind: 'literal', value: 'hello' }]);
    expect(plan.dispositions.hold).toEqual({ kind: 'collapsed', into: 'page' });
  });

  test('a ticked run is an effect keyed on the values it watches, reading them fresh, after the Variable seed', () => {
    expect(page).toContain(
      bodyOf([
        '  useEffect(() => {',
        '    if (!tickedArrival(holdTheItemHeld, [item.get()])) return;',
        '    const holdTheItemRun = runFunction(Hold_the_item, { item: item.get() }, holdTheItemNode);',
        '    setHoldTheItemOut({ ...holdTheItemRun.outputs });'
      ])
    );
    expect(page).toContain("    if (!tickedArrival(sayTheWordHeld, ['hello'])) return;");
    expect(page).toMatch(/readyAt\.set\(holdTheItemPulse\.values\.runs\);\n {6}\}\n {4}\}\n {2}\}, \[itemValue\]\);/);
    expect(page.indexOf("item.set('a')")).toBeLessThan(page.indexOf('tickedArrival(holdTheItemHeld, [item.get()])) return'));
    expect(page).toContain('  const holdTheItemHeld = useRef<unknown[]>([]).current;');
  });

  test('a Run records what it read before it runs', () => {
    expect(page).toContain(
      bodyOf([
        "          item.set('c');",
        '          tickedArrival(holdTheItemHeld, [item.get()]);',
        '          const holdTheItemRun = runFunction(Hold_the_item, { item: item.get() }, holdTheItemNode);'
      ])
    );
  });

  test('Did Mount is a once-guarded mount effect after the ticked runs, with the Done the Run sends', () => {
    expect(page).toContain(
      bodyOf([
        '  // Home — Did Mount: once, when it mounts, as the running app sends it.',
        '  const mounted = useRef(false);',
        '  useEffect(() => {',
        '    if (mounted.current) return;',
        '    mounted.current = true;',
        '    tickedArrival(holdTheItemHeld, [item.get()]);'
      ])
    );
    expect(page).toContain('    doneAt.set(holdTheItemRun.outputs.runs);\n    // eslint-disable-next-line');
    expect(page.indexOf('Did Mount: once')).toBeGreaterThan(page.indexOf("tickedArrival(sayTheWordHeld, ['hello'])) return"));
    expect(page).not.toContain('no DOM event equivalent');
    expect(app.notes.filter((n) => n.includes('Pages/Home'))).toEqual([]);
  });

  test("a child's Did Mount prints before its parent's, as React commits them", () => {
    // Not an arm row: a parent's and a child's Did Mount that touch one value meet P18-S121-ONEUPDATE (the runtime runs a
    // ticked Function per write inside one update; the export per render), filed in s121 with the runtime arm's readings.
    const { dir: d } = fixtureWith((g) => {
      addNode(g, { id: 'box', type: 'Group', label: 'Box', parent: 'shell', children: [], parameters: {} }, { parent: 'shell', after: 'saidText' });
      addNode(g, { id: 'boxSet', type: 'Set Variable', label: 'Pick q as the box mounts', parameters: { name: 'item', value: 'q' } });
      g.connections.push({ fromId: 'box', fromProperty: 'didMount', toId: 'boxSet', toProperty: 'do' });
    });
    const ordered = emitDir(d).files[PAGE];
    expect(ordered.indexOf('// Box — Did Mount: once')).toBeGreaterThan(-1);
    expect(ordered.indexOf('// Box — Did Mount: once')).toBeLessThan(ordered.indexOf('// Home — Did Mount: once'));
  });

  test('the import and the library carry tickedArrival, and the app typechecks', () => {
    expect(page).toContain("import { functionNode, runFunction, tickedArrival } from '../lib/functionRun';");
    expect(app.files[FUNCTION_RUN_LIB_PATH]).toContain(functionRunLibSource());
    expect(functionRunLibSource()).toContain('export function tickedArrival(held: unknown[], values: readonly unknown[]): boolean {');
    expect(typecheckEmittedApp(app)).toEqual([]);
  });

  test('a ticked run with no signal of its own still writes the state render reads (an Expression)', () => {
    const { dir: d } = fixtureWith((g) => {
      addNode(g, { id: 'shout', type: 'Expression', label: 'Shout', parameters: { expression: 'word + "!"', 'runOnChange-word': true } });
      addNode(g, { id: 'shoutText', type: 'Text', label: 'Shouted', parent: 'shell', parameters: { text: '' } }, { parent: 'shell', after: 'saidText' });
      addNode(g, { id: 'shoutBtn', type: 'net.noodl.controls.button', label: 'Shout', parent: 'shell', parameters: { label: 'Shout' } }, { parent: 'shell', after: 'againBtn' });
      g.connections.push(
        { fromId: 'itemRead', fromProperty: 'value', toId: 'shout', toProperty: 'word' },
        { fromId: 'shoutBtn', fromProperty: 'onClick', toId: 'shout', toProperty: 'run' },
        { fromId: 'shout', fromProperty: 'result', toId: 'shoutText', toProperty: 'text' }
      );
    });
    const shoutApp = emitDir(d);
    const shout = planOf(d).tickedRuns.find((t) => t.nodeId === 'shout');
    expect(shout?.action.materialize).toBeDefined();
    expect(shoutApp.files[PAGE]).toMatch(/if \(!tickedArrival\(shoutHeld, \[item\.get\(\)\]\)\) return;\n {4}setShoutOut\(Shout\(\{ word: item\.get\(\) \}\)\);/);
    expect(typecheckEmittedApp(shoutApp)).toEqual([]);
  });
});

describe('§B a field', () => {
  test("a ticked input fed by a field's text watches the field's state: each keystroke runs it, as the runtime's does", () => {
    const { dir } = fixtureWith((g) => {
      addNode(g, { id: 'field', type: 'net.noodl.controls.textinput', label: 'Typed', parent: 'shell', parameters: {} }, { parent: 'shell', after: 'headline' });
      const wire = g.connections.find((c) => c.toId === 'hold' && c.toProperty === 'in-item')!;
      wire.fromId = 'field';
      wire.fromProperty = 'onTextChanged';
    });
    const plan = planOf(dir);
    expect(plan.tickedRuns.find((t) => t.nodeId === 'hold')?.watch).toEqual([{ kind: 'state-get', name: 'typed' }]);
    const app = emitDir(dir);
    expect(app.files[PAGE]).toContain('    if (!tickedArrival(holdTheItemHeld, [typed])) return;');
    expect(typecheckEmittedApp(app)).toEqual([]);
  });
});

// ---- §C ---------------------------------------------------------------------------------------------------------

describe('§C refused by name, or nothing to print', () => {
  test('a ticked input whose value exists only inside a handler refuses the run (a received payload)', () => {
    const { dir } = fixtureWith((g) => {
      addNode(g, { id: 'sendPick', type: 'net.noodl.controls.button', label: 'Send a pick', parent: 'shell', parameters: { label: 'Send a pick' } }, { parent: 'shell', after: 'againBtn' });
      addNode(g, { id: 'sender', type: 'Event Sender', label: 'Send the pick', parameters: { channelName: 'pick', payload: 'what', what: 'z' } });
      addNode(g, { id: 'receiver', type: 'Event Receiver', label: 'Receive the pick', parameters: { channelName: 'pick' } });
      g.connections.push({ fromId: 'sendPick', fromProperty: 'onClick', toId: 'sender', toProperty: 'send' });
      const wire = g.connections.find((c) => c.toId === 'hold' && c.toProperty === 'in-item')!;
      wire.fromId = 'receiver';
      wire.fromProperty = 'what';
    });
    const plan = planOf(dir);
    expect(plan.dispositions.hold).toEqual({
      kind: 'deferred',
      to: 'EXP-003',
      reason: 'its "item" input is ticked under Run On Value Change, so a new value runs it again, and that value exists only inside a handler — the export cannot watch it'
    });
    expect(plan.tickedRuns.map((t) => t.nodeId)).toEqual(['say']);
  });

  test("a ticked run whose signal's chain reads a handler's value refuses the run (a received payload)", () => {
    const { dir } = fixtureWith((g) => {
      addNode(g, { id: 'sendPick', type: 'net.noodl.controls.button', label: 'Send a pick', parent: 'shell', parameters: { label: 'Send a pick' } }, { parent: 'shell', after: 'againBtn' });
      addNode(g, { id: 'sender', type: 'Event Sender', label: 'Send the pick', parameters: { channelName: 'pick', payload: 'what', what: 'z' } });
      addNode(g, { id: 'receiver', type: 'Event Receiver', label: 'Receive the pick', parameters: { channelName: 'pick' } });
      g.connections.push(
        { fromId: 'sendPick', fromProperty: 'onClick', toId: 'sender', toProperty: 'send' },
        { fromId: 'receiver', fromProperty: 'eventReceived', toId: 'hold', toProperty: 'run' }
      );
      const wire = g.connections.find((c) => c.fromId === 'hold' && c.toId === 'readySet' && c.toProperty === 'value')!;
      wire.fromId = 'receiver';
      wire.fromProperty = 'what';
    });
    expect(planOf(dir).dispositions.hold).toEqual({
      kind: 'deferred',
      to: 'EXP-003',
      reason: "a ticked input runs it again from no handler, and its signals' chains read values that exist only inside a handler"
    });
  });

  test('an unticked box prints no effect, and the Runs still export', () => {
    const { dir } = fixtureWith((g) => {
      nodeOf(g, 'hold').parameters['runOnChange-in-item'] = false;
      nodeOf(g, 'say').parameters['runOnChange-in-word'] = false;
    });
    const plan = planOf(dir);
    expect(plan.tickedRuns).toEqual([]);
    expect(plan.dispositions.hold).toEqual({ kind: 'collapsed', into: 'page' });
    const page = emitDir(dir).files[PAGE];
    expect(page).not.toContain('tickedArrival');
    expect(page).toContain('const holdTheItemRun = runFunction(Hold_the_item, { item: item.get() }, holdTheItemNode);');
  });

  test('a format-4 project with the box unset reads unticked, as the editor settles it', () => {
    const { dir } = fixtureWith((g) => {
      delete nodeOf(g, 'hold').parameters['runOnChange-in-item'];
      delete nodeOf(g, 'say').parameters['runOnChange-in-word'];
    });
    expect(planOf(dir).tickedRuns).toEqual([]);
  });

  test('Did Mount on an element mounted by a value runs each time that value mounts it', () => {
    const { dir } = fixtureWith((g) => {
      addNode(g, { id: 'box', type: 'Group', label: 'Box', parent: 'shell', children: [], parameters: {} }, { parent: 'shell', after: 'saidText' });
      for (const c of g.connections) if (c.fromProperty === 'didMount') c.fromId = 'box';
      g.connections.push({ fromId: 'itemRead', fromProperty: 'value', toId: 'box', toProperty: 'mounted' });
    });
    const app = emitDir(dir);
    // P18 session 126 (EXP-011 §93): s124 refused it by name; it runs now, keyed on the element's own render condition
    // (the viewer sends Did Mount from componentDidMount, again after every unmount). Graded against the runtime's own
    // nodes in `the-root-is-mounted-when-it-says`.
    expect(app.notes.some((n) => n.includes('box:didMount') && n.includes('dropped'))).toBe(false);
    expect(app.files[PAGE]).toContain('Box — Did Mount: each time it mounts, as the running app sends it: when (itemValue === undefined || !!itemValue).');
    expect(app.files[PAGE]).not.toContain('Did Mount: once');
  });

  test('Did Mount under an element authored Mounted false never fires, and says so', () => {
    const { dir } = fixtureWith((g) => {
      addNode(g, { id: 'hidden', type: 'Group', label: 'Hidden', parent: 'shell', children: [], parameters: { mounted: false } }, { parent: 'shell', after: 'saidText' });
      for (const c of g.connections) if (c.fromProperty === 'didMount') c.fromId = 'hidden';
    });
    const app = emitDir(dir);
    expect(app.notes.some((n) => n.includes('signal hidden.didMount') || n.includes('node hidden is authored Mounted false'))).toBe(true);
    expect(app.files[PAGE]).not.toContain('Did Mount: once');
  });
});

// ---- §D ---------------------------------------------------------------------------------------------------------

describe('§D tickedArrival, the runtime delivery rule', () => {
  // The library is TypeScript text the app compiles; evaluated here as the app would run it.
  const ts = require('typescript') as typeof import('typescript');
  const lib: Record<string, (...a: unknown[]) => unknown> = {};
  new Function('exports', ts.transpileModule(functionRunLibSource(), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText)(lib);
  const tickedArrival = lib.tickedArrival as (held: unknown[], values: readonly unknown[]) => boolean;
  const runs = (sequence: unknown[][]) => {
    const held: unknown[] = [];
    return sequence.map((values) => tickedArrival(held, values));
  };

  test('a first value arrives, the same value again does not, a new one does (tickprobe S1)', () => {
    expect(runs([['p'], ['p'], ['q']])).toEqual([true, false, true]);
  });
  test('undefined never arrives, and the held value survives it (tickprobe S2, S8)', () => {
    expect(runs([[undefined], ['p'], [undefined], ['p'], ['q']])).toEqual([false, true, false, false, true]);
  });
  test('null arrives (tickprobe S11)', () => {
    expect(runs([[null], [null]])).toEqual([true, false]);
  });
  test('two inputs: one arrival is enough, and each holds its own (tickprobe S5)', () => {
    expect(runs([['p', undefined], ['p', 'q'], ['p', 'q'], ['r', 'q']])).toEqual([true, true, false, true]);
  });
  test('a literal arrives once (tickprobe S9)', () => {
    expect(runs([['lit'], ['lit'], ['lit']])).toEqual([true, false, false]);
  });
  test('🔴 the same object again does not arrive, where the runtime runs again (tickprobe S4): an effect never sees it either', () => {
    const obj = { id: 1 };
    expect(runs([[obj], [obj], [{ id: 1 }]])).toEqual([true, false, true]);
  });
});
