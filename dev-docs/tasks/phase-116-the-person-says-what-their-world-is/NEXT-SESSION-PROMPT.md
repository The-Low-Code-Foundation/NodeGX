# Phase 116 — next session

**Written 2026-10-11, end of s19 (Fable 5.1).** ONT-000 ✅, ONT-002 ✅, ONT-003 ✅, ONT-007 ✅. 🟡: ONT-001 (AC4 →
ONT-008), ONT-004 (AC2 → ONT-008), ONT-005 (every-kind: see "What s19 measured"), ONT-006 (the view is ONT-008's),
**ONT-011 (step 1 ✅; step 2 ✅ — *settled* s18 §9, the other three borrows s19 §10; steps 4 and 5 owed)**, ONT-012
(reach review ✅ s18), ONT-014 (AC3's schema half and the cascade owed). 📋: ONT-013, ONT-015, ONT-008, ONT-009,
ONT-010. R1–R10, R-a to R-h are ruled (README §9). **Two rulings are waiting on Richard** (below, "For Richard").

## Before anything

0. **Model check.** Tasks 1–4 below are fixed-shape builds on existing seams (**Opus 5.5**); task 5 is a vocabulary
   step (**Fable 5.1**). Say which you are and take the matching task.
1. **`node scripts/bugs.js --from P116`**: 7 open (**CASCADEHOLD** high; NULLEQ, DOTTEDFILTER, CRONLEAK, -required,
   and two owned elsewhere). `P116-S19-STALEGOLDEN` is filed fixed.
2. **One heavy job on this box:** `pgrep -fl bin/jest`. A P107 stranger suite ran beside s19's backend band. Wait.
3. **`git diff --cached --name-only`** first; commit by pathspec through a temporary index (the memory recipe).
4. **`grep` is ugrep with `-I` here.** Use `command grep -a`.
5. 🔴 **"The spec I touched is green" is not "the package is green"** (bug `P116-S19-STALEGOLDEN`): run the
   project contract's whole `npx jest` and `tsc -p tsconfig.tests.json`, not the two suites you edited.

## What s19 did (Fable 5.1) — ONT-011 step 2, the other three borrows (its §10)

1. **Facts about a thing** on the noun. `world/noun.ts`: `NOUN_QUESTIONS` (data, with `prevents` and answer shapes —
   `field` is a new `AnswerShape`) and `NOUN_MUTANTS` (ONT-005 §3 step 3's list); answers in `nouns[].answers`
   (`files.ts`, `world.schema.json`, validator, brief, the migration diff's `noun-answered`). The runner asks the five
   facts once per world (after every relation question, before the kind-picker: `about: { nouns, question }`) and the
   three number follow-ups per noun. Projections (`project.ts`): `onlyOne` → said + a claim measured to fail;
   `calledBy` → `WorldCollection.calledBy` (the view hint); `history` → a held `<Noun>History` collection, the
   writing said; `readAloud` → `number` text, unique + set once (held) with ONT-015's series said in words
   (`looksLike`, `maySkip` — R-g, `restarts`); `secret` → said (step 4's). `worldMutants()` makes the noun's mutants
   (`<noun>/<question>-unanswered`; `calledBy` makes none).
2. **`secret: true`** on a property (the which; the noun's `answers.secret` is the yes — as `path` + `through`).
3. **`onlyWhen: { field, is?, required? }`** on a property; the `ends` kind's `endNote` / `endNoteNeeded`; `RuleHold`
   `{ onlyWhen, when, is?, required }` → **held as an `allOrNone` check** when required and no `is` (`WorldCheck` is
   now a union; `ClaimMutant.dropAllOrNone`; both engines enforce it in `schemaCommon.ts`), said otherwise. Seed
   `ends/note-always-optional`. A `without`-rule seed whose question is unanswered rides that question's mutant or
   is not applicable — never "cannot".
4. **Fixtures:** every fixture's nouns answer the five facts; `world-every-kind` exercises each once (a `settings`
   noun; `account.history`; `session.readAloud` S-{####}; `person.email` secret; `person.left because` named by
   `leaves.endNote`, needed; `slot.closed because` only when `open` is false). Goldens regenerated and read.
5. **Found red at HEAD and fixed** (`P116-S19-STALEGOLDEN`): `project.test.ts`'s goldens and its "nothing said is
   dropped" branch since s17; `migrate.test.ts`'s type-check since s18. The s18 handoff said the contract was green
   because only `world.test.ts` and `mutants.test.ts` had been run.
6. `kinds.hand.json`'s `ends` question line carries the note questions; `npm run ontology-census` regenerated
   `kinds.json` / `KINDS.md` (15 kinds, 108 in-repo rows; the pin 311 unchanged); `ontology-census:check` green.
7. The MCP's `ont002WorldTools` pin moved (two wait behind the Acme fixture's first two, not one: `leaves/endNote`).

## What s19 measured (2026-10-11)

- Project contract: `npx jest` **13 suites, 263/263**; `tsc` for `tsconfig.json` and `tsconfig.tests.json` clean.
- MCP `ont002WorldTools` 12/12. Backend `tsc --noEmit` clean. `ontology-census:check` green (private counts carried).
- Backend band (ont-003-claims, ont-005-mutants, ont-003-write, ont-007-route, ont-004-world, ont-006-verbs,
  ont-002-through, ont-014-reach-review) on SQLite and PostgreSQL: **8 suites, 138/138, exit 0** on both engines (ont-003-write, ont-003-claims and ont-005-mutants rerun after the `who` rename and the pin, 51/51 at 15:22 CEST; the other five green in the 14:56 band); ONT-003 claims on every-kind: 46 of 46 (43 held, 3 measured not held — only one, the number never used again, and the pair said twice).
- ONT-005 every-kind honesty number: **51 mutants, 15 survive** (0 unanswered, 7 unkept, 8 unclaimed), identical on SQLite and PostgreSQL — 14 of 45 → 15 of 51: `account/history-unanswered` killed for want of a home, `leaves/endNote-` and `endNoteNeeded-unanswered` and the seed `note-always-optional` killed at the held all-or-none claim (which also kills `leaves/end-by-delete`, unsaid, so `endedAt` has no home), `settings/onlyOne-unanswered` and `person/secret-unanswered` surviving unkept by design, each naming the step that keeps it; `world` and `world-membership` gain `leaves/endNote-unanswered (unanswered)` — neither answers it.

## The next tasks, in order

1. **The cascade, `P116-S18-CASCADEHOLD`** (Opus, after the ruling): `StorageAclOption.onlyWhile` per collection (as
   `hidden` and `reach` are), `aclFor` fills every collection that has one, `heldWhile` indexes by collection,
   `DeleteContext` gains a `held` hook that `deleteKeepingLinks` asks for every gone and unlinked row BEFORE anything
   is deleted. The probe's cases 5a/5b are the regression; flip them from `it.failing`.
2. **ONT-014 AC3's schema half** (Opus): a `moves` entry on a field that is not a choice or text, and a `to` value not
   in the choice, refused where `security.json` is written with the schema at hand.
3. **ONT-011 step 4** (Opus, the target exists — ONT-012 §6.2): project a property's `secret: true` to
   `security.json` `collections.<c>.fields.<f>.read` through the migration route's `rules` step (as `onlyWhile`
   rides it; `WorldOnlyWhile` or a sibling `WorldFieldRules`), and flip the `secret` hold from said to held with a
   claim that reads as a bound caller (ONT-003's claim steps have no reader principal yet — that is the first thing
   to build). Who may read it: nobody but the admin and functions until a role vocabulary exists (a world names no
   role — settled's `moves` has no `by` for the same reason). AC3 of ONT-011 closes here.
4. **ONT-015 or ONT-013** (Opus build), both on ONT-014's seam; ONT-015's `series` hold replaces s19's said one.
   ONT-008 once P112 OWN-007 has started (still 📋); its step 5 reads `calledBy` and `onlyWhen` from the files now.
5. **ONT-011 step 3's leftover** (Fable, small): the `one-of` "a detail that matters only for some values" question
   has no census row and was not asked (§10); if a row appears, it is `onlyWhen` with `is` on a choice.
6. If blocked: NULLEQ (one line in `QueryBuilder`, both-engine spec), then `-required`.

## For Richard (plain words; the recommendation first)

- **When someone deletes a keeper, and the keeper's envelope "is never deleted" — does the delete stop, in the
  envelope's words, or does the envelope go with the keeper?** Recommendation: it stops; only the admin (or a
  function) can delete the keeper then. The same for a frozen link. (CASCADEHOLD; measured: today the envelope goes.)
- **"A sealed envelope is never edited" — may its owner still change who can read it (its ACL)?** Today they can.
  Recommendation: no — `frozen: "*"` freezes the ACL too.
- Still open from s17 (not blocking): who may change a field; search refused outright for a caller with any hidden
  field; a person's own row embedded through a link is stripped of their account details (R-h, uniform).

## Traps s19 hit

- **A sibling spec in the same package is a gate on your change whether or not you named it** (STALEGOLDEN).
- **A `without`-rule seed on a world that never answered the question is "cannot"**, and the static spec crashes on
  a `cannot` (`m.schema!.collections`); the fix is in `worldMutants()`, not the fixture.
- **One `frozen` per collection** still: a set-once field on a settled noun is free while the record is a draft, so
  its claim must make the row on `heldOn` (s19 made the set-once claim read the frozen rule's `heldOn`).
- **The index budget is AT 17,510** — the memory index line for P116 was edited in place (`s18` → `s19`), no growth.

## Owned elsewhere

`rel002b-fail-closed` (P116-S13-REL002B, P82/TPL-001) and `ac2-page-editor-drag-drive` (P116-S13-AC2STALL,
P77/SBR-007). The untracked `.d.ts` emits in `packages/nodegx-backend-contract/src/` are not P116's.

## Not yet

The "mandatory project-docs folder" (R1) is only a DIRECTION.md candidate. Don't read the lessons backend's live schema
without its admin token. The brief is read only through `validate_world` (R5). The private corpora are sibling folders
of this checkout; their names and paths stay out of the repo (R6) — the census command takes them as flags.

## Memory

`ontology-is-the-spec.md` (an s19 paragraph). The index is AT its 17,510-unit budget: tighten, never grow.
