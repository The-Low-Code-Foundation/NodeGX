/**
 * STYLE-002: Element Config Registry
 *
 * Singleton registry that maps node types to their ElementConfig definitions.
 * Used by the node creation hook to apply default styles and by the
 * VariantSelector UI to enumerate available variants.
 *
 * Usage:
 *   ElementConfigRegistry.get('net.noodl.controls.button')  // → ElementConfig
 *   ElementConfigRegistry.getVariants('Text')               // → string[]
 *   ElementConfigRegistry.applyDefaults(nodeModel)          // → stamps defaults
 *   ElementConfigRegistry.applyVariant(nodeModel, 'card')   // → stamps variant
 */

import { ButtonConfig } from './configs/ButtonConfig';
import { CheckboxConfig } from './configs/CheckboxConfig';
import { TextConfig } from './configs/TextConfig';
import { TextInputConfig } from './configs/TextInputConfig';
import { ElementConfig, ResolvedVariant, VariantConfig } from './ElementConfigTypes';

// ------------------------------------------------------------------
// Registry map
// ------------------------------------------------------------------

const _configs = new Map<string, ElementConfig>();

function register(config: ElementConfig): void {
  _configs.set(config.nodeType, config);
}

function get(nodeType: string): ElementConfig | undefined {
  return _configs.get(nodeType);
}

function has(nodeType: string): boolean {
  return _configs.has(nodeType);
}

function getAll(): ElementConfig[] {
  return Array.from(_configs.values());
}

// ------------------------------------------------------------------
// Variant helpers
// ------------------------------------------------------------------

function getVariantNames(nodeType: string): string[] {
  const config = _configs.get(nodeType);
  if (!config) return [];
  return Object.keys(config.variants);
}

/**
 * Resolve a variant into base styles and interaction state styles.
 * Strips the `states` key from base properties.
 */
function resolveVariant(nodeType: string, variantName: string): ResolvedVariant | undefined {
  const config = _configs.get(nodeType);
  if (!config) return undefined;

  const variant: VariantConfig | undefined = config.variants[variantName];
  if (!variant) return undefined;

  const baseStyles: Record<string, string> = {};
  for (const [key, value] of Object.entries(variant)) {
    if (key === 'states') continue;
    if (typeof value === 'string') {
      baseStyles[key] = value;
    }
  }

  return {
    baseStyles,
    states: variant.states ?? {}
  };
}

// ------------------------------------------------------------------
// Node model integration
// ------------------------------------------------------------------

/**
 * Minimal interface for a Noodl node model that the registry can interact with.
 * NodeGraphNode exposes a plain `parameters` object for reading/writing node properties.
 */
export interface NodeModelLike {
  /** The node's parameters bag — direct object access (camelCase CSS property keys). */
  parameters: Record<string, unknown>;
}

/**
 * Apply default styles from the element config to a newly-created node.
 * Only sets properties that haven't already been explicitly set on the node.
 * Uses `typeName` rather than reading from the node, because the node's type
 * may not yet be resolved when called from the creation flow.
 *
 * 🔴 **P94 STY-002 AC1: the `_variant` marker is no longer written, and the styles still are.**
 * The two were always separable and only one of them ever rendered anything. The values a new
 * Button gets are its **own** — that is a legal, and now the only other, state in the Look model
 * (`STY-DESIGN-THE-LOOK-MODEL.md` §1: a node wears a Look or its styles are its own) — while the
 * marker existed solely so the panel's `Preset` row could show a tick beside the name it had
 * stamped. That row is gone (AC5), and this was the last writer of the parameter in the product.
 *
 * ⚠️ **A newly created node is byte-identical apart from the missing marker**, which is what keeps
 * AC7 true: the marker never reached a port and the runtime dropped it
 * ([[a-rule-reading-zero-in-both-arms-grades-nothing]] is the trap avoided by asserting the
 * *styles* are unchanged rather than only that the marker is absent).
 *
 * @param node - A node model (must have a plain `parameters` object)
 * @param typeName - The node type identifier string (e.g. 'net.noodl.controls.button')
 */
function applyDefaults(node: NodeModelLike, typeName: string): void {
  const config = _configs.get(typeName);
  if (!config) return;

  const defaults = config.defaults;
  const variantName = defaults['_variant'];

  // Apply non-variant defaults (skip the _variant marker)
  for (const [key, value] of Object.entries(defaults)) {
    if (key === '_variant') continue;
    // Only stamp if not already set on this node
    if (node.parameters[key] === undefined || node.parameters[key] === null) {
      node.parameters[key] = value;
    }
  }

  // The named variant's styles on top, as its own values. No marker.
  if (variantName) {
    applyVariant(node, typeName, variantName);
  }
}

/**
 * Apply a named variant's base styles to a node.
 * Overwrites existing values — intentional when user switches variants.
 *
 * @param node - A node model (must have a plain `parameters` object)
 * @param typeName - The node type identifier string
 * @param variantName - e.g. 'primary', 'card', 'heading-1'
 */
function applyVariant(node: NodeModelLike, typeName: string, variantName: string): void {
  const resolved = resolveVariant(typeName, variantName);
  if (!resolved) return;

  for (const [key, value] of Object.entries(resolved.baseStyles)) {
    node.parameters[key] = value;
  }
  // P94 STY-002 AC1: no `_variant` marker. See `applyDefaults`.
}


// ------------------------------------------------------------------
// Register all built-in configs
//
// GroupConfig used to be here. It keyed on 'net.noodl.visual.group', which is
// not a node type — the real one is 'Group' (packages/noodl-viewer-react/src/
// nodes/visual/group.js) — so it never matched anything and had never applied
// to a single node. Deleted rather than repointed in REV-008: activating it
// would stamp var(--surface), var(--space-4) and friends onto every new Group
// node, and nothing defines those. See REV-009.
// ------------------------------------------------------------------

register(ButtonConfig);
register(CheckboxConfig);
register(TextConfig);
register(TextInputConfig);

// ------------------------------------------------------------------
// Public API
// ------------------------------------------------------------------

export const ElementConfigRegistry = {
  register,
  get,
  has,
  getAll,
  getVariantNames,
  resolveVariant,
  applyDefaults,
  applyVariant
} as const;
