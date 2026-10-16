---
id: P18-S115-QUERYPARAMS
title: A Query Records whose Filter reads a value from a wired port is refused by the export
status: open
severity: medium
area: export / Query Records
found: P18 session 115, 2026-10-16, fixing P18-S115-QUERYFILTER
evidence: dev-docs/tasks/phase-18-code-export-v2/EXP-011-PICKER-COVERAGE.md §82; nodegx-export src/analyze/querySettings.ts (the `wiredParams` refusal); tests/the-query-asks.test.ts §C
---

A page lists the tasks of the project a person picked: its Query Records' Filter says `project equal to <the picked
id>`, the value wired into the filter's `qp-project` port. In the running app the query runs again whenever the value
changes (`setQueryParameter`, one Run On Value Change box per parameter) and a row whose port supplies nothing is
dropped (`dropUnresolvedConnected`). Since P18-S115-QUERYFILTER the export translates a Filter whose values are all
known when the project is exported, and refuses this one by name ("its Filter reads "project" from a wired input …"),
so the page's list is not exported.

It is most of the reach: of the 125 Query Records with a Filter on this machine (43 projects), 105 read at least one
value from a port.

The fix: the `where` built in the exported app from the wired values, by the same translator (or a builder graded
against it on every operator the corpus uses), with the runtime's drop rule for an unset value, and the query's effect
depending on those values under each one's Run On Value Change box. Then P18-S113-LISTLIVE on top of it.
