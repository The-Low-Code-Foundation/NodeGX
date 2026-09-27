/**
 * P103 CMG-009 — a token in a field reads as a token.
 *
 * Richard, driving P102: *"the 'padding' value is --var(something) and the preview of the value
 * of the input is ... and when you click it, you get about 2 characters wide of the value inside
 * the input, since it's designed for a number."* And: *"some node prop fields have that nice {.}
 * button on the right so you can pick a token, but a lot of them don't, like padding."*
 *
 * Graded here, without a window:
 *  - the chip itself (`TokenChip`, core-ui): name, value, the compact rule, ✕ only with a detach;
 *  - the three controls draw the chip and NOT a text box when a token is set, and a text box when
 *    the value is not exactly one `var()` (AC7);
 *  - *Detach* for the padding box reads the resolved text as the field would read it typed;
 *  - §3.4 the census over the node catalog: every port `fieldOffersTokens` accepts is drawn by a
 *    control that draws the chip and the `{·}` — a port with a scale that reaches any other
 *    widget would be a field where a token still reads as text, and fails here by name.
 *
 * AC1–AC5 — what the running panel draws, the picker on a press, Detach and ⌘Z, the hover
 * treatment on the padding glyph, the 328px shot — are the drive
 * (`scripts/devtools/drive-cmg009-chip.js`).
 */
jest.mock('@noodl-core-ui/components/common/Icon', () => ({
  Icon: () => null,
  IconName: {},
  IconSize: { Tiny: 'tiny' },
  IconVariant: {}
}));
// Imports an `.svg` as a React component through webpack; nothing in this runner can.
jest.mock('@noodl-core-ui/components/property-panel/PropertyPanelSelectInput', () => ({
  PropertyPanelSelectInput: () => null
}));
// `NumberWithUnits` (for `isTokenReference`) imports the panel's utils, which import the node-graph
// context — the renderer. The same mock rel-014 and hlt-012 use; none of it is reached here.
jest.mock('../../src/editor/src/views/panels/propertyeditor/utils', () => ({
  getEditType: (p: { type?: { editAsType?: unknown } }) => (p.type?.editAsType ? p.type.editAsType : p.type),
  getConnectionSourceLabel: () => undefined,
  getConnectionSourceNavigate: () => undefined
}));

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { TokenChip, tokenShortName } from '@noodl-core-ui/components/property-panel/TokenChip';

import { fieldOffersTokens } from '../../src/editor/src/views/panels/propertyeditor/DataTypes/tokenFieldPopout';
import { isTokenReference } from '../../src/editor/src/views/panels/propertyeditor/DataTypes/NumberWithUnits';
import { detachedValueOf } from '../../src/editor/src/views/panels/propertyeditor/components/marginPaddingEdit';
import { MarginPaddingInput } from '../../src/editor/src/views/panels/propertyeditor/components/MarginPaddingInput';
import { NumberUnitInput } from '../../src/editor/src/views/panels/propertyeditor/components/NumberUnitInput';
import { widgetForPort } from '../../src/editor/src/views/panels/propertyeditor/model/widgets';

const noop = () => undefined;

