# Phase 116 — next session

**Written 2026-10-11, end of s24 (Opus 5.5).** ONT-000 ✅, ONT-002 ✅, ONT-003 ✅, ONT-007 ✅. 🟡: ONT-001 (AC4 →
ONT-008), ONT-004 (AC2 → ONT-008), ONT-005 (every-kind 14 of 51), ONT-006 (the view is ONT-008's), ONT-011 (step 5,
the view hints, owed — ONT-008's suite), ONT-012 (reach review ✅ s18), ONT-014 (every AC built; closes when Richard
reads it), **ONT-013 (step 4 ✅ s21; steps 1–3 and 5 owed)**, **ONT-015 (every AC built s22, both its defects fixed
s23; closes when Richard reads it; the capability cell waits for ONT-008)**. 📋: ONT-016 (opened s21, unscoped),
ONT-008, ONT-009, ONT-010. R1–R10, R-a to R-j are ruled (README §9); **nothing is waiting on Richard**.

## Before anything

0. **Model check.** Task 1 is Opus and blocked; tasks 2–4 are Fable. Say which you are. **An Opus session with ONT-008
   still blocked takes task 5 (DOTTEDFILTER).**
1. **`node scripts/bugs.js --from P116`**: 5 open after s24 (DOTTEDFILTER, CRONLEAK, STORAGEFLAKE (P104's spec), and
   two owned elsewhere).
2. **One heavy job on this box:** `pgrep -fl "bin/jest|vitest"`. Wait for a peer's run.
3. **`git diff --cached --name-only`** first; commit by pathspec through a temporary index (the memory recipe), then
   `git reset -q HEAD -- <your files>` so the real index matches HEAD.
4. **`grep` is ugrep with `-I`** — use `command grep -a`. **zsh does not split `$FILES`** — use an array. **No
   `timeout` on this Mac.** **`--include=*.ts` is a zsh glob** — quote it. **`echo =====` is a zsh `=cmd` expansion**
   — quote it.
5. 🔴 **Every package you changed is graded by its own whole suite**: the project contract's `npx jest` +
   `tsc --noEmit -p tsconfig.tests.json`; the backend contract's `npx jest` + `tsc --noEmit -p tsconfig.json`; the
   runtime's `npx jest test/adapters` + `tsc --noEmit -p tsconfig.json`; the backend band (every `ont-`, `brg-`,
   `fed-002`, `fed-005`, `bmg-003`, `bmg-017`, both engines) + `tsc --noEmit -p tsconfig.tests.json`. **A change to
   `QueryBuilder` reaches every query: run the whole backend `npx jest` (232 files, slow) — DOTTEDFILTER is one.**

## What s24 did (Opus 5.5)

OWN-007 re-measured first: still 📋 not started, so ONT-008 stays blocked and s24 took the Opus fallback.

1. **`P116-ONT-007-required` fixed** (ONT-007 §6.14). `setRequired(table, { field: true | false })` on the schema
   surface (optional), both managers, the migration executor and `POST /admin/schema`. SQLite counts the empty
   records, then rebuilds the table in one transaction (`SchemaManager._rebuildNotNull`: `PRAGMA table_info` with the
   flag changed, rows **with their rowids**, indexes and triggers re-made from their stored SQL). PostgreSQL queues
   `LOCK` → count → `ALTER COLUMN … SET / DROP NOT NULL`. Both refuse in one sentence (`FieldEmptyError`, `count`);
   the route answers 409 `field-empty` on both (PostgreSQL's read off the queue error's `cause`). The executor has a
   new dry-run refusal, `empty`. The planner makes a filled link required after the move (`notKept` is empty for the
   mirror), migrates a change of only "is it required" as a step, and orders made-optional before a link's
   `setWhenTargetGoes` and made-required after it.
2. **`P116-S24-TYPEREQUIRED` found and fixed**: SQLite's `changeColumnType` dropped NOT NULL from a required field
   (measured `notnull` 1 → 0, declaration still `required: true`) — `ADD COLUMN … NOT NULL` needs a default, so every
   add-copy-drop rebuild loses it. Fixed with the same rebuild inside the same transaction.

**Where the handoff was wrong or thin:** nothing it claimed was false. It sized the bug as "surface, managers,
executor, route"; it also needed the planner (two branches), the plan guards (`admin-world.ts`) and a conformance case,
and the PostgreSQL manager cannot refuse synchronously — its refusal has to travel through the queue.

## What s24 measured (2026-10-11, working tree over HEAD `c3fa9d3f5`)

