# OWN-021 — The 0.4.2 cut: a release that runs P121's two templates

**Scoped 2026-10-16** (P121 s19), on Richard's word: "add the stuff we need to lane 1 to get 0.4.2 released for this
dude to get his templates". Lane 1, after OWN-013 (the 0.4.0 / 0.4.1 cuts). The runbook is OWN-013's (§3–§4,
UPG-008's shape); this file says what 0.4.2 must carry and how we know it does.

**Status: 🟡 s1 (2026-10-19): S1–S4 ✅, AC1 ✅; S5 waits on Richard's go to push (§8).** P121's product changes are six commits, one per bug
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
| S5 | **G4–G6:** the PR `release/0.4.2` → `main`, the six required checks green; `npm run ci:build:editor` on the cut tree; the editor test floor by name | CI + agent | ⬜ |
| S6 | **The Mac staple.** OWN-013 §12: electron-builder notarises by itself and its staple has no retry; the one-line fix `"notarize": false` under `build.mac` was refused in auto mode ("Security Weaken"). Richard allows it, or the release session re-runs the failed leg as 0.4.0's did | Richard | ⬜ |
| S7 | **Tag, Release run, Publish** (OWN-013 §4) | Richard publishes | ⬜ |
| S8 | **Drive both templates on the released 0.4.2** (not dev, not source): install, open each zip's copy, Backend Services → Built-in → Run one on this computer → Start; R12's line in the log; the marketplace: set up, a seller, a product with a photo (shrunk), checkout on delivery; the community app: join, let in (email set up), a post with a members-only photo seen by a second member, live count. Shots looked at | agent | ⬜ |

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
Made locally with `commit-tree` (no checkout); **not pushed**.

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
