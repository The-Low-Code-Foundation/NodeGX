# Phase 93 — next session

**Written 2026-09-20, end of session 23.** s1–5 drove TVW-003; s6–11 closed TVW-001; s12–13 closed
TVW-002; s14–17 built and closed TVW-004 (bar Richard's AC6 look) and TVW-005; s18 built and drove
TVW-006 and censused TVW-007; s19 got two rulings and reshaped TVW-008; s20 photographed four
eyebrow placements; s21 built TVW-007's trail and closed AC3 and AC4; s22 built TVW-007's hover and
its `Edit ›` door. **s23 built the whole of TVW-008 slice 2 — the board's surface — and closed no
AC, because every one of its criteria is a drive and the box was a peer's all session.**

## The board, re-derived from the task files

| id | task | built | driven |
|---|---|---|---|
| TVW-001 | The panel tells the truth | ✅ | **CLOSED — all 8 ACs** |
| TVW-002 | The preview says what it is not showing | ✅ | **CLOSED — all 7 ACs** |
| TVW-003 | One selection, three surfaces | ✅ | **CLOSED — all 6 ACs** |
| TVW-004 | Layers | ✅ | AC1–5, AC7 green. **AC6's 20 shots SENT s18 — Richard's verdict is all that is left** |
| TVW-005 | Layers can move things | ✅ | **CLOSED — all 6 ACs** |
| TVW-006 | The structure lane | ✅ | AC1–4, AC6 green. **AC5's 18 shots SENT s18 — Richard's verdict is all that is left** |
| TVW-007 | An instance says what it is | ✅ slices 1–3 | **AC2 ✅ AC3 ✅ AC4 ✅.** AC1, AC2b and AC5 need **one drive** — `drive-tvw007-hover.js` exists and is still UNRUN. The 4 placement shots are WITH RICHARD |
| TVW-008 | The board | ✅ slices 1–2 | **Nothing driven.** AC1, AC3–AC7 need the box; AC8 needs `test:ci` |
| TVW-009 | The words (needs 001, 002, 004) | — | — |
| TVW-010 | The disorientation test (needs all) | — | — |

**ACs closed: 52** (unchanged at s22 and s23).

## 🔴 Start here

1. **THREE verdicts are with Richard and nobody else can do any of them**: TVW-004 AC6 (20 shots,
   s18), TVW-006 AC5 (18 shots, s18), TVW-007's four placement shots (s20). The first two close
   their tasks on the spot. **Do not re-send any of them.** No ruling file had landed at s23
   (checked: nothing matching `*RULING*` under `dev-docs/` newer than 2026-09-17, and no commit
   since `b5e4e3714` touched one).
2. **🔴 IF YOU CAN GET 9222, DRIVE — and drive TVW-007 FIRST.** It is one drive from **three** ACs
   and its script is written; TVW-008 is one drive from **six**, but its script does not exist yet.
   Order by what is ready, not by what is bigger.
   `node scripts/devtools/drive-tvw007-hover.js` has **never run** — budget for instrument faults
   before product faults ([[a-new-instruments-first-drive-finds-instrument-faults]]).
3. **Then `test:ci`.** It closes TVW-007 AC6 and half of TVW-008 AC8, and it has been owed since
   s21. It cannot be run beside a peer's dev stack — that is the webpack contamination window, not
   superstition ([[the-test-ci-contamination-window-is-the-webpack]]) — so it goes in the same
   window as the drive, after it.
4. **🔴 The first thing `test:ci` grades that nothing else has**: `tests/canvas/board-export.test.ts`
   against s23's `boardFrameMounts` extraction. The loop moved verbatim and both typechecks are
   green, but that suite has not run since the refactor. If anything of s23's is broken, it is most
   likely there.
5. **If Richard has ruled on the placement**: the winner becomes a constant, `eyebrowPlacement.ts`
   is **deleted** along with the three losing branches in `instanceEyebrow.ts`. 🔴 Do not leave the
   switch standing — a switch that outlives its verdict is a second copy of a decision.
6. **If you cannot drive**, the honest build is **TVW-008 §9.6** — the authored fixture AC4 needs
   (0 of 5,922 components have a scenario, so that arm has never been drawn), or the selection
   wiring through a frame, or `in 3 places ▾` on TVW-007's hover card (§6 measured **44%** of placed
   components with two or more parents, so multi-parent is the ordinary case).
