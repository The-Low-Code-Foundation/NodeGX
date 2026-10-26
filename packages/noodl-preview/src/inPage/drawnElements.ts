/**
 * The elements runtime nodes draw, for `Preview.elementsOf` (P123-STU031-COPYBOX).
 *
 * A visual node draws its own element (`getDOMElement`). A copy of a component has none: it draws through its
 * component's roots (`ComponentInstance.getRoots()`), and a root can itself be a copy, so the roots are followed down
 * until they reach elements. Without that, `elementsOf` was `[]` for every placed reusable, and an editor built on the
 * kit could not box it, hit it, or say which part of the screen it makes (NodeGX Studio walked the roots itself).
 *
 * Plain loops, no `flatMap`: this ships inside the in-page bundle editors vendor.
 */

/** The members of a runtime node this reads: a visual node's element, or a copy's roots. */
export interface DrawingNode {
  getDOMElement?: () => unknown;
  getRoots?: () => DrawingNode[] | null | undefined;
}

/** What one node draws: its element, or its roots' elements for a copy. A node that draws nothing gives none. */
export function drawnElementsOf(node: DrawingNode, out: HTMLElement[] = [], seen: Set<DrawingNode> = new Set()): HTMLElement[] {
  if (!node || seen.has(node)) return out;
  seen.add(node);
  if (typeof node.getDOMElement === 'function') {
    const el = node.getDOMElement() as HTMLElement | null;
    if (el && out.indexOf(el) === -1) out.push(el);
    return out;
  }
  if (typeof node.getRoots === 'function') {
    const roots = node.getRoots() || [];
    for (let i = 0; i < roots.length; i++) drawnElementsOf(roots[i], out, seen);
  }
  return out;
}

/** What a list of nodes draws, in order, each element once. */
export function drawnElements(nodes: readonly DrawingNode[]): HTMLElement[] {
  const out: HTMLElement[] = [];
  const seen = new Set<DrawingNode>();
  for (let i = 0; i < nodes.length; i++) drawnElementsOf(nodes[i], out, seen);
  return out;
}
