/**
 * Rule: a node sits where the editor lets it sit in the visual tree (P107 R23).
 *
 * The editor has always marked four placements as errors on the node itself: a node that may not be a child at all
 * (a logic node, or a component with no visual root) placed inside another; a child its parent does not hold; children
 * under a node that holds none; and a component whose visual roots disagree on their category. Until R23 this checker
 * asked none of them, so an agent could build a page the editor opened in red and be told it passed. Measured over
 * Richard's 123 projects and the 85 committed ones: 60 nodes (nightbook's data components inside Groups, an agent's
 * cards inside a For Each), and the running editor counted the same.
 *
 * One rule body, `@nodegx/project-contract/hierarchy`, which the editor's `NodeGraphNode` and `ComponentModel` call
 * too. The types come from the catalog (which carries the runtime export's own child/parent fields, including
 * `Component Children`'s `haveComponentChildren`) and, for a component instance, from that component's own graph.
 * A type neither resolves (a kit not loaded, a missing component) is skipped: `unknown-node-type` and
 * `unresolved-component-ref` own those.
 *
 * Where the editor raises both "cannot be a child" and "its parent does not hold it" on one node, this reports the
 * first only: one node, one thing to move.
 *
 * @module noodl-editor/validation/rules/invalidHierarchy
 */

import {
  componentHierarchyType,
  hierarchyFindings,
  type HierarchyFinding,
  type HierarchyType
} from '@nodegx/project-contract/hierarchy';

import { Diagnostic, DiagnosticCode } from '../diagnostics';
import { NormComponent, NormNode, refToPath } from '../model';
import { Rule, RuleContext } from './types';

/** Resolves a node type for the rule: the catalog's answer, a component instance's derived one, or `undefined`. */
export function hierarchyTyper(ctx: Pick<RuleContext, 'catalog' | 'project'>): (typeName: string) => HierarchyType | undefined {
  const byName = new Map<string, NormComponent>();
  for (const c of ctx.project.components) {
    byName.set(c.name, c);
    byName.set(refToPath(c.name), c);
  }
  const memo = new Map<string, HierarchyType | undefined>();
  const inFlight = new Set<string>();

  const typeOf = (typeName: string): HierarchyType | undefined => {
    const node = ctx.catalog.getNode(typeName);
    if (node) return node as HierarchyType;
    if (memo.has(typeName)) return memo.get(typeName);
    const component = byName.get(typeName) ?? byName.get(refToPath(typeName));
    if (!component) return undefined;
    // A component that instantiates itself: its own type is not known while it is being worked out
    if (inFlight.has(typeName)) return { allowAsChild: false };
    inFlight.add(typeName);
    const childIds = new Set(component.nodes.flatMap((n) => n.children));
    const roots = component.nodes.filter((n) => n.parent === undefined && !childIds.has(n.id));
    const known = (n: NormNode) => typeOf(n.type);
    const derived = componentHierarchyType(
      roots.map(known).filter((t): t is HierarchyType => !!t),
      component.nodes.map(known).filter((t): t is HierarchyType => !!t)
    );
    inFlight.delete(typeName);
    memo.set(typeName, derived);
    return derived;
  };
  return typeOf;
}

const quote = (n: NormNode | undefined) => (n ? `"${n.label || n.type}"` : 'its parent');

function messageFor(f: HierarchyFinding, node: NormNode, parent: NormNode | undefined, parentType: HierarchyType | undefined, childCount: number): string {
  switch (f.key) {
    case 'node-not-child':
      return (
        `${quote(node)} (${node.type}) is inside ${quote(parent)}, but it draws nothing and cannot sit in the visual tree. ` +
        `Make it a root of the component (no parent).`
      );
    case 'node-invalid-child': {
      const holds = parentType?.allowChildrenWithCategory;
      return holds
        ? `${quote(node)} (${node.type}) is inside ${quote(parent)} (${parent?.type}), which holds only ${holds.join(', ')} nodes. Move it out of ${quote(parent)}.`
        : `${quote(node)} (${node.type}) is inside ${quote(parent)} (${parent?.type}), which cannot hold children. Move it out, beside ${quote(parent)} or into a Group.`;
    }
    case 'node-no-children':
      return (
        `${quote(node)} (${node.type}) cannot hold children, but ${childCount} node${childCount === 1 ? ' sits' : 's sit'} inside it. ` +
        `Move ${childCount === 1 ? 'it' : 'them'} out.`
      );
    case 'node-child-cat':
      return `The component's visual roots are of different categories, and an instance of it can take only one. Put them under one root.`;
  }
}

export const invalidHierarchy: Rule = {
  code: DiagnosticCode.InvalidHierarchy,
  description: 'Every node sits where the editor lets it sit in the visual tree (R23: the editor marks the rest as errors).',
  defaultEnabled: true,

  run(ctx: RuleContext): Diagnostic[] {
    const out: Diagnostic[] = [];
    const typeOf = hierarchyTyper(ctx);
    for (const { component, nodeById } of ctx.components) {
      const findings = hierarchyFindings(component.nodes, typeOf);
      const notChild = new Set(findings.filter((f) => f.key === 'node-not-child').map((f) => f.nodeId));
      for (const f of findings) {
        if (f.key === 'node-invalid-child' && notChild.has(f.nodeId)) continue;
        const node = nodeById.get(f.nodeId);
        if (!node) continue;
        const parent = f.parentId !== undefined ? nodeById.get(f.parentId) : undefined;
        out.push({
          code: DiagnosticCode.InvalidHierarchy,
          severity: 'error',
          message: messageFor(f, node, parent, parent ? typeOf(parent.type) : undefined, node.children.length),
          location: { component: component.name, nodeId: node.id, nodeType: node.type, nodeLabel: node.label }
        });
      }
    }
    return out;
  }
};
