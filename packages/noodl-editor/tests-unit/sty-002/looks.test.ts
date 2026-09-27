/**
 * P94 STY-002 — the Look model.
 *
 * Grades `models/Looks/looks.ts`: the shipped library becoming ordinary project Looks (AC2), their
 * state data surviving the trip (AC3), and a Look made out of a node (AC4).
 *
 * 🔴 **Why the state tests are the sharp ones.** The obvious implementation of AC3 — copy
 * `ElementConfig.states` into `VariantModel.stateParameters` — writes three keys the runtime never
 * asks for (`active`, `focus`, `placeholder`) and would pass any test that only checked the data
 * was "carried". These tests check the *consequence*: that what lands is keyed by the state names
 * a node type actually declares, and that what cannot land is reported rather than dropped
 * ([[verify-the-consequence-not-just-the-mechanism]]).
 */
import { ButtonConfig } from '../../src/editor/src/models/ElementConfigs/configs/ButtonConfig';
import { CheckboxConfig } from '../../src/editor/src/models/ElementConfigs/configs/CheckboxConfig';
import { TextConfig } from '../../src/editor/src/models/ElementConfigs/configs/TextConfig';
import { TextInputConfig } from '../../src/editor/src/models/ElementConfigs/configs/TextInputConfig';
import {
  PRESET_MARKERS,
  findLook,
  lookDisplayName,
  lookFromNode,
  shippedLook,
  shippedLooksFor,
  stripPresetMarkers,
  translateStateStyles
} from '../../src/editor/src/models/Looks/looks';

/** The control states, as `nodes/controls/utils.ts` declares them. */
const CONTROL_STATES = ['neutral', 'hover', 'pressed', 'focused', 'disabled'] as const;
/** A `Text` and a `Group` declare only these two (`nodes/visual/text.ts:9`). */
const TEXT_STATES = ['neutral', 'hover'] as const;

describe('STY-002 AC2 — the shipped library is a set of ordinary Looks', () => {
  it('is 22 Looks over four node types, counted off the configs and not quoted', () => {
    // 🔴 Counted here rather than asserted from the task file, which said 23 and named Text 14.
    // Text declares 13. The number belongs to the artefact.
    const counts = {
      [ButtonConfig.nodeType]: shippedLooksFor(ButtonConfig).length,
      [TextConfig.nodeType]: shippedLooksFor(TextConfig).length,
      [TextInputConfig.nodeType]: shippedLooksFor(TextInputConfig).length,
      [CheckboxConfig.nodeType]: shippedLooksFor(CheckboxConfig).length
    };
    expect(counts).toEqual({
      'net.noodl.controls.button': 6,
      Text: 13,
      'net.noodl.controls.textinput': 2,
      'net.noodl.controls.checkbox': 1
    });
    expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBe(22);
  });

  it('a Look is self-contained: the config defaults are in it, not only the variant', () => {
    const look = shippedLook(ButtonConfig, 'primary', CONTROL_STATES)!;
    // from the variant
    expect(look.parameters.backgroundColor).toBe('var(--primary)');
    expect(look.parameters.color).toBe('var(--primary-foreground)');
    // from the defaults — the half a node wearing this Look would otherwise not have
    expect(look.parameters.paddingLeft).toBe('var(--space-4)');
    expect(look.parameters.borderRadius).toBe('var(--radius-md)');
    expect(look.parameters.fontFamily).toBe('var(--font-sans)');
  });

  it('a variant property beats the default it shadows', () => {
    // `link` sets paddingLeft/Right to 0 over the defaults' var(--space-4).
    const look = shippedLook(ButtonConfig, 'link', CONTROL_STATES)!;
    expect(look.parameters.paddingLeft).toBe('0');
    expect(look.parameters.paddingRight).toBe('0');
    // and a default it says nothing about survives
    expect(look.parameters.paddingTop).toBe('var(--space-2)');
  });

  it('carries no preset marker, though the config declares one', () => {
    expect(ButtonConfig.defaults._variant).toBe('primary');
    const look = shippedLook(ButtonConfig, 'primary', CONTROL_STATES)!;
    for (const marker of PRESET_MARKERS) expect(look.parameters[marker]).toBeUndefined();
  });

  it('is named the way a person reads it, not the way the library keys it', () => {
    expect(shippedLook(TextConfig, 'heading-1', TEXT_STATES)!.name).toBe('Heading 1');
    expect(shippedLook(ButtonConfig, 'primary', CONTROL_STATES)!.name).toBe('Primary');
    expect(lookDisplayName('heading-6')).toBe('Heading 6');
    expect(lookDisplayName('blockquote')).toBe('Blockquote');
  });

  it('🔴 does not alias the shipped config — rule 4 says it never changes under you', () => {
    const look = shippedLook(ButtonConfig, 'primary', CONTROL_STATES)!;
    look.parameters.backgroundColor = 'hotpink';
    (look.stateParameters.hover as Record<string, unknown>).backgroundColor = 'hotpink';

    expect(ButtonConfig.variants.primary.backgroundColor).toBe('var(--primary)');
    expect((ButtonConfig.variants.primary.states as { hover: Record<string, string> }).hover.backgroundColor).toBe(
      'var(--primary-hover)'
    );
    // and a second copy is unaffected by the first being edited
    expect(shippedLook(ButtonConfig, 'primary', CONTROL_STATES)!.parameters.backgroundColor).toBe('var(--primary)');
  });

  it('an id the library does not hold is undefined, not an empty Look', () => {
    expect(shippedLook(ButtonConfig, 'no-such-variant', CONTROL_STATES)).toBeUndefined();
  });

  it('every Look names the type it dresses, which is half of its identity', () => {
    for (const look of shippedLooksFor(TextConfig, TEXT_STATES)) expect(look.typename).toBe('Text');
    expect(shippedLooksFor(ButtonConfig, CONTROL_STATES).every((l) => l.typename === 'net.noodl.controls.button')).toBe(
      true
    );
  });
});

