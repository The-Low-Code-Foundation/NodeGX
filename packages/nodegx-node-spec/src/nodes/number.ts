/**
 * Number — read from `packages/noodl-runtime/src/nodes/std-library/variables/number.ts` on
 * 2026-09-30 (NSP-011). The family's rules are in variable-base.ts; this file is the four lines
 * number.ts supplies.
 */

import { defineNode } from '../spec';
import { afterSets, CHANGED, onSet, onValue, SAVED_VALUE_DESCRIPTION, VARIABLE_OUTCOMES, variableInputs, variableState, type VariableArgs } from './variable-base';

/** :7-30 — startValue 0 (:10); `cast` is `Number(value)` (:22-24), NaN handled by the base (:17-21); empty options null / 0 (:25-28) */
export const NUMBER: VariableArgs & { type: 'number' } = {
  type: 'number',
  startValue: 0,
  cast: (value) => Number(value),
  emptyOptions: [
    { value: 'null', label: 'Null (default)', coerce: null },
    { value: 'zero', label: 'Zero (0)', coerce: 0 }
  ]
};

export const NumberVariable = defineNode({
  type: 'Number',
  version: 1,
  source: 'packages/noodl-runtime/src/nodes/std-library/variables/number.ts',
  state: variableState(NUMBER),
  inspect: (s) => String(s.current),
  outcomes: VARIABLE_OUTCOMES,
  inputs: variableInputs(NUMBER),
  outputs: {
    savedValue: { type: 'number', from: (s) => s.current, displayName: 'Value', group: 'Values', description: SAVED_VALUE_DESCRIPTION },
    changed: CHANGED
  }
}).on(
  { value: (s, v, i) => onValue(NUMBER, s, v, i), saveValue: onSet },
  { afterInputs: (s, i) => afterSets(NUMBER, s, i) }
);
