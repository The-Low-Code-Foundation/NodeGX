import { SidebarModel } from '@noodl-models/sidebar';

import { ComponentModel } from '../../models/componentmodel';
import { NodeLibrary } from '../../models/nodelibrary';
import { forgetTarget } from '../panels/ExplainPanel/explainTarget';
import PopupLayer from '../popuplayer';
import * as HitTester from './canvas/HitTester';

import type { NodeGraphEditorConnection } from './NodeGraphEditorConnection';
import type { NodeGraphEditorNode } from './NodeGraphEditorNode';
import type { NodeGraphEditor } from '../nodegrapheditor';

/**
 * Selection *policy* for the node graph editor (PLAT-001 wave 2 extraction —
 * bodies moved verbatim from nodegrapheditor.ts): what click-select,
 * add-to-selection, deselect, clear and rect-multiselect mean, including the
 * sidebar/panel side effects and double-click navigation. Raw selection
 * *state* lives in `canvas/NodeSelector`.
 */
export class SelectionActions {
  constructor(private editor: NodeGraphEditor) {}

  /**
   * TVW-003: told once the node selection has settled after an action, so the selection store can
   * mirror it (`SelectionStoreBinding`). Unset on every canvas but the app's.
   */
  onSelectionChanged?: () => void;

  /**
   * How deep inside a selection action we are. `selectNode` deselects before it selects; without
   * this the store would hear "nothing selected" and then the node, and the preview would drop its
   * outline and redraw it on every click.
   */
  private actionDepth = 0;

  private settle<T>(action: () => T): T {
    this.actionDepth++;
    try {
      return action();
    } finally {
      this.actionDepth--;
      if (this.actionDepth === 0) this.onSelectionChanged?.();
    }
  }

  deselect(args?: { disableHidePanels: boolean }) {
    this.settle(() => this.deselectNow(args));
  }

  private deselectNow(args?: { disableHidePanels: boolean }) {
    const editor = this.editor;

    editor.commentLayer?.clearMultiselection();
    editor.selector.unselect();

    /**
     * FH-008: the Explain panel's remembered target is a *shadow* of this
     * selection, and it has to be dropped with it. Clicking empty canvas used to
     * leave the panel still offering "Explain this node" for a node nothing was
     * pointing at any more — the memo was written when the node was clicked and
     * nothing ever cleared it.
     *
     * Safe to do on every deselect: the paths that deselect only to re-select
     * (`selectNode`, `addNodeToSelection`) re-arm the memo immediately afterwards
     * via `SidebarModelEvent.nodeSelected`. Read-only editors are excluded for the
     * same reason they leave the sidebar alone — they are a view of a graph, not
     * the canvas the user is pointing at.
     */
    if (!editor.readOnly) {
      forgetTarget();
    }

    /**
     * A read-only editor is a *view of a graph*, not the app's canvas, and it
     * must not drive the app's chrome.
     *
     * `hidePanels()` is global. A read-only editor belongs to a document that
     * created its own `NodeGraphEditor` — the change review, the version-control
     * diff, the authoring preview — and hiding the sidebar from there closes the
     * panel whose `onOpen` handler (`router.setup.ts`) then reopens the *editor*
     * document, unmounting the very document that asked. The route in is
     * `switchToComponent(component, { node })`, which calls `clearSelection()`
     * before selecting: every other action in this file already returns early
     * when `readOnly`, and this one was simply missed.
     *
     * Measured 2026-08-02: clicking any change row, or "Walk through", in the
     * change-review document navigated the app back to the editor document
     * mid-render, ~246 React warnings deep. The click-to-focus that AIX-003's
     * notes recorded as verified had never been exercised through a real
     * document.
     */
    if (!args?.disableHidePanels && !editor.readOnly) {
      SidebarModel.instance?.hidePanels();
    }

    // Broadcast a deselect event
    editor.notifyListeners('deselect');
  }

  clearSelection(args?: { disableHidePanels: boolean }) {
    const editor = this.editor;

    this.deselect(args);

    // Clear dragging connection
    if (editor.interaction.draggingConnection) {
      editor.closeConnectionPanels();
      editor.interaction.draggingConnection.fromNode.borderHighlighted = false;
      editor.interaction.draggingConnection.toNode.borderHighlighted = false;
      editor.interaction.draggingConnection = undefined;
    }

    // Clear any connection hover/selection
    editor.setHighlightedConnection(undefined);
    editor.selectedConnection = undefined;

    // Close open popup
    PopupLayer.instance.hideAllModalsAndPopups();
    PopupLayer.instance.hideTooltip();
  }

  /**
   * Select a wire (CAN-003). Node selection and wire selection are exclusive:
   * `clearSelection` drops whichever was held, so Delete and the context menus
   * never have to decide between them.
   */
  selectConnection(connection: NodeGraphEditorConnection) {
    const editor = this.editor;

    if (editor.readOnly) {
      return;
    }

    this.clearSelection();
    editor.commentLayer?.clearSelection();

    editor.selectedConnection = connection;
    editor.repaint();
  }

  addNodeToSelection(node: NodeGraphEditorNode) {
    this.settle(() => this.addNodeToSelectionNow(node));
  }