- Runtime `test/adapters` 18 suites **341/341** (335 → 341), `tsc` clean. Backend contract 9 suites **232/232**,
  `tsc` clean. Project contract 15 suites **294/294**, `tsc` (tests) clean.
- Conformance on PostgreSQL **102/102** (the new case included); the SQLite gate runs every case and passed.
- `ont-007-migration` **69/69** and the new `ont-007-required-route` **8/8**, both engines.
- Backend tests `tsc`: one error, **P107's** `noodl-mcp/src/specPorts.ts` (`DRAWN_PORT_TYPES`) — not P116's.
- Backend band **42 suites, 686/686** on both engines, none skipped, exit 0 (41 / 670 at s23; + `ont-007-required-route`,
  + the new `ont-007-migration` arms), 504 s beside a peer's short P107 unit run.
- Commit: `bd7f54a64` (code and tests).
- Mutants, each red where it should be and nowhere else: listed in ONT-007 §6.14.

## The next tasks, in order

1. **ONT-008** once P112 OWN-007 has started (📋, re-measured s24) — it also takes ONT-015's capability cell.
2. **ONT-013 steps 1–3** (Fable): the brief's two sentences, `rules.json`, the *not kept:* read-back.
3. **ONT-016 scoping** (Fable): per-parent count; one ruling to ask (a limit lowered below today's count).
4. Small, Fable: ONT-011 step 3's `one-of` leftover; refuse "goes with its keeper" + "never deleted" at authoring.
5. **Opus, ONT-008 blocked:** `P116-S17-DOTTEDFILTER` — a filter on a linked record's field (`salary.amount > 90000`)
   returns nothing on the built-in backend, even for the admin, with no error. A `QueryBuilder` change: run the whole
   backend suite (rule 5).

**Small, unowned, worth a line:** the admin app's Schema view has no switch for "required" on an existing field — the
route takes it now (`setRequired`), so the view can call it; that is ONT-008's manager or BMG's, not a defect.

## For Richard (plain words; the recommendation first)

- **Nothing blocking.** One more fix behind the scenes: when the world's rule "every member belongs to one account"
  comes back after a time when members could be on several, the backend now keeps that rule — before, it moved
  everyone's account across correctly but then let new members be made without one. Changing only whether something
  is required is now also something the backend can do on its own, and it says plainly how many records are missing
  the value when it cannot ("2 records have none").
- **Also fixed:** changing the type of a required field (say from a number to text) on the built-in database quietly
  stopped it being required. It stays required now.
- Still open from s17/s20 (not blocking): who may change a field; search refused for a caller with a hidden field;
  a secret detail is unread even by the person it is about.

## Traps s24 hit

- **SQLite cannot `ADD COLUMN … NOT NULL` without a default** — every add-copy-drop rebuild of a column drops it
  silently. A NOT NULL change is a whole-table rebuild, and it must copy `rowid` (a search index's external content
  joins on it) and re-make the table's indexes and triggers. `_rebuildNotNull` does all three; reuse it.
- **A manager method on PostgreSQL returns before its SQL runs.** A refusal that needs a count happens inside the
  queued transaction and reaches the route at `barrier()` as `SchemaQueueError` with the real error in `cause`.
- **A conformance case reads either engine's schema refusal** with "throw synchronously, else
  `ctx.refused(() => ctx.count(c))`" — the next data-plane call is the barrier.
- **A test fixture can be refused by the world's own validator** (a `number` property may not carry `freeWords`):
  read a red test's message before reading it as the code's.

## Owned elsewhere

`rel002b-fail-closed` (P116-S13-REL002B, P82/TPL-001) and `ac2-page-editor-drag-drive` (P116-S13-AC2STALL,
P77/SBR-007). `bmg-002-filters` "due within past7" is red on Sundays — `P109-S41-SUNDAYWEEK`, P109's. The untracked
`.d.ts` emits in `packages/nodegx-backend-contract/src/` are not P116's.

## Not yet

The "mandatory project-docs folder" (R1) is only a DIRECTION.md candidate. Don't read the lessons backend's live schema
without its admin token. The brief is read only through `validate_world` (R5). The private corpora are sibling folders
of this checkout; their names and paths stay out of the repo (R6) — the census takes them as flags:
`node scripts/ontology/census.js --check --acme <path> --tirion <path> --sentinel <path> --private <dir>` (the private folder's README has the paths).
The private verdicts for s21's new candidates are in that folder's `borrows.json` (not a git repo).

## Memory

`ontology-is-the-spec.md` (an s24 paragraph). The index is AT its 17,510-unit budget: tighten, never grow.
