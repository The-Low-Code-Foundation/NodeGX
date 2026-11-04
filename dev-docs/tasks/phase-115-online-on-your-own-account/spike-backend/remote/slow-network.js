/**
 * HST-006 §7: against the live Worker every request crosses the internet (~100–200 ms), so a suite's own timeout,
 * set for a service on localhost, can run out on latency alone (the route walk sends one request per route, in turn).
 * Remote runs multiply each suite's timeout by HST_TIMEOUT_FACTOR (default 4). Correctness is untouched.
 *
 * `jest.setTimeout(ms)` writes `global[Symbol.for('TEST_TIMEOUT_SYMBOL')]` (jest-runtime), which jest-circus reads
 * per test. Each module has its own `jest` object, so wrapping `jest.setTimeout` here would not reach the suite's
 * call; the global it writes does.
 */
const factor = Number(process.env.HST_TIMEOUT_FACTOR || 4);
const key = Symbol.for('TEST_TIMEOUT_SYMBOL');
let stored = 5000 * factor;
Object.defineProperty(global, key, {
  configurable: true,
  get: () => stored,
  set: (ms) => {
    stored = Number(ms) * factor;
  }
});
