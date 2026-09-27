/**
 * TVW-007 — which of the four eyebrow placements the canvas is drawing right now.
 *
 * 🔴 **This module is scaffolding with a death date.** R-Z settled the count's text and left its
 * row open; asked to choose between the four, Richard said he would need to see them. So the
 * canvas can draw any of them, a drive shoots the same graph four ways, and the shots are the
 * question. **When he rules, the winner becomes a constant, this file goes, and the losers go with
 * it** — a switch that outlives its verdict is a second copy of a decision, and the second copy
 * drifts ([[a-second-copy-of-a-palette-drifts-silently]]).
 *
 * The override is a window global because the only thing that sets it is a CDP drive, which has a
 * renderer and no import graph. It is deliberately NOT persisted, NOT in settings, and NOT in the
 * UI: it is not a preference, and a user who found it would be choosing between three shapes that
 * are each wrong in a way the fourth is not.
 *
 * @module noodl-editor/views/nodegrapheditor/canvas/eyebrowPlacement
 */

import { PLACEMENTS, type EyebrowPlacement } from './instanceEyebrow';

/**
 * What ships until Richard rules.
 *
 * `hover-only` is the default on purpose: it is the one placement that changes no card's size, no
 * card's wrapping and no port's position, so a session that ends before the verdict ships nothing
 * that moves a graph the user already has.
 */
const DEFAULT_PLACEMENT: EyebrowPlacement = 'hover-only';

const OVERRIDE_KEY = 'noodlInstanceEyebrowPlacement';

export function currentEyebrowPlacement(): EyebrowPlacement {
  if (typeof window === 'undefined') return DEFAULT_PLACEMENT;

  const override = (window as unknown as Record<string, unknown>)[OVERRIDE_KEY];
  if (typeof override !== 'string') return DEFAULT_PLACEMENT;

  return PLACEMENTS.includes(override as EyebrowPlacement) ? (override as EyebrowPlacement) : DEFAULT_PLACEMENT;
}
