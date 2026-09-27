/**
 * GAM-004 AC1 — a gate reads the value from the same turn as its signal.
 *
 * P78 D47, measured by TPL-005 the pixel game on 2026-09-11: twice, the heart came off **one
 * move after** the turn that hurt you. Both failing graphs were rebuilt from the register's
 * description, because neither was ever committed:
 *
 * | attempt | the gate's `condition` came from | the gate's `eval` came from |
 * |---|---|---|
 * | 1 | a reactive `Expression` (`hits + attacks > 0`) fed by two Functions | one of those Functions' `Success` |
 * | 2 | a `Function` reading the enemy list back out of the Variable just written | that `Set Variable`'s `Done` |
 *
 * The known-firing controls sit in the same file: the shipped one-Function shape
 * (`tpl005Components.ts:1484-1485`) and the Counter death gate (`:1489-1491`).
 *
 * ## How the update loop is driven, stated (GAM-004 §7)
 *
 * A turn is one `move` followed by `settle(FRAMES)`. `settle` runs `updateDirtyNodes()` and then
 * yields the microtask queue and one macrotask before the next frame. That is the browser's
 * shape: a Function's `Success` is sent after `await func.apply(…)`, outside any update, and it
 * reaches the graph on the frame after its microtask lands. A harness that ran every frame
 * synchronously would never deliver `Success` at all. One that awaited in the middle of a frame
 * would be a loop the viewer does not have.
 *
 * ## What each reading means
 *
 * Every turn changes the answer (odd turns hurt, even turns do not), so a stale read cannot be
 * right by accident, and DEF-046's unchanged-value suppression never applies (§7's last two traps).
 * A turn's reading is `N` when the gate tested this turn's answer, `N-1` when it tested the
 * previous turn's answer, or the raw signals when it did neither.
 */
import type { NodeInstance, NodeModule } from '@noodl/types';

import { createCorpusGraph, type CorpusGraph } from './corpus/graph-harness';

import Model = require('../src/model');
import ComponentInputs = require('../src/nodes/componentinputs');
import ComponentOutputs = require('../src/nodes/componentoutputs');
import ExpressionNode = require('../src/nodes/std-library/expression');
import FunctionNode = require('../src/nodes/std-library/simplejavascript');
import ConditionNode = require('../src/nodes/std-library/condition');
import CounterNode = require('../src/nodes/std-library/counter');
import SetVariableNode = require('../src/nodes/std-library/data/setvariablenode');
import VariableNode = require('../src/nodes/std-library/data/variablenode2');

const TURNS = 6;
const FRAMES = 8;

/** The player's move: the turn number, then the signal that starts the turn. */
interface MoverInstance extends NodeInstance {
  move(turn: number): void;
}

const MoverModule: NodeModule = {
  node: {
    name: 'gam004.Mover',
    category: 'Test',
    outputs: {
      turn: {
        type: 'number',
        getter: function (this: NodeInstance) {
          return this._internal.turn;
        }
      },
      moved: { type: 'signal' }
    },
    methods: {
      move(this: NodeInstance, turn: number) {
        this._internal.turn = turn;
        this.flagOutputDirty('turn');
        this.sendSignalOnOutput('moved');
      }
    }
  }
};

const MODULES = [
  MoverModule,
  ComponentInputs,
  ComponentOutputs,
  ExpressionNode,
  FunctionNode,
  ConditionNode,
  CounterNode,
  SetVariableNode,
  VariableNode
].map((m) => m as unknown as NodeModule);

type Node = { id: string; type: string; parameters?: Record<string, unknown> };
type Wire = [string, string, string, string];

const hurts = (turn: number) => turn % 2 === 1;

/** Every gate in TPL-005: tests only when `eval` pulses. */
const GATE: Node = { id: 'gate', type: 'Condition', parameters: { 'runOnChange-condition': false } };
const MOVER: Node = { id: 'mover', type: 'gam004.Mover' };

async function build(nodes: Node[], wires: Wire[]): Promise<CorpusGraph> {
  const graph = await createCorpusGraph({
    modules: MODULES,
    rootComponent: '/root',
    data: {
      components: [
        {
          name: '/root',
          nodes: [MOVER, GATE, ...nodes],
          connections: wires.map(([sourceId, sourcePort, targetId, targetPort]) => ({
            sourceId,
            sourcePort,
            targetId,
            targetPort
          }))
        }
      ]
    } as never
  });
  await graph.settle(4);
  return graph;
}

