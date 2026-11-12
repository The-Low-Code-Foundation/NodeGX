/**
 * P132 BWF-004: formulas — small computations in a step's settings, without code.
 *
 * WHY THIS MODULE EXISTS
 * ----------------------
 * Most of what a person computes between two steps is small: a total, a name
 * joined to a greeting, the days since a plant was watered, "is this empty".
 * Until now each of those was a cloud function or a `transform` step's JSON, and
 * Richard's ruling R2 (P132) asked for the middle way: *"a small fixed set of
 * formulas (maths, joining text, dates, is empty), no JavaScript in a setting."*
 *
 * The no-eval rule in `values.ts` STANDS. A formula is a NAME looked up in the
 * closed table below, with declared arguments; nothing here parses or evaluates
 * a string. An unknown name is refused when the workflow is saved and fails
 * loudly if one ever reaches a run, exactly like the transform's operations.
 *
 * THE FORM, AND WHY IT IS NOT THE TRANSFORM'S
 * -------------------------------------------
 * A formula is written `{"$fn": "<name>", "args": [<value>, …]}`, each arg itself
 * a value (a literal, a `$path`, or another formula). The transform's operations
 * are written `{"$upper": …}` instead, and that form CANNOT be switched on
 * everywhere: an object whose sole key starts with `$` is data in an ordinary
 * step param (a function may well be handed `{"$in": [...]}`), so reading every
 * such object as an operation would break definitions that already run. `$fn`
 * is ONE reserved key, so it can be on in every param and every condition
 * operand without reinterpreting anything else. The transform keeps its own
 * shorthand; `$fn` works inside a transform's fields too.
 *
 * LOUDNESS
 * --------
 * A formula that cannot be computed (a divide by zero, a date that is not one,
 * text where a number belongs) throws a `FormulaError` naming the formula in its
 * words, which fails the step and goes down its `onError` route like any step
 * failure. Absence is ordinary, as everywhere in this language: *First* of an
 * empty list is nothing, *Is empty* answers it, *First that is not empty* is how
 * a value is made optional, and *Text with values* leaves a missing value out.
 *
 * Dates are read as ISO text (`2026-11-03`, `2026-11-03T08:00:00Z`), epoch
 * milliseconds, or a record's `{ "__type": "Date", "iso": … }`, and every date a
 * formula produces is ISO text, which the condition language already orders as
 * an instant. All date arithmetic is in UTC.
 *
 * @module nodegx-backend/workflow/steps/formulas
 */

import { deepEqual, isEmptyValue } from './conditions';
import { getPath, isPlainObject, MAX_VALUE_DEPTH } from './values';

/** Thrown when a formula cannot be computed. A loud step failure, routed by `onError`. */
export class FormulaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FormulaError';
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * What an argument takes. `numbers` is a number OR a list of them (so *Largest*
 * of a list and *Largest* of three values are one formula); `choice` is one of
 * the arg's `oneOf` words (a unit, a named format).
 */
export type FormulaArgType = 'any' | 'text' | 'number' | 'numbers' | 'boolean' | 'date' | 'list' | 'choice';

/** What a formula gives back, for a write-time check of a formula nested in another. */
export type FormulaReturnType = 'any' | 'text' | 'number' | 'boolean' | 'date' | 'list';

export interface FormulaArg {
  name: string;
  /** What an editor writes beside the slot. */
  label: string;
  type: FormulaArgType;
  /** May be left out (only trailing args are). */
  optional?: boolean;
  /** The last arg only: takes one or more values. */
  repeats?: boolean;
  /** `choice` only: the words it accepts. */
  oneOf?: readonly string[];
}

interface FormulaDef {
  group: 'text' | 'numbers' | 'logic' | 'dates' | 'lists';
  /** The formula in words, for a picker: "Time between". */
  label: string;
  /**
   * The formula drawn as a sentence, `{argName}` standing for each argument, so
   * every reader draws it the same way: "{unit} between {from} and {to}". An
   * optional arg sits last, in a clause of its own (", to {places} decimal
   * places"), which a reader leaves out when the arg is.
   */
  sentence: string;
  args: readonly FormulaArg[];
  returns: FormulaReturnType;
  description: string;
  example: unknown;
  apply(args: unknown[], name: string): unknown;
}

// ---------------------------------------------------------------------------
// Reading arguments — shared, so every formula fails the same way
// ---------------------------------------------------------------------------

function describe(v: unknown): string {
  if (v === undefined) return 'nothing (the value is missing)';
  if (v === null) return 'nothing (null)';
  if (typeof v === 'string') return v.length > 60 ? JSON.stringify(`${v.slice(0, 60)}…`) : JSON.stringify(v);
  if (Array.isArray(v)) return 'a list';
  if (typeof v === 'object') return 'an object';
  return String(v);
}

/**
 * An object with one `$` key in a formula's args is someone else's shorthand (a transform's `{"$default": …}`), which
 * is data here. BWF-004 AC4's agent wrote one and read only "got an object"; say what to write instead.
 */
