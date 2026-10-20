/**
 * P111 SEE-001 — the honesty number: how much of an app is made of nodes whose behaviour is known.
 *
 * 🔴 THE ONE DEFINITION. The MCP server (`get_project_info`, `get_component`, the write results, `render_report`), the ratchet
 * (`scripts/see/honesty-ledger.js`) and, later, the editor import this file. None of them restates the rule. A second copy
 * of a rule drifts silently; that is why this one is pure, takes the project as plain data, and lives beside the registry it
 * reads.
 *
 * Every node instance falls in exactly one class:
 *
 *   known      its type has a spec in the registry (`./nodes`) that is not a `contract` spec, or a claim of an N graph scenario
 *              grades it (`GRAPH_GRADED_TYPES`). These are the two ways phase 107's ledger (`scripts/node-spec/spec-ledger.js`)
 *              counts a node as conforming on the runtime, and a registry spec that does not conform is a red PR — so
 *              "in the registry" is "conforms".
 *   script     a node whose behaviour the person (or their agent) writes as code: `SCRIPT_TYPES`, the T6 tier of phase 107 —
 *              Function, Script, Expression, Visual Function. A Function is script even when it is ten lines of date maths
 *              (R3); the line moves when NSP-017 says what a Function may do, and the jump is recorded. Also script: a KIT
 *              node (its type is not in the shipped catalog and not a component) with no spec — a kit node is script with
 *              a port list (README §10). A kit type with a spec is known.
 *   unspecced  a shipped type with no spec and no graph claim yet. Neither known nor script; reported on its own, and it
 *              shrinks as phase 107 proceeds. It never improves the number by moving.
 *   instance   a component instance (`/…` or `#…`, or a name in `components`). Its behaviour is that component's own nodes,
 *              counted where they live.
 *   exempt     a type that owes no spec by a ruled reason (`EXEMPT_TYPES`, phase 107's exemptions.json).
 *
 * THE NUMBER: known ÷ (known + script) × 100, by node instance, to one decimal; `null` when a component has neither. Per
 * component and for the project. `percentByLines` weighs each script node by its script's lines (at least 1; a kit node 1,
 * its code is in the kit) and each known node by 1 — reported beside the headline, never instead of it (R-SEE-001-a).
 *
 * It is NOT a quality score. A Function written on purpose is still script: the number says how much of the app the specs
 * can see into, and the `scriptParts` list says which parts they cannot, by name.
 *
 * Held to its sources by `tests/honesty.test.ts`: `SCRIPT_TYPES` to tiers.json's T6, `EXEMPT_TYPES` to exemptions.json,
 * `GRAPH_GRADED_TYPES` to the graph scenarios' claims (both ways), and the whole rule to the SEE-000 census (AC1).
 */

import type { AnyNodeSpec } from './spec';
import { specs as REGISTRY } from './nodes';

/** The T6 tier (phase 107 tiers.json, CSS Definition exempt): the person writes the behaviour as code. */
export const SCRIPT_TYPES: readonly string[] = Object.freeze(['Expression', 'JavaScriptFunction', 'Javascript2', 'Logic Builder']);

/** Phase 107 exemptions.json: owe no spec, by a ruled reason. */
export const EXEMPT_TYPES: readonly string[] = Object.freeze(['CSS Definition', 'Component Children']);

/** The types an N graph scenario's claims grade (`scenarios/graph/*.json`) — counted as conforming by the ledger. */
export const GRAPH_GRADED_TYPES: readonly string[] = Object.freeze([
  'Component Inputs',
  'Component Outputs',
  'Event Receiver',
  'Event Sender',
  'For Each Actions',
  'On App Error',
  'RunTasks',
  'net.noodl.ActionDispatcher',
  'net.noodl.ActionHandler',
  'net.noodl.ComponentObject',
  'net.noodl.GlobalStore',
  'net.noodl.GlobalStore.Set',
  'net.noodl.GlobalStore.Subscribe',
  'net.noodl.OptimisticUpdate',
  'net.noodl.ParentComponentObject',
  'net.noodl.SetComponentObjectProperties',
  'net.noodl.SetParentComponentObjectProperties',
  'net.noodl.StateHistory',
  'net.noodl.StateHistory.Undo',
  'net.noodl.StateSnapshot'
]);

