/**
 * The date family's arithmetic — read from `packages/noodl-runtime/src/nodes/std-library/date/datemath.ts`
 * on 2026-10-01 (NSP-013). Every function is the runtime's, kept verbatim: a transcription of
 * date arithmetic is exactly the kind of work that reads correctly and runs wrong (the export's
 * date-family test says the same and grades its copy differentially), so nothing here is
 * "tidied".
 *
 * THE RULES, before the citations:
 *   - a `date` port carries a `Date`; a STRING arriving is parsed with `new Date(text)`, a
 *     NUMBER is epoch milliseconds; `undefined`, `null`, `''`, a non-finite number, a `Date` that
 *     will not parse and anything else READ AS NOTHING (`toDate` → `undefined`) — which is the
 *     family's only validity check and what drives every `Invalid Date` signal (:46-64);
 *   - fixed units (milliseconds … weeks) are exact; MONTHS AND YEARS CLAMP to the end of the
 *     target month — 31 January + 1 month is 28 (29) February, never 2 March (:71-90);
 *   - a difference in a fixed unit divides exactly and is never rounded (36 hours is 1.5 days);
 *     in months or years it is the number of WHOLE steps that do not overshoot (:98-115);
 *   - truncation to a granularity and the ISO week read the HOST'S LOCAL ZONE (:127-172) — under
 *     a world that zone is the script's (world.ts TIME ZONE), never the machine's;
 *   - an UNKNOWN unit THROWS in `addToDate` (:88) and is read as YEARS by `differenceBetween`
 *     (:115 — the month path, then `unit === 'months' ? whole : trunc(whole / 12)`).
 */

/** :26 */
export type DateUnit = 'milliseconds' | 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'years';

/** :29-36 — fixed-length units, in milliseconds. `months` and `years` are deliberately absent. */
const FIXED_MS: Partial<Record<DateUnit, number>> = {
  milliseconds: 1,
  seconds: 1000,
  minutes: 60 * 1000,
  hours: 60 * 60 * 1000,
  days: 24 * 60 * 60 * 1000,
  weeks: 7 * 24 * 60 * 60 * 1000
};

/** :39-48 — the enum's values, in the order the four nodes offer them. */
export const UNIT_VALUES = ['milliseconds', 'seconds', 'minutes', 'hours', 'days', 'weeks', 'months', 'years'] as const;

/** Whether `addToDate` accepts the unit (anything else throws at :88). */
export function isDateUnit(unit: unknown): unit is DateUnit {
  return (UNIT_VALUES as readonly unknown[]).includes(unit);
}

/** :56-64 */
export function toDate(value: unknown): Date | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? undefined : value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return undefined;
    const fromNumber = new Date(value);
    return Number.isNaN(fromNumber.getTime()) ? undefined : fromNumber;
  }
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }
  return undefined;
}

/** The family's "something arrived" test (dateadd.ts :54, datecompare.ts :48, datedifference.ts :51, dateparts.ts :60). */
export function supplied(value: unknown): boolean {
  return value !== undefined && value !== null && value !== '';
}

/** :71-90 — months and years clamp; an unknown unit throws. */
export function addToDate(date: Date, amount: number, unit: DateUnit): Date {
  const fixed = FIXED_MS[unit];
  if (fixed !== undefined) return new Date(date.getTime() + amount * fixed);

  const whole = Math.trunc(amount);
  const result = new Date(date.getTime());
  const dayOfMonth = result.getDate();

  result.setDate(1);
  if (unit === 'months') result.setMonth(result.getMonth() + whole);
  else if (unit === 'years') result.setFullYear(result.getFullYear() + whole);
  else throw new Error(`Unknown unit "${unit}".`);

  const lastDayOfTargetMonth = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(dayOfMonth, lastDayOfTargetMonth));
  return result;
}

