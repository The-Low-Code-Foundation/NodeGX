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
    type: (_s, v) => ({ set: { type: v }, send: [] }), // :99-101
    csv: (_s, v) => ({ set: { csv: v, scheduled: true }, send: [] }), // :110-113
    json: (_s, v) => ({ set: { json: v, scheduled: true }, send: [] }) // :122-125
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
