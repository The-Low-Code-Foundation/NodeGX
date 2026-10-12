---
id: P107-D11
title: HTTP Request reports a JSON body that fails to parse as a network error
status: fixed
commit: 962edf855
phase: P109
task: ISL-030
severity: medium
area: runtime / HTTP Request
found: P107 (the node says what it does) s8, 2026-09-30/10-01
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/net.noodl.HTTP.json "Response Type JSON on a body that is not JSON: Failure, Error says so — under http/bad-body (v4, D11)" (and "Auto on an application/json answer that is not JSON: Failure under http/bad-body (v4, D11)")
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

**Ruled 2026-10-05 (Track F rulings page), as recommended: "Give it its own code".** A new code says the server answered but the body could not be read. The message stays the same. An app that checks for the network-error code in exactly this case would stop matching, which is unlikely. The question as asked: *"Should a reply that cannot be read as JSON get its own error code?"* (https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH)

**Fixed 962edf855 (P109 ISL-030, 2026-10-06), as ruled.** The parse failures are marked where they happen (`badBody`) and the catch reports `http/bad-body`; the message is unchanged. The error is marked, never wrapped: a parser error from another realm is not `instanceof Error`, and re-making it put "SyntaxError: " in front of the message (the first spec run caught it). HTTP Request v4. The enrichment lists the new code. **The export has the same fault** (a failed `response.json()` carries no code, so the exported node reports `http/network-error`): filed for P18 as `P109-S24-EXPORTBADBODY`.
