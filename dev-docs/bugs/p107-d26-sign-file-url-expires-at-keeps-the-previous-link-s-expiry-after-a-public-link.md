---
id: P107-D26
title: After Sign File URL mints a link with no expiry (a public link), Expires At and TTL keep the PREVIOUS link's values downstream
status: needs-ruling
severity: low
area: runtime / Sign File URL (`signfileurl.ts` success :156-164 — `undefined` flagged, never sent: CONTRACT C3)
found: P107 (the node says what it does) s30, 2026-10-03
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-014-BATCH-DATA-AND-CLOUD.md §6.28–§6.29 (row D26); scenario "re-signed to a public link: Expires At and TTL keep the previous link's on the wire" (scenarios/Sign File URL.json)
---

A sign that returns a `public` link carries no `expiresAt` / `ttlSeconds`. The node stores `undefined` and flags both
outputs, but the runtime never sends `undefined` (C3), so whatever is wired to Expires At still holds the expiry of the
link signed BEFORE — beside a URL that never expires. Same shape as D25 (Request Magic Link's Error kept after a Done) and
C47 (a user's fields kept after sign-out): one decision — "is 'empty' a blank text or nothing at all".

Graded s30: the scenario shows the second sign sending only Signed URL and URL Kind; seeds 20729 and 13 and at 10,000.
Reach is small: one node's links change kind only when its File moves between a public and a private file.

**Plain words:** *"If one Sign File URL node first signs a private file (link expires at 3pm) and then a public file
(link never expires), its Expires At still says 3pm. Clear it?"*

**Proposed:** with C47 / D25's ruling.

**Ruling:** R3 (a) — the runtime wins until Richard rules.
