/**
 * TVW-002 AC5 — the strip in the **detached** preview window, and the two IPC channels it needs.
 *
 * ───────────────────────────────────────────────────────────────────────────────
 * 🔴 THE TASK FILE'S §3 CITED THE ONE FUNCTION THAT CANNOT WORK HERE.
 *
 * §3 said the strip "must render in the detached window too, reading
 * `activeCanvasComponentName()`". Measured, that is precisely the function that returns `undefined`
 * there — `benchRequest.ts` says so in its own doc comment, four lines below the line §3 cites.
 * The detached preview is a separate `BrowserWindow` (`main.js:551`) with no node graph and no
 * project model, so everything the sentence is computed FROM is in the other window.
 *
 * What §3 got right is the host: that renderer really does build a `CanvasView`
 * (`viewer-frame/src/views/viewer.js:11`, `:165`), which renders `VisualCanvas`
 * (`CanvasView.render` → `renderReact`). So the row itself is the same React row, styled by the
 * same tokens — `viewer-frame/index.js` imports `colors.css`. Nothing is re-implemented in plain
 * DOM.
 *
 * **So: the editor computes, the viewer renders, and the doors travel back.** The precedent for
 * each leg already exists in the tree and is followed rather than invented:
 *
 * - push: `viewer-design-selection` (DES-001), on `viewerWindow.forwardIpcEvents` (`main.js:1080`);
 * - return: `viewer-request-preview-mode`, on `forwardIpcEventsToEditorWindow` (`main.js:1067`),
 *   which forwards `...args`, so an action can carry a payload.
 *
 * ⚠️ **RULED 2026-09-18 (Richard): the detached strip CARRIES ITS DOORS.** The alternative on the
 * table was the sentence alone — cheaper, one-way, and defensible on the grounds that the detached
 * window is deliberately close to "just the app". He ruled for the doors: *no surface that explains
 * less than another*. That is what makes the return channel necessary, and it is the part that
 * cannot be graded without a drive, because it is a third process in the loop.
 *
 * ⚠️ **A known gap this does NOT close: the detached window never receives `data-theme`.**
 * `ThemeManager` stamps it on the editor renderer's `documentElement` only, so that window sits on
 * the dark `:root` defaults whatever the editor is set to (its `backgroundColor` is hard-coded
 * `#131313`). The strip inherits that; it does not cause it. The fix is a theme push on the same
 * forward list, which is a change to the window rather than to this task — recorded so AC6's
 * "both themes" is not read as a claim about this window.
 *
 * @module noodl-editor/views/VisualCanvas/detachedStrip
 */

import { seam, type StripModel } from './previewStripWords';

/** Editor window → detached viewer window. The computed sentence, or `null` to clear it. */
export const PREVIEW_STRIP_PUSH = 'viewer-preview-strip';

/** Detached viewer window → editor window. A door the person pressed. */
export const PREVIEW_STRIP_ACTION = 'viewer-preview-strip-action';

/**
 * What a door press means, said in a form that survives being serialised across two processes.
 *
 * ⚠️ **No component name and no route travel with it.** The editor already knows which component
 * its canvas is on and which page the door named — it is the window that computed the sentence in
 * the first place. Sending them back would be sending the editor its own state and inviting the two
 * copies to disagree; the viewer says only *which door*, because that is the only thing it knows
 * that the editor does not.
 */
export type StripAction =
  /** `Go to <page>` — the page is identified by index into the model's own `doors`. */
  | { kind: 'goto'; page: string }
  /** `Open on the Workbench`. */
  | { kind: 'bench' }
  /** The `×`. */
  | { kind: 'dismiss' }
  /**
   * Not a door — *"I have just loaded; tell me what is true."*
   *
   * 🔴 **Found by accident, and it is a real gap.** The push channel carries a CHANGE. A window that
   * opens, or reloads, while the canvas is sitting still therefore hears nothing and renders the
   * wordless seam — which is a legitimate state, so it looks exactly like working. TVW-002's own
   * AC5 drive missed it because the drive switches component immediately after detaching, which
   * pushes.
   *
   * ⚠️ The alternative was to seed from the detach payload, the way route, zoom and inspect mode
   * are seeded in `main.js`'s `did-finish-load`. That fixes *detaching* and not *reloading*, and it
   * races: the payload is assembled in the same tick the layout flips, before the strip for the
   * detached case has been computed. Asking is ordered by construction — the window cannot ask
   * before it exists, and the editor always knows the answer.
   */
  | { kind: 'ready' };

/** The props `CanvasView` hands `VisualCanvas` when it is the detached window's copy. */
export interface DetachedStripProps {
  /**
   * The strip the editor computed, or `undefined` when this copy is the docked one.
   *
   * 🔴 **`undefined` and `null` mean different things.** `undefined` is "nobody is pushing to me,
   * compute your own" — the docked window. `null` is "the editor pushed, and the answer is nothing"
   * — which still draws the wordless seam, because the seam is not the editor's to remove.
   */
  previewStrip?: StripModel | null;
  /** Set only in the detached window; its presence is what tells the row to send rather than act. */
  onStripAction?: (action: StripAction) => void;
}

/**
 * Which strip this copy of `VisualCanvas` draws.
 *
 * 🔴 **Extracted from the JSX because a mutant survived there.** Written inline as
 * `pushed ?? local` it was correct and completely ungraded: swapping it to `||` — the more natural
 * thing to type, and what a later reader "tidying up" would reach for — passed every test in the
 * suite. The difference only shows in the detached window, in the state that looks identical to
 * working.
 *
 * `undefined` — nobody is pushing to this copy, so it is the docked one and computes its own.
 * `null` — the editor pushed and had **nothing to say**. That still draws the wordless seam, and
 * `||` would silently fall through to the detached window's own `IDLE`. The two happen to render
 * the same thing today, which is exactly why nothing would catch it: the day the local strip stops
 * being `IDLE` there, the detached window starts drawing a sentence the editor did not send.
 *
 * @param pushed what the editor sent, or `undefined` when nothing is pushing here.
 * @param local what this window computed for itself.
 */
export function stripToRender(pushed: StripModel | null | undefined, local: StripModel): StripModel {
  if (pushed === undefined) return local;
  return pushed ?? seam();
}
