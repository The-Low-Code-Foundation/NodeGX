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
 * ⚠️ The one left: `boxShadow` on three Button variants. The style vocabulary turns it into `boxShadowEnabled` for
 * an agent's Button, so removing it would change what agents build; BETA-S9-BUTTONSHADOW asks whether a dropped
 * Button should wear that shadow too. It is allowed by name and asserted to STILL fire, so it cannot hide anything.
 * Mutant: put `width: 'auto'` back in `TextConfig.defaults` → the Text arm reddens naming `invalid-parameter-value`.
 */

import { ElementConfigRegistry } from '../../src/editor/src/models/ElementConfigs/ElementConfigRegistry';
import { SemanticValidator } from '../../src/editor/src/validation/SemanticValidator';
import { fromLegacyProject } from '../../src/editor/src/validation/normalize';

/** One page: a Group holding a single node of `type` that wears exactly the picker's look (then `variant`'s). */
function pageWith(type: string, variant?: string) {
  const node = { id: 'picked', type, parameters: {} as Record<string, unknown>, children: [] as never[] };
  ElementConfigRegistry.applyDefaults(node, type);
  if (variant) ElementConfigRegistry.applyVariant(node, type, variant);
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

/**
 * Ruling pending, by (type, port, code): see the header. Every Button case carries it, because the picker stamps the
 * default `primary` first and a later variant without a `boxShadow` of its own leaves that one in place.
 */
const AWAITING_BUTTONSHADOW = 'net.noodl.controls.button/boxShadow/unknown-parameter';

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
      const all = new SemanticValidator()
        .validate(fromLegacyProject(project))
        .diagnostics.filter((d) => d.location.nodeId === 'picked' && (d.severity === 'error' || d.severity === 'warning'));
      const awaited = (d: (typeof all)[number]) => `${type}/${d.location.port}/${d.code}` === AWAITING_BUTTONSHADOW;
      expect(all.filter((d) => !awaited(d)).map((d) => `${d.severity} ${d.code} ${d.location.port ?? ''}: ${d.message}`)).toEqual([]);
      expect(all.filter(awaited).length).toBe(AWAITING_BUTTONSHADOW.startsWith(`${type}/`) ? 1 : 0);
    });
  }

  it('Text keeps its typography tokens and wears no layout key', () => {
    const { parameters } = pageWith('Text');
    expect(parameters.fontFamily).toBe('var(--font-sans)');
    expect(parameters.color).toBe('var(--foreground)');
    for (const key of ['width', 'height', 'flexShrink', 'flexGrow', 'minWidth']) expect(parameters[key]).toBeUndefined();
  });
});
