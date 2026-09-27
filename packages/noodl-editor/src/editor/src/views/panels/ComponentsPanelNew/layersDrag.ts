/**
 * TVW-005 — what a drag in Layers means, decided before anything is moved.
 *
 * Layers stops being a picture of the page and becomes a place to edit it. Every gesture in §2's
 * table ends in one of three outcomes — **move**, **place** or **refuse, with a sentence** — and
 * this module is where that is decided. It touches no model: it takes the rows the tree already
 * built and returns a plan, so `tests-unit/tvw-005` can drive all eight rows of that table without
 * an editor, and the applier is left with nothing to decide.
 *
 * ## The two rules that do most of the work
 *
 * 🔴 **You can move a row only while the canvas is editing the component that owns it.** That is
 * Figma's rule, and TVW-004 already draws it: the tinted region is exactly the rows whose owner is
 * the canvas's component (AC3), and a band introduces every subtree that belongs to something else.
 * Dragging a row inside a band would edit a component the canvas is not showing — the thing this
 * phase exists to stop. Hence the refusal that names the way out: *"This is part of Hero — edit
 * Hero to change it."*
 *
 * ⚠️ The decision reads `canvasComponent` explicitly rather than `LayerRow.tinted`. `tinted` is a
 * *display* property that happens to be computed the same way today; a structural decision that
 * reads it would silently follow the tint the day the tint changes
 * ([[a-client-property-read-as-a-fact-about-the-source]]).
 *
 * 🔴 **A plan names an ANCHOR, never an index.** The tree draws visual nodes only, so the position
 * of a row among its siblings in the tree is not its index in the graph's `children[]` — a `States`
 * or a `Function` parked under a Group is a child the tree never draws. So a move says *before this
 * node* or *after this node* and the applier resolves it with `children.indexOf(anchor)`. An
 * integer computed here would be right on the fixtures and wrong on the first component that keeps
 * a logic node under a visual one.
 *
 * @module noodl-editor/views/panels/ComponentsPanelNew/layersDrag
 */

import type { LayerRow } from './layersTree';

/** Where the pointer is, relative to the row under it. */
export type DropSide = 'before' | 'after' | 'inside';

export interface DropTarget {
  /** {@link LayerRow.key} of the row under the pointer. */
  key: string;
  side: DropSide;
}

/**
 * Why a gesture was refused. The sentence is what a person reads; this is what a spec asserts, so
 * that changing the wording does not silently change which rule fired.
 */
export type RefusalReason =
  /** The row is not a node — a band, a cycle marker or one of the two notes. Nothing to drag. */
  | 'not-a-node'
  /** The row belongs to another component: it is inside a band. */
  | 'band'
  /** A node cannot be dropped into itself or into its own subtree. */
  | 'into-itself'
  /** The parent refuses this child — the canvas's own legality rule answered. */
  | 'illegal'
  /** A page is a Router's child, never a node on a screen. */
  | 'page'
  /** A component with no visual root has nothing to draw on a screen. */
  | 'no-screen'
  /**
   * The *canvas's* component has no screen to put it on — the other end of `no-screen`, and a
   * separate code because a spec that could not tell them apart would read a refusal about the
   * destination as one about the thing being dragged.
   */
  | 'no-canvas-screen';

export interface Refusal {
  kind: 'refuse';
  reason: RefusalReason;
  /**
   * What the person is told. `null` for the gestures a person should simply feel not happen —
   * dragging a band, or dropping a node into itself. A sentence for a no-op is noise.
   */
  sentence: string | null;
}

export interface MovePlan {
  kind: 'move';
  /** The node being moved, and the component whose graph holds it. */
  node: { id: string; owner: string };
  /** The node it ends up under. Always in the same graph — cross-component moves are refused. */
  parentId: string;
  /**
   * The sibling the move is measured from, and which side of it. `anchor: null` means *append*,
   * which is what dropping **onto** a container means.
   */
  anchor: string | null;
  side: 'before' | 'after' | 'end';
  /** ⌥-drag: leave the original where it is. Matches the canvas. */
  copy: boolean;
}

