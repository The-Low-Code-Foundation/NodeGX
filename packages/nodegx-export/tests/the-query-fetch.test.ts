import { execFileSync } from 'child_process';
import * as path from 'path';
import * as ts from 'typescript';

import { Catalog, loadCatalog } from '../src/catalog';
import { emitApp, EmittedApp } from '../src/emit/emitApp';
import { parseProject } from '../src/parse/parseProject';
import { ComponentIR, ExportIR, NodeIR, ParamValue } from '../src/ir/types';
import { typecheckEmittedApp } from './helpers/typecheckApp';

/**
 * P18-S116-QUERYFETCH — an exported Query Records whose Fetch is wired asks when Fetch is sent, and only then.
 *
 * In the running app `storageFetch` is `scheduleFetch`: the query asks after the pulse's writes, its filter's wired values
 * read then. Wiring Fetch settles every Run On Value Change box unticked (NDA-017), and `nodescope.ts` applies a box
 * before the input it governs, so nothing asks as the node is made unless an author ticked a box again. HEAD's export
 * asked once at mount and never again, and refused a sender whose chain held the Fetch (a Create Record's Done).
 *
 * §A when the query asks, against the runtime node's own setters (the child-process arm's creation mode), box by box.
 * §B what is emitted: the sender's handler, the query's settings in the call, a page's Did Mount, a Create Record's Done,
 * two senders, the typecheck. §C a wired filter's `where` the HANDLER builds (its own text, evaluated with the emitted
 * `filterValue` and a store whose `get()` holds the value) against the runtime's `getStorageFilter`. §D the refusals.
 */

const PUPPY = path.join(__dirname, 'fixtures', 'puppy-test-3');
const LANDING = 'Pages/Landing';
const PAGE_FILE = 'src/pages/Landing.tsx';
const QUERY = 'puppyQuery';
const catalog: Catalog = loadCatalog();
const baseIr = parseProject(PUPPY, catalog);

/** The emitted client's `filterValue`, the one export §C reads. */
interface FilterClient {
  filterValue(value: unknown, dateColumn?: boolean): unknown;
}

const componentOf = (ir: ExportIR, p: string): ComponentIR => ir.components.find((c) => c.path === p)!;
const nodeOf = (ir: ExportIR, id: string): NodeIR => componentOf(ir, LANDING).nodes.find((n) => n.id === id)!;
const literal = (value: string | number | boolean): ParamValue => ({ kind: 'literal', value });
const json = (value: unknown): ParamValue => ({ kind: 'json', value }) as ParamValue;

/** What NDA-017's settle writes on a Query Records whose Fetch is wired: every box unticked. */
const SETTLED: Record<string, ParamValue> = {
  'runOnChange-collectionName': literal(false),
  'runOnChange-querySettings': literal(false),
  'runOnChange-records': literal(false),
  'runOnChange-search': literal(false)
};

const wire = (ir: ExportIR, fromId: string, fromProperty: string, toId: string, toProperty: string, kind: 'signal' | 'value' = 'signal') =>
  componentOf(ir, LANDING).connections.push({ key: `${fromId}:${fromProperty}->${toId}:${toProperty}`, fromId, fromProperty, toId, toProperty, kind });

const addNode = (ir: ExportIR, node: Partial<NodeIR> & { id: string; type: string }, parent?: string) => {
  const component = componentOf(ir, LANDING);
  component.nodes.push({ catalogRef: node.type, parameters: [], declaredPorts: [], portCompleteness: 'complete', children: [], ...(parent ? { parent } : {}), ...node } as unknown as NodeIR);
  if (parent) component.nodes.find((n) => n.id === parent)!.children!.push(node.id);
};

/** A "Refresh" button beside the list heading; its Click into the query's Fetch unless `wired` is false. */
const addRefresh = (ir: ExportIR, id = 'refreshButton', wired = true) => {
  const button = structuredClone(nodeOf(ir, 'submitButton'));
  addNode(ir, { ...button, id, children: [] }, 'sectionHead');
  if (wired) wire(ir, id, 'onClick', QUERY, 'storageFetch');
};

