/**
 * ISL-003 (P109 F03) — two lists that reuse row ids keep their own rows, or the author is told
 * they share them.
 *
 * Olive's Island had five lesson cards, each a Repeater over its own little list of lines with ids
 * `l0`, `l1`, `l2`… and all five cards showed one card's lines. A plain row handed to a Repeater is
 * converted with `Model.create(plain)` (`collection.ts`), which looks the id up in the ONE app-wide
 * record table and writes every field of the row onto that record. So the second list overwrites
 * the first list's records, and the first list's rows (bound to `model.on('change')`) re-render
 * with the second list's values.
 *
 * AC1 was read at HEAD `23bb0a073` before any change (ISL-003 §8 s9): ids `l0,l1` in both lists read `['b0','b1']`
 * in A, and nothing said so. 🔒 Ruled 2026-10-03 "Each list keeps its rows", built in the form that changes least
 * (`collection.ts` `plainRowRecord`): the first list keeps the app-wide records (a lookup by id still finds them),
 * and a list reusing an id another live list holds keeps its own. An Array node's collection is not opted in.
 *
 * Sabotage: drop `Collection.keepPlainRowsApart` from `foreach.tsx` and the defect arm reads `['b0','b1']` again.
 *
 * 🔴 Traps (task §7): both lists must be alive at once, and their fields must DIFFER — equal fields
 * pass at HEAD whatever the code does. `Model`'s table outlives a test, so every test spells its
 * ids with its own suffix.
 */

/* eslint-env jest */

import type { NodeInstance, NodeModule } from '@noodl/types';

import { createCorpusGraph, type CorpusGraph } from '../../../noodl-runtime/test/corpus/graph-harness';

import NoodlRuntime from '@noodl/runtime';
import Collection = require('@noodl/runtime/src/collection');
import Model = require('@noodl/runtime/src/model');
import ComponentInputs = require('@noodl/runtime/src/nodes/componentinputs');
import ObjectNodeModule = require('@noodl/runtime/src/nodes/std-library/data/modelnode2');
import StaticDataModule = require('@noodl/runtime/src/nodes/std-library/data/staticdata');

import ForEachModule from '../../src/nodes/std-library/data/foreach';

interface ContainerInstance extends NodeInstance {
  _children: Array<NodeInstance & { parent?: NodeInstance }>;
}

/** The Repeater's minimal visual parent — the same three-method contract as NDA-013's and F50's. */
const ContainerModule: NodeModule = {
  node: {
    name: 'corpus.Container',
    category: 'Corpus',
    initialize: function (this: ContainerInstance) {
      this._children = [];
    },
    methods: {
      addChild: function (this: ContainerInstance, child: NodeInstance & { parent?: NodeInstance }, index?: number) {
        if (index === undefined || index >= this._children.length) this._children.push(child);
        else this._children.splice(index, 0, child);
        child.parent = this;
      },
      removeChild: function (this: ContainerInstance, child: NodeInstance & { parent?: NodeInstance }) {
        const idx = this._children.indexOf(child);
        if (idx !== -1) this._children.splice(idx, 1);
        child.parent = undefined;
      },
      getChildren: function (this: ContainerInstance) {
        return this._children;
      }
    }
  }
};

/** What the row shows: the `text` its Component Inputs delivers. */
const LineTextModule: NodeModule = {
  node: {
    name: 'corpus.LineText',
    category: 'Corpus',
    inputs: {
      text: {
        type: 'string',
        set: function (this: NodeInstance, value: unknown) {
          this._internal.text = value;
        }
      }
    }
  }
};

type ItemNode = NodeInstance & { nodeScope: { getNodesWithIdRecursive(id: string): NodeInstance[] } };
type RepeaterInternals = { _internal: { itemNodes: ItemNode[] } };

function rows(graph: CorpusGraph, repeaterId: string): ItemNode[] {
  return (graph.node(repeaterId) as unknown as RepeaterInternals)._internal.itemNodes;
}

/** The text each row of one Repeater shows, in row order. */
function rowTexts(graph: CorpusGraph, repeaterId: string): unknown[] {
  return rows(graph, repeaterId).map((item) => item.nodeScope.getNodesWithIdRecursive('line-text')[0]._internal.text);
}

/** What an Object node set to "From repeater" in each row reads. */
function fromRepeaterTexts(graph: CorpusGraph, repeaterId: string): unknown[] {
  return rows(graph, repeaterId).map((item) => {
    const object = item.nodeScope.getNodesWithIdRecursive('line-object')[0] as NodeInstance & { _internal: { model?: { get(k: string): unknown } } };
    return object._internal.model?.get('text');
  });
}

function warningsFor(graph: CorpusGraph, nodeId: string): Array<{ key: string; message: string }> {
  return graph.editorConnection.warnings.filter((w) => w.nodeId === nodeId) as Array<{ key: string; message: string }>;
}

