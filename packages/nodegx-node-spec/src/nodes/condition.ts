/**
 * Condition — read from `packages/noodl-runtime/src/nodes/std-library/condition.ts` on 2026-09-30,
 * with `run-on-value-change.ts` and node.ts `shouldRunOnValueChanged` (:217-219) beside it.
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * Why this node is in the pilot: value in, two signals and two booleans out, and the first node
 * whose behaviour needs a FRAME — every trigger in a frame is coalesced into one test (:171-172,
 * NDA-017 §2 constraint 3) that runs against the frame's final value (:180-181), while every
 * `Evaluate` pulse still gets its own `done` (:184-188, ERG-001 §4). That is the `afterInputs`
 * reducer (spec.ts), first used here. The exporter compiles this node away (logic.test.ts Step 6)
 * — NSP-005's hardest case.
 */

import { defineNode } from '../spec';

/**
 * run-on-value-change.ts :218-227 — `valueDidChange`. Primitives only: a non-primitive on either
 * side is always a change (an array mutated in place is the same reference); `undefined` on
 * either side is a change; `null` and `NaN` compare with `Object.is`.
 */
export function valueDidChange(previous: unknown, next: unknown): boolean {
  if (!isComparable(previous) || !isComparable(next)) return true;
  return !Object.is(previous, next);
}
function isComparable(value: unknown): boolean {
  if (value === null) return true;
  const t = typeof value;
  return t !== 'object' && t !== 'function' && t !== 'undefined';
}

export const Condition = defineNode({
  type: 'Condition',
  version: 1,
  source: 'packages/noodl-runtime/src/nodes/std-library/condition.ts',

  // initialize (:45-48): hasScheduledEvaluation false, hasEvaluated false. `last` is
  // `lastConditionValue` (:80) — the value that ARRIVED, kept for the DEF-046 comparison.
  // `tested` is the value the last test read (:180) — what the WIRE carries: `flagOutputDirty`
  // at :177-178 sends the getters' value at evaluation time, and nothing sends between tests.
  // ⚠️ The getters themselves (:133, :143) read the input LIVE, so a wire made after a passive
  // change (unticked, or a value arriving with no test) is handed a value no test produced,
  // while wires made before hold the tested one. The spec models the wire (NSP-002 decision 6);
  // the disagreement between the runtime's two readers is NSP-004 §6 row C2. Found by the
  // generated phase at 200 sequences: the first cut of this spec modelled the getter.
  state: { last: undefined as unknown, tested: undefined as unknown, scheduled: false, evaluated: false },
  // :49-66 — the condition's value (the `[No input]` branch at :52-54 is overwritten at :61 and has
  // never reached the inspector; the docblock there says so)
  inspect: (s) => String(s.last),
  // :156 outcomeOutputs({ done }) — no failure, no unchanged: "a test always tests"
  outcomes: ['done'],

  inputs: {
    // :69-86 — no default, no conversion: the setter stores what arrived (:80) and every reader
    // applies truthiness itself (:133 `!!`, :143 `!`, :181 `condition ?`)
    condition: {
      type: 'boolean',
      coerce: 'none',
      displayName: 'Condition',
      group: 'General',
      description: 'Value to test for truth; it is re-tested on every change unless you untick it below'
    },
    // :88-101 `valueChangedToTrue` → `scheduleEvaluate(this.beginOutcome())`
    eval: {
      type: 'signal',
      outcome: true,
      displayName: 'Evaluate',
      group: 'Actions',
      description:
        'Tests Condition now. This is additional to Condition re-testing on change; untick it under Run On Value Change to stop that'
    },
    // :44 `runOnValueChange: { controlSignal: 'eval', inputs: ['condition'] }` → nodedefinition.ts
    // synthesises this port from `runOnChangeInput` (run-on-value-change.ts :121-139): default
    // true, and only an explicit `false` unticks (:137 `value !== false`).
    'runOnChange-condition': {
      type: 'boolean',
      default: true,
      coerce: 'not-false',
      displayName: 'Condition',
      group: 'Run On Value Change',
      description:
        'Whether a new value on Condition re-runs this node. On by default; untick to make this input passive so only the control signal runs it'
    }
  },

  outputs: {
    // :104-115
    ontrue: {
      type: 'signal',
      displayName: 'On True',
      group: 'Events',
      description: 'Fires each time Condition is tested and found true — exactly one of On True and On False fires per test'
    },
    onfalse: {
      type: 'signal',
      displayName: 'On False',
      group: 'Events',
      description: 'Fires each time Condition is tested and found false, including while Condition has never been set'
    },
    // :124-134 — null until the first test (NDA-017 §2 constraint 4), then `!!condition` as the
    // last test read it (see `tested` above)
    result: {
      type: 'boolean',
      from: (s) => (s.evaluated ? !!s.tested : null),
      displayName: 'Is True',
      group: 'Booleans',
      description:
        'Whether the last test found Condition true, for wiring into a value rather than branching on a signal; null until the first test. ' +
        'If Condition is a constant, every test pushes the same value — a mounted gate wired that way only ever turns on; a Switch is the two-way shape'
    },
    // :136-144
    isfalse: {
      type: 'boolean',
      from: (s) => (s.evaluated ? !s.tested : null),
      displayName: 'Is False',
      group: 'Booleans',
      description: 'The opposite of Is True, so a false branch needs no Inverter; null until the first test'
    }
  }
}).on(
  {
    // :78-85 — store the arrival; schedule a test only if the value CHANGED (DEF-046) AND the
    // checkbox is ticked (node.ts :217-219 `valueDidChange(previous, next) && runOnValueChange`).
    // A value arriving reports no outcome (:96-98: "only the port mints").
    condition: (s, v, i) =>
      valueDidChange(s.last, v) && i['runOnChange-condition'] ? { set: { last: v, scheduled: true } } : { set: { last: v } },

    // :96-100 — an Evaluate always schedules a test and always reports `done` once the frame has
    // tested (:184-188 `reportOutcomes(tokens, 'done')`, one per pulse even when the tests coalesce).
    // The outcome queues to the settle the test lands in, after the frame's signals.
    eval: () => ({ set: { scheduled: true }, outcome: 'done' })
  },
  {
    // :174-189 — the one test per frame: mark evaluated, publish both booleans, pulse exactly one
    // of On True / On False from the frame's FINAL value (:180-181 `getInputValue('condition')`).
    afterInputs: (s) =>
      s.scheduled ? { set: { scheduled: false, evaluated: true, tested: s.last }, emit: [s.last ? 'ontrue' : 'onfalse'] } : {}
  }
);