describe('STY-002 AC3 — the library state data is carried, in the runtime’s own words', () => {
  it('translates the three states the library spells differently', () => {
    const { stateParameters, uncarried } = translateStateStyles(
      {
        hover: { backgroundColor: 'a' },
        active: { transform: 'scale(0.98)' },
        focus: { borderColor: 'c' },
        disabled: { opacity: '0.5' }
      },
      CONTROL_STATES
    );
    expect(Object.keys(stateParameters).sort()).toEqual(['disabled', 'focused', 'hover', 'pressed']);
    expect(stateParameters.pressed).toEqual({ transform: 'scale(0.98)' });
    expect(stateParameters.focused).toEqual({ borderColor: 'c' });
    expect(uncarried).toEqual([]);
  });

  it('🔴 `placeholder` is reported, not written — no node type has such a state', () => {
    const { stateParameters, uncarried } = translateStateStyles(
      { placeholder: { color: 'var(--muted-foreground)' } },
      CONTROL_STATES
    );
    expect(stateParameters).toEqual({});
    expect(uncarried).toEqual(['placeholder']);
  });

  it('🔴 a state the node type does not declare is reported too — a Text has no `disabled`', () => {
    const { stateParameters, uncarried } = translateStateStyles(
      { hover: { color: 'a' }, disabled: { opacity: '0.5' } },
      TEXT_STATES
    );
    expect(Object.keys(stateParameters)).toEqual(['hover']);
    expect(uncarried).toEqual(['disabled']);
  });

  it('the control: with no `knownStates` given, only the unmappable name is held back', () => {
    const { stateParameters, uncarried } = translateStateStyles(
      { hover: { color: 'a' }, disabled: { opacity: '0.5' }, placeholder: { color: 'b' } },
      undefined
    );
    expect(Object.keys(stateParameters).sort()).toEqual(['disabled', 'hover']);
    expect(uncarried).toEqual(['placeholder']);
  });

  it('an empty state block is not carried as an empty object', () => {
    const { stateParameters, uncarried } = translateStateStyles({ hover: {} }, CONTROL_STATES);
    expect(stateParameters).toEqual({});
    expect(uncarried).toEqual([]);
  });

  it('the eight configs with states keep them, and the report names what a TextInput loses', () => {
    const withStates = [
      ...shippedLooksFor(ButtonConfig, CONTROL_STATES),
      ...shippedLooksFor(TextInputConfig, CONTROL_STATES),
      ...shippedLooksFor(CheckboxConfig, [...CONTROL_STATES, 'checked'])
    ].filter((look) => Object.keys(look.stateParameters).length > 0 || look.uncarriedStates.length > 0);

    // 5 Button variants carry states, 2 TextInput, 1 Checkbox — the 8 the task file counted.
    expect(withStates.length).toBe(8);

    const primary = findLook(withStates, 'Primary', 'net.noodl.controls.button')!;
    expect(primary.stateParameters.hover).toEqual({ backgroundColor: 'var(--primary-hover)' });
    expect(primary.stateParameters.pressed).toEqual({ transform: 'scale(0.98)' });
    expect(primary.stateParameters.disabled).toEqual({ opacity: '0.5', cursor: 'not-allowed' });

    const input = shippedLooksFor(TextInputConfig, CONTROL_STATES)[0];
    expect(Object.keys(input.stateParameters)).toContain('focused');
    expect(input.uncarriedStates).toEqual(['placeholder']);
  });
});

