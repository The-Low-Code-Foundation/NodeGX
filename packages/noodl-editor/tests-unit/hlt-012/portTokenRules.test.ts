/**
 * P99 HLT-012 — which design tokens a field offers, graded against the shipped catalog.
 *
 * 🔴 **The corpus is `node-catalog.json`, not a handful of names.** The decision this task ships is
 * a table of regular expressions read against a port name, and the failure mode of such a table is
 * not "it throws" — it is that a rule written to catch `paddingTop` also catches `letterSpacing`
 * and the Letter Spacing field quietly offers a spacing scale. That is invisible to any spec whose
 * inputs are the names its author was thinking about. The catalog is the artefact
 * `catalog:check` keeps in step with source, and it is what `tests-unit/chr-007` grades the widget
 * dispatch against for the same reason.
 *
 * 🔴 **The three counts below decided the design and are asserted rather than commented.** 166
 * numeric ports, 86 that reach a field which can hold a token, 64 offered one. The middle number
 * is the whole reason the table is not keyed off the type name: `maxRetries`, `timeout` and
 * `flushSize` are number ports, and a spacing scale on a retry count is HLT-006's 91-row problem
 * one field further along (AC3).
 *
 * ⚠️ **Order is the decision, so the specs that pin it come first.** `ORDER` below is a
 * calibration in the `tests-unit/hlt-005` sense: it fails if the rules are ever rearranged into
 * the reading that looks more natural and is wrong on seven ports.
 *
 * Pure by construction — `TokensForPicking` is a leaf module (HLT-006's note), so this runs under
 * `test:main` with no Electron and no `ProjectModel`.
 */

import * as fs from 'fs';
import * as path from 'path';

import {
  PORT_TOKEN_RULES,
  tokenCategoriesForPort,
  tokensForPicking
} from '../../src/editor/src/models/StyleTokensModel/TokensForPicking';
import {
  buildEffectiveTokens,
  readStoredTokens,
  STYLE_TOKENS_METADATA_KEY
} from '../../src/editor/src/models/StyleTokensModel/ProjectTokenCss';

// ─── the corpus ───────────────────────────────────────────────────────────────

const CATALOG = path.join(__dirname, '../../../noodl-types/src/node-catalog.json');

interface CatalogPort {
  name: string;
  type?: { name?: string; units?: unknown; marginPaddingComp?: unknown } | string;
}

/**
 * Every input port declaration in the catalog, grouped by name.
 *
 * 🔴 **Grouped, not de-duplicated, and that is a correction this spec made to itself.** Taking the
 * first declaration of each name reports **164** numeric ports; two names — declared as something
 * else by the first node that has them and as a number by a later one — vanish. The question the
 * table answers is *"can a field for this name ever hold a token"*, so a name counts as numeric
 * when ANY node declares it so. A first-wins read is a silent undercount of exactly the ports
 * whose type varies between nodes, which are the ones worth looking at.
 */
function catalogPorts(): Map<string, CatalogPort[]> {
  const raw = JSON.parse(fs.readFileSync(CATALOG, 'utf8'));
  const nodes = Array.isArray(raw.nodes) ? raw.nodes : Object.values(raw.nodes || raw);
  const byName = new Map<string, CatalogPort[]>();

  for (const node of nodes as Record<string, unknown>[]) {
    const inputs = (node.inputs || node.ports || []) as unknown;
    const arr = Array.isArray(inputs)
      ? (inputs as CatalogPort[])
      : Object.entries(inputs as Record<string, CatalogPort>).map(([name, p]) => ({ ...p, name }));
    for (const port of arr) {
      if (!port || !port.name) continue;
      const declarations = byName.get(port.name) || [];
      declarations.push(port);
      byName.set(port.name, declarations);
    }
  }

  return byName;
}

/** Port names any node declares as `number` or `dimension`, whatever row they end up on. */
function numericPorts(): CatalogPort[] {
  return [...catalogPorts().entries()]
    .filter(([, declarations]) =>
      declarations.some((p) => {
        const name = typeof p.type === 'object' && p.type ? p.type.name : p.type;
        return name === 'number' || name === 'dimension';
      })
    )
    .map(([name]) => ({ name }));
}

/**
 * The ports that reach a field which can hold a token at all — `widgets.ts`' three numeric rows,
 * restated as the two conditions those rules turn on.
 *
 * 🔴 A `number` port with **no `units`** is a `BasicType` row: a plain text box with no unit, no
 * scrub and no place to hang a picker. That is what excludes the retry counts and the timeouts,
 * and it is a property of the port declaration rather than of anything this task wrote.
 */
function tokenCapablePorts(): CatalogPort[] {
  return [...catalogPorts().entries()]
    .filter(([, declarations]) =>
      declarations.some((p) => {
        const t = p.type;
        if (typeof t !== 'object' || !t) return false;
        if (t.marginPaddingComp !== undefined) return true;
        if (t.name === 'dimension') return true;
        return t.name === 'number' && t.units !== undefined;
      })
    )
    .map(([name]) => ({ name }));
}

