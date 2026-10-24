---
id: P123-S6-CREATOREDITS
title: No rule in nodegx.security.json says "everyone reads a row, only its creator changes it" — creatorOwns hides the row instead
status: fixed
severity: medium
area: backend / security model (`packages/nodegx-backend/src/security/model.ts`, BAK-003 §5)
found: P123 s6, 2026-10-17, converting Bubble apps' privacy rules and workflow conditions into `nodegx.security.json` (`dev-docs/tasks/phase-123-open-bubble/import/bubble2nodegx.mjs`, `buildSecurity`)
evidence: dev-docs/tasks/phase-123-open-bubble/import/IMPORT.md §14 ("creator-only writes"); BAK-003 §5 says a `creatorOwns` row's ACL is `{ "<creatorId>": { read, write } }` and nothing else, so the row is invisible to every other reader; `validateRuleAtom` accepts `public | authenticated | nobody | role:<name> | { path }` and nothing that names the row's own creator
commit: e67148acd
ruled: (a), by Richard 2026-10-24 ("Ruling: Do A")
regression: packages/nodegx-backend/tests/p123-creator-edits.test.ts "12/12; a mutant granting `creator` outright turns 6 red"
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

## Fixed (2026-10-24, ruling (a))

`"creator"` is a rule value. On `find`, `get`, `update` and `delete` (and a field's `read`, a move's `by`) it lets a
signed-in caller in to the rows whose `owner` names them: the field the server stamps on every create and no caller
writes (OWN-026 FIX-05). It narrows like a path rule (`{ owner: <caller> }` in the same ACL `only`), ORs with every
other atom, and is refused on `create`, a function, a file and signup with the reason (a row being created has nobody
who made it yet). So Bubble's posture is one entry:

```json
"Listing": { "creatorOwns": false, "permissions": { "find": "public", "get": "public", "create": "authenticated", "update": "creator", "delete": "creator" } }
```

Measured on a running backend: another signed-in person reads the listing and is answered 404 on a change or a delete
(as for a row ACL: whether the row is there is not said), someone not signed in 403, the maker 200; a forged `owner` on
create does not make someone else the maker; an admin's seed with no owner is changed by the admin only; `["creator",
{ path }]` lets a moderator the path reaches change a note, and `delete: "creator"` alone still refuses them.

Also: `set_collection_permissions` says the value, the enforced-rules note tells the agent the one-line posture, the
backend map's "Adding, changing or deleting" choices offer *Only the person who made it* (writes create
`authenticated`, update and delete `creator`; reads it back as that choice), and Studio's Privacy offers the same
choice when its map has it. A collection whose `owner` is the app's own link to another class (`ownerFieldIsTheApps`)
matches nobody under `creator`: it fails closed. The backend map's own drive (`rule-change.test.mjs`) runs against
the backend inside `@nodegx/preview` on npm, which does not know `creator` yet: the choice works end to end only after
the next backend release.

