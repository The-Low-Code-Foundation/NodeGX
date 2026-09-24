/**
 * P102 CMP-001 §3 / AC1 — the blank-gradient defect, graded on the rendered row.
 *
 * Before: `TokenPreview` painted `backgroundImage: token.value`, and four of the five default
 * gradients are built from `var(--primary)` and friends, which the editor's own window cannot
 * resolve — so the swatch was blank. Now the row takes `resolve`, and paints what comes back.
 */

import { hasUnresolvedVar } from '@nodegx/project-contract/token-codecs';
import { DEFAULT_TOKENS } from '@nodegx/project-contract/tokens';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { TokenResolver } from '../../src/editor/src/models/StyleTokensModel/TokenResolver';
import { TokenCategorySection } from '../../src/editor/src/views/panels/StylesPanel/components/TokenCategorySection/TokenCategorySection';

const resolver = new TokenResolver(new Map(DEFAULT_TOKENS.map((t) => [t.name, t])));

function render(resolve?: (v: string) => string) {
  const gradients = DEFAULT_TOKENS.filter((t) => t.category === 'gradient');
  return renderToStaticMarkup(
    React.createElement(
      TokenCategorySection as never,
      {
        tokens: gradients,
        onTokenChange: () => undefined,
        onTokenReset: () => undefined,
        resolve
      } as never
    )
  );
}

/** The `background-image` each swatch is painted with. */
function paints(html: string): string[] {
  return [...html.matchAll(/background-image:([^;"]+)/g)].map((m) => m[1].trim());
}

describe('CMP-001 AC1 — every gradient preview resolves the var()s inside it', () => {
  it('🔴 the control: without a resolver, four of the five default swatches carry an unpaintable var()', () => {
    const blank = paints(render()).filter(hasUnresolvedVar);
    expect(blank).toHaveLength(4);
  });

  it('with the project resolver, all five swatches paint a real gradient', () => {
    const painted = paints(render((v) => resolver.resolveInline(v)));
    expect(painted).toHaveLength(5);
    expect(painted.filter(hasUnresolvedVar)).toHaveLength(0);
    for (const p of painted) expect(p).toMatch(/^(linear|radial)-gradient\(/);
  });
});
