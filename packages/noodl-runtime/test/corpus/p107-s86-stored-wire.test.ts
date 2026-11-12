/**
 * P107-S86-STOREDWIRE — a wire saved before ERG-001 renamed its output still connects.
 *
 * In 22 copies of CMG Drive Looks the Multi Choice filter's Item wires Set Object Properties' `stored` into its
 * Component Outputs' Selection Changed. ERG-001 renamed `stored` to `done` and migrated the prefabs in this repo only,
 * so the runtime registered no `stored`, dropped the wire when it built the component, and Selection Changed never
 * fired. These rows build the graph as those projects save it, through the same `addConnection` every running app
 * uses, and count what reaches the far end. The table is `@nodegx/project-contract/renamed-ports`.
 */

/* eslint-env jest */

import type { NodeInstance, NodeModule } from '@noodl/types';

import { createCorpusGraph, type CorpusGraph } from './graph-harness';

import SetModelProperties = require('../../src/nodes/std-library/data/setmodelpropertiesnode');
import NumberModule = require('../../src/nodes/std-library/variables/number');

interface TriggerInstance extends NodeInstance {
  go(): void;
  send(port: string, value: unknown): void;
}

const TriggerModule: NodeModule = {
  node: {
    name: 'corpus.Trigger',
    category: 'Corpus',
    outputs: {
      go: { type: 'signal' },
      id: {
        type: '*',
        getter: function (this: NodeInstance) {
          return this._internal.id;
        }
      }
    },
    methods: {
      go(this: NodeInstance) {
        this.sendSignalOnOutput('go');
      },
      send(this: NodeInstance, port: string, value: unknown) {
        this._internal[port] = value;
        this.flagOutputDirty(port);
      }
    }
  }
};

interface CounterInstance extends NodeInstance {
  hits: number;
}

/** Counts the signals that reach `hit`. */
const CounterModule: NodeModule = {
  node: {
    name: 'corpus.Counter',
    category: 'Corpus',
    initialize: function (this: NodeInstance) {
      (this as unknown as CounterInstance).hits = 0;
    },
    inputs: {
      hit: {
        type: 'signal',
        valueChangedToTrue: function (this: NodeInstance) {
          (this as unknown as CounterInstance).hits++;
        }
      }
    }
  }
};

type Wire = { sourceId: string; sourcePort: string; targetId: string; targetPort: string };

async function graphWith(type: string, parameters: Record<string, unknown>, wires: Wire[]): Promise<CorpusGraph> {
  const graph = await createCorpusGraph({
    modules: [TriggerModule, CounterModule, SetModelProperties as unknown as NodeModule, NumberModule as unknown as NodeModule],
    rootComponent: '/root',
    data: {
      components: [
        {
          name: '/root',
          nodes: [
            { id: 'trigger', type: 'corpus.Trigger' },
            { id: 'target', type, parameters },
            { id: 'counter', type: 'corpus.Counter' }
          ],
          connections: wires
        }
      ]
    } as never
  });
  await graph.settle(4);
  return graph;
}

const hitsOf = (graph: CorpusGraph) => graph.node<CounterInstance>('counter').hits;

describe("P107-S86-STOREDWIRE: Set Object Properties' saved `stored` wire", () => {
  const STORED: Wire = { sourceId: 'target', sourcePort: 'stored', targetId: 'counter', targetPort: 'hit' };
  const WIRES: Wire[] = [
    { sourceId: 'trigger', sourcePort: 'id', targetId: 'target', targetPort: 'modelId' },
    { sourceId: 'trigger', sourcePort: 'go', targetId: 'target', targetPort: 'store' }
  ];

  async function pressed(wires: Wire[]): Promise<CorpusGraph> {
    const graph = await graphWith('SetModelProperties', { properties: 'name' }, wires);
    const trigger = graph.node<TriggerInstance>('trigger');
    trigger.send('id', 'p107-s86-stored-wire');
    await graph.settle(3);
    trigger.go();
    await graph.settle(3);
    return graph;
  }

  test('fires on Do, as the `done` it was renamed to does', async () => {
    const graph = await pressed([...WIRES, STORED]);
    // the outcome happened: the beside-it control that makes a zero below mean something
    expect(graph.signalsFor('target')).toContain('done');
    expect(hitsOf(graph)).toBe(1);
    expect(graph.node('target').hasOutput('stored')).toBe(false);
  });

  test('a wire on `done` itself still fires once (control)', async () => {
    const graph = await pressed([...WIRES, { ...STORED, sourcePort: 'done' }]);
    expect(hitsOf(graph)).toBe(1);
  });

  test('a name that was never renamed is still dropped, not guessed at', async () => {
    const graph = await pressed([...WIRES, { ...STORED, sourcePort: 'saved' }]);
    expect(graph.signalsFor('target')).toContain('done');
    expect(hitsOf(graph)).toBe(0);
  });

  test('removing the saved wire disconnects it', async () => {
    const graph = await pressed([...WIRES, STORED]);
    expect(hitsOf(graph)).toBe(1);

    graph.graphModel.getComponentWithName('/root').removeConnection(STORED);
    graph.node<TriggerInstance>('trigger').go();
    await graph.settle(3);

    expect(graph.signalsFor('target').filter((s) => s === 'done')).toHaveLength(2);
    expect(hitsOf(graph)).toBe(1);
  });
});

describe("P107-S86-STOREDWIRE: a Number's saved `stored` wire is `completed`", () => {
  test('fires on every Set, changed or not, as `stored` did', async () => {
    const graph = await graphWith('Number', { value: 5 }, [
      { sourceId: 'trigger', sourcePort: 'go', targetId: 'target', targetPort: 'saveValue' },
      { sourceId: 'target', sourcePort: 'stored', targetId: 'counter', targetPort: 'hit' }
    ]);
    const trigger = graph.node<TriggerInstance>('trigger');
    trigger.go();
    await graph.settle(3);
    trigger.go();
    await graph.settle(3);

    expect(graph.signalsFor('target').filter((s) => s === 'completed')).toHaveLength(2);
    expect(hitsOf(graph)).toBe(2);
  });
});
