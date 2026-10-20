---
id: P112-OWN007-NOFIXTURES
title: "The published editor suite ships no example project or edit script, so a stranger's first run of `editor-suite-node.js` has nothing to run against"
status: open
phase: P112
task: OWN-007
severity: low
area: packaging / `@nodegx/project-contract` publish (`build-publish.mjs` SKIP list drops `tests/`, where `fixtures/editor-suite/{small,reading-list}` and the `*.edits.json` scripts live)
found: P112 OWN-007, 2026-10-14 (the brief's control pair, run from the registry at 0.1.0)
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-007-THE-BRIEF.md §6
kit: project-contract
---

`@nodegx/project-contract@0.1.0` from the registry carries `editor-suite-node.js` (the command) and `scenarios/` arrives
with `@nodegx/node-spec` (the graph half), but no project folder and no edit script: `tests/` is on `build-publish.mjs`'s
SKIP list, and that is where `fixtures/editor-suite/small/`, `reading-list/` and the three `*.edits.json` scripts live.
OWN-006 §6.1 says "a stranger who has the format has the suite"; the stranger has the runner and must write the fixture.

The brief (OWN-007) tells the agent to write `edits.json` itself, every kind once, over a copy of the person's app. That
works (the control pair in OWN-007 §6 used the checkout's `reading-list` fixture copied beside the install), but it
means the first PASS a stranger sees is on a script they wrote, which cannot find a kind they forgot.

**Fix shape:** ship `small/` and `small.edits.json` (two components, five nodes, two wires, eleven edits, every kind) as
`examples/editor-suite/` in the published package, and name them in the command's usage line. The regression is the
package's existing "every edit kind fires" test, run against the published copy.
