# OWN-006 — The editor suite

**Opened 2026-10-02.** **Depends on OWN-001** (the reference reader and writer) **and OWN-003** (the graph runner and
its scenarios).
**Status: 🟢 built. s8 (2026-10-11, Fable): the graph half — an adapter's own runner graded on the 85 graph scenarios through two doors, `graphTarget()` (a fresh runner per scenario) or `playGraph(scenario)` (the editor plays it itself; what a page needs, since a step proxy over CDP reads one scenario a frame early); the prototype page passes files and graphs; found P112-S8-SHAREDTARGET (open). §6.4. Earlier: first half built, s5 (2026-10-10): the adapter, the eight edits, the reference, the comparison, the runner, the command and the fixtures, in `@nodegx/project-contract/editor-suite`; AC1 and AC4 met; the MCP is the first adapter (AC3's first half). s6 (2026-10-10): **AC2 met** — the prototype page (`prototype/real/orbit.html`) is the second adapter and passes small, todo-list and planning; its first run found P112-S6-SUITEIDS (fixed). The graph half (`graphTarget()`, the 76 scenarios) waits for OWN-003 / R1; the Electron adapter (AC3's second half) is next. s7 (2026-10-10): **AC3 met** — the Electron editor is the third adapter (`packages/noodl-editor/tests/editor-suite/electronAdapter.test.ts`, in `test:ci`) and passes small, todo-list and planning; its first run found P112-S7-LOGICTYPE (fixed) and P112-S7-TEXTDEFAULTS (open). **Left: the graph half, after OWN-003.** §6.**
**Model:** **Fable.** The adapter, the edit vocabulary and the comparison rule are the design every later task and every stranger depends on. At the start of a session on this task, and again if the work changes kind, say which model you are running on and whether this line says Richard should switch (README §0.2).

## 1. The person sentence

> **An agent building an editor runs one command, and it says PASS, or it names the file, the node and the field that
> differ from what the official editor would have saved.**

## 2. Why

README §2's fourth sentence. The prototype "worked" because it looked right and three hand-written missions passed. That
is not a definition an outsider's agent can aim at. NSP-006 showed what does work: hand a stranger a suite that grades
behaviour and they are green on the first run. This is that suite for editors.

## 3. What to build

1. **The adapter** an editor implements (TypeScript types and a JavaScript example):
   `open(files) → void`, `apply(edit) → void`, `save() → files`, and optionally `graphTarget() → GraphTarget` if the
   editor runs graphs itself. `files` is OWN-001's in-memory map. The adapter calls the editor's own code path, the one
   a person's click goes through, not a shortcut.
2. **The edit vocabulary**, small and closed: add a node (type, parent or root, parameters, position), remove a node,
   connect, disconnect, set a parameter, move, rename, add a child to a visual parent. Each edit is JSON. The list is
   the MCP authoring operations' intent, not their wire format.
3. **The reference.** The same edits applied through `@nodegx/project-contract`'s writer (OWN-001), which is what the
   MCP and the editor use. The comparison matches ids (an editor may mint its own), ignores `x`/`y` unless the edit
   was a move, and compares everything else.
4. **Fixtures**: `templates/todo-list`, `templates/planning`, and a small project made for the suite that touches every
   edit kind once. Each fixture comes with an edit script.
5. **Three more checks on what the editor saved:** the structural validator (OWN-001) reports nothing; the semantic
   validator (`noodl-editor/src/editor/src/validation`) reports nothing new compared with the fixture; the official
   loader opens it. If `graphTarget()` exists, the 76 graph scenarios run on it.
6. **One command** (`npx @nodegx/editor-suite ./my-editor-adapter.js`, or the repo script if R2 rules against
   publishing) that prints PASS or the first ten differences in plain words.

## 4. Acceptance criteria

1. The reference adapter (a thin wrapper round OWN-001's writer) passes; a deliberately broken adapter (drops a
   connection's `toProperty`, writes a parameter as a string) fails with a sentence naming the field. That is the
   control that makes PASS mean something.
2. The prototype, once it reads and writes v2 through OWN-001, passes on the suite's own small fixture.
3. NSP-021's round trip (MCP ↔ Electron) runs as two adapters in this suite, so it is built once.
4. The suite runs in under a minute on the todo template.

## 5. Watch for

- Memory: *`toContain` passes dead code* and *verify the consequence, not just the mechanism*. A suite that checks
  "the file was written" passes an editor that writes nothing useful. Compare content.
- Memory: *a rule reading zero in both arms grades nothing*. Every check needs a fixture that makes it fire.
- Memory: *opening a project now writes three files into it*. The official loader's own writes are not differences the
  editor made; diff against the fixture after the loader has opened it once.

## 6. Built

### 6.1 The first half, s5 (2026-10-10, on Fable)

**Where it lives: `@nodegx/project-contract/editor-suite`** (in memory, no `fs`) and `…/editor-suite-node` (the command
over a folder). Not a package of its own: the suite grades the format's rules, the kit is one install (OWN-011), a stranger
who has the format has the suite, and a new workspace would have meant a root-lock change (P112-S1-LOCKFILE's shape). §3.6's
`npx @nodegx/editor-suite` becomes a `bin` of this package when R2 publishes it.

**The adapter (§3.1):** `EditorAdapter` = `open(files)`, `apply(edit) → { id? }`, `save() → files`, optional `graphTarget()`;
each sync or async. `apply` returns the id an editor minted for an `add_node`, which is how ids are matched.

**The vocabulary (§3.2), eight edits, each JSON, each naming its component:** `add_node` (type, parent or root, index,
parameters, label, position), `remove_node` (the subtree, its wires, its visual root), `connect`, `disconnect`,
`set_parameter` (absent value unsets), `move`, `rename`, `add_child` (reparent, at an index). `applyEdit` is the reference
semantics, the MCP's `applyOperations` bookkeeping written plainly (parent/children kept consistent, a duplicate wire
refused, a cycle refused); `EditRefusal` is one sentence.

**The reference (§3.3):** `referenceAdapter()` applies the edits through `V2ProjectStore` on `memoryFiles`. **The comparison**
(`compareSaves`): ids matched through the map `apply` built; `x`/`y` ignored except on nodes the script moved or placed;
`modified`/`modifiedBy`/`created`/`lastUpdated` ignored; every other field on every node (bags like `parameters` compared
field by field, so the sentence names `parameters.paddingTop`, not the bag), every wire (a wire to the right node with the
wrong port says *"arrives at X instead of Y (toProperty)"*), children order, visual roots, the component file, the registry's
entries and counts, the project-level files, and any other file byte for byte; a file written that the reference would not
write, or missing, is a difference. Every difference is one sentence naming the file, the node and the field.

**The fixtures (§3.4):** `tests/fixtures/editor-suite/small/` (two components, five nodes, two wires) with `small.edits.json`
(eleven edits, every kind at least once, a test says so), and `todo-list.edits.json` / `planning.edits.json` over the
templates' `App` component (every kind once). **The checks (§3.5):** the structural validator on every file always; the
semantic validator and the official loader are `checks` the caller passes as functions (both live in the editor; in a
checkout the MCP's and the editor's specs pass them; outside one they are absent and the report says which checks ran).
**The command (§3.6):** `editor-suite-node.ts <adapter.js> <project-dir> <edits.json>` loads the adapter module (CJS or ESM,
`adapter` or default export, a value or a factory), prints `PASS — …` or `FAIL — …: N difference(s)` and the first ten,
exits 0 / 1 / 2.

**AC1, the control:** `brokenAdapter()` is the reference with two faults on the way out (a wire's `toProperty` dropped, the
first numeric parameter of a node written as a string). It fails with *"the wire … arrives at nothing instead of "text"
(toProperty)"* and *"node "home-root" … "parameters.paddingTop" is "16"; the official editor saves 16."*, and the structural
validator names the missing `toProperty` too. The reference passes.

**AC3, first half — the MCP as an adapter:** `packages/noodl-mcp/tests/editorSuite.test.ts` turns each edit into the
`update_component` operation an agent sends and writes it through `ProjectStore` on a copy on disk. **On its first run it
found P112-S5-REPARENTINDEX** (below) on the small fixture and passed todo-list and planning; after the fix, 3 / 3. The two
appliers (the MCP's `applyOperations`, the kit's `applyEdit`) now agree on every edit of the three scripts, which is what
"the MCP is an adapter" is for: a difference between them is a finding, not a flake.

**Gates (2026-10-10, tree at `991457d2d` plus this session):**

| gate | reading |
|---|---|
| `packages/nodegx-project-contract` `editor-suite.test.ts` | **14 passed** (AC1 both arms, AC4 todo-list 209 ms / planning 357 ms, the command, every edit kind fires) |
| `format.test.ts`, `project.test.ts` (P116's import gate, `editor-suite-node.ts` named for `fs`/`path`) | 14 + pass |
| package `tsc` and `tsc -p tsconfig.tests.json` | clean |
| MCP `editorSuite.test.ts` (the adapter) | **3 / 3** after P112-S5-REPARENTINDEX; **1 failed** before it, naming `home-box`'s `children` |
| MCP `operationsWritePath`, `tools`, `vocabularyParity`, `sb002BackendDoctrine`, `styleTools` | pass |
| MCP `toolDisclosure` (AWP-006 surface budget) | **8,279 of 8,280 tokens** — the first two wordings of `index` read 8,293 and 8,283 and were cut to add_node's words |
| `typecheck:mcp` | clean |

**Found:**
- **P112-S5-REPARENTINDEX** (low, fixed): `update_node.set.parent` appended; an agent could not put an existing node first in
  a row without remove-and-re-add (which loses wires). `set.index` added, in add_node's words; the suite's small fixture is
  the regression.
- The AWP-006 surface budget has **1 token** of headroom. The next sentence on any resident tool trips it; a budget that is
  tripped by a six-word description is measuring the wrong thing or has the wrong number (the memory rule says count the
  artefact and never bump the literal, so it was not bumped; recorded for P109 / whoever owns the surface).
- The MCP's run-on-value-change pins (ISL-018) made no difference on todo-list (format 4): the nodes the script adds have no
  box the migration plans for. A script that adds a `Condition` with a wired input would, and then the reference (which does
  not pin) and the MCP (which does, for format < 5) would differ by design. Not a defect; a fixture to write when OWN-006's
  second half decides whether the reference pins.

**Not built (next):** the Electron adapter (an editor `tests/` spec driving `NodeGraphModel` through the suite: AC3's second
half, NSP-021's round trip); ~~the prototype on the suite (AC2)~~ built s6 (§6.2); the graph
half (`graphTarget()` and the 76 scenarios, after OWN-003); the semantic validator and the loader as checks in a published
suite (they are the editor's; the `checks` seam is where they plug in).

### 6.2 AC2 — the prototype passes, s6 (2026-10-10, Opus)

**The prototype is the suite's second adapter, and the first that is a person's editor.** `prototype/real/suite-adapter.mjs`
opens `orbit.html?open=wait` in headless Chrome, hands it the fixture's files, applies each edit with
`__orbit.apply(edit)` and saves what the page's store holds. `__orbit.apply` is a switch over the page's **own** editing
functions — `addNode`, `removeNode`, `connect`, `disconnect`, `setParam`, `moveNode`, `rename`, `reparent` — the ones its
picker, connect popup and Node panel call, each a write through `V2ProjectStore` followed by a rebuild of the real app.
The page mints its own ids (`group1`, `counter2`), as a person's editor does.

To get there the page gained what the small fixture asks for (OWN-004 §6.4 listed them as missing): any project and any
component (a switcher in the crumb), a screen node added inside the selected one at a place, reparent and reorder
(Inside, Place in it), rename, delete a screen node with everything inside it, unset a parameter. The screen's stack
is laid out from the tree on every change and never written, so the only positions in the files are the ones a
person (or a script) set — which is also what the comparison assumes.

```sh
npx ts-node packages/nodegx-project-contract/editor-suite-node.ts \
  dev-docs/tasks/phase-112-your-own-nodegx/prototype/real/suite-adapter.mjs \
  packages/nodegx-project-contract/tests/fixtures/editor-suite/small \
  packages/nodegx-project-contract/tests/fixtures/editor-suite/small.edits.json
```

**Readings** (2026-10-10, `1a5561b79`):

| | |
|---|---|
| the prototype on `small` | **PASS** (7.5–8.0 s, most of it the real app rebuilt after each of the twelve edits) |
| the prototype on `todo-list` / `planning` (`templates/<name>`, the same scripts the MCP runs) | **PASS** / **PASS** (10.6 s / 11.6 s) |
| control: the page's reparent made to ignore the index | **FAIL**, one sentence: *node "home-box" … "children" is ["home-count","home-title"]; the official editor saves ["home-title","home-count"]* |
| `editor-suite.test.ts` | **15 / 15** (14 + the SUITEIDS regression, red without the fix); the package's whole jest **263 / 263**, 13 suites; `tsc` and `tsc -p tsconfig.tests.json` clean |
| MCP `editorSuite.test.ts` | **3 / 3** (unchanged by the fix: the MCP keeps a named id) |
| `prototype/real/check.mjs` (now with the structure from the Node panel, real input) | **PASS**, 2 / 2 |

**Found and fixed — P112-S6-SUITEIDS** (medium, `kit: editor-suite`): the suite matched minted ids for the comparison but
handed the editor the script's ids in later edits, so an editor that mints every id (the official one does) could not
find `home-box` and failed before any file was compared. The existing "mints its own ids" test passed because its
wrapped reference keeps a named id: a hole shaped like the defect. `inEditorIds` translates `id`, `parent`, `from.node`,
`to.node` through the reverse map; a test whose editor always mints is red without it. **It would have stopped the
Electron adapter the same way.**

### 6.3 AC3 — the Electron editor is the third adapter, s7 (2026-10-10, Opus)

**NSP-021's round trip, built once.** `packages/noodl-editor/tests/editor-suite/electronAdapter.test.ts` (in `test:ci`,
registered in `tests/index.ts`) is the official editor as an adapter, through the code a person's click goes through:

| suite edit | the editor's path |
|---|---|
| open | `ProjectStructureService.loadProject` on an in-memory filesystem (`MemFs`), then `projectFromDirectory`'s `openFromContent`: `applyPatches`, `upgradeOnLoad`, `ProjectModel.fromJSON` with the model listeners off |
| `add_node` | the picker (`NodePicker.utils` `createNodeFunction`; `NodeOperations` for a place in a parent): `NodeGraphNode.fromJSON` with a `guid()`, `insertChild` / `addChild` / `addRoot`, `seedNewNode`; each parameter as the property panel sets it; the label as the Node panel renames |
| `remove_node` | `NodeGraphNodeDelete`: `graph.removeNode` in an undo group |
| `connect` / `disconnect` | the connect popup's `addConnection`; `NodeOperations.removeConnection` |
| `set_parameter` | `setParameter` (an absent value unsets) |
| `move` | `NodeOperations.commitMoveNode`: `model.set({ x, y })` |
| `rename` | `NodeGraphNodeRename`: `setLabel` |
| `add_child` | the Layers drag (`layersDragApply` `applyMove`): `detachNode`, then `attachNode` at the index |
| save | `ProjectStructureService.saveProject(dir, model.toJSON())`, `ProjectModel.toDirectory`'s v2 branch |

The suite grades from the project **after the editor has opened and saved it once** (§5): what the open alone changes
is printed, not compared. On todo-list and planning it is `nodegx.project.json`'s `version` (4 → 5, the
run-on-value-change migration's own save, P109 ISL-018, by design). §3.5's two editor-owned checks are handed in: the
**semantic validator** (nothing the reference's save of the same script lacks) and the **official loader** (what the
editor saved reopens with no warning). With the suite's own structural validator, all three run on every fixture.

**The first run: 29 / 16 / 16 differences on small / todo-list / planning.** Sorted by cause:

1. **The editor's save rewrote `Logic/Counter`'s `type` from `logic` to `visual`** → **P112-S7-LOGICTYPE** (low, fixed).
   `buildComponentV2Files` wrote `inferComponentType(name)`, a guess from the path; the registry kept `logic`. Carried
   now on LEG-006's four seams, only when the declared type is not what the name says (no new key elsewhere, F46).
   Regression `tests-unit/p112/logicTypeRoundTrip.test.ts`, 2 of 3 red with the old line.
2. **A Text from the picker carries STYLE-002's look**: ten parameters the reference does not write, and the editor's
   own semantic validator calls five of them **2 errors and 4 warnings** (`width`/`height` `"auto"`, `flexShrink` /
   `flexGrow` that Text never reads, `minWidth` `"0"` read as 0%) → **P112-S7-TEXTDEFAULTS** (medium, **open**: the
   look is not this task's to change, and what the runtime does with a `width` of `"auto"` is not measured).
3. **The small fixture's own bytes**: `$schema` URLs that are not the schemas' `$id`s (`component.json` for
   `component-v2.json`) and no `version` on nodes / connections. The fixture's fault (written s5): rewritten as the
   official writers write them. The MCP and the prototype pass it unchanged.
4. **A moved child**: the official editor saves no position for a node with a `parent` (`normalizeComponentForV2`;
   the canvas lays a tree out from its root). The comparison now ignores `x`/`y` on a child even when the script
   moved it, and `PROJECT-FORMAT-V2.md` says so; the small script's `move` now moves a root (`Logic/Counter`'s
   `counter`), so `move` still grades a position. The package's layout test grades both arms.

**The picker's look is a door's policy, not the vocabulary's.** The suite's `add_node` is "a node of this type with
these parameters", the MCP's intent; the picker adds the look on top. So the round-trip specs take the picker's path
without `ElementConfigRegistry.applyDefaults`, and a spec of its own takes it **with** the look and requires that the
only differences are exactly what `applyDefaults` writes on the nodes the script added (10 on small), with a control
that they arrived. Whether an agent's Text should wear the same look as a person's is a question, not settled here
(the MCP adds none).

**Readings (2026-10-10):**

| | |
|---|---|
| `test:ci` run 1 (before the fixes, HEAD `dc4e0b51`) | 3,010 specs, 4 failures: the three round-trip specs (above) and `SUB-006 rules nonexistent-port …` (a floor red, not this work); the control passed |
| `test:ci` run 2 (`32745136` + the fixes) | 3,011 specs, 4 failures: the same floor red, and the three round-trip specs **printing PASS** but red on my own assertion (the suite records a third check, `structural validator`; the assertion named two). Picker-look spec and control passed |
| `test:ci` run 3 (the assertion fixed, `32745136` + this work) | **3,011 specs, 1 failure** (seed 32918): the floor's `SUB-006 … nonexistent-port` only. All five OWN-006 specs ran and passed — small / todo-list / planning **PASS** (8 / 244 / 394 ms), the picker's look, the control |
| MCP `editorSuite.test.ts` on the rewritten small fixture | **3 / 3** |
| the prototype (`suite-adapter.mjs`) on the rewritten small | **PASS** (15.4 s) |
| `@nodegx/project-contract` `editor-suite.test.ts` | **15 / 15** |
| `tests-unit` `p112/logicTypeRoundTrip`, `leg-006`, `def-039` | 23 / 23 |
| `tsc -p tsconfig.tests.json` (editor), `typecheck:mcp` | clean |

**So the round trip is three adapters on one reference**: the MCP, the prototype page and the Electron editor each save
what the reference saves on small, todo-list and planning. If two of them agree with the reference, they agree with
each other.

### 6.4 The graph half — an editor's own runner, graded (s8, 2026-10-11, Fable)

**§3.1's `graphTarget()` and §3.5's "the graph scenarios run on it", built — with a second door the first run showed was
needed.** OWN-003 chose the runner (the real engine, opened up, in a page: OWN-003 §6.1). The suite grades whatever an
adapter offers:

- **`graphTarget()`** — a fresh in-process `GraphTarget` (`@nodegx/node-spec`'s interface) **per call, called once per
  scenario**. The recordings every scenario carries were made on a fresh engine each (`graph.test.ts`); the first run
  of the prototype's bridge handed ONE engine all 85 in a row and 10 differed — nine by an id minted from the world's
  random stream after a once-per-engine draw, one by a popup's state (**P112-S8-SHAREDTARGET**, open: the helper's
  "a target plays many scenarios" does not hold for graphs). Fresh per scenario is what the reference means.
- **`playGraph(scenario, file)`** — for a runner that lives elsewhere (a page): the editor plays the scenario itself,
  with the spec package's own `playGraph` on a fresh runner, and hands back `{ trace, error? }` or `{ outside }`; the
  suite grades the trace by the same rule (`gradeGraphScenario`, extracted from the spec package's `runGraphScenarios`
  so there is one copy of the grading). Why it exists: a step-by-step proxy over CDP — `set`, `signal`, `settle`,
  `trace` each a round trip, the synchronous steps queued and run in one batch right before the await they precede —
  reached **84 / 85**; the last, *nested popups* (t12), read `Closed` a frame early because every round trip is an
  event-loop turn between two steps the reference recorded as one synchronous run, and no batching removes the turn
  between one `settle` resolving and the next starting. The whole play in the page is what the recordings were made of.

**Where it lives.** `suite.ts`: `EditorAdapter.graphTarget?()` / `playGraph?()`, `GraphRunnerDoors`, `GraphGrader`
(`SuiteOptions.graph`, handed in because the suite is in memory and holds no scenarios), `SuiteReport.graph`; an
adapter WITH a runner and NO grader is **not** a pass. `editor-suite-node.ts`: `graphGraderFromNodeSpec()` builds the
grader from the spec package's loader and runner and the command passes it by default (the sibling import is NAMED in
P116's import gate, `tests/project.test.ts`, which now also catches a relative import that leaves the package).
`noodl-runtime/test/node-spec/editor-suite-graph.test.ts` (where the runner compiles): six arms — the engine as runner
PASSes with every scenario graded; the two-frames control FAILs naming C9; no grader is no pass; no runner is files
only; the second door PASSes; the second door's control FAILs naming C9. The prototype: `real/orbit.html` `__orbit.graph`
(loads `graph-target.js` — the kit's bundle, served by `serve.mjs`, not copied by `--out` — on first use and plays one
scenario), `real/suite-adapter.mjs` `playGraph()`.

**Readings (2026-10-11):**

| | |
|---|---|
| the prototype through the suite, run 1 — a step proxy, one shared engine | FAIL, **10 / 85** graph scenarios: s07 ×1, s08 ×2, s09 ×4 (`$array` ids), t03 ×2 (`transactionId`), t12 ×1 (`Closed` pulsed 0) |
| run 2 — a fresh engine per scenario, the same proxy | FAIL, **1 / 85**: t12 nested popups, `Closed` a frame early |
| run 3 — the proxy's steps batched synchronously before each await | FAIL, the same 1 |
| run 4 — the second door, the page plays the whole scenario | **PASS**, files and **85 / 85** graph scenarios, **11.4 s** in all (files 9.7 s of it) |
| `@nodegx/node-spec` `tests/graph.test.ts` after the grading was extracted | 128 / 128 |
| `@nodegx/project-contract` jest (the gate's new rule, the suite's doors) | **263 / 263** |
| `noodl-runtime` `editor-suite-graph.test.ts` | 4 / 6 at 10:28 — the two PASS arms listed five scenarios (s07 ×4, t11) that the Node reference `graph.test.ts` was red on **at the same minute** (91 / 96; green three times earlier): a P107 peer's uncommitted derived-ports edit to the helper (10:19) and node-spec. Not this work; NEXT-SESSION-PROMPT says what to run once it lands |

**What a stranger's page editor learns from this (for OWN-007):** offer `playGraph`, not a proxy; make the runner
fresh per scenario; the kit's `NodegxGraphTarget.graphTarget()` is both.

**Left in this task: nothing.** AC1–AC4 (s5–s7) and the graph half (s8) are built; the MCP and the Electron editor
offer no runner, rightly — neither runs a graph.
