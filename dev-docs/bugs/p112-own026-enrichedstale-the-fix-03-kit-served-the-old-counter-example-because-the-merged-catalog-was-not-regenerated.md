---
id: P112-OWN026-ENRICHEDSTALE
title: The FIX-03 and FIX-04 kits served the old cloud-shared-counter (a script increment), not FIX-03's Add To version, because the committed merged catalog was not regenerated after the example changed
status: fixed
commit: fbd337bfe
regression: packages/noodl-types/src/node-catalog-enriched.json (regenerated; `npm run catalog:merge:check`)
severity: medium
area: kit / catalog build (`packages/noodl-types/src/node-catalog-enriched.json`, read by `packages/noodl-mcp/src/catalog.ts` and bundled into `dist/noodl-mcp.cjs`)
found: P112 OWN-026 FIX-05, 2026-10-23
evidence: `kits/FIX-03-cb7e0d6e4/nodegx-mcp-0.2.5.tgz` `dist/noodl-mcp.cjs` holds the old title ("add on the server, take each press once") once and FIX-03's ("Update Record adds on the server, each press taken once") zero times; `git show cb7e0d6e4:packages/noodl-types/src/node-catalog-enriched.json` has no `"addTo": "points"`
---

`get_example` and `list_examples` read the generated `node-catalog-enriched.json`, not `docs/node-catalog/examples/`.
FIX-03 rewrote `cloud-shared-counter` as Button + Record + Update Record with Add To, and did not regenerate the
merged file, so its kit, and FIX-04's (packed from the same sources), still served the script version
(`Noodl.Records.increment` in a Function). That is still safe, but it is not the "no script" short path the FIX-03 Done
section describes. FIX-03's `list_examples` measurement matched on the title, which both versions share at the front.

Fixed by regenerating it (`npm run catalog:merge`) in FIX-05's commit, so the FIX-05 kit is the first to carry it.
The gate exists and catches it: `node scripts/node-catalog/merge.js --check --require-coverage` at `cb7e0d6e4`
answers "Stale enriched catalog … does not match the authored inputs". It was not run on the commit that shipped.
