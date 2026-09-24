/**
 * P103 CMG-010 — from the field to the token, and back.
 *
 * Richard, driving P102: *"there should be a pointer to the styles tab that jumps the user to that
 * style to edit it if they need to, to make a better connection between those two points."*
 *
 * Graded here, without a window:
 *  - `tokenUsageAll`: what wears every token, in one walk, on a fixture with all three kinds of
 *    wearer (AC4) — nodes (with the fields named), Looks, and other tokens; equal to the per-name
 *    reading; the walk reads visual states too;
 *  - the words: *Used by 2 nodes, 1 Look and 1 other token*, *Nothing wears this yet* (AC5), and
 *    the sentence over an edit: *Changes --space-4 everywhere (N places)*;
 *  - a token row in Styles draws the count and, open, the list — nodes and other tokens as
 *    buttons, a Look as a rule; a row never asked draws no count;
 *  - the chip carries ✎ and *Show in Styles* (`TokenChipActions`), in the compact hover overlay
 *    on a padding side and inline elsewhere;
 *  - the row editor for the nine non-composer types says what its Apply reaches.
 *
 * AC1–AC3 and AC6 — Show in Styles landing on the highlighted row, ✎ opening the composer beside
 * the field with the count in its header, an Apply reaching both wearers, ⌘Z in one step, the
 * wearer list going to a node — are the drive (`scripts/devtools/drive-cmg010-field-to-token.js`).
 */
jest.mock('@noodl-core-ui/components/common/Icon', () => ({
  Icon: () => null,
  IconName: {},
  IconSize: { Tiny: 'tiny' },
  IconVariant: {}
}));
jest.mock('@noodl-core-ui/components/property-panel/PropertyPanelSelectInput', () => ({
  PropertyPanelSelectInput: () => null
}));
// `StyleRow`'s menu is a dialog that reads `document` at render; there is none here (cmg-003's mock).
jest.mock('@noodl-core-ui/components/popups/ContextMenu', () => ({
  ContextMenu: () => null
}));
jest.mock('../../src/editor/src/views/panels/propertyeditor/utils', () => ({
  getEditType: (p: { type?: { editAsType?: unknown } }) => (p.type?.editAsType ? p.type.editAsType : p.type),
  getConnectionSourceLabel: () => undefined,
  getConnectionSourceNavigate: () => undefined
}));

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { TokenChip } from '@noodl-core-ui/components/property-panel/TokenChip';

import type { StyleTokenRecord } from '../../src/editor/src/models/StyleTokensModel/TokenCategories';
import {
  changesEverywhereText,
  describeTokenUsage,
  tokenUsageAll,
  tokenUsageCount,
  tokenUsageIn,
  type TokenUsageProject
} from '../../src/editor/src/models/StyleTokensModel/tokenUsage';
import { TokenCategorySection } from '../../src/editor/src/views/panels/StylesPanel/components/TokenCategorySection';
import { TokenChipActions, TokenRowEditor, tokenNameOfReference } from '../../src/editor/src/views/panels/propertyeditor/components/TokenChipActions';
import { MarginPaddingInput } from '../../src/editor/src/views/panels/propertyeditor/components/MarginPaddingInput';

const noop = () => undefined;

/** AC4 — all three kinds: two nodes (one through a visual state), one Look, one aliasing token. */
const TOKENS = [
  { name: '--primary', value: '#2563eb' },
  { name: '--ring', value: 'var(--primary)' },
  { name: '--primary-hover', value: 'color-mix(in srgb, var(--primary) 85%, black)' },
  { name: '--space-4', value: '16px' },
  { name: '--fresh', value: '4px' }
];
const project: TokenUsageProject = {
  getComponents: () => [
    {
      name: '/Pages/Home',
      graph: {
        forEachNode: (cb) => {
          cb({ id: 'a', label: 'Card', typename: 'Group', parameters: { paddingLeft: 'var(--space-4)', backgroundColor: 'var(--primary)' } });
          cb({ id: 'b', label: 'Title', typename: 'Text', parameters: { color: '#000' }, stateParameters: { hover: { color: 'var(--primary)' } } });
          cb({ id: 'c', label: 'Plain', typename: 'Group', parameters: {} });
        }
      }
    }
  ],
  getAllVariants: () => [{ name: 'Hero', typename: 'Group', parameters: { borderColor: 'var(--primary)' } }]
};

