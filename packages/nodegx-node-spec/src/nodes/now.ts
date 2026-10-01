/**
 * Now (`net.noodl.Now`) — read from `packages/noodl-runtime/src/nodes/std-library/date/now.ts` on
 * 2026-10-01 (NSP-013).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE, before the citations: the node holds ONE instant — the clock as read at creation
 * (:45-47, so the outputs are never empty) and again on every `Read` (:98-107), which reports
 * `done` and nothing else (:84-85: reading a clock cannot fail and two Reads in one millisecond
 * still re-read). The clock is `Date.now()` (:99 — not the frame clock, :8-19), which under a
 * world is the WORLD'S clock (world.ts CLOCK): a node created at time 0 shows the epoch, and a
 * Read after `advance(ms)` shows `ms`. Three shapes of the same instant: a `Date`, epoch
 * milliseconds, an ISO-8601 string in UTC (:60-82).
 */

import { defineNode } from '../spec';

export const Now = defineNode({
  type: 'net.noodl.Now',
  version: 1,
  source: 'packages/noodl-runtime/src/nodes/std-library/date/now.ts',
  needs: ['clock'],

  // :45-47 initialize — `new Date(Date.now())`
  state: { now: 0 },
  init: (w) => ({ now: w.now() }),
  // :48-50
  inspect: (s) => new Date(s.now).toISOString(),
  // :84-85 outcomeOutputs({ done })
  outcomes: ['done'],

  inputs: {
    // :52-59
    read: { type: 'signal', outcome: true, displayName: 'Read', group: 'Actions', description: 'Re-reads the clock. The outputs hold the instant of the last Read, not a live value' }
  },

  outputs: {
    // :61-69
    date: { type: 'date', from: (s) => new Date(s.now), displayName: 'Date', group: 'Values', description: 'The instant of the last Read, for the other date nodes' },
    // :70-78
    timestamp: { type: 'number', from: (s) => s.now, displayName: 'Timestamp', group: 'Values', description: 'The same instant as milliseconds since 1 January 1970 UTC' },
    // :79-87
    iso: { type: 'string', from: (s) => new Date(s.now).toISOString(), displayName: 'ISO String', group: 'Values', description: 'The same instant as an ISO-8601 string in UTC — the shape to put in a JSON body' }
  }
}).on({
  // :98-107 `_read` — the clock, all three flagged, `done`
  read: (_s, _i, w) => ({ set: { now: w.now() }, outcome: 'done' })
});
