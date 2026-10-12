/**
 * The words a Problems panel row shows for one diagnostic.
 *
 * A `suggestion` is a typed name the rule offers ("did you mean `value`?") — but several rules also write it into their
 * own sentence: `deprecated-node` names the successor ("Use HTTP Request (net.noodl.HTTP) instead."),
 * `raw-spacing-literal` and `inert-dimension` name the token or value to write. Asking "did you mean" after that repeats
 * the sentence as a question about a typo the person never made (P107-S93-DIDYOUMEAN: 2,457 of 2,677 suggested rows on
 * Erleah-2). The tail is kept for a suggestion the message does not already say.
 *
 * @module noodl-editor/views/panels/ProblemsPanel/diagnosticText
 */

import { Diagnostic } from '../../../validation/diagnostics';

export function diagnosticText(d: Pick<Diagnostic, 'message' | 'suggestion'>): string {
  let text = d.message;
  if (d.suggestion && !d.message.includes(d.suggestion)) text += `  — did you mean “${d.suggestion}”?`;
  return text;
}
