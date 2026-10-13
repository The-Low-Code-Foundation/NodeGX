/**
 * `focus/not-mounted` — what a Focus that found nothing tells the editor (NSP-019 R35). Seven nodes say it, each from its own
 * Focus action: Group (group.ts :181-200), Text Input (text-input.ts :288-309) and the five controls that take their Focus and
 * Blur from `addFocusActions` (controls/utils.ts :398-419: Button, Checkbox, Dropdown, Radio Button, Slider).
 *
 * The rule is the same in all seven. The runtime asks the focus tracker to focus the node (`setNodeFocused`), which refuses a
 * node that is not on the page. Every Focus replaces the sentence: a Focus that found nothing shows it, and a Focus that
 * reached the node withdraws it. Nothing else touches it. Each spec already reads that refusal as `onPage` (its Focus is
 * Unchanged exactly there), so the sentence follows the last Focus's `onPage`, kept as `focusMissed`.
 */

export const FOCUS_NOT_MOUNTED = 'focus/not-mounted';

/** group.ts :195-196 */
export const GROUP_FOCUS_NOT_MOUNTED =
  'Focus arrived while this group was not on the page, so nothing was focused. A Focus is not kept ' +
  'for later: send it once the group has mounted, for example from its Did Mount';

/** text-input.ts :304-305 */
export const FIELD_FOCUS_NOT_MOUNTED =
  'Focus arrived while this field was not on the page, so nothing was focused. A Focus is not kept for ' +
  'later: send it once the field has mounted, for example from its row’s Did Mount';

/** controls/utils.ts :414-415 — `noun` as each control passes it to `addFocusActions` */
export function controlFocusNotMounted(noun: string): string {
  return (
    `Focus arrived while this ${noun} was not on the page, so nothing was focused. A Focus is not kept ` +
    `for later: send it once the ${noun} has mounted, for example from its Did Mount or its row’s`
  );
}

/**
 * A Focus's `set` for the sentence, on every Focus. Set only when it moved, each Focus branch split in two, and a swap between a
 * branch and its twin wrote the value the flag already held: a mutant no play can tell apart (s103, 20 of them at seed 20739).
 */
export function focusMissed(_s: { readonly focusMissed: boolean }, missed: boolean): { focusMissed: boolean } {
  return { focusMissed: missed };
}

/** The spec's `diagnostics` entry: the sentence while the last Focus found nothing. */
export function focusDiagnostics(sentence: string) {
  return {
    [FOCUS_NOT_MOUNTED]: {
      says: 'the last Focus arrived while it was not on the page',
      message: (_i: unknown, s: { readonly focusMissed: boolean }) => (s.focusMissed ? sentence : null)
    }
  };
}

/** The version note each of the seven carries for this change (NSP-010). */
export function focusChange(version: number) {
  return {
    version,
    says: 'A Focus that arrives while the node is not on the page now shows as its warning in this spec, until a Focus reaches it. The runtime has always shown it',
    row: 'NSP-019 R35 (P107 s103)',
    migration: { none: 'Only the editor is told, and the runtime already told it. Nothing a wire carries changes' }
  };
}
