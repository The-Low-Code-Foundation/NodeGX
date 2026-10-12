/**
 * P109 ISL-004 AC5 — F05, recorded: a writer holding an older copy of the state lands last and puts it back.
 *
 * Olive's Island (P106 IG-004 §7.6 item 13): after "Bring home" the robot walked back to the tulips. The tick kept the
 * world it was built from and its `Set Variable` landed after the rebuild's, restoring the older state. Ruled
 * 2026-10-05 (s18) **"No, it's app logic"**: the product does not order or version competing writers, and the build
 * stamp is the taught idiom. So this file is a RECORD, not a fix — the first row asserts the defect as a person meets
 * it, and goes red only if the runtime starts refusing a stale write.
 *
 * The graph, three arms over one Variable `isl004World`:
 *   - the tick: a Function run by a signal, holding its own copy in its Component Object (first run: the Variable's
 *     value) and writing copy + 1 through `Set Variable` — the island's held state;
 *   - the rebuild: a `Set Variable` writing 100 between two ticks;
 *   - read: the Variable after the next tick.
 * A person expects 101 (the newer state, ticked once). The held copy writes 2.
 */
import type { NodeInstance, NodeModule } from '@noodl/types';

import { createCorpusGraph, type CorpusGraph } from './corpus/graph-harness';

import Model = require('../src/model');
import FunctionNode = require('../src/nodes/std-library/simplejavascript');
import SetVariableNode = require('../src/nodes/std-library/data/setvariablenode');
import VariableNode = require('../src/nodes/std-library/data/variablenode2');

interface DriverInstance extends NodeInstance {
  fire(signal: 'tick' | 'rebuild'): void;
}

const DriverModule: NodeModule = {
  node: {
    name: 'isl004.Driver',
    category: 'Test',
    outputs: { tick: { type: 'signal' }, rebuild: { type: 'signal' } },
    methods: {
      fire(this: NodeInstance, signal: string) {
        this.sendSignalOnOutput(signal);
      }
    }
  }
};

const MODULES = [DriverModule, FunctionNode, SetVariableNode, VariableNode].map((m) => m as unknown as NodeModule);
const NAME = 'isl004World';

type Node = { id: string; type: string; parameters?: Record<string, unknown> };
type Wire = [string, string, string, string];

async function build(tickScript: string, extraNodes: Node[] = [], extraWires: Wire[] = []): Promise<CorpusGraph> {
  const nodes: Node[] = [
    { id: 'driver', type: 'isl004.Driver' },
    { id: 'world', type: 'Variable2', parameters: { name: NAME } },
    { id: 'tick', type: 'JavaScriptFunction', parameters: { functionScript: tickScript, 'runOnChange-in-world': false, 'runOnChange-in-build': false } },
    { id: 'tickWrite', type: 'Set Variable', parameters: { name: NAME } },
    { id: 'rebuild', type: 'Set Variable', parameters: { name: NAME, value: 100 } },
    ...extraNodes
  ];
  const wires: Wire[] = [
    ['driver', 'tick', 'tick', 'run'],
    ['world', 'value', 'tick', 'in-world'],
    ['tick', 'out-next', 'tickWrite', 'value'],
    ['tick', 'success', 'tickWrite', 'do'],
    ['driver', 'rebuild', 'rebuild', 'do'],
    ...extraWires
  ];
  const graph = await createCorpusGraph({
    modules: MODULES,
    rootComponent: '/root',
    data: {
      components: [
        {
          name: '/root',
          nodes,
          connections: wires.map(([sourceId, sourcePort, targetId, targetPort]) => ({ sourceId, sourcePort, targetId, targetPort }))
        }
      ]
    } as never
  });
  await graph.settle(4);
  return graph;
}

/** Tick, tick, rebuild, tick: the Variable after each step. */
async function play(graph: CorpusGraph): Promise<unknown[]> {
  const driver = graph.node<DriverInstance>('driver');
  const read = () => Model.get('--ndl--global-variables').get(NAME);
  const out: unknown[] = [];
  for (const step of ['tick', 'tick', 'rebuild', 'tick'] as const) {
    driver.fire(step);
    await graph.settle(8);
    out.push(read());
  }
  return out;
}

beforeEach(() => {
  Model.get('--ndl--global-variables').set(NAME, 0);
});

// The island's tick: its own copy, kept between runs. `Outputs.next` is a fresh write each run (a number that changes).
const HELD =
  "const o = Component.Object;\nif (o.get('held') === undefined) o.set('held', Inputs.world);\no.set('held', o.get('held') + 1);\nOutputs.next = o.get('held');";
// The known-firing control: a tick that reads the Variable each run.
const FRESH = 'Outputs.next = Inputs.world + 1;';
// The taught idiom: the rebuild stamps a build, and a copy from another build is dropped.
const STAMPED =
  "const o = Component.Object;\nif (o.get('build') !== Inputs.build || o.get('held') === undefined) { o.set('build', Inputs.build); o.set('held', Inputs.world); }\no.set('held', o.get('held') + 1);\nOutputs.next = o.get('held');";

describe('ISL-004 AC5 — F05: a writer holding an older copy lands last (ruled "No, it\'s app logic": a record)', () => {
  test('🔴 RECORD — the held copy puts the older state back: 1, 2, 100, then 3 where a person expects 101', async () => {
    const readings = await play(await build(HELD));
    console.log('ISL-004 AC5 held copy:', JSON.stringify(readings));
    expect(readings).toEqual([1, 2, 100, 3]);
  });

  test('🟢 control — a tick that reads the Variable each run keeps the newer state: 101', async () => {
    const readings = await play(await build(FRESH));
    console.log('ISL-004 AC5 fresh read:', JSON.stringify(readings));
    expect(readings).toEqual([1, 2, 100, 101]);
  });

  test('🟢 the taught idiom — a build stamp written by the rebuild drops the stale copy: 101', async () => {
    const readings = await play(
      await build(
        STAMPED,
        [{ id: 'stamp', type: 'Variable2', parameters: { name: 'isl004Build' } }, { id: 'restamp', type: 'Set Variable', parameters: { name: 'isl004Build', value: 'b2' } }],
        [
          ['stamp', 'value', 'tick', 'in-build'],
          ['driver', 'rebuild', 'restamp', 'do']
        ]
      )
    );
    console.log('ISL-004 AC5 build stamp:', JSON.stringify(readings));
    expect(readings).toEqual([1, 2, 100, 101]);
  });
});