// ─── order is the decision ────────────────────────────────────────────────────

describe('HLT-012 ORDER — the rules a naive rewrite gets wrong', () => {
  /**
   * 🔴 **This is the calibration, and it was mutant-run rather than argued.** The rules were
   * reordered generic-first — `(padding|margin)`, `Spacing$`, `(width|height)$` above the
   * specific suffixes — and this block went **7 red of 9**: `letterSpacing` and `labelletterSpacing`
   * to `/Spacing$/`, `lineHeight` and `labellineHeight` plus all three border widths to
   * `/(width|height)$/`. Nothing threw and no list came back empty; each field simply offered the
   * wrong scale, which is worse than offering none (AC3).
   *
   * ⚠️ **The two `fontSize` rows survived that mutant, and they are kept anyway.** They fall to a
   * different wrong table — one carrying a generic `/size$/i` rule, which is what the first
   * exploratory draft had and which swallows `fontSize` and `flushSize` together. A row that pins
   * the right answer costs nothing; a row that pins it only against the mutant you happened to run
   * is the gap [[a-gate-can-have-a-hole-shaped-like-the-defect]] names.
   */
  const MISREAD_BY_A_GENERIC_FIRST_TABLE: [string, string][] = [
    ['letterSpacing', 'typography-tracking'],
    ['labelletterSpacing', 'typography-tracking'],
    ['lineHeight', 'typography-leading'],
    ['labellineHeight', 'typography-leading'],
    ['fontSize', 'typography-size'],
    ['labelfontSize', 'typography-size'],
    ['borderWidth', 'border-width'],
    ['borderTopWidth', 'border-width'],
    ['trackBorderLeftWidth', 'border-width']
  ];

  it.each(MISREAD_BY_A_GENERIC_FIRST_TABLE)('%s offers %s, not the spacing ramp', (port, category) => {
    expect(tokenCategoriesForPort(port)).toEqual([category]);
  });

  it('🔴 a shadow blur is not a corner radius, and says so explicitly', () => {
    // It ends in `Radius` and is refused by a rule of its own rather than by falling off the end —
    // so a reader can see it was decided. `categories: null` is that decision.
    expect(tokenCategoriesForPort('boxShadowBlurRadius')).toEqual([]);
    expect(tokenCategoriesForPort('trackBoxShadowSpreadRadius')).toEqual([]);
    expect(PORT_TOKEN_RULES.some((r) => r.categories === null)).toBe(true);
  });

  it('a corner radius that is not a shadow still gets the radius scale', () => {
    expect(tokenCategoriesForPort('borderRadius')).toEqual(['border-radius']);
    expect(tokenCategoriesForPort('thumbBorderTopLeftRadius')).toEqual(['border-radius']);
  });
});

// ─── the population ───────────────────────────────────────────────────────────

describe('HLT-012 — the population the table is answering about', () => {
  it('🔴 the catalog has 166 numeric ports and only 86 of them reach a token-capable field', () => {
    // If this spec ever reports 0 for either, it is reading the wrong file, not measuring a
    // product that lost its ports ([[tests-0-total-can-mean-the-wrong-directory]]).
    expect(numericPorts().length).toBe(166);
    expect(tokenCapablePorts().length).toBe(86);
  });

  it('🔴 a number port with no units offers nothing, because it never gets a field to offer from', () => {
    // The five that made the point when the table was first written against type names.
    for (const port of ['maxRetries', 'timeout', 'flushSize', 'maxTokens', 'rateLimitWindow']) {
      expect(tokenCategoriesForPort(port)).toEqual([]);
    }
    const capable = new Set(tokenCapablePorts().map((p) => p.name));
    expect(capable.has('maxRetries')).toBe(false);
    expect(capable.has('timeout')).toBe(false);
  });

  it('offers a scale on 64 of the 86, and refuses the rest for a nameable reason', () => {
    const capable = tokenCapablePorts();
    const offered = capable.filter((p) => tokenCategoriesForPort(p.name).length > 0);
    expect(offered.length).toBe(64);

    // ⚠️ AC3's other half. These CAN hold a token — the field would keep it — but no shipped
    // category is a scale for a rotation, a breakpoint or a shadow offset. Listed by name so that
    // a future token category (a `size` ramp, say) shows up here as a decision to revisit rather
    // than as a silent absence.
    const refused = capable.filter((p) => tokenCategoriesForPort(p.name).length === 0).map((p) => p.name);
    expect(refused.sort()).toEqual(
      [
        'backdropBlur',
        'boxShadowBlurRadius',
        'boxShadowOffsetX',
        'boxShadowOffsetY',
        'boxShadowSpreadRadius',
        'mediumBreakpoint',
        'objectPositionX',
        'objectPositionY',
        'smallBreakpoint',
        'thumbBoxShadowBlurRadius',
        'thumbBoxShadowOffsetX',
        'thumbBoxShadowOffsetY',
        'thumbBoxShadowSpreadRadius',
        'trackBoxShadowBlurRadius',
        'trackBoxShadowOffsetX',
        'trackBoxShadowOffsetY',
        'trackBoxShadowSpreadRadius',
        'transformOriginX',
        'transformOriginY',
        'transformRotation',
        'transformX',
        'transformY'
      ].sort()
    );
  });

  it('🔴 every parameter that holds a token on Puppy test 3 today can be picked from its field', () => {
    // The measured list from HLT-012 §2, re-measured 2026-09-21: 18 non-colour parameters carrying
    // 35 distinct tokens, every one of them typed by hand or written by the AI path. This is the
    // task's person sentence as an assertion — if any of these comes back `[]`, a token that is
    // already in a real project has no way to be chosen.
    const inUse = [
      'borderBottomWidth',
      'borderRadius',
      'borderTopLeftRadius',
      'borderTopRightRadius',
      'borderTopWidth',
      'borderWidth',
      'columnGap',
      'fontFamily',
      'fontSize',
      'fontWeight',
      'letterSpacing',
      'lineHeight',
      'marginTop',
      'paddingBottom',
      'paddingLeft',
      'paddingRight',
      'paddingTop',
      'rowGap'
    ];
    for (const port of inUse) {
      expect({ port, categories: tokenCategoriesForPort(port) }).toEqual({
        port,
        categories: expect.arrayContaining([expect.any(String)])
      });
    }
  });
});

