/**
 * Node's `async_hooks` for the graph-target bundle (build.mjs, THE GRAPH TARGET): the one Node primitive the runtime
 * test helper reads. It attributes a request the world sees to the node whose `update()` made it (`updating.run(s,
 * update)` / `updating.getStore()`), and falls back to the only mounted node.
 *
 * A page has no async context, so the store here follows the CALL STACK only: set inside `run`, gone when it returns.
 * Measured on the 85 graph scenarios (P112 OWN-003 s8): every request they make is made while the node's update is on
 * the stack, and a variant that also carried the store across `.then` continuations graded the same 85 / 85 — so the
 * simpler one ships. What this cannot do, and Node's can: attribute a request a node makes AFTER its update returned,
 * through a promise chain, when more than one node is mounted — the helper then refuses the play with its own sentence
 * ("cannot be attributed"), never a silent misattribution.
 *
 * @module noodl-preview/inPage/asyncLocalStorage
 */

export class AsyncLocalStorage<T> {
  private store: T | undefined = undefined;

  getStore(): T | undefined {
    return this.store;
  }

  run<R>(store: T, fn: (...args: unknown[]) => R, ...args: unknown[]): R {
    const previous = this.store;
    this.store = store;
    try {
      return fn(...args);
    } finally {
      this.store = previous;
    }
  }

  exit<R>(fn: (...args: unknown[]) => R, ...args: unknown[]): R {
    return this.run(undefined as unknown as T, fn, ...args);
  }

  enterWith(store: T): void {
    this.store = store;
  }

  disable(): void {
    this.store = undefined;
  }
}
