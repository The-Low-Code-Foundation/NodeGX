---
id: P115-HST006-STALEROWS
title: "Query Records: after one person signs out and another signs in on the same device, the refused re-fetch left the first person's rows on screen"
status: fixed
commit: (this session's STALEROWS commit)
severity: high
area: "runtime / Query Records (`packages/noodl-runtime/src/nodes/std-library/data/dbcollectionnode2.ts`, the fetch `error` branch REL-011b guarded); the query's error callback (`ParseWireAdapter.query`, `RestDataAdapter.query`) dropped the HTTP status; contract `QueryOptions.error` (`packages/nodegx-backend-contract/src/data.ts`)"
regression: packages/noodl-runtime/test/nodes/rel011b-failed-fetch-keeps-rows.test.ts "P115-HST006-STALEROWS"; packages/noodl-runtime/test/backends/parse-wire-adapter.test.ts "P115-HST006-STALEROWS"
found: P115 HST-006 session 7, 2026-11-05, Richard on his phone on the deployed Fixture C (MUST line 5)
evidence: dev-docs/tasks/phase-115-online-on-your-own-account/HST-006-THE-CONTRACT-ON-D1.md §8.6
---

Richard signed in on `/owner` as the owner and read *Ada · Count me in*, signed out, and signed in as the second
account. The page then showed **Ada's answer and its date** beside *"This account cannot read the answers."* The
server was right (403); the screen was not. Reproduced with drive_page in that order (a fresh browser per account,
which is how session 7 first drove it, cannot show it).

Cause: REL-011b ruled that a failed re-fetch keeps the rows it already delivered, so a backend blip does not blank a
published page. It could not tell a blip from a REFUSAL, because the query's error callback carried only the message:
`ParseWireAdapter.query` called `options.error(res && res.error)` and dropped the status `_makeRequest` hands it. So
the rows one person was allowed to read stayed in front of the next person on the same device, in any app with a
sign-in and a list, until a reload.

Fix: the status travels (`QueryOptions.error(err, status)`, both adapters), and a 401/403 publishes the empty
collection as a first failure does; any other failure (no answer, 5xx, timeout) keeps the rows as REL-011b ruled.
Mutant: with the 401/403 test disabled in the node, 2 of 11 fail; with the status dropped in the adapter, 1 of 14.
Runtime api+nodes 371/371 and the 11 other adapter/query suites 348/348; contract and runtime tsc clean. Live in the
production engine on `hst-backend-spike` (`34f862a8`).

Not covered: a list that is NOT re-fetched after a sign-out still holds its rows (Campus hides that area when signed
out). Whether Query Records should drop its rows on a session change by itself is a separate question.
