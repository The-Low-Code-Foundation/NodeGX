/**
 * TVW-005 — the gesture: what the panel does between a person pressing on a row and letting go.
 *
 * The decision is `layersDrag.ts` and the mutation is `layersDragApply.ts`; this is the hand
 * between them. It holds three pieces of state a person can see — what is being dragged, where the
 * indicator is, and which row is shaking — and it owns the two things neither of the other modules
 * can: the real legality gate, and the drag channel the editor already has.
 *
 * ## The drag channel is `PopupLayer`, because the Components tab's drag is already in it
 *
 * `useDragDrop` hands `PopupLayer.instance.startDragging` a payload and the canvas reads it back
 * off `PopupLayer.instance.dragItem` — one channel, and the reason a component row can be dropped
 * on the canvas at all. A drag *into* Layers is the same payload arriving at a different surface,
 * so Layers reads that same field rather than inventing a second protocol (§5: *two drags, one drop
 * function — do not write a third*).
 *
 * ⚠️ **`PopupLayer` never calls the `onDragEnd` it is given** (measured: `dragCompleted` at
 * `popuplayer.ts:1294` does not touch it), and it never reads `dragTarget` either. Both fields are
 * passed because the Components tab passes them and one day something may; nothing here depends on
 * them. The state is cleared by this hook, on the mouse-up it handles and on a window-level mouse-up
 * for the drops that land on nothing.
 *
 * 🔴 **The refusal is spoken on the drag itself.** `PopupLayer.setDragMessage` writes on the thing
 * following the cursor, which is where a person is looking; a tooltip anchored to a row they are
 * dragging *away* from would be behind their own hand.
 *
 * @module noodl-editor/views/panels/ComponentsPanelNew/hooks/useLayersDrag
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { ProjectModel } from '@noodl-models/projectmodel';

import { applyDragPlan } from '../layersDragApply';
import {
  planComponentDrop,
  planKeyboardMove,
  planRowDrag,
  type DragPlan,
  type DropSide,
  type Legality
} from '../layersDrag';
import type { LayerRow } from '../layersTree';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const PopupLayer = require('@noodl-views/popuplayer').default;

/** How long the refusal shake runs. Matches the stylesheet's animation. */
const SHAKE_MS = 400;

export interface LayersDragTarget {
  key: string;
  side: DropSide;
  /** Whether dropping here would do anything — what decides which indicator is drawn. */
  ok: boolean;
}

export interface LayersDragApi {
  /** The row being dragged out of Layers, if any. */
  draggingKey: string | null;
  target: LayersDragTarget | null;
  /** The row refusing right now, for the shake. */
  shakingKey: string | null;
  /**
   * Is a drag in flight at all — this tab's own, or one that started in the Components tab?
   * `PopupLayer` is the only channel that knows the second kind, and a row cannot see it.
   */
  isDragging(): boolean;
  /**
   * The mouse went down on a row. The drag starts from here if the pointer travels far enough —
   * see the note on the implementation for why the row cannot decide that itself.
   */
  onRowPress(row: LayerRow, element: HTMLElement, x: number, y: number): void;
  onRowDragStart(row: LayerRow, element: HTMLElement): void;
  onRowDragOver(row: LayerRow, side: DropSide, copy: boolean): void;
  onRowDrop(row: LayerRow, side: DropSide, copy: boolean): void;
  /** ⌥↑ / ⌥↓ on the selected row. Returns the node that moved, or null. */
  moveByKeyboard(rowKey: string, direction: 'up' | 'down'): string | null;
}

export interface UseLayersDragOptions {
  rows: readonly LayerRow[];
  /** The component the canvas has open: the only rows a person may rearrange. */
  canvasComponent: string | undefined;
  /** The canvas, for the create path a placement goes through. */
  editor: unknown;
  /** Select the row that ended up moved, and put the selection back on an undo. */
  onMoved?(nodeId: string): void;
}

