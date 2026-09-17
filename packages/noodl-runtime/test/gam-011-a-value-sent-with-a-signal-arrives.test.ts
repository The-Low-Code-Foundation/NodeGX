/**
 * GAM-011 AC2 — a value a Function writes in the same run as it fires a signal arrives with that signal.
 *
 * Session 21 drove an on-screen keypad in Chromium: eleven Buttons, each running a Function
 * `Outputs.key = "<k>"; Outputs.press();`, every `out-key` wired into one Text Input's `Text To Insert`
 * and every `out-press` into its `Insert Text`. It typed `305` as `300` and `42` as `44`: a Function
 * publishes an output only when **its own** last value changes (`simplejavascript.ts`, kept for old
 * projects), so key 5, still holding `5` from an earlier answer, published nothing, and the shared input
 * still held the `0` another key had sent.
 *
 * Richard, 2026-09-17: *"whatever actually fixes it"*. The fix keeps the old rule for a value written on
 * its own, and publishes an unchanged value **when the same run fires a signal**: a value and a signal
 * sent together are one message, and the receiver of the signal must read that message's value.
 *
 * Driven through the real Function node in a runtime graph, each tap in its own frame.
 */
import type { NodeInstance, NodeModule } from '@noodl/types';

import { createCorpusGraph, type CorpusGraph } from './corpus/graph-harness';

import FunctionNode = require('../src/nodes/std-library/simplejavascript');

interface FieldState {
  typed: string;
  text: string;
  textSets: number;
}
const state = (node: unknown) => (node as NodeInstance)._internal as unknown as FieldState;

/** The finger: one signal output per key. */
const FingerModule: NodeModule = {
  node: {
    name: 'gam011.Finger',
    category: 'Test',
    outputs: { tap1: { type: 'signal' }, tap2: { type: 'signal' }, tap3: { type: 'signal' } },
    inputs: {}
  }
};

/** The field, as far as the keypad reaches it: a text input and an insert signal that appends it. */
const FieldModule: NodeModule = {
  node: {
    name: 'gam011.Field',
    category: 'Test',
    initialize(this: NodeInstance) {
      this._internal.typed = '';
      this._internal.textSets = 0;
    },
    inputs: {
      textToInsert: {
        type: 'string',
        set(this: NodeInstance, value: string) {
          state(this).text = value;
          state(this).textSets += 1;
        }
      },
      insert: {
        type: 'signal',
        valueChangedToTrue(this: NodeInstance) {
          state(this).typed += state(this).text;
        }
      }
    },
    outputs: {}
  }
};

const MODULES = [FingerModule, FieldModule, FunctionNode].map((m) => m as unknown as NodeModule);

const key = (id: string, k: string, withSignal = true) => ({
  id,
  type: 'JavaScriptFunction',
  parameters: { functionScript: withSignal ? `Outputs.key = "${k}"; Outputs.press();` : `Outputs.key = "${k}";` },
  // The ports the editor derives from the script and saves on the node, as a project file carries them.
  ports: [
    { name: 'out-key', plug: 'output', type: 'string' },
    ...(withSignal ? [{ name: 'out-press', plug: 'output', type: 'signal' }] : [])
  ]
});

async function keypad(withSignal = true): Promise<CorpusGraph> {
  const graph = await createCorpusGraph({
    modules: MODULES,
    rootComponent: '/root',
    data: {
      components: [
        {
          name: '/root',
          nodes: [
            { id: 'finger', type: 'gam011.Finger' },
            { id: 'field', type: 'gam011.Field' },
            key('k1', '1', withSignal),
            key('k2', '2', withSignal),
            key('k3', '3', withSignal)
          ],
          connections: ['1', '2', '3'].flatMap((k) => [
            { sourceId: 'finger', sourcePort: `tap${k}`, targetId: `k${k}`, targetPort: 'run' },
            { sourceId: `k${k}`, sourcePort: 'out-key', targetId: 'field', targetPort: 'textToInsert' },
            ...(withSignal ? [{ sourceId: `k${k}`, sourcePort: 'out-press', targetId: 'field', targetPort: 'insert' }] : [])
          ])
        }
      ]
    } as never
  });
  await graph.settle(4);
  return graph;
}

async function type(graph: CorpusGraph, digits: string): Promise<string> {
  const finger = graph.node('finger') as unknown as { sendSignalOnOutput(name: string): void };
  for (const d of digits) {
    finger.sendSignalOnOutput(`tap${d}`);
    await graph.settle(8);
  }
  return state(graph.node('field')).typed;
}

describe('GAM-011 AC2 — a keypad of Functions types what was tapped', () => {
  test('known-firing: three different keys, once each, type 123', async () => {
    expect(await type(await keypad(), '123')).toBe('123');
  });

  test('a key tapped again after another key types itself: 121, 1221, 3113', async () => {
    expect(await type(await keypad(), '121')).toBe('121');
    expect(await type(await keypad(), '1221')).toBe('1221');
    expect(await type(await keypad(), '3113')).toBe('3113');
  });

  test('the same key twice in a row types it twice', async () => {
    expect(await type(await keypad(), '11')).toBe('11');
  });

  test('backwards compatible: a Function that writes an unchanged value and fires no signal still publishes nothing', async () => {
    const graph = await keypad(false);
    await type(graph, '1');
    const field = state(graph.node('field'));
    const afterFirst = field.textSets;
    await type(graph, '1');
    expect(field.textSets).toBe(afterFirst);
    // …while a changed value still does (known-firing half of the same run).
    await type(graph, '2');
    expect(field.textSets).toBe(afterFirst + 1);
  });
});
