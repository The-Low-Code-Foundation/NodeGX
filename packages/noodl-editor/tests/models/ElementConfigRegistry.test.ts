/**
 * STYLE-004: Unit tests for ElementConfigRegistry
 *
 * Covers: applyVariant, resolveVariant, getVariantNames, applyDefaults.
 *
 * 🔴 **P94 STY-002 AC1 removed two things this file used to cover**, and the removals are graded
 * here rather than just deleted:
 *
 * - the **`_variant` marker**. `applyVariant` and `applyDefaults` still stamp the variant's
 *   *styles*, because that is what a new Button looks like; they no longer write the parameter the
 *   retired `Preset` row read. Each assertion below pins **both halves** — the styles are still
 *   exactly what they were, *and* the marker is gone. Asserting only the absence would pass just
 *   as well against a function that had stopped stamping anything at all.
 * - the **size axis** (`applySize`, `getSizeNames`, `ButtonConfig.sizes`). `_size` occurred 0 times
 *   across ~105 real projects, and a second styling axis cannot survive design rule 1.
 */


import { ElementConfigRegistry, NodeModelLike } from '../../src/editor/src/models/ElementConfigs/ElementConfigRegistry';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeNode(): NodeModelLike {
  return { parameters: {} };
}

const BUTTON_TYPE = 'net.noodl.controls.button';

// Registered, but defines no sizes. Note the identifier is bare 'Text', not
// 'net.noodl.visual.text' — this spec had the latter, which matches no node type
// and no config, so the "no sizes" assertion below was passing for the wrong
// reason. Same class of bug as the deleted GroupConfig. REV-008.
const TEXT_TYPE = 'Text';

// Deliberately not a registered type, for the unknown-type paths.
const UNREGISTERED_TYPE = 'net.noodl.visual.group';

// ---------------------------------------------------------------------------
// applyVariant
// ---------------------------------------------------------------------------

describe('ElementConfigRegistry.applyVariant', () => {
  it('stamps base styles onto node parameters', () => {
    const node = makeNode();
    ElementConfigRegistry.applyVariant(node, BUTTON_TYPE, 'primary');

    expect(node.parameters['backgroundColor']).toBe('var(--primary)');
    expect(node.parameters['color']).toBe('var(--primary-foreground)');
  });

  // P94 STY-002 AC1. Paired with the assertion above on purpose: together they say "the styles
  // still arrive and the marker does not", which is the whole change. Alone, this one would pass
  // against a no-op.
  it('writes no _variant marker', () => {
    const node = makeNode();
    ElementConfigRegistry.applyVariant(node, BUTTON_TYPE, 'primary');

    expect(node.parameters['_variant']).toBeUndefined();
  });

  it('does not include the "states" key in stamped parameters', () => {
    const node = makeNode();
    ElementConfigRegistry.applyVariant(node, BUTTON_TYPE, 'primary');

    expect(node.parameters['states']).toBeUndefined();
  });

  it('switching variants replaces the styles, and still writes no marker', () => {
    const node = makeNode();
    ElementConfigRegistry.applyVariant(node, BUTTON_TYPE, 'primary');
    ElementConfigRegistry.applyVariant(node, BUTTON_TYPE, 'secondary');

    expect(node.parameters['backgroundColor']).toBe('var(--secondary)');
    expect(node.parameters['_variant']).toBeUndefined();
  });

  it('is a no-op for an unknown node type', () => {
    const node = makeNode();
    ElementConfigRegistry.applyVariant(node, 'unknown.type', 'primary');

    expect(node.parameters).toEqual({});
  });

  it('is a no-op for an unknown variant name', () => {
    const node = makeNode();
    ElementConfigRegistry.applyVariant(node, BUTTON_TYPE, 'nonexistent');

    expect(node.parameters).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// getVariantNames
// ---------------------------------------------------------------------------

describe('ElementConfigRegistry.getVariantNames', () => {
  it('returns all variant names for Button', () => {
    const variants = ElementConfigRegistry.getVariantNames(BUTTON_TYPE);
    expect(variants).toContain('primary');
    expect(variants).toContain('secondary');
    expect(variants).toContain('outline');
    expect(variants).toContain('ghost');
    expect(variants).toContain('destructive');
    expect(variants).toContain('link');
  });

  it('returns empty array for unknown type', () => {
    expect(ElementConfigRegistry.getVariantNames('unknown.type')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// resolveVariant
// ---------------------------------------------------------------------------

describe('ElementConfigRegistry.resolveVariant', () => {
  it('returns baseStyles and states', () => {
    const resolved = ElementConfigRegistry.resolveVariant(BUTTON_TYPE, 'primary');
    expect(resolved).toBeDefined();
    expect(resolved!.baseStyles['backgroundColor']).toBe('var(--primary)');
    expect(resolved!.states.hover).toBeDefined();
  });

  it('does not include "states" key inside baseStyles', () => {
    const resolved = ElementConfigRegistry.resolveVariant(BUTTON_TYPE, 'primary');
    expect('states' in resolved!.baseStyles).toBe(false);
  });

  it('returns undefined for unknown type', () => {
    expect(ElementConfigRegistry.resolveVariant('unknown.type', 'primary')).toBeUndefined();
  });

  it('returns undefined for unknown variant', () => {
    expect(ElementConfigRegistry.resolveVariant(BUTTON_TYPE, 'nonexistent')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// applyDefaults
// ---------------------------------------------------------------------------

describe('ElementConfigRegistry.applyDefaults', () => {
  it('applies default styles and the default variant\'s styles', () => {
    const node = makeNode();
    ElementConfigRegistry.applyDefaults(node, BUTTON_TYPE);

    // Default variant is 'primary', so its styles should be applied
    expect(node.parameters['backgroundColor']).toBe('var(--primary)');
    // Base defaults
    expect(node.parameters['borderRadius']).toBe('var(--radius-md)');
    expect(node.parameters['cursor']).toBe('pointer');
  });

  // P94 STY-002 AC1/AC7 — what a newly created node carries is unchanged **apart from** the
  // marker, which is the claim AC7 rests on. `applyDefaults` is the canvas creation path
  // (`NodeOperations.createNewNode`) and the Layers drop path both call it.
  it('creates a node with no preset markers of either kind', () => {
    const node = makeNode();
    ElementConfigRegistry.applyDefaults(node, BUTTON_TYPE);

    expect(node.parameters['_variant']).toBeUndefined();
    expect(node.parameters['_size']).toBeUndefined();
    // …and the node is not empty, so the two absences above are not vacuous.
    expect(Object.keys(node.parameters).length).toBeGreaterThan(5);
  });

  it('does not overwrite already-set parameters', () => {
    const node = makeNode();
    node.parameters['cursor'] = 'default';
    ElementConfigRegistry.applyDefaults(node, BUTTON_TYPE);
    // Pre-existing value should be preserved
    expect(node.parameters['cursor']).toBe('default');
  });

  it('is a no-op for unknown type', () => {
    const node = makeNode();
    ElementConfigRegistry.applyDefaults(node, 'unknown.type');
    expect(node.parameters).toEqual({});
  });
});
