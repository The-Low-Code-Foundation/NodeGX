---
title: "Date To String"
---
Formats a date into a string with {year}/{monthName}/{dayName}/{h12}-style tokens, in any language.

Date To String takes a date on `input` (Date) — a Date object, or a date string which it converts with `new Date()` — and writes a formatted string to `currentValue` (Date String) according to `formatString` (Format). Supported tokens, for Thursday 10 September 2026 at 15:05:07: {date} 09 and {d} 9 (day of month), {ordinal} 9th, {month} 09 and {m} 9, {monthShort} Sep, {monthName} September, {year} 2026, {yearShort} 26, {dayName} Thursday, {dayShort} Thu, {hours} 15 and {h} 15 (24-hour), {hours12} 03 and {h12} 3 (12-hour), {ampm} pm and {AMPM} PM, {minutes} 05 and {min} 5, {seconds} 07 and {s} 7; anything else in the format passes through literally. The default format is "{year}-{month}-{date}". Each time formatting runs, `inputChanged` (Date Changed) fires; if the input is not a usable date, `currentValue` becomes an empty string and `onError` (Invalid Date) fires instead of throwing. CWF-011 added a Timezone input: leave it empty (the default) and it formats in the host machine's zone exactly as it always has; set an IANA name like Europe/London or America/New_York and the same instant is rendered in that zone instead — including the date, which rolls when the zone crosses midnight. An unknown zone name is treated as an unreadable date: `currentValue` empties and `onError` fires, rather than silently falling back to local. CMP-005 added the weekday, full month name, 12-hour, unpadded and ordinal tokens, and a Locale input: leave Locale empty (the default) and every name renders in English exactly as it always did, or set a BCP 47 tag like fr-FR and {monthName}, {monthShort}, {dayName} and {dayShort} render in that language. {ordinal} stays English — Intl gives the ordinal category, not the suffix string. Locale and Timezone are independent: a French app can render a Tokyo instant.

## When to use it

Use it to display timestamps — record creation dates, 'last saved' times, "Thursday, 10 September 2026 at 3:05 pm" — without writing code. It covers weekdays, full and short month names, 12-hour clocks, unpadded numbers, ordinals and any language, so reach for the tokens before reaching for a Function node. The one thing it deliberately does not do is RELATIVE time ('2 h ago'), which depends on the current moment rather than on the date it is given and so needs a clock, not a token. On a server the host zone is whatever the container says, so set Timezone explicitly for anything a user reads.

## At a glance

