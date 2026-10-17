---
title: "Date Compare"
---
Is this date before, after or the same as that one — at a granularity you choose, including 'the same day'.

Date Compare answers all three questions at once, as booleans and as signals, and fires exactly one signal per comparison. Granularity is the point: two instants are almost never the same millisecond, so comparing raw dates answers 'no' to the question people are actually asking. Set Granularity to Day and 09:00 and 17:00 on the same date are Same. Truncation happens in the host's local zone, because 'the same day' is a question about a calendar somebody is looking at — on a server that calendar is whatever the container says, which is worth knowing before you rely on it.

## When to use it

'Is this overdue', 'is this today', 'did these two things happen in the same month'. Wire the booleans into a Condition or the signals into a flow.

## At a glance

| | |
|---|---|
| Category | Utilities |
| Type name | `net.noodl.DateCompare` |
| Available in | browser, cloud |
| SSR compatibility | safe |
| Provided by | `noodl-runtime` |
| Behaviour spec | version 1 ([under the hood](#under-the-hood)) |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `a` | Date | — | The instant being asked about |
| `b` | Date | — | The instant it is compared against |
| `granularity` | Enum (`millisecond`, `second`, `minute`, `hour`, `day`, `month`, `year`) | `millisecond` | How coarsely to compare. Day answers "is this the same day", which is almost always the question — two instants are hardly ever the same millisecond |

### What each input does

**Date** (`a`)

- Date or Compare To not given yet: kept for when both are; nothing is sent → Invalid Date, On Same, On Before, On After stay silent
- either cannot be read as a date: Is Before, Is After and Is Same go empty → Invalid Date; On Same, On Before, On After stay silent
- the same instant, once both are cut to Granularity (millisecond when empty): Is Same goes true, the other two false → On Same; Invalid Date, On Before, On After stay silent
- Date is earlier, at Granularity: Is Before goes true, the other two false → On Before; Invalid Date, On Same, On After stay silent
- Date is later, at Granularity: Is After goes true, the other two false → On After; Invalid Date, On Same, On Before stay silent

**Compare To** (`b`)

- Date or Compare To not given yet: kept for when both are; nothing is sent → Invalid Date, On Same, On Before, On After stay silent
- either cannot be read as a date: Is Before, Is After and Is Same go empty → Invalid Date; On Same, On Before, On After stay silent
- the same instant, once both are cut to Granularity (millisecond when empty): Is Same goes true, the other two false → On Same; Invalid Date, On Before, On After stay silent
- Date is earlier, at Granularity: Is Before goes true, the other two false → On Before; Invalid Date, On Same, On After stay silent
- Date is later, at Granularity: Is After goes true, the other two false → On After; Invalid Date, On Same, On Before stay silent

**Granularity** (`granularity`)

- Date or Compare To not given yet: kept for when both are; nothing is sent → Invalid Date, On Same, On Before, On After stay silent
- either cannot be read as a date: Is Before, Is After and Is Same go empty → Invalid Date; On Same, On Before, On After stay silent
- the same instant, once both are cut to Granularity (millisecond when empty): Is Same goes true, the other two false → On Same; Invalid Date, On Before, On After stay silent
- Date is earlier, at Granularity: Is Before goes true, the other two false → On Before; Invalid Date, On Same, On After stay silent
- Date is later, at Granularity: Is After goes true, the other two false → On After; Invalid Date, On Same, On Before stay silent

## Outputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `after` | Boolean | — | True when Date is later than Compare To, at this Granularity |
| `before` | Boolean | — | True when Date is earlier than Compare To, at this Granularity |
| `same` | Boolean | — | True when the two land in the same Granularity bucket — the same day, month or year |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `isAfter` | Signal | — | Fires after a comparison that came out After |
| `isBefore` | Signal | — | Fires after a comparison that came out Before |
| `isSame` | Signal | — | Fires after a comparison that came out Same |

### Failure outputs

| Name | Type | Default | Description |
|---|---|---|---|
| `failure` | Signal | — | Fires when a date arrived that could not be read, leaving all three answers unset |

## Patterns

- Due date → Date, Now Date → Compare To, then On Before → the overdue branch.

## Watch out for

- Leaving Granularity at Millisecond and expecting Is Same to mean 'the same day'. It will essentially never be true.

## Examples

**Is this due date in the past?**

Bubble writes this as `Date1 is after Current date & time`, and the literal translation is the thing that goes wrong. Date Compare answers before, after and same together, as booleans and as signals, so you do not need three nodes or an Expression — but Granularity decides whether the answer means anything. Left at Millisecond a due date is essentially never `Same` as now, so an invoice due today reports as overdue the moment the clock passes midnight-plus-one-millisecond. Set Granularity to Day and the three answers become the three a person means: `Before` is overdue, `Same` is due today, `After` is still to come. Now is not a live clock — it reads the wall clock when it is created and again on every `Read`, so a card rendered at 23:59 and left open keeps yesterday's answer until something re-reads it. Truncation to the chosen granularity happens in the host's local zone, which on a server is whatever the container's zone is; if 'today' must mean the user's today, compare on values you have already normalised. The due date arrives as a `date` — a Date Compare fed an ISO string that will not parse fires `failure` rather than silently answering `After`, which is the outcome worth wiring when the date comes from a record someone else filled in. Here it goes to a Log at warning level, because a row that silently renders as 'Upcoming' because its date was a malformed string is the kind of bug nobody reports.

**Do these two bookings overlap?**

Bubble has a date range as a first-class type, so it can write `DateRange1 overlaps with DateRange2` and be done. NodeGX has no range type, and the honest translation is not a missing feature — it is two Date Compares and one line of boolean. Two intervals overlap exactly when each one starts before the other ends, so `requestStart < bookedEnd AND bookedStart < requestEnd`; that single identity also answers Bubble's `contains point` (a point is a range of zero length), `is contained by`, `is after` and `is before` on ranges, which is why one worked example covers a dozen dictionary rows. Note what is deliberately NOT here: no test for `requestStart < requestEnd`. Comparing the two ends of one range is what `<-min->` and `<-max->` are for in Bubble, and a range whose end precedes its start makes this expression answer `false` — no clash — which is the wrong answer to a malformed request rather than the right answer to a valid one. Validate the range before you ask this question. Granularity is set to Minute rather than left at Millisecond because bookings are made in minutes: at Millisecond, a slot ending at 10:00:00.000 and one starting at 10:00:00.000 are already non-overlapping, which is correct and also not what anyone booking a room means by back-to-back. Both comparisons share one failure Log — a date that will not parse makes `Before` false on that node, and false here reads as 'no clash', so an unreported failure is an accepted double booking. The answer is published on a Component Outputs port rather than only lighting a Text, because the caller that placed this row is the thing that has to decide whether to let the booking through — a component that computes the answer and keeps it to itself forces every caller to recompute it.

**Group these records by month**

Bubble spells this `Date1 rounded down to month`, and it is really two different questions wearing one phrase. If you want a KEY to group by, that is Date To String — and it must be Date To String rather than Date Parts, because of a difference this example exists to show: Date Parts gives Month as a NUMBER 1-12, so `{year}-{month}` through String Format renders September as `2026-9`, which sorts after `2026-10` as text and quietly scrambles a grouped list. Date To String's `{month}` token is the zero-padded one, so the same key comes out `2026-09` and sorts correctly. The unpadded tokens there are `{m}` and `{d}`; the padded ones are `{month}` and `{date}`. If instead you want to COMPARE two dates rounded down — Bubble's `equals rounded down to month` — do not round at all: Date Compare's Granularity does the truncation internally, so setting it to Month answers 'same month' directly and there is no intermediate value to get wrong. Date Parts is still the right node when you want the fields themselves, and this shows that too: Day Name and ISO Week come off it, and ISO Week is genuinely ISO-8601, so 1 January 2027 is week 53 of 2026 rather than week 1 of 2027. Every field here is read in the host's local zone — on a server, whatever the container's TZ says — so when the zone is part of the answer, format through Date To String's Timezone input instead. The month key is published because grouping happens in the parent: the row can compute its own bucket, but only the list above it can put rows into buckets.

## Related nodes

[Now](./net-noodl-now.md), [Date Difference](./net-noodl-date-difference.md), [Date Parts](./net-noodl-date-parts.md)

## Code export

Exports to React. A project that uses it exports this node as React code.

## Under the hood

This node's behaviour is written down as an executable spec in `@nodegx/node-spec`, version 1. The spec is the reference the conformance tests grade the runtime against. Every rule in it cites the line of the runtime it was read from. The full spec is at the bottom of this page.

### What it depends on outside the node

- the local time zone (`timezone`)

### Starting state

```json
{
  "aSupplied": false,
  "bSupplied": false,
  "granularity": "millisecond"
}
```

## The full spec {#spec-source}

The spec's source, as the docs were generated. Helpers it imports live beside it in `packages/nodegx-node-spec/src`.

```ts title="packages/nodegx-node-spec/src/nodes/date-compare.ts"
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
function recompute(s: State, delta: Partial<State>): { says: string; set: Partial<State>; send: Answers; emit?: Array<'isSame' | 'isBefore' | 'isAfter' | 'failure'> } {
  const n = { ...s, ...delta };
  if (!n.aSupplied || !n.bSupplied) return { says: 'Date or Compare To not given yet: kept for when both are; nothing is sent', set: delta, send: [] }; // :154
  if (n.a === undefined || n.b === undefined) return { says: 'either cannot be read as a date: Is Before, Is After and Is Same go empty', set: { ...delta, before: undefined, after: undefined, same: undefined }, send: ANSWERS, emit: ['failure'] }; // :158-166
  const granularity = (n.granularity || 'millisecond') as CompareGranularity; // :168
  const left = truncateTo(n.a, granularity);
  const right = truncateTo(n.b, granularity);
  const before = left < right;
  const after = left > right;
  const same = left === right; // :172-174
  // :180-182 — values first, then exactly one signal (NSP-018: one literal arm per signal, so each can say its case)
  const set = { ...delta, before, after, same };
  if (same) return { says: 'the same instant, once both are cut to Granularity (millisecond when empty): Is Same goes true, the other two false', set, send: ANSWERS, emit: ['isSame'] };
  if (before) return { says: 'Date is earlier, at Granularity: Is Before goes true, the other two false', set, send: ANSWERS, emit: ['isBefore'] };
  return { says: 'Date is later, at Granularity: Is After goes true, the other two false', set, send: ANSWERS, emit: ['isAfter'] };
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
```


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
