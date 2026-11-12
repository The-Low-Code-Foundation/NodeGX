/* eslint-env jest */

/**
 * P112-OWN018-FANOUT, measured in the runtime (Beta sweep s19, 2026-10-27): one pulse evaluates two Conditions, a score
 * gate whose condition is `index == 0` over a Counter, and an advance gate whose On True increases that Counter. The
 * score gate reads the index AFTER the advance, whichever order the two Evaluates are wired in, and whether the pulse is
 * sent from outside a frame or inside one. Chained (score's Done → advance's Evaluate), it reads the index from before.
 *
 * Richard ruled "Teach it and warn": the runtime keeps this order, so these rows pin what the notes and the editor's
 * `condition-reads-a-siblings-change` warning describe. If one of them moves, the notes and the warning are wrong.
 */

import type { NodeModule } from '@noodl/types';

import { createCorpusGraph } from './graph-harness';

import ExpressionNode = require('../../src/nodes/std-library/expression');
import ConditionNode = require('../../src/nodes/std-library/condition');
import CounterNode = require('../../src/nodes/std-library/counter');

const hits: string[] = [];
const Pulse = {
  node: {
    name: 'corpus.Pulse',
    category: 'Test',
    inputs: {
      go: {
        type: 'signal',
        displayName: 'Go',
        valueChangedToTrue(this: { sendSignalOnOutput(p: string): void }) {
          this.sendSignalOnOutput('pulse');
        }
      }
    },
    outputs: { pulse: { type: 'signal', displayName: 'Pulse' } }
  }
} as unknown as NodeModule;
const Recorder = {
  node: {
    name: 'corpus.Recorder',
    category: 'Test',
    inputs: {
      scored: { type: 'signal', displayName: 'Scored', valueChangedToTrue: () => hits.push('scored') },
      missed: { type: 'signal', displayName: 'Missed', valueChangedToTrue: () => hits.push('missed') }
    }
  }
} as unknown as NodeModule;

async function quiz(order: 'score-first' | 'advance-first' | 'score-alone' | 'chained') {
  const toScore = { sourceId: 'src', sourcePort: 'pulse', targetId: 'score', targetPort: 'eval' };
  const toAdvance = { sourceId: 'src', sourcePort: 'pulse', targetId: 'advance', targetPort: 'eval' };
  const graph = await createCorpusGraph({
    modules: [ExpressionNode as never, ConditionNode as never, CounterNode as never, Pulse, Recorder],
    data: {
      components: [
        {
          name: '/root',
          nodes: [
            { id: 'src', type: 'corpus.Pulse', parameters: {} },
            { id: 'index', type: 'Counter', parameters: { startValue: 0 } },
            { id: 'isFirst', type: 'Expression', parameters: { expression: 'index == 0' } },
            { id: 'score', type: 'Condition', parameters: { 'runOnChange-condition': false } },
            { id: 'advance', type: 'Condition', parameters: { 'runOnChange-condition': false, condition: true } },
            { id: 'rec', type: 'corpus.Recorder', parameters: {} }
          ],
          connections: [
            { sourceId: 'index', sourcePort: 'currentCount', targetId: 'isFirst', targetPort: 'index' },
            { sourceId: 'isFirst', sourcePort: 'result', targetId: 'score', targetPort: 'condition' },
            ...(order === 'score-first' ? [toScore, toAdvance] : order === 'advance-first' ? [toAdvance, toScore] : order === 'score-alone' ? [toScore] : [toScore, { sourceId: 'score', sourcePort: 'done', targetId: 'advance', targetPort: 'eval' }]),
            { sourceId: 'score', sourcePort: 'ontrue', targetId: 'rec', targetPort: 'scored' },
            { sourceId: 'score', sourcePort: 'onfalse', targetId: 'rec', targetPort: 'missed' },
            { sourceId: 'advance', sourcePort: 'ontrue', targetId: 'index', targetPort: 'increase' }
          ]
        }
      ]
    } as never
  });
  await graph.settle(4);
  return graph;
}

beforeEach(() => {
  hits.length = 0;
});

for (const inFrame of [false, true])
for (const order of ['score-first', 'advance-first', 'score-alone', 'chained'] as const) {
  test(`${order}${inFrame ? ' (pulse sent inside a frame)' : ''}: the pulse at index 0 ${order === 'score-alone' || order === 'chained' ? 'scores' : 'is scored against the next index'}`, async () => {
    const graph = await quiz(order);
    expect(graph.node('index').getOutput('currentCount').value).toBe(0);
    expect(graph.node('isFirst').getOutput('result').value).toBe(true);
    const src = graph.node('src') as unknown as { sendSignalOnOutput(p: string): void; queueInput(p: string, v: unknown): void };
    if (inFrame) {
      src.queueInput('go', true);
      src.queueInput('go', false);
    } else src.sendSignalOnOutput('pulse');
    await graph.settle(4);
    expect(hits).toEqual(order === 'score-alone' || order === 'chained' ? ['scored'] : ['missed']);
    expect(graph.node('index').getOutput('currentCount').value).toBe(order === 'score-alone' ? 0 : 1);
  });
}
