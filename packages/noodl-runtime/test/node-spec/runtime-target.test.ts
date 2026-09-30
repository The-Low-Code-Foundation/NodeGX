/**
 * NSP-002 — the interpreted runtime as a target, graded against the spec interpreter.
 *
 * AC1  the runtime adapter mounts any picker node by type name from the catalog (no hand list),
 *      and a scripted Counter sequence produces a trace EQUAL to the spec interpreter's.
 * AC3  the trace schema validates the runtime adapter's output.
 * AC4  `settle` drains the deferred work C5 describes: a value written before `settle` is not
 *      observed until after it (Condition evaluates in an after-inputs callback).
 *
 * The assertion that matters is `expect(runtime).toEqual(interpreter)` — never a hand-written
 * expectation of what the runtime ought to do (R3 (a): the runtime wins; a divergence is a row).
 */

import * as fs from 'fs';
import * as path from 'path';

import { interpreterAdapter, play, validateTrace, specs } from '../../../nodegx-node-spec/src';
import type { Step, TraceEvent } from '../../../nodegx-node-spec/src';
import { runtimeTarget } from '../helpers/node-spec-target';

const runtime = runtimeTarget();
const interpreter = interpreterAdapter();

/** The same scenario on both targets. */
async function both(type: string, params: Record<string, unknown>, steps: Step[]): Promise<{ r: TraceEvent[]; i: TraceEvent[] }> {
  return { r: await play(runtime, type, params, steps), i: await play(interpreter, type, params, steps) };
}

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

describe('AC1 — Counter on the runtime equals Counter on the interpreter', () => {
  test('the NSP-001 script from { startValue: 5 } (seed pulse, one-frame pair, reset done, reset unchanged)', async () => {
    const { r, i } = await both('Counter', { startValue: 5 }, script);
    expect(r).toEqual(i);
    // the arm has a predicate: the trace is the 24-event one NSP-001 wrote out, not []
    expect(r.filter((e) => e.t === 'outcome')).toHaveLength(5);
  });

  test('limits: at Max, Increase reports unchanged and moves nothing', async () => {
    const { r, i } = await both('Counter', { limitsEnabled: true, limitsMax: 1 }, ['settle', { signal: 'increase' }, 'settle', { signal: 'increase' }, 'settle']);
    expect(r).toEqual(i);
    expect(r.filter((e) => e.t === 'outcome').map((e) => (e.t === 'outcome' ? e.value : ''))).toEqual(['done', 'unchanged']);
  });

  test('no Start Value: the first settle publishes 0 from the connection-time read, no pulse', async () => {
    const { r, i } = await both('Counter', {}, ['settle']);
    expect(r).toEqual(i);
    expect(r).toEqual([{ t: 'settle' }, { t: 'value', port: 'currentCount', value: 0 }]);
  });

  test('a later Start Value only moves where Reset returns to', async () => {
    const { r, i } = await both('Counter', { startValue: 1 }, ['settle', { set: 'startValue', value: 9 }, 'settle', { signal: 'reset' }, 'settle']);
    expect(r).toEqual(i);
  });

  test('coercion is the declared one on both: "3" → 3, "abc" → NaN, "" → false', async () => {
    const { r, i } = await both('Counter', { startValue: '3', limitsEnabled: '', limitsMax: 'abc' }, ['settle', { signal: 'increase' }, 'settle']);
    expect(r).toEqual(i);
    expect(r.find((e) => e.t === 'value')).toEqual({ t: 'value', port: 'currentCount', value: 3 });
  });

  test('params land in the caller\'s key order on both targets', async () => {
    const { r, i } = await both('Counter', { limitsMax: 7, limitsEnabled: true, startValue: 5 }, ['settle']);
    expect(r).toEqual(i);
    expect(r.slice(0, 3).map((e) => (e.t === 'set' ? e.port : e.t))).toEqual(['limitsMax', 'limitsEnabled', 'startValue']);
  });
});

