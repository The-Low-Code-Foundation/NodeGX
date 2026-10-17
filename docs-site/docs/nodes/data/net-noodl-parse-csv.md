---
title: "Parse CSV"
---
Turns CSV text that arrived at runtime into an array — records when the first row is a header, rows of cells when it is not.

Parse CSV reads CSV text into an array. With Has Header ticked (the default) the first row names the properties and Items is an array of records; untick it and Items is an array of rows, each an array of cells. It handles the awkward parts of the format properly: quoted cells, cells containing the delimiter, cells containing newlines, and doubled quotes. Every cell comes out a string — there is no type inference, so a column that looks numeric yields "42" and not 42; use an Expression or Array Map if you need numbers. A leading byte-order mark, which is what Excel writes when it saves UTF-8, is stripped so the first column keeps its name. A quote the parser cannot pair is a Failure with the line number, not a half-read file: without that check the text around the stray quote simply disappears and the array looks plausible. This is the same parser Static Array has always used, so an authored CSV and a received one cannot disagree. In a cloud function, remember the request body limit is 10 MB — a bigger file has to arrive through file storage instead.

## When to use it

A CSV arriving from anywhere at runtime: a request body, an upload, an HTTP response, a file read from storage. For a CSV you type in yourself, Static Array is the node — it is this parser with an editor field in front of it.

## At a glance

