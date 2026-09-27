# UPG-008 — The cut: 0.3.0, without the recent code-export work

**Written 2026-09-27 (s7).** The canonical process is
[`RELEASE-PROCESS.md`](../../guidelines/RELEASE-PROCESS.md) §0 and §3. This file records only
what is specific to 0.3.0: the cut point, why it is where it is, and what is still owed before
the tag.

## 1. The rulings this cut stands on

| # | ruling | when |
|---|---|---|
| **R11** | *"Prep the 0.3.0 release, without the recent code export work."* | Richard, 2026-09-27 |
| **R12** | The backend manager (P104, BMG-000…017) **ships in 0.3.0**. Asked because it landed after the 0.3.0 changelog was written and before the export commit, and Richard had not driven it (BMG-013). Options were *leave it out* (cut at `97c8fb484`, recommended) and *include it*. **He chose include.** Do not "correct" it back. | Richard, 2026-09-27 |

## 2. 🔴 The cut point is `484d9d646`, not `cline-dev`

```
fcf68a1c7  feat(p18/exp-011 §75): the four parsers export …     ← EXCLUDED (R11)
af4a8c99f  docs(p18): §75 handoff carries its commit hash       ← EXCLUDED (docs of the above)
484d9d646  docs(p104): BMG-017 handoff carries its commit hash  ← THE CUT
```

**Measured 2026-09-27:**

- "The recent code-export work" is **one commit**. Since `v0.2.4`, 15 commits touch
  `packages/nodegx-export`. Only two are P18's own: `5f88f434b` (exp-014, 2026-09-12, pictures on
  deep routes) and `fcf68a1c7` (§75, 2026-09-26). The other 13 are phases teaching the exporter
  their own new nodes (P88, P94, P96, P99, P102), and each is part of that phase's feature.
  `5f88f434b` **stays in**: the 0.3.0 changelog already announces it (*"Pictures in exported apps
  load on pages two levels deep"*).
- `fcf68a1c7` is self-contained. Every file it changes is under `packages/nodegx-export/` or P18's
  docs. `git diff --name-only 484d9d646 HEAD` lists nothing else, so the editor at the cut is
  consistent with its exporter.
- Excluding it **keeps the changelog honest**. At the cut, Parse Feed and Parse XML still say
  *"Not exportable yet"*, which the changelog already says.
- `git show 484d9d646:packages/noodl-editor/package.json` → `"version": "0.3.0"` (`14e24d205`).
- `git merge-tree --write-tree origin/main 484d9d646` → **exit 0, no conflicts**. `origin/main` is
  `f02f82ee1` (the `v0.2.4` merge), one commit that `cline-dev` does not have.
- The peer's uncommitted P18 §76 pile in the primary checkout (`plan.ts`, `component.ts`,
  `cryptoLib.ts`, `emitApp.ts`, ~20 specs) is not committed anywhere, so no cut can carry it.

### 2.1 Why this changes RELEASE-PROCESS §3 step 4 for this release only

The process merges **`cline-dev`** into `main`. For 0.3.0 that would bring §75 along. So:

- **Branch `release/0.3.0`** = `484d9d646` + the release docs commit (changelog, these files).
  It was created locally in s7 without checking anything out, through a temporary index. Nothing
  is pushed.
- The **same docs commit** is on `cline-dev` with identical blobs, so the later `cline-dev` →
  `main` merge (0.3.1) is clean and brings §75 in then.
- **The PR into `main` is `release/0.3.0` → `main`**, not `cline-dev` → `main`. Standing PR #20 is
  **merged** (it carried v0.1.3…v0.2.3), so a new PR is needed either way. Do not squash.
- **A fix found before the tag** goes on `cline-dev` first, then is cherry-picked onto
  `release/0.3.0`. Never commit a fix only to the release branch: it would be lost in 0.3.1.

## 3. Before the tag — what is still owed

