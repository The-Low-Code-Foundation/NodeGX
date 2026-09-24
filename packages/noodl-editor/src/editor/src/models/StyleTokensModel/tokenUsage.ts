/**
 * P103 CMG-002 §3.2 / CMG-010 §3.3 — what wears a token, in one walk over a project.
 *
 * Richard, driving P102: *"'Used by 14 nodes on 3 pages' … the honest number is what makes a
 * beginner trust editing a shared token."* And before deleting a token they added: *"Used by N
 * places. They will fall back to their own value."*
 *
 * Three kinds of wearer, because they are three different things to a person: a **node** is a
 * place on a canvas they can be taken to; a **Look** is a rule that carries the token to whatever
 * wears the Look; another **token** (`--ring: var(--primary)`) is a value that follows this one.
 *
 * 🔴 **This file imports only the reference matcher, and takes the project as a parameter** —
 * for the reason `StylesModel.usage.ts` gives: reaching for `ProjectModel.instance` pulls
 * `bugtracker` in and the plain-Node runner cannot load it. The same walk serves CMG-002's
 * delete-confirm and CMG-010's *Used by* row, so the number on the row and the number in the
 * confirm are one reading ([[count-the-reach-first]]).
 *
 * 🔴 A node is scanned as TEXT (its parameters and every visual state's parameters serialised),
 * not by port list: a `var(--x)` can sit inside `"1px solid var(--border)"`, in a shadow, in a
 * gradient, on a port this walk has never heard of. Text cannot miss a location
 * (`TokenReferences.ts` says why). Its cost is an over-report on a label that happens to say
 * `var(--x)`, which a report can afford.
 */

import { collectTokenReferencesIn } from './TokenReferences';

/** One node that references the token, and enough to go and look at it (`StylesModel.usage.ts`'s shape). */
export interface TokenWearerNode {
  componentName: string;
  nodeId: string;
  label: string;
  typename: string;
  /** The parameter names on this node whose value names the token. */
  fields: string[];
}

export interface TokenUsage {
  nodes: TokenWearerNode[];
  looks: { name: string; typename: string }[];
  /** Other tokens whose value references this one. */
  tokens: string[];
}

/** The subset of a project this walk reads. Structural, so a spec can hand it a plain object. */
export interface TokenUsageProject {
  getComponents(): Array<{ name?: string; graph: { forEachNode(cb: (node: TokenUsageNode) => void): void } }>;
  getAllVariants(): Array<{ name?: string; typename?: string; parameters?: unknown; stateParameters?: unknown }>;
}

export interface TokenUsageNode {
  id: string;
  label?: unknown;
  typename?: unknown;
  parameters?: Record<string, unknown>;
  stateParameters?: Record<string, Record<string, unknown>>;
}

export function tokenUsageIn(
  project: TokenUsageProject | null | undefined,
  tokens: readonly { name: string; value: string }[],
  name: string
): TokenUsage {
  return tokenUsageAll(project, tokens).get(name) ?? { nodes: [], looks: [], tokens: [] };
}

/** Every token name a value references, once each. */
function referencesIn(value: unknown): string[] {
  return [...new Set(collectTokenReferencesIn(value))];
}

/**
 * P103 CMG-010 §3.3 — what wears EVERY token, in one walk.
 *
 * 🔴 **One walk, not one per row.** The Styles panel draws ~140 token rows and each wants its
 * *Used by*; `tokenUsageIn` per row would serialise every node of the project 140 times (the
 * reason `LooksSection` walks once per typename, P94 STY-006 AC6). Each node is read once here
 * and every reference it holds is filed under the token it names, so the map costs what one row
 * used to. `tokenUsageIn` is this map, read at one name — one reading for the confirm, the row
 * and the composer header ([[count-the-reach-first]]).
 *
 * A name no token has (a reference to something the project does not define) is filed too:
 * the map answers for what the project WEARS, not only for what it defines.
 */