/** Three Repeaters over one row component; `third` takes an Items value that cannot be repeated. */
async function twoListsGraph(): Promise<CorpusGraph> {
  const repeater = (id: string) => ({ id, type: 'For Each', parameters: { template: '/Line', templateType: 'explicit' } });
  return createCorpusGraph({
    modules: [ForEachModule, ContainerModule, LineTextModule, ComponentInputs, ObjectNodeModule as unknown as NodeModule],
    rootComponent: '/root',
    data: {
      components: [
        {
          name: '/root',
          nodes: [
            { id: 'card-a', type: 'corpus.Container', children: [repeater('list-a')] },
            { id: 'card-b', type: 'corpus.Container', children: [repeater('list-b')] },
            { id: 'card-c', type: 'corpus.Container', children: [repeater('list-c')] }
          ],
          connections: []
        },
        {
          name: '/Line',
          ports: [{ name: 'text', plug: 'input', type: 'string' }],
          nodes: [
            { id: 'line-in', type: 'Component Inputs', ports: [{ name: 'text', plug: 'output', type: 'string' }] },
            { id: 'line-text', type: 'corpus.LineText' },
            { id: 'line-object', type: 'Model2', parameters: { idSource: 'foreach' } }
          ],
          connections: [{ sourceId: 'line-in', sourcePort: 'text', targetId: 'line-text', targetPort: 'text' }]
        }
      ]
    } as never
  });
}

/**
 * The island's shape and AC5's: three cards, each a Repeater over ITS OWN Static Data, every table
 * numbering its lines `l0…l2`. Static Data converts its rows itself (its own collection), so the
 * Repeater only ever sees records — the Repeater's opt-in alone does not reach this.
 */
async function threeCardsGraph(suffix: string): Promise<CorpusGraph> {
  const card = (n: number) => ({
    id: `card-${n}`,
    type: 'corpus.Container',
    children: [{ id: `list-${n}`, type: 'For Each', parameters: { template: '/Line', templateType: 'explicit' } }]
  });
  const table = (n: number) => ({
    id: `data-${n}`,
    type: 'Static Data',
    parameters: { type: 'json', json: JSON.stringify([0, 1, 2].map((i) => ({ id: `l${i}-${suffix}`, text: `card${n} line${i}` }))) }
  });
  return createCorpusGraph({
    modules: [ForEachModule, ContainerModule, LineTextModule, ComponentInputs, ObjectNodeModule as unknown as NodeModule, StaticDataModule as unknown as NodeModule],
    rootComponent: '/root',
    data: {
      components: [
        {
          name: '/root',
          nodes: [card(1), card(2), card(3), table(1), table(2), table(3)],
          connections: [1, 2, 3].map((n) => ({ sourceId: `data-${n}`, sourcePort: 'items', targetId: `list-${n}`, targetPort: 'items' }))
        },
        {
          name: '/Line',
          ports: [{ name: 'text', plug: 'input', type: 'string' }],
          nodes: [
            { id: 'line-in', type: 'Component Inputs', ports: [{ name: 'text', plug: 'output', type: 'string' }] },
            { id: 'line-text', type: 'corpus.LineText' },
            { id: 'line-object', type: 'Model2', parameters: { idSource: 'foreach' } }
          ],
          connections: [{ sourceId: 'line-in', sourcePort: 'text', targetId: 'line-text', targetPort: 'text' }]
        }
      ]
    } as never
  });
}

let run = 0;

const plainRows = (ids: string[], prefix: string) => ids.map((id, i) => ({ id, text: `${prefix}${i}` }));

/** Binds both lists (both stay mounted), plus a number on the third Repeater, and settles. */
async function bind(aIds: string[], bIds: string[]) {
  const graph = await twoListsGraph();
  graph.node('list-a').setInputValue('items', plainRows(aIds, 'a'));
  graph.node('list-b').setInputValue('items', plainRows(bIds, 'b'));
  graph.node('list-c').setInputValue('items', 42);
  await graph.settle(8);
  return graph;
}

