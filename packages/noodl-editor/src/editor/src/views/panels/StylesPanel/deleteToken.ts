/**
 * Delete a token somebody ADDED, with the reach counted first — the one handler every token list in
 * the Styles panel calls.
 *
 * P103 CMG-002 §3.2 wrote this inside `TokensSection` (Type, Spacing, Borders, Effects, Motion), and
 * the colour tokens under *Colours › Design tokens* never got it: their menu offered *Reset to
 * default*, greyed out with *"You added this token — it has no default"*, and no way to remove the
 * token at all (bug P103-CMG002-COLOURDELETE). One handler, imported by both, so the two lists
 * cannot drift apart again.
 *
 * Pure: the confirm and the toast are handed in, so the rule is graded in plain Node
 * (`tests-unit/cmg-002/colour-token-delete.test.ts`).
 *
 * 🔴 A shipped default is never deleted here. `deleteCustomToken` on a default name RESETS it, which
 * is not what a button labelled *Delete* promises — so the button is only offered when
 * `isAddedToken`, and this refuses anything else rather than quietly resetting it.
 */
import { buildDefaultTokenMap } from '@noodl-models/StyleTokensModel/DefaultTokens';
import {
  describeTokenUsage,
  tokenUsageCount,
  tokenUsageIn,
  type TokenUsageProject
} from '@noodl-models/StyleTokensModel/tokenUsage';
import { escapeHtml } from '@noodl-utils/escapeHtml';

const DEFAULTS = buildDefaultTokenMap();

/** A token a person ADDED: stored, and with no shipped default to go back to. */
export function isAddedToken(token: { name: string; isCustom?: boolean }): boolean {
  return token.isCustom === true && !DEFAULTS.has(token.name);
}

export interface DeleteTokenDeps {
  project: TokenUsageProject | null | undefined;
  /** Every token, so a token built from this one (`--ring: var(--x)`) counts as a wearer. */
  tokens: readonly { name: string; value: string }[];
  model: { deleteCustomToken(name: string, args?: { undo?: boolean; label?: string }): void };
  confirm: (args: { title: string; message: string; confirmLabel: string; onConfirm: () => void }) => void;
  toast: (message: string) => void;
}

/**
 * Deletes at once when nothing wears the token; otherwise asks first, saying what wears it.
 * Returns false (and does nothing) for a token that is not one somebody added.
 */
export function deleteTokenAsking(token: { name: string; isCustom?: boolean }, deps: DeleteTokenDeps): boolean {
  if (!isAddedToken(token)) return false;
  const remove = () => {
    deps.model.deleteCustomToken(token.name, { undo: true, label: `Delete ${token.name}` });
    deps.toast(`Deleted ${token.name} — ⌘Z brings it back`);
  };
  // The reach, counted before anything is deleted, through the one walk CMG-010's *Used by*
  // reads too ([[count-the-reach-first]]).
  const usage = tokenUsageIn(deps.project, deps.tokens, token.name);
  if (tokenUsageCount(usage) === 0) {
    remove();
    return true;
  }
  deps.confirm({
    title: 'DELETE TOKEN',
    message:
      `Delete <strong>${escapeHtml(token.name)}</strong>?<br>` +
      `${escapeHtml(describeTokenUsage(usage))}. They will fall back to their own value.`,
    confirmLabel: 'Yes, delete',
    onConfirm: remove
  });
  return true;
}
