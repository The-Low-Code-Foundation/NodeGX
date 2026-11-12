---
id: P112-OWN026-UNDEFINEDTABLE
title: "Opening a page about one record made an empty table named `undefined` on the app's backend, and Studio's Data tab lists it as a type"
status: open
severity: medium
area: runtime (a data node asking for class `undefined`) + nodegx-backend (a read of an unknown class creates the table)
found: P112 OWN-026 §7, 2026-11-02 — Watering Can, built by Mistral Large 4.0 in Vibe 3.0.4 (@nodegx/mcp 0.2.9 + ff68fa845), opened in NodeGX Studio 0872094
evidence: /Users/Shared/nodegx-lab/own026/mistral/wc-nodegx-1 (agent.jsonl call 303; home/.noodl/backends/backend_mvzsfytz4whhz/data/local.db `_Schema` row `undefined`, created 2026-11-02 22:13:15 UTC)
---

**What a person sees:** Studio → Data → Data types lists `_User`, `plants`, `waterings` and **`undefined` — on the backend**.
The backend's own admin schema has the table: `{"name":"undefined","columns":[]}`, no rows.

**When it was made:** 22:13:15 UTC, during the round's `drive_page` call 303 (22:13:14.47–22:13:16.00): sign in as a
test user, tap the "Spike" card on Home, wait for the Plant page. No tool call in the round names a collection
`undefined` (`provision_backend` named plants and waterings; every import and export named its collection). So the
running app asked for it while a Plant page opened.

**The Plant page's data nodes all name a collection:** `DbModel2` "Plant record" (`plants`), `DbCollection2` "Watering
history query" (`waterings`), `CloudFunction2` "Call Water plant". Not yet separated: which of them sent the request,
and whether it is a fetch fired before its `collectionName` arrived (an id wired from page data).

**The backend's half, measured on a copy (2026-11-02):** `GET /classes/zzprobe?limit=1` answered 200 and the admin
schema then listed `zzprobe`. A read of a class that does not exist creates it. That request was the admin's
(Studio's proxy); the app's was a signed-in user's.

**To do:** reproduce with the app (sign in, open a plant, watch the network for `/classes/undefined`), find the node,
and decide whether a read should ever create a table (a 404 or an empty answer would have kept the schema clean).
