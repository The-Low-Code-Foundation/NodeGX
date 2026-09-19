import React from 'react';

import { InstanceHoverCard, INSTANCE_HOVER_CARD_HEIGHT } from '../CanvasOverlays/InstanceHoverCard';
import { instanceCountOf } from './canvas/instanceCounts';
import {
  hoverCardAnchor,
  hoverCardContent,
  hoverCardIsVisible,
  hoverGraceIsPending,
  hoverStatesEqual,
  initialHoverState,
  InstanceHover,
  nextHoverState,
  nodeScreenRect,
  type InstanceHoverEvent,
  type InstanceHoverState
} from './canvas/instanceHover';

import type { NodeGraphEditor } from '../nodegrapheditor';
import type { NodeGraphEditorNode } from './NodeGraphEditorNode';

/**
 * TVW-007 AC2b — the glue between the canvas's mouse events and the hover card.
 *
 * Everything that can be decided without a renderer lives in `canvas/instanceHover.ts`; this
 * class is the three things that cannot be: the editor's `timeout`, the editor's slot, and the
 * editor's coordinates. It holds **no rules** — every state change goes through `nextHoverState`
 * and every position through `hoverCardAnchor`, so what a spec grades is what the canvas does.
 *
 * 🔴 The grace timer is the one piece of behaviour with no other home. The pointer must cross a
 * gap of canvas to reach the door, and the node's `move-out` fires while it is crossing; the
 * window is what keeps the card alive for that journey ([[correct-and-usable-were-never-the-same-criterion]]).
 */
export class InstanceHoverController {
  private state: InstanceHoverState = initialHoverState;
  private graceTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(private editor: NodeGraphEditor) {}

  /** A `move` or `move-in` on a node. Non-instances dismiss, so the card never outlives its subject. */
  onNodeHover(node: NodeGraphEditorNode) {
    if (!node.isComponent()) {
      // A pointer that has arrived on a plain node is a pointer that has left the instance —
      // and its `move-out` may not have been delivered yet, so this is not redundant.
      if (this.state.subject && this.state.subject.nodeId !== node.model.id) this.dispatch({ kind: 'dismiss' });
      return;
    }

    const fullName = node.model.type?.fullName;
    if (!fullName) return;

    this.dispatch({
      kind: 'node-enter',
      subject: {
        nodeId: node.model.id,
        fullName,
        // AC2: TVW-001's walk, through the painter's cache — one call, not one rule twice.
        count: instanceCountOf(node.model.typename)
      }
    });
  }

  onNodeLeave(node: NodeGraphEditorNode) {
    this.dispatch({ kind: 'node-leave', nodeId: node.model.id });
  }

  /** A drag, a pan, a zoom, a navigation, a closed project — the anchor is no longer where it was. */
  dismiss() {
    if (!this.state.subject) return;
    this.dispatch({ kind: 'dismiss' });
  }

  dispose() {
    this.clearGrace();
    this.state = initialHoverState;
    this.editor.overlays.unmountSlot('instance-hover');
  }

  private dispatch(event: InstanceHoverEvent) {
    const next = nextHoverState(this.state, event);
    // By value: `node-enter` arrives on every mouse move over the node with a freshly built
    // subject, so identity would never match and the card would re-render sixty times a second.
    if (hoverStatesEqual(next, this.state)) return;

    this.state = next;

    this.clearGrace();
    if (hoverGraceIsPending(this.state)) {
      this.graceTimer = setTimeout(() => {
        this.graceTimer = undefined;
        this.dispatch({ kind: 'grace-elapsed' });
      }, InstanceHover.graceMs);
    }

    this.render();
  }

  private clearGrace() {
    if (this.graceTimer !== undefined) {
      clearTimeout(this.graceTimer);
      this.graceTimer = undefined;
    }
  }

  private render() {
    const editor = this.editor;
    const root = editor.shell?.instanceHoverRoot;
    if (!root) return;

    const subject = this.state.subject;
    if (!subject || !hoverCardIsVisible(this.state)) {
      if (editor.overlays.hasSlot('instance-hover')) editor.overlays.renderSlot('instance-hover', root, null);
      return;
    }

    // The same finder the viewport-tracking overlays anchor through (`OverlayViews.getNodeBounds`).
    const node = editor.findNodeWithId(subject.nodeId);
    if (!node) {
      // The node went away under the pointer (deleted, or the canvas switched component). There
      // is nothing to anchor to, so the card goes with it rather than hanging in the air.
      this.dismiss();
      return;
    }

    const content = hoverCardContent({
      isComponentInstance: node.isComponent(),
      fullName: subject.fullName,
      count: subject.count
    });
    if (!content) return;

    const anchor = hoverCardAnchor({
      node: nodeScreenRect(
        { x: node.global.x, y: node.global.y, width: node.nodeSize.width, height: node.nodeSize.height },
        editor.getPanAndScale()
      ),
      pane: { width: editor.currentLayout?.width ?? 0, height: editor.currentLayout?.height ?? 0 },
      cardHeight: INSTANCE_HOVER_CARD_HEIGHT
    });

    editor.overlays.renderSlot(
      'instance-hover',
      root,
      React.createElement(InstanceHoverCard, {
        path: content.path,
        count: content.count,
        anchor,
        onEdit: () => {
          this.dismiss();
          // The same call as the double-click (`SelectionActions`) and the context menu's *Open
          // component* — `viaInstance` included, or this door would be the one that produced a
          // folder-path trail where the other two produce the containment one.
          editor.switchToComponent(node.model.type, { pushHistory: true, viaInstance: true });
        },
        onPointerEnter: () => this.dispatch({ kind: 'card-enter' }),
        onPointerLeave: () => this.dispatch({ kind: 'card-leave' })
      })
    );
  }
}
