# OWN-021 — The 0.4.2 cut: a release that runs P121's two templates

**Scoped 2026-10-16** (P121 s19), on Richard's word: "add the stuff we need to lane 1 to get 0.4.2 released for this
dude to get his templates". Lane 1, after OWN-013 (the 0.4.0 / 0.4.1 cuts). The runbook is OWN-013's (§3–§4,
UPG-008's shape); this file says what 0.4.2 must carry and how we know it does.

**Status: 🟡 s5 (2026-10-20): S8 ✅ and AC4 ✅ driven on the released 0.4.2 (§12); the marketplace's photos are broken on it (P112-OWN021-NOSHARP, blocker), so the zips wait for 0.4.3 (Richard). s4: 0.4.2 PUBLISHED 08:18:31 UTC, nodegx.io on 0.4.2, feed post live (§11); npm 0.2.3 half out.** Before: 🟡 s2 (2026-10-19): S1–S5 ✅, AC1 ✅; PR #52 green on the six required checks (§9). S6 (the Mac staple) and S7 (merge, tag, Publish) are Richard's.** **s3 (2026-10-19): the npm 0.2.3 cut is packed and tested (§10); Richard publishes it with one command.** P121's product changes are six commits, one per bug
(MEMBERSPHOTO and UPLOADSHRINK share one, as both edit `uploadfile.ts` and its spec), each bug `fixed` with its
commit; the two templates, their generators and specs are `9168a171d`, on Richard's go (R1 re-checked against the
private brief: none of its names in the 452 files). Next: S3, the cut point (§7).

## 1. The person sentence

A builder in West Africa who knows no-code tools downloads NodeGX 0.4.2, opens the marketplace or the community app
from a zip, starts its backend from the Backend Services panel and walks the app's main path, with nothing from
source and no terminal.

## 2. Why 0.4.1 can't

Measured 2026-10-16: none of P121's product changes are committed, so no release carries them (the installed 0.3.0
has none of five markers searched; v0.4.1's tree predates them). On a released NodeGX the templates would most
likely fail where they lean on them (by reading what changed, not driven on 0.4.1):

| change | bug | what breaks without it |
|---|---|---|
| the editor adds a project's `backend/schema.json` at backend start (R12) | P121-TWO007-SCHEMANOWAY | both: no unique indexes, checks or links; R11's one-payment-per-reference never exists |
| members-only uploads (`X-NodeGX-File-Readers`, Upload File **Readers**, `Noodl.Files.sign`, `_Files.readers`) | P121-TWO001-MEMBERSPHOTO | the community app's photos (`sharePost` checks the readers column) |
| the realtime token for a signed-in person | P121-TWO005-LIVEANON | the community app's live counts and feed for every member |
| Upload File **Shrink To** / **Photo quality** (`shrinkphoto.ts`) | P121-TWO008-UPLOADSHRINK (file still says `open`; built s4) | the marketplace's photos go up at camera size |
| the webhook trigger's `hmac-sha512` scheme, its secret pasted in the admin app | P121-TWO008-WEBHOOKSHA512 | Paystack's webhook can't be set; card payments are confirmed only when the buyer returns to the page |
| a refused run says why in Runs | P121-TWO004-RUNWHY | a builder setting up the hook can't see why it was refused |
| one line in the export's Dropdown placeholder | P121-S19-PLACEHOLDERTYPE | the editor's dev build won't start Electron at HEAD (CI's Typecheck would likely be red too) |

Each bug file names its files and specs; P121's [NEXT-SESSION-PROMPT](../phase-121-a-marketplace-and-a-community/NEXT-SESSION-PROMPT.md)
§5 lists every session's pile (s4, s10–s12, s18, s19) file by file.

## 3. Steps

