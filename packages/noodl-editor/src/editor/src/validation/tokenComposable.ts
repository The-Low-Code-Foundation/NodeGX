/**
 * P102 CMP-009 — a custom token the Styles panel's composer cannot open.
 *
 * The composer (P102) reads five token types — shadow, gradient, easing, duration, font family —
 * through one codec module, and opens a value visually only when the codec can read it exactly and
 * write it back byte-identical. A value the codec refuses is still valid CSS and still renders; it
 * just opens as raw text, with *Replace with a preset* as the only door out. An agent that wrote
 * `0 0.5em 1em #000` has therefore handed the person a shadow they can only edit by typing CSS,
 * which is the thing P102 exists to end. A warning, project-wide, reported once per token.
 *
 * 🔴 **The same codec module the editor and the census use**, by import path, never a copy
 * ([[a-second-copy-of-a-palette-drifts-silently]]). CMP-006 asserts the identity.
 *
 * Only **custom** tokens are judged: the defaults all pass (CMP-002…005 AC1), and a default that
 * did not would be a defect in the defaults, not in the project.
 *
 * Pure: the caller reads the tokens.
 */

import {
  codecForCategory,
  COMPOSER_CATEGORIES,
  refusalReason,
  roundTripOutcome
} from '@nodegx/project-contract/token-codecs';

import { DiagnosticCode, type Diagnostic } from './diagnostics';

/** The codec functions this check reads, exported so a spec can assert identity with the module. */
export const composerCodecs = { codecForCategory, roundTripOutcome, refusalReason };

export interface TokenComposableCheckInput {
  /** The project's effective tokens (defaults with its overrides applied). */
  tokens: ReadonlyArray<{ name: string; value: string; category?: string; isCustom?: boolean }>;
  /** Component the diagnostic is reported against (the root component). */
  component: string;
}

/** A spelling one edit away from readable, when there is one. */
function suggestedSpelling(category: string, value: string): string | undefined {
  const tries: string[] = [];
  if (category === 'shadow') {
    // `em`/`rem` → px at 16px; `,` with no space → `, `.
    tries.push(
      value
        .replace(/(-?\d*\.?\d+)rem\b/g, (_m, n) => `${Math.round(Number(n) * 16)}px`)
        .replace(/(-?\d*\.?\d+)em\b/g, (_m, n) => `${Math.round(Number(n) * 16)}px`)
    );
    tries.push(value.replace(/,(?! )/g, ', '));
  }
  if (category === 'gradient') tries.push(value.replace(/,(?! )/g, ', '));
  if (category === 'animation-easing') tries.push(value.replace(/,\s*/g, ', '));
  if (category === 'animation-duration') {
    const s = /^([0-9.]+)s$/.exec(value);
    if (s) tries.push(`${Math.round(Number(s[1]) * 1000)}ms`);
  }
  if (category === 'typography-family') tries.push(value.replace(/\s*,\s*/g, ', '));
  const codec = codecForCategory(category);
  if (!codec) return undefined;
  return tries.find((t) => t !== value && codec.decode(t) !== null);
}

export function checkTokenComposable(input: TokenComposableCheckInput): Diagnostic[] {
  const out: Diagnostic[] = [];
  for (const token of input.tokens) {
    if (!token.isCustom) continue;
    if (!token.category || !(COMPOSER_CATEGORIES as string[]).includes(token.category)) continue;
    if (roundTripOutcome(token.category, token.value) !== 'text') continue;
    const reason = refusalReason(token.category, token.value) ?? 'the composer cannot read its shape';
    const suggestion = suggestedSpelling(token.category, token.value);
    out.push({
      code: DiagnosticCode.TokenNotComposable,
      severity: 'warning',
      message:
        `\`${token.name}\` is \`${token.value}\`, which the Styles panel can only show as raw CSS: ${reason}. ` +
        `It still renders; a person editing it has to type CSS.`,
      location: { component: input.component },
      ...(suggestion ? { suggestion: `${token.name}: ${suggestion}` } : {})
    });
  }
  return out;
}
