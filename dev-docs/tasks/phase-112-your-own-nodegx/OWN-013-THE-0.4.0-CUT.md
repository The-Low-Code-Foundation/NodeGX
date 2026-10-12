# OWN-013 — The 0.4.0 cut: an editor people can download that opens what the npm kit makes

**Opened 2026-10-11 (s11)** from R15 (Richard: *release the editor now*) and the re-ruling the same evening (*redo it
properly via main*). **Model:** **Opus** for the cut point, the gates and the measurements; the changelog and release
notes go through the content-authoring skill.

**Status: 🟡 — s12 (2026-10-11/12): G1 measured, G2 written and approved, R17 built and driven, OPENWRITES fixed (§6, §7). The version is bumped on `cline-dev` (`88366e69f`, pushed). Nothing is pushed or branched for the release yet.**

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

`dev-docs/tasks/phase-100-0.3.0-the-first-upgrade/UPG-008-THE-CUT.md` is the runbook 0.3.0 shipped by. Same shape:

| # | gate | owner | state |
|---|---|---|---|
| G1 | **The cut point.** `origin/main` = `202314165` (Release 0.3.0, #47); `cline-dev` is 1,000+ commits ahead. Pick a commit, check what it carries (peers' half-done work: read each phase README's live rows), `git merge-tree --write-tree origin/main <cut>` exit 0. Branch `release/0.4.0` = the cut + the release docs commit, made through a temporary index (UPG-008 §2.1) | agent | ✅ measured s12 (§6.1); the branch is not made |
| G2 | **CHANGELOG.md `## 0.4.0 · <date>`** — what 0.4.0 is for in one bold sentence, then New / Changed / Fixed / Good to know, plain words (the header comment). Same commit on `cline-dev` and the release branch (nodegx-web reads the primary checkout). Content-authoring skill | agent | ✅ s12 (§6.2): in CHANGELOG.md on `cline-dev`; the date is set on the tag day |
| G3 | `GITHUB-RELEASE-0.4.0.md` (draft body) and the what's-new feed post (`whats-new-0.3.0.READY-TO-PUSH.json`'s shape) — pushed **only after Publish** (every installed editor fetches it on project open) | agent | ⬜ |
| G4 | **The PR `release/0.4.0` → `main`**, six required checks green (*Typecheck, Lint, Test (editor), Test (platform-node), Build (viewer + editor bundles), Check build artefacts*). `enforce_admins`: red means stop. Read each run's duration. 0.3.0 had three red on first CI | CI | ⬜ |
| G5 | `npm run ci:build:editor` **on the cut tree** (a worktree with its own build output). s11 ran it in the shared checkout at `88366e69f` + peers' open edits: exit 0, so the production config itself is not broken there | agent | ⬜ |
| G6 | Editor test floor **by name**. s11's `test:ci` (HEAD `120baf39`): 3,012 specs, 2 failures — SUB-006 *nonexistent-port … lists available alternatives*, and *pending project saves … re-arms a held save* (the order-dependent one) | agent | ⬜ |
| G7 | **Opening writes.** Richard ruled the release knowing opening still writes: P112-S11-PAGEPORTS (a Page's `dynamicports`), P112-S11-OPENWRITES (`nodegx.project.json` on every open). Fixed before the cut if cheap; otherwise named under *Good to know*. P112-S11-IDREPLACE is fixed (`f2505b83f`) and **undriven in the editor** — drive it on the cut | agent | 🟡 s12 (§6.3, §7): R17's copy built and **driven**; OPENWRITES **fixed and driven** (`1ed87f2ef`); IDREPLACE **driven**; PAGEPORTS still open (named under *Good to know*) |
| G8 | **The upgrade 0.3.0 → 0.4.0**: install over 0.3.0 and open (a) a 0.3.0 project — the 4 → 5 migration runs once (ISL-018) and the project still works; (b) a project the npm kit made — it opens. P112-S11-REFUSALWORDS stays visible to anyone still on 0.3.0 opening a 0.4.0 project | agent + Richard | ⬜ |
| G9 | The shelf: the tag run's *every authored library entry is installable*; if red, Publish library first | agent / CI | ⬜ |
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

