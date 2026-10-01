/**
 * ISL-001 (P78 D85, P109 F01) — a list given twice while the Repeater is still building draws
 * one set of rows: one row per item of the latest list, and never a row for an item that has gone.
 *
 * Three templates met this and each hid it differently (TPL-011 s5: three fixed slots instead of a
 * For Each; the island: a 120 ms Timer and a latch Function in front of every list it feeds twice).
 * The sequence is the ordinary one: a Variable already holds last time's list when the page
 * mounts, and a load (or a Function answering as its inputs arrive) replaces it a moment later —
 * in the same update pass or the next one, while the first list's rows are still being created.
 *
 * What the source predicts (foreach.tsx, re-read at HEAD 27d891bf3):
 *
 *   1. `scheduleRefresh` queues `() => { this.refresh(); }` — a block body, so the op returns
 *      `undefined`, not `refresh()`'s promise. The queue runner awaits nothing, drains, clears
 *      `runningOperations` and fires `Items Rendered` while the rebuild is still in flight.
 *   2. `refresh()` loops `for (i < internal.collection.size())` across an `await` per row and
 *      reads the LIVE private collection on every pass.
 *   3. A second `Items` value reaches `collection.set(B)`, which emits `add`/`remove` per record
 *      synchronously; the listeners queue ops that now run BESIDE the rebuild, not after it.
 *
 * So a record B added is built twice (by the loop and by its queued `add`), and a record B dropped
 * is removed before the loop attaches it (the queued `remove` finds no child) and then attached —
 * the stale row D85 saw. `updateDirtyNodes` runs callbacks appended during its own loop, so a node
 * later in the same pass can hand the Repeater the second list after the rebuild has started: that
 * is the shape this file drives, with `scheduleAfterUpdate`.
 *
 * F50's spec never saw it because its third test settles between the two binds, and its fix (a
 * per-collection identity cache) covers only the SAME array set twice. Both forms here use
 * explicit ids, because D85 measured that ids do not cure it — a fixture with ids is not a control.
 */

/* eslint-env jest */

import type { ModelLike, NodeInstance, NodeModule } from '@noodl/types';

import { createCorpusGraph, type CorpusGraph } from '../../../noodl-runtime/test/corpus/graph-harness';

import NoodlRuntime from '@noodl/runtime';
import Model = require('@noodl/runtime/src/model');

import ForEachModule from '../../src/nodes/std-library/data/foreach';

/** The Repeater's minimal visual parent — the same three-method contract as NDA-013's and F50's. */
interface ContainerInstance extends NodeInstance {
  _children: Array<NodeInstance & { parent?: NodeInstance; _forEachModel?: ModelLike }>;
}

