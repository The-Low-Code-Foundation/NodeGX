/**
 * P112 OWN-004 slice 3 — what a node's spec says its ports are, for the page's connect popup and property panel.
 * Bundled by build.sh into specs.js (`@nodegx/node-spec`'s browser entry, OWN-002).
 *
 * A spec's `derived` ports are a function of the node's parameters (String Format's `{name}` inputs, States' `at-`
 * and `reached-` outputs). Some specs derive over the conformance generator's whole universe as well (States adds
 * `at-A`, `x`, `label` … so a generated scenario can wire a list that arrives mid-play): a port the universe alone
 * brings — derived with no parameters, not named by one of this node's parameters — is not one this node has, and
 * is left out. (`portsFor` cannot tell a state the author really called `A` from the universe's `A`; nor can anyone
 * reading the spec alone.)
 */
import { specs, drawnPorts } from '../../../../../packages/nodegx-node-spec/src/browser';
// P123 (2026-10-16): the context the spec's derived ports read since NSP-020 (params, context) — the project's routers,
// backends, schema and component interfaces, built from the store with no viewer (`port-context.ts`). Re-exported so a
// page can build one; `portsFor` takes it as its third argument, and `drawn()` is the spec package's own drawer over it.
export { portProjectFromStore, portContextFor } from '../../../../../packages/nodegx-project-contract/port-context';
export { drawnPorts, specs };
// P123 s2 (2026-10-16): the Expression node's text is JavaScript and every free name in it is an input port — the
// spec's own lexer says which, so a composer that writes the text can wire exactly those names.
export { expressionPorts } from '../../../../../packages/nodegx-node-spec/src/nodes/expression-ports';

export interface SpecPort { name: string; label: string; type: string; signal: boolean; default?: unknown; enums?: string[]; group?: string; description?: string }

type Decl = { type?: unknown; displayName?: string; default?: unknown; enums?: unknown; group?: string; description?: string };
type AnySpec = { inputs: Record<string, Decl>; outputs: Record<string, Decl>; derived?: { inputs?: (p: object, c?: object) => Record<string, Decl>; outputs?: (p: object, c?: object) => Record<string, Decl> } };
const all = specs as unknown as Record<string, AnySpec>;

const typeName = (t: unknown) => (typeof t === 'object' && t !== null ? String((t as { name?: string }).name) : String(t ?? '*'));
const port = (name: string, d: Decl): SpecPort => ({
  name,
  label: d.displayName ?? name,
  type: typeName(d.type),
  signal: typeName(d.type) === 'signal',
  ...(d.default !== undefined ? { default: d.default } : {}),
  ...(Array.isArray(d.enums) ? { enums: d.enums.map((e) => (typeof e === 'object' && e ? String((e as { value: unknown }).value) : String(e))) } : {}),
  ...(d.group ? { group: d.group } : {}),
  ...(d.description ? { description: d.description } : {})
});

export const specCount = Object.keys(all).length;
export const hasSpec = (type: string) => type in all;

/** The node's ports as its spec has them for these parameters; `null` when the type has no spec. */
export function portsFor(type: string, params: Record<string, unknown>, context: object = {}): { inputs: SpecPort[]; outputs: SpecPort[] } | null {
  const s = all[type];
  if (!s) return null;
  const tokens = new Set(Object.values(params).filter((v) => typeof v === 'string').flatMap((v) => (v as string).split(',')).concat(Object.keys(params)));
  const derived = (which: 'inputs' | 'outputs') => {
    const make = s.derived?.[which];
    if (!make) return [];
    const mine = make(params, context), universe = make({}, context);
    return Object.entries(mine).filter(([n]) => !(n in universe) || n in params || [...tokens].some((t) => t && n.split('-').includes(t)));
  };
  const list = (which: 'inputs' | 'outputs') => {
    const seen = new Set<string>();
    return [...Object.entries(s[which]), ...derived(which)].filter(([n]) => !seen.has(n) && !!seen.add(n)).map(([n, d]) => port(n, d));
  };
  return { inputs: list('inputs'), outputs: list('outputs') };
}
