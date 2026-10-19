import { execFileSync } from 'child_process';
import * as path from 'path';
import * as ts from 'typescript';

import { Catalog, loadCatalog } from '../src/catalog';
import { querySettingsOf } from '../src/analyze/querySettings';
import { emitApp, EmittedApp } from '../src/emit/emitApp';
import { parseProject } from '../src/parse/parseProject';
import { ComponentIR, ExportIR, NodeIR, ParamValue } from '../src/ir/types';
import { typecheckEmittedApp } from './helpers/typecheckApp';

/**
 * P18-S115-QUERYPARAMS — an exported Query Records whose Filter reads a wired value asks what the running one asks.
 *
 * In the running app a `qp-<name>` input is `setQueryParameter`: it stores the value and, its Run On Value Change box
 * ticked (the default), queries again (`scheduleFetch`). `getStorageFilter` builds the `where` from whatever the inputs
 * hold at that moment, through the translator, which drops a condition whose value is unset. The export builds the same
 * `where` in the page: one translation per combination of set and unset values, made at export time by that translator,
 * a value placed only where a plain comparison passes it through `parseValue` (the emitted client's `filterValue`).
 *
 * §A the `where` the EMITTED page computes (its own text, evaluated with the emitted `filterValue`) against the runtime
 * node's own `getStorageFilter`, over every value in a matrix, filter by filter. §B what is emitted: the effect, its
 * dependencies, the imports, the typecheck with and without a backend, the wire consumed. §C the refusals, by name.
 */

const PUPPY = path.join(__dirname, 'fixtures', 'puppy-test-3');
const LANDING = 'Pages/Landing';
const QUERY = 'puppyQuery';
const catalog: Catalog = loadCatalog();
const baseIr = parseProject(PUPPY, catalog);

/** What the runtime node asked its adapter, and the body the adapter put on the wire, both as JSON. */
type Asked = Record<string, unknown>;
/** The emitted client's `filterValue`, the one export this file reads. */
interface FilterClient {
  filterValue(value: unknown, dateColumn?: boolean): unknown;
}

const componentOf = (ir: ExportIR, p: string): ComponentIR => ir.components.find((c) => c.path === p)!;
const queryNode = (ir: ExportIR): NodeIR => componentOf(ir, LANDING).nodes.find((n) => n.id === QUERY)!;
const json = (value: unknown): ParamValue => ({ kind: 'json', value }) as ParamValue;
const literal = (value: string | number | boolean): ParamValue => ({ kind: 'literal', value });

/** A Variable node named `name`, its Value wired into the query's `qp-<port>` — a source the export reads in render. */
const wireVariable = (ir: ExportIR, port: string, name = port) => {
  const component = componentOf(ir, LANDING);
  const id = `var-${name}`;
  if (!component.nodes.some((n) => n.id === id)) {
    component.nodes.push({
      id,
      type: 'Variable2',
      catalogRef: 'Variable2',
      parameters: [{ name: 'name', value: literal(name) }],
      declaredPorts: [],
      portCompleteness: 'complete',
      children: []
    } as unknown as NodeIR);
  }
  component.connections.push({ key: `${id}:value->${QUERY}:qp-${port}`, fromId: id, fromProperty: 'value', toId: QUERY, toProperty: `qp-${port}`, kind: 'value' });
};

/** The fixture with the query's parameters replaced by `params` (Class kept) and each of `wired` fed by a Variable. */
const withFilter = (params: Record<string, ParamValue>, wired: string[], edit: (ir: ExportIR) => void = () => undefined): ExportIR => {
  const ir = structuredClone(baseIr);
  const node = queryNode(ir);
  node.parameters = [...node.parameters.filter((p) => p.name === 'collectionName'), ...Object.entries(params).map(([name, value]) => ({ name, value }))];
  for (const port of wired) wireVariable(ir, port);
  edit(ir);
  return ir;
};

const conditions = (type: 'and' | 'or', ...items: unknown[]) => ({ type, conditions: items });
const field = (f: string, operator: string, value?: unknown) => ({ kind: 'field', field: f, operator, ...(value === undefined ? {} : { value }) });
const connected = (f: string, operator: string, port: string) => ({ kind: 'field', field: f, operator, valueSource: 'connected', valuePortName: port });
const rule = (property: string, operator: string, input: string) => ({ property, operator, input });
const bornIsADate = (ir: ExportIR) => ir.project.collections[0].columns.push({ name: 'born', type: 'Date' });

