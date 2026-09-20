# HLT-002 — verdict, 2026-09-20

**Built.** A 21-minute driven session logs **0** `UnknownVizError` rejections while the capture
runs **56 times and really captures 41 pictures** — so the zero is not the zero of a deleted
feature. The drive that reads it has been shown to read **7** against the unguarded build, and, on
the arm that does not depend on luck, **2 `capturePage` calls per hidden phase against 0**.

## 1. 🔴 The task file said "a webview that is not attached". It was wrong, and that is why this took four phases

`captureThumbnail` has carried an attachment guard — `webviewDomReady && webview.isConnected` —
since the **initial commit**. Four sessions read this code, saw a guard, and filed the rejection as
an observation. The guard was never the problem; it was checking a property that was always true.

Re-measured before a line was written ([[measure-the-artefact-before-believing-the-task-file]]).
At **every one of seven failures** on a driven session, the webview was:

| reading | value |
|---|---|
| `isConnected` | **true** |
| `webviewDomReady` | **true** |
| `document.visibilityState` | **"visible"** |
| `getBoundingClientRect()` | **988 × 285** — a real rectangle |
| `checkVisibility()` | **false** |

**It is not detached. It is hidden.** BEN-004 R3 hides the app stage with `visibility: hidden`
rather than unmounting it, deliberately, so the preview keeps its route and its half-filled form
while the bench or the board is on top — and `updateViewportSize` needs the layout box to stay
real, so `display: none` was ruled out on purpose. `checkVisibility` is the *only* reading that
sees an ancestor's `visibility`; `isConnected`, `offsetParent` and the bounding rect all pass.

🔴 **So nothing about this file changed between P56's 6 events and Richard's 116. The editor
changed around it.** "Hidden but attached" went from impossible to routine when the preview gained
its second and third modes, and the count tracked that: **6 → 15 → 116**. This is the sharpest
version of the phase's thesis available — the row was disowned four times, and while it was
unowned the product grew a new way to hit it.

## 2. 🔴 There is a second regime, and it emits nothing at all

With the editor window occluded — `visibilityState === 'hidden'`, the ordinary state of an editor
behind VS Code — `capturePage()` **does not reject. It never settles.** Measured 2026-09-20: still
pending after 15 seconds, against a timer that fires every 20 seconds. Every tick spent behind
another window left another capture pending for the life of the window.

This is worth more than its own bullet:

- it emits **no** rejection, **no** console error and **no** log line, so every instrument anyone
  has pointed at this — including the first two versions of this drive — was blind to it;
- it is invisible to the phase README's §3 count, which is a count of *renderer error events*;
- it is why the mechanism probe for this task appeared to hang. The probe was not broken. It was
  the first thing to observe the regime.

A fourth phase could have filed "116 rejections" correctly and still missed this entirely.

## 3. The pair, and why the obvious control could not be the graded one

| run | build | phase | `capturePage` calls | rejections |
|---|---|---|---|---|
| control | unguarded | app showing | 2 | 0 |
| control | unguarded | hidden (bench + board) | **4** | **7** |
| fixed | guarded | app showing | 2 → 41 over the long run | 0 |
| fixed | guarded | hidden (bench + board) | **0** | **0** |

⚠️ **The rejection count is recorded but NOT graded on the control run, and that is deliberate.**
Two runs of the identical unguarded build read **7** and **0** — whether a hidden webview's capture
rejects depends on whether Chromium still holds a surface for it. A signal that fires only
sometimes cannot grade anything in either direction: it would fail an unguarded run that happened
to keep its surface, and the next reader would take that for evidence the defect was gone
([[a-reading-that-fits-is-not-one-that-excludes]]).

**The graded control is the thing the fix actually changes:** with the guard, `capturePage` is
never called while the stage is hidden; without it, it is called every tick. That is deterministic,
and it is the pair.

## 4. The fix

`views/VisualCanvas/thumbnailCapture.ts` — the rule as data, so a spec can grade it rather than a
driver. Four phases observed this defect live and not one of them could write a test for it; that
is the split `previewScope.ts` already makes in the same directory.

- `thumbnailCaptureSkipReason` answers *can a capture produce a picture right now*, and names the
  reason: `no-webview`, `not-dom-ready`, `detached`, `not-drawn`, `window-hidden`.
