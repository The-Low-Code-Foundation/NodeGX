# The Beta round: the agent half, one orchestrator and three subagents

**Written 2026-10-27 night** after Richard read the board's Beta list and said "they all sound good … a separate
session, maybe with sub agents to tackle them all". Richard's own half (publishing 0.2.9, the map 0.1.4, his Desktop
run on 2026-10-28, the Search Console work, the Beta email) is NOT in this round.

## Read first, nothing else

1. `dev-docs/BOARD.md` §1–§2.
2. `dev-docs/tasks/phase-128-the-canon-everywhere/NEXT-SESSION-PROMPT.md`: the rules block (lines 1–31) binds every
   track, then the boxes S5, S7, S8 and S3b steps 7 and 10.
3. `dev-docs/tasks/phase-127-the-backend-in-the-open/NEXT-SESSION-PROMPT.md` § s10, "Next, in order (s11)", items 2–3.
4. `docs/CANON.md`. Copy sentences from it; never paraphrase it.

## Re-measure before you start (written down at 21:30 on 2026-10-27; it will have moved)

- `npm view @nodegx/mcp dist-tags`: 0.2.8 at writing. **0.2.9 was being published by another session.** Its
  tarball's sha1 was `5549d6f784d04085830e08ec8dc8100f151e0915`. This round does not cut, bump, pack, push or
  publish any release. Who owns releases is Richard's call, and it is not this session.
- `npm view @nodegx/backend-map version`: 0.1.3 at writing; Richard is publishing 0.1.4.
- `curl -s https://api.github.com/repos/The-Low-Code-Foundation/nodegx-studio/releases`: `[]` at writing (no
  release, draft or public), so every `releases/latest/download/…` link 404s.
- `git status` in all three repos. Another session is usually live in OpenNoodl's checkout. `stat` a file before
  editing it.

## How to run it

You are the orchestrator. Start **three subagents in parallel with the Agent tool**, one per repo (tracks A, B, C
below), each given this file's path, its track and the rules block. They may edit at the same time because they are
in different repos. Inside a track the items run **one after another**: Track A's four items all touch
`editor/studio.html`.

**One heavy job on the box.** Every gate (jest, vitest, a Studio `check:*`, a build) takes
`mkdir ~/vscode_projects/OpenNoodl-worktrees/HEAVY.lock` first, waits if that fails, runs under `nice -n 19`, and
removes the lock only if it made it. Tell each subagent this in its prompt; three suites at once is what Richard has
asked us never to do. Studio's checks drive Chrome; read memory `my-bash-sandbox-hangs-every-chrome-test.md` before the
first one.

Every defect met goes in `dev-docs/bugs/` (one file; `node scripts/bugs.js`) in the commit that finds it. Fix it only
if it blocks the item's AC. Commits go by pathspec through a temporary index. Never `git stash`, never `git add -A`,
never `git checkout --` on a file you did not write.

## Track A: nodegx-studio (`~/vscode_projects/nodegx-studio`, `main`, Node 22)

Read its `docs/NEXT-SESSION-PROMPT.md` (gates, the `--shots` trap) and add each STU row to `docs/SCOPE.md`.

1. **FNSTEPS, Studio's half** (row P127-BKO004-FNSTEPS; P127 s10 Next #2). `readFnRun` fetches
   `/api/backend/executions/<run.id>` the way `readAutoRun` does; `fnCard` puts `.ran` on each step's node and
   `.refused` on a failed one; add a `check:hosted` line. The backend half already serves the steps (`edd969319`).
2. **P128 S5: Help, the canon drawn in Studio** (STU-083, CPY-002). The box's Files and AC are the spec.
3. **P128 S7: Preview** (STU-080). The box's Files and AC are the spec.
4. **If `@nodegx/backend-map` 0.1.4 is on the registry:** Studio's pin and `vendor/NODEGX.json` move together
   (`npm run check:vendor`), plus a `check:hosted` line saying the map draws triggers inside the conversation. If it
   is not, skip this item and say so.
5. **The bundle's own install sheet** (S3b step 7, last sentence). `scripts/mcpb.mjs` `long_description` names
   `@nodegx/mcp 0.2.7` and `nodegx-studio 0.1.0`, jargon to a non-coder. Write it from the canon. Pass the copy
   through the content-authoring skill (memory `copy-passes-the-content-authoring-skill.md`).
