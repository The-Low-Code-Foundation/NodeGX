/**
 * Switch — read from `packages/noodl-runtime/src/nodes/std-library/switch.ts` on 2026-09-30.
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from; where
 * the spec and the runtime disagree, that is a §6 row in NSP-004 and a ruling — not an edit here.
 *
 * Why this node is in the pilot: a latch, special-cased in the exporter's `plan.ts` beside
 * Counter (`isLatchType`). Three signal inputs share one body (:118-129) and one outcome contract.
 */

import { defineNode } from '../spec';

export const Switch = defineNode({
  type: 'Switch',
  version: 1,
  source: 'packages/noodl-runtime/src/nodes/std-library/switch.ts',

  // initialize (:22-25): state false. `initialized` (:24) is written there and read nowhere else in
  // the file — dead state, not carried.
  state: { on: false },
  // :26-30 — one value entry holding the state
  inspect: (s) => String(s.on),
  // :108-115 outcomeOutputs({ done, unchanged }) — no failure: a switch cannot fail
  outcomes: ['done', 'unchanged'],

  inputs: {
    // :32-39, :40-47, :48-56 — `valueChangedToTrue`, each through `setStateByAction` (:118-129)
    on: {
      type: 'signal',
      outcome: true,
      displayName: 'On',
      group: 'Change State',
      description: 'Switches on, or fires Unchanged if it is already on'
    },
    off: {
      type: 'signal',
      outcome: true,
      displayName: 'Off',
      group: 'Change State',
      description: 'Switches off, or fires Unchanged if it is already off'
    },
    flip: {
      type: 'signal',
      outcome: true,
      displayName: 'Flip',
      group: 'Change State',
      description: 'Switches to whichever state it is not currently in'
    },
    // :58-69 `set: … this._internal.state = !!value`
    onFromStart: {
      type: 'boolean',
      default: false,
      coerce: 'js-boolean',
      displayName: 'State',
      group: 'General',
      description: 'State to start in, and setting it announces a switch on Switched even though nothing switched'
    }
  },

  outputs: {
    // :72-80 getter → `_internal.state`
    state: {
      type: 'boolean',
      from: (s) => s.on,
      displayName: 'Current State',
      group: 'Values',
      description: 'True while the switch is on — wire it into a mounted or visible port for a gate that turns on AND off'
    },
    // :81-98 — `emitSignals` (:130-137) pulses the matching sibling FIRST, then `switched`
    switched: {
      type: 'signal',
      displayName: 'Switched',
      group: 'Events',
      description: 'Fires on every state change, alongside whichever of Switched To On and Switched To Off applies'
    },
    switchedToOn: { type: 'signal', displayName: 'Switched To On', group: 'Events', description: 'Fires when the switch becomes on' },
    switchedToOff: { type: 'signal', displayName: 'Switched To Off', group: 'Events', description: 'Fires when the switch becomes off' }
  }
}).on({
  // :118-129 `setStateByAction(next)`: already there → `unchanged` and nothing else (:120-123,
  // ERG-001 §4's register — the bare `return` that stopped a chain dead); otherwise move,
  // pulse the sibling then `switched` (:125-126, :130-137), then `done` (:128).
  on: (s) => (s.on ? { outcome: 'unchanged' } : { set: { on: true }, emit: ['switchedToOn', 'switched'], outcome: 'done' }),
  off: (s) => (s.on ? { set: { on: false }, emit: ['switchedToOff', 'switched'], outcome: 'done' } : { outcome: 'unchanged' }),
  // :48-56 — Flip cannot no-op: `setStateByAction(!state)` never meets the unchanged guard
  flip: (s) => ({ set: { on: !s.on }, emit: [s.on ? 'switchedToOff' : 'switchedToOn', 'switched'], outcome: 'done' }),

  // :64-68 — the setter announces EVERY write, including one to the state it already has
  // ("announces a switch on Switched even though nothing switched", :62; NDA-012's Logic row 1).
  // No outcome: a value arriving is not an invocation.
  onFromStart: (_s, v) => ({ set: { on: v }, emit: [v ? 'switchedToOn' : 'switchedToOff', 'switched'] })
});