/** The parameter that holds a script node's code (the catalog's port name), for the line count. */
export const SCRIPT_TEXT_PARAMETER: Readonly<Record<string, string>> = Object.freeze({
  JavaScriptFunction: 'functionScript',
  Expression: 'expression',
  Javascript2: 'code',
  'Logic Builder': 'generatedCode'
});

export type HonestyClass = 'known' | 'script' | 'unspecced' | 'instance' | 'exempt';

/** A node as every project format carries it. */
export interface HonestyNode {
  id: string;
  type: string;
  label?: string;
  parameters?: Record<string, unknown>;
}

export interface HonestyComponent {
  /** The component's legacy name (`/Pages/Home`). */
  name: string;
  nodes: readonly HonestyNode[];
}

export interface HonestyOptions {
  /** The shipped catalog's type names. A type outside it that is not a component is a kit type. */
  coreTypes: Iterable<string>;
  /** The project's component legacy names; a type starting with `/` or `#` is an instance either way. */
  components?: Iterable<string>;
  /** The spec registry. Default: this package's. A planted spec flips a kit node to known (SEE-001 AC3). */
  specs?: Readonly<Record<string, Pick<AnyNodeSpec, 'contract'> | { contract?: unknown }>>;
  /** Default: `GRAPH_GRADED_TYPES`. */
  graphGraded?: readonly string[];
}

/** One script node, by name: what the number excludes. */
export interface ScriptPart {
  id: string;
  type: string;
  label?: string;
  /** Lines of script it carries (0 for a kit node: its code is in the kit). */
  lines: number;
  /** A kit node with no spec, rather than a T6 node. */
  kit: boolean;
}

export interface Honesty {
  known: number;
  script: number;
  unspecced: number;
  instances: number;
  exempt: number;
  /** known ÷ (known + script) × 100, one decimal; `null` when both are 0. */
  percent: number | null;
  scriptLines: number;
  /** The line-weighted figure (R-SEE-001-a), beside the headline. */
  percentByLines: number | null;
  scriptParts: ScriptPart[];
  /** Unspecced node count by type. */
  unspeccedTypes: Record<string, number>;
}

export interface ComponentHonesty extends Honesty {
  component: string;
}

export interface ProjectHonesty extends Honesty {
  components: ComponentHonesty[];
}

/** The rule, compiled once for a project: `(type) => class`. */
export function honestyClassifier(options: HonestyOptions): (type: string) => HonestyClass {
  const core = new Set(options.coreTypes);
  const components = new Set(options.components ?? []);
  const exempt = new Set(EXEMPT_TYPES);
  const scriptTypes = new Set(SCRIPT_TYPES);
  const specs = options.specs ?? REGISTRY;
  const graph = new Set(options.graphGraded ?? GRAPH_GRADED_TYPES);
  const known = (t: string) => {
    const spec = Object.prototype.hasOwnProperty.call(specs, t) ? specs[t] : undefined;
    const contract = spec && typeof spec.contract === 'string' && spec.contract.length > 0;
    return (!!spec && !contract) || graph.has(t);
  };
  return (type) => {
    if (typeof type !== 'string') return 'unspecced';
    if (type.startsWith('/') || type.startsWith('#') || components.has(type)) return 'instance';
    if (exempt.has(type)) return 'exempt';
    if (scriptTypes.has(type)) return 'script';
    if (known(type)) return 'known';
    if (!core.has(type)) return 'script'; // a kit type with no spec
    return 'unspecced';
  };
}

/** The lines of script a node carries (its `SCRIPT_TEXT_PARAMETER`); 0 for any other node. */
export function scriptLinesOf(node: HonestyNode): number {
  const param = SCRIPT_TEXT_PARAMETER[node.type];
  const text = param && node.parameters ? node.parameters[param] : undefined;
  return typeof text === 'string' && text.length > 0 ? text.split('\n').length : 0;
}