function dollarHint(v: unknown): string {
  if (!isPlainObject(v)) return '';
  const keys = Object.keys(v);
  if (keys.length !== 1 || !keys[0].startsWith('$')) return '';
  const name = keys[0].slice(1);
  return Object.prototype.hasOwnProperty.call(FORMULA_DEFS, name)
    ? ` (${JSON.stringify(keys[0])} is a transform's shorthand, data inside a formula: write {"$fn": "${name}", "args": [...]})`
    : ` (${JSON.stringify(keys[0])} is not a formula: a formula is {"$fn": "<name>", "args": [...]})`;
}

function argLabel(name: string, i: number): string {
  const def = FORMULA_DEFS[name];
  const args = def.args;
  const arg = args[Math.min(i, args.length - 1)];
  return arg.repeats && i >= args.length - 1 ? `${arg.label} ${i - args.length + 2}` : arg.label;
}

function fail(name: string, i: number, wanted: string, got: unknown, hint = ''): never {
  throw new FormulaError(
    `"${FORMULA_DEFS[name].label}" needs ${wanted} for ${argLabel(name, i)}, got ${describe(got)}.${hint}`
  );
}

const MISSING_HINT = ' A value that may be missing needs "First that is not empty" (default) around it.';

function asText(v: unknown, name: string, i: number): string {
  if (typeof v === 'string') return v;
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  if (typeof v === 'boolean') return String(v);
  return fail(name, i, 'text', v, v === undefined || v === null ? MISSING_HINT : '');
}

function asNumber(v: unknown, name: string, i: number): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v.trim());
    if (Number.isFinite(n)) return n;
  }
  return fail(name, i, 'a number', v, v === undefined || v === null ? MISSING_HINT : '');
}

function asList(v: unknown, name: string, i: number): unknown[] {
  if (Array.isArray(v)) return v;
  return fail(name, i, 'a list', v, v === undefined || v === null ? MISSING_HINT : '');
}

function asBoolean(v: unknown, name: string, i: number): boolean {
  if (typeof v === 'boolean') return v;
  return fail(name, i, 'true or false', v);
}

function asChoice(v: unknown, name: string, i: number): string {
  const arg = FORMULA_DEFS[name].args[i];
  const words = arg.oneOf || [];
  if (typeof v === 'string' && words.includes(v)) return v;
  return fail(name, i, `one of ${words.join(', ')}`, v);
}

/** The same ISO shape the condition language orders as an instant. */
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;

/** A date in any form the backend hands a workflow, or null when it is not one. */
export function readDate(v: unknown): Date | null {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  if (typeof v === 'number') return validDate(new Date(v));
  if (isPlainObject(v) && v.__type === 'Date' && typeof v.iso === 'string') return readDate(v.iso);
  if (typeof v === 'string') {
    const s = v.trim();
    if (!ISO_DATE_RE.test(s)) return null;
    // A bare date is midnight UTC, and so is a date-time with no zone: one rule,
    // whatever the backend machine's own timezone is.
    const iso = s.length === 10 ? `${s}T00:00:00Z` : /(Z|[+-]\d{2}:?\d{2})$/.test(s) ? s : `${s.replace(' ', 'T')}Z`;
    return validDate(new Date(Date.parse(iso)));
  }
  return null;
}

/** A Date past JavaScript's range (±8.64e15 ms) is Invalid Date, and `toISOString` on one throws a RangeError. */
function validDate(d: Date): Date | null {
  return Number.isNaN(d.getTime()) ? null : d;
}

/** A formula's date as ISO text, refused in the formula's words when arithmetic has carried it out of range. */
function isoOf(d: Date, name: string): string {
  if (validDate(d)) return d.toISOString();
  throw new FormulaError(`"${FORMULA_DEFS[name].label}" gave a date too far from today to write down.`);
}

function asDate(v: unknown, name: string, i: number): Date {
  const d = readDate(v);
  if (d) return d;
  return fail(
    name,
    i,
    'a date (like 2026-11-03 or 2026-11-03T08:00:00Z)',
    v,
    v === undefined || v === null ? MISSING_HINT : ''
  );
}

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

const DATE_UNITS = ['minutes', 'hours', 'days', 'weeks', 'months', 'years'] as const;
const START_UNITS = ['day', 'week', 'month'] as const;
const DATE_FORMATS = ['date', 'date-time', 'time', 'long', 'short', 'weekday', 'month-year', 'iso'] as const;

const MS: Record<string, number> = {
  minutes: 60_000,
  hours: 3_600_000,
  days: 86_400_000,
  weeks: 604_800_000
};

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

/**
 * Add whole calendar months. The day is CLAMPED to the target month's length,
 * so 31 January plus a month is 28 (or 29) February, never 3 March.
 */
