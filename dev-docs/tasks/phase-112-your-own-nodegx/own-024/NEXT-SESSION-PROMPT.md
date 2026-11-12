> ✅ **DONE, 2026-10-20 21:16 UTC: 0.4.3 published, feed post and nodegx.io on it, zips made (OWN-024 §7).** What's
> left is Richard's: sending the zips and the email; the parked Three Kit's library publish (its job is red). For
> agents: P112-OWN024-SCHEMAFIRSTSTART and -DEPLOYNOSHARP are open; npm 0.2.4's changelog/site section is OWN-020's.
>
> **Update, end of s1 (2026-10-20 ~21:00 CEST):** #53 merged (`e0bd5309e`), `v0.4.3` tagged; the Release run built
> darwin-x64 (signed, notarised), win32-x64 and linux-x64, each passing the new thumbnail smoke; **darwin-arm64 never got
> a GitHub runner** (three times; a background loop re-queued it). Not published. S8 re-driven on the Intel artefact:
> every check ✅ (OWN-024 §6). **The zips are made and in `nodegx-private/builder-briefs/`.** What's left, in order:
> (1) the arm64 leg — seven attempts 17:3x–20:2x UTC got no runner ("not acquired … capacity constraints"); a
> background loop retries every 30 min overnight; if it's still red, `gh run rerun 39466894582 --failed` (0.4.2's arm64 built at 07:40 UTC); read its log for the two
> `[check-packaged-backend]` lines; (2) the draft: 16 assets, `latest-mac.yml` with both arches (re-run *merge mac update
> feed* after arm64), the body from `GITHUB-RELEASE-0.4.3.md`; (3) **Publish** (Richard gave his go for it); (4) the
> feed post, the CHANGELOG date, nodegx.io (OWN-021 §11's way). The library job stays red on the parked Three Kit:
> Richard's call. Step 2.4 below is done.

# The 0.4.3 cut, from the PR on: push `release/0.4.3`, the six checks, merge, tag, Publish, then the two zips

**Written 2026-10-20 by Opus 5.5 (session opennoodl-8a, OWN-024 s1), at `cline-dev` `2a7e4df71`.** Read first:
[OWN-024](../OWN-024-THE-0.4.3-CUT.md) (§2 the row measured, §3 steps, §5 what s1 did and found), then OWN-021 §9–§12
(how 0.4.2's PR, release and S8 drive went; §12's traps hold).

🔴 **R1: none of the builder's words, names or addresses go into this repo.** The email goes in
`~/vscode_projects/nodegx-private/builder-briefs/`.

## 1. Where it stands

- **Committed on `cline-dev`:** NOSHARP `6b2515d4a` + its Windows fix `2b6317913`; PUSHTOALL `45d1a453f`; the four
  template fixes `6cba197ad`; the ratchet `13890a372`; the release commit `2a7e4df71` (CHANGELOG `## 0.4.3`, editor
  0.4.3, `GITHUB-RELEASE-0.4.3.md`, `whats-new-0.4.3.READY-TO-PUSH.json`, OWN-024, the board).
- **`release/0.4.3` PUSHED, head `e55a37f86`, PR #53 to `main`: every required check green** (Test (editor) 3021 / 0,
  seed 74287; OWN-024 §5 has both runs). Next is the merge, on Richard's go. A later
  `cline-dev` commit does NOT reach it: only push more to the branch for a fix CI asks for, and say so on the PR. The cut with `origin/main` (`250a36804`) merged in; one
  conflict (`.tsfixme-baseline.json`) resolved to the cut; its tree equals the cut's. Both ratchets hold on its clean tree.
  If `cline-dev` moved since, re-make it the same way (OWN-024 §5) from the new cut and re-run `git merge-tree`.
- **What only CI can measure:** the new afterPack smoke on Windows and Linux (nightly or release legs), and the
  afterSign smoke on the two **signed** Mac legs (the hardened runtime against the new `.node`/`.dylib`). Locally the
  afterPack smoke passed in a dummy app packed by electron-builder 26.15.3.

## 2. What to do, in order

0. **The box** (`ListAgents`, `ps`, `uptime`); one heavy job at a time.
1. **Richard ruled in s1 (OWN-024 §5, end):** check in with the other sessions before pushing (done: all clear); no
   nightly dispatch; the honesty number gated to source builds (done). **The push and the PR still need his explicit
   go** — given in s1; the PR is #53.
2. **The PR** → `main`: the six required checks green, Test (editor) count and seed read in the job log (OWN-021 §9).
   Not-required reds were red on #51/#52 too: say which, don't fix them here.
3. **Merge, tag `v0.4.3`, the Release run** (Richard's go for each). On a red leg: read its log first; a NOSHARP hook
   failure names its target and what's missing. Then the draft: assets, `latest-mac.yml` both arches, body from
   `GITHUB-RELEASE-0.4.3.md`, and on the arm64 DMG `Resources/nodegx-backend/node_modules/@img/sharp-darwin-arm64`
   present + `codesign --verify --deep --strict`. **Publish** is Richard's. Then the feed post (set `date_modified`), the
   CHANGELOG date if the tag day moved, nodegx.io (OWN-021 §11's deploy).
4. **The zips and the re-drive** on the published 0.4.3: OWN-021's prompt §2.6 exactly (install beside Richard's app,
   isolated profile, never Connect, never `/Applications`; `git archive` from `v0.4.3`; R1-grep). Add to it: **both
   apps' backends running at once**, a save in each, and nothing of one app in the other's backend (PUSHTOALL on the
   real build); Ways to pay and Shelves empty their fields after an add; the community bar reads its name. Look at
   every shot. Zips into `nodegx-private/builder-briefs/`, then tell Richard where.
5. **Write it down:** OWN-024 (readings), the bug files' "Still owed" lines, the board, this file.

## 3. Not this lane's

- **npm 0.2.4 with the Cline kit** is OWN-020's. Registry at 15:55 CEST 2026-10-20: `@nodegx/preview` 0.2.3 (13:26 UTC),
  `node-spec`/`project-contract` 0.2.0; `@nodegx/mcp`, `create-nodegx`, `create-nodegx-vibe` 0.2.2.
- **P112-OWN024-DEPLOYNOSHARP** (the Alpine self-host image ships `cli.js` alone): TWO-011's.

## 4. Traps paid for in s1

- **The template generators fail on a stale `@nodegx/node-spec` `dist/`** (`projectHonesty is not a function`): rebuild
  with `npm --prefix packages/nodegx-node-spec run build`, then generate.
- **sharp's packages differ per platform:** Windows has no libvips package. `targetPackages` reads sharp's manifest;
  don't hard-code the pair again.
- **No local signature stands in for the Developer ID one:** an ad-hoc hardened signature fails on Electron Framework
  itself ("different Team IDs").
- **The copy checks:** `/usr/bin/python3 <scratchpad>/lint.py written FILE` (spaCy sm→lg wrapper; see memory
  *copy-passes-the-content-authoring-skill*). `written` fires on a planted bad sentence; `closer` did not.