export interface PlacePlan {
  kind: 'place';
  /** The component being instantiated — the Components tab's row. */
  component: string;
  parentId: string;
  /** The component whose graph gains the new node. */
  owner: string;
  anchor: string | null;
  side: 'before' | 'after' | 'end';
}

export type DragPlan = MovePlan | PlacePlan | Refusal;

/**
 * The canvas's own legality rule, injected.
 *
 * The real one is `ComponentModel.canCreateNode`, which needs node *types* and the project — none of
 * which belong in a pure module. Its `message` is passed through untouched: §2 says an illegal
 * reparent is refused "with the canvas's own warning text, never a new sentence", because two
 * sentences for one rule is how a person learns the editor has two rules.
 */
export type Legality = (child: { typename: string | undefined; component?: string }, parent: LayerRow) => {
  ok: boolean;
  message?: string;
};

/** The rows a node drag can touch at all. Bands, cycles and the two notes are annotations. */
const NODE_KINDS = new Set(['node', 'instance']);

/** `/#Noodl Component System/Atoms/Layout/Limiter` reads as `Limiter` in a sentence. */
export function shortName(componentName: string): string {
  const parts = componentName.split('/').filter(Boolean);
  return parts.length ? parts[parts.length - 1] : componentName;
}

/** The sentence a band refuses with — it names the component and the way in. */
export function bandRefusal(owner: string): string {
  const name = shortName(owner);
  return `This is part of ${name} — edit ${name} to change it`;
}

function rowByKey(rows: readonly LayerRow[], key: string): LayerRow | undefined {
  return rows.find((row) => row.key === key);
}

function nodeIdOf(row: LayerRow): string {
  return row.path[row.path.length - 1];
}

/** Is `maybeAncestor` on `row`'s parent chain (or the row itself)? */
function isWithin(rows: readonly LayerRow[], row: LayerRow, maybeAncestor: LayerRow): boolean {
  let at: LayerRow | undefined = row;
  while (at) {
    if (at.key === maybeAncestor.key) return true;
    at = at.parentKey ? rowByKey(rows, at.parentKey) : undefined;
  }
  return false;
}

/**
 * The row a drop actually lands beside, once the rows that are not the canvas's to edit are taken
 * out of the way.
 *
 * 🔴 **The band's tail is not a slot** (§5). The last row inside `Hero`'s band and the next row of
 * the page are drawn one above the other, so the line between them is a position a person will aim
 * at — and it is two different positions, one of which is inside somebody else's component. It
 * resolves **outward**: to just after the instance row whose band the pointer was in. Every row of
 * a band is drawn below its instance row, so `after` is the only side that can be meant.
 *
 * Returns `undefined` when there is no enclosing row the canvas owns, which is a refusal.
 */
function resolveOutward(
  rows: readonly LayerRow[],
  target: LayerRow,
  canvasComponent: string
): { row: LayerRow; side: 'before' | 'after' } | undefined {
  if (target.owner === canvasComponent) return undefined;
  let at: LayerRow | undefined = target;
  while (at) {
    if (at.owner === canvasComponent && NODE_KINDS.has(at.kind)) return { row: at, side: 'after' };
    at = at.parentKey ? rowByKey(rows, at.parentKey) : undefined;
  }
  return undefined;
}

export interface RowDragInput {
  rows: readonly LayerRow[];
  /** The component the canvas has open — the one whose rows a person may rearrange. */
  canvasComponent: string;
  sourceKey: string;
  target: DropTarget;
  /** ⌥ held. */
  copy?: boolean;
  canParent: Legality;
}

/**
 * §2's first three rows and its legality row: dragging a row that is already in the tree.
 */
