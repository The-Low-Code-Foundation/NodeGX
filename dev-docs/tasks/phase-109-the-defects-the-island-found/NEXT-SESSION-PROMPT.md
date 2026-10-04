# Next session — P109 session 14

**Phase:** [README](README.md) · **Audit:** [AUDIT-2026-10-01.md](AUDIT-2026-10-01.md) · scoped at `27d891bf3`.
**Session 13 (2026-10-04, on `cline-dev`, `e310b68a7`…`dec6cf6cb`, 9 commits):** **8 of 25 closed** — ISL-019 ✅
(AC6 ruled "Accept it"). Round 3 ruled in one question round, all four as recommended. Built: ISL-016
(`set_project_settings`), ISL-017's first half (Fredoka a library entry, path-free provenance, the garden installs
through `install_prefab`), ISL-021 slice 1 (`drive_page`). Fixed `P109-S12-KITGROUPPURPOSE`.

## Read first

1. README §8 "Session 13, round 3": the four questions as asked, and **Richard's correction**: the "home" is the
   editor's right-click **Make home**, the App component holding the Router. It is not a page.
2. ISL-016 §8 s13: two departures from §5 (no registry re-type; the editor's first-export-root rule) and why
   `get_project_info` now reads `rootNodeId` only.
3. ISL-017 §8 s13: the AC7 census and the **proposed build for "copy on install"**. The resolve step goes in the
   shelf publish script, because no editor path copies `templates/`.
4. ISL-021 §8 s13: the runner's rules, the near-miss (Write overwrote P77's `drive-page.js`, restored), and what is
   open.
5. Bugs filed s13: `P109-S13-NIGHTBOOKHOME` (open, a peer's untracked template), `P109-S13-FINDTOOLSPHRASE` (open:
   a multi-word `find_tools` query reveals nothing).

## Gate readings taken s13 (2026-10-04, over `dec6cf6cb`)

- `noodl-mcp` full, `--maxWorkers=2`: **173 suites, 3,639 tests, 12 failed in 9 suites, the s12 baseline by name**
  (CMP-004 ×4 + `nodeIdAllocation`, DEF-038 ×2, FLD-013, D54's mutant, TPL-007's byte gate, CN-004 strict,
  CMP-001 AC2's rate). The JSON's mtime was checked (09:27).
- `tsc --noEmit -p packages/noodl-mcp`: the same 8 errors in the same six spec files (`P109-S10-TYPECHECKMCP`).
- Resident surface **8,261 / 8,280, 19 free** (6 spent on the kit purpose; both new tools at 0).
- `cg003Template.test.ts` **150/150** after `npm run template:garden` (exit 0).
- New specs: `isl016ProjectSettings` 9/9, `isl017LibraryProvenance` 2/2, `isl021DrivePage` 4/4 (real Chrome; it
  skips loudly without the viewer bundle). Each has a reverted arm recorded red in its task file.
- `library:check` on the committed tree (worktree): exit 0, 82/82. In the primary checkout it fails only on
  `modules/nightbook-kit` (a peer's untracked folder with no `library.json`).
- Editor `uni-012/harness-packaging` 7/7 (ships `drive-steps.js`).

## Do, in this order

1. **ISL-021 slice 2.** `stub_route` needs `render-report.js`'s `attachTab` to take a `Fetch.requestPaused`
   handler; AC3's corpus count over `drive-iw006-shop.js` + `drive-cg003-pages.js`; AC7 against the deployed drive
   (the runner drives a FROM-DISK render; see §7's first trap); AC6 (an agent proves its own form).
2. **ISL-017 ruling 2**, the proposed build: machine fields `entry`/`entryVersion` on the `imported` record, a
   resolver in `publish-templates-to-shelf.sh`, then the six repo readers, then drop the library-identical kit
   folders. `dbt-lesson` stays copied. Measure the shelf bundle's file counts before and after.
3. **ISL-016's rest:** AC8 (`tpl001`, `tpl003`, `tpl005`, `tpl006`, `tpl007` → the tool; `tpl008`/`tpl010` are
   peer-dirty, so leave them), AC5 (FLD-009's editor arm), AC6's editor reading (open the agent's copy in the
   editor; a throwaway profile, never Richard's store).
4. `P109-S13-FINDTOOLSPHRASE`: phrase first, then words of 4+ letters; keep `kitTools`' control arm green.
5. Round 4 questions (mechanism first, plain words, populations measured): ISL-008, ISL-010, ISL-018's open case,
   `P109-S8-ARRAYFILTERPATH`, the ISL-022 follow-ups.

## Decisions for Richard (not yours)

- Round 4 above. Publishing Bot Garden Fonts / Garden Kit / Garden 3D Kit at the origin (`library:verify-origin`,
  a release gate, lists all three as unpublished; the baseline was not touched). Pushing `cline-dev`.

## Facts measured in session 13 that are not in a task file

- **The editor reads the home ONLY from `rootNodeId`** (`projectmodel.ts:267`, plus a legacy template-only
  `rootComponent`); the v2 importer carries nothing else. The registry's `root` type comes only from a
  `%rootcomponent` legacy name.
- **The editor's own local-kit provenance has no path** (`moduleGate.ts`: "a project on this computer"), and the
  Kits panel prints `imported` as "Copied in from {fromProject} on {date}".
- The worktree `../OpenNoodl-worktrees/p109-s12` is at `79ed6ce0f` with a real `dist` (noodl-mcp built at
  `de9a3a5c4`) and a real `library-dist`. Rebuild before reuse, and remove it with `git worktree remove` when done.
- An agent round over stdio cost $0.55 for 18 turns. `--disallowedTools Bash Edit Write NotebookEdit` really removes
  them (the init's tool list confirms it); `--allowedTools` alone does not.
