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
 *   set(h, port, value)  records `{ t: 'set' }` carrying the value AS SENT (raw, canonicalised for
 *                        the trace; `value` omitted for undefined), then coerces it by the port's
 *                        declared coercion and writes it. An unknown port throws — a port the spec
 *                        declares and the target lacks is a divergence to see; so does a KNOWN port
 *                        of the other kind (a set on a signal input, a signal on a value input).
 *   signal(h, port)      records `{ t: 'in' }` and pulses the input.
 *   settle()             drains EVERY mounted instance's deferred work (C5), then records, per
 *                        instance, `{ t: 'settle' }` followed by the frame's observations in the
 *                        canonical grouping: values that CHANGED since the last settle, sorted by
 *                        port name; signals in emission order; outcomes in invocation order.
 *                        Async because a runtime may defer through the microtask queue.
 *                        The three words a stranger asked about (NSP-006 §5):
 *                        - WHAT A FRAME SENDS for an output is the last DEFINED value that output
 *                          held after ANY step of the frame — not the settle-time value. A node
 *                          whose output passes through undefined mid-frame (NSP-011's Inverter:
 *                          `null` then `undefined`) sends the `null`; an output that held nothing
 *                          defined all frame sends nothing (C3) and keeps its baseline. A target
 *                          that reads its outputs only at settle diverges on exactly those nodes
 *                          and on none of the pilot five (the stranger's did, NSP-006 §5).
 *                        - CHANGED means the canonical form differs from the last value RECORDED
 *                          for that port (canonical.ts `canonicalKey`: NaN equals NaN, structurally
 *                          equal objects are equal). Before the first settle nothing has been
 *                          recorded, so the first settle records every output that is defined,
 *                          `null` included (C8).
 *                        - SORTED BY PORT NAME is code-unit order, `Array.prototype.sort`'s default.
 *                        And the three the second stranger asked about (NSP-006 §5.6):
 *                        - WHEN OUTPUTS ARE SAMPLED, as a procedure: after every step, the outputs
 *                          that step sends are read and a DEFINED reading replaces the frame's last;
 *                          at each settle, after the frame-end reducer, every output is read once
 *                          more under the same rule (an `undefined` reading never replaces a defined
 *                          one); then what differs from the last recorded value is recorded. MOUNT IS
 *                          NOT A SAMPLE: a value an output held at mount and lost before the first
 *                          settle is never sent (Boolean To String handed `falseString: undefined`
 *                          before its first settle sends nothing, not the `''` it held at mount).
 *                        - AN OUTCOME'S `port` IS THE INPUT THAT WAS INVOKED (trace.ts), never an
 *                          output name; outcomes are recorded in invocation order.
 *                        - `settle()` runs the frame-end reducer on EVERY settle, steps or none.
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
 * A target threw while a scenario was being played — inside `mount`, `set`, `signal` or `settle`.
 * Carries the trace up to the throw, so the runner can show WHERE the target died (NSP-004: a
 * String Format whose `format` is wired a number throws in its after-inputs callback). A throw
 * is not a behaviour a wire can carry, so it is a divergence from any reference, not an event.
 */
export class PlayError extends Error {
  constructor(message: string, readonly trace: TraceEvent[], readonly cause: unknown) {
    super(message);
    this.name = 'PlayError';
  }
}

/**
 * Plays one scenario on one target from a fresh mount and returns the trace. Disposes the
 * instance whatever happens. A throw from the target is rethrown as a `PlayError` holding the
 * trace so far (when the handle exists and can still be read).
 */
export async function play<H extends Handle>(
  adapter: TargetAdapter<H>,
  type: string,
  params: Record<string, unknown>,
  steps: readonly Step[]
): Promise<TraceEvent[]> {
  let h: H | undefined;
  try {
    h = adapter.mount(type, params);
    for (const step of steps) {
      if (step === 'settle') await adapter.settle();
      else if ('signal' in step) adapter.signal(h, step.signal);
      else adapter.set(h, step.set, step.value);
    }
    return adapter.trace(h);
  } catch (e) {
    if (e instanceof PlayError) throw e;
    let partial: TraceEvent[] = [];
    if (h) {
      try {
        partial = adapter.trace(h);
      } catch {
        // a handle the throw left unreadable: the trace so far is unknown
      }
    }
    throw new PlayError(`${adapter.name} threw: ${e instanceof Error ? e.message : String(e)}`, partial, e);
  } finally {
    if (h) adapter.dispose(h);
  }
}
