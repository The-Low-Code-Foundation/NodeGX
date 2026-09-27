/**
 * CHR-009 s20 — a colour field holding a project token draws the token's colour.
 *
 * `ProjectModel.resolveColor` resolved colour styles only, so `var(--background)` reached the swatch's
 * `backgroundColor` unchanged — and the editor's document has none of the project's variables, so the
 * swatch drew transparent (a checkerboard). Richard, 2026-09-16: "fix it now".
 */
import { buildDefaultTokenMap } from '@noodl-models/StyleTokensModel/DefaultTokens';
import { resolveProjectTokenValue, STYLE_TOKENS_METADATA_KEY } from '@noodl-models/StyleTokensModel/ProjectTokenCss';

function projectWith(meta: Record<string, unknown>) {
  return { getMetaData: (key: string) => meta[key] };
}

const defaultBackground = buildDefaultTokenMap().get('--background')!.value;

describe('CHR-009 — a token in a colour field resolves to the project value', () => {
  it('resolves a shipped token with no overrides', () => {
    const resolved = resolveProjectTokenValue(projectWith({}), 'var(--background)');
    expect(defaultBackground).toBeTruthy();
    expect(resolved).toBeTruthy();
    expect(resolved).not.toMatch(/var\(/);
  });

  it("uses the project's override, following a reference to another token", () => {
    const project = projectWith({
      [STYLE_TOKENS_METADATA_KEY]: {
        customTokens: [
          { name: '--background', value: '#fbf8f3', category: 'color-semantic', isCustom: true },
          { name: '--card', value: 'var(--background)', category: 'color-semantic', isCustom: true }
        ]
      }
    });
    expect(resolveProjectTokenValue(project, 'var(--background)')).toBe('#fbf8f3');
    expect(resolveProjectTokenValue(project, 'var(--card)')).toBe('#fbf8f3');
  });

  it('answers undefined for anything that is not one known token', () => {
    const project = projectWith({});
    expect(resolveProjectTokenValue(project, 'var(--no-such-token)')).toBeUndefined();
    expect(resolveProjectTokenValue(project, '#000000')).toBeUndefined();
    expect(resolveProjectTokenValue(project, 'Primary')).toBeUndefined();
    expect(resolveProjectTokenValue(project, undefined)).toBeUndefined();
  });
});
