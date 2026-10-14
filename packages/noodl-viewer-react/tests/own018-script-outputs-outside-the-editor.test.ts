/**
 * P112-OWN018-SCRIPTPORTS — outside the editor, a Script node's wired outputs never connect.
 *
 * Found by Sonnet's yardstick quiz (OWN-018 s3): its Javascript2 engine validated clean and drove nothing, so it rebuilt
 * on a Function. In the packed preview every Script node threw "Cannot read properties of undefined (reading 'type')"
 * at page load — the documented `define({ outputs, signals })` form as much as the legacy `Script.Outputs` one.
 *
 * Why: the Script's ports come from its code, and only the editor puts them on the model (`setup` announces them with
 * `sendDynamicPorts`; the editor sends them back). The preview and a deployed app have no such round trip, so
 * `model.outputPorts` is empty when `NodeScope` makes a wire and calls `registerOutputIfNeeded(port)`, which read
 * `this.model.outputPorts[name].type`. The throw is caught and logged, and the wire is never made. The Function node
 * reads the same map guarded (`simplejavascript.ts`).
 *
 * The harness's editor connection takes `sendDynamicPorts` and sends nothing back — the preview's position exactly.
 */

/* eslint-env jest */

(globalThis as Record<string, any>).Noodl = { deployed: true, baseUrl: '/' };

import type { NodeModule } from '@noodl/types';

import { createCorpusGraph } from '../../noodl-runtime/test/corpus/graph-harness';

import JavascriptModule from '../src/nodes/std-library/javascript';

/** A button: one signal output, sent by the test. */
const button = { node: { name: 'own018.Button', category: 'Test', outputs: { click: { type: 'signal' } } } } as unknown as NodeModule;

/** A node that records every value its one input receives. */
const recorder = (into: unknown[]) =>
  ({ node: { name: 'own018.Text', category: 'Test', inputs: { text: { type: '*', set: (v: unknown) => into.push(v) } } } }) as unknown as NodeModule;

const CODE = {
  // The spec's form (`scenarios/Javascript2.json`): a signal input is declared, its function is named after it.
  define: "define({\n  inputs: { go: 'signal' },\n  outputs: { msg: 'string' },\n  go: function (inputs, outputs) {\n    outputs.msg = 'clicked';\n  }\n});\n",
  // Sonnet's form, the parser's legacy API.
  legacy: "Script.Outputs = {\n  msg: 'string'\n};\n\nScript.Signals.go = function () {\n  Script.Outputs.msg = 'clicked';\n};\n",
  // A signal output nothing is wired to: still a function on `outputs` (the editor's model always had it), so the
  // line after it runs.
  'unwired signal': "define({\n  inputs: { go: 'signal' },\n  outputs: { msg: 'string', done: 'signal' },\n  go: function (inputs, outputs) {\n    outputs.done();\n    outputs.msg = 'clicked';\n  }\n});\n"
};

async function play(code: string) {
  const seen: unknown[] = [];
  const logged: string[] = [];
  const spy = jest.spyOn(console, 'error').mockImplementation((...args: unknown[]) => void logged.push(args.map(String).join(' ')));
  try {
    const graph = await createCorpusGraph({
      modules: [JavascriptModule as unknown as NodeModule, button, recorder(seen)],
      data: {
        components: [
          {
            name: '/root',
            nodes: [
              { id: 'btn', type: 'own018.Button' },
              { id: 'script', type: 'Javascript2', parameters: { code } },
              { id: 'text', type: 'own018.Text' }
            ],
            connections: [
              { sourceId: 'script', sourcePort: 'msg', targetId: 'text', targetPort: 'text' },
              { sourceId: 'btn', sourcePort: 'click', targetId: 'script', targetPort: 'go' }
            ]
          }
        ]
      } as never
    });
    await graph.settle();
    graph.node('btn').sendSignalOnOutput('click');
    await graph.settle();
    return { seen, logged };
  } finally {
    spy.mockRestore();
  }
}

describe('P112-OWN018-SCRIPTPORTS — a Script node outside the editor', () => {
  it.each(Object.keys(CODE) as Array<keyof typeof CODE>)('%s form: the wired output arrives, and nothing is logged', async (form) => {
    const { seen, logged } = await play(CODE[form]);
    expect({ seen, logged }).toEqual({ seen: expect.arrayContaining(['clicked']), logged: [] });
  });
});
