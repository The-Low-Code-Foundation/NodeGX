---
id: P18-S115-QUERYPARAMS
title: A Query Records whose Filter reads a value from a wired port is refused by the export
status: fixed
commit: 6548de6ee
fixed: P18 session 116, 2026-10-16 (EXP-011 §83, s116-queryparams-drive)
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

**Fixed in session 116 (EXP-011 §83).** The export runs the same translator once for every combination of the wired
values being set or unset, with a marker for each set value; the page picks the combination and puts each value where
its marker sits, through the client's `filterValue` (the translator's `parseValue`). An unset value drops its
condition; `""` keeps it. The query's effect depends on the values, so a new one asks again. Graded value by value
against the runtime node's own `getStorageFilter` (`tests/the-query-reads-its-wires.test.ts`, 140 rows), and driven.

**The reach above was not this fix's reach.** Measured after it on 48 projects: of 84 Query Records whose Filter
reads a wired value, none exports yet, each stopped one step earlier: 42 read a Function fed by another Function (a
chain the export does not translate), 21 have Fetch wired (P18-S116-QUERYFETCH), 18 sit in a logic component with no
page, 3 read the clock. A filter fed by a Variable, a component input or the signed-in user exports now.

