# NSP-019 — Richard reads it: the inspector shows a node's rules, and *Try this node*

**Opened 2026-09-29.** **Depends on NSP-018.**
**Status: 🟡 s94 (2026-10-12): the R33 modal is BUILT and driven (§5.5) — *How this node works* under the node's name, the rules and *Try it* in a pop-out. AC3 waits on Richard's drive of it. (s91: "Needs changes", R30/R31, §5.3; s93: the mockup, R33 "Build it like this", §5.4; AC1/AC2 and the disagreements table s77.)**

## 1. The person sentence

> **Someone looking at a node on the canvas can read, in plain words, exactly what it will do —
> and try it on its own, with values they type, without building a test page.**

## 2. What to build

- **The rules** (NSP-018's generated list) in the property panel for a specced node, folded under
  a *What this node does* heading.
- **Try this node:** a small panel that runs the node's spec in the interpreter (NSP-001) — set
  its inputs, press its signals, and watch its outputs and outcomes as a readable trace. It runs
  the **spec**, not the project, so it works on a node with nothing wired to it.
- For a node whose spec and runtime ever disagreed (a §6 row anywhere in the phase), the panel
  says so, with the ruling.

## 3. Acceptance criteria

1. The rules show for every specced node and are absent (not empty) for an unspecced one.
2. *Try this node* on Counter reproduces the pilot's hand scenarios step by step (drive).
3. Richard drives it and his verdict is recorded here in his words.

## 4. Watch for

- Memory: *correct and usable were never the same criterion.* A trace is correct; a person may
  still not understand it. Show it as a timeline of plain events, not JSON.
- Memory: *a `Select` inside a `Modal` closes it*, and the editor has two `BaseDialog`s — use the
  panel patterns the inspector (phase 101) already uses.

## 5. Built

### 5.1 s77, 2026-10-10 — the rules under the rows, and *Try this node* on the interpreter

**AC1 ✅ — "What this node does".** Under a node's property rows, in the Properties tab, a folded `<details>` section lists
its rules per input port, by display name, one line per said branch, the case and the structure after the arrow drawn as two
halves. The words are NSP-018's `rules: { [inputPort]: string[] }` on the node's entry in `node-catalog.json`, read through
the editor's one bundled copy — `validation/catalog.ts` `projectCatalog()` (the kits merged in), never a second catalog —
by `spec/nodeRules.ts` `rulesFor(typeName)` (`packages/noodl-editor/src/editor/src/views/panels/propertyeditor/spec/nodeRules.ts:34`).
Absent, not empty: a type with no `rules`, or one the catalog does not know, answers `undefined` and `SpecSections` returns
`null` — no section at all (`spec/SpecSections.tsx:36`). The fold remembers open / closed across nodes in module scope, as
`rememberedTab` does for the tab strip; the rules open by default. Mounted from `propertyeditor/index.tsx:207-212`: the
`ScrollArea`'s container is a flex ROW, so the legacy `Frame` and the sections are stacked in a column of their own, the
`Frame` unkeyed (it must stay put), the sections keyed by node.

**AC2 ✅ built, 🟡 Richard's drive owed — "Try this node".** A second fold beneath the rules (`spec/TryNodePanel.tsx`): one
field per declared value input (number, checkbox, enum `<select>`, text — JSON when it parses), one button per signal input,
a *Move time* field in ms, a *Same frame* switch (actions queue until *End the frame*; off, every action is its own frame)
and *Start over*. It runs the node's SPEC in the interpreter — `run(spec, params, steps)` from `@nodegx/node-spec`, replayed
from a fresh mount on every change, so the steps are the whole state (`spec/tryNodeModel.ts:234` `playTimeline`) — never
the project, so an unwired node tries. The canvas node's parameters seed the mount (`startParamsFor`, kept to the spec's
value inputs), so a Counter with Start Value 5 starts where the pilot's first scenario does. The trace is read as a
**timeline of plain events**, not JSON: `Start Value starts at 5` · `You press Increase Count` · a rule where the frame ends
· `Current Count → 6` · `Count Changed fires` · `Increase Count: done` · `Reset To Start: unchanged — nothing to do` ·
`nothing happens` for a frame nothing came out of; a spec error is drawn last, with the steps that ran before it. A number
field keeps text that is not a number AS TEXT, so the coercion scenario (`"abc"` on Max Value) can be typed.
**Step by step:** `tests-unit/nsp-019/tryNode.test.tsx` hands each of the seven hand scenarios in
`packages/nodegx-node-spec/scenarios/Counter.json` (the pilot's files, not a restatement) to `playTimeline` as the panel
would, and reads the first — seed pulse, one-frame pair, reset done, reset unchanged — line by line in English against the
trace `tests/counter.test.ts` pins (24 lines, 5 frames, 5 presses). Not offered: derived ports (`derived.inputs(params)` —
String Format's placeholders, And's numbered inputs) and the person's acts; the panel says what it runs.
**The spec package in the editor.** `@nodegx/node-spec`'s `main` and `types` point at a gitignored `dist/`, so it is mapped
by SOURCE to `src/browser.ts` (no `fs`) in four places, as `@nodegx/export` is: `packages/noodl-editor/tsconfig.json`
`paths`, the root `tsconfig.json` `paths`, `jest.config.js` `moduleNameMapper`, and `webpackconfigs/shared/webpack.shared.js`
`alias`. The editor's `tsc` (non-strict, ES2019 lib) compiles the package's `src/` clean. The model module is the one that
pulls every spec and the interpreter in (~890 KB of source; `size:node-spec` is P112's budget and the package is untouched),
so `TryNodePanel` loads it with a dynamic `import()` on the fold's first opening and the rules section never names it —
the Properties tab pays nothing on an ordinary selection. The editor has no spec marker but `rules` (a specced node whose
reducers have no `says` yet has none), so **the Try fold is offered on the same test as the rules** — 69 of 180 catalog
types today, growing with NSP-018 §6 item 1.

**§3 ✅ — where the spec and the runtime disagreed, the panel says so.** The rows are the bug ledger's: every
`dev-docs/bugs/p107-*.md` with `kit: node-spec` whose `regression:` names a scenario file — `scenarios/<type>.json`, and
`<type>` IS the catalog typeName (`scenario-files.ts` names a file after `spec.type`, the registry is keyed by typeName).
The editor cannot read `dev-docs/` at run time, so `packages/noodl-editor/scripts/spec-disagreements.js` writes them as a
committed snapshot, `spec/specDisagreements.json` — **161 rows over 60 types** (id, title, status, commit, the ruling
paragraph's head under 220 characters), 18 rows left out and named on stderr because they have no single node (graph
scenarios, rows pinned by a test elsewhere, three with no regression) — and its `--check` exits 1 when the ledger has moved.
That check runs inside `tryNode.test.tsx`, so a stale snapshot is a red row, not a quiet drift (memory: a second copy of a
palette drifts silently). The Try panel's header reads *The spec and the running node disagreed 3 times (2 fixed, 1 open)*
with each row and its ruling (`TryNodePanel.tsx:93-111`). Counter has no row; the test's known-firing control is the first
type that does.

**Gates.** `npx jest -w 1 tests-unit/nsp-019`: 2 suites, **32 / 32, exit 0** (7.4 s cold, 3.5 s warm) — the rules
(`nodeRules.test.tsx`, 10: the decision over the real catalog with the absent arm's subject FOUND, a placeable type with no
`rules`, not named; `NodeRulesSection` as an element tree; `SpecSections` through `react-dom/server` on both arms, `''` for
the absent one) and the try (`tryNode.test.tsx`, 22). One red on the first run was mine — `showValue` did not cap a long
string — fixed, re-run. `npx tsc -p packages/noodl-editor --noEmit`: **exit 0, 0 errors** (13 s). `scripts/css-token-check.js`:
every `var(--…)` defined (two fallbacks removed before it ran: a fallback is POL-004's smell). Prettier on the new files.
`tests-unit/chr-007` — the one sibling suite that imports under `propertyeditor/` — still RUNS (23 tests, memory: an import
added for a feature can switch a sibling gate off); its one red is at `HEAD` and not this work: see below. **Not run:** the
editor app (another lane holds the CDP port; AC3 is the coordinator's drive), the editor's webpack (the alias is the
exporter's mechanism; the Try fold is the first dynamic chunk under `propertyeditor/`), the full `test:main`.

🔴 **Found beside it, at `HEAD`: `tests-unit/chr-007/widgetDispatch.test.ts` "gives every catalog port the class it had before
the refactor" is red** — Page Stack's `keepPagesWhenUnmounted: BooleanType` is in the catalog (`c22c9aceb`, P109 ISL-048) and
not in the suite's recorded snapshot. The catalog is clean in the working tree, so it is a committed drift, not a peer's open
edit. Filed as [P107-S77-CHR007SNAPSHOT](../../bugs/p107-s77-chr007snapshot-page-stack-s-keep-pages-row-is-not-in-the-widget-snapshot.md).

**Rulings owed.** (1) The Try fold is gated on `rules`, not on "has a spec" — right until a spec marker exists in the catalog
(or the 206 unworded reducers get their words). (2) `spec-disagreements.js` lives in the editor's own `scripts/` (the root
`scripts/node-spec/` is another lane's); if the table should be regenerated by `catalog:generate` instead, that is a move,
not a rewrite. (3) The rules open by default and the Try fold closed — Richard's drive decides.

**Left.** AC3 — Richard drives it and his verdict is recorded here in his words. Derived ports and acts in the Try panel.

### 5.2 s77 (later the same day) — driven in the real app, and the defect `tsc` and jest could not see

`npm run dev:debug`, a renamed copy of `nodegx-debug-demo` registered with the launcher, its Counter selected through
`__nodeGraphEditor.selectNode`. **The first build's log carried two warnings the tests and `tsc` had passed:** `export
'disagreementsFor' … was not found in './specDisagreements' (possible exports: And, Boolean To String, …)`. The editor's
webpack `resolve.extensions` lists `.json` before `.ts`, so the bare import `./specDisagreements` resolved to the snapshot
JSON beside the module, and the Try panel's two helpers were missing from the bundle — `tsc` and ts-jest resolve the
same name to the `.ts` file. Fixed by renaming the snapshot `spec-disagreements.json` (a basename no module shares);
generator, module and test updated; the rebuild has no warning after its last compile. After that: the fold reads
"What this node does · 8 rules" with Counter's lines under each input, the Try fold shows the three value inputs, Limits
Enabled, the three signals, the clock and Start over; two trusted clicks on Increase Count wrote "You press Increase
Count — Current Count → 1, Count Changed fires, Increase Count: done", then the second press. Screenshot read. Stack
stopped with `dev:stop`, the launcher entry removed afterwards, the directory set identical to the backup. Lesson for the
hazard list: **a bundler alias or extension order that `tsc` accepts can still fail to bundle — look at the running app's
build log before calling a panel built** ([[a-working-wireframe-is-not-the-mockup]]).

### 5.3 s91, 2026-10-12 — Richard drove it: "Needs changes" (R30, R31)

Driven by Richard in the running dev editor (`npm run dev:debug`, a renamed copy of `nodegx-debug-demo` registered with
the launcher, removed afterwards; the source's SHA unchanged). He selected the Counter, read the rules, opened *Try this
node* and pressed its signals. Answered on the s91 rulings page. **His verdict, verbatim:**

> *"The two panels are quite tight, and the 'try the node' bit is a bit basic (would be nice with a bit more styled
> elements no??). When you click a button the 'what happened' list doesn't focus so you have to scroll down. I'm thinking
> maybe this would be better in a pop out modal? That way you can really focus on the node and what it does. You don't
> need to see the rest of the editor for that. Maybe a mockup version of the node with the data preview above it like on
> the canvas? That would look cool. With the inputs lighting up and input output data bubbles changing as you play"*

**On the open state (R31):** rules open, Try closed, as now — and *"If we do my modal idea, you can have the 'how this node
works' button at the top of the panel even, like a help popup, and we don't need to worry about it and leave both open in
the modal"*. **On the five specced nodes with no words** (And, Or, Query Records, Page Inputs, Screen Resolution):
*"Just don't show the button, or write 'spec in progress' or something"* — never an empty Try panel.

**What that asks for (the next build, a design pass first):**
1. A **"How this node works" button** at the top of the property panel for a specced node, opening a pop-out modal. The
   two folds leave the panel. Use the inspector's existing modal patterns (memory: a `Select` inside a `Modal` closes it;
   the editor has two `BaseDialog`s).
2. In the modal, both parts open: the rules, and *Try* with **a mock of the node as the canvas draws it** (its card, its
   ports), the **data preview above it as on the canvas**, inputs that **light up** when they change, and **data bubbles**
   on inputs and outputs that update as you play.
3. The timeline **follows the latest event** (scrolls to it): today a press writes below the fold and nothing moves.
4. More styled controls than the plain inputs today, from the editor's own tokens.
5. A node with a spec whose Try cannot draw its inputs yet (or no words) shows "spec in progress", or no button at all.

Memory: [[a-working-wireframe-is-not-the-mockup]] — show Richard a mockup of the modal before building it.

**Seen during the drive (not his ruling):** in the dev stack, *Try this node* sat on "Loading the spec…" for about two
minutes. The editor's webpack had begun a recompile right after launch ("App updated. Recompiling…"), and
`webpack-dev-middleware` held the lazy chunk (`…spec_tryNodeModel_ts.bundle.js`) until it finished (99 s). The chunk then
served 200. The panel shows no timeout or error while it waits. Dev-only (a packaged build has no dev server), but a
spinner that never says why is worth a line in the modal's loading state.

### 5.4 s93, 2026-10-12 — the modal as a mockup, for Richard's look (not built)

A canvas of two artboards, private to Richard: https://claude.ai/artifact/CmkJLfJu7NGhzsquJgoDHS. Answers §5.3's five points
on the Counter, the node he tried:

1. **The button** sits at the top of the property panel, under the node's name: *How this node works* (artboard 2). A node
   whose spec has no words (the five) shows a dashed *How it works: spec in progress* in its place instead (R31's second
   choice; the first, no button at all, is one line to change).
2. **The modal**, 1,200 × 788 over the dimmed editor: the rules on the left (each input with its cases and the outcome as a
   chip, Done or Unchanged, in the spec's own words), *Try it* on the right. Both open (R31).
3. **The node as the canvas draws it**, on the canvas's dotted ground: its card (icon, title, type), inputs left and outputs
   right with their dots, a value bubble on each port, and the canvas's dark preview pill above it showing Current Count.
   A press lights the input it reached, the outputs it moved, and the preview for about a second; a signal's bubble reads
   *sent* or *fired* while lit.
4. **Styled controls** from the editor's tokens: the signals as 44-px blue pill buttons, numbers as − / + steppers, Limits
   Enabled as a switch. No clock or *Same frame* for the Counter (it has no timer); a node with one would show them here.
5. **What happened follows the latest event**: newest at the bottom, scrolled into view and tinted on arrival, its outcome as
   a chip. *Start over* clears it.

The artboard works (press the buttons on the canvas's Play). It plays a hand-written copy of the Counter's rules, not the
interpreter: the built modal runs `tryNodeModel` as the panel does today. Not yet asked: the modal's loading state
(§5.3's two-minute "Loading the spec…" in the dev stack).

### 5.5 s94, 2026-10-12 — the modal, built as drawn (R33) and driven

**Built** (commit `feat(p107/nsp-019 s94)`), all under `views/panels/propertyeditor/spec/`; the two folds (`SpecSections`,
`NodeRulesSection`, `TryNodePanel`, `TryTimeline`) are gone:

- **The entry** — `HowItWorksButton`, mounted under `NodeLabel` (`propertyeditor/index.tsx`), above the tab strip, so it shows
  on every tab. Three arms: the catalog has `rules` → *How this node works*; the type has a spec and no words →
  a dashed *How it works: spec in progress* (R31's second choice); anything else → nothing (AC1's absent arm). The five are a
  committed list (`spec-in-progress.json`: And, DbCollection2, Or, PageInputs, Screen Resolution), and
  `tests-unit/nsp-019/nodeRules.test.tsx` recomputes it from the spec registry (108 specs, 103 worded) and goes red when it moves
  (planted control: one name dropped → red).
- **The shell** — `HowItWorksModal`: the editor's `BaseDialog` with its backdrop (the pattern `Modal` uses). Focus moves into the
  modal on open and its root is a `data-keyboard-scope`, so `keyboardhandler.ts` runs no canvas command behind it (Backspace or
  Delete would otherwise delete the selected node); Escape closes; a press outside closes.
- **Left: the rules** — `NodeRulesColumn`. `ruleParts` takes a catalog line apart without changing a word (the case; the pulses as
  "Sends …"; the outcome as a chip — Done, Unchanged, Failure, Completed; the "stays silent" tail); a test puts every one of the
  catalog's 400+ lines back together from its parts. The spec/runtime disagreements and their rulings sit at the foot.
- **Right: *Try it*** — `TryIt`, `TryStage`, `TryRows`, over a new `playTry` in `tryNodeModel.ts` (the same trace as
  `playTimeline`, read as rows, each input's value, each output's last sent value, and the ports the last row reached). The node is
  drawn as the canvas draws it: a white card with its title, inputs left and outputs right with their dots (square for a signal),
  a bubble per value port, a signal's bubble only while lit (*sent* / *fired*), the dark preview pill above with the first value
  output. What a step reached lights for about a second. Controls: signal pills, − / + steppers with a typeable middle (so `"abc"`
  can still be tried), a switch per boolean, a native `<select>` per enum; *Move time* and *Same frame* only for a spec whose
  `needs` has `clock` (24 of 108: Delay, HTTP, the visual nodes…). *What happened* is one row per thing done (one frame's presses
  share a row), the outcome as a chip, the newest tinted and scrolled into view; a row whose only answer is an outcome reads
  "nothing moves". The steps start with one frame end, so row 1 says what the node does at load. After 4 s of loading, the column
  says why it waits (§5.3's dev-server hold).

**Driven** (`npm run dev:debug`, a renamed copy of nodegx-debug-demo registered with the launcher and removed afterwards; the
source's SHA unchanged; 28 MCP server processes alive after teardown). The Counter's panel shows the button under its name
([shot](shots/nsp-019-s94-panel-button.png)); the modal opened with the spec loaded in 1–3 s. Eight real clicks — Increase ×2,
Reset ×2, Limits Enabled, Max Value +, Increase ×2 — wrote exactly eight rows: `Current Count → 1`, `→ 2`, Reset `→ 0` Done,
Reset *nothing moves* Unchanged, *Limits Enabled on* and *Max Value 1* (each *nothing happens*), Increase `→ 1` Done, Increase
*nothing moves* Unchanged; the row list sat at its bottom (`scrollTop` 165 of 165) and the dialog never scrolled. Beside the
mockup: [built](shots/nsp-019-s94-modal-built.png) · [mockup](shots/nsp-019-s94-modal-mockup.png).

**Where it differs from the mockup, on purpose:** the rules are the catalog's (Counter has four worded inputs; the mockup's hand
copy also had Min/Max and Count Changed groups); the steppers carry the full port name (no generic way to shorten one); the
backdrop is the editor's own (a white wash in the light theme, where the mockup drew a dark dim); the card's colours are the
canvas card's, not the node picker's category scheme (grey for most logic nodes).

**Found while driving:** the dev server ran out of heap on its second or third rebuild, twice, and took the stack with it →
[P107-S94-DEVHEAP](../../bugs/p107-s94-devheap-the-editor-dev-server-runs-out-of-heap-on-its-second-or-third-rebuild.md).
An earlier "7 rows for 6 presses" happened while the dialog itself was scrolling under the click (the Try column overflowed);
after `.Modal` clipped and the column scrolled on its own, every count matched.

**Not driven:** the dark theme; a spec-in-progress node in the panel (graded by react-dom/server only); a clock node's controls in
the app (graded with Delay, type `Timer`, by react-dom/server).

**Left: AC3** — Richard drives the modal and his verdict is recorded here in his words.
