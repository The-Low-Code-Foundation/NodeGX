/**
 * Date To String — read from `packages/noodl-runtime/src/nodes/std-library/datetostring.ts` on
 * 2026-10-01 (NSP-013).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE, before the citations: `Date String` is `Format` with its tokens replaced from the
 * instant on `Date`, rendered in `Timezone` (an IANA name; empty = the world's zone, world.ts
 * TIME ZONE) with the names in `Locale` (a BCP 47 tag; empty = `en-US`). Every arrival on `Date`
 * re-renders (:190-197 — a string is parsed first, :191; the same VALUE arriving again is
 * ignored, :194, which for a `Date` object means the same object and for `null` or a number
 * means the same value); a change of `Format`, `Timezone` or `Locale` re-renders only once a
 * date has arrived (:130-134, :152-156, :174-178 — and an unchanged one is ignored, :127, :150,
 * :172; the two names fall back to `''`, :149, :171). A render ends with `Date String` sent and
 * `Date Changed` pulsed (:366-367); a render that THREW — a date that cannot be read, an unknown
 * zone, an unknown locale, a `Format` that is not a string — sends `''` and pulses `Invalid
 * Date` first (:344-363). The tokens are `_format`'s (:250-341), ported verbatim below.
 *
 * ⚠️ What "cannot be read" means depends on whether a zone is set (:264-273): with NO zone the
 * fields come from `getDate()` and friends, so `null`, a number and `undefined` throw and render
 * `''` with `Invalid Date`; WITH a zone the fields come from `Intl.DateTimeFormat.formatToParts`,
 * which accepts anything `Number()` accepts — a numeric timestamp renders, `null` renders the
 * epoch, and `undefined` would render the world's "now" — so a `Date` port fed `null` or a
 * timestamp prints a date in one configuration and `Invalid Date` in the other. NSP-013 §6 row
 * D14; the spec does what the runtime does.
 */

import { defineNode } from '../spec';
import { DATE_EXAMPLES } from './date-math';

/** :18-27 */
interface DateFields {
  date: number;
  month: number;
  year: number;
  hours: number;
  minutes: number;
  seconds: number;
}

/** :39-71 `fieldsInZone` — the same instant re-read in a named zone; an unknown name throws `RangeError`. */
function fieldsInZone(t: unknown, timeZone: string): DateFields {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(t as Date);
  const read = (type: string) => {
    const part = parts.find((p) => p.type === type);
    return part ? parseInt(part.value, 10) : NaN;
  };
  return { date: read('day'), month: read('month'), year: read('year'), hours: read('hour') % 24, minutes: read('minute'), seconds: read('second') };
}

/** :84-95 `ordinalSuffix` — English only, on purpose. */
function ordinalSuffix(day: number): string {
  if (day >= 11 && day <= 13) return 'th';
  switch (day % 10) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
}

/**
 * :250-368 `_format`: the rendered text, or `''` with `error` when the render threw. `t` is
 * whatever the port holds (a `Date`, or what arrived — the throw is the validity check, :252-254).
 */
export function formatDate(t: unknown, formatString: unknown, timeZone: unknown, localeTag: unknown): { text: string; error: boolean } {
  try {
    const format = formatString as string;
    const zone = timeZone as string;
    const locale = (localeTag as string) || 'en-US'; // :259
    const date = t as Date;

    const fields: DateFields = zone
      ? fieldsInZone(t, zone)
      : {
          date: date.getDate(),
          month: date.getMonth() + 1,
          year: date.getFullYear(),
          hours: date.getHours(),
          minutes: date.getMinutes(),
          seconds: date.getSeconds()
        }; // :264-273
    if (Number.isNaN(fields.year)) throw new RangeError('Invalid date'); // :274

    const dd = ('0' + fields.date).slice(-2);
    const month = ('0' + fields.month).slice(-2);
    const monthShortOptions: Intl.DateTimeFormatOptions = zone ? { month: 'short', timeZone: zone } : { month: 'short' };
    const monthShort = new Intl.DateTimeFormat(locale, monthShortOptions).format(date); // :281 — eagerly, whatever the format mentions
    const year = fields.year;
    const yearShort = year.toString().substring(2);
    const hours = ('0' + fields.hours).slice(-2);
    const minutes = ('0' + fields.minutes).slice(-2);
    const seconds = ('0' + fields.seconds).slice(-2);

    // :297-307 — the original chain, character for character
    let rendered = format
      .replace(/\{date\}/g, dd)
      .replace(/\{month\}/g, month)
      .replace(/\{monthShort\}/g, monthShort)
      .replace(/\{year\}/g, String(year))
      .replace(/\{yearShort\}/g, yearShort)
      .replace(/\{hours\}/g, hours)
      .replace(/\{minutes\}/g, minutes)
      .replace(/\{seconds\}/g, seconds);

    // :316-321 — lazily: a token the format does not mention makes no Intl call
    const substitute = (token: string, render: () => string) => {
      const needle = '{' + token + '}';
      if (rendered.indexOf(needle) === -1) return;
      rendered = rendered.split(needle).join(render());
    };
    // :324-325
    const named = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, zone ? { ...options, timeZone: zone } : options).format(date);
    const hours12 = ((fields.hours + 11) % 12) + 1; // :328
    const meridiem = fields.hours < 12 ? 'am' : 'pm'; // :332

    substitute('dayName', () => named({ weekday: 'long' }));
    substitute('dayShort', () => named({ weekday: 'short' }));
    substitute('monthName', () => named({ month: 'long' }));
    substitute('hours12', () => ('0' + hours12).slice(-2));
    substitute('h12', () => String(hours12));
    substitute('ampm', () => meridiem);
    substitute('AMPM', () => meridiem.toUpperCase());
    substitute('ordinal', () => String(fields.date) + ordinalSuffix(fields.date));
    substitute('d', () => String(fields.date));
    substitute('m', () => String(fields.month));
    substitute('h', () => String(fields.hours));
    substitute('min', () => String(fields.minutes));
    substitute('s', () => String(fields.seconds));

    return { text: rendered, error: false }; // :348
  } catch {
    return { text: '', error: true }; // :351, :363
  }
}

