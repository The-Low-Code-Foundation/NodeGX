/**
 * GAM-008 AC1 — an animated value asked to jump and then glide does both.
 *
 * P78 D67, seen by P87 RKT-006 on 2026-09-13: Rocket School's countdown bar never refilled for a new
 * question. The graph wrote "full" then "empty" in one pass, and a question reached by Next showed the
 * bar at 0.50 and 0.63. Three readings fit the drive numbers (GAM-008 §2):
 *
 * | reading | what it predicts here |
 * |---|---|
 * | R-one  RKT-006: "the Animate saw one target" | the `targetValue` setter runs once in the pass, with 0 |
 * | R-glide GAM-008 §2: a jump and a glide in one pass collapse to the glide | the setter runs with 100 then 0, and the run starts from where the bar was |
 * | R-zero RKT-006: "a duration of 0 is not a jump" | a lone jump lands later with duration 0 than with 1 ms |
 *
 * Only a counted setter call separates R-one from R-glide (§7), so every arm records the setter's
 * arguments beside the frames. The graph is the pre-build-2 chain, real nodes throughout:
 *
 *   Press.full → Set Variable (Duration = 0) → Set Variable (Target = 100)
 *              → Set Variable (Duration = 1000) → Set Variable (Target = 0)
 *   Variable (Target) → Animate.targetValue,  Variable (Duration) → Animate.duration
 *
 * The clock is `graph.frame(16)`: `updateDirtyNodes`, then `timerScheduler.runTimers`
 * (`nodecontext.ts:471-480`), which is one browser frame of `NoodlRuntime._doUpdate`.
 */

/* eslint-env jest */

import type { NodeDefinitionOptions, NodeInstance, NodeModule } from '@noodl/types';

import { createCorpusGraph, type CorpusGraph } from '../../noodl-runtime/test/corpus/graph-harness';
import SetVariableModule from '../../noodl-runtime/src/nodes/std-library/data/setvariablenode';
import VariableModule from '../../noodl-runtime/src/nodes/std-library/data/variablenode2';

import AnimateModule from '../src/nodes/std-library/animate-to-value';

const LIMIT = 1000;

interface PressInstance extends NodeInstance {
  full(): void;
  empty(): void;
  jump(): void;
}

const PressModule: NodeModule = {
  node: {
    name: 'gam008.Press',
    category: 'Test',
    outputs: { full: { type: 'signal' }, empty: { type: 'signal' }, jump: { type: 'signal' } },
    methods: {
      full(this: NodeInstance) {
        this.sendSignalOnOutput('full');
      },
      empty(this: NodeInstance) {
        this.sendSignalOnOutput('empty');
      },
      jump(this: NodeInstance) {
        this.sendSignalOnOutput('jump');
      }
    }
  }
};

interface Calls {
  /** Every value the real `targetValue` setter was handed, with the frame it arrived in. */
  targets: Array<[number, unknown]>;
  durations: Array<[number, unknown]>;
}

/** The real node, with its two setters recorded and then called unchanged. */
function recordedAnimate(calls: Calls, frameOf: () => number): NodeModule {
  const real = (AnimateModule as unknown as NodeModule).node as NodeDefinitionOptions;
  const inputs = real.inputs as Record<string, { set: (this: NodeInstance, v: unknown) => void }>;
  return {
    node: {
      ...real,
      inputs: {
        ...real.inputs,
        targetValue: {
          ...inputs.targetValue,
          set(this: NodeInstance, value: unknown) {
            calls.targets.push([frameOf(), value]);
            return inputs.targetValue.set.call(this, value);
          }
        },
        duration: {
          ...inputs.duration,
          set(this: NodeInstance, value: unknown) {
            calls.durations.push([frameOf(), value]);
            return inputs.duration.set.call(this, value);
          }
        }
      }
    } as NodeDefinitionOptions
  };
}

