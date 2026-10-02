---
id: P107-C47
title: After a session ends (Log Out, Session Lost), a User node's Id, Email, Username and property outputs keep the person who left on every wire — only Authenticated moves
status: needs-ruling
severity: medium
area: runtime / User (`user.ts` `setUserModel` :353-379) — CONTRACT C3
found: P107 (the node says what it does) s26, 2026-10-02
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-014-BATCH-DATA-AND-CLOUD.md §6.17 (row C47); scenarios/net.noodl.user.User.json "C47 — …", "C46 + C47 — …"
---

When nobody is signed in any more, `setUserModel(undefined)` flags Id, Authenticated, Email, Username and Roles, and the
getters read `undefined` for all but Authenticated — and `undefined` is never sent (`Node.sendValue` returns, CONTRACT C3).
The property outputs are not even flagged (:375 returns before the loop). So every wire from them keeps the last
signed-in user's values; only Authenticated changes to `false`.

**What the runtime does (measured s26):** a Fetch the backend rejects, and the page-load check rejected — the trace
carries `authenticated: false` and nothing else; Id / Email / Username / `prop-*` hold `u1`, `ann@example.com`, `ann`.

**Plain words:** *"After someone logs out (or their login expires), a 'Signed in as ann@example.com' label still shows
ann@example.com — on a shared device the next person sees who was here before."*

**Proposed:** on an ended session send an explicit empty value — `''` for Id, Email and Username, `null` for Roles and the
properties (needs a ruling on what "empty" is on these ports; the descriptions already say "empty while nobody is signed in").

**Ruling:** R3 (a) — the runtime wins until Richard rules; the spec states C3 as the runtime does.
