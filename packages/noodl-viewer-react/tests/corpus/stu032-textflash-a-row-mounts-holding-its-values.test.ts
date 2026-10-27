/**
 * P123-STU032-TEXTFLASH — a row a list draws is mounted holding its values, not its Text elements' default.
 *
 * NodeGX Studio's run timeline (STU-032) caught the todo template's task list inserting its row as
 * `TextTextTextLabel`, with the task's title arriving 14–23 ms later: a frame or two of "Text" on screen
 * every time a list draws a row. The mechanism: `addItem` sets the row's inputs, and a component input
 * reaches the nodes inside only through its Component Inputs node, which QUEUES the value onto each wired
 * node and flags it dirty. Those nodes took it at the runtime's next update (the next animation frame in a
 * browser), after `addChild` had handed the row to its parent to render.
 *
 * The gate is the moment the parent is handed the row (`addChild`, the call that renders it): what the
 * row's inner nodes hold THEN is what its first render shows. HEAD read `undefined` there on every arm.
 * The screen itself was graded in Studio (s15): its timeline check with this viewer built in, the task list's
 * row is inserted as "1Read the run timeline✓" and no frame copy holds a default (3 of 3); HEAD's build, 2 of 2
 * "TextTextTextLabel".
 *
 * The row is settled before For Each Actions' Added is sent, so Added is still heard at the frame: settled
 * after it, five For Each scenarios (rows C128, C142) heard it early.
 *
 * Sabotage: drop the `settleRow` call in `foreach.tsx` `addItem` and every "at addChild" arm reads `undefined`.
 */

/* eslint-env jest */

import NoodlRuntime from '@noodl/runtime';
import type { NodeInstance, NodeModule } from '@noodl/types';

import { createCorpusGraph, type CorpusGraph } from '../../../noodl-runtime/test/corpus/graph-harness';
import ForEachModule from '../../src/nodes/std-library/data/foreach';

import Model = require('@noodl/runtime/src/model');
import ComponentInputs = require('@noodl/runtime/src/nodes/componentinputs');

type ItemNode = NodeInstance & { nodeScope: { getNodesWithIdRecursive(id: string): NodeInstance[] } };

interface ContainerInstance extends NodeInstance {
  _children: ItemNode[];
}

/** What each row's inner text nodes held at the moment the Repeater handed the row to its parent. */
let atAddChild: unknown[][] = [];

