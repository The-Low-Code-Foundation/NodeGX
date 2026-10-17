---
title: "Date Add"
---
A date shifted by an amount of a unit. Months and years CLAMP: 31 January plus one month is 28 February.

Date Add takes a date and produces the date that many units later, recomputing whenever Date, Amount or Unit changes. A negative amount subtracts. Milliseconds through weeks are fixed durations and are exact. Months and years are calendar steps and CLAMP to the end of the target month: 31 January plus one month is 28 February (29 in a leap year), never 2 or 3 March, and 29 February plus one year is 28 February. Both answers are defensible; the classic date bug is not knowing which one you have, so this one is written down. Date accepts a Date, an ISO string or a millisecond timestamp, because a JSON round trip through a Request or Response node turns a date into one of the latter two.

## When to use it

Deadlines, trial expiry, renewal dates, 'thirty days from now', 'the same day next month'.

## At a glance

| | |
|---|---|
| Category | Utilities |
| Type name | `net.noodl.DateAdd` |
| Available in | browser, cloud |
| SSR compatibility | safe |
| Provided by | `noodl-runtime` |
| Behaviour spec | version 3 ([under the hood](#under-the-hood)) |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `amount` | Number | `0` | How much to add. Negative subtracts. Months and years use whole steps |
| `input` | Date | — | The instant to shift. A string or a millisecond timestamp arriving here is read as a date |
| `unit` | Enum (`milliseconds`, `seconds`, `minutes`, `hours`, `days`, `weeks`, `months`, `years`) | `days` | What Amount counts. Months and years are calendar steps and CLAMP: 31 January plus one month is 28 (or 29) February, never 2 March |

### What each input does

**Date** (`input`)

- no Date yet: kept for when one arrives; nothing is sent → Invalid Date, Changed stay silent
- the Date cannot be read as a date: Result goes empty → Invalid Date; Changed stays silent
- otherwise Result is the Date moved by Amount (0 when not a number) in Unit (days when not one of the eight); in months and years Amount counts whole steps only, and the day stops at the month's last → Changed; Invalid Date stays silent

**Amount** (`amount`)

- no Date yet: kept for when one arrives; nothing is sent → Invalid Date, Changed stay silent
- the Date cannot be read as a date: Result goes empty → Invalid Date; Changed stays silent
- otherwise Result is the Date moved by Amount (0 when not a number) in Unit (days when not one of the eight); in months and years Amount counts whole steps only, and the day stops at the month's last → Changed; Invalid Date stays silent

**Unit** (`unit`)

- no Date yet: kept for when one arrives; nothing is sent → Invalid Date, Changed stay silent
- the Date cannot be read as a date: Result goes empty → Invalid Date; Changed stays silent
- otherwise Result is the Date moved by Amount (0 when not a number) in Unit (days when not one of the eight); in months and years Amount counts whole steps only, and the day stops at the month's last → Changed; Invalid Date stays silent

## Outputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `result` | Date | — | Date shifted by Amount of Unit, or unset when Date could not be read |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `changed` | Signal | — | Fires after Result has been recomputed, whichever input caused it |

### Failure outputs

| Name | Type | Default | Description |
|---|---|---|---|
| `failure` | Signal | — | Fires when Date could not be read, leaving Result unset |

## Patterns

- Now Date → Date Add (+14 days) → Create Record: a trial end date computed on the server.

## Watch out for

- Using Days where Months was meant, to avoid thinking about clamping. 30 days and 1 month are different dates in eleven months of the year.

## Examples

**How many days are left on this trial?**

Bubble's `<-range->` gives a range whose duration you then read; here the duration is the whole question, and Date Difference answers it directly as To minus From. Two things about that subtraction decide whether the banner is right. It is SIGNED — an expired trial reports a negative number, and that is the useful behaviour, because Absolute would turn 'three days overdue' into 'three days left'. And for fixed units it is NOT rounded: a trial with 36 hours to run reports 1.5 days, so a banner wired straight to Difference says '1.5 days left'. That is why the Expression is here rather than as an afterthought — `Math.max(0, Math.ceil(d))` rounds up (a trial with any part of a day left has a day left, which is what a person counting means), and clamps the expired case to zero so the banner never counts downward past the end. Date Add supplies the end date from the signup date, and its clamping rule matters if you ever change Unit to Months: 31 January plus one month is 28 February, not 2 March. The end date is rendered through Date To String rather than pasted in as a number, because Difference is a number and a date is not.

## Related nodes

[Now](./net-noodl-now.md), [Date Difference](./net-noodl-date-difference.md), [Date To String](./date-to-string.md)

## Code export

Exports to React. A project that uses it exports this node as React code.

## Under the hood

This node's behaviour is written down as an executable spec in `@nodegx/node-spec`, version 3. The spec is the reference the conformance tests grade the runtime against. Every rule in it cites the line of the runtime it was read from. The full spec is at the bottom of this page.

### What it depends on outside the node

- the local time zone (`timezone`)

### Starting state

```json
{
  "inputSupplied": false,
  "amount": 0,
  "unit": "days"
}
```

### How inputs are converted

Inputs not listed arrive as sent.

| Input | Conversion | What it does |
|---|---|---|
| Amount (`amount`) | `js-number` | converted with `Number(value)`, so text that is not a number becomes `NaN` |

### Warnings it shows in the editor

| Warning | Settings it points at | Id |
|---|---|---|
| Unit is not one of the eight | `unit` | `date-add/unknown-unit` |

### Version history

- **Version 3**: A Unit that is not one of the eight now shows as the node's warning in this spec, as the runtime has shown it since v2. Before, the spec left it out. Existing projects are not migrated: only the editor is told, and the runtime already told it. Nothing a wire carries changes.

## The full spec {#spec-source}

The spec's source, as the docs were generated. Helpers it imports live beside it in `packages/nodegx-node-spec/src`.

```ts title="packages/nodegx-node-spec/src/nodes/date-add.ts"
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
 * on arrival (:65) and a non-finite amount adds 0 (:130); a `Unit` that is empty or not one of the
 * eight counts as days (datemath.ts `unitOrDays`). The calendar is the world's zone (world.ts TIME ZONE).
 *
 * An unknown `Unit` also shows the editor a warning until it is fixed (`setDiagnostic` :79, declared in
 * `diagnostics` since v3: never on the wire, recorded by a target with an editor). v1 graded it as the runtime then did it: the setter THREW and the node
 * was dead from then on — NSP-013 §6 row C16, fixed in P109 ISL-026.
 */

import { defineNode } from '../spec';
import { addToDate, DATE_EXAMPLES, isDateUnit, supplied, toDate, UNIT_VALUES, unknownUnitMessage } from './date-math';

type State = {
  input: Date | undefined;
  inputSupplied: boolean;
  amount: number;
  unit: unknown;
  result: Date | undefined;
}

/** :118-133 `_recompute`, over the state the setter has just changed (`delta` is what it stored). */
function recompute(s: State, delta: Partial<State>): { says: string; set: Partial<State>; send: Array<'result'>; emit?: Array<'changed' | 'failure'> } {
  const n = { ...s, ...delta };
  if (!n.inputSupplied) return { says: 'no Date yet: kept for when one arrives; nothing is sent', set: delta, send: [] }; // :121
  if (n.input === undefined) return { says: 'the Date cannot be read as a date: Result goes empty', set: { ...delta, result: undefined }, send: ['result'], emit: ['failure'] }; // :123-128
  const amount = Number.isFinite(n.amount) ? n.amount : 0; // :130
  const unit = isDateUnit(n.unit) ? n.unit : 'days'; // `unitOrDays` — v2 (C16)
  return { says: 'otherwise Result is the Date moved by Amount (0 when not a number) in Unit (days when not one of the eight); in months and years Amount counts whole steps only, and the day stops at the month\'s last', set: { ...delta, result: addToDate(n.input, amount, unit) }, send: ['result'], emit: ['changed'] }; // :131-133
}

export const DateAdd = defineNode({
  type: 'net.noodl.DateAdd',
  // v2 (P109 ISL-026, P107-C16 ruled "Use days and warn once"): a Unit that is not one of the eight counts as
  // days. In v1 such a Unit left Result as it was and fired nothing (the runtime threw there, for good).
  version: 3,
  changes: [
    {
      version: 3,
      says: 'A Unit that is not one of the eight now shows as the node\'s warning in this spec, as the runtime has shown it since v2. Before, the spec left it out',
      row: 'NSP-019 R35 (P107 s102)',
      migration: { none: 'Only the editor is told, and the runtime already told it. Nothing a wire carries changes' }
    }
  ],
  // the Unit setter (:79, `setDiagnostic('date-add/unknown-unit', unknownUnitMessage(value))`): the last Unit that arrived, as it arrived
  diagnostics: {
    'date-add/unknown-unit': { says: 'Unit is not one of the eight', settings: ['unit'], message: (_i, s) => unknownUnitMessage(s.unit) }
  },
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
```


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
