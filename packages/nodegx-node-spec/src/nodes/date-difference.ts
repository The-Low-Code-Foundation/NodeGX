/**
 * Date Difference (`net.noodl.DateDifference`) — read from
 * `packages/noodl-runtime/src/nodes/std-library/date/datedifference.ts` and `date/datemath.ts` on
 * 2026-10-01 (NSP-013).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE, before the citations: the node recomputes in every setter and ABSTAINS until both
 * `From` and `To` have arrived (:134 — anything but `undefined`, `null`, `''`). Then: a side that
 * could not be read clears `Difference` and pulses `Invalid Date` (:136-142); otherwise
 * `Difference` is `To` − `From` in `Unit` (date-math.ts `differenceBetween` — exact and
 * fractional in a fixed unit, whole calendar steps in months and years), made positive when
 * `Absolute` is on (:144-145 `Math.abs`), and `Changed` pulses (:147). A `Unit` that is empty or not
 * one of the eight counts as days (datemath.ts `unitOrDays`); `Absolute` is truthiness (:118 `!!value`).
 *
 * An unknown `Unit` also shows the editor a warning until it is fixed (`setDiagnostic`, not on the
 * wire). v1 graded it as the runtime then did it: it missed every fixed unit and landed on the
 * month path, whose last line read anything but `'months'` as YEARS — NSP-013 §6 row D15, fixed in
 * P109 ISL-026 with Date Add's C16.
 */

import { defineNode } from '../spec';
import { DATE_EXAMPLES, differenceBetween, isDateUnit, supplied, toDate, UNIT_VALUES, unknownUnitMessage } from './date-math';

type State = {
  from: Date | undefined;
  to: Date | undefined;
  fromSupplied: boolean;
  toSupplied: boolean;
  unit: unknown;
  absolute: boolean;
  difference: number | undefined;
}

/** :132-148 `_recompute`, over the state the setter has just changed (`delta` is what it stored). */
function recompute(s: State, delta: Partial<State>): { says: string; set: Partial<State>; send: Array<'difference'>; emit?: Array<'changed' | 'failure'> } {
  const n = { ...s, ...delta };
  if (!n.fromSupplied || !n.toSupplied) return { says: 'From or To not given yet: kept for when both are; nothing is sent', set: delta, send: [] }; // :134
  if (n.from === undefined || n.to === undefined) return { says: 'either cannot be read as a date: Difference goes empty', set: { ...delta, difference: undefined }, send: ['difference'], emit: ['failure'] }; // :138-142
  const value = differenceBetween(n.from, n.to, isDateUnit(n.unit) ? n.unit : 'days'); // :144, `unitOrDays` — v2 (D15)
  return { says: 'otherwise Difference is To minus From in Unit (days when not one of the eight), negative when To is earlier unless Absolute is on', set: { ...delta, difference: n.absolute ? Math.abs(value) : value }, send: ['difference'], emit: ['changed'] }; // :145-147
}

export const DateDifference = defineNode({
  type: 'net.noodl.DateDifference',
  // v2 (P109 ISL-026, P107-D15 ruled "Use days and warn once", with Date Add's C16): a Unit that is not one of
  // the eight counts as days. In v1 it counted as YEARS.
  version: 3,
  changes: [
    {
      version: 3,
      says: 'A Unit that is not one of the eight now shows as the node\'s warning in this spec, as the runtime has shown it since v2. Before, the spec left it out',
      row: 'NSP-019 R35 (P107 s102)',
      migration: { none: 'Only the editor is told, and the runtime already told it. Nothing a wire carries changes' }
    }
  ],
  // the Unit setter (:75, `setDiagnostic('date-difference/unknown-unit', unknownUnitMessage(value))`): the last Unit that arrived, as it arrived
  diagnostics: {
    'date-difference/unknown-unit': { says: 'Unit is not one of the eight', settings: ['unit'], message: (_i, s) => unknownUnitMessage(s.unit) }
  },
  source: 'packages/noodl-runtime/src/nodes/std-library/date/datedifference.ts; packages/noodl-runtime/src/nodes/std-library/date/datemath.ts',
  needs: ['timezone'],

  // :40-43 initialize — unit 'days', absolute false
  state: { from: undefined, to: undefined, fromSupplied: false, toSupplied: false, unit: 'days', absolute: false, difference: undefined } as State,

  inputs: {
    // :45-55
    from: { type: 'date', coerce: 'none', examples: DATE_EXAMPLES, displayName: 'From', group: 'General', description: 'The earlier instant, in the reading that makes Difference positive' },
    // :56-66
    to: { type: 'date', coerce: 'none', examples: DATE_EXAMPLES, displayName: 'To', group: 'General', description: 'The later instant. Difference is negative when this is actually earlier than From' },
    // :67-80 — stored raw (:77)
    unit: {
      type: 'enum',
      enums: UNIT_VALUES,
      default: 'days',
      coerce: 'none',
      displayName: 'Unit',
      group: 'General',
      description:
        'What Difference counts. Fixed units are exact and fractional (36 hours is 1.5 days); months ' +
        'and years are whole calendar steps',
      examples: ['not-a-unit']
    },
    // :81-91 — `!!value` (:88)
    absolute: { type: 'boolean', default: false, coerce: 'js-boolean', displayName: 'Absolute', group: 'General', description: 'Drop the sign, so the output is a distance rather than a direction' }
  },

  outputs: {
    // :94-102
    difference: { type: 'number', from: (s) => s.difference, displayName: 'Difference', group: 'Values', description: 'To minus From, counted in Unit. Unset while either date is missing or unreadable' },
    // :103-108
    changed: { type: 'signal', displayName: 'Changed', group: 'Events', description: 'Fires after Difference has been recomputed' },
    // :109-114
    failure: { type: 'signal', displayName: 'Invalid Date', group: 'Events', description: 'Fires when a date arrived that could not be read, leaving Difference unset' }
  }
}).on({
  from: (s, v) => recompute(s, { fromSupplied: supplied(v), from: toDate(v) }), // :50-54
  to: (s, v) => recompute(s, { toSupplied: supplied(v), to: toDate(v) }), // :61-65
  unit: (s, v) => recompute(s, { unit: v }), // :76-79
  absolute: (s, v) => recompute(s, { absolute: v }) // :87-90
});
