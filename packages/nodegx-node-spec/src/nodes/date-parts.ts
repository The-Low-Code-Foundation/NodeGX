/**
 * Date Parts (`net.noodl.DateParts`) — read from
 * `packages/noodl-runtime/src/nodes/std-library/date/dateparts.ts` and `date/datemath.ts` on
 * 2026-10-01 (NSP-013).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE, before the citations: one `Date` in, eleven parts out, every part read from the
 * SAME instant in the world's zone (:12-15 "local zone, like the rest of the date family";
 * world.ts TIME ZONE). The node abstains until something arrives on `Date` (:201); then every
 * part is sent (:203 — a part of an unreadable date reads as nothing, `input && …`, so a wire
 * keeps the last readable part), and ONE signal follows: `Invalid Date` when the date could not
 * be read (:205-208), `Changed` otherwise (:209). `Month` is 1–12 (:84); `Day of Week` is
 * JavaScript's 0–6 Sunday-first (:138); `Day Name` is English (:149); `ISO Week` is ISO-8601
 * (date-math.ts `isoWeek`); `Timestamp` is epoch milliseconds (:171).
 */

import { defineNode } from '../spec';
import { DATE_EXAMPLES, isoWeek, supplied, toDate } from './date-math';

/** :24 */
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** :35-47 — every derived output, so the sends and the getters cannot fall out of step. */
const PART_OUTPUTS = ['year', 'month', 'date', 'hours', 'minutes', 'seconds', 'milliseconds', 'dayOfWeek', 'dayName', 'isoWeek', 'timestamp'] as const;

type State = {
  input: Date | undefined;
  inputSupplied: boolean;
}

export const DateParts = defineNode({
  type: 'net.noodl.DateParts',
  version: 1,
  source: 'packages/noodl-runtime/src/nodes/std-library/date/dateparts.ts; packages/noodl-runtime/src/nodes/std-library/date/datemath.ts',
  needs: ['timezone'],

  state: { input: undefined, inputSupplied: false } as State,

  inputs: {
    // :56-66
    input: { type: 'date', coerce: 'none', examples: DATE_EXAMPLES, displayName: 'Date', group: 'General', description: 'The instant to take apart. A string or a millisecond timestamp here is read as a date' }
  },

  outputs: {
    // :69-76 — `input && input.getFullYear()`; an unreadable date reads as nothing
    year: { type: 'number', from: (s) => s.input && s.input.getFullYear(), displayName: 'Year', group: 'Values', description: 'Four-digit year, in the host s local zone' },
    // :77-84
    month: { type: 'number', from: (s) => s.input && s.input.getMonth() + 1, displayName: 'Month', group: 'Values', description: 'Month as 1-12 — January is 1, not 0' },
    // :85-93
    date: { type: 'number', from: (s) => s.input && s.input.getDate(), displayName: 'Day of Month', group: 'Values', description: 'Day of the month, 1-31' },
    // :94-102
    hours: { type: 'number', from: (s) => s.input && s.input.getHours(), displayName: 'Hours', group: 'Values', description: 'Hour of the day, 0-23' },
    // :103-111
    minutes: { type: 'number', from: (s) => s.input && s.input.getMinutes(), displayName: 'Minutes', group: 'Values', description: 'Minutes past the hour, 0-59' },
    // :112-120
    seconds: { type: 'number', from: (s) => s.input && s.input.getSeconds(), displayName: 'Seconds', group: 'Values', description: 'Seconds past the minute, 0-59' },
    // :121-129
    milliseconds: { type: 'number', from: (s) => s.input && s.input.getMilliseconds(), displayName: 'Milliseconds', group: 'Values', description: 'Milliseconds past the second, 0-999' },
    // :130-138
    dayOfWeek: { type: 'number', from: (s) => s.input && s.input.getDay(), displayName: 'Day of Week', group: 'Values', description: 'Day of the week as 0-6, Sunday first — JavaScript s own numbering' },
    // :139-147
    dayName: { type: 'string', from: (s) => s.input && DAY_NAMES[s.input.getDay()], displayName: 'Day Name', group: 'Values', description: 'The English name of the weekday. For a localised name, format through Date To String' },
    // :148-156
    isoWeek: { type: 'number', from: (s) => s.input && isoWeek(s.input), displayName: 'ISO Week', group: 'Values', description: 'ISO-8601 week number, 1-53: weeks start on Monday and week 1 holds the first Thursday' },
    // :157-165
    timestamp: { type: 'number', from: (s) => s.input && s.input.getTime(), displayName: 'Timestamp', group: 'Values', description: 'The instant as milliseconds since 1 January 1970 UTC' },
    // :166-171
    changed: { type: 'signal', displayName: 'Changed', group: 'Events', description: 'Fires after a new Date has been taken apart and every part output is up to date' },
    // :172-177
    failure: { type: 'signal', displayName: 'Invalid Date', group: 'Events', description: 'Fires when a date arrived that could not be read, leaving every part unset' }
  }
}).on({
  // :61-65 then :200-210 `_recompute`
  input: (_s, v) => {
    const inputSupplied = supplied(v);
    const input = toDate(v);
    if (!inputSupplied) return { set: { input, inputSupplied }, send: [] }; // :201
    return { set: { input, inputSupplied }, send: [...PART_OUTPUTS], emit: [input === undefined ? 'failure' : 'changed'] }; // :203-209
  }
});
