# Phase 116 — next session

**Written 2026-10-08, end of s3.** ONT-000 ✅. R1–R7 ruled (README §9). ONT-001 🟡 (AC4 → ONT-008). **ONT-003 ✅**:
`projectWorld()` in `@nodegx/project-contract/world` turns `docs/world/` into a schema (collections, tiles, required,
choice checks, unique indexes) plus claims; `@noodl/backend-contract/conformance/claims.ts` runs them on SQLite and
PostgreSQL; every held claim fails on its mutant; `POST /admin/schema` now keeps a collection's description and the
Schema card shows it. ONT-003 §6 has every decision and what measured it.

## Before anything

0. **Model check.** Every task file names its model under the status line. **ONT-004 wants Fable 5.1 for the
   operation's semantics and the capability cells**, Opus 5.5 for the adapters. ONT-005 wants Fable. On the wrong
   model, stop and say so in one line before any work.
1. Green before you start: `npm run ontology-census:check`; `npm test` in `packages/nodegx-project-contract` (53);
   in `packages/nodegx-backend`, `npx jest --runInBand tests/ont-003 tests/admin-app/ont-003-card` (29, needs
   `psql postgres:///nodegx_brg005` for the PostgreSQL half — it skips without one).

## Ask Richard

- **R8** (README §9): a person's word that SQL reserves (`plan`, `on`) — keep it as the field's name (built), or
  rename it and keep the word in the description?
- **Bug `P116-ONT-003-links`** (needs-ruling): a Link keeps pointing at a deleted record on both engines; nothing a
  person says about "when it goes" can be kept. On-delete in the contract and each engine, or above the engine at
  delete time? Seven claims on the every-kind fixture flip from not-held to held when it lands.

## The next tasks

- **ONT-004, paths join the contract** (Fable for the semantics). Needs only R3; fixture depth 5. The claims runner
  (`claimCases`, `runConformance(…, { cases })`) is the place a path claim joins.
- **ONT-005, the mistakes are mutants** (Fable). The machinery exists: `applyMutant`, and "fail at the rule's step".
  The kinds' 19 mutant seeds are not executable yet; most are the projection made the other way.

## Found in s3, owned elsewhere

- **`typecheck:backend-tests` (a PR gate) is red at HEAD** — four errors in `isl010-ask-the-owl-drive.test.ts`
  (P109 ISL-010). Filed `P116-ONT-003-tsc`; ~3 lines in that spec.
- Untracked `.d.ts`/`.d.ts.map` files in `packages/nodegx-backend-contract/src/` (Oct 3, an old `tsc -p` emit, not
  this phase's). Left alone.

## Not yet

No MCP tool until the budget gate is measured. The "mandatory project-docs folder" rule is a DIRECTION.md candidate
only (R1). Do not read the lessons backend's live schema without its admin token.

## Memory

`ontology-is-the-spec.md`; its pointer is on the Phases line of `MEMORY.md`. Size-check the index (17,510 UTF-16 units).
