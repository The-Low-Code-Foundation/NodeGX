/**
 * NSP-019 AC1 — a node's rules, in words, from the catalog the editor already bundles.
 *
 * The words are NSP-018's: `scripts/node-spec/rules.js` reads every said branch of a spec's input
 * reducers and `catalog:generate` writes them as `rules: { [inputPort]: string[] }` on the node's
 * catalog entry (`packages/noodl-types/src/node-catalog.json`). This module reads that entry
 * through `validation/catalog.ts` — the one bundled copy, with the open project's kits merged in —
 * and never a second copy of the catalog.
 *
 * Absent, not empty: a type the catalog does not know, or one without `rules`, answers `undefined`,
 * and the section is not drawn at all (AC1's second half). A specced node whose reducers have no
 * `says` yet has no `rules` either, so "has rules" is also the only evidence the catalog carries
 * that a spec exists — the Try panel (AC2) is offered on the same test.
 *
 * Import-free but for the catalog loader, so the plain-Node runner (`tests-unit/`) grades it over
 * the real catalog rather than a fixture of it.
 */
import { projectCatalog } from '../../../../validation/catalog';

export interface RuleGroup {
  /** The input port's real name — what the runtime is addressed with. */
  port: string;
  /** What the property panel calls it (the catalog's `displayName`, the port name when it has none). */
  label: string;
  /** The generated lines, one per said branch: `<case> → <the pulses, then the outcome>`. */
  lines: readonly string[];
}

/**
 * The rules for a node type, one group per input port in the catalog's port order (ports the
 * reader could not see through keep their place; a port with rules and no catalog row — a derived
 * port — comes last, by name). `undefined` when the type has none.
 */
export function rulesFor(typeName: string): RuleGroup[] | undefined {
  const node = projectCatalog().nodes.find((n) => n.typeName === typeName);
  const rules = node?.rules;
  if (!node || !rules) return undefined;
  const ports = Object.keys(rules).filter((port) => Array.isArray(rules[port]) && rules[port].length > 0);
  if (ports.length === 0) return undefined;

  const order = new Map<string, number>();
  const labels = new Map<string, string>();
  node.inputs.forEach((input, i) => {
    order.set(input.name, i);
    labels.set(input.name, input.displayName || input.name);
  });
  const rank = (port: string) => (order.has(port) ? (order.get(port) as number) : Number.MAX_SAFE_INTEGER);
  ports.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));

  return ports.map((port) => ({ port, label: labels.get(port) ?? port, lines: rules[port] }));
}

/** The rule line's two halves: the author's case and the spec's structure after the arrow. */
export function splitRule(line: string): { when: string; then?: string } {
  const at = line.indexOf(' → ');
  if (at < 0) return { when: line };
  return { when: line.slice(0, at), then: line.slice(at + 3) };
}
