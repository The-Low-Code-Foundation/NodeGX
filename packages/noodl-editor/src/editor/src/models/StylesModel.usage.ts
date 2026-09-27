/**
 * P94 STY-005 AC3 — what names each style, in one walk over a project.
 *
 * 🔴 **This file imports NOTHING, and that is deliberate.** It lived inside `StylesModel.ts` for
 * exactly as long as it took to try to grade it: `StylesModel` imports `projectmodel`, which pulls
 * `projectmodel.modules` → `bugtracker`, whose *module body* reads `platform.getUserDataPath()`
 * and throws under jest before a single test runs. Taking the project as a **parameter** instead of
 * reaching for `ProjectModel.instance` is what makes the answer checkable at all.
 * ([[an-import-added-for-a-feature-can-switch-a-sibling-gate-off]] — the same wall, from the other
 * side.)
 */

/** What names a style: nodes on a canvas, and Looks that carry it for whatever wears them. */
export interface StyleUsage {
  nodeCount: number;
  variantCount: number;
}

/**
 * One node that names a style, or wears a Look — **and enough to go and look at it.**
 *
 * P94 STY-006 AC1. `componentName` is the component's `name`, which is what
 * `ProjectModel.getComponentWithName` takes; the caller resolves it to a `ComponentModel` at the
 * moment of the press rather than this walk holding one, because a list drawn a minute ago can
 * name a component that has since been deleted and a stale model reference is a crash where a
 * failed lookup is a no-op.
 *
 * 🔴 `label` is what a PERSON calls this node. It is read defensively: `NodeGraphNode.label` falls
 * through to `this.type.labelForNode(this)`, which reaches the type registry, so on a node whose
 * type never resolved it throws — and a wearer list that throws while being built takes the whole
 * panel down over one broken node. An empty label is a row that prints its type instead (AC4).
 */
export interface Wearer {
  componentName: string;
  nodeId: string;
  label: string;
  typename: string;
}

/** A Look that names a style. It is a rule, not a place, so it carries no `nodeId` (STY-006 §2). */
export interface VariantRef {
  name: string;
  typename: string;
}

/** Everything that names one style: places you can go, and rules that set it. */
export interface StyleWearers {
  nodes: Wearer[];
  variants: VariantRef[];
}

/**
 * The two style types that live on a port, and the port type each is stored as.
 *
 * `renameStylesOnNodes` held the only copy of this mapping as a `switch`; it reads from here now,
 * so a third style type cannot be taught to one of them and not the other.
 */
export const STYLE_PORT_TYPES: Record<string, string> = {
  text: 'textStyle',
  colors: 'color'
};

/**
 * How many things name each style of `portType`.
 *
 * 🔴 **A `.length` over {@link styleWearersIn}, and never its own walk.** The panel prints this
 * number and, since STY-006, draws the list it came from directly underneath it — so the two are
 * one answer read twice, not two answers that happen to agree today.
 */
export function styleUsageIn(project, portType: string): Record<string, StyleUsage> {
  const usage: Record<string, StyleUsage> = {};

  for (const [name, wearers] of Object.entries(styleWearersIn(project, portType))) {
    usage[name] = { nodeCount: wearers.nodes.length, variantCount: wearers.variants.length };
  }

  return usage;
}

/**
 * Every style name of `portType` that anything in `project` names, with **what** names it —
 * by identity, not by tally. P94 STY-006 AC1.
 *
 * 🔴 **This is the ONE walk, and `styleUsageIn` is now a `.length` over its answer.** STY-005
 * shipped the counts and STY-006 shipped the lists, and the obvious build was a second traversal
 * beside the first — which is the shape that makes a row say `9×` above eight lines and leaves
 * nobody able to say which half is lying. A count derived from the list it sits above cannot
 * disagree with it. ([[a-second-copy-of-a-palette-drifts-silently]]; the same move that made
 * `views/TextStylePicker/utils.js` delegate here at s8 rather than keep its own per-name walk.)
 *
 * 🔴 **A node appears ONCE however many of its ports name the style** — `stylesNamedBy` returns a
 * `Set`, and the delete-confirm's "used by N nodes" was written against that reading.
 *
 * 🔴 **The `forEachNode` callback returns NOTHING on purpose.** That walk stops the moment a
 * callback returns a truthy value, so `return list.push(...)` — push returns the new length —
 * would abort at the first node that names a style and report exactly one wearer for every style
 * in the project. [[foreachnode-stops-on-a-truthy-return]].
 */
