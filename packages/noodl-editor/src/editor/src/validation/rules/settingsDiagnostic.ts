/**
 * Rule: a node's saved settings are ones its runtime warns about (P107 R40).
 *
 * Some of what a node tells the editor follows from its settings alone: a Counter whose Min Value is above its Max Value,
 * a Date Add whose Unit is not one of the eight, a Slider whose Max is below its Min, a For Each whose Script does not
 * compile. The runtime says so only once the app runs, in the node's warning. Its spec marks those sentences
 * (`settings: true`), and `@nodegx/node-spec`'s `settingsDiagnostics` reads them from a node's saved params the way the
 * spec plays them: placed, settled once, nothing pressed. So this rule tells a person, and an agent, before the app runs,
 * in the runtime's own words. The reading comes from the caller (`ValidatorOptions.settingsDiagnostics`,
 * settingsDiagnosticLookup.ts): this module stays free of the specs, as `nonexistentPort` does of `drawnPorts`.
 *
 * R40 (Richard, 2026-10-14, as recommended): only those sentences. One that needs something to happen first (a Focus,
 * a Refresh) is not read, and a node whose value input is wired, or whose setting is an expression, is skipped: the
 * saved value is not what it runs with. `warning`: the app still runs.
 *
 * @module noodl-editor/validation/rules/settingsDiagnostic
 */

import { Diagnostic, DiagnosticCode } from '../diagnostics';
import { Rule, RuleContext } from './types';

export const settingsDiagnostic: Rule = {
  code: DiagnosticCode.SettingsDiagnostic,
  description: "No node's saved settings are ones its runtime warns about (R40: read from the node specs).",
  defaultEnabled: true,

  run(ctx: RuleContext): Diagnostic[] {
    const read = ctx.options.settingsDiagnostics;
    if (!read) return [];
    const out: Diagnostic[] = [];
    for (const { component } of ctx.components) {
      const wired = new Map<string, string[]>();
      for (const c of component.connections) {
        if (!wired.has(c.toId)) wired.set(c.toId, []);
        wired.get(c.toId)!.push(c.toProperty);
      }
      for (const node of component.nodes) {
        for (const d of read(node.type, node.parameters ?? {}, wired.get(node.id) ?? [])) {
          const who = `"${node.label || ctx.catalog.getNode(node.type)?.displayName || node.type}" (${node.type})`;
          out.push({
            code: DiagnosticCode.SettingsDiagnostic,
            severity: 'warning',
            message: `${who}: ${d.message}`,
            location: { component: component.name, nodeId: node.id, nodeType: node.type, nodeLabel: node.label }
          });
        }
      }
    }
    return out;
  }
};
