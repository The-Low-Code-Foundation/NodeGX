/**
 * P112-OWN023-NOANCESTOR — a row a list removed before its first frame does not report that it has no parent.
 *
 * A stranger's music app (OWN-023 F2) logged `[noodl] net.noodl.ParentComponentObject (/Shared/Track Row): No ancestor
 * component has a Component Object node` after a settings change, though every Track Row sits in Track List's
 * Repeater and Track List has a Component Object. Parent Component Object resolves its ancestor in a callback queued
 * when its row is built (`nodeScopeDidInitialize` → `scheduleAfterUpdate`), and the walk climbs out through the row's
 * visual parent. Measured on the F2 app in Chrome (s15): the Search genre filter changed every 15–75 ms logged it on
 * HEAD's viewer in 3 of 3 runs and on 0.2.2 in 1 of 1, and with the callback skipping a deleted node in 0 of 3. A
 * row taken away before that callback ran had been deleted, and its walk went past the list.
 */

/* eslint-env jest */

import NoodlRuntime from '@noodl/runtime';
import type { NodeModule } from '@noodl/types';

import { createCorpusGraph, type CorpusGraph } from '../../../noodl-runtime/test/corpus/graph-harness';
import ParentComponentObjectModule from '../../src/nodes/std-library/componentutils/parentcomponentobject';
import ForEachModule from '../../src/nodes/std-library/data/foreach';
import { type CorpusGroupInstance, GroupModule } from './visual-container';

import Model = require('@noodl/runtime/src/model');
import ComponentObjectModule = require('@noodl/runtime/src/nodes/std-library/componentutils/componentobject');

const NO_ANCESTOR = 'parent-component-object/no-ancestor';

/** The list's Group: the corpus Group, taking any child (the corpus one refuses a Repeater). */
const ListGroupModule: NodeModule = {
  node: {
    ...GroupModule.node,
    name: 'corpus.ListGroup',
    allowChildrenWithCategory: undefined,
    methods: {
      ...GroupModule.node.methods,
      getChildren(this: CorpusGroupInstance) {
        return this.children;
      }
    }
  }
};

/** `/List` holds the Component Object and a Repeater of `/Row`; each row reads the list's flags. */
async function listGraph(): Promise<CorpusGraph> {
  return createCorpusGraph({
    modules: [
      GroupModule,
      ListGroupModule,
      ForEachModule,
      ComponentObjectModule as unknown as NodeModule,
      ParentComponentObjectModule as unknown as NodeModule
    ],
    rootComponent: '/root',
    data: {
      components: [
        {
          name: '/root',
          nodes: [{ id: 'root-group', type: 'Group', children: [{ id: 'list-instance', type: '/List' }] }]
        },
        {
          name: '/List',
          nodes: [
            {
              id: 'list-group',
              type: 'corpus.ListGroup',
              children: [{ id: 'rows', type: 'For Each', parameters: { template: '/Row', templateType: 'explicit' } }]
            },
            { id: 'list-flags', type: 'net.noodl.ComponentObject', parameters: { properties: 'removable' } }
          ]
        },
        {
          name: '/Row',
          nodes: [
            { id: 'row-group', type: 'Group' },
            { id: 'row-flags', type: 'net.noodl.ParentComponentObject', parameters: { properties: 'removable' } }
          ]
        }
      ]
    } as never
  });
}

let run = 0;
const songs = (n: number, tag: string) =>
  Array.from({ length: n }, (_, i) => Model.create({ id: `noancestor-${run}-${tag}-${i}` }));
const misses = (graph: CorpusGraph) => graph.errors.filter((e) => (e as { code?: string }).code === NO_ANCESTOR);

type Row = {
  nodeScope: { getNodesWithIdRecursive(id: string): Array<{ _internal: { parentComponentName?: string } }> };
};
const rowParents = (graph: CorpusGraph) =>
  (graph.node('rows') as unknown as { _internal: { itemNodes: Row[] } })._internal.itemNodes.map(
    (row) => row.nodeScope.getNodesWithIdRecursive('row-flags')[0]._internal.parentComponentName
  );

