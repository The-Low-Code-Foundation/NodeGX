/**
 * TVW-008 s26 — the crash the first drive of the board found, and the arm that would have caught it.
 *
 * 🔴 **The defect was a rejection handler on a call that never returned a promise.**
 * `WebviewTag.executeJavaScript` calls `getWebContentsId()` first, and that **throws
 * synchronously** when the element is not attached or has not emitted `dom-ready`. The effect in
 * `useSandboxViewer` guarded it with `.catch()`, which can only ever see a rejection — so the throw
 * escaped a passive effect, React found no error boundary over the preview, and the whole preview
 * subtree unmounted. Measured on a fresh project: `[data-test="app-preview"]`, the scope chip and
 * the board were all absent from the DOM, and six of TVW-008's ACs were ungradable behind it.
 *
 * 🔴 **The first arm below is the one that matters, and it is the one that could not be written
 * before.** While the call sat inline in a `useEffect`, grading it needed a rendered `<webview>` —
 * so the guard shipped ungraded. Pulled out, the subject is a function and a throwing stub
 * ([[a-gate-can-have-a-hole-shaped-like-the-defect]]).
 */
import { applyInspectScript } from '../../src/editor/src/views/SandboxSurface/applyInspectScript';

const SCRIPT = 'window.__noodlInspect = true;';

/** Exactly how Electron fails an unattached webview — the message is verbatim from the crash log. */
const NOT_ATTACHED = 'The WebView must be attached to the DOM and the dom-ready event emitted before this method can be called.';

describe('TVW-008 s26 — applyInspectScript survives a window that is not ready', () => {
  it('🔴 does not rethrow when executeJavaScript throws SYNCHRONOUSLY', () => {
    // The exact shape that unmounted the preview. A `.catch()` cannot see this.
    const element = {
      executeJavaScript: () => {
        throw new Error(NOT_ATTACHED);
      }
    };

    expect(() => applyInspectScript(element as never, SCRIPT)).not.toThrow();
    expect(applyInspectScript(element as never, SCRIPT)).toBe(false);
  });

  it('does not produce an unhandled rejection when the promise REJECTS', async () => {
    // The rarer teardown race — the failure the original `.catch()` was written for. It still has
    // to be handled, so the fix is additive rather than a swap.
    let rejected: Promise<unknown> | null = null;
    const element = {
      executeJavaScript: () => {
        rejected = Promise.reject(new Error('window went away'));
        return rejected;
      }
    };

    expect(applyInspectScript(element as never, SCRIPT)).toBe(true);
    // If the handler had not been attached, this await would surface as an unhandled rejection.
    await expect(rejected).rejects.toThrow('window went away');
  });

  it('🔴 hands the script to a window that IS ready — the known-firing control', () => {
    // Without this arm, a `applyInspectScript` that did nothing at all would pass both arms above.
    // [[assert-an-absence-with-a-known-firing-signal-beside-it]]
    const seen: string[] = [];
    const element = {
      executeJavaScript: (code: string) => {
        seen.push(code);
        return Promise.resolve(undefined);
      }
    };

    expect(applyInspectScript(element as never, SCRIPT)).toBe(true);
    expect(seen).toEqual([SCRIPT]);
  });

  it('tolerates a host whose executeJavaScript returns no promise at all', () => {
    // Not hypothetical tidiness: the fix reads `.catch` off the return value, so a host returning
    // `undefined` would be a SECOND crash introduced by the fix for the first one.
    const element = { executeJavaScript: () => undefined as unknown as Promise<unknown> };

    expect(() => applyInspectScript(element as never, SCRIPT)).not.toThrow();
    expect(applyInspectScript(element as never, SCRIPT)).toBe(true);
  });
});
