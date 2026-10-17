---
title: "Static Array"
---
Static Array: inline JSON or CSV authored in the editor, emitted as an array of objects.

Static Array turns literal data typed into the node — JSON (an array of objects) or CSV with a header row — into an `items` array plus a `count`. Each element becomes a client-side object, so downstream nodes treat the items exactly like query results or shared-array elements.

## When to use it

Fixtures, menus, option lists, demo content — any list that ships with the app rather than coming from a backend or user input. For runtime-mutable lists feed an Array (Collection2); for remote data use Query Records or REST.

## At a glance

| | |
|---|---|
| Category | Data |
| Type name | `Static Data` |
| Available in | browser, cloud |
| SSR compatibility | safe |
| Provided by | `noodl-runtime` |
| Behaviour spec | version 1 ([under the hood](#under-the-hood)) |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `csv` | String | — | Rows of comma-separated values whose first row names the properties; every cell is read as a string, so use JSON if numbers must stay numbers — ignored unless Type is CSV |
| `json` | String | — | An array of objects authored inline; unlike CSV it keeps numbers and booleans as they are — ignored unless Type is JSON |
| `type` | Enum (`csv`, `json`) | `csv` | Which of the two authoring formats below is read |

### What each input does

**Type** (`type`)

- always: kept; the data is read again only when CSV or JSON changes

**CSV** (`csv`)

- always: the data is read again at the end of the frame, as Type says (CSV when unset) — Items and Count follow

**JSON** (`json`)

- always: the data is read again at the end of the frame, as Type says — Items and Count follow; with Type JSON, Error and Failure if it does not parse (Failure once per message)

## Outputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `count` | Number | — | How many rows the last successful parse produced |
| `items` | Array | — | The authored rows, as an array of records; unchanged while the JSON cannot be parsed |

### Failure outputs

| Name | Type | Default | Description |
|---|---|---|---|
| `error` | String | — | Why the JSON could not be parsed, in one sentence; empty until a parse fails |
| `failure` | Signal | — | Fires when the authored JSON could not be parsed, leaving Items as it was |

## Dynamic ports

_This node's port list changes at runtime (declared-port-groups); the tables above may be incomplete for a given instance._

Output ports are derived from the columns/fields of the data entered in the "data" parameter.

| Condition | Inputs shown | Outputs shown |
|---|---|---|
| type = csv OR type NOT SET | `csv` | — |
| type = json | `json` | — |

## Ports at runtime

Declared-port-groups only: the `json` and `csv` text inputs swap in based on `type`. No ports depend on the data itself.

## Patterns

- Static Array → Array Filter/Array Map → Repeater: fixture-driven UI with real list plumbing.

## Watch out for

- Editing Static Array content from logic at runtime — it is authoring-time data; use an Array for mutable lists.

## Examples

**Named shared array with insert, remove and clear**

A client-side list without a backend: an Array node (Collection2) binds to the named shared array 'todos' and feeds a Repeater. Add Item (CollectionInsert), Remove Item (CollectionRemove) and Clear (CollectionClear) mutate the same array by its `collectionId`; every node bound to that id — including the Array feeding the list — sees the change immediately. Ids on wires tie the writers to the store. Remove is the row’s to raise: `/Todo Row` publishes a `remove` signal on its `Component Outputs`, and the Repeater re-publishes it as `itemOutputSignal-remove` while setting `itemActionItemId` to the row that fired — the trigger and the id both leave the Repeater, so they always describe the same row.

**Static array filtered and mapped into a list**

Local data without a backend: Static Array holds inline JSON, Array Filter narrows it with a per-item filter script, Array Map reshapes each element with a map script, and the result drives a Repeater. Filter and Map are non-destructive — they emit new arrays and leave the source untouched, so several differently-filtered views can share one source.

**Repeater item writes back to its own record object**

Inside a Repeater item component, Repeater Item (For Each Actions) exposes `itemId` — the id of this row's object. Wiring it into Set Object Properties (SetModelProperties) `modelId` makes the write target exactly this row: toggling the checkbox stores `done` on the row's object, and every other node bound to that object updates. The row never needs to know which list it belongs to. The title rides the checkbox's own `label` port (`useLabel` on) rather than a sibling Text, so the words are a real click target that toggles the box.

**A rich-text editor with a toolbar and local drafts**

The larger companion to the single-button component: a `Static Data` node holds the list of toolbar commands, a `For Each` draws one button per entry, and the editor itself is mounted by a `JavaScriptFunction` onto a `Group`'s element. Two details are worth more than the editor. The draft is saved to `localStorage` on a `Timer` and read back on mount, which is the whole of 'don't lose my work' and costs two function nodes. And `Model2` plus `SetModelProperties` keep the document in the project's own data model rather than only inside the third-party editor, so something other than the editor can read what was typed. ⚠️ The toolbar is driven by data, so adding a command is a row in the `Static Data` node — not a new button.

**A wrapping row of content-width items, with no CSS**

Items that keep their own width and flow onto the next line when they run out of room — the layout a chip row, a filter bar or a tag list wants, and one people reach for a `CSS Definition` node to get. It needs no CSS: the container is a **Group** with `Multi Line Wrap` on, `Layout` set to row, a `Column Gap` and a `Row Gap` (the two gap ports only appear once wrapping is on) and `Align Y` at top, and each item is a **Group** at `Content Size`. ⚠️ That last part is the half that is usually missed. An item at `Content Size` gets no width of its own, and the runtime gives every node `flex-shrink: 0` and only grants `flex-grow` to a percentage width — so `Content Size` already *is* `flex: 0 0 auto`, and an item left at `100%` instead becomes `flex-grow: 100` and swallows the whole line. 🔴 This is not masonry: rows are laid out independently and nothing balances columns or packs items upward by height.

## Related nodes

[Array](./collection2.md), [Array Filter](./filter-collection.md), [Array Map](./map-collection.md), [Repeater](../visual/for-each.md)

## Code export

Exports to React. A project that uses it exports this node as React code.

## Under the hood

This node's behaviour is written down as an executable spec in `@nodegx/node-spec`, version 1. The spec is the reference: the runtime, the React export and the conformance tests are all graded against it. Every rule in it cites the line of the runtime it was read from. The full spec is at the bottom of this page.

### What it depends on outside the node

- the shared store of Objects and Arrays, looked up by id (`registry`)
- random numbers (`random`)

### Starting state

```json
{
  "scheduled": false
}
```

## The full spec {#spec-source}

The spec's source, as the docs were generated. Helpers it imports live beside it in `packages/nodegx-node-spec/src`.

```ts title="packages/nodegx-node-spec/src/nodes/static-array.ts"
/**
 * Static Array (catalog type `Static Data`) — read from
 * `packages/noodl-runtime/src/nodes/std-library/data/staticdata.ts` and the parser it shares with
 * Parse CSV, `packages/noodl-runtime/src/csv.ts`, on 2026-10-01 (NSP-012).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE, before the citations: the node turns authored text into a FRESH anonymous array at
 * the frame end, once per frame however many of its inputs moved (:187-193, :194-238). `Type`
 * picks the text: unset or `csv` reads `CSV` (:199-206) — every cell a string, the first row the
 * property names, a short row leaving its missing columns `undefined`, a trailing newline a
 * trailing row (csv.ts :144-201, the tokeniser below verbatim); `json` reads `JSON` (:207-237) —
 * parsed with `JSON.parse`, and a text that will not parse FAILS: `Error` carries
 * `The JSON could not be parsed: <the parser's own message>`, `Failure` pulses (a plain signal; no
 * invocation, no outcome) once per DISTINCT message (:176-186 — a repeat is not re-announced
 * until a parse succeeds, :232), and `Items` keeps whatever the last successful parse built
 * (:220-229). Any other `Type` reads nothing (:199, :207). A successful parse builds a NEW array —
 * `Collection.get()` with no name, a guid draw (:203, :233) — so `Items` is REPLACED every time
 * (its name on the wire moves; NSP-012 AC6), `Count` follows it, and the records inside are
 * minted anonymous too (one draw each, collection.ts `set`). Every port is panel-only.
 */

import { defineNode } from '../spec';
import { errorOutput } from './data-base';

/** csv.ts :78-80 */
function stripBOM(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/** csv.ts :93-142 — the scanner, as lifted from this node (the `gapAt` verdict is Parse CSV's; this node ignores it). */
function tokenise(text: string, delimiter: string): string[][] {
  const objPattern = new RegExp('(\\' + delimiter + '|\\r?\\n|\\r|^)' + '(?:"([^"]*(?:""[^"]*)*)"|' + '([^"\\' + delimiter + '\\r\\n]*))', 'gi');
  const rows: string[][] = [[]];
  let matches: RegExpExecArray | null = null;
  let prevLastIndex: number | undefined;
  while ((matches = objPattern.exec(text)) && prevLastIndex !== objPattern.lastIndex) {
    prevLastIndex = objPattern.lastIndex;
    const matchedDelimiter = matches[1];
    if (matchedDelimiter.length && matchedDelimiter !== delimiter) rows.push([]);
    const value = matches[2] !== undefined ? matches[2].replace(/""/g, '"') : matches[3];
    rows[rows.length - 1].push(value);
  }
  return rows;
}

/** csv.ts :150-152 */
export function parseCSVRows(text: unknown): string[][] {
  return tokenise(stripBOM(String(text === undefined || text === null ? '' : text)), ',');
}

/** csv.ts :189-201 */
export function rowsToRecords(rows: string[][]): Record<string, string>[] {
  const header = rows[0];
  if (!header) return [];
  const records: Record<string, string>[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const record: Record<string, string> = {};
    for (let j = 0; j < header.length; j++) record[header[j]] = row[j];
    records.push(record);
  }
  return records;
}

/** :46-47 */
export const JSON_PARSE_ERROR_CODE = 'static-array/json-parse-failed';

export const StaticData = defineNode({
  type: 'Static Data',
  version: 1,
  source: 'packages/noodl-runtime/src/nodes/std-library/data/staticdata.ts; packages/noodl-runtime/src/csv.ts',
  needs: ['registry', 'random'],

  // :28-40 — `type` is unset until the panel writes it (the declared default never runs a setter)
  state: {
    type: undefined as unknown,
    csv: undefined as unknown,
    json: undefined as unknown,
    collectionId: undefined as string | undefined,
    lastError: undefined as string | undefined,
    lastReported: undefined as string | undefined,
    scheduled: false
  },

  inputs: {
    // :86-102
    type: {
      type: 'enum',
      enums: ['csv', 'json'],
      default: 'csv',
      coerce: 'none',
      editOnly: true,
      displayName: 'Type',
      group: 'General',
      description: 'Which of the two authoring formats below is read'
    },
    // :103-114
    csv: {
      when: (p) => p.type === 'csv' || p.type === undefined,
      type: 'string',
      coerce: 'none',
      editOnly: true,
      displayName: 'CSV',
      group: 'General',
      description:
        'Rows of comma-separated values whose first row names the properties; every cell is read as a string, so use JSON if numbers must stay numbers — ignored unless Type is CSV',
      examples: ['name,age\nAda,36\nLin,9', 'name,age\nAda,36\n', 'a,b\n1\n', 'x', '', 'q\n"a,b"\n"say ""hi"""', '"",y\n1,2']
    },
    // :115-126
    json: {
      when: (p) => p.type === 'json',
      type: 'string',
      coerce: 'none',
      editOnly: true,
      displayName: 'JSON',
      group: 'General',
      description: 'An array of objects authored inline; unlike CSV it keeps numbers and booleans as they are — ignored unless Type is JSON',
      examples: ['[{"a":1},{"a":2}]', '[{"id":"m1","a":1}]', '[]', '{"a":1}', 'not json', '[1,', '', '5', 'null']
    }
  },

  outputs: {
    // :129-137
    items: {
      type: 'array',
      displayName: 'Items',
      group: 'General',
      description: 'The authored rows, as an array of records; unchanged while the JSON cannot be parsed',
      from: (s, w) => (s.collectionId !== undefined ? w.registry.collection(s.collectionId) : undefined)
    },
    // :138-146
    count: { type: 'number', displayName: 'Count', group: 'General', description: 'How many rows the last successful parse produced', from: (s, w) => (s.collectionId !== undefined ? w.registry.collection(s.collectionId).size() : 0) },
    // :147-152 — a plain signal
    failure: { type: 'signal', displayName: 'Failure', group: 'Events', description: 'Fires when the authored JSON could not be parsed, leaving Items as it was' },
    // :153-161
    error: errorOutput('Why the JSON could not be parsed, in one sentence; empty until a parse fails', (s: { lastError: unknown }) => s.lastError)
  }
}).on(
  {
    type: (_s, v) => ({ says: 'always: kept; the data is read again only when CSV or JSON changes', set: { type: v }, send: [] }), // :99-101
    csv: (_s, v) => ({ says: 'always: the data is read again at the end of the frame, as Type says (CSV when unset) — Items and Count follow', set: { csv: v, scheduled: true }, send: [] }), // :110-113
    json: (_s, v) => ({
      says: 'always: the data is read again at the end of the frame, as Type says — Items and Count follow; with Type JSON, Error and Failure if it does not parse (Failure once per message)',
      set: { json: v, scheduled: true },
      send: []
    }) // :122-125
  },
  {
    // :194-238 parseData. 'nothing due', 'a Type that reads nothing' and 'the same failure again'
    // leave nothing on the wire and return ONE shape (the flag cleared)
    afterInputs: (s, _i, w) => {
      const idle = { set: { scheduled: false }, send: [] as Array<'error'> };
      if (!s.scheduled) return idle;
      if (s.type === undefined || s.type === 'csv') {
        const records = rowsToRecords(parseCSVRows(s.csv)); // :201
        const collection = w.registry.collection(); // :203 — anonymous
        collection.set(records); // :204
        return { set: { scheduled: false, collectionId: collection.getId() }, send: ['items', 'count'] }; // :205-206
      }
      if (s.type === 'json') {
        let parsed: unknown;
        try {
          parsed = JSON.parse(s.json as string); // :218
        } catch (e) {
          // :228 reportFailure → :176-186
          const message = 'The JSON could not be parsed: ' + (e as Error).message;
          if (s.lastReported === message) return { ...idle, send: ['error'] }; // :181 — Error re-sent (the same text), nothing pulsed
          return { set: { scheduled: false, lastError: message, lastReported: message }, send: ['error'], emit: ['failure'] };
        }
        const collection = w.registry.collection(); // :233
        collection.set(parsed); // :234
        return { set: { scheduled: false, lastReported: undefined, collectionId: collection.getId() }, send: ['items', 'count'] }; // :232-236
      }
      return idle; // neither branch
    }
  }
);
```


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
