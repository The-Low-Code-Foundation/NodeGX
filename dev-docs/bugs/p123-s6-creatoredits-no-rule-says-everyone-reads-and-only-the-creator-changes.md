---
id: P123-S6-CREATOREDITS
title: No rule in nodegx.security.json says "everyone reads a row, only its creator changes it" — creatorOwns hides the row instead
status: needs-ruling
severity: medium
area: backend / security model (`packages/nodegx-backend/src/security/model.ts`, BAK-003 §5)
found: P123 s6, 2026-10-17, converting Bubble apps' privacy rules and workflow conditions into `nodegx.security.json` (`dev-docs/tasks/phase-123-open-bubble/import/bubble2nodegx.mjs`, `buildSecurity`)
evidence: dev-docs/tasks/phase-123-open-bubble/import/IMPORT.md §14 ("creator-only writes"); BAK-003 §5 says a `creatorOwns` row's ACL is `{ "<creatorId>": { read, write } }` and nothing else, so the row is invisible to every other reader; `validateRuleAtom` accepts `public | authenticated | nobody | role:<name> | { path }` and nothing that names the row's own creator
---

A Bubble app's commonest posture is *everyone sees a listing, only the person who made it edits or deletes it*: a
privacy rule `everyone: view all + find`, and the page's *Make changes* / *Delete* steps behind `This Listing's
Creator is Current User`. NodeGX's rule vocabulary cannot say that in one file. `creatorOwns: true` stamps the new row
with an ACL that lets ONLY the creator read it, so it cannot sit beside `find: "public"`; and `update` / `delete`
take `public | authenticated | nobody | role:<name> | { path }`, none of which names the row's own creator — a
`{ path }` starts at the caller's `_User` row and follows a field, and `createdBy` is not a field a hop can follow
back today (the import declares no column for it).

What the importer does meanwhile: when every page write of a type ran only for its creator, it writes
`update: "authenticated"` with `creatorOwns: false` and a finding that any signed-in caller may now change any row the
read rule shows them, naming a cloud function that checks `createdBy` as the way to keep Bubble's guarantee.

Ruling wanted: (a) a rule atom for the creator (`"creator"`, or a `{ path }` that may hop `_User → <coll> by
createdBy`) on `update` and `delete`, so `find: public` + `update: creator` is one line; or (b) the posture stays
"write it as a function". (a) is the shape every Bubble app and most NodeGX templates (a board, a journal, a
marketplace listing) want; (b) keeps the vocabulary as it is.