| # | step | owner | state |
|---|---|---|---|
| S1 | **Commit P121's product changes**, by pathspec through a temporary index (peers share the checkout: memory *commit-your-delta-through-a-temporary-index*), one commit per bug where they stand alone (WEBHOOKSHA512; MEMBERSPHOTO; LIVEANON; UPLOADSHRINK; RUNWHY; SCHEMANOWAY; PLACEHOLDERTYPE), each with its specs, catalogue, docs and CHR-007 snapshot. Run each bug's spec before its commit. Move each bug to `fixed` with its commit | agent | ✅ s1 (§7) |
| S2 | **Commit the two templates** (`templates/marketplace/`, `templates/gram/`, untracked) and their generators and specs, so the release tree and the zip agree. Richard's go: they enter the public repo (R1: no names in them, grepped 2026-10-16) | agent + Richard | ✅ s1, `9168a171d` (§7) |
| S3 | **G1, the cut point.** `cline-dev` is 125 commits past `v0.4.1` (2026-10-16), most of them P18's export work: read each live phase's rows for half-done work (OWN-013 §6.1); `git merge-tree --write-tree origin/main <cut>` exit 0; `release/0.4.2` | agent | ✅ s1 (§8): `release/0.4.2` made locally, not pushed |
| S4 | **G2–G3:** CHANGELOG `## 0.4.2`, the release body, the what's-new post (pushed only after Publish). Content-authoring skill. Our words only: no builder's name, no ministry, no app name (R1) | agent | ✅ s1 (§8): CHANGELOG `08cd2e259`; `GITHUB-RELEASE-0.4.2.md`, `whats-new-0.4.2.READY-TO-PUSH.json` drafted |
| S5 | **G4–G6:** the PR `release/0.4.2` → `main`, the six required checks green; `npm run ci:build:editor` on the cut tree; the editor test floor by name | CI + agent | ✅ s2 (§9): PR #52, six required checks green on `a9b9af9ad`; Test (editor) 3017 / 0 at seed 61524 |
| S6 | **The Mac staple.** OWN-013 §12: electron-builder notarises by itself and its staple has no retry; the one-line fix `"notarize": false` under `build.mac` was refused in auto mode ("Security Weaken"). Richard allows it, or the release session re-runs the failed leg as 0.4.0's did | Richard | ⬜ |
| S7 | **Tag, Release run, Publish** (OWN-013 §4) | Richard publishes | ⬜ |
| S8 | **Drive both templates on the released 0.4.2** (not dev, not source): install, open each zip's copy, Backend Services → Built-in → Run one on this computer → Start; R12's line in the log; the marketplace: set up, a seller, a product with a photo (shrunk), checkout on delivery; the community app: join, let in (email set up), a post with a members-only photo seen by a second member, live count. Shots looked at | agent | ✅ s5 (§12); the marketplace's photos broken (NOSHARP) |

## 4. Acceptance criteria

1. Every row of §2 is committed and its bug says `fixed` with the commit.
2. 0.4.2 is published and nodegx.io offers it.
3. S8 is driven on the published build, both apps, and its readings are written here.
4. The zip Richard sends opens in 0.4.2 on the shop's home page and the community app's welcome page (P121-S19-NOHOME),
   and its setup pages (`templates/marketplace/docs/`, `templates/gram/docs/SETTING-UP.md`) are the ones the drive followed.

## 5. Not in 0.4.2 (said so the zip doesn't promise them)

The tutorials and a hosting route (P121 TWO-007, TWO-011); the daily devotional, the Bible and notes, offline (TWO-006,
TWO-010, TWO-005 slice 6); Paystack against real keys (TWO-004 step 4, the builder's own); Flutterwave.

## 6. Also owed by P121 before the zip (not release blockers)

The marketplace's own setup page (setup token, first admin, countries and shelves); the community app opened once in
the editor; the editor badge's 26 warnings on the marketplace read; P121-S19-SIGNINRACE measured.

## 7. s1 (2026-10-19): S1 and S2, committed

Each commit went through a temporary index with a compare-and-swap on HEAD (peers share this checkout), whole files
only, no peer hunk in any of them; the real index was reset to HEAD on the same paths after each.

| commit | bug(s) | specs run first |
|---|---|---|
| `f3c9b1ebb` | WEBHOOKSHA512 | backend webhook-verify, triggers-http, admin-app/schedule |
| `7aabf8535` | RUNWHY | admin-app/runs-view |
| `a9aee6711` | LIVEANON | runtime realtime-transports, cloudstore-files (99 / 99) |
| `11f53e7af` | SCHEMANOWAY (R12) | editor tests-main backend-manager-project-schema (6 / 6), backend p121-r12-project-schema |
| `cb6238523` | PLACEHOLDERTYPE | export the-dropdown-placeholder (9 / 9) |
| `672b8b58c` | MEMBERSPHOTO + UPLOADSHRINK | backend files-http, files-table-upgrade, sbr007-auth-preflight; viewer uploadfile, files-api-sign, shrinkphoto (34 / 34); the node-spec suite (2042 passed, 18 skipped, 0 failed; 83 min at `nice -n 19`) |
| `9168a171d` | S2: both templates, generators, specs, census rows; fixes NOHOME | noodl-mcp two00* (13 suites, 395 / 395); backend two-* (37 suites: 25 passed, 11 skipped, `two-005-feed` red once and 4 / 4 alone, filed P112-OWN021-FEEDFLAKE); project-contract world (36 / 36) |

Typechecks before the first commit, each exit 0: nodegx-export, nodegx-backend-contract, nodegx-node-spec,
noodl-runtime, nodegx-backend (both its configs). The backend specs above: 114 / 114 in one run.

Found on the way:
- `p121-r12-project-schema.test.ts` (in `11f53e7af`) reads `templates/marketplace` and `templates/gram`, so between
  that commit and `9168a171d` a clean checkout would have failed it. Nothing was pushed in between.
- CHR-007's widget snapshot also caught up with Router's `keepPagesWhenUnmounted` (in source since 2026-10-10, never
  regenerated); it is in `672b8b58c`, said in its message.
- `scripts/ontology/census.js` has no `--help`: given one, it regenerates the census (only KINDS.md's date moved;
  put back).
- Not P121's, left alone: `package-lock.json` (an npm reorder and `create-nodegx`'s license), `tpl013Edition*` and
  `templates/star-class/` (P78 TPL-013), `templates/nightbook/` and the `tpl011*` specs (P78 TPL-011).

