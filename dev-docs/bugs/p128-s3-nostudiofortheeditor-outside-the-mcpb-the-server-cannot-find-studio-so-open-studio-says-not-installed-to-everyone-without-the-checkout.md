---
id: P128-S3-NOSTUDIOFORTHEEDITOR
title: "Outside the `.mcpb`, the server cannot find Studio: `findStudio` looks only at `$NODEGX_STUDIO` and `~/vscode_projects/nodegx-studio`, and neither the npm route (`create-nodegx`, every agent it sets up) nor the editor's Connect Claude Code sets the variable, so `open_studio` says \"NodeGX Studio is not installed\" to everyone who does not have our checkout"
status: open
severity: high
area: "`packages/noodl-mcp/src/studio/studioProcess.ts` `findStudio` (the two candidates); `packages/create-nodegx/bin/create-nodegx.js` `serverEntry` (`npx -y @nodegx/mcp@<v> --allow-writes`, no env) for Claude Code, Cline, Mistral Vibe and OpenCode; the editor's registration (`packages/noodl-editor/src/editor/src/pages/ProjectsPage/useConnectAgent.ts` → `connectBootstrapServer`); `@nodegx/studio` is not on npm (nodegx-studio `package.json` is `private: true`)"
found: P128 S3 (CPY-003), 2026-10-27, checking the claim in the editor's new welcome line before keeping it; widened the same day when Richard asked what a fresh Claude Desktop install takes
evidence: "MEASURED by reading: `findStudio` candidates are `[process.env.NODEGX_STUDIO, path.join(os.homedir(), 'vscode_projects', 'nodegx-studio')]` (studioProcess.ts:35-37); `@nodegx/mcp` 0.2.7 has no dependencies; `npm view @nodegx/studio` is a 404; create-nodegx.js:365-368 registers `npx -y @nodegx/mcp@0.2.7 --allow-writes` with no env; `grep -rln NODEGX_STUDIO` finds it set only by nodegx-studio's `scripts/mcpb.mjs` and `app/main.cjs`. MEASURED the other side: the unpacked `nodegx-0.2.7.mcpb` under an empty HOME and PATH `/usr/bin:/bin` serves its bundled Studio (`open_studio` 200, 526,365 chars), so the `.mcpb` is the one install that works for a stranger today. Not driven: the npm route on a machine without the checkout."
launch: beta
regression: packages/noodl-mcp/tests/p128NoStudioForTheEditor.test.ts (the app); packages/noodl-mcp/tests/p128StudioFromNpm.test.ts (the npm package)
owner: "the app half built by Beta sweep s19 (0b98c2f84); the find half by the P128 Beta round Track B (e0801764e); the package by Track A (nodegx-studio fcdd55e, not published); the install that puts both together: nobody yet"
task: CCN-006 AC7
---

The canon's "Which AI coder" says *"Claude Code and Cline open Studio in a browser window beside the chat."* That is
true only where Studio is on disk at a path the server knows:

- **Claude Desktop with the `.mcpb`**: true. The bundle carries Studio and sets `NODEGX_STUDIO`.
- **Studio's own desktop app**: true for the server it starts.
- **`npm create nodegx`** (Claude Code, Cline, Mistral Vibe, OpenCode) and the editor's **Connect Claude Code**: false.
  The server comes from npm alone, `open_studio` answers "not installed (set NODEGX_STUDIO to its folder)", a sentence
  a person cannot act on. Only our machines, with the checkout at `~/vscode_projects/nodegx-studio`, get Studio, which
  is why every Studio window seen from Claude Code so far opened.

Two places say the false line today: the canon (its "Waits on" now lists it, P128 S3) and the editor's launcher card
(S3, canon phrases held by `scripts/canon-check.mjs`). The card's line is what the product should do, so it stays;
this row makes it true before the editor or the npm route is cut as Beta.

**Proposed.** CCN-006 AC7: publish `@nodegx/studio` (editor/, lib/, import/, vendor/, as the `.mcpb` stages it) and
have `@nodegx/mcp` resolve it with `require.resolve` first, either as a dependency or fetched with `npx` on the first
`open_studio`; `findStudio` also takes the installed Studio desktop app's resources (the companion's
`findStudioApp` finds the app). The not-installed sentence names nodegx.io/start, never an environment variable.

