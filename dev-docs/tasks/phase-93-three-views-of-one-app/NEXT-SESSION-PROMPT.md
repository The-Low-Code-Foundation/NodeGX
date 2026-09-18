# Phase 93 — next session

**Written 2026-09-18, end of session 17.** s1–5 drove TVW-003; s6–11 built and closed TVW-001;
s12–13 built and closed TVW-002; s14–16 built TVW-004 and the first slice of TVW-005. **s17 built
and drove the drop-target strip on the Layers tab header — the one row of TVW-005 §2 with no code
behind it — closed AC4 with a spy, took AC5's ten photographs, and measured that AC1's preview half
is blocked by something that is not this phase's.**

## The board, re-derived from the task files

| id | task | built | driven |
|---|---|---|---|
| TVW-001 | The panel tells the truth | ✅ | **CLOSED — all 8 ACs** |
| TVW-002 | The preview says what it is not showing | ✅ | **CLOSED — all 7 ACs** |
| TVW-003 | One selection, three surfaces | ✅ | **CLOSED — all 6 ACs** |
| TVW-004 | Layers | ✅ | AC1–5, AC7 green. **AC6 captured — Richard's verdict is all that is left** |
| TVW-005 | Layers can move things | **slice 1 + 2** | **25 arms held** (10/11 + 15/15). AC2/3/4 closed. AC6 ✅. **AC1's preview half RED (§9) · AC5 with Richard** |
| TVW-006 | The structure lane | — | — |
| TVW-007 | An instance says what it is (needs 003) | — | — |
| TVW-008 | The board (needs 002) | — | — |
| TVW-009 | The words (needs 001, 002, 004) | — | — |
| TVW-010 | The disorientation test (needs all) | — | — |

**ACs closed: 40** (39 at s16, + TVW-005 AC4; TVW-005 AC2 is now whole — its drive half landed).

## Start here

1. 🔴 **Two things are owed to Richard and neither can be done by anyone else.** They were sent
   together at the end of s17 — if he has answered, act on the answers first:
   - **TVW-004 AC6** — the twenty shots in `verdicts/TVW-004/2026-09-18`, questions in its
     `manifest.json` under `whatToLookAt` and in TVW-004 §9. It is the only thing between TVW-004
     and closed.
   - **TVW-005 AC5 + the §2 question** — the ten shots in `verdicts/TVW-005/2026-09-18` and the two
     questions in TVW-005 §10. ⚠️ The second one is a *design* question, not a verdict: §2 says the
     tab must not switch during the drag, which rules out the gesture AC1's third sentence
     describes. What got built is the other reading. His call decides whether AC1 is already met.
2. 🔴 **AC1's preview half is red and it is NOT this phase's to fix — do not inherit it by accident.**
   TVW-005 §9 has the three measurements. Short version: a reorder made straight against
   `NodeGraphModel.detachNode`/`attachNode` — *the calls `NodeOperations` makes for a canvas drag* —
   leaves the preview unchanged, while a spy on `ViewerConnection.send` shows the editor does send
   `nodeDetached` + `nodeAttached` with the right `childIndex`. The runtime has the whole chain for
   it (`editormodeleventshandler.ts:213` → `ComponentModel.setNodeParent` → `nodescope.ts:464` →
   `NodeScope.insertNodeInTree`). **Which link drops it is not measured** — that is the first thing
   to measure, and it wants its own row, in this phase or a runtime one. It is worth a row: it means
   **no programmatic move of a node is visible in the preview**, including the canvas's own drag.
3. Then **TVW-006** (the structure lane) or **TVW-007**, neither of which is blocked.

## What s17 found

🔴 **`stopPropagation` on the drop killed the cleanup everybody else's drag relies on.** The strip's
`onMouseUp` stopped propagation, for tidiness — nothing else wants that mouse-up. React dispatches
from the root container, so stopping there stops the **native** event before `body`, and `body` is
where `PopupLayer` ends its own drag and where the panel clears the state that draws the strip. One
drop left the strip **armed for the life of the panel**.

⚠️ **Two things about how it was caught, because both will recur:**
- It is **invisible inside a single run**. The drive's at-rest control is its first arm and had
  already passed on the run that created the state. It took a **second consecutive run**
  ([[a-post-drive-control-reads-the-state-the-drive-leaves]]).
- The fix then had to be proved on **two consecutive runs with no rebuild between them**. A green
  first arm after a reload proves the remount, not the fix
  ([[a-control-pair-proves-what-you-varied-only]]). The first "it's fixed" reading here was exactly
  that, and it was wrong — the renderer was still running the pre-edit bundle.

