/**
 * TVW-002 AC1 — the one fact the strip publishes: *where on this screen the thing you are editing
 * is*.
 *
 * ───────────────────────────────────────────────────────────────────────────────
 * 🔴 WHY A CHANNEL, RATHER THAN THE STRIP JUST DRAWING IT.
 *
 * The preview's outline is drawn by the running app's `Highlighter`, reached through one guest API
 * (`NoodlEditorHighlightAPI.selectNode`) that has **no notion of who asked**. It holds one
 * selection. Whoever calls it last wins, and everything already written into it is gone.
 *
 * The editor already has exactly one writer of that API — `EditorDocument`, which owns
 * `selectedNodePath` and pushes it to both the docked `CanvasView` and, over IPC, the detached
 * window. A second writer in `VisualCanvas` would race it: switch component and select a node in
 * the same tick and the outline lands on whichever effect ran last, differently between runs.
 *
 * So `VisualCanvas` **publishes a fact** and `EditorDocument` **decides**. The merge rule lives in
 * one place and reads as a sentence: *a real selection always wins; the placement outline is what
 * the preview says when the author has not selected anything.*
 *
 * ⚠️ **It is deliberately the SAME outline as a selection, not a fourth kind of line.** TVW-003
 * ruled the preview's vocabulary — hover 1px, selection 2px, one teal — and a third treatment over
 * a running app would spend that ruling. What tells the two apart is the strip's quiet row, which
 * Richard made permanent on 2026-09-18 and which is already saying *"Hero is on Pricing"* one row
 * below. The words are on the seam; the line is on the thing.
 *
 * @module noodl-editor/views/VisualCanvas/placementOutline
 */

import { EventDispatcher } from '../../../../shared/utils/EventDispatcher';

/**
 * `string` — a node id to outline. `null` — nothing to point at.
 *
 * A node id rather than a full path: the walk answers with the node that *places* the component,
 * and `selectNodesAtPath([id])` is the highlighter's documented behaviour for "a canvas showing a
 * definition" — every instance carrying that id, which is the editor's existing selection
 * semantics for exactly this situation.
 */
export type PlacementOutline = string | null;

export const PLACEMENT_OUTLINE_EVENT = 'previewPlacementOutline';

/** Publish where the canvas's component sits on the screen the preview is showing. */
export function publishPlacementOutline(outline: PlacementOutline): void {
  EventDispatcher.instance.emit(PLACEMENT_OUTLINE_EVENT, outline);
}

/**
 * @returns an unsubscribe, so a caller in a React effect can hand it straight back.
 *
 * ⚠️ The group object is created per subscription. `EventDispatcher.off` removes by group, and a
 * shared constant would mean the first component to unmount silently unsubscribed the others.
 */
export function onPlacementOutline(handler: (outline: PlacementOutline) => void): () => void {
  const group = {};
  EventDispatcher.instance.on(PLACEMENT_OUTLINE_EVENT, handler, group);
  return () => EventDispatcher.instance.off(group);
}
