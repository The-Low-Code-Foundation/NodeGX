---
id: P112-OWN008-FORMAT4PIN
title: "On a format-4 project the editor suite FAILs an editor that ticks run-on-value-change on the nodes it writes, which is exactly what the nodegx server does (ISL-018), because the suite's reference doesn't tick them"
status: fixed
commit: (this session, OWN-008 s4)
phase: P112
task: OWN-008
severity: medium
area: "`@nodegx/project-contract` editor suite: `referenceAdapter` / `runSuite`'s reference save (`editor-suite/suite.js`), against `packages/noodl-mcp/src/project/runOnChangePins.ts` `pinAuthoredRunOnChange` (called from the MCP's `ProjectStore`)"
found: P112 OWN-008, 2026-10-18 (the table stranger's question 1, checked against the source)
evidence: dev-docs/tasks/phase-112-your-own-nodegx/own-008/table/REPORT.md (question 1, and the FAIL on `editor/suite/edits-format4-pin.json`)
kit: project-contract
regression: packages/nodegx-project-contract/tests/own008-format4-pin.test.ts
---

A project below format 5 gets the NodeGX editor's one-time clean-up on its next open. Every value input of a node
whose Run is wired, with no `runOnChange-<input>` key, is written `false`. P109 ISL-018 ruled (2026-10-05) that a
writer states the boxes of the nodes it authors as `true`, so the clean-up leaves them alone.
`pinAuthoredRunOnChange` does that in the `nodegx` server's store. The suite's reference, the kit's
`V2ProjectStore` with no `prepare`, writes no key.

The table stranger (OWN-008, Opus 5.5, from the registry kit 0.1.0) read `store.d.ts`, saw that the server pins, and
pinned the same way on the nodes the person touched in a format-4 project. On a script that wires a Run, the suite
said:

```
FAIL — table editor on table-editor-suite-I1OyRQ (57 ms): 1 difference(s)
1. node "echo" in components/Commands/Add task/nodes.json: "parameters.runOnChange-in-value" is true; the official editor does not save it.
```

The sentence calls the reference "the official editor". In a format-4 project, though, the official writer for an
agent does save that `true`. An editor that follows the suite instead leaves the box absent, and the NodeGX editor's
upgrade then writes `false`: the input the person just wired stops running the node. The suite passes the editor
that silences the input and fails the one that doesn't. The repo's `todo-list.edits.json` wires no Run, so it
can't see this. `templates/todo-list` is format `"4"`, so the template OWN-008 grades on is exactly such a project.

**Fix shape:** the reference's save runs the same `pinAuthoredRunOnChange` plan (over the whole component, against
the opened copy) when the fixture's `nodegx.project.json` version predates 5. Add a script to the package's fixtures
that wires a Run on a format-4 project. Its regression pair: the reference with pinning PASSes an editor that pins,
and FAILs one that doesn't. The brief then says one sentence on format-4 projects (the table stranger's question 14).

**Fixed (OWN-008 s4, 2026-10-18).** The plan has one copy now, `@nodegx/project-contract/format`
(`format/run-on-change-pins.ts`: `pinAuthoredRunOnChange`, `projectWillBeCleanedUp`, `TickedBox`). The MCP's
`runOnChangePins.ts` re-exports it and keeps only what its responses say (`tickedPayload`, `TICKED_WHY`). The
reference (`referenceAdapter`) reads the opened project's version and runs the pin in every write's `prepare`.
The regression is `tests/own008-format4-pin.test.ts`, on the todo template with the table stranger's script
(`tests/fixtures/editor-suite/todo-list-wires-a-run.edits.json`), using two editors written against the store, not
wrapped round the reference. Format 4: the one that pins PASSes, the one that writes no key FAILs on
`runOnChange-in-value`. Format 5 control: the one that writes no key PASSes, and one that pins anyway FAILs. Mutant:
the reference with pinning off turns the format-4 arm red. The brief's bullet now says to pin, and how. Gates:
contract jest 360 tests, with 1 red that is P107-S101-VERBSPECCED's (open, not this); contract and MCP typecheck clean;
MCP `editorSuite` + `isl018DoorPins` 10 / 10; `create-nodegx` 25 / 25. `test:main` is red at 8 suites that read
none of this (P112-OWN008-TESTMAINRED). Found beside it: ESMADAPTER's `url` import had turned the package's own
import gate red; `url` is named there now.
