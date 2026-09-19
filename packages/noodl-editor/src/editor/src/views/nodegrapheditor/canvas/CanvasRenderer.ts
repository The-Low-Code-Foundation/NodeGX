import _ from 'underscore';

import type { NodeGraphEditorConnection } from '../NodeGraphEditorConnection';
import { NodeGraphEditorNode } from '../NodeGraphEditorNode';
import { CanvasFonts, CanvasTheme } from './CanvasTheme';
import {
  dashPattern,
  eyebrowIsVisible,
  hairlineWidth,
  connectionAlpha,
  isLogicOnly,
  lanesForFrame,
  rootAlpha,
  StructureLane,
  type LaneFilter,
  type LaneRect,
  type LaneRoot
} from './structureLane';
import { AABB, IVector2, PanAndScale } from './types';

/**
 * Everything the canvas paints in one frame (PLAT-001 extraction).
 *
 * The editor assembles this snapshot in `paint()` and hands it over; the
 * renderer has no back-reference to the editor. Node and connection views
 * keep their own `paint()` methods — this module owns frame orchestration
 * (ordering, culling rect, drag ghosting) and the editor-level decorations
 * (hierarchy lines, insert indicator, connection-drag line, multiselect box).
 */
export type FrameState = {
  panAndScale: PanAndScale;
  /** Device pixels + ratio, used to derive the culling rect. */
  canvasWidth: number;
  canvasHeight: number;
  ratio: number;

  roots: readonly NodeGraphEditorNode[];
  connections: readonly NodeGraphEditorConnection[];

  /**
   * TVW-006 — one entry per root, carrying the model's verdict on whether it draws. Assembled by
   * `CanvasPainter` because `isVisualRoot` lives on the model and the renderer has no
   * back-reference to the editor. Absent (older callers, tests) means no lanes and no filter.
   */
  laneRoots?: readonly LaneRoot[];
  /** Per canvas, not persisted. `all` unless someone pressed something. */
  laneFilter?: LaneFilter;

  /** Nodes being dragged are painted last, semi-transparent. */
  draggingNodes?: readonly NodeGraphEditorNode[];

  draggingConnection?: {
    fromNode: TSFixme;
    toNode?: TSFixme;
    mouseTarget?: { global: IVector2 };
  };

  insertLocation?: { pos: IVector2 };

  /** AABB around a multi-selection, when one should be drawn. */
  multiselectAABB?: AABB;

  /** Rect-select drag in progress. */
  multiselectMouseDown?: IVector2;
  multiselectMouseMove?: IVector2;
};

/**
 * TVW-006 — the ids of the roots that have a lane.
 *
 * A lane covers a root's WHOLE subtree, so membership is a fact about the root and the set holds
 * root ids only. {@link rootOf} is what turns a wire's endpoint — which is usually a child, deep
 * in a stack — back into the root the set can answer for.
 */
function laneMembership(frame: FrameState): Set<string> {
  const ids = new Set<string>();
  for (const root of frame.laneRoots || []) {
    if (root.isVisual) ids.add(root.id);
  }
  return ids;
}

/**
 * The id of the root a node belongs to.
 *
 * ⚠️ A wire's endpoint is an editor node at any depth. Testing the ENDPOINT's own id against the
 * lane set would say "not in a lane" for every wire that lands on a child — which is most of them,
 * since a wire into a stack lands on something inside it, not on the Page node at its root.
 */
function rootOf(node: TSFixme): string {
  let current = node;
  while (current && current.parent) current = current.parent;
  return current ? current.id : undefined;
}

