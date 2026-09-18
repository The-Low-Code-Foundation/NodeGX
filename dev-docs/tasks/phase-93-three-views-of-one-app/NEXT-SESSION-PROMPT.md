# Phase 93 — next session

**Written 2026-09-18, end of session 16.** s1–5 drove TVW-003; s6–11 built and closed TVW-001;
s12–13 built and closed TVW-002; s14–15 built and drove TVW-004. **s16 closed TVW-004 AC5 (10/10
arms, no product code changed) and built and drove the first slice of TVW-005 — a drag in Layers
now reorders the page, and the drive found the defect that stopped it starting at all.**

## The board, re-derived from the task files

| id | task | built | driven |
|---|---|---|---|
| TVW-001 | The panel tells the truth | ✅ | **CLOSED — all 8 ACs** |
| TVW-002 | The preview says what it is not showing | ✅ | **CLOSED — all 7 ACs** |
| TVW-003 | One selection, three surfaces | ✅ | **CLOSED — all 6 ACs** |
| TVW-004 | Layers | ✅ | **AC1–5 and AC7 green. AC6 captured — Richard's verdict is the only thing left** |
| TVW-005 | Layers can move things | **slice 1** | **9/9 arms.** AC1 needs the tab-header drop strip; AC5's shots and AC6's `test:ci` not yet taken as the task's own |
| TVW-006 | The structure lane | — | — |
| TVW-007 | An instance says what it is (needs 003) | — | — |
| TVW-008 | The board (needs 002) | — | — |
| TVW-009 | The words (needs 001, 002, 004) | — | — |
| TVW-010 | The disorientation test (needs all) | — | — |