// ─── what a field actually draws ──────────────────────────────────────────────

/** A project exactly as the editor stores one: tokens present, legacy style layer absent. */
function projectWithNoLegacyStyles(customTokens: unknown[] = []) {
  const metadata: Record<string, unknown> = {
    styles: null,
    [STYLE_TOKENS_METADATA_KEY]: { version: 1, customTokens }
  };
  return { getMetaData: (key: string) => metadata[key] };
}

const shippedTokens = () => Array.from(buildEffectiveTokens(readStoredTokens(projectWithNoLegacyStyles())).values());

describe('HLT-012 — the list one field draws', () => {
  it('🔴 a Font Size field offers the 13 font sizes and NOT the 31 spacings (AC3)', () => {
    const groups = tokensForPicking(shippedTokens(), tokenCategoriesForPort('fontSize'));

    expect(groups.map((g) => g.category)).toEqual(['typography-size']);
    expect(groups[0].label).toBe('Font Sizes');
    expect(groups[0].tokens.length).toBe(13);
    // ⚠️ Ten `--text-*` and three `--display-*`. The first draft of this spec asserted the prefix
    // and went red: the display sizes are font sizes and belong in this list, which is the sort of
    // thing a shape assertion catches and a count alone does not.
    expect(groups[0].tokens.filter((t) => t.name.startsWith('--display-')).length).toBe(3);
    expect(groups[0].tokens.every((t) => /^--(text|display)-/.test(t.name))).toBe(true);
  });

  it('a padding field offers the spacing ramp and nothing else', () => {
    const groups = tokensForPicking(shippedTokens(), tokenCategoriesForPort('paddingTop'));

    expect(groups.map((g) => g.category)).toEqual(['spacing']);
    expect(groups[0].tokens.length).toBe(31);
  });

  it('🔴 offers a scale on a project whose legacy style layer is null — the normal case (AC4)', () => {
    // HLT-006 §6: `metadata.styles: null` is what every real project looks like. A fixture that
    // populates it grades a project nobody has.
    for (const port of ['fontSize', 'paddingLeft', 'borderRadius', 'borderWidth', 'lineHeight', 'fontFamily']) {
      const groups = tokensForPicking(shippedTokens(), tokenCategoriesForPort(port));
      expect({ port, groups: groups.length }).toEqual({ port, groups: 1 });
      expect(groups[0].tokens.length).toBeGreaterThan(0);
    }
  });

  it('🔴 no list is long enough to need HLT-006\'s ramp disclosure — the longest is 31', () => {
    // The measured answer to §6's third landmine. HLT-006 split its list because the colour ramp is
    // 61 rows on top of 25 semantic ones; nothing here approaches that, so a second list would be
    // chrome invented for a problem this surface does not have.
    const longest = tokenCapablePorts()
      .map((p) => tokensForPicking(shippedTokens(), tokenCategoriesForPort(p.name)))
      .flat()
      .reduce((max, group) => Math.max(max, group.tokens.length), 0);

    expect(longest).toBe(31);
  });

  it('a category the project has emptied is dropped rather than drawn as a heading with nothing under it', () => {
    expect(tokensForPicking([], tokenCategoriesForPort('fontSize'))).toEqual([]);
  });

  it('a port name that is not a string answers with nothing rather than throwing', () => {
    expect(tokenCategoriesForPort(undefined)).toEqual([]);
    expect(tokenCategoriesForPort('')).toEqual([]);
    expect(tokenCategoriesForPort(42)).toEqual([]);
  });
});