/** Plays `TURNS` turns and reads what the gate tested on each one. */
async function play(graph: CorpusGraph): Promise<string[]> {
  const gateSignals = graph.signalsFor('gate');
  const readings: string[] = [];
  for (let turn = 1; turn <= TURNS; turn++) {
    const before = gateSignals.length;
    graph.node<MoverInstance>('mover').move(turn);
    await graph.settle(FRAMES);
    const fired = gateSignals.slice(before).filter((s) => s === 'ontrue' || s === 'onfalse');
    const answer = (t: number) => (hurts(t) ? 'ontrue' : 'onfalse');
    if (fired.length === 1 && fired[0] === answer(turn)) readings.push('N');
    else if (fired.length === 1 && turn > 1 && fired[0] === answer(turn - 1)) readings.push('N-1');
    else readings.push(`turn ${turn}: [${fired.join(',')}]`);
  }
  return readings;
}

const ALL_ON_TIME = Array(TURNS).fill('N');

/** A Function whose value inputs wait for `Run`, as every TPL-005 step Function does. */
const stepFunction = (id: string, script: string, inputs: string[]): Node => ({
  id,
  type: 'JavaScriptFunction',
  parameters: {
    functionScript: script,
    ...Object.fromEntries(inputs.map((i) => [`runOnChange-in-${i}`, false]))
  }
});

describe('GAM-004 AC1 — the known-firing controls', () => {
  test('🟢 the shipped one-Function shape: condition and eval from the same run', async () => {
    const graph = await build(
      [stepFunction('step', 'Outputs.hurt = Inputs.t % 2 === 1;', ['t'])],
      [
        ['mover', 'turn', 'step', 'in-t'],
        ['mover', 'moved', 'step', 'run'],
        ['step', 'out-hurt', 'gate', 'condition'],
        ['step', 'success', 'gate', 'eval']
      ]
    );
    const readings = await play(graph);
    console.log('GAM-004 control one-Function:', JSON.stringify(readings));
    expect(readings).toEqual(ALL_ON_TIME);
  });

  test('🟢 the death gate: an Expression off Counter.currentCount, evaluated by countChanged', async () => {
    const graph = await build(
      [
        { id: 'hearts', type: 'Counter' },
        { id: 'isHurt', type: 'Expression', parameters: { expression: 'c % 2 === 1' } }
      ],
      [
        ['mover', 'moved', 'hearts', 'increase'],
        ['hearts', 'currentCount', 'isHurt', 'c'],
        ['isHurt', 'result', 'gate', 'condition'],
        ['hearts', 'countChanged', 'gate', 'eval']
      ]
    );
    const readings = await play(graph);
    console.log('GAM-004 control death-gate:', JSON.stringify(readings));
    expect(readings).toEqual(ALL_ON_TIME);
  });
});

describe('GAM-004 AC1 — the instrument can see a late read', () => {
  test('🟢 NOT LATE, though it looks it: eval straight from the move, a synchronous Function computing the condition', async () => {
    // Written first as the instrument's known-late arm, and it read `N` on every turn. The
    // prediction was wrong, and the reason is worth pinning: a Function's script body runs
    // synchronously inside its own update, and the gate's `_updateDependencies` pulls that
    // Function before the gate drains. `Outputs.hurt` is on the gate's queue before `eval` is
    // applied, even though `Success` is still a microtask away.
    const graph = await build(
      [stepFunction('step', 'Outputs.hurt = Inputs.t % 2 === 1;', ['t'])],
      [
        ['mover', 'turn', 'step', 'in-t'],
        ['mover', 'moved', 'step', 'run'],
        ['step', 'out-hurt', 'gate', 'condition'],
        ['mover', 'moved', 'gate', 'eval']
      ]
    );
    const readings = await play(graph);
    console.log('GAM-004 sync-beside-signal:', JSON.stringify(readings));
    expect(readings).toEqual(ALL_ON_TIME);
  });

  test('🔴 KNOWN LATE: eval straight from the move, condition written after an await', async () => {
    // The instrument's own control. The answer is written after a microtask, which is after the
    // update in which `moved` reached the gate. If this arm read `N`, every `N` in this file
    // would be meaningless.
    const graph = await build(
      [stepFunction('step', 'await Promise.resolve(); Outputs.hurt = Inputs.t % 2 === 1;', ['t'])],
      [
        ['mover', 'turn', 'step', 'in-t'],
        ['mover', 'moved', 'step', 'run'],
        ['step', 'out-hurt', 'gate', 'condition'],
        ['mover', 'moved', 'gate', 'eval']
      ]
    );
    const readings = await play(graph);
    console.log('GAM-004 known-late:', JSON.stringify(readings));
    expect(readings.slice(1)).toEqual(Array(TURNS - 1).fill('N-1'));
  });
});

