---
title: "Counter"
---
A number you step up and down with signals, with optional min/max limits and a reset.

Counter holds a number, exposed on `currentCount` (Current Count). The `increase` (Increase Count) and `decrease` (Decrease Count) signal inputs step it by exactly 1; `reset` (Reset To Start) puts it back to `startValue` (Start Value, default 0), which is also the initial count. When `limitsEnabled` (Limits Enabled) is true, an `increase` at or above `limitsMax` (Max Value) and a `decrease` at or below `limitsMin` (Min Value) are ignored entirely — the count does not change and `countChanged` does not fire. Every actual change fires the `countChanged` (Count Changed) signal after `currentCount` has been updated.

## When to use it

Use it for user-driven tallies: quantity steppers, pagination cursors, wizard step tracking. For arbitrary arithmetic (step sizes other than 1, computed values) use Expression or a Function; for a persistent number shared across components use a Variable or an Object.

## At a glance

| | |
|---|---|
| Category | Math |
| Type name | `Counter` |
| Available in | browser, cloud |
| SSR compatibility | safe |
| Provided by | `noodl-runtime` |
| Behaviour spec | version 2 ([under the hood](#under-the-hood)) |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `limitsEnabled` | Boolean | `false` | Whether Min Value and Max Value bound the count; without it the count runs unbounded in both directions |
| `limitsMax` | Number | `0` | Highest count Increase will reach, ignored unless Limits Enabled |
| `limitsMin` | Number | `0` | Lowest count Decrease will reach, ignored unless Limits Enabled |
| `startValue` | Number | `0` | Count to begin at and to return to on Reset; setting it announces a change on Count Changed at page load |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `decrease` | Signal | — | Subtracts one from the count, or does nothing at all when Limits Enabled and the count is already at Min Value |
| `increase` | Signal | — | Adds one to the count, or does nothing at all when Limits Enabled and the count is already at Max Value |
| `reset` | Signal | — | Puts the count back to Start Value, or reports Unchanged and leaves Count Changed silent when it is already there |

### What each input does

**Increase Count** (`increase`)

- at Max Value with Limits Enabled → Unchanged; Count Changed stays silent
- otherwise the count goes up by one → Count Changed, Done

**Decrease Count** (`decrease`)

- at Min Value with Limits Enabled → Unchanged; Count Changed stays silent
- otherwise the count goes down by one → Count Changed, Done

**Reset To Start** (`reset`)

- already at Start Value → Unchanged; Count Changed stays silent
- otherwise the count goes back to Start Value → Count Changed, Done

**Start Value** (`startValue`)

- after the first: only where Reset returns to → Count Changed stays silent
- the first one: the count starts there too → Count Changed

## Outputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `currentCount` | Number | — | The count as it stands |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `completed` | Signal | — | Fires after every invocation, whatever the outcome — wire this to carry on regardless. Failure still fires and still carries its reason, so this cannot hide an error |
| `countChanged` | Signal | — | Fires after the count has moved, and also once at page load when Start Value is set |
| `done` | Signal | — | Fires when the count actually moved |
| `unchanged` | Signal | — | Fires when nothing moved: Limits Enabled held the count at Min or Max, or Reset was pressed on a count already at Start Value |

## Patterns

- Plus/minus buttons' `onClick` → `increase`/`decrease` with limits enabled: a bounded quantity stepper.
- `currentCount` → a String Format input: display the count inside a sentence without a Function node.

## Watch out for

- Polling `currentCount` to react to changes — wire `countChanged` (signal) or `currentCount` (value) directly; the node already pushes updates.

## Examples

**Quantity stepper: Counter with remapped and formatted readouts**

Two buttons drive a Counter up and down within limits. The count feeds three displays: a String Format caption ('{count} items'), a String Mapper that maps special values to words (0 → 'empty'), and a Number Remapper converting the 0–10 range into 0.2–1 opacity for a fill indicator. Counter holds the state; the display nodes are pure value-shaping between it and the UI. ⚠️ This component has no `Component Inputs` or `Component Outputs`: nothing outside it can set the starting quantity or read the count back, so it is a demonstration of the value-shaping nodes rather than a part a page can use. `comp-controlled-quantity-stepper` is the same idea with an interface — `value` in, `value` and `valueChanged` out.

**The controlled value: the same name goes in, comes out, and says when it moved**

The most common shape on the shelf, and the one an authored component usually forgets. `value` arrives on `Component Inputs`, the same name leaves on `Component Outputs`, and a `valueChanged` signal leaves beside it — a parent that can only set a value and never read it back has to keep its own copy and hope. `Counter` holds the number: `startValue` seeds it from the instance, `increase`/`decrease` are signals from the two buttons, and `limitsEnabled` with `limitsMin`/`limitsMax` means the clamp lives in one node instead of in two Function nodes that will disagree. 🔴 The `disabled` flag is wired through an `Inverter` into BOTH buttons' `enabled`, not just onto the label's colour: a flag that changes how a component looks but not what it accepts is a component that can be told one thing and do another. ⚠️ `logic-quantity-stepper` builds the same buttons around the same `Counter` and is about the value-shaping nodes between the count and the screen — `String Format`, `String Mapper`, `Number Remapper`; it has no interface at all, and the two are worth reading together. The page here shows the other half of the contract — it reads `value` back into a readout and acts on `valueChanged` — which is what makes this different from a component that merely renders a number.

## Related nodes

[Number](../variables/number.md), [Expression](../custom-code/expression.md), [Number Remapper](./number-remapper.md), [String Format](../string-manipulation/string-format.md)

## Code export

Exports to React. A project that uses it exports this node as React code.

## Under the hood

This node's behaviour is written down as an executable spec in `@nodegx/node-spec`, version 2. The spec is the reference: the runtime, the React export and the conformance tests are all graded against it. Every rule in it cites the line of the runtime it was read from. The full spec is at the bottom of this page.

### What it depends on outside the node

Nothing. Its outputs depend only on its inputs and its own state.

### Starting state

```json
{
  "count": 0,
  "start": 0,
  "startSeen": false
}
```

### How inputs are converted

Inputs not listed arrive as sent.

| Input | Conversion | What it does |
|---|---|---|
| Start Value (`startValue`) | `js-number` | converted with `Number(value)`, so text that is not a number becomes `NaN` |
| Min Value (`limitsMin`) | `js-number` | converted with `Number(value)`, so text that is not a number becomes `NaN` |
| Max Value (`limitsMax`) | `js-number` | converted with `Number(value)`, so text that is not a number becomes `NaN` |
| Limits Enabled (`limitsEnabled`) | `js-boolean` | any truthy value is `true`, anything else `false` |

### How actions report back

Each time Increase Count, Decrease Count or Reset To Start is triggered, the node reports exactly one of **Done** or **Unchanged**.

### Warnings it shows in the editor

| Warning | Settings it points at | Id |
|---|---|---|
| Min Value is above Max Value | `limitsMin`, `limitsMax` | `counter/min-above-max` |

### Version history

- **Version 1** (runtime commit `328a025dc`): A Reset when the count is already at Start Value reports Unchanged and Count Changed stays silent. Before, every Reset reported Done and pulsed Count Changed, even when nothing moved. Existing projects are not migrated: the old pulse said the count moved when it had not, and the guard meant to stop it was dead from the day it was written. Counter has no Treat Unchanged As input to keep it (counter.ts spreads outcomeOutputs, never outcomeInputs), and the change shipped alone so one revert brings it back if a project depended on it.
- **Version 2**: A Min Value above Max Value now shows the editor a warning until it is fixed. Before, nothing said so, and with Limits Enabled on the count got stuck with no reason given. Existing projects are not migrated: only the editor is told. Nothing a wire carries changes, and a deployed app shows nothing.

### The code it replaces

What you would write by hand instead:

- a number in state with +1 / −1 / reset handlers: `const [n, setN] = useState(0)`
- a clamped counter: `setN((n) => Math.min(n + 1, max))`

## The full spec {#spec-source}

The spec's source, as the docs were generated. Helpers it imports live beside it in `packages/nodegx-node-spec/src`.

```ts title="packages/nodegx-node-spec/src/nodes/counter.ts"
/**
 * Counter — read from `packages/noodl-runtime/src/nodes/std-library/counter.ts` on 2026-09-30.
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from; where
 * the spec and the runtime disagree, that is a §6 row in NSP-004 and a ruling — not an edit here.
 *
 * Why this node first: state, limits, three outcome signals, an asymmetric setter, and a known
 * historic drift (FH-022: a Reset guard that was dead from the day it was written).
 */

import { defineNode } from '../spec';

export const Counter = defineNode({
  type: 'Counter',
  version: 2,
  // NSP-010 — the history. FH-022 slice 3 came before this spec, so v1 is the behaviour after it; the before and after traces
  // are golden/changes/Counter@1.json, the before replayed on the runtime at 328a025dc^ (noodl-runtime nsp-010-counter-history)
  changes: [
    {
      version: 1,
      says: 'A Reset when the count is already at Start Value reports Unchanged and Count Changed stays silent. Before, every Reset reported Done and pulsed Count Changed, even when nothing moved',
      row: 'FH-022 slice 3',
      commit: '328a025dc',
      migration: {
        none: "The old pulse said the count moved when it had not, and the guard meant to stop it was dead from the day it was written. Counter has no Treat Unchanged As input to keep it (counter.ts spreads outcomeOutputs, never outcomeInputs), and the change shipped alone so one revert brings it back if a project depended on it"
      }
    },
    {
      version: 2,
      says: 'A Min Value above Max Value now shows the editor a warning until it is fixed. Before, nothing said so, and with Limits Enabled on the count got stuck with no reason given',
      row: 'NSP-019 s95',
      migration: {
        none: 'Only the editor is told. Nothing a wire carries changes, and a deployed app shows nothing'
      }
    }
  ],
  source: 'packages/noodl-runtime/src/nodes/std-library/counter.ts',
  // NSP-018 — the hand-written code this node replaces (read by nothing yet; `spec-ledger` counts it)
  idioms: [
    { says: 'a number in state with +1 / −1 / reset handlers', example: 'const [n, setN] = useState(0)' },
    { says: 'a clamped counter', example: 'setN((n) => Math.min(n + 1, max))' }
  ],

  // initialize (:29-37): currentValue 0, startValue 0, startValueSet false. The limits live in
  // `_internal` too (:34-36) but they are plain copies of inputs, so here they are inputs.
  state: { count: 0, start: 0, startSeen: false },
  // :38 getInspectInfo
  inspect: (s) => 'Count: ' + s.count,
  // `checkLimits`, from both limit setters (NSP-019 s95): Min above Max is a mistake with or without Limits Enabled — with it on,
  // Increase stops at Max and Decrease at Min, so every count ends where neither moves it
  diagnostics: {
    'counter/min-above-max': {
      says: 'Min Value is above Max Value',
      // R40 — Min Value and Max Value as saved: the warning shows at the placing
      settings: ['limitsMin', 'limitsMax'],
      message: (i) => (i.limitsMin > i.limitsMax ? `Min Value ${i.limitsMin} is above Max Value ${i.limitsMax}. With Limits Enabled on, the count gets stuck.` : null)
    }
  },
  // :194-198 outcomeOutputs({ done, unchanged }) — no failure: a counter cannot fail
  outcomes: ['done', 'unchanged'],

  inputs: {
    // :42-60, :61-77, :78-118 — `valueChangedToTrue`, each opening with `beginOutcome()`
    increase: {
      type: 'signal',
      outcome: true,
      displayName: 'Increase Count',
      group: 'Actions',
      description: 'Adds one to the count, or does nothing at all when Limits Enabled and the count is already at Max Value'
    },
    decrease: {
      type: 'signal',
      outcome: true,
      displayName: 'Decrease Count',
      group: 'Actions',
      description: 'Subtracts one from the count, or does nothing at all when Limits Enabled and the count is already at Min Value'
    },
    reset: {
      type: 'signal',
      outcome: true,
      displayName: 'Reset To Start',
      group: 'Actions',
      description: 'Puts the count back to Start Value, or reports Unchanged and leaves Count Changed silent when it is already there'
    },
    // :119-134 `set: … this._internal.startValue = Number(value)`
    startValue: {
      type: 'number',
      default: 0,
      coerce: 'js-number',
      displayName: 'Start Value',
      group: 'Values',
      description: 'Count to begin at and to return to on Reset; setting it announces a change on Count Changed at page load'
    },
    // :135-146, :147-158 `Number(value)`
    limitsMin: {
      type: 'number',
      default: 0,
      coerce: 'js-number',
      displayName: 'Min Value',
      group: 'Limits',
      description: 'Lowest count Decrease will reach, ignored unless Limits Enabled'
    },
    limitsMax: {
      type: 'number',
      default: 0,
      coerce: 'js-number',
      displayName: 'Max Value',
      group: 'Limits',
      description: 'Highest count Increase will reach, ignored unless Limits Enabled'
    },
    // :159-170 `value ? true : false`
    limitsEnabled: {
      type: 'boolean',
      default: false,
      coerce: 'js-boolean',
      displayName: 'Limits Enabled',
      group: 'Limits',
      description: 'Whether Min Value and Max Value bound the count; without it the count runs unbounded in both directions'
    }
  },

  outputs: {
    // :173-181 getter → `_internal.currentValue`
    currentCount: { type: 'number', from: (s) => s.count, displayName: 'Current Count', group: 'Values', description: 'The count as it stands' },
    // :182-187
    countChanged: {
      type: 'signal',
      displayName: 'Count Changed',
      group: 'Events',
      description: 'Fires after the count has moved, and also once at page load when Start Value is set'
    }
  }
}).on({
    // :46-59. Limits Enabled and already at Max → `unchanged`, nothing else (:50-53);
    // otherwise ++, flag currentCount, pulse countChanged, `done` (:55-58).
    increase: (s, i) =>
      i.limitsEnabled && s.count >= i.limitsMax
        ? { says: 'at Max Value with Limits Enabled', outcome: 'unchanged' }
        : { says: 'otherwise the count goes up by one', set: { count: s.count + 1 }, emit: ['countChanged'], outcome: 'done' },

    // :64-76, the mirror: at Min → `unchanged` (:66-69); otherwise -- (:71-75).
    decrease: (s, i) =>
      i.limitsEnabled && s.count <= i.limitsMin
        ? { says: 'at Min Value with Limits Enabled', outcome: 'unchanged' }
        : { says: 'otherwise the count goes down by one', set: { count: s.count - 1 }, emit: ['countChanged'], outcome: 'done' },

    // :107-117 (FH-022 slice 3). Already at Start Value → `unchanged`, Count Changed silent
    // (:109-112); otherwise back to start, pulse, `done` (:113-116). Note the comparison is
    // against `startValue`, not `0` — the docblock at :96-101 says why the obvious repair is wrong.
    reset: (s) =>
      s.count === s.start
        ? { says: 'already at Start Value', outcome: 'unchanged' }
        : { says: 'otherwise the count goes back to Start Value', set: { count: s.start }, emit: ['countChanged'], outcome: 'done' },

    // :125-133. The asymmetric setter: the FIRST Start Value also seeds the count and pulses
    // Count Changed ("once at page load", :186); later ones only move where Reset returns to.
    startValue: (s, v) =>
      s.startSeen
        ? { says: 'after the first: only where Reset returns to', set: { start: v } }
        : { says: 'the first one: the count starts there too', set: { start: v, count: v, startSeen: true }, emit: ['countChanged'] }
});
```


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
