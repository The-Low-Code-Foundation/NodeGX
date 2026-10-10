# Next session — P109 session 40

**Phase:** [README](README.md) · **Audit:** [AUDIT-2026-10-01.md](AUDIT-2026-10-01.md) · scoped at `27d891bf3`.
**Session 39 (2026-10-10, on `cline-dev`, primary tree):** board **33 of 52 closed** (ISL-034 ✅, ISL-036 ✅), plus
`P109-S38-SSRNOPAGES` fixed and `P109-S39-STALECLIBUNDLE` found and fixed. 15 commits, `86d00461a` … this docs commit.

## What s39 did (each row re-measured at HEAD first; each fix with a control)

- **ISL-034 ✅** ([task](ISL-034-THE-DOOR-AND-THE-DEPLOY-SAY-WHAT-WENT-WRONG.md) §8). All six rows still fired, and all
  six are fixed:
  - S18 `86d00461a`: an unnamed Router is `Main` in the index and in its own lookup; Page Router spec v6; deployed drive
    `scripts/devtools/isl034-unnamed-router.ts`.
  - S4 `1d7bbf1bf`: `unroutedPages` on create/update/apply when no Router can list a page.
  - S12 `aefa23791`: an unknown argument is refused by name, through one `validateToolInput` override for all 123 tools.
  - S15 `bf82671af`: `render_report` takes the authoring path and a unique title.
  - S5 `d88ae73d6`: the deploy engine rebuilds itself when older than its esbuild input list, and the deploy warns when
    the viewer runtime is older than its webpack list.
  - S1-CN004 `c6abe20c3`: the spec's fixture wire.
  - Found beside them, S39-STALECLIBUNDLE `1411841fd`: the `nodegx` bin (dated Oct 5) warns when older than its source.
- **ISL-036 ✅** ([task](ISL-036-THE-GATES-ARE-GREEN-FOR-THE-RIGHT-REASON.md) §8). All six still fired, and all six are
  fixed:
  - S10 `fa1dc081c`: `typecheck:mcp` exit 0. Ten errors, not eight, and one was a cast that made an assertion vacuous.
  - S19 `cd9d52e28`: HLS-006 skips the node-spec World's `.listen(` by receiver name.
  - S15-FLD011 `4e4e04447`: the orphan race, made deterministic first with a foreign reaper.
  - S9 `5e5b19408`: `CORPUS_PUBLISH_RATE` / `SHELF_PUBLISH_RATE` constants.
  - S6-D54 `d21517793`: bisected to GAM-011 `85c640b6c`, which made the old mutant correct; the mutant is now the
    still-broken split shape.
  - S6-TPL007 `7ad544278`: four stale kit-types copies; the GAM-015 gate now grades every committed copy via
    `git ls-files`.
- **P109-S38-SSRNOPAGES** `30b0b276d`: a tokenless reset with no Pages yet waits once for the inputs. Re-measured on a
  server-rendered deploy: since S18 it fired only at start-page URLs (`/`). After the fix: server 0, browser 0, hydrated.

## Where s38's handoff was wrong, or had moved

- S1-CN004 was never a product defect (s6 had said so). The fix was the spec's fixture.
- SSRNOPAGES's "twice, on every load" had already narrowed by the time it was built: S18 made an unnamed Router match its
  URLs, so only `/` (a start-page fallback) still fired.
- D54's "mutant row red, not attributed" was the product improving (GAM-011), not a regression.
- S10 was 10 errors, not 8.

## Do, in this order

