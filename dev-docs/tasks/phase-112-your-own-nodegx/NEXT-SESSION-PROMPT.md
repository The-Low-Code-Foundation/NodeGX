# Phase 112 — next session

**Written 2026-10-11 at the end of session 12** (Opus 5.5). Session 12 started OWN-013, the 0.4.0 cut, by UPG-008's
runbook. G1 (the cut point) is measured and G2 (the changelog) is written and approved. Richard ruled R17: 0.4.0
copies a 0.3.0 project to `<project>.before-0.4` before its format moves to 5 (`8f9137d8e`). **Continued 2026-10-12:**
the drive in the dev editor found the copy made twice per open, and measured OPENWRITES' cause; both fixed and driven
(`1ed87f2ef`, OWN-013 §7). IDREPLACE is driven too. Nothing was pushed, branched or tagged. Earlier handoffs are in this file's git history.

## ▶ Lane 1 now (2026-10-14, Opus, after s18): SHIPPED — 0.4.1 and npm 0.2.1 are live; next, the language-app stranger round

**Shipped 2026-10-14.** Richard gave the go. PR #51 merged (`73f52de91`), `v0.4.1` tagged on `main`, the Release run
green on all four platforms, the draft checked (Mac arm64 zip sha512 = `latest-mac.yml`, notarised, stapled, version
0.4.1; the merged feed lists both Mac arches; 16 assets) and published as Latest at 18:13 UTC. Richard published npm
0.2.1 himself; all three registry shasums equal the tested tarballs'. From the registry: `stranger-render.mjs
@nodegx/mcp@0.2.1` DONE clean; `npm create nodegx@latest` pins 0.2.1. nodegx.io deployed (nodegx-web `a0b52be`): the
homepage offers the 0.4.1 downloads (it had linked v0.4.0's files), and the changelog shows 0.4.1 and npm 0.2.1.
**OWN-011 AC2 ✅** on the released 0.4.1 (OWN-011 §12): 0 files written on either open. Windows and Linux were
not installed on clean machines, as for 0.4.0.

**Next, lane 1:** (1) **the language app built by a stranger from the registry** (OWN-015's sentence, Claude Code,
an empty folder): does the agent find `fn-play-audio-a-cloud-function-returns`, and is the static gone? That is
WAVTWICE's unproved half, and the tutorial depends on it. (2) OWN-014 AC4 with that app. (3) P112-S18-HLT010CI (CI's
renderer gate, red on any tree since ~12:00 UTC). Richard's remaining waits: G8's in-place update click on his own
0.3.0 (now to 0.4.1), the 0.4.0 feed post's `<strong>` leads (NEWSWHITE for 0.4.0 installs), `build.mac.notarize`.

### The release as it was handed over (s18, before Richard's go)

Richard wants tutorial videos (the language app with text-to-speech, no editor) and the subscriber email about 0.4.0
and the npm kit as soon as possible. So s18 cut both releases.

**Editor 0.4.1, a hotfix from `v0.4.0`:** branch `release/0.4.1` = `v0.4.0` + `2925e3e74` (UPDATEBEHIND, NEWSWHITE) +
`76f37308c` (PAGEPORTS), cherry-picked clean, + `afb370d8d` (version, CHANGELOG). **PR #51** into `main`: all six
required checks green. Four optional checks are red: three were red on PR #50 too, and **HLT-010** is red on every tree
since about 12:00 UTC, the unchanged v0.4.0 included (P112-S18-HLT010CI, filed). 🔴 **`gh pr merge` was refused by the
auto-mode classifier ("merge without review")**, so these steps are Richard's:
1. Merge PR #51 on GitHub with a **merge commit** (not squash).
2. `git fetch origin main && git tag v0.4.1 origin/main && git push origin v0.4.1`. Then watch Actions → Release
   (four legs). The draft must hold every asset.
3. RELEASE-PROCESS §4 checks on the draft, then *Publish release*. 0.4.0 users see the update on the projects list (the
   changelog's *Good to know* says so). Inside a project, 0.4.0's own update window is the hidden one.
4. After publishing: re-drive OWN-011 AC2 on 0.4.1 by §10/§11's method to close AC2; deploy nodegx-web for the
   changelog (step 10). `cline-dev` already says 0.4.1 (`c2eab03bf`) and carries the same changelog entry (`e88ebeeec`).

**npm 0.2.1** (`@nodegx/mcp`, `@nodegx/preview`, `create-nodegx`), packed in a clean worktree at the pushed `e88ebeeec`
(every dependency's `dist` rebuilt there, not linked). It carries s18's WAVTWICE example (`135244dc0`), the starter set +
FRESHFONT (`00e569472`), NOLIBRARY (`23ea136b9`), TWOLOADERS (`9e40fc5ab`) and CLOUDCALLNAME (`2aceb7ec2`), plus lane 5's
s5 commits up to `7f6bee6d9` (BACKENDSESSION, LAPTOPGAPS, TAPHOLD, WATCHONE, DESCRIBEINSIDE, NOTELOOP). Lane 5
(opennoodl-54) was asked whether any of it should not ship and had not answered by the pack. Tarballs in
`~/vscode_projects/OpenNoodl-worktrees/tgz021/`:

| tarball | shasum | checked |
|---|---|---|
| `nodegx-preview-0.2.1.tgz` | `1aa40877e7e3…` | 973 + 985 bundle inputs, 0 outside the worktree; installed in an empty folder: `/` 200, a planted `.env` and `.mcp.json` 404, rendered in 9 ms |
| `nodegx-mcp-0.2.1.tgz` | `8647ecf820cb…` | MCP 602 / kit-extract 486 / cloud 702 inputs, 0 first-party outside; `dist/starter-assets` present; `stranger-render.mjs <tgz>`: `create_project` (62 starter files) → `render_report` DONE clean |
| `create-nodegx-0.2.1.tgz` | `7b93676cbea4…` | empty folder, `HOME` empty: `.mcp.json` pins `@nodegx/mcp@0.2.1`, the skill, CLAUDE.md, AGENTS.md, `.vibe/`, `opencode.json`; its tests 24 / 24 |

Gates: `publishable.js` 6 packages / 0 problems; `bugs.js gate` 0 blockers (mcp, preview, project-contract, node-spec,
canvas-look). **Richard runs** `scripts/own/publish-npm.sh ~/vscode_projects/OpenNoodl-worktrees/tgz021` in his own
terminal (2FA). It publishes the MCP before `create-nodegx` and waits for each one to go live. Then:
`node scripts/own/stranger-render.mjs @nodegx/mcp@0.2.1` from the registry.

**Before the tutorial is recorded:** one stranger round of the language app from the registry (OWN-015's sentence) to
see whether the agent finds the speaking example and the static is gone. That is WAVTWICE's unproved half.

**Known and open for the video:** P112-S14-KITROOTDEPLOY (a kit-rooted component: the preview and `nodegx deploy`
refuse it; GAM-014's preview spec is 5 / 5 red on HEAD too; `validate_project` now says so). The example plays audio
with a Function, so the language app needs no kit node.

**Done s18, first half** (`76f37308c` code): **PAGEPORTS found and fixed** (OWN-011 §11). Nothing in `projectSaveTriggers` armed
the open-time save: `SchemaHandler._store` → `setMetaData(…, undefined)` over `undefined` (no backend) armed it, on
open and on every window focus, and the save 1 s later swept in the Page port cache the viewer had just sent. It is a
race (the release wrote Home on 3 of 3 opens here, first open included), not "the second open". `setMetaData` now
arms a save only on a changed value. Proved on the release with the rule patched into its renderer (0 files written
on two opens, the Page's ports seen arriving on each), `test:ci` 3017 / 0 at seed 29054, mutant red. The MCP needed
no change.

**Next, lane 1:** nothing agent-sized is left that does not wait. (1) **The next editor release** (Richard's go) ships
UPDATEBEHIND, NEWSWHITE (`2925e3e74`) and PAGEPORTS (`76f37308c`). On it, re-drive OWN-011 AC2 by §10/§11's method
(first open and launcher card reopen, `shasum` of every file) to close AC2. (2) **OWN-014 AC4** needs OWN-015's
language app (lane 3). (3) Richard's three waits below are unchanged.

🔴 **Instrumenting the RELEASED bundle** (no source maps, no `req.c`): push a chunk onto `webpackChunknoodl_editor`
for `req`, then find a module by scanning `req.m[id].toString()` and calling `req(id)`. In 0.4.0: `EventDispatcher` =
`req(11138).EventDispatcher`, `ProjectModel` = `req(33917).ProjectModel`, `filesystem` = `req(29215).filesystem`.
Wrapping `window.setTimeout` for `ms === 1000` catches the autosave debounce with its caller's stack.

## Lane 1 s17 (2026-10-14, Opus): PAGEPORTS, then Richard's G8 click

**Done this session** (`2925e3e74` code, `ffbee2c58` docs): OWN-011 AC2 re-driven on the release zip's 0.4.0
(§10: the first open writes nothing; a reopen with Home active writes Home = PAGEPORTS); OWN-013 G8's agent half
(§13: 0.3.0's own updater → 0.4.0 downloaded; installed over, a 0.3.0 project migrates once, reopen clean); OWN-014
AC3 met. Found and fixed for the next release: **UPDATEBEHIND** (the update dialog is invisible inside a project) and
**NEWSWHITE** (the what's-new post's bold leads and link are white on white; the header named the running version).

**Next: P112-S11-PAGEPORTS** (closes OWN-011 AC2; `kit: mcp`). `instancePortsChanged` is NOT a save trigger
(`projectmodel.ts` ~:1920), so something else arms the save at load and the component is written with the cache the
viewer just announced. First suspect: `NodeGraphModel` books `scheduleUpdateTypes` on every
`Model.instancePortsChanged` (:245-258). Instrument in a dev editor (log which `projectSaveTriggers` event armed the
save) on a copy of `scratchpad/ac2/my-apps/reading-list`, then choose: the editor stops treating a cache fill as an
edit (next release) and/or the MCP writes the Page's cache as the viewer would (helps the released 0.4.0 now). The
indexes differ by project (5, 6 here; 2 in Deadline Desk), so measure before writing them from the kit.

**Waiting on Richard:** (1) G8's in-place update on his own `/Applications/NodeGX.app` (still 0.3.0): launcher →
*Download and install* → *Restart now*; the zip is already in his updater cache. (2) Whether to rewrite the live 0.4.0
feed post's `<strong>` leads as plain `<p>` so current installs can read them (NEWSWHITE). (3) `build.mac.notarize:
false` (OWN-013 §12).

🔴 **Driving the RELEASED app** (no dev stack): `ditto` the bundle to the scratchpad, launch
`env -u ELECTRON_RUN_AS_NODE NOODLPORT=8774 NOODL_REMOTE_DEBUG_PORT=9333 <app>/Contents/MacOS/NodeGX --user-data-dir=<scratch> -ApplePersistenceIgnoreState YES`.
Stub the folder picker with `webpackChunknoodl_editor.push([[Symbol()],{},r=>req=r])` and then
`req(29215).filesystem.openDialog = async () => '<dir>'` (same id in 0.3.0 and 0.4.0). Stubbing
`require('@electron/remote').dialog` does NOT reach the bundle and pops the real dialog on Richard's screen. The
updater cache `~/Library/Caches/noodl-editor-updater` is shared with his real app, and *Restart now* relaunches with
his real profile, so never press it on a copy.

## ✅ 2026-10-14 (s17, Opus): npm packages 0.2.0 PUBLISHED

All three live and `latest` (UTC): `create-nodegx` ~12:00, `@nodegx/preview` ~12:00, `@nodegx/mcp` 12:07:52. Each
registry `dist.shasum` equals the tested tarball's in the table below. **From the registry**, empty folder, `HOME`
empty: `npm create nodegx@0.2.0` writes `.mcp.json` pinning `@nodegx/mcp@0.2.0` and the `nodegx-your-own-editor`
skill; `stranger-render.mjs @nodegx/mcp@0.2.0` → `create_project`, `render_report` DONE clean. The OWN-013 peer was
told nodegx-web may deploy. Worktree removed.

🔴 **npm's staged publishing (GA May 2026) bit the MCP publish.** Richard's first run published preview and
create-nodegx, but `@nodegx/mcp` 0.2.0 landed as a STAGED version (the 7.6 MB upload went through npm's browser
sign-in flow, "Press ENTER to open in the browser"). For about seven minutes `create-nodegx@latest` pinned an MCP that
did not exist on the registry, so a new folder's agent had no server. The re-run answered `E409 Cannot publish over
previously staged version "0.2.0"`; the version then appeared (approved through that browser flow). npm 10.9.4 has
no `npm stage`; `npx npm@11.15.0 stage list` reads the queue (`approve <id>` needs 2FA). **Next publish:** publish
`@nodegx/mcp` first and poll it to live before `create-nodegx`, or `npm stage publish` all three and approve them
together. `publish-npm.sh`'s order (preview, mcp, create-nodegx) is right; it does not wait for a staged one.

### What was packed and tested (kept for the record)

`cline-dev` pushed at `54a0ce946` (it carries OWN-019's `cda7ea056` + `5f8dee6d7`, OWN-007's skill, and
`007e80905` TWOMCPREDS fixed: both MCP specs 19 / 19). Packed in a clean worktree at that commit
(`scratchpad/npm020-s17`, every build-output link to primary removed; node-spec, canvas-look and the runtime's
`dist-types` built inside it). Tarballs in this session's `scratchpad/tgz020/`:

| tarball | shasum | checked |
|---|---|---|
| `nodegx-preview-0.2.0.tgz` | `7312c5fc1663…` | 971 + 984 bundle inputs, 0 outside the worktree; installed in an empty folder: `/` 200, a planted `.env` and `.mcp.json` **404** (ENVSERVED), Chrome draws the page in 207 ms, 0 page errors |
| `nodegx-mcp-0.2.0.tgz` | `e332f1d1a733…` | 486 kit-extract inputs, 0 outside; `dist/preset-fonts` 15 files, `drive-steps.js` has `for_ms` (OWN-019's checks); P18's uncommitted `patternLib` absent; `stranger-render.mjs` DONE clean, `--plant` sees the planted defect; `stranger-backend.mjs` key never in the project, canary control found |
| `create-nodegx-0.2.0.tgz` | `52075786e1e0…` | from the tarball in an empty folder, `HOME` untouched: `.mcp.json` pins `@nodegx/mcp@0.2.0`, CLAUDE.md, AGENTS.md, `.claude/skills/nodegx-your-own-editor/SKILL.md`, `.vibe/`, `opencode.json` |

Gates: `publishable.js` 3 / 0; `bugs.js gate` 0 blockers (mcp, preview, project-contract, node-spec, canvas-look).
`npm publish` stopped on `EOTP` (2FA) before anything went out. **Richard runs, in his own terminal:**
`scripts/own/publish-npm.sh <that tgz020 folder>`. Then: poll `npm view <name>@0.2.0 dist.shasum` (a first read can
404 for a minute) against the table; run `stranger-render.mjs @nodegx/mcp@0.2.0` from the registry; tell the OWN-013
peer (opennoodl-a4) that nodegx-web may deploy (it is holding so the changelog's npm 0.2.0 section doesn't go live
before the packages do); then remove the worktree (`git worktree remove --force` it, build outputs only).
CHANGELOG's npm 0.2.0 section was rewritten for what ships (`54a0ce946`). Known open, high:
P112-OWN019-BACKENDSESSION (a local backend stops with the agent's session) — in *Good to know*.

## The board (re-derived from the task files, 2026-10-11)

| task | built | driven / gated | Model |
|---|---|---|---|
| OWN-000 – OWN-006 | 🟢 | as s10 (OWN-006 gains a fourth fixture, s11) | — |
| OWN-007 the brief | 🟢 **s17 (2026-10-14, Fable): the kit's skill `nodegx-your-own-editor`**, written by `npm create nodegx` into `.claude/skills/`; AC1 ✅, AC2 measured, AC3 waits on OWN-008 (§6) | PASS / FAIL control pair from the registry at 0.1.0; `create-nodegx` tests 23 / 23 | ships on the next `create-nodegx` publish (R11) |
| OWN-008 three strangers | 📋 | — | see its file |
| OWN-009 Richard's own | 📋 | — | see its file |
| OWN-010 every bug teaches the kit | 🟡 ledger + `gate <kit>` | `gate mcp`: 0 blockers, 2 known issues (FORMATSKEW, PAGEPORTS) | see its file |
| OWN-011 one install | 🟡 published; **AC1, AC3, AC4 ✅**; **AC2 editor half ❌** (§9) | waits on OWN-013's release | **Opus** |
| OWN-012 the screen, from the descriptions | 📋 | — | step 1 **Opus**, 2–3 **Fable** |
| **OWN-013 the 0.4.0 cut** | 🟡 **G1 G2 G3 ✅, G5 G6 ✅, G4 🟡** (the six checks fixed locally, §8; `cline-dev` pushed for CI, R20), **G7 🟡** (PAGEPORTS open); G8–G10 ⬜ | unit `own-013` 10/10 + two mutants; drive §7; cut-tree `test:ci` 3015 / 1 by name (§8) | **Opus** |
| **OWN-014 the agent sees its app** (s13–s14) | 🟡 AC1 ✅ AC2 ✅; s14: KEYCHAIN fixed (renders had hung on a macOS dialog); AC4 half (Home yes, Lesson not: route parameter); AC3 publish owed | `scripts/own/stranger-render.mjs` + control | **Opus** |
| **OWN-015 the backend from npm** (s13–s15) | 🟡 **AC1 ✅ (s15)**: a fresh stranger round speaks with no repair (§10); AC2 ✅; CFPORTS/UNDEPLOYED/DETACHEDVISUAL fixed (§9); owed WAVTWICE (static tail), AC4 publish | `own-015/` (the round's scripts, as they ran) | **Opus** |
| **OWN-016 ship it** (s13) | 🟡 AC1 ✅, live at https://lingo.nodegx.io, AC4 reboot ✅; phone check with the real app and AC5 publish owed | Chrome over CDP, 0 errors; broken-project control | **Opus** |

**Built but undriven: 0** for OWN-013 (all three driven 2026-10-12, OWN-013 §7). A P112 peer (OWN-014/015/016,
R18, labelled "s13") works in this phase at the same time; it adds its own rows and merges into this file.

## Session 12 in brief

- **G1 (OWN-013 §6.1):** `release/0.4.0` = `cline-dev` with `origin/main` merged in. The merge has 14 conflicts, and
  every one is a file where `cline-dev` already holds `main`'s lines; only generated files differ, and `cline-dev`
  has the newer copy. The merged tree equals `cline-dev`'s. A subagent surveyed `484d9d646..f301ee785` (981 commits,
  251 feat/fix in shipped source; 17 cited hashes checked in HEAD). Nothing is marked *do not ship*. The release CI
  builds the bundled MCP from source, so STALEMCPDIST doesn't reach the release.
- **G2:** the 0.4.0 entry is at the top of CHANGELOG.md. It went through the content-authoring skill's offline checks
  and Richard approved it. The Dropdown plain-word list (R21's runtime half, a peer's uncommitted edit) is left out.
  The heading date says 2026-10-11 and is set to the tag day at the cut.
- **R17 (Richard: "Make a copy"):** see OWN-013 §6.3. If the copy fails the project is not opened. That refusal also
  shows the wrong *project.json is missing* toast (noted in P112-S11-REFUSALWORDS).
- **OPENWRITES:** likely cause written in OWN-013 §6.3 (`metadata` with `undefined` values counts as non-empty in
  `buildProjectV2File`); not measured.

## What to do next, in order

**First, in your first message: say which model you are running on and whether the task's Model line says Richard
should switch** (README §0.2). Do not wait for an answer.

1. ✅ *Done 2026-10-12 (OWN-013 §7).* Not driven: a **new project from a template makes no copy** (the opt-out in
   `newProject`); check it on the next launch.
2. ✅ *Done s12: PR #48 merged (`2a258a4b5`), **`v0.4.0` tagged on `main`** (R22), Release run `38228960399` (OWN-013 §9).*
   🔴 **The draft lacks the Intel Mac build (OWN-013 §10).** Agreement accepted (R23); Apple Silicon ✅; Intel fails
   at the staple (Apple's ticket server unreachable from the Intel runner, 3 runs running). R25: re-run later — s12
   scheduled one for ~14:20 CEST 2026-10-12. Check `gh run view 38228960399 --json attempt,jobs`; if Intel is still
   red, `gh run rerun 38228960399 --failed` again; if it stays red for a day, ask Richard about re-tagging with
   `e471cb8e6` (the patient staple). **Never publish without Intel** (the Mac feed would list only Apple Silicon).
   G9 is done (R24).
   **Next, by RELEASE-PROCESS §4 and UPG-008 §4:** read the Release run (four legs, *merge mac update feed*, *verify
   draft release is complete*; read durations, a draft with files is not a green run); paste
   `GITHUB-RELEASE-0.4.0.md` into the draft body; G9 (the run's *every authored library entry is installable*; if red,
   Publish library is Richard's); **G8 on a clean machine** — install 0.4.0 over 0.3.0, open a COPY of a 0.3.0 project
   (one `<copy>.before-0.4`, the note names it), open the kit's `reading-list` copy (opens, nothing rewritten but
   PAGEPORTS), check `NodeGX.app/Contents/Resources/noodl-mcp/package.json` and `render-harness/data/tokens.ts` exist;
   G10 Richard's drives (NSP-019's two folds, script files, R17's copy). **Then Richard clicks Publish.** After
   Publish only: the feed post (`whats-new-0.4.0.READY-TO-PUSH.json` → nodegx-content, `date_modified` = the publish
   moment), nodegx-web deploy (`ops/deploy.sh 49.12.102.195`; check `nodegx.io/changelog/#v0-4-0`), close held issues,
   re-drive OWN-011 AC2 on the released app. Also push `cline-dev` (it holds `fefbb8968` and this session's docs).
3. **Make `release/0.4.0`** (local, through a temporary index or `git merge` in the worktree): the cut + `origin/main`
   merged in, conflicts from the cut. Ask Richard before pushing it and opening the PR (G4). Six required checks.
4. **G3:** `GITHUB-RELEASE-0.4.0.md` and the what's-new post, from the changelog; pushed only after Publish.
5. G8 (install over 0.3.0, open a 0.3.0 project and a kit project), G9 (the shelf job), G10 (Richard's drives: NSP-019's
   folds, script files, R17's copy), then §4's cut. Every push, PR, merge and tag is outward: ask each time.
6. Then OWN-012 step 1 (Opus) and OWN-007 (R3), as in s10's list.

**Human decisions / done since asking:**
- ✅ **R17 (s12):** make a copy before the format update. Built `8f9137d8e`.
- ✅ **R15 (s11):** release through `main` → OWN-013. ✅ **R16 (s11):** opening keeps the project's own id.
- ✅ **Changelog (s12):** approved as drafted.
- Ask when it comes up: pushing `cline-dev` (ahead of `origin/cline-dev` by this session's two commits and peers'; count it with `git rev-list --count origin/cline-dev..cline-dev`), making and
  pushing `release/0.4.0`, the PR, the merge, the tag, Publish.
- Still worth asking when it matters: *should a node an agent adds wear the same look as one a person drops from the
  picker?* (OWN-006 §6.3); who bumps the next npm release (s10).

**Not this phase's to fix, but owed:** P112-S7-TEXTDEFAULTS, P112-S8-SHAREDTARGET, P112-S9-FRESHFONT (open).

## s15 (2026-10-12, Opus): the lingo app speaks with no repair (OWN-015 AC1 ✅)

Read OWN-015 §9–§10 first. s14 had been left uncommitted at the `/clear`; it's committed (`908f8f478`). Fixed and
committed: CFPORTS (`5ff71216f`: the bare-port refusal also covers an instance's own `ports` and the cloud
Request/Response; 10 examples rewired), UNDEPLOYED (`787876713`: cloud writes say "deploy now" and reveal the tool)
and DETACHEDVISUAL (`9505d342d`: a warning). A fresh `claude -p` round from tarballs packed at HEAD, with a sentence
that never says NodeGX, built `french-phrases` (84 turns; `claude -p` is Claude Code on Richard's subscription, never the API; its "$3.75" is an API-price equivalent) and deployed it unprompted. Richard pasted the key
into the project's `.env`; it **speaks** (desktop and phone, to the end, key 0 hits in 2 MB, control 4).

**Next, in order:**
0. **Richard's ask (s15), first: [OWN-017](OWN-017-THE-LINGO-APP-IN-OUR-OWN-EDITOR.md), the proof it's a NodeGX
   app.** Build our own small editor from the npm kit and use it to tweak real parts of the stranger's app
   (`own-015/s15/french-phrases/`, work on a copy). Open with one AskUserQuestion: which edits (recommend fixing
   WAVTWICE there, which proves it and removes the static), the editor's shape, and who builds it. Items 1–2 below
   fold into it if WAVTWICE is fixed through the editor.
   Context Richard confirmed: the lingo app is the proof of concept for the full-stack, no-editor npm path (R18),
   not a product.
1. **P112-S15-WAVTWICE** (medium): 2/2 agents double-wrap Gemini's finished WAV, so each phrase ends in static.
   Smallest fix: a catalog example that plays a cloud function's audio as it is (wrapping only when the MIME type is
   `audio/L16`). Grade it with a fresh round whose tail RMS stays at speech-end levels.
2. **Re-pack 0.2.0** (mcp, preview, create-nodegx) in the `npm-020` worktree at a pushed commit. Ask before pushing
   and before publishing (R11). Then `scripts/own/stranger-*.mjs` from the registry (OWN-014 AC3, OWN-015 AC4,
   OWN-016 AC5).
3. OWN-016: deploy the stranger's app to lingo.nodegx.io for the phone check (Richard's VM; ask).
4. OWN-014 AC4's Lesson half (a route parameter). Still open from s14: MOVEDDEPLOY, KITROOTDEPLOY (P107's).
Filed this session: P112-S15-SUNDAYGATE (fixed), P112-S15-TWOMCPREDS (two MCP specs red at HEAD, not ours).
The round's project, home and tarballs are in s15's scratchpad (`round/`, `tgz/`); scripts in `own-015/s15/`.