describe('CMG-009 — the chip', () => {
  it('draws the short name and the resolved value, marked as the token it is', () => {
    const html = renderToStaticMarkup(<TokenChip name="--space-4" value="16px" onOpen={noop} />);
    expect(html).toContain('data-token-chip="--space-4"');
    expect(html).toContain('data-token-shows="name+value"');
    expect(html).toContain('>space-4<');
    expect(html).toContain('>16px<');
    expect(html).toContain('role="button"');
    expect(tokenShortName('--shadow-md')).toBe('shadow-md');
    // 🔴 What a field STORES is `var(--x)`; the first spec run showed `var(--space-4)` on the chip.
    expect(tokenShortName('var(--space-4)')).toBe('space-4');
    expect(tokenShortName(' var( --space-4 ) ')).toBe('space-4');
    const stored = renderToStaticMarkup(<TokenChip name="var(--space-4)" value="16px" onOpen={noop} onDetach={noop} />);
    expect(stored).toContain('>space-4<');
    expect(stored).toContain('aria-label="Detach --space-4"');
  });

  it('the font picker row: a stamped family token is the chip, not var(--font-sans) in a text box', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PickerTextInput } = require('../../src/editor/src/views/panels/propertyeditor/components/PickerTextInput');
    const html = renderToStaticMarkup(
      <PickerTextInput
        label="Font Family"
        value="var(--font-sans)"
        dataIdentifier="fontFamily"
        onCommit={noop}
        onOpenPicker={noop}
        tokenName="var(--font-sans)"
        tokenValue="Inter, sans-serif"
        onDetachToken={noop}
      />
    );
    expect(html).toContain('data-test="token-chip-fontFamily"');
    expect(html).toContain('>font-sans<');
    expect(html).toContain('>Inter, sans-serif<');
    expect(html).not.toContain('<input');
  });

  it('compact (a ~60px padding side): the name when it fits, else the value — never an ellipsis alone', () => {
    // Before a measurement (this runner has no layout) the chip goes by length: seven characters fit.
    // `data-token-shows` is what is VISIBLE; the hidden measuring spans carry both texts always.
    const fits = renderToStaticMarkup(<TokenChip name="--space-4" value="16px" compact onOpen={noop} />);
    expect(fits).toContain('data-token-shows="name"');
    const long = renderToStaticMarkup(<TokenChip name="--space-between-cards" value="24px" compact onOpen={noop} />);
    expect(long).toContain('data-token-shows="value"');
    // The full name is still there to read, in the tooltip.
    expect(long).toContain('--space-between-cards = 24px');
    // A token the project does not resolve: the name, however long; nothing else to show.
    const unresolved = renderToStaticMarkup(<TokenChip name="--space-between-cards" compact onOpen={noop} />);
    expect(unresolved).toContain('data-token-shows="name"');
    // Compact never draws the `{·}` mark: the field's own glyph is the token button beside it.
    expect(fits).not.toContain('class="Mark"');
  });

  it('✕ only when there is something to detach to', () => {
    const withDetach = renderToStaticMarkup(<TokenChip name="--space-4" value="16px" onOpen={noop} onDetach={noop} dataTest="x" />);
    expect(withDetach).toContain('data-test="x-detach"');
    expect(withDetach).toContain('aria-label="Detach --space-4"');
    const without = renderToStaticMarkup(<TokenChip name="--space-4" value="16px" onOpen={noop} dataTest="x" />);
    expect(without).not.toContain('x-detach');
  });

  it('a shadow token draws its shadow, small, on a light card', () => {
    const html = renderToStaticMarkup(
      <TokenChip name="--shadow-md" preview={{ kind: 'shadow', css: '0 4px 6px rgba(0,0,0,.1)' }} onOpen={noop} />
    );
    expect(html).toContain('box-shadow:0 4px 6px rgba(0,0,0,.1)');
    expect(html).toContain('>shadow-md<');
  });
});

describe('CMG-009 — the three controls draw the chip, not text, for a token', () => {
  it('NumberUnitInput: a token is the chip; no value box, no unit', () => {
    const html = renderToStaticMarkup(
      <NumberUnitInput
        label="Font Size"
        value="var(--text-lg)"
        unit="px"
        units={['px']}
        dataIdentifier="fontSize"
        onCommit={noop}
        onUnitChange={noop}
        onOpenTokenPicker={noop}
        isToken
        tokenName="var(--text-lg)"
        tokenValue="18px"
        onDetachToken={noop}
      />
    );
    expect(html).toContain('data-token-chip="var(--text-lg)"');
    expect(html).toContain('data-test="token-chip-fontSize"');
    expect(html).not.toContain('<input');
    expect(html).toContain('data-test="token-button-fontSize"'); // the `{·}` stays
  });

  it('🔴 NumberUnitInput without a token: the value box, and no chip', () => {
    const html = renderToStaticMarkup(
      <NumberUnitInput
        label="Font Size"
        value="18"
        unit="px"
        units={['px']}
        dataIdentifier="fontSize"
        onCommit={noop}
        onUnitChange={noop}
        onOpenTokenPicker={noop}
      />
    );
    expect(html).toContain('<input');
    expect(html).not.toContain('data-token-chip');
  });

  const box = (values: Record<string, unknown>, resolveToken?: (r: string) => string | undefined) =>
    renderToStaticMarkup(
      <MarginPaddingInput
        values={values as never}
        defaults={{
          'padding-top': { value: 0, unit: 'px' },
          'padding-bottom': { value: 0, unit: 'px' },
          'padding-left': { value: 0, unit: 'px' },
          'padding-right': { value: 0, unit: 'px' }
        }}
        expanded={{ margin: false, padding: true }}
        onToggleExpanded={noop}
        onUpdate={noop}
        onUpdateComps={noop}
        onResetSide={noop}
        onOpenTokenPicker={noop}
        resolveToken={resolveToken}
      />
    );

  it('the padding box: a side holding a token is a compact chip with ✕; a numeric side stays a box', () => {
    const html = box({ 'padding-left': 'var(--space-4)', 'padding-right': { value: 24, unit: 'px' } }, () => '16px');
    expect(html).toContain('data-test="token-chip-padding-left"');
    expect(html).toContain('data-test="token-chip-padding-left-detach"');
    expect(html).toContain('>space-4<');
    expect(html).not.toContain('token-chip-padding-right');
    expect(html).toMatch(/data-comp="padding-right"[^]*?<input/);
    // AC5 — the glyph carries the `{·}` mark for its hover/focus treatment.
    expect(html).toContain('data-test="token-button-padding-left"');
    expect((html.match(/class="PickMark"/g) || []).length).toBe(4);
  });

  it('a token the project cannot resolve: the chip, the name, and no ✕ (nothing to detach to)', () => {
    const html = box({ 'padding-top': 'var(--nope)' }, () => undefined);
    expect(html).toContain('data-test="token-chip-padding-top"');
    expect(html).not.toContain('token-chip-padding-top-detach');
  });
});

