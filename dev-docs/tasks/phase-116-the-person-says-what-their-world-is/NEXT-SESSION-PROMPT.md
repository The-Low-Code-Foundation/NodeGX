# Phase 116 — next session

**Written 2026-10-11, end of s23 (Opus 5.5).** ONT-000 ✅, ONT-002 ✅, ONT-003 ✅, ONT-007 ✅. 🟡: ONT-001 (AC4 →
ONT-008), ONT-004 (AC2 → ONT-008), ONT-005 (every-kind 14 of 51), ONT-006 (the view is ONT-008's), ONT-011 (step 5,
the view hints, owed — ONT-008's suite), ONT-012 (reach review ✅ s18), ONT-014 (every AC built; closes when Richard
reads it), **ONT-013 (step 4 ✅ s21; steps 1–3 and 5 owed)**, **ONT-015 (every AC built s22, both its defects fixed
s23; closes when Richard reads it; the capability cell waits for ONT-008)**. 📋: ONT-016 (opened s21, unscoped),
ONT-008, ONT-009, ONT-010. R1–R10, R-a to R-j are ruled (README §9); **nothing is waiting on Richard**.

## Before anything

0. **Model check.** Task 1 is Opus and blocked; tasks 2–4 are Fable. Say which you are. **An Opus session with ONT-008
   still blocked takes task 5.**
1. **`node scripts/bugs.js --from P116`**: 6 open after s23 (`-required`, DOTTEDFILTER, CRONLEAK, STORAGEFLAKE
   (P104's spec), and two owned elsewhere).
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
   `QueryBuilder` reaches every query: run the whole backend `npx jest` (232 suites, slow) — s23's NULLEQ fix broke
   `realtime-filter`'s property test, which the band does not include.**

## What s23 did (Opus 5.5)

1. **SERIESCARRY + SERIESMSG fixed** (`562e10453`, ONT-015 §6.4). A number the admin brings (create) or edits (save)
   in the series' own look raises that period's counter above it, never back — on create inside the insert's
   transaction, so a refused create raises nothing. A handed-out number that collides is named in the 409 (the
   adapter appends what it filled to the refusal; `uniqueViolationToHttp` prefers it). Conformance `series` 13 → 15,
   `ont-015-series` +2, the projection's counter-left mutant now asserts the number; mutants shown red on both engines.
2. **NULLEQ fixed** (`ebdac4827`): `{ f: null }` is "is empty" in `QueryBuilder` (it was `= NULL`, never
   true), and the realtime matcher (`nodegx-backend/src/realtime/filter.ts`), which had deliberately mirrored the old
   behaviour, moved with it. Conformance `filters/null-short-form-is-empty` (both engines; the fix taken out reds it
   and only it).

## What s23 measured (2026-10-11)

- Runtime `test/adapters` 17 suites **335/335**, `tsc` clean. Backend contract 9 suites **232/232**, `tsc` clean.
- Backend band **41 suites, 670/670** on both engines, none skipped.
- Backend tests `tsc`: one error, **P107's** `noodl-mcp/src/specPorts.ts` (`DRAWN_PORT_TYPES`), re-measured — not P116's.
- Whole backend suite: see §"The whole backend run" below. Commits: `562e10453` (SERIESCARRY/MSG), `ebdac4827` (NULLEQ, CARDCHECKS).

## The whole backend run

The first whole backend `npx jest` P116 has run since s17 (232 files, 249 suites; 30 minutes, beside a peer's
`test:main` that started a minute later — load ~70). **241 passed, 7 failed.** Every red re-run alone:
- `realtime-filter` — the NULLEQ twin (below); fixed in `ebdac4827`, red again with the old matcher arm.
- `admin-app/ont-003-card` — **P116's own, red since s19** (the spec worded every rule "is one of"; an all-or-none
  rule has no list). Fixed in `ebdac4827`, filed `P116-S23-CARDCHECKS`. **The band does not include `admin-app/`.**
- `brg-005-conformance-postgres` (a 300 s `beforeAll` timeout) and `fed-004-overlap-drive` (`ECONNRESET`) — load;
  21/21 and 7/7 alone.
- `admin-app/storage-views` "BMG-011 Storage page › AC1" — a 30 ms `settle` lost under load (red twice, green on a
  quiet box); filed `P116-S23-STORAGEFLAKE` (P104's spec).
- `ac2-page-editor-drag-drive` (AC2STALL), `rel002b-fail-closed` (REL002B), `bmg-002-filters` past7 on a Sunday
  (`P109-S41-SUNDAYWEEK`) — owned elsewhere.

## The next tasks, in order

1. **ONT-008** once P112 OWN-007 has started (still 📋, re-measured s23) — it also takes ONT-015's capability cell.
2. **ONT-013 steps 1–3** (Fable): the brief's two sentences, `rules.json`, the *not kept:* read-back.
3. **ONT-016 scoping** (Fable): per-parent count; one ruling to ask (a limit lowered below today's count).
4. Small, Fable: ONT-011 step 3's `one-of` leftover; refuse "goes with its keeper" + "never deleted" at authoring.
5. **Opus, ONT-008 blocked:** `P116-ONT-007-required` (no schema route makes a field required once records exist,
   except by filling every record with one value — a `setRequired` on the surface, both managers, the executor and
   the route, refused while a record is empty). Then DOTTEDFILTER (a filter on a linked record's field returns
   nothing on the built-in backend).

## For Richard (plain words; the recommendation first)

- **Nothing blocking.** The two small faults s22 found in invoice numbers are fixed: if an admin types a number by
  hand in the same look (say T-0003), the backend now carries on from T-0004 instead of later handing out T-0003 and
  failing a person's save — and if two numbers ever do collide, the message names the number instead of "undefined".
- **Also fixed:** asking for "the people whose date of birth is empty" the short way returned nobody; it now returns
  the same people as the long way, on both databases and in live updates.
- Still open from s17/s20 (not blocking): who may change a field; search refused for a caller with a hidden field;
  a secret detail is unread even by the person it is about.

## Traps s23 hit

- **A `python` edit script that asserts twice writes nothing when the FIRST assert fails** — s23 read the traceback
  as the second edit failing and went on; the save half of SERIESCARRY was never written, and a mutant "reddened" a
  case that was red anyway. After a failed scripted edit, `grep` for each edit before running anything.
- **PostgreSQL errors are translated in `_run`, after an adapter method's own catch** — a catch that wants the shared
  wording translates first; `translatePgError` is idempotent now (a second translation used to say `?.?`).
- **node:sqlite's errors are from another realm under jest** — `instanceof Error` is false; test `message` by shape.
- **A twin that mirrors a defect on purpose** (the realtime matcher's "`= NULL` is never true") moves with the fix;
  the band does not run its property test.

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

`ontology-is-the-spec.md` (an s23 paragraph). The index is AT its 17,510-unit budget: tighten, never grow.
