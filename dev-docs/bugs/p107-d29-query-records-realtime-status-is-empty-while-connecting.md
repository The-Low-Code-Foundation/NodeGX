---
id: P107-D29
title: Query Records — Realtime Status reads empty while the subscription is connecting; its description (and Subscribe To Changes) say "connecting"
status: fixed
commit: 4763f5a00
severity: low
area: runtime / Query Records (`dbcollectionnode2.ts` :707-713 — `createRealtimeSubscription` without reading the handle's status; Subscribe To Changes reads it, subscribetochanges.ts :451)
found: P107 (the node says what it does) s35, 2026-10-03
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-014-BATCH-DATA-AND-CLOUD.md §6.43–§6.45 (row D29); scenario "slice C: Subscribe To Changes on with a Class — … Realtime Status stays empty until the subscription says subscribed" (packages/nodegx-node-spec/scenarios/DbCollection2.json), passing on the interpreter AND the runtime; the runtime trace prints `realtimeStatus ""` at the frame that subscribed
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/DbCollection2.json "slice C: Subscribe To Changes on with a Class — the query, then the subscribe `{ collection, primaryKey }` with NO filter though one is set; Realtime Status `connecting` at once (v2, D29 fixed), `subscribed` when the subscription says so"
---

Realtime Status's description reads "connecting, subscribed, interrupted or stopped. Four states rather than a boolean,
because 'connecting for the first time' and 'dropped and retrying' want different things on screen". On Query Records it
reads `""` from the moment Subscribe To Changes is turned on until the backend first tells a status. A subscription starts
`connecting` and the realtime layer never tells a status equal to the one it holds, so `connecting` never arrives. Subscribe
To Changes reads the handle's status after subscribing and shows `connecting`. Query Records does not.

**Plain words:** *"Query Records' Realtime Status is blank while it connects, though the port says it shows 'connecting'
(and the Subscribe To Changes node does). Show 'connecting' there too?"*

**Proposed:** after `createRealtimeSubscription`, `handleRealtimeStatus(subscription.status)` — Subscribe To Changes' line.

**Ruling:** Richard, 2026-10-03: *"Yes, say connecting"*. Fixed in s36: the proposed line at dbcollectionnode2.ts :714. Query Records spec v2; control red → treatment green on three seeds and at 10,000 (NSP-014 §6.46).
