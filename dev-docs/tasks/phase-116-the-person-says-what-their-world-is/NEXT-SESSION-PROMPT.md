# Phase 116 — next session

**Written 2026-10-09, end of s9 (Fable 5.1).** ONT-000 ✅. R1–R7 ruled (README §9). ONT-001 🟡 (AC4 → ONT-008). ONT-003 ✅.
ONT-004 🟡 (AC2 → ONT-008). ONT-005 🟡 (18 of 38 pinned). ONT-002 🟡 ("through what?" owed). **ONT-007 🟡 s9** — AC2 ✅, AC3 ✅,
**the reach review ✅ s9** (§6.9: seven findings, four fixed, one pinned `it.failing`, two named), AC1 🟡 (a workflow stands
for a verb; verbs exist now — the re-read is owed, below); the route owed on the executor-home ruling. **ONT-006 🟡 s9** —
AC1 ✅ (the engine and the world), AC2 ✅ (both engines), AC3 ✅; §6 has every decision; the view is ONT-008's.

## What s9 built (Fable 5.1) — committed as the s9 commit over `6b4e37b13` (s8's work, committed first by s9)

- **ONT-007's reach review** (`ONT-007` §6.9): two dry-run checks (`refuse: 'outside-list'`, `refuse: 'duplicates'`) for a
  rule put on records that already break it; `runMigration` awaits the schema surface's `barrier()` per schema step (on
  PostgreSQL a refused rule was reported as ran); `componentReach` reads a Record node's OUTPUT `prop-` wires (the fixture's
  members page grew "The member"); `ReachRow.renamed` and `PermissionReachRow.mustRewrite` (a path rule's hops after a
  rename); the description that no route changes, pinned `it.failing` on both engines.
