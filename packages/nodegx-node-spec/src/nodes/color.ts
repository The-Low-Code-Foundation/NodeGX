/**
 * Color — read from `packages/noodl-viewer-react/src/nodes/std-library/variables/color.ts` on
 * 2026-09-30 (NSP-011). A viewer-provided node built from the runtime's variablebase (:4, :7);
 * the runtime target registers it from the viewer's source (conformance.test.ts). The family's
 * rules are in variable-base.ts; this file is what color.ts supplies.
 *
 * `cast` is the identity (:20-22): "a colour needs no coercion". So a Color variable stores
 * WHATEVER arrives — a number, an object — and publishes it on a `color` port. (node.ts
 * `setInputValue` :431-432 would resolve a colour through `context.styles`, but only for a port
 * whose type is the STRING `'color'`; this port's type is the object `{ name: 'color' }` (:14-16,
 * variablebase.ts :142), so nothing resolves.)
 */

import { defineNode } from '../spec';
import { afterSets, CHANGED, onSet, onValue, SAVED_VALUE_DESCRIPTION, VARIABLE_OUTCOMES, variableInputs, variableState, type VariableArgs } from './variable-base';

/** :7-27 — startValue '#f1f2f4' (:10); `cast` identity (:20-22); empty options null / '' (:23-26) */
export const COLOR: VariableArgs & { type: 'color' } = {
  type: 'color',
  startValue: '#f1f2f4',
  cast: (value) => value,
  emptyOptions: [
    { value: 'null', label: 'Null (default)', coerce: null },
    { value: 'empty-string', label: 'Empty string ("")', coerce: '' }
  ]
};

export const ColorVariable = defineNode({
  type: 'Color',
  version: 1,
  source: 'packages/noodl-viewer-react/src/nodes/std-library/variables/color.ts',
  state: variableState(COLOR),
  inspect: (s) => String(s.current),
  outcomes: VARIABLE_OUTCOMES,
  inputs: variableInputs(COLOR),
  outputs: {
    savedValue: { type: 'color', from: (s) => s.current, displayName: 'Value', group: 'Values', description: SAVED_VALUE_DESCRIPTION },
    changed: CHANGED
  }
}).on(
  { value: (s, v, i) => onValue(COLOR, s, v, i), saveValue: onSet },
  { afterInputs: (s, i) => afterSets(COLOR, s, i) }
);
