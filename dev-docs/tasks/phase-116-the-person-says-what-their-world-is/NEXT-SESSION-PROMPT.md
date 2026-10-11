# Phase 116 — next session

**Written 2026-10-11, end of s20 (Opus 5.5).** ONT-000 ✅, ONT-002 ✅, ONT-003 ✅, ONT-007 ✅. 🟡: ONT-001 (AC4 →
ONT-008), ONT-004 (AC2 → ONT-008), ONT-005 (every-kind 14 of 51), ONT-006 (the view is ONT-008's), **ONT-011 (steps
1, 2, 4 ✅, AC1 and AC3 ✅; step 5, the view hints, owed — ONT-008's suite)**, ONT-012 (reach review ✅ s18),
**ONT-014 (AC3 ✅ s20; only the cascade owed, a ruling first)**. 📋: ONT-013, ONT-015, ONT-008, ONT-009, ONT-010.
R1–R10, R-a to R-h are ruled (README §9). **Two rulings are still waiting on Richard** (below, "For Richard").

## Before anything

0. **Model check.** Tasks 1–3 below are Opus builds; 4 is a small Fable vocabulary step. Say which you are.
1. **`node scripts/bugs.js --from P116`**: 7 open (**CASCADEHOLD** high; NULLEQ, DOTTEDFILTER, CRONLEAK, -required,
   and two owned elsewhere). `P116-S20-STALEMSG` is filed fixed.
2. **One heavy job on this box:** `pgrep -fl "bin/jest|vitest"`. Wait for a peer's run.
3. **`git diff --cached --name-only`** first; commit by pathspec through a temporary index (the memory recipe), then
   `git reset -q -- <your files>` so the real index matches HEAD.
4. **`grep` is ugrep with `-I` here** — use `command grep -a`. **zsh does not split `$FILES`** — use an array
   (`FILES=(a b); git diff -- "${FILES[@]}"`). **There is no `timeout` on this Mac** — `timeout 600 npx tsc …` prints
   "command not found" and a `| grep` after it swallows that: s20 believed a tests type-check had run for an hour.
5. 🔴 **Every package you changed is graded by its own whole suite** (STALEGOLDEN s19, STALEMSG s20): the project
   contract's `npx jest` + `tsc -p tsconfig.tests.json`; the backend contract's `npx jest` (it holds `viewer-es5`);
   the backend band below + `tsc -p tsconfig.tests.json` (exit status, not grep).

## What s20 did (Opus 5.5)

1. **ONT-014 AC3's schema half** (its §6.6, `934d63e06`): `onlyWhileSchemaProblems` (`security/model.ts`) reads a
   `moves` rule against the declared column and choice — only text moves; a choice's moves name its own values — at
   both permission PUTs (400) and the world migration, against the schema **the plan leaves** (`tablesAfterPlan`,
   `server/admin-world.ts`; `createTable` is create-if-absent there, as in the route). Only what the schema DECLARES
   is refused: a table made by first use records no columns. Not built: the reverse door (a schema change after the
   rule does not re-read it; the rule goes stale, it does not open).
2. **ONT-011 step 4** (its §11): `secret: true` → `WorldCollection.fields` → `security.json`
   `collections.<c>.fields.<f>.read: "nobody"` (admin and functions only — a world names no role), held, through the
   migration `rules` step (`fields` + `wasFields`, present only when either side has a secret; `withWorldRules`
   merges per field, `worldRuleLosses` names a hand rule on the same field). The claim reads as a person signed in:
   the new **`unseen`** claim step in both contracts, the field rule handed over as data in the read ACL (`hidden`),
   and the claim specs' helper routes a fetch with an ACL through `AdapterFacade.rawFetch`. Mutant `dropFieldRule`.
   **AC3:** Nightbook's `Profile` (`codeV`, `answerV`, `rescueV`) asked and projected (`project.test.ts`).
3. **Found red at HEAD and fixed:** the backend contract's `migration.test.ts` since s17 (`P116-S20-STALEMSG`).

## What s20 measured (2026-10-11)

- Project contract: 13 suites **269/269**; `tsc` clean (package, tests). Backend contract: 9 suites **232/232**, `tsc`
  clean. MCP `ont002WorldTools` 12/12. `ontology-census:check` green.
- Backend band (ont-003-claims, ont-005-mutants, ont-003-write, ont-007-route, ont-007-migration, ont-004-world,
  ont-006-verbs, ont-002-through, ont-014-reach-review, ont-014-old-and-new, ont-012-only-while, ont-012-field-reads,
  security-model) on SQLite and PostgreSQL: **13 suites, 347/347, exit 0**; backend `tsc` clean for `src` and tests
  (exit 0, measured without `timeout`).
- Each new spec was shown red with its fix disabled (the route's schema check; the route's field merge) or carries a
  mutant (`onlyWhileSchemaProblems` spied to `[]`; `dropFieldRule`).
- ONT-005 every-kind: **51 mutants, 14 survive** (0 unanswered, 6 unkept, 8 unclaimed) on both engines —
  `person/secret-unanswered` killed by `person/email-is-not-for-everyone`.

## The next tasks, in order

1. **The cascade, `P116-S18-CASCADEHOLD`** (Opus, after the ruling): `StorageAclOption.onlyWhile` per collection (as
   `hidden` and `reach` are), `aclFor` fills every collection that has one, `heldWhile` indexes by collection,
   `DeleteContext` gains a `held` hook that `deleteKeepingLinks` asks for every gone and unlinked row BEFORE anything
   is deleted. The probe's cases 5a/5b (`ont-014-reach-review.test.ts`) are the regression; flip them from `it.failing`.
2. **ONT-015 or ONT-013** (Opus build), both on ONT-014's seam. ONT-015's `series` hold replaces s19's said one (the
   claim `session/number-never-used-again` is measured not held today). Read the task file's ACs first.
