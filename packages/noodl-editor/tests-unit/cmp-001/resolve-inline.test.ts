/**
 * P102 CMP-001 §3 — every preview resolves the `var()`s inside it.
 *
 * Four default gradients drew blank because `TokenResolver` only resolved a whole-value `var()`.
 * The inline walk is the fix, and these are the four cases the task names: a `var()` inside a
 * gradient, a nested one, a cycle, and a missing name.
 */

import { hasUnresolvedVar, resolveVarsInline } from '@nodegx/project-contract/token-codecs';
import { DEFAULT_TOKENS } from '@nodegx/project-contract/tokens';

import { TokenResolver } from '../../src/editor/src/models/StyleTokensModel/TokenResolver';

const lookup = (map: Record<string, string>) => (name: string) => map[name];

describe('CMP-001 §3 — resolveVarsInline', () => {
  it('replaces a var() inside a gradient', () => {
    const out = resolveVarsInline(
      'linear-gradient(135deg, var(--primary) 0%, var(--foreground) 100%)',
      lookup({
        '--primary': '#3b82f6',
        '--foreground': '#0f172a'
      })
    );
    expect(out).toBe('linear-gradient(135deg, #3b82f6 0%, #0f172a 100%)');
  });

  it('follows a token that refers to a token', () => {
    const out = resolveVarsInline(
      '0 0 24px var(--ring)',
      lookup({ '--ring': 'var(--primary)', '--primary': 'var(--blue-500)', '--blue-500': '#3b82f6' })
    );
    expect(out).toBe('0 0 24px #3b82f6');
  });

  it('stops on a cycle and leaves the var() as written', () => {
    const out = resolveVarsInline('var(--a)', lookup({ '--a': 'var(--b)', '--b': 'var(--a)' }));
    expect(hasUnresolvedVar(out)).toBe(true);
  });

  it('keeps a missing name as written, or takes its fallback when it has one', () => {
    expect(resolveVarsInline('var(--missing)', lookup({}))).toBe('var(--missing)');
    expect(resolveVarsInline('var(--missing, #fff)', lookup({}))).toBe('#fff');
    expect(resolveVarsInline('var(--missing, rgb(0 0 0 / 0.1))', lookup({}))).toBe('rgb(0 0 0 / 0.1)');
  });

  it('🔴 every default gradient resolves to something a browser can paint', () => {
    const map = new Map(DEFAULT_TOKENS.map((t) => [t.name, t]));
    const resolver = new TokenResolver(map);
    const gradients = DEFAULT_TOKENS.filter((t) => t.category === 'gradient');
    expect(gradients).toHaveLength(5);
    for (const g of gradients) {
      const painted = resolver.resolveInline(g.value);
      expect(hasUnresolvedVar(painted)).toBe(false);
      expect(painted).toMatch(/^(linear|radial)-gradient\(/);
    }
  });
});