describe('CMG-010 §3.3 — what wears every token, in one walk', () => {
  const all = tokenUsageAll(project, TOKENS);

  it('🔴 --primary: two nodes (one through a visual state, with the field named), one Look, two other tokens', () => {
    const primary = all.get('--primary')!;
    expect(primary.nodes.map((n) => [n.nodeId, n.fields])).toEqual([
      ['a', ['backgroundColor']],
      ['b', ['color']]
    ]);
    expect(primary.looks).toEqual([{ name: 'Hero', typename: 'Group' }]);
    expect(primary.tokens).toEqual(['--ring', '--primary-hover']);
    expect(tokenUsageCount(primary)).toBe(5);
  });

  it('--space-4: the one node, its field named; --fresh: nothing (AC5)', () => {
    expect(all.get('--space-4')).toEqual({
      nodes: [{ componentName: '/Pages/Home', nodeId: 'a', label: 'Card', typename: 'Group', fields: ['paddingLeft'] }],
      looks: [],
      tokens: []
    });
    expect(all.get('--fresh')).toEqual({ nodes: [], looks: [], tokens: [] });
  });

  it('the per-name reading IS the map at that name — one reading for the confirm, the row and the header', () => {
    for (const t of TOKENS) expect(tokenUsageIn(project, TOKENS, t.name)).toEqual(all.get(t.name));
    expect(tokenUsageIn(project, TOKENS, '--never')).toEqual({ nodes: [], looks: [], tokens: [] });
  });

  it('the words', () => {
    expect(describeTokenUsage(all.get('--primary')!)).toBe('Used by 2 nodes, 1 Look and 2 other tokens');
    expect(describeTokenUsage(all.get('--space-4')!)).toBe('Used by 1 node');
    expect(describeTokenUsage(all.get('--fresh')!)).toBe('Nothing wears this yet');
    expect(changesEverywhereText('--primary', all.get('--primary')!)).toBe('Changes --primary everywhere (5 places)');
    expect(changesEverywhereText('--space-4', all.get('--space-4')!)).toBe('Changes --space-4 everywhere (1 place)');
    expect(changesEverywhereText('--fresh', all.get('--fresh')!)).toBe('Changes --fresh — nothing wears it yet');
  });
});

describe('CMG-010 §3.3 — Used by on a token row in Styles', () => {
  const all = tokenUsageAll(project, TOKENS);
  const rows: StyleTokenRecord[] = [
    { name: '--primary', value: '#2563eb', category: 'color-semantic', isCustom: false } as StyleTokenRecord,
    { name: '--fresh', value: '4px', category: 'spacing', isCustom: true } as StyleTokenRecord
  ];
  const render = (open: string | null, usage?: Map<string, ReturnType<typeof tokenUsageIn>>) =>
    renderToStaticMarkup(
      <TokenCategorySection
        tokens={rows}
        onTokenChange={noop}
        onTokenReset={noop}
        usage={usage}
        openUsage={open}
        onToggleUsage={noop}
        onGoToWearer={noop}
        onGoToToken={noop}
      />
    );

  it('the count, pressable when something wears it; "unused" in the notice colour when nothing does', () => {
    const html = render(null, all);
    expect(html).toMatch(/<button[^>]*data-test="token-usage---primary"[^>]*>5×<\/button>/);
    expect(html).toContain('title="Used by 2 nodes, 1 Look and 2 other tokens — press to see which"');
    expect(html).toMatch(/<span[^>]*data-test="token-usage---fresh"[^>]*>unused<\/span>/);
    expect(html).toContain('title="Nothing wears this yet"');
    expect(html).not.toContain('token-wearers-');
  });

  it('open: the list — nodes with their field as buttons, the Look as a rule, other tokens as buttons', () => {
    const html = render('--primary', all);
    expect(html).toContain('data-test="token-wearers---primary"');
    expect(html).toContain('>Used by 2 nodes, 1 Look and 2 other tokens<');
    expect((html.match(/<button[^>]*data-test="token-wearer---primary"/g) || []).length).toBe(2);
    expect(html).toContain('data-wearer-node="b"');
    expect(html).toContain('>backgroundColor<');
    expect(html).toMatch(/<div[^>]*data-test="token-wearer-look---primary"/);
    expect(html).toContain('>Hero<');
    expect((html.match(/<button[^>]*data-test="token-wearer-token---primary"/g) || []).length).toBe(2);
    expect(html).toContain('data-wearer-token="--ring"');
  });

  it('🔴 a row never asked draws no count — it must not read as unused', () => {
    const html = render(null, undefined);
    expect(html).not.toContain('token-usage-');
  });
});

