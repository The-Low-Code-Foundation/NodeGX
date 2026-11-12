/* eslint-env jest */

/**
 * P18-S119-FIRSTWRITE, ruled by Richard 2026-10-27: "The last value". A Function that sets the same output twice and then
 * fires a signal hands the signal's target the LAST value. Each write used to be sent at once and the target drains one
 * queued value per pulse (C7), so a reset followed by a set delivered the reset: a Send button's first empty press showed
 * nothing. A signal between two writes still separates them (the eight other cases of s119's `sigprobe.js` read the same).
 */

import type { NodeModule } from '@noodl/types';

import { createCorpusGraph } from './corpus/graph-harness';

import FunctionNode = require('../src/nodes/std-library/simplejavascript');

const log: string[] = [];
const Pulser = {
  node: {
    name: 'corpus.Pulser',
    category: 'Corpus',
    outputs: { fire: { type: 'signal' } },
    methods: {
      pulse(this: { sendSignalOnOutput(p: string): void }) {
        this.sendSignalOnOutput('fire');
      }
    }
  }
} as unknown as NodeModule;
const Recorder = {
  node: {
    name: 'corpus.Recorder',
    category: 'Corpus',
    inputs: {
      a: {
        type: '*',
        set(this: { _internal: { a?: unknown } }, v: unknown) {
          this._internal.a = v;
          log.push(`a=${JSON.stringify(v)}`);
        }
      },
      go: {
        type: 'signal',
        valueChangedToTrue(this: { _internal: { a?: unknown }; scheduleAfterInputsHaveUpdated(cb: () => void): void }) {
          log.push(`go now=${JSON.stringify(this._internal.a)}`);
          this.scheduleAfterInputsHaveUpdated(() => log.push(`go after=${JSON.stringify(this._internal.a)}`));
        }
      }
    }
  }
} as unknown as NodeModule;

async function run(body: string, runs = 1): Promise<string[]> {
  log.length = 0;
  const graph = await createCorpusGraph({
    modules: [FunctionNode as never, Pulser, Recorder],
    data: {
      components: [
        {
          name: '/root',
          nodes: [
            { id: 'p', type: 'corpus.Pulser' },
            {
              id: 'f',
              type: 'JavaScriptFunction',
              parameters: { functionScript: body },
              ports: [
                { name: 'out-a', type: '*', plug: 'output' },
                { name: 'out-go', type: 'signal', plug: 'output' }
              ]
            },
            { id: 'r', type: 'corpus.Recorder' }
          ],
          connections: [
            { sourceId: 'p', sourcePort: 'fire', targetId: 'f', targetPort: 'run' },
            { sourceId: 'f', sourcePort: 'out-a', targetId: 'r', targetPort: 'a' },
            { sourceId: 'f', sourcePort: 'out-go', targetId: 'r', targetPort: 'go' }
          ]
        }
      ]
    } as never
  });
  await graph.settle();
  log.length = 0;
  for (let i = 0; i < runs; i++) {
    log.push(`-- run ${i + 1}`);
    (graph.node('p') as unknown as { pulse(): void }).pulse();
    await graph.settle();
  }
  return log.slice();
}

test('a reset and then a set before the signal: the signal carries the set (the Send button that showed nothing)', async () => {
  const body = "Outputs.a = ''; if (Inputs.name === undefined) { Outputs.a = 'Type a name first'; Outputs.go(); return; }";
  expect(await run(body)).toEqual(['-- run 1', 'a="Type a name first"', 'go now="Type a name first"', 'go after="Type a name first"']);
});

test('written twice, then the signal: the last value, sent once', async () => {
  expect(await run('Outputs.a = 1; Outputs.a = 2; Outputs.go();')).toEqual(['-- run 1', 'a=2', 'go now=2', 'go after=2']);
});

test('a signal between two writes still separates them: the first pulse reads the first, the second the second', async () => {
  expect(await run('Outputs.a = 1; Outputs.go(); Outputs.a = 2; Outputs.go();')).toEqual([
    '-- run 1',
    'a=1',
    'go now=1',
    'go after=1',
    'a=2',
    'go now=2',
    'go after=2'
  ]);
});

test('after an await too: the reset and the set reach the signal as the set', async () => {
  const body = "await Promise.resolve(); Outputs.a = ''; Outputs.a = 'bad'; Outputs.go();";
  expect(await run(body)).toEqual(['-- run 1', 'a="bad"', 'go now="bad"', 'go after="bad"']);
});

test('a value output with no signal: written twice in a run, it arrives once with the last value, every run', async () => {
  const body = 'Outputs.a = 0; Outputs.a = (this.k = (this.k || 0) + 1);';
  expect(await run(body, 2)).toEqual(['-- run 1', 'a=1', '-- run 2', 'a=2']);
});