describe('CMG-009 AC7 / §3.1 — only exactly one var() is a token; Detach reads the resolved text', () => {
  it('🔴 a calc(), two tokens, or a token with junk after it is text, not a chip', () => {
    expect(isTokenReference('var(--space-4)')).toBe(true);
    expect(isTokenReference(' var( --space-4 ) ')).toBe(true);
    expect(isTokenReference('calc(var(--space-4) * 2)')).toBe(false);
    expect(isTokenReference('var(--space-4) var(--space-2)')).toBe(false);
    expect(isTokenReference('var(--space-4)px')).toBe(false);
    expect(isTokenReference(16)).toBe(false);
  });

  it('Detach: 16px → { 16, px }; 50% → { 50, % }; a calc() or nothing → no value, so no ✕', () => {
    expect(detachedValueOf('16px')).toEqual({ value: 16, unit: 'px' });
    expect(detachedValueOf('50%')).toEqual({ value: 50, unit: '%' });
    expect(detachedValueOf('calc(var(--space-4) * 2)')).toBeUndefined();
    expect(detachedValueOf('')).toBeUndefined();
  });
});

/**
 * §3.4 — the census. A port `fieldOffersTokens` accepts must reach one of the controls that draw
 * the chip and the `{·}`: `numberWithUnits`, `dimension`, `marginPadding`, or the `basic` row for
 * the one string port that holds a whole token. Any other widget would be a port with a scale and
 * a text box, which is the complaint.
 */
describe('CMG-009 §3.4 — the census: every port with a scale reaches a control that draws the chip', () => {
  type CatalogType = {
    typeName: string;
    inputs?: Array<{ name: string; plug?: string; type: unknown; parent?: string }>;
  };
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const raw = require('../../../noodl-types/src/node-catalog-enriched.json') as unknown;
  const catalog: CatalogType[] = Array.isArray(raw)
    ? (raw as CatalogType[])
    : ((raw as { nodes?: CatalogType[]; types?: CatalogType[] }).nodes ??
      (raw as { nodes?: CatalogType[]; types?: CatalogType[] }).types ??
      (Object.values(raw as Record<string, unknown>) as CatalogType[]));

  /**
   * The controls that draw the chip: the three numeric fields, the `basic` row (every port a scale
   * reaches there — `boxShadowToken`, and the unitless `Circle.cornerRadius`/`strokeWidth`), and
   * the `font` picker row, whose value the editor stamps with `var(--font-sans)` on every Text.
   */
  const CHIP_WIDGETS = new Set(['numberWithUnits', 'dimension', 'marginPadding', 'basic', 'font']);

  it('🔴 no port with a scale is drawn by a widget that shows a token as text', () => {
    const holes: string[] = [];
    const byWidget: Record<string, number> = {};
    let offered = 0;
    let couldHoldButRefused = 0;
    for (const type of catalog) {
      for (const port of type.inputs ?? []) {
        if (port.plug && !/input/.test(port.plug)) continue;
        const widget = widgetForPort(port as never);
        if (widget === undefined) continue;
        const offers = fieldOffersTokens(port.name);
        if (!offers) {
          if (['numberWithUnits', 'dimension', 'marginPadding'].includes(widget)) couldHoldButRefused++;
          continue;
        }
        offered++;
        byWidget[widget] = (byWidget[widget] || 0) + 1;
        if (!CHIP_WIDGETS.has(widget)) holes.push(`${type.typeName}.${port.name} → ${widget}`);
      }
    }
    // The counts, for the task file.
    // eslint-disable-next-line no-console
    console.log(`CMG-009 census: ${offered} ports offer tokens — ${JSON.stringify(byWidget)}; ${couldHoldButRefused} fields could hold one but no scale fits (HLT-012 AC3)`);
    expect(offered).toBeGreaterThan(60);
    expect(byWidget.marginPadding).toBeGreaterThan(0);
    expect(byWidget.numberWithUnits).toBeGreaterThan(0);
    expect(byWidget.dimension).toBeGreaterThan(0);
    expect(byWidget.basic).toBeGreaterThan(0);
    expect(byWidget.font).toBeGreaterThan(0);
    expect(holes).toEqual([]);
  });
});
