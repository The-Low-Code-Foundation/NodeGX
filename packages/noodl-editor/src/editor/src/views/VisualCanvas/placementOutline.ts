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
 * The path to outline — `[placementId, …, visualNodeId]` — or `null` for nothing to point at.
 *
 * 🔴 **A path, and it took a drive to learn why.** The first build sent the id of the node that
 * *places* the component, which is the obvious answer and draws nothing. A component instance
 * passes the highlighter's `getRef` filter — so the selection count reads a healthy **1** — and
 * then has no `getDOMElement`, so the outline div is removed again on the next frame. The last id
 * has to be a node that PAINTS; the leading placement id is what makes it *that* copy rather than
 * every copy. See `pageReach`'s note on `firstRendered` for the measurement.
 */
export type PlacementOutline = readonly string[] | null;

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
