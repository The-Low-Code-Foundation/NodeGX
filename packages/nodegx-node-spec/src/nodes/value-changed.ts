/**
 * Value Changed — read from `packages/noodl-viewer-react/src/nodes/std-library/valuechanged.ts` on
 * 2026-09-30 (NSP-011). A viewer-provided node: the runtime target registers it from the viewer's
 * source (conformance.test.ts), the viewer's `register-nodes.js` :56 being where the app does.
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * "Defined by equality" (NSP-011 §3): the rule is `===` on the raw value (:32). So: an object is a
 * change unless it is the SAME reference (the description says so); `NaN` is a change every time
 * (`NaN === NaN` is false); `-0` after `0` is not a change; and a first arrival of `undefined` is
 * NOT a change (`lastValue` starts `undefined`, :15) — the one case where "including the first
 * time it arrives" (:47) is not true. The canonicaliser (NSP-002) tags `NaN` and `-0` so a trace
 * can tell them apart; nothing here needed changing there.
 *
 * ⚠️ Not this node's, but on its wire: node.ts `setInputValue` (:410-420) merges a later value
 * into a `{ value, unit }` object the port once held, so `2` after `{ value: 1, unit: 'px' }`
 * arrives as a NEW object `{ value: 2, unit: 'px' }` — and a repeated `2` fires again every time.
 * The spec models the node; that port rule is NSP-011 §6 row C6 and R7, counted by the runner.
 */

import { defineNode } from '../spec';

export const ValueChanged = defineNode({
  type: 'Value Changed',
  version: 1,
  source: 'packages/noodl-viewer-react/src/nodes/std-library/valuechanged.ts',

  // initialize (:14-17): lastValue undefined, changeCount 0
  state: { last: undefined as unknown, count: 0 },
  // :18-23
  inspect: (s) => (s.count ? 'Triggered ' + s.count + (s.count === 1 ? ' time' : ' times') : 'Not triggered'),

  inputs: {
    // :25-40 — raw, `===` against the last (:32)
    value: {
      type: '*',
      coerce: 'none',
      displayName: 'Input',
      group: 'Values',
      description: 'Value to watch; changes are detected by identity, so editing an Object or Array in place is not a change here'
    }
  },

  outputs: {
    // :43-48
    valueChanged: {
      type: 'signal',
      displayName: 'Value Changed',
      group: 'Events',
      description: 'Fires when Input becomes a different value, including the first time it arrives'
    }
  }
}).on({
  // :31-39 — same (`===`) → nothing; else count, pulse, remember
  value: (s, v) => (s.last === v ? {} : { set: { last: v, count: s.count + 1 }, emit: ['valueChanged'] })
});
