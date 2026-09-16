/**
 * CHR-009 §2 "dimensions": the `sizeMode` port read as two axes.
 *
 * The port is one enum of four values, drawn until now as four 30px icon boxes on a 50px strip of
 * their own. It is really two independent choices — is the width given, or taken from the content;
 * the same for the height — and the panel now draws it as that: `W` fixed|fit, `H` fixed|fit.
 *
 * 🔴 The enum's names are the RESULT axis, not the fixed one: `contentHeight` is "the height comes
 * from the content, the width is given". `addDimensions` shows the Width row for `explicit OR
 * contentHeight` and `Layout.size` assigns `style.width` for the same two — read both before
 * changing this table.
 *
 * The port stays one port with the same four values; nothing here migrates a project.
 */

export type SizeMode = 'explicit' | 'contentWidth' | 'contentHeight' | 'contentSize';
export type SizeAxis = 'width' | 'height';

export interface SizeAxes {
  /** The width comes from the content. */
  widthFits: boolean;
  /** The height comes from the content. */
  heightFits: boolean;
}

const MODES: Record<SizeMode, SizeAxes> = {
  explicit: { widthFits: false, heightFits: false },
  contentWidth: { widthFits: true, heightFits: false },
  contentHeight: { widthFits: false, heightFits: true },
  contentSize: { widthFits: true, heightFits: true }
};

/**
 * The two axes a stored value means. A value that is not one of the four (a project written by
 * hand, a connection) reads as `null` rather than a guess, so neither segment claims to be pressed.
 */
export function axesOf(value: unknown): SizeAxes | null {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(MODES, value)
    ? MODES[value as SizeMode]
    : null;
}

export function modeOf({ widthFits, heightFits }: SizeAxes): SizeMode {
  if (widthFits) return heightFits ? 'contentSize' : 'contentWidth';
  return heightFits ? 'contentHeight' : 'explicit';
}

/**
 * The mode one press produces: `axis` set to `fits`, the other axis kept. From an unreadable value
 * the other axis is taken as given (`explicit`'s reading), which is the port's declared default for
 * most visual nodes.
 */
export function withAxis(value: unknown, axis: SizeAxis, fits: boolean): SizeMode {
  const current = axesOf(value) ?? MODES.explicit;
  return modeOf(axis === 'width' ? { ...current, widthFits: fits } : { ...current, heightFits: fits });
}