export function planRowDrag(input: RowDragInput): DragPlan {
  const { rows, canvasComponent, sourceKey, target, canParent } = input;
  const source = rowByKey(rows, sourceKey);
  const targetRow = rowByKey(rows, target.key);
  if (!source || !targetRow) return { kind: 'refuse', reason: 'not-a-node', sentence: null };

  // A band, a cycle marker or a note is a thing the tree says, not a thing the graph has.
  if (!NODE_KINDS.has(source.kind)) return { kind: 'refuse', reason: 'not-a-node', sentence: null };

  // The rule this task is mostly made of.
  if (source.owner !== canvasComponent) {
    return { kind: 'refuse', reason: 'band', sentence: bandRefusal(source.owner) };
  }

  // Into itself: the gesture is a no-op a person expects to simply not happen, and it is the one
  // way a drag can destroy a subtree.
  if (isWithin(rows, targetRow, source)) {
    return { kind: 'refuse', reason: 'into-itself', sentence: null };
  }

  if (target.side === 'inside') {
    // Dropping ONTO a row means "become its child", so the row itself has to be the canvas's.
    if (targetRow.owner !== canvasComponent) {
      return { kind: 'refuse', reason: 'band', sentence: bandRefusal(targetRow.owner) };
    }
    if (!NODE_KINDS.has(targetRow.kind)) return { kind: 'refuse', reason: 'not-a-node', sentence: null };
    const legal = canParent({ typename: source.typename, component: source.component }, targetRow);
    if (!legal.ok) {
      return { kind: 'refuse', reason: 'illegal', sentence: legal.message ?? null };
    }
    return {
      kind: 'move',
      node: { id: nodeIdOf(source), owner: source.owner },
      parentId: nodeIdOf(targetRow),
      anchor: null,
      side: 'end',
      copy: Boolean(input.copy)
    };
  }

  // before / after: the anchor is a sibling, so the new parent is the anchor's parent.
  const resolved = resolveOutward(rows, targetRow, canvasComponent);
  const anchorRow = resolved ? resolved.row : targetRow;
  const side = resolved ? resolved.side : (target.side as 'before' | 'after');

  if (anchorRow.owner !== canvasComponent) {
    return { kind: 'refuse', reason: 'band', sentence: bandRefusal(anchorRow.owner) };
  }
  // The outermost row has no parent row: there is no slot beside it, because its parent is the
  // component's root list rather than a node.
  const parentRow = anchorRow.parentKey ? rowByKey(rows, anchorRow.parentKey) : undefined;
  if (!parentRow) return { kind: 'refuse', reason: 'not-a-node', sentence: null };
  if (parentRow.owner !== canvasComponent) {
    return { kind: 'refuse', reason: 'band', sentence: bandRefusal(parentRow.owner) };
  }
  if (isWithin(rows, parentRow, source)) {
    return { kind: 'refuse', reason: 'into-itself', sentence: null };
  }

  const legal = canParent({ typename: source.typename, component: source.component }, parentRow);
  if (!legal.ok) {
    return { kind: 'refuse', reason: 'illegal', sentence: legal.message ?? null };
  }

  return {
    kind: 'move',
    node: { id: nodeIdOf(source), owner: source.owner },
    parentId: nodeIdOf(parentRow),
    anchor: nodeIdOf(anchorRow),
    side,
    copy: Boolean(input.copy)
  };
}

export interface ComponentDropInput {
  rows: readonly LayerRow[];
  canvasComponent: string;
  target: DropTarget;
  /** The Components tab's row: the component being dragged in, and what `componentKind` calls it. */
  component: { name: string; kind: string | undefined };
  canParent: Legality;
}

/**
 * §2's fourth, fifth and sixth rows: dragging a component from the Components tab into Layers.
 *
 * ⚠️ The two refusals are written from what the thing IS, not from where it was dropped. A page
 * dropped on a page is not "illegal here" — a page is a Router's child anywhere, and a person who
 * is told *where* it cannot go will try somewhere else.
 */
