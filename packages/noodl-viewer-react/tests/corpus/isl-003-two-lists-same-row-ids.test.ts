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
 * AC1 is the reading at HEAD, before any change: RED for the person sentence ("each list shows its
 * own rows"), with distinct ids beside it as the known-firing arm, and a second arm that no
 * diagnostic says anything about the shared id, beside a known-firing `repeater/items-not-a-collection`
 * on a third Repeater in the same graph.
 *
 * 🔴 Traps (task §7): both lists must be alive at once, and their fields must DIFFER — equal fields
 * pass at HEAD whatever the code does. `Model`'s table outlives a test, so every test spells its
 * ids with its own suffix.
 */

/* eslint-env jest */

import type { NodeInstance, NodeModule } from '@noodl/types';

import { createCorpusGraph, type CorpusGraph } from '../../../noodl-runtime/test/corpus/graph-harness';

import NoodlRuntime from '@noodl/runtime';
import ComponentInputs = require('@noodl/runtime/src/nodes/componentinputs');

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

/** The text each row of one Repeater shows, in row order. */
function rowTexts(graph: CorpusGraph, repeaterId: string): unknown[] {
  const repeater = graph.node(repeaterId) as unknown as RepeaterInternals;
  return repeater._internal.itemNodes.map((item) => item.nodeScope.getNodesWithIdRecursive('line-text')[0]._internal.text);
}

function warningsFor(graph: CorpusGraph, nodeId: string): Array<{ key: string; message: string }> {
  return graph.editorConnection.warnings.filter((w) => w.nodeId === nodeId) as Array<{ key: string; message: string }>;
}

/** Three Repeaters over one row component; `third` takes an Items value that cannot be repeated. */
async function twoListsGraph(): Promise<CorpusGraph> {
  const repeater = (id: string) => ({ id, type: 'For Each', parameters: { template: '/Line', templateType: 'explicit' } });
  return createCorpusGraph({
    modules: [ForEachModule, ContainerModule, LineTextModule, ComponentInputs],
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
            { id: 'line-text', type: 'corpus.LineText' }
          ],
          connections: [{ sourceId: 'line-in', sourcePort: 'text', targetId: 'line-text', targetPort: 'text' }]
        }
      ]
    } as never
  });
}

let run = 0;

/** Binds both lists (both stay mounted), plus a number on the third Repeater, and settles. */
async function bind(aIds: string[], bIds: string[]) {
  const graph = await twoListsGraph();
  graph.node('list-a').setInputValue('items', aIds.map((id, i) => ({ id, text: `a${i}` })));
  graph.node('list-b').setInputValue('items', bIds.map((id, i) => ({ id, text: `b${i}` })));
  graph.node('list-c').setInputValue('items', 42);
  await graph.settle(8);
  return graph;
}

describe('ISL-003 AC1: two lists whose rows reuse ids, both alive', () => {
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

  test('RED at HEAD: the same ids `l0`, `l1` — list A shows list B\'s rows', async () => {
    const graph = await bind([`l0-${run}`, `l1-${run}`], [`l0-${run}`, `l1-${run}`]);

    // The person sentence says ['a0', 'a1']. HEAD reads B's values: the last list written wins.
    expect(rowTexts(graph, 'list-a')).toEqual(['b0', 'b1']);
    expect(rowTexts(graph, 'list-b')).toEqual(['b0', 'b1']);
  });

  test('RED at HEAD: nothing says so — beside a known-firing Items diagnostic in the same graph', async () => {
    const graph = await bind([`l0-${run}`, `l1-${run}`], [`l0-${run}`, `l1-${run}`]);

    // Known-firing: the third Repeater was handed a number, and the diagnostic channel carries it.
    expect(warningsFor(graph, 'list-c').map((w) => w.key)).toContain('repeater/items-not-a-collection');
    // Silent on both lists that share `l0`/`l1` with different text.
    expect(warningsFor(graph, 'list-a')).toEqual([]);
    expect(warningsFor(graph, 'list-b')).toEqual([]);
  });
});
