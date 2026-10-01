/**
 * P107-C21 — a States transition that is not a curve.
 *
 * `bezier-easing` 1.1.1 throws for anything but four finite numbers with both x in [0, 1], and
 * States called it inside its frame-end callback. So a transition an agent or a wire wrote as
 * `{ dur: 100 }`, `"easeOut"` or `true` made every move into that state silently do nothing: the
 * state did not change, no outcome, and the rest of the frame's queue was dropped. Ruled "fix it"
 * (Richard, 2026-10-01): such a transition reads as the state's Default — or, when the Default is
 * the one refused or is unreadable too, the built-in ease-out over 300 ms — and is reported once.
 *
 * The node-spec conformance suite grades the moves (`scenarios/States.json`, v2); it cannot see the
 * report, which is not in the trace. This file grades both, on the node in a real graph, with a
 * readable transition beside the refused one as the known-firing arm.
 */

/* eslint-env jest */

import type { NodeInstance, NodeModule } from '@noodl/types';

import { createCorpusGraph, type CorpusGraph } from '../../noodl-runtime/test/corpus/graph-harness';

import StatesModule from '../src/nodes/std-library/states';

const SwitcherModule: NodeModule = {
  node: {
    name: 'c21.Switcher',
    category: 'Test',
    outputs: { toB: { type: 'signal' } },
    methods: {
      goToB(this: NodeInstance) {
        this.sendSignalOnOutput('toB');
      }
    }
  }
};

type StatesHandle = {
  registerInputIfNeeded(name: string): void;
  setInputValue(name: string, value: unknown): void;
  getOutput(name: string): { value: unknown };
  raiseRuntimeError: (code: string, message: string, detail?: unknown) => void;
};

async function statesGraph(transitions: Record<string, unknown>): Promise<{ graph: CorpusGraph; raised: string[] }> {
  const graph = await createCorpusGraph({
    modules: [StatesModule as unknown as NodeModule, SwitcherModule],
    data: {
      components: [
        {
          name: '/root',
          nodes: [
            { id: 'switcher', type: 'c21.Switcher' },
            { id: 'states', type: 'States', parameters: { states: 'A,B', values: 'y', 'type-y': 'number', 'value-A-y': 0, 'value-B-y': 10 } }
          ],
          connections: [{ sourceId: 'switcher', sourcePort: 'toB', targetId: 'states', targetPort: 'to-B' }]
        }
      ]
    } as never
  });
  for (let i = 0; i < 40; i++) graph.frame(16);
  const states = graph.node('states') as unknown as StatesHandle;
  const raised: string[] = [];
  states.raiseRuntimeError = (code) => raised.push(code);
  for (const [port, value] of Object.entries(transitions)) {
    states.registerInputIfNeeded(port);
    states.setInputValue(port, value);
  }
  graph.frame(16);
  return { graph, raised };
}

/** Goes to B and reads `y` and `currentState` at each of `at` milliseconds after the request. */
function sampleToB(graph: CorpusGraph, at: number[]): Array<{ ms: number; y: unknown; state: unknown }> {
  (graph.node('switcher') as unknown as { goToB(): void }).goToB();
  const states = graph.node('states') as unknown as StatesHandle;
  const samples: Array<{ ms: number; y: unknown; state: unknown }> = [];
  let now = 0;
  graph.frame(0);
  for (const target of at) {
    while (now < target) {
      graph.frame(16);
      now += 16;
    }
    samples.push({ ms: now, y: states.getOutput('y').value, state: states.getOutput('currentState').value });
  }
  return samples;
}

describe('P107-C21 — a transition that is not a curve reads as the Default and is reported once', () => {
  test('🟢 known-firing: a readable transition moves into B over its own 100 ms, and reports nothing', async () => {
    const { graph, raised } = await statesGraph({ 'transition-B-y': { curve: [0, 0, 1, 1], dur: 100, delay: 0 } });
    const samples = sampleToB(graph, [0, 128]);
    expect(samples[1]).toEqual({ ms: 128, y: 10, state: 'B' });
    expect(raised).toEqual([]);
  });

  test.each([
    ['{ dur } with no curve', { dur: 100, delay: 0 }],
    ['a curve name as text', 'easeOut'],
    ['true', true],
    ['an x outside [0, 1]', { curve: [2, 0, 1, 1], dur: 100, delay: 0 }]
  ])('%s: the state moves to B along the built-in 300 ms ease-out, and it is reported once', async (_name, transition) => {
    const { graph, raised } = await statesGraph({ 'transition-B-y': transition });
    const samples = sampleToB(graph, [0, 128, 320]);
    expect(samples[0].state).toBe('B');
    expect(samples[1].y).not.toBe(10); // still moving at 128 ms: the 300 ms Default, not a 100 ms one
    expect(samples[2]).toEqual({ ms: 320, y: 10, state: 'B' });
    expect(raised).toEqual(['states/unreadable-transition']);
  });

  test("a refused value transition takes the state's own readable Default (100 ms)", async () => {
    const { graph, raised } = await statesGraph({
      'transitiondef-B': { curve: [0, 0, 1, 1], dur: 100, delay: 0 },
      'transition-B-y': { dur: 300 }
    });
    const samples = sampleToB(graph, [0, 128]);
    expect(samples[1]).toEqual({ ms: 128, y: 10, state: 'B' });
    expect(raised).toEqual(['states/unreadable-transition']);
  });

  test('the same refused value is reported once however many moves read it', async () => {
    const { graph, raised } = await statesGraph({ 'transition-B-y': 'easeOut' });
    sampleToB(graph, [0, 320]);
    const states = graph.node('states') as unknown as StatesHandle & { scheduleGoToState(s: string): void };
    states.scheduleGoToState('A');
    for (let i = 0; i < 30; i++) graph.frame(16);
    sampleToB(graph, [0, 320]);
    expect(raised).toEqual(['states/unreadable-transition']);
  });
});
