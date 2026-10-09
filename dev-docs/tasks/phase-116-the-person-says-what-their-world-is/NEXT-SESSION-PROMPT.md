# Phase 116 — next session

**Written 2026-10-09, end of s7.** ONT-000 ✅. R1–R7 ruled (README §9). ONT-001 🟡 (AC4 → ONT-008). ONT-003 ✅.
ONT-004 🟡 (AC2 → ONT-008). ONT-005 🟡 (18 of 38 pinned). ONT-002 🟡 ("through what?" owed). **ONT-007 🟡 s7** (built on
Opus 5.5; its reach review, marked for Fable 5.1, not done) — the diff (`diffWorld`), the plan (`planMigration`: backup,
the schema route's bodies, data moves in the person's words, dry-run checks, `notKept`, `refused`), the reach
(`plan.reach`, `componentReach`, `workflowReach`) in `@nodegx/project-contract/world` (`world/migrate.ts`); the run
(`dryRunMigration`, `runMigration`) in `@noodl/backend-contract/conformance` (`conformance/migration.ts`). ONT-007 §6
has every decision and reading.

## What s7 measured (2026-10-09 ~17:15 CEST, working tree over HEAD `84018e920`/`3a15515dd`)

- `nodegx-project-contract` `npx jest`: **139 / 139** (117 → 139; `tests/migrate.test.ts`).
- `nodegx-backend` `npx jest --runInBand tests/ont-007-migration`: **25 / 25, exit 0** (13 SQLite, 12 PostgreSQL, none skipped).
- `nodegx-backend` `ont-005-mutants ont-003-claims ont-003-write ont-004-world ont-004-rule`: **67 / 67** — the four s6
  could not run are green; s6's `askWords`/`login` changes broke nothing.
- `nodegx-backend-contract` **199 / 199**; `noodl-mcp` `ont002WorldTools toolDisclosure` **25 / 25** (8,261, 19 under);
  `ontology-census:check` fresh; `typecheck:backend-tests` red only on the known ISL-010 lines.

**Where the handoff was wrong or incomplete:** nothing in s6's claims failed. The ONT-007 task file's AC1 asks for "one
verb" — ONT-006's verbs do not exist, so s7 reads workflow definitions (what a verb projects to); that criterion is 🟡
until verbs land.

**The finding of the session:** `runClaim` declares the schema before its steps, so grading a migration with it
repaired the very rule the migration forgot (a plan without its `setChecks` step passed every claim on both engines).
`runClaim(…, { apply: false })` now grades the tables as they stand. Any future "grade on existing tables" must use it.

## Before anything

0. **Model check.** ONT-006 wants **Fable 5.1**; ONT-007's reach review wants **Fable 5.1**; ONT-008 Opus 5.5. On the wrong
   model, stop and say so in one line before any work.
1. **One heavy job on this box.** `pgrep -fl bin/jest` first. A peer in `OpenNoodl-worktrees/p109-isl049` ran full
   `nodegx-node-spec` suites back to back all afternoon (~20 min each); s7 waited two out, then ran single specs in band.
2. Green check: `npm test` in `packages/nodegx-project-contract` (139); `npx jest --runInBand tests/ont-007-migration`
   in `packages/nodegx-backend` (25; PostgreSQL half needs `psql postgres:///nodegx_brg005`).

## Ask Richard

- **R8** (README §9, still open): keep a person's word SQL reserves (`plan`, `on`) as the field's name (built), or rename?
- **Bug `P116-ONT-003-links`** (needs-ruling): a foreign key in the contract, or a read-through claim step.
- **New, for the record — bug `P116-ONT-007-required`** (open, not a ruling): no route makes an existing field required;
  a migration that fills a required link record by record leaves the rule unkept, and says so (`notKept`). The fix is a
  schema action ("make required", refused when any record is empty); it also unlocks a changed `required` answer.

## The next tasks

- **ONT-007's reach review (Fable).** Read §6.1–6.2 against "what survives is where the error hides": which changes the
  planner passes without a move or a refusal (a changed `whenTargetGoes` or `moves` answer changes no schema and so no
  step — is that right?), which reach it misses (permission rules in `nodegx.security.json`; a component reading a
  field through a Record node's output ports rather than `prop-` inputs).
- **ONT-007, the rest (Opus):** AC3 — a `was` key on a noun (format v1, optional) and a table rename in the schema
  surface (it has `renameColumn` only); the HTTP route (`POST /admin/world/migrate` or `write_world`'s `migrate` arm:
  dry run → words → yes → `POST /admin/backups` → `mutateSchema`); permission rules in the reach.
- **ONT-006, workflows are sentences** (Fable) — unchanged from s6's handoff: the fifteen step kinds, NSP-014's 24 nodes,
  the enrolment note as fixture; "through what?" belongs to whichever of ONT-006/008 first compiles a rule from files.
  When verbs land, ONT-007's `workflowReach` gains a sibling that reads them, and its AC1 is re-read.
- **ONT-008** gets from s7: `migrationWords(plan)` is the "before anything moves" panel; "the manager shows both names
  until then" (AC3) is its.

## Found in s7, owned elsewhere

- `a()` in `world/project.ts` and `article` in `world/mutants.ts` say "an user" (any vowel letter); `migrate.ts`'s
  `article` reads `u` + consonant + vowel as "you". The older two are pinned by their specs' strings.
- Untracked `.d.ts`/`.d.ts.map` emits in `packages/nodegx-backend-contract/src/` (mtime 2026-10-08 22:18 — not s7's;
  a `tsc -p` without `--noEmit` from someone). Left alone.

## Not yet

The "mandatory project-docs folder" rule is a DIRECTION.md candidate only (R1). Do not read the lessons backend's live
schema without its admin token. The brief is read only through `validate_world` (R5).

## Memory

`ontology-is-the-spec.md`; its pointer is on the Phases line of `MEMORY.md`. Size-check the index (17,510 UTF-16 units).
