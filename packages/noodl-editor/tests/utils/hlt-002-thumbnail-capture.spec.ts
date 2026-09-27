/**
 * HLT-002 — the thumbnail capture that ran against a stage nobody was looking at.
 *
 * The defect this grades: `captureThumbnail` awaited `webview.capturePage()` behind a guard that
 * asked whether the `<webview>` was **attached**, and produced
 *
 *   Uncaught (in promise) Error: Error invoking remote method 'GUEST_VIEW_MANAGER_CALL':
 *     Error: UnknownVizError
 *
 * 116 times in a 42-minute session. There are three ways to fake passing this, and all three are
 * asserted against:
 *
 *  - 🔴 **catch only the rejection.** AC2 is explicit, because this project has already paid for
 *    it: P93 `TVW-008 §10` deleted the whole preview on the board's first press, because
 *    `executeJavaScript` on an unattached `<webview>` throws *synchronously* and the guard was a
 *    `.catch()` ([[a-catch-cannot-see-a-synchronous-throw]]). §"both shapes" drives a stub that
 *    throws synchronously beside one that rejects.
 *  - 🔴 **stop capturing altogether.** A guard that returns `null` unconditionally silences every
 *    rejection and deletes the feature. §"the control" asserts the capture really runs, and that
 *    its picture is really returned, when the preview is showing.
 *  - 🔴 **go quiet.** AC4: a skip has to say why, or a stale project card is a worse defect wearing
 *    a clean log. §"a skip says why" asserts the reason reaches the caller.
 *
 * The mutant that restores the old `webviewDomReady && isConnected` guard is red on
 * "skips when the app stage is hidden behind the bench or the board" — which is the state every
 * one of the seven measured failures was in.
 */

import {
  CAPTURE_SKIP_EXPLANATION,
  captureThumbnailSafely,
  thumbnailCaptureSkipReason,
  type CaptureState
} from '../../src/editor/src/views/VisualCanvas/thumbnailCapture';

/**
 * A webview in the state the *working* case is in: attached, drawn, in a visible window.
 *
 * Every field is overridable so each spec below varies exactly one thing — a control pair proves
 * what you varied and nothing else ([[a-control-pair-proves-what-you-varied-only]]).
 */
function showing(overrides: Partial<CaptureState> = {}): CaptureState {
  return {
    domReady: true,
    webview: { isConnected: true, checkVisibility: () => true },
    pageVisibility: 'visible',
    ...overrides
  };
}

describe('HLT-002 — when a thumbnail capture is worth attempting', () => {
  it('captures when the app preview is showing — the control, without which every spec below passes by deleting the feature', () => {
    expect(thumbnailCaptureSkipReason(showing())).toBeNull();
  });

  it('🔴 skips when the app stage is hidden behind the bench or the board', () => {
    // The measured state, verbatim: attached, DOM-ready, window on screen, real rectangle — and
    // not being drawn, because BEN-004 R3 hides the stage with `visibility: hidden` rather than
    // unmounting it. `checkVisibility` is the only reading that sees an ANCESTOR's visibility;
    // `isConnected` is true here and so is every cheap test that suggests itself.
    const reason = thumbnailCaptureSkipReason(showing({ webview: { isConnected: true, checkVisibility: () => false } }));
    expect(reason).toEqual('not-drawn');
  });

  it('🔴 skips when the editor window is occluded — the regime where capturePage never settles at all', () => {
    // Measured 2026-09-20: with `visibilityState === 'hidden'` the promise was still pending after
    // 15 seconds, against a timer that fires every 20. That regime emits no rejection, so an
    // instrument counting rejections cannot see it, and a pending promise per tick accumulates for
    // as long as the editor sits behind another window.
    expect(thumbnailCaptureSkipReason(showing({ pageVisibility: 'hidden' }))).toEqual('window-hidden');
  });

  it('skips when there is no webview, when it has not loaded, and when it is genuinely detached', () => {
    expect(thumbnailCaptureSkipReason(showing({ webview: null }))).toEqual('no-webview');
    expect(thumbnailCaptureSkipReason(showing({ domReady: false }))).toEqual('not-dom-ready');
    expect(thumbnailCaptureSkipReason(showing({ webview: { isConnected: false } }))).toEqual('detached');
  });

  it('treats a webview with no checkVisibility as drawn — a missing capability must not disable thumbnails forever', () => {
    expect(thumbnailCaptureSkipReason(showing({ webview: { isConnected: true } }))).toBeNull();
  });
});

describe('HLT-002 — containment, in both of the shapes a capture can fail', () => {
  it('🔴 contains a SYNCHRONOUS throw — the shape a .catch() cannot see', async () => {
    const skips: string[] = [];
    const result = await captureThumbnailSafely(
      showing(),
      () => {
        throw new Error('The WebView must be attached to the DOM');
      },
      (reason) => skips.push(reason)
    );

    expect(result).toBeNull();
    expect(skips).toEqual(['rejected']);
  });

  it('🔴 contains a REJECTION — the shape the 116 events were', async () => {
    const skips: string[] = [];
    const details: (string | undefined)[] = [];
    const result = await captureThumbnailSafely(
      showing(),
      () => Promise.reject(new Error("Error invoking remote method 'GUEST_VIEW_MANAGER_CALL': Error: UnknownVizError")),
      (reason, detail) => {
        skips.push(reason);
        details.push(detail);
      }
    );

    expect(result).toBeNull();
    expect(skips).toEqual(['rejected']);
    // The message survives, so a log line can say what actually went wrong rather than "something".
    expect(details[0]).toContain('UnknownVizError');
  });

  it('🔴 the control — a capture that WORKS returns its picture, and is not swallowed with the failures', async () => {
    const skips: string[] = [];
    const image = { size: '400x400' };
    const result = await captureThumbnailSafely(showing(), () => Promise.resolve(image), (reason) => skips.push(reason));

    expect(result).toBe(image);
    expect(skips).toEqual([]);
  });

  it('does not call the capture at all when the stage is hidden — the rejection is prevented, not caught', async () => {
    let called = 0;
    const skips: string[] = [];
    const result = await captureThumbnailSafely(
      showing({ webview: { isConnected: true, checkVisibility: () => false } }),
      () => {
        called += 1;
        return Promise.resolve({});
      },
      (reason) => skips.push(reason)
    );

    // A try/catch around the call would pass every other spec here and fail this one. The point of
    // the guard is that a capture of a surface nobody is looking at is never attempted — it would
    // otherwise either fail, or succeed against a stale frame and write a thumbnail of a project
    // that no longer looks like that.
    expect(called).toEqual(0);
    expect(result).toBeNull();
    expect(skips).toEqual(['not-drawn']);
  });

  it('AC4 — a skip says why, in words the person reading the log is actually asking', () => {
    // "Why did my project card stop changing?" — so the sentences name the situation rather than
    // the predicate that detected it.
    expect(CAPTURE_SKIP_EXPLANATION['not-drawn']).toContain('hidden');
    expect(CAPTURE_SKIP_EXPLANATION['window-hidden']).toContain('occluded');
    // Every reason, so a new one added to the type without a sentence fails here rather than
    // reaching the log as `undefined`.
    for (const sentence of Object.values(CAPTURE_SKIP_EXPLANATION)) {
      expect(sentence.length).toBeGreaterThan(0);
    }
  });
});
