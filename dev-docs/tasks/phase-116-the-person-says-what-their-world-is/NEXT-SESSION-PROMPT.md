# Phase 116 — next session

**Written 2026-10-11, end of s21 (Opus 5.5).** ONT-000 ✅, ONT-002 ✅, ONT-003 ✅, ONT-007 ✅. 🟡: ONT-001 (AC4 →
ONT-008), ONT-004 (AC2 → ONT-008), ONT-005 (every-kind 14 of 51), ONT-006 (the view is ONT-008's), ONT-011 (step 5,
the view hints, owed — ONT-008's suite), ONT-012 (reach review ✅ s18), ONT-014 (every AC built; closes when Richard
reads it), **ONT-013 (step 4 ✅ s21; steps 1–3 and 5 owed)**, **ONT-015 (unblocked and the store built s21; the
projection, claim, migration and capability cell owed)**. 📋: ONT-016 (opened s21, unscoped), ONT-008, ONT-009,
ONT-010. R1–R10, R-a to R-j are ruled (README §9); **nothing is waiting on Richard**.

## Before anything

0. **Model check.** Task 1 below is an Opus build; 3 and 4 are Fable. Say which you are.
1. **`node scripts/bugs.js --from P116`**: 6 open (NULLEQ, DOTTEDFILTER, CRONLEAK, -required, and two owned
   elsewhere). Nothing filed s21.
2. **One heavy job on this box:** `pgrep -fl "bin/jest|vitest"`. Wait for a peer's run.
3. **`git diff --cached --name-only`** first; commit by pathspec through a temporary index (the memory recipe), then
   `git reset -q HEAD -- <your files>` so the real index matches HEAD.
4. **`grep` is ugrep with `-I`** — use `command grep -a`. **zsh does not split `$FILES`** — use an array. **No
   `timeout` on this Mac.** **`--include=*.ts` is a zsh glob** ("no matches found") — drop it or quote it.
5. 🔴 **Every package you changed is graded by its own whole suite**: the project contract's `npx jest` +
   `tsc --noEmit -p tsconfig.tests.json`; the backend contract's `npx jest` + `tsc --noEmit -p tsconfig.json` (it has
   no tests tsconfig); the runtime's `npx jest test/adapters` + `tsc --noEmit -p tsconfig.json`; the backend band
   below + `tsc --noEmit -p tsconfig.tests.json`. Always `--noEmit`: `tsc -p` emits in place (the untracked `.d.ts`
   files in `packages/nodegx-backend-contract/src/` are someone's emit — not P116's, leave them).

## What s21 did (Opus 5.5)

1. **The handoff was wrong about ONT-015.** It said "nothing is waiting on Richard" and put ONT-015 first. The task
   file said the build waited on a second census row or Richard's word (§8). Measured: the read-aloud borrow held
   **1** row. So s21 built **ONT-013 step 4** first (the Opus half of ONT-013), which is also where ONT-015 §8 said a
   second row would come from.
2. **ONT-013 step 4** (`ae4e61dfb`, its §9.1): `census.js` `detectAcross()`, the first detectors that read the apps'
   code (265,639 lines over 4 templates + 3 private corpora, never tests/seeds/generators). **count 2 rows over 2
   sources** (nightbook's 200-thing cap counted before the create; a private limit field whose own note says "not
   enforced"), **sum 0, overlap 0**, each zero beside `ACROSS_CONTROLS` (every detector fires on its line, stays quiet
   on its near-miss; five mutants each turn the census red). The count atom opened as **ONT-016** (stub). The same
   pass: **read-aloud 1 → 3 rows over 2 sources**, both new ones the count-plus-one mistake → ONT-015 unblocked (§6.1).
