/**
 * P109 — Array Filter can test "is one of these" (`P109-S5-ARRAYFILTERIN`, a gap IW-010's rebuild of the island
 * depends on: "plots whose kind is one of the kinds this request allows" needed a Function).
 *
 * Two operators, on string and number filters: `in` ("Is one of") and `nin` ("Is not one of"). The Values port takes a
 * wired Array (plain values, or records — a record counts by its id) or typed text `"fern, moss"`. Like `neq`, `nin`
 * keeps a row that has no such property; like `eq`, `in` drops it.
 */
import Collection from '../src/collection';
import Model from '../src/model';
import type { NodeInstance, NodeModule } from '@noodl/types';

import { createCorpusGraph } from './corpus/graph-harness';

import FilterCollectionModule = require('../src/nodes/std-library/data/filtercollectionnode');

const Source: NodeModule = {
  node: {
    name: 'isl005.Source',
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
  const id = 'isl005-in-' + ++n;
  const c = Collection.get(id);
  c.set(rows.map((data, i) => { const m = Model.get(id + '-' + i); for (const k in data) m.set(k, data[k]); return m; }));
  return c;
}

const PLOTS = [
  { name: 'A', kind: 'fern' },
  { name: 'B', kind: 'moss' },
  { name: 'C', kind: 'rock' },
  { name: 'D' }, // no kind at all
  { name: 'E', kind: 'fern', size: 2 }
];

/** Filter `rows` on `kind` (or `field`) with `op`, the value typed or wired; the names that come out. */
async function filtered(op: string, value: unknown, { wired = false, field = 'kind', type = 'string', rows = PLOTS as Array<Record<string, unknown>> } = {}) {
  const parameters: Record<string, unknown> = { filterFilter: field, ['filterFilterType-' + field]: type, ['filterFilterOp-' + field]: op };
  if (!wired) parameters['filterFilterValue-' + field] = value;
  const connections = [{ sourceId: 'items', sourcePort: 'value', targetId: 'filter', targetPort: 'items' }];
  if (wired) connections.push({ sourceId: 'list', sourcePort: 'value', targetId: 'filter', targetPort: 'filterFilterValue-' + field });
  const graph = await createCorpusGraph({
    modules: [Source, FilterCollectionModule as unknown as NodeModule],
    data: { components: [{ name: '/root', nodes: [{ id: 'items', type: 'isl005.Source' }, { id: 'list', type: 'isl005.Source' }, { id: 'filter', type: 'Filter Collection', parameters }], connections }] } as never
  });
  await graph.settle(2);
  if (wired) (graph.node('list') as unknown as { send(v: unknown): void }).send(value);
  (graph.node('items') as unknown as { send(v: unknown): void }).send(array(rows));
  await graph.settle(4);
  const out = graph.node('filter').getOutput('items').value as { items: Array<{ data: Record<string, unknown> }> };
  return out.items.map((m) => m.data.name);
}

describe('Array Filter — "Is one of" / "Is not one of"', () => {
  it('(control) Equals keeps one kind', async () => {
    expect(await filtered('eq', 'fern')).toEqual(['A', 'E']);
  });

  it('Is one of, typed as "fern, moss"', async () => {
    expect(await filtered('in', 'fern, moss')).toEqual(['A', 'B', 'E']);
  });

  it('Is one of, a wired JS array; a row with no kind is dropped', async () => {
    expect(await filtered('in', ['rock', 'moss'], { wired: true })).toEqual(['B', 'C']);
  });

  it('Is one of, a wired Array of records: a row whose field holds a record id', async () => {
    const owners = array([{ name: 'Pip' }, { name: 'Cobble' }]);
    const rows = [
      { name: 'job1', owner: owners.items[0].getId() },
      { name: 'job2', owner: 'someone-else' },
      { name: 'job3', owner: owners.items[1].getId() }
    ];
    expect(await filtered('in', owners, { wired: true, field: 'owner', rows })).toEqual(['job1', 'job3']);
  });

  it('Is not one of keeps the row with no kind, like Not Equals', async () => {
    expect(await filtered('nin', 'fern, moss')).toEqual(['C', 'D']);
  });

  it('a number filter: "2" typed matches the number 2 (loose, like Equals)', async () => {
    const rows = [{ name: 'one', size: 1 }, { name: 'two', size: 2 }, { name: 'three', size: 3 }];
    expect(await filtered('in', '2, 3', { field: 'size', type: 'number', rows })).toEqual(['two', 'three']);
  });

  it('an empty list keeps nothing (Is one of) and everything (Is not one of)', async () => {
    expect(await filtered('in', [], { wired: true })).toEqual([]);
    expect(await filtered('nin', [], { wired: true })).toEqual(['A', 'B', 'C', 'D', 'E']);
  });
});
