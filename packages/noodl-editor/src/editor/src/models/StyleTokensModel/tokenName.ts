/**
 * P103 CMG-002 / CMG-003 — what a person may call a token they add.
 *
 * Typed without the `--` (the field shows the prefix); refused, in words, when it is empty, is
 * not a custom-property name, or is already a token — default or custom. Pure, so the same rule
 * grades the Styles panel's ＋ and the MCP's writer alike.
 */

/** `brand-orange` → `--brand-orange`; `--brand-orange` stays; spaces around are dropped. */
export function tokenNameFromInput(input: string): string {
  const trimmed = input.trim();
  return trimmed.startsWith('--') ? trimmed : `--${trimmed}`;
}

/** What a custom property's ident may look like, after the `--`. Letters, digits, `-` and `_`; not starting with a digit. */
const IDENT = /^[A-Za-z_][A-Za-z0-9_-]*$/;

/**
 * Why a name cannot be used, in a sentence a person reads under the field — or `null` when it can.
 *
 * @param existing every token name the project already has, defaults included.
 */
export function tokenNameProblem(input: string, existing: ReadonlySet<string>): string | null {
  const bare = input.trim().replace(/^--/, '');
  if (bare === '') return 'Give it a name';
  if (!IDENT.test(bare)) {
    if (/\s/.test(bare)) return 'No spaces — try a hyphen: brand-orange';
    if (/^[0-9]/.test(bare)) return 'A name cannot start with a number';
    return 'Letters, numbers, hyphens and underscores only';
  }
  if (existing.has(`--${bare}`)) return `There is already a token called --${bare}`;
  return null;
}
