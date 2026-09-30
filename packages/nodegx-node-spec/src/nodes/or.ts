/**
 * Or — read from `packages/noodl-runtime/src/nodes/std-library/or.ts` on 2026-09-30 (NSP-011).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * And's sibling (and.ts), with two differences a wire can see: `result` is NOT cached (:41
 * flags on every changed input; :52-54 reads `some(isTrue)` live), so the first settle publishes
 * `false` from the getter — an Or with nothing connected says `false`, where an And says nothing
 * (NSP-004 §6 D1). And a hole in the sparse array (:8-11) is skipped by `some`, so it counts as
 * FALSE here where And's `some((v) => !v)` skips it as true.
 */

import { defineNode, type ValueInputDecl } from '../spec';

const NUMBERED = /^input \d+$/;

// :30-33 `numberedInputs.input`: `type: 'boolean'`, `displayPrefix: 'Input'`; the setter (:34-43)
// stores the value raw (:40) and `isTrue` (:65-67, `value ? true : false`) reads it — js-boolean
// at the wire's level of detail.
const port = (i: number): ValueInputDecl => ({ type: 'boolean', coerce: 'js-boolean', displayName: 'Input ' + i });

/** :52-54 — `inputs.some(isTrue)` over the indices written; nothing written → false. */
export function or(inputs: Readonly<Record<string, boolean>>): boolean {
  return Object.values(inputs).some((v) => v);
}

export const Or = defineNode({
  type: 'Or',
  version: 1,
  source: 'packages/noodl-runtime/src/nodes/std-library/or.ts',

  // initialize (:23-25): `inputs = []`
  state: { inputs: {} as Readonly<Record<string, boolean>> },
  // :26-29 — a value entry holding `some(isTrue)`
  inspect: (s) => String(or(s.inputs)),

  inputs: {},

  outputs: {
    // :46-55 getter → `inputs.some(isTrue)` — live, not cached
    result: {
      type: 'boolean',
      from: (s) => or(s.inputs),
      displayName: 'Result',
      group: 'Values',
      description: 'True while at least one connected input is true; false when no input is connected at all'
    }
  }
}).on(
  {},
  {
    derived: {
      // nodedefinition.ts `collectPorts`: the highest `input <n>` mentioned plus one spare, or a
      // single `input 0` when nothing is mentioned (same rule as And).
      inputs: (params) => {
        const indices = Object.keys(params)
          .filter((k) => NUMBERED.test(k))
          .map((k) => Number(k.slice('input '.length)));
        const count = indices.length ? Math.max(...indices) + 2 : 1;
        const ports: Record<string, ValueInputDecl> = {};
        for (let i = 0; i < count; i++) ports['input ' + i] = port(i);
        return ports;
      },
      // :35-42 — store under the index; the :36-38 same-value guard skips a flag and nothing else
      // a wire can see (the wire dedups), so it is not carried.
      on: (s, portName, value) => ({ set: { inputs: { ...s.inputs, [portName]: value as boolean } } }),
      // `registerNumberedInput` (nodedefinition.ts) takes any name starting with `input`; the spec
      // takes what the editor mints — see NSP-004 §6 D4 for the aliases.
      discover: (portName) => (NUMBERED.test(portName) ? port(Number(portName.slice('input '.length))) : undefined),
      candidates: ['input 0', 'input 1', 'input 2', 'input 3']
    }
  }
);