function addMonths(d: Date, months: number): Date {
  const total = d.getUTCFullYear() * 12 + d.getUTCMonth() + months;
  const year = Math.floor(total / 12);
  const month = total - year * 12;
  const day = Math.min(d.getUTCDate(), daysInMonth(year, month));
  return new Date(
    Date.UTC(year, month, day, d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds(), d.getUTCMilliseconds())
  );
}

/** Whole calendar months from `a` to `b`, counted toward zero. */
function monthsBetween(a: Date, b: Date): number {
  let months = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
  // Not a whole month yet when `b` has not reached `a`'s point in its month.
  if (months > 0 && addMonths(a, months).getTime() > b.getTime()) months--;
  if (months < 0 && addMonths(a, months).getTime() < b.getTime()) months++;
  return months;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function formatDate(d: Date, format: string): string {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const day = d.getUTCDate();
  const hm = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
  switch (format) {
    case 'date':
      return `${y}-${pad(m + 1)}-${pad(day)}`;
    case 'date-time':
      return `${y}-${pad(m + 1)}-${pad(day)} ${hm}`;
    case 'time':
      return hm;
    case 'long':
      return `${day} ${MONTHS[m]} ${y}`;
    case 'short':
      return `${day} ${MONTHS[m].slice(0, 3)} ${y}`;
    case 'weekday':
      return WEEKDAYS[d.getUTCDay()];
    case 'month-year':
      return `${MONTHS[m]} ${y}`;
    default:
      return d.toISOString();
  }
}

// ---------------------------------------------------------------------------
// The closed table
// ---------------------------------------------------------------------------

const NUMBERS_ARG = (label: string): FormulaArg => ({ name: 'values', label, type: 'numbers', repeats: true });

/** Numbers out of *numbers* args: each a number, or a list whose items are. */
function spreadNumbers(args: unknown[], name: string): number[] {
  const out: number[] = [];
  args.forEach((a, i) => {
    if (Array.isArray(a)) a.forEach((item) => out.push(asNumber(item, name, i)));
    else out.push(asNumber(a, name, i));
  });
  if (out.length === 0) fail(name, 0, 'at least one number', args[0]);
  return out;
}

const FORMULA_DEFS: Record<string, FormulaDef> = {
  // --- text ---------------------------------------------------------------
  text: {
    group: 'text',
    label: 'Text with values',
    sentence: '{parts}',
    args: [{ name: 'parts', label: 'part', type: 'any', repeats: true }],
    returns: 'text',
    description:
      'Join text and values into one piece of text: "Hi ", the name, ", your ", the plant. A missing value is ' +
      'left out; a list or an object cannot go in text (use Join for a list).',
    example: { $fn: 'text', args: ['Hi ', { $path: 'body.name' }, ', your plant needs water'] },
    apply: (args, name) =>
      args
        .map((a, i) => {
          if (a === undefined || a === null) return '';
          if (isPlainObject(a) && a.__type === 'Date') return formatDate(asDate(a, name, i), 'iso');
          if (typeof a === 'object') return fail(name, i, 'text, a number or true/false', a, ' Use "Join" for a list.');
          return asText(a, name, i);
        })
        .join('')
  },
  upper: {
    group: 'text',
    label: 'Uppercase',
    sentence: '{text} in capitals',
    args: [{ name: 'text', label: 'text', type: 'text' }],
    returns: 'text',
    description: 'The text in capital letters.',
    example: { $fn: 'upper', args: [{ $path: 'body.code' }] },
    apply: ([v], name) => asText(v, name, 0).toUpperCase()
  },
  lower: {
    group: 'text',
    label: 'Lowercase',
    sentence: '{text} in small letters',
    args: [{ name: 'text', label: 'text', type: 'text' }],
    returns: 'text',
    description: 'The text in small letters, for comparing an email address, say.',
    example: { $fn: 'lower', args: [{ $path: 'body.email' }] },
    apply: ([v], name) => asText(v, name, 0).toLowerCase()
  },
  trim: {
    group: 'text',
    label: 'Trim spaces',
    sentence: '{text} without spaces at the ends',
    args: [{ name: 'text', label: 'text', type: 'text' }],
    returns: 'text',
    description: 'The text without the spaces (and line breaks) at its start and end.',
    example: { $fn: 'trim', args: [{ $path: 'body.name' }] },
    apply: ([v], name) => asText(v, name, 0).trim()
  },
  length: {
    group: 'text',
    label: 'Length',
    sentence: 'length of {value}',
    args: [{ name: 'value', label: 'text or list', type: 'any' }],
    returns: 'number',
    description: 'How many characters a text has, or how many items a list has.',
    example: { $fn: 'length', args: [{ $path: 'body.message' }] },
    apply: ([v], name) => {
      if (typeof v === 'string' || Array.isArray(v)) return v.length;
      return fail(name, 0, 'text or a list', v, v === undefined || v === null ? MISSING_HINT : '');
    }
  },

  // --- numbers ------------------------------------------------------------
  add: {
    group: 'numbers',
    label: 'Add',
    sentence: '{values} added together',
    args: [NUMBERS_ARG('number')],
    returns: 'number',
    description: 'The numbers added together. A list among them adds its items.',
    example: { $fn: 'add', args: [{ $path: 'body.price' }, 4.5] },
    apply: (args, name) => spreadNumbers(args, name).reduce((a, b) => a + b, 0)
  },
  subtract: {
    group: 'numbers',
    label: 'Subtract',
    sentence: '{from} minus {amount}',
    args: [
      { name: 'from', label: 'number', type: 'number' },
      { name: 'amount', label: 'take away', type: 'number' }
    ],
    returns: 'number',
    description: 'The first number minus the second.',
    example: { $fn: 'subtract', args: [{ $path: 'body.stock' }, 1] },
    apply: ([a, b], name) => asNumber(a, name, 0) - asNumber(b, name, 1)
  },
  multiply: {
    group: 'numbers',
    label: 'Multiply',
    sentence: '{values} multiplied together',
    args: [NUMBERS_ARG('number')],
    returns: 'number',
    description: 'The numbers multiplied together.',
    example: { $fn: 'multiply', args: [{ $path: 'body.price' }, { $path: 'body.quantity' }] },
    apply: (args, name) => spreadNumbers(args, name).reduce((a, b) => a * b, 1)
  },
  divide: {
    group: 'numbers',
    label: 'Divide',
    sentence: '{number} divided by {by}',
    args: [
      { name: 'number', label: 'number', type: 'number' },
      { name: 'by', label: 'divided by', type: 'number' }
    ],
    returns: 'number',
    description: 'The first number divided by the second. Dividing by zero fails the step.',
    example: { $fn: 'divide', args: [{ $path: 'body.total' }, { $path: 'body.people' }] },
    apply: ([a, b], name) => {
      const by = asNumber(b, name, 1);
      if (by === 0) throw new FormulaError(`"${FORMULA_DEFS[name].label}" cannot divide by zero.`);
      return asNumber(a, name, 0) / by;
    }
  },
  round: {
    group: 'numbers',
    label: 'Round',
    sentence: '{number} rounded, to {places} decimal places',
    args: [
      { name: 'number', label: 'number', type: 'number' },
      { name: 'places', label: 'decimal places', type: 'number', optional: true }
    ],
    returns: 'number',
    description: 'The number rounded, half up, to a whole number or to the decimal places given (0 to 10).',
    example: { $fn: 'round', args: [{ $path: 'body.price' }, 2] },
    apply: ([v, places], name) => {
      const n = asNumber(v, name, 0);
      const p = places === undefined ? 0 : asNumber(places, name, 1);
      if (!Number.isInteger(p) || p < 0 || p > 10) fail(name, 1, 'a whole number from 0 to 10', places);
      const f = 10 ** p;
      return Math.round((n + Math.sign(n) * Number.EPSILON) * f) / f;
    }
  },
  min: {
    group: 'numbers',
    label: 'Smallest',
    sentence: 'smallest of {values}',
    args: [NUMBERS_ARG('number or list')],
    returns: 'number',
    description: 'The smallest of the numbers, or of a list of them.',
    example: { $fn: 'min', args: [{ $path: 'body.stock' }, 10] },
    apply: (args, name) => Math.min(...spreadNumbers(args, name))
  },
  max: {
    group: 'numbers',
    label: 'Largest',
    sentence: 'largest of {values}',
    args: [NUMBERS_ARG('number or list')],
    returns: 'number',
    description: 'The largest of the numbers, or of a list of them.',
    example: { $fn: 'max', args: [0, { $path: 'body.balance' }] },
    apply: (args, name) => Math.max(...spreadNumbers(args, name))
  },

  // --- logic --------------------------------------------------------------
  'is-empty': {
    group: 'logic',
    label: 'Is empty',
    sentence: '{value} is empty',
    args: [{ name: 'value', label: 'value', type: 'any' }],
    returns: 'boolean',
    description: 'True when the value is missing, empty text, an empty list or an empty object.',
    example: { $fn: 'is-empty', args: [{ $path: 'body.note' }] },
    apply: ([v]) => isEmptyValue(v)
  },
  equals: {
    group: 'logic',
    label: 'Equals',
    sentence: '{a} equals {b}',
    args: [
      { name: 'a', label: 'value', type: 'any' },
      { name: 'b', label: 'equals', type: 'any' }
    ],
    returns: 'boolean',
    description: 'True when the two values are the same (lists and objects compared item by item).',
    example: { $fn: 'equals', args: [{ $path: 'body.status' }, 'done'] },
    apply: ([a, b]) => deepEqual(a, b)
  },
  default: {
    group: 'logic',
    label: 'First that is not empty',
    sentence: '{value}, or else {otherwise}',
    args: [
      { name: 'value', label: 'value', type: 'any' },
      { name: 'otherwise', label: 'otherwise', type: 'any', repeats: true }
    ],
    returns: 'any',
    description:
      'The first value that is not empty: how a setting says "the name, or else \'friend\'". When all are empty, ' +
      'the last one.',
    example: { $fn: 'default', args: [{ $path: 'body.name' }, 'friend'] },
    apply: (args) => args.find((a) => !isEmptyValue(a)) ?? args[args.length - 1]
  },
  not: {
    group: 'logic',
    label: 'Not',
    sentence: 'not {value}',
    args: [{ name: 'value', label: 'true or false', type: 'boolean' }],
    returns: 'boolean',
    description: 'True when the value is false, false when it is true.',
    example: { $fn: 'not', args: [{ $fn: 'is-empty', args: [{ $path: 'body.note' }] }] },
    apply: ([v], name) => !asBoolean(v, name, 0)
  },

  // --- dates --------------------------------------------------------------
  now: {
    group: 'dates',
    label: 'Now',
    sentence: 'now',
    args: [],
    returns: 'date',
    description: 'The date and time the step runs.',
    example: { $fn: 'now' },
    apply: () => new Date().toISOString()
  },
  'add-to-date': {
    group: 'dates',
    label: 'Add to a date',
    sentence: '{date} plus {amount} {unit}',
    args: [
      { name: 'date', label: 'date', type: 'date' },
      { name: 'amount', label: 'amount', type: 'number' },
      { name: 'unit', label: 'unit', type: 'choice', oneOf: DATE_UNITS }
    ],
    returns: 'date',
    description:
      'The date moved by an amount of minutes, hours, days, weeks, months or years; a negative amount goes back ' +
      '("three days ago"). A month added to 31 January is the last day of February.',
    example: { $fn: 'add-to-date', args: [{ $fn: 'now' }, -3, 'days'] },
    apply: ([d, amount, unit], name) => {
      const date = asDate(d, name, 0);
      const n = asNumber(amount, name, 1);
      const u = asChoice(unit, name, 2);
      if (u === 'months' || u === 'years') {
        if (!Number.isInteger(n)) fail(name, 1, `a whole number of ${u}`, amount);
        return isoOf(addMonths(date, u === 'years' ? n * 12 : n), name);
      }
      return isoOf(new Date(date.getTime() + n * MS[u]), name);
    }
  },
  'date-difference': {
    group: 'dates',
    label: 'Time between',
    sentence: '{unit} between {from} and {to}',
    args: [
      { name: 'from', label: 'from', type: 'date' },
      { name: 'to', label: 'to', type: 'date' },
      { name: 'unit', label: 'in', type: 'choice', oneOf: DATE_UNITS }
    ],
    returns: 'number',
    description:
      'How many whole minutes, hours, days, weeks, months or years from the first date to the second; negative ' +
      'when the second is earlier. "Days since it was watered" is the days between the watering and Now.',
    example: { $fn: 'date-difference', args: [{ $path: 'body.lastWatered' }, { $fn: 'now' }, 'days'] },
    apply: ([a, b, unit], name) => {
      const from = asDate(a, name, 0);
      const to = asDate(b, name, 1);
      const u = asChoice(unit, name, 2);
      if (u === 'months') return monthsBetween(from, to);
      if (u === 'years') return Math.trunc(monthsBetween(from, to) / 12);
      return Math.trunc((to.getTime() - from.getTime()) / MS[u]);
    }
  },
  'format-date': {
    group: 'dates',
    label: 'Format a date',
    sentence: '{date} written as {format}',
    args: [
      { name: 'date', label: 'date', type: 'date' },
      { name: 'format', label: 'written as', type: 'choice', oneOf: DATE_FORMATS }
    ],
    returns: 'text',
    description:
      'The date as text in a named format: date (2026-11-03), date-time (2026-11-03 08:00), time (08:00), long ' +
      '(3 November 2026), short (3 Nov 2026), weekday (Tuesday), month-year (November 2026), iso. In UTC.',
    example: { $fn: 'format-date', args: [{ $path: 'body.due' }, 'long'] },
    apply: ([d, format], name) => formatDate(asDate(d, name, 0), asChoice(format, name, 1))
  },
  'start-of': {
    group: 'dates',
    label: 'Start of',
    sentence: 'start of the {unit} of {date}',
    args: [
      { name: 'date', label: 'date', type: 'date' },
      { name: 'unit', label: 'the', type: 'choice', oneOf: START_UNITS }
    ],
    returns: 'date',
    description: "Midnight (UTC) at the start of the date's day, week (a Monday) or month.",
    example: { $fn: 'start-of', args: [{ $fn: 'now' }, 'week'] },
    apply: ([d, unit], name) => {
      const date = asDate(d, name, 0);
      const u = asChoice(unit, name, 1);
      const y = date.getUTCFullYear();
      const m = date.getUTCMonth();
      if (u === 'month') return new Date(Date.UTC(y, m, 1)).toISOString();
      const day = new Date(Date.UTC(y, m, date.getUTCDate()));
      if (u === 'week') day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
      return day.toISOString();
    }
  },

  // --- lists --------------------------------------------------------------
  count: {
    group: 'lists',
    label: 'Count',
    sentence: 'how many in {list}',
    args: [{ name: 'list', label: 'list', type: 'list' }],
    returns: 'number',
    description: 'How many items the list has.',
    example: { $fn: 'count', args: [{ $path: 'upstream.find.result' }] },
    apply: ([v], name) => asList(v, name, 0).length
  },
  first: {
    group: 'lists',
    label: 'First',
    sentence: 'first of {list}',
    args: [{ name: 'list', label: 'list', type: 'list' }],
    returns: 'any',
    description: 'The first item of the list; nothing when it is empty.',
    example: { $fn: 'first', args: [{ $path: 'upstream.find.result' }] },
    apply: ([v], name) => asList(v, name, 0)[0]
  },
  last: {
    group: 'lists',
    label: 'Last',
    sentence: 'last of {list}',
    args: [{ name: 'list', label: 'list', type: 'list' }],
    returns: 'any',
    description: 'The last item of the list; nothing when it is empty.',
    example: { $fn: 'last', args: [{ $path: 'upstream.find.result' }] },
    apply: ([v], name) => {
      const list = asList(v, name, 0);
      return list[list.length - 1];
    }
  },
  sum: {
    group: 'lists',
    label: 'Sum',
    sentence: 'sum of {list}, by {field}',
    args: [
      { name: 'list', label: 'list', type: 'list' },
      { name: 'field', label: 'of the field', type: 'text', optional: true }
    ],
    returns: 'number',
    description: 'The items of a list of numbers added up, or, with a field, that field of each item added up.',
    example: { $fn: 'sum', args: [{ $path: 'body.lines' }, 'amount'] },
    apply: ([v, field], name) => {
      const list = asList(v, name, 0);
      const path = field === undefined ? '' : asText(field, name, 1);
      return list.reduce<number>((total, item, i) => {
        const value = path ? getPath(item, path) : item;
        if (typeof value === 'number' && Number.isFinite(value)) return total + value;
        if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
          return total + Number(value);
        }
        throw new FormulaError(
          `"${FORMULA_DEFS[name].label}" needs a number ${path ? `in "${path}" of` : 'for'} item ${i + 1}, ` +
            `got ${describe(value)}.`
        );
      }, 0);
    }
  },
  pick: {
    group: 'lists',
    label: 'Pick a field from each',
    sentence: '{field} of each in {list}',
    args: [
      { name: 'list', label: 'list', type: 'list' },
      { name: 'field', label: 'field', type: 'text' }
    ],
    returns: 'list',
    description: 'A list of one field read from each item: the names of the plants. A missing field is null.',
    example: { $fn: 'pick', args: [{ $path: 'upstream.find.result' }, 'name'] },
    apply: ([v, field], name) => {
      const path = asText(field, name, 1);
      return asList(v, name, 0).map((item) => getPath(item, path) ?? null);
    }
  },
  join: {
    group: 'lists',
    label: 'Join',
    sentence: '{list} joined with {separator}',
    args: [
      { name: 'list', label: 'list', type: 'list' },
      { name: 'separator', label: 'between each', type: 'text' }
    ],
    returns: 'text',
    description: 'One piece of text from a list, the separator between each item: "Monstera, Fern, Ivy".',
    example: { $fn: 'join', args: [{ $fn: 'pick', args: [{ $path: 'upstream.find.result' }, 'name'] }, ', '] },
    apply: ([v, sep], name) => {
      const separator = asText(sep, name, 1);
      return asList(v, name, 0)
        .map((item, i) => {
          if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') return String(item);
          if (item === undefined || item === null) return '';
          throw new FormulaError(
            `"${FORMULA_DEFS[name].label}" can join text and numbers, but item ${i + 1} is ${describe(item)}. ` +
              'Pick a field from each first.'
          );
        })
        .join(separator);
    }
  }
};

