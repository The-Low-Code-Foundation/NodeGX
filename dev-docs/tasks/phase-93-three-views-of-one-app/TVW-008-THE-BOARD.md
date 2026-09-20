# TVW-008 — The board

A canvas you put chosen components on, side by side, at their real sizes. Proposal §4.7, mock
scenario 5, callout 11, ruling R-I — **reshaped by R-7 on 2026-09-19; see §7 for what it was.**

> "they had a kind of Figma style canvas preview of all the components spread out and you could move
> around and zoom in and out on each one … they might have got rid of it for a reason, and having the
> full page preview is clever to say 'ok you've got the right idea with each component, but do they
> really fit together?'" — Richard, 2026-09-17

> "Can we make it that you can choose which components to show? … a nice way to lay out important
> components from a page that you want to look at side by side." — Richard, 2026-09-19, on being
> shown §6

## 1. The person sentence

**Someone comparing three versions of a button picks them from a list, sees all three on one canvas
at their real sizes with their first scenario's values, drags them into the arrangement that makes
the comparison, and finds that arrangement still there tomorrow.**

## 2. The spec

| element | detail |
|---|---|
| **the target** | `PreviewScope` (`previewScope.ts:31`) gains `{ mode: 'board' }`. The chooser (`PreviewScopeControl`, `PreviewChrome.tsx:57`) gains a third segment above the Workbench list. The board carries **no target** — its membership is project state (below), not scope state, so switching to the board and back cannot lose it |
| **the set** | a **picked list**, not every component. The picker is `benchTargets()` (`previewScope.ts:233`) — the bench's existing list, same exclusions (no cloud; pages allowed but not defaulted in) — rendered multi-select. A component may appear **once**; picking it twice is the scenario's job, not the board's. `Add all` is offered only while the project has ≤ 12 pickable components, because past that it is the surface §6.2 measured and rejected |
| **placement** | each frame has an `{x, y}` on an infinite canvas. Dropped frames land in a row at first pick (no overlap), and are then dragged. 🔴 **A drag never writes** — FIX-011's rule, and here it is load-bearing: `ProjectModel.setMetaData` calls `scheduleProjectSave()` itself (`projectmodel.ts:1322`, `:1790`), so a write-through drag dirties the project on every pixel. The position commits **on mouse-up**, once |
| **persistence** | `project.metadata['bench.board']` — `{ frames: [{ target, x, y }] }`. 🔴 **This is R5's third knowing exception and it needs the same argument the other two got**: `bench.scenarios` and `bench.frame` are project state because *a set of input values, and a default size, are authored intent*. "These five belong side by side" is authored intent by the same test — it is a fact about the project, not about the session someone happened to look at it in. ⚠️ Project metadata, not component metadata: the board spans components and belongs to none of them |
| **the export** | the **same harness** `buildBenchExport` already splices (`componentBench.ts:419`, `/#bench` at `:100`, `benchHarness` at `:367`) — one component, now with **one instance node per picked frame** instead of one, each carrying that component's `bench.scenarios[0]` inputs (`benchScenarios.ts:53`) or none. One export, one client, one `<webview>`. ⚠️ §6.3: this adds **2N nodes**, not N² |
| **the frames** | drawn by the editor over the webview: caption `Primary Button · ×4 · 360 × 200 · scenario: default`, or `no inputs set`. Each frame's box is that component's `bench.frame` (`benchFrameDefault.ts:43`) or the 768 default — §6.4 says that is **every frame on every project today**, so the default is the case to get right and the stored one is the exception |
| **zoom / pan** | ⌘-scroll zooms, space-drag pans, as the node canvas does. 🔴 **No fit-to-screen requirement and no 25% floor** — R-7 removed the reason for both. The range is whatever a picked set needs; §6.2's numbers were about a board nobody picked |
| **click a frame** | `choose({mode:'bench', target})` — the single bench for that component, back with the board segment. Dragging a frame does **not** open it (threshold first; see TVW-005's 13px-on-a-26px-row finding) |
| **selection** | a click on an element inside a frame selects it in TVW-003's store with the instance path through that frame's harness node; the canvas, if on that component, highlights it |
| **honesty** | the caption strip says what is on the board and where the values came from — **once**, in one vocabulary. See the AC7 note below before writing a word of it |
| **updates** | a `Model.*` change re-exports as the single bench does (`_exportToClient` dedupes identical bytes, `ViewerConnection.ts:430`). Typing in a benched component's input does not rebuild the board |
| **empty** | a board with nothing on it is the **ordinary first sight**, not an error: it says what the surface is for and offers the picker |

## 3. Scope

In: the third mode, the picker, the export, frames, captions, hand placement and its persistence,
zoom, pan, click-through, selection, the empty state, both themes, docked and detached preview.

Out: **every-component boards** (R-7 — that is what this task was, and §6 is why it is not).
Editing scenarios from the board (bench one component for that). More than one saved board per
project (§7.1 — a live question, deliberately deferred). Snapping, alignment guides, or any frame
geometry beyond a remembered `{x, y}`. Resizing a frame on the board (that is `bench.frame`, and it
belongs to the single bench where it already works).

## 4. Acceptance criteria

1. **(person)** A project with a component placed more than once. Press the board segment: the empty
   state. Pick three components: three frames, side by side, none overlapping, each captioned with
   its own size. Drag the middle one below the other two; release. Switch to `App`, then back: the
   frame is where it was dropped. Close the project and reopen it: still there.
2. The board's export contains exactly **one** harness component with N instance nodes, N = the
   number of picked frames; each instance's parameters equal that component's `bench.scenarios[0]`
   (asserted against the metadata) or are empty. Picking the same component twice is refused.
3. Every frame's measured box equals that component's `bench.frame` or the 768 default; captions do
   not overlap at any zoom the control offers.
4. **On an authored fixture** (§6.4 — no component in any of the 129 projects has one): a component
   with a saved scenario renders that scenario on the board, and the single bench renders the same
   values. A component without one renders its empty state and the caption reads `no inputs set`.
5. A drag **writes nothing** until mouse-up: `project.json`'s mtime is unchanged across a drag of
   200 intermediate moves, and changes exactly once after the release. (FIX-011 AC4's control,
   re-run here, because this is the surface where it can actually regress.)
6. The app preview's route and mode are unchanged across every step of AC1 (TVW-002's negative arm,
   re-run here).
