# OWN-021 S8 + AC4 — the two templates on the released 0.4.2, then the zip Richard sends

**Written 2026-10-20 by Opus 5.5 (session opennoodl-8a), at HEAD `04ab06d03` on `cline-dev`.** Richard, the same day:
*"Can we set the next session to testing those two templates so I can send them to the dude."* This is the board's
first item now (§2a). Read [OWN-021](../OWN-021-THE-0.4.2-CUT.md) §1 (the person sentence), §3 S8, §4 AC3–AC4, §5, §6,
§11; P121's [NEXT-SESSION-PROMPT](../../phase-121-a-marketplace-and-a-community/NEXT-SESSION-PROMPT.md) §2 and §2b (how
each app is made) and its §1 table; the two setup pages the builder will follow.

🔴 **R1: none of the builder's words, names or addresses go into this repo**, nor into anything you write here. The
email Richard sends and anything naming the builder go in `~/vscode_projects/nodegx-private/builder-briefs/`.

## 1. Where it stands (measured 2026-10-20)

- **0.4.2 is published** (Latest, 08:18:31 UTC, tag `v0.4.2` = `250a36804`), carrying every P121 product fix (OWN-021
  §2, AC1 ✅). nodegx.io offers it.
- **Both templates are in the release tree and unchanged since**: `git diff --stat v0.4.2 HEAD -- templates/marketplace
  templates/gram` is empty, 370 tracked files, nothing uncommitted in either folder.
- **Never opened on a released build.** Every drive so far ran from source (jest drives, the dev editor in s19). So
  "usable" is unproven until S8.
- **No zip exists, and nothing in the repo makes one.** Making it is step 2 below.
- **The installed `/Applications/NodeGX.app` is 0.3.0 and is Richard's.** Do not update, replace or launch it. Five
  MCP servers from it are serving his `Puppy test 3` project; leave them.
- What 0.4.2 deliberately does not have (OWN-021 §5, so the zip must not promise it): the tutorials (TWO-007), a hosting
  route (TWO-011), the devotional / Bible / offline (TWO-006, TWO-010, TWO-005 slice 6), Paystack with real keys
  (TWO-004 step 4: driven only against a stand-in), Flutterwave.
- **The marketplace has no setup page.** `templates/marketplace/docs/` holds `PAYING-BY-CARD.md` and the world only;
  the gram has `SETTING-UP.md`. OWN-021 §6 owes the marketplace's (setup token, first admin, its name, countries,
  shelves).
- **The gram needs a mail service to sign anyone in** (SETTING-UP.md §2: members sign in by an emailed link). What the
  backend's admin Email page accepts, and how a drive catches the mail on a *released* build (the jest drives used
  `getMailerForTesting`, which a packaged app does not offer), is unmeasured.

## 2. What to do, in order (an agent can do all of it)

0. **The box.** `ListAgents`, `ps` for a running suite or Electron drive, `uptime`. One heavy job at a time (memory:
   do-not-pile-cpu-work). This session measured load average 22–39 on 8 cores from peers. A drive started into that
   gets timings that mean nothing.
1. **Get the released app without touching his.** Download the arm64 DMG for 0.4.2 (the release's asset, or the
   nodegx.io download link; `gh` may be refused by the classifier, so curl the asset URL). Check
   `CFBundleShortVersionString` = 0.4.2. Copy the `.app` into the scratchpad, never `/Applications`.
2. **Make the zips from the tag**, so what Richard sends is what was released: `git archive v0.4.2 templates/marketplace`
   and the same for `templates/gram`, one zip per app, each unpacking to one folder named for the app. grep both
   for anything R1 forbids before anything else. Unzip each into a fresh scratch folder (opening writes `.mcp.json`,
   `CLAUDE.md` and `.gitignore` into a project; that is expected, not a finding).
