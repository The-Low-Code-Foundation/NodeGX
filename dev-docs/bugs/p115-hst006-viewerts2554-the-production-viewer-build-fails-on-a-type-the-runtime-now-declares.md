---
id: P115-HST006-VIEWERTS2554
title: "viewer build: the production viewer (`npm run build:editor:_viewer`) failed with TS2554, so no deploy could carry a production engine"
status: fixed
commit: c4b0844a4
severity: high
area: "viewer / `packages/noodl-viewer-react/src/nodes/std-library/user/userservice.ts` :130 (the `ParseAuthAdapter` serialiser), against `packages/noodl-runtime/dist-types/src/api/cloudstore.d.ts` (generated, gitignored)"
regression: "the viewer's production webpack (webpack-configs/webpack.deploy.prod.js) compiling with 0 errors is the check: ts-loader type-checks"
found: P115 HST-006 session 7, 2026-11-05, building a production engine for Fixture C's deploy
evidence: dev-docs/tasks/phase-115-online-on-your-own-account/HST-006-THE-CONTRACT-ON-D1.md §8
---

`nodegx deploy` refuses the development viewer (16.5 MB, 10.9 MB of it the viewer source as an inline map) and asks
for `npm run build:editor:_viewer`. That build failed:
`userservice.ts(130,61): TS2554: Expected 3 arguments, but got 2` — `CloudStore._serializeObject(data, collectionName)`.

Cause: `cloudstore.js`'s `_serializeObject(data, collectionName, modelScope)` has always taken three, but the viewer
type-checks against the runtime's GENERATED types (`noodl-runtime/dist-types`, gitignored), regenerated 2026-11-04
22:16, which now declare all three. The build attempt a minute later (22:17) wrote `noodl.deploy.inputs.json` and never
replaced `noodl.deploy.js` (still dated 2026-11-03): nobody saw it fail, because a deploy then warns about a stale or a
development engine, not about a red build.

Fix: the call names the third argument, `undefined`, which is what JavaScript passed before (the module-scope
serialiser, as the comment beside it says). Measured: the deploy bundle builds (webpack, 0 errors, 17 s), 1.81 MB
against 17.3 MB for the development one, and Fixture C runs on it on Cloudflare.

Not done here: `build:editor:_viewer` itself (it runs `npm i` and `lerna clean` on the viewer package, which this shared
checkout should not have run under it). The session built only the deploy bundle, into a scratch folder.
