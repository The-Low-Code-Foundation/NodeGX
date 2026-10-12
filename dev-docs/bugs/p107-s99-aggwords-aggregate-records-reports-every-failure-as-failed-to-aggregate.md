---
id: P107-S99-AGGWORDS
title: Aggregate Records reports every backend failure as "Failed to aggregate." — the server's own words (a 400 naming its cause, a refusal) never reach Error
status: open
severity: medium
area: runtime / the Parse wire (`packages/noodl-runtime/src/api/backends/ParseWireAdapter.ts` :467-470 `aggregate`'s `error: function () { options.error(); }`; `count` and `distinct` the same, :488-490, :505-507)
found: P107 s99 (NSP-022), 2026-10-12 — measured on the real node through the runtime's cloud target before writing Aggregate Records' spec (NSP-022 §6.8)
evidence: a 400 `{"code":141,"error":"Unknown aggregate operator"}` → Error `Failed to aggregate.`; a 500 HTML page, a body that is not JSON and a network fault say the same
regression: packages/nodegx-node-spec/scenarios/noodl.cloud.aggregate.json
kit: node-spec
---

P99 HLT-023 fixed exactly this for `query` two methods above ("pass the server's words on, as `fetch` and the rest do").
`aggregate`, `count` and `distinct` were missed. The fix is one argument (`options.error(res && res.error)`); a planted copy with
it is caught by the spec today (NSP-022 §6.8), so the fix will move the scenario and owes a version bump.

The scenario "a 400 that names its cause: Failure, and the server's words are lost (P107-S99-AGGWORDS)" pins today's behaviour; it moves when this is fixed.
