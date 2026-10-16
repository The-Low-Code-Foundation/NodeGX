import { execFileSync } from 'child_process';
import * as path from 'path';
import * as ts from 'typescript';

import { Catalog, loadCatalog } from '../src/catalog';
import { querySettingsOf } from '../src/analyze/querySettings';
import { emitApp } from '../src/emit/emitApp';
import { parseProject } from '../src/parse/parseProject';
import { ComponentIR, ExportIR, NodeIR, ParamValue } from '../src/ir/types';
import { typecheckEmittedApp } from './helpers/typecheckApp';

/**
 * P18-S115-QUERYFILTER (EXP-011 §82) — an exported Query Records asks the backend for what the running one asks for.
 *
 * Before this the exported query was `query('<Class>')` whatever the node said, so a filtered list held every record
 * in the class. The runtime builds its request in `dbcollectionnode2.ts` `fetch()`: `getStorageFilter()` (the visual
 * filter through `QueryUtils.convertVisualFilter`, the sort through `convertVisualSorting`, or `{ failed }`, which is
 * Failure and no request), `getStorageLimit()` and `getStorageSkip()`, handed to the adapter, whose
 * `ParseWireAdapter.query` writes the body.
 *
 * §A the runtime arm is the node's OWN methods, called on a stand-in `this` filled the way its setters fill it, with
 * the project's schema in the runtime's own cache; the export arm is `querySettingsOf`. Same request, case by case.
 * §B what is emitted: the call, the module, an unfiltered query byte-identical to before. §C the refusals, by name.
 * §D the emitted client's body against `ParseWireAdapter.query`'s for the same request.
 */

const REPO = path.join(__dirname, '..', '..', '..');
const RUNTIME = path.join(REPO, 'packages', 'noodl-runtime');
const PUPPY = path.join(__dirname, 'fixtures', 'puppy-test-3');
const LANDING = 'Pages/Landing';
const QUERY = 'puppyQuery';
const catalog: Catalog = loadCatalog();
const baseIr = parseProject(PUPPY, catalog);
const baseApp = emitApp(baseIr, catalog);

type AnyModule = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const componentOf = (ir: ExportIR, p: string): ComponentIR => ir.components.find((c) => c.path === p)!;
const queryNode = (ir: ExportIR): NodeIR => componentOf(ir, LANDING).nodes.find((n) => n.id === QUERY)!;
const json = (value: unknown): ParamValue => ({ kind: 'json', value }) as ParamValue;
const literal = (value: string | number | boolean): ParamValue => ({ kind: 'literal', value });

/** The fixture with the query's parameters replaced by `params` (Class kept). */
const withParams = (params: Record<string, ParamValue>, edit: (ir: ExportIR) => void = () => undefined): ExportIR => {
  const ir = structuredClone(baseIr);
  const node = queryNode(ir);
  node.parameters = [...node.parameters.filter((p) => p.name === 'collectionName'), ...Object.entries(params).map(([name, value]) => ({ name, value }))];
  edit(ir);
  return ir;
};
const wire = (ir: ExportIR, toProperty: string) => {
  componentOf(ir, LANDING).connections.push({ key: `x:value->${QUERY}:${toProperty}`, fromId: 'x', fromProperty: 'value', toId: QUERY, toProperty, kind: 'value' });
};

// ---- the runtime arm ---------------------------------------------------------------------------------------------

type RuntimeReading = { failed: string } | { asked: AnyModule; body: AnyModule };

/** Every case's runtime reading in one child process (`helpers/runtime-query-arm.js` says why a child, and how). */
const runtimeReadings = (irs: ExportIR[]): RuntimeReading[] =>
  JSON.parse(
    execFileSync(process.execPath, [path.join(__dirname, 'helpers', 'runtime-query-arm.js')], {
      input: JSON.stringify(irs.map((ir) => ({ parameters: queryNode(ir).parameters, collections: ir.project.collections }))),
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024
    })
  );

const exportAsks = (ir: ExportIR) => querySettingsOf(queryNode(ir), componentOf(ir, LANDING), ir.project.collections);


const conditions = (type: 'and' | 'or', ...items: unknown[]) => ({ type, conditions: items });
const field = (f: string, operator: string, value?: unknown) => ({ kind: 'field', field: f, operator, ...(value === undefined ? {} : { value }) });
const connected = (f: string, operator: string, port: string) => ({ kind: 'field', field: f, operator, valueSource: 'connected', valuePortName: port });

