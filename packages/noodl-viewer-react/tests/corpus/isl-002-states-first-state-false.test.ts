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
 * 🔴 **This file is a MEASUREMENT, not a fix.** The fix needs Richard's ruling (ISL-002 §5: typed
 * value / skip unset / document only; and whether the export's `statesLib.ts` changes in the same
 * commit). The two rows the source predicts red are declared `test.failing`, so this suite stays
 * green until the ruling lands — at which point they must be flipped to plain `test`s, and jest
 * will say so (a `test.failing` that passes fails).
 *
 * The recorder is wired, not read off the node: the person's defect is what arrives on the wire.
 */

/* eslint-env jest */

import '../../../noodl-runtime/test/corpus/expected-failure';

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

  // 🔴 Expected RED at HEAD (ISL-002 AC1). Flip to `test` when the ruling's fix lands.
  test.failing('AC1: a boolean false in the first state arrives as false', async () => {
    const graph = await statesGraph(extra);
    await graph.settle(3);
    expect(last(graph, 'flag')).toEqual({ port: 'flag', value: false, type: 'boolean' });
  });

  test.failing('AC1: an empty string in the first state arrives as the empty string', async () => {
    const graph = await statesGraph(extra);
    await graph.settle(3);
    expect(last(graph, 'label')).toEqual({ port: 'label', value: '', type: 'string' });
  });

  test('what actually arrives at HEAD: the number 0, for both (recorded for §8)', async () => {
    const graph = await statesGraph(extra);
    await graph.settle(3);
    // Pinned so the reading is in the suite's own words; this row goes red the moment the fix
    // lands, beside the two above, and is deleted then.
    expect(last(graph, 'flag')).toEqual({ port: 'flag', value: 0, type: 'number' });
    expect(last(graph, 'label')).toEqual({ port: 'label', value: 0, type: 'number' });
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
