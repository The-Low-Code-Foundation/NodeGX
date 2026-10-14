# NSP-019 — Richard reads it: the inspector shows a node's rules, and *Try this node*

**Opened 2026-09-29.** **Depends on NSP-018.**
**Status: ✅ s95 (2026-10-12): AC3 met — Richard drove the modal, found that nothing said his settings were wrong (R35, §5.6), the warning was built and he signed it off in the running editor: "Yes, that's it" (§5.7). (s94: the R33 modal built, §5.5; s93: the mockup, §5.4; s91: "Needs changes", §5.3; AC1/AC2 s77.)**

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

### 5.6 s95, 2026-10-12 — Richard drove the modal: "It's cool, but…" — the settings that make no sense said nothing

Driven by Richard in the running dev editor (`npm run dev:debug`, a renamed copy of nodegx-debug-demo registered with the
launcher and removed afterwards; the source's SHA `fa5f5a42…` unchanged). He opened the Counter's *How this node works*, set
Start 2, Min 3, Max 1 with Limits Enabled off, and pressed Increase twice. **His verdict, verbatim:**

> *"It's cool, but I'm fucking with it and that infamous auto checking system doesn't seem to be doing shit. I should be able
> to see that because I've fucked the settings, there's going to be errors. The min value is higher than the start value.
> The max value is 1. Yet I can still click Increase Count and it all works fine. This is a test of 'what's the point in
> using this instead of just vibe coding', you said it would include automated checks and tests so there's no way to fuck it
> up. I just managed to fuck it up first try"*

Asked whether to build a separate "settings that don't make sense" check, he answered: *"No, the how it works modal should
function using the specs, like a real node really wired up, and so if something is set wrong it'll of course be able to
throw an error in the 'what happened' and show why the settings are FUBAR. Or do the specs not actually protect against
stuff like that the way they were advertised to?"*

**The answer, measured:** they did not. The modal was faithful: it runs the spec, and the spec copied a runtime Counter that
said nothing. The runtime had the channel (`setDiagnostic`, DIAGNOSTICS-CONTRACT.md, whose table already says "two of this
node's settings contradict each other → diagnostic") and the Counter never used it; the spec format could not declare one
(Date Add's spec: "not on the wire, so not in the trace"); the conformance harness had no editor, so no diagnostic reached a
trace. → [P107-S95-MINABOVEMAX](../../bugs/p107-s95-minabovemax-a-counter-with-min-above-max-says-nothing-anywhere.md).
With his settings and Limits Enabled ON, both Increase and Decrease report Unchanged for good, silently.

**Built (s95, `0d81cd398`):**
- **The format:** `diagnostics` on a spec (`<node-type>/<condition>` → `{ says, message(inputs, state) }`) and a `diagnostic`
  trace event (`key`, `message` absent when withdrawn; one per key whose sentence changed, sorted by key, closing the frame's
  group). Schema, validator, `hasObservation`. The interpreter records them at each settle.
- **The runner:** `TargetAdapter.diagnostics` — `true` on the interpreter and the runtime; a target without it (the export,
  the four strangers) is graded with diagnostics left out of its reference (`withoutUnseenDiagnostics`, also in the
  strangers' mutant check, which would otherwise have "caught" every Counter mutant for nothing).
- **The runtime target:** a recording editor (`isRunningLocally` true, `sendWarning` / `clearWarning` / `clearWarnings`); for
  a spec that declares `diagnostics` it records every key the node shows that is its own (not `node/…`), declared or not.
- **Counter v2** (changes entry, migration none): `counter/min-above-max` from both limit setters, the same sentence in the
  runtime and the spec — *"Min Value 3 is above Max Value 1. With Limits Enabled on, the count gets stuck."* An eighth hand
  scenario plays Richard's settings and the fix.
- **The modal:** the warning sits above the card while it holds, the card wears a danger ring, the row that raised it reads
  the sentence chipped *Warning*, the row that cleared it *No longer: Min Value is above Max Value*, chipped *Fixed*.

**Not built:** the rules column does not list a node's diagnostics (it reads the generated catalog; a regen of a shared file);
no other node declares one yet (9 runtime call sites already raise one); the Problems panel and the agent's checker do not
read `diagnostics` statically — the panel shows the runtime's warning only while the preview runs.

### 5.7 s95 (later the same day) — the warning, driven in the editor and signed off

A second launch on a fresh renamed copy (unregistered afterwards; source SHA unchanged; 26 processes stopped). The Counter
selected, *How this node works* opened, Start Value +2, Min Value +3, Max Value +1, Limits Enabled on, Increase pressed, each a
real button in the visible dialog. On screen ([shot](shots/nsp-019-s95-warning.png)): the red line above the card, *"Min Value 3
is above Max Value 1. With Limits Enabled on, the count gets stuck."*, the card's danger ring, row 7 *Max Value 1* with the
sentence and its *Warning* chip, row 9 *Increase Count — nothing moves — Unchanged*.

Asked in plain words whether this is what he meant: **"Yes, that's it."** AC3 is met.

**Seen, not measured:** at the 1368 × 784 window the banner pushes the newest rows below the dialog's bottom edge (row 7 was
the last one visible; rows 8 and 9 were in the list below it). Whether the Try column scrolls them into view on its own was
not read. And Current Count read 1 beside Start Value 2: the Counter's real rule (only the first Start Value seeds the count;
stepping 0 → 1 → 2 made 1 the first), said to Richard in one line.

**Trap met again:** the first attempt clicked the dialog's hidden measuring copy (two `[role=dialog]` in the DOM; memory
"`cdp click` HITS GHOST in Modal"). Pick the dialog that `elementFromPoint` lands in.


### 5.8 s105, 2026-10-14 — R38 and R40: where a node sits, and its warnings read before the app runs

**R38, built on 9 specs.** The format gained one fact of the graph beside `wired`: how the node's parent stacks it. A scenario
says `parent: 'row' | 'column'` (a column when it says nothing, which is what every target's holder already was, so every
earlier trace is unchanged), the runtime target's holder lays out that way, and a spec reads it as `WorldView.parent()`.
Probed on the runtime first: Group, Text, Image, Video, Button, Text Input, Dropdown, Slider and Radio Button Group warn when
the size along the parent's axis is wired and a percent. The Checkbox and Radio Button were in the plan's 11 and never warn:
their Width and Height are the box's, in px, vw or vh (checkbox.ts :114-141). `src/nodes/wired-grow.ts` is the one model the
nine share: what a size port holds (node.ts :446-458 merges a bare number into the unit it holds), what reaches the style
(react-component-node.ts :706-753), and the rule (layout.ts `Layout.size` :138-156, `reportMainAxisGrow`). The runtime says
it in the node's render and remembers it, so a node off the page keeps its sentence. The spec keeps it in `grow`, written at
every paint. Writing it only on the page split each frame-end branch in two, and the twins survived as swap mutants. The
Slider's Width has no Fixed mark (slider.ts :145-157); conformance found that. Each spec has a version bump and 10 hand
scenarios per axis it has (warn; a bare number in the held unit; px clears; Fixed clears; the other axis; not wired; off the
page and back; Absolute; refused and empty values; Size Mode).

**R40, built.** A diagnostic names the inputs its sentence follows from (`settings: ['limitsMin', 'limitsMax']`), on six
keys: Counter, Date Add, Date Difference, the Slider's Max, For Each's Script and input mapping. `tests/settings-diagnostics.test.ts`
holds the mark to it: over every hand scenario and 200 sequences of each, the sentence moves only in a frame that writes one
of the named inputs (two controls: the Slider's Focus warning marked in a copy goes red, and a Counter mark naming only Min
Value). `settingsDiagnostics(spec, params, wired)` reads them; a wire or an expression on a named input skips that sentence
only. The validator's `settings-diagnostic` rule takes the reading as a callback (`ValidatorOptions.settingsDiagnostics`, as
`drawnPorts`: the rules index must not import `@nodegx/node-spec`), passed by the Problems panel and by the MCP's three
validator calls. A warning: no write is refused. **Measured before shipping**, over 285 of Richard's projects (2,228 nodes of
the five types): 3,876 readings, 113 skipped for a wire into a named input, **0 warnings**. A Counter and a For Each from those
projects, planted with Min 10 / Max 2 and a Script that does not compile, both fire. The first version skipped any node with
any wired value input and read 423 of 2,228; a For Each's Items is almost always wired.