const CASES: Array<[string, Record<string, ParamValue>, ((ir: ExportIR) => void)?]> = [
  ['nothing beyond the Class', {}],
  ['QueryEditor shape: equal to', { visualFilter: json({ combinator: 'and', rules: [{ property: 'name', operator: 'equal to', value: 'Rex' }] }) }],
  ['QueryEditor shape: contain escapes the text and ignores case', { visualFilter: json({ combinator: 'and', rules: [{ property: 'name', operator: 'contain', value: 'R.x (1)' }] }) }],
  ['QueryEditor shape: or of two, exist', { visualFilter: json({ combinator: 'or', rules: [{ property: 'name', operator: 'not equal to', value: 'Rex' }, { property: 'breed', operator: 'exist' }] }) }],
  ['QueryEditor shape: a rule reading a qp- input that holds a typed-in value', { visualFilter: json({ combinator: 'and', rules: [{ property: 'breed', operator: 'equal to', input: 'breed' }] }), 'qp-breed': literal('Collie') }],
  ['QueryEditor shape: a rule reading a qp- input nothing sets is dropped', { visualFilter: json({ combinator: 'and', rules: [{ property: 'breed', operator: 'equal to', input: 'breed' }, { property: 'available', operator: 'equal to', value: true }] }) }],
  ['builder shape: and of equalTo, greaterThan', { visualFilter: json(conditions('and', field('available', 'equalTo', true), field('age', 'greaterThan', '2'))) }],
  ['builder shape: the string family and empties', { visualFilter: json(conditions('and', field('name', 'startsWith', 'R'), field('breed', 'notContains', 'x*'), field('description', 'isNotEmpty'), field('photo', 'exists', false))) }],
  ['builder shape: containedIn, between, notBetween', { visualFilter: json(conditions('or', field('breed', 'containedIn', ['Collie', 'Pug']), field('age', 'between', [1, 5]), field('age', 'notBetween', [2, 3]))) }],
  ['builder shape: a nested group', { visualFilter: json(conditions('and', field('available', 'equalTo', true), conditions('or', field('name', 'equalTo', 'Rex'), field('name', 'equalTo', 'Bo')))) }],
  ['builder shape: a connected row nothing sets is dropped', { visualFilter: json(conditions('and', connected('breed', 'equalTo', 'qp-breed'), field('available', 'equalTo', true))) }],
  ['builder shape: a connected row whose port holds a typed-in value', { visualFilter: json(conditions('and', connected('breed', 'equalTo', 'qp-breed'))), 'qp-breed': literal('Pug') }],
  ['builder shape: every row dropped is no where at all', { visualFilter: json(conditions('and', connected('breed', 'equalTo', 'qp-breed'))) }],
  ['an empty group is no where', { visualFilter: json(conditions('and')) }],
  ['a filter that is null is no where', { visualFilter: json(null) }],
  [
    'a typed-in date on a Date column goes as the date envelope',
    { visualFilter: json(conditions('and', field('born', 'greaterThan', '2020-01-01'))) },
    (ir) => ir.project.collections[0].columns.push({ name: 'born', type: 'Date' })
  ],
  ['a sort of two', { visualSort: json([{ property: 'available', order: 'descending' }, { property: 'name', order: 'ascending' }]) }],
  ['an empty sort is sent, as order ""', { visualSort: json([]) }],
  ['Use Limit with nothing typed is 10 from 0', { storageEnableLimit: literal(true) }],
  ['Use Limit with Limit 5, Skip 2', { storageEnableLimit: literal(true), storageLimit: literal(5), storageSkip: literal(2) }],
  ['Limit and Skip with Use Limit unticked are not sent', { storageEnableLimit: literal(false), storageLimit: literal(5), storageSkip: literal(2) }],
  [
    'all of it together',
    {
      visualFilter: json(conditions('and', field('available', 'equalTo', true))),
      visualSort: json([{ property: 'name', order: 'descending' }]),
      storageEnableLimit: literal(true),
      storageLimit: literal(3)
    }
  ],
  ['Total Count on asks the same rows (count rides beside them; §82.4)', { storageEnableCount: literal(true) }]
];

