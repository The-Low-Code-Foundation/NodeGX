/**
 * Running the design-mode inspect script in a `<webview>` that may not be ready.
 *
 * 🔴 **This is a module of its own because the defect it fixes was ungradable where it lived.**
 * It was three lines inside a `useEffect` in `useSandboxViewer.ts`, and that file imports
 * `ViewerConnection` → `projectmodel` → `bugtracker`, which reads Electron's user-data path at
 * module scope. So a spec could not load it at all, and the guard shipped unmeasured — the same
 * reason `boardSurface.ts`, `previewScope.ts` and `benchScenarios.ts` are pure modules beside the
 * components that use them. A rule only a live driver can check is a rule that does not get
 * checked, and this one went unchecked until a drive lost the entire preview to it.
 *
 * @module noodl-editor/views/SandboxSurface/applyInspectScript
 */

/** The only thing this needs of a `<webview>`. Narrow on purpose: a spec can supply it. */
export interface InspectScriptTarget {
  executeJavaScript(code: string): Promise<unknown>;
}

/**
 * Hand `script` to `element`, tolerating a window that is not ready yet.
 *
 * 🔴 **Both failure shapes, and the first one is the bug.** `WebviewTag.executeJavaScript` calls
 * `getWebContentsId()` **before** it returns anything, and that **throws synchronously** with
 * *"The WebView must be attached to the DOM and the dom-ready event emitted before this method can
 * be called"*. The original guard was a `.catch()` — a rejection handler on a call that, in this
 * failure mode, never returns a promise for one to attach to. The throw escaped a passive effect,
 * React found no error boundary over the preview, and the whole preview subtree unmounted:
 * measured 2026-09-20 opening the board on a fresh project, with `[data-test="app-preview"]`, the
 * scope chip and the board all absent from the DOM.
 *
 * The second shape — a rejected promise when the window is torn down mid-call — is the one the
 * original `.catch()` was written for and is still real, so this handles both rather than swapping
 * one for the other.
 *
 * Neither is logged and neither is rethrown: both mean *not ready*, and both have the same
 * recovery — the `dom-ready` listener applies the script once the window is actually there.
 *
 * @returns `true` when the script reached the window, `false` when it was not ready.
 */
export function applyInspectScript(element: InspectScriptTarget, script: string): boolean {
  try {
    const result = element.executeJavaScript(script);
    // ⚠️ Guarded because a host may return nothing at all — reading `.catch` off `undefined` would
    // be a second crash introduced by the fix for the first one.
    if (result && typeof result.catch === 'function') result.catch(() => undefined);
    return true;
  } catch (error) {
    return false;
  }
}
