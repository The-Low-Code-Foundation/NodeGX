/**
 * P102 CMP-001 — the one tokenizer every codec shares.
 *
 * A CSS value is split on a separator only at **paren depth 0 and outside quotes**, so that
 * `rgb(0 0 0 / 0.1)` stays one token when a shadow layer is split on spaces, and
 * `'Apple Color Emoji'` stays one entry when a font stack is split on commas. A value with
 * unbalanced parentheses or an unclosed quote returns `null`: the codec that asked cannot read
 * its shape, and README §6.1 says such a value opens as text rather than being guessed at.
 */

export function splitTopLevel(value: string, separator: ',' | ' '): string[] | null {
  const out: string[] = [];
  let depth = 0;
  let quote: '"' | "'" | null = null;
  let current = '';

  for (let i = 0; i < value.length; i++) {
    const ch = value[i];

    if (quote) {
      current += ch;
      if (ch === quote) quote = null;
      continue;
    }

    if (ch === '"' || ch === "'") {
      quote = ch;
      current += ch;
      continue;
    }

    if (ch === '(') {
      depth++;
      current += ch;
      continue;
    }

    if (ch === ')') {
      depth--;
      if (depth < 0) return null;
      current += ch;
      continue;
    }

    if (depth === 0 && ch === separator) {
      if (separator === ' ') {
        // Runs of whitespace are one separator when splitting on spaces.
        if (current !== '') out.push(current);
        current = '';
      } else {
        out.push(current);
        current = '';
      }
      continue;
    }

    current += ch;
  }

  if (depth !== 0 || quote) return null;
  if (separator === ' ') {
    if (current !== '') out.push(current);
  } else {
    out.push(current);
  }
  return out;
}

/**
 * Split on commas and trim each part, refusing an empty part (`a,,b`) — the shape every
 * comma-separated value in this phase has. The trimmed spelling is what `encode` writes back
 * with `', '`, so a value that used `,` with no space fails the round-trip check and opens as text.
 */
export function splitCommaList(value: string): string[] | null {
  const parts = splitTopLevel(value, ',');
  if (!parts) return null;
  const trimmed = parts.map((p) => p.trim());
  if (trimmed.some((p) => p === '')) return null;
  return trimmed;
}

/** A CSS number: `0`, `-3`, `0.5`, `12.25`. Not `.5` — that would not round-trip through `String()`. */
export const CSS_NUMBER = /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/;

/** Parse a number in the spelling `String(n)` would write back, or `null`. */
export function readCssNumber(text: string): number | null {
  if (!CSS_NUMBER.test(text)) return null;
  const n = Number(text);
  if (!Number.isFinite(n)) return null;
  // `-0` prints as `0`; a value spelled `-0` would not round-trip.
  if (String(n) !== text) return null;
  return n;
}
