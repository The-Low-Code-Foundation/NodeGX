---
title: "Or"
---
Logical OR over any number of boolean inputs: Result is true while at least one connected input is true.

Or combines an unbounded series of boolean inputs into one boolean `result` (Result) value output, which is true while any input is truthy. Inputs are coerced with plain JavaScript truthiness, so an input that has never received a value counts as false, and with nothing connected the result is false. Whenever any input changes, the result is recomputed and pushed downstream. It is a pure value node with no signals and no state of its own.

## When to use it

Use it when any one of several conditions should be enough — e.g. show a section if either of two checkboxes is ticked. For 'all of' semantics use And; for negating one boolean use Inverter; for conditions that need comparisons or arithmetic first, compute them in an Expression and combine here.

## At a glance

| | |
|---|---|
| Category | Logic |
| Type name | `Or` |
| Available in | browser, cloud |
| SSR compatibility | safe |
| Provided by | `noodl-runtime` |
| Behaviour spec | version 1 ([under the hood](#under-the-hood)) |

## Outputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `result` | Boolean | — | True while at least one connected input is true; false when no input is connected at all |

## Dynamic ports

_This node's port list changes at runtime (numbered-inputs); the tables above may be incomplete for a given instance._

Accepts an unbounded numbered series of inputs (see numberedInputs); ports are named "&lt;base> &lt;N>" counting from 0.

## Ports at runtime

Inputs are numbered ports named "input 0", "input 1", … counting from 0 (displayed as "Input 0", "Input 1"). The editor always offers one more port than is currently connected, so connecting to the highest port makes the next one appear. An authoring tool should connect booleans to "input N" names, using consecutive indices starting at 0.

## Patterns

- Several error booleans → "input 0", "input 1", … with `result` → an error banner's `visible`: show it while anything is wrong.
- `result` → Inverter → `enabled`: disable an action while any blocker is active.

## Examples

**Gate a button on all required checks, reveal a note on any optional one**

And and Or as pure boolean-value combiners over numbered inputs. Two required checkboxes feed an And node's "input 0" and "input 1"; its `result` drives the submit button's `enabled` as a level, so the button enables the instant both are ticked and disables again if either is cleared. Two optional email checkboxes feed an Or the same way; its `result` shows an explanatory note while at least one is ticked. No signals are involved — everything here is level logic.

## Related nodes

[And](./and.md), [Inverter](./inverter.md), [Condition](./condition.md), [Expression](../custom-code/expression.md)

## Code export

Exports to React. A project that uses it exports this node as React code.

## Under the hood

This node's behaviour is written down as an executable spec in `@nodegx/node-spec`, version 1. The spec is the reference: the runtime, the React export and the conformance tests are all graded against it. Every rule in it cites the line of the runtime it was read from. The full spec is at the bottom of this page.

### What it depends on outside the node

Nothing. Its outputs depend only on its inputs and its own state.

### Starting state

```json
{
  "inputs": {}
}
```

### The code it replaces

What you would write by hand instead:

- any flag true: `const busy = a || b || c`
- some of a list: `flags.some(Boolean)`

## The full spec {#spec-source}

The spec's source, as the docs were generated. Helpers it imports live beside it in `packages/nodegx-node-spec/src`.

```ts title="packages/nodegx-node-spec/src/nodes/or.ts"
/**
 * Or — read from `packages/noodl-runtime/src/nodes/std-library/or.ts` on 2026-09-30 (NSP-011).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * And's sibling (and.ts), with two differences a wire can see: `result` is NOT cached (:41
 * flags on every changed input; :52-54 reads `some(isTrue)` live), so the first settle publishes
 * `false` from the getter — an Or with nothing connected says `false`, as an And does since its v2
 * (NSP-004 §6 D1, fixed in P109 ISL-033; v1 And said nothing). And a hole in the sparse array (:8-11) is skipped by `some`, so it counts as
 * FALSE here where And's `some((v) => !v)` skips it as true.
 */

import { defineNode, type ValueInputDecl } from '../spec';

const NUMBERED = /^input \d+$/;

// :30-33 `numberedInputs.input`: `type: 'boolean'`, `displayPrefix: 'Input'`; the setter (:34-43)
// stores the value raw (:40) and `isTrue` (:65-67, `value ? true : false`) reads it — js-boolean
// at the wire's level of detail.
const port = (i: number): ValueInputDecl => ({ type: 'boolean', coerce: 'js-boolean', displayName: 'Input ' + i });

/** :52-54 — `inputs.some(isTrue)` over the indices written; nothing written → false. */
export function or(inputs: Readonly<Record<string, boolean>>): boolean {
  return Object.values(inputs).some((v) => v);
}

export const Or = defineNode({
  type: 'Or',
  version: 1,
  source: 'packages/noodl-runtime/src/nodes/std-library/or.ts',
  // NSP-018 — the hand-written code this node replaces (read by nothing yet; `spec-ledger` counts it)
  idioms: [
    { says: 'any flag true', example: 'const busy = a || b || c' },
    { says: 'some of a list', example: 'flags.some(Boolean)' }
  ],

  // initialize (:23-25): `inputs = []`
  state: { inputs: {} as Readonly<Record<string, boolean>> },
  // :26-29 — a value entry holding `some(isTrue)`
  inspect: (s) => String(or(s.inputs)),

  inputs: {},

  outputs: {
    // :46-55 getter → `inputs.some(isTrue)` — live, not cached
    result: {
      type: 'boolean',
      from: (s) => or(s.inputs),
      displayName: 'Result',
      group: 'Values',
      description: 'True while at least one connected input is true; false when no input is connected at all'
    }
  }
}).on(
  {},
  {
    derived: {
      // nodedefinition.ts `collectPorts`: the highest `input <n>` mentioned plus one spare, or a
      // single `input 0` when nothing is mentioned (same rule as And). NSP-020 (s80): mentioned by a param OR by a wire
      // into the node (`collectPorts` :624 reads `getConnectionsTo(node.id)`'s target ports) — `context.wired`.
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
      // :35-42 — store under the index; the :36-38 same-value guard skips a flag and nothing else
      // a wire can see (the wire dedups), so it is not carried.
      on: (s, portName, value) => ({ set: { inputs: { ...s.inputs, [portName]: value as boolean } } }),
      // `registerNumberedInput` (nodedefinition.ts) takes any name starting with `input`; the spec
      // takes what the editor mints — see NSP-004 §6 D4 for the aliases.
      discover: (portName) => (NUMBERED.test(portName) ? port(Number(portName.slice('input '.length))) : undefined),
      candidates: ['input 0', 'input 1', 'input 2', 'input 3']
    }
  }
);
```


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
