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
    text: (_s, v) => ({ set: { text: v, textSupplied: v !== undefined && v !== null, scheduled: true }, send: [] }), // :84-88
    hasHeader: (_s, v) => ({ set: { hasHeader: v, scheduled: true }, send: [] }), // :97-100
    delimiter: (_s, v) => ({ set: { delimiter: v || ',', scheduled: true }, send: [] }) // :108-111
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