7. Screenshots: an empty board, a three-frame board before and after a rearrange, one frame benched,
   both themes. **Richard rules WORTHY.**
8. `test:ci` at the floor; `tests/canvas/preview-scope.test.ts` extended for the third mode **and
   given the `never` exhaustiveness check §6.5 asks for**.

## 5. Landmines

- 🔴 **§6.5 first, before the variant.** Six sites derive `const isBench = scope.mode === 'bench'`
  and then branch on `!isBench`, which silently becomes *"app **or** board"*. TypeScript flags none
  of them. The exhaustiveness check is what turns six behaviour changes into six compile errors.
- A changed export makes the runtime `location.reload()` and a sandbox client returns under the same
  id (`ViewerConnection.ts:581`); the board loses click state on every model change. Accept and say
  so, or debounce as the single bench does.
- `plug` inversions (`componentBench.ts:22-43`): the harness node's parameters are the *instance's*
  inputs; BEN-001's note is wrong and the code is right.
- 🔴 **The frame wrapper is the thing BEN-001 refused to build, and its reasons still hold.** A
  `Group` sized to the frame is how the board gets N boxes in one document — but `sizeMode` silently
  voids `width`/`height` and an unsized absolute Group fills its parent (phase-55 F7), so a wrapper
  that gets either wrong makes a correct component look broken *inside the tool built to tell you
  whether it is*. The single bench sidestepped this by letting the **surface** be the frame; a board
  cannot. Build the wrapper against a rendered measurement, not against the parameter you set.
- A frame dragged to a negative coordinate, or 40,000px away, must still be reachable. Persisted
  positions are user data and come back from disk unvalidated.
- The viewer webpack build is pre-ES2015 for iteration: `Array.from`, never `[...set]`.
## ⚠️ Wording in this task that AC7 has already ruled against (added s11, 2026-09-18)

🔴 **"sample values" / "not the app's data" must not be used on this surface as written.** Richard
ruled on 2026-09-18 (TVW-001 AC7) that the word *sample* was doing two jobs at once on the Workbench:
the caption said **"Sample values."** (synthesised *input port* values) while the bench summary, ~44px
below it, said **"No sample data"** (`sandboxData.ts:580`, about *backend records*) — in the
empty-data branch that every project without a backend shows. The caption's claim was **cut**; the
summary line now owns the data story alone.

This task's strings were written before that ruling and still carry the retired phrasing. Rewrite
them when you build it: say the data thing **once**, in **one** vocabulary, and check what renders
*beside* your string, not just the string. Otherwise this re-opens the exact defect AC7 closed.

See TVW-001 §"AC7 — Richard's rulings, built and re-driven", and
`a-pinned-string-is-blind-to-its-neighbour`.

## 6. Scoping census — the board does not fit, and three ACs name subjects that do not exist

**Measured 2026-09-19 (s19) before anything was built**, over 129 projects / 5,922 components.
Script: `scripts/devtools/tvw008-board-census.js`.

🔴 **Visual-ness is the recorded `graph.visualRoots` field and nothing else** — the lesson TVW-006
paid a whole finding for at s18. An offline proxy for a runtime predicate (`isVisualRoot`) is a
hypothesis; `visualRoots` is written by the editor and *is* the predicate's answer. The **182
components (3.1%)** whose file predates the field are EXCLUDED and COUNTED, never guessed at.

### 6.1 How many frames a board actually draws

| frames per board | projects | share |
|---|---|---|
| 0 | 30 | 23.3% |
| 1–6 | 43 | 33.3% |
| 7–20 | 24 | 18.6% |
| 21–50 | 15 | 11.6% |
| 51–100 | 0 | 0.0% |
| **100+** | **17** | **13.2%** |

min 0 · p25 1 · **p50 4** · p75 17 · p90 109 · **max 363** (`SuntappedX`). 4,145 components are
visual; 515 of those are pages, excluded by §2's default.

⚠️ **23% of projects would open the board on nothing.** §2 has no empty state and §4 has no arm for
one. That is the single commonest outcome after "a handful of frames".

### 6.2 🔴 The board never fits, and the specified zoom range cannot make it

Laid out as §2's wrapping row — frames at their `bench.frame` or the 768 default, gutter 24,
caption 20 — against a 1200 × 760 docked stage:

| fits at | projects (of the 99 with ≥1 frame) |
|---|---|
| **100%** | **0 (0.0%)** |
| 50% | 15 (15.2%) |
| **25% — §2's floor** | **53 (53.5%)** |
| 10% | 82 (82.8%) |
| 5% | 98 (99.0%) |

**The median project has 6 frames and needs 31%.** The worst needs **4.7%**.

🔴 **AC1's own numbers are wrong twice over.** It says *"six frames … ⌘-scroll to 50%: all six
fit"*. Six frames is the median board, and the median board needs **31%**, not 50%. And §2 caps the
zoom at 25%, so **46% of projects cannot be shown whole at all** by the control as specified.

🔴 **This is TVW-006's R-6 arriving on a second surface.** There the finding was *a real canvas does
not fit on screen* — no multi-lane component above 40% zoom, the worst at 4%, and the eyebrow hidden
below 50%. Here it is *a real board does not fit on screen*, with the same shape and nearly the same
worst-case number. Two independent measurements of the same thing: **this product's real artefacts
are an order of magnitude bigger than the mock's.** A third surface that assumes otherwise should be
censused before it is drawn, not after.

