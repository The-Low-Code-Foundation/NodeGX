/**
 * And — read from `packages/noodl-runtime/src/nodes/std-library/and.ts` on 2026-09-30.
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * Why this node is in the pilot: trivial on purpose — the FLOOR cost of speccing a node — and the
 * first `numbered-inputs` node (the catalog's `dynamicPorts.mechanisms`): it declares NO input;
 * every `input <n>` is registered the first time something writes to it (nodedefinition.ts
 * `registerNumberedInput`, wrapping `registerInputIfNeeded`). So this spec has no `inputs` and
 * lives in `derived`.
 *
 * What the model has to carry that the source's `boolean[]` hides: the array is SPARSE. `input 2`
 * written before `input 0` gives `[ , , true]`, and `Array.prototype.some` skips holes (:74), so
 * holes count as true and a lone `input 2 = true` answers `true`. A record of the indices written
 * says the same thing without the holes: at least one written, none false.
 */

import { defineNode, type ValueInputDecl } from '../spec';

const NUMBERED = /^input \d+$/;

// :29-32 `numberedInputs.input`: `displayPrefix: 'Input'`, `type: 'boolean'`; the setter at
// :33-49 does `value ? true : false` (:35) — js-boolean.
const port = (i: number): ValueInputDecl => ({ type: 'boolean', coerce: 'js-boolean', displayName: 'Input ' + i });

/** :72-75 — `values.length > 0 && values.some((v) => !v) === false`, over the indices written. */
export function and(inputs: Readonly<Record<string, boolean>>): boolean {
  const values = Object.values(inputs);
  return values.length > 0 && !values.some((v) => !v);
}

export const And = defineNode({
  type: 'And',
  version: 1,
  source: 'packages/noodl-runtime/src/nodes/std-library/and.ts',

  // initialize (:22-24): `inputs = []`; `result` is left undefined (:14) and only exists once an
  // input has arrived (:44-45) — so NOTHING is published before the first input (C3), whatever
  // the port description says ("false when no input is connected at all", :57 — a §6 row).
  state: { inputs: {} as Readonly<Record<string, boolean>>, result: undefined as boolean | undefined },
  // :25-28 — a value entry holding `and(inputs)` (NOT the cached `result`: `and([])` is false
  // while `result` is still undefined, so the inspector shows "false" for a node that has sent nothing)
  inspect: (s) => String(and(s.inputs)),

  inputs: {},

  outputs: {
    // :53-61 `get` → `_internal.result`
    result: {
      type: 'boolean',
      from: (s) => s.result,
      displayName: 'Result',
      group: 'Values',
      description: 'True only while every connected input is true; false when no input is connected at all'
    }
  }
}).on(
  {},
  {
    derived: {
      // What an editor draws (nodedefinition.ts `collectPorts`): one port per index up to the
      // highest `input <n>` mentioned PLUS ONE SPARE — `numPorts = maxIndex + 1` where `maxIndex`
      // is already `1 + highest` — and a single `input 0` when nothing is mentioned.
      inputs: (params) => {
        const indices = Object.keys(params)
          .filter((k) => NUMBERED.test(k))
          .map((k) => Number(k.slice('input '.length)));
        const count = indices.length ? Math.max(...indices) + 2 : 1;
        const ports: Record<string, ValueInputDecl> = {};
        for (let i = 0; i < count; i++) ports['input ' + i] = port(i);
        return ports;
      },
      // :33-49. Store the coerced boolean under its index; recompute; publish `result` only when
      // the ANSWER changed (:44-47 — "unlike Or this one caches `result`"). The :37-39 guard (same
      // value again → return) is not carried: it changes nothing a wire can see.
      on: (s, portName, value) => {
        const inputs = { ...s.inputs, [portName]: value as boolean };
        const result = and(inputs);
        return result !== s.result ? { set: { inputs, result } } : { set: { inputs } };
      },
      // `registerNumberedInput` accepts any name starting with `input` and parses what follows
      // the space with `Number()` — so `input` alone, `input 01` and `input  2` alias `input 0`,
      // `input 1`, `input 2`, and `input 1.5` lands outside the array's length. The spec accepts
      // only what the editor mints (`input <digits>`); the aliases are noted in NSP-004 §6.
      discover: (portName) => (NUMBERED.test(portName) ? port(Number(portName.slice('input '.length))) : undefined),
      candidates: ['input 0', 'input 1', 'input 2', 'input 3']
    }
  }
);
