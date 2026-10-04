# Next session — P109 session 15

**Phase:** [README](README.md) · **Audit:** [AUDIT-2026-10-01.md](AUDIT-2026-10-01.md) · scoped at `27d891bf3`.
**Session 14 (2026-10-04, on `cline-dev`, `ede6bf86b`…`403dae9bf`, 10 commits):** still **8 of 25 closed**.
ISL-021 now has all eleven verbs, and AC6 and AC7 are met. AC3 is counted but its bar is not met (below). ISL-017
ruling 2's first half is built. `P109-S13-FINDTOOLSPHRASE` is fixed, and `render_report` now names `drive_page`.

## Read first

1. ISL-021 §8 s14: the four runner rules and their reverted arms (`stub_route` before boot; a seed re-written at
   the next load; a tap waits for a still target; a placeholder is a target and `type` appends unless `replace`).
   AC3's count is there, and so are both agent rounds.
2. ISL-017 §8 s14: the record's `entry`/`entryVersion`, `scripts/library/resolve-template-kits.js`, and why the
   publish hook was NOT built.
3. ISL-016 §8 s14: AC8 is not a mechanical swap (the four templates carry no `modified`).

## Gate readings taken s14 (2026-10-04)

- `noodl-mcp` full, `--maxWorkers=2`, over `403dae9bf`: **176 suites, 3,656 tests, 12 failed in 9 suites — the s12/s13
  baseline by name** (CMP-004 ×4 + `nodeIdAllocation`, DEF-038 ×2, FLD-013, D54's mutant, TPL-007's byte gate, CN-004
  strict, CMP-001 AC2's rate); the three new suites are this session's. JSON mtime read (11:03, inside the run).
- `tsc --noEmit -p packages/noodl-mcp`: **8 errors in the same six spec files** (the floor, `P109-S10-TYPECHECKMCP`),
  read twice (after slice 2 and after the provenance fields).
- `isl021DrivePage` 8/8 · `isl021ShopParity` 4/4 (**14 suite runs clean** after the still-target rule; 2 in 7 red
  before it) · `isl017ResolveKits` 4/4 · `isl017LibraryProvenance` 2/2 · `p109FindToolsPhrase` 5/5 ·
  `cg003Template` + `libraryTools` 165/165 (after `npm run template:garden`, exit 0) · `renderTools`, `fld011OutDir`,
  `toolDisclosure` 34/34 · `renderReportModule`, `fld011ParallelTabs`, `def003PageTitleDrive` green.
- One **unnamed** red: `isl021DrivePage` once, in a 5-suite parallel batch, not captured; 0 in the next 2 batches
  (100/100) or in 7 lone runs. If it comes back, read its JSON before calling it a flake.
- The CDP shop drive on the deployed garden (`assemble` + `nodegx deploy`, `--quick`): template **28/28**; without
  the Buy wire, SHORT ×4 PASS and BUY ×4 FAIL.

## Do, in this order

1. **ISL-021 AC3 — a decision, then verbs.** The AC says drag and touch are the only "not" allowed; the count found
   17 others, named in §8 s14. Either Richard accepts them as out of scope, or the verbs grow. The cheapest by
   reach: network errors in the result (4 clauses), console errors per step (3), stub `sequence` + `delay_ms` +
   match-on-body (5), reduced-motion emulation (2). Ask first (round 4), with these numbers.
2. **ISL-017 ruling 2, the publish hook.** `dev-docs/tasks/phase-78-the-templates/publish-templates-to-shelf.sh`
   carries a **peer's uncommitted edit from Sep 23** (counts, planner → planning, `--unpublish`). Check whether that
   pile is still uncommitted; if so, commit only your hunk through a temporary index (memory "tmp-idx: CAS"). The
   hook stages each template, runs `resolve-template-kits.js <stage> --write`, and fails the publish on exit 1.
   Then the six readers (ISL-017 §8 s13), then drop the garden's four library-identical kit folders and keep the
   record. Measure the shelf bundle's file counts before and after.
3. **ISL-016 AC8**, one generator at a time (`tpl003` first, the smallest): call `set_project_settings({ home })`
   inside the session, pin the project file's `modified` to `TEMPLATE_EPOCH`, regenerate, then read the gate. The
   template gains one `modified` line; that is expected and says so in the commit. `tpl007`, `tpl008` and `tpl010`
   are peer-dirty: leave them.
4. ISL-016 AC5 (FLD-009's editor arm) and AC6's editor reading. Use a throwaway profile, never Richard's store.
5. Round 4 questions (mechanism first, plain words, populations measured): ISL-021 AC3 (above), ISL-008, ISL-010,
   ISL-018's open case, `P109-S8-ARRAYFILTERPATH`, the ISL-022 follow-ups.

## Decisions for Richard (not yours)

- ISL-021 AC3's bar (item 1). Publishing Bot Garden Fonts / Garden Kit / Garden 3D Kit at the origin
  (`library:verify-origin` lists all three as unpublished). Pushing `cline-dev`.

## Facts measured in session 14 that are not in a task file

- **An unstubbed path on `render-from-disk` answers 200**, with `index.html`, not 404. A control that expects
  404 grades nothing.
- **`navigate` on a path-routed project reloads the document**, even to the route it is on (4 of 4).
- **The editor's save always writes `modified`** in `nodegx.project.json` (`ProjectExporter.ts:424-431`).
- The worktree `../OpenNoodl-worktrees/p109-s12` is detached at `78707c829`, with a `noodl-mcp` dist built there.
  Rebuild before reuse, and remove it with `git worktree remove` when the phase is done.
- An AC6 agent round cost **$1.47 for 36 turns** (round 2). Round 1 was stopped by hand while flailing.
  `--disallowedTools Agent` stops it handing the work to subagents.