describe('ISL-003: two lists whose rows reuse ids, both alive', () => {
  const savedNoodlRuntimeInstance = (NoodlRuntime as unknown as { instance?: unknown }).instance;

  beforeAll(() => {
    // `foreach.tsx` reads two project settings straight off `NoodlRuntime.instance`.
    (NoodlRuntime as unknown as { instance?: unknown }).instance = { getProjectSettings: () => ({}) };
  });

  afterAll(() => {
    (NoodlRuntime as unknown as { instance?: unknown }).instance = savedNoodlRuntimeInstance;
  });

  beforeEach(() => {
    run++;
  });

  test('known-firing: distinct ids — each list shows its own rows', async () => {
    const graph = await bind([`a0-${run}`, `a1-${run}`], [`b0-${run}`, `b1-${run}`]);

    expect(rowTexts(graph, 'list-a')).toEqual(['a0', 'a1']);
    expect(rowTexts(graph, 'list-b')).toEqual(['b0', 'b1']);
  });

  test('AC2: the same ids `l0`, `l1` — each list shows its own rows (HEAD: A read B\'s)', async () => {
    const graph = await bind([`l0-${run}`, `l1-${run}`], [`l0-${run}`, `l1-${run}`]);

    expect(rowTexts(graph, 'list-a')).toEqual(['a0', 'a1']);
    expect(rowTexts(graph, 'list-b')).toEqual(['b0', 'b1']);
    // The row still carries its own id: a row's `Id` and the Repeater's item id are unchanged.
    expect(rows(graph, 'list-b').map((r) => (r as unknown as { _forEachModel: { getId(): string } })._forEachModel.getId())).toEqual([`l0-${run}`, `l1-${run}`]);
  });

  test('AC2: an Object node set to "From repeater" reads its own list\'s row', async () => {
    const graph = await bind([`l0-${run}`, `l1-${run}`], [`l0-${run}`, `l1-${run}`]);

    expect(fromRepeaterTexts(graph, 'list-a')).toEqual(['a0', 'a1']);
    expect(fromRepeaterTexts(graph, 'list-b')).toEqual(['b0', 'b1']);
  });

  test('the first list keeps the app-wide records: a lookup by id still finds its rows', async () => {
    const graph = await bind([`l0-${run}`, `l1-${run}`], [`l0-${run}`, `l1-${run}`]);
    void graph;

    expect(Model.get(`l0-${run}`).get('text')).toBe('a0');
    expect(Model.get(`l1-${run}`).get('text')).toBe('a1');
  });

  test('a list given new rows with the same ids keeps them apart, and the other list does not move', async () => {
    const graph = await bind([`l0-${run}`, `l1-${run}`], [`l0-${run}`, `l1-${run}`]);

    graph.node('list-b').setInputValue('items', plainRows([`l0-${run}`, `l1-${run}`], 'B'));
    await graph.settle(8);
    graph.node('list-a').setInputValue('items', plainRows([`l0-${run}`, `l1-${run}`], 'A'));
    await graph.settle(8);

    expect(rowTexts(graph, 'list-a')).toEqual(['A0', 'A1']);
    expect(rowTexts(graph, 'list-b')).toEqual(['B0', 'B1']);
    expect(rows(graph, 'list-b')).toHaveLength(2);
  });

  test('a list that dropped its rows no longer claims their ids', async () => {
    const graph = await twoListsGraph();
    graph.node('list-a').setInputValue('items', plainRows([`l0-${run}`], 'a'));
    await graph.settle(8);
    graph.node('list-a').setInputValue('items', []);
    await graph.settle(8);
    graph.node('list-b').setInputValue('items', plainRows([`l0-${run}`], 'b'));
    await graph.settle(8);

    // B now holds the app-wide record, as a single list always did.
    expect(rowTexts(graph, 'list-b')).toEqual(['b0']);
    expect(Model.get(`l0-${run}`).get('text')).toBe('b0');
  });

  test('unchanged: an Array node\'s collection (not a Repeater\'s) still shares rows by id', () => {
    const one = Collection.create(plainRows([`s0-${run}`], 'one'));
    const two = Collection.create(plainRows([`s0-${run}`], 'two'));

    expect(one.get(0)).toBe(two.get(0));
    expect(one.get(0).get('text')).toBe('two0');
  });

  test('nothing raises a warning on either list, beside a known-firing Items diagnostic in the same graph', async () => {
    const graph = await bind([`l0-${run}`, `l1-${run}`], [`l0-${run}`, `l1-${run}`]);

    expect(warningsFor(graph, 'list-c').map((w) => w.key)).toContain('repeater/items-not-a-collection');
    expect(warningsFor(graph, 'list-a')).toEqual([]);
    expect(warningsFor(graph, 'list-b')).toEqual([]);
  });

  test('AC5 shape: three cards over three Static Data tables numbered l0…l2 — each card shows its own lines', async () => {
    const graph = await threeCardsGraph(`${run}`);
    await graph.settle(12);

    for (const n of [1, 2, 3]) {
      expect(rowTexts(graph, `list-${n}`)).toEqual([0, 1, 2].map((i) => `card${n} line${i}`));
    }
    // The first table keeps the app-wide records.
    expect(Model.get(`l0-${run}`).get('text')).toBe('card1 line0');
  });

  test('a Static Data node that parses again (its JSON edited) is still one list: it keeps its records', async () => {
    const graph = await threeCardsGraph(`${run}`);
    await graph.settle(12);

    graph.node('data-1').setInputValue('json', JSON.stringify([{ id: `l0-${run}`, text: 'edited' }]));
    await graph.settle(12);

    expect(rowTexts(graph, 'list-1')).toEqual(['edited']);
    expect(Model.get(`l0-${run}`).get('text')).toBe('edited');
    expect(rowTexts(graph, 'list-2')).toEqual([0, 1, 2].map((i) => `card2 line${i}`));
  });
});
