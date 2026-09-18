/**
 * STYLE-002: Element Config Types
 *
 * TypeScript interfaces for the element configuration and variant system.
 * Configs define default styles and pre-built variants for Noodl's core visual nodes,
 * so elements look good immediately on creation and offer quick style switching.
 */

/**
 * Style properties applied in a specific interaction state.
 */
export interface StateStyles {
  hover?: Record<string, string>;
  active?: Record<string, string>;
  focus?: Record<string, string>;
  disabled?: Record<string, string>;
  placeholder?: Record<string, string>;
}

/**
 * A named style variant for a node type.
 * Contains base CSS property overrides and optional interaction state styles.
 */
export interface VariantConfig {
  /** Base CSS properties for this variant (camelCase keys). */
  [property: string]: string | StateStyles | undefined;
  /** Interaction state style overrides. */
  states?: StateStyles;
}

/**
 * Full configuration for a node type.
 * Describes defaults applied on creation and named style variants.
 *
 * 🔴 **P94 STY-002 AC1 removed the size axis.** `_size` occurred **0 times across ~105 real
 * projects** (`scripts/devtools/sty002-preset-census.js`), so nothing was migrated and nothing was
 * taken from anyone — and a second styling axis cannot survive rule 1 ("one row decides it")
 * whatever its usage had been.
 */
export interface ElementConfig {
  /** Noodl node type identifier (e.g. 'net.noodl.controls.button'). */
  nodeType: string;

  /**
   * Default CSS property values applied when the node is first created.
   * Use `var(--token-name)` references to link to design tokens.
   * The special key `_variant` names the variant whose styles are seeded on top of these.
   *
   * ⚠️ **P94 STY-002 AC1: it is read, never written.** `applyDefaults` seeds the named variant's
   * values as the node's own and writes no marker — the `Preset` row that needed one is gone, and
   * a node's styles are either its own or a Look's.
   */
  defaults: Record<string, string>;

  /**
   * Named style variants. Keys are variant names (e.g. 'primary', 'card').
   * Each variant specifies CSS properties and optional interaction states.
   */
  variants: Record<string, VariantConfig>;
}

/**
 * Resolved variant styles — base styles with interaction states separated out.
 */
export interface ResolvedVariant {
  /** Flat CSS properties for the default (non-interacting) state. */
  baseStyles: Record<string, string>;
  /** Interaction state style overrides. */
  states: StateStyles;
}
