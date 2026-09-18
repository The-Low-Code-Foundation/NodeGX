/**
 * TVW-002 AC5 — the two channels the detached strip needs, pinned against `main.js`.
 *
 * 🔴 **This is a gate on a JOIN, and joins are what break silently here.** The strip's sentence
 * crosses three processes: the editor renderer computes it, the main process forwards it, the
 * viewer renderer draws it. Nothing type-checks across that boundary — `ipcRenderer.send` takes a
 * string — so a renamed channel compiles, runs, and simply does nothing, in the one window that no
 * unit test can mount.
 *
 * Worse, it fails *quietly in the right direction*: a detached strip with a dead push channel looks
 * exactly like a detached strip that correctly has nothing to say, because the wordless seam is a
 * legitimate state. There is no error and no empty screen — just a row that never speaks.
 *
 * So the constants are asserted against the **text of `main.js`**, in the specific forward list each
 * one has to be in. Forwarding the push channel to the editor window instead of the viewer window
 * would be a working, well-formed, entirely useless build.
 */

import * as fs from 'fs';
import * as path from 'path';

import {
  PREVIEW_STRIP_ACTION,
  PREVIEW_STRIP_PUSH,
  stripToRender
} from '../../src/editor/src/views/VisualCanvas/detachedStrip';
import { seam, type StripModel } from '../../src/editor/src/views/VisualCanvas/previewStripWords';

const MAIN = path.join(__dirname, '../../src/main/main.js');
const VIEWER = path.join(__dirname, '../../src/frames/viewer-frame/src/views/viewer.js');
const THEME_MANAGER = path.join(__dirname, '../../src/editor/src/models/ThemeManager.ts');

/**
 * The argument list of a call, by the name of the function called.
 *
 * Crude on purpose: it reads the source rather than importing it, because `main.js` is the Electron
 * main process and importing it would start an app. The slice is bounded by the closing `]);` of
 * the call, so a channel added to a *later* list cannot be mistaken for one in this list — which is
 * the only mistake this gate exists to catch.
 */
function forwardList(source: string, call: string): string {
  const start = source.indexOf(call);
  expect(start).toBeGreaterThan(-1);

  const end = source.indexOf(']);', start);
  expect(end).toBeGreaterThan(start);

  return source.slice(start, end);
}

describe('TVW-002 AC5 — the detached preview strip crosses three processes', () => {
  const main = fs.readFileSync(MAIN, 'utf8');

  it('pushes the sentence to the VIEWER window', () => {
    // `viewerWindow.forwardIpcEvents` — editor → detached preview. The same list `viewer-design-
    // selection` is on, which is the precedent this follows.
    const toViewer = forwardList(main, 'viewerWindow.forwardIpcEvents([');

    expect(toViewer).toContain(`'${PREVIEW_STRIP_PUSH}'`);
    // The known-firing signal beside the absence below: this list is demonstrably the right one.
    expect(toViewer).toContain(`'viewer-design-selection'`);
    // 🔴 …and the action must NOT be here. Forwarded this way it would travel editor → viewer,
    // which is the direction it is already going, and the doors would do nothing at all.
    expect(toViewer).not.toContain(`'${PREVIEW_STRIP_ACTION}'`);
  });

  it('returns a door press to the EDITOR window', () => {
    const toEditor = forwardList(main, 'forwardIpcEventsToEditorWindow([\n      ');

    expect(toEditor).toContain(`'${PREVIEW_STRIP_ACTION}'`);
    expect(toEditor).toContain(`'viewer-request-preview-mode'`);
    expect(toEditor).not.toContain(`'${PREVIEW_STRIP_PUSH}'`);
  });

  it('🔴 the two channels are different strings', () => {
    // One channel used both ways is a loop: main would forward the editor's own push back to it.
    expect(PREVIEW_STRIP_PUSH).not.toBe(PREVIEW_STRIP_ACTION);
  });

  it('the viewer renderer listens on the push channel, and declares itself detached', () => {
    const viewer = fs.readFileSync(VIEWER, 'utf8');

    expect(viewer).toContain(`ipcRenderer.on('${PREVIEW_STRIP_PUSH}'`);
    expect(viewer).toContain('showPreviewStrip');
    // Without this the row renders in that window with no way to send a door press anywhere —
    // Richard's 2026-09-18 ruling is that it carries its doors, and this line is what arms them.
    expect(viewer).toContain('setDetachedWindow()');
  });
});