1. **Nothing buildable is left on P109's own board without a decision or another phase.** Read the board's open rows
   (README table) before believing that. They are:
   - ISL-008 (AC7's export half, P18's pile).
   - ISL-010 (AC4, Richard's call on llama.cpp).
   - ISL-018 (AC7 on the DBT demo, its owner's).
   - ISL-022 (AC6).
   - ISL-024 (waits for a gap with no P108 lane open).
   - ISL-025 (W4–W22 wait on their tasks).
   - ISL-035 and ISL-037 (handed to P18 and P108).
   - Track G, ISL-039 … ISL-047 (waits on Richard's order).
2. If Richard rules STALEMCPDIST (below): build its lasting fix with the S5/S39 mechanism (an esbuild input list beside
   `noodl-mcp/dist/noodl-mcp.cjs`; the people's door rebuilds or warns). Until then **S4 and S12 do not reach agents
   using the dist door**.
3. Otherwise ask Richard for Track G's order. The board has 51 live rows there; ISL-039 and ISL-040 hold the blockers.

## Decisions for Richard (not yours)

- **New, s39:** `P109-S36-STALEMCPDIST` (high). Rebuild the people's MCP door now, and give it the S5 staleness check?
  Today `noodl-mcp/dist` carries none of S4/S12 (nor ISL-018's `ticked`). A rebuild bakes in whatever is uncommitted in
  `noodl-mcp/src` at that moment; today that is P78's `cloud/bundleEntry.js` D84 lines.
- **New, s39:** rebuild the `nodegx` bin (`nodegx-export/dist/cli.mjs`, Oct 5). It would carry P18's uncommitted
  exporter pile; P18's call or Richard's.
- Carried from s38: the Expression reading `Arrays.cart.get(0).qty`; the garden library entries at 1.0.0; C143's Refresh
  half; Track G's order; the layout of an unlabelled control in a real browser; `P109-S24-SIGNINWITHERRORKEPT`,
  `P109-S22-BUILTINBOUNDARY`, `P109-S20-LISTDEFAULTTYPE`, `P109-S18-REFRESHROWSTATE`, ISL-010 AC4 and the Effort port,
  pushing `cline-dev`, publishing the Garden kits at the origin; ISL-048 §13's Back/Forward note.

## Handed over (owed by another phase)

- **P18:** HLS-006's every-listener gate (theirs) now skips the node-spec model's `.listen(` by receiver
  name (`cd9d52e28`). Not told by message; it is in the commit and here. Also carried: Arrays in the export's
  Expression, the kit bootstraps, the Visual Function's reserved signal, the scroll rule (ISL-052 §2), s33's list.
- **P107:** the Page Router spec moved to v6 (`86d00461a`: an unnamed Router is Main; a new scenario for a mutant the fix
  unpinned). Their open NSP-018 edits have `stranger.test.ts`'s hash gate red on five spec files (animate-to-value,
  delay, dropdown, repeat, uuid), which is theirs.
- **P78 / TPL-011:** `noodl-mcp/src/cloud/bundleEntry.js`'s D84 lines are still uncommitted (since 2026-09-26).
- **Release notes, add (s39):**
  - A Router left with no name now opens the page each address names.
  - An agent is told when it writes a page no Router can open, and when it misspells an argument.
  - In a checkout, `nodegx deploy` rebuilds its own engine when it is out of date, and says when the runtime it copies
    is.
  - A server-rendered site no longer logs a false "no Pages" error.
  - s36–s38's items still owed.

## Gate readings taken s39 (2026-10-10)

- noodl-mcp, full run (`-w 3`, S12's check on): 3,824 / 3,845. 16 red suites, each attributed: TPL-011's untracked
  Nightbook; Group's doc at 17,292 tokens over AWP-005's 16,350; P116's contract types in ISL-023's reach; node-id
  allocation (red with HEAD's server and S4 reverted); CMP-004 ×2, D54, TPL-007, CMP-001, cn004, def018/020, def038,
  FLD-013, provision ×2, SBR-009. Since then CMP-001, D54, TPL-007 and cn004 are fixed (above). The rest are not
  P109's: read each one's ledger row before inheriting it.
- `npm run typecheck:mcp`: exit 0, 0 errors (`fa1dc081c`).
- Viewer: 151 / 151 suites, 1,841 / 1,841 (`-w 2`, `30b0b276d` in the tree).
- Page Router on the runtime: 139 / 139 at seeds 13 and 20732 (v6). Interpreter mutants: 0 survivors at both.
- node-spec package (`--testPathIgnorePatterns zz-`): 1,853 passed, 1 failed (stranger hash gate, P107's open edits).
- `bugs.js --from P109`: none of ISL-034's or ISL-036's rows; the open P109 rows are STALEMCPDIST (high) and four
  needs-ruling.

## Shared artefacts rebuilt in the primary this session (all from committed source, unless noted)

- `noodl-preview/dist/nodegx-deploy.cjs` + its new `nodegx-deploy.inputs.json` (auto-rebuilt by the S5 check).
- `noodl-editor/src/external/deploy/noodl.deploy.js` + `noodl.deploy.inputs.json` and the SSR runtime
  (`webpack.deploy.prod.js`, `webpack.ssr.prod.js`; the last rebuild carried `router.tsx` minutes before `30b0b276d`).
- `scripts/devtools/deploy-from-disk.cjs` (`build-deploy-from-disk.mjs`).
- Not rebuilt, on purpose: `noodl-mcp/dist`, `nodegx-export/dist` (see the decisions above).

## What s39 learned

- **The shared gitignored bundles get rebuilt by other sessions with uncommitted source in them.** The deploy engine was
  rebuilt at 13:19 with this session's open exporter edit inside. To grade the OLD behaviour, patch a copy and put it
  where the original sits (`noodl-preview/dist/`, so it finds the runtime beside it), named by `NODEGX_DEPLOY_CLI`.
- **A mutant arm can go stale because the product got better.** Bisect it with a one-file probe (`git bisect run`, exit
  125 when the test cannot run) in a `make-worktree.sh` worktree before deciding which side moved.
- **A fix can unpin a neighbour's mutant.** S18 left one alive at seed 20732 that only generated sequence #153 reached.
  Find the sequence with a scratch probe (`generateSequence` + `discoverBranches`, match the branch key), then write the
  scenario. In the spec's plays, acts and signals do not end a frame; only a settle does.
- **A count of reports depends on which URL is loaded.** SSRNOPAGES fired at every URL in s38 and only at `/` in s39.
  Re-measure on the URL the row names, and on the start URL.

## Worktrees

`p109-isl049` (branch `p109-isl052`) is unchanged from s38. Its `noodl-mcp/dist` is symlinks into the primary. The bisect
worktree `p109-s39-d54` was removed. The older ones are spent: `git worktree remove` when convenient.

## Recipes

- **A server render, driven:** `node scripts/devtools/deploy-from-disk.cjs <project> --out <dir> --ssr` (the project
  needs `rootNodeId`; rebuild the devtool with `node scripts/devtools/build-deploy-from-disk.mjs`, the runtimes with
  `webpack.deploy.prod.js` and `webpack.ssr.prod.js` in noodl-viewer-react). In `<dir>`: `npm install && npm run build &&
  PORT=<p> node server.js`. Then `node scripts/devtools/drive-isl012-cube.js http://127.0.0.1:<p><path>` reads the
  console (`messages`) and `ssr.stamped`. Stop the server by its LISTEN pid.
- **The CLI from source** (when the bin is stale): `npx tsx packages/nodegx-export/src/cli/main.ts deploy <proj> <out>
  --allow-development-engine`.
- **Land / grade / control / agent / editor:** as in s38 (unchanged). Commit through a temporary index (`GIT_INDEX_FILE`,
  `read-tree HEAD`, `add -- <paths>`, commit, then `git reset -q -- <paths>` on the real index at once).