S3 and S4 followed in the same session (§8).
`git merge-tree --write-tree origin/main <cut>`, `release/0.4.2`.

## 8. s1, continued: S3 and S4

**S3, the cut point.** `git fetch origin main`: `origin/main` = `73f52de91` (Release 0.4.1, #51). `v0.4.1` is not an
ancestor of `cline-dev` (their merge base is `0728e42f4`); `cline-dev` carries its own copies of 0.4.1's fixes
(`2925e3e74`, `76f37308c`, `013648a0b`). `git merge-tree --write-tree origin/main <cut>` → exit 1 with **two conflicts,
both docs**: `CHANGELOG.md` (the npm 0.2.1 section) and OWN-013 (its shipped status, §12–§13). Both resolve to the
cut's side, which holds `main`'s lines and later ones; every other file of the merged tree equals the cut's. So
`release/0.4.2` = the cut with `main` merged in, its tree the cut's (0 files differ), as 0.4.0's was (OWN-013 §6.1).
Made locally with `commit-tree` (no checkout); **not pushed**. Re-measured on the final cut (after S4's version bump): three conflicts, the third the editor's `"version"` line (`main`'s 0.4.1, the cut's 0.4.2); all three resolve to the cut, and the branch's tree equals the cut's.

**What the cut carries** (a subagent's survey of the 205 commits, spot-checked: 6 cited commits are ancestors):
66 touch shipped source (35 of them `nodegx-export`, 14 the bundled MCP); no commit, README or task file in range
says *do not ship* about code the editor ships; no feature flag; the nine spec bumps in `a5bb33d13` all migrate
`none`; nothing rewrites a project on open. Two changes write to the *backend*: R12's collections at start
(`11f53e7af`) and `_Files`'s `readers` column, added in place (`672b8b58c`). No new third-party dependency in any
package the editor bundles; `noodl-editor/package.json`, `build/` and `webpackconfigs/` untouched; no native module
(`shrinkphoto.ts` is the browser's canvas). Held back from the changelog: NSP-019 R38/R40 (the wired-grow warnings
and the settings warnings in Problems, driven by an agent in s105, not yet by Richard).

**Found by the survey, fixed before the cut:** Upload File gained its three inputs at spec version 3. The PR
workflow's golden check (`spec-golden:check --base`) would have failed: P112-OWN021-UPLOADVERSION, fixed `11e908686` (v4,
migration `none`, its golden). Run locally after it, each exit 0: the golden check over all 125 specs against
`origin/main` (9584 scenarios); the node-catalog job's eight checks (`catalog:check`, `:groups:check`, `:examples`,
`:merge:check`, `cloud-library:check`, `export-ledger:check`, `:picker`, `spec-ledger:check`; the tree unchanged);
the typecheck job's seven (`typecheck`, `:editor-tests`, `:backend-tests`, `:nodegx-core`, `:mcp`, `:contract`,
`:editor`). Not run locally: `test:ci` (Test (editor)), `renderer-errors`, the builds; CI runs them on the PR.

**S4.** CHANGELOG `## 0.4.2 · 2026-10-19` and the editor at 0.4.2: `08cd2e259` (re-date on the tag day). Written to
the content-authoring skill; its offline checks (`written`, `closer`, `contract`, `opener`, `figures`) clean after
two rounds. The release body `GITHUB-RELEASE-0.4.2.md` and the post `whats-new-0.4.2.READY-TO-PUSH.json` are drafted
beside 0.4.0's; the post is pushed only after Publish. *Good to know* names P121-TWO001-EXPORTREADERS (open, high):
an exported Upload File sends a members-only photo as a full-size public file.