const BETWEEN_SOON: Record<string, ParamValue> = { visualFilter: json(conditions('and', field('age', 'between', 'soon'))) };
const RELATION_NAMED: Record<string, ParamValue> = {
  visualFilter: json(conditions('and', { kind: 'relation', relationProperty: 'puppies', relationClass: 'Owner', value: 'o1' }))
};
const caseIrs = CASES.map(([, params, edit]) => withParams(params, edit));
const [betweenSoon, relationNamed, ...readings] = runtimeReadings([withParams(BETWEEN_SOON), withParams(RELATION_NAMED), ...caseIrs]);

describe('§A what the query asks for, against the runtime node’s own methods', () => {
  test.each(CASES.map(([name], i) => [name, i] as const))('%s', (_name, i) => {
    const reading = readings[i];
    if ('failed' in reading) throw new Error(`the runtime failed: ${reading.failed}`);
    expect(exportAsks(caseIrs[i])).toEqual({ params: reading.asked });
  });

  test('a filter the runtime cannot translate is Failure there and a refusal here, carrying its sentence', () => {
    expect(betweenSoon).toEqual({ failed: 'A "between" filter needs a two-element array [from, to]' });
    expect(exportAsks(withParams(BETWEEN_SOON))).toEqual({
      refuse: 'the runtime cannot translate its Filter either ("A "between" filter needs a two-element array [from, to]"), so it answers Failure and never queries'
    });
  });
});

// ---- §B ------------------------------------------------------------------------------------------------------------

describe('§B what is emitted', () => {
  const app = emitApp(
    withParams({
      visualFilter: json(conditions('and', field('available', 'equalTo', true))),
      visualSort: json([{ property: 'name', order: 'descending' }]),
      storageEnableLimit: literal(true),
      storageLimit: literal(3)
    }),
    catalog
  );

  test('the page calls the fetch with its own where, order, limit and skip', () => {
    expect(app.files['src/pages/Landing.tsx']).toContain(
      `    fetchPuppies({ where: {"available":{"$eq":true}}, sort: ['-name'], limit: 3, skip: 0 }).then(setPuppies);`
    );
  });

  test('the module’s fetch takes them and hands them to the client', () => {
    const module = app.files['src/api/puppies.ts'];
    expect(module).toContain("import { create, query, update, type QueryParams } from './client';");
    expect(module).toContain(" * Each site passes its own filter, order and limit, as the running app sends them.\n");
    expect(module).toContain("export async function fetchPuppies(params?: QueryParams): Promise<Puppy[]> {\n  return query<Puppy>('Puppy', params);\n}\n");
  });

  test('the app typechecks', () => {
    expect(typecheckEmittedApp(app)).toEqual([]);
  });

  test('an unfiltered query emits what it always did, byte for byte', () => {
    const plain = emitApp(withParams({}), catalog);
    expect(plain.files).toEqual(baseApp.files);
    expect(baseApp.files['src/pages/Landing.tsx']).toContain('    fetchPuppies().then(setPuppies);');
    expect(baseApp.files['src/api/puppies.ts']).toContain("export async function fetchPuppies(): Promise<Puppy[]> {\n  return query<Puppy>('Puppy');\n}\n");
  });

  test('with no backend the stub takes the parameters and still answers empty', () => {
    const ir = withParams({ storageEnableLimit: literal(true) }, (x) => delete x.project.cloudservices);
    const stub = emitApp(ir, catalog);
    expect(stub.files['src/api/puppies.ts']).toContain('export async function fetchPuppies(_params?: unknown): Promise<Puppy[]> {\n  return [];\n}\n');
    expect(typecheckEmittedApp(stub)).toEqual([]);
  });
});

// ---- §C ------------------------------------------------------------------------------------------------------------

const refusalOf = (ir: ExportIR): string | undefined => {
  const settings = exportAsks(ir);
  return 'refuse' in settings ? settings.refuse : undefined;
};