- **ONT-006, workflows are sentences** (`ONT-006` §6): `docs/world/verbs.json` as the optional fourth file (`VERBS_FILE`,
  `WorldFiles.verbs?`, the JSON Schema's `verbsFile`); `validateVerbs()` (run by `validateWorld` when the file is there) with
  `VERB_NODES` (NSP-014's 24 + NSP-022's 17, where each runs; pinned to the spec package's scenario files) and
  `VERB_STEP_KINDS` (pinned to `workflow/types.ts`); `projectVerb()` → a `WorkflowInput`-shaped definition + the functions the
  agent owes (`<verb>-<step>` at `/#__cloud__/<verb>-<step>`); `verbClaims()` (ClaimStep grew `there` and `holds`, in the
  project contract and the backend contract's `claims.ts`); `verbWords()`; the write rule's fourth file. Fixture
  `tests/fixtures/world-verbs` (the enrolment note and the archive note as verbs). Specs: contract `tests/verbs.test.ts`
  (25), backend `tests/ont-006-verbs.test.ts` (16: the REAL engine with the real `transform`/`stop` executors and scripted
  functions; the bound nodes played in `@nodegx/node-spec`'s interpreter through a guarded relative `require`; the rows'
  claims on SQLite and PostgreSQL).

## What s9 measured (2026-10-09 ~18:25–18:40 CEST, working tree over `6b4e37b13`, in band, no peer suite)

- `nodegx-project-contract` `npx jest` **182 / 182**; `npx tsc --noEmit -p tsconfig.json` clean.
- `nodegx-backend` `npx jest --runInBand tests/ont-007-migration tests/ont-006-verbs` **71 / 71, exit 0** (55 + 16; both
  engines; PostgreSQL at `postgres:///nodegx_brg005`); `ont-005-mutants ont-003-claims ont-003-write ont-004-world ont-004-rule
  service-http workflow-engine workflow-transform` **138 / 138, exit 0**.
- `nodegx-backend-contract` **199 / 199**; `npx tsc --noEmit -p packages/nodegx-backend-contract/tsconfig.json` clean.
- `noodl-mcp` `ont002WorldTools toolDisclosure` **25 / 25** (`[surface] 8261 tokens / 20 resident tools — 19 under`: unchanged).
- `npm run ontology-census:check` fresh. `npm run typecheck:backend-tests` red only on the four known ISL-010 lines
  (`P116-ONT-003-tsc`); nothing of s9's.

**Where the s8 handoff was wrong:** "a changed `whenTargetGoes` or `moves` answer changes no schema and so no step — right?"
Right about the step, wrong about the comfort: such an answer changes the collection's *description*, which no route can
change after `createTable`, so the Schema card keeps the old sentence (ONT-007 §6.9 #5, pinned failing). And the PostgreSQL
grade of s7/s8 was green for a reason it did not name: the executor never awaited the queue, and the mutants were caught by
the claims, never by the step (#2).

## Before anything

0. **Model check.** The route (ONT-007 §6.5) and ONT-008 want **Opus 5.5**; the MCP's fourth-file arm is Opus-sized too. On
   the wrong model, stop and say so in one line before any work.
1. **One heavy job on this box.** `pgrep -fl bin/jest` first. Two peers (`OpenNoodl-worktrees/p109-isl049`, and a node-spec
   suite in the primary checkout) ran during s9's first hour; s9 waited them out before any engine run.
2. Green check: `npx jest` in `packages/nodegx-project-contract`; `npx jest --runInBand tests/ont-006-verbs
   tests/ont-007-migration` in `packages/nodegx-backend`.
3. **A backgrounded Bash never gets its heredoc.** s9 lost an edit that way (the python ran with empty stdin and the jest
   after it graded the old file). Edit in the foreground; background only the run.

## Ask Richard

- **R8** (README §9, still open): keep a person's word SQL reserves (`plan`, `on`) as the field's name (built), or rename?
- **Bug `P116-ONT-003-links`** (needs-ruling): a foreign key in the contract, or a read-through claim step.
- **Where the migration executor lives for the route** (unchanged from s8): `runMigration` is in
  `@noodl/backend-contract/conformance`, which the deployed backend does not import. Recommend: move it to the contract's
  `src/` (it is a runner production uses, not a case).
- **For the record:** bugs `P116-ONT-007-junctions` (blocker), `-renamecolumn`, `-required`, and new `P116-ONT-003-two-systems`
  (a noun that exists in two other systems cannot be projected — both relations make `idElsewhere`; the fix renames the
  field after the relation and regenerates two `projected.json` fixtures).

## The next tasks, in order

1. **The MCP's world tools read the fourth file** (ONT-006 §6.5, Opus): `validate_world` grades `verbs.json` beside the
   three (it runs `validateWorld`, which already does when the file is passed) and returns `outside`; `write_world` takes
   `verbs`; the surface re-measured on both arms (`toolDisclosure`), 8,261 today.
2. **`workflowReach`'s sibling for verbs** (ONT-007 §6.9 #6, ONT-006 §6.5): a verb whose step is `on` a reached noun or
   relation is reached, in the verb's words; then **ONT-007 AC1 re-read** against a verb (the enrolment verb's `person-here`
   is on `person`, which the bombshell reaches).
3. **ONT-007, the route** (Opus) — after the executor ruling: the plan as the body (admin-only), dry run → words → yes →
   `POST /admin/backups` → steps (the executor awaits the barrier now) → move the `mustMove` rules and re-say the
   `mustRewrite` hops in `security.json`, taken up by the running backend (BMG-016) → answer. With it, `describeTable` on
   the surface and the route, and its step (turns §6.9 #5's failing test green). Components still name the old collection
   after a rename: the reach lists them; editing them is the editor's / MCP's.
4. **ONT-008** gets: `migrationWords(plan)` as the "before anything moves" panel; `plan.reach` rows with `how: 'renamed'`
   for "both names until then"; a button per verb with `verbWords()` under it; a run's steps sorted by the verb's order
   (the engine records them topologically — ONT-006 §6.6) and the arm's `sees` from the arm step's output.
5. **ONT-002**: the runner could take an arm's `answers` (`hereFirst`) as the question answered (ONT-006 §6.5) — not built.

## Found in s9, owned elsewhere

- `P116-ONT-003-two-systems` (above). The `it.failing` description test in `ont-007-migration.test.ts` (a ✓ means the defect
  is still there; it goes red the day `describeTable` lands — then flip it to `it`).
- Still from s7: `a()` in `world/project.ts` and `article` in `world/mutants.ts` say "an user"; untracked `.d.ts`/`.d.ts.map`
  emits in `packages/nodegx-backend-contract/src/` (not P116's; left alone). The bug ledger's `check` names six problems
  in a P78 file (not P116's).

## Not yet

The "mandatory project-docs folder" rule is a DIRECTION.md candidate only (R1). Do not read the lessons backend's live
schema without its admin token. The brief is read only through `validate_world` (R5); the brief does not yet mention the
fourth file (owed with task 1).

## Memory

`ontology-is-the-spec.md` (s9 paragraph added); its pointer is on the Phases line of `MEMORY.md`. Size-check the index
(17,510 UTF-16 units).
