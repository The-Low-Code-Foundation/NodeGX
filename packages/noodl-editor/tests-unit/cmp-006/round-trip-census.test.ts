/**
 * P102 CMP-006 — the round-trip census over what ships.
 *
 * Every token value of the five composer types in (1) the defaults, (2) the shipped Looks and the
 * composer's own presets, (3) the shipped templates, either round-trips exactly, round-trips with
 * a kept literal, or opens as text. **Rewrite must be 0.** The table is printed with its
 * denominators (AC1); corpus (4), the projects on this machine, is `scripts/devtools/
 * cmp006-project-census.ts` and its committed readout.
 */
import {
  COMPOSER_CATEGORIES,
  codecForCategory,
  roundTripOutcome,
  shadowCodec,
  type RoundTripOutcome,
  type ShadowModel,
  type TokenCodec
} from '@nodegx/project-contract/token-codecs';
import { DEFAULT_TOKENS } from '@nodegx/project-contract/tokens';

import {
  EnterprisePreset,
  MinimalPreset,
  ModernPreset,
  PlayfulPreset,
  SoftPreset
} from '../../src/editor/src/models/StylePresets/presets';
import landingPages from '../../src/editor/src/models/template/templates/landing-pages.content.json';
import { SITE_THEME_PRESETS } from '../../src/editor/src/models/template/templates/siteTheme';
import { composerCodecs } from '../../src/editor/src/validation/tokenComposable';

type Row = { category: string; value: string; source: string };

const OUTCOMES: RoundTripOutcome[] = ['visual', 'visual-kept-literal', 'text', 'rewrite'];

function categoryOf(name: string): string | undefined {
  return DEFAULT_TOKENS.find((t) => t.name === name)?.category;
}

function fromRecord(record: Record<string, string>, source: string): Row[] {
  return Object.entries(record)
    .map(([name, value]) => ({ category: categoryOf(name) ?? '', value, source }))
    .filter((r) => (COMPOSER_CATEGORIES as string[]).includes(r.category));
}

/** Corpus 1: the defaults. */
const DEFAULTS: Row[] = DEFAULT_TOKENS.filter((t) => (COMPOSER_CATEGORIES as string[]).includes(t.category)).map(
  (t) => ({ category: t.category, value: t.value, source: 'defaults' })
);

/** Corpus 2: the four Looks (Modern is the defaults) and the composer's own presets. */
const LOOKS: Row[] = [ModernPreset, MinimalPreset, PlayfulPreset, EnterprisePreset, SoftPreset].flatMap((look) =>
  fromRecord(look.tokens, `look:${look.id}`)
);
const OWN_PRESETS: Row[] = COMPOSER_CATEGORIES.flatMap((category) =>
  codecForCategory(category)!.presets.map((p) => ({ category, value: p.value, source: `preset:${category}` }))
);

/** Corpus 3: the shipped templates — the landing template's token block, and Site Builder's theme fonts. */
const TEMPLATES: Row[] = [
  ...(
    (landingPages as { designTokens?: { customTokens?: { name: string; value: string }[] } }).designTokens
      ?.customTokens ?? []
  )
    .map((t) => ({ category: categoryOf(t.name) ?? '', value: t.value, source: 'template:landing-pages' }))
    .filter((r) => (COMPOSER_CATEGORIES as string[]).includes(r.category)),
  ...Object.entries(SITE_THEME_PRESETS).flatMap(([id, preset]) => [
    { category: 'typography-family', value: preset.fontDisplay, source: `template:site-builder:${id}` },
    { category: 'typography-family', value: preset.fontUi, source: `template:site-builder:${id}` }
  ])
];

type Table = Record<string, Record<RoundTripOutcome | 'seen', number>>;

function census(rows: Row[], outcome = roundTripOutcome): Table {
  const table: Table = {};
  for (const category of COMPOSER_CATEGORIES) {
    table[category] = { seen: 0, visual: 0, 'visual-kept-literal': 0, text: 0, rewrite: 0 };
  }
  for (const row of rows) {
    const cell = table[row.category];
    cell.seen++;
    cell[outcome(row.category, row.value)]++;
  }
  return table;
}

