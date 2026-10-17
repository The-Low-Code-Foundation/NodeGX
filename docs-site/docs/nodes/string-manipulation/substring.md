---
title: "Substring"
---
Extracts part of a string between a start index (inclusive) and end index (exclusive).

Substring takes a `string` (String) input and outputs the characters from index `start` (Start, 0-based, inclusive) up to but not including index `end` (End) on the `result` (Result) string value output. While `end` has never been set, the substring runs from `start` to the end of the string — so a node with only `start` configured behaves like 'drop the first N characters'. Setting `end` to -1 also means 'to the end of the string'. Non-string inputs are converted with toString() first, and any input change updates the result immediately.

## When to use it

Use it for simple positional trims: a short prefix of an id, truncating a preview, slicing fixed-width data. For pattern-based extraction, case changes or search-and-replace, use Expression or a Function; for assembling text from parts, use String Format.

## At a glance

| | |
|---|---|
| Category | String Manipulation |
| Type name | `Substring` |
| Available in | browser, cloud |
| SSR compatibility | safe |
| Provided by | `noodl-runtime` |
| Behaviour spec | version 3 ([under the hood](#under-the-hood)) |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `end` | Number | `-1` | Position to stop before; -1, the default, runs to the end of the string, and 0 yields an empty result |
| `start` | Number | `0` | Position of the first character to keep, counting from zero; a negative value counts back from the end |
| `string` | String | `` | Text to take the substring from; an empty value (null) counts as empty text |

### What each input does

**Start** (`start`)

- always: Result follows

**End** (`end`)

- always: Result follows

**String** (`string`)

- always: read as text (null counts as empty); Result follows

## Outputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `result` | String | — | The section of String between Start and End |

## Patterns

- Unique Id `guid` → `string` with `start` 0 / `end` 4: a short human-readable tag from a longer id.

## Watch out for

- Setting `end` to 0 expecting 'until the end' — 0 is a real exclusive index and yields an empty string; leave `end` unset or use -1 instead.

## Examples

**Debounced autosave with timestamped status**

The debounce idiom: every keystroke fires Value Changed, whose signal restarts a 1.5-second Timer — the save only runs when the user pauses. The save Function stamps the moment; Date To String formats it, Unique Id issues a save id shortened by Substring, and String Format assembles the status line. Signals sequence the flow; values shape the display.

## Related nodes

[String Format](./string-format.md), [String Mapper](../utilities/string-mapper.md), [Expression](../custom-code/expression.md), [Function](../custom-code/java-script-function.md)

## Code export

Exports to React. A project that uses it exports this node as React code.

## Under the hood

This node's behaviour is written down as an executable spec in `@nodegx/node-spec`, version 3. The spec is the reference: the runtime, the React export and the conformance tests are all graded against it. Every rule in it cites the line of the runtime it was read from. The full spec is at the bottom of this page.

### What it depends on outside the node

Nothing. Its outputs depend only on its inputs and its own state.

### Starting state

```json
{
  "str": "",
  "start": 0,
  "end": -1
}
```

### The code it replaces

What you would write by hand instead:

- a slice of a string: `text.substring(start, end)`

## The full spec {#spec-source}

The spec's source, as the docs were generated. Helpers it imports live beside it in `packages/nodegx-node-spec/src`.

```ts title="packages/nodegx-node-spec/src/nodes/substring.ts"
/**
 * Substring — read from `packages/noodl-runtime/src/nodes/std-library/substring.ts` on 2026-09-30
 * (NSP-011).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * The getter computes lazily and caches (:89-105); a wire cannot see the cache, so here `result`
 * is a function of the three inputs. The runtime's `substr` is kept verbatim (:94, :96-99) —
 * negative Start counts from the end, End is exclusive, and End reading as -1 — the number or the
 * text `'-1'` (v3, row D7 ruled "Treat it as -1"; v2's check was strict on the raw value) — means "to the end".
 *
 * `null` and `undefined` on String are empty text (v2 — NSP-011 §6 row C4, ruled "Read it as empty
 * text", fixed in P109 ISL-026). In v1 the setter's `value.toString()` threw on both and the spec
 * left the string as it was.
 */

import { defineNode } from '../spec';

/** :92-102 — `substr(start)` when End is -1, else `substr(start, end - start)`; raw values, JS's own conversions. */
export function substringOf(str: string, start: unknown, end: unknown): string {
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- the runtime's call, verbatim (:94, :96)
  return Number(end) === -1 ? str.substr(start as number) : str.substr(start as number, (end as number) - (start as number));
}

export const Substring = defineNode({
  type: 'Substring',
  // v2 (P109 ISL-026, P107-C4): null or undefined on String is empty text; v1 kept the old string (the runtime threw).
  // v3 (P109 ISL-032, row D7 ruled "Treat it as -1"): End as the text '-1' runs to the end, as the number does.
  version: 3,
  source: 'packages/noodl-runtime/src/nodes/std-library/substring.ts',
  // NSP-018 — the hand-written code this node replaces (read by nothing yet; `spec-ledger` counts it)
  idioms: [
    { says: 'a slice of a string', example: 'text.substring(start, end)' }
  ],

  // initialize (:26-33): startIndex 0, endIndex -1, inputString ''; the cache and its flag are not state a wire can see
  state: { str: '', start: 0 as unknown, end: -1 as unknown },

  inputs: {
    // :35-46 — stored raw (:42)
    start: {
      type: 'number',
      default: 0,
      coerce: 'none',
      displayName: 'Start',
      group: 'Values',
      description: 'Position of the first character to keep, counting from zero; a negative value counts back from the end'
    },
    // :47-64 — stored raw (:60); DEF-033: the declared default and `initialize` agree on -1
    end: {
      type: 'number',
      default: -1,
      coerce: 'none',
      displayName: 'End',
      group: 'Values',
      description: 'Position to stop before; -1, the default, runs to the end of the string, and 0 yields an empty result'
    },
    // :65-81 — `String(value)`, and null / undefined are '' (v2, row C4)
    string: {
      type: 'string',
      default: '',
      coerce: 'none',
      displayName: 'String',
      group: 'Values',
      description: 'Text to take the substring from; an empty value (null) counts as empty text'
    }
  },

  outputs: {
    // :83-105
    result: {
      type: 'string',
      from: (s) => substringOf(s.str, s.start, s.end),
      displayName: 'Result',
      group: 'Values',
      description: 'The section of String between Start and End'
    }
  }
}).on({
  start: (_s, v) => ({ says: 'always: Result follows', set: { start: v } }),
  end: (_s, v) => ({ says: 'always: Result follows', set: { end: v } }),
  // :76-80 — null / undefined are empty text (v2, row C4)
  string: (_s, v) => ({ says: 'always: read as text (null counts as empty); Result follows', set: { str: v === null || v === undefined ? '' : String(v) } })
});
```


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
