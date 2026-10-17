---
title: "String Format"
---
Builds a string from a template: each {tag} in the Format text becomes an input port whose value is spliced in.

String Format takes a template on its `format` (Format) parameter and outputs the filled-in text on `formatted` (Formatted), a string value. Every {tag} in the template (tag characters: letters, digits, underscore) becomes a string input port named exactly like the tag, and each occurrence is replaced by that input's current value — or by nothing while the input is still undefined. The same tag may appear multiple times; every occurrence is filled. The output recomputes after any input or the template changes, once per update cycle. The node displays its format text as its label in the editor.

## When to use it

The idiomatic way to put values inside text: 'Saved at {time}', '{count} items', building URLs or messages from parts. For two fixed alternatives use Boolean To String; for value-keyed lookup use String Mapper; for transformations of the values themselves (padding, casing, math) do that upstream in an Expression or Function.

## At a glance

| | |
|---|---|
| Category | String Manipulation |
| Type name | `String Format` |
| Available in | browser, cloud |
| SSR compatibility | safe |
| Provided by | `noodl-runtime` |
| Behaviour spec | version 2 ([under the hood](#under-the-hood)) |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `format` | String | — | Template text; each {placeholder} becomes an input port, and every copy of a placeholder is filled |

### What each input does

**Format** (`format`)

- always: the new template — each {name} in it becomes a text input, and Formatted follows

## Outputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `formatted` | String | — | Format with every placeholder substituted, and an unset placeholder replaced by nothing |

## Dynamic ports

_This node's port list changes at runtime (runtime-discovered); the tables above may be incomplete for a given instance._

Input ports are created for each "{tag}" appearing in the "format" parameter string.

## Ports at runtime

Input ports are created from the `format` parameter: each unique {tag} yields one string input named exactly &lt;tag> (no braces). The editor updates the port list live as the format is edited. An authoring tool must first set `format`, then may connect to or set parameters for each tag name it wrote; no other inputs exist.

## Patterns

- Counter `currentCount` → the {n} input of format "{n} pcs" → a Text's `text`: numbers cast to string on connection, so no converter node is needed.

## Watch out for

- Tags with spaces or dashes ({item-count}) — tag names are limited to [A-Za-z0-9_]; anything else stays literal text.

## Examples

**Quantity stepper: Counter with remapped and formatted readouts**

Two buttons drive a Counter up and down within limits. The count feeds three displays: a String Format caption ('{count} items'), a String Mapper that maps special values to words (0 → 'empty'), and a Number Remapper converting the 0–10 range into 0.2–1 opacity for a fill indicator. Counter holds the state; the display nodes are pure value-shaping between it and the UI. ⚠️ This component has no `Component Inputs` or `Component Outputs`: nothing outside it can set the starting quantity or read the count back, so it is a demonstration of the value-shaping nodes rather than a part a page can use. `comp-controlled-quantity-stepper` is the same idea with an interface — `value` in, `value` and `valueChanged` out.

**Debounced autosave with timestamped status**

The debounce idiom: every keystroke fires Value Changed, whose signal restarts a 1.5-second Timer — the save only runs when the user pauses. The save Function stamps the moment; Date To String formats it, Unique Id issues a save id shortened by Substring, and String Format assembles the status line. Signals sequence the flow; values shape the display.

## Related nodes

[Boolean To String](../utilities/boolean-to-string.md), [String Mapper](../utilities/string-mapper.md), [Substring](./substring.md), [Date To String](../utilities/date-to-string.md), [Expression](../custom-code/expression.md)

## Code export

Exports to React. A project that uses it exports this node as React code.

## Under the hood

This node's behaviour is written down as an executable spec in `@nodegx/node-spec`, version 2. The spec is the reference the conformance tests grade the runtime against. Every rule in it cites the line of the runtime it was read from. The full spec is at the bottom of this page.

### What it depends on outside the node

Nothing. Its outputs depend only on its inputs and its own state.

### Starting state

```json
{
  "format": "",
  "values": {}
}
```

### How inputs are converted

Inputs not listed arrive as sent.

| Input | Conversion | What it does |
|---|---|---|
| Format (`format`) | `js-string` | converted with `String(value)`, so no value becomes the text `"undefined"` |

### The code it replaces

What you would write by hand instead:

- a template literal filling named values into text: `` `Hello ${name}, you have ${count} messages` ``

## The full spec {#spec-source}

The spec's source, as the docs were generated. Helpers it imports live beside it in `packages/nodegx-node-spec/src`.

```ts title="packages/nodegx-node-spec/src/nodes/string-format.ts"
/**
 * String Format — read from `packages/noodl-runtime/src/nodes/std-library/stringformat.ts` on
 * 2026-09-30.
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * Why this node is in the pilot: the first `runtime-discovered` ports (the catalog's
 * `dynamicPorts.mechanisms`). `registerInputIfNeeded` is overridden (:102-109) to register ANY
 * name on first write and store its value (:124-131) — even one the format does not mention yet —
 * while the EDITOR draws one port per `{placeholder}` in `format` (:133-155 `updatePorts`). Both
 * halves are in `derived`: `inputs(params)` is what the editor draws, `discover` is what the
 * runtime accepts.
 *
 * Two things the source once said about itself that the code did not do, both §6 rows in NSP-004:
 *   - every copy of a placeholder is filled: the loop at :89-94 runs once PER MATCH, and each
 *     `replace` fills the first occurrence still standing — so `{a}{a}` with `a = 'x'` gives `xx`.
 *     The description (:52) and the comment at :91-92 said only the first copy filled (row D2,
 *     ruled "Correct the words" in P109 ISL-033; the code did not change).
 *   - v2 (row D3, ruled "Insert values exactly"): a value goes in exactly as it is. v1, as the
 *     runtime was, replaced with a string, which interprets `$&`, `$$`, `` $` `` and `$'` in the
 *     REPLACEMENT: a value of `$&` printed the placeholder back, `$$5` printed `$5`.
 */

import { defineNode, type ValueInputDecl } from '../spec';

/** :81 — a placeholder is `{` + zero or more of `A-Za-z0-9_` + `}`; `{}` names the port `''`. */
const PLACEHOLDER = /\{[A-Za-z0-9_]*\}/g;

/** :81-87 — the placeholder names in order of appearance, duplicates kept. */
export function placeholders(format: string): string[] {
  const matches = format.match(PLACEHOLDER);
  return matches ? matches.map((m) => m.slice(1, -1)) : [];
}

/** :75-98 `formatValue`, without the dirty cache (a pure function of format and values). */
export function formatValue(format: string, values: Readonly<Record<string, unknown>>): string {
  let formatted = format;
  for (const name of placeholders(format)) {
    const v = values[name];
    // :93 — string pattern, so the FIRST occurrence still standing; a function replacement, so no `$`-pattern applies (v2, D3)
    const text = v !== undefined ? String(v) : '';
    formatted = formatted.replace('{' + name + '}', () => text);
  }
  return formatted;
}

// :107-109 registers `{ set }` only — no type, no label; :148 gives the editor's port `type: 'string'`.
// No conversion on arrival (:128 stores what came), `String(v)` is applied at format time (:93).
const placeholderPort = (): ValueInputDecl => ({ type: 'string', coerce: 'none' });

export const StringFormat = defineNode({
  type: 'String Format',
  // v2 (P109 ISL-032, row D3 ruled "Insert values exactly"): `$&`, `$$`, `$'` and `` $` `` in a value come out as typed.
  version: 2,
  source: 'packages/noodl-runtime/src/nodes/std-library/stringformat.ts',
  // NSP-018 — the hand-written code this node replaces (read by nothing yet; `spec-ledger` counts it)
  idioms: [
    { says: 'a template literal filling named values into text', example: '`Hello ${name}, you have ${count} messages`' }
  ],

  // initialize (:38-44): format '', cachedResult '', inputValues {}. The cache and its dirty flag
  // are not state a wire can see; `formatted` is a function of `format` and `values`.
  state: { format: '', values: {} as Readonly<Record<string, unknown>> },
  // :45-47 — the formatted text
  inspect: (s) => formatValue(s.format, s.values),

  inputs: {
    // :49-61. No declared default. The setter converts on arrival (`String(value)`): a wired
    // number, `null`, an object is read as its text. It once stored the value unconverted and
    // `.match` threw inside the frame, for good (P107-C3, fixed in ISL-026; the spec always read it so).
    format: {
      type: 'string',
      coerce: 'js-string',
      displayName: 'Format',
      group: 'Values',
      description: 'Template text; each {placeholder} becomes an input port, and every copy of a placeholder is filled'
    }
  },

  outputs: {
    // :64-71 `get` → `formatValue()`; :115-118 sends it after the frame's inputs have landed
    formatted: {
      type: 'string',
      from: (s) => formatValue(s.format, s.values),
      displayName: 'Formatted',
      group: 'Values',
      description: 'Format with every placeholder substituted, and an unset placeholder replaced by nothing'
    }
  }
}).on(
  {
    // :54-60 — store the format. The :55 same-value guard only skips a reschedule; not carried.
    format: (_s, v) => ({ says: 'always: the new template — each {name} in it becomes a text input, and Formatted follows', set: { format: v } })
  },
  {
    derived: {
      // :133-155 `updatePorts` — one `string` input per UNIQUE placeholder in `format`, in order of
      // first appearance. A non-string `format` parameter draws no ports (`.match` would throw
      // there too; the editor never sends one).
      inputs: (params) => {
        const ports: Record<string, ValueInputDecl> = {};
        const format = params.format;
        if (typeof format !== 'string') return ports;
        for (const name of placeholders(format)) if (!(name in ports)) ports[name] = placeholderPort();
        return ports;
      },
      // :124-131 `userInputSetter` — store under the name; the :126 same-value guard is not carried
      on: (s, portName, value) => ({ set: { values: { ...s.values, [portName]: value } } }),
      // :102-109 — any name at all is registered on first write
      discover: () => placeholderPort(),
      candidates: ['name', 'a']
    }
  }
);
```


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
