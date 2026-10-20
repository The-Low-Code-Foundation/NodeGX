---
title: "Number Remapper"
---
Linearly maps a number from one range to another, optionally clamped — e.g. 0–100 progress to 0–1 opacity.

Number Remapper converts `inputValue` (Input Value) from the input range [`minInputValue` (Input Minimum), `maxInputValue` (Input Maximum)] to the output range [`minOutputValue` (Output Minimum, default 0), `maxOutputValue` (Output Maximum, default 1)] with straight linear interpolation, writing the result to the `remappedValue` (Remapped Value) number output. With `clamp` (Clamp Output, default true) the normalized position is limited to 0…1 so the output never leaves the output range; with clamping off, values outside the input range extrapolate. Ranges may be inverted (min greater than max) to reverse direction. If the input range is empty (minimum equals maximum) the output is pinned to `minOutputValue`. Every input recomputes the output immediately.

## When to use it

The no-code way to scale a value between domains: a count to a progress-bar width, a scroll position to an opacity, a slider value to a rotation. For non-linear curves or multi-input math use Expression or a Function.

## At a glance

| | |
|---|---|
| Category | Math |
| Type name | `Number Remapper` |
| Available in | browser, cloud |
| SSR compatibility | safe |
| Provided by | `noodl-runtime` |
| Behaviour spec | version 1 ([under the hood](#under-the-hood)) |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `clamp` | Boolean | `true` | Holds the result inside the output range when Input Value falls outside the input range, instead of extrapolating |
| `inputValue` | Number | `0` | Number to remap, read against Input Minimum and Input Maximum |
| `maxInputValue` | Number | `1` | Value of Input Value that maps to Output Maximum; set equal to Input Minimum and the result is pinned at Output Minimum for every input |
| `maxOutputValue` | Number | `1` | Result when Input Value is at Input Maximum |
| `minInputValue` | Number | `0` | Value of Input Value that maps to Output Minimum |
| `minOutputValue` | Number | `0` | Result when Input Value is at Input Minimum |

### What each input does

**Input Value** (`inputValue`)

- always: Remapped Value follows

**Input Minimum** (`minInputValue`)

- always: Remapped Value follows

**Input Maximum** (`maxInputValue`)

- always: Remapped Value follows

**Output Minimum** (`minOutputValue`)

- always: Remapped Value follows

**Output Maximum** (`maxOutputValue`)

- always: Remapped Value follows

**Clamp Output** (`clamp`)

- always: Remapped Value follows

## Outputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `remappedValue` | Number | — | Input Value rescaled from the input range onto the output range |

## Patterns

- Counter `currentCount` → `inputValue` with the output range sized in pixels → a Group's `width`: a value-driven fill bar.
- Scroll position → `inputValue`, output range 1…0 → `opacity`: fade an element out as the user scrolls.

## Watch out for

- Leaving Input Minimum and Input Maximum both at 0 — the output sits at Output Minimum no matter what comes in; set a real input range.

## Examples

**Quantity stepper: Counter with remapped and formatted readouts**

Two buttons drive a Counter up and down within limits. The count feeds three displays: a String Format caption ('{count} items'), a String Mapper that maps special values to words (0 → 'empty'), and a Number Remapper converting the 0–10 range into 0.2–1 opacity for a fill indicator. Counter holds the state; the display nodes are pure value-shaping between it and the UI. ⚠️ This component has no `Component Inputs` or `Component Outputs`: nothing outside it can set the starting quantity or read the count back, so it is a demonstration of the value-shaping nodes rather than a part a page can use. `comp-controlled-quantity-stepper` is the same idea with an interface — `value` in, `value` and `valueChanged` out.

## Related nodes

[Counter](./counter.md), [Expression](../custom-code/expression.md), [Animation](../animation/animation.md), [Number](../variables/number.md)

## Code export

Exports to React. A project that uses it exports this node as React code.

[How export works](../../how-export-works.md) shows what an export writes, with a worked example.

## Under the hood

This node's behaviour is written down as an executable spec in `@nodegx/node-spec`, version 1. The spec is the reference the conformance tests grade the runtime against. Every rule in it cites the line of the runtime it was read from. The full spec is at the bottom of this page.

### What it depends on outside the node

Nothing. Its outputs depend only on its inputs and its own state.

### Starting state

```json
{
  "input": 0,
  "minIn": 0,
  "maxIn": 1,
  "minOut": 0,
  "maxOut": 1,
  "clamp": true
}
```

### How inputs are converted

Inputs not listed arrive as sent.

| Input | Conversion | What it does |
|---|---|---|
| Clamp Output (`clamp`) | `js-boolean` | any truthy value is `true`, anything else `false` |

### The code it replaces

What you would write by hand instead:

- mapping a number from one range to another: `outMin + ((v - inMin) * (outMax - outMin)) / (inMax - inMin)`

## The full spec {#spec-source}

The spec's source, as the docs were generated. Helpers it imports live beside it in `packages/nodegx-node-spec/src`.

```ts title="packages/nodegx-node-spec/src/nodes/number-remapper.ts"
/**
 * Number Remapper — read from `packages/noodl-runtime/src/nodes/std-library/numberremapper.ts` on
 * 2026-09-30 (NSP-011).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * Every setter stores the RAW value and recomputes (:64-134); nothing converts. So the arithmetic
 * at :154-166 runs on whatever arrived — `'5'` subtracts like a number, `{}` makes `NaN`, and the
 * degenerate guard at :154 is `===` on the raw values (`'1'` and `1` are not equal, so the
 * division happens). The spec keeps the same operations on the same raw values, so the two agree
 * on every cross-type value the generator sends. NDA-012's default of 1 for Input Maximum (:25-46)
 * is what makes a fresh node pass its input through instead of flatlining.
 *
 * The census flagged this node for units (C10). Its ports are `number`, not `dimension`, and the
 * runtime's unit merge (node.ts setInputValue :410-420) only applies once a port has held a
 * `{ value, unit }` object — which a number wire never delivers. Units do not reach this node.
 */

import { defineNode } from '../spec';

export type RemapState = {
  input: unknown;
  minIn: unknown;
  maxIn: unknown;
  minOut: unknown;
  maxOut: unknown;
  clamp: boolean;
};

/** :149-168 `_calculateNewOutputValue`, on the raw values. */
export function remap(s: Readonly<RemapState>): number {
  let n: number;
  if (s.maxIn === s.minIn) n = 0;
  else n = ((s.input as number) - (s.minIn as number)) / ((s.maxIn as number) - (s.minIn as number));
  if (s.clamp) n = Math.max(0, Math.min(1, n));
  return (s.minOut as number) + n * ((s.maxOut as number) - (s.minOut as number));
}

export const NumberRemapper = defineNode({
  type: 'Number Remapper',
  version: 1,
  source: 'packages/noodl-runtime/src/nodes/std-library/numberremapper.ts',
  // NSP-018 — the hand-written code this node replaces (read by nothing yet; `spec-ledger` counts it)
  idioms: [
    { says: 'mapping a number from one range to another', example: 'outMin + ((v - inMin) * (outMax - outMin)) / (inMax - inMin)' }
  ],

  // initialize (:20-48): 0, 0, 1, 0, 1, true. `_remappedValue = 0` (:23) equals `remap` of these.
  state: { input: 0, minIn: 0, maxIn: 1, minOut: 0, maxOut: 1, clamp: true } as RemapState,
  // :49-53 — a value entry holding the remapped value
  inspect: (s) => String(remap(s)),

  inputs: {
    // :55-68 — raw
    inputValue: {
      type: 'number',
      default: 0,
      coerce: 'none',
      displayName: 'Input Value',
      group: 'Value to Remap',
      description: 'Number to remap, read against Input Minimum and Input Maximum'
    },
    // :69-81
    minInputValue: {
      type: 'number',
      default: 0,
      coerce: 'none',
      displayName: 'Input Minimum',
      group: 'Input Parameters',
      description: 'Value of Input Value that maps to Output Minimum'
    },
    // :82-95
    maxInputValue: {
      type: 'number',
      default: 1,
      coerce: 'none',
      displayName: 'Input Maximum',
      group: 'Input Parameters',
      description:
        'Value of Input Value that maps to Output Maximum; set equal to Input Minimum and the result is pinned at Output Minimum for every input'
    },
    // :96-108
    minOutputValue: {
      type: 'number',
      default: 0,
      coerce: 'none',
      displayName: 'Output Minimum',
      group: 'Output Parameters',
      description: 'Result when Input Value is at Input Minimum'
    },
    // :109-121
    maxOutputValue: {
      type: 'number',
      default: 1,
      coerce: 'none',
      displayName: 'Output Maximum',
      group: 'Output Parameters',
      description: 'Result when Input Value is at Input Maximum'
    },
    // :122-135 — `value ? true : false` (:132)
    clamp: {
      type: 'boolean',
      default: true,
      coerce: 'js-boolean',
      displayName: 'Clamp Output',
      group: 'Output Parameters',
      description: 'Holds the result inside the output range when Input Value falls outside the input range, instead of extrapolating'
    }
  },

  outputs: {
    // :137-147
    remappedValue: {
      type: 'number',
      from: (s) => remap(s),
      displayName: 'Remapped Value',
      group: 'Outputs',
      description: 'Input Value rescaled from the input range onto the output range'
    }
  }
}).on({
  inputValue: (_s, v) => ({ says: 'always: Remapped Value follows', set: { input: v } }),
  minInputValue: (_s, v) => ({ says: 'always: Remapped Value follows', set: { minIn: v } }),
  maxInputValue: (_s, v) => ({ says: 'always: Remapped Value follows', set: { maxIn: v } }),
  minOutputValue: (_s, v) => ({ says: 'always: Remapped Value follows', set: { minOut: v } }),
  maxOutputValue: (_s, v) => ({ says: 'always: Remapped Value follows', set: { maxOut: v } }),
  clamp: (_s, v) => ({ says: 'always: Remapped Value follows', set: { clamp: v } })
});
```


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