describe('GAM-004 AC1 — the two failing attempts, rebuilt', () => {
  test('⬜ attempt 1 does not reproduce: a reactive Expression fed by two Functions, eval from one Function’s Success', async () => {
    const graph = await build(
      [
        stepFunction('hits', 'Outputs.hits = Inputs.t % 2 === 1 ? 1 : 0;', ['t']),
        stepFunction('attacks', 'Outputs.attacks = 0;', ['t']),
        { id: 'anyHurt', type: 'Expression', parameters: { expression: 'hits + attacks > 0' } }
      ],
      [
        ['mover', 'turn', 'hits', 'in-t'],
        ['mover', 'moved', 'hits', 'run'],
        ['mover', 'turn', 'attacks', 'in-t'],
        ['mover', 'moved', 'attacks', 'run'],
        ['hits', 'out-hits', 'anyHurt', 'hits'],
        ['attacks', 'out-attacks', 'anyHurt', 'attacks'],
        ['anyHurt', 'result', 'gate', 'condition'],
        ['hits', 'success', 'gate', 'eval']
      ]
    );
    const readings = await play(graph);
    console.log('GAM-004 attempt 1:', JSON.stringify(readings));
    expect(readings).toEqual(ALL_ON_TIME);
  });

  test('⬜ attempt 2 does not reproduce: a Function reading the Variable just written, eval from Set Variable’s Done', async () => {
    const name = 'gam004-enemies-' + Math.random().toString(36).slice(2);
    const graph = await build(
      [
        stepFunction('step', 'Outputs.enemies = [{ t: Inputs.t }];', ['t']),
        { id: 'setEnemies', type: 'Set Variable', parameters: { name } },
        { id: 'enemies', type: 'Variable2', parameters: { name } },
        { id: 'readBack', type: 'JavaScriptFunction', parameters: { functionScript: 'Outputs.hurt = !!Inputs.enemies && Inputs.enemies[0].t % 2 === 1;' } }
      ],
      [
        ['mover', 'turn', 'step', 'in-t'],
        ['mover', 'moved', 'step', 'run'],
        ['step', 'out-enemies', 'setEnemies', 'value'],
        ['step', 'success', 'setEnemies', 'do'],
        ['enemies', 'value', 'readBack', 'in-enemies'],
        ['readBack', 'out-hurt', 'gate', 'condition'],
        ['setEnemies', 'done', 'gate', 'eval']
      ]
    );
    const readings = await play(graph);
    console.log('GAM-004 attempt 2:', JSON.stringify(readings));
    expect(readings).toEqual(ALL_ON_TIME);
  });
});

/**
 * The move that starts the turn, as TPL-005 ships it (`tpl005Components.ts:833-879`).
 *
 * The arms above start the turn from a bare signal. The game did not: a key reached `Game/Move`,
 * a component that tests for a wall, writes x, waits for `done`, writes y, waits for `done`, and
 * only then sends `moved` out through its Component Outputs. Everything the turn reads about
 * where the player is comes back through a Variable. That is two Variable round-trips and a
 * component boundary upstream of every gate, which is the graph D47 was measured in.
 *
 * The only departure is the wall: `IS_WALL_SCRIPT` reads a room string, and here nothing is ever
 * a wall except a coordinate that is not yet a number. The node is still a reactive Function fed
 * by the two Expressions, as it ships.
 */