/** Every formula name, in table (and served) order. */
export const FORMULA_NAMES: readonly string[] = Object.keys(FORMULA_DEFS);

// ---------------------------------------------------------------------------
// Recognising and applying one
// ---------------------------------------------------------------------------

/** True for `{"$fn": …}` — whatever else is wrong with it, it is meant as a formula. */
export function isFormula(v: unknown): v is { $fn: unknown; args?: unknown } {
  return isPlainObject(v) && '$fn' in v;
}

function argCountRange(def: FormulaDef): [number, number] {
  const required = def.args.filter((a) => !a.optional && !a.repeats).length;
  const last = def.args[def.args.length - 1];
  // A repeating arg needs at least one value, and the formula reads as nonsense
  // with fewer than two of a list it combines (Add of one number is that number,
  // which is harmless) — so one is the floor, and there is no ceiling.
  return [last?.repeats ? required + 1 : required, last?.repeats ? Infinity : def.args.length];
}

/**
 * Compute a formula whose args are ALREADY resolved. Called by the resolver in
 * `values.ts`, which resolves the args first, so this never sees a spec.
 */
/** The formula of that name, or undefined — never an `Object.prototype` member. */
function lookup(name: unknown): FormulaDef | undefined {
  return typeof name === 'string' && Object.prototype.hasOwnProperty.call(FORMULA_DEFS, name)
    ? FORMULA_DEFS[name]
    : undefined;
}