export function useLayersDrag({ rows, canvasComponent, editor, onMoved }: UseLayersDragOptions): LayersDragApi {
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const [target, setTarget] = useState<LayersDragTarget | null>(null);
  const [shakingKey, setShakingKey] = useState<string | null>(null);
  /**
   * The row a drag started on, read during the drag by handlers that must not re-render to see it.
   * React state alone would make every `mousemove` a render.
   */
  const sourceRow = useRef<LayerRow | null>(null);
  const shakeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** The press that has not yet become a drag, and the listeners watching for it to. */
  const pending = useRef<{ row: LayerRow; element: HTMLElement; x: number; y: number; stop(): void } | null>(null);

  useEffect(
    () => () => {
      if (shakeTimer.current) clearTimeout(shakeTimer.current);
      pending.current?.stop();
    },
    []
  );

  const shake = useCallback((key: string) => {
    setShakingKey(key);
    if (shakeTimer.current) clearTimeout(shakeTimer.current);
    shakeTimer.current = setTimeout(() => setShakingKey(null), SHAKE_MS);
  }, []);

  const endDrag = useCallback(() => {
    sourceRow.current = null;
    setDraggingKey(null);
    setTarget(null);
    PopupLayer.instance.setDragMessage(undefined);
  }, []);

  // A drop that lands outside the panel still ends the gesture. Without this the indicator stays
  // on the last row the pointer crossed, which reads as a drag that is still happening.
  useEffect(() => {
    if (!draggingKey) return;
    const onUp = () => endDrag();
    window.addEventListener('mouseup', onUp);
    return () => window.removeEventListener('mouseup', onUp);
  }, [draggingKey, endDrag]);

  /**
   * The real gate: `ComponentModel.getCreateStatus`, asked of the component that would hold the
   * node, with the parent node and the child's type. §2 — an illegal reparent is refused **with
   * the canvas's own warning text**, so the message is returned untouched.
   */
  const canParent: Legality = useCallback(
    (_child, parentRow) => {
      const project = ProjectModel.instance;
      const owner = project?.getComponentWithName(parentRow.owner);
      const parentNode = owner?.graph?.findNodeWithId(parentRow.path[parentRow.path.length - 1]);
      if (!owner || !parentNode) return { ok: true };

      const dragItem = PopupLayer.instance.dragItem;
      let type: unknown;
      if (sourceRow.current) {
        const sourceOwner = project?.getComponentWithName(sourceRow.current.owner);
        const node = sourceOwner?.graph?.findNodeWithId(
          sourceRow.current.path[sourceRow.current.path.length - 1]
        );
        type = node?.type;
      } else if (dragItem?.component) {
        type = dragItem.component;
      }
      if (!type) return { ok: true };

      const status = owner.getCreateStatus({ parent: parentNode, type });
      return { ok: Boolean(status.creatable), message: status.message };
    },
    []
  ) as Legality;

  /** What the gesture under the pointer would do, whichever of the two drags it is. */
  const planFor = useCallback(
    (row: LayerRow, side: DropSide, copy: boolean): DragPlan | null => {
      if (!canvasComponent) return null;
      if (sourceRow.current) {
        return planRowDrag({
          rows,
          canvasComponent,
          sourceKey: sourceRow.current.key,
          target: { key: row.key, side },
          // ⌥ comes off the live mouse event, not off a flag written somewhere at drag start: a
          // person presses and releases it mid-drag, and the answer that matters is the one at the
          // moment they let go.
          copy,
          canParent
        });
      }
      const dragItem = PopupLayer.instance.dragItem;
      if (!dragItem?.component) return null;
      return planComponentDrop({
        rows,
        canvasComponent,
        target: { key: row.key, side },
        component: { name: dragItem.component.name, kind: dragItem.componentKind },
        canParent
      });
    },
    [rows, canvasComponent, canParent]
  );

  const onRowDragStart = useCallback(
    (row: LayerRow, element: HTMLElement) => {
      sourceRow.current = row;
      setDraggingKey(row.key);
      PopupLayer.instance.startDragging({
        label: row.label,
        type: 'layer-row',
        dragTarget: element,
        onDragEnd: endDrag
      });
    },
    [endDrag]
  );

  /**
   * 🔴 **The 5px threshold is watched on the WINDOW, not on the row that was pressed** — and that
   * is a defect this surface had until it was driven.
   *
   * The Components tab measures the threshold inside its own row's `onMouseMove`, so the gesture
   * only begins if the pointer is *still over the row you pressed* when it has travelled far
   * enough. A row here is 26px high: press in the middle, move 13px **down**, and the next move
   * belongs to the row below — which has no press of its own to compare against. The drag never
   * starts, and the person is left having done nothing. Measured: a drag dispatched as
   * `(x + 10, y + 10)` produced `isDragging(): false` with the handlers demonstrably bound.
   *
   * Downward is the commonest direction there is in a tree, so this is not a corner.
   */
  const onRowPress = useCallback(
    (row: LayerRow, element: HTMLElement, x: number, y: number) => {
      pending.current?.stop();
      const onMove = (event: MouseEvent) => {
        const at = pending.current;
        if (!at) return;
        const dx = event.clientX - at.x;
        const dy = event.clientY - at.y;
        if (Math.sqrt(dx * dx + dy * dy) <= 5) return;
        at.stop();
        onRowDragStart(at.row, at.element);
      };
      const onUp = () => pending.current?.stop();
      const stop = () => {
        window.removeEventListener('mousemove', onMove, true);
        window.removeEventListener('mouseup', onUp, true);
        pending.current = null;
      };
      pending.current = { row, element, x, y, stop };
      window.addEventListener('mousemove', onMove, true);
      window.addEventListener('mouseup', onUp, true);
    },
    [onRowDragStart]
  );

  const onRowDragOver = useCallback(
    (row: LayerRow, side: DropSide, copy: boolean) => {
      if (!PopupLayer.instance.isDragging()) return;
      const plan = planFor(row, side, copy);
      if (!plan) return;

      if (plan.kind === 'refuse') {
        setTarget({ key: row.key, side, ok: false });
        PopupLayer.instance.indicateDropType(undefined);
        PopupLayer.instance.setDragMessage(plan.sentence ?? undefined);
        return;
      }
      setTarget({ key: row.key, side, ok: true });
      PopupLayer.instance.indicateDropType(plan.kind === 'place' ? 'add' : 'move');
      PopupLayer.instance.setDragMessage(undefined);
    },
    [planFor]
  );

  const onRowDrop = useCallback(
    (row: LayerRow, side: DropSide, copy: boolean) => {
      const plan = planFor(row, side, copy);
      PopupLayer.instance.dragCompleted();
      if (!plan) {
        endDrag();
        return;
      }

      if (plan.kind === 'refuse') {
        // The row that refused is the one the person pointed at; the sentence has already been on
        // the drag for as long as they hovered.
        shake(row.key);
        endDrag();
        return;
      }

      const project = ProjectModel.instance;
      const result = applyDragPlan(plan, {
        project,
        editor: editor as never,
        restoreSelection: onMoved && plan.kind === 'move' ? () => onMoved(plan.node.id) : undefined
      });
      if (result.applied && result.nodeId && onMoved) onMoved(result.nodeId);
      endDrag();
    },
    [planFor, endDrag, shake, editor, onMoved]
  );

  const moveByKeyboard = useCallback(
    (rowKey: string, direction: 'up' | 'down'): string | null => {
      if (!canvasComponent) return null;
      const plan = planKeyboardMove(rows, canvasComponent, rowKey, direction);
      if (plan.kind !== 'move') {
        if (plan.kind === 'refuse' && plan.sentence) shake(rowKey);
        return null;
      }
      const result = applyDragPlan(plan, {
        project: ProjectModel.instance,
        editor: editor as never,
        restoreSelection: onMoved ? () => onMoved(plan.node.id) : undefined
      });
      if (result.applied && result.nodeId && onMoved) onMoved(result.nodeId);
      return result.applied ? (result.nodeId ?? null) : null;
    },
    [rows, canvasComponent, shake, editor, onMoved]
  );

  const isDragging = useCallback(() => Boolean(PopupLayer.instance.isDragging()), []);

  return {
    draggingKey,
    target,
    shakingKey,
    isDragging,
    onRowPress,
    onRowDragStart,
    onRowDragOver,
    onRowDrop,
    moveByKeyboard
  };
}