const MOVE_COMPONENT = {
  name: '/Game/Move',
  // The component's own ports, which the editor's export derives from its Component Inputs and
  // Outputs nodes. The runtime instance reads these, not the nodes' `ports`.
  ports: [
    { name: 'go', plug: 'input', type: 'signal' },
    { name: 'dx', plug: 'input', type: 'number' },
    { name: 'dy', plug: 'input', type: 'number' },
    { name: 'px', plug: 'input', type: 'number' },
    { name: 'py', plug: 'input', type: 'number' },
    { name: 'moved', plug: 'output', type: 'signal' },
    { name: 'refused', plug: 'output', type: 'signal' }
  ],
  nodes: [
    {
      id: 'mvInputs',
      type: 'Component Inputs',
      ports: [
        { name: 'go', plug: 'output', type: 'signal' },
        { name: 'dx', plug: 'output', type: 'number' },
        { name: 'dy', plug: 'output', type: 'number' },
        { name: 'px', plug: 'output', type: 'number' },
        { name: 'py', plug: 'output', type: 'number' }
      ]
    },
    { id: 'mvTx', type: 'Expression', parameters: { expression: 'px + dx' } },
    { id: 'mvTy', type: 'Expression', parameters: { expression: 'py + dy' } },
    {
      id: 'mvWall',
      type: 'JavaScriptFunction',
      parameters: { functionScript: 'Outputs.blocked = !Number.isFinite(Inputs.x) || !Number.isFinite(Inputs.y);' }
    },
    { id: 'mvGate', type: 'Condition', parameters: { 'runOnChange-condition': false } },
    { id: 'mvSetX', type: 'Set Variable', parameters: { name: '' } },
    { id: 'mvSetY', type: 'Set Variable', parameters: { name: '' } },
    {
      id: 'mvOutputs',
      type: 'Component Outputs',
      ports: [
        { name: 'moved', plug: 'input', type: 'signal' },
        { name: 'refused', plug: 'input', type: 'signal' }
      ]
    }
  ],
  connections: [
    ['mvInputs', 'px', 'mvTx', 'px'],
    ['mvInputs', 'dx', 'mvTx', 'dx'],
    ['mvInputs', 'py', 'mvTy', 'py'],
    ['mvInputs', 'dy', 'mvTy', 'dy'],
    ['mvTx', 'result', 'mvWall', 'in-x'],
    ['mvTy', 'result', 'mvWall', 'in-y'],
    ['mvWall', 'out-blocked', 'mvGate', 'condition'],
    ['mvInputs', 'go', 'mvGate', 'eval'],
    ['mvTx', 'result', 'mvSetX', 'value'],
    ['mvTy', 'result', 'mvSetY', 'value'],
    ['mvGate', 'onfalse', 'mvSetX', 'do'],
    ['mvSetX', 'done', 'mvSetY', 'do'],
    ['mvSetY', 'done', 'mvOutputs', 'moved'],
    ['mvGate', 'ontrue', 'mvOutputs', 'refused']
  ] as Wire[]
};

const toConnections = (wires: Wire[]) =>
  wires.map(([sourceId, sourcePort, targetId, targetPort]) => ({ sourceId, sourcePort, targetId, targetPort }));

/**
 * A page with the key (`mover.moved`), the player's two Variables and one `Game/Move` stepping
 * right. On turn N the player stands at x = N, so `x % 2 === 1` changes every turn.
 */
async function buildWithMove(nodes: Node[], wires: Wire[]): Promise<{ graph: CorpusGraph; varX: string }> {
  const suffix = Math.random().toString(36).slice(2);
  const varX = 'gam004-x-' + suffix;
  const varY = 'gam004-y-' + suffix;
  Model.get('--ndl--global-variables').set(varX, 0);
  Model.get('--ndl--global-variables').set(varY, 0);

  const move = {
    ...MOVE_COMPONENT,
    nodes: MOVE_COMPONENT.nodes.map((n) =>
      n.id === 'mvSetX' ? { ...n, parameters: { name: varX } } : n.id === 'mvSetY' ? { ...n, parameters: { name: varY } } : n
    ),
    connections: toConnections(MOVE_COMPONENT.connections)
  };

  const graph = await createCorpusGraph({
    modules: MODULES,
    rootComponent: '/root',
    data: {
      components: [
        move,
        {
          name: '/root',
          nodes: [
            MOVER,
            GATE,
            { id: 'plVarX', type: 'Variable2', parameters: { name: varX } },
            { id: 'plVarY', type: 'Variable2', parameters: { name: varY } },
            { id: 'plMove', type: '/Game/Move', parameters: { dx: 1, dy: 0 } },
            ...nodes
          ],
          connections: toConnections([
            ['mover', 'moved', 'plMove', 'go'],
            ['plVarX', 'value', 'plMove', 'px'],
            ['plVarY', 'value', 'plMove', 'py'],
            ...wires
          ])
        }
      ]
    } as never
  });
  await graph.settle(4);
  return { graph, varX };
}

