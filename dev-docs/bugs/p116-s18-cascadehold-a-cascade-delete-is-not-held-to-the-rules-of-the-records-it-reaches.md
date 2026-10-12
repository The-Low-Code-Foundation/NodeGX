---
id: P116-S18-CASCADEHOLD
title: A bound caller's delete cascades (`goes-too`, `stays-unlinked`) into records whose own `onlyWhile` rule says "never deleted" or "frozen", and the rule is not asked
status: fixed
severity: high
area: backend / the delete cascade (`@noodl/backend-contract` `targetGoes.ts` `deleteKeepingLinks`: the cascaded `ctx.delete` and `ctx.save` run with no ACL; `nodegx-backend/src/persistence/AdapterFacade.ts` `deleteHeld` wires them to the raw adapter calls, past `heldWhile`) and the ACL option (`StorageAclOption.onlyWhile` carries ONE collection's rule, the one the route named, so the facade cannot hold a cascaded write even if it tried)
found: P116 ONT-014 s18 (the Fable reach review), 2026-10-11
evidence: packages/nodegx-backend/tests/ont-014-reach-review.test.ts cases 5a and 5b (`it.failing`, both engines)
regression: packages/nodegx-backend/tests/ont-014-reach-review.test.ts "5a. [P116-S18-CASCADEHOLD, R-i]", "5b. …" and the guard "5c. …" (both engines)
---

`Envelope` says `delete: "never"` ("a sealed envelope is never deleted"). `Envelope.owner` is a link to `Keeper`
with `whenTargetGoes: 'goes-too'`. A signed-in learner, who may write the keeper, sends `DELETE
/classes/Keeper/:id`. Measured 2026-10-11 on SQLite and PostgreSQL: **200, and the envelope is gone** (its `GET` is a
404). The same learner's `DELETE /classes/Envelope/:id` is the 409 the rule promises.

The second shape: `Invoice.customer` is a link to `Keeper` with `stays-unlinked`, and `Invoice` freezes `customer`
`unless` the invoice is a draft. The learner deletes the keeper of an **issued** invoice: 200, and `customer` is
emptied. The learner's own `PUT` of that field is the 409.

ONT-012 §3.1 and ONT-014 §3.2 say who the rule binds: "every caller the row ACL binds"; functions and the admin are
not bound because "a function is how an amend is made". A cascade is neither: it is the SAME person's delete,
reaching other records through a link the schema declared. The cascaded writes run as the store's own key
(`deleteKeepingLinks` calls `ctx.delete(g.collection, g.objectId)` and `ctx.save(u.collection, …, { [field]: null })`
with no ACL), and the facade's hooks for them (`deleteHeld`) go to the raw adapter, past `heldWhile`. Even held,
the ACL option carries only the named collection's `onlyWhile` (`SecurityState.aclFor` → `onlyWhileFor(config,
collection, principal)`), so the envelope's rule is not in the learner's option when they delete a keeper.

**What it should do (the recommendation, for the ruling below):** judge the cascade BEFORE anything is deleted, as a
`blocks` rule is judged: `planDelete` already lists every row that goes and every link that is emptied; for each,
ask the target collection's `onlyWhile` (`delete` for a `goes-too` row, `update` with that one field for a
`stays-unlinked` row); a refusal is the whole delete refused, 409, in the envelope's words, nothing changed. The
pieces: `StorageAclOption.onlyWhile` becomes per collection (as `hidden` and `reach` already are), `aclFor` fills
every collection that has one, `heldWhile` indexes by collection, and `DeleteContext` gains a `held` hook the facade
answers. `moves` does not arise (emptying a link is not a move). The vocabulary (ONT-011 step 2) should also refuse
the contradiction at authoring: a world that says both "goes when its keeper goes" and "never deleted" has
answered one question twice.

**Ruling owed to Richard (plain words):** when someone deletes a keeper, and the keeper's envelope "is never
deleted", does the delete stop in the envelope's words, or does the envelope go with the keeper? Recommendation: it
stops; only the admin credential (or a function) can delete the keeper then. Same for a frozen link: the delete
stops rather than emptying a field the person may not change.

Not a fix for ONT-014's own doors: every direct door (PUT, upsert, BYOB, batch, increment, relation PUT, DELETE, MCP)
is held. This is the one indirect door, and it is the schema's own.

**Ruled 2026-10-11 (s20, R-i): the delete stops.** **Fixed s20 (Opus 5.5):** `StorageAclOption.onlyWhile` is per
collection (`Record<collection, { update?, delete? }>`), `aclFor` fills every collection that has a rule for a bound
writer, `heldWhile` reads `acl.onlyWhile[collection]`, and `DeleteContext` has a `held(plan)` hook that
`deleteKeepingLinks` asks after planning and before anything is deleted. The facade answers it with
`heldCascade` (`persistence/onlyWhile.ts`): each row that goes is judged by its collection's `delete`, each link it
would empty by `update` of that field to nothing — the condition only, as the store's key (the cascade runs as that
key, R10) — and a refusal is a 409 in that clause's words naming the reached collection, with nothing deleted. The
hook asks only once the caller may delete their own record (5c: a stranger gets the delete's own 404, never a 409
that says what links to it). The admin and functions are not bound (5a's control). Each of 5a/5b red with the hook
disabled, 5c red with the own-record check removed; the claims' `writeAcl` carries every reached collection's rule.
Not built: refusing the contradiction at authoring (a world that says "goes with its keeper" and "never deleted").

