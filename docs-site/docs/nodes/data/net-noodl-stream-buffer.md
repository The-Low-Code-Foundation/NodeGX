---
title: "Stream Buffer"
---
Stream Buffer: batches items arriving faster than the UI wants to react, flushing on a count, an interval, or on demand.

Each `add` appends the current `data` to a buffer. The buffer empties when `flushSize` items have collected, when `flushInterval` milliseconds have passed since the first item after the last flush, or when `flush` fires — whichever comes first. `flushedData` is a detached array, so a later Add cannot mutate what a downstream node is already rendering. The interval timer is armed only while items are waiting, is re-armed rather than left stale when the interval changes, and is cleared on a manual flush and when the node is deleted. `maxSize` caps the buffer, dropping the oldest and reporting it on `droppedItems` with an `overflowed` signal. A `flush` that finds nothing, and a `clear` with nothing to discard, report `unchanged` — an idle buffer doing exactly what it should, not a failure.

## When to use it

Any producer that outruns the UI: a token stream driving a Repeater, high-rate telemetry, a log feed. Batching turns hundreds of small graph updates a second into a few. Not needed when updates are already infrequent, and not a substitute for Text Accumulator when the thing being batched is text that should be concatenated rather than listed.

## At a glance

| | |
|---|---|
| Category | Data |
| Type name | `net.noodl.StreamBuffer` |
| Available in | browser, cloud |
| SSR compatibility | partial — Interval-based flushing needs a running timer, so it only happens in the browser. Add, Flush and size-based flushing behave normally. |
| Provided by | `noodl-runtime` |
| Behaviour spec | version 1 ([under the hood](#under-the-hood)) |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `data` | * | — | The next item to buffer, of any type; its value is retained between pulses of Add |
| `flushInterval` | Number | `0` | Flush automatically this often in milliseconds while items are buffered; 0 disables interval flushing |
| `flushSize` | Number | `0` | Flush automatically once this many items are buffered; 0 disables size-based flushing |
| `maxSize` | Number | `10000` | Hard cap on buffered items; overflow drops the oldest and is counted on Dropped Items; 0 means no cap |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `add` | Signal | — | Buffers the current Data, flushing straight away if that reaches Flush Size |
| `clear` | Signal | — | Discards the buffer and resets both counters without flushing |
| `flush` | Signal | — | Hands the whole buffer to Flushed Data now; an empty buffer is a legitimate no-op |

### What each input does

**Data** (`data`)

- always: kept as it came for the next Add, and retained after it — any write counts as data having arrived, nothing included

**Flush Size** (`flushSize`)

- always: read at the next Add — the size at which that Add flushes (not above 0: never by size); a buffer already that big waits for an Add

**Max Size** (`maxSize`)

- always: read at the next Add — the cap past which the oldest are dropped (not at least 0: 0, no cap); a buffer already over it is trimmed by the next Add

**Flush Interval (ms)** (`flushInterval`)

- the period it already holds (not above 0 reads as 0): nothing
- a different period above 0 with anything buffered: a running timer stops and a new one starts, to flush after the new period
- a different period with nothing buffered, or 0 (never by time): a running timer stops; a period above 0 is armed by the next Add

**Add** (`add`)

- before anything has arrived on Data: refused — the reason on Error, which nothing later clears → Failure; Overflowed, Flushed stay silent
- Data joins, past Max Size the oldest go (counted on Dropped Items), and the buffer reaches Flush Size: it becomes Flushed Data, a fresh one starts, Flush Count grows, a running timer stops → Overflowed, Flushed, Done
- Data joins, past Max Size the oldest go (counted on Dropped Items), under Flush Size, with Flush Interval above 0 and no timer running: a timer is armed to flush after Flush Interval → Overflowed, Done; Flushed stays silent
- Data joins, past Max Size the oldest go (counted on Dropped Items), under Flush Size, with no timer to arm (Flush Interval 0, or one already running): it waits → Overflowed, Done; Flushed stays silent
- Data joins and the buffer reaches Flush Size: it becomes Flushed Data, a fresh one starts, Flush Count grows, a running timer stops → Flushed, Done; Overflowed stays silent
- Data joins, under Flush Size, with Flush Interval above 0 and no timer running: a timer is armed to flush after Flush Interval → Done; Overflowed, Flushed stay silent
- Data joins, under Flush Size, with no timer to arm (Flush Interval 0, or one already running): it waits → Done; Overflowed, Flushed stay silent

**Flush** (`flush`)

- nothing buffered: nothing to hand over, and Flush Count stays → Unchanged; Flushed stays silent
- anything buffered: it becomes Flushed Data, a fresh buffer starts, Flush Count grows, a running timer stops → Flushed, Done

**Clear** (`clear`)

- anything buffered, flushed or counted: the buffer, Flushed Data and both counts are emptied — not Error, not the Data retained — and a running timer stops → Cleared, Done
- nothing held: the same empty values are sent again → Cleared, Unchanged

## Outputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `buffer` | Array | — | Items waiting to be flushed, oldest first |
| `bufferSize` | Number | — | How many items are waiting, which is what Flush Size is compared against |
| `droppedItems` | Number | — | How many items Max Size has discarded from the front since the last Clear |
| `flushCount` | Number | — | How many flushes have happened since the last Clear |
| `flushedData` | Array | — | The batch handed over by the most recent flush; a stable array that later Adds do not mutate |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `cleared` | Signal | — | Fires once the buffer has been discarded |
| `completed` | Signal | — | Fires after every invocation, whatever the outcome — wire this to carry on regardless. Failure still fires and still carries its reason, so this cannot hide an error |
| `done` | Signal | — | Fires once an Add, Flush or Clear you triggered has changed the buffer |
| `flushed` | Signal | — | Fires once Flushed Data holds a new batch, and not for a flush that found nothing |
| `overflowed` | Signal | — | Fires when Max Size has just discarded something |
| `unchanged` | Signal | — | Fires when a Flush found nothing to send, or a Clear found nothing to discard — an idle buffer doing exactly what it should |

### Failure outputs

| Name | Type | Default | Description |
|---|---|---|---|
| `error` | String | — | Why the last Add was refused; blank until one is |
| `failure` | Signal | — | Fires when Add ran before any value had arrived on Data, so nothing was buffered |

## Patterns

- Server-Sent Events `onMessage` → `add` with `flushInterval` 250 and `flushedData` → For Each: a live list that repaints four times a second instead of hundreds.
- `flushSize` and `flushInterval` together give 'whichever comes first', which keeps both a burst and a trickle responsive.
- The stream's `onClose` → `flush` releases the tail of a batch that never reached the flush size.

## Watch out for

- Relying on Flush Interval during server-side rendering — timers never advance there, so only Add, Flush and size-based flushing work.
- Using this to concatenate streamed text; Text Accumulator is the node for that.
- Setting Flush Size to 1, which is the same as no buffer at all plus an extra hop.

## Examples

**Long-running task monitor: progress, batched log lines, and a visible connection**

A backend job streams two kinds of frame on one connection. Pattern Extractor pulls the percentage out of human-readable status text, so a progress bar tracks it without a Function node. JSON Stream Parser turns NDJSON log payloads into values — several may complete in one frame, so `values` rather than `parsed` is what feeds downstream. Stream Buffer batches those into a flush every 250 ms, which keeps a busy log from repainting the list hundreds of times a second, and the stream's `onClose` flushes the tail that never reached a full batch.

## Related nodes

[Server-Sent Events](./net-noodl-sse.md), [Text Accumulator](./net-noodl-text-accumulator.md), [JSON Stream Parser](./net-noodl-jsonstream-parser.md), [Repeater](../visual/for-each.md), [Array](./collection2.md)

## Code export

Exports to React. A project that uses it exports this node as React code.

[How export works](../../how-export-works.md) shows what an export writes, with a worked example.

## Under the hood

This node's behaviour is written down as an executable spec in `@nodegx/node-spec`, version 1. The spec is the reference the conformance tests grade the runtime against. Every rule in it cites the line of the runtime it was read from. The full spec is at the bottom of this page.

### What it depends on outside the node

- time: timers, delays and the frame clock (`clock`)

### Starting state

```json
{
  "hasPendingData": false,
  "buffer": [],
  "flushedData": [],
  "flushCount": 0,
  "droppedItems": 0,
  "flushSize": 0,
  "flushInterval": 0,
  "maxSize": 10000,
  "armed": 0
}
```

### How actions report back

Each time Add, Flush or Clear is triggered, the node reports exactly one of **Done**, **Unchanged** or **Failure**.

## The full spec {#spec-source}

The spec's source, as the docs were generated. Helpers it imports live beside it in `packages/nodegx-node-spec/src`.

```ts title="packages/nodegx-node-spec/src/nodes/stream-buffer.ts"
/**
 * Stream Buffer (`net.noodl.StreamBuffer`) — read from
 * `packages/noodl-runtime/src/nodes/std-library/agent/stream-buffer.ts` on 2026-10-01 (NSP-013).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE, before the citations: `Data` is kept as sent and RETAINED between Adds; any write to
 * it — `undefined` included — counts as data having arrived (:80-84). `Add` before anything ever
 * arrived fails (`stream-buffer/no-data`, the sentence on `Error`, which nothing later clears,
 * :273-278, :304-313). Otherwise the value joins the buffer; past `Max Size` (0 = no cap; anything
 * not at least 0 reads as 0, :127-129) the OLDEST go, counted on `Dropped Items`, and `Overflowed`
 * pulses (:281-289). When the buffer reaches `Flush Size` (0 = never, :94-96) the same Add flushes
 * and owns the flush's outcome (:294-298); otherwise the INTERVAL timer is armed — one host
 * `setTimeout` of `Flush Interval` ms, only when the interval is above 0 and no timer is already
 * running (:300, :365-374) — and the Add is `done`. A flush (Add's, `Flush`'s or the timer's)
 * first stops the timer; an empty buffer is `unchanged`; otherwise the buffer becomes `Flushed
 * Data`, a fresh buffer starts, `Flush Count` grows and `Flushed` pulses (:315-339). The timer's
 * flush is no invocation and reports no outcome (:136-137). Changing `Flush Interval` to a
 * different value stops the timer and re-arms it at the new period when anything is buffered
 * (:107-115). `Clear` stops the timer, empties the buffer, `Flushed Data` and both counts — not
 * `Error`, not the retained data — pulses `Cleared`, and is `done` when anything was there, else
 * `unchanged` (:341-363).
 */

import { defineNode } from '../spec';

/** :275 */
export const NO_DATA_CODE = 'stream-buffer/no-data';
const NO_DATA = 'Nothing to add — no value has arrived on the Data input'; // :276

/**
 * The one host timer, by a tag per arming: a patch applies `after` BEFORE `cancel` (spec.ts), so a
 * re-arm that cancelled a shared tag would cancel the timer it had just armed.
 */
const tagOf = (n: number) => 'flush:' + n;

type State = {
  pendingData: unknown;
  hasPendingData: boolean;
  buffer: readonly unknown[];
  flushedData: readonly unknown[];
  flushCount: number;
  droppedItems: number;
  flushSize: number;
  flushInterval: number;
  maxSize: number;
  /** `internal.timer` — the pending interval timer's tag, or undefined (`null` in the runtime). */
  timer: string | undefined;
  /** How many timers have been armed — names the next one. */
  armed: number;
  lastError: string | undefined;
}

type Port = 'buffer' | 'bufferSize' | 'flushedData' | 'flushCount' | 'droppedItems' | 'error';
type Pulse = 'overflowed' | 'flushed';

/** :315-339 `doFlush` — the patch a flush adds, given the buffer it finds. Stops the timer first. */
function flush(s: Readonly<State>, buffer: readonly unknown[]): { set: Partial<State>; send: Port[]; emit: Pulse[]; cancel: string[]; flushed: boolean } {
  const cancel = s.timer !== undefined ? [s.timer] : []; // :317 → :376-382
  // :318-325 — the timer is only ever armed while something is buffered, so an empty flush has it stopped already
  if (buffer.length === 0) return { set: s.timer !== undefined ? { timer: undefined } : {}, send: [], emit: [], cancel, flushed: false };
  return {
    set: { timer: undefined, flushedData: buffer, buffer: [], flushCount: s.flushCount + 1 }, // :329-331
    send: ['flushedData', 'buffer', 'bufferSize', 'flushCount'], // :333-336
    emit: ['flushed'], // :337
    cancel,
    flushed: true
  };
}

export const StreamBuffer = defineNode({
  type: 'net.noodl.StreamBuffer',
  version: 1,
  source: 'packages/noodl-runtime/src/nodes/std-library/agent/stream-buffer.ts',
  needs: ['clock'],

  // :45-58 initialize
  state: { pendingData: undefined, hasPendingData: false, buffer: [], flushedData: [], flushCount: 0, droppedItems: 0, flushSize: 0, flushInterval: 0, maxSize: 10000, timer: undefined, armed: 0, lastError: undefined } as State,
  outcomes: ['done', 'unchanged', 'failure'], // :239-243

  inputs: {
    // :75-85 — as sent
    data: {
      type: '*',
      coerce: 'none',
      displayName: 'Data',
      group: 'Data',
      description: 'The next item to buffer, of any type; its value is retained between pulses of Add',
      // a unit object then a number is row C6 (node.ts merges them) — drawn often enough that the row fires on any day's seed
      examples: ['tok', 1, { delta: 'Hi' }, null, ['a', 'b'], { value: 1, unit: 'px' }, 5]
    },
    // :87-97
    flushSize: { type: 'number', default: 0, coerce: 'none', displayName: 'Flush Size', group: 'Config', description: 'Flush automatically once this many items are buffered; 0 disables size-based flushing', examples: [0, 1, 2, 3, -1] },
    // :99-116
    flushInterval: {
      type: 'number',
      default: 0,
      coerce: 'none',
      displayName: 'Flush Interval (ms)',
      group: 'Config',
      description: 'Flush automatically this often in milliseconds while items are buffered; 0 disables interval flushing',
      examples: [0, 50, 100, 250, -5]
    },
    // :118-130
    maxSize: { type: 'number', default: 10000, coerce: 'none', displayName: 'Max Size', group: 'Config', description: 'Hard cap on buffered items; overflow drops the oldest and is counted on Dropped Items; 0 means no cap', examples: [0, 1, 2, 3, -1] },
    // :132-140
    add: { type: 'signal', outcome: true, displayName: 'Add', group: 'Actions', description: 'Buffers the current Data, flushing straight away if that reaches Flush Size' },
    // :142-149
    flush: { type: 'signal', outcome: true, displayName: 'Flush', group: 'Actions', description: 'Hands the whole buffer to Flushed Data now; an empty buffer is a legitimate no-op' },
    // :151-158
    clear: { type: 'signal', outcome: true, displayName: 'Clear', group: 'Actions', description: 'Discards the buffer and resets both counters without flushing' }
  },

  outputs: {
    buffer: { type: 'array', from: (s) => s.buffer, displayName: 'Buffer', group: 'Data', description: 'Items waiting to be flushed, oldest first' },
    bufferSize: { type: 'number', from: (s) => s.buffer.length, displayName: 'Buffer Size', group: 'Status', description: 'How many items are waiting, which is what Flush Size is compared against' },
    flushedData: { type: 'array', from: (s) => s.flushedData, displayName: 'Flushed Data', group: 'Data', description: 'The batch handed over by the most recent flush; a stable array that later Adds do not mutate' },
    flushCount: { type: 'number', from: (s) => s.flushCount, displayName: 'Flush Count', group: 'Status', description: 'How many flushes have happened since the last Clear' },
    droppedItems: { type: 'number', from: (s) => s.droppedItems, displayName: 'Dropped Items', group: 'Status', description: 'How many items Max Size has discarded from the front since the last Clear' },
    flushed: { type: 'signal', displayName: 'Flushed', group: 'Events', description: 'Fires once Flushed Data holds a new batch, and not for a flush that found nothing' },
    overflowed: { type: 'signal', displayName: 'Overflowed', group: 'Events', description: 'Fires when Max Size has just discarded something' },
    cleared: { type: 'signal', displayName: 'Cleared', group: 'Events', description: 'Fires once the buffer has been discarded' },
    error: { type: 'string', from: (s) => s.lastError, displayName: 'Error', group: 'Error', description: 'Why the last Add was refused; blank until one is' }
  }
}).on(
  {
    data: (_s, v) => ({ says: 'always: kept as it came for the next Add, and retained after it — any write counts as data having arrived, nothing included', set: { pendingData: v, hasPendingData: true }, send: [] }), // :80-84
    flushSize: (_s, v) => ({ says: 'always: read at the next Add — the size at which that Add flushes (not above 0: never by size); a buffer already that big waits for an Add', set: { flushSize: Number(v) > 0 ? Number(v) : 0 }, send: [] }), // :94-96
    maxSize: (_s, v) => ({ says: 'always: read at the next Add — the cap past which the oldest are dropped (not at least 0: 0, no cap); a buffer already over it is trimmed by the next Add', set: { maxSize: Number(v) >= 0 ? Number(v) : 0 }, send: [] }), // :127-129
    // :107-115 — a different period stops the timer and re-arms it while anything is buffered
    flushInterval: (s, v) => {
      const next = Number(v) > 0 ? Number(v) : 0;
      if (next === s.flushInterval) return { says: 'the period it already holds (not above 0 reads as 0): nothing', send: [] };
      const cancel = s.timer !== undefined ? [s.timer] : [];
      if (s.buffer.length > 0 && next > 0) return { says: 'a different period above 0 with anything buffered: a running timer stops and a new one starts, to flush after the new period', set: { flushInterval: next, timer: tagOf(s.armed + 1), armed: s.armed + 1 }, send: [], cancel, after: [{ ms: next, tag: tagOf(s.armed + 1) }] };
      return { says: 'a different period with nothing buffered, or 0 (never by time): a running timer stops; a period above 0 is armed by the next Add', set: { flushInterval: next, timer: undefined }, send: [], cancel };
    },

    // :136-139 → :271-302 (NSP-018: one literal arm per case — overflow or not, then flushed, timer armed, or neither)
    add: (s) => {
      if (!s.hasPendingData) return { says: 'before anything has arrived on Data: refused — the reason on Error, which nothing later clears', set: { lastError: NO_DATA }, send: ['error'], outcome: 'failure', error: NO_DATA_CODE }; // :273-278, :304-308

      const buffer = s.buffer.concat([s.pendingData]); // :281
      const cancel = s.timer !== undefined ? [s.timer] : []; // :317 → :376-382 — a flush stops the timer first
      const arm = { timer: tagOf(s.armed + 1), armed: s.armed + 1 }; // :300 → :365-374
      const after = [{ ms: s.flushInterval, tag: tagOf(s.armed + 1) }];
      if (s.maxSize > 0 && buffer.length > s.maxSize) {
        // :283-289 — `splice(0, dropped)` (a fractional count deletes its integer part; the count grows by the fraction)
        const dropped = buffer.length - s.maxSize;
        buffer.splice(0, dropped);
        const droppedItems = s.droppedItems + dropped;
        if (s.flushSize > 0 && buffer.length >= s.flushSize) {
          // :294-298 — the Add owns the flush it triggered
          return { says: 'Data joins, past Max Size the oldest go (counted on Dropped Items), and the buffer reaches Flush Size: it becomes Flushed Data, a fresh one starts, Flush Count grows, a running timer stops', set: { droppedItems, timer: undefined, flushedData: buffer, buffer: [], flushCount: s.flushCount + 1 }, send: ['droppedItems', 'buffer', 'bufferSize', 'flushedData', 'buffer', 'bufferSize', 'flushCount'], emit: ['overflowed', 'flushed'], cancel, outcome: 'done' };
        }
        if (s.flushInterval > 0 && s.timer === undefined) return { says: 'Data joins, past Max Size the oldest go (counted on Dropped Items), under Flush Size, with Flush Interval above 0 and no timer running: a timer is armed to flush after Flush Interval', set: { buffer, droppedItems, ...arm }, send: ['droppedItems', 'buffer', 'bufferSize'], emit: ['overflowed'], after, outcome: 'done' };
        return { says: 'Data joins, past Max Size the oldest go (counted on Dropped Items), under Flush Size, with no timer to arm (Flush Interval 0, or one already running): it waits', set: { buffer, droppedItems }, send: ['droppedItems', 'buffer', 'bufferSize'], emit: ['overflowed'], outcome: 'done' };
      }
      if (s.flushSize > 0 && buffer.length >= s.flushSize) {
        // :294-298 — the Add owns the flush it triggered
        return { says: 'Data joins and the buffer reaches Flush Size: it becomes Flushed Data, a fresh one starts, Flush Count grows, a running timer stops', set: { timer: undefined, flushedData: buffer, buffer: [], flushCount: s.flushCount + 1 }, send: ['buffer', 'bufferSize', 'flushedData', 'buffer', 'bufferSize', 'flushCount'], emit: ['flushed'], cancel, outcome: 'done' };
      }
      // :300 → :365-374
      if (s.flushInterval > 0 && s.timer === undefined) return { says: 'Data joins, under Flush Size, with Flush Interval above 0 and no timer running: a timer is armed to flush after Flush Interval', set: { buffer, ...arm }, send: ['buffer', 'bufferSize'], emit: [], after, outcome: 'done' };
      return { says: 'Data joins, under Flush Size, with no timer to arm (Flush Interval 0, or one already running): it waits', set: { buffer }, send: ['buffer', 'bufferSize'], emit: [], outcome: 'done' }; // :301
    },

    // :146-148 → :315-339 (NSP-018: `flush`'s two cases as literal arms; the helper serves the timer)
    flush: (s) => {
      // :318-325 — the timer is only ever armed while something is buffered, so an empty flush has it stopped already
      if (s.buffer.length === 0) return { says: 'nothing buffered: nothing to hand over, and Flush Count stays', set: s.timer !== undefined ? { timer: undefined } : {}, send: [], emit: [], cancel: s.timer !== undefined ? [s.timer] : [], outcome: 'unchanged' };
      return {
        says: 'anything buffered: it becomes Flushed Data, a fresh buffer starts, Flush Count grows, a running timer stops',
        set: { timer: undefined, flushedData: s.buffer, buffer: [], flushCount: s.flushCount + 1 }, // :329-331
        send: ['flushedData', 'buffer', 'bufferSize', 'flushCount'], // :333-336
        emit: ['flushed'], // :337
        cancel: s.timer !== undefined ? [s.timer] : [], // :317 → :376-382
        outcome: 'done'
      };
    },

    // :155-157 → :341-363
    clear: (s) => {
      const hadSomething = s.buffer.length > 0 || s.flushedData.length > 0 || s.droppedItems > 0 || s.flushCount > 0; // :346-350
      const set: Partial<State> = { timer: undefined, buffer: [], flushedData: [], droppedItems: 0, flushCount: 0 }; // :343, :351-354
      const cancel = s.timer !== undefined ? [s.timer] : [];
      if (hadSomething) return { says: 'anything buffered, flushed or counted: the buffer, Flushed Data and both counts are emptied — not Error, not the Data retained — and a running timer stops', set, send: ['buffer', 'bufferSize', 'flushedData', 'flushCount', 'droppedItems'], emit: ['cleared'], cancel, outcome: 'done' }; // :356-362
      return { says: 'nothing held: the same empty values are sent again', set, send: ['buffer', 'bufferSize', 'flushedData', 'flushCount', 'droppedItems'], emit: ['cleared'], cancel, outcome: 'unchanged' }; // :362
    }
  },
  {
    world: {
      // :370-373 — the timer clears its own handle, then flushes with no token: no outcome
      timer: (s, _i, tag) => {
        if (tag !== s.timer) return {}; // a stopped timer never fires (clearTimeout); kept for the reader
        const f = flush({ ...s, timer: undefined }, s.buffer);
        if (!f.flushed) return { set: { timer: undefined } };
        return { set: f.set, send: f.send, emit: f.emit };
      }
    }
  }
);
```


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
