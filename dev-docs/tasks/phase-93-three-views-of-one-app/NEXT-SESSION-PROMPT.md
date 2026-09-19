# Phase 93 — next session

**Written 2026-09-19, end of session 19.** s1–5 drove TVW-003; s6–11 closed TVW-001; s12–13 closed
TVW-002; s14–17 built and closed TVW-004 (bar Richard's AC6 look) and TVW-005; s18 built and drove
TVW-006 and censused TVW-007. **s19 got two rulings out of Richard, reshaped TVW-008 around a
census, and built its slice 1.**

## The board, re-derived from the task files

| id | task | built | driven |
|---|---|---|---|
| TVW-001 | The panel tells the truth | ✅ | **CLOSED — all 8 ACs** |
| TVW-002 | The preview says what it is not showing | ✅ | **CLOSED — all 7 ACs** |
| TVW-003 | One selection, three surfaces | ✅ | **CLOSED — all 6 ACs** |
| TVW-004 | Layers | ✅ | AC1–5, AC7 green. **AC6's 20 shots SENT at s18 — Richard's verdict is all that is left** |
| TVW-005 | Layers can move things | ✅ | **CLOSED — all 6 ACs** |
| TVW-006 | The structure lane | ✅ | AC1–4, AC6 green. **AC5's 18 shots SENT at s18 — Richard's verdict is all that is left** |
| TVW-007 | An instance says what it is | — | **UNBLOCKED — R-Z ruled at s19. Not started** |
| TVW-008 | The board | ✅ slice 1 | **Reshaped by R-7. AC8's `test:ci` half green. Slice 2 is the surface and needs the box** |
| TVW-009 | The words (needs 001, 002, 004) | — | — |
| TVW-010 | The disorientation test (needs all) | — | — |

**ACs closed: 50.** s19 closed none — it spent itself on two rulings, a census that rewrote a task,
and the half of TVW-008 that can be graded without the box. That was the right trade *once*; see
"what to do first".

## 🔴 Start here

1. **Two verdicts are still with Richard, and nobody else can do either**: TVW-004 AC6 (20 shots) and
   TVW-006 AC5 (18 shots, in `verdicts/TVW-006/2026-09-19`). Both sets are gitignored; only the
   manifests are tracked. **Do not re-send them** — they went out at s18. If he answers, both tasks
   close on the spot.
2. 🔴 **BUILD, do not farm defects.** s19 built; s18 built. Fine. But TVW-008 slice 2 is a surface
   and needs a drive, so **check the box before you plan the session**:
   `lsof -nP -iTCP:8080 -sTCP:LISTEN`, and if it is up, walk the pid to its owner
   (`ps -o ppid=` up the chain to a `claude` pid, then `/tmp/cc-socks/<pid>.sock`) and ask that
   session. Do not launch a second stack. ⚠️ A peer's all-clear is about that peer.
3. **Pick one**: TVW-008 slice 2 (the bigger, and the one with a ruling banked) or TVW-007 (now
   unblocked, and its §2 needs rewriting to R-Z before a line is written).

## 🔴 What Richard ruled at s19, and what it changed

### R-7 (TVW-008) — the board is a PICKED SET, placed by hand

TVW-008 was *"press `All components`, see every visual component in its own frame"*. **It was
censused before anything was built, and the census killed it** (129 projects, 5,922 components,
`scripts/devtools/tvw008-board-census.js`):

- **Zero of 99 projects fit the board at 100%.** Only **53.5%** fit at the 25% floor §2 specified.
  Median project: **6 frames needing 31%** — so AC1's own *"six frames, ⌘-scroll to 50%, all six
  fit"* was wrong twice over.
- The four biggest boards reach **15,048 × 16,240px — 244 megapixels of live DOM** in one
  `<webview>`. ⚠️ That constraint held *however* the zoom question was ruled, so virtualisation was
  going to be mandatory.
- **Three ACs named subjects that do not exist**: `bench.scenarios` on **0 of 5,922** components,
  `bench.frame` on **3**, and AC1's six-component project on **none** (best match: 1 of 6).

Shown that, Richard said *"I think you've highlighted a flaw in my vision, a very valid one"* and
reshaped it: **you choose which components to show, and place them side by side on a canvas.** Then,
offered three shapes, he chose **placed by hand** over auto-arranged and over dropping the task.

🔴 **The argument that decided it was in his own sentence all along.** The stated value was *"do they
really fit together?"* — a question about a **chosen set**. The app preview already answers it for
components that share a screen; what nothing else can answer is *"show me these three button
variants side by side"*, because in the running app those three are never on screen together. An
every-component board serves that **worse**, by burying the three among 357.

⚠️ **Hand placement was recommended against on cost and ruled for anyway, so its cost is now the
task's cost.** The recommendation was a row at real sizes with reordering done in the picked list;
the free canvas means drag, persist and undo — roughly double. **Do not quietly re-scope it back to
a row. If it has to shrink, that is a new ruling.**

### R-Z (TVW-007) — the instance eyebrow is the COUNT ONLY, path on hover

s18 measured that §2's `INSTANCE · Sections/Hero · used 3×` fits **0 of 2,385** placed components,
because the fixed chrome alone (~126px) is wider than the 114px a node leaves. Richard chose the
**count alone** (`· 3×`) with the path on hover.

🔴 **Two things follow, and both are in TVW-007 §7**: the hover is now the *only* place the
component's identity lives, so it needs an AC of its own and must work on logic instances too; and
`Edit ›` is already specified on hover at the node's top-right, so **two different things now appear
on the same gesture** and whoever builds it resolves them together.

## What s19 built — TVW-008 slice 1 (`fb82d4fa2`, `5208e3a42`)

Everything gradeable without the box. `previewScope.ts` gained the third variant, the exhaustiveness
guard and the mode predicates; `benchBoard.ts` is new (the board's pure rules and the `bench.board`
record); `componentBench.ts` gained `boardBounds` / `boardHarness` / `buildBoardExport`.

🔴 **§6.5 was right, and the compiler proved it by saying nothing.** Adding `{ mode: 'board' }` left
`tsc --noEmit` at **exit 0** while six behaviours changed, because every site derived
`const isBench = scope.mode === 'bench'` and then asked `!isBench` — which stops meaning *the app*
the moment a third mode exists. The one a person would have seen first:
`isBench ? benchTargetLabel(scope.target) : 'App'` labels the board **App**, on the single control
whose entire job is to say which of three things you are looking at.

⚠️ **`isBench` must STAY `scope.mode === 'bench'` and not be tidied into `showsBench(scope)`.**
TypeScript narrows a union through a `const` aliasing a discriminant check; a helper returning
`boolean` throws that away and four reads of `scope.target` stop compiling. It is commented in
place, because it reads like a missed cleanup.

🔴 **The frame wrapper is the one BEN-001 deliberately refused to build**, and a board cannot
sidestep it the way the single bench did. Both its failure modes are answered against the real port
definitions: `sizeMode` is **named**, and sizes are `{ value, unit: 'px' }` — `width`/`height` are
`dimension` ports whose **`defaultUnit` is `'%'`**, so **a bare `768` is 768 _percent_**, a frame
seven times its parent that reads on screen as *broken* and in the graph as *correct*.

## 🔴 Three things that each cost something at s19 — read before writing a spec

- **`tests/` is jasmine; `tests-unit/` is jest.** `toHaveLength`, `toHaveProperty` and `it.each` do
  not exist in the jasmine bundle. Twelve of them were caught by
  `tsc -p packages/noodl-editor/tsconfig.tests.json --noEmit` **before** a CI run —
  **run that typecheck on any new `tests/` spec, always.**
- 🔴 **Both `test:ci` runs were reported by the harness as exit 0 while the log ended
  `TESTCI_EXIT=1`.** The `echo "TESTCI_EXIT=$?" | tee -a` is what caught it, both times. Gate on the
  number in the log.
- ⚠️ **An `&&` chain conflates a grep's exit code with your answer.** `grep -c "FAILED: TVW-008"`
  printed `0` and **exited 1**, which broke the chain and made the final `|| echo "NO"` print — so a
  question about *commit ancestry* was answered by a *grep that found nothing*. The ancestry check
  had never run. Put each measurement on its own line.

## ⚠️ Two failing specs at s19 were the SPEC being wrong, not the product

The first `test:ci` was 10 = the floor + 2, and both of the two were mine to fix in the test:

- `offsets a frame with margins` asserted a 120px margin on a board of **one** frame. Normalisation
  makes the leftmost frame the origin **by definition**, so a lone frame sits at 0,0 however far it
  was dragged. **The assertion contradicted the design it was written to check.** The single-frame
  case is now its own spec saying so, because it is the property a reader is most likely to mistake
  for a bug.
- `instantiates each picked component by its legacy name` read `.type` off the **model**.
  `ComponentModel.fromJSON` resolves a node's type through the global `NodeLibrary`, so a component
  the fixture does not define comes back as `UnknownNodeType` — the *resolution*, not the authored
  value. `.typename` is what the board wrote.

## Gates at s19

- ✅ **`test:ci` AT THE FLOOR BY NAME** — **3012 specs, seed 97272, gitHead `dd2c8367`** (carries
  `fb82d4fa2`, checked with `git merge-base --is-ancestor`), readout mtime **20:54:05** against a
  **20:56:28** clock. Eight failures, the same eight by name: **3 SUB-006, 3 SUB-011, 2 NDA-017**,
  none of them mine.
- `tests-unit/tvw-008` — **58 specs, 2 suites green**, `Tests: 58 total` (not zero — the modules
  resolve).
- `tsc -p packages/noodl-editor --noEmit` **0**; `tsconfig.tests.json --noEmit` **0**.
- ⚠️ **No mutation testing was done on the 58.** The phase has done it for tvw-004/005/006 and it
  has caught real holes every time. It is owed here.

## ⚠️ AC8, stated precisely, because it is half-met

AC8 is *"`test:ci` at the floor; `tests/canvas/preview-scope.test.ts` extended for the third mode
and given the `never` exhaustiveness check"*. The `test:ci` half is green and the exhaustiveness
check exists — but the mode specs live in **`tests-unit/tvw-008/previewScopeModes.test.ts`**, not in
the file AC8 names, because jest runs them in four seconds where the jasmine bundle needs a renderer.
`preview-scope.test.ts` now carries a pointer saying there are three modes and where the third is
graded. **Whoever closes TVW-008 decides whether that satisfies AC8 as written; it is not counted as
closed here.**

## What slice 2 has to build, and where the traps are

The picker (multi-select over `benchTargets`), the board surface, the drag, the editor-drawn
captions, zoom/pan, click-through to the single bench, the empty state, and the wiring of
`bench.board` through `ProjectModel.setMetaData`.

- 🔴 **AC5 is the one that can regress quietly.** `setMetaData` calls `scheduleProjectSave()` itself
  (`projectmodel.ts:1322`), so a drag that writes through dirties the project on **every pixel**.
  The commit is on mouse-up, once — and only a control on `project.json`'s mtime can see it go wrong.
- **AC4 needs an authored fixture** and the task says so: no component in 129 projects has a
  `bench.scenarios`. ⚠️ A drive that writes one and reads it back grades the fixture, not the
  product.
- **23% of projects have no pickable components at all**, so the empty state is a common first sight,
  not an edge case.
- The board's extent uses an **estimated** height for content-sized frames
  (`ESTIMATED_CONTENT_FRAME_HEIGHT`). The editor must re-measure for its captions — `benchSizeLabel`'s
  standing rule: report the frame that was **measured**, not the one that was asked for.

## 🔴 Drive levers from s18 that still apply

- **A hidden Electron window never fires `requestAnimationFrame`**, so `repaint()` does nothing and
  every mutate-then-wait arm reads as a dead feature on a working build. `Page.bringToFront` does
  **not** fix it; `Page.setWebLifecycleState {state:'active'}` +
  `Emulation.setFocusEmulationEnabled {enabled:true}` does. `drive-tvw006-lane.js` asserts rAF fires
  as a precondition and exits 2 otherwise — **copy that guard into any new canvas drive.**
- **There is no `window.NodeGraphEditor`.** The canvas is `NodeGraphContextTmp.nodeGraph` through
  `__wreq`.
- **A renderer behaving impossibly is a question about the BUNDLE before it is a question about the
  code.** `tsc --noEmit` on the tsconfig `ts-loader` uses answers it in one command. An hour of s17
  went into three defects that did not exist.

## Committing

🔴 The working tree carries other sessions' work (P78 TPL-009, P98, and docs). **Commit through a
temporary index with a compare-and-swap** — `BASE=$(git rev-parse HEAD)`, `GIT_INDEX_FILE`,
`read-tree $BASE`, stage only your paths, `write-tree`, `commit-tree -p $BASE`,
`update-ref HEAD $NEW $BASE`. HEAD moved **twice** under s19 (a P94 peer and a P96 peer), and the CAS
is what made that a non-event. ⚠️ Then refresh the real index immediately
(`git show --name-only --format="" -z HEAD | xargs -0 git reset -q --`) and confirm
`git diff --cached --stat` is empty — a stale index holds staged deletions that sweep a peer.

⚠️ `scripts/devtools/` holds peers' untracked drive scripts. Never `git add` that directory; name
your file.
