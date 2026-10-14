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
  version: 2,
  // NSP-010 — the history. FH-022 slice 3 came before this spec, so v1 is the behaviour after it; the before and after traces
  // are golden/changes/Counter@1.json, the before replayed on the runtime at 328a025dc^ (noodl-runtime nsp-010-counter-history)
  changes: [
    {
      version: 1,
      says: 'A Reset when the count is already at Start Value reports Unchanged and Count Changed stays silent. Before, every Reset reported Done and pulsed Count Changed, even when nothing moved',
      row: 'FH-022 slice 3',
      commit: '328a025dc',
      migration: {
        none: "The old pulse said the count moved when it had not, and the guard meant to stop it was dead from the day it was written. Counter has no Treat Unchanged As input to keep it (counter.ts spreads outcomeOutputs, never outcomeInputs), and the change shipped alone so one revert brings it back if a project depended on it"
      }
    },
    {
      version: 2,
      says: 'A Min Value above Max Value now shows the editor a warning until it is fixed. Before, nothing said so, and with Limits Enabled on the count got stuck with no reason given',
      row: 'NSP-019 s95',
      migration: {
        none: 'Only the editor is told. Nothing a wire carries changes, and a deployed app shows nothing'
      }
    }
  ],
  source: 'packages/noodl-runtime/src/nodes/std-library/counter.ts',
  // NSP-018 — the hand-written code this node replaces (read by nothing yet; `spec-ledger` counts it)
  idioms: [
    { says: 'a number in state with +1 / −1 / reset handlers', example: 'const [n, setN] = useState(0)' },
    { says: 'a clamped counter', example: 'setN((n) => Math.min(n + 1, max))' }
  ],

  // initialize (:29-37): currentValue 0, startValue 0, startValueSet false. The limits live in
  // `_internal` too (:34-36) but they are plain copies of inputs, so here they are inputs.
  state: { count: 0, start: 0, startSeen: false },
  // :38 getInspectInfo
  inspect: (s) => 'Count: ' + s.count,
  // `checkLimits`, from both limit setters (NSP-019 s95): Min above Max is a mistake with or without Limits Enabled — with it on,
  // Increase stops at Max and Decrease at Min, so every count ends where neither moves it
  diagnostics: {
    'counter/min-above-max': {
      says: 'Min Value is above Max Value',
      // R40 — Min Value and Max Value as saved: the warning shows at the placing
      settings: ['limitsMin', 'limitsMax'],
      message: (i) => (i.limitsMin > i.limitsMax ? `Min Value ${i.limitsMin} is above Max Value ${i.limitsMax}. With Limits Enabled on, the count gets stuck.` : null)
    }
  },
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
        ? { says: 'at Max Value with Limits Enabled', outcome: 'unchanged' }
        : { says: 'otherwise the count goes up by one', set: { count: s.count + 1 }, emit: ['countChanged'], outcome: 'done' },

    // :64-76, the mirror: at Min → `unchanged` (:66-69); otherwise -- (:71-75).
    decrease: (s, i) =>
      i.limitsEnabled && s.count <= i.limitsMin
        ? { says: 'at Min Value with Limits Enabled', outcome: 'unchanged' }
        : { says: 'otherwise the count goes down by one', set: { count: s.count - 1 }, emit: ['countChanged'], outcome: 'done' },

    // :107-117 (FH-022 slice 3). Already at Start Value → `unchanged`, Count Changed silent
    // (:109-112); otherwise back to start, pulse, `done` (:113-116). Note the comparison is
    // against `startValue`, not `0` — the docblock at :96-101 says why the obvious repair is wrong.
    reset: (s) =>
      s.count === s.start
        ? { says: 'already at Start Value', outcome: 'unchanged' }
        : { says: 'otherwise the count goes back to Start Value', set: { count: s.start }, emit: ['countChanged'], outcome: 'done' },

    // :125-133. The asymmetric setter: the FIRST Start Value also seeds the count and pulses
    // Count Changed ("once at page load", :186); later ones only move where Reset returns to.
    startValue: (s, v) =>
      s.startSeen
        ? { says: 'after the first: only where Reset returns to', set: { start: v } }
        : { says: 'the first one: the count starts there too', set: { start: v, count: v, startSeen: true }, emit: ['countChanged'] }
});
