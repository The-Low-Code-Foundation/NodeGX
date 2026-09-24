/**
 * P103 CMG-006 — edit a Look from Styles.
 *
 * Two pure readings:
 *  - the door: `openLookEditor` puts the Look editor panel in the INSPECTOR with the Look's
 *    identity, without touching the left slot, and the next node selection / deselection
 *    replaces or clears it — the `SidebarModel` contract INS-001 pinned, extended by one method;
 *  - AC4: no user-visible *variant* is left in the property editor, the Styles panel or the
 *    models' undo labels and warnings — only identifiers, event names and class names.
 *
 * That the editor draws a Look's fields for a Look nothing wears, that a change reaches every
 * wearer on the canvas and the file, and one undo step per field, are AC1/AC2/AC5/AC6 — the drive
 * (`scripts/devtools/drive-cmg006-look-editor.js`).
 */
jest.mock('@noodl-utils/editorsettings', () => ({
  EditorSettings: {
    instance: {
      on: () => undefined,
      get: () => undefined,
      set: () => undefined
    }
  }
}));

import * as fs from 'fs';
import * as path from 'path';
import type React from 'react';

import { SidebarModel, SidebarModelEvent } from '@noodl-models/sidebar/sidebarmodel';

import { LOOK_EDITOR_PANEL_ID, openLookEditor } from '../../src/editor/src/views/panels/LookEditor/lookEditorRoute';

const Panel = () => null;
const node = (id: string) => ({ id, type: {} }) as TSFixme;

function registerRail() {
  SidebarModel.instance.reset();
  SidebarModel.instance.register({ id: 'components', name: 'Components', order: 1, panel: Panel });
  SidebarModel.instance.register({ id: 'styles', name: 'Styles', order: 1.5, panel: Panel });
  SidebarModel.instance.register({ transient: true, followsSelection: true, id: 'PropertyEditor', name: 'Properties', panel: Panel });
  SidebarModel.instance.register({ transient: true, id: LOOK_EDITOR_PANEL_ID, name: 'Look', panel: Panel });
  SidebarModel.instance.switch('styles');
}

describe('CMG-006 — the door from Styles to a Look\'s fields', () => {
  beforeEach(registerRail);

  it('opens the Look editor in the inspector with the Look\'s type and name, and leaves the left slot alone', () => {
    const events: string[] = [];
    SidebarModel.instance.on(SidebarModelEvent.inspectorChanged, (id: string) => events.push(`inspector:${id}`), {});
    SidebarModel.instance.on(SidebarModelEvent.activeChanged, (id: string) => events.push(`active:${id}`), {});

    openLookEditor({ typename: 'Group', name: 'Card' });

    expect(SidebarModel.instance.InspectorId).toBe(LOOK_EDITOR_PANEL_ID);
    expect(SidebarModel.instance.ActiveId).toBe('styles');
    expect(events).toEqual([`inspector:${LOOK_EDITOR_PANEL_ID}`]);

    const element = SidebarModel.instance.getInspector()!();
    expect(element.props).toMatchObject({ typename: 'Group', name: 'Card' });
  });

  it('🔴 works for a Look nothing wears — there is no node in the call at all', () => {
    openLookEditor({ typename: 'Text', name: 'Nobody wears this' });
    expect(SidebarModel.instance.getInspector()!().props).toMatchObject({ typename: 'Text', name: 'Nobody wears this' });
  });

  it('is not in the rail', () => {
    expect(SidebarModel.instance.getVisibleItems().map((i) => i.id)).not.toContain(LOOK_EDITOR_PANEL_ID);
  });

  it('a node selection replaces it, and deselecting clears it — the same rules a node panel lives by', () => {
    openLookEditor({ typename: 'Group', name: 'Card' });
    SidebarModel.instance.switchToNode(node('n1'));
    expect(SidebarModel.instance.InspectorId).toBe('PropertyEditor');

    openLookEditor({ typename: 'Group', name: 'Card' });
    SidebarModel.instance.hidePanels();
    expect(SidebarModel.instance.InspectorId).toBeUndefined();
  });

  it('two Looks of one name on different types are two different requests', () => {
    openLookEditor({ typename: 'Group', name: 'Card' });
    const a = SidebarModel.instance.getInspector()!() as React.ReactElement<{ typename: string }>;
    openLookEditor({ typename: 'Text', name: 'Card' });
    const b = SidebarModel.instance.getInspector()!() as React.ReactElement<{ typename: string }>;
    expect(a.props.typename).toBe('Group');
    expect(b.props.typename).toBe('Text');
  });
});

