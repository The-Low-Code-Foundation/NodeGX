/**
 * P107 R37 (s101) — a cloud node's settings, drawn from its spec, are the panel its own runtime hook would announce.
 *
 * `models/nodelibrary/cloudSpecPorts.ts` draws a node in a cloud function from `drawnPorts(spec, params, context)`, because
 * no runtime client runs there since WF-007 (P107-S100-CLOUDSETUPPORTS). The reference is the hook it replaces: each case
 * fires the type's real `setup()` against a fake connected editor over the same metadata (as
 * `tests-unit/sb-017/cloud-ports-agree-with-the-runtime.test.ts` does) and lays its last announcement over the spec's
 * draw in the editor's port shape — name, plug, type and its panel fields (an enum's `{ value, label }`, edit-only,
 * connections-only, the code editor, the filter builder's prefix and backend), display name, group, default.
 *
 * Spelled either way and compared as one: a type with no field but its name (`{ name: 'boolean' }` is `'boolean'`).
 * Not compared, by name: `index` and `editorName` (the runtime's ordering and search hints; the editor orders a dynamic
 * port after the static ones), and the filter builder's `schema` beyond its columns and their types (the Aggregate hook
 * hands the cached column objects whole, `classProperties`).
 */

import {
  CLOUD_RULE_DRAWN_TYPES,
  CLOUD_SPEC_ONLY_TYPES,
  CLOUD_SPEC_PORT_TYPES,
  gradedCloudTypes,
  keepWiredSavedPorts,
  specPortsForNode
} from '@noodl-models/nodelibrary/cloudSpecPorts';
import { QUERY_TYPES, RECORD_READ_TYPES, RECORD_WRITE_TYPES, SCRIPT_PORT_TYPES, type GeneratedPort } from '@noodl-models/nodelibrary/cloudDynamicPorts';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const cloudLibrary = require('../../src/editor/src/models/nodelibrary/cloud-node-library.json') as { nodetypes: { name: string }[] };

const PACKAGES = '../../..';
const AGGREGATE = `${PACKAGES}/noodl-viewer-cloud/src/nodes/data/aggregatenode`;
const QUERY = `${PACKAGES}/noodl-runtime/src/nodes/std-library/data/dbcollectionnode2`;

/** A class as `schemahandler.ts` stores it from our backend (`{ name, columns }`), and the accounts class as Parse keeps it. */
const METADATA = {
  dbCollections: [{ name: 'Lesson', columns: [{ name: 'title', type: 'String' }, { name: 'n', type: 'Number' }] }]
};

type Announced = GeneratedPort & { type?: unknown };

/** The type's own hook, fired as a connected editor fires it: `nodeAdded.<type>`, then `editorImportComplete`; its last announcement. */
function announced(modulePath: string, type: string, parameters: Record<string, unknown>, metadata: Record<string, unknown>): Announced[] {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require(modulePath);
  const setup = mod.setup ?? mod.default?.setup;
  const handlers: Record<string, ((arg?: unknown) => void)[]> = {};
  const node = {
    id: 'n1',
    type,
    parameters: { ...parameters },
    component: { name: '/#__cloud__/spec', getConnectionsTo: () => [], getConnectionsFrom: () => [], on: () => undefined },
    on: () => undefined
  };
  const graphModel = {
    getNodesWithType: (t: string) => (t === type ? [node] : []),
    getMetaData: (key: string) => metadata[key],
    on: (name: string, cb: (arg?: unknown) => void) => (handlers[name] = handlers[name] ?? []).push(cb),
    components: {}
  };
  const announcements: Announced[][] = [];
  setup(
    {
      editorConnection: {
        isRunningLocally: () => true,
        isConnected: () => false,
        sendDynamicPorts: (id: string, ports: Announced[]) => id === node.id && announcements.push(ports),
        sendWarning: () => undefined,
        clearWarning: () => undefined
      }
    },
    graphModel
  );
  for (const cb of handlers['nodeAdded.' + type] ?? []) cb(node);
  for (const cb of handlers.editorImportComplete ?? []) cb();
  return announcements.length ? announcements[announcements.length - 1] : [];
}