const percentOf = (n: number, d: number): number | null => (d > 0 ? Math.round((1000 * n) / d) / 10 : null);

function tally(nodes: readonly HonestyNode[], classify: (type: string) => HonestyClass): Honesty {
  const h: Honesty = { known: 0, script: 0, unspecced: 0, instances: 0, exempt: 0, percent: null, scriptLines: 0, percentByLines: null, scriptParts: [], unspeccedTypes: {} };
  let weight = 0;
  for (const node of nodes) {
    const cls = classify(node.type);
    if (cls === 'known') h.known++;
    else if (cls === 'instance') h.instances++;
    else if (cls === 'exempt') h.exempt++;
    else if (cls === 'unspecced') {
      h.unspecced++;
      h.unspeccedTypes[node.type] = (h.unspeccedTypes[node.type] ?? 0) + 1;
    } else {
      h.script++;
      const lines = scriptLinesOf(node);
      h.scriptLines += lines;
      weight += Math.max(1, lines);
      h.scriptParts.push({ id: node.id, type: node.type, ...(node.label ? { label: node.label } : {}), lines, kit: !SCRIPT_TYPES.includes(node.type) });
    }
  }
  h.percent = percentOf(h.known, h.known + h.script);
  h.percentByLines = percentOf(h.known, h.known + weight);
  return h;
}

/** One component's number and the script parts it excludes. */
export function componentHonesty(component: HonestyComponent, options: HonestyOptions, classify = honestyClassifier(options)): ComponentHonesty {
  return { component: component.name, ...tally(component.nodes, classify) };
}

/** The project's number: every node instance of every component, and each component's own. */
export function projectHonesty(components: readonly HonestyComponent[], options: HonestyOptions): ProjectHonesty {
  const classify = honestyClassifier({ ...options, components: [...(options.components ?? []), ...components.map((c) => c.name)] });
  const rows = components.map((c) => componentHonesty(c, options, classify));
  const all = tally(
    components.flatMap((c) => c.nodes),
    classify
  );
  return { ...all, components: rows };
}

/** A script part as a person reads it: its label, else its type and id. */
export function scriptPartName(part: ScriptPart): string {
  return part.label ? part.label : `${part.type} ${part.id}`;
}

/**
 * One line a person reads: "61% known (22 known, 14 script, 3 unspecced); script: `Compute pace`, `Format dossier` +3 more".
 * The parts are the largest first (by lines), at most `maxNames`; with `maxNames` 0, the head alone.
 */
export function honestyLine(h: Honesty, maxNames = 5): string {
  const head =
    h.percent === null
      ? `no known or script nodes (${h.unspecced} unspecced)`
      : `${h.percent}% known (${h.known} known, ${h.script} script${h.unspecced ? `, ${h.unspecced} unspecced` : ''})`;
  if (!h.scriptParts.length || maxNames <= 0) return head;
  const parts = [...h.scriptParts].sort((a, b) => b.lines - a.lines);
  const names = parts.slice(0, maxNames).map((p) => '`' + scriptPartName(p) + '`');
  const more = parts.length > maxNames ? ` +${parts.length - maxNames} more` : '';
  return `${head}; script: ${names.join(', ')}${more}`;
}

/** What the number is and is not — the paragraph every surface quotes, never paraphrases. */
export const HONESTY_SENTENCE =
  'The honesty number is the share of an app\'s nodes whose behaviour is specced and graded (known) against the nodes that ' +
  'hold code nobody has checked: Function, Script, Expression and Visual Function nodes, and kit nodes with no spec ' +
  '(script). It is known ÷ (known + script), counted by node instance; component instances are counted inside their ' +
  'component, and a shipped node still waiting for its spec is reported apart as unspecced. It is not a quality score: a ' +
  'Function written on purpose is still script. It says how much of the app can be explained without reading code, and the ' +
  'script list says which parts cannot.';
