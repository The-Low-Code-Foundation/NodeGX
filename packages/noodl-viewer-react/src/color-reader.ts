/**
 * The one colour reader the runtime's tweens and blends share.
 *
 * P79 E2 wrote it for `Color Blend`, whose parser read `var(--primary)` two characters at a time as
 * hex. GAM-006 (P88) found the same blind parse in the `States` node and in visual-state
 * transitions (`node-transitions.ts`), so it moved here instead of being copied a second and third
 * time. `Color Blend` reads the first three channels; the tweens read all four.
 *
 * ⚠️ `nodegx-export`'s parity suites load `states.ts` and `colorblend.ts` from source with their
 * own `require` shims (`animation-pair.test.ts`, `small-utilities.test.ts`). A new import here
 * owes both shims.
 */

/** `[r, g, b, a]`, each 0–255. */
export type RGBA = [number, number, number, number];

const HEX_3 = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i;
// Deliberately unanchored at the end, as Color Blend always read it: the first six digits are the
// colour, and two more are its alpha.
const HEX_6 = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})?/i;
const RGB_FN = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+)(%?))?/i;
const VAR_FN = /^var\(\s*(--[^,)\s]+)\s*(?:,([\s\S]*))?\)$/;

function clamp(min: number, max: number, value: number) {
  return Math.max(min, Math.min(max, value));
}

/**
 * A custom property's value, as the document actually resolves it.
 *
 * The one honest source: a token can be redefined per theme, per component, per media query, and
 * only the browser knows which definition won. Returns `''` anywhere there is no DOM (these nodes
 * are also compiled into the SSR and deploy bundles), so the caller falls back rather than throwing.
 */
export function cssVariableValue(name: string): string {
  if (typeof document === 'undefined' || !document.documentElement) return '';
  if (typeof getComputedStyle !== 'function') return '';
  try {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  } catch (e) {
    return '';
  }
}

/**
 * The colour as four channels, or `null` when this notation cannot be read.
 *
 * Reads `var(--token)` (through the document, then the author's own fallback), `#RGB`,
 * `#RRGGBB`, `#RRGGBBAA`, `rgb()` and `rgba()`. Everything else is `null`, including
 * `transparent` and named colours such as `red`: a caller decides what those mean.
 */
export function readColor(value: unknown, depth = 0): RGBA | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if (!text) return null;

  const asVar = VAR_FN.exec(text);
  if (asVar) {
    // A token may resolve to another token. Bounded so a definition that refers to itself
    // cannot hang the render.
    if (depth >= 8) return null;
    const resolved = cssVariableValue(asVar[1]);
    if (resolved) return readColor(resolved, depth + 1);
    // `var(--x, #fff)`: the author's own fallback, which is what CSS would use here.
    if (asVar[2] !== undefined) return readColor(asVar[2], depth + 1);
    return null;
  }

  const short = HEX_3.exec(text);
  if (short) {
    return [
      parseInt(short[1] + short[1], 16),
      parseInt(short[2] + short[2], 16),
      parseInt(short[3] + short[3], 16),
      255
    ];
  }

  const long = HEX_6.exec(text);
  if (long) {
    return [
      parseInt(long[1], 16),
      parseInt(long[2], 16),
      parseInt(long[3], 16),
      long[4] === undefined ? 255 : parseInt(long[4], 16)
    ];
  }

  const fn = RGB_FN.exec(text);
  if (fn) {
    let alpha = 255;
    if (fn[4] !== undefined) {
      const raw = Number(fn[4]);
      alpha = clamp(0, 255, Math.round((fn[5] === '%' ? raw / 100 : raw) * 255));
    }
    return [
      clamp(0, 255, Math.round(Number(fn[1]))),
      clamp(0, 255, Math.round(Number(fn[2]))),
      clamp(0, 255, Math.round(Number(fn[3]))),
      alpha
    ];
  }

  return null;
}

/**
 * Whether the browser itself would refuse `value` as a colour: `true` or `false` where the page can
 * be asked (`CSS.supports`), `undefined` where it cannot (server render, a headless spec).
 *
 * P88 R7: a colour the reader cannot interpolate but the browser accepts (`red`, a token the
 * document does not define) jumps silently. Only a value the browser would also reject is worth a
 * warning, and with no page to ask, nothing is warned on a guess.
 */
export function cssRejectsColor(value: string): boolean | undefined {
  if (typeof CSS === 'undefined' || typeof CSS.supports !== 'function') return undefined;
  try {
    return !CSS.supports('color', value);
  } catch (e) {
    return undefined;
  }
}