export function applyFormula(name: unknown, args: unknown[]): unknown {
  const def = lookup(name);
  if (!def) {
    throw new FormulaError(
      `There is no formula ${JSON.stringify(name)} (the formulas are ${FORMULA_NAMES.join(', ')}). ` +
        'It should have been refused when the workflow was saved.'
    );
  }
  const [min, max] = argCountRange(def);
  if (args.length < min || args.length > max) {
    throw new FormulaError(`"${def.label}" ${countWords(def)}, got ${args.length}.`);
  }
  return def.apply(args, name as string);
}

function countWords(def: FormulaDef): string {
  const [min, max] = argCountRange(def);
  if (max === Infinity) return `takes ${min} or more values`;
  if (min === max) return min === 0 ? 'takes no values' : `takes ${min} value${min === 1 ? '' : 's'}`;
  return `takes ${min} to ${max} values`;
}

// ---------------------------------------------------------------------------
// Write-time checks
// ---------------------------------------------------------------------------

function literalFits(v: unknown, type: FormulaArgType, oneOf?: readonly string[]): boolean {
  switch (type) {
    case 'any':
      return true;
    case 'text':
      return typeof v === 'string' || (typeof v === 'number' && Number.isFinite(v)) || typeof v === 'boolean';
    case 'number':
      return (
        (typeof v === 'number' && Number.isFinite(v)) ||
        (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v)))
      );
    case 'numbers':
      return Array.isArray(v) || literalFits(v, 'number');
    case 'boolean':
      return typeof v === 'boolean';
    case 'date':
      return readDate(v) !== null;
    case 'list':
      return Array.isArray(v);
    case 'choice':
      return typeof v === 'string' && (oneOf || []).includes(v);
  }
}

