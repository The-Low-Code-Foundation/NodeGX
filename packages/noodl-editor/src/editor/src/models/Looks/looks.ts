/**
 * P94 STY-002 — the Look model.
 *
 * A **Look** is a named bundle of style parameters for one node type. Any number of nodes wear it;
 * change it once and every node wearing it changes. A node either wears a Look or its styles are
 * its own — there is no third state and no second mechanism that also sets styles
 * (`STY-DESIGN-THE-LOOK-MODEL.md` §1).
 *
 * Underneath, a Look is what `VariantModel` already is, and the runtime already resolves it
 * (`nodescope.ts` → `Variants.getVariant`, applied as `mergeDeep(variant.parameters)` then
 * `mergeDeep(model.parameters)`). **Nothing here invents a mechanism.** What this module adds is
 * the one piece the design needs and the product never had: turning a *shipped* look — phase 9's
 * `ElementConfig` variants, which until now were stamped into a node's own parameters and forgotten
 * — into an ordinary Look the project owns (design §1.1, rule 4).
 *
 * 🔴 **Deliberately pure**: plain data in, plain data out, no `ProjectModel`, no `NodeGraphNode`, no
 * registry singleton. That is what lets `tests-unit/` grade it without a renderer, and it is also
 * what makes the two translations below provable rather than asserted.
 *
 * @module noodl-editor/models/Looks
 */

import type { ElementConfig, StateStyles } from '../ElementConfigs/ElementConfigTypes';

/**
 * The two parameters the preset system used as bookkeeping, never as style.
 *
 * `_variant` held the name of the `ElementConfig` variant last stamped onto a node and `_size` the
 * size preset; both were written into `node.parameters` beside real style values. They are removed
 * wherever a Look is built, for a reason that is measured rather than tidy: a real project on this
 * machine (`members area Richard test`) holds a Look whose parameters contain
 * `"_variant": "heading-1"`, because `VariantModel.updateFromNode` merges *every* parameter a node
 * has. Carried into a Look, a marker becomes a style property that no node type declares — and the
 * exporter reports exactly that as an unmapped parameter.
 */
export const PRESET_MARKERS = ['_variant', '_size'] as const;

/** A named bundle of style parameters for one node type — the only style concept. */
export interface LookDefinition {
  /** What a person sees and picks. Unique together with `typename`. */
  name: string;
  /** The node type this Look dresses, e.g. `net.noodl.controls.button`. */
  typename: string;
  /** The styles the Look lends every node wearing it. */
  parameters: Record<string, unknown>;
  /** Per visual state, the styles that state lends. Keyed by the *runtime's* state names. */
  stateParameters: Record<string, Record<string, unknown>>;
}

/** A Look built from the shipped library, with what could not come along. */
export interface ShippedLook extends LookDefinition {
  /** The library id this was copied from (`primary`, `heading-1`) — not stored on the Look. */
  shippedFrom: string;
  /**
   * State styles the shipped library declares that the runtime has no state for, so they are
   * **reported, not silently written**. See `RUNTIME_STATE_NAMES`.
   */
  uncarriedStates: string[];
}

/**
 * 🔴 **The shipped library and the runtime do not use the same words for the same states, and
 * copying the keys across would write data nothing ever reads.**
 *
 * Measured: a node type declares its states as `visualStates`, and for the controls that is
 * `neutral, hover, pressed, focused, disabled` (+`checked` on a Checkbox) —
 * `noodl-viewer-react/src/nodes/controls/utils.ts:76-86`; a `Text` and a `Group` declare only
 * `neutral, hover` (`nodes/visual/text.ts:9`, `nodes/visual/group.ts:26`). The runtime then reads
 * `variant.stateParameters[state]` for the states a node is *currently in*
 * (`react-component-node.ts:1859`), so a key it never enters is dead weight that reads as carried.
 *
 * `ElementConfig.StateStyles` spells three of them differently, and one of them is not a state at
 * all: `placeholder` is a CSS pseudo-element, and no node type has a `placeholder` visual state. It
 * maps to nothing on purpose.
 */
export const RUNTIME_STATE_FOR_CONFIG_STATE: Readonly<Record<keyof StateStyles, string | null>> = {
  hover: 'hover',
  active: 'pressed',
  focus: 'focused',
  disabled: 'disabled',
  placeholder: null
};

/** A shallow-free copy, so a Look never aliases the module-level config it came from. */
function deepCopy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** The same parameters without the preset bookkeeping. Never mutates its argument. */
export function stripPresetMarkers(parameters: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parameters)) {
    if ((PRESET_MARKERS as readonly string[]).includes(key)) continue;
    out[key] = value;
  }
  return out;
}

