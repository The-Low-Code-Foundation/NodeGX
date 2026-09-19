/**
 * TVW-006 — the structure lane.
 *
 * The screen part of a component's graph is drawn as a faint labelled region *wherever the person
 * put it* (R-J: nothing is pinned, snapped or auto-arranged). This module owns the geometry and the
 * three filter decisions; it draws nothing and imports nothing from the editor, so the whole of
 * §2 can be graded offline.
 *
 * 🔴 **A lane is one rectangle per visual root, and it needs no tree walk.** `NodeGraphEditorNode`
 * already measures a root's box *including its nested children* — `measure()` adds every child's
 * height and takes the max of their widths (`NodeGraphEditorNode.ts:521-528`). So the lane is
 * `measuredSize` plus padding, and the per-frame cost is O(roots), not O(nodes). That is what makes
 * §5's first landmine answerable: a lane is culled with its root because it *is* its root's box.
 *
 * 🔴 **Visual-ness is the model's answer, never a re-derivation.** Callers pass `isVisual` straight
 * from `NodeGraphModel.isVisualRoot`, which consults `allowAsChild` on a *resolved* type and falls
 * back to the file's recorded `visualRoots` when the type is missing. Reading `allowAsChild` here
 * would reproduce the defect TVW-001 slice 2 was driven into: on project open the node library has
 * not finished loading and every root reads "not visual"
 * ([[allowaschild-is-stale-until-the-node-library-loads]]).
 *
 * ⚠️ **A lane covers a root's whole subtree, so dimming is decided per ROOT.** The graph's
 * `children[]` may hold a node whose own type is not visual, and it still sits inside the stack's
 * box — so "inside a lane" is a geometric fact about the root, not a per-node type test. This is
 * why {@link rootAlpha} takes one boolean and there is no node-id set anywhere in this module.
 */

/** A root as this module needs it: its position, the box the painter measured, and the model's
 *  verdict on whether it draws. */
export type LaneRoot = {
  id: string;
  x: number;
  y: number;
  /** `measuredSize` — the root AND its nested children. */
  width: number;
  height: number;
  /** `NodeGraphModel.isVisualRoot(root)`. Never re-derived here. */
  isVisual: boolean;
};

export type LaneRect = { id: string; x: number; y: number; width: number; height: number };

/** The culling rectangle `CanvasRenderer` already computes for the frame. */
export type PaintRect = { minX: number; maxX: number; minY: number; maxY: number };

/** `All` is the default and the state the canvas is always in unless someone pressed something. */
export type LaneFilter = 'all' | 'structure' | 'logic';

export const StructureLane = {
  /** §2: 12px of air between the stack's measured box and the lane's stroke. */
  padding: 12,
  /** §2: 22px above the stack for the eyebrow to sit in. */
  eyebrowHeight: 22,
  /** §2: rounded 10px. */
  cornerRadius: 10,
  /** §2: a 4% wash of `categoryVisual` inside the lane. */
  washAlpha: 0.04,
  /** §2 filter: the dimmed state. Dims, never hides (R-F). */
  dimAlpha: 0.25,
  /** §3: the eyebrow hides below 50% zoom; the lane itself keeps drawing. */
  eyebrowMinScale: 0.5,
  /** The word in the eyebrow. */
  eyebrowLabel: 'STRUCTURE',
  /** §2: shown once, not per node, when the component has no visual root at all. */
  logicOnlyLabel: 'LOGIC ONLY — NO STRUCTURE LANE'
} as const;

/**
 * The lane for one root.
 *
 * The eyebrow's 22px is added to the TOP only: the lane grows upwards to make room for its label,
 * so the stack does not move and the wires into it keep their geometry. Nothing in this function
 * consults the filter — a dimmed lane is the same rectangle, drawn fainter.
 */
export function laneRectFor(root: LaneRoot): LaneRect {
  const { padding, eyebrowHeight } = StructureLane;
  return {
    id: root.id,
    x: root.x - padding,
    y: root.y - padding - eyebrowHeight,
    width: root.width + padding * 2,
    height: root.height + padding * 2 + eyebrowHeight
  };
}

/** Does this lane touch the frame's culling rectangle? Half-open on the far edges, like the
 *  renderer's own rect. A lane that only touches the edge still draws its stroke. */
