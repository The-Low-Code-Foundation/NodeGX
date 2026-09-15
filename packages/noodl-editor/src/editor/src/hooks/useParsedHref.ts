import { useMemo } from 'react';

/**
 * The href as it will be opened. A plain function so a HOOK-FREE caller can use it:
 * `PrimaryButton` is rendered by `tests-unit/support/renderElements` (CHR-005), which calls
 * components with React's dispatcher null and throws on any hook.
 */
export function parseHref(href?: string): string | null {
  if (!href) return null;

  const newHref = href.trim().replace(/\s/g, '');

  if (/^(:\/\/)/.test(newHref)) {
    return `http${newHref}`;
  }
  if (!/^(f|ht)tps?:\/\//i.test(newHref)) {
    return `http://${newHref}`;
  }

  return newHref;
}

export default function useParsedHref(href?: string) {
  return useMemo(() => parseHref(href), [href]);
}
