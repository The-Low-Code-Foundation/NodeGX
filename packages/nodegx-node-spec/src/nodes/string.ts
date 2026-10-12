/**
 * String — read from `packages/noodl-runtime/src/nodes/std-library/variables/string.ts` on
 * 2026-09-30 (NSP-011). The family's rules are in variable-base.ts; this file is what string.ts
 * supplies, plus the one output the family does not have: `length` (:37-59).
 */

import { defineNode } from '../spec';
import { afterSets, CHANGED, onSet, onValue, SAVED_VALUE_DESCRIPTION, VARIABLE_OUTCOMES, variableInputs, variableState, type VariableArgs } from './variable-base';

/** :12-35 — startValue '' (:15); `cast` is `String(value)` (:25-27); empty options null / '' (:31-34) */
export const STRING: VariableArgs & { type: 'string' } = {
  type: 'string',
  startValue: '',
  cast: (value) => String(value),
  emptyOptions: [
    { value: 'null', label: 'Null (default)', coerce: null },
    { value: 'empty-string', label: 'Empty string ("")', coerce: '' }
  ]
};

export const StringVariable = defineNode({
  type: 'String',
  // v2 (P109 ISL-027, row C5 ruled "Start with no remembered value"): a first Value of 0 is stored and fires
  // Changed like any other value, and a Set before any Value reports Unchanged. v1 ignored a first 0 (it equalled
  // a hidden seed of 0) and a Set before any Value stored that seed and reported Done.
  version: 2,
  source: 'packages/noodl-runtime/src/nodes/std-library/variables/string.ts',
  // NSP-018 — the hand-written code this node replaces (read by nothing yet; `spec-ledger` counts it)
  idioms: [
    { says: 'a string held in state, set from elsewhere', example: 'const [name, setName] = useState(\'\')' }
  ],
  state: variableState(STRING),
  inspect: (s) => String(s.current),
  outcomes: VARIABLE_OUTCOMES,
  inputs: variableInputs(STRING),
  outputs: {
    savedValue: { type: 'string', from: (s) => s.current, displayName: 'Value', group: 'Values', description: SAVED_VALUE_DESCRIPTION },
    // :40-58 — `typeof value === 'string' ? value.length : 0`; flagged on every changed store (:28-30)
    length: {
      type: 'number',
      from: (s) => (typeof s.current === 'string' ? s.current.length : 0),
      displayName: 'Length',
      group: 'Values',
      description:
        '0 when the Variable is cleared (`savedValue` is `null`) — there is no text to ' +
        'measure, and 0 is what an author reading this as a plain number expects, rather than ' +
        'a thrown error or `null` itself.'
    },
    changed: CHANGED
  }
}).on(
  { value: (s, v, i) => onValue(STRING, s, v, i), saveValue: onSet },
  { afterInputs: (s, i) => afterSets(STRING, s, i) }
);
