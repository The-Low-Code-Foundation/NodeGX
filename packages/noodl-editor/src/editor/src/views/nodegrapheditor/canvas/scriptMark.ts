/**
 * P111 SEE-001 §4 item 3 — which node cards carry the script mark.
 *
 * A node is marked when the honesty rule classes its type as `script`: a Function, Script, Expression or Visual
 * Function node, or a kit node with no spec. The rule is `@nodegx/node-spec`'s `honestyClassifier`, compiled once with
 * the bundled catalog's type names — the same call `projectHonesty` makes for the panel's number, so a card is marked
 * exactly when it is one of the script parts the panel lists. A component instance is never marked: its nodes are
 * counted, and marked, inside its own component.
 *
 * The painter asks per node per frame, so the classifier is compiled once and answers from two set lookups. Nothing in
 * it depends on the open project: a component instance is told by its `/` or `#` prefix.
 *
 * The mark itself is a bar down the card's right edge in `SCRIPT_MARK_TOKEN`'s colour — the same bar the components
 * panel draws on a row's number (`ComponentsPanelNew/honestyView.ts`).
 *
 * @module noodl-editor/views/nodegrapheditor/canvas/scriptMark
 */

import { honestyClassifier, type HonestyClass } from '@nodegx/node-spec';

import { defaultCatalog } from '../../../validation/catalog';

let classify: ((type: string) => HonestyClass) | null = null;

/** The bundled catalog's type names: the kit test's "shipped" list. */
export function shippedTypeNames(): string[] {
  return defaultCatalog().nodes.map((n) => n.typeName);
}

/** True when a node of this type is one the honesty number counts as script. */
export function isScriptNodeType(typename: string | undefined): boolean {
  if (!typename) return false;
  if (!classify) classify = honestyClassifier({ coreTypes: shippedTypeNames() });
  return classify(typename) === 'script';
}
