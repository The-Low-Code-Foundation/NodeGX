/**
 * P112 OWN-026 FIX-03 — the safe way is the short way.
 *
 * A: Update Record's `Add To` sends the named properties to the backend as amounts
 *    (`cloudstore.increment`), after the other properties' save, so two devices adding at once
 *    both count and a refused save adds nothing.
 * B: a backend write started by a press's update holds the press's keys (`pressguard.ts`) until
 *    it answers and for at least DOUBLE_PRESS_MS; a press that starts no write holds nothing.
 *
 * Reverting `_splitAdds` reddens every A row (the amount is saved as a value); reverting the
 * `beginPressUpdate` hook in `updateDirtyNodes` reddens the B rows that expect a hold.
 */

/* eslint-env jest */

const metadata: Record<string, unknown> = {};

jest.mock('../../noodl-runtime', () => ({
  instance: { getMetaData: (key: string) => metadata[key] },
  Node: require('../../src/node')
}));

import type { NodeModule } from '@noodl/types';

import { createCorpusGraph, type CorpusGraph } from '../corpus/graph-harness';

import CloudStore = require('../../src/api/cloudstore');
import UpdateRecordModule = require('../../src/nodes/std-library/data/setdbmodelpropertiesnode');
import {
  DOUBLE_PRESS_MS,
  holdOptionsForWrite,
  isPressHeld,
  notePress,
  pressKeys,
  resetPressGuard
} from '../../src/pressguard';

interface StoreCall {
  method: string;
  options: { success(response?: unknown): void; error(error?: string): void } & Record<string, unknown>;
}

let storeCalls: StoreCall[] = [];

/** A store that records, holds each call through the press guard as the real one does, and answers nothing. */
function stubStore(): void {
  const record = (method: string) => (options: StoreCall['options']) => {
    storeCalls.push({ method, options: holdOptionsForWrite(options) });
  };
  jest.spyOn(CloudStore as unknown as { forBackend: (...a: unknown[]) => unknown }, 'forBackend').mockReturnValue({
    create: record('create'),
    save: record('save'),
    increment: record('increment'),
    delete: record('delete'),
    addRelation: record('addRelation'),
    removeRelation: record('removeRelation'),
    currentUserId: () => undefined,
    _fromJSON: (json: Record<string, unknown>) => ({ getId: () => json.objectId || 'new-id', data: json })
  } as never);
}

function calls(method: string): StoreCall[] {
  return storeCalls.filter((c) => c.method === method);
}

beforeEach(() => {
  storeCalls = [];
  resetPressGuard();
});

afterEach(() => {
  jest.restoreAllMocks();
});

async function updateRecord(parameters: Record<string, unknown>): Promise<CorpusGraph> {
  const graph = await createCorpusGraph({
    modules: [UpdateRecordModule as unknown as NodeModule],
    data: {
      components: [
        {
          name: '/root',
          nodes: [{ id: 'node', type: 'SetDbModelProperties', parameters: { collectionName: 'Score', ...parameters } }],
          connections: []
        }
      ]
    } as never
  });
  await graph.settle(2);
  graph.node('node').setInputValue('modelId', 'r1');
  await graph.settle(2);
  return graph;
}

function pulse(graph: CorpusGraph, port = 'store'): void {
  const node = graph.node('node');
  node.setInputValue(port, false);
  node.setInputValue(port, true);
}

function outcomes(graph: CorpusGraph): string[] {
  return graph.signalsFor('node').filter((s) => s === 'done' || s === 'failure');
}

