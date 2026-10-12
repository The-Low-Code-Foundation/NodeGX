/**
 * Rule: a node of a retired (deprecated) type, named with the type that replaced it (P107 R25).
 *
 * The editor will not create a deprecated type — its picker, paste and drag all refuse it (`ComponentModel`'s create
 * status) — but this checker never asked, so an agent could add one and be told it passed. Measured over 357 projects
 * (258 of Richard's): 52 such nodes already sit in them, 34 of them the old REST.
 *
 * R25 (Richard, 2026-10-12, "Warn on any"): a warning on every one, existing or new, naming its successor when the
 * node's own definition says it has one (`replacedBy`, carried by the runtime export into the catalog). Nothing is
 * refused: the old nodes still run.
 *
 * @module noodl-editor/validation/rules/deprecatedNode
 */

import { Diagnostic, DiagnosticCode } from '../diagnostics';
import { Rule, RuleContext } from './types';

export const deprecatedNode: Rule = {
  code: DiagnosticCode.DeprecatedNode,
  description: 'No node is of a retired type the editor no longer offers (R25: a warning naming its replacement).',
  defaultEnabled: true,

  run(ctx: RuleContext): Diagnostic[] {
    const out: Diagnostic[] = [];
    for (const { component } of ctx.components) {
      for (const node of component.nodes) {
        const type = ctx.catalog.getNode(node.type);
        if (!type?.isDeprecated) continue;
        const next = type.replacedBy !== undefined ? ctx.catalog.getNode(type.replacedBy) : undefined;
        const who = `"${node.label || type.displayName}" (${node.type})`;
        out.push({
          code: DiagnosticCode.DeprecatedNode,
          severity: 'warning',
          message: next
            ? `${who} is a retired node type the editor no longer offers. Use ${next.displayName} (${next.typeName}) instead.`
            : `${who} is a retired node type the editor no longer offers, and no single node replaced it. Do not add another.`,
          location: { component: component.name, nodeId: node.id, nodeType: node.type, nodeLabel: node.label },
          ...(next ? { suggestion: next.typeName } : {})
        });
      }
    }
    return out;
  }
};
