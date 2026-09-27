/**
 * P102 — the token codecs: one per composer type, keyed by the token's category.
 *
 * 🔴 This is the **one** import path. The editor's Styles panel, `noodl-mcp`'s `validate_project`
 * (CMP-009) and the round-trip census (CMP-006) all import from here, and CMP-006 asserts that by
 * identity. Nothing under `token-codecs/` imports the editor, so it loads under plain Node.
 */
import type { TokenCategory } from '../tokens';
import { fontFamilyCodec } from './fontFamily';
import { gradientCodec } from './gradient';
import { durationCodec, easingCodec } from './motion';
import { shadowCodec } from './shadow';
import type { TokenCodec } from './types';

export * from './types';
export * from './split';
export * from './colour';
export * from './length';
export * from './shadow';
export * from './gradient';
export * from './motion';
export * from './fontFamily';
export * from './resolveInline';

/** The five categories the composer opens (README §2). The other nine keep their text box. */
export type ComposerCategory = 'shadow' | 'gradient' | 'animation-easing' | 'animation-duration' | 'typography-family';

export const COMPOSER_CATEGORIES: ComposerCategory[] = [
  'shadow',
  'gradient',
  'animation-easing',
  'animation-duration',
  'typography-family'
];

const CODECS: Record<ComposerCategory, TokenCodec<unknown>> = {
  shadow: shadowCodec as TokenCodec<unknown>,
  gradient: gradientCodec as TokenCodec<unknown>,
  'animation-easing': easingCodec as TokenCodec<unknown>,
  'animation-duration': durationCodec as TokenCodec<unknown>,
  'typography-family': fontFamilyCodec as TokenCodec<unknown>
};

export function isComposerCategory(category: string): category is ComposerCategory {
  return Object.prototype.hasOwnProperty.call(CODECS, category);
}

/** The codec for a category, or `null` for the nine that keep a text box. */
export function codecForCategory(category: TokenCategory | string): TokenCodec<unknown> | null {
  return isComposerCategory(category) ? CODECS[category] : null;
}

/** The type chip's word: *Shadow*, *Gradient*, *Easing*, *Duration*, *Font*. */
export const COMPOSER_TYPE_LABEL: Record<ComposerCategory, string> = {
  shadow: 'Shadow',
  gradient: 'Gradient',
  'animation-easing': 'Easing',
  'animation-duration': 'Duration',
  'typography-family': 'Font'
};

/**
 * Where a value stands with its codec: the four outcomes CMP-006 counts. `rewrite` cannot happen
 * through a codec that ends `decode` with the round-trip check, and the census asserts that it
 * never does.
 */
export type RoundTripOutcome = 'visual' | 'visual-kept-literal' | 'text' | 'rewrite';

export function roundTripOutcome(category: string, value: string): RoundTripOutcome {
  const codec = codecForCategory(category);
  if (!codec) return 'text';
  const model = codec.decode(value);
  if (model === null) return 'text';
  if (codec.encode(model) !== value) return 'rewrite';
  return JSON.stringify(model).includes('"kind":"literal"') ? 'visual-kept-literal' : 'visual';
}

/** The row's words for a value, or `null` when the codec cannot read it (the row keeps its text box). */
export function describeTokenValue(category: string, value: string): string | null {
  const codec = codecForCategory(category);
  if (!codec) return null;
  const model = codec.decode(value);
  return model === null ? null : codec.describe(model);
}

/**
 * Why a codec refused a value, for the composer's sentence and for `validate_project`. Best-effort
 * and specific where a shape is one edit away from readable.
 */
export function refusalReason(category: string, value: string): string | null {
  const codec = codecForCategory(category);
  if (!codec || codec.decode(value) !== null) return null;
  switch (category) {
    case 'shadow':
      if (/\d(em|rem|%)\b/.test(value)) return 'lengths must be px';
      if (/,(?! )/.test(value.replace(/\([^)]*\)/g, ''))) return 'layers are separated by a comma and a space';
      return 'a layer is [inset] <x> <y> [<blur> [<spread>]] <colour>';
    case 'gradient':
      if (/^conic-gradient/.test(value)) return 'conic gradients are not composable';
      if (/^repeating-/.test(value)) return 'repeating gradients are not composable';
      if (/^radial-gradient\((circle|ellipse|closest-|farthest-)/.test(value))
        return 'a radial gradient is <w>% <h>% at <x>% <y>%';
      return 'a gradient is linear-gradient(<deg>deg | to <side>, <colour> [<pos>%], …) or radial-gradient(<w>% <h>% at <x>% <y>%, …)';
    case 'animation-easing':
      if (/^ease/.test(value)) return 'use linear or cubic-bezier(a, b, c, d)';
      if (/^steps\(/.test(value)) return 'steps() is not composable';
      return 'easing is linear or cubic-bezier(a, b, c, d)';
    case 'animation-duration':
      if (/s$/.test(value) && !/ms$/.test(value)) return 'durations are written in ms';
      return 'a duration is <n>ms';
    case 'typography-family':
      return 'a font family is a lead font then a fallback tail, separated by a comma and a space';
    default:
      return null;
  }
}
