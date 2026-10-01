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
    data: (_s, v) => ({ set: { pendingData: v, hasPendingData: true }, send: [] }), // :80-84
    flushSize: (_s, v) => ({ set: { flushSize: Number(v) > 0 ? Number(v) : 0 }, send: [] }), // :94-96
    maxSize: (_s, v) => ({ set: { maxSize: Number(v) >= 0 ? Number(v) : 0 }, send: [] }), // :127-129
    // :107-115 — a different period stops the timer and re-arms it while anything is buffered
    flushInterval: (s, v) => {
      const next = Number(v) > 0 ? Number(v) : 0;
      if (next === s.flushInterval) return { send: [] };
      const cancel = s.timer !== undefined ? [s.timer] : [];
      if (s.buffer.length > 0 && next > 0) return { set: { flushInterval: next, timer: tagOf(s.armed + 1), armed: s.armed + 1 }, send: [], cancel, after: [{ ms: next, tag: tagOf(s.armed + 1) }] };
      return { set: { flushInterval: next, timer: undefined }, send: [], cancel };
    },

    // :136-139 → :271-302
    add: (s) => {
      if (!s.hasPendingData) return { set: { lastError: NO_DATA }, send: ['error'], outcome: 'failure', error: NO_DATA_CODE }; // :273-278, :304-308

      const buffer = s.buffer.concat([s.pendingData]); // :281
      const set: Partial<State> = { buffer };
      const send: Port[] = [];
      const emit: Pulse[] = [];
      if (s.maxSize > 0 && buffer.length > s.maxSize) {
        // :283-289 — `splice(0, dropped)` (a fractional count deletes its integer part; the count grows by the fraction)
        const dropped = buffer.length - s.maxSize;
        buffer.splice(0, dropped);
        set.droppedItems = s.droppedItems + dropped;
        send.push('droppedItems');
        emit.push('overflowed');
      }
      send.push('buffer', 'bufferSize'); // :291-292

      if (s.flushSize > 0 && buffer.length >= s.flushSize) {
        // :294-298 — the Add owns the flush it triggered
        const f = flush(s, buffer);
        return { set: { ...set, ...f.set }, send: [...send, ...f.send], emit: [...emit, ...f.emit], cancel: f.cancel, outcome: 'done' };
      }
      // :300 → :365-374
      if (s.flushInterval > 0 && s.timer === undefined) return { set: { ...set, timer: tagOf(s.armed + 1), armed: s.armed + 1 }, send, emit, after: [{ ms: s.flushInterval, tag: tagOf(s.armed + 1) }], outcome: 'done' };
      return { set, send, emit, outcome: 'done' }; // :301
    },

    // :146-148 → :315-339
    flush: (s) => {
      const f = flush(s, s.buffer);
      return { set: f.set, send: f.send, emit: f.emit, cancel: f.cancel, outcome: f.flushed ? 'done' : 'unchanged' };
    },

    // :155-157 → :341-363
    clear: (s) => {
      const hadSomething = s.buffer.length > 0 || s.flushedData.length > 0 || s.droppedItems > 0 || s.flushCount > 0; // :346-350
      return {
        set: { timer: undefined, buffer: [], flushedData: [], droppedItems: 0, flushCount: 0 }, // :343, :351-354
        send: ['buffer', 'bufferSize', 'flushedData', 'flushCount', 'droppedItems'], // :356-360
        emit: ['cleared'], // :361
        cancel: s.timer !== undefined ? [s.timer] : [],
        outcome: hadSomething ? 'done' : 'unchanged' // :362
      };
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
