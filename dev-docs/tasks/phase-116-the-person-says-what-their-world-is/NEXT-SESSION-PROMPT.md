# Phase 116 — next session

**Written 2026-10-09, end of s13 (Opus 5.5).** ONT-000 ✅, ONT-003 ✅ (+ R10 §6.6, **+ §6.7 and §6.8, s13**), ONT-007 ✅.
ONT-001 🟡 (AC4 → ONT-008), ONT-004 🟡 (AC2 → ONT-008), ONT-005 🟡 (16 of 38 pinned, unchanged), ONT-002 🟡 ("through
what?" owed), ONT-006 🟡 (the view is ONT-008's). R1–R10 all ruled (README §9). Nothing is waiting on Richard.

## What s13 did (Opus 5.5). P112 OWN-007 was still 📋 (checked at start), so ONT-008 stayed blocked

1. **Bug `P116-ONT-003-pairs` fixed** (ONT-003 §6.7). A Links field's pairs now go with either end. They are part of
   the plan `deleteKeepingLinks` already reads: `DeletePlan.unpaired` holds every pair, at either end, of every record
   that goes (`goes-too` included). They are taken out last, as master, through the data plane's `removeRelation`.
   `DeleteContext.schema` now also picks `getRelatedIds` and `getRelationOwners`, which were already on
   `IStorageSchema`, so no new schema member was needed and the BRG-003 ratchet does not move. `DeleteContext` gains
   `unpair`. A delete of a record that is not there takes no pairs: both engines' master-key delete SUCCEEDS on a
   missing id, so the plan's existence check is the only guard.
2. **The viewer build, P109's catch.** `@noodl/backend-contract` `src/` is compiled by the viewer's ES5 webpack, where
   a Map spread is TS2802 and no bundle gets written. s12's `[...counts.values()]` in `targetGoes.ts` had turned
   `ci:build:viewer` red. Both spreads are now `Array.from`. Check: `npx tsc --noEmit --target ES5 --lib es2019,dom
   --skipLibCheck --moduleResolution node <file>`.
3. **`verbReach`'s `end` arm specced** (ONT-007 §6.10, `migrate.test.ts` +2, three mutants each red on its own case).
   Found: a row with no `rebind` does NOT mean the step still binds. Un-dating a relation leaves the end step with no
   date to mark, and only `validateWorld` with the verbs says so.
4. **Bug `P116-ONT-003-two-systems` fixed** (ONT-003 §6.8). The `exists-elsewhere` field is named after the
   **relation's id** (`onTheCoursePlatformId`, `mailingId`), not the system's words. A reword of the system's words
   must not rename what is stored, and `diffWorld` would not see such a rename (my decision; say so if Richard asks).
   Measured first: no world outside the package fixtures held `idElsewhere`, so no migration is owed. The vocabulary
   stays v1. Goldens regenerated; the field name is their only change.
5. **Left unbuilt on purpose:** `rebindVerbs()`. It has no caller and no acceptance criterion; ONT-008's page is its
   first caller, so build it there.
6. **Filed:** `P116-S13-REL002B`. With no backend bound, the members' area now says "Nobody has set this up yet"
   (`rel002b-fail-closed` red). Not P116's: that spec never deletes and has no backend bound. Owner: P82/TPL-001.
   Also `P116-S13-AC2STALL`, the page editor drive hanging in its own write-storm mutant arm (owner: P77/SBR-007).

**Committed:** the code as `a54294a1d` (over `140bdeb41`); these docs right after it.

## What s13 measured (2026-10-09, ~22:30–23:30 CEST, over HEAD `0859bbbde` + this session's edits)

- `nodegx-project-contract` **202 / 202** (198 → 202: two `end`-arm cases, two two-systems cases). `tsc --noEmit` clean
  on `tsconfig.json` and `tsconfig.tests.json`.
- `nodegx-backend-contract` **228 / 228** (224 → 228: four pairs cases in `targetGoes.test.ts`). `tsc --noEmit` clean.
  `targetGoes.ts` is clean at ES5; HEAD's copy is TS2802 at `:226` (the control).
- `nodegx-backend` `ont-003-target-goes` **22 / 22** on SQLite and PostgreSQL (20 → 22). The control: with the unpair
  loop emptied, both engine cases and 3 of the 4 unit cases are red.
- **The whole `nodegx-backend` suite** (22:42–23:12 CEST, `-w 2`): 227 files, 2,777 tests, **2,730 passed, 29 failed,
  18 pending**. Two files are red, neither P116's, both filed: `rel002b-fail-closed` 1 (`P116-S13-REL002B`) and
  `ac2-page-editor-drag-drive` 28 (`P116-S13-AC2STALL`: it hangs alone too; a tracer on `deleteKeepingLinks` saw 0
  calls in the stalled run and 84 on R10's spec, the known-firing control). That run began before the two-systems
  edit, so on the final tree (HEAD `1b5774b23`) I ran, in band, every `ont-00*` spec plus `brg-003-*` and
  `ops-rate-limit`: **208 / 208**.
- Not run: the backend's own `tsc` (`tsconfig.tests.json` was red only on ISL-010's four lines at s12) and
  `ci:build:viewer` (the ES5 check above stands in for it).

## Before anything

0. **Model check.** ONT-008 wants **Opus 5.5**. On the wrong model, stop and say so in one line.
1. **One heavy job on this box.** Run `pgrep -fl bin/jest` first. P109 and P107 peers run suites often.
2. Green check: run `npx jest` in `packages/nodegx-project-contract` (202) and `packages/nodegx-backend-contract`
   (228). In `packages/nodegx-backend`, run `npx jest --runInBand tests/ont-003-target-goes tests/ont-003-claims
   tests/ont-007-migration`.
3. After editing any contract `src/` file, run the ES5 tsc line above on it.

## The next tasks, in order

1. **ONT-008** (Opus). It depends on P112 **OWN-007**, which was 📋 not started at s13's start; re-check. Its §5 lists
   every input. Added s11–s13: the route's dry run (`says`, `dryRun`, `rules.moved/rewritten`); the link row shows
   and changes "when it goes" (`setWhenTargetGoes`); a `blocks` refusal is a 409 with `linked`, and the delete button
   must say so, not "not found"; `verbReach` rows with `rebind`, plus `rebindVerbs()` to build there.
2. If OWN-007 still blocks, take what is smaller and unowned: bug `P116-ONT-007-renamecolumn` (a rule naming a
   renamed field); ONT-002's "through what?". **Ask before** giving the MCP a migrate tool (the surface budget).

## Owned elsewhere

- `rel002b-fail-closed` red: bug `P116-S13-REL002B` (P82/TPL-001's template). `ac2-page-editor-drag-drive` hangs:
  bug `P116-S13-AC2STALL` (P77/SBR-007's drive).
- `noodl-mcp` `tsc --noEmit` red in the cg001/cg002/cg003/ig007/iw007/p108s8 specs (not P116's).
- `a()` in `world/project.ts` and `article` in `world/mutants.ts` say "an user". The untracked `.d.ts` emits in
  `packages/nodegx-backend-contract/src/` are not P116's.

## Not yet

The "mandatory project-docs folder" rule is only a DIRECTION.md candidate (R1). Do not read the lessons backend's
live schema without its admin token. The brief is read only through `validate_world` (R5).

## Memory

`ontology-is-the-spec.md` (an s13 paragraph); `a-for-of-over-a-map-runs-zero-times-in-viewer-react.md` (the backend
contract, and a spread breaks the PR gate). Size-check the index (17,510 UTF-16 units; it is AT the budget).
