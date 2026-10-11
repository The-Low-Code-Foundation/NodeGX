# Phase 116 — next session

**Written 2026-10-11, end of s18 (Fable 5.1).** ONT-000 ✅, ONT-002 ✅, ONT-003 ✅, ONT-007 ✅. 🟡: ONT-001 (AC4 →
ONT-008), ONT-004 (AC2 → ONT-008), ONT-005 (now **14 of 45** on every-kind), ONT-006 (the view is ONT-008's),
**ONT-011 (step 1 ✅; step 2's *settled* half ✅ s18, its §9; the other three borrows owed)**, **ONT-012 (reach review
✅ s18, §6.4)**, **ONT-014 (reach review ✅ s18, §6.5; AC4's two shapes and `was` built; AC3's schema half and the
cascade owed)**. 📋: ONT-013, ONT-015, ONT-008, ONT-009, ONT-010. R1–R10, R-a to R-h are ruled (README §9).
**Two rulings are waiting on Richard** (below, "For Richard").

## Before anything

0. **Model check.** Task 1 below is a vocabulary step (**Fable 5.1**); tasks 2–4 are fixed-shape builds on existing
   seams (**Opus 5.5**). Say which you are and take the matching task.
1. **`node scripts/bugs.js --from P116`**: 7 open (**CASCADEHOLD** new, high; NULLEQ, DOTTEDFILTER, CRONLEAK,
   -required, and two owned elsewhere).
2. **One heavy job on this box:** `pgrep -fl bin/jest`. P112's node-spec suite ran twice during s18 (once for ~15 min);
   s18 waited each time. Wait.
3. **`git diff --cached --name-only`** first; commit by pathspec through a temporary index (the memory recipe). s18's
   two commits went that way.
4. **`grep` is ugrep with `-I` here and silently skipped `HttpServer.ts` as binary.** Use `command grep -a`.

## What s18 did (Fable 5.1)

1. **The reach reviews, ONT-012 + ONT-014 (AC6)** — commit `441673335`. Nine probes written as the behaviour that
   SHOULD hold (`packages/nodegx-backend/tests/ont-014-reach-review.test.ts`), seven red on both engines at HEAD:
   - **A write is a read.** A field R-a hides from the caller answered through the write's success: ONT-014's
     "staying is not a move" and "the same value is not a change" compared the body with the hidden value (PUT of a
     guess: 200 when right, 409 when wrong), and a move's 409 named the hidden old value. Fixed in
     `persistence/onlyWhile.ts`: for a field in the caller's `hidden` mask every write is a change and the words name
     the field; shown-on-some-rows fields are compared only where the rule reaches.
   - **A Date frozen field** was never "the same value" (an echo and the first write of an empty one were 409s; the
     s17 spec used a String column). `stored()` unwraps a Date; arms are per field, so an Object's first write passes.
     Known limit, graded: an Object's echo is a change.
   - **A `$path` through the narrowed queried collection** walked rows outside the caller's narrowing (INCLUDECLP's
     "not covered"). `fieldRules.ts` refuses it (403, `collection-rule`).
   - **`withWorldRules` replaced a hand-written `unless` freeze in silence.** `worldRuleLosses` names it in the dry
     run's `why` and the run is 409 until `acceptLosses`.
   - **The cascade** (`goes-too` into `delete: "never"`, `stays-unlinked` into a frozen link): a learner's DELETE of a
     keeper took the sealed envelope and emptied the issued invoice's customer. **Filed `P116-S18-CASCADEHOLD`**
     (high), `it.failing` ×2. Not fixed: needs the ruling and a per-collection `onlyWhile` in the ACL option.
   - Dotted filters/accessors through a link onto a hidden or closed field: **green** (nothing returned), graded.
   - The ACL of a never-edited record: a bound writer rewrote it (200) — a ruling, not asserted.
