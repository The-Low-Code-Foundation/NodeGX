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
 *                        And, with a world (NSP-007): a settle is a frame AT the clock's current
 *                        time — timers the node keeps by the clock (a Delay's countdown) are read
 *                        once per settle; answers the world has delivered land before the frame's
 *                        observations are recorded; `outcome` events sit in the order they were
 *                        REPORTED (trace.ts); `request` events, in issue order, close the group.
 *   trace(h)             a copy of the events so far, values in canonical form (canonical.ts).
 *   dispose(h)           tears the instance down.
 *   install(world)       OPTIONAL, NSP-007 — points the target at a scripted world (world.ts) for
 *                        one play and returns the function that unpoints it. A target whose nodes
 *                        reach time, entropy and the network through JavaScript's own seams
 *                        installs the world's globals (`installWorld`); the interpreter hands the
 *                        world to its specs. A target without `install` cannot play a spec that
 *                        declares `needs`, and the runner says so rather than running it flaky.
 *   advance(h, ms)       OPTIONAL, NSP-007 — records `{ t: 'advance', ms }` and moves the world's
 *                        clock in three moves: lets whatever the world has already delivered land
 *                        (a target with an event loop flushes its microtasks — that is why it is
 *                        async), `world.clock.advance(ms)` (every timer due on the way fires, its
 *                        callback at once), then lets what the move delivered land too — so the
 *                        next step sees the node AFTER the answer, as a person acting seconds later
 *                        would. Only a settle records what the landing did.
 *   registryArray(name)  OPTIONAL, NSP-014 s25 — the target's own registry array named `name`, from the
 *                        installed world's registry (world.ts REGISTRY; seeded from its script). A
 *                        scenario's value — a mount param or a `set` step's value — that is EXACTLY
 *                        `{ "$array": "<name>" }` (that one key) is handed to the node as that array,
 *                        not as the object: how a single-node play hands a node the records ANOTHER
 *                        node's output would carry (a Filter Records' Items). `play` resolves it; a
 *                        target without this hook cannot play such a scenario, and says so.
 *
 * Why values sort by port NAME and not by the spec's declaration order (which NSP-001 §5 first
 * wrote): a stranger's target (NSP-006) must produce a comparable trace from the spec and the
 * suite alone, and the catalog-parity gate compares ports by name, not position. Name order is
 * something every target can compute; declaration order is knowledge of one file.
 */

import type { TraceEvent } from './trace';
import type { World } from './world';

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
  /** NSP-007 — see the contract above. */
  install?(world: World): () => void;
  advance?(h: H, ms: number): Promise<void>;
  /** NSP-014 s25 — see the contract above. */
  registryArray?(name: string): unknown;
}

/** NSP-014 s25 — a scenario value naming a registry array: an object whose ONLY key is `$array`, a string. */
export function isArrayRef(value: unknown): value is { $array: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  return keys.length === 1 && keys[0] === '$array' && typeof (value as { $array: unknown }).$array === 'string';
}

/** One scripted step of a scenario — the JSON shape NSP-003 reads from disk. `advance` (NSP-007) moves the world's clock by `ms`. */
export type Step = { set: string; value?: unknown } | { signal: string } | { advance: number } | 'settle';

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
 *
 * With a `world` (NSP-007) the target is pointed at it for the whole play — before the mount,
 * because a node may draw from the world at creation — and unpointed in `finally`. A target
 * without `install` is played without one (the runner never hands a world to a target that
 * cannot take it; `runConformance` refuses that pairing first).
 */
export async function play<H extends Handle>(
  adapter: TargetAdapter<H>,
  type: string,
  params: Record<string, unknown>,
  steps: readonly Step[],
  world?: World
): Promise<TraceEvent[]> {
  let h: H | undefined;
  const restore = world && adapter.install ? adapter.install(world) : undefined;
  // NSP-014 s25 — `{ "$array": name }` is that registry array, the target's own (registryArray above)
  const resolve = (value: unknown): unknown => {
    if (!isArrayRef(value)) return value;
    if (!adapter.registryArray) throw new Error(`${adapter.name} has no registryArray(): it cannot play a scenario that hands a node a registry array`);
    return adapter.registryArray(value.$array);
  };
  try {
    h = adapter.mount(type, Object.fromEntries(Object.entries(params).map(([k, v]) => [k, resolve(v)])));
    for (const step of steps) {
      if (step === 'settle') await adapter.settle();
      else if ('signal' in step) adapter.signal(h, step.signal);
      else if ('advance' in step) {
        if (!adapter.advance) throw new Error(`${adapter.name} has no advance(): it cannot play a scenario that moves the clock`);
        await adapter.advance(h, step.advance);
      } else adapter.set(h, step.set, resolve(step.value));
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
    if (restore) restore();
  }
}
