/**
 * P112-OWN026-QUERYFILTERSHAPE — an agent could not learn how to filter a Query Records node on the server.
 *
 * `get_node_type DbCollection2` showed `inputs: []` and said the filter ports came from an editor adapter; the write
 * gate took a made-up `querySettings` parameter without a word (the runtime stores any name and reads none of them);
 * and the only filtering example filtered on the client. So the agent fetched every user's rows and dropped the others
 * in a Function: every row reached every browser.
 *
 * Graded through the doors an agent uses:
 *  1. `get_node_type` (summary, `ports`, full) carries the real shape: `visualFilter` rules, the operators, and that a
 *     rule's `input` mints `qp-<name>`; full detail still fits its byte budget.
 *  2. `create_component` refuses a made-up query shape with the real one in the suggestion, and takes the real one in
 *     both saved shapes, with a wire into the `qp-` port a rule names (and refuses one into a `qp-` port none names).
 *  3. `list_examples` finds `cloud-query-own-rows` by the words an agent searched with, and its components pass the
 *     same write gate with no error and no warning.
 *  4. The check's copied tables are the runtime's: the operators the translators read, and the parameter names the
 *     catalog (generated from the runtime) records for the node.
 */
import { FILTER_OPERATORS, visualQueryToNeutral } from '../../nodegx-backend-contract/src/translators';
import {
  QUERY_RECORDS_PARAMETERS,
  SAVED_FILTER_OPERATORS,
  VISUAL_FILTER_OPERATORS
} from '../../noodl-editor/src/editor/src/validation/queryFilterShape';
import { getExample, listExamples } from '../src/catalog';
import { FULL_DETAIL_BYTE_BUDGET } from '../src/tools/catalogTools';
import { call, connect, copyFixture, TestSession } from './helpers';

jest.setTimeout(60000);

const ID = 'cloud-query-own-rows';
const CODE = 'query-records-shape';
const REAL_SHAPE = '"visualFilter": {"combinator": "and", "rules": [{"property": "<field>", "operator": "equal to", "input": "<name>"}]}';

const wire = (fromId: string, fromProperty: string, toId: string, toProperty: string) => ({ fromId, fromProperty, toId, toProperty });

interface Diagnostic {
  code: string;
  severity: string;
  message: string;
  suggestion?: string;
  location: { nodeId?: string; port?: string };
}

/** Every diagnostic a write answered with — a refusal's `newErrors`, or an accepted write's report. */
function diagnosticsOf(res: { isError: boolean; data: unknown }): Diagnostic[] {
  const text = JSON.stringify(res.data);
  const found: Diagnostic[] = [];
  JSON.parse(text, (_k, v) => {
    if (v && typeof v === 'object' && typeof v.code === 'string' && typeof v.severity === 'string' && v.location) found.push(v);
    return v;
  });
  return found;
}
const ours = (res: { isError: boolean; data: unknown }) => diagnosticsOf(res).filter((d) => d.code === CODE);

describe('P112-OWN026-QUERYFILTERSHAPE — get_node_type says how Query Records filters on the server', () => {
  let session: TestSession;
  beforeAll(async () => {
    session = await connect(copyFixture());
  });
  afterAll(async () => session?.close());

  it('the default summary carries the visualFilter shape, the qp- port, the operators and the fetch-at-build trap', async () => {
    const res = await call<{ types: Array<{ runtimeBehavior?: string; examples: Array<{ id: string }> }> }>(session, 'get_node_type', {
      type_names: ['DbCollection2']
    });
    const [t] = res.data.types;
    expect(t.runtimeBehavior).toContain('visualFilter');
    expect(t.runtimeBehavior).toContain('"operator": "equal to", "input": "<name>"');
    expect(t.runtimeBehavior).toContain('qp-<name>');
    expect(t.runtimeBehavior).toContain('"greater than or equal to"');
    expect(t.runtimeBehavior).toContain('"runOnChange-querySettings": false');
    expect(t.runtimeBehavior).not.toContain('editor-adapter');
    expect(t.examples.map((e) => e.id)).toContain(ID);
  });

  it('asking for the guessed port answers notFound AND the shape, not notFound alone', async () => {
    const res = await call<{ types: Array<{ notFound?: string[]; runtimeBehavior?: string }> }>(session, 'get_node_type', {
      type_names: ['DbCollection2'],
      ports: ['querySettings']
    });
    const [t] = res.data.types;
    expect(t.notFound).toEqual(['querySettings']);
    expect(t.runtimeBehavior).toContain('visualFilter');
    expect(t.runtimeBehavior).toContain('querySettings');
  });

  it('full detail names the parameters (not an adapter) and still fits the byte budget', async () => {
    const res = await call<{ types: Array<{ dynamicPorts?: { mechanisms: string[]; description?: string } }>; summarized?: string[] }>(
      session,
      'get_node_type',
      { type_names: ['DbCollection2'], detail: 'full' }
    );
    const [t] = res.data.types;
    expect(t.dynamicPorts?.description).toContain('"visualFilter"');
    expect(t.dynamicPorts?.description).toContain('"qp-<name>"');
    expect(t.dynamicPorts?.description).not.toContain('QueryRecordsAdapter');
    expect(t.dynamicPorts?.mechanisms).not.toContain('editor-adapter');
    expect(res.data.summarized).toBeUndefined();
    expect(JSON.stringify(t).length).toBeLessThan(FULL_DETAIL_BYTE_BUDGET);
  });
});

