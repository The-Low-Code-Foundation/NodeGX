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
  // v2 (P109 ISL-027, row C5 ruled "Start with no remembered value"): a first Value of 0 is stored and fires
  // Changed like any other value, and a Set before any Value reports Unchanged. v1 ignored a first 0 (it equalled
  // a hidden seed of 0) and a Set before any Value stored that seed and reported Done.
  version: 2,
  source: 'packages/noodl-runtime/src/nodes/std-library/variables/number.ts',
  // NSP-018 — the hand-written code this node replaces (read by nothing yet; `spec-ledger` counts it)
  idioms: [
    { says: 'a number held in state, set from elsewhere', example: 'const [price, setPrice] = useState(0)' }
  ],
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
