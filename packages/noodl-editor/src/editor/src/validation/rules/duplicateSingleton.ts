/**
 * Rule: a component holds at most one node of a type that says it is held once (P107 R34).
 *
 * Page and a cloud function's Request are `singleton` in the runtime's library export, and the catalog copies the flag.
 * The editor's warning for a second one never fired (it read a flag no producer sends), and this checker never asked,
 * so an agent could write a page with two Pages and be told it passed. Measured over 370 projects: none holds two.
 *
 * R34 (Richard, 2026-10-12, "Warn on the second one, in both"): one rule body, `@nodegx/project-contract/singleton`,
 * which the editor's `NodeGraphNode` calls too. A type the catalog does not know is skipped: `unknown-node-type` owns it.
 *
 * @module noodl-editor/validation/rules/duplicateSingleton
 */

import { extraSingletons } from '@nodegx/project-contract/singleton';

import { Diagnostic, DiagnosticCode } from '../diagnostics';
import { Rule, RuleContext } from './types';

export const duplicateSingleton: Rule = {
  code: DiagnosticCode.DuplicateSingleton,
  description: 'A component holds at most one Page, and a cloud function at most one Request (R34: a warning on each extra one).',
  defaultEnabled: true,

  run(ctx: RuleContext): Diagnostic[] {
    const out: Diagnostic[] = [];
    for (const { component } of ctx.components) {
      for (const node of extraSingletons(component.nodes, (n) => n.type, (t) => ctx.catalog.getNode(t))) {
        const name = ctx.catalog.getNode(node.type)?.displayName ?? node.type;
        out.push({
          code: DiagnosticCode.DuplicateSingleton,
          severity: 'warning',
          message: `"${node.label || name}" (${node.type}) is a second ${name} in this component, which holds only one. Remove one of them.`,
          location: { component: component.name, nodeId: node.id, nodeType: node.type, nodeLabel: node.label }
        });
      }
    }
    return out;
  }
};
