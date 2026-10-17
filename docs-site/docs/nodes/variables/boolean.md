---
title: "Boolean"
---
Per-instance true/false holder: stores one boolean locally, optionally latching new values until a Set signal fires.

Boolean holds a single true/false value that belongs to this node instance alone — it is not named or shared (for an app-wide named value use Variable2). The `value` input sets it and `savedValue` (Value) reads it back. While the `saveValue` (Set) signal input is unconnected, values written to `value` apply immediately; once `saveValue` is connected the node latches: incoming values are held pending and only applied when Set fires. Incoming values are cast with JavaScript Boolean(). `changed` fires only when the stored value actually changes; `stored` fires after every Set trigger, changed or not.

## When to use it

Use it for a local flag inside one component — 'has clicked', 'panel expanded' — especially the latch shape (pin `value` to true, fire Set from a signal) that turns a momentary signal into a level. For state shared across components use Variable2 + Set Variable; for multi-state logic use States.

## At a glance

| | |
|---|---|
| Category | Variables |
| Type name | `Boolean` |
| Available in | browser, cloud |
| SSR compatibility | safe |
| Provided by | `noodl-runtime` |
| Behaviour spec | version 2 ([under the hood](#under-the-hood)) |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `runOnChange-value` | Boolean | `true` | Whether a new value on Value re-runs this node. On by default; untick to make this input passive so only the control signal runs it |
| `treatEmptyAs` | Enum (`null`, `false`) | `null` | Back-compat for graphs written before Variables were nullable. `null` (default) keeps a cleared value distinguishable from a real false. Choosing another option restores the pre-NDA-003 coercion for authors who relied on it. |
| `treatUnchangedAs` | Enum (`unchanged`, `done`) | `unchanged` | What this node reports when the action was valid and there was nothing to do. Unchanged (the default) keeps it a third outcome of its own. Done suits a project whose chains should carry on either way. Completed fires whatever this is set to. |
| `value` | Boolean | `false` | The empty-value contract (dev-docs/reference/EMPTY-VALUE-CONTRACT.md): `undefined` abstains and leaves the Variable's stored value untouched. `null` is a real value — it clears the Variable, is stored, and fires Changed. What "cleared" is stored as is controlled by `Treat empty as` (null by default). |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `saveValue` | Signal | — | Stores the latest value now. This is additional to Value storing on change; untick Value under Run On Value Change to stop that |

### What each input does

**Value** (`value`)

- undefined: ignored → Changed stays silent
- the same as the last one, or Run On Value Change unticked: held for the next Set → Changed stays silent
- a new value that converts to what is already stored: held, nothing changes → Changed stays silent
- a new value, with Run On Value Change ticked: stored straight away (an empty one as Treat Empty As says) → Changed

**Set** (`saveValue`)

- always: at the end of the frame the last Value is stored — Changed and Done if that changed it, otherwise Unchanged (or what Treat Unchanged As says)

## Outputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `savedValue` | Boolean | — | Can be `null` — a cleared Variable (see `value`'s description) stores and emits null by default, not this type's zero value, unless `Treat empty as` says otherwise. |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `changed` | Signal | — | Fires whenever the stored value actually changed, however it was reached — including Value writing straight through under Run On Value Change. It is a value-level event, not the outcome of a Set |
| `completed` | Signal | — | Fires after every invocation, whatever the outcome — wire this to carry on regardless. Failure still fires and still carries its reason, so this cannot hide an error |
| `done` | Signal | — | Fires when a Set stored a value the Variable was not already holding |
| `unchanged` | Signal | — | Fires when a Set stored the value it already held, so nothing changed. ⚠️ With Value left ticked under Run On Value Change this is the common case, because Value has already stored by the time Set fires |

## Patterns

- Latch a signal into a level: set `value` to true in parameters, wire the signal to `saveValue`, and read `savedValue` — a sticky 'this has happened' flag.
- `savedValue` → Condition `condition` to branch signal flow on the stored flag.

## Watch out for

- Using two Boolean nodes in different components to 'share' a flag — each instance has its own value and they never sync. Use Variable2 for shared state.

## Examples

**Click counter with a latched Number and a Boolean flag**

The canonical per-instance counter: a Number node's savedValue feeds an Expression (count + 1) whose result loops back into the Number's value input. Because saveValue (Set) is connected, the incremented value is only committed when the Button's onClick fires — the latch is what makes the feedback loop safe. The count renders directly in a Text (number casts to string on delivery). A Boolean node shows the latch-a-signal-into-a-level shape: its value is pinned to true in parameters, the same click fires its Set, and its savedValue permanently reveals the hint text — a level, unlike the momentary click signal.

## Related nodes

[Number](./number.md), [String](./string.md), [Color](./color.md), [Variable](../data/variable2.md), [Condition](../logic/condition.md), [Switch](../logic/switch.md), [States](../animation/states.md)

## Code export

Exports to React. A project that uses it exports this node as React code.

## Under the hood

This node's behaviour is written down as an executable spec in `@nodegx/node-spec`, version 2. The spec is the reference the conformance tests grade the runtime against. Every rule in it cites the line of the runtime it was read from. The full spec is at the bottom of this page.

### What it depends on outside the node

Nothing. Its outputs depend only on its inputs and its own state.

### Starting state

```json
{
  "current": false,
  "hasBeenSet": false,
  "sets": 0
}
```

### How inputs are converted

Inputs not listed arrive as sent.

| Input | Conversion | What it does |
|---|---|---|
| Value (`runOnChange-value`) | `not-false` | only an explicit `false` turns it off; no value, `0` and `""` leave it on |

### How actions report back

Each time Set is triggered, the node reports exactly one of **Done** or **Unchanged**.

### The code it replaces

What you would write by hand instead:

- a boolean held in state, set from elsewhere: `const [done, setDone] = useState(false)`

## The full spec {#spec-source}

The spec's source, as the docs were generated. Helpers it imports live beside it in `packages/nodegx-node-spec/src`.

```ts title="packages/nodegx-node-spec/src/nodes/boolean.ts"
/**
 * Boolean — read from `packages/noodl-runtime/src/nodes/std-library/variables/boolean.ts` on
 * 2026-09-30 (NSP-011). The family's rules are in variable-base.ts; this file is the four lines
 * boolean.ts supplies.
 */

import { defineNode } from '../spec';
import { afterSets, CHANGED, onSet, onValue, SAVED_VALUE_DESCRIPTION, VARIABLE_OUTCOMES, variableInputs, variableState, type VariableArgs } from './variable-base';

/** :7-23 — startValue false (:10); `cast` is `Boolean(value)` (:16-18); empty options null / false (:19-22) */
export const BOOLEAN: VariableArgs & { type: 'boolean' } = {
  type: 'boolean',
  startValue: false,
  cast: (value) => Boolean(value),
  emptyOptions: [
    { value: 'null', label: 'Null (default)', coerce: null },
    { value: 'false', label: 'False', coerce: false }
  ]
};

export const BooleanVariable = defineNode({
  type: 'Boolean',
  // v2 (P109 ISL-027, row C5 ruled "Start with no remembered value"): a first Value of 0 is stored and fires
  // Changed like any other value, and a Set before any Value reports Unchanged. v1 ignored a first 0 (it equalled
  // a hidden seed of 0) and a Set before any Value stored that seed and reported Done.
  version: 2,
  source: 'packages/noodl-runtime/src/nodes/std-library/variables/boolean.ts',
  // NSP-018 — the hand-written code this node replaces (read by nothing yet; `spec-ledger` counts it)
  idioms: [
    { says: 'a boolean held in state, set from elsewhere', example: 'const [done, setDone] = useState(false)' }
  ],
  state: variableState(BOOLEAN),
  inspect: (s) => String(s.current),
  outcomes: VARIABLE_OUTCOMES,
  inputs: variableInputs(BOOLEAN),
  outputs: {
    savedValue: { type: 'boolean', from: (s) => s.current, displayName: 'Value', group: 'Values', description: SAVED_VALUE_DESCRIPTION },
    changed: CHANGED
  }
}).on(
  { value: (s, v, i) => onValue(BOOLEAN, s, v, i), saveValue: onSet },
  { afterInputs: (s, i) => afterSets(BOOLEAN, s, i) }
);
```


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
