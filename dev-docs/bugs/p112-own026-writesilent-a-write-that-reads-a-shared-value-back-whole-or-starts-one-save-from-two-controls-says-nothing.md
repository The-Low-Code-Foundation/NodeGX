---
id: P112-OWN026-WRITESILENT
title: A write whose Update Record writes back a field worked out from the same field the page read, or whose save two controls start through different nodes, is accepted without a word
status: fixed
commit: cb7e0d6e4
regression: packages/noodl-editor/tests-unit/validation/sharedValueWrites.test.ts
severity: medium
area: validation (`packages/noodl-editor/src/editor/src/validation/sharedValueWrites.ts`, `authoredCandidate.ts`)
found: P112 OWN-026 t1-nodegx-3, 2026-10-23; FIX-03 C
evidence: t1-nodegx-3 `Pages/Launch Pad`: Record `prop-fuel` → Function → Update Record `prop-fuel`; FIX-02 had judged "a value several devices change" untestable
---

The lesson sat in the guidance, away from the decision. Two shapes are decidable from the graph and now come back in
the write's own answer as infos (never blocking): `shared-value-written-back-whole` (an Update Record `prop-X` fed,
through at least one node, from a same-class Record's `prop-X`, the field in neither Add To nor Only If Unchanged;
suggestion `"addTo": "X"`, example `cloud-shared-counter`) and `two-controls-start-one-save` (two press controls reach
one save's Do through different first nodes, so the runtime's shared guard does not cover them). Walks are three hops,
inside the component.
