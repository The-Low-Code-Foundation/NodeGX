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
  // v2 (P109 ISL-027, row C5 ruled "Start with no remembered value"): a first Value of 0 is stored and fires
  // Changed like any other value, and a Set before any Value reports Unchanged. v1 ignored a first 0 (it equalled
  // a hidden seed of 0) and a Set before any Value stored that seed and reported Done.
  version: 2,
  source: 'packages/noodl-runtime/src/nodes/std-library/variables/boolean.ts',
  // NSP-018 — the hand-written code this node replaces (read by nothing yet; `spec-ledger` counts it)
  idioms: [
    { says: 'a boolean held in state, set from elsewhere', example: 'const [done, setDone] = useState(false)' }
  ],
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
