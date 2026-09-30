/**
 * Boolean — read from `packages/noodl-runtime/src/nodes/std-library/variables/boolean.ts` on
 * 2026-09-30 (NSP-011). The family's rules are in variable-base.ts; this file is the four lines
 * boolean.ts supplies.
 */

import { defineNode } from '../spec';
import { afterSets, CHANGED, onSet, onValue, SAVED_VALUE_DESCRIPTION, VARIABLE_OUTCOMES, variableInputs, variableState, type VariableArgs } from './variable-base';

/** :7-23 — startValue false (:10); `cast` is `Boolean(value)` (:16-18); empty options null / false (:19-22) */
export const BOOLEAN: VariableArgs & { type: 'boolean' } = {
  type: 'boolean',
  startValue: false,
  cast: (value) => Boolean(value),
  emptyOptions: [
    { value: 'null', label: 'Null (default)', coerce: null },
    { value: 'false', label: 'False', coerce: false }
  ]
};

export const BooleanVariable = defineNode({
  type: 'Boolean',
  version: 1,
  source: 'packages/noodl-runtime/src/nodes/std-library/variables/boolean.ts',
  state: variableState(BOOLEAN),
  inspect: (s) => String(s.current),
  outcomes: VARIABLE_OUTCOMES,
  inputs: variableInputs(BOOLEAN),
  outputs: {
    savedValue: { type: 'boolean', from: (s) => s.current, displayName: 'Value', group: 'Values', description: SAVED_VALUE_DESCRIPTION },
    changed: CHANGED
  }
}).on(
  { value: (s, v, i) => onValue(BOOLEAN, s, v, i), saveValue: onSet },
  { afterInputs: (s, i) => afterSets(BOOLEAN, s, i) }
);
