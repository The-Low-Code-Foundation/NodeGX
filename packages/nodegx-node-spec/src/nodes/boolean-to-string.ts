/**
 * Boolean To String — read from `packages/noodl-runtime/src/nodes/std-library/booleantostring.ts`
 * on 2026-09-30 (NSP-011).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * Two readers of `input` that do not agree with each other, both carried: the guard (:71) is
 * `===` on the RAW value — so `1` after `true` is a change and fires Selector Changed, and `NaN`
 * after `NaN` fires every time — while the getter (:86) applies truthiness. The port's description
 * says "anything that is not true counts as false"; the code counts anything truthy as true
 * (`'yes'`, `1`, `{}` pick String for true) — NSP-011 §6 row D6.
 */

import { defineNode } from '../spec';

export const BooleanToString = defineNode({
  type: 'Boolean To String',
  // v2 (NSP-013 s12): writing String for true or String for false with the value it already holds
  // (`===`) does nothing — nothing stored, nothing sent. v1 stored and sent it. Visible only on a frame
  // that has sent nothing yet (the scenario "String for false = '' at mount …"). Note `===`: NaN never
  // equals itself, so NaN twice is sent twice; `undefined` after the initial '' is a change.
  version: 2,
  source: 'packages/noodl-runtime/src/nodes/std-library/booleantostring.ts',

  // initialize (:28-35): trueString '', falseString ''; `currentInput` is never seeded (:20, :73).
  // `inputs`, `currentSelectedIndex`, `indexChanged` (:29-31) are written there and read nowhere
  // (the docblock at :8-11 says so) — not carried.
  state: { sel: undefined as unknown, t: '' as unknown, f: '' as unknown },

  inputs: {
    // :37-49 — stored raw (:44) behind the :43 same-value guard (`===` against what is held)
    trueString: {
      type: 'string',
      coerce: 'none',
      displayName: 'String for true',
      group: 'Values',
      description: 'Text published on Current Value while Selector is true'
    },
    // :51-63
    falseString: {
      type: 'string',
      coerce: 'none',
      displayName: 'String for false',
      group: 'Values',
      description: 'Text published on Current Value while Selector is false'
    },
    // :65-77 — raw; `===` guard at :71
    input: {
      type: 'boolean',
      coerce: 'none',
      displayName: 'Selector',
      group: 'Values',
      description: 'Which of the two strings to publish; anything that is not true counts as false'
    }
  },

  outputs: {
    // :80-88 getter → `currentInput ? trueString : falseString` — truthiness
    currentValue: {
      type: 'string',
      from: (s) => (s.sel ? s.t : s.f),
      displayName: 'Current Value',
      group: 'Values',
      description: 'String for true or String for false, whichever Selector currently picks'
    },
    // :89-94
    inputChanged: {
      type: 'signal',
      displayName: 'Selector Changed',
      group: 'Events',
      description: 'Fires when Selector flips, after Current Value has been updated'
    }
  }
}).on({
  // :42-49 — the same value (`===`, :43) does nothing, not even a send; otherwise store, and the
  // output is SENT only while this is the selected string (:46-48). Which writes send is what a
  // wire holds when the output ends a frame `undefined` (spec.ts `send`). ⚠️ s4 dropped the :43
  // guard as "the wire dedups" — it does not on a frame that has sent nothing yet: `''` at mount
  // equals the initial `''` and sends nothing, so a Selector flip to a missing string in the same
  // frame leaves the wire EMPTY, not `''` (found s12 by generated seed 799069363 once the daily
  // rotation stopped replaying one corpus, NSP-013 §6.1b T4).
  trueString: (s, v) => (s.t === v ? { send: [] } : { set: { t: v }, send: s.sel ? ['currentValue'] : [] }),
  // :56-63 — the mirror (:57, :60-62)
  falseString: (s, v) => (s.f === v ? { send: [] } : { set: { f: v }, send: s.sel ? [] : ['currentValue'] }),
  // :70-76 — same raw value (`===`) → nothing, not even a send; otherwise store, flag, pulse
  input: (s, v) => (s.sel === v ? { send: [] } : { set: { sel: v }, emit: ['inputChanged'] })
});
