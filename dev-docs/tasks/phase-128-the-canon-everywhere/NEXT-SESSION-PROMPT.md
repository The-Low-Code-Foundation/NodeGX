# P128 — the sessions, in order. Pick the first unticked one.

You are one session of phase 128, *the canon everywhere*. Read, in this order, nothing else first:
`dev-docs/BOARD.md` §1–§2 · this file · `docs/CANON.md` (the text you are implementing; never paraphrase it, quote it)
· `dev-docs/reviews/the-three-surfaces-audit-2026-10-27.md` §1 (the measurements), §4, §8, §11, §12 (the rows and
every file they touch). Then take the first session below whose box is empty, and only that one.

**Rules for every session.**
- One heavy job on this machine: before any gate, `mkdir ~/vscode_projects/OpenNoodl-worktrees/HEAVY.lock` and stop
  if it fails; remove it only if you made it. Wait for another session's jest/vitest first (match node processes by
  command, never by name). Suites run `nice -n 19`.
- The canon is the source. A sentence a surface carries is copied from `docs/CANON.md`; if the canon needs a word
  changed, change it there and say so in your handoff. Richard rules wording, you do not invent it.
- Measure before you claim: every AC below names its measurement. "It reads right" is not one.
- A defect you meet on the way goes in `dev-docs/bugs/` (one file, id `P128-S<n>-NAME`) in the same commit as the
  finding; you fix it only if it blocks your AC.
- Commit your own hunks by pathspec through a temporary index (`GIT_INDEX_FILE`), never `git add -A`, never
  `git stash`, never `git checkout --` on a file you did not write. Another session is usually live in this checkout:
  `git status` shows their edits; mtime says whose.
- End by ticking your box below, writing three lines under it (what landed, the gate numbers, what the next session
  should know), and updating the memory index if you learned a trap a later session would hit.
