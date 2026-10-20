---
id: P18-S115-QUERYFILTER
title: An exported Query Records fetches the whole class, whatever its Filter, Sort and Limit say
status: fixed
commit: dd1a31c49
severity: high
area: export / Query Records
found: P18 session 115, 2026-10-16, starting P18-S113-LISTLIVE (which needs the query's own filter and sort)
evidence: dev-docs/tasks/phase-18-code-export-v2/EXP-011-PICKER-COVERAGE.md §82; nodegx-export emitApp.ts (the api module's `fetch<Plural>()` is `query<T>('<Class>')` with no parameters); component.ts (`<fetch>().then(<setter>)`)
---

A page lists a person's open tasks with a Query Records whose Filter says `done equal to false`, sorted by due date,
limited to 10. In the running app the list holds those ten. In the exported app it holds every task in the class, in
the backend's order: the exported query sends no `where`, no `order`, no `limit` and no `skip`, and the export report
says nothing about it.

Measured on `tests/fixtures/puppy-test-3` (both of its Query Records): setting any of the node's query parameters —
a visual Filter in either saved shape, a Sort, Use Limit with Limit and Skip, the Javascript filter, a Search term,
Total Count — leaves every emitted file and every note byte-identical. EXP-008's per-parameter probe never saw it: the
catalog gives Query Records no static inputs (every one is a dynamic port), so the probe had nothing to vary, and its
"0 gap ports" is about the ports it could vary.

Reach, measured over the 43 projects on this machine that hold a Query Records (dev-docs, the export fixtures,
`NodeGX test projects`): 323 Query Records; 125 carry a Filter (105 of them read at least one value from a port),
62 a Sort, 12 a Limit.

The fix: the export translates the filter with the runtime's own translator (`@noodl/backend-contract`'s
`visualQueryToNeutral` / `savedFilterToNeutral` and `toParseWhere`, the calls `QueryUtils.convertVisualFilter`
makes) and sends the `where`, the `order`, the `limit` and the `skip` the runtime sends. What it cannot reproduce yet
it refuses by name: a filter value read from a wired port (P18-S115-QUERYPARAMS, the next slice), the Javascript
filter, a Search term, a wired Filter / Sort / Limit / Skip, a relation filter.

**Fixed** in `dd1a31c49` (EXP-011 §82): as proposed. Spec `packages/nodegx-export/tests/the-query-asks.test.ts`;
driven in `dev-docs/tasks/phase-18-code-export-v2/s115-query-drive/` (runtime and fixed export show the same rows from
the same request; HEAD showed the whole class).
