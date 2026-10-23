---
id: P112-OWN026-OWNERWRITABLE
title: A signed-in caller could rewrite a record's owner with an update, and a shared collection stored whatever owner the page sent, so the one field that looked like the server's word was not
status: fixed
commit: PENDING
regression: packages/nodegx-backend/tests/own026-owner-is-the-servers.test.ts
severity: high
area: backend / data plane (`packages/nodegx-backend/src/server/HttpServer.ts` `stampCreate`; `parse-wire.ts` `classPut` + upsert; `byob-admin.ts` save + batch; `mcp/McpRoutes.ts` update)
found: P112 OWN-026 FIX-05 (measure first), 2026-10-23
evidence: dev-docs/tasks/phase-112-your-own-nodegx/own-026/fixes/FIX-05.md "Done"; the probe's numbers are in the regression's docblock
---

`stampCreate` wrote the creator into `owner` on a creator-owned collection only, and nothing guarded `owner` on an
update. Measured on a live backend before the fix: `PUT {owner: <another user>}` on your own record answered 200 and
stored it (the ACL stayed yours), and a create into a `creatorOwns: false` collection stored the `owner` the page sent
(none sent: null). So a cloud function or query that trusted `owner` could be fooled exactly like one trusting any
other field.

Fixed: `owner` is the server's on every non-system collection. A session, a key bound to a user, or an anonymous
caller never writes it: a create names the caller (an anonymous one, nobody), and an update drops it. The update is
not refused, because an 'All' save sends the record back as read, `owner` included. An admin and an unbound server key
still may name an owner (a seed, a transfer, a function running as the system). The template ACL stays
creator-owns-only: who made a record is not who may read it.

An app may already use `owner` as its own link to one of its classes (SB-004's and DEF-012's `Chunk.owner` → `Owner`,
written by an anonymous dev-open caller): the suite caught the first version taking that field away. The server's
`owner` always points at `_User`, so a collection whose `owner` column is a Pointer to another class, or a first write
whose `owner` is a Pointer to another class, keeps it untouched. A declared `_User` (or untyped) column is the
server's whatever the value says: relabelling a forged pointer as another class does not get past it (tested).
Left open: a forger who is the very FIRST writer to a brand-new shared collection can claim `owner` as a link to
another class, after which that collection's records are not stamped. Any earlier signed-in write (which makes the
column a Pointer to `_User`) closes it; `provision_backend` does not declare `owner`, so it does not.
