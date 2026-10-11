# Phase 116 — next session

**Written 2026-10-11, end of s17 (Opus 5.5).** ONT-000 ✅, ONT-002 ✅, ONT-003 ✅, ONT-007 ✅. 🟡: ONT-001 (AC4 →
ONT-008), ONT-004 (AC2 → ONT-008), ONT-005 (now **13 of 38**), ONT-006 (the view is ONT-008's), ONT-011 (step 1 ✅),
ONT-012 (reach review owed), **ONT-014 (built s17; §6.4 owed)**. 📋: ONT-013, ONT-015, ONT-008, ONT-009, ONT-010.
R1–R10, R-a to R-g and **R-h** (s17) are ruled (README §9). **No ruling is waiting on Richard.**

## Before anything

0. **Model check.** The next two tasks are reach reviews and a vocabulary step, all marked **Fable 5.1**. On Opus,
   take task 3 or 4 below instead, and say so.
1. **`node scripts/bugs.js --from P116`**: 6 open (NULLEQ, DOTTEDFILTER, CRONLEAK, -required, and two owned
   elsewhere).
2. **One heavy job on this box:** `pgrep -fl bin/jest`. Peers (P107, P109, P112) ran node-spec and backend suites all
   through s17. s17 once started a 53-spec run beside two of theirs; wait instead.
3. **`git diff --cached --name-only`** first. P112 had 24 files staged all afternoon, so commit by pathspec.

## What s17 did (Opus 5.5)

1. **Committed the Fable chat's ONT-013/014/015 and s16's handoff** (`baa70f788`). They had sat untracked for 10 hours.
2. **Bug `P116-S16-INCLUDECLP` fixed** (`e06ebbd2a`, `740f67ffa`). An `include` and a `$path` now read another
   collection by that collection's own `get`/`find` rule (`StorageAclOption.reach`, from `checkClp`; the facade reads
   it via `fieldRules.reachOf`). A closed target is a bare link, a narrowed one is embedded only where it reaches, and
   a path through either is a 403. Measured red first over every door with a probe. 22/22 on both engines.
3. **R-h ruled by Richard (the recommendation):** an included author carries their name, not their account.
   Measured: anyone signed in got another person's email and admin access through `include`. Every account column
   but the username is now in the `hidden` mask, which ONT-012's strip and naming refusal already keep.
4. **ONT-014 built** (`04a51c5eb`): `moves` (who may move a value where, `by` decided per caller as `admits`),
   `frozen` (`unless`; set once; `"*"`), `delete: "never"`. Each is a condition on the OLD record ANDed into the
   write's `only`, so it is still one statement. The 409 carries the clause's words, for a move the old value's.
   54/54 on both engines, every door, three mutants.
5. **ONT-014 AC4** (`e06f4259d`): set once, never edited and never deleted are **held** in the projection
   (`WorldCollection.onlyWhile`). Claims carry the rule as data on `byPerson` steps, and the facade keeps it.
   ONT-005: every-kind 16 → 13 of 38, world 14 → 11, membership 8 → 4.
6. **The write** (`9bc713ada`): a migration's `rules` step, recorded during the run and written by the route after
   the renames, beside the person's own `onlyWhile` (`withWorldRules`: the world owns `frozen` and `delete: "never"`).
7. **Filed:** `P116-S17-DOTTEDFILTER` (a filter on a linked record's field answers nothing, even to the admin),
   `P116-S17-NULLEQ` (`{ f: null }` matches nothing; `$eq: null` works — a one-line fix in `QueryBuilder`),
   `P116-S17-CRONLEAK` (a 53-spec run exits 1 with every test green: `fed-004-overlap-drive`'s cron outlives its suite).

## What s17 measured (2026-10-11, 09:39 → ~11:30 CEST)

- `p116-s16-include-clp` 22/22, `ont-014-old-and-new` 54/54, `ont-007-route` 33/33, `ont-012-only-while` 32/32: each on
  SQLite and PostgreSQL (`postgres:///nodegx_brg005`).
- Every backend ONT and P116 spec plus the ONT-003 card, in band: **354/354, exit 0**. The project contract's
  `world.test.ts`: 36/36. The MCP's `ont002WorldTools`: 12/12.
- Neighbours in band after the ONT-014 build (53 specs: security, facade, realtime, search, FED, BRG, ONT): **797/797,
  exit 1**. The 1 is CRONLEAK; that spec exits 0 alone.
- `tsc --noEmit` clean for backend src, backend tests, the admin app, the backend contract and the project contract.
  The full backend suite and `test:ci` were **not** run.

## The next tasks, in order

1. **Reach reviews, ONT-012 then ONT-014** (Fable; ONT-014 AC6). Start from the INCLUDECLP bug's "Not covered" list
   and ONT-014 §6.4: a function's Update Record runs as admin; a hidden status in a move's 409 words; a Date frozen
   field; `withWorldRules` against a person's own hand-written `frozen`; a `repeat` hop through the queried
   collection.
2. **ONT-011 step 2** (Fable): *settled* becomes the fifteenth kind (R-c), with ONT-014's two new `RuleHold` shapes
   (`frozen` with `unless`, `moves`). That closes ONT-014's AC4 rest, and ONT-011 step 4 projects onto them.
3. **ONT-014 AC3's schema half** (Opus): a `moves` entry on a field that is not a choice or text, and a `to` value
   not in the choice. Refuse it where `security.json` is written with the schema at hand: the permissions PUT and
   the route's `rules` step.
4. **ONT-015 (a number never reused) or ONT-013 (`rules.json`)** (Opus build), both on ONT-014's seam.
5. **ONT-008** once P112 OWN-007 has started (still 📋 at s17's start).
6. If all of that is blocked: NULLEQ is a one-liner whose owner is the runtime query builder (ask, or fix with a
   both-engine spec); then `-required`.

## For Richard (not blocking; ask only when the work reaches them)

- **Who may change a field** (a per-field `update` rule): not ruled.
- **Search** is refused outright for a caller with any hidden field on the collection.
- A person's **own** row embedded through a link is stripped of their account details too (R-h, uniform). Their
  details come from `/users/me`. Say so if Richard asks why their own email is missing from an embed.

## Traps s17 hit

- **A spy cannot reach a call inside its own module.** `reachOf`, called by `refuseHiddenNamed` in the same file,
  ignored `jest.spyOn`, and the mutant "passed". Mutate at a module boundary (`model.collectionReach`).
- **`{ field: null }` matches nothing on the built-in backend** (NULLEQ). Write empty as `$exists: false`.
- **Binding every claim step to a rule broke claims about something else**: "nobody deletes a person" refused every
  cascade claim's delete. Bind only the steps a person makes (`byPerson`).
- **A rule written during a migration is overwritten by the rename move after it.** Record during, write after.
- **A peer (P109) edited `state.ts` while s17 did.** The commit went through a temporary index (HEAD + s17's hunks),
  with `update-ref` as compare-and-swap.

## Owned elsewhere

`rel002b-fail-closed` (P116-S13-REL002B, P82/TPL-001) and `ac2-page-editor-drag-drive` (P116-S13-AC2STALL,
P77/SBR-007). The untracked `.d.ts` emits in `packages/nodegx-backend-contract/src/` are not P116's.

## Not yet

The "mandatory project-docs folder" (R1) is only a DIRECTION.md candidate. Don't read the lessons backend's live schema
without its admin token. The brief is read only through `validate_world` (R5). A borrow candidate is never a kind until
step 2 says so.

## Memory

`ontology-is-the-spec.md` (an s17 paragraph). The index is AT its 17,510-unit budget: tighten, never grow.
