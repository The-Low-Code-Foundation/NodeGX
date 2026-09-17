import type { ComponentModel } from '../componentmodel';

/**
 * TVW-003 — one selection, three surfaces.
 *
 * The canvas, the preview and (TVW-004) Layers each show *what is selected*. Before this module
 * each kept its own answer and told the others: the canvas pushed an id to the preview through
 * `SidebarModelEvent.nodeSelected`, the preview pushed ids back through `inspectNodes`, hover went
 * canvas → preview only. Three copies of one fact, reconciled by messages, is how a surface ends
 * up outlining something nobody selected.
 *
 * So there is one store. A surface **writes** it when the person selects something there, and
 * **subscribes** to it to show what was selected elsewhere. No surface tells another what to do.
 *
 * Kept free of React, the DOM, Electron and every editor singleton (the `ComponentModel` import is
 * type-only) so `tests-unit/tvw-003/` grades it in plain Node. Undo does not touch it.
 */

export type SelectionSource = 'canvas' | 'preview' | 'layers' | 'panel';

/**
 * A node, addressed through the instances it sits in: the ids of the instance nodes from the
 * outermost inwards, ending in the node's own id. `[headlineId]` is the definition's node;
 * `[heroInstanceId, headlineId]` is the headline inside *that* Hero.
 *
 * 🔴 **A bare node id cannot be the address.** Two `Project Card` instances render one definition
 * `Title` node twice, and "the second card's title" is a different selection from "the first
 * card's title" (AC3). The canvas, showing the definition, highlights `Title` for either — it reads
 * {@link nodeIdOf}; the preview outlines only the element the whole path names.
 */
export type NodePath = readonly string[];

export interface Selection {
  /** The component the selection is in. `null` before anything has been selected. */
  readonly component: ComponentModel | null;
  /** Empty when a component is selected with no nodes in it (a Components panel row, TVW-001). */
  readonly nodes: readonly NodePath[];
  /** Who wrote it. Informational: it is not part of the value (see {@link sameSelection}). */
  readonly source: SelectionSource | null;
}

export interface SelectionSubscriber {
  /** The surface this subscriber is. Its own writes are not played back to it. */
  readonly surface: SelectionSource;
  onSelection?(selection: Selection): void;
  onHover?(hover: NodePath | null): void;
}

export const EMPTY_SELECTION: Selection = Object.freeze({ component: null, nodes: [], source: null });

/** The node id a canvas showing the definition highlights for a path. */
export function nodeIdOf(path: NodePath): string | undefined {
  return path.length ? path[path.length - 1] : undefined;
}

export function samePath(a: NodePath | null, b: NodePath | null): boolean {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * Equal when the same component and the same nodes in the same order are selected.
 *
 * 🔴 **`source` is deliberately not compared.** A surface that receives a selection applies it to
 * itself, and applying it is usually the same code path as the person selecting there — so the
 * canvas, told by the preview to select `Headline`, writes `Headline` back with `source: 'canvas'`.
 * If that counted as a change, every write would echo between two surfaces forever.
 */
export function sameSelection(a: Selection, b: Selection): boolean {
  if (a.component !== b.component || a.nodes.length !== b.nodes.length) return false;
  for (let i = 0; i < a.nodes.length; i++) {
    if (!samePath(a.nodes[i], b.nodes[i])) return false;
  }
  return true;
}

export class SelectionStore {
  private current: Selection = EMPTY_SELECTION;
  private hovered: NodePath | null = null;
  private readonly subscribers: SelectionSubscriber[] = [];

  get selection(): Selection {
    return this.current;
  }

  get hover(): NodePath | null {
    return this.hovered;
  }

  /** @returns the unsubscribe function. */
  subscribe(subscriber: SelectionSubscriber): () => void {
    this.subscribers.push(subscriber);
    return () => {
      const index = this.subscribers.indexOf(subscriber);
      if (index !== -1) this.subscribers.splice(index, 1);
    };
  }

  /**
   * Select `nodes` in `component`, written by `source`. A write equal to the current selection
   * notifies nobody. Empty paths are dropped rather than stored: they address nothing.
   */
  select(source: SelectionSource, component: ComponentModel | null, nodes: readonly NodePath[] = []): void {
    const next: Selection = Object.freeze({
      component,
      nodes: Object.freeze(nodes.filter((path) => path.length > 0).map((path) => Object.freeze([...path]))),
      source
    });

    if (sameSelection(this.current, next)) return;

    this.current = next;
    for (const subscriber of this.others(source)) {
      subscriber.onSelection?.(next);
    }
  }

  /** Keep the component, select no nodes in it — what clicking empty canvas means. */
  clearNodes(source: SelectionSource): void {
    this.select(source, this.current.component, []);
  }

  /**
   * Hover is transient and separate: it never clears or replaces the selection, and moving off
   * is `setHover(source, null)`.
   */
  setHover(source: SelectionSource, path: NodePath | null): void {
    const next = path && path.length > 0 ? Object.freeze([...path]) : null;
    if (samePath(this.hovered, next)) return;

    this.hovered = next;
    for (const subscriber of this.others(source)) {
      subscriber.onHover?.(next);
    }
  }

  /** A snapshot, so a subscriber that unsubscribes while being notified does not skip its neighbour. */
  private others(source: SelectionSource): SelectionSubscriber[] {
    return this.subscribers.filter((subscriber) => subscriber.surface !== source);
  }
}

/** The editor renderer's one store. */
export const selectionStore = new SelectionStore();
