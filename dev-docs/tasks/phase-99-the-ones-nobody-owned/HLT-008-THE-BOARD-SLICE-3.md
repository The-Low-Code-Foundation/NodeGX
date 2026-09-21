# HLT-008 — The board, slice 3

> ✅ **BUILT 2026-09-21 (P99 s10).** 21/21 driven arms on the fixed build, 9/20 on HEAD — see the
> [verdict](./verdicts/HLT-008/2026-09-21/VERDICT.md). AC1–AC6 and AC8's `test:main` half are met
> here; 📋 **AC7 is Richard's WORTHY on `shots/hlt008-fixed-ac7-{light,dark}.png` and closes in P93.**
> ⚠️ §2 is corrected by the verdict §2: B2/B3 are the one `<webview>` painted white over the union
> of the frames, and B5's content half was a harness port Group does not have (`layout`).

**Richard drove the board by hand on 2026-09-20 — the first time anyone but a script had touched it
— and ruled P93 `TVW-008` AC7 NOT WORTHY on six defects. He then ruled the work into this phase.**

## 🔴 The acceptance criteria did NOT move

**P93 `TVW-008` AC1, AC3 and AC7 stay in P93.** This task does the building; **P93 closes them**,
from P93's own re-drive. Neither phase marks the board done alone, and **P93 cannot close until this
task lands**. The full record, with the mechanism for each row, is `TVW-008 §11`.

## 1. The person sentence

> **Someone who puts three components on the board can see where one ends and the next begins, drag
> one without being thrown off the surface, and still pan the canvas afterwards.**

## 2. The six

| # | what he hit | lands on |
|---|---|---|
| **B1** | `Workbench` shown while the board is active. ⚠️ **NOT the scope chip** — that is correct (`PreviewChrome.tsx:137` → `scopeChipLabel` → `previewScope.ts:387-397`, exhaustive, returns `'Board'`). It is **two other controls in the same corner**: the board's own `+` popup heading, hardcoded `<span>{WORKBENCH}</span>` (`ComponentBoard.tsx:405`, drawn at `top:36px;left:8px`) — the dropdown he actually read — and the scope picker's **menu rows**, where the board row is `` `${WORKBENCH} ${BOARD.toLowerCase()}` `` → **"Workbench board"** (`benchWords.ts:93`, `PreviewChrome.tsx:185`) under a bare `{WORKBENCH}` heading (`:200`) | AC7 |
| **B2** | A frame with no saved size opens **~900px tall for one button**. `readBenchFrameDefault` treats an absent height as *fill the stage*, so `768 × auto` becomes a stage-height white slab. The Workbench already solved this with **Set as default size**; the board offers no such gesture | AC3 |
| **B3** | Two frames sit **flush, no gutter**, and their slabs then **eat the canvas until it cannot be panned** | AC1, AC7 |
| **B4** | Clicking a caption navigates to that component on the Workbench — he liked it — **but it fires on presses meant to start a drag**, throwing him off the board | AC1, AC7 |
| **B5** | A dragged frame **leaves its own white slab behind**; content separates from its slab and the caption disappears | AC1 |
| **B6** | Dragging a frame **scrolls the board canvas the opposite way** | AC1, AC7 |

## 3. 🔴 Why six green ACs did not catch any of this — read before writing a single arm

AC1, AC3, AC4, AC5, AC6 and AC8 were **all green and driven** while the surface was unusable:

- **AC1's drive** asserted *three frames exist, none overlapping, the dragged one is where it was
  dropped, it survives a scope switch and a reopen*. **All still true under B3, B5 and B6.** It never
  asserted the canvas could be panned afterwards, that the slab travelled with its frame, or that
  the drag did not also scroll the stage.
- **AC3** asserted *every frame's box equals `bench.frame` or the 768 default*. **B2 is that
  criterion passing.** The default is the bug.
- **AC5** asserted *a drag writes nothing until mouse-up*, by `project.json` mtime. **B4 is a press**
  — no write — so the control is structurally silent about it.

This is [[correct-and-usable-were-never-the-same-criterion]] for the **fifth** time in this
codebase. The arms graded a count, a coordinate and a file mtime. **Not one graded what happens to
the person next.**

## 4. Scope

**In:** B1–B6, and arms written from the consequence.

**Out:** the board's concept, what may be added to it, `bench.board` storage, the picker's `Add all`
bound, selection through a frame (both still P93 `TVW-008 §9.6`, and neither blocks an AC).

## 5. Acceptance criteria

⚠️ Each closes a **P93** criterion; record it in both files.

1. **(B1)** With the board active, **no control in the preview chrome says `Workbench`** — trigger,
   menu rows and popup headings. A spec enumerates every label the chrome renders per mode.
   🔴 Derive from `PreviewScope.mode`; a hardcoded `'Board'` is a second copy of the mode.
2. **(B2)** A component with no saved size opens at a height a person can use, and there is a
   deliberate gesture to set and save one — the Workbench's, not a second mechanism.
   ⚠️ A drag still writes nothing (P93 AC5's control, re-run).
3. **(B3, the consequence arm)** After placing three components, frames have a visible gutter, and
   **the canvas can still be panned and zoomed** — asserted by performing a pan and reading the
   viewport, not by reading a coordinate.
4. **(B4)** A press that moves beyond the drag threshold **does not navigate**. A press that does
   not move **does**. Both arms, same run.
5. **(B5)** After a drop, the frame's stage, its content and its caption are **one unit** — the
   caption is on screen and within its frame's box, asserted on the rendered surface.
6. **(B6)** During a drag the stage's scroll offset is unchanged — read before, during and after.
7. **(P93 AC7)** Screenshots re-taken, both themes, on a board of at least three frames:
   Richard rules WORTHY. **This is the criterion that reopened; it closes in P93.**
8. `test:ci` at the floor.

## 6. Landmines

- 🔴 **Do not write an arm that reads a number the component computed.** That is what let all six
  through. Drive the gesture, then read the surface.
- 🔴 **`executeJavaScript` throws SYNCHRONOUSLY on an unattached `<webview>`** — this surface has
  already deleted its own preview once that way (`TVW-008 §10`). Same family as HLT-002.
- ⚠️ **B2's "fill the stage" is also the bench's behaviour.** Check whether the bench wants the same
  fix before changing shared code; if it does, that is a row, not a silent widening.
