/**
 * P88 GAM-016 (R16 (c)) — a family token that names a face the project never ships.
 *
 * A preset (or a hand edit, or a template) sets `--font-sans: "Nunito", …`, nothing declares
 * `@font-face { font-family: 'Nunito' }`, and every visitor reads the next family in the stack.
 * The viewer loads a face only when a module stylesheet declares it; a family named inside a token
 * is never fetched (`fontloader.ts`). So the question is answerable from the files alone: the
 * effective family tokens, and the `@font-face` rules in the stylesheets the project's modules list.
 *
 * Only the **first** family is judged. It is the one the author chose; the rest are fallbacks, and a
 * fallback that is missing is what fallbacks are for.
 *
 * Pure: the caller reads the tokens and the stylesheets.
 */

import { DiagnosticCode, type Diagnostic } from './diagnostics';

/** The tokens that hold a font family. The other `--font-*` tokens are weights. */
export const FONT_FAMILY_TOKENS: readonly string[] = ['--font-sans', '--font-serif', '--font-mono'];

/**
 * Families a page can name without shipping a file: CSS generic families, the system-font keywords,
 * and the platform faces every desktop OS in use carries. Lower-case.
 *
 * ⚠️ Deliberately short. A face missing from this list reports a false warning, which costs a
 * sentence; a face wrongly on it hides D69, which cost a play test.
 */
const NEEDS_NO_FILE = new Set([
  'serif',
  'sans-serif',
  'monospace',
  'cursive',
  'fantasy',
  'math',
  'emoji',
  'fangsong',
  'system-ui',
  'ui-serif',
  'ui-sans-serif',
  'ui-monospace',
  'ui-rounded',
  '-apple-system',
  'blinkmacsystemfont',
  'arial',
  'helvetica',
  'helvetica neue',
  'georgia',
  'times',
  'times new roman',
  'courier',
  'courier new',
  'verdana',
  'tahoma',
  'trebuchet ms',
  'segoe ui',
  'menlo',
  'monaco',
  'consolas',
  'sf mono',
  'sfmono-regular'
]);

function unquote(family: string): string {
  const trimmed = family.trim();
  const quoted = /^(['"])(.*)\1$/.exec(trimmed);
  return (quoted ? quoted[2] : trimmed).trim();
}

/** The first family in a `font-family` value, unquoted, or `null` for an empty or `var(…)` value. */
export function firstFamily(value: string): string | null {
  const first = unquote(value.split(',')[0] ?? '');
  if (!first || first.startsWith('var(')) return null;
  return first;
}

/** Every family an `@font-face` rule in `css` declares, lower-cased. */
export function declaredFaces(css: string): Set<string> {
  const out = new Set<string>();
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const rule of withoutComments.matchAll(/@font-face\s*\{([^}]*)\}/gi)) {
    const family = /font-family\s*:\s*([^;]+);?/i.exec(rule[1]);
    if (family) out.add(unquote(family[1]).toLowerCase());
  }
  return out;
}

export interface FontFaceCheckInput {
  /** The project's effective tokens (defaults with its overrides applied). */
  tokens: ReadonlyArray<{ name: string; value: string }>;
  /** The text of every stylesheet the project's modules list. */
  stylesheets: readonly string[];
  /** Component the diagnostic is reported against (the root component). */
  component: string;
}

export function checkFontFaces(input: FontFaceCheckInput): Diagnostic[] {
  const declared = new Set<string>();
  for (const css of input.stylesheets) for (const face of declaredFaces(css)) declared.add(face);

  const out: Diagnostic[] = [];
  for (const token of input.tokens) {
    if (!FONT_FAMILY_TOKENS.includes(token.name)) continue;
    const family = firstFamily(token.value);
    if (family === null) continue;
    const key = family.toLowerCase();
    if (NEEDS_NO_FILE.has(key) || declared.has(key)) continue;
    out.push({
      code: DiagnosticCode.FontFaceNotShipped,
      severity: 'warning',
      message:
        `\`${token.name}\` names "${family}" first, and nothing in this project declares that face, so no ` +
        `visitor will see it: the page draws the next family in \`${token.value}\` instead. Browsers still ` +
        `report the family as written, so this is invisible on screen and in computed styles.`,
      location: { component: input.component },
      suggestion:
        `Ship the face: a folder in noodl_modules with the font files, its licence, a styles.css declaring ` +
        `@font-face { font-family: '${family}' } and a manifest.json listing that stylesheet under ` +
        `browser.stylesheets (a style preset does this for you). Or change \`${token.name}\` to a family the ` +
        `project ships, or to a system stack. Never link fonts.googleapis.com: an app must render offline.`
    });
  }
  return out;
}