7. 🔴 **Check whose editor is on 9222 before anything.** See below.

## 🔴 What s23 built, and the two things in it that are argued rather than measured

TVW-008 slice 2 — the board's whole surface. `boardSurface.ts` (pure: captions, picker rows,
viewport, the rebuild rule), `useBenchBoard.ts` (`bench.board` through `ProjectModel.setMetaData`),
`ComponentBoard.tsx` + `.module.scss`, the chooser's third row in `PreviewChrome.tsx`, the strip
caption and mount in `VisualCanvas.tsx`, `boardFrameMounts` extracted in `componentBench.ts` so the
editor's chrome and the export's harness cannot disagree about where a frame is, and
`boardFrameMoveContents` in `benchInputs.ts`. Full record in **TVW-008 §9**.

🔴 **Two mechanisms the first drive has to confirm, and both fail quietly rather than loudly:**

1. **That a `parameterChanged` on a frame Group's `marginLeft` moves a rendered frame.** The payload
   reaches the same `nodeModel.setParameter` the graph import does, and it sends
   `{ value, unit: 'px' }` because a bare number is *percent*. But no spec can reach a running
   client. If this does not work, a drag moves the caption and leaves the content behind.
2. **That `react-rnd` drags at the right rate inside the zoomed document.** Wrong `scale` does not
   throw — the frame simply travels faster or slower than the cursor.

⚠️ **AC5 is the one that can regress silently** and its control is written but unrun: a drag of 200
intermediate moves must leave `project.json`'s mtime **unchanged**, and change it exactly once on
release. s23's design is built for it (positions travel as live updates; only mouse-up writes), so
the control is now a real test of a real claim rather than a formality.

## 🔴 The drive hazard, unchanged from s20, s21 and s22

`npm run dev:debug` exiting **144** is the **single-instance lock**, not a launch failure — an
Electron is already on 9222 and it may be a **peer's**. `cdp.js` attaches to whoever holds the port
and never asks whose it is. **Two dev stacks cannot coexist on this checkout**: s23 re-derived this
rather than inheriting it — `packages/noodl-editor/webpackconfigs/webpack.renderer.dev.js:24,38`
hardcode `port: 8080` and `publicPath: http://localhost:8080/` with no env override, so "start my
own on another port" is not available and `NOODLPORT` does not move webpack.

At s23 the editor on 9222 (pid 54829, launched 22:38) walked 12 PPID hops to CLI `21296`, a peer's,
which also held `:8080`. That peer was asked once, politely, to say when it tears down, and was not
asked to stop. ⚠️ **Never `dev:stop` a stack you have not attributed** — and the guard fails CLOSED:
an owner you cannot name is not an absent one.

## Gates as of s23

- `tests-unit/tvw-008` **102 specs / 3 suites, exit 0**; `tests-unit/tvw-007` unchanged at 80/6.
- **12 mutants on `boardSurface.ts`, 12 killed.**
- `typecheck:editor` **0**; `typecheck:editor-tests` **0** — the second one caught a real break
  (`BoardFrameMount`'s new required field) that the first could not see, because `tests/` is not in
  its program.
- `test:main` **521 suites / 8,336 specs, exit 0** (was 520 / 8,292 at s22 — the delta is exactly
  this commit's one new suite and its 44 specs).
- 🔴 `test:ci` **NOT run** — owed since s21, and now owed a second thing (see *Start here* 4).

## Committing

🔴 The working tree carries other sessions' work (P78 TPL-009, P94's Styles panel, P96, P97, P98,
docs). **Commit through a temporary index with a compare-and-swap** — `BASE=$(git rev-parse HEAD)`,
`GIT_INDEX_FILE`, `read-tree $BASE`, stage only your paths (untracked first: a pathspec commit skips
them), `write-tree`, `commit-tree -p $BASE`, `update-ref HEAD $NEW $BASE`. Then refresh the real
index immediately (`git show --name-only --format="" -z HEAD | xargs -0 git reset -q --`) and
confirm `git diff --cached --stat` is empty. This worked cleanly at s21, s22 and s23.

⚠️ `scripts/devtools/` holds peers' untracked drive scripts. Never `git add` that directory; name
your file.
