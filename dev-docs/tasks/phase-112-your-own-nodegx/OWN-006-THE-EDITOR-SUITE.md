# OWN-006 — The editor suite

**Opened 2026-10-02.** **Depends on OWN-001** (the reference reader and writer) **and OWN-003** (the graph runner and
its scenarios).
**Status: 🟡 first half built, s5 (2026-10-10): the adapter, the eight edits, the reference, the comparison, the runner, the command and the fixtures, in `@nodegx/project-contract/editor-suite`; AC1 and AC4 met; the MCP is the first adapter (AC3's first half). The graph half (`graphTarget()`, the 76 scenarios) waits for OWN-003 / R1; the Electron adapter and the prototype's run (AC2) are next. §6.**
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
half, NSP-021's round trip); the prototype on the suite (AC2, after OWN-004 slice 3 makes it read and write v2); the graph
half (`graphTarget()` and the 76 scenarios, after OWN-003); the semantic validator and the loader as checks in a published
suite (they are the editor's; the `checks` seam is where they plug in).
