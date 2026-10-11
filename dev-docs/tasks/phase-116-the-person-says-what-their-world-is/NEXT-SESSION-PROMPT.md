# Phase 116 — next session

**Written 2026-10-11, end of s22 (Opus 5.5).** ONT-000 ✅, ONT-002 ✅, ONT-003 ✅, ONT-007 ✅. 🟡: ONT-001 (AC4 →
ONT-008), ONT-004 (AC2 → ONT-008), ONT-005 (every-kind 14 of 51), ONT-006 (the view is ONT-008's), ONT-011 (step 5,
the view hints, owed — ONT-008's suite), ONT-012 (reach review ✅ s18), ONT-014 (every AC built; closes when Richard
reads it), **ONT-013 (step 4 ✅ s21; steps 1–3 and 5 owed)**, **ONT-015 (every AC built s22; closes when Richard
reads it; the capability cell waits for ONT-008)**. 📋: ONT-016 (opened s21, unscoped), ONT-008, ONT-009,
ONT-010. R1–R10, R-a to R-j are ruled (README §9); **nothing is waiting on Richard**.

## Before anything

0. **Model check.** Tasks 1 and 2 below are Opus; 3–5 are Fable. Say which you are.
1. **`node scripts/bugs.js --from P116`**: 8 open (SERIESCARRY, SERIESMSG — filed s22 — NULLEQ, DOTTEDFILTER,
   CRONLEAK, -required, and two owned elsewhere).
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

## What s22 did (Opus 5.5) — ONT-015's every AC (its §6.3)

1. **The projection.** A read-aloud noun whose look is said gets the store's series on `number` (`noun.ts`
   `numberSeries`: `looksLike` → format, `maySkip: false` → gap-free, `restarts` → year/month), held; unsaid look → no
   series, said in words, s19's not-held claim. `numberLookProblem` refuses an unkeepable look in the validator.
2. **The claim** `<noun>/number-never-used-again` held, new claim step **`numbered`** (both contracts, `runClaim`
   remembers a deleted row's number), mutant **`dropSeries`**. The brief teaches the three answers.
3. **AC3:** `setSeries` on the schema surface, both schema managers, the executor, `POST /admin/schema` — the store
   numbers the records without a value in `createdAt` order, each in its period, above the highest held
   (`planNumbering`/`seriesParse` in `adapters/series.ts`), counter never backward; the dry run counts them; the planner
   writes `addColumn` (plain) then `setSeries`. 3 conformance cases more (`series` 13), coverage ledger.
4. **Not built on purpose:** the capability cell — `CapabilityKey`'s rule is "no key nothing consumes"; its consumer is
   ONT-008's field editor. No AC names it. **AC5's "the pin moves" measured false:** still 14 of 51 (the read-aloud
   mistake was already killed for want of a home); said in the pin's docblock and §6.3.
5. **Filed:** `P116-S22-SERIESCARRY` (an admin's in-look number does not move the counter → a later person's create
   409s) and `-SERIESMSG` (that 409 says `undefined is already used`).

## What s22 measured (2026-10-11)

- Project contract 14 suites **289/289**, `tsc` clean (new `tests/series.test.ts` 20, two mutants shown red).
- Backend contract 9 suites **232/232**, `tsc` clean. Runtime `test/adapters` 17 suites **331/331**, `tsc` clean.
- Backend band (every `ont-`, `brg-`, `fed-002`, `fed-005`, `bmg-003`, `bmg-017`, both engines) **41 suites, 666/666**,
  incl. new `ont-015-projection` 13/13 (AC3 ×2, AC2's 409, two `planNumbering` mutants) and ONT-005 14 of 51 both engines.
- Backend `tsc -p tsconfig.tests.json`: **one error, not P116's** — `noodl-mcp/src/specPorts.ts` imports
  `DRAWN_PORT_TYPES` from `@nodegx/node-spec` (P107 `ed7706984`, committed during s22). Re-measure before blaming it.
- Not run: `test:ci`, the whole backend suite.

## The next tasks, in order

1. **SERIESCARRY + SERIESMSG** (Opus, small, both engines): apply `planNumbering`'s rule in the create — a carried
   value `seriesParse` reads in the look raises its period's counter (never backward); then the 409 names the handed-out
   number. A conformance case each. ONT-015 is otherwise done.
2. **ONT-008** once P112 OWN-007 has started (still 📋) — it also takes ONT-015's capability cell.
3. **ONT-013 steps 1–3** (Fable): the brief's two sentences, `rules.json`, the *not kept:* read-back.
4. **ONT-016 scoping** (Fable): per-parent count; one ruling to ask (a limit lowered below today's count).
5. Small, Fable: ONT-011 step 3's `one-of` leftover; refuse "goes with its keeper" + "never deleted" at authoring.
6. If blocked: NULLEQ (one line in `QueryBuilder`, both-engine spec), then `-required`.

## For Richard (plain words; the recommendation first)

- **Nothing blocking.** When you read ONT-015: a person who says "invoice numbers look like INV-2026-0042, never
  skip, start again each January" now gets exactly that from the backend, with no code; and if they say it after
  invoices already exist, the migration numbers the old ones in the order they were made (and tells them how many
  first), keeping any number an invoice already had.
- **Two small faults found, filed, not fixed:** if an admin types a number by hand in the same look (say T-0003), the
  backend will later try to hand out T-0003 itself and the person's save fails — with a message that says "undefined"
  instead of the number. Next session's first job.
- Still open from s17/s20 (not blocking): who may change a field; search refused for a caller with a hidden field;
  a secret detail is unread even by the person it is about.

## Traps s22 hit

- **A green mutant arm can hide a wrong message** — the "counter left" mutant was refused for the right reason, and
  printing the refusal is what found SERIESMSG. Read the refusal, not only its status.
- **An AC can predict a measurement wrong** ("the pin moves"): measure it and say so, never bump to match.
- **`grep -c MUTANT` counted `NOUN_MUTANTS`** after a restore — `cmp` against the backup is the proof.
- **A capability key has a rule of its own** (no key without a consumer) that a task's prose can contradict.

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

`ontology-is-the-spec.md` (an s22 paragraph). The index is AT its 17,510-unit budget: tighten, never grow.
