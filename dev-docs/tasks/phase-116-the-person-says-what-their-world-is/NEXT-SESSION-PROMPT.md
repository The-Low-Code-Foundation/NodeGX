# Phase 116 — next session

**Written 2026-10-09, end of s12 (Opus 5.5).** ONT-000 ✅, ONT-003 ✅ (**+ R10, §6.6, s12**), ONT-007 ✅. ONT-001 🟡 (AC4 →
ONT-008), ONT-004 🟡 (AC2 → ONT-008), ONT-005 🟡 (**16 of 38** pinned, was 18), ONT-002 🟡 ("through what?" owed), ONT-006 🟡
(the view is ONT-008's). R1–R10 all ruled (README §9) — nothing is waiting on Richard.

## What s12 built (Opus 5.5) — R10, the on-delete rule, kept at delete time

ONT-003 §6.6 has the whole of it. In short:

- **Contract:** `StorageColumn.whenTargetGoes` (`goes-too` · `stays-unlinked` · `blocks` — the person's words) on a
  Pointer. `nodegx-backend-contract/src/targetGoes.ts`: `whenTargetGoesProblems()`, `planDelete()`,
  `deleteKeepingLinks()`, `StillLinked`, `WHEN_TARGET_GOES_BY_BACKEND` (the per-backend cell; deliberately NOT a
  `CapabilityKey` — those are what a node attempts). `IStorageSchema.setWhenTargetGoes?` (19 names), both engines.
- **Backend:** `AdapterFacade.rawDelete` → `deleteKeepingLinks` (every door: `/classes`, so a cloud function's Delete
  Record over loopback; BYOB `/api/:table`; `_batch`; the internal sweeps). Plan read-only first; the caller's own
  record under their ACL; then empty/cascade **as the master key** (my decision, §6.6 #1 — say so to Richard if asked).
  `blocks` → `409 { reason: 'still-linked', linked }` on all three doors (`stillLinkedToHttp`, http-util.ts). Schema
  route: 400 for a rule that can't be kept; new action `setWhenTargetGoes`.
- **Projection:** a link to a noun carries the rule and its claim is held (mutant `dropWhenTargetGoes`); a text id
  (`points-at-one-of`) stays not-held. **Migration:** a changed answer → a `setWhenTargetGoes` step; the executor and
  `migrationPlanProblems` know it.
- **Grading:** the claim specs (ont-003-claims, ont-005, ont-006, ont-007-migration) delete through the REAL facade
  (`nodegx-backend/tests/helpers/facade-deletes.ts`) — never put the rule in the conformance context (it would pass
  while the facade forgot it).
- **Found:** a Links field's pairs outlive either end, both engines — bug `P116-ONT-003-pairs` (open, small, no ruling).

## What s12 measured (2026-10-09 ~22:00–22:40 CEST, uncommitted tree → committed this session)

- Baseline before any edit (HEAD `f1ad13e2e`): project-contract 195/195, backend-contract 219/219, backend
  ONT-003/005/007 ×4 specs 127/127.
- After: `nodegx-project-contract` **198/198**; `nodegx-backend-contract` **224/224** (+ `targetGoes.test.ts`, 5; + one BRG-003 case);
  `nodegx-backend`: `ont-003-claims` 26/26, `ont-003-target-goes` (new) **20/20**, `ont-005` + `ont-007-migration`
  80/80, `ont-006` + `ont-007-route` green — all on SQLite AND PostgreSQL, in band. NOT the whole 210-file backend
  suite (a peer's `nodegx-node-spec -w 2` held the box): instead the 53 specs that delete or gate (§6.6) — 827/829,
  the two reds count gates, both fixed (BRG-003 ratchet: the new schema member got a conformance case instead of a
  bump; `ops-rate-limit` admin 101 → 102 was **s11's miss** — the migrate route), then 60/60 on the six.
- **Where the s11 handoff was short:** it never ran `ops-rate-limit`, so the migrate route sat unreviewed in the tally.
  A new route owes that spec; a new schema member owes the BRG-003 gate.
- Controls, each red then restored by edit: facade rule skipped → exactly the 22 flipped claims fail; cascade before
  the caller's delete → the ACL case red on both engines; the "goes anyway" filter removed → its unit test red.
- `tsc --noEmit` clean in the three packages and noodl-runtime's adapters; backend `tsconfig.tests.json` red only on
  ISL-010's four lines (`P116-ONT-003-tsc`, not P116's code).

## Before anything

0. **Model check.** ONT-008 wants **Opus 5.5**. On the wrong model, stop and say so in one line.
1. **One heavy job on this box.** `pgrep -fl bin/jest` first; a peer's `nodegx-node-spec -w 2` suite is common.
2. Green check: `npx jest` in `packages/nodegx-project-contract` (198) and `packages/nodegx-backend-contract` (224);
   `npx jest --runInBand tests/ont-003-target-goes tests/ont-003-claims tests/ont-007-migration` in
   `packages/nodegx-backend`.
3. Edit in the foreground; background only the run (a backgrounded Bash gets no heredoc). `grep -a` on `HttpServer.ts`.

## The next tasks, in order

1. **ONT-008** (Opus) — depends on P112 **OWN-007, still 📋 not started** (checked s11; re-check). Its §5 lists every
   input ONT-006/007 hand it; s11 added the route's dry run (`says`, `dryRun`, `rules.moved/rewritten`) as what the page
   shows before the yes, and that the dry run has no read-only twin (`admin:readonly` cannot call it). **s12 adds:** the
   page's link row can show and change "when it goes" (`setWhenTargetGoes`, the three words), and a delete refused by
   `blocks` comes back as a 409 with `linked` — the data manager's delete button should say it, not "not found".
2. If OWN-007 still blocks: **bug `P116-ONT-003-pairs`** (small: `deleteKeepingLinks` takes a deleted record's Relation
   pairs with it — its own junctions and every junction targeting its collection; a case beside `ont-003-target-goes`).
3. Smaller, unowned: `rebindVerbs()`; a spec for `verbReach`'s `end` arm; bug `-two-systems`; ONT-002's "through
   what?"; bug `-renamecolumn`. **Ask before** giving the MCP a migrate tool (the surface budget).

## Owned elsewhere

- `noodl-mcp` `tsc --noEmit` red in cg001/cg002/cg003/ig007/iw007/p108s8 specs (not P116's).
- `a()` in `world/project.ts` and `article` in `world/mutants.ts` say "an user"; untracked `.d.ts` emits in
  `packages/nodegx-backend-contract/src/` (not P116's).

## Not yet

The "mandatory project-docs folder" rule is a DIRECTION.md candidate only (R1). Do not read the lessons backend's live
schema without its admin token. The brief is read only through `validate_world` (R5).

## Memory

`ontology-is-the-spec.md` (s12 paragraph added); its pointer is on the Phases line of `MEMORY.md`. Size-check the index
(17,510 UTF-16 units).