describe('CMG-006 AC4 — the editor says Look, never variant, to a person', () => {
  const ROOT = path.join(__dirname, '../../src/editor/src');
  const FILES = [
    'views/panels/propertyeditor/components/VariantStates/variantseditor.tsx',
    'views/panels/propertyeditor/components/VariantStates/PickVariantPopup.tsx',
    'views/panels/propertyeditor/components/VariantStates/PickVariantItem.tsx',
    'views/panels/StylesPanel/components/LooksSection/LooksSection.tsx',
    'views/panels/LookEditor/LookEditorPanel.tsx',
    'models/nodegraphmodel/NodeGraphNode.ts',
    'models/VariantModel.ts',
    'models/projectmodel.ts'
  ];

  /** Code with comments removed: a docblock that explains the old word is not the old word. */
  const code = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1');

  /**
   * Every string literal or JSX text that says "variant" to a person. Identifiers are excluded by
   * shape: event names (`variantChanged`), a mode (`'variant'`), warning keys (`variant-…-conflict-`),
   * class names, data-test ids, and `require`/`import` paths.
   */
  function spokenVariants(src: string): string[] {
    const out: string[] = [];
    const literals = src.match(/'[^'\n]*'|"[^"\n]*"|`[^`\n]*`/g) ?? [];
    for (const raw of literals) {
      // An identifier inside `${…}` is code, not a word: `${variant.name}` says the Look's name.
      const s = raw.slice(1, -1).replace(/\$\{[^}]*\}/g, '');
      if (!/variant/i.test(s)) continue;
      if (/^@/.test(s)) continue; // a package path
      if (/^[a-z][a-z0-9-]*( [a-z][a-z0-9-]*)*$/.test(s)) continue; // class names, data-test ids
      if (/^variant[A-Z][A-Za-z]*$/.test(s)) continue; // an event name
      if (s === 'variant' || s === 'node') continue; // the edit mode
      if (/conflict/.test(s) && !/\s/.test(s)) continue; // a warning KEY (no spaces), not its sentence
      if (/^variants?-/.test(s)) continue; // class names
      if (/^\.\/|^\.\.\/|\.css$/.test(s)) continue; // a path
      if (/^[a-z]+(\.[A-Za-z]+)+$/.test(s)) continue; // a dotted key
      out.push(s);
    }
    // JSX text between tags: a `>` that closes a tag (not an arrow's `=>`), then words with no code
    // punctuation, then the next tag.
    for (const m of src.matchAll(/[^=]>([^<>{}();]*[Vv]ariant[^<>{}();]*)</g)) out.push(m[1].trim());
    return out;
  }

  it('the reader finds a spoken word when there is one (the control)', () => {
    expect(spokenVariants(`ToastLayer.showSuccess('Variant created'); on('variantChanged'); m = 'variant'; <div>Edit variant</div>`)).toEqual([
      'Variant created',
      'Edit variant'
    ]);
    // Class names and keys are not spoken.
    expect(spokenVariants(`className="variants-section" key = 'variant-param-conflict-'`)).toEqual([]);
  });

  it('🔴 every listed file says Look — the words a person sees hold no "variant"', () => {
    const found: Record<string, string[]> = {};
    for (const f of FILES) {
      const full = path.join(ROOT, f);
      expect(fs.existsSync(full)).toBe(true);
      const spoken = spokenVariants(code(fs.readFileSync(full, 'utf8')));
      if (spoken.length) found[f] = spoken;
    }
    expect(found).toEqual({});
  });

  it('the header a person reads while editing says "Editing the Look"', () => {
    const src = code(fs.readFileSync(path.join(ROOT, FILES[0]), 'utf8'));
    expect(src).toContain('Editing the Look');
    expect(src).not.toContain('Edit variant');
  });
});