| | |
|---|---|
| Category | Utilities |
| Type name | `Date To String` |
| Available in | browser, cloud |
| SSR compatibility | safe |
| Provided by | `noodl-runtime` |
| Behaviour spec | version 2 ([under the hood](#under-the-hood)) |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `formatString` | String | `{year}-{month}-{date}` | Template in which these tokens are replaced and everything else is copied through. Date: {date} 09, {d} 9, {ordinal} 9th. Month: {month} 09, {m} 9, {monthShort} Sep, {monthName} September. Year: {year} 2026, {yearShort} 26. Weekday: {dayName} Thursday, {dayShort} Thu. Time: {hours} 15, {h} 15, {hours12} 03, {h12} 3, {minutes} 05, {min} 5, {seconds} 07, {s} 7, {ampm} pm, {AMPM} PM. Names follow Locale; {ordinal} is English |
| `input` | Date | — | The instant to render; a string arriving here is parsed as a date first |
| `locale` | String | `` | BCP 47 language tag for the month and day names — fr-FR, de-DE, ja-JP. Leave empty for English (en-US), which is what every project rendered before this port existed. It does not change the digits, the padding or {ordinal}, only the words |
| `timeZone` | String | `` | IANA zone name to render in, such as Europe/London or America/New_York. Leave empty for the host machine's zone — which on a server is whatever the container says, and is the usual reason a date is an hour out in production but right on your laptop |

### What each input does

**Format** (`formatString`)

- the value it already holds: nothing → Invalid Date, Date Changed stay silent
- it cannot be written (a Date it cannot read, an unknown Timezone, or a Format that is not text): Date String goes blank → Invalid Date, Date Changed
- it can be written: Date String is the Date written through Format, in Timezone and Locale → Date Changed; Invalid Date stays silent
- no Date yet: kept for when one arrives; nothing is sent → Invalid Date, Date Changed stay silent

**Timezone** (`timeZone`)

- the value it already holds (empty is the device's zone): nothing → Invalid Date, Date Changed stay silent
- it cannot be written (a Date it cannot read, an unknown Timezone, or a Format that is not text): Date String goes blank → Invalid Date, Date Changed
- it can be written: Date String is the Date written through Format, in Timezone and Locale → Date Changed; Invalid Date stays silent
- no Date yet: kept for when one arrives; nothing is sent → Invalid Date, Date Changed stay silent

**Locale** (`locale`)

- the value it already holds (empty is en-US): nothing → Invalid Date, Date Changed stay silent
- it cannot be written (a Date it cannot read, an unknown Timezone, or a Format that is not text): Date String goes blank → Invalid Date, Date Changed
- it can be written: Date String is the Date written through Format, in Timezone and Locale → Date Changed; Invalid Date stays silent
- no Date yet: kept for when one arrives; nothing is sent → Invalid Date, Date Changed stay silent

**Date** (`input`)

- the same date object it already holds: nothing → Invalid Date, Date Changed stay silent
- it cannot be written (a Date it cannot read, an unknown Timezone, or a Format that is not text): Date String goes blank → Invalid Date, Date Changed
- it can be written: Date String is the Date written through Format, in Timezone and Locale → Date Changed; Invalid Date stays silent

## Outputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `currentValue` | String | — | Date rendered through Format, or blank when the date could not be read |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `inputChanged` | Signal | — | Fires whenever a new Date arrives or Format changes, after Date String has been updated |

### Failure outputs

| Name | Type | Default | Description |
|---|---|---|---|
| `onError` | Signal | — | Fires when the Date could not be read, leaving Date String blank |

## Patterns

- A Function output producing `new Date()` on demand → `input`: timestamp an event, then show `currentValue` in a String Format sentence.
- {dayName}, {d} {monthName} {year} → "Thursday, 10 September 2026", and {h12}:{minutes} {ampm} → "3:05 pm". These are the two formats an app asks for most and neither was reachable before CMP-005.

## Watch out for

- Wiring a number (epoch milliseconds) to `input` — number does not cast to date; convert to a Date in a Function or Expression first.
- Relying on the host zone in a cloud function. It is the container's zone, not your user's, and it is the usual reason a date is right locally and an hour or a day out in production.
- Writing a Function node with Intl to get a weekday or a localised month name. That was the documented workaround until CMP-005 and it is now a component's worth of code replacing one token.

## Examples

**Dates a person would read, without a Function node**

One instant from Now, rendered three ways by three Date To String nodes — no JavaScript anywhere. The headline uses the weekday and the full month name ({dayName}, {d} {monthName} {year} → "Thursday, 10 September 2026"); the time uses the 12-hour clock and a meridiem ({h12}:{minutes} {ampm} → "3:05 pm"); the third is the same headline with Locale set to fr-FR, which translates the month and day NAMES and nothing else. Tokens are the whole vocabulary: {d} {m} {h} {min} {s} are the unpadded numbers, {date} {month} {hours} {minutes} {seconds} the padded ones, and anything the node does not recognise is copied through unchanged — which is why a moment/date-fns pattern like HH:mm:ss renders as the literal text HH:mm:ss rather than a time.

**Debounced autosave with timestamped status**

The debounce idiom: every keystroke fires Value Changed, whose signal restarts a 1.5-second Timer — the save only runs when the user pauses. The save Function stamps the moment; Date To String formats it, Unique Id issues a save id shortened by Substring, and String Format assembles the status line. Signals sequence the flow; values shape the display.

## Related nodes

[String Format](../string-manipulation/string-format.md), [Function](../custom-code/java-script-function.md), [Expression](../custom-code/expression.md), [Date Parts](./net-noodl-date-parts.md), [Now](./net-noodl-now.md)

## Code export

Exports to React. A project that uses it exports this node as React code.

[How export works](../../how-export-works.md) shows what an export writes, with a worked example.

## Under the hood

This node's behaviour is written down as an executable spec in `@nodegx/node-spec`, version 2. The spec is the reference the conformance tests grade the runtime against. Every rule in it cites the line of the runtime it was read from. The full spec is at the bottom of this page.

### What it depends on outside the node

- the local time zone (`timezone`)

### Starting state

```json
{
  "formatString": "{year}-{month}-{date}",
  "timeZone": "",
  "locale": ""
}
```

## The full spec {#spec-source}

The spec's source, as the docs were generated. Helpers it imports live beside it in `packages/nodegx-node-spec/src`.

```ts title="packages/nodegx-node-spec/src/nodes/date-to-string.ts"
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
 * The Date is read through `toDate` (date-math.ts), as the rest of the date family reads it: a
 * `Date`, a finite timestamp or a date string renders; `null`, `undefined`, `''` and anything
 * unreadable is `Invalid Date` — whether or not a zone is set (v2, row D14 ruled "One rule, like
 * the other date nodes"). v1, as the runtime was, read `getDate()` with no zone (a timestamp and
 * null threw) but `formatToParts` with one (a timestamp rendered, null rendered the epoch).
 */

import { defineNode } from '../spec';
import { DATE_EXAMPLES, toDate } from './date-math';

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
    const date = toDate(t); // v2 (D14): one rule with or without a zone
    if (!date) throw new RangeError('Invalid date');

    const fields: DateFields = zone
      ? fieldsInZone(date, zone)
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
function render(s: State): { says: string; set: Partial<State>; send: Array<'currentValue'>; emit: Array<'onError' | 'inputChanged'> } {
  const { text, error } = formatDate(s.currentInput, s.formatString, s.timeZone, s.locale);
  if (error) return { says: 'it cannot be written (a Date it cannot read, an unknown Timezone, or a Format that is not text): Date String goes blank', set: { ...s, dateString: text }, send: ['currentValue'], emit: ['onError', 'inputChanged'] };
  return { says: 'it can be written: Date String is the Date written through Format, in Timezone and Locale', set: { ...s, dateString: text }, send: ['currentValue'], emit: ['inputChanged'] };
}

/** :130-134, :152-156, :174-178 — a setting stored, and a render only once a date has arrived. */
function setting(s: State): { says: string; set: Partial<State>; send: Array<'currentValue'>; emit?: Array<'onError' | 'inputChanged'> } {
  if (s.currentInput !== undefined) return render(s);
  return { says: 'no Date yet: kept for when one arrives; nothing is sent', set: s, send: [] };
}

export const DateToString = defineNode({
  type: 'Date To String',
  // v2 (P109 ISL-032, row D14 ruled "One rule, like the other date nodes"): the Date is read through toDate — a timestamp
  // renders and an empty Date is Invalid Date, with or without a Timezone.
  version: 2,
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
  formatString: (s, v) => (s.formatString === v ? { says: 'the value it already holds: nothing' } : setting({ ...s, formatString: v })),
  // :148-156
  timeZone: (s, v) => {
    const next = v || '';
    return s.timeZone === next ? { says: 'the value it already holds (empty is the device\'s zone): nothing' } : setting({ ...s, timeZone: next });
  },
  // :170-178
  locale: (s, v) => {
    const next = v || '';
    return s.locale === next ? { says: 'the value it already holds (empty is en-US): nothing' } : setting({ ...s, locale: next });
  },
  // :190-197
  input: (s, v) => {
    const value = typeof v === 'string' ? new Date(v) : v;
    return s.currentInput === value ? { says: 'the same date object it already holds: nothing' } : render({ ...s, currentInput: value });
  }
});
```


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
