# Phase 116 — next session

**Written 2026-10-09, end of s5.** ONT-000 ✅. R1–R7 ruled (README §9). ONT-001 🟡 (AC4 → ONT-008). ONT-003 ✅.
ONT-004 🟡 (AC2 → ONT-008). **ONT-005 🟡 s5**: every classic mistake is executable as a schema (`worldMutants()` in
`@nodegx/project-contract/world`: eight shapes, 23 seeds each with the question that kills it, a mutant per answered
question that changes the schema, a property stored as text); `gradeStatically()` kills a change of kind by the
validator's sentence and a claim with no home without running it; `nodegx-backend/tests/ont-005-mutants.test.ts`
runs the rest on SQLite and PostgreSQL, prints the honesty number and pins the survivors. **18 of 38 survive on the
fully answered world** — 9 unkept by the engine, 9 unclaimed, 0 unanswered; both engines agree on every verdict.
AC1–AC3 met (ONT-005 §6.5). `questionsToAsk()` is ONT-002's input.

## Before anything

0. **Model check.** Every task file names its model under the status line. **ONT-002's brief wants Fable 5.1; its
   runner Opus 5.5.** On the wrong model, stop and say so in one line before any work.
1. Green before you start: `npm run ontology-census:check`; `npm test` in `packages/nodegx-project-contract` (95);
   `npm test` in `packages/nodegx-backend-contract` (199); in `packages/nodegx-backend`,
   `npx jest --runInBand tests/ont-005-mutants tests/ont-003-claims tests/ont-004-world tests/ont-004-rule` (the
   PostgreSQL halves need `psql postgres:///nodegx_brg005`; they skip without).
2. **One heavy job on this box.** A peer worktree was running a runtime conformance suite for most of s5; `pgrep -fl
   bin/jest` before any engine run, and wait.

## Ask Richard

- **R8** (README §9): a person's word that SQL reserves (`plan`, `on`) — keep it as the field's name (built), or
  rename it and keep the word in the description?
- **Bug `P116-ONT-003-links`** (needs-ruling): a Link keeps pointing at a deleted record on both engines. **ONT-005
  made it the biggest row of the honesty number**: `id-as-text` (every relation in the in-repo corpus) and
  `the-text-itself` survive on both engines because nothing in the data plane tells a Pointer from its id as text.
  The same decision from the other side: a foreign key in the contract, or a read-through claim step through the wire
  facade (ONT-005 §6.6).
- **For the record** (no ruling unless he disagrees): `one-of/whoAdds: 'the people using it'` now changes the kind
  to `belongs-to` (tags as a Choice had no killer before); the honesty number is pinned per world and a change in
  either direction is red until the pin is read and moved.

## The next tasks

- **ONT-002, the conversation is a runner** (brief: Fable; runner: Opus). Inputs ready: `questionsToAsk(files)`
  (the unanswered survivors, in the kind's order, with the words in the person's nouns and whether the answer changes
  the kind or the schema); the inert list (questions asked for the record); R5 (the brief loads only when a project
  has or asks for a backend — census the loader's callers). Owes the two questions ONT-004 found ("which link is the
  person who signs in?"; `owned-by` `path: true` → "through what?") and the kind-picker AC3 showed ("is `category` one
  of a fixed list?" — the one question no relation can carry).
- **ONT-006 and ONT-007** after it. ONT-007's first two kills are named: `filter-field-split-off` and
  `sort-key-copied` are shape rules only a diff can read (ONT-005 §6.6).

## Found in s5, owned elsewhere

- **The engines accept anything the column does not literally refuse** (a dangling Pointer, a word in a Number/Date/
  Boolean column, an undeclared field or collection — probed on SQLite). `autoCreateTables` is by design; it is why
  no-home kills must be static. Not filed; a declared capability for ONT-008's manager to show.
- **A "carries" claim per optional relation field** would kill four `unclaimed` survivors but needs a schema-level
  check, not a data-plane step (the dropped column is auto-created on first write).
- **ONT-008:** the honesty number per world is what the data manager should show beside the schema.
- `typecheck:backend-tests` still red at HEAD on the ISL-010 drive spec only (`P116-ONT-003-tsc`); nothing new.

## Not yet

No MCP tool until the budget gate is measured. The "mandatory project-docs folder" rule is a DIRECTION.md candidate
only (R1). Do not read the lessons backend's live schema without its admin token.

## Memory

`ontology-is-the-spec.md`; its pointer is on the Phases line of `MEMORY.md`. Size-check the index (17,510 UTF-16 units).
