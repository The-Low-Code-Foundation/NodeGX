/**
 * Color Blend — read from `packages/noodl-viewer-react/src/nodes/std-library/colorblend.ts` on
 * 2026-09-30 (NSP-011), with `color-reader.ts` and `easecurves.ts` beside it. A viewer-provided
 * node: the runtime target registers it from the viewer's source (conformance.test.ts).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * `Result` is a function of the colour list and Blend Value (`updateColor`, :145-185): at a whole
 * position the colour is passed through VERBATIM (:159-162 — a token, a name, even a number a
 * wire delivered), between two positions both are read (`readColor`, color-reader.ts :51-100) and
 * blended per channel with `Math.floor` (:174-180); a colour the reader cannot read makes the
 * nearer endpoint show unblended (:167-172) and a runtime error is raised once per value
 * (:128-144) — the error channel, not the trace. The list is sparse (:88, `colors[index]`): a hole
 * or any falsy entry reads as `'#000000'` (:151-153), and `colors.length` is the highest index
 * written plus one.
 *
 * What the spec cannot see: `var(--token)` is resolved through the DOCUMENT (color-reader.ts
 * :32-46), which a headless runtime and this interpreter do not have — both read `''` and fall to
 * the author's own fallback (`var(--x, #fff)`) or to "unreadable". A browser target would resolve
 * a defined token and diverge; that is a world need NSP-007 has no arm for yet (NSP-011 §6).
 *
 * Before any colour is written the result is `'#000000'` (:78) and never recomputed (:147-149);
 * the function below returns the same, so nothing special is carried.
 */

import { defineNode, type ValueInputDecl } from '../spec';

const NUMBERED = /^color \d+$/;

// :82-93 `numberedInputs.color`: `type: 'color'`, `displayPrefix: 'Color'`; the setter (:86-91)
// stores the value raw. (node.ts :431 would resolve a `'color'` port through `context.styles`;
// the headless runtime has none.)
const port = (i: number): ValueInputDecl => ({ type: 'color', coerce: 'none', displayName: 'Color ' + i });

type RGB = [number, number, number];
type RGBA = [number, number, number, number];

// color-reader.ts :17-20, verbatim
const HEX_3 = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i;
const HEX_6 = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})?/i;
const RGB_FN = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+)(%?))?/i;
const VAR_FN = /^var\(\s*(--[^,)\s]+)\s*(?:,([\s\S]*))?\)$/;

function clamp(min: number, max: number, value: number) {
  return Math.max(min, Math.min(max, value));
}

/** color-reader.ts :51-100, with `cssVariableValue` reading `''` (no document, :32-33). */
export function readColor(value: unknown, depth = 0): RGBA | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if (!text) return null;
  const asVar = VAR_FN.exec(text);
  if (asVar) {
    if (depth >= 8) return null;
    if (asVar[2] !== undefined) return readColor(asVar[2], depth + 1);
    return null;
  }
  const short = HEX_3.exec(text);
  if (short) return [parseInt(short[1] + short[1], 16), parseInt(short[2] + short[2], 16), parseInt(short[3] + short[3], 16), 255];
  const long = HEX_6.exec(text);
  if (long) return [parseInt(long[1], 16), parseInt(long[2], 16), parseInt(long[3], 16), long[4] === undefined ? 255 : parseInt(long[4], 16)];
  const fn = RGB_FN.exec(text);
  if (fn) {
    let alpha = 255;
    if (fn[4] !== undefined) {
      const raw = Number(fn[4]);
      alpha = clamp(0, 255, Math.round((fn[5] === '%' ? raw / 100 : raw) * 255));
    }
    return [clamp(0, 255, Math.round(Number(fn[1]))), clamp(0, 255, Math.round(Number(fn[2]))), clamp(0, 255, Math.round(Number(fn[3]))), alpha];
  }
  return null;
}

/** :42-45 — the first three channels */
function parseColor(value: unknown): RGB | null {
  const rgba = readColor(value);
  return rgba ? [rgba[0], rgba[1], rgba[2]] : null;
}

/** :47-54 */
function componentToHex(c: number) {
  const hex = c.toString(16);
  return hex.length == 1 ? '0' + hex : hex;
}
function rgbToHex(rgb: RGB) {
  return '#' + componentToHex(rgb[0]) + componentToHex(rgb[1]) + componentToHex(rgb[2]);
}

/** easecurves.ts :80-82 */
const linear = (start: number, end: number, t: number) => start + (end - start) * t;

/** :145-185 `updateColor`, on the sparse list (indices written → values) and the raw blend value. */
export function blend(colors: Readonly<Record<string, unknown>>, blendValue: unknown): unknown {
  const indices = Object.keys(colors).map(Number);
  const length = indices.length ? Math.max(...indices) + 1 : 0;
  if (length === 0) return '#000000'; // :147-149, :78
  const getColor = (index: number): unknown => (colors[index] ? colors[index] : '#000000'); // :151-153
  const clamped = clamp(0, length - 1, blendValue as number); // :155
  const index = Math.floor(clamped);
  const t = clamped - index;
  if (t === 0) return getColor(index); // :159-162 — verbatim
  const from = parseColor(getColor(index));
  const to = parseColor(getColor(index + 1));
  if (!from || !to) return getColor(t < 0.5 ? index : index + 1); // :167-172
  return rgbToHex([
    Math.floor(linear(from[0], to[0], t)),
    Math.floor(linear(from[1], to[1], t)),
    Math.floor(linear(from[2], to[2], t))
  ]); // :174-180
}

export const ColorBlend = defineNode({
  type: 'Color Blend',
  version: 1,
  source: 'packages/noodl-viewer-react/src/nodes/std-library/colorblend.ts',

  // initialize (:75-81): resultColor '#000000', blendValue 0, colors []
  state: { colors: {} as Readonly<Record<string, unknown>>, blendValue: 0 as unknown },
  // :72-74 — a colour entry holding the result
  inspect: (s) => String(blend(s.colors, s.blendValue)),

  inputs: {
    // :95-105 — raw
    blendValue: {
      type: 'number',
      default: 0,
      coerce: 'none',
      displayName: 'Blend Value',
      group: 'Values',
      description: 'Position along the colour list, where 1 is exactly Color 1 and 1.5 is halfway to Color 2; values outside the list are clamped'
    }
  },

  outputs: {
    // :108-118
    result: {
      type: 'color',
      from: (s) => blend(s.colors, s.blendValue),
      displayName: 'Result',
      group: 'Values',
      description:
        'The blended colour. Inputs may be #RGB, #RRGGBB, rgb()/rgba() or var(--token); a colour ' +
        'it cannot read is reported and the nearest input is shown unblended'
    }
  }
}).on(
  { blendValue: (_s, v) => ({ set: { blendValue: v } }) },
  {
    derived: {
      // nodedefinition.ts `collectPorts`: highest index mentioned plus one spare, or `color 0` alone
      inputs: (params) => {
        const indices = Object.keys(params)
          .filter((k) => NUMBERED.test(k))
          .map((k) => Number(k.slice('color '.length)));
        const count = indices.length ? Math.max(...indices) + 2 : 1;
        const ports: Record<string, ValueInputDecl> = {};
        for (let i = 0; i < count; i++) ports['color ' + i] = port(i);
        return ports;
      },
      // :86-91 — store under the index, recompute
      on: (s, portName, value) => ({ set: { colors: { ...s.colors, [portName.slice('color '.length)]: value } } }),
      discover: (portName) => (NUMBERED.test(portName) ? port(Number(portName.slice('color '.length))) : undefined),
      candidates: ['color 0', 'color 1', 'color 2']
    }
  }
);