describe('GAM-004 AC1 — the turn started by TPL-005’s own Game/Move', () => {
  test('🟢 control: the move itself lands on time (x is N after turn N)', async () => {
    const { graph, varX } = await buildWithMove([], []);
    const xs: unknown[] = [];
    for (let turn = 1; turn <= TURNS; turn++) {
      graph.node<MoverInstance>('mover').move(turn);
      await graph.settle(FRAMES);
      xs.push(Model.get('--ndl--global-variables').get(varX));
    }
    console.log('GAM-004 move xs:', JSON.stringify(xs));
    expect(xs).toEqual([1, 2, 3, 4, 5, 6]);
  });

  test('🟢 the shipped one-Function shape, behind the real move', async () => {
    const { graph } = await buildWithMove(
      [stepFunction('step', 'Outputs.hurt = Inputs.px % 2 === 1;', ['px'])],
      [
        ['plVarX', 'value', 'step', 'in-px'],
        ['plMove', 'moved', 'step', 'run'],
        ['step', 'out-hurt', 'gate', 'condition'],
        ['step', 'success', 'gate', 'eval']
      ]
    );
    const readings = await play(graph);
    console.log('GAM-004 move one-Function:', JSON.stringify(readings));
    expect(readings).toEqual(ALL_ON_TIME);
  });

  test('⬜ attempt 1 does not reproduce behind the real move', async () => {
    const { graph } = await buildWithMove(
      [
        stepFunction('hits', 'Outputs.hits = Inputs.px % 2 === 1 ? 1 : 0;', ['px']),
        stepFunction('attacks', 'Outputs.attacks = 0;', ['px']),
        { id: 'anyHurt', type: 'Expression', parameters: { expression: 'hits + attacks > 0' } }
      ],
      [
        ['plVarX', 'value', 'hits', 'in-px'],
        ['plMove', 'moved', 'hits', 'run'],
        ['plVarX', 'value', 'attacks', 'in-px'],
        ['plMove', 'moved', 'attacks', 'run'],
        ['hits', 'out-hits', 'anyHurt', 'hits'],
        ['attacks', 'out-attacks', 'anyHurt', 'attacks'],
        ['anyHurt', 'result', 'gate', 'condition'],
        ['hits', 'success', 'gate', 'eval']
      ]
    );
    const readings = await play(graph);
    console.log('GAM-004 move attempt 1:', JSON.stringify(readings));
    expect(readings).toEqual(ALL_ON_TIME);
  });

  test('⬜ attempt 2 does not reproduce behind the real move', async () => {
    const name = 'gam004-enemies-' + Math.random().toString(36).slice(2);
    const { graph } = await buildWithMove(
      [
        stepFunction('step', 'Outputs.enemies = [{ x: Inputs.px }];', ['px']),
        { id: 'setEnemies', type: 'Set Variable', parameters: { name } },
        { id: 'enemies', type: 'Variable2', parameters: { name } },
        {
          id: 'readBack',
          type: 'JavaScriptFunction',
          parameters: { functionScript: 'Outputs.hurt = !!Inputs.enemies && Inputs.enemies[0].x % 2 === 1;' }
        }
      ],
      [
        ['plVarX', 'value', 'step', 'in-px'],
        ['plMove', 'moved', 'step', 'run'],
        ['step', 'out-enemies', 'setEnemies', 'value'],
        ['step', 'success', 'setEnemies', 'do'],
        ['enemies', 'value', 'readBack', 'in-enemies'],
        ['readBack', 'out-hurt', 'gate', 'condition'],
        ['setEnemies', 'done', 'gate', 'eval']
      ]
    );
    const readings = await play(graph);
    console.log('GAM-004 move attempt 2:', JSON.stringify(readings));
    expect(readings).toEqual(ALL_ON_TIME);
  });

  test('🟢 the exit-gate shape that ships today: an Expression off the Variable, eval from a step Function’s Success', async () => {
    const { graph } = await buildWithMove(
      [
        stepFunction('takeCoin', 'Outputs.taken = false;', ['x']),
        { id: 'atExit', type: 'Expression', parameters: { expression: 'x % 2 === 1' } }
      ],
      [
        ['plVarX', 'value', 'takeCoin', 'in-x'],
        ['plMove', 'moved', 'takeCoin', 'run'],
        ['plVarX', 'value', 'atExit', 'x'],
        ['atExit', 'result', 'gate', 'condition'],
        ['takeCoin', 'success', 'gate', 'eval']
      ]
    );
    const readings = await play(graph);
    console.log('GAM-004 move exit-gate:', JSON.stringify(readings));
    expect(readings).toEqual(ALL_ON_TIME);
  });
});

