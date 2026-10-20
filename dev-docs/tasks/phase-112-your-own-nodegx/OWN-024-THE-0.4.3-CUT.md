# OWN-024 — The 0.4.3 cut: the marketplace's photos work on a released build, and both zips are made from it

**Scoped 2026-10-20** (session opennoodl-8a, s1), from [own-021/NEXT-SESSION-PROMPT](own-021/NEXT-SESSION-PROMPT.md)
and Richard's word the same day: "Let's wait for both zips, and write the next session prompt to push us to [0.4.3]".
Lane 1, after [OWN-021](OWN-021-THE-0.4.2-CUT.md) (0.4.2). The runbook is [OWN-013](OWN-013-THE-0.4.0-CUT.md) §3–§4, as
OWN-021 §7–§11 last ran it. **This file owns the editor half of the board's 0.4.3 row. The npm half (0.2.4 with the
Cline kit) is OWN-020's** ([OWN-020](OWN-020-THREE-HARNESSES.md) AC2).

**Status: ✅ s1 (2026-10-20): 0.4.3 PUBLISHED 21:16:16 UTC, every AC met (§7); the zips are made. Before: S1–S6 ✅, S8 ✅ driven on the 0.4.3 Intel artefact, zips made (§6); S7: merged, tagged,
three of four legs built; arm64 waits on a GitHub runner, then Publish. Before: S6 under way — `release/0.4.3` pushed (`4efbce226`, cut `65f936bcb`) on
Richard's go and PR #53 open to `main`, its required checks green at `e55a37f86` (Test (editor) 3021 / 0, seed
74287). Merge, tag and Publish wait on his go.**

## 1. The person sentence

A builder downloads NodeGX 0.4.3, opens the marketplace zip, adds a product with a photo and sees it on the product
form, the shop's card, the product page and the basket. With both apps on one computer, each app's functions stay in
its own backend.

## 2. The board's 0.4.3 row, measured (2026-10-20, ~16:00 CEST)

