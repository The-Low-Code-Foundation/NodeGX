import _ from 'underscore';

import { AiAssistantEvent, AiAssistantModel } from '@noodl-models/AiAssistant/AiAssistantModel';
import { KeyCode } from '@noodl-utils/keyboard/KeyCode';
import { KeyboardCommand } from '@noodl-utils/keyboardhandler';

import { EventDispatcher } from '../../../../shared/utils/EventDispatcher';
import { ComponentModel } from '../../models/componentmodel';
import { NodeLibrary } from '../../models/nodelibrary';
import { ProjectModel } from '../../models/projectmodel';
import { WarningsModel } from '../../models/warningsmodel';
import { SnapSpacing } from './canvas/types';
import { LOGIC_BUILDER_PARK_EVENT, yieldLogicOverlayToSidePanel } from './LogicOverlay';

import type { NodeGraphEditor } from '../nodegrapheditor';

/**
 * The editor-wide event subscriptions and keyboard commands previously set up
 * inline in the NodeGraphEditor constructor (PLAT-001 wave 2 extraction —
 * bodies moved verbatim).
 *
 * Every subscription uses the *editor* as the listener context so the
 * pre-existing teardown (`EventDispatcher.instance.off(this)` and
 * `SidebarModel.instance.off(this)` in dispose) detaches them unchanged.
 * The returned keyboard commands are registered and later deregistered by
 * the editor.
 */
/**
 * The model/library subscriptions previously set up inline in
 * NodeGraphEditor.render() (PLAT-001 wave 3 — bodies moved verbatim). Same
 * listener-context rule as above: every subscription binds with the editor as
 * context so dispose's `off(this)` calls detach them.
 */
export function registerRenderEventBindings(editor: NodeGraphEditor): void {
  //bind ai assistant
  AiAssistantModel.instance.on(
    AiAssistantEvent.ProcessingUpdated,
    () => {
      AiAssistantModel.instance.getProcessingNodeIds().length
        ? editor.startNodeAnimations()
        : editor.stopNodeAnimations();
    },
    editor
  );

  // Rerender if warnings model changed
  WarningsModel.instance.on(
    'warningsChanged',
    () => {
      editor.repaint();
    },
    editor
  );

  // When the node library is changed we may need to rerender
  NodeLibrary.instance.on(
    ['moduleRegistered', 'moduleUnregistered', 'typeAdded', 'typeRemoved', 'libraryUpdated'],
    () => {
      // We must re-resolve ports as they could have changed
      _.each(editor.connections, function (c) {
        c.resolvePorts();
      });

      // Relayout and paint
      editor.relayout();
      editor.repaint();
    },
    editor
  );

  // May change warning status
  EventDispatcher.instance.on(
    ['Model.portAdded', 'Model.portRemoved'],
    () => {
      editor.relayout();
      editor.repaint();
    },
    editor
  );

  // The module for the graph we are editing has been unregistered
  NodeLibrary.instance.on(
    'moduleUnregistered',
    (args) => {
      if (editor.model && args.model === editor.model.owner.owner) {
        editor.switchToComponent();
      }
    },
    editor
  );

  // The component we are editing has been removed
  NodeLibrary.instance.on(
    'typeRemoved',
    (args) => {
      // REL-009b: a reload from disk removes the old model and adds a new one
      // under the same name. Letting go of the canvas here would blank it
      // mid-swap — and, worse, would leave `activeComponent` undefined, so the
      // hook that puts the new model back cannot tell it was ever showing.
      // `useFollowComponentReloadedFromDisk` does the re-point.
      if (args.reloadingFromDisk) return;

      if (editor.model && args.model === editor.model.owner) {
        editor.switchToComponent();
      }
    },
    editor
  );
}

