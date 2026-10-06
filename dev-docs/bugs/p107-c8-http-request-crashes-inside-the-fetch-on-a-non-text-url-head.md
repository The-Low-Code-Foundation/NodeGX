---
id: P107-C8
title: HTTP Request crashes inside the fetch on a non-text URL, Headers, Query or Body Fields, and loses the outcome
status: fixed
commit: 283b46573
phase: P109
task: ISL-026
severity: medium
area: runtime / HTTP Request
found: P107 (the node says what it does) s8, 2026-09-30/10-01
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/net.noodl.HTTP.json "Headers wired a number, with a POST: the Fetch fails naming Headers (C8)"
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

**Ruled 2026-10-05 (Track F rulings page), as recommended: "Fail and say which input".** Failure fires with a message naming the bad input, so the person can find it. A small change near the start of the request. The question as asked: *"Should HTTP Request report a Failure, naming the input, when one of these inputs is not text?"* (https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH)

**Fixed 2026-10-06 (P109 s21, ISL-026), as ruled.** Before anything is built, the first of URL, Query Parameters, Headers
and (when a body is built) Body Fields holding a truthy non-text value fails the Fetch with `http/input-not-text`,
Error "<input> is not text". Spec v2; a new Headers scenario; the idle frame-end branch's dropped set is declared
equivalent. Runtime 200: conforms 18 / 19 (the C6 row stays known). Control: both C8 scenarios fail on HEAD's file, with
41 generated divergences. Not changed: `responseMapping` is also split, at response time; it was not in this row.

**s22 (2026-10-06):** the equivalent mutant declared with this fix did not reach `tests/world.test.ts`, which called `runConformance` without `EQUIVALENT_MUTANTS`, so HTTP failed there from `283b46573` on. Fixed in `3d0a57283` (world.test.ts 48 / 48).
