/**
 * P109-S8-ARRAYFILTERPATH — Array Filter tests a field inside a field (ruled 2026-10-05, "Yes, exact name first").
 *
 * `owner.id` in the filter list means the `id` inside `owner`, unless a row HAS a field literally named `owner.id` —
 * then that one. Measured before the ruling: 0 of 253 filter keys in 55 projects contain a dot, so no existing list
 * reads differently. A step that is missing or not an object makes the field absent, which every operator already
 * treats one way: Not Equals keeps the row, the others drop it.
 */
import Collection from '../src/collection';
import Model from '../src/model';
import type { NodeInstance, NodeModule } from '@noodl/types';

import { createCorpusGraph } from './corpus/graph-harness';

import FilterCollectionModule = require('../src/nodes/std-library/data/filtercollectionnode');

const Source: NodeModule = {
  node: {
    name: 'p109path.Source',
    category: 'Test',
    outputs: { value: { type: '*', getter: function (this: NodeInstance) { return this._internal.value; } } },
    methods: {
      send(this: NodeInstance, value: unknown) {
        this._internal.value = value;
        this.flagOutputDirty('value');
      }
    }
  }
};

let n = 0;
function array(rows: Array<Record<string, unknown>>) {
  const id = 'p109-path-' + ++n;
  const c = Collection.get(id);
  c.set(rows.map((data, i) => { const m = Model.get(id + '-' + i); for (const k in data) m.set(k, data[k]); return m; }));
  return c;
}

const JOBS: Array<Record<string, unknown>> = [
  { name: 'water', owner: { id: 'pip', team: { colour: 'red' } } },
  { name: 'dig', owner: { id: 'cobble' } },
  { name: 'sweep', owner: { id: 'pip' } },
  { name: 'rest' }, // no owner at all
  { name: 'odd', owner: 'pip' } // owner is a string, not an object
];

async function filtered(field: string, op: string, value: unknown, rows = JOBS) {
  const parameters: Record<string, unknown> = {
    filterFilter: field,
    ['filterFilterType-' + field]: 'string',
    ['filterFilterOp-' + field]: op,
    ['filterFilterValue-' + field]: value
  };
  const graph = await createCorpusGraph({
    modules: [Source, FilterCollectionModule as unknown as NodeModule],
    data: {
      components: [
        {
          name: '/root',
          nodes: [{ id: 'items', type: 'p109path.Source' }, { id: 'filter', type: 'Filter Collection', parameters }],
          connections: [{ sourceId: 'items', sourcePort: 'value', targetId: 'filter', targetPort: 'items' }]
        }
      ]
    } as never
  });
  await graph.settle(2);
  (graph.node('items') as unknown as { send(v: unknown): void }).send(array(rows));
  await graph.settle(4);
  const out = graph.node('filter').getOutput('items').value as { items: Array<{ data: Record<string, unknown> }> };
  return out.items.map((m) => m.data.name);
}

describe('Array Filter — a field inside a field', () => {
  it('(control) a plain field filters as it always did', async () => {
    expect(await filtered('name', 'eq', 'dig')).toEqual(['dig']);
  });

  it('`owner.id` Equals "pip" keeps the rows whose owner’s id is pip; a missing or non-object owner is dropped', async () => {
    expect(await filtered('owner.id', 'eq', 'pip')).toEqual(['water', 'sweep']);
  });

  it('three steps deep: `owner.team.colour`', async () => {
    expect(await filtered('owner.team.colour', 'eq', 'red')).toEqual(['water']);
  });

  it('Not Equals keeps a row where the path is absent, as it keeps a row without a plain field', async () => {
    expect(await filtered('owner.id', 'neq', 'pip')).toEqual(['dig', 'rest', 'odd']);
  });

  it('Is one of works through a path too', async () => {
    expect(await filtered('owner.id', 'in', 'cobble, nobody')).toEqual(['dig']);
  });

  it('🔴 exact name first: a row with a field literally named `owner.id` is read by that name, not by the path', async () => {
    const rows = [
      { name: 'flat', 'owner.id': 'x', owner: { id: 'pip' } },
      { name: 'nested', owner: { id: 'x' } }
    ];
    expect(await filtered('owner.id', 'eq', 'x', rows)).toEqual(['flat', 'nested']);
    expect(await filtered('owner.id', 'eq', 'pip', rows)).toEqual([]);
  });
});