**ACs closed: 39** (33 + TVW-004 AC5, + TVW-005's AC2 decision half and AC3, driven).

## Start here

1. 🔴 **AC6 is still owed to Richard, and it is the only thing between TVW-004 and closed.** Seven
   of the twenty shots were sent to him in s16 (the five states in dark at 298px, plus
   `3-selected--light--238px` and `2-editing--light--238px`, which carry the two questions). The
   PNGs are gitignored, so they have to be *sent*, not linked. The questions are in
   `verdicts/TVW-004/2026-09-18/manifest.json` under `whatToLookAt` and in TVW-004 §9.
2. **Finish TVW-005.** In dependency order:
   - the **drop-target strip on the Layers tab header** (§2 row 4, §6) — the one §2 row with no code
     behind it, and what AC1's third sentence drives;
   - the **preview half of AC1** — the reorder is read in the model today, not in the viewer's DOM.
     `drive-tvw004-ac2.js` already walks the viewer's tree through `noodlNode`; reuse it rather than
     writing a third walk;
   - **AC4** — assert the placement goes through `NodeOperations.createNewNode` by spying it, not by
     comparing results. The `placement` parameter is already on that door.
   - **AC5's shots** of the three indicators, both themes, for Richard.
3. Then **TVW-006** (the structure lane) or **TVW-007**, neither of which is blocked.

## What s16 found

**AC5 did not need what §8.2 said it needed.** Not a fresh renderer per component kind — a
**launcher round trip**: `route({to:'projects'})` and back remounts `EditorPage`, so `chosenTab` is
`null` again. ~20s, no webpack race, and it is a door a person has. Two things the first pass would
have got away with, both now in the drive:

- **The canvas comes back where it was left**, so three of the four readings began on the tab they
  expected. Each subject is **primed** on a component whose default is the other tab, so the arm
  watches the tab *arrive*.
- The four subjects are classified off **`project.json`**, not off `buildKindIndex` — which is the
  pipeline the tab decision itself reads. The runtime's kind is a **precondition**: the
  unplaced-visual arm goes UNGRADED if the runtime calls it a logic component, because then
  `Components` would be the right answer for the wrong reason.

**🔴 TVW-005's drag would not start if you moved down.** The 5px threshold was measured inside the
pressed row's own `onMouseMove` — the Components tab's own pattern, so it looked like the house
style. A Layers row is 26px: press in the middle, move 13px *down*, and the next mouse event belongs
to the row below, which has no press to compare against. Measured, not reasoned: `(x+10, y+10)` left
`PopupLayer.isDragging()` **false** with all three handlers bound. It is watched on the **window**
now. ⚠️ `ComponentItem.tsx` still has the row-local version.

**The instrument was wrong twice before it measured anything.**
- A row scrolled out of the panel answers `getBoundingClientRect()` with plausible coordinates and a
  press there lands on `<html>`. Two runs read as *the drag will not start*. The drive collapses the
  siblings, scrolls into view, and refuses unless `elementFromPoint` lands inside the row.
- The refusal arm's first version guessed the drag-message selector, found nothing, and could not
  tell a silent build from its own bad selector. It reads `.popup-layer-drag-message` now, and the
  **legal drag that shows no message** is the first row of the table so the absence has a
  known-firing signal beside it.

**Filed, not fixed:** §2 of TVW-004 says the tab is *"remembered per session, not per project"*. It
is remembered per project **visit** — `chosenTab` is `useState` and `EditorPage` unmounts on the way
to the launcher. It does not block AC5, whose sentence is the default and the flip. TVW-004 §9.4 has
the fix and the warning that doing it breaks the drive's own cold start.

## The model traps TVW-005 is built around

Read §6.1 of the task before touching the applier. In short: `attachNode` **silently no-ops** unless
the child is a root (detach first, resolve the index after); `NodeOperations.attachNode/detachNode`
**record no undo at all** outside a canvas drag; an `UndoActionGroup` *constructed* with `do`/`undo`
cannot be undone; and a plan must name an **anchor**, never an index, because the tree draws visual
nodes only.

## Gates at s16

`test:ci` **2985 specs, 8 failures, seed 99341, HEAD `061d03f4` = the floor BY NAME** (3 SUB-006,
3 SUB-011, 2 NDA-017), none mine — a **tenth** agreeing seed, from a readout whose mtime was checked
(14 seconds old). ⚠️ The log ends `lerna ERR! exited 1` while the harness reported 0, again: **read
the log and the JSON, never the status.** `tsc --noEmit` **0**. `tests-unit/tvw-004` + `tvw-005`
**3 suites / 56 specs**; tvw-005 is 15 specs with **8 mutants, each caught**.

🔴 **`test:main` is 496/498 and the two reds are NOT this phase's** — and they are worth knowing
about, because they are the shape the harness memory warns of: a peer's additive runtime change
(P96's `net.noodl.ParseFeed` / `net.noodl.ParseXML`, commit `c3754c6e1`) passed its own package's
suite and reds two **editor** gates that only a whole-repo run reaches —
`tests-unit/alpha-006/nodeDocs.test.ts:139` (every catalog node owes a docs page) and
`tests-unit/chr-007/widgetDispatch.test.ts:301` (the dispatch map must cover the catalog). Reported
to `opennoodl-62` with the file:line, **fixed by them in `09b286e69`, and re-measured here after
their commit: both suites 28/28 green.** Neither was a defect in the nodes — both were
regenerations that a per-package run gives no reason to do (`docs:nodes` for the pages,
`CHR007_WRITE_SNAPSHOT=1` for the port-class map).

⚠️ **The lesson is the one to keep, because it will recur:** a new node type owes two *editor*
artefacts, and the package suite that proves the node works cannot see either. ⚠️ Their regeneration
also swept up a `keepsFocus` row on the button docs page that **GAM-027 (`238c455e9`) should have
written and did not** — it updated `node-catalog.json` and the widget snapshot but neither the
enriched catalog nor the docs pages. Nothing of this phase's is involved in either.

## The box

s16 left it **free** and said so to `opennoodl-ec` and `opennoodl-62`. 62 is on P96 (backend feeds)
and added two suites — `noodl-runtime/test/fed-001-feed.test.ts` and
`nodegx-backend/tests/cloud-feed-nodes.test.ts` — which a `test:main` run now picks up. ec is on
P94/STY-004 (nodegx-export unit tests). Announce before launching `dev`.

## Committing

🔴 The working tree carries **three** other sessions' work — P78's TPL-009, P94's STY-001/STY-004
and P96's directory. Commit by explicit pathspec, `git add` untracked files first, and put
`-F <file>` **before** the `--`. s16's commits are `31d89a153`, `ea3ee7a5d`, `061d03f48`.

🔴 **Verdict PNGs are gitignored** (`.gitignore:265`). The tracked artefact is `manifest.json`.