/**
 * The same two attempts in the shape TPL-005's own convention gives them. Not tuning: every
 * Function on the pixel game's page waits for `Run` (`signalOnly`, `tpl005Components.ts:1348-1365`),
 * and the register names which node's signal evaluates the gate but not which of the two
 * producers. These arms cover the readings the register's description allows and the literal
 * rebuilds above do not.
 */
describe('GAM-004 AC1 — the attempts in TPL-005’s own convention', () => {
  test('⬜ attempt 1′ does not reproduce: eval from the OTHER producer’s Success', async () => {
    const graph = await build(
      [
        stepFunction('hits', 'Outputs.hits = Inputs.t % 2 === 1 ? 1 : 0;', ['t']),
        stepFunction('attacks', 'Outputs.attacks = 0;', ['t']),
        { id: 'anyHurt', type: 'Expression', parameters: { expression: 'hits + attacks > 0' } }
      ],
      [
        ['mover', 'turn', 'hits', 'in-t'],
        ['mover', 'moved', 'hits', 'run'],
        ['mover', 'turn', 'attacks', 'in-t'],
        ['mover', 'moved', 'attacks', 'run'],
        ['hits', 'out-hits', 'anyHurt', 'hits'],
        ['attacks', 'out-attacks', 'anyHurt', 'attacks'],
        ['anyHurt', 'result', 'gate', 'condition'],
        ['attacks', 'success', 'gate', 'eval']
      ]
    );
    const readings = await play(graph);
    console.log('GAM-004 attempt 1prime:', JSON.stringify(readings));
    expect(readings).toEqual(ALL_ON_TIME);
  });

  test('⬜ attempt 2′ does not reproduce: the read-back waits for Run, and Set Variable’s Done fires both it and the gate', async () => {
    const name = 'gam004-enemies-' + Math.random().toString(36).slice(2);
    const graph = await build(
      [
        stepFunction('step', 'Outputs.enemies = [{ t: Inputs.t }];', ['t']),
        { id: 'setEnemies', type: 'Set Variable', parameters: { name } },
        { id: 'enemies', type: 'Variable2', parameters: { name } },
        stepFunction('readBack', 'Outputs.hurt = !!Inputs.enemies && Inputs.enemies[0].t % 2 === 1;', ['enemies'])
      ],
      [
        ['mover', 'turn', 'step', 'in-t'],
        ['mover', 'moved', 'step', 'run'],
        ['step', 'out-enemies', 'setEnemies', 'value'],
        ['step', 'success', 'setEnemies', 'do'],
        ['enemies', 'value', 'readBack', 'in-enemies'],
        ['setEnemies', 'done', 'readBack', 'run'],
        ['readBack', 'out-hurt', 'gate', 'condition'],
        ['setEnemies', 'done', 'gate', 'eval']
      ]
    );
    const readings = await play(graph);
    console.log('GAM-004 attempt 2prime:', JSON.stringify(readings));
    expect(readings).toEqual(ALL_ON_TIME);
  });
});
