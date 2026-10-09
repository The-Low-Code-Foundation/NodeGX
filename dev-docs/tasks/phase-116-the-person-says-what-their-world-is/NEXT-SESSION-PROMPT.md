# Phase 116 — next session

**Written 2026-10-09, end of s11 (Opus 5.5).** ONT-000 ✅, ONT-003 ✅, **ONT-007 ✅ (s11)**. ONT-001 🟡 (AC4 → ONT-008),
ONT-004 🟡 (AC2 → ONT-008), ONT-005 🟡 (18 of 38 pinned), ONT-002 🟡 ("through what?" owed), ONT-006 🟡 (the view is
ONT-008's). R1–R10 all ruled (README §9) — nothing is waiting on Richard.

## What s11 built (Opus 5.5) — `993a3ff1e` (the route) and the two commits after it

- **Rulings, in plain words, each the recommendation** (README §9): R8 keep the person's word SQL reserves; **R9 the
  migration executor lives in `@noodl/backend-contract`'s `src/`**; **R10 a link's "when it goes" rule is kept by the
  backend at delete time**, not a foreign key (bug `P116-ONT-003-links` → `open`).
- **The executor moved** to `nodegx-backend-contract/src/migration.ts` (`conformance/migration.ts` re-exports it), with
  `migrationContextOf(facade)`, `migrationPlanProblems()` and `rulesAfterMigration()`.
- **`POST /admin/world/migrate`** (`nodegx-backend/src/server/admin-world.ts`, audited `world.migrate`): the dry run in
  the plan's words; the backup first (on PostgreSQL, 409 until `backupTakenElsewhere`); the steps; the permission rules
  moved and every `{ path }` rule re-said in the RUNNING config. ONT-007 §6.11 has the whole table.
- **`describeTable`** on `IStorageSchema` (18 names), both engines, `POST /admin/schema`, the executor and the planner
  (a words-only change is a step, no reach row). s9's pinned `it.failing` is an `it`.
- **Found and fixed** (bug files, `fixed`): `-pagecap` (the executor stopped at the first page an operator's cap
  shortened), `-pgrenamememo` (PostgreSQL read a renamed link by its old name until restart: a path rule through it
  answered 500), `-selflink` (a collection's link to itself kept the old name, both engines).

## What s11 measured (2026-10-09 19:40–19:58 CEST, in band)

- `nodegx-project-contract` **195 / 195**; `nodegx-backend-contract` **219 / 219**; `noodl-mcp` `ont002WorldTools` +
  `toolDisclosure` **30 / 30**, surface **8,261 / 19 under** (unchanged).
- `nodegx-backend` 18 specs (all ONT-003…007, `service-http`, `ops-audit`, `admin-dashboard`, `bmg-003-schema`, the
  BRG-003/005 conformance suites incl. `-gate` and `-declared`, `brg-005-service-postgres`) **312 / 312, exit 0**, both
  engines; `ont-007-route` **23**.
- `tsc` clean in the four packages; backend `tsconfig.tests.json` red only on ISL-010's four lines (`P116-ONT-003-tsc`).
- Mutants: each red on its own spec (ONT-007 §6.11).

**Where the s10 handoff was short:** "the route" was the whole of task 1; the defects were under it — the executor had
never run against a capped facade, and s8's rename grade never read a link through the adapter's own typed lookup
(`declaredProperties`), only through the wire and `getTableSchema`. A grade that reads the model is not a grade of the
engine's reading of it.

## Before anything

0. **Model check.** R10 and ONT-008 want **Opus 5.5**. On the wrong model, stop and say so in one line.
1. **One heavy job on this box.** `pgrep -fl bin/jest` first; a peer's `-w 2` suite is common.
2. Green check: `npx jest` in `packages/nodegx-project-contract` (195) and `packages/nodegx-backend-contract` (219);
   `npx jest --runInBand tests/ont-007-route tests/ont-007-migration` in `packages/nodegx-backend` (82).
3. Edit in the foreground; background only the run (a backgrounded Bash gets no heredoc).
4. `grep -a` on `HttpServer.ts` (ugrep skips it as binary and says nothing).

## The next tasks, in order

1. **R10 — the on-delete rule, at delete time** (Opus; ruled, nothing waits). The contract grows a rule on a Pointer
   column (`goes-too` · `stays-unlinked` · `blocks`; name it in the contract, `StorageColumn`), the backend applies it
   inside the delete on both engines (the data plane's `delete` — find every door that deletes: `/classes`, BYOB
   `/api/:table`, batch, a cloud function's `Delete Record`), the projection writes it from the person's answer
   (`whenTargetGoes`), and ONT-003's not-held claims for it (`person-goes-too`, `company-blocks`, `parent-blocks`, …)
   flip to held — their spec fails "the label is wrong" until the projection is told, which is the gate. ONT-005's
   survivors fall (9 unkept → fewer): re-pin with the count. A capability cell per backend. Watch: a relation's junction
   rows; a cascade that reaches a collection the caller cannot write (refuse, or run as master? — say which and why).
2. **ONT-008** (Opus) — depends on P112 **OWN-007, still 📋 not started** (checked s11). Its §5 lists every input
   ONT-006/007 hand it; s11 adds: the route's dry run (`says`, `dryRun`, `rules.moved/rewritten`) is what the page shows
   before the yes, and the dry run has no read-only twin yet (`admin:readonly` cannot call it).
3. Smaller, unowned: `rebindVerbs()`; a spec for `verbReach`'s `end` arm; bug `-two-systems`; ONT-002's "through
   what?"; bug `-renamecolumn` (a hand rename of a field a check reads). **Ask before** giving the MCP a migrate tool
   (the surface budget).

## Owned elsewhere

- `noodl-mcp` `tsc --noEmit` red in cg001/cg002/cg003/ig007/iw007/p108s8 specs (not P116's).
- `a()` in `world/project.ts` and `article` in `world/mutants.ts` say "an user"; untracked `.d.ts` emits in
  `packages/nodegx-backend-contract/src/` (not P116's).

## Not yet

The "mandatory project-docs folder" rule is a DIRECTION.md candidate only (R1). Do not read the lessons backend's live
schema without its admin token. The brief is read only through `validate_world` (R5).

## Memory

`ontology-is-the-spec.md` (s11 paragraph added); its pointer is on the Phases line of `MEMORY.md`. Size-check the index
(17,510 UTF-16 units).