- Studio sessions work in `~/vscode_projects/nodegx-studio` (Node 22: `~/.nvm/versions/node/v22.22.0/bin`), its
  `docs/NEXT-SESSION-PROMPT.md` names its gates and the `--shots` trap; add your STU row to its `docs/SCOPE.md`.
  Site sessions work in `~/vscode_projects/nodegx-web` (`site/<page>/_page.html` is the source; `ops/build.py`;
  deploy only on Richard's yes, with `ops/deploy.sh 49.12.102.195`, and read the md5 line).
- Anything the agent reads in Claude Desktop comes from the **built** `packages/noodl-mcp/dist` and, for the one-file
  install, nodegx-studio's `npm run mcpb`. A source change nobody rebuilt is a change Richard cannot see. Say in your
  handoff whether you rebuilt.

---

## Repo A — OpenNoodl (`cline-dev`)

### [x] S1 — CCN-009: the agent reads the canon (AC3 open, carried by S2)
**Files.** `packages/noodl-mcp/src/guidance.ts` (add `surfaces: 'surfacesDoctrine'` to `SECTION_FIELDS`, its
`SECTION_ABOUT` line, and one `MUST_KNOW` line: *"The person sees the app in Studio unless you showed a mini editor;
a fixed list (a language, a status) is a Static Data node in its own component under `Option sets/`, never typed
strings; a part Studio does not draw is said so, with the editor named and the two ways offered. [surfaces]"*);
`src/tools/responses.ts` (the section's text: `docs/CANON.md` "Which AI coder", "Three ways to touch your app", "The
wiring underneath" with the offer sentence verbatim, "For the agent" rules 1–5; read `docs/CANON.md` at build time or
pin a copy with a test that diffs it); `src/tools/read.ts` (the field rides with the other five);
`src/tools/openStudio.ts`, `src/tools/miniEditor.ts`, `src/tools/openInEditor.ts` (one clause each naming the other
surfaces, and `open_in_editor` saying what to do when NodeGX is not installed: nodegx.io/start#download, then Connect
Claude); `src/instructions.ts` (one sentence in the bound briefing pointing at the section; the surface has ~6 tokens
of headroom, so trade words inside the existing text rather than add); `src/project/agentConfig.ts` and the editor's
`models/template/agentConfig.ts` (a "Where the person sees this app" paragraph in the seeded `CLAUDE.md`/`AGENTS.md`,
agent-agnostic); the hand-over: when `apply_plan` applies the last operation of a plan, its result carries
`handover` (canon rule 3: what they own, what they change in Studio, the editor the AI can build, how to come back).
**Tests to update.** `packages/noodl-mcp/tests/instructions.test.ts` (pins the briefing character for character:
re-capture the fixture and say so), `tests/toolDisclosure.test.ts` (the 8,200-token budget: measure, do not guess),
`tests/guidance*.test.ts` (sections, parts, MUST_KNOW order). Then `npm run build` in `packages/noodl-mcp` (the dist
is what Desktop runs).
**AC (measured).** (1) `get_project_info` on Muddy Paws Shelter returns `surfacesDoctrine` and the MUST_KNOW line, and
`get_project_info({section:'surfaces'})` returns it in parts. (2) A fresh Sonnet 5.5 session in the fake host
(`dev-docs/tasks/phase-125-co-construction/tools-fake-host.mjs`) given `NodeGX test projects/Muddy Paws
Shelter/docs/decisions/000-initial-scope.md` as the brief and asked for the English/French switch builds
`Option sets/Language` as a Static Data component and reads it from the header buttons, no typed `fr`/`en` in a Set
Variable step. (3) Asked "where does the headline's wording come from?", the same session's answer names the part,
says Studio does not draw it, and offers the two ways in the canon's words. (4) The last `apply_plan` of a plan
carries `handover`. (5) Every noodl-mcp gate green; the briefing budget test says its number.
**Not in S1.** The write note (S2), the example (S2), the site (S8).

- **Landed (2026-10-27).** `surfacesDoctrine` / section `surfaces` (`src/surfaces.ts`, quoting the pinned canon
  `noodl-editor/src/editor/src/models/canon.ts`, made by `scripts/pin-canon.mjs` and diffed by `tests/p128CanonPin.test.ts`),
  the MUST_KNOW line (SECOND, not last: Claude Code shows a 2 KB preview of a long result, P128-S1-PREVIEWCUT), the
  briefing's pointer (paid for by the PAGES no-op clause), the three tools' clauses, `open_in_editor`'s refusals naming
  the download, the seeded "Where the person sees this app" with two `<!-- canon: -->` quotes, `handover` on the apply
  that builds the scope's last page. **Dist rebuilt** (13:15); the mcpb is not.
- **Gates.** Surface 8,276 / 8,280. AC1 met on the dist; AC2 met in 2 of 3 Sonnet 5.5 rounds (1/1 where the line
  reached the agent); **AC3 not met, 0 of 2**: both agents named the node and said nothing of Studio, neither fetched
  the section; AC4 by spec. noodl-mcp: every red file is red at HEAD too or is a peer's untracked work (s1/RESULTS.md,
  the handoff below has the list).
- **For S2.** AC3 is yours to re-measure: the write note is the push the pull text was not. Re-run `s1/round.mjs` on a
  fresh lab, then `--again s1/prompt-2.txt`. The pinned Studio vocabulary should name what `surfaces.ts`'s lead lists
  (a `States` node, a Function/Script, an Expression Studio's composer did not make, a placed logic component).

### [x] S2 — OWN-027 and CCN-010: the option-set example, the validator's hint, the write note
**Files.** `packages/noodl-mcp` examples (`get_example('option-set')`: the component under `Option sets/`, a page
with a dropdown fed by it and a Set Variable step choosing one; `list_examples` lists it); `src/validate.ts` (a
suggestion, never an error, when two `Set Variable` steps in a project type the same literal into the same variable:
"a fixed list is an option set, see get_example('option-set')"); the write path (`src/tools/author.ts` or where
`create_component`/`update_component` build their result): when Studio is open for this project (the studio process
map in `src/studio/studioProcess.ts`) and the written component places a node type outside Studio's vocabulary, the
result carries `notDrawnInStudio: [{ node, type }]` and the cue sentence from the canon; **never a refusal**. Until
S6 ships the vocabulary file, pin the list from `nodegx-studio/editor/studio.html` (`ACTIONS` at 4470, the visual
types Studio's palette lists, the source kinds in `valueSources`) in `src/studio/vocabulary.ts` with a comment that S6
replaces it.
**AC.** The example renders in `render_report`; the Muddy Paws `Wording` write returns the note with `States` named;
the two-literals case in Muddy Paws Shelter returns the suggestion; gates green; dist rebuilt.

- **Landed (2026-10-27).** `get_example('option-set')` (`docs/node-catalog/examples/option-set.json`, merged into the
  enriched catalog: `/Option sets/Languages` = Static Data `{Label, Value}` → Component Outputs `items`/`count`; a page
  whose Dropdown reads it and whose Set Variable takes the picked Value, no literal); `fixed-list-as-literals` (info,
  `src/validate.ts`, on writes and both validate tools); `notDrawnInStudio` + `studioNote` (canon rule 4 + the offer,
  quoted) on `create_component`, `update_component` and `apply_plan` while Studio runs for the project, naming only
  the nodes the write introduced, never a refusal (`src/studio/vocabulary.ts`, pinned from `studio.html` at `668212a`:
  S6 replaces it). **Dist rebuilt** (14:21); the mcpb is not.
- **Gates.** All four ACs met on the dist against a Muddy Paws copy (`s2/ac.mjs`, `s2/RESULTS.md`): Header → 1 info
  with the suggestion; Wording → `[Variable2, States]` + note, none without Studio; example render DONE, `drive_page`
  4/4 (options `English|Français`, a pick stores `fr`). Spec `p128OptionSet` 14/14; catalog:examples 115/115,
  merge:check clean; noodl-mcp 5044 pass / 12 fail in 8 files: S1's 5 HEAD reds + 2 peer TPL-011 + `npmauditExampleInvalid`
  › ui-empty-state, refused by the rule `79cbc4674` COMPVISIBLE added (P128-S2-EMPTYSTATEREFUSED, not S2's).
- **For S3 and after.** S1's AC3 is still un-re-measured: a Sonnet round that calls `open_studio` first, then
  `--again s1/prompt-2.txt`, is the measurement. Filed: P128-S2-OPTSETSHAPE (Studio's `display` rows vs the
  Dropdown's `Label`/`Value`: S4 or S6 rules the row shape), P128-S2-ACTIONNAMES (read only). S6: export type names.

### [x] S3 — CPY-003 and CPY-004: the READMEs, the editor's welcome line, the canon check
**Files.** `packages/noodl-mcp/README.md`, `packages/create-nodegx/README.md`, `README.md` (the first paragraph is
`docs/CANON.md` "What NodeGX is for", first paragraph, verbatim, then the package's own job in one sentence);
`packages/noodl-editor` welcome (one line: NodeGX Studio exists for the day-to-day, and Connect Claude walks you from
it; `grep -rn 'Connect Claude' packages/noodl-editor/src` finds the place); `scripts/canon-check.mjs`: a map of
quoting places → the canon headings they carry, read from a `<!-- canon: <heading> -->` marker each place puts above
its quote; the check fails when the quoted block differs from the canon's; wired into `npm run check` or the PR gate
the repo already runs for docs (say which).
**AC.** The check passes on the three READMEs and S1's seed paragraph; a one-word change to the canon makes it fail
on each (run it, revert).

- **Landed (2026-10-27).** `scripts/canon-check.mjs` (`npm run canon:check`, wired into the PR workflow's Lint job;
  the root has no `npm run check`): a register of places → headings; markdown/HTML places are read for
  `<!-- canon: -->` quotes, the seed is rendered by bundling the editor's `agentConfig.ts` with esbuild, the pin
  (`models/canon.ts`) is diffed whole; wrapping, `*`, backticks, tags and curly quotes are not words, every word is.
  The three READMEs open with the canon's first paragraph + one sentence each; the launcher's Connect card has the
  Studio line, made of three registered canon phrases. Extra files as arguments (`node scripts/canon-check.mjs
  site/_page.html`) are S8's hook; `--canon=<copy>` reads a changed canon without touching the shared one.
- **Gates.** 16 quotes pass. A one-word change in a copy of the canon, three ways ("around"→"after", rule 5's
  "several"→"many", the offer's "It's"→"It is"; plus the Studio phrase): exit 1, each failing exactly its places
  (4, 3, 3, 2). Synthetic site HTML: passes, and fails on "whole"→"full". see001Honesty + p128CanonPin 16/16,
  create-nodegx 34/34. No dist rebuild needed (the MCP README ships on the next publish; nothing in `src/` changed).
- **For S4 and after.** Filed P128-S3-NOSTUDIOFORTHEEDITOR (launch: beta): the editor's Connect Claude Code registers
  a server whose `findStudio` only knows `$NODEGX_STUDIO` and our checkout path, so the card's (and the canon's)
  "it opens Studio in a browser window beside the chat" is false for a stranger until it is fixed. The welcome line
  and the README sentences after the quote are composed by S3, not ruled: Richard reads them.

### [ ] S3b — the stranger's install: from Richard's AC8 run to a download a stranger can take
**Why.** Richard asked (2026-10-27) what it takes for a fresh Claude Desktop where a person says "I like NodeGX,
let's use that" and gets there without a million downloads, a virus scare or "forget it, use React". His run of the
`.mcpb` in his own Desktop ([CCN-006-AC8-RUN-2026-10-27.md](../phase-125-co-construction/CCN-006-AC8-RUN-2026-10-27.md),
the table is the record) found the walls; this box is the path through them, in order. Read each row's bug file
before its step, and its `owner:` line: Beta sweep s19/s20 sessions took three of these rows the same afternoon.

**Done and seen working (Desktop, Richard's Mac, 2026-10-27).** P128-S3-HELPERNODE: Desktop runs a `node` extension
on its built-in Node, an Electron utility process whose `execPath` ("Claude Helper (Plugin)") refuses to run a
script, so Studio, the render, the backend and deploy never started. Fixed by a bundled Node: `scriptRuntime()`
(noodl-mcp `560ee23d9`) + nodegx-studio `2b445fa` (`node/bin/node`, v22.22.0, signed by the Node.js Foundation,
`NODEGX_NODE`). On `nodegx-0.2.8-darwin-arm64.mcpb` (a local pack of that tree, 62.1 MB): Studio up in the
conversation, `ps` showed Studio and the render harness on `…/Claude Extensions/…nodegx/node/bin/node`; step 4 passed
(Richard's own change in Studio kept, the agent carried on from it). noodl-mcp 5053 pass / 11 fail, all red before.
**Written, not seen in Desktop:** the backend and deploy on the bundled Node (backend provisioned only under the
stand-in, deploy not driven); P128-S3-NAMEMISMATCH (s20, `e03258b33` + studio `a1b019e`, graded on the handshake
only); UNFINDABLE's robots/sitemap/llms.txt (nodegx-web `3af9be4`, not deployed).

**Settled, where the plan of record was wrong.** (1) A headless drive on a real `node` (CCN-006 s13, and this
session's first) cannot see Desktop's Node: always drive under `s3/as-desktop.cjs`, with the 0.2.7 bundle as the
control (it must fail on exit 64). (2) HELPERNODE's own Proposed (worker threads) was not built: the backend outlives
the server and is tracked by pid, the render harness kills its process group; a bundled Node changes nothing for the
children. (3) The extensions directory is not a route: it takes no `.mcpb`, and a plugin's local server is "Ignored"
in Chat (claude.com/docs/directory/publish, /docs/plugins/platform-support). (4) Signing is not a route today
(P128-S3-SIGNBROKEN: mcpb 2.1.2 writes a malformed zip; the warning is about Anthropic's verification, not ours).

**The tools** (`s3/`): `drive-mcpb.mjs` (an unpacked `.mcpb` as Desktop starts it; `PRELOAD=…/as-desktop.cjs`,
`BACKEND=1`), `startup.mjs` (what the server hands a `claude-ai` client at start), `as-desktop.cjs` + the fake
`Claude Helper (Plugin)` (exit 64). Unpack a bundle with `unzip -q <file> -d <empty dir>`; copy `templates/todo-list`
for the project; an empty dir for HOME.

**The steps, in order.** R = Richard's; A = an agent alone.
1. **R — rule the release.** The prepared npm 0.2.8 (`dfdc9e25e`, `OpenNoodl-worktrees/npm-0.2.8b-tarballs/`, not
   published) predates `560ee23d9` and `e03258b33`: a `.mcpb` built from it is broken in Desktop again. Re-cut 0.2.8
   from HEAD (recommended; nothing of 0.2.8 is published) or publish it and cut 0.2.9 with the two fixes. The release
   recipe and its gates are in `dfdc9e25e`'s message and P127's NEXT-SESSION-PROMPT.
2. **A — re-cut** into `npm-0.2.8c-tarballs/` with the same gates (create-nodegx 34/34, `publishable.js`, `bugs.js gate`
   core/preview/mcp/node-spec, `canon:check`). Prove the pack carries both fixes: `tar -xOzf nodegx-mcp-0.2.8.tgz
   package/dist/noodl-mcp.cjs | grep -c 'NODEGX_NODE\|NODEGX_SERVER_NAME'` (both present).
3. **A — the test `.mcpb` from that pack** (nodegx-studio, Node 22: `~/.nvm/versions/node/v22.22.0/bin`):
   `node scripts/mcpb.mjs --mcp-tarball <…/nodegx-mcp-0.2.8.tgz>`. Drive it under the stand-in: `open_studio` 200,
   `render_report` DONE, `BACKEND=1` provisions; `initialize` says `"name":"nodegx"` (NAMEMISMATCH); the 0.2.7 bundle
   fails the same three (the control). Copy it to `/Users/Shared/`.
4. **R — the count (NAMEMISMATCH).** Double-click the step-3 file over the installed test build; quit Desktop and
   reopen; then 4 fresh chats, each "Make me a NodeGX app: a tap counter with a reset button." Count the chats with no
   tool call (`grep -c tools/call ~/Library/Logs/Claude/mcp-server-nodegx.log` before and after each). Before the fix:
   1 silent of 3. Also ask: how many Allow prompts a build costs, and which choice (never measured; all 122 tools
   default to "Needs approval").
5. **R — publish** (his yes, the release recipe). **A —** pin Studio to the published version (`package.json` +
   `npm install` for the lock), Studio's gates per its `docs/NEXT-SESSION-PROMPT.md`, then the real bundle with no
   `--mcp-tarball`; drive it as in step 3.
6. **A — the other Macs.** `node scripts/mcpb.mjs --node darwin-x64` (built in, not yet run); drive the x64 bundle
   under Rosetta (`arch -x86_64`) if this Mac has it. **Windows** is not built: `bundleNode()` throws for win32 (needs
   the `node-v22.22.0-win-x64.zip`, `node.exe`, `NODEGX_NODE` ending `.exe`) and a Windows machine to run it on (R: is
   there one?).
7. **A — the download a stranger finds** (S8 + CCN-006 AC6, nodegx-web): /start's path 1 links the `.mcpb` per Mac
   (Apple silicon / Intel) instead of *"coming soon … join the waitlist"*; Studio's *"run it from source … git clone"*
   leaves path 1; a line before the download says what Desktop will show (*"Installing will grant this extension
   access to everything on your computer. Any developer information shown has not been verified by Anthropic"*) and why
   that is normal for an extension from a website, with the source on GitHub. Where the file is hosted is R's call (the
   draft-release mechanism in nodegx-studio `75c8d63`, or nodegx.io). Also the bundle's own sheet: `scripts/mcpb.mjs`
   `long_description` names `@nodegx/mcp 0.2.7` and `nodegx-studio 0.1.0`, jargon to a non-coder (not filed; one copy
   fix). Deploy only on R's yes.
8. **A — first contact that never relies on search** (UNFINDABLE part 1): the Beta email
   (`dev-docs/reviews/the-three-surfaces-audit-2026-10-27-assets/brevo-studio-beta-email.md`) and the video's
   description say *"paste https://nodegx.io/start into Claude"* (with the scheme: a bare `nodegx.io/start` failed
   Claude's first fetch). R rules the words.
9. **R — be findable** (UNFINDABLE part 2): deploy nodegx-web `3af9be4` (`deploy.sh` ships the working tree, which
   holds others' uncommitted pages: deploy from a clean checkout of the commit); Google Search Console and Bing
   Webmaster Tools (a DNS TXT record each); nodegx-studio's GitHub "About" website field (empty); a few links in (the
   video, a Show HN). **A —** re-run step 0 (an incognito chat, "I'd like to build an app with NodeGX. How do I
   start?") a week after, and write the reply into the bug.
10. **A — P128-S3-SIZEMSG** (low): `parameterValues.ts:235` names the `var(--token)` form; a refused `var(--x)` inside a
    calc suggests the token, not 16px; grep the specs that pin the old text. **R —** whether a refused write should
    reach the host as `isError` (honest for the agent, red "Error" blocks for the person).
11. **A — watch P128-S3-SIGNBROKEN:** `npm view @anthropic-ai/mcpb version` above 2.1.2 → the re-measure in the bug.
12. **R — his Desktop, when the runs are done.** It has the test extension and no checkout server; the old `nodegx`
    entry is backed up at `~/Library/Application Support/Claude/claude_desktop_config.before-mcpb-run-2026-10-27.json`.
    Restoring it beside the extension runs two NodeGX servers: uninstall the extension first (Settings → Extensions),
    quit Desktop, then an agent copies the backup back.

**AC.** A stranger's path measured end to end on the published bundle: step 0 answers with nodegx.io (or the copy
hands the link), /start offers one download for their Mac, the install sheet is the only warning and /start named it
first, Studio comes up in the first chat, and the count in step 4 is 0 silent of 4.

## Repo B — nodegx-studio (`main`)

### [~] S4 — P125-MUDDY-NATIVEDIALOG and STU-082, the sandbox census — TAKEN by Beta sweep s21 (2026-10-27, Richard's yes): skip to S5
**Files.** `editor/studio.html`: replace the 5 `prompt()` (4649, 5431, 5468, 5489, 5504) with Studio's own inline
name field (a popover with one input and Create, Enter and Esc) and the 9 `confirm()` (4716–5534) with its own
confirm card; `editor/check.mjs` and `editor/data-check.mjs`: remove the `window.prompt`/`window.confirm` stubs and
drive the real controls; `editor/hosted-check.mjs`: make one option set and one data type inside the fake host
(`sandbox="allow-scripts allow-same-origin allow-forms"`, no `allow-modals`). The census: `grep -n 'alert(\|window.open\|showOpenFilePicker\|navigator.clipboard\|download=' editor/studio.html editor/hosted/hosted.js`, each
driven once in the fake host; each that dies gets Studio's own control and a `check:hosted` check.
**AC.** New option set, attribute, data type and style work in `npm start` (Electron) and in the fake host; a delete
asks in Studio's card; `check:editor`, `check:data`, `check:hosted`, `check:app` green with the stubs gone; the census
table in SCOPE under STU-082.

### [ ] S5 — STU-083 Help and CPY-002: the canon drawn in Studio
**Files.** `editor/studio.html`: a Help entry in the rail (not a main tab: under the ⋯ menu and a `?` in the hosted
strip) drawing `docs/CANON.md` as served by `editor/serve.mjs` from the vendored kit (`vendor/` carries the NodeGX
checkout: add `docs/CANON.md` to what `npm run vendor` copies, so Studio ships the canon it quotes), with the three
downloads as buttons (Studio's desktop app, the NodeGX editor: nodegx.io/start#download, your own editor:
nodegx.io/your-own-editor); `app/welcome.html` one line and the hosted strip's state text one line, both from the
canon's "When it's finished" paragraph; the Option sets empty state in the person's terms (a language, a status).
**AC.** Help opens in the desktop app and in the fake host and shows the canon's headings; the links are the canon's;
`check:editor`, `check:hosted` green; a picture in `docs/look/`.

### [ ] S6 — STU-084 Wiring and P125-MUDDY-DEADCHIP: the wiring underneath
**Files.** `editor/studio.html`: a read-only canvas of the current page's whole graph drawn with `@nodegx/canvas-look`
the way `editor/fngraph.mjs` draws a cloud function (BKO-004), reached from a quiet "Wiring" link in the Design tab's
footer and from the chip: `sourceChip`'s fall-through (2975–2982) becomes a clickable chip opening a card (the node's
label and type, "Studio doesn't edit this. Look at the wiring underneath, or open it in the NodeGX editor.", **Wiring**
with that node selected, **Get the editor**, **Ask the agent** which writes a note `what_changed_since` reports); a
"Logic on this page" list under the element tree for the non-helper logic nodes. Export Studio's vocabulary as
`editor/vocabulary.json` (visual types, step kinds, source kinds) served at `/api/vocabulary` and in the package, and
tell S2 (its pinned copy goes).
**AC.** On Muddy Paws Shelter's Home, the headline's chip opens the card, Wiring shows the page with the `/Components/T`
instance selected, and the States node in `Wording` is reachable the same way; the canvas takes no edits; `check:editor`
green with the new checks; a picture in `docs/look/`.

### [ ] S7 — STU-080 Preview
**Files.** `editor/serve.mjs`: `GET /app` serving a one-page HTML that loads `/preview.js`, fetches `/api/project`,
mounts with `NodegxPreview.mountPreview` full-window and re-mounts on each `/api/events` message (debounced);
`editor/hosted/hosted.js`: **Preview ↗** beside Window ↗ opening `ORIGIN + '/app'` via `app.openLink`; the desktop
app's header gets the same button.
**AC.** A headline changed in Studio inside the fake host changes in the `/app` tab without a reload (driven with
`editor/cdp.mjs`); `check:hosted`, `check:app` green.

## Repo C — nodegx-web

### [ ] S8 — CPY-001 and SEE-009's download block: one ladder on the site
**Files.** `site/_page.html` (the hero stays; "Pick your way in" and the Price list picture name the part in the
chat, Studio and the NodeGX editor by the canon's names; a "Which AI coder" line from the canon), `site/start/_page.html`
("Choose your editor" = the three ways, the canon's table; the download block says Beta on the day Richard names,
alpha until then), `site/studio/_page.html` (a "What Studio doesn't edit, and where it is" section: the Wiring
paragraph), `site/why/_page.html` (the cheaper-model sentence from the canon's list, replacing any stronger claim);
"mini editor", "full editor" and "professional editor" appear nowhere. Each quote carries the `<!-- canon: -->` marker
S3 reads. Build with `ops/build.py`; deploy only on Richard's yes.
**AC.** A text extract of the four pages (the audit's python snippet) shows the three names and no other; S3's check
passes on the site pages; Richard reads it.

---

## After S1–S8: the gate

Richard's run, the audit's §8 steps 1–9, on a fourth brief, in Claude Desktop, on the rebuilt dist and mcpb; then one
stranger (P125 CCN-007) on steps 1–7; then the cut and the Brevo email
(`dev-docs/reviews/the-three-surfaces-audit-2026-10-27-assets/brevo-studio-beta-email.md`, its `[confirm]` marks
resolved). Lane 9's SCHEDULEAUTH ruling and `@nodegx/mcp` 0.2.8 are not this phase's and stay first on the board.

## Handoffs (each session writes three lines under its box above, and the newest here)

- 2026-10-27, S3 follow-up (the AC8 run with Richard): S3b above is the plan; the run's table is
  `../phase-125-co-construction/CCN-006-AC8-RUN-2026-10-27.md`. Traps: Claude Code's shell here has
  `ELECTRON_RUN_AS_NODE=1`, so the repo's Electron runs as plain Node unless started with `env -u ELECTRON_RUN_AS_NODE`;
  Desktop's extension server is not a process you can `ps` by name (it is a "Claude Helper (Plugin) --type=utility"),
  its children are (`ps … | grep -F 'Claude Extensions'`); `mcp-server-nodegx.log` keeps message ids and times, never
  bodies (a 20 s call after the panel's `resources/read` was `open_studio` timing out); the first chat after a
  Desktop restart may get no tools (step 3b). Richard's Desktop is in the test state (S3b step 12).

- 2026-10-27, S3: see the lines under S3. Traps: a script outside the repo (the scratchpad) cannot `import
  'esbuild'`; resolve it with `createRequire(<repo>/package.json)`. Rendering a core-ui component outside webpack hits
  `require.context` in the icon set: stub the button. `findStudio` finds Studio only on our machines (the bug above),
  so a stranger-facing claim about `open_studio` needs the `.mcpb` or `NODEGX_STUDIO` behind it.

- 2026-10-27, S2: see the lines under S2 and `s2/RESULTS.md`. Traps: `render_report` takes no page argument (it
  renders every routed page), and it caught a defect in the first draft of the example (a Text reading an unset
  variable draws "Text": dead-placeholder-text); `drive_page` has no select verb, so a dropdown pick is a `read`
  `expression` through `HTMLSelectElement.prototype`'s value setter plus a `change` event.

- 2026-10-27, S1: see the three lines under S1 and `s1/RESULTS.md`. Traps for the next sessions: a stranger round
  fenced with `Read(//Users/**)` cannot read its own saved long results (P128-S1-FENCEDRESULTS; BKO-006's runner has
  it); in Claude Code `get_project_info` reaches the agent as 2 KB (P128-S1-PREVIEWCUT, open, unowned); the canon
  sits uncommitted no more (committed with S1). noodl-mcp reds at HEAD in a clean worktree, not S1's: sbr009 drive,
  def018 drive, own020CallToolStrip, cmp001InterfaceDoctrine (the corpus moved), fld013ExportReach; red from a peer's
  untracked TPL-011 `templates/nightbook`: tpl011Template, def038SettledTemplates.

- 2026-10-27, scoping: the audit, the canon, the bug rows and this plan written; nothing built yet. S1 and S4 can
  start the same day in their two repos.