### 6.3 🔴 One webview sized to the board is not implementable at the top of the distribution

§2: *"the webview is sized to the board at 100% and CSS-scaled"*. At 100% the four biggest boards are

| board at 100% | frames | project |
|---|---|---|
| **15,048 × 16,240** | 363 | SuntappedX |
| 12,672 × 13,804 | 269 | `30d29729-…` |
| 12,672 × 12,992 | 243 | emdashdev |
| 11,088 × 12,180 | 206 | Erleah-2 |

16,240px is past the point where a compositor will hand back one layer, and 15,048 × 16,240 is
**244 megapixels** of live DOM in a single `<webview>`. ⚠️ This is a constraint, not a preference:
it holds however Richard rules on 6.2, so **the board needs virtualisation — render the frames in
view — regardless of what the zoom control ends up doing.**

✅ **§5's N² landmine is NOT where the cost is, and the task overstates it.** `buildBenchExport`
already exports the **whole project** and splices one harness; the board's harness adds **2N nodes**
(an instance + its frame Group), so the export JSON barely grows. The cost is **rendering**: the sum
of each frame's transitive closure is **21,488 nodes** at the worst (Erleah-2, 206 frames), 11,711
for emdashdev. Capping a frame's depth does not help — that number is what the frames *are*.
Virtualisation does.

### 6.4 🔴 Three ACs name subjects that do not exist in any project on this machine

| AC | what it needs | how many exist |
|---|---|---|
| AC2, AC4 | a component with `bench.scenarios[0]` | **0 of 5,922 (0.0%)** |
| AC3 | a component with a stored `bench.frame` | **3 of 5,922 (0.1%)** |
| AC1 | a project with `Nav`, `Hero`, `Footer`, `Project Card`, `Price Tag`, `Primary Button` | **none — the best project on this machine has 1 of the 6** |

So: **every frame on every real board today is the 768 default with empty parameters.** AC2's
scenario branch and AC4 are unreachable on real data and need an **authored fixture**, which must be
said out loud in the task rather than discovered mid-drive — a scenario written by the drive and then
read back by the drive grades the fixture, not the product
([[a-budget-measured-on-a-fixture-is-a-budget-on-the-fixture]]). AC1's project has to be authored or
its sentence rewritten against a project that exists.

### 6.5 ⚠️ The third mode will compile clean and be wrong in six places

`PreviewScope` has **no `switch` and no exhaustiveness check anywhere**, so adding `{ mode: 'board' }`
raises a type error only where `scope.target` is read after a `mode === 'bench'` narrowing. Every
other site derives a **boolean** first — `const isBench = scope.mode === 'bench'` at
`VisualCanvas.tsx:121` and `PreviewChrome.tsx:114` — and then uses `!isBench`, which silently becomes
*"app **or** board"*:

- `VisualCanvas.tsx:162` `usePreviewStrip(canvasComponent, !isBench)` — the strip would run on the board
- `:248` `showDesignChrome = Boolean(designMode) && !isBench` — design chrome over the board
- `:465` `showViewportSize && !isBench` — the app's size read-out over the board
- `:365` `data-preview-mode={scope.mode}` starts emitting `board`, matching no SCSS rule
- `VisualCanvas.module.scss:37` / `PreviewChrome.module.scss:32` `&.is-bench` — neither arm styles it

🔴 **Add the `never` exhaustiveness check as the first commit**, before the variant. It is the only
thing that converts these from six silent behaviour changes into six compile errors
([[a-gate-can-have-a-hole-shaped-like-the-defect]]).

## 7. R-7 — RULED 2026-09-19 (s19): a picked set, placed by hand, not every component

Richard was shown §6 and answered: *"I think you've highlighted a flaw in my vision, a very valid
one. Can we make it that you can choose which components to show? Kind of like the workbench but
with the ability to place selected components next to each other on a canvas … Or maybe it's a
stupid idea and we should just drop it?"* — then, offered the three shapes, chose **picked set,
placed by hand** over auto-arrangement and over dropping the task.

**What the task was until this ruling.** *"Someone who presses `All components` sees every visual
component in the project drawn in its own frame"* — the board as a project atlas, with a `Pages too`
toggle, a 25%–100% zoom, and one `<webview>` sized to the whole board. §1–§5 above are the rewrite;
this paragraph is the record, so nobody re-derives the old shape from the proposal.

**Why the reshape is a smaller build as well as a better surface**, and each of these is a §6 number
rather than a preference:

- **The fit problem stops existing.** §6.2 measured 0 of 99 projects fitting at 100% and only 53.5%
  at the specified floor. A set of three frames fits at whatever zoom you like.
- **Virtualisation stops being mandatory.** §6.3's 15,048 × 16,240px board — 244 megapixels of live
  DOM — was the one constraint that held *however* the zoom question was ruled. A picked set cannot
  reach it.
- **The 23% of projects that would open on nothing** (§6.1) become the ordinary empty state of a
  surface you add things to, which is not a defect and needs no special case.
- **For the 33% of projects with 1–6 pickable components, the two designs coincide** — which is why
  `Add all` survives, bounded at 12.

🔴 **The comparison argument is the one that actually decides it, and it was in Richard's own
sentence all along.** The stated value was *"do they really fit together?"* — a question about a
**chosen set**. The full-page preview already answers it for components that share a screen. What
neither the app preview nor the single bench can answer is *"show me these three button variants side
by side"*, because in the running app those three are never on screen together. An every-component
board serves that **worse** than a picked one, by burying the three among 357.

