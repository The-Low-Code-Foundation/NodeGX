import type { ComponentModel } from '../../models/componentmodel';
import { keepsSidePanel, pathsOfCanvasSelection, resolveCanvasMove } from '../../models/selection/canvasSelection';
import { samePath, Selection, SelectionStore } from '../../models/selection/selectionStore';

import type { NodeGraphEditor } from '../nodegrapheditor';

/**
 * TVW-003 — the canvas as a writer and a subscriber of the one selection store.
 *
 * 🔴 **A mirror, not the replacement.** `canvas/NodeSelector` stays the canvas's own selection for
 * copy, paste, delete and marquee; no `selectNode` caller moves. This binding writes the store when
 * that selection changes and applies what other surfaces write.
 *
 * Bound only to the app's canvas (`NodeGraphContext`). The change review, the diff and the
 * authoring preview build their own `NodeGraphEditor`s; they are views of a graph, and a selection
 * made in one must not move the preview.
 */
export function bindSelectionStore(editor: NodeGraphEditor, store: SelectionStore): () => void {
  const bindingContext = {};

  /**
   * 🔴 While applying a selection from elsewhere the canvas does not write back. The store would
   * drop an equal write, but the canvas's version is *lossy*: the preview wrote
   * `[heroInstance, headline]`, the canvas on `Home` can only select `heroInstance`, and writing
   * that back would tell the preview to outline the whole Hero instead of its headline.
   */
  let applying = false;

  const publish = () => {
    if (applying || editor.readOnly) return;
    const component = editor.activeComponent ?? null;
    const ids = editor.selector.nodes.map((node) => node.model.id);
    store.select('canvas', component, pathsOfCanvasSelection(ids));
  };

  const apply = (selection: Selection) => {
    if (editor.readOnly) return;

    const move = resolveCanvasMove<ComponentModel>(selection, {
      component: editor.activeComponent ?? null,
      isOnCanvas: (id) => !!editor.findNodeWithId(id),
      selectedIds: editor.selector.nodes.map((node) => node.model.id)
    });

    // TVW-004 — a selection made in a panel must not replace that panel with Properties.
    const keepSidePanel = keepsSidePanel(selection.source);

    applying = true;
    try {
      switch (move.kind) {
        case 'clear':
          editor.deselect({ disableHidePanels: true });
          editor.repaint();
          break;

        case 'select':
          if (move.nodeIds.length === 1) {
            // The same door as today's preview click on this component: selects, opens the
            // node's properties and centres it.
            editor.switchToComponent(editor.activeComponent, {
              node: editor.findNodeWithId(move.nodeIds[0]).model,
              keepSidePanel
            });
          } else {
            editor.clearSelection({ disableHidePanels: true });
            editor.selector.select(move.nodeIds.map((id) => editor.findNodeWithId(id)));
            editor.repaint();
          }
          break;

        case 'switch': {
          const node = move.nodeId ? move.component.graph?.findNodeWithId(move.nodeId) : undefined;
          editor.switchToComponent(move.component, { node, pushHistory: true, keepSidePanel });
          break;
        }
      }
    } finally {
      applying = false;
    }
  };

  /**
   * Hover is the canvas's `[nodeId]`, so the preview outlines every instance of the node. Leaving a
   * node clears the hover only if it is still that node's: the pointer can enter the next node before
   * the last one hears it left, and clearing then would drop the new outline.
   */
  const setPreviewHover = (nodeId: string, hovered: boolean) => {
    if (hovered) store.setHover('canvas', [nodeId]);
    else if (samePath(store.hover, [nodeId])) store.setHover('canvas', null);
  };

  editor.selectionActions.onSelectionChanged = publish;
  editor.on('activeComponentChanged', publish, bindingContext);
  editor.setPreviewHover = setPreviewHover;

  const unsubscribe = store.subscribe({ surface: 'canvas', onSelection: apply });

  return () => {
    unsubscribe();
    editor.off(bindingContext);
    if (editor.setPreviewHover === setPreviewHover) {
      if (store.hover && store.hover.length === 1) setPreviewHover(store.hover[0], false);
      editor.setPreviewHover = undefined;
    }
    if (editor.selectionActions.onSelectionChanged === publish) {
      editor.selectionActions.onSelectionChanged = undefined;
    }
  };
}
