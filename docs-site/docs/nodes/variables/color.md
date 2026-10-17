---
title: "Color"
---
Per-instance color holder: stores one color locally so many visual inputs can share a single editable source.

Color holds a single color value that belongs to this node instance alone, defaulting to '#f1f2f4'. The `value` input sets it (via the editor's color picker or a connection) and `savedValue` (Value) reads it back. While the `saveValue` (Set) signal input is unconnected, values written to `value` apply immediately; once `saveValue` is connected the node latches: incoming values are held pending and only applied when Set fires. Unlike the Boolean/Number/String holders it applies no cast — the value passes through unchanged. Browser-only; not available in cloud functions. `changed` fires only when the stored value actually changes; `stored` fires after every Set trigger.

## When to use it

Use it as a single source of truth for a color used in several places — wire `savedValue` to every `backgroundColor`, `color` or border input that should match, and edit one node to restyle them all. For project-wide theming prefer style colors; a String can also drive color inputs (any CSS color string casts), but Color gives you the picker.

## At a glance

| | |
|---|---|
| Category | Variables |
| Type name | `Color` |
| Available in | browser |
| SSR compatibility | safe |
| Provided by | `noodl-viewer-react` |
| Behaviour spec | version 2 ([under the hood](#under-the-hood)) |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `runOnChange-value` | Boolean | `true` | Whether a new value on Value re-runs this node. On by default; untick to make this input passive so only the control signal runs it |
| `treatEmptyAs` | Enum (`null`, `empty-string`) | `null` | Back-compat for graphs written before Variables were nullable. `null` (default) keeps a cleared value distinguishable from a real "". Choosing another option restores the pre-NDA-003 coercion for authors who relied on it. |
| `treatUnchangedAs` | Enum (`unchanged`, `done`) | `unchanged` | What this node reports when the action was valid and there was nothing to do. Unchanged (the default) keeps it a third outcome of its own. Done suits a project whose chains should carry on either way. Completed fires whatever this is set to. |
| `value` | Color | `#f1f2f4` | The empty-value contract (dev-docs/reference/EMPTY-VALUE-CONTRACT.md): `undefined` abstains and leaves the Variable's stored value untouched. `null` is a real value — it clears the Variable, is stored, and fires Changed. What "cleared" is stored as is controlled by `Treat empty as` (null by default). |

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
| `savedValue` | Color | — | Can be `null` — a cleared Variable (see `value`'s description) stores and emits null by default, not this type's zero value, unless `Treat empty as` says otherwise. |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `changed` | Signal | — | Fires whenever the stored value actually changed, however it was reached — including Value writing straight through under Run On Value Change. It is a value-level event, not the outcome of a Set |
| `completed` | Signal | — | Fires after every invocation, whatever the outcome — wire this to carry on regardless. Failure still fires and still carries its reason, so this cannot hide an error |
| `done` | Signal | — | Fires when a Set stored a value the Variable was not already holding |
| `unchanged` | Signal | — | Fires when a Set stored the value it already held, so nothing changed. ⚠️ With Value left ticked under Run On Value Change this is the common case, because Value has already stored by the time Set fires |

## Patterns

- One accent color: `savedValue` → several nodes' `backgroundColor`/`color` inputs, so a design tweak is one edit.
- Runtime theme switch: a Switch or States feeds `value`, and every connected visual updates together.

## Examples

**File picker with a shared accent color and a viewport-aware hint**

Three utility shapes in one small screen. A Color node is the single source of truth for the accent: it holds the design token `var(--primary)` — a colour port takes a token as readily as a hex, and the token survives the node — and its savedValue fans out to the title's text color and the button's background, so one edit restyles both. The Button's onClick fires Open File Picker's open — the dialog must come from a user gesture — and after a pick the file's name flows into a Text while `done` latches a Boolean (value pinned true) that reveals the result row as a level; closing the dialog with nothing chosen reports `unchanged` instead. Screen Resolution's width feeds an Expression (width < 600) whose boolean drives the compact hint's visibility, updating live as the window resizes.

## Related nodes

[Boolean](./boolean.md), [Number](./number.md), [String](./string.md), [Variable](../data/variable2.md), [Group](../visual/group.md), [Text](../visual/text.md)

## Code export

Exports to React. A project that uses it exports this node as React code.

[How export works](../../how-export-works.md) shows what an export writes, with a worked example.

## Under the hood

This node's behaviour is written down as an executable spec in `@nodegx/node-spec`, version 2. The spec is the reference the conformance tests grade the runtime against. Every rule in it cites the line of the runtime it was read from. The full spec is at the bottom of this page.

### What it depends on outside the node

Nothing. Its outputs depend only on its inputs and its own state.

### Starting state

```json
{
  "current": "#f1f2f4",
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

- a colour held in state, set from elsewhere: `const [accent, setAccent] = useState('#3366ff')`

## The full spec {#spec-source}

The spec's source, as the docs were generated. Helpers it imports live beside it in `packages/nodegx-node-spec/src`.

```ts title="packages/nodegx-node-spec/src/nodes/color.ts"
/**
 * Color — read from `packages/noodl-viewer-react/src/nodes/std-library/variables/color.ts` on
 * 2026-09-30 (NSP-011). A viewer-provided node built from the runtime's variablebase (:4, :7);
 * the runtime target registers it from the viewer's source (conformance.test.ts). The family's
 * rules are in variable-base.ts; this file is what color.ts supplies.
 *
 * `cast` is the identity (:20-22): "a colour needs no coercion". So a Color variable stores
 * WHATEVER arrives — a number, an object — and publishes it on a `color` port. (node.ts
 * `setInputValue` :431-432 would resolve a colour through `context.styles`, but only for a port
 * whose type is the STRING `'color'`; this port's type is the object `{ name: 'color' }` (:14-16,
 * variablebase.ts :142), so nothing resolves.)
 */

import { defineNode } from '../spec';
import { afterSets, CHANGED, onSet, onValue, SAVED_VALUE_DESCRIPTION, VARIABLE_OUTCOMES, variableInputs, variableState, type VariableArgs } from './variable-base';

/** :7-27 — startValue '#f1f2f4' (:10); `cast` identity (:20-22); empty options null / '' (:23-26) */
export const COLOR: VariableArgs & { type: 'color' } = {
  type: 'color',
  startValue: '#f1f2f4',
  cast: (value) => value,
  emptyOptions: [
    { value: 'null', label: 'Null (default)', coerce: null },
    { value: 'empty-string', label: 'Empty string ("")', coerce: '' }
  ]
};

export const ColorVariable = defineNode({
  type: 'Color',
  // v2 (P109 ISL-027, row C5 ruled "Start with no remembered value"): a first Value of 0 is stored and fires
  // Changed like any other value, and a Set before any Value reports Unchanged. v1 ignored a first 0 (it equalled
  // a hidden seed of 0) and a Set before any Value stored that seed and reported Done.
  version: 2,
  source: 'packages/noodl-viewer-react/src/nodes/std-library/variables/color.ts',
  // NSP-018 — the hand-written code this node replaces (read by nothing yet; `spec-ledger` counts it)
  idioms: [
    { says: 'a colour held in state, set from elsewhere', example: 'const [accent, setAccent] = useState(\'#3366ff\')' }
  ],
  state: variableState(COLOR),
  inspect: (s) => String(s.current),
  outcomes: VARIABLE_OUTCOMES,
  inputs: variableInputs(COLOR),
  outputs: {
    savedValue: { type: 'color', from: (s) => s.current, displayName: 'Value', group: 'Values', description: SAVED_VALUE_DESCRIPTION },
    changed: CHANGED
  }
}).on(
  { value: (s, v, i) => onValue(COLOR, s, v, i), saveValue: onSet },
  { afterInputs: (s, i) => afterSets(COLOR, s, i) }
);
```


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
