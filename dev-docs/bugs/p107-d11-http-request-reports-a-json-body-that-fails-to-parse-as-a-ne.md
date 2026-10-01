---
id: P107-D11
title: HTTP Request reports a JSON body that fails to parse as a network error
status: needs-ruling
severity: medium
area: runtime / HTTP Request
found: P107 (the node says what it does) s8, 2026-09-30/10-01
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-007-THE-WORLD.md §6 (row D11) — the row names how it is reproduced and pinned
---

HTTP Request reports a JSON body that fails to parse as a network error.

**Node:** HTTP Request

**What, with the line:** A body that fails to parse under `Response Type: JSON` (:1139-1150) or an `application/json` answer under Auto reaches the `.catch` (:1191-1203), whose code is `http/network-error` — "never reached a server" — for a request the server answered 200

**How it is pinned:** scenario *Response Type JSON on a body that is not JSON: … under http/network-error (D11)*

**Proposed answer:** **runtime bug**: an `http/bad-body` code (a new one in `HTTP_ERROR_CODES`), message unchanged

**Ruling:** P107's rule R3 (a) — the runtime wins until Richard rules; each fix then ships alone, with the
scenario's `row` mark and the known-row predicate (packages/noodl-runtime/test/node-spec/conformance.test.ts)
dropped in the same commit. Plain-words question: README §7 of P107.
