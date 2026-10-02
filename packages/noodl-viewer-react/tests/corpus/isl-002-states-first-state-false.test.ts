/**
 * ISL-002 (P109 F02) — a `false` from a States node's first state reaches its wire as `false`.
 *
 * Olive's Island's `plMode` States node said `record: false` in Drive, its first state, and four
 * Drive presses still recorded four blocks. The template now sends `'yes'`/`'no'` strings instead.
 *
 * What the source predicts (states.ts, re-read at HEAD): the first state is entered by
 * `jumpToState`, which writes `stateParameters['value-<state>-<v>'] || 0` for every value, whatever
 * its type (`:633`). So a boolean `false` and a string `''` both leave as the number `0`; a
 * non-empty string survives the `||`. Every later move goes through `goToState`'s typed branch,
 * where a boolean becomes `_b === undefined ? false : !!_b` and a string is assigned as it is —
 * so the same `false` is right when the node comes BACK to its first state.
 *
 * Measured RED at `b5c1b6453` (session 1): both arrived as the number `0`, in both transition
 * settings. Ruled 2026-10-02 (ISL-002 §5): the first state sends the typed value, and the export's
 * `statesLib.ts` changes in the same commit. Both moves now read one helper, `typedStateValue`.
 *
 * The recorder is wired, not read off the node: the person's defect is what arrives on the wire.
 */

/* eslint-env jest */

import type { NodeInstance, NodeModule } from '@noodl/types';

import { createCorpusGraph, type CorpusGraph } from '../../../noodl-runtime/test/corpus/graph-harness';

import StatesModule from '../../src/nodes/std-library/states';

interface Recorded {
  port: string;
  value: unknown;
  type: string;
}

interface RecorderInstance extends NodeInstance {
  _recorded: Recorded[];
}

/** Three any-typed inputs that write down exactly what arrived, and its `typeof`. */
const RecorderModule: NodeModule = {
  node: {
    name: 'corpus.Recorder',
    category: 'Corpus',
    initialize: function (this: RecorderInstance) {
      this._recorded = [];
    },
    inputs: Object.fromEntries(
      ['flag', 'label', 'word'].map((port) => [
        port,
        {
          type: '*',
          set: function (this: RecorderInstance, value: unknown) {
            this._recorded.push({ port, value, type: typeof value });
          }
        }
      ])
    )
  }
};

const VALUES = {
  states: 'off,on',
  values: 'flag,label,word',
  'type-flag': 'boolean',
  'type-label': 'string',
  'type-word': 'string',
  'value-off-flag': false,
  'value-on-flag': true,
  'value-off-label': '',
  'value-on-label': 'x',
  'value-off-word': 'no',
  'value-on-word': 'yes'
};

async function statesGraph(extra: Record<string, unknown>): Promise<CorpusGraph> {
  return createCorpusGraph({
    modules: [StatesModule as unknown as NodeModule, RecorderModule],
    data: {
      components: [
        {
          name: '/root',
          nodes: [
            { id: 'states', type: 'States', parameters: { ...VALUES, ...extra } },
            { id: 'rec', type: 'corpus.Recorder' }
          ],
          connections: [
            { sourceId: 'states', sourcePort: 'flag', targetId: 'rec', targetPort: 'flag' },
            { sourceId: 'states', sourcePort: 'label', targetId: 'rec', targetPort: 'label' },
            { sourceId: 'states', sourcePort: 'word', targetId: 'rec', targetPort: 'word' }
          ]
        }
      ]
    } as never
  });
}

/** The latest value that arrived on `port`, with its type. */
function last(graph: CorpusGraph, port: string): Recorded | undefined {
  const rec = graph.node('rec') as unknown as RecorderInstance;
  return [...rec._recorded].reverse().find((r) => r.port === port);
}

function pulse(graph: CorpusGraph, port: string): void {
  const node = graph.node('states');
  node.registerInputIfNeeded(port);
  node.setInputValue(port, false);
  node.setInputValue(port, true);
}

describe.each([
  ['transitions off', { useTransitions: false }],
  ['transitions on (the default; separates this from D49)', { useTransitions: true }]
])('ISL-002: the first state, %s', (_label, extra) => {
  test('known-firing control: a non-empty string in the first state arrives as itself', async () => {
    const graph = await statesGraph(extra);
    await graph.settle(3);
    expect(last(graph, 'word')).toEqual({ port: 'word', value: 'no', type: 'string' });
  });

  // ISL-002 AC1 — RED before the fix (both read `0`, `number`).
  test('AC1: a boolean false in the first state arrives as false', async () => {
    const graph = await statesGraph(extra);
    await graph.settle(3);
    expect(last(graph, 'flag')).toEqual({ port: 'flag', value: false, type: 'boolean' });
  });

  test('AC1: an empty string in the first state arrives as the empty string', async () => {
    const graph = await statesGraph(extra);
    await graph.settle(3);
    expect(last(graph, 'label')).toEqual({ port: 'label', value: '', type: 'string' });
  });

  test('cause isolation: coming BACK to the first state through goToState gives false and the empty string', async () => {
    const graph = await statesGraph({ ...extra, useTransitions: false });
    await graph.settle(3);
    pulse(graph, 'to-on');
    await graph.settle(3);
    expect(last(graph, 'flag')).toEqual({ port: 'flag', value: true, type: 'boolean' });
    pulse(graph, 'to-off');
    await graph.settle(3);
    expect(last(graph, 'flag')).toEqual({ port: 'flag', value: false, type: 'boolean' });
    expect(last(graph, 'label')).toEqual({ port: 'label', value: '', type: 'string' });
    expect(last(graph, 'word')).toEqual({ port: 'word', value: 'no', type: 'string' });
  });
});