**Built s19 (launch plan L7), the second half of Proposed only.** `findStudio`'s third candidate is the installed desktop app (`findStudioApp`, where
its installers put it), whose `Contents/Resources/app` (macOS) or `resources/app` holds Studio's `editor/` unpacked
(`asar: false`). Measured first: the packaged build's `editor/serve.mjs` runs on plain Node 22 and serves the page.
The not-installed sentence is `STUDIO_NOT_INSTALLED`, naming `STUDIO_DOWNLOAD_URL` instead of an environment
variable, in `findStudio` and `open_studio`'s holding page. The npm-package candidate waits on `@nodegx/studio`.
- `tests/p128NoStudioForTheEditor.test.ts` 4/4, its drive starting the s18 packaged Mac build's Studio from the app on
  a todo copy (GET / 200); HEAD's finder: 3 red. Neighbours (companion, mini editor, Puppy bursts) 41/41; tsc clean
  but for P128's own `p128OptionSet.test.ts` (red at HEAD, filed P128-S2-OPTSETTSC).
- Reaches a stranger with the next `@nodegx/mcp` (and the editor's bundled copy of it), and once the download exists
  (P125-CCN006-NODOWNLOAD, Richard's three steps). Not driven through the editor's Connect.
- **Still open, so the row stays open:** the first half (publish `@nodegx/studio`, `require.resolve` it first). Until
  then a person on the npm route or the editor's Connect gets Studio only by installing the desktop app, and is told
  where. The widened title (the npm route, severity high) arrived from P125/P128 (215801ab5) while this was built.
  The sentence names `STUDIO_DOWNLOAD_URL` (`/studio/#download`, set by s18), not `/start`, so it lands on the download.

## 2026-10-27 night, P128 Beta round Track B: the server finds the npm package (e0801764e); the npm route still does not install it

**Built.** `findStudio`'s fourth candidate (after `NODEGX_STUDIO`, the checkout and the app, as `studioProcess.ts`
planned it): `require.resolve('@nodegx/studio/package.json')` from the server's own module, so a `@nodegx/studio`
installed beside `@nodegx/mcp` is found; a package whose `exports` leaves out `./package.json` (Node refuses that id
with ERR_PACKAGE_PATH_NOT_EXPORTED, measured) is found from its entry. Spec `tests/p128StudioFromNpm.test.ts` builds a
stub package in a temp dir (nothing outside the repo): 5/5, with `p128NoStudioForTheEditor` and `p128OptionSet` 23/23.

**Measured on Track A's real tarball** (`OpenNoodl-worktrees/nodegx-studio-pack/nodegx-studio-0.1.0.tgz`, 2,108,434
bytes, sha1 4eada0d0…, nodegx-studio fcdd55e): `npm install` of it into an empty folder adds 35 packages, among them
`@nodegx/mcp` **0.2.8** (Studio's own dependency). With an empty HOME and `NODEGX_STUDIO_APP=none`, on a
`templates/todo-list` copy: that install's own 0.2.8 server answers `open_studio` "NodeGX Studio is not installed on
this machine" with Studio beside it; the same install with HEAD's dist in `node_modules/@nodegx/mcp` starts the
package's Studio, GET / **200**.

**Still open, so the row stays open.** (1) `@nodegx/studio` is not published (Richard's line, from Track A). (2) The
next `@nodegx/mcp` must carry e0801764e (0.2.9 does not), and Studio's pin on `@nodegx/mcp` (0.2.8) moves to it.
(3) **Nothing installs the two together on the npm route:** create-nodegx registers `npx -y @nodegx/mcp@<v>
--allow-writes` (`serverEntry`), which never fetches `@nodegx/studio`, so a stranger from `npm create nodegx` is still
told "not installed". The choices: create-nodegx registers `npx -y -p @nodegx/studio@<v> -p @nodegx/mcp@<v>
noodl-mcp --allow-writes`, or `@nodegx/mcp` lists `@nodegx/studio` as a dependency (a cycle: Studio depends on
`@nodegx/mcp`; and 35 packages for every install). Unowned; the release session that publishes both decides it.


## 2026-10-30: item (1) is done; (2) and (3) stand

`npm view @nodegx/studio`: **0.1.0 is published** (2026-10-27 21:59 UTC, bin `nodegx-studio`), depending on
`@nodegx/mcp` 0.2.8, `@nodegx/preview` 0.2.8, `@nodegx/backend-map` 0.1.4. Still open: (2) the newest `@nodegx/mcp` is
0.2.9, which predates e0801764e (the finder's `require.resolve` candidate, in HEAD), so no published server finds an
installed `@nodegx/studio`; (3) create-nodegx (0.2.8 on npm) still registers `npx -y @nodegx/mcp@<v>` alone. Both are
the next release's: publish `@nodegx/mcp` from HEAD, move Studio's pin to it (which also unblocks the `.mcpb` CI leg,
P128-S3B-MCPBNORELEASE), publish `@nodegx/studio` 0.1.1, then choose (3)'s registration.

## 2026-11-01, overnight high-bug run: item (3) is a one-line release flip, off today

**Built.** `packages/create-nodegx/bin/create-nodegx.js` has `const STUDIO_VERSION = null;` (with `STUDIO_PACKAGE`
`@nodegx/studio` and `MCP_BIN` `noodl-mcp`, `@nodegx/mcp`'s only bin). `serverArgs()` is the one source of what
follows `npx`, for `.mcp.json` (Claude Code), `opencode.json`, `.vibe/config.toml` (plain and `--vibe` kit), Cline's
entry and the "Another AI coder" line: `null` gives `-y @nodegx/mcp@<MCP_VERSION> --allow-writes` (today's); a
version gives `-y -p @nodegx/studio@<STUDIO_VERSION> -p @nodegx/mcp@<MCP_VERSION> noodl-mcp --allow-writes`, each
agent's own flags after it, `cmd /c` first on Windows. With `null`, a plain, `--vibe` and `--cline` run against HEAD's
file and this one write byte-identical files (22) and output (the folder path aside).
- Spec: `test/create.test.js` three `P128-S3-NOSTUDIOFORTHEEDITOR` tests grade both arms through a copy of the file
  with only that line changed (and assert there is exactly one such line), across all six registrations. Red first:
  against HEAD 0/3; against HEAD plus the bare constant, the set arm red on the argv (`'-p', '@nodegx/studio@9.8.7'`
  missing from Claude Code's). File 36/38; the 2 reds are older and not this row's (`MCP_VERSION` 0.2.8 vs the
  checkout's 0.2.9; `build_app` read into the bootstrap list by the Vibe-permissions test's regex).
- `STUDIO_NOT_INSTALLED` already says what to do: "Get it from https://nodegx.io/studio/#download and ask again", no
  environment variable; that page serves the `.dmg`/`.exe` links (curl, 2026-11-01). Words unchanged.

**Measured (2026-11-01, published packages, empty HOME, own npm cache):** `npx -y -p @nodegx/studio@0.1.0 -p
@nodegx/mcp@0.2.9 noodl-mcp --version` → `0.2.9`, exit 0: one `_npx` folder, `.bin/noodl-mcp` is the top-level
server's, Studio's own `@nodegx/mcp` 0.2.8 nests under `@nodegx/studio/node_modules`, and
`require.resolve('@nodegx/studio/package.json', { paths: [<that folder>/node_modules/@nodegx/mcp/dist] })` finds
Studio with `editor/serve.mjs`. Cold: 8.2 s and 174 MB with Studio, 2.0 s and 43 MB for the server alone. Not
measured: `open_studio` through that folder (0.2.9 has no package candidate), Windows.

**Editor's Connect Claude Code: not built, and not small.** It registers Electron-as-node on the editor's own copy of
the server (`resources/noodl-mcp/noodl-mcp.cjs`, built from the checkout, so it carries e0801764e from its next build),
and main refuses any other command, any argument but `--allow-writes`, and any env key but two
(`mcpFrontDoor.js` `rejectUntrustedRegistration`). Its audience has no Node, so `npx` is out. `require.resolve` from
`resources/noodl-mcp/` finds no `@nodegx/studio`. What it finds today is the installed desktop app (s19's candidate),
and the sentence says where to get that. Shipping Studio inside the editor would mean `extraResources` for Studio and
its dependencies plus a candidate beside the bundle (or `NODEGX_STUDIO`, whitelisted and set by main like the profile
path): a packaging change for the release, not a gated one-liner.

### Release flip (for the session that publishes)

1. Publish an `@nodegx/mcp` from a HEAD that contains e0801764e (0.2.9 does not), and set `MCP_VERSION` to it (the
   file's first test already holds it equal to `packages/noodl-mcp/package.json`).
2. Set `STUDIO_VERSION` in `packages/create-nodegx/bin/create-nodegx.js` to a published, exact `@nodegx/studio`
   (0.1.0 is on npm since 2026-10-27; a 0.1.1 pinned to the new server is cleaner, as the 2026-10-30 section says).
   Nothing else changes; the spec's set arm already grades every agent's registration.
3. Before publishing create-nodegx, measure with the real versions under an empty HOME and an empty npm cache:
   `npx -y -p @nodegx/studio@X -p @nodegx/mcp@Y noodl-mcp --version` prints Y; then a registration from a fresh
   `npm create nodegx` folder, `NODEGX_STUDIO_APP=none`, on a todo copy: `open_studio` serves Studio (GET / 200), not
   "not installed". Then the npm route can be ticked.
4. Update the two READMEs that print the old line (`packages/create-nodegx/README.md:31`,
   `packages/create-nodegx/cline/README.md:34`).
5. Cline: the kit moves its own earlier entry to the new one on a re-run (`updated`); `.mcp.json`, `opencode.json` and
   `.vibe/config.toml` are written only when absent, so an existing folder keeps the server alone until the person
   edits it or deletes the file. Say so in the changelog.
