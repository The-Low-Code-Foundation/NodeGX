/**
 * P112-OWN018-COUNTERZERO — a Counter whose Start Value is 10 told its consumers 0 first.
 *
 * Found by Mistral Large 4's quiz (OWN-018 s2, run 1): question 1 was skipped ~1 s after Start. Its `Logic/Quiz Engine`
 * (kept as `fixtures/own018-quiz-engine/`, nodes and wires exactly as the agent wrote them) counts down with a Counter
 * (Start Value "10") into an Expression `count === 0 && !answered`, into a Condition left on Run On Value Change whose
 * `ontrue` locks the question and starts the one-second advance Timer.
 *
 * Why it fired: `NodeScope.setNodeParameters` QUEUES a node's parameters (they land at its first update), while the
 * component's wires are made right after every node is created, and `connectInput` hands the target the source's
 * current value at once. The Counter's count before its queued Start Value lands is `initialize`'s 0. Measured with the
 * Expression's evaluations wrapped: `scope {count: 0} → true`, then `{count: 10} → false`. In the browser (Noodl.Variables
 * sampled every 5 ms): `answered` true at 23 ms, the engine's own start at 38 ms, question 2 at 1036 ms.
 *
 * The fix (counter.ts `currentCount`): until the first Start Value lands, the count is the one the model carries.
 *
 * Sabotage: revert the getter to `return this._internal.currentValue` → the whole-engine test reads
 * `timeout: ["ontrue", …]` and the zero Expression publishes `true` first.
 */
import type { NodeModule } from '@noodl/types';
import fs = require('fs');
import path = require('path');

import { createCorpusGraph } from './corpus/graph-harness';

import ExpressionNode = require('../src/nodes/std-library/expression');
import ConditionNode = require('../src/nodes/std-library/condition');
import CounterNode = require('../src/nodes/std-library/counter');
import StaticDataNode = require('../src/nodes/std-library/data/staticdata');
import VariableNode = require('../src/nodes/std-library/data/variablenode2');
import SetVariableNode = require('../src/nodes/std-library/data/setvariablenode');
import FunctionNode = require('../src/nodes/std-library/simplejavascript');
import ComponentInputs = require('../src/nodes/componentinputs');
import ComponentOutputs = require('../src/nodes/componentoutputs');

type Wire = { fromId: string; fromProperty: string; toId: string; toProperty: string };
type Node = { id: string; type: string; parameters?: Record<string, unknown> };

/** Repeat, Timer and RouterNavigate live in the viewer; at load they only matter as signal ports, so they are stubs. */
const stub = (name: string, inputs: string[], outputs: string[]): NodeModule =>
  ({
    node: {
      name,
      category: 'Test',
      inputs: Object.fromEntries(inputs.map((i) => [i, { type: 'signal', valueChangedToTrue() {} }])),
      outputs: Object.fromEntries(outputs.map((o) => [o, { type: 'signal' }]))
    }
  }) as unknown as NodeModule;

/** A node that records every value its one input receives. */
const recorder = (name: string, input: string, into: unknown[]): NodeModule =>
  ({ node: { name, category: 'Test', inputs: { [input]: { type: '*', set: (v: unknown) => into.push(v) } } } }) as unknown as NodeModule;

const MODULES = [
  ExpressionNode,
  ConditionNode,
  CounterNode,
  StaticDataNode,
  VariableNode,
  SetVariableNode,
  FunctionNode,
  ComponentInputs,
  ComponentOutputs
].map((m) => m as unknown as NodeModule);

const asConnections = (wires: Wire[]) =>
  wires.map((w) => ({ sourceId: w.fromId, sourcePort: w.fromProperty, targetId: w.toId, targetPort: w.toProperty }));

/** A Counter wired straight into a recorder: what the count's wire hands on, from the first delivery. */
async function countsHandedOn(parameters: Record<string, unknown>): Promise<unknown[]> {
  const seen: unknown[] = [];
  const graph = await createCorpusGraph({
    modules: [CounterNode as unknown as NodeModule, recorder('own018.Count', 'count', seen)],
    rootComponent: '/root',
    data: {
      components: [
        {
          name: '/root',
          nodes: [
            { id: 'seconds', type: 'Counter', parameters },
            { id: 'probe', type: 'own018.Count' }
          ],
          connections: asConnections([{ fromId: 'seconds', fromProperty: 'currentCount', toId: 'probe', toProperty: 'count' }])
        }
      ]
    } as never
  });
  await graph.settle(4);
  return seen;
}

describe('P112-OWN018-COUNTERZERO — a countdown at page load', () => {
  test("🟢 Mistral's Quiz Engine as written: the time's-up gate stays quiet at load", async () => {
    const dir = path.join(__dirname, 'fixtures', 'own018-quiz-engine');
    const nodes: Node[] = JSON.parse(fs.readFileSync(path.join(dir, 'nodes.json'), 'utf8')).nodes;
    const wires: Wire[] = JSON.parse(fs.readFileSync(path.join(dir, 'connections.json'), 'utf8')).connections;
    const zeroResults: unknown[] = [];
    const graph = await createCorpusGraph({
      modules: [
        ...MODULES,
        recorder('own018.Zero', 'result', zeroResults),
        stub('Repeat', ['start', 'stop'], ['tick']),
        stub('Timer', ['start', 'stop'], ['timerFinished']),
        stub('RouterNavigate', ['navigate'], [])
      ],
      rootComponent: '/root',
      data: {
        components: [
          {
            name: '/root',
            nodes: [...nodes.map((n) => ({ id: n.id, type: n.type, parameters: n.parameters || {} })), { id: 'zeroProbe', type: 'own018.Zero' }],
            connections: asConnections([...wires, { fromId: 'qe_expr_zero', fromProperty: 'result', toId: 'zeroProbe', toProperty: 'result' }])
          }
        ]
      } as never
    });
    await graph.settle(8);
    const timeout = graph.signalsFor('qe_timeout');
    console.log('OWN-018 engine at load:', JSON.stringify({ zeroResults, timeout, setAnsweredTrue: graph.signalsFor('qe_set_answered_true') }));
    expect(zeroResults).not.toContain(true);
    expect(timeout).not.toContain('ontrue');
    expect(graph.signalsFor('qe_set_answered_true')).toEqual([]);
  });

  // Not tested on its own: a lone Counter wired to a recorder hands on 10 with or without the fix, because a graph that
  // small drains the Counter's queued Start Value before the wire's first delivery. The window needs a component the
  // size of the engine above, which is why that test carries the proof (its sabotage fails; this shape's would not).
  test('🟢 control: a Counter with no Start Value still starts at 0', async () => {
    expect(await countsHandedOn({})).toEqual([0]);
  });
});