describe('§C what it cannot ask the same way is refused by name, and says so in the report', () => {
  test('the Javascript filter', () => {
    expect(refusalOf(withParams({ storageFilterType: literal('json') }))).toBe(
      'its Filter is a Javascript filter, a script the runtime runs on every fetch — the export translates the Visual filter only'
    );
  });

  test('a Search term, typed or wired; an empty one is no search', () => {
    const sentence = "it searches (the Search input), which is the backend's full-text path — not exported in this slice";
    expect(refusalOf(withParams({ search: literal('rex') }))).toBe(sentence);
    expect(refusalOf(withParams({}, (ir) => wire(ir, 'search')))).toBe(sentence);
    expect(refusalOf(withParams({ search: literal('') }))).toBeUndefined();
  });

  test.each(['visualFilter', 'visualSort', 'storageEnableLimit', 'storageLimit', 'storageSkip', 'storageFilterType'])('a wired %s', (port) => {
    expect(refusalOf(withParams({}, (ir) => wire(ir, port)))).toBe(`its ${port} input is wired — which records it asks for must be readable off the graph in this slice`);
  });

  test('a filter value read from a wired port, in either shape (P18-S115-QUERYPARAMS)', () => {
    const sentence = 'its Filter reads "breed" from a wired input, so the query changes while the app runs — not exported in this slice (P18-S115-QUERYPARAMS)';
    expect(refusalOf(withParams({ visualFilter: json(conditions('and', connected('breed', 'equalTo', 'qp-breed'))) }, (ir) => wire(ir, 'qp-breed')))).toBe(sentence);
    expect(
      refusalOf(withParams({ visualFilter: json({ combinator: 'and', rules: [{ property: 'breed', operator: 'equal to', input: 'breed' }] }) }, (ir) => wire(ir, 'qp-breed')))
    ).toBe(sentence);
  });

  test('a relation question with no class, and a points-to condition', () => {
    expect(refusalOf(withParams({ visualFilter: json(conditions('and', { kind: 'relation', relationProperty: 'owners', value: 'u1' })) }))).toBe(
      'its Filter asks a relation question whose class the runtime reads off a loaded record — not exported in this slice'
    );
    expect(refusalOf(withParams({ visualFilter: json(conditions('and', field('owner', 'pointsTo', 'u1'))) }))).toBe(
      "its Filter has a \"points to\" condition, whose target class the export's schema snapshot does not carry"
    );
  });

  test('a relation question that names its class is asked, as the runtime asks it', () => {
    const ir = withParams(RELATION_NAMED);
    expect('asked' in relationNamed && relationNamed.asked).toEqual({ where: { $relatedTo: { object: { __type: 'Pointer', objectId: 'o1', className: 'Owner' }, key: 'puppies' } } });
    expect(exportAsks(ir)).toEqual({ params: { where: { $relatedTo: { object: { __type: 'Pointer', objectId: 'o1', className: 'Owner' }, key: 'puppies' } } } });
  });

  test('a refused query reaches the report: the repeater’s wire is dropped with the reason, and the node is deferred with it', () => {
    const app = emitApp(withParams({ storageFilterType: literal('json') }), catalog);
    expect(app.notes).toContain(
      'Pages/Landing: wire puppyQuery:items->repeater:items dropped: the Query Records it reads is not exported: its Filter is a Javascript filter, a script the runtime runs on every fetch — the export translates the Visual filter only'
    );
    expect(app.files['src/pages/Landing.tsx']).not.toContain('fetchPuppies');
  });
});

// ---- §D ------------------------------------------------------------------------------------------------------------

const loadClient = (source: string, fetch: unknown): AnyModule => {
  const plain = source.replace(/import\.meta\.env\.VITE_NODEGX_\w+/g, 'undefined');
  const js = ts.transpileModule(plain, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const module = { exports: {} as AnyModule };
  // eslint-disable-next-line no-new-func
  new Function('require', 'module', 'exports', 'fetch', js)(() => ({}), module, module.exports, fetch);
  return module.exports;
};

describe('§D the body on the wire, against ParseWireAdapter.query’s', () => {
  test.each(CASES.map(([name], i) => [name, i] as const))('%s', async (_name, i) => {
    const reading = readings[i];
    if ('failed' in reading) throw new Error(`the runtime failed: ${reading.failed}`);
    const ir = caseIrs[i];
    const settings = exportAsks(ir);
    let exportBody: AnyModule | undefined;
    const client = loadClient(emitApp(ir, catalog).files['src/api/client.ts'], async (_url: string, init: { body: string }) => {
      exportBody = JSON.parse(init.body);
      return { ok: true, status: 200, text: async () => JSON.stringify({ results: [] }) };
    });
    await client.query('Puppy', 'params' in settings ? settings.params : {});

    // §82.4: the runtime always sends `count` (Total Count's box, false unless ticked); the export sends none. A
    // ticked box is answered with a total the export never reads (its Total Count output is not translated).
    const { count, ...runtimeRest } = reading.body;
    expect(typeof count).toBe('boolean');
    expect(exportBody).toEqual(runtimeRest);
  });
});
