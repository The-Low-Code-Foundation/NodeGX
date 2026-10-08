# ONT-004 — Paths join the contract

**Opened 2026-10-08.** **Depends on R3.** Can start beside ONT-001. **Status: 📋 not started.**

> **Model check, before anything (Richard, 2026-10-08):** this task wants **Fable 5.1 for the operation's semantics and the capability cells; Opus 5.5 for the per-adapter build** — a cell marked supported without proof is the gate hole memory keeps finding; the adapter work is graded by the suite. Your system prompt says which model you are. If it is not the one named here, stop before any work and say so in one line ("this task is marked for Fable 5.1; you are on <model> — switch with /model, or say go"), and wait for Richard's word. Do not start on the wrong model because the check felt like a formality.


## 1. The person sentence

> **I can ask for "the members on my account's companies" and get them, and if a backend cannot answer that, it says
> so before I build on it.**

## 2. Why

README §1 readings 2 and 6. The contract follows one link (`relatedTo`, a Parse shape); Acme's account-holder
permission is four links deep, and its most-used filter is three. A person's question is a path. Today every such
question is answered in application code after fetching too much, which is where Acme's dashboard answers them.

## 3. What to build

1. **The operation.** `traverse(handle, options)` as the fifteenth data method, or a `path` operator in the neutral
   filter model, whichever BCN-001's extraction rule allows (the method was extracted from `cloudstore.js`; this one is
   designed, and the README must say so). Options: a start (a collection and a filter), a list of hops (a Link, a Links
   or a junction, each with an optional filter), a depth bound, and what to return (the end rows, or the paths).
2. **The capability cell.** `traverse` in `capabilities.ts` with the four states; every descriptor gets the cell with
   evidence. The built-in adapters prove it; the others start `conditional`.
3. **The relational answer.** SQLite and Postgres through recursive common table expressions in the built-in backend's
   query builder; depth-bounded; the emitted SQL is not asserted, the rows are (BRG-003 §3.3's rule).
4. **The fixtures.** Acme's four paths from README §1 reading 6 on a synthetic schema of the same shape; the deepest
   is the permission rule, written as a *who can see this record* rule in P104's words.
5. **The person's sentence.** A path has a sentence form ("the members on my account's companies"); the projection
   (ONT-003) compiles a relation chain in the ontology to the operation, and the manager's filter builder gains it as
   one row kind.

## 4. Acceptance criteria

1. The four Acme-shaped paths return the right rows on SQLite and Postgres through the conformance suite, with a
   mutant per path (a hop dropped, a filter dropped, the depth bound ignored) that fails.
2. A backend whose cell is `unsupported` makes the manager's path row disabled with the reason shown, as every other
   gated port.
3. The permission rule at depth four is enforced by the backend, not by the dashboard: a request as the wrong account
   holder gets nothing.
4. The contract README's method count and the capability key count are updated and the hex and TSFixme ratchets are
   unmoved.

## 5. Watch for

- **Count the request, not the node** (memory). One traversal is one request; a fixture that passes by issuing four
  requests is wrong, and the world's BACKEND seam (NSP-014) can see the count.
- **A whitelist gate is blind to a later node class** (memory). The security model's rule vocabulary is `public`,
  `authenticated`, `nobody`, `role:<name>`; a path rule is a new shape and SEE-012 must learn it.
- **Depth without a bound is a denial-of-service shape.** The bound is mandatory in the options type.

## 6. Built

*(empty)*