**Driven (s105), the rules column and R40.** The editor on a renamed copy of the *Poke it* lesson (in the scratchpad; the
source unchanged by `git status`; unregistered afterwards; 26 processes stopped), with a Counter (Min 10, Max 2, Limits on), a
Slider (Min 50, Max 10) and a For Each whose Script does not compile, added to its Home page. *How this node works* on each,
visibility read with `elementFromPoint` on the dialog that is not the measuring copy:
- the Counter: *It warns you when — Min Value is above Max Value*, under the ports, seen without scrolling
  ([shot](shots/nsp-019-s105-counter-warns-you-when.png));
- the Slider: four lines, the new one *"A wired Width in a row, or a wired Height in a column, is a percent, so it shares out
  the space instead of setting a size"* among them, and Width's rule *"the size it holds now, a bare number read in the unit it
  held"*. The section is below the fold of the rules column: seen once the column is scrolled to it
  ([shot](shots/nsp-019-s105-slider-warns-you-when.png));
- the Repeater: the heading and its first six of ten lines seen without scrolling, the last four below the fold.

The Problems panel read **0 errors · 3 warnings**, R40's three rows in the runtime's words: *"Stock" (Counter): Min Value 10
is above Max Value 2…*, *"Rows" (For Each): The Repeater's Script does not compile: Unexpected token ';'*, *"Volume"
(net.noodl.controls.range): Max 10 is below Min 50…* ([shot](shots/nsp-019-s105-problems-panel-settings.png)). The
toolbar's ⚠ 3 popup is a different channel: the live preview's own warnings, which said the same three.

**Seen, not filed:** after a node is selected through the graph API (`nodeGraph.selectNode`), the property panel stayed on the
previous node for 15 s, so *How this node works* opened the previous node's dialog. A click in the Layers tree moved it at once.
The API is not a person's path; it is noted for the next drive script, not as a defect.
