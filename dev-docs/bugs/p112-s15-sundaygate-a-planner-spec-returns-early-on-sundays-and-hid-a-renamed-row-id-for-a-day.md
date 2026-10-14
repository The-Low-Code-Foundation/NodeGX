---
id: P112-S15-SUNDAYGATE
title: "A planner spec returns early on Sundays, so a commit made on a Sunday left it reading the old row ids until Monday"
status: fixed
severity: low
area: test / packages/noodl-mcp/tests/tpl010Template.test.ts §7 (TPL-010-L) "the column draws a task as From todo…"
found: P112 s15, 2026-10-12 (Monday), running the MCP's specs before committing OWN-015's s14 work
regression: packages/noodl-mcp/tests/tpl010Template.test.ts (the same spec, now asserting `day:` ids and `blockId`)
evidence: 96059a380 (P109 ISL-046, Sunday 2026-10-11 20:25) renamed the day columns' rows to `id: 'day:' + blk.id` and moved the record's id to `blockId`; the spec still expected the bare ids
---

`96059a380` gave every planner row its own id (P78-TPL010-MOVEARROW): the day columns' rows became `day:<block id>`,
with the record's id in `blockId`. The spec for the day column still expected the bare ids. It went unnoticed because
the spec finds today's column and returns early when there is none (`if (!today) return; // Sunday…`). The commit was
made and tested on a Sunday, so the assertion never ran. On Monday it failed:
`Expected "todo-t-late"… Received "day:todo-t-late"…`.

Fixed in the spec: it asserts both the row ids (`day:…`) and the `blockId` each row carries. Not changed: the early
return itself. The column's contents depend on which weekday it is, so the spec still grades nothing on a Sunday. A
spec that pins its own `weekStart` and "today" would grade every day.