/** One port as the panel reads it, the fields not compared left out (the docblock). */
function shape(p: Announced): Record<string, unknown> {
  const t = p.type as Record<string, unknown> | string | undefined;
  let type: unknown = t;
  if (t && typeof t === 'object') {
    const { schema, ...rest } = t as Record<string, unknown>;
    type = { ...rest };
    if (Array.isArray(rest.enums)) {
      (type as Record<string, unknown>).enums = (rest.enums as unknown[]).map((e) =>
        e && typeof e === 'object' ? { value: (e as { value: unknown }).value, label: (e as { label: unknown }).label ?? (e as { value: unknown }).value } : { value: e, label: e }
      );
    }
    if (schema && typeof schema === 'object' && 'properties' in (schema as object)) {
      const props = (schema as { properties: Record<string, { type?: string }> }).properties;
      (type as Record<string, unknown>).columns = Object.fromEntries(Object.entries(props).map(([k, v]) => [k, v.type]));
    }
  }
  // `{ name: 'boolean' }` and `'boolean'` are one type to the editor (`NodeGraphNode` reads either)
  if (type && typeof type === 'object' && Object.keys(type as object).length === 1) type = (type as { name: unknown }).name;
  return { name: p.name, plug: p.plug, type, displayName: p.displayName, group: p.group, default: p.default };
}

const sorted = (ports: Announced[]) => ports.map(shape).sort((a, b) => String(a.plug + ' ' + a.name).localeCompare(String(b.plug + ' ' + b.name)));

const CASES: Array<{ name: string; module: string; type: string; params: Record<string, unknown>; metadata?: Record<string, unknown> }> = [
  { name: 'a new Aggregate Records, no classes known', module: AGGREGATE, type: 'noodl.cloud.aggregate', params: {}, metadata: {} },
  { name: 'a new Aggregate Records on our backend', module: AGGREGATE, type: 'noodl.cloud.aggregate', params: {} },
  { name: 'Aggregate: a Class: the Filter builder', module: AGGREGATE, type: 'noodl.cloud.aggregate', params: { collectionName: 'Lesson' } },
  {
    name: 'Aggregate: two aggregates, a number and a text column chosen, one not yet',
    module: AGGREGATE,
    type: 'noodl.cloud.aggregate',
    params: { collectionName: 'Lesson', aggregates: 'total,names,later', 'aggprop-total': 'n', 'aggprop-names': 'title' }
  },
  {
    name: 'Aggregate: a saved filter with a connected value',
    module: AGGREGATE,
    type: 'noodl.cloud.aggregate',
    params: { collectionName: 'Lesson', visualFilter: { type: 'and', conditions: [{ field: 'n', operator: 'greaterThan', valueSource: 'connected', valuePortName: 'qp-min' }] } }
  },
  { name: 'Aggregate: the Javascript filter', module: AGGREGATE, type: 'noodl.cloud.aggregate', params: { collectionName: 'Lesson', storageFilterType: 'json' } },
  { name: 'a new Query Records, no classes known', module: QUERY, type: 'DbCollection2', params: {}, metadata: {} },
  { name: 'Query Records: a Class: the Filter and Sort builders', module: QUERY, type: 'DbCollection2', params: { collectionName: 'Lesson' } },
  {
    name: 'Query Records: a saved filter with a connected value',
    module: QUERY,
    type: 'DbCollection2',
    params: { collectionName: 'Lesson', visualFilter: { type: 'and', conditions: [{ field: 'n', operator: 'greaterThan', valueSource: 'connected', valuePortName: 'qp-min' }] } }
  },
  {
    // the Record family's columns, an access rule's Target labels and its connections-only User Id
    name: 'Update Record: a Class, a column parameter, a user rule',
    module: `${PACKAGES}/noodl-runtime/src/nodes/std-library/data/setdbmodelpropertiesnode`,
    type: 'SetDbModelProperties',
    params: { collectionName: 'Lesson', 'prop-title': 'x', accessControl: [{ id: 'a1', label: 'Owner' }] }
  }
];

describe('R37: a cloud node drawn from its spec is the panel its runtime hook would announce', () => {
  (globalThis as unknown as Record<string, unknown>).Noodl = { deployed: false, baseUrl: '/' };

  test.each(CASES.map((c) => [c.name, c] as const))('%s', (_name, c) => {
    const metadata = c.metadata ?? METADATA;
    const runtime = announced(c.module, c.type, c.params, metadata);
    const spec = specPortsForNode({ id: 'n1', parameters: c.params }, c.type, [], { metadata });
    expect(runtime.length).toBeGreaterThan(0); // known-firing: the hook ran and announced
    expect(sorted(spec as Announced[])).toEqual(sorted(runtime));
  });

  test('the driven defect: a new Aggregate Records has Class, Filter and Do; a Class adds the Filter builder; a chosen column its Property, Operation and output', () => {
    const names = (params: Record<string, unknown>) => specPortsForNode({ id: 'n1', parameters: params }, 'noodl.cloud.aggregate', [], { metadata: METADATA }).map((p) => p.name);
    expect(names({})).toEqual(['collectionName', 'storageFilterType', 'storageFetch']);
    expect(names({ collectionName: 'Lesson' })).toContain('visualFilter');
    expect(names({ collectionName: 'Lesson', aggregates: 'total', 'aggprop-total': 'n' })).toEqual(
      expect.arrayContaining(['aggprop-total', 'aggop-total', 'agg-total'])
    );
  });

  test('a wired port the params do not draw keeps its port (the runtime registers it on the wire): no deploy drops it', () => {
    const params = { collectionName: 'Gone', aggregates: 'total', 'aggprop-total': 'n' };
    const wires = [
      { fromId: 'n1', fromProperty: 'agg-total', toId: 'sink', toProperty: 'in' },
      { fromId: 'src', fromProperty: 'out', toId: 'n1', toProperty: 'qp-min' },
      { fromId: 'n1', fromProperty: 'nonsense', toId: 'sink', toProperty: 'in' }
    ];
    const ports = specPortsForNode({ id: 'n1', parameters: params }, 'noodl.cloud.aggregate', wires, { metadata: {} });
    // the class is not in the metadata: no Property, no Filter — but the two wired names the runtime registers are drawn
    expect(ports.map((p) => p.plug + ' ' + p.name)).toEqual(
      expect.arrayContaining(['output agg-total', 'input qp-min'])
    );
    expect(ports.map((p) => p.name)).not.toContain('aggprop-total');
    // control: a name the runtime would not register is not minted by the wire
    expect(ports.map((p) => p.name)).not.toContain('nonsense');
  });
});