| | |
|---|---|
| Category | Data |
| Type name | `net.noodl.ParseCSV` |
| Available in | browser, cloud |
| SSR compatibility | safe |
| Provided by | `noodl-runtime` |
| Behaviour spec | version 1 ([under the hood](#under-the-hood)) |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `delimiter` | String | `,` | The character between cells. Use ; for a European export, or a tab for TSV |
| `hasHeader` | Boolean | `true` | When ticked the first row names the columns and Items is an array of records. Untick it and Items is an array of rows, each an array of cells |
| `text` | String | — | The CSV text to parse. A leading byte-order mark — which is what Excel writes when it saves UTF-8 — is stripped, so the first column keeps its name |

### What each input does

**CSV** (`text`)

- always: parsed at the end of the frame (once, however many inputs moved) — Items, Count and Changed, or Error and Failure with Items and Count untouched; nothing (undefined or null) is not parsed, a number parses as its text

**Has Header** (`hasHeader`)

- always: the CSV is parsed again at the end of the frame, once any has arrived — the first row names the columns and Items holds records in a fresh array, or Items holds the rows as arrays of cells

**Delimiter** (`delimiter`)

- always: the CSV is parsed again at the end of the frame, once any has arrived, split on this (cleared reads as a comma)

## Outputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `count` | Number | — | How many rows the last successful parse produced, not counting the header row |
| `items` | Array | — | The parsed rows — records when Has Header is ticked, arrays of cells when it is not. Every cell is a string, including columns that look numeric. Unchanged while the CSV cannot be parsed |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `changed` | Signal | — | Fires once Items and Count hold the freshly parsed CSV |

### Failure outputs

| Name | Type | Default | Description |
|---|---|---|---|
| `error` | String | — | Why the CSV could not be parsed, naming the line it gave up on; empty until a parse fails |
| `failure` | Signal | — | Fires when the CSV could not be parsed, leaving Items and Count as they were |

## Patterns

- Request `pm-csv` → Parse CSV `text`; Parse CSV `items` → Array Filter → To CSV → Response: the whole 'someone sent us a spreadsheet' shape, with no Function node.
- Wire `failure` somewhere that answers the caller. A function whose only wired path is the happy one hangs forever when the file is malformed (CWF-018).

## Watch out for

- Expecting numeric columns to arrive as numbers. Every cell is a string; convert explicitly.
- Splitting on commas with a String node instead. That breaks on the first quoted cell containing a comma, which is the first real file you will meet.
- Posting a CSV larger than 10 MB to a cloud function. The body limit rejects it with a 413 before the graph runs.

## Examples

**Let someone paste a CSV and read it into records**

Parse CSV is the node for CSV that ARRIVES at runtime — pasted, uploaded or fetched — as opposed to Static Data, which is for CSV you type into the graph while building. With Has Header ticked the first row names the properties and Items is an array of records; untick it and Items is an array of rows, each an array of cells. The one thing to plan for is that every cell comes out a STRING: there is no type inference, so a column that looks numeric gives you "42" and not 42, and a comparison against a number will be false everywhere until you convert. That is a deliberate choice rather than an omission — guessing types is how a column of postcodes loses its leading zeros. Two more behaviours that save a support ticket each: a leading byte-order mark, which is exactly what Excel writes when it saves UTF-8, is stripped so the first column keeps its name rather than becoming a field nothing matches; and Delimiter needs changing to `;` for many European exports, where a comma is the decimal separator. Failure leaves Items and Count holding what they held before, which is why the error is logged rather than ignored — without that wire, a paste that fails to parse looks exactly like a paste that did nothing, and the person tries again with the same file.

## Related nodes

[To CSV](./net-noodl-to-csv.md), [Static Array](./static-data.md), [Array Filter](./filter-collection.md), [Array Map](./map-collection.md)

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
  "textSupplied": false,
  "hasHeader": true,
  "delimiter": ",",
  "count": 0,
  "scheduled": false
}
```

### How inputs are converted

Inputs not listed arrive as sent.

| Input | Conversion | What it does |
|---|---|---|
| Has Header (`hasHeader`) | `js-boolean` | any truthy value is `true`, anything else `false` |

## The full spec {#spec-source}

The spec's source, as the docs were generated. Helpers it imports live beside it in `packages/nodegx-node-spec/src`.

```ts title="packages/nodegx-node-spec/src/nodes/parse-csv.ts"
/**
 * Parse CSV (`net.noodl.ParseCSV`) — read from
 * `packages/noodl-runtime/src/nodes/std-library/data/parsecsv.ts` and `packages/noodl-runtime/src/csv.ts`
 * on 2026-10-01 (NSP-013).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE, before the citations: the node parses at the FRAME END, once per frame however many
 * of its three inputs moved (:166-175), and abstains until something has arrived on `CSV`
 * (:179 — anything but `undefined` and `null`; a number parses as its text). A parse that gave up
 * on an unpaired quote (csv.ts `parseCSV`) sets `Error` to the sentence naming the line, raises
 * `parse-csv/parse-failed` on the runtime error channel (an effect beside the trace) and pulses
 * `Failure`, leaving `Items` and `Count` as they were (:183-192). A parse that read the whole
 * text clears `Error` (sent — a wire keeps the last reason) and, with `Has Header` on, makes the
 * rows after the first into records in a FRESH anonymous array (:198-204 — `Collection.get()`,
 * one guid draw, then `set`, one draw per record, so `Items` is REPLACED every time); with it off,
 * `Items` is the rows themselves, plain arrays of cells (:205-210). `Count` is the number of data
 * rows; then `Changed` (:213-215). `Delimiter` falls back to `,` when cleared (:109); `Has
 * Header` is truthiness (:98).
 */

import { defineNode } from '../spec';
import { CSV_EXAMPLES, parseCSV, rowsToRecords } from './csv';
import { errorOutput } from './data-base';

/** :41 — the runtime error code the failed parse raises (an effect; the runtime target keeps it on the handle). */
export const PARSE_ERROR_CODE = 'parse-csv/parse-failed';

type State = {
  text: unknown;
  textSupplied: boolean;
  hasHeader: boolean;
  delimiter: unknown;
  /** The anonymous array of the last successful header parse, by id — or the plain rows. */
  collectionId: string | undefined;
  rows: string[][] | undefined;
  count: number;
  lastError: string | undefined;
  scheduled: boolean;
}

export const ParseCSV = defineNode({
  type: 'net.noodl.ParseCSV',
  version: 1,
  source: 'packages/noodl-runtime/src/nodes/std-library/data/parsecsv.ts; packages/noodl-runtime/src/csv.ts',
  needs: ['registry', 'random'],

  // :67-71 initialize — hasHeader true, delimiter ',', count 0
  state: { text: undefined, textSupplied: false, hasHeader: true, delimiter: ',', collectionId: undefined, rows: undefined, count: 0, lastError: undefined, scheduled: false } as State,

  inputs: {
    // :77-89 — raw; supplied = not undefined / null
    text: {
      type: 'string',
      coerce: 'none',
      examples: CSV_EXAMPLES,
      displayName: 'CSV',
      group: 'General',
      description:
        'The CSV text to parse. A leading byte-order mark — which is what Excel writes when it ' +
        'saves UTF-8 — is stripped, so the first column keeps its name'
    },
    // :90-102 — `!!value` (:98)
    hasHeader: {
      type: 'boolean',
      default: true,
      coerce: 'js-boolean',
      displayName: 'Has Header',
      group: 'General',
      description:
        'When ticked the first row names the columns and Items is an array of records. Untick it ' +
        'and Items is an array of rows, each an array of cells'
    },
    // :103-112 — `value || ','` (:109)
    delimiter: { type: 'string', default: ',', coerce: 'none', displayName: 'Delimiter', group: 'General', description: 'The character between cells. Use ; for a European export, or a tab for TSV', examples: [';', '\t', '|'] }
  },

  outputs: {
    // :115-126
    items: {
      type: 'array',
      from: (s, w) => (s.collectionId !== undefined ? w.registry.collection(s.collectionId) : s.rows),
      displayName: 'Items',
      group: 'Values',
      description:
        'The parsed rows — records when Has Header is ticked, arrays of cells when it is not. ' +
        'Every cell is a string, including columns that look numeric. Unchanged while the CSV ' +
        'cannot be parsed'
    },
    // :127-135
    count: { type: 'number', from: (s) => s.count, displayName: 'Count', group: 'Values', description: 'How many rows the last successful parse produced, not counting the header row' },
    // :136-141
    changed: { type: 'signal', displayName: 'Changed', group: 'Events', description: 'Fires once Items and Count hold the freshly parsed CSV' },
    // :142-147 — a plain signal, no invocation behind it
    failure: { type: 'signal', displayName: 'Failure', group: 'Events', description: 'Fires when the CSV could not be parsed, leaving Items and Count as they were' },
    // :148-156
    error: errorOutput('Why the CSV could not be parsed, naming the line it gave up on; empty until a parse fails', (s: { lastError: unknown }) => s.lastError)
  }
}).on(
  {
    text: (_s, v) => ({ says: 'always: parsed at the end of the frame (once, however many inputs moved) — Items, Count and Changed, or Error and Failure with Items and Count untouched; nothing (undefined or null) is not parsed, a number parses as its text', set: { text: v, textSupplied: v !== undefined && v !== null, scheduled: true }, send: [] }), // :84-88
    hasHeader: (_s, v) => ({ says: 'always: the CSV is parsed again at the end of the frame, once any has arrived — the first row names the columns and Items holds records in a fresh array, or Items holds the rows as arrays of cells', set: { hasHeader: v, scheduled: true }, send: [] }), // :97-100
    delimiter: (_s, v) => ({ says: 'always: the CSV is parsed again at the end of the frame, once any has arrived, split on this (cleared reads as a comma)', set: { delimiter: v || ',', scheduled: true }, send: [] }) // :108-111
  },
  {
    // :166-175 `_schedule` → :176-215 `_parse`
    afterInputs: (s, _i, w) => {
      const idle = { set: { scheduled: false }, send: [] as Array<'error'> };
      if (!s.scheduled || !s.textSupplied) return idle; // :179

      const result = parseCSV(s.text, s.delimiter); // :181
      if (result.error) {
        // :184-191 — the reason on Error, the runtime error raised (an effect), Failure; Items and Count untouched
        return { set: { scheduled: false, lastError: result.error.message }, send: ['error'], emit: ['failure'] };
      }

      if (s.hasHeader) {
        const records = rowsToRecords(result.rows); // :198
        const collection = w.registry.collection(); // :201 — anonymous, a fresh array every parse
        collection.set(records); // :202
        return { set: { scheduled: false, lastError: undefined, collectionId: collection.getId(), rows: undefined, count: records.length }, send: ['error', 'items', 'count'], emit: ['changed'] }; // :194-195, :203-204, :212-214
      }
      // :205-210 — rows of cells stay plain nested arrays
      return { set: { scheduled: false, lastError: undefined, collectionId: undefined, rows: result.rows, count: result.rows.length }, send: ['error', 'items', 'count'], emit: ['changed'] };
    }
  }
);
```


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
