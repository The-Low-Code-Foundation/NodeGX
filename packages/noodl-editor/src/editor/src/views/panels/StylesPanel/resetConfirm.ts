/**
 * P103 CMG-004 §3.4 — what a reset says before it acts.
 *
 * README §7: *"A one-click action that changes more than the row it sits on says what it will
 * change, before it changes it, in the person's words. Undo is not a substitute: the stack dies
 * with the editor, and nobody undoes what they did not see happen."*
 *
 * The sentence is built here, pure, so a spec can read it; the modal is `ConfirmModal`, which
 * renders `message` as HTML — every name and value is escaped on the way in (`escapeHtml`'s own
 * header says why).
 */

import { escapeHtml } from '@noodl-utils/escapeHtml';

import { ChangedToken, isColourCategory, mostVisibleChanges } from '@noodl-models/StyleTokensModel/TokenChanges';

export interface ResetConfirmText {
  title: string;
  /** HTML. */
  message: string;
  confirmLabel: string;
}

/** A swatch drawn inline in the modal, for a colour a person recognises faster than its hex. */
function swatch(colour: string): string {
  const safe = escapeHtml(colour);
  return (
    `<span style="display:inline-block;width:11px;height:11px;border-radius:2px;vertical-align:-1px;` +
    `margin:0 3px 0 1px;border:1px solid rgba(128,128,128,0.5);background:${safe}"></span>`
  );
}

function valueHtml(value: string, resolved: string, colour: boolean): string {
  return colour ? `${swatch(resolved)}<code>${escapeHtml(value)}</code>` : `<code>${escapeHtml(value)}</code>`;
}

/**
 * @param scope what the person pressed: *this section* names it, *all* does not.
 * @param resolve resolves `var()` references so a swatch can be painted.
 */
export function describeReset(
  changed: readonly ChangedToken[],
  scope: { kind: 'all' } | { kind: 'section'; title: string },
  resolve: (value: string) => string,
  added: number = 0
): ResetConfirmText {
  const n = changed.length;
  const where = scope.kind === 'section' ? ` in ${escapeHtml(scope.title)}` : '';
  const lines: string[] = [];

  lines.push(`Put <strong>${n} token${n === 1 ? '' : 's'}</strong>${where} back to ${n === 1 ? 'its' : 'their'} default${n === 1 ? '' : 's'}?`);

  const named = mostVisibleChanges(changed, 2);
  const parts = named.map((c) => {
    const colour = isColourCategory(String(c.token.category));
    return (
      `<strong>${escapeHtml(c.token.name)}</strong> goes from ` +
      `${valueHtml(c.token.value, resolve(c.token.value), colour)} to ` +
      `${valueHtml(c.defaultValue, resolve(c.defaultValue), colour)}`
    );
  });
  const rest = n - named.length;
  if (parts.length) {
    lines.push(`${parts.join(', and ')}${rest > 0 ? `, and ${rest} more` : ''}.`);
  }

  if (added > 0) {
    lines.push(`The ${added} token${added === 1 ? '' : 's'} you added ${added === 1 ? 'is' : 'are'} kept.`);
  }
  lines.push('You can undo this until you close the project.');

  return {
    title: scope.kind === 'section' ? `RESET ${scope.title.toUpperCase()}` : 'RESET TOKENS',
    message: lines.join('<br>'),
    confirmLabel: `Yes, put ${n === 1 ? 'it' : 'them'} back`
  };
}