**Next: S5** — push `release/0.4.2` and open its PR to `main` (Richard's go: it is outward-facing), the six
required checks, the editor floor by name. Then S6 (the Mac staple, Richard's), S7, S8.

## 9. s2: S5, the PR

Richard's go on 2026-10-19. `release/0.4.2` pushed (`b1b701ed3`, its tree the cut's) and **PR #52** opened to `main`.
First CI (run 39214479584): five of the six required checks green; **Lint red on the type-escape ratchet alone**
(ESLint itself is 3,037 under its baseline). Tests only: TSFixme 307 → 312, `any` 1913 → 1997, `src` unchanged
(583 / 603), from 20 test files of P121, P18 and the TPL-007/013 specs. Counted in a clean worktree of the release
branch, equal to CI's table. The auto-mode classifier refused the raise as a CI bypass. Richard chose R19's route
(raise it visibly, owed back down), and it is `a9b9af9ad` on `release/0.4.2`, with a note on the PR.
**Owed: those test markers typed back down on `cline-dev`** (the list is in the commit).

Second CI on `a9b9af9ad`: **all six required checks green**. Test (editor) ran 3017 specs with 0 failures (seed 61524,
read in the job log, not from the badge).

Not required, red on #51 as well: Docs site builds (HLT-013), Lesson bundles (FIX-027), Renderer errors (HLT-010), and
Test (runtime, backend, viewer, mcp, preview). The package job's 13 failing tests: 10 are filed rows (P107-S101-VERBSPECCED,
P18-S104-KITTYPESDRIFT, P78-TPL011-INSTANCEROOT and GAM-014's kit root, P112-OWN019-BACKENDSESSION); 3 were new and are
filed as P112-OWN021-LISTPORTCENSUS (low: the ERG-003 census pins 54 inputs, the catalog has 83).

**Not merged.** Next: S6, the Mac staple (Richard's), then S7: merge #52, tag `v0.4.2`, Release run, Publish. Then S8,
both templates driven on the published build. Lane 2's OWN-012 adds to the next **npm** cut (not this editor release):
`@nodegx/node-spec` with the drawer and its `./draw` export, and `create-nodegx` with the brief that teaches both ways.

## 10. s3 (lane 1, 2026-10-19, Opus 5.5): the npm 0.2.3 cut

The kit on npm was 0.2.2 (published 2026-10-15 18:30 UTC, packed in `own019-s4-pack` at `aab489337`), with node-spec,
project-contract and canvas-look at 0.1.0. Since then `cline-dev` gained NPXPREVIEW (`dffbeee00`: `npx @nodegx/preview
<app>` had stopped with "could not determine executable to run" since 0.2.0), FILESONLY and the brief's fold-back
(`12cfc6cf3`), ESMADAPTER (`3f62e9643`), FORMAT4PIN (`3aba38163`), OWN-012's drawer and its `./draw` export
(`bdbb88602`), the brief's "show it or draw it" (`cebab5481`), SEE-001's honesty number in the MCP, and P121's runtime
and backend fixes. This cut carries all of them.

**Versions (`307bb8b38`).** `@nodegx/mcp`, `@nodegx/preview`, `create-nodegx`, `create-nodegx-vibe` 0.2.2 → **0.2.3**.
`@nodegx/node-spec` 0.1.0 → **0.2.0** (a new public entry, `./draw`). `@nodegx/project-contract` 0.1.0 → **0.2.0**:
what it publishes changed (ESMADAPTER, FORMAT4PIN's `pinAuthoredRunOnChange`, FILESONLY's PASS line, 2,600 lines of
`world/`, `hierarchy`, `port-context`), and its published manifest depends on `^<node-spec version>`, so it must move
with node-spec. `@nodegx/canvas-look` stays **0.1.0**, not re-published: `git diff 6b3910215..HEAD` of its package,
tests aside, is empty. Pins: create-nodegx → `@nodegx/mcp@0.2.3` (`MCP_VERSION`); create-nodegx-vibe →
`create-nodegx@0.2.3`; project-contract → `@nodegx/node-spec ^0.2.0` (written by `build-publish.mjs`). The MCP and the
preview inline node-spec and project-contract, so they pin neither. `publish-npm.sh` now publishes node-spec, then
project-contract, then canvas-look (skipped: no tarball), then the four (`ee408ba9f`). The brief and node-spec's README
name 0.2.0 (`459ccc270`). CHANGELOG "npm packages 0.2.3" (`5c8ae8142`), with a line for 0.2.2, which had none.

**Packed from `5c8ae8142`**, in this worktree, clean (`git status` empty before and after), under HEAVY.lock. The
worktree's `dist` links into primary were removed first (plain `rm`: the MCP's five, the preview's, node-spec's,
canvas-look's, nodegx-backend's, nodegx-core's, nodegx-export's, the runtime's `dist-types`, the editor's
`src/external/viewer`). 🔴 **A worktree pack needs the runtime's declarations built first:** the viewer's tsconfig
resolves `@noodl/runtime`'s types from `packages/noodl-runtime/dist-types` (gitignored; the worktree's was a link), and
without it both production viewer builds (the preview's `pack-runtime.mjs`, the MCP's `build-render-harness.mjs`)
fail with 38 TS errors. `npm run build:types` in `packages/noodl-runtime` first (5 s). Every esbuild bundle's
first-party inputs resolve inside the worktree, read off the module comments: preview 527 + deploy 540, MCP 536,
cloud bundle 337, kit reader 374, backend 429 (each package's copy), node-spec 192–196, draw 6–7; **0 outside**. node-spec,
project-contract and create-nodegx packed twice gave the same shasums both times.

| tarball | shasum (sha1, what `publish-npm.sh` compares with the registry) | bytes | unpacked, files |
|---|---|---|---|
| `nodegx-node-spec-0.2.0.tgz` | `d10615b4f3a735a64f10ce79cd3b570b8020c363` | 6,429,321 | 42.1 MB, 583 (0.1.0: 38.3 MB, 516) |
| `nodegx-project-contract-0.2.0.tgz` | `66b3fa7901536b3ec83adf9ab6aec53cf5a0cba2` | 249,636 | 901 KB, 112 (0.1.0: 738 KB, 96) |
| `nodegx-preview-0.2.3.tgz` | `92489acd733e2b02c24903f874f77638be4d7ae7` | 5,574,432 | 26.1 MB, 25 (0.2.2: 26.0 MB, 25) |
| `nodegx-mcp-0.2.3.tgz` | `d81d45b36ea5faea8c6a994e88eec2770d0d4ee5` | 11,955,208 | 42.8 MB, 130 (0.2.2: 42.6 MB, 130) |
| `create-nodegx-0.2.3.tgz` | `f6456f430211c2df83184d22c0b5969af9fcc33f` | 40,467 | 112 KB, 12 |
| `create-nodegx-vibe-0.2.3.tgz` | `f5783d8d1472e4c31662302b2901bec77ac5ca28` | 13,641 | 38 KB, 4 |

Folder: `/Users/richardosborne/vscode_projects/OpenNoodl-worktrees/npm-0.2.3-tarballs/` (outside the repo).

**Tested from the tarballs, never the source**, each in an empty folder under `/private/tmp/claude-501/` (no
`node_modules` above it), `HOME` an empty folder, npm's cache inside it. Expected results written first.

1. `npx --package=<create-nodegx tgz> create-nodegx my-apps` → exit 0; `.mcp.json` (`npx -y @nodegx/mcp@0.2.3
   --allow-writes`), `CLAUDE.md`, `AGENTS.md`, `opencode.json`, `.vibe/config.toml` and the editor skill, whose drawer
   line reads "0.2.0 and later" and which has "The screen: show it or draw it".
2. The server as `.mcp.json` says (the MCP tarball standing in for `@nodegx/mcp@0.2.3`): connected in 5.2 s, answers
   `noodl-mcp 0.4.2`, the **seven** bootstrap tools (`list_examples`, `get_example`, `list_projects`, `find_tools`,
   `call_tool`, `create_project`, `open_project`); `list_projects` empty; `create_project` "Reading List" (Home and
   Book agreed) → **78 files**, its own `.mcp.json` pinned to `@nodegx/mcp@0.2.3 <project> --allow-writes`.
3. Day two, a new server in `my-apps`: `list_projects` names Reading List.
4. The project's own server: 21 tools; `validate_project` **0 errors, 0 warnings**; `get_project_info` carries the
   honesty number (`100% known (2 known, 0 script, 1 unspecced)`) and its `about` sentence.
5. `npx --package=<vibe tgz> --package=<create-nodegx tgz> create-nodegx-vibe my-vibe` → exit 0, `.vibe/config.toml`
   pins `@nodegx/mcp@0.2.3`.
6. **NPXPREVIEW.** `npx -y file:<preview tgz> <app> --port 48731 --no-watch` (npx picks the bin named after the
   package, which is what `npx @nodegx/preview <app>` does): up in 4.0 s, "163 node types, rendered in 11ms"; a headless
   Chrome (390 × 844) drew "Reading List — nothing built yet. Review the plan in docs/ and start when you are ready.",
   **0 page errors**; `GET /.mcp.json` 404. **Control:** `npx -y @nodegx/preview@0.2.2 <app>` from the registry →
   exit 1, "npm error could not determine executable to run". Chrome and the preview torn down; port free after.
7. **The kit.** `npm install <node-spec tgz> <project-contract tgz> @nodegx/canvas-look@0.1.0` → 11 packages,
   `npm ls`: one node-spec, 0.2.0, project-contract's deduped onto it. `require('@nodegx/node-spec/draw')` → `draw`,
   `canvasTextMeasurer`, `traceValue`, `createDrawer`, `DRAW_SPECS` and five more; `draw()` of the made project's `/App`
   (Router → start page Home → Page → Text) → 3 boxes, the Text present and 390 × 20 with a test measurer, `needs` on
   every box, `drawing.needs` naming Body Scroll and the wire values. The ESM `import { draw, canvasTextMeasurer,
   traceValue } from '@nodegx/node-spec/draw'` loads too.
8. **ESMADAPTER and FILESONLY.** The kit's editor suite with an ES-module adapter (`.mjs`, the reference store) on the
   `reading-list` fixture: Node 22.22 and **Node 22.11** both `PASS … ; files only: the adapter offers no graph
   runner`, exit 0. **Control**, the registry's project-contract 0.1.0: Node 22.22 a bare `PASS` (no "files only");
   Node 22.11 "require() of ES Module … not supported".
9. `scripts/own/stranger-kit.mjs` on node-spec 0.2.0 + project-contract 0.2.0 + canvas-look 0.1.0: 16 CommonJS and 2 ESM
   entries load, 0 failures; the consumer typechecks under `node`, `bundler` and `node16`.

**Gates.** `node scripts/own/publishable.js`: 6 packages, 0 problems, exit 0 (and `packages/create-nodegx/vibe`: 1, 0).
`node scripts/bugs.js gate`: **0 blockers** on every kit value; known issues mcp 2, preview 5, node-spec 25,
project-contract 8, editor-suite 2, canvas-look 1 (P112-S16-CONTRACTREADME, medium, is still true of project-contract
0.2.0's README). `create.test.js` 26 / 26 with the vibe wrapper resolving this checkout's core (in a worktree,
`node_modules/create-nodegx` resolves into primary, which says 0.2.2: 25 / 26 there; on `cline-dev` after the merge it
reads its own). Ratchet: holding the line. **Not run:** `render_report` from the tarball (needs a Chrome under the
lock; the harness's sources, `scripts/devtools/{measure,render}-from-disk.js`, `drive-steps.js` and
`@nodegx/render-measure`, have no commit since `aab489337`; the MCP's report gained the honesty section), a backend from the tarball,
`test:main` / `test:ci` (no editor code changed).

**The command Richard runs**, after `cline-dev` with `5c8ae8142` in it is pushed (R12: the GPL bundles must point at
public source), in his own terminal (npm asks for his one-time password once per package, six times):

```
scripts/own/publish-npm.sh /Users/richardosborne/vscode_projects/OpenNoodl-worktrees/npm-0.2.3-tarballs
```

It publishes node-spec, project-contract, preview, mcp, create-nodegx, create-nodegx-vibe in that order, skips
canvas-look (no tarball) and anything already up, and waits for each to be live with the tested shasum before the next.
Then: `npm view create-nodegx@0.2.3 dist.shasum` etc. against the table; nodegx.io's changelog follows a nodegx-web
deploy; change the CHANGELOG's date if the publish lands on another day.

## 11. s4 (2026-10-20, Opus 5.5, session opennoodl-8a): S6–S7, shipped

- **S7.** On Richard's go ("You have my permission to PR without review"), PR #52 merged as a merge commit
  (`250a36804`, its tree equal to the tested `a9b9af9ad`); `v0.4.2` tagged on it (annotated) and pushed. Release run
  `39388115343`: all four platforms, *merge mac update feed* and *verify draft release is complete* green; **the Intel
  staple did not fail this time**, so S6 needed nothing. The draft: 16 assets, `latest-mac.yml` version 0.4.2 with
  both arches. The arm64 DMG: `codesign --verify --deep --strict` ok, stapler validates, Gatekeeper "accepted,
  Notarized Developer ID", `CFBundleShortVersionString` 0.4.2; launched in an isolated profile, the launcher drew 432
  elements and `require('fast-xml-parser')` loaded; torn down by its own pid. The draft's body was empty: set from
  `GITHUB-RELEASE-0.4.2.md`. **Published as Latest 2026-10-20T08:18:31Z.**
- **The feed post** pushed (nodegx-content `8d51aa03d`, `date_modified` = the publish moment), written with plain
  `<p>` leads and no `<strong>` / `<em>`, so 0.4.0 and older installs (NEWSWHITE, fixed only from 0.4.1) can read it.
  0.4.1 had never had a post; the feed's one item was 0.4.0's.
- **CHANGELOG** 0.4.2 and npm 0.2.3 dated 2026-10-20 (`1262e5e73`).
- **nodegx.io** deployed (nodegx-web `9ee1fbf`): homepage eyebrow, button, release block (date, a new note through the
  offline copy checks, the six downloads, all 206 on a range request), changelog `#v0-4-2`. Neighbours 200 before and after.
  **npm 0.2.3 is held off the site's changelog**: at 08:50 UTC only node-spec 0.2.0 and project-contract 0.2.0 were on the
  registry (shasums equal §10's); preview, mcp, create-nodegx and create-nodegx-vibe were not. When they are, re-run
  `ops/deploy.sh 49.12.102.195` with no `NODEGX_CHANGELOG` (it reads this repo's CHANGELOG, which has the section) and commit.
- **Left:** the four npm packages (Richard's terminal), the site's npm section after them, S8 (both templates driven on
  the released build), AC4.

## 12. s5 (2026-10-20, Opus 5.5, session opennoodl-8a): S8 driven on the released 0.4.2

**Verdict: S8 ✅ driven, both apps, on the published arm64 DMG. AC4 ✅ (both open on their home page). AC3 ✅ for the
community app; the marketplace's path works end to end but every product photo shows broken
(P112-OWN021-NOSHARP, blocker). Richard's ruling, the same day: fix it product-side in 0.4.3 and hold the zips until
then.** No zip has been sent or kept: the ones made from `v0.4.2` were for the drive only.

**Set-up.** The release asset `NodeGX-0.4.2-mac-arm64.dmg` (171,725,191 bytes) curled from the GitHub release, its
`.app` copied into the scratchpad: `CFBundleShortVersionString` 0.4.2, `codesign --verify --deep --strict` ok. Launched
with `--user-data-dir=<scratch>/profile --use-mock-keychain -ApplePersistenceIgnoreState YES`, `NOODLPORT=8674`,
`NOODL_REMOTE_DEBUG_PORT=9333`, `ELECTRON_RUN_AS_NODE` unset; profile seeded with `firstRunLegal.json` and
`recently_opened_project.json`. Richard's `/Applications/NodeGX.app` (0.3.0) was not touched; Connect was never
pressed. Zips: `git archive --format=zip --prefix=marketplace/ v0.4.2:templates/marketplace` (313 entries) and
`--prefix=community-app/ v0.4.2:templates/gram` (201). R1: every capitalised word, address and number in the private
brief grepped against both unzipped trees; the hits are ordinary words, product names, countries and "Richard"
(two ruling attributions in `docs/WORLD.md`). The app's users were three headless Chromes on the editor's preview
(desktop, 390 × 844, 820 × 1180, each its own profile, `--use-mock-keychain`); mail went to a 60-line local SMTP
catcher under the Email page's **Other**. The admin app was opened at `/_admin#token=…`, the address the editor's
button opens, in that Chrome (the button calls `shell.openExternal`, Richard's own browser), with the token of the
two backends this drive made, read on Richard's go. Everything torn down by its own pid; both backends deleted through
`backend:delete`; `~/.noodl/backends` the same 29 folders before and after.

| | marketplace | community app |
|---|---|---|
| AC4: opens on | the shop's Home ("Showing Home") ✅ | Welcome ✅ |
| on open | "This project was updated for NodeGX 0.4", a `….before-0.4` copy beside it (designed, P100 R10) | the same |
| backend start (R12) | `Project collections …: 21 added, 0 already there`; 20 functions pushed; reopened later: `0 added, 21 already there` | `13 added, 0 already there`; 15 functions pushed |
| set up | Secrets `MARKETPLACE_SETUP_TOKEN`; Sign in → Set up this marketplace → "Market Square"; lands on Sign in, then the admin on Sellers ✅ | Secrets `GRAM_SETUP_TOKEN`; Email → Other (SMTP) → "Test email sent."; Sign-in → magic links on, the preview's address listed, "Sign-in policy saved."; Set up the community → Waiting for you ✅ |
| main path | Ways to pay: Ghana · GHS, pay on delivery on; Rates GHS 1; a shelf; a seller with a login; the seller (tablet) adds a product with a 4000 × 3000, 955 KB photo → stored **1600 × 1200, 116,701 bytes** ✅; a buyer (phone) adds it to the basket, checks out paid on delivery → MK-2026-00001; the seller confirms (delivery GH₵30), Packed, Sent, Delivered and paid; the buyer's page reads Delivered, "Paid: GH₵880" ✅ | Ann (phone) asks to join; the admin lets her in (mail 002: "An admin has let you in to …"); she signs in by the emailed link (the backend's "Sign in to <backend>" page) ✅; a post with a photo, stored 1600 × 1200; the bare file URL **403**, the signed one 200 ✅; Bob (tablet) joins, is let in, signs in, sees the photo ✅; Bob hearts it and Ann's feed reads "1 heart · Bob" **within 1 s with no reload** (a marker on her page survived) ✅ |
| photos | 🔴 **every one broken**: `?thumb=md` → 501 "Image transforms are unavailable on this backend … Cannot find module 'sharp' … Resources/nodegx-backend/cli.js"; the bare file 200 | shown through `Noodl.Files.sign`, no transform: fine |

**Shots looked at** (scratchpad `shots/`, 43): the launcher, both editors on open, the backend card, the admin app's
first run, Email, the welcome on a phone, both feeds (phone, tablet), the live heart, the shop's card with its broken
photo, the product form, the order page delivered. 

**Found and filed** (one file each in `dev-docs/bugs/`):

- **P112-OWN021-NOSHARP** (blocker): above. Every earlier P121 drive ran a backend from source or jest, where
  `node_modules/sharp` exists, so none could see it. Product-side fix in 0.4.3, its gate on the packaged artefact.
- **P112-OWN021-PUSHTOALL** (high): with the marketplace's backend running, opening the community app pushed the
  community app's functions into the marketplace's backend on its first save (`CloudFunctionDeployer.pushToAllRunning`
  pushes to every running local backend). It failed only because both have a `whoAmI`: "Duplicate component name
  /#__cloud__/whoAmI". Both setup pages now say to run one app's backend at a time.
- **P112-OWN021-SAMEEMAIL** (medium): the admin app's first run asks the builder to create an admin account; setting
  up either template with that same email is refused ("This marketplace could not be set up with that." / "This
  community couldn't be set up with that."), a different email is set up at once. Both setup pages now say so.
- **P112-OWN021-GRAMWORDMARK** (medium): the community app's bar says "gram" on every page, not the community's name.
- **P112-OWN021-WELCOMEDEVOTIONAL** (low): the Welcome page promises a devotional the app doesn't have (§5).
- **P112-OWN021-EMAILNOTE** (low): "…before this can send mail.. Sends fail loudly…", on the page it tells you to open.
- **P112-OWN021-ADDKEEPS** (low): adding a country or a shelf leaves its words in the field.

**§6's other owed items.**
- The marketplace's setup page: written, `templates/marketplace/docs/SETTING-UP.md` (hand-written, survives
  regeneration), from what this drive needed: start the backend, the admin app and its first-run account, the setup
  token's secret name, the order countries → rates → shelves → sellers, what sellers and buyers do. The community
  app's `SETTING-UP.md` gained a "Before you start" section, the Email page's fields (Base URL is the backend's
  address), the preview's address for Where your app lives, Save policy, the bar's word, "0.4.2 or later" for photos.
  Both through the content-authoring skill's offline checks (`written`, `closer`, `contract`, `opener`, `figures`):
  what's left flagged is imperatives opening "On…"/"In…", section numbers, and one pre-existing ", but" line in the
  gram's §8.
- The editor badge's 26 warnings: **there is no warnings badge on 0.4.2.** No element in the editor carries a warning
  count; the 26 s19 saw came from the dev build (NSP-019's Problems work, held back from 0.4.2's changelog). Not news
  for the builder.
- P121-S19-SIGNINRACE, measured: 20 sign-ins over the other person's session on a tablet, all routed right; once the
  bar read ADMIN for 3 s on the staff's page. Written into the bug.

**What the email to the builder will need to say** (for when the zips go, after 0.4.3): install NodeGX 0.4.3 or later;
a mail service for the community app (any SMTP provider the Email page lists: Gmail, Resend, Postmark, Amazon SES,
Mailgun, Brevo, or Other); a Paystack business and its secret key per country for cards (`PAYING-BY-CARD.md`); and
that putting either app on the internet isn't covered yet (TWO-011).

**Not driven:** the marketplace's enquiry, card payment (stand-in only, §5), the admin's other tabs beyond setup;
the community app's comments, prayer, profiles, moderation, events (all driven from source in P121 s12–s16); Windows,
Linux and Intel Mac builds.
