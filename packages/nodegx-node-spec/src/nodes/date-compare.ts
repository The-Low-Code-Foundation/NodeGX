/**
 * Date Compare (`net.noodl.DateCompare`) — read from
 * `packages/noodl-runtime/src/nodes/std-library/date/datecompare.ts` and `date/datemath.ts` on
 * 2026-10-01 (NSP-013).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE, before the citations: the node recomputes in every setter and ABSTAINS until BOTH
 * `Date` and `Compare To` have arrived (:154 — anything but `undefined`, `null`, `''`). Then: a
 * side that could not be read clears all three answers and pulses `Invalid Date` (:156-166);
 * otherwise both instants are truncated to `Granularity` in the world's zone (date-math.ts
 * `truncateTo`; a granularity not in the list truncates nothing) and compared: `Is Before`,
 * `Is After`, `Is Same` are sent first, then EXACTLY ONE of `On Same`, `On Before`, `On After`
 * (:168-182 — same wins, then before). `Granularity` is stored raw; an empty one reads as
 * millisecond (:168 `|| 'millisecond'`).
 */

import { defineNode } from '../spec';
import { type CompareGranularity, DATE_EXAMPLES, GRANULARITY_VALUES, supplied, toDate, truncateTo } from './date-math';

type State = {
  a: Date | undefined;
  b: Date | undefined;
  aSupplied: boolean;
  bSupplied: boolean;
  granularity: unknown;
  before: boolean | undefined;
  after: boolean | undefined;
  same: boolean | undefined;
}

type Answers = Array<'before' | 'after' | 'same'>;
const ANSWERS: Answers = ['before', 'after', 'same'];

/** :153-183 `_recompute`, over the state the setter has just changed (`delta` is what it stored). */
function recompute(s: State, delta: Partial<State>): { set: Partial<State>; send: Answers; emit?: Array<'isSame' | 'isBefore' | 'isAfter' | 'failure'> } {
  const n = { ...s, ...delta };
  if (!n.aSupplied || !n.bSupplied) return { set: delta, send: [] }; // :154
  if (n.a === undefined || n.b === undefined) return { set: { ...delta, before: undefined, after: undefined, same: undefined }, send: ANSWERS, emit: ['failure'] }; // :158-166
  const granularity = (n.granularity || 'millisecond') as CompareGranularity; // :168
  const left = truncateTo(n.a, granularity);
  const right = truncateTo(n.b, granularity);
  const before = left < right;
  const after = left > right;
  const same = left === right; // :172-174
  // :180-182 — values first, then exactly one signal
  return { set: { ...delta, before, after, same }, send: ANSWERS, emit: [same ? 'isSame' : before ? 'isBefore' : 'isAfter'] };
}

export const DateCompare = defineNode({
  type: 'net.noodl.DateCompare',
  version: 1,
  source: 'packages/noodl-runtime/src/nodes/std-library/date/datecompare.ts; packages/noodl-runtime/src/nodes/std-library/date/datemath.ts',
  needs: ['timezone'],

  // :38-40 initialize — granularity 'millisecond'
  state: { a: undefined, b: undefined, aSupplied: false, bSupplied: false, granularity: 'millisecond', before: undefined, after: undefined, same: undefined } as State,

  inputs: {
    // :42-52
    a: { type: 'date', coerce: 'none', examples: DATE_EXAMPLES, displayName: 'Date', group: 'General', description: 'The instant being asked about' },
    // :53-63
    b: { type: 'date', coerce: 'none', examples: DATE_EXAMPLES, displayName: 'Compare To', group: 'General', description: 'The instant it is compared against' },
    // :64-94 — stored raw (:91)
    granularity: {
      type: 'enum',
      enums: GRANULARITY_VALUES,
      default: 'millisecond',
      coerce: 'none',
      displayName: 'Granularity',
      group: 'General',
      description:
        'How coarsely to compare. Day answers "is this the same day", which is almost always the ' +
        'question — two instants are hardly ever the same millisecond'
    }
  },

  outputs: {
    // :97-105
    before: { type: 'boolean', from: (s) => s.before, displayName: 'Is Before', group: 'Values', description: 'True when Date is earlier than Compare To, at this Granularity' },
    // :106-114
    after: { type: 'boolean', from: (s) => s.after, displayName: 'Is After', group: 'Values', description: 'True when Date is later than Compare To, at this Granularity' },
    // :115-123
    same: { type: 'boolean', from: (s) => s.same, displayName: 'Is Same', group: 'Values', description: 'True when the two land in the same Granularity bucket — the same day, month or year' },
    // :124-129
    isBefore: { type: 'signal', displayName: 'On Before', group: 'Events', description: 'Fires after a comparison that came out Before' },
    // :130-135
    isAfter: { type: 'signal', displayName: 'On After', group: 'Events', description: 'Fires after a comparison that came out After' },
    // :136-141
    isSame: { type: 'signal', displayName: 'On Same', group: 'Events', description: 'Fires after a comparison that came out Same' },
    // :142-147
    failure: { type: 'signal', displayName: 'Invalid Date', group: 'Events', description: 'Fires when a date arrived that could not be read, leaving all three answers unset' }
  }
}).on({
  a: (s, v) => recompute(s, { aSupplied: supplied(v), a: toDate(v) }), // :47-51
  b: (s, v) => recompute(s, { bSupplied: supplied(v), b: toDate(v) }), // :58-62
  granularity: (s, v) => recompute(s, { granularity: v }) // :90-93
});
