# HLT-002 — The thumbnail nobody caught

**116 unhandled promise rejections in 42 minutes. Seen and written down four times since August, in
four different phases, every one of them now closed.**

## 1. The person sentence

> **The project cards in the launcher show a current picture of the project, and when the capture
> cannot run it fails quietly and on purpose rather than as an unhandled rejection.**

## 2. What it is

```
Uncaught (in promise) Error: Error invoking remote method 'GUEST_VIEW_MANAGER_CALL':
    Error: UnknownVizError
    at CanvasView.captureThumbnail (views/VisualCanvas/CanvasView.ts:357)
    at UseCaptureThumbnails.ts:24
```

`captureThumbnail` calls `webview.capturePage()` on a `<webview>` that is not attached — and the
`await` has nothing catching it. `UseCaptureThumbnails` runs it on a timer, so it repeats for as
long as the editor is open.

## 3. 🔴 Its history, which is this phase's whole thesis

| when | where | what was written | that phase |
|---|---|---|---|
| P23 | `UIX-006-NOTES.md:47` | documents the pipeline: `UseCaptureThumbnails → captureThumbnail → webview.capturePage()`, **every 20s** | ✅ complete |
| P56 | `HANDOVER-SESSION-5.md:115` | *"~6 times per session … Pre-existing … **no observed consequence** — noted so the next driver does not attribute it to their change"* | closed |
| P66 | `FIX-019:111` | *"Observation, not this task's defect … ~15 during this drive … Filed in NEXT-SESSION-PROMPT §3"* | ✅ closed 2026-08-18 — **the handoff no longer carries the row** |
| P39 | `POL-010:84` | same exception class elsewhere, ruled *"Not a state any user can produce"* | closed |

**6 → 15 → 116.** Every note was individually correct and scoped out honestly. The count grew
twentyfold anyway, because a note is not an owner.

🔴 **"No observed consequence" was wrong, and P93 proved it.** `TVW-008 §10` — the board's very
first drive — **deleted the whole preview on the first press**, because `executeJavaScript` throws
*synchronously* on an unattached `<webview>` and the guard was a `.catch()`. Same object, same
lifetime bug, same "harmless" class. It was harmless right up until it was not
([[a-catch-cannot-see-a-synchronous-throw]]).

## 4. Scope

**In:** the rejection, and the question of whether the capture should be running at all when its
target is gone.

**Out:** redesigning thumbnails, changing the capture interval, changing what the card shows when
there is no thumbnail. If the capture is found to be pointless, that is a **finding with a row**,
not a deletion inside this task.

## 5. Acceptance criteria

1. **(the number)** A driven session of at least 20 minutes, with project open/close and canvas
   navigation, logs **0** `UnknownVizError` rejections. Log committed to `verdicts/HLT-002/<date>/`.
2. 🔴 **The guard handles a SYNCHRONOUS throw as well as a rejection.** A spec calls the wrapped
   capture with a stub that throws synchronously *and* one that rejects, and both are contained.
   A `.catch()` alone passes a drive and fails the product — that is precisely how `TVW-008`'s
   preview was deleted.
3. **The thumbnail still updates when the webview IS attached** — a control in the same run, or the
   fix is indistinguishable from deleting the feature
   ([[a-negative-arm-needs-its-control-in-the-same-run]]).
4. **Silence is not the criterion, correctness is.** If the capture is skipped, something must say
   so at debug level; a swallowed error that leaves a stale card forever is a worse defect wearing
   a clean log.
5. `test:ci` at the floor.

## 6. Landmines

- 🔴 **Do not fix this by widening a try/catch until the log is quiet.** The question is *why is a
  capture being attempted against a detached webview* — answer that first, then guard.
- ⚠️ **The 116 is from one 42-minute session on three surfaces.** Re-measure on your own drive.
- 🔴 **Four previous sessions filed this correctly and it still grew.** When this task finds
  something adjacent, it gets a row in this phase's README with an owner. Not a note.
