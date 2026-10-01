---
id: P107-C7
title: HTTP Request's authentication presets never send a credential
status: needs-ruling
severity: high
area: runtime / HTTP Request
found: P107 (the node says what it does) s8, 2026-09-30/10-01
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-007-THE-WORLD.md §6 (row C7) — the row names how it is reproduced and pinned
---

HTTP Request's authentication presets never send a credential.

**Node:** HTTP Request

**What, with the line:** The authentication presets contribute NOTHING. `authConfigurators` read `inputs.authToken`, `inputs.authUsername` … (httpnode.ts :131-157) from `_internal.inputValues`, which the `auth-…` ports fill under their FULL names (`_storeInputValue(name)`, :421-423, :452-462) — so `bearer` never adds `Authorization`, `apiKey` never adds a header or a query parameter. The docblock at :114-118 says the prefix is "stripped by the port names themselves"; nothing strips it

**How it is pinned:** scenario *Bearer authentication adds no header (C7)* — the request carries no `Authorization` on the interpreter AND the runtime; `authType` is stored beside the value ports in the spec because nothing observable reads it (a state key of its own had two ungradable mutants)

**Proposed answer:** **runtime bug**: read the bag by the prefixed names (or strip the prefix when storing). A behaviour change; ships alone. Then the spec's `authContribution` reads `values['auth-…']`, `authType` gets its key back, and the scenario flips to asserting the header

**Ruling:** P107's rule R3 (a) — the runtime wins until Richard rules; each fix then ships alone, with the
scenario's `row` mark and the known-row predicate (packages/noodl-runtime/test/node-spec/conformance.test.ts)
dropped in the same commit. Plain-words question: README §7 of P107.
