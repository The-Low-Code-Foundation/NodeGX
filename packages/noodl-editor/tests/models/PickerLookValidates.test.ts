/**
 * P112-S7-TEXTDEFAULTS — a node dropped from the picker carries nothing the editor's own validator calls wrong.
 *
 * `ElementConfigRegistry.applyDefaults` is the picker's look (`NodePicker.utils` `createNodeFunction`). STYLE-002's
 * `TextConfig.defaults` stamped five layout keys on every Text — `width`/`height` `"auto"`, `flexShrink`, `flexGrow`,
 * `minWidth` `"0"` — and the `SemanticValidator` read them as 2 errors and 4 warnings on a value the person never set.
 *
 * Measured before the keys went (viewer-react `p112-s7-textdefaults-width-auto.test.ts`): the runtime never read them
 * either. `"auto"` is not a size, so Text's width setter keeps its declared 100% and raises
 * `dimensions/not-a-dimension`; `flexShrink`/`flexGrow` are not Text ports. Dropping them changes no rendering.
 *
 * Every registered config and variant is graded, not only Text — and the census found the same class beside it: a
 * TextInput's `width: '100%'` / `height: 'auto'` strings (2 errors), `cursor` on Button and Checkbox and `boxShadow` on
 * five Button variants (no such ports), `borderWidth: '0'` with no border style. All removed but one; none was read.
 *
 * BETA-S9-BUTTONSHADOW (ruled 2026-10-26, "both have it"): the last one, `boxShadow` on three Button variants, became
 * the Button's own `boxShadowEnabled: true`. The second describe holds the three doors that read the configs to one
 * shadow, and grades every Look the vocabulary teaches through the same validator (it taught `'true'`, an error).
 * Mutant: put `width: 'auto'` back in `TextConfig.defaults` → the Text arm reddens naming `invalid-parameter-value`.
 */

import { ElementConfigRegistry } from '../../src/editor/src/models/ElementConfigs/ElementConfigRegistry';
import { shippedLook } from '../../src/editor/src/models/Looks/looks';
import { buildStyleVocabulary } from '../../src/editor/src/models/StyleTokensModel/StyleVocabulary';
import { SemanticValidator } from '../../src/editor/src/validation/SemanticValidator';
import { fromLegacyProject } from '../../src/editor/src/validation/normalize';

/** One page: a Group holding a single node of `type` that wears exactly the picker's look (then `variant`'s). */
function pageWith(type: string, variant?: string) {
  const node = { id: 'picked', type, parameters: {} as Record<string, unknown>, children: [] as never[] };
  ElementConfigRegistry.applyDefaults(node, type);
  if (variant) ElementConfigRegistry.applyVariant(node, type, variant);
  return pageAround(node);
}

function pageAround(node: { id: string; type: string; parameters: Record<string, unknown>; children: never[] }) {
  return {
    parameters: node.parameters,
    project: {
      components: [
        {
          name: '/App',
          graph: {
            roots: [{ id: 'root', type: 'Group', parameters: {}, children: [node] }],
            connections: []
          }
        }
      ]
    }
  };
}

/** Errors and warnings the validator raises on the node with id `picked`, as readable lines. */
function complaints(project: ReturnType<typeof pageAround>['project']): string[] {
  return new SemanticValidator()
    .validate(fromLegacyProject(project))
    .diagnostics.filter((d) => d.location.nodeId === 'picked' && (d.severity === 'error' || d.severity === 'warning'))
    .map((d) => `${d.severity} ${d.code} ${d.location.port ?? ''}: ${d.message}`);
}

const BUTTON = 'net.noodl.controls.button';
const SHADOW_KEYS = ['boxShadow', 'boxShadowEnabled', 'boxShadowSource', 'boxShadowToken'];
const shadowOf = (parameters: Record<string, unknown>) =>
  Object.fromEntries(SHADOW_KEYS.filter((k) => parameters[k] !== undefined).map((k) => [k, parameters[k]]));
const ON = { boxShadowEnabled: true };

describe('P112-S7-TEXTDEFAULTS — the picker look validates clean', () => {
  const types = ElementConfigRegistry.getAll().map((c) => c.nodeType);

  it('grades every registered config, Text among them', () => {
    expect(types).toContain('Text');
    expect(types.length).toBeGreaterThanOrEqual(4);
  });

  // The picker stamps the default variant; the others are graded too, so a look nothing applies yet cannot rot.
  const cases = types.flatMap((type) => [
    { type, variant: undefined as string | undefined },
    ...ElementConfigRegistry.getVariantNames(type).map((variant) => ({ type, variant }))
  ]);

  for (const { type, variant } of cases) {
    it(`${type}${variant ? ` / ${variant}` : ''}: no error or warning on the node the picker drops`, () => {
      const { parameters, project } = pageWith(type, variant);
      // The look arrived, so an empty list below is not a node with no parameters.
      expect(Object.keys(parameters).length).toBeGreaterThan(0);
      expect(complaints(project)).toEqual([]);
    });
  }

  it('Text keeps its typography tokens and wears no layout key', () => {
    const { parameters } = pageWith('Text');
    expect(parameters.fontFamily).toBe('var(--font-sans)');
    expect(parameters.color).toBe('var(--foreground)');
    for (const key of ['width', 'height', 'flexShrink', 'flexGrow', 'minWidth']) expect(parameters[key]).toBeUndefined();
  });
});

describe('BETA-S9-BUTTONSHADOW — a dropped Button and an agent\'s wear the same shadow', () => {
  const vocabulary = buildStyleVocabulary();
  const button = vocabulary.elements.find((e) => e.nodeType === BUTTON);

  it('the picker drops a Button with its own shadow port on, a real true', () => {
    expect(shadowOf(pageWith(BUTTON).parameters)).toEqual(ON);
  });

  it('the vocabulary teaches an agent the same shadow for the default look', () => {
    const primary = button?.looks.find((l) => l.id === 'primary');
    expect(primary).toBeDefined();
    expect(shadowOf({ ...button?.defaults, ...primary?.parameters })).toEqual(shadowOf(pageWith(BUTTON).parameters));
  });

  it('a shipped Look a person copies in carries it too', () => {
    const config = ElementConfigRegistry.get(BUTTON);
    expect(config).toBeDefined();
    if (!config) return;
    expect(shadowOf(shippedLook(config, 'primary')?.parameters ?? {})).toEqual(ON);
    for (const flat of ['outline', 'ghost', 'link']) expect(shadowOf(shippedLook(config, flat)?.parameters ?? {})).toEqual({});
  });

  // Every Look the vocabulary teaches, written as an agent is told to (defaults, then the Look), through the
  // validator. It taught `boxShadowEnabled: 'true'`, which the boolean check calls an error.
  for (const element of vocabulary.elements) {
    for (const look of element.looks) {
      it(`${element.nodeType} / ${look.id}: what the vocabulary teaches validates clean`, () => {
        const node = {
          id: 'picked',
          type: element.nodeType,
          parameters: { ...element.defaults, ...look.parameters } as Record<string, unknown>,
          children: [] as never[]
        };
        expect(complaints(pageAround(node).project)).toEqual([]);
      });
    }
  }
});
