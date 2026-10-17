---
title: "JSON Stream Parser"
---
JSON Stream Parser: turns stream fragments into JSON values as NDJSON, concatenated values, or one whole document.

Each `parse` appends the current `chunk` to a buffer and extracts whatever is now complete. 'NDJSON' takes one value per line and reports a line that does not parse rather than skipping it silently. 'Stream' accepts any concatenation of complete top-level values — whitespace-separated objects, or a JSON array whose elements are emitted as they close — and is safe at every chunk boundary, including one that falls inside a string. 'Single document' holds everything back until the whole buffer is one complete value, then emits it. Text that is not yet a complete value stays in the buffer and shows on `pendingCharacters`; `maxLength` stops a malformed stream from growing without bound by clearing the buffer and reporting it. `values` carries everything the last parse completed, `parsed` the last of them.

## When to use it

A stream whose payloads are JSON but do not arrive one-per-event: NDJSON logs, a chunked HTTP body, an array streamed element by element. Not needed for Server-Sent Events with one JSON object per event — that node already parses each payload onto its Data output.

## At a glance

| | |
|---|---|
| Category | Data |
| Type name | `net.noodl.JSONStreamParser` |
| Available in | browser, cloud |
| SSR compatibility | safe |
| Provided by | `noodl-runtime` |
| Behaviour spec | version 1 ([under the hood](#under-the-hood)) |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `chunk` | String | — | The next fragment of the stream; boundaries may fall anywhere, including inside a string |
| `format` | Enum (`ndjson`, `stream`, `single`) | `ndjson` | How values are framed on this stream: one per line, any concatenation of complete values, or one whole document |
| `maxLength` | Number | `1048576` | Cap on unparsed text held while a value completes; exceeding it clears the buffer and reports an error rather than growing forever |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `clear` | Signal | — | Discards the pending text, the parsed values and the error counter |
| `parse` | Signal | — | Appends the current Chunk and emits every value that is now complete; the chunk is retained between pulses |

### What each input does

**Chunk** (`chunk`)

- always: kept as text (nothing as empty) for the next Parse, and retained after it — a second Parse appends it again

**Format** (`format`)

- always: read at the next Parse — one value per line, any run of complete values, or one whole document (empty reads as NDJSON; anything else as Stream)

**Max Pending (characters)** (`maxLength`)

- always: read at the next Parse — the pending text a Parse gives up on when longer (not above 0: no cap)

**Parse** (`parse`)

- nothing pending and an empty Chunk: nothing to read → Unchanged; Success stays silent
- the Chunk appended makes the pending text longer than Max Pending: all of it is dropped unread, the reason on Error, Error Count grows — Pending Characters and Is Complete are not re-sent → Failure; Success stays silent
- some values came out complete and something would not parse (a bad line, or a value that scans whole but is not JSON): the values are on Values and Parsed, the last reason on Error, Error Count grows by each — the Parse still fails → Success, Failure
- at least one value came out complete and nothing failed: Values holds them, Parsed the last, Value Count grows; what is left waits as Pending Characters → Success, Done
- nothing came out complete and something would not parse: the last reason on Error, Error Count grows by each → Failure; Success stays silent
- no value is complete yet and nothing failed: the text waits as Pending Characters, Is Complete false → Done; Success stays silent

**Clear** (`clear`)

- anything pending, parsed or failed: the pending text, Values, both counts and the Error are emptied — Parsed keeps its last value on the wire, and the Chunk is retained → Cleared, Done
- nothing held: the same empty values are sent again → Cleared, Unchanged

## Outputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `isComplete` | Boolean | — | True when the last Parse left nothing pending, so every value so far was whole |
| `parsed` | * | — | The last complete value the most recent Parse produced |
| `pendingCharacters` | Number | — | Text held back because a value is not complete yet; persistently non-zero means Format does not match the stream |
| `valueCount` | Number | — | How many values have been parsed since the last Clear, across every Parse |
| `values` | Array | — | Every value completed by the most recent Parse, in order |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `cleared` | Signal | — | Fires once the pending text and the values have been discarded |
| `completed` | Signal | — | Fires after every invocation, whatever the outcome — wire this to carry on regardless. Failure still fires and still carries its reason, so this cannot hide an error |
| `done` | Signal | — | Fires when a Parse consumed text or a Clear discarded something; Success is narrower and fires only when values came out |
| `success` | Signal | — | Fires when a Parse yielded at least one value, so a chunk that merely advanced an incomplete value stays quiet |
| `unchanged` | Signal | — | Fires when there was nothing pending to parse, or nothing to clear — a valid action with nothing to do |

### Failure outputs

| Name | Type | Default | Description |
|---|---|---|---|
| `error` | String | — | Why the last value or line would not parse; kept until the next failure or a Clear |
| `errorCount` | Number | — | How many values have failed to parse since the last Clear |
| `failure` | Signal | — | Fires once when a Parse could not read part of its input, or when the pending text exceeded Max Pending; Error Count says how many |

## Patterns

- Server-Sent Events `data` → `chunk`, `onMessage` → `parse`, format NDJSON: a log stream that arrives several lines per event.
- `values` → For Each `items` renders everything a chunk completed, instead of only the last value.
- `pendingCharacters` on a debug Text output makes a format mismatch obvious instead of looking like a dead stream.

## Watch out for

- Using 'Single document' on a never-ending stream — the buffer grows until Max Pending trips.
- Reading only `parsed` when a chunk can complete several values; the earlier ones are then silently ignored.
- Adding this after Server-Sent Events when each event is already one JSON object — the SSE node's Data output has parsed it.

## Examples

**Long-running task monitor: progress, batched log lines, and a visible connection**

A backend job streams two kinds of frame on one connection. Pattern Extractor pulls the percentage out of human-readable status text, so a progress bar tracks it without a Function node. JSON Stream Parser turns NDJSON log payloads into values — several may complete in one frame, so `values` rather than `parsed` is what feeds downstream. Stream Buffer batches those into a flush every 250 ms, which keeps a busy log from repainting the list hundreds of times a second, and the stream's `onClose` flushes the tail that never reached a full batch.

## Related nodes

[Server-Sent Events](./net-noodl-sse.md), [Text Accumulator](./net-noodl-text-accumulator.md), [Stream Buffer](./net-noodl-stream-buffer.md), [REST](./rest2.md)

## Code export

Exports to React. A project that uses it exports this node as React code.

## Under the hood

This node's behaviour is written down as an executable spec in `@nodegx/node-spec`, version 1. The spec is the reference: the runtime, the React export and the conformance tests are all graded against it. Every rule in it cites the line of the runtime it was read from. The full spec is at the bottom of this page.

### What it depends on outside the node

Nothing. Its outputs depend only on its inputs and its own state.

### Starting state

```json
{
  "pendingChunk": "",
  "buffer": "",
  "format": "ndjson",
  "maxLength": 1048576,
  "values": [],
  "totalValues": 0,
  "error": "",
  "errorCount": 0,
  "isComplete": false
}
```

### How actions report back

Each time Parse or Clear is triggered, the node reports exactly one of **Done**, **Unchanged** or **Failure**.

## The full spec {#spec-source}

The spec's source, as the docs were generated. Helpers it imports live beside it in `packages/nodegx-node-spec/src`.

```ts title="packages/nodegx-node-spec/src/nodes/json-stream-parser.ts"
/**
 * JSON Stream Parser (`net.noodl.JSONStreamParser`) — read from
 * `packages/noodl-runtime/src/nodes/std-library/agent/json-stream-parser.ts` and `stream-parsers.ts`
 * on 2026-10-01 (NSP-013).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE, before the citations: `Chunk` is KEPT as text (`null` / `undefined` → `''`, anything
 * else `String(value)`, :79-81) and every `Parse` appends it again — the chunk is retained between
 * pulses, so two Parses with one chunk append it twice (:117-127, :250-251). A Parse with nothing
 * pending is `unchanged` (:252-257). Past `Max Pending` (0 = no cap, anything not above 0 reads as
 * 0, :112-114) the buffer is dropped, the reason goes on `Error`, `Error Count` grows and the
 * Parse fails — `Pending Characters` and `Is Complete` are NOT re-sent on that path (:259-272).
 * Otherwise the buffer is read by `Format` (anything falsy reads `ndjson`, :98-100; a value that is
 * none of the three reads as `stream`, the `else` at :295): NDJSON splits on `\n`, keeps the last
 * piece, and parses each non-blank line strictly (:277-286); Stream scans every complete top-level
 * value with array framing (:295-300); Single scans without framing and, when ANY value is
 * complete, takes the FIRST and keeps what the scan left — which is `''` once the scan reached the
 * end, so a second complete document in the same buffer is dropped; when none is complete, the
 * buffer stays as it was, a malformed document in it included (:287-294). Then `Is Complete` and
 * `Pending Characters` are sent (:302-304); values, if any, replace `Values`, the last is `Parsed`
 * and `Value Count` grows (:306-313); each error sets `Error` and grows `Error Count` (:315-316,
 * :341-347); `Success` pulses when values came out (:320); the outcome is `failure`
 * (`json-stream-parser/parse-failed`) when any error was recorded, else `done` (:322, :333-339).
 * `Clear` empties the buffer, the values, the error and both counts — NOT `Parsed`, and not the
 * retained chunk — pulses `Cleared`, and is `done` when anything was there, else `unchanged`
 * (:349-369).
 *
 * C17 (§6.2, ruled "fix it" and fixed s16): a stray `}` (Stream), or a stray `}`, `]` or `,`
 * (Single), where a value should start records the scanner's error once and steps over the
 * character (stream-parsers.ts, marked). The runtime looped forever on the main thread before.
 */

import { defineNode } from '../spec';
import { scanJsonValues, splitDelimited, tryParseJson } from './stream-parsers';

/** :29 */
export const PARSE_ERROR_CODE = 'json-stream-parser/parse-failed';

type State = {
  pendingChunk: string;
  buffer: string;
  format: unknown;
  maxLength: number;
  parsed: unknown;
  values: readonly unknown[];
  totalValues: number;
  error: string;
  errorCount: number;
  isComplete: boolean;
}

export const JSONStreamParser = defineNode({
  type: 'net.noodl.JSONStreamParser',
  version: 1,
  source: 'packages/noodl-runtime/src/nodes/std-library/agent/json-stream-parser.ts; stream-parsers.ts',

  // :43-55 initialize
  state: { pendingChunk: '', buffer: '', format: 'ndjson', maxLength: 1024 * 1024, parsed: undefined, values: [], totalValues: 0, error: '', errorCount: 0, isComplete: false } as State,
  outcomes: ['done', 'unchanged', 'failure'], // :239-244

  inputs: {
    // :74-82
    chunk: {
      type: 'string',
      coerce: 'none',
      displayName: 'Chunk',
      group: 'Data',
      description: 'The next fragment of the stream; boundaries may fall anywhere, including inside a string',
      examples: ['{"a":1}\n', '{"a":', '1}\n{"b":2}\n', 'not json\n', '[1,2', ',3]', '"a \\"q\\" b"', '12', ' 7 ', '{"x":"}"}', '\n', '{bad}', 'true null ', '}', '"s",', '1}']
    },
    // :84-101 — `value || 'ndjson'`
    format: {
      type: 'enum',
      enums: ['ndjson', 'stream', 'single'],
      default: 'ndjson',
      coerce: 'none',
      displayName: 'Format',
      group: 'Config',
      description: 'How values are framed on this stream: one per line, any concatenation of complete values, or one whole document'
    },
    // :103-115 — `Number(value) > 0 ? Number(value) : 0`
    maxLength: {
      type: 'number',
      default: 1024 * 1024,
      coerce: 'none',
      displayName: 'Max Pending (characters)',
      group: 'Config',
      description: 'Cap on unparsed text held while a value completes; exceeding it clears the buffer and reports an error rather than growing forever',
      examples: [0, 4, 12, 30, -1]
    },
    // :117-127
    parse: { type: 'signal', outcome: true, displayName: 'Parse', group: 'Actions', description: 'Appends the current Chunk and emits every value that is now complete; the chunk is retained between pulses' },
    // :129-136
    clear: { type: 'signal', outcome: true, displayName: 'Clear', group: 'Actions', description: 'Discards the pending text, the parsed values and the error counter' }
  },

  outputs: {
    parsed: { type: '*', from: (s) => s.parsed, displayName: 'Parsed', group: 'Data', description: 'The last complete value the most recent Parse produced' },
    values: { type: 'array', from: (s) => s.values, displayName: 'Values', group: 'Data', description: 'Every value completed by the most recent Parse, in order' },
    valueCount: { type: 'number', from: (s) => s.totalValues, displayName: 'Value Count', group: 'Status', description: 'How many values have been parsed since the last Clear, across every Parse' },
    pendingCharacters: {
      type: 'number',
      from: (s) => s.buffer.length,
      displayName: 'Pending Characters',
      group: 'Status',
      description: 'Text held back because a value is not complete yet; persistently non-zero means Format does not match the stream'
    },
    isComplete: { type: 'boolean', from: (s) => s.isComplete, displayName: 'Is Complete', group: 'Status', description: 'True when the last Parse left nothing pending, so every value so far was whole' },
    error: { type: 'string', from: (s) => s.error, displayName: 'Error', group: 'Status', description: 'Why the last value or line would not parse; kept until the next failure or a Clear' },
    errorCount: { type: 'number', from: (s) => s.errorCount, displayName: 'Error Count', group: 'Status', description: 'How many values have failed to parse since the last Clear' },
    success: { type: 'signal', displayName: 'Success', group: 'Events', description: 'Fires when a Parse yielded at least one value, so a chunk that merely advanced an incomplete value stays quiet' },
    cleared: { type: 'signal', displayName: 'Cleared', group: 'Events', description: 'Fires once the pending text and the values have been discarded' }
  }
}).on({
  chunk: (_s, v) => ({ says: 'always: kept as text (nothing as empty) for the next Parse, and retained after it — a second Parse appends it again', set: { pendingChunk: v === undefined || v === null ? '' : String(v) }, send: [] }), // :79-81
  format: (_s, v) => ({ says: 'always: read at the next Parse — one value per line, any run of complete values, or one whole document (empty reads as NDJSON; anything else as Stream)', set: { format: v || 'ndjson' }, send: [] }), // :98-100
  maxLength: (_s, v) => ({ says: 'always: read at the next Parse — the pending text a Parse gives up on when longer (not above 0: no cap)', set: { maxLength: Number(v) > 0 ? Number(v) : 0 }, send: [] }), // :112-114

  // :122-126 → :248-323 (NSP-018: the tail's ternaries as literal arms — values or none, errors or none)
  parse: (s) => {
    const buffer = s.pendingChunk !== '' ? s.buffer + s.pendingChunk : s.buffer; // :250-251
    if (buffer === '') return { says: 'nothing pending and an empty Chunk: nothing to read', send: [], outcome: 'unchanged' }; // :252-257

    if (s.maxLength > 0 && buffer.length > s.maxLength) {
      // :259-272 — the reason, then failure; Pending Characters and Is Complete are not flagged here
      const error = 'Gave up on ' + s.maxLength + '+ characters of unparsed text; check the Format setting';
      return { says: 'the Chunk appended makes the pending text longer than Max Pending: all of it is dropped unread, the reason on Error, Error Count grows — Pending Characters and Is Complete are not re-sent', set: { buffer: '', error, errorCount: s.errorCount + 1 }, send: ['error', 'errorCount'], outcome: 'failure', error: PARSE_ERROR_CODE };
    }

    const values: unknown[] = [];
    const errors: string[] = [];
    let rest = buffer;
    if (s.format === 'ndjson') {
      // :277-286
      const split = splitDelimited(buffer, '\n');
      rest = split.rest;
      for (const line of split.messages) {
        const trimmed = line.trim();
        if (trimmed === '') continue;
        const outcome = tryParseJson(trimmed);
        if (outcome.ok) values.push(outcome.value);
        else errors.push('Line did not parse as JSON: ' + outcome.error);
      }
    } else if (s.format === 'single') {
      // :287-294 — the first complete value; the buffer moves only when one was found
      const scan = scanJsonValues(buffer, { arrayFraming: false });
      if (scan.values.length > 0) {
        values.push(scan.values[0]);
        rest = scan.rest;
      }
      for (const e of scan.errors) errors.push(e);
    } else {
      // :295-300 — `stream`, and any format that is none of the three
      const scan = scanJsonValues(buffer, { arrayFraming: true });
      rest = scan.rest;
      for (const v of scan.values) values.push(v);
      for (const e of scan.errors) errors.push(e);
    }

    const read: Partial<State> = { buffer: rest, isComplete: rest.length === 0 }; // :302 — then :303-304 sent
    // :306-313 — the values replace Values, the last is Parsed, Value Count grows
    const got: Partial<State> = { values, parsed: values[values.length - 1], totalValues: s.totalValues + values.length };
    // :315-316 → :341-347, once per error: the last message stands
    const failed: Partial<State> = { error: errors[errors.length - 1], errorCount: s.errorCount + errors.length };
    // :320, :322 → :333-339
    if (values.length > 0 && errors.length > 0) return { says: 'some values came out complete and something would not parse (a bad line, or a value that scans whole but is not JSON): the values are on Values and Parsed, the last reason on Error, Error Count grows by each — the Parse still fails', set: { ...read, ...got, ...failed }, send: ['isComplete', 'pendingCharacters', 'parsed', 'values', 'valueCount', 'error', 'errorCount'], emit: ['success'], outcome: 'failure', error: PARSE_ERROR_CODE };
    if (values.length > 0) return { says: 'at least one value came out complete and nothing failed: Values holds them, Parsed the last, Value Count grows; what is left waits as Pending Characters', set: { ...read, ...got }, send: ['isComplete', 'pendingCharacters', 'parsed', 'values', 'valueCount'], emit: ['success'], outcome: 'done' };
    if (errors.length > 0) return { says: 'nothing came out complete and something would not parse: the last reason on Error, Error Count grows by each', set: { ...read, ...failed }, send: ['isComplete', 'pendingCharacters', 'error', 'errorCount'], emit: [], outcome: 'failure', error: PARSE_ERROR_CODE };
    return { says: 'no value is complete yet and nothing failed: the text waits as Pending Characters, Is Complete false', set: read, send: ['isComplete', 'pendingCharacters'], emit: [], outcome: 'done' };
  },

  // :133-135 → :349-369
  clear: (s) => {
    const hadSomething = s.buffer !== '' || s.values.length > 0 || s.errorCount > 0 || s.totalValues > 0; // :351-352
    const set: Partial<State> = { buffer: '', values: [], parsed: undefined, error: '', errorCount: 0, totalValues: 0, isComplete: false }; // :353-359
    if (hadSomething) return { says: 'anything pending, parsed or failed: the pending text, Values, both counts and the Error are emptied — Parsed keeps its last value on the wire, and the Chunk is retained', set, send: ['values', 'valueCount', 'pendingCharacters', 'isComplete', 'error', 'errorCount'], emit: ['cleared'], outcome: 'done' }; // :361-368 — not `parsed`
    return { says: 'nothing held: the same empty values are sent again', set, send: ['values', 'valueCount', 'pendingCharacters', 'isComplete', 'error', 'errorCount'], emit: ['cleared'], outcome: 'unchanged' }; // :368
  }
});
```


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