/** Can a formula giving `returns` stand where an arg of `type` is wanted? */
function returnFits(returns: FormulaReturnType, type: FormulaArgType): boolean {
  if (returns === 'any' || type === 'any') return true;
  switch (type) {
    case 'text':
    case 'choice':
      return returns === 'text' || returns === 'number' || returns === 'boolean' || returns === 'date';
    case 'number':
      return returns === 'number';
    case 'numbers':
      return returns === 'number' || returns === 'list';
    case 'date':
      return returns === 'date' || returns === 'text' || returns === 'number';
    case 'list':
      return returns === 'list';
    case 'boolean':
      return returns === 'boolean';
  }
}

const TYPE_WORDS: Record<FormulaArgType | FormulaReturnType, string> = {
  any: 'a value',
  text: 'text',
  number: 'a number',
  numbers: 'a number or a list of numbers',
  boolean: 'true or false',
  date: 'a date',
  list: 'a list',
  choice: 'a choice'
};

/**
 * Every problem with the formulas inside a value, with where each sits. Walks
 * the whole value (a formula may sit deep inside a param, a condition, or a
 * transform's field) and does not look inside `$literal`.
 *
 * Refused: an unknown name (the message lists the set), a `$fn` object carrying
 * anything but `args`, a wrong number of args, a literal arg of the wrong type,
 * and a formula nested where its result cannot fit ("Count" gives a number, and
 * "Join" wants a list). A `$path` arg cannot be typed until the run, so it is
 * checked then.
 */
