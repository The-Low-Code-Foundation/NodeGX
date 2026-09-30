/**
 * Number Remapper — read from `packages/noodl-runtime/src/nodes/std-library/numberremapper.ts` on
 * 2026-09-30 (NSP-011).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * Every setter stores the RAW value and recomputes (:64-134); nothing converts. So the arithmetic
 * at :154-166 runs on whatever arrived — `'5'` subtracts like a number, `{}` makes `NaN`, and the
 * degenerate guard at :154 is `===` on the raw values (`'1'` and `1` are not equal, so the
 * division happens). The spec keeps the same operations on the same raw values, so the two agree
 * on every cross-type value the generator sends. NDA-012's default of 1 for Input Maximum (:25-46)
 * is what makes a fresh node pass its input through instead of flatlining.
 *
 * The census flagged this node for units (C10). Its ports are `number`, not `dimension`, and the
 * runtime's unit merge (node.ts setInputValue :410-420) only applies once a port has held a
 * `{ value, unit }` object — which a number wire never delivers. Units do not reach this node.
 */

import { defineNode } from '../spec';

export type RemapState = {
  input: unknown;
  minIn: unknown;
  maxIn: unknown;
  minOut: unknown;
  maxOut: unknown;
  clamp: boolean;
};

/** :149-168 `_calculateNewOutputValue`, on the raw values. */
export function remap(s: Readonly<RemapState>): number {
  let n: number;
  if (s.maxIn === s.minIn) n = 0;
  else n = ((s.input as number) - (s.minIn as number)) / ((s.maxIn as number) - (s.minIn as number));
  if (s.clamp) n = Math.max(0, Math.min(1, n));
  return (s.minOut as number) + n * ((s.maxOut as number) - (s.minOut as number));
}

export const NumberRemapper = defineNode({
  type: 'Number Remapper',
  version: 1,
  source: 'packages/noodl-runtime/src/nodes/std-library/numberremapper.ts',

  // initialize (:20-48): 0, 0, 1, 0, 1, true. `_remappedValue = 0` (:23) equals `remap` of these.
  state: { input: 0, minIn: 0, maxIn: 1, minOut: 0, maxOut: 1, clamp: true } as RemapState,
  // :49-53 — a value entry holding the remapped value
  inspect: (s) => String(remap(s)),

  inputs: {
    // :55-68 — raw
    inputValue: {
      type: 'number',
      default: 0,
      coerce: 'none',
      displayName: 'Input Value',
      group: 'Value to Remap',
      description: 'Number to remap, read against Input Minimum and Input Maximum'
    },
    // :69-81
    minInputValue: {
      type: 'number',
      default: 0,
      coerce: 'none',
      displayName: 'Input Minimum',
      group: 'Input Parameters',
      description: 'Value of Input Value that maps to Output Minimum'
    },
    // :82-95
    maxInputValue: {
      type: 'number',
      default: 1,
      coerce: 'none',
      displayName: 'Input Maximum',
      group: 'Input Parameters',
      description:
        'Value of Input Value that maps to Output Maximum; set equal to Input Minimum and the result is pinned at Output Minimum for every input'
    },
    // :96-108
    minOutputValue: {
      type: 'number',
      default: 0,
      coerce: 'none',
      displayName: 'Output Minimum',
      group: 'Output Parameters',
      description: 'Result when Input Value is at Input Minimum'
    },
    // :109-121
    maxOutputValue: {
      type: 'number',
      default: 1,
      coerce: 'none',
      displayName: 'Output Maximum',
      group: 'Output Parameters',
      description: 'Result when Input Value is at Input Maximum'
    },
    // :122-135 — `value ? true : false` (:132)
    clamp: {
      type: 'boolean',
      default: true,
      coerce: 'js-boolean',
      displayName: 'Clamp Output',
      group: 'Output Parameters',
      description: 'Holds the result inside the output range when Input Value falls outside the input range, instead of extrapolating'
    }
  },

  outputs: {
    // :137-147
    remappedValue: {
      type: 'number',
      from: (s) => remap(s),
      displayName: 'Remapped Value',
      group: 'Outputs',
      description: 'Input Value rescaled from the input range onto the output range'
    }
  }
}).on({
  inputValue: (_s, v) => ({ set: { input: v } }),
  minInputValue: (_s, v) => ({ set: { minIn: v } }),
  maxInputValue: (_s, v) => ({ set: { maxIn: v } }),
  minOutputValue: (_s, v) => ({ set: { minOut: v } }),
  maxOutputValue: (_s, v) => ({ set: { maxOut: v } }),
  clamp: (_s, v) => ({ set: { clamp: v } })
});
