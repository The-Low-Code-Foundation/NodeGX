---
id: P115-HST014-HISTORYTABLES
title: "On a Cloudflare Worker, `GET /admin/schema` (the Data Browser's list) shows the execution history's three tables as if they were the app's collections"
status: open
phase: P115
task: HST-014
severity: low
area: "nodegx-backend `byob-admin.ts` `getSchema` lists `sm.listTables()` (every table in the database); on a Worker `cloudflare/nodeSqlite.ts` puts `node:sqlite` (the execution history) in the object's ONE database, beside the records"
found: P115 HST-014 s12, 2026-11-06 (the first `--local` deploy of Fixture C)
evidence: "MEASURED: after a fresh `deploy.mjs … --local`, `GET /admin/schema` listed `workflow_executions`, `execution_steps`, `operational_records` beside Reader and Answer; the first version of `applyProject` sent them back and `/admin/schema/apply` declared them (`Collections made: Reader, Answer, workflow_executions, execution_steps, operational_records`)."
---

On Node the execution history is its own file (`executions.sqlite`). On a Worker one Durable Object has one database,
so the history's tables sit beside the records. HST-006 §7 noted that a collection CALLED `executions` would collide.
This is the other half: the admin listing reads every physical table, so the owner's Data Browser shows three tables
they never made.

**Contained in the deploy:** `applyProject` keeps only what the backend's own diff (`exportSchemas`, the declared
collections) would drop, so a deploy never declares them (`tests/p115-hst014-cloudflare-deploy.test.ts`, the
undeclared-table arm; red on the old union).

**Left:** either the listing shows declared collections only, or the history's tables get a `_` prefix on a Worker
(`listTables` already skips `_` names). Low: nothing is lost, and nothing reaches a visitor.