3. **Launch in an isolated profile.** Chromium's `--user-data-dir=<scratch>/profile` on the packaged binary (s4
   launched the arm64 DMG this way; the dev launcher's `NOODL_USER_DATA_DIR` is the same switch). Seed
   `firstRunLegal.json`; land on a project with `recently_opened_project.json` (memory:
   drive-a-first-run-with-nodegx-user-data-dir). CDP on a port that is not 9222 (`NOODL_REMOTE_DEBUG_PORT`).
   `-ApplePersistenceIgnoreState YES` (a third launch hangs in AppKit's prompt otherwise). Any Chrome started under a
   fake HOME needs `--use-mock-keychain`, or a Keychain dialog lands on Richard's screen. **Never click Connect**
   (it writes his real `~/.claude.json`). Tear down by your own pid, and tell anyone you told about the launch.
4. **AC4, both apps:** the marketplace opens on the shop's home page, the gram on its welcome page, with no "No HOME
   component selected" (P121-S19-NOHOME).
5. **The backend, both apps:** Backend Services → `[data-test=add-backend-button]` → Built-in → "Run one on this
   computer" → Start (two copies of the button exist in the Modal: use the one `elementFromPoint` hits). R12's line in
   the log (the project's `backend/schema.json` added at start). 🔴 Backends live in the REAL `~/.noodl/backends`:
   delete each one you made afterwards (`ipcRenderer.invoke('backend:delete', id)`), and list it before and after.
6. **The marketplace's main path, following only what a builder would have:** set it up (setup token, first admin,
   its name, a country, a shelf), a seller, a product with a photo (check it was shrunk), a buyer's checkout paid on
   delivery, the seller moving the order on. Where you needed something no page told you, that is the missing setup
   page's content: write that page (OWN-021 §6) in `templates/marketplace/docs/`, by hand (it survives regeneration),
   through the content-authoring skill's checks.
7. **The gram's main path, following `templates/gram/docs/SETTING-UP.md` word for word:** email set up, a first admin,
   someone asks to join, is let in, signs in by the link, a post with a members-only photo, a second member sees it
   and hearts it, the count moves with no reload. Measure the mail question in §1 first. If a released build cannot
   send mail without a real provider, say what the builder needs (a provider and what he types in), and drive with
   the simplest real route the Email page offers.
8. **Look at every shot** (memory: the shots found things the drives passed in nine P121 sessions running). Phone and
   tablet sizes, as the P121 drives did.
9. **OWN-021 §6's other owed items:** read the editor badge's 26 warnings on the marketplace (news or noise? a real one
   is a bug); measure P121-S19-SIGNINRACE.
10. **Every defect goes in `dev-docs/bugs/`, one file each**, run its spec first. Fix what blocks the main path.
    🔴 A template-side fix goes through the generator (`npm run template:marketplace` / `template:gram`, never a hand
    edit of `components/`; stop any dev stack first, a regen OOMs its webpack); it changes the tree after `v0.4.2`, so
    the zip is then made from the fixing commit and re-driven on 0.4.2. A product-side fix cannot reach the builder
    until 0.4.3: say so plainly, don't hide it inside the zip.
11. **Write it down:** the readings into OWN-021 as §12 (S8 ✅ / AC3 / AC4 with what was driven and what was not); the
    board's 0.4.2 row and the priority line in §2a; this file for the session after. Then hand Richard, in the
    conversation and in plain words: where the two zips are, what the builder must do himself (a mail provider; a
    Paystack business and keys per country if he wants cards; where to host, which 0.4.2 does not cover), and anything
    that would make you hold the send.

## 3. Waits on Richard, not on an agent

- **Sending the zips** and what the email says (private folder, R1).
- Paystack test keys (TWO-004 step 4), if he wants card payment shown working before the send.
- If S8 finds a defect only a product release fixes: send now with it named, or wait for 0.4.3. His call, asked in
  plain words with the reading beside it.

## 4. This session, for the record

- Took the board's 0.4.3 row and fixed two of its bugs, both riding the npm 0.2.4 cut (0.2.3 is still not on the
  registry; Richard's 2FA run of `scripts/own/publish-npm.sh` is owed first):
  P112-OWN020-CALLTOOLSTRIP (`ea0d1d7b0`: `call_tool` refuses an unknown argument by name) and P112-OWN023-COLDSERVER
  (`b09ed2b7f`: `@nodegx/mcp` declared the SDK and zod it bundles, so a first `npx` installed 91 unused packages;
  cold install 12.6 / 11.6 s → 3.8 / 5.5 s on 0.2.2's tarball, boot ~1 s). Committed through pathspecs and a
  temporary index around a peer's staged `dev-docs/parked/README.md` and an unrelated uncommitted `package-lock.json`
  regeneration, both left as found.
- The whole `noodl-mcp` suite on the working tree at the time: 4,620 passed, 15 failed in 9 suites (backendTools,
  cmp004Parts, cmp004RoundTrip, def018-def020-layout-drive, def038SettledTemplates (nightbook), fld013ExportReach,
  sbr009ThemeEditorDrive, see001Honesty, tpl011Template). None calls `call_tool`; not chased, not attributed further.
- Where the plan of record was wrong: the board said "continue the board" meant the 0.4.3 row, while what Richard was
  waiting for was the 0.4.2 row's leftover S8, which no session had picked up because P121 is listed as parked. The
  board now puts S8 first.