export function collectFormulaErrors(value: unknown, where: string, depth = 0): string[] {
  if (depth >= MAX_VALUE_DEPTH) return [];
  if (Array.isArray(value)) {
    return value.flatMap((item, i) => collectFormulaErrors(item, `${where}[${i}]`, depth + 1));
  }
  if (!isPlainObject(value)) return [];
  if ('$literal' in value || typeof value.$path === 'string') return [];
  if (!isFormula(value)) {
    return Object.entries(value).flatMap(([k, v]) => collectFormulaErrors(v, `${where}.${k}`, depth + 1));
  }

  const name = value.$fn;
  const def = lookup(name);
  if (!def) {
    return [
      `${where}: there is no formula ${JSON.stringify(name)} — the formulas are ${FORMULA_NAMES.join(', ')} ` +
        '(served as formulaLanguage by GET /admin/workflow-step-kinds). A setting takes no JavaScript.'
    ];
  }
  const extra = Object.keys(value).filter((k) => k !== '$fn' && k !== 'args');
  if (extra.length) {
    return [`${where}: a formula is written {"$fn": "${name}", "args": [...]} and nothing else (found "${extra[0]}")`];
  }
  if (value.args !== undefined && !Array.isArray(value.args)) {
    return [`${where}: "${def.label}" (${name}) takes its values as a list in "args"`];
  }
  const args = (value.args as unknown[] | undefined) || [];
  const [min, max] = argCountRange(def);
  if (args.length < min || args.length > max) {
    return [`${where}: "${def.label}" (${name}) ${countWords(def)}, got ${args.length}`];
  }

  const errors: string[] = [];
  args.forEach((arg, i) => {
    const spec = def.args[Math.min(i, def.args.length - 1)];
    const at = `${where}.args[${i}]`;
    if (isPlainObject(arg) && typeof arg.$path === 'string') return;
    if (isFormula(arg)) {
      const inner = lookup(arg.$fn);
      if (inner && !returnFits(inner.returns, spec.type)) {
        errors.push(
          `${at}: "${def.label}" (${name}) needs ${TYPE_WORDS[spec.type]} for ${argLabel(name as string, i)}, ` +
            `and "${inner.label}" gives ${TYPE_WORDS[inner.returns]}`
        );
      }
      errors.push(...collectFormulaErrors(arg, at, depth + 2));
      return;
    }
    const literal = isPlainObject(arg) && '$literal' in arg ? arg.$literal : arg;
    // A literal list or object may hold paths and formulas of its own; its SHAPE
    // is what the type check reads, its contents are walked like any value.
    if (!literalFits(literal, spec.type, spec.oneOf)) {
      const wanted = spec.type === 'choice' ? `one of ${(spec.oneOf || []).join(', ')}` : TYPE_WORDS[spec.type];
      errors.push(
        `${at}: "${def.label}" (${name}) needs ${wanted} for ${argLabel(name as string, i)}, got ${describe(literal)}` +
          dollarHint(literal)
      );
    } else {
      errors.push(...collectFormulaErrors(arg, at, depth + 2));
    }
  });
  return errors;
}

