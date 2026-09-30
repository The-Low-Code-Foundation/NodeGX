/**
 * Inverter — read from `packages/noodl-runtime/src/nodes/std-library/inverter.ts` on 2026-09-30
 * (NSP-011).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * The one thing worth a sentence: the `undefined` passthrough (:5-9). An Inverter that has never
 * received a value reports `undefined`, not `true` — so nothing is published until the first
 * value (C3), and the description says so.
 */

import { defineNode } from '../spec';

/** :10-15 — `undefined` stays `undefined`; everything else is `!value`. */
export function invert(value: unknown): boolean | undefined {
  return value === undefined ? undefined : !value;
}

export const Inverter = defineNode({
  type: 'Inverter',
  version: 1,
  source: 'packages/noodl-runtime/src/nodes/std-library/inverter.ts',

  // initialize (:27-29): currentValue undefined
  state: { value: undefined as unknown },
  // :30-32
  inspect: (s) => String(invert(s.value)),

  inputs: {
    // :34-45 — the setter stores what arrived (:42); truthiness is applied at read (:14)
    value: {
      type: 'boolean',
      coerce: 'none',
      displayName: 'Value',
      group: 'Values',
      description: 'Value to negate; anything falsy counts as false, and leaving it unset keeps Result unset too'
    }
  },

  outputs: {
    // :48-56 getter → `invert(currentValue)`
    result: {
      type: 'boolean',
      from: (s) => invert(s.value),
      displayName: 'Result',
      group: 'Values',
      description: 'The opposite of Value, and unset rather than true while Value has never been set'
    }
  }
}).on({
  // :41-44 — store, flag `result` (every write, even the same value; the wire dedups)
  value: (_s, v) => ({ set: { value: v } })
});
