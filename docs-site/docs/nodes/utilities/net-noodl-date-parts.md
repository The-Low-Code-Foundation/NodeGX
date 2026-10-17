---
title: "Date Parts"
---
The fields of a date — year, month, day, time, weekday and ISO week — as outputs off one node.

Date Parts takes a date apart into eleven outputs. Month is 1-12, not JavaScript's 0-11: nobody reading a port called Month expects January to be 0. Day of Week keeps JavaScript's numbering (0 is Sunday) and Day Name gives the English name beside it. ISO Week is ISO-8601 — weeks start Monday and week 1 is the one holding the first Thursday, so 1 January 2027 is week 53 of 2026. All fields are read in the host's local zone, which on a server is whatever the container's TZ says; when the zone matters, format through Date To String's Timezone input instead of reading parts here.

## When to use it

Grouping by month or year, branching on the weekday, building a custom label from pieces, or feeding a chart axis. One node rather than seven, so every field comes from the same instant.

## At a glance

| | |
|---|---|
| Category | Utilities |
| Type name | `net.noodl.DateParts` |
| Available in | browser, cloud |
| SSR compatibility | safe |
| Provided by | `noodl-runtime` |
| Behaviour spec | version 1 ([under the hood](#under-the-hood)) |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `input` | Date | — | The instant to take apart. A string or a millisecond timestamp here is read as a date |

### What each input does

**Date** (`input`)

- empty: nothing is sent → Invalid Date, Changed stay silent
- it cannot be read as a date: every part goes empty → Invalid Date; Changed stays silent
- a date: every part is read from it, in this device's time zone → Changed; Invalid Date stays silent

## Outputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `date` | Number | — | Day of the month, 1-31 |
| `dayName` | String | — | The English name of the weekday. For a localised name, format through Date To String |
| `dayOfWeek` | Number | — | Day of the week as 0-6, Sunday first — JavaScript s own numbering |
| `hours` | Number | — | Hour of the day, 0-23 |
| `isoWeek` | Number | — | ISO-8601 week number, 1-53: weeks start on Monday and week 1 holds the first Thursday |
| `milliseconds` | Number | — | Milliseconds past the second, 0-999 |
| `minutes` | Number | — | Minutes past the hour, 0-59 |
| `month` | Number | — | Month as 1-12 — January is 1, not 0 |
| `seconds` | Number | — | Seconds past the minute, 0-59 |
| `timestamp` | Number | — | The instant as milliseconds since 1 January 1970 UTC |
| `year` | Number | — | Four-digit year, in the host s local zone |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `changed` | Signal | — | Fires after a new Date has been taken apart and every part output is up to date |

### Failure outputs

| Name | Type | Default | Description |
|---|---|---|---|
| `failure` | Signal | — | Fires when a date arrived that could not be read, leaving every part unset |

## Patterns

- Date Parts Month → String Mapper: a month name in your own wording, without a formatter.

## Watch out for

- Reading parts here to render a date for a user in another timezone. Use Date To String with a Timezone; these fields are always local.

## Examples

**Group these records by month**

Bubble spells this `Date1 rounded down to month`, and it is really two different questions wearing one phrase. If you want a KEY to group by, that is Date To String — and it must be Date To String rather than Date Parts, because of a difference this example exists to show: Date Parts gives Month as a NUMBER 1-12, so `{year}-{month}` through String Format renders September as `2026-9`, which sorts after `2026-10` as text and quietly scrambles a grouped list. Date To String's `{month}` token is the zero-padded one, so the same key comes out `2026-09` and sorts correctly. The unpadded tokens there are `{m}` and `{d}`; the padded ones are `{month}` and `{date}`. If instead you want to COMPARE two dates rounded down — Bubble's `equals rounded down to month` — do not round at all: Date Compare's Granularity does the truncation internally, so setting it to Month answers 'same month' directly and there is no intermediate value to get wrong. Date Parts is still the right node when you want the fields themselves, and this shows that too: Day Name and ISO Week come off it, and ISO Week is genuinely ISO-8601, so 1 January 2027 is week 53 of 2026 rather than week 1 of 2027. Every field here is read in the host's local zone — on a server, whatever the container's TZ says — so when the zone is part of the answer, format through Date To String's Timezone input instead. The month key is published because grouping happens in the parent: the row can compute its own bucket, but only the list above it can put rows into buckets.

## Related nodes

[Date To String](./date-to-string.md), [Date Compare](./net-noodl-date-compare.md), [Now](./net-noodl-now.md)

## Code export

Exports to React. A project that uses it exports this node as React code.

[How export works](../../how-export-works.md) shows what an export writes, with a worked example.

## Under the hood

This node's behaviour is written down as an executable spec in `@nodegx/node-spec`, version 1. The spec is the reference the conformance tests grade the runtime against. Every rule in it cites the line of the runtime it was read from. The full spec is at the bottom of this page.

### What it depends on outside the node

- the local time zone (`timezone`)

### Starting state

```json
{
  "inputSupplied": false
}
```

## The full spec {#spec-source}

The spec's source, as the docs were generated. Helpers it imports live beside it in `packages/nodegx-node-spec/src`.

```ts title="packages/nodegx-node-spec/src/nodes/date-parts.ts"
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
    if (!inputSupplied) return { says: 'empty: nothing is sent', set: { input, inputSupplied }, send: [] }; // :201
    if (input === undefined) return { says: 'it cannot be read as a date: every part goes empty', set: { input, inputSupplied }, send: [...PART_OUTPUTS], emit: ['failure'] }; // :203-209
    return { says: 'a date: every part is read from it, in this device\'s time zone', set: { input, inputSupplied }, send: [...PART_OUTPUTS], emit: ['changed'] }; // :203-209
  }
});
```


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
