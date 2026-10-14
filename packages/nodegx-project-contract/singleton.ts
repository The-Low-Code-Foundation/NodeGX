/**
 * Which nodes are a second one of a type a component holds only once (P107 NSP-021 §3.2, s93).
 *
 * Two node types say a component holds one of them (`singleton`, the runtime's library export, copied by the catalog):
 * Page and the cloud function's Request. The editor's warning for a second one read `allowSingleInstanceOnly`, a name no
 * producer sends, so it never fired; the agent's checker had no such check. Read as written, the editor's test would
 * also have marked the first one: `hasNodesWithType` counts the node asking. Measured over 370 projects: 1,477
 * components hold exactly one (Page 1,045, Request 432) and none holds two.
 *
 * R34 (Richard, 2026-10-12, "Warn on the second one, in both"): every node after the first of its singleton type in a
 * component is marked, by the editor and by the checker the Problems panel and the agent server share. One rule body,
 * here.
 *
 * @module project-contract/singleton
 */

/** What the rule reads of a node type: the runtime's node library export, or the catalog (which copies it). */
export interface SingletonType {
  singleton?: boolean;
}

/**
 * The nodes after the first of each singleton type, in the order given (the component's tree order: the editor's
 * `forEachNode`, the checker's node list). `typeOf` answers `undefined` for a type it cannot resolve, which is never
 * marked.
 */
export function extraSingletons<N>(
  nodes: Iterable<N>,
  typeName: (node: N) => string,
  typeOf: (typeName: string) => SingletonType | undefined
): N[] {
  const seen = new Set<string>();
  const extra: N[] = [];
  for (const node of nodes) {
    const name = typeName(node);
    if (!typeOf(name)?.singleton) continue;
    if (seen.has(name)) extra.push(node);
    else seen.add(name);
  }
  return extra;
}
