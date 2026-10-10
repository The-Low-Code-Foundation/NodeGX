# Phase 116 — next session

**Written 2026-10-10, end of s14 (Opus 5.5).** ONT-000 ✅, ONT-002 ✅ (s14), ONT-003 ✅, ONT-007 ✅. ONT-001 🟡 (AC4 →
ONT-008), ONT-004 🟡 (AC2 → ONT-008), ONT-005 🟡 (16 of 38 pinned, unchanged), ONT-006 🟡 (the view is ONT-008's).
R1–R10 all ruled (README §9). Nothing is waiting on Richard from s14.

## What s14 did (Opus 5.5). P112 OWN-007 was still 📋 (P112 is on OWN-004), so ONT-008 stayed blocked

1. **Bug `-renamecolumn` fixed** (`78ec0ed69`, ONT-007 §6.12): a rename is refused like a drop, on both engines and
   at the route (409 in words). Found under it, **bug `-partialdrop`**: an index's `where` was not counted as reading
   a field, so PostgreSQL dropped such an index silently with the field. Fixed in the same helper.
2. **The viewer build's ES5 trap is a spec** (`e11f559c5`): `nodegx-backend-contract/tests/viewer-es5.test.ts`
   compiles `src/index.ts` at the viewer's target. s12's Map spread fails it at `targetGoes.ts:226`.
3. **ONT-002 ✅, "through what?" built** (`e105bb3d1`, ONT-002 §6.7): `relations[].through` (the chain from whoever
   signs in to the owner), walked over the nouns by the validator and the JSON schema; `ownerRule()` compiles the
   permission rule from the files alone; the runner asks once someone signs in and records the chain in words;
   `diffWorld` names a change. Graded on rows on both engines (`ont-002-through`), the hop-filter mutant caught.
4. **The blocker `-junctions` fixed** (`f1b60a4d9`, ONT-007 §6.13). The s13 handoff did not list it, and the ledger
   did. Re-measured red on both engines first. Found under it, **bug `-pgloadrace`** (high): a PostgreSQL backend
   starting while another dropped a table refused to start. `load()` now reads again. Regression
   `tests/p116-pg-load-race`, deterministic.

**Where this handoff was wrong.** s13 said "nothing is waiting" and listed two small items. P116's own blocker was
open in the ledger, and `node scripts/bugs.js --from P116` shows it in one line. **Run it first, every session.**

## What s14 measured (2026-10-10, 13:15–13:45 CEST, final tree over `f1b60a4d9`, load 5–10 from P107/P109 peers)

- `nodegx-backend` 21 specs (BRG-003 ×4, BRG-005 ×3, BMG-003, every `ont-00*`, `service-http`, `admin-dashboard`,
  `p116-pg-load-race`) **350 / 350, exit 0**. The uncovered ratchet reads **20 of 68**, under its ceiling of 22.
- `nodegx-project-contract` **245 / 245**; `nodegx-backend-contract` **230 / 230**; `noodl-runtime` `test/adapters`
  **328 / 328**; `noodl-mcp` `ont002WorldTools` + `toolDisclosure` **30 / 30**, surface **8,261** (unchanged).
- `tsc --noEmit` clean: runtime, backend (both configs), backend contract, project contract (both configs). The
  backend's `tsconfig.tests.json` is clean now.
- Not run: the whole `nodegx-backend` suite (peers held the box), `ci:build:viewer` (the ES5 spec stands in for the
  contract's part of it), `npm run ontology-census:check` (the kinds did not change).

## Before anything

0. **Model check.** ONT-008 wants **Opus 5.5**.
1. **`node scripts/bugs.js --from P116`** — open P116 bugs first, worst first.
2. **One heavy job on this box.** `pgrep -fl bin/jest`. P107 and P109 peers run suites often.
3. Green check: `npx jest` in `packages/nodegx-project-contract` (245) and `packages/nodegx-backend-contract` (230);
   in `packages/nodegx-backend`, `npx jest --runInBand tests/ont-00 tests/brg-005-conformance-postgres`.

## The next tasks, in order

1. **ONT-008** (Opus) when P112 **OWN-007** has started (it was 📋 on 2026-10-10; P112 was on OWN-004 slice 1).
   Its §5 lists every input. Added s14: `ownerRule()` is the rule a "who may see" row writes (nothing writes
   permissions yet; this page is the first writer), and the record's `through` entry is the chain in words.
2. If OWN-007 still blocks:
   - **Bug `P116-ONT-007-required`** (medium, needs a route): no schema action makes a field required over existing
     records. It needs a new `IStorageSchema` member (`setRequired`), so it moves the BRG-003 ratchet. Read
     `SCHEMA_COVERAGE` first.
   - **ONT-002 §6.7's two "not built" items**: `all` (a tree step) in a chain, and checking that a step's `where`
     names a field the landing record has.
   - **Ask before** giving the MCP a migrate tool (the surface budget).

## Owned elsewhere

- `rel002b-fail-closed` red: bug `P116-S13-REL002B` (P82/TPL-001). `ac2-page-editor-drag-drive` hangs: bug
  `P116-S13-AC2STALL` (P77/SBR-007).
- **ONT-011 and the uncommitted edits to this folder's README §7, the README's prefix line and ONT-008 §5** were
  written at 13:14 on 2026-10-10 by a session that is not s14 and not P109's `opennoodl-ee` (asked). s14 committed
  around them and never over them. They are uncommitted in the working tree, with an item in this file's list
  below.
- `a()` in `world/project.ts` and `article` in `world/mutants.ts` say "an user". The untracked `.d.ts` emits in
  `packages/nodegx-backend-contract/src/` are not P116's.

## Not yet

The "mandatory project-docs folder" rule is only a DIRECTION.md candidate (R1). Do not read the lessons backend's
live schema without its admin token. The brief is read only through `validate_world` (R5).

## Memory

`ontology-is-the-spec.md` (an s14 paragraph). Size-check the index (17,510 UTF-16 units; it is AT the budget).
