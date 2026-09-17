/**
 * TVW-003 — a rendered node, addressed through the instances it sits in.
 *
 * One definition node renders once per instance of its component: two `Project Card`s draw the
 * definition's `Title` twice, and `getNodesWithIdRecursive(titleId)` returns both. So a bare id
 * cannot say "the second card's title". A path can: the ids of the component instances from the
 * outermost inwards, ending in the node's own id — the same `NodePath` the editor's selection
 * store holds.
 *
 * Pure (no DOM, no runtime import) so `tests/tvw-003-instance-path.test.ts` grades it on fakes.
 */

/** The two scope links the walk reads. `parentNodeScope` is set on component instances only. */
export interface PathWalkNode {
  id: string;
  nodeScope?: { componentOwner?: PathWalkNode };
  parentNodeScope?: { componentOwner?: PathWalkNode };
}

/** Deeper than any real app nests; a guard against a scope cycle, not a limit anyone reaches. */
const MAX_DEPTH = 256;

/**
 * The instance path of a rendered node, outermost first, **excluding the root component** (it is
 * not an instance anybody placed, so no canvas has a node for it).
 *
 * A component instance lives in its `parentNodeScope` (its `nodeScope` is the scope *inside* it);
 * every other node lives in its `nodeScope`. Same walk as `Inspector.findNoodlNode`'s scoping.
 *
 * ⚠️ Runtime-created instances — a Page Router's page, a For Each row — carry fresh `guid()`s, so
 * their ids are in the path but in no project file. The editor keeps only the authored ids
 * (`authoredPath`), which is why {@link pathAddresses} matches a subsequence rather than the
 * whole path.
 */
export function instancePathOf(node: PathWalkNode): string[] {
  const path: string[] = [node.id];
  let current = node;

  for (let depth = 0; depth < MAX_DEPTH; depth++) {
    const scope = current.parentNodeScope ?? current.nodeScope;
    const owner = scope?.componentOwner;
    // The root component instance is the only owner with no scope to live in.
    if (!owner || owner === current || !owner.parentNodeScope) break;
    path.unshift(owner.id);
    current = owner;
  }

  return path;
}

/**
 * Whether `selector` addresses the rendered node whose instance path is `path`: the last ids are
 * equal and the selector's other ids appear in `path`, in order.
 *
 * So `[titleId]` — what a canvas showing the definition writes — addresses every instance's title,
 * `[card2Id, titleId]` addresses only the second card's, and an authored path the editor stripped
 * of a router's page guid still addresses the node rendered under that page.
 */
export function pathAddresses(selector: readonly string[], path: readonly string[]): boolean {
  if (!selector.length || !path.length) return false;
  if (selector[selector.length - 1] !== path[path.length - 1]) return false;

  let at = 0;
  for (let i = 0; i < selector.length - 1; i++) {
    while (at < path.length - 1 && path[at] !== selector[i]) at++;
    if (at >= path.length - 1) return false;
    at++;
  }
  return true;
}
