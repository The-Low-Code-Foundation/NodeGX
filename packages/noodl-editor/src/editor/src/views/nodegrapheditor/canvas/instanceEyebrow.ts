/**
 * TVW-007 — the count an instance node carries, and where it is allowed to sit.
 *
 * R-Z (Richard, 2026-09-19) ruled the eyebrow down to **the count alone** — `· 3×` — with the
 * component's path on hover. The ruling settled the *text*. It did not settle the *row*, and the
 * row is where the cost is:
 *
 * 🔴 `NodeGraphEditorNode.titlebarHeight()` fixes every connection-anchor position on the card
 * (UIX-005 says so in as many words). A count that takes a row of its own therefore moves the
 * ports on **9,634 instance nodes across 128 projects** — the very cost option 2 was rejected for
 * in §6, only one row's worth instead of two. A count that shares the title's line instead takes
 * width from a name allowance that is already only 93px (81px with an icon) — and §6's census
 * assumed 114px, so the ruling was made against a number that was 21px too generous.
 *
 * ⚠️ Measured before any of this was written, replaying `textWordWrap`'s own algorithm over the
 * corpus (`scratchpad/eyebrow-inline-census.js`, widths estimated at 6.6px/char title,
 * 6.0px/char mono):
 *
 * | | |
 * |---|---|
 * | instance nodes | 9,634 |
 * | renamed — already pay for a sub-label row the count can ride | 1,702 (17.7%) |
 * | unrenamed — the title *is* the component name, no second row | 7,932 (82.3%) |
 * | of those, the count fits after the title's last line | 3,547 (44.7%) |
 *
 * So no placement is free and none is obviously right, which is why all four are built here rather
 * than one: `PLACEMENTS` exists so the drive can shoot the same canvas four ways and Richard can
 * rule on what he sees. **When he rules, delete the others** — a switch left standing is a second
 * copy of a decision, and the second copy drifts.
 *
 * Pure by construction: no editor imports, no canvas, no measurement of its own. Widths arrive
 * already measured by the caller, because the only honest width is the one `ctx.measureText`
 * returns for the font actually in use ([[a-budget-measured-on-a-fixture-is-a-budget-on-the-fixture]]).
 * Graded in `tests-unit/tvw-007`.
 *
 * @module noodl-editor/views/nodegrapheditor/canvas/instanceEyebrow
 */

/** The four shapes the count can take. One of these survives Richard's verdict; the rest go. */
export type EyebrowPlacement =
  /** Its own row beneath the name. The card grows and every port anchor on it moves down. */
  | 'own-row'
  /** Right of the name on its first line, with the name's allowance reduced to make room. */
  | 'reserve-width'
  /** After the name's last line where it fits, and absent where it does not. */
  | 'inline-if-fits'
  /** Nothing on the card at all; the hover carries the count as well as the path. */
  | 'hover-only';

export const PLACEMENTS: readonly EyebrowPlacement[] = [
  'own-row',
  'reserve-width',
  'inline-if-fits',
  'hover-only'
] as const;

export const InstanceEyebrow = {
  /**
   * §2: hidden below 75% zoom.
   *
   * 🔴 Read this against `getPanAndScale().scale`, never `ctx.getTransform().a`. The context is
   * scaled by `ratio * scale`, so on a 2× display `.a` is 1.5 at 75% zoom and the gate would open
   * at a different zoom on a retina screen than on an external monitor — the same class of bug
   * `hairlineWidth` divides `scale` back out for, and the opposite mistake.
   */
  minScale: 0.75,
  /** The row `own-row` adds, matching the sub-label line height the card already uses. */
  rowHeight: 12,
  /** Space between the name's last glyph and the count, when the two share a line. */
  gap: 4,
  /**
   * What `reserve-width` reserves, measured instead of the count itself.
   *
   * 🔴 **Reserving the real count's width would make a card re-wrap because of an edit somewhere
   * else in the project.** `· 9×` and `· 10×` are different widths, so the name's allowance — and
   * with it the number of lines it wraps to, and the card's height, and every port on it — would
   * change the moment a tenth instance was placed in another component. Nothing on screen would
   * say why.
   *
   * Three digits because the corpus holds counts that need them: 198 placed components are in
   * 10–99 and **two are over 100** (max 140 — `Show Toast` in `Erleah-2`). A count of 1000+ would
   * overflow the reservation; none exists, and one would be a sign about the project, not the card.
   */
  reserveReference: '· 000×'
} as const;

