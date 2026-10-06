---
id: P107-C7
title: HTTP Request's authentication presets never send a credential
status: fixed
commit: 684d881f2
phase: P109
task: ISL-030
severity: high
area: runtime / HTTP Request
found: P107 (the node says what it does) s8, 2026-09-30/10-01
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/net.noodl.HTTP.json "Bearer authentication sends Authorization: Bearer <token> (v3, C7)" (and the Basic, API Key header and API Key query scenarios beside it)
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

**Ruled 2026-10-05 (Track F rulings page), as recommended: "Fix it, send the credential".** Bearer adds the Authorization header, Basic adds the encoded user name and password, API Key adds the header or query parameter. A small change in one node. An app that worked round it with its own Authorization header could now send the credential twice, so the fix names that in its notes. The question as asked: *"Should the Authentication setting send the credential it was given?"* (https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH)

**Fixed 684d881f2 (P109 ISL-030, 2026-10-06), as ruled.** `authInputs` hands the configurators the `auth-…` values with the prefix stripped, at both call sites (URL and headers). The Authentication port says Bearer and Basic set the Authorization header, so leave Authorization out of Headers — the note the ruling asked for. HTTP Request v3. The export already read `auth-authToken` (`plan.ts`): nothing owed to P18.