describe('R37: which cloud types are drawn from their spec', () => {
  const library = cloudLibrary.nodetypes.map((t) => t.name);

  test('every graded cloud type with derived ports is drawn from its spec or by its rule, and nothing else is', () => {
    expect([...CLOUD_SPEC_PORT_TYPES, ...CLOUD_RULE_DRAWN_TYPES].sort()).toEqual(gradedCloudTypes(library).sort());
  });

  test('the rule-drawn types really have a namedports/list rule (their writer), and the spec-drawn ones none', () => {
    const lib = cloudLibrary.nodetypes as Array<{ name: string; dynamicports?: { name: string }[] }>;
    const ruled = (t: string) => !!lib.find((n) => n.name === t)?.dynamicports?.some((d) => d.name === 'namedports/list');
    for (const t of CLOUD_RULE_DRAWN_TYPES) expect([t, ruled(t)]).toEqual([t, true]);
    for (const t of CLOUD_SPEC_PORT_TYPES) expect([t, ruled(t)]).toEqual([t, false]);
  });

  test('one writer per type: the four cloud adapters\' type lists are disjoint and cover every spec-drawn type', () => {
    // CloudScriptPorts, CloudRecordPorts, CloudQueryPorts, CloudSpecPorts (CloudDynamicPortsAdapter.ts), in that order
    const owned = [...SCRIPT_PORT_TYPES, ...RECORD_WRITE_TYPES, ...RECORD_READ_TYPES, ...QUERY_TYPES, ...CLOUD_SPEC_ONLY_TYPES];
    expect(new Set(owned).size).toBe(owned.length);
    for (const t of CLOUD_SPEC_PORT_TYPES) expect(owned).toContain(t);
    expect(CLOUD_SPEC_ONLY_TYPES).toContain('noodl.cloud.aggregate');
    expect(CLOUD_SPEC_ONLY_TYPES).not.toContain('DbCollection2');
  });

  test('a type not in the list draws nothing from its spec', () => {
    expect(specPortsForNode({ id: 'n1', parameters: { params: 'a' } }, 'noodl.cloud.request', [], { metadata: {} })).toEqual([]);
  });
});

describe('R37: a redraw never takes a wired port away', () => {
  test('a saved port a wire uses and the draw does not name is kept; an unwired one goes; a drawn one is not doubled', () => {
    const saved = [
      { name: 'storageFilterValue-ParentRecordId', plug: 'input', type: { name: '*', allowConnectionsOnly: true } },
      { name: 'storageFilterValue-Unwired', plug: 'input', type: '*' },
      { name: 'prop-Test', plug: 'input/output', type: '*' },
      { name: 'collectionName', plug: 'input', type: 'string' }
    ];
    const wires = [
      { fromId: 'src', fromProperty: 'out', toId: 'n1', toProperty: 'storageFilterValue-ParentRecordId' },
      { fromId: 'n1', fromProperty: 'prop-Test', toId: 'sink', toProperty: 'in' },
      { fromId: 'src', fromProperty: 'out', toId: 'n1', toProperty: 'collectionName' }
    ];
    const drawn = [{ name: 'collectionName', plug: 'input', type: 'enum' }];
    const kept = keepWiredSavedPorts(drawn, saved, 'n1', wires).map((p) => p.plug + ' ' + p.name);
    expect(kept).toEqual(['input collectionName', 'input storageFilterValue-ParentRecordId', 'input/output prop-Test']);
  });
});
