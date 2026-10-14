---
id: P107-S99-AGGNOPROP
title: An aggregate named in Aggregate Records' list whose Property was never chosen makes the node do nothing at all — no request, no Success, no Failure
status: fixed
severity: medium
area: cloud runtime / Aggregate Records (`aggregatenode.js` :297 `defs[a].prop` on `undefined`, inside the frame-end callback, which `nodecontext.ts` swallows)
found: P107 s99 (NSP-022), 2026-10-12 — measured on the real node through the runtime's cloud target before writing Aggregate Records' spec (NSP-022 §6.8)
evidence: `aggregates: 'total,extra'` with only `aggprop-total` written → no request, no signal, nothing on Error, for any number of frames; writing `aggprop-extra` then a Class write → the request goes. Same with a name holding a space or an empty name (`'total,'`)
regression: packages/nodegx-node-spec/scenarios/noodl.cloud.aggregate.json
kit: node-spec
commit: 9f3e69c9e
---

The throw is swallowed, so the function author sees a node that never answers. In the editor the only check is for a space in a
name (:116-139, an editor warning, absent in a deployed function). Combined with P107-S99-AGGCOLUMNS (no Property port drawn on
the built-in backend) this is the state every built-in-backend author lands in. The obvious fix is to skip an aggregate with no
Property (as one whose Property is not a column is skipped) — or to fail with a sentence naming it; a small decision.

The scenario "an aggregate named with no Property written: nothing at all — no request, no Success, no Failure — and writing its Property later asks for nothing either (P107-S99-AGGNOPROP)" pins today's behaviour; it moves when this is fixed.

**Fixed s100 (`9f3e69c9e`, R36 "Fail, naming it" — not the recommendation, skip + warn):** `missingProperty` fails the node before anything is asked: `The aggregate "extra" has no Property chosen.` (an empty name: `Aggregates lists an empty name.`).
