# Phase 116 — next session

**Written 2026-10-09, end of s8.** ONT-000 ✅. R1–R7 ruled (README §9). ONT-001 🟡 (AC4 → ONT-008). ONT-003 ✅.
ONT-004 🟡 (AC2 → ONT-008). ONT-005 🟡 (18 of 38 pinned). ONT-002 🟡 ("through what?" owed). **ONT-007 🟡 s8** — AC2 ✅,
**AC3 ✅ s8** (the rename), AC1 🟡 (a workflow stands for a verb until ONT-006); the route and the reach review (Fable)
owed. ONT-007 §6.7 has every s8 decision; §6.8 what s8 found.

## What s8 built (Opus 5.5)

- **`Noun.was`** (format v1, optional): the id a noun had before the person renamed it. Validated (an id, not its own,
  not a noun still there, one noun per old id). A `was` the world before lacks is history — it renames nothing.
- **The rename in the plan**: `diffWorld` says `noun-renamed`; `planMigration` re-says the old world under the new ids,
  pairs collections by what made them and columns by position (refused unless kind and relation agree), and emits:
  rules off (only those the rename reaches) → `renameTable` → `renameColumn` → rules back → the rest of the plan.
- **`renameTable`** — new optional member of `IStorageSchema` (17 names), both engines, `POST /admin/schema`
  `{ action: 'renameTable', table, newName }`. Carries rows, built-in indexes, the junctions its own Relation columns
  name, `_Schema`, every other collection's `targetClass`. `TABLE_IN_USE` (409) while a rule is built under the name.
- **`permissionReach(plan, security)`** — rules kept under a reached collection's name (`mustMove` for a renamed one)
  and `{ path }` rules through it. `componentReach` matches a renamed collection by its old name.

## What s8 measured (2026-10-09, working tree over HEAD `7ee55891e`)

See ONT-007 §6.7 "Graded" — read the numbers there, and re-run them before believing them (the last full runs were
taken at the end of s8, after the box was free of a peer's full suite).

**The finding of the session:** a test of the renamed link first read `if (typeof link === 'object') expect(…)` and
passed on both engines while asserting nothing: the adapter hands a link back as a bare id. The reader that uses a
column's `targetClass` is the wire facade (`AdapterFacade.toWire`), so the grade now reads through `wireQuery` with
`include`. A rename that forgot to retarget a link would have passed the first version.

## Before anything

0. **Model check.** ONT-006 wants **Fable 5.1**; ONT-007's reach review wants **Fable 5.1**; ONT-007's route and
   ONT-008 want **Opus 5.5**. On the wrong model, stop and say so in one line before any work.
1. **One heavy job on this box.** `pgrep -fl bin/jest` first. A peer in `OpenNoodl-worktrees/p109-isl049` ran short
   `conformance.test.ts` runs and then a full suite (load 9) in s8; s8 wrote docs while it ran and gated after.
2. Green check: `npx jest` in `packages/nodegx-project-contract`; `npx jest --runInBand tests/ont-007-migration` in
   `packages/nodegx-backend` (the PostgreSQL half needs `psql postgres:///nodegx_brg005`).

## Ask Richard

- **R8** (README §9, still open): keep a person's word SQL reserves (`plan`, `on`) as the field's name (built), or rename?
- **Bug `P116-ONT-003-links`** (needs-ruling): a foreign key in the contract, or a read-through claim step.
- **New: where the migration executor lives for the route.** `runMigration` is in `@noodl/backend-contract/conformance`,
  which the deployed backend does not import (no `src` import, no build alias). Move it to the contract's `src/` (it
  is not a conformance case, it is a runner used by production), or alias `conformance/` in the build. Recommend: move.
- **For the record — bug `P116-ONT-007-junctions` (blocker):** deleting a collection wipes the relations of every
  collection whose name ends with its name ("Post" takes "BlogPost"'s). Measured on both engines with a control. Not
  P116's to fix unless Richard says so; the fix is small (ONT-007 §6.8).

## The next tasks

- **ONT-007's reach review (Fable).** Read §6.1–6.2 and §6.7 against "what survives is where the error hides": which
  changes the planner passes without a move or a refusal (a changed `whenTargetGoes` or `moves` answer changes no
  schema and so no step — right?); which reach it misses (a component reading a field through a Record node's
  output ports rather than `prop-` inputs; a rename's effect on a `{ path }` rule's `follow` field names).
- **ONT-007, the route (Opus)** — after the executor ruling: the plan as the body (admin-only), dry run → words → yes
  → `POST /admin/backups` → steps → move the `mustMove` rules in `security.json` and have the running backend take
  them up (BMG-016) → answer. The components still name the old collection after a rename: the reach lists them;
  editing them is the editor's / MCP's (a `collectionName` rewrite), owed with the route.
- **ONT-006, workflows are sentences** (Fable) — unchanged: the fifteen step kinds, NSP-014's 24 nodes, the enrolment
  note as fixture. When verbs land, `workflowReach` gains a sibling that reads them, and AC1 is re-read.
- **ONT-008** gets from s7/s8: `migrationWords(plan)` is the "before anything moves" panel; `plan.reach` rows with
  `how: 'renamed', was` are "the manager shows both names until then" (AC3's last half).

## Found in s8, owned elsewhere

- Bugs `P116-ONT-007-junctions` (blocker) and `P116-ONT-007-renamecolumn` (medium) — ONT-007 §6.8.
- Still from s7: `a()` in `world/project.ts` and `article` in `world/mutants.ts` say "an user"; untracked
  `.d.ts`/`.d.ts.map` emits in `packages/nodegx-backend-contract/src/` (not P116's; left alone).

## Not yet

The "mandatory project-docs folder" rule is a DIRECTION.md candidate only (R1). Do not read the lessons backend's live
schema without its admin token. The brief is read only through `validate_world` (R5).

## Memory

`ontology-is-the-spec.md`; its pointer is on the Phases line of `MEMORY.md`. Size-check the index (17,510 UTF-16 units).