/** The Repeater's visual parent; `addChild` is where a real parent renders the row, so it reads the row there. */
const ContainerModule: NodeModule = {
  node: {
    name: 'corpus.Container',
    category: 'Corpus',
    initialize: function (this: ContainerInstance) {
      this._children = [];
    },
    methods: {
      addChild: function (this: ContainerInstance, child: ItemNode & { parent?: NodeInstance }, index?: number) {
        if ((child as { _forEachModel?: unknown })._forEachModel)
          atAddChild.push(child.nodeScope.getNodesWithIdRecursive('line-text').map((n) => n._internal.text));
        if (index === undefined || index >= this._children.length) this._children.push(child);
        else this._children.splice(index, 0, child);
        child.parent = this;
      },
      removeChild: function (this: ContainerInstance, child: ItemNode & { parent?: NodeInstance }) {
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

/** A Text element's stand-in: what it shows is the `text` it was given. */
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

type RepeaterInternals = { _internal: { itemNodes: ItemNode[] } };

/** What each row's text nodes hold now, in row order. */
function rowTexts(graph: CorpusGraph): unknown[][] {
  return (graph.node('list') as unknown as RepeaterInternals)._internal.itemNodes.map((item) =>
    item.nodeScope.getNodesWithIdRecursive('line-text').map((n) => n._internal.text)
  );
}

const line = (name: string, connections: unknown[], nodes: unknown[] = []) => ({
  name,
  ports: [{ name: 'title', plug: 'input', type: 'string' }],
  nodes: [
    { id: `${name}-in`, type: 'Component Inputs', ports: [{ name: 'title', plug: 'output', type: 'string' }] },
    ...nodes
  ],
  connections
});

/**
 * `/Line` is the row. `nested` puts the text one component further in (`/Line → /Label → line-text`), so the
 * value crosses two Component Inputs: two queue hops, not one.
 */
async function listGraph(options: { nested?: boolean; mapping?: string } = {}): Promise<CorpusGraph> {
  const rowComponents = options.nested
    ? [
        line(
          '/Line',
          [{ sourceId: '/Line-in', sourcePort: 'title', targetId: 'label', targetPort: 'title' }],
          [{ id: 'label', type: '/Label' }]
        ),
        line(
          '/Label',
          [{ sourceId: '/Label-in', sourcePort: 'title', targetId: 'line-text', targetPort: 'text' }],
          [{ id: 'line-text', type: 'corpus.LineText' }]
        )
      ]
    : [
        line(
          '/Line',
          [{ sourceId: '/Line-in', sourcePort: 'title', targetId: 'line-text', targetPort: 'text' }],
          [{ id: 'line-text', type: 'corpus.LineText' }]
        )
      ];

  return createCorpusGraph({
    modules: [ForEachModule, ContainerModule, LineTextModule, ComponentInputs],
    rootComponent: '/root',
    data: {
      components: [
        {
          name: '/root',
          nodes: [
            {
              id: 'card',
              type: 'corpus.Container',
              children: [
                {
                  id: 'list',
                  type: 'For Each',
                  parameters: {
                    template: '/Line',
                    templateType: 'explicit',
                    ...(options.mapping !== undefined ? { inputMappingScript: options.mapping } : {})
                  }
                }
              ]
            }
          ],
          connections: []
        },
        ...rowComponents
      ]
    } as never
  });
}

let run = 0;
const tasks = (titles: string[]) => titles.map((title, i) => Model.create({ id: `stu032-${run}-${i}`, title }));

describe('P123-STU032-TEXTFLASH: a row is handed to its parent holding its values', () => {
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
    atAddChild = [];
  });

  test('known-firing: once the list has settled, every row shows its task', async () => {
    const graph = await listGraph();
    graph.node('list').setInputValue('items', tasks(['Buy milk', 'Water the plants']));
    await graph.settle(8);

    expect(rowTexts(graph)).toEqual([['Buy milk'], ['Water the plants']]);
    expect(atAddChild).toHaveLength(2);
  });

  test('at addChild, each row already holds its task (HEAD: undefined, the default)', async () => {
    const graph = await listGraph();
    graph.node('list').setInputValue('items', tasks(['Buy milk', 'Water the plants']));
    await graph.settle(8);

    expect(atAddChild).toEqual([['Buy milk'], ['Water the plants']]);
  });

  test('at addChild, a text one component further in holds its task too (two Component Inputs hops)', async () => {
    const graph = await listGraph({ nested: true });
    graph.node('list').setInputValue('items', tasks(['Buy milk']));
    await graph.settle(8);

    expect(atAddChild).toEqual([['Buy milk']]);
    expect(rowTexts(graph)).toEqual([['Buy milk']]);
  });

  test('at addChild, a row filled through an input mapping script holds its value', async () => {
    const graph = await listGraph({ mapping: "map({ title: function (item) { return item.get('title') + '!' } })" });
    graph.node('list').setInputValue('items', tasks(['Buy milk']));
    await graph.settle(8);

    expect(atAddChild).toEqual([['Buy milk!']]);
  });

  test('a row added to a live list later (a new Items value holding one more) is handed over holding its task', async () => {
    const graph = await listGraph();
    const first = tasks(['Buy milk']);
    graph.node('list').setInputValue('items', first);
    await graph.settle(8);
    atAddChild = [];

    graph
      .node('list')
      .setInputValue('items', [...first, Model.create({ id: `stu032-${run}-late`, title: 'Call the vet' })]);
    await graph.settle(8);

    expect(atAddChild).toEqual([['Call the vet']]);
    expect(rowTexts(graph)).toEqual([['Buy milk'], ['Call the vet']]);
  });

  test('a change to a task after its row is drawn still reaches the row', async () => {
    const graph = await listGraph();
    const items = tasks(['Buy milk']);
    graph.node('list').setInputValue('items', items);
    await graph.settle(8);

    items[0].set('title', 'Buy oat milk');
    await graph.settle(4);

    expect(rowTexts(graph)).toEqual([['Buy oat milk']]);
  });
});