const ContainerModule: NodeModule = {
  node: {
    name: 'corpus.Container',
    category: 'Corpus',
    initialize: function (this: ContainerInstance) {
      this._children = [];
    },
    methods: {
      addChild: function (this: ContainerInstance, child: NodeInstance & { parent?: NodeInstance }, index?: number) {
        if (index === undefined || index >= this._children.length) {
          this._children.push(child);
        } else {
          this._children.splice(index, 0, child);
        }
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

type RepeaterInternals = { _internal: { itemNodes: Array<{ _forEachModel: ModelLike }> } };

/** The Repeater's own bookkeeping. */
function itemNodeIds(graph: CorpusGraph): string[] {
  return (graph.node('repeater') as unknown as RepeaterInternals)._internal.itemNodes.map((n) => n._forEachModel.getId());
}

/** What the container actually holds, which is what the DOM would show. */
function renderedIds(graph: CorpusGraph): string[] {
  const container = graph.node('container') as unknown as ContainerInstance;
  return container._children.filter((c) => c._forEachModel !== undefined).map((c) => c._forEachModel!.getId());
}

function itemsRenderedCount(graph: CorpusGraph): number {
  return graph.signalsFor('repeater').filter((s) => s === 'itemsRendered').length;
}

async function repeaterGraph(): Promise<CorpusGraph> {
  return createCorpusGraph({
    modules: [ForEachModule, ContainerModule],
    data: {
      components: [
        {
          name: '/root',
          nodes: [
            {
              id: 'container',
              type: 'corpus.Container',
              children: [
                { id: 'repeater', type: 'For Each', parameters: { template: '/Item', templateType: 'explicit' } }
              ]
            }
          ],
          connections: []
        },
        { name: '/Item', nodes: [], connections: [] }
      ]
    } as never
  });
}

function models(ids: string[]): ModelLike[] {
  return ids.map((id) => Model.create({ id }));
}

/**
 * The sequence under test: list A is bound, and list B reaches the Repeater from a callback later
 * in the SAME update pass — after the pass's first callbacks have queued the rebuild and it has
 * started (and suspended at its first `createNode`). Nothing yields in between.
 */
function bindTwiceInOnePass(graph: CorpusGraph, a: ModelLike[], b: ModelLike[]) {
  const repeater = graph.node('repeater');
  repeater.setInputValue('items', a);
  graph.context.scheduleAfterUpdate(() => {
    repeater.setInputValue('items', b);
  });
  graph.update();
}

const A = ['a1', 'a2', 'a3'];
/** Keeps a1 and a2, drops a3, adds three. Five rows if the Repeater is honest. */
const B = ['a1', 'a2', 'b4', 'b5', 'b6'];

describe.each([false, true])('ISL-001 (D85): a list given twice mid-build, repeaterCreateComponentsAsync=%s', (async) => {
  const savedNoodlRuntimeInstance = (NoodlRuntime as unknown as { instance?: unknown }).instance;

  beforeAll(() => {
    (NoodlRuntime as unknown as { instance?: unknown }).instance = {
      getProjectSettings: () => ({ repeaterCreateComponentsAsync: async })
    };
  });

  afterAll(() => {
    (NoodlRuntime as unknown as { instance?: unknown }).instance = savedNoodlRuntimeInstance;
  });

  test('the harness suspends where the browser does: no row is attached when the pass ends', async () => {
    // Trap check (ISL-001 §7): if `createNode` resolved without a real turn, the rebuild would
    // finish inside `update()` and a green AC1 would prove nothing. The row count right after the
    // synchronous pass must be 0 and only become 3 after the microtasks run.
    const graph = await repeaterGraph();
    graph.node('repeater').setInputValue('items', models(A));
    graph.update();
    expect(renderedIds(graph)).toEqual([]);
    await graph.settle(40);
    expect(renderedIds(graph)).toEqual(A);
  });

  test('AC1 known-firing control: A, a settle, then B gives exactly B', async () => {
    const graph = await repeaterGraph();
    graph.node('repeater').setInputValue('items', models(A));
    await graph.settle(40);
    graph.node('repeater').setInputValue('items', models(B));
    await graph.settle(40);

    expect(renderedIds(graph).sort()).toEqual([...B].sort());
    expect(itemNodeIds(graph).sort()).toEqual([...B].sort());
  });

  test('AC1: A then B in one pass, mid-build — one row per item of B and no other', async () => {
    const graph = await repeaterGraph();
    bindTwiceInOnePass(graph, models(A), models(B));
    await graph.settle(40);

    const rendered = renderedIds(graph);
    expect(rendered.length).toBe(B.length);
    expect(rendered.sort()).toEqual([...B].sort());
    expect(itemNodeIds(graph).sort()).toEqual([...B].sort());
  });

  test('AC1, id-less rows (GAM-005 AC7 shape): plain objects, A then B in one pass', async () => {
    const graph = await repeaterGraph();
    const a = A.map((label) => ({ label }));
    const b = B.map((label) => ({ label }));
    bindTwiceInOnePass(graph, a as never, b as never);
    await graph.settle(40);

    const container = graph.node('container') as unknown as ContainerInstance;
    const labels = container._children
      .filter((c) => c._forEachModel !== undefined)
      .map((c) => c._forEachModel!.get('label') as string);
    expect(labels.length).toBe(B.length);
    expect(labels.sort()).toEqual([...B].sort());
  });

  test('AC3: the stale-row form — a record B dropped never shows, through three later changes', async () => {
    const graph = await repeaterGraph();
    bindTwiceInOnePass(graph, models(A), models(B));
    await graph.settle(40);
    expect(renderedIds(graph)).not.toContain('a3');
    expect(itemNodeIds(graph)).not.toContain('a3');

    const later = [
      ['a1', 'b4', 'b5'],
      ['a1', 'b4', 'b5', 'c7'],
      ['b4', 'c7']
    ];
    for (const list of later) {
      graph.node('repeater').setInputValue('items', models(list));
      await graph.settle(40);
      expect(renderedIds(graph).sort()).toEqual([...list].sort());
      expect(renderedIds(graph)).not.toContain('a3');
    }
  });

  test('AC4: Items Rendered fires after the last row of B is attached, and only then', async () => {
    const graph = await repeaterGraph();
    const container = graph.node('container') as unknown as ContainerInstance;
    const repeater = graph.node('repeater') as unknown as NodeInstance & { sendSignalOnOutput(name: string): void };

    // The rows on screen at the moment each `Items Rendered` leaves the node.
    const seen: string[][] = [];
    const original = repeater.sendSignalOnOutput.bind(repeater);
    repeater.sendSignalOnOutput = (name: string) => {
      if (name === 'itemsRendered') {
        seen.push(container._children.filter((c) => c._forEachModel !== undefined).map((c) => c._forEachModel!.getId()));
      }
      original(name);
    };

    bindTwiceInOnePass(graph, models(A), models(B));
    await graph.settle(40);

    expect(itemsRenderedCount(graph)).toBeGreaterThan(0);
    // Every announcement must describe a list that is exactly B; one that fires with A's rows,
    // or with none, announced a list that was not there yet.
    for (const rows of seen) {
      expect(rows.sort()).toEqual([...B].sort());
    }
  });
});
