# Phase 93 — next session

**Written 2026-09-19, end of session 18.** s1–5 drove TVW-003; s6–11 closed TVW-001; s12–13 closed
TVW-002; s14–17 built and closed TVW-004 (bar Richard's AC6 look) and TVW-005. **s18 sent Richard
TVW-004's twenty AC6 shots, built TVW-006 slice 1 end to end, and censused TVW-007 before anyone
builds it.**

## The board, re-derived from the task files

| id | task | built | driven |
|---|---|---|---|
| TVW-001 | The panel tells the truth | ✅ | **CLOSED — all 8 ACs** |
| TVW-002 | The preview says what it is not showing | ✅ | **CLOSED — all 7 ACs** |
| TVW-003 | One selection, three surfaces | ✅ | **CLOSED — all 6 ACs** |
| TVW-004 | Layers | ✅ | AC1–5, AC7 green. **AC6's 20 shots SENT to Richard at s18 — his verdict is the only thing left** |
| TVW-005 | Layers can move things | ✅ | **CLOSED — all 6 ACs** |
| TVW-006 | The structure lane | **slice 1** | **43 specs, 17/17 mutants, tsc 0. NOT DRIVEN — the box was a peer's all session** |
| TVW-007 | An instance says what it is | — | **censused, not built. 🔴 §2's eyebrow does not fit — see its §6** |
| TVW-008 | The board (needs 002) | — | — |
| TVW-009 | The words (needs 001, 002, 004) | — | — |
| TVW-010 | The disorientation test (needs all) | — | — |

**ACs closed: 45.** TVW-006 adds none yet — everything it has is offline.

## 🔴 Start here: TVW-006 needs the box, and nothing else

Slice 1 is committed (`4fe5a5645`, `80107d9ce`) and compiles. **Four of its six ACs are waiting on a
drive that could not happen**: a peer (`opennoodl-ec`, P94/STY-003) held the only dev stack for the
whole session. Both scripts are written, syntax-checked and committed:

| script | what it grades |
|---|---|
| `drive-tvw006-lane.js` | AC1 (the lane follows a 200px drag, live), AC3 (a dimmed node is still selectable), the filter control being reachable and wired |
| `drive-tvw006-lane.js --perf` | **AC6** — `painter.paint()` timed over 60 forced repaints |
| `shots-tvw006-lane.js` | AC5's 18 photographs, three lane shapes × both themes × three filters |

🔴 **AC6 needs a BEFORE reading and the wiring is already applied**, so take it by swapping the two
files out and back:
```
S=<scratchpad>/pristine        # CanvasRenderer.ts + CanvasPainter.ts, pre-wiring
W=<scratchpad>/wired           # the same two, wired
```
Those scratchpad copies die with the session. **Recreate them from git instead**: the pre-wiring
versions are `4fe5a5645^` and the wired ones are `4fe5a5645`. `git show <sha>:<path> > <path>`, let
the dev stack rebuild, run `--perf`, then put the wired ones back. **Never `git checkout --`**.

⚠️ **`test:ci` was NOT run at s18** — ec held the box and asked to be told before a second heavy job
started. It must be run before TVW-006 is called closed.
## What s18 measured, and what it changed

🔴 **TVW-006 — three of §2's rows were wrong, and the census found it before a pixel was drawn.**
128 projects, 5,558 components (`scripts/devtools/tvw006-lane-census.js`). 667 components get
THREE OR MORE lanes, not the two §2 mentions; 1,012 (18%) get none, so the logic-only eyebrow is a
common sight; **838 logic roots in 386 components are drawn INSIDE where their lane would be**; and
**221 pairs of lanes overlap each other** in 117 components. Richard ruled all three at TVW-006 §7
(**R-W/R-X/R-Y**) and all three matched what was already built, so nothing was rewritten to suit a
ruling.

🔴 **TVW-007 — §2's instance eyebrow does not fit on a node, and truncation does not answer it.**
A 150px node leaves **114px**. `INSTANCE · <path> · used N×` fits **0 of 2,385** placed components
(p50 396px). The leaf-name form fits **0 too**, because the fixed chrome alone is ~126px *before*
the component's name. Three options are filed as **R-Z** at TVW-007 §6; the format has to change.
The same census corrects a number this phase has carried since s8 — *"5 of 6 components have all
their instances in one parent"* was six components in ONE project; across the corpus **44% of placed
components have two or more parents**, so `in 3 places ▾` is nearer the rule than the exception.

✅ **The paint seam moved after scoping, in our favour.** TVW-006 §2 names `nodegrapheditor.ts`
`paint()`; PLAT-001 has since extracted it to `canvas/CanvasRenderer.paint(ctx, frame)` fed a plain
`FrameState`. AC4's "record the draw calls" seam therefore already exists, and the paint ORDER is
graded offline against a recording context instead of against pixels.

⚠️ **A spec that grades something which cannot break is worse than no spec.** "The filter must not
leak into the drag ghost" is vacuous — `globalAlpha` is absolute, so the ghost's `0.5` overwrites
it. The real leak is the insert indicator and multiselect box, drawn *after* the node pass with no
alpha of their own. Check which way round a property can actually fail before asserting it.

## 🔴 Read this before you debug anything in the running editor

**An hour of s17 went into three defects that did not exist.** A `dev` stack's webpack watchers had
been running for hours across a peer's directory add-and-delete, and both the editor and the viewer
bundles went stale:

- three drive arms went red saying a quick drop on the tab strip placed nothing;
- a graph reorder did not move the preview — reproduced with the **raw model calls the canvas's own
  drag makes**, with a spy proving the editor sent the right message — which was filed as a runtime
  defect, in this file, in the task and in a memory;
- and the editor bundle reported `TS2307` for modules that were on disk, which got a peer
  accused of breaking the tree.

**All of it was the bundle.** `tsc -p packages/noodl-editor --noEmit` was exit 0 throughout. After
`dev:stop`, `rm -rf packages/noodl-editor/.webpack-cache` and a cold relaunch — **no code change** —
the preview reorders in 800ms, the drive is 20/20 twice, and the drag drive is 11/11.

✅ **The order that would have saved the hour: a renderer behaving impossibly is a question about the
BUNDLE before it is a question about the code.** `tsc --noEmit` on the tsconfig `ts-loader` uses
answers it in one command. ⚠️ And `.webpack-cache` is a red herring for a dev stack —
`webpack.renderer.dev.js` is `cache: false` (line 18); what goes stale is the **in-memory resolver
of a watcher that has been up for hours**, and the fix is the restart.

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

## 🔴 Richard's ruling, and what it changed

Asked whether being able to place a component exactly where it goes in one gesture was worth §2's
*"the tab does not switch during the drag"*, he said yes — and, asked separately, said **no** to
dropping inside another component's interior (the band rule stands). So:

- **Resting a component on the Layers tab for 500ms opens Layers under the live drag**, and the row
  indicators and `planComponentDrop` that slice 1 already built take it from there. Dropping between
  two rows puts it there; ⌘Z removes it in one step.
- **The strip keeps both meanings** — let go and it lands at the end of the screen, hold and you aim.
- **An abandoned spring puts the tab back** where the person was, because the switch was part of a
  gesture that did nothing.
- ⚠️ **The dwell is armed only when the drop would LAND**: a page held on the strip for 1.1s does
  not open a tree that would refuse it. There is an arm for that.

TVW-005 §11 has the three things the spring had to be built around, including the one that bit
twice: a state update in a **capture-phase** listener re-renders the tab *between the capture and
bubble phases of the same mouse-up*, so the handler React is about to call can be gone before it
calls it. Everything in that listener is deferred to a macrotask now.

## What the strip is, in one paragraph

The two tabs are exclusive: a component row and the rows it could be dropped between are **never on
screen together**, so without a target on the tab header there is no gesture at all. §2 rules out the
other way to build it in its own sentence — *"the tab does not switch during the drag"* — so the
strip is a **destination, not a spring-loaded doorway**. A drop places the component at the end of
the screen's root and opens Layers with the new row selected; moving it from there is ⌥↑/⌥↓ or a
second drag, both of which slice 1 already built. 🔴 The root it lands in is the first row the
**canvas's** component owns, which is rarely the top of the tree — the app shell is drawn above every
band, so "the top of Layers" is `/App`, on every page at once.

## Gates at s17 (s18 ran no `test:ci` — the box was ec's)

- `tests-unit/tvw-003` + `tvw-004` + `tvw-005` — **7 suites / 103 specs, green.** tvw-005 is 22 specs
  (15 + 7 new), and the seven were mutation-tested: **4 mutants, each caught**. ⚠️ One proposed
  mutant was *equivalent* (it moved a computation, not a decision) and had to be rewritten as the
  real ordering swap before it meant anything.
- `tsc -p packages/noodl-editor --noEmit` **0**.
- `tsc -p packages/noodl-editor/tsconfig.tests.json --noEmit` — **three errors, all a peer's**:
  `tests/ai/authoring-style.test.ts:116,117,119` read `variants` / `sizes` / `variantStyles` off
  `VocabElement`, which **P94 STY-002 removed** (the type's own comment at `StyleVocabulary.ts:95`
  says so). Both files were **uncommitted working-tree edits** at the time.
- ✅ **`test:ci` at the floor BY NAME, twice** (2 NDA-017, 3 SUB-006, 3 SUB-011, none of them mine),
  readout mtime checked against the clock both times: **2985 specs / seed 19733 at `1d342bc6`** (the
  strip) and **2978 specs / seed 31629 at `61aa0502`** (a peer's commit carrying the spring).
  ⚠️ The spec **count** moved by seven between them — a peer's property-editor refactor — and the
  floor did not. The eight failures being the same eight *by name* is what makes that readable;
  a count alone would have looked like a regression. TVW-005 AC6 is closed.
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
| `drive-tvw005-drag.js` | slice 1's gesture + AC1's preview half. **11/11** |
| `drive-tvw005-strip.js` | the tab-header strip and the spring. **20/20, twice back to back** |
| `shots-tvw005-indicators.js` | AC5's ten photographs, both themes, page proved byte-identical after |

All three take `--dir`; the fixture is a **copy**, `NodeGX test projects/TVW-005 s17 Strip`
(s16's `TVW-004 s15 Drive`, copied). ⚠️ One probe left a stray `Divider` in it during s17 and it was
removed from `project.json` by hand — if a run ever starts from four children, that is what happened.

## The box

🔴 **s18 never got it.** `opennoodl-ec` (P94/STY-003) launched a `dev` stack at 13:58 and still had
it at the end of the session. Everything TVW-006 has left is a drive, so **check the box first**:
`lsof -nP -iTCP:8080 -sTCP:LISTEN`, and if it is up, walk the pid to its owner
(`ps -o ppid=` up the chain to a `claude` pid, then `/tmp/cc-socks/<pid>.sock`) and ask that session
— do not launch a second stack.

⚠️ **A peer's all-clear is about that peer.** `opennoodl-0b` answered "no dev stack, the box is free"
while the stack was measurably up on :8080 — they were right about themselves and wrong about the
box ([[a-peer-all-clear-is-about-that-peer]]). Measure it yourself; the process chain names the
owner.

## Committing

🔴 The working tree carries **three** other sessions' work — P78's TPL-009, P94's STY-002/004 (which
includes `StyleVocabulary.ts` and `tests/ai/authoring-style.test.ts`) and P96's FED-002. Commit by
explicit pathspec, `git add` untracked files first, and put `-F <file>` **before** the `--`.
⚠️ `scripts/devtools/` holds a peer's untracked census script — never `git add` that directory.
s17's commit is `1d342bc67`.

🔴 **Verdict PNGs are gitignored** (`.gitignore:265`). The tracked artefact is `manifest.json`, and
the shots have to be **sent** to Richard, not linked.
