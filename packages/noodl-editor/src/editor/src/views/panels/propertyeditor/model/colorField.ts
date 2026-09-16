/**
 * CHR-009 slice 8 — the colour field.
 *
 * Was two boxes: a 26px text field reading `#000000`, then a separate 33px swatch (30 drawn) beside it,
 * and the alpha of a `#RRGGBBAA` value was stripped from the text and shown nowhere — a 40% shadow read
 * `#000000`, the same as an opaque one. Now it is ONE field (§2): the swatch inside it at the left, the hex
 * in mono, the alpha as the field's suffix, the way a unit is a suffix in the number field (slice 1).
 *
 * Pure, so `tests-unit` can grade it.
 */

export interface ColorFieldParts {
  /** The text the field edits: `#RRGGBB` upper-cased for a literal hex, else the value as stored. */
  text: string;
  /** The suffix: `40%` / `100%` for a literal hex, null for a style name, a var() or nothing. */
  alpha: string | null;
  /** A literal hex — drawn in mono; a style name reads as a name. */
  isHex: boolean;
}

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

/** The alpha channel of a literal hex, 0–255, or null when the value is not one. */
function alphaByteOf(value: string): number | null {
  const m = HEX.exec(value);
  if (!m) return null;
  const digits = m[1];
  if (digits.length === 4) return parseInt(digits[3] + digits[3], 16);
  if (digits.length === 8) return parseInt(digits.slice(6), 16);
  return 255;
}

/** The colour part of a literal hex without its alpha (`#RGB` / `#RRGGBB`), upper-cased. */
function colourPartOf(value: string): string {
  const digits = HEX.exec(value)![1];
  const colourLength = digits.length === 4 ? 3 : digits.length === 8 ? 6 : digits.length;
  return ('#' + digits.slice(0, colourLength)).toUpperCase();
}

export function colorFieldPartsOf(value: unknown): ColorFieldParts {
  if (typeof value !== 'string' || value === '') return { text: '', alpha: null, isHex: false };

  const byte = alphaByteOf(value);
  if (byte === null) return { text: value, alpha: null, isHex: false };

  // `Math.floor` as the picker's own opacity field does (`colorpicker.ts`), so the two never disagree.
  return { text: colourPartOf(value), alpha: Math.floor((byte / 255) * 100) + '%', isHex: true };
}

/**
 * What a typed text commits, given the value it replaces.
 *
 * 🔴 The field shows `#000000` with `40%` beside it, so typing `#FF0000` over it means "this colour,
 * still 40%". Before this slice the typed hex replaced the whole value and the alpha was silently
 * dropped — invisible then, because nothing showed it. A typed hex that carries its own alpha, a style
 * name, and an empty field (reset) are committed as typed.
 */
export function colorCommitOf(typed: string, previous: unknown): string | undefined {
  let value = typed.trim();
  if (value === '') return undefined;

  // As `ColorType` did: six hex digits without the `#` gain one. Its test was unanchored at the start
  // (`/[0-9A-F]{6}$/`), so a style name ending in six hex digits gained a `#` too; this one is anchored.
  if (value[0] !== '#' && /^[0-9a-f]{6}$/i.test(value)) value = '#' + value;

  if (/^#[0-9a-f]{6}$/i.test(value) && typeof previous === 'string') {
    const byte = alphaByteOf(previous);
    if (byte !== null && byte !== 255) value = value + byte.toString(16).padStart(2, '0').toUpperCase();
  }

  return value;
}
