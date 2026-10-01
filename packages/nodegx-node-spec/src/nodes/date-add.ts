/**
 * Date Add (`net.noodl.DateAdd`) — read from `packages/noodl-runtime/src/nodes/std-library/date/dateadd.ts`
 * and `date/datemath.ts` on 2026-10-01 (NSP-013).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE, before the citations: the node recomputes in EVERY setter (:52-80) and ABSTAINS
 * until something has arrived on `Date` (:118-121 — `inputSupplied`: anything but `undefined`,
 * `null` and `''`; a declared default never runs a setter, so a node nobody wired says nothing).
 * Once supplied: a `Date` that could not be read (date-math.ts `toDate`) clears `Result` and
 * pulses `Invalid Date` (:123-128); otherwise `Result` is `Date` + `Amount` of `Unit` (date-math.ts
 * `addToDate` — months and years CLAMP) and `Changed` pulses (:130-133). `Amount` is `Number(value)`
 * on arrival (:65) and a non-finite amount adds 0 (:130); `Unit` is stored raw and an empty one
 * reads as days (:131 `|| 'days'`). The calendar is the world's zone (world.ts TIME ZONE).
 *
 * ⚠️ A `Unit` that is not one of the eight and not empty — a wire can carry any string — THROWS
 * inside the setter (datemath.ts :88 `Unknown unit`), after the unit was stored (:77-78): the
 * runtime target dies at that step and every later recompute throws again. A throw is not a
 * behaviour a wire can carry: the spec stores the unit and abstains from the recompute, and the
 * runtime's throw is NSP-013 §6 row C16, counted by the runner.
 */

import { defineNode } from '../spec';
import { addToDate, DATE_EXAMPLES, isDateUnit, supplied, toDate, UNIT_VALUES } from './date-math';

type State = {
  input: Date | undefined;
  inputSupplied: boolean;
  amount: number;
  unit: unknown;
  result: Date | undefined;
}

/** :118-133 `_recompute`, over the state the setter has just changed (`delta` is what it stored). */
function recompute(s: State, delta: Partial<State>): { set: Partial<State>; send: Array<'result'>; emit?: Array<'changed' | 'failure'> } {
  const n = { ...s, ...delta };
  if (!n.inputSupplied) return { set: delta, send: [] }; // :121
  if (n.input === undefined) return { set: { ...delta, result: undefined }, send: ['result'], emit: ['failure'] }; // :123-128
  const amount = Number.isFinite(n.amount) ? n.amount : 0; // :130
  const unit = n.unit || 'days'; // :131
  if (!isDateUnit(unit)) return { set: delta, send: [] }; // row C16 — the runtime throws here
  return { set: { ...delta, result: addToDate(n.input, amount, unit) }, send: ['result'], emit: ['changed'] }; // :131-133
}

export const DateAdd = defineNode({
  type: 'net.noodl.DateAdd',
  version: 1,
  source: 'packages/noodl-runtime/src/nodes/std-library/date/dateadd.ts; packages/noodl-runtime/src/nodes/std-library/date/datemath.ts',
  needs: ['timezone'],

  // :39-42 initialize — amount 0, unit 'days'; nothing has arrived
  state: { input: undefined, inputSupplied: false, amount: 0, unit: 'days', result: undefined } as State,

  inputs: {
    // :44-57 — `toDate(value)` (:56); supplied = not undefined / null / ''
    input: {
      type: 'date',
      coerce: 'none',
      examples: DATE_EXAMPLES,
      displayName: 'Date',
      group: 'General',
      description: 'The instant to shift. A string or a millisecond timestamp arriving here is read as a date'
    },
    // :58-68 — `Number(value)` (:65)
    amount: {
      type: 'number',
      default: 0,
      coerce: 'js-number',
      displayName: 'Amount',
      group: 'General',
      description: 'How much to add. Negative subtracts. Months and years use whole steps'
    },
    // :69-81 — stored raw (:77)
    unit: {
      type: 'enum',
      enums: UNIT_VALUES,
      default: 'days',
      coerce: 'none',
      displayName: 'Unit',
      group: 'General',
      description:
        'What Amount counts. Months and years are calendar steps and CLAMP: 31 January plus one month ' +
        'is 28 (or 29) February, never 2 March'
    }
  },

  outputs: {
    // :84-91
    result: { type: 'date', from: (s) => s.result, displayName: 'Result', group: 'Values', description: 'Date shifted by Amount of Unit, or unset when Date could not be read' },
    // :92-97
    changed: { type: 'signal', displayName: 'Changed', group: 'Events', description: 'Fires after Result has been recomputed, whichever input caused it' },
    // :98-103
    failure: { type: 'signal', displayName: 'Invalid Date', group: 'Events', description: 'Fires when Date could not be read, leaving Result unset' }
  }
}).on({
  input: (s, v) => recompute(s, { inputSupplied: supplied(v), input: toDate(v) }), // :51-56
  amount: (s, v) => recompute(s, { amount: v }), // :64-66
  unit: (s, v) => recompute(s, { unit: v }) // :76-78
});
