/**
 * Substring — read from `packages/noodl-runtime/src/nodes/std-library/substring.ts` on 2026-09-30
 * (NSP-011).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * The getter computes lazily and caches (:89-105); a wire cannot see the cache, so here `result`
 * is a function of the three inputs. The runtime's `substr` is kept verbatim (:94, :96-99) —
 * negative Start counts from the end, End is exclusive, and `end === -1` (strict, on the RAW
 * value: `'-1'` is not `-1`) means "to the end".
 *
 * ⚠️ The `string` setter calls `value.toString()` (:77) — `null` and `undefined` THROW inside the
 * setter, and the port description says so ("it must not be cleared to null, which raises an
 * error"). A throw is not a behaviour a wire can carry: the spec leaves the string as it was
 * (nothing was stored), and the runtime's throw is NSP-011 §6 row C4, counted by the runner.
 */

import { defineNode } from '../spec';

/** :92-102 — `substr(start)` when End is -1, else `substr(start, end - start)`; raw values, JS's own conversions. */
export function substringOf(str: string, start: unknown, end: unknown): string {
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- the runtime's call, verbatim (:94, :96)
  return end === -1 ? str.substr(start as number) : str.substr(start as number, (end as number) - (start as number));
}

export const Substring = defineNode({
  type: 'Substring',
  version: 1,
  source: 'packages/noodl-runtime/src/nodes/std-library/substring.ts',

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
    // :65-81 — `value.toString()` (:77): a string for anything that has one; null/undefined throw (row C4)
    string: {
      type: 'string',
      default: '',
      coerce: 'none',
      displayName: 'String',
      group: 'Values',
      description: 'Text to take the substring from; it must not be cleared to null, which raises an error rather than yielding an empty result'
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
  start: (_s, v) => ({ set: { start: v } }),
  end: (_s, v) => ({ set: { end: v } }),
  // :76-80 — `toString()` throws on null/undefined before anything is stored; the spec abstains there
  string: (_s, v) => (v === null || v === undefined ? {} : { set: { str: String(v) } })
});
