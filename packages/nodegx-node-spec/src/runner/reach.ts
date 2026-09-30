/**
 * Reach (NSP-005): the part of a node's declared surface ONE target can be driven and observed on.
 *
 * A target does not always carry the whole node. The React export (NSP-005) translates a node
 * only in the graph shapes its slices cover — a Counter with a literal Start Value, driven by
 * element events, read through a callback — and drops the rest with a note; a value input wired
 * from a Component Input, a consumed `countChanged`, a wired Start Value each defer the node
 * entirely. Grading such a target against the full spec would report every sequence as a
 * divergence and say nothing about the code that runs.
 *
 * So a target may declare its reach for a node: which params it accepts at mount, which input
 * ports it can be driven on afterwards, which outputs it can observe. The runner then
 *   - generates sequences inside the reach only;
 *   - marks a hand scenario that steps outside the reach `outside` (counted, never hidden);
 *   - PROJECTS the reference trace onto the reach before comparing — an event on an output the
 *     target cannot observe is not a divergence, it is the reach's edge; and
 *   - runs the mutants on the projected traces too, so "unreached" and "survived" say how much of
 *     the node's behaviour this reach grades. The number that comes out is the honest one: how
 *     much of the node the export carries.
 *
 * The interpreter and the runtime have full reach and pass no `reach`; a report without one is
 * unchanged.
 */

import type { Step } from '../adapter';
import type { TraceEvent } from '../trace';

export interface Reach {
  /** Value inputs the target accepts as parameters at mount. */
  params: readonly string[];
  /** Ports (value or signal) the target can be driven on after mount. */
  inputs: readonly string[];
  /** Outputs (value or signal) the target can observe. */
  outputs: readonly string[];
  /**
   * Inputs whose OUTCOMES (done / unchanged / failure, ERG-001) the target can observe. Absent
   * means none: the React export's latch has no Done port to read, the interpreter shows every
   * one. An outcome event is stamped with the invoking input, so this is a list of inputs.
   */
  outcomes?: readonly string[];
}

/** The reference trace as this reach sees it: observations on ports outside it are dropped. */
export function projectTrace(trace: readonly TraceEvent[], reach: Reach): TraceEvent[] {
  const outputs = new Set(reach.outputs);
  const outcomes = new Set(reach.outcomes ?? []);
  return trace.filter((e) => {
    if (e.t === 'value' || e.t === 'signal') return outputs.has(e.port);
    // an outcome is stamped with the INPUT that invoked it; observed only where the reach says so
    if (e.t === 'outcome') return outcomes.has(e.port);
    return true;
  });
}

/** Why a scenario cannot be played inside this reach, or `undefined` when it can. */
export function outsideReach(params: Record<string, unknown>, steps: readonly Step[], reach: Reach): string | undefined {
  const allowedParams = new Set(reach.params);
  const allowedInputs = new Set(reach.inputs);
  for (const name of Object.keys(params)) if (!allowedParams.has(name)) return `param ${JSON.stringify(name)} is outside the target's reach`;
  for (const step of steps) {
    if (step === 'settle') continue;
    const port = 'signal' in step ? step.signal : step.set;
    if (!allowedInputs.has(port)) return `port ${JSON.stringify(port)} is outside the target's reach`;
  }
  return undefined;
}
