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
  version: 1,
  source: 'packages/noodl-runtime/src/nodes/std-library/variables/string.ts',
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
