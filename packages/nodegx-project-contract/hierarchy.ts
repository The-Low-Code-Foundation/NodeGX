/**
 * Where a node may sit in a component's visual tree (P107 NSP-021 §3.2, s89).
 *
 * The editor marks four placements as errors on the node (`NodeGraphNode.evaluateHealth`): a node that may not be a
 * child at all, a child whose category its parent does not hold, children under a node that holds none, and visual
 * roots of a component that disagree on their category. A component instance answers these from its own graph
 * (`ComponentModel`): it may be a child when one of its roots may, it takes that root's category, and it holds the
 * categories its `Component Children` slot declares (`haveComponentChildren`).
 *
 * Until s89 the agent's checker asked none of this. Measured over Richard's 123 projects and the 85 committed ones
 * (34,361 nodes): the editor raises these errors on 60 nodes the agent was never told about — nightbook's eight data
 * components inside Groups and the Page (52), an agent's product cards inside a For Each (6), and a fixture built to
 * have them (2); the running editor counted the same. A rule built on the node catalog as it was would have matched all
 * 60 and wrongly flagged 70 more: the catalog did not carry `haveComponentChildren`, so every component with a
 * `Component Children` slot read as holding nothing.
 *
 * R23 (Richard, 2026-10-12, "Yes, as errors"): the agent's checker reports them at the editor's level. The rule has
 * one body, here; the editor's node warnings, its component types and the validator's `invalidHierarchy` call it.
 *
 * @module project-contract/hierarchy
 */

/** What the rule reads of a node type: the runtime's node library export, the catalog, or a component's derivation. */
export interface HierarchyType {
  category?: string;
  allowAsChild?: boolean;
  allowChildrenWithCategory?: readonly string[];
  /** Set on `Component Children`: a component holding one holds children of these categories. */
  haveComponentChildren?: readonly string[];
}

/** The editor's warning keys (`WarningsModel`), one per placement it refuses. */
export type HierarchyFindingKey = 'node-not-child' | 'node-invalid-child' | 'node-no-children' | 'node-child-cat';

/** A node that may not sit inside anything (a logic node, or a component with no visual root). */
export function cannotBeAChild(type: HierarchyType): boolean {
  return !type.allowAsChild;
}

/** A parent that does not hold a child of this one's category (or holds no children at all). */
export function cannotHoldChild(parent: HierarchyType, child: HierarchyType): boolean {
  return !parent.allowChildrenWithCategory || !child.category || parent.allowChildrenWithCategory.indexOf(child.category) === -1;
}

/** A node that holds no children. */
export function cannotHaveChildren(type: HierarchyType): boolean {
  return !type.allowChildrenWithCategory;
}

/** A root that may be a child, beside another such root of a different category: a component cannot be both. */
export function rootCategoryDisagrees(root: HierarchyType, otherRoots: readonly HierarchyType[]): boolean {
  return !!root.allowAsChild && otherRoots.some((o) => !!o.allowAsChild && o.category !== root.category);
}

/** A component instance's type, from its roots' types and every node's type in its graph (`ComponentModel`). */
export function componentHierarchyType(rootTypes: readonly HierarchyType[], nodeTypes: readonly HierarchyType[]): HierarchyType {
  let category: string | undefined;
  let allowAsChild = false;
  // The LAST root that may be a child names the category, as `ComponentModel.category` has always read it.
  for (const root of rootTypes) {
    if (root.allowAsChild) {
      allowAsChild = true;
      category = root.category;
    }
  }
  return { category, allowAsChild, allowChildrenWithCategory: componentChildCategories(nodeTypes) };
}

/** The categories a component holds: the union of its nodes' `haveComponentChildren`, or none. */
export function componentChildCategories(nodeTypes: readonly HierarchyType[]): string[] | undefined {
  const categories: string[] = [];
  for (const t of nodeTypes) for (const c of t.haveComponentChildren ?? []) if (!categories.includes(c)) categories.push(c);
  return categories.length > 0 ? categories : undefined;
}

/** One node of a component, as the rule needs it. */
export interface HierarchyNode {
  id: string;
  type: string;
  parent?: string;
  children?: readonly string[];
}

export interface HierarchyFinding {
  key: HierarchyFindingKey;
  nodeId: string;
  /** For `node-invalid-child`: the parent's id. */
  parentId?: string;
}

/**
 * Every placement the editor refuses in one component. `typeOf` answers a node type, or `undefined` for a type it
 * cannot resolve: such a node is skipped on both ends (the editor reports a missing type on its own, and says nothing
 * about where it sits).
 */
export function hierarchyFindings(
  nodes: readonly HierarchyNode[],
  typeOf: (typeName: string) => HierarchyType | undefined
): HierarchyFinding[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const parentOf = new Map<string, string>();
  for (const n of nodes) for (const c of n.children ?? []) parentOf.set(c, n.id);
  for (const n of nodes) if (n.parent !== undefined && !parentOf.has(n.id)) parentOf.set(n.id, n.parent);
  const roots = nodes.filter((n) => !parentOf.has(n.id));

  const out: HierarchyFinding[] = [];
  for (const n of nodes) {
    const t = typeOf(n.type);
    if (!t) continue;
    const parentId = parentOf.get(n.id);
    const parent = parentId !== undefined ? byId.get(parentId) : undefined;
    const pt = parent ? typeOf(parent.type) : undefined;
    if (parent && cannotBeAChild(t)) out.push({ key: 'node-not-child', nodeId: n.id, parentId });
    if (parent && pt && cannotHoldChild(pt, t)) out.push({ key: 'node-invalid-child', nodeId: n.id, parentId });
    if ((n.children?.length ?? 0) > 0 && cannotHaveChildren(t)) out.push({ key: 'node-no-children', nodeId: n.id });
    if (!parent) {
      const others = roots.filter((r) => r !== n).map((r) => typeOf(r.type)).filter((x): x is HierarchyType => !!x);
      if (rootCategoryDisagrees(t, others)) out.push({ key: 'node-child-cat', nodeId: n.id });
    }
  }
  return out;
}