/** :98-115 — exact in a fixed unit; whole steps that do not overshoot in months (an unknown unit lands on the years path). */
export function differenceBetween(from: Date, to: Date, unit: DateUnit): number {
  const fixed = FIXED_MS[unit];
  if (fixed !== undefined) return (to.getTime() - from.getTime()) / fixed;

  const sign = to.getTime() >= from.getTime() ? 1 : -1;
  const monthsApart = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth()) - (sign > 0 ? 0 : 0);

  let whole = monthsApart;
  if (sign > 0 && addToDate(from, whole, 'months').getTime() > to.getTime()) whole -= 1;
  if (sign < 0 && addToDate(from, whole, 'months').getTime() < to.getTime()) whole += 1;

  return unit === 'months' ? whole : Math.trunc(whole / 12);
}

/** :118 */
export type CompareGranularity = 'millisecond' | 'second' | 'minute' | 'hour' | 'day' | 'month' | 'year';

/** datecompare.ts :73-81 — the enum's values. */
export const GRANULARITY_VALUES = ['millisecond', 'second', 'minute', 'hour', 'day', 'month', 'year'] as const;

/**
 * :127-150 — in the host's local zone. The runtime's `switch` falls through from the coarsest
 * case down to `second`; written here as the same ordered list of resets (this package compiles
 * with `noFallthroughCasesInSwitch`), so a granularity not in the list resets nothing — exactly
 * what a `switch` with no `default` does.
 */
const RESETS: ReadonlyArray<[CompareGranularity, (d: Date) => void]> = [
  ['year', (d) => d.setMonth(0)],
  ['month', (d) => d.setDate(1)],
  ['day', (d) => d.setHours(0)],
  ['hour', (d) => d.setMinutes(0)],
  ['minute', (d) => d.setSeconds(0)],
  ['second', (d) => d.setMilliseconds(0)]
];
export function truncateTo(date: Date, granularity: CompareGranularity): number {
  const d = new Date(date.getTime());
  const from = RESETS.findIndex(([g]) => g === granularity);
  if (from >= 0) for (let i = from; i < RESETS.length; i++) RESETS[i][1](d);
  return d.getTime();
}

/** :153-160 — ISO-8601: weeks start Monday, week 1 holds the first Thursday; local zone. */
export function isoWeek(date: Date): number {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const firstThursday = new Date(d.getFullYear(), 0, 4);
  firstThursday.setDate(firstThursday.getDate() + 3 - ((firstThursday.getDay() + 6) % 7));
  return 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000));
}

/**
 * What the GENERATOR draws on a `date` port of this family, beside the type's pool (spec.ts
 * `examples`): the export's date-family grid (month-ends, a leap day, New Year's Eve), as UTC
 * instants so the draw does not depend on the machine's zone, plus the instants either side of a
 * DST change in the two DST zones the world's pool names (NSP-013 §3: "one with a DST change
 * inside the range").
 */
export const DATE_EXAMPLES: readonly unknown[] = Object.freeze([
  '2024-01-31T13:45:30.123Z', // 31 January, a leap year
  '2024-02-29T00:00:00.000Z', // 29 February
  '2023-02-28T23:59:59.999Z', // 28 February, not a leap year
  '2024-03-31T12:00:00.000Z', // 31 March
  '2024-04-30T06:30:00.000Z', // 30 April
  '2025-12-31T23:00:00.000Z', // New Year's Eve
  '2026-03-29T00:30:00.000Z', // Europe/Paris: 30 minutes before the clocks go forward
  '2026-03-29T01:30:00.000Z', // Europe/Paris: 30 minutes after
  '2026-10-25T00:30:00.000Z', // Europe/Paris: 30 minutes before the clocks go back
  '2026-03-08T06:30:00.000Z', // America/New_York: 30 minutes before the clocks go forward
  '2026-11-01T05:30:00.000Z', // America/New_York: 30 minutes before the clocks go back
  new Date('2020-07-15T09:15:45.500Z'), // an ordinary day, as a Date
  new Date('1999-09-01T00:00:00.001Z')
]);
