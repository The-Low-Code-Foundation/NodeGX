/**
 * CHR-009 §12.4 (Richard, s21: "show it greyed") — what an unset per-side border field inherits.
 *
 * A per-side port (`borderLeftColor`, `borderTopLeftRadius`, a slider's `thumbBorderLeftWidth`) with no value of its
 * own renders the all-sides value: the runtime reads `b[side] || b.all` (`node-shared-port-definitions.ts`). The
 * field used to draw EMPTY, so a side read "nothing" while it was in fact `none` / 2 / #000 from All. The field now
 * shows that value as a muted placeholder; nothing is written.
 *
 * Pure, so `tests-unit` can grade it without the panel.
 */

const EDGE = /^(.*[bB]order)(Top|Right|Bottom|Left)(Style|Width|Color)$/;
const CORNER = /^(.*[bB]order)(TopLeft|TopRight|BottomRight|BottomLeft)Radius$/;

/** The all-sides port a per-side port falls back to, or null for any other port. */
export function allSidesPortOf(portName: string): string | null {
  const edge = EDGE.exec(portName);
  if (edge) return `${edge[1]}${edge[3]}`;
  const corner = CORNER.exec(portName);
  if (corner) return `${corner[1]}Radius`;
  return null;
}

/**
 * The value an unset per-side field inherits, or `undefined` when there is nothing to hint: not a per-side port, the
 * side holds its own value, or the all-sides port reads nothing either.
 *
 * `readParameter` is the panel model's `getParameter`, which already falls back to the port default and honours the
 * visual state and variant being edited.
 */
export function inheritedSideValue(
  portName: string,
  ownValue: unknown,
  readParameter: (name: string) => unknown
): unknown {
  if (ownValue !== undefined && ownValue !== '') return undefined;
  const allName = allSidesPortOf(portName);
  if (!allName) return undefined;
  const inherited = readParameter(allName);
  return inherited === undefined || inherited === null || inherited === '' ? undefined : inherited;
}

/** A number-with-units value (`{ value, unit }`, a bare number, or a token string) as the field's text. */
export function inheritedNumberText(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'object' && 'value' in (value as Record<string, unknown>)) {
    const v = (value as { value: unknown }).value;
    return v === undefined || v === null ? undefined : String(v);
  }
  return String(value);
}
