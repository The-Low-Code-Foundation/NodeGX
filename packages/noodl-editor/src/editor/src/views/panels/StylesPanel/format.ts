/**
 * P94 STY-005 — what the panel's rows PRINT, as pure functions of what is stored.
 *
 * 🔴 **This file imports NOTHING**, for the same reason `StylesModel.usage.ts` does not: everything
 * these functions were written inside — the section components — reaches `StylesModel`, `PopupLayer`
 * and `ToastLayer`, and `StylesModel` pulls `projectmodel` → `bugtracker`, whose module body throws
 * under jest before a test runs. A row's text was unreadable by any gate until it moved here.
 */

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

/**
 * What one entry in a "where it's used" list PRINTS as its name. P94 STY-006 AC4.
 *
 * 🔴 **Never an id.** The list exists so a person can recognise the thing before pressing it, and
 * `a3f1c8e2-…` is recognisable to nobody. A node's own label is what they called it; a node that
 * has never been named prints its **type** instead, which is at least what they would see on the
 * canvas — `Text`, `Button` — and never `net.noodl.text`.
 *
 * ⚠️ `label` arrives as `''` from two different situations the walk cannot tell apart: a node with
 * no label, and a node whose `label` getter threw because its type never resolved. Both want the
 * same fallback, so the walk does not try to distinguish them.
 */
export function wearerLabel(wearer: { label?: string; typename?: string }): string {
  const label = typeof wearer.label === 'string' ? wearer.label.trim() : '';
  if (label.length > 0) return label;

  const type = displayTypeName(wearer.typename);
  return type.length > 0 ? type : 'Node';
}

/**
 * Where a wearer lives, as a person reads it.
 *
 * A component's `name` is its full path (`/Pages/Home`), and the panel is a narrow rail. The
 * canvas's own tab, the breadcrumb and `ComponentModel.displayName` all print the last segment, so
 * this list does too — a rail column is not where someone reads a path, and printing one wraps
 * every entry onto three lines.
 *
 * 🔴 **The full name is what the press uses** (`getComponentWithName`), and it is NOT this. A
 * caller that navigates by what this returns finds the wrong component the moment two folders hold
 * a `Home`. [[a-key-and-a-path-are-two-identities]].
 */
export function wearerLocation(componentName: unknown): string {
  if (typeof componentName !== 'string' || componentName.length === 0) return '';
  const segments = componentName.split('/').filter((s) => s.length > 0);
  return segments.length > 0 ? segments[segments.length - 1] : componentName;
}

/**
 * The sentence above a wearer list, for a person who has just pressed a number.
 *
 * It names both kinds because they are different things to do something about: a node is a place
 * you can go, and a Look is a rule that would take the style off everything wearing it — the same
 * distinction {@link describeUsage} makes inside the delete-confirm, said in the other direction.
 */
export function usageListTitle(nodeCount: number, variantCount: number): string {
  const used = describeUsage(nodeCount, variantCount);
  return used.length > 0 ? `Used by ${used}` : 'Nothing uses this';
}