⚠️ **Hand placement was recommended against and ruled for anyway, so its cost is now the task's
cost.** The recommendation was a row at real sizes with reordering done in the picked list, on the
grounds that a free canvas means drag, persist and undo — a second canvas editor, roughly double the
build. Richard chose the canvas knowing that. **So the estimate for this task is the reshaped scope
plus a drag surface, and §4 AC5 exists because persistence-on-drag is where it can quietly go
wrong.** Do not quietly re-scope it back to a row; if it has to shrink, that is a new ruling.

### 7.1 Deferred, deliberately: more than one board

Richard's sentence was *"lay out important components **from a page** that you want to look at side
by side"*, which reads like one board **per page**, or at least several per project. §2 stores a
single `bench.board` record. That is the smallest thing that can be built and driven, and the record
is shaped as an object (`{ frames: [...] }`) rather than a bare array **so a `boards: []` key can be
added later without a migration**. Ask before building the second one — a named-board picker is its
own surface, and the single board has to earn it first.

## 8. Slice 1 — built 2026-09-19 (s19). The offline-gradeable half

**`fb82d4fa2`.** Everything here is graded without the box; slice 2 is the surface and needs a drive.

| built | where |
|---|---|
| the third mode + the exhaustiveness guard | `previewScope.ts` — `{ mode: 'board' }`, `BOARD_SCOPE`, `assertNeverScope`, `showsAppPreview` / `showsBench` / `showsBoard`, `scopeChipLabel`, `scopeChipIconKind` |
| the six `!isBench` sites, closed | `VisualCanvas.tsx` (strip, design chrome, viewport read-out, webview hidden class), `PreviewChrome.tsx` (chip label + icon) |
| the board's name | `benchWords.ts` — `BOARD`, `OPEN_BOARD` |
| the board's rules | `benchBoard.ts` — read/write of `bench.board`, add / remove / move, `canAddAll`, `boardFramesPresentIn` |
| the export | `componentBench.ts` — `boardBounds`, `boardHarness`, `buildBoardExport` |
| specs | `tests-unit/tvw-008/` (58) + `tests/canvas/board-export.test.ts`, registered in `tests/canvas/index.ts` |

### 8.1 🔴 §6.5 was right, and the compiler proved it by saying nothing

Adding the variant left `tsc -p packages/noodl-editor --noEmit` at **exit 0**. Six behaviours had
changed and nothing flagged one. They are closed now behind `showsAppPreview`, which switches
exhaustively — a fourth mode is six compile errors.

⚠️ **The one that would have been seen by a person first**: `PreviewChrome`'s
`isBench ? benchTargetLabel(scope.target) : 'App'` labels the board **App** — on the single control
whose entire job is to say which of three things you are looking at.

⚠️ **`isBench` must stay `scope.mode === 'bench'` and NOT be tidied into `showsBench(scope)`.**
TypeScript narrows a union through a `const` aliasing a discriminant check, so `scope.target` type
checks inside `isBench && …`. A helper returning `boolean` throws the narrowing away and four reads
of `scope.target` stop compiling. The predicate is for callers that want only the answer; that one
wants the narrowing too. It is commented in place, because it reads like a missed cleanup.

### 8.2 🔴 The frame wrapper — BEN-001's refusal, answered rather than inherited

BEN-001 would not build a Group sized to the frame, because `sizeMode` silently voids
`width`/`height` and a wrapper that gets it wrong makes a correct component look broken inside the
tool built to tell you whether it is. The single bench sidestepped it by letting the **surface** be
the frame; a board has N frames in one document and cannot. Both failure modes are answered against
the real port definitions rather than guessed, and both are pinned by a spec:

- **`sizeMode` is NAMED** (`'explicit'`, or `'contentHeight'` when no height was authored), because
  that is the only thing that decides whether `width`/`height` are read at all (`layout.ts:60`).
- 🔴 **Sizes are `{ value, unit: 'px' }`, never a bare number.** `width`/`height` are `dimension`
  ports whose **`defaultUnit` is `'%'`** and whose default is `100`
  (`node-shared-port-definitions.ts:1183`). **A bare `768` is 768 _percent_** — a frame seven times
  its parent, which reads on screen as *the board is broken* and in the graph as correct. Verified
  against the corpus: every stored `width` in 129 projects is `{"value":N,"unit":"px"}`.
- **`layout: 'none'` on the root** is what makes the frames absolutely positioned at all
  (`layout.ts:56`), and the offsets are therefore `marginLeft`/`marginTop` from an implicit
  `left:0/top:0` (`layout.ts:120`) — **there are no `left`/`top` ports.**

✅ **A frame with no authored height takes its CONTENT's height.** §6.4 measured 3 stored frames in
5,922 components, so this is the overwhelming case; drawing every unmeasured component as a 768px
box would be the tool stating a size the component never claimed.

### 8.3 ⚠️ `tests/` is jasmine, not jest

`toHaveLength` and `toHaveProperty` do not exist there, and neither does `it.each`. The board export
spec was written in jest dialect and **`tsc -p packages/noodl-editor/tsconfig.tests.json --noEmit`
caught all twelve before a CI run did** — which is the argument for running that typecheck as a
matter of course on any new `tests/` spec. `tests-unit/` is jest and the two dialects sit two
directories apart.

### 8.4 Still to build — slice 2, and it needs the box

The picker (multi-select over `benchTargets`), the board surface itself, the drag, the editor-drawn
captions, zoom/pan, click-through to the single bench, the empty state, and the wiring of
`bench.board` through `ProjectModel.setMetaData`. AC1, AC4, AC5, AC6 and AC7 all need a drive.
🔴 **AC5 is the one that can regress quietly** — a drag that writes through dirties the project on
every pixel, and only a control on `project.json`'s mtime can see it.

## 9. Slice 2 — built 2026-09-19 (s23). The surface, and what only a drive can grade

Built with the box unavailable all session (a peer's editor held CDP 9222 and its webpack held
`:8080` from 22:38 onward; re-derived rather than inherited — `webpackconfigs/webpack.renderer.dev.js:24,38`
hardcode the port with no env override, so "start my own on another port" remains unavailable).
**No AC is closed by this session**: AC1, AC3, AC4, AC5, AC6 and AC7 all need a drive, and AC8's
`test:ci` half is still owed.