6. **`@nodegx/studio` ready for npm, not published** (CCN-006 AC7; row P128-S3-NOSTUDIOFORTHEEDITOR's npm half).
   First measure what `open_studio` actually starts (noodl-mcp `src/studio/studioProcess.ts`): the package carries
   that and its `vendor/`, not the Electron app (that stays the DMG). Rename to `@nodegx/studio` and drop `private`;
   add `files`, and a `bin` if `npx @nodegx/studio` should open a folder. State the licence (GPL-3.0-only). Then
   `npm pack` and grade the tarball **outside the checkout**: install it into an empty directory, run it on a copy of
   `templates/todo-list`, the page answers 200, no machine path in any file (`grep -r '/Users/'`), and record the size.
   Hand Richard the publish line; do not run it.

## Track B: OpenNoodl (`cline-dev`)

1. **`findStudio` finds the npm package** (AC7's other half; `studioProcess.ts:14` already names it the fourth
   candidate): `require.resolve('@nodegx/studio/package.json')` after `NODEGX_STUDIO` and the sibling checkout, with
   a spec that installs Track A's tarball into a temp dir and resolves it. It rides the next `@nodegx/mcp` release.
   Do not bump anything.
2. **P128-S1-PREVIEWCUT** (high, no owner). In Claude Code `get_project_info` (61.6 KB) arrives as a 2 KB preview, so
   most of `readFirst` and the `sections` index never reach the agent. The row says to measure the inline limit first
   (somewhere between 40 and 61 KB in 2.1.251), then choose between an answer under the limit (the doctrines' index,
   not their bodies) and a `readFirst` that fits in 1,800 characters. If the choice changes what Cline or Desktop
   receives, write Richard the question in plain words (memory `ask-richard-a-ruling-in-plain-words.md`) instead of
   choosing for him. Keep the resident tool budget green (memory `mcp-tool-surface-has-an-8200-token-budget-gate.md`).
3. **P125-MUDDY-OPTSETSUNKNOWN and P125-MUDDY-SURFACESUNSAID** are still `open`, owned by P128-S2, whose box is
   ticked. Re-measure both against HEAD and against the 0.2.9 tarball (`npm-0.2.9-tarballs/`). Close each with its
   measurement, or write in the row what is left and who owns it.
4. **P128-S3-SIZEMSG** (S3b step 10, the agent's half): `parameterValues.ts:235` names the `var(--token)` form, and a
   refused `var(--x)` inside a `calc` suggests the token, not 16px. Grep the specs that pin the old text first. The
   `isError` question in that step is Richard's: leave it.

## Track C: nodegx-web (`~/vscode_projects/nodegx-web`)

🔴 **Never run `ops/deploy.sh` in this round.** It rsyncs `site/` with `--delete`, and the working tree is stale and
holds other sessions' uncommitted pages: live pages that exist only as untracked folders (`site/gala/`, `site/map/`,
`site/backend-map/` and others) would vanish from nodegx.io. Build, commit your own pathspecs, and hand Richard a
per-file upload list. He deploys.

1. **P128 S8: one ladder on the site** (CPY-001, SEE-009's download block). The box is the spec, AC included.
2. **The download a stranger finds** (S3b step 7). /start's path 1 links the `.mcpb` for each Mac (Apple silicon,
   Intel) instead of "coming soon … join the waitlist", from **GitHub Releases on nodegx-studio**
   (`releases/latest/download/<name>`; Richard leaned to GitHub on 2026-10-27; confirm it in the handoff, not by
   asking mid-round). Studio's "run it from source … git clone" leaves path 1. Put one line before the download that
   says what Desktop will show ("Installing will grant this extension access to everything on your computer. Any
   developer information shown has not been verified by Anthropic") and why that is normal for an extension from a
   website, with the source on GitHub. The links 404 until a release exists, so these pages wait to be deployed until
   it does.

## The end (the orchestrator)

1. Collect the three reports. Re-run the gate for any item whose subagent did not show you a fresh result file
   (memory `test-results-json-is-the-readout-not-the-log.md`).
2. Tick S5, S7 and S8 in P128's NEXT-SESSION-PROMPT, with three lines under each. Add P127 lines for FNSTEPS and the
   map pin. Update BOARD.md's lane cells (rule 5: from the task files). Run `node scripts/bugs.js`.
3. Write **For Richard**, in plain words, in this order:
   - the `@nodegx/studio` publish line, with the tarball's size and sha1
   - the nodegx-web per-file upload list
   - the PREVIEWCUT question, if any
   - what waits on a GitHub release
4. Update the memory index with any trap a later session would hit, then run `/next`.
