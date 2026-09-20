# Phase 93 — next session

**Written 2026-09-20, end of session 24.** s1–5 drove TVW-003; s6–11 closed TVW-001; s12–13 closed
TVW-002; s14–17 built and closed TVW-004 (bar Richard's AC6 look) and TVW-005; s18 built and drove
TVW-006 and censused TVW-007; s19 got two rulings and reshaped TVW-008; s20 photographed four
eyebrow placements; s21 built TVW-007's trail; s22 built its hover and `Edit ›` door.
**s23 built all of TVW-008 slice 2 and closed no AC. s24 ran the TVW-007 drive for the first time —
22/22 — and closed AC2b and AC2, after fixing four instrument faults and one real product defect
that only the screenshot could see.**

## The board, re-derived from the task files

| id | task | built | driven |
|---|---|---|---|
| TVW-001 | The panel tells the truth | ✅ | **CLOSED — all 8 ACs** |
| TVW-002 | The preview says what it is not showing | ✅ | **CLOSED — all 7 ACs** |
| TVW-003 | One selection, three surfaces | ✅ | **CLOSED — all 6 ACs** |
| TVW-004 | Layers | ✅ | AC1–5, AC7 green. **AC6's 20 shots SENT s18 — Richard's verdict is all that is left** |
| TVW-005 | Layers can move things | ✅ | **CLOSED — all 6 ACs** |
| TVW-006 | The structure lane | ✅ | AC1–4, AC6 green. **AC5's 18 shots SENT s18 — Richard's verdict is all that is left** |
| TVW-007 | An instance says what it is | ✅ slices 1–3 | **AC2 ✅ AC2b ✅ AC3 ✅ AC4 ✅.** AC1 needs **3 more arms** (below); AC5's shots are taken and await Richard; AC6 needs `test:ci` |
| TVW-008 | The board | ✅ slices 1–2 | **Nothing driven.** AC1, AC3–AC7 need the box; AC8 needs `test:ci` |
| TVW-009 | The words (needs 001, 002, 004) | — | — |
| TVW-010 | The disorientation test (needs all) | — | — |

**ACs closed: 54** (52 at s23; s24 added TVW-007 AC2 and AC2b).

## 🔴 Start here

1. **🔴 MEASURE THE MACHINE BEFORE ANYTHING LONG.** s24 ended with the box thrashing: **1,391
   pageouts in 184s (~453/min**, against ~119/min on the healthy reference run), swap free falling
   **1560M → 408M in three minutes**, ~15MB pages free, load 11.8, four peers busy. `test:ci` was
   **NOT RUN** for that reason and is now owed since s21. Take **two pageout readings a few minutes
   apart** and judge the *rate*, never `vm.swapusage`'s total, which is trailing and will make you
   wait for nothing ([[the-test-ci-contamination-window-is-the-webpack]]).
2. **`test:ci` is the biggest single win and it is cheap once the machine is quiet.** It closes
   TVW-007 **AC6** and half of TVW-008 **AC8**, and it now grades three things nothing else has:
   s23's `boardFrameMounts` extraction via `tests/canvas/board-export.test.ts` (**still never run
   since that refactor** — if anything of s23's is broken it is most likely there), s24's
   `InstanceHoverCard` split, and the `leg-005`/LGC-008 trail-visibility pins AC6 names.
3. **THREE verdicts are with Richard and nobody else can do any of them**: TVW-004 AC6 (20 shots,
   s18), TVW-006 AC5 (18 shots, s18), TVW-007's four placement shots (s20). The first two close
   their tasks on the spot. **Do not re-send any of them.** No ruling file had landed at s24.
4. **TVW-007 AC1 is three arms from closed, and the s23 handoff was wrong to call it "one drive".**
   The drive covers the hover, the `Edit ›` press and the diamond crumb. Its sentence *also* asks
   for: pressing **`Home` in the trail** (back, with the Hero node selected); opening the component
   **from the Components panel** (the trail must then read the containment form, `Sections › Hero`);
   and **⌘[ twice, ⌘] twice**, each step showing the trail that was shown at that step. No arm
   exists for any of the three. `drive-tvw007-hover.js` is now a **known-good, 20-second
   instrument** with `remeasure()`, `insideCanvas` and `FOCUS_ON` helpers to build them on.
5. **TVW-008 is one drive from six ACs but its script does not exist.** Order by what is ready.
6. **If Richard has ruled on the placement**: the winner becomes a constant, `eyebrowPlacement.ts`
   is **deleted** along with the three losing branches in `instanceEyebrow.ts`. 🔴 Do not leave the
   switch standing — a switch that outlives its verdict is a second copy of a decision.
7. **If you cannot drive**, the honest build is **TVW-008 §9.6** — see §"the fallback" below, which
   s24 scoped before the box came free and which changed one of its four items.

## 🔴 What s24 learned that will save the next drive an hour

Full record in **TVW-007 §11**. The short form, because all five are reusable:

1. **A coordinate is not a surface.** The drive picked subjects with `top > 60 && left > 40` — a
   guard against the *window*, written when the node graph filled it. The three-views canvas starts
   ~425px down, so off-canvas nodes passed and their centres landed **in the preview webview**.
   Only **12 of 55** nodes were on the canvas at the opening pan. Every card arm read
   `present:false` and looked exactly like a dead feature.
2. **Coordinates do not survive a navigation or a zoom.** Switching back to a component does **not**
   restore its pan.
3. **A negative arm must start from nothing.** "A plain node gets no card" read `present:true`
   because the plain node sat *under* the card still open from the positive arm — the pointer never
   reached it. Read the controller's `overNode`/`overCard` beside the verdict.
4. **`isVisual()` cannot tell a visual instance from a logic one** — it reads `type.visual`, which
   is `undefined` on every component instance. `allowAsChild` is the field that splits them (stale
   until the node library loads, so read it mid-drive).
5. 🔴 **Give the happy path an exit.** The first all-green run *appeared to hang*, was killed twice,
   and had already printed `21/21 arms passed` — the CDP socket holds the loop open and every red
   run had left through `process.exit(1)`. **Read the duration before concluding "wedged".**

🔴 **And the one the log could not see at all:** every path arm was green while **8 of 16 cards were
unreadable**, because `textContent` returns the whole string even when CSS has clipped it. The
screenshot caught it. End-truncation was dropping the component's **name** — the exact thing R-Z
took off the node card to put here. Fixed by splitting folder from name so only the folder shrinks;
names clipped **8 → 0** over the same population. **This is TVW-001's shrink-order finding
inverted**: same mechanism, opposite consequence, because which end carried the meaning had changed.

## The fallback, if the box is busy — TVW-008 §9.6, re-scoped at s24

s24 scoped this before the box freed, and **one item changed**: `tests/testfs/` is this repo's
project-fixture convention (18 suites load `git-repo-utf8/project.json` through
`ProjectModel.fromJSON`, so **do not modify that one**), and **`board-export.test.ts` already grades
AC2's and AC4's scenario arms offline** against synthetic metadata. So AC4's remaining gap is **not
another unit test** — it is a *renderable* subject: a project whose component has a
`bench.scenarios[0]` that visibly changes what draws (the input must be **connected** to the visual
root, and its scenario value must differ from the node's default parameter, or the arm passes on
dead code). Component metadata hangs off each component as `metadata: { 'bench.frame': …,
'bench.scenarios': { scenarios: [...] } }`; `uni011-ac3-drive` has a real `bench.frame` to copy the
shape from. **0 of 5,922 components in the corpus have a scenario**, which is why this has to be
authored rather than found. The other three items in §9.6 stand as written.

## 🔴 The drive hazard

`npm run dev:debug` exiting **144** is the **single-instance lock**, not a launch failure — an
Electron is already on 9222 and it may be a **peer's**. `cdp.js` attaches to whoever holds the port
and never asks whose it is. **Two dev stacks cannot coexist on this checkout**
(`webpack.renderer.dev.js:24,38` hardcode port 8080 with no env override). **Attribute the port
before you touch it**: `lsof -nP -iTCP:9222 -sTCP:LISTEN -t`, then walk `ppid` up to a Claude Code
pid and compare it with your own (walk `$$`). ⚠️ **Never `dev:stop` a stack you have not
attributed** — the guard fails CLOSED.

⚠️ **After editing renderer source, RELOAD before measuring** — `cdp.js reload`, then wait for
`typeof webpackChunknoodl_editor === 'object'` (**~45s**, and `readyState` reaches `complete` well
before the bundle is live, so polling `readyState` alone will lie to you).

## Committing

🔴 The working tree carries other sessions' work — **61 dirty files** at s24 (P78, P96, P97, P98,
backend, docs). **Commit through a temporary index with a compare-and-swap** — `BASE=$(git rev-parse
HEAD)`, `GIT_INDEX_FILE`, `read-tree $BASE`, stage only your paths (untracked first: a pathspec
commit skips them), `write-tree`, `commit-tree -p $BASE`, `update-ref HEAD $NEW $BASE`. Then refresh
the real index immediately (`git show --name-only --format="" -z HEAD | xargs -0 git reset -q --`)
and confirm `git diff --cached --stat` is empty. Worked cleanly at s21–s24. ⚠️ At s24 the base had
moved under the session (a peer landed P94 as `f638ccb9f` mid-flight) — which is exactly what the
CAS is for.

⚠️ `scripts/devtools/` holds peers' untracked drive scripts. Never `git add` that directory; name
your file. ⚠️ `dev-docs/tasks/**/verdicts/**/*.png` is **gitignored** — shots are for Richard and for
the local record, never committed.