| built | where |
|---|---|
| the chooser's third row | `PreviewChrome.tsx` — above the `Workbench` heading, `OPEN_BOARD`, `data-test="preview-scope-board"` |
| the caption, picker, viewport and rebuild rules | `boardSurface.ts` (new, pure) |
| `bench.board` as the surface holds it | `useBenchBoard.ts` (new) |
| the surface | `ComponentBoard.tsx` + `.module.scss` (new) |
| the mounts both readers share | `componentBench.ts` — `boardFrameMounts` extracted out of `buildBoardExport` |
| the live move | `benchInputs.ts` — `boardFrameMoveContents` |
| the strip caption and the mount | `VisualCanvas.tsx` — `isBoard`, beside `isBench` in both places |
| the board half of the authoring barrel | `authoring/index.ts` — slice 1 exported none of it |

### 9.1 🔴 The caption strip is the handle *and* the door, and the frame's body takes no pointer

§2 asks for three gestures on one frame: click it to bench it, drag it to arrange it, and click
*inside* it to select the element under the pointer. The third is a click that has to reach the
`<webview>`. So the chrome is `pointer-events: none` everywhere except the caption.

✅ **This discharges the same worry AC2b raised on TVW-007 rather than deferring it**: the canvas
still needs no sub-region click dispatch, because the controls are on a surface that is already its
own hit target. It is s22's finding — *put the control where the gesture already is* — arriving on a
second surface, and it arrived by the same route: the alternative put a control on top of content
that another gesture already owned.

### 9.2 🔴 A drag moves the frame live and rebuilds nothing

