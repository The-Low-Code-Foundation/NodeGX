---
title: "Value Changed"
---
Turns value changes into events: fires a signal every time its input receives a different value.

Value Changed watches one input of any type (`value`, displayed as Input) and fires the `valueChanged` (Value Changed) signal each time the incoming value differs from the last one it saw — including the very first value it receives. Comparison uses strict equality, so for objects and arrays a change means a different reference, not a mutation of the same object. It is the bridge from the value world (levels) to the signal world (events).

## When to use it

Use it when something must happen at the moment data changes: restart a debounce Timer while the user types, re-run a Function when a selection changes, or trigger a save when a field updates. If you only need the value itself downstream, connect the value directly — no node needed. If you care about a boolean becoming true specifically, connect the boolean straight to a signal input (rising-edge trigger) instead.

## At a glance

| | |
|---|---|
| Category | Logic |
| Type name | `Value Changed` |
| Available in | browser |
| SSR compatibility | safe |
| Provided by | `noodl-viewer-react` |
| Behaviour spec | version 1 ([under the hood](#under-the-hood)) |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `value` | * | — | Value to watch; changes are detected by identity, so editing an Object or Array in place is not a change here |

### What each input does

**Input** (`value`)

- the same value as the last one (by identity): nothing → Value Changed stays silent
- a different value, or the first one → Value Changed

## Outputs

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `valueChanged` | Signal | — | Fires when Input becomes a different value, including the first time a value arrives |

## Patterns

- A text input's `text` → `value`, `valueChanged` → a Timer's `restart`: debounce — the Timer only finishes once typing pauses.
- `valueChanged` → an Event Sender's `sendEvent`: broadcast that a piece of state changed.

## Watch out for

- Using it to detect a boolean turning true — it also fires on true→false. Connect the boolean directly to the target signal input (edge-triggered) or use Condition.

## Examples

**Debounced autosave with timestamped status**

The debounce idiom: every keystroke fires Value Changed, whose signal restarts a 1.5-second Timer — the save only runs when the user pauses. The save Function stamps the moment; Date To String formats it, Unique Id issues a save id shortened by Substring, and String Format assembles the status line. Signals sequence the flow; values shape the display.

## Related nodes

[Condition](./condition.md), [Switch](./switch.md), [Delay](../utilities/timer.md), [Expression](../custom-code/expression.md)

## Code export

Exports to React. A project that uses it exports this node as React code.

## Under the hood

This node's behaviour is written down as an executable spec in `@nodegx/node-spec`, version 1. The spec is the reference the conformance tests grade the runtime against. Every rule in it cites the line of the runtime it was read from. The full spec is at the bottom of this page.

### What it depends on outside the node

Nothing. Its outputs depend only on its inputs and its own state.

### Starting state

```json
{
  "count": 0
}
```

### The code it replaces

What you would write by hand instead:

- an effect that runs when a value changes: `useEffect(() => onChange(value), [value])`
- comparing against the previous value: `if (value !== prev.current) { prev.current = value; onChange() }`

## The full spec {#spec-source}

The spec's source, as the docs were generated. Helpers it imports live beside it in `packages/nodegx-node-spec/src`.

```ts title="packages/nodegx-node-spec/src/nodes/value-changed.ts"
/**
 * Value Changed — read from `packages/noodl-viewer-react/src/nodes/std-library/valuechanged.ts` on
 * 2026-09-30 (NSP-011). A viewer-provided node: the runtime target registers it from the viewer's
 * source (conformance.test.ts), the viewer's `register-nodes.js` :56 being where the app does.
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * "Defined by equality" (NSP-011 §3): the rule is `===` on the raw value (:32). So: an object is a
 * change unless it is the SAME reference (the description says so); `NaN` is a change every time
 * (`NaN === NaN` is false); `-0` after `0` is not a change; and a first arrival of `undefined` is
 * NOT a change (`lastValue` starts `undefined`, :15) — the one case where "including the first
 * time it arrives" (:47) is not true. The canonicaliser (NSP-002) tags `NaN` and `-0` so a trace
 * can tell them apart; nothing here needed changing there.
 *
 * ⚠️ Not this node's, but on its wire: node.ts `setInputValue` (:410-420) merges a later value
 * into a `{ value, unit }` object the port once held, so `2` after `{ value: 1, unit: 'px' }`
 * arrives as a NEW object `{ value: 2, unit: 'px' }` — and a repeated `2` fires again every time.
 * The spec models the node; that port rule is NSP-011 §6 row C6 and R7, counted by the runner.
 */

import { defineNode } from '../spec';

export const ValueChanged = defineNode({
  type: 'Value Changed',
  version: 1,
  source: 'packages/noodl-viewer-react/src/nodes/std-library/valuechanged.ts',
  // NSP-018 — the hand-written code this node replaces (read by nothing yet; `spec-ledger` counts it)
  idioms: [
    { says: 'an effect that runs when a value changes', example: 'useEffect(() => onChange(value), [value])' },
    { says: 'comparing against the previous value', example: 'if (value !== prev.current) { prev.current = value; onChange() }' }
  ],

  // initialize (:14-17): lastValue undefined, changeCount 0
  state: { last: undefined as unknown, count: 0 },
  // :18-23
  inspect: (s) => (s.count ? 'Triggered ' + s.count + (s.count === 1 ? ' time' : ' times') : 'Not triggered'),

  inputs: {
    // :25-40 — raw, `===` against the last (:32)
    value: {
      type: '*',
      coerce: 'none',
      displayName: 'Input',
      group: 'Values',
      description: 'Value to watch; changes are detected by identity, so editing an Object or Array in place is not a change here'
    }
  },

  outputs: {
    // :43-48
    valueChanged: {
      type: 'signal',
      displayName: 'Value Changed',
      group: 'Events',
      description: 'Fires when Input becomes a different value, including the first time a value arrives'
    }
  }
}).on({
  // :31-39 — same (`===`) → nothing; else count, pulse, remember
  value: (s, v) =>
    s.last === v
      ? { says: 'the same value as the last one (by identity): nothing' }
      : { says: 'a different value, or the first one', set: { last: v, count: s.count + 1 }, emit: ['valueChanged'] }
});
```


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
