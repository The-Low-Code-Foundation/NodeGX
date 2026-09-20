# Phase 94 — 🟢 CLOSED

**Written at the end of s10, 2026-09-19/20.** There is no next session for this phase.

---

## 1. What closed, and on whose word

🔴 **Nothing in this phase closed on a passing test. All seven tasks are closed on Richard's look.**

| task | state |
|---|---|
| STY-001 study + verdict | 🟢 ruled 2026-09-18 |
| STY-002 the Look model | 🟢 AC2–AC7 + AC1's mechanism. **AC1's NAME ruled at s10: it stays a LOOK** |
| STY-003 the property panel | 🟢 **AC8 RULED WORTHY s10** — `shots/sty003-gutter-{dark,light}.png` |
| STY-004 export carries Looks | 🟢 Part A. ⬜ **Part B (one shared class per Look) is 1 session and was never blocking** |
| STY-005 the Styles panel | 🟢 **AC8 RULED WORTHY s10** — `shots/sty005-panel-{dark,light}.png` |
| STY-006 where it's used | 🟢 **AC8 RULED WORTHY s10** — `shots/sty006-used-by-{dark,light}.png` |
| STY-007 the after picture | 🟢 **AC5 RULED WORTHY s10 — and that closes the phase** |

**STY-002 AC1, ruled:** the concept stays called a **Look**. The rename cost was measured before
asking (~107 source files, 83 markdown docs) and he chose to keep it. **Do not re-open this.**

---

## 2. Gate readings — s10, 2026-09-19/20

| gate | reading |
|---|---|
| `npm run test:ci` | **3012 specs, 8 failures, seed 00079, HEAD `3c4cedd34`** — the floor **by name** (3× SUB-006, 3× SUB-011, 2× NDA-017). Fresh readout, elapsed 71s. ⚠️ Taken *before* this session's two fixes; `test:main` and `tsc` were taken after |
| `tsc -p tsconfig.json --noEmit` (noodl-editor) | **exit 0, zero output** — taken with a redirect, not a pipe ([[a-pipe-eats-the-exit-code-you-are-gating-on]]) |
| `npm run test:main` | **519 of 520 suites, 8290 of 8291 tests.** ⚠️ The single failure is **`tests-unit/tvw-007/instanceHoverCard.test.tsx`** — a **peer's untracked P93 work, written 22:49–23:15 while the run was in flight**. Not this session's, not on the committed tree |
| `tests-unit/sty-007` (new) | **6/6**, and **armed**: restoring the pre-fix behaviour turns **3 red by name** |
| `tests-unit/sty-003` | **30/30**, unchanged by the `fieldState` addition |
| `drive-sty007-after-picture.js` (new) | **23/23 graded arms, exit 0**, both themes, 1 ungraded and named |

---

## 3. What s10 settled — and the two defects it found

### 🔴 Both were inside the phase's own promise, and neither was farmed

1. **The Look menu never opened on a list.** On any project with no Look of its own — which is
   *every* project until someone makes one — the menu jumped straight to "name your new Look" and
   the **twelve shipped Looks were unreachable from the property panel**. A pre-library condition
   that nobody revisited when STY-003 added the library.
   **Fixed** (`shouldOpenInCreateMode` in `models/Looks/fieldState.ts`, called from
   `PickVariantPopup`'s constructor) **because it blocked STY-007's own AC1** — the "old variants
   list → new Look menu" pair could not be photographed, because the menu never appeared.
   [[a-shortcut-that-skips-an-empty-list-outlives-the-list-filling-up]]

2. 🔴 **Every `var(--…)` swatch in the colour picker painted NOTHING — and RICHARD found it**, in
   the after-picture, in seconds: *"Why do all the colour squares next to the list of 'Colors in
   project' look transparent??"* They were: **17 of 20 rows** computed `rgba(0,0,0,0)`, because the
   swatch was handed the raw token and **the editor's chrome never declares a project's design
   tokens**. Three drives, three ruled screenshots and two sessions reading that exact surface had
   all missed it. [[an-editor-surface-cannot-paint-a-projects-design-token]]

### 🔴 Two things a next session should carry out of here

1. **The close condition earns its keep.** Defect 2 is invisible to every static and unit gate: the
   markup is right, the value is right, the component renders. Only `getComputedStyle` on the real
   element — or a person looking at a picture — can see it.
2. **A new instrument's first run finds instrument faults, not product faults.** STY-007's first
   drive produced four "defects" that were all mine: a row at y=−872, a zero-area heading (the
   Styles panel had replaced Properties **in the same slot**), five popouts alive because
   `document.body.click()` does not close one, and `button[class*="Value"]` matching nothing.
   **Hit-test before every shot.**

---

## 4. What is left in this phase — nothing blocking

Not one of these is a reason to open a P94 session. They are listed so they are not rediscovered at
full price ([[an-unowned-row-gets-rediscovered-at-full-price]]).

1. **STY-004 Part B** — one shared class per Look in the export, rather than per-node. One session,
   never blocking, and now the only unbuilt piece of scope in the phase.
2. **The two s7 defects, still filed-not-fixed** (STY-003 §2f): (a) a node can hold a `VariantModel`
   that is **not the project's**; (b) `nodegx.styles.json` stopped being written for a session.
   Neither blocks anything ruled.
3. **States** (hover / pressed / disabled) — `STY-DESIGN` §9 calls this *"the obvious next thing
   after this lands"*, and it is where the win is for the tutorial-video plan. **It is its own
   phase**, and it was deliberately kept out of this one. `VariantModel` already has
   `stateParameters` / `stateTransitions` and nothing uses them; 6 of 7 templates hand-write those
   states as CSS text.
4. **MCP Look authoring** — its own phase, README §4.1.

---

## 5. Owed to other phases

- **P93 (TVW-004):** `keepSidePanel` now holds on the **cross-component** path, which their drive
  never exercised — their fix guarded one of three `clearSelection` sites. **Still owed, not sent.**
- **P93 (TVW-001):** `ComponentsPanelNew/showUsedInPopover.ts` → `navigateToInstance` uses the same
  door **unguarded**. Its symptom is invisible because `hidePanels()` falls back to `components`.
  **Filed, not fixed.**
- **P93 s23 was told** (s10, by peer message) that the editor was torn down, plus the two drive
  traps above.
