/**
 * P112-OWN020-UNWIREDSIGNAL — a Function whose code calls a signal nobody wired threw "Outputs.done is not a function".
 *
 * Found by DeepSeek V4.1 Flash on the Cline kit (OWN-020 CDQ2): three Functions on the quiz's Home page each set their
 * values and ended `Outputs.done();`, with only the values wired and no `ports` saved on the node. The MCP's from-disk
 * render reported "The script threw: Outputs.done is not a function" on every run, while the Function spec's
 * "a signal the code calls with no wire on it sends nothing; the run still succeeds" passed.
 *
 * Why: the run prepares a callable for each signal in `model.outputPorts` (simplejavascript.ts, "Prepare send signal
 * functions"). In the editor that list holds the code's signals because the module's `setup` pushes them there
 * (`_managePortsForNode`, "it's needed by the initial run of the script function"), and an editor deploy saves them as
 * the node's `ports`. Nothing else does: a project written to disk by an agent, rendered by the preview or the MCP
 * (whose node library comes from a deployed-mode runtime), loads with no saved ports, and `setup` returns early outside
 * the editor. The spec's target seeds the model's saved ports from the code, so it played the editor's project.
 *
 * The fix: the run's signals are the saved ones plus the ones the PLACING declares — its `functionScript` and its
 * `scriptOutputs` typed Signal — read off the model, as `_managePortsForNode` reads them. A script set while the app runs
 * is not the placing's, so the spec's "a new signal is not a function" is unchanged.
 *
 * This harness registers node definitions only (no module `setup`) and hands the runtime the component as the file
 * holds it: the from-disk path.
 *
 * Sabotage: make `placingSignalPorts` return only the saved signals → the first, second and fourth tests throw again.
 */
import type { NodeModule } from '@noodl/types';

import { createCorpusGraph } from './corpus/graph-harness';

import FunctionNode = require('../src/nodes/std-library/simplejavascript');

/** A node that records every value its one input receives. */
const recorder = (name: string, input: string, type: string, into: unknown[]): NodeModule =>
  ({
    node: {
      name,
      category: 'Test',
      inputs: {
        [input]: type === 'signal' ? { type, valueChangedToTrue: () => into.push('signal') } : { type, set: (v: unknown) => into.push(v) }
      }
    }
  }) as unknown as NodeModule;

type Wire = { from: string; to: string };

async function runFunction(fn: Record<string, unknown>, wires: Wire[]) {
  const best: unknown[] = [];
  const done: unknown[] = [];
  const graph = await createCorpusGraph({
    modules: [
      FunctionNode as unknown as NodeModule,
      recorder('own020.Best', 'value', '*', best),
      recorder('own020.Done', 'go', 'signal', done)
    ],
    rootComponent: '/root',
    data: {
      components: [
        {
          name: '/root',
          nodes: [{ id: 'fn', type: 'JavaScriptFunction', ...fn }, { id: 'bestProbe', type: 'own020.Best' }, { id: 'doneProbe', type: 'own020.Done' }],
          connections: wires.map((w) => ({
            sourceId: 'fn',
            sourcePort: w.from,
            targetId: w.to === 'value' ? 'bestProbe' : 'doneProbe',
            targetPort: w.to
          }))
        }
      ]
    } as never
  });
  await graph.settle(6);
  const threw = graph.errors.filter((e) => (e as { code?: string }).code === 'function/script-threw');
  return { best, done, threw, signals: graph.signalsFor('fn') };
}

// CDQ2's shape: values set, then the signal called, a line after it, and only the value wired.
const SCRIPT = 'Outputs.best = 1;\nOutputs.done();\nOutputs.after = true;';

describe('P112-OWN020-UNWIREDSIGNAL — a Function loaded from disk calls a signal nobody wired', () => {
  test('🟢 the run succeeds: no throw, the wired value arrives, the line after the call runs, nothing is sent', async () => {
    const r = await runFunction({ parameters: { functionScript: SCRIPT } }, [{ from: 'out-best', to: 'value' }]);
    expect(r.threw).toEqual([]);
    expect(r.best).toContain(1);
    expect(r.signals).toContain('success');
    expect(r.signals).not.toContain('failure');
    expect(r.signals).not.toContain('out-done');
  });

  test('🟢 wired, the signal is sent', async () => {
    const r = await runFunction({ parameters: { functionScript: SCRIPT } }, [
      { from: 'out-best', to: 'value' },
      { from: 'out-done', to: 'go' }
    ]);
    expect(r.threw).toEqual([]);
    expect(r.done).toEqual(['signal']);
    expect(r.signals).toContain('success');
  });

  test('🟢 control: with the port saved on the node, as an editor deploy writes it, the run succeeds (it always did)', async () => {
    const r = await runFunction(
      { parameters: { functionScript: SCRIPT }, ports: [{ name: 'out-done', plug: 'output', type: 'signal' }] },
      [{ from: 'out-best', to: 'value' }]
    );
    expect(r.threw).toEqual([]);
    expect(r.signals).toContain('success');
  });

  test('🟢 a signal declared in the written list (Outputs, typed Signal) and called by name', async () => {
    const r = await runFunction(
      {
        parameters: {
          functionScript: 'Outputs.best = 1;\nOutputs["finished"].send();',
          scriptOutputs: [{ id: 'a', label: 'finished' }],
          'outtype-finished': 'signal'
        }
      },
      [{ from: 'out-best', to: 'value' }]
    );
    expect(r.threw).toEqual([]);
    expect(r.signals).toContain('success');
  });

  test('🟢 control: a name the code only assigns stays a value — calling it is still the author\'s error', async () => {
    const r = await runFunction({ parameters: { functionScript: 'Outputs.best = 1;\nconst f = "done";\nOutputs[f]();' } }, [
      { from: 'out-best', to: 'value' }
    ]);
    expect(r.threw.length).toBe(1);
    expect(r.signals).toContain('failure');
  });
});
