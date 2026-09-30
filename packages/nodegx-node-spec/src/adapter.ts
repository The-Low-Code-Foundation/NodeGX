/**
 * The adapter — the one small interface every target implements (NSP-002 §2.2).
 *
 * A target is anything that can run a node: the spec interpreter (adapters/interpreter.ts), the
 * interpreted runtime (packages/noodl-runtime/test/helpers/node-spec-target.ts — it has to live
 * where the runtime compiles, and this package depends on nothing in the runtime), the React
 * export (NSP-005), a stranger's vanilla-JS target (NSP-006). The runner (NSP-003) drives two of
 * them with one scenario and compares the traces line by line.
 *
 * The contract, written once so every adapter reads the same one:
 *
 *   mount(type, params)  creates one instance of the node the catalog calls `type`, records a
 *                        `set` event per param IN THE ORDER OF THE PARAMS OBJECT'S KEYS (what the
 *                        runtime does with a node's parameters: `Object.keys(parameters)`,
 *                        nodescope.ts `setNodeParameters`), applies each as an ordinary write, and
 *                        does NOT settle. The scenario's first `settle` is where the first frame's
 *                        events land (C8, the first update consolidates).
 *   set(h, port, value)  records `{ t: 'set' }` and writes the value. An unknown port throws —
 *                        a port the spec declares and the target lacks is a divergence to see.
 *   signal(h, port)      records `{ t: 'in' }` and pulses the input.
 *   settle()             drains EVERY mounted instance's deferred work (C5), then records, per
 *                        instance, `{ t: 'settle' }` followed by the frame's observations in the
 *                        canonical grouping: values that CHANGED since the last settle, sorted by
 *                        port name; signals in emission order; outcomes in invocation order.
 *                        Async because a runtime may defer through the microtask queue.
 *   trace(h)             a copy of the events so far, values in canonical form (canonical.ts).
 *   dispose(h)           tears the instance down.
 *
 * Why values sort by port NAME and not by the spec's declaration order (which NSP-001 §5 first
 * wrote): a stranger's target (NSP-006) must produce a comparable trace from the spec and the
 * suite alone, and the catalog-parity gate compares ports by name, not position. Name order is
 * something every target can compute; declaration order is knowledge of one file.
 */

import type { TraceEvent } from './trace';

/** Opaque to the runner; each adapter extends it with what it needs. */
export interface Handle {
  readonly id: string;
  readonly type: string;
}

export interface TargetAdapter<H extends Handle = Handle> {
  readonly name: string;
  mount(type: string, params: Record<string, unknown>): H;
  set(h: H, port: string, value: unknown): void;
  signal(h: H, port: string): void;
  settle(): Promise<void>;
  trace(h: H): TraceEvent[];
  dispose(h: H): void;
}

/** One scripted step of a scenario — the JSON shape NSP-003 reads from disk. */
export type Step = { set: string; value?: unknown } | { signal: string } | 'settle';

/**
 * Plays one scenario on one target from a fresh mount and returns the trace. Disposes the
 * instance whatever happens.
 */
export async function play<H extends Handle>(
  adapter: TargetAdapter<H>,
  type: string,
  params: Record<string, unknown>,
  steps: readonly Step[]
): Promise<TraceEvent[]> {
  const h = adapter.mount(type, params);
  try {
    for (const step of steps) {
      if (step === 'settle') await adapter.settle();
      else if ('signal' in step) adapter.signal(h, step.signal);
      else adapter.set(h, step.set, step.value);
    }
    return adapter.trace(h);
  } finally {
    adapter.dispose(h);
  }
}
