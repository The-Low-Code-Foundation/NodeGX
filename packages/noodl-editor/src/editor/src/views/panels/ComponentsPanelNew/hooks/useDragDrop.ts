/**
 * useDragDrop
 *
 * Manages drag-drop state and operations for components/folders.
 * Integrates with PopupLayer.startDragging system.
 */

import { useCallback, useState } from 'react';

import { CLOUD_SHEET, TreeNode } from '../types';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const PopupLayer = require('@noodl-views/popuplayer').default;

/**
 * TVW-001 (d) — whether a row is on the cloud side of `#__cloud__`. Only meaningful in the
 * sectioned (unfiltered) tree, where every row carries its full name; a selected sheet strips the
 * prefix from folder paths, and holds one runtime anyway.
 */
export function isCloudNode(node: TreeNode): boolean {
  if (node.type === 'section') return node.data.runtimeType === 'cloud';
  const path = node.type === 'component' ? node.data.name : node.data.path;
  return path === CLOUD_SHEET.pathPrefix.slice(0, -1) || path.startsWith(CLOUD_SHEET.pathPrefix);
}

export function useDragDrop({ guardCloudBoundary = false }: { guardCloudBoundary?: boolean } = {}) {
  const [draggedItem, setDraggedItem] = useState<TreeNode | null>(null);
  const [dropTarget, setDropTarget] = useState<TreeNode | null>(null);

  /**
   * Start dragging an item
   */
  const startDrag = useCallback((item: TreeNode, sourceElement: HTMLElement) => {
    setDraggedItem(item);

    if (item.type === 'section') return; // TVW-001 (d): a heading does not drag.
    const label = item.type === 'component' ? item.data.localName : `📁 ${item.data.name}`;

    PopupLayer.instance.startDragging({
      label,
      type: item.type,
      dragTarget: sourceElement,
      component: item.type === 'component' ? item.data.component : undefined,
      /**
       * TVW-005 — what `componentKind` calls it, carried on the drag.
       *
       * A drop into Layers has to tell a page from a visual from a logic component, and it has to
       * do it while the pointer is moving. The tab has already classified every row; recomputing
       * the kind at the drop would be a second answer to a question already answered
       * ([[a-check-in-a-second-pipeline-is-a-duplicate-first]]).
       */
      componentKind: item.type === 'component' ? item.data.kind : undefined,
      folder: item.type === 'folder' ? item.data : undefined,
      onDragEnd: () => {
        setDraggedItem(null);
        setDropTarget(null);
      }
    });
  }, []);

  /**
   * Check if an item can be dropped on a target
   */
  const canDrop = useCallback(
    (target: TreeNode): boolean => {
      if (!draggedItem) return false;

      // Can't drop on self
      if (draggedItem.type === 'component' && target.type === 'component') {
        if (draggedItem.data.id === target.data.id) return false;
      }
      if (draggedItem.type === 'folder' && target.type === 'folder') {
        if (draggedItem.data.path === target.data.path) return false;
      }

      // TVW-001 (d): the cloud section sits in the same tree as the browser ones now. A drop across
      // the `#__cloud__` boundary would change which runtime executes the component, so it is not
      // a move this tree offers (WFA-001's "Move to…" rule, applied to drag).
      if (target.type === 'section') return false;
      if (guardCloudBoundary && isCloudNode(draggedItem) !== isCloudNode(target)) return false;

      // Folder-specific rules
      if (draggedItem.type === 'folder' && target.type === 'folder') {
        // Can't drop folder into its own children (descendant check)
        const draggedPath = draggedItem.data.path;
        const targetPath = target.data.path;

        if (targetPath.startsWith(draggedPath + '/')) {
          return false; // Target is a descendant of dragged folder
        }
      }

      return true;
    },
    [draggedItem, guardCloudBoundary]
  );

  /**
   * Handle drop on a target
   */
  const handleDrop = useCallback(
    (target: TreeNode) => {
      if (!draggedItem || !canDrop(target)) return;

      setDropTarget(target);

      // Drop will be executed by parent component
      // which has access to ProjectModel and UndoQueue
    },
    [draggedItem, canDrop]
  );

  /**
   * Clear drop state
   */
  const clearDrop = useCallback(() => {
    setDropTarget(null);
  }, []);

  return {
    draggedItem,
    dropTarget,
    startDrag,
    canDrop,
    handleDrop,
    clearDrop
  };
}