export class CanvasRenderer {
  /**
   * Paint one frame. The context is expected to be cleared already; the
   * editor keeps ownership of clearing and of syncing DOM-layer transforms.
   */
  paint(ctx: CanvasRenderingContext2D, frame: FrameState) {
    const panAndScale = frame.panAndScale;
    const scale = panAndScale.scale;

    ctx.save();
    ctx.scale(frame.ratio * scale, frame.ratio * scale);
    ctx.translate(panAndScale.x, panAndScale.y);

    const paintRect = {
      minX: -panAndScale.x,
      maxX: frame.canvasWidth / (frame.ratio * scale) - panAndScale.x,
      minY: -panAndScale.y,
      maxY: frame.canvasHeight / (frame.ratio * scale) - panAndScale.y
    };

    // Ground dot grid (UIX-005): a repeating pattern filled in graph space so
    // it pans and zooms with the content — one fillRect, never per-dot draws.
    // Skipped at low zoom where the dots collapse into sub-pixel noise.
    if (scale >= 0.4) {
      const gridPattern = CanvasTheme.instance.gridPattern(ctx);
      if (gridPattern) {
        ctx.fillStyle = gridPattern;
        ctx.fillRect(paintRect.minX, paintRect.minY, paintRect.maxX - paintRect.minX, paintRect.maxY - paintRect.minY);
      }
    }

    ctx.font = '10px Helvetica';

    // TVW-006: the structure lane sits UNDER everything the graph draws — the hierarchy spine and
    // the wires cross over it, because it is a region the nodes are in, not a thing between them.
    if (frame.laneRoots && frame.laneRoots.length) {
      this.paintStructureLanes(ctx, frame.laneRoots, paintRect, scale);
    }

    // Paint hierarchy
    _.each(frame.roots, (root) => this.paintHierarchy(ctx, root));

    // TVW-006 — the lane filter DIMS, never hides (R-F). Every node and wire below is still
    // painted, so it is still hit-tested, draggable and connectable; only its alpha moves.
    const dimming = !!frame.laneFilter && frame.laneFilter !== 'all';
    const inLane = dimming ? laneMembership(frame) : undefined;

    // Paint connections
    _.each(frame.connections, function (con) {
      if (inLane)
        ctx.globalAlpha = connectionAlpha(
          inLane.has(rootOf(con.fromNode)),
          inLane.has(rootOf(con.toNode)),
          frame.laneFilter
        );
      con.paint(ctx, paintRect);
    });
    if (inLane) ctx.globalAlpha = 1;

    // Paint all highlighted connections (so they always show up on top)
    _.each(frame.connections, function (con) {
      if (con.isHighlighted()) con.paint(ctx, paintRect);
    });

    // Paint nodes
    _.each(frame.roots, function (node) {
      if (!frame.draggingNodes || frame.draggingNodes.indexOf(node) === -1) {
        // 🔴 R-W: the alpha is decided per ROOT, off the MODEL's verdict. A logic node that
        // happens to sit inside a lane's rectangle — 838 of them in the corpus — stays bright,
        // because `Logic` means "show me the logic" and where someone parked it is not what it is.
        if (inLane) ctx.globalAlpha = rootAlpha(inLane.has(node.id), frame.laneFilter);
        node.paint(ctx, paintRect);
      }
    });
    if (inLane) ctx.globalAlpha = 1;

    if (frame.insertLocation) {
      // Indicate that we have an insert location when
      // dragging this node
      ctx.fillStyle = CanvasTheme.instance.colors.insertIndicator;
      ctx.fillRect(
        frame.insertLocation.pos.x,
        frame.insertLocation.pos.y + (NodeGraphEditorNode.childSpacing - 5) / 2,
        NodeGraphEditorNode.size.width,
        5
      );
    }

    // Paint multiselect box
    if (frame.multiselectAABB) {
      this.paintMultiselectBox(ctx, frame.multiselectAABB);
    }

    ctx.globalAlpha = 0.5;

    // Paint nodes that are being dragged
    _.each(frame.draggingNodes, function (node) {
      node.paint(ctx, paintRect);
    });

    ctx.globalAlpha = 1;

    // Paint the new connection indicator if we have one
    if (frame.draggingConnection) {
      this.paintDraggingConnection(ctx, frame, paintRect);
    }

    // Paint multiselect
    if (frame.multiselectMouseMove) {
      ctx.strokeStyle = CanvasTheme.instance.colors.multiselect;
      ctx.setLineDash([5]);
      ctx.beginPath();
      ctx.rect(
        frame.multiselectMouseDown.x,
        frame.multiselectMouseDown.y,
        frame.multiselectMouseMove.x - frame.multiselectMouseDown.x,
        frame.multiselectMouseMove.y - frame.multiselectMouseDown.y
      );
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }

  /**
   * TVW-006 — the region around each visual stack, drawn *wherever the stack is* (R-J).
   *
   * One rounded dashed rectangle per visual root, a 4% wash of the visual category colour inside
   * it, and a `STRUCTURE` eyebrow in the 22px the lane adds above the stack. A component with no
   * visual root at all gets the logic-only eyebrow instead, once, at the top-left of the viewport.
   *
   * 🔴 **R-X: lanes that overlap are left overlapping.** 221 pairs in the corpus do. Merging them
   * would draw one box claiming the space between two stacks — and any logic node parked in that
   * gap — as structure.
   */
  private paintStructureLanes(
    ctx: CanvasRenderingContext2D,
    laneRoots: readonly LaneRoot[],
    paintRect: { minX: number; maxX: number; minY: number; maxY: number },
    scale: number
  ) {
    const colors = CanvasTheme.instance.colors;

    if (isLogicOnly(laneRoots)) {
      this.paintLaneEyebrow(ctx, StructureLane.logicOnlyLabel, paintRect.minX + 16, paintRect.minY + 16, scale);
      return;
    }

    const lanes = lanesForFrame(laneRoots, paintRect);
    if (!lanes.length) return;

    const width = hairlineWidth(scale);

    ctx.save();
    for (const lane of lanes) {
      // The wash first, then the stroke on top of it.
      ctx.globalAlpha = StructureLane.washAlpha;
      ctx.fillStyle = colors.categoryVisual;
      this.laneOutline(ctx, lane);
      ctx.fill();

      ctx.globalAlpha = 1;
      ctx.strokeStyle = colors.hierarchyLine;
      ctx.lineWidth = width;
      ctx.setLineDash(dashPattern(scale));
      this.laneOutline(ctx, lane);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();

    for (const lane of lanes) {
      this.paintLaneEyebrow(
        ctx,
        StructureLane.eyebrowLabel,
        lane.x + StructureLane.padding,
        lane.y + StructureLane.eyebrowHeight / 2,
        scale
      );
    }
  }

  /** The lane's rounded path. Kept separate so the wash and the stroke can never trace different
   *  rectangles — the failure that makes a 1px offset look like a rendering bug. */
  private laneOutline(ctx: CanvasRenderingContext2D, lane: LaneRect) {
    // The radius is in graph units and would balloon at low zoom relative to the hairline, so it
    // is clamped to half the shorter side the way a CSS radius is.
    const radius = Math.min(StructureLane.cornerRadius, lane.width / 2, lane.height / 2);
    ctx.beginPath();
    if (typeof (ctx as TSFixme).roundRect === 'function') {
      (ctx as TSFixme).roundRect(lane.x, lane.y, lane.width, lane.height, radius);
    } else {
      ctx.rect(lane.x, lane.y, lane.width, lane.height);
    }
  }

  /** §3: the eyebrow hides below 50% zoom, where its text is unreadable anyway. The lane keeps
   *  drawing — the region is still the point. */
  private paintLaneEyebrow(ctx: CanvasRenderingContext2D, label: string, x: number, y: number, scale: number) {
    if (!eyebrowIsVisible(scale)) return;

    ctx.save();
    ctx.font = CanvasFonts.portLabel;
    ctx.fillStyle = CanvasTheme.instance.colors.cardSubText;
    ctx.globalAlpha = 0.75;
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x, y);
    ctx.restore();
  }

  private paintHierarchy(ctx: CanvasRenderingContext2D, node: TSFixme) {
    const x = node.global.x;
    const y = node.global.y;

    // Draw hierarchy indicators
    let hy = y + node.nodeSize.height + 5;
    ctx.strokeStyle = CanvasTheme.instance.colors.hierarchyLine;
    ctx.lineWidth = 1;
    for (const i in node.children) {
      const child = node.children[i];

      ctx.beginPath();
      ctx.moveTo(x + NodeGraphEditorNode.childMargin / 2, hy);

      hy = child.global.y + child.nodeSize.height / 2;
      ctx.lineTo(x + NodeGraphEditorNode.childMargin / 2, hy);

      ctx.lineTo(x + NodeGraphEditorNode.childMargin - 5, hy);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    _.each(node.children, (child) => this.paintHierarchy(ctx, child));
  }

  private paintDraggingConnection(
    ctx: CanvasRenderingContext2D,
    frame: FrameState,
    paintRect: { minX: number; maxX: number; minY: number; maxY: number }
  ) {
    const draggingConnection = frame.draggingConnection;

    // Make background darker
    if (draggingConnection.fromNode !== undefined && draggingConnection.toNode !== undefined) {
      ctx.fillStyle = CanvasTheme.instance.colors.scrim;
      ctx.globalAlpha = 0.6;
      ctx.fillRect(paintRect.minX, paintRect.minY, paintRect.maxX - paintRect.minX, paintRect.maxY - paintRect.minY);
      ctx.globalAlpha = 1;

      // First the two nodes where a connection is being made
      _.each([draggingConnection.fromNode, draggingConnection.toNode], function (node) {
        node.paint(ctx, paintRect, { dontPaintChildren: true });
      });

      // Draw all connections between these nodes
      _.each(frame.connections, (con) => {
        if (con.fromNode === draggingConnection.fromNode && con.toNode === draggingConnection.toNode)
          con.paint(ctx, paintRect);
      });
    }

    ctx.globalAlpha = 1;

    // Draw line between from node and mouse position, if a target node is hovered
    // draw to the center of the target node
    ctx.strokeStyle = CanvasTheme.instance.colors.dragLine;
    ctx.setLineDash([5]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    const from = {
      x: draggingConnection.fromNode.global.x + draggingConnection.fromNode.nodeSize.width,
      y: draggingConnection.fromNode.global.y + draggingConnection.fromNode.titlebarHeight() / 2
    };
    let to: IVector2;
    if (draggingConnection.toNode) {
      to = {
        x: draggingConnection.toNode.global.x + draggingConnection.toNode.nodeSize.width / 2,
        y: draggingConnection.toNode.global.y + draggingConnection.toNode.nodeSize.height / 2
      };
    } else {
      to = draggingConnection.mouseTarget.global;
    }

    const d = { x: to.x - from.x, y: to.y - from.y };
    const dl = Math.sqrt(d.x * d.x + d.y * d.y);
    d.x /= dl;
    d.y /= dl;
    const n = { x: d.y, y: -d.x };

    ctx.moveTo(from.x + d.x * 4, from.y + d.y * 4); // Don't draw over source circle, looks weird when alpha is down
    ctx.lineTo(to.x - d.x * 6, to.y - d.y * 6);
    ctx.stroke();

    // Draw the circle at the source node and the arrow head
    // at the target node
    ctx.beginPath();
    ctx.fillStyle = CanvasTheme.instance.colors.dragLine;
    ctx.arc(from.x, from.y, 4, 0, 2 * Math.PI, false);

    ctx.moveTo(to.x + d.x * 2, to.y + d.y * 2);
    ctx.lineTo(to.x - d.x * 6 - n.x * 4, to.y - d.y * 6 - n.y * 4);
    ctx.lineTo(to.x - d.x * 6 + n.x * 4, to.y - d.y * 6 + n.y * 4);
    ctx.fill();

    ctx.globalAlpha = 1;
  }

  paintMultiselectBox(ctx: CanvasRenderingContext2D, aabb: AABB) {
    const pad = 8;

    const shadowSize = 150;

    //draw a shadow
    //mask away everything inside the selection bounding box...
    const w = aabb.maxX - aabb.minX;
    const h = aabb.maxY - aabb.minY;
    ctx.save();
    ctx.beginPath();
    ctx.rect(aabb.minX - shadowSize, aabb.minY - shadowSize, 2 * shadowSize + w, shadowSize - pad);
    ctx.rect(aabb.minX - shadowSize, aabb.minY - pad, shadowSize - pad, h + 2 * pad + 2 * shadowSize);
    ctx.rect(aabb.maxX + pad, aabb.minY - pad, shadowSize, h + 2 * pad);
    ctx.rect(aabb.minX - shadowSize, aabb.maxY + pad, 2 * shadowSize + w, shadowSize);
    ctx.clip();

    //...and draw a shadow
    ctx.shadowColor = 'black';
    ctx.shadowBlur = shadowSize;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    ctx.fillStyle = 'white'; //the color doesn't matter, just need full opacity. The rect is clipped and just the shadow remains
    ctx.beginPath();
    ctx.fillRect(aabb.minX - pad, aabb.minY - pad, w + 2 * pad, h + 2 * pad);

    //draw selection box
    ctx.lineWidth = 1;
    ctx.strokeStyle = CanvasTheme.instance.colors.multiselectBox;
    ctx.strokeRect(aabb.minX - pad, aabb.minY - pad, w + 2 * pad, h + 2 * pad);

    ctx.restore();
  }
}