| # | item | owner | state 2026-09-27 |
|---|---|---|---|
| G1 | **P101 INS-004:** Richard looks at a narrow inspector (a `%` Width row wraps `Fixed` under the field below ~315px) | Richard | ⬜ |
| G2 | **P103 CMG-011:** Richard drives the ten Styles fixes and rules them WORTHY (RC-8). A NOT WORTHY row is fixed before the tag | Richard | ⬜ |
| G3 | **P104 BMG-013:** Richard drives the backend manager (follows from R12) | Richard | ⬜ |
| G4 | **UPG-001 §3.9 — an upgraded 0.2.4 backend under the backend manager.** The census closed on 2026-09-23, **before P104 existed**. P104 changed the admin sign-in (BMG-014), the schema adapters (BMG-003/016) and the storage layer (BMG-015), and removed the editor's panels (BMG-012). None of its tasks opened a 0.2.x backend. Re-run the §3.6 recipe (0.2.4 data dir, `git archive v0.2.4` backend, then the cut tree) and read the manager's first load against a backend that already has a credential and users. `GITHUB-RELEASE-0.3.0.md` says *"A backend made with 0.2 keeps all its data"*: that sentence is **graded by this row**, not yet true of the cut | agent | ⬜ **never measured** |
| G5 | **Push `cline-dev` and `release/0.3.0`.** `cline-dev` is **88 commits ahead** of `origin/cline-dev` (`3c628911c`, 2026-09-22), so CI has run on none of P101–P104. Outward-facing, so Richard's call | Richard | ⬜ |
| G6 | **The six required checks green on the `release/0.3.0` → `main` PR**: *Typecheck, Lint, Test (editor), Test (platform-node), Build (viewer + editor bundles), Check build artefacts*. `main` has `enforce_admins`, so red means stop. Read the run's **duration** before believing it | CI | ⬜ |
| G7 | `npm run ci:build:editor` on the cut tree (the production-only webpack path). Needs a worktree on `release/0.3.0` **with its own build output** (see the memory on worktrees). Not run in s7: one heavy job per box, and a peer's electron was up | agent | ⬜ |
| G8 | Editor test floor **by name**, never carried from a handoff | agent | ⬜ |
| G9 | `scripts/renderer-errors/budget.json` `network/whats-new-feed-404` `2 → 0` (the feed is live). Needs the renderer-errors run, which starts its own dev stack, so run it alone. Commit on `cline-dev`, cherry-pick to the release branch | agent | ⬜ |
| G10 | **UPG-007, the shelf:** the tag run's *every authored library entry is installable* job green; if red, run **Publish library** first (RELEASE-PROCESS §4) | agent/CI | ⬜ |

## 4. The cut itself (after G1–G10)

1. On `release/0.3.0`, set the `CHANGELOG.md` heading date to the tag day
   (`## 0.3.0 · <YYYY-MM-DD>`, currently `2026-09-24`). Same edit on `cline-dev`.
2. Merge the PR `release/0.3.0` → `main` (not a squash).
3. `git checkout main && git pull && git show HEAD:packages/noodl-editor/package.json | head -8`.
   Then `git tag v0.3.0 && git push origin v0.3.0`.
4. Watch **Actions → Release**: four legs, *merge mac update feed*, *verify draft release is
   complete*. A draft with files in it is not a green run.
5. Paste [`GITHUB-RELEASE-0.3.0.md`](GITHUB-RELEASE-0.3.0.md) into the draft body.
6. Verify on **clean** machines (RELEASE-PROCESS §4). For 0.3.0 add one check: install over 0.2.4
   and open a real 0.2.x project. The toast appears, `<project>.before-0.3` exists, and the text
   is styled as before.
7. **Publish** the draft.
8. **Only after step 7**, push the feed post.
   [`whats-new-0.3.0.READY-TO-PUSH.json`](whats-new-0.3.0.READY-TO-PUSH.json) goes to
   `nodegx-content`'s `static/whats-new/feed.json`, with `date_modified` set to the publish moment.
   🔴 **Every installed editor, 0.2.x included, fetches this feed on each project open.** Pushed
   early, it announces a release nobody can download. The modal's header reads *"New updates in
   {running version}"*, so a 0.2.x Linux user (no auto-update, so no "update available" flag)
   sees it over 0.2.4. The post names 0.3.0 in its own first line for that reason. Links open in
   the browser (`target="_blank"`; every 0.2.x editor has the `will-navigate` guard, checked).
9. Deploy nodegx-web (`ops/deploy.sh 49.12.102.195` in `~/vscode_projects/nodegx-web`). It
   reads `../OpenNoodl/CHANGELOG.md` from the **primary checkout** (`cline-dev`), which is why the
   changelog is on both branches. Check `https://nodegx.io/changelog/#v0-3-0`.
10. Close the issues held open for a shipped fix.
11. After the release, `cline-dev` → `main` merges as usual and brings §75 in for 0.3.1.