// ---- values ----------------------------------------------------------------------------------------------------

/** A value as it crosses to the runtime arm (JSON), and as the page holds it. */
type Wire = unknown;
const UNSET: Wire = { $undefined: true };
const date = (iso: string): Wire => ({ $date: iso });
const decode = (value: Wire): unknown =>
  value !== null && typeof value === 'object' && '$date' in (value as object)
    ? new Date((value as { $date: string }).$date)
    : value !== null && typeof value === 'object' && '$undefined' in (value as object)
      ? undefined
      : value;

const ONE_VALUE: Wire[] = [UNSET, 'Collie', '', null, 0, 3, false, true, date('2021-06-01T00:00:00.000Z'), '2021-06-01', 'not a date'];
const TWO_VALUES: Wire[][] = [UNSET, 'Collie', 3, date('2021-06-01T00:00:00.000Z')].flatMap((a) => [UNSET, 'Pug', 7].map((b) => [a, b]));

const FILTERS: Array<{ name: string; params: Record<string, ParamValue>; wired: string[]; edit?: (ir: ExportIR) => void }> = [
  { name: 'QueryEditor shape: one wired equal to, beside a typed one', params: { visualFilter: json({ combinator: 'and', rules: [rule('breed', 'equal to', 'breed'), { property: 'available', operator: 'equal to', value: true }] }) }, wired: ['breed'] },
  { name: 'QueryEditor shape: the wired one alone (unset is no where at all)', params: { visualFilter: json({ combinator: 'and', rules: [rule('breed', 'equal to', 'breed')] }) }, wired: ['breed'] },
  { name: 'QueryEditor shape: one value read twice', params: { visualFilter: json({ combinator: 'or', rules: [rule('breed', 'equal to', 'breed'), rule('name', 'not equal to', 'breed')] }) }, wired: ['breed'] },
  { name: 'QueryEditor shape: a range from two values', params: { visualFilter: json({ combinator: 'and', rules: [rule('age', 'greater than or equal to', 'from'), rule('age', 'less than or equal to', 'to')] }) }, wired: ['from', 'to'] },
  { name: 'QueryEditor shape: greater than and less than', params: { visualFilter: json({ combinator: 'or', rules: [rule('age', 'greater than', 'from'), rule('age', 'less than', 'to')] }) }, wired: ['from', 'to'] },
  { name: 'builder shape: connected equalTo beside a typed row', params: { visualFilter: json(conditions('and', connected('breed', 'equalTo', 'qp-breed'), field('available', 'equalTo', true))) }, wired: ['breed'] },
  { name: 'builder shape: connected rows in a nested group', params: { visualFilter: json(conditions('and', field('available', 'equalTo', true), conditions('or', connected('breed', 'equalTo', 'qp-from'), connected('name', 'notEqualTo', 'qp-to')))) }, wired: ['from', 'to'] },
  { name: 'builder shape: the comparisons', params: { visualFilter: json(conditions('and', connected('age', 'greaterThanOrEqualTo', 'qp-from'), connected('age', 'lessThan', 'qp-to'))) }, wired: ['from', 'to'] },
  { name: 'a Date column: a value written as text goes as the date envelope', params: { visualFilter: json(conditions('and', connected('born', 'greaterThan', 'qp-breed'))) }, wired: ['breed'], edit: bornIsADate },
  { name: 'a wired value beside a typed-in parameter the filter also reads', params: { visualFilter: json({ combinator: 'and', rules: [rule('breed', 'equal to', 'breed'), rule('name', 'equal to', 'who')] }), 'qp-who': literal('Rex') }, wired: ['breed'] }
];

const valuesFor = (wired: string[]): Wire[][] => (wired.length === 1 ? ONE_VALUE.map((v) => [v]) : TWO_VALUES);

// ---- the runtime arm -------------------------------------------------------------------------------------------

type RuntimeReading = { failed: string } | { asked: Asked; body: Asked };

const runtimeReadings = (cases: Array<{ ir: ExportIR; values: Record<string, Wire> }>): RuntimeReading[] =>
  JSON.parse(
    execFileSync(process.execPath, [path.join(__dirname, 'helpers', 'runtime-query-arm.js')], {
      input: JSON.stringify(cases.map(({ ir, values }) => ({ parameters: queryNode(ir).parameters, collections: ir.project.collections, values }))),
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024
    })
  );

// ---- the export arm: the emitted page's own text ---------------------------------------------------------------

