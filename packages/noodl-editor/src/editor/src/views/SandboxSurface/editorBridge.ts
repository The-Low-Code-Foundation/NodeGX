/**
 * TVW-003 AC4 — whether a sandbox window can tell the editor what was clicked in it.
 *
 * The app preview's `<webview>` loads `webview-preload-viewer.js`, which is what gives the running
 * app `window.NoodlEditor`; without it `viewer.jsx` builds no `Inspector`, so a design-mode click
 * selects nothing. A sandbox had no preload at all. The bench now asks for one; the authoring
 * preview deliberately does not — it shows a *proposed* graph, and a click there must not move the
 * app canvas.
 *
 * Pure: no React, no Electron, so `tests-unit/tvw-003` grades the decision.
 *
 * @module noodl-editor/views/SandboxSurface/editorBridge
 */

/** The preload the app preview uses (`CanvasView._setupWebview`). One file, two hosts. */
export const VIEWER_PRELOAD = 'src/assets/webview-preload-viewer.js';

export interface SandboxEditorBridge {
  /** `preload` attribute for the `<webview>`; `undefined` renders no attribute. */
  preload: string | undefined;
  /**
   * Guest script that puts the inspector in or out of design mode, or `null` when there is no
   * bridge. Guarded: a page that is not the viewer (a 404, an auth redirect) has no API.
   */
  inspectScript: string | null;
}

/**
 * @param designMode `undefined` for a host that must never select on the canvas; otherwise the
 *   editor's Design | Preview state, which the inspector follows exactly as the app preview's does.
 * @param appPath `platform.getAppPath()`, with its trailing slash.
 */
export function sandboxEditorBridge(designMode: boolean | undefined, appPath: string): SandboxEditorBridge {
  if (designMode === undefined) {
    return { preload: undefined, inspectScript: null };
  }

  return {
    preload: appPath + VIEWER_PRELOAD,
    inspectScript:
      `typeof NoodlEditorInspectorAPI !== 'undefined' && ` +
      `NoodlEditorInspectorAPI.setEnabled(${designMode === true})`
  };
}
