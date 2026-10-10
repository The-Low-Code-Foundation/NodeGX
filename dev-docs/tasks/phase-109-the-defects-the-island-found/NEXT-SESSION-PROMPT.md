# Next session — P109 session 41

**Phase:** [README](README.md) · **Audit:** [AUDIT-2026-10-01.md](AUDIT-2026-10-01.md) · scoped at `27d891bf3`.
**Session 40 (2026-10-10, on `cline-dev`, primary tree):** board still **33 of 52 closed**. ISL-022 moved: s4's
unfiled finding was built and filed as `P109-S40-ROWWRAPINSTANCE` (`ec1f21e96`).

## What s40 did

- **Re-read the board instead of trusting s39's "nothing buildable".** 19 rows open. s39's list missed four:
  - ISL-004 and ISL-020 were closed in s18. Only their board rows were stale, and they are now up to date.
  - ISL-007 owes only AC4 (→ P108 IW-010).
  - ISL-009 owes only its export half (P18's uncommitted pile).
- **ISL-022: `P109-S40-ROWWRAPINSTANCE` built** (`ec1f21e96`). s4's AC6 round had found that `row-cannot-wrap` cannot
  see across a component boundary. That finding was recorded in the task and never filed.
  - The fix: the rule now reads a placed component's single visual root through the project `views` and reports on the
    placement in a row.
  - Shared helpers: `rowSizedToItsContent` (layoutInertCombination.ts) and `componentVisualRoot` (responsiveArrangement.ts,
    now also arm B's item read; its name lookup is now via `refToPath`, a widening).
  - Graded:
    - The editor spec is 45 / 45. It was red first, with the 5 firing cases ✕.
    - Two mutants are each caught.
    - The door spec `noodl-mcp/tests/isl022RowWrapAcrossComponents.test.ts` is red with `views` un-wired.
  - Census over the 13 templates: the new arm fires 0 times. The one-component arm still fires on its six known rows in
    the same run (`P109-S4-ROWWRAP`'s).

## Where s39's handoff was wrong

- "Nothing buildable is left without a decision": ISL-022 had s4's finding 1 sitting unbuilt and unfiled. It blocked AC6
  for the shape the agent actually writes (the cluster as a component root).
- Its open list missed ISL-007 and ISL-009, and the board still showed ISL-004 and ISL-020 as open.

## Do, in this order

1. **Re-read the open rows yourself** (`grep -m1 '^\*\*Status' ISL-0*.md`). As of s40 each one waits on something
   outside this phase:
   - ISL-007: AC4 (→ IW-010).
   - ISL-008: AC7's export half (P18).
   - ISL-009: the export half (P18).
   - ISL-010: AC4 (Richard's llama.cpp call).
   - ISL-018: AC7 on the DBT demo (its owner).
   - ISL-022: AC6 (needs the rebuilt dist, below).
   - ISL-024: waits for a gap with no P108 lane open.
   - ISL-025: W4–W22, each on its task.
   - ISL-035 and ISL-037: handed to P18 and P108.
   - Track G (ISL-039 … ISL-047): waits on Richard's order.
2. **If Richard rules STALEMCPDIST:**
   - Rebuild `noodl-mcp/dist`, then give it the S5/S39 staleness check (an esbuild input list beside
     `dist/noodl-mcp.cjs`; the people's door rebuilds or warns).
   - Then run **ISL-022 AC6**: Claude Code over the dist door, on a copy of `demo-app`, with s4's prompt (§8 s4).
   - The rebuilt dist would carry S4, S12, ISL-018's `ticked` and this arm. None of those reach agents today.
3. Otherwise ask Richard for Track G's order. ISL-039 and ISL-040 hold the blockers.

## Decisions for Richard (not yours)

- **`P109-S36-STALEMCPDIST` (high):** rebuild the people's MCP door now, and give it the S5 staleness check?
  - It now also gates ISL-022 AC6.
  - A rebuild bakes in whatever is uncommitted in `noodl-mcp/src` at that moment. Today that is P78's
    `cloud/bundleEntry.js` D84 lines, plus TPL-011's untracked tests (tests are not bundled).
- **Rebuild the `nodegx` bin** (`nodegx-export/dist/cli.mjs`, Oct 5)? It would carry P18's uncommitted exporter pile.
- **Carried from s38/s39:**
  - The Expression reading `Arrays.cart.get(0).qty`.
  - The garden library entries at 1.0.0.
  - C143's Refresh half.
  - Track G's order.
  - The layout of an unlabelled control in a real browser.
  - `P109-S24-SIGNINWITHERRORKEPT`, `-S22-BUILTINBOUNDARY`, `-S20-LISTDEFAULTTYPE`, `-S18-REFRESHROWSTATE`.
  - ISL-010 AC4 and the Effort port.
  - Pushing `cline-dev`.
  - Publishing the Garden kits at the origin.
  - ISL-048 §13's Back/Forward note.

## Handed over (owed by another phase), unchanged from s39

- **P18:**
  - HLS-006's listener gate (`cd9d52e28`).
  - Arrays in the export's Expression.
  - The kit bootstraps.
  - The Visual Function's reserved signal.
  - The scroll rule (ISL-052 §2).
  - s33's list.
  - ISL-008's and ISL-009's export halves.
- **P107:** the Page Router spec v6. Their NSP-018 edits keep `stranger.test.ts`'s hash gate red on five spec files.
- **P78 / TPL-011:** `noodl-mcp/src/cloud/bundleEntry.js`'s D84 lines are still uncommitted.
- **Release notes:**
  - Add for s40: "An agent is told when it places a component whose top row is set to wrap but cannot, inside another
    row."
  - Still owed: s36–s39's items.

## Gate readings taken s40 (2026-10-10)

- Editor `tests-unit/validation` + `gam-020`: 11 suites, 197 / 197 (the isl-022 spec 45 / 45).
- `tsc -p packages/noodl-mcp --noEmit`: exit 0. `tsc -p packages/noodl-editor --noEmit`: exit 0.
- noodl-mcp targeted (cg003, isl022 ×2, isl025Census, sb006PublicSite, tpl010, fld005): all green, 350 / 350 before the
  new door spec.
- noodl-mcp full run (`-w 3`, with the new door spec): 3,829 / 3,847, 13 red suites, 0 runtime errors. Eleven are
  s39's attributed list, still red:
  - def018/020 (a render overlap reading, not a diagnostic)
  - sbr009
  - tpl011 ×3
  - nodeIdAllocation
  - def038 ×2
  - nodeDocBudget
  - cmp004Parts
  - cmp004RoundTrip
  - fld013
  - isl023 (P116)
  - provision

  The other two, `ig004Island` and `iw008Crew`, failed p95 tick timing at load average 16 from another session's work
  (7.1 ms and 5.5 ms against 5). Run alone right after, both pass: 63 / 63, exit 0.

## What s40 learned

- **A finding recorded only in a task's §8 is invisible to the next handoff.** s4 wrote "recorded, not built" and filed
  nothing. Every later handoff called ISL-022's AC6 blocked without saying on what.
- **Board rows go stale independently of task files.** Count open work from the task files' status lines, not from the
  README table.
- **A JS default parameter swallows an explicit `undefined`.** A test helper `f(x = default)` called as `f(undefined)`
  tests the default. Use a sentinel (`'none'`) for "omitted".

## Worktrees

`p109-isl049` (branch `p109-isl052`) is unchanged. The older ones are spent: `git worktree remove` when convenient.

## Recipes

- **Template census for a validator rule:** the `census.ts` pattern copies each `templates/*` to a tmp dir, runs
  `resolveTemplateCopy`, `connect(dir, false)` from `noodl-mcp/tests/helpers`, `list_components`, then
  `validate_component` per component, filtered by code. Run it with `npx tsx` from `packages/noodl-mcp`. About 2 min for
  13 templates.
- **A server render, the CLI from source, land / grade / control / agent / editor:** as in s39 (unchanged). Commit
  through a temporary index (`GIT_INDEX_FILE`, `read-tree HEAD`, `add -- <paths>`, commit, then `git reset -q --
  <paths>` on the real index at once).