/** A Variable `breed` wired into the query's `qp-breed`, its Filter `breed equal to <breed>` AND `available` = true. */
const wireBreed = (ir: ExportIR) => {
  addNode(ir, { id: 'var-breed', type: 'Variable2', parameters: [{ name: 'name', value: literal('breed') }] } as NodeIR);
  wire(ir, 'var-breed', 'value', QUERY, 'qp-breed', 'value');
  setParams(ir, { visualFilter: json({ combinator: 'and', rules: [{ property: 'breed', operator: 'equal to', input: 'breed' }, { property: 'available', operator: 'equal to', value: true }] }) });
};

const setParams = (ir: ExportIR, params: Record<string, ParamValue | undefined>) => {
  const node = nodeOf(ir, QUERY);
  for (const [name, value] of Object.entries(params)) {
    node.parameters = node.parameters.filter((p) => p.name !== name);
    if (value !== undefined) node.parameters.push({ name, value });
  }
};

/** The fixture with a Refresh button sending the query's Fetch, its boxes as `params` says (settled by default). */
const withFetch = (params: Record<string, ParamValue | undefined> = SETTLED, edit: (ir: ExportIR) => void = () => undefined): ExportIR => {
  const ir = structuredClone(baseIr);
  setParams(ir, params);
  addRefresh(ir);
  edit(ir);
  return ir;
};

const pageOf = (app: EmittedApp) => app.files[PAGE_FILE];
/** Every `useEffect` in the page that asks for puppies, with its dependency list. */
const queryEffects = (page: string) => [...page.matchAll(/\n {2}useEffect\(\(\) => \{\n((?: {4}.*\n)*?) {2}\}, \[(.*)\]\);\n/g)].filter((m) => m[1].includes('fetchPuppies(')).map((m) => ({ body: m[1], deps: m[2] }));

// ---- the runtime arm -------------------------------------------------------------------------------------------

type Wire = unknown;
const UNSET: Wire = { $undefined: true };

const runtimeArm = <T>(cases: unknown[]): T[] =>
  JSON.parse(
    execFileSync(process.execPath, [path.join(__dirname, 'helpers', 'runtime-query-arm.js')], {
      input: JSON.stringify(cases),
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024
    })
  );

// ---- §A ------------------------------------------------------------------------------------------------------------

const BOXES: Array<{ name: string; params: Record<string, ParamValue | undefined>; breed?: boolean }> = [
  { name: 'every box settled unticked', params: SETTLED },
  { name: 'the Class box left unset (ticked by default)', params: { ...SETTLED, 'runOnChange-collectionName': undefined } },
  { name: 'the Class box ticked again', params: { ...SETTLED, 'runOnChange-collectionName': literal(true) } },
  { name: 'Query settings ticked, a Sort authored', params: { ...SETTLED, 'runOnChange-querySettings': literal(true), visualSort: json([{ property: 'name', order: 'ascending' }]) } },
  { name: 'Query settings ticked, nothing authored it governs', params: { ...SETTLED, 'runOnChange-querySettings': literal(true) } },
  { name: 'every box unticked, a Sort authored', params: { ...SETTLED, visualSort: json([{ property: 'name', order: 'ascending' }]) } },
  { name: 'a wired value, its box unticked', params: { ...SETTLED, 'runOnChange-qp-breed': literal(false) }, breed: true },
  { name: 'a wired value, its box ticked', params: { ...SETTLED, 'runOnChange-qp-breed': literal(true) }, breed: true }
];
const BOX_IRS = BOXES.map((b) => withFetch(b.params, b.breed ? wireBreed : undefined));
const BOX_APPS = BOX_IRS.map((ir) => emitApp(ir, catalog));
const BOX_READINGS = runtimeArm<{ atCreation: number; onChange: number }>(
  BOX_IRS.map((ir, i) => ({
    creation: true,
    // The arm replays the parameters as the node's own setters take them; the wired value arrives as a change.
    parameters: nodeOf(ir, QUERY).parameters,
    changes: BOXES[i].breed ? [['breed', 'Pug']] : []
  }))
);