export function laneIsVisible(rect: LaneRect, paint: PaintRect): boolean {
  return (
    rect.x <= paint.maxX &&
    rect.x + rect.width >= paint.minX &&
    rect.y <= paint.maxY &&
    rect.y + rect.height >= paint.minY
  );
}

/**
 * Every lane the frame should draw: one per visual root, culled to the viewport.
 *
 * A component with two visual roots gets two lanes (§2) — they are not merged into one bounding
 * box, because two stacks side by side are two screens' worth of structure and a merged region
 * would claim the empty space between them.
 */
export function lanesForFrame(roots: readonly LaneRoot[], paint: PaintRect): LaneRect[] {
  const lanes: LaneRect[] = [];
  for (const root of roots) {
    if (!root.isVisual) continue;
    const rect = laneRectFor(root);
    if (laneIsVisible(rect, paint)) lanes.push(rect);
  }
  return lanes;
}

/**
 * A component with roots, none of which draws — the eyebrow says so once, in the viewport.
 *
 * ⚠️ An EMPTY component is not logic-only. It has no structure and no logic; saying
 * "LOGIC ONLY" over an empty canvas states something false about a graph that has nothing in it,
 * and the person who just made a component has not been told anything they did not know.
 */
export function isLogicOnly(roots: readonly LaneRoot[]): boolean {
  return roots.length > 0 && roots.every((root) => !root.isVisual);
}

/**
 * How bright a root's whole subtree is painted under the filter.
 *
 * R-F: this is an ALPHA, never a skip. A dimmed node is still painted, still hit-tested, still
 * draggable and still connectable — the filter changes what you look at, not what is there.
 */
export function rootAlpha(isVisual: boolean, filter: LaneFilter): number {
  if (filter === 'all') return 1;
  if (filter === 'structure') return isVisual ? 1 : StructureLane.dimAlpha;
  return isVisual ? StructureLane.dimAlpha : 1;
}

/**
 * How bright a wire is painted under the filter.
 *
 * §2 states the `Structure` half outright — *"every wire with neither end in a lane"* dims — and
 * says nothing about `Logic`. The symmetric completion is the one drawn here: under `Logic` a wire
 * dims when BOTH ends are in a lane, because a wire wholly inside the stack is part of the
 * structure. **A wire that CROSSES the boundary stays bright under both filters**: it is the thing
 * that ties the two halves together, and it is the only wire that is about both of them.
 *
 * 🔴 AC1's sentence — *"the wire from For Each into the stack dims where it enters the lane"* —
 * describes a per-wire GRADIENT, which is a different decision from anything in §2 and would be
 * the only gradient on the canvas. Filed for a ruling in the task's §6 rather than guessed at
 * ([[an-assertion-written-from-the-intent-contradicts-the-decision]]); this function is the §2
 * reading, and the spec that grades it says so.
 */
export function connectionAlpha(fromInLane: boolean, toInLane: boolean, filter: LaneFilter): number {
  if (filter === 'all') return 1;
  if (filter === 'structure') return fromInLane || toInLane ? 1 : StructureLane.dimAlpha;
  return fromInLane && toInLane ? StructureLane.dimAlpha : 1;
}

/**
 * Stroke width that reads as 1px on screen at any zoom.
 *
 * The context is scaled once by `ratio * scale` in `CanvasRenderer.paint`, so a `lineWidth` of 1
 * draws `scale` CSS pixels — the hierarchy spine thins to nothing at 20% and fattens at 200%. §3
 * asks for a lane whose stroke stays 1px at every zoom, so the width is divided back out.
 *
 * ⚠️ `ratio` is deliberately NOT divided out: it is the device-pixel ratio, and 1 CSS px on a 2x
 * display is supposed to be 2 device px. Dividing by it would draw a half-pixel hairline.
 */
export function hairlineWidth(scale: number): number {
  return scale > 0 ? 1 / scale : 1;
}

/** The dash pattern, in graph units, so the dashes stay the same size on screen as you zoom. */
export function dashPattern(scale: number): [number, number] {
  const unit = hairlineWidth(scale);
  return [4 * unit, 4 * unit];
}

/** §3: the eyebrow hides below 50%, where its text would be unreadable anyway. */
export function eyebrowIsVisible(scale: number): boolean {
  return scale >= StructureLane.eyebrowMinScale;
}
