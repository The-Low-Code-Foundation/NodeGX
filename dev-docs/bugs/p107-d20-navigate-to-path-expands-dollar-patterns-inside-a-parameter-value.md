---
id: P107-D20
title: Navigate To Path expands $&, $$ and friends inside a parameter value
status: fixed
commit: 9404f00c4
phase: P109
task: ISL-028
severity: low
area: runtime / Navigate To Path (viewer)
found: P107 NSP-015 s17, 2026-10-01
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/PageStackNavigateToPath.json "a parameter value holding $& is inserted as written (v2, D20)"
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-015-BATCH-NAVIGATION-AND-COMPONENTS.md §6.1c, §6.2
---

A Navigate To Path parameter value containing `$&` puts the placeholder back (`/product/{id}` with id
`$&` navigates to `#/product/{id}`); `$$` becomes `$`, and ``$` `` / `$'` paste the text before / after the
placeholder. The description says the node fills each placeholder "from their input ports".

Where: `navigate-to-path.ts` :172 — `formattedPath.replace('{' + name + '}', String(v))` uses a string
replacement, which JavaScript reads as a replacement pattern. The same shape as String Format's D3.

Reproduce: `scenarios/PageStackNavigateToPath.json`, "a parameter value holding $& …" (the spec
follows the runtime; this row asks whether it should).

Proposed: replace with a function (`() => value`) so a value is inserted as written. Ships alone.

**Ruled 2026-10-05 (Track F rulings page), as recommended: "Insert values as written".** Any value, dollar signs included, lands in the address unchanged. One line in one place, the same fix as String Format's. The question as asked: *"Should parameter values always be inserted exactly as written?"* (https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH)

**Fixed 9404f00c4 (P109 ISL-028, 2026-10-06), as ruled.**