| item | lane | state, measured |
|---|---|---|
| P112-OWN021-NOSHARP (blocker) | this | ✅ code `6b2515d4a`; spec red→green; artefact gate in afterPack/afterSign. **Owed:** the four CI legs on the new hooks, the S8 photo path on 0.4.3 (§4) |
| P112-OWN021-PUSHTOALL (high) | this | ✅ `45d1a453f`; 6 cases, the 0.4.2 loop as a mutant reddens all 6. **Owed:** driven on 0.4.3 |
| GRAMWORDMARK, WELCOMEDEVOTIONAL, SAMEEMAIL, ADDKEEPS | this | ✅ `6cba197ad`, through the generators, each spec red on the committed template |
| both zips, made from `v0.4.3`, the marketplace re-driven | this | ⬜ after Publish (S8) |
| the tests-only `any` raise paid back | this | ✅ `npm run tsfixme` "Holding the line" on `cline-dev`'s own baseline (was red by +2 in `own020CallToolStrip.test.ts`, fixed `13890a372`) |
| npm 0.2.4 with the Cline kit | OWN-020 | ⬜ not ours. Registry at 15:55 CEST: `@nodegx/preview` **0.2.3** (13:26 UTC), `@nodegx/node-spec` and `@nodegx/project-contract` 0.2.0; `@nodegx/mcp`, `create-nodegx`, `create-nodegx-vibe` still **0.2.2** |
| P112-OWN023-COLDSERVER, P112-OWN020-CALLTOOLSTRIP | npm | ✅ fixed (`b09ed2b7f`, `ea0d1d7b0`); they reach a stranger with npm, not with the editor |
| lane 1: OWN-014 AC4 (the stranger's app from the registry); lane 2: the stranger round on the drawer | npm | ⬜ need the npm cut first |

## 3. Steps

| # | step | owner | state |
|---|---|---|---|
| S1 | **NOSHARP**: stage `sharp` + the build machine's prebuild beside `cli.js`; gate the artefact | agent | ✅ `6b2515d4a` |
| S2 | **PUSHTOALL**: push on save to the project's own backend only | agent | ✅ `45d1a453f` |
| S3 | **The four template fixes**, through the generators, with their specs; both SETTING-UP pages; the ontology census | agent | ✅ `6cba197ad` |
| S4 | **The Lint job's gates green on the cut** (`tsfixme`, `colors`, `vocabulary`, `type`, `icons:css`, `lint:ci`) | agent | ✅ `13890a372` |
| S5 | **The cut point, CHANGELOG `## 0.4.3`, the editor at 0.4.3, the release body, the what's-new post.** `git merge-tree` against `origin/main`; the commits surveyed; content-authoring skill; R1 | agent | 🟡 §5 |
| S6 | **The PR `release/0.4.3` → `main`**: the six required checks, Test (editor) by name and seed; a nightly dispatch on the branch shows the new afterPack on three platforms unsigned | Richard's go, CI | ⬜ |
| S7 | **Merge, tag `v0.4.3`, Release run, Publish.** The afterSign smoke on the two signed Mac legs is the only place the hardened runtime is measured | Richard's go | ⬜ |
| S8 | **The zips and the re-drive** on the published 0.4.3 (own-021/NEXT-SESSION-PROMPT §2.6): both from the tag, R1-grepped, the marketplace's photo path at 390 × 844 and 820 × 1180, the community app to its first post, two apps' backends running at once; every shot looked at; the zips to `nodegx-private/builder-briefs/` | agent, then Richard sends | ⬜ |

## 4. Acceptance criteria

1. Every row of §2 marked "this" is committed, and its bug says `fixed` with its commit.
2. 0.4.3 is published; on the published arm64 build, `Resources/nodegx-backend/node_modules/@img/sharp-darwin-arm64`
   is there and a running backend answers `?thumb=md` with 200.
3. S8 is driven on the published build: every marketplace image `naturalWidth > 0` with its `?thumb=` answering 200,
   at both sizes; a save in each app pushes nothing to the other's backend.
4. Both zips are made from `v0.4.3`, R1-clean, and sit in `nodegx-private/builder-briefs/`.

## 5. s1 (2026-10-20, Opus 5.5, session opennoodl-8a)

**NOSHARP, measured before building.** `transform.ts` builds the module name at runtime, so esbuild leaves
`require('sharp')` to plain Node resolution: a `node_modules` beside `cli.js` is all the packaged backend needs. The
lockfile lists all 19 `@img/*` prebuilds, so `npm ci` on each CI runner installs that runner's. `extraResources` copied
`cli.js` alone. The fix stages `sharp`, its dependencies at their nested paths and only the target's two `@img`
packages into `dist/sharp-runtime` (16 MB, 11 packages on darwin-arm64), shipped as `nodegx-backend/node_modules`.
electron-builder 26.15.3 calls `afterSign` only when it signed (`platformPackager.js:338`), so the live smoke runs in
`afterPack` on every leg (under the build's Node on macOS, where the app isn't signed yet) and again in `afterSign`
under the signed Mac binary. A dummy app packed with the same two entries: the tree lands, the smoke passes in it and
under its unsigned Electron binary. An ad-hoc hardened signature fails on Electron Framework itself ("different Team
IDs"), so nothing local stands in for the Developer ID one. The bug file has the rest.

**Found on the way:** the self-host image ships `cli.js` alone too (P112-OWN024-DEPLOYNOSHARP, medium, filed, TWO-011's).
And both template generators refused every component (`projectHonesty is not a function`): `@nodegx/node-spec`'s
gitignored `dist/` was from 2026-10-18 11:05, before `5f5ab2624` added it. Rebuilt with `npm --prefix
packages/nodegx-node-spec run build`; then both generated.

**PUSHTOALL.** The rule is `matchEndpointToManaged(getCloudServices(project), backend:list)`, the one the panel's
attached card and `ProjectBackendLifecycle` already use: the backend the app's Cloud Function nodes actually call.

**The template fixes.** Each spec is red on the committed template, measured: `two005Name.test.ts` 3 red;
`two003AddKeeps.test.ts` (HEAD has 0 `clear` wires); SAMEEMAIL's two backend cases via `TWO003_TEMPLATE` /
`TWO005_TEMPLATE` pointed at HEAD's tree. After: noodl-mcp `tests/two00*` 409 / 409, the backend's ten non-drive
TWO-003/005 suites 132 passed (the ten mutant suites skip by design), `two-005-join-drive` 1 / 1 with the bar's first
line reading "Grace Chapel" after set-up. The Admins page's "write devotionals" was the same false promise, dropped too.

**S5, the cut point (so far).** `origin/main` = `250a36804` (0.4.2's merge). `cline-dev` is 141 commits past it and
`main` is not its ancestor (0.4.2's merge commit lives only on `main`). `git merge-tree --write-tree origin/main HEAD`
→ exit 1, **one conflict: `.tsfixme-baseline.json`**, `main`'s raised 0.4.2 baseline against `cline-dev`'s lower one,
which holds now. It resolves to the cut's side, as 0.4.2's three did.

**Found by reading my own S1 for other platforms, fixed before the cut (`2b6317913`):** sharp 0.33.5 has no separate
libvips package for `win32-x64` (`libvips-42.dll` ships inside `@img/sharp-win32-x64`, read from the registry), and
`6b2515d4a` required one on every target, so the Windows leg would have failed in staging and in afterPack. The
target's packages now come from sharp's own `optionalDependencies`; a spec pins all four release targets.

**What the cut carries** (a subagent's survey of the 141 commits, read-only): 28 touch shipped source (20 of them
`nodegx-export`, P18's s122–s131); 112 touch docs, tests, templates, parked work or npm packaging only. No feature flag,
no new third-party dependency in a bundled package, no spec version bump, nothing rewrites a project on open. The one
new native module is NOSHARP's `sharp`. `render-report.js` (shipped in `render-harness`) gained two swiftshader flags
from the parked three-in-nodes work (`303c55224`). **One ruling for Richard:** the honesty number in the editor
(P111 SEE-001, `d75977deb`: the components panel's "66% known", a row's number, the script mark on the canvas) ships
unflagged, and SEE-001 says "built and driven; Richard's read owed". The CHANGELOG leaves it out until he rules.

**S5, written.** CHANGELOG `## 0.4.3 · 2026-10-20` (re-date on the tag day), the editor at 0.4.3, the release body
`GITHUB-RELEASE-0.4.3.md` and the post `whats-new-0.4.3.READY-TO-PUSH.json` (plain `<p>` leads, as 0.4.2's was pushed,
for NEWSWHITE). Written to the content-authoring skill; the offline checks `written`, `contract`, `opener` clean
after three rounds (`figures` flags only version numbers; `closer` did not fire on a planted closing line, so it
grades nothing here). R1: no builder's or app's name in any of them.

**Richard's rulings (2026-10-20, ~16:30).** (1) Before pushing, check in with the other sessions: all four OpenNoodl
sessions answered "nothing" (opennoodl-92, OWN-020: npm 0.2.4 from `cline-dev` only after Richard's 0.2.3 finishes and
after `release/0.4.3` exists; no version bump or lockfile on `cline-dev` before then). (2) No nightly dispatch: straight
to the release. (3) **The honesty number stays out of releases** — "it's a bit creepy and 99% of people won't know wtf
it's talking about. Keep it here locally for us to test and leave it out of releases until we've done as much work as
we can on our side to make sure it's going to be as close to 100% on each component". So it is gated, not just left
out of the notes: `honestyShown()` (`process.env.devMode === 'yes'`, set by `main.js` from `--dev`) before the panel's
walk and the canvas's script mark; a packaged app walks nothing and draws none of it. Spec
`tests-unit/see-001/honestyShown.test.ts`. The sibling `honestyView.test.ts` is 3 red at HEAD without it (fixture
drift, P111-SEE001-HONESTYFIXTUREDRIFT, filed); its fourth case anchored on the painter's old line and is re-anchored.

**S6 (s1, ~17:00 CEST).** On Richard's go after the check-in, `release/0.4.3` pushed (`4efbce226`, cut `65f936bcb`,
its tree the cut's) and **PR #53** opened to `main`. opennoodl-92 (OWN-020) told the branch exists, and told to run
`npm run tsfixme` before committing its 0.2.4 cut (the baseline on `cline-dev` is lower than `main`'s).

**S6, CI.** First run on `4efbce226`: Test (editor) 3021 specs, **2 failures** (seed 24383), both spec-side: the
schema spec still refused a nameless variant (OWN-020's `3cb9eb745` made it the element style), and my packaged-app
script-mark case compared with a Group card's edge (titlebars are the category's colour). Fixed in `61e6714d7`, the two
test files alone. The package job had **three new reds, mine**: SEE-000/001's committed `census.json` and
`honesty-ledger.json` held the gram and marketplace counts from before `6cba197ad`. Regenerated on a clean copy of the
release tree (`e55a37f86`; on `cline-dev` `238f28246`), only those two rows moved, both `--check` gates exit 0.
🔴 **A template change owes `node scripts/see/census.js` and `scripts/see/honesty-ledger.js --write`**, on a tree with
no peer's uncommitted template in it. `cline-dev` had meanwhile taken OWN-020's npm 0.2.4 cut (`dce0e876a`); it was
kept out of `release/0.4.3`, which took only these fixes.

**Second run, on `e55a37f86`: every required check green, `mergeStateStatus` UNSTABLE / MERGEABLE.** Test (editor)
**3021 specs, 0 failures, seed 74287** (read in the job log). Red and not required, as on #51/#52: Docs site builds,
Lesson bundles, Renderer errors, and the package job's five filed rows (kit-types drift, GAM-014, OWN019-BACKENDSESSION,
verbs, listPortCoverage). **Next: S7, merge, tag `v0.4.3`, the Release run, Publish: Richard's go for each.**

## 6. s1, continued: S7 and S8 on Richard's go ("Go please and make the zips for me")

**S7.** PR #53 merged as a merge commit (`e0bd5309e`, tree equal to the tested `e55a37f86`); `v0.4.3` tagged on it
(annotated) and pushed. Release run `39466894582`:

| leg | staged | afterPack smoke | afterSign smoke |
|---|---|---|---|
| darwin-x64 (signed, notarised) | 11 packages | 200, 256 px, under the build's Node | **200, 256 px under the signed app binary** |
| win32-x64 | **10** (no libvips package: `2b6317913` was needed) | 200 under `NodeGX.exe` | 200 |
| linux-x64 | 11 | 200 under the app binary | (not signed) |
| darwin-arm64 | — | — | — |

**darwin-arm64 never ran:** "The job was not acquired by Runner of type hosted even after multiple attempts" (GitHub's
macOS arm64 capacity; githubstatus: Actions operational), three times at 15m01s each, then re-queued by a background
loop. So the draft has 12 assets and no arm64 DMG; *merge mac update feed* and *verify draft release is complete* are
red because of it. **Not published** while arm64 is missing. Separately, *every authored library entry is installable*
is red on the parked **Three Kit** module (authored under `library/`, not on the origin): publishing it is Richard's call.

**The published-to-be Intel artefact**, from the draft: `NodeGX-0.4.3-mac-x64.dmg`, the `.app` copied into the
scratchpad: 0.4.3, `codesign --verify --deep --strict` ok, stapler validates, Gatekeeper "accepted, Notarized
Developer ID", `Resources/nodegx-backend/node_modules/@img/sharp-darwin-x64` + libvips present; `thumb-smoke.js` with
the app's own binary → 200, 256 px (the first launch under Rosetta took over 60 s and timed out; the second passed).

**S8 re-driven on that build** (Apple Silicon, under Rosetta; isolated profile, `--use-mock-keychain`, CDP 9333,
preview 8674; zips unzipped from `v0.4.3`; Connect never pressed; Richard's app untouched; the admin token read only for
the two backends this drive made; mail not needed):

- **Marketplace.** Opens on the shop's Home; Backend Services → + → Built-in → Run one on this computer → Start:
  20 functions pushed, "This project uses this backend". 🔴 First start: `20 added … refused: ProductHistory (fetch
  failed)`; a restart added it (**P112-OWN024-SCHEMAFIRSTSTART**, filed, low). **SAMEEMAIL ✅** (set-up with the admin-app
  account's email: "This backend already has an account with that email. The admin app's account may be using it. Use a
  different email."; a fresh email set up). **ADDKEEPS ✅** (Ghana · GHS listed, both fields empty; the shelf's field
  empty). **NOSHARP ✅, every image measured** (`naturalWidth`, and the `?thumb=` fetched): the logo on the seller form
  `md` 256; the sellers list `sm` 64; the product form's tile `md` 256 (stored original 1600 × 1200, 116,701 bytes); the
  seller's products `sm` 64; and for a buyer at **390 × 844 and 820 × 1180**: Home's seller chip `sm` 64 and card `md`
  256, the product page `lg` 1024 and the logo `sm` 64, the basket `sm` 64 × 2, every one 200.
- **PUSHTOALL ✅.** With the marketplace's backend running, the community app opened and saved (its
  `nodegx.project.json` written 20:45:52): no toast, nothing in the log, the marketplace backend's `workflows/` still its
  one bundle (20:37). Then the community's own backend: 13 collections at once, 15 functions; each backend holds only
  its own bundle with both running.
- **Community app.** **WELCOMEDEVOTIONAL ✅** ("Members pray for each other and share what God is doing."; the Admins
  page "…hide posts and comments and block members."). **GRAMWORDMARK ✅**: after set-up the bar reads **Grace Chapel**,
  on the phone (Waiting for you) and the tablet (the feed).
- **Shots looked at** (scratchpad `s8/shots/`, 20): the launcher, the editor on open, the panel, the add dialog, Ways to
  pay after the add, the seller form with its logo, the shop on a phone and a tablet, the product page, the basket, the
  Welcome before set-up, the admin's queue and the feed with the bar's name.
- **Torn down** by pid (the app, four Chromes); both backends deleted through `backend:delete`. `~/.noodl/backends`: 30
  before, 31 after, the one more being another session's "Todo list backend" made at 20:49, not this drive's.
- **Not re-driven** (unchanged since OWN-021 §12): the marketplace's checkout to delivered, the community's join, let in,
  members-only photo and live heart.

**The zips:** `git archive` from `v0.4.3` (314 and 201 entries); R1 (the private brief's capitalised words, names,
addresses, the app's name and site) — the hits are Paystack's four countries and currencies and a time-zone example, as
in 0.4.2; no local path, no `.mcp.json`/`CLAUDE.md`/`.DS_Store`. In `nodegx-private/builder-briefs/` as
`marketplace-nodegx-0.4.3.zip` (sha256 `ad273f56…`) and `community-app-nodegx-0.4.3.zip` (`a4b9c0fb…`).

**Left:** the arm64 leg (a runner), then the draft checked (16 assets, `latest-mac.yml` both arches, body from
`GITHUB-RELEASE-0.4.3.md`), **Publish** (Richard's go given), the feed post, the CHANGELOG date, nodegx.io.

## 7. s1, end: 0.4.3 published (2026-10-20 21:16:16 UTC)

- **arm64:** the overnight loop's first attempt (20:42 UTC) got a runner: built in 19m10s; `[build] sharp for
  darwin-arm64: 11 packages`; afterPack 200, notarised, **afterSign 200 under the signed binary**, ticket stapled.
  *merge mac update feed* ✅, *verify draft release is complete* ✅ (16 assets; `latest-mac.yml` 0.4.3 with arm64 and
  x64). Only *every authored library entry is installable* stays red (the parked Three Kit: Richard's call).
- **The arm64 DMG, measured here natively:** 0.4.3, `codesign --verify --deep --strict` ok, stapler validates,
  Gatekeeper "accepted, Notarized Developer ID", `@img/sharp-darwin-arm64` + libvips packed,
  `check-packaged-backend.js` with the app's binary → `?thumb=md` 200, 256 px. **AC2 ✅.**
- **Published** as Latest on Richard's go ("Go please"), the body from `GITHUB-RELEASE-0.4.3.md`. All six downloads
  answer 206 on a range request. **AC1 ✅ AC3 ✅ AC4 ✅** (S8 on the Intel artefact, §6; the zips, §6).
- **The feed post** pushed (nodegx-content `a52caae42`, `date_modified` 2026-10-20T21:16:16Z, plain `<p>` leads); the
  served feed's one item is `nodegx-0.4.3`.
- **nodegx.io** deployed (nodegx-web `e455136`, local commit): eyebrow, button, release block (a new note through the
  offline copy checks), the six downloads, changelog `#v0-4-3`. Built with `NODEGX_CHANGELOG` = CHANGELOG without the
  npm 0.2.3 section, as deployed this morning. Neighbours 200 before and after. **npm 0.2.4 is on the registry**
  (mcp, preview, create-nodegx, -vibe, -cline 0.2.4; project-contract 0.2.1): its CHANGELOG section and the site's npm
  section are OWN-020's.