/**
 * The count as it is painted: `· 3×`.
 *
 * `null` for a count below one. An instance node is itself an instance, so its component's count
 * is at least 1 whenever the index has been built — a 0 here means the index has not been built
 * yet, or names a component that no longer exists, and neither is something to write on a card.
 * ⚠️ `· 0×` would be a sentence about the editor's bookkeeping printed on the user's graph.
 */
export function eyebrowText(count: number): string | null {
  if (!Number.isFinite(count) || count < 1) return null;
  return `· ${Math.floor(count)}×`;
}

/** §2's zoom rule. Takes the user-facing scale — 0.75 is the 75% the zoom readout shows. */
export function eyebrowIsVisible(scale: number): boolean {
  return scale >= InstanceEyebrow.minScale;
}

/**
 * The width the name may use before it wraps.
 *
 * Only `reserve-width` changes it, and it changes it **whether or not there is a count to draw** —
 * otherwise a name would re-wrap, and the card change height, as instances are added and removed
 * elsewhere in the project. The allowance is a property of the card, not of today's count.
 */
export function titleAllowanceFor(placement: EyebrowPlacement, baseAllowance: number, reserveWidth: number): number {
  if (placement !== 'reserve-width') return baseAllowance;
  return Math.max(0, baseAllowance - reserveWidth - InstanceEyebrow.gap);
}

/**
 * The extra titlebar height the placement costs.
 *
 * ⚠️ Constant for `own-row` on every instance node — *not* conditional on there being a count to
 * draw, and not conditional on zoom. A height that depended on either would make the card resize
 * as the user zoomed out, or as a sibling instance was deleted two components away, and a port
 * that moves for a reason the user cannot see is worse than one that never moves.
 */
export function eyebrowExtraHeight(placement: EyebrowPlacement, isComponentInstance: boolean): number {
  if (!isComponentInstance) return 0;
  return placement === 'own-row' ? InstanceEyebrow.rowHeight : 0;
}

/** Where the painter should put the count this frame, if anywhere. */
export type EyebrowPlan =
  | { kind: 'none' }
  /** Draw `text` at `x` on the name's own baseline — its last line, or its first for `reserve-width`. */
  | { kind: 'inline'; text: string; x: number }
  /** Draw `text` on its own row, `InstanceEyebrow.rowHeight` below the name's last line. */
  | { kind: 'row'; text: string };

export interface EyebrowInput {
  placement: EyebrowPlacement;
  /** True only for a component instance — `node.isComponent()`. */
  isComponentInstance: boolean;
  /** Project-wide instance count for this node's component, from TVW-001's one walk. */
  count: number;
  /** `getPanAndScale().scale` — the user-facing zoom. */
  scale: number;
  /** Measured width of the name's last painted line, in graph units. */
  lastLineWidth: number;
  /** Measured width of `eyebrowText(count)` in the font it will be painted in. */
  countWidth: number;
  /** The name's full allowance BEFORE `titleAllowanceFor` narrowed it. */
  baseAllowance: number;
}

/**
 * The one decision, so the painter holds none of it.
 *
 * The order matters and is the order a reader would check it in: is this even an instance, is
 * there a count worth drawing, is the card zoomed in far enough to read it, and only then where
 * it goes. `hover-only` falls out as `none` at the first gate that names it, so the hover surface
 * is the only thing that changes when Richard picks it.
 */
export function eyebrowPlan(input: EyebrowInput): EyebrowPlan {
  const { placement, isComponentInstance, count, scale, lastLineWidth, countWidth, baseAllowance } = input;

  if (!isComponentInstance) return { kind: 'none' };
  if (placement === 'hover-only') return { kind: 'none' };

  const text = eyebrowText(count);
  if (text === null) return { kind: 'none' };
  if (!eyebrowIsVisible(scale)) return { kind: 'none' };

  if (placement === 'own-row') return { kind: 'row', text };

  if (placement === 'reserve-width') {
    // Flush right against the full allowance: the reserved band is a fixed three digits wide, so a
    // `· 3×` sits at the right of it rather than floating at the left with a gap after it. The x
    // does not depend on how the name wrapped, which is the point of reserving.
    return { kind: 'inline', text, x: baseAllowance - countWidth };
  }

  // 'inline-if-fits' — the only placement that can decline to draw. 55.3% of unrenamed instance
  // nodes in the corpus land here, so this branch is the common case, not the edge.
  const x = lastLineWidth + InstanceEyebrow.gap;
  if (x + countWidth > baseAllowance) return { kind: 'none' };
  return { kind: 'inline', text, x };
}
