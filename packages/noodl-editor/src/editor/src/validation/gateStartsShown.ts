/**
 * P78-TPL011-MOUNTED (P109 ISL-045) — a wired `mounted` that starts shown.
 *
 * A visual node's `mounted` defaults to `true`, and a wire into it does not change that: until the wire's first value
 * arrives, the element is on the page. Nightbook's private Tonight page was drawn for a moment behind its locked book,
 * and its Unlock card flashed before Setup (`isl045-mounted-drive`: a Group gated by a Variable nobody sets is drawn).
 * Setting the node's own `mounted` to `false` makes it start hidden, and the wire then shows it.
 *
 * ## Severity: an info, as ruled
 *
 * Richard ruled 2026-10-11 to warn when building, then, shown the count, to say it as a quiet note: the rule fires on
 * 409 nodes of the 13 templates, and most of them gate an error line or an empty state, where one frame shown does no
 * harm. A warning on each would teach a reader to skip warnings. So it is an `info` that names the setting, never a
 * warning and never blocking; Mounted's own description says the same.
 *
 * Abstains on a component instance (whether the component draws, and has `mounted` at all, is not in this graph) and
 * on a type the catalog does not call visual.
 *
 * Pure: the caller supplies nodes, a catalog, and the component's wires.
 *
 * @module noodl-editor/validation/gateStartsShown
 */

import type { CatalogIndex } from './CatalogIndex';
import { DiagnosticCode, type Diagnostic } from './diagnostics';
import type { FunctionWireLike } from './functionPorts';
import { isComponentRef } from './model';
import type { ParameterizedNode } from './parameterValues';

export interface CheckGateStartsShownOptions {
  /** Component identifier for the diagnostics' location. */
  component: string;
  /** Read for `isVisual` — whether the node has `mounted` at all. */
  catalog: CatalogIndex;
  /** Every connection in the component. */
  wires?: readonly FunctionWireLike[];
}

/** P78-TPL011-MOUNTED — a wired `mounted` whose node does not start hidden. */
export function checkGateStartsShown(nodes: readonly ParameterizedNode[], options: CheckGateStartsShownOptions): Diagnostic[] {
  const { component, catalog, wires } = options;
  if (!wires || wires.length === 0) return [];
  const diagnostics: Diagnostic[] = [];

  for (const node of nodes) {
    if (isComponentRef(node.type)) continue;
    if (!catalog.getNode(node.type)?.isVisual) continue;
    if ((node.parameters ?? {})['mounted'] === false) continue;
    if (!wires.some((w) => w.toId === node.id && w.toProperty === 'mounted')) continue;

    diagnostics.push({
      code: DiagnosticCode.GateStartsShown,
      severity: 'info',
      message:
        `This ${node.type}'s mounted is wired, and it is on the page until the wire's first value arrives. ` +
        'If it gates something that must not be seen first (a lock, a private screen), set its mounted to false ' +
        'here: it starts hidden and the wire shows it.',
      location: {
        component,
        nodeId: node.id,
        nodeType: node.type,
        ...(node.label ? { nodeLabel: node.label } : {}),
        port: 'mounted',
        plug: 'input' as const
      },
      suggestion: 'mounted: false'
    });
  }

  return diagnostics;
}