  private addNodeToSelectionNow(node: NodeGraphEditorNode) {
    const editor = this.editor;

    if (editor.readOnly) {
      return;
    }

    const currentMultiselect = [...editor.selector.nodes];

    this.deselect();

    const index = currentMultiselect.indexOf(node);
    if (index === -1) {
      currentMultiselect.push(node);
    } else {
      currentMultiselect.splice(index, 1);
    }

    editor.selector.select(currentMultiselect);

    editor.repaint();
  }

  /**
   * @param options.keepSidePanel TVW-004 — do not replace the side panel with the node's
   *   properties. Passed when the selection was made **in a panel**: a Layers row click used to
   *   swap the Project panel out for Properties, so the tree the person was navigating removed
   *   itself on first use. Measured in the drive, invisible to every count that graded it.
   */
  selectNode(node: NodeGraphEditorNode, options?: { keepSidePanel?: boolean }) {
    const editor = this.editor;

    if (editor.readOnly) {
      editor.notifyListeners('readOnlyNodeClicked', node.model);
      return;
    }

    // Always select the node in the selector if not already selected
    if (!node.selected) {
      this.settle(() => {
        /**
         * 🔴 **`keepSidePanel` has to reach THIS deselect too, and it did not.**
         *
         * `clearSelection()` → `deselectNow()` → `SidebarModel.instance.hidePanels()`, which
         * switches the sidebar to `previousActiveId` or falls back to `components`. So a caller
         * asking to keep its panel lost it **here**, a few lines above the `switchToNode` its flag
         * was guarding — the panel was taken down by the deselect and then simply not put back.
         *
         * Measured 2026-09-19 (P94 STY-006) by wrapping the sidebar's own methods in the running
         * editor and reading who called them:
         *   `hidePanels(undefined) from: SelectionActions.deselectNow < eval < SelectionActions.settle`
         * — this call site, not the two others that also clear a selection on the way here. Two
         * earlier fixes guarded those two and the reading did not move at all, which is what an
         * unmeasured guess looks like from the outside. [[a-predicted-sentence-belongs-to-one-code-path]].
         */
        this.clearSelection(options?.keepSidePanel ? { disableHidePanels: true } : undefined);
        editor.commentLayer?.clearSelection();
        node.selected = true;
        editor.selector.select([node]);
        editor.repaint();
      });
    }

    // Always switch to the node in the sidebar (fixes property panel stuck issue) — unless the
    // selection came from a panel, which would then be replacing itself. See `keepSidePanel`.
    if (!options?.keepSidePanel) SidebarModel.instance.switchToNode(node.model);

    // Handle double-click navigation
    if (editor.interaction.leftButtonIsDoubleClicked) {
      // A graph may claim the gesture (WFA-006: a workflow step descends into
      // the cloud function it calls). Asked first and only asked — the knowledge
      // of what a node points at stays in the graph model, the way
      // `getContextMenuActions` already works.
      const graph = editor.model as unknown as { handleDoubleClick?: (nodeId: string) => boolean };
      if (typeof graph?.handleDoubleClick === 'function' && graph.handleDoubleClick(node.model.id)) {
        return;
      }

      if (node.model.type instanceof ComponentModel) {
        // TVW-007: the instance door. `viaInstance` is what makes the trail read `[◆ Home] › Hero`
        // instead of the folder path — see `instanceTrail.ts`.
        editor.switchToComponent(node.model.type, { pushHistory: true, viaInstance: true, viaNodeId: node.id });
      } else {
        const componentPorts = node.model
          .getPorts()
          .filter((p) => p.plug === 'input' && NodeLibrary.nameForPortType(p.type) === 'component');

        //check if there's a type with the component name, if so switch to it
        const component = componentPorts.map((port) => node.model.parameters[port.name]).filter((c) => c !== undefined);
        const type = component.length && NodeLibrary.instance.getNodeTypeWithName(component[0]);

        if (type) {
          /**
           * ⚠️ TVW-007 deliberately does NOT pass `viaInstance` here.
           *
           * This branch is a node with a `component`-typed INPUT PARAMETER (a node configured to
           * point at a component), not an instance of one. The trail's parent crumb is drawn as
           * the instance chip — diamond and component-hue wash — and that chip would be a claim
           * about containment that this relationship does not make: the component is not placed
           * on this canvas, it is named by a parameter on it. These descend to the folder path.
           */
          // @ts-expect-error TODO: this is wrong!
          editor.switchToComponent(type, { pushHistory: true });
        } else {
          //there was no type that matched, so forward the double click event to the sidebar
          SidebarModel.instance.invokeActive('doubleClick', node);
        }
      }
    }
  }

  multiselectNodes(x, y, x2, y2, mode) {
    this.settle(() => this.multiselectNodesNow(x, y, x2, y2, mode));
  }

  private multiselectNodesNow(x, y, x2, y2, mode) {
    const editor = this.editor;

    const selectRect = { x: Math.min(x, x2), y: Math.min(y, y2), width: Math.abs(x2 - x), height: Math.abs(y2 - y) };

    //select all comments
    editor.commentLayer.performMultiSelect(selectRect, mode);

    // Select all nodes with a vertex inside of the multiselect area
    const selected = HitTester.nodesInRect(editor.roots, selectRect);
    editor.selector.select(HitTester.resolveMultiselect(mode, editor.interaction.lastMultiselected, selected));
  }

  isHighlighted(node) {
    return this.editor.highlighted === node || this.editor.selector.isActive(node);
  }
}
