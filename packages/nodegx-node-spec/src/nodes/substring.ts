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