export function registerEditorEventBindings(editor: NodeGraphEditor): KeyboardCommand[] {
  EventDispatcher.instance.on(
    ['DebugInspectorConnectionPulseChanged'],
    () => {
      editor.repaint();
    },
    editor
  );

  EventDispatcher.instance.on(
    'ProjectModel.instanceHasChanged',
    (args) => {
      args.oldInstance && args.oldInstance.off(editor);
      if (ProjectModel.instance === undefined) return;

      editor.bindProjectModel();
      editor.navigationHistory.discardInvalidEntries();
    },
    editor
  );

  // Listen for component switch requests from ComponentsPanel
  EventDispatcher.instance.on(
    'ComponentPanel.SwitchToComponent',
    (args: { component: ComponentModel; pushHistory?: boolean }) => {
      if (args.component) {
        editor.switchToComponent(args.component, {
          pushHistory: args.pushHistory
        });
      }
    },
    editor
  );

  // LGC-010: the first Logic Builder tab opens a floating window over the document. It used to
  // hide the canvas (a takeover), and then to take half of it (a splitter); it now takes neither.
  EventDispatcher.instance.on(
    'LogicBuilder.TabOpened',
    () => {
      console.log('[NodeGraphEditor] Logic Builder tab opened - opening the block editor window');
      editor.setLogicOverlayOpen(true);
    },
    editor
  );

  // ...and the last one closing puts it away.
  EventDispatcher.instance.on(
    'LogicBuilder.AllTabsClosed',
    () => {
      console.log('[NodeGraphEditor] All Logic Builder tabs closed - closing the block editor window');
      // Track close time to prevent accidental node deletions during focus transition
      editor.lastBlocklyTabCloseTime = Date.now();
      editor.setLogicOverlayOpen(false);
    },
    editor
  );

  /**
   * 🔴 VFN-005 / VFN-012 — the window gets out of the way of a side panel it just opened.
   *
   * The App Config toolbox flyout has a button labelled *Open app settings*. It works, and the
   * panel it opens renders **behind** the Logic Builder window it was pressed from: a feature's
   * own call to action landing exactly where the feature is hiding. `BlocklyWorkspace` emits this
   * immediately after `openSettingsPanel`, and the decision is made here because it needs the
   * node graph frame's box and the viewport, neither of which the window can see.
   *
   * ⚠️ Synchronous, on the click's own tick. The panel has *not* been laid out when this runs,
   * which is why `sidePanelRegion` carries a floor rather than measuring the panel — an occluded
   * renderer clamps timers ~1000×, so waiting a tick for the layout is not an option that
   * survives contact with the place this is used.
   */
  EventDispatcher.instance.on(
    'LogicBuilder.SidePanelOpened',
    () => {
      const outcome = yieldLogicOverlayToSidePanel(editor);
      // Nowhere to move to on this viewport. Collapsing the window to its title bar always works
      // and is one click to undo.
      if (outcome === 'park') EventDispatcher.instance.emit(LOGIC_BUILDER_PARK_EVENT);
    },
    editor
  );

  // Listen for Logic Builder tab open requests (for opening tabs from property panel)
  EventDispatcher.instance.on(
    'LogicBuilder.OpenTab',
    (args: { nodeId: string; nodeName: string; workspace: string }) => {
      console.log('[NodeGraphEditor] Opening Logic Builder tab for node:', args.nodeId);
      // The CanvasTabs context will handle the actual tab opening
    },
    editor
  );

  /*
   * P101 INS-001 — opening a left-hand panel no longer clears the canvas selection.
   *
   * It used to, for every panel outside an allow-list (`panelHoldsCanvasSelection`: the two node
   * panels and, after FH-008, Explain), so that a highlight never outlived the panel explaining
   * it. That rule was about the ONE slot: the node's panel and the rail's panels took turns in it,
   * so opening Styles hid the properties and the leftover highlight explained nothing. The node's
   * panel has its own column now and is on screen whatever the left shows — left in, this rule
   * would blank the inspector every time someone opened Styles to work beside it, which is the
   * exact thing Richard asked to be able to do (P101 RI-2).
   */

  return [
    {
      handler: () => editor.setSpaceKeyDown(true),
      keybinding: KeyCode.Space,
      type: 'down'
    },
    {
      handler: () => editor.setSpaceKeyDown(false),
      keybinding: KeyCode.Space,
      type: 'up'
    },
    {
      handler: () => {
        for (const node of editor.selector.nodes) {
          editor.nudgeNode(node, node.x + SnapSpacing, node.y);
        }
      },
      keybinding: KeyCode.RightArrow,
      type: 'down'
    },
    {
      handler: () => {
        for (const node of editor.selector.nodes) {
          editor.nudgeNode(node, node.x - SnapSpacing, node.y);
        }
      },
      keybinding: KeyCode.LeftArrow,
      type: 'down'
    },
    {
      handler: () => {
        for (const node of editor.selector.nodes) {
          editor.nudgeNode(node, node.x, node.y - SnapSpacing);
        }
      },
      keybinding: KeyCode.UpArrow,
      type: 'down'
    },
    {
      handler: () => {
        for (const node of editor.selector.nodes) {
          editor.nudgeNode(node, node.x, node.y + SnapSpacing);
        }
      },
      keybinding: KeyCode.DownArrow,
      type: 'down'
    }
  ];
}
