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
    items: (_s, v) => ({ set: { items: v, itemsSupplied: v !== undefined && v !== null, scheduled: true }, send: [] }), // :79-83
    columns: (_s, v) => ({ set: { columns: v, scheduled: true }, send: [] }), // :92-95
    delimiter: (_s, v) => ({ set: { delimiter: v || ',', scheduled: true }, send: [] }), // :105-108
    includeHeader: (_s, v) => ({ set: { includeHeader: v, scheduled: true }, send: [] }) // :115-118
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
