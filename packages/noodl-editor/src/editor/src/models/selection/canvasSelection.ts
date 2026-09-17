import type { NodePath, Selection } from './selectionStore';

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

  const onCanvas = selection.nodes.map((path) => elementOnCanvas(path, (id) => canvas.isOnCanvas(id)));

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