type State = {
  formatString: unknown;
  currentInput: unknown;
  dateString: string | undefined;
  timeZone: unknown;
  locale: unknown;
}

/** One render as the node does it (:366-367 after :344-363): the text sent, `Invalid Date` before `Date Changed` when it threw. */
function render(s: State): { set: Partial<State>; send: Array<'currentValue'>; emit: Array<'onError' | 'inputChanged'> } {
  const { text, error } = formatDate(s.currentInput, s.formatString, s.timeZone, s.locale);
  return { set: { ...s, dateString: text }, send: ['currentValue'], emit: error ? ['onError', 'inputChanged'] : ['inputChanged'] };
}

/** :130-134, :152-156, :174-178 — a setting stored, and a render only once a date has arrived. */
function setting(s: State): { set: Partial<State>; send: Array<'currentValue'>; emit?: Array<'onError' | 'inputChanged'> } {
  return s.currentInput !== undefined ? render(s) : { set: s, send: [] };
}

export const DateToString = defineNode({
  type: 'Date To String',
  version: 1,
  source: 'packages/noodl-runtime/src/nodes/std-library/datetostring.ts',
  needs: ['timezone'],

  // :101-112 initialize — the format's default, no date yet, '' for both names
  state: { formatString: '{year}-{month}-{date}', currentInput: undefined, dateString: undefined, timeZone: '', locale: '' } as State,

  inputs: {
    // :114-135 — stored raw (:128); a Format that is not a string throws in the render (:297 `.replace`)
    formatString: {
      type: 'string',
      default: '{year}-{month}-{date}',
      coerce: 'none',
      displayName: 'Format',
      group: 'Values',
      description:
        'Template in which these tokens are replaced and everything else is copied through. ' +
        'Date: {date} 09, {d} 9, {ordinal} 9th. ' +
        'Month: {month} 09, {m} 9, {monthShort} Sep, {monthName} September. ' +
        'Year: {year} 2026, {yearShort} 26. ' +
        'Weekday: {dayName} Thursday, {dayShort} Thu. ' +
        'Time: {hours} 15, {h} 15, {hours12} 03, {h12} 3, {minutes} 05, {min} 5, {seconds} 07, ' +
        '{s} 7, {ampm} pm, {AMPM} PM. ' +
        'Names follow Locale; {ordinal} is English',
      examples: ['{year}-{month}-{date}', '{dayName} {d} {monthName} {year}, {h12}:{minutes} {AMPM}', '{ordinal} {monthShort} {yearShort}', '{hours}:{min}:{s} {h}', '{dayShort} {m}/{date} {hours12}{ampm}', 'no tokens', '{}']
    },
    // :136-157 — `value || ''` (:149)
    timeZone: {
      type: 'string',
      default: '',
      coerce: 'none',
      displayName: 'Timezone',
      group: 'Values',
      description:
        'IANA zone name to render in, such as Europe/London or America/New_York. Leave empty for the ' +
        "host machine's zone — which on a server is whatever the container says, and is the usual " +
        'reason a date is an hour out in production but right on your laptop',
      examples: ['Europe/London', 'America/New_York', 'Asia/Tokyo', 'UTC', 'Not/AZone']
    },
    // :158-179 — `value || ''` (:171)
    locale: {
      type: 'string',
      default: '',
      coerce: 'none',
      displayName: 'Locale',
      group: 'Values',
      description:
        'BCP 47 language tag for the month and day names — fr-FR, de-DE, ja-JP. Leave empty for ' +
        'English (en-US), which is what every project rendered before this port existed. It does ' +
        'not change the digits, the padding or {ordinal}, only the words',
      examples: ['en-US', 'fr-FR', 'de-DE', 'ja-JP', 'not a locale']
    },
    // :180-198 — a string is parsed (:191); the same value again is ignored (:194)
    input: { type: 'date', coerce: 'none', examples: DATE_EXAMPLES, displayName: 'Date', group: 'Values', description: 'The instant to render; a string arriving here is parsed as a date first' }
  },

  outputs: {
    // :201-209
    currentValue: { type: 'string', from: (s) => s.dateString, displayName: 'Date String', group: 'Values', description: 'Date rendered through Format, or blank when the date could not be read' },
    // :210-215
    inputChanged: { type: 'signal', displayName: 'Date Changed', group: 'Events', description: 'Fires whenever a new Date arrives or Format changes, after Date String has been updated' },
    // :216-221
    onError: { type: 'signal', displayName: 'Invalid Date', group: 'Events', description: 'Fires when the Date could not be read, leaving Date String blank' }
  }
}).on({
  // :126-134
  formatString: (s, v) => (s.formatString === v ? {} : setting({ ...s, formatString: v })),
  // :148-156
  timeZone: (s, v) => {
    const next = v || '';
    return s.timeZone === next ? {} : setting({ ...s, timeZone: next });
  },
  // :170-178
  locale: (s, v) => {
    const next = v || '';
    return s.locale === next ? {} : setting({ ...s, locale: next });
  },
  // :190-197
  input: (s, v) => {
    const value = typeof v === 'string' ? new Date(v) : v;
    return s.currentInput === value ? {} : render({ ...s, currentInput: value });
  }
});
