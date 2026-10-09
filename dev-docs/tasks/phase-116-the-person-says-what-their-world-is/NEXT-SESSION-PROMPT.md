# Phase 116 — next session

**Written 2026-10-09, end of s6.** ONT-000 ✅. R1–R7 ruled (README §9). ONT-001 🟡 (AC4 → ONT-008). ONT-003 ✅.
ONT-004 🟡 (AC2 → ONT-008). ONT-005 🟡 (18 of 38 pinned). **ONT-002 🟡 s6**: the runner (`nextQuestions()` in
`@nodegx/project-contract/world`), the budget (five, ranked by the incident behind the question, then the kind's corpus
rows), the record (`volunteered` = the ontology's honesty number), the brief (`worldBrief()`, generated from the kinds),
and two deferred tools in the backend group, `validate_world` and `write_world`, at **0 resident tokens on both arms**
(8,261 / 19 under). On the Acme-shaped fixture (`world-membership-unasked`) the enrolment note's and the archive note's
questions are the first two. Who-signs-in (`nouns[].signsIn`) and the kind-picker (`properties[].freeWords`) are asked
once each and have a home. AC1–AC4 met (ONT-002 §6.5). **"Through what?" is owed** (ONT-002 §6.4, §6.6).

## Before anything

0. **Model check.** Every task file names its model under the status line. **ONT-006 wants Fable 5.1; ONT-007's
   build Opus 5.5 (its reach review Fable).** On the wrong model, stop and say so in one line before any work.
1. **Run what s6 could not** (a peer's `jest -w 2` held the box all session): in `packages/nodegx-backend`,
   `npx jest --runInBand tests/ont-005-mutants tests/ont-003-claims tests/ont-004-world tests/ont-004-rule` (the
   PostgreSQL halves need `psql postgres:///nodegx_brg005`; they skip without). What s6 touched that they read:
   `askWords()` now takes the article and the plural the noun takes ("an account", "companies", "people") — strings
   the ONT-005 spec prints, pins by id — and the projection adds a `login` Link on a noun that `signsIn` (no fixture
   they read sets it). If red: read the duration first (memory: a run list is not a log).
2. Then green: `npm run ontology-census:check`; `npm test` in `packages/nodegx-project-contract` (117);
   `npx jest tests/ont002WorldTools tests/toolDisclosure` in `packages/noodl-mcp` (25; the `[surface]` line prints
   the margin).
3. **One heavy job on this box.** `pgrep -fl bin/jest` before any engine run, and wait.

## Ask Richard

- **R8** (README §9, still open): a person's word that SQL reserves (`plan`, `on`) — keep it as the field's name
  (built), or rename it and keep the word in the description?
- **Bug `P116-ONT-003-links`** (needs-ruling): a Link keeps pointing at a deleted record on both engines; ONT-005 made
  it the biggest row of the honesty number (`id-as-text`, `the-text-itself`). A foreign key in the contract, or a
  read-through claim step through the wire facade (ONT-005 §6.6).
- **For the record** (no ruling unless he disagrees): the runner asks an incident-backed question even when no mutant
  stands (the incident report's `counts` has none), and asks a schema-read question only while one does (ONT-002
  §6.1); the kind-picker is one question per world, asked last (it took eight of ten slots per noun); the budget is
  five; `write_world` exists beside the one validate tool because `write_project_doc` refuses `docs/world/*.json` and
  the revision rule needs a reader — both tools measured at 0 resident tokens.

## The next tasks

- **ONT-006, workflows are sentences** (Fable). Inputs: the fifteen step kinds (`workflow/types.ts`), NSP-014's 24
  specced backend nodes, the enrolment note as the fixture (`exists-elsewhere` `hereFirst` on the unasked fixture is
  the sentence's failure arm). The "through what?" chain (a list of relation ids checked to connect, `answers` values
  widened to lists, an answer shape `{type:'chain'}`) belongs to whichever of ONT-006/ONT-008 first needs a rule
  compiled from the files; ONT-002 §6.4 has the design and why words would not do.
- **ONT-007, the diff is the migration** (Opus builds, Fable reviews the reach). Its first two kills are named:
  `filter-field-split-off` and `sort-key-copied` are shape rules only a diff can read (ONT-005 §6.6). `signsIn` and
  `freeWords` are two more answers a diff must carry.
- **ONT-008** gets from s6: `loginHop(schema)`, `RunnerReport.record` / `volunteered` / `forTheRecord`, and the
  measured fact that hand-written worlds read 6 of 35 and 23 of 54 volunteered — a world written through the runner
  should read 0 (ONT-009 measures a real one).

## Found in s6, owned elsewhere

- `worldPath()` still says *persons* ("the persons reached from a person", `paths.ts`); its spec pins it. ONT-002
  fixed the article and plural in `askWords()` only.
- The three `cg00x` spec errors in `noodl-mcp/tests` predate s6 (`p109-s10-typecheckmcp…`); `typecheck:backend-tests`
  still red at HEAD on the ISL-010 spec (`P116-ONT-003-tsc`). Nothing new.

## Not yet

The "mandatory project-docs folder" rule is a DIRECTION.md candidate only (R1). Do not read the lessons backend's
live schema without its admin token. The brief is read only through `validate_world` (R5): keep it out of
`get_project_info` and `instructions`.

## Memory

`ontology-is-the-spec.md`; its pointer is on the Phases line of `MEMORY.md`. Size-check the index (17,510 UTF-16 units).
