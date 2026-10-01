---
id: P109-F25
title: A project an agent builds through the MCP door is silently rewritten by the run-on-value-change migration the first time the editor opens it
status: scheduled
phase: P109
task: ISL-018
severity: medium
area: mcp / authoring (runOnChange keys) + project-contract migration
found: P109 ISL-018 scoping, 2026-10-01 (audit P109 F25); bite measured by DEF-038, 2026-09-03
evidence: dev-docs/tasks/phase-109-the-defects-the-island-found/AUDIT-2026-10-01.md §1 F25; ISL-018 §2
---

A person builds an app with an agent over the MCP, then opens it in the editor. Every governed node whose control
signal is wired gets `runOnChange-…=false` written on load, silently, so a node that ran on a value change no longer
does. DEF-038 measured the bite on `members-area` built through the door: 57 writes, and a load-time fetch silenced
(P77 D5/D11 measured two `DbCollection2` fetches and a root URL that drew nothing).

**Where:** the migration treats an **absent** key as a pre-§2 author with no version guard
(`packages/nodegx-project-contract/run-on-value-change-migration.ts:16-30, 83-84, 455-465`); no file in
`packages/noodl-mcp/src` mentions `runOnChange`/`runOnValueChange`, so the door writes what the caller sent and
settles nothing. Re-read at HEAD `d2b2f0101`.

**Reproduce:** DEF-038's measurement (the door-built `members-area` without the test-side settle → 57 writes on open;
the site-builder control 0). Not re-run here. Not yet measured: what the editor itself saves when a person wires `Run`
(ISL-018 AC2) — if it also leaves the key absent, the editor's own graphs are rewritten too.

**Workaround:** 8 generators call `pinRunOnValueChangeDefaultsInDirectory` from test code
(`packages/noodl-mcp/tests/templateArtefact.ts:70-168`).

**Proposed:** the door settles the keys it writes (as `pinRunOnValueChangeDefaults` does), or a project-level marker the
migration reads (🔒 ISL-018, after AC2). Medium.