// ---------------------------------------------------------------------------
// The served description
// ---------------------------------------------------------------------------

export interface FormulaSpec {
  name: string;
  group: FormulaDef['group'];
  label: string;
  sentence: string;
  args: FormulaArg[];
  returns: FormulaReturnType;
  description: string;
  example: unknown;
}

export interface FormulaLanguageSpec {
  summary: string;
  form: { example: unknown; description: string };
  formulas: FormulaSpec[];
  notes: string[];
}

/**
 * The formulas, served inside `GET /admin/workflow-step-kinds` as
 * `formulaLanguage` for the reason every language there is served: an editor
 * holding its own copy could offer a formula this backend cannot compute, and an
 * agent working from memory will simply invent one (`eval`, `{{ }}`).
 *
 * Derived from the table, so the served list and the computed list cannot
 * disagree (BWF-004 AC1's parity holds by construction, and the test asserts it
 * anyway).
 */
export const FORMULA_LANGUAGE: FormulaLanguageSpec = {
  summary:
    'A formula computes a small value inside a setting: text with values in it, maths, dates, lists, "is it ' +
    'empty". It is a NAME from the closed list below with its values as arguments — not an expression, not ' +
    'JavaScript. Compute in a cloud function only what no formula or step can express.',
  form: {
    example: { $fn: 'date-difference', args: [{ $path: 'body.lastWatered' }, { $fn: 'now' }, 'days'] },
    description:
      '{"$fn": "<name>", "args": [<value>, …]}. Each arg is a value: a literal, a {"$path"} reference, or another ' +
      'formula. A formula with no args may leave "args" out. It works in every step setting, in every operand of a ' +
      "condition, and in a transform's fields."
  },
  formulas: FORMULA_NAMES.map((name) => {
    const def = FORMULA_DEFS[name];
    return {
      name,
      group: def.group,
      label: def.label,
      sentence: def.sentence,
      args: def.args.map((a) => ({ ...a, ...(a.oneOf ? { oneOf: [...a.oneOf] } : {}) })),
      returns: def.returns,
      description: def.description,
      example: def.example
    };
  }),
  notes: [
    'An unknown name, a wrong number of args, or a literal arg of the wrong type is refused when the workflow is saved.',
    'A formula that cannot be computed when the step runs (a divide by zero, a date that is not one) fails the step, ' +
      'so its onError route can take it.',
    'A missing value is not a failure for "is-empty", "default", "equals", "first", "last" and "text" (which leaves ' +
      'it out); every other formula fails on one. Wrap a value that may be missing in "default".',
    'Dates are ISO text, epoch milliseconds, or a record\'s {"__type":"Date","iso":…}; a formula\'s date is ISO text. ' +
      'Dates are computed in UTC.',
    'An arg marked "repeats" takes one or more values; one marked "optional" may be left out.'
  ]
};
