---
title: "To CSV"
---
Writes an array out as CSV text, quoting any cell that needs it.

To CSV turns an array into CSV text. Records become rows: leave Columns empty and every property found on the records is written, in the order they were first seen, or name the columns yourself to fix the order and drop the rest. An array of arrays — what Parse CSV produces with Has Header unticked — is written cell for cell with no header invented. The correctness of a CSV writer is entirely about quoting, and this one gets it right: any cell containing the delimiter, a quote or a newline is wrapped in quotes with its own quotes doubled, so the output reads back through Parse CSV unchanged. The record `id` the runtime mints is not written unless you name it in Columns, because it is not a column you put there.

## When to use it

Answering with a spreadsheet: a cloud function replying to an export request, a download button in a browser app, a file written to storage. Pair it with Parse CSV for 'read a supplier's file, filter it, send it back'.

## At a glance

| | |
|---|---|
| Category | Data |
| Type name | `net.noodl.ToCSV` |
| Available in | browser, cloud |
| SSR compatibility | safe |
| Provided by | `noodl-runtime` |
| Behaviour spec | version 1 ([under the hood](#under-the-hood)) |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `columns` | Stringlist | — | Which properties to write, in order, comma separated. Leave it empty and every property found on the records is written, in the order they were first seen |
| `delimiter` | String | `,` | The character between cells. Any cell containing it is quoted automatically |
| `includeHeader` | Boolean | `true` | Write the column names as the first row |
| `items` | Array | — | The array to write. Records become rows; an array of arrays is written cell for cell |

### What each input does

**Items** (`items`)

- always: written at the end of the frame (once, however many inputs moved) — CSV, Count and Changed; nothing (undefined or null) is not written; rows that are all arrays go cell for cell with no header, anything else as records

**Columns** (`columns`)

- always: the Items are written again at the end of the frame, once any have arrived — these properties in this order (comma-separated, blanks dropped), or every property first seen when empty

**Delimiter** (`delimiter`)

- always: the Items are written again at the end of the frame, once any have arrived, with this between cells (cleared reads as a comma)

**Include Header** (`includeHeader`)

- always: the Items are written again at the end of the frame, once any have arrived, with the column names as the first row or not — rows of cells never get one

## Outputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `count` | Number | — | How many data rows were written, not counting the header row |
| `text` | String | — | The array as CSV text. Cells containing the delimiter, a quote or a newline are quoted and their quotes doubled, so this round-trips back through Parse CSV unchanged |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `changed` | Signal | — | Fires once CSV holds the freshly written text |

## Patterns

- Query Records `items` → To CSV `items`; To CSV `text` → Response `pm-csv`: an export endpoint in three nodes.
- Parse CSV → Array Filter → To CSV: read, narrow, write back. The round trip is exact, including cells containing commas, quotes and newlines.

## Watch out for

- Building CSV by joining strings in an Expression or Function node. That is the quoting rule reimplemented, and it is wrong the first time a cell contains a comma.
- Passing an array of arrays and expecting a header row. There are no column names to write; use records if you want one.

## Examples

**Write a list of records out as CSV**

Bubble's `:format as text` joins a list with a delimiter, and for a CSV export that is the version that breaks: a name containing a comma, or a note containing a newline, silently produces a file with the wrong number of columns and no error anywhere. To CSV is a real writer — any cell holding the delimiter, a quote or a newline is wrapped in quotes with its own quotes doubled, so the output reads back through Parse CSV unchanged. Columns is the input worth setting deliberately. Left empty, every property found on the records is written in the order it was first seen, which means the file's shape follows whatever the first record happened to contain — add a field to one record upstream and the export changes silently. Naming the columns fixes the order AND drops everything else, which is how you keep an internal field out of a file a customer opens. The record `id` the runtime mints is never written unless you name it, because it is not a column of your data. Count reports DATA rows, not counting the header, so it is the number to put in front of a person; a list of ten with Include Header ticked produces eleven lines and Count says 10. Both the text and the row count are published, because the thing that wants the CSV is whatever hands it to a download or a request — not this component.

## Related nodes

[Parse CSV](./net-noodl-parse-csv.md), [Static Array](./static-data.md), [Array Filter](./filter-collection.md), [Array Map](./map-collection.md)

## Code export

Exports to React. A project that uses it exports this node as React code.

[How export works](../../how-export-works.md) shows what an export writes, with a worked example.

## Under the hood

This node's behaviour is written down as an executable spec in `@nodegx/node-spec`, version 1. The spec is the reference the conformance tests grade the runtime against. Every rule in it cites the line of the runtime it was read from. The full spec is at the bottom of this page.

### What it depends on outside the node

- the shared store of Objects and Arrays, looked up by id (`registry`)

### Starting state

```json
{
  "itemsSupplied": false,
  "delimiter": ",",
  "includeHeader": true,
  "text": "",
  "scheduled": false
}
```

### How inputs are converted

Inputs not listed arrive as sent.

| Input | Conversion | What it does |
|---|---|---|
| Items (`items`) | `array-literal` | text is evaluated as a JavaScript array literal; text that does not evaluate becomes `[]` |
| Include Header (`includeHeader`) | `js-boolean` | any truthy value is `true`, anything else `false` |

## The full spec {#spec-source}

The spec's source, as the docs were generated. Helpers it imports live beside it in `packages/nodegx-node-spec/src`.

```ts title="packages/nodegx-node-spec/src/nodes/to-csv.ts"
/**
 * To CSV (`net.noodl.ToCSV`) — read from `packages/noodl-runtime/src/nodes/std-library/data/tocsv.ts`
 * and `packages/noodl-runtime/src/csv.ts` on 2026-10-01 (NSP-013).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE, before the citations: the node writes at the FRAME END, once per frame (:147-155),
 * and abstains until something has arrived on `Items` (:159 — anything but `undefined` and
 * `null`). It reads `Items` by index up to its `length` (:161-164 — a value with no `length`
 * writes nothing; a STRING writes its characters). Rows that are ALL arrays are written cell for
 * cell (:174-177 — no header, whatever `Include Header` says); anything else is read as records —
 * a registry record by its data, anything else by `Object.assign({}, item)` (:40-52: a string's
 * characters, a number's nothing) — under the `Columns` named (comma-separated, trimmed, empties
 * dropped, :168-171) or, with none, every key in first-seen order (:180-184). Then `CSV` and
 * `Count` are sent and `Changed` pulses (:187-189). `Count` is `Items`' own `length` (:133 — read
 * live, so a value with none reads as nothing and a wire keeps the last count). `Delimiter` falls
 * back to `,` when cleared (:106); `Include Header` is truthiness (:116). A string on `Items` is
 * evaluated as a literal on arrival (node.ts, coerce.ts `array-literal`).
 */

import { defineNode } from '../spec';
import { rowsToCSV, toCSV, unionOfKeys } from './csv';

type State = {
  items: unknown;
  itemsSupplied: boolean;
  columns: unknown;
  delimiter: unknown;
  includeHeader: boolean;
  text: string;
  scheduled: boolean;
}

export const ToCSV = defineNode({
  type: 'net.noodl.ToCSV',
  version: 1,
  source: 'packages/noodl-runtime/src/nodes/std-library/data/tocsv.ts; packages/noodl-runtime/src/csv.ts',
  needs: ['registry'],

  // :65-69 initialize — delimiter ',', header on, text ''
  state: { items: undefined, itemsSupplied: false, columns: undefined, delimiter: ',', includeHeader: true, text: '', scheduled: false } as State,

  inputs: {
    // :74-84 — raw (after node.ts's literal evaluation of a string)
    items: {
      type: 'array',
      coerce: 'array-literal',
      displayName: 'Items',
      group: 'General',
      description: 'The array to write. Records become rows; an array of arrays is written cell for cell',
      examples: [
        [{ name: 'Ada', team: 'x' }, { name: 'Lin', age: 9 }],
        [{ a: 'say "hi"', b: 'one,two', c: 'two\nlines' }],
        [['a', 'b'], ['1', '2']],
        [['a', 'b'], { c: 1 }],
        [{ a: null, b: undefined, c: 0 }],
        '[{"a":1}]'
      ]
    },
    // :85-96 — panel-only (`allowEditOnly`)
    columns: {
      type: 'stringlist',
      coerce: 'none',
      editOnly: true,
      displayName: 'Columns',
      group: 'General',
      description:
        'Which properties to write, in order, comma separated. Leave it empty and every property ' +
        'found on the records is written, in the order they were first seen',
      examples: ['name', 'name, team', 'team,name,missing', ' , ,', '']
    },
    // :97-109 — `value || ','` (:106)
    delimiter: { type: 'string', default: ',', coerce: 'none', displayName: 'Delimiter', group: 'General', description: 'The character between cells. Any cell containing it is quoted automatically', examples: [';', '\t'] },
    // :110-119 — `!!value` (:116)
    includeHeader: { type: 'boolean', default: true, coerce: 'js-boolean', displayName: 'Include Header', group: 'General', description: 'Write the column names as the first row' }
  },

  outputs: {
    // :122-132
    text: {
      type: 'string',
      from: (s) => s.text,
      displayName: 'CSV',
      group: 'Values',
      description:
        'The array as CSV text. Cells containing the delimiter, a quote or a newline are quoted ' +
        'and their quotes doubled, so this round-trips back through Parse CSV unchanged'
    },
    // :133-141 — `items ? items.length : 0`, live
    count: { type: 'number', from: (s) => (s.items ? (s.items as { length?: number }).length : 0), displayName: 'Count', group: 'Values', description: 'How many data rows were written, not counting the header row' },
    // :142-147
    changed: { type: 'signal', displayName: 'Changed', group: 'Events', description: 'Fires once CSV holds the freshly written text' }
  }
}).on(
  {
    items: (_s, v) => ({ says: 'always: written at the end of the frame (once, however many inputs moved) — CSV, Count and Changed; nothing (undefined or null) is not written; rows that are all arrays go cell for cell with no header, anything else as records', set: { items: v, itemsSupplied: v !== undefined && v !== null, scheduled: true }, send: [] }), // :79-83
    columns: (_s, v) => ({ says: 'always: the Items are written again at the end of the frame, once any have arrived — these properties in this order (comma-separated, blanks dropped), or every property first seen when empty', set: { columns: v, scheduled: true }, send: [] }), // :92-95
    delimiter: (_s, v) => ({ says: 'always: the Items are written again at the end of the frame, once any have arrived, with this between cells (cleared reads as a comma)', set: { delimiter: v || ',', scheduled: true }, send: [] }), // :105-108
    includeHeader: (_s, v) => ({ says: 'always: the Items are written again at the end of the frame, once any have arrived, with the column names as the first row or not — rows of cells never get one', set: { includeHeader: v, scheduled: true }, send: [] }) // :115-118
  },
  {
    // :147-155 `_schedule` → :156-190 `_render`
    afterInputs: (s, _i, w) => {
      const idle = { set: { scheduled: false }, send: [] as Array<'text'> };
      if (!s.scheduled || !s.itemsSupplied) return idle; // :159

      const source = s.items as { length?: number; [i: number]: unknown } | undefined;
      const length = source ? source.length || 0 : 0;
      const items: unknown[] = [];
      for (let i = 0; i < length; i++) items.push(source![i]); // :161-164

      const declared = String(s.columns || '')
        .split(',')
        .map((c) => c.trim())
        .filter((c) => c.length > 0); // :168-171

      const isRowsOfCells = items.length > 0 && items.every((item) => Array.isArray(item)); // :176

      let text: string;
      if (isRowsOfCells) {
        text = rowsToCSV(items as unknown[][], { delimiter: s.delimiter }); // :179
      } else {
        // :40-52 toPlainRecord — a registry record by its data, anything else by Object.assign
        const records = items.map((item) => (item === null || item === undefined ? {} : w.registry.isRecord(item) ? Object.assign({}, item.data) : Object.assign({}, item as Record<string, unknown>)));
        text = toCSV(records, { columns: declared.length ? declared : unionOfKeys(records), delimiter: s.delimiter, includeHeader: s.includeHeader }); // :181-185
      }
      return { set: { scheduled: false, text }, send: ['text', 'count'], emit: ['changed'] }; // :187-189
    }
  }
);
```


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
