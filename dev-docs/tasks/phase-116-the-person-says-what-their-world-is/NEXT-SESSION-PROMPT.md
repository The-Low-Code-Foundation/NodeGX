# Phase 116 — next session

**Written 2026-10-08, end of s4.** ONT-000 ✅. R1–R7 ruled (README §9). ONT-001 🟡 (AC4 → ONT-008). ONT-003 ✅.
**ONT-004 🟡 s4**: the path is a `path` **operator** of the neutral filter model (`$path` on the wire), not a fifteenth
method; compiled by `QueryBuilder.buildPathSelect` on SQLite and PostgreSQL with the caller's ACL at every hop and the
depth bounded at 8; a cell per descriptor; 14 conformance cases (area `paths`) and three path mutants, green on both
engines; `worldPath()`/`worldRule()` in `@nodegx/project-contract/world` compile a sentence through the relations
(fixture `world-membership`); a `{ path }` rule atom in `security.json` enforced inside the ACL predicate
(`StorageAclOption.only`) for every read and write; refused by name where it cannot apply (realtime, the Supabase
export). AC2 (a path row in the manager) is not met as worded and is owed to ONT-008 — ONT-004 §6.4 says why.

## Before anything

0. **Model check.** Every task file names its model under the status line. **ONT-005 wants Fable 5.1.** On the wrong
   model, stop and say so in one line before any work.
1. Green before you start: `npm run ontology-census:check`; `npm test` in `packages/nodegx-project-contract` (68);
   `npm test` in `packages/nodegx-backend-contract` (199); in `packages/nodegx-backend`,
   `npx jest --runInBand tests/ont-004-world tests/ont-004-rule tests/ont-003-claims tests/brg-003-conformance-sqlite
   tests/brg-003-conformance-mutants` (the PostgreSQL halves need `psql postgres:///nodegx_brg005`; they skip without).

## Ask Richard

- **R8** (README §9): a person's word that SQL reserves (`plan`, `on`) — keep it as the field's name (built), or
  rename it and keep the word in the description?
- **Bug `P116-ONT-003-links`** (needs-ruling): a Link keeps pointing at a deleted record on both engines.
- **ONT-004's two choices, for the record** (no ruling needed unless he disagrees): an operator rather than a method,
  and the rows rather than the routes (ONT-004 §6.1, §6.5).

## The next tasks

- **ONT-005, the mistakes are mutants** (Fable). The machinery: `applyMutant` (ONT-003), the three path mutants
  (ONT-004 — `path-ignores-hop-filters` is "as holder" forgotten), and "fail at the rule's step". The kinds' 19 mutant
  seeds are not executable yet; most are the projection made the other way.
- **ONT-002** owes two questions ONT-004 found: "which link is the person who signs in?" (`worldRule`'s login hop) and,
  when `owned-by` answers `path: true`, "through what?".

## Found in s4, owned elsewhere

- **ONT-008:** the manager's path row (AC2). The gate (`filterGateFor(type, 'path')`), the rule words
  ("Whoever reaches it (through 6 links)") and the dry run's `narrow` are ready for it.
- **Realtime** cannot subscribe to a collection whose `find` rule narrows through a path; refused with the reason.
- **Not measured, worth measuring:** an `include`d record is read with the caller's row ACL and never its collection's
  `find` rule — pre-existing, independent of paths. Filed nowhere; a spec first.
- `typecheck:backend-tests` is still red at HEAD on the ISL-010 drive spec only (`P116-ONT-003-tsc`); the new specs add
  no error.

## Not yet

No MCP tool until the budget gate is measured. The "mandatory project-docs folder" rule is a DIRECTION.md candidate
only (R1). Do not read the lessons backend's live schema without its admin token.

## Memory

`ontology-is-the-spec.md`; its pointer is on the Phases line of `MEMORY.md`. Size-check the index (17,510 UTF-16 units).
