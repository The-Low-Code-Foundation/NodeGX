# Phase 116 — next session

**Written 2026-10-11, end of s25 (Fable 5.1).** ONT-000 ✅, ONT-002 ✅, ONT-003 ✅, ONT-007 ✅. 🟡: ONT-001 (AC4 →
ONT-008), ONT-004 (AC2 → ONT-008), ONT-005 (every-kind 14 of 51), ONT-006 (the view is ONT-008's), ONT-011 (step 5,
the view hints, owed — ONT-008's suite; step 3's `one-of` leftover), ONT-012 (reach review ✅ s18), ONT-014 (every AC
built; closes when Richard reads it), **ONT-013 (steps 1–4 ✅: 4 in s21, 1–3 in s25; step 5 owed, Opus)**, ONT-015
(every AC built s22, both defects fixed s23; closes when Richard reads it; the capability cell waits for ONT-008).
📋: **ONT-016 (scoped s25, Fable; build Opus, after R-k)**, ONT-008, ONT-009, ONT-010. R1–R10, R-a to R-j are ruled
(README §9); **one ruling waits on Richard: R-k** (below).

## Before anything

0. **Model check.** Task 1 is Opus and blocked; tasks 2, 3 and 5 are Opus; task 4 is Fable. Say which you are.
1. **`node scripts/bugs.js --from P116`**: 5 open after s25 (DOTTEDFILTER, CRONLEAK, STORAGEFLAKE (P104's spec), and
   two owned elsewhere). s25 filed none.
2. **One heavy job on this box:** `pgrep -fl "bin/jest|vitest"`. Wait for a peer's run. `ont-005-mutants` on both
   engines takes ~10 minutes: run it alone, in the background, logging to a file.
3. **`git diff --cached --name-only`** first; commit by pathspec through a temporary index (the memory recipe), then
   `git reset -q HEAD -- <your files>` so the real index matches HEAD. **A peer's edit sits in the tree:**
   `packages/nodegx-project-contract/tests/editor-suite.test.ts` and `tests/fixtures/editor-suite/reading-list*`
   are not P116's — never sweep them.
4. **`grep` is ugrep with `-I`** — use `command grep -a`. **zsh does not split `$FILES`** — use an array. **No
   `timeout` on this Mac.** **`--include=*.ts` is a zsh glob** — quote it. **`echo =====` is a zsh `=cmd`
   expansion** — quote it. **A `cd` in one of two parallel Bash calls moves the other's cwd** (one shell) — absolute
   paths everywhere. **A python edit script that reuses a variable across two replacements pastes the wrong block**
   (s25 ate a function's body this way): assert each `old` occurs once, and `git diff` after.
5. 🔴 **Every package you changed is graded by its own whole suite**: the project contract's `npx jest` +
   `tsc --noEmit -p tsconfig.tests.json`; the backend contract's `npx jest` + `tsc --noEmit -p tsconfig.json`; the
   runtime's `npx jest test/adapters` + `tsc --noEmit -p tsconfig.json`; the backend band (every `ont-`, `brg-`,
   `fed-002`, `fed-005`, `bmg-003`, `bmg-017`, both engines) + `tsc --noEmit -p tsconfig.tests.json`. **A change to
   `QueryBuilder` reaches every query: run the whole backend `npx jest` (232 files, slow) — DOTTEDFILTER is one.**
   **The MCP's world tools read the contract's SOURCE** (`world.ts` resolved by ts-jest, no dist): no rebuild owed.

## What s25 did (Fable 5.1)

OWN-007 re-measured first: still 📋 not started, so ONT-008 stays blocked and s25 took the Fable tasks.

1. **ONT-013 steps 1–3 built** (its §9.2). The fifth file `docs/world/rules.json` — `WorldRule { id, on, says,
   holds, mutant, from }` — and its validator `world/rules.ts`: nine shapes by naming member (`RULE_SHAPES`), a
   `holds` of code or SQL refused with the shapes in words and **not written** (AC2's mutant, measured on
   `planWorldWrite` and on `write_world`), a detail the noun lacks, no mutant, an agent as source, two shapes at
   once, a shape with a home of its own (`RULE_HOMES`), a `by` on a move, an `unless` on a free-text detail or with
   an operator — each refused by name (`rules.test.ts`, 38 cases). The projection takes a rule as a kind's: held
   under the rule's id (`invoice-amount-settled/frozen-once-issued`, `assignment-never-back/status-never-goes-back`)
   with `from: { rule }`, or *not kept* in the description with `why`. **R-f:** the sentence rides
   `WorldOnlyWhile` (`frozen.says`, each move arm's `says`, `delete.{where,says}`) through the migration's `rules`
   step, so the backend's 409 IS the sentence — measured over HTTP on both engines (`ont-013-rules.test.ts`). **AC3
   is graded on what the person sees**: the Schema card's descriptions off `GET /admin/schema` (a held sentence
   nowhere; an unkept one after "Not kept by the database yet:" and never before it; the reader marks the step-3
   mutant as a law), and the MCP's `validate_world` returns `rules: [{ id, on, says, kept, why? }]`. Two shapes
   joined `RuleHold`, said and never held, each naming its home: `atMost` (ONT-016) and `onlyBy` (a world names no
   role; the manager's `moves … by`). The brief's frame: "A sentence that fits no shape is not written. Ask the
   person a narrower question; never write a rule as free text, code or a query." The fixture `world-rules` (the
   task's three sentences) is the fifth pinned world in `ont-005-mutants` and the sixth in `ont-003-claims`.
2. **ONT-016 scoped** (its §3): the world half is the `atMost` shape above; the build is a declared check on the
   child's collection (`{ atMost: { limit, parent } }` beside `oneOf`/`allOrNone`), held inside the create and the
   re-parenting update under one transaction (PostgreSQL `FOR UPDATE` on the parent row), a 409 in the rule's words
   at every creating door, the claim and `dropAtMost`, the dry run naming parents over the limit. **R-k asked.**

**Where the handoff was wrong or thin:** nothing it claimed was false. It sized step 2 as "Fable, then Opus for the
plumbing"; the plumbing was small enough to do in the same session (the seams the fourth file cut were all there).
It did not say that the brief's 9,000-char budget would not hold two more sentences (8,895 → 9,839; the budget is
10,000 now, the measurement beside it in `brief.test.ts`).

## What s25 measured (2026-10-11, working tree over HEAD `ec116ed5a`)

- Project contract 16 suites **332/332** (294 → 332: `rules.test.ts` new; `project`/`mutants` over `world-rules`),
  `tsc` (tests) clean. The engine-name gate walks the new files.
- MCP `ont002WorldTools` **17/17** (5 new); `toolDisclosure` **18/18** — the resident surface unchanged (no new tool;
  one optional argument on the deferred `write_world`).
- Backend `ont-013-rules` **8/8** and `ont-003-claims` **31/31**, both engines. Backend tests `tsc`: only P107's
  `DRAWN_PORT_TYPES` (`noodl-mcp/src/specPorts.ts`, `drawnPortLookup.ts`) — not P116's.
- `ont-005-mutants` **23/23**, both engines (200 s): `world-rules` 11 mutants, 8 killed (7 by a claim at the rule's
  step, 1 by the question), **3 survive** — the two rules the store only says (unkept) and the invoice's amount as
  text (unclaimed) — pinned, the two engines agreeing; the four older worlds' numbers did not move. The first pin
  (s25's prediction) named the cohort link's question instead of the as-text amount: the log corrected it.
- Commit: see `git log` for `feat(p116/ont-013)`.

## The next tasks, in order

1. **ONT-008** once P112 OWN-007 has started (📋, re-measured s25) — it also takes ONT-015's capability cell and
   shows each rule's `kept` / *not kept* from the `rules` report.
2. **ONT-013 step 5** (Opus): the honesty accounting — ONT-005 §6 and ONT-013 §3.3 with the numbers; `world-rules`
   is a fifth pinned world (3 of 11), so the fully answered world's 14 of 51 did not move. Name the shapes an atom
   must flip (`atMost`, `onlyBy`) and what each needs.
3. **ONT-016's build** (Opus) once R-k is ruled: its §3.2, mutants, both engines; the pin flips
   `cohort-at-most-twenty/never-said` to killed.
4. **Small, Fable:** ONT-011 step 3's `one-of` leftover; refuse "goes with its keeper" + "never deleted" at
   authoring; the second conditional freeze on one collection (ONT-014 §7) — refuse it in `rules.ts` in words, or
   say it in the brief.
5. **Opus, ONT-008 blocked:** `P116-S17-DOTTEDFILTER` — a filter on a linked record's field returns nothing on the
   built-in backend, even for the admin, with no error. A `QueryBuilder` change: run the whole backend suite (rule 5).

## For Richard (plain words; the recommendation first)

- **One ruling, R-k (ONT-016):** when a limit is lowered below what a group already holds — a cohort of 25 when the
  rule becomes "at most 20" — should the backend refuse the change until the cohort is down to 20, or keep the 25 and
  refuse only the 26th? **Recommended: refuse, naming the cohorts over the limit.** That is what the backend already
  does for a shortened list or a "no two the same" rule over records that already break it: a rule is never put on
  records that break it, so nobody ever reads "at most twenty" over a cohort of 25.
- **Built behind the scenes:** you can now say a rule no template asked for — "once an invoice is issued, its amount
  never changes" — and it is kept by the database on both engines, or shown as *not kept* in those words, never as
  a law. A rule the system cannot express is refused with the list of what it can, and the agent asks you a narrower
  question instead of writing code. When a rule stops a change, the message is your sentence.
- Still open from s17/s20 (not blocking): who may change a field; search refused for a caller with a hidden field;
  a secret detail is unread even by the person it is about.

## Traps s25 hit

- **The store keeps one `frozen` condition per collection** (ONT-014 §7): a rule's conditional freeze on a list of
  fields binds a kind's unconditional *set once* on the same collection to the same condition (an invoice's number
  is "set once, once issued"; the series refuses a person's number anyway). The *set once* claim now seeds the bound
  row. A second conditional freeze is still the §7 limit.
- **A kind's unkept-rule mutant is the RIGHT schema** (`retype`), and `collectionsText` includes the descriptions —
  so a rules.json unkept mutant must be the right schema too, or `mutants.test` reads "the text differs ⇒ it must
  run or be killed".
- **A rule's own sentence ends in a full stop**; the description's list strips it (`..` otherwise).
- **The MCP and the backend specs read the contract's source**, by `world.ts` at the package root (no `exports`,
  `main: index.ts`): nothing to rebuild, and `require.resolve` from plain node cannot find it.

## Owned elsewhere

`rel002b-fail-closed` (P116-S13-REL002B, P82/TPL-001) and `ac2-page-editor-drag-drive` (P116-S13-AC2STALL,
P77/SBR-007). `bmg-002-filters` "due within past7" is red on Sundays — `P109-S41-SUNDAYWEEK`, P109's. The untracked
`.d.ts` emits in `packages/nodegx-backend-contract/src/` are not P116's. P107's `DRAWN_PORT_TYPES` tsc error is P107's.

## Not yet

The "mandatory project-docs folder" (R1) is only a DIRECTION.md candidate. Don't read the lessons backend's live schema
without its admin token. The brief is read only through `validate_world` (R5). The private corpora are sibling folders
of this checkout; their names and paths stay out of the repo (R6) — the census takes them as flags:
`node scripts/ontology/census.js --check --acme <path> --tirion <path> --sentinel <path> --private <dir>` (the private folder's README has the paths).
The private verdicts for s21's new candidates are in that folder's `borrows.json` (not a git repo).

## Memory

`ontology-is-the-spec.md` (an s25 paragraph). The index is AT its 17,510-unit budget: tighten, never grow.