describe('FIX-03 A: Update Record, Add To', () => {
  test('an Add To property alone is sent as an amount, with no save, and the record shows the total', async () => {
    stubStore();
    const graph = await updateRecord({ addTo: 'points', 'prop-points': 1 });
    pulse(graph);
    await graph.settle(2);

    expect(calls('save')).toHaveLength(0);
    expect(calls('increment')).toHaveLength(1);
    expect(calls('increment')[0].options.properties).toEqual({ points: 1 });

    calls('increment')[0].options.success({ points: 42 });
    await graph.settle(2);
    expect(outcomes(graph)).toEqual(['done']);
    const model = (graph.node('node') as unknown as { _internal: { model: { get(k: string): unknown } } })._internal
      .model;
    expect(model.get('points')).toBe(42);
  });

  test('the other properties are saved first, without the amount, and the add follows the save', async () => {
    stubStore();
    const graph = await updateRecord({ addTo: 'points', 'prop-points': '2', 'prop-name': 'Ada' });
    pulse(graph);
    await graph.settle(2);

    expect(calls('increment')).toHaveLength(0);
    expect(calls('save')).toHaveLength(1);
    expect(calls('save')[0].options.data).toEqual({ name: 'Ada' });

    calls('save')[0].options.success({});
    await graph.settle(2);
    expect(calls('increment')[0].options.properties).toEqual({ points: 2 });
    expect(outcomes(graph)).toEqual([]);

    calls('increment')[0].options.success({ points: 7 });
    await graph.settle(2);
    expect(outcomes(graph)).toEqual(['done']);
  });

  test('a refused save adds nothing', async () => {
    stubStore();
    const graph = await updateRecord({ addTo: 'points', 'prop-points': 1, 'prop-name': 'Ada' });
    pulse(graph);
    await graph.settle(2);
    calls('save')[0].options.error('Permission denied');
    await graph.settle(2);

    expect(calls('increment')).toHaveLength(0);
    expect(outcomes(graph)).toEqual(['failure']);
  });

  test('an amount that is not a number is refused before anything is sent, and says so', async () => {
    stubStore();
    const graph = await updateRecord({ addTo: 'points', 'prop-points': 'lots' });
    pulse(graph);
    await graph.settle(2);

    expect(storeCalls).toHaveLength(0);
    expect(outcomes(graph)).toEqual(['failure']);
    expect(graph.errors[0].message).toContain('Add To names "points"');
  });

  test("'All' never sends an amount's field as a value", async () => {
    stubStore();
    const graph = await updateRecord({ addTo: 'points', 'prop-points': 1, 'prop-name': 'Ada', storeProperties: 'all' });
    pulse(graph);
    await graph.settle(2);
    expect(calls('save')[0].options.data).not.toHaveProperty('points');
  });

  test('Local only adds the amount to the record held here', async () => {
    stubStore();
    const graph = await updateRecord({ addTo: 'points', 'prop-points': 3, storeType: 'local' });
    const model = (graph.node('node') as unknown as { _internal: { model: { get(k: string): unknown; set(k: string, v: unknown): void } } })
      ._internal.model;
    model.set('points', 4);
    pulse(graph);
    await graph.settle(2);
    expect(storeCalls).toHaveLength(0);
    expect(model.get('points')).toBe(7);
  });

  test('without Add To, nothing changes: the value is saved as given', async () => {
    stubStore();
    const graph = await updateRecord({ 'prop-points': 1 });
    pulse(graph);
    await graph.settle(2);
    expect(calls('increment')).toHaveLength(0);
    expect(calls('save')[0].options.data).toEqual({ points: 1 });
  });
});

describe('FIX-03 B: the press guard', () => {
  /** A stand-in control whose press output is wired to the Update Record. */
  function controlWiredTo(graph: CorpusGraph): object {
    const target = graph.node('node');
    return {
      hasOutput: (name: string) => name === 'onClick',
      getOutput: () => ({ connections: [{ node: target }] })
    };
  }

  test('a press whose update starts a save is held until the save answers, and for a double-click after', async () => {
    stubStore();
    const graph = await updateRecord({ 'prop-points': 1 });
    const keys = pressKeys(controlWiredTo(graph), 'onClick');
    const t0 = Date.now();

    notePress(keys, t0);
    pulse(graph);
    graph.update();

    expect(calls('save')).toHaveLength(1);
    expect(isPressHeld(keys, t0 + 10)).toBe(true);

    calls('save')[0].options.success({});
    // Answered, but still inside a double-click of the press.
    expect(isPressHeld(keys, t0 + 10)).toBe(true);
    expect(isPressHeld(keys, t0 + DOUBLE_PRESS_MS + 1)).toBe(false);
  });

  test('a save that is still waiting holds past the double-click time', async () => {
    stubStore();
    const graph = await updateRecord({ 'prop-points': 1 });
    const keys = pressKeys(controlWiredTo(graph), 'onClick');
    const t0 = Date.now();
    notePress(keys, t0);
    pulse(graph);
    graph.update();
    expect(isPressHeld(keys, t0 + DOUBLE_PRESS_MS * 4)).toBe(true);
    calls('save')[0].options.error('offline');
    expect(isPressHeld(keys, t0 + DOUBLE_PRESS_MS * 4)).toBe(false);
  });

  test('a press that starts no write holds nothing once its update has run', async () => {
    stubStore();
    const graph = await updateRecord({ 'prop-points': 1 });
    const keys = pressKeys(controlWiredTo(graph), 'onClick');
    notePress(keys);
    graph.update();
    expect(storeCalls).toHaveLength(0);
    expect(isPressHeld(keys)).toBe(false);
  });

  test('a save started outside a press holds no control', async () => {
    stubStore();
    const graph = await updateRecord({ 'prop-points': 1 });
    const keys = pressKeys(controlWiredTo(graph), 'onClick');
    pulse(graph);
    graph.update();
    expect(calls('save')).toHaveLength(1);
    expect(isPressHeld(keys)).toBe(false);
  });

  test('two controls wired to the same node share one guard', async () => {
    stubStore();
    const graph = await updateRecord({ 'prop-points': 1 });
    const button = pressKeys(controlWiredTo(graph), 'onClick');
    const field = pressKeys(controlWiredTo(graph), 'onClick');
    const t0 = Date.now();
    notePress(button, t0);
    pulse(graph);
    graph.update();
    expect(isPressHeld(field, t0 + 10)).toBe(true);
    calls('save')[0].options.success({});
    expect(isPressHeld(field, t0 + 10)).toBe(true);
    expect(isPressHeld(field, t0 + DOUBLE_PRESS_MS + 1)).toBe(false);
  });

  test('a control wired to nothing is its own key', () => {
    const lonely = { hasOutput: () => true, getOutput: () => ({ connections: [] }) };
    expect(pressKeys(lonely, 'onClick')).toEqual([lonely]);
  });
});
