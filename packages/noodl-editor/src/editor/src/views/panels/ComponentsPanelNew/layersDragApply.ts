/**
 * TVW-005 — carrying out what {@link layersDrag} decided.
 *
 * Everything that needs judgement happened in `layersDrag.ts`, which a spec can reach. This module
 * is the half that cannot be reached from jest — `NodeGraphNode` imports `projectmodel`, which
 * imports `bugtracker`, which calls `platform.getUserDataPath()` at module scope, so a spec that
 * imports it does not fail, it **fails to run** ([[tests-0-total-can-mean-the-wrong-directory]]).
 * So it is kept as thin as it can be: resolve three ids, do the two model calls in the one order
 * that works, and record one undo step. What grades it is the drive.
 *
 * ## The three things that are not obvious
 *
 * 🔴 **`detachNode` first, and compute the index AFTER it.** `NodeGraphModel.attachNode` begins
 * `const idx = this.roots.indexOf(child)` and **silently does nothing** when the child is not a
 * root, so a node has to be detached before it can be attached anywhere. And detaching removes it
 * from its old parent's `children[]` — so for a move *within one parent* every index past it has
 * already shifted by the time the attach happens. Resolving the anchor after the detach makes the
 * two cases one case.
 *
 * 🔴 **The undo group is ours, and it is not the canvas's.** `NodeOperations.attachNode/detachNode`
 * read `editor.interaction.dragNodesUndoGroup`, which exists only inside a canvas drag; outside
 * one, `args.undo` is falsy and **the model records nothing at all**. A Layers drag that went
 * through those would move the node and leave nothing to undo. So the model's own
 * `attachNode`/`detachNode` are called with an explicit group.
 *
 * ⚠️ **The group is built empty and filled by the calls that already happened** — `new
 * UndoActionGroup({ label })` then `group.push({ do, undo })`, which is what the model does with
 * the group we hand it. A group *constructed* with `do`/`undo` leaves its pointer at 0 and cannot
 * be undone at all (`undo-queue-model.ts:85`).
 *
 * @module noodl-editor/views/panels/ComponentsPanelNew/layersDragApply
 */

import { NodeGraphNodeSet } from '@noodl-models/nodegraphmodel/NodeGraphNodeSet';
import { UndoActionGroup, UndoQueue } from '@noodl-models/undo-queue-model';

import type { ComponentModel } from '@noodl-models/componentmodel';
import type { NodeGraphNode } from '@noodl-models/nodegraphmodel';
import type { ProjectModel } from '@noodl-models/projectmodel';
import type { NodeGraphEditor } from '../../nodegrapheditor';
import type { DragPlan, MovePlan, PlacePlan } from './layersDrag';

export interface ApplyContext {
  project: ProjectModel;
  /**
   * The canvas. Only a **place** needs it: §2 asks for the same create path a canvas drop takes,
   * so the new node is minted by `NodeGraphEditor.createNewNode` and by nothing else.
   */
  editor?: NodeGraphEditor;
  /**
   * Put the selection back where it was. Pushed into the group **first**, so on an undo — which
   * replays the group backwards — it runs **last**, after the move has been reversed (AC3).
   */
  restoreSelection?: () => void;
}

export interface ApplyResult {
  applied: boolean;
  /** The node that ended up moved or created, for the caller to select. */
  nodeId?: string;
  /** Why nothing happened, when nothing happened. Never shown to a person; refusals carry that. */
  because?: string;
}

/** Where the anchor sits in the parent's real `children[]`, once the node is out of the way. */
function indexFor(parent: NodeGraphNode, plan: MovePlan | PlacePlan): number {
  if (plan.side === 'end' || !plan.anchor) return parent.children.length;
  const at = parent.children.findIndex((child: NodeGraphNode) => child.id === plan.anchor);
  // An anchor that is not among the children is a tree and a graph that disagree. Appending is the
  // one outcome that cannot put the node somewhere a person did not point at.
  if (at === -1) return parent.children.length;
  return plan.side === 'after' ? at + 1 : at;
}

function graphOf(project: ProjectModel, componentName: string) {
  const component = project.getComponentWithName(componentName) as ComponentModel | undefined;
  return component ? component.graph : undefined;
}

export function applyDragPlan(plan: DragPlan, context: ApplyContext): ApplyResult {
  if (plan.kind === 'refuse') return { applied: false, because: plan.reason };
  return plan.kind === 'move' ? applyMove(plan, context) : applyPlace(plan, context);
}

function applyMove(plan: MovePlan, context: ApplyContext): ApplyResult {
  const graph = graphOf(context.project, plan.node.owner);
  if (!graph) return { applied: false, because: 'no such component' };

  const node = graph.findNodeWithId(plan.node.id);
  const parent = graph.findNodeWithId(plan.parentId);
  if (!node || !parent) return { applied: false, because: 'the tree and the graph disagree' };

  const group = new UndoActionGroup({ label: plan.copy ? 'Copy in Layers' : 'Move in Layers' });
  if (context.restoreSelection) {
    const restore = context.restoreSelection;
    group.push({ do: restore, undo: restore });
  }

  if (plan.copy) {
    // ⌥-drag. `NodeGraphNodeSet.clone()` is the canvas's own copy: it re-ids the whole subtree and
    // remaps the connections between the nodes being copied, which hand-rolling `fromJSON(toJSON())`
    // famously does not (SIG-007 R2, in its own comment).
    const set = new NodeGraphNodeSet({ nodes: [node], connections: [] });
    const clone = set.clone();
    const copy = clone.nodes[0] as NodeGraphNode;
    graph.attachNode(parent, copy, indexFor(parent, plan), { undo: group, label: 'copy' });
    UndoQueue.instance.push(group);
    return { applied: true, nodeId: copy.id };
  }

  graph.detachNode(node, { undo: group, label: 'move' });
  graph.attachNode(parent, node, indexFor(parent, plan), { undo: group, label: 'move' });
  UndoQueue.instance.push(group);
  return { applied: true, nodeId: node.id };
}

function applyPlace(plan: PlacePlan, context: ApplyContext): ApplyResult {
  const { editor } = context;
  if (!editor) return { applied: false, because: 'no canvas to create through' };

  const graph = graphOf(context.project, plan.owner);
  if (!graph) return { applied: false, because: 'no such component' };
  const parent = graph.findNodeWithId(plan.parentId);
  if (!parent) return { applied: false, because: 'the tree and the graph disagree' };

  const type = context.project.getComponentWithName(plan.component) as ComponentModel | undefined;
  if (!type) return { applied: false, because: 'no such component' };

  // 🔴 The SAME door a canvas drop uses (AC4), given a parent and an index instead of a point.
  // Writing a second create here is how two ways of making a node end up with two sets of
  // defaults — which is the trap `ElementConfigRegistry.applyDefaults` was added to close.
  //
  // The position is the parent's: a child is laid out by the canvas, so x/y only decide where it
  // would sit if it were ever detached, and the parent's corner is the least surprising answer.
  const node = editor.createNewNode(type, { x: parent.x, y: parent.y }, {}, { parent, index: indexFor(parent, plan) });
  // The id is what the tab-header drop selects with: the row for a node that did not exist a
  // moment ago is not in the rows this drag was planned against, so the caller composes its path
  // from the parent's rather than looking it up in a list that is one rebuild behind.
  return { applied: true, nodeId: node?.id };
}
