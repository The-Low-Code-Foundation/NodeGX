# OWN-013 — The 0.4.0 cut: an editor people can download that opens what the npm kit makes

**Opened 2026-10-11 (s11)** from R15 (Richard: *release the editor now*) and the re-ruling the same evening (*redo it
properly via main*). **Model:** **Opus** for the cut point, the gates and the measurements; the changelog and release
notes go through the content-authoring skill.

**Status: ✅ — 0.4.0 PUBLISHED 2026-10-14 12:02:26 UTC (`v0.4.0` = `538c0ee9c`, 16 assets, Latest); nodegx.io deployed (changelog #v0-4-0, homepage downloads on 0.4.0); what's-new post live (nodegx-content `1dac97934`). §12. G8 agent half ✅ (§13); owed: Richard's in-place update click (G8), G10's drives, `build.mac.notarize: false` (needs Richard's OK — auto mode refused it as security-weakening), model-request.ts's `any`s.**

## 1. The person sentence

> **Someone who made an app with `npm create nodegx` downloads NodeGX, opens the folder, and it opens.**

Today it does not: the newest release, 0.3.0 (2026-09-27), opens project format ≤ 4; the kit writes 5 (ISL-018,
2026-10-02). P112-S11-FORMATSKEW, OWN-011 §9.

## 2. What happened first (s11) — so nobody repeats it

I tagged `v0.4.0` on `cline-dev` at `88366e69f` from a memory written in August (*"tags are cut on cline-dev"*).
**Wrong since v0.2.3:** RELEASE-PROCESS §3 cuts from `main` (changelog entry, six required checks green on a PR, merge
— not a squash — then tag on `main`). Caught two minutes into the release run: run `38174808860` **cancelled**, no draft
was created (`gh release view v0.4.0` → not found), tag deleted on origin and locally. The bump commit stays — it is step
2 of the documented process. The memory is corrected.

## 3. The procedure is UPG-008's — read it first

`dev-docs/tasks-archive/phase-100-0.3.0-the-first-upgrade/UPG-008-THE-CUT.md` is the runbook 0.3.0 shipped by. Same shape:

| # | gate | owner | state |
|---|---|---|---|
| G1 | **The cut point.** `origin/main` = `202314165` (Release 0.3.0, #47); `cline-dev` is 1,000+ commits ahead. Pick a commit, check what it carries (peers' half-done work: read each phase README's live rows), `git merge-tree --write-tree origin/main <cut>` exit 0. Branch `release/0.4.0` = the cut + the release docs commit, made through a temporary index (UPG-008 §2.1) | agent | ✅ measured s12 (§6.1); **`release/0.4.0` = `0a271100e`** (cline-dev `b7e84fa67` + `main` merged, tree identical; R21) |
| G2 | **CHANGELOG.md `## 0.4.0 · <date>`** — what 0.4.0 is for in one bold sentence, then New / Changed / Fixed / Good to know, plain words (the header comment). Same commit on `cline-dev` and the release branch (nodegx-web reads the primary checkout). Content-authoring skill | agent | ✅ s12 (§6.2): in CHANGELOG.md on `cline-dev`; the date is set on the tag day |
| G3 | `GITHUB-RELEASE-0.4.0.md` (draft body) and the what's-new feed post (`whats-new-0.3.0.READY-TO-PUSH.json`'s shape) — pushed **only after Publish** (every installed editor fetches it on project open) | agent | ✅ drafted s12 (§8): `GITHUB-RELEASE-0.4.0.md`, `whats-new-0.4.0.READY-TO-PUSH.json` (copy checks clean) |
| G4 | **The PR `release/0.4.0` → `main`**, six required checks green (*Typecheck, Lint, Test (editor), Test (platform-node), Build (viewer + editor bundles), Check build artefacts*). `enforce_admins`: red means stop. Read each run's duration. 0.3.0 had three red on first CI | CI | 🟡 s12 (§8): the last CI on `cline-dev` (`88366e69f`) had 3 of the 6 red; Typecheck and Test (editor) fixed locally, Lint's `type` fixed, Lint's `tsfixme` raised visibly (R19, `7efa3395d`). **CI on the pushed `cline-dev` (`01aeb0868`, run `38219618264`): all six required ✅**; Test (editor) 3015 specs, 0 failures, seed 19863. **PR #48 `release/0.4.0` → `main` opened 2026-10-12 (R20/R21)**; its checks: see §8 end |
| G5 | `npm run ci:build:editor` **on the cut tree** (a worktree with its own build output). s11 ran it in the shared checkout at `88366e69f` + peers' open edits: exit 0, so the production config itself is not broken there | agent | ✅ CI's Build (viewer + editor bundles) green at `88366e69f` (5 min, clean runner); the release run re-checks the sidecars (§8) |
| G6 | Editor test floor **by name**. s11's `test:ci` (HEAD `120baf39`): 3,012 specs, 2 failures — SUB-006 *nonexistent-port … lists available alternatives*, and *pending project saves … re-arms a held save* (the order-dependent one) | agent | ✅ s12 (§8): cut tree `76372696` + two spec fixes, seed 44986 → 3015 specs, **1 failure by name**: *re-arms a held save* (order-dependent, known since s43) |
| G7 | **Opening writes.** Richard ruled the release knowing opening still writes: P112-S11-PAGEPORTS (a Page's `dynamicports`), P112-S11-OPENWRITES (`nodegx.project.json` on every open). Fixed before the cut if cheap; otherwise named under *Good to know*. P112-S11-IDREPLACE is fixed (`f2505b83f`) and **undriven in the editor** — drive it on the cut | agent | 🟡 s12 (§6.3, §7): R17's copy built and **driven**; OPENWRITES **fixed and driven** (`1ed87f2ef`); IDREPLACE **driven**; PAGEPORTS still open (named under *Good to know*) |
| G8 | **The upgrade 0.3.0 → 0.4.0**: install over 0.3.0 and open (a) a 0.3.0 project — the 4 → 5 migration runs once (ISL-018) and the project still works; (b) a project the npm kit made — it opens. P112-S11-REFUSALWORDS stays visible to anyone still on 0.3.0 opening a 0.4.0 project | agent + Richard | 🟡 **agent half ✅ s13 (§13)**: 0.3.0's own updater offers, downloads and checks 0.4.0; installed over the 0.3.0 bundle, the profile carries over and (a) Deadline Desk migrates 4 → 5 once, with one `.before-0.4` equal to the project as 0.3.0 left it, and a reopen changes nothing; (b) ✅ (OWN-011 §10). Found and fixed **UPDATEBEHIND** (`2925e3e74`). **Owed: Richard presses *Restart now* on his own 0.3.0** |
| G9 | The shelf: the tag run's *every authored library entry is installable*; if red, Publish library first | agent / CI | ✅ s12: red on the tag run (4 unreachable entries); Publish library run `38231663830` (R24) → 47/47, 36/36 |
| G10 | Richard's drives of what 0.4.0 announces (each phase's owed driven rows — list them from the phase READMEs at the cut) | Richard | ⬜ |

## 4. The cut (after G1–G10)

Merge the PR (merge commit) → `git checkout main && git pull` → check `packages/noodl-editor/package.json` says
0.4.0 → `git tag v0.4.0 && git push origin v0.4.0` → Actions → Release: four legs, *merge mac update feed*, *verify
draft release is complete* → draft body → clean-machine checks (RELEASE-PROCESS §4) → **Richard clicks Publish** →
the feed post → nodegx-web deploy → close held issues → re-drive OWN-011 AC2 on the released app.

## 5. Acceptance criteria

1. `v0.4.0` is a published release whose tag is on `main`.
2. A project `npm create nodegx` + `create_project` makes opens in the released 0.4.0 (OWN-011 AC2's first half).
3. CHANGELOG.md and nodegx.io/changelog/ carry 0.4.0.

## 6. Session 12 (2026-10-11, Opus)

### 6.1 G1 — the cut point is `cline-dev`

- `origin/main` = `202314165` (Release 0.3.0, #47). It has five commits `cline-dev` lacks: the 0.3.0 release PR's own
  fixes (`1a34cdc76`, `98687a4d7`), its docs commit (`f74b47eee`), the merge, and v0.2.4's merge (`f02f82ee1`). Their
  merge base with `cline-dev` is `484d9d646`, 0.3.0's cut.
- `git merge-tree --write-tree origin/main f301ee785` → **exit 1, 14 conflicts**: the three ratchet baselines,
  CHANGELOG.md, UPG-008, seven `docs-site/docs/nodes/visual/*.md`, `cloud-node-library.json`, `tpl010Components.ts`.
- **Every conflict resolves to `cline-dev`'s side.** For each file, every line `main` added since the merge base is
  in `cline-dev`'s copy, except in generated files: the baselines' `commit` stamp and two TSFixme counts (`cline-dev`
  has the newer ratchet), and 11 descriptions in `cloud-node-library.json` that P109 rewrote and regenerated
  (`f6700d187`, `8f31517cc`, `5ee9edda4`). The auto-merged files outside the 14 equal `cline-dev`'s exactly
  (`git diff --name-only HEAD <merged tree>` minus the 14 = nothing).
- So `release/0.4.0` = the cut with `origin/main` merged in, conflicts taken from the cut; its tree equals the cut's.
  `cline-dev` does not need the merge: once the PR lands, `main` holds the cut as an ancestor and the next merge from
  `cline-dev` is clean.
- **What the cut carries** (a subagent's survey of `484d9d646..f301ee785`, spot-checked: 17 cited commits all in
  HEAD): 981 commits, 251 feat/fix commits in the source the editor ships. No README or task file says *do not ship*.
  Held back from the changelog: the Dropdown *plain-word list* half of R21 (P107-S88-OPTIONSCAST, its runtime half
  is a peer's uncommitted edit). Shipping but undriven: NSP-019's two folds (Richard's AC3 drive open). The P18 §76
  pile and other peers' open edits are uncommitted, so no cut carries them; build from a clean worktree (G5).
- **The bundled MCP** (`extraResources`) ships from `build:sidecars` on the release runner, from source, so
  P109-S36-STALEMCPDIST does not reach the release.

### 6.2 G2 — the changelog

Written through the content-authoring skill; `written`, `closer`, `contract`, `opener` clean on the unwrapped text
(one `contract` flag left: the UI label *Is not one of*); `figures` flags only version numbers, "two" and "30 days",
each checked in the code. Richard approved it (AskUserQuestion, s12) with the copy question below.

### 6.3 G7 — opening writes, and R17

- **R17 (Richard, s12, "Make a copy"):** 0.4.0 converts a 0.3.0 project to format 5 silently on first open (no caller
  passes `showUpgradeModal`), and 0.3.0 refuses it afterwards. `8f9137d8e` copies the folder to
  `<project>.before-0.4` first, shows where, and saves at once so the copy is made once. Copy fails → not opened (a
  4 left as 4 would run pre-NDA-017 graphs under the new default). Not for an import source, a new project from a
  template, or an unzipped one. 🔴 A refused open also shows ProjectsPage's *project.json is missing* toast
  (P112-S11-REFUSALWORDS). Unit-graded: `tests-unit/own-013` 7/7, a `<=` mutant fails one. Editor `tsc --noEmit`
  exit 0, eslint clean. **Undriven.**
- **OPENWRITES, likely cause, unmeasured:** the baseline is `buildProjectV2File(importer output)`, the save
  `buildProjectV2File(ProjectModel.toJSON())`; a `metadata` whose keys hold `undefined` would count as non-empty and
  reach disk as `{}`. Needs the editor to confirm.
- Not driven this session: the box sat at load 10–21 with 12.2 of 13.3 GB swap used and peers' jest running; the dev
  stack died of heap twice at that load in s11.

## 7. Session 12, continued (2026-10-12, Opus) — the drive

The box was quiet (load 3.6, no peer suite). One dev stack (`dev:debug`), torn down after. Every folder opened through
the real *Open project…* button with `filesystem.openDialog` stubbed (handoff finding 38), each a copy under the
scratchpad, graded by `shasum` of every file before and after.

| arm | folder | result |
|---|---|---|
| 1 | `Desk A`, a copy of `Deadline Desk` (format 4) | 🔴 **two** copies, `Desk A.before-0.4` and `-1`, identical, same second. Cause: *Open project…* loads the folder twice (`openProjectFromFolder`, then `loadProject`), both before the first save. Also, `nodegx.project.json` gained `"metadata": {}` |
| — | in the running editor | `ProjectModel.instance.metadata` = `dbCollections`, `systemCollections`, `dbVersionMajor`, all `undefined` → OPENWRITES' cause |
| fix | `1ed87f2ef` | one copy per folder per run (`copiesMadeThisRun`); `buildProjectV2File` drops `undefined` metadata keys. Bundle checked to carry both before the next arms |
| 2 | `Desk C`, a fresh copy of the same | ✅ **one** `.before-0.4`, equal to the original (`diff -rq`); the note names it; version 5 after; no `metadata` written. New id `4df97301-…`: `Desk A` carries the same id and is registered, so R16 mints (as designed) |
| 3 | `Desk A` reopened (format 5) | ✅ 16 of 16 files unchanged. **Control:** `setMetaData('own013probe', 1)` in the same session → the file was written with `{"own013probe": 1}` and none of the `undefined` keys |
| 4 | `Reading B`, the `reading-list` fixture (format 5, made by the kit) | ✅ id `95de5bf2-…` kept (**IDREPLACE driven**); no copy; `nodegx.project.json` byte for byte. Written: `components/Pages/Home/{component,nodes}.json` and `_registry.json` (PAGEPORTS, open) and `.mcp.json` (the fixture has none; the editor writes the agent's config on open by design) |
| 5 | `Reading B` reopened | ✅ nothing changed |

Unit: `tests-unit/own-013` 10/10 (`openWrites` 3: removing the filter fails 2). Editor `tsc --noEmit` exit 0. eslint:
one error in `ProjectExporter.ts` (`PortDefinition` unused, there since `fbce66e0d`, February), none mine. Filed
P112-S12-CREATEDLOST (low): a real save still drops `created` and stamps `nodegxVersion "1.1.0"`. The changelog's
*Good to know* now names only PAGEPORTS.

🔴 **0.3.0's `.before-0.3` copy has the same double:** `NodeGX test projects/CMG Drive Tokens.before-0.3-1` exists
beside `.before-0.3`. The fix covers both, since they share `backupBeforeUpgrade`.

**For the cut:** the OWN-014 session (P112, same day) has P112-S13-HARNESSTOKENS's fix uncommitted (the packaged
render harness ships no default tokens). It landed as `63992760c` (peer message, checked in HEAD) and is in the
changelog's *Fixed*.

## 8. Session 12, continued — the six required checks

**The last CI on `cline-dev`** (`pr.yml` runs on every push there): run `38174808907` at `88366e69f`, 2026-10-11.
Required: Build ✅ (5 min), Check build artefacts ✅, Test (platform-node) ✅; **Typecheck ❌, Lint ❌, Test (editor)
❌**. (Not required and red: Test (runtime, backend, viewer, mcp, preview), Library check, Docs site builds, Node
catalog freshness, Lesson bundles.)

| check | cause (from CI's log, then reproduced) | fix |
|---|---|---|
| Typecheck | `typecheck:backend-tests`: *Cannot find module '@nodegx/node-spec'* — its `tsconfig.tests.json` sets its own `paths` (which replace the root's), so node-spec resolved through `exports` to `dist/`, absent on CI (locally a stale `dist` answered, missing `DRAWN_PORT_TYPES`). The next step, `typecheck:mcp`, then failed on `ont002WorldTools.test.ts:253` (TS2352) | `693d4dd36`: the alias + `DOM.Iterable`; the cast through `unknown`. All 8 Typecheck steps exit 0 locally; a `--traceResolution` sweep finds no other program resolving a workspace package to `dist` |
| Lint — `type` | +12 raw px font sizes in P109's script-file screens | `a5a584fd9`: tokens; 622 → 610 = baseline |
| Lint — `tsfixme` | +98 in `src` (72 in node-spec's node specs), +1,371 in tests (mostly the island/garden MCP specs) | R19 (Richard, 2026-10-12): **raise it visibly, owed back down** — `7efa3395d`, measured in a clean worktree at `a6ce18c9f`: src 1260, tests 2221 |
| Test (editor) | 1 failure: SUB-006 *lists available alternatives* (pre-GAM-019 assertion) | `76372696`: the ruled order, plus a signal-wire case |

**The cut tree's own suite** (worktree `own013-cut`, run directly in `packages/noodl-editor` — never through
`lerna exec`, which runs the primary's source): at `76372696`, seed 44986 → 3015 specs, 2 failures: *re-arms a held
save* and a new one, *Component instances can report accepted children* — P107 R23 (`9da5979f9`, 07:58 that morning)
moved the derivation into the contract and the order flipped (nobody reads it). The same run left
`tests/testfs/import_proj1.before-0.4/` in the tree (R17's copy, from a spec opening the committed format-4 fixture
in place). `b9d15e52d` fixes both; the rerun at the same seed: **3015 specs, 1 failure** (*re-arms a held save*), and
no copy left.

🔴 **The held-save spec is a coin flip on the PR.** It passed at CI's seed 28755, failed at 44986. A drain-first fix
(the sibling spec's pattern) did NOT fix it: a "Project saved" still lands after the drain while saving is held, so
something outside the spec's own model saves (a second module copy, or a listener). Reverted; not chased further.
If Test (editor) is red on the PR with only this spec, re-run the job.

**Two packaged-editor fixes from the OWN-014/015 session are in the cut and the changelog:** `63992760c`
(P112-S13-HARNESSTOKENS, the render harness's tokens) and `c82f04a5b` (P112-S13-CLOUDDEPLOY, `noodl-mcp/package.json`
in `extraResources`; `check-build-artefacts --built` fails the release build if its source is missing).

**G3:** `GITHUB-RELEASE-0.4.0.md` and `whats-new-0.4.0.READY-TO-PUSH.json` in this folder, through the copy checks.

Three more fixes from the OWN-014/015/016 session that the editor ships, all in the changelog's *Fixed*:
HARNESSTOKENS `63992760c`, CLOUDDEPLOY `c82f04a5b`, AGENTFILES `2016dd48d` (a deploy no longer publishes `.mcp.json`,
`CLAUDE.md`, `AGENTS.md`, `.claude/`).

**CI on the pushed `cline-dev`, 2026-10-12** (R20; run `38219618264` at `01aeb0868`, 07:46–08:17 UTC): **the six
required checks all green** — Typecheck (3m11s), Lint (1m06s), Test (editor) (4m11s: *3015 specs, 0 failures, seed
19863*, read from the job's log), Test (platform-node), Build (5m12s), Check build artefacts. Not required and still
red, as at `88366e69f`: Test (runtime, backend, viewer, mcp, preview), Library check (LIB-001), Docs site builds
(HLT-013), Lesson bundles (FIX-027), Node catalog freshness. Not read this session; none blocks the merge.

**The release branch and PR (2026-10-12, R21 "ship now"; then "yes, branch + PR"):** `release/0.4.0` = `0a271100e`,
parents `b7e84fa67` (cline-dev) and `202314165` (origin/main), `git merge -s ours` after §6.1's per-file check, tree
diff vs `b7e84fa67` = 0 lines, `packages/noodl-editor/package.json` 0.4.0. Made in the worktree `own013-cut`.
🔴 The first attempt's `git switch` refused on a dirty file and the merge landed on the scratch branch instead (local,
unpushed; moved back with `git branch -f`) — check the switch's exit before merging. **PR #48** opened with the merge-
commit instruction, the checks, R17/R19/R21. Since the CI'd `01aeb0868`: `a94119947` (P107 Drag fix), `613ff7200`
(npm 0.2.0 bump + its changelog entry, below 0.4.0's), `82221132a`/`8693f6cfd` (P112 s13), `b7e84fa67` (docs).

## 9. The merge and the tag (2026-10-12, R22 "Yes, merge and tag")

- PR #48's run on `0a271100e`: the six required ✅ (Test (editor) on the merge ref `6a2cce1f`: **3015 specs, 0
  failures, seed 81716**); the five non-required red as before; GitHub *MERGEABLE / UNSTABLE*.
- CHANGELOG dated the tag day: `## 0.4.0 · 2026-10-12` — `fefbb8968` on `cline-dev`, cherry-picked as `7162e1b83` on
  the release branch (same blob). That push's six required ✅ (run `38228279219`).
- **Merged** `gh pr merge 48 --merge` → `2a258a4b5` "Release 0.4.0 (#48)", second parent `7162e1b83`; tree diff main vs
  release branch 0 lines; editor `package.json` 0.4.0.
- **Tagged** `v0.4.0` → `2a258a4b5`, pushed (no tag existed on origin before). Release run `38228960399` (§4).

## 10. The Release run (`38228960399`, 2026-10-12 09:17–09:41 UTC)

| leg | result |
|---|---|
| linux-x64, win32-x64 | ✅ — the draft holds 7 files: `.deb`, `.AppImage`, `.rpm`, `latest-linux.yml`, `.exe`, `.exe.blockmap`, `latest.yml` |
| darwin-arm64, darwin-x64 | ❌ — **signed** (Developer ID, Osborne Solutions) and then **refused by notarytool: "HTTP status code: 403. A required agreement is missing or has expired"**. Not code: Apple's updated agreement is unsigned (R23) |
| merge mac update feed, verify draft release is complete | ❌ — follow from the Mac legs |
| every authored library entry is installable | ❌ — 4 unreachable entries; fixed by Publish library (R24) |

**After Richard accepts the agreement:** `gh run rerun 38228960399 --failed` re-runs the two Mac legs (publishing to the
same draft), the library check, the feed merge and the verify step. A draft with files in it is not a green run:
read *verify draft release is complete*.

**Re-runs after Richard accepted the agreement (R23), `gh run rerun 38228960399 --failed`:**

| attempt | darwin-arm64 | darwin-x64 | library | feed / verify |
|---|---|---|---|---|
| 2 (10:14–10:44) | ✅ signed, notarised; `.dmg`, `.zip` + blockmaps, `latest-mac.yml` in the draft | ❌ `codesign --timestamp` on `dugite/git/libexec/git-core/git`: *"A timestamp was expected but was not found"* (Apple's timestamp server) | ✅ | ❌ (x64 missing) |
| 3 (10:44–11:16) | — | ❌ signed **and notarised**, then *"Failed to staple … code 68"*: the stapler lost its connection to `api.apple-cloudkit.com` (`NSURLErrorDomain -1005`) | — | ❌ |
| 4 (11:17–11:43) | — | ❌ notarised, then the same staple failure (`-1005`, Error 68) | — | ❌ |
| 5 (11:45–12:05) | — | ❌ the same again | — | ❌ |

Five Intel attempts: the agreement, Apple's timestamp server once, then the ticket server three times running —
none in the code. Apple Silicon stapled at 10:36 between them. The draft holds 12 files: Linux, Windows, Apple
Silicon. 🔴 **Do not publish without Intel:** `latest-mac.yml` would list only the Apple Silicon files, and an Intel
Mac on 0.3.0 would be offered them. **R25 (Richard): re-run later today, no code change.** A re-run is scheduled for
~14:20 CEST (`gh run rerun 38228960399 --failed`). `e471cb8e6` on `cline-dev` retries the staple over 30–240 s for
the next release (a re-run of this tag's run does not use it).

## 11. Session 13 (2026-10-14, Opus) — the draft would not start; the re-cut

- **Richard downloaded the draft's Apple Silicon DMG: a blank launcher,** devtools `Cannot find module
  'fast-xml-parser'` from `src/editor/index.bundle.js`. Cause: the production webpack leaves every root
  `node_modules` package external (`get-externals-modules.js`), and electron-builder packs only what `noodl-editor`
  declares. Parse XML / Parse Feed (`fcf68a1c7`, `75fd8ef10`) brought it in through `noodl-runtime` and
  `nodegx-node-spec`. **Measured on the mounted DMG's `app.asar`:** of every bare `require` in the three bundles,
  `fast-xml-parser` is the only package missing. Linux and Windows build from the same package list (inferred, not
  opened). A dependency walk is not the honest list: it called `deprecation` missing, but the asar holds it (the
  editor's nested `@octokit/request-error`).
- **Fix `0728e42f4`:** `fast-xml-parser ^4.5.7` in `noodl-editor` dependencies (+ its lock line), and
  `build/check-packaged-modules.js` as the `afterPack` hook. It reads the packed asar and throws before signing if a
  bundle requires a package the asar lacks. **Control pair on the real artefacts:** the 0.4.0 draft's asar → exit 1
  naming `fast-xml-parser` only; 0.3.0's → exit 0. Not yet run inside electron-builder: the Release run is its
  first firing (a wrong asar path would fail loud, not silent).
- **R26 (Richard): fold in everything** on `cline-dev` since the tag (154 commits, ~45 touching the app).
  **R27: re-tag `v0.4.0`** (the draft was never published) rather than 0.4.1.
- **G1 again:** `git merge-tree --write-tree origin/main 0728e42f4` exit 0, the merged tree equals HEAD's (0 diff
  lines). `release/0.4.0` fast-forwarded to `ecd5045c8` (HEAD + `main`), then `e1d99d3fd` (the changelog commit,
  same tree as `cline-dev` `8763a64c6`). PR #49. The survey (subagent, spot-checked: `6253b4c54`, `a5abefe4d`,
  `dd7ff4756`, `be46f18bc`, `agentConfig.ts`): no feature flag, nothing marked *do not ship*; the node version bumps
  are spec versions with `migration: none`, so none rewrites a project on open.
- **G2 again (`8763a64c6`):** the *two folded sections* bullet was wrong since `6253b4c54` (the *How this node works*
  window replaced them) — rewritten. Added the fold-in's features and fixes; dated 2026-10-14 (re-date if the tag
  lands later). Held back: the six-digit email code (`b5fba6137`, off, no switch in the app, P119 owes the client),
  the rules column's *It warns you when* (`99625cc67`, never driven in the editor), the npm-only Vibe profile.
  GITHUB-RELEASE-0.4.0.md and the what's-new post updated to match.
- **G10 for Richard on the new DMG, added by the fold-in:** the *How this node works* window (signed off in dev,
  not in a packaged build), a Counter with Min above Max, a new Aggregate Records in a cloud function.

## 12. Session 13, continued — shipped (2026-10-14)

- PR #49 (six required ✅, editor 3015/0 seed 12565) → `8a7712c7d`; Lint was red twice first: the tsfixme ratchet
  (raised visibly, `27b23a2af`) and one raw 18px in HowItWorks.module.scss (→ `--font-size-xl`, `e510c5d3b`).
- Release run `38550514828`: both Macs and Linux ✅ and the new afterPack check printed its pass on each; **win32-x64
  threw in the check itself** — `@electron/asar` splits archive paths on `path.sep`, the bundle path was given with
  `/`. Fixed `0fd64db10`, PR #50 (six ✅) → `538c0ee9c`, draft and tag deleted and re-made.
- Release run `38554755279`: Windows ✅ (the check passed on win32), **darwin-x64 died on Apple's staple** (Error 68,
  `api.apple-cloudkit.com` -1005). **Cause of the dead retry:** electron-builder 26.15 notarises by itself during
  signing whenever the Apple variables are set (`MacTargetHelper.notarizeIfProvided`, skipped only on
  `mac.notarize === false`), and its staple has no retry; our afterSign hook then notarises a second time (the arm64
  log shows both). So `e471cb8e6`'s stapleWithPatience never runs on the failure it was written for. Fix: one line,
  `"notarize": false` under `build.mac` — **auto mode refused the edit ("Security Weaken")**; Richard's call.
  `gh run rerun --failed` → darwin-x64 ✅, feed merged (both arches in latest-mac.yml), verify ✅, 16 assets.
- The arm64 DMG of the first re-cut run, measured: `fast-xml-parser` in the asar, the check passes, codesign verifies,
  the app is notarised and stapled (Gatekeeper accepted), launched in an isolated profile: the launcher renders
  (432 elements), `require('fast-xml-parser')` loads in the renderer. Richard installed it: "It opens and it works great".
- **Published** 12:02:26 UTC on Richard's "publish please". nodegx.io deployed after npm 0.2.0 reached the registry
  (held for the peer's npm section): homepage on 0.4.0 (nodegx-web `27e7dbd`, 6/6 download URLs 200), the Orbit card
  fixed (`d7e233f`: a link inside the card's link spilled its words out and killed "Open Orbit"), changelog `d0d17fd`.
  What's-new post pushed with `date_modified` = the publish moment; served by Pages on the second poll.
- Subscriber email drafted: `nodegx-web/drafts/0.4.0/email-0.4.0.md` (Under the Lid must be shared first; Driftwood,
  built by Mistral Large 4 in L1, exported with tgz28's production engine to `~/Downloads/driftwood-site` for Netlify).

## 13. G8 — the upgrade from 0.3.0 (2026-10-14, Opus, lane 1; §12 is the release session's)

Nothing touched `/Applications/NodeGX.app` (0.3.0, Richard's) or his profile. Every run was a `ditto` copy of it in the
scratchpad with its own `--user-data-dir`, `NOODLPORT=8774`, launched under `env -u ELECTRON_RUN_AS_NODE`.

1. **0.3.0 finds 0.4.0.** `update:get-state` → `available`, target `0.4.0`, versions listed from 0.4.0 down to 0.1.3.
   On the launcher the dialog opens unprompted and whole.
2. **Inside a project it cannot be seen: P112-OWN013-UPDATEBEHIND (high).** The dialog is laid out at full opacity,
   but the editor's panels paint over it: only the title bar dims, and *New version available* toggles a dialog
   nobody sees. Cause: `BaseWindow` mounts `UpdateManager` before the panels, and BaseDialog's fixed root has no
   z-index. **Fixed `2925e3e74`** (its own layer, z 1000). Driven on a fresh 0.3.0 copy with that exact wrapper
   inserted live: hit test `false` → `true`, and the screenshot shows it whole. It ships in the next release, so
   0.4.0 → 0.5.0 from inside a project will meet it once more.
3. **The what's-new window on 0.3.0** shows the 0.4.0 post under *New updates in 0.3.0*, with its bold leads invisible
   (P112-OWN011-NEWSWHITE, fixed `2925e3e74`, see OWN-011 §10).
4. **The download.** *Download and install* → `downloading` 0 → 41 → 90 % → `downloaded` in 18 s. *Ready to install*
   says *Downloaded. NodeGX will restart to finish installing.* I stopped there. *Restart now* relaunches the bundle
   with no arguments, so it would open Richard's real profile. `autoInstallOnAppQuit` is false, so quitting
   installed nothing (`ShipItState.plist` unchanged since 2026-09-27). 🔴 The download landed in the SHARED
   `~/Library/Caches/noodl-editor-updater/pending/` (`NodeGX-0.4.0-mac-arm64.zip`, sha512 = the feed's). It is the
   right file, and Richard's own 0.3.0 can reuse it.
5. **Installed over.** The copy's bundle was replaced at the same path by the release zip's (what Squirrel does), and
   the 0.3.0 profile was kept. The launcher shows 0.4.0 with the Deadline Desk card and its thumbnail.
6. **(a) the 0.3.0 project.** The project as 0.3.0 left it (0.3.0's own open had already rewritten it: id, PAGEPORTS,
   OPENWRITES, the old behaviour) was opened from the card. **One** `Desk.before-0.4`, 16 / 16 equal to that state. The
   toast names the copy's path. `version` 4 → 5, id kept, no `metadata`; only `nodegx.project.json` changed. The app
   runs: the clock draws the live time. Reopened (checked in the editor): no toast, no second copy, 16 / 16 unchanged.
7. **(b) a kit project** opens: OWN-011 §10.

**Owed for G8: Richard's half.** His `/Applications/NodeGX.app` is still 0.3.0. Open it, press *Download and install*
(from the launcher, where the dialog shows), then *Restart now*. It should come back as 0.4.0 with his projects
listed. Opening one makes its `.before-0.4` copy once.
