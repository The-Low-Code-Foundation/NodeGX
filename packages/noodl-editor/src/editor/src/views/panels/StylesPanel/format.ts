/**
 * P94 STY-005 — what the panel's rows PRINT, as pure functions of what is stored.
 *
 * 🔴 **This file imports NOTHING**, for the same reason `StylesModel.usage.ts` does not: everything
 * these functions were written inside — the section components — reaches `StylesModel`, `PopupLayer`
 * and `ToastLayer`, and `StylesModel` pulls `projectmodel` → `bugtracker`, whose module body throws
 * under jest before a test runs. A row's text was unreadable by any gate until it moved here.
 */

/**
 * What a text style row prints under its name.
 *
 * It says the size, the weight and the face, because those are what tell two text styles apart at
 * a glance. It prints the value **as stored** — `var(--text-base)` stays `var(--text-base)`.
 * Resolving that to `16px` here would be this panel teaching, on every row, the exact habit the
 * phase exists to replace.
 *
 * 🔴 **A text style field has TWO shapes in the wild, and a reader that knows one prints nothing
 * for the other.** Measured on a real project before this was ever drawn: the `nodegx.styles.json`
 * sidecar stores sizes as `{ value: '14', unit: 'px' }` — the shape the size port hands back —
 * while node parameters across the corpus store the same field as the plain string
 * `var(--text-sm)`. The first draft filtered to `typeof === 'string'` and would have drawn every
 * row in that project with a blank value line, which reads as *"this style sets nothing"*.
 */
export function summariseTextStyle(style: unknown): string {
  if (!style || typeof style !== 'object') return '';

  const s = style as Record<string, unknown>;
  const parts = [scalar(s.fontSize), scalar(s.fontWeight), faceName(s.fontFamily)];

  return parts.filter((p) => p.length > 0).join(' · ');
}

/** A field that is either `'var(--text-sm)'` or `{ value: '14', unit: 'px' }`. */
function scalar(field: unknown): string {
  if (typeof field === 'string') return field;
  if (typeof field === 'number') return String(field);
  if (field && typeof field === 'object') {
    const f = field as { value?: unknown; unit?: unknown };
    if (f.value !== undefined) return `${f.value}${f.unit ?? ''}`;
  }
  return '';
}

/** `fonts/Roboto/Roboto-Medium.ttf` is a path, and a row has no room to say it. */
function faceName(fontFamily: unknown): string {
  if (typeof fontFamily !== 'string' || fontFamily.length === 0) return '';
  const file = fontFamily.split('/').pop() ?? fontFamily;
  return file.replace(/\.(ttf|otf|woff2?|eot)$/i, '');
}

/** `net.noodl.controls.button` says nothing to a person; `Button` does. */
export function displayTypeName(typename: unknown): string {
  if (typeof typename !== 'string' || typename.length === 0) return '';
  const last = typename.split('.').pop() ?? typename;
  return last.charAt(0).toUpperCase() + last.slice(1);
}

/**
 * The half-sentence a delete-confirm puts after "It is used by".
 *
 * Both halves are named because they are different things to a person: a node is somewhere on a
 * canvas they can go and look at, and a Look is a rule that would take the style off everything
 * wearing it.
 */
export function describeUsage(nodeCount: number, variantCount: number): string {
  const parts: string[] = [];
  if (nodeCount) parts.push(`${nodeCount} ${nodeCount === 1 ? 'node' : 'nodes'}`);
  if (variantCount) parts.push(`${variantCount} ${variantCount === 1 ? 'Look' : 'Looks'}`);
  return parts.join(' and ');
}