describe('CMG-010 §3.1 — ✎ and Show in Styles on every chip', () => {
  it('the actions: an Edit and a Show in Styles, test-ided by port', () => {
    const html = renderToStaticMarkup(<TokenChipActions reference="var(--shadow-lg)" port="boxShadowToken" />);
    expect(html).toContain('data-token-actions="--shadow-lg"');
    expect(html).toContain('data-test="token-edit-boxShadowToken"');
    expect(html).toContain('aria-label="Edit --shadow-lg"');
    expect(html).toContain('data-test="token-show-boxShadowToken"');
    expect(html).toContain('aria-label="Show --shadow-lg in Styles"');
    expect(tokenNameOfReference('var( --x )')).toBe('--x');
    expect(tokenNameOfReference('--x')).toBe('--x');
  });

  it('a full chip draws them inline; a compact chip keeps them in the hover overlay with the ✕', () => {
    const actions = <TokenChipActions reference="var(--space-4)" port="paddingLeft" />;
    const full = renderToStaticMarkup(<TokenChip name="var(--space-4)" value="16px" onOpen={noop} onDetach={noop} actions={actions} dataTest="c" />);
    expect(full).toContain('data-test="token-edit-paddingLeft"');
    expect(full).not.toContain('data-token-hover-actions');
    const compact = renderToStaticMarkup(
      <TokenChip name="var(--space-4)" value="16px" compact onOpen={noop} onDetach={noop} actions={actions} dataTest="c" />
    );
    expect(compact).toMatch(/data-token-hover-actions[^]*token-edit-paddingLeft[^]*token-show-paddingLeft[^]*c-detach/);
  });

  it('the padding box hands the side its actions through the render prop', () => {
    const html = renderToStaticMarkup(
      <MarginPaddingInput
        values={{ 'padding-left': 'var(--space-4)' } as never}
        defaults={{ 'padding-left': { value: 0, unit: 'px' } }}
        expanded={{ margin: false, padding: true }}
        onToggleExpanded={noop}
        onUpdate={noop}
        onUpdateComps={noop}
        onResetSide={noop}
        onOpenTokenPicker={noop}
        resolveToken={() => '16px'}
        renderTokenActions={(reference, comps) => <TokenChipActions reference={reference} port={comps.join('+')} />}
      />
    );
    expect(html).toContain('data-test="token-edit-padding-left"');
    expect(html).toContain('data-test="token-show-padding-left"');
  });

  it('the row editor for a non-composer type says what Apply reaches, and Apply waits for a change', () => {
    const usage = tokenUsageAll(project, TOKENS).get('--space-4')!;
    const html = renderToStaticMarkup(
      <TokenRowEditor
        token={{ name: '--space-4', value: '16px', category: 'spacing', isCustom: false } as StyleTokenRecord}
        usage={usage}
        onApply={noop}
        onCancel={noop}
      />
    );
    expect(html).toContain('data-token-row-editor="--space-4"');
    expect(html).toContain('>Changes --space-4 everywhere (1 place)<');
    expect(html).toMatch(/data-test="token-row-editor-value"[^>]*value="16px"|value="16px"[^>]*data-test="token-row-editor-value"/);
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*data-test="token-row-editor-apply"|<button[^>]*data-test="token-row-editor-apply"[^>]*disabled=""/);
  });
});

describe('CMG-010 §3.3 — a colour token row (StyleRow) lists the tokens built from it', () => {
  it('the title counts them and the open list draws them as pressable entries', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { StyleRow } = require('../../src/editor/src/views/panels/StylesPanel/components/StyleRow/StyleRow');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { describeUsage } = require('../../src/editor/src/views/panels/StylesPanel/format');
    expect(describeUsage(2, 1, 2)).toBe('2 nodes, 1 Look and 2 other tokens');
    expect(describeUsage(0, 0, 1)).toBe('1 other token');
    expect(describeUsage(3, 0)).toBe('3 nodes');
    const html = renderToStaticMarkup(
      <StyleRow
        name="--primary"
        value="#2563eb"
        swatch="#2563eb"
        layer="Token"
        usageCount={5}
        wearers={{ nodes: [{ componentName: '/Pages/Home', nodeId: 'a', label: 'Card', typename: 'Group' }], variants: [{ name: 'Hero', typename: 'Group' }], tokens: ['--ring', '--primary-hover'] }}
        isUsageOpen
        onToggleUsage={noop}
        onGoToWearer={noop}
        onGoToToken={noop}
        menuItems={[]}
      />
    );
    expect(html).toContain('>Used by 1 node, 1 Look and 2 other tokens<');
    expect((html.match(/<button[^>]*data-test="style-row-wearer-token---primary"/g) || []).length).toBe(2);
    expect(html).toContain('data-wearer-token="--ring"');
  });
});