3. **ONT-008** once P112 OWN-007 has started (still 📋); its step 5 reads `calledBy`, `onlyWhen` and now `fields`.
4. **ONT-011 step 3's leftover** (Fable, small): the `one-of` "a detail that matters only for some values" question
   has no census row and was not asked; if a row appears, it is `onlyWhen` with `is` on a choice.
5. If blocked: NULLEQ (one line in `QueryBuilder`, both-engine spec), then `-required`.

## For Richard (plain words; the recommendation first)

- **When someone deletes a keeper, and the keeper's envelope "is never deleted" — does the delete stop, in the
  envelope's words, or does the envelope go with the keeper?** Recommendation: it stops; only the admin (or a
  function) can delete the keeper then. The same for a frozen link. (CASCADEHOLD; measured: today the envelope goes.)
- **"A sealed envelope is never edited" — may its owner still change who can read it (its ACL)?** Today they can.
  Recommendation: no — `frozen: "*"` freezes the ACL too.
- **New, not blocking:** a detail said secret is now read by nobody but the admin and functions — not even the
  person it is about (their own email on their profile page). Ask only if an app needs "the person themselves may
  read it"; it would be a follow-up question ("who may read it?") answered with a path the world can say.
- Still open from s17 (not blocking): who may change a field; search refused outright for a caller with any hidden
  field; a person's own row embedded through a link is stripped of their account details (R-h, uniform).

## Traps s20 hit

- **`timeout` does not exist here**, and `cmd | grep` hides "command not found" — gate on the exit status.
- **zsh `$FILES` is one word** — a `git diff --stat -- $FILES` printed nothing and looked like "someone took my edit".
- **A mutant written as `[] && x` is not a mutant** — `[]` is truthy, so it evaluates to `x`; use `[] ||`.
- **A planner field added to every step changes plans that never needed it** (and an exact-shape spec); emit it only
  when it says something.

## Owned elsewhere

`rel002b-fail-closed` (P116-S13-REL002B, P82/TPL-001) and `ac2-page-editor-drag-drive` (P116-S13-AC2STALL,
P77/SBR-007). The untracked `.d.ts` emits in `packages/nodegx-backend-contract/src/` are not P116's.

## Not yet

The "mandatory project-docs folder" (R1) is only a DIRECTION.md candidate. Don't read the lessons backend's live schema
without its admin token. The brief is read only through `validate_world` (R5). The private corpora are sibling folders
of this checkout; their names and paths stay out of the repo (R6) — the census command takes them as flags.

## Memory

`ontology-is-the-spec.md` (an s20 paragraph). The index is AT its 17,510-unit budget: tighten, never grow.
