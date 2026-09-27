/**
 * Rule: every connection endpoint names a port that exists on its node.
 *
 * **This rule is the crux of the task.** A node's ports come from three places:
 *   1. the catalog's static inputs/outputs (incl. declared-port-group members),
 *   2. ports serialised on the node instance (node.ports / node.dynamicports),
 *   3. ports the node creates *at runtime* (Function outputs, Expression inputs,
 *      numbered And/Or inputs, a referenced component's ports, …).
 *
 * We can only see (1) and (2). For (3) we must not guess: reporting "port does
 * not exist" for a runtime-created port would flood real projects with false
 * errors and destroy trust in the validator. So:
 *   - port found in (1) or (2)                                   → OK
 *   - not found, and the node really mints ports at runtime      → skip (optional info)
 *   - not found, and every port the node can have is enumerable  → error
 *
 * 🔴 GAM-019 (P78 D66) — the middle row used to read "the node has ANY dynamic
 * ports" (`isDynamicNode`), and that is how `name0 → text` on a Text Input went
 * through the door silently. 88 of the 176 shipped types carry a `dynamicPorts`
 * entry; for 18 of them the only mechanism is `declared-port-groups`, whose members
 * are all in (1), and Text Input and Options republish only ports they already
 * declare (`runtime-narrowed`). None of those can have a port (1) does not list,
 * so skipping them skipped the check for nothing. The predicate is now
 * `hasRuntimeDynamicPorts`, which `parameterValues` has used for the parameter half
 * of the same question since CN-004.
 *
 * @module noodl-editor/validation/rules/nonexistentPort
 */

import { CatalogIndex, Plug, PortKind, portKindOfTypeName } from '../CatalogIndex';
import { Diagnostic, DiagnosticCode } from '../diagnostics';
import { NormConnection, NormNode, isComponentRef } from '../model';
import { SkippedCheck, unknownTypeSkip } from '../unknownTypeSkip';
import { Rule, RuleContext } from './types';

const MAX_ALTERNATIVES = 24;

function availableAlternatives(catalog: CatalogIndex, type: string, plug: Plug): string[] {
  // For inputs, lead with signal inputs — "how do I trigger this" is the most
  // common near-miss — then the ports that carry a value or a behaviour, then
  // the styling ports a visual state can vary, capped so the message stays readable.
  //
  // ⚠️ GAM-019 — the middle tier is load bearing. Alphabetical order put a Text
  // Input's `startValue` 88th of its 105 inputs, behind every `border*`, so the
  // refusal of D66's `text` listed 24 styling ports and never the one the author
  // meant. `suggestPort` cannot rescue it: "text" is nowhere near "startValue".
  const all = catalog.portNames(type, plug);
  const signals = new Set(plug === 'input' ? catalog.signalInputNames(type) : []);
  const tier = (name: string) => (signals.has(name) ? 0 : catalog.getPort(type, plug, name)?.allowVisualStates ? 2 : 1);
  const ordered = [...all].sort((a, b) => tier(a) - tier(b) || (a < b ? -1 : 1));
  return ordered.slice(0, MAX_ALTERNATIVES);
}

/**
 * GAM-019 (ruled 2026-09-14) — what the wire carries, read from its other end.
 *
 * A catalog port answers first. Otherwise the type the instance declared for the port, which is
 * where D66's `Component Inputs.name0` (`string`) lives. `*`, an untyped instance port, a
 * component instance and a dangling end have no kind, and the suggestion is not filtered.
 */
function otherEndKind(
  catalog: CatalogIndex,
  nodeById: { get(id: string): NormNode | undefined },
  conn: NormConnection,
  plug: Plug
): PortKind | undefined {
  const [id, port, otherPlug]: [string, string, Plug] =
    plug === 'input' ? [conn.fromId, conn.fromProperty, 'output'] : [conn.toId, conn.toProperty, 'input'];
  const other = nodeById.get(id);
  if (!other) return undefined;
  if (!isComponentRef(other.type) && catalog.hasPort(other.type, otherPlug, port)) {
    return catalog.portKind(other.type, otherPlug, port);
  }
  return portKindOfTypeName(other.instancePortTypes?.[port]);
}

export const nonexistentPort: Rule = {
  code: DiagnosticCode.NonexistentPort,
  description: 'Every connection endpoint names a port that exists on its node.',
  defaultEnabled: true,

  run(ctx: RuleContext): Diagnostic[] {
    const out: Diagnostic[] = [];
    const { catalog } = ctx;
    // CN-002 — one notice per (node, check), not per endpoint. Four connections
    // to one unresolvable node are one fact about that node.
    const skipNoticed = new Set<string>();

    for (const { component, nodeById } of ctx.components) {
      for (const conn of component.connections) {
        const endpoints: Array<{ node: NormNode | undefined; port: string; plug: Plug }> = [
          { node: nodeById.get(conn.fromId), port: conn.fromProperty, plug: 'output' },
          { node: nodeById.get(conn.toId), port: conn.toProperty, plug: 'input' }
        ];

        for (const { node, port, plug } of endpoints) {
          if (!node) continue; // dangling — danglingConnection owns this
          if (isComponentRef(node.type)) continue; // component ports are per-instance/dynamic
          if (!catalog.hasType(node.type)) {
            // CN-002 — `unknownNodeType` owns *reporting the type*; it does not
            // say that this check then stopped. Say so, or the skip reads as a
            // pass. Emitted here rather than from a rule that restates what
            // other rules skip: the notice comes from the code doing the
            // skipping, so it cannot drift from what actually happened.
            const key = `${component.name}::${node.id}`;
            if (!skipNoticed.has(key)) {
              skipNoticed.add(key);
              out.push(
                unknownTypeSkip({
                  component: component.name,
                  nodeId: node.id,
                  nodeType: node.type,
                  nodeLabel: node.label,
                  check: SkippedCheck.ConnectionPorts
                })
              );
            }
            continue;
          }

          ctx.counters.endpointsChecked++;

          if (catalog.hasPort(node.type, plug, port)) continue; // (1)
          if (node.instancePorts.includes(port)) continue; // (2)

          if (catalog.hasRuntimeDynamicPorts(node.type)) {
            // (3) — runtime/adapter/numbered/component ports. Never an error.
            if (ctx.options.emitDynamicPortInfo) {
              out.push({
                code: DiagnosticCode.DynamicPortSkipped,
                severity: 'info',
                message:
                  `Port "${port}" on ${node.type} could not be statically verified: ` +
                  (catalog.dynamicPortNote(node.type) ?? 'this node determines ports at runtime') +
                  '. Skipped.',
                location: {
                  component: component.name,
                  nodeId: node.id,
                  nodeType: node.type,
                  nodeLabel: node.label,
                  port,
                  plug
                }
              });
            }
            continue;
          }

          // Fully static node — a missing port here is a real error.
          const suggestion = catalog.suggestPort(node.type, plug, port, otherEndKind(catalog, nodeById, conn, plug));
          const alternatives = availableAlternatives(catalog, node.type, plug);
          out.push({
            code: DiagnosticCode.NonexistentPort,
            severity: 'error',
            message: `${node.type} has no ${plug} named "${port}".`,
            location: {
              component: component.name,
              nodeId: node.id,
              nodeType: node.type,
              nodeLabel: node.label,
              port,
              plug,
              connection: {
                fromId: conn.fromId,
                fromProperty: conn.fromProperty,
                toId: conn.toId,
                toProperty: conn.toProperty
              }
            },
            suggestion,
            alternatives
          });
        }
      }
    }
    return out;
  }
};
