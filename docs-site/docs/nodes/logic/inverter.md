---
title: "Inverter"
---
Logical NOT: outputs the boolean opposite of its input.

Inverter takes one boolean `value` (Value) input and exposes its negation on the `result` (Result) value output. Until the input has received a value, the result is undefined rather than true — the node does not invent a state before it has one. Any change to the input immediately updates the result. It has no signals and no configuration.

## When to use it

Use it wherever you have the boolean you need, but backwards — e.g. a Switch's `state` drives a panel's `visible` and, inverted, a placeholder's `visible`. If the boolean comes from a Condition, prefer its built-in `isfalse` output and skip the Inverter. For combining several booleans, use And/Or or an Expression.

## At a glance

| | |
|---|---|
| Category | Logic |
| Type name | `Inverter` |
| Available in | browser, cloud |
| SSR compatibility | safe |
| Provided by | `noodl-runtime` |
| Behaviour spec | version 1 ([under the hood](#under-the-hood)) |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `value` | Boolean | — | Value to negate; anything falsy counts as false, and leaving it unset keeps Result unset too |

### What each input does

**Value** (`value`)

- always: Result becomes its opposite

## Outputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `result` | Boolean | — | The opposite of Value, and unset rather than true while Value has never been set |

## Patterns

- A 'is loading' boolean → Inverter → a button's `enabled`: disable actions while busy.
- Switch `state` → Inverter → the collapsed view's `visible`: show exactly one of two views from a single boolean.

## Watch out for

- Chaining Condition → Inverter to get 'is false' — Condition already outputs `isfalse` directly.

## Examples

**Toggle a details panel with a self-labelling button**

The standard show/hide toggle: one button flips a Switch, and everything else derives from the Switch's boolean `state` as levels — the details Group's visibility directly, the summary text's visibility through an Inverter (visible only while collapsed), and the button's own label through Boolean To String so the button always names what it will do next. Note the split of flow kinds: `onClick` → `flip` is a signal (momentary), while every `state`-derived wire is a value that holds its level.

**The controlled value: the same name goes in, comes out, and says when it moved**

The most common shape on the shelf, and the one an authored component usually forgets. `value` arrives on `Component Inputs`, the same name leaves on `Component Outputs`, and a `valueChanged` signal leaves beside it — a parent that can only set a value and never read it back has to keep its own copy and hope. `Counter` holds the number: `startValue` seeds it from the instance, `increase`/`decrease` are signals from the two buttons, and `limitsEnabled` with `limitsMin`/`limitsMax` means the clamp lives in one node instead of in two Function nodes that will disagree. 🔴 The `disabled` flag is wired through an `Inverter` into BOTH buttons' `enabled`, not just onto the label's colour: a flag that changes how a component looks but not what it accepts is a component that can be told one thing and do another. ⚠️ `logic-quantity-stepper` builds the same buttons around the same `Counter` and is about the value-shaping nodes between the count and the screen — `String Format`, `String Mapper`, `Number Remapper`; it has no interface at all, and the two are worth reading together. The page here shows the other half of the contract — it reads `value` back into a readout and acts on `valueChanged` — which is what makes this different from a component that merely renders a number.

**Check an email is well-formed and not already taken**

Sign-up validation as a chain of small truths rather than one function: an `Expression` says the field is non-empty, a `JavaScriptFunction` says it looks like an address, and a `DbCollection2` query says nobody has it yet — and an `And` node combines them into the one boolean the button enables on. The `Timer` in front of the query is the detail worth copying: it debounces, so the database is asked once the typing stops instead of once per keystroke. ⚠️ The two `Inverter` nodes read as clutter until you notice what they buy — 'no user came back' is the success case here, and inverting it keeps every input to the `And` meaning 'this is fine', which is what makes the combination readable at all.

## Related nodes

[And](./and.md), [Or](./or.md), [Condition](./condition.md), [Switch](./switch.md)

## Code export

Exports to React. A project that uses it exports this node as React code.

## Under the hood

This node's behaviour is written down as an executable spec in `@nodegx/node-spec`, version 1. The spec is the reference the conformance tests grade the runtime against. Every rule in it cites the line of the runtime it was read from. The full spec is at the bottom of this page.

### What it depends on outside the node

Nothing. Its outputs depend only on its inputs and its own state.

### Starting state

```json
{}
```

### The code it replaces

What you would write by hand instead:

- a negated flag: `const hidden = !visible`

## The full spec {#spec-source}

The spec's source, as the docs were generated. Helpers it imports live beside it in `packages/nodegx-node-spec/src`.

```ts title="packages/nodegx-node-spec/src/nodes/inverter.ts"
/**
 * Inverter — read from `packages/noodl-runtime/src/nodes/std-library/inverter.ts` on 2026-09-30
 * (NSP-011).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * The one thing worth a sentence: the `undefined` passthrough (:5-9). An Inverter that has never
 * received a value reports `undefined`, not `true` — so nothing is published until the first
 * value (C3), and the description says so.
 */

import { defineNode } from '../spec';

/** :10-15 — `undefined` stays `undefined`; everything else is `!value`. */
export function invert(value: unknown): boolean | undefined {
  return value === undefined ? undefined : !value;
}

export const Inverter = defineNode({
  type: 'Inverter',
  version: 1,
  source: 'packages/noodl-runtime/src/nodes/std-library/inverter.ts',
  // NSP-018 — the hand-written code this node replaces (read by nothing yet; `spec-ledger` counts it)
  idioms: [
    { says: 'a negated flag', example: 'const hidden = !visible' }
  ],

  // initialize (:27-29): currentValue undefined
  state: { value: undefined as unknown },
  // :30-32
  inspect: (s) => String(invert(s.value)),

  inputs: {
    // :34-45 — the setter stores what arrived (:42); truthiness is applied at read (:14)
    value: {
      type: 'boolean',
      coerce: 'none',
      displayName: 'Value',
      group: 'Values',
      description: 'Value to negate; anything falsy counts as false, and leaving it unset keeps Result unset too'
    }
  },

  outputs: {
    // :48-56 getter → `invert(currentValue)`
    result: {
      type: 'boolean',
      from: (s) => invert(s.value),
      displayName: 'Result',
      group: 'Values',
      description: 'The opposite of Value, and unset rather than true while Value has never been set'
    }
  }
}).on({
  // :41-44 — store, flag `result` (every write, even the same value; the wire dedups)
  value: (_s, v) => ({ says: 'always: Result becomes its opposite', set: { value: v } })
});
```


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