interface Bar {
  graph: CorpusGraph;
  calls: Calls;
  frame: () => number;
  value: () => number;
  timer: () => { start: number; end: number; duration: number; running: boolean };
  press: PressInstance;
  tick: (n?: number) => number[];
}

let seq = 0;

/**
 * @param chained the pre-build-2 chain: full and empty in one pass off one press. Otherwise
 * `full` and `empty` are two presses, so a test chooses how many frames lie between them.
 * @param jumpDuration what "Duration" is set to before the jump (0 in pre-build-2, 1 in build 2).
 * @param jumpWire AC3: the node that fires the Animate's `Jump To`, with `Jump Value` = 100.
 */
async function bar(chained: boolean, jumpDuration = 0, jumpWire?: [string, string]): Promise<Bar> {
  const p = `gam008_${++seq}_`;
  const calls: Calls = { targets: [], durations: [] };
  let frameNo = 0;

  const setVar = (id: string, name: string, value: number) => ({
    id,
    type: 'Set Variable',
    parameters: { name: p + name, value }
  });

  const connections = [
    { sourceId: 'press', sourcePort: 'full', targetId: 'setDur0', targetPort: 'do' },
    { sourceId: 'setDur0', sourcePort: 'done', targetId: 'setFull', targetPort: 'do' },
    { sourceId: 'press', sourcePort: 'empty', targetId: 'setDur', targetPort: 'do' },
    { sourceId: 'setDur', sourcePort: 'done', targetId: 'setEmpty', targetPort: 'do' },
    { sourceId: 'target', sourcePort: 'value', targetId: 'anim', targetPort: 'targetValue' },
    { sourceId: 'dur', sourcePort: 'value', targetId: 'anim', targetPort: 'duration' }
  ];
  if (chained) connections.push({ sourceId: 'setFull', sourcePort: 'done', targetId: 'setDur', targetPort: 'do' });
  if (jumpWire) connections.push({ sourceId: jumpWire[0], sourcePort: jumpWire[1], targetId: 'anim', targetPort: 'jumpTo' });
  const animParameters: Record<string, unknown> = { easingCurve: 'linear' };
  if (jumpWire) animParameters.jumpValue = 100;

  const graph = await createCorpusGraph({
    modules: [
      PressModule,
      SetVariableModule as unknown as NodeModule,
      VariableModule as unknown as NodeModule,
      recordedAnimate(calls, () => frameNo)
    ],
    data: {
      components: [
        {
          name: '/root',
          nodes: [
            { id: 'press', type: 'gam008.Press' },
            setVar('setDur0', 'Duration', jumpDuration),
            setVar('setFull', 'Target', 100),
            setVar('setDur', 'Duration', LIMIT),
            setVar('setEmpty', 'Target', 0),
            { id: 'dur', type: 'Variable2', parameters: { name: p + 'Duration' } },
            { id: 'target', type: 'Variable2', parameters: { name: p + 'Target' } },
            { id: 'anim', type: 'net.noodl.animatetovalue', parameters: animParameters }
          ],
          connections
        }
      ]
    } as never
  });

  const anim = graph.node('anim') as unknown as {
    _isFirstUpdate: boolean;
    _internal: { currentNumber: number; _animation: { startValue: number; endValue: number; duration: number; isRunning(): boolean } };
  };
  const b: Bar = {
    graph,
    calls,
    frame: () => frameNo,
    value: () => anim._internal.currentNumber,
    timer: () => ({
      start: anim._internal._animation.startValue,
      end: anim._internal._animation.endValue,
      duration: anim._internal._animation.duration,
      running: anim._internal._animation.isRunning()
    }),
    press: graph.node('press') as unknown as PressInstance,
    tick(n = 1) {
      const seen: number[] = [];
      for (let i = 0; i < n; i++) {
        frameNo++;
        graph.frame(16);
        seen.push(anim._internal.currentNumber);
      }
      return seen;
    }
  };
  b.tick(3);
  return b;
}

/**
 * The previous question: full, then gliding for 500 ms. After this the node is well past its first
 * update (§7: the first update consolidates last-wins, a different path).
 */
