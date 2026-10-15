/**
 * A Dropdown's placeholder fades as the runtime's does (P18-S110-PLACEHOLDEROPACITY; EXP-008, P18 session 112).
 *
 * The runtime draws the placeholder as its own label, `<span style={{ opacity: placeholderOpacity }}>` over a
 * transparent native select (`Select.tsx`), so only the text fades. The export's placeholder is the hidden option
 * `renderSelect` selects; its fade is the select's text colour while that option is the checked one, mixed toward
 * transparent by the same factor, with the open list's options kept at full colour. The port defaults to 0.5, so
 * every exported Dropdown with a placeholder wears the rule.
 *
 * Rendered before it was written (`dev-docs/tasks/phase-18-code-export-v2/s112-placeholder-render/`): the runtime,
 * HEAD's export and the patched export, three Dropdowns. The visible fade is 0.5 / 1 / 0.3 in the runtime, 1 / 1 / 1
 * at HEAD, and 0.5 / 1 / 0.3 patched.
 */
import * as path from 'path';

import { Catalog, loadCatalog } from '../src/catalog';
import { emitApp } from '../src/emit/emitApp';
import { parseProject } from '../src/parse/parseProject';
import { ComponentIR, ExportIR, ParamValue } from '../src/ir/types';

const catalog: Catalog = loadCatalog();
const baseIr = parseProject(path.join(__dirname, 'fixtures', 'cheer'), catalog);

const lit = (value: string | number | boolean): ParamValue => ({ kind: 'literal', value });
const ITEMS: ParamValue = { kind: 'json', value: [{ Label: 'Small', Value: 's' }, { Label: 'Large', Value: 'l' }] };

/** One component holding one Dropdown, `pick`, with the given parameters beside its items. */
const emitPick = (params: Record<string, ParamValue>) => {
  const component: ComponentIR = {
    id: 'picker',
    path: 'Components/Picker',
    role: 'component',
    connections: [],
    intent: { nodeComments: [], wireLabels: [], regions: [] },
    nodes: [
      { id: 'shell', type: 'Group', catalogRef: 'Group', parameters: [], declaredPorts: [], portKnowledge: 'complete', children: ['pick'] },
      {
        id: 'pick',
        type: 'net.noodl.controls.options',
        catalogRef: 'net.noodl.controls.options',
        parameters: Object.entries({ items: ITEMS, ...params })
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => (a.name < b.name ? -1 : 1)),
        declaredPorts: [],
        portKnowledge: 'complete',
        parent: 'shell'
      }
    ]
  } as ComponentIR;
  const ir: ExportIR = structuredClone(baseIr);
  ir.components.push(component);
  ir.components.sort((a, b) => (a.path < b.path ? -1 : 1));
  const app = emitApp(ir, catalog);
  return { css: app.files['src/components/Picker.module.css'], tsx: app.files['src/components/Picker.tsx'], notes: app.notes.join('\n') };
};

const fade = (color: string, percent: string) =>
  `.pick:has(> option[hidden]:checked) {\n  color: color-mix(in srgb, ${color} ${percent}, transparent);\n}`;
const full = (color: string) => `.pick:has(> option[hidden]:checked) > option {\n  color: ${color};\n}`;
const PLACEHOLDER = { placeholder: lit('Choose a size') };

describe('the fade is carried', () => {
  it('at the default, 0.5, on the text the select draws when nothing is authored (FieldText)', () => {
    const { css, tsx } = emitPick(PLACEHOLDER);
    expect(css).toContain(fade('FieldText', '50%'));
    expect(css).toContain(full('FieldText'));
    // The selector names what renderSelect emits: the placeholder is the one hidden option.
    expect(tsx).toContain('<option value="" disabled hidden>Choose a size</option>');
  });

  it('an authored opacity and colour: 0.3 of #cc0000, the options at full #cc0000', () => {
    const { css } = emitPick({ ...PLACEHOLDER, placeholderOpacity: lit(0.3), color: lit('#cc0000') });
    expect(css).toContain(fade('#cc0000', '30%'));
    expect(css).toContain(full('#cc0000'));
  });

  it('a token colour stays a token', () => {
    expect(emitPick({ ...PLACEHOLDER, color: lit('var(--primary)') }).css).toContain(fade('var(--primary)', '50%'));
  });

  it('clamps below as CSS opacity does: -1 is 0%', () => {
    expect(emitPick({ ...PLACEHOLDER, placeholderOpacity: lit(-1) }).css).toContain(fade('FieldText', '0%'));
  });

  it('a non-literal opacity is said, and fades nothing', () => {
    const { css, notes } = emitPick({ ...PLACEHOLDER, placeholderOpacity: { kind: 'expression', source: 'a * 0.5' } });
    expect(notes).toContain("node pick's Placeholder opacity is not a literal; the placeholder is drawn at full opacity");
    expect(css).not.toContain(':has(');
  });
});

describe('the controls: nothing fades where the runtime fades nothing', () => {
  it.each([
    ['opacity 1', { ...PLACEHOLDER, placeholderOpacity: lit(1) }],
    ['opacity 7.5, clamped to 1', { ...PLACEHOLDER, placeholderOpacity: lit(7.5) }],
    ['no placeholder, even at 0.3', { placeholderOpacity: lit(0.3) }],
    ['an empty placeholder', { placeholder: lit(''), placeholderOpacity: lit(0.3) }]
  ] as Array<[string, Record<string, ParamValue>]>)('%s', (_label, params) => {
    const { css, notes } = emitPick(params);
    expect(css).toContain('.pick {');
    expect(css).not.toContain(':has(');
    expect(notes).not.toContain('Placeholder opacity');
  });
});
