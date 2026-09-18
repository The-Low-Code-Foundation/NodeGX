# Phase 93 — next session

**Written 2026-09-18, end of session 12.** s1–5 built and drove TVW-003; s6–s11 built TVW-001 and
closed it. **Session 12 built TVW-002 and drove it.** The strip is on screen, all four shapes, both
themes, and the drive found one defect that no measurement could have. TVW-002 is **not closed**:
three ACs remain and two of them need Richard, not code.

## The board, re-derived from the task files

| id | task | built | driven |
|---|---|---|---|
| TVW-001 | The panel tells the truth | ✅ six rows + AC7's three fixes | **CLOSED — all 8 ACs** |
| TVW-002 | The preview says what it is not showing | ✅ 4 modules + the row | **AC3 ✅ AC4 ✅ AC7 ✅; AC1 partial, AC2 ✅, AC5 ✗, AC6 owes Richard** |
| TVW-003 | One selection, three surfaces | ✅ slices 1–6 | **CLOSED** |
| TVW-004 | Layers (**unblocked**) | — | — |
| TVW-005 | Layers can move things (needs 004) | — | — |
| TVW-006 | The structure lane | — | — |
| TVW-007 | An instance says what it is (needs 003) | — | — |
| TVW-008 | The board (needs 002) | — | — |
| TVW-009 | The words (needs 001, 002, 004) | — | — |
| TVW-010 | The disorientation test (needs all) | — | — |

**ACs closed: 18** (TVW-003 six, TVW-001 eight, TVW-002 four). Two and a half of ten tasks.

## Start here — TVW-002's remaining three, in order

1. 🔴 **AC6 needs Richard, and the questions are already written** — TVW-002 §"For Richard, when it
   is driven". Show him `verdicts/TVW-002/2026-09-18/` with `open -a Preview <paths>` (markdown
   links open nothing in his VS Code). Three things: the rewritten wording of all three shapes; the
   **popup** question (231 corpus components live only inside a popup — is such a thing "on" the
   page that opens it? saying yes gives it a `Go to` door that will not show it); and whether the
   **detached** preview carries the doors or the sentence only.
2. **AC1's outline-when-agreeing is NOT BUILT** — when the two surfaces agree, the first instance
   should be outlined and labelled in the preview. §2 puts it on the **design-mode channel** to the
   app client; §5 warns it must not go on `modelUpdate`, which is broadcast. Everything else in AC1
   is driven and passing.
3. 🔴 **AC5 is a BUILD, not a drive.** §3's citation is wrong — see TVW-002 §"AC5's premise is
   wrong". The shape of the fix is DES-001's toast; the doors are the part that is not free.

Then TVW-004 (Layers) is unblocked and should **import `pageReach.ts`**, not write a second walk.

## What s12 settled

**Four modules; three of them pure and graded.**

| module | what it is |
|---|---|
| `pageReach.ts` | the walk: `renders` (what you can see) vs `mounts` (what runs), one pass |
| `previewStripWords.ts` | the three shapes and every word in them |
| `screenRoute.ts` | the preview's route → the page component it is showing |
| `usePreviewStrip.ts` | subscriptions, the project walk, the one navigation |

🔴 **Three measurements changed the design before a line of UI existed**, all by running the pure
modules **offline over the 130 projects on disk**. Do this again — it is cheap, it needs no stack,
and it caught three wrong sentences before a user could read them:

1. **`componentinstance.render()` returns `roots[0].render()` and nothing else.** "In the graph" is
   not "on screen": 592 of 1504 corpus placements sit outside the page's `Page` root, **71 of them
   components that draw**.
2. **A screen is not one component.** Walk from the ROOT with the Router resolved, or an app shell's
   nav bar gets a strip saying it is elsewhere while the person looks straight at it.
3. **Shape 2's specced sentence was false for 1094 components.** *"Nothing in the app places it"*
   over components that are placed, inside something no page reaches.

✅ **The drive printed all five sentences verbatim against a prediction written before launch.**

## The defect the drive found, and the one the drive nearly missed

🔴 **A translucency defect has no width.** The strip's amber is `rgba(…, 0.12)` and the row sits
inside `.Background`, whose backdrop is the preview **checkerboard** — the checker squares showed
straight through, in both themes. Every geometry reading was clean (28px, 653/653, 789/789, no
truncation). Fixed with an opaque `--theme-color-bg-2` base under the wash. **Read the shot.**

🔴 **AC3 first reported HELD ×5 with its known-firing control absent** — the run looked for the
`Go to` door after the loop had ended on an `agree` component. Five negative readings with nothing
to tell them from a drive that cannot move the preview at all. The script now re-establishes the
door's precondition and exits non-zero if the control did not fire.

## Gates at s12

- `npm run test:ci`: **2985 specs, 8 failures, seed 41423, HEAD 12dfbb78d, 66s** — the floor, the
  same eight **by name** (3 SUB-011, 2 NDA-017, 3 SUB-006), a **fifth** agreeing seed.
  🔴 Exit is **1** at the floor. Delete `tests/test-results.json` first and gate on the names; the
  file's shape is `{overallStatus, totalCount, failedCount, failures[], seed, gitHead}`.
- `npx jest tests-unit/tvw-002`: **3 suites / 40**. `tsc -p packages/noodl-editor --noEmit` EXIT=0.
- **8 mutants**, each `cmp`-proven to have applied, each red with a real count. 🔴 `Tests: 0 total`
  is a suite that failed to COMPILE, not a pass.

## Driving TVW-002 again (reuse)

Fixture picked by measurement: **`Prefab marketplace`** — of 57 candidate projects it is the only
one producing all four shapes. Drive a **copy**; opening a project writes into it.

```bash
NOODLPORT=8680 NOODL_REMOTE_DEBUG_PORT=9444 NOODL_USER_DATA_DIR=<scratch>/profile \
  npm run dev:debug -- --quiet        # backgrounded as the call's own command; gate on the CDP port
node scripts/devtools/drive-tvw002-strip.js --components "…" --shots <dir> --json <file>
```

- Warm launch ≈ **60s**. The launcher opens first: click the project card (`LauncherCard-module__Title`).
- 🔴 The scope picker's way back to app mode is the **"App preview"** row.
  `preview-scope-target-/App` is a COMPONENT named `/App`, and the first match is the **measuring
  ghost at y=3508** — filter to the copy inside the viewport and confirm with `elementFromPoint`.
- 🔴 **Write drive probes to a FILE, never `node -e`.** A `\s` inside a template literal in a
  shell-quoted argument collapses to `s`: a probe read the strip as `_DSI Atom  i n't on Home`.
- Theme: `ThemeManager.setMode('light'|'dark')` via `__wreq`, read in a **separate** eval.

## The box

One dev stack per checkout. `node scripts/devtools/stop-dev.js --list`, `lsof -nP -iTCP:8080
-sTCP:LISTEN`, and **ask the peer** — s12 did, twice, and got the box both times within minutes.
Announce the teardown to everyone you announced the launch to.

## Committing

🔴 The working tree carries other sessions' work. Commit by **explicit pathspec**; add untracked
files first; put `-F <file>` **before** the `--`.
