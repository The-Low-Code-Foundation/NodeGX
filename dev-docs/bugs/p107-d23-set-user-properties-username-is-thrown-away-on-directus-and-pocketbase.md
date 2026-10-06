---
id: P107-D23
title: Set User Properties' Username is thrown away on Directus and PocketBase — the write says Done and the username never changes
status: scheduled
phase: P109
task: ISL-030
severity: low
area: runtime / REST auth adapter (`RestAuthAdapter.ts` `setUserProperties` :1607-1617); Set User Properties' port description
found: P107 (the node says what it does) s26, 2026-10-02
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-014-BATCH-DATA-AND-CLOUD.md §6.17 (row D23); the s26 probe (body sent `{"nick":"Z","email":"z@x"}` for Username `zed`)
---

The node always offers Username ("New username for the signed-in user") and hands it on; the REST adapter builds its body
from the properties and Email only — `options.username` is never read. Directus's `directus_users` has no username column,
so on that backend the port cannot work; PocketBase's stock users collection has none either. Measured s26 with the real
adapter: Username `zed` → the PATCH body `{"nick":"Z","email":"z@x"}`, Done.

**Plain words:** *"On a Directus or PocketBase project, the Username you give Set User Properties is silently ignored, and
the node still reports Done."*

**Proposed:** say so on the port, or refuse with a sentence when Username is set on a REST backend (the adapter's
"nothing is silently missing" rule, user-ports.ts rule 3).

**Ruling:** R3 (a) — the runtime wins until Richard rules.

**Ruled 2026-10-05 (Track F rulings page), as recommended: "Refuse with a reason".** The node fires Failure with a sentence saying this backend has no username, following the backend layer's rule that nothing is silently dropped. An app that sets Username alongside other details would see the whole save refused until it drops Username. The question as asked: *"On a backend with no usernames, what should Set User Properties do when Username is set?"* (https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH)
