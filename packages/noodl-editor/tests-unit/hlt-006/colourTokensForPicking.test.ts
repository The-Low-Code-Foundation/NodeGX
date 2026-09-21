/**
 * P99 HLT-006 — what the colour picker may offer, graded on the shape real projects have.
 *
 * 🔴 **The fixture is the test.** HLT-006 §6 says it in one line: *"`metadata.styles: null` is the
 * normal case, not an edge case. Any fixture that populates it is testing a project nobody has."*
 * Every project the editor opens carries `designTokens` and no `styles` at all — measured on
 * `Puppy test 3`, 2026-09-21: `metadata.styles` is absent, `designTokens.customTokens` has 28
 * entries, and the picker showed 13 colours. A spec written against a populated legacy layer would
 * pass while the product stayed blank
 * ([[a-frozen-fixture-answers-a-different-question-once-its-subject-moves]]).
 *
 * 🔴 **And the numbers here are the ones that decided the DESIGN, so they are asserted, not
 * commented.** 91 colour tokens split 25 semantic / 61 palette / 5 gradients-excluded is the whole
 * argument for two lists rather than one; if the shipped vocabulary grows a category, this spec is
 * where that shows up rather than in a picker that silently gained forty rows.
 *
 * Pure by construction — `ColourTokensForPicking` and `ProjectTokenCss` are leaf modules, so this
 * runs under `test:main` with no Electron and no `ProjectModel`. Importing the barrel instead would
 * drag `projectmodel` → `bugtracker` → `platform.getUserDataPath()` at module scope and report
 * `Tests: 0 total`, which is what `TokenCategorySection` already documents.
 */

import {
  allColourTokens,
  colourTokensForPicking,
  tokenReferenceStrings
} from '../../src/editor/src/models/StyleTokensModel/TokensForPicking';
import {
  buildEffectiveTokens,
  readStoredTokens,
  STYLE_TOKENS_METADATA_KEY
} from '../../src/editor/src/models/StyleTokensModel/ProjectTokenCss';

/** A project exactly as the editor stores one: tokens present, legacy style layer absent. */
function projectWithNoLegacyStyles(customTokens: unknown[] = []) {
  const metadata: Record<string, unknown> = {
    styles: null,
    [STYLE_TOKENS_METADATA_KEY]: { version: 1, customTokens }
  };
  return { getMetaData: (key: string) => metadata[key] };
}

const tokensOf = (project: { getMetaData: (key: string) => unknown }) =>
  Array.from(buildEffectiveTokens(readStoredTokens(project)).values());

describe('HLT-006 — the picker enumerates the project\'s colour tokens', () => {
  it('🔴 offers colours on a project whose legacy style layer is null — the normal case', () => {
    const tokens = tokensOf(projectWithNoLegacyStyles());
    const { semantic, palette } = colourTokensForPicking(tokens);

    // The defect: before this, a project in exactly this state offered only the colours some node
    // already wore. Zero here is the bug reappearing.
    expect(semantic.length).toBeGreaterThan(0);
    expect(palette.length).toBeGreaterThan(0);
  });

  it('splits the shipped vocabulary 25 semantic / 61 palette, and excludes gradients', () => {
    const tokens = tokensOf(projectWithNoLegacyStyles());
    const { semantic, palette } = colourTokensForPicking(tokens);

    expect(semantic).toHaveLength(25);
    expect(palette).toHaveLength(61);
    expect(allColourTokens(tokens)).toHaveLength(86);

    // ⚠️ A gradient is in group `Effects`, and no `type === 'color'` port can wear one. Offering
    // one would write a parameter the runtime cannot paint.
    expect(tokens.some((t) => t.category === 'gradient')).toBe(true);
    expect(allColourTokens(tokens).some((t) => t.category === 'gradient')).toBe(false);
  });

  it('puts the names a person actually reaches for in the OPEN half', () => {
    const { semantic, palette } = colourTokensForPicking(tokensOf(projectWithNoLegacyStyles()));
    const names = semantic.map((t) => t.name);

    // The 13 tokens `Puppy test 3` actually uses were all semantic — not one of its nodes
    // referenced the ramp. That is why this half is the one drawn open.
    for (const name of ['--primary', '--background', '--foreground', '--border', '--muted-foreground']) {
      expect(names).toContain(name);
    }
    expect(palette.map((t) => t.name)).toContain('--blue-500');
    expect(names).not.toContain('--blue-500');
  });

  it("a project's overrides reach the picker with the overridden VALUE, not the shipped one", () => {
    const project = projectWithNoLegacyStyles([
      { name: '--primary', value: '#18181b', category: 'color-semantic', isCustom: true }
    ]);
    const { semantic } = colourTokensForPicking(tokensOf(project));
    const primary = semantic.find((t) => t.name === '--primary');

    expect(primary?.value).toBe('#18181b');
    // An override replaces its token, it does not append a second row of the same name.
    expect(semantic.filter((t) => t.name === '--primary')).toHaveLength(1);
  });

  it('a custom token of a new name is offered too, not just the shipped ones', () => {
    const project = projectWithNoLegacyStyles([
      { name: '--brand-ink', value: '#0b3d2e', category: 'color-semantic', isCustom: true }
    ]);
    const names = colourTokensForPicking(tokensOf(project)).semantic.map((t) => t.name);

    expect(names).toContain('--brand-ink');
  });

  describe('the de-duplication against "Colors in project"', () => {
    it('🔴 yields the var() form, because that is what the echo list holds', () => {
      const refs = tokenReferenceStrings(tokensOf(projectWithNoLegacyStyles()));

      // `getProjectColors` collects raw PARAMETER values. On a token-authored project those are
      // `var(--primary)` strings — so a set of bare `--primary` names would subtract nothing and
      // every used token would appear twice, once per source. That duplicate would be caused by
      // this fix, not found by it.
      expect(refs.has('var(--primary)')).toBe(true);
      expect(refs.has('--primary')).toBe(false);
      expect(refs.size).toBe(86);
    });

    it('leaves loose hex values alone — they are still the only place those appear', () => {
      const refs = tokenReferenceStrings(tokensOf(projectWithNoLegacyStyles()));

      expect(refs.has('#ff0000')).toBe(false);
      expect(refs.has('transparent')).toBe(false);
    });
  });
});
