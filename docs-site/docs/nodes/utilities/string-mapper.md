---
title: "String Mapper"
---
Looks a string up in a configured key list and outputs the matching mapping — a wirable lookup table with a default.

String Mapper compares `inputString` (Input String) against its numbered "input N" entries (displayed Input 0, Input 1, …) using exact string equality. On a match, the `mappedString` (Mapped String) output takes the value of the "output N" entry with the same N (displayed Mapping 0, Mapping 1, … — these mappings are themselves inputs, despite the port name); with no match it takes `defaultMapping` (Default). All values are coerced to strings before comparison, and the mapping re-runs once per update cycle after any of its inputs change. Keys and mappings are usually typed in as parameters but can also be connected.

## When to use it

Use it to translate machine values into display text: status codes to labels, option keys to descriptions, locale keys to phrases. For just true/false use Boolean To String; for composing text with variables inside use String Format; for mappings that live in data rather than in the graph, use an Object or a Function.

## At a glance

| | |
|---|---|
| Category | Utilities |
| Type name | `String Mapper` |
| Available in | browser, cloud |
| SSR compatibility | safe |
| Provided by | `noodl-runtime` |
| Behaviour spec | version 2 ([under the hood](#under-the-hood)) |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `defaultMapping` | String | — | Published when Input String matches none of the numbered inputs |
| `inputString` | String | — | The string to look up among the numbered inputs |

### What each input does

**Input String** (`inputString`)

- always: looked up among the numbered inputs at the end of the frame (null counts as empty text); Mapped String follows

**Default** (`defaultMapping`)

- always: what Mapped String becomes at the end of the frame when nothing matches

## Outputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `mappedString` | String | — | The mapping paired with the input that matched, or Default when none did |

## Dynamic ports

_This node's port list changes at runtime (numbered-inputs); the tables above may be incomplete for a given instance._

Accepts an unbounded numbered series of inputs (see numberedInputs); ports are named "&lt;base> &lt;N>" counting from 0.

## Ports at runtime

Two numbered port series, both inputs, indexed from 0: keys are named "input 0", "input 1", … (group Inputs) and their mapped values are named "output 0", "output 1", … (group Mappings) — pair N maps key N to value N. The editor always offers the next unused index. An authoring tool typically writes both series as parameters (e.g. "input 0": "S", "output 0": "Small"), and may connect any of them.

## Patterns

- A Radio Button Group's `value` → `inputString`, mappings to human copy → a Text's `text`: option keys stay short and stable while the UI text stays editable in one place.

## Watch out for

- Using it for numeric ranges ('0-9' → 'low') — matching is exact equality only; use Expression or Condition chains for ranges.

## Examples

**Quantity stepper: Counter with remapped and formatted readouts**

Two buttons drive a Counter up and down within limits. The count feeds three displays: a String Format caption ('{count} items'), a String Mapper that maps special values to words (0 → 'empty'), and a Number Remapper converting the 0–10 range into 0.2–1 opacity for a fill indicator. Counter holds the state; the display nodes are pure value-shaping between it and the UI. ⚠️ This component has no `Component Inputs` or `Component Outputs`: nothing outside it can set the starting quantity or read the count back, so it is a demonstration of the value-shaping nodes rather than a part a page can use. `comp-controlled-quantity-stepper` is the same idea with an interface — `value` in, `value` and `valueChanged` out.

## Related nodes

[Boolean To String](./boolean-to-string.md), [String Format](../string-manipulation/string-format.md), [States](../animation/states.md), [Expression](../custom-code/expression.md)

## Code export

Exports to React. A project that uses it exports this node as React code.

## Under the hood

This node's behaviour is written down as an executable spec in `@nodegx/node-spec`, version 2. The spec is the reference the conformance tests grade the runtime against. Every rule in it cites the line of the runtime it was read from. The full spec is at the bottom of this page.

### What it depends on outside the node

Nothing. Its outputs depend only on its inputs and its own state.

### Starting state

```json
{
  "inputs": {},
  "mappings": {},
  "scheduled": false
}
```

### The code it replaces

What you would write by hand instead:

- a lookup table from one string to another, with a fallback: `({ draft: 'Draft', live: 'Published' })[status] ?? 'Unknown'`
- a switch over string cases returning text: `switch (status) { case 'draft': return 'Draft'; default: return 'Unknown' }`

## The full spec {#spec-source}

The spec's source, as the docs were generated. Helpers it imports live beside it in `packages/nodegx-node-spec/src`.

```ts title="packages/nodegx-node-spec/src/nodes/string-mapper.ts"
/**
 * String Mapper — read from `packages/noodl-runtime/src/nodes/std-library/stringmapper.ts` on
 * 2026-09-30 (NSP-011).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * Two `numbered-inputs` families that pair by index (:3-9): `input <n>` is the string to match,
 * `output <n>` (drawn as "Mapping n") is what it maps to. The lookup runs once per frame
 * (`scheduleMapping` :106-112, the `hasScheduled…` idiom → `afterInputs`): `indexOf` over the
 * sparse inputs (:100 — ascending index, `===`, holes skipped), the paired mapping or Default
 * (:101-102), and `Mapped String` flagged (:104) — so an unset pairing publishes nothing (C3) and
 * the wire keeps whatever it had.
 *
 * Every string setter here reads `null` as empty text — `inputString` (:70) and both numbered
 * families (:42, :54); `undefined` is `''` on the numbered ports and "no input string" on Input
 * String (v2 — NSP-011 §6 row C4, ruled "Read it as empty text", fixed in P109 ISL-026). In v1
 * `null.toString()` threw inside the setter and the spec ignored the write.
 */

import { defineNode, type ValueInputDecl } from '../spec';

const INPUT = /^input \d+$/;
const OUTPUT = /^output \d+$/;

// :34-46 and :47-58 — `type: 'string'`, `displayPrefix` Input / Mapping, groups Inputs / Mappings
const inputPort = (i: number): ValueInputDecl => ({ type: 'string', coerce: 'none', displayName: 'Input ' + i, group: 'Inputs' });
const mappingPort = (i: number): ValueInputDecl => ({ type: 'string', coerce: 'none', displayName: 'Mapping ' + i, group: 'Mappings' });

/** nodedefinition.ts `collectPorts`: the highest index mentioned plus one spare, or `<family> 0` alone. */
function drawn(params: Readonly<Record<string, unknown>>, wired: readonly string[], family: string, port: (i: number) => ValueInputDecl): Record<string, ValueInputDecl> {
  const re = new RegExp('^' + family + ' \\d+$');
  const indices = [...Object.keys(params), ...wired]
    .filter((k) => re.test(k))
    .map((k) => Number(k.slice(family.length + 1)));
  const count = indices.length ? Math.max(...indices) + 2 : 1;
  const ports: Record<string, ValueInputDecl> = {};
  for (let i = 0; i < count; i++) ports[family + ' ' + i] = port(i);
  return ports;
}

/** :98-103 `doMapping` — `inputs.indexOf(current)` on a sparse array, then the paired mapping or the default. */
export function mappingFor(
  inputs: Readonly<Record<string, string>>,
  mappings: Readonly<Record<string, string>>,
  current: string | undefined,
  fallback: unknown
): unknown {
  const idx = Object.keys(inputs)
    .map(Number)
    .sort((a, b) => a - b)
    .find((i) => inputs[i] === current);
  return idx === undefined ? fallback : mappings[idx];
}

export const StringMapper = defineNode({
  type: 'String Mapper',
  // v2 (P109 ISL-026, P107-C4): null on Input String or a numbered port is empty text; v1 ignored the write (the runtime threw).
  version: 2,
  source: 'packages/noodl-runtime/src/nodes/std-library/stringmapper.ts',
  // NSP-018 — the hand-written code this node replaces (read by nothing yet; `spec-ledger` counts it)
  idioms: [
    { says: 'a lookup table from one string to another, with a fallback', example: '({ draft: \'Draft\', live: \'Published\' })[status] ?? \'Unknown\'' },
    { says: 'a switch over string cases returning text', example: 'switch (status) { case \'draft\': return \'Draft\'; default: return \'Unknown\' }' }
  ],

  // initialize (:27-30): inputs [], mappings []; the rest is unset until written
  state: {
    inputs: {} as Readonly<Record<string, string>>,
    mappings: {} as Readonly<Record<string, string>>,
    current: undefined as string | undefined,
    fallback: undefined as unknown,
    mapped: undefined as unknown,
    scheduled: false
  },
  // :31-33
  inspect: (s) => String(s.mapped),

  inputs: {
    // :61-73 — undefined stays undefined, null is '' (v2, row C4), anything else `toString()` (:70)
    inputString: {
      type: 'string',
      coerce: 'none',
      displayName: 'Input String',
      group: 'Values',
      description: 'The string to look up among the numbered inputs'
    },
    // :74-84 — stored raw (:81)
    defaultMapping: {
      type: 'string',
      coerce: 'none',
      displayName: 'Default',
      group: 'Mappings',
      description: 'Published when Input String matches none of the numbered inputs'
    }
  },

  outputs: {
    // :86-96
    mappedString: {
      type: 'string',
      from: (s) => s.mapped,
      displayName: 'Mapped String',
      group: 'Values',
      description: 'The mapping paired with the input that matched, or Default when none did'
    }
  }
}).on(
  {
    inputString: (_s, v) => ({
      says: 'always: looked up among the numbered inputs at the end of the frame (null counts as empty text); Mapped String follows',
      set: { current: v === undefined ? undefined : v === null ? '' : String(v), scheduled: true } }),
    defaultMapping: (_s, v) => ({ says: 'always: what Mapped String becomes at the end of the frame when nothing matches', set: { fallback: v, scheduled: true } })
  },
  {
    derived: {
      // nodedefinition.ts `collectPorts` per family — mentioned by a param OR by a wire into the node (:624, NSP-020 s80: `context.wired`)
      inputs: (params, context) => ({ ...drawn(params, context.wired ?? [], 'input', inputPort), ...drawn(params, context.wired ?? [], 'output', mappingPort) }),
      needs: ['wired'],
      // :40-45, :52-57 — undefined and null are '' (v2, row C4), anything else `toString()`
      on: (s, portName, value) => {
        const text = value === undefined || value === null ? '' : String(value);
        if (INPUT.test(portName)) return { set: { inputs: { ...s.inputs, [portName.slice('input '.length)]: text }, scheduled: true } };
        return { set: { mappings: { ...s.mappings, [portName.slice('output '.length)]: text }, scheduled: true } };
      },
      // `registerNumberedInput` for each family; `inputString` starts with `input` but is already a port
      discover: (portName) => {
        if (INPUT.test(portName)) return inputPort(Number(portName.slice('input '.length)));
        if (OUTPUT.test(portName)) return mappingPort(Number(portName.slice('output '.length)));
        return undefined;
      },
      candidates: ['input 0', 'input 1', 'output 0', 'output 1']
    },
    // :98-104 — once per frame, against the frame's final inputs
    afterInputs: (s) => (s.scheduled ? { set: { scheduled: false, mapped: mappingFor(s.inputs, s.mappings, s.current, s.fallback) } } : {})
  }
);
```


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
