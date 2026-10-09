---
id: P107-C128
title: A Repeater that meets something it cannot build stops for good — a Template the project does not have, or Items holding a null when it rebuilds — and no later Items, Template or Refresh is ever drawn or answered
status: fixed
commit: e22334e0d
phase: P109
task: ISL-049
severity: high
area: runtime / Repeater (noodl-viewer-react/src/nodes/std-library/data/foreach.tsx `_runQueueOperations` :815-860 awaits each operation with no catch, so a throw leaves `runningOperations` true; `addItem` :576 `await this.nodeScope.createNode(template, …)` rejects for a component the project does not have (nodecontext.ts `getComponentModel` :616-636); `refresh` :771 `collection.set(items)` throws on a null item (model.ts `instanceOf` :265))
found: P107 NSP-016 s59, 2026-10-08
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.20; recorded on the runtime target (the s59 probe traces), and the spec copies it (R3)
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/For Each.json "a Template the project does not have: the row goes and the Repeater goes on — Template Row draws it again, and a Refresh and a new list are answered (row C128)"
---

**What a person sees.** A list stops changing. The author renamed the component a Repeater repeats (or a Dynamic Script names
one that does not exist, or the list being shown picks up an empty entry and the Repeater is refreshed). From then on nothing the
graph does reaches the list: new Items, a fixed Template and Refresh all change nothing, Refresh never fires Done or Failure, and
Items Rendered never fires again. Only reloading the page brings it back. Nothing on the wire says why; the browser console has
one line.

**Where.** Every change to a Repeater's rows is an operation on its own queue, run one at a time by `_runQueueOperations`. The loop
awaits each operation and catches nothing. Building a row for a component the project does not have rejects (`getComponentModel`
throws), and so does a rebuild whose Items hold `null` (the rebuild copies Items again, and `Model.instanceOf(null)` reads `.target`).
The rejection leaves the loop with `runningOperations` still `true`, so every later `_queueOperation` returns at its first line.
`reportTemplateProblem('repeater/template-component-not-found', …)` (:584-590) was written for this case but cannot run: `createNode`
never resolves to nothing, it throws.

**How to reproduce.** Play the `regression:` scenario on the runtime target (and "a list with a null in it, rebuilt: the rebuild
throws and the Repeater never draws again (row C128)" for the second cause). The spec copies the behaviour (R3).

**Proposed fix.** Catch in the operation, not the loop: in `addItem`, catch the build and report
`repeater/template-component-not-found` (the code the dead branch already has), leaving that item without a row; in `refresh`, a copy
that throws fails every Refresh it answers. Either way the loop goes on, so the next Items, Template or Refresh is drawn.

**Fixed (P109 ISL-049, s32, 2026-10-09), as proposed, with C135, C140 and C141 (one mechanism).** `addItem` catches the build: a component the project does not have raises `repeater/template-component-not-found` (`repeater/row-build-failed` for one it has that still threw) and that item has no row — the dead `!itemNode` branch is gone. `refresh` catches its copy: every Refresh it answers fails `repeater/items-copy-threw` and the rows stay. The runner catches anything else (`repeater/operation-threw`), so the queue always runs on. The runtime target's face stood in for the defect (a promise that never settled at each throw) and loses those stand-ins. For Each spec v3 (no `stuck`); the act boundaries the queue runs on after each caught failure were measured and are pinned by four new scenarios (a count one off is red). Runtime conforms at seeds 13 and 20732 (296 / 296, 200 sequences each); interpreter mutants 0 survivors at both (254 / 255, one declared: an idle yield's set, which no step reads). Control (the base `foreach.tsx`) red on exactly the 27 scenarios the fix moved; the error codes are graded in viewer-react's `nda-012-visual-deployed-diagnosis.test.ts`, red on the base file on exactly its four new cases.
