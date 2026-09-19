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
 * Every style name of `portType` that anything in `project` names, with what names it.
 *
 * 🔴 **This is the ONLY walk.** `views/TextStylePicker/utils.js` asked the identical question one
 * name at a time (`getStyleUsage(portType, styleName)`) for the two delete-confirm modals, and it
 * delegates here rather than keeping a second copy — the panel lists thirty styles at once and a
 * per-name call would walk every component thirty times, which is exactly the pressure that
 * produces a faster second copy that then drifts from the first.
 * ([[a-second-copy-of-a-palette-drifts-silently]].)
 *
 * 🔴 **A node counts ONCE however many of its ports name the style.** `getStyleUsage` used `.some()`
 * and its modal says "used by N nodes"; counting port references instead would make that sentence
 * wrong for any node that sets both `textColor` and `backgroundColor` to the same style.
 *
 * 🔴 **The `forEachNode` callback returns NOTHING on purpose.** That walk stops the moment a
 * callback returns a truthy value, so `return counts[name]++` — or any accumulate-and-return —
 * would abort at the first node that names a style and report 1 for every style in the project.
 * `ProjectModel.variantWearerCounts` carries the same warning for the same reason.
 */
export function styleUsageIn(project, portType: string): Record<string, StyleUsage> {
  const usage: Record<string, StyleUsage> = {};
  if (!project) return usage;

  const record = (nodeOrVariant, field: keyof StyleUsage) => {
    for (const styleName of stylesNamedBy(nodeOrVariant, portType)) {
      const entry = (usage[styleName] ??= { nodeCount: 0, variantCount: 0 });
      entry[field]++;
    }
  };

  project.getComponents().forEach((c) => {
    c.graph.forEachNode((node) => {
      record(node, 'nodeCount');
    });
  });

  for (const variant of project.getAllVariants()) {
    record(variant, 'variantCount');
  }

  return usage;
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