function previousQuestion(b: Bar): void {
  b.press.full();
  b.tick(3);
  b.press.empty();
  b.tick(31);
}

const readouts: Record<string, unknown> = {};
afterAll(() => {
  // eslint-disable-next-line no-console
  console.log('GAM008_READOUT ' + JSON.stringify(readouts, null, 1));
});

describe('GAM-008 AC1 — the pre-build-2 chain, isolated', () => {
  test('precondition: the previous question left the bar mid-glide, past its first update', async () => {
    const b = await bar(false);
    previousQuestion(b);
    const anim = b.graph.node('anim') as unknown as { _isFirstUpdate: boolean };
    readouts.precondition = { value: b.value(), timer: b.timer(), firstUpdate: anim._isFirstUpdate, calls: b.calls };
    expect(anim._isFirstUpdate).toBe(false);
    expect(b.value()).toBeGreaterThan(30);
    expect(b.value()).toBeLessThan(70);
    expect(b.timer().running).toBe(true);
  });

  /**
   * RED at HEAD `1f5c10c5b` as "the bar is full within three frames of the press" (§8 AC1): 47.2 on
   * every one of 20 frames, gliding down. R9 kept this collapse and documented it (C); AC3 below is
   * the person sentence, through the door. So this arm now pins the documented behaviour.
   */
  test('arm 1 (one pass, no Jump To): one move from where the bar was — it never shows 100 (documented, R9 C)', async () => {
    const b = await bar(true);
    previousQuestion(b);
    const before = b.value();
    const pressFrame = b.frame() + 1;
    b.calls.targets.length = 0;
    b.calls.durations.length = 0;
    const timers: unknown[] = [];
    b.press.full();
    const seen: number[] = [];
    for (let i = 0; i < 20; i++) {
      seen.push(...b.tick());
      if (i < 3) timers.push(b.timer());
    }
    readouts.arm1 = { before, pressFrame, targets: b.calls.targets, durations: b.calls.durations, first3timers: timers, frames: seen };
    expect(Math.max(...seen)).toBeLessThan(100);
    expect(seen[0]).toBe(before);
    expect(timers[0]).toEqual({ start: before, end: 0, duration: LIMIT, running: true });
  });

  test('arm 1 excludes R-one: the setter was handed BOTH targets, 100 then 0, in the press frame', async () => {
    const b = await bar(true);
    previousQuestion(b);
    b.calls.targets.length = 0;
    b.calls.durations.length = 0;
    const pressFrame = b.frame() + 1;
    b.press.full();
    b.tick(1);
    expect(b.calls.targets).toEqual([
      [pressFrame, 100],
      [pressFrame, 0]
    ]);
    expect(b.calls.durations).toEqual([
      [pressFrame, 0],
      [pressFrame, LIMIT]
    ]);
  });

  /**
   * RED at HEAD for a gap of 1 as a known-firing arm: a frame apart is NOT enough. The jump's run
   * joins on the full frame reading its start value, and lands a frame later, so "empty" one frame
   * after "full" restarts from where the bar still is. Two frames refill it.
   */
  test('arm 2: full, then empty ONE frame later — still one move from where the bar was', async () => {
    const b = await bar(false);
    previousQuestion(b);
    const before = b.value();
    b.press.full();
    const seen = b.tick(1);
    b.press.empty();
    seen.push(...b.tick(20));
    readouts.arm2_gap1 = { before, frames: seen };
    expect(Math.max(...seen)).toBe(before);
  });

  test.each([2, 3])('arm 2 (known-firing): full, %i frames, then empty — reaches 100, then glides', async (gap) => {
    const b = await bar(false);
    previousQuestion(b);
    const before = b.value();
    b.calls.targets.length = 0;
    b.calls.durations.length = 0;
    b.press.full();
    const seen = b.tick(gap);
    b.press.empty();
    seen.push(...b.tick(20));
    readouts[`arm2_gap${gap}`] = { before, targets: b.calls.targets, durations: b.calls.durations, frames: seen };
    const peak = seen.indexOf(100);
    expect(peak).toBeGreaterThanOrEqual(0);
    expect(seen[seen.length - 1]).toBeLessThan(100);
  });

  test.each([0, 1])('arm 3: a lone jump with duration %i — frames from the press until it reads 100', async (jumpDuration) => {
    const b = await bar(false, jumpDuration);
    previousQuestion(b);
    const before = b.value();
    b.press.full();
    const seen = b.tick(6);
    const landed = seen.indexOf(100) + 1;
    readouts[`arm3_duration${jumpDuration}`] = { before, frames: seen, landedOnFrame: landed };
    // Excludes R-zero: 0 and 1 ms land on the same frame, the second after the press.
    expect(landed).toBe(2);
    expect(seen[0]).toBe(before);
  });
});

