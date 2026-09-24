/**
 * P103 CMG-002 §3.1 — what a section calls the kinds of token it holds, in a person's words.
 *
 * *Type* holds five categories; a person adding one picks *Font*, *Text size*, *Weight*, *Line
 * height* or *Letter spacing*, never `typography-tracking`. Read off `TOKEN_CATEGORIES` for
 * membership (which categories a group holds) so a category added to the contract cannot be
 * missing here without the spec noticing.
 */

import { codecForCategory, isComposerCategory } from '@nodegx/project-contract/token-codecs';
import { buildDefaultTokenMap, type StyleTokenRecord, type TokenCategory } from '@nodegx/project-contract/tokens';

import { TOKEN_CATEGORIES, type TokenCategoryGroup } from './TokenCategories';

/** The word for each kind a person can add. Colours are added by CMG-003's *New colour*, not here. */
export const KIND_WORDS: Record<Exclude<TokenCategory, 'color-semantic' | 'color-palette'>, string> = {
  spacing: 'Spacing',
  'typography-family': 'Font',
  'typography-size': 'Text size',
  'typography-weight': 'Weight',
  'typography-leading': 'Line height',
  'typography-tracking': 'Letter spacing',
  'border-radius': 'Corner radius',
  'border-width': 'Border width',
  shadow: 'Shadow',
  gradient: 'Gradient',
  'animation-duration': 'Duration',
  'animation-easing': 'Easing'
};

export interface TokenKind {
  category: TokenCategory;
  word: string;
}

/** The kinds a section offers, in the contract's order. */
export function kindsForGroup(group: TokenCategoryGroup): TokenKind[] {
  return (Object.keys(TOKEN_CATEGORIES) as TokenCategory[])
    .filter((c) => TOKEN_CATEGORIES[c].group === group && c in KIND_WORDS)
    .map((c) => ({ category: c, word: KIND_WORDS[c as keyof typeof KIND_WORDS] }));
}

/**
 * What a new token of this kind starts as: the value of the last token of the kind in the list
 * (a copy to adjust), else the kind's first shipped default. Never blank, never grey.
 *
 * For a composer kind (shadow, gradient, easing, duration, font) the copy is the last value the
 * composer can READ, so the composer that opens on the new token opens on its controls — measured
 * on a real project whose last `shadow`-category token was `--shadow-color: #29201933`, which
 * would have started every new shadow in text mode.
 */
export function startingValueFor(category: TokenCategory, tokens: readonly StyleTokenRecord[]): string {
  const inKind = tokens.filter((t) => t.category === category);
  const codec = isComposerCategory(category) ? codecForCategory(category) : null;
  const readable = codec ? inKind.filter((t) => codec.decode(t.value) !== null) : inKind;
  if (readable.length > 0) return readable[readable.length - 1].value;
  for (const token of buildDefaultTokenMap().values()) {
    if (token.category === category && (!codec || codec.decode(token.value) !== null)) return token.value;
  }
  if (inKind.length > 0) return inKind[inKind.length - 1].value;
  return '';
}
