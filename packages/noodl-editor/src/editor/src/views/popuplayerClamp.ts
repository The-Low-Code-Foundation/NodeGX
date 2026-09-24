/**
 * P103 CMG-001 §3.2 — keep a growing popout on screen without re-centring it.
 *
 * A popout opened with `disableDynamicPositioning` is placed once, at open, and then left alone
 * on every resize — on purpose: re-centring on the anchor on every change would make the token
 * composer jump under a person's pointer while they slide. But *left alone* also meant that
 * pressing *Show CSS* at the bottom of the window grew the popout past the window's bottom edge
 * and put Apply under it (Richard's finding 2: *"it overflows the bottom Y and half cuts off the
 * buttons and you can't scroll down"*).
 *
 * This is the one move such a popout is allowed: **up, by the overflow, and nothing else.** No
 * flip, no re-centre, no x. Pure, so the arithmetic is graded without a DOM.
 */

export interface ClampInput {
  /** Where the popout's top edge is now. */
  top: number;
  /** How tall it is now, after the resize. */
  height: number;
  /** The highest a top edge may be (below the window's title bar). */
  minY: number;
  /** The lowest a bottom edge may be. */
  maxY: number;
}

/**
 * The top edge the popout should have. Equal to `top` whenever it already fits — a popout that
 * fits is not moved, which is the whole reason this is not `_positionPopout`.
 *
 * A popout taller than the window cannot fit; it is pinned to `minY` so its top (the header, the
 * controls) is on screen and its own scroll area does the rest.
 */
export function clampPopoutTop({ top, height, minY, maxY }: ClampInput): number {
  const bottom = top + height;
  if (bottom <= maxY && top >= minY) return top;
  if (height > maxY - minY) return minY;
  if (bottom > maxY) return maxY - height;
  return minY;
}
