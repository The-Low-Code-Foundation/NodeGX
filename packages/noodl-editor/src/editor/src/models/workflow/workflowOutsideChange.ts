/**
 * P132 BWF-008 AC2 — what the open workflow does when `nodegx.automations.json` changes under it (Studio's save, the
 * agent's, a git pull). Pure, so it is graded in plain jest; `WorkflowEditorService.automationsFileChanged` acts on it.
 *
 * The backend stamps `updatedAt` on every save, the editor's own included, and the editor's own save also writes the
 * file: comparing the backend's stamp with the one this document was loaded or saved at is what tells "my own write
 * coming back" from "someone else's". A save still in flight is waited for before asking (the watcher can fire before
 * the save's answer lands).
 *
 * @module models/workflow/workflowOutsideChange
 */

export type OutsideChange =
  /** The backend's copy is the one on the canvas: our own save, or a change to another workflow. */
  | 'unchanged'
  /** Changed elsewhere, nothing unsaved here: redraw it from the backend. */
  | 'reload'
  /** Changed elsewhere while this canvas has unsaved edits: neither is overwritten until the person says which. */
  | 'ask'
  /** It is no longer on the backend: deleted elsewhere. */
  | 'gone';

export function decideOutsideChange(args: {
  /** The backend's `updatedAt` for this workflow now, or null when the backend no longer has it. */
  theirs: string | null;
  /** The `updatedAt` of the definition on the canvas (as opened, or as last saved here). */
  mine: string | undefined;
  dirty: boolean;
}): OutsideChange {
  if (args.theirs === null) return 'gone';
  if (args.theirs === args.mine) return 'unchanged';
  return args.dirty ? 'ask' : 'reload';
}
