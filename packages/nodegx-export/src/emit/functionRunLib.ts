/**
 * `src/lib/functionRun.ts` — a Function node's run, as the runtime's own node publishes it (EXP-011 §86).
 *
 * Emitted only where a component runs a Function whose own signals (`Outputs.go()`) drive a chain. The shape of
 * {@link ./idLib.ts}: constant text, transcribed from three runtime files, shipped where something calls into it.
 *
 * - `noodl-runtime/src/nodes/std-library/simplejavascript.ts` — the `Outputs` proxy: a write is published only when
 *   the value changes, and a write of the value already held is **held** and published with the next signal
 *   (GAM-011 AC2, `publishHeldWrites`). The node's values persist across runs, so an output a run does not write keeps
 *   the last one. A signal is a callable that also carries `.send`.
 * - `noodl-runtime/src/node.ts` `sendValue` — `undefined` is never sent (C3): the node's own output holds it, the wire's
 *   target keeps the value it had.
 * - `noodl-runtime/src/node.ts` `update` — the drain. A target applies one queued entry per port per pass, values before
 *   signals (C7, FB-025), so the k-th pulse a run sends is acted on with the k-th value each output published since the
 *   run began, or the last one when there are fewer. The targets act after the body, in the order it sent the pulses.
 *
 * - `noodl-runtime/src/run-on-value-change.ts` `valueDidChange`, read by `setScriptInputValue` (NDA-017 §2) — a value input
 *   ticked under Run On Value Change runs the node when a new value arrives, Run wired or not (P18-S119-TICKEDRUN).
 *   `tickedArrival` is that test over the ticked inputs, the node holding what each last received.
 *
 * - EXP-019 (session 133): a write or a signal after the body has returned (a timer, a listener) is handed to `node.late`,
 *   as the runtime's `Outputs` proxy flags an output whenever it is written.
 *
 * 🔴 **The first value, not the last.** `Outputs.a = ''; Outputs.a = 'x'; Outputs.go();` hands `go`'s target `''`, as the
 * runtime does today (P18-S119-FIRSTWRITE, needs a ruling). Change it here and in the runtime together, or not at all.
 */

/** Where the module lands in the exported app. */
export const FUNCTION_RUN_LIB_PATH = 'src/lib/functionRun.ts';

/** The exported helpers, sorted as the import line is. */
export const FUNCTION_RUN_HELPERS = ['functionNode', 'runFunction', 'tickedArrival'] as const;

export function functionRunLibSource(): string {
  return `/**
 * A Function node's run, as the running app's Function node publishes it.
 *
 * The body writes \`Outputs.x = …\` and sends \`Outputs.go()\`. A write is published only when the value changes, and a
 * write of the value already held is published with the next signal. Each signal is a pulse its chain acts on after the
 * body, reading the outputs in step with the pulse: the k-th pulse reads the k-th value published since the run began,
 * or the last one when there are fewer, or what the output last sent when this run published nothing.
 */

/** One Function node's state, kept across runs as the running app's node keeps it. */
export interface FunctionNode<O> {
  /** The signal names its body may send. */
  signals: readonly string[];
  /** What each output holds: the last value written to it, in any run. */
  outputs: Partial<O>;
  /** What each output last sent down its wire. \`undefined\` is never sent, so a reader keeps the value before it. */
  delivered: Partial<O>;
  /** What the body keeps on \`this\` across runs, as the running app's node keeps it (one object per node, never reset). */
  self: Record<string, unknown>;
  /**
   * What the body does after its run has returned, from a timer or a listener it set up: one write, or one signal with the
   * outputs as its chain reads them. The running app's node delivers those when they happen; a component whose body may
   * call back sets this to its own chains.
   */
  late?: (run: FunctionRun<O>) => void;
}

/** One signal the body sent, and the outputs as that pulse's chain reads them. */
export interface FunctionPulse<O> {
  signal: string;
  values: Partial<O>;
}

export interface FunctionRun<O> {
  /** The node's outputs after the run. */
  outputs: Partial<O>;
  /** Every signal the body sent, in the order it sent them. */
  pulses: Array<FunctionPulse<O>>;
}

export function functionNode<O>(signals: readonly string[]): FunctionNode<O> {
  return { signals, outputs: {}, delivered: {}, self: {} };
}

export function runFunction<I, O>(body: (inputs: I, outputs: O, self: Record<string, unknown>) => unknown, inputs: I, node: FunctionNode<O>): FunctionRun<O> {
  const current = node.outputs as Record<string, unknown>;
  const delivered = node.delivered as Record<string, unknown>;
  const before: Record<string, unknown> = { ...delivered };
  const published: Record<string, unknown[]> = {};
  const held = new Set<string>();
  const sent: string[] = [];
  let returned = false;
  const publish = (name: string, value: unknown) => {
    if (value === undefined) return;
    (published[name] = published[name] ?? []).push(value);
    delivered[name] = value;
  };
  const signals: Record<string, unknown> = {};
  for (const signal of node.signals) {
    const send = () => {
      held.forEach((name) => publish(name, current[name]));
      held.clear();
      if (returned) {
        node.late?.({ outputs: node.outputs, pulses: [{ signal, values: { ...delivered } as Partial<O> }] });
        return;
      }
      sent.push(signal);
    };
    signals[signal] = Object.assign(send, { send });
  }
  const outputs = new Proxy(signals, {
    get: (target, name) => (typeof name === 'string' && name in target ? target[name] : current[name as string]),
    set: (_target, name, value) => {
      const key = String(name);
      if (value !== current[key]) {
        current[key] = value;
        held.delete(key);
        publish(key, value);
        if (returned && value !== undefined) node.late?.({ outputs: node.outputs, pulses: [] });
      } else {
        held.add(key);
      }
      return true;
    }
  });
  body(inputs, outputs as unknown as O, node.self);
  returned = true;
  const count: Record<string, number> = {};
  const pulses = sent.map((signal) => {
    const k = (count[signal] = (count[signal] ?? 0) + 1);
    const values: Record<string, unknown> = { ...before };
    for (const name of Object.keys(published)) values[name] = published[name][Math.min(k, published[name].length) - 1];
    return { signal, values: values as Partial<O> };
  });
  return { outputs: node.outputs, pulses };
}

/**
 * Whether the values on a node's ticked inputs (those whose Run On Value Change box is ticked) are an arrival that runs it:
 * one of them is not \`undefined\`, which is never delivered, and is not the value that input already holds. Records each
 * one that arrived. A Run records what it read the same way, so a value set and a Run sent in one event make one run.
 */
export function tickedArrival(held: unknown[], values: readonly unknown[]): boolean {
  let arrived = false;
  values.forEach((value, i) => {
    if (value === undefined || Object.is(value, held[i])) return;
    held[i] = value;
    arrived = true;
  });
  return arrived;
}
`;
}
