---
title: "Condition"
---
Boolean gate: routes an evaluation into On True / On False signals and holds Is True / Is False as readable booleans.

Condition watches a single boolean input and exposes it in two forms: as level outputs (`result`/Is True and `isfalse`/Is False, plain booleans that always reflect the current state) and as event outputs (`ontrue`/On True and `onfalse`/On False, signals that fire when the condition is evaluated). Evaluation happens when the `condition` input changes, or on demand when the `eval` (Evaluate) signal is triggered — the idiomatic way to gate an action behind a check at the moment a user acts.

## When to use it

Use it to branch signal flow ('when clicked, proceed only if valid') or to derive a visible/enabled boolean and its inverse from one condition. For choosing between more than two cases use Switch or States; for combining several booleans first, feed it from And/Or or an Expression.

## At a glance

| | |
|---|---|
| Category | Logic |
| Type name | `Condition` |
| Available in | browser, cloud |
| SSR compatibility | safe |
| Provided by | `noodl-runtime` |
| Behaviour spec | version 1 ([under the hood](#under-the-hood)) |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `condition` | Boolean | — | Value to test for truth; it is re-tested on every change unless you untick it below |
| `runOnChange-condition` | Boolean | `true` | Whether a new value on Condition re-runs this node. On by default; untick to make this input passive so only the control signal runs it |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `eval` | Signal | — | Tests Condition now. This is additional to Condition re-testing on change; untick it under Run On Value Change to stop that |

### What each input does

**Condition** (`condition`)

- a changed value, with Run On Value Change ticked: tested at the end of the frame — On True or On False, from the frame's last value
- the same value, or Run On Value Change unticked: kept for the next test, and asks for none

**Evaluate** (`eval`)

- always: tested at the end of the frame — On True or On False, from the frame's last Condition → Done

## Outputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `isfalse` | Boolean | — | The opposite of Is True, so a false branch needs no Inverter; null until the first test |
| `result` | Boolean | — | Whether the last test found Condition true, for wiring into a value rather than branching on a signal; null until the first test. If Condition is a constant, every test pushes the same value — a mounted gate wired that way only ever turns on; a Switch is the two-way shape |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `completed` | Signal | — | Fires after every invocation. This node has no other outcome — no Unchanged and no Failure — so it always fires together with Done, and wiring either one does the same thing. It is here on every action so that reaching for it is never a per-node decision |
| `done` | Signal | — | Fires once an Evaluate you triggered has tested Condition, after On True or On False |
| `onfalse` | Signal | — | Fires each time Condition is tested and found false, including while Condition has never been set |
| `ontrue` | Signal | — | Fires each time Condition is tested and found true — exactly one of On True and On False fires per test |

## Patterns

- Button `onClick` → `eval`, with `ontrue` driving the action: gate an action behind a validity check at click time.
- `isfalse` → a message's `visible`: show an error as a level rather than pulsing it with a signal.

## Watch out for

- Wiring `ontrue` (signal) to a boolean input like `visible` delivers only a momentary pulse — use `result` for anything that must stay on.
- Leaving Run On Value Change on when `ontrue`/`onfalse` DOES something (advance a question, navigate, set a Variable, start a Timer): the gate then fires whenever its input settles, including once while the page loads, before anyone has acted. Set `runOnChange-condition: false` and wire `eval` from the signal that should ask — a Repeat's tick, a button's click, a Timer's finish.
- Two gates evaluated by one signal, where one gate's On True changes what the other one reads (advancing a question index that the other's 'is the answer right?' compares against): the second can read the changed value. Chain them instead — the reader's `done` → the writer's `eval` — so the reader decides first.
- Expecting a second Evaluate with an unchanged condition to stay silent: every Evaluate fires On True or On False again, whether or not the value changed.
- A gate left on Run On Value Change fires the moment its condition is true, even for one step in the middle of a chain of Set Variables. A timeout watching 'time is up AND not answered' fires again while moving on if `answered` is cleared while the countdown still reads 0: the next question starts answered and its first tap is refused (a quiz that scored the right answer after a timeout as wrong). Reset the value that makes it true (the countdown back to 10) before the one that holds it off (`answered` back to false).

## Examples

**Validate an input before acting on a click**

The idiomatic gate shape: a Button click does not act directly — it evaluates a Condition. The Condition's boolean comes from an Expression that checks the text input's current value, so the same click either proceeds (ontrue) or reveals an error message (isfalse drives the error Text's visibility as a level, not a pulse). Note the two kinds of flow: text/booleans are values, onClick/eval/ontrue are momentary signals.

## Related nodes

[And](./and.md), [Or](./or.md), [Inverter](./inverter.md), [Switch](./switch.md), [Expression](../custom-code/expression.md), [States](../animation/states.md)

## Code export

Exports to React. A project that uses it exports this node as React code.

## Under the hood

This node's behaviour is written down as an executable spec in `@nodegx/node-spec`, version 1. The spec is the reference: the runtime, the React export and the conformance tests are all graded against it. Every rule in it cites the line of the runtime it was read from. The full spec is at the bottom of this page.

### What it depends on outside the node

Nothing. Its outputs depend only on its inputs and its own state.

### Starting state

```json
{
  "scheduled": false,
  "evaluated": false
}
```

### How inputs are converted

Inputs not listed arrive as sent.

| Input | Conversion | What it does |
|---|---|---|
| Condition (`runOnChange-condition`) | `not-false` | only an explicit `false` turns it off; no value, `0` and `""` leave it on |

### How actions report back

Each time Evaluate is triggered, the node reports exactly one of **Done**.

### The code it replaces

What you would write by hand instead:

- an if / else on a value that runs one of two handlers: `if (ok) onTrue(); else onFalse()`
- a ternary choosing between two branches: `ok ? showA() : showB()`

## The full spec {#spec-source}

The spec's source, as the docs were generated. Helpers it imports live beside it in `packages/nodegx-node-spec/src`.

```ts title="packages/nodegx-node-spec/src/nodes/condition.ts"
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
  // NSP-018 — the hand-written code this node replaces (read by nothing yet; `spec-ledger` counts it)
  idioms: [
    { says: 'an if / else on a value that runs one of two handlers', example: 'if (ok) onTrue(); else onFalse()' },
    { says: 'a ternary choosing between two branches', example: 'ok ? showA() : showB()' }
  ],

  // initialize (:45-48): hasScheduledEvaluation false, hasEvaluated false. `last` is
  // `lastConditionValue` (:80) — the value that ARRIVED, kept for the DEF-046 comparison.
  // `tested` is the value the last test read (:180) — what the WIRE carries: `flagOutputDirty`
  // at :177-178 sends the getters' value at evaluation time, and nothing sends between tests.
  // The getters report the same tested value (row C2, fixed: ruled "Keep the tested result"); they
  // used to read the input LIVE, so a wire made after a passive change (unticked, or a value
  // arriving with no test) was handed a value no test produced, while wires made before held the
  // tested one — graded by graph t13. The spec models the wire (NSP-002 decision 6). Found by the
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
      valueDidChange(s.last, v) && i['runOnChange-condition']
        ? {
            says: "a changed value, with Run On Value Change ticked: tested at the end of the frame — On True or On False, from the frame's last value",
            set: { last: v, scheduled: true }
          }
        : { says: 'the same value, or Run On Value Change unticked: kept for the next test, and asks for none', set: { last: v } },

    // :96-100 — an Evaluate always schedules a test and always reports `done` once the frame has
    // tested (:184-188 `reportOutcomes(tokens, 'done')`, one per pulse even when the tests coalesce).
    // The outcome queues to the settle the test lands in, after the frame's signals.
    eval: () => ({
      says: "always: tested at the end of the frame — On True or On False, from the frame's last Condition",
      set: { scheduled: true },
      outcome: 'done'
    })
  },
  {
    // :174-189 — the one test per frame: mark evaluated, publish both booleans, pulse exactly one
    // of On True / On False from the frame's FINAL value (:180-181 `getInputValue('condition')`).
    afterInputs: (s) =>
      s.scheduled ? { set: { scheduled: false, evaluated: true, tested: s.last }, emit: [s.last ? 'ontrue' : 'onfalse'] } : {}
  }
);
```


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