/**
 * AC3 — the door (R9): `Jump To`. The one-pass chain of arm 1 is unchanged; a wire fires the jump.
 * Where that wire comes from decides whether the jump reaches the node before, between or after the
 * two targets in the same pass, and each order must refill the bar.
 */
describe('GAM-008 AC3 — Jump To refills the bar, then it glides', () => {
  const refillsThenGlides = (seen: number[]) => {
    expect(seen[0]).toBe(100);
    // Glides: strictly down from 100 over the next frames, and never back up.
    for (let i = 2; i < seen.length; i++) expect(seen[i]).toBeLessThanOrEqual(seen[i - 1]);
    expect(seen[seen.length - 1]).toBeLessThan(100);
    expect(seen[seen.length - 1]).toBeGreaterThan(50);
  };

  test.each([
    ['before both targets (off the press itself)', ['press', 'full']],
    ['between them (off Full is set)', ['setFull', 'done']],
    ['after both (off Empty is set)', ['setEmpty', 'done']]
  ] as Array<[string, [string, string]]>)('the one-pass chain with the jump %s: full on the press frame, then a glide', async (name, from) => {
    const b = await bar(true, 0, from);
    previousQuestion(b);
    const before = b.value();
    b.calls.targets.length = 0;
    b.press.full();
    const seen = b.tick(20);
    readouts[`ac3_${from.join('.')}`] = { before, targets: b.calls.targets, frames: seen, timer: b.timer() };
    expect(before).toBeLessThan(60);
    refillsThenGlides(seen);
    expect(b.timer().end).toBe(0);
  });

  test('a jump alone, the target still 0 from the last run: refills and carries on towards 0', async () => {
    const b = await bar(false, 0, ['press', 'jump']);
    previousQuestion(b);
    b.press.jump();
    const seen = b.tick(20);
    readouts.ac3_jumpAlone = { frames: seen };
    refillsThenGlides(seen);
  });

  test('a jump before any target has arrived sits at the jump value — no glide towards a target nobody set', async () => {
    const b = await bar(false, 0, ['press', 'jump']);
    b.press.jump();
    const seen = b.tick(10);
    expect(seen.every((v) => v === 100)).toBe(true);
    expect(b.timer().running).toBe(false);
  });

  test('a jump is not an arrival: At Target Value stays silent on the refill and fires when the glide settles', async () => {
    const b = await bar(true, 0, ['setFull', 'done']);
    previousQuestion(b);
    b.tick(60); // let the previous question's glide settle, which is one arrival
    const arrivedBefore = b.graph.signalsFor('anim').filter((s) => s === 'atTargetValue').length;
    b.press.full();
    b.tick(3);
    expect(b.graph.signalsFor('anim').filter((s) => s === 'atTargetValue').length).toBe(arrivedBefore);
    b.tick(70); // 1000 ms glide at 16 ms a frame
    expect(b.value()).toBe(0);
    expect(b.graph.signalsFor('anim').filter((s) => s === 'atTargetValue').length).toBe(arrivedBefore + 1);
  });
});
