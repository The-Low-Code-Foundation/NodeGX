/**
 * Counter — read from `packages/noodl-runtime/src/nodes/std-library/counter.ts` on 2026-09-30.
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from; where
 * the spec and the runtime disagree, that is a §6 row in NSP-004 and a ruling — not an edit here.
 *
 * Why this node first: state, limits, three outcome signals, an asymmetric setter, and a known
 * historic drift (FH-022: a Reset guard that was dead from the day it was written).
 */

import { defineNode } from '../spec';

export const Counter = defineNode({
  type: 'Counter',
  version: 1,
  source: 'packages/noodl-runtime/src/nodes/std-library/counter.ts',

  // initialize (:29-37): currentValue 0, startValue 0, startValueSet false. The limits live in
  // `_internal` too (:34-36) but they are plain copies of inputs, so here they are inputs.
  state: { count: 0, start: 0, startSeen: false },
  // :38 getInspectInfo
  inspect: (s) => 'Count: ' + s.count,
  // :194-198 outcomeOutputs({ done, unchanged }) — no failure: a counter cannot fail
  outcomes: ['done', 'unchanged'],

  inputs: {
    // :42-60, :61-77, :78-118 — `valueChangedToTrue`, each opening with `beginOutcome()`
    increase: {
      type: 'signal',
      outcome: true,
      displayName: 'Increase Count',
      group: 'Actions',
      description: 'Adds one to the count, or does nothing at all when Limits Enabled and the count is already at Max Value'
    },
    decrease: {
      type: 'signal',
      outcome: true,
      displayName: 'Decrease Count',
      group: 'Actions',
      description: 'Subtracts one from the count, or does nothing at all when Limits Enabled and the count is already at Min Value'
    },
    reset: {
      type: 'signal',
      outcome: true,
      displayName: 'Reset To Start',
      group: 'Actions',
      description: 'Puts the count back to Start Value, or reports Unchanged and leaves Count Changed silent when it is already there'
    },
    // :119-134 `set: … this._internal.startValue = Number(value)`
    startValue: {
      type: 'number',
      default: 0,
      coerce: 'js-number',
      displayName: 'Start Value',
      group: 'Values',
      description: 'Count to begin at and to return to on Reset; setting it announces a change on Count Changed at page load'
    },
    // :135-146, :147-158 `Number(value)`
    limitsMin: {
      type: 'number',
      default: 0,
      coerce: 'js-number',
      displayName: 'Min Value',
      group: 'Limits',
      description: 'Lowest count Decrease will reach, ignored unless Limits Enabled'
    },
    limitsMax: {
      type: 'number',
      default: 0,
      coerce: 'js-number',
      displayName: 'Max Value',
      group: 'Limits',
      description: 'Highest count Increase will reach, ignored unless Limits Enabled'
    },
    // :159-170 `value ? true : false`
    limitsEnabled: {
      type: 'boolean',
      default: false,
      coerce: 'js-boolean',
      displayName: 'Limits Enabled',
      group: 'Limits',
      description: 'Whether Min Value and Max Value bound the count; without it the count runs unbounded in both directions'
    }
  },

  outputs: {
    // :173-181 getter → `_internal.currentValue`
    currentCount: { type: 'number', from: (s) => s.count, displayName: 'Current Count', group: 'Values', description: 'The count as it stands' },
    // :182-187
    countChanged: {
      type: 'signal',
      displayName: 'Count Changed',
      group: 'Events',
      description: 'Fires after the count has moved, and also once at page load when Start Value is set'
    }
  }
}).on({
    // :46-59. Limits Enabled and already at Max → `unchanged`, nothing else (:50-53);
    // otherwise ++, flag currentCount, pulse countChanged, `done` (:55-58).
    increase: (s, i) =>
      i.limitsEnabled && s.count >= i.limitsMax
        ? { outcome: 'unchanged' }
        : { set: { count: s.count + 1 }, emit: ['countChanged'], outcome: 'done' },

    // :64-76, the mirror: at Min → `unchanged` (:66-69); otherwise -- (:71-75).
    decrease: (s, i) =>
      i.limitsEnabled && s.count <= i.limitsMin
        ? { outcome: 'unchanged' }
        : { set: { count: s.count - 1 }, emit: ['countChanged'], outcome: 'done' },

    // :107-117 (FH-022 slice 3). Already at Start Value → `unchanged`, Count Changed silent
    // (:109-112); otherwise back to start, pulse, `done` (:113-116). Note the comparison is
    // against `startValue`, not `0` — the docblock at :96-101 says why the obvious repair is wrong.
    reset: (s) =>
      s.count === s.start
        ? { outcome: 'unchanged' }
        : { set: { count: s.start }, emit: ['countChanged'], outcome: 'done' },

    // :125-133. The asymmetric setter: the FIRST Start Value also seeds the count and pulses
    // Count Changed ("once at page load", :186); later ones only move where Reset returns to.
    startValue: (s, v) =>
      s.startSeen ? { set: { start: v } } : { set: { start: v, count: v, startSeen: true }, emit: ['countChanged'] }
});
