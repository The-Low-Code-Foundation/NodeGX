/**
 * TVW-003 AC4 — the bench can tell the editor what was clicked; the authoring preview cannot.
 *
 * Only a `<webview>` that loads the viewer preload has `window.NoodlEditor`, and only then does the
 * runtime build an inspector. The bench needs one so a design-mode click selects on the canvas. The
 * authoring preview must not have one: it renders a proposal, and a click there moving the app
 * canvas would be the preview moving the editor for a graph that does not exist yet.
 */

import { sandboxEditorBridge, VIEWER_PRELOAD } from '../../src/editor/src/views/SandboxSurface/editorBridge';

const APP = '/Applications/Nodegx.app/Contents/Resources/app/';

describe('sandboxEditorBridge', () => {
  it('gives a host with no design mode (the authoring preview) no preload and no script', () => {
    expect(sandboxEditorBridge(undefined, APP)).toEqual({ preload: undefined, inspectScript: null });
  });

  it('gives the bench the same preload file the app preview loads', () => {
    expect(sandboxEditorBridge(false, APP).preload).toBe(APP + VIEWER_PRELOAD);
    expect(VIEWER_PRELOAD).toBe('src/assets/webview-preload-viewer.js');
  });

  it('bridges in Preview mode too, with the inspector off — so switching to Design needs no reload', () => {
    const bridge = sandboxEditorBridge(false, APP);
    expect(bridge.preload).toBeDefined();
    expect(bridge.inspectScript).toContain('setEnabled(false)');
  });

  it('turns the inspector on in Design mode', () => {
    expect(sandboxEditorBridge(true, APP).inspectScript).toContain('setEnabled(true)');
  });

  it('guards the script, so a page that is not the viewer does not throw', () => {
    const script = sandboxEditorBridge(true, APP).inspectScript;
    // Evaluated where the API does not exist: must be falsy, not a ReferenceError.
    // eslint-disable-next-line no-new-func
    expect(new Function(`return ${script}`)()).toBe(false);

    const calls: boolean[] = [];
    // eslint-disable-next-line no-new-func
    new Function('NoodlEditorInspectorAPI', `return ${script}`)({ setEnabled: (on: boolean) => calls.push(on) });
    expect(calls).toEqual([true]);
  });
});