export function styleWearersIn(project, portType: string): Record<string, StyleWearers> {
  const wearers: Record<string, StyleWearers> = {};
  if (!project) return wearers;

  const entryFor = (name: string) => (wearers[name] ??= { nodes: [], variants: [] });

  project.getComponents().forEach((component) => {
    const componentName = component?.name ?? '';

    component.graph.forEachNode((node) => {
      for (const styleName of stylesNamedBy(node, portType)) {
        entryFor(styleName).nodes.push(describeNode(node, componentName));
      }
      // 🔴 Nothing returned. See the note above — a truthy return ends the walk.
    });
  });

  for (const variant of project.getAllVariants()) {
    for (const styleName of stylesNamedBy(variant, portType)) {
      entryFor(styleName).variants.push({ name: variant.name, typename: variant.typename });
    }
  }

  return wearers;
}

/**
 * Every node wearing each Look of `typename`, keyed by the Look's name. P94 STY-006 AC6.
 *
 * 🔴 **Matched by NAME and typename, never by object identity**, which is what
 * `ProjectModel.variantWearerCounts` has always done and what this replaces the body of. The
 * difference is not academic: a node can hold a `VariantModel` that is not the project's — measured
 * at s7 with three disagreeing names at once (STY-003 §2f defect 1) — and identity matching would
 * make the list and the count disagree about a node **neither of them broke**. They are wrong
 * together about the ghost or right together about the name; they are never half of each.
 */
export function lookWearersIn(project, typename: string): Record<string, Wearer[]> {
  const wearers: Record<string, Wearer[]> = {};
  if (!project) return wearers;

  project.getComponents().forEach((component) => {
    const componentName = component?.name ?? '';

    component.graph.forEachNode((node) => {
      const variant = node.variant;
      if (variant?.name !== undefined && variant.typename === typename) {
        (wearers[variant.name] ??= []).push(describeNode(node, componentName));
      }
      // 🔴 Nothing returned.
    });
  });

  return wearers;
}

/**
 * A node, as a place a person can be taken to.
 *
 * 🔴 **`node.label` is read in a `try`.** Its getter falls through to `this.type.labelForNode(this)`
 * when the node has no label of its own, and `type` is a string on a node whose type never
 * resolved — so on a project carrying one unknown node type, an unguarded read throws while the
 * panel is rendering a list and takes the editor window with it. A style being worn by something
 * broken is precisely when you most want the list.
 */
function describeNode(node, componentName: string): Wearer {
  let label = '';
  try {
    label = typeof node.label === 'string' ? node.label : '';
  } catch {
    label = '';
  }

  return {
    componentName,
    nodeId: node.id,
    label,
    typename: typeof node.typename === 'string' ? node.typename : ''
  };
}

/**
 * The DISTINCT style names of `portType` that this node or Look names — across its own parameters
 * and every visual state. Distinct, so a caller counting these counts things, not references.
 */
function stylesNamedBy(nodeOrVariant, portType: string): Set<string> {
  const stylePortNames = nodeOrVariant
    .getPorts('input')
    .filter((p) => (p.type.name || p.type) === portType)
    .map((p) => p.name);

  const named = new Set<string>();

  const take = (params) => {
    if (!params) return;
    for (const port of stylePortNames) {
      const value = params[port];
      if (typeof value === 'string' && value.length > 0) named.add(value);
    }
  };

  if (nodeOrVariant.stateParameters) {
    for (const state of Object.keys(nodeOrVariant.stateParameters)) {
      take(nodeOrVariant.stateParameters[state]);
    }
  }

  take(nodeOrVariant.parameters);

  return named;
}
