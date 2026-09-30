/**
 * NSP-002 §2.2 — the interpreter as a target: `play()` on the interpreter adapter produces the
 * trace `run()` produces for the same scenario, every mounted instance settles on one `settle()`,
 * and an unknown type or port is refused.
 */

import { Counter, run, play, interpreterAdapter, validateTrace } from '../src';
import type { Step } from '../src';

const script: Step[] = ['settle', { signal: 'increase' }, 'settle', { set: 'startValue', value: 9 }, { signal: 'reset' }, 'settle'];

describe('the interpreter adapter', () => {
  test('play() equals run() for the same scenario, and the trace validates', async () => {
    const viaAdapter = await play(interpreterAdapter(), 'Counter', { startValue: 5, limitsEnabled: false }, script);
    expect(viaAdapter).toEqual(run(Counter, { startValue: 5, limitsEnabled: false }, script));
    expect(validateTrace(viaAdapter).ok).toBe(true);
  });

  test('a set of undefined is recorded without a value field', async () => {
    const t = await play(interpreterAdapter(), 'Counter', {}, [{ set: 'limitsMax' }, 'settle']);
    expect(t[0]).toEqual({ t: 'set', port: 'limitsMax' });
    expect('value' in t[0]).toBe(false);
  });

  test('settle() settles every live instance; dispose() removes one', async () => {
    const a = interpreterAdapter();
    const h1 = a.mount('Counter', { startValue: 1 });
    const h2 = a.mount('Counter', { startValue: 2 });
    a.dispose(h2);
    await a.settle();
    expect(a.trace(h1).filter((e) => e.t === 'settle')).toHaveLength(1);
    expect(a.trace(h2).filter((e) => e.t === 'settle')).toHaveLength(0);
  });

  test('an unknown type and an unknown port are refused', async () => {
    const a = interpreterAdapter();
    expect(() => a.mount('Nope', {})).toThrow(/no spec for "Nope"/);
    const h = a.mount('Counter', {});
    expect(() => a.set(h, 'nope', 1)).toThrow(/no value input "nope"/);
    expect(() => a.signal(h, 'startValue')).toThrow(/is a value input/);
  });

  test('a resolver can supply specs from elsewhere', async () => {
    const a = interpreterAdapter({ resolve: (t) => (t === 'Alias' ? Counter : undefined) });
    const t = await play(a, 'Alias', {}, ['settle']);
    expect(t).toEqual([{ t: 'settle' }, { t: 'value', port: 'currentCount', value: 0 }]);
  });
});