- `captureThumbnailSafely` contains **both** failure shapes. AC2 is explicit about this because
  P93 `TVW-008 §10` deleted the entire preview on the board's first press with a `.catch()` against
  a **synchronous** throw ([[a-catch-cannot-see-a-synchronous-throw]]). The call and its `await`
  are inside one `try`, and the spec drives a stub that throws beside one that rejects.

🔴 **Skipping is the correct behaviour, not the quiet one.** A capture of a stage nobody is looking
at is wrong in *both* outcomes: it fails, which is the rejection counted here, or it succeeds
against a stale compositor frame and writes a picture of a project that no longer looks like that.
The guard prevents the call rather than catching its result, and a spec asserts the capture is
never invoked while hidden — a `try/catch` passes every other spec in the file and fails that one.

## 5. 🔴 What the fix CAUSES, counted beside what it cures

The standing rule from HLT-001 ([[a-drive-that-counts-only-the-cured-error-cannot-see-a-trade]]).
One real trade was found and fixed in the same commit:

**`UseCaptureThumbnails` leaked an IPC listener per tick.** The detached-preview branch registered
`ipcRenderer.once('viewer-capture-thumb-reply')` every 20 seconds, and `viewer.js` replies only
*when it captured something*. Every skipped capture left a `once` listener installed forever — on a
42-minute session, ~126 of them. It was survivable while skips were rare. **This fix makes skips
ordinary**, because the app preview is hidden for as long as anyone uses the bench or the board, so
shipping the guard alone would have turned a slow leak into a fast one. It is now one listener,
installed with the interval and removed with it.

Also checked and clear:
- **thumbnails still update** — 41 real captures across the session, AC3's control in the same run;
- **the cure is not a move** — 0 `console.error` events carrying the message, so the rejection was
  not merely converted into a logged error;
- **the log boundary is clean** — the last `UnknownVizError` in `.logs/dev.log` is immediately
  followed by the `[HMR] Updated modules:` line that loaded the fix. Nothing after it.

## 6. 🔴 Three instrument faults, each of which read as a result

Recorded because each one would have shipped a wrong conclusion, and two of them *did* produce a
printed verdict before being caught.

**(a) The drive graded its own wrapper.** The arm that checks "the running bundle carries the seam
this run means to grade" read `String(CanvasView.prototype.captureThumbnail)` — *after* the
instrument had replaced that prototype method with its own. It reported `UNGUARDED` against a build
that carried the guard, and, worse, reported that as a **PASS** on the `--expect firing` runs. It
now reads the product's source, stashed before the wrap.

**(b) A phase that claimed to be the app preview was in bench mode.** The scope survives in project
state, so a re-run starts wherever the last run left off. The drive assumed app mode, ran its "the
capture should succeed here" phase hidden, and printed three failures against a phase it had never
entered. The mode is now set and then *read back*.

**(c) The mode arm fitted without excluding.** It read `is-hidden` on the app stage — true in bench
mode and board mode alike — so a board phase whose click never landed (the rows do not exist until
the chip's listbox is open) read "hidden" and **passed**. The board and the bench each mount a
component of their own, and that is what now separates the three answers
([[a-reading-that-fits-is-not-one-that-excludes]]).

## 7. What this does NOT close

⚠️ **Thumbnails do not update while the editor window is occluded**, by design — that is the
`window-hidden` skip, and it is strictly better than a capture that never settles. It means a
project card can be up to one visible-window tick out of date. No row: this is the correct
behaviour, and it is written into the seam rather than left to be rediscovered.

⚠️ **The detached preview window was not driven.** `viewer-frame/src/views/viewer.js:127` awaits
`captureThumbnail` the same unguarded way, and it inherits the containment because the fix is in
the method rather than at the call site — but that path was reasoned about, not measured. It needs
a detached-preview drive, which belongs with whatever next touches that window.

⚠️ **Nothing stops the next surface from hiding the stage and rediscovering this.** The guard is
correct but it is not enforced: a new preview mode that hides the app stage is fine, and a new
caller that reaches for `webview.capturePage()` directly is not. That is HLT-010's territory,
alongside HLT-001's `createRoot` observation.

**The 46 duplicate-key errors and the 404/401 requests in this session's log are not this task's
and are not filed as observations** — HLT-003 and HLT-004 own them, and both rows already exist.