/**
 * 🔴 These four arms exist because a mutant survived. `pushed ?? local`, written inline in the JSX,
 * passed the whole suite when flipped to `pushed || local` — a change a later reader would make
 * while tidying, in the one window no unit test can mount, in the state that looks exactly like
 * working. The decision moved into a function so it could be graded.
 */
describe('TVW-002 AC5 — which strip a window draws', () => {
  const local: StripModel = { shape: 'other-screen', tone: 'notice', lead: 'local', rest: '', doors: [] };
  const pushed: StripModel = { shape: 'logic', tone: 'notice', lead: 'pushed', rest: '', doors: [] };

  it('docked — nothing is pushing, so it draws what it computed', () => {
    expect(stripToRender(undefined, local)).toBe(local);
  });

  it('detached — it draws what the editor sent', () => {
    expect(stripToRender(pushed, local)).toBe(pushed);
  });

  it('🔴 a pushed NULL draws the seam, never the local strip', () => {
    // The editor said "nothing to say". `||` would fall through to whatever this window computed,
    // and the detached window would start drawing a sentence the editor did not send.
    expect(stripToRender(null, local)).toEqual(seam());
    expect(stripToRender(null, local)).not.toBe(local);
  });

  it('🔴 null and undefined are not the same answer', () => {
    expect(stripToRender(null, local)).not.toEqual(stripToRender(undefined, local));
  });
});

/**
 * TVW-002 AC6 — the detached window's theme, pinned the same way the strip's channels are.
 *
 * 🔴 Richard ruled this in on 2026-09-18 after the drive measured `data-theme` as **null** in that
 * window, permanently, whatever the editor was set to. It is the same silent-join shape as the
 * strip: three processes, a string channel, and a failure that looks exactly like "the theme simply
 * did not change" rather than like an error.
 *
 * ⚠️ It needs BOTH legs, and this is the arm that says so. A forward with no seed means a window
 * detached while the theme is sitting still never hears anything and opens dark in a light editor;
 * a seed with no forward means it never follows a change made afterwards. Each alone looks like it
 * works, in the state you happen to test.
 */
describe('TVW-002 AC6 — the detached window gets the editor theme', () => {
  const main = fs.readFileSync(MAIN, 'utf8');
  const THEME = 'viewer-set-theme';

  it('forwards a theme CHANGE to the viewer window', () => {
    const toViewer = forwardList(main, 'viewerWindow.forwardIpcEvents([');

    expect(toViewer).toContain(`'${THEME}'`);
    // The known-firing neighbour: this is demonstrably the editor → viewer list.
    expect(toViewer).toContain(`'viewer-design-selection'`);
  });

  it('🔴 also SEEDS it when the window opens, not only on a change', () => {
    // `did-finish-load` — the same place route, zoom, viewport and inspect mode are seeded.
    expect(main).toContain(`viewerWindow.send('${THEME}', eventArgs.theme)`);
  });

  it('the viewer renderer stamps it on documentElement', () => {
    const viewer = fs.readFileSync(VIEWER, 'utf8');

    expect(viewer).toContain(`ipcRenderer.on('${THEME}'`);
    expect(viewer).toContain(`setAttribute('data-theme'`);
  });

  it('🔴 sends the RESOLVED theme, never the mode', () => {
    // `system` means nothing in a window with no media query worth consulting — it would have to
    // re-answer a question this renderer has already answered, and could answer differently.
    const theme = fs.readFileSync(THEME_MANAGER, 'utf8');

    expect(theme).toContain('applyDetachedPreviewTheme(resolved)');
    expect(theme).not.toContain('applyDetachedPreviewTheme(this.mode)');
  });
});
