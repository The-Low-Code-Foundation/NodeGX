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

type Port = 'parsed' | 'values' | 'valueCount' | 'pendingCharacters' | 'isComplete' | 'error' | 'errorCount';

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
  chunk: (_s, v) => ({ set: { pendingChunk: v === undefined || v === null ? '' : String(v) }, send: [] }), // :79-81
  format: (_s, v) => ({ set: { format: v || 'ndjson' }, send: [] }), // :98-100
  maxLength: (_s, v) => ({ set: { maxLength: Number(v) > 0 ? Number(v) : 0 }, send: [] }), // :112-114

  // :122-126 → :248-323
  parse: (s) => {
    const buffer = s.pendingChunk !== '' ? s.buffer + s.pendingChunk : s.buffer; // :250-251
    if (buffer === '') return { send: [], outcome: 'unchanged' }; // :252-257

    if (s.maxLength > 0 && buffer.length > s.maxLength) {
      // :259-272 — the reason, then failure; Pending Characters and Is Complete are not flagged here
      const error = 'Gave up on ' + s.maxLength + '+ characters of unparsed text; check the Format setting';
      return { set: { buffer: '', error, errorCount: s.errorCount + 1 }, send: ['error', 'errorCount'], outcome: 'failure', error: PARSE_ERROR_CODE };
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

    const set: Partial<State> = { buffer: rest, isComplete: rest.length === 0 }; // :302
    const send: Port[] = ['isComplete', 'pendingCharacters']; // :303-304
    if (values.length > 0) {
      // :306-313
      set.values = values;
      set.parsed = values[values.length - 1];
      set.totalValues = s.totalValues + values.length;
      send.push('parsed', 'values', 'valueCount');
    }
    if (errors.length > 0) {
      // :315-316 → :341-347, once per error: the last message stands
      set.error = errors[errors.length - 1];
      set.errorCount = s.errorCount + errors.length;
      send.push('error', 'errorCount');
    }
    const emit = values.length > 0 ? (['success'] as const) : ([] as const); // :320
    // :322 → :333-339
    return errors.length > 0 ? { set, send, emit, outcome: 'failure', error: PARSE_ERROR_CODE } : { set, send, emit, outcome: 'done' };
  },

  // :133-135 → :349-369
  clear: (s) => {
    const hadSomething = s.buffer !== '' || s.values.length > 0 || s.errorCount > 0 || s.totalValues > 0; // :351-352
    return {
      set: { buffer: '', values: [], parsed: undefined, error: '', errorCount: 0, totalValues: 0, isComplete: false }, // :353-359
      send: ['values', 'valueCount', 'pendingCharacters', 'isComplete', 'error', 'errorCount'], // :361-366 — not `parsed`
      emit: ['cleared'], // :367
      outcome: hadSomething ? 'done' : 'unchanged' // :368
    };
  }
});
