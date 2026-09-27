/**
 * P102 CMP-001 §3 — resolve every `var(--x)` **inside** a value, recursively.
 *
 * `TokenResolver` (editor) resolves a value only when the whole value is one `var()`; a `var()`
 * inside a gradient was never touched, which is why four of the five default gradients drew a
 * blank preview (README §2). This is the one definition of the inline walk, shared by the row
 * preview, the composer preview and anything else that paints a token's value.
 *
 * - A name the lookup does not know keeps its `var()` fallback if it has one, else stays as
 *   written (the browser will do the same).
 * - A token that refers to a token is followed, to `maxDepth`; a cycle stops there and the
 *   remaining `var()` is left as written.
 */

const VAR_INLINE = /var\(\s*(--[\w-]+)\s*(?:,\s*([^()]*(?:\([^()]*\)[^()]*)*))?\)/g;

export function resolveVarsInline(value: string, lookup: (name: string) => string | undefined, maxDepth = 10): string {
  let current = value;
  for (let depth = 0; depth < maxDepth; depth++) {
    let changed = false;
    const next = current.replace(VAR_INLINE, (whole, name: string, fallback: string | undefined) => {
      const found = lookup(name);
      if (found !== undefined) {
        changed = true;
        return found;
      }
      if (fallback !== undefined) {
        changed = true;
        return fallback.trim();
      }
      return whole;
    });
    current = next;
    if (!changed) break;
  }
  return current;
}

/** True when a value still names a `var()` after resolution: nothing can paint it. */
export function hasUnresolvedVar(value: string): boolean {
  return /var\(--[\w-]+/.test(value);
}
