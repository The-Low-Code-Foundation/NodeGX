---
id: P112-OWN026-RECORDBYIDMEMORY
title: A Record whose Id names a record nothing in memory holds binds an empty one and fires Fetched, so a page opened by its own URL shows nothing and an Update Record fed from it writes the emptiness back
status: fixed
commit: pending
regression: packages/noodl-runtime/test/nodes/record-backend-routing.test.ts ("binding an Id nothing in memory holds"); packages/nodegx-node-spec/scenarios/DbModel2.json (v5 rows)
severity: high
area: runtime / Record (`packages/noodl-runtime/src/nodes/std-library/data/dbmodelnode2.ts` `setModelID`)
found: P112 OWN-026 t1-nodegx-2 (T1, T2), 2026-10-22; FIX-02 A
evidence: /Users/Shared/nodegx-lab/own026-grades/t1-nodegx-2/grade.json T1/T2 — reload the game page → "You are on the Moon"; a launch from there overwrote real progress (Asteroids → Mars)
---

`setModelID` bound `(modelScope || Model).get(id)`: the in-memory copy, or a new empty one when nothing had loaded
it, and `setModel` then pulsed `fetched` although nothing was read. Arriving from a list worked only because the
list's Query Records had already put the row in memory. Any page reached by its own URL (a reload, a bookmark, a
second device, a shared link) got an empty record, and the enrichment's "canonical detail-page shape" (Component
Inputs Id → Record) was exactly that shape.

Fixed: when no record of that id is held (`exists` before `get`), the bind is quiet and the record is read at the
frame end under the `Fetch` key (a press in the same pass shares the one read); `fetched` fires on the answer. No
outcome is minted (a bind is not an invocation; ERG-001's row holds); a failed bind read is said on `Error` and as an
editor warning. A record already held binds and pulses `fetched` at once, as before; with no Class chosen the bind
announces itself as before. Node spec v5 (`nodegx-node-spec/src/nodes/record.ts`) models it; conformance on seeds
3, 7, 99 and 20748: 0 divergences, every non-equivalent mutant killed. The port description and the catalog
enrichment say it.

Reaches an app only through a runtime built after the fix: `@nodegx/mcp`'s render harness (packed), and
`@nodegx/preview` once re-published (0.2.4 on the registry predates it). The React export still binds without
reading: P112-OWN026-EXPORTBINDREAD.