🔴 **webpack-dev-server's overlay is an `about:blank` iframe the size of the window at
z-index 2147483647.** While it is up, every row in the panel is drawn and none of them can be
pressed. Two arms went UNGRADED on it before the drive learned to wait it out. The reachability
guard is what caught it — it reported *drawn but not reachable*, which is what it is for.

⚠️ **A row's `textContent` is not its name.** It carries the usage meta too, so the drive compared
the product's correct sentence against `"GTM - Send Page Viewunplaced has no screen…"` and called a
green build red. The name comes off the `title` attribute now. First drives find instrument faults
([[a-new-instruments-first-drive-finds-instrument-faults]]) — this was the third of them.

## What the strip is, in one paragraph

The two tabs are exclusive: a component row and the rows it could be dropped between are **never on
screen together**, so without a target on the tab header there is no gesture at all. §2 rules out the
other way to build it in its own sentence — *"the tab does not switch during the drag"* — so the
strip is a **destination, not a spring-loaded doorway**. A drop places the component at the end of
the screen's root and opens Layers with the new row selected; moving it from there is ⌥↑/⌥↓ or a
second drag, both of which slice 1 already built. 🔴 The root it lands in is the first row the
**canvas's** component owns, which is rarely the top of the tree — the app shell is drawn above every
band, so "the top of Layers" is `/App`, on every page at once.

## Gates at s17

- `tests-unit/tvw-003` + `tvw-004` + `tvw-005` — **7 suites / 103 specs, green.** tvw-005 is 22 specs
  (15 + 7 new), and the seven were mutation-tested: **4 mutants, each caught**. ⚠️ One proposed
  mutant was *equivalent* (it moved a computation, not a decision) and had to be rewritten as the
  real ordering swap before it meant anything.
- `tsc -p packages/noodl-editor --noEmit` **0**.
- `tsc -p packages/noodl-editor/tsconfig.tests.json --noEmit` — **three errors, all a peer's**:
  `tests/ai/authoring-style.test.ts:116,117,119` read `variants` / `sizes` / `variantStyles` off
  `VocabElement`, which **P94 STY-002 removed** (the type's own comment at `StyleVocabulary.ts:95`
  says so). Both files were **uncommitted working-tree edits** at the time.
- ✅ **`test:ci` — 2985 specs, 8 failures, seed 19733, HEAD `1d342bc6`: THE FLOOR BY NAME**
  (2 NDA-017, 3 SUB-006, 3 SUB-011), readout mtime checked against the clock, **none of them mine**.
  TVW-005 AC6 is closed.
- 🔴 **The first attempt exited 1 without running a single spec**, for the reason above: the editor's
  `test:ci` webpack **typechecks `tests/ai/**`**, so it compiles a sibling's in-flight edit
  ([[the-editor-test-ci-webpack-typechecks-a-sibling-packages-tests]]). Reported to `opennoodl-ec`
  with file:line; fixed by them within the hour and re-measured here.
- ⚠️ **The harness reported the `test:ci` run as exit 0 while the log ended `TESTCI_EXIT=1`.** The
  `echo "TESTCI_EXIT=$?" | tee -a` is what caught it. Gate on the number in the log, never on the
  run list ([[a-run-list-is-not-a-log]]).

## The drives

| script | what it is for |
|---|---|
| `drive-tvw005-drag.js` | slice 1's gesture + AC1's preview half. **10/11**; the red is §9's runtime defect |
| `drive-tvw005-strip.js` | the tab-header strip. **15/15, twice back to back** |
| `shots-tvw005-indicators.js` | AC5's ten photographs, both themes, page proved byte-identical after |

All three take `--dir`; the fixture is a **copy**, `NodeGX test projects/TVW-005 s17 Strip`
(s16's `TVW-004 s15 Drive`, copied). ⚠️ One probe left a stray `Divider` in it during s17 and it was
removed from `project.json` by hand — if a run ever starts from four children, that is what happened.

## The box

s17 launched the editor, announced it to `opennoodl-ec` and `opennoodl-62`, and **left it down**.
62 is on P96/FED-002 (backend + runtime) and is **holding `test:main` until pinged**. ec is on
P94/STY-002-004 and wants the box for an STY-003 drive. Announce before launching `dev`, and tell
both when you are done.

## Committing

🔴 The working tree carries **three** other sessions' work — P78's TPL-009, P94's STY-002/004 (which
includes `StyleVocabulary.ts` and `tests/ai/authoring-style.test.ts`) and P96's FED-002. Commit by
explicit pathspec, `git add` untracked files first, and put `-F <file>` **before** the `--`.
⚠️ `scripts/devtools/` holds a peer's untracked census script — never `git add` that directory.
s17's commit is `1d342bc67`.

🔴 **Verdict PNGs are gitignored** (`.gitignore:265`). The tracked artefact is `manifest.json`, and
the shots have to be **sent** to Richard, not linked.
