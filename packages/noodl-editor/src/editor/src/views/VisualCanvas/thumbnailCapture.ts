/**
 * HLT-002 — whether a thumbnail capture can produce a picture, and containment for when it cannot.
 *
 * `UseCaptureThumbnails` asks the canvas for a thumbnail every 20 seconds for as long as a project
 * is open. `CanvasView.captureThumbnail` awaited `webview.capturePage()` behind a guard that asked
 * whether the `<webview>` was **attached** — and attachment was never the condition:
 *
 *   Uncaught (in promise) Error: Error invoking remote method 'GUEST_VIEW_MANAGER_CALL':
 *     Error: UnknownVizError
 *
 * 116 of those in Richard's 42-minute session on 2026-09-20, after 15 in P66's and 6 in P56's. The
 * guard has been unchanged since the initial commit; what changed was the editor around it.
 *
 * 🔴 **Measured on a driven session, at every one of seven failures:** `isConnected: true`,
 * `webviewDomReady: true`, `document.visibilityState: "visible"`, a real `988×285` rectangle — and
 * `checkVisibility(): false`. The webview is in the document and the window is on screen. What it
 * is not is **being drawn**. BEN-004 R3 hides the app stage with `visibility: hidden` rather than
 * unmounting it, on purpose, so the preview keeps its route and its half-filled form while the
 * bench or the board is on top — and `updateViewportSize` needs its layout box to stay real. So
 * "hidden but attached" went from impossible to routine when the preview gained its second and
 * third modes, and an attachment guard cannot see it.
 *
 * 🔴 **And there is a second regime, which is why the count is as large as it is.** With the editor
 * window occluded (`document.visibilityState === 'hidden'`) `capturePage()` does not reject — it
 * **never settles at all**. Measured 2026-09-20: still pending after 15 seconds, against a timer
 * that fires every 20. Every tick spent behind another window leaves another capture pending
 * forever. That regime is invisible to any instrument that counts rejections, which is part of why
 * four phases looked at this and read it as harmless.
 *
 * 🔴 **Hiding is a reason not to capture, not a failure to tolerate.** A capture of a stage nobody
 * is looking at is wrong in *both* of its outcomes: it fails, which is the rejection this task
 * counts, or it succeeds against a stale compositor frame and writes a thumbnail of something the
 * project no longer looks like. Skipping is the correct behaviour, and AC4's point exactly —
 * silence is not the criterion, correctness is.
 *
 * @module noodl-editor/views/VisualCanvas/thumbnailCapture
 */

/** Why a capture was not attempted. `null` from {@link thumbnailCaptureSkipReason} means it was. */
export type CaptureSkipReason = 'no-webview' | 'not-dom-ready' | 'detached' | 'not-drawn' | 'window-hidden';

/** How a capture that WAS attempted then failed. Both shapes are real — see the module docblock. */
export type CaptureFailure = 'threw' | 'rejected';

/**
 * What the decision needs to know, as data.
 *
 * Taken as a plain record rather than read off `CanvasView`, so the rule can be graded by a spec
 * instead of by a driver — the same split `previewScope.ts` makes in this directory, for the same
 * reason: a rule only a live editor can check is a rule that does not get checked. Four phases
 * filed this defect from live observation and none of them could write a test for it.
 */
export interface CaptureState {
  /** `CanvasView.webviewDomReady` — false until the guest page has loaded once. */
  domReady: boolean;
  /** The `<webview>` element, or null when the surface has no webview at all. */
  webview: {
    isConnected: boolean;
    checkVisibility?: (options?: {
      visibilityProperty?: boolean;
      opacityProperty?: boolean;
      contentVisibilityAuto?: boolean;
    }) => boolean;
  } | null;
  /** `document.visibilityState` — the editor window itself minimised or fully occluded. */
  pageVisibility: string;
}