function print(title: string, table: Table) {
  const lines = [`${title}`];
  for (const [category, cell] of Object.entries(table)) {
    if (cell.seen === 0) continue;
    lines.push(
      `  ${category.padEnd(20)} seen ${cell.seen}  visual ${cell.visual}  kept-literal ${
        cell['visual-kept-literal']
      }  text ${cell.text}  rewrite ${cell.rewrite}`
    );
  }
  // eslint-disable-next-line no-console
  console.log(lines.join('\n'));
}

function total(table: Table, outcome: RoundTripOutcome | 'seen'): number {
  return Object.values(table).reduce((n, cell) => n + cell[outcome], 0);
}

describe('CMP-006 — the round-trip census', () => {
  const corpora: [string, Row[]][] = [
    ['(1) defaults', DEFAULTS],
    ['(2) shipped Looks', LOOKS],
    ['(2) the composer’s own presets', OWN_PRESETS],
    ['(3) shipped templates', TEMPLATES]
  ];

  it.each(corpora)('%s: rewrite is 0, and the table is printed with its denominators (AC1)', (title, rows) => {
    const table = census(rows);
    print(title, table);
    expect(rows.length).toBeGreaterThan(0);
    expect(total(table, 'seen')).toBe(rows.length);
    expect(total(table, 'rewrite')).toBe(0);
  });

  it('(1) every default is visual, none by a kept literal', () => {
    const table = census(DEFAULTS);
    expect(DEFAULTS).toHaveLength(28);
    expect(total(table, 'visual')).toBe(28);
  });

  it('🔴 (2) the Looks and the composer’s own presets have a text column of 0 (AC3)', () => {
    expect(total(census(LOOKS), 'text')).toBe(0);
    expect(total(census(OWN_PRESETS), 'text')).toBe(0);
    // Playful's four purple shadows are the known kept-literal population (RC-6a).
    expect(census(LOOKS).shadow['visual-kept-literal']).toBe(4);
  });

  it('(3) the shipped templates have a text column of 0 (AC3)', () => {
    const table = census(TEMPLATES);
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(6);
    expect(total(table, 'text')).toBe(0);
  });

  describe('🔴 the census reddens on the two mutants it exists to catch (AC2)', () => {
    /** A codec that writes `0px` where the value said `0`. */
    const zeroPx: TokenCodec<ShadowModel> = {
      ...shadowCodec,
      encode: (m) => shadowCodec.encode(m).replace(/(^|\s)0(?=\s)/g, '$10px')
    };
    /** A colour reader that re-serialises a kept literal. */
    const tidyLiteral: TokenCodec<ShadowModel> = {
      ...shadowCodec,
      encode: (m) => shadowCodec.encode(m).replace(/rgba\((\d+),(\d+),(\d+),(\.\d+)\)/g, 'rgba($1, $2, $3, 0$4)')
    };
    const outcomeWith =
      (codec: TokenCodec<ShadowModel>) =>
      (category: string, value: string): RoundTripOutcome => {
        if (category !== 'shadow') return roundTripOutcome(category, value);
        const model = codec.decode(value);
        if (model === null) return 'text';
        return codec.encode(model) !== value ? 'rewrite' : 'visual';
      };

    it('a mutant encode that writes `0px` for `0` puts the defaults in the rewrite column', () => {
      expect(total(census(DEFAULTS, outcomeWith(zeroPx)), 'rewrite')).toBeGreaterThan(0);
    });

    it('a mutant colour reader that tidies `rgba(0,0,0,.1)` puts a hand-written shadow in the rewrite column', () => {
      const hand: Row[] = [{ category: 'shadow', value: '0 2px 4px rgba(0,0,0,.1)', source: 'hand' }];
      expect(total(census(hand), 'rewrite')).toBe(0);
      expect(total(census(hand, outcomeWith(tidyLiteral)), 'rewrite')).toBe(1);
    });
  });

  it('🔴 the validator and this census read the same codec module, by identity (AC5)', () => {
    expect(composerCodecs.codecForCategory).toBe(codecForCategory);
    expect(composerCodecs.roundTripOutcome).toBe(roundTripOutcome);
  });
});