describe('§A when the query asks, against the runtime node’s own setters, box by box', () => {
  test.each(BOXES.map((b, i) => [b.name, i] as const))('%s', (_name, i) => {
    const reading = BOX_READINGS[i];
    const effects = queryEffects(pageOf(BOX_APPS[i]));
    if (BOXES[i].breed) {
      // A new value asks again exactly where the runtime's setter schedules a fetch for it.
      expect(effects.some((e) => e.deps.includes('breedValue'))).toBe(reading.onChange > 0);
    } else {
      // Asked as the node is made: a mount effect (no dependencies) exactly where the runtime asks at creation.
      expect(effects.filter((e) => e.deps === '').length).toBe(reading.atCreation > 0 ? 1 : 0);
    }
    // And whatever the boxes say, Fetch asks.
    expect(pageOf(BOX_APPS[i])).toMatch(/onClick=\{\(\) => void fetchPuppies\(.*\)\.then\(setPuppies\)\}/);
  });

  test('the matrix reaches both answers: a box that asks at creation and one that does not, a value that asks and one that waits', () => {
    expect(new Set(BOX_READINGS.slice(0, 6).map((r) => r.atCreation > 0))).toEqual(new Set([true, false]));
    expect(BOX_READINGS.slice(6).map((r) => r.onChange)).toEqual([0, 1]);
  });
});

// ---- §B ------------------------------------------------------------------------------------------------------------

describe('§B what is emitted', () => {
  const settled = BOX_APPS[0];

  test('every box unticked: no mount effect, a line saying so, and the Click asks', () => {
    const page = pageOf(settled);
    expect(queryEffects(page)).toEqual([]);
    expect(page).toContain('  // "Query available puppies" asks only when its Fetch is sent (dbcollectionnode2.ts storageFetch); its boxes are unticked.');
    expect(page).toContain('onClick={() => void fetchPuppies().then(setPuppies)}');
    expect(settled.notes.filter((n) => n.includes('storageFetch'))).toEqual([]);
    // No effect left, so none imported; and a wired value read only in the handler earns no render hook.
    expect(page).not.toContain('useEffect');
    expect(pageOf(BOX_APPS[6])).not.toContain('useValue(breed)');
    expect(pageOf(BOX_APPS[7])).toContain('const breedValue = useValue(breed);');
  });

  test('the query’s own settings travel with the Fetch', () => {
    const page = pageOf(BOX_APPS[5]);
    expect(page).toContain("onClick={() => void fetchPuppies({ sort: ['name'] }).then(setPuppies)}");
  });

  test('a ticked Class box: the mount effect as before, and the Click besides', () => {
    const page = pageOf(BOX_APPS[2]);
    expect(page).toContain(['  useEffect(() => {', '    fetchPuppies().then(setPuppies);', '  }, []);'].join('\n'));
    expect(page).toContain('onClick={() => void fetchPuppies().then(setPuppies)}');
  });

  test('a page’s Did Mount into Fetch is the mount: one effect, the wire consumed, no handler on the page', () => {
    const ir = structuredClone(baseIr);
    setParams(ir, SETTLED);
    wire(ir, 'page', 'didMount', QUERY, 'storageFetch');
    const app = emitApp(ir, catalog);
    expect(queryEffects(pageOf(app))).toEqual([{ body: '    fetchPuppies().then(setPuppies);\n', deps: '' }]);
    expect(app.notes.filter((n) => n.includes('didMount'))).toEqual([]);
    expect(typecheckEmittedApp(app)).toEqual([]);
  });

  test('a Create Record’s Done into Fetch: the create exports, and asks again after it saves', () => {
    const ir = structuredClone(baseIr);
    setParams(ir, SETTLED);
    addRefresh(ir, 'addButton', false);
    addNode(ir, { id: 'createPuppy', type: 'NewDbModelProperties', parameters: [{ name: 'collectionName', value: literal('Puppy') }] } as NodeIR);
    wire(ir, 'nameInput', 'onTextChanged', 'createPuppy', 'prop-name', 'value');
    wire(ir, 'addButton', 'onClick', 'createPuppy', 'store');
    wire(ir, 'createPuppy', 'done', QUERY, 'storageFetch');
    const app = emitApp(ir, catalog);
    const page = pageOf(app);
    const create = page.indexOf('await createPuppy(');
    expect(create).toBeGreaterThan(-1);
    // The fetch is the Done chain: after the awaited save, inside its try.
    const after = page.slice(create);
    expect(after.indexOf('void fetchPuppies().then(setPuppies);')).toBeGreaterThan(-1);
    expect(after.indexOf('void fetchPuppies().then(setPuppies);')).toBeLessThan(after.indexOf('} catch'));
    expect(app.notes.filter((n) => n.includes('createPuppy'))).toEqual([]);
    expect(typecheckEmittedApp(app)).toEqual([]);
  });

  test('two senders: each asks', () => {
    const app = emitApp(withFetch(SETTLED, (ir) => addRefresh(ir, 'againButton')), catalog);
    expect(pageOf(app).match(/onClick=\{\(\) => void fetchPuppies\(\)\.then\(setPuppies\)\}/g)).toHaveLength(2);
  });

  test.each(BOXES.map((b, i) => [b.name, i] as const))('the app typechecks: %s', (_name, i) => {
    expect(typecheckEmittedApp(BOX_APPS[i])).toEqual([]);
  });
});

