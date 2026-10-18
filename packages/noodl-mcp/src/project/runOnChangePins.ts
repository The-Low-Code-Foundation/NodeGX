/**
 * P109 ISL-018 — the door states the run-on-value-change boxes of the nodes IT writes, in a project the editor will
 * still upgrade (format < 5). The rule and its plan live in `@nodegx/project-contract/format` (`run-on-change-pins.ts`,
 * the why in full there); this module keeps what the door's write responses say about it.
 *
 * @module noodl-mcp/project/runOnChangePins
 */
import type { TickedBox } from '@nodegx/project-contract/format';

// P112-OWN008-FORMAT4PIN: the plan lives in the format, once, so the editor suite's reference pins as this door does.
export { pinAuthoredRunOnChange, projectWillBeCleanedUp, type TickedBox } from '@nodegx/project-contract/format';

/**
 * What a write response says when the door ticked boxes (ISL-018 §5, "Report it"): which, and why, so the agent can
 * see the door changed its graph and send `false` where it meant one. Nothing when it ticked none.
 */
export interface RunOnChangeTickedSummary {
  ticked?: { boxes: TickedBox[]; why: string };
}

export const TICKED_WHY =
  'This project was saved before the "run on value change" setting existed. The editor upgrades it the next time ' +
  'it opens. That upgrade unticks every unset box on a node whose Run is wired. The door wrote these boxes as ' +
  'ticked, which is what an unset box means today. Each node still runs when these values change. Send the ' +
  'parameter as false to switch one off.';

export function tickedPayload(boxes: readonly TickedBox[] | undefined): RunOnChangeTickedSummary {
  return boxes && boxes.length > 0 ? { ticked: { boxes: [...boxes], why: TICKED_WHY } } : {};
}
