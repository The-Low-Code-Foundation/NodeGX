# OWN-020 — the session after the Cline kit (Opus)

**Written 2026-10-20 ~11:20 CEST by the Opus session that built the Cline kit and committed element styles.**
Read, in order: this file; `../OWN-020-THREE-HARNESSES.md` §7 (acceptance), §10 (R41–R44), and §12's last three entries
("the Cline kit, AC2", "option 4 … parked", and the CDS2 / UI passes above them); `round-cline.mjs` (the Cline arm,
the seal, `--kit cline`, `--seed`); `stream-tap.mjs`. Then the memory index, lane 5, and
`memory/two-template-suites-rebuild-templates-in-place.md`.

## Where it stands (2026-10-20, `cline-dev` at `a0c3a1767` + peers' commits)

Richard asked whether the Cline / DeepSeek V4.1 Flash version can be declared done like the Mistral one and published.
**Not yet**, and he agreed to the order below. Mistral's bar was its own package plus quiz 12/12 ×3 and Launch 17–18/19
×3. DeepSeek on Cline has quiz 12/12 ×1 (CDQ1) and Launch 17/19 ×1 (CDL1), and the Spotify build (CDS2, graded by eye).

**Done and committed:**
- `377d4d312` **the Cline kit (AC2).** `create-nodegx --cline` writes `AGENTS.md` (the core note, verbatim) and the
  editor skill, and adds ONE `nodegx` entry to Cline's MCP file (`~/.cline/data/settings/cline_mcp_settings.json`,
  resolved like Cline: `CLINE_MCP_SETTINGS_PATH` › `CLINE_DATA_DIR` › `CLINE_DIR`): pinned, `--allow-writes
  --screenshots-to-files`, `timeout: 300`, `metadata.writtenBy: "create-nodegx"`. Never replaces the person's own
  `nodegx`; moves the kit's own marked entry to a newer release (**open ruling, below**). `packages/create-nodegx/cline`
  = `create-nodegx-cline` (the vibe wrapper's shape). `publish-npm.sh` lists it last. Measured: no per-folder route in
  Cline 3.0.71 or 3.0.73 (plugin `registerMcpServer` is never connected; agent plugins only from `~/.agents/plugins`).
  Tests: `create.test.js` 34/34 (mutant caught); a $0 mock round (`kc-mock1`, `--kit cline`, Cline 3.0.71) accepted the
  entry, offered the 7 tools, `list_examples` answered.
- `3cb9eb745` + `a0c3a1767` **element styles without the creation stamp.** `set_element_style` (`starter: true` = the
  on-system look for one control type), the styles writer, schema/type for a nameless variant, the vocabulary report,
  the doctrine sentence, `control-off-scale`, and render-from-disk passing variants (P112-OWN020-RENDERNOVARIANTS,
  fixed). **Option 4 (stamp every new project) is PARKED** as `option4-stamp.patch`: every template builds through
  `create_project`, so it restyled ~700 controls in 13 templates (sizes too) and turned 8 template suites red. Plan in
  §12 ("adopt, keeping what's there"). Readings 2026-10-20: own020ElementStyles 10/10, 90/90 across tool-surface and
  create suites, the 8 template files 734/734, render-measure 38/38, editor doctrine 21/21, tsc clean (mcp, contract,
  preview). NOT run on the final tree: the server's whole suite (the last whole run, WITH the stamp, was 16 red files;
  5 are other lanes': `emailCode`, ParseCSV export, TPL-011 Nightbook ×2, `cmp004RoundTrip`; D28 and SBR-009 stay red
  with the stamp off, cause unmeasured).

**Written, not committed:** this file, `OWN-020-THREE-HARNESSES.md` (the whole task file and most of `own-020/` have
never been committed: a loose pile from earlier OWN-020 sessions, plus this session's §12 entries), the board's lane-5
cell (`dev-docs/BOARD.md`, which also holds a peer's uncommitted edit). `round-cline.mjs`'s `--kit cline` change is in
that untracked pile too.

**Not done:** no real model has built on the Cline kit; Cline Desktop / VS Code extension / Windows unmeasured; no 0.2.4
candidate packed.

## Settled this session (where the plan of record was wrong)

- §4 assumed `cline mcp add` or a launcher might do; measured: `mcp add` silently REPLACES an existing `nodegx` and
  can't set `timeout` (Cline's connect limit is 10 s; a cold npx took 27.8 s), so the kit writes the entry itself.
- The Cline kit can't ride npm 0.2.3 (`create-nodegx@0.2.3` has no `--cline`); it ships in 0.2.4, after the rounds.
- The element-styles pile was believed ready to commit; its creation stamp reaches every template. Split, stamp parked.
- The starters' comment claimed "look only, never where anything sits"; false (padding, width/height). Corrected.
- `tpl005` / `tpl006` suites rebuild `templates/pixel-game` and `story-engine` IN PLACE: this session's full run wrote a
  styles file into each (removed). `git status` those two after any full `noodl-mcp` run.

## Next, in order (an agent alone)

1. **Commit the OWN-020 pile, if Richard says yes** (he was offered it; no answer yet). Read it first: `own-020/`,
   `OWN-020-THREE-HARNESSES.md`, the untracked `dev-docs/bugs/p112-own020-*.md` (calltoolstrip, fillgrow, noaffordance,
   outdiranywhere, pillwrap). No secrets in it is a precondition (the lab reads `.env`; check nothing copied a key).
2. **Pack the 0.2.4 candidate in a clean worktree** (`scripts/…/make-worktree.sh`; a worktree has no build output, see
   memory). Bump to 0.2.4 the way `chore(release)` commits did; pack mcp, preview, create-nodegx, create-nodegx-vibe,
   create-nodegx-cline into a `tgzNN` folder outside the repo; test each from an empty folder with an empty HOME
   (OWN-021 §10's list, plus `npx --package=<cline tgz> --package=<core tgz> create-nodegx-cline my-cline` → AGENTS.md,
   the skill, and the entry in `$HOME/.cline/data/settings/cline_mcp_settings.json`).
3. **Re-run `kc-mock1`'s mock round on that candidate** (`round-cline.mjs … --kit cline --base-url
   http://127.0.0.1:<port>` with `mock-model.mjs`; $0) before any real round.

## Waits on Richard

- **ASK before any ClinePass round** (they spend his allowance; he reads the 5-hour / weekly / monthly bars before and
  after each). Then: CDQ2 (quiz) and CDL2 (Launch) on the candidate for AC5's second passes, and the stream question:
  one DIRECT sitting and one TAPPED sitting (`stream-tap.mjs` record mode) at the same hour.
- **Ruling:** may the Cline kit move its OWN marked entry to a newer release (beyond R42's "never replace an entry")?
- **npm 0.2.3 is half out** (node-spec and project-contract 0.2.0 live; preview, mcp, create-nodegx, create-nodegx-vibe
  still 0.2.2 at 11:20). Richard re-runs `scripts/own/publish-npm.sh /Users/richardosborne/vscode_projects/OpenNoodl-worktrees/npm-0.2.3-tarballs`;
  a big upload may stage (E409 on a re-run = approve in the browser, wait, re-run).
- **Step 2 of option 4** ("adopt, keeping what's there") is its own task when he wants it; step 3 (restyle a template's
  own controls) is his by-eye call per template.
- AC6 (his own Cline run) and AC8 (the claim's words, through the content-authoring skill) come last.
