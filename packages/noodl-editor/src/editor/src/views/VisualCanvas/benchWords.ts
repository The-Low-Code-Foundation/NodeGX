/**
 * TVW-001 (f) — the Workbench calls itself the Workbench.
 *
 * P66 FIX-019 ruled the word *workbench* down to a single string, on the reasoning that the surface
 * should describe itself rather than name itself. P93 R-G reverses that: a surface a person cannot
 * name is a surface they cannot ask for, search the docs for, or file a bug about. The menu row, the
 * caption and the scope picker now all say the same word, and they say it from here.
 *
 * ⚠️ **A module, not three literals.** This is the same reasoning VFN-011 applied to its own
 * `TEST_VALUES_NOTE`: a name enforced by separate copies is a name that decays the first time one
 * copy is edited. The drift is not hypothetical in this codebase — slice 4 deleted `CLOUD_SHEET.displayName`
 * for being a second spelling of `SECTION_LABEL.cloud` that had *already* drifted by a capital letter.
 *
 * ⚠️ **Not the Blockly logic bench.** `views/BlocklyEditor/benchModel.ts` has a different surface
 * with a different promise (it runs blocks in the editor against typed-in values, and VFN-011's
 * criterion 3 requires it to say so). Richard ruled on 2026-09-17 that the sweep takes the *jargon*
 * out of that surface without giving it this name, so it says "test values" and never "Workbench".
 * Nothing here is imported there, deliberately — see TVW-001 §6.
 *
 * Pure: no React, no editor singletons. Graded in `tests-unit/tvw-001/benchWords.test.ts`.
 *
 * @module noodl-editor/views/VisualCanvas/benchWords
 */

/** The name of the surface. Every user-visible mention of it resolves here. */
export const WORKBENCH = 'Workbench';

/**
 * The components-panel row that mounts a component on it.
 *
 * Row f promotes this to sit directly under *Open*, which it already did — what changed is that it
 * no longer says *Show in workbench*, a verb ("show") that read as a preview toggle rather than as
 * the second of two ways to open the thing you right-clicked.
 */
export const OPEN_ON_WORKBENCH = `Open on the ${WORKBENCH}`;

/**
 * The non-breaking space between the name and the sentence.
 *
 * Exported so the caption's two rendered halves and {@link benchCaption} cannot disagree about what
 * joins them — the pure function is only worth grading if it is the same string the person reads.
 */
export const CAPTION_JOIN = ' ';

/**
 * What the caption says after the name.
 *
 * 🔴 **"Sample values." used to be here, and Richard ruled it out on 2026-09-18.** It was not
 * wrong — `ComponentBench` really does mount with `useSampleData: true` hardcoded — but it was the
 * *second* meaning of *sample* on this surface. The bench summary sits ~44px below this caption and
 * says **"No sample data"** (`sandboxData.ts`, about backend *records*, in the empty-data branch
 * that every project without a backend shows). Two green specs, one contradicting screen: a person
 * read "Sample values." directly above "No sample data" and had no way to know the two words meant
 * different things. The row f sweep unified *Workbench* across three dialects and never saw it,
 * because a sweep greps for the word it is unifying, not for the words already present.
 *
 * ⚠️ **The data story now belongs to one sentence, not two.** The summary line owns it. If this
 * caption ever needs to talk about data again, it has to say something the summary does not
 * already say, in a word the summary does not already use.
 *
 * Cutting it also bought back width on the one element in the strip that is allowed to shrink —
 * see `VisualCanvas.module.scss`, where the size controls now give way before this sentence does.
 */
export function benchCaptionRest(targetLabel: string): string {
  return `— ${targetLabel} on its own, not the app.`;
}

/**
 * The whole caption as a person reads it, for grading and for any surface that needs it in one
 * piece. `VisualCanvas` draws it in two elements so the name can carry its own weight.
 */
export function benchCaption(targetLabel: string): string {
  return `${WORKBENCH}${CAPTION_JOIN}${benchCaptionRest(targetLabel)}`;
}