A committed drop writes `bench.board` (AC5's subject) but does **not** rebuild the export. Positions
travel to the running client as `parameterChanged` updates on each frame Group's
`marginLeft`/`marginTop` — the mechanism an input edit already uses on the single bench, and for the
identical reason: a changed export makes the runtime call `location.reload()`, so an export rebuilt
per drop would flash the whole board, re-render every frame and throw away the scroll position
inside every component, because somebody nudged one of them 8px.

`boardExportSignature` is the single place that decides when a rebuild is genuinely owed:
**membership, and the origin — never a position.** The origin is in it because `boardHarness`
normalises through `boardBounds`, so `marginLeft` is `x - minX`; a drop that goes *past* the current
top-left extreme changes `minX` for everything, and a live update alone would then compute its offset
from an origin the document no longer has, leaving every frame that did not move silently off by the
difference. On a board laid out left to right that is the drag that goes furthest left, and nothing
else.

🔴 **Two mechanisms in this slice are argued and NOT measured, and both need the first drive:**

1. **That a `parameterChanged` on a Group's `marginLeft` moves a rendered frame at all.** The payload
   reaches the same `nodeModel.setParameter` the graph import does
   (`editormodeleventshandler.ts:211`), and the value is the `{ value, unit: 'px' }` shape the
   exported JSON carries — `boardHarness` pays for that trap in full, because a bare number is
   *percent*. But no spec can reach a running client, so "the frame moves" is a reading that fits,
   not one that has been seen.
2. **That `react-rnd` drags correctly inside the transformed document.** It is given `scale={zoom}`,
   which is how `CommentForeground.tsx:115` uses it on a zoomed canvas, and the frames sit inside a
   `translate(...) scale(...)` parent. A wrong scale does not fail — it makes the frame travel at the
   wrong rate under the cursor, which is exactly the class of defect a green arm describes rather
   than catches.

### 9.3 ⚠️ A literal NUL byte type-checked, passed, and made the file binary to `grep`

`boardExportSignature`'s separator was written as a unicode escape and reached disk as **byte 0x00**.
It compiled, all 44 specs passed, and the only thing that noticed was a mutant whose pattern would
not match. Left alone it would have made `ugrep` skip the whole module as binary — the trap already
recorded as `ugrep-silently-skips-a-source-file-as-binary`, arriving from the authoring side rather
than the searching side. It is now a named `NAME_SEPARATOR`, a newline, chosen because a legacy name
cannot contain one and very nearly can contain a comma.

✅ **Check new source for control bytes, not just for whether it compiles.** A NUL is invisible in
every view that matters and survives every gate this repo runs.

### 9.4 ⚠️ `typecheck:editor-tests` earned its place again

`BoardFrameMount` gained a required `scenario` field (carried on the mount so the caption does not
re-read `bench.scenarios` and become a second copy of a decision `boardFrameMounts` already made).
`tsc -p packages/noodl-editor --noEmit` stayed at **0** — `tests/` is not in that program — and
`tsconfig.tests.json` failed immediately on `board-export.test.ts`'s helper. Same lesson as slice 1's
§8.3, on a different error class: run it as a matter of course on anything that touches a type a
`tests/` spec constructs.

### 9.5 Gates

- `tests-unit/tvw-008` — **102 specs / 3 suites green** (44 new in `boardSurface.test.ts`).
- **12 mutants, 12 killed.** A thirteenth arm was discarded rather than counted: it added an unused
  constant and so changed no behaviour, and an arm that cannot fail grades nothing.
- ⚠️ **One of my own assertions was vacuous and was rewritten.** *"The signature does not change when
  a frame moves"* was written with the **same frames in both arms** — it compared a value with itself
  and would have passed on a signature that hashed every position, which is the one thing it exists
  to forbid. The arms now carry different coordinates.
- ⚠️ **A second assertion was wrong and the code corrected it.** `clampBoardZoom(Infinity)` was
  asserted to be the 400% ceiling; it is 1, because not-finite is not a request, and clamping junk to
  the ceiling would reopen somebody's board at 400% with no gesture behind it.
- `typecheck:editor` **0**, `typecheck:editor-tests` **0** (after 9.4).
- `test:main` **521 suites / 8,336 specs, exit 0** — was 520 / 8,292 at s22, so the delta is exactly
  the +1 suite / +44 specs this commit adds and nothing stopped loading.
- 🔴 **`test:ci` NOT run**, and `tests/canvas/board-export.test.ts` is therefore **unrun** against the
  `boardFrameMounts` extraction. The extraction moved the loop verbatim and the types agree, but that
  is an argument, not a measurement — it is the first thing to run when the box is free.

### 9.6 Still to build

- **AC4's authored fixture.** §6.4 measured **0 of 5,922** components with a `bench.scenarios[0]`, so
  the scenario branch is unreachable on real data and the caption's `scenario: <name>` arm has never
  been drawn. Still owed, still the thing most likely to be discovered mid-drive.
- **AC1's project.** No project on this machine has the six components its sentence names; it has to
  be authored or the sentence rewritten against a project that exists.
- **Selection through a frame** (§2's `selection` row) — a click inside a frame reaching TVW-003's
  store with the instance path through that frame's harness node. The chrome is already transparent
  to the pointer, so nothing blocks it, but nothing wires it either.
- **`Add all`'s bound in the UI**: `canAddAll` is consulted, but the picker does not yet say *why* the
  shortcut is absent on a project past twelve components.

## s25 — AC8 ✅

**Both clauses measured.**

1. **`test:ci` at the floor.** Seed **52534**, **3012 specs, 8 failures**, and the eight are the
   floor by name — 3 SUB-006, 3 SUB-011, 2 NDA-017. `test-results.json` mtime **16:00:59**, matching
   the run's own END, against a baseline of 2026-09-19 22:27:35
   ([[test-results-json-is-the-readout-not-the-log]]).
2. **The third mode is graded, and the `never` guard exists.** `assertNeverScope` is in
   `previewScope.ts`, and **five** switches (`showsAppPreview`, `showsBench`, `showsBoard`,
   `scopeChipLabel`, `scopeChipIconKind`) each end with it.

⚠️ **The specs are in `tests-unit/tvw-008/previewScopeModes.test.ts`, not in the
`tests/canvas/preview-scope.test.ts` §4 AC8 names** — s23's deviation, and it is the right one:
`preview-scope.test.ts` is the **jasmine** bundle, which needs a renderer, while the predicates are
pure. `preview-scope.test.ts` carries a pointer at the top so a reader of that file cannot conclude
the surface has two modes. Recorded here rather than left to be re-derived.

🔴 **The strongest arm in that file is the one that reads the SOURCE**: it counts
`switch (scope.mode)` blocks and `return assertNeverScope(scope)` guards and asserts the two numbers
are equal and ≥5. That is what makes a *sixth* switch added later a failing spec rather than a
silent sixth hole — the gate covers the rule, not just today's five call sites
([[a-gate-can-have-a-hole-shaped-like-the-defect]]).

**Also confirmed, and the handoff had flagged it as the likeliest breakage:** `board-export.test.ts`
**ran for the first time since s23's `boardFrameMounts` extraction, and is green** — all of AC2's and
AC3's describes are in the log by name. A grep for `board-export` reads zero because its describes
are all titled `TVW-008 …`; the 34 `TVW-008` spec-starts are the known-firing signal
([[assert-an-absence-with-a-known-firing-signal-beside-it]]).

**Still open: AC1, AC3–AC7** — all need the drive, whose script does not exist. AC4 additionally
needs the authored fixture §9.6 describes (0 of 5,922 components in the corpus have a scenario).

## 10. s26 — the first drive, the crash it found, and five ACs

**The board had never been run.** Slices 1 and 2 were built at s19 and s23 with the box unavailable
both times, so every mechanism below was an argument until this session. The drive
(`scripts/devtools/drive-tvw008-board.js`) and its fixture
(`scripts/devtools/tvw008-board-fixture.js`) are both new.

### 10.1 🔴 The first press of the board segment DELETED THE WHOLE PREVIEW

Opening the board on a fresh project left `[data-test="app-preview"]`, the scope chip and the board
itself **all absent from the DOM**, with the dev-stack log carrying *"An error occurred in the
`<ComponentBoard>` component"*. Six ACs were ungradable behind it, and no offline gate could see it:
102 specs, 12 killed mutants and two clean typechecks all passed over a surface that could not open.

**The cause was three lines in `useSandboxViewer.ts`, and it is a shape worth remembering:**

```ts
element.executeJavaScript(bridge.inspectScript).catch(() => {
  // Not attached or not loaded yet — dom-ready will apply it.
});
```

🔴 **The guard was on the wrong side of the call.** `WebviewTag.executeJavaScript` calls
`getWebContentsId()` **first**, and that **throws synchronously** (*"The WebView must be attached to
the DOM and the dom-ready event emitted before this method can be called"*) — so it never returns a
promise and there is nothing for a `.catch()` to attach to. The author had anticipated the exact
failure and written a handler for the one shape it does not have. The throw escaped a passive
effect, React found no error boundary over the preview, and the subtree was unmounted.

⚠️ **It reads as board-specific and is not.** Nothing in that hook knows which surface mounted it;
the board is simply the first host that mounts a sandbox whose `<webview>` is not yet attached when
the effect first runs.

✅ **Fixed, and moved so it can be graded.** The logic is now `applyInspectScript.ts` — a pure module
with no imports — because the defect was *unreachable from a spec where it lived*:
`useSandboxViewer.ts` imports `ViewerConnection` → `projectmodel` → `bugtracker`, which reads
Electron's user-data path at module scope, so ts-jest cannot load the file at all. That is the same
reason `boardSurface.ts` and `previewScope.ts` are separate modules, arriving as a *cause* rather
than a style. `tests-unit/tvw-008/sandboxInspectScript.test.ts` gives it 4 arms; **3 mutants, 3
killed**, and **M1 is the shipped defect verbatim** (`.catch()` with no `try`).

### 10.2 The fixture AC1 and AC4 both needed

§6.4 measured **0 of 5,922** components with a `bench.scenarios[0]`, so AC4's scenario branch had
never been drawn, and no project had AC1's *"three versions of a button"*.
`tvw008-board-fixture.js` writes one deterministically and **checks its own claims before
exiting** — an authored fixture that does not hold the property it was authored for is worse than
none.

🔴 **The trap it is shaped around**: a scenario value equal to what the node already draws grades
nothing. So `Primary Button`'s `label` port is **connected** to the visual root's `text`, and the
scenario says `Continue to checkout` where the node's own parameter says `Button` — two different
screenshots, not one ([[a-css-property-whose-default-equals-the-test-value]]). The three buttons
divide AC3's and AC4's cases: Primary has a scenario and no stored frame, Secondary has a stored
`320 × 180` and no scenario, Ghost has neither.

### 10.3 What the drive measured

- **AC4 🔴 — a scenario reached the screen for the first time in this phase.** The runtime drew
  `Continue to checkout`, read inside the `<webview>`, not inferred from the caption. The caption's
  `scenario: Checkout` is the editor's claim *about* the export; this is the consequence
  ([[verify-the-consequence-not-just-the-mechanism]]).
- **AC5 ✅ — a drag writes nothing until mouse-up**, on the surface §2 said the rule is load-bearing.
  `bench.board` held `816,0` across 200 intermediate moves with the button down and the frame
  visibly elsewhere, then committed `696,180` once on release.
- **§9.2's two argued mechanisms are now measured.** A `parameterChanged` on a Group's `marginLeft`
  **does** move a rendered frame (`1244,160 → 983,522` mid-drag), and `react-rnd` tracks the cursor
  correctly inside the scaled document.
- **AC3** — captions carry the authored size, the placement count and the value source, and do not
  overlap; Secondary reads `320 × 180`, Primary and Ghost `768 × auto`.
- **AC1** — empty state, three picks, three non-overlapping frames, drag, and the arrangement
  survives an App round trip.
- **AC6** — the app preview's route is unchanged (`http://localhost:8574/`) throughout.

### 10.4 🔴 Four instrument faults, and three were the same mistake

Recorded because the next drive will otherwise pay for them again. **Every one produced a FAIL
against working product, or worse, a PASS against nothing.**

1. 🔴 **`null === null` graded AC6 GREEN in a run whose subject had crashed.** With the preview
   gone, `previewBefore.src` and `previewAfter.src` were both `null` and the negative arm passed —
   the *only* green in that run. An arm whose two sides are both absent grades nothing
   ([[a-rule-reading-zero-in-both-arms-grades-nothing]]). The drive now **refuses** rather than
   producing a scorecard about an absent surface.
2. 🔴 **`[data-preview-mode]` is the SCOPE's mode, not the app's.** AC6 failed with `app→board`,
   which is the drive doing exactly what AC1 told it to. The fact that carries TVW-002's negative
   arm is the app window's **URL** ([[a-client-property-read-as-a-fact-about-the-source]]).
3. 🔴 **`project.json`'s mtime ATTRIBUTES NOTHING.** AC5 failed run 2 on an mtime that moved
   mid-drag — and the drag had written nothing. This editor saves that file for its own reasons
   (`projectmodel.ts:1760` logged *"Project saved"* twice during the open). The producer FIX-011's
   rule is about is `setMetaData('bench.board', …)`, so the subject is the **stored coordinate**
   ([[a-url-filtered-capture-attributes-nothing-to-a-producer]]). Re-armed that way, AC5 is green
   and the mtime is kept as an observation, not an arm.
4. 🔴 **A screen rect cannot tell "the frame moved" from "the camera moved".** AC1's round trip
   failed on `984,520 → 1124,340` while `bench.board` held the identical `696,180` on both sides:
   the board's **viewport** resets to `DEFAULT_BOARD_VIEWPORT` on remount, shifting every frame
   together. Zoom and pan are session state and that reset is correct; the arm was wrong
   ([[a-control-pair-proves-what-you-varied-only]]). Now graded on the stored coordinate **and** the
   offset from the other frames.

⚠️ **Two hangs, both the same root: no CDP call in this repo's harness has a timeout.**
`connect()` resolves on socket open and never rejects, and `evaluate` on a target destroyed by a
reload never settles — a benched component reloads the `<webview>`, so a viewer client reused
across that boundary hangs forever. The first run sat **ten minutes** with no output. Every viewer
read now attaches fresh and is raced against a deadline. ⚠️ And `BOOT` must be **retried**:
`webpackChunknoodl_editor` does not exist until the bundle has evaluated, so a drive starting soon
after a renderer reload dies forty lines later with *"window.__wreq is not a function"*.

### 10.5 🔴 AC4's second clause found a real disagreement — RULED 2026-09-20

The drive's last failing arm was the honest one, and it survived the instrument review:

| surface | same component, same project | drew |
|---|---|---|
| the **board** | opens on `bench.scenarios[0]` | `Continue to checkout` |
| the **single bench** | opens on `None` | `Button` — the node's own parameter |

✅ **The rendering never disagreed.** Picking `Checkout` in the bench's scenario bar made it draw
`Continue to checkout`, byte for byte what the board drew. What differed was the **default**, and
AC4 asks the two surfaces to say the same thing about one component.

**Richard ruled: the bench opens on the first scenario too** — *"if you saved a scenario, that's
what you meant the component to look like."*

🔴 **Built, measured, and REVERTED in the same session — and the measurement is the useful part.**
Auto-selecting `scenarios[0]` on mount worked as far as the editor could see: the chip read
`Checkout` and the inputs rail read `label = Continue to checkout`. **The runtime went on drawing
`Button`.** `applyValueSet` delivers through `sendModelUpdateToClient` — a **targeted delta** — and
at mount the sandbox client has not connected, so the update is dropped. Manual selection works
only because by then the client is up. It is the trap `useSandboxViewer`'s `remountKey` note
already records: *"a bench input set through a targeted `modelUpdate` never entered the export."*

⚠️ **Reverted rather than shipped, because the half-state is WORSE than the old behaviour by this
phase's own standard.** Before, the bench said `None` and drew the node's own values — honest. With
the auto-select in, it *claimed* a scenario it was not rendering, which is the exact defect TVW-001
and TVW-002 exist to remove ([[verify-the-consequence-not-just-the-mechanism]]).

✅ **The fix is known and named: put the opening scenario in the EXPORT, not in a delta.** That is
what the board already does — `boardFrameMounts` writes `bench.scenarios[0]` into each harness
node's `parameters`, which is exactly why the board renders the scenario from its first paint and
the bench does not. `buildBenchExport` needs the same treatment **for the opening scenario only**:
every later switch must stay a delta, or changing scenario would rebuild the export and reload the
window. ⚠️ `autoSelectedFor`-style bookkeeping is still needed alongside it — `None` sets
`activeScenario` back to `undefined`, so *"never chose"* and *"chose None"* are the same value.

🔴 **Three drives were spent before this was diagnosed, and two of them were wasted on the
BUNDLE, not the code.** `packages/noodl-editor/src/editor/index.bundle.js` on disk is from
**Sep 10** — the dev server serves webpack's in-memory bundle over `http://localhost:8080`, so a
grep of the on-disk file "proves" a change is absent when it is live
([[measure-the-artefact-before-believing-the-task-file]]). The reliable gate is
`curl -s http://localhost:8080/src/editor/index.bundle.js | grep -q '<a string from your change>'`,
and the reliable in-renderer check is `window.__wreq('<module path>')`.

### 10.6 ⚠️ The editor has TWO `<webview>`s and `appTarget('viewer')` picks whichever matches first

Listed live while the board was up:

```
webview  Button Gallery   http://localhost:8574/                        ← the APP preview
webview  Noodl Viewer     http://localhost:8574/?noodl-sandbox=<id>&…   ← the bench AND the board
page     NodeGX           file:///…/noodl-editor/src/editor/index.html
```

🔴 **The drive read the right one twice by luck.** A follow-up probe asking the identical question
got the app's own page back — `Continue | Save draft | Button` — and would have failed AC4 against
a window that was never its subject. The drive now selects the sandbox **by its URL** and reports
its absence rather than reading an empty result as "the bench drew nothing"
([[cdp-attaches-to-whoever-holds-9222]], one level in: the port was right and the *window* was not).

### 10.7 Where TVW-008 stands

| AC | state |
|---|---|
| AC1 | ✅ driven — empty state, three picks, no overlap, drag, App round trip, frame benched |
| AC2 | ✅ offline (`board-export.test.ts`) + the `Add all` bound seen on the surface |
| AC3 | ✅ driven — authored sizes, placement counts, no caption overlap |
| AC4 | 🟡 **first clause ✅ driven** — the scenario reaches the screen on the board. **Second clause OPEN**: the bench renders the same values only once the scenario is picked, and RULED-BUT-UNBUILT for the opening default (§10.5 names the fix) |
| AC5 | ✅ driven — 200 moves write nothing, the release commits once |
| AC6 | ✅ driven — the app preview's route is unchanged throughout |
| AC7 | 🟡 **FOUR shots taken** (`verdicts/tvw-008/`). **The theme pair is still owed** — see §10.9 |
| AC8 | ✅ s25 |

**Still open:** AC7's verdict, and two §9.6 items that no AC names — selection through a frame, and
the `Add all` bound explained in the picker rather than merely enforced.

### 10.8 Gates at s26

- `tests-unit/tvw-008` **106 specs / 4 suites** (was 102 — `sandboxInspectScript.test.ts` adds 4).
- `tests-unit/tvw-007` **103 specs / 6 suites** (was 95 — the ⌘[ ruling adds 8).
- **6 mutants across the two new arm sets, 6 killed** — including the shipped `.catch()` defect.
- `typecheck:editor` **0**, `typecheck:editor-tests` **0**.
- **`test:main` 522 suites / 8362 specs, exit 0** — was 521 / 8350, so the delta is exactly the
  +1 suite and +12 specs this session adds and nothing stopped loading.
- 🔴 **`test:ci` NOT re-run.** It was at the floor at s25 and nothing here touches a jasmine path,
  but that is an argument, not a measurement.

### 10.9 🔴 The AC7 theme arm recorded `true` with no predicate in it, and the shots proved it

`ac7-05-board-light.png` and `ac7-06-board-dark.png` came out with the **same md5**. The theme had
never changed: the `Theme.setTheme` call was swallowed by a `.catch()` and the arm said *"both
themes photographed"* regardless, because it was written as `record(..., true, ...)`.

**An arm with no predicate in it grades nothing** — the identical fault as AC6's `null === null`
two sections above, on a different surface, in the same run
([[a-rule-reading-zero-in-both-arms-grades-nothing]]). It is worth naming twice because the two do
not look alike while you are writing them: one is a comparison whose sides are both absent, the
other is a literal. They fail the same way.

✅ **Fixed in the drive**: the theme is now **read back** after being set, the arm is the comparison
of the two readings **and** of the two files' hashes, and the fallback writes `data-theme` on
`documentElement` directly when the module's API is not reachable. The two misleading files were
**deleted** — a shot that is not of what it claims is worse than no shot.

⚠️ **So AC7 is FOUR shots, not six**, and the theme pair is owed by the next drive. The four that
stand are the empty board, the three-frame board before and after a rearrange, and one frame
benched.
