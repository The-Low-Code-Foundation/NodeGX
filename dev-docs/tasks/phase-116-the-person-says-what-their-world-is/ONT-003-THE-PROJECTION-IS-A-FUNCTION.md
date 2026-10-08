# ONT-003 — The projection is a function

**Opened 2026-10-08.** **Depends on ONT-001.** **Status: 📋 not started.**

> **Model check, before anything (Richard, 2026-10-08):** this task wants **Opus 5.5 is sufficient** — a deterministic projection graded by the existing conformance suite. Your system prompt says which model you are. If it is not the one named here, stop before any work and say so in one line ("this task is marked for Opus 5.5; you are on <model> — switch with /model, or say go"), and wait for Richard's word. Do not start on the wrong model because the check felt like a formality.


## 1. The person sentence

> **The database is made from what I said, the same way every time, and a test proves on two different engines that
> it still means what I said.**

## 2. Why

README §1 readings 1, 3, 10. The backend contract and its conformance suite are the target; P104's eleven tiles are the
vocabulary a schema is written in; NSP-008 showed that a sentence written as a claim before recording grades the thing
it describes. The projection must be a function of the answers, not an agent's judgement, or two runs of the same
sentences give two databases.

## 3. What to build

1. **The function.** `project(ontology) → Schema` in the kinds package: nouns to collections with fields in the tiles'
   storage types; each kind's `projection` to a Link, a Links, a Choice with its fixed list, a junction collection with
   the edge's properties as columns, a uniqueness rule, a cascade or a soft-delete rule, an end-date field. Pure;
   snapshot-tested per kind.
2. **The claims.** Every answer becomes a claim in the contract's terms, written before the schema is applied: "a member
   row cannot exist with no account", "archiving keeps the membership row and nulls its account", "a subcategory names
   exactly one category". Claims are scenario files, as NSP-008's are.
3. **The grade.** The conformance suite (`@noodl/backend-contract/conformance`) grown by a claims case set: apply the
   projected schema through the schema API, run the claims as operations and assertions, on SQLite and Postgres.
   Each claim's mutant (ONT-005) must fail it.
4. **The write.** The projection applied through the existing `POST /admin/schema` route, never by SQL, so BMG-003's
   adapter defects are the backend's to own and the manager shows what was made.
5. **Idempotence.** Projecting twice changes nothing; projecting a changed ontology is ONT-007.

## 4. Acceptance criteria

1. The same `docs/world/` projects to byte-identical schema on two runs and two machines.
2. On a fixture of every kind, every claim passes on SQLite and Postgres through the conformance suite; each claim is
   shown to fail on its mutant.
3. The backend manager's Schema page shows the projected collections with the tiles the kinds named, and the person's
   sentence as each collection's description.
4. No file in the package imports an adapter.

## 5. Watch for

- **The default equals the test value** (memory). A claim whose fixture data would pass on the mutant too grades
  nothing; every claim's fixture carries the row that breaks its mutant.
- **Two formats.** Directus-backed projects store Directus operator names (contract README); the projection speaks the
  neutral model only, and the migration map does the rest.
- **The capability table.** A kind whose projection needs a cell marked `unsupported` on a backend projects to the
  nearest supported shape and says so in the schema's description, or refuses; it never silently drops a rule.

## 6. Built

*(empty)*