describe('P112-OWN026-QUERYFILTERSHAPE — the write gate refuses a made-up query shape and names the real one', () => {
  let session: TestSession;
  let n = 0;
  beforeAll(async () => {
    session = await connect(copyFixture());
  });
  afterAll(async () => session?.close());

  const RULES = { combinator: 'and', rules: [{ property: 'ownerId', operator: 'equal to', input: 'ownerId' }] };

  /** A component querying Note with these parameters, the signed-in user's id wired into `to`. */
  const write = (parameters: Record<string, unknown>, to = 'qp-ownerId') =>
    call(session, 'create_component', {
      path: `Query/Probe${++n}`,
      nodes: [
        { id: `me${n}`, type: 'net.noodl.user.User' },
        { id: `q${n}`, type: 'DbCollection2', parameters: { collectionName: 'Note', 'runOnChange-collectionName': false, 'runOnChange-querySettings': false, ...parameters } }
      ],
      connections: [wire(`me${n}`, 'id', `q${n}`, to)]
    });

  it.each([
    ['a querySettings object', { querySettings: { filter: { ownerId: 'x' } } }, 'querySettings'],
    ['a filter parameter', { filter: { ownerId: 'x' } }, 'filter'],
    ['a where parameter', { where: { ownerId: { $eq: 'x' } } }, 'where'],
    ['a Parse where as the visualFilter', { visualFilter: { ownerId: 'x' } }, 'visualFilter'],
    ['an operator the filter does not know', { visualFilter: { combinator: 'and', rules: [{ property: 'ownerId', operator: '==', input: 'ownerId' }] } }, 'visualFilter'],
    ['a saved-shape operator in a rules filter', { visualFilter: { combinator: 'and', rules: [{ property: 'ownerId', operator: 'equalTo', input: 'ownerId' }] } }, 'visualFilter'],
    ['a rule with no property', { visualFilter: { combinator: 'and', rules: [{ operator: 'equal to', input: 'ownerId' }] } }, 'visualFilter'],
    ['a sort row that is not {property, order}', { visualFilter: RULES, visualSort: [{ field: 'createdAt', direction: 'desc' }] }, 'visualSort']
  ])('refuses %s, at the port, with the real shape in the suggestion', async (_name, parameters, port) => {
    const res = await write(parameters);
    expect(res.isError).toBe(true);
    const found = ours(res);
    expect(found.length).toBeGreaterThanOrEqual(1);
    expect(found.map((d) => d.location.port)).toContain(port);
    expect(found[0].severity).toBe('error');
    expect(found[0].suggestion).toContain(REAL_SHAPE);
    expect(found[0].suggestion).toContain('qp-<name>');
  });

  it('attaches cloud-query-own-rows to the refusal (LAS-007), its graph on the first one', async () => {
    const fresh = await connect(copyFixture());
    try {
      const res = await call<{ error: { details: { examples?: { recipes: Array<{ code: string; exampleId: string; fragment?: unknown }> } } } }>(
        fresh,
        'create_component',
        {
          path: 'Query/Attached',
          nodes: [{ id: 'q', type: 'DbCollection2', parameters: { collectionName: 'Note', querySettings: { filter: { ownerId: 'x' } } } }]
        }
      );
      expect(res.isError).toBe(true);
      const recipe = res.data.error.details.examples?.recipes.find((r) => r.code === CODE);
      expect(recipe?.exampleId).toBe(ID);
      expect(JSON.stringify(recipe?.fragment)).toContain('qp-owner'); // FIX-05: the server's own field
    } finally {
      await fresh.close();
    }
  });

  it('refuses a wire into a qp- port no rule names, and says which ports the filter makes', async () => {
    const res = await write({ visualFilter: RULES }, 'qp-owner');
    expect(res.isError).toBe(true);
    const [d] = ours(res);
    expect(d.location.port).toBe('qp-owner');
    expect(d.message).toContain('"qp-ownerId"');
  });

  it.each([
    ['the rules shape, wired into the port its rule names', { visualFilter: RULES, visualSort: [{ property: 'createdAt', order: 'descending' }], storageEnableLimit: true, storageLimit: 20 }],
    ['a nested or-group with a literal value beside the wired one', { visualFilter: { combinator: 'and', rules: [RULES.rules[0], { combinator: 'or', rules: [{ property: 'done', operator: 'equal to', value: false }, { property: 'due', operator: 'exist' }] }] } }],
    ['the editor’s saved shape', { visualFilter: { type: 'and', conditions: [{ field: 'ownerId', operator: 'equalTo', valueSource: 'connected', valuePortName: 'qp-ownerId' }] } }],
    ['a half-finished empty rule and sort row the editor leaves behind', { visualFilter: { combinator: 'and', rules: [RULES.rules[0], {}] }, visualSort: [{}] }]
  ])('takes %s', async (_name, parameters) => {
    const res = await write(parameters);
    // eslint-disable-next-line no-console
    if (res.isError) console.log(JSON.stringify(res.data).slice(0, 2000));
    expect(res.isError).toBe(false);
    expect(ours(res)).toEqual([]);
  });
});