describe('STY-002 AC4 — a Look made out of a node', () => {
  it('takes the node’s styles and drops the bookkeeping', () => {
    const look = lookFromNode('Card', 'Group', {
      parameters: {
        backgroundColor: 'var(--card)',
        borderRadius: 'var(--radius-lg)',
        _variant: 'heading-1',
        _size: 'lg'
      }
    });
    expect(look).toEqual({
      name: 'Card',
      typename: 'Group',
      parameters: { backgroundColor: 'var(--card)', borderRadius: 'var(--radius-lg)' },
      stateParameters: {}
    });
  });

  it('🔴 the shape a real project already holds: a Look whose parameters carry a stale marker', () => {
    // `members area Richard test` on this machine holds exactly this, because
    // `VariantModel.updateFromNode` merges every parameter a node has.
    const asStoredToday = {
      text: 'Hello World!',
      fontSize: 'var(--text-4xl)',
      color: 'var(--foreground)',
      _variant: 'heading-1'
    };
    expect(Object.keys(stripPresetMarkers(asStoredToday))).toEqual(['text', 'fontSize', 'color']);
    expect(asStoredToday._variant).toBe('heading-1'); // the argument is not mutated
  });

  it('carries a node’s own state parameters', () => {
    const look = lookFromNode('Pressable', 'net.noodl.controls.button', {
      parameters: { backgroundColor: 'var(--primary)' },
      stateParameters: { hover: { backgroundColor: 'var(--primary-hover)' } }
    });
    expect(look.stateParameters.hover).toEqual({ backgroundColor: 'var(--primary-hover)' });
  });

  it('does not alias the node it was made from', () => {
    const node = { parameters: { color: 'red' }, stateParameters: { hover: { color: 'blue' } } };
    const look = lookFromNode('L', 'Text', node);
    look.parameters.color = 'green';
    (look.stateParameters.hover as Record<string, unknown>).color = 'green';
    expect(node.parameters.color).toBe('red');
    expect(node.stateParameters.hover.color).toBe('blue');
  });

  it('a node with nothing set makes an empty Look rather than throwing', () => {
    expect(lookFromNode('Empty', 'Text', { parameters: {} })).toEqual({
      name: 'Empty',
      typename: 'Text',
      parameters: {},
      stateParameters: {}
    });
  });
});

describe('STY-002 — identity is name plus type, everywhere', () => {
  const looks = [
    { name: 'Primary', typename: 'net.noodl.controls.button' },
    { name: 'Primary', typename: 'Text' }
  ];

  it('the same name on two node types is two Looks', () => {
    expect(findLook(looks, 'Primary', 'Text')).toBe(looks[1]);
    expect(findLook(looks, 'Primary', 'net.noodl.controls.button')).toBe(looks[0]);
  });

  it('a name that dresses another type is not found for this one', () => {
    expect(findLook(looks, 'Primary', 'net.noodl.controls.checkbox')).toBeUndefined();
  });
});