// ---- §C ------------------------------------------------------------------------------------------------------------

const loadClient = (source: string): FilterClient => {
  const plain = source.replace(/import\.meta\.env\.VITE_NODEGX_\w+/g, 'undefined');
  const js = ts.transpileModule(plain, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const module: { exports: unknown } = { exports: {} };
  // eslint-disable-next-line no-new-func
  new Function('require', 'module', 'exports', 'fetch', js)(() => ({}), module, module.exports, undefined);
  return module.exports as FilterClient;
};

const decode = (value: Wire): unknown =>
  value !== null && typeof value === 'object' && '$date' in (value as object)
    ? new Date((value as { $date: string }).$date)
    : value !== null && typeof value === 'object' && '$undefined' in (value as object)
      ? undefined
      : value;
const onTheWire = (value: unknown) => (value === undefined ? undefined : JSON.parse(JSON.stringify(value)));

const VALUES: Wire[] = [UNSET, 'Collie', '', null, 0, 3, false, true, { $date: '2021-06-01T00:00:00.000Z' }];

describe('§C the where the Fetch builds at the pulse, against the runtime node’s own getStorageFilter', () => {
  const ir = BOX_IRS[6];
  const app = BOX_APPS[6];
  const page = pageOf(app);
  const match = /onClick=\{\(\) => void fetchPuppies\(\{ where: (.*) \}\)\.then\(setPuppies\)\}/.exec(page);
  const readings = runtimeArm<{ asked: { where?: unknown } }>(VALUES.map((v) => ({ parameters: nodeOf(ir, QUERY).parameters, collections: ir.project.collections, values: { breed: v } })));

  test('the handler reads the variable as it is at the pulse, not as render saw it', () => {
    expect(match).not.toBeNull();
    expect(match![1]).toBe('breed.get() === undefined ? {"available":{"$eq":true}} : {"$and":[{"breed":{"$eq":filterValue(breed.get())}},{"available":{"$eq":true}}]}');
  });

  test.each(VALUES.map((v, i) => [JSON.stringify(v), i] as const))('breed = %s', (_name, i) => {
    const { filterValue } = loadClient(app.files['src/api/client.ts']);
    const value = decode(VALUES[i]);
    // eslint-disable-next-line no-new-func
    const where = new Function('filterValue', 'breed', `return ${match![1]};`)(filterValue, { get: () => value });
    expect(onTheWire(where)).toEqual(onTheWire(readings[i].asked.where));
  });
});

// ---- §D ------------------------------------------------------------------------------------------------------------

describe('§D what it cannot ask the same way is refused by name', () => {
  test('a wired value’s box ticked beside one unticked: two schedules for one query', () => {
    const ir = withFetch(SETTLED, (ir) => {
      wireBreed(ir);
      addNode(ir, { id: 'var-name', type: 'Variable2', parameters: [{ name: 'name', value: literal('who') }] } as NodeIR);
      wire(ir, 'var-name', 'value', QUERY, 'qp-who', 'value');
      setParams(ir, {
        visualFilter: json({ combinator: 'and', rules: [{ property: 'breed', operator: 'equal to', input: 'breed' }, { property: 'name', operator: 'equal to', input: 'who' }] }),
        'runOnChange-qp-breed': literal(true),
        'runOnChange-qp-who': literal(false)
      });
    });
    const app = emitApp(ir, catalog);
    expect(app.notes.join('\n')).toContain(
      'its Fetch is wired and the Run On Value Change boxes of "breed", "who" disagree — a value that asks beside one that waits is not exported in this slice'
    );
    expect(pageOf(app)).not.toContain('fetchPuppies(');
  });

  test('a Fetch sent before the chain writes a value its Filter reads', () => {
    const ir = withFetch({ ...SETTLED, 'runOnChange-qp-breed': literal(false) }, (ir) => {
      wireBreed(ir);
      addNode(ir, { id: 'setBreed', type: 'Set Variable', parameters: [{ name: 'name', value: literal('breed') }, { name: 'value', value: literal('Pug') }] } as NodeIR);
      // The Click's Fetch wire comes first (addRefresh), then this one: the runtime fetches after both.
      wire(ir, 'refreshButton', 'onClick', 'setBreed', 'do');
    });
    const app = emitApp(ir, catalog);
    expect(app.notes.join('\n')).toContain(
      'its Fetch is sent before the chain writes "breed", which its Filter reads — the runtime fetches after the pulse\'s writes (scheduleFetch), and that order is not exported in this slice'
    );
  });

  test('the write first and the Fetch after: exported, and the Fetch reads the written value', () => {
    const ir = structuredClone(baseIr);
    setParams(ir, { ...SETTLED, 'runOnChange-qp-breed': literal(false) });
    addRefresh(ir, 'refreshButton', false);
    wireBreed(ir);
    addNode(ir, { id: 'setBreed', type: 'Set Variable', parameters: [{ name: 'name', value: literal('breed') }, { name: 'value', value: literal('Pug') }] } as NodeIR);
    wire(ir, 'refreshButton', 'onClick', 'setBreed', 'do');
    wire(ir, 'refreshButton', 'onClick', QUERY, 'storageFetch');
    const page = pageOf(emitApp(ir, catalog));
    const set = page.indexOf("breed.set('Pug')");
    expect(set).toBeGreaterThan(-1);
    expect(page.indexOf('void fetchPuppies({ where: breed.get()', set)).toBeGreaterThan(set);
  });

  test('a query refused for its own settings refuses the chain that fetches it, with the query’s reason', () => {
    const app = emitApp(withFetch({ ...SETTLED, search: literal('pug') }), catalog);
    expect(app.notes.join('\n')).toMatch(/refreshButton:onClick->puppyQuery:storageFetch dropped: the Query Records it fetches is not exported: .*Search/);
  });

  test('a Fetch into a query nothing renders prints nothing, and the button keeps its other action', () => {
    const app = emitApp(
      withFetch(SETTLED, (ir) => {
        const component = componentOf(ir, LANDING);
        component.connections = component.connections.filter((c) => !(c.fromId === QUERY && c.fromProperty === 'items'));
        wire(ir, 'refreshButton', 'onClick', 'navThankYou', 'navigate');
      }),
      catalog
    );
    const page = pageOf(app);
    expect(page).not.toContain('fetchPuppies');
    expect(page).toMatch(/onClick=\{\(\) => navigate\(/);
    expect(app.notes.join('\n')).toContain('query result is not consumed by a rendered repeater');
    expect(typecheckEmittedApp(app)).toEqual([]);
  });
});