/**
 * The one place that decides whether a capture is worth attempting.
 *
 * ⚠️ **`checkVisibility` is the only reading that sees an ANCESTOR's `visibility: hidden`.** An
 * `isConnected` check, an `offsetParent` check and a `getBoundingClientRect()` check all pass for
 * the hidden app stage — it keeps its layout box deliberately. So every cheap test that suggests
 * itself here is precisely one that cannot see the state this function exists to catch.
 *
 * ⚠️ **Absent `checkVisibility` is treated as visible.** It has been in Chromium since 105 and this
 * Electron is far past that, but a missing capability must not silently disable thumbnails
 * forever. If that optimism is ever wrong, {@link captureThumbnailSafely} contains the result
 * rather than letting it escape.
 */
export function thumbnailCaptureSkipReason(state: CaptureState): CaptureSkipReason | null {
  if (!state.webview) return 'no-webview';
  if (!state.domReady) return 'not-dom-ready';
  if (!state.webview.isConnected) return 'detached';
  // Checked before the element's own visibility: an occluded window is the regime where the call
  // never settles, and a pending promise per tick is worse than a rejection per tick.
  if (state.pageVisibility === 'hidden') return 'window-hidden';

  const check = state.webview.checkVisibility;
  if (typeof check === 'function') {
    const drawn = check.call(state.webview, {
      visibilityProperty: true,
      opacityProperty: true,
      contentVisibilityAuto: true
    });
    if (!drawn) return 'not-drawn';
  }

  return null;
}

/**
 * What a skip means, in words, for the debug line.
 *
 * AC4: *"If the capture is skipped, something must say so at debug level; a swallowed error that
 * leaves a stale card forever is a worse defect wearing a clean log."* These sentences are that
 * saying-so, and they name the *situation* rather than the predicate, because the person reading
 * the log is wondering why the project card stopped changing.
 */
export const CAPTURE_SKIP_EXPLANATION: Record<CaptureSkipReason, string> = {
  'no-webview': 'the preview has no webview yet',
  'not-dom-ready': 'the preview page has not finished loading',
  detached: 'the preview webview is not in the document',
  // HLT-003: "Workbench", not "bench". P93's TVW-009 retired the bare word on any user-visible
  // string and `scripts/vocabulary-ratchet.js` names the replacement itself — this sentence
  // arrived with HLT-002 (`32c92b1c3`) and turned that gate red, which `test:ci` does not run and
  // so nobody saw. Unretired words only; "board" is current.
  'not-drawn': 'the app preview is hidden behind the Workbench or the board, so nothing is being drawn',
  'window-hidden': 'the editor window is minimised or fully occluded'
};

/**
 * Run `capture`, and contain BOTH of the ways it can fail.
 *
 * 🔴 **A `.catch()` is not enough, and this project has already paid for believing it was.** P93
 * `TVW-008 §10`: the board's first drive deleted the whole preview on the first press, because
 * `executeJavaScript` on an unattached `<webview>` throws **synchronously** while the guard was a
 * `.catch()` on a promise ([[a-catch-cannot-see-a-synchronous-throw]]). Same element, same
 * lifetime, same assumption. So the call and its `await` are inside one `try`, and the spec drives
 * a stub that throws synchronously beside one that rejects.
 *
 * Returns `null` when no picture was produced. Every caller already treats a falsy result as "no
 * thumbnail this time" — the guard it replaces returned `null` too — so containment does not need
 * a new contract at the call sites.
 */
export async function captureThumbnailSafely<T>(
  state: CaptureState,
  capture: () => Promise<T> | T,
  onSkip?: (reason: CaptureSkipReason | CaptureFailure, detail?: string) => void
): Promise<T | null> {
  const skip = thumbnailCaptureSkipReason(state);
  if (skip !== null) {
    onSkip?.(skip);
    return null;
  }

  try {
    // Both halves inside the one `try`: `capture()` can throw before it ever returns a promise,
    // and the promise it does return can reject. Catching only the second is the defect.
    const image = await capture();
    return image ?? null;
  } catch (error) {
    onSkip?.('rejected', error instanceof Error ? error.message : String(error));
    return null;
  }
}