describe('AC1 — mount by type name from the catalog, not a hand list', () => {
  const catalogPath = path.join(__dirname, '..', '..', '..', 'noodl-types', 'src', 'node-catalog.json');
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8')) as {
    nodes: Array<{ typeName: string; providedBy: string; inNodePicker: boolean; isDeprecated: boolean }>;
  };
  const population = catalog.nodes.filter((n) => n.providedBy === 'noodl-runtime' && n.inNodePicker && !n.isDeprecated).map((n) => n.typeName);

  test('the runtime registered every runtime-provided picker node the catalog lists', () => {
    expect(population.length).toBeGreaterThan(40);
    const missing = population.filter((t) => !runtime.hasType(t));
    expect(missing).toEqual([]);
  });

  test('every one of them mounts, settles and disposes headlessly', async () => {
    const failed: Array<[string, string]> = [];
    for (const type of population) {
      try {
        const t = await play(runtime, type, {}, ['settle']);
        expect(validateTrace(t).ok).toBe(true);
      } catch (e) {
        failed.push([type, (e as Error).message.split('\n')[0]]);
      }
    }
    // Measured, not preferred: the runtime-provided picker nodes that cannot be mounted headlessly
    // with no parameters, each with its reason. `User` reads `NoodlRuntime.Services.UserService`
    // at mount (user.ts:114), a service the browser viewer installs — a T3 node whose world is
    // NSP-007's and NSP-014's. A node added here needs its reason written in NSP-002 §5; a node
    // leaving is a ratchet the way picker coverage is.
    expect(failed).toEqual([['net.noodl.user.User', "Cannot read properties of undefined (reading 'forScope')"]]);
  });

  test('every registered spec names a type the runtime can mount', () => {
    for (const type of Object.keys(specs)) expect(runtime.hasType(type)).toBe(true);
  });
});

describe('AC3 — the schema validates the runtime adapter\'s output', () => {
  test('the Counter script, the limits script and a failure-free empty mount all validate', async () => {
    for (const [params, steps] of [
      [{ startValue: 5 }, script],
      [{ limitsEnabled: true, limitsMax: 1 }, ['settle', { signal: 'increase' }, 'settle', { signal: 'increase' }, 'settle']],
      [{}, ['settle']]
    ] as Array<[Record<string, unknown>, Step[]]>) {
      const t = await play(runtime, 'Counter', params, steps);
      const v = validateTrace(t);
      expect(v).toEqual({ ok: true, events: t });
    }
  });

  test('a value the runtime sends as NaN arrives in the trace tagged, not as null', async () => {
    const t = await play(runtime, 'Counter', { startValue: 'abc' }, ['settle']);
    expect(t).toContainEqual({ t: 'value', port: 'currentCount', value: { $num: 'NaN' } });
    expect(validateTrace(t).ok).toBe(true);
  });
});

describe('AC4 — settle drains the deferred work C5 describes', () => {
  test('Condition: a value written before settle is not observed until after it', async () => {
    const h = runtime.mount('Condition', {});
    try {
      runtime.set(h, 'condition', true);
      // before settle: only the stimulus is in the trace — the evaluation sits in an
      // after-inputs callback the drain has not run (condition.ts `scheduleAfterInputsHaveUpdated`)
      expect(runtime.trace(h)).toEqual([{ t: 'set', port: 'condition', value: true }]);
      expect(h.node.getOutput('result').value).toBeNull(); // "null until the first test" (condition.ts)
      await runtime.settle();
      // after: the known-firing signal beside the value, so the absence above was measured
      const after = runtime.trace(h).slice(1);
      expect(after[0]).toEqual({ t: 'settle' });
      expect(after).toContainEqual({ t: 'value', port: 'result', value: true });
      expect(after).toContainEqual({ t: 'signal', port: 'ontrue' });
      expect(after.filter((e) => e.t === 'signal')).toEqual([{ t: 'signal', port: 'ontrue' }]);
    } finally {
      runtime.dispose(h);
    }
  });

  test('Evaluate on Condition reports its outcome against the input that invoked it, and completed is not an event', async () => {
    const t = await play(runtime, 'Condition', { condition: false }, ['settle', { signal: 'eval' }, 'settle']);
    const second = t.slice(t.lastIndexOf({ t: 'settle' } as never));
    void second;
    const outcomes = t.filter((e) => e.t === 'outcome');
    expect(outcomes).toEqual([{ t: 'outcome', port: 'eval', value: 'done' }]);
    expect(t.some((e) => e.t === 'signal' && (e.port === 'completed' || e.port === 'done'))).toBe(false);
    expect(validateTrace(t).ok).toBe(true);
  });
});

describe('the adapter refuses what the interpreter refuses', () => {
  test('an unknown type, an unknown port, a set on a signal, a signal on a value', () => {
    expect(() => runtime.mount('Nope', {})).toThrow(/no node type "Nope"/);
    const h = runtime.mount('Counter', {});
    try {
      expect(() => runtime.set(h, 'nope', 1)).toThrow(/no input "nope"/);
      expect(() => runtime.set(h, 'increase', 1)).toThrow(/is a signal input/);
      expect(() => runtime.signal(h, 'startValue')).toThrow(/is a value input/);
    } finally {
      runtime.dispose(h);
    }
  });

  test('runtime errors raised by a node are on its handle, not in the trace', async () => {
    const h = runtime.mount('Counter', {});
    try {
      h.node.raiseRuntimeError('test/probe', 'a probe');
      expect(h.errors.map((e) => e.code)).toEqual(['test/probe']);
      expect(runtime.trace(h)).toEqual([]);
    } finally {
      runtime.dispose(h);
    }
  });
});