/**
 * §2's fifth and sixth rows: the two refusals that are about **what the component is**, and
 * therefore have no opinion about where the pointer was.
 *
 * They are lifted out of {@link planComponentDrop} because the tab header's strip asks the same
 * question of the same payload, and a second copy of two sentences is a second rule
 * ([[a-check-in-a-second-pipeline-is-a-duplicate-first]]).
 *
 * ⚠️ The sentences are written from what the thing IS, not from where it was dropped. A page
 * dropped on a page is not "illegal here" — a page is a Router's child *anywhere*, and a person
 * told *where* it cannot go will simply try somewhere else.
 */
export function refuseByKind(component: { name: string; kind: string | undefined }): Refusal | null {
  if (component.kind === 'page' || component.kind === 'home') {
    return { kind: 'refuse', reason: 'page', sentence: 'Pages go in a Router, not on another page' };
  }
  // `visual` and `popup` are the two kinds with a visual root. Everything else — logic components,
  // cloud functions, the unclassifiable — draws nothing, so there is no screen position to give it.
  if (component.kind !== 'visual' && component.kind !== 'popup') {
    return {
      kind: 'refuse',
      reason: 'no-screen',
      sentence: `${shortName(component.name)} has no screen. Drop it on the canvas.`
    };
  }
  return null;
}

export function planComponentDrop(input: ComponentDropInput): DragPlan {
  const { rows, canvasComponent, target, component, canParent } = input;

  const wrongKind = refuseByKind(component);
  if (wrongKind) return wrongKind;

  const targetRow = rowByKey(rows, target.key);
  if (!targetRow) return { kind: 'refuse', reason: 'not-a-node', sentence: null };

  if (target.side === 'inside') {
    if (targetRow.owner !== canvasComponent) {
      return { kind: 'refuse', reason: 'band', sentence: bandRefusal(targetRow.owner) };
    }
    if (!NODE_KINDS.has(targetRow.kind)) return { kind: 'refuse', reason: 'not-a-node', sentence: null };
    const legal = canParent({ typename: component.name, component: component.name }, targetRow);
    if (!legal.ok) return { kind: 'refuse', reason: 'illegal', sentence: legal.message ?? null };
    return {
      kind: 'place',
      component: component.name,
      parentId: nodeIdOf(targetRow),
      owner: canvasComponent,
      anchor: null,
      side: 'end'
    };
  }

  const resolved = resolveOutward(rows, targetRow, canvasComponent);
  const anchorRow = resolved ? resolved.row : targetRow;
  const side = resolved ? resolved.side : (target.side as 'before' | 'after');
  if (anchorRow.owner !== canvasComponent) {
    return { kind: 'refuse', reason: 'band', sentence: bandRefusal(anchorRow.owner) };
  }
  const parentRow = anchorRow.parentKey ? rowByKey(rows, anchorRow.parentKey) : undefined;
  if (!parentRow) return { kind: 'refuse', reason: 'not-a-node', sentence: null };
  if (parentRow.owner !== canvasComponent) {
    return { kind: 'refuse', reason: 'band', sentence: bandRefusal(parentRow.owner) };
  }
  const legal = canParent({ typename: component.name, component: component.name }, parentRow);
  if (!legal.ok) return { kind: 'refuse', reason: 'illegal', sentence: legal.message ?? null };

  return {
    kind: 'place',
    component: component.name,
    parentId: nodeIdOf(parentRow),
    owner: canvasComponent,
    anchor: nodeIdOf(anchorRow),
    side
  };
}

export interface TabHeaderDropInput {
  rows: readonly LayerRow[];
  canvasComponent: string;
  component: { name: string; kind: string | undefined };
  canParent: Legality;
}

/**
 * The row the strip drops **into**: the outermost row of the tree that the canvas's own component
 * owns.
 *
 * 🔴 **The first one in the list, deliberately.** The rows are in document order and a component
 * may hold more than one visual root — and only the first of them is ever drawn
 * ([[a-component-instance-renders-only-its-first-visual-root]]). So the first row the canvas owns
 * is the root of the thing a person can actually see, which is the only root a drop meaning *"put
 * it on this screen"* can mean. Note this is rarely depth 0: the app shell is drawn above every
 * band, so on a page the outermost row the page owns sits several levels in.
 */
