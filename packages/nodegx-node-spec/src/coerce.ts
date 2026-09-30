/**
 * Coercion is declared, not implied (NSP-001 §2.1).
 *
 * The runtime coerces an incoming value in two different ways, and a spec has to say which one
 * a port uses, because they disagree on the values that matter:
 *
 *   - **`js-*`** — the bare JavaScript conversion a node's setter applies itself.
 *     `Counter.startValue` does `Number(value)` (counter.ts:126), so `"abc"` becomes `NaN` and
 *     `null` becomes `0`. `Counter.limitsEnabled` does `value ? true : false` (counter.ts:166).
 *   - **`typed-*`** — `coerceToType` in `packages/noodl-runtime/src/expression-type-coercion.ts`,
 *     which the expression machinery uses: `undefined`/`null` → the fallback (:36-38), a number
 *     that is `NaN` → the fallback (:44-47), a colour that is not `#RGB` / `#RRGGBB` / `rgb(`
 *     / `rgba(` → the fallback (:65-80).
 *
 * Every entry cites the line it was read from. This table is the SPEC of coercion; the runtime
 * is graded against it by the adapters (NSP-002), never the other way round — that is R3 (a):
 * a disagreement is a §6 row and a ruling, not an edit here.
 *
 * `fallback` is the port's declared `default`. Only the `typed-*` rules read it: a `js-*` rule
 * converts `undefined` exactly as JavaScript does — `String(undefined)` is the text `'undefined'`,
 * `Number(undefined)` is `NaN` — so a port with no `default` and a `js-string` coercion holds
 * `'undefined'` after a set with no value (asked by the stranger, NSP-006 §5).
 */

export type Coercion =
  | 'none'
  | 'js-number'
  | 'js-string'
  | 'js-boolean'
  | 'typed-number'
  | 'typed-string'
  | 'typed-boolean'
  | 'typed-color'
  | 'not-false';

export interface CoercionRule {
  /** The runtime line(s) the rule was read from. */
  source: string;
  apply(value: unknown, fallback: unknown): unknown;
}

const HEX3 = /^#[0-9A-Fa-f]{3}$/;
const HEX6 = /^#[0-9A-Fa-f]{6}$/;
const RGB = /^rgba?\(/;

export const COERCIONS: Readonly<Record<Coercion, CoercionRule>> = Object.freeze({
  none: {
    source: 'no conversion — the value arrives as sent',
    apply: (v) => v
  },
  'js-number': {
    source: 'noodl-runtime/src/nodes/std-library/counter.ts:126 `Number(value)`',
    apply: (v) => Number(v)
  },
  'js-string': {
    source: 'JavaScript `String(value)` — the setter form used by string ports that stringify',
    apply: (v) => String(v)
  },
  'js-boolean': {
    source: 'noodl-runtime/src/nodes/std-library/counter.ts:166 `value ? true : false`',
    apply: (v) => (v ? true : false)
  },
  'typed-number': {
    source: 'noodl-runtime/src/expression-type-coercion.ts:36-38 (null/undefined → fallback), :44-47 (NaN → fallback)',
    apply: (v, fallback) => {
      if (v === undefined || v === null) return fallback;
      const n = Number(v);
      return isNaN(n) ? fallback : n;
    }
  },
  'typed-string': {
    source: 'noodl-runtime/src/expression-type-coercion.ts:36-38, :41-42 `String(value)`',
    apply: (v, fallback) => (v === undefined || v === null ? fallback : String(v))
  },
  'typed-boolean': {
    source: 'noodl-runtime/src/expression-type-coercion.ts:36-38, :49-50 `!!value`',
    apply: (v, fallback) => (v === undefined || v === null ? fallback : !!v)
  },
  'typed-color': {
    source: 'noodl-runtime/src/expression-type-coercion.ts:36-38, :65-80 (#RGB, #RRGGBB, rgb(, rgba( else fallback)',
    apply: (v, fallback) => {
      if (v === undefined || v === null) return fallback;
      const s = String(v);
      if (HEX3.test(s) || HEX6.test(s) || RGB.test(s)) return s;
      return fallback;
    }
  },
  'not-false': {
    // The `runOnChange-<input>` checkboxes (NDA-017 §2): only an explicit `false` unticks; `null`,
    // `undefined`, `0` and `""` all leave the box ticked, unlike `js-boolean`.
    source: 'noodl-runtime/src/run-on-value-change.ts `setRunOnValueChange(this, inputName, value !== false)` in runOnChangeInput',
    apply: (v) => v !== false
  }
});

export function coerce(kind: Coercion | undefined, value: unknown, fallback: unknown): unknown {
  return COERCIONS[kind ?? 'none'].apply(value, fallback);
}
