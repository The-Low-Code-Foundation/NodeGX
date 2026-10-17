---
title: "And"
---
Logical AND over any number of boolean inputs: Result is true only while every connected input is true.

And combines an unbounded series of boolean inputs into one boolean `result` (Result) value output. The result is true only when at least one input is connected and none of them is false — inputs are coerced with plain JavaScript truthiness, so an input that has never received a value counts as false. Whenever any input changes, the result is recomputed and pushed downstream. This is a pure value node: it has no signals and no memory beyond its inputs' latest values.

## When to use it

Use it to require several conditions at once — e.g. two checkboxes both ticked before enabling a button. For 'any of' semantics use Or; for a single negation use Inverter; for arithmetic or comparisons that produce the booleans in the first place, use Expression, then combine here (or fold the whole thing into one Expression if it reads better).

## At a glance

| | |
|---|---|
| Category | Logic |
| Type name | `And` |
| Available in | browser, cloud |
| SSR compatibility | safe |
| Provided by | `noodl-runtime` |
| Behaviour spec | version 2 ([under the hood](#under-the-hood)) |

## Outputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `result` | Boolean | — | True only while every connected input is true; false when no input is connected at all |

## Dynamic ports

_This node's port list changes at runtime (numbered-inputs); the tables above may be incomplete for a given instance._

Accepts an unbounded numbered series of inputs (see numberedInputs); ports are named "&lt;base> &lt;N>" counting from 0.

## Ports at runtime

Inputs are numbered ports named "input 0", "input 1", … counting from 0 (displayed as "Input 0", "Input 1"). The editor always offers one more port than is currently connected, so connecting to the highest port makes the next one appear. An authoring tool should connect booleans to "input N" names, using consecutive indices starting at 0.

## Patterns

- Several `checked` outputs → "input 0", "input 1", … with `result` → a button's `enabled`: require every consent before proceeding.
- `result` → a Condition's `condition` when you need signal outputs (fired on evaluation) instead of a level.

## Examples

**Gate a button on all required checks, reveal a note on any optional one**

And and Or as pure boolean-value combiners over numbered inputs. Two required checkboxes feed an And node's "input 0" and "input 1"; its `result` drives the submit button's `enabled` as a level, so the button enables the instant both are ticked and disables again if either is cleared. Two optional email checkboxes feed an Or the same way; its `result` shows an explanatory note while at least one is ticked. No signals are involved — everything here is level logic.

**Check an email is well-formed and not already taken**

Sign-up validation as a chain of small truths rather than one function: an `Expression` says the field is non-empty, a `JavaScriptFunction` says it looks like an address, and a `DbCollection2` query says nobody has it yet — and an `And` node combines them into the one boolean the button enables on. The `Timer` in front of the query is the detail worth copying: it debounces, so the database is asked once the typing stops instead of once per keystroke. ⚠️ The two `Inverter` nodes read as clutter until you notice what they buy — 'no user came back' is the success case here, and inverting it keeps every input to the `And` meaning 'this is fine', which is what makes the combination readable at all.

## Related nodes

[Or](./or.md), [Inverter](./inverter.md), [Condition](./condition.md), [Expression](../custom-code/expression.md)

## Code export

Exports to React. A project that uses it exports this node as React code.

## Under the hood

This node's behaviour is written down as an executable spec in `@nodegx/node-spec`, version 2. The spec is the reference: the runtime, the React export and the conformance tests are all graded against it. Every rule in it cites the line of the runtime it was read from. The full spec is at the bottom of this page.

### What it depends on outside the node

Nothing. Its outputs depend only on its inputs and its own state.

### Starting state

```json
{
  "inputs": {},
  "result": false
}
```

### The code it replaces

What you would write by hand instead:

- every flag true at once: `const ready = a && b && c`
- all of a list: `flags.every(Boolean)`

## The full spec {#spec-source}

The spec's source, as the docs were generated. Helpers it imports live beside it in `packages/nodegx-node-spec/src`.

```ts title="packages/nodegx-node-spec/src/nodes/and.ts"
/**
 * And — read from `packages/noodl-runtime/src/nodes/std-library/and.ts` on 2026-09-30.
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * Why this node is in the pilot: trivial on purpose — the FLOOR cost of speccing a node — and the
 * first `numbered-inputs` node (the catalog's `dynamicPorts.mechanisms`): it declares NO input;
 * every `input <n>` is registered the first time something writes to it (nodedefinition.ts
 * `registerNumberedInput`, wrapping `registerInputIfNeeded`). So this spec has no `inputs` and
 * lives in `derived`.
 *
 * What the model has to carry that the source's `boolean[]` hides: the array is SPARSE. `input 2`
 * written before `input 0` gives `[ , , true]`, and `Array.prototype.some` skips holes (:74), so
 * holes count as true and a lone `input 2 = true` answers `true`. A record of the indices written
 * says the same thing without the holes: at least one written, none false.
 */

import { defineNode, type ValueInputDecl } from '../spec';

const NUMBERED = /^input \d+$/;

// :29-32 `numberedInputs.input`: `displayPrefix: 'Input'`, `type: 'boolean'`; the setter at
// :33-49 does `value ? true : false` (:35) — js-boolean.
const port = (i: number): ValueInputDecl => ({ type: 'boolean', coerce: 'js-boolean', displayName: 'Input ' + i });

/** :72-75 — `values.length > 0 && values.some((v) => !v) === false`, over the indices written. */
export function and(inputs: Readonly<Record<string, boolean>>): boolean {
  const values = Object.values(inputs);
  return values.length > 0 && !values.some((v) => !v);
}

export const And = defineNode({
  type: 'And',
  // v2 (P109 ISL-033, row D1 ruled "Make And start at false"): Result is false before any input arrives, as the
  // description says and as Or gives. v1, as the runtime was, published nothing until the first input.
  version: 2,
  source: 'packages/noodl-runtime/src/nodes/std-library/and.ts',
  // NSP-018 — the hand-written code this node replaces (read by nothing yet; `spec-ledger` counts it)
  idioms: [
    { says: 'every flag true at once', example: 'const ready = a && b && c' },
    { says: 'all of a list', example: 'flags.every(Boolean)' }
  ],

  // initialize: `inputs = []`, `result = false` (v2, row D1) — so the first settle publishes
  // `false` before any input arrives, as the port description says. A first input of `false`
  // leaves the answer where it was and publishes nothing more.
  state: { inputs: {} as Readonly<Record<string, boolean>>, result: false as boolean },
  // a value entry holding `and(inputs)` — `and([])` is false, the same as the cached `result` at the start
  inspect: (s) => String(and(s.inputs)),

  inputs: {},

  outputs: {
    // :53-61 `get` → `_internal.result`
    result: {
      type: 'boolean',
      from: (s) => s.result,
      displayName: 'Result',
      group: 'Values',
      description: 'True only while every connected input is true; false when no input is connected at all'
    }
  }
}).on(
  {},
  {
    derived: {
      // What an editor draws (nodedefinition.ts `collectPorts`): one port per index up to the
      // highest `input <n>` mentioned PLUS ONE SPARE — `numPorts = maxIndex + 1` where `maxIndex`
      // is already `1 + highest` — and a single `input 0` when nothing is mentioned.
      // NSP-020 (s79): `collectPorts` reads the node's parameters AND the target ports of the wires into it (:624) — a
      // wire on `input 3` with no param mints `input 0 … input 4`. The wires are `context.wired`; the first thing the
      // ports-parity drive found was this function counting params alone.
      inputs: (params, context) => {
        const indices = [...Object.keys(params), ...(context.wired ?? [])]
          .filter((k) => NUMBERED.test(k))
          .map((k) => Number(k.slice('input '.length)));
        const count = indices.length ? Math.max(...indices) + 2 : 1;
        const ports: Record<string, ValueInputDecl> = {};
        for (let i = 0; i < count; i++) ports['input ' + i] = port(i);
        return ports;
      },
      needs: ['wired'],
      // :33-49. Store the coerced boolean under its index; recompute; publish `result` only when
      // the ANSWER changed (:44-47 — "unlike Or this one caches `result`"). The :37-39 guard (same
      // value again → return) is not carried: it changes nothing a wire can see.
      on: (s, portName, value) => {
        const inputs = { ...s.inputs, [portName]: value as boolean };
        const result = and(inputs);
        return result !== s.result ? { set: { inputs, result } } : { set: { inputs } };
      },
      // `registerNumberedInput` accepts any name starting with `input` and parses what follows
      // the space with `Number()` — so `input` alone, `input 01` and `input  2` alias `input 0`,
      // `input 1`, `input 2`, and `input 1.5` lands outside the array's length. The spec accepts
      // only what the editor mints (`input <digits>`); the aliases are noted in NSP-004 §6.
      discover: (portName) => (NUMBERED.test(portName) ? port(Number(portName.slice('input '.length))) : undefined),
      candidates: ['input 0', 'input 1', 'input 2', 'input 3']
    }
  }
);
```


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