3. **ONT-015's store and doors** (§6.2): `series: { format, restart?, gapFree? }` on a column
   (`noodl-runtime/src/api/adapters/series.ts`, `SchemaColumn`, contract `StorageColumn`/`StorageSeries`), taken in one
   upsert on `_Series` inside `create` on both engines (gap-free: in the insert's transaction), validated at
   `createTable`/`addColumn` and `POST /admin/schema` (400). The doors (`server/series-door.ts`) refuse a person's own
   number with a 400 at `/classes` create + upsert, `/api/:table`, the batch and MCP; the admin's is kept; the 201
   and the MCP answer carry the number. Conformance area **`series`** (10 cases) + mutant
   **`series-counted-not-taken`**; `tests/ont-015-series.test.ts` (year/month roll on `setSeriesClock`, three
   mutants shown).
4. **Fixed on the way:** `brg-005-conformance-postgres` kept every per-case adapter's pool open to `afterAll`; with
   eight creates at once it hit PostgreSQL's 100 connections. Now drained per run (peak 14).

## What s21 measured (2026-10-11)

- Census: `--check` green with and without the private corpora (15 kinds, 303 + 8; read-aloud 3; across count 2).
- Backend contract 9 suites **232/232**, `tsc --noEmit` clean. Runtime `test/adapters` 17 suites **331/331**, `tsc`
  clean. Backend `tsc --noEmit -p tsconfig.tests.json` clean, src clean.
- `brg-003-conformance-sqlite` green (95 cases: series 10); `brg-005-conformance-postgres` **21/21**;
  `brg-003-conformance-{mutants,gate,declared}` **27/27**; `ont-015-series` **24/24** (SQLite + PostgreSQL).
- Backend band (every `ont-`, `brg-`, `fed-002`, `fed-005`, `bmg-003`, `bmg-017` suite, both engines): **40 suites,
  652/653** on the first run. The one red was s21's own: `bmg-017-import-required`'s census of `buildInsert` callers
  counted the PostgreSQL create's three copies of the insert. Folded into one closure; that suite +
  `ont-015-series` + `brg-005` rerun **51/51**, runtime `tsc` clean.
- Not run: the project contract (untouched), `test:ci`, the whole backend suite (229 files).

## The next tasks, in order

1. **ONT-015 §3.3, the projection** (Opus): `RuleHold` `series` → the column's `series` (`looksLike` is asked with
   `{YYYY}`/`{MM}`/`{####}` already — `noun.ts` — so it IS the format; `maySkip: false` → `gapFree: true`; `restarts`
   `each year`/`each month` → `year`/`month`) and `frozen` on the field (AC2's PUT 409). A `looksLike` that is not a
   valid format is a validator refusal in words. Then the claim `<noun>/number-never-used-again` held: a new claim
   step (the store hands out numbers in order, never one a deleted record had) in **both** contracts' `ClaimStep`,
   `runClaim`'s branch, `mutants.ts`'s `need`, and a `ClaimMutant` `dropSeries`. ONT-005's pin must move (AC5).
   Then the migration step (AC3: number existing records in `createdAt` order, keep held values, start above the
   highest; the dry run says the count). The capability cell last (a `CapabilityKey` all six descriptors declare).
2. **ONT-008** once P112 OWN-007 has started (still 📋).
3. **ONT-013 steps 1–3** (Fable): the brief's two sentences, `rules.json`, the *not kept:* read-back.
4. **ONT-016 scoping** (Fable): per-parent count; one ruling to ask (a limit lowered below today's count).
5. Small, Fable: ONT-011 step 3's `one-of` leftover; refuse "goes with its keeper" + "never deleted" at authoring.
6. If blocked: NULLEQ (one line in `QueryBuilder`, both-engine spec), then `-required`.

## For Richard (plain words; the recommendation first)

- **Nothing blocking.** New this session, for when you read ONT-015: a number the backend hands out is now real on
  both engines — "INV-2026-0042", one more each time, never handed out twice, starting again each January if you say
  so; a screen cannot type one in, an admin can (to fill in old ones).
- **One design fact the census turned up, not built:** one of the private apps numbers only *some* records of a
  collection (another sort gets no number). A second app asking for it would make it a question; until then it is
  recorded in ONT-015 §6.1.
- Still open from s17/s20 (not blocking): who may change a field; search refused for a caller with a hidden field;
  a secret detail is unread even by the person it is about.

## Traps s21 hit

- **A handoff's "nothing is waiting" can contradict the task file it points at** — read the task's own status line.
- **A conformance case with N creates at once fills N connections per adapter** — and the PostgreSQL runner opens one
  adapter per case. Drain per run.
- **A mutant that removes one alternative of a regex is not a mutant of the detector** — the control line may hit
  another alternative. Make the whole regex dead.
- **A guard no control exercises survives its mutant** (`NOT_A_COUNTER` passed until a control line gave it work).

## Owned elsewhere

`rel002b-fail-closed` (P116-S13-REL002B, P82/TPL-001) and `ac2-page-editor-drag-drive` (P116-S13-AC2STALL,
P77/SBR-007). The untracked `.d.ts` emits in `packages/nodegx-backend-contract/src/` are not P116's.

## Not yet

The "mandatory project-docs folder" (R1) is only a DIRECTION.md candidate. Don't read the lessons backend's live schema
without its admin token. The brief is read only through `validate_world` (R5). The private corpora are sibling folders
of this checkout; their names and paths stay out of the repo (R6) — the census takes them as flags:
`node scripts/ontology/census.js --check --acme <path> --tirion <path> --sentinel <path> --private <dir>` (the private folder's README has the paths).
The private verdicts for s21's new candidates are in that folder's `borrows.json` (not a git repo).

## Memory

`ontology-is-the-spec.md` (an s21 paragraph). The index is AT its 17,510-unit budget: tighten, never grow.
