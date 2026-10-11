# OWN-013 — The 0.4.0 cut: an editor people can download that opens what the npm kit makes

**Opened 2026-10-11 (s11)** from R15 (Richard: *release the editor now*) and the re-ruling the same evening (*redo it
properly via main*). **Model:** **Opus** for the cut point, the gates and the measurements; the changelog and release
notes go through the content-authoring skill.

**Status: 📋 — the version is bumped on `cline-dev` (`88366e69f`, pushed); nothing else.**

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
| G1 | **The cut point.** `origin/main` = `202314165` (Release 0.3.0, #47); `cline-dev` is 1,000+ commits ahead. Pick a commit, check what it carries (peers' half-done work: read each phase README's live rows), `git merge-tree --write-tree origin/main <cut>` exit 0. Branch `release/0.4.0` = the cut + the release docs commit, made through a temporary index (UPG-008 §2.1) | agent | ⬜ |
| G2 | **CHANGELOG.md `## 0.4.0 · <date>`** — what 0.4.0 is for in one bold sentence, then New / Changed / Fixed / Good to know, plain words (the header comment). Same commit on `cline-dev` and the release branch (nodegx-web reads the primary checkout). Content-authoring skill | agent | ⬜ |
| G3 | `GITHUB-RELEASE-0.4.0.md` (draft body) and the what's-new feed post (`whats-new-0.3.0.READY-TO-PUSH.json`'s shape) — pushed **only after Publish** (every installed editor fetches it on project open) | agent | ⬜ |
| G4 | **The PR `release/0.4.0` → `main`**, six required checks green (*Typecheck, Lint, Test (editor), Test (platform-node), Build (viewer + editor bundles), Check build artefacts*). `enforce_admins`: red means stop. Read each run's duration. 0.3.0 had three red on first CI | CI | ⬜ |
| G5 | `npm run ci:build:editor` **on the cut tree** (a worktree with its own build output). s11 ran it in the shared checkout at `88366e69f` + peers' open edits: exit 0, so the production config itself is not broken there | agent | ⬜ |
| G6 | Editor test floor **by name**. s11's `test:ci` (HEAD `120baf39`): 3,012 specs, 2 failures — SUB-006 *nonexistent-port … lists available alternatives*, and *pending project saves … re-arms a held save* (the order-dependent one) | agent | ⬜ |
| G7 | **Opening writes.** Richard ruled the release knowing opening still writes: P112-S11-PAGEPORTS (a Page's `dynamicports`), P112-S11-OPENWRITES (`nodegx.project.json` on every open). Fixed before the cut if cheap; otherwise named under *Good to know*. P112-S11-IDREPLACE is fixed (`f2505b83f`) and **undriven in the editor** — drive it on the cut | agent | ⬜ |
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
