/**
 * Bug P123-STU030-SIGNALCAUSE — every signal in the trace had `cause: 0`.
 *
 * `cause` is "the seq of the event that delivered the input being processed when this one was
 * emitted, or 0 for a root". It was set only while a node drained a queued input, so a signal
 * sent from a deferred callback (`scheduleAfterInputsHaveUpdated`, which is where a Function's
 * Run actually runs) or after an `await` (an action's Done, a network answer) was recorded as a
 * root. Measured in Studio on the todo template: 12 of 12 and 8 of 8 signal events were roots,
 * along chains where each step is the previous one's Done.
 *
 * The gate the row names: a two-step chain records the second step's delivering event as caused
 * by the first. Driven through real graphs: a deferred action, an async action reporting through
 * its outcome token, and the real Function node with a script that signals after an `await`.
 */

/* eslint-env jest */

import type { NodeInstance, NodeModule, OutcomeToken } from '@noodl/types';

import { createCorpusGraph, type CorpusGraph } from './graph-harness';
import { outcomeOutputs } from '../../src/outcome';

import FunctionNode = require('../../src/nodes/std-library/simplejavascript');

interface SourceInstance extends NodeInstance {
  pulse(): void;
}

/** A root: its `pulse()` is a DOM event, as far as the trace is concerned. */
const SourceModule: NodeModule = {
  node: {
    name: 'cause.Source',
    category: 'Cause',
    outputs: { onEmit: { type: 'signal' } },
    methods: {
      pulse(this: NodeInstance) {
        this.sendSignalOnOutput('onEmit');
      }
    }
  }
};

/** Runs its work after its inputs have updated, the way a Function's Run does. */
const DeferredModule: NodeModule = {
  node: {
    name: 'cause.Deferred',
    category: 'Cause',
    inputs: {
      run: {
        type: 'signal',
        valueChangedToTrue: function (this: NodeInstance) {
          this.scheduleAfterInputsHaveUpdated(() => this.sendSignalOnOutput('done'));
        }
      }
    },
    outputs: { done: { type: 'signal' } }
  }
};

/** An action whose answer arrives later (a request), reported through its outcome token. */
const AsyncActionModule: NodeModule = {
  node: {
    name: 'cause.AsyncAction',
    category: 'Cause',
    inputs: {
      do: {
        type: 'signal',
        valueChangedToTrue: function (this: NodeInstance) {
          const token: OutcomeToken = this.beginOutcome();
          void Promise.resolve().then(() => this.reportOutcome(token, 'done'));
        }
      }
    },
    outputs: outcomeOutputs()
  }
};

const SinkModule: NodeModule = {
  node: {
    name: 'cause.Sink',
    category: 'Cause',
    inputs: { in: { type: 'signal', valueChangedToTrue: function () {} } }
  }
};

const MODULES = [SourceModule, DeferredModule, AsyncActionModule, SinkModule, FunctionNode as unknown as NodeModule];

async function chain(middle: { type: string; parameters?: Record<string, unknown> }, inPort: string, outPort: string) {
  const graph: CorpusGraph = await createCorpusGraph({
    modules: MODULES,
    data: {
      components: [
        {
          name: '/root',
          nodes: [
            { id: 'source', type: 'cause.Source' },
            { id: 'middle', ...middle },
            { id: 'sink', type: 'cause.Sink' }
          ],
          connections: [
            { sourceId: 'source', sourcePort: 'onEmit', targetId: 'middle', targetPort: inPort },
            { sourceId: 'middle', sourcePort: outPort, targetId: 'sink', targetPort: 'in' }
          ]
        }
      ]
    } as never
  });
  graph.update();
  await graph.settle();
  graph.context.setTraceEnabled(true);
  graph.node<SourceInstance>('source').pulse();
  await graph.settle();
  const events = graph.context.getTraceEvents();
  const first = events.find((e) => e.fromNode === 'source' && e.toNode === 'middle');
  const second = events.find((e) => e.fromNode === 'middle' && e.toNode === 'sink' && e.fromPort === outPort);
  return { first, second };
}

describe('P123-STU030-SIGNALCAUSE — a step caused by the step before it says so', () => {
  it('a signal sent from a deferred callback names the event that scheduled it', async () => {
    const { first, second } = await chain({ type: 'cause.Deferred' }, 'run', 'done');
    expect(first?.cause).toBe(0); // the root
    expect(second?.cause).toBe(first?.seq);
  });

  it('an action’s Done, reported after an await, names the signal that started the action', async () => {
    const { first, second } = await chain({ type: 'cause.AsyncAction' }, 'do', 'done');
    expect(first?.cause).toBe(0);
    expect(second?.cause).toBe(first?.seq);
  });

  it('a Function’s own signal after an await names the Run that started the script', async () => {
    const script = 'await Promise.resolve();\nOutputs.go();';
    const { first, second } = await chain(
      { type: 'JavaScriptFunction', parameters: { functionScript: script } },
      'run',
      'out-go'
    );
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    expect(second?.cause).toBe(first?.seq);
  });

  it('control: a root stays a root — the source’s own pulse has no cause', async () => {
    const { first } = await chain({ type: 'cause.Deferred' }, 'run', 'done');
    expect(first?.cause).toBe(0);
  });
});