export function screenRootRow(rows: readonly LayerRow[], canvasComponent: string): LayerRow | undefined {
  return rows.find((row) => row.owner === canvasComponent && NODE_KINDS.has(row.kind));
}

/**
 * §2's fourth row, second half: **the drop-target strip on the Layers tab header**.
 *
 * ## Why the gesture needs a strip at all
 *
 * The two tabs are exclusive. A component row lives in the Components tab and the rows it could be
 * dropped between live in Layers, and **they are never on screen together** — so without a target
 * on the tab header there is no gesture at all, which is exactly the state slice 1 shipped in.
 *
 * 🔴 **The tab does not switch under a moving hand** (§2). A spring-loaded header — open Layers on
 * hover and let the drag continue into the tree — was the other way to build this and §2 rules it
 * out in its own sentence. So the strip is a *destination*, not a doorway: dropping on it places
 * the component and opens Layers with the new row selected. The position it lands in is the end of
 * the screen's root, which is what a drop with no row under it can honestly mean; ⌥↑/⌥↓ and a
 * second drag — both already built — are how it is moved from there.
 *
 * ⚠️ The refusals are {@link planComponentDrop}'s own, reached through the same two functions, so
 * a page and a logic component are refused here in the words they are refused in the tree.
 */
export function planTabHeaderDrop(input: TabHeaderDropInput): DragPlan {
  const { rows, canvasComponent, component, canParent } = input;

  // What the thing IS, before where it would go: a page is refused in the same words wherever it
  // is dropped, and telling someone the screen has no room for a thing that could never go on a
  // screen would send them looking for a different screen.
  const wrongKind = refuseByKind(component);
  if (wrongKind) return wrongKind;

  const root = screenRootRow(rows, canvasComponent);
  if (!root) {
    return {
      kind: 'refuse',
      reason: 'no-canvas-screen',
      sentence: `${shortName(canvasComponent)} has no screen. Open a page to place it.`
    };
  }

  return planComponentDrop({
    rows,
    canvasComponent,
    target: { key: root.key, side: 'inside' },
    component,
    canParent
  });
}

/**
 * ⌥↑ / ⌥↓ on the selected row (§3). One step among the rows that share its parent **and its
 * owner** — a keyboard move cannot be the gesture that crosses into a band, because there is no
 * pointer to say where it meant.
 *
 * Returns the same `move` plan a drag would, or a refusal when there is nowhere to go.
 */
export function planKeyboardMove(
  rows: readonly LayerRow[],
  canvasComponent: string,
  rowKey: string,
  direction: 'up' | 'down'
): DragPlan {
  const row = rowByKey(rows, rowKey);
  if (!row || !NODE_KINDS.has(row.kind)) return { kind: 'refuse', reason: 'not-a-node', sentence: null };
  if (row.owner !== canvasComponent) {
    return { kind: 'refuse', reason: 'band', sentence: bandRefusal(row.owner) };
  }
  const parentRow = row.parentKey ? rowByKey(rows, row.parentKey) : undefined;
  if (!parentRow) return { kind: 'refuse', reason: 'not-a-node', sentence: null };

  const siblings = rows.filter(
    (candidate) =>
      candidate.parentKey === row.parentKey && candidate.owner === canvasComponent && NODE_KINDS.has(candidate.kind)
  );
  const at = siblings.findIndex((candidate) => candidate.key === row.key);
  const neighbour = siblings[direction === 'up' ? at - 1 : at + 1];
  if (!neighbour) return { kind: 'refuse', reason: 'not-a-node', sentence: null };

  return {
    kind: 'move',
    node: { id: nodeIdOf(row), owner: row.owner },
    parentId: nodeIdOf(parentRow),
    anchor: nodeIdOf(neighbour),
    side: direction === 'up' ? 'before' : 'after',
    copy: false
  };
}