describe('P112-OWN026-QUERYFILTERSHAPE — the example an agent finds', () => {
  it.each([
    'filter the query on the server owner',
    'filter the query on the server owner isolation',
    'only my records',
    'server-side filter',
    'owner',
    'where'
  ])('is found by "%s"', (query) => {
    const ids = listExamples({ query }).map((r) => r.id);
    expect(ids).toContain(ID);
    if (query.includes(' ')) expect(ids.indexOf(ID)).toBeLessThan(3);
  });

  it('says what creatorOwns already does, and that the filter narrows further', () => {
    const description = getExample(ID)!.description!;
    expect(description).toContain('creatorOwns');
    expect(description).toContain('narrow further');
  });

  it('passes the write gate with no error and no warning, its filter wired from the User id into qp-owner', async () => {
    const session = await connect(copyFixture());
    try {
      const example = getExample(ID)!;
      // the row first: the list names it as its template
      for (const component of [...example.components].reverse()) {
        const res = await call(session, 'create_component', {
          path: component.name.slice(1),
          nodes: component.nodes,
          connections: component.connections ?? []
        });
        // eslint-disable-next-line no-console
        if (res.isError) console.log(JSON.stringify(res.data).slice(0, 2000));
        expect(res.isError).toBe(false);
        const report = await call<{ summary: { errors: number; warnings: number }; diagnostics: Diagnostic[] }>(session, 'validate_component', {
          path: component.name.slice(1)
        });
        expect(report.data.summary).toEqual(expect.objectContaining({ errors: 0, warnings: 0 }));
      }
      const page = example.components.find((c) => c.name === '/My Notes')!;
      expect(page.connections).toContainEqual(wire('me', 'id', 'my_notes', 'qp-owner'));
    } finally {
      await session.close();
    }
  });
});

describe('P112-OWN026-QUERYFILTERSHAPE — the check’s copied tables are the runtime’s', () => {
  it('the saved-shape operators are backend-contract’s FILTER_OPERATORS', () => {
    expect([...SAVED_FILTER_OPERATORS].sort()).toEqual([...FILTER_OPERATORS].sort());
  });

  it('every rules-shape operator the check takes is one the translator reads, and a made-up one is dropped', () => {
    const read = (operator: string) =>
      visualQueryToNeutral({ property: 'p', operator, value: 'v', relationProperty: 'r', relatedTo: 'C' }, {});
    for (const op of VISUAL_FILTER_OPERATORS) expect([op, read(op)]).not.toEqual([op, null]);
    expect(read('==')).toBeNull();
    expect(read('equalTo')).toBeNull();
  });

  it('every parameter name the catalog records for Query Records is one the check takes', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const catalog = require('../../noodl-types/src/node-catalog.json');
    const node = catalog.nodes.find((x: { typeName: string }) => x.typeName === 'DbCollection2');
    const names: string[] = node.parameterEncoding.patterns.map((p: { pattern: string }) => p.pattern);
    expect(names.length).toBeGreaterThan(5);
    for (const name of names.filter((x) => !x.startsWith('runOnChange-'))) expect(QUERY_RECORDS_PARAMETERS).toContain(name);
  });
});