export function tokenUsageAll(
  project: TokenUsageProject | null | undefined,
  tokens: readonly { name: string; value: string }[]
): Map<string, TokenUsage> {
  const map = new Map<string, TokenUsage>();
  const usageOf = (name: string) => {
    let usage = map.get(name);
    if (!usage) {
      usage = { nodes: [], looks: [], tokens: [] };
      map.set(name, usage);
    }
    return usage;
  };
  for (const token of tokens) usageOf(token.name);
  if (!project) return map;

  for (const component of project.getComponents()) {
    const componentName = component?.name ?? '';
    component.graph.forEachNode((node) => {
      const fieldsByToken = fieldsByTokenOf(node);
      if (fieldsByToken.size === 0) return;
      // 🔴 `node.label` is a getter that can throw on a node whose type never resolved — see
      // `StylesModel.usage.ts`. A token worn by something broken is exactly when the list matters.
      let label = '';
      try {
        label = typeof node.label === 'string' ? node.label : '';
      } catch {
        label = '';
      }
      const typename = typeof node.typename === 'string' ? node.typename : '';
      for (const [name, fields] of fieldsByToken) {
        usageOf(name).nodes.push({ componentName, nodeId: node.id, label, typename, fields: [...fields].sort() });
      }
      // 🔴 Nothing returned: `forEachNode` stops on a truthy return.
    });
  }

  for (const variant of project.getAllVariants()) {
    if (variant.name === undefined) continue;
    const named = new Set([...referencesIn(variant.parameters), ...referencesIn(variant.stateParameters)]);
    for (const name of named) usageOf(name).looks.push({ name: variant.name, typename: variant.typename ?? '' });
  }

  for (const token of tokens) {
    for (const name of referencesIn(token.value)) {
      if (name !== token.name) usageOf(name).tokens.push(token.name);
    }
  }

  return map;
}

/** token name → the parameter names (neutral and per state) on this node whose value names it. */
function fieldsByTokenOf(node: TokenUsageNode): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  const file = (key: string, value: unknown) => {
    for (const name of referencesIn(value)) {
      let fields = out.get(name);
      if (!fields) {
        fields = new Set();
        out.set(name, fields);
      }
      fields.add(key);
    }
  };
  for (const [key, value] of Object.entries(node.parameters ?? {})) file(key, value);
  for (const state of Object.values(node.stateParameters ?? {})) {
    for (const [key, value] of Object.entries(state ?? {})) file(key, value);
  }
  return out;
}

/**
 * CMG-010 §3.1 — the sentence over an edit that reaches every wearer: *"Changes --space-4
 * everywhere (14 places)"*, or, when nothing wears it, that it changes nothing yet.
 */
export function changesEverywhereText(name: string, usage: TokenUsage): string {
  const n = tokenUsageCount(usage);
  if (n === 0) return `Changes ${name} — nothing wears it yet`;
  return `Changes ${name} everywhere (${n} ${n === 1 ? 'place' : 'places'})`;
}

/** Everything that wears it, as one number. */
export function tokenUsageCount(usage: TokenUsage): number {
  return usage.nodes.length + usage.looks.length + usage.tokens.length;
}

/**
 * *"Used by 2 nodes, 1 Look and 1 token"*, or *"Nothing wears this yet"* — the §5 words.
 */
export function describeTokenUsage(usage: TokenUsage): string {
  const parts: string[] = [];
  const n = usage.nodes.length;
  const l = usage.looks.length;
  const t = usage.tokens.length;
  if (n) parts.push(`${n} ${n === 1 ? 'node' : 'nodes'}`);
  if (l) parts.push(`${l} ${l === 1 ? 'Look' : 'Looks'}`);
  if (t) parts.push(`${t} other ${t === 1 ? 'token' : 'tokens'}`);
  if (parts.length === 0) return 'Nothing wears this yet';
  if (parts.length === 1) return `Used by ${parts[0]}`;
  return `Used by ${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}