2. **ONT-011 step 2, the *settled* half** — uncommitted at the time of writing (see "Measured"). The fifteenth kind in
   `kinds.hand.json` (with `borrow: 'settled'`: `census.js` counts a borrow-backed kind from step 1's yes verdicts;
   8 rows over 4 sources, the relation-row count still 303, `world.test.ts` pins 311) and `kinds.ts`; five questions,
   one with a new **`fields`** answer shape (names of the noun's own details, validated against the noun); the
   projection onto ONT-014's two new `RuleHold` shapes — `{ frozen, unless?, except?, heldOn?, freeOn? }`, `{ moves,
   from }` — and `neverDeleted` with `unless`; `WorldOnlyWhile` grew to carry `frozen.unless`, `except`, `moves` and a
   `delete: { where }`; three held claims with mutants; `applyMutant`/`without: { rule }` drop them. The migration's
   `rules` step carries **`was`** (the world's previous `onlyWhile`), and `withWorldRules` merges by provenance (a
   clause that differs from `was` is the person's and is kept, unless the world now says it — then a loss);
   a plan without `was` keeps s17's slot rule. `world-every-kind` gained a `quote` noun and `quote-sent`.
3. **Read s18:** `nodegx-project-contract/tests/mutants.test.ts` had been red since s17 (`merge-by-delete` and
   `editable-history` are held now, so the static verdict is `run`); it now says so. The handoff before this one had
   not run it.

## What s18 measured (2026-10-11, 13:30 → 14:45 CEST)

- `ont-014-reach-review` 26/26 on SQLite and PostgreSQL (two `it.failing` for CASCADEHOLD); the P116 backend band
  before the review's commit: **18 suites, 403/403, exit 0**.
- After step 2: project contract `world.test.ts` 36/36, `mutants.test.ts` 21/21; MCP `ont002WorldTools` 12/12;
  `npm run ontology-census:check` green with the private paths; `tsc --noEmit` clean for the project contract, the
  backend contract and the backend. The backend band for step 2 (ont-005, ont-007-route, ont-003-claims,
  ont-014-reach-review) was running when this was written — its result is in the s18 commit message for step 2, or,
  if there is no such commit, the next session runs it first.
- ONT-005 every-kind: **45 mutants, 14 survive** (5 unkept, 9 unclaimed) on both engines; settled's six killed.

## The next tasks, in order

1. **ONT-011 step 2, the other three borrows** (Fable): facts about a thing on `Noun` (`files.ts`, `world.schema.json`:
   only one, a number read aloud, what you call one, who changed what — each a question and a mutant); `secret` and
   `onlyWhen` as answers on a property (the kinds whose target is a property, and `ends`). Step 4 then projects
   `secret` to `fields.<f>.read` (the target exists, ONT-012 §6.2).
2. **The cascade, `P116-S18-CASCADEHOLD`** (Opus, after the ruling): `StorageAclOption.onlyWhile` per collection (as
   `hidden` and `reach` are), `aclFor` fills every collection that has one, `heldWhile` indexes by collection,
   `DeleteContext` gains a `held` hook that `deleteKeepingLinks` asks for every gone and unlinked row BEFORE anything
   is deleted (as `blocks` is asked). The probe's cases 5a/5b are the regression; flip them from `it.failing`.
3. **ONT-014 AC3's schema half** (Opus): a `moves` entry on a field that is not a choice or text, and a `to` value not
   in the choice, refused where `security.json` is written with the schema at hand (the permissions PUT, the route's
   `rules` step).
4. **ONT-015 or ONT-013** (Opus build), both on ONT-014's seam. ONT-008 once P112 OWN-007 has started (still 📋).
5. If blocked: NULLEQ (one line in `QueryBuilder`, both-engine spec), then `-required`.

## For Richard (plain words; the recommendation first)

- **When someone deletes a keeper, and the keeper's envelope "is never deleted" — does the delete stop, in the
  envelope's words, or does the envelope go with the keeper?** Recommendation: it stops; only the admin (or a
  function) can delete the keeper then. The same for a frozen link: the delete stops rather than emptying a field
  the person may not change. (CASCADEHOLD; measured: today the envelope goes, 200.)
- **"A sealed envelope is never edited" — may its owner still change who can read it (its ACL)?** Today they can
  (measured 200 on both engines). Recommendation: no — `frozen: "*"` freezes the ACL too; a PUT that echoes an
  unchanged ACL would then be refused, which only matters for a client that sends the whole record back.
- Still open from s17 (not blocking): who may change a field (a per-field `update` rule); search refused outright
  for a caller with any hidden field; a person's own row embedded through a link is stripped of their account
  details (R-h, uniform).

## Traps s18 hit

- **A write's success is a read of whatever the write is compared against.** Grade a hidden field at every door
  that COMPARES it, not only the ones that return it.
- **A spec's column type is a fixture choice.** The s17 spec said "date of birth" and used a String; a Date column
  broke the rule. When a sentence names a type, the fixture should carry it.
- **The static mutant spec was red for a session and nobody ran it.** `world.test.ts` green is not the package green.
- **One `frozen` per collection.** A noun that is both *settled* and has a `setOnce` field gets the union under
  settled's `unless` (the set-once field is editable while a draft). Said in ONT-011 §9; a second clause would need
  the backend shape to grow.

## Owned elsewhere

`rel002b-fail-closed` (P116-S13-REL002B, P82/TPL-001) and `ac2-page-editor-drag-drive` (P116-S13-AC2STALL,
P77/SBR-007). The untracked `.d.ts` emits in `packages/nodegx-backend-contract/src/` are not P116's.

## Not yet

The "mandatory project-docs folder" (R1) is only a DIRECTION.md candidate. Don't read the lessons backend's live schema
without its admin token. The brief is read only through `validate_world` (R5). The private corpora are sibling folders
of this checkout; their names and paths stay out of the repo (R6) — the census command takes them as flags.

## Memory

`ontology-is-the-spec.md` (an s18 paragraph). The index is AT its 17,510-unit budget: tighten, never grow.
