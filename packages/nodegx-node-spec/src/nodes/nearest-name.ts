/**
 * `nearestName` — `packages/noodl-runtime/src/diagnostics.ts` :138-213, verbatim (read 2026-10-01).
 * States names the state an author most likely meant in its Error output (states.ts :718-725).
 *
 * THE RULE: a candidate equal ignoring case and surrounding whitespace wins outright; otherwise the
 * one closest by edit distance (Levenshtein, case-folded, trimmed), within ONE edit for a name of
 * four characters or fewer and TWO for a longer one — and nothing on a tie, nothing past the budget,
 * nothing when there are more than 64 candidates.
 */

function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let previous = new Array<number>(b.length + 1);
  let current = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) previous[j] = j;
  for (let i = 1; i <= a.length; i++) {
    current[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const substitution = previous[j - 1] + (a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1);
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, substitution);
    }
    const swap = previous;
    previous = current;
    current = swap;
  }
  return previous[b.length];
}

const MAX_CANDIDATES = 64;

export function nearestName(name: string, candidates: readonly string[]): string | undefined {
  if (typeof name !== 'string' || !name.length || !candidates || !candidates.length) return undefined;
  if (candidates.length > MAX_CANDIDATES) return undefined;
  const normalised = name.trim().toLowerCase();
  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    if (typeof candidate === 'string' && candidate.trim().toLowerCase() === normalised) return candidate;
  }
  const budget = normalised.length <= 4 ? 1 : 2;
  let best: string | undefined;
  let bestDistance = budget + 1;
  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    if (typeof candidate !== 'string') continue;
    const distance = editDistance(normalised, candidate.trim().toLowerCase());
    if (distance < bestDistance) {
      bestDistance = distance;
      best = candidate;
    } else if (distance === bestDistance) {
      best = undefined;
    }
  }
  return bestDistance <= budget ? best : undefined;
}
