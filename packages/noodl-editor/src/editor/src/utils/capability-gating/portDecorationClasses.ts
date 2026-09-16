/**
 * BCN-010's class names, with nothing else attached.
 *
 * ## 🔴 Why these three lines are their own module
 *
 * `portDecoration.ts` imports `./index` for `gateSentence`, which reaches `projectmodel` and then
 * `bugtracker`, which reads a user-data path at module scope. So **importing the class names pulls
 * in the editor's singletons**, and anything that does it dies in the `tests-unit` runner with
 * `Cannot read properties of undefined (reading 'join')` — a failure that looks nothing like its
 * cause. It is the same wall CHR-007 hit from `Ports.ts` (`capability-gating` / `schemahandler` →
 * `projectmodel` → `bugtracker`).
 *
 * `PropertyRow` draws what the decorator used to draw and needs only these strings. Copying them
 * would have worked and would have drifted — a second copy of a name the stylesheet also spells is
 * exactly the shape that has silently diverged in this repo before. So they move here, and
 * `portDecoration.ts` re-exports them: one definition, reachable without the editor.
 */

/** Wrapper around a row whose backend cannot support it. */
export const GATED_PORT_CLASS = 'property-capability-gated';
/** The dimmed, inert control — drawn only when the gate is not usable at all. */
export const GATED_PORT_CONTROL_CLASS = 'property-capability-gated-control';
/** The sentence under it. */
export const GATED_PORT_REASON_CLASS = 'property-capability-reason';