const loadClient = (source: string): FilterClient => {
  const plain = source.replace(/import\.meta\.env\.VITE_NODEGX_\w+/g, 'undefined');
  const js = ts.transpileModule(plain, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const module: { exports: unknown } = { exports: {} };
  // eslint-disable-next-line no-new-func
  new Function('require', 'module', 'exports', 'fetch', js)(() => ({}), module, module.exports, undefined);
  return module.exports as FilterClient;
};

/** The query's effect in the emitted page: its `where` line, its call and its dependency list. */
const effectOf = (app: EmittedApp) => {
  const page = app.files['src/pages/Landing.tsx'];
  const match = /\n {2}useEffect\(\(\) => \{\n {4}const where = (.*);\n {4}fetchPuppies\((.*)\)\.then\(setPuppies\);\n {2}\}, \[(.*)\]\);\n/.exec(page);
  if (match === null) throw new Error('no wired query effect in the page');
  /** Variable name → its render local (`const breedValue = useValue(breed);`). */
  const locals = new Map([...page.matchAll(/const (\w+) = useValue\((\w+)\);/g)].map((m) => [m[2], m[1]]));
  return { where: match[1], call: match[2], deps: match[3], locals, page };
};

/** Evaluates the emitted `where` with each Variable's local holding its value, through the emitted `filterValue`. */
const pageWhere = (app: EmittedApp, values: Record<string, unknown>): unknown => {
  const { where, locals } = effectOf(app);
  const { filterValue } = loadClient(app.files['src/api/client.ts']);
  const names = [...locals.entries()];
  // eslint-disable-next-line no-new-func
  return new Function('filterValue', ...names.map(([, local]) => local), `return ${where};`)(filterValue, ...names.map(([variable]) => values[variable]));
};

/** What both sides put on the wire is JSON: a Date envelope's `iso` is a string either way. */
const onTheWire = (value: unknown) => (value === undefined ? undefined : JSON.parse(JSON.stringify(value)));

const MATRIX = FILTERS.flatMap((filter) => {
  const ir = withFilter(filter.params, filter.wired, filter.edit);
  return valuesFor(filter.wired).map((values) => ({ filter, ir, values: Object.fromEntries(filter.wired.map((name, i) => [name, values[i]])) }));
});
const READINGS = runtimeReadings(MATRIX.map(({ ir, values }) => ({ ir, values })));
const APPS = new Map(FILTERS.map((filter) => [filter.name, emitApp(MATRIX.find((m) => m.filter === filter)!.ir, catalog)]));

describe('§A the where the page builds, against the runtime node’s own getStorageFilter, value by value', () => {
  test.each(MATRIX.map((m, i) => [`${m.filter.name} — ${JSON.stringify(m.values)}`, i] as const))('%s', (_name, i) => {
    const { filter, values } = MATRIX[i];
    const reading = READINGS[i];
    if ('failed' in reading) throw new Error(`the runtime failed: ${reading.failed}`);
    const decoded = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, decode(v)]));
    expect(onTheWire(pageWhere(APPS.get(filter.name)!, decoded))).toEqual(onTheWire(reading.asked.where));
  });

  test('the matrix reaches every case: each filter both drops and keeps a condition', () => {
    for (const filter of FILTERS) {
      const wheres = MATRIX.map((m, i) => ({ m, r: READINGS[i] })).filter(({ m }) => m.filter === filter).map(({ r }) => JSON.stringify('asked' in r ? r.asked.where : r));
      expect(new Set(wheres).size).toBeGreaterThan(1);
    }
  });
});

// ---- §B ------------------------------------------------------------------------------------------------------------

