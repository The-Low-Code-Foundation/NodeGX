/**
 * NSP-001 AC2 + AC3 — the interpreter runs the Counter spec and produces a trace; two runs are
 * byte-identical. The runtime-side check of the same trace is NSP-002's.
 */

import { Counter, run, mount, set, signal, settle, trace, SpecError, defineNode } from '../src';
import type { Step, TraceEvent } from '../src';

const script: Step[] = [
  'settle',
  { signal: 'increase' },
  'settle',
  { signal: 'increase' },
  { signal: 'decrease' },
  'settle',
  { signal: 'reset' },
  'settle',
  { signal: 'reset' },
  'settle'
];

describe('Counter through the interpreter', () => {
  test('AC2 — a scripted sequence produces the trace the runtime source describes', () => {
    const t = run(Counter, { startValue: 5 }, script);
    expect(t).toEqual<TraceEvent[]>([
      // mount applies the param; the first settle carries the seed pulse (:125-133, C8)
      { t: 'set', port: 'startValue', value: 5 },
      { t: 'settle' },
      { t: 'value', port: 'currentCount', value: 5 },
      { t: 'signal', port: 'countChanged' },
      // increase → 6, done
      { t: 'in', port: 'increase' },
      { t: 'settle' },
      { t: 'value', port: 'currentCount', value: 6 },
      { t: 'signal', port: 'countChanged' },
      { t: 'outcome', port: 'increase', value: 'done' },
      // increase then decrease inside one frame: the value is unchanged at the settle, so no
      // value event (C3/change rule), but BOTH pulses and BOTH outcomes are delivered (C2, C4)
      { t: 'in', port: 'increase' },
      { t: 'in', port: 'decrease' },
      { t: 'settle' },
      { t: 'signal', port: 'countChanged' },
      { t: 'signal', port: 'countChanged' },
      { t: 'outcome', port: 'increase', value: 'done' },
      { t: 'outcome', port: 'decrease', value: 'done' },
      // reset from 6 back to 5 → done
      { t: 'in', port: 'reset' },
      { t: 'settle' },
      { t: 'value', port: 'currentCount', value: 5 },
      { t: 'signal', port: 'countChanged' },
      { t: 'outcome', port: 'reset', value: 'done' },
      // reset while already at start → unchanged, Count Changed silent (FH-022 slice 3, :109-112)
      { t: 'in', port: 'reset' },
      { t: 'settle' },
      { t: 'outcome', port: 'reset', value: 'unchanged' }
    ]);
  });

  test('limits: at Max, Increase reports unchanged and moves nothing (:50-53)', () => {
    const t = run(Counter, { limitsEnabled: true, limitsMax: 1 }, [
      'settle',
      { signal: 'increase' },
      'settle',
      { signal: 'increase' },
      'settle'
    ]);
    const after = t.slice(t.findIndex((e) => e.t === 'in' && e.port === 'increase' && t.indexOf(e) > 5));
    expect(after).toEqual<TraceEvent[]>([{ t: 'in', port: 'increase' }, { t: 'settle' }, { t: 'outcome', port: 'increase', value: 'unchanged' }]);
  });

  test('no Start Value param: the first settle still publishes the count (0) and no pulse', () => {
    const t = run(Counter, {}, ['settle']);
    expect(t).toEqual<TraceEvent[]>([{ t: 'settle' }, { t: 'value', port: 'currentCount', value: 0 }]);
  });

  test('a later Start Value only moves where Reset returns to (:125-133)', () => {
    const t = run(Counter, { startValue: 1 }, ['settle', { set: 'startValue', value: 9 }, 'settle', { signal: 'reset' }, 'settle']);
    expect(t.filter((e) => e.t === 'value')).toEqual([
      { t: 'value', port: 'currentCount', value: 1 },
      { t: 'value', port: 'currentCount', value: 9 }
    ]);
    // the second startValue did not pulse
    expect(t.filter((e) => e.t === 'signal')).toHaveLength(2);
  });

  test('coercion is the declared one: "3" → 3 (js-number), "abc" → NaN, "" → false for limits', () => {
    const inst = mount(Counter, { startValue: '3', limitsEnabled: '' });
    expect(inst.inputs.startValue).toBe(3);
    expect(inst.state.count).toBe(3);
    expect(inst.inputs.limitsEnabled).toBe(false);
    set(inst, 'limitsMax', 'abc');
    expect(Number.isNaN(inst.inputs.limitsMax as number)).toBe(true);
  });

  test('AC3 — two runs of one sequence are byte-identical', () => {
    const a = JSON.stringify(run(Counter, { startValue: 5, limitsEnabled: true, limitsMax: 7 }, script));
    const b = JSON.stringify(run(Counter, { startValue: 5, limitsEnabled: true, limitsMax: 7 }, script));
    expect(a).toBe(b);
    // param order is the caller's (NSP-002: the adapter contract, and the runtime's own order —
    // s1 normalised it to declaration order, NSP-002 reversed that): the `set` events follow the
    // literal, and for Counter the observations are the same whichever order the params land in
    const c = run(Counter, { limitsMax: 7, limitsEnabled: true, startValue: 5 }, script);
    expect(c.slice(0, 3).map((e) => (e.t === 'set' ? e.port : e.t))).toEqual(['limitsMax', 'limitsEnabled', 'startValue']);
    expect(c.filter((e) => e.t !== 'set')).toEqual(JSON.parse(a).filter((e: TraceEvent) => e.t !== 'set'));
  });

  test('a reducer cannot mutate state or inputs (they are frozen)', () => {
    const Mutant = defineNode({
      type: 'Mutant',
      version: 1,
      source: 'tests',
      state: { n: 0 },
      inputs: { go: { type: 'signal' } },
      outputs: { n: { type: 'number', from: (s) => s.n } }
    }).on({
      go: (s) => {
        (s as { n: number }).n = 99;
        return {};
      }
    });
    const inst = mount(Mutant as never);
    expect(() => signal(inst, 'go')).toThrow(TypeError);
  });

  test('the run-time guards mirror the type rules for a spec that arrives as data', () => {
    const asData = (on: Record<string, unknown>) =>
      ({
        type: 'Data',
        version: 1,
        source: 'tests',
        state: { n: 0 },
        inputs: { go: { type: 'signal', outcome: true }, v: { type: 'number', default: 0 } },
        outputs: { n: { type: 'number', from: (s: { n: number }) => s.n }, fired: { type: 'signal' } },
        on
      }) as never;
    expect(() => signal(mount(asData({ go: () => ({ set: { m: 1 }, outcome: 'done' }) })), 'go')).toThrow(/undeclared state key "m"/);
    expect(() => signal(mount(asData({ go: () => ({ emit: ['nope'], outcome: 'done' }) })), 'go')).toThrow(/undeclared signal output "nope"/);
    expect(() => signal(mount(asData({ go: () => ({ emit: ['fired'] }) })), 'go')).toThrow(/returned no outcome/);
    expect(() => signal(mount(asData({})), 'go')).toThrow(/has no reducer/);
    expect(() => set(mount(asData({ go: () => ({ outcome: 'done' }) })), 'go', 1)).toThrow(SpecError);
    expect(() => mount(asData({ go: () => ({ outcome: 'done' }) }), { nope: 1 })).toThrow(/param "nope" is not an input/);
  });

  test('trace() returns a copy', () => {
    const inst = mount(Counter);
    settle(inst);
    const t = trace(inst);
    t.length = 0;
    expect(trace(inst)).toHaveLength(2);
  });
});
