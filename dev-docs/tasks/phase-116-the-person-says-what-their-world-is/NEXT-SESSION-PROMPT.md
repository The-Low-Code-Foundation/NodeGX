# Phase 116 — next session

**Written 2026-10-10, end of s15 (Opus 5.5).** ONT-000 ✅, ONT-002 ✅, ONT-003 ✅, ONT-007 ✅. ONT-001 🟡 (AC4 →
ONT-008), ONT-004 🟡 (AC2 → ONT-008), ONT-005 🟡 (16 of 38 pinned, unchanged), ONT-006 🟡 (the view is ONT-008's),
**ONT-011 🟡 (step 1 ✅ s15)**. R1–R10 ruled (README §9). **Two rulings are waiting on Richard: ONT-011 R-a and R-c,
re-asked in s15 with the census's numbers (ONT-011 §6). R-b is unchanged and still not asked.**

## What s15 did (Opus 5.5). P112 OWN-007 was still 📋 (P112 at OWN-004 slice 1), so ONT-008 stayed blocked

1. **ONT-011 step 1, the detectors** (`scripts/ontology/census.js`, `kinds.hand.json` `borrows`, regenerated
   `kinds.json` / `KINDS.md`). 17 detectors and 3 hand rows give 141 candidates over all 8 sources, each judged by
   meaning: **yes**, **no: why** or **neighbour: why**. The candidates are a second row set, not kinds, so the 14
   kinds, `kinds.ts` and `world.test.ts`'s pin did not move. All four borrows keep rows: secret details 16, settled 8,
   facts 55 (only one 2, read aloud 1, called by 47, who changed 5), only sometimes 9 (ONT-011 §3.5).
2. **The private run was made here.** The three corpora are the sibling folders the census header names. Their
   verdicts are in `../ontology-census-private/borrows.json` (hand-kept, beside `classification.json`), and only
   counts reach the repo. `--check` is green with and without the private paths.
3. **Found:** the membership business's CMS already keeps per-field read rules (7 reads over 5 collections). That
   re-opens R-a. The same CMS reads one collection in full for every member, private tokens and sensitive details
   included. Richard was told in the session; per R6 it is not filed in the repo. ONT-011 §3.4's `linkUrl` row was
   backwards: the field is *allowed only* when the brief asks for a link, not *required* then.
4. **Committed ONT-011 itself**, opened at 13:14 by another session (not s14, not P109's `opennoodl-ee`), with its
   README row, its ONT-008 §5 note and its line in this file. They had been untouched for three hours, and the task
   was being built on.

## What s15 measured (2026-10-10, 16:00–16:45 CEST, load ~17 from a peer's `jest -w 1`)

- `node scripts/ontology/census.js --check` → exit 0 (in-repo; private counts carried). The same with `--acme
  ../opsnest-dashboard --tirion ../tirion --sentinel ../sentinel-demo --private ../ontology-census-private` → exit 0.
- Mutant controls on scratch copies: a secret detector that never matches → 5 verdicts name nothing, exit 1; one
  verdict removed → that candidate is unclassified, exit 1; the unmutated copy → exit 0.
- `nodegx-project-contract` `tests/world.test.ts` **36 / 36**. Nothing else was run: no package code changed.

## Before anything

0. **Model check.** ONT-011 steps 2 and 4 want **Fable 5.1**. ONT-008, ONT-011 steps 3 and 5 and the bug below want
   **Opus 5.5**.
1. **`node scripts/bugs.js --from P116`**: open P116 bugs first, worst first.
2. **One heavy job on this box.** `pgrep -fl bin/jest`.
3. Green check: `npm run ontology-census:check`; `npx jest` in `packages/nodegx-project-contract` (245) and
   `packages/nodegx-backend-contract` (230).

## The next tasks, in order

1. **ONT-008** (Opus) once P112 **OWN-007** has started (it was 📋 on 2026-10-10). Its §5 lists every input,
   including ONT-011's two view hints.
2. **ONT-011 step 2, the vocabulary** (Fable), once Richard rules R-a and R-c. With no ruling, step 2 can still take
   the borrows whose shape no ruling touches: **facts about a thing** on `Noun` (only one, read aloud, what you call
   one, who changed what) and **only sometimes** (`onlyWhen`).
3. **ONT-011 step 5, the view hints** (Opus, fixed shape): "what you call one" and "shown only when". It lands before
   ONT-008's suite is fixed, and it needs step 2's `Noun` answers first.
4. If all of that is blocked:
   - **Bug `P116-ONT-007-required`** (medium, needs a route): no schema action makes a field required over existing
     records. A new `IStorageSchema` member (`setRequired`) moves the BRG-003 ratchet. Read `SCHEMA_COVERAGE` first.
   - **ONT-002 §6.7's two "not built" items**: `all` (a tree step) in a chain, and checking that a step's `where`
     names a field the landing record has.
   - **Ask before** giving the MCP a migrate tool (the surface budget).

## Owned elsewhere

- `rel002b-fail-closed` red: bug `P116-S13-REL002B` (P82/TPL-001). `ac2-page-editor-drag-drive` hangs: bug
  `P116-S13-AC2STALL` (P77/SBR-007).
- `a()` in `world/project.ts` and `article` in `world/mutants.ts` say "an user". The untracked `.d.ts` emits in
  `packages/nodegx-backend-contract/src/` are not P116's.

## Not yet

The "mandatory project-docs folder" rule is only a DIRECTION.md candidate (R1). Do not read the lessons backend's
live schema without its admin token. The brief is read only through `validate_world` (R5). A borrow candidate is
never a kind until step 2 says so; adding one to `kinds` without `kinds.ts` turns `world.test.ts` red.

## Memory

`ontology-is-the-spec.md` (an s15 paragraph). Size-check the index (17,510 UTF-16 units; it is AT the budget).