describe('§B what is emitted', () => {
  const app = APPS.get(FILTERS[0].name)!;

  test('the effect reads the value in render, asks again when it changes, and drops the condition while it is unset', () => {
    expect(app.files['src/pages/Landing.tsx']).toContain(
      [
        '  const breedValue = useValue(breed);',
        ''
      ].join('\n')
    );
    expect(app.files['src/pages/Landing.tsx']).toContain(
      [
        '  // "Query available puppies" asks again whenever "breed" changes (dbcollectionnode2.ts setQueryParameter).',
        '  useEffect(() => {',
        '    const where = breedValue === undefined ? {"available":{"$eq":true}} : {"$and":[{"breed":{"$eq":filterValue(breedValue)}},{"available":{"$eq":true}}]};',
        '    fetchPuppies({ where }).then(setPuppies);',
        '  }, [breedValue]);'
      ].join('\n')
    );
  });

  // "Hold the id" (s122): a Run-wired Function's output is a value this effect reads too, through its row (§4f), keyed on
  // the field it reads (a run hands the row a fresh copy each time; the runtime sends nothing for a value it already holds).
  test('a Run-wired Function feeding the value: the effect reads its row, keyed on the field', () => {
    const ir = withFilter(FILTERS[0].params, [], (edited) => {
      const component = componentOf(edited, LANDING);
      component.nodes.push({
        id: 'holdBreed',
        type: 'JavaScriptFunction',
        authoredLabel: 'Hold the breed',
        catalogRef: 'JavaScriptFunction',
        parameters: [{ name: 'functionScript', value: { kind: 'script', source: "Outputs.breed = 'Collie';" } }],
        declaredPorts: [],
        portCompleteness: 'complete',
        children: []
      } as unknown as NodeIR);
      component.connections.push(
        { key: 'page:didMount->holdBreed:run', fromId: 'page', fromProperty: 'didMount', toId: 'holdBreed', toProperty: 'run', kind: 'signal' },
        { key: `holdBreed:out-breed->${QUERY}:qp-breed`, fromId: 'holdBreed', fromProperty: 'out-breed', toId: QUERY, toProperty: 'qp-breed', kind: 'value' }
      );
    });
    const page = emitApp(ir, catalog).files['src/pages/Landing.tsx'];
    expect(page).toContain('    const breedValue = holdTheBreedOut?.breed;');
    expect(page).toContain('  }, [holdTheBreedOut?.breed]);');
  });

  test('two values: a conditional on each, every combination the translator’s own document', () => {
    const { where, deps } = effectOf(APPS.get(FILTERS[3].name)!);
    expect(deps).toBe('fromValue, toValue');
    expect(where).toBe(
      'fromValue === undefined ? (toValue === undefined ? undefined : {"age":{"$lte":filterValue(toValue)}}) : (toValue === undefined ? {"age":{"$gte":filterValue(fromValue)}} : {"$and":[{"age":{"$gte":filterValue(fromValue)}},{"age":{"$lte":filterValue(toValue)}}]})'
    );
  });

  test('a Date column passes the column’s type to filterValue', () => {
    expect(effectOf(APPS.get(FILTERS[8].name)!).where).toBe('breedValue === undefined ? undefined : {"born":{"$gt":filterValue(breedValue, true)}}');
  });

  test('the client exports filterValue and the page imports it; the wire is consumed, with no note', () => {
    expect(app.files['src/api/client.ts']).toContain('export function filterValue(value: unknown, dateColumn = false): unknown {');
    expect(app.files['src/pages/Landing.tsx']).toContain("import { filterValue } from '../api/client';");
    expect(app.notes.filter((n) => n.includes('qp-'))).toEqual([]);
  });

  test('a query whose Filter reads no wire ships no filterValue', () => {
    const plain = emitApp(withFilter({ visualFilter: json({ combinator: 'and', rules: [rule('breed', 'equal to', 'breed')] }), 'qp-breed': literal('Pug') }, []), catalog);
    expect(plain.files['src/api/client.ts']).not.toContain('filterValue');
    expect(plain.files['src/pages/Landing.tsx']).toContain('    fetchPuppies({ where: {"breed":{"$eq":"Pug"}} }).then(setPuppies);');
  });

  test.each(FILTERS.map((f) => [f.name] as const))('the app typechecks: %s', (name) => {
    expect(typecheckEmittedApp(APPS.get(name)!)).toEqual([]);
  });

  test('with no backend the stub takes the where, which carries the raw values, and typechecks', () => {
    const stub = emitApp(withFilter(FILTERS[3].params, FILTERS[3].wired, (ir) => delete ir.project.cloudservices), catalog);
    const { where } = effectOf(stub);
    expect(where).not.toContain('filterValue');
    expect(where).toContain('{"age":{"$gte":fromValue}}');
    expect(stub.files['src/pages/Landing.tsx']).not.toContain("from '../api/client'");
    expect(typecheckEmittedApp(stub)).toEqual([]);
  });
});

// ---- §C ------------------------------------------------------------------------------------------------------------

