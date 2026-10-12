---
id: P109-S46-MERGECAST
title: The enriched node catalog cannot be rebuilt — `catalog:merge` refuses the new array→optionslist cast
status: open
severity: medium
area: tooling / node catalog (`scripts/node-catalog/merge.js`, `docs/node-catalog/compatibility.json`)
found: P109 s46, 2026-10-11 (regenerating the enriched catalog after a one-line Router enrichment edit)
evidence: `node scripts/node-catalog/merge.js --check` → exit 1, "error: docs/node-catalog/compatibility.json: catalog typecast "array→optionslist" has no entry in castSemantics"
---

`node scripts/node-catalog/merge.js` (and `npm run catalog:merge:check`, which `.github/workflows/pr.yml` :281 runs)
exits 1 before writing anything:

    error: docs/node-catalog/compatibility.json: catalog typecast "array→optionslist" has no entry in castSemantics

The catalog gained the cast in `813657773` (P107 NSP-021 s88, 2026-10-11 22:57, "a list wires into a Dropdown's Items
again", R21); `compatibility.json` was last touched on 2026-09-17 and has no `castSemantics` entry for it. So the
enriched catalog (`packages/noodl-types/src/node-catalog-enriched.json`) cannot be regenerated, and the PR gate is red.
`catalog:generate --check` is green; only the merge refuses.

Found because P109 s46 edited `docs/node-catalog/enrichment/router.json` (Current Page Title's description) and could
not carry the edit into the enriched catalog. That edit is committed in the enrichment source and lands at the next
successful `catalog:merge`.

**Proposed:** P107 adds the `array→optionslist` entry to `castSemantics` (what the cast does to a list: it is R21's
ruling to describe, not this session's), then runs `catalog:merge` once.