## s14 (2026-10-12, Opus): the language app, built by a stranger, speaks

Read OWN-015 §7 first. **Not committed at write time.** Two `claude -p` rounds from the 0.2.0 tarballs. Round 1
never used NodeGX (NOTNODEGX). Round 2 built the app ($4.29). It speaks (real Gemini, phone and desktop) only after:
fixes **KEYCHAIN** (render hung on a macOS dialog **on Richard's screen**; never start Chrome under a fake `HOME`
without `--use-mock-keychain`), **DAYTWO** (`provision_backend` restarts the project's own backend) and **NOBACKEND**
(the preview keeps a loopback backend); a deploy the agent skipped (UNDEPLOYED); and two repairs on a copy
(**CFPORTS**: every cloud port needs its `in-`/`out-`/`pm-` prefix and the checker doesn't say so; **DETACHEDVISUAL**).
The key was in 0 of the page's requests (control 6). Richard ruled that the agent never sees the key (PERSONKEY,
needs a ruling on the fix).

**Rulings came back (OWN-015 §8):** NOTNODEGX = both (done), PERSONKEY = the `.env` route (done, plus ENVSERVED:
the preview served `.env`, fixed). The static Richard heard was the agent's double WAV header (Gemini now returns
WAV + C2PA), not ours. **Next, in order:** (1) — ; (2) fix CFPORTS (the checker derives a
`CloudFunction2`'s and Request/Response's ports, and the two examples get fixed), UNDEPLOYED (a `next` on cloud
writes) and DETACHEDVISUAL; (3) a fresh round 2 that must speak with no repair, which is AC1; (4) re-pack 0.2.0 in a
worktree and ask before publishing. KITROOTDEPLOY (GAM-014 red since P107's `9da5979f9`) is P107's.
The round's scripts are kept in `own-015/` (scratchpad paths left as they ran; see its README).

## OWN-014 / 015 / 016: the npm full stack (s13, 2026-10-12, Opus)

**Why:** R18. Richard wants a no-editor tutorial video (a Duolingo clone with Google text-to-speech, built from npm
alone). The npm kit could build and preview but not see its screen, keep a key on a server, or deploy. Commits:
`9c65f35b8` (scoping), `63992760c` (HARNESSTOKENS), `9ee402130` (OWN-014), `c82f04a5b` (OWN-015), `2016dd48d`
(OWN-016 step 1). Each task file's last section has the measurements.

**What ships at the next `@nodegx/mcp` / `@nodegx/preview` release (nothing published yet):**
- `@nodegx/mcp`'s prepack adds `dist/render-harness/` plus a production viewer (`build-render-harness.mjs`),
  `dist/backend/cli.js` (`build-backend-copy.mjs`) and `dist/package.json` (C68's fix, for the cloud bundler).
- Two new tools: `set_function_secret` and `list_function_secrets`.
- `@nodegx/preview` gains the `nodegx-deploy` bin.
- Both refusals say "from version 0.2.0 on", so **the release is 0.2.0** or those two sentences change.

**Bugs found, all filed:**
- HARNESSTOKENS (high) ✅: the packaged harness had 0 default tokens, 0.3.0 included.
- CLEANWARNINGS (medium) ✅: "the render is clean" over warnings.
- CLOUDDEPLOY (high) ✅: deploy failed on every npm install and on 0.3.0's sidecar.
- AGENTFILES (medium) ✅: a deploy published `.mcp.json` and `CLAUDE.md`.
- Still open: SECRETPATH (low; a Secret node's error names the server path), DEPLOYBADJSON (low), WORLDTYPECAST
  (low, P116's test).

**Next, in order:**
1. **Ask Richard for a Google Cloud TTS key** (restricted to the Text-to-Speech API). Then run OWN-015 AC1 as a
   stranger round: `claude -p` (Sonnet, `--strict-mcp-config`) in an empty folder whose `.mcp.json` runs the packed
   `@nodegx/mcp`, given one sentence. It must build the function, the page, and playback through a `create_node_kit`
   node, and the app must speak in the preview. Follow the stranger-round recipe memory: `--allowedTools` doesn't
   restrict, so record cost and turns. AC2's last third is a CDP capture of every request the page makes, searched
   for the key.
2. **Publish 0.2.0** of `@nodegx/mcp` and `@nodegx/preview`, ask first (R11). Pack in a worktree at the pushed commit,
   never in the shared checkout, then re-run the three `scripts/own/stranger-*.mjs` from the registry (OWN-014 AC3,
   OWN-015 AC4, OWN-016 AC5).
3. **OWN-016 steps 2–4** need Richard's VM (SSH), a DNS name and his go. Read DEP-005/006 and HST-005 first. The
   backend there is `node cli.js serve`. Also owed: a `deploy_to_folder` MCP tool for people without a terminal.

## Standing findings (still true)

1. **Dependencies (s10, published):** all six declare what they load. node-spec bundles `@noodl/backend-contract`'s
   translators (relative path, esbuild) and ships their types under `dist/types`; project-contract's PUBLISHED manifest
   (written by `build-publish.mjs`) declares `@nodegx/node-spec`, `ajv`, `ajv-formats`; its repo manifest stays private.
2. **Keep ES2019 syntax in node-spec `src/`** (sibling packages compile it below ES2020).
3. **The registry is the lever** for a spec runner; the unspecced bucket is the component interface. **s8: the engine
   registers 130 types in a page; what it does not is the cloud runtime's nodes and `CSS Definition`.**
4. **No conformance ledger** exists (NEEDS.md §3; P107 / OWN-010).
5. **Kits ship as library entries, not in template folders.**
6. **Not measured:** `nodegx deploy` writes `*` for a component port wired to a kit node (OWN-004 §6.1); the engine's
   frame cost on the todo template's biggest logic component in a page (OWN-003 step 1's open item).
7. **Headless software WebGL starves the app's frames**; a WebGL-page check waits for the screen it expects.
8. **A number wired into `width` of a child of a row is a share, not a percent** (FLD-004).
9. **The editor's `tests/` folder is outside its jest config**; `test:ci` is where they run.
10. **The MCP's reference and the kit's reference differ by design on format < 5 projects** (run-on-value-change pins).
11. **A background `until ! pgrep -f "<text>"` matches its own shell line** — use `pgrep -f "[.]bin/jest"`.
12. **s6: a page cannot ask the running app for a node's dynamic ports**; the spec's `derived` ports minus the
    generator's universe are the page's answer (`portsFor`).
13. **s6: a gate that presses a DOM control must scroll it into view and assert the press took effect.**
14. **s6: the editor suite's command needs `npx ts-node`.** s8: the prototype adapter's `playGraph` needs nothing of
    node-spec in Node (the page revives the raw scenario); the step-proxy attempt needed `canonical.ts` under ts-node's
    require hook — gone with the proxy.
15. **s7: the official editor saves no position for a child** (`normalizeComponentForV2`).
16. **s7: the editor's add-node door adds STYLE-002's look**; the MCP adds none; an agent's node's look is an open
    question.
17. **s7: `NodeGraphModel` cannot load outside Electron**; typecheck the editor's tests first (`tsc -p
    packages/noodl-editor/tsconfig.tests.json`, 20 s) — **and read whether a red there is a peer's open edit before
    believing it** (s8: it was).
18. **s7: a peer's jest can sit idle at 0% CPU for 20+ minutes**; check `%cpu` of the WORKERS (`ps … | awk '$2==<pid>'`)
    before waiting on a run — s8: the parent sat at 0 % while one worker ran conformance at 90 %.
19. **s8: a global installed by assignment in Node is a no-op in a page** when the window owns it as a getter-only
    accessor (`localStorage`, `location`…): install by descriptor, as `installWorld` does; a scenario that reads another
    scenario's state is a shadowing failure first (memory `a-global-set-by-assignment-is-ignored-in-a-page`).
20. **s8: ESM evaluates every imported module before the importer's first statement** — a global a module reads at load
    must be set by an EARLIER import (`nodegx-viewer-globals` first), never by code in the importer.
21. **s8: a remote step-by-step driver cannot reproduce traces recorded by a synchronous one**; grade a remote runner on
    whole plays it performs itself (`playGraph`).
22. **s8: the reference's recordings are per fresh engine**; a shared engine answers 10 of 85 differently
    (P112-S8-SHAREDTARGET). A grader makes a fresh runner per scenario.
23. **s8: parallel Bash calls share one shell cwd** — a `cd` in one breaks relative paths in the others and a jest run
    reads `Tests: 0`; use absolute paths, or `(cd … && …)` subshells.

24. **s9: the stranger's view is the tarball in an empty folder under the scratchpad with `HOME` pointed at an empty
    folder** — no `node_modules` above it to rescue a missing dependency, nothing global read or written. `npx
    --package=<tgz> <bin>` stands in for the registry. A checkout hides every packaging defect s9 found.
25. **s9: a bundle's real dependencies are what it still `require`s at run time**; a workspace package it inlines is a
    `devDependency`. `scripts/own/publishable.js` gates the private-workspace case.
26. **s9: `npm pack` ships whatever `dist/` holds** — each kit package rebuilds in `prepack`; the preview also builds its
    production runtime there (never copies the checkout's, which is usually the 17 MB development build).
27. **s9: `create_project` registers how its server was launched**; under npx that is a cache path, so it registers the
    pinned npx command instead.
28. **s9: `list_projects` has two sources now** (the editor's recent list and the folder the server started in). Not
    measured: that every client starts a project's server in the folder it was opened in.
29. **s9: a ruling number is the README §8 table's** — check the highest R there before numbering a new one.

30. **s10: a tarball packed in the shared checkout carries peers' uncommitted code** — pack a release in a clean worktree
    at a pushed commit, and read the bundle's module paths (esbuild's `// path` comments or `*.inputs.json`) to prove it.
31. **s10: `make-worktree.sh` links `packages/noodl-mcp/dist/*` and `packages/noodl-preview/dist` into the primary** —
    delete the links before building in the worktree; before `git worktree remove`, `find <wt> -type l -delete`.
32. **s10: an `.inputs.json` holds `{ inputs: [...] }`, paths relative to the package** — my first reader treated it as a
    map and read 0 of 0; a matcher earns its absence only beside a control that hits (960 / 960 existed).
33. **s10: a new npm name answers 404 / `0.0.0-stage` for minutes after its publish** — poll; never report "not
    published" or "awaiting approval" from one read.
34. **s10: `npm publish` needs Richard's authenticator** — hand him a script, not an OTP relay.
35. **s10: classic `moduleResolution: node` ignores `exports`** — a subpath with types needs `typesVersions`; a `.d.ts`
    re-exporting JSON forces `resolveJsonModule` on every consumer. `scripts/own/stranger-kit.mjs` checks both.

36. **s11: the released editor is a separate release train from the npm kit.** A format bump on `cline-dev` makes
    every project the kit writes unopenable in the editor people can download, until the next editor release. Nothing
    gates that yet (OWN-013 G8).
37. **s11: the dev stack's renderer webpack dies of heap (4 GB) on its second compile on a loaded box.** A peer edit
    starts the second compile. Check `uptime` and `vm.swapusage` before a launch. The installed app with
    `--user-data-dir=<scratch> --remote-debugging-port=<p>` (and `NOODL_REMOTE_DEBUG_PORT=<p>` for `cdp.js`) is the
    fallback for *released* behaviour. It may sit behind AppKit's "reopen windows?" prompt with no window:
    `osascript … click button "Don’t Reopen"`.
38. **s11: to open a folder the way a person does**, stub `filesystem.openDialog` through the webpack module cache and
    press *Open project…*. A row seeded into `recently_opened_project.json` goes through `loadProject` instead, which
    stamps the row's id over the file's: that measures your seed, not the product.
39. **s11: `find -newermt "-25 minutes"` errors on this machine (bfs)**, and with `2>/dev/null` it reads as "nothing
    changed". Use `-mmin -25`, and run it on a folder you know changed first.
40. **s11: release memory was stale for two months** and was linked only from a pointer file. Read
    RELEASE-PROCESS.md before any tag; the index line now carries `RELEASE@main`.
41. **s12: a release's merge into `main` conflicts on every file the last release PR fixed**, because those fixes went
    to `main` first and were cherry-picked to `cline-dev`. Check each conflict with "every line `main` added since
    the merge base is in `cline-dev`'s copy"; generated files (ratchets, the cloud node library) differ only by
    regeneration.
42. **s12: the copy checks read hard-wrapped Markdown as broken sentences** (false *fragment* flags). Unwrap each
    bullet onto one line before running `written.py`.
43. **s12: prettier cannot parse `projectmodel.editor.ts`** (an old `<Type>{…}` cast at `setCloudServices`), so
    `prettier --write` fails on it; format your own lines by hand. `LocalProjectsModel.ts` was already not
    prettier-clean at HEAD; don't reformat it wholesale.

## To see or run things

- **The stranger chain (OWN-011 §7):** `npm pack --pack-destination <dir>` in `packages/noodl-mcp`, `packages/noodl-preview`
  (≈20 s, builds the production runtime) and `packages/create-nodegx`; then, in an empty folder with `HOME` set to an
  empty folder: `npx -y --package=<create tgz> create-nodegx my-apps`; the server as `.mcp.json` says, with
  `--package=<mcp tgz> noodl-mcp` for the registry; `npx -y --package=<preview tgz> noodl-preview <app> --port 0`.
- **The kit as a stranger (s10):** `npm pack` node-spec and canvas-look, `npm run build:publish` in
  `packages/nodegx-project-contract` then `npm pack` in its `dist/publish`, all into one folder;
  `node scripts/own/stranger-kit.mjs <that folder>` (installs, loads 18 entries, typechecks under three resolutions).
- **From the registry (s10):** the same chain with `npm create nodegx@<v>` and the `.mcp.json` as written; no tarballs.
- **The gates for a publish:** `node scripts/own/publishable.js`; `node scripts/bugs.js gate <kit>`;
  `npm test --workspace create-nodegx` (node:test, 6); `npx jest tests/own011-installed-runtime.test.ts` in the preview;
  `npx jest tests/listProjects.test.ts tests/agentConfig.test.ts tests/toolDisclosure.test.ts` in the MCP.
- The page: `prototype/real/build.sh`, `node prototype/real/serve.mjs 47812`, open `http://127.0.0.1:47812/orbit.html`
  (open it for Richard with `open <url>`).
- The kit's page runner: `npm --prefix packages/noodl-preview run build`, then `… run graph-target-check`.
- The editor suite: `npx ts-node packages/nodegx-project-contract/editor-suite-node.ts <adapter> <project-dir> <edits.json>`.
- The census: `node scripts/own/census.js`.
- The Node reference: `cd packages/noodl-runtime && npx jest test/node-spec/graph.test.ts` (96 / 96).