const ONE = { visualFilter: json({ combinator: 'and', rules: [rule('breed', 'equal to', 'breed')] }) };
const refusalOf = (ir: ExportIR): string | undefined => {
  const settings = querySettingsOf(queryNode(ir), componentOf(ir, LANDING), ir.project.collections);
  return 'refuse' in settings ? settings.refuse : undefined;
};
const wireFrom = (ir: ExportIR, toProperty: string, fromId = 'x', fromProperty = 'value') =>
  componentOf(ir, LANDING).connections.push({ key: `${fromId}:${fromProperty}->${QUERY}:${toProperty}`, fromId, fromProperty, toId: QUERY, toProperty, kind: 'value' });

describe('§C what it cannot build the same way is refused by name, and says so in the report', () => {
  test('a wired Fetch is not refused: the value is read when Fetch is sent, its box unticked or not (P18-S116-QUERYFETCH, `the-query-fetch.test.ts`)', () => {
    expect(refusalOf(withFilter(ONE, ['breed'], (ir) => wireFrom(ir, 'storageFetch', 'button', 'onClick')))).toBeUndefined();
    expect(refusalOf(withFilter({ ...ONE, 'runOnChange-qp-breed': literal(false) }, ['breed'], (ir) => wireFrom(ir, 'storageFetch', 'button', 'onClick')))).toBeUndefined();
  });

  test('an unticked Run On Value Change box', () => {
    expect(refusalOf(withFilter({ ...ONE, 'runOnChange-qp-breed': literal(false) }, ['breed']))).toBe(
      'its Run On Value Change box for "breed" is unticked, so a new value waits for a fetch something else starts — not exported in this slice'
    );
    expect(refusalOf(withFilter({ ...ONE, 'runOnChange-qp-breed': literal(true) }, ['breed']))).toBeUndefined();
  });

  test('two wires into one input, and a wired input that holds a typed-in value too', () => {
    expect(refusalOf(withFilter(ONE, ['breed'], (ir) => wireFrom(ir, 'qp-breed')))).toBe('two wires feed its "breed" input — last-writer-wins is not statically ordered');
    expect(refusalOf(withFilter({ ...ONE, 'qp-breed': literal('Pug') }, ['breed']))).toBe(
      'its "breed" input is wired and holds a typed-in value too — which one the first fetch reads is not exported in this slice'
    );
  });

  test('more than three wired values', () => {
    const four = ['a', 'b', 'c', 'd'];
    expect(refusalOf(withFilter({ visualFilter: json({ combinator: 'and', rules: four.map((n) => rule(n, 'equal to', n)) }) }, four))).toBe(
      'its Filter reads 4 values from wired inputs; the export builds a `where` from at most 3'
    );
    expect(refusalOf(withFilter({ visualFilter: json({ combinator: 'and', rules: four.slice(1).map((n) => rule(n, 'equal to', n)) }) }, four.slice(1)))).toBeUndefined();
  });

  test.each([
    ['a lowered regex', conditions('and', connected('name', 'startsWith', 'qp-breed')), '$regex on "name"'],
    ['an $in list', conditions('and', connected('breed', 'containedIn', 'qp-breed')), '$in on "breed"'],
    ['a relation', conditions('and', { kind: 'relation', relationProperty: 'puppies', relationClass: 'Owner', valueSource: 'connected', valuePortName: 'qp-breed' }), 'objectId']
  ])('a wired value anywhere but a plain comparison: %s', (_name, filter, where) => {
    expect(refusalOf(withFilter({ visualFilter: json(filter) }, ['breed']))).toBe(
      `its Filter puts the value of "breed" somewhere other than a plain comparison (${where}), which the runtime reshapes per value — not exported in this slice`
    );
  });

  test('a source the export cannot read is refused where the query is read, and reaches the report', () => {
    const app = emitApp(withFilter(ONE, [], (ir) => wireFrom(ir, 'qp-breed', 'nameInput', 'value')), catalog);
    expect(app.notes).toContain(
      'Pages/Landing: wire puppyQuery:items->repeater:items dropped: the Query Records it reads is not exported: its Filter reads "breed" from a wire the export cannot read: no statically known source'
    );
    expect(app.files['src/pages/Landing.tsx']).not.toContain('fetchPuppies');
  });

  test('a value read off the query’s own rows', () => {
    const app = emitApp(withFilter(ONE, [], (ir) => wireFrom(ir, 'qp-breed', QUERY, 'items')), catalog);
    expect(app.notes.join('\n')).toContain('its Filter reads "breed" from a wire the export cannot read');
    expect(app.files['src/pages/Landing.tsx']).not.toContain('fetchPuppies');
  });
});
