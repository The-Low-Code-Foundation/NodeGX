---
id: P107-C8
title: HTTP Request crashes inside the fetch on a non-text URL, Headers, Query or Body Fields, and loses the outcome
status: needs-ruling
severity: medium
area: runtime / HTTP Request
found: P107 (the node says what it does) s8, 2026-09-30/10-01
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-007-THE-WORLD.md §6 (row C8) — the row names how it is reproduced and pinned
---

HTTP Request crashes inside the fetch on a non-text URL, Headers, Query or Body Fields, and loses the outcome.

**Node:** HTTP Request

**What, with the line:** A non-string `url` (`.match`, :1069), or a truthy non-string `headers` / `queryParams` / `bodyFields` (`.split`, :909-975), throws inside `doFetch` AFTER the tokens were drained (:1050-1051); nodecontext.ts :472 swallows it. The Fetch's outcomes are never reported — no `Failure`, no `Completed` — and nothing says why

**How it is pinned:** scenario *a non-string URL loses the Fetch's outcome for good (C8)*; the spec models the loss (pending invocations never settled)

**Proposed answer:** **runtime bug** (the C3 family, NSP-004): coerce with `String()` where the node reads text, or report `failure` before the throw

**Ruling:** P107's rule R3 (a) — the runtime wins until Richard rules; each fix then ships alone, with the
scenario's `row` mark and the known-row predicate (packages/noodl-runtime/test/node-spec/conformance.test.ts)
dropped in the same commit. Plain-words question: README §7 of P107.
