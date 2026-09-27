import type { NodePath, Selection, SelectionSource } from './selectionStore';

/**
 * TVW-003 — what the canvas does with a selection another surface wrote.
 *
 * The canvas shows one component's graph. A selection names nodes by path through instances
 * (`[heroInstanceId, headlineId]`), and the canvas may be showing any component along that path:
 * `Home`, where the `Hero` instance is; `Hero`, where the headline is; or neither. So the question
 * this answers is *which element of each path is on this canvas*, and only when none is does the
 * canvas move.
 *
 * Pure — no editor, no DOM — so `tests-unit/tvw-003/` grades the decision without a canvas.
 */

export type CanvasMove<C> =
  /** Nothing to do: the canvas already shows this, or there is nothing to show. */
  | { kind: 'none' }
  /** Keep the component, select no nodes. */
  | { kind: 'clear' }
  /** Every path has an element on this canvas: select those, stay where we are. */
  | { kind: 'select'; nodeIds: string[] }
  /** Go to the selection's component, selecting the first path's node when there is one. */
  | { kind: 'switch'; component: C; nodeId?: string };

export interface CanvasState<C> {
  /** The component the canvas is showing. */
  readonly component: C | null;
  /** Whether a node with this id is in the graph the canvas is showing. */
  isOnCanvas(nodeId: string): boolean;
  /** What the canvas has selected now, in selection order. */
  readonly selectedIds: readonly string[];
}

/**
 * The innermost element of the path that is on this canvas. Innermost because it is the most
 * specific thing the person pointed at that this canvas can draw: on `Hero`'s canvas, the headline
 * rather than an enclosing `Hero` instance that a recursive component might also place here.
 */
export function elementOnCanvas(path: NodePath, isOnCanvas: (nodeId: string) => boolean): string | undefined {
  for (let i = path.length - 1; i >= 0; i--) {
    if (isOnCanvas(path[i])) return path[i];
  }
  return undefined;
}

export function resolveCanvasMove<C>(selection: Selection, canvas: CanvasState<C>): CanvasMove<C> {
  const component = selection.component as C | null;
  if (!component) return { kind: 'none' };

  if (selection.nodes.length === 0) {
    if (component !== canvas.component) return { kind: 'switch', component };
    return canvas.selectedIds.length ? { kind: 'clear' } : { kind: 'none' };
  }

  // A Layers row names one node, not "whatever of it this canvas can draw". Falling back to the
  // enclosing instance is right for a preview click (AC1: stay on Home, light the Hero), but from
  // Layers it meant a row expanded under an instance on this canvas re-selected that instance —
  // nothing moved until `Edit ›` was pressed (Richard, 0.3.0 drive, 2026-09-23). Only the node
  // itself counts; when it is not here, the canvas goes to the row's component.
  const onCanvas = selection.nodes.map((path) =>
    selection.source === 'layers'
      ? canvas.isOnCanvas(path[path.length - 1])
        ? path[path.length - 1]
        : undefined
      : elementOnCanvas(path, (id) => canvas.isOnCanvas(id))
  );

  if (onCanvas.some((id) => id === undefined)) {
    const first = selection.nodes[0];
    return { kind: 'switch', component, nodeId: first[first.length - 1] };
  }

  const nodeIds = onCanvas as string[];
  if (sameIds(nodeIds, canvas.selectedIds)) return { kind: 'none' };
  return { kind: 'select', nodeIds };
}

/** How the canvas's own selection is written to the store: one-element paths in its component. */
export function pathsOfCanvasSelection(selectedIds: readonly string[]): NodePath[] {
  return selectedIds.map((id) => [id]);
}

function sameIds(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id, i) => id === b[i]);
}

/*
 * `keepsSidePanel` (TVW-004) — removed by P101 INS-002, 2026-09-23.
 *
 * It returned true for a selection made in Layers or a panel, and `selectNode` then skipped
 * opening the node's properties, because in a one-slot editor the Properties panel REPLACED the
 * panel the person had clicked in — Layers vanished on the first click in it. Right for one slot.
 * Properties has its own column now (P101 INS-001) and opening it touches nothing on the left, so
 * the suppression became the defect: Richard clicked `The paragraph` in Layers on drive A and got
 * no properties. Every selection now shows its node, from wherever it was made.
 */
