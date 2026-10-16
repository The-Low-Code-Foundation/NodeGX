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
 * 🔴 **The first value, not the last.** `Outputs.a = ''; Outputs.a = 'x'; Outputs.go();` hands `go`'s target `''`, as the
 * runtime does today (P18-S119-FIRSTWRITE, needs a ruling). Change it here and in the runtime together, or not at all.
 */

/** Where the module lands in the exported app. */
export const FUNCTION_RUN_LIB_PATH = 'src/lib/functionRun.ts';

/** The exported helpers, sorted as the import line is. */
export const FUNCTION_RUN_HELPERS = ['functionNode', 'runFunction'] as const;

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
  return { signals, outputs: {}, delivered: {} };
}

export function runFunction<I, O>(body: (inputs: I, outputs: O) => unknown, inputs: I, node: FunctionNode<O>): FunctionRun<O> {
  const current = node.outputs as Record<string, unknown>;
  const delivered = node.delivered as Record<string, unknown>;
  const before: Record<string, unknown> = { ...delivered };
  const published: Record<string, unknown[]> = {};
  const held = new Set<string>();
  const sent: string[] = [];
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
      } else {
        held.add(key);
      }
      return true;
    }
  });
  body(inputs, outputs as unknown as O);
  const count: Record<string, number> = {};
  const pulses = sent.map((signal) => {
    const k = (count[signal] = (count[signal] ?? 0) + 1);
    const values: Record<string, unknown> = { ...before };
    for (const name of Object.keys(published)) values[name] = published[name][Math.min(k, published[name].length) - 1];
    return { signal, values: values as Partial<O> };
  });
  return { outputs: node.outputs, pulses };
}
`;
}