/**
 * Translates the shipped library's state styles into the runtime's state vocabulary.
 *
 * @param states - `ElementConfig` state styles.
 * @param knownStates - The `visualStates` this node type actually declares, when the caller knows
 *   them. A state the type does not declare is reported rather than written, for the same reason a
 *   misspelled one is: on a `Text`, which has only `neutral` and `hover`, a `disabled` block can
 *   never be entered.
 * @returns the runtime-keyed state parameters, and the config state names that could not come.
 */
export function translateStateStyles(
  states: StateStyles | undefined,
  knownStates?: readonly string[]
): { stateParameters: Record<string, Record<string, unknown>>; uncarried: string[] } {
  const stateParameters: Record<string, Record<string, unknown>> = {};
  const uncarried: string[] = [];
  if (states === undefined) return { stateParameters, uncarried };

  for (const [configState, styles] of Object.entries(states)) {
    if (styles === undefined || Object.keys(styles).length === 0) continue;
    const runtimeState = RUNTIME_STATE_FOR_CONFIG_STATE[configState as keyof StateStyles];
    if (runtimeState === null || runtimeState === undefined) {
      uncarried.push(configState);
      continue;
    }
    if (knownStates !== undefined && !knownStates.includes(runtimeState)) {
      uncarried.push(configState);
      continue;
    }
    stateParameters[runtimeState] = deepCopy(styles) as Record<string, unknown>;
  }

  return { stateParameters, uncarried };
}

/**
 * `heading-1` → `Heading 1`, `primary` → `Primary`. The library's ids were never shown to anyone;
 * a Look's name is.
 */
export function lookDisplayName(shippedId: string): string {
  return shippedId
    .split(/[-_\s]+/)
    .filter((word) => word.length > 0)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * One shipped look, as a Look the project can own.
 *
 * 🔴 **A Look is self-contained.** Its parameters are the config's `defaults` *plus* the variant's
 * own properties, not the variant alone — because under this model a node wearing a Look may carry
 * no style parameters of its own at all, and `defaults` is where a Button's padding, radius and
 * font live. The preset system got away with splitting them only because it stamped both onto the
 * node.
 *
 * 🔴 **`sizes` are not part of the library.** Design §8's AC2 lists the variants and not the four
 * size presets, and the population agrees: `_size` occurs **0 times in 105 projects on this
 * machine** and 0 times across the seven shipped templates. A size was a second axis, and a second
 * axis cannot survive rule 1 ("one row decides it") without multiplying the library by four. A
 * person who wants a larger Primary edits their copy of it.
 */
export function shippedLook(config: ElementConfig, shippedId: string, knownStates?: readonly string[]): ShippedLook | undefined {
  const variant = config.variants[shippedId];
  if (variant === undefined) return undefined;

  const parameters = stripPresetMarkers(deepCopy(config.defaults));
  for (const [key, value] of Object.entries(variant)) {
    if (key === 'states') continue;
    if (typeof value !== 'string') continue;
    parameters[key] = value;
  }

  const { stateParameters, uncarried } = translateStateStyles(variant.states, knownStates);

  return {
    name: lookDisplayName(shippedId),
    typename: config.nodeType,
    parameters,
    stateParameters,
    shippedFrom: shippedId,
    uncarriedStates: uncarried
  };
}

/** Every shipped look for one node type, in the order the config declares them. */
export function shippedLooksFor(config: ElementConfig, knownStates?: readonly string[]): ShippedLook[] {
  return Object.keys(config.variants)
    .map((id) => shippedLook(config, id, knownStates))
    .filter((look): look is ShippedLook => look !== undefined);
}

/** What a node contributes to a Look made out of it. */
export interface NodeStylesSource {
  parameters: Record<string, unknown>;
  stateParameters?: Record<string, Record<string, unknown>>;
}

/**
 * STY-002 AC4's pure half — a Look made from what a node is wearing right now, which is the entry
 * point the 105-project scan says nobody has ever found.
 *
 * The node's own parameters are copied as they are, minus the preset markers: a node that was
 * stamped by a preset carries the *result* of that stamp, and the result is exactly the look a
 * person wants to keep. What they do not want is a Look that remembers which preset made it.
 */
export function lookFromNode(name: string, typename: string, node: NodeStylesSource): LookDefinition {
  return {
    name,
    typename,
    parameters: stripPresetMarkers(deepCopy(node.parameters ?? {})),
    stateParameters: deepCopy(node.stateParameters ?? {})
  };
}

/**
 * Whether a Look of this name already dresses this node type. A Look is identified by `name` +
 * `typename` everywhere — in `nodegx.styles.json`, in `ProjectModel.createNewVariant`, in the
 * runtime's lookup and in the exporter.
 */
export function findLook<T extends { name: string; typename: string }>(
  looks: readonly T[],
  name: string,
  typename: string
): T | undefined {
  return looks.find((look) => look.name === name && look.typename === typename);
}