describe('P112-OWN023-NOANCESTOR: a row taken away before its first frame', () => {
  const savedNoodlRuntimeInstance = (NoodlRuntime as unknown as { instance?: unknown }).instance;

  beforeAll(() => {
    (NoodlRuntime as unknown as { instance?: unknown }).instance = { getProjectSettings: () => ({}) };
  });

  afterAll(() => {
    (NoodlRuntime as unknown as { instance?: unknown }).instance = savedNoodlRuntimeInstance;
  });

  beforeEach(() => {
    run++;
  });

  test('known-firing: a row of a list that settles finds the list, and nothing is raised', async () => {
    const graph = await listGraph();
    graph.node('rows').setInputValue('items', songs(2, 'a'));
    await graph.settle(8);

    expect(rowParents(graph)).toEqual(['/List', '/List']);
    expect(misses(graph)).toEqual([]);
  });

  test('known-firing: a Parent Component Object with no ancestor still says so', async () => {
    const graph = await createCorpusGraph({
      modules: [GroupModule, ParentComponentObjectModule as unknown as NodeModule],
      rootComponent: '/root',
      data: {
        components: [
          { name: '/root', nodes: [{ id: 'g', type: 'Group', children: [{ id: 'lonely', type: '/Lonely' }] }] },
          {
            name: '/Lonely',
            nodes: [
              { id: 'lg', type: 'Group' },
              { id: 'pco', type: 'net.noodl.ParentComponentObject' }
            ]
          }
        ]
      } as never
    });
    await graph.settle(4);

    expect(misses(graph)).toHaveLength(1);
  });

  test('known-firing: a new Items value right after the first: the rows kept find the list', async () => {
    const graph = await listGraph();
    graph.node('rows').setInputValue('items', songs(3, 'first'));
    // the settings change: the list is sent again before a frame has passed
    await Promise.resolve();
    await new Promise((r) => setTimeout(r, 0));
    graph.node('rows').setInputValue('items', songs(2, 'second'));
    await graph.settle(10);

    expect(misses(graph)).toEqual([]);
    expect(rowParents(graph)).toEqual(['/List', '/List']);
  });

  test('a row deleted before the update that runs its parent lookup never looks (HEAD: it went loud and walked)', async () => {
    const graph = await listGraph();
    const first = songs(3, 'first');
    graph.node('rows').setInputValue('items', first);
    graph.update(); // the list is copied and its rows start building
    await new Promise((r) => setTimeout(r, 20)); // built; their parent lookups wait for the next update
    const flags = (graph.node('rows') as unknown as { _internal: { itemNodes: Row[] } })._internal.itemNodes.map(
      (row) =>
        row.nodeScope.getNodesWithIdRecursive('row-flags')[0] as unknown as {
          _deleted?: boolean;
          _internal: { resolutionIsLoud?: boolean };
        }
    );
    expect(flags).toHaveLength(3);

    // Taken away before that update: the Repeater's own collection drops the first, and an idle queue removes it at once.
    const collection = (graph.node('rows') as unknown as { _internal: { collection: { remove(m: unknown): void } } })
      ._internal.collection;
    collection.remove(first[0]);
    expect(flags[0]._deleted).toBe(true);
    await graph.settle(6);

    // The mechanism. Here a deleted row's walk falls back to its scope and finds the list, so no miss is raised at HEAD
    // either; in Chrome it climbs the visual tree past the list and misses (the s15 A/B on the F2 app: HEAD 3 of 3 runs
    // logged it, this change 0 of 3).
    expect(flags[0]._internal.resolutionIsLoud).toBeUndefined();
    expect(flags.slice(1).map((x) => x._internal.resolutionIsLoud)).toEqual([true, true]);
    expect(misses(graph)).toEqual([]);
  });
});
