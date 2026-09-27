/**
 * FIX-015 slice 1 — the Design Tokens panel's rows are editable.
 *
 * 🔴 **Gap A of FIX-015 was "no human editing surface at all", and it was ONE COMPONENT DEEP.**
 * `DesignTokensTab` already passed `onTokenChange` → `styleTokensModel.setToken(name, value,
 * { undo: true })`, a real and undoable write. `TokenRow` destructured it to `_onTokenChange`
 * behind an eslint-disable and dropped it, with a comment deferring the work to "Phase 3:
 * TokenPicker".
 *
 * ⚠️ **TokenPicker was the wrong component for it.** Its callback is `onTokenSelect(cssVar)` —
 * "the full CSS `var(--token-name)` string, ready to use as a style value" — so it chooses WHICH
 * TOKEN A PROPERTY REFERENCES. It cannot change a token's own value, which is the only thing this
 * panel exists to do. Slice 1's stated mechanism did not do the job it was named for.
 *
 * ⚠️ These render assertions do NOT make the panel shipped. It is still registered only under
 * `config.devMode`; FIX-015's ruling is explicit that flipping that flag is "the wrong verb" and
 * that the first drive should be expected to produce a bug list. This closes the editing gap so
 * that a drive has something to find bugs IN.
 */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { TokenCategorySection } from '../../src/editor/src/views/panels/StylesPanel/components/TokenCategorySection/TokenCategorySection';

type Token = {
  name: string;
  value: string;
  category: string;
  isCustom?: boolean;
  description?: string;
};

const TOKENS: Token[] = [
  { name: '--primary', value: '#3b82f6', category: 'color-semantic' },
  { name: '--spacing-m', value: '16px', category: 'spacing', isCustom: true },
  { name: '--accent', value: 'var(--primary)', category: 'color-semantic' }
];

function render(tokens: Token[] = TOKENS, onTokenChange = () => undefined) {
  return renderToStaticMarkup(
    React.createElement(
      TokenCategorySection as never,
      {
        tokens,
        onTokenChange,
        onTokenReset: () => undefined
      } as never
    )
  );
}

describe('FIX-015 §1 — a token row offers an editable value', () => {
  it('🔴 renders an input per token, not a read-only span', () => {
    const html = render();
    // Three tokens in, three inputs out. Before this, the value was a `<span>` and the panel
    // could only be read.
    expect(html.match(/<input/g) ?? []).toHaveLength(3);
  });

  it('shows each token’s current value in its own input', () => {
    const html = render();
    expect(html).toContain('value="#3b82f6"');
    expect(html).toContain('value="16px"');
  });

  it('labels each input with the token it edits, so the row is reachable', () => {
    expect(render()).toContain('aria-label="Value for --primary"');
  });

  it('names the reference in the title when a token points at another token', () => {
    expect(render()).toContain('References var(--primary)');
  });

  /**
   * P103 CMG-004 — the reset button follows the VALUE, not the stored flag, and this gate is
   * updated with the reason rather than deleted (README §7).
   *
   * It used to assert one reset button, on the one `isCustom` fixture (`--spacing-m`). Richard's
   * drive found that `isCustom` means *stored*, not *changed*: 96 of his 142 stored tokens equalled
   * their defaults. So the button is now drawn when a token's value differs from its shipped
   * default, and says what it goes back to. Of the three fixtures: `--spacing-m` has no shipped
   * default at all (nothing to go back to — deleting it is CMG-002's item, not a "reset");
   * `--primary` is `#3b82f6` against a default of `#2563eb`; `--accent` is `var(--primary)`
   * against a default of `#f1f5f9`. Two buttons, each naming its default.
   */
  it('offers the reset button on a token whose value differs from its default, naming the default', () => {
    const html = render();
    expect(html.match(/Reset to default \(/g) ?? []).toHaveLength(2);
    expect(html).toContain('Reset to default (#2563eb)');
    expect(html).toContain('aria-label="Reset --primary to default"');
    expect(html).not.toContain('Reset --spacing-m to default');
  });

  it('🔴 a stored token whose value EQUALS its default draws no reset — stored is not changed', () => {
    const html = render([{ name: '--primary', value: '#2563eb', category: 'color-semantic', isCustom: true }]);
    expect(html).not.toContain('Reset to default');
  });

  it('renders nothing at all for an empty token list, without throwing', () => {
    expect(() => render([])).not.toThrow();
    expect(render([]).match(/<input/g)).toBeNull();
  });
});

/**
 * P102 CMP-001 (RC-3) — the row changed shape for the five composer categories, and this gate
 * is updated with the reason rather than deleted (README §7).
 *
 * A composer-category row whose value the codec can read shows the value **in words** and a
 * pencil, not a text box: a beginner should never meet `0 10px 15px -3px rgb(0 0 0 / 0.1)`. A
 * value the codec refuses keeps the text box exactly as before, so the editing surface FIX-015
 * closed is still there for every value the composer cannot open — and the three fixtures above
 * (a colour, a spacing, a reference) are untouched, so the original assertions still hold.
 */
describe('FIX-015 §1 × P102 — the composer rows say the value in words', () => {
  it('a shadow the codec reads shows words and no text box', () => {
    const html = render([
      {
        name: '--shadow-lg',
        value: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        category: 'shadow'
      }
    ]);
    expect(html).toContain('Shadow · lifted · 2 layers');
    expect(html.match(/<input/g)).toBeNull();
    expect(html).toContain('aria-label="Open composer for --shadow-lg"');
  });

  it('🔴 a shadow the codec refuses keeps the text box, so a text-mode edit still has somewhere to be saved', () => {
    const html = render([{ name: '--shadow-md', value: '0 0.5em 1em rgb(0 0 0 / 0.1)', category: 'shadow' }]);
    expect(html.match(/<input/g) ?? []).toHaveLength(1);
    expect(html).toContain('value="0 0.5em 1em rgb(0 0 0 / 0.1)"');
    expect(html).toContain('aria-label="Value for --shadow-md"');
    // The pencil is still offered: the composer opens in text mode with *Replace with a preset*.
    expect(html).toContain('aria-label="Open composer for --shadow-md"');
  });

  it('gradient, easing, duration and font rows all say their value in words', () => {
    const html = render([
      {
        name: '--gradient-brand',
        value: 'linear-gradient(135deg, var(--primary) 0%, var(--foreground) 100%)',
        category: 'gradient'
      },
      { name: '--ease-out', value: 'cubic-bezier(0, 0, 0.2, 1)', category: 'animation-easing' },
      { name: '--duration-150', value: '150ms', category: 'animation-duration' },
      { name: '--font-sans', value: 'Inter, ui-sans-serif, system-ui, sans-serif', category: 'typography-family' }
    ]);
    expect(html).toContain('Linear · Primary → Foreground · fades towards the bottom right');
    expect(html).toContain('Slows at the end · starts fast, eases into place');
    expect(html).toContain('Quick · 150 ms');
    expect(html).toContain('Inter · sans serif');
    expect(html.match(/<input/g)).toBeNull();
  });

  it('the other nine categories keep their text box', () => {
    const html = render([
      { name: '--radius-md', value: '8px', category: 'border-radius' },
      { name: '--text-lg', value: '18px', category: 'typography-size' }
    ]);
    expect(html.match(/<input/g) ?? []).toHaveLength(2);
  });
});
