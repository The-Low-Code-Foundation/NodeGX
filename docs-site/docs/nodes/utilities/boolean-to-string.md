---
title: "Boolean To String"
---
Picks between two strings based on a boolean: outputs String for true or String for false.

Boolean To String selects one of two configured strings using the boolean `input` (Selector): while the selector is true, `currentValue` (Current Value) is `trueString` (String for true); otherwise it is `falseString` (String for false). The output updates whenever the selector or the currently selected string changes, and `inputChanged` (Selector Changed) fires as a signal each time the selector itself flips. Both strings are usually set as parameters but can also be connected.

## When to use it

Use it to turn app state into UI copy: a toggle button's label, an on/off status caption, a yes/no cell. For mapping more than two cases, use String Mapper (string keys) or States; for text with variable parts inside it, use String Format.

## At a glance

| | |
|---|---|
| Category | Utilities |
| Type name | `Boolean To String` |
| Available in | browser, cloud |
| SSR compatibility | safe |
| Provided by | `noodl-runtime` |
| Behaviour spec | version 2 ([under the hood](#under-the-hood)) |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `falseString` | String | — | Text published on Current Value while Selector is false |
| `input` | Boolean | — | Which of the two strings to publish: false, 0, empty text or no value picks String for false; anything else picks String for true |
| `trueString` | String | — | Text published on Current Value while Selector is true |

### What each input does

**String for true** (`trueString`)

- the same text: nothing, not even a send
- new text: kept, and sent on Current Value if Selector picks String for true

**String for false** (`falseString`)

- the same text: nothing, not even a send
- new text: kept, and sent on Current Value if Selector picks String for false

**Selector** (`input`)

- the same value: nothing, not even a send → Selector Changed stays silent
- a different value, even one that picks the same string: Current Value follows → Selector Changed

## Outputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `currentValue` | String | — | String for true or String for false, whichever Selector currently picks |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `inputChanged` | Signal | — | Fires when Selector flips, after Current Value has been updated |

## Patterns

- Switch `state` → `input`, `currentValue` → the same toggle button's `label`: the button always names the action it will perform next.

## Examples

**Toggle a details panel with a self-labelling button**

The standard show/hide toggle: one button flips a Switch, and everything else derives from the Switch's boolean `state` as levels — the details Group's visibility directly, the summary text's visibility through an Inverter (visible only while collapsed), and the button's own label through Boolean To String so the button always names what it will do next. Note the split of flow kinds: `onClick` → `flip` is a signal (momentary), while every `state`-derived wire is a value that holds its level.

## Related nodes

[String Mapper](./string-mapper.md), [String Format](../string-manipulation/string-format.md), [Switch](../logic/switch.md), [Condition](../logic/condition.md), [States](../animation/states.md)

## Code export

Exports to React. A project that uses it exports this node as React code.

## Under the hood

This node's behaviour is written down as an executable spec in `@nodegx/node-spec`, version 2. The spec is the reference the conformance tests grade the runtime against. Every rule in it cites the line of the runtime it was read from. The full spec is at the bottom of this page.

### What it depends on outside the node

Nothing. Its outputs depend only on its inputs and its own state.

### Starting state

```json
{
  "t": "",
  "f": ""
}
```

### The code it replaces

What you would write by hand instead:

- a ternary turning a flag into text: `const label = isOpen ? 'Close' : 'Open'`

## The full spec {#spec-source}

The spec's source, as the docs were generated. Helpers it imports live beside it in `packages/nodegx-node-spec/src`.

```ts title="packages/nodegx-node-spec/src/nodes/boolean-to-string.ts"
/**
 * Boolean To String — read from `packages/noodl-runtime/src/nodes/std-library/booleantostring.ts`
 * on 2026-09-30 (NSP-011).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * Two readers of `input` that do not agree with each other, both carried: the guard (:71) is
 * `===` on the RAW value — so `1` after `true` is a change and fires Selector Changed, and `NaN`
 * after `NaN` fires every time — while the getter (:86) applies truthiness: `'yes'`, `1`, `{}` pick
 * String for true. The port's description said "anything that is not true counts as false" until
 * P109 ISL-033 (NSP-011 §6 row D6, ruled "Correct the words"); it now names the falsy values.
 */

import { defineNode } from '../spec';

export const BooleanToString = defineNode({
  type: 'Boolean To String',
  // v2 (NSP-013 s12): writing String for true or String for false with the value it already holds
  // (`===`) does nothing — nothing stored, nothing sent. v1 stored and sent it. Visible only on a frame
  // that has sent nothing yet (the scenario "String for false = '' at mount …"). Note `===`: NaN never
  // equals itself, so NaN twice is sent twice; `undefined` after the initial '' is a change.
  version: 2,
  source: 'packages/noodl-runtime/src/nodes/std-library/booleantostring.ts',
  // NSP-018 — the hand-written code this node replaces (read by nothing yet; `spec-ledger` counts it)
  idioms: [
    { says: 'a ternary turning a flag into text', example: 'const label = isOpen ? \'Close\' : \'Open\'' }
  ],

  // initialize (:28-35): trueString '', falseString ''; `currentInput` is never seeded (:20, :73).
  // `inputs`, `currentSelectedIndex`, `indexChanged` (:29-31) are written there and read nowhere
  // (the docblock at :8-11 says so) — not carried.
  state: { sel: undefined as unknown, t: '' as unknown, f: '' as unknown },

  inputs: {
    // :37-49 — stored raw (:44) behind the :43 same-value guard (`===` against what is held)
    trueString: {
      type: 'string',
      coerce: 'none',
      displayName: 'String for true',
      group: 'Values',
      description: 'Text published on Current Value while Selector is true'
    },
    // :51-63
    falseString: {
      type: 'string',
      coerce: 'none',
      displayName: 'String for false',
      group: 'Values',
      description: 'Text published on Current Value while Selector is false'
    },
    // :65-77 — raw; `===` guard at :71
    input: {
      type: 'boolean',
      coerce: 'none',
      displayName: 'Selector',
      group: 'Values',
      description: 'Which of the two strings to publish: false, 0, empty text or no value picks String for false; anything else picks String for true'
    }
  },

  outputs: {
    // :80-88 getter → `currentInput ? trueString : falseString` — truthiness
    currentValue: {
      type: 'string',
      from: (s) => (s.sel ? s.t : s.f),
      displayName: 'Current Value',
      group: 'Values',
      description: 'String for true or String for false, whichever Selector currently picks'
    },
    // :89-94
    inputChanged: {
      type: 'signal',
      displayName: 'Selector Changed',
      group: 'Events',
      description: 'Fires when Selector flips, after Current Value has been updated'
    }
  }
}).on({
  // :42-49 — the same value (`===`, :43) does nothing, not even a send; otherwise store, and the
  // output is SENT only while this is the selected string (:46-48). Which writes send is what a
  // wire holds when the output ends a frame `undefined` (spec.ts `send`). ⚠️ s4 dropped the :43
  // guard as "the wire dedups" — it does not on a frame that has sent nothing yet: `''` at mount
  // equals the initial `''` and sends nothing, so a Selector flip to a missing string in the same
  // frame leaves the wire EMPTY, not `''` (found s12 by generated seed 799069363 once the daily
  // rotation stopped replaying one corpus, NSP-013 §6.1b T4).
  trueString: (s, v) =>
    s.t === v
      ? { says: 'the same text: nothing, not even a send', send: [] }
      : { says: 'new text: kept, and sent on Current Value if Selector picks String for true', set: { t: v }, send: s.sel ? ['currentValue'] : [] },
  // :56-63 — the mirror (:57, :60-62)
  falseString: (s, v) =>
    s.f === v
      ? { says: 'the same text: nothing, not even a send', send: [] }
      : { says: 'new text: kept, and sent on Current Value if Selector picks String for false', set: { f: v }, send: s.sel ? [] : ['currentValue'] },
  // :70-76 — same raw value (`===`) → nothing, not even a send; otherwise store, flag, pulse
  input: (s, v) =>
    s.sel === v
      ? { says: 'the same value: nothing, not even a send', send: [] }
      : { says: 'a different value, even one that picks the same string: Current Value follows', set: { sel: v }, emit: ['inputChanged'] }
});
```


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
